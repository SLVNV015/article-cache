import z from 'zod';

export function getZodResponce<T extends z.ZodObject>(schema: T) {
  return z.object({
    success: z.boolean(),
    data: schema,
    timestamp: z.string(),
  });
}
