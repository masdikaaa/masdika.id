import * as crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './prisma';
import { decryptDeterministic } from './encryption';
import { checkRateLimit } from './rate-limit';

export interface AiModelSeed {
  modelId: string;
  name: string;
  provider: string;
  contextWindow: string;
  inputPricePer1M: number;
  cachePricePer1M: number;
  outputPricePer1M: number;
  originalInputPricePer1M?: number | null;
  originalCachePricePer1M?: number | null;
  originalOutputPricePer1M?: number | null;
  discountBadge?: string | null;
  openaiOnly?: boolean;
  hasPeakPricing?: boolean;
}

export const DEFAULT_AI_MODELS: AiModelSeed[] = [
  { modelId: 'qwen3.7-flash', name: 'Qwen3.7 Flash', provider: 'Qwen', contextWindow: '1M', inputPricePer1M: 614, cachePricePer1M: 614, outputPricePer1M: 2661 },
  { modelId: 'gpt-5-nano', name: 'GPT-5 Nano', provider: 'OpenAI', contextWindow: '400K', inputPricePer1M: 1024, cachePricePer1M: 205, outputPricePer1M: 8188 },
  { modelId: 'gpt-oss-20b', name: 'GPT OSS 20B', provider: 'OpenAI', contextWindow: '131K', inputPricePer1M: 1433, cachePricePer1M: 1433, outputPricePer1M: 6141 },
  { modelId: 'qwen-vl-ocr', name: 'Qwen VL OCR', provider: 'Qwen', contextWindow: '38K', inputPricePer1M: 1433, cachePricePer1M: 1433, outputPricePer1M: 3275 },
  { modelId: 'claude-haiku-5-5', name: 'Claude Haiku 5.5', provider: 'Anthropic', contextWindow: '200K', inputPricePer1M: 2047, cachePricePer1M: 205, outputPricePer1M: 10235 },
  { modelId: 'gpt-6-luna', name: 'GPT-6 Luna', provider: 'OpenAI', contextWindow: '1.05M', inputPricePer1M: 2047, cachePricePer1M: 205, outputPricePer1M: 10235 },
  { modelId: 'qwen3.5-flash', name: 'Qwen3.5 Flash', provider: 'Qwen', contextWindow: '1M', inputPricePer1M: 2047, cachePricePer1M: 2047, outputPricePer1M: 8188 },
  {
    modelId: 'hy3',
    name: 'Hunyuan Hy3',
    provider: 'Hunyuan',
    contextWindow: '256K',
    inputPricePer1M: 1880,
    cachePricePer1M: 470,
    outputPricePer1M: 7519,
    originalInputPricePer1M: 2350,
    originalCachePricePer1M: 587,
    originalOutputPricePer1M: 9398,
    discountBadge: '-20%',
  },
  {
    modelId: 'deepseek-v4.1-flash',
    name: 'DeepSeek V4.1 Flash',
    provider: 'DeepSeek',
    contextWindow: '1M',
    inputPricePer1M: 1869,
    cachePricePer1M: 37,
    outputPricePer1M: 7476,
    originalInputPricePer1M: 2670,
    originalCachePricePer1M: 53,
    originalOutputPricePer1M: 10680,
    discountBadge: '-30%',
    hasPeakPricing: true,
  },
  {
    modelId: 'glm-5.3-flash',
    name: 'GLM-5.3 Flash',
    provider: 'GLM',
    contextWindow: '1M',
    inputPricePer1M: 2136,
    cachePricePer1M: 427,
    outputPricePer1M: 7120,
    originalInputPricePer1M: 2670,
    originalCachePricePer1M: 534,
    originalOutputPricePer1M: 8900,
    discountBadge: '-20%',
  },
  { modelId: 'meta-llama-3-1-8b-instruct', name: 'Meta Llama 3.1 8B Instruct', provider: 'Meta', contextWindow: '131K', inputPricePer1M: 3071, cachePricePer1M: 3071, outputPricePer1M: 9212 },
  { modelId: 'gemma-3-12b', name: 'Gemma 3 12B', provider: 'Google', contextWindow: '131K', inputPricePer1M: 3071, cachePricePer1M: 3071, outputPricePer1M: 10235 },
  { modelId: 'gpt-oss-120b', name: 'GPT OSS 120B', provider: 'OpenAI', contextWindow: '131K', inputPricePer1M: 3071, cachePricePer1M: 3071, outputPricePer1M: 12282 },
  { modelId: 'qwen3-next-80b-a3b-instruct', name: 'Qwen3 Next Instruct', provider: 'Qwen', contextWindow: '131K', inputPricePer1M: 3071, cachePricePer1M: 3071, outputPricePer1M: 24564 },
  { modelId: 'qwen3.8-flash', name: 'Qwen3.8 Flash', provider: 'Qwen', contextWindow: '1M', inputPricePer1M: 3071, cachePricePer1M: 3071, outputPricePer1M: 9621 },
  { modelId: 'gpt-5-6-luna', name: 'GPT-5.6 Luna', provider: 'OpenAI', contextWindow: '1.05M', inputPricePer1M: 4094, cachePricePer1M: 409, outputPricePer1M: 24564 },
  { modelId: 'gpt-5-4-nano', name: 'GPT-5.4 Nano', provider: 'OpenAI', contextWindow: '400K', inputPricePer1M: 4094, cachePricePer1M: 409, outputPricePer1M: 25588 },
  { modelId: 'qwen3-vl-plus', name: 'Qwen3 VL Plus', provider: 'Qwen', contextWindow: '256K', inputPricePer1M: 4094, cachePricePer1M: 4094, outputPricePer1M: 32752 },
  { modelId: 'qwen35-122b-a10b', name: 'Qwen3.5 122B A10B', provider: 'Qwen', contextWindow: '262K', inputPricePer1M: 4503, cachePricePer1M: 4503, outputPricePer1M: 45034 },
  { modelId: 'gemini-3-1-flash-lite', name: 'Gemini 3.1 Flash Lite', provider: 'Google', contextWindow: '1.048576M', inputPricePer1M: 5118, cachePricePer1M: 512, outputPricePer1M: 30705 },
  { modelId: 'gpt-5-mini', name: 'GPT-5 Mini', provider: 'OpenAI', contextWindow: '400K', inputPricePer1M: 5118, cachePricePer1M: 512, outputPricePer1M: 40940 },
  { modelId: 'qwen3.6-flash', name: 'Qwen3.6 Flash', provider: 'Qwen', contextWindow: '1M', inputPricePer1M: 5118, cachePricePer1M: 5118, outputPricePer1M: 30705 },
  {
    modelId: 'minimax-m3',
    name: 'MiniMax M3',
    provider: 'MiniMax',
    contextWindow: '1M',
    inputPricePer1M: 4272,
    cachePricePer1M: 854,
    outputPricePer1M: 17088,
    originalInputPricePer1M: 5340,
    originalCachePricePer1M: 1068,
    originalOutputPricePer1M: 21360,
    discountBadge: '-20%',
  },
  { modelId: 'gemini-3-5-flash-lite', name: 'Gemini 3.5 Flash Lite', provider: 'Google', contextWindow: '1.048576M', inputPricePer1M: 6141, cachePricePer1M: 614, outputPricePer1M: 51175 },
  {
    modelId: 'deepseek/deepseek-v4.1-flash:fast',
    name: 'DeepSeek V4.1 Flash Fast Edition',
    provider: 'DeepSeek',
    contextWindow: '1M',
    inputPricePer1M: 4984,
    cachePricePer1M: 1424,
    outputPricePer1M: 21360,
    originalInputPricePer1M: 6230,
    originalCachePricePer1M: 1780,
    originalOutputPricePer1M: 26700,
    discountBadge: '-20%',
  },
  {
    modelId: 'glm-5.3-flashx',
    name: 'GLM-5.3 FlashX',
    provider: 'GLM',
    contextWindow: '1M',
    inputPricePer1M: 5269,
    cachePricePer1M: 1068,
    outputPricePer1M: 17800,
    originalInputPricePer1M: 6586,
    originalCachePricePer1M: 1335,
    originalOutputPricePer1M: 22250,
    discountBadge: '-20%',
  },
  { modelId: 'qwen3.7-plus', name: 'Qwen3.7 Plus', provider: 'Qwen', contextWindow: '1M', inputPricePer1M: 8188, cachePricePer1M: 8188, outputPricePer1M: 32752 },
  { modelId: 'llama-4-maverick', name: 'Llama 4 Maverick', provider: 'Meta', contextWindow: '1M', inputPricePer1M: 10235, cachePricePer1M: 10235, outputPricePer1M: 30705 },
  { modelId: 'meta-llama-3-3-70b-instruct', name: 'Meta Llama 3.3 70B Instruct', provider: 'Meta', contextWindow: '128K', inputPricePer1M: 10235, cachePricePer1M: 10235, outputPricePer1M: 30705 },
  { modelId: 'gemini-3-flash', name: 'Gemini 3 Flash', provider: 'Google', contextWindow: '1.048576M', inputPricePer1M: 10235, cachePricePer1M: 1024, outputPricePer1M: 61410 },
  {
    modelId: 'qwen3.8-27b',
    name: 'Qwen3.8 27B',
    provider: 'Qwen',
    contextWindow: '1M',
    inputPricePer1M: 5118,
    cachePricePer1M: 1024,
    outputPricePer1M: 30705,
    originalInputPricePer1M: 10235,
    originalCachePricePer1M: 2047,
    originalOutputPricePer1M: 61410,
    discountBadge: '-50%',
  },
  { modelId: 'qwen3.6-plus', name: 'Qwen3.6 Plus', provider: 'Qwen', contextWindow: '1M', inputPricePer1M: 10235, cachePricePer1M: 10235, outputPricePer1M: 61410 },
  { modelId: 'qwen3.6-27b', name: 'Qwen3.6 27B', provider: 'Qwen', contextWindow: '256K', inputPricePer1M: 12282, cachePricePer1M: 12282, outputPricePer1M: 73692 },
  { modelId: 'gpt-5-4-mini', name: 'GPT-5.4 Mini', provider: 'OpenAI', contextWindow: '400K', inputPricePer1M: 15353, cachePricePer1M: 1535, outputPricePer1M: 92115 },
  { modelId: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', provider: 'Anthropic', contextWindow: '200K', inputPricePer1M: 20470, cachePricePer1M: 2047, outputPricePer1M: 102350 },
  {
    modelId: 'glm-5.3',
    name: 'GLM-5.3',
    provider: 'GLM',
    contextWindow: '1M',
    inputPricePer1M: 19936,
    cachePricePer1M: 3702,
    outputPricePer1M: 62656,
    originalInputPricePer1M: 24920,
    originalCachePricePer1M: 4628,
    originalOutputPricePer1M: 78320,
    discountBadge: '-20%',
  },
  {
    modelId: 'glm-5.2',
    name: 'GLM-5.2',
    provider: 'GLM',
    contextWindow: '1M',
    inputPricePer1M: 19936,
    cachePricePer1M: 3702,
    outputPricePer1M: 62656,
    originalInputPricePer1M: 24920,
    originalCachePricePer1M: 4628,
    originalOutputPricePer1M: 78320,
    discountBadge: '-20%',
  },
  {
    modelId: 'glm-5.1',
    name: 'GLM-5.1',
    provider: 'GLM',
    contextWindow: '200K',
    inputPricePer1M: 19936,
    cachePricePer1M: 3702,
    outputPricePer1M: 62656,
    originalInputPricePer1M: 24920,
    originalCachePricePer1M: 4628,
    originalOutputPricePer1M: 78320,
    discountBadge: '-20%',
  },
  { modelId: 'gpt-5', name: 'GPT-5', provider: 'OpenAI', contextWindow: '400K', inputPricePer1M: 25588, cachePricePer1M: 2559, outputPricePer1M: 204700 },
  { modelId: 'gpt-5-1', name: 'GPT-5.1', provider: 'OpenAI', contextWindow: '400K', inputPricePer1M: 25588, cachePricePer1M: 2559, outputPricePer1M: 204700 },
  { modelId: 'gemini-3-6-flash', name: 'Gemini 3.6 Flash', provider: 'Google', contextWindow: '1.048576M', inputPricePer1M: 30705, cachePricePer1M: 3071, outputPricePer1M: 153525 },
  { modelId: 'gemini-3-5-flash', name: 'Gemini 3.5 Flash', provider: 'Google', contextWindow: '1.048576M', inputPricePer1M: 30705, cachePricePer1M: 3071, outputPricePer1M: 184230 },
  { modelId: 'gemini-3-7-flash', name: 'Gemini 3.7 Flash', provider: 'Google', contextWindow: '1.048576M', inputPricePer1M: 30705, cachePricePer1M: 3071, outputPricePer1M: 153525 },
  { modelId: 'gemini-3-8-flash', name: 'Gemini 3.8 Flash', provider: 'Google', contextWindow: '1.048576M', inputPricePer1M: 30705, cachePricePer1M: 3071, outputPricePer1M: 153525 },
  {
    modelId: 'deepseek-v4-pro',
    name: 'DeepSeek V4 Pro',
    provider: 'DeepSeek',
    contextWindow: '1M',
    inputPricePer1M: 24778,
    cachePricePer1M: 2065,
    outputPricePer1M: 49555,
    originalInputPricePer1M: 30972,
    originalCachePricePer1M: 2581,
    originalOutputPricePer1M: 61944,
    discountBadge: '-20%',
  },
  { modelId: 'gpt-5-2', name: 'GPT-5.2', provider: 'OpenAI', contextWindow: '400K', inputPricePer1M: 35823, cachePricePer1M: 3582, outputPricePer1M: 286580 },
  { modelId: 'grok-4-6', name: 'Grok 4.6', provider: 'Grok', contextWindow: '500K', inputPricePer1M: 40940, cachePricePer1M: 10235, outputPricePer1M: 122820 },
  { modelId: 'claude-sonnet-5', name: 'Claude Sonnet 5', provider: 'Anthropic', contextWindow: '1M', inputPricePer1M: 40940, cachePricePer1M: 4094, outputPricePer1M: 204700 },
  { modelId: 'gemini-3-1-pro', name: 'Gemini 3.1 Pro', provider: 'Google', contextWindow: '1.048576M', inputPricePer1M: 40940, cachePricePer1M: 4094, outputPricePer1M: 245640 },
  { modelId: 'gpt-5-6-terra', name: 'GPT-5.6 Terra', provider: 'OpenAI', contextWindow: '1.05M', inputPricePer1M: 40940, cachePricePer1M: 4094, outputPricePer1M: 245640 },
  { modelId: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5', provider: 'Anthropic', contextWindow: '1M', inputPricePer1M: 40940, cachePricePer1M: 4094, outputPricePer1M: 204700 },
  { modelId: 'gpt-6-sol', name: 'GPT-6 Sol', provider: 'OpenAI', contextWindow: '1.05M', inputPricePer1M: 40940, cachePricePer1M: 4094, outputPricePer1M: 204700 },
  { modelId: 'gpt-6-1-sol', name: 'GPT-6.1 Sol', provider: 'OpenAI', contextWindow: '1.05M', inputPricePer1M: 40940, cachePricePer1M: 2047, outputPricePer1M: 204700 },
  { modelId: 'qwen3.8-max', name: 'Qwen3.8 Max', provider: 'Qwen', contextWindow: '1M', inputPricePer1M: 40940, cachePricePer1M: 40940, outputPricePer1M: 122820 },
  { modelId: 'gpt-5-4', name: 'GPT-5.4', provider: 'OpenAI', contextWindow: '1.05M', inputPricePer1M: 51175, cachePricePer1M: 5118, outputPricePer1M: 307050 },
  { modelId: 'grok-4-7', name: 'Grok 4.7', provider: 'Grok', contextWindow: '500K', inputPricePer1M: 51175, cachePricePer1M: 10235, outputPricePer1M: 153525 },
  { modelId: 'qwen3.7-max', name: 'Qwen3.7 Max', provider: 'Qwen', contextWindow: '1M', inputPricePer1M: 51175, cachePricePer1M: 51175, outputPricePer1M: 153525 },
  {
    modelId: 'kimi-k3',
    name: 'Kimi K3',
    provider: 'Kimi',
    contextWindow: '1M',
    inputPricePer1M: 42720,
    cachePricePer1M: 4272,
    outputPricePer1M: 213600,
    originalInputPricePer1M: 53400,
    originalCachePricePer1M: 5340,
    originalOutputPricePer1M: 267000,
    discountBadge: '-20%',
  },
  { modelId: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', provider: 'Anthropic', contextWindow: '1M', inputPricePer1M: 61410, cachePricePer1M: 6141, outputPricePer1M: 307050 },
  { modelId: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', provider: 'Anthropic', contextWindow: '200K', inputPricePer1M: 61410, cachePricePer1M: 6141, outputPricePer1M: 307050 },
  { modelId: 'claude-opus-5-5', name: 'Claude Opus 5.5', provider: 'Anthropic', contextWindow: '1M', inputPricePer1M: 81880, cachePricePer1M: 4094, outputPricePer1M: 409400 },
  { modelId: 'gemini-4-argon', name: 'Gemini 4 Argon', provider: 'Google', contextWindow: '1.048576M', inputPricePer1M: 81880, cachePricePer1M: 4094, outputPricePer1M: 409400 },
  { modelId: 'claude-opus-4-8', name: 'Claude Opus 4.8', provider: 'Anthropic', contextWindow: '1M', inputPricePer1M: 102350, cachePricePer1M: 10235, outputPricePer1M: 511750 },
  { modelId: 'claude-opus-4-7', name: 'Claude Opus 4.7', provider: 'Anthropic', contextWindow: '1M', inputPricePer1M: 102350, cachePricePer1M: 10235, outputPricePer1M: 511750 },
  { modelId: 'claude-opus-4-6', name: 'Claude Opus 4.6', provider: 'Anthropic', contextWindow: '1M', inputPricePer1M: 102350, cachePricePer1M: 10235, outputPricePer1M: 511750 },
  { modelId: 'claude-opus-4-5', name: 'Claude Opus 4.5', provider: 'Anthropic', contextWindow: '200K', inputPricePer1M: 102350, cachePricePer1M: 10235, outputPricePer1M: 511750 },
  { modelId: 'claude-opus-5', name: 'Claude Opus 5', provider: 'Anthropic', contextWindow: '1M', inputPricePer1M: 102350, cachePricePer1M: 10235, outputPricePer1M: 511750 },
  { modelId: 'gpt-5-5', name: 'GPT-5.5', provider: 'OpenAI', contextWindow: '1.05M', inputPricePer1M: 102350, cachePricePer1M: 10235, outputPricePer1M: 614100 },
  { modelId: 'gpt-5-6-sol', name: 'GPT-5.6 Sol', provider: 'OpenAI', contextWindow: '1.05M', inputPricePer1M: 102350, cachePricePer1M: 10235, outputPricePer1M: 614100 },
  { modelId: 'claude-fable-5', name: 'Claude Fable 5', provider: 'Anthropic', contextWindow: '1M', inputPricePer1M: 204700, cachePricePer1M: 20470, outputPricePer1M: 1023500 },
  { modelId: 'claude-fable-5-1', name: 'Claude Fable 5.1', provider: 'Anthropic', contextWindow: '1M', inputPricePer1M: 204700, cachePricePer1M: 5118, outputPricePer1M: 1023500 },
  { modelId: 'gpt-6-astra', name: 'GPT-6 Astra', provider: 'OpenAI', contextWindow: '1.05M', inputPricePer1M: 204700, cachePricePer1M: 20470, outputPricePer1M: 1023500 },
  { modelId: 'claude-opus-4-1', name: 'Claude Opus 4.1', provider: 'Anthropic', contextWindow: '200K', inputPricePer1M: 307050, cachePricePer1M: 30705, outputPricePer1M: 1535250 },
];

export const AI_GATEWAY_SETTING_KEYS = {
  ENABLED: 'ai_gateway_enabled',
  UPSTREAM_URL: 'ai_gateway_upstream_url',
  UPSTREAM_KEY: 'ai_gateway_upstream_key',
  MANAGEMENT_KEY: 'ai_gateway_management_key',
  MARKUP_PERCENT: 'ai_gateway_markup_percent',
  LAST_SYNC_AT: 'ai_gateway_last_sync_at',
  LAST_SYNC_STATUS: 'ai_gateway_last_sync_status',
} as const;

export const AI_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Authorization, x-api-key, Content-Type, anthropic-version, anthropic-beta, x-request-id',
  'Access-Control-Expose-Headers':
    'x-request-id, x-masdika-model, x-masdika-model-sunset, x-masdika-model-replacement, x-masdika-estimate',
};

export function aiGatewayOptionsResponse() {
  return new NextResponse(null, { status: 204, headers: AI_CORS_HEADERS });
}

export function statusToErrorType(status: number): string {
  switch (status) {
    case 400:
    case 422:
      return 'invalid_request_error';
    case 401:
      return 'authentication_error';
    case 402:
      return 'billing_error';
    case 403:
      return 'permission_error';
    case 404:
    case 410:
      return 'not_found_error';
    case 413:
      return 'request_too_large';
    case 429:
      return 'rate_limit_error';
    default:
      return 'api_error';
  }
}

export function aiGatewayError(
  message: string,
  code: string,
  status: number,
  requestId?: string,
  format: 'openai' | 'anthropic' = 'openai'
) {
  const errType = statusToErrorType(status);
  const headers: Record<string, string> = { ...AI_CORS_HEADERS };
  // Per docs: Every response except 401 carries an x-request-id header
  if (requestId && status !== 401) {
    headers['x-request-id'] = requestId;
  }

  if (format === 'anthropic') {
    return NextResponse.json(
      {
        type: 'error',
        error: { type: errType, message },
      },
      { status, headers }
    );
  }

  return NextResponse.json(
    {
      error: { message, type: errType, code },
    },
    { status, headers }
  );
}

/**
 * Peak hours in WIB (UTC+7): Monday to Friday, 08:00-11:00 and 13:00-17:00.
 */
export function isPeakHourWib(now: Date = new Date()): boolean {
  const wibMs = now.getTime() + 7 * 60 * 60 * 1000;
  const wib = new Date(wibMs);
  const day = wib.getUTCDay(); // 0 = Sun, 1 = Mon ... 5 = Fri, 6 = Sat
  if (day < 1 || day > 5) return false;
  const hour = wib.getUTCHours();
  return (hour >= 8 && hour < 11) || (hour >= 13 && hour < 17);
}

export function hashAiGatewayKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

export function generateAiGatewayKey(): { rawKey: string; keyHash: string; keyPrefix: string } {
  const randomPart = crypto.randomBytes(24).toString('hex');
  const rawKey = `masdika_ai_${randomPart}`;
  return {
    rawKey,
    keyHash: hashAiGatewayKey(rawKey),
    keyPrefix: rawKey.slice(0, 18),
  };
}

export function applyMarkupPrice(basePricePer1M: number, markupPercent: number): number {
  const safeMarkup = Math.max(0, Number.isFinite(markupPercent) ? markupPercent : 0);
  return Math.round(basePricePer1M * (1 + safeMarkup / 100));
}

export function calculateTokenCostRp(
  usage: { inputTokens: number; cachedTokens: number; outputTokens: number },
  model: {
    inputPricePer1M: number;
    cachePricePer1M: number;
    outputPricePer1M: number;
    hasPeakPricing?: boolean;
  },
  markupPercent: number,
  now: Date = new Date()
): { costRp: number; upstreamCostRp: number } {
  const input = Math.max(0, usage.inputTokens);
  const cached = Math.max(0, usage.cachedTokens);
  const output = Math.max(0, usage.outputTokens);

  const peakMultiplier = model.hasPeakPricing && isPeakHourWib(now) ? 2 : 1;

  const rawUpstream =
    ((input * model.inputPricePer1M +
      cached * model.cachePricePer1M +
      output * model.outputPricePer1M) *
      peakMultiplier) /
    1_000_000;

  const totalTokens = input + cached + output;
  const upstreamCostRp = totalTokens > 0 ? Math.max(1, Math.ceil(rawUpstream)) : 0;
  const safeMarkup = Math.max(0, Number.isFinite(markupPercent) ? markupPercent : 0);
  const costRp =
    totalTokens > 0 ? Math.max(1, Math.ceil(rawUpstream * (1 + safeMarkup / 100))) : 0;

  return { costRp, upstreamCostRp };
}

export function estimatePromptTokensFromBody(body: any): number {
  if (!body || typeof body !== 'object') return 32;
  let chars = 0;
  if (typeof body.system === 'string') chars += body.system.length;
  if (typeof body.instructions === 'string') chars += body.instructions.length;
  if (typeof body.input === 'string') chars += body.input.length;
  const list = Array.isArray(body.messages)
    ? body.messages
    : Array.isArray(body.input)
    ? body.input
    : [];
  for (const item of list) {
    if (!item) continue;
    if (typeof item.content === 'string') {
      chars += item.content.length;
    } else if (Array.isArray(item.content)) {
      for (const part of item.content) {
        if (typeof part?.text === 'string') chars += part.text.length;
        else if (part?.type === 'image_url' || part?.type === 'image' || part?.type === 'input_image') {
          chars += 4000; // fixed image token allowance (~1000 tokens)
        }
      }
    }
  }
  return Math.max(16, Math.ceil(chars / 3.8));
}

export async function ensureAiModelsExist() {
  const count = await prisma.aiModel.count();
  if (count === 0) {
    await prisma.aiModel.createMany({
      data: DEFAULT_AI_MODELS.map((m, idx) => ({
        modelId: m.modelId,
        name: m.name,
        provider: m.provider,
        contextWindow: m.contextWindow,
        inputPricePer1M: m.inputPricePer1M,
        cachePricePer1M: m.cachePricePer1M,
        outputPricePer1M: m.outputPricePer1M,
        originalInputPricePer1M: m.originalInputPricePer1M ?? null,
        originalCachePricePer1M: m.originalCachePricePer1M ?? null,
        originalOutputPricePer1M: m.originalOutputPricePer1M ?? null,
        discountBadge: m.discountBadge ?? null,
        openaiOnly: Boolean(m.openaiOnly),
        hasPeakPricing: Boolean(m.hasPeakPricing),
        isActive: true,
        sortOrder: idx + 1,
      })),
      skipDuplicates: true,
    });
    return;
  }

  // Backfill discount/strikethrough prices on existing seeded rows if not yet set
  const discountedSeeds = DEFAULT_AI_MODELS.filter((m) => Boolean(m.discountBadge));
  if (discountedSeeds.length === 0) return;

  const existing = await prisma.aiModel.findMany({
    where: {
      modelId: { in: discountedSeeds.map((m) => m.modelId) },
      originalInputPricePer1M: null,
      discountBadge: null,
    },
    select: { modelId: true },
  });

  if (existing.length > 0) {
    const missingSet = new Set(existing.map((e) => e.modelId));
    await Promise.all(
      discountedSeeds
        .filter((m) => missingSet.has(m.modelId))
        .map((m) =>
          prisma.aiModel.update({
            where: { modelId: m.modelId },
            data: {
              inputPricePer1M: m.inputPricePer1M,
              cachePricePer1M: m.cachePricePer1M,
              outputPricePer1M: m.outputPricePer1M,
              originalInputPricePer1M: m.originalInputPricePer1M ?? null,
              originalCachePricePer1M: m.originalCachePricePer1M ?? null,
              originalOutputPricePer1M: m.originalOutputPricePer1M ?? null,
              discountBadge: m.discountBadge ?? null,
            },
          })
        )
    );
  }
}

export async function getAiGatewayConfig() {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          AI_GATEWAY_SETTING_KEYS.ENABLED,
          AI_GATEWAY_SETTING_KEYS.UPSTREAM_URL,
          AI_GATEWAY_SETTING_KEYS.UPSTREAM_KEY,
          AI_GATEWAY_SETTING_KEYS.MANAGEMENT_KEY,
          AI_GATEWAY_SETTING_KEYS.MARKUP_PERCENT,
          AI_GATEWAY_SETTING_KEYS.LAST_SYNC_AT,
          AI_GATEWAY_SETTING_KEYS.LAST_SYNC_STATUS,
        ],
      },
    },
  });

  const map = new Map(settings.map((s) => [s.key, s.value]));
  const enabled = map.get(AI_GATEWAY_SETTING_KEYS.ENABLED) !== 'false';
  const upstreamUrl = (
    map.get(AI_GATEWAY_SETTING_KEYS.UPSTREAM_URL) || 'https://ai.helipod.io'
  ).replace(/\/+$/, '');
  const rawEncKey = map.get(AI_GATEWAY_SETTING_KEYS.UPSTREAM_KEY) || '';
  const upstreamKey = rawEncKey ? decryptDeterministic(rawEncKey) || rawEncKey : '';
  const rawMgmtKey = map.get(AI_GATEWAY_SETTING_KEYS.MANAGEMENT_KEY) || '';
  const managementKey = rawMgmtKey ? decryptDeterministic(rawMgmtKey) || rawMgmtKey : '';
  const markupRaw = Number(map.get(AI_GATEWAY_SETTING_KEYS.MARKUP_PERCENT) ?? '0');
  const markupPercent = Number.isFinite(markupRaw) && markupRaw >= 0 ? markupRaw : 0;
  const lastSyncAt = map.get(AI_GATEWAY_SETTING_KEYS.LAST_SYNC_AT) || null;
  const lastSyncStatus = map.get(AI_GATEWAY_SETTING_KEYS.LAST_SYNC_STATUS) || null;

  return {
    enabled,
    upstreamUrl,
    upstreamKey,
    managementKey,
    markupPercent,
    lastSyncAt,
    lastSyncStatus,
  };
}

