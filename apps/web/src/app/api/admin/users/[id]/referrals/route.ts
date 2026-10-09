import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';
import { decryptDeterministic } from '@/lib/encryption';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const userId = parseInt(params.id);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { affiliateBalance: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const totalReferrals = await prisma.user.count({
      where: { referredById: userId }
    });

    const totalEarnedAggregate = await prisma.affiliateEarning.aggregate({
      where: { referrerId: userId },
      _sum: { amount: true }
    });
    const totalEarned = totalEarnedAggregate._sum.amount || 0;

    const referredUsersRaw = await prisma.user.findMany({
      where: { referredById: userId },
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });

    const referredUsers = referredUsersRaw.map(u => ({
      ...u,
      email: decryptDeterministic(u.email)
    }));

    return NextResponse.json({
      success: true,
      data: {
        affiliateBalance: user.affiliateBalance,
        totalReferrals,
        totalEarned,
        referredUsers
      }
    });

  } catch (error) {
    console.error("Get Referrals Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const userId = parseInt(params.id);

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Reset referred users
    await prisma.user.updateMany({
      where: { referredById: userId },
      data: { referredById: null }
    });

    // Reset affiliate balance on user
    await prisma.user.update({
      where: { id: userId },
      data: { affiliateBalance: 0 }
    });

    // Wipe affiliate earnings history as referrer
    await prisma.affiliateEarning.deleteMany({
      where: { referrerId: userId }
    });

    return NextResponse.json({ success: true, message: "Referrals reset successfully" });
  } catch (error) {
    console.error("Reset Referrals Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
