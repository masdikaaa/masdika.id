import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { sendEmailChangeOtpEmail } from '@/lib/email';
import { decryptDeterministic, encryptDeterministic } from '@/lib/encryption';
import crypto from 'crypto';

export async function POST(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const userId = auth.userId as number;
    const { action, newEmail, otpCode } = await req.json();

    if (!newEmail || typeof newEmail !== 'string') {
      return NextResponse.json({ error: 'Valid new email is required' }, { status: 400 });
    }

    const encryptedNewEmail = encryptDeterministic(newEmail.toLowerCase());

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.email) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (action === 'request_otp') {
      // Check if new email is already taken
      const existingUser = await prisma.user.findUnique({
        where: { email: encryptedNewEmail }
      });

      if (existingUser && existingUser.id !== userId) {
        return NextResponse.json({ error: 'Email is already in use by another account' }, { status: 400 });
      }

      // Generate secure 6-digit OTP
      const crypto = require('crypto');
      const otp = crypto.randomInt(100000, 1000000).toString();
      
      // Store OTP
      await prisma.userVerificationOtp.create({
        data: {
          userId: userId,
          code: otp,
          type: 'CHANGE_EMAIL',
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        }
      });

      const currentEmailDecrypted = decryptDeterministic(user.email);
      const userName = user.name ? decryptDeterministic(user.name) : 'User';

      await sendEmailChangeOtpEmail(currentEmailDecrypted, userName, otp, newEmail);

      return NextResponse.json({ success: true, message: 'Verification code sent to your current email' });
    }

    if (action === 'verify_and_change') {
      if (!otpCode) {
        return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
      }

      // Verify OTP
      const validOtp = await prisma.userVerificationOtp.findFirst({
        where: {
          userId: userId,
          code: otpCode,
          type: 'CHANGE_EMAIL',
          expiresAt: { gt: new Date() }
        }
      });

      if (!validOtp) {
        return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 });
      }

      // Update Email
      await prisma.user.update({
        where: { id: userId },
        data: { email: encryptedNewEmail }
      });

      // Delete OTP
      await prisma.userVerificationOtp.deleteMany({
        where: {
          userId: userId,
          type: 'CHANGE_EMAIL'
        }
      });

      return NextResponse.json({ success: true, message: 'Email address updated successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Email change error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
