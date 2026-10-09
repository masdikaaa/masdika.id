import { NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const pools = await prisma.ipPool.findMany({
      include: {
        assignedIps: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(pools);
  } catch (error) {
    console.error("GET IP pools error:", error);
    return NextResponse.json({ error: "Failed to fetch IP pools" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const { network, gateway, startIp, endIp, version, type } = body;

    if (!network || !gateway || !type) {
      return NextResponse.json({ error: "network, gateway, and type are required" }, { status: 400 });
    }

    const parsedVersion = Number(version);
    if (![4, 6].includes(parsedVersion)) {
      return NextResponse.json({ error: "version must be 4 or 6" }, { status: 400 });
    }

    const pool = await prisma.ipPool.create({
      data: {
        network,
        gateway,
        startIp: parsedVersion === 6 ? null : startIp,
        endIp: parsedVersion === 6 ? null : endIp,
        version: parsedVersion,
        type,
      },
    });

    return NextResponse.json(pool);
  } catch (error: any) {
    console.error("POST IP pool error:", error);
    return NextResponse.json({ error: "Failed to create IP pool" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });
    const parsedId = Number(id);
    if (isNaN(parsedId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    await prisma.ipPool.delete({
      where: { id: parsedId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE IP pool error:", error);
    return NextResponse.json({ error: "Failed to delete IP pool" }, { status: 500 });
  }
}
