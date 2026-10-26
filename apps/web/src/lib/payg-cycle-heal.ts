import { prisma } from '@/lib/prisma';

const CYCLE_STALE_MS = 31 * 24 * 60 * 60 * 1000;

/**
 * Self-heal for regular (non-reseller) PAYG VPS whose monthly running invoice was never
 * rotated (e.g. a missed billing cron). Safe to call repeatedly / concurrently:
 *
 * - Reseller VPS are skipped: their renewal requires an upfront balance charge, which is
 *   handled exclusively by the billing cron.
 * - Rotation only happens when the running invoice is older than 31 days, so it never
 *   double-rotates a cycle the billing cron already handles via `expiresAt`.
 * - The old invoice is finalized with a conditional `updateMany`; if another request already
 *   rotated it (count === 0) nothing new is created, preventing duplicate invoices.
 * - The new running invoice starts at 0 (the previous month's usage stays on the completed
 *   invoice; hourly billing increments the new one).
 */
export async function healPaygCycleInvoicesForUser(userId: number) {
  const now = new Date();
  let healed = 0;

  // 1. Standardize any legacy invoice numbers for this user (e.g. INV-1792973371884-103-VPS-PAYG -> INV-PAYG-1792973371884-103)
  try {
    const { standardizeInvoiceNumber } = await import('@/lib/invoice-standardizer');
    const legacyInvoices = await prisma.invoice.findMany({
      where: {
        userId,
        OR: [
          { invoiceNumber: { endsWith: '-VPS-PAYG' } },
          { invoiceNumber: { endsWith: '-PAYG' } },
          { merchantOrderId: { endsWith: '-VPS-PAYG' } },
          { merchantOrderId: { endsWith: '-PAYG' } }
        ]
      },
      select: { id: true, invoiceNumber: true, merchantOrderId: true }
    });

    for (const inv of legacyInvoices) {
      if (inv.invoiceNumber.startsWith('INV-PAYG-') && (!inv.merchantOrderId || inv.merchantOrderId.startsWith('INV-PAYG-'))) {
        continue;
      }
      const newInvoiceNumber = standardizeInvoiceNumber(inv.invoiceNumber);
      const newMerchantOrderId = inv.merchantOrderId ? standardizeInvoiceNumber(inv.merchantOrderId) : newInvoiceNumber;
      if (newInvoiceNumber !== inv.invoiceNumber || newMerchantOrderId !== inv.merchantOrderId) {
        await prisma.invoice.update({
          where: { id: inv.id },
          data: { invoiceNumber: newInvoiceNumber, merchantOrderId: newMerchantOrderId }
        });
      }
    }
  } catch (err) {
    console.warn('[PAYG Heal] Failed to normalize user legacy invoices:', err);
  }

  const vpsList = await prisma.vpsService.findMany({
    where: {
      userId,
      isReseller: false,
      status: { in: ['RUNNING', 'STOPPED'] },
      hourlyRate: { gt: 0 }
    },
    include: {
      invoices: {
        where: { reference: 'PAYG_RUNNING', type: 'VPS' },
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });

  for (const vps of vpsList) {
    const runningInvoice = vps.invoices[0];
    if (!runningInvoice) continue; // hourly billing creates one on the next charge
    if (now.getTime() - new Date(runningInvoice.createdAt).getTime() < CYCLE_STALE_MS) continue;

    try {
      await prisma.$transaction(async (tx) => {
        const finalized = await tx.invoice.updateMany({
          where: { id: runningInvoice.id, reference: 'PAYG_RUNNING' },
          data: { reference: 'PAYG_COMPLETED' }
        });
        if (finalized.count === 0) return; // already rotated by a concurrent request / cron

        const newExpires = new Date(vps.expiresAt || now);
        if (newExpires < now) {
          newExpires.setTime(now.getTime());
          newExpires.setMonth(newExpires.getMonth() + 1);
        }

        await tx.vpsService.update({
          where: { id: vps.id },
          data: { expiresAt: newExpires, accumulatedCost: 0 }
        });

        const timestamp = Date.now().toString();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const invoiceNumber = `INV-PAYG-${timestamp}-${random}`;
        const cycleLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });

        const attachedIps = await tx.reservedIp.findMany({
          where: { vpsId: vps.id, isAttached: true }
        });
        const syncedIpCosts: Record<number, number> = {};
        for (const ip of attachedIps) {
          syncedIpCosts[ip.id] = ip.accumulatedCost;
        }

        await tx.invoice.create({
          data: {
            invoiceNumber,
            userId,
            vpsServiceId: vps.id,
            amount: 0,
            status: 'PAID',
            paymentMethod: 'Account Balance',
            merchantOrderId: invoiceNumber,
            type: 'VPS',
            paidAt: now,
            reference: 'PAYG_RUNNING',
            details: JSON.stringify({
              type: 'PAYG_MONTHLY_CYCLE',
              cycle: cycleLabel,
              hostname: vps.hostname,
              isReseller: false,
              _syncedReservedIpCosts: syncedIpCosts
            })
          }
        });
        healed++;
      });
    } catch (err) {
      console.warn(`[PAYG Heal] Failed to rotate cycle invoice for VPS ${vps.id}:`, err);
    }
  }

  return { healed };
}
