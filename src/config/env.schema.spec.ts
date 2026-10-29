import { validateEnv } from './env.schema';

const validEnv = {
  DATABASE_URL: 'postgres://user:password@localhost:5432/mydb',
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
    expect(env.REDIS_URL).toBeUndefined();
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

  it('accepts a redis url and rejects a malformed one', () => {
    const redisUrl = 'rediss://default:password@host:6379';

    expect(validateEnv({ ...validEnv, REDIS_URL: redisUrl }).REDIS_URL).toBe(
      redisUrl,
    );
    expect(() => validateEnv({ ...validEnv, REDIS_URL: 'not a url' })).toThrow(
      /REDIS_URL/,
    );
  });

  it('keeps rate limiting on unless it is switched off explicitly', () => {
    expect(validateEnv(validEnv).RATE_LIMIT_DISABLED).toBe(false);
    expect(
      validateEnv({ ...validEnv, RATE_LIMIT_DISABLED: '' }).RATE_LIMIT_DISABLED,
    ).toBe(false);
    expect(
      validateEnv({ ...validEnv, RATE_LIMIT_DISABLED: 'true' })
        .RATE_LIMIT_DISABLED,
    ).toBe(true);
    expect(() =>
      validateEnv({ ...validEnv, RATE_LIMIT_DISABLED: 'maybe' }),
    ).toThrow(/RATE_LIMIT_DISABLED/);
  });

  it('refuses to switch rate limiting off in production', () => {
    expect(() =>
      validateEnv({
        ...validEnv,
        NODE_ENV: 'production',
        ORIGIN_SECRET: 'c'.repeat(32),
        RATE_LIMIT_DISABLED: 'true',
      }),
    ).toThrow(/must not be set in production[\s\S]*RATE_LIMIT_DISABLED/);
  });

  it('rejects a port that is not a number', () => {
    expect(() => validateEnv({ ...validEnv, PORT: 'abc' })).toThrow(/PORT/);
  });

  it('uses local storage by default and ignores empty supabase vars', () => {
    const env = validateEnv({
      ...validEnv,
      SUPABASE_URL: '',
      SUPABASE_SERVICE_ROLE_KEY: '',
    });

    expect(env.STORAGE_DRIVER).toBe('local');
    expect(env.SUPABASE_URL).toBeUndefined();
  });

  it('requires the supabase url and service role key for the supabase driver', () => {
    expect(() =>
      validateEnv({
        ...validEnv,
        STORAGE_DRIVER: 'supabase',
        SUPABASE_URL: '',
      }),
    ).toThrow(/SUPABASE_URL[\s\S]*SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('leaves the proxy check off when ORIGIN_SECRET is empty', () => {
    expect(
      validateEnv({ ...validEnv, ORIGIN_SECRET: '' }).ORIGIN_SECRET,
    ).toBeUndefined();
  });

  it('requires ORIGIN_SECRET in production', () => {
    expect(() =>
      validateEnv({ ...validEnv, NODE_ENV: 'production', ORIGIN_SECRET: '' }),
    ).toThrow(/required in production[\s\S]*ORIGIN_SECRET/);
    expect(
      validateEnv({
        ...validEnv,
        NODE_ENV: 'production',
        ORIGIN_SECRET: 'c'.repeat(32),
      }).ORIGIN_SECRET,
    ).toBe('c'.repeat(32));
  });

  it('rejects an ORIGIN_SECRET shorter than 32 characters', () => {
    expect(() => validateEnv({ ...validEnv, ORIGIN_SECRET: 'short' })).toThrow(
      /ORIGIN_SECRET/,
    );
  });
});
