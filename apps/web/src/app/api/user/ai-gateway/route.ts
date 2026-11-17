import * as crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';
import { getUserServicesCommitment } from '@/lib/billing-commitment';
import {
  DEFAULT_AI_IMAGE_MODELS,
  applyMarkupPrice,
  calculateTokenCostRp,
  clearAiInsufficientBalanceNotice,
  ensureAiModelsExist,
  estimatePromptTokensFromBody,
  generateAiGatewayKey,
  getAiGatewayConfig,
  isModelAllowedForKey,
  isPeakHourWib,
  recordAiUsageAndCharge,
  tryAutoTopupAiBalance,
} from '@/lib/ai-gateway';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const user = auth.user!;

    await ensureAiModelsExist();
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const [dbUser, config, commitment, models, keys, usageLogs, aggregate, monthAggregate, monthByModel] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: user.id },
          select: {
            balance: true,
            aiBalance: true,
            aiAutoTopupEnabled: true,
            aiAutoTopupThreshold: true,
            aiAutoTopupAmount: true,
          },
        }),
        getAiGatewayConfig(),
        getUserServicesCommitment(user.id),
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
            allowedModels: true,
            expiresAt: true,
            isActive: true,
            lastUsedAt: true,
            createdAt: true,
          },
        }),
        prisma.aiUsageLog.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 100,
          include: {
            apiKey: { select: { id: true, name: true, keyPrefix: true } },
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
          _avg: {
            latencyMs: true,
          },
        }),
        prisma.aiUsageLog.aggregate({
          where: { userId: user.id, createdAt: { gte: monthStart } },
          _sum: { costRp: true },
        }),
        prisma.aiUsageLog.groupBy({
          by: ['modelId'],
          where: { userId: user.id, createdAt: { gte: monthStart } },
          _count: { id: true },
          _sum: {
            costRp: true,
            inputTokens: true,
            cachedTokens: true,
            outputTokens: true,
          },
        }),
      ]);

    const walletBalance = dbUser?.balance ?? user.balance;
    const lockedCommitment = commitment.totalMonthly;
    const availableWalletBalance = Math.max(0, walletBalance - lockedCommitment);

    return NextResponse.json({
      success: true,
      data: {
        enabled: config.enabled && Boolean(config.upstreamKey),
        walletBalance,
        lockedCommitment,
        availableWalletBalance,
        aiBalance: dbUser?.aiBalance ?? 0,
        balance: dbUser?.aiBalance ?? 0,
        autoTopup: {
          enabled: dbUser?.aiAutoTopupEnabled ?? false,
          threshold: dbUser?.aiAutoTopupThreshold ?? 20000,
          amount: dbUser?.aiAutoTopupAmount ?? 100000,
        },
        markupPercent: config.markupPercent,
        topupFeeRp: config.topupFeeRp,
        isPeakNow: isPeakHourWib(),
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
        imageModels: DEFAULT_AI_IMAGE_MODELS.map((im) => ({
          ...im,
          priceRp: applyMarkupPrice(im.basePriceRp, config.markupPercent),
          sizePrices: im.sizePrices
            ? Object.fromEntries(
                Object.entries(im.sizePrices).map(([sz, p]) => [
                  sz,
                  applyMarkupPrice(p, config.markupPercent),
                ]),
              )
            : undefined,
        })),
        keys,
        usageLogs,
        thisMonthByModel: monthByModel.map((g) => ({
          modelId: g.modelId,
          requests: g._count.id,
          costRp: g._sum.costRp || 0,
          inputTokens: g._sum.inputTokens || 0,
          cachedTokens: g._sum.cachedTokens || 0,
          outputTokens: g._sum.outputTokens || 0,
        })),
        stats: {
          totalRequests: aggregate._count.id || 0,
          totalSpentRp: aggregate._sum.costRp || 0,
          spentThisMonthRp: monthAggregate._sum.costRp || 0,
          avgLatencyMs: Math.round(aggregate._avg.latencyMs || 0),
          inputTokens: aggregate._sum.inputTokens || 0,
          cachedTokens: aggregate._sum.cachedTokens || 0,
          outputTokens: aggregate._sum.outputTokens || 0,
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

    // 1. Manual Top-up AI Balance from Masdika Wallet
    if (body?.action === 'topup_ai_balance') {
      const amount = Number(body.amount);
      if (!Number.isSafeInteger(amount) || amount < 5000) {
        return NextResponse.json(
          { error: 'Minimum AI balance top-up is Rp 5.000' },
          { status: 400 }
        );
      }

      const config = await getAiGatewayConfig();
      const topupFeeRp = config.topupFeeRp;
      const totalWalletDeduction = amount + topupFeeRp;

      const result = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;
        const commitment = await getUserServicesCommitment(user.id, tx);
        const requiredWallet = commitment.totalMonthly + totalWalletDeduction;

        const res = await tx.user.updateMany({
          where: { id: user.id, balance: { gte: requiredWallet } },
          data: {
            balance: { decrement: totalWalletDeduction },
            aiBalance: { increment: amount },
          },
        });

        if (res.count === 0) {
          const fresh = await tx.user.findUnique({
            where: { id: user.id },
            select: { balance: true },
          });
          const available = Math.max(0, (fresh?.balance ?? 0) - commitment.totalMonthly);
          return { insufficient: true as const, lockedCommitment: commitment.totalMonthly, available };
        }

        const invoiceNumber = `INV-AI-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber,
            merchantOrderId: invoiceNumber,
            userId: user.id,
            amount: totalWalletDeduction,
            status: 'PAID',
            type: 'AI_CREDIT',
            paymentMethod: 'Account Balance',
            reference: 'AI_CREDIT_TOPUP',
            paidAt: new Date(),
            details: JSON.stringify({
              service: 'AI_GATEWAY',
              aiCreditAmount: amount,
              adminFeeRp: topupFeeRp,
              totalPaidRp: totalWalletDeduction,
              mode: 'MANUAL',
            }),
          },
          select: { id: true, invoiceNumber: true },
        });

        const updatedUser = await tx.user.findUnique({
          where: { id: user.id },
          select: { balance: true, aiBalance: true },
        });

        return { insufficient: false as const, updatedUser, invoice };
      });

      if (result.insufficient) {
        const lockNote =
          result.lockedCommitment > 0
            ? ` Rp ${result.lockedCommitment.toLocaleString('id-ID')} is locked for active service commitments; available wallet balance: Rp ${result.available.toLocaleString('id-ID')}.`
            : '';
        return NextResponse.json(
          {
            error: `Insufficient uncommitted Masdika wallet balance. Required Rp ${totalWalletDeduction.toLocaleString('id-ID')} (incl. Rp ${topupFeeRp.toLocaleString('id-ID')} platform fee).${lockNote}`,
          },
          { status: 402 }
        );
      }

      await clearAiInsufficientBalanceNotice(user.id).catch(() => {});

      return NextResponse.json({
        success: true,
        walletBalance: result.updatedUser?.balance ?? 0,
        aiBalance: result.updatedUser?.aiBalance ?? 0,
        topupFeeRp,
        invoiceNumber: result.invoice.invoiceNumber,
      });
    }

    // 2. Save Auto Top-up Settings
    if (body?.action === 'update_auto_topup') {
      const enabled = Boolean(body.enabled);
      const threshold = Number(body.threshold ?? 20000);
      const amount = Number(body.amount ?? 100000);

      if (!Number.isSafeInteger(threshold) || threshold < 5000) {
        return NextResponse.json(
          { error: 'Auto top-up trigger threshold must be at least Rp 5.000' },
          { status: 400 }
        );
      }
      if (!Number.isSafeInteger(amount) || amount < 5000) {
        return NextResponse.json(
          { error: 'Auto top-up amount must be at least Rp 5.000' },
          { status: 400 }
        );
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          aiAutoTopupEnabled: enabled,
          aiAutoTopupThreshold: threshold,
          aiAutoTopupAmount: amount,
        },
      });

      if (enabled) {
        await tryAutoTopupAiBalance(user.id).catch(() => {});
      }

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { balance: true, aiBalance: true },
      });

      return NextResponse.json({
        success: true,
        walletBalance: updatedUser?.balance ?? 0,
        aiBalance: updatedUser?.aiBalance ?? 0,
      });
    }

    // 3. In-Dashboard Playground Chat Request
    if (body?.action === 'playground_chat') {
      const requestId = `req_${crypto.randomBytes(10).toString('hex')}`;
      const startedAt = Date.now();
      const modelId = typeof body.model === 'string' ? body.model.trim() : '';
      const format = body.format === 'anthropic' ? 'anthropic' : 'openai';
      const systemPrompt = typeof body.systemPrompt === 'string' ? body.systemPrompt.trim() : '';
      const messages = Array.isArray(body.messages) ? body.messages : [];
      const maxTokens = Math.min(16384, Math.max(64, Number(body.maxTokens) || 2048));
      const temperature = Number.isFinite(Number(body.temperature)) ? Number(body.temperature) : 0.7;

      const keyId = Number(body.apiKeyId);
      const keyRecord = await prisma.aiGatewayKey.findFirst({
        where: {
          userId: user.id,
          isActive: true,
          ...(Number.isSafeInteger(keyId) && keyId > 0 ? { id: keyId } : {}),
        },
      });
      if (!keyRecord) {
        return NextResponse.json(
          { error: 'Create or activate an AI API key first to use the Playground.' },
          { status: 400 }
        );
      }

      if (keyRecord.expiresAt && keyRecord.expiresAt <= new Date()) {
        return NextResponse.json(
          { error: 'Selected AI API key has expired. Choose or create another key.' },
          { status: 401 }
        );
      }

      const model = await prisma.aiModel.findUnique({ where: { modelId } });
      if (!model || !model.isActive) {
        return NextResponse.json({ error: `Model '${modelId}' not found.` }, { status: 404 });
      }

      if (!isModelAllowedForKey(keyRecord, model.modelId)) {
        return NextResponse.json(
          { error: `Selected API key is not permitted to use model '${model.modelId}'.` },
          { status: 403 }
        );
      }

      let currentAiBalance = await tryAutoTopupAiBalance(user.id);
      if (currentAiBalance <= 0) {
        const dbU = await prisma.user.findUnique({ where: { id: user.id }, select: { aiBalance: true } });
        currentAiBalance = dbU?.aiBalance ?? 0;
      }
      if (currentAiBalance <= 0) {
        return NextResponse.json(
          {
            error: 'Insufficient balance. Top up your AI balance to continue. (insufficient_balance)',
            code: 'insufficient_balance',
            requestId,
          },
          { status: 402 }
        );
      }

      const config = await getAiGatewayConfig();
      if (!config.enabled || !config.upstreamKey) {
        return NextResponse.json({ error: 'AI Gateway is currently unavailable.' }, { status: 503 });
      }

      const formattedMessages = messages.map((m: any) => {
        const imgs: string[] = Array.isArray(m?.images) ? m.images.filter((x: any) => typeof x === 'string' && x) : [];
        const text = typeof m?.content === 'string' ? m.content : '';
        if (imgs.length === 0) {
          return { role: m.role === 'assistant' ? 'assistant' : 'user', content: text };
        }
        if (format === 'anthropic') {
          const blocks: any[] = [];
          for (const img of imgs) {
            const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(img);
            if (match) {
              blocks.push({
                type: 'image',
                source: { type: 'base64', media_type: match[1], data: match[2] },
              });
            } else {
              blocks.push({
                type: 'image',
                source: { type: 'url', url: img },
              });
            }
          }
          if (text) blocks.push({ type: 'text', text });
          return { role: m.role === 'assistant' ? 'assistant' : 'user', content: blocks };
        }
        const parts: any[] = [];
        if (text) parts.push({ type: 'text', text });
        for (const img of imgs) {
          parts.push({ type: 'image_url', image_url: { url: img } });
        }
        return { role: m.role === 'assistant' ? 'assistant' : 'user', content: parts };
      });

      const endpoint = format === 'anthropic' ? '/v1/messages' : '/v1/chat/completions';
      const upstreamPayload =
        format === 'anthropic'
          ? {
              model: modelId,
              max_tokens: maxTokens,
              temperature,
              ...(systemPrompt ? { system: systemPrompt } : {}),
              messages: formattedMessages,
            }
          : {
              model: modelId,
              max_completion_tokens: maxTokens,
              temperature,
              messages: systemPrompt
                ? [{ role: 'system', content: systemPrompt }, ...formattedMessages]
                : formattedMessages,
            };

      const upstreamRes = await fetch(`${config.upstreamUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${config.upstreamKey}`,
          'x-api-key': config.upstreamKey,
          ...(format === 'anthropic' ? { 'anthropic-version': '2023-06-01' } : {}),
        },
        body: JSON.stringify(upstreamPayload),
      });

      const jsonData = await upstreamRes.json().catch(() => null);
      if (!upstreamRes.ok || !jsonData) {
        const errMsg =
          jsonData?.error?.message || jsonData?.message || `Upstream returned HTTP ${upstreamRes.status}`;
        return NextResponse.json({ error: errMsg, requestId }, { status: upstreamRes.status || 502 });
      }

      let content = '';
      let reasoning = '';
      let inputTokens = 0;
      let cachedTokens = 0;
      let outputTokens = 0;

      if (format === 'anthropic') {
        const blocks = Array.isArray(jsonData.content) ? jsonData.content : [];
        content = blocks
          .filter((b: any) => b?.type === 'text')
          .map((b: any) => b.text)
          .join('\n');
        reasoning = blocks
          .filter((b: any) => b?.type === 'thinking')
          .map((b: any) => b.thinking)
          .join('\n');
        inputTokens =
          (Number(jsonData.usage?.input_tokens) || 0) +
          (Number(jsonData.usage?.cache_creation_input_tokens) || 0);
        cachedTokens = Number(jsonData.usage?.cache_read_input_tokens) || 0;
        outputTokens = Number(jsonData.usage?.output_tokens) || 0;
      } else {
        const msg = jsonData.choices?.[0]?.message || {};
        content = msg.content || '';
        reasoning = msg.reasoning_content || '';
        const prompt = Number(jsonData.usage?.prompt_tokens ?? jsonData.usage?.input_tokens ?? 0);
        cachedTokens = Number(
          jsonData.usage?.prompt_tokens_details?.cached_tokens ??
            jsonData.usage?.cached_tokens ??
            0
        );
        inputTokens = Math.max(0, prompt - cachedTokens);
        outputTokens = Number(jsonData.usage?.completion_tokens ?? jsonData.usage?.output_tokens ?? 0);
      }

      if (inputTokens === 0 && outputTokens === 0) {
        inputTokens = estimatePromptTokensFromBody(upstreamPayload);
        outputTokens = Math.max(8, Math.ceil(content.length / 4));
      }

      const latencyMs = Date.now() - startedAt;
      const { costRp, upstreamCostRp } = calculateTokenCostRp(
        { inputTokens, cachedTokens, outputTokens },
        model,
        config.markupPercent
      );

      await recordAiUsageAndCharge({
        userId: user.id,
        apiKeyId: keyRecord.id,
        requestId,
        modelId,
        endpoint,
        inputTokens,
        cachedTokens,
        outputTokens,
        costRp,
        upstreamCostRp,
        latencyMs,
        statusCode: 200,
      });

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { aiBalance: true, balance: true },
      });

      return NextResponse.json({
        success: true,
        requestId,
        latencyMs,
        content,
        reasoning,
        usage: { inputTokens, cachedTokens, outputTokens, costRp },
        aiBalance: updatedUser?.aiBalance ?? 0,
        walletBalance: updatedUser?.balance ?? 0,
      });
    }

    // 4. In-Dashboard Image Generation Request
    if (body?.action === 'generate_image') {
      const requestId = `req_${crypto.randomBytes(10).toString('hex')}`;
      const startedAt = Date.now();
      const modelId = typeof body.model === 'string' ? body.model.trim() : 'seedream-image-v5.0-flash';
      const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
      const size = typeof body.size === 'string' ? body.size.trim() : '2048x2048';
      const refImage = typeof body.referenceImage === 'string' && body.referenceImage.trim() ? [body.referenceImage.trim()] : undefined;

      if (!prompt) {
        return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
      }

      const keyId = Number(body.apiKeyId);
      const keyRecord = await prisma.aiGatewayKey.findFirst({
        where: {
          userId: user.id,
          isActive: true,
          ...(Number.isSafeInteger(keyId) && keyId > 0 ? { id: keyId } : {}),
        },
      });
      if (!keyRecord) {
        return NextResponse.json(
          { error: 'Create or activate an AI API key first to generate images.' },
          { status: 400 }
        );
      }

      if (keyRecord.expiresAt && keyRecord.expiresAt <= new Date()) {
        return NextResponse.json(
          { error: 'Selected AI API key has expired. Choose or create another key.' },
          { status: 401 }
        );
      }

      if (!isModelAllowedForKey(keyRecord, modelId)) {
        return NextResponse.json(
          { error: `Selected API key is not permitted to use image model '${modelId}'.` },
          { status: 403 }
        );
      }

      const config = await getAiGatewayConfig();
      if (!config.enabled || !config.upstreamKey) {
        return NextResponse.json({ error: 'AI Gateway is currently unavailable.' }, { status: 503 });
      }

      const imgSpec = DEFAULT_AI_IMAGE_MODELS.find((m) => m.modelId === modelId);
      const baseUnitRp =
        imgSpec && size === '2048x2048' && modelId === 'seedream-image-v5.0-pro'
          ? 1602
          : imgSpec?.basePriceRp || 500;
      const upstreamCostRp = baseUnitRp;
      const costRp = applyMarkupPrice(upstreamCostRp, config.markupPercent);
      const holdRp = Math.ceil(costRp * 1.25);

      let currentAiBalance = await tryAutoTopupAiBalance(user.id);
      if (currentAiBalance <= 0) {
        const dbU = await prisma.user.findUnique({ where: { id: user.id }, select: { aiBalance: true } });
        currentAiBalance = dbU?.aiBalance ?? 0;
      }
      if (currentAiBalance < holdRp) {
        return NextResponse.json(
          {
            error: `Insufficient AI balance. Hold requires ${costRp} IDR. Please top up your AI balance first.`,
            code: 'insufficient_balance',
          },
          { status: 402 }
        );
      }

      const upstreamRes = await fetch(`${config.upstreamUrl}/v1/images/generations`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${config.upstreamKey}`,
          'x-api-key': config.upstreamKey,
        },
        body: JSON.stringify({
          model: modelId,
          prompt,
          size,
          n: 1,
          ...(refImage ? { images: refImage } : {}),
        }),
      });

      const jsonData = await upstreamRes.json().catch(() => null);
      if (!upstreamRes.ok || !jsonData) {
        const errMsg =
          jsonData?.error?.message || jsonData?.message || `Upstream returned HTTP ${upstreamRes.status}`;
        return NextResponse.json({ error: errMsg }, { status: upstreamRes.status || 502 });
      }

      if (jsonData.status === 'succeeded' || Array.isArray(jsonData.data)) {
        const tokens = Number(jsonData.usage?.total_tokens) || imgSpec?.tokensPerImage || 15000;
        await recordAiUsageAndCharge({
          userId: user.id,
          apiKeyId: keyRecord.id,
          requestId: jsonData.id || requestId,
          modelId,
          endpoint: '/v1/images/generations',
          inputTokens: 0,
          cachedTokens: 0,
          outputTokens: tokens,
          costRp,
          upstreamCostRp,
          latencyMs: Date.now() - startedAt,
          statusCode: 200,
        });
      }

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { aiBalance: true, balance: true },
      });

      return NextResponse.json({
        success: true,
        result: jsonData,
        costRp,
        aiBalance: updatedUser?.aiBalance ?? 0,
        walletBalance: updatedUser?.balance ?? 0,
      });
    }

    // 5. Default POST: Create a new AI Gateway Key
    const safeName =
      typeof body?.name === 'string' && body.name.trim().length > 0
        ? body.name.trim().slice(0, 64)
        : 'AI Gateway Key';

    let monthlyLimit: number | null = null;
    if (body?.monthlyLimit !== undefined && body.monthlyLimit !== null && body.monthlyLimit !== '') {
      const parsedLimit = Number(body.monthlyLimit);
      if (!Number.isSafeInteger(parsedLimit) || parsedLimit < 1000 || parsedLimit > 100_000_000) {
        return NextResponse.json(
          { error: 'Monthly spend limit must be between Rp 1.000 and Rp 100.000.000 (or empty for unlimited)' },
          { status: 400 }
        );
      }
      monthlyLimit = parsedLimit;
    }

    let expiresAt: Date | null = null;
    if (body?.expiresInDays !== undefined && body.expiresInDays !== null && body.expiresInDays !== '') {
      const days = Number(body.expiresInDays);
      if (!Number.isSafeInteger(days) || days < 1 || days > 3650) {
        return NextResponse.json(
          { error: 'Expiration must be between 1 and 3650 days (or empty for no expiry).' },
          { status: 400 }
        );
      }
      expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }

    let allowedModels: string[] = [];
    if (Array.isArray(body?.allowedModels) && body.allowedModels.length > 0) {
      const cleaned = Array.from(
        new Set(
          body.allowedModels
            .filter((x: unknown): x is string => typeof x === 'string' && x.trim().length > 0)
            .map((x: string) => x.trim()),
        ),
      ).slice(0, 200);
      if (cleaned.length === 0) {
        return NextResponse.json(
          { error: 'Please select at least one allowed model or disable model restriction.' },
          { status: 400 }
        );
      }
      allowedModels = cleaned as string[];
    }

    const { rawKey, keyHash, keyPrefix } = generateAiGatewayKey();

    const created = await prisma.$transaction(async (tx) => {
      const count = await tx.aiGatewayKey.count({ where: { userId: user.id } });
      if (count >= 25) throw new Error('KEY_LIMIT_REACHED');

      return tx.aiGatewayKey.create({
        data: {
          userId: user.id,
          name: safeName,
          keyHash,
          keyPrefix,
          monthlyLimit,
          allowedModels,
          expiresAt,
        },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          monthlyLimit: true,
          monthlySpent: true,
          allowedModels: true,
          expiresAt: true,
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
        { error: 'Maximum limit of 25 AI Gateway keys reached. Revoke one to create another.' },
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
