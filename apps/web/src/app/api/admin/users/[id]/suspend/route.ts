import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';
import { syncCustomerToElastic } from '@/lib/sync-elasticsearch';

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (auth.impersonatedBy) {
    return NextResponse.json({ error: 'Cannot suspend or unsuspend users during impersonation.' }, { status: 403 });
  }

  try {
    const params = await props.params;
    const userId = parseInt(params.id, 10);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    if (userId === auth.userId) {
      return NextResponse.json({ error: 'Cannot suspend your own administrator account' }, { status: 400 });
    }

    const body = await req.json();
    const { isSuspended, suspendReason } = body;

    if (typeof isSuspended !== 'boolean') {
      return NextResponse.json({ error: 'isSuspended must be a boolean' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true }
    });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (targetUser.role === 'ADMIN' || targetUser.role === 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Cannot suspend administrator accounts' }, { status: 403 });
    }

    const safeReason = isSuspended
      ? (typeof suspendReason === 'string' && suspendReason.trim() ? suspendReason.trim().slice(0, 500) : 'Suspended by Administrator')
      : null;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isSuspended,
        suspendReason: safeReason,
      },
      select: {
        id: true,
        isSuspended: true,
        suspendReason: true,
      }
    });

    if (isSuspended) {
      await prisma.loginLog.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true }
      });
    }

    // Sync updated suspend status to Elasticsearch
    syncCustomerToElastic(userId).catch(err => console.debug("ES syncCustomer error:", err));

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error("Suspend User Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
