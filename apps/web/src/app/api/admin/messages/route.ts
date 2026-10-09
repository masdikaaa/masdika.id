import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

import { decryptDeterministic } from '@/lib/encryption';
import { requireAuth } from '@/lib/auth-middleware';

export async function GET(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = searchParams.get('limit') ? Math.min(100, Math.max(1, parseInt(searchParams.get('limit')!, 10))) : undefined;

    const messages = await prisma.message.findMany({
      where: unreadOnly ? { isRead: false } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    
    const decryptedMessages = messages.map(msg => ({
      ...msg,
      name: decryptDeterministic(msg.name),
      email: decryptDeterministic(msg.email),
      subject: decryptDeterministic(msg.subject),
      content: decryptDeterministic(msg.content)
    }));
    
    return NextResponse.json(decryptedMessages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
