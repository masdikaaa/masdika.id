import { prisma } from './prisma';
import { MANAGED_APP_PLANS, ManagedAppPlanDefinition } from './app-catalog';

export const OFFICIAL_APP_PLANS = [
  {
    name: 'Shared App 1C1G',
    service: 'APP',
    description: 'Shared 1 vCPU & 1 GB RAM compute tier with isolated container runtime & SSD storage in Sidoarjo.',
    price: 20000,
    hourlyPrice: 28,
    limits: {
      cpu: '1 CPU',
      ram: '1.0 GB RAM',
      cpuShares: 1.0,
      memoryMb: 1024,
      storageGb: 10,
      region: 'Sidoarjo',
      planCode: '1C1G',
      shared: true,
    },
    isActive: true,
    isPopular: false,
  },
  {
    name: 'Shared App 1C2G',
    service: 'APP',
    description: 'Shared 1 vCPU & 2 GB RAM compute tier. Recommended for AI agents, n8n workflows and gateways.',
    price: 30000,
    hourlyPrice: 42,
    limits: {
      cpu: '1 CPU',
      ram: '2.0 GB RAM',
      cpuShares: 1.0,
      memoryMb: 2048,
      storageGb: 10,
      region: 'Sidoarjo',
      planCode: '1C2G',
      shared: true,
    },
    isActive: true,
    isPopular: true,
  },
  {
    name: 'Shared App 2C2G',
    service: 'APP',
    description: 'Shared 2 vCPU & 2 GB RAM compute tier for active multi-agent workloads.',
    price: 40000,
    hourlyPrice: 56,
    limits: {
      cpu: '2 CPU',
      ram: '2.0 GB RAM',
      cpuShares: 2.0,
      memoryMb: 2048,
      storageGb: 10,
      region: 'Sidoarjo',
      planCode: '2C2G',
      shared: true,
    },
    isActive: true,
    isPopular: false,
  },
  {
    name: 'Shared App 2C4G',
    service: 'APP',
    description: 'Shared 2 vCPU & 4 GB RAM compute tier for high concurrency AI workloads.',
    price: 75000,
    hourlyPrice: 105,
    limits: {
      cpu: '2 CPU',
      ram: '4.0 GB RAM',
      cpuShares: 2.0,
      memoryMb: 4096,
      storageGb: 10,
      region: 'Sidoarjo',
      planCode: '2C4G',
      shared: true,
    },
    isActive: true,
    isPopular: false,
  },
  {
    name: 'Shared App 4C4G',
    service: 'APP',
    description: 'Shared 4 vCPU & 4 GB RAM compute tier for heavy processing.',
    price: 135000,
    hourlyPrice: 188,
    limits: {
      cpu: '4 CPU',
      ram: '4.0 GB RAM',
      cpuShares: 4.0,
      memoryMb: 4096,
      storageGb: 10,
      region: 'Sidoarjo',
      planCode: '4C4G',
      shared: true,
    },
    isActive: true,
    isPopular: false,
  },
  {
    name: 'Shared App 4C8G',
    service: 'APP',
    description: 'Shared 4 vCPU & 8 GB RAM compute tier for enterprise multi-channel agents.',
    price: 225000,
    hourlyPrice: 313,
    limits: {
      cpu: '4 CPU',
      ram: '8.0 GB RAM',
      cpuShares: 4.0,
      memoryMb: 8192,
      storageGb: 10,
      region: 'Sidoarjo',
      planCode: '4C8G',
      shared: true,
    },
    isActive: true,
    isPopular: false,
  },
  {
    name: 'Shared App 4C16G',
    service: 'APP',
    description: 'Maximum performance 4 vCPU & 16 GB RAM compute tier for full enterprise clusters.',
    price: 375000,
    hourlyPrice: 521,
    limits: {
      cpu: '4 CPU',
      ram: '16.0 GB RAM',
      cpuShares: 4.0,
      memoryMb: 16384,
      storageGb: 10,
      region: 'Sidoarjo',
      planCode: '4C16G',
      shared: true,
    },
    isActive: true,
    isPopular: false,
  },
];

/**
 * Ensures all default Managed App plans exist in DB.
 * Never overwrites existing plans so admin customizations made in /admin/plans persist dynamically.
 */
export async function ensureAppPlansExist(): Promise<void> {
  try {
    for (const def of OFFICIAL_APP_PLANS) {
      const existing = await prisma.plan.findFirst({
        where: {
          service: 'APP',
          OR: [
            { name: def.name },
            { limits: { contains: def.limits.planCode } },
          ],
        },
      });

      if (!existing) {
        await prisma.plan.create({
          data: {
            name: def.name,
            service: def.service,
            description: def.description,
            price: def.price,
            hourlyPrice: def.hourlyPrice,
            limits: JSON.stringify(def.limits),
            isActive: def.isActive,
            isPopular: def.isPopular,
          },
        });
      }
    }
  } catch (error) {
    console.error('[AppPlans] Failed to ensure app plans:', error);
  }
}

/**
 * Fetches active Managed App plans dynamically from database,
 * converting them into the canonical ManagedAppPlanDefinition format.
 */
export async function getDynamicAppPlans(): Promise<ManagedAppPlanDefinition[]> {
  try {
    let dbPlans = await prisma.plan.findMany({
      where: { service: 'APP', isActive: true },
      orderBy: { price: 'asc' },
    });

    if (dbPlans.length === 0) {
      await ensureAppPlansExist();
      dbPlans = await prisma.plan.findMany({
        where: { service: 'APP', isActive: true },
        orderBy: { price: 'asc' },
      });
    }

    if (dbPlans.length === 0) {
      return MANAGED_APP_PLANS;
    }

    return dbPlans.map((plan) => {
      let parsed: any = {};
      try {
        parsed = JSON.parse(plan.limits);
      } catch {
        parsed = {};
      }

      const planCode = parsed.planCode || plan.name.replace(/[^0-9a-zA-Z]/g, '').slice(-4).toUpperCase() || 'CUSTOM';
      const cpuVal = Number(parsed.cpuShares) || parseFloat(parsed.cpu || '1') || 1.0;
      const memMb = Number(parsed.memoryMb) || (parsed.ram?.includes('GB') ? parseFloat(parsed.ram) * 1024 : 1024);
      const storageGb = Number(parsed.storageGb) || (parsed.storage ? parseInt(parsed.storage, 10) : 10);

      return {
        id: planCode.toLowerCase(),
        planCode,
        cpuLabel: parsed.cpu || `${cpuVal} CPU`,
        cpuShares: cpuVal,
        ramLabel: parsed.ram || `${(memMb / 1024).toFixed(1)} GB RAM`,
        memoryMb: memMb,
        storageGb,
        monthlyPrice: plan.price,
        hourlyPrice: plan.hourlyPrice || Math.round(plan.price / 720),
        remainingStock: 25,
        isPopular: plan.isPopular,
        planId: plan.id,
      };
    });
  } catch (error) {
    console.error('[AppPlans] Error fetching dynamic app plans:', error);
    return MANAGED_APP_PLANS;
  }
}
