import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  aiMgmtOptionsResponse,
  aiMgmtSuccess,
  authenticateAiManagementKey,
} from '@/lib/ai-management-auth';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return aiMgmtOptionsResponse();
}

export async function GET(req: NextRequest) {
  const auth = await authenticateAiManagementKey(req);
  if ('error' in auth) return auth.error;

  const { user } = auth.ctx;
  const keys = await prisma.aiGatewayKey.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      isActive: true,
      allowedModels: true,
      monthlyLimit: true,
      monthlySpent: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return aiMgmtSuccess(
    keys.map((k) => ({
      id: k.id,
      name: k.name,
      prefix: k.keyPrefix,
      status: k.isActive ? 'active' : 'revoked',
      allowedModels: k.allowedModels.length > 0 ? k.allowedModels : null,
      spendLimitMonthly: k.monthlyLimit,
      monthlySpent: k.monthlySpent,
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      expiresAt: k.expiresAt?.toISOString() ?? null,
      createdAt: k.createdAt.toISOString(),
    })),
  );
}
