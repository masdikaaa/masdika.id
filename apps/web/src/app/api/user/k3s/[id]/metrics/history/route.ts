import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { ProxmoxClient } from "@/lib/proxmox";
import { decryptDeterministic } from "@/lib/encryption";

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

    const runningNodes = cluster.nodes.filter(n => n.status === "RUNNING" && n.vmid && n.node);
    const vps = runningNodes.find(n => n.kubernetesRole === "MASTER") || runningNodes[0] || cluster.nodes[0];
    if (!vps || !vps.vmid || !vps.node) {
      return NextResponse.json({ cpu: [], memory: [] });
    }

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) {
      return NextResponse.json({ error: "No active Proxmox server configured" }, { status: 500 });
    }

    const secret = decryptDeterministic(server.tokenSecret) || server.tokenSecret;
    const proxmox = new ProxmoxClient(server.host, server.tokenId, secret);
    
    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get("timeframe") || "hour";
    
    let rrdData: any[] = [];
    try {
      rrdData = await proxmox.getRRDData(vps.node, vps.vmid, timeframe);
    } catch (err: any) {
      console.warn(`[K3s History Metrics] Failed to get RRD data for VM ${vps.vmid}:`, err.message);
    }
    
    const historyCpu: { time: string; usage: number }[] = [];
    const historyMem: { time: string; usage: number }[] = [];

    if (Array.isArray(rrdData)) {
      rrdData.forEach(point => {
        if (!point.time) return;
        
        const date = new Date(point.time * 1000);
        const hours = date.getHours().toString().padStart(2, '0');
        const mins = date.getMinutes().toString().padStart(2, '0');
        const timeStr = `${hours}:${mins}`;

        const cpuUsage = point.cpu !== undefined && point.cpu !== null ? parseFloat((point.cpu * 100).toFixed(2)) : 0;
        historyCpu.push({ time: timeStr, usage: cpuUsage });

        let memUsage = 0;
        if (point.mem && point.maxmem && point.maxmem > 0) {
          memUsage = parseFloat(((point.mem / point.maxmem) * 100).toFixed(2));
        }
        historyMem.push({ time: timeStr, usage: memUsage });
      });
    }

    // Append latest real-time point from current VM status
    try {
      const currentStatus = await proxmox.getVmStatus(vps.node, vps.vmid);
      if (currentStatus && currentStatus.status === "running") {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const mins = now.getMinutes().toString().padStart(2, '0');
        const nowStr = `${hours}:${mins}`;
        const curCpu = currentStatus.cpu !== undefined ? parseFloat((currentStatus.cpu * 100).toFixed(2)) : 0;
        let curMem = 0;
        if (currentStatus.mem && currentStatus.maxmem && currentStatus.maxmem > 0) {
          curMem = parseFloat(((currentStatus.mem / currentStatus.maxmem) * 100).toFixed(2));
        }
        historyCpu.push({ time: nowStr, usage: curCpu });
        historyMem.push({ time: nowStr, usage: curMem });
      }
    } catch (e) {
      // Ignore current status error
    }

    // Fallback baseline if no points exist
    if (historyCpu.length === 0) {
      const now = Date.now();
      for (let i = 10; i >= 0; i--) {
        const d = new Date(now - i * 60 * 1000);
        const tStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        historyCpu.push({ time: tStr, usage: 0 });
        historyMem.push({ time: tStr, usage: 0 });
      }
    }

    return NextResponse.json({
      cpu: historyCpu,
      memory: historyMem
    });

  } catch (error: any) {
    console.error("Fetch K3s history metrics error:", error);
    return NextResponse.json({ error: "Failed to fetch history metrics: " + error.message }, { status: 500 });
  }
}
