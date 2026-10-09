import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const userId = auth.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        referralCode: true,
        affiliateBalance: true,
        createdAt: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate referralCode if doesn't exist (for old users before the feature)
    let referralCode = user.referralCode;
    if (!referralCode) {
      const crypto = await import("crypto");
      let newReferralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
      let isUnique = false;
      while (!isUnique) {
        const existing = await prisma.user.findUnique({ where: { referralCode: newReferralCode } });
        if (!existing) isUnique = true;
        else newReferralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
      }
      
      await prisma.user.update({
        where: { id: userId },
        data: { referralCode: newReferralCode }
      });
      referralCode = newReferralCode;
    }

    // Get stats
    const totalReferrals = await prisma.user.count({
      where: { referredById: userId }
    });

    const totalEarnedAggregate = await prisma.affiliateEarning.aggregate({
      where: { referrerId: userId },
      _sum: { amount: true }
    });
    const totalEarned = totalEarnedAggregate._sum.amount || 0;

    // Get History (Recent Signups)
    const recentSignups = await prisma.user.findMany({
      where: { referredById: userId },
      select: { id: true, name: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const url = new URL(req.url);
    const earningsPage = parseInt(url.searchParams.get('earningsPage') || '1');
    const withdrawalsPage = parseInt(url.searchParams.get('withdrawalsPage') || '1');
    const limit = 5; // Show 5 per page for compact view

    // Get History (Recent Earnings) with pagination
    const totalEarningsCount = await prisma.affiliateEarning.count({
      where: { referrerId: userId }
    });
    const recentEarnings = await prisma.affiliateEarning.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: 'desc' },
      skip: (earningsPage - 1) * limit,
      take: limit
    });

    // Get History (Recent Withdrawals) with pagination
    const totalWithdrawalsCount = await prisma.withdrawalRequest.count({
      where: { userId: userId }
    });
    const recentWithdrawals = await prisma.withdrawalRequest.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      skip: (withdrawalsPage - 1) * limit,
      take: limit
    });

    return NextResponse.json({
      referralCode,
      affiliateBalance: user.affiliateBalance,
      totalReferrals,
      totalEarned,
      recentSignups,
      recentEarnings,
      recentWithdrawals,
      earningsPagination: {
        page: earningsPage,
        totalCount: totalEarningsCount,
        totalPages: Math.ceil(totalEarningsCount / limit)
      },
      withdrawalsPagination: {
        page: withdrawalsPage,
        totalCount: totalWithdrawalsCount,
        totalPages: Math.ceil(totalWithdrawalsCount / limit)
      }
    });

  } catch (error) {
    console.error("Affiliate GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}