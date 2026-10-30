import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { syncCustomerToElastic } from "@/lib/sync-elasticsearch";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { balance, reason } = await req.json();
    if (balance === undefined || isNaN(Number(balance))) {
      return NextResponse.json({ error: "Invalid balance value" }, { status: 400 });
    }

    const newBalance = Number(balance);
    if (newBalance < 0) {
      return NextResponse.json({ error: "Balance cannot be set to a negative value" }, { status: 400 });
    }

    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Get current balance to calculate delta for audit
    const currentUser = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const delta = newBalance - currentUser.balance;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { balance: newBalance }
    });

    // Create audit invoice for manual balance adjustments
    if (delta !== 0) {
      await prisma.invoice.create({
        data: {
          invoiceNumber: `ADJ-${Date.now()}-${userId}`,
          userId,
          amount: Math.abs(delta),
          status: 'PAID',
          type: 'TOP_UP',
          paymentMethod: delta > 0 ? 'ADMIN_CREDIT' : 'ADMIN_DEBIT',
          merchantOrderId: `ADJ-${Date.now()}-${userId}`,
          paidAt: new Date(),
          details: JSON.stringify({ reason: reason || 'Manual balance adjustment by admin', adjustedBy: auth.userId, delta })
        }
      });

      // Auto-unsuspend any suspended services if balance was credited
      if (delta > 0) {
        const { attemptAutoUnsuspendAllForUser } = await import('@/lib/auto-unsuspend');
        await attemptAutoUnsuspendAllForUser(userId).catch(console.error);
      }
    }

    // Sync updated user to Elasticsearch (gracefully ignored on local dev if ES is not running)
    syncCustomerToElastic(userId).catch(err => console.debug("ES syncCustomer error:", err));

    return NextResponse.json({ success: true, balance: updatedUser.balance });
  } catch (error) {
    console.error("Update Balance Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