function inferProviderFromModelId(modelId: string): string {
  const id = modelId.toLowerCase();
  if (id.includes('claude')) return 'Anthropic';
  if (id.includes('gpt')) return 'OpenAI';
  if (id.includes('gemini') || id.includes('gemma')) return 'Google';
  if (id.includes('qwen')) return 'Qwen';
  if (id.includes('deepseek')) return 'DeepSeek';
  if (id.includes('glm')) return 'GLM';
  if (id.includes('llama')) return 'Meta';
  if (id.includes('grok')) return 'Grok';
  if (id.includes('kimi')) return 'Kimi';
  if (id.includes('minimax')) return 'MiniMax';
  if (id.includes('hy3') || id.includes('hunyuan')) return 'Hunyuan';
  return 'Other';
}

function formatContextTokens(tokens?: number): string | undefined {
  if (!tokens || !Number.isFinite(tokens) || tokens <= 0) return undefined;
  if (tokens >= 1_000_000) {
    const m = tokens / 1_000_000;
    return Number.isInteger(m) ? `${m}M` : `${Number(m.toFixed(6))}M`;
  }
  return `${Math.round(tokens / 1000)}K`;
}

export async function syncAiModelsFromUpstream() {
  await ensureAiModelsExist();
  const config = await getAiGatewayConfig();
  if (!config.upstreamKey && !config.managementKey) {
    throw new Error('Master Upstream Key is not configured yet.');
  }

  let updatedCount = 0;
  let fetchedCount = 0;
  let syncedPrices = false;

  // 1. Try Management API (GET https://api.helipod.io/api/ai/models) for live IDR prices, promos & tiers
  const mgmtToken = config.managementKey || config.upstreamKey;
  if (mgmtToken) {
    try {
      const mgmtRes = await fetch('https://api.helipod.io/api/ai/models', {
        headers: { authorization: `Bearer ${mgmtToken}` },
        cache: 'no-store',
      });
      if (mgmtRes.ok) {
        const mgmtJson = await mgmtRes.json().catch(() => null);
        const mgmtModels: any[] = Array.isArray(mgmtJson?.data?.models) ? mgmtJson.data.models : [];
        if (mgmtModels.length > 0) {
          syncedPrices = true;
          fetchedCount = mgmtModels.length;
          for (const m of mgmtModels) {
            const modelId = typeof m?.code === 'string' ? m.code.trim() : '';
            if (!modelId) continue;
            const tiers: any[] = Array.isArray(m.tiers) ? m.tiers : [];
            const baseTier =
              tiers.find((t) => (t.window === 'off_peak' || t.window === 'all') && (t.minInputTokens ?? 0) === 0) ||
              tiers[0];
            if (!baseTier) continue;

            const listInput = Number(baseTier.input);
            const listCache = Number(baseTier.cached ?? baseTier.input);
            const listOutput = Number(baseTier.output);
            if (!Number.isFinite(listInput) || !Number.isFinite(listOutput)) continue;

            const promo = baseTier.promo && typeof baseTier.promo === 'object' ? baseTier.promo : null;
            const finalInput = promo && Number.isFinite(Number(promo.input)) ? Math.round(Number(promo.input)) : Math.round(listInput);
            const finalCache = promo && Number.isFinite(Number(promo.cached)) ? Math.round(Number(promo.cached)) : Math.round(listCache);
            const finalOutput = promo && Number.isFinite(Number(promo.output)) ? Math.round(Number(promo.output)) : Math.round(listOutput);

            const hasDiscount = promo && (finalInput < Math.round(listInput) || finalOutput < Math.round(listOutput));
            const pct = hasDiscount
              ? Math.round(((listOutput - finalOutput) / listOutput) * 100)
              : 0;
            const badge = hasDiscount ? `-${pct}%` : null;
            const ctxStr = formatContextTokens(Number(m.limits?.context));
            const hasPeak = Boolean(m.peakHours);
            const formats: string[] = Array.isArray(m.formats) ? m.formats : ['openai', 'anthropic'];
            const openaiOnly = formats.includes('openai') && !formats.includes('anthropic');

            await prisma.aiModel.upsert({
              where: { modelId },
              update: {
                ...(typeof m.name === 'string' && m.name.trim() ? { name: m.name.trim() } : {}),
                ...(ctxStr ? { contextWindow: ctxStr } : {}),
                inputPricePer1M: finalInput,
                cachePricePer1M: finalCache,
                outputPricePer1M: finalOutput,
                originalInputPricePer1M: hasDiscount ? Math.round(listInput) : null,
                originalCachePricePer1M: hasDiscount ? Math.round(listCache) : null,
                originalOutputPricePer1M: hasDiscount ? Math.round(listOutput) : null,
                discountBadge: badge,
                hasPeakPricing: hasPeak,
                openaiOnly,
              },
              create: {
                modelId,
                name: (typeof m.name === 'string' && m.name.trim()) || modelId,
                provider: inferProviderFromModelId(modelId),
                contextWindow: ctxStr || '128K',
                inputPricePer1M: finalInput,
                cachePricePer1M: finalCache,
                outputPricePer1M: finalOutput,
                originalInputPricePer1M: hasDiscount ? Math.round(listInput) : null,
                originalCachePricePer1M: hasDiscount ? Math.round(listCache) : null,
                originalOutputPricePer1M: hasDiscount ? Math.round(listOutput) : null,
                discountBadge: badge,
                hasPeakPricing: hasPeak,
                openaiOnly,
                isActive: true,
              },
            });
            updatedCount++;
          }
        }
      }
    } catch {
      // Fallback to /v1/models below
    }
  }

  // 2. If Management API did not return prices, sync model catalog via Gateway /v1/models
  if (!syncedPrices && config.upstreamKey) {
    const res = await fetch(`${config.upstreamUrl}/v1/models`, {
      headers: {
        authorization: `Bearer ${config.upstreamKey}`,
        'x-api-key': config.upstreamKey,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const errMsg = `Upstream returned HTTP ${res.status}`;
      await prisma.setting.upsert({
        where: { key: AI_GATEWAY_SETTING_KEYS.LAST_SYNC_STATUS },
        update: { value: errMsg },
        create: { key: AI_GATEWAY_SETTING_KEYS.LAST_SYNC_STATUS, value: errMsg },
      });
      throw new Error(errMsg);
    }

    const json = await res.json().catch(() => null);
    const list: any[] = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
    fetchedCount = list.length;

    for (const item of list) {
      const modelId = typeof item?.id === 'string' ? item.id.trim() : '';
      if (!modelId) continue;

      const p = item.pricing || item.pricing_idr || item.prices || {};
      const input = Number(p.input ?? p.input_per_1m ?? item.input_price ?? NaN);
      const cache = Number(p.cache ?? p.cache_read ?? p.cache_per_1m ?? item.cache_price ?? NaN);
      const output = Number(p.output ?? p.output_per_1m ?? item.output_price ?? NaN);
      const origInput = Number(p.original_input ?? p.originalInput ?? NaN);
      const origCache = Number(p.original_cache ?? p.originalCache ?? NaN);
      const origOutput = Number(p.original_output ?? p.originalOutput ?? NaN);
      const discountBadge =
        typeof item.discount === 'string'
          ? item.discount
          : typeof p.discount === 'string'
          ? p.discount
          : undefined;

      const existing = await prisma.aiModel.findUnique({ where: { modelId } });
      if (existing) {
        const updateData: any = {};
        if (typeof item.name === 'string' && item.name.trim()) updateData.name = item.name.trim();
        if (typeof item.context_window === 'string' && item.context_window.trim()) {
          updateData.contextWindow = item.context_window.trim();
        }
        if (Number.isFinite(input) && input >= 0) updateData.inputPricePer1M = Math.round(input);
        if (Number.isFinite(cache) && cache >= 0) updateData.cachePricePer1M = Math.round(cache);
        if (Number.isFinite(output) && output >= 0) updateData.outputPricePer1M = Math.round(output);
        if (Number.isFinite(origInput) && origInput > 0) updateData.originalInputPricePer1M = Math.round(origInput);
        if (Number.isFinite(origCache) && origCache > 0) updateData.originalCachePricePer1M = Math.round(origCache);
        if (Number.isFinite(origOutput) && origOutput > 0) updateData.originalOutputPricePer1M = Math.round(origOutput);
        if (discountBadge !== undefined) updateData.discountBadge = discountBadge || null;

        if (Object.keys(updateData).length > 0) {
          await prisma.aiModel.update({ where: { id: existing.id }, data: updateData });
          updatedCount++;
        }
      } else if (Number.isFinite(input) && Number.isFinite(output)) {
        await prisma.aiModel.create({
          data: {
            modelId,
            name: (typeof item.name === 'string' && item.name.trim()) || modelId,
            provider: inferProviderFromModelId(modelId),
            contextWindow: (typeof item.context_window === 'string' && item.context_window) || '128K',
            inputPricePer1M: Math.round(input),
            cachePricePer1M: Number.isFinite(cache) ? Math.round(cache) : Math.round(input),
            outputPricePer1M: Math.round(output),
            originalInputPricePer1M: Number.isFinite(origInput) ? Math.round(origInput) : null,
            originalCachePricePer1M: Number.isFinite(origCache) ? Math.round(origCache) : null,
            originalOutputPricePer1M: Number.isFinite(origOutput) ? Math.round(origOutput) : null,
            discountBadge: discountBadge || null,
            isActive: true,
          },
        });
        updatedCount++;
      }
    }
  }

  const nowIso = new Date().toISOString();
  const statusMsg = syncedPrices
    ? `Synced ${fetchedCount} models + live prices & promos (${updatedCount} updated)`
    : `Synced ${fetchedCount} upstream models (${updatedCount} updated)`;
  await Promise.all([
    prisma.setting.upsert({
      where: { key: AI_GATEWAY_SETTING_KEYS.LAST_SYNC_AT },
      update: { value: nowIso },
      create: { key: AI_GATEWAY_SETTING_KEYS.LAST_SYNC_AT, value: nowIso },
    }),
    prisma.setting.upsert({
      where: { key: AI_GATEWAY_SETTING_KEYS.LAST_SYNC_STATUS },
      update: { value: statusMsg },
      create: { key: AI_GATEWAY_SETTING_KEYS.LAST_SYNC_STATUS, value: statusMsg },
    }),
  ]);

  return { fetchedCount, updatedCount, syncedPrices, lastSyncAt: nowIso, status: statusMsg };
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('cf-connecting-ip')?.trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown'
  );
}

function extractAiKey(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }
  const xApiKey = req.headers.get('x-api-key');
  if (xApiKey && xApiKey.trim()) return xApiKey.trim();
  return null;
}

