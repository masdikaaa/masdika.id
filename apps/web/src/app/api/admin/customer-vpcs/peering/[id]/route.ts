import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { deleteVpcPeeringFromMikrotik } from "@/lib/mikrotik";

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const peeringId = parseInt(params.id);
    if (isNaN(peeringId)) {
      return NextResponse.json({ error: "Invalid Peering ID" }, { status: 400 });
    }

    let forceDbOnly = false;
    try {
      const body = await req.json();
      if (body.forceDbOnly !== undefined) forceDbOnly = Boolean(body.forceDbOnly);
    } catch {
      // Body may be empty
    }

    const peering = await prisma.vpcPeering.findUnique({
      where: { id: peeringId },
      include: {
        vpcA: { include: { router: true } },
        vpcB: true,
      },
    });

    if (!peering) {
      return NextResponse.json({ error: "Peering not found" }, { status: 404 });
    }

    if (!forceDbOnly && peering.vpcA?.router) {
      try {
        await Promise.race([
          deleteVpcPeeringFromMikrotik(peering.vpcA.router, peering.id),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("MikroTik unpeer timed out after 10s")), 10000)
          ),
        ]);
      } catch (err: any) {
        console.warn("Could not delete peering from MikroTik (continuing with DB deletion):", err?.message);
      }
    }

    await prisma.vpcPeering.delete({
      where: { id: peering.id },
    });

    return NextResponse.json({
      success: true,
      message: forceDbOnly
        ? "Peering deleted from database successfully (MikroTik skipped)."
        : "Peering removed successfully.",
    });
  } catch (error) {
    console.error("Admin Peering DELETE Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
