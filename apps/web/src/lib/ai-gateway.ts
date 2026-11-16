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
  { modelId: 'qwen3.8-27b', name: 'Qwen3.8 27B', provider: 'Qwen', contextWindow: '1M', inputPricePer1M: 10235, cachePricePer1M: 2047, outputPricePer1M: 61410 },
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
  MARKUP_PERCENT: 'ai_gateway_markup_percent',
  LAST_SYNC_AT: 'ai_gateway_last_sync_at',
  LAST_SYNC_STATUS: 'ai_gateway_last_sync_status',
} as const;

export function aiGatewayError(message: string, code: string, status: number, requestId?: string) {
  return NextResponse.json(
    {
      error: { message, type: code, code },
      ...(requestId ? { request_id: requestId } : {}),
    },
    {
      status,
      headers: requestId ? { 'x-request-id': requestId } : undefined,
    }
  );
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
  model: { inputPricePer1M: number; cachePricePer1M: number; outputPricePer1M: number },
  markupPercent: number
): { costRp: number; upstreamCostRp: number } {
  const input = Math.max(0, usage.inputTokens);
  const cached = Math.max(0, usage.cachedTokens);
  const output = Math.max(0, usage.outputTokens);

  const rawUpstream =
    (input * model.inputPricePer1M +
      cached * model.cachePricePer1M +
      output * model.outputPricePer1M) /
    1_000_000;

  const totalTokens = input + cached + output;
  const upstreamCostRp = totalTokens > 0 ? Math.max(1, Math.ceil(rawUpstream)) : 0;
  const safeMarkup = Math.max(0, Number.isFinite(markupPercent) ? markupPercent : 0);
  const costRp =
    totalTokens > 0 ? Math.max(1, Math.ceil(rawUpstream * (1 + safeMarkup / 100))) : 0;

  return { costRp, upstreamCostRp };
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
  const markupRaw = Number(map.get(AI_GATEWAY_SETTING_KEYS.MARKUP_PERCENT) ?? '0');
  const markupPercent = Number.isFinite(markupRaw) && markupRaw >= 0 ? markupRaw : 0;
  const lastSyncAt = map.get(AI_GATEWAY_SETTING_KEYS.LAST_SYNC_AT) || null;
  const lastSyncStatus = map.get(AI_GATEWAY_SETTING_KEYS.LAST_SYNC_STATUS) || null;

  return { enabled, upstreamUrl, upstreamKey, markupPercent, lastSyncAt, lastSyncStatus };
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

export async function syncAiModelsFromUpstream() {
  await ensureAiModelsExist();
  const config = await getAiGatewayConfig();
  if (!config.upstreamKey) {
    throw new Error('Master Upstream Key is not configured yet.');
  }

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
  let updatedCount = 0;

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

  const nowIso = new Date().toISOString();
  const statusMsg = `Synced ${list.length} upstream models (${updatedCount} updated)`;
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

  return { fetchedCount: list.length, updatedCount, lastSyncAt: nowIso, status: statusMsg };
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

export async function authenticateAiGatewayKey(req: NextRequest, requestId: string) {
  const ip = getClientIp(req);
  const rawKey = extractAiKey(req);

  if (!rawKey) {
    const allowed = await checkRateLimit('AI_GW_BAD_AUTH', ip, 30, 60);
    if (!allowed) {
      return { error: aiGatewayError('Too many failed authentication attempts.', 'rate_limited', 429, requestId) };
    }
    return {
      error: aiGatewayError(
        'Missing API key. Pass Authorization: Bearer masdika_ai_... or x-api-key header.',
        'invalid_api_key',
        401,
        requestId
      ),
    };
  }

  const keyHash = hashAiGatewayKey(rawKey);
  const keyRecord = await prisma.aiGatewayKey.findUnique({
    where: { keyHash },
    include: {
      user: { select: { id: true, balance: true, isSuspended: true, role: true } },
    },
  });

  if (!keyRecord || !keyRecord.isActive) {
    const allowed = await checkRateLimit('AI_GW_BAD_AUTH', ip, 30, 60);
    if (!allowed) {
      return { error: aiGatewayError('Too many failed authentication attempts.', 'rate_limited', 429, requestId) };
    }
    return { error: aiGatewayError('Invalid or revoked AI API key.', 'invalid_api_key', 401, requestId) };
  }

  if (keyRecord.user.isSuspended) {
    return { error: aiGatewayError('Your account is suspended.', 'account_suspended', 403, requestId) };
  }

  const rateAllowed = await checkRateLimit('AI_GW_REQ', String(keyRecord.userId), 120, 60);
  if (!rateAllowed) {
    return { error: aiGatewayError('Rate limit exceeded. Please slow down.', 'rate_limited', 429, requestId) };
  }

  // Reset monthlySpent if we rolled into a new calendar month
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
        requestId
      ),
    };
  }

  if (keyRecord.user.balance <= 0) {
    return {
      error: aiGatewayError(
        'Insufficient Masdika wallet balance. Please top up first.',
        'insufficient_balance',
        402,
        requestId
      ),
    };
  }

  return { keyRecord, user: keyRecord.user };
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
}) {
  await prisma.$transaction(async (tx) => {
    if (params.costRp > 0) {
      const decRes = await tx.user.updateMany({
        where: { id: params.userId, balance: { gte: params.costRp } },
        data: { balance: { decrement: params.costRp } },
      });
      if (decRes.count === 0) {
        // Clamp atomically to 0 if concurrent requests or response size exceeded remaining balance
        await tx.$executeRaw`UPDATE "User" SET "balance" = GREATEST(0, "balance" - ${params.costRp}) WHERE "id" = ${params.userId}`;
      }
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
}
