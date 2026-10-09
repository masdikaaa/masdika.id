import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { createVpcPeeringOnMikrotik } from "@/lib/mikrotik";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const peerings = await prisma.vpcPeering.findMany({
      where: {
        vpcA: { userId: auth.userId! }
      },
      include: {
        vpcA: true,
        vpcB: true
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(peerings);
  } catch (error) {
    console.error("VPC Peering GET Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const { vpcAId, vpcBId, description } = body;

    if (!vpcAId || !vpcBId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (vpcAId === vpcBId) {
      return NextResponse.json({ error: "Cannot peer a VPC to itself" }, { status: 400 });
    }

    const vpcA = await prisma.vpcNetwork.findUnique({ where: { id: parseInt(vpcAId) }, include: { router: true } });
    const vpcB = await prisma.vpcNetwork.findUnique({ where: { id: parseInt(vpcBId) }, include: { router: true } });

    if (!vpcA || !vpcB) return NextResponse.json({ error: "VPC not found" }, { status: 404 });
    if (vpcA.userId !== auth.userId! || vpcB.userId !== auth.userId!) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Check if on same router
    if (vpcA.routerId !== vpcB.routerId) {
      return NextResponse.json({ error: "VPC Peering across different routers is not supported in this version" }, { status: 400 });
    }

    // Check if peering already exists inside an atomic transaction with a row-level lock
    const existing = await prisma.$transaction(async (tx) => {
      // SECURITY: Row-level write lock on VPC A to serialize peering creations
      await tx.vpcNetwork.update({
        where: { id: vpcA.id },
        data: { updatedAt: new Date() }
      });

      return await tx.vpcPeering.findFirst({
        where: {
          OR: [
            { vpcAId: vpcA.id, vpcBId: vpcB.id },
            { vpcAId: vpcB.id, vpcBId: vpcA.id }
          ]
        }
      });
    });

    if (existing) {
      return NextResponse.json({ error: "Peering already exists between these VPCs" }, { status: 400 });
    }

    const peering = await prisma.vpcPeering.create({
      data: {
        vpcAId: vpcA.id,
        vpcBId: vpcB.id,
        description,
        status: "PENDING"
      },
    });

    setImmediate(async () => {
      try {
        await createVpcPeeringOnMikrotik(vpcA.router, vpcA, vpcB, peering.id);
        await prisma.vpcPeering.update({
          where: { id: peering.id },
          data: { status: "ACTIVE" }
        });
      } catch (error: any) {
        console.error("Mikrotik Peering Provisioning Error:", error);
        await prisma.vpcPeering.update({
          where: { id: peering.id },
          data: { status: "FAILED" }
        });
      }
    });

    return NextResponse.json({ ...peering, status: "PENDING" });
  } catch (error) {
    console.error("VPC Peering POST Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
