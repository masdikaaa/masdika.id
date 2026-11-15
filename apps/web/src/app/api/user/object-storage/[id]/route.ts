import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { assertSufficientCommitmentBalance } from '@/lib/billing-commitment';
import {
  getCustomerRustFSConfig,
  getCustomerBucketUsage,
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
        select: { id: true, name: true, accessKey: true, permission: true, isActive: true, createdAt: true },
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

  return NextResponse.json({
    success: true,
    publicEndpoint: cfg.publicEndpoint,
    ratePerGbMonthly: cfg.ratePerGbMonthly,
    service: {
      ...service,
      keys: service.accessKeys,
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
  });
  if (!service || service.status === 'TERMINATED') {
    return NextResponse.json({ error: 'Object Storage service not found' }, { status: 404 });
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
    if (!Number.isInteger(nextGb) || nextGb < 10 || nextGb > 10000) {
      return NextResponse.json({ error: 'Storage capacity must be between 10 GB and 10,000 GB' }, { status: 400 });
    }
    const cfg = await getCustomerRustFSConfig();
    const nextMonthly = nextGb * cfg.ratePerGbMonthly;
    const nextHourly = Math.max(1, Math.ceil(nextMonthly / 730));

    if (nextMonthly > service.monthlyPrice) {
      const freshUser = await prisma.user.findUnique({ where: { id: user.id }, select: { balance: true } });
      await assertSufficientCommitmentBalance({
        userId: user.id,
        userBalance: freshUser?.balance || 0,
        newServiceMonthly: nextMonthly - service.monthlyPrice,
        serviceName: `Scale ${service.name} to ${nextGb} GB`,
      });
    }

    updates.storageGb = nextGb;
    updates.planName = `S3 ${nextGb >= 1000 ? `${nextGb / 1000} TB` : `${nextGb} GB`}`;
    updates.monthlyPrice = nextMonthly;
    updates.hourlyRate = nextHourly;
  }

  const updated = await prisma.objectStorageService.update({
    where: { id: service.id },
    data: updates,
  });

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
  });

  if (service.user?.email) {
    const plainEmail = decryptDeterministic(service.user.email) || service.user.email;
    const plainName = decryptDeterministic(service.user.name) || service.user.name || 'Customer';
    sendTerminationEmail(plainEmail, plainName, service.planName, service.name).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
