import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClientIp } from '@/lib/get-ip';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    if (!(await checkRateLimit('CHAT_SYNC', ip, 60, 60))) {
      return NextResponse.json({ error: 'Too many sync requests' }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const sinceTimestamp = searchParams.get('since');

    if (!sessionId || sessionId.length > 128) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Verify session
    const chatSession = await prisma.chatSession.findUnique({
      where: { sessionId: sessionId.trim() },
      select: { id: true, status: true, isVerified: true },
    });

    if (!chatSession) {
      return NextResponse.json({ error: 'Session not found', sessionExpired: true }, { status: 404 });
    }

    if (chatSession.status === 'ENDED') {
      return NextResponse.json({ error: 'Session ended', sessionExpired: true }, { status: 400 });
    }

    if (!chatSession.isVerified || chatSession.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Session not verified' }, { status: 403 });
    }

    let dateFilter = undefined;
    if (sinceTimestamp) {
      const sinceDate = new Date(parseInt(sinceTimestamp, 10));
      if (!isNaN(sinceDate.getTime())) {
        dateFilter = { gt: sinceDate };
      }
    }

    // Only get new messages from ADMIN
    const messages = await prisma.chatMessage.findMany({
      where: {
        sessionId: chatSession.id,
        isAdmin: true,
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, role: true, content: true, createdAt: true, isAdmin: true },
    });

    return NextResponse.json({ messages });
  } catch (err) {
    console.error('Sync error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
