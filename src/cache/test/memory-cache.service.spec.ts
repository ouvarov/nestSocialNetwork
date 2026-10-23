import { MemoryCacheService } from '../memory-cache.service';

describe('MemoryCacheService', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns a stored value until its ttl expires', async () => {
    jest.useFakeTimers({ now: 0 });
    const cache = new MemoryCacheService();

    await cache.set('key', { value: 1 }, 60);

    jest.setSystemTime(59_999);
    expect(await cache.get('key')).toEqual({ value: 1 });

    jest.setSystemTime(60_000);
    expect(await cache.get('key')).toBeUndefined();
  });

  it('deletes a value', async () => {
    const cache = new MemoryCacheService();

    await cache.set('key', 'value', 60);
    await cache.delete('key');

    expect(await cache.get('key')).toBeUndefined();
  });
});
