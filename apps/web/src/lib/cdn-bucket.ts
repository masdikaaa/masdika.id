import { prisma } from './prisma';
import {
  getCustomerRustFSConfig,
  getDefaultCdnBucketName,
  validateS3BucketName,
  ensureCustomerBucketExists,
  deleteCustomerBucketCompletely,
} from './customer-rustfs';

export async function ensureDefaultCdnBucket(userId: number, subscriptionId?: number) {
  const subWhere = subscriptionId ? { subscriptionId } : {};
  const existingDefault = await prisma.cdnBucket.findFirst({
    where: { userId, ...subWhere, isDefault: true },
  });
  if (existingDefault) {
    // Ensure bucket exists physically on Customer RustFS (best effort)
    await ensureCustomerBucketExists(existingDefault.name, 'PRIVATE').catch(() => {});
    return existingDefault;
  }

  const anyExisting = await prisma.cdnBucket.findFirst({
    where: { userId, ...subWhere },
    orderBy: { createdAt: 'asc' },
  });
  if (anyExisting) {
    const updated = await prisma.cdnBucket.update({
      where: { id: anyExisting.id },
      data: { isDefault: true },
    });
    await ensureCustomerBucketExists(updated.name, 'PRIVATE').catch(() => {});
    return updated;
  }

  const cfg = await getCustomerRustFSConfig();
  const bucketName = getDefaultCdnBucketName(userId, cfg.cdnBucketPrefix, subscriptionId);

  if (cfg.enabled && cfg.endpoint && cfg.accessKey && cfg.secretKey) {
    await ensureCustomerBucketExists(bucketName, 'PRIVATE');
  }

  return prisma.cdnBucket.create({
    data: {
      userId,
      subscriptionId: subscriptionId ?? null,
      name: bucketName,
      isDefault: true,
    },
  });
}

export async function resolveCustomerCdnBucket(
  userId: number,
  requestedBucket?: string | null,
  subscriptionId?: number
) {
  const defaultBucket = await ensureDefaultCdnBucket(userId, subscriptionId);
  if (!requestedBucket || requestedBucket.trim() === '') {
    return defaultBucket;
  }

  const normalized = requestedBucket.trim().toLowerCase();
  const owned = await prisma.cdnBucket.findFirst({
    where: {
      userId,
      name: normalized,
      ...(subscriptionId ? { OR: [{ subscriptionId }, { subscriptionId: null }] } : {}),
    },
  });

  if (!owned) {
    return null;
  }

  const cfg = await getCustomerRustFSConfig();
  if (cfg.enabled && cfg.endpoint && cfg.accessKey && cfg.secretKey) {
    await ensureCustomerBucketExists(owned.name, 'PRIVATE').catch(() => {});
  }

  return owned;
}

export async function createCustomerCdnBucket(
  userId: number,
  rawName: string,
  subscriptionId?: number
) {
  const name = rawName.trim().toLowerCase();
  const check = validateS3BucketName(name);
  if (!check.valid) {
    throw new Error(check.error || 'Invalid bucket name');
  }

  const [conflictCdn, conflictObj] = await Promise.all([
    prisma.cdnBucket.findUnique({ where: { name } }),
    prisma.objectStorageBucket.findUnique({ where: { name } }),
  ]);

  if (conflictCdn || conflictObj) {
    throw new Error(`Bucket "${name}" is already in use. Choose a globally unique bucket name.`);
  }

  const cfg = await getCustomerRustFSConfig();
  if (!cfg.enabled || !cfg.endpoint || !cfg.accessKey || !cfg.secretKey) {
    throw new Error('Customer RustFS cluster is not configured or enabled.');
  }

  await ensureCustomerBucketExists(name, 'PRIVATE');

  return prisma.cdnBucket.create({
    data: {
      userId,
      subscriptionId: subscriptionId ?? null,
      name,
      isDefault: false,
    },
  });
}

export async function deleteCustomerCdnBucket(userId: number, bucketName: string) {
  const normalized = bucketName.trim().toLowerCase();
  const bucket = await prisma.cdnBucket.findFirst({
    where: { userId, name: normalized },
  });

  if (!bucket) {
    throw new Error('Bucket not found');
  }
  if (bucket.isDefault) {
    throw new Error('Default customer bucket cannot be deleted');
  }

  const filesCount = await prisma.secureMedia.count({
    where: { userId, bucket: normalized },
  });
  if (filesCount > 0) {
    throw new Error('Bucket is not empty. Delete all files and folders inside it first.');
  }

  await deleteCustomerBucketCompletely(normalized).catch(() => {});
  await prisma.cdnBucket.delete({ where: { id: bucket.id } });
}

/**
 * Physically deletes all RustFS buckets/objects and database records
 * associated with a File CDN subscription (including legacy unlinked
 * user buckets if no other active CDN subscription remains).
 */
export async function cleanupSubscriptionCdnResources(
  subscriptionId: number,
  userId: number
): Promise<void> {
  const [subBuckets, otherActiveCdnCount] = await Promise.all([
    prisma.cdnBucket.findMany({
      where: { subscriptionId, userId },
    }),
    prisma.subscription.count({
      where: {
        userId,
        id: { not: subscriptionId },
        status: { not: 'TERMINATED' },
        plan: { service: 'CDN' },
      },
    }),
  ]);

  let orphanBuckets: typeof subBuckets = [];
  if (otherActiveCdnCount === 0) {
    orphanBuckets = await prisma.cdnBucket.findMany({
      where: { userId, subscriptionId: null },
    });
  }

  const allBuckets = [...subBuckets, ...orphanBuckets];
  const bucketNames = Array.from(new Set(allBuckets.map((b) => b.name)));
  const bucketIds = allBuckets.map((b) => b.id);

  await Promise.all(
    bucketNames.map((name) => deleteCustomerBucketCompletely(name).catch(() => false))
  );

  await prisma.$transaction([
    prisma.secureMedia.deleteMany({
      where: {
        userId,
        OR: [
          { subscriptionId },
          ...(bucketNames.length > 0 ? [{ bucket: { in: bucketNames } }] : []),
        ],
      },
    }),
    ...(bucketIds.length > 0
      ? [prisma.cdnBucket.deleteMany({ where: { id: { in: bucketIds } } })]
      : []),
    prisma.cdnApiKey.deleteMany({
      where: { subscriptionId, userId },
    }),
  ]);
}
