import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { decryptDeterministic } from "@/lib/encryption";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'SUPER_ADMIN'] });

    if (auth.error || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find users who have been active in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const onlineUsers = await prisma.user.findMany({
      where: {
        lastActive: {
          gte: fiveMinutesAgo
        },
        role: 'USER'
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        lastActive: true
      },
      orderBy: {
        lastActive: 'desc'
      }
    });

    // Decrypt name and email before sending to frontend
    const decryptedUsers = onlineUsers.map(user => ({
      ...user,
      name: decryptDeterministic(user.name) || 'Unknown',
      email: decryptDeterministic(user.email) || '',
    }));

    return NextResponse.json(decryptedUsers);
  } catch (error) {
    console.error("Failed to fetch online users:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
