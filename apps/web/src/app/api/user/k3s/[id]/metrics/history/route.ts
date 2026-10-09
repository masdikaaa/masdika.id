import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { ProxmoxClient } from "@/lib/proxmox";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const resolvedParams = await params;
    const clusterId = parseInt(resolvedParams.id);
    if (isNaN(clusterId)) return NextResponse.json({ error: "Invalid cluster ID" }, { status: 400 });

    const cluster = await prisma.kubernetesCluster.findFirst({
      where: { 
        id: clusterId,
        userId: auth.userId 
      },
      include: {
        nodes: true
      }
    });

    if (!cluster || !cluster.nodes || cluster.nodes.length === 0) {
      return NextResponse.json({ error: "Cluster or node not found" }, { status: 404 });
    }

    const vps = cluster.nodes[0];
    if (!vps.vmid || !vps.node) {
        return NextResponse.json({ error: "VM ID or node not configured" }, { status: 400 });
    }

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) {
        return NextResponse.json({ error: "No active Proxmox server configured" }, { status: 500 });
    }

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
    
    const rrdData: any[] = await proxmox.getRRDData(vps.node, vps.vmid, "hour");
    
    const historyCpu: {time: string, usage: number}[] = [];
    const historyMem: {time: string, usage: number}[] = [];

    rrdData.forEach(point => {
        if (!point.time) return;
        
        const date = new Date(point.time * 1000);
        const hours = date.getHours().toString().padStart(2, '0');
        const mins = date.getMinutes().toString().padStart(2, '0');
        const timeStr = `${hours}:${mins}`;

        const cpuUsage = point.cpu ? parseFloat((point.cpu * 100).toFixed(2)) : 0;
        historyCpu.push({ time: timeStr, usage: cpuUsage });

        let memUsage = 0;
        if (point.mem && point.maxmem && point.maxmem > 0) {
            memUsage = parseFloat(((point.mem / point.maxmem) * 100).toFixed(2));
        }
        historyMem.push({ time: timeStr, usage: memUsage });
    });

    // Proxmox RRD can return many points, filtering to make the chart smoother (e.g. 1 point every hour or 30 mins) 
    // Actually timeframe=day returns ~70 data points (every 30 mins), which is perfect for Recharts.

    return NextResponse.json({
        cpu: historyCpu,
        memory: historyMem
    });

  } catch (error: any) {
    console.error("Fetch K3s history metrics error:", error);
    return NextResponse.json({ error: "Failed to fetch history metrics: " + error.message }, { status: 500 });
  }
}
