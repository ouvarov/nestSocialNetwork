abstract class CacheService {
  abstract get<T>(key: string): Promise<T | undefined>;
  abstract set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  abstract delete(key: string): Promise<void>;
}

export { CacheService };
