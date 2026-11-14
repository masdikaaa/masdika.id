import { prisma } from './prisma';
import { OFFICIAL_DATABASE_PLANS } from './database-plans';

/**
 * Ensures all official database plans exist and are active in the database.
 * Also cleans up any obsolete duplicate plans.
 */
export async function ensureDatabasePlansExist(): Promise<void> {
  try {
    const officialNames = OFFICIAL_DATABASE_PLANS.map((p) => p.name);

    for (const def of OFFICIAL_DATABASE_PLANS) {
      const existing = await prisma.plan.findFirst({
        where: { service: 'DATABASE', name: def.name },
      });

      const limitsJson = JSON.stringify(def.limits);

      if (!existing) {
        await prisma.plan.create({
          data: {
            name: def.name,
            service: def.service,
            description: def.description,
            price: def.price,
            hourlyPrice: def.hourlyPrice,
            limits: limitsJson,
            isActive: def.isActive,
            isPopular: def.isPopular,
          },
        });
      } else {
        await prisma.plan.update({
          where: { id: existing.id },
          data: {
            description: def.description,
            price: def.price,
            hourlyPrice: def.hourlyPrice,
            limits: limitsJson,
            isActive: true,
          },
        });
      }
    }

    // Clean up obsolete legacy plans outside the official flavor catalog
    const obsoletePlans = await prisma.plan.findMany({
      where: {
        service: 'DATABASE',
        name: { notIn: officialNames },
      },
    });

    for (const obs of obsoletePlans) {
      const subCount = await prisma.subscription.count({
        where: { planId: obs.id },
      });
      if (subCount === 0) {
        await prisma.plan.delete({ where: { id: obs.id } }).catch(() => {});
      } else {
        await prisma.plan.update({
          where: { id: obs.id },
          data: { isActive: false },
        }).catch(() => {});
      }
    }
  } catch (error) {
    console.error('[DatabasePlans] Failed to ensure database plans:', error);
  }
}
