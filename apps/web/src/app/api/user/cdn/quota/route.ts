import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from '@/lib/auth-middleware';
import { getActiveSubscription } from "@/lib/subscription";

export async function GET(req: NextRequest) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const userId = auth.userId!;
    
    // Check if user has active CDN subscription
    let cdnSub = null;
    if (auth.user?.role !== 'ADMIN') {
      const { getSubscriptionInfo } = await import('@/lib/subscription');
      const subInfo = await getSubscriptionInfo(userId, "CDN");
      if (!subInfo.hasSubscription) {
        return NextResponse.json({ error: "No active CDN subscription found." }, { status: 403 });
      }
      cdnSub = subInfo.subscription;
    } else {
      cdnSub = await getActiveSubscription(userId, "CDN");
    }

    let storageLimitGB = 0;
    let isUnlimited = false;
    
    if (cdnSub && cdnSub.plan && cdnSub.plan.limits) {
      try {
        const limits = JSON.parse(cdnSub.plan.limits);
        
        if (limits.storage === 'unlimited' || limits.storageGB === 'unlimited') {
          isUnlimited = true;
        } else if (limits.storageGB !== undefined) {
          storageLimitGB = Number(limits.storageGB);
        } else if (limits.storage) {
          const match = limits.storage.trim().match(/^(\d+)\s*(GB|MB|KB|TB)$/i);
          if (match) {
            const limitValue = parseInt(match[1]);
            const unit = match[2].toUpperCase();
            let limitBytes = limitValue;
            if (unit === 'KB') limitBytes *= 1024;
            else if (unit === 'MB') limitBytes *= 1024 * 1024;
            else if (unit === 'GB') limitBytes *= 1024 * 1024 * 1024;
            else if (unit === 'TB') limitBytes *= 1024 * 1024 * 1024 * 1024;
            storageLimitGB = limitBytes / (1024 * 1024 * 1024);
          }
        }
      } catch(e) {}
    } else if (auth.user?.role === 'ADMIN') {
      isUnlimited = true;
    }
    
    const storageLimitBytes = isUnlimited ? 0 : storageLimitGB * 1024 * 1024 * 1024;

    const aggregate = await prisma.secureMedia.aggregate({
      where: { userId },
      _sum: { size: true }
    });
    
    const currentStorageBytes = Number(aggregate._sum.size || 0);

    return NextResponse.json({
      usedBytes: currentStorageBytes,
      limitBytes: storageLimitBytes,
      limitGB: storageLimitGB
    });
  } catch (error) {
    console.error("Error fetching CDN quota:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
