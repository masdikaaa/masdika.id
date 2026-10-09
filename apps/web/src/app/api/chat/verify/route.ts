import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { sessionId, otp } = await req.json();

    if (!sessionId || !otp) {
      return NextResponse.json({ error: 'Session ID and Verification Code are required.' }, { status: 400 });
    }

    const session = await prisma.chatSession.findUnique({
      where: { sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found. Please refresh and try again.' }, { status: 404 });
    }

    if (session.isVerified) {
      return NextResponse.json({ message: 'Session is already verified.' });
    }

    if (session.verificationOtp !== otp.trim()) {
      return NextResponse.json({ error: 'Invalid verification code. Please check your email.' }, { status: 400 });
    }

    if (session.otpExpiresAt && new Date() > session.otpExpiresAt) {
      return NextResponse.json({ error: 'Verification code has expired. Please refresh the page and start over.' }, { status: 400 });
    }

    // Mark as verified
    await prisma.chatSession.update({
      where: { id: session.id },
      data: {
        isVerified: true,
        status: 'ACTIVE',
        verificationOtp: null,
        otpExpiresAt: null,
      },
    });

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
