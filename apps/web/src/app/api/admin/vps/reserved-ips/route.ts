import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { decryptDeterministic } from "@/lib/encryption";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const reservedIps = await prisma.reservedIp.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        ipPool: { select: { id: true, network: true, gateway: true } },
        vps: { select: { id: true, hostname: true, vmid: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const decryptedReservedIps = reservedIps.map(ip => ({
      ...ip,
      user: {
        ...ip.user,
        name: ip.user.name ? decryptDeterministic(ip.user.name) : "Unknown",
        email: ip.user.email ? decryptDeterministic(ip.user.email) : "Unknown",
      }
    }));

    return NextResponse.json(decryptedReservedIps);
  } catch (error: any) {
    console.error("Error fetching admin reserved IPs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id, publicIp } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existingIp = await prisma.reservedIp.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingIp) {
      return NextResponse.json({ error: "Reserved IP not found" }, { status: 404 });
    }

    const updatedIp = await prisma.reservedIp.update({
      where: { id: parseInt(id) },
      data: { publicIp: publicIp || null },
    });

    if (existingIp.vpsId) {
      await prisma.vpsIpAssignment.updateMany({
        where: {
          vpsId: existingIp.vpsId,
          ipAddress: existingIp.ipAddress,
        },
        data: { publicIp: publicIp || null },
      });
    }

    return NextResponse.json({ message: "Reserved IP updated successfully", data: updatedIp });
  } catch (error: any) {
    console.error("Error updating reserved IP:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing ID parameter" }, { status: 400 });
    }

    await prisma.reservedIp.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ message: "Reserved IP deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting reserved IP:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
