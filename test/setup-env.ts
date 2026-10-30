const e2eDatabaseUrl = process.env.E2E_DATABASE_URL;

if (!e2eDatabaseUrl) {
  throw new Error(
    'Set E2E_DATABASE_URL to a throwaway database; e2e tests never read DATABASE_URL from .env',
  );
}

process.env.DATABASE_URL = e2eDatabaseUrl;
process.env.NODE_ENV = 'test';
process.env.REDIS_URL = '';
process.env.STORAGE_DRIVER = 'local';
process.env.RATE_LIMIT_DISABLED = 'true';
process.env.ORIGIN_SECRET = '';
