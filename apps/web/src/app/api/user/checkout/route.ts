import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { decryptDeterministic } from "@/lib/encryption";
import {
  sendCustomerInvoiceEmail,
  sendCustomerPaymentSuccessEmail,
  sendAdminNewOrderEmail,
} from "@/lib/email";

function generateOrderId() {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `INV-${timestamp}-${random}`;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const userId = auth.userId!;
    const rawEmail = auth.user!.email || '';
    const decryptedEmailVal = decryptDeterministic(rawEmail);
    const userEmail = (decryptedEmailVal && decryptedEmailVal.includes('@')) ? decryptedEmailVal : (rawEmail.includes('@') ? rawEmail : 'customer@masdika.id');
    const rawName = auth.user!.name || '';
    const decryptedName = decryptDeterministic(rawName);
    const userName = decryptedName || rawName || 'Customer';
    const { planId, paymentMethodCode, upgradeSubscriptionId } = await req.json();

    if (!planId || !paymentMethodCode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) {
      return NextResponse.json({ error: "Invalid or inactive plan" }, { status: 400 });
    }

    const isBalancePayment = true;
    let paymentMethod = { code: 'BALANCE', name: 'Account Balance', fee: 0, isActive: true };

    if (plan.hourlyPrice === 0) {
      return NextResponse.json({ error: "This plan does not support PAYG." }, { status: 400 });
    }

    const settings = await prisma.setting.findMany();
    const getSetting = (key: string, defaultValue: string = "true") => {
      const s = settings.find(x => x.key === key);
      return s ? s.value : defaultValue;
    };

    if (plan.service === 'OBJECT_STORAGE' && getSetting('object_storage_enabled') === 'false') {
      return NextResponse.json({ error: "File CDN service is currently disabled." }, { status: 403 });
    }
    if (plan.service === 'CDN' && getSetting('cdn_enabled') === 'false') {
      return NextResponse.json({ error: "CDN service is currently disabled." }, { status: 403 });
    }



    const { getSuspendedSubscription } = await import('@/lib/subscription');
    
    let currentSub = null;
    let suspendedSub = null;
    
    if (upgradeSubscriptionId) {
      currentSub = await prisma.subscription.findUnique({
        where: { id: upgradeSubscriptionId },
        include: { plan: true }
      });
      
      if (!currentSub || currentSub.userId !== userId) {
        return NextResponse.json({ error: "Invalid subscription to upgrade" }, { status: 400 });
      }
      
      if (currentSub.status === 'SUSPENDED') {
        suspendedSub = currentSub;
        currentSub = null;
      }
      
      // Prevent Downgrade on this specific subscription
      if (currentSub && currentSub.status === 'ACTIVE' && plan.price < currentSub.plan.price) {
        return NextResponse.json({ 
          error: `You cannot downgrade to a cheaper plan while your current ${currentSub.plan.name} plan is active.` 
        }, { status: 400 });
      }
    }

    let credit = 0;
    if (currentSub && currentSub.status === 'ACTIVE') {
      const now = new Date();
      const expires = new Date(currentSub.expiresAt);
      if (expires > now) {
        const remainingDays = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const dailyValue = currentSub.plan.price / 30;
        credit = Math.floor(remainingDays * dailyValue);
      }
    }

    const lateFee = suspendedSub ? 15000 : 0;
    const basePrice = plan.hourlyPrice || 0;
    
    const finalSubtotal = basePrice;

    const finalPrice = Math.max(0, finalSubtotal - credit) + lateFee;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    // Security: Prevent PAYG abuse by requiring 1 month equivalent balance upfront
    const requiredBalance = isBalancePayment ? Math.max(finalPrice, (plan.hourlyPrice || 0) * 730) : finalPrice;
    
    if (isBalancePayment && (user?.balance || 0) < requiredBalance) {
      return NextResponse.json({ error: `A minimum balance of Rp ${requiredBalance.toLocaleString('id-ID')} (1 month estimation) is required to subscribe to this service to prevent abuse. Please top up first.` }, { status: 400 });
    }

    const fee = finalPrice > 0 ? (paymentMethod.fee || 0) : 0;
    const totalAmount = finalPrice + fee;

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    
    const initialStatus = (totalAmount <= 0 || isBalancePayment) ? 'ACTIVE' : 'PENDING';

    const merchantOrderId = generateOrderId();

    try {
      await prisma.$transaction(async (tx) => {
        if (initialStatus === 'ACTIVE' && currentSub) {
          await tx.subscription.update({ where: { id: currentSub.id }, data: { status: 'UPGRADED' } });
        }

        if (initialStatus === 'ACTIVE' && suspendedSub) {
          await tx.subscription.update({ where: { id: suspendedSub.id }, data: { status: 'RECOVERED' } });
        }

        const subscription = await tx.subscription.create({
          data: {
            userId,
            planId,
            cycle: 'HOURLY',
            status: initialStatus,
            expiresAt,
            lockedPrice: plan.price,
            lockedHourlyPrice: plan.hourlyPrice
          }
        });

        if (initialStatus === 'ACTIVE' && upgradeSubscriptionId) {
          await tx.vpsService.updateMany({
            where: { subscriptionId: upgradeSubscriptionId },
            data: { subscriptionId: subscription.id }
          });
        }

        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber: merchantOrderId,
            userId,
            subscriptionId: subscription.id,
            amount: totalAmount,
            status: initialStatus === 'ACTIVE' ? 'PAID' : 'PENDING',
            paymentMethod: paymentMethod.name,
            merchantOrderId: merchantOrderId,
            reference: upgradeSubscriptionId ? `UPGRADE:${upgradeSubscriptionId}` : 'PAYG_RUNNING',
            paidAt: initialStatus === 'ACTIVE' ? new Date() : null
          }
        });

        // For upgrades: create a separate PAYG_RUNNING invoice so hourly billing can track charges
        if (upgradeSubscriptionId && initialStatus === 'ACTIVE') {
          const runningOrderId = merchantOrderId + '-PAYG';
          await tx.invoice.create({
            data: {
              invoiceNumber: runningOrderId,
              userId,
              subscriptionId: subscription.id,
              amount: 0,
              status: 'PAID',
              paymentMethod: paymentMethod.name,
              merchantOrderId: runningOrderId,
              type: 'SUBSCRIPTION',
              reference: 'PAYG_RUNNING',
              paidAt: new Date()
            }
          });
        }

        if (isBalancePayment && totalAmount > 0) {
          const updateResult = await tx.user.updateMany({
            where: { id: userId, balance: { gte: totalAmount } },
            data: { balance: { decrement: totalAmount } }
          });

          if (updateResult.count === 0) {
            throw new Error("INSUFFICIENT_BALANCE");
          }
        }


      });
    } catch (txError: any) {
      if (txError.message === "INSUFFICIENT_BALANCE") {
        return NextResponse.json({ error: "Insufficient account balance" }, { status: 400 });
      }

      throw txError;
    }

    if (isBalancePayment && totalAmount > 0) {
      // Balance payment = immediate activation, send success emails
      sendCustomerPaymentSuccessEmail({
        toEmail: userEmail,
        customerName: userName,
        type: 'SUBSCRIPTION',
        planName: plan.name,
        serviceName: plan.service,
        amount: totalAmount,
        invoiceNumber: merchantOrderId,
        expiresAt,
      }).catch(e => console.error('Email error:', e));

      sendAdminNewOrderEmail({
        customerName: userName,
        customerEmail: userEmail,
        type: 'SUBSCRIPTION',
        planName: plan.name,
        serviceName: plan.service,
        amount: totalAmount,
        paymentMethod: 'Account Balance',
        invoiceNumber: merchantOrderId,
      }).catch(e => console.error('Email error:', e));

      return NextResponse.json({ success: true, paymentUrl: null });
    }

    if (totalAmount <= 0) {
      return NextResponse.json({ success: true, paymentUrl: null });
    }

    // If not balance payment, we throw error (which should never happen now)
    return NextResponse.json({ error: "Payment must use Account Balance." }, { status: 400 });
  } catch (error: any) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
