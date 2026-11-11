import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { ProxmoxClient } from "@/lib/proxmox";
import { decryptDeterministic } from "@/lib/encryption";

// In-memory cache to compute real-time rate (Bytes/sec) from Proxmox cumulative byte counters
interface LiveSample {
  timeMs: number;
  netin: number;
  netout: number;
  diskread: number;
  diskwrite: number;
}
const liveSamplesMap = new Map<number, LiveSample>();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    const user = authResult.user!;

    const { id: vpsId } = await params;
    const { searchParams } = new URL(req.url);
    const timeframe = searchParams.get("timeframe") || "hour";

    const vps = await prisma.vpsService.findFirst({
      where: user.role === "ADMIN" ? { id: parseInt(vpsId, 10) } : { id: parseInt(vpsId, 10), userId: user.id }
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

    const secret = decryptDeterministic(server.tokenSecret) || server.tokenSecret;
    const proxmox = new ProxmoxClient(server.host, server.tokenId, secret);
    
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
      // Proxmox RRD timestamp is in seconds. Convert to ms:
      const timeMs = pt.time < 1e11 ? pt.time * 1000 : pt.time;
      
      // Proxmox RRD cpu is a fraction 0.0 .. 1.0 (or >1 for multi-core).
      // Convert to clean percentage 0.00% .. 100.00%:
      const rawCpu = pt.cpu !== null && pt.cpu !== undefined ? Number(pt.cpu) : 0;
      const maxCpu = pt.maxcpu && pt.maxcpu > 0 ? Number(pt.maxcpu) : (vps.cpuCores || 1);
      const normalizedCpu = rawCpu > 1 ? rawCpu / maxCpu : rawCpu;
      const cpu = parseFloat(Math.min(100, Math.max(0, normalizedCpu * 100)).toFixed(2));
      
      // Memory percentage (0..100)
      const memBytes = pt.mem !== null && pt.mem !== undefined ? Number(pt.mem) : 0;
      const maxMemBytes = pt.maxmem && pt.maxmem > 0 ? Number(pt.maxmem) : 1;
      const mem = parseFloat(Math.min(100, Math.max(0, (memBytes / maxMemBytes) * 100)).toFixed(2));
      
      // In Proxmox RRD, netin/netout and diskread/diskwrite are ALREADY rates in Bytes/second:
      const netin = pt.netin !== null && pt.netin !== undefined ? Math.max(0, Number(pt.netin)) : 0;
      const netout = pt.netout !== null && pt.netout !== undefined ? Math.max(0, Number(pt.netout)) : 0;
      const diskread = pt.diskread !== null && pt.diskread !== undefined ? Math.max(0, Number(pt.diskread)) : 0;
      const diskwrite = pt.diskwrite !== null && pt.diskwrite !== undefined ? Math.max(0, Number(pt.diskwrite)) : 0;

      formattedPoints.push({
        time: timeMs,
        cpu,
        mem,
        memory: mem,
        memBytes,
        maxmem: maxMemBytes,
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
      const rawCpu = liveStatus.cpu !== null && liveStatus.cpu !== undefined ? Number(liveStatus.cpu) : 0;
      const cpus = liveStatus.cpus && liveStatus.cpus > 0 ? Number(liveStatus.cpus) : (vps.cpuCores || 1);
      const normalizedCpu = rawCpu > 1 ? rawCpu / cpus : rawCpu;
      const currentCpu = parseFloat(Math.min(100, Math.max(0, normalizedCpu * 100)).toFixed(2));

      const memBytes = liveStatus.mem !== null && liveStatus.mem !== undefined ? Number(liveStatus.mem) : 0;
      const maxMemBytes = liveStatus.maxmem && liveStatus.maxmem > 0 ? Number(liveStatus.maxmem) : 1;
      const currentMem = parseFloat(Math.min(100, Math.max(0, (memBytes / maxMemBytes) * 100)).toFixed(2));

      // Calculate real-time rate (Bytes/sec) from delta of cumulative counters
      const lastRrd = formattedPoints.length > 0 ? formattedPoints[formattedPoints.length - 1] : null;
      let currentNetIn = lastRrd ? lastRrd.netin : 0;
      let currentNetOut = lastRrd ? lastRrd.netout : 0;
      let currentDiskRead = lastRrd ? lastRrd.diskread : 0;
      let currentDiskWrite = lastRrd ? lastRrd.diskwrite : 0;

      const prevSample = liveSamplesMap.get(vps.id);
      const cumNetIn = Number(liveStatus.netin || 0);
      const cumNetOut = Number(liveStatus.netout || 0);
      const cumDiskRead = Number(liveStatus.diskread || 0);
      const cumDiskWrite = Number(liveStatus.diskwrite || 0);

      if (prevSample && prevSample.timeMs < nowMs) {
        const deltaSec = (nowMs - prevSample.timeMs) / 1000;
        // Compute delta rate if sampled within 1s to 45s window
        if (deltaSec >= 1 && deltaSec <= 45) {
          if (cumNetIn >= prevSample.netin) {
            currentNetIn = parseFloat(((cumNetIn - prevSample.netin) / deltaSec).toFixed(1));
          }
          if (cumNetOut >= prevSample.netout) {
            currentNetOut = parseFloat(((cumNetOut - prevSample.netout) / deltaSec).toFixed(1));
          }
          if (cumDiskRead >= prevSample.diskread) {
            currentDiskRead = parseFloat(((cumDiskRead - prevSample.diskread) / deltaSec).toFixed(1));
          }
          if (cumDiskWrite >= prevSample.diskwrite) {
            currentDiskWrite = parseFloat(((cumDiskWrite - prevSample.diskwrite) / deltaSec).toFixed(1));
          }
        }
      }

      liveSamplesMap.set(vps.id, {
        timeMs: nowMs,
        netin: cumNetIn,
        netout: cumNetOut,
        diskread: cumDiskRead,
        diskwrite: cumDiskWrite
      });

      const livePoint = {
        time: nowMs,
        cpu: currentCpu,
        mem: currentMem,
        memory: currentMem,
        memBytes,
        maxmem: maxMemBytes,
        netin: currentNetIn,
        netout: currentNetOut,
        netIn: currentNetIn,
        netOut: currentNetOut,
        diskread: currentDiskRead,
        diskwrite: currentDiskWrite,
        diskRead: currentDiskRead,
        diskWrite: currentDiskWrite,
      };

      if (formattedPoints.length === 0 || nowMs - formattedPoints[formattedPoints.length - 1].time > 15000) {
        formattedPoints.push(livePoint);
      } else {
        formattedPoints[formattedPoints.length - 1] = livePoint;
      }
    }

    // 5. If new VM with fewer than 3 historical points, backfill with baseline live data so graph displays immediately
    if (formattedPoints.length < 3 && liveStatus && liveStatus.status === "running") {
      const now = Date.now();
      const rawCpu = liveStatus.cpu !== null && liveStatus.cpu !== undefined ? Number(liveStatus.cpu) : 0;
      const cpus = liveStatus.cpus && liveStatus.cpus > 0 ? Number(liveStatus.cpus) : (vps.cpuCores || 1);
      const normalizedCpu = rawCpu > 1 ? rawCpu / cpus : rawCpu;
      const currentCpu = parseFloat(Math.min(100, Math.max(0, normalizedCpu * 100)).toFixed(2));
      const memBytes = liveStatus.mem !== null && liveStatus.mem !== undefined ? Number(liveStatus.mem) : 0;
      const maxMemBytes = liveStatus.maxmem && liveStatus.maxmem > 0 ? Number(liveStatus.maxmem) : 1;
      const currentMem = parseFloat(Math.min(100, Math.max(0, (memBytes / maxMemBytes) * 100)).toFixed(2));
      
      const synthetic = [];
      for (let i = 12; i >= 1; i--) {
        synthetic.push({
          time: now - i * 60 * 1000,
          cpu: currentCpu,
          mem: currentMem,
          memory: currentMem,
          memBytes,
          maxmem: maxMemBytes,
          netin: 0,
          netout: 0,
          netIn: 0,
          netOut: 0,
          diskread: 0,
          diskwrite: 0,
          diskRead: 0,
          diskWrite: 0,
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
