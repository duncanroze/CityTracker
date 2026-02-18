import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  PRIM_API_KEY: z.string().optional().default(''),
});

export const env = envSchema.parse(process.env);
