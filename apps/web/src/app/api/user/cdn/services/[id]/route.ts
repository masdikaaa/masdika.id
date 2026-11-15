import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { ensureDefaultCdnBucket } from '@/lib/cdn-bucket';
import { deleteCustomerBucketCompletely, getCustomerRustFSConfig } from '@/lib/customer-rustfs';

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

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const userId = auth.userId!;
  const { id } = await context.params;
  const subId = parseInt(id, 10);
  if (isNaN(subId)) return NextResponse.json({ error: 'Invalid File CDN ID' }, { status: 400 });

  const sub = await prisma.subscription.findFirst({
    where: {
      id: subId,
      userId,
      status: { in: ['ACTIVE', 'SUSPENDED'] },
      plan: { service: 'CDN' },
    },
    include: {
      plan: true,
      cdnBuckets: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] },
      cdnApiKeys: {
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          permission: true,
          isActive: true,
          lastUsedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!sub) {
    return NextResponse.json({ error: 'File CDN service not found' }, { status: 404 });
  }

  let buckets = sub.cdnBuckets;
  if (buckets.length === 0) {
    const defaultBucket = await ensureDefaultCdnBucket(userId, sub.id);
    buckets = [defaultBucket];
  }

  const bucketNames = buckets.map((b) => b.name);
  const [mediaAgg, rustfsCfg] = await Promise.all([
    prisma.secureMedia.aggregate({
      where: {
        userId,
        isFolder: false,
        OR: [
          { subscriptionId: sub.id },
          { subscriptionId: null, bucket: { in: bucketNames } },
        ],
      },
      _sum: { size: true },
    }),
    getCustomerRustFSConfig(),
  ]);

  const limitGB = parsePlanStorageGb(sub.plan?.limits);
  const limitBytes = limitGB > 0 ? limitGB * 1024 * 1024 * 1024 : 0;
  const usedBytes = Number(mediaAgg._sum.size || 0);

  return NextResponse.json({
    success: true,
    publicEndpoint: rustfsCfg.publicEndpoint || '',
    service: {
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
      apiKeys: sub.cdnApiKeys,
      createdAt: sub.createdAt,
      expiresAt: sub.expiresAt,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const userId = auth.userId!;
  const { id } = await context.params;
  const subId = parseInt(id, 10);
  if (isNaN(subId)) return NextResponse.json({ error: 'Invalid File CDN ID' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const newName = String(body.name || '').trim().slice(0, 80);
  if (!newName) {
    return NextResponse.json({ error: 'Service name is required' }, { status: 400 });
  }

  const sub = await prisma.subscription.findFirst({
    where: { id: subId, userId, plan: { service: 'CDN' } },
  });
  if (!sub) return NextResponse.json({ error: 'File CDN service not found' }, { status: 404 });

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { name: newName },
  });

  return NextResponse.json({ success: true, name: newName });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const userId = auth.userId!;
  const { id } = await context.params;
  const subId = parseInt(id, 10);
  if (isNaN(subId)) return NextResponse.json({ error: 'Invalid File CDN ID' }, { status: 400 });

  const sub = await prisma.subscription.findFirst({
    where: { id: subId, userId, plan: { service: 'CDN' } },
    include: { cdnBuckets: true },
  });
  if (!sub) return NextResponse.json({ error: 'File CDN service not found' }, { status: 404 });

  // Clean up physical buckets on Customer RustFS
  for (const b of sub.cdnBuckets) {
    await deleteCustomerBucketCompletely(b.name).catch(() => {});
  }

  await prisma.$transaction([
    prisma.secureMedia.deleteMany({
      where: {
        userId,
        OR: [
          { subscriptionId: sub.id },
          { bucket: { in: sub.cdnBuckets.map((b) => b.name) } },
        ],
      },
    }),
    prisma.cdnBucket.deleteMany({ where: { subscriptionId: sub.id, userId } }),
    prisma.cdnApiKey.deleteMany({ where: { subscriptionId: sub.id, userId } }),
    prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: 'TERMINATED',
        terminationDate: new Date(),
        autoRenew: false,
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}
