import {
  type ThrottlerStorage,
  ThrottlerStorageService,
} from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import type Redis from 'ioredis';

import { FallbackThrottlerStorage } from './fallback-throttler-storage';

const createThrottlerStorage = (
  redis: Redis | null,
): ThrottlerStorage | undefined =>
  redis
    ? new FallbackThrottlerStorage(
        new ThrottlerStorageRedisService(redis),
        new ThrottlerStorageService(),
        () => redis.status === 'ready',
      )
    : undefined;

export { createThrottlerStorage };
