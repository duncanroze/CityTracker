import { z } from 'zod';

const envSchema = z.object({
  POSTGRES_PRISMA_URL: z.string().url(),
  POSTGRES_URL_NON_POOLING: z.string().url().optional(),
  PRIM_API_KEY: z.string().optional().default(''),
});

export const env = envSchema.parse(process.env);
