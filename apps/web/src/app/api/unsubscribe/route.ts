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

    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

    const encryptedEmail = encryptDeterministic(email.toLowerCase().trim());

    const subscriber = await prisma.subscriber.findUnique({ where: { email: encryptedEmail } });
    if (subscriber) {
      await prisma.subscriber.delete({ where: { email: encryptedEmail } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unsubscribing:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
