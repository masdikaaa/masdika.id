/**
 * Shared rate-limiter utility.
 *
 * Strategy:
 *  - If Redis is available (USE_REDIS=true), use atomic Redis counters (survives
 *    restarts and works across multiple instances).
 *  - Otherwise, fall back to an in-process Map (single-instance / dev only).
 *
 * Usage:
 *   const allowed = await checkRateLimit('CHAT', ip, 15, 60);
 *   if (!allowed) return 429;
 */

import { redis } from './redis';

/** In-memory fallback store */
const memoryStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Check and increment a rate-limit counter.
 *
 * @param prefix   - Namespace prefix, e.g. "CHAT", "CONTACT"
 * @param key      - Unique key within the namespace, e.g. an IP address
 * @param maxHits  - Maximum allowed hits within the window
 * @param windowSec - Window duration in seconds
 * @returns `true` if the request is allowed, `false` if it should be blocked
 */
export async function checkRateLimit(
  prefix: string,
  key: string,
  maxHits: number,
  windowSec: number
): Promise<boolean> {
  const redisKey = `rl:${prefix}:${key}`;

  // ── Redis path ──────────────────────────────────────────────────────────────
  if (redis) {
    try {
      const current = await redis.incr(redisKey);
      if (current === 1) {
        // First hit in this window — set expiry
        await redis.expire(redisKey, windowSec);
      }
      return current <= maxHits;
    } catch (err) {
      // Redis error - fall through to in-memory fallback so the app keeps working
      console.warn('[rate-limit] Redis error, using memory fallback:', (err as Error).message);
    }
  }

  // ── In-memory fallback ──────────────────────────────────────────────────────
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const entry = memoryStore.get(redisKey);

  if (entry && now < entry.resetTime) {
    if (entry.count >= maxHits) return false;
    entry.count++;
  } else {
    memoryStore.set(redisKey, { count: 1, resetTime: now + windowMs });
  }

  return true;
}
