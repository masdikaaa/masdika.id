import { prisma } from '@/lib/prisma';

/**
 * Standardizes any legacy invoice number format into the uniform INV-PAYG-{timestamp}-{id} format.
 * Examples:
 * - INV-1792973371884-103-VPS-PAYG -> INV-PAYG-1792973371884-103
 * - INV-1790262469319-158-PAYG     -> INV-PAYG-1790262469319-158
 * - INV-PAYG-1790147699526-246     -> INV-PAYG-1790147699526-246 (unchanged)
 */
export function standardizeInvoiceNumber(invNum: string): string {
  if (!invNum) return invNum;
  if (invNum.startsWith('INV-PAYG-')) return invNum;

  // Strict regex for INV-{timestamp}-{random}-VPS-PAYG or INV-{timestamp}-{random}-PAYG
  const match = invNum.match(/^INV-(\d+)-(\d+)-(?:VPS-)?PAYG$/i);
  if (match) {
    return `INV-PAYG-${match[1]}-${match[2]}`;
  }

  // Fallback for any other legacy -VPS-PAYG suffix
  if (invNum.endsWith('-VPS-PAYG')) {
    const core = invNum.replace(/-VPS-PAYG$/i, '').replace(/^INV-/, '');
    return `INV-PAYG-${core}`;
  }

  // Fallback for any other legacy -PAYG suffix (excluding already matching INV-PAYG-)
  if (invNum.endsWith('-PAYG') && !invNum.startsWith('INV-PAYG-')) {
    const core = invNum.replace(/-PAYG$/i, '').replace(/^INV-/, '');
    return `INV-PAYG-${core}`;
  }

  return invNum;
}

/**
 * Idempotently scans and normalizes all legacy PAYG invoice numbers in the database
 * to ensure uniformity across the entire system.
 */
export async function normalizeAllLegacyInvoices() {
  try {
    const legacyInvoices = await prisma.invoice.findMany({
      where: {
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
          data: {
            invoiceNumber: newInvoiceNumber,
            merchantOrderId: newMerchantOrderId
          }
        });
        console.log(`[Invoice Standardizer] Migrated invoice #${inv.id}: ${inv.invoiceNumber} -> ${newInvoiceNumber}`);
      }
    }
  } catch (err) {
    console.warn('[Invoice Standardizer] Legacy invoice normalization error:', err);
  }
}
