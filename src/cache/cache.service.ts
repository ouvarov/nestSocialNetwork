import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async setCache(key: string, value: unknown, ttl: number = 10000) {
    await this.cacheManager.set(key, value, ttl);
  }

  async getCache<T>(key: string): Promise<T | undefined> {
    return await this.cacheManager.get<T>(key);
  }

  async deleteCache(key: string) {
    await this.cacheManager.del(key);
  }
}
