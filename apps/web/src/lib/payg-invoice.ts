import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

function generateInvoiceNumber(prefix: string): string {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

export type PaygServiceInvoiceType =
  | 'MANAGED_APP'
  | 'MANAGED_DATABASE'
  | 'OBJECT_STORAGE';

export type ServiceIdField =
  | 'appServiceId'
  | 'databaseServiceId'
  | 'objectStorageServiceId';

function normalizeInvoiceNumberToPayg(invoiceNumber: string): string {
  if (invoiceNumber.startsWith('INV-S3-')) {
    return `INV-PAYG-${invoiceNumber.slice('INV-S3-'.length)}`;
  }
  return invoiceNumber;
}

function matchesServiceInvoice(
  inv: { details?: string | null },
  serviceIdField: ServiceIdField,
  serviceId: number
): boolean {
  if (!inv.details) return false;
  try {
    const parsed = JSON.parse(inv.details);
    return Number(parsed?.[serviceIdField]) === serviceId;
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
      type: params.type,
      OR: [
        { reference: 'PAYG_RUNNING' },
        { status: 'PAYG_RUNNING' },
        { invoiceNumber: { startsWith: 'INV-S3-' } },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  const target = candidates.find((inv: any) =>
    matchesServiceInvoice(inv, params.serviceIdField, params.serviceId)
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
 * Idempotent reconciliation for a user's active PAYG services:
 * - Backfills missing INV-PAYG-... invoices for services created before unified billing.
 * - Normalizes legacy INV-S3-... / status=PAYG_RUNNING invoices to INV-PAYG-... & PAID.
 * - Syncs amount so it is at least the service's accumulatedCost.
 */
export async function reconcileUserPaygInvoices(userId: number): Promise<void> {
  if (!prisma?.invoice?.findMany) return;

  const activeStatuses = ['PROVISIONING', 'RUNNING', 'STOPPED', 'SUSPENDED', 'ACTIVE'];

  const [apps, dbs, s3s, existingInvoices] = await Promise.all([
    prisma.appService.findMany({
      where: { userId, billingMode: 'PAYG', status: { in: activeStatuses } },
    }),
    prisma.databaseService.findMany({
      where: { userId, billingMode: 'PAYG', status: { in: activeStatuses } },
    }),
    prisma.objectStorageService.findMany({
      where: { userId, billingMode: 'PAYG', status: { in: activeStatuses } },
    }),
    prisma.invoice.findMany({
      where: {
        userId,
        OR: [
          { type: { in: ['MANAGED_APP', 'MANAGED_DATABASE', 'OBJECT_STORAGE'] } },
          { invoiceNumber: { startsWith: 'INV-S3-' } },
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
    const matched = existingInvoices.find((inv) =>
      matchesServiceInvoice(inv, item.serviceIdField, item.serviceId)
    );

    if (!matched) {
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

    const normalizedNum = normalizeInvoiceNumberToPayg(matched.invoiceNumber);
    const targetAmount = Math.max(matched.amount, Math.round(item.accumulatedCost));
    const needsUpdate =
      normalizedNum !== matched.invoiceNumber ||
      matched.status !== 'PAID' ||
      matched.reference !== 'PAYG_RUNNING' ||
      matched.paymentMethod !== 'Account Balance' ||
      targetAmount !== matched.amount;

    if (needsUpdate) {
      await prisma.invoice.update({
        where: { id: matched.id },
        data: {
          ...(normalizedNum !== matched.invoiceNumber
            ? { invoiceNumber: normalizedNum, merchantOrderId: normalizedNum }
            : {}),
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
}
