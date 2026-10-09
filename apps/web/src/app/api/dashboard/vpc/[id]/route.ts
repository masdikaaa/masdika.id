import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { deleteVpcFromMikrotik } from "@/lib/mikrotik";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const vpc = await prisma.vpcNetwork.findUnique({
      where: { id: parseInt(id) },
      include: {
        router: true,
        _count: {
          select: {
            vpsServices: { where: { status: { notIn: ["TERMINATED", "TERMINATING"] } } }
          }
        },
        peeringsA: true,
        peeringsB: true
      },
    });

    if (!vpc) return NextResponse.json({ error: "VPC not found" }, { status: 404 });
    if (vpc.userId !== auth.userId!) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (vpc._count.vpsServices > 0) {
      return NextResponse.json({ error: "Cannot delete VPC with active VPS services" }, { status: 400 });
    }

    if (vpc.peeringsA.length > 0 || vpc.peeringsB.length > 0) {
      return NextResponse.json({ error: "Silakan hapus VPC Peering terlebih dahulu sebelum menghapus VPC ini" }, { status: 400 });
    }

    await prisma.vpcNetwork.update({
      where: { id: vpc.id },
      data: { status: "TERMINATING" }
    });

    setImmediate(async () => {
      try {
        try {
          // Force 30s timeout — if Mikrotik hangs, we still clean up the DB record
          await Promise.race([
            deleteVpcFromMikrotik(vpc.router, vpc),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Mikrotik delete timed out after 30s")), 30000))
          ]);
        } catch (e: any) {
          console.error("Error removing VPC from router (continuing with DB delete):", e?.message);
        }

        await prisma.vpcNetwork.delete({
          where: { id: vpc.id },
        });
      } catch (err) {
        console.error("Background VPC Deletion Error:", err);
      }
    });

    return NextResponse.json({ success: true, message: "VPC is being deleted in the background" });
  } catch (error) {
    console.error("VPC DELETE Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
