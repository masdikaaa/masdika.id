import { prisma } from './prisma';
import { OFFICIAL_OBJECT_STORAGE_PLANS } from './object-storage-plans';

/**
 * Ensures all official Object Storage (S3) plans exist in the database.
 * Preserves existing records if already customized by an administrator.
 */
export async function ensureObjectStoragePlansExist(): Promise<void> {
  try {
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
