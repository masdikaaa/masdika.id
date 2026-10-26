import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySessionToken } from '@/lib/session';
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
        targetId = parsed.targetId;
        targetName = parsed.targetName || 'User';
      } catch {}
    }

    if (!impersonatorToken) {
      return NextResponse.json({ error: 'No active impersonation session found' }, { status: 400 });
    }

    const adminId = verifySessionToken(impersonatorToken);
    if (!adminId) {
      return NextResponse.json({ error: 'Invalid or expired admin session' }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: adminId }
    });

    if (!adminUser || adminUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
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

    // 1. Restore original admin token as active session
    response.cookies.set('admin_session', impersonatorToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
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
