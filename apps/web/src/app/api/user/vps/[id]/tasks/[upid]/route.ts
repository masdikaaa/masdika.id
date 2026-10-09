import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string, upid: string }> }) {
  try {
    const { id, upid } = await params;
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const vps = await prisma.vpsService.findUnique({
      where: { id: parseInt(id), userId: auth.userId }
    });
    if (!vps) return NextResponse.json({ error: "VPS not found" }, { status: 404 });

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) return NextResponse.json({ error: "No active Proxmox server" }, { status: 500 });

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
    
    const url = new URL(req.url);
    const start = parseInt(url.searchParams.get("start") || "0");
    const limit = parseInt(url.searchParams.get("limit") || "1000");

    const decodedUpid = decodeURIComponent(upid);

    // Fetch log and status in parallel
    const [logData, statusData] = await Promise.all([
      proxmox.getTaskLog(vps.node, decodedUpid, start, limit).catch(e => []),
      proxmox.getTaskStatus(vps.node, decodedUpid).catch(e => ({}))
    ]);

    return NextResponse.json({ log: logData, status: statusData });
  } catch (error: any) {
    console.error("Task log error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
