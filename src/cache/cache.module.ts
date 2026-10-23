import { Module } from '@nestjs/common';
import type Redis from 'ioredis';

import { REDIS_CLIENT } from '@/redis/redis.module';

import { CacheService } from './cache.service';
import { MemoryCacheService } from './memory-cache.service';
import { RedisCacheService } from './redis-cache.service';

@Module({
  providers: [
    {
      provide: CacheService,
      useFactory: (redis: Redis | null): CacheService =>
        redis ? new RedisCacheService(redis) : new MemoryCacheService(),
      inject: [REDIS_CLIENT],
    },
  ],
  exports: [CacheService],
})
export class CacheDataModule {}
