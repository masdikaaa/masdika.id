import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import {
  AI_GATEWAY_SETTING_KEYS,
  DEFAULT_AI_IMAGE_MODELS,
  applyMarkupPrice,
  ensureAiModelsExist,
  getAiGatewayConfig,
  invalidateAiGatewayConfigCache,
  invalidateAiKeyAuthCacheForUser,
  invalidateAiModelCache,
  syncAiModelsFromUpstream,
} from '@/lib/ai-gateway';
import { decryptDeterministic, encryptDeterministic } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    await ensureAiModelsExist();
    const config = await getAiGatewayConfig();

    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const [models, totalKeys, usageStats, recentLogs, rawCustomers, timelineLogs, modelRankingsRaw] = await Promise.all([
      prisma.aiModel.findMany({
        orderBy: [{ sortOrder: 'asc' }, { inputPricePer1M: 'asc' }],
      }),
      prisma.aiGatewayKey.count({ where: { isActive: true } }),
      prisma.aiUsageLog.aggregate({
        _count: { id: true },
        _sum: {
          inputTokens: true,
          cachedTokens: true,
          outputTokens: true,
          costRp: true,
          upstreamCostRp: true,
        },
      }),
      prisma.aiUsageLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
          user: { select: { id: true, name: true, email: true } },
          apiKey: { select: { name: true, keyPrefix: true } },
        },
      }),
      prisma.user.findMany({
        orderBy: [{ aiBalance: 'desc' }, { balance: 'desc' }, { id: 'asc' }],
        take: 100,
        select: {
          id: true,
          name: true,
          email: true,
          balance: true,
          aiBalance: true,
          aiAutoTopupEnabled: true,
          aiAutoTopupThreshold: true,
          aiAutoTopupAmount: true,
          _count: {
            select: {
              aiGatewayKeys: true,
              aiUsageLogs: true,
            },
          },
        },
      }),
      prisma.aiUsageLog.findMany({
        where: { createdAt: { gte: fourteenDaysAgo } },
        select: {
          createdAt: true,
          inputTokens: true,
          cachedTokens: true,
          outputTokens: true,
          costRp: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.aiUsageLog.groupBy({
        by: ['modelId'],
        _count: { id: true },
        _sum: {
          inputTokens: true,
          cachedTokens: true,
          outputTokens: true,
          costRp: true,
          upstreamCostRp: true,
        },
        _avg: {
          latencyMs: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 20,
      }),
    ]);

    const totalRevenueIdr = usageStats._sum.costRp ?? 0;
    const totalUpstreamCostIdr = usageStats._sum.upstreamCostRp ?? 0;
    const totalProfitIdr = totalRevenueIdr - totalUpstreamCostIdr;

    const customers = rawCustomers.map((u) => {
      let email = u.email;
      let name = u.name;
      try {
        email = decryptDeterministic(u.email) || u.email;
      } catch {
        // fallback
      }
      try {
        if (name) name = decryptDeterministic(name) || name;
      } catch {
        // fallback
      }
      return {
        ...u,
        name,
        email,
      };
    });

    const formattedLogs = recentLogs.map((log) => {
      let userEmail = log.user?.email || '';
      let userName = log.user?.name || null;
      try {
        if (userEmail) userEmail = decryptDeterministic(userEmail) || userEmail;
      } catch {
        // fallback
      }
      try {
        if (userName) userName = decryptDeterministic(userName) || userName;
      } catch {
        // fallback
      }
      return {
        ...log,
        user: log.user ? { ...log.user, name: userName, email: userEmail } : log.user,
      };
    });

    const totalCustomerAiBalance = customers.reduce((acc, c) => acc + (c.aiBalance || 0), 0);

    const imageModels = DEFAULT_AI_IMAGE_MODELS.map((m) => ({
      ...m,
      sellPriceRp: applyMarkupPrice(m.basePriceRp, config.markupPercent),
    }));

    const timelineMap = new Map<string, { date: string; fullDate: string; inputTokens: number; cachedTokens: number; outputTokens: number; totalTokens: number; requests: number; costRp: number }>();

    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      timelineMap.set(key, {
        date: dateLabel,
        fullDate: key,
        inputTokens: 0,
        cachedTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        requests: 0,
        costRp: 0,
      });
    }

    for (const log of timelineLogs) {
      const key = log.createdAt.toISOString().slice(0, 10);
      let entry = timelineMap.get(key);
      if (!entry) {
        const dateLabel = log.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        entry = {
          date: dateLabel,
          fullDate: key,
          inputTokens: 0,
          cachedTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          requests: 0,
          costRp: 0,
        };
        timelineMap.set(key, entry);
      }
      const inT = log.inputTokens || 0;
      const outT = log.outputTokens || 0;
      const cacheT = log.cachedTokens || 0;
      entry.inputTokens += inT;
      entry.outputTokens += outT;
      entry.cachedTokens += cacheT;
      entry.totalTokens += inT + outT + cacheT;
      entry.requests += 1;
      entry.costRp += log.costRp || 0;
    }

    const tokenUsageTimeline = Array.from(timelineMap.values());

    const totalRequestsCount = usageStats._count.id || 1;
    const modelLookup = new Map(models.map((m) => [m.modelId, m]));
    const imageModelLookup = new Map(DEFAULT_AI_IMAGE_MODELS.map((m) => [m.modelId, m]));

    const topModelRankings = modelRankingsRaw.slice(0, 20).map((item, index) => {
      const dbModel = modelLookup.get(item.modelId);
      const imgModel = imageModelLookup.get(item.modelId);

      const requests = item._count.id || 0;
      const inputTokens = item._sum.inputTokens || 0;
      const cachedTokens = item._sum.cachedTokens || 0;
      const outputTokens = item._sum.outputTokens || 0;
      const totalTokens = inputTokens + cachedTokens + outputTokens;
      const revenueRp = item._sum.costRp || 0;
      const upstreamCostRp = item._sum.upstreamCostRp || 0;
      const profitRp = revenueRp - upstreamCostRp;
      const marginPercent = revenueRp > 0 ? Math.round(((revenueRp - upstreamCostRp) / revenueRp) * 100) : 0;
      const avgLatencyMs = Math.round(item._avg.latencyMs || 0);
      const requestSharePct = Number(((requests / totalRequestsCount) * 100).toFixed(1));

      return {
        rank: index + 1,
        modelId: item.modelId,
        name: dbModel?.name || imgModel?.name || item.modelId,
        provider: dbModel?.provider || (imgModel ? 'Image / Diffusion' : 'Custom'),
        contextWindow: dbModel?.contextWindow || (imgModel ? `${imgModel.tokensPerImage.toLocaleString('id-ID')} tok/img` : '-'),
        isImageModel: Boolean(imgModel),
        requests,
        requestSharePct,
        totalTokens,
        inputTokens,
        cachedTokens,
        outputTokens,
        revenueRp,
        upstreamCostRp,
        profitRp,
        marginPercent,
        avgLatencyMs,
      };
    });

    return NextResponse.json({
      config: {
        enabled: config.enabled,
        upstreamUrl: config.upstreamUrl,
        hasUpstreamKey: Boolean(config.upstreamKey),
        upstreamKeyMasked: config.upstreamKey
          ? `${config.upstreamKey.slice(0, 10)}...${config.upstreamKey.slice(-4)}`
          : '',
        hasManagementKey: Boolean(config.managementKey),
        managementKeyMasked: config.managementKey
          ? `${config.managementKey.slice(0, 8)}...${config.managementKey.slice(-4)}`
          : '',
        markupPercent: config.markupPercent,
        topupFeeRp: config.topupFeeRp,
        lastSyncAt: config.lastSyncAt,
        lastSyncStatus: config.lastSyncStatus,
      },
      models,
      imageModels,
      customers,
      stats: {
        activeKeys: totalKeys,
        totalRequests: usageStats._count.id,
        totalInputTokens: usageStats._sum.inputTokens ?? 0,
        totalCachedTokens: usageStats._sum.cachedTokens ?? 0,
        totalOutputTokens: usageStats._sum.outputTokens ?? 0,
        totalRevenueIdr,
        totalUpstreamCostIdr,
        totalProfitIdr,
        totalCustomerAiBalance,
      },
      tokenUsageTimeline,
      topModelRankings,
      recentLogs: formattedLogs,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();

    // 1. Trigger manual upstream sync
    if (body.action === 'sync_upstream') {
      const result = await syncAiModelsFromUpstream();
      invalidateAiModelCache();
      invalidateAiGatewayConfigCache();
      return NextResponse.json({
        success: true,
        synced: true,
        message: result.status,
        ...result,
      });
    }

    // 2. Update single model pricing / status
    if (body.action === 'update_model') {
      const {
        id,
        isActive,
        inputPricePer1M,
        cachePricePer1M,
        outputPricePer1M,
        originalInputPricePer1M,
        originalCachePricePer1M,
        originalOutputPricePer1M,
        discountBadge,
        hasPeakPricing,
        openaiOnly,
      } = body;

      const updated = await prisma.aiModel.update({
        where: { id: Number(id) },
        data: {
          ...(typeof isActive === 'boolean' ? { isActive } : {}),
          ...(inputPricePer1M !== undefined ? { inputPricePer1M: Math.round(Number(inputPricePer1M)) } : {}),
          ...(cachePricePer1M !== undefined ? { cachePricePer1M: Math.round(Number(cachePricePer1M)) } : {}),
          ...(outputPricePer1M !== undefined ? { outputPricePer1M: Math.round(Number(outputPricePer1M)) } : {}),
          ...(originalInputPricePer1M !== undefined
            ? {
                originalInputPricePer1M:
                  originalInputPricePer1M !== null && originalInputPricePer1M !== ''
                    ? Math.round(Number(originalInputPricePer1M))
                    : null,
              }
            : {}),
          ...(originalCachePricePer1M !== undefined
            ? {
                originalCachePricePer1M:
                  originalCachePricePer1M !== null && originalCachePricePer1M !== ''
                    ? Math.round(Number(originalCachePricePer1M))
                    : null,
              }
            : {}),
          ...(originalOutputPricePer1M !== undefined
            ? {
                originalOutputPricePer1M:
                  originalOutputPricePer1M !== null && originalOutputPricePer1M !== ''
                    ? Math.round(Number(originalOutputPricePer1M))
                    : null,
              }
            : {}),
          ...(discountBadge !== undefined ? { discountBadge: discountBadge ? String(discountBadge).trim() : null } : {}),
          ...(typeof hasPeakPricing === 'boolean' ? { hasPeakPricing } : {}),
          ...(typeof openaiOnly === 'boolean' ? { openaiOnly } : {}),
        },
      });

      invalidateAiModelCache(updated.modelId);
      return NextResponse.json({ success: true, model: updated });
    }

    // 3. Adjust customer AI Balance (set / add / deduct)
    if (body.action === 'adjust_user_ai_balance') {
      const userId = Number(body.userId);
      const mode = body.mode as 'set' | 'add' | 'deduct';
      const amount = Math.round(Number(body.amount || 0));

      if (!userId || Number.isNaN(amount) || amount < 0) {
        return NextResponse.json({ error: 'Invalid user ID or amount.' }, { status: 400 });
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, aiBalance: true, aiAutoTopupEnabled: true },
      });

      if (!targetUser) {
        return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
      }

      let nextAiBalance = targetUser.aiBalance;
      if (mode === 'set') {
        nextAiBalance = amount;
      } else if (mode === 'add') {
        nextAiBalance = targetUser.aiBalance + amount;
      } else if (mode === 'deduct') {
        nextAiBalance = Math.max(0, targetUser.aiBalance - amount);
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          aiBalance: nextAiBalance,
          ...(typeof body.aiAutoTopupEnabled === 'boolean'
            ? { aiAutoTopupEnabled: body.aiAutoTopupEnabled }
            : {}),
        },
        select: {
          id: true,
          name: true,
          aiBalance: true,
          balance: true,
          aiAutoTopupEnabled: true,
        },
      });

      invalidateAiKeyAuthCacheForUser(userId);
      return NextResponse.json({
        success: true,
        user: updatedUser,
      });
    }

    // 4. Update gateway settings in prisma.setting
    const { enabled, upstreamUrl, upstreamKey, managementKey, markupPercent, topupFeeRp } = body;
    const ops: Promise<any>[] = [];

    if (typeof enabled === 'boolean') {
      const val = enabled ? 'true' : 'false';
      ops.push(
        prisma.setting.upsert({
          where: { key: AI_GATEWAY_SETTING_KEYS.ENABLED },
          update: { value: val },
          create: { key: AI_GATEWAY_SETTING_KEYS.ENABLED, value: val },
        }),
      );
    }

    if (typeof upstreamUrl === 'string' && upstreamUrl.trim()) {
      const cleanUrl = upstreamUrl.trim().replace(/\/+$/, '');
      ops.push(
        prisma.setting.upsert({
          where: { key: AI_GATEWAY_SETTING_KEYS.UPSTREAM_URL },
          update: { value: cleanUrl },
          create: { key: AI_GATEWAY_SETTING_KEYS.UPSTREAM_URL, value: cleanUrl },
        }),
      );
    }

    if (typeof upstreamKey === 'string' && upstreamKey.trim()) {
      const enc = encryptDeterministic(upstreamKey.trim());
      ops.push(
        prisma.setting.upsert({
          where: { key: AI_GATEWAY_SETTING_KEYS.UPSTREAM_KEY },
          update: { value: enc },
          create: { key: AI_GATEWAY_SETTING_KEYS.UPSTREAM_KEY, value: enc },
        }),
      );
    }

    if (typeof managementKey === 'string' && managementKey.trim()) {
      const encMgmt = encryptDeterministic(managementKey.trim());
      ops.push(
        prisma.setting.upsert({
          where: { key: AI_GATEWAY_SETTING_KEYS.MANAGEMENT_KEY },
          update: { value: encMgmt },
          create: { key: AI_GATEWAY_SETTING_KEYS.MANAGEMENT_KEY, value: encMgmt },
        }),
      );
    }

    if (markupPercent !== undefined) {
      const safeMarkup = Math.max(0, Math.min(500, Number(markupPercent) || 0));
      ops.push(
        prisma.setting.upsert({
          where: { key: AI_GATEWAY_SETTING_KEYS.MARKUP_PERCENT },
          update: { value: String(safeMarkup) },
          create: { key: AI_GATEWAY_SETTING_KEYS.MARKUP_PERCENT, value: String(safeMarkup) },
        }),
      );
    }

    if (topupFeeRp !== undefined) {
      const safeFee = Math.max(0, Math.min(1000000, Math.round(Number(topupFeeRp) || 0)));
      ops.push(
        prisma.setting.upsert({
          where: { key: AI_GATEWAY_SETTING_KEYS.TOPUP_FEE_RP },
          update: { value: String(safeFee) },
          create: { key: AI_GATEWAY_SETTING_KEYS.TOPUP_FEE_RP, value: String(safeFee) },
        }),
      );
    }

    if (ops.length > 0) {
      await Promise.all(ops);
      invalidateAiGatewayConfigCache();
    }

    const updatedConfig = await getAiGatewayConfig();
    return NextResponse.json({
      success: true,
      config: {
        enabled: updatedConfig.enabled,
        upstreamUrl: updatedConfig.upstreamUrl,
        hasUpstreamKey: Boolean(updatedConfig.upstreamKey),
        markupPercent: updatedConfig.markupPercent,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
