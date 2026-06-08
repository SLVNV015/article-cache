import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export const registerSchema = z.object({
  email: z.email().describe('Email | example: email@example.com'),
  password: z
    .string()
    .min(8)
    .max(32)
    .describe('Password must be at least 8 characters long| example:12345678'),
  name: z.string(),
});

export class RegisterDto extends createZodDto(registerSchema) {}

export const loginSchema = z.object({
  email: z.email().describe('Email | example: email@example.com'),
  password: z
    .string()
    .min(8)
    .max(32)
    .describe('Password must be at least 8 characters long| example:12345678'),
});

export class LoginDto extends createZodDto(loginSchema) {}
