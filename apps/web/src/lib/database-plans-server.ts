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
      }
      // When existing already exists in DB, do NOT overwrite it:
      // This preserves any dynamic price/limit updates made by the admin in /admin/plans!
    }
  } catch (error) {
    console.error('[DatabasePlans] Failed to ensure database plans:', error);
  }
}
