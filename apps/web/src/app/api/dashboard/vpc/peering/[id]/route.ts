import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { deleteVpcPeeringFromMikrotik } from "@/lib/mikrotik";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const peering = await prisma.vpcPeering.findUnique({
      where: { id: parseInt(id) },
      include: { vpcA: { include: { router: true } }, vpcB: true }
    });

    if (!peering) return NextResponse.json({ error: "Peering not found" }, { status: 404 });
    if (peering.vpcA.userId !== auth.userId! && peering.vpcB.userId !== auth.userId!) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.vpcPeering.update({
      where: { id: peering.id },
      data: { status: "TERMINATING" } // UI can show deleting status
    });

    setImmediate(async () => {
      try {
        try {
          await deleteVpcPeeringFromMikrotik(peering.vpcA.router, peering.id);
        } catch (e: any) {
          console.error("Error removing Peering from router", e);
        }

        await prisma.vpcPeering.delete({
          where: { id: peering.id },
        });
      } catch (err) {
        console.error("Background Peering Deletion Error:", err);
      }
    });

    return NextResponse.json({ success: true, message: "Peering is being deleted in the background" });
  } catch (error) {
    console.error("VPC Peering DELETE Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
