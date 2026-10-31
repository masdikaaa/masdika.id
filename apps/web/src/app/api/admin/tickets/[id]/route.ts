import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { promises as fs } from 'fs';
import path from 'path';
import { syncTicketToElastic } from '@/lib/sync-elasticsearch';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id: ticketId } = await params;

    // Fetch the ticket with all attachments so we can clean up files
    const ticket = await prisma.supportTicket.findUnique({
      where: { ticketId },
      include: {
        messages: {
          include: { attachments: true },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Delete physical files from storage
    for (const message of ticket.messages) {
      for (const attachment of message.attachments) {
        const filePath = path.join(process.cwd(), 'storage', 'tickets', attachment.filename);
        await fs.unlink(filePath).catch(() => {
          // Ignore if file is already missing
        });
      }
    }

    // Delete ticket from DB — cascades to messages + attachment rows
    await prisma.supportTicket.delete({ where: { ticketId } });

    // Remove from Elasticsearch
    syncTicketToElastic(ticket.id).catch(err => console.debug("ES sync delete ticket:", err));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete ticket error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
