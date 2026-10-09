import { prisma } from './prisma';

export async function getActiveSubscription(userId: number, service: string) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      plan: {
        service: service
      }
    },
    include: {
      plan: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return subscription;
}

export async function getSuspendedSubscription(userId: number, service: string) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: 'SUSPENDED',
      plan: {
        service: service
      }
    },
    include: {
      plan: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return subscription;
}

export async function hasActiveSubscription(userId: number, service: string) {
  const subscription = await getActiveSubscription(userId, service);
  
  if (!subscription) return false;

  // Check if it's expired
  if (new Date() > new Date(subscription.expiresAt)) {
    // Optionally auto-update status to EXPIRED here, or rely on a cron job
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'EXPIRED' }
    });
    return false;
  }

  return true;
}

export async function getSubscriptionInfo(userId: number, service: string) {
  let subscription = await getActiveSubscription(userId, service);
  let isSuspended = false;
  
  if (!subscription) {
    subscription = await getSuspendedSubscription(userId, service);
    if (subscription) {
      isSuspended = true;
    }
  }
  
  if (!subscription) {
    return { hasSubscription: false, isSuspended: false, isExpired: false, subscription: null };
  }
  
  const isExpired = new Date() > new Date(subscription.expiresAt);
  if (isExpired && !isSuspended) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'EXPIRED' }
    });
    return { hasSubscription: false, isSuspended: false, isExpired: true, subscription };
  }
  
  return { hasSubscription: true, isSuspended, isExpired, subscription };
}
