import * as crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './prisma';
import { redis } from './redis';
import { checkRateLimit } from './rate-limit';

export const AI_MGMT_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-API-Key, Idempotency-Key',
};

export interface AiTopupPack {
  id: string;
  name: string;
  amount: number;
  bonus: number;
}

export const AI_TOPUP_PACKS: AiTopupPack[] = [
  { id: 'pack-50k', name: 'Rp 50.000', amount: 50000, bonus: 0 },
  { id: 'pack-100k', name: 'Rp 100.000', amount: 100000, bonus: 0 },
  { id: 'pack-250k', name: 'Rp 250.000', amount: 250000, bonus: 0 },
  { id: 'pack-500k', name: 'Rp 500.000', amount: 500000, bonus: 0 },
  { id: 'pack-1m', name: 'Rp 1.000.000', amount: 1000000, bonus: 0 },
];

export const AI_MGMT_MIN_TOPUP = 5000;

export function aiMgmtSuccess(data: unknown, status = 200) {
  return NextResponse.json(
    { success: true, data },
    { status, headers: AI_MGMT_CORS_HEADERS },
  );
}

export function aiMgmtError(code: string, message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
      },
    },
    { status, headers: AI_MGMT_CORS_HEADERS },
  );
}

export function aiMgmtOptionsResponse() {
  return new NextResponse(null, { status: 204, headers: AI_MGMT_CORS_HEADERS });
}

export function extractManagementApiKey(req: NextRequest): string | null {
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

export interface AuthenticatedMgmtContext {
  apiKey: {
    id: number;
    name: string | null;
    userId: number;
    service: string | null;
    status: string;
  };
  user: {
    id: number;
    email: string;
    name: string | null;
    balance: number;
    aiBalance: number;
    aiAutoTopupEnabled: boolean;
    aiAutoTopupThreshold: number;
    aiAutoTopupAmount: number;
    isSuspended: boolean;
  };
}

export async function authenticateAiManagementKey(
  req: NextRequest,
  options: { requireWholeAccount?: boolean } = {},
): Promise<{ ctx: AuthenticatedMgmtContext } | { error: NextResponse }> {
  const rawKey = extractManagementApiKey(req);
  if (!rawKey) {
    return {
      error: aiMgmtError(
        'NO_API_KEY',
        'Missing API key. Send Authorization: Bearer masdika_... or x-api-key header.',
        401,
      ),
    };
  }

  // AI Gateway inference keys (masdika_ai_...) are explicitly rejected on Management routes
  if (rawKey.startsWith('masdika_ai_')) {
    return {
      error: aiMgmtError(
        'INVALID_API_KEY',
        'AI Gateway keys (masdika_ai_...) are not accepted on Management API routes. Use a Masdika API Key (masdika_...).',
        401,
      ),
    };
  }

  const keyRecord = await prisma.apiKey.findUnique({
    where: { key: rawKey },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          balance: true,
          aiBalance: true,
          aiAutoTopupEnabled: true,
          aiAutoTopupThreshold: true,
          aiAutoTopupAmount: true,
          isSuspended: true,
        },
      },
    },
  });

  if (!keyRecord) {
    return {
      error: aiMgmtError('INVALID_API_KEY', 'Invalid Masdika API key.', 401),
    };
  }

  if (keyRecord.status !== 'ACTIVE' || keyRecord.user.isSuspended) {
    return {
      error: aiMgmtError('API_KEY_EXPIRED', 'This API key or account is suspended or inactive.', 401),
    };
  }

  const svc = (keyRecord.service || 'ALL').toUpperCase();
  if (svc !== 'ALL' && svc !== 'AI') {
    return {
      error: aiMgmtError(
        'SCOPE_NOT_ALLOWED',
        `This API key is scoped to '${svc}' and does not have AI API enabled.`,
        403,
      ),
    };
  }

  if (options.requireWholeAccount && svc !== 'ALL' && svc !== 'AI') {
    return {
      error: aiMgmtError(
        'ACCOUNT_KEY_REQUIRED',
        'A whole-account or AI-enabled Masdika API key is required for this endpoint.',
        403,
      ),
    };
  }

  // 60 requests / second per key
  const allowed = await checkRateLimit('AI_MGMT_API', String(keyRecord.id), 60, 1);
  if (!allowed) {
    return {
      error: aiMgmtError('RATE_LIMITED', 'Rate limit exceeded (max 60 requests/second per key).', 429),
    };
  }

  // Non-blocking usage touch
  prisma.apiKey
    .update({
      where: { id: keyRecord.id },
      data: { usageCount: { increment: 1 }, lastUsed: new Date() },
    })
    .catch(() => {});

  return {
    ctx: {
      apiKey: {
        id: keyRecord.id,
        name: keyRecord.name,
        userId: keyRecord.userId,
        service: keyRecord.service,
        status: keyRecord.status,
      },
      user: keyRecord.user,
    },
  };
}

