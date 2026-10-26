import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendBillingReminderEmail, sendSuspensionEmail, sendAutoRenewDisabledSuspensionEmail, sendTerminationEmail, sendRenewalInvoiceEmail, sendAdminServiceSuspendedEmail } from '@/lib/email';
import { decryptDeterministic } from '@/lib/encryption';
import { ProxmoxClient } from '@/lib/proxmox';
import { createDuitkuTransaction } from '@/lib/duitku';
import { attemptAutoUnsuspendAll } from '@/lib/auto-unsuspend';


function generateOrderId(prefix: string = 'INV') {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp}-${random}`;
}

export const dynamic = 'force-dynamic';

// This endpoint should ONLY be called by the internal Docker cron job with the CRON_SECRET header.
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || !authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    let generatedInvoices = 0;
    
    // ============================================
    // SUBSCRIPTION BILLING
    // ============================================

    const threeDaysFromNowStart = new Date(now);
    threeDaysFromNowStart.setDate(threeDaysFromNowStart.getDate() + 3);
    threeDaysFromNowStart.setHours(0, 0, 0, 0);
    
    const threeDaysFromNowEnd = new Date(threeDaysFromNowStart);
    threeDaysFromNowEnd.setHours(23, 59, 59, 999);

    // 0. Renewal Invoices (H-3)
    const renewalSubs = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { gte: threeDaysFromNowStart, lte: threeDaysFromNowEnd }
      },
      include: {
        user: true, plan: true,
        invoices: { where: { status: 'PENDING' } }
      }
    });

    for (const sub of renewalSubs) {
      try {
        if (sub.invoices.length === 0) {
          const merchantOrderId = generateOrderId();
          const email = decryptDeterministic(sub.user.email) || sub.user.email;
          const name = decryptDeterministic(sub.user.name) || sub.user.name;

          let success = false;
          
          if (sub.autoRenew) {
            try {
              await prisma.$transaction(async (tx) => {
                // SECURITY: Atomic lock to prevent Cron Overlap double-billing
                const lockedSub = await tx.subscription.updateMany({
                  where: { id: sub.id, expiresAt: sub.expiresAt },
                  data: { updatedAt: new Date() } // Lock it temporarily
                });
                
                if (lockedSub.count === 0) {
                  throw new Error('ALREADY_PROCESSED');
                }

                const updateResult = await tx.user.updateMany({
                  where: { id: sub.userId, balance: { gte: sub.lockedPrice } },
                  data: { balance: { decrement: sub.lockedPrice } }
                });

                if (updateResult.count === 0) {
                  throw new Error('INSUFFICIENT_BALANCE');
                }

                const newExpiry = new Date(sub.expiresAt || new Date());
                newExpiry.setMonth(newExpiry.getMonth() + 1);

                await tx.invoice.create({
                  data: {
                    invoiceNumber: merchantOrderId,
                    userId: sub.userId,
                    subscriptionId: sub.id,
                    amount: sub.lockedPrice,
                    status: 'PAID',
                    merchantOrderId: merchantOrderId,
                    paymentMethod: 'Account Balance',
                    type: 'SUBSCRIPTION',
                    paidAt: new Date()
                  }
                });

                await tx.subscription.update({
                  where: { id: sub.id },
                  data: { expiresAt: newExpiry }
                });
              });
              success = true;
              console.log(`Subscription ${sub.id} auto-renewed via balance deduction`);
            } catch (e: any) {
              // Expected if insufficient balance
            }
          }

          if (!success) {
            // Insufficient balance, create pending invoice
            await prisma.invoice.create({
              data: {
                invoiceNumber: merchantOrderId,
                userId: sub.userId,
                subscriptionId: sub.id,
                amount: sub.lockedPrice,
                status: 'PENDING',
                merchantOrderId: merchantOrderId,
                type: 'SUBSCRIPTION'
              }
            });

            await sendRenewalInvoiceEmail(email, name, sub.plan.name, sub.plan.service, sub.expiresAt, merchantOrderId, sub.lockedPrice).catch(e => console.error(e));
            console.log(`Subscription ${sub.id} generated PENDING invoice`);
          }
          generatedInvoices++;
        }
      } catch (e) {
        console.error(`Failed generating renewal invoice for sub ${sub.id}:`, e);
      }
    }
    
    // 1. Reminders (H-1)
    const tomorrowStart = new Date(now);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);
    
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const expiringSubs = await prisma.subscription.findMany({
      where: { status: 'ACTIVE', expiresAt: { gte: tomorrowStart, lte: tomorrowEnd } },
      include: { user: true, plan: true }
    });

    for (const sub of expiringSubs) {
      try {
        const email = decryptDeterministic(sub.user.email) || sub.user.email;
        const name = decryptDeterministic(sub.user.name) || sub.user.name;
        await sendBillingReminderEmail(email, name, sub.plan.name, sub.plan.service, sub.expiresAt).catch(e => console.error(e));
      } catch (e) {
        console.error(`Failed reminder for sub ${sub.id}:`, e);
      }
    }

    // 2. Suspensions (H=0)
    const expiredSubs = await prisma.subscription.findMany({
      where: { status: 'ACTIVE', expiresAt: { lt: now } },
      include: { user: true, plan: true }
    });

    for (const sub of expiredSubs) {
      try {
        const defaultTermination = new Date(now);
        defaultTermination.setDate(defaultTermination.getDate() + 3);

        const isAutoRenewDisabled = !sub.autoRenew;
        const reason = isAutoRenewDisabled 
          ? 'Canceled by user (Auto-renew disabled)' 
          : 'Insufficient balance for subscription renewal';

        await prisma.subscription.update({
          where: { id: sub.id },
          data: { 
            status: 'SUSPENDED', 
            suspendReason: reason,
            terminationDate: defaultTermination
          }
        });
        const email = decryptDeterministic(sub.user.email) || sub.user.email;
        const name = decryptDeterministic(sub.user.name) || sub.user.name;
        
        if (isAutoRenewDisabled) {
          await sendAutoRenewDisabledSuspensionEmail(email, name, sub.plan.name, sub.plan.service).catch(e => console.error(e));
        } else {
          await sendSuspensionEmail(email, name, sub.plan.name, sub.plan.service).catch(e => console.error(e));
        }
        await sendAdminServiceSuspendedEmail(name, email, sub.plan.name, sub.plan.service).catch(e => console.error(e));


      } catch (e) {
        console.error(`Failed suspension for sub ${sub.id}:`, e);
      }
    }

    // 3. Terminations (H+3)
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const terminatedSubs = await prisma.subscription.findMany({
      where: { 
        status: 'SUSPENDED', 
        OR: [
          { terminationDate: { lte: now } },
          { terminationDate: null, expiresAt: { lt: threeDaysAgo } }
        ]
      },
      include: { user: true, plan: true },
      take: 20 // Process in chunks to prevent timeout
    });

    for (const sub of terminatedSubs) {
      try {
        // Anti-Race Condition: Lock the status to TERMINATING before termination
        const lockedSub = await prisma.subscription.updateMany({
          where: { id: sub.id, status: 'SUSPENDED' },
          data: { status: 'TERMINATING' }
        });
        
        if (lockedSub.count === 0) continue;

        await prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'TERMINATED' }
        });



        const email = decryptDeterministic(sub.user.email) || sub.user.email;
        const name = decryptDeterministic(sub.user.name) || sub.user.name;
        await sendTerminationEmail(email, name, sub.plan.name, sub.plan.service).catch(e => console.error(e));
      } catch (e) {
        console.error(`Failed termination for sub ${sub.id}:`, e);
        try {
          const nextRetry = new Date();
          nextRetry.setHours(nextRetry.getHours() + 1);
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'SUSPENDED', terminationDate: nextRetry }
          });
        } catch (retryErr) {
          console.error("Failed to update retry date:", retryErr);
        }
      }
    }
    // ============================================
    // HOURLY SUBSCRIPTION MONTHLY INVOICE ROTATION
    // ============================================
    // For subscriptions with cycle='HOURLY' (File CDN, etc.),
    // the running invoice accumulates hourly charges. Every 30 days,
    // we finalize the running invoice and create a new one for the next cycle.
    // This is the same pattern as VPS monthly cycle rotation.

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const hourlySubsWithOldInvoice = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        cycle: 'HOURLY'
      },
      include: {
        user: true,
        plan: true,
        invoices: {
          where: { reference: 'PAYG_RUNNING', type: 'SUBSCRIPTION' },
          orderBy: { createdAt: 'desc' as const },
          take: 1
        }
      }
    });

    for (const sub of hourlySubsWithOldInvoice) {
      try {
        const runningInvoice = sub.invoices[0];
        if (!runningInvoice) continue;

        // Only rotate if the running invoice is older than 30 days
        if (new Date(runningInvoice.createdAt) > thirtyDaysAgo) continue;

        await prisma.$transaction(async (tx) => {
          // Finalize the current running invoice
          await tx.invoice.update({
            where: { id: runningInvoice.id },
            data: { reference: 'PAYG_COMPLETED' }
          });

          // Create a new running invoice for the next billing cycle
          const merchantOrderId = generateOrderId('INV-PAYG');
          await tx.invoice.create({
            data: {
              invoiceNumber: merchantOrderId,
              userId: sub.userId,
              subscriptionId: sub.id,
              amount: 0,
              status: 'PAID',
              paymentMethod: 'Account Balance',
              merchantOrderId: merchantOrderId,
              type: 'SUBSCRIPTION',
              paidAt: new Date(),
              reference: 'PAYG_RUNNING',
              details: JSON.stringify({ type: 'PAYG_MONTHLY_CYCLE' })
            }
          });
        });

        console.log(`Subscription ${sub.id} monthly invoice rotation completed`);
      } catch (e) {
        console.error(`Failed monthly invoice rotation for subscription ${sub.id}:`, e);
      }
    }

    // ============================================
    // VPS PAYG & MONTHLY BILLING
    // ============================================


    // 0.5 VPS H-1 Suspension Warning
    const oneDayFromNowStart = new Date(now);
    oneDayFromNowStart.setHours(oneDayFromNowStart.getHours() + 24);
    const oneDayFromNowEnd = new Date(oneDayFromNowStart);
    oneDayFromNowEnd.setHours(23, 59, 59, 999);

    const vpsWarning = await prisma.vpsService.findMany({
      where: {
        status: { in: ['RUNNING', 'STOPPED'] },
        expiresAt: { gte: oneDayFromNowStart, lte: oneDayFromNowEnd }
      },
      include: {
        user: true,
        invoices: { where: { status: 'PENDING', type: 'VPS' } }
      }
    });

    for (const vps of vpsWarning) {
      if (vps.invoices.length > 0) { // Only warn if there's an unpaid invoice
        const invoice = vps.invoices[0];
        if (vps.user.balance < invoice.amount) { // And balance is insufficient
          const email = decryptDeterministic(vps.user.email) || vps.user.email;
          const name = decryptDeterministic(vps.user.name) || vps.user.name;
          import('@/lib/email').then(({ sendSuspensionWarningEmail }) => {
            sendSuspensionWarningEmail(email, name, "VPS Server", "VPS").catch(console.error);
          });
        }
      }
    }

    // 1. VPS PAYG Monthly Cycle Rotation (H=0)
    // Since hourly-billing cron deducts from balance every hour,
    // the monthly billing just needs to rotate the running invoice:
    // - Finalize current running invoice
    // - Create a new running invoice for the next cycle
    // - Reset accumulatedCost and extend expiresAt
    const expiredVps = await prisma.vpsService.findMany({
      where: {
        status: { in: ['RUNNING', 'STOPPED'] },
        expiresAt: { lt: now }
      },
      include: { 
        user: true, 
        invoices: { 
          where: { reference: 'PAYG_RUNNING', type: 'VPS' }, 
          orderBy: { createdAt: 'desc' as const },
          take: 1 
        } 
      }
    });

    for (const vps of expiredVps) {
      try {
        const hourlyRate = vps.hourlyRate || 0;
        const hasSufficientBalance = vps.isReseller
          ? vps.user.balance >= (hourlyRate * 730)
          : (vps.user.balance >= hourlyRate && vps.user.balance > 0);

        // A PAYG customer with sufficient balance must have their monthly cycle rotated
        // and keep running smoothly as an existing customer!
        if (vps.autoRenew || (!vps.isReseller && hasSufficientBalance)) {
          let paymentSuccess = true;
          
          if (vps.isReseller) {
            const monthlyCost = (vps.hourlyRate || 0) * 730;
            if (monthlyCost > 0) {
              const updateResult = await prisma.user.updateMany({
                where: { id: vps.userId, balance: { gte: monthlyCost } },
                data: { balance: { decrement: monthlyCost } }
              });
              if (updateResult.count === 0) {
                paymentSuccess = false;
              }
            }
          }

          if (paymentSuccess) {
            await prisma.$transaction(async (tx) => {
              // Finalize the current running invoice
              const runningInvoice = vps.invoices[0];
              if (runningInvoice) {
                await tx.invoice.update({
                  where: { id: runningInvoice.id },
                  data: { reference: 'PAYG_COMPLETED' }
                });
              }
  
              // Extend the billing cycle by 1 month
              const newExpires = new Date(vps.expiresAt || now);
              if (newExpires < now) newExpires.setTime(now.getTime());
              newExpires.setMonth(newExpires.getMonth() + 1);
  
              await tx.vpsService.update({
                where: { id: vps.id },
                data: { 
                  expiresAt: newExpires,
                  accumulatedCost: 0,
                  autoRenew: true
                }
              });
  
              // Track attached Reserved IPs baseline so hourly additions in the new cycle are exact
              const attachedIps = await tx.reservedIp.findMany({
                where: { vpsId: vps.id, isAttached: true }
              });
              const syncedIpCosts: Record<number, number> = {};
              for (const ip of attachedIps) {
                syncedIpCosts[ip.id] = ip.accumulatedCost;
              }

              // Create a new running invoice for the next billing cycle
              const merchantOrderId = generateOrderId('INV-PAYG');
              const invoiceAmount = vps.isReseller ? (vps.hourlyRate || 0) * 730 : 0;
              await tx.invoice.create({
                data: {
                  invoiceNumber: merchantOrderId,
                  userId: vps.userId,
                  vpsServiceId: vps.id,
                  amount: invoiceAmount,
                  status: 'PAID',
                  paymentMethod: 'Account Balance',
                  merchantOrderId: merchantOrderId,
                  type: 'VPS',
                  paidAt: new Date(),
                  reference: 'PAYG_RUNNING',
                  details: JSON.stringify({
                    type: 'PAYG_MONTHLY_CYCLE',
                    isReseller: vps.isReseller,
                    _syncedReservedIpCosts: syncedIpCosts
                  })
                }
              });
            });
          } else {
            // Insufficient balance for reseller upfront payment -> suspend
            const defaultTermination = new Date(now);
            defaultTermination.setDate(defaultTermination.getDate() + 3);

            await prisma.vpsService.update({
              where: { id: vps.id },
              data: { 
                status: 'SUSPENDED', 
                suspendReason: 'Insufficient balance for Reseller monthly renewal',
                terminationDate: defaultTermination
              }
            });
            
            const email = decryptDeterministic(vps.user.email) || vps.user.email;
            const name = decryptDeterministic(vps.user.name) || vps.user.name;
            await sendSuspensionEmail(email, name, "VPS Server", "VPS").catch(e => console.error(e));
            
            try {
              const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
              if (server && vps.vmid) {
                const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
                await proxmox.stopVm(vps.node, vps.vmid);
              }
            } catch (e) {
              console.error(`Failed to stop VM ${vps.vmid} for suspension:`, e);
            }
          }
        } else {
          // autoRenew is off AND balance is insufficient → suspend
          const defaultTermination = new Date(now);
          defaultTermination.setDate(defaultTermination.getDate() + 3);

          await prisma.vpsService.update({
            where: { id: vps.id },
            data: { 
              status: 'SUSPENDED', 
              suspendReason: 'Insufficient balance for Pay as You Go monthly renewal',
              terminationDate: defaultTermination
            }
          });
          
          const email = decryptDeterministic(vps.user.email) || vps.user.email;
          const name = decryptDeterministic(vps.user.name) || vps.user.name;
          await sendAutoRenewDisabledSuspensionEmail(email, name, "VPS Server", "VPS").catch(e => console.error(e));
          await sendAdminServiceSuspendedEmail(name, email, "VPS Server", "VPS").catch(e => console.error(e));
          
          try {
            const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
            if (server && vps.vmid) {
              const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
              await proxmox.stopVm(vps.node, vps.vmid);
            }
          } catch (e) {
            console.error(`Failed to stop VM ${vps.vmid} for suspension:`, e);
          }
        }
      } catch (e) {
        console.error(`Failed monthly cycle rotation for VPS ${vps.id}:`, e);
      }
    }

    // 1.5 Auto-Unsuspend for all suspended services with autoRenew enabled & sufficient balance
    try {
      await attemptAutoUnsuspendAll();
    } catch (e) {
      console.error('Failed batch auto-unsuspend in cron:', e);
    }

    // 2. VPS Terminations (H+3)
    const terminatedVpsList = await prisma.vpsService.findMany({
      where: {
        status: 'SUSPENDED',
        OR: [
          { terminationDate: { lte: now } },
          { terminationDate: null, expiresAt: { lt: threeDaysAgo } }
        ],
        NOT: {
          suspendReason: {
            contains: '[ABUSE_LOCKED]'
          }
        }
      },
      include: { user: true },
      take: 10 // Safe limit for VPS termination to prevent timeout
    });

    for (const vps of terminatedVpsList) {
      try {
        // Anti-Race Condition: Lock status before termination
        const lockedVps = await prisma.vpsService.updateMany({
          where: { id: vps.id, status: 'SUSPENDED' },
          data: { status: 'TERMINATING' }
        });
        
        if (lockedVps.count === 0) continue;

        // Terminate on Proxmox FIRST
        const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
        if (server && vps.vmid) {
          const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
          try {
            const vmStatus = await proxmox.getVmStatus(vps.node, vps.vmid);
            if (vmStatus && vmStatus.status === 'running') {
              await proxmox.stopVm(vps.node, vps.vmid);
              // Wait briefly for VM to stop fully before deleting
              await new Promise(r => setTimeout(r, 5000));
            }
            await proxmox.deleteVm(vps.node, vps.vmid);
          } catch (e: any) {
            // If the VM is already deleted or not found (code 500/404 with specific msg), it's safe to proceed.
            // Otherwise, we throw an error so the DB status is not updated, allowing it to retry next time.
            if (e && String(e.message).includes("does not exist")) {
               // VM already gone, safe to proceed
            } else {
               throw new Error(`Failed to delete VMID ${vps.vmid} from Proxmox: ${e.message}`);
            }
          }
        }

        // Only after Proxmox deletion succeeds (or if no vmid exists), we update the DB
        await prisma.$transaction(async (tx) => {
          await tx.vpsService.update({
            where: { id: vps.id },
            data: { 
              status: 'TERMINATED',
              vmid: null,
              vpcIp: null,
              vpcId: null 
            }
          });
          
          // Clean up IP assignment to prevent IP exhaustion
          await tx.vpsIpAssignment.deleteMany({
            where: { vpsId: vps.id }
          });

          // Detach reserved IPs so they remain owned and billed to the user
          await tx.reservedIp.updateMany({
            where: { vpsId: vps.id },
            data: { isAttached: false, vpsId: null }
          });
        });
        
        const email = decryptDeterministic(vps.user.email) || vps.user.email;
        const name = decryptDeterministic(vps.user.name) || vps.user.name;
        await sendTerminationEmail(email, name, "VPS Server", "VPS").catch(e => console.error(e));
        
      } catch (e) {
        console.error(`Failed termination for VPS ${vps.id} (Will retry next run):`, e);
        try {
          const nextRetry = new Date();
          nextRetry.setHours(nextRetry.getHours() + 1);
          await prisma.vpsService.update({
            where: { id: vps.id },
            data: { status: 'SUSPENDED', terminationDate: nextRetry }
          });
        } catch (retryErr) {
          console.error("Failed to update retry date:", retryErr);
        }
      }
    }

    // ============================================
    // RESERVED IPS BILLING
    // ============================================
    const expiredReservedIps = await prisma.reservedIp.findMany({
      where: {
        expiresAt: { lt: now }
      },
      include: { user: true }
    });

    for (const ip of expiredReservedIps) {
      const amountToPay = ip.accumulatedCost;
      
      let paymentSuccess = false;
      if (amountToPay > 0) {
        try {
          await prisma.$transaction(async (tx) => {
            const lockedIp = await tx.reservedIp.updateMany({
              where: { id: ip.id, expiresAt: ip.expiresAt },
              data: { updatedAt: new Date() }
            });
            if (lockedIp.count === 0) throw new Error('ALREADY_PROCESSED');

            const updateResult = await tx.user.updateMany({
              where: { id: ip.userId, balance: { gte: amountToPay } },
              data: { balance: { decrement: amountToPay } }
            });
            if (updateResult.count === 0) {
              throw new Error("INSUFFICIENT_BALANCE");
            }
          
          const merchantOrderId = generateOrderId() + '-RESIP';
          await tx.invoice.create({
            data: {
              invoiceNumber: merchantOrderId,
              userId: ip.userId,
              amount: amountToPay,
              status: 'PAID',
              paymentMethod: 'Account Balance',
              merchantOrderId: merchantOrderId,
              type: 'IP_RESERVATION',
              paidAt: new Date(),
              details: JSON.stringify({ reservedIpId: ip.id, ipAddress: ip.ipAddress })
            }
          });

          if (ip.autoRenew) {
            const newExpires = new Date(ip.expiresAt || now);
            newExpires.setMonth(newExpires.getMonth() + 1);

            await tx.reservedIp.update({
              where: { id: ip.id },
              data: { 
                expiresAt: newExpires,
                accumulatedCost: 0 
              }
            });
          } else {
            await tx.reservedIp.update({
              where: { id: ip.id },
              data: { accumulatedCost: 0 }
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
            console.error("Reserved IP Auto-deduct error:", e);
            paymentSuccess = true; // DO NOT release IP for transient DB errors
          }
        }
      } else if (amountToPay === 0) {
        paymentSuccess = true;
        if (ip.autoRenew) {
           const newExpires = new Date(ip.expiresAt || now);
           newExpires.setMonth(newExpires.getMonth() + 1);
           await prisma.reservedIp.update({
             where: { id: ip.id },
             data: { 
               expiresAt: newExpires,
               accumulatedCost: 0 
             }
           });
        }
      }

      if (!paymentSuccess || !ip.autoRenew) {
        // If payment failed for PAYG, create PENDING invoice
        if (!paymentSuccess && amountToPay > 0) {
           const merchantOrderId = generateOrderId() + '-RESIP';
           await prisma.invoice.create({
              data: {
                 invoiceNumber: merchantOrderId,
                 userId: ip.userId,
                 amount: amountToPay,
                 status: 'PENDING',
                 merchantOrderId: merchantOrderId,
                 type: 'IP_RESERVATION',
                 details: JSON.stringify({ reservedIpId: ip.id, ipAddress: ip.ipAddress, type: 'PAYG_MONTHLY_USAGE' })
              }
           });
        }

        // Insufficient balance or autoRenew off, release the IP
        if (ip.isAttached && ip.vpsId) {
          // Suspend the VPS it is attached to, to prevent exploit (using IP without paying reservation fee)
          await prisma.vpsService.update({
            where: { id: ip.vpsId },
            data: { 
              status: 'SUSPENDED', 
              suspendReason: `[SYSTEM] The attached Reserved IP (${ip.ipAddress}) has expired due to insufficient balance or disabled auto-renew.` 
            }
          });
        }
        
        await prisma.reservedIp.delete({
          where: { id: ip.id }
        });
      }
    }



    return NextResponse.json({
      success: true,
      processed: {
        invoicesGenerated: generatedInvoices,
        suspensions: expiredSubs.length + expiredVps.length,
        terminations: terminatedSubs.length + terminatedVpsList.length
      }
    });
  } catch (error) {
    console.error('Billing Cron Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
