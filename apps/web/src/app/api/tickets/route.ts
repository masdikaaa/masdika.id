import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { sendTicketCreatedEmail } from '@/lib/email';
import { encryptDeterministic, decryptDeterministic } from '@/lib/encryption';
import { searchTicketsElastic, syncTicketToElastic } from '@/lib/sync-elasticsearch';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    
    const user = auth.user!;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search') || searchParams.get('q') || '';

    // 1. Attempt Elasticsearch search if search query is provided
    let elasticTicketIds: number[] | null = null;
    if (search.trim()) {
      elasticTicketIds = await searchTicketsElastic(search.trim(), {
        userId: user.role !== 'ADMIN' ? user.id : undefined,
        status: status || undefined,
        limit: 150,
      });
    }

    const whereClause: any = {};
    
    // If not admin, only show own tickets
    if (user.role !== 'ADMIN') {
      whereClause.userId = user.id;
    }

    if (status) {
      whereClause.status = status;
    }

    if (elasticTicketIds !== null) {
      whereClause.id = { in: elasticTicketIds };
    } else if (search.trim()) {
      whereClause.OR = [
        { ticketId: { contains: search.trim(), mode: 'insensitive' } },
        { subject: { contains: search.trim(), mode: 'insensitive' } },
        { service: { contains: search.trim(), mode: 'insensitive' } }
      ];
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where: whereClause,
        include: {
          user: {
            select: { name: true, email: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.supportTicket.count({ where: whereClause })
    ]);

    let decryptedTickets = tickets.map(t => ({
      ...t,
      user: {
        ...t.user,
        email: decryptDeterministic(t.user.email),
        name: t.user.name ? decryptDeterministic(t.user.name) : t.user.name
      }
    }));

    // 2. In-memory fallback if Elasticsearch is offline / not configured and searching
    if (elasticTicketIds === null && search.trim()) {
      const q = search.trim().toLowerCase();
      decryptedTickets = decryptedTickets.filter(t => {
        const tId = (t.ticketId || '').toLowerCase();
        const subj = (t.subject || '').toLowerCase();
        const serv = (t.service || '').toLowerCase();
        const uName = (t.user?.name || '').toLowerCase();
        const uEmail = (t.user?.email || '').toLowerCase();
        return tId.includes(q) || subj.includes(q) || serv.includes(q) || uName.includes(q) || uEmail.includes(q);
      });
    }

    return NextResponse.json({
      tickets: decryptedTickets,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      meta: {
        source: elasticTicketIds !== null ? 'elasticsearch' : 'database'
      }
    });
  } catch (error) {
    console.error('Fetch tickets error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    
    const user = auth.user!;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // SECURITY: Rate limit ticket creation to prevent spam (max 5 per hour)
    const { checkRateLimit } = await import('@/lib/rate-limit');
    const { getClientIp } = await import('@/lib/get-ip');
    const ip = getClientIp(req);
    if (!(await checkRateLimit('CREATE_TICKET', `${user.id}_${ip}`, 5, 3600))) {
      return NextResponse.json({ error: 'Terlalu banyak membuat tiket. Silakan coba lagi nanti.' }, { status: 429 });
    }

    const formData = await req.formData();
    const subject  = formData.get('subject')  as string;
    const service  = formData.get('service')  as string | null;
    const priority = formData.get('priority') as string | null;
    const message  = formData.get('message')  as string;
    const targetEmail = formData.get('targetEmail') as string | null;

    let targetUserId = user.id;
    let targetUserName = user.name;
    let targetUserEmail = user.email;

    if (user.role === 'ADMIN' && targetEmail) {
      const encryptedTargetEmail = encryptDeterministic(targetEmail.toLowerCase().trim());
      const targetUser = await prisma.user.findUnique({
        where: { email: encryptedTargetEmail }
      });
      if (!targetUser) {
        return NextResponse.json({ error: 'Target customer email not found' }, { status: 404 });
      }
      targetUserId = targetUser.id;
      targetUserName = targetUser.name;
      targetUserEmail = targetUser.email;
    }

    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
    }

    if (subject.length > 255) {
      return NextResponse.json({ error: 'Subject is too long (max 255 characters)' }, { status: 400 });
    }

    if (service && service.length > 255) {
      return NextResponse.json({ error: 'Service name is too long (max 255 characters)' }, { status: 400 });
    }

    if (message.length > 10000) {
      return NextResponse.json({ error: 'Message is too long (max 10000 characters)' }, { status: 400 });
    }

    // Process attachments
    const { promises: fs } = await import('fs');
    const path = await import('path');

    const files = formData.getAll('attachments') as File[];
    const attachmentData: { filename: string; originalName: string; mimeType: string; size: number; path: string }[] = [];

    if (files && files.length > 0) {
      if (files.length > 5) {
        return NextResponse.json({ error: 'Maximum of 5 attachments allowed' }, { status: 400 });
      }

      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
      const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.zip', '.rar', '.csv'];
      for (const file of files) {
        if (file instanceof File) {
          if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: `File ${file.name} exceeds the 5MB limit` }, { status: 400 });
          }
          const ext = path.extname(file.name).toLowerCase();
          if (!ALLOWED_EXTENSIONS.includes(ext)) {
            return NextResponse.json({ error: `File type ${ext} is not allowed.` }, { status: 400 });
          }
        }
      }

      const storageDir = path.join(process.cwd(), 'storage', 'tickets');
      await fs.mkdir(storageDir, { recursive: true });

      for (const file of files) {
        if (file instanceof File && file.size > 0) {
          const buffer = Buffer.from(await file.arrayBuffer());
          const ext = path.extname(file.name);
          const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
          const filePath = path.join(storageDir, uniqueFilename);
          await fs.writeFile(filePath, buffer);
          attachmentData.push({
            filename: uniqueFilename,
            originalName: file.name,
            mimeType: file.type,
            size: file.size,
            path: filePath,
          });
        }
      }
    }

    // Generate Ticket ID e.g., TKT-123456
    const ticketIdStr = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketId: ticketIdStr,
        userId: targetUserId,
        subject,
        service: service || null,
        priority: priority || 'NORMAL',
        status: 'OPEN',
        messages: {
          create: {
            userId: user.id,
            message,
            attachments: {
              create: attachmentData,
            },
          },
        },
      },
    });

    // Sync to Elasticsearch
    syncTicketToElastic(ticket.id).catch(err => console.debug("ES syncTicket create:", err));

    // Send Emails
    // Notify User
    await sendTicketCreatedEmail(targetUserEmail, targetUserName, ticket.ticketId, ticket.subject, false).catch(console.error);
    
    // Notify Admin (get all admins)
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    for (const admin of admins) {
      await sendTicketCreatedEmail(admin.email, user.name, ticket.ticketId, ticket.subject, true).catch(console.error);
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error('Create ticket error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