export interface AiImageModelSpec {
  modelId: string;
  name: string;
  description?: string;
  sizes: string[];
  sizePrices?: Record<string, number>;
  tokensPerImage: number;
  basePriceRp: number;
  maxN: number;
  maxRefImages: number;
}

export const DEFAULT_AI_IMAGE_MODELS: AiImageModelSpec[] = [
  { modelId: 'seedream-image-v5.0-flash', name: 'Seedream 5.0 Flash', description: 'Fast, low-cost 2K images.', sizes: ['2048x2048'], tokensPerImage: 11250, basePriceRp: 320, maxN: 1, maxRefImages: 4 },
  { modelId: 'wand-vega-image-lite', name: 'Vega Image Lite', description: 'Low-cost 1K images.', sizes: ['1024x1024'], tokensPerImage: 13500, basePriceRp: 384, maxN: 1, maxRefImages: 0 },
  { modelId: 'hy-image-v3.5-preview', name: 'Hunyuan Image 3.5 (preview)', description: 'Hunyuan text-to-image: square, landscape or portrait.', sizes: ['1024x768', '1280x768', '768x1024', '768x1280', '1024x1024'], tokensPerImage: 15000, basePriceRp: 427, maxN: 1, maxRefImages: 0 },
  { modelId: 'kling-image-v3', name: 'Kling Image 3', description: 'Kling text-to-image, up to 4 images per request.', sizes: ['1024x1024'], tokensPerImage: 17500, basePriceRp: 498, maxN: 4, maxRefImages: 1 },
  { modelId: 'kling-image-o1', name: 'Kling Image O1', description: 'Kling O1 image model, up to 4 images per request.', sizes: ['1024x1024'], tokensPerImage: 17500, basePriceRp: 498, maxN: 4, maxRefImages: 1 },
  { modelId: 'kling-image-v3-omni', name: 'Kling Image 3 Omni', description: 'Kling multi-reference image model.', sizes: ['1024x1024'], tokensPerImage: 17500, basePriceRp: 498, maxN: 1, maxRefImages: 4 },
  { modelId: 'vidu-image-q2', name: 'Vidu Image Q2', description: 'Vidu 1080p images (16:9).', sizes: ['1920x1080'], tokensPerImage: 18750, basePriceRp: 534, maxN: 1, maxRefImages: 3 },
  { modelId: 'hy-image-v3', name: 'Hunyuan Image 3', description: 'Hunyuan text-to-image, 1K.', sizes: ['1024x1024'], tokensPerImage: 20000, basePriceRp: 570, maxN: 1, maxRefImages: 0 },
  { modelId: 'seedream-image-v5.0-lite', name: 'Seedream 5.0 Lite', description: 'Balanced quality 2K images.', sizes: ['2048x2048'], tokensPerImage: 21875, basePriceRp: 623, maxN: 1, maxRefImages: 4 },
  { modelId: 'seedream-image-v5.0-pro', name: 'Seedream 5.0 Pro', description: 'Highest-quality Seedream, 1.5K or 2K.', sizes: ['1536x1536', '2048x2048'], sizePrices: { '1536x1536': 801, '2048x2048': 1602 }, tokensPerImage: 28125, basePriceRp: 801, maxN: 1, maxRefImages: 4 },
  { modelId: 'wand-vega-image-flash', name: 'Vega Image Flash', description: 'Fast wide images (1408x768).', sizes: ['1408x768'], tokensPerImage: 37687, basePriceRp: 1073, maxN: 1, maxRefImages: 0 },
  { modelId: 'wand-vega-image-1.5-pro', name: 'Vega Image 1.5 Pro', description: 'High-quality 1K images, takes reference images.', sizes: ['1024x1024'], tokensPerImage: 41875, basePriceRp: 1193, maxN: 1, maxRefImages: 4 },
  { modelId: 'wand-vega-image-pro', name: 'Vega Image Pro', description: 'Premium 1K images.', sizes: ['1024x1024'], tokensPerImage: 80156, basePriceRp: 2283, maxN: 1, maxRefImages: 0 },
];

