import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { decryptDeterministic } from "@/lib/encryption";
import { getEffectiveHourlyRate } from "@/lib/vps-billing-rate";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // 1. Get setting
    const setting = await prisma.setting.findUnique({
      where: { key: 'payg_billing_interval' }
    });
    const interval = setting?.value || 'hourly';

    // 2. Get active PAYG services
    const activeVps = await prisma.vpsService.findMany({
      where: {
        status: { in: ['RUNNING', 'STOPPED'] },
        hourlyRate: { gt: 0 }
      },
      include: { user: { select: { id: true, name: true, email: true, image: true, balance: true } } }
    });

    const activeIps = await prisma.reservedIp.findMany({
      where: { hourlyRate: { gt: 0 } },
      include: { user: { select: { id: true, name: true, email: true, image: true, balance: true } } }
    });

    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        plan: { hourlyPrice: { gt: 0 } }
      },
      include: { 
        plan: true,
        user: { select: { id: true, name: true, email: true, image: true, balance: true } },
        invoices: {
          where: { reference: 'PAYG_RUNNING', type: 'SUBSCRIPTION' },
          orderBy: { createdAt: 'desc' as const },
          take: 1
        }
      }
    });

    // 3. Group by customer
    const customersMap = new Map<number, any>();

    const addServiceToCustomer = (userId: number, user: any, service: any) => {
      if (!customersMap.has(userId)) {
        customersMap.set(userId, {
          id: userId,
          name: decryptDeterministic(user.name),
          email: decryptDeterministic(user.email),
          image: user.image,
          balance: user.balance || 0,
          services: [],
          totalAccumulatedCost: 0,
          totalHourlyBurn: 0,
          hasInvoiceThisMonth: false
        });
      }
      const customer = customersMap.get(userId);
      customer.services.push(service);
      customer.totalAccumulatedCost += service.accumulatedCost || 0;
      customer.totalHourlyBurn += service.hourlyRate || 0;
    };

    const pricingItems = await prisma.vpsPricing.findMany();
    const pricing: Record<string, number> = {};
    pricingItems.forEach(item => { pricing[item.key] = item.pricePerHour; });

    for (const vps of activeVps) {
      addServiceToCustomer(vps.user.id, vps.user, {
        id: `vps-${vps.id}`,
        type: 'VPS',
        name: vps.hostname,
        // Rate actually charged right now (STOPPED => storage only)
        hourlyRate: getEffectiveHourlyRate(vps, pricing),
        fullHourlyRate: vps.hourlyRate,
        accumulatedCost: vps.accumulatedCost,
        status: vps.status,
        createdAt: vps.createdAt
      });
    }

    for (const ip of activeIps) {
      addServiceToCustomer(ip.user.id, ip.user, {
        id: `ip-${ip.id}`,
        type: 'Reserved IP',
        name: ip.ipAddress,
        hourlyRate: ip.hourlyRate,
        accumulatedCost: ip.accumulatedCost,
        status: ip.isAttached ? 'ATTACHED' : 'UNATTACHED',
        createdAt: ip.createdAt
      });
    }

    for (const sub of activeSubscriptions) {
      // Read accumulated cost from the PAYG_RUNNING invoice (incremented hourly by cron)
      const runningInvoice = sub.invoices[0];
      const accumulatedCost = runningInvoice?.amount || 0;

      addServiceToCustomer(sub.user.id, sub.user, {
        id: `sub-${sub.id}`,
        type: 'Subscription',
        name: `${sub.plan.name} (${sub.plan.service})`,
        hourlyRate: sub.plan.hourlyPrice,
        accumulatedCost,
        status: sub.status,
        createdAt: sub.createdAt
      });
    }

    // 4. Check for this month's invoices for these customers
    const userIds = Array.from(customersMap.keys());
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    if (userIds.length > 0) {
      const recentInvoices = await prisma.invoice.findMany({
        where: {
          userId: { in: userIds },
          OR: [
            { createdAt: { gte: startOfMonth } },
            { reference: 'PAYG_RUNNING' }
          ]
        },
        select: { userId: true }
      });

      for (const invoice of recentInvoices) {
        if (customersMap.has(invoice.userId)) {
          customersMap.get(invoice.userId).hasInvoiceThisMonth = true;
        }
      }
    }

    const customers = Array.from(customersMap.values());

    // 5. Calculate Balance Sufficiency & Projected Runtime for each customer
    for (const customer of customers) {
      const balance = customer.balance || 0;
      const hourlyBurn = customer.totalHourlyBurn || 0;

      let balanceStatus: 'SUFFICIENT' | 'LOW' | 'EXHAUSTED' = 'SUFFICIENT';
      let remainingHours = 0;
      let remainingDays = 0;

      if (hourlyBurn > 0) {
        remainingHours = Math.floor(balance / hourlyBurn);
        remainingDays = Math.floor(remainingHours / 24);
      } else {
        remainingHours = balance > 0 ? 999999 : 0;
        remainingDays = balance > 0 ? 99999 : 0;
      }

      if (balance <= 0 || (hourlyBurn > 0 && balance < hourlyBurn)) {
        balanceStatus = 'EXHAUSTED'; // Saldo Habis / Kritis (Segera Suspend)
      } else if (remainingHours < 24) {
        balanceStatus = 'LOW'; // Saldo Menipis (<24 jam)
      } else {
        balanceStatus = 'SUFFICIENT'; // Saldo Cukup
      }

      customer.balanceStatus = balanceStatus;
      customer.remainingHours = remainingHours;
      customer.remainingDays = remainingDays;
    }

    const stats = {
      totalCustomers: customers.length,
      sufficientCustomers: customers.filter(c => c.balanceStatus === 'SUFFICIENT').length,
      lowCustomers: customers.filter(c => c.balanceStatus === 'LOW').length,
      exhaustedCustomers: customers.filter(c => c.balanceStatus === 'EXHAUSTED').length,
      totalUnbilled: customers.reduce((acc, c) => acc + c.totalAccumulatedCost, 0),
      totalServices: customers.reduce((acc, c) => acc + c.services.length, 0),
    };

    return NextResponse.json({
      interval,
      customers,
      stats
    });

  } catch (error: any) {
    console.error("GET PAYG Monitor Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { interval } = await req.json();

    if (!['hourly', 'minutely'].includes(interval)) {
      return NextResponse.json({ error: "Invalid interval" }, { status: 400 });
    }

    await prisma.setting.upsert({
      where: { key: 'payg_billing_interval' },
      update: { value: interval },
      create: { key: 'payg_billing_interval', value: interval }
    });

    return NextResponse.json({ success: true, message: `Interval updated to ${interval}` });
  } catch (error: any) {
    console.error("POST PAYG Monitor Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
