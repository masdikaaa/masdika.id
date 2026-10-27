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

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    return { error: 'Unauthorized', status: 401 };
  }

  if (user.isSuspended) {
    return { error: user.suspendReason || 'Account suspended', status: 403, isSuspended: true, userId, user };
  }

  const allowedRoles = options?.allowedRoles || ['ADMIN'];
  if (!allowedRoles.includes(user.role)) {
    return { error: 'Forbidden: Insufficient role', status: 403 };
  }

  return { userId, user, sessionId: payload?.sessionId };
}
