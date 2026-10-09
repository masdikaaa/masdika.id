import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error || !auth.user) {
      return NextResponse.json({ success: false, error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }

    const { promoId } = await req.json();

    if (!promoId) {
      return NextResponse.json({ success: false, error: "Promo ID is required" }, { status: 400 });
    }

    // Wrap the claim process in a transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch promo and lock the row for update
      const promo = await tx.promo.findUnique({
        where: { id: promoId }
        // Prisma doesn't natively support pessimistic locks in findUnique easily for all DBs without raw SQL,
        // but we can check constraints. For better concurrency, we can use an update statement with conditions.
      });

      if (!promo) {
        throw new Error("Promo not found");
      }

      if (!promo.isActive) {
        throw new Error("Promo is not active");
      }

      if (!promo.isReward) {
        throw new Error("This promo is not a claimable reward");
      }

      if (promo.validUntil && new Date(promo.validUntil).getTime() < Date.now()) {
        throw new Error("This promo has expired");
      }

      // 2. Check if user already claimed (prevents per-user double claiming)
      const existingClaim = await tx.promoClaim.findUnique({
        where: {
          promoId_userId: {
            promoId: promoId,
            userId: auth.user.id
          }
        }
      });

      if (existingClaim) {
        throw new Error("You have already claimed this reward");
      }

      // 3. Atomically attempt to claim a slot (prevents global race conditions)
      if (promo.maxClaims > 0) {
        const updateResult = await tx.promo.updateMany({
          where: {
            id: promoId,
            currentClaims: { lt: promo.maxClaims } // Crucial atomic condition
          },
          data: {
            currentClaims: { increment: 1 }
          }
        });
        
        if (updateResult.count === 0) {
          throw new Error("This reward has been fully claimed");
        }
      } else {
        // Unlimited claims
        await tx.promo.update({
          where: { id: promoId },
          data: {
            currentClaims: { increment: 1 }
          }
        });
      }

      // 4. Create the claim (if concurrent requests bypass the check, this unique constraint will throw and rollback the transaction)
      await tx.promoClaim.create({
        data: {
          promoId: promo.id,
          userId: auth.user.id,
          amount: promo.rewardAmount
        }
      });

      // 5. Add balance to user
      await tx.user.update({
        where: { id: auth.user.id },
        data: {
          balance: { increment: promo.rewardAmount }
        }
      });

      // Optional: Log an invoice for top-up to keep billing records clean
      await tx.invoice.create({
        data: {
          invoiceNumber: `RWD-${Date.now()}-${auth.user.id}`,
          userId: auth.user.id,
          amount: promo.rewardAmount,
          subtotal: promo.rewardAmount,
          status: "PAID",
          type: "TOP_UP",
          paymentMethod: "REWARD",
          merchantOrderId: `RWD-${Date.now()}-${auth.user.id}`,
          paidAt: new Date(),
          details: JSON.stringify({ description: `Reward claim for promo: ${promo.title}` })
        }
      });

      return { success: true };
    });

    return NextResponse.json(result);

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
