import { validateEnv } from './env.schema';

const validEnv = {
  DATABASE_URL: 'postgres://user:password@localhost:5432/mydb',
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  REFRESH_TOKEN_SECRET: 'b'.repeat(32),
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key',
};

describe('validateEnv', () => {
  it('accepts a complete env and applies defaults', () => {
    const env = validateEnv(validEnv);

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(5000);
    expect(env.REDIS_PORT).toBe(6379);
    expect(env.CORS_ORIGIN).toBe('http://localhost:3001');
  });

  it('rejects a missing database url', () => {
    const { DATABASE_URL: _missing, ...withoutDatabaseUrl } = validEnv;

    expect(() => validateEnv(withoutDatabaseUrl)).toThrow(/DATABASE_URL/);
  });

  it('rejects a secret shorter than 32 characters', () => {
    expect(() =>
      validateEnv({ ...validEnv, REFRESH_TOKEN_SECRET: 'jwt-refresh-key' }),
    ).toThrow(/REFRESH_TOKEN_SECRET/);
  });

  it('rejects a port that is not a number', () => {
    expect(() => validateEnv({ ...validEnv, PORT: 'abc' })).toThrow(/PORT/);
  });
});
