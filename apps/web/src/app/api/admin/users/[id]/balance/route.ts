import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { syncCustomerToElastic } from "@/lib/sync-elasticsearch";

const MAX_WALLET_BALANCE = 2_000_000_000;

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (auth.impersonatedBy) {
    return NextResponse.json({ error: "Balance modification is forbidden during impersonation" }, { status: 403 });
  }

  try {
    const { balance, reason } = await req.json();
    const newBalance = Number(balance);
    if (!Number.isSafeInteger(newBalance) || newBalance < 0 || newBalance > MAX_WALLET_BALANCE) {
      return NextResponse.json({ error: "Balance must be an integer between Rp 0 and Rp 2.000.000.000" }, { status: 400 });
    }

    const userId = Number(id);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const safeReason = typeof reason === "string" && reason.trim() ? reason.trim().slice(0, 500) : "Manual balance adjustment by admin";

    // Atomic compare-and-swap + audit invoice inside a single transaction
    const txResult = await prisma.$transaction(async (tx) => {
      const currentUser = await tx.user.findUnique({ where: { id: userId }, select: { balance: true } });
      if (!currentUser) {
        throw new Error("USER_NOT_FOUND");
      }

      const delta = newBalance - currentUser.balance;
      if (delta === 0) {
        return { balance: currentUser.balance, delta: 0 };
      }

      const updated = await tx.user.updateMany({
        where: { id: userId, balance: currentUser.balance },
        data: { balance: newBalance }
      });
      if (updated.count === 0) {
        throw new Error("CONCURRENT_BALANCE_MODIFICATION");
      }

      const adjInvoiceNumber = `ADJ-${Date.now()}-${userId}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      await tx.invoice.create({
        data: {
          invoiceNumber: adjInvoiceNumber,
          userId,
          amount: Math.abs(delta),
          subtotal: Math.abs(delta),
          status: 'PAID',
          type: 'TOP_UP',
          paymentMethod: delta > 0 ? 'ADMIN_CREDIT' : 'ADMIN_DEBIT',
          merchantOrderId: adjInvoiceNumber,
          paidAt: new Date(),
          details: JSON.stringify({ reason: safeReason, adjustedBy: auth.userId, delta })
        }
      });

      return { balance: newBalance, delta };
    });

    if (txResult.delta > 0) {
      const { attemptAutoUnsuspendAllForUser } = await import('@/lib/auto-unsuspend');
      await attemptAutoUnsuspendAllForUser(userId).catch(console.error);
    }

    // Sync updated user to Elasticsearch (gracefully ignored on local dev if ES is not running)
    syncCustomerToElastic(userId).catch(err => console.debug("ES syncCustomer error:", err));

    return NextResponse.json({ success: true, balance: txResult.balance });
  } catch (error: any) {
    if (error?.message === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (error?.message === "CONCURRENT_BALANCE_MODIFICATION") {
      return NextResponse.json({ error: "User balance changed concurrently. Please refresh and try again." }, { status: 409 });
    }
    console.error("Update Balance Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
