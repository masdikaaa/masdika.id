import { cookies } from 'next/headers';
import { verifySessionToken, getSessionPayload } from './session';
import { NextResponse } from 'next/server';
import { prisma } from './prisma';

export async function requireAuth(options?: { allowedRoles?: string[] }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  
  if (!token) {
    return { error: 'Unauthorized', status: 401 };
  }

  const payload = getSessionPayload(token);
  const userId = payload?.userId;
  
  if (!userId) {
    return { error: 'Unauthorized', status: 401 };
  }

  // Check if session has been revoked/signed out
  if (payload?.sessionId) {
    const sessionLog = await prisma.loginLog.findFirst({
      where: { sessionId: payload.sessionId }
    });
    if (sessionLog && sessionLog.isRevoked) {
      return { error: 'Session has been revoked. Please log in again.', status: 401, isRevoked: true };
    }
  }

  // If this is an admin impersonation session, also verify the impersonating admin is still active
  if (payload?.impersonatedBy) {
    const adminUser = await prisma.user.findUnique({
      where: { id: payload.impersonatedBy },
      select: { id: true, role: true, isSuspended: true }
    });
    if (!adminUser || adminUser.isSuspended || !['ADMIN', 'SUPER_ADMIN'].includes(adminUser.role)) {
      return { error: 'Impersonation session is no longer valid.', status: 401 };
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    return { error: 'Unauthorized', status: 401 };
  }

  if (user.isSuspended) {
    return { error: user.suspendReason || 'Account suspended', status: 403, isSuspended: true, userId, user };
  }

  const rawAllowedRoles = options?.allowedRoles || ['ADMIN'];
  const allowedRoles = rawAllowedRoles.includes('ADMIN') && !rawAllowedRoles.includes('SUPER_ADMIN')
    ? [...rawAllowedRoles, 'SUPER_ADMIN']
    : rawAllowedRoles;
  if (!allowedRoles.includes(user.role)) {
    return { error: 'Forbidden: Insufficient role', status: 403 };
  }

  return { userId, user, sessionId: payload?.sessionId, impersonatedBy: payload?.impersonatedBy };
}
