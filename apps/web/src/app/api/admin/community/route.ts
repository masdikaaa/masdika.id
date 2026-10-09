import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';

export async function GET(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let whereClause = {};
    if (status === 'published') {
      whereClause = { isPublished: true };
    } else if (status === 'pending') {
      whereClause = { isPublished: false };
    }

    const groups = await prisma.communityGroup.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: groups });
  } catch (error) {
    console.error('Fetch community groups error:', error);
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}
