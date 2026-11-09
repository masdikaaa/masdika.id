import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { encryptDeterministic, decryptDeterministic } from '@/lib/encryption';

export async function GET() {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const sessions = await prisma.chatSession.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { lastActiveAt: 'desc' },
      take: 50,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    const rawEmails = Array.from(
      new Set(
        sessions
          .map((s) => s.email?.trim().toLowerCase())
          .filter((e): e is string => Boolean(e))
      )
    );

    const userImageMap = new Map<string, string | null>();
    if (rawEmails.length > 0) {
      try {
        const encryptedEmails = rawEmails.map((e) => encryptDeterministic(e));
        const matchedUsers = await prisma.user.findMany({
          where: {
            OR: [
              { email: { in: rawEmails } },
              { email: { in: encryptedEmails } },
            ],
          },
          select: { email: true, image: true },
        });

        for (const u of matchedUsers) {
          const decEmail = decryptDeterministic(u.email).toLowerCase();
          if (u.image) {
            userImageMap.set(decEmail, u.image);
            userImageMap.set(u.email.toLowerCase(), u.image);
          }
        }
      } catch (err) {
        console.warn('Failed to resolve live chat session user images:', err);
      }
    }

    const formatted = sessions.map(s => ({
      ...s,
      image: userImageMap.get(s.email?.trim().toLowerCase() || '') || null
    }));

    return NextResponse.json({ sessions: formatted });
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
