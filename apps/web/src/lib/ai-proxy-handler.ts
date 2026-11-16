import * as crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './prisma';
import {
  aiGatewayError,
  authenticateAiGatewayKey,
  calculateTokenCostRp,
  ensureAiModelsExist,
  getAiGatewayConfig,
  recordAiUsageAndCharge,
} from './ai-gateway';

export type AiProtocolFormat = 'openai' | 'anthropic';

interface ParsedUsage {
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
}

function extractOpenAiUsage(obj: any): ParsedUsage | null {
  const u = obj?.usage;
  if (!u || typeof u !== 'object') return null;
  const prompt = Number(u.prompt_tokens ?? u.input_tokens ?? 0);
  const cached = Number(
    u.prompt_tokens_details?.cached_tokens ??
      u.input_tokens_details?.cached_tokens ??
      u.cached_tokens ??
      u.cache_read_input_tokens ??
      0
  );
  const completion = Number(u.completion_tokens ?? u.output_tokens ?? 0);
  return {
    inputTokens: Math.max(0, prompt - cached),
    cachedTokens: Math.max(0, cached),
    outputTokens: Math.max(0, completion),
  };
}

function mergeAnthropicUsage(acc: ParsedUsage, eventObj: any) {
  const msgUsage = eventObj?.message?.usage;
  const topUsage = eventObj?.usage;
  if (msgUsage) {
    if (msgUsage.input_tokens !== undefined || msgUsage.cache_creation_input_tokens !== undefined) {
      const inp = (Number(msgUsage.input_tokens) || 0) + (Number(msgUsage.cache_creation_input_tokens) || 0);
      acc.inputTokens = Math.max(acc.inputTokens, inp);
    }
    if (msgUsage.cache_read_input_tokens !== undefined) {
      acc.cachedTokens = Math.max(acc.cachedTokens, Number(msgUsage.cache_read_input_tokens) || 0);
    }
    if (msgUsage.output_tokens !== undefined) {
      acc.outputTokens = Math.max(acc.outputTokens, Number(msgUsage.output_tokens) || 0);
    }
  }
  if (topUsage) {
    if (topUsage.input_tokens !== undefined || topUsage.cache_creation_input_tokens !== undefined) {
      const inp = (Number(topUsage.input_tokens) || 0) + (Number(topUsage.cache_creation_input_tokens) || 0);
      acc.inputTokens = Math.max(acc.inputTokens, inp);
    }
    if (topUsage.cache_read_input_tokens !== undefined) {
      acc.cachedTokens = Math.max(acc.cachedTokens, Number(topUsage.cache_read_input_tokens) || 0);
    }
    if (topUsage.output_tokens !== undefined) {
      acc.outputTokens = Math.max(acc.outputTokens, Number(topUsage.output_tokens) || 0);
    }
  }
}

