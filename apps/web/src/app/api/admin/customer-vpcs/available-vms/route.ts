import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");

    if (!customerId) {
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
    }

    const availableVms = await prisma.vpsService.findMany({
      where: {
        userId: parseInt(customerId),
        vpcId: null, // Only VMs not attached to any VPC
        status: { notIn: ["TERMINATED", "TERMINATING"] },
      },
      select: {
        id: true,
        vmid: true,
        hostname: true,
        node: true,
        status: true,
        cpuCores: true,
        ramGb: true,
        diskGb: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(availableVms);
  } catch (error) {
    console.error("Admin Available VMs Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
