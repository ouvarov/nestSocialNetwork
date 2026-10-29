import type Redis from 'ioredis';

import { RedisCacheService } from '../redis-cache.service';

const createRedis = () => {
  const store = new Map<string, string>();

  return {
    store,
    redis: {
      status: 'ready',
      get: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
      set: jest.fn((key: string, value: string) => {
        store.set(key, value);
        return Promise.resolve('OK');
      }),
      del: jest.fn((key: string) => Promise.resolve(Number(store.delete(key)))),
    },
  };
};

describe('RedisCacheService', () => {
  it('stores JSON with an expiry and reads it back', async () => {
    const { redis, store } = createRedis();
    const cache = new RedisCacheService(redis as unknown as Redis);
    const created = new Date('2026-10-01T12:00:00.000Z');

    await cache.set('user:1', { name: 'Ada', created }, 60);

    expect(redis.set).toHaveBeenCalledWith(
      'user:1',
      expect.any(String),
      'EX',
      60,
    );
    expect(store.get('user:1')).toBe(
      '{"name":"Ada","created":"2026-10-01T12:00:00.000Z"}',
    );
    expect(await cache.get('user:1')).toEqual({
      name: 'Ada',
      created: '2026-10-01T12:00:00.000Z',
    });
  });

  it('returns undefined for a missing key', async () => {
    const { redis } = createRedis();
    const cache = new RedisCacheService(redis as unknown as Redis);

    expect(await cache.get('missing')).toBeUndefined();
  });

  it('keeps falsy values apart from a miss', async () => {
    const { redis } = createRedis();
    const cache = new RedisCacheService(redis as unknown as Redis);

    await cache.set('zero', 0, 60);

    expect(await cache.get('zero')).toBe(0);
  });

  it('deletes a key', async () => {
    const { redis, store } = createRedis();
    const cache = new RedisCacheService(redis as unknown as Redis);
    await cache.set('key', 'value', 60);

    await cache.delete('key');

    expect(store.has('key')).toBe(false);
  });

  it('skips redis while it is not connected', async () => {
    const { redis } = createRedis();
    const cache = new RedisCacheService({
      ...redis,
      status: 'reconnecting',
    } as unknown as Redis);

    await cache.set('key', 'value', 60);

    expect(await cache.get('key')).toBeUndefined();
    expect(redis.set).not.toHaveBeenCalled();
    expect(redis.get).not.toHaveBeenCalled();
  });

  it('treats a failing redis as a cache miss', async () => {
    const failure = () => Promise.reject(new Error('Command timed out'));
    const redis = { status: 'ready', get: failure, set: failure, del: failure };
    const cache = new RedisCacheService(redis as unknown as Redis);

    await expect(cache.set('key', 'value', 60)).resolves.toBeUndefined();
    await expect(cache.get('key')).resolves.toBeUndefined();
    await expect(cache.delete('key')).resolves.toBeUndefined();
  });
});
