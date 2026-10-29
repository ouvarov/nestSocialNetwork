import { Logger } from '@nestjs/common';
import type Redis from 'ioredis';

import { CacheService } from './cache.service';

type CacheOperation = 'get' | 'set' | 'delete';

class RedisCacheService extends CacheService {
  private readonly logger = new Logger(RedisCacheService.name);

  constructor(private readonly redis: Redis) {
    super();
  }

  async get<T>(key: string): Promise<T | undefined> {
    if (!this.isReady()) return undefined;

    try {
      const value = await this.redis.get(key);

      return value === null ? undefined : (JSON.parse(value) as T);
    } catch (error) {
      this.warn('get', key, error);
      return undefined;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.isReady()) return;

    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
      this.warn('set', key, error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.isReady()) return;

    try {
      await this.redis.del(key);
    } catch (error) {
      this.warn('delete', key, error);
    }
  }

  private isReady(): boolean {
    return this.redis.status === 'ready';
  }

  private warn(operation: CacheOperation, key: string, error: unknown) {
    const reason = error instanceof Error ? error.message : String(error);

    this.logger.warn(`cache ${operation} failed for ${key}: ${reason}`);
  }
}

export { RedisCacheService };
