import { NextResponse } from 'next/server';
import { getClientIp } from '@/lib/get-ip';
import { prisma } from '@/lib/prisma';
import redis from '@/lib/redis';
import crypto from 'crypto';

// In-memory set for ultra-fast deduplication (0ms latency)
const localTrackedIps = new Set<string>();

// Prune memory set every hour
if (typeof setInterval !== 'undefined') {
  const pruneTimer = setInterval(() => {
    if (localTrackedIps.size > 10000) {
      localTrackedIps.clear();
    }
  }, 3600000);
  if (pruneTimer.unref) pruneTimer.unref();
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex');

    // 1. Ultra-fast In-Memory check (<0.01ms)
    if (localTrackedIps.has(ipHash)) {
      return NextResponse.json({ success: true });
    }

    // 2. Check Redis Set (~0.5ms)
    if (redis) {
      try {
        const isTracked = await redis.sismember('tracked_visitors_today', ipHash);
        if (isTracked) {
          localTrackedIps.add(ipHash);
          return NextResponse.json({ success: true });
        }
        await redis.sadd('tracked_visitors_today', ipHash);
        await redis.expire('tracked_visitors_today', 86400); // 24h TTL
      } catch (redisErr) {
        // Fallback gracefully
      }
    }

    localTrackedIps.add(ipHash);

    // 3. Persist to PostgreSQL in background without blocking API response
    prisma.pageView.upsert({
      where: { ipHash },
      create: { ipHash },
      update: {},
    }).catch((e: any) => {
      if (e.code !== 'P2002') {
        console.warn('Background pageView error:', e.message);
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
