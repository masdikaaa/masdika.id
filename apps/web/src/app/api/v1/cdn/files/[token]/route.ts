import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { Readable } from 'stream';
import { prisma } from '@/lib/prisma';
import { authenticateCdnApiKey } from '@/lib/cdn-api-auth';
import {
  deleteFromCustomerRustFS,
  downloadBufferFromCustomerRustFS,
  getCustomerRustFSConfig,
  getDefaultCdnBucketName,
  getObjectStreamFromCustomerRustFS,
} from '@/lib/customer-rustfs';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const auth = await authenticateCdnApiKey(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (auth.isSuspended) {
    return NextResponse.json({ error: 'File CDN service is suspended' }, { status: 403 });
  }

  const { token } = await context.params;
  const media = await prisma.secureMedia.findUnique({ where: { token } });
  if (
    !media ||
    media.userId !== auth.userId ||
    media.isFolder ||
    (auth.subscriptionId && media.subscriptionId && media.subscriptionId !== auth.subscriptionId)
  ) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  if (media.expiresAt && media.expiresAt < new Date()) {
    return NextResponse.json({ error: 'File has expired' }, { status: 410 });
  }

  const cfg = await getCustomerRustFSConfig();
  const bucketName = media.bucket || getDefaultCdnBucketName(auth.userId, cfg.cdnBucketPrefix);
  const encryptionKeyHex = process.env.MEDIA_ENCRYPTION_KEY;
  const isEncrypted = Boolean(encryptionKeyHex && encryptionKeyHex.length >= 64);

  const safeName = media.originalName.replace(/["\\\r\n]/g, '_');
  const baseHeaders: Record<string, string> = {
    'Content-Type': media.mimeType,
    'Content-Disposition': `attachment; filename="${safeName}"`,
    'X-Content-Type-Options': 'nosniff',
  };

  if (!isEncrypted) {
    const streamRes = await getObjectStreamFromCustomerRustFS(
      bucketName,
      media.filename,
      req.headers.get('range') || undefined
    );
    if (!streamRes) {
      return NextResponse.json({ error: 'Object not found on storage' }, { status: 404 });
    }
    const webStream = Readable.toWeb(streamRes.stream) as unknown as ReadableStream<Uint8Array>;
    return new NextResponse(webStream, {
      status: streamRes.statusCode,
      headers: {
        ...baseHeaders,
        'Content-Length': String(streamRes.contentLength ?? ''),
        ...(streamRes.contentRange ? { 'Content-Range': streamRes.contentRange } : {}),
      },
    });
  }

  const encryptedBuf = await downloadBufferFromCustomerRustFS(bucketName, media.filename);
  if (!encryptedBuf) {
    return NextResponse.json({ error: 'Object not found on storage' }, { status: 404 });
  }

  const key = Buffer.from(encryptionKeyHex!.substring(0, 64), 'hex');
  const iv = encryptedBuf.subarray(0, 16);
  const payload = encryptedBuf.subarray(16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decrypted = Buffer.concat([decipher.update(payload), decipher.final()]);

  return new NextResponse(new Uint8Array(decrypted), {
    status: 200,
    headers: {
      ...baseHeaders,
      'Content-Length': String(decrypted.length),
    },
  });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
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

  const { token } = await context.params;
  const media = await prisma.secureMedia.findUnique({ where: { token } });
  if (
    !media ||
    media.userId !== auth.userId ||
    media.isFolder ||
    (auth.subscriptionId && media.subscriptionId && media.subscriptionId !== auth.subscriptionId)
  ) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const cfg = await getCustomerRustFSConfig();
  const bucketName = media.bucket || getDefaultCdnBucketName(auth.userId, cfg.cdnBucketPrefix);
  await deleteFromCustomerRustFS(bucketName, media.filename).catch(() => {});
  await prisma.secureMedia.delete({ where: { id: media.id } });

  return NextResponse.json({ success: true, deletedToken: token });
}