// ============================================================================
// IDEMPOTENCY ENGINE (Redis-backed with in-memory fallback)
// ============================================================================

const memIdempotency = new Map<string, { state: 'in_progress' | 'done'; status?: number; body?: unknown; expiresAt: number }>();

export function validateIdempotencyKeyHeader(
  req: NextRequest,
): { key: string } | { error: NextResponse } {
  const raw = req.headers.get('idempotency-key')?.trim();
  if (!raw) {
    return {
      error: aiMgmtError(
        'IDEMPOTENCY_KEY_REQUIRED',
        'Idempotency-Key header is required for non-dry-run mutating requests.',
        400,
      ),
    };
  }
  if (!/^[A-Za-z0-9_.:-]{8,128}$/.test(raw)) {
    return {
      error: aiMgmtError(
        'INVALID_IDEMPOTENCY_KEY',
        'Idempotency-Key must be 8 to 128 characters using letters, digits, or _ . : -',
        400,
      ),
    };
  }
  return { key: raw };
}

export async function beginIdempotentOperation(
  userId: number,
  scope: string,
  idempotencyKey: string,
): Promise<
  | { mode: 'proceed'; complete: (status: number, body: unknown) => Promise<void>; abort: () => Promise<void> }
  | { mode: 'replay'; status: number; body: unknown }
  | { mode: 'in_progress' }
> {
  const cacheKey = `ai_mgmt_idem:${userId}:${scope}:${crypto.createHash('sha256').update(idempotencyKey).digest('hex')}`;

  if (redis) {
    try {
      const locked = await redis.set(cacheKey, JSON.stringify({ state: 'in_progress' }), 'EX', 86400, 'NX');
      if (!locked) {
        const existingRaw = await redis.get(cacheKey);
        if (existingRaw) {
          const parsed = JSON.parse(existingRaw);
          if (parsed.state === 'done') {
            return { mode: 'replay', status: parsed.status || 200, body: parsed.body };
          }
          return { mode: 'in_progress' };
        }
      }
      return {
        mode: 'proceed',
        complete: async (status: number, body: unknown) => {
          await redis?.set(cacheKey, JSON.stringify({ state: 'done', status, body }), 'EX', 86400).catch(() => {});
        },
        abort: async () => {
          await redis?.del(cacheKey).catch(() => {});
        },
      };
    } catch {
      // Fall through to in-memory fallback
    }
  }

  const now = Date.now();
  const existing = memIdempotency.get(cacheKey);
  if (existing && existing.expiresAt > now) {
    if (existing.state === 'done') {
      return { mode: 'replay', status: existing.status || 200, body: existing.body };
    }
    return { mode: 'in_progress' };
  }

  memIdempotency.set(cacheKey, { state: 'in_progress', expiresAt: now + 86400_000 });
  return {
    mode: 'proceed',
    complete: async (status: number, body: unknown) => {
      memIdempotency.set(cacheKey, { state: 'done', status, body, expiresAt: Date.now() + 86400_000 });
    },
    abort: async () => {
      memIdempotency.delete(cacheKey);
    },
  };
}
