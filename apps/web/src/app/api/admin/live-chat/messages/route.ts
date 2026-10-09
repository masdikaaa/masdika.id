import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';

export async function GET(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId: parseInt(sessionId) },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { sessionId, content } = await req.json();

    if (!sessionId || !content) {
      return NextResponse.json({ error: 'Missing sessionId or content' }, { status: 400 });
    }

    const message = await prisma.chatMessage.create({
      data: {
        sessionId: parseInt(sessionId),
        role: 'model', // So it renders as AI/Admin on the client
        isAdmin: true,
        content: content,
      }
    });

    // Update lastActiveAt
    await prisma.chatSession.update({
      where: { id: parseInt(sessionId) },
      data: { lastActiveAt: new Date() }
    });

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error('Error sending chat message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
