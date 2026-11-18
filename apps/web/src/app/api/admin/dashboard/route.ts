import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { LIVE_VPS_STATUSES } from '@/lib/vps-api';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      totalProjects,
      totalPosts,
      unreadMessages,
      unverifiedComments,
      unverifiedCommunity,
      activeChats,
      openTickets,
      totalViews,
      totalCustomers,
      balanceAgg,
      activeVps,
      suspendedVps,
      activeDatabases,
      activeApps,
      activeObjectStorage,
      activeCdn,
      activeAiKeys,
      activeMcpKeys,
      monthRevenueAgg,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.blogPost.count(),
      prisma.message.count({ where: { isRead: false } }),
      prisma.comment.count({ where: { isVerified: false, isAdmin: false } }),
      prisma.communityGroup.count({ where: { isPublished: false } }),
      prisma.chatSession.count({ where: { status: 'ACTIVE' } }),
      prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'CUSTOMER_REPLY'] }, isReadByAdmin: false } }),
      prisma.pageView.count(),
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.user.aggregate({ where: { role: 'USER' }, _sum: { balance: true } }),
      prisma.vpsService.count({ where: { status: { in: LIVE_VPS_STATUSES } } }),
      prisma.vpsService.count({ where: { status: 'SUSPENDED' } }),
      prisma.databaseService.count({ where: { status: { in: ['RUNNING', 'ACTIVE', 'PROVISIONING'] } } }),
      prisma.appService.count({ where: { status: { in: ['RUNNING', 'ACTIVE', 'PROVISIONING'] } } }),
      prisma.objectStorageService.count({ where: { status: { in: ['RUNNING', 'ACTIVE', 'PROVISIONING'] } } }),
      prisma.subscription.count({ where: { status: 'ACTIVE', plan: { service: 'CDN' } } }),
      prisma.aiGatewayKey.count(),
      prisma.apiKey.count({ where: { service: 'MCP', status: 'ACTIVE' } }),
      prisma.invoice.aggregate({
        where: {
          status: 'PAID',
          paidAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
    ]);

    return NextResponse.json({
      totalProjects,
      totalPosts,
      unreadMessages,
      openTickets,
      totalNotifications: unreadMessages + unverifiedComments + unverifiedCommunity + activeChats + openTickets,
      totalViews,
      cloud: {
        totalCustomers,
        totalCustomerBalance: Number(balanceAgg._sum.balance || 0),
        activeVps,
        suspendedVps,
        activeDatabases,
        activeApps,
        activeObjectStorage,
        activeCdn,
        activeAiKeys,
        activeMcpKeys,
        monthRevenue: Number(monthRevenueAgg._sum.amount || 0),
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
