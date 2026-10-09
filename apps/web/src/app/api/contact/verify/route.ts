import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClientIp } from '@/lib/get-ip';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendAdminNotificationEmail } from '@/lib/email';
import { decryptDeterministic } from '@/lib/encryption';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    // Rate limit verification attempts to prevent brute force (e.g. 5 attempts per 5 mins)
    const allowed = await checkRateLimit(`VERIFY_CONTACT_${ip}`, ip, 5, 300);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { messageId, otp } = body;

    if (!messageId || !otp) {
      return NextResponse.json({ error: 'Message ID and OTP are required.' }, { status: 400 });
    }

    const message = await prisma.message.findUnique({
      where: { id: Number(messageId) },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found.' }, { status: 404 });
    }

    if (message.isVerified) {
      return NextResponse.json({ error: 'Message is already verified.' }, { status: 400 });
    }

    if (!message.verificationOtp || message.verificationOtp !== otp) {
      return NextResponse.json({ error: 'Invalid verification code.' }, { status: 400 });
    }

    if (message.otpExpiresAt && new Date() > message.otpExpiresAt) {
      return NextResponse.json({ error: 'Verification code has expired. Please submit again.' }, { status: 400 });
    }

    // Mark as verified
    await prisma.message.update({
      where: { id: message.id },
      data: {
        isVerified: true,
        verificationOtp: null,
        otpExpiresAt: null,
      },
    });

    // Send Admin Notification Email
    try {
      const decName = decryptDeterministic(message.name);
      const decEmail = decryptDeterministic(message.email);
      const decSubject = decryptDeterministic(message.subject);
      const decContent = decryptDeterministic(message.content); // Contains phone inside

      await sendAdminNotificationEmail(
        `New Verified Contact Message: ${decSubject}`,
        `Name: ${decName}\nEmail: ${decEmail}\n\nMessage:\n${decContent}`,
        '/admin/messages'
      );
    } catch (err) {
      console.error('Failed to decrypt and send admin notification email:', err);
    }

    return NextResponse.json({ success: true, message: 'Message verified successfully.' });
  } catch (error) {
    console.error('Error verifying contact message:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
