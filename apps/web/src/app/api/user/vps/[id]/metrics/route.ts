import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { ProxmoxClient } from "@/lib/proxmox";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    const user = authResult.user!;

    const { id: vpsId } = await params;
    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get("timeframe") || "hour";

    const vps = await prisma.vpsService.findFirst({
      where: { id: parseInt(vpsId, 10), userId: user.id }
    });

    if (!vps) {
      return NextResponse.json({ error: "VPS not found" }, { status: 404 });
    }

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) {
      return NextResponse.json({ error: "No active Proxmox server found" }, { status: 500 });
    }

    if (vps.status !== "RUNNING") {
       return NextResponse.json({ error: "Metrics are only available when VPS is running" }, { status: 400 });
    }

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
    
    // Valid timeframes: hour, day, week, month, year
    const validTimeframes = ["hour", "day", "week", "month", "year"];
    const tf = validTimeframes.includes(timeframe) ? timeframe : "hour";

    const rrdData = await proxmox.getRRDData(vps.node, vps.vmid!, tf);
    
    // RRD Data returns an array of data points: { time, cpu, mem, maxmem, netin, netout, diskread, diskwrite }
    return NextResponse.json({ data: rrdData });
  } catch (error: any) {
    console.error("Error fetching metrics:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
