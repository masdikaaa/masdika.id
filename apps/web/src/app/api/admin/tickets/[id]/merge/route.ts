import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { syncTicketToElastic } from '@/lib/sync-elasticsearch';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    
    const user = auth.user!;
    const resolvedParams = await params;

    const sourceTicketIdStr = resolvedParams.id;
    const { targetTicketIdStr } = await req.json();

    if (!targetTicketIdStr) {
      return NextResponse.json({ error: 'Target ticket ID is required' }, { status: 400 });
    }

    const sourceTicket = await prisma.supportTicket.findUnique({
      where: { ticketId: sourceTicketIdStr }
    });

    const targetTicket = await prisma.supportTicket.findUnique({
      where: { ticketId: targetTicketIdStr }
    });

    if (!sourceTicket || !targetTicket) {
      return NextResponse.json({ error: 'One or both tickets not found' }, { status: 404 });
    }

    if (sourceTicket.id === targetTicket.id) {
      return NextResponse.json({ error: 'Cannot merge a ticket into itself' }, { status: 400 });
    }

    if (sourceTicket.userId !== targetTicket.userId) {
      return NextResponse.json({ error: 'Cannot merge tickets from different users' }, { status: 400 });
    }

    // Move all messages from source to target
    await prisma.ticketMessage.updateMany({
      where: { ticketId: sourceTicket.id },
      data: { ticketId: targetTicket.id }
    });

    // Update source ticket status
    await prisma.supportTicket.update({
      where: { id: sourceTicket.id },
      data: {
        status: 'MERGED',
        mergedIntoId: targetTicket.id
      }
    });

    // Create a system message in the target ticket
    await prisma.ticketMessage.create({
      data: {
        ticketId: targetTicket.id,
        userId: user.id,
        message: `System: Ticket #${sourceTicket.ticketId} has been merged into this ticket.`,
        isSystem: true
      }
    });

    // Sync both tickets to elastic
    syncTicketToElastic(sourceTicket.id).catch(err => console.error('Failed to sync merged source ticket to elastic:', err));
    syncTicketToElastic(targetTicket.id).catch(err => console.error('Failed to sync merged target ticket to elastic:', err));

    return NextResponse.json({ success: true, message: 'Tickets merged successfully' });
  } catch (error) {
    console.error('Merge ticket error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
