import { prisma } from './prisma';
import { OFFICIAL_APP_PLATFORM_PLANS, AppPlatformPlan } from './app-platform-plans';

/**
 * Ensures all default App Platform plans exist in DB with service='APP_PLATFORM'.
 * Never overwrites existing plans so admin customizations made in /admin/plans persist dynamically.
 */
export async function ensureAppPlatformPlansExist(): Promise<void> {
  try {
    for (const def of OFFICIAL_APP_PLATFORM_PLANS) {
      const existing = await prisma.plan.findFirst({
        where: {
          service: 'APP_PLATFORM',
          OR: [
            { name: def.name },
            { limits: { contains: def.planCode } },
          ],
        },
      });

      if (!existing) {
        await prisma.plan.create({
          data: {
            name: def.name,
            service: 'APP_PLATFORM',
            description: `${def.cpuLabel} & ${def.ramLabel} Git web deployment tier with isolated container runtime & SSD storage.`,
            price: def.monthlyPrice,
            hourlyPrice: def.hourlyRate,
            limits: JSON.stringify({
              cpu: def.cpuLabel,
              ram: def.ramLabel,
              cpuShares: def.cpuShares,
              memoryMb: def.memoryMb,
              storageGb: def.storageGb,
              storage: `${def.storageGb} GB SSD`,
              region: 'Sidoarjo',
              planCode: def.planCode,
              shared: true,
            }),
            isActive: true,
            isPopular: Boolean(def.popular),
          },
        });
      }
    }
  } catch (error) {
    console.error('[AppPlatformPlans] Failed to ensure app platform plans:', error);
  }
}

/**
 * Fetches active App Platform plans dynamically from database,
 * converting them into the canonical AppPlatformPlan format.
 */
export async function getDynamicAppPlatformPlans(): Promise<AppPlatformPlan[]> {
  try {
    let dbPlans = await prisma.plan.findMany({
      where: { service: 'APP_PLATFORM', isActive: true },
      orderBy: { price: 'asc' },
    });

    if (dbPlans.length === 0) {
      await ensureAppPlatformPlansExist();
      dbPlans = await prisma.plan.findMany({
        where: { service: 'APP_PLATFORM', isActive: true },
        orderBy: { price: 'asc' },
      });
    }

    if (dbPlans.length === 0) {
      return OFFICIAL_APP_PLATFORM_PLANS;
    }

    return dbPlans.map((plan) => {
      let parsed: any = {};
      try {
        parsed = JSON.parse(plan.limits);
      } catch {
        parsed = {};
      }

      const planCode =
        parsed.planCode ||
        plan.name.replace(/[^0-9a-zA-Z]/g, '').slice(-4).toUpperCase() ||
        'CUSTOM';
      const cpuVal = Number(parsed.cpuShares) || parseFloat(parsed.cpu || '1') || 1.0;
      const memMb =
        Number(parsed.memoryMb) ||
        (parsed.ram?.includes('GB') ? parseFloat(parsed.ram) * 1024 : 1024);
      const storageGb =
        Number(parsed.storageGb) ||
        (parsed.storage ? parseInt(parsed.storage, 10) : 10);

      return {
        id: `app-${planCode.toLowerCase()}`,
        name: plan.name,
        planCode,
        cpuLabel: parsed.cpu || `${cpuVal} CPU`,
        ramLabel: parsed.ram || `${(memMb / 1024).toFixed(1)} GB RAM`,
        diskLabel: `${storageGb} GB SSD`,
        cpuShares: cpuVal,
        memoryMb: memMb,
        storageGb,
        monthlyPrice: plan.price,
        hourlyRate: plan.hourlyPrice || Math.max(1, Math.round(plan.price / 720)),
        popular: Boolean(plan.isPopular),
        badge: plan.isPopular ? 'Popular' : undefined,
        planId: plan.id,
      };
    });
  } catch (error) {
    console.error('[AppPlatformPlans] Error fetching dynamic app platform plans:', error);
    return OFFICIAL_APP_PLATFORM_PLANS;
  }
}
