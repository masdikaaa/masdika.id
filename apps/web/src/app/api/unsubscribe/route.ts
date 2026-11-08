import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

import { encryptDeterministic } from '@/lib/encryption';
import { getClientIp } from '@/lib/get-ip';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    
    // Rate limit: Max 10 unsubscribe attempts per hour per IP
    if (!(await checkRateLimit('UNSUBSCRIBE', ip, 10, 3600))) {
      return NextResponse.json(
        { error: 'Too many unsubscribe requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    const email = body?.email;
    if (typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    if (cleanEmail.length < 5 || cleanEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const encryptedEmail = encryptDeterministic(cleanEmail);

    await prisma.subscriber.deleteMany({
      where: { email: { in: [encryptedEmail, cleanEmail] } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unsubscribing:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