/**
 * Automatically transfers `aiAutoTopupAmount` from User.balance to User.aiBalance
 * when `aiAutoTopupEnabled` is true and `aiBalance < aiAutoTopupThreshold`.
 */
export async function tryAutoTopupAiBalance(userId: number): Promise<number> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      balance: true,
      aiBalance: true,
      aiAutoTopupEnabled: true,
      aiAutoTopupThreshold: true,
      aiAutoTopupAmount: true,
    },
  });
  if (!u) return 0;
  if (
    !u.aiAutoTopupEnabled ||
    u.aiBalance >= u.aiAutoTopupThreshold ||
    u.aiAutoTopupAmount < 5000 ||
    u.balance < u.aiAutoTopupAmount
  ) {
    return u.aiBalance;
  }

  const res = await prisma.user.updateMany({
    where: {
      id: userId,
      balance: { gte: u.aiAutoTopupAmount },
      aiBalance: { lt: u.aiAutoTopupThreshold },
    },
    data: {
      balance: { decrement: u.aiAutoTopupAmount },
      aiBalance: { increment: u.aiAutoTopupAmount },
    },
  });

  if (res.count > 0) {
    return u.aiBalance + u.aiAutoTopupAmount;
  }
  const latest = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiBalance: true },
  });
  return latest?.aiBalance ?? u.aiBalance;
}

