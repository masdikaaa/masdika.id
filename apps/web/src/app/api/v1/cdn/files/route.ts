import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateCdnApiKey } from '@/lib/cdn-api-auth';
import { resolveCustomerCdnBucket } from '@/lib/cdn-bucket';
import { sanitizeCdnFolderPath } from '@/lib/upload-security';

export async function GET(req: NextRequest) {
  const auth = await authenticateCdnApiKey(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const requestedBucket = searchParams.get('bucket');
  const folderPath = sanitizeCdnFolderPath(searchParams.get('folder') || '/');
  if (!folderPath) {
    return NextResponse.json({ error: 'Invalid folder path' }, { status: 400 });
  }

  const bucket = await resolveCustomerCdnBucket(
    auth.userId,
    requestedBucket,
    auth.subscriptionId ?? undefined
  );
  if (!bucket) {
    return NextResponse.json({ error: 'CDN storage not found or access denied' }, { status: 404 });
  }

  const bucketFilter = bucket.isDefault
    ? { OR: [{ bucket: bucket.name }, { bucket: null }] }
    : { bucket: bucket.name };

  const files = await prisma.secureMedia.findMany({
    where: {
      userId: auth.userId,
      isFolder: false,
      folderPath,
      ...bucketFilter,
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      token: true,
      originalName: true,
      mimeType: true,
      size: true,
      bucket: true,
      folderPath: true,
      isPublic: true,
      createdAt: true,
      expiresAt: true,
    },
  });

  const baseUrl = req.nextUrl.origin;

  return NextResponse.json({
    success: true,
    bucket: bucket.name,
    folder: folderPath,
    files: files.map((f) => ({
      ...f,
      bucket: f.bucket || bucket.name,
      size: Number(f.size),
      url: `${baseUrl}/api/media/${f.token}`,
      apiDownloadUrl: `${baseUrl}/api/v1/cdn/files/${f.token}`,
    })),
  });
}
