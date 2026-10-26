import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { decryptDeterministic } from '@/lib/encryption';
import { getClientIp } from '@/lib/get-ip';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const currentIp = getClientIp(req);
    const plainEmail = (decryptDeterministic(auth.user.email) || auth.user.email || '').toLowerCase().trim();

    // 1. Fetch from loginLog (tracks credentials login attempts)
    const loginLogs = await prisma.loginLog.findMany({
      where: {
        OR: [
          { emailAttempt: plainEmail },
          { emailAttempt: auth.user.email }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 25
    });

    // 2. Fetch from clientActivityLog (tracks SSO, admin impersonation, password changes)
    const activityAuthLogs = await prisma.clientActivityLog.findMany({
      where: {
        userId: auth.user.id,
        category: 'auth'
      },
      orderBy: { createdAt: 'desc' },
      take: 25
    });

    // Format and combine
    const formattedLogs = [
      ...loginLogs.map(l => ({
        id: `login-${l.id}`,
        ipAddress: l.ipAddress || '127.0.0.1',
        isCurrentDevice: (l.ipAddress || '') === currentIp,
        status: l.success ? 'SUCCESS' : (l.isBanned ? 'BLOCKED' : 'FAILED'),
        method: 'Password / Credentials',
        description: l.success ? 'Logged in successfully' : 'Failed login attempt',
        createdAt: l.createdAt
      })),
      ...activityAuthLogs.map(a => ({
        id: `activity-${a.id}`,
        ipAddress: a.ipAddress || '127.0.0.1',
        isCurrentDevice: (a.ipAddress || '') === currentIp,
        status: 'SUCCESS',
        method: a.username === 'System' ? 'System Auth' : (a.username !== auth.user?.name ? 'Admin Impersonation' : 'Account Security Event'),
        description: a.description,
        createdAt: a.createdAt
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 30);

    return NextResponse.json({
      success: true,
      currentIp,
      logs: formattedLogs
    });
  } catch (error: any) {
    console.error('Fetch security login logs error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch login logs' }, { status: 500 });
  }
}
