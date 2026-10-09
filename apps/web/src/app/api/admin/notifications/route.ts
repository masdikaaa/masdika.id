import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decryptDeterministic } from '@/lib/encryption';
import { requireAuth } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;

    const fetchAll = searchParams.get('all') === 'true';

    const [messages, comments, groups, activeChats, openTickets, withdrawals] = await Promise.all([
      prisma.message.findMany({
        where: fetchAll ? {} : { isRead: false },
        orderBy: { createdAt: 'desc' },
        take: fetchAll ? 30 : limit
      }),
      prisma.comment.findMany({
        where: fetchAll ? { isAdmin: false } : { isVerified: false, isAdmin: false },
        orderBy: { createdAt: 'desc' },
        take: fetchAll ? 30 : limit
      }),
      prisma.communityGroup.findMany({
        where: fetchAll ? {} : { isPublished: false },
        orderBy: { createdAt: 'desc' },
        take: fetchAll ? 30 : limit
      }),
      prisma.chatSession.findMany({
        where: fetchAll ? {} : { status: 'ACTIVE' },
        orderBy: { lastActiveAt: 'desc' },
        take: fetchAll ? 30 : limit
      }),
      prisma.supportTicket.findMany({
        where: fetchAll ? {} : { status: { in: ['OPEN', 'CUSTOMER_REPLY'] }, isReadByAdmin: false },
        orderBy: { updatedAt: 'desc' },
        take: fetchAll ? 30 : limit,
        include: { user: { select: { name: true } } }
      }),
      prisma.withdrawalRequest.findMany({
        where: fetchAll ? {} : { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        take: fetchAll ? 30 : limit,
        include: { user: { select: { name: true, email: true } } }
      })
    ]);

    let notifications: any[] = [];

    messages.forEach(m => {
      try {
        notifications.push({
          id: `msg-${m.id}`,
          type: 'MESSAGE',
          subject: decryptDeterministic(m.subject),
          name: decryptDeterministic(m.name),
          content: decryptDeterministic(m.content),
          createdAt: m.createdAt,
          link: '/admin/messages',
          isRead: m.isRead
        });
      } catch (e) {
        // Fallback if decryption fails
        notifications.push({
          id: `msg-${m.id}`,
          type: 'MESSAGE',
          subject: 'New Message',
          name: 'Unknown',
          content: 'You have a message.',
          createdAt: m.createdAt,
          link: '/admin/messages',
          isRead: m.isRead
        });
      }
    });

    comments.forEach(c => {
      notifications.push({
        id: `cmt-${c.id}`,
        type: 'COMMENT',
        subject: c.isVerified ? 'Verified Comment' : 'New Comment Pending',
        name: c.name,
        content: c.content,
        createdAt: c.createdAt,
        link: '/admin/comments',
        isRead: c.isVerified
      });
    });

    groups.forEach(g => {
      notifications.push({
        id: `grp-${g.id}`,
        type: 'COMMUNITY',
        subject: g.isPublished ? 'Published Group' : 'New Community Group Submission',
        name: g.name,
        content: `Link: ${g.link}`,
        createdAt: g.createdAt,
        link: '/admin/community',
        isRead: g.isPublished
      });
    });

    activeChats.forEach(chat => {
      notifications.push({
        id: `chat-${chat.id}`,
        type: 'CHAT',
        subject: chat.status === 'ACTIVE' ? 'Active Chat Session' : 'Chat Session',
        name: chat.name,
        content: `Chat session with ${chat.email}`,
        createdAt: chat.lastActiveAt,
        link: '/admin/chat-history',
        isRead: chat.status !== 'ACTIVE'
      });
    });

    openTickets.forEach(ticket => {
      notifications.push({
        id: `ticket-${ticket.id}`,
        type: 'TICKET',
        subject: `[${ticket.ticketId}] ${ticket.subject}`,
        name: ticket.user.name ? decryptDeterministic(ticket.user.name) : ticket.user.name,
        content: `Status: ${ticket.status.replace('_', ' ')}`,
        createdAt: ticket.updatedAt,
        link: `/admin/tickets/${ticket.ticketId}`,
        isRead: ticket.isReadByAdmin
      });
    });

    withdrawals.forEach(w => {
      let userName = 'Unknown';
      if (w.user?.name) {
        try { userName = decryptDeterministic(w.user.name); } catch (e) { }
      }
      notifications.push({
        id: `wd-${w.id}`,
        type: 'WITHDRAWAL',
        subject: 'Affiliate Withdrawal Request',
        name: userName,
        content: `Rp ${w.amount.toLocaleString('id-ID')} to ${w.bankName}`,
        createdAt: w.createdAt,
        link: `/admin/users/${w.userId}`,
        isRead: w.status !== 'PENDING'
      });
    });

    // Sort combined by date desc
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totalUnread = notifications.length;

    // Limit to requested amount
    if (limit) {
      notifications = notifications.slice(0, limit);
    }

    if (searchParams.get('countOnly') === 'true') {
      return NextResponse.json({ totalNotifications: totalUnread });
    }

    // Return array to not break backward compatibility with AdminLayoutClient, but we can also return an object in the future
    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