export async function authenticateAiGatewayKey(
  req: NextRequest,
  requestId: string,
  format: 'openai' | 'anthropic' = 'openai'
) {
  const ip = getClientIp(req);
  const rawKey = extractAiKey(req);

  if (!rawKey) {
    const allowed = await checkRateLimit('AI_GW_BAD_AUTH', ip, 30, 60);
    if (!allowed) {
      return { error: aiGatewayError('Too many failed authentication attempts.', 'rate_limited', 429, requestId, format) };
    }
    return {
      error: aiGatewayError(
        'Missing API key. Pass Authorization: Bearer masdika_ai_... or x-api-key header.',
        'missing_api_key',
        401,
        requestId,
        format
      ),
    };
  }

  const keyHash = hashAiGatewayKey(rawKey);
  const keyRecord = await prisma.aiGatewayKey.findUnique({
    where: { keyHash },
    include: {
      user: {
        select: {
          id: true,
          balance: true,
          aiBalance: true,
          aiAutoTopupEnabled: true,
          aiAutoTopupThreshold: true,
          aiAutoTopupAmount: true,
          isSuspended: true,
          role: true,
        },
      },
    },
  });

  if (!keyRecord || !keyRecord.isActive) {
    const allowed = await checkRateLimit('AI_GW_BAD_AUTH', ip, 30, 60);
    if (!allowed) {
      return { error: aiGatewayError('Too many failed authentication attempts.', 'rate_limited', 429, requestId, format) };
    }
    return { error: aiGatewayError('Invalid or revoked AI API key.', 'invalid_api_key', 401, requestId, format) };
  }

  if (keyRecord.expiresAt && keyRecord.expiresAt <= new Date()) {
    return { error: aiGatewayError('This AI API key has expired.', 'expired_api_key', 401, requestId, format) };
  }

  if (keyRecord.user.isSuspended) {
    return { error: aiGatewayError('Your account is suspended.', 'account_suspended', 403, requestId, format) };
  }

  // Per docs: 600 RPM default account limit
  const rateAllowed = await checkRateLimit('AI_GW_REQ', String(keyRecord.userId), 600, 60);
  if (!rateAllowed) {
    return {
      error: aiGatewayError(
        'Too many requests for this account (limit 600 per minute).',
        'rate_limited',
        429,
        requestId,
        format
      ),
    };
  }

  // Reset monthlySpent if we rolled into a new calendar month (UTC)
  const now = new Date();
  const resetAt = keyRecord.spentResetAt;
  let currentMonthlySpent = keyRecord.monthlySpent;
  if (
    resetAt.getUTCFullYear() !== now.getUTCFullYear() ||
    resetAt.getUTCMonth() !== now.getUTCMonth()
  ) {
    await prisma.aiGatewayKey.update({
      where: { id: keyRecord.id },
      data: { monthlySpent: 0, spentResetAt: now },
    });
    currentMonthlySpent = 0;
  }

  if (keyRecord.monthlyLimit !== null && currentMonthlySpent >= keyRecord.monthlyLimit) {
    return {
      error: aiGatewayError(
        'This API key has reached its monthly spend limit.',
        'key_spend_limit_reached',
        403,
        requestId,
        format
      ),
    };
  }

  let effectiveAiBalance = keyRecord.user.aiBalance;
  if (
    keyRecord.user.aiAutoTopupEnabled &&
    effectiveAiBalance < keyRecord.user.aiAutoTopupThreshold
  ) {
    effectiveAiBalance = await tryAutoTopupAiBalance(keyRecord.user.id);
    keyRecord.user.aiBalance = effectiveAiBalance;
  }

  if (effectiveAiBalance <= 0) {
    return {
      error: aiGatewayError(
        'Insufficient balance. Top up your AI balance to continue.',
        'insufficient_balance',
        402,
        requestId,
        format
      ),
    };
  }

  return { keyRecord, user: keyRecord.user };
}

