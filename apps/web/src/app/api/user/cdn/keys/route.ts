import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { hasActiveSubscription } from '@/lib/subscription';
import { generateCdnApiKey } from '@/lib/cdn-api-auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { searchParams } = new URL(req.url);
    const rawSubId = searchParams.get('subscriptionId');
    const subscriptionId = rawSubId ? parseInt(rawSubId, 10) : undefined;

    const keys = await prisma.cdnApiKey.findMany({
      where: {
        userId: auth.userId!,
        ...(subscriptionId && !isNaN(subscriptionId) ? { subscriptionId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permission: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ success: true, keys });
  } catch (error) {
    console.error('List CDN API keys error:', error);
    return NextResponse.json({ error: 'Failed to load CDN API keys' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const userId = auth.userId!;
    const isAdmin = auth.user?.role === 'ADMIN' || auth.user?.role === 'SUPER_ADMIN';
    if (!isAdmin) {
      const active = await hasActiveSubscription(userId, 'CDN');
      if (!active) {
        return NextResponse.json({ error: 'Active File CDN subscription required.' }, { status: 403 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 64) : '';
    if (!name) {
      return NextResponse.json({ error: 'API key name is required' }, { status: 400 });
    }

    const permission = body?.scope === 'READ_ONLY' || body?.permission === 'READ_ONLY' ? 'READ_ONLY' : 'READ_WRITE';
    const rawSubId = body?.subscriptionId;
    const subscriptionId = rawSubId ? parseInt(String(rawSubId), 10) : undefined;
    const { rawKey, keyHash, keyPrefix } = generateCdnApiKey();

    const created = await prisma.cdnApiKey.create({
      data: {
        userId,
        subscriptionId: subscriptionId && !isNaN(subscriptionId) ? subscriptionId : null,
        name,
        keyPrefix,
        keyHash,
        permission,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permission: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, key: created, rawKey });
  } catch (error) {
    console.error('Create CDN API key error:', error);
    return NextResponse.json({ error: 'Failed to create CDN API key' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get('id') || '', 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid API key ID' }, { status: 400 });
    }

    const existing = await prisma.cdnApiKey.findFirst({
      where: { id, userId: auth.userId! },
    });
    if (!existing) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    await prisma.cdnApiKey.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete CDN API key error:', error);
    return NextResponse.json({ error: 'Failed to delete CDN API key' }, { status: 500 });
  }
}
