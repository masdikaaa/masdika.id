import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/get-ip';
import { assertSufficientCommitmentBalance } from '@/lib/billing-commitment';
import {
  checkCustomerRustFSHealth,
  createRustFSServiceAccount,
  deleteCustomerBucketCompletely,
  deleteRustFSServiceAccount,
  ensureCustomerBucketExists,
  getCustomerRustFSConfig,
  getObjectStorageServiceUsageBytes,
} from '@/lib/customer-rustfs';
import { sendAdminNewOrderEmail, sendCustomerPaymentSuccessEmail } from '@/lib/email';
import { decryptDeterministic, encryptDeterministic } from '@/lib/encryption';
import { ensureObjectStoragePlansExist } from '@/lib/object-storage-plans-server';

function buildObjectStoragePlans(ratePerGbMonthly: number) {
  const sizes = [1, 5, 10, 25, 50, 100];
  return sizes.map((storageGb) => {
    const monthlyPrice = storageGb * ratePerGbMonthly;
    const hourlyRate = Math.max(1, Math.ceil(monthlyPrice / 730));
    return {
      id: `s3-${storageGb}gb`,
      name: `S3 ${storageGb >= 1000 ? `${storageGb / 1000} TB` : `${storageGb} GB`}`,
      storageGb,
      monthlyPrice,
      hourlyRate,
    };
  });
}

