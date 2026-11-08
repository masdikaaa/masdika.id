import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX_WALLET_BALANCE = 2_000_000_000;

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error || !auth.user) {
      return NextResponse.json({ success: false, error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
    }
    if (auth.impersonatedBy) {
      return NextResponse.json({ success: false, error: "Promo claims are disabled during impersonation" }, { status: 403 });
    }

    const allowed = await checkRateLimit("PROMO_CLAIM", String(auth.user.id), 10, 60);
    if (!allowed) {
      return NextResponse.json({ success: false, error: "Too many attempts. Please wait a minute." }, { status: 429 });
    }

    const body = await req.json();
    const promoId = Number(body?.promoId);

    if (!Number.isSafeInteger(promoId) || promoId <= 0) {
      return NextResponse.json({ success: false, error: "Valid Promo ID is required" }, { status: 400 });
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

      if (!Number.isSafeInteger(promo.rewardAmount) || promo.rewardAmount <= 0) {
        throw new Error("Invalid promo reward configuration");
      }

      // 5. Add balance to user (guarded against 32-bit INT overflow)
      const currentUser = await tx.user.findUnique({ where: { id: auth.user.id }, select: { balance: true } });
      if ((currentUser?.balance || 0) + promo.rewardAmount > MAX_WALLET_BALANCE) {
        throw new Error("Maximum wallet balance limit reached");
      }

      await tx.user.update({
        where: { id: auth.user.id },
        data: {
          balance: { increment: promo.rewardAmount }
        }
      });

      const rewardInvoiceId = `RWD-${Date.now()}-${auth.user.id}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
      await tx.invoice.create({
        data: {
          invoiceNumber: rewardInvoiceId,
          userId: auth.user.id,
          amount: promo.rewardAmount,
          subtotal: promo.rewardAmount,
          status: "PAID",
          type: "TOP_UP",
          paymentMethod: "REWARD",
          merchantOrderId: rewardInvoiceId,
          paidAt: new Date(),
          details: JSON.stringify({ description: `Reward claim for promo: ${promo.title}` })
        }
      });

      return { success: true };
    });

    return NextResponse.json(result);

  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ success: false, error: "You have already claimed this reward" }, { status: 400 });
    }
    const safeMessages = new Set([
      "Promo not found",
      "Promo is not active",
      "This promo is not a claimable reward",
      "This promo has expired",
      "You have already claimed this reward",
      "This reward has been fully claimed",
      "Invalid promo reward configuration",
      "Maximum wallet balance limit reached",
    ]);
    const message = safeMessages.has(err?.message) ? err.message : "Failed to claim promo reward";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
