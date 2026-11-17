import * as crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  AI_CORS_HEADERS,
  aiGatewayOptionsResponse,
  applyMarkupPrice,
  authenticateAiGatewayKey,
  ensureAiModelsExist,
  getActiveAiModelsCached,
  getAiGatewayConfig,
  isModelAllowedForKey,
} from '@/lib/ai-gateway';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return aiGatewayOptionsResponse();
}

export async function GET(req: NextRequest) {
  const requestId = `req_${crypto.randomBytes(8).toString('hex')}`;
  const auth = await authenticateAiGatewayKey(req, requestId, 'openai');
  if ('error' in auth && auth.error) return auth.error;

  await ensureAiModelsExist();
  const [config, models] = await Promise.all([
    getAiGatewayConfig(),
    getActiveAiModelsCached(),
  ]);

  const allowedModels = models.filter((m) => isModelAllowedForKey(auth.keyRecord, m.modelId));
  const data = allowedModels.map((m) => ({
    id: m.modelId,
    object: 'model',
    type: 'model',
    display_name: m.name,
    name: m.name,
    owned_by: 'masdika',
    created: Math.floor(new Date(m.createdAt).getTime() / 1000),
    created_at: new Date(m.createdAt).toISOString(),
    context_window: m.contextWindow,
    pricing_idr_per_1m: {
      input: applyMarkupPrice(m.inputPricePer1M, config.markupPercent),
      cache: applyMarkupPrice(m.cachePricePer1M, config.markupPercent),
      output: applyMarkupPrice(m.outputPricePer1M, config.markupPercent),
    },
  }));

  return NextResponse.json(
    {
      object: 'list',
      data,
      has_more: false,
      first_id: data[0]?.id ?? null,
      last_id: data[data.length - 1]?.id ?? null,
    },
    {
      headers: {
        ...AI_CORS_HEADERS,
        'x-request-id': requestId,
      },
    }
  );
}
