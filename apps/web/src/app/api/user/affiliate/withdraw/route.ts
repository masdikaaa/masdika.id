import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { sendAdminNotificationEmail } from "@/lib/email";

function escapeHtml(val: string): string {
  return val
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    if (auth.impersonatedBy) {
      return NextResponse.json({ error: "Affiliate withdrawals are disabled during impersonation" }, { status: 403 });
    }

    const userId = auth.userId!;
    const user = auth.user!;

    const body = await req.json();
    const { amount, bankName, accountNumber, accountName } = body;

    const withdrawAmount = Number(amount);
    
    if (!Number.isSafeInteger(withdrawAmount) || withdrawAmount < 50000 || withdrawAmount > 100_000_000) {
      return NextResponse.json({ error: "Withdrawal amount must be an integer between Rp 50.000 and Rp 100.000.000" }, { status: 400 });
    }

    if (
      typeof bankName !== "string" || !bankName.trim() || bankName.trim().length > 64 ||
      typeof accountNumber !== "string" || !/^[0-9A-Za-z -]{5,34}$/.test(accountNumber.trim()) ||
      typeof accountName !== "string" || !accountName.trim() || accountName.trim().length > 100
    ) {
      return NextResponse.json({ error: "Valid bank name, account number, and account holder name are required" }, { status: 400 });
    }

    const safeBankName = bankName.trim();
    const safeAccountNumber = accountNumber.trim();
    const safeAccountName = accountName.trim();

    // Atomic transaction for withdrawal
    const result = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.user.updateMany({
        where: { id: userId, affiliateBalance: { gte: withdrawAmount } },
        data: { affiliateBalance: { decrement: withdrawAmount } }
      });

      if (updateResult.count === 0) {
        throw new Error("INSUFFICIENT_AFFILIATE_BALANCE");
      }

      const request = await tx.withdrawalRequest.create({
        data: {
          userId,
          amount: withdrawAmount,
          bankName: safeBankName,
          accountNumber: safeAccountNumber,
          accountName: safeAccountName,
          status: "PENDING"
        }
      });

      return request;
    });

    // Notify admin with HTML-escaped fields
    try {
      sendAdminNotificationEmail(
        "New Affiliate Withdrawal Request",
        `User ${escapeHtml(String(user.name || ""))} (${escapeHtml(String(user.email || ""))}) requested a withdrawal of Rp ${withdrawAmount.toLocaleString("id-ID")}. Bank: ${escapeHtml(safeBankName)}, Account: ${escapeHtml(safeAccountNumber)} (${escapeHtml(safeAccountName)})`,
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/users/${user.id}`
      );
    } catch (e) {
      console.error("Failed to send admin notification email", e);
    }

    return NextResponse.json({ success: true, request: result });

  } catch (error: any) {
    if (error?.message === "INSUFFICIENT_AFFILIATE_BALANCE") {
      return NextResponse.json({ error: "Insufficient affiliate balance" }, { status: 400 });
    }
    console.error("Affiliate Withdraw Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
