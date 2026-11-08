import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { createSessionToken } from '@/lib/session';
import { decryptDeterministic } from '@/lib/encryption';
import { logClientActivity } from '@/lib/activity-log';
import { getClientIp } from '@/lib/get-ip';
import { cookies } from 'next/headers';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 });
    }

    if (auth.impersonatedBy) {
      return NextResponse.json({ error: 'Nested impersonation is not permitted. Exit your current impersonation session first.' }, { status: 400 });
    }

    const { id } = await context.params;
    const targetUserId = parseInt(id, 10);
    if (!Number.isSafeInteger(targetUserId) || targetUserId <= 0) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    if (auth.user.id === targetUserId) {
      return NextResponse.json({ error: 'Cannot impersonate yourself' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    if (targetUser.role !== 'USER') {
      return NextResponse.json({ error: 'Impersonation of administrator accounts is forbidden' }, { status: 403 });
    }

    const cookieStore = await cookies();
    const adminToken = cookieStore.get('admin_session')?.value;
    if (!adminToken) {
      return NextResponse.json({ error: 'Admin session token not found' }, { status: 401 });
    }

    // Generate short-lived (2h) signed session token bound to impersonator admin ID
    const { token: clientToken } = createSessionToken(targetUser.id, targetUser.role, false, undefined, {
      customMaxAgeSec: 7200,
      impersonatedBy: auth.user.id,
    });
    const adminName = auth.user.name ? decryptDeterministic(auth.user.name) : 'Admin';
    const targetName = decryptDeterministic(targetUser.name) || targetUser.name || 'User';
    const targetEmail = decryptDeterministic(targetUser.email) || targetUser.email || '';
    const ip = getClientIp(req);

    // Audit log
    await logClientActivity({
      userId: targetUser.id,
      description: `Admin impersonation started by ${adminName}`,
      username: adminName,
      category: 'auth',
      ipAddress: ip,
      metadata: { adminId: auth.user.id, adminName }
    });

    const response = NextResponse.json({
      success: true,
      message: `Now impersonating ${targetName}`,
      redirectUrl: '/dashboard'
    });

    // 1. Set client session as active session
    response.cookies.set('admin_session', clientToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7200, // 2 hours
    });

    // 2. Preserve original admin token so admin can return seamlessly
    response.cookies.set('masdika_impersonator_token', adminToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7200,
    });

    // 3. Store metadata for client banner
    response.cookies.set('masdika_impersonating_info', JSON.stringify({
      targetId: targetUser.id,
      targetName,
      targetEmail,
      adminId: auth.user.id,
      adminName
    }), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7200,
    });

    return response;
  } catch (error: any) {
    console.error('Impersonate user error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to impersonate user' }, { status: 500 });
  }
}
