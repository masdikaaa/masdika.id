import { prisma } from './prisma';
import { OFFICIAL_CDN_PLANS } from './cdn-plans';

const OFFICIAL_CDN_NAMES = new Set(OFFICIAL_CDN_PLANS.map((p) => p.name));

/**
 * Ensures all official File CDN plans (1 GB - 100 GB) exist in the database,
 * and cleans up deprecated legacy CDN tiers if unused.
 * Preserves existing official records if already customized by an administrator.
 */
export async function ensureCdnPlansExist(): Promise<void> {
  try {
    const existingCdnPlans = await prisma.plan.findMany({
      where: { service: 'CDN' },
    });

    for (const oldPlan of existingCdnPlans) {
      if (!OFFICIAL_CDN_NAMES.has(oldPlan.name)) {
        const subCount = await prisma.subscription.count({ where: { planId: oldPlan.id } });
        if (subCount === 0) {
          await prisma.plan.delete({ where: { id: oldPlan.id } });
        } else if (oldPlan.isActive) {
          await prisma.plan.update({ where: { id: oldPlan.id }, data: { isActive: false } });
        }
      }
    }

    for (const def of OFFICIAL_CDN_PLANS) {
      const existing = await prisma.plan.findFirst({
        where: { service: 'CDN', name: def.name },
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
    console.error('[CdnPlans] Failed to ensure CDN plans:', error);
  }
}
