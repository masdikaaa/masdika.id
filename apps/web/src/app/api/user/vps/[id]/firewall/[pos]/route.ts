import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { ProxmoxClient } from "@/lib/proxmox";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string, pos: string }> }) {
  try {
    const resolvedParams = await params;
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const vpsId = parseInt(resolvedParams.id);
    const pos = parseInt(resolvedParams.pos);
    if (isNaN(vpsId) || isNaN(pos)) return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });

    const body = await req.json();

    const vps = await prisma.vpsService.findUnique({
      where: { id: vpsId, userId: auth.user?.role === 'ADMIN' ? undefined : auth.userId }
    });

    if (!vps) return NextResponse.json({ error: "VPS not found" }, { status: 404 });
    if (!vps.vmid) return NextResponse.json({ error: "VPS not provisioned yet" }, { status: 400 });
    if (vps.status === "SUSPENDED" || vps.status === "TERMINATED") return NextResponse.json({ error: "VPS is suspended or terminated" }, { status: 403 });

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) return NextResponse.json({ error: "No active Proxmox server configured" }, { status: 500 });

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
    const updatedRule = await proxmox.updateFirewallRule(vps.node, vps.vmid, pos, body);

    return NextResponse.json({ success: true, rule: updatedRule });
  } catch (error: any) {
    console.error("Failed to update firewall rule:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string, pos: string }> }) {
  try {
    const resolvedParams = await params;
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const vpsId = parseInt(resolvedParams.id);
    const pos = parseInt(resolvedParams.pos);
    if (isNaN(vpsId) || isNaN(pos)) return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });

    const vps = await prisma.vpsService.findUnique({
      where: { id: vpsId, userId: auth.user?.role === 'ADMIN' ? undefined : auth.userId }
    });

    if (!vps) return NextResponse.json({ error: "VPS not found" }, { status: 404 });
    if (!vps.vmid) return NextResponse.json({ error: "VPS not provisioned yet" }, { status: 400 });
    if (vps.status === "SUSPENDED" || vps.status === "TERMINATED") return NextResponse.json({ error: "VPS is suspended or terminated" }, { status: 403 });

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) return NextResponse.json({ error: "No active Proxmox server configured" }, { status: 500 });

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
    await proxmox.deleteFirewallRule(vps.node, vps.vmid, pos);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete firewall rule:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
