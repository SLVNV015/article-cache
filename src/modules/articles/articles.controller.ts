import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UsePipes,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import {
  CurrentUser,
  ICurrentUser,
} from 'src/common/decorators/current-user.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { SucessResponseDto } from 'src/common/utils/base-sucess.response';
import {
  ArticleFilterDto,
  articleFilterSchema,
  ArticlePaginatedResponseDto,
  ArticleResponseDto,
  CreateArticleDto,
  UpdateArticleDto,
} from 'src/modules/articles/article.scheme';
import { ArticleService } from 'src/modules/articles/article.service';

/**
 *
 */
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticleService) {}

  @ApiOkResponse({ type: SucessResponseDto })
  @ApiBearerAuth()
  @Post()
  create(
    @Body() createArticleDto: CreateArticleDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.articlesService.create(createArticleDto, user.userId);
  }

  @ApiOkResponse({ type: ArticlePaginatedResponseDto })
  @Public()
  @Get()
  @UsePipes(new ZodValidationPipe(articleFilterSchema))
  findAll(@Query() params: ArticleFilterDto) {
    console.log(params);
    return this.articlesService.getList(params);
  }

  @ApiOkResponse({ type: ArticleResponseDto })
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.articlesService.getOne(id);
  }

  @ApiBearerAuth()
  @ApiOkResponse({ type: SucessResponseDto })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateArticleDto: UpdateArticleDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    return this.articlesService.update(id, user.userId, updateArticleDto);
  }

  @ApiBearerAuth()
  @ApiOkResponse({ type: SucessResponseDto })
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: ICurrentUser) {
    return this.articlesService.delete(id, user.userId);
  }
}
