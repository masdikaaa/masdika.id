import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getClientIp } from '@/lib/get-ip';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    if (!(await checkRateLimit('CHAT_VERIFY_IP', ip, 10, 600))) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please wait a few minutes.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    const sessionId = body?.sessionId;
    const otp = body?.otp;

    if (typeof sessionId !== 'string' || !sessionId.trim() || typeof otp !== 'string' || !otp.trim()) {
      return NextResponse.json({ error: 'Session ID and Verification Code are required.' }, { status: 400 });
    }

    const cleanSessionId = sessionId.trim();
    const cleanOtp = otp.trim();

    if (!(await checkRateLimit('CHAT_VERIFY_SID', cleanSessionId, 5, 600))) {
      return NextResponse.json(
        { error: 'Too many failed code attempts for this session. Please start a new session.' },
        { status: 429 }
      );
    }

    const session = await prisma.chatSession.findUnique({
      where: { sessionId: cleanSessionId },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found. Please refresh and try again.' }, { status: 404 });
    }

    if (session.isVerified) {
      return NextResponse.json({ message: 'Session is already verified.' });
    }

    if (session.otpExpiresAt && new Date() > session.otpExpiresAt) {
      return NextResponse.json({ error: 'Verification code has expired. Please refresh the page and start over.' }, { status: 400 });
    }

    if (!session.verificationOtp) {
      return NextResponse.json({ error: 'Invalid verification code. Please check your email.' }, { status: 400 });
    }

    const expectedBuf = Buffer.from(session.verificationOtp, 'utf8');
    const providedBuf = Buffer.from(cleanOtp, 'utf8');
    if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
      return NextResponse.json({ error: 'Invalid verification code. Please check your email.' }, { status: 400 });
    }

    // Atomically mark as verified once
    const updated = await prisma.chatSession.updateMany({
      where: { id: session.id, isVerified: false },
      data: {
        isVerified: true,
        status: 'ACTIVE',
        verificationOtp: null,
        otpExpiresAt: null,
      },
    });

    if (updated.count === 0) {
      return NextResponse.json({ message: 'Session is already verified.' });
    }

    // Send Admin Notification Email
    const { sendAdminNotificationEmail } = await import('@/lib/email');
    sendAdminNotificationEmail(
      `New Live Chat Session Started`,
      `Name: ${session.name}\nEmail: ${session.email}\nIP Address: ${session.ipAddress}\n\nA user has successfully verified their email and is now waiting in the live chat.`,
      `/admin/chat-history`
    ).catch(err => console.error('Failed to send admin notification email:', err));

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully. You can now start chatting.',
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}
