import { NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user!;

    const { orderedIds } = await req.json();

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // Update orders in a transaction
    await prisma.$transaction(
      orderedIds.map((id: number, index: number) =>
        prisma.vpsPlan.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT VPS plan reorder error:", error);
    return NextResponse.json({ error: "Failed to reorder plans" }, { status: 500 });
  }
}
