import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    // Fetch VMs belonging to the user that are NOT attached to any VPC
    const availableVms = await prisma.vpsService.findMany({
      where: {
        userId: auth.userId!,
        vpcId: null, // Only VMs not in any VPC
        status: { in: ["RUNNING", "STOPPED"] }, // Must be in a valid state to modify network
      },
      select: {
        id: true,
        vmid: true,
        hostname: true,
        node: true,
      },
      orderBy: { hostname: "asc" },
    });

    return NextResponse.json({ success: true, data: availableVms });
  } catch (error) {
    console.error("Fetch available VMs error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
