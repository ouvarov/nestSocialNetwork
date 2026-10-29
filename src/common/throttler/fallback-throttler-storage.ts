import { Logger } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';

type ThrottlerStorageRecord = Awaited<
  ReturnType<ThrottlerStorage['increment']>
>;
type IncrementArgs = Parameters<ThrottlerStorage['increment']>;

class FallbackThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(FallbackThrottlerStorage.name);
  private isOnFallback = false;

  constructor(
    private readonly primary: ThrottlerStorage,
    private readonly fallback: ThrottlerStorage,
    private readonly isPrimaryReady: () => boolean,
  ) {}

  async increment(...args: IncrementArgs): Promise<ThrottlerStorageRecord> {
    if (!this.isPrimaryReady()) return this.countInFallback(args);

    try {
      const record = await this.primary.increment(...args);
      this.switchTo(false, 'rate limits are counted in Redis again');

      return record;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.switchTo(true, `rate limits are counted in memory: ${reason}`);

      return this.fallback.increment(...args);
    }
  }

  private countInFallback(
    args: IncrementArgs,
  ): Promise<ThrottlerStorageRecord> {
    this.switchTo(
      true,
      'rate limits are counted in memory: Redis is not ready',
    );

    return this.fallback.increment(...args);
  }

  private switchTo(isOnFallback: boolean, message: string) {
    if (this.isOnFallback === isOnFallback) return;

    this.isOnFallback = isOnFallback;
    this.logger.warn(message);
  }
}

export { FallbackThrottlerStorage };
