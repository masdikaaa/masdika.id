import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';

export async function GET(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const where: Record<string, unknown> = {};

    if (status === 'ACTIVE' || status === 'ENDED') {
      where.status = status;
    }

    if (search.trim()) {
      where.OR = [
        { name: { contains: search.trim() } },
        { email: { contains: search.trim() } },
        { phone: { contains: search.trim() } },
        { ipAddress: { contains: search.trim() } },
      ];
    }

    const [sessions, total] = await Promise.all([
      prisma.chatSession.findMany({
        where,
        include: {
          _count: {
            select: { messages: true },
          },
          messages: {
            where: { isInjectionAttempt: true },
            select: { id: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.chatSession.count({ where }),
    ]);

    const formatted = sessions.map(s => ({
      id: s.id,
      sessionId: s.sessionId,
      name: s.name,
      email: s.email,
      phone: s.phone,
      ipAddress: s.ipAddress,
      status: s.status,
      endedBy: s.endedBy,
      endedAt: s.endedAt,
      lastActiveAt: s.lastActiveAt,
      createdAt: s.createdAt,
      messageCount: s._count.messages,
      injectionCount: s.messages.length,
    }));

    return NextResponse.json({
      sessions: formatted,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
