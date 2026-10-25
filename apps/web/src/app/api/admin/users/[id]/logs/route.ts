import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { decryptDeterministic } from '@/lib/encryption';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        invoices: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        vpsServices: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        emailLogs: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const decName = user.name ? decryptDeterministic(user.name) : 'Customer';
    const decEmail = decryptDeterministic(user.email);

    // 1. Purge any previously seeded dummy logs
    await prisma.clientActivityLog.deleteMany({
      where: {
        userId,
        OR: [
          { description: { contains: 'm.dana.id' } },
          { description: { contains: 'duitku_dana' } },
          { description: { contains: 'Passed Fraud Check' } },
          { description: { contains: 'Fraud Check Initiated' } },
          { description: { contains: 'Order ID 33617' } },
          { description: { contains: 'Invoice ID: 110761' } },
          { description: { contains: 'SMS / WhatsApp Center - order confirmation' } },
        ]
      }
    }).catch(() => {});

    // 2. Fetch existing logs to avoid duplicates
    const existingLogs = await prisma.clientActivityLog.findMany({
      where: { userId },
      select: { description: true }
    });
    const existingDescSet = new Set(existingLogs.map(l => l.description));

    const realLogsToCreate: {
      userId: number;
      description: string;
      username: string;
      ipAddress: string;
      category: 'order' | 'invoice' | 'payment' | 'email' | 'service' | 'system' | 'auth';
      createdAt: Date;
    }[] = [];

    // Real Account Registration Event
    const regDesc = `Client Account Registered - Email: ${decEmail}`;
    if (!existingDescSet.has(regDesc)) {
      realLogsToCreate.push({
        userId,
        description: regDesc,
        username: decName,
        ipAddress: '127.0.0.1',
        category: 'auth',
        createdAt: user.createdAt || new Date()
      });
      existingDescSet.add(regDesc);
    }

    // Real Invoice Events
    for (const inv of user.invoices) {
      const invNum = inv.invoiceNumber || String(inv.id);
      const invDesc = `Created Invoice - #${invNum} (Total: Rp ${Number(inv.amount || 0).toLocaleString('id-ID')})`;
      if (!existingDescSet.has(invDesc)) {
        realLogsToCreate.push({
          userId,
          description: invDesc,
          username: 'System',
          ipAddress: '127.0.0.1',
          category: 'invoice'
          createdAt: inv.createdAt
        });
        existingDescSet.add(invDesc);
      }

      if (inv.status === 'PAID') {
        const payDesc = `Payment Received for Invoice #${invNum} (Rp ${Number(inv.amount || 0).toLocaleString('id-ID')}) via ${inv.paymentMethod || 'Payment Gateway'}`;
        if (!existingDescSet.has(payDesc)) {
          realLogsToCreate.push({
            userId,
            description: payDesc,
            username: 'System',
            ipAddress: '127.0.0.1',
            category: 'payment',
            createdAt: inv.paidAt || inv.updatedAt || inv.createdAt
          });
          existingDescSet.add(payDesc);
        }
      }
    }

    // Real Email Events
    for (const em of user.emailLogs) {
      const emDesc = `Email Sent to ${em.to} (${em.subject})`;
      if (!existingDescSet.has(emDesc)) {
        realLogsToCreate.push({
          userId,
          description: emDesc,
          username: 'System',
          ipAddress: '127.0.0.1',
          category: 'email',
          createdAt: em.createdAt
        });
        existingDescSet.add(emDesc);
      }
    }

    // Real VPS Service Events
    for (const vps of user.vpsServices) {
      const vpsDesc = `VPS Instance Provisioned: ${vps.hostname || 'Cloud VPS'} (${vps.cpuCores || 1} vCPU, ${vps.ramGb || 1} GB RAM) - Status: ${vps.status}`;
      if (!existingDescSet.has(vpsDesc)) {
        realLogsToCreate.push({
          userId,
          description: vpsDesc,
          username: 'System',
          ipAddress: '127.0.0.1',
          category: 'service',
          createdAt: vps.createdAt
        });
        existingDescSet.add(vpsDesc);
      }
    }

    if (realLogsToCreate.length > 0) {
      await prisma.clientActivityLog.createMany({
        data: realLogsToCreate
      });
    }

    // Extract query parameters for filtering & pagination
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));
    const dateQuery = searchParams.get('date')?.trim();
    const usernameQuery = searchParams.get('username')?.trim();
    const searchQuery = searchParams.get('search')?.trim();
    const ipQuery = searchParams.get('ip')?.trim();
    const categoryQuery = searchParams.get('category')?.trim();

    // Construct Prisma where clause
    const where: any = { userId };

    if (searchQuery) {
      where.description = {
        contains: searchQuery,
        mode: 'insensitive'
      };
    }

    if (usernameQuery && usernameQuery.toLowerCase() !== 'any') {
      where.username = {
        contains: usernameQuery,
        mode: 'insensitive'
      };
    }

    if (ipQuery) {
      where.ipAddress = {
        contains: ipQuery,
        mode: 'insensitive'
      };
    }

    if (categoryQuery && categoryQuery.toLowerCase() !== 'any') {
      where.category = categoryQuery;
    }

    if (dateQuery) {
      try {
        const startOfDay = new Date(dateQuery);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dateQuery);
        endOfDay.setHours(23, 59, 59, 999);

        if (!isNaN(startOfDay.getTime())) {
          where.createdAt = {
            gte: startOfDay,
            lte: endOfDay
          };
        }
      } catch {
        // Ignore invalid date
      }
    }

    // Total records matching filter
    const totalRecords = await prisma.clientActivityLog.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalRecords / limit));
    const skip = (page - 1) * limit;

    // Fetch records
    const logs = await prisma.clientActivityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    // Fetch distinct usernames for filter dropdown
    const rawUsernames = await prisma.clientActivityLog.findMany({
      where: { userId },
      select: { username: true },
      distinct: ['username']
    });

    const distinctUsernames = Array.from(
      new Set(
        rawUsernames
          .map(u => u.username)
          .filter(Boolean) as string[]
      )
    );

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        totalRecords,
        totalPages,
        currentPage: page,
        limit
      },
      usernames: distinctUsernames
    });
  } catch (error: any) {
    console.error('Fetch Client Activity Logs Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch logs' }, { status: 500 });
  }
}

/**
 * POST /api/admin/users/[id]/logs - Create a manual client activity note/log
 */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 });
    }

    const { id } = await context.params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const body = await req.json();
    const { description, category = 'system', ipAddress } = body;

    if (!description || !description.trim()) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    const adminName = auth.user.name ? decryptDeterministic(auth.user.name) : 'Admin';
    const clientIp = ipAddress || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

    const log = await prisma.clientActivityLog.create({
      data: {
        userId,
        description: description.trim(),
        username: adminName,
        ipAddress: clientIp,
        category: category || 'system',
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Activity log recorded successfully',
      data: log
    });
  } catch (error: any) {
    console.error('Create Client Activity Log Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create log' }, { status: 500 });
  }
}
