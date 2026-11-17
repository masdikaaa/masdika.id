import * as crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './prisma';
import { decryptDeterministic } from './encryption';
import { checkRateLimit } from './rate-limit';
import { getUserServicesCommitment } from './billing-commitment';
import { redis } from './redis';
import { sendAiInsufficientBalanceEmail, sendAiBalanceTopupEmail } from './email';

import {
  DEFAULT_AI_MODELS,
  DEFAULT_AI_IMAGE_MODELS,
  AiModelSeed,
  AiImageModelSpec,
} from './ai-gateway-constants';
export * from './ai-gateway-constants';

export const AI_GATEWAY_SETTING_KEYS = {
  ENABLED: 'ai_gateway_enabled',
  UPSTREAM_URL: 'ai_gateway_upstream_url',
  UPSTREAM_KEY: 'ai_gateway_upstream_key',
  MANAGEMENT_KEY: 'ai_gateway_management_key',
  MARKUP_PERCENT: 'ai_gateway_markup_percent',
  TOPUP_FEE_RP: 'ai_gateway_topup_fee_rp',
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
          AI_GATEWAY_SETTING_KEYS.TOPUP_FEE_RP,
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
  const topupFeeRaw = Number(map.get(AI_GATEWAY_SETTING_KEYS.TOPUP_FEE_RP) ?? '5000');
  const topupFeeRp = Number.isFinite(topupFeeRaw) && topupFeeRaw >= 0 ? Math.round(topupFeeRaw) : 5000;
  const lastSyncAt = map.get(AI_GATEWAY_SETTING_KEYS.LAST_SYNC_AT) || null;
  const lastSyncStatus = map.get(AI_GATEWAY_SETTING_KEYS.LAST_SYNC_STATUS) || null;

  return {
    enabled,
    upstreamUrl,
    upstreamKey,
    managementKey,
    markupPercent,
    topupFeeRp,
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

/**
 * Automatically transfers `aiAutoTopupAmount` from User.balance to User.aiBalance
 * when `aiAutoTopupEnabled` is true and `aiBalance < aiAutoTopupThreshold`.
 */
export async function tryAutoTopupAiBalance(userId: number): Promise<number> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      name: true,
      balance: true,
      aiBalance: true,
      aiAutoTopupEnabled: true,
      aiAutoTopupThreshold: true,
      aiAutoTopupAmount: true,
    },
  });
  if (!u) return 0;
  const config = await getAiGatewayConfig();
  const totalWalletDeduction = u.aiAutoTopupAmount + config.topupFeeRp;
  if (
    !u.aiAutoTopupEnabled ||
    u.aiBalance >= u.aiAutoTopupThreshold ||
    u.aiAutoTopupAmount < 10000 ||
    u.balance < totalWalletDeduction
  ) {
    return u.aiBalance;
  }

  let createdInvNum: string | null = null;
  const updated = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    const commitment = await getUserServicesCommitment(userId, tx);
    const requiredWallet = commitment.totalMonthly + totalWalletDeduction;

    const res = await tx.user.updateMany({
      where: {
        id: userId,
        balance: { gte: requiredWallet },
        aiBalance: { lt: u.aiAutoTopupThreshold },
      },
      data: {
        balance: { decrement: totalWalletDeduction },
        aiBalance: { increment: u.aiAutoTopupAmount },
      },
    });
    if (res.count === 0) return null;

    const invNum = `INV-AI-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    createdInvNum = invNum;
    await tx.invoice.create({
      data: {
        invoiceNumber: invNum,
        merchantOrderId: invNum,
        userId,
        amount: totalWalletDeduction,
        status: 'PAID',
        type: 'AI_CREDIT',
        paymentMethod: 'Account Balance',
        reference: 'AI_CREDIT_AUTO_TOPUP',
        paidAt: new Date(),
        details: JSON.stringify({
          service: 'AI_GATEWAY',
          aiCreditAmount: u.aiAutoTopupAmount,
          adminFeeRp: config.topupFeeRp,
          totalPaidRp: totalWalletDeduction,
          mode: 'AUTO_TOPUP',
        }),
      },
    });

    const latest = await tx.user.findUnique({
      where: { id: userId },
      select: { aiBalance: true },
    });
    return latest?.aiBalance ?? u.aiBalance + u.aiAutoTopupAmount;
  });

  if (updated !== null) {
    await clearAiInsufficientBalanceNotice(userId).catch(() => {});
    if (createdInvNum && u.email) {
      sendAiBalanceTopupEmail({
        userId,
        toEmail: u.email,
        customerName: u.name,
        amount: u.aiAutoTopupAmount,
        topupFeeRp: config.topupFeeRp,
        totalPaidRp: totalWalletDeduction,
        newBalance: updated,
        invoiceNumber: createdInvNum,
        mode: 'AUTO_TOPUP',
      }).catch((err) => console.error('Error sending AI auto top-up email:', err));
    }
    return updated;
  }
  const latest = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiBalance: true },
  });
  return latest?.aiBalance ?? u.aiBalance;
}

const memInsufficientNotified = new Set<number>();

/**
 * Sends a one-time email when a user hits insufficient AI balance.
 * Suppressed on repeated retries until the user tops up AI balance again.
 */
export async function notifyAiInsufficientBalanceOnce(userId: number, requiredRp?: number): Promise<void> {
  const redisKey = `ai_insufficient_notified:${userId}`;
  let shouldSend = false;

  if (redis) {
    try {
      const setRes = await redis.set(redisKey, '1', 'EX', 30 * 24 * 60 * 60, 'NX');
      shouldSend = setRes === 'OK';
    } catch {
      if (!memInsufficientNotified.has(userId)) {
        memInsufficientNotified.add(userId);
        shouldSend = true;
      }
    }
  } else if (!memInsufficientNotified.has(userId)) {
    memInsufficientNotified.add(userId);
    shouldSend = true;
  }

  if (!shouldSend) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, aiBalance: true },
  });
  if (!user?.email) return;

  await sendAiInsufficientBalanceEmail({
    userId: user.id,
    toEmail: user.email,
    customerName: user.name || 'Customer',
    currentAiBalance: user.aiBalance ?? 0,
    requiredRp,
  });
}

export async function clearAiInsufficientBalanceNotice(userId: number): Promise<void> {
  memInsufficientNotified.delete(userId);
  if (redis) {
    await redis.del(`ai_insufficient_notified:${userId}`).catch(() => {});
  }
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
    notifyAiInsufficientBalanceOnce(keyRecord.user.id).catch(() => {});
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
  if (res.count !== 1) {
    notifyAiInsufficientBalanceOnce(userId, safeHold).catch(() => {});
    return false;
  }
  return true;
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
  apiKeyId: number | null;
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

    if (params.apiKeyId !== null && params.apiKeyId !== undefined) {
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
