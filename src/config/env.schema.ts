import { z } from 'zod';

const MIN_SECRET_LENGTH = 32;

const secret = z
  .string()
  .min(
    MIN_SECRET_LENGTH,
    `must be at least ${MIN_SECRET_LENGTH} characters (openssl rand -hex 32)`,
  );

const optionalWhenEmpty = <Schema extends z.ZodType>(schema: Schema) =>
  z.preprocess(
    (value) => (value === '' ? undefined : value),
    schema.optional(),
  );

const envObjectSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  PUBLIC_URL: z.url().default('http://localhost:5000'),
  CORS_ORIGIN: z.url().default('http://localhost:3001'),
  DATABASE_URL: z.url(),
  REDIS_HOST: z.string().min(1),
  REDIS_PORT: z.coerce.number().int().positive(),
  JWT_ACCESS_SECRET: secret,
  REFRESH_TOKEN_SECRET: secret,
  STORAGE_DRIVER: z.enum(['local', 'supabase']).default('local'),
  SUPABASE_URL: optionalWhenEmpty(z.url()),
  SUPABASE_SERVICE_ROLE_KEY: optionalWhenEmpty(z.string().min(1)),
  SUPABASE_BUCKET: z.string().min(1).default('images'),
});

const envSchema = envObjectSchema.superRefine((env, context) => {
  if (env.STORAGE_DRIVER !== 'supabase') return;

  for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const) {
    if (!env[key]) {
      context.addIssue({
        code: 'custom',
        path: [key],
        message: 'required when STORAGE_DRIVER=supabase',
      });
    }
  }
});

type Env = z.infer<typeof envSchema>;

const validateEnv = (config: Record<string, unknown>): Env => {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  }

  return result.data;
};

export { envObjectSchema, envSchema, validateEnv };
export type { Env };
