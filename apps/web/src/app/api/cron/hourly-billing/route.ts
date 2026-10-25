import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPaygSuspendedEmail } from "@/lib/email";
import { decryptDeterministic } from "@/lib/encryption";
import { ProxmoxClient } from "@/lib/proxmox";
import { logger } from "@/lib/logger";
import { getEffectiveHourlyRate } from "@/lib/vps-billing-rate";

export async function GET(req: Request) {
  try {
    // Security: Fail-closed auth via Authorization header (never URL params to prevent log leakage)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || !authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    const setting = await prisma.setting.findUnique({
      where: { key: 'payg_billing_interval' }
    });
    const interval = setting?.value || 'hourly';

    if (interval === 'hourly' && now.getMinutes() !== 0) {
      return NextResponse.json({ success: true, message: "Skipped (Runs hourly at minute 0)" });
    }

    // Auto-unsuspend any eligible suspended services with sufficient balance
    try {
      const { attemptAutoUnsuspendAll } = await import('@/lib/auto-unsuspend');
      await attemptAutoUnsuspendAll();
    } catch (unsuspendErr) {
      console.warn("Auto-unsuspend in hourly-billing error:", unsuspendErr);
    }

    // Find all ACTIVE PAYG subscriptions whose hour has expired
    const dueSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lte: now }
      },
      include: {
        plan: true,
        user: true,
        invoices: {
          where: { reference: 'PAYG_RUNNING', type: 'SUBSCRIPTION' },
          orderBy: { createdAt: 'desc' as const },
          take: 1
        }
      }
    });

    let processedCount = 0;
    let suspendedCount = 0;
    let ghostErrors: any[] = [];

    for (const sub of dueSubscriptions) {
      const hourlyPrice = sub.lockedHourlyPrice;

      if (hourlyPrice === 0) {
        // Just extend by an hour
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            expiresAt: new Date(now.getTime() + 60 * 60 * 1000)
          }
        });
        processedCount++;
        continue;
      }

      let paymentSuccess = false;
      if (hourlyPrice > 0) {
        try {
          // Deduct balance and extend subscription
          await prisma.$transaction(async (tx) => {
            // SECURITY: Atomic lock to prevent Cron Overlap Race Conditions
            const lockedSub = await tx.subscription.updateMany({
              where: { id: sub.id, expiresAt: { lte: now } },
              data: { expiresAt: new Date(now.getTime() + 60 * 60 * 1000) }
            });

            if (lockedSub.count === 0) {
              throw new Error("ALREADY_PROCESSED");
            }

            const updateResult = await tx.user.updateMany({
              where: { id: sub.userId, balance: { gte: hourlyPrice } },
              data: { balance: { decrement: hourlyPrice } }
            });
            
            if (updateResult.count === 0) {
              throw new Error("INSUFFICIENT_BALANCE");
            }

          // Update existing running invoice (single invoice per billing cycle, no spam — same pattern as VPS)
          const runningInvoice = sub.invoices[0];
          if (runningInvoice) {
            await tx.invoice.update({
              where: { id: runningInvoice.id },
              data: { amount: { increment: hourlyPrice } }
            });
          } else {
            // Safety net: Create a running invoice if none exists (e.g. legacy subscriptions created before this fix)
            const timestamp = Date.now().toString();
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            const invoiceNumber = `INV-${timestamp}-${random}-PAYG`;
            await tx.invoice.create({
              data: {
                invoiceNumber,
                userId: sub.userId,
                subscriptionId: sub.id,
                amount: hourlyPrice,
                status: 'PAID',
                paymentMethod: 'Account Balance',
                merchantOrderId: invoiceNumber,
                paidAt: new Date(),
                type: 'SUBSCRIPTION',
                reference: 'PAYG_RUNNING'
              }
            });
          }
          });
        paymentSuccess = true;
        } catch (e: any) {
          if (e.message === "ALREADY_PROCESSED") {
            paymentSuccess = true;
          } else if (e.message === "INSUFFICIENT_BALANCE") {
            paymentSuccess = false; // explicitly mark it
          } else {
            console.error("Hourly billing auto-deduct error:", e);
            paymentSuccess = true; // DO NOT suspend for transient DB errors
          }
        }
      }

      if (paymentSuccess) {
        processedCount++;
      } else {
        // Suspend subscription due to insufficient balance
        const defaultTermination = new Date(now);
        defaultTermination.setDate(defaultTermination.getDate() + 3);

        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status: 'SUSPENDED',
            suspendReason: 'Insufficient balance for Pay as You Go hourly billing.',
            terminationDate: defaultTermination
          }
        });
        suspendedCount++;

        // Send email notification
        try {
          const rawEmail = sub.user.email || '';
          const decEmail = decryptDeterministic(rawEmail) || rawEmail;
          const rawName = sub.user.name || 'Customer';
          const decName = decryptDeterministic(rawName) || rawName;
          
          await sendPaygSuspendedEmail(
            decEmail,
            decName,
            sub.plan.name,
            sub.plan.service
          );
        } catch (emailErr) {
          console.error("Failed to send suspension email:", emailErr);
        }
      }
    }

    // ----------------------------------------------------
    // Process PAYG VPS Services (REAL-TIME BILLING)
    // Every hour: deduct from balance + update running invoice
    // ----------------------------------------------------
    const activePaygVps = await prisma.vpsService.findMany({
      where: {
        status: { in: ['RUNNING', 'STOPPED'] },
        isReseller: false
      },
      include: {
        user: true,
        assignedIps: true,
        invoices: {
          where: { reference: 'PAYG_RUNNING', type: 'VPS' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    let vpsProcessed = 0;
    let vpsSuspended = 0;

    if (activePaygVps.length > 0) {
      // ----------------------------------------------------
      // GHOST VPS DETECTION (Self-healing logic)
      // ----------------------------------------------------
      const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
      let ghostVpsIds: number[] = [];
      // Real power state from Proxmox (source of truth for billing). If a node can't be
      // reached, VPS on that node simply fall back to the DB status.
      const realStatusById = new Map<number, 'RUNNING' | 'STOPPED'>();
      
      let ghostErrors: string[] = [];
      if (server) {
        const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
        const vpsByNode: Record<string, typeof activePaygVps> = {};
        for (const vps of activePaygVps) {
          if (!vpsByNode[vps.node]) vpsByNode[vps.node] = [];
          vpsByNode[vps.node].push(vps);
        }

        for (const node of Object.keys(vpsByNode)) {
          try {
            const vms = await proxmox.getVms(node);
            const vmStats = new Map(vms.map((vm: any) => [vm.vmid, vm]));

            for (const vps of vpsByNode[node]) {
              if (vps.vmid && vmStats.has(vps.vmid)) {
                const vm: any = vmStats.get(vps.vmid);
                realStatusById.set(vps.id, vm?.status === 'running' ? 'RUNNING' : 'STOPPED');
              }
              if (vps.vmid && !vmStats.has(vps.vmid)) {
                 // SECURITY FAIL-SAFE: Direct check to avoid false-positives from Proxmox bulk list glitches (e.g. during migration)
                 try {
                   await proxmox.getVmStatus(vps.node, vps.vmid);
                   console.warn(`[Ghost Warning] VPS ${vps.id} (VMID: ${vps.vmid}) missing from bulk list but exists in direct check. Skipped.`);
                   continue; // It actually exists! The bulk list failed. Skip termination.
                 } catch (e: any) {
                   if (!String(e.message || e).includes("does not exist")) {
                     console.warn(`[Ghost Error] Failed to verify VPS ${vps.id} (VMID: ${vps.vmid}):`, e);
                     continue; // Some other Proxmox error (timeout, 500, etc). Don't terminate yet.
                   }
                 }

                 console.log(`[Ghost VPS Detection] VPS ${vps.id} (VMID: ${vps.vmid}) truly not found in Proxmox. Marking as TERMINATED.`);
                 ghostVpsIds.push(vps.id);
                 
                 // Mark as terminated in DB
                 await prisma.vpsService.update({
                   where: { id: vps.id },
                   data: { status: "TERMINATED", vmid: null, vpcIp: null, vpcId: null }
                 });
                 
                 // Free IP Addresses and Detach Reserved IPs
                 for (const ip of vps.assignedIps) {
                   await prisma.vpsIpAssignment.delete({ where: { id: ip.id } });
                 }
                 await prisma.reservedIp.updateMany({
                   where: { vpsId: vps.id },
                   data: { isAttached: false, vpsId: null }
                 });

                 // Finalize running invoice
                 const runningInvoice = vps.invoices[0];
                 if (runningInvoice) {
                   await prisma.invoice.update({
                     where: { id: runningInvoice.id },
                     data: { reference: 'PAYG_COMPLETED' }
                   });
                 }
              }
            }
          } catch (err: any) {
            console.error(`Failed to fetch VMs for node ${node} during hourly-billing ghost detection:`, err);
            ghostErrors.push(err.message || String(err));
          }
        }
      }

      // Filter out ghost VPS from activePaygVps before billing
      const validPaygVps = activePaygVps.filter(vps => !ghostVpsIds.includes(vps.id));

      const pricingItems = await prisma.vpsPricing.findMany();
      const pricing: Record<string, number> = {};
      pricingItems.forEach(item => {
        pricing[item.key] = item.pricePerHour;
      });

      for (const vps of validPaygVps) {
        // Self-heal DB drift: the VM may have been shut down from inside the OS / console
        // (DB still says RUNNING) or started outside the panel (DB still says STOPPED).
        const realStatus = realStatusById.get(vps.id);
        if (realStatus && realStatus !== vps.status) {
          console.warn(`[Hourly Billing] VPS ${vps.id} status drift: DB=${vps.status}, Proxmox=${realStatus}. Syncing DB.`);
          await prisma.vpsService.updateMany({
            where: { id: vps.id, status: vps.status },
            data: { status: realStatus }
          });
          vps.status = realStatus;
        }

        // RUNNING => full rate. STOPPED => storage only (disk/backup/IP), never CPU/RAM.
        const costThisHour = getEffectiveHourlyRate(vps, pricing);

        if (costThisHour <= 0) continue;

        let paymentSuccess = false;

        try {
          await prisma.$transaction(async (tx) => {
            // 1. Atomically deduct from user balance
            const updateResult = await tx.user.updateMany({
              where: { id: vps.userId, balance: { gte: costThisHour } },
              data: { balance: { decrement: costThisHour } }
            });

            if (updateResult.count === 0) {
              throw new Error("INSUFFICIENT_BALANCE");
            }

            // 2. Increment accumulatedCost on VPS for internal tracking
            await tx.vpsService.update({
              where: { id: vps.id },
              data: { accumulatedCost: { increment: costThisHour } }
            });

            // 3. Update the running invoice amount (single invoice per billing cycle, no spam)
            const runningInvoice = vps.invoices[0];
            if (runningInvoice) {
              await tx.invoice.update({
                where: { id: runningInvoice.id },
                data: { amount: { increment: costThisHour } }
              });
            } else {
              const timestamp = Date.now().toString();
              const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
              const invoiceNumber = `INV-${timestamp}-${random}-PAYG`;
              await tx.invoice.create({
                data: {
                  invoiceNumber,
                  userId: vps.userId,
                  vpsServiceId: vps.id,
                  amount: costThisHour,
                  status: 'PAID',
                  paymentMethod: 'Account Balance',
                  merchantOrderId: invoiceNumber,
                  paidAt: new Date(),
                  type: 'VPS',
                  reference: 'PAYG_RUNNING',
                  details: JSON.stringify([
                    {
                      type: 'VPS_PAYG',
                      description: 'Pay-As-You-Go Cloud VPS usage',
                      amount: costThisHour
                    }
                  ])
                }
              });
            }
          });

          paymentSuccess = true;
          vpsProcessed++;
        } catch (e: any) {
          if (e.message === "INSUFFICIENT_BALANCE") {
            paymentSuccess = false;
          } else {
            console.error(`VPS Hourly billing error for VPS ${vps.id}:`, e);
            paymentSuccess = true; // DO NOT suspend for transient DB errors
          }
        }

        if (!paymentSuccess) {
          // Suspend VPS due to insufficient balance
          const defaultTermination = new Date(now);
          defaultTermination.setDate(defaultTermination.getDate() + 3);

          await prisma.vpsService.update({
            where: { id: vps.id },
            data: {
              status: 'SUSPENDED',
              suspendReason: 'Insufficient balance for Pay as You Go hourly billing.',
              terminationDate: defaultTermination
            }
          });
          vpsSuspended++;
          
          const email = decryptDeterministic(vps.user.email) || vps.user.email;
          const name = decryptDeterministic(vps.user.name) || vps.user.name;
          await sendPaygSuspendedEmail(email, name, "VPS Server", "VPS");
          
          try {
            if (server && vps.vmid) {
              const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
              await proxmox.stopVm(vps.node, vps.vmid);
            }
          } catch (e) {
            console.error(`Failed to stop VM ${vps.vmid} for suspension:`, e);
          }
        }
      }
    }

    // Process hourly Reserved IPs
    const activeReservedIps = await prisma.reservedIp.findMany({
      where: { hourlyRate: { gt: 0 } },
      include: { user: true }
    });
    
    let ipProcessed = 0;
    let ipReleased = 0;
    let ipSuspended = 0;

    for (const ip of activeReservedIps) {
      const costThisHour = ip.hourlyRate;
      let paymentSuccess = false;

      try {
        await prisma.$transaction(async (tx) => {
          const updateResult = await tx.user.updateMany({
            where: { id: ip.userId, balance: { gte: costThisHour } },
            data: { balance: { decrement: costThisHour } }
          });
          if (updateResult.count === 0) throw new Error("INSUFFICIENT_BALANCE");
          
          await tx.reservedIp.update({
            where: { id: ip.id },
            data: { accumulatedCost: { increment: costThisHour } }
          });
          
          // ADD TO INVOICE SO IT APPEARS CONSISTENTLY FOR USER
          if (ip.isAttached && ip.vpsId) {
            const runningInvoice = await tx.invoice.findFirst({
              where: { vpsServiceId: ip.vpsId, reference: 'PAYG_RUNNING', type: 'VPS' },
              orderBy: { createdAt: 'desc' }
            });
            if (runningInvoice) {
              await tx.invoice.update({
                where: { id: runningInvoice.id },
                data: { amount: { increment: costThisHour } }
              });
            }
          } else {
            // Find running invoice for this detached IP
            const runningInvoices = await tx.invoice.findMany({
              where: { userId: ip.userId, reference: 'PAYG_RUNNING', type: 'IP_RESERVATION' },
              orderBy: { createdAt: 'desc' }
            });
            const targetInvoice = runningInvoices.find(inv => inv.details?.includes(`"reservedIpId":${ip.id}`));
            
            if (targetInvoice) {
              await tx.invoice.update({
                where: { id: targetInvoice.id },
                data: { amount: { increment: costThisHour } }
              });
            } else {
              const timestamp = Date.now().toString();
              const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
              const invoiceNumber = `INV-${timestamp}-${random}-PAYG`;
              await tx.invoice.create({
                data: {
                  invoiceNumber,
                  userId: ip.userId,
                  amount: costThisHour,
                  status: 'PAID',
                  paymentMethod: 'Account Balance',
                  merchantOrderId: invoiceNumber,
                  type: 'IP_RESERVATION',
                  reference: 'PAYG_RUNNING',
                  paidAt: new Date(),
                  details: JSON.stringify({ reservedIpId: ip.id, ipAddress: ip.ipAddress })
                }
              });
            }
          }
        });
        paymentSuccess = true;
        ipProcessed++;
      } catch (e: any) {
        if (e.message === "INSUFFICIENT_BALANCE") {
          ipSuspended++;
          ipReleased++;
          
          // SECURITY FIX: Actually act on insufficient balance - suspend attached VPS
          try {
            if (ip.isAttached && ip.vpsId) {
              await prisma.vpsService.update({
                where: { id: ip.vpsId },
                data: {
                  status: 'SUSPENDED',
                  suspendReason: `[SYSTEM] Attached Reserved IP (${(ip as any).ipAddress || ip.id}) billing failed due to insufficient balance.`
                }
              });
              
              // Also stop the VM on Proxmox
              const vps = await prisma.vpsService.findUnique({ where: { id: ip.vpsId } });
              if (vps?.vmid) {
                const proxmoxServer = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
                if (proxmoxServer) {
                  const proxmox = new ProxmoxClient(proxmoxServer.host, proxmoxServer.tokenId, proxmoxServer.tokenSecret);
                  await proxmox.stopVm(vps.node, vps.vmid).catch(err => console.error(`Failed to stop VM for reserved IP suspension:`, err));
                }
              }
            }
          } catch (suspendErr) {
            console.error(`Failed to suspend VPS for reserved IP ${ip.id} billing failure:`, suspendErr);
          }
        }
      }
    }

    const billingSummary = {
      subscriptions: {
        processed: processedCount,
        suspended: suspendedCount
      },
      vps: {
        processed: vpsProcessed,
        suspended: vpsSuspended,
        ghostErrors: typeof ghostErrors !== 'undefined' ? ghostErrors : []
      },
      reservedIps: { processed: ipProcessed, insufficientBalance: ipReleased }
    };

    logger.info('Hourly Billing Executed', {
      event: 'billing.execution',
      ...billingSummary
    });

    return NextResponse.json({
      success: true,
      message: 'Hourly billing processed',
      data: billingSummary
    });
  } catch (error) {
    console.error("Hourly billing cron error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
