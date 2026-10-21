import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { createVpcPeeringOnMikrotik } from "@/lib/mikrotik";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const { vpcAId, vpcBId, description, forceDbOnly } = body;

    if (!vpcAId || !vpcBId) {
      return NextResponse.json({ error: "Both VPC A and VPC B are required" }, { status: 400 });
    }

    if (parseInt(vpcAId) === parseInt(vpcBId)) {
      return NextResponse.json({ error: "Cannot peer a VPC to itself" }, { status: 400 });
    }

    const vpcA = await prisma.vpcNetwork.findUnique({
      where: { id: parseInt(vpcAId) },
      include: { router: true },
    });
    const vpcB = await prisma.vpcNetwork.findUnique({
      where: { id: parseInt(vpcBId) },
      include: { router: true },
    });

    if (!vpcA || !vpcB) {
      return NextResponse.json({ error: "One or both VPCs not found" }, { status: 404 });
    }

    if (vpcA.userId !== vpcB.userId) {
      return NextResponse.json({
        error: "VPC peering must be between VPCs owned by the same customer",
      }, { status: 400 });
    }

    if (vpcA.routerId !== vpcB.routerId) {
      return NextResponse.json({
        error: "VPC peering across different routers is not supported in this version",
      }, { status: 400 });
    }

    // Check existing peering
    const existing = await prisma.vpcPeering.findFirst({
      where: {
        OR: [
          { vpcAId: vpcA.id, vpcBId: vpcB.id },
          { vpcAId: vpcB.id, vpcBId: vpcA.id },
        ],
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Peering already exists between these VPCs" }, { status: 400 });
    }

    const peering = await prisma.vpcPeering.create({
      data: {
        vpcAId: vpcA.id,
        vpcBId: vpcB.id,
        description: description || null,
        status: forceDbOnly ? "ACTIVE" : "PENDING",
      },
      include: {
        vpcA: { select: { id: true, name: true, cidr: true } },
        vpcB: { select: { id: true, name: true, cidr: true } },
      },
    });

    if (!forceDbOnly && vpcA.router) {
      setImmediate(async () => {
        try {
          await createVpcPeeringOnMikrotik(vpcA.router, vpcA, vpcB, peering.id);
          await prisma.vpcPeering.update({
            where: { id: peering.id },
            data: { status: "ACTIVE" },
          });
        } catch (error: any) {
          console.error("MikroTik Peering Provisioning Error:", error?.message);
          await prisma.vpcPeering.update({
            where: { id: peering.id },
            data: { status: "FAILED" },
          });
        }
      });
    }

    return NextResponse.json({
      success: true,
      peering,
      message: forceDbOnly
        ? "Peering created in database successfully (MikroTik skipped)."
        : "Peering created successfully and provisioning on router.",
    });
  } catch (error) {
    console.error("Admin Peering POST Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
