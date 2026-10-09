import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';

export async function PUT(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { type, items } = await req.json();

    if (!type || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Execute updates in a transaction
    await prisma.$transaction(
      items.map((item: { id: number; order: number }) => {
        if (type === 'experience') {
          return prisma.experience.update({
            where: { id: item.id },
            data: { order: item.order },
          });
        } else if (type === 'certification') {
          return prisma.certification.update({
            where: { id: item.id },
            data: { order: item.order },
          });
        } else {
          return prisma.education.update({
            where: { id: item.id },
            data: { order: item.order },
          });
        }
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
