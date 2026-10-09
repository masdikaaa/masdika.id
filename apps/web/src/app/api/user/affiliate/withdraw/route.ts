import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { sendAdminNotificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const userId = auth.userId!;
    const user = auth.user!;

    const body = await req.json();
    const { amount, bankName, accountNumber, accountName } = body;

    const withdrawAmount = Number(amount);
    
    if (isNaN(withdrawAmount) || withdrawAmount < 50000) {
      return NextResponse.json({ error: "Minimum withdrawal amount is Rp 50.000" }, { status: 400 });
    }

    if (!bankName || !accountNumber || !accountName) {
      return NextResponse.json({ error: "Bank details are required" }, { status: 400 });
    }

    // Atomic transaction for withdrawal
    const result = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.user.updateMany({
        where: { id: userId, affiliateBalance: { gte: withdrawAmount } },
        data: { affiliateBalance: { decrement: withdrawAmount } }
      });

      if (updateResult.count === 0) {
        throw new Error("Insufficient affiliate balance or race condition detected");
      }

      const request = await tx.withdrawalRequest.create({
        data: {
          userId,
          amount: withdrawAmount,
          bankName,
          accountNumber,
          accountName,
          status: "PENDING"
        }
      });

      return request;
    });

    // Notify admin
    try {
      sendAdminNotificationEmail(
        "New Affiliate Withdrawal Request",
        `User ${user.name} (${user.email}) requested a withdrawal of Rp ${withdrawAmount}. Bank: ${bankName}, Account: ${accountNumber} (${accountName})`,
        `${process.env.NEXT_PUBLIC_APP_URL}/admin/users/${user.id}`
      );
    } catch (e) {
      console.error("Failed to send admin notification email", e);
    }

    return NextResponse.json({ success: true, request: result });

  } catch (error: any) {
    console.error("Affiliate Withdraw Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
