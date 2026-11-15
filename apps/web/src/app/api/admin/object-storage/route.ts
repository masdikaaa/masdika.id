import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { decryptDeterministic } from '@/lib/encryption';
import { getCustomerRustFSConfig, getObjectStorageServiceUsageBytes } from '@/lib/customer-rustfs';

export async function GET() {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const [cfg, services] = await Promise.all([
      getCustomerRustFSConfig(),
      prisma.objectStorageService.findMany({
        where: { status: { not: 'TERMINATED' } },
        include: {
          user: { select: { id: true, name: true, email: true, balance: true } },
          buckets: { select: { id: true, name: true, visibility: true } },
          accessKeys: { select: { id: true, name: true, accessKey: true, permission: true, isActive: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const enriched = await Promise.all(
      services.map(async (svc) => {
        const usage =
          svc.status === 'SUSPENDED'
            ? { totalBytes: 0, totalObjects: 0 }
            : await getObjectStorageServiceUsageBytes(svc.buckets.map((b) => b.name)).catch(() => ({ totalBytes: 0, totalObjects: 0 }));

        return {
          ...svc,
          keys: svc.accessKeys,
          usedBytes: usage.totalBytes,
          user: {
            id: svc.user.id,
            name: decryptDeterministic(svc.user.name) || 'Customer',
            email: decryptDeterministic(svc.user.email) || '',
            balance: svc.user.balance,
          },
        };
      })
    );

    const totalQuotaGb = enriched.reduce((acc, s) => acc + s.storageGb, 0);
    const totalUsedBytes = enriched.reduce((acc, s) => acc + s.usedBytes, 0);
    const totalHourlyRevenue = enriched
      .filter((s) => s.status === 'RUNNING')
      .reduce((acc, s) => acc + s.hourlyRate, 0);

    return NextResponse.json({
      success: true,
      publicEndpoint: cfg.publicEndpoint,
      endpoint: cfg.endpoint,
      stats: {
        totalServices: enriched.length,
        runningCount: enriched.filter((s) => s.status === 'RUNNING').length,
        suspendedCount: enriched.filter((s) => s.status === 'SUSPENDED').length,
        totalQuotaGb,
        totalUsedBytes,
        totalHourlyRevenue,
      },
      services: enriched,
    });
  } catch (error: any) {
    console.error('Admin Object Storage monitor error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
