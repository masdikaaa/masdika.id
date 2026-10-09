import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const resellers = await prisma.user.findMany({
      where: { isReseller: true },
      select: {
        id: true,
        name: true,
        email: true,
        balance: true,
        createdAt: true,
        apiKeys: {
          select: { id: true, key: true, status: true, usageCount: true, lastUsed: true, createdAt: true }
        },
        _count: {
          select: { vpsServices: { where: { isReseller: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, resellers });
  } catch (error: any) {
    console.error("GET Admin Resellers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
