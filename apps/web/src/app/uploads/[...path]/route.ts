import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { getUploadsDir } from '@/lib/file-utils';
import { getPublicUploadStreamFromRustFS } from '@/lib/rustfs';

// Explicitly blocked dangerous executable or script extensions
const FORBIDDEN_EXTENSIONS = new Set([
  '.php', '.phtml', '.php3', '.php4', '.php5', '.phps',
  '.sh', '.bash', '.exe', '.bat', '.cmd', '.py', '.pl', '.cgi',
  '.env', '.config', '.htaccess', '.htpasswd', '.ini',
  '.html', '.htm', '.xhtml', '.jsp', '.asp', '.aspx'
]);

const mimeTypes: Record<string, string> = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.zip': 'application/zip',
  '.rar': 'application/vnd.rar',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const relativeSubPath = resolvedParams.path.join('/');
    const baseUploadsDir = path.normalize(getUploadsDir());
    const filePath = path.normalize(path.join(baseUploadsDir, ...resolvedParams.path));
    const ext = path.extname(filePath).toLowerCase();

    // 0. HARD SECURITY GUARD: Block any request targeting script/executable files
    if (FORBIDDEN_EXTENSIONS.has(ext)) {
      console.warn(`[Security Alert] Blocked attempt to access forbidden file: ${relativeSubPath}`);
      return new NextResponse('Forbidden', { status: 403 });
    }

    const fallbackContentType = mimeTypes[ext] || 'application/octet-stream';
    const rangeHeader = request.headers.get('range');
    const securityHeaders: Record<string, string> = {
      'Content-Type': fallbackContentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Accept-Ranges': 'bytes',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'none'; sandbox"
    };

    // 1. Try serving from local disk if it exists (strict directory traversal prevention)
    if (filePath.startsWith(baseUploadsDir + path.sep) || filePath === baseUploadsDir) {
      if (fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        const totalSize = stat.size;

        if (rangeHeader && rangeHeader.startsWith('bytes=')) {
          const parts = rangeHeader.replace(/bytes=/, '').split('-');
          let start = parts[0] ? parseInt(parts[0], 10) : NaN;
          let end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
          if (isNaN(start)) {
            start = totalSize - parseInt(parts[1], 10);
            end = totalSize - 1;
          }
          if (start >= totalSize || start < 0) {
            return new NextResponse(null, {
              status: 416,
              headers: { 'Content-Range': `bytes */${totalSize}` },
            });
          }
          end = Math.min(end, totalSize - 1);
          const chunkSize = end - start + 1;
          const nodeStream = fs.createReadStream(filePath, { start, end });
          const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;
          return new NextResponse(webStream, {
            status: 206,
            headers: {
              ...securityHeaders,
              'Content-Range': `bytes ${start}-${end}/${totalSize}`,
              'Content-Length': String(chunkSize),
            },
          });
        }

        const nodeStream = fs.createReadStream(filePath);
        const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;
        return new NextResponse(webStream, {
          headers: {
            ...securityHeaders,
            'Content-Length': String(totalSize),
          },
        });
      }
    }

    // 2. Direct Zero-Copy Stream from RustFS S3 Object Storage
    let rustStream = await getPublicUploadStreamFromRustFS(relativeSubPath, rangeHeader);
    if (!rustStream && relativeSubPath.startsWith('media/')) {
      rustStream = await getPublicUploadStreamFromRustFS(relativeSubPath.replace(/^media\//, 'blog/'), rangeHeader);
    } else if (!rustStream && relativeSubPath.startsWith('blog/')) {
      rustStream = await getPublicUploadStreamFromRustFS(relativeSubPath.replace(/^blog\//, 'media/'), rangeHeader);
    }
    if (rustStream) {
      const headers: Record<string, string> = {
        ...securityHeaders,
        'Content-Type': rustStream.contentType || fallbackContentType,
        'Content-Length': String(rustStream.contentLength),
      };
      if (rustStream.contentRange) {
        headers['Content-Range'] = rustStream.contentRange;
      }
      if (rustStream.etag) {
        headers['ETag'] = rustStream.etag;
      }
      return new NextResponse(rustStream.stream, {
        status: rustStream.statusCode,
        headers,
      });
    }

    return new NextResponse('Not Found', { status: 404 });
  } catch (error) {
    console.error('Error serving upload file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