export async function GET() {
  const authResult = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const user = authResult.user!;

  try {
    await ensureObjectStoragePlansExist();
    const [cfg, dbPlans, services] = await Promise.all([
      getCustomerRustFSConfig(),
      prisma.plan.findMany({
        where: { service: 'OBJECT_STORAGE', isActive: true },
        orderBy: { price: 'asc' },
      }),
      prisma.objectStorageService.findMany({
        where: { userId: user.id, status: { not: 'TERMINATED' } },
        include: {
          buckets: { orderBy: { createdAt: 'asc' } },
          accessKeys: {
            orderBy: { createdAt: 'desc' },
            select: { id: true, name: true, accessKey: true, permission: true, isActive: true, createdAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const parsedPlans =
      dbPlans.length > 0
        ? dbPlans.map((p) => {
            let storageGb = 50;
            try {
              const parsed = JSON.parse(p.limits);
              storageGb = Number(parsed.storageGb) || parseInt(String(parsed.storage || '50'), 10) || 50;
            } catch {
              storageGb = 50;
            }
            return {
              id: `s3-${p.id}`,
              name: p.name,
              storageGb,
              monthlyPrice: p.price,
              hourlyRate: p.hourlyPrice || Math.max(1, Math.ceil(p.price / 730)),
            };
          })
        : buildObjectStoragePlans(cfg.ratePerGbMonthly);

    const enriched = await Promise.all(
      services.map(async (svc) => {
        const bucketNames = svc.buckets.map((b) => b.name);
        const usage =
          svc.status === 'SUSPENDED'
            ? { totalBytes: 0, totalObjects: 0 }
            : await getObjectStorageServiceUsageBytes(bucketNames).catch(() => ({ totalBytes: 0, totalObjects: 0 }));
        return {
          ...svc,
          keys: svc.accessKeys,
          usedBytes: usage.totalBytes,
        };
      })
    );

    return NextResponse.json({
      success: true,
      enabled: cfg.objectStorageEnabled && cfg.enabled,
      publicEndpoint: cfg.publicEndpoint,
      ratePerGbMonthly: cfg.ratePerGbMonthly,
      plans: parsedPlans,
      data: enriched,
    });
  } catch (error: any) {
    console.error('Error fetching object storage services:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const user = authResult.user!;

  const clientIp = getClientIp(req);
  const allowed = await checkRateLimit('OBJ_DEPLOY', `${user.id}:${clientIp}`, 5, 30);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
    }

    const cleanName = typeof body.name === 'string' ? body.name.trim() : '';
    if (!cleanName || !/^[a-zA-Z0-9_\-\.\s]{2,50}$/.test(cleanName)) {
      return NextResponse.json(
        { error: 'Service name must be 2-50 characters (letters, numbers, spaces, dots, hyphens, underscores).' },
        { status: 400 }
      );
    }

    const storageGb = parseInt(String(body.storageGb), 10);
    if (!Number.isInteger(storageGb) || storageGb < 1 || storageGb > 1000) {
      return NextResponse.json({ error: 'Storage capacity must be between 1 GB and 1,000 GB.' }, { status: 400 });
    }

    const billingMode = typeof body.billingMode === 'string' && body.billingMode.toUpperCase() === 'MONTHLY'
      ? 'MONTHLY'
      : 'PAYG';

    // Pre-Flight Capacity & Cluster Health Check BEFORE touching DB
    const health = await checkCustomerRustFSHealth();
    if (!health.available) {
      return NextResponse.json(
        { error: `Object Storage cluster unavailable: ${health.error || 'Pre-flight check failed'}` },
        { status: 503 }
      );
    }

    const cfg = await getCustomerRustFSConfig();
    if (!cfg.objectStorageEnabled) {
      return NextResponse.json({ error: 'Object Storage product is currently disabled.' }, { status: 403 });
    }

    const dbPlans = await prisma.plan.findMany({
      where: { service: 'OBJECT_STORAGE', isActive: true },
    });
    const matchedPlan = dbPlans.find((p) => {
      try {
        const parsed = JSON.parse(p.limits);
        return (Number(parsed.storageGb) || parseInt(String(parsed.storage || '0'), 10)) === storageGb;
      } catch {
        return false;
      }
    });

    const monthlyPrice = matchedPlan ? matchedPlan.price : storageGb * Math.max(cfg.ratePerGbMonthly, 2000);
    const hourlyRate = matchedPlan
      ? matchedPlan.hourlyPrice || Math.max(1, Math.ceil(matchedPlan.price / 730))
      : Math.max(1, Math.ceil(monthlyPrice / 730));
    const upfrontCharge = billingMode === 'MONTHLY' ? monthlyPrice : hourlyRate;
    const planName = matchedPlan ? matchedPlan.name : `S3 ${storageGb >= 1000 ? `${storageGb / 1000} TB` : `${storageGb} GB`}`;

    let serviceRecord: any;
    try {
      serviceRecord = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;

        const freshUser = await tx.user.findUnique({
          where: { id: user.id },
          select: { id: true, balance: true, isSuspended: true, suspendReason: true, email: true, name: true },
        });
        if (!freshUser) throw new Error('USER_NOT_FOUND');
        if (freshUser.isSuspended) {
          throw new Error(`ACCOUNT_SUSPENDED:${freshUser.suspendReason || 'Account is suspended'}`);
        }

        const commitmentCheck = await assertSufficientCommitmentBalance({
          userId: user.id,
          userBalance: freshUser.balance,
          newServiceMonthly: monthlyPrice,
          serviceName: `${planName} (${cleanName})`,
          tx,
        });

        const deduct = await tx.user.updateMany({
          where: { id: user.id, balance: { gte: commitmentCheck.requiredBalance } },
          data: { balance: { decrement: upfrontCharge } },
        });
        if (deduct.count === 0) {
          throw new Error(
            `Saldo akun tidak mencukupi untuk akumulasi komitmen layanan aktif (Dibutuhkan minimal saldo Rp ${commitmentCheck.requiredBalance.toLocaleString('id-ID')}).`
          );
        }

        const created = await tx.objectStorageService.create({
          data: {
            userId: user.id,
            name: cleanName,
            planName,
            cpuShares: 1.0,
            memoryMb: 1024,
            storageGb,
            billingMode,
            monthlyPrice,
            hourlyRate,
            accumulatedCost: upfrontCharge,
            lastBilledAt: new Date(),
            status: 'PROVISIONING',
            node: 'customer-rustfs',
          },
        });

        const invoiceNumber = `INV-S3-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await tx.invoice.create({
          data: {
            invoiceNumber,
            merchantOrderId: invoiceNumber,
            userId: user.id,
            amount: upfrontCharge,
            status: billingMode === 'MONTHLY' ? 'PAID' : 'PAYG_RUNNING',
            reference: billingMode === 'MONTHLY' ? cleanName : 'PAYG_RUNNING',
            paidAt: new Date(),
          },
        });

        return created;
      });
    } catch (txErr: any) {
      const msg = txErr?.message || 'Insufficient balance';
      if (msg === 'USER_NOT_FOUND') return NextResponse.json({ error: 'User not found' }, { status: 401 });
      if (msg.startsWith('ACCOUNT_SUSPENDED:')) {
        return NextResponse.json({ error: msg.slice('ACCOUNT_SUSPENDED:'.length) }, { status: 403 });
      }
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Physical Provisioning on Customer RustFS with strict Rollback Safeguard
    const defaultBucketName = `masdika-s3-u${user.id}-s${serviceRecord.id}`;
    const initialAccessKey = `mcs3_${crypto.randomBytes(8).toString('hex')}`;
    const initialSecretKey = crypto.randomBytes(24).toString('hex');
    let bucketCreated = false;
    let keyCreated = false;

    try {
      await ensureCustomerBucketExists(defaultBucketName, 'PRIVATE');
      bucketCreated = true;

      await createRustFSServiceAccount({
        accessKey: initialAccessKey,
        secretKey: initialSecretKey,
        name: `svc-${serviceRecord.id}-default`,
        bucketNames: [defaultBucketName],
        permission: 'READ_WRITE',
      });
      keyCreated = true;

      const updated = await prisma.$transaction(async (tx) => {
        await tx.objectStorageBucket.create({
          data: {
            serviceId: serviceRecord.id,
            userId: user.id,
            name: defaultBucketName,
            visibility: 'PRIVATE',
          },
        });
        await tx.objectStorageKey.create({
          data: {
            serviceId: serviceRecord.id,
            userId: user.id,
            name: 'Default S3 Key',
            accessKey: initialAccessKey,
            secretKey: encryptDeterministic(initialSecretKey),
            permission: 'READ_WRITE',
            isActive: true,
          },
        });
        return tx.objectStorageService.update({
          where: { id: serviceRecord.id },
          data: { status: 'RUNNING' },
          include: { buckets: true, accessKeys: true },
        });
      });

      // Notify customer & admin asynchronously
      (async () => {
        try {
          const u = await prisma.user.findUnique({ where: { id: user.id }, select: { email: true, name: true } });
          if (u?.email) {
            const plainEmail = decryptDeterministic(u.email) || u.email;
            const plainName = decryptDeterministic(u.name) || u.name || 'Customer';
            await sendCustomerPaymentSuccessEmail({
              toEmail: plainEmail,
              customerName: plainName,
              type: 'SUBSCRIPTION',
              planName,
              serviceName: `Object Storage: ${cleanName}`,
              amount: upfrontCharge,
              invoiceNumber: `S3-${serviceRecord.id}`,
            }).catch(() => {});
            await sendAdminNewOrderEmail({
              customerName: plainName,
              customerEmail: plainEmail,
              type: 'SUBSCRIPTION',
              planName,
              serviceName: `Object Storage: ${cleanName}`,
              amount: upfrontCharge,
              paymentMethod: billingMode,
              invoiceNumber: `S3-${serviceRecord.id}`,
            }).catch(() => {});
          }
        } catch {}
      })();

      return NextResponse.json(
        {
          success: true,
          service: updated,
          initialCredentials: {
            endpoint: cfg.publicEndpoint || cfg.endpoint,
            accessKey: initialAccessKey,
            secretKey: initialSecretKey,
            defaultBucket: defaultBucketName,
          },
        },
        { status: 201 }
      );
    } catch (provErr: any) {
      // Rollback everything cleanly — no orphan records or lost funds
      if (keyCreated) await deleteRustFSServiceAccount(initialAccessKey).catch(() => {});
      if (bucketCreated) await deleteCustomerBucketCompletely(defaultBucketName).catch(() => {});

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { balance: { increment: upfrontCharge } },
        });
        await tx.objectStorageService.delete({ where: { id: serviceRecord.id } }).catch(() => {});
      });

      return NextResponse.json(
        { error: `Object Storage provisioning failed and rolled back: ${provErr?.message || 'Storage error'}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Object Storage deploy error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to deploy Object Storage' }, { status: 500 });
  }
}
