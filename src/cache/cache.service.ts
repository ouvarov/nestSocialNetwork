import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache, // Inject cache manager
  ) {}

  // Set data in the cache
  async setCache(key: string, value: any, ttl: number = 3600) {
    try {
      await this.cacheManager.set(key, value, ttl);
    } catch (error) {
      console.error('Cache set error:', error);
      throw error;
    }
  }

  // Get data from the cache
  async getCache(key: string): Promise<any> {
    return await this.cacheManager.get(key);
  }

  // Delete data from the cache
  async deleteCache(key: string) {
    await this.cacheManager.del(key);
  }
}
