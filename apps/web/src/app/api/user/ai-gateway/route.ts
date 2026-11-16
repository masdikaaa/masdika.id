import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import {
  applyMarkupPrice,
  ensureAiModelsExist,
  generateAiGatewayKey,
  getAiGatewayConfig,
} from '@/lib/ai-gateway';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const user = auth.user!;

    await ensureAiModelsExist();
    const [config, models, keys, usageLogs, aggregate] = await Promise.all([
      getAiGatewayConfig(),
      prisma.aiModel.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      }),
      prisma.aiGatewayKey.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          monthlyLimit: true,
          monthlySpent: true,
          isActive: true,
          lastUsedAt: true,
          createdAt: true,
        },
      }),
      prisma.aiUsageLog.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          apiKey: { select: { name: true, keyPrefix: true } },
        },
      }),
      prisma.aiUsageLog.aggregate({
        where: { userId: user.id },
        _count: { id: true },
        _sum: {
          costRp: true,
          inputTokens: true,
          cachedTokens: true,
          outputTokens: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        enabled: config.enabled && Boolean(config.upstreamKey),
        balance: user.balance,
        markupPercent: config.markupPercent,
        models: models.map((m) => ({
          id: m.id,
          modelId: m.modelId,
          name: m.name,
          provider: m.provider,
          contextWindow: m.contextWindow,
          inputPricePer1M: applyMarkupPrice(m.inputPricePer1M, config.markupPercent),
          cachePricePer1M: applyMarkupPrice(m.cachePricePer1M, config.markupPercent),
          outputPricePer1M: applyMarkupPrice(m.outputPricePer1M, config.markupPercent),
          originalInputPricePer1M: m.originalInputPricePer1M
            ? applyMarkupPrice(m.originalInputPricePer1M, config.markupPercent)
            : null,
          originalCachePricePer1M: m.originalCachePricePer1M
            ? applyMarkupPrice(m.originalCachePricePer1M, config.markupPercent)
            : null,
          originalOutputPricePer1M: m.originalOutputPricePer1M
            ? applyMarkupPrice(m.originalOutputPricePer1M, config.markupPercent)
            : null,
          discountBadge: m.discountBadge,
          openaiOnly: m.openaiOnly,
          hasPeakPricing: m.hasPeakPricing,
        })),
        keys,
        usageLogs,
        stats: {
          totalRequests: aggregate._count.id || 0,
          totalSpentRp: aggregate._sum.costRp || 0,
          totalTokens:
            (aggregate._sum.inputTokens || 0) +
            (aggregate._sum.cachedTokens || 0) +
            (aggregate._sum.outputTokens || 0),
        },
      },
    });
  } catch (error) {
    console.error('[USER_AI_GATEWAY_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.impersonatedBy) {
      return NextResponse.json({ error: 'Disabled during impersonation' }, { status: 403 });
    }
    const user = auth.user!;

    const body = await req.json().catch(() => ({}));
    const safeName =
      typeof body?.name === 'string' && body.name.trim().length > 0
        ? body.name.trim().slice(0, 64)
        : 'AI Gateway Key';

    let monthlyLimit: number | null = null;
    if (body?.monthlyLimit !== undefined && body.monthlyLimit !== null && body.monthlyLimit !== '') {
      const parsedLimit = Number(body.monthlyLimit);
      if (!Number.isSafeInteger(parsedLimit) || parsedLimit < 1000) {
        return NextResponse.json(
          { error: 'Monthly spend limit must be at least Rp 1.000 or empty for unlimited' },
          { status: 400 }
        );
      }
      monthlyLimit = parsedLimit;
    }

    const { rawKey, keyHash, keyPrefix } = generateAiGatewayKey();

    const created = await prisma.$transaction(async (tx) => {
      const count = await tx.aiGatewayKey.count({ where: { userId: user.id } });
      if (count >= 10) throw new Error('KEY_LIMIT_REACHED');

      return tx.aiGatewayKey.create({
        data: {
          userId: user.id,
          name: safeName,
          keyHash,
          keyPrefix,
          monthlyLimit,
        },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          monthlyLimit: true,
          monthlySpent: true,
          isActive: true,
          createdAt: true,
        },
      });
    });

    return NextResponse.json({
      success: true,
      apiKey: created,
      rawKey,
    });
  } catch (error: any) {
    if (error?.message === 'KEY_LIMIT_REACHED') {
      return NextResponse.json(
        { error: 'Maximum limit of 10 AI Gateway keys reached.' },
        { status: 400 }
      );
    }
    console.error('[USER_AI_GATEWAY_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const user = auth.user!;

    const body = await req.json().catch(() => ({}));
    const keyId = Number(body?.id);
    if (!Number.isSafeInteger(keyId) || keyId <= 0) {
      return NextResponse.json({ error: 'Valid Key ID required' }, { status: 400 });
    }

    const updates: { isActive?: boolean; name?: string } = {};
    if (typeof body.isActive === 'boolean') updates.isActive = body.isActive;
    if (typeof body.name === 'string' && body.name.trim()) {
      updates.name = body.name.trim().slice(0, 64);
    }

    await prisma.aiGatewayKey.updateMany({
      where: { id: keyId, userId: user.id },
      data: updates,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[USER_AI_GATEWAY_PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.impersonatedBy) {
      return NextResponse.json({ error: 'Disabled during impersonation' }, { status: 403 });
    }
    const user = auth.user!;

    const body = await req.json().catch(() => ({}));
    const keyId = Number(body?.id);
    if (!Number.isSafeInteger(keyId) || keyId <= 0) {
      return NextResponse.json({ error: 'Valid Key ID required' }, { status: 400 });
    }

    await prisma.aiGatewayKey.deleteMany({
      where: { id: keyId, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[USER_AI_GATEWAY_DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
