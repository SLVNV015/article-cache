import z from 'zod';

export function getPaginatedSchema<T extends z.ZodObject>(schema: T) {
  return z.object({
    data: z.array(schema),
    total: z.number().describe('Total number of items'),
    page: z.number().describe('Current page number'),
    limit: z.number().describe('Number of items per page'),
    pages: z.number().describe('Total number of pages'),
    hasNextPage: z.boolean().describe('Indicates if there are more pages'),
  });
}
