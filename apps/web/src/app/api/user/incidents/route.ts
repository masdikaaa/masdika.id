import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";
import { requireAuth } from "@/lib/auth-middleware";
import { decryptDeterministic } from "@/lib/encryption";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ["ADMIN", "USER"] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const userId = Number(auth.user!.id);
    const { searchParams } = new URL(req.url);
    const rrdParam = searchParams.get("rrd");
    const vmidParam = searchParams.get("vmid");
    const timeframeParam = searchParams.get("timeframe") || "hour";

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) {
      return NextResponse.json({
        success: false,
        error: "Active virtualization hypervisor server not configured",
        summary: {
          totalVps: 0,
          runningCount: 0,
          throttledCount: 0,
          suspendedCount: 0,
          netDisabledCount: 0,
          incidentCount: 0,
          healthyCount: 0,
        },
        incidents: [],
      });
    }

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);

    // Deep inspection RRD request - Anti-IDOR: strictly check that the VMID belongs to this user!
    if (rrdParam === "true" && vmidParam) {
      const vmid = parseInt(vmidParam, 10);
      if (isNaN(vmid)) {
        return NextResponse.json({ error: "Invalid VMID parameter" }, { status: 400 });
      }

      const ownedVps = await prisma.vpsService.findFirst({
        where: {
          vmid: vmid,
          userId: userId,
          status: { not: "TERMINATED" },
        },
        select: { id: true, vmid: true, node: true, hostname: true },
      });

      if (!ownedVps) {
        return NextResponse.json(
          { error: "Access denied. You do not own this instance or it has been terminated." },
          { status: 403 }
        );
      }

      try {
        const node = ownedVps.node || "proxmox";
        const rrdData = await proxmox.getRRDData(node, vmid, timeframeParam);
        return NextResponse.json({
          success: true,
          vmid: ownedVps.vmid,
          hostname: ownedVps.hostname,
          rrd: Array.isArray(rrdData) ? rrdData : [],
        });
      } catch (err: any) {
        console.error(`Failed to fetch RRD for customer VMID ${vmid}:`, err);
        return NextResponse.json({
          success: false,
          error: err.message || "Failed to fetch telemetry metrics",
          rrd: [],
        });
      }
    }

    // 1. Fetch user's non-terminated VPS services
    const vpsServices = await prisma.vpsService.findMany({
      where: {
        userId: userId,
        status: { not: "TERMINATED" },
      },
      select: {
        id: true,
        userId: true,
        vmid: true,
        hostname: true,
        status: true,
        suspendReason: true,
        node: true,
        cpuCores: true,
        ramGb: true,
        diskGb: true,
        osTemplate: true,
        createdAt: true,
        updatedAt: true,
        vpcIp: true,
        assignedIps: {
          select: { ipAddress: true, publicIp: true, isPrimary: true },
        },
        reservedIps: {
          select: { ipAddress: true, publicIp: true, isAttached: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (vpsServices.length === 0) {
      return NextResponse.json({
        success: true,
        customer: {
          id: userId,
          name: auth.user?.name || "Customer",
          email: auth.user?.email || "-",
        },
        summary: {
          totalVps: 0,
          runningCount: 0,
          throttledCount: 0,
          suspendedCount: 0,
          netDisabledCount: 0,
          incidentCount: 0,
          healthyCount: 0,
        },
        policy: {
          unmeteredBandwidth: true,
          policyNotice:
            "Bandwidth on Masdika Cloud VPS is 100% free & unmetered without overage fees. Rate-limiting is strictly used as an automatic or manual safeguard against malicious floods/attacks to protect hypervisor node stability.",
        },
        incidents: [],
      });
    }

    // 2. Fetch live metrics & configuration from Proxmox for each VM
    const liveMetricsMap = new Map<
      number,
      {
        status: string;
        cpuPercent: number;
        memBytes: number;
        maxMemBytes: number;
        memPercent: number;
        diskBytes: number;
        maxDiskBytes: number;
        diskPercent: number;
        netSpeedIn: number;
        netSpeedOut: number;
        netInTotal: number;
        netOutTotal: number;
        uptime: number;
        rateLimit: number | null; // in MB/s
        isNetDisabled?: boolean;
      }
    >();

    await Promise.all(
      vpsServices
        .filter((vps) => vps.vmid)
        .map(async (vps) => {
          const vmid = Number(vps.vmid);
          const node = vps.node || "proxmox";

          try {
            const status = await proxmox.getVmStatus(node, vmid);
            if (!status || status.status !== "running") {
              let isNetDisabled = false;
              try {
                const conf = await proxmox.getVmConfig(node, vmid);
                if (conf && typeof conf === "object") {
                  for (const [k, v] of Object.entries(conf)) {
                    if (/^net\d+$/.test(k) && typeof v === "string" && v.includes("link_down=1")) {
                      isNetDisabled = true;
                      break;
                    }
                  }
                }
              } catch {}

              liveMetricsMap.set(vmid, {
                status: status?.status || "stopped",
                cpuPercent: 0,
                memBytes: 0,
                maxMemBytes: (vps.ramGb || 1) * 1024 * 1024 * 1024,
                memPercent: 0,
                diskBytes: 0,
                maxDiskBytes: (vps.diskGb || 20) * 1024 * 1024 * 1024,
                diskPercent: 0,
                netSpeedIn: 0,
                netSpeedOut: 0,
                netInTotal: status?.netin || 0,
                netOutTotal: status?.netout || 0,
                uptime: status?.uptime || 0,
                rateLimit: null,
                isNetDisabled,
              });
              return;
            }

            // Real-time speed from recent RRD points
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
            const rawMem = status.mem || 0;
            const memBytes = Math.min(rawMem, maxMemBytes);
            const memPercent =
              maxMemBytes > 0 ? Math.min(100, Math.round((memBytes / maxMemBytes) * 10000) / 100) : 0;

            const maxDiskBytes = status.maxdisk || (vps.diskGb || 20) * 1024 * 1024 * 1024;
            const diskBytes = status.disk || 0;
            const diskPercent =
              maxDiskBytes > 0 ? Math.min(100, Math.round((diskBytes / maxDiskBytes) * 10000) / 100) : 0;

            // Check if network adapter has rate limit applied or link_down=1 (disabled internet)
            let rateLimit: number | null = null;
            let isNetDisabled = false;
            try {
              const conf = await proxmox.getVmConfig(node, vmid);
              if (conf && typeof conf === "object") {
                for (const [k, v] of Object.entries(conf)) {
                  if (/^net\d+$/.test(k) && typeof v === "string") {
                    if (v.includes("link_down=1")) {
                      isNetDisabled = true;
                    }
                    const match = v.match(/rate=([0-9.]+)/);
                    if (match && parseFloat(match[1]) > 0) {
                      rateLimit = parseFloat(match[1]);
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
              isNetDisabled,
            });
          } catch (err) {
            console.error(`Telemetry error for VMID ${vmid}:`, err);
          }
        })
    );

    // 3. Compile customer incident items
    let runningCount = 0;
    let throttledCount = 0;
    let suspendedCount = 0;
    let netDisabledCount = 0;
    let incidentCount = 0;
    let healthyCount = 0;

    const incidents = vpsServices.map((vps) => {
      const vmid = vps.vmid ? Number(vps.vmid) : null;
      const live = vmid ? liveMetricsMap.get(vmid) : null;

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

      const isRunning = live ? live.status === "running" : vps.status === "RUNNING";
      if (isRunning) runningCount++;

      const isSuspended = vps.status === "SUSPENDED";
      if (isSuspended) suspendedCount++;

      const isNetDisabled = Boolean(live?.isNetDisabled);
      if (isNetDisabled) netDisabledCount++;

      const rateLimit = live?.rateLimit || null;
      const isThrottled = typeof rateLimit === "number" && rateLimit > 0 && !isNetDisabled;
      if (isThrottled) throttledCount++;

      const cpuPercent = live?.cpuPercent ?? 0;
      const memPercent = live?.memPercent ?? 0;
      const memBytes = live?.memBytes ?? 0;
      const maxMemBytes = live?.maxMemBytes ?? (vps.ramGb || 1) * 1024 * 1024 * 1024;

      const diskPercent = live?.diskPercent ?? 0;
      const diskBytes = live?.diskBytes ?? 0;
      const maxDiskBytes = live?.maxDiskBytes ?? (vps.diskGb || 20) * 1024 * 1024 * 1024;

      const netSpeedIn = live?.netSpeedIn ?? 0;
      const netSpeedOut = live?.netSpeedOut ?? 0;
      const netSpeedTotal = netSpeedIn + netSpeedOut;

      const netInTotal = live?.netInTotal ?? 0;
      const netOutTotal = live?.netOutTotal ?? 0;
      const totalBandwidth = netInTotal + netOutTotal;

      const uptime = live?.uptime ?? 0;

      // Evaluation of resource status
      const isHighCpu = cpuPercent >= 75;
      const isHighRam = memPercent >= 90;
      const isHighNet = netSpeedTotal >= 5 * 1024 * 1024;

      let severity: "CRITICAL" | "WARNING" | "NORMAL" | "OFFLINE" = "NORMAL";
      const incidentReasons: string[] = [];

      if (isSuspended) {
        severity = "CRITICAL";
        incidentReasons.push(
          vps.suspendReason
            ? `Instance Suspended: ${vps.suspendReason}`
            : "Instance Suspended: Node protection or security audit"
        );
      } else if (isNetDisabled) {
        severity = "CRITICAL";
        incidentReasons.push(
          "Internet Access Disabled: Virtual network link offline (quarantined by administrator security protocol)."
        );
      } else if (!isRunning) {
        severity = "OFFLINE";
      } else {
        const isCriticalCpu = cpuPercent >= 85;
        const isWarningCpu = cpuPercent >= 75 && !isCriticalCpu;
        // In Linux KVM, RAM includes kernel page cache; only flag saturation if combined with heavy CPU load
        const isCriticalRam = memPercent >= 95 && cpuPercent >= 60;
        const isCriticalNet = netSpeedTotal >= 10 * 1024 * 1024;
        const isWarningNet = netSpeedTotal >= 5 * 1024 * 1024 && !isCriticalNet;

        if (isThrottled) {
          const rateMbps = Math.round(rateLimit * 8 * 10) / 10;
          incidentReasons.push(
            `Bandwidth Throttled: Speed capped at ${rateLimit} MB/s (${rateMbps} Mbps) to shield node network.`
          );
        }

        if (isCriticalCpu) {
          incidentReasons.push(`Critical CPU Load: VM processor sustained at ${cpuPercent}% utilization.`);
        } else if (isWarningCpu) {
          incidentReasons.push(`Elevated CPU Load: Processor running at ${cpuPercent}%.`);
        }

        if (isCriticalRam) {
          incidentReasons.push(`Critical RAM Saturation: Memory usage at ${memPercent}%.`);
        }

        if (isCriticalNet) {
          incidentReasons.push(
            `Traffic Surge: Real-time throughput exceeded ${(netSpeedTotal / (1024 * 1024)).toFixed(1)} MB/s.`
          );
        } else if (isWarningNet) {
          incidentReasons.push(
            `Heavy Network Activity: Current throughput is ${(netSpeedTotal / (1024 * 1024)).toFixed(1)} MB/s.`
          );
        }

        if (isCriticalCpu || isCriticalNet) {
          severity = "CRITICAL";
        } else if (isThrottled || isWarningCpu || isCriticalRam || isWarningNet) {
          severity = "WARNING";
        } else {
          severity = "NORMAL";
        }
      }

      if (severity === "CRITICAL" || severity === "WARNING") {
        incidentCount++;
      } else if (severity === "NORMAL") {
        healthyCount++;
      }

      return {
        id: vps.id,
        vmid: vps.vmid,
        hostname: vps.hostname,
        primaryIp,
        node: vps.node || "proxmox",
        osTemplate: vps.osTemplate,
        status: vps.status,
        isRunning,
        isSuspended,
        isNetDisabled,
        suspendReason: vps.suspendReason,
        isThrottled,
        rateLimitMb: rateLimit,
        rateLimitMbps: rateLimit ? Math.round(rateLimit * 8 * 10) / 10 : null,
        cpuCores: vps.cpuCores,
        ramGb: vps.ramGb,
        diskGb: vps.diskGb,
        metrics: {
          cpuPercent,
          memBytes,
          maxMemBytes,
          memPercent,
          diskBytes,
          maxDiskBytes,
          diskPercent,
          netSpeedIn,
          netSpeedOut,
          netSpeedTotal,
          netInTotal,
          netOutTotal,
          totalBandwidth,
          uptime,
        },
        flags: {
          isHighCpu,
          isHighRam,
          isHighNet,
        },
        severity,
        incidentReasons,
        createdAt: vps.createdAt,
        updatedAt: vps.updatedAt,
      };
    });

    const rawUserName = vpsServices[0]?.user?.name || auth.user?.name || "Customer";
    const rawUserEmail = vpsServices[0]?.user?.email || auth.user?.email || "-";
    const customerName = decryptDeterministic(rawUserName) || rawUserName;
    const customerEmail = decryptDeterministic(rawUserEmail) || rawUserEmail;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      customer: {
        id: userId,
        name: customerName,
        email: customerEmail,
      },
      summary: {
        totalVps: vpsServices.length,
        runningCount,
        throttledCount,
        suspendedCount,
        netDisabledCount,
        incidentCount,
        healthyCount,
      },
      policy: {
        unmeteredBandwidth: true,
        statement:
          "Masdika Cloud VPS provides free and unmetered network bandwidth with zero surprise overage fees. Bandwidth rate-limiting (throttling) is strictly an automated or administrative protection protocol deployed in response to outbound DDoS, torrent, or network abuse to prevent complete VM suspension and maintain host node hypervisor stability.",
      },
      incidents,
    });
  } catch (error: any) {
    console.error("Error in /api/user/incidents:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve incident telemetry" },
      { status: 500 }
    );
  }
}
