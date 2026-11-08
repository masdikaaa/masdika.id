import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { promises as fs } from 'fs';
import path from 'path';
import { getTicketAttachmentStreamFromRustFS, downloadTicketAttachmentFromRustFS } from '@/lib/rustfs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) return new NextResponse(auth.error, { status: auth.status });
    
    const user = auth.user!;
    const resolvedParams = await params;

    const rawFilename = resolvedParams.filename || '';
    const filename = path.basename(rawFilename);
    if (!filename || filename !== rawFilename || filename.includes('\0') || filename === '.' || filename === '..') {
      return new NextResponse('Invalid filename', { status: 400 });
    }

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

    // Check permissions (ticket owner or admin/super_admin)
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN' && attachment.message.ticket.userId !== user.id) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const SAFE_INLINE_MIMES = new Set([
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'
    ]);
    const canInline = SAFE_INLINE_MIMES.has(attachment.mimeType);
    const safeName = (attachment.originalName || 'attachment').replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');

    const headers = new Headers();
    headers.set('Content-Type', canInline ? attachment.mimeType : 'application/octet-stream');
    headers.set('Content-Disposition', `${canInline ? 'inline' : 'attachment'}; filename="${safeName}"`);
    headers.set('Cache-Control', 'private, max-age=86400');
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Content-Security-Policy', "default-src 'none'; sandbox");
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');

    const rangeHeader = req.headers.get('range');
    const rustStream = await getTicketAttachmentStreamFromRustFS(filename, rangeHeader);
    if (rustStream) {
      headers.set('Content-Length', String(rustStream.contentLength));
      if (rustStream.contentRange) headers.set('Content-Range', rustStream.contentRange);
      if (rustStream.etag) headers.set('ETag', rustStream.etag);
      return new NextResponse(rustStream.stream, {
        status: rustStream.statusCode,
        headers,
      });
    }

    let fileBuffer: Buffer | null = await downloadTicketAttachmentFromRustFS(filename);
    
    if (!fileBuffer) {
      const candidateDirs = [
        path.resolve(process.cwd(), 'storage', 'tickets'),
        path.resolve(process.cwd(), 'apps', 'web', 'storage', 'tickets'),
        '/app/apps/web/storage/tickets',
      ];
      for (const dir of candidateDirs) {
        const normalizedBase = path.resolve(dir) + path.sep;
        const candidatePath = path.resolve(dir, filename);
        if (candidatePath.toLowerCase().startsWith(normalizedBase.toLowerCase())) {
          try {
            fileBuffer = await fs.readFile(candidatePath);
            break;
          } catch {}
        }
      }
      if (!fileBuffer) {
        return new NextResponse('File not found', { status: 404 });
      }
    }

    return new NextResponse(new Uint8Array(fileBuffer), { status: 200, headers });
  } catch (error) {
    console.error('Serve ticket attachment error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
