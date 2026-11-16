import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  aiMgmtError,
  aiMgmtOptionsResponse,
  aiMgmtSuccess,
  authenticateAiManagementKey,
} from '@/lib/ai-management-auth';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return aiMgmtOptionsResponse();
}

export async function GET(req: NextRequest) {
  const auth = await authenticateAiManagementKey(req);
  if ('error' in auth) return auth.error;

  const { user } = auth.ctx;
  const sp = req.nextUrl.searchParams;
  const keyIdParam = sp.get('keyId');
  const modelParam = sp.get('model')?.trim() || undefined;
  const limitRaw = Number(sp.get('limit') || '50');
  const pageRaw = Number(sp.get('page') || '1');

  if (!Number.isFinite(limitRaw) || limitRaw < 1 || limitRaw > 100) {
    return aiMgmtError('VALIDATION_ERROR', 'Query param "limit" must be between 1 and 100.', 422);
  }
  if (!Number.isFinite(pageRaw) || pageRaw < 1) {
    return aiMgmtError('VALIDATION_ERROR', 'Query param "page" must be >= 1.', 422);
  }

  let parsedKeyId: number | undefined;
  if (keyIdParam) {
    const n = Number(keyIdParam);
    if (!Number.isInteger(n) || n <= 0) {
      return aiMgmtError('VALIDATION_ERROR', 'Query param "keyId" must be a positive integer.', 422);
    }
    parsedKeyId = n;
  }

  const pageSize = Math.floor(limitRaw);
  const page = Math.floor(pageRaw);
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const baseWhere = {
    userId: user.id,
    ...(parsedKeyId ? { apiKeyId: parsedKeyId } : {}),
    ...(modelParam ? { modelId: modelParam } : {}),
  };

  const [monthAgg, monthByModel, totalAll, rows] = await Promise.all([
    prisma.aiUsageLog.aggregate({
      where: { ...baseWhere, createdAt: { gte: monthStart } },
      _sum: { costRp: true },
    }),
    prisma.aiUsageLog.groupBy({
      by: ['modelId'],
      where: { ...baseWhere, createdAt: { gte: monthStart } },
      _count: { id: true },
      _sum: {
        costRp: true,
        inputTokens: true,
        cachedTokens: true,
        outputTokens: true,
      },
    }),
    prisma.aiUsageLog.count({ where: baseWhere }),
    prisma.aiUsageLog.findMany({
      where: baseWhere,
      orderBy: { createdAt: 'desc' },
      take: Math.min(pageSize, Math.max(0, 100 - (page - 1) * pageSize)),
      skip: (page - 1) * pageSize,
    }),
  ]);

  return aiMgmtSuccess({
    thisMonth: {
      charge: monthAgg._sum.costRp || 0,
      saved: 0,
      byModel: monthByModel.map((g) => ({
        model: g.modelId,
        requests: g._count.id,
        inputTokens: g._sum.inputTokens || 0,
        cachedTokens: g._sum.cachedTokens || 0,
        outputTokens: g._sum.outputTokens || 0,
        charge: g._sum.costRp || 0,
        saved: 0,
      })),
    },
    requests: rows.map((r) => ({
      requestId: r.requestId,
      createdAt: r.createdAt.toISOString(),
      model: r.modelId,
      format: r.endpoint.includes('anthropic') || r.endpoint.includes('messages') ? 'anthropic' : 'openai',
      endpoint: r.endpoint,
      status: r.statusCode >= 200 && r.statusCode < 400 ? 'ok' : 'error',
      statusCode: r.statusCode,
      aiKeyId: r.apiKeyId,
      inputTokens: r.inputTokens,
      cachedTokens: r.cachedTokens,
      cacheWriteTokens: 0,
      outputTokens: r.outputTokens,
      priceWindow: 'all',
      charge: r.costRp,
      listCharge: r.costRp,
      latencyMs: r.latencyMs,
      promo: null,
    })),
    total: Math.min(totalAll, 100),
    capped: totalAll > 100,
    page,
    pageSize,
    currency: 'IDR',
  });
}
