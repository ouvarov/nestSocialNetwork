import { CacheService } from './cache.service';

type Entry = { value: unknown; expiresAt: number };

const SECOND_MS = 1000;

class MemoryCacheService extends CacheService {
  private readonly entries = new Map<string, Entry>();

  get<T>(key: string): Promise<T | undefined> {
    const entry = this.entries.get(key);

    if (!entry || entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return Promise.resolve(undefined);
    }

    return Promise.resolve(entry.value as T);
  }

  set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    this.entries.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * SECOND_MS,
    });
    return Promise.resolve();
  }

  delete(key: string): Promise<void> {
    this.entries.delete(key);
    return Promise.resolve();
  }
}

export { MemoryCacheService };
