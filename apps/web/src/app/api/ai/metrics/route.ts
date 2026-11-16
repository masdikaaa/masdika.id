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

function toWibBucket(date: Date, bucket: 'hour' | 'day'): string {
  // Shift UTC by +7h to format WIB cleanly
  const wib = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const iso = wib.toISOString();
  return bucket === 'hour' ? iso.slice(0, 13) : iso.slice(0, 10);
}

export async function GET(req: NextRequest) {
  const auth = await authenticateAiManagementKey(req);
  if ('error' in auth) return auth.error;

  const { user } = auth.ctx;
  const sp = req.nextUrl.searchParams;
  const range = (sp.get('range') || '7d').trim();
  const keyIdParam = sp.get('keyId');
  const modelParam = sp.get('model')?.trim() || undefined;

  if (range !== '24h' && range !== '7d' && range !== '30d') {
    return aiMgmtError('VALIDATION_ERROR', 'Query param "range" must be 24h, 7d, or 30d.', 422);
  }

  let parsedKeyId: number | undefined;
  if (keyIdParam) {
    const n = Number(keyIdParam);
    if (!Number.isInteger(n) || n <= 0) {
      return aiMgmtError('VALIDATION_ERROR', 'Query param "keyId" must be a positive integer.', 422);
    }
    parsedKeyId = n;
  }

  const now = new Date();
  const durationMs =
    range === '24h'
      ? 24 * 60 * 60 * 1000
      : range === '7d'
      ? 7 * 24 * 60 * 60 * 1000
      : 30 * 24 * 60 * 60 * 1000;
  const bucket: 'hour' | 'day' = range === '24h' ? 'hour' : 'day';
  const since = new Date(now.getTime() - durationMs);
  const prevSince = new Date(since.getTime() - durationMs);

  const filterWhere = {
    userId: user.id,
    ...(parsedKeyId ? { apiKeyId: parsedKeyId } : {}),
    ...(modelParam ? { modelId: modelParam } : {}),
  };

  const [currentLogs, prevAgg] = await Promise.all([
    prisma.aiUsageLog.findMany({
      where: { ...filterWhere, createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
      select: {
        modelId: true,
        inputTokens: true,
        cachedTokens: true,
        outputTokens: true,
        costRp: true,
        latencyMs: true,
        statusCode: true,
        createdAt: true,
      },
    }),
    prisma.aiUsageLog.aggregate({
      where: { ...filterWhere, createdAt: { gte: prevSince, lt: since } },
      _count: { id: true },
      _sum: { costRp: true },
    }),
  ]);

  let ok = 0;
  let errors = 0;
  let charge = 0;
  let inputTokens = 0;
  let cachedTokens = 0;
  let outputTokens = 0;
  let latencySum = 0;
  const latencies: number[] = [];

  const seriesMap = new Map<
    string,
    {
      t: string;
      requests: number;
      errors: number;
      charge: number;
      inputTokens: number;
      cachedTokens: number;
      outputTokens: number;
      latencySum: number;
    }
  >();

  const modelMap = new Map<
    string,
    { model: string; requests: number; charge: number; saved: number; tokens: number }
  >();

  for (const row of currentLogs) {
    const isOk = row.statusCode >= 200 && row.statusCode < 400;
    if (isOk) ok += 1;
    else errors += 1;

    charge += row.costRp;
    inputTokens += row.inputTokens;
    cachedTokens += row.cachedTokens;
    outputTokens += row.outputTokens;
    latencySum += row.latencyMs;
    latencies.push(row.latencyMs);

    const bKey = toWibBucket(row.createdAt, bucket);
    const b = seriesMap.get(bKey) || {
      t: bKey,
      requests: 0,
      errors: 0,
      charge: 0,
      inputTokens: 0,
      cachedTokens: 0,
      outputTokens: 0,
      latencySum: 0,
    };
    b.requests += 1;
    if (!isOk) b.errors += 1;
    b.charge += row.costRp;
    b.inputTokens += row.inputTokens;
    b.cachedTokens += row.cachedTokens;
    b.outputTokens += row.outputTokens;
    b.latencySum += row.latencyMs;
    seriesMap.set(bKey, b);

    const m = modelMap.get(row.modelId) || {
      model: row.modelId,
      requests: 0,
      charge: 0,
      saved: 0,
      tokens: 0,
    };
    m.requests += 1;
    m.charge += row.costRp;
    m.tokens += row.inputTokens + row.cachedTokens + row.outputTokens;
    modelMap.set(row.modelId, m);
  }

  latencies.sort((a, b) => a - b);
  const p95Idx = latencies.length > 0 ? Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95)) : 0;
  const totalRequests = currentLogs.length;
  const totalInputAll = inputTokens + cachedTokens;

  return aiMgmtSuccess({
    range,
    bucket,
    timezone: 'Asia/Jakarta',
    currency: 'IDR',
    totals: {
      requests: totalRequests,
      ok,
      errors,
      cancelled: 0,
      successRate: totalRequests > 0 ? Number((ok / totalRequests).toFixed(4)) : 1,
      charge,
      saved: 0,
      promoRequests: 0,
      inputTokens,
      cachedTokens,
      outputTokens,
      cacheHitRate: totalInputAll > 0 ? Number((cachedTokens / totalInputAll).toFixed(4)) : 0,
      avgLatencyMs: totalRequests > 0 ? Math.round(latencySum / totalRequests) : 0,
      p95LatencyMs: latencies[p95Idx] || 0,
    },
    previous: {
      requests: prevAgg._count.id || 0,
      charge: prevAgg._sum.costRp || 0,
    },
    series: Array.from(seriesMap.values()).map((b) => ({
      t: b.t,
      requests: b.requests,
      errors: b.errors,
      charge: b.charge,
      inputTokens: b.inputTokens,
      cachedTokens: b.cachedTokens,
      outputTokens: b.outputTokens,
      avgLatencyMs: b.requests > 0 ? Math.round(b.latencySum / b.requests) : 0,
    })),
    byModel: Array.from(modelMap.values()).sort((a, b) => b.charge - a.charge),
  });
}
