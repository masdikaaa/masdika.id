import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { toggleVpcNatOnMikrotik } from "@/lib/mikrotik";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const vpcId = parseInt(params.id);
    const body = await req.json();
    const { isNatEnabled, forceDbOnly } = body;

    const vpc = await prisma.vpcNetwork.findUnique({
      where: { id: vpcId },
      include: { router: true },
    });
    if (!vpc) return NextResponse.json({ error: "VPC not found" }, { status: 404 });

    const newNatState = typeof isNatEnabled === "boolean" ? isNatEnabled : !vpc.isNatEnabled;

    if (!forceDbOnly && vpc.router) {
      try {
        await toggleVpcNatOnMikrotik(vpc.router, vpc, newNatState);
      } catch (err: any) {
        console.warn("MikroTik NAT toggle warning:", err?.message);
      }
    }

    const updated = await prisma.vpcNetwork.update({
      where: { id: vpc.id },
      data: { isNatEnabled: newNatState, lastUsedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      isNatEnabled: updated.isNatEnabled,
      message: `NAT ${updated.isNatEnabled ? "enabled" : "disabled"} successfully.`,
    });
  } catch (error) {
    console.error("Admin VPC NAT Toggle Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
