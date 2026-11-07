import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { notifyUserPresencePing } from "@/lib/presence-emitter";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN', 'SUPER_ADMIN'] });

    if (auth.error || !auth.userId || !auth.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    await prisma.user.update({
      where: { id: auth.userId },
      data: { lastActive: now },
    });

    notifyUserPresencePing({
      id: auth.userId,
      name: auth.user.name,
      email: auth.user.email,
      image: auth.user.image,
      role: auth.user.role,
      lastActive: now,
    });

    return NextResponse.json({ success: true, lastActive: now.toISOString() });
  } catch (error) {
    console.error("Failed to ping user active status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
