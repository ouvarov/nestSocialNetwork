import { Logger } from '@nestjs/common';
import {
  type ThrottlerStorage,
  ThrottlerStorageService,
} from '@nestjs/throttler';

import { FallbackThrottlerStorage } from '../fallback-throttler-storage';

const TTL_MS = 60_000;
const LIMIT = 2;

const hit = (storage: ThrottlerStorage) =>
  storage.increment('ip:1', TTL_MS, LIMIT, TTL_MS, 'default');

const failingStore = (): ThrottlerStorage => ({
  increment: () => Promise.reject(new Error('Command timed out')),
});

describe('FallbackThrottlerStorage', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('counts hits in the primary store while it works', async () => {
    const primary = new ThrottlerStorageService();
    const fallback = new ThrottlerStorageService();
    const storage = new FallbackThrottlerStorage(primary, fallback, () => true);

    await hit(storage);

    expect(primary.storage.has('ip:1')).toBe(true);
    expect(fallback.storage.has('ip:1')).toBe(false);
  });

  it('keeps limiting in memory when the primary store fails', async () => {
    const storage = new FallbackThrottlerStorage(
      failingStore(),
      new ThrottlerStorageService(),
      () => true,
    );

    await hit(storage);
    await hit(storage);
    const record = await hit(storage);

    expect(record.totalHits).toBe(LIMIT + 1);
    expect(record.isBlocked).toBe(true);
  });

  it('skips the primary store while it is not ready', async () => {
    const increment = jest.fn(() => Promise.reject(new Error('down')));
    const storage = new FallbackThrottlerStorage(
      { increment },
      new ThrottlerStorageService(),
      () => false,
    );

    const record = await hit(storage);

    expect(record.totalHits).toBe(1);
    expect(increment).not.toHaveBeenCalled();
  });

  it('logs only when it switches between the stores', async () => {
    let isPrimaryDown = true;
    const primary: ThrottlerStorage = {
      increment: (...args) =>
        isPrimaryDown
          ? Promise.reject(new Error('Command timed out'))
          : new ThrottlerStorageService().increment(...args),
    };
    const storage = new FallbackThrottlerStorage(
      primary,
      new ThrottlerStorageService(),
      () => true,
    );

    await hit(storage);
    await hit(storage);
    isPrimaryDown = false;
    await hit(storage);
    await hit(storage);

    expect(warn.mock.calls).toEqual([
      [expect.stringContaining('counted in memory')],
      [expect.stringContaining('counted in Redis again')],
    ]);
  });
});
