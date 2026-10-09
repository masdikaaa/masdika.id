import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export const dynamic = 'force-dynamic';

/**
 * One-time sync endpoint to reconcile existing Reserved IP accumulated costs
 * into PAYG_RUNNING VPS invoices.
 *
 * Problem: Before the billing fix, Reserved IP costs were deducted from balance
 * every hour and stored in `reservedIp.accumulatedCost`, but were NEVER added
 * to any invoice. This means:
 *   - User's balance was already correctly deducted (no money lost)
 *   - But the PAYG_RUNNING invoice amount was under-reporting the actual total cost
 *   - PAYG Monitor showed the correct total (reads directly from DB fields)
 *   - Invoice shown to user was lower than PAYG Monitor total
 *
 * This endpoint:
 *   1. Finds all active Reserved IPs that are attached to a VPS
 *   2. Checks if their accumulated cost is already reflected in the VPS PAYG_RUNNING invoice
 *   3. If not, adds the missing amount to the invoice (one-time correction)
 *
 * Safe to run multiple times — tracks synced amounts in invoice details field.
 * Use ?dryRun=true to preview changes without applying them.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const dryRun = req.nextUrl.searchParams.get('dryRun') === 'true';

    // Find all Reserved IPs that are attached to VPSes and have accumulated cost
    const attachedIps = await prisma.reservedIp.findMany({
      where: {
        isAttached: true,
        vpsId: { not: null },
        accumulatedCost: { gt: 0 }
      },
      include: {
        vps: {
          include: {
            invoices: {
              where: { reference: 'PAYG_RUNNING', type: 'VPS' },
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        }
      }
    });

    // Find all detached Reserved IPs with accumulated costs
    const detachedIps = await prisma.reservedIp.findMany({
      where: {
        OR: [{ isAttached: false }, { vpsId: null }],
        accumulatedCost: { gt: 0 }
      }
    });

    const results: any[] = [];
    let totalSynced = 0;
    let totalAmount = 0;

    // === Sync attached IPs into their VPS's PAYG_RUNNING invoice ===
    for (const ip of attachedIps) {
      if (!ip.vps || !ip.vpsId) continue;

      const runningInvoice = ip.vps.invoices[0];
      if (!runningInvoice) {
        results.push({
          ipId: ip.id, ipAddress: ip.ipAddress, vpsId: ip.vpsId,
          status: 'SKIPPED_NO_RUNNING_INVOICE', accumulatedCost: ip.accumulatedCost
        });
        continue;
      }

      // Track what has already been synced via details field to ensure idempotency
      const existingDetails = (() => {
        try { return JSON.parse(runningInvoice.details || '{}'); } catch { return {}; }
      })();
      
      const syncedIpCosts: Record<number, number> = existingDetails._syncedReservedIpCosts || {};
      const alreadySyncedAmount = syncedIpCosts[ip.id] || 0;
      const toSync = ip.accumulatedCost - alreadySyncedAmount;

      if (toSync <= 0) {
        results.push({
          ipId: ip.id, ipAddress: ip.ipAddress, vpsId: ip.vpsId,
          invoiceId: runningInvoice.id, status: 'ALREADY_SYNCED',
          accumulatedCost: ip.accumulatedCost, alreadySyncedAmount
        });
        continue;
      }

      if (!dryRun) {
        syncedIpCosts[ip.id] = ip.accumulatedCost;
        const newDetails = { ...existingDetails, _syncedReservedIpCosts: syncedIpCosts };

        await prisma.invoice.update({
          where: { id: runningInvoice.id },
          data: {
            amount: { increment: toSync },
            details: JSON.stringify(newDetails)
          }
        });
      }

      results.push({
        ipId: ip.id, ipAddress: ip.ipAddress, vpsId: ip.vpsId,
        invoiceId: runningInvoice.id,
        status: dryRun ? 'DRY_RUN_WOULD_SYNC' : 'SYNCED',
        syncedAmount: toSync, accumulatedCost: ip.accumulatedCost
      });
      totalSynced++;
      totalAmount += toSync;
    }

    // === Sync detached IPs — create/update standalone PAYG_RUNNING IP_RESERVATION invoices ===
    for (const ip of detachedIps) {
      const existingInvoice = await prisma.invoice.findFirst({
        where: {
          userId: ip.userId,
          type: 'IP_RESERVATION',
          reference: 'PAYG_RUNNING',
          details: { contains: `"reservedIpId":${ip.id}` }
        }
      });

      if (existingInvoice) {
        const toSync = ip.accumulatedCost - existingInvoice.amount;
        if (toSync <= 0) {
          results.push({
            ipId: ip.id, ipAddress: ip.ipAddress,
            status: 'DETACHED_ALREADY_SYNCED', accumulatedCost: ip.accumulatedCost
          });
          continue;
        }
        if (!dryRun) {
          await prisma.invoice.update({ where: { id: existingInvoice.id }, data: { amount: { increment: toSync } } });
        }
        results.push({
          ipId: ip.id, ipAddress: ip.ipAddress, invoiceId: existingInvoice.id,
          status: dryRun ? 'DRY_RUN_DETACHED_UPDATE' : 'DETACHED_UPDATED', syncedAmount: toSync
        });
        totalSynced++;
        totalAmount += toSync;
      } else {
        if (!dryRun) {
          const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}-RESYNC`;
          await prisma.invoice.create({
            data: {
              invoiceNumber, userId: ip.userId, amount: ip.accumulatedCost,
              status: 'PAID', paymentMethod: 'Account Balance', merchantOrderId: invoiceNumber,
              type: 'IP_RESERVATION', reference: 'PAYG_RUNNING', paidAt: new Date(),
              details: JSON.stringify({ reservedIpId: ip.id, ipAddress: ip.ipAddress, _resync: true })
            }
          });
        }
        results.push({
          ipId: ip.id, ipAddress: ip.ipAddress,
          status: dryRun ? 'DRY_RUN_DETACHED_CREATE' : 'DETACHED_CREATED',
          syncedAmount: ip.accumulatedCost
        });
        totalSynced++;
        totalAmount += ip.accumulatedCost;
      }
    }

    return NextResponse.json({
      success: true, dryRun,
      summary: {
        totalIpsProcessed: attachedIps.length + detachedIps.length,
        totalSynced,
        totalAmountSynced: totalAmount
      },
      details: results
    });

  } catch (error: any) {
    console.error("Reserved IP Invoice Sync Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
