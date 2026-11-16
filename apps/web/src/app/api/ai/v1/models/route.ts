import * as crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  applyMarkupPrice,
  authenticateAiGatewayKey,
  ensureAiModelsExist,
  getAiGatewayConfig,
} from '@/lib/ai-gateway';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const requestId = `req_${crypto.randomBytes(8).toString('hex')}`;
  const auth = await authenticateAiGatewayKey(req, requestId);
  if ('error' in auth && auth.error) return auth.error;

  await ensureAiModelsExist();
  const [config, models] = await Promise.all([
    getAiGatewayConfig(),
    prisma.aiModel.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    }),
  ]);

  return NextResponse.json(
    {
      object: 'list',
      data: models.map((m) => ({
        id: m.modelId,
        object: 'model',
        owned_by: m.provider.toLowerCase(),
        name: m.name,
        context_window: m.contextWindow,
        pricing_idr_per_1m: {
          input: applyMarkupPrice(m.inputPricePer1M, config.markupPercent),
          cache: applyMarkupPrice(m.cachePricePer1M, config.markupPercent),
          output: applyMarkupPrice(m.outputPricePer1M, config.markupPercent),
        },
      })),
    },
    { headers: { 'x-request-id': requestId } }
  );
}
