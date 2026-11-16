import * as crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAiGatewayConfig } from '@/lib/ai-gateway';
import {
  AI_MGMT_CORS_HEADERS,
  AI_MGMT_MIN_TOPUP,
  AI_TOPUP_PACKS,
  aiMgmtError,
  aiMgmtOptionsResponse,
  aiMgmtSuccess,
  authenticateAiManagementKey,
  beginIdempotentOperation,
  validateIdempotencyKeyHeader,
} from '@/lib/ai-management-auth';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return aiMgmtOptionsResponse();
}

export async function POST(req: NextRequest) {
  const auth = await authenticateAiManagementKey(req, { requireWholeAccount: true });
  if ('error' in auth) return auth.error;

  const { user } = auth.ctx;
  const dryRun = req.nextUrl.searchParams.get('dryRun') === 'true';

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return aiMgmtError('VALIDATION_ERROR', 'Request body must be a JSON object.', 422);
  }

  const hasPack = body.packId !== undefined && body.packId !== null && body.packId !== '';
  const hasAmount = body.amount !== undefined && body.amount !== null;

  if ((hasPack && hasAmount) || (!hasPack && !hasAmount)) {
    return aiMgmtError('INVALID_TOPUP', 'Send exactly one of "packId" or "amount".', 400);
  }

  let amount = 0;
  let packBonus = 0;
  let packId: string | null = null;

  if (hasPack) {
    if (typeof body.packId !== 'string') {
      return aiMgmtError('VALIDATION_ERROR', '"packId" must be a string.', 422);
    }
    const pack = AI_TOPUP_PACKS.find((p) => p.id === body.packId.trim());
    if (!pack) {
      return aiMgmtError('PACK_NOT_FOUND', `Top-up pack '${body.packId}' was not found.`, 404);
    }
    packId = pack.id;
    amount = pack.amount;
    packBonus = pack.bonus;
  } else {
    const num = Number(body.amount);
    if (!Number.isSafeInteger(num) || num <= 0) {
      return aiMgmtError('VALIDATION_ERROR', '"amount" must be a positive integer.', 422);
    }
    if (num < AI_MGMT_MIN_TOPUP) {
      return aiMgmtError(
        'AMOUNT_TOO_SMALL',
        `Minimum AI balance top-up is Rp ${AI_MGMT_MIN_TOPUP.toLocaleString('id-ID')}.`,
        400,
      );
    }
    amount = num;
  }

  const config = await getAiGatewayConfig();
  const topupFeeRp = config.topupFeeRp;
  const totalWalletDeduction = amount + topupFeeRp;

  if (dryRun) {
    const enoughBalance = user.balance >= totalWalletDeduction;
    return aiMgmtSuccess({
      dryRun: true,
      currency: 'IDR',
      amount,
      topupFeeRp,
      totalWalletDeduction,
      packId,
      bonus: packBonus,
      packBonus,
      campaignBonus: 0,
      walletBalance: user.balance,
      walletBalanceAfter: user.balance - totalWalletDeduction,
      enoughBalance,
      aiBalance: user.aiBalance,
      aiBalanceAfter: user.aiBalance + amount + packBonus,
    });
  }

  const idemHeader = validateIdempotencyKeyHeader(req);
  if ('error' in idemHeader) return idemHeader.error;

  const idem = await beginIdempotentOperation(user.id, 'topup', idemHeader.key);
  if (idem.mode === 'in_progress') {
    return aiMgmtError(
      'REQUEST_IN_PROGRESS',
      'A top-up with this Idempotency-Key is already in progress.',
      409,
    );
  }
  if (idem.mode === 'replay') {
    return NextResponse.json(idem.body, { status: idem.status, headers: AI_MGMT_CORS_HEADERS });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const res = await tx.user.updateMany({
        where: { id: user.id, balance: { gte: totalWalletDeduction } },
        data: {
          balance: { decrement: totalWalletDeduction },
          aiBalance: { increment: amount + packBonus },
        },
      });

      if (res.count === 0) return null;

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
            mode: 'MANAGEMENT_API',
          }),
        },
        select: { invoiceNumber: true },
      });

      const updatedUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { balance: true, aiBalance: true },
      });

      return { updatedUser, invoice };
    });

    if (!result) {
      const errBody = {
        success: false,
        error: {
          code: 'INSUFFICIENT_WALLET',
          message: `Insufficient Masdika wallet balance. Required Rp ${totalWalletDeduction.toLocaleString('id-ID')} (incl. Rp ${topupFeeRp.toLocaleString('id-ID')} platform fee).`,
        },
      };
      await idem.complete(402, errBody);
      return NextResponse.json(errBody, { status: 402, headers: AI_MGMT_CORS_HEADERS });
    }

    const okBody = {
      success: true,
      data: {
        dryRun: false,
        currency: 'IDR',
        amount,
        topupFeeRp,
        bonus: packBonus,
        campaignBonus: 0,
        aiBalance: result.updatedUser?.aiBalance ?? user.aiBalance + amount + packBonus,
        walletBalance: result.updatedUser?.balance ?? user.balance - totalWalletDeduction,
        invoiceNumber: result.invoice.invoiceNumber,
      },
    };
    await idem.complete(200, okBody);
    return NextResponse.json(okBody, { status: 200, headers: AI_MGMT_CORS_HEADERS });
  } catch (err) {
    await idem.abort();
    throw err;
  }
}
