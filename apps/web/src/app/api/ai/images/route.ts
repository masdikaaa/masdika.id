import * as crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  DEFAULT_AI_IMAGE_MODELS,
  applyMarkupPrice,
  getAiGatewayConfig,
  recordAiUsageAndCharge,
  releaseAiBalanceHold,
  reserveAiBalanceHold,
} from '@/lib/ai-gateway';
import {
  AI_MGMT_CORS_HEADERS,
  aiMgmtError,
  aiMgmtOptionsResponse,
  aiMgmtSuccess,
  authenticateAiManagementKey,
  beginIdempotentOperation,
  validateIdempotencyKeyHeader,
} from '@/lib/ai-management-auth';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return aiMgmtOptionsResponse();
}

export async function GET(req: NextRequest) {
  const auth = await authenticateAiManagementKey(req);
  if ('error' in auth) return auth.error;

  const { user } = auth.ctx;
  const limitRaw = Number(req.nextUrl.searchParams.get('limit') || '20');
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, Math.floor(limitRaw))) : 20;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const logs = await prisma.aiUsageLog.findMany({
    where: {
      userId: user.id,
      endpoint: '/v1/images/generations',
      createdAt: { gte: sevenDaysAgo },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return aiMgmtSuccess({
    object: 'list',
    data: logs.map((l) => ({
      id: l.requestId,
      object: 'image.generation',
      model: l.modelId,
      status: l.statusCode >= 200 && l.statusCode < 400 ? 'succeeded' : 'failed',
      created: Math.floor(l.createdAt.getTime() / 1000),
      expires_at: Math.floor(l.createdAt.getTime() / 1000) + 7 * 24 * 60 * 60,
      charge: l.costRp,
      currency: 'IDR',
    })),
    has_more: logs.length === limit,
    last_id: logs[logs.length - 1]?.requestId ?? null,
  });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateAiManagementKey(req);
  if ('error' in auth) return auth.error;

  const { user } = auth.ctx;
  const dryRun = req.nextUrl.searchParams.get('dryRun') === 'true';

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return aiMgmtError('VALIDATION_ERROR', 'Request body must be a JSON object.', 422);
  }

  const modelId = typeof body.model === 'string' ? body.model.trim() : '';
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!modelId || !prompt) {
    return aiMgmtError('VALIDATION_ERROR', 'Fields "model" and "prompt" are required.', 422);
  }

  const imageModel = DEFAULT_AI_IMAGE_MODELS.find((m) => m.modelId === modelId);
  if (!imageModel) {
    return aiMgmtError('MODEL_NOT_FOUND', `Image model '${modelId}' was not found.`, 404);
  }

  const size = typeof body.size === 'string' && body.size.trim() ? body.size.trim() : (imageModel.sizes[0] || '1024x1024');
  if (!imageModel.sizes.includes(size)) {
    return aiMgmtError('INVALID_SIZE', `Size '${size}' is not supported by '${modelId}'.`, 400);
  }

  const n = body.n !== undefined ? Number(body.n) : 1;
  if (!Number.isInteger(n) || n < 1 || n > imageModel.maxN) {
    return aiMgmtError('INVALID_N', `Parameter "n" must be an integer between 1 and ${imageModel.maxN}.`, 400);
  }

  const refImages: string[] = Array.isArray(body.images) ? body.images : [];
  if (refImages.length > imageModel.maxRefImages) {
    return aiMgmtError(
      'UNSUPPORTED_PARAMETER',
      imageModel.maxRefImages === 0
        ? `Model '${modelId}' does not support reference images.`
        : `Model '${modelId}' accepts at most ${imageModel.maxRefImages} reference image(s).`,
      400,
    );
  }
  for (const url of refImages) {
    if (typeof url !== 'string' || !url.startsWith('https://')) {
      return aiMgmtError(
        'INVALID_REQUEST',
        'Every reference image URL must start with https://.',
        400,
      );
    }
  }

  const config = await getAiGatewayConfig();
  const rawPricePerImg = imageModel.sizePrices?.[size] ?? imageModel.basePriceRp;
  const pricePerImage = applyMarkupPrice(rawPricePerImg, config.markupPercent);
  const estimatedPrice = pricePerImage * n;
  const notice = 'Images are kept for 7 days, then deleted. Download the ones you want to keep.';

  if (dryRun) {
    return aiMgmtSuccess({
      dryRun: true,
      currency: 'IDR',
      model: imageModel.modelId,
      name: imageModel.name,
      size,
      n,
      pricePerImage,
      price: estimatedPrice,
      notice,
    });
  }

  if (!config.enabled || !config.upstreamKey) {
    return aiMgmtError('SERVICE_UNAVAILABLE', 'Image generation is temporarily unavailable.', 503);
  }

  const idemHeader = validateIdempotencyKeyHeader(req);
  if ('error' in idemHeader) return idemHeader.error;

  const idem = await beginIdempotentOperation(user.id, 'images', idemHeader.key);
  if (idem.mode === 'in_progress') {
    return aiMgmtError('REQUEST_IN_PROGRESS', 'An image request with this Idempotency-Key is already running.', 409);
  }
  if (idem.mode === 'replay') {
    return NextResponse.json(idem.body, { status: idem.status, headers: AI_MGMT_CORS_HEADERS });
  }

  const requestId = `req_${crypto.randomBytes(12).toString('hex')}`;
  const startedAt = Date.now();
  let heldRp = 0;

  try {
    const holdRp = Math.max(1, Math.ceil(estimatedPrice));
    const reserved = await reserveAiBalanceHold(user.id, holdRp);
    if (!reserved) {
      const errBody = {
        success: false,
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: `Insufficient AI balance. Required ~Rp ${estimatedPrice.toLocaleString('id-ID')}.`,
        },
      };
      await idem.complete(402, errBody);
      return NextResponse.json(errBody, { status: 402, headers: AI_MGMT_CORS_HEADERS });
    }
    heldRp = holdRp;

    const abortController = new AbortController();
    const timeoutTimer = setTimeout(() => {
      abortController.abort(new Error('UPSTREAM_IMAGE_TIMEOUT'));
    }, 60_000);

    let upstreamRes: Response;
    try {
      upstreamRes = await fetch(`${config.upstreamUrl}/v1/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${config.upstreamKey}`,
          'x-api-key': config.upstreamKey,
        },
        body: JSON.stringify({
          model: imageModel.modelId,
          prompt,
          size,
          n,
          ...(refImages.length > 0 ? { image: refImages[0] } : {}),
        }),
        cache: 'no-store',
        signal: abortController.signal,
      });
    } finally {
      clearTimeout(timeoutTimer);
    }

    const data = await upstreamRes.json().catch(() => null);
    if (!upstreamRes.ok || !data) {
      if (heldRp > 0) await releaseAiBalanceHold(user.id, heldRp);
      await recordAiUsageAndCharge({
        userId: user.id,
        apiKeyId: null,
        requestId,
        modelId: imageModel.modelId,
        endpoint: '/v1/images/generations',
        inputTokens: 0,
        cachedTokens: 0,
        outputTokens: 0,
        costRp: 0,
        upstreamCostRp: 0,
        latencyMs: Date.now() - startedAt,
        statusCode: upstreamRes.status || 502,
      });
      await idem.abort();
      return aiMgmtError(
        'UPSTREAM_ERROR',
        data?.error?.message || 'Upstream image generation failed.',
        502,
      );
    }

    const deliveredCount = Array.isArray(data?.data) ? data.data.length : n;
    const actualBaseCost = rawPricePerImg * Math.max(1, deliveredCount);
    const actualCostRp = applyMarkupPrice(actualBaseCost, config.markupPercent);

    await recordAiUsageAndCharge({
      userId: user.id,
      apiKeyId: null,
      requestId,
      modelId: imageModel.modelId,
      endpoint: '/v1/images/generations',
      inputTokens: 0,
      cachedTokens: 0,
      outputTokens: deliveredCount,
      costRp: actualCostRp,
      upstreamCostRp: actualBaseCost,
      latencyMs: Date.now() - startedAt,
      statusCode: 200,
      heldRp,
    });

    const okBody = {
      success: true,
      data: {
        dryRun: false,
        id: data?.id || requestId,
        status: data?.status || 'succeeded',
        model: imageModel.modelId,
        size,
        n: deliveredCount,
        estimatedPrice: actualCostRp,
        currency: 'IDR',
        data: data?.data || [],
        notice,
      },
    };
    await idem.complete(200, okBody);
    return NextResponse.json(okBody, { status: 200, headers: AI_MGMT_CORS_HEADERS });
  } catch (err) {
    if (heldRp > 0) await releaseAiBalanceHold(user.id, heldRp);
    await idem.abort();
    return aiMgmtError('UPSTREAM_ERROR', 'Failed to reach upstream image generator.', 502);
  }
}
