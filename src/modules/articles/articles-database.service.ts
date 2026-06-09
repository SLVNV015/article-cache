import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Article } from 'src/modules/articles/article.entity';
import {
  CreateArticleDto,
  UpdateArticleDto,
} from 'src/modules/articles/article.scheme';
import { Repository } from 'typeorm';

@Injectable()
export class ArticlesDatabaseService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    @InjectPinoLogger(ArticlesDatabaseService.name)
    private readonly logger: PinoLogger,
  ) {}

  public async create(
    createArticleDto: CreateArticleDto,
    authorId: string,
  ): Promise<void> {
    const article = this.articleRepository.create({
      ...createArticleDto,
      authorId,
    });
    this.logger.info('article created', { title: article.title, authorId });
    await this.articleRepository.save(article);
  }

  public async update(
    id: string,
    authorId: string,
    updateArticleDto: UpdateArticleDto,
  ): Promise<void> {
    const article = await this.articleRepository.findOneBy({ id });
    if (!article) {
      throw new NotFoundException('Article not found');
    }
    if (article.authorId !== authorId) {
      throw new ForbiddenException('You are not the author of this article');
    }
    await this.articleRepository.update(id, updateArticleDto);
    this.logger.info('article updated', {
      title: article.title,
      authorId,
      id: id,
    });
  }

  public async remove(id: string, authorId: string): Promise<void> {
    const article = await this.articleRepository.findOneBy({ id });
    if (!article) {
      throw new NotFoundException('Article not found');
    }
    if (article.authorId !== authorId) {
      throw new ForbiddenException('You are not the author of this article');
    }
    await this.articleRepository.delete(id);
    this.logger.info('article deleted', {
      title: article.title,
      authorId,
      id: id,
    });
  }
}
