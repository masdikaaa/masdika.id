import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getUploadsDir } from '@/lib/file-utils';
import { downloadPublicUploadFromRustFS } from '@/lib/rustfs';

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
    const securityHeaders = {
      'Content-Type': fallbackContentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'none'; sandbox"
    };

    // 1. Try serving from local disk if it exists (strict directory traversal prevention)
    if (filePath.startsWith(baseUploadsDir + path.sep) || filePath === baseUploadsDir) {
      if (fs.existsSync(filePath)) {
        const fileBuffer = fs.readFileSync(filePath);
        return new NextResponse(new Uint8Array(fileBuffer), {
          headers: securityHeaders,
        });
      }
    }

    // 2. Fallback / Primary from RustFS S3 Object Storage
    const rustFSObject = await downloadPublicUploadFromRustFS(relativeSubPath);
    if (rustFSObject) {
      return new NextResponse(new Uint8Array(rustFSObject.buffer), {
        headers: {
          ...securityHeaders,
          'Content-Type': rustFSObject.contentType || fallbackContentType,
        },
      });
    }

    return new NextResponse('Not Found', { status: 404 });
  } catch (error) {
    console.error('Error serving upload file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
