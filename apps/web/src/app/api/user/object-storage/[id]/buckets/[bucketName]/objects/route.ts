import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import {
  createS3PresignedUrl,
  deleteFromCustomerRustFS,
  getCustomerRustFSConfig,
  getObjectStorageServiceUsageBytes,
  listCustomerBucketObjects,
  moveCustomerRustFSObject,
  uploadBufferToCustomerRustFS,
} from '@/lib/customer-rustfs';

const MAX_CONSOLE_UPLOAD_BYTES = 100 * 1024 * 1024; // 100MB via browser console (larger via S3 CLI/SDK directly)

function sanitizeObjectKey(key: string): string {
  return key.replace(/^\/+/, '').replace(/\.\.\//g, '').trim();
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string; bucketName: string }> }
) {
  const authResult = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const user = authResult.user!;
  const { id, bucketName } = await context.params;
  const serviceId = parseInt(id, 10);
  if (isNaN(serviceId)) return NextResponse.json({ error: 'Invalid service ID' }, { status: 400 });

  const bucket = await prisma.objectStorageBucket.findFirst({
    where: { serviceId, userId: user.id, name: bucketName },
    include: { service: true },
  });
  if (!bucket || bucket.service.status === 'TERMINATED') {
    return NextResponse.json({ error: 'Bucket not found' }, { status: 404 });
  }
  if (bucket.service.status === 'SUSPENDED') {
    return NextResponse.json({ error: 'Service is suspended. Top up balance to access objects.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const presignKey = searchParams.get('presignKey');
  const cfg = await getCustomerRustFSConfig();

  if (presignKey) {
    const cleanKey = sanitizeObjectKey(presignKey);
    if (!cleanKey) return NextResponse.json({ error: 'Invalid object key' }, { status: 400 });
    const endpoint = cfg.publicEndpoint || cfg.endpoint;
    const url = createS3PresignedUrl({
      publicEndpoint: endpoint,
      accessKey: cfg.accessKey,
      secretKey: cfg.secretKey,
      bucket: bucket.name,
      key: cleanKey,
      method: 'GET',
      expiresIn: 900,
    });
    return NextResponse.json({ success: true, url, expiresIn: 900 });
  }

  const prefix = sanitizeObjectKey(searchParams.get('prefix') || '');
  const list = await listCustomerBucketObjects(bucket.name, prefix, '/');

  return NextResponse.json({
    success: true,
    bucket: bucket.name,
    visibility: bucket.visibility,
    publicEndpoint: cfg.publicEndpoint,
    prefix,
    folders: list.folders,
    objects: list.objects,
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string; bucketName: string }> }
) {
  const authResult = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const user = authResult.user!;
  const { id, bucketName } = await context.params;
  const serviceId = parseInt(id, 10);
  if (isNaN(serviceId)) return NextResponse.json({ error: 'Invalid service ID' }, { status: 400 });

  const service = await prisma.objectStorageService.findFirst({
    where: { id: serviceId, userId: user.id },
    include: { buckets: true },
  });
  if (!service || service.status === 'TERMINATED') {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  }
  if (service.status === 'SUSPENDED') {
    return NextResponse.json({ error: 'Service is suspended' }, { status: 403 });
  }

  const bucket = service.buckets.find((b) => b.name === bucketName);
  if (!bucket) return NextResponse.json({ error: 'Bucket not found' }, { status: 404 });

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file in formData' }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_CONSOLE_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: 'Browser console upload limit is 100 MB. Use S3 CLI/SDK for multi-GB uploads.' },
      { status: 413 }
    );
  }

  const { totalBytes: usedBytes } = await getObjectStorageServiceUsageBytes(service.buckets.map((b) => b.name));
  const quotaBytes = service.storageGb * 1024 * 1024 * 1024;
  if (usedBytes + buf.length > quotaBytes) {
    return NextResponse.json(
      { error: `Storage quota exceeded (${service.storageGb} GB). Scale capacity to upload more.` },
      { status: 403 }
    );
  }

  const prefix = sanitizeObjectKey(String(form.get('prefix') || ''));
  const cleanName = sanitizeObjectKey(file.name || 'object.bin');
  const key = prefix ? `${prefix.replace(/\/+$/, '')}/${cleanName}` : cleanName;

  const lowerName = cleanName.toLowerCase();
  const rawMime = (file.type || 'application/octet-stream').toLowerCase();
  const isActiveWebContent =
    /\.(html?|xhtml|svgz?|xml|shtml|mhtml)$/.test(lowerName) ||
    rawMime.includes('html') ||
    rawMime.includes('svg') ||
    rawMime.includes('xml');
  const safeContentType = isActiveWebContent ? 'application/octet-stream' : (file.type || 'application/octet-stream');

  const ok = await uploadBufferToCustomerRustFS(
    bucket.name,
    key,
    buf,
    safeContentType
  );
  if (!ok) {
    return NextResponse.json({ error: 'Failed to upload object to RustFS' }, { status: 502 });
  }

  return NextResponse.json({ success: true, key, size: buf.length }, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string; bucketName: string }> }
) {
  const authResult = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const user = authResult.user!;
  const { id, bucketName } = await context.params;
  const serviceId = parseInt(id, 10);
  if (isNaN(serviceId)) return NextResponse.json({ error: 'Invalid service ID' }, { status: 400 });

  const bucket = await prisma.objectStorageBucket.findFirst({
    where: { serviceId, userId: user.id, name: bucketName },
  });
  if (!bucket) return NextResponse.json({ error: 'Bucket not found' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const key = sanitizeObjectKey(searchParams.get('key') || '');
  if (!key) return NextResponse.json({ error: 'Object key is required' }, { status: 400 });

  await deleteFromCustomerRustFS(bucket.name, key);
  return NextResponse.json({ success: true, key });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string; bucketName: string }> }
) {
  const authResult = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const user = authResult.user!;
  const { id, bucketName } = await context.params;
  const serviceId = parseInt(id, 10);
  if (isNaN(serviceId)) return NextResponse.json({ error: 'Invalid service ID' }, { status: 400 });

  const service = await prisma.objectStorageService.findFirst({
    where: { id: serviceId, userId: user.id },
    include: { buckets: true },
  });
  if (!service || service.status === 'TERMINATED') {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  }
  if (service.status === 'SUSPENDED') {
    return NextResponse.json({ error: 'Service is suspended' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const cleanKey = sanitizeObjectKey(String(body.key || ''));
  const targetBucketName = String(body.targetBucket || '').trim();
  const cleanTargetKey = sanitizeObjectKey(String(body.targetKey || cleanKey));

  if (!cleanKey || !targetBucketName || !cleanTargetKey) {
    return NextResponse.json({ error: 'key and targetBucket are required' }, { status: 400 });
  }

  const sourceBucket = service.buckets.find((b) => b.name === bucketName);
  const targetBucket = service.buckets.find((b) => b.name === targetBucketName);
  if (!sourceBucket || !targetBucket) {
    return NextResponse.json({ error: 'Source or target bucket not found' }, { status: 404 });
  }
  if (sourceBucket.name === targetBucket.name && cleanKey === cleanTargetKey) {
    return NextResponse.json({ error: 'Source and destination are identical' }, { status: 400 });
  }

  const ok = await moveCustomerRustFSObject(
    sourceBucket.name,
    cleanKey,
    targetBucket.name,
    cleanTargetKey
  );
  if (!ok) {
    return NextResponse.json({ error: 'Failed to move object in RustFS' }, { status: 502 });
  }

  return NextResponse.json({
    success: true,
    sourceBucket: sourceBucket.name,
    targetBucket: targetBucket.name,
    key: cleanTargetKey,
  });
}
