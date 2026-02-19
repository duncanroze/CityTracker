import { z } from 'zod';

const envSchema = z.object({
  POSTGRES_PRISMA_URL: z.string().url(),
  PRIM_API_KEY: z.string().optional().default(''),
});

export const env = envSchema.parse(process.env);
