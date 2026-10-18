import redis from './redis';

/**
 * Robust server-side cache helper powered by Redis.
 * - If Redis is enabled and connected, reads/writes to Redis.
 * - If Redis is unavailable or fails, gracefully falls back to database fetcher without crashing.
 * - Prevents client/browser stale caching while optimizing database performance.
 */
export async function getCachedData<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  if (redis) {
    try {
      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch (err) {
      console.warn(`[Redis Cache Error] Failed to read key "${key}":`, (err as Error).message);
    }
  }

  // Cache miss or Redis unavailable: fetch fresh data from DB/source
  const freshData = await fetcher();

  if (redis && freshData !== undefined && freshData !== null) {
    try {
      // Add slight jitter (0-10% of TTL) to avoid thundering herd
      const jitter = Math.floor(Math.random() * Math.max(1, Math.floor(ttlSeconds * 0.1)));
      await redis.setex(key, ttlSeconds + jitter, JSON.stringify(freshData));
    } catch (err) {
      console.warn(`[Redis Cache Error] Failed to write key "${key}":`, (err as Error).message);
    }
  }

  return freshData;
}

/**
 * Manually set data in Redis cache with TTL.
 */
export async function setCachedData<T>(
  key: string,
  ttlSeconds: number,
  data: T
): Promise<void> {
  if (!redis || data === undefined || data === null) return;
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
  } catch (err) {
    console.warn(`[Redis Cache Error] Failed to set key "${key}":`, (err as Error).message);
  }
}

/**
 * Invalidate a single key or pattern from Redis cache.
 */
export async function invalidateCache(keyOrPattern: string): Promise<void> {
  if (!redis) return;

  try {
    if (keyOrPattern.includes('*')) {
      const keys = await redis.keys(keyOrPattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } else {
      await redis.del(keyOrPattern);
    }
  } catch (err) {
    console.warn(`[Redis Cache Error] Failed to invalidate key "${keyOrPattern}":`, (err as Error).message);
  }
}
