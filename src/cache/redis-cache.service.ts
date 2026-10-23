import type Redis from 'ioredis';

import { CacheService } from './cache.service';

class RedisCacheService extends CacheService {
  constructor(private readonly redis: Redis) {
    super();
  }

  async get<T>(key: string): Promise<T | undefined> {
    const value = await this.redis.get(key);

    return value === null ? undefined : (JSON.parse(value) as T);
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }
}

export { RedisCacheService };
