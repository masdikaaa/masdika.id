import { NextResponse } from 'next/server';
import { getClientIp } from '@/lib/get-ip';
import { prisma } from '@/lib/prisma';
import { encryptDeterministic } from '@/lib/encryption';
import { checkRateLimit } from '@/lib/rate-limit';

const MAX_EMAIL_LENGTH = 254; // RFC 5321

/** Basic email format check (avoids ReDoS) */
function isValidEmail(email: string): boolean {
  if (email.length > MAX_EMAIL_LENGTH) return false;
  const idx = email.lastIndexOf('@');
  if (idx < 1) return false;
  const local = email.slice(0, idx);
  const domain = email.slice(idx + 1);
  return local.length > 0 && domain.includes('.') && domain.length > 2;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase().substring(0, MAX_EMAIL_LENGTH);

    if (!isValidEmail(cleanEmail)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    // ── Rate limit: 3 attempts per hour per IP ──────────────────────────────
    const ip = getClientIp(req);

    const allowed = await checkRateLimit('SUBSCRIBE', ip, 3, 3600);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many subscription attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const encryptedEmail = encryptDeterministic(cleanEmail);

    // Check for duplicate subscription
    const existingSubscriber = await prisma.subscriber.findUnique({
      where: { email: encryptedEmail },
    });

    if (existingSubscriber) {
      return NextResponse.json({ error: 'You are already subscribed!' }, { status: 400 });
    }

    await prisma.subscriber.create({
      data: { email: encryptedEmail },
    });

    // Notify admin via internal messaging system
    await prisma.message.create({
      data: {
        name: encryptDeterministic('Newsletter System'),
        email: encryptedEmail,
        subject: encryptDeterministic('New Newsletter Subscriber'),
        content: encryptDeterministic(
          `A new user has subscribed to the newsletter: ${cleanEmail}`
        ),
        isRead: false,
      },
    });

    // Send welcome email (non-blocking)
    const { sendNewsletterWelcomeEmail } = await import('@/lib/email');
    sendNewsletterWelcomeEmail(cleanEmail).catch((err) =>
      console.error('Failed to send welcome email:', err)
    );

    return NextResponse.json({ message: 'Successfully subscribed to the newsletter!' });
  } catch (error) {
    console.error('Error subscribing:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
