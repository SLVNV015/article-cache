import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ArticleFilterDto,
  ArticlePaginatedResponseDto,
  ArticleResponseDto,
  CreateArticleDto,
  UpdateArticleDto,
} from 'src/modules/articles/article.scheme';
import { ArticleCacheService } from 'src/modules/articles/articles-cache.service';
import { ArticlesDatabaseService } from 'src/modules/articles/articles-database.service';
import { QueryArticleService } from 'src/modules/articles/query-article.service';

/**
 * Главный сервис для работы со статьями.
 * Координирует взаимодействие между слоями БД, кэша и запросов.
 */
@Injectable()
export class ArticleService {
  constructor(
    private readonly articleDatabase: ArticlesDatabaseService,
    private readonly cache: ArticleCacheService,
    private readonly query: QueryArticleService,
  ) {}

  /**
   * Создает новую статью.
   * @param createArticleDto - Данные для создания статьи
   * @param authorId - ID автора статьи
   * @returns Объект с флагом успешности операции
   */
  public async create(
    createArticleDto: CreateArticleDto,
    authorId: string,
  ): Promise<{ success: boolean }> {
    await this.articleDatabase.create(createArticleDto, authorId);
    return { success: true };
  }

  /**
   * Обновляет существующую статью.
   * Только автор может обновить свою статью.
   * После обновления инвалидирует связанные кэши.
   * @param id - ID статьи
   * @param authorId - ID автора для проверки прав
   * @param updateArticleDto - Данные для обновления
   * @returns Объект с флагом успешности операции
   * @throws {NotFoundException} Если статья не найдена
   * @throws {ForbiddenException} Если пользователь не является автором
   */
  public async update(
    id: string,
    authorId: string,
    updateArticleDto: UpdateArticleDto,
  ): Promise<{ success: boolean }> {
    await this.articleDatabase.update(id, authorId, updateArticleDto);
    await this.cache.invalidateArticle(id, authorId);
    return { success: true };
  }

  /**
   * Удаляет статью.
   * Только автор может удалить свою статью.
   * После удаления инвалидирует связанные кэши.
   * @param id - ID статьи
   * @param authorId - ID автора для проверки прав
   * @returns Объект с флагом успешности операции
   * @throws {NotFoundException} Если статья не найдена
   * @throws {ForbiddenException} Если пользователь не является автором
   */
  public async delete(
    id: string,
    authorId: string,
  ): Promise<{ success: boolean }> {
    await this.articleDatabase.remove(id, authorId);
    await this.cache.invalidateArticle(id, authorId);
    return { success: true };
  }

  /**
   * Получает одну статью по ID.
   * Сначала проверяет кэш, затем обращается к БД если данных нет в кэше.
   * @param id - ID статьи
   * @returns Данные статьи с информацией об авторе
   * @throws {NotFoundException} Если статья не найдена
   */
  public async getOne(id: string): Promise<ArticleResponseDto> {
    const article = await this.cache.getArticle(
      id,
      async () => await this.query.findOne(id),
    );
    if (!article) {
      throw new NotFoundException('Article not found');
    }
    return article;
  }

  /**
   * Получает список статей с фильтрацией и пагинацией.
   * Сначала проверяет кэш, затем обращается к БД если данных нет в кэше.
   * @param params - Параметры фильтрации (authorId, даты, поиск, сортировка, пагинация)
   * @returns Пагинированный список статей с метаданными
   */
  public async getList(
    params: ArticleFilterDto,
  ): Promise<ArticlePaginatedResponseDto | null> {
    return await this.cache.getList(
      params,
      async () => await this.query.findMany(params),
    );
  }
}
