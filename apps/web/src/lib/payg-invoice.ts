import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

function generateInvoiceNumber(prefix: string): string {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

export type PaygServiceInvoiceType =
  | 'MANAGED_APP'
  | 'MANAGED_DATABASE'
  | 'OBJECT_STORAGE'
  | 'APP_PLATFORM';

export type ServiceIdField =
  | 'appServiceId'
  | 'databaseServiceId'
  | 'objectStorageServiceId'
  | 'appPlatformServiceId';

function normalizeInvoiceNumberToPayg(invoiceNumber: string): string {
  if (invoiceNumber.startsWith('INV-S3-')) {
    return `INV-PAYG-${invoiceNumber.slice('INV-S3-'.length)}`;
  }
  return invoiceNumber;
}

function matchesServiceInvoice(
  inv: { invoiceNumber?: string; type?: string | null; details?: string | null },
  serviceIdField: ServiceIdField,
  serviceId: number,
  serviceName?: string
): boolean {
  if (!inv.details) return false;
  try {
    const parsed = JSON.parse(inv.details);
    if (Number(parsed?.[serviceIdField]) === serviceId) return true;
    if (serviceIdField === 'objectStorageServiceId') {
      if (Number(parsed?.objectStorageId) === serviceId || Number(parsed?.serviceId) === serviceId) {
        return true;
      }
      if (
        serviceName &&
        (inv.invoiceNumber?.startsWith('INV-S3-') || inv.type === 'OBJECT_STORAGE') &&
        typeof parsed?.name === 'string' &&
        parsed.name === serviceName &&
        parsed?.objectStorageServiceId === undefined
      ) {
        return true;
      }
    }
    if (serviceIdField === 'appServiceId' && Number(parsed?.appId) === serviceId) return true;
    if (serviceIdField === 'databaseServiceId' && Number(parsed?.dbId) === serviceId) return true;
    return false;
  } catch {
    return inv.details.includes(`"${serviceIdField}":${serviceId}`);
  }
}

/**
 * Creates a consistent initial invoice when a service is ordered.
 * Uses INV-PAYG-... naming and PAYG_RUNNING reference for PAYG services,
 * matching Cloud VPS and Reserved IP invoice conventions.
 */
export async function createServiceOrderInvoice(
  tx: any,
  params: {
    userId: number;
    serviceIdField: ServiceIdField;
    serviceId: number;
    type: PaygServiceInvoiceType;
    amount: number;
    billingMode: string;
    serviceName: string;
    extraDetails?: Record<string, any>;
  }
): Promise<void> {
  if (!tx?.invoice?.create) return;

  const isMonthly = params.billingMode.toUpperCase() === 'MONTHLY';
  const prefix = isMonthly ? 'INV-ORD' : 'INV-PAYG';
  const invoiceNumber = generateInvoiceNumber(prefix);

  await tx.invoice.create({
    data: {
      invoiceNumber,
      merchantOrderId: invoiceNumber,
      userId: params.userId,
      amount: Math.max(0, Math.round(params.amount)),
      status: 'PAID',
      paymentMethod: 'Account Balance',
      type: params.type,
      reference: isMonthly ? 'MONTHLY_PAID' : 'PAYG_RUNNING',
      paidAt: new Date(),
      details: JSON.stringify({
        [params.serviceIdField]: params.serviceId,
        name: params.serviceName,
        ...(params.extraDetails || {}),
      }),
    },
  });
}

/**
 * Increments the active PAYG_RUNNING invoice for a service during hourly billing,
 * or creates a safety-net INV-PAYG-... invoice if none exists yet.
 * Also normalizes any legacy INV-S3-... / status=PAYG_RUNNING invoices.
 */
export async function upsertPaygRunningInvoice(
  tx: any,
  params: {
    userId: number;
    serviceIdField: ServiceIdField;
    serviceId: number;
    type: PaygServiceInvoiceType;
    amountToAdd: number;
    serviceName: string;
    fallbackAmount?: number;
    extraDetails?: Record<string, any>;
  }
): Promise<void> {
  if (!tx?.invoice?.findMany) return;

  const candidates = await tx.invoice.findMany({
    where: {
      userId: params.userId,
      OR: [
        {
          type: params.type,
          OR: [
            { reference: 'PAYG_RUNNING' },
            { status: 'PAYG_RUNNING' },
            { invoiceNumber: { startsWith: 'INV-S3-' } },
          ],
        },
        ...(params.type === 'OBJECT_STORAGE' ? [{ invoiceNumber: { startsWith: 'INV-S3-' } }] : []),
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  const target = candidates.find((inv: any) =>
    matchesServiceInvoice(inv, params.serviceIdField, params.serviceId, params.serviceName)
  );

  if (target) {
    const normalizedNum = normalizeInvoiceNumberToPayg(target.invoiceNumber);
    const shouldNormalizeNum = normalizedNum !== target.invoiceNumber;

    await tx.invoice.update({
      where: { id: target.id },
      data: {
        ...(shouldNormalizeNum
          ? { invoiceNumber: normalizedNum, merchantOrderId: normalizedNum }
          : {}),
        amount: { increment: params.amountToAdd },
        status: 'PAID',
        paymentMethod: 'Account Balance',
        reference: 'PAYG_RUNNING',
      },
    });
    return;
  }

  const invoiceNumber = generateInvoiceNumber('INV-PAYG');
  const initialAmount = Math.max(
    params.amountToAdd,
    Math.round(params.fallbackAmount ?? params.amountToAdd)
  );

  await tx.invoice.create({
    data: {
      invoiceNumber,
      merchantOrderId: invoiceNumber,
      userId: params.userId,
      amount: initialAmount,
      status: 'PAID',
      paymentMethod: 'Account Balance',
      type: params.type,
      reference: 'PAYG_RUNNING',
      paidAt: new Date(),
      details: JSON.stringify({
        [params.serviceIdField]: params.serviceId,
        name: params.serviceName,
        ...(params.extraDetails || {}),
      }),
    },
  });
}

/**
 * Finalizes any active PAYG_RUNNING invoice(s) for a terminated/deleted service
 * so Billing History immediately switches from "PAYG RUNNING" to "Paid".
 */
export async function settleServicePaygInvoices(
  tx: any,
  params: {
    userId: number;
    serviceIdField?: ServiceIdField;
    serviceId?: number;
    serviceName?: string;
    vpsServiceId?: number;
    subscriptionId?: number;
    reservedIpId?: number;
    type?: string;
  }
): Promise<void> {
  if (!tx?.invoice?.findMany || !tx?.invoice?.updateMany) return;

  if (params.vpsServiceId) {
    await tx.invoice.updateMany({
      where: {
        userId: params.userId,
        vpsServiceId: params.vpsServiceId,
        OR: [{ reference: 'PAYG_RUNNING' }, { status: 'PAYG_RUNNING' }],
      },
      data: {
        status: 'PAID',
        reference: 'PAYG_COMPLETED',
        paymentMethod: 'Account Balance',
      },
    });
    return;
  }

  if (params.subscriptionId) {
    await tx.invoice.updateMany({
      where: {
        userId: params.userId,
        subscriptionId: params.subscriptionId,
        OR: [{ reference: 'PAYG_RUNNING' }, { status: 'PAYG_RUNNING' }],
      },
      data: {
        status: 'PAID',
        reference: 'PAYG_COMPLETED',
        paymentMethod: 'Account Balance',
      },
    });
    return;
  }

  const runningInvoices = await tx.invoice.findMany({
    where: {
      userId: params.userId,
      OR: [{ reference: 'PAYG_RUNNING' }, { status: 'PAYG_RUNNING' }],
      ...(params.type ? { type: params.type } : {}),
    },
  });

  const matchedIds: number[] = [];
  for (const inv of runningInvoices) {
    if (params.reservedIpId && inv.details) {
      try {
        if (Number(JSON.parse(inv.details)?.reservedIpId) === params.reservedIpId) {
          matchedIds.push(inv.id);
          continue;
        }
      } catch {
        if (inv.details.includes(`"reservedIpId":${params.reservedIpId}`)) {
          matchedIds.push(inv.id);
          continue;
        }
      }
    }
    if (
      params.serviceIdField &&
      params.serviceId !== undefined &&
      matchesServiceInvoice(inv, params.serviceIdField, params.serviceId, params.serviceName)
    ) {
      matchedIds.push(inv.id);
    }
  }

  if (matchedIds.length > 0) {
    await tx.invoice.updateMany({
      where: { id: { in: matchedIds }, userId: params.userId },
      data: {
        status: 'PAID',
        reference: 'PAYG_COMPLETED',
        paymentMethod: 'Account Balance',
      },
    });
  }
}

/**
 * Idempotent reconciliation for a user's active PAYG services:
 * - Backfills missing INV-PAYG-... invoices for services created before unified billing.
 * - Normalizes legacy INV-S3-... / status=PAYG_RUNNING invoices to INV-PAYG-... & PAID.
 * - Syncs amount so it is at least the service's accumulatedCost.
 */
export async function reconcileUserPaygInvoices(userId: number): Promise<void> {
  if (!prisma?.invoice?.findMany) return;

  const activeStatuses = ['PROVISIONING', 'RUNNING', 'STOPPED', 'SUSPENDED', 'ACTIVE'];

  const [apps, dbs, s3s, appPlatforms, reservedIps, vpsServices, subscriptions, existingInvoices] = await Promise.all([
    prisma.appService.findMany({
      where: { userId, billingMode: 'PAYG', status: { in: activeStatuses } },
    }),
    prisma.databaseService.findMany({
      where: { userId, billingMode: 'PAYG', status: { in: activeStatuses } },
    }),
    prisma.objectStorageService.findMany({
      where: { userId, billingMode: 'PAYG', status: { in: activeStatuses } },
    }),
    prisma.appPlatformService.findMany({
      where: { userId, billingMode: 'PAYG', status: { in: activeStatuses } },
    }),
    prisma.reservedIp.findMany({
      where: { userId, hourlyRate: { gt: 0 } },
    }),
    prisma.vpsService?.findMany
      ? prisma.vpsService.findMany({
          where: { userId, status: { in: activeStatuses } },
          select: { id: true },
        })
      : Promise.resolve([]),
    prisma.subscription?.findMany
      ? prisma.subscription.findMany({
          where: { userId, status: { in: activeStatuses } },
          select: { id: true },
        })
      : Promise.resolve([]),
    prisma.invoice.findMany({
      where: {
        userId,
        OR: [
          { type: { in: ['MANAGED_APP', 'MANAGED_DATABASE', 'OBJECT_STORAGE', 'APP_PLATFORM', 'IP_RESERVATION'] } },
          { invoiceNumber: { startsWith: 'INV-S3-' } },
          { reference: 'PAYG_RUNNING' },
          { status: 'PAYG_RUNNING' },
        ],
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const reconcileItem = async (item: {
    serviceIdField: ServiceIdField;
    serviceId: number;
    type: PaygServiceInvoiceType;
    serviceName: string;
    accumulatedCost: number;
    paidAt: Date;
    extraDetails: Record<string, any>;
  }) => {
    const matches = existingInvoices.filter((inv) =>
      matchesServiceInvoice(inv, item.serviceIdField, item.serviceId, item.serviceName)
    );

    if (matches.length === 0) {
      const invoiceNumber = generateInvoiceNumber('INV-PAYG');
      await prisma.invoice.create({
        data: {
          invoiceNumber,
          merchantOrderId: invoiceNumber,
          userId,
          amount: Math.max(0, Math.round(item.accumulatedCost)),
          status: 'PAID',
          paymentMethod: 'Account Balance',
          type: item.type,
          reference: 'PAYG_RUNNING',
          paidAt: item.paidAt,
          details: JSON.stringify({
            [item.serviceIdField]: item.serviceId,
            name: item.serviceName,
            ...item.extraDetails,
          }),
        },
      });
      return;
    }

    // Prefer an existing INV-PAYG-... invoice as primary when deduplicating
    const matched =
      matches.find((inv) => inv.invoiceNumber.startsWith('INV-PAYG-')) ?? matches[0];
    const duplicates = matches.filter((inv) => inv.id !== matched.id);
    const maxMatchedAmount = matches.reduce((max, inv) => Math.max(max, inv.amount || 0), 0);

    if (duplicates.length > 0 && prisma?.invoice?.deleteMany) {
      await prisma.invoice.deleteMany({
        where: { id: { in: duplicates.map((d) => d.id) }, userId },
      });
    }

    const normalizedNum = normalizeInvoiceNumberToPayg(matched.invoiceNumber);
    const targetAmount = Math.max(maxMatchedAmount, Math.round(item.accumulatedCost));
    const needsUpdate =
      normalizedNum !== matched.invoiceNumber ||
      matched.status !== 'PAID' ||
      matched.reference !== 'PAYG_RUNNING' ||
      matched.paymentMethod !== 'Account Balance' ||
      matched.type !== item.type ||
      targetAmount !== matched.amount;

    if (needsUpdate) {
      await prisma.invoice.update({
        where: { id: matched.id },
        data: {
          ...(normalizedNum !== matched.invoiceNumber
            ? { invoiceNumber: normalizedNum, merchantOrderId: normalizedNum }
            : {}),
          type: item.type,
          amount: targetAmount,
          status: 'PAID',
          paymentMethod: 'Account Balance',
          reference: 'PAYG_RUNNING',
          details: JSON.stringify({
            [item.serviceIdField]: item.serviceId,
            name: item.serviceName,
            ...item.extraDetails,
          }),
        },
      });
    }
  };

  for (const app of apps) {
    await reconcileItem({
      serviceIdField: 'appServiceId',
      serviceId: app.id,
      type: 'MANAGED_APP',
      serviceName: app.name,
      accumulatedCost: app.accumulatedCost || 0,
      paidAt: app.lastBilledAt || app.createdAt,
      extraDetails: {
        appType: app.appType,
        planName: app.planName,
        cpuShares: app.cpuShares,
        memoryMb: app.memoryMb,
        storageGb: app.storageGb,
        billingMode: app.billingMode,
      },
    });
  }

  for (const db of dbs) {
    await reconcileItem({
      serviceIdField: 'databaseServiceId',
      serviceId: db.id,
      type: 'MANAGED_DATABASE',
      serviceName: db.name,
      accumulatedCost: db.accumulatedCost || 0,
      paidAt: db.lastBilledAt || db.createdAt,
      extraDetails: {
        dbType: db.type,
        version: db.version,
        planName: db.planName,
        cpuShares: db.cpuShares,
        memoryMb: db.memoryMb,
        storageGb: db.storageGb,
        billingMode: db.billingMode,
      },
    });
  }

  for (const s3 of s3s) {
    await reconcileItem({
      serviceIdField: 'objectStorageServiceId',
      serviceId: s3.id,
      type: 'OBJECT_STORAGE',
      serviceName: s3.name,
      accumulatedCost: s3.accumulatedCost || 0,
      paidAt: s3.lastBilledAt || s3.createdAt,
      extraDetails: {
        planName: s3.planName,
        storageGb: s3.storageGb,
        billingMode: s3.billingMode,
      },
    });
  }

  for (const app of appPlatforms) {
    await reconcileItem({
      serviceIdField: 'appPlatformServiceId',
      serviceId: app.id,
      type: 'APP_PLATFORM',
      serviceName: app.name,
      accumulatedCost: app.accumulatedCost || 0,
      paidAt: app.lastBilledAt || app.createdAt,
      extraDetails: {
        gitUrl: app.gitUrl,
        branch: app.branch,
        buildType: app.buildType,
        planName: app.planName,
        cpuShares: app.cpuShares,
        memoryMb: app.memoryMb,
        storageGb: app.storageGb,
        billingMode: app.billingMode,
      },
    });
  }

  for (const ip of reservedIps) {
    const matchedIpInv = existingInvoices.find((inv) => {
      if (inv.type !== 'IP_RESERVATION' || !inv.details) return false;
      try {
        return Number(JSON.parse(inv.details)?.reservedIpId) === ip.id;
      } catch {
        return inv.details.includes(`"reservedIpId":${ip.id}`);
      }
    });

    if (!matchedIpInv) {
      const invoiceNumber = generateInvoiceNumber('INV-PAYG');
      await prisma.invoice.create({
        data: {
          invoiceNumber,
          merchantOrderId: invoiceNumber,
          userId,
          amount: Math.max(0, Math.round(ip.accumulatedCost || 0)),
          status: 'PAID',
          paymentMethod: 'Account Balance',
          type: 'IP_RESERVATION',
          reference: 'PAYG_RUNNING',
          paidAt: ip.createdAt,
          details: JSON.stringify({
            reservedIpId: ip.id,
            ipAddress: ip.ipAddress,
            billingMode: 'PAYG',
          }),
        },
      });
    } else {
      const targetAmount = Math.max(matchedIpInv.amount, Math.round(ip.accumulatedCost || 0));
      if (
        matchedIpInv.status !== 'PAID' ||
        matchedIpInv.reference !== 'PAYG_RUNNING' ||
        targetAmount !== matchedIpInv.amount
      ) {
        await prisma.invoice.update({
          where: { id: matchedIpInv.id },
          data: {
            amount: targetAmount,
            status: 'PAID',
            paymentMethod: 'Account Balance',
            reference: 'PAYG_RUNNING',
          },
        });
      }
    }
  }

  // Clean up any remaining legacy INV-S3-... invoices:
  // If user already has an INV-PAYG-... invoice, delete the legacy INV-S3-... duplicate/remnant;
  // otherwise normalize it to INV-PAYG-... so no INV-S3-... prefix remains.
  const handledIds = new Set<number>();
  for (const s3 of s3s) {
    for (const inv of existingInvoices) {
      if (matchesServiceInvoice(inv, 'objectStorageServiceId', s3.id, s3.name)) {
        handledIds.add(inv.id);
      }
    }
  }
  const remainingS3Invoices = existingInvoices.filter(
    (inv) => inv.invoiceNumber.startsWith('INV-S3-') && !handledIds.has(inv.id)
  );
  if (remainingS3Invoices.length > 0) {
    const hasPaygInvoice = existingInvoices.some((inv) =>
      inv.invoiceNumber.startsWith('INV-PAYG-')
    );
    if (hasPaygInvoice && prisma?.invoice?.deleteMany) {
      await prisma.invoice.deleteMany({
        where: { id: { in: remainingS3Invoices.map((inv) => inv.id) }, userId },
      });
    } else {
      for (const inv of remainingS3Invoices) {
        const normalizedNum = normalizeInvoiceNumberToPayg(inv.invoiceNumber);
        await prisma.invoice.update({
          where: { id: inv.id },
          data: {
            invoiceNumber: normalizedNum,
            merchantOrderId: normalizedNum,
            type: 'OBJECT_STORAGE',
            status: 'PAID',
            paymentMethod: 'Account Balance',
            reference: 'PAYG_RUNNING',
          },
        });
      }
    }
  }

  // Finalize any PAYG_RUNNING invoices whose underlying service is no longer active (terminated/deleted)
  const activeVpsIds = new Set(vpsServices.map((v: { id: number }) => v.id));
  const activeSubIds = new Set(subscriptions.map((s: { id: number }) => s.id));
  const activeIpIds = new Set(reservedIps.map((ip) => ip.id));

  const staleRunningIds: number[] = [];
  for (const inv of existingInvoices) {
    if (inv.reference !== 'PAYG_RUNNING' && inv.status !== 'PAYG_RUNNING') continue;

    let isStillActive = false;
    if (inv.type === 'MANAGED_APP') {
      isStillActive = apps.some((a) => matchesServiceInvoice(inv, 'appServiceId', a.id, a.name));
    } else if (inv.type === 'MANAGED_DATABASE') {
      isStillActive = dbs.some((d) => matchesServiceInvoice(inv, 'databaseServiceId', d.id, d.name));
    } else if (inv.type === 'OBJECT_STORAGE') {
      isStillActive = s3s.some((s) => matchesServiceInvoice(inv, 'objectStorageServiceId', s.id, s.name));
    } else if (inv.type === 'IP_RESERVATION') {
      try {
        const ipId = Number(inv.details ? JSON.parse(inv.details)?.reservedIpId : NaN);
        isStillActive = activeIpIds.has(ipId);
      } catch {
        isStillActive = false;
      }
    } else if (inv.vpsServiceId || inv.type === 'VPS') {
      isStillActive = inv.vpsServiceId ? activeVpsIds.has(inv.vpsServiceId) : false;
    } else if (inv.subscriptionId) {
      isStillActive = activeSubIds.has(inv.subscriptionId);
    } else {
      // Other PAYG_RUNNING invoice without a matching active service
      isStillActive = false;
    }

    if (!isStillActive) {
      staleRunningIds.push(inv.id);
    }
  }

  if (staleRunningIds.length > 0 && prisma?.invoice?.updateMany) {
    await prisma.invoice.updateMany({
      where: { id: { in: staleRunningIds }, userId },
      data: {
        status: 'PAID',
        reference: 'PAYG_COMPLETED',
        paymentMethod: 'Account Balance',
      },
    });
  }
}
