import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAiGatewayConfig, tryAutoTopupAiBalance } from '@/lib/ai-gateway';
import {
  AI_MGMT_MIN_TOPUP,
  AI_TOPUP_PACKS,
  aiMgmtError,
  aiMgmtOptionsResponse,
  aiMgmtSuccess,
  authenticateAiManagementKey,
} from '@/lib/ai-management-auth';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return aiMgmtOptionsResponse();
}

export async function PUT(req: NextRequest) {
  const auth = await authenticateAiManagementKey(req, { requireWholeAccount: true });
  if ('error' in auth) return auth.error;

  const { user } = auth.ctx;
  const dryRun = req.nextUrl.searchParams.get('dryRun') === 'true';

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.enabled !== 'boolean') {
    return aiMgmtError('VALIDATION_ERROR', 'Body must be JSON with boolean "enabled".', 422);
  }

  const enabled = body.enabled;
  const threshold = body.threshold !== undefined ? Number(body.threshold) : user.aiAutoTopupThreshold;
  const amount = body.amount !== undefined ? Number(body.amount) : user.aiAutoTopupAmount;

  if (enabled) {
    if (!Number.isSafeInteger(threshold) || threshold < AI_MGMT_MIN_TOPUP) {
      return aiMgmtError(
        'INVALID_THRESHOLD',
        `Threshold must be an integer >= Rp ${AI_MGMT_MIN_TOPUP.toLocaleString('id-ID')}.`,
        400,
      );
    }
    if (!Number.isSafeInteger(amount) || amount < AI_MGMT_MIN_TOPUP) {
      return aiMgmtError(
        'AMOUNT_TOO_SMALL',
        `Auto top-up amount must be an integer >= Rp ${AI_MGMT_MIN_TOPUP.toLocaleString('id-ID')}.`,
        400,
      );
    }
  }

  const currentAuto = {
    enabled: user.aiAutoTopupEnabled,
    threshold: user.aiAutoTopupEnabled ? user.aiAutoTopupThreshold : null,
    amount: user.aiAutoTopupEnabled ? user.aiAutoTopupAmount : null,
  };

  const nextAuto = {
    enabled,
    threshold: enabled ? threshold : null,
    amount: enabled ? amount : null,
  };

  if (dryRun) {
    return aiMgmtSuccess({
      dryRun: true,
      current: currentAuto,
      next: nextAuto,
      walletBalance: user.balance,
      currency: 'IDR',
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      aiAutoTopupEnabled: enabled,
      ...(enabled ? { aiAutoTopupThreshold: threshold, aiAutoTopupAmount: amount } : {}),
    },
  });

  if (enabled) {
    await tryAutoTopupAiBalance(user.id).catch(() => {});
  }

  const [updatedUser, config] = await Promise.all([
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
  ]);

  const bal = updatedUser?.aiBalance ?? user.aiBalance;

  return aiMgmtSuccess({
    balance: bal,
    held: 0,
    freeCredit: 0,
    available: Math.max(0, bal),
    walletBalance: updatedUser?.balance ?? user.balance,
    limitedCredit: [],
    autoTopup: {
      enabled: updatedUser?.aiAutoTopupEnabled ?? enabled,
      threshold: updatedUser?.aiAutoTopupEnabled ? updatedUser.aiAutoTopupThreshold : null,
      amount: updatedUser?.aiAutoTopupEnabled ? updatedUser.aiAutoTopupAmount : null,
      lastFailedAt: null,
    },
    minTopup: AI_MGMT_MIN_TOPUP,
    topupFeeRp: config.topupFeeRp,
    taxPercent: 11,
    currency: 'IDR',
    packs: AI_TOPUP_PACKS,
    coupons: [],
  });
}
