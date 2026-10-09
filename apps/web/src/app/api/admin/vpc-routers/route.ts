import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const routers = await prisma.vpcRouter.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(routers);
  } catch (error) {
    console.error("VPC Routers GET Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const { name, host, apiPort, useSsl, username, password, proxmoxBridge, interfaceName, wanInterface } = body;

    const router = await prisma.vpcRouter.create({
      data: {
        name,
        host,
        apiPort: Number(apiPort),
        useSsl,
        username,
        password,
        proxmoxBridge,
        interfaceName,
        wanInterface,
      },
    });

    return NextResponse.json(router);
  } catch (error) {
    console.error("VPC Routers POST Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
