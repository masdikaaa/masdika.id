import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { assertSufficientCommitmentBalance } from '@/lib/billing-commitment';
import {
  getCustomerRustFSConfig,
  getCustomerBucketUsage,
  getObjectStorageClusterCapacity,
  setCustomerBucketQuota,
  terminateObjectStorageInfrastructure,
} from '@/lib/customer-rustfs';
import { sendTerminationEmail } from '@/lib/email';
import { decryptDeterministic } from '@/lib/encryption';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const user = authResult.user!;
  const { id } = await context.params;
  const serviceId = parseInt(id, 10);
  if (isNaN(serviceId)) {
    return NextResponse.json({ error: 'Invalid service ID' }, { status: 400 });
  }

  const service = await prisma.objectStorageService.findFirst({
    where: user.role === 'ADMIN' ? { id: serviceId } : { id: serviceId, userId: user.id },
    include: {
      buckets: { orderBy: { createdAt: 'asc' } },
      accessKeys: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, accessKey: true, secretKey: true, permission: true, isActive: true, createdAt: true },
      },
    },
  });

  if (!service || service.status === 'TERMINATED') {
    return NextResponse.json({ error: 'Object Storage service not found' }, { status: 404 });
  }

  const cfg = await getCustomerRustFSConfig();
  const bucketsWithUsage = await Promise.all(
    service.buckets.map(async (b: any) => {
      const usage =
        service.status === 'SUSPENDED'
          ? { bytes: 0, count: 0 }
          : await getCustomerBucketUsage(b.name).catch(() => ({ bytes: 0, count: 0 }));
      return { ...b, objectCount: usage.count, totalBytes: usage.bytes };
    })
  );

  const usedBytes = bucketsWithUsage.reduce((acc: number, b: any) => acc + b.totalBytes, 0);

  const decryptedKeys = service.accessKeys.map((k: any) => ({
    id: k.id,
    name: k.name,
    accessKey: k.accessKey,
    secretKey: k.secretKey ? decryptDeterministic(k.secretKey) || k.secretKey : null,
    permission: k.permission,
    isActive: k.isActive,
    createdAt: k.createdAt,
  }));

  return NextResponse.json({
    success: true,
    publicEndpoint: cfg.publicEndpoint,
    ratePerGbMonthly: cfg.ratePerGbMonthly,
    service: {
      ...service,
      keys: decryptedKeys,
      buckets: bucketsWithUsage,
      usedBytes,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const user = authResult.user!;
  const { id } = await context.params;
  const serviceId = parseInt(id, 10);
  if (isNaN(serviceId)) {
    return NextResponse.json({ error: 'Invalid service ID' }, { status: 400 });
  }

  const service = await prisma.objectStorageService.findFirst({
    where: { id: serviceId, userId: user.id },
    include: {
      buckets: { select: { name: true } },
      _count: { select: { buckets: true, accessKeys: true } },
    },
  });
  if (!service || service.status === 'TERMINATED') {
    return NextResponse.json({ error: 'Object Storage service not found' }, { status: 404 });
  }
  if (service.status === 'SUSPENDED') {
    return NextResponse.json({ error: 'Object Storage service is suspended. Top up balance to reactivate before modifying.' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const updates: any = {};

  if (typeof body.name === 'string' && body.name.trim()) {
    const cleanName = body.name.trim();
    if (!/^[a-zA-Z0-9_\-\.\s]{2,50}$/.test(cleanName)) {
      return NextResponse.json({ error: 'Invalid service name format' }, { status: 400 });
    }
    updates.name = cleanName;
  }

  if (body.storageGb !== undefined) {
    const nextGb = parseInt(String(body.storageGb), 10);
    if (!Number.isInteger(nextGb) || nextGb < 1 || nextGb > 1000) {
      return NextResponse.json({ error: 'Storage capacity must be between 1 GB and 1,000 GB' }, { status: 400 });
    }

    if (nextGb > service.storageGb) {
      const capacity = await getObjectStorageClusterCapacity();
      const neededGb = nextGb - service.storageGb;
      if (!capacity.available || capacity.freeGb < neededGb) {
        return NextResponse.json(
          { error: capacity.reason || `Cluster capacity full: only ${capacity.freeGb} GB available for upgrade.` },
          { status: 503 }
        );
      }
    }

    // Prevent scaling down below currently used bytes
    const bucketNames = service.buckets.map((b) => b.name);
    if (bucketNames.length > 0 && nextGb < service.storageGb) {
      const usageResults = await Promise.all(bucketNames.map((n) => getCustomerBucketUsage(n).catch(() => ({ bytes: 0, count: 0 }))));
      const totalUsed = usageResults.reduce((acc, u) => acc + u.bytes, 0);
      const nextQuotaBytes = nextGb * 1024 * 1024 * 1024;
      if (totalUsed > nextQuotaBytes) {
        return NextResponse.json(
          { error: `Cannot scale down to ${nextGb} GB while current usage exceeds the target quota. Delete objects first.` },
          { status: 400 }
        );
      }
    }

    const cfg = await getCustomerRustFSConfig();
    const dbPlans = await prisma.plan.findMany({
      where: { service: 'OBJECT_STORAGE', isActive: true },
    });
    const matchedPlan = dbPlans.find((p) => {
      try {
        const parsed = JSON.parse(p.limits);
        return (Number(parsed.storageGb) || parseInt(String(parsed.storage || '0'), 10)) === nextGb;
      } catch {
        return false;
      }
    });

    if (dbPlans.length > 0 && !matchedPlan) {
      return NextResponse.json({ error: 'Selected storage capacity does not match an active official plan.' }, { status: 400 });
    }

    if (matchedPlan) {
      try {
        const parsedLimits = JSON.parse(matchedPlan.limits);
        const maxBuckets = Number(parsedLimits.maxBuckets);
        const maxKeys = Number(parsedLimits.maxKeys);
        if (Number.isFinite(maxBuckets) && maxBuckets > 0 && service._count.buckets > maxBuckets) {
          return NextResponse.json(
            { error: `Cannot switch to ${matchedPlan.name}: you currently have ${service._count.buckets} buckets (limit: ${maxBuckets}).` },
            { status: 400 }
          );
        }
        if (Number.isFinite(maxKeys) && maxKeys > 0 && service._count.accessKeys > maxKeys) {
          return NextResponse.json(
            { error: `Cannot switch to ${matchedPlan.name}: you currently have ${service._count.accessKeys} S3 keys (limit: ${maxKeys}).` },
            { status: 400 }
          );
        }
      } catch {
        // ignore malformed plan limits
      }
    }

    const nextMonthly = matchedPlan ? matchedPlan.price : nextGb * Math.max(cfg.ratePerGbMonthly, 2000);
    const nextHourly = matchedPlan
      ? matchedPlan.hourlyPrice || Math.max(1, Math.ceil(matchedPlan.price / 730))
      : Math.max(1, Math.ceil(nextMonthly / 730));

    if (nextMonthly > service.monthlyPrice) {
      const freshUser = await prisma.user.findUnique({ where: { id: user.id }, select: { balance: true } });
      try {
        await assertSufficientCommitmentBalance({
          userId: user.id,
          userBalance: freshUser?.balance || 0,
          newServiceMonthly: nextMonthly - service.monthlyPrice,
          serviceName: `Scale ${service.name} to ${nextGb} GB`,
        });
      } catch (balErr: any) {
        return NextResponse.json(
          { error: balErr?.message || 'Insufficient account balance for upgrade.' },
          { status: 400 }
        );
      }
    }

    updates.storageGb = nextGb;
    updates.planName = matchedPlan ? matchedPlan.name : `S3 ${nextGb >= 1000 ? `${nextGb / 1000} TB` : `${nextGb} GB`}`;
    updates.monthlyPrice = nextMonthly;
    updates.hourlyRate = nextHourly;
  }

  const updated = await prisma.objectStorageService.update({
    where: { id: service.id },
    data: updates,
  });

  if (updates.storageGb !== undefined && service.buckets.length > 0) {
    const quotaBytes = updates.storageGb * 1024 * 1024 * 1024;
    await Promise.all(service.buckets.map((b) => setCustomerBucketQuota(b.name, quotaBytes).catch(() => {})));
  }

  return NextResponse.json({ success: true, service: updated });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const user = authResult.user!;
  const { id } = await context.params;
  const serviceId = parseInt(id, 10);
  if (isNaN(serviceId)) {
    return NextResponse.json({ error: 'Invalid service ID' }, { status: 400 });
  }

  const service = await prisma.objectStorageService.findFirst({
    where: user.role === 'ADMIN' ? { id: serviceId } : { id: serviceId, userId: user.id },
    include: { user: { select: { email: true, name: true } } },
  });
  if (!service) {
    return NextResponse.json({ error: 'Object Storage service not found' }, { status: 404 });
  }

  await terminateObjectStorageInfrastructure(service.id).catch((e) =>
    console.warn('[ObjectStorage] Termination cleanup warning:', e)
  );

  await prisma.$transaction(async (tx) => {
    await tx.objectStorageKey.deleteMany({ where: { serviceId: service.id } });
    await tx.objectStorageBucket.deleteMany({ where: { serviceId: service.id } });
    await tx.objectStorageService.update({
      where: { id: service.id },
      data: {
        status: 'TERMINATED',
        terminationDate: new Date(),
      },
    });
    const { settleServicePaygInvoices } = await import('@/lib/payg-invoice');
    await settleServicePaygInvoices(tx, {
      userId: service.userId,
      serviceIdField: 'objectStorageServiceId',
      serviceId: service.id,
      serviceName: service.name,
      type: 'OBJECT_STORAGE',
    });
  });

  if (service.user?.email) {
    const plainEmail = decryptDeterministic(service.user.email) || service.user.email;
    const plainName = decryptDeterministic(service.user.name) || service.user.name || 'Customer';
    sendTerminationEmail(plainEmail, plainName, service.planName, service.name).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
