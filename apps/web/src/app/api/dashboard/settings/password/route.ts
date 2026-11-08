import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { verifyPassword, hashPassword, decryptDeterministic } from '@/lib/encryption';
import { sendPasswordChangeOtpEmail } from '@/lib/email';
import { checkRateLimit } from '@/lib/rate-limit';
import * as crypto from 'crypto';

export async function POST(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (auth.impersonatedBy) {
    return NextResponse.json({ error: 'Password cannot be changed during an impersonation session.' }, { status: 403 });
  }

  try {
    const { action, oldPassword, newPassword, otpCode } = await req.json();

    const user = await prisma.user.findUnique({
      where: { id: auth.userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (action === 'request_otp') {
      if (!(await checkRateLimit('CHANGE_PWD_REQ', String(user.id), 5, 600))) {
        return NextResponse.json({ error: 'Too many password change attempts. Please wait 10 minutes.' }, { status: 429 });
      }

      if (!oldPassword || typeof oldPassword !== 'string') {
        return NextResponse.json({ error: 'Old password is required' }, { status: 400 });
      }
      if (!verifyPassword(oldPassword, user.password)) {
        return NextResponse.json({ error: 'Incorrect old password' }, { status: 400 });
      }

      // Generate secure 6-digit OTP
      const otp = crypto.randomInt(100000, 1000000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Delete existing OTPs for change password
      await prisma.userVerificationOtp.deleteMany({
        where: { userId: user.id, type: 'CHANGE_PASSWORD' }
      });

      await prisma.userVerificationOtp.create({
        data: {
          userId: user.id,
          code: otp,
          type: 'CHANGE_PASSWORD',
          expiresAt
        }
      });

      const email = decryptDeterministic(user.email);
      const plainName = user.name ? decryptDeterministic(user.name) : 'User';
      await sendPasswordChangeOtpEmail(email, plainName, otp);

      return NextResponse.json({ success: true, message: 'OTP sent to your email' });
    }

    if (action === 'verify_and_change') {
      if (!(await checkRateLimit('CHANGE_PWD_VERIFY', String(user.id), 5, 600))) {
        await prisma.userVerificationOtp.deleteMany({ where: { userId: user.id, type: 'CHANGE_PASSWORD' } }).catch(() => {});
        return NextResponse.json({ error: 'Too many invalid OTP attempts. Please request a new OTP.' }, { status: 429 });
      }

      if (!otpCode || !newPassword || typeof newPassword !== 'string') {
        return NextResponse.json({ error: 'OTP and new password are required' }, { status: 400 });
      }

      if (newPassword.length < 8 || newPassword.length > 128) {
        return NextResponse.json({ error: 'New password must be between 8 and 128 characters long' }, { status: 400 });
      }

      const tokenStr = String(otpCode).trim();
      if (!/^\d{6}$/.test(tokenStr)) {
        return NextResponse.json({ error: 'Invalid OTP code' }, { status: 400 });
      }

      const otpRecord = await prisma.userVerificationOtp.findFirst({
        where: { userId: user.id, type: 'CHANGE_PASSWORD' },
        orderBy: { createdAt: 'desc' }
      });

      if (!otpRecord) return NextResponse.json({ error: 'No OTP requested' }, { status: 400 });
      if (otpRecord.expiresAt < new Date()) {
        await prisma.userVerificationOtp.deleteMany({ where: { userId: user.id, type: 'CHANGE_PASSWORD' } }).catch(() => {});
        return NextResponse.json({ error: 'OTP has expired' }, { status: 400 });
      }

      const expBuf = Buffer.from(otpRecord.code, 'utf8');
      const provBuf = Buffer.from(tokenStr, 'utf8');
      if (expBuf.length !== provBuf.length || !crypto.timingSafeEqual(expBuf, provBuf)) {
        return NextResponse.json({ error: 'Invalid OTP code' }, { status: 400 });
      }

      const hashedNewPassword = hashPassword(newPassword);

      await prisma.$transaction(async (tx) => {
        const consumed = await tx.userVerificationOtp.deleteMany({
          where: { id: otpRecord.id, userId: user.id, type: 'CHANGE_PASSWORD' }
        });
        if (consumed.count === 0) {
          throw new Error('OTP_ALREADY_USED');
        }

        await tx.user.update({
          where: { id: user.id },
          data: { password: hashedNewPassword }
        });

        // Revoke all other active sessions on password change
        await tx.loginLog.updateMany({
          where: {
            userId: user.id,
            isRevoked: false,
            ...(auth.sessionId ? { NOT: { sessionId: auth.sessionId } } : {})
          },
          data: { isRevoked: true }
        });
      });

      return NextResponse.json({ success: true, message: 'Password changed successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    if (error?.message === 'OTP_ALREADY_USED') {
      return NextResponse.json({ error: 'OTP has already been used' }, { status: 400 });
    }
    console.error('Password change error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
