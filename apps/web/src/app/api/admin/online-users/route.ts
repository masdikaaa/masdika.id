import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { fetchOnlineUsersList } from "@/lib/presence-emitter";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'SUPER_ADMIN'] });

    if (auth.error || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const onlineUsers = await fetchOnlineUsersList();
    return NextResponse.json(onlineUsers);
  } catch (error) {
    console.error("Failed to fetch online users:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
