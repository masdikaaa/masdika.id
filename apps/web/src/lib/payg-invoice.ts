import crypto from 'crypto';

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
  }
): Promise<void> {
  if (!tx?.invoice?.findMany) return;

  const runningInvoices = await tx.invoice.findMany({
    where: {
      userId: params.userId,
      reference: 'PAYG_RUNNING',
      type: params.type,
    },
    orderBy: { createdAt: 'desc' },
  });

  const target = runningInvoices.find((inv: any) =>
    inv.details?.includes(`"${params.serviceIdField}":${params.serviceId}`)
  );

  if (target) {
    await tx.invoice.update({
      where: { id: target.id },
      data: {
        amount: { increment: params.amountToAdd },
        status: 'PAID',
        paymentMethod: 'Account Balance',
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
      }),
    },
  });
}
