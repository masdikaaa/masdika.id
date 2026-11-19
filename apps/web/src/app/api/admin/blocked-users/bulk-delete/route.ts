import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { invalidateSecurityBlockCache } from '@/lib/ip-check';

export async function POST(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    
    await prisma.blockedUser.deleteMany({
      where: {
        id: { in: ids }
      }
    });
    await invalidateSecurityBlockCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error bulk deleting blocked users:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
