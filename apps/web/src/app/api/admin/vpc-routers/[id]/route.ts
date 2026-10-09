import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const router = await prisma.vpcRouter.findUnique({
      where: { id: parseInt(id) },
    });

    if (!router) {
      return NextResponse.json({ error: "Router not found" }, { status: 404 });
    }

    return NextResponse.json(router);
  } catch (error) {
    console.error("VPC Router GET Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const { name, host, apiPort, useSsl, username, password, proxmoxBridge, interfaceName, wanInterface } = body;

    const dataToUpdate: any = {
      name,
      host,
      apiPort: Number(apiPort),
      useSsl,
      username,
      proxmoxBridge,
      interfaceName,
      wanInterface,
    };

    if (password && password.trim() !== "" && password !== "********") {
      dataToUpdate.password = password;
    }

    const router = await prisma.vpcRouter.update({
      where: { id: parseInt(id) },
      data: dataToUpdate,
    });

    return NextResponse.json(router);
  } catch (error) {
    console.error("VPC Router PUT Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    await prisma.vpcRouter.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("VPC Router DELETE Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
