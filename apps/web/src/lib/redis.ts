import Redis from 'ioredis';

const useRedis = process.env.USE_REDIS === 'true';

// Create a singleton instance to avoid connection leaks in development
const globalForRedis = globalThis as unknown as {
  redis: Redis | null;
};

// Initialize Redis with URL from env, default to local if not provided
let redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Fix issue where empty REDIS_PASSWORD in docker-compose results in "redis://:@redis:6379"
if (redisUrl.includes('://:@')) {
  redisUrl = redisUrl.replace('://:@', '://');
}

const redisOptions: any = {
  maxRetriesPerRequest: 3,
  retryStrategy(times: number) {
    if (times >= 3) {
      return null;
    }
    return Math.min(times * 50, 2000);
  }
};

if (process.env.REDIS_PASSWORD) {
  redisOptions.password = process.env.REDIS_PASSWORD;
}

export const redis = useRedis ? (globalForRedis.redis ?? new Redis(redisUrl, redisOptions)) : null;

// Prevent app crashes if Redis connection fails
if (redis) {
  redis.on('connect', () => {
    console.log('✅ Redis connected successfully');
  });
  
  redis.on('error', (err) => {
    console.warn('❌ Redis connection warning:', err.message);
  });
}

// Avoid creating multiple connections in development due to hot-reloading
if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

export default redis;
