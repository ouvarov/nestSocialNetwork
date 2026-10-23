import {
  Global,
  Inject,
  Logger,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import type { Env } from '@/config/env.schema';

const REDIS_CLIENT = Symbol('REDIS_CLIENT');
const MAX_RETRIES_PER_REQUEST = 3;

const createRedisClient = (config: ConfigService<Env, true>) => {
  const url = config.get('REDIS_URL', { infer: true });

  if (!url) {
    new Logger('Redis').warn(
      'REDIS_URL is not set: cache and rate limits are kept in memory',
    );
    return null;
  }

  return new Redis(url, { maxRetriesPerRequest: MAX_RETRIES_PER_REQUEST });
};

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: createRedisClient,
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis | null) {}

  async onApplicationShutdown() {
    await this.redis?.quit();
  }
}

export { REDIS_CLIENT };
