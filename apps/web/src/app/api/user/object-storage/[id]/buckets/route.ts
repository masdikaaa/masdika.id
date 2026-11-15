import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import {
  deleteCustomerBucketCompletely,
  ensureCustomerBucketExists,
  setCustomerBucketVisibility,
  syncObjectStorageKeyPolicies,
  validateS3BucketName,
} from '@/lib/customer-rustfs';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const user = authResult.user!;
  const { id } = await context.params;
  const serviceId = parseInt(id, 10);
  if (isNaN(serviceId)) return NextResponse.json({ error: 'Invalid service ID' }, { status: 400 });

  const service = await prisma.objectStorageService.findFirst({
    where: { id: serviceId, userId: user.id },
  });
  if (!service || service.status === 'TERMINATED') {
    return NextResponse.json({ error: 'Object Storage service not found' }, { status: 404 });
  }
  if (service.status === 'SUSPENDED') {
    return NextResponse.json({ error: 'Service is suspended. Please top up to create buckets.' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === 'string' ? body.name.trim().toLowerCase() : '';
  const visibility = body?.visibility === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE';

  const validation = validateS3BucketName(name);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const [conflictObj, conflictCdn] = await Promise.all([
    prisma.objectStorageBucket.findUnique({ where: { name } }),
    prisma.cdnBucket.findUnique({ where: { name } }),
  ]);
  if (conflictObj || conflictCdn) {
    return NextResponse.json({ error: `Bucket "${name}" already exists.` }, { status: 409 });
  }

  await ensureCustomerBucketExists(name, visibility);

  const created = await prisma.objectStorageBucket.create({
    data: {
      serviceId: service.id,
      userId: user.id,
      name,
      visibility,
    },
  });

  await syncObjectStorageKeyPolicies(service.id).catch(() => {});

  return NextResponse.json({ success: true, bucket: created }, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const user = authResult.user!;
  const { id } = await context.params;
  const serviceId = parseInt(id, 10);
  if (isNaN(serviceId)) return NextResponse.json({ error: 'Invalid service ID' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === 'string' ? body.name.trim().toLowerCase() : '';
  const visibility = body?.visibility === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE';

  const bucket = await prisma.objectStorageBucket.findFirst({
    where: { serviceId, userId: user.id, name },
  });
  if (!bucket) return NextResponse.json({ error: 'Bucket not found' }, { status: 404 });

  await setCustomerBucketVisibility(bucket.name, visibility);
  const updated = await prisma.objectStorageBucket.update({
    where: { id: bucket.id },
    data: { visibility },
  });

  return NextResponse.json({ success: true, bucket: updated });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }
  const user = authResult.user!;
  const { id } = await context.params;
  const serviceId = parseInt(id, 10);
  if (isNaN(serviceId)) return NextResponse.json({ error: 'Invalid service ID' }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const name = (searchParams.get('name') || '').trim().toLowerCase();
  if (!name) return NextResponse.json({ error: 'Bucket name is required' }, { status: 400 });

  const bucket = await prisma.objectStorageBucket.findFirst({
    where: { serviceId, userId: user.id, name },
  });
  if (!bucket) return NextResponse.json({ error: 'Bucket not found' }, { status: 404 });

  await deleteCustomerBucketCompletely(bucket.name);
  await prisma.objectStorageBucket.delete({ where: { id: bucket.id } });
  await syncObjectStorageKeyPolicies(serviceId).catch(() => {});

  return NextResponse.json({ success: true });
}
