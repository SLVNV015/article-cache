import { createZodDto } from 'nestjs-zod';
import z from 'zod';

const sucessResponceSchema = z.object({
  success: z
    .boolean()
    .describe('Indicates if the request was successful | example: true'),
});

export class SucessResponseDto extends createZodDto(sucessResponceSchema) {}
