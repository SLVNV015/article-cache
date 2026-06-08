import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const UserBaseSchema = z.object({
  id: z
    .uuid()
    .describe(
      'User ID формат uuidV4 | example: 1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p',
    ),
  email: z.email().describe('User email. | example: example@example.com'),
  password: z
    .string()
    .min(8)
    .describe(
      'User password. Нет проверки на спецсимволы строчные и прописные буквы. | example: 12345678',
    ),
  name: z.string().describe('User name. | example: John Doe'),
  createdAt: z
    .date()
    .describe('User createdAt. | example: 2023-01-01T00:00:00.000Z'),
});

export const CreateUserSchema = UserBaseSchema.pick({
  name: true,
  email: true,
  password: true,
});

export class CreateUserDto extends createZodDto(CreateUserSchema) {}

export const UserResponseSchema = UserBaseSchema.omit({
  password: true,
});

export class UserResponseDto extends createZodDto(UserResponseSchema) {}
