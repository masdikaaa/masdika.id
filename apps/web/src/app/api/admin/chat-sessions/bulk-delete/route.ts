import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';

export async function POST(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { ids } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs array is required' }, { status: 400 });
    }

    // Validate all IDs are numbers
    const validIds = ids.filter((id: unknown) => typeof id === 'number' && !isNaN(id));
    if (validIds.length === 0) {
      return NextResponse.json({ error: 'No valid IDs provided' }, { status: 400 });
    }

    await prisma.chatSession.deleteMany({
      where: { id: { in: validIds } },
    });

    return NextResponse.json({
      message: `${validIds.length} sessions deleted successfully`,
      deletedCount: validIds.length,
    });
  } catch (error) {
    console.error('Error bulk deleting chat sessions:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
