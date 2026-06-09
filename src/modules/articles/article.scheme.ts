import { createZodDto } from 'nestjs-zod';
import { getPaginatedSchema } from 'src/common/utils/paginaded.schema';
import z from 'zod';

// для парса ответов.
export const articleBaseSchema = z.object({
  id: z
    .uuid()
    .describe(
      'Article ID формат uuidV4 | example: 1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p',
    ),
  title: z
    .string()
    .min(3)
    .max(512)
    .describe('Article title. | example: Article title'),
  description: z
    .string()
    .min(8)
    .max(1024)
    .describe('Article description. | example: Article description'),
  content: z
    .string()
    .describe('Article content. | example: Article content')
    .optional()
    .describe('Article content. | example: Article content'),
  authorId: z
    .uuid()
    .describe(
      'Author ID формат uuidV4 | example: 1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p',
    ),
  createdAt: z.coerce
    .string()
    .optional()
    .describe('Article createdAt. | example: 2023-01-01T00:00:00.000Z'),
  updatedAt: z.coerce
    .string()
    .optional()
    .describe('Article updatedAt. | example: 2023-01-01T00:00:00.000Z'),
});

export const createArticleSchema = articleBaseSchema.pick({
  title: true,
  content: true,
  description: true,
});

export class CreateArticleDto extends createZodDto(createArticleSchema) {}

export const updateArticleSchema = articleBaseSchema.pick({
  title: true,
  content: true,
  id: true,
  description: true,
});

export class UpdateArticleDto extends createZodDto(updateArticleSchema) {}

export const articleWhitAuthorSchema = articleBaseSchema.extend({
  author: z.object({
    id: z
      .uuid()
      .describe(
        'Author ID формат uuidV4 | example: 1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p',
      ),
    name: z.string().describe('Author name. | example: John Doe'),
  }),
});

export class ArticleResponseDto extends createZodDto(articleWhitAuthorSchema) {}

export class ArticlePaginatedResponseDto extends createZodDto(
  getPaginatedSchema(articleWhitAuthorSchema),
) {}

export const articleFilterSchema = z.object({
  authorId: z.uuid().optional(),
  searchQuery: z.string().min(1).max(255).optional(),
  fromDate: z.iso.date().optional(),
  toDate: z.iso.date().optional(),

  sortBy: z
    .enum(['created_at', 'updated_at', 'author_id'])
    .default('created_at'),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),

  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
});

export class ArticleFilterDto extends createZodDto(articleFilterSchema) {}
