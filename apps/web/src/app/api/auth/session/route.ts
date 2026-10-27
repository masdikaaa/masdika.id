import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionPayload } from '@/lib/session';
import { cookies } from 'next/headers';

import { decryptDeterministic } from '@/lib/encryption';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_session')?.value;

    if (!token) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const payload = getSessionPayload(token);
    const userId = payload?.userId;
    if (!userId) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // Check if session has been revoked/signed out
    if (payload?.sessionId) {
      const sessionLog = await prisma.loginLog.findFirst({
        where: { sessionId: payload.sessionId }
      });
      if (sessionLog && sessionLog.isRevoked) {
        const response = NextResponse.json({ user: null }, { status: 200 });
        response.cookies.delete('admin_session');
        return response;
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        isSuspended: true,
      },
    });

    if (!user || user.isSuspended) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    // Decrypt sensitive data before sending to client
    const decryptedUser = {
      ...user,
      name: user.name ? decryptDeterministic(user.name) : user.name,
      email: user.email ? decryptDeterministic(user.email) : user.email,
    };

    return NextResponse.json({ user: decryptedUser });
  } catch (error) {
    console.error('Session Error:', error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
