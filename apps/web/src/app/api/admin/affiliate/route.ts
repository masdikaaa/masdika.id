import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;

    const withdrawals = await prisma.withdrawalRequest.findMany({
      where: status ? { status } : undefined,
      include: {
        user: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(withdrawals);
  } catch (error) {
    console.error("Admin Affiliate GET Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id, action } = await req.json(); // action can be "APPROVE" or "REJECT"

    if (!id || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const request = await prisma.withdrawalRequest.findUnique({
      where: { id: Number(id) }
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (request.status !== "PENDING") {
      return NextResponse.json({ error: "Request is already processed" }, { status: 400 });
    }

    if (action === "APPROVE") {
      const updated = await prisma.withdrawalRequest.updateMany({
        where: { id: request.id, status: "PENDING" },
        data: { status: "PAID" }
      });
      if (updated.count === 0) {
        return NextResponse.json({ error: "Request was already processed concurrently" }, { status: 409 });
      }
      // Optionally send success email to user
    } else if (action === "REJECT") {
      try {
        await prisma.$transaction(async (tx) => {
          const updated = await tx.withdrawalRequest.updateMany({
            where: { id: request.id, status: "PENDING" },
            data: { status: "REJECTED" }
          });
          if (updated.count === 0) {
            throw new Error("ALREADY_PROCESSED");
          }
          await tx.user.update({
            where: { id: request.userId },
            data: { affiliateBalance: { increment: request.amount } }
          });
        });
      } catch (err: any) {
        if (err.message === "ALREADY_PROCESSED") {
          return NextResponse.json({ error: "Request was already processed concurrently" }, { status: 409 });
        }
        throw err;
      }
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin Affiliate POST Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
