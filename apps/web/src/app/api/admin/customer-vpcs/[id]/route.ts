import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { deleteVpcFromMikrotik } from "@/lib/mikrotik";

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const vpcId = parseInt(params.id);
    if (isNaN(vpcId)) {
      return NextResponse.json({ error: "Invalid VPC ID" }, { status: 400 });
    }

    let forceDbOnly = false;
    let detachVmsFirst = false;

    try {
      const body = await req.json();
      if (body.forceDbOnly !== undefined) forceDbOnly = Boolean(body.forceDbOnly);
      if (body.detachVmsFirst !== undefined) detachVmsFirst = Boolean(body.detachVmsFirst);
    } catch {
      // Body may be empty if called without json payload
    }

    const vpc = await prisma.vpcNetwork.findUnique({
      where: { id: vpcId },
      include: {
        router: true,
        _count: {
          select: {
            vpsServices: { where: { status: { notIn: ["TERMINATED", "TERMINATING"] } } },
            peeringsA: true,
            peeringsB: true,
          },
        },
        peeringsA: true,
        peeringsB: true,
      },
    });

    if (!vpc) {
      return NextResponse.json({ error: "VPC not found" }, { status: 404 });
    }

    if (vpc._count.vpsServices > 0 && !detachVmsFirst) {
      return NextResponse.json({
        error: `Cannot delete VPC with ${vpc._count.vpsServices} active attached VMs. Detach VMs first or enable 'Auto-detach VMs' option.`,
      }, { status: 400 });
    }

    // If detachVmsFirst is enabled, unlink all attached VMs
    if (vpc._count.vpsServices > 0 && detachVmsFirst) {
      await prisma.vpsService.updateMany({
        where: { vpcId: vpc.id },
        data: { vpcId: null, vpcIp: null },
      });
    }

    // Delete associated peerings first (cascade)
    await prisma.vpcPeering.deleteMany({
      where: {
        OR: [{ vpcAId: vpc.id }, { vpcBId: vpc.id }],
      },
    });

    // If not forceDbOnly, attempt to clean up MikroTik
    if (!forceDbOnly && vpc.router) {
      try {
        await Promise.race([
          deleteVpcFromMikrotik(vpc.router, vpc),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("MikroTik delete timed out after 10s")), 10000)
          ),
        ]);
      } catch (err: any) {
        console.warn("Could not delete VPC from MikroTik (continuing with DB deletion):", err?.message);
      }
    }

    // Delete VPC from database
    await prisma.vpcNetwork.delete({
      where: { id: vpc.id },
    });

    return NextResponse.json({
      success: true,
      message: forceDbOnly
        ? "VPC deleted from database successfully (MikroTik skipped)."
        : "VPC and associated resources deleted successfully.",
    });
  } catch (error) {
    console.error("Admin Customer VPC DELETE Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
