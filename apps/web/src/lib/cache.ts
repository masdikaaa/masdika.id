import redis from './redis';
import { prisma } from './prisma';

/**
 * ⚡ Multi-Tier High-Performance Caching System (L1 RAM + L2 Redis + SingleFlight)
 *
 * Tier 1 (L1 In-Memory): ~0.01ms response time inside Node.js heap (TTL: 15 seconds)
 * Tier 2 (L2 Redis): ~0.5ms - 1ms response time via low-latency TCP socket (TTL: 300s+)
 * Tier 3 (Database): Fallback with SingleFlight Promise Deduplication
 */

interface MemoryCacheEntry {
  data: any;
  expiresAt: number;
}

// In-Memory L1 Cache Map
const l1Cache = new Map<string, MemoryCacheEntry>();

// SingleFlight: Track in-flight async promises to prevent Cache Stampedes (Thundering Herd)
const inFlightPromises = new Map<string, Promise<any>>();

// Garbage collector for L1 Memory Cache: run every 60 seconds to prune expired entries
if (typeof setInterval !== 'undefined') {
  const l1PruneInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of l1Cache.entries()) {
      if (entry.expiresAt <= now) {
        l1Cache.delete(key);
      }
    }
  }, 60000);
  
  if (l1PruneInterval.unref) {
    l1PruneInterval.unref();
  }
}

/**
 * Robust, high-speed multi-tier cache fetcher.
 */
export async function getCachedData<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const now = Date.now();

  // 1. Check L1 In-Memory Micro-Cache (~0.01ms)
  const l1Entry = l1Cache.get(key);
  if (l1Entry && l1Entry.expiresAt > now) {
    return l1Entry.data as T;
  }

  // 2. Check L2 Redis Cache (~0.5ms)
  if (redis) {
    try {
      const cached = await redis.get(key);
      if (cached) {
        const parsed = JSON.parse(cached) as T;
        // Populate L1 cache (15s micro-cache or 20% of TTL)
        const l1Ttl = Math.min(15000, ttlSeconds * 200);
        l1Cache.set(key, { data: parsed, expiresAt: now + l1Ttl });
        return parsed;
      }
    } catch (err) {
      console.warn(`[Redis Cache Warning] Failed to read key "${key}":`, (err as Error).message);
    }
  }

  // 3. SingleFlight: Deduplicate concurrent in-flight fetches for the same key
  let inFlight = inFlightPromises.get(key);
  if (!inFlight) {
    inFlight = (async () => {
      try {
        const freshData = await fetcher();

        if (freshData !== undefined && freshData !== null) {
          // Store in L1 Memory Cache
          const l1Ttl = Math.min(15000, ttlSeconds * 200);
          l1Cache.set(key, { data: freshData, expiresAt: Date.now() + l1Ttl });

          // Store in L2 Redis Cache
          if (redis) {
            try {
              // Add slight jitter (0-10% of TTL) to avoid simultaneous expirations
              const jitter = Math.floor(Math.random() * Math.max(1, Math.floor(ttlSeconds * 0.1)));
              await redis.setex(key, ttlSeconds + jitter, JSON.stringify(freshData));
            } catch (err) {
              console.warn(`[Redis Cache Warning] Failed to write key "${key}":`, (err as Error).message);
            }
          }
        }

        return freshData;
      } finally {
        inFlightPromises.delete(key);
      }
    })();

    inFlightPromises.set(key, inFlight);
  }

  return inFlight as Promise<T>;
}

/**
 * Manually set data in both L1 and L2 Redis cache with TTL.
 */
export async function setCachedData<T>(
  key: string,
  ttlSeconds: number,
  data: T
): Promise<void> {
  if (data === undefined || data === null) return;

  // Set L1 Memory Cache
  const l1Ttl = Math.min(15000, ttlSeconds * 200);
  l1Cache.set(key, { data, expiresAt: Date.now() + l1Ttl });

  // Set L2 Redis Cache
  if (redis) {
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(data));
    } catch (err) {
      console.warn(`[Redis Cache Warning] Failed to set key "${key}":`, (err as Error).message);
    }
  }
}

/**
 * Invalidate a single key or pattern from both L1 and L2 cache.
 */
export async function invalidateCache(keyOrPattern: string): Promise<void> {
  // Clear from L1 Memory Cache
  if (keyOrPattern.includes('*')) {
    const regex = new RegExp('^' + keyOrPattern.replace(/\*/g, '.*') + '$');
    for (const key of l1Cache.keys()) {
      if (regex.test(key)) {
        l1Cache.delete(key);
      }
    }
  } else {
    l1Cache.delete(keyOrPattern);
  }

  // Clear from L2 Redis Cache
  if (redis) {
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
      console.warn(`[Redis Cache Warning] Failed to invalidate key "${keyOrPattern}":`, (err as Error).message);
    }
  }
}

/**
 * ⚡ Cold Start Optimizer: Preloads and warms up all public caches in parallel
 * Run at server boot so the very first visitor gets instant 0ms responses.
 */
export async function warmupPublicCache(): Promise<void> {
  const startTime = Date.now();
  console.log('⚡ [Cache Warmup] Initiating public cache pre-warming...');

  try {
    await Promise.allSettled([
      // 1. Public Settings
      getCachedData('settings:public_list', 3600, () =>
        prisma.setting.findMany({
          where: {
            key: {
              in: [
                'social_github', 'social_linkedin', 'social_twitter',
                'social_instagram', 'social_youtube', 'site_name',
                'site_title', 'site_description', 'contact_email',
                'contact_location', 'contact_phone', 'hero_title',
                'hero_description', 'hero_typing_text', 'cv_url'
              ]
            }
          }
        })
      ),

      // 2. Public Posts
      getCachedData('posts:list', 3600, async () => {
        const posts = await prisma.blogPost.findMany({
          where: { published: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            image: true,
            createdAt: true,
            readTime: true,
            category: { select: { id: true, name: true, slug: true } },
            tags: { select: { tag: { select: { id: true, name: true, slug: true } } } }
          }
        });
        return posts.map((post) => ({
          ...post,
          tags: post.tags.map((pt) => pt.tag)
        }));
      }),

      // 3. Public Projects
      getCachedData('portfolio:list:all', 3600, () =>
        prisma.project.findMany({
          where: { status: 'COMPLETED' },
          take: 8,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            slug: true,
            image: true,
            description: true,
            techStack: true,
            projectUrl: true,
            client: true,
            category: { select: { id: true, name: true } }
          }
        })
      ),

      // 4. Testimonials
      getCachedData('testimonials:list', 3600, () =>
        prisma.testimonial.findMany({
          orderBy: [{ order: 'asc' }, { createdAt: 'desc' }]
        })
      ),

      // 5. Series
      getCachedData('series:list', 3600, () =>
        prisma.series.findMany({
          where: { published: true },
          select: {
            id: true,
            slug: true,
            title: true,
            description: true,
            image: true,
            level: true,
            tags: true,
            createdAt: true,
            episodes: {
              where: { published: true },
              select: { id: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        })
      )
    ]);

    const elapsed = Date.now() - startTime;
    console.log(`✅ [Cache Warmup] Public cache preloaded successfully in ${elapsed}ms`);
  } catch (err) {
    console.warn('⚠️ [Cache Warmup] Notice during cache warmup:', (err as Error).message);
  }
}
