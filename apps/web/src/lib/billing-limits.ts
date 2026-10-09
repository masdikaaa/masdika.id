import { prisma } from './prisma';

import { getActiveSubscription, getSuspendedSubscription } from './subscription';

/**
 * Checks and enforces API limits for a given service.
 * Throws an error if the limit is exceeded or if there's no active subscription.
 * If successful, increments the usageCount.
 */
export async function enforceApiLimit(userId: number, service: string) {
  const sub = await getActiveSubscription(userId, service);
  
  if (!sub) {
    throw new Error(`Active ${service} subscription required`);
  }

  let limits: any = {};
  try {
    limits = JSON.parse(sub.plan.limits);
  } catch (e) {
    throw new Error('Invalid plan limits configuration');
  }

  const requestLimit = limits.requests;

  if (requestLimit !== 'unlimited') {
    const limitNum = parseInt(requestLimit);
    if (isNaN(limitNum)) {
      throw new Error('Invalid plan limits configuration');
    }

    if (sub.usageCount >= limitNum) {
      throw new Error(`Usage limit exceeded for ${service} (${limitNum} requests). Please upgrade your plan.`);
    }
  }

  // Increment usage count
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { usageCount: { increment: 1 } }
  });

  return true;
}

/**
 * Calculates current storage usage in bytes for a user.
 */
export async function getStorageUsage(userId: number) {
  let sub = await getActiveSubscription(userId, 'OBJECT_STORAGE');
  let isSuspended = false;
  
  if (!sub) {
    sub = await getSuspendedSubscription(userId, 'OBJECT_STORAGE');
    isSuspended = !!sub;
  }
  
  if (!sub) {
    return { usedBytes: 0, limitBytes: 0, storageLimitString: 'No Active Subscription', isUnlimited: false, isSuspended: false };
  }

  let limits: any = {};
  try {
    limits = JSON.parse(sub.plan.limits);
  } catch (e) {
    // Ignore error
  }

  const storageLimit = limits.storage; // e.g. "10 GB", "25 GB"
  const storageGB = limits.storageGB; // e.g. 10
  let limitBytes = 0;
  let isUnlimited = false;

  if (limits.storage === 'unlimited' || limits.storageGB === 'unlimited') {
    isUnlimited = true;
  } else if (storageGB !== undefined) {
    limitBytes = Number(storageGB) * 1024 * 1024 * 1024;
  } else if (storageLimit) {
    const match = storageLimit.trim().match(/^(\d+)\s*(GB|MB|KB|TB)$/i);
    if (match) {
      const limitValue = parseInt(match[1]);
      const unit = match[2].toUpperCase();
      limitBytes = limitValue;
      if (unit === 'KB') limitBytes *= 1024;
      else if (unit === 'MB') limitBytes *= 1024 * 1024;
      else if (unit === 'GB') limitBytes *= 1024 * 1024 * 1024;
      else if (unit === 'TB') limitBytes *= 1024 * 1024 * 1024 * 1024;
    }
  }

  const storageLimitString = isUnlimited ? 'Unlimited' : (storageGB !== undefined ? `${storageGB} GB` : (storageLimit || '0 GB'));

  let currentTotalBytes = 0;

  return { usedBytes: currentTotalBytes, limitBytes, storageLimitString, isUnlimited, isSuspended };
}

/**
 * Checks and enforces File CDN limit (e.g. 10 GB) before allowing an upload.
 * Throws an error if exceeded.
 */
export async function enforceStorageLimit(userId: number, additionalBytes: number) {
  const usage = await getStorageUsage(userId);
  
  if (usage.storageLimitString === 'No Active Subscription' || usage.isSuspended) {
    throw new Error('Active OBJECT_STORAGE subscription required');
  }

  if (usage.isUnlimited) return true; // Explicitly Unlimited

  if (usage.usedBytes + additionalBytes > usage.limitBytes) {
    throw new Error(`Storage limit exceeded. Your plan allows ${usage.storageLimitString}. You are using ${(usage.usedBytes / (1024*1024*1024)).toFixed(2)} GB.`);
  }

  return true;
}

/**
 * Checks and enforces URL Shortener limit (e.g. 500 links).
 * Throws an error if exceeded.
 */
export async function enforceShortenerLimit(userId: number) {
  const sub = await getActiveSubscription(userId, 'SHORTENER');
  
  if (!sub) {
    throw new Error('Active SHORTENER subscription required');
  }

  let limits: any = {};
  try {
    limits = JSON.parse(sub.plan.limits);
  } catch (e) {
    throw new Error('Invalid plan limits configuration');
  }

  const linksLimit = limits.links;
  if (linksLimit === 'unlimited') return true;

  const limitNum = parseInt(linksLimit);
  if (isNaN(limitNum)) {
    throw new Error('Invalid plan limits configuration');
  }

  const currentLinksCount = await prisma.shortLink.count({
    where: { userId }
  });

  if (currentLinksCount >= limitNum) {
    throw new Error(`URL Shortener limit exceeded. Your plan allows ${limitNum} links. Please upgrade your plan.`);
  }

  return true;
}

