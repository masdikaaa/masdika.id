import * as crypto from 'crypto';
import { NextRequest } from 'next/server';
import { prisma } from './prisma';
import { getSubscriptionInfo } from './subscription';

export function hashCdnApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

export function generateCdnApiKey(): { rawKey: string; keyHash: string; keyPrefix: string } {
  const randomPart = crypto.randomBytes(24).toString('hex');
  const rawKey = `mc_cdn_${randomPart}`;
  const keyHash = hashCdnApiKey(rawKey);
  const keyPrefix = rawKey.slice(0, 14);
  return { rawKey, keyHash, keyPrefix };
}

export function extractBearerOrApiKey(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }
  const xApiKey = req.headers.get('x-api-key');
  if (xApiKey && xApiKey.trim()) {
    return xApiKey.trim();
  }
  return null;
}

export async function authenticateCdnApiKey(req: NextRequest) {
  const rawKey = extractBearerOrApiKey(req);
  if (!rawKey) {
    return { error: 'Missing API key. Provide Authorization: Bearer <key> or x-api-key header.', status: 401 as const };
  }

  const keyHash = hashCdnApiKey(rawKey);
  const record = await prisma.cdnApiKey.findUnique({
    where: { keyHash },
    include: {
      user: {
        select: { id: true, role: true, isSuspended: true },
      },
    },
  });

  if (!record || !record.isActive) {
    return { error: 'Invalid or revoked File CDN API key.', status: 401 as const };
  }

  if (record.user.isSuspended) {
    return { error: 'Account is suspended.', status: 403 as const };
  }

  const isAdmin = record.user.role === 'ADMIN' || record.user.role === 'SUPER_ADMIN';
  let isSuspended = false;
  if (!isAdmin) {
    const subInfo = await getSubscriptionInfo(record.userId, 'CDN');
    if (!subInfo.hasSubscription) {
      return { error: 'Active File CDN subscription required.', status: 403 as const };
    }
    isSuspended = subInfo.isSuspended;
  }

  prisma.cdnApiKey
    .update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  return {
    userId: record.userId,
    keyId: record.id,
    permission: record.permission,
    role: record.user.role,
    isSuspended,
  };
}
