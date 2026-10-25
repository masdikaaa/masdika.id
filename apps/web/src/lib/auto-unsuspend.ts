import { prisma } from '@/lib/prisma';
import { decryptDeterministic } from '@/lib/encryption';
import { sendReactivatedEmail, sendAdminServiceReactivatedEmail } from '@/lib/email';

function generateOrderId(prefix: string = 'INV') {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp}-${random}`;
}

async function startProxmoxVmSafely(node: string, vmid: number | null | undefined) {
  if (!vmid) return;
  try {
    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (server) {
      const { ProxmoxClient } = await import('@/lib/proxmox');
      const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
      await proxmox.startVm(node, vmid);
    }
  } catch (err) {
    console.error(`[Auto-Unsuspend] Failed to start Proxmox VM ${vmid} on node ${node}:`, err);
  }
}

/**
 * Attempts to unsuspend a VPS service if its autoRenew is enabled and user has sufficient balance.
 */
export async function attemptAutoUnsuspendVps(vpsId: number) {
  try {
    const vps = await prisma.vpsService.findUnique({
      where: { id: vpsId },
      include: {
        user: true,
        invoices: {
          where: { reference: 'PAYG_RUNNING', type: 'VPS' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!vps) {
      return { success: false, message: 'VPS not found' };
    }

    if (vps.status !== 'SUSPENDED') {
      return { success: true, unsuspended: false, message: 'VPS is already active' };
    }

    const hourlyRate = vps.hourlyRate || 0;
    const user = vps.user;
    const hasSufficientBalance = vps.isReseller
      ? user.balance >= (hourlyRate * 730)
      : (user.balance >= hourlyRate && user.balance > 0);

    if (!vps.autoRenew && !hasSufficientBalance) {
      return { success: false, unsuspended: false, reason: 'AUTORENEW_DISABLED', message: 'Auto-renew is disabled and balance is insufficient' };
    }

    const now = new Date();

    if (vps.isReseller) {
      const monthlyCost = (vps.hourlyRate || 0) * 730;
      if (monthlyCost > 0 && user.balance < monthlyCost) {
        return {
          success: false,
          unsuspended: false,
          reason: 'INSUFFICIENT_BALANCE',
          requiredBalance: monthlyCost,
          currentBalance: user.balance,
          message: 'Insufficient balance for Reseller VPS renewal'
        };
      }

      await prisma.$transaction(async (tx) => {
        if (monthlyCost > 0) {
          const updateResult = await tx.user.updateMany({
            where: { id: user.id, balance: { gte: monthlyCost } },
            data: { balance: { decrement: monthlyCost } }
          });
          if (updateResult.count === 0) {
            throw new Error('INSUFFICIENT_BALANCE');
          }
        }

        const runningInvoice = vps.invoices[0];
        if (runningInvoice) {
          await tx.invoice.update({
            where: { id: runningInvoice.id },
            data: { reference: 'PAYG_COMPLETED' }
          });
        }

        const newExpires = new Date(now);
        newExpires.setMonth(newExpires.getMonth() + 1);

        await tx.vpsService.update({
          where: { id: vps.id },
          data: {
            status: 'RUNNING',
            suspendReason: null,
            terminationDate: null,
            expiresAt: newExpires,
            accumulatedCost: 0
          }
        });

        const merchantOrderId = generateOrderId('INV') + '-VPS-PAYG';
        await tx.invoice.create({
          data: {
            invoiceNumber: merchantOrderId,
            userId: user.id,
            vpsServiceId: vps.id,
            amount: monthlyCost,
            status: 'PAID',
            paymentMethod: 'Account Balance',
            merchantOrderId,
            type: 'VPS',
            paidAt: new Date(),
            reference: 'PAYG_RUNNING',
            details: JSON.stringify({ type: 'PAYG_MONTHLY_CYCLE_UNSUSPEND', isReseller: true })
          }
        });
      });
    } else {
      // Regular PAYG VPS
      const hourlyRate = vps.hourlyRate || 0;
      if (user.balance < hourlyRate || user.balance <= 0) {
        return {
          success: false,
          unsuspended: false,
          reason: 'INSUFFICIENT_BALANCE',
          requiredBalance: Math.max(hourlyRate, 1),
          currentBalance: user.balance,
          message: 'Insufficient balance for Pay as You Go billing'
        };
      }

      await prisma.$transaction(async (tx) => {
        const runningInvoice = vps.invoices[0];
        if (runningInvoice) {
          await tx.invoice.update({
            where: { id: runningInvoice.id },
            data: { reference: 'PAYG_COMPLETED' }
          });
        }

        const newExpires = new Date(vps.expiresAt || now);
        if (newExpires < now) newExpires.setTime(now.getTime());
        newExpires.setMonth(newExpires.getMonth() + 1);

        await tx.vpsService.update({
          where: { id: vps.id },
          data: {
            status: 'RUNNING',
            suspendReason: null,
            terminationDate: null,
            expiresAt: newExpires,
            accumulatedCost: 0,
            autoRenew: true
          }
        });

        const merchantOrderId = generateOrderId('INV') + '-VPS-PAYG';
        await tx.invoice.create({
          data: {
            invoiceNumber: merchantOrderId,
            userId: user.id,
            vpsServiceId: vps.id,
            amount: 0,
            status: 'PAID',
            paymentMethod: 'Account Balance',
            merchantOrderId,
            type: 'VPS',
            paidAt: new Date(),
            reference: 'PAYG_RUNNING',
            details: JSON.stringify({ type: 'PAYG_MONTHLY_CYCLE_UNSUSPEND', isReseller: false })
          }
        });
      });
    }

    // Start VM in Proxmox
    await startProxmoxVmSafely(vps.node, vps.vmid);

    // Send notifications
    const email = decryptDeterministic(user.email) || user.email;
    const name = decryptDeterministic(user.name) || user.name;
    if (email) {
      sendReactivatedEmail(email, name, vps.hostname || 'VPS Server', 'VPS').catch(console.error);
      sendAdminServiceReactivatedEmail(name, email, vps.hostname || 'VPS Server', 'VPS').catch(console.error);
    }

    return {
      success: true,
      unsuspended: true,
      message: 'VPS unsuspend successfully'
    };
  } catch (err: any) {
    console.error(`[Auto-Unsuspend] Error unsuspending VPS ${vpsId}:`, err);
    if (err.message === 'INSUFFICIENT_BALANCE') {
      return { success: false, unsuspended: false, reason: 'INSUFFICIENT_BALANCE', message: 'Insufficient balance' };
    }
    return { success: false, unsuspended: false, message: err.message || 'Error unsuspending VPS' };
  }
}

/**
 * Attempts to unsuspend a Subscription (CDN, Object Storage, Shortener, API Hub, etc.)
 */
export async function attemptAutoUnsuspendSubscription(subscriptionId: number) {
  try {
    const sub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        user: true,
        plan: true,
        invoices: {
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!sub) {
      return { success: false, message: 'Subscription not found' };
    }

    if (sub.status !== 'SUSPENDED') {
      return { success: true, unsuspended: false, message: 'Subscription is already active' };
    }

    if (!sub.autoRenew) {
      return { success: false, unsuspended: false, reason: 'AUTORENEW_DISABLED', message: 'Auto-renew is disabled for this subscription' };
    }

    const now = new Date();
    const user = sub.user;
    const isHourly = sub.cycle === 'HOURLY';
    const requiredAmount = isHourly
      ? (sub.lockedHourlyPrice || sub.plan.hourlyPrice || 0)
      : (sub.lockedPrice || sub.plan.price || 0);

    if (user.balance < requiredAmount) {
      return {
        success: false,
        unsuspended: false,
        reason: 'INSUFFICIENT_BALANCE',
        requiredBalance: requiredAmount,
        currentBalance: user.balance,
        message: 'Insufficient balance for subscription renewal'
      };
    }

    await prisma.$transaction(async (tx) => {
      if (requiredAmount > 0) {
        const updateResult = await tx.user.updateMany({
          where: { id: user.id, balance: { gte: requiredAmount } },
          data: { balance: { decrement: requiredAmount } }
        });
        if (updateResult.count === 0) {
          throw new Error('INSUFFICIENT_BALANCE');
        }
      }

      // Finalize pending invoice if one exists, otherwise create a new paid invoice
      const pendingInvoice = sub.invoices[0];
      if (pendingInvoice) {
        await tx.invoice.update({
          where: { id: pendingInvoice.id },
          data: {
            status: 'PAID',
            paymentMethod: 'Account Balance',
            paidAt: new Date(),
            amount: requiredAmount
          }
        });
      } else {
        const merchantOrderId = generateOrderId('INV');
        await tx.invoice.create({
          data: {
            invoiceNumber: merchantOrderId,
            userId: user.id,
            subscriptionId: sub.id,
            amount: requiredAmount,
            status: 'PAID',
            paymentMethod: 'Account Balance',
            merchantOrderId,
            type: 'SUBSCRIPTION',
            paidAt: new Date(),
            reference: isHourly ? 'PAYG_RUNNING' : undefined
          }
        });
      }

      const newExpires = new Date(sub.expiresAt || now);
      if (newExpires < now) newExpires.setTime(now.getTime());
      if (isHourly) {
        newExpires.setTime(newExpires.getTime() + 60 * 60 * 1000);
      } else {
        newExpires.setMonth(newExpires.getMonth() + 1);
      }

      await tx.subscription.update({
        where: { id: sub.id },
        data: {
          status: 'ACTIVE',
          suspendReason: null,
          terminationDate: null,
          expiresAt: newExpires
        }
      });
    });

    // Send notifications
    const email = decryptDeterministic(user.email) || user.email;
    const name = decryptDeterministic(user.name) || user.name;
    if (email) {
      sendReactivatedEmail(email, name, sub.plan.name, sub.plan.service).catch(console.error);
      sendAdminServiceReactivatedEmail(name, email, sub.plan.name, sub.plan.service).catch(console.error);
    }

    return {
      success: true,
      unsuspended: true,
      message: 'Subscription unsuspend successfully'
    };
  } catch (err: any) {
    console.error(`[Auto-Unsuspend] Error unsuspending Subscription ${subscriptionId}:`, err);
    if (err.message === 'INSUFFICIENT_BALANCE') {
      return { success: false, unsuspended: false, reason: 'INSUFFICIENT_BALANCE', message: 'Insufficient balance' };
    }
    return { success: false, unsuspended: false, message: err.message || 'Error unsuspending subscription' };
  }
}

/**
 * Attempts to unsuspend all suspended services (VPS + Subscriptions) for a given user.
 * Typically triggered right after balance top-up payment confirmation.
 */
export async function attemptAutoUnsuspendAllForUser(userId: number) {
  let vpsCount = 0;
  let subCount = 0;
  const errors: any[] = [];

  try {
    const suspendedVps = await prisma.vpsService.findMany({
      where: {
        userId,
        status: 'SUSPENDED',
        autoRenew: true
      },
      select: { id: true }
    });

    for (const vps of suspendedVps) {
      const res = await attemptAutoUnsuspendVps(vps.id);
      if (res.unsuspended) {
        vpsCount++;
      } else if (res.reason !== 'INSUFFICIENT_BALANCE') {
        errors.push({ type: 'VPS', id: vps.id, message: res.message });
      }
    }

    const suspendedSubs = await prisma.subscription.findMany({
      where: {
        userId,
        status: 'SUSPENDED',
        autoRenew: true
      },
      select: { id: true }
    });

    for (const sub of suspendedSubs) {
      const res = await attemptAutoUnsuspendSubscription(sub.id);
      if (res.unsuspended) {
        subCount++;
      } else if (res.reason !== 'INSUFFICIENT_BALANCE') {
        errors.push({ type: 'SUBSCRIPTION', id: sub.id, message: res.message });
      }
    }
  } catch (err) {
    console.error(`[Auto-Unsuspend] Failed to auto-unsuspend all for user ${userId}:`, err);
    errors.push(err);
  }

  return { vpsCount, subCount, errors };
}

/**
 * Global batch check for all suspended services with autoRenew=true across the entire platform.
 * Called by cron billing routines to ensure no eligible service stays suspended.
 */
export async function attemptAutoUnsuspendAll() {
  let vpsCount = 0;
  let subCount = 0;
  const errors: any[] = [];

  try {
    const suspendedVps = await prisma.vpsService.findMany({
      where: {
        status: 'SUSPENDED'
      },
      select: { id: true }
    });

    for (const vps of suspendedVps) {
      const res = await attemptAutoUnsuspendVps(vps.id);
      if (res.unsuspended) vpsCount++;
    }

    const suspendedSubs = await prisma.subscription.findMany({
      where: {
        status: 'SUSPENDED'
      },
      select: { id: true }
    });

    for (const sub of suspendedSubs) {
      const res = await attemptAutoUnsuspendSubscription(sub.id);
      if (res.unsuspended) subCount++;
    }
  } catch (err) {
    console.error('[Auto-Unsuspend] Global auto-unsuspend batch failed:', err);
    errors.push(err);
  }

  return { vpsCount, subCount, errors };
}
