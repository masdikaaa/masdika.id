import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';

export async function POST(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { ids } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No subscribers selected' }, { status: 400 });
    }

    await prisma.subscriber.deleteMany({
      where: {
        id: { in: ids }
      }
    });

    return NextResponse.json({ message: 'Subscribers deleted successfully' });
  } catch (error) {
    console.error('Error in bulk delete subscribers:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
