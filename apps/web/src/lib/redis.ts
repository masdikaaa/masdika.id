import Redis, { RedisOptions } from 'ioredis';

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

// Ultra-fast, low-latency Redis client configuration
const redisOptions: RedisOptions = {
  maxRetriesPerRequest: 2,
  enableAutoPipelining: true,  // Automatically pipeline concurrent requests in the same event loop tick
  enableReadyCheck: true,
  family: 4,                   // Enforce IPv4 to eliminate 200-300ms IPv6 DNS timeouts in Docker
  connectTimeout: 5000,        // Fast failover if Redis is temporarily unreachable
  commandTimeout: 3000,        // Never allow hanging queries longer than 3s
  keepAlive: 10000,            // Keep TCP connection hot and alive
  noDelay: true,               // TCP_NODELAY: disable Nagle's algorithm for instant sub-millisecond dispatch
  lazyConnect: false,
  retryStrategy(times: number) {
    if (times >= 3) {
      return null;
    }
    return Math.min(times * 50, 1000);
  }
};

if (process.env.REDIS_PASSWORD) {
  redisOptions.password = process.env.REDIS_PASSWORD;
}

export const redis = useRedis ? (globalForRedis.redis ?? new Redis(redisUrl, redisOptions)) : null;

// Prevent app crashes if Redis connection fails
if (redis) {
  redis.on('connect', () => {
    console.log('⚡ [Redis] High-performance connection established');
  });
  
  redis.on('error', (err) => {
    console.warn('⚠️ [Redis] Connection warning (graceful fallback active):', err.message);
  });
}

// Avoid creating multiple connections in development due to hot-reloading
if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

export default redis;
