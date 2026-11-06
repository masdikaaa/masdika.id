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

    if (!vps.vmid) {
      return NextResponse.json({ error: "VPS is not yet provisioned" }, { status: 400 });
    }

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) {
      return NextResponse.json({ error: "No active Proxmox server found" }, { status: 500 });
    }

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
    
    // Valid timeframes: hour, day, week, month, year
    const validTimeframes = ["hour", "day", "week", "month", "year"];
    const tf = validTimeframes.includes(timeframe) ? timeframe : "hour";

    // 1. Fetch live real-time telemetry from Proxmox VM status
    let liveStatus: any = null;
    try {
      liveStatus = await proxmox.getVmStatus(vps.node, vps.vmid);
    } catch (e: any) {
      console.warn(`[Metrics] Could not get live status for VM ${vps.vmid}:`, e?.message);
    }

    // 2. Fetch historical RRD metrics from Proxmox
    let rawPoints: any[] = [];
    try {
      const res = await proxmox.getRRDData(vps.node, vps.vmid, tf);
      rawPoints = Array.isArray(res) ? res : (res?.data || []);
    } catch (e: any) {
      console.warn(`[Metrics] Could not get RRD data for VM ${vps.vmid}:`, e?.message);
    }

    // 3. Process, clean, and convert RRD units
    const formattedPoints: any[] = [];
    for (const pt of rawPoints) {
      if (!pt || typeof pt.time !== "number") continue;
      // Proxmox RRD timestamp is in seconds (e.g. 1730900000). Convert to ms:
      const timeMs = pt.time < 1e11 ? pt.time * 1000 : pt.time;
      
      // Proxmox RRD cpu is a fraction 0.0 .. 1.0. Convert to percentage 0..100:
      const cpu = pt.cpu !== null && pt.cpu !== undefined ? parseFloat((pt.cpu * 100).toFixed(2)) : 0;
      
      // Memory percentage
      const mem = pt.maxmem && pt.mem ? parseFloat(((pt.mem / pt.maxmem) * 100).toFixed(2)) : 0;
      
      const netin = pt.netin !== null && pt.netin !== undefined ? Math.max(0, pt.netin) : 0;
      const netout = pt.netout !== null && pt.netout !== undefined ? Math.max(0, pt.netout) : 0;
      const diskread = pt.diskread !== null && pt.diskread !== undefined ? Math.max(0, pt.diskread) : 0;
      const diskwrite = pt.diskwrite !== null && pt.diskwrite !== undefined ? Math.max(0, pt.diskwrite) : 0;

      formattedPoints.push({
        time: timeMs,
        cpu,
        mem,
        memory: mem,
        maxmem: pt.maxmem || 0,
        netin,
        netout,
        netIn: netin,
        netOut: netout,
        diskread,
        diskwrite,
        diskRead: diskread,
        diskWrite: diskwrite,
      });
    }

    // 4. Inject live realtime telemetry point from Proxmox
    if (liveStatus && liveStatus.status === "running") {
      const nowMs = Date.now();
      const currentCpu = liveStatus.cpu !== null && liveStatus.cpu !== undefined ? parseFloat((liveStatus.cpu * 100).toFixed(2)) : 0;
      const currentMem = liveStatus.maxmem && liveStatus.mem ? parseFloat(((liveStatus.mem / liveStatus.maxmem) * 100).toFixed(2)) : 0;
      const currentNetIn = Math.max(0, liveStatus.netin || 0);
      const currentNetOut = Math.max(0, liveStatus.netout || 0);
      const currentDiskRead = Math.max(0, liveStatus.diskread || 0);
      const currentDiskWrite = Math.max(0, liveStatus.diskwrite || 0);

      const livePoint = {
        time: nowMs,
        cpu: currentCpu,
        mem: currentMem,
        memory: currentMem,
        maxmem: liveStatus.maxmem || 0,
        netin: currentNetIn,
        netout: currentNetOut,
        netIn: currentNetIn,
        netOut: currentNetOut,
        diskread: currentDiskRead,
        diskwrite: currentDiskWrite,
        diskRead: currentDiskRead,
        diskWrite: currentDiskWrite,
      };

      if (formattedPoints.length === 0 || nowMs - formattedPoints[formattedPoints.length - 1].time > 5000) {
        formattedPoints.push(livePoint);
      } else {
        formattedPoints[formattedPoints.length - 1] = livePoint;
      }
    }

    // 5. If new VM with fewer than 3 historical points, backfill with baseline live data so graph displays immediately
    if (formattedPoints.length < 3 && liveStatus && liveStatus.status === "running") {
      const now = Date.now();
      const currentCpu = liveStatus.cpu !== null && liveStatus.cpu !== undefined ? parseFloat((liveStatus.cpu * 100).toFixed(2)) : 0;
      const currentMem = liveStatus.maxmem && liveStatus.mem ? parseFloat(((liveStatus.mem / liveStatus.maxmem) * 100).toFixed(2)) : 0;
      
      const synthetic = [];
      for (let i = 12; i >= 1; i--) {
        synthetic.push({
          time: now - i * 60 * 1000,
          cpu: currentCpu,
          mem: currentMem,
          memory: currentMem,
          maxmem: liveStatus.maxmem || 0,
          netin: Math.max(0, liveStatus.netin || 0),
          netout: Math.max(0, liveStatus.netout || 0),
          netIn: Math.max(0, liveStatus.netin || 0),
          netOut: Math.max(0, liveStatus.netout || 0),
          diskread: Math.max(0, liveStatus.diskread || 0),
          diskwrite: Math.max(0, liveStatus.diskwrite || 0),
          diskRead: Math.max(0, liveStatus.diskread || 0),
          diskWrite: Math.max(0, liveStatus.diskwrite || 0),
        });
      }
      formattedPoints.unshift(...synthetic);
    }

    return NextResponse.json({ data: formattedPoints, success: true });
  } catch (error: any) {
    console.error("Error fetching metrics:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
