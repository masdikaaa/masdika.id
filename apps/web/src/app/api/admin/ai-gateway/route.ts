import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import {
  AI_GATEWAY_SETTING_KEYS,
  DEFAULT_AI_IMAGE_MODELS,
  applyMarkupPrice,
  ensureAiModelsExist,
  getAiGatewayConfig,
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

    const [models, totalKeys, usageStats, recentLogs, rawCustomers] = await Promise.all([
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
        take: 50,
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
    ]);

    const totalRevenueIdr = usageStats._sum.costRp ?? 0;
    const totalUpstreamCostIdr = usageStats._sum.upstreamCostRp ?? 0;
    const totalProfitIdr = totalRevenueIdr - totalUpstreamCostIdr;

    const customers = rawCustomers.map((u) => {
      let email = u.email;
      try {
        email = decryptDeterministic(u.email) || u.email;
      } catch {
        // fallback
      }
      return {
        ...u,
        email,
      };
    });

    const formattedLogs = recentLogs.map((log) => {
      let userEmail = log.user?.email || '';
      try {
        if (userEmail) userEmail = decryptDeterministic(userEmail) || userEmail;
      } catch {
        // fallback
      }
      return {
        ...log,
        user: log.user ? { ...log.user, email: userEmail } : log.user,
      };
    });

    const totalCustomerAiBalance = customers.reduce((acc, c) => acc + (c.aiBalance || 0), 0);

    const imageModels = DEFAULT_AI_IMAGE_MODELS.map((m) => ({
      ...m,
      sellPriceRp: applyMarkupPrice(m.basePriceRp, config.markupPercent),
    }));

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

      return NextResponse.json({
        success: true,
        user: updatedUser,
      });
    }

    // 4. Update gateway settings in prisma.setting
    const { enabled, upstreamUrl, upstreamKey, managementKey, markupPercent } = body;
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

    if (ops.length > 0) {
      await Promise.all(ops);
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
