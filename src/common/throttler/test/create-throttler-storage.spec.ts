import type Redis from 'ioredis';

import { createThrottlerStorage } from '../create-throttler-storage';
import { FallbackThrottlerStorage } from '../fallback-throttler-storage';

describe('createThrottlerStorage', () => {
  it('keeps the default in-memory storage without redis', () => {
    expect(createThrottlerStorage(null)).toBeUndefined();
  });

  it('wraps the redis storage with the in-memory fallback', () => {
    const redis = { status: 'ready' } as unknown as Redis;

    expect(createThrottlerStorage(redis)).toBeInstanceOf(
      FallbackThrottlerStorage,
    );
  });
});
