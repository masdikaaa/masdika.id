import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { encryptDeterministic } from '@/lib/encryption';
import {
  AI_GATEWAY_SETTING_KEYS,
  ensureAiModelsExist,
  getAiGatewayConfig,
  syncAiModelsFromUpstream,
} from '@/lib/ai-gateway';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    await ensureAiModelsExist();
    const [config, models, aggregate, recentLogs] = await Promise.all([
      getAiGatewayConfig(),
      prisma.aiModel.findMany({
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      }),
      prisma.aiUsageLog.aggregate({
        _count: { id: true },
        _sum: {
          costRp: true,
          upstreamCostRp: true,
          inputTokens: true,
          cachedTokens: true,
          outputTokens: true,
        },
      }),
      prisma.aiUsageLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 40,
        include: {
          user: { select: { id: true, email: true, name: true } },
          apiKey: { select: { name: true, keyPrefix: true } },
        },
      }),
    ]);

    const maskedKey = config.upstreamKey
      ? `${config.upstreamKey.slice(0, 10)}••••${config.upstreamKey.slice(-4)}`
      : '';

    return NextResponse.json({
      success: true,
      data: {
        config: {
          enabled: config.enabled,
          upstreamUrl: config.upstreamUrl,
          hasUpstreamKey: Boolean(config.upstreamKey),
          maskedUpstreamKey: maskedKey,
          markupPercent: config.markupPercent,
          lastSyncAt: config.lastSyncAt,
          lastSyncStatus: config.lastSyncStatus,
        },
        models,
        stats: {
          totalRequests: aggregate._count.id || 0,
          totalRevenueRp: aggregate._sum.costRp || 0,
          totalUpstreamCostRp: aggregate._sum.upstreamCostRp || 0,
          totalProfitRp: (aggregate._sum.costRp || 0) - (aggregate._sum.upstreamCostRp || 0),
          totalTokens:
            (aggregate._sum.inputTokens || 0) +
            (aggregate._sum.cachedTokens || 0) +
            (aggregate._sum.outputTokens || 0),
        },
        recentLogs,
      },
    });
  } catch (error) {
    console.error('[ADMIN_AI_GATEWAY_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json().catch(() => ({}));

    if (body?.action === 'sync_upstream') {
      try {
        const syncRes = await syncAiModelsFromUpstream();
        return NextResponse.json({ success: true, data: syncRes });
      } catch (err: any) {
        return NextResponse.json(
          { error: err?.message || 'Failed to sync models from upstream' },
          { status: 502 }
        );
      }
    }

    // Update a single AI model row
    if (body?.action === 'update_model') {
      const id = Number(body.id);
      if (!Number.isSafeInteger(id) || id <= 0) {
        return NextResponse.json({ error: 'Invalid model ID' }, { status: 400 });
      }
      const data: any = {};
      if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
      if (typeof body.openaiOnly === 'boolean') data.openaiOnly = body.openaiOnly;
      if (body.discountBadge !== undefined) {
        data.discountBadge =
          typeof body.discountBadge === 'string' && body.discountBadge.trim()
            ? body.discountBadge.trim().slice(0, 24)
            : null;
      }
      for (const field of ['inputPricePer1M', 'cachePricePer1M', 'outputPricePer1M'] as const) {
        if (body[field] !== undefined) {
          const val = Number(body[field]);
          if (!Number.isSafeInteger(val) || val < 0) {
            return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 });
          }
          data[field] = val;
        }
      }
      for (const field of ['originalInputPricePer1M', 'originalCachePricePer1M', 'originalOutputPricePer1M'] as const) {
        if (body[field] !== undefined) {
          if (body[field] === null || body[field] === '' || Number(body[field]) === 0) {
            data[field] = null;
          } else {
            const val = Number(body[field]);
            if (!Number.isSafeInteger(val) || val < 0) {
              return NextResponse.json({ error: `Invalid ${field}` }, { status: 400 });
            }
            data[field] = val;
          }
        }
      }
      const updated = await prisma.aiModel.update({ where: { id }, data });
      return NextResponse.json({ success: true, model: updated });
    }

    // Update gateway settings
    const ops: Promise<any>[] = [];
    if (typeof body.enabled === 'boolean') {
      ops.push(
        prisma.setting.upsert({
          where: { key: AI_GATEWAY_SETTING_KEYS.ENABLED },
          update: { value: String(body.enabled) },
          create: { key: AI_GATEWAY_SETTING_KEYS.ENABLED, value: String(body.enabled) },
        })
      );
    }
    if (typeof body.upstreamUrl === 'string' && body.upstreamUrl.trim()) {
      const cleanUrl = body.upstreamUrl.trim().replace(/\/+$/, '');
      if (!/^https?:\/\//i.test(cleanUrl)) {
        return NextResponse.json({ error: 'Upstream URL must start with http:// or https://' }, { status: 400 });
      }
      ops.push(
        prisma.setting.upsert({
          where: { key: AI_GATEWAY_SETTING_KEYS.UPSTREAM_URL },
          update: { value: cleanUrl },
          create: { key: AI_GATEWAY_SETTING_KEYS.UPSTREAM_URL, value: cleanUrl },
        })
      );
    }
    if (typeof body.upstreamKey === 'string' && body.upstreamKey.trim()) {
      const encrypted = encryptDeterministic(body.upstreamKey.trim());
      ops.push(
        prisma.setting.upsert({
          where: { key: AI_GATEWAY_SETTING_KEYS.UPSTREAM_KEY },
          update: { value: encrypted },
          create: { key: AI_GATEWAY_SETTING_KEYS.UPSTREAM_KEY, value: encrypted },
        })
      );
    }
    if (body.markupPercent !== undefined) {
      const markup = Number(body.markupPercent);
      if (!Number.isFinite(markup) || markup < 0 || markup > 500) {
        return NextResponse.json({ error: 'Markup percent must be between 0 and 500' }, { status: 400 });
      }
      ops.push(
        prisma.setting.upsert({
          where: { key: AI_GATEWAY_SETTING_KEYS.MARKUP_PERCENT },
          update: { value: String(markup) },
          create: { key: AI_GATEWAY_SETTING_KEYS.MARKUP_PERCENT, value: String(markup) },
        })
      );
    }

    await Promise.all(ops);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ADMIN_AI_GATEWAY_PUT]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
