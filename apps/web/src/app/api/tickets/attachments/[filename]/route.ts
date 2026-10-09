import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) return new NextResponse(auth.error, { status: auth.status });
    
    const user = auth.user!;
    const resolvedParams = await params;

    const filename = resolvedParams.filename;

    const attachment = await prisma.ticketAttachment.findFirst({
      where: { filename },
      include: {
        message: {
          include: { ticket: true }
        }
      }
    });

    if (!attachment) {
      return new NextResponse('Not found', { status: 404 });
    }

    // Check permissions
    if (user.role !== 'ADMIN' && attachment.message.ticket.userId !== user.id) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const filePath = attachment.path;
    let fileBuffer;
    
    try {
      fileBuffer = await fs.readFile(filePath);
    } catch (e) {
      return new NextResponse('File not found on disk', { status: 404 });
    }

    // Set correct headers
    const headers = new Headers();
    headers.set('Content-Type', attachment.mimeType);
    headers.set('Content-Disposition', `inline; filename="${attachment.originalName}"`);
    
    // Security headers to prevent XSS (forces modern browsers not to execute scripts)
    headers.set('Content-Security-Policy', "default-src 'none'; sandbox");
    headers.set('X-Content-Type-Options', 'nosniff');

    return new NextResponse(fileBuffer, { status: 200, headers });
  } catch (error) {
    console.error('Serve ticket attachment error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
