import { prisma } from '@/lib/prisma';
import { parseInvoiceDetails } from '@/lib/invoice-display';

/**
 * Enriches invoices that reference Managed App, Managed Database, or Object Storage
 * via JSON `details` so legacy and new invoices always display full plan & spec info.
 */
export async function enrichInvoicesWithServiceDetails<T extends { type?: string | null; details?: string | null; invoiceNumber?: string | null }>(
  invoices: T[]
): Promise<T[]> {
  if (!Array.isArray(invoices) || invoices.length === 0) return invoices;

  const appIds = new Set<number>();
  const dbIds = new Set<number>();
  const s3Ids = new Set<number>();

  const parsedMap = new Map<number, Record<string, any>>();

  invoices.forEach((inv, idx) => {
    const d = parseInvoiceDetails(inv.details);
    if (!d) return;
    parsedMap.set(idx, d);

    const hasSpecs = Boolean(d.planName && (d.storageGb || d.cpuShares || d.memoryMb));
    if (hasSpecs) return;

    if (typeof d.appServiceId === 'number') appIds.add(d.appServiceId);
    if (typeof d.databaseServiceId === 'number') dbIds.add(d.databaseServiceId);
    if (typeof d.objectStorageServiceId === 'number') s3Ids.add(d.objectStorageServiceId);
  });

  if (appIds.size === 0 && dbIds.size === 0 && s3Ids.size === 0) {
    return invoices;
  }

  const [apps, dbs, s3s] = await Promise.all([
    appIds.size > 0
      ? prisma.appService.findMany({
          where: { id: { in: Array.from(appIds) } },
          select: { id: true, name: true, appType: true, planName: true, cpuShares: true, memoryMb: true, storageGb: true, billingMode: true },
        })
      : Promise.resolve([]),
    dbIds.size > 0
      ? prisma.databaseService.findMany({
          where: { id: { in: Array.from(dbIds) } },
          select: { id: true, name: true, type: true, version: true, planName: true, cpuShares: true, memoryMb: true, storageGb: true, billingMode: true },
        })
      : Promise.resolve([]),
    s3Ids.size > 0
      ? prisma.objectStorageService.findMany({
          where: { id: { in: Array.from(s3Ids) } },
          select: { id: true, name: true, planName: true, storageGb: true, billingMode: true },
        })
      : Promise.resolve([]),
  ]);

  const appById = new Map(apps.map((a) => [a.id, a]));
  const dbById = new Map(dbs.map((d) => [d.id, d]));
  const s3ById = new Map(s3s.map((s) => [s.id, s]));

  return invoices.map((inv, idx) => {
    const d = parsedMap.get(idx);
    if (!d) return inv;

    let enriched: Record<string, any> | null = null;

    if (typeof d.appServiceId === 'number' && appById.has(d.appServiceId)) {
      const a = appById.get(d.appServiceId)!;
      enriched = {
        ...d,
        name: d.name || a.name,
        appType: d.appType || a.appType,
        planName: d.planName || a.planName,
        cpuShares: d.cpuShares ?? a.cpuShares,
        memoryMb: d.memoryMb ?? a.memoryMb,
        storageGb: d.storageGb ?? a.storageGb,
        billingMode: d.billingMode || a.billingMode,
      };
    } else if (typeof d.databaseServiceId === 'number' && dbById.has(d.databaseServiceId)) {
      const db = dbById.get(d.databaseServiceId)!;
      enriched = {
        ...d,
        name: d.name || db.name,
        dbType: d.dbType || db.type,
        version: d.version || db.version,
        planName: d.planName || db.planName,
        cpuShares: d.cpuShares ?? db.cpuShares,
        memoryMb: d.memoryMb ?? db.memoryMb,
        storageGb: d.storageGb ?? db.storageGb,
        billingMode: d.billingMode || db.billingMode,
      };
    } else if (typeof d.objectStorageServiceId === 'number' && s3ById.has(d.objectStorageServiceId)) {
      const s3 = s3ById.get(d.objectStorageServiceId)!;
      enriched = {
        ...d,
        name: d.name || s3.name,
        planName: d.planName || s3.planName,
        storageGb: d.storageGb ?? s3.storageGb,
        billingMode: d.billingMode || s3.billingMode,
      };
    }

    if (!enriched) return inv;
    return {
      ...inv,
      details: JSON.stringify(enriched),
    };
  });
}
