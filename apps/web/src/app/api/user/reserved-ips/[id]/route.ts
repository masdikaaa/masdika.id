import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    const user = authResult.user!;

    const { id } = await params;
    const reservedIpId = Number(id);
    if (!Number.isSafeInteger(reservedIpId) || reservedIpId <= 0) {
      return NextResponse.json({ error: "Invalid Reserved IP ID" }, { status: 400 });
    }

    const reservedIp = await prisma.reservedIp.findFirst({
      where: { id: reservedIpId, userId: user.id }
    });

    if (!reservedIp) {
      return NextResponse.json({ error: "Reserved IP not found" }, { status: 404 });
    }

    if (reservedIp.isAttached) {
      return NextResponse.json({ error: "Cannot release an IP that is currently attached to a VPS or K3s. Please terminate the service first or detach the IP." }, { status: 400 });
    }

    // Atomically delete ONLY if still unattached (prevents concurrent attach + delete race condition!)
    const deleted = await prisma.reservedIp.deleteMany({
      where: { id: reservedIp.id, userId: user.id, isAttached: false }
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Cannot release an IP that was concurrently attached to a service." }, { status: 409 });
    }

    return NextResponse.json({ success: true, message: "Reserved IP deleted successfully" });
  } catch (error: any) {
    console.error("Release Reserved IP Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