export function isModelAllowedForKey(
  keyRecord: { allowedModels?: string[] | null } | null | undefined,
  modelId: string
): boolean {
  if (!keyRecord || !Array.isArray(keyRecord.allowedModels) || keyRecord.allowedModels.length === 0) {
    return true;
  }
  return keyRecord.allowedModels.includes(modelId);
}

export function parseContextWindowTokens(ctx: string | null | undefined): number {
  if (!ctx) return 128_000;
  const clean = ctx.trim().toUpperCase();
  const num = parseFloat(clean);
  if (!Number.isFinite(num) || num <= 0) return 128_000;
  if (clean.endsWith('M')) return Math.round(num * 1_000_000);
  if (clean.endsWith('K')) return Math.round(num * 1_000);
  return Math.round(num);
}

/**
 * Atomically reserves (holds) `holdRp` from `User.aiBalance` before calling upstream.
 * Triggers auto top-up once if balance is below holdRp and auto top-up is enabled.
 */
export async function reserveAiBalanceHold(userId: number, holdRp: number): Promise<boolean> {
  const safeHold = Math.max(1, Math.ceil(holdRp));
  let res = await prisma.user.updateMany({
    where: { id: userId, aiBalance: { gte: safeHold } },
    data: { aiBalance: { decrement: safeHold } },
  });
  if (res.count === 1) return true;

  // Try auto top-up if configured
  await tryAutoTopupAiBalance(userId).catch(() => 0);
  res = await prisma.user.updateMany({
    where: { id: userId, aiBalance: { gte: safeHold } },
    data: { aiBalance: { decrement: safeHold } },
  });
  return res.count === 1;
}

