import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const user = auth.user!;
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;

    const fetchAll = searchParams.get('all') === 'true';

    const [tickets, invoices] = await Promise.all([
      prisma.supportTicket.findMany({
        where: fetchAll ? { userId: user.id } : { userId: user.id, isReadByUser: false },
        orderBy: { updatedAt: 'desc' },
        take: fetchAll ? 50 : limit
      }),
      prisma.invoice.findMany({
        where: fetchAll ? { userId: user.id } : { userId: user.id, status: 'PENDING', isReadByUser: false },
        orderBy: { createdAt: 'desc' },
        take: fetchAll ? 50 : limit
      })
    ]);

    let notifications: any[] = [];

    tickets.forEach(ticket => {
      // For all mode, we might include open tickets. We'll label them appropriately.
      let subject = `Ticket Updated: [${ticket.ticketId}]`;
      if (ticket.status === 'ANSWERED') subject = `Ticket Replied: [${ticket.ticketId}]`;
      if (ticket.status === 'CLOSED') subject = `Ticket Closed: [${ticket.ticketId}]`;
      
      notifications.push({
        id: `ticket-${ticket.id}`,
        type: 'TICKET',
        subject,
        name: 'Support Team',
        content: `Your ticket "${ticket.subject}" has been updated. Status: ${ticket.status}`,
        createdAt: ticket.updatedAt,
        link: `/dashboard/tickets/${ticket.ticketId}`,
        isRead: ticket.isReadByUser
      });
    });

    invoices.forEach(invoice => {
      let subject = `Pending Payment: ${invoice.invoiceNumber}`;
      if (invoice.status === 'PAID') subject = `Payment Successful: ${invoice.invoiceNumber}`;
      if (invoice.status === 'CANCELLED') subject = `Invoice Cancelled: ${invoice.invoiceNumber}`;

      notifications.push({
        id: `invoice-${invoice.id}`,
        type: 'INVOICE',
        subject,
        name: 'Billing',
        content: `Invoice amount: Rp ${invoice.amount.toLocaleString('id-ID')}. Status: ${invoice.status}`,
        createdAt: invoice.createdAt,
        link: `/dashboard/billing`,
        isRead: invoice.isReadByUser
      });
    });

    // Sort combined by date desc
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const totalUnread = notifications.length;

    // Limit to requested amount
    if (limit) {
      notifications = notifications.slice(0, limit);
    }

    return NextResponse.json({
      notifications,
      totalNotifications: totalUnread
    });
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
