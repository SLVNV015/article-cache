import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArticlesDatabaseService } from './articles-database.service';
import { Article } from './article.entity';
import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

describe('ArticlesDatabaseService', () => {
  let service: ArticlesDatabaseService;
  let repository: Repository<Article>;

  const mockArticle: Article = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Тестовая статья',
    description: 'Описание тестовой статьи',
    content: 'Содержимое тестовой статьи',
    authorId: '550e8400-e29b-41d4-a716-446655440001',
    author: {} as any,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOneBy: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesDatabaseService,
        {
          provide: getRepositoryToken(Article),
          useValue: mockRepository,
        },
        {
          provide: 'PinoLogger:ArticlesDatabaseService',
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<ArticlesDatabaseService>(ArticlesDatabaseService);
    repository = module.get<Repository<Article>>(getRepositoryToken(Article));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      title: 'Новая статья',
      description: 'Описание новой статьи',
      content: 'Содержимое новой статьи',
    };
    const authorId = '550e8400-e29b-41d4-a716-446655440001';

    it('должен создать статью', async () => {
      mockRepository.create.mockReturnValue({
        ...createDto,
        authorId,
      });
      mockRepository.save.mockResolvedValue(mockArticle);

      await service.create(createDto, authorId);

      expect(repository.create).toHaveBeenCalledWith({
        ...createDto,
        authorId,
      });
      expect(repository.save).toHaveBeenCalled();
    });

    it('должен передать правильные данные в репозиторий', async () => {
      mockRepository.create.mockReturnValue({
        ...createDto,
        authorId,
      });
      mockRepository.save.mockResolvedValue(mockArticle);

      await service.create(createDto, authorId);

      const createCall = mockRepository.create.mock.calls[0][0];
      expect(createCall.title).toBe(createDto.title);
      expect(createCall.description).toBe(createDto.description);
      expect(createCall.content).toBe(createDto.content);
      expect(createCall.authorId).toBe(authorId);
    });
  });

  describe('update', () => {
    const articleId = '550e8400-e29b-41d4-a716-446655440000';
    const authorId = '550e8400-e29b-41d4-a716-446655440001';
    const updateDto = {
      id: articleId,
      title: 'Обновлённая статья',
      description: 'Обновлённое описание',
      content: 'Обновлённое содержимое',
    };

    it('должен обновить статью если пользователь - автор', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockArticle);
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await service.update(articleId, authorId, updateDto);

      expect(repository.findOneBy).toHaveBeenCalledWith({ id: articleId });
      expect(repository.update).toHaveBeenCalledWith(articleId, updateDto);
    });

    it('должен выбросить NotFoundException если статья не найдена', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.update(articleId, authorId, updateDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update(articleId, authorId, updateDto),
      ).rejects.toThrow('Article not found');
    });

    it('должен выбросить ForbiddenException если пользователь не автор', async () => {
      mockRepository.findOneBy.mockResolvedValue({
        ...mockArticle,
        authorId: '550e8400-e29b-41d4-a716-446655440099',
      });

      await expect(
        service.update(articleId, authorId, updateDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.update(articleId, authorId, updateDto),
      ).rejects.toThrow('You are not the author of this article');
    });

    it('не должен вызывать update если проверка авторства провалилась', async () => {
      mockRepository.findOneBy.mockResolvedValue({
        ...mockArticle,
        authorId: 'different-user',
      });

      await expect(
        service.update(articleId, authorId, updateDto),
      ).rejects.toThrow(ForbiddenException);

      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    const articleId = '550e8400-e29b-41d4-a716-446655440000';
    const authorId = '550e8400-e29b-41d4-a716-446655440001';

    it('должен удалить статью если пользователь - автор', async () => {
      mockRepository.findOneBy.mockResolvedValue(mockArticle);
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      await service.remove(articleId, authorId);

      expect(repository.findOneBy).toHaveBeenCalledWith({ id: articleId });
      expect(repository.delete).toHaveBeenCalledWith(articleId);
    });

    it('должен выбросить NotFoundException если статья не найдена', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.remove(articleId, authorId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.remove(articleId, authorId)).rejects.toThrow(
        'Article not found',
      );
    });

    it('должен выбросить ForbiddenException если пользователь не автор', async () => {
      mockRepository.findOneBy.mockResolvedValue({
        ...mockArticle,
        authorId: '550e8400-e29b-41d4-a716-446655440099',
      });

      await expect(service.remove(articleId, authorId)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.remove(articleId, authorId)).rejects.toThrow(
        'You are not the author of this article',
      );
    });

    it('не должен вызывать delete если проверка авторства провалилась', async () => {
      mockRepository.findOneBy.mockResolvedValue({
        ...mockArticle,
        authorId: 'different-user',
      });

      await expect(service.remove(articleId, authorId)).rejects.toThrow(
        ForbiddenException,
      );

      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});
