import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';
import { decryptDeterministic } from '@/lib/encryption';
import { searchCustomersElastic } from '@/lib/sync-elasticsearch';

export async function GET(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const url = new URL(req.url);
    const search = url.searchParams.get('q') || url.searchParams.get('search') || '';
    const status = url.searchParams.get('status'); // 'active' | 'suspended' | null

    // 1. Attempt Elasticsearch search if query is provided
    let elasticUserIds: number[] | null = null;
    if (search.trim()) {
      elasticUserIds = await searchCustomersElastic(search.trim(), {
        isSuspended: status === 'suspended' ? true : status === 'active' ? false : undefined,
        limit: 100,
      });
    }

    const whereClause: any = { role: 'USER' };
    if (status === 'suspended') whereClause.isSuspended = true;
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

    const decryptedUsers = users.map(u => ({
      ...u,
      email: decryptDeterministic(u.email),
      name: u.name ? decryptDeterministic(u.name) : u.name
    }));

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
