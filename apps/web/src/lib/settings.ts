import { prisma } from './prisma';
import redis from './redis';

// In-memory lock to prevent Cache Breakdown (Hot Key) on the same Node instance
let pendingFetch: Promise<any> | null = null;

// L1 In-Memory RAM micro-cache (~0.001ms response time)
let l1SettingsCache: { data: any; expiresAt: number } | null = null;

export const getPublicSettings = async () => {
  const now = Date.now();
  if (l1SettingsCache && l1SettingsCache.expiresAt > now) {
    return l1SettingsCache.data;
  }

  const safeKeys = [
    'social_github', 'social_linkedin', 'social_twitter', 'social_instagram', 
    'social_youtube', 'site_name', 'site_title', 'site_description', 
    'contact_email', 'contact_location', 'contact_phone',
    'hero_title', 'hero_description', 'hero_typing_text', 'cv_url'
  ];
  
  try {
    // 1. Try to get from Redis first (with isolated try-catch to handle Cache Crash gracefully)
    if (redis) {
      try {
        const cached = await redis.get('public_settings');
        if (cached) {
          const parsed = JSON.parse(cached);
          l1SettingsCache = { data: parsed, expiresAt: now + 60000 };
          return parsed;
        }
      } catch (redisError) {
        console.warn("[Cache Error] Redis read failed, falling back to DB:", (redisError as Error).message);
      }
    }

    // 2. Cache Miss - In-memory Promise deduplication (Prevents Cache Breakdown)
    if (!pendingFetch) {
      pendingFetch = (async () => {
        try {
          // Fetch from DB
          const settingsArray = await prisma.setting.findMany({
            where: { key: { in: safeKeys } }
          });
          
          const settings = settingsArray.reduce((acc: any, curr) => {
            acc[curr.key] = curr.value;
            return acc;
          }, {});

          // 3. Save to Redis with Jitter (Prevents Thunder Herd)
          if (redis) {
            try {
              // Base TTL: 1 hour (3600s) + Jitter: 0 to 10 minutes (0-600s)
              const ttl = 3600 + Math.floor(Math.random() * 600);
              await redis.setex('public_settings', ttl, JSON.stringify(settings));
            } catch (redisError) {
              console.warn("[Cache Error] Redis write failed:", (redisError as Error).message);
            }
          }

          l1SettingsCache = { data: settings, expiresAt: Date.now() + 60000 };
          return settings;
        } finally {
          // Always clear the lock when done so future requests can fetch fresh data
          pendingFetch = null;
        }
      })();
    }

    // Await the deduplicated promise
    return await pendingFetch;

  } catch (error) {
    console.warn("[DB Error] Database unavailable. Proceeding with default settings.", error);
    return {};
  }
};
