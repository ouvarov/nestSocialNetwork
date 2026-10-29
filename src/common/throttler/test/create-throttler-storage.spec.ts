import { Logger } from '@nestjs/common';
import Redis from 'ioredis';

import { createThrottlerStorage } from '../create-throttler-storage';

const TTL_MS = 60_000;

describe('createThrottlerStorage', () => {
  let redis: Redis;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    redis = new Redis({
      lazyConnect: true,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
    });
  });

  afterEach(() => {
    redis.disconnect();
    jest.restoreAllMocks();
  });

  it('keeps the default in-memory storage without redis', () => {
    expect(createThrottlerStorage(null)).toBeUndefined();
  });

  it('counts in memory without touching redis until it is ready', async () => {
    const storage = createThrottlerStorage(redis);

    const record = await storage?.increment(
      'ip:1',
      TTL_MS,
      2,
      TTL_MS,
      'default',
    );

    expect(record?.totalHits).toBe(1);
    expect(redis.status).toBe('wait');
  });
});
