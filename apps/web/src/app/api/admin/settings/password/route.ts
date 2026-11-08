import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/encryption';
import { requireAuth } from '@/lib/auth-middleware';
import { checkRateLimit } from '@/lib/rate-limit';

export async function PUT(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (auth.impersonatedBy) {
    return NextResponse.json({ error: 'Admin password cannot be modified during impersonation.' }, { status: 403 });
  }

  if (!(await checkRateLimit('ADMIN_PWD_CHANGE', String(auth.userId), 5, 600))) {
    return NextResponse.json({ error: 'Too many password attempts. Please wait 10 minutes.' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword || typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return NextResponse.json({ error: 'Current and new passwords are required' }, { status: 400 });
    }

    if (newPassword.length < 8 || newPassword.length > 128) {
      return NextResponse.json({ error: 'New password must be between 8 and 128 characters long' }, { status: 400 });
    }

    if (currentPassword === newPassword) {
      return NextResponse.json({ error: 'New password cannot be the same as the current password' }, { status: 400 });
    }

    const user = auth.user;
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!verifyPassword(currentPassword, user.password)) {
      return NextResponse.json({ error: 'Incorrect current password' }, { status: 401 });
    }

    const hashedNewPassword = hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedNewPassword }
      }),
      prisma.loginLog.updateMany({
        where: {
          userId: user.id,
          isRevoked: false,
          ...(auth.sessionId ? { NOT: { sessionId: auth.sessionId } } : {})
        },
        data: { isRevoked: true }
      })
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating password:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
