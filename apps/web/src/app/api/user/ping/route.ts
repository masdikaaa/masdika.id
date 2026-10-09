import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN', 'SUPER_ADMIN'] });

    if (auth.error || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: auth.userId },
      data: { lastActive: new Date() },
    });
    
    console.log(`Pinged user ${auth.userId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to ping user active status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
