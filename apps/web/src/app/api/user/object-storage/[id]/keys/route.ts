import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { encryptDeterministic } from '@/lib/encryption';
import {
  createRustFSServiceAccount,
  deleteRustFSServiceAccount,
  updateRustFSServiceAccount,
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
    include: { buckets: { select: { name: true } } },
  });
  if (!service || service.status === 'TERMINATED') {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  }
  if (service.status === 'SUSPENDED') {
    return NextResponse.json({ error: 'Service is suspended' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 64) : '';
  if (!name) return NextResponse.json({ error: 'Key name is required' }, { status: 400 });

  const permission = body?.permission === 'READ_ONLY' ? 'READ_ONLY' : 'READ_WRITE';
  const accessKey = `mcs3_${crypto.randomBytes(8).toString('hex')}`;
  const secretKey = crypto.randomBytes(24).toString('hex');
  const bucketNames = service.buckets.map((b) => b.name);

  await createRustFSServiceAccount({
    accessKey,
    secretKey,
    name: `svc-${service.id}-${name}`,
    bucketNames,
    permission,
  });

  const created = await prisma.objectStorageKey.create({
    data: {
      serviceId: service.id,
      userId: user.id,
      name,
      accessKey,
      secretKey: encryptDeterministic(secretKey),
      permission,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      accessKey: true,
      permission: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ success: true, key: created, secretKey }, { status: 201 });
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
  const keyId = parseInt(String(body?.keyId), 10);
  if (isNaN(keyId)) return NextResponse.json({ error: 'Invalid key ID' }, { status: 400 });

  const keyRow = await prisma.objectStorageKey.findFirst({
    where: { id: keyId, serviceId, userId: user.id },
    include: { service: { include: { buckets: { select: { name: true } } } } },
  });
  if (!keyRow) return NextResponse.json({ error: 'Key not found' }, { status: 404 });

  const nextActive = typeof body.isActive === 'boolean' ? body.isActive : keyRow.isActive;
  const nextPerm = body.permission === 'READ_ONLY' ? 'READ_ONLY' : body.permission === 'READ_WRITE' ? 'READ_WRITE' : (keyRow.permission as 'READ_ONLY' | 'READ_WRITE');

  await updateRustFSServiceAccount({
    accessKey: keyRow.accessKey,
    bucketNames: keyRow.service.buckets.map((b) => b.name),
    permission: nextPerm,
    status: nextActive ? 'on' : 'off',
  });

  const updated = await prisma.objectStorageKey.update({
    where: { id: keyRow.id },
    data: { isActive: nextActive, permission: nextPerm },
  });

  return NextResponse.json({ success: true, key: updated });
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
  const keyId = parseInt(searchParams.get('keyId') || '', 10);
  if (isNaN(keyId)) return NextResponse.json({ error: 'Invalid key ID' }, { status: 400 });

  const keyRow = await prisma.objectStorageKey.findFirst({
    where: { id: keyId, serviceId, userId: user.id },
  });
  if (!keyRow) return NextResponse.json({ error: 'Key not found' }, { status: 404 });

  await deleteRustFSServiceAccount(keyRow.accessKey).catch(() => {});
  await prisma.objectStorageKey.delete({ where: { id: keyRow.id } });

  return NextResponse.json({ success: true });
}
