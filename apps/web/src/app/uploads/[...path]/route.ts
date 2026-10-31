import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getUploadsDir } from '@/lib/file-utils';
import { downloadPublicUploadFromRustFS } from '@/lib/rustfs';

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
    const fallbackContentType = mimeTypes[ext] || 'application/octet-stream';

    // 1. Try serving from local disk if it exists (strict directory traversal prevention)
    if (filePath.startsWith(baseUploadsDir + path.sep) || filePath === baseUploadsDir) {
      if (fs.existsSync(filePath)) {
        const fileBuffer = fs.readFileSync(filePath);
        return new NextResponse(new Uint8Array(fileBuffer), {
          headers: {
            'Content-Type': fallbackContentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      }
    }

    // 2. Fallback / Primary from RustFS S3 Object Storage
    const rustFSObject = await downloadPublicUploadFromRustFS(relativeSubPath);
    if (rustFSObject) {
      return new NextResponse(new Uint8Array(rustFSObject.buffer), {
        headers: {
          'Content-Type': rustFSObject.contentType || fallbackContentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    return new NextResponse('Not Found', { status: 404 });
  } catch (error) {
    console.error('Error serving upload file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
