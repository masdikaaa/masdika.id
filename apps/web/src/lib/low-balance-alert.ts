import { prisma } from "@/lib/prisma";
import { decryptDeterministic } from "@/lib/encryption";
import { sendLowBalanceAlertEmail } from "@/lib/email";
import { getEffectiveHourlyRate } from "@/lib/vps-billing-rate";

export interface LowBalanceCheckResult {
  checkedCustomers: number;
  lowBalanceCount: number;
  alertsSent: number;
  skippedCooldown: number;
  clearedCooldown: number;
  errors: string[];
}

/**
 * Checks all active PAYG / hourly services (VPS, Reserved IPs, Subscriptions/API Hub/etc.)
 * across all customers. If a customer's balance is running low (remaining runtime <= 24 hours),
 * dispatches a warning email with a 24-hour deduplication cooldown.
 */
export async function checkAndSendLowBalanceAlerts(): Promise<LowBalanceCheckResult> {
  const result: LowBalanceCheckResult = {
    checkedCustomers: 0,
    lowBalanceCount: 0,
    alertsSent: 0,
    skippedCooldown: 0,
    clearedCooldown: 0,
    errors: [],
  };

  try {
    // 1. Get threshold setting (default 24 hours)
    const thresholdSetting = await prisma.setting.findUnique({
      where: { key: "low_balance_hours_threshold" },
    });
    const hoursThreshold = thresholdSetting ? parseInt(thresholdSetting.value, 10) || 24 : 24;

    // 2. Fetch all active PAYG services across all categories
    // Category A: VPS Services (Running or Stopped with hourlyRate > 0)
    const activeVps = await prisma.vpsService.findMany({
      where: {
        status: { in: ["RUNNING", "STOPPED"] },
        hourlyRate: { gt: 0 },
        user: { isSuspended: false },
      },
      include: {
        user: { select: { id: true, name: true, email: true, balance: true } },
      },
    });

    // Category B: Reserved IPs (hourlyRate > 0)
    const activeIps = await prisma.reservedIp.findMany({
      where: {
        hourlyRate: { gt: 0 },
        user: { isSuspended: false },
      },
      include: {
        user: { select: { id: true, name: true, email: true, balance: true } },
      },
    });

    // Category C: Subscriptions (API Hub, Web Hosting, Databases, Bots, Cloud Services, etc.)
    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        plan: { hourlyPrice: { gt: 0 } },
        user: { isSuspended: false },
      },
      include: {
        plan: true,
        user: { select: { id: true, name: true, email: true, balance: true } },
      },
    });

    // 3. Pricing lookup for effective rates (e.g. stopped VPS storage rate)
    const pricingItems = await prisma.vpsPricing.findMany();
    const pricing: Record<string, number> = {};
    pricingItems.forEach((item) => {
      pricing[item.key] = item.pricePerHour;
    });

    // 4. Group all services by Customer
    const customersMap = new Map<
      number,
      {
        id: number;
        name: string;
        email: string;
        balance: number;
        totalHourlyBurn: number;
        services: { name: string; type: string; hourlyRate: number }[];
      }
    >();

    const addService = (
      user: { id: number; name: string; email: string; balance: number },
      service: { name: string; type: string; hourlyRate: number }
    ) => {
      if (!customersMap.has(user.id)) {
        customersMap.set(user.id, {
          id: user.id,
          name: decryptDeterministic(user.name) || user.name || "Customer",
          email: decryptDeterministic(user.email) || user.email,
          balance: user.balance || 0,
          totalHourlyBurn: 0,
          services: [],
        });
      }
      const cust = customersMap.get(user.id)!;
      cust.services.push(service);
      cust.totalHourlyBurn += service.hourlyRate || 0;
    };

    for (const vps of activeVps) {
      addService(vps.user, {
        name: vps.hostname || `VPS #${vps.id}`,
        type: "VPS",
        hourlyRate: getEffectiveHourlyRate(vps, pricing),
      });
    }

    for (const ip of activeIps) {
      addService(ip.user, {
        name: ip.ipAddress || `IP #${ip.id}`,
        type: "Reserved IP",
        hourlyRate: ip.hourlyRate,
      });
    }

    for (const sub of activeSubscriptions) {
      addService(sub.user, {
        name: `${sub.plan.name} (${sub.plan.service.replace("_", " ")})`,
        type: "Subscription",
        hourlyRate: sub.plan.hourlyPrice,
      });
    }

    result.checkedCustomers = customersMap.size;
    const now = Date.now();
    const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours anti-spam cooldown between low balance emails

    // 5. Evaluate each customer's balance and dispatch alerts
    for (const customer of customersMap.values()) {
      const burn = customer.totalHourlyBurn;
      if (burn <= 0) continue;

      const remainingHours = Math.floor(customer.balance / burn);
      const remainingDays = Math.floor(remainingHours / 24);
      const settingKey = `LOW_BALANCE_ALERT_${customer.id}`;

      // Check if balance is low (<= hoursThreshold, e.g. 24 hours) and still positive
      const isLowBalance = customer.balance > 0 && remainingHours <= hoursThreshold;

      if (isLowBalance) {
        result.lowBalanceCount++;

        // Check cooldown from Setting table
        const existingAlertSetting = await prisma.setting.findUnique({
          where: { key: settingKey },
        });

        let canSend = true;
        if (existingAlertSetting?.value) {
          try {
            const data = JSON.parse(existingAlertSetting.value);
            const lastSentAt = new Date(data.sentAt).getTime();
            if (now - lastSentAt < COOLDOWN_MS) {
              canSend = false;
              result.skippedCooldown++;
            }
          } catch {
            canSend = true;
          }
        }

        if (canSend) {
          try {
            await sendLowBalanceAlertEmail({
              email: customer.email,
              userName: customer.name,
              balance: customer.balance,
              totalHourlyBurn: burn,
              remainingHours,
              remainingDays,
              services: customer.services,
            });

            // Save alert record in Setting table
            const alertPayload = JSON.stringify({
              sentAt: new Date(now).toISOString(),
              remainingHours,
              balance: customer.balance,
              totalHourlyBurn: burn,
            });

            await prisma.setting.upsert({
              where: { key: settingKey },
              update: { value: alertPayload },
              create: { key: settingKey, value: alertPayload },
            });

            // Log activity to ClientActivityLog
            await prisma.clientActivityLog.create({
              data: {
                userId: customer.id,
                description: `Peringatan saldo menipis dikirim ke ${customer.email} (Sisa saldo: Rp ${customer.balance.toLocaleString("id-ID")}, ~${remainingHours} jam tersisa untuk ${customer.services.length} layanan)`,
                username: "System",
                ipAddress: "127.0.0.1",
                category: "billing",
              },
            }).catch(() => {});

            result.alertsSent++;
          } catch (err: any) {
            console.error(`Failed to send low balance email to user ${customer.id}:`, err);
            result.errors.push(`User ${customer.id}: ${err.message || String(err)}`);
          }
        }
      } else if (remainingHours > hoursThreshold) {
        // Customer has sufficient balance!
        // Clear previous low balance alert lock so they can be notified again when low in the future
        const existing = await prisma.setting.findUnique({ where: { key: settingKey } });
        if (existing) {
          await prisma.setting.delete({ where: { key: settingKey } }).catch(() => {});
          result.clearedCooldown++;
        }
      }
    }
  } catch (err: any) {
    console.error("checkAndSendLowBalanceAlerts error:", err);
    result.errors.push(err.message || String(err));
  }

  return result;
}

/**
 * Resets low balance alert status for a customer (e.g. called after balance top up).
 */
export async function clearLowBalanceAlert(userId: number): Promise<void> {
  try {
    await prisma.setting.deleteMany({
      where: { key: `LOW_BALANCE_ALERT_${userId}` },
    });
  } catch {
    // Ignore error
  }
}
