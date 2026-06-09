import { Test, TestingModule } from '@nestjs/testing';
import { ArticlesController } from './articles.controller';
import { ArticleService } from './article.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ArticlesController', () => {
  let controller: ArticlesController;
  let service: ArticleService;

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

  const mockService = {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getOne: jest.fn(),
    getList: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArticlesController],
      providers: [
        {
          provide: ArticleService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ArticlesController>(ArticlesController);
    service = module.get<ArticleService>(ArticleService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      title: 'New Article',
      description: 'New Description',
      content: 'New Content',
    };
    const currentUser = {
      userId: 'user-123',
      email: 'test@test.com',
      sessionId: 'session-123',
    };

    it('должен создать статью', async () => {
      mockService.create.mockResolvedValue({ success: true });

      const result = await controller.create(createDto, currentUser);

      expect(result).toEqual({ success: true });
      expect(service.create).toHaveBeenCalledWith(createDto, currentUser.userId);
    });

    it('должен передать userId текущего пользователя', async () => {
      mockService.create.mockResolvedValue({ success: true });

      await controller.create(createDto, currentUser);

      const callArgs = mockService.create.mock.calls[0];
      expect(callArgs[1]).toBe(currentUser.userId);
    });
  });

  describe('findAll', () => {
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

    it('должен вернуть список статей', async () => {
      mockService.getList.mockResolvedValue(mockList);

      const result = await controller.findAll(params);

      expect(result).toEqual(mockList);
      expect(service.getList).toHaveBeenCalledWith(params);
    });

    it('должен передать параметры фильтрации', async () => {
      const paramsWithFilters = {
        ...params,
        authorId: 'user-123',
        searchQuery: 'test',
      };
      mockService.getList.mockResolvedValue(mockList);

      await controller.findAll(paramsWithFilters);

      expect(service.getList).toHaveBeenCalledWith(paramsWithFilters);
    });

    it('должен быть публичным эндпоинтом', async () => {
      const metadata = Reflect.getMetadata('isPublic', controller.findAll);
      expect(metadata).toBe(true);
    });
  });

  describe('findOne', () => {
    const articleId = 'article-123';

    it('должен вернуть статью по ID', async () => {
      mockService.getOne.mockResolvedValue(mockArticle);

      const result = await controller.findOne(articleId);

      expect(result).toEqual(mockArticle);
      expect(service.getOne).toHaveBeenCalledWith(articleId);
    });

    it('должен вернуть null если статья не найдена', async () => {
      mockService.getOne.mockResolvedValue(null);

      const result = await controller.findOne(articleId);

      expect(result).toBeNull();
    });

    it('должен быть публичным эндпоинтом', async () => {
      const metadata = Reflect.getMetadata('isPublic', controller.findOne);
      expect(metadata).toBe(true);
    });
  });

  describe('update', () => {
    const articleId = 'article-123';
    const updateDto = {
      id: articleId,
      title: 'Updated Title',
      description: 'Updated Description',
      content: 'Updated Content',
    };
    const currentUser = {
      userId: 'user-123',
      email: 'test@test.com',
      sessionId: 'session-123',
    };

    it('должен обновить статью', async () => {
      mockService.update.mockResolvedValue({ success: true });

      const result = await controller.update(articleId, updateDto, currentUser);

      expect(result).toEqual({ success: true });
      expect(service.update).toHaveBeenCalledWith(
        articleId,
        currentUser.userId,
        updateDto,
      );
    });

    it('должен использовать ID из параметра маршрута', async () => {
      mockService.update.mockResolvedValue({ success: true });

      await controller.update(articleId, updateDto, currentUser);

      const callArgs = mockService.update.mock.calls[0];
      expect(callArgs[0]).toBe(articleId);
    });

    it('должен пробросить ForbiddenException если пользователь не автор', async () => {
      mockService.update.mockRejectedValue(
        new ForbiddenException('You are not the author of this article'),
      );

      await expect(
        controller.update(articleId, updateDto, currentUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('должен пробросить NotFoundException если статья не найдена', async () => {
      mockService.update.mockRejectedValue(
        new NotFoundException('Article not found'),
      );

      await expect(
        controller.update(articleId, updateDto, currentUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    const articleId = 'article-123';
    const currentUser = {
      userId: 'user-123',
      email: 'test@test.com',
      sessionId: 'session-123',
    };

    it('должен удалить статью', async () => {
      mockService.delete.mockResolvedValue({ success: true });

      const result = await controller.remove(articleId, currentUser);

      expect(result).toEqual({ success: true });
      expect(service.delete).toHaveBeenCalledWith(articleId, currentUser.userId);
    });

    it('должен пробросить ForbiddenException если пользователь не автор', async () => {
      mockService.delete.mockRejectedValue(
        new ForbiddenException('You are not the author of this article'),
      );

      await expect(controller.remove(articleId, currentUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('должен пробросить NotFoundException если статья не найдена', async () => {
      mockService.delete.mockRejectedValue(
        new NotFoundException('Article not found'),
      );

      await expect(controller.remove(articleId, currentUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
