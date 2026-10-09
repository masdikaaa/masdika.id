import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    const user = authResult.user!;

    const { id } = await params;
    const reservedIpId = parseInt(id);

    const reservedIp = await prisma.reservedIp.findFirst({
      where: { id: reservedIpId, userId: user.id }
    });

    if (!reservedIp) {
      return NextResponse.json({ error: "Reserved IP not found" }, { status: 404 });
    }

    if (reservedIp.isAttached) {
      return NextResponse.json({ error: "Cannot release an IP that is currently attached to a VPS or K3s. Please terminate the service first or detach the IP." }, { status: 400 });
    }

    // 1. Delete IP Address assignment from VPS if attached
    if (reservedIp.isAttached && reservedIp.vpsId) {
      await prisma.vpsIpAssignment.deleteMany({
        where: {
          vpsId: reservedIp.vpsId,
          ipAddress: reservedIp.ipAddress
        }
      });
    }

    // 2. Finally, delete the ReservedIp record entirely. 
    // (Billing is handled hourly, so no final charge is needed).
    await prisma.reservedIp.delete({
      where: { id: reservedIp.id }
    });

    return NextResponse.json({ success: true, message: "Reserved IP deleted successfully" });
  } catch (error: any) {
    console.error("Release Reserved IP Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
