import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  DEFAULT_AI_IMAGE_MODELS,
  applyMarkupPrice,
  ensureAiModelsExist,
  getAiGatewayConfig,
  isPeakHourWib,
} from '@/lib/ai-gateway';
import {
  aiMgmtOptionsResponse,
  aiMgmtSuccess,
  authenticateAiManagementKey,
} from '@/lib/ai-management-auth';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return aiMgmtOptionsResponse();
}

function parseContextTokens(ctx: string): number {
  const s = ctx.trim().toUpperCase();
  const m = s.match(/^(\d+(?:\.\d+)?)\s*M$/);
  if (m) return Math.round(Number(m[1]) * 1_000_000);
  const k = s.match(/^(\d+(?:\.\d+)?)\s*K$/);
  if (k) return Math.round(Number(k[1]) * 1_000);
  const n = Number(s.replace(/[^0-9]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : 128000;
}

export async function GET(req: NextRequest) {
  const auth = await authenticateAiManagementKey(req);
  if ('error' in auth) return auth.error;

  await ensureAiModelsExist();
  const [config, models] = await Promise.all([
    getAiGatewayConfig(),
    prisma.aiModel.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    }),
  ]);

  const peakNow = isPeakHourWib();

  return aiMgmtSuccess({
    currency: 'IDR',
    unit: 'per 1M tokens',
    taxPercent: 11,
    models: models.map((m) => {
      const input = applyMarkupPrice(m.inputPricePer1M, config.markupPercent);
      const cached = applyMarkupPrice(m.cachePricePer1M, config.markupPercent);
      const output = applyMarkupPrice(m.outputPricePer1M, config.markupPercent);
      const origInput = m.originalInputPricePer1M
        ? applyMarkupPrice(m.originalInputPricePer1M, config.markupPercent)
        : null;
      const origCached = m.originalCachePricePer1M
        ? applyMarkupPrice(m.originalCachePricePer1M, config.markupPercent)
        : null;
      const origOutput = m.originalOutputPricePer1M
        ? applyMarkupPrice(m.originalOutputPricePer1M, config.markupPercent)
        : null;
      const ctxTokens = parseContextTokens(m.contextWindow);

      return {
        code: m.modelId,
        name: m.name,
        family: m.provider.toLowerCase(),
        limits: {
          context: ctxTokens,
          maxInput: ctxTokens,
          maxOutput: 16384,
        },
        capabilities: m.provider === 'Qwen' && m.modelId.includes('vl')
          ? ['vision', 'tools']
          : ['tools', 'reasoning'],
        formats: m.openaiOnly ? ['openai'] : ['openai', 'anthropic'],
        peakHours: m.hasPeakPricing ? 'Mon-Fri 08:00-11:00, 13:00-17:00 WIB' : null,
        currentWindow: m.hasPeakPricing ? (peakNow ? 'peak' : 'off_peak') : 'all',
        sunset: null,
        campaign: m.discountBadge || null,
        tiers: [
          {
            window: m.hasPeakPricing ? (peakNow ? 'peak' : 'off_peak') : 'all',
            minInputTokens: 0,
            input: origInput ?? input,
            output: origOutput ?? output,
            cached: origCached ?? cached,
            promo: m.discountBadge
              ? { input, output, cached }
              : null,
          },
        ],
      };
    }),
    imageModels: DEFAULT_AI_IMAGE_MODELS.map((im) => ({
      code: im.modelId,
      name: im.name,
      description: im.description || null,
      defaultSize: im.sizes[0] || '1024x1024',
      maxN: im.maxN,
      refImages: im.maxRefImages,
      sizes: im.sizes.map((sz) => ({
        size: sz,
        tokens: im.tokensPerImage,
        price: applyMarkupPrice(im.sizePrices?.[sz] ?? im.basePriceRp, config.markupPercent),
      })),
    })),
  });
}
