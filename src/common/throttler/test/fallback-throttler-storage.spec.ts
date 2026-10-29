import {
  type ThrottlerStorage,
  ThrottlerStorageService,
} from '@nestjs/throttler';

import { FallbackThrottlerStorage } from '../fallback-throttler-storage';

const TTL_MS = 60_000;
const LIMIT = 2;

const hit = (storage: ThrottlerStorage) =>
  storage.increment('ip:1', TTL_MS, LIMIT, TTL_MS, 'default');

describe('FallbackThrottlerStorage', () => {
  it('counts hits in the primary store while it works', async () => {
    const primary = new ThrottlerStorageService();
    const fallback = new ThrottlerStorageService();
    const storage = new FallbackThrottlerStorage(primary, fallback);

    await hit(storage);

    expect(primary.storage.has('ip:1')).toBe(true);
    expect(fallback.storage.has('ip:1')).toBe(false);
  });

  it('keeps limiting in memory when the primary store fails', async () => {
    const primary: ThrottlerStorage = {
      increment: () => Promise.reject(new Error('Command timed out')),
    };
    const storage = new FallbackThrottlerStorage(
      primary,
      new ThrottlerStorageService(),
    );

    await hit(storage);
    await hit(storage);
    const record = await hit(storage);

    expect(record.totalHits).toBe(LIMIT + 1);
    expect(record.isBlocked).toBe(true);
  });
});
