import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import Redis from 'ioredis';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AbstractCacheService } from 'src/common/cache/abstract-cache.service';
import { REDIS_CLIENT } from 'src/common/redis/redis.token';
import {
  ArticleFilterDto,
  ArticlePaginatedResponseDto,
  ArticleResponseDto,
} from 'src/modules/articles/article.scheme';

@Injectable()
export class ArticleCacheService extends AbstractCacheService {
  protected namespace: string;

  constructor(
    @InjectPinoLogger(ArticleCacheService.name)
    protected readonly logger: PinoLogger,
    @Inject(REDIS_CLIENT) protected readonly redis: Redis,
  ) {
    super();
    this.namespace = 'articles';
  }

  public async getArticle(
    id: string,
    fetcher: () => Promise<ArticleResponseDto | null>,
  ): Promise<ArticleResponseDto | null> {
    return this.getOrSet(id, fetcher, { ttl: 300, staleTtl: 360 });
  }

  public async getList(
    params: ArticleFilterDto,
    fetcher: () => Promise<ArticlePaginatedResponseDto>,
  ): Promise<ArticlePaginatedResponseDto | null> {
    const key = `list:${this.hashParams(params)}`;

    const result = await this.getOrSet(key, fetcher, {
      ttl: 60,
      staleTtl: 360,
    });

    await this.registerInIndex(key, `all-list`, 120);
    if (params.authorId) {
      await this.registerInIndex(key, `author-${params.authorId}`, 120);
    }

    return result;
  }

  public async invalidateArticle(articleId: string, authorId: string): Promise<void> {
    await Promise.all([
      this.invalidate(articleId),
      this.invalidateByIndex(`all-list`),
      this.invalidateByIndex(`author-${authorId}`),
    ]);
  }

  private hashParams(params: ArticleFilterDto): string {
    return createHash('md5')
      .update(JSON.stringify(params))
      .digest('hex')
      .slice(0, 8);
  }
}
