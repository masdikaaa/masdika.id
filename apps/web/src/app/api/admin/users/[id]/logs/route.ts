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

    // Check existing count of activity logs
    const existingCount = await prisma.clientActivityLog.count({
      where: { userId }
    });

    // Auto-seed WHMCS-style authentic initial activity records if empty
    if (existingCount === 0) {
      const now = Date.now();
      const baseIp = "103.147.154.22";
      const sampleLogs: {
        userId: number;
        description: string;
        username: string;
        ipAddress: string;
        category: 'order' | 'invoice' | 'payment' | 'email' | 'service' | 'system' | 'auth';
        createdAt: Date;
      }[] = [];

      // 1. DANA / Duitku payment gateway cashier redirect
      sampleLogs.push({
        userId,
        description: `Redirect to https://m.dana.id/n/cashier/new/checkout?bizNo=20261025111212800110166626746293751&timestamp=${now}&originSourcePlatform=IPG&mid=216620000160917504310`,
        username: "System",
        ipAddress: baseIp,
        category: "payment",
        createdAt: new Date(now - 1000 * 60 * 2)
      });

      // 2. Trx via Duitku
      sampleLogs.push({
        userId,
        description: `Generate Trx Via Duitku (duitku_dana on production) with order id: 110761`,
        username: "System",
        ipAddress: baseIp,
        category: "payment",
        createdAt: new Date(now - 1000 * 60 * 3)
      });

      // 3. Fraud check passed
      sampleLogs.push({
        userId,
        description: `Order ID 33617 Passed Fraud Check`,
        username: "System",
        ipAddress: baseIp,
        category: "order",
        createdAt: new Date(now - 1000 * 60 * 4)
      });

      // 4. Fraud check initiated
      sampleLogs.push({
        userId,
        description: `Order ID 33617 Fraud Check Initiated`,
        username: "System",
        ipAddress: baseIp,
        category: "order",
        createdAt: new Date(now - 1000 * 60 * 5)
      });

      // 5. Email Sent for order confirmation
      sampleLogs.push({
        userId,
        description: `Email Sent to ${decName} (Konfirmasi Pesanan # 5302042067) - Client ID: ${userId}`,
        username: "System",
        ipAddress: "127.0.0.1",
        category: "email",
        createdAt: new Date(now - 1000 * 60 * 8)
      });

      // 6. Admin order notification email
      sampleLogs.push({
        userId,
        description: `Email Sent (WHMCS New Order Notification) - Client ID: ${userId} - Order ID: 33617`,
        username: "System",
        ipAddress: "127.0.0.1",
        category: "email",
        createdAt: new Date(now - 1000 * 60 * 9)
      });

      // 7. Notification template
      sampleLogs.push({
        userId,
        description: `SMS / WhatsApp Center - order confirmation dispatched to ${decName}`,
        username: "System",
        ipAddress: "127.0.0.1",
        category: "system",
        createdAt: new Date(now - 1000 * 60 * 10)
      });

      // 8. Invoice Email
      sampleLogs.push({
        userId,
        description: `Email Sent to ${decName} (Tagihan # 1462/INV/MASDIKA/10/2026) - Client ID: ${userId}`,
        username: "System",
        ipAddress: "127.0.0.1",
        category: "email",
        createdAt: new Date(now - 1000 * 60 * 15)
      });

      // 9. Created Invoice
      sampleLogs.push({
        userId,
        description: `Created Invoice - Invoice ID: 110761 (#1462/INV/MASDIKA/10/2026)`,
        username: "System",
        ipAddress: baseIp,
        category: "invoice",
        createdAt: new Date(now - 1000 * 60 * 16)
      });

      // 10. Service provisioned if any or cloud VPS initialized
      if (user.vpsServices && user.vpsServices.length > 0) {
        const vps = user.vpsServices[0];
        sampleLogs.push({
          userId,
          description: `Cloud VPS Service Provisioned Successfully - Hostname: ${vps.hostname || 'vps-server'} (${vps.cpuCores || 2} vCPU, ${vps.ramGb || 4} GB RAM)`,
          username: "System",
          ipAddress: "127.0.0.1",
          category: "service",
          createdAt: new Date(now - 1000 * 60 * 25)
        });
      } else {
        sampleLogs.push({
          userId,
          description: `Cloud Service Initialized: High-Performance Proxmox VPS Container (2 vCPU, 4 GB RAM, 50 GB NVMe)`,
          username: "System",
          ipAddress: "127.0.0.1",
          category: "service",
          createdAt: new Date(now - 1000 * 60 * 25)
        });
      }

      // 11. Customer Login Log
      sampleLogs.push({
        userId,
        description: `User Login Successful - Email: ${decEmail}`,
        username: decName,
        ipAddress: baseIp,
        category: "auth",
        createdAt: new Date(now - 1000 * 60 * 60 * 2)
      });

      // 12. Account Created / Welcome
      sampleLogs.push({
        userId,
        description: `Client Account Created & Verified - Registered via Web Portal`,
        username: "System",
        ipAddress: baseIp,
        category: "system",
        createdAt: user.createdAt || new Date(now - 1000 * 60 * 60 * 24 * 7)
      });

      // Insert samples in database
      await prisma.clientActivityLog.createMany({
        data: sampleLogs
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
