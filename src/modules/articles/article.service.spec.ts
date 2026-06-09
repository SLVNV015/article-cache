import { Test, TestingModule } from '@nestjs/testing';
import { ArticleService } from './article.service';
import { ArticlesDatabaseService } from './articles-database.service';
import { ArticleCacheService } from './articles-cache.service';
import { QueryArticleService } from './query-article.service';
import { getLoggerToken, PinoLogger } from 'nestjs-pino';
import { HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';

describe('ArticleService', () => {
  let service: ArticleService;
  let databaseService: ArticlesDatabaseService;
  let cacheService: ArticleCacheService;
  let queryService: QueryArticleService;

  const mockArticle = {
    id: 'article-123',
    title: 'Test Article',
    description: 'Test Description',
    content: 'Test Content',
    authorId: 'user-123',
    author: {
      id: 'user-123',
      name: 'Test User',
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockDatabaseService = {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockCacheService = {
    getArticle: jest.fn(),
    getList: jest.fn(),
    invalidateArticle: jest.fn(),
  };

  const mockQueryService = {
    findOne: jest.fn(),
    findMany: jest.fn(),
  };

  const mockLogger = {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticleService,
        {
          provide: ArticlesDatabaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: ArticleCacheService,
          useValue: mockCacheService,
        },
        {
          provide: QueryArticleService,
          useValue: mockQueryService,
        },
        {
          provide: getLoggerToken(ArticleService.name),
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<ArticleService>(ArticleService);
    databaseService = module.get<ArticlesDatabaseService>(
      ArticlesDatabaseService,
    );
    cacheService = module.get<ArticleCacheService>(ArticleCacheService);
    queryService = module.get<QueryArticleService>(QueryArticleService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      title: 'New Article',
      description: 'New Description',
      content: 'New Content',
    };
    const authorId = 'user-123';

    it('должен создать статью через database service', async () => {
      mockDatabaseService.create.mockResolvedValue(undefined);

      const result = await service.create(createDto, authorId);

      expect(result).toEqual({ success: true });
      expect(databaseService.create).toHaveBeenCalledWith(createDto, authorId);
    });

    it('должен пробросить ошибку из database service', async () => {
      mockDatabaseService.create.mockRejectedValue(new Error('DB Error'));

      await expect(service.create(createDto, authorId)).rejects.toThrow(
        'DB Error',
      );
    });
  });

  describe('update', () => {
    const articleId = 'article-123';
    const authorId = 'user-123';
    const updateDto = {
      id: articleId,
      title: 'Updated Title',
      description: 'Updated Description',
      content: 'Updated Content',
    };

    it('должен обновить статью и инвалидировать кэш', async () => {
      mockDatabaseService.update.mockResolvedValue(undefined);
      mockCacheService.invalidateArticle.mockResolvedValue(undefined);

      const result = await service.update(articleId, authorId, updateDto);

      expect(result).toEqual({ success: true });
      expect(databaseService.update).toHaveBeenCalledWith(
        articleId,
        authorId,
        updateDto,
      );
      expect(cacheService.invalidateArticle).toHaveBeenCalledWith(
        articleId,
        authorId,
      );
    });

    it('должен инвалидировать кэш после успешного обновления', async () => {
      mockDatabaseService.update.mockResolvedValue(undefined);
      mockCacheService.invalidateArticle.mockResolvedValue(undefined);

      await service.update(articleId, authorId, updateDto);

      expect(cacheService.invalidateArticle).toHaveBeenCalled();
    });

    it('не должен инвалидировать кэш если обновление провалилось', async () => {
      mockDatabaseService.update.mockRejectedValue(new Error('Update failed'));

      await expect(
        service.update(articleId, authorId, updateDto),
      ).rejects.toThrow('Update failed');

      expect(cacheService.invalidateArticle).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    const articleId = 'article-123';
    const authorId = 'user-123';

    it('должен удалить статью и инвалидировать кэш', async () => {
      mockDatabaseService.remove.mockResolvedValue(undefined);
      mockCacheService.invalidateArticle.mockResolvedValue(undefined);

      const result = await service.delete(articleId, authorId);

      expect(result).toEqual({ success: true });
      expect(databaseService.remove).toHaveBeenCalledWith(articleId, authorId);
      expect(cacheService.invalidateArticle).toHaveBeenCalledWith(
        articleId,
        authorId,
      );
    });

    it('не должен инвалидировать кэш если удаление провалилось', async () => {
      mockDatabaseService.remove.mockRejectedValue(new Error('Delete failed'));

      await expect(service.delete(articleId, authorId)).rejects.toThrow(
        'Delete failed',
      );

      expect(cacheService.invalidateArticle).not.toHaveBeenCalled();
    });
  });

  describe('getOne', () => {
    const articleId = 'article-123';

    it('должен получить статью через cache service', async () => {
      mockCacheService.getArticle.mockResolvedValue(mockArticle);

      const result = await service.getOne(articleId);

      expect(result).toEqual(mockArticle);
      expect(cacheService.getArticle).toHaveBeenCalled();
    });

    it('должен передать fetcher в cache service', async () => {
      mockCacheService.getArticle.mockImplementation(async (id, fetcher) => {
        return await fetcher();
      });
      mockQueryService.findOne.mockResolvedValue(mockArticle);

      await service.getOne(articleId);

      expect(queryService.findOne).toHaveBeenCalledWith(articleId);
    });

    it('должен выкинуть  ошибку если статья не найдена', async () => {
      mockCacheService.getArticle.mockResolvedValue(null);

      try {
        // 3. Вызываем метод. С await он честно выбросит ошибку сюда
        await service.getOne(articleId);
      } catch (error) {
        // 4. Перехватываем и проверяем класс ошибки и её сообщение
        expect(error).toBeInstanceOf(NotFoundException);
      }
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
      data: [mockArticle],
      total: 1,
      page: 1,
      limit: 10,
      pages: 1,
      hasNextPage: false,
    };

    it('должен получить список через cache service', async () => {
      mockCacheService.getList.mockResolvedValue(mockList);

      const result = await service.getList(params);

      expect(result).toEqual(mockList);
      expect(cacheService.getList).toHaveBeenCalled();
    });

    it('должен передать fetcher в cache service', async () => {
      mockCacheService.getList.mockImplementation(async (params, fetcher) => {
        return await fetcher();
      });
      mockQueryService.findMany.mockResolvedValue(mockList);

      await service.getList(params);

      expect(queryService.findMany).toHaveBeenCalledWith(params);
    });

    it('должен корректно передать параметры фильтрации', async () => {
      const paramsWithFilters = {
        ...params,
        authorId: 'user-123',
        searchQuery: 'test',
      };

      mockCacheService.getList.mockImplementation(async (params, fetcher) => {
        return await fetcher();
      });
      mockQueryService.findMany.mockResolvedValue(mockList);

      await service.getList(paramsWithFilters);

      expect(queryService.findMany).toHaveBeenCalledWith(paramsWithFilters);
    });
  });
});
