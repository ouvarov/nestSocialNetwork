import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type Redis from 'ioredis';

import { HealthService } from '../health.service';

const succeeds = () => Promise.resolve('ok');
const fails = () => Promise.reject(new Error('connection refused'));

const createHealthService = (
  database: () => Promise<unknown>,
  redis: (() => Promise<unknown>) | null,
) =>
  new HealthService(
    { execute: database } as unknown as PostgresJsDatabase,
    redis ? ({ ping: redis } as unknown as Redis) : null,
  );

describe('HealthService.checkReadiness', () => {
  it('is ready when postgres responds and redis is not configured', async () => {
    await expect(
      createHealthService(succeeds, null).checkReadiness(),
    ).resolves.toEqual({ ready: true, database: 'up', redis: 'disabled' });
  });

  it('is ready when postgres and redis respond', async () => {
    await expect(
      createHealthService(succeeds, succeeds).checkReadiness(),
    ).resolves.toEqual({ ready: true, database: 'up', redis: 'up' });
  });

  it('is not ready when postgres is down', async () => {
    await expect(
      createHealthService(fails, succeeds).checkReadiness(),
    ).resolves.toEqual({ ready: false, database: 'down', redis: 'up' });
  });

  it('is not ready when a configured redis is down', async () => {
    await expect(
      createHealthService(succeeds, fails).checkReadiness(),
    ).resolves.toEqual({ ready: false, database: 'up', redis: 'down' });
  });
});
