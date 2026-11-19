import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';
import { decryptDeterministic } from '@/lib/encryption';
import { getClientIp } from '@/lib/get-ip';
import {
  getIpSubnet,
  invalidateSecurityBlockCache,
  isLoopbackOrUnknownIp,
  normalizeIp,
} from '@/lib/ip-check';
import { syncCustomerToElastic } from '@/lib/sync-elasticsearch';

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (auth.impersonatedBy) {
    return NextResponse.json(
      { error: 'Cannot block or unblock users during impersonation.' },
      { status: 403 }
    );
  }

  try {
    const params = await props.params;
    const userId = parseInt(params.id, 10);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    if (userId === auth.userId) {
      return NextResponse.json(
        { error: 'Cannot block your own administrator account' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const rawBlocked =
      typeof body.isBlocked === 'boolean' ? body.isBlocked : body.isSuspended;
    const rawReason =
      typeof body.blockReason === 'string' ? body.blockReason : body.suspendReason;
    const blockIpSubnet = body.blockIpSubnet !== false;
    const unblockIpSubnet = body.unblockIpSubnet !== false;

    if (typeof rawBlocked !== 'boolean') {
      return NextResponse.json({ error: 'isBlocked must be a boolean' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, email: true },
    });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (targetUser.role === 'ADMIN' || targetUser.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Cannot block administrator accounts' },
        { status: 403 }
      );
    }

    const safeReason = rawBlocked
      ? typeof rawReason === 'string' && rawReason.trim()
        ? rawReason.trim().slice(0, 500)
        : 'Blocked by Administrator'
      : null;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isSuspended: rawBlocked,
        suspendReason: safeReason,
      },
      select: {
        id: true,
        isSuspended: true,
        suspendReason: true,
      },
    });

    const plainEmail = targetUser.email
      ? decryptDeterministic(targetUser.email)?.trim().toLowerCase()
      : null;

    let blockedSubnet: string | null = null;

    if (rawBlocked) {
      await prisma.loginLog.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      });

      if (plainEmail) {
        await prisma.blockedUser.upsert({
          where: { value: plainEmail },
          update: { type: 'EMAIL', reason: safeReason },
          create: { type: 'EMAIL', value: plainEmail, reason: safeReason },
        });
      }

      if (blockIpSubnet) {
        const adminIp = normalizeIp(getClientIp(req));
        const adminSubnet = getIpSubnet(adminIp);
        const recentLogs = await prisma.loginLog.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { ipAddress: true },
        });

        for (const log of recentLogs) {
          const candidateIp = normalizeIp(log.ipAddress);
          if (!candidateIp || isLoopbackOrUnknownIp(candidateIp)) continue;
          if (adminIp && candidateIp === adminIp) continue;

          const subnet = getIpSubnet(candidateIp);
          if (subnet && (!adminSubnet || subnet !== adminSubnet)) {
            blockedSubnet = subnet;
            await prisma.blockedUser.upsert({
              where: { value: subnet },
              update: {
                type: 'IP',
                reason: `User blocked (${safeReason})`,
              },
              create: {
                type: 'IP',
                value: subnet,
                reason: `User blocked (${safeReason})`,
              },
            });
            await prisma.loginLog.updateMany({
              where: { userId, ipAddress: log.ipAddress },
              data: { isBanned: true },
            });
            break;
          }
        }
      }
    } else {
      if (plainEmail) {
        await prisma.blockedUser.deleteMany({
          where: { type: 'EMAIL', value: plainEmail },
        });
      }

      if (unblockIpSubnet) {
        const userLogs = await prisma.loginLog.findMany({
          where: { userId },
          select: { ipAddress: true },
        });
        const valuesToRemove = new Set<string>();
        for (const log of userLogs) {
          const cleanIp = normalizeIp(log.ipAddress);
          if (cleanIp && !isLoopbackOrUnknownIp(cleanIp)) {
            valuesToRemove.add(cleanIp);
            const subnet = getIpSubnet(cleanIp);
            if (subnet) valuesToRemove.add(subnet);
          }
        }
        if (valuesToRemove.size > 0) {
          await prisma.blockedUser.deleteMany({
            where: {
              type: 'IP',
              value: { in: Array.from(valuesToRemove) },
            },
          });
        }
        await prisma.loginLog.updateMany({
          where: { userId, isBanned: true },
          data: { isBanned: false },
        });
      }
    }

    await invalidateSecurityBlockCache();

    // Sync updated block status to Elasticsearch
    syncCustomerToElastic(userId).catch((err) =>
      console.debug('ES syncCustomer error:', err)
    );

    return NextResponse.json({
      success: true,
      data: {
        ...updatedUser,
        isBlocked: updatedUser.isSuspended,
        blockReason: updatedUser.suspendReason,
        blockedSubnet,
      },
    });
  } catch (error) {
    console.error('Block User Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
