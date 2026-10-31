import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { requireAuth } from '@/lib/auth-middleware';
import { getUploadsDir } from '@/lib/file-utils';
import { uploadPublicUploadToRustFS, deletePublicUploadFromRustFS } from '@/lib/rustfs';

/**
 * Validate image file by checking magic bytes (file signature).
 * Prevents uploading malicious files disguised as images.
 */
function isValidImageMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;
  // GIF: 47 49 46 38
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return true;
  // WebP: 52 49 46 46 ... 57 45 42 50
  if (buffer.length >= 12 && buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46
      && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return true;
  // BMP: 42 4D
  if (buffer[0] === 0x42 && buffer[1] === 0x4D) return true;
  // TIFF: 49 49 or 4D 4D
  if ((buffer[0] === 0x49 && buffer[1] === 0x49) || (buffer[0] === 0x4D && buffer[1] === 0x4D)) return true;
  // ICO: 00 00 01 00
  if (buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x01 && buffer[3] === 0x00) return true;
  // AVIF: ... 66 74 79 70 61 76 69 66 (ftyp avif)
  if (buffer.length >= 12 && buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) return true;

  return false;
}

export async function POST(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
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

    // Check if file is an image
    if (file.type.startsWith('image/')) {
      // Validate image magic bytes to prevent fake image uploads
      if (!isValidImageMagicBytes(buffer)) {
        return NextResponse.json({ error: 'File content does not match a valid image format' }, { status: 400 });
      }

      const filename = `${filePrefix}-${Date.now()}.webp`;
      const filePath = path.join(uploadsDir, filename);

      // Optimize image using sharp (dynamic import to fix Turbopack build error)
      const sharpModule = await import('sharp');
      const sharp = sharpModule.default || sharpModule;

      const optimizedBuffer = await sharp(buffer)
        .resize(1200, undefined, {
          withoutEnlargement: true,
          fit: 'inside',
        })
        .webp({ quality: 80 })
        .toBuffer();

      try {
        fs.writeFileSync(filePath, optimizedBuffer);
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
      // For non-image files
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
      
      // Strict whitelist of allowed non-image extensions
      const allowedExtensions = ['pdf', 'txt', 'csv', 'zip', 'rar', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
      
      if (!allowedExtensions.includes(ext)) {
        return NextResponse.json({ error: 'File type not allowed for security reasons. Allowed: ' + allowedExtensions.join(', ') }, { status: 400 });
      }

      const filename = `${filePrefix}-${Date.now()}.${ext}`;
      const filePath = path.join(uploadsDir, filename);

      try {
        fs.writeFileSync(filePath, buffer, { mode: 0o644 });
      } catch {}

      const relativeUploadPath = safeFolder ? `${safeFolder}/${filename}` : filename;
      try {
        await uploadPublicUploadToRustFS(relativeUploadPath, buffer, file.type || 'application/octet-stream');
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
