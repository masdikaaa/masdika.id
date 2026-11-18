import * as crypto from 'crypto';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  calculateTokenCostRp,
  ensureAiModelsExist,
  estimatePromptTokensFromBody,
  getAiGatewayConfig,
  recordAiUsageAndCharge,
  releaseAiBalanceHold,
  reserveAiBalanceHold,
} from '@/lib/ai-gateway';
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

export async function POST(req: NextRequest) {
  const auth = await authenticateAiManagementKey(req);
  if ('error' in auth) return auth.error;

  const { user } = auth.ctx;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return aiMgmtError('VALIDATION_ERROR', 'Request body must be a JSON object.', 422);
  }

  const modelId = typeof body.model === 'string' ? body.model.trim() : '';
  const messages = Array.isArray(body.messages) ? body.messages : null;
  if (!modelId || !messages || messages.length === 0) {
    return aiMgmtError('VALIDATION_ERROR', 'Fields "model" and non-empty "messages" array are required.', 422);
  }

  for (const m of messages) {
    if (
      !m ||
      typeof m !== 'object' ||
      (m.role !== 'system' && m.role !== 'user' && m.role !== 'assistant') ||
      typeof m.content !== 'string'
    ) {
      return aiMgmtError(
        'VALIDATION_ERROR',
        'Each message must have role ("system" | "user" | "assistant") and string content.',
        422,
      );
    }
  }

  const maxTokens = body.maxTokens !== undefined ? Number(body.maxTokens) : 2048;
  const temperature = body.temperature !== undefined ? Number(body.temperature) : undefined;
  if (!Number.isFinite(maxTokens) || maxTokens < 1 || maxTokens > 16384) {
    return aiMgmtError('VALIDATION_ERROR', '"maxTokens" must be between 1 and 16384.', 422);
  }

  await ensureAiModelsExist();
  const [config, modelRecord] = await Promise.all([
    getAiGatewayConfig(),
    prisma.aiModel.findFirst({ where: { modelId, isActive: true } }),
  ]);

  if (!modelRecord) {
    return aiMgmtError('MODEL_NOT_FOUND', `Model '${modelId}' was not found or is inactive.`, 404);
  }
  if (!config.enabled || !config.upstreamKey) {
    return aiMgmtError('UPSTREAM_ERROR', 'AI Gateway is currently unavailable.', 502);
  }

  const estimatedInput = estimatePromptTokensFromBody({ messages });
  const { costRp: estimatedCost } = calculateTokenCostRp(
    {
      inputTokens: estimatedInput,
      cachedTokens: 0,
      outputTokens: Math.floor(maxTokens),
    },
    modelRecord,
    config.markupPercent,
  );

  const requestId = `chatcmpl-${crypto.randomBytes(10).toString('hex')}`;
  const startedAt = Date.now();
  let heldRp = 0;

  try {
    const holdRp = Math.max(1, Math.ceil(estimatedCost));
    const reserved = await reserveAiBalanceHold(user.id, holdRp);
    if (!reserved) {
      return aiMgmtError(
        'INSUFFICIENT_BALANCE',
        'AI balance is too low to cover this request.',
        402,
      );
    }
    heldRp = holdRp;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 95_000);

    const upstreamRes = await fetch(`${config.upstreamUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${config.upstreamKey}`,
        'x-api-key': config.upstreamKey,
      },
      body: JSON.stringify({
        model: modelRecord.modelId,
        messages,
        max_completion_tokens: Math.floor(maxTokens),
        ...(temperature !== undefined && Number.isFinite(temperature) ? { temperature } : {}),
        stream: false,
      }),
      signal: controller.signal,
      cache: 'no-store',
    }).finally(() => clearTimeout(timer));

    const data = await upstreamRes.json().catch(() => null);
    if (!upstreamRes.ok || !data) {
      if (heldRp > 0) await releaseAiBalanceHold(user.id, heldRp);
      await recordAiUsageAndCharge({
        userId: user.id,
        apiKeyId: null,
        requestId,
        modelId: modelRecord.modelId,
        endpoint: '/v1/chat/completions',
        inputTokens: 0,
        cachedTokens: 0,
        outputTokens: 0,
        costRp: 0,
        upstreamCostRp: 0,
        latencyMs: Date.now() - startedAt,
        statusCode: upstreamRes.status || 502,
      });
      return aiMgmtError(
        'UPSTREAM_ERROR',
        data?.error?.message || 'Upstream AI provider returned an error.',
        502,
      );
    }

    const usage = data.usage || {};
    const inputTokens = Number(usage.prompt_tokens || 0);
    const cachedTokens = Number(usage.prompt_tokens_details?.cached_tokens || 0);
    const outputTokens = Number(usage.completion_tokens || 0);
    const uncachedInput = Math.max(0, inputTokens - cachedTokens);

    const { costRp, upstreamCostRp } = calculateTokenCostRp(
      {
        inputTokens: uncachedInput,
        cachedTokens,
        outputTokens,
      },
      modelRecord,
      config.markupPercent,
    );

    await recordAiUsageAndCharge({
      userId: user.id,
      apiKeyId: null,
      requestId,
      modelId: modelRecord.modelId,
      endpoint: '/v1/chat/completions',
      inputTokens: uncachedInput,
      cachedTokens,
      outputTokens,
      costRp,
      upstreamCostRp,
      latencyMs: Date.now() - startedAt,
      statusCode: 200,
      heldRp,
    });

    const choice = data.choices?.[0];
    return aiMgmtSuccess({
      id: data.id || requestId,
      model: modelRecord.modelId,
      content: choice?.message?.content ?? '',
      finishReason: choice?.finish_reason ?? 'stop',
      usage: {
        inputTokens: uncachedInput,
        cachedTokens,
        outputTokens,
      },
      chargeRp: costRp,
    });
  } catch (err: any) {
    if (heldRp > 0) await releaseAiBalanceHold(user.id, heldRp);
    if (err?.name === 'AbortError') {
      return aiMgmtError('TIMEOUT', 'Reply took longer than 95 seconds. Ask for a shorter reply with maxTokens.', 504);
    }
    return aiMgmtError('UPSTREAM_ERROR', 'Upstream AI provider is unreachable.', 502);
  }
}
