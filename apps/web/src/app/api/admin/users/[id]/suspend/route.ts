import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';
import { syncCustomerToElastic } from '@/lib/sync-elasticsearch';

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const params = await props.params;
    const userId = parseInt(params.id);
    if (isNaN(userId)) return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });

    const body = await req.json();
    const { isSuspended, suspendReason } = body;

    if (typeof isSuspended !== 'boolean') {
      return NextResponse.json({ error: 'isSuspended must be a boolean' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isSuspended,
        suspendReason: isSuspended ? (suspendReason || 'Suspended by Administrator') : null,
      },
      select: {
        id: true,
        isSuspended: true,
        suspendReason: true,
      }
    });

    // Sync updated suspend status to Elasticsearch
    syncCustomerToElastic(userId).catch(err => console.debug("ES syncCustomer error:", err));

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error("Suspend User Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
