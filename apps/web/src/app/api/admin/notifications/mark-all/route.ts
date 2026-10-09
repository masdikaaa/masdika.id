import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    // Mark messages as read
    await prisma.message.updateMany({
      where: { isRead: false },
      data: { isRead: true }
    });

    // Mark support tickets as read by admin
    await prisma.supportTicket.updateMany({
      where: { status: { in: ['OPEN', 'CUSTOMER_REPLY'] }, isReadByAdmin: false },
      data: { isReadByAdmin: true }
    });
    
    // For Comments, Groups, and ChatSessions, we don't really have an "isRead" flag,
    // they are managed by publishing/verifying/closing.
    // So "Mark all as read" for admin will just clear Messages and Tickets.

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking admin notifications as read:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
