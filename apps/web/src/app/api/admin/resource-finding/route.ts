import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";
import { requireAuth } from "@/lib/auth-middleware";
import { decryptDeterministic } from "@/lib/encryption";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const rrdParam = searchParams.get("rrd");
    const vmidParam = searchParams.get("vmid");
    const nodeParam = searchParams.get("node") || "proxmox";
    const timeframeParam = searchParams.get("timeframe") || "hour";

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) {
      return NextResponse.json({
        success: false,
        error: "No active Proxmox server configured",
        summary: {
          totalVps: 0,
          runningCount: 0,
          criticalCount: 0,
          warningCount: 0,
          highCpuCount: 0,
          highRamCount: 0,
          highNetCount: 0,
          totalBandwidth: 0,
          totalNetIn: 0,
          totalNetOut: 0,
          totalNetSpeedIn: 0,
          totalNetSpeedOut: 0,
        },
        vpsList: [],
      });
    }

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);

    // Deep inspection RRD timeframe request
    if (rrdParam === "true" && vmidParam) {
      const vmid = parseInt(vmidParam, 10);
      try {
        const rrdData = await proxmox.getRRDData(nodeParam, vmid, timeframeParam);
        return NextResponse.json({ success: true, rrd: Array.isArray(rrdData) ? rrdData : [] });
      } catch (err: any) {
        console.error(`Failed to fetch RRD for VMID ${vmid}:`, err);
        return NextResponse.json({ success: false, error: err.message || "Failed to fetch RRD metrics", rrd: [] });
      }
    }

    // 1. Fetch non-terminated VPS services from database
    const vpsServices = await prisma.vpsService.findMany({
      where: { status: { not: "TERMINATED" } },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        assignedIps: {
          select: { ipAddress: true, publicIp: true, isPrimary: true },
        },
        reservedIps: {
          select: { ipAddress: true, publicIp: true, isAttached: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 2. Fetch live cluster VMs from Proxmox for cluster overview
    let clusterVms: any[] = [];
    try {
      const res = await proxmox.getClusterResources("vm");
      if (Array.isArray(res)) {
        clusterVms = res;
      }
    } catch (clusterErr) {
      try {
        const nodes = await proxmox.getNodes();
        if (Array.isArray(nodes)) {
          for (const n of nodes) {
            try {
              const nodeVms = await proxmox.getVms(n.node);
              if (Array.isArray(nodeVms)) {
                clusterVms.push(...nodeVms.map((vm: any) => ({ ...vm, node: n.node })));
              }
            } catch {
              // ignore single node failure
            }
          }
        }
      } catch (nodeErr) {
        console.error("Failed to query nodes fallback:", nodeErr);
      }
    }

    const pveVmMap = new Map<number, any>();
    for (const vm of clusterVms) {
      if (vm.vmid) {
        pveVmMap.set(Number(vm.vmid), vm);
      }
    }

    // 3. Fetch real-time live status and instantaneous RRD throughput from Proxmox for online VMs
    const liveMetricsMap = new Map<number, {
      status: string;
      cpuPercent: number;
      memBytes: number;
      maxMemBytes: number;
      memPercent: number;
      diskBytes: number;
      maxDiskBytes: number;
      diskPercent: number;
      netSpeedIn: number; // Bytes/second (Real-time speed matching Proxmox GUI graph)
      netSpeedOut: number; // Bytes/second
      netInTotal: number; // Lifetime cumulative bytes
      netOutTotal: number; // Lifetime cumulative bytes
      uptime: number;
      rateLimit?: number | null;
    }>();

    await Promise.all(
      vpsServices
        .filter((vps) => vps.vmid && vps.status !== "TERMINATED")
        .map(async (vps) => {
          const vmid = Number(vps.vmid);
          const node = vps.node || "proxmox";
          try {
            // Live status query
            const status = await proxmox.getVmStatus(node, vmid);
            if (!status || status.status !== "running") {
              if (status) {
                liveMetricsMap.set(vmid, {
                  status: status.status || "stopped",
                  cpuPercent: 0,
                  memBytes: 0,
                  maxMemBytes: (vps.ramGb || 1) * 1024 * 1024 * 1024,
                  memPercent: 0,
                  diskBytes: 0,
                  maxDiskBytes: (vps.diskGb || 20) * 1024 * 1024 * 1024,
                  diskPercent: 0,
                  netSpeedIn: 0,
                  netSpeedOut: 0,
                  netInTotal: status.netin || 0,
                  netOutTotal: status.netout || 0,
                  uptime: status.uptime || 0,
                  rateLimit: null,
                });
              }
              return;
            }

            // Real-time instantaneous speed from latest RRD point (matches Proxmox GUI Network Traffic graph)
            let netSpeedIn = 0;
            let netSpeedOut = 0;
            let liveCpu = typeof status.cpu === "number" ? status.cpu : 0;

            try {
              const rrd = await proxmox.getRRDData(node, vmid, "hour");
              if (Array.isArray(rrd) && rrd.length > 0) {
                for (let i = rrd.length - 1; i >= Math.max(0, rrd.length - 4); i--) {
                  const pt = rrd[i];
                  if (pt && (typeof pt.netin === "number" || typeof pt.cpu === "number")) {
                    if (typeof pt.netin === "number") netSpeedIn = Math.max(0, pt.netin);
                    if (typeof pt.netout === "number") netSpeedOut = Math.max(0, pt.netout);
                    if (typeof pt.cpu === "number") liveCpu = pt.cpu;
                    break;
                  }
                }
              }
            } catch {
              // RRD fallback
            }

            const cpuPercent = Math.round(liveCpu * 10000) / 100;
            const maxMemBytes = status.maxmem || (vps.ramGb || 1) * 1024 * 1024 * 1024;
            // Cap memBytes to maxMemBytes (Linux KVM allocates 104% host memory including QEMU overhead)
            const rawMem = status.mem || 0;
            const memBytes = Math.min(rawMem, maxMemBytes);
            const memPercent = maxMemBytes > 0 ? Math.min(100, Math.round((memBytes / maxMemBytes) * 10000) / 100) : 0;

            const maxDiskBytes = status.maxdisk || (vps.diskGb || 20) * 1024 * 1024 * 1024;
            const diskBytes = status.disk || 0;
            const diskPercent = maxDiskBytes > 0 ? Math.min(100, Math.round((diskBytes / maxDiskBytes) * 10000) / 100) : 0;

            let rateLimit: number | null = null;
            try {
              const conf = await proxmox.getVmConfig(node, vmid);
              if (conf && typeof conf === "object") {
                for (const [k, v] of Object.entries(conf)) {
                  if (/^net\d+$/.test(k) && typeof v === "string") {
                    const match = v.match(/rate=([0-9.]+)/);
                    if (match && parseFloat(match[1]) > 0) {
                      rateLimit = parseFloat(match[1]);
                      break;
                    }
                  }
                }
              }
            } catch {
              // config fallback
            }

            liveMetricsMap.set(vmid, {
              status: "running",
              cpuPercent,
              memBytes,
              maxMemBytes,
              memPercent,
              diskBytes,
              maxDiskBytes,
              diskPercent,
              netSpeedIn,
              netSpeedOut,
              netInTotal: status.netin || 0,
              netOutTotal: status.netout || 0,
              uptime: status.uptime || 0,
              rateLimit,
            });
          } catch (err) {
            // will fallback to cluster/resources
          }
        })
    );

    // 4. Compile final telemetry list
    let criticalCount = 0;
    let warningCount = 0;
    let highCpuCount = 0;
    let highRamCount = 0;
    let highNetCount = 0;
    let throttledCount = 0;
    let runningCount = 0;
    let totalNetIn = 0;
    let totalNetOut = 0;
    let totalNetSpeedIn = 0;
    let totalNetSpeedOut = 0;

    const vpsList = vpsServices.map((vps) => {
      const vmid = vps.vmid ? Number(vps.vmid) : null;
      const live = vmid ? liveMetricsMap.get(vmid) : null;
      const pve = vmid ? pveVmMap.get(vmid) : null;

      // Primary IP resolution (Prioritize Public IP matching Cloud VPS)
      const assignedWithPublic = vps.assignedIps.find((ip) => ip.publicIp && ip.publicIp.trim().length > 0);
      const primaryAssigned = vps.assignedIps.find((ip) => ip.isPrimary) || vps.assignedIps[0];
      const attachedReserved = vps.reservedIps?.find((r) => r.isAttached);
      const primaryIp =
        primaryAssigned?.publicIp?.trim() ||
        assignedWithPublic?.publicIp?.trim() ||
        attachedReserved?.publicIp?.trim() ||
        primaryAssigned?.ipAddress ||
        attachedReserved?.ipAddress ||
        vps.vpcIp ||
        "-";

      // Decrypt customer info
      const rawName = vps.user?.name || "";
      const rawEmail = vps.user?.email || "";
      const customerName = decryptDeterministic(rawName) || rawName || "Customer";
      const customerEmail = decryptDeterministic(rawEmail) || rawEmail || "-";

      // Online status
      const isOnline = live ? live.status === "running" : pve ? pve.status === "running" : vps.status === "RUNNING";
      if (isOnline) runningCount++;

      // Real-time CPU
      const cpuPercent = live ? live.cpuPercent : (pve && typeof pve.cpu === "number" ? Math.round(pve.cpu * 10000) / 100 : 0);
      const maxCores = pve?.maxcpu || vps.cpuCores || 1;

      // Real-time RAM
      const maxMemBytes = live?.maxMemBytes || pve?.maxmem || (vps.ramGb || 1) * 1024 * 1024 * 1024;
      const memBytes = live?.memBytes ?? (pve ? Math.min(pve.mem || 0, maxMemBytes) : 0);
      const memPercent = live?.memPercent ?? (maxMemBytes > 0 ? Math.min(100, Math.round((memBytes / maxMemBytes) * 10000) / 100) : 0);

      // Real-time Disk
      const maxDiskBytes = live?.maxDiskBytes || pve?.maxdisk || (vps.diskGb || 20) * 1024 * 1024 * 1024;
      const diskBytes = live?.diskBytes ?? pve?.disk ?? 0;
      const diskPercent = live?.diskPercent ?? (maxDiskBytes > 0 ? Math.min(100, Math.round((diskBytes / maxDiskBytes) * 10000) / 100) : 0);

      // Real-time Network Rate (Bytes/sec matching Proxmox GUI graph)
      const netSpeedIn = live?.netSpeedIn || 0;
      const netSpeedOut = live?.netSpeedOut || 0;
      const netSpeedTotal = netSpeedIn + netSpeedOut;

      // Lifetime Cumulative Network Transfer
      const netIn = live?.netInTotal ?? (pve?.netin || 0);
      const netOut = live?.netOutTotal ?? (pve?.netout || 0);
      const totalBandwidth = netIn + netOut;

      totalNetIn += netIn;
      totalNetOut += netOut;
      totalNetSpeedIn += netSpeedIn;
      totalNetSpeedOut += netSpeedOut;

      // Rate limit check
      const rateLimit = live?.rateLimit || null;
      if (rateLimit && rateLimit > 0) throttledCount++;

      // Real Threshold Checks for Resource Abuse Detection:
      // High CPU: CPU >= 60%
      const isHighCpu = cpuPercent >= 60;
      if (isHighCpu) highCpuCount++;

      // High RAM: When actively under load and near capacity
      const isHighRam = memPercent >= 90 && cpuPercent >= 50;
      if (isHighRam) highRamCount++;

      // High Bandwidth:
      // Active network flood rate (>= 3 MB/s real-time) OR massive lifetime quota (>= 100 GB)
      const isHighNet = netSpeedTotal >= 3 * 1024 * 1024 || totalBandwidth >= 100 * 1024 * 1024 * 1024;
      if (isHighNet) highNetCount++;

      // Severity classification
      let severity: "CRITICAL" | "WARNING" | "NORMAL" | "OFFLINE" = "NORMAL";
      if (!isOnline || vps.status === "SUSPENDED" || vps.status === "STOPPED") {
        severity = "OFFLINE";
      } else if (cpuPercent >= 85 || netSpeedTotal >= 10 * 1024 * 1024) {
        // Critical: CPU pegged at >= 85% or Network flood >= 10 MB/s
        severity = "CRITICAL";
        criticalCount++;
      } else if (cpuPercent >= 60 || netSpeedTotal >= 3 * 1024 * 1024) {
        // Warning: CPU elevated >= 60% or Network elevated >= 3 MB/s
        severity = "WARNING";
        warningCount++;
      }

      return {
        id: vps.id,
        vmid: vps.vmid,
        hostname: vps.hostname,
        osTemplate: vps.osTemplate,
        node: pve?.node || vps.node || "proxmox",
        dbStatus: vps.status,
        liveStatus: isOnline ? "running" : "stopped",
        isOnline,
        primaryIp,
        cpuPercent,
        cpuCores: maxCores,
        memBytes,
        maxMemBytes,
        memPercent,
        diskBytes,
        maxDiskBytes,
        diskPercent,
        netIn,
        netOut,
        totalBandwidth,
        netSpeedIn,
        netSpeedOut,
        netSpeedTotal,
        rateLimit,
        isThrottled: Boolean(rateLimit && rateLimit > 0),
        uptime: live?.uptime || pve?.uptime || 0,
        severity,
        suspendReason: vps.suspendReason,
        createdAt: vps.createdAt.toISOString(),
        user: {
          id: vps.user?.id,
          name: customerName,
          email: customerEmail,
          image: vps.user?.image || null,
        },
      };
    });

    // Default sort: highest CPU then highest RAM
    vpsList.sort((a, b) => {
      const severityOrder = { CRITICAL: 4, WARNING: 3, NORMAL: 2, OFFLINE: 1 };
      const scoreDiff = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return b.cpuPercent - a.cpuPercent || b.memPercent - a.memPercent;
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalVps: vpsServices.length,
        runningCount,
        criticalCount,
        warningCount,
        highCpuCount,
        highRamCount,
        highNetCount,
        throttledCount,
        totalNetIn,
        totalNetOut,
        totalBandwidth: totalNetIn + totalNetOut,
        totalNetSpeedIn,
        totalNetSpeedOut,
      },
      vpsList,
    });
  } catch (error: any) {
    console.error("GET /api/admin/resource-finding error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const action = body.action;
    const vpsId = body.vpsId || body.id;
    const reason = body.reason;

    if (!action || !vpsId) {
      return NextResponse.json({ error: "Missing action or vpsId" }, { status: 400 });
    }

    const vps = await prisma.vpsService.findUnique({
      where: { id: parseInt(vpsId.toString(), 10) },
      include: { user: true },
    });

    if (!vps) {
      return NextResponse.json({ error: "VPS instance not found in database" }, { status: 404 });
    }

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) {
      return NextResponse.json({ error: "No active Proxmox server configured" }, { status: 500 });
    }

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
    const node = vps.node || "proxmox";
    const vmid = vps.vmid;

    if (!vmid && action !== "suspend" && action !== "unsuspend") {
      return NextResponse.json({ error: "VPS does not have an active Proxmox VMID" }, { status: 400 });
    }

    let resultMsg = "";

    switch (action) {
      case "start":
        await proxmox.startVm(node, vmid!);
        await prisma.vpsService.update({
          where: { id: vps.id },
          data: { status: "RUNNING" },
        });
        resultMsg = `Start command sent to VPS #${vmid}`;
        break;

      case "reboot":
        await proxmox.rebootVm(node, vmid!);
        await prisma.vpsService.update({
          where: { id: vps.id },
          data: { status: "RUNNING" },
        });
        resultMsg = `Reboot command sent to VPS #${vmid}`;
        break;

      case "shutdown":
        await proxmox.shutdownVm(node, vmid!);
        await prisma.vpsService.update({
          where: { id: vps.id },
          data: { status: "STOPPED" },
        });
        resultMsg = `Graceful Shutdown sent to VPS #${vmid}`;
        break;

      case "stop":
        await proxmox.stopVm(node, vmid!);
        await prisma.vpsService.update({
          where: { id: vps.id },
          data: { status: "STOPPED" },
        });
        resultMsg = `Force Stop command sent to VPS #${vmid}`;
        break;

      case "suspend":
        if (vmid) {
          try {
            await proxmox.stopVm(node, vmid);
          } catch (stopErr) {
            console.warn(`Could not force stop VM #${vmid} on suspend:`, stopErr);
          }
        }
        await prisma.vpsService.update({
          where: { id: vps.id },
          data: {
            status: "SUSPENDED",
            suspendReason: reason || "Suspended by administrator due to excessive resource abuse",
          },
        });
        resultMsg = `VPS #${vmid || vps.id} has been suspended and locked`;
        break;

      case "unsuspend":
        await prisma.vpsService.update({
          where: { id: vps.id },
          data: {
            status: "RUNNING",
            suspendReason: null,
          },
        });
        if (vmid) {
          try {
            await proxmox.startVm(node, vmid);
          } catch (startErr) {
            console.warn(`Could not auto-start VM #${vmid} on unsuspend:`, startErr);
          }
        }
        resultMsg = `VPS #${vmid || vps.id} has been unsuspended and restored`;
        break;

      case "throttle": {
        const rateVal = parseFloat(body.rate);
        if (isNaN(rateVal) || rateVal <= 0) {
          return NextResponse.json({ error: "Invalid rate value. Rate must be greater than 0 MB/s." }, { status: 400 });
        }

        const currentConf = await proxmox.getVmConfig(node, vmid!);
        if (!currentConf) {
          return NextResponse.json({ error: `Could not retrieve configuration for VPS #${vmid}` }, { status: 500 });
        }

        const updates: Record<string, string> = {};
        let netCount = 0;

        for (const [key, val] of Object.entries(currentConf)) {
          if (/^net\d+$/.test(key) && typeof val === "string") {
            const baseNet = val.replace(/,rate=[0-9.]+/g, "");
            updates[key] = `${baseNet},rate=${rateVal}`;
            netCount++;
          }
        }

        if (netCount === 0) {
          return NextResponse.json({ error: `VPS #${vmid} does not have any network interfaces configured` }, { status: 400 });
        }

        await proxmox.configVm(node, vmid!, updates);
        const approxMbps = Math.round(rateVal * 8);
        resultMsg = `Bandwidth throttled to ${rateVal} MB/s (~${approxMbps} Mbps) on VPS #${vmid} (${vps.hostname})`;
        break;
      }

      case "unthrottle": {
        const currentConf = await proxmox.getVmConfig(node, vmid!);
        if (!currentConf) {
          return NextResponse.json({ error: `Could not retrieve configuration for VPS #${vmid}` }, { status: 500 });
        }

        const updates: Record<string, string> = {};
        for (const [key, val] of Object.entries(currentConf)) {
          if (/^net\d+$/.test(key) && typeof val === "string") {
            const cleanNet = val.replace(/,rate=[0-9.]+/g, "");
            if (cleanNet !== val) {
              updates[key] = cleanNet;
            }
          }
        }

        if (Object.keys(updates).length > 0) {
          await proxmox.configVm(node, vmid!, updates);
          resultMsg = `Bandwidth limit removed for VPS #${vmid}. Restored to full speed.`;
        } else {
          resultMsg = `VPS #${vmid} has no active rate limit.`;
        }
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: resultMsg });
  } catch (error: any) {
    console.error("POST /api/admin/resource-finding error:", error);
    return NextResponse.json({ error: error.message || "Failed to execute VPS action" }, { status: 500 });
  }
}
