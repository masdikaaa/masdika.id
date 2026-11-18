import * as crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  AI_CORS_HEADERS,
  DEFAULT_AI_IMAGE_MODELS,
  acquireConcurrencySlot,
  aiGatewayError,
  aiGatewayOptionsResponse,
  applyMarkupPrice,
  authenticateAiGatewayKey,
  getAiGatewayConfig,
  isModelAllowedForKey,
  recordAiUsageAndCharge,
  releaseAiBalanceHold,
  releaseConcurrencySlot,
  reserveAiBalanceHold,
} from '@/lib/ai-gateway';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return aiGatewayOptionsResponse();
}

export async function GET(req: NextRequest) {
  const requestId = `req_${crypto.randomBytes(8).toString('hex')}`;
  const auth = await authenticateAiGatewayKey(req, requestId, 'openai');
  if ('error' in auth && auth.error) return auth.error;

  const limitRaw = Number(req.nextUrl.searchParams.get('limit') || '20');
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, Math.floor(limitRaw))) : 20;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const logs = await prisma.aiUsageLog.findMany({
    where: {
      userId: auth.user.id,
      endpoint: '/v1/images/generations',
      createdAt: { gte: sevenDaysAgo },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return NextResponse.json(
    {
      object: 'list',
      data: logs.map((l) => ({
        id: l.requestId,
        object: 'image.generation',
        model: l.modelId,
        status: l.statusCode >= 200 && l.statusCode < 400 ? 'succeeded' : 'failed',
        created: Math.floor(l.createdAt.getTime() / 1000),
      })),
    },
    {
      status: 200,
      headers: {
        ...AI_CORS_HEADERS,
        'x-request-id': requestId,
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const requestId = `req_${crypto.randomBytes(10).toString('hex')}`;
  const startedAt = Date.now();
  const auth = await authenticateAiGatewayKey(req, requestId, 'openai');
  if ('error' in auth && auth.error) return auth.error;

  const config = await getAiGatewayConfig();
  if (!config.enabled || !config.upstreamKey) {
    return aiGatewayError('AI Gateway is currently unavailable.', 'upstream_unavailable', 503, requestId);
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return aiGatewayError('Invalid JSON request body.', 'invalid_request', 400, requestId);
  }

  const modelId = typeof body.model === 'string' ? body.model.trim() : '';
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!modelId || !prompt) {
    return aiGatewayError('Fields "model" and "prompt" are required.', 'invalid_request', 400, requestId);
  }

  if (!isModelAllowedForKey(auth.keyRecord, modelId)) {
    return aiGatewayError(
      `This API key is not permitted to use image model '${modelId}'.`,
      'model_not_allowed',
      403,
      requestId
    );
  }

  const concurrencyKey = `img:${auth.user.id}`;
  const slotAcquired = await acquireConcurrencySlot(concurrencyKey, 6);
  if (!slotAcquired) {
    return aiGatewayError(
      'Too many concurrent image requests (limit 6 in-flight). Please wait for active generations to finish.',
      'concurrency_limit_exceeded',
      429,
      requestId
    );
  }

  let concurrencyReleased = false;
  const releaseSlotOnce = () => {
    if (!concurrencyReleased) {
      concurrencyReleased = true;
      releaseConcurrencySlot(concurrencyKey).catch(() => {});
    }
  };

  const imgSpec = DEFAULT_AI_IMAGE_MODELS.find((m) => m.modelId === modelId);
  const countN = Math.max(1, Math.min(4, Number(body.n) || 1));
  const baseUnitRp =
    imgSpec && body.size === '2048x2048' && modelId === 'seedream-image-v5.0-pro'
      ? 1602
      : imgSpec?.basePriceRp || 500;
  const upstreamCostRp = baseUnitRp * countN;
  const costRp = applyMarkupPrice(upstreamCostRp, config.markupPercent);
  const holdRp = Math.ceil(costRp * 1.25);

  const reserved = await reserveAiBalanceHold(auth.user.id, holdRp);
  if (!reserved) {
    releaseSlotOnce();
    return aiGatewayError(
      'Insufficient balance. Your AI balance cannot cover the image generation hold.',
      'insufficient_balance',
      402,
      requestId
    );
  }

  const abortController = new AbortController();
  const timeoutTimer = setTimeout(() => {
    abortController.abort(new Error('IMAGE_UPSTREAM_TIMEOUT'));
  }, 60_000);

  const onClientAbort = () => {
    abortController.abort(new Error('CLIENT_ABORTED'));
  };
  req.signal?.addEventListener('abort', onClientAbort);

  try {
    const upstreamRes = await fetch(`${config.upstreamUrl}/v1/images/generations`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.upstreamKey}`,
        'x-api-key': config.upstreamKey,
      },
      body: JSON.stringify(body),
      signal: abortController.signal,
    });

    const text = await upstreamRes.text();
    let jsonData: any = null;
    try {
      jsonData = JSON.parse(text);
    } catch {
      jsonData = null;
    }

    if (upstreamRes.ok && jsonData && (jsonData.status === 'succeeded' || Array.isArray(jsonData.data))) {
      const tokens = Number(jsonData.usage?.total_tokens) || (imgSpec?.tokensPerImage || 15000) * countN;
      await recordAiUsageAndCharge({
        userId: auth.user.id,
        apiKeyId: auth.keyRecord.id,
        requestId: jsonData.id || requestId,
        modelId,
        endpoint: '/v1/images/generations',
        inputTokens: 0,
        cachedTokens: 0,
        outputTokens: tokens,
        costRp,
        upstreamCostRp,
        latencyMs: Date.now() - startedAt,
        statusCode: 200,
        heldRp: holdRp,
      }).catch((err) => console.error('[AI_GATEWAY_IMG_CHARGE]', err));
    } else {
      await releaseAiBalanceHold(auth.user.id, holdRp).catch(() => {});
    }

    releaseSlotOnce();

    return new NextResponse(text, {
      status: upstreamRes.status,
      headers: {
        ...AI_CORS_HEADERS,
        'content-type': upstreamRes.headers.get('content-type') || 'application/json',
        'x-request-id': jsonData?.id || requestId,
      },
    });
  } catch (err: any) {
    releaseSlotOnce();
    await releaseAiBalanceHold(auth.user.id, holdRp).catch(() => {});
    if (err?.name === 'AbortError' || String(err?.message || '').includes('TIMEOUT')) {
      return aiGatewayError('Image generation timed out after 60 seconds.', 'upstream_timeout', 504, requestId);
    }
    return aiGatewayError('Upstream AI provider is unreachable.', 'upstream_unreachable', 502, requestId);
  } finally {
    clearTimeout(timeoutTimer);
    req.signal?.removeEventListener('abort', onClientAbort);
  }
}
