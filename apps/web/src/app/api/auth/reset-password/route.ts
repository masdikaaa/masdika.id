import { NextResponse } from 'next/server';
import { getClientIp } from '@/lib/get-ip';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { hashPassword } from '@/lib/encryption';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password || typeof token !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 });
    }

    // Rate limit: 5 requests per 15 minutes per IP
    const ip = getClientIp(req);

    const allowed = await checkRateLimit('RESET_PWD', ip, 5, 900);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
    }

    if (password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: 'Password must be between 8 and 128 characters long' }, { status: 400 });
    }

    // Hash the incoming token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find the token in database
    const resetToken = await prisma.resetToken.findUnique({
      where: { token: hashedToken },
      include: { user: true }
    });

    if (!resetToken) {
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 });
    }

    // Check if token is expired
    if (resetToken.expiresAt < new Date()) {
      await prisma.resetToken.delete({ where: { id: resetToken.id } }).catch(() => {});
      return NextResponse.json({ error: 'Reset link has expired. Please request a new one.' }, { status: 400 });
    }

    // Check if token was already used
    if (resetToken.usedAt) {
      return NextResponse.json({ error: 'This reset link has already been used' }, { status: 400 });
    }

    // Hash the new password
    const hashedPassword = hashPassword(password);

    // Atomically claim token, update password, and revoke all existing sessions
    try {
      await prisma.$transaction(async (tx) => {
        const claimed = await tx.resetToken.updateMany({
          where: {
            id: resetToken.id,
            usedAt: null,
            expiresAt: { gt: new Date() },
          },
          data: { usedAt: new Date() },
        });

        if (claimed.count === 0) {
          throw new Error('TOKEN_ALREADY_USED');
        }

        await tx.user.update({
          where: { id: resetToken.userId },
          data: { password: hashedPassword },
        });

        // Revoke all active login sessions so compromised sessions are immediately invalidated
        await tx.loginLog.updateMany({
          where: { userId: resetToken.userId, isRevoked: false },
          data: { isRevoked: true },
        });

        // Clean up any other pending reset tokens for this user
        await tx.resetToken.deleteMany({
          where: {
            userId: resetToken.userId,
            id: { not: resetToken.id },
          },
        });
      });
    } catch (txErr: any) {
      if (txErr?.message === 'TOKEN_ALREADY_USED') {
        return NextResponse.json({ error: 'This reset link has already been used' }, { status: 400 });
      }
      throw txErr;
    }

    return NextResponse.json({ success: true, message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
