import { NextRequest } from 'next/server';
import { getAiGatewayConfig } from '@/lib/ai-gateway';
import {
  AI_MGMT_MIN_TOPUP,
  AI_TOPUP_PACKS,
  aiMgmtOptionsResponse,
  aiMgmtSuccess,
  authenticateAiManagementKey,
} from '@/lib/ai-management-auth';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return aiMgmtOptionsResponse();
}

export async function GET(req: NextRequest) {
  const auth = await authenticateAiManagementKey(req, { requireWholeAccount: true });
  if ('error' in auth) return auth.error;

  const { user } = auth.ctx;
  const config = await getAiGatewayConfig();
  const held = 0;

  return aiMgmtSuccess({
    balance: user.aiBalance,
    held,
    freeCredit: 0,
    available: Math.max(0, user.aiBalance - held),
    walletBalance: user.balance,
    limitedCredit: [],
    autoTopup: {
      enabled: user.aiAutoTopupEnabled,
      threshold: user.aiAutoTopupEnabled ? user.aiAutoTopupThreshold : null,
      amount: user.aiAutoTopupEnabled ? user.aiAutoTopupAmount : null,
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
