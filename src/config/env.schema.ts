import { z } from 'zod';

const MIN_SECRET_LENGTH = 32;

const secret = z
  .string()
  .min(
    MIN_SECRET_LENGTH,
    `must be at least ${MIN_SECRET_LENGTH} characters (openssl rand -hex 32)`,
  );

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CORS_ORIGIN: z.url().default('http://localhost:3001'),
  DATABASE_URL: z.url(),
  REDIS_HOST: z.string().min(1),
  REDIS_PORT: z.coerce.number().int().positive(),
  JWT_ACCESS_SECRET: secret,
  REFRESH_TOKEN_SECRET: secret,
  SUPABASE_URL: z.url(),
  SUPABASE_ANON_KEY: z.string().min(1),
});

type Env = z.infer<typeof envSchema>;

const validateEnv = (config: Record<string, unknown>): Env => {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  }

  return result.data;
};

export { envSchema, validateEnv };
export type { Env };
