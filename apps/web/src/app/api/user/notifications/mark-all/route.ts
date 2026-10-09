import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';

export async function POST(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const user = auth.user!;

    // Mark all tickets as read
    await prisma.supportTicket.updateMany({
      where: { userId: user.id, isReadByUser: false },
      data: { isReadByUser: true }
    });

    // Mark all invoices as read
    await prisma.invoice.updateMany({
      where: { userId: user.id, isReadByUser: false },
      data: { isReadByUser: true }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
