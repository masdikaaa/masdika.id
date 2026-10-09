import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';

import { decryptDeterministic } from '@/lib/encryption';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    
    const user = auth.user!;
    const resolvedParams = await params;
    const ticketId = resolvedParams.id.toUpperCase();

    const ticket = await prisma.supportTicket.findUnique({
      where: { ticketId },
      include: {
        user: { select: { name: true, email: true, image: true } },
        messages: {
          include: {
            user: { select: { name: true, role: true, image: true, email: true } },
            attachments: true
          },
          orderBy: { createdAt: 'asc' }
        },
        mergedInto: true,
        mergedFrom: true,
      }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check permissions
    if (user.role !== 'ADMIN' && ticket.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const profileImageSetting = await prisma.setting.findFirst({ where: { key: 'profileImage' } });
    const adminImage = profileImageSetting?.value || null;

    if (ticket.user?.name) ticket.user.name = decryptDeterministic(ticket.user.name);
    if (ticket.user?.email) ticket.user.email = decryptDeterministic(ticket.user.email);
    ticket.messages = ticket.messages.map(msg => {
      if (msg.user?.name) msg.user.name = decryptDeterministic(msg.user.name);
      if (msg.user?.email) msg.user.email = decryptDeterministic(msg.user.email);
      if (msg.user?.role === 'ADMIN' && adminImage) {
        if (!msg.user.image) {
          msg.user.image = adminImage;
        }
      }
      return msg;
    });

    if (user.role === 'ADMIN' && !ticket.isReadByAdmin) {
      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { isReadByAdmin: true }
      });
      ticket.isReadByAdmin = true;
    }

    if (user.role === 'USER' && !ticket.isReadByUser) {
      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { isReadByUser: true }
      });
      ticket.isReadByUser = true;
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error('Fetch ticket thread error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    
    const user = auth.user!;
    const resolvedParams = await params;
    const ticketId = resolvedParams.id.toUpperCase();
    
    const body = await req.json();
    const { action } = body;

    const ticket = await prisma.supportTicket.findUnique({
      where: { ticketId }
    });

    if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (user.role !== 'ADMIN' && ticket.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    let dataToUpdate: any = {};

    if (action === 'MARK_READ') {
      if (user.role === 'USER') dataToUpdate.isReadByUser = true;
      else if (user.role === 'ADMIN') dataToUpdate.isReadByAdmin = true;
    } else if (action === 'CLOSE') {
      dataToUpdate.status = 'CLOSED';
    } else if (action === 'REOPEN') {
      dataToUpdate.status = 'OPEN';
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updated = await prisma.supportTicket.update({
      where: { ticketId },
      data: dataToUpdate
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('PATCH ticket error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
