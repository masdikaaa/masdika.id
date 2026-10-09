import { NextResponse } from 'next/server';
import { getClientIp } from '@/lib/get-ip';
import { prisma } from '@/lib/prisma';
import { sendChatTranscriptEmail } from '@/lib/email';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    // Extract IP for rate limiting and ownership verification
    const ip = getClientIp(req);

    // Rate limit: 5 end-session requests per minute per IP
    const allowed = await checkRateLimit('CHAT_END', ip, 5, 60);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const { sessionId } = body;

    if (typeof sessionId !== 'string' || !sessionId.trim()) {
      return NextResponse.json({ error: 'Session ID is required.' }, { status: 400 });
    }

    // Find the session
    const session = await prisma.chatSession.findUnique({
      where: { sessionId: sessionId.trim() },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }

    if (session.status === 'ENDED') {
      return NextResponse.json({ error: 'Session already ended.' }, { status: 400 });
    }

    // Verify IP ownership: only the session creator can end it
    if (session.ipAddress && session.ipAddress !== ip) {
      return NextResponse.json({ error: 'Unauthorized to end this session.' }, { status: 403 });
    }

    // End the session
    await prisma.chatSession.update({
      where: { sessionId: sessionId.trim() },
      data: {
        status: 'ENDED',
        endedBy: 'USER',
        endedAt: new Date(),
      },
    });

    // Send transcript email
    const userMessages = session.messages.filter(m => !m.isInjectionAttempt);
    if (userMessages.length > 0) {
      try {
        await sendChatTranscriptEmail(
          session.email,
          session.name,
          userMessages.map(m => ({
            role: m.role as 'user' | 'model',
            content: m.content,
            createdAt: m.createdAt,
            isAdmin: m.isAdmin,
          })),
          session.createdAt
        );
      } catch (err) {
        console.error('Failed to send chat transcript email:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: userMessages.length > 0 
        ? 'Chat session ended. Transcript has been sent to your email.'
        : 'Chat session ended.',
    });
  } catch (error) {
    console.error('Chat end error:', error);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}
