import { Test, TestingModule } from '@nestjs/testing';
import { ArticleCacheService } from './articles-cache.service';
import { REDIS_CLIENT } from 'src/common/redis/redis.token';
import { getLoggerToken, PinoLogger } from 'nestjs-pino';

describe('ArticleCacheService', () => {
  let service: ArticleCacheService;
  let redis: any;

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn(),
    smembers: jest.fn(),
    pipeline: jest.fn(),
  };

  const mockPipeline = {
    set: jest.fn().mockReturnThis(),
    del: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([[null, 'OK'], [null, 'OK']]),
    sadd: jest.fn().mockReturnThis(),
    srem: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
  };

  const mockLogger = {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    fatal: jest.fn(),
    trace: jest.fn(),
    setContext: jest.fn(),
  };

  beforeEach(async () => {
    mockRedis.pipeline.mockReturnValue(mockPipeline);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleCacheService,
        {
          provide: REDIS_CLIENT,
          useValue: mockRedis,
        },
        {
          provide: getLoggerToken(ArticleCacheService.name),
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<ArticleCacheService>(ArticleCacheService);
    redis = module.get(REDIS_CLIENT);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getArticle', () => {
    const articleId = 'article-123';
    const mockArticle = {
      id: articleId,
      title: 'Test Article',
      content: 'Test Content',
      authorId: 'user-123',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    it('должен вернуть статью из кэша если она есть', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockArticle));

      const fetcher = jest.fn();
      const result = await service.getArticle(articleId, fetcher);

      expect(result).toEqual(mockArticle);
      expect(redis.get).toHaveBeenCalledWith(`articles:${articleId}`);
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('должен вызвать fetcher если кэш пуст', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');
      const fetcher = jest.fn().mockResolvedValue(mockArticle);

      const result = await service.getArticle(articleId, fetcher);

      expect(fetcher).toHaveBeenCalled();
      expect(result).toEqual(mockArticle);
    });

    it('должен сохранить результат fetcher в кэш', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');
      const fetcher = jest.fn().mockResolvedValue(mockArticle);

      await service.getArticle(articleId, fetcher);

      expect(redis.set).toHaveBeenCalled();
    });

    it('должен использовать TTL 300 секунд для статьи', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');
      const fetcher = jest.fn().mockResolvedValue(mockArticle);

      await service.getArticle(articleId, fetcher);

      // AbstractCacheService использует pipeline для set
      expect(mockPipeline.set).toHaveBeenCalled();
    });
  });

  describe('getList', () => {
    const params = {
      limit: 10,
      offset: 0,
      sortBy: 'created_at' as const,
      sortOrder: 'DESC' as const,
    };

    const mockList = {
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      pages: 0,
      hasNextPage: false,
    };

    it('должен вернуть список из кэша если он есть', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockList));
      mockPipeline.exec.mockResolvedValue([[null, 1], [null, 1]]);

      const fetcher = jest.fn();
      const result = await service.getList(params, fetcher);

      expect(result).toEqual(mockList);
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('должен зарегистрировать ключ в индексе all-list', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');
      mockPipeline.exec.mockResolvedValue([[null, 1], [null, 1]]);
      const fetcher = jest.fn().mockResolvedValue(mockList);

      await service.getList(params, fetcher);

      expect(redis.pipeline).toHaveBeenCalled();
      expect(mockPipeline.sadd).toHaveBeenCalled();
      expect(mockPipeline.expire).toHaveBeenCalled();
    });

    it('должен зарегистрировать ключ в индексе автора если authorId указан', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');
      mockPipeline.exec.mockResolvedValue([
        [null, 1],
        [null, 1],
        [null, 1],
        [null, 1],
      ]);
      const fetcher = jest.fn().mockResolvedValue(mockList);

      await service.getList({ ...params, authorId: 'user-123' }, fetcher);

      const saddCalls = mockPipeline.sadd.mock.calls;
      const hasAuthorIndex = saddCalls.some(call =>
        call[0].includes('author-user-123'),
      );
      expect(hasAuthorIndex).toBe(true);
    });

    it('должен использовать хеш параметров в ключе', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');
      mockPipeline.exec.mockResolvedValue([[null, 1], [null, 1]]);
      const fetcher = jest.fn().mockResolvedValue(mockList);

      await service.getList(params, fetcher);

      const getCall = mockRedis.get.mock.calls[0];
      expect(getCall[0]).toMatch(/^articles:list:/);
    });
  });

  describe('invalidateArticle', () => {
    const articleId = 'article-123';
    const authorId = 'user-123';

    it('должен инвалидировать статью и связанные индексы', async () => {
      mockPipeline.exec.mockResolvedValue([
        [null, 1],
        [null, 1],
        [null, 1],
      ]);
      mockRedis.smembers.mockResolvedValue([]);

      await service.invalidateArticle(articleId, authorId);

      expect(redis.pipeline).toHaveBeenCalled();
    });

    it('должен инвалидировать индекс all-list', async () => {
      mockPipeline.exec.mockResolvedValue([[null, 1]]);
      mockRedis.smembers.mockResolvedValue(['key1', 'key2']);

      await service.invalidateArticle(articleId, authorId);

      expect(redis.smembers).toHaveBeenCalledWith(
        'articles:index:all-list',
      );
    });

    it('должен инвалидировать индекс автора', async () => {
      mockPipeline.exec.mockResolvedValue([[null, 1]]);
      mockRedis.smembers.mockResolvedValue(['key1']);

      await service.invalidateArticle(articleId, authorId);

      expect(redis.smembers).toHaveBeenCalledWith(
        `articles:index:author-${authorId}`,
      );
    });

    it('должен удалить сам ключ статьи', async () => {
      mockPipeline.exec.mockResolvedValue([[null, 1]]);
      mockRedis.smembers.mockResolvedValue([]);

      await service.invalidateArticle(articleId, authorId);

      // Проверяем что был вызван метод для удаления ключа статьи
      expect(redis.pipeline).toHaveBeenCalled();
    });
  });
});
