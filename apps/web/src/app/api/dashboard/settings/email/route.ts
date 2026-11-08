import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { sendEmailChangeOtpEmail } from '@/lib/email';
import { decryptDeterministic, encryptDeterministic } from '@/lib/encryption';
import { checkRateLimit } from '@/lib/rate-limit';
import crypto from 'crypto';

export async function POST(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (auth.impersonatedBy) {
    return NextResponse.json({ error: 'Email address cannot be changed during an impersonation session.' }, { status: 403 });
  }

  try {
    const userId = auth.userId as number;
    const { action, newEmail, otpCode } = await req.json();

    if (!newEmail || typeof newEmail !== 'string') {
      return NextResponse.json({ error: 'Valid new email is required' }, { status: 400 });
    }

    const normalizedNewEmail = newEmail.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedNewEmail) || normalizedNewEmail.length > 254) {
      return NextResponse.json({ error: 'Invalid email address format' }, { status: 400 });
    }

    const encryptedNewEmail = encryptDeterministic(normalizedNewEmail);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.email) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (action === 'request_otp') {
      if (!(await checkRateLimit('CHANGE_EMAIL_REQ', String(userId), 3, 600))) {
        return NextResponse.json({ error: 'Too many OTP requests. Please wait 10 minutes.' }, { status: 429 });
      }

      // Check if new email is already taken
      const existingUser = await prisma.user.findUnique({
        where: { email: encryptedNewEmail }
      });

      if (existingUser && existingUser.id !== userId) {
        return NextResponse.json({ error: 'Email is already in use by another account' }, { status: 400 });
      }

      // Generate secure 6-digit OTP and bind it to the target encryptedNewEmail
      const otp = crypto.randomInt(100000, 1000000).toString();

      await prisma.userVerificationOtp.deleteMany({
        where: { userId, type: 'CHANGE_EMAIL' }
      });

      await prisma.userVerificationOtp.create({
        data: {
          userId: userId,
          code: `${otp}:${encryptedNewEmail}`,
          type: 'CHANGE_EMAIL',
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        }
      });

      const currentEmailDecrypted = decryptDeterministic(user.email);
      const userName = user.name ? decryptDeterministic(user.name) : 'User';

      await sendEmailChangeOtpEmail(currentEmailDecrypted, userName, otp, normalizedNewEmail);

      return NextResponse.json({ success: true, message: 'Verification code sent to your current email' });
    }

    if (action === 'verify_and_change') {
      if (!(await checkRateLimit('CHANGE_EMAIL_VERIFY', String(userId), 5, 600))) {
        await prisma.userVerificationOtp.deleteMany({ where: { userId, type: 'CHANGE_EMAIL' } }).catch(() => {});
        return NextResponse.json({ error: 'Too many invalid attempts. Please request a new code.' }, { status: 429 });
      }

      const tokenStr = typeof otpCode === 'string' || typeof otpCode === 'number' ? String(otpCode).trim() : '';
      if (!/^\d{6}$/.test(tokenStr)) {
        return NextResponse.json({ error: 'A valid 6-digit verification code is required' }, { status: 400 });
      }

      const validOtp = await prisma.userVerificationOtp.findFirst({
        where: {
          userId: userId,
          type: 'CHANGE_EMAIL',
          expiresAt: { gt: new Date() }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (!validOtp) {
        return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 });
      }

      const sepIndex = validOtp.code.indexOf(':');
      const expectedOtp = sepIndex !== -1 ? validOtp.code.slice(0, sepIndex) : validOtp.code;
      const boundEmail = sepIndex !== -1 ? validOtp.code.slice(sepIndex + 1) : encryptedNewEmail;

      const expBuf = Buffer.from(expectedOtp, 'utf8');
      const provBuf = Buffer.from(tokenStr, 'utf8');
      const otpMatch = expBuf.length === provBuf.length && crypto.timingSafeEqual(expBuf, provBuf);

      if (!otpMatch || boundEmail !== encryptedNewEmail) {
        return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 });
      }

      try {
        await prisma.$transaction(async (tx) => {
          const consumed = await tx.userVerificationOtp.deleteMany({
            where: { id: validOtp.id, userId, type: 'CHANGE_EMAIL' }
          });
          if (consumed.count === 0) {
            throw new Error('OTP_ALREADY_USED');
          }

          const conflict = await tx.user.findUnique({ where: { email: encryptedNewEmail } });
          if (conflict && conflict.id !== userId) {
            throw new Error('EMAIL_IN_USE');
          }

          await tx.user.update({
            where: { id: userId },
            data: { email: encryptedNewEmail }
          });

          // Revoke all other active sessions on email change
          await tx.loginLog.updateMany({
            where: {
              userId,
              isRevoked: false,
              ...(auth.sessionId ? { NOT: { sessionId: auth.sessionId } } : {})
            },
            data: { isRevoked: true }
          });
        });
      } catch (txErr: any) {
        if (txErr?.message === 'EMAIL_IN_USE' || txErr?.code === 'P2002') {
          return NextResponse.json({ error: 'Email is already in use by another account' }, { status: 400 });
        }
        if (txErr?.message === 'OTP_ALREADY_USED') {
          return NextResponse.json({ error: 'Verification code has already been used' }, { status: 400 });
        }
        throw txErr;
      }

      return NextResponse.json({ success: true, message: 'Email address updated successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Email change error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
