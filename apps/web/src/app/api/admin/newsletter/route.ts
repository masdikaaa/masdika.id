import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decryptDeterministic } from '@/lib/encryption';
import { requireAuth } from '@/lib/auth-middleware';

export async function GET() {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const subscribers = await prisma.subscriber.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const decryptedSubscribers = subscribers.map(sub => ({
      ...sub,
      email: decryptDeterministic(sub.email)
    }));

    return NextResponse.json(decryptedSubscribers);
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
