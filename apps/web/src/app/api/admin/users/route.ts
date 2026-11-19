import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';
import { decryptDeterministic } from '@/lib/encryption';
import { getIpSubnet, isLoopbackOrUnknownIp, normalizeIp } from '@/lib/ip-check';
import { searchCustomersElastic } from '@/lib/sync-elasticsearch';

export async function GET(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const url = new URL(req.url);
    const search = url.searchParams.get('q') || url.searchParams.get('search') || '';
    const status = url.searchParams.get('status'); // 'active' | 'blocked' | 'suspended' | null
    const isBlockedFilter = status === 'blocked' || status === 'suspended';

    // 1. Attempt Elasticsearch search if query is provided
    let elasticUserIds: number[] | null = null;
    if (search.trim()) {
      elasticUserIds = await searchCustomersElastic(search.trim(), {
        isSuspended: isBlockedFilter ? true : status === 'active' ? false : undefined,
        limit: 100,
      });
    }

    const whereClause: any = { role: 'USER' };
    if (isBlockedFilter) whereClause.isSuspended = true;
    if (status === 'active') whereClause.isSuspended = false;

    // If Elasticsearch responded with hits, scope query to matched IDs
    if (elasticUserIds !== null) {
      whereClause.id = { in: elasticUserIds };
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        balance: true,
        isSuspended: true,
        suspendReason: true,
        createdAt: true,
        lastActive: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const userIds = users.map((u) => u.id);
    const latestIpMap = new Map<number, string>();
    if (userIds.length > 0) {
      const recentLogs = await prisma.loginLog.findMany({
        where: { userId: { in: userIds } },
        orderBy: { createdAt: 'desc' },
        select: { userId: true, ipAddress: true },
      });
      for (const log of recentLogs) {
        if (!log.userId || latestIpMap.has(log.userId)) continue;
        const cleanIp = normalizeIp(log.ipAddress);
        if (cleanIp && !isLoopbackOrUnknownIp(cleanIp)) {
          latestIpMap.set(log.userId, cleanIp);
        }
      }
    }

    const decryptedUsers = users.map((u) => {
      const lastIp = latestIpMap.get(u.id) || null;
      return {
        ...u,
        isBlocked: u.isSuspended,
        blockReason: u.suspendReason,
        lastIp,
        lastSubnet: lastIp ? getIpSubnet(lastIp) : null,
        email: decryptDeterministic(u.email),
        name: u.name ? decryptDeterministic(u.name) : u.name,
      };
    });

    // 2. Local development fallback: if Elasticsearch is offline or not set up, filter in memory
    let finalUsers = decryptedUsers;
    if (elasticUserIds === null && search.trim()) {
      const q = search.trim().toLowerCase();
      finalUsers = decryptedUsers.filter(u =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        String(u.id) === q
      );
    }

    return NextResponse.json({
      success: true,
      data: finalUsers,
      meta: {
        total: finalUsers.length,
        source: elasticUserIds !== null ? 'elasticsearch' : 'database'
      }
    });
  } catch (error) {
    console.error("Fetch Users Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
