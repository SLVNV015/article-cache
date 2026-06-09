import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { QueryArticleService } from './query-article.service';
import { Article } from './article.entity';

describe('QueryArticleService', () => {
  let service: QueryArticleService;
  let repository: Repository<Article>;

  const mockArticle = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Test Article',
    description: 'Test Description',
    content: 'Test Content',
    authorId: '550e8400-e29b-41d4-a716-446655440001',
    author: {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Test User',
    },
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  const mockQueryBuilder = {
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  const mockRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryArticleService,
        {
          provide: getRepositoryToken(Article),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<QueryArticleService>(QueryArticleService);
    repository = module.get<Repository<Article>>(getRepositoryToken(Article));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    const articleId = '550e8400-e29b-41d4-a716-446655440000';

    it('должен найти статью по ID', async () => {
      mockRepository.findOne.mockResolvedValue(mockArticle);

      const result = await service.findOne(articleId);

      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      expect(result!.id).toBe(mockArticle.id);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: articleId },
        relations: { author: true },
        select: expect.any(Object),
      });
    });

    it('должен загрузить связь с автором', async () => {
      mockRepository.findOne.mockResolvedValue(mockArticle);

      const result = await service.findOne(articleId);

      expect(result).not.toBeNull();
      expect(result!.author).toBeDefined();
      expect(result!.author.id).toBe(mockArticle.author.id);
    });

    it('должен вернуть null если статья не найдена', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne(articleId);

      expect(result).toBeNull();
    });

    it('должен выбрать только нужные поля статьи', async () => {
      mockRepository.findOne.mockResolvedValue(mockArticle);

      await service.findOne(articleId);

      const call = mockRepository.findOne.mock.calls[0][0];
      expect(call.select).toBeDefined();
      expect(call.select.id).toBe(true);
      expect(call.select.title).toBe(true);
    });
  });

  describe('findMany', () => {
    const mockArticles = [mockArticle];
    const params = {
      limit: 10,
      offset: 0,
      sortBy: 'created_at' as const,
      sortOrder: 'DESC' as const,
    };

    beforeEach(() => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockArticles, 1]);
    });

    it('должен найти список статей с пагинацией', async () => {
      const result = await service.findMany(params);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('должен применить фильтр по authorId', async () => {
      await service.findMany({
        ...params,
        authorId: '550e8400-e29b-41d4-a716-446655440001',
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'a.authorId = :authorId',
        { authorId: '550e8400-e29b-41d4-a716-446655440001' },
      );
    });

    it('должен применить фильтр по searchQuery', async () => {
      await service.findMany({ ...params, searchQuery: 'test' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'a.title ILIKE :searchQuery',
        { searchQuery: '%test%' },
      );
    });

    it('должен применить фильтр по fromDate', async () => {
      const fromDate = '2024-01-01T00:00:00.000Z';
      await service.findMany({ ...params, fromDate });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'a.createdAt >= :fromDate',
        { fromDate },
      );
    });

    it('должен парсить статьи через Zod схему', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockArticles, 1]);

      const result = await service.findMany(params);

      // Проверяем что данные были распарсены
      expect(result.data[0]).toBeDefined();
      expect(result.data[0].id).toBe(mockArticle.id);
    });

    it('должен вернуть пустой массив если статьи не найдены', async () => {
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.findMany(params);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.pages).toBe(0);
    });

    it('должен загрузить связь с автором для всех статей', async () => {
      await service.findMany(params);

      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'a.author',
        'author',
      );
      expect(mockQueryBuilder.select).toHaveBeenCalled();
    });
  });
});
