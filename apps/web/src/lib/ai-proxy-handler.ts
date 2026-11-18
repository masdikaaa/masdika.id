import * as crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './prisma';
import {
  AI_CORS_HEADERS,
  acquireConcurrencySlot,
  aiGatewayError,
  aiUpstreamCircuitBreaker,
  authenticateAiGatewayKey,
  calculateTokenCostRp,
  ensureAiModelsExist,
  estimatePromptTokensFromBody,
  getAiGatewayConfig,
  getAiModelCached,
  isModelAllowedForKey,
  parseContextWindowTokens,
  recordAiUsageAndCharge,
  releaseAiBalanceHold,
  releaseConcurrencySlot,
  reserveAiBalanceHold,
} from './ai-gateway';

export type AiProtocolFormat = 'openai' | 'responses' | 'anthropic';

const MAX_BODY_BYTES = 8 * 1024 * 1024; // 8 MB per docs

interface ParsedUsage {
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
}

function extractOpenAiUsage(obj: any): ParsedUsage | null {
  const u = obj?.usage ?? obj?.response?.usage;
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
      const inp =
        (Number(msgUsage.input_tokens) || 0) +
        (Number(msgUsage.cache_creation_input_tokens) || 0);
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
      const inp =
        (Number(topUsage.input_tokens) || 0) +
        (Number(topUsage.cache_creation_input_tokens) || 0);
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

function extractStreamDeltaChars(parsed: any): number {
  let chars = 0;
  // OpenAI Chat Completions delta
  if (Array.isArray(parsed?.choices)) {
    for (const c of parsed.choices) {
      const d = c?.delta;
      if (typeof d?.content === 'string') chars += d.content.length;
      if (typeof d?.reasoning_content === 'string') chars += d.reasoning_content.length;
      if (Array.isArray(d?.tool_calls)) {
        for (const tc of d.tool_calls) {
          if (typeof tc?.function?.arguments === 'string') chars += tc.function.arguments.length;
        }
      }
    }
  }
  // OpenAI Responses API delta
  if (typeof parsed?.delta === 'string') {
    chars += parsed.delta.length;
  } else if (parsed?.delta && typeof parsed.delta === 'object') {
    if (typeof parsed.delta.text === 'string') chars += parsed.delta.text.length;
    if (typeof parsed.delta.thinking === 'string') chars += parsed.delta.thinking.length;
    if (typeof parsed.delta.partial_json === 'string') chars += parsed.delta.partial_json.length;
  }
  return chars;
}

function buildGatewayResponseHeaders(
  upstreamRes: Response,
  requestId: string,
  fallbackModelId: string
): Record<string, string> {
  const out: Record<string, string> = {
    ...AI_CORS_HEADERS,
    'x-request-id': requestId,
    'x-masdika-model': upstreamRes.headers.get('x-helipod-model') || fallbackModelId,
  };
  const sunset = upstreamRes.headers.get('x-helipod-model-sunset');
  if (sunset) out['x-masdika-model-sunset'] = sunset;
  const replacement = upstreamRes.headers.get('x-helipod-model-replacement');
  if (replacement) out['x-masdika-model-replacement'] = replacement;
  const retryAfter = upstreamRes.headers.get('retry-after');
  if (retryAfter) out['retry-after'] = retryAfter;
  return out;
}

export async function handleAiProxyRequest(
  req: NextRequest,
  format: AiProtocolFormat
): Promise<NextResponse> {
  const requestId = `req_${crypto.randomBytes(10).toString('hex')}`;
  const startedAt = Date.now();
  const errorFormat: 'openai' | 'anthropic' = format === 'anthropic' ? 'anthropic' : 'openai';
  const endpoint =
    format === 'openai'
      ? '/v1/chat/completions'
      : format === 'responses'
      ? '/v1/responses'
      : '/v1/messages';

  // Enforce 8 MB body size limit per docs
  const contentLength = Number(req.headers.get('content-length') || '0');
  if (contentLength > MAX_BODY_BYTES) {
    return aiGatewayError(
      'Request body exceeds the 8 MB limit.',
      'request_too_large',
      413,
      requestId,
      errorFormat
    );
  }

  const auth = await authenticateAiGatewayKey(req, requestId, errorFormat);
  if ('error' in auth && auth.error) return auth.error;

  const config = await getAiGatewayConfig();
  if (!config.enabled) {
    return aiGatewayError(
      'AI Gateway is currently disabled by administrator.',
      'upstream_unavailable',
      503,
      requestId,
      errorFormat
    );
  }
  if (!config.upstreamKey) {
    return aiGatewayError(
      'AI Gateway upstream key is not configured.',
      'upstream_unavailable',
      503,
      requestId,
      errorFormat
    );
  }

  const rawBodyText = await req.text().catch(() => '');
  if (Buffer.byteLength(rawBodyText, 'utf8') > MAX_BODY_BYTES) {
    return aiGatewayError(
      'Request body exceeds the 8 MB limit.',
      'request_too_large',
      413,
      requestId,
      errorFormat
    );
  }

  let body: any = null;
  try {
    body = JSON.parse(rawBodyText);
  } catch {
    body = null;
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return aiGatewayError(
      'Invalid JSON request body.',
      'invalid_request',
      400,
      requestId,
      errorFormat
    );
  }

  const modelId = typeof body.model === 'string' ? body.model.trim() : '';
  if (!modelId) {
    return aiGatewayError(
      'Field "model" is required.',
      'invalid_request',
      400,
      requestId,
      errorFormat
    );
  }

  // Handle 9Router / client connection-probe placeholder "model-id" after key & balance auth succeeds
  if (modelId === 'model-id') {
    const probeBody =
      format === 'anthropic'
        ? {
            id: requestId,
            type: 'message',
            role: 'assistant',
            model: 'model-id',
            content: [{ type: 'text', text: 'ok' }],
            stop_reason: 'end_turn',
            usage: { input_tokens: 0, output_tokens: 0 },
          }
        : format === 'responses'
        ? {
            id: requestId,
            object: 'response',
            status: 'completed',
            model: 'model-id',
            output_text: 'ok',
            usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
          }
        : {
            id: requestId,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: 'model-id',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'ok' },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          };
    return NextResponse.json(probeBody, {
      status: 200,
      headers: { ...AI_CORS_HEADERS, 'x-request-id': requestId },
    });
  }

  // Circuit Breaker check to fail fast if upstream provider has an active outage
  if (aiUpstreamCircuitBreaker.getState() === 'OPEN') {
    return aiGatewayError(
      'Upstream AI provider is temporarily experiencing an outage. Protected by Circuit Breaker, retrying automatically.',
      'upstream_unavailable',
      503,
      requestId,
      errorFormat
    );
  }

  // Fair-share in-flight concurrency limiter per user (prevents single-account thread/socket exhaustion)
  const concurrencyKey = `user:${auth.user.id}`;
  const slotAcquired = await acquireConcurrencySlot(concurrencyKey, 30);
  if (!slotAcquired) {
    return aiGatewayError(
      'Too many concurrent requests on this account (limit 30 in-flight). Please wait for active streams to finish.',
      'concurrency_limit_exceeded',
      429,
      requestId,
      errorFormat
    );
  }

  let concurrencyReleased = false;
  const releaseSlotOnce = () => {
    if (!concurrencyReleased) {
      concurrencyReleased = true;
      releaseConcurrencySlot(concurrencyKey).catch(() => {});
    }
  };

  await ensureAiModelsExist();
  const model = await getAiModelCached(modelId);
  if (!model || !model.isActive) {
    releaseSlotOnce();
    return aiGatewayError(
      `Model '${modelId}' not found or disabled.`,
      'model_not_found',
      404,
      requestId,
      errorFormat
    );
  }

  if (!isModelAllowedForKey(auth.keyRecord, model.modelId)) {
    releaseSlotOnce();
    return aiGatewayError(
      `This API key is not permitted to use model '${model.modelId}'.`,
      'model_not_allowed',
      403,
      requestId,
      errorFormat
    );
  }

  if (format === 'anthropic' && model.openaiOnly) {
    releaseSlotOnce();
    return aiGatewayError(
      'This model accepts only the OpenAI format — send it to /api/ai/v1/chat/completions.',
      'unsupported_format',
      400,
      requestId,
      errorFormat
    );
  }

  // Enforce model contextWindow & max output limits before forwarding to Helipod
  const estimatedPromptTokens = estimatePromptTokensFromBody(body);
  const maxContextTokens = parseContextWindowTokens(model.contextWindow);
  if (estimatedPromptTokens > maxContextTokens) {
    releaseSlotOnce();
    return aiGatewayError(
      `Estimated prompt (~${estimatedPromptTokens.toLocaleString()} tokens) exceeds ${model.modelId} context window (${model.contextWindow}).`,
      'context_length_exceeded',
      400,
      requestId,
      errorFormat
    );
  }

  const rawCap = Number(
    body.max_completion_tokens ?? body.max_tokens ?? body.max_output_tokens ?? 4096
  );
  const requestedCap = Number.isFinite(rawCap) && rawCap > 0 ? Math.min(rawCap, maxContextTokens) : 4096;
  const rawN = Number(body.n);
  const nCompletions = Number.isFinite(rawN) && rawN >= 1 ? Math.min(Math.floor(rawN), 10) : 1;
  const holdOutputTokens = Math.max(256, requestedCap) * nCompletions;

  const { costRp: estimatedHoldRp } = calculateTokenCostRp(
    { inputTokens: estimatedPromptTokens, cachedTokens: 0, outputTokens: holdOutputTokens },
    model,
    config.markupPercent
  );

  // Enforce API Key monthly spend limit against estimated hold
  if (
    auth.keyRecord.monthlyLimit !== null &&
    auth.keyRecord.monthlySpent + estimatedHoldRp > auth.keyRecord.monthlyLimit
  ) {
    releaseSlotOnce();
    return aiGatewayError(
      'This API key does not have enough remaining monthly spend limit for this request.',
      'key_spend_limit_reached',
      403,
      requestId,
      errorFormat
    );
  }

  // Atomic Balance Hold (prevents concurrent double-spend & negative balance)
  const reserved = await reserveAiBalanceHold(auth.user.id, estimatedHoldRp);
  if (!reserved) {
    releaseSlotOnce();
    return aiGatewayError(
      'Insufficient balance. Top up your AI balance to continue.',
      'insufficient_balance',
      402,
      requestId,
      errorFormat
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
  if (format === 'anthropic') {
    headers['anthropic-version'] = req.headers.get('anthropic-version') || '2023-06-01';
    const anthropicBeta = req.headers.get('anthropic-beta');
    if (anthropicBeta) headers['anthropic-beta'] = anthropicBeta;
  } else {
    const anthropicVersion = req.headers.get('anthropic-version');
    if (anthropicVersion) headers['anthropic-version'] = anthropicVersion;
  }

  // Connect & initial response timeout (45 seconds) + Client disconnect listener
  const abortController = new AbortController();
  const connectTimeoutTimer = setTimeout(() => {
    abortController.abort(new Error('UPSTREAM_CONNECT_TIMEOUT'));
  }, 45_000);

  const onClientAbort = () => {
    abortController.abort(new Error('CLIENT_ABORTED'));
  };
  req.signal?.addEventListener('abort', onClientAbort);

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(forwardBody),
      signal: abortController.signal,
    });
  } catch (err: any) {
    clearTimeout(connectTimeoutTimer);
    req.signal?.removeEventListener('abort', onClientAbort);
    releaseSlotOnce();

    const isClientAbort =
      String(err?.message || '').includes('CLIENT_ABORTED') ||
      String(abortController.signal.reason || '').includes('CLIENT_ABORTED');
    if (isClientAbort) {
      const { costRp: promptCostRp, upstreamCostRp: promptUpstreamRp } = calculateTokenCostRp(
        { inputTokens: estimatedPromptTokens, cachedTokens: 0, outputTokens: 0 },
        model,
        config.markupPercent
      );
      await recordAiUsageAndCharge({
        userId: auth.user.id,
        apiKeyId: auth.keyRecord.id,
        requestId,
        modelId: model.modelId,
        endpoint,
        inputTokens: estimatedPromptTokens,
        cachedTokens: 0,
        outputTokens: 0,
        costRp: promptCostRp,
        upstreamCostRp: promptUpstreamRp,
        latencyMs: Date.now() - startedAt,
        statusCode: 499,
        heldRp: estimatedHoldRp,
      }).catch(() => {});
    } else {
      await releaseAiBalanceHold(auth.user.id, estimatedHoldRp).catch(() => {});
    }

    const isAbort = err?.name === 'AbortError' || String(err?.message || '').includes('ABORT');
    const isTimeout = String(err?.message || '').includes('TIMEOUT');
    if (!isAbort || isTimeout) {
      aiUpstreamCircuitBreaker.recordFailure(err instanceof Error ? err : new Error(String(err)));
    }
    console.error('[AI_GATEWAY_UPSTREAM]', err);
    if (isTimeout) {
      return aiGatewayError(
        'Upstream AI provider response timed out after 45 seconds.',
        'upstream_timeout',
        504,
        requestId,
        errorFormat
      );
    }
    return aiGatewayError(
      'Upstream AI provider is unreachable.',
      'upstream_unreachable',
      502,
      requestId,
      errorFormat
    );
  } finally {
    clearTimeout(connectTimeoutTimer);
    req.signal?.removeEventListener('abort', onClientAbort);
  }

  if (upstreamRes.ok) {
    aiUpstreamCircuitBreaker.recordSuccess();
  } else if (upstreamRes.status >= 500) {
    aiUpstreamCircuitBreaker.recordFailure(new Error(`Upstream status ${upstreamRes.status}`));
  }

  if (!upstreamRes.ok) {
    releaseSlotOnce();
    await releaseAiBalanceHold(auth.user.id, estimatedHoldRp).catch(() => {});
    const errText = await upstreamRes.text().catch(() => '');
    const status = upstreamRes.status >= 500 ? 502 : upstreamRes.status;
    return new NextResponse(
      errText ||
        JSON.stringify({
          error: { message: 'Upstream provider error', type: 'api_error', code: 'upstream_error' },
        }),
      {
        status,
        headers: {
          ...buildGatewayResponseHeaders(upstreamRes, requestId, model.modelId),
          'content-type': upstreamRes.headers.get('content-type') || 'application/json',
        },
      }
    );
  }

  if (!isStream || !upstreamRes.body) {
    const jsonData = await upstreamRes.json().catch(() => null);
    if (!jsonData) {
      releaseSlotOnce();
      await releaseAiBalanceHold(auth.user.id, estimatedHoldRp).catch(() => {});
      return aiGatewayError(
        'Invalid response from upstream AI provider.',
        'upstream_error',
        502,
        requestId,
        errorFormat
      );
    }

    const usage: ParsedUsage = { inputTokens: 0, cachedTokens: 0, outputTokens: 0 };
    if (format === 'openai' || format === 'responses') {
      const parsed = extractOpenAiUsage(jsonData);
      if (parsed) Object.assign(usage, parsed);
    } else {
      mergeAnthropicUsage(usage, { usage: jsonData.usage });
    }

    // Fallback estimate if upstream omitted token counts
    if (usage.inputTokens === 0 && usage.cachedTokens === 0 && usage.outputTokens === 0) {
      usage.inputTokens = estimatedPromptTokens;
      usage.outputTokens = Math.max(16, Math.ceil(JSON.stringify(jsonData).length / 6));
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
      heldRp: estimatedHoldRp,
    }).catch((err) => console.error('[AI_GATEWAY_CHARGE]', err));

    releaseSlotOnce();

    return NextResponse.json(jsonData, {
      status: 200,
      headers: buildGatewayResponseHeaders(upstreamRes, requestId, model.modelId),
    });
  }

  // Streaming SSE pass-through with usage capture & mid-stream cancellation estimation
  const reader = upstreamRes.body.getReader();
  const decoder = new TextDecoder();
  const usage: ParsedUsage = { inputTokens: 0, cachedTokens: 0, outputTokens: 0 };
  let streamedOutputChars = 0;
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
        streamedOutputChars += extractStreamDeltaChars(parsed);
        if (format === 'openai' || format === 'responses') {
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

  const finalizeCharge = async (abortedByClient: boolean = false) => {
    if (charged) return;
    charged = true;
    if (sseBuffer.trim()) {
      parseSseLines(sseBuffer.split('\n'));
      sseBuffer = '';
    }
    // If client closes connection mid-stream before final usage event, estimate from text received (or at least prompt tokens on abort)
    if (usage.outputTokens === 0 && streamedOutputChars > 0) {
      if (usage.inputTokens === 0 && usage.cachedTokens === 0) {
        usage.inputTokens = estimatedPromptTokens;
      }
      usage.outputTokens = Math.max(1, Math.floor(streamedOutputChars / 4));
    } else if (abortedByClient && usage.inputTokens === 0 && usage.cachedTokens === 0) {
      usage.inputTokens = estimatedPromptTokens;
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
      heldRp: estimatedHoldRp,
    }).catch((err) => console.error('[AI_GATEWAY_STREAM_CHARGE]', err));
  };

  const stream = new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          await finalizeCharge();
          releaseSlotOnce();
          controller.close();
          return;
        }

        controller.enqueue(value);
        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split('\n');
        sseBuffer = lines.pop() ?? '';
        parseSseLines(lines);
      } catch (err) {
        await finalizeCharge();
        releaseSlotOnce();
        controller.error(err);
      }
    },
    async cancel() {
      await reader.cancel().catch(() => {});
      await finalizeCharge(true);
      releaseSlotOnce();
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      ...buildGatewayResponseHeaders(upstreamRes, requestId, model.modelId),
      'content-type': upstreamRes.headers.get('content-type') || 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  });
}
