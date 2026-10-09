import { NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const userId = auth.userId!;
    const user = auth.user!;

    const { id } = await params;
    const whereClause: any = { id: parseInt(id) };
    if (user?.role !== "ADMIN") {
        whereClause.userId = userId;
    }

    const vps = await prisma.vpsService.findFirst({
      where: whereClause
    });

    if (!vps || !vps.vmid) {
      return NextResponse.json({ error: "VPS not found or not provisioned" }, { status: 404 });
    }

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) return NextResponse.json({ error: "Proxmox server not found" }, { status: 500 });

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
    const snapshotsData = await proxmox.getVMSnapshots(vps.node, vps.vmid);

    return NextResponse.json(snapshotsData);
  } catch (error) {
    console.error("GET VPS snapshots error:", error);
    return NextResponse.json({ error: "Failed to fetch snapshots" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const userId = auth.userId!;
    const user = auth.user!;

    const body = await req.json();
    const { snapname, description, includeRam } = body;

    if (!snapname || !/^[a-zA-Z0-9]+$/.test(snapname)) {
        return NextResponse.json({ error: "Invalid snapshot name. Only alphanumeric characters are allowed without spaces." }, { status: 400 });
    }

    const { id } = await params;
    const whereClause: any = { id: parseInt(id) };
    if (user?.role !== "ADMIN") {
        whereClause.userId = userId;
    }

    const vps = await prisma.vpsService.findFirst({
      where: whereClause
    });

    if (!vps || !vps.vmid) {
      return NextResponse.json({ error: "VPS not found or not provisioned" }, { status: 404 });
    }

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) return NextResponse.json({ error: "Proxmox server not found" }, { status: 500 });

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
    const existingSnapshots = await proxmox.getVMSnapshots(vps.node, vps.vmid);
    
    // Proxmox usually returns an array in existingSnapshots.data
    // Note: The root snapshot usually has name 'current' and shouldn't be counted against limit, but let's check array size.
    let snapCount = 0;
    if (existingSnapshots && existingSnapshots.data) {
        // Filter out 'current' virtual state
        const actualSnaps = existingSnapshots.data.filter((s: any) => s.name && s.name !== 'current');
        snapCount = actualSnaps.length;
    }

    if (snapCount >= 2 && user.role !== "ADMIN") {
        return NextResponse.json({ error: "Maximum snapshot limit (2) reached. Please delete an old snapshot first." }, { status: 400 });
    }

    const result = await proxmox.createVMSnapshot(vps.node, vps.vmid, snapname, description, includeRam);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("POST VPS snapshot error:", error);
    return NextResponse.json({ error: error?.message || "Failed to create snapshot" }, { status: 500 });
  }
}
