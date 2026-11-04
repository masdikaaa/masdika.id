import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { requireAuth } from '@/lib/auth-middleware';
import { getUploadsDir } from '@/lib/file-utils';
import { uploadPublicUploadToRustFS, deletePublicUploadFromRustFS } from '@/lib/rustfs';
import {
  validateFileUploadSecurity,
  validateRealImageBuffer,
} from '@/lib/upload-security';

const ALLOWED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif']);
const ALLOWED_DOC_EXTENSIONS = new Set(['pdf', 'txt', 'csv', 'zip', 'rar', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']);
const ALL_ALLOWED_EXTENSIONS = new Set([...ALLOWED_IMAGE_EXTENSIONS, ...ALLOWED_DOC_EXTENSIONS]);

export async function POST(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file || file.size <= 0) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const folder = formData.get('folder') as string || '';
    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase(); // Sanitize folder name

    // File size limit: 10MB
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds the 10MB limit' }, { status: 400 });
    }

    const uploadsDir = safeFolder ? getUploadsDir(safeFolder) : getUploadsDir();
    const dbPathPrefix = safeFolder ? `/uploads/${safeFolder}` : '/uploads';
    const filePrefix = safeFolder ? safeFolder : 'file';

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Deep security check: extension whitelist, double-extension block, magic bytes, and anti-webshell scan
    const secCheck = validateFileUploadSecurity({
      filename: file.name,
      headBuffer: buffer,
      tailBuffer: buffer,
      allowedExtensions: ALL_ALLOWED_EXTENSIONS,
    });

    if (!secCheck.valid || !secCheck.ext || !secCheck.resolvedMime) {
      return NextResponse.json(
        { error: secCheck.error || 'File ditolak oleh sistem keamanan.' },
        { status: 400 }
      );
    }

    const randomSuffix = crypto.randomBytes(4).toString('hex');

    // Check if file is an image
    if (ALLOWED_IMAGE_EXTENSIONS.has(secCheck.ext)) {
      // Deeply validate image pixels & structure with Sharp
      const imgValidation = await validateRealImageBuffer(buffer);
      if (!imgValidation.valid) {
        return NextResponse.json({ error: imgValidation.error }, { status: 400 });
      }

      const filename = `${filePrefix}-${Date.now()}-${randomSuffix}.webp`;
      const filePath = path.join(uploadsDir, filename);

      // Optimize & re-encode image using sharp (strips all EXIF/metadata & any hidden polyglot payload)
      const sharpModule = await import('sharp');
      const sharp = sharpModule.default || sharpModule;

      const optimizedBuffer = await sharp(buffer, { failOn: 'error' })
        .resize(1200, undefined, {
          withoutEnlargement: true,
          fit: 'inside',
        })
        .webp({ quality: 80 })
        .toBuffer();

      try {
        fs.writeFileSync(filePath, optimizedBuffer, { mode: 0o644 });
      } catch {}

      const relativeUploadPath = safeFolder ? `${safeFolder}/${filename}` : filename;
      try {
        await uploadPublicUploadToRustFS(relativeUploadPath, optimizedBuffer, 'image/webp');
      } catch (rustErr) {
        console.error('[Admin Upload] RustFS upload error:', rustErr);
      }

      try {
        const { syncPublicImageToElastic } = await import('@/lib/sync-elasticsearch');
        syncPublicImageToElastic({
          name: filename,
          url: `${dbPathPrefix}/${filename}`,
          size: optimizedBuffer.length,
          createdAt: new Date()
        }).catch(() => {});
      } catch {}

      return NextResponse.json({ url: `${dbPathPrefix}/${filename}` });
    } else {
      // Non-image files (verified magic bytes & scanned for web shells)
      const ext = secCheck.ext;
      const filename = `${filePrefix}-${Date.now()}-${randomSuffix}.${ext}`;
      const filePath = path.join(uploadsDir, filename);

      try {
        fs.writeFileSync(filePath, buffer, { mode: 0o644 });
      } catch {}

      const relativeUploadPath = safeFolder ? `${safeFolder}/${filename}` : filename;
      try {
        await uploadPublicUploadToRustFS(relativeUploadPath, buffer, secCheck.resolvedMime);
      } catch (rustErr) {
        console.error('[Admin Upload] RustFS upload error:', rustErr);
      }

      return NextResponse.json({ url: `${dbPathPrefix}/${filename}` });
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Normalize URL: handle both absolute URLs (https://domain/uploads/...) and relative paths (/uploads/...)
    let uploadPath = String(url).trim();
    try {
      if (uploadPath.startsWith('http://') || uploadPath.startsWith('https://')) {
        const parsed = new URL(uploadPath);
        uploadPath = parsed.pathname;
      }
    } catch {}

    // Only allow deletion of files in /uploads/
    if (uploadPath.startsWith('/uploads/')) {
      const filename = uploadPath.replace(/^\/uploads\//, '');

      // Bulletproof path traversal prevention (same pattern as file-utils.ts)
      const baseDir = getUploadsDir();
      const filePath = path.resolve(baseDir, filename);

      // Ensure the resolved path is still within the uploads directory
      if (!filePath.toLowerCase().startsWith(baseDir.toLowerCase())) {
        return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
      }

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      try {
        await deletePublicUploadFromRustFS(filename);
      } catch (rustErr) {
        console.error('[Admin Upload Delete] RustFS delete error:', rustErr);
      }

      try {
        const { removePublicImageFromElastic } = await import('@/lib/sync-elasticsearch');
        removePublicImageFromElastic(uploadPath).catch(() => {});
      } catch {}

      return NextResponse.json({ success: true, message: 'File deleted from storage' });
    }
    
    return NextResponse.json({ error: 'Invalid URL path' }, { status: 400 });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
