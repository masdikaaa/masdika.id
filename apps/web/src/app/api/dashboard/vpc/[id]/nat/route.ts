import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { toggleVpcNatOnMikrotik } from "@/lib/mikrotik";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const { isNatEnabled } = body;

    const vpc = await prisma.vpcNetwork.findUnique({
      where: { id: parseInt(id) },
      include: { router: true },
    });

    if (!vpc) return NextResponse.json({ error: "VPC not found" }, { status: 404 });
    if (vpc.userId !== auth.userId!) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (vpc.isNatEnabled === isNatEnabled) {
      return NextResponse.json({ success: true, message: "No changes needed" });
    }

    try {
      await toggleVpcNatOnMikrotik(vpc.router, vpc, isNatEnabled);
    } catch (e: any) {
      console.error("Error updating VPC NAT on Mikrotik", e);
      return NextResponse.json({ error: "Failed to update router configuration" }, { status: 500 });
    }

    await prisma.vpcNetwork.update({
      where: { id: vpc.id },
      data: { isNatEnabled },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("VPC NAT PATCH Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
