import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { sendTicketReplyEmail } from '@/lib/email';
import { promises as fs } from 'fs';
import path from 'path';
import { syncTicketToElastic } from '@/lib/sync-elasticsearch';
import { uploadTicketAttachmentToRustFS } from '@/lib/rustfs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    
    const user = auth.user!;
    const resolvedParams = await params;

    const ticketId = resolvedParams.id.toUpperCase();
    const ticket = await prisma.supportTicket.findUnique({
      where: { ticketId },
      include: { user: true }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // SECURITY: Rate limit ticket replies to prevent spam (max 15 per hour)
    if (user.role !== 'ADMIN') {
      const { checkRateLimit } = await import('@/lib/rate-limit');
      const { getClientIp } = await import('@/lib/get-ip');
      const ip = getClientIp(req);
      if (!(await checkRateLimit('REPLY_TICKET', `${user.id}_${ip}`, 15, 3600))) {
        return NextResponse.json({ error: 'Terlalu banyak membalas tiket. Silakan coba lagi nanti.' }, { status: 429 });
      }
    }

    // Check permissions
    if (user.role !== 'ADMIN' && ticket.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    if (ticket.status === 'CLOSED' || ticket.status === 'MERGED') {
      return NextResponse.json({ error: 'Cannot reply to a closed or merged ticket' }, { status: 400 });
    }

    const formData = await req.formData();
    const message = formData.get('message') as string;
    const action = formData.get('action') as string; // 'close' or 'reply'

    if (!message && action !== 'close') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (message && message.length > 10000) {
      return NextResponse.json({ error: 'Message is too long (max 10000 characters)' }, { status: 400 });
    }

    if (action === 'close' && user.role === 'ADMIN') {
      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { status: 'CLOSED' }
      });
      return NextResponse.json({ success: true, message: 'Ticket closed' });
    }

    // Process attachments
    const files = formData.getAll('attachments') as File[];
    const attachmentData = [];
    
    if (files && files.length > 0) {
      if (files.length > 5) {
        return NextResponse.json({ error: 'Maximum of 5 attachments allowed per reply' }, { status: 400 });
      }

      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
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
        if (file instanceof File) {
          const buffer = Buffer.from(await file.arrayBuffer());
          const ext = path.extname(file.name);
          const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
          const filePath = path.join(storageDir, uniqueFilename);
          
          try {
            await uploadTicketAttachmentToRustFS(uniqueFilename, buffer, file.type || 'application/octet-stream');
          } catch (rustErr) {
            console.error('[Ticket Reply Attachment] RustFS upload error, fallback to local disk:', rustErr);
            await fs.writeFile(filePath, buffer);
          }
          
          attachmentData.push({
            filename: uniqueFilename,
            originalName: file.name,
            mimeType: file.type,
            size: file.size,
            path: filePath
          });
        }
      }
    }

    // Determine new status
    let newStatus = 'OPEN';
    if (user.role === 'ADMIN') {
      newStatus = 'ANSWERED';
    } else {
      newStatus = 'CUSTOMER_REPLY';
    }

    // Create Message
    const ticketMessage = await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        userId: user.id,
        message,
        attachments: {
          create: attachmentData
        }
      },
      include: { attachments: true }
    });

    // Update Ticket Status
    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { 
        status: newStatus,
        ...(user.role !== 'ADMIN' ? { isReadByAdmin: false, isReadByUser: true } : { isReadByAdmin: true, isReadByUser: false })
      }
    });

    // Sync to Elasticsearch
    syncTicketToElastic(ticket.id).catch(err => console.debug("ES replyTicket:", err));

    // Send emails
    if (user.role === 'ADMIN') {
      await sendTicketReplyEmail(ticket.user.email, ticket.user.name, ticket.ticketId, ticket.subject, false).catch(console.error);
    } else {
      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
      for (const admin of admins) {
        await sendTicketReplyEmail(admin.email, ticket.user.name, ticket.ticketId, ticket.subject, true).catch(console.error);
      }
    }

    return NextResponse.json(ticketMessage);
  } catch (error) {
    console.error('Reply to ticket error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
