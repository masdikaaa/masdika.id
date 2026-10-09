import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendChatTranscriptEmail } from '@/lib/email';

const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

export async function GET(req: Request) {
  // Verify cron secret via Authorization header (NOT URL param to prevent log leakage)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || !authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const idleThreshold = new Date(Date.now() - IDLE_TIMEOUT_MS);

    // Find all idle active sessions
    const idleSessions = await prisma.chatSession.findMany({
      where: {
        status: 'ACTIVE',
        lastActiveAt: { lt: idleThreshold },
      },
      include: {
        messages: {
          where: { isInjectionAttempt: false },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    let endedCount = 0;

    for (const session of idleSessions) {
      try {
        // End the session
        await prisma.chatSession.update({
          where: { id: session.id },
          data: {
            status: 'ENDED',
            endedBy: 'AUTO_IDLE',
            endedAt: new Date(),
          },
        });

        // Send transcript email if there are messages
        if (session.messages.length > 0) {
          await sendChatTranscriptEmail(
            session.email,
            session.name,
            session.messages.map(m => ({
              role: m.role as 'user' | 'model',
              content: m.content,
              createdAt: m.createdAt,
              isAdmin: m.isAdmin,
            })),
            session.createdAt
          ).catch(err => console.error(`Failed to send transcript for session ${session.sessionId}:`, err));
        }

        endedCount++;
      } catch (sessionErr) {
        console.error(`Failed to end session ${session.sessionId}:`, sessionErr);
      }
    }

    return NextResponse.json({
      success: true,
      endedSessions: endedCount,
      totalFound: idleSessions.length,
    });
  } catch (error) {
    console.error('Chat cleanup cron error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
