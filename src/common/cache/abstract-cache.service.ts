import { Redis } from 'ioredis';
import { CacheOptions } from './cache.types';
import { PinoLogger } from 'nestjs-pino';

/**
 * @description Абстрактный класс для работы с кэшем, реализует два путя: возвращает протухший кеш и и идет ветчить в БД на будующее или жесткий мутекс и бегом в БД
 */
export abstract class AbstractCacheService {
  protected abstract readonly logger: PinoLogger;
  protected abstract readonly redis: Redis;

  // Namespace — каждый наследник задаёт свой префикс ключей
  // articles, users, etc.
  protected abstract readonly namespace: string;

  public async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T | null>,
    options: CacheOptions,
  ): Promise<T | null> {
    const fullKey = this.buildKey(key);
    const staleKey = this.buildKey(`stale:${key}`);
    const lockKey = this.buildKey(`lock:${key}`);
    const lockTtl = options.lockTtl ?? 10;

    const fresh = await this.redisGet<T>(fullKey);
    if (fresh !== null) {
      this.logger.info(`✅ Cache HIT: ${fullKey}`);
      return fresh;
    }

    this.logger.warn(`❌ Cache MISS: ${fullKey} - fetching from DB`);


    const lockAcquired = await this.acquireLock(lockKey, lockTtl);

    if (lockAcquired) {
      return this.fetchAndCache({
        fullKey,
        staleKey,
        lockKey,
        fetcher,
        options,
      });
    }

    //  Мутекс занят — отдаём stale если есть, котото уже обновляет что то
    if (options.staleTtl) {
      const stale = await this.redisGet<T>(staleKey);
      if (stale !== null) {
        this.logger.info(`🔄 Returning STALE cache for: ${fullKey}`);
        return stale;
      }
    }

    // Нет ни свежего ни stale — ждём пока другой поток прогреет
    return this.waitForCache(fullKey, fetcher, options);
  }

  /**
   * @param key - ключ для инвалидации
   * @description - Инвалидация одного ключа
   */
  async invalidate(key: string): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.del(this.buildKey(key));
    pipeline.del(this.buildKey(`stale:${key}`));
    await pipeline.exec();
  }

  /**
   * @param keys - массив ключей для инвалидации
   * @description - Инвалидация нескольких ключей
   */
  async invalidateMany(keys: string[]): Promise<void> {
    if (!keys.length) return;

    const pipeline = this.redis.pipeline();
    for (const key of keys) {
      pipeline.del(this.buildKey(key));
      pipeline.del(this.buildKey(`stale:${key}`));
    }
    await pipeline.exec();
  }

  /**
   * @param indexKey - индекс для инвалидации
   * @description - Инвалидация по индексу
   */
  async invalidateByIndex(indexKey: string): Promise<void> {
    const fullIndexKey = this.buildKey(`index:${indexKey}`);
    const keys = await this.redis.smembers(fullIndexKey);

    if (keys.length) {
      const pipeline = this.redis.pipeline();
      keys.forEach((k) => pipeline.del(k));
      pipeline.del(fullIndexKey);
      await pipeline.exec();
    }
  }

  /**
   * @param key - ключ
   * @param indexKey -
   * @param ttl -
   * @description - регистрируем ключ в индексе для последующей групповой инвалидацииоол
   */
  async registerInIndex(
    key: string,
    indexKey: string,
    ttl: number,
  ): Promise<void> {
    const fullIndexKey = this.buildKey(`index:${indexKey}`);
    await this.redis
      .pipeline()
      .sadd(fullIndexKey, this.buildKey(key))
      .expire(fullIndexKey, ttl + 10)
      .exec();
  }

  private async fetchAndCache<T>({
    fullKey,
    staleKey,
    lockKey,
    fetcher,
    options,
  }: {
    fullKey: string;
    staleKey: string;
    lockKey: string;
    fetcher: () => Promise<T>;
    options: CacheOptions;
  }): Promise<T> {
    try {
      const data = await fetcher();
      const serialized = JSON.stringify(data);

      const pipeline = this.redis.pipeline();
      pipeline.set(fullKey, serialized, 'EX', options.ttl);

      if (options.staleTtl) {
        pipeline.set(staleKey, serialized, 'EX', options.staleTtl);
      }

      await pipeline.exec();
      return data;
    } catch (e) {
      this.logger.error({ err: e, key: fullKey }, 'Fetcher failed');
      throw e;
    } finally {
      await this.redis.del(lockKey);
    }
  }

  private async waitForCache<T>(
    fullKey: string,
    fetcher: () => Promise<T | null>,
    options: CacheOptions,
    attempt = 0,
  ): Promise<T | null> {
    const maxAttempts = 10;

    if (attempt >= maxAttempts) {
      // Защита от бесконечного ожидания — идём в БД напрямую
      this.logger.warn(
        { key: fullKey },
        'Cache lock timeout, falling back to DB',
      );
      return fetcher();
    }

    await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));

    const cached = await this.redisGet<T>(fullKey);
    if (cached !== null) return cached;

    return this.waitForCache(fullKey, fetcher, options, attempt + 1);
  }

  /**
   * @param lockKey -
   * @param ttl -
   * @returns  - true если мы залокали редис лок конечно тоже абстрактый)
   */
  private async acquireLock(lockKey: string, ttl: number): Promise<boolean> {
    const result = await this.redis.set(lockKey, '1', 'EX', ttl, 'NX');
    return result === 'OK';
  }

  private async redisGet<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (e) {
      // не падаем при битом JSON
      this.logger.warn({ key }, 'Failed to parse cached value');
      await this.redis.del(key);
      return null;
    }
  }

  private buildKey(key: string): string {
    return `${this.namespace}:${key}`;
  }
}
