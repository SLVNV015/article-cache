import { Module } from '@nestjs/common';
import { ArticleService } from 'src/modules/articles/article.service';
import { ArticlesDatabaseService } from 'src/modules/articles/articles-database.service';
import { QueryArticleService } from 'src/modules/articles/query-article.service';
import { ArticleCacheService } from 'src/modules/articles/articles-cache.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from 'src/modules/articles/article.entity';
import { User } from 'src/modules/users/user.entity';
import { AuthModule } from 'src/modules/auth/auth.module';
import { ArticlesController } from 'src/modules/articles/articles.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Article, User]), AuthModule],
  controllers: [ArticlesController],
  providers: [
    ArticleService,
    ArticlesDatabaseService,
    QueryArticleService,
    ArticleCacheService,
  ],
})
export class ArticlesModule {}
