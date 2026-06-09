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

@Injectable()
export class ArticleService {
  constructor(
    private readonly articleDatabase: ArticlesDatabaseService,
    private readonly cache: ArticleCacheService,
    private readonly query: QueryArticleService,
  ) {}

  public async create(
    createArticleDto: CreateArticleDto,
    authorId: string,
  ): Promise<{ success: boolean }> {
    await this.articleDatabase.create(createArticleDto, authorId);
    return { success: true };
  }

  public async update(
    id: string,
    authorId: string,
    updateArticleDto: UpdateArticleDto,
  ): Promise<{ success: boolean }> {
    await this.articleDatabase.update(id, authorId, updateArticleDto);
    await this.cache.invalidateArticle(id, authorId);
    return { success: true };
  }

  public async delete(
    id: string,
    authorId: string,
  ): Promise<{ success: boolean }> {
    await this.articleDatabase.remove(id, authorId);
    await this.cache.invalidateArticle(id, authorId);
    return { success: true };
  }

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

  public async getList(
    params: ArticleFilterDto,
  ): Promise<ArticlePaginatedResponseDto | null> {
    return await this.cache.getList(
      params,
      async () => await this.query.findMany(params),
    );
  }
}
