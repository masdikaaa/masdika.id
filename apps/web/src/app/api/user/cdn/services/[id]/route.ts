import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { ensureDefaultCdnBucket } from '@/lib/cdn-bucket';
import { ensureCdnPlansExist } from '@/lib/cdn-plans-server';
import { assertSufficientCommitmentBalance } from '@/lib/billing-commitment';
import {
  deleteCustomerBucketCompletely,
  getCustomerRustFSConfig,
  getObjectStorageClusterCapacity,
  setCustomerBucketQuota,
} from '@/lib/customer-rustfs';

function parsePlanStorageGb(limitsStr: string | null | undefined): number {
  if (!limitsStr) return 0;
  try {
    const limits = JSON.parse(limitsStr);
    if (limits.storage === 'unlimited' || limits.storageGb === 'unlimited' || limits.storageGB === 'unlimited') return 0;
    if (limits.storageGb !== undefined) return Number(limits.storageGb) || 0;
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
  const sub = await prisma.subscription.findFirst({
    where: { id: subId, userId, status: { in: ['ACTIVE', 'SUSPENDED'] }, plan: { service: 'CDN' } },
    include: {
      plan: true,
      cdnBuckets: true,
    },
  });
  if (!sub) return NextResponse.json({ error: 'File CDN service not found' }, { status: 404 });

  const updateData: any = {};

  if (typeof body.name === 'string') {
    const newName = body.name.trim().slice(0, 80);
    if (!newName) {
      return NextResponse.json({ error: 'Service name cannot be empty' }, { status: 400 });
    }
    updateData.name = newName;
  }

  // In-place Plan Upgrade / Scale without losing any files, folders, or API keys
  if (body.planId !== undefined) {
    if (sub.status === 'SUSPENDED') {
      return NextResponse.json(
        { error: 'File CDN instance is suspended. Top up your balance to reactivate before upgrading.' },
        { status: 403 }
      );
    }

    const nextPlanId = parseInt(String(body.planId), 10);
    if (isNaN(nextPlanId)) {
      return NextResponse.json({ error: 'Invalid target plan ID' }, { status: 400 });
    }

    await ensureCdnPlansExist();
    const targetPlan = await prisma.plan.findFirst({
      where: { id: nextPlanId, service: 'CDN', isActive: true },
    });
    if (!targetPlan) {
      return NextResponse.json({ error: 'Target File CDN plan not found or inactive' }, { status: 404 });
    }

    const currentGb = parsePlanStorageGb(sub.plan?.limits);
    const nextGb = parsePlanStorageGb(targetPlan.limits);

    if (nextGb > currentGb && currentGb > 0) {
      const capacity = await getObjectStorageClusterCapacity();
      const neededGb = nextGb - currentGb;
      if (!capacity.available || capacity.freeGb < neededGb) {
        return NextResponse.json(
          { error: capacity.reason || `Cluster capacity full: only ${capacity.freeGb} GB available for upgrade.` },
          { status: 503 }
        );
      }
    }

    const bucketNames = sub.cdnBuckets.map((b) => b.name);
    if (nextGb > 0 && nextGb < currentGb) {
      const mediaAgg = await prisma.secureMedia.aggregate({
        where: {
          userId,
          isFolder: false,
          OR: [
            { subscriptionId: sub.id },
            ...(bucketNames.length > 0 ? [{ subscriptionId: null, bucket: { in: bucketNames } }] : []),
          ],
        },
        _sum: { size: true },
      });
      const usedBytes = Number(mediaAgg._sum.size || 0);
      const nextQuotaBytes = nextGb * 1024 * 1024 * 1024;
      if (usedBytes > nextQuotaBytes) {
        return NextResponse.json(
          { error: `Cannot downgrade to ${targetPlan.name} (${nextGb} GB): current usage exceeds target quota. Delete files first.` },
          { status: 400 }
        );
      }
    }

    const currentMonthly = sub.lockedPrice || sub.plan?.price || 0;
    const nextMonthly = targetPlan.price;
    const nextHourly = targetPlan.hourlyPrice || Math.max(1, Math.ceil(nextMonthly / 730));

    if (nextMonthly > currentMonthly) {
      const freshUser = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });
      try {
        await assertSufficientCommitmentBalance({
          userId,
          userBalance: freshUser?.balance || 0,
          newServiceMonthly: nextMonthly - currentMonthly,
          serviceName: `Upgrade ${sub.name || 'File CDN'} to ${targetPlan.name}`,
        });
      } catch (balErr: any) {
        return NextResponse.json(
          { error: balErr?.message || 'Insufficient account balance for upgrade.' },
          { status: 400 }
        );
      }
    }

    updateData.planId = targetPlan.id;
    updateData.lockedPrice = nextMonthly;
    updateData.lockedHourlyPrice = nextHourly;

    if (nextGb > 0 && bucketNames.length > 0) {
      const quotaBytes = nextGb * 1024 * 1024 * 1024;
      await Promise.all(bucketNames.map((b) => setCustomerBucketQuota(b, quotaBytes).catch(() => {})));
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: updateData,
    include: { plan: true },
  });

  return NextResponse.json({
    success: true,
    name: updated.name,
    planId: updated.planId,
    planName: updated.plan?.name,
  });
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
    include: {
      plan: true,
      user: { select: { email: true, name: true } },
    },
  });
  if (!sub) return NextResponse.json({ error: 'File CDN service not found' }, { status: 404 });

  const { cleanupSubscriptionCdnResources } = await import('@/lib/cdn-bucket');
  await cleanupSubscriptionCdnResources(sub.id, userId);

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: 'TERMINATED',
      terminationDate: new Date(),
      autoRenew: false,
    },
  });

  const { settleServicePaygInvoices } = await import('@/lib/payg-invoice');
  await settleServicePaygInvoices(prisma, {
    userId,
    subscriptionId: sub.id,
  });

  if (sub.user?.email) {
    const { sendTerminationEmail } = await import('@/lib/email');
    sendTerminationEmail(
      sub.user.email,
      sub.user.name || 'Customer',
      sub.name || sub.plan?.name || 'File CDN',
      'File CDN',
      'Terminated by user from dashboard'
    ).catch((err) => console.error('[CDN_TERMINATION_EMAIL_ERROR]', err));
  }

  return NextResponse.json({ success: true });
}
