import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionPayload } from '@/lib/session';
import { logClientActivity } from '@/lib/activity-log';
import { getClientIp } from '@/lib/get-ip';
import { decryptDeterministic } from '@/lib/encryption';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const impersonatorToken = cookieStore.get('masdika_impersonator_token')?.value || req.cookies.get('masdika_impersonator_token')?.value;
    const infoRaw = cookieStore.get('masdika_impersonating_info')?.value || req.cookies.get('masdika_impersonating_info')?.value;

    let targetId: number | null = null;
    let targetName = 'User';
    if (infoRaw) {
      try {
        const parsed = JSON.parse(infoRaw);
        const parsedId = Number(parsed?.targetId);
        if (Number.isSafeInteger(parsedId) && parsedId > 0) {
          targetId = parsedId;
        }
        targetName = typeof parsed?.targetName === 'string' ? parsed.targetName.slice(0, 100) : 'User';
      } catch {}
    }

    if (!impersonatorToken) {
      return NextResponse.json({ error: 'No active impersonation session found' }, { status: 400 });
    }

    const adminPayload = getSessionPayload(impersonatorToken);
    if (!adminPayload || adminPayload.impersonatedBy) {
      const invalidRes = NextResponse.json({ error: 'Invalid or expired admin session' }, { status: 401 });
      invalidRes.cookies.delete('masdika_impersonator_token');
      invalidRes.cookies.delete('masdika_impersonating_info');
      return invalidRes;
    }

    if (adminPayload.sessionId) {
      const sessionLog = await prisma.loginLog.findFirst({
        where: { sessionId: adminPayload.sessionId }
      });
      if (sessionLog?.isRevoked) {
        const revRes = NextResponse.json({ error: 'Admin session has been revoked. Please sign in again.' }, { status: 401 });
        revRes.cookies.delete('admin_session');
        revRes.cookies.delete('masdika_impersonator_token');
        revRes.cookies.delete('masdika_impersonating_info');
        return revRes;
      }
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: adminPayload.userId }
    });

    if (!adminUser || adminUser.isSuspended || !['ADMIN', 'SUPER_ADMIN'].includes(adminUser.role)) {
      const forbRes = NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
      forbRes.cookies.delete('admin_session');
      forbRes.cookies.delete('masdika_impersonator_token');
      forbRes.cookies.delete('masdika_impersonating_info');
      return forbRes;
    }

    const adminName = adminUser.name ? decryptDeterministic(adminUser.name) : 'Admin';
    const ip = getClientIp(req);

    // Audit log
    if (targetId) {
      await logClientActivity({
        userId: targetId,
        description: `Admin impersonation ended by ${adminName}`,
        username: adminName,
        category: 'auth',
        ipAddress: ip,
        metadata: { adminId: adminUser.id, adminName }
      }).catch(() => {});
    }

    const redirectUrl = targetId ? `/admin/customers/${targetId}` : '/admin/customers';
    const response = NextResponse.json({
      success: true,
      message: `Impersonation ended for ${targetName}`,
      redirectUrl
    });

    const remainingMaxAge = Math.max(60, adminPayload.exp - Math.floor(Date.now() / 1000));

    // 1. Restore original admin token as active session without extending token lifetime
    response.cookies.set('admin_session', impersonatorToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: remainingMaxAge,
    });

    // 2. Clear impersonation cookies
    response.cookies.delete('masdika_impersonator_token');
    response.cookies.delete('masdika_impersonating_info');

    return response;
  } catch (error: any) {
    console.error('Stop impersonation error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to stop impersonation' }, { status: 500 });
  }
}
