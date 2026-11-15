import { prisma } from './prisma';
import { OFFICIAL_OBJECT_STORAGE_PLANS } from './object-storage-plans';

const LEGACY_OBJECT_STORAGE_PLAN_NAMES = [
  'S3 Starter 50 GB',
  'S3 Standard 100 GB',
  'S3 Pro 250 GB',
  'S3 Business 500 GB',
  'S3 Enterprise 1 TB',
];

/**
 * Ensures all official Object Storage (S3) plans (1 GB - 100 GB) exist in the database,
 * and cleans up deprecated oversized tiers if unused.
 * Preserves existing official records if already customized by an administrator.
 */
export async function ensureObjectStoragePlansExist(): Promise<void> {
  try {
    for (const oldName of LEGACY_OBJECT_STORAGE_PLAN_NAMES) {
      const legacy = await prisma.plan.findFirst({
        where: { service: 'OBJECT_STORAGE', name: oldName },
      });
      if (legacy) {
        const subCount = await prisma.subscription.count({ where: { planId: legacy.id } });
        if (subCount === 0) {
          await prisma.plan.delete({ where: { id: legacy.id } });
        } else {
          await prisma.plan.update({ where: { id: legacy.id }, data: { isActive: false } });
        }
      }
    }

    for (const def of OFFICIAL_OBJECT_STORAGE_PLANS) {
      const existing = await prisma.plan.findFirst({
        where: { service: 'OBJECT_STORAGE', name: def.name },
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
    console.error('[ObjectStoragePlans] Failed to ensure object storage plans:', error);
  }
}
