import { cookies } from 'next/headers';
import { verifySessionToken } from './session';
import { NextResponse } from 'next/server';
import { prisma } from './prisma';

export async function requireAuth(options?: { allowedRoles?: string[] }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;
  
  if (!token) {
    return { error: 'Unauthorized', status: 401 };
  }

  const userId = verifySessionToken(token);
  
  if (!userId) {
    return { error: 'Unauthorized', status: 401 };
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

  return { userId, user };
}