export async function handleAiProxyRequest(
  req: NextRequest,
  format: AiProtocolFormat
): Promise<NextResponse> {
  const requestId = `req_${crypto.randomBytes(10).toString('hex')}`;
  const startedAt = Date.now();
  const endpoint = format === 'openai' ? '/v1/chat/completions' : '/v1/messages';

  const auth = await authenticateAiGatewayKey(req, requestId);
  if ('error' in auth && auth.error) return auth.error;

  const config = await getAiGatewayConfig();
  if (!config.enabled) {
    return aiGatewayError('AI Gateway is currently disabled by administrator.', 'upstream_unavailable', 503, requestId);
  }
  if (!config.upstreamKey) {
    return aiGatewayError('AI Gateway upstream key is not configured.', 'upstream_unavailable', 503, requestId);
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return aiGatewayError('Invalid JSON request body.', 'invalid_request_error', 400, requestId);
  }

  const modelId = typeof body.model === 'string' ? body.model.trim() : '';
  if (!modelId) {
    return aiGatewayError('Field "model" is required.', 'invalid_request_error', 400, requestId);
  }

  await ensureAiModelsExist();
  const model = await prisma.aiModel.findUnique({ where: { modelId } });
  if (!model || !model.isActive) {
    return aiGatewayError(`Model '${modelId}' not found or disabled.`, 'model_not_found', 404, requestId);
  }

  if (format === 'anthropic' && model.openaiOnly) {
    return aiGatewayError(
      'This model accepts only the OpenAI format — send it to /api/ai/v1/chat/completions.',
      'unsupported_format',
      400,
      requestId
    );
  }

  const isStream = Boolean(body.stream);
  const forwardBody =
    format === 'openai' && isStream
      ? { ...body, stream_options: { ...(body.stream_options || {}), include_usage: true } }
      : body;

  const targetUrl = `${config.upstreamUrl}${endpoint}`;
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    authorization: `Bearer ${config.upstreamKey}`,
    'x-api-key': config.upstreamKey,
  };
  const anthropicVersion = req.headers.get('anthropic-version');
  if (anthropicVersion) headers['anthropic-version'] = anthropicVersion;

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(forwardBody),
    });
  } catch (err) {
    console.error('[AI_GATEWAY_UPSTREAM]', err);
    return aiGatewayError('Upstream AI provider is unreachable.', 'upstream_unavailable', 503, requestId);
  }

  if (!upstreamRes.ok) {
    const errText = await upstreamRes.text().catch(() => '');
    const status = upstreamRes.status >= 500 ? 502 : upstreamRes.status;
    return new NextResponse(errText || JSON.stringify({ error: { message: 'Upstream provider error', type: 'upstream_error' } }), {
      status,
      headers: {
        'content-type': upstreamRes.headers.get('content-type') || 'application/json',
        'x-request-id': requestId,
      },
    });
  }

  if (!isStream || !upstreamRes.body) {
    const jsonData = await upstreamRes.json().catch(() => null);
    if (!jsonData) {
      return aiGatewayError('Invalid response from upstream AI provider.', 'upstream_error', 502, requestId);
    }

    const usage: ParsedUsage = { inputTokens: 0, cachedTokens: 0, outputTokens: 0 };
    if (format === 'openai') {
      const parsed = extractOpenAiUsage(jsonData);
      if (parsed) Object.assign(usage, parsed);
    } else {
      mergeAnthropicUsage(usage, { usage: jsonData.usage });
    }

    const { costRp, upstreamCostRp } = calculateTokenCostRp(usage, model, config.markupPercent);
    await recordAiUsageAndCharge({
      userId: auth.user.id,
      apiKeyId: auth.keyRecord.id,
      requestId,
      modelId: model.modelId,
      endpoint,
      inputTokens: usage.inputTokens,
      cachedTokens: usage.cachedTokens,
      outputTokens: usage.outputTokens,
      costRp,
      upstreamCostRp,
      latencyMs: Date.now() - startedAt,
      statusCode: 200,
    }).catch((err) => console.error('[AI_GATEWAY_CHARGE]', err));

    return NextResponse.json(jsonData, {
      status: 200,
      headers: { 'x-request-id': requestId },
    });
  }

  // Streaming SSE pass-through with usage capture
  const reader = upstreamRes.body.getReader();
  const decoder = new TextDecoder();
  const usage: ParsedUsage = { inputTokens: 0, cachedTokens: 0, outputTokens: 0 };
  let sseBuffer = '';
  let charged = false;

  const parseSseLines = (lines: string[]) => {
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const parsed = JSON.parse(payload);
        if (format === 'openai') {
          const u = extractOpenAiUsage(parsed);
          if (u) {
            usage.inputTokens = Math.max(usage.inputTokens, u.inputTokens);
            usage.cachedTokens = Math.max(usage.cachedTokens, u.cachedTokens);
            usage.outputTokens = Math.max(usage.outputTokens, u.outputTokens);
          }
        } else {
          mergeAnthropicUsage(usage, parsed);
        }
      } catch {
        // Ignore partial/non-JSON SSE frames
      }
    }
  };

  const finalizeCharge = async () => {
    if (charged) return;
    charged = true;
    if (sseBuffer.trim()) {
      parseSseLines(sseBuffer.split('\n'));
      sseBuffer = '';
    }
    const { costRp, upstreamCostRp } = calculateTokenCostRp(usage, model, config.markupPercent);
    await recordAiUsageAndCharge({
      userId: auth.user.id,
      apiKeyId: auth.keyRecord.id,
      requestId,
      modelId: model.modelId,
      endpoint,
      inputTokens: usage.inputTokens,
      cachedTokens: usage.cachedTokens,
      outputTokens: usage.outputTokens,
      costRp,
      upstreamCostRp,
      latencyMs: Date.now() - startedAt,
      statusCode: 200,
    }).catch((err) => console.error('[AI_GATEWAY_STREAM_CHARGE]', err));
  };

  const stream = new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        await finalizeCharge();
        controller.close();
        return;
      }

      controller.enqueue(value);
      sseBuffer += decoder.decode(value, { stream: true });
      const lines = sseBuffer.split('\n');
      sseBuffer = lines.pop() ?? '';
      parseSseLines(lines);
    },
    async cancel() {
      await reader.cancel().catch(() => {});
      await finalizeCharge();
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      'content-type': upstreamRes.headers.get('content-type') || 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-request-id': requestId,
    },
  });
}
