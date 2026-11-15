import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/lib/prisma';
import { authenticateCdnApiKey } from '@/lib/cdn-api-auth';
import { resolveCustomerCdnBucket } from '@/lib/cdn-bucket';
import { getActiveSubscription } from '@/lib/subscription';
import { uploadBufferToCustomerRustFS } from '@/lib/customer-rustfs';
import {
  sanitizeCdnFolderPath,
  validateFileUploadSecurity,
  validateRealImageBuffer,
} from '@/lib/upload-security';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const MAX_API_UPLOAD_BYTES = 100 * 1024 * 1024; // 100MB per single API request

const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'heic', 'heif',
  'mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv',
  'mp3', 'wav', 'm4a', 'flac', 'aac',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'txt', 'csv', 'md', 'json',
  'zip', 'rar', '7z', 'gz',
]);

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'heic', 'heif']);

function sanitizeFilename(name: string): string {
  const base = name.replace(/[/\\]/g, '').trim();
  const safe = base.replace(/[^\w\s.\-()[\]]/g, '_');
  return safe.replace(/^\.+/, '').slice(0, 255) || 'upload';
}

export async function POST(req: NextRequest) {
  const auth = await authenticateCdnApiKey(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (auth.permission === 'READ_ONLY') {
    return NextResponse.json({ error: 'API key is READ_ONLY' }, { status: 403 });
  }
  if (auth.isSuspended) {
    return NextResponse.json({ error: 'File CDN service is suspended' }, { status: 403 });
  }

  try {
    let rawBuffer: Buffer;
    let rawFilename = 'upload.bin';
    let requestedBucket: string | null = req.headers.get('x-bucket');
    let requestedFolder = req.headers.get('x-folder') || '/';
    let isPublic = req.headers.get('x-public') !== 'false';

    let expiresAt: Date | null = null;
    const parseTtl = (raw: string | null) => {
      if (!raw || raw.trim() === '' || raw.trim() === 'permanent') return null;
      const ttl = Number(raw.trim());
      if (!Number.isInteger(ttl) || ttl < 60 || ttl > 365 * 24 * 60 * 60) {
        throw new Error('INVALID_TTL');
      }
      return new Date(Date.now() + ttl * 1000);
    };

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file');
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'Missing "file" field in multipart/form-data' }, { status: 400 });
      }
      rawFilename = file.name || 'upload.bin';
      if (form.get('bucket')) requestedBucket = String(form.get('bucket'));
      if (form.get('folder')) requestedFolder = String(form.get('folder'));
      if (form.get('isPublic') !== null) isPublic = String(form.get('isPublic')) !== 'false';
      try {
        expiresAt = parseTtl(form.get('expiresIn') !== null ? String(form.get('expiresIn')) : null);
      } catch {
        return NextResponse.json({ error: 'Invalid expiresIn (must be permanent or 60..31536000 seconds)' }, { status: 400 });
      }
      rawBuffer = Buffer.from(await file.arrayBuffer());
    } else {
      rawFilename = req.headers.get('x-filename') || 'upload.bin';
      try {
        expiresAt = parseTtl(req.headers.get('x-expires-in'));
      } catch {
        return NextResponse.json({ error: 'Invalid x-expires-in (must be permanent or 60..31536000 seconds)' }, { status: 400 });
      }
      rawBuffer = Buffer.from(await req.arrayBuffer());
    }

    if (rawBuffer.length <= 0) {
      return NextResponse.json({ error: 'File body is empty' }, { status: 400 });
    }
    if (rawBuffer.length > MAX_API_UPLOAD_BYTES) {
      return NextResponse.json({ error: 'File exceeds 100MB single-request API limit' }, { status: 413 });
    }

    const folderPath = sanitizeCdnFolderPath(requestedFolder);
    if (!folderPath) {
      return NextResponse.json({ error: 'Invalid folder path' }, { status: 400 });
    }

    const targetBucket = await resolveCustomerCdnBucket(
      auth.userId,
      requestedBucket,
      auth.subscriptionId ?? undefined
    );
    if (!targetBucket) {
      return NextResponse.json({ error: 'Target CDN storage not found or access denied' }, { status: 404 });
    }

    // Quota check
    const isAdmin = auth.role === 'ADMIN' || auth.role === 'SUPER_ADMIN';
    if (!isAdmin) {
      const cdnSub = auth.subscriptionId
        ? await prisma.subscription.findFirst({
            where: { id: auth.subscriptionId, userId: auth.userId, status: 'ACTIVE' },
            include: { plan: true },
          })
        : await getActiveSubscription(auth.userId, 'CDN');
      if (!cdnSub) {
        return NextResponse.json({ error: 'Active File CDN subscription required' }, { status: 403 });
      }
      const limits = JSON.parse(cdnSub.plan.limits || '{}');
      const storageLimitGB = Number(limits.storageGB || limits.storageGb || 0);
      const storageLimitBytes = storageLimitGB * 1024 * 1024 * 1024;
      const aggregate = await prisma.secureMedia.aggregate({
        where: {
          userId: auth.userId,
          ...(auth.subscriptionId ? { subscriptionId: auth.subscriptionId } : {}),
        },
        _sum: { size: true },
      });
      const usedBytes = Number(aggregate._sum.size || 0);
      if (storageLimitBytes > 0 && usedBytes + rawBuffer.length > storageLimitBytes) {
        return NextResponse.json(
          { error: `Storage quota exceeded. Plan limit: ${storageLimitGB} GB.` },
          { status: 403 }
        );
      }
    }

    const originalName = sanitizeFilename(rawFilename);
    const headBuffer = rawBuffer.subarray(0, Math.min(rawBuffer.length, 65536));
    const tailBuffer = rawBuffer.subarray(Math.max(0, rawBuffer.length - 8192));

    const securityCheck = validateFileUploadSecurity({
      filename: originalName,
      headBuffer,
      tailBuffer,
      allowedExtensions: ALLOWED_EXTENSIONS,
    });
    if (!securityCheck.valid || !securityCheck.resolvedMime) {
      return NextResponse.json({ error: securityCheck.error || 'File rejected by security policy' }, { status: 415 });
    }

    if (securityCheck.ext && IMAGE_EXTENSIONS.has(securityCheck.ext)) {
      const imgCheck = await validateRealImageBuffer(rawBuffer);
      if (!imgCheck.valid) {
        return NextResponse.json({ error: imgCheck.error }, { status: 400 });
      }
    }

    let payloadToUpload = rawBuffer;
    const encryptionKeyHex = process.env.MEDIA_ENCRYPTION_KEY;
    if (encryptionKeyHex && encryptionKeyHex.length >= 64) {
      const key = Buffer.from(encryptionKeyHex.substring(0, 64), 'hex');
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      payloadToUpload = Buffer.concat([iv, cipher.update(rawBuffer), cipher.final()]);
    }

    const uniqueFilename = `${Date.now()}-${uuidv4()}`;
    const uploaded = await uploadBufferToCustomerRustFS(
      targetBucket.name,
      uniqueFilename,
      payloadToUpload,
      securityCheck.resolvedMime
    );
    if (!uploaded) {
      return NextResponse.json({ error: 'Failed to store object on Customer RustFS' }, { status: 502 });
    }

    const shareToken = uuidv4();
    const media = await prisma.secureMedia.create({
      data: {
        filename: uniqueFilename,
        originalName,
        mimeType: securityCheck.resolvedMime,
        size: rawBuffer.length,
        bucket: targetBucket.name,
        subscriptionId: auth.subscriptionId ?? targetBucket.subscriptionId ?? null,
        folderPath,
        isFolder: false,
        isPublic,
        expiresAt,
        token: shareToken,
        userId: auth.userId,
      },
    });

    const baseUrl = req.nextUrl.origin;

    return NextResponse.json(
      {
        success: true,
        file: {
          id: media.id,
          token: media.token,
          bucket: targetBucket.name,
          folderPath: media.folderPath,
          originalName: media.originalName,
          mimeType: media.mimeType,
          size: Number(media.size),
          isPublic: media.isPublic,
          url: `${baseUrl}/api/media/${media.token}`,
          apiDownloadUrl: `${baseUrl}/api/v1/cdn/files/${media.token}`,
          createdAt: media.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('CDN v1 upload error:', error);
    return NextResponse.json({ error: error?.message || 'Upload failed' }, { status: 500 });
  }
}
