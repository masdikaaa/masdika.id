import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const totalProjects = await prisma.project.count();
    const totalPosts = await prisma.blogPost.count();
    
    const unreadMessages = await prisma.message.count({
      where: { isRead: false }
    });
    
    const unverifiedComments = await prisma.comment.count({
      where: { isVerified: false, isAdmin: false }
    });
    
    const unverifiedCommunity = await prisma.communityGroup.count({
      where: { isPublished: false }
    });

    const activeChats = await prisma.chatSession.count({
      where: { status: 'ACTIVE' }
    });

    const openTickets = await prisma.supportTicket.count({
      where: { status: { in: ['OPEN', 'CUSTOMER_REPLY'] }, isReadByAdmin: false }
    });

    const totalViews = await prisma.pageView.count();

    return NextResponse.json({
      totalProjects,
      totalPosts,
      unreadMessages,
      totalNotifications: unreadMessages + unverifiedComments + unverifiedCommunity + activeChats + openTickets,
      totalViews
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
