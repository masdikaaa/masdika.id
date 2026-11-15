import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { ensureDefaultCdnBucket } from '@/lib/cdn-bucket';
import { ensureCdnPlansExist } from '@/lib/cdn-plans-server';
import { getObjectStorageClusterCapacity } from '@/lib/customer-rustfs';

function parsePlanStorageGb(limitsStr: string | null | undefined): number {
  if (!limitsStr) return 0;
  try {
    const limits = JSON.parse(limitsStr);
    if (limits.storage === 'unlimited' || limits.storageGB === 'unlimited') return 0;
    if (limits.storageGB !== undefined) return Number(limits.storageGB) || 0;
    if (limits.storage) {
      const match = String(limits.storage).trim().match(/^(\d+)\s*(GB|MB|KB|TB)$/i);
      if (match) {
        const val = parseInt(match[1], 10);
        const unit = match[2].toUpperCase();
        if (unit === 'KB') return val / (1024 * 1024);
        if (unit === 'MB') return val / 1024;
        if (unit === 'GB') return val;
        if (unit === 'TB') return val * 1024;
      }
    }
  } catch {
    // ignore malformed limits
  }
  return 0;
}

export async function GET() {
  const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const userId = auth.userId!;

  await ensureCdnPlansExist();

  const [subs, cdnSetting, cdnPlans, capacity] = await Promise.all([
    prisma.subscription.findMany({
      where: {
        userId,
        status: { in: ['ACTIVE', 'SUSPENDED'] },
        plan: { service: 'CDN' },
      },
      include: {
        plan: true,
        cdnBuckets: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] },
        cdnApiKeys: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.setting.findUnique({ where: { key: 'cdn_enabled' } }),
    prisma.plan.findMany({
      where: { service: 'CDN', isActive: true },
      orderBy: { price: 'asc' },
    }),
    getObjectStorageClusterCapacity(),
  ]);

  const enriched = await Promise.all(
    subs.map(async (sub, index) => {
      // Ensure each subscription has its own unique bucket
      let buckets = sub.cdnBuckets;
      if (buckets.length === 0) {
        const defaultBucket = await ensureDefaultCdnBucket(userId, sub.id);
        buckets = [defaultBucket];
      }

      const bucketNames = buckets.map((b) => b.name);
      const isOldest = index === subs.length - 1;

      const mediaAgg = await prisma.secureMedia.aggregate({
        where: {
          userId,
          isFolder: false,
          OR: [
            { subscriptionId: sub.id },
            ...(isOldest
              ? [{ subscriptionId: null, bucket: { in: bucketNames } }, { subscriptionId: null, bucket: null }]
              : [{ subscriptionId: null, bucket: { in: bucketNames } }]),
          ],
        },
        _sum: { size: true },
      });

      const limitGB = parsePlanStorageGb(sub.plan?.limits);
      const limitBytes = limitGB > 0 ? limitGB * 1024 * 1024 * 1024 : 0;
      const usedBytes = Number(mediaAgg._sum.size || 0);

      return {
        id: sub.id,
        name: sub.name || sub.plan?.name || `File CDN #${sub.id}`,
        status: sub.status,
        planId: sub.planId,
        planName: sub.plan?.name || 'File CDN',
        hourlyRate: sub.lockedHourlyPrice || sub.plan?.hourlyPrice || 0,
        monthlyPrice: sub.lockedPrice || sub.plan?.price || 0,
        usedBytes,
        limitBytes,
        limitGB,
        buckets,
        apiKeysCount: sub.cdnApiKeys.length,
        createdAt: sub.createdAt,
        expiresAt: sub.expiresAt,
      };
    })
  );

  return NextResponse.json({
    success: true,
    enabled: cdnSetting ? cdnSetting.value !== 'false' : true,
    capacity,
    data: enriched,
    plans: cdnPlans.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      hourlyPrice: p.hourlyPrice,
      storageGb: parsePlanStorageGb(p.limits),
      limits: p.limits,
      isPopular: p.isPopular,
    })),
  });
}
