import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { verifyPassword, hashPassword, decryptDeterministic } from '@/lib/encryption';
import { sendPasswordChangeOtpEmail } from '@/lib/email';
import * as crypto from 'crypto';

export async function POST(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { action, oldPassword, newPassword, otpCode } = await req.json();

    const user = await prisma.user.findUnique({
      where: { id: auth.userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (action === 'request_otp') {
      if (!oldPassword) return NextResponse.json({ error: 'Old password is required' }, { status: 400 });
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
      await sendPasswordChangeOtpEmail(email, user.name, otp);

      return NextResponse.json({ success: true, message: 'OTP sent to your email' });
    }

    if (action === 'verify_and_change') {
      if (!otpCode || !newPassword) return NextResponse.json({ error: 'OTP and new password are required' }, { status: 400 });

      const otpRecord = await prisma.userVerificationOtp.findFirst({
        where: { userId: user.id, type: 'CHANGE_PASSWORD' },
        orderBy: { createdAt: 'desc' }
      });

      if (!otpRecord) return NextResponse.json({ error: 'No OTP requested' }, { status: 400 });
      if (otpRecord.code !== otpCode) return NextResponse.json({ error: 'Invalid OTP code' }, { status: 400 });
      if (otpRecord.expiresAt < new Date()) return NextResponse.json({ error: 'OTP has expired' }, { status: 400 });

      // Change password
      const hashedNewPassword = hashPassword(newPassword);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedNewPassword }
      });

      // Cleanup
      await prisma.userVerificationOtp.deleteMany({
        where: { userId: user.id, type: 'CHANGE_PASSWORD' }
      });

      return NextResponse.json({ success: true, message: 'Password changed successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
