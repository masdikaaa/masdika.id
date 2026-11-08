import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string, upid: string }> }) {
  try {
    const { id, upid } = await params;
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const vpsId = parseInt(id, 10);
    if (!Number.isSafeInteger(vpsId) || vpsId <= 0) {
      return NextResponse.json({ error: "Invalid VPS ID" }, { status: 400 });
    }

    const vps = await prisma.vpsService.findUnique({
      where: {
        id: vpsId,
        ...(auth.user?.role === 'ADMIN' || auth.user?.role === 'SUPER_ADMIN' ? {} : { userId: auth.userId })
      }
    });
    if (!vps || !vps.vmid) return NextResponse.json({ error: "VPS not found or not provisioned" }, { status: 404 });

    const decodedUpid = decodeURIComponent(upid);
    // Proxmox UPID format: UPID:<node>:<pid>:<pstart>:<starttime>:<type>:<id>:<user>@<realm>:
    const upidParts = decodedUpid.split(":");
    const isAdmin = auth.user?.role === 'ADMIN' || auth.user?.role === 'SUPER_ADMIN';
    if (
      upidParts.length < 8 ||
      upidParts[0] !== "UPID" ||
      !/^[a-zA-Z0-9:@._!-]+$/.test(decodedUpid) ||
      upidParts[1] !== vps.node ||
      (!isAdmin && upidParts[6] !== String(vps.vmid))
    ) {
      return NextResponse.json({ error: "Forbidden: Task does not belong to this VPS" }, { status: 403 });
    }

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) return NextResponse.json({ error: "No active Proxmox server" }, { status: 500 });

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
    
    const url = new URL(req.url);
    const start = Math.max(0, parseInt(url.searchParams.get("start") || "0", 10) || 0);
    const limit = Math.min(2000, Math.max(1, parseInt(url.searchParams.get("limit") || "1000", 10) || 1000));

    // Fetch log and status in parallel
    const [logData, statusData] = await Promise.all([
      proxmox.getTaskLog(vps.node, decodedUpid, start, limit).catch(() => []),
      proxmox.getTaskStatus(vps.node, decodedUpid).catch(() => ({}))
    ]);

    return NextResponse.json({ log: logData, status: statusData });
  } catch (error: any) {
    console.error("Task log error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
