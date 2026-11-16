import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  aiMgmtError,
  aiMgmtOptionsResponse,
  aiMgmtSuccess,
  authenticateAiManagementKey,
} from '@/lib/ai-management-auth';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return aiMgmtOptionsResponse();
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ keyId: string }> },
) {
  const auth = await authenticateAiManagementKey(req);
  if ('error' in auth) return auth.error;

  const { user } = auth.ctx;
  const { keyId } = await context.params;
  const id = Number(keyId);
  if (!Number.isInteger(id) || id <= 0) {
    return aiMgmtError('KEY_NOT_FOUND', 'AI Gateway key not found.', 404);
  }

  const existing = await prisma.aiGatewayKey.findFirst({
    where: { id, userId: user.id },
    select: { id: true, isActive: true },
  });

  if (!existing) {
    return aiMgmtError('KEY_NOT_FOUND', 'AI Gateway key not found.', 404);
  }

  if (existing.isActive) {
    await prisma.aiGatewayKey.update({
      where: { id: existing.id },
      data: { isActive: false },
    });
  }

  return aiMgmtSuccess({ id: existing.id, revoked: true });
}
