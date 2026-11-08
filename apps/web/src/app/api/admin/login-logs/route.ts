import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';

export async function GET(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    
    const logs = await prisma.loginLog.findMany({
      where: {
        NOT: { emailAttempt: '[revoked-tombstone]' }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching login logs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (auth.impersonatedBy) {
      return NextResponse.json({ error: 'Cannot modify login logs during impersonation' }, { status: 403 });
    }

    const body = await req.json();
    const { ids, ipAddress } = body;

    if (ipAddress && typeof ipAddress === 'string') {
      // Unban IP if requested
      await prisma.blockedUser.deleteMany({
        where: { type: 'IP', value: ipAddress }
      });
      await prisma.loginLog.updateMany({
        where: { ipAddress: ipAddress, isBanned: true },
        data: { isBanned: false }
      });
      return NextResponse.json({ success: true, message: `IP ${ipAddress} unbanned` });
    }

    if (ids && Array.isArray(ids)) {
      const safeIds = ids.map(Number).filter(n => Number.isSafeInteger(n) && n > 0);
      const retentionCutoff = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);

      // Tombstone recent revoked session logs so revoked tokens cannot be replayed
      await prisma.loginLog.updateMany({
        where: {
          id: { in: safeIds },
          isRevoked: true,
          sessionId: { not: null },
          createdAt: { gte: retentionCutoff }
        },
        data: {
          userId: null,
          emailAttempt: '[revoked-tombstone]'
        }
      });

      await prisma.loginLog.deleteMany({
        where: {
          id: { in: safeIds },
          OR: [
            { isRevoked: false },
            { sessionId: null },
            { createdAt: { lt: retentionCutoff } }
          ]
        }
      });
      return NextResponse.json({ success: true, message: 'Logs deleted' });
    }

    return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
  } catch (error) {
    console.error('Error managing login logs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
