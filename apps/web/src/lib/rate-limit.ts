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

/** In-memory fallback store (bounded to prevent OOM DoS if Redis is unreachable) */
const MAX_MEMORY_ENTRIES = 10_000;
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
  const safeKey = String(key || 'unknown').slice(0, 200);
  const redisKey = `rl:${prefix}:${safeKey}`;

  // ── Redis path (atomic MULTI INCR + TTL with self-healing EXPIRE) ───────────
  if (redis) {
    try {
      const txResult = await redis.multi().incr(redisKey).ttl(redisKey).exec();
      const current = Number(txResult?.[0]?.[1] ?? 1);
      const ttl = Number(txResult?.[1]?.[1] ?? -1);
      if (current === 1 || ttl < 0) {
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
    return true;
  }

  if (memoryStore.size >= MAX_MEMORY_ENTRIES) {
    for (const [k, v] of memoryStore.entries()) {
      if (now >= v.resetTime) memoryStore.delete(k);
    }
    if (memoryStore.size >= MAX_MEMORY_ENTRIES) {
      const oldestKey = memoryStore.keys().next().value;
      if (oldestKey) memoryStore.delete(oldestKey);
    }
  }

  memoryStore.set(redisKey, { count: 1, resetTime: now + windowMs });
  return true;
}
