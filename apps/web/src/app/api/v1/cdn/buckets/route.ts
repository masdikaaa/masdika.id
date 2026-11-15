import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateCdnApiKey } from '@/lib/cdn-api-auth';
import {
  createCustomerCdnBucket,
  deleteCustomerCdnBucket,
  ensureDefaultCdnBucket,
} from '@/lib/cdn-bucket';

export async function GET(req: NextRequest) {
  const auth = await authenticateCdnApiKey(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  await ensureDefaultCdnBucket(auth.userId);
  const buckets = await prisma.cdnBucket.findMany({
    where: { userId: auth.userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    select: { id: true, name: true, isDefault: true, createdAt: true },
  });

  return NextResponse.json({ success: true, buckets });
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

  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === 'string' ? body.name : '';
  if (!name) {
    return NextResponse.json({ error: 'Bucket name is required' }, { status: 400 });
  }

  try {
    await ensureDefaultCdnBucket(auth.userId);
    const bucket = await createCustomerCdnBucket(auth.userId, name);
    return NextResponse.json({ success: true, bucket }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to create bucket' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await authenticateCdnApiKey(req);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (auth.permission === 'READ_ONLY') {
    return NextResponse.json({ error: 'API key is READ_ONLY' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const name = searchParams.get('name') || '';
  if (!name) {
    return NextResponse.json({ error: 'Bucket name query parameter is required' }, { status: 400 });
  }

  try {
    await deleteCustomerCdnBucket(auth.userId, name);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to delete bucket' }, { status: 400 });
  }
}
