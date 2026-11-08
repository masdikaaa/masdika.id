import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { decryptDeterministic } from '@/lib/encryption';
import { getClientIp } from '@/lib/get-ip';
import { parseUserAgent } from '@/lib/device';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const currentIp = getClientIp(req);
    const plainEmail = (decryptDeterministic(auth.user.email) || auth.user.email || '').toLowerCase().trim();

    // Query pagination params
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '5', 10) || 5));

    // 1. Fetch credentials / OAuth login attempts from loginLog
    const loginLogs = await prisma.loginLog.findMany({
      where: {
        OR: [
          { userId: auth.user.id },
          { emailAttempt: plainEmail },
          { emailAttempt: auth.user.email }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    // 2. Fetch security audit logs from clientActivityLog (password change, impersonation, etc.)
    const activityAuthLogs = await prisma.clientActivityLog.findMany({
      where: {
        userId: auth.user.id,
        category: 'auth'
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    // 3. Format loginLogs with device parsing
    const formattedLoginLogs = loginLogs.map((l) => {
      const parsed = parseUserAgent(l.userAgent);
      const device = l.device || parsed.device;
      const browser = l.browser || parsed.browser;
      const os = l.os || parsed.os;
      const label = `${browser} on ${os}`;

      // Determine if this is the active/current device
      const isCurrentSession = auth.sessionId ? l.sessionId === auth.sessionId : false;
      const isCurrentIp = (l.ipAddress || '') === currentIp;
      const isCurrent = isCurrentSession || (!auth.sessionId && isCurrentIp);

      return {
        id: `login-${l.id}`,
        rawId: l.id,
        sessionId: l.sessionId,
        ipAddress: l.ipAddress || '127.0.0.1',
        isCurrentDevice: isCurrent,
        isSession: true,
        isRevoked: l.isRevoked || false,
        status: l.success ? (l.isRevoked ? 'REVOKED' : 'SUCCESS') : (l.isBanned ? 'BLOCKED' : 'FAILED'),
        method: l.sessionId ? 'Login Session' : 'Password / Credentials',
        description: l.success ? (l.isRevoked ? 'Session revoked' : 'Active / Logged in') : 'Failed login attempt',
        device,
        browser,
        os,
        deviceLabel: label,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt
      };
    });

    // 4. Format activityAuthLogs
    const formattedActivityLogs = activityAuthLogs.map((a) => {
      const parsed = parseUserAgent(null);
      const isCurrent = (a.ipAddress || '') === currentIp;

      return {
        id: `activity-${a.id}`,
        rawId: a.id,
        sessionId: null,
        ipAddress: a.ipAddress || '127.0.0.1',
        isCurrentDevice: isCurrent,
        isSession: false,
        isRevoked: false,
        status: 'SUCCESS',
        method: a.username === 'System' ? 'System Auth' : (a.username !== auth.user?.name ? 'Admin Impersonation' : 'Account Activity'),
        description: a.description,
        device: parsed.device,
        browser: parsed.browser,
        os: parsed.os,
        deviceLabel: 'Security Activity',
        createdAt: a.createdAt,
        updatedAt: a.createdAt
      };
    });

    // 5. Combine and sort
    const allLogs = [...formattedLoginLogs, ...formattedActivityLogs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // 6. Deduplicate: if device and IP match, keep only the most recent login timestamp
    const seenSuccessKeys = new Set<string>();
    const deduplicatedLogs: typeof allLogs = [];

    for (const log of allLogs) {
      if (log.isSession && (log.status === 'SUCCESS' || log.status === 'REVOKED')) {
        // Group by IP + device + browser + os
        const dedupeKey = `${log.ipAddress}_${log.device}_${log.browser}_${log.os}`;
        if (seenSuccessKeys.has(dedupeKey)) {
          // If we already have the most recent login for this device & IP, skip older duplicates
          continue;
        }
        seenSuccessKeys.add(dedupeKey);
      }
      deduplicatedLogs.push(log);
    }

    // 7. Paginate
    const totalItems = deduplicatedLogs.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const validPage = Math.min(page, totalPages);
    const startIndex = (validPage - 1) * limit;
    const paginatedLogs = deduplicatedLogs.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      success: true,
      currentIp,
      currentSessionId: auth.sessionId || null,
      logs: paginatedLogs,
      pagination: {
        page: validPage,
        limit,
        total: totalItems,
        totalPages
      }
    });
  } catch (error: any) {
    console.error('Fetch security login logs error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch login logs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 });
    }

    if (auth.impersonatedBy) {
      return NextResponse.json({ error: 'Session security logs cannot be modified during impersonation.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, logId } = body;
    const plainEmail = (decryptDeterministic(auth.user.email) || auth.user.email || '').toLowerCase().trim();
    const retentionCutoff = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);

    // Revoke a single session
    if (action === 'revoke') {
      if (!logId) {
        return NextResponse.json({ error: 'Log ID is required' }, { status: 400 });
      }

      const log = await prisma.loginLog.findFirst({
        where: {
          id: Number(logId),
          OR: [
            { userId: auth.user.id },
            { emailAttempt: plainEmail },
            { emailAttempt: auth.user.email }
          ]
        }
      });

      if (!log) {
        return NextResponse.json({ error: 'Session record not found' }, { status: 404 });
      }

      // Mark as revoked
      await prisma.loginLog.update({
        where: { id: log.id },
        data: { isRevoked: true }
      });

      const currentIp = getClientIp(req);
      const isCurrentSession = auth.sessionId ? log.sessionId === auth.sessionId : false;
      const isCurrent = isCurrentSession || (!auth.sessionId && log.ipAddress === currentIp);

      const res = NextResponse.json({
        success: true,
        message: isCurrent ? 'Current session ended successfully' : 'Device session revoked successfully',
        isCurrentDevice: isCurrent
      });

      if (isCurrent) {
        res.cookies.delete('admin_session');
      }

      return res;
    }

    // Revoke all other sessions
    if (action === 'revoke_all_other') {
      await prisma.loginLog.updateMany({
        where: {
          OR: [
            { userId: auth.user.id },
            { emailAttempt: plainEmail },
            { emailAttempt: auth.user.email }
          ],
          ...(auth.sessionId ? { NOT: { sessionId: auth.sessionId } } : {}),
          isRevoked: false
        },
        data: { isRevoked: true }
      });

      return NextResponse.json({
        success: true,
        message: 'All other device sessions revoked successfully'
      });
    }

    // Delete a single log/session record from history
    if (action === 'delete') {
      if (!logId) {
        return NextResponse.json({ error: 'Log ID is required' }, { status: 400 });
      }

      if (String(logId).startsWith('activity-')) {
        const id = Number(String(logId).replace('activity-', ''));
        await prisma.clientActivityLog.deleteMany({
          where: { id, userId: auth.user.id }
        });
      } else {
        const id = Number(String(logId).replace('login-', ''));
        if (!Number.isSafeInteger(id) || id <= 0) {
          return NextResponse.json({ error: 'Invalid log ID' }, { status: 400 });
        }
        const targetLog = await prisma.loginLog.findFirst({
          where: {
            id,
            OR: [
              { userId: auth.user.id },
              { emailAttempt: plainEmail },
              { emailAttempt: auth.user.email }
            ]
          }
        });

        if (targetLog) {
          if (targetLog.sessionId && targetLog.createdAt >= retentionCutoff) {
            // Preserve sessionId tombstone for 31 days so revoked/removed sessions cannot be replayed
            await prisma.loginLog.update({
              where: { id: targetLog.id },
              data: {
                isRevoked: targetLog.sessionId === auth.sessionId ? targetLog.isRevoked : true,
                userId: targetLog.sessionId === auth.sessionId ? targetLog.userId : null,
                emailAttempt: targetLog.sessionId === auth.sessionId ? targetLog.emailAttempt : '[revoked-tombstone]'
              }
            });
          } else {
            await prisma.loginLog.delete({ where: { id: targetLog.id } });
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Login record removed successfully'
      });
    }

    // Clear all login history (except current active session)
    if (action === 'clear_history') {
      const ownerFilter = {
        OR: [
          { userId: auth.user.id },
          { emailAttempt: plainEmail },
          { emailAttempt: auth.user.email }
        ],
        ...(auth.sessionId ? { NOT: { sessionId: auth.sessionId } } : {})
      };

      // Tombstone recent session-bearing rows so revoked tokens stay blocked until natural expiry
      await prisma.loginLog.updateMany({
        where: {
          ...ownerFilter,
          sessionId: { not: null },
          createdAt: { gte: retentionCutoff }
        },
        data: {
          isRevoked: true,
          userId: null,
          emailAttempt: '[revoked-tombstone]'
        }
      });

      // Safe to hard-delete non-session or >31-day-old records
      await prisma.loginLog.deleteMany({
        where: {
          ...ownerFilter,
          OR: [
            { sessionId: null },
            { createdAt: { lt: retentionCutoff } }
          ]
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Login history cleared successfully'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Revoke session error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to revoke session' }, { status: 500 });
  }
}
