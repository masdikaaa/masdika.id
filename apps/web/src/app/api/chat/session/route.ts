import { NextResponse } from 'next/server';
import { getClientIp } from '@/lib/get-ip';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import { sendChatVerificationEmail } from '@/lib/email';
import { isIpBlocked } from '@/lib/ip-check';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(\+62|62|0)8[1-9][0-9]{6,11}$/;
const NAME_REGEX = /^[a-zA-Z\s\.\,\'\-]{2,100}$/;

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);

    // Check if IP is blocked
    try {
      if (await isIpBlocked(ip)) {
        return NextResponse.json(
          { error: 'Access denied. Contact administrator if this is an error.' },
          { status: 403 }
        );
      }
    } catch {
      // Non-fatal
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const { name, email, phone } = body;

    // Validate name (strict: only letters, spaces, common punctuation)
    if (typeof name !== 'string' || !NAME_REGEX.test(name.trim())) {
      return NextResponse.json({ error: 'Please enter a valid real name (letters only).' }, { status: 400 });
    }
    // Block obvious junk like repeated characters
    if (/^(.)\1+$/.test(name.trim()) || name.trim().toLowerCase() === 'bac' || name.trim().toLowerCase() === 'test') {
       return NextResponse.json({ error: 'Please enter a valid real name.' }, { status: 400 });
    }

    // Validate email
    if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json({ error: 'Invalid email format.' }, { status: 400 });
    }

    // Validate phone
    const cleanPhone = typeof phone === 'string' ? phone.replace(/[\s\-()]/g, '') : '';
    if (!PHONE_REGEX.test(cleanPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number. Use Indonesian format (08xx / +628xx).' },
        { status: 400 }
      );
    }

    // Check if email is blocked
    try {
      const blockedEmail = await prisma.blockedUser.findFirst({
        where: { type: 'EMAIL', value: email.toString().trim().toLowerCase() },
      });
      if (blockedEmail) {
        return NextResponse.json(
          { error: 'Access denied. Contact administrator if this is an error.' },
          { status: 403 }
        );
      }
    } catch {
      // Non-fatal
    }

    const sessionId = uuidv4();
    // Generate 6-digit OTP
    const crypto = require('crypto');
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

    const cleanName = name.toString().trim().substring(0, 100);
    const cleanEmailStr = email.toString().trim().toLowerCase().substring(0, 254);

    const session = await prisma.chatSession.create({
      data: {
        sessionId,
        name: cleanName,
        email: cleanEmailStr,
        phone: cleanPhone.substring(0, 20),
        ipAddress: ip,
        status: 'PENDING_VERIFICATION',
        isVerified: false,
        verificationOtp: otp,
        otpExpiresAt: expiresAt,
        lastActiveAt: new Date(),
      },
    });

    // Send the email (non-blocking)
    sendChatVerificationEmail(cleanEmailStr, cleanName, otp).catch(err => {
      console.error('Failed to send verification email:', err);
    });

    return NextResponse.json({
      sessionId: session.sessionId,
      requiresVerification: true,
      message: 'Please check your email for the verification code.',
    });
  } catch (error) {
    console.error('Chat session creation error:', error);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}