/**
 * Releases an unused hold when upstream fails before/at the model.
 */
export async function releaseAiBalanceHold(userId: number, holdRp: number): Promise<void> {
  const safeHold = Math.max(0, Math.ceil(holdRp));
  if (safeHold <= 0) return;
  await prisma.user.update({
    where: { id: userId },
    data: { aiBalance: { increment: safeHold } },
  });
}

export async function recordAiUsageAndCharge(params: {
  userId: number;
  apiKeyId: number;
  requestId: string;
  modelId: string;
  endpoint: string;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  costRp: number;
  upstreamCostRp: number;
  latencyMs: number;
  statusCode: number;
  heldRp?: number;
}) {
  const alreadyHeld = Math.max(0, Math.ceil(params.heldRp ?? 0));

  await prisma.$transaction(async (tx) => {
    const delta = params.costRp - alreadyHeld;
    if (delta > 0) {
      const decRes = await tx.user.updateMany({
        where: { id: params.userId, aiBalance: { gte: delta } },
        data: { aiBalance: { decrement: delta } },
      });
      if (decRes.count === 0) {
        await tx.$executeRaw`UPDATE "User" SET "aiBalance" = GREATEST(0, "aiBalance" - ${delta}) WHERE "id" = ${params.userId}`;
      }
    } else if (delta < 0) {
      // Refund unused portion of the hold
      await tx.user.update({
        where: { id: params.userId },
        data: { aiBalance: { increment: Math.abs(delta) } },
      });
    }

    if (params.costRp > 0) {
      await tx.aiGatewayKey.update({
        where: { id: params.apiKeyId },
        data: {
          monthlySpent: { increment: params.costRp },
          lastUsedAt: new Date(),
        },
      });
    } else {
      await tx.aiGatewayKey.update({
        where: { id: params.apiKeyId },
        data: { lastUsedAt: new Date() },
      });
    }

    await tx.aiUsageLog.create({
      data: {
        userId: params.userId,
        apiKeyId: params.apiKeyId,
        requestId: params.requestId,
        modelId: params.modelId,
        endpoint: params.endpoint,
        inputTokens: params.inputTokens,
        cachedTokens: params.cachedTokens,
        outputTokens: params.outputTokens,
        costRp: params.costRp,
        upstreamCostRp: params.upstreamCostRp,
        latencyMs: params.latencyMs,
        statusCode: params.statusCode,
      },
    });
  });

  // Trigger auto top-up in background if AI balance fell below threshold after charge
  if (params.costRp > 0) {
    await tryAutoTopupAiBalance(params.userId).catch(() => {});
  }
}
