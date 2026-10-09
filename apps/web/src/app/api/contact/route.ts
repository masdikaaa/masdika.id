import { NextResponse } from 'next/server';
import { getClientIp } from '@/lib/get-ip';
import { prisma } from '@/lib/prisma';
import { encryptDeterministic } from '@/lib/encryption';
import { checkRateLimit } from '@/lib/rate-limit';

// ─── Input length limits ──────────────────────────────────────────────────────
const LIMITS = {
  name: 100,
  email: 254, // RFC 5321 max
  subject: 200,
  message: 5000,
};

/** Basic email format check (RFC-ish, avoids ReDoS) */
function isValidEmail(email: string): boolean {
  if (email.length > LIMITS.email) return false;
  const idx = email.lastIndexOf('@');
  if (idx < 1) return false;
  const local = email.slice(0, idx);
  const domain = email.slice(idx + 1);
  return local.length > 0 && domain.includes('.') && domain.length > 2;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ── Type & presence validation ──────────────────────────────────────────
    const { name, email, phone, subject, message } = body;

    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof phone !== 'string' ||
      typeof subject !== 'string' ||
      typeof message !== 'string'
    ) {
      return NextResponse.json(
        { error: 'All fields (name, email, phone, subject, and message) are required.' },
        { status: 400 }
      );
    }

    const cleanName = name.trim().substring(0, LIMITS.name);
    const cleanEmail = email.trim().toLowerCase().substring(0, LIMITS.email);
    const cleanPhone = phone.trim().substring(0, 50);
    const cleanSubject = subject.trim().substring(0, LIMITS.subject);
    const cleanMessage = message.trim().substring(0, LIMITS.message);

    if (!cleanName || !cleanEmail || !cleanPhone || !cleanSubject || !cleanMessage) {
      return NextResponse.json(
        { error: 'All fields must be filled.' },
        { status: 400 }
      );
    }

    if (!isValidEmail(cleanEmail)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    if (cleanEmail.includes('@masdika.id')) {
      return NextResponse.json(
        { error: 'Emails with the @masdika.id domain are not allowed.' },
        { status: 403 }
      );
    }

    // Append phone to message for the admin to read
    const finalMessage = `[Phone: ${cleanPhone}]\n\n${cleanMessage}`;

    // ── Rate limit: 3 messages per hour per IP ──────────────────────────────
    const ip = getClientIp(req);

    const allowed = await checkRateLimit('CONTACT', ip, 3, 3600);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many messages sent. Please try again later.' },
        { status: 429 }
      );
    }

    // ── Generate OTP & Persist (encrypted, unverified) ────────────────────────
    const crypto = require('crypto');
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

    const newMessage = await prisma.message.create({
      data: {
        name: encryptDeterministic(cleanName),
        email: encryptDeterministic(cleanEmail),
        subject: encryptDeterministic(cleanSubject),
        content: encryptDeterministic(finalMessage),
        isVerified: false,
        verificationOtp: otp,
        otpExpiresAt: expiresAt,
      },
    });

    // Send Contact Verification Email
    const { sendContactVerificationEmail } = await import('@/lib/email');
    sendContactVerificationEmail(cleanEmail, cleanName, otp).catch(err => {
      console.error('Failed to send contact verification email:', err);
    });

    return NextResponse.json({ 
      success: true, 
      requiresVerification: true,
      messageId: newMessage.id,
      message: 'Please check your email for the verification code.'
    });
  } catch (error) {
    console.error('Error saving contact message:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
