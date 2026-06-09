import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Article } from 'src/modules/articles/article.entity';
import {
  ArticleFilterDto,
  ArticlePaginatedResponseDto,
  ArticleResponseDto,
  articleWhitAuthorSchema,
} from 'src/modules/articles/article.scheme';
import { Repository } from 'typeorm';

@Injectable()
export class QueryArticleService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
  ) {}

  public async findOne(id: string): Promise<ArticleResponseDto | null> {
    const one = await this.articleRepo.findOne({
      where: {
        id,
      },
      relations: {
        author: true,
      },
      select: {
        id: true,
        title: true,
        content: true,
        description: true,
        authorId: true,
        author: {
          id: true,
          name: true,
        },
      },
    });

    return one ? articleWhitAuthorSchema.parse(one) : null;
  }

  /**
   * @param params - ArticleFilterDto должны быть провалидированы от slq injection
   * @returns ArticlePaginatedResponseDto
   */
  public async findMany(
    params: ArticleFilterDto,
  ): Promise<ArticlePaginatedResponseDto> {
    const qb = this.articleRepo
      .createQueryBuilder('a')
      .leftJoin('a.author', 'author')
      .select([
        'a.id',
        'a.title',
        'a.content',
        'a.createdAt',
        'a.updatedAt',
        'a.description',
        'author.id',
        'author.name',
      ]);

    if (params.authorId) {
      qb.andWhere('a.authorId = :authorId', { authorId: params.authorId });
    }

    if (params.fromDate) {
      qb.andWhere('a.createdAt >= :fromDate', { fromDate: params.fromDate });
    }

    if (params.toDate) {
      qb.andWhere('a.createdAt <= :toDate', { toDate: params.toDate });
    }

    if (params.searchQuery) {
      qb.andWhere('a.title ILIKE :searchQuery', {
        searchQuery: `%${params.searchQuery}%`,
      });
    }

    if (params.sortBy) {
      qb.orderBy(`a.${params.sortBy}`, params.sortOrder);
    }

    if (params.limit) {
      qb.take(params.limit);
    }

    if (params.offset) {
      qb.skip(params.offset);
    }

    const result = await qb.getManyAndCount();

    const mappedArticles = result[0].map((article) => {
      const dto2: ArticleResponseDto = {
        id: article.id,
        title: article.title,
        content: article.content,
        authorId: article.author.id,
        description: article.description,
        createdAt: article.createdAt.toISOString(),
        updatedAt: article.updatedAt.toISOString(),
        author: {
          id: article.author.id,
          name: article.author.name,
        },
      };
      return dto2;
    });
    const res: ArticlePaginatedResponseDto = {
      data: mappedArticles || [],
      total: result[1],
      page: params.offset / params.limit + 1,
      limit: params.limit,
      pages: Math.ceil(result[1] / params.limit),
      hasNextPage: params.offset + params.limit < result[1],
    };

    return res;
  }
}
