import { NextRequest, NextResponse } from "next/server";
import {
  authenticateVpsApiKey,
  getActiveProxmoxClient,
  getOwnedProvisionedVps,
  vpsApiError,
} from "@/lib/vps-api";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateVpsApiKey(req, {
      name: "VPS_API_METRICS",
      max: 120,
      windowSec: 60,
    });
    if (auth.error) return auth.error;

    const { id } = await params;
    const vpsRes = await getOwnedProvisionedVps(auth.apiKey.userId, id, {
      blockSuspended: false,
    });
    if (vpsRes.error) return vpsRes.error;
    const { vps } = vpsRes;

    const pveRes = await getActiveProxmoxClient();
    if (pveRes.error) return pveRes.error;
    const { proxmox } = pveRes;

    const timeframeRaw = req.nextUrl.searchParams.get("timeframe") || "hour";
    const timeframe = ["hour", "day", "week", "month", "year"].includes(timeframeRaw)
      ? timeframeRaw
      : "hour";

    const [liveStatus, rrdRaw] = await Promise.all([
      proxmox.getVmStatus(vps.node, vps.vmid!).catch(() => null),
      proxmox.getRRDData(vps.node, vps.vmid!, timeframe).catch(() => []),
    ]);

    const rrdPoints = (Array.isArray(rrdRaw) ? rrdRaw : rrdRaw?.data || [])
      .filter((pt: any) => pt && typeof pt.time === "number")
      .slice(-60)
      .map((pt: any) => {
        const rawCpu = Number(pt.cpu ?? 0);
        const maxCpu = Number(pt.maxcpu || vps.cpuCores || 1);
        const cpuPct = Math.min(100, Math.max(0, (rawCpu > 1 ? rawCpu / maxCpu : rawCpu) * 100));
        return {
          timestamp: new Date(pt.time < 1e11 ? pt.time * 1000 : pt.time).toISOString(),
          cpuPercent: Number(cpuPct.toFixed(2)),
          memUsedMb: Math.round(Number(pt.mem ?? 0) / 1024 / 1024),
          memTotalMb: Math.round(Number(pt.maxmem ?? vps.ramGb * 1024 * 1024 * 1024) / 1024 / 1024),
          netInBytes: Math.round(Number(pt.netin ?? 0)),
          netOutBytes: Math.round(Number(pt.netout ?? 0)),
        };
      });

    return NextResponse.json({
      success: true,
      data: {
        id: vps.id,
        hostname: vps.hostname,
        timeframe,
        live: liveStatus
          ? {
              status: liveStatus.status,
              cpuPercent: Number(((Number(liveStatus.cpu ?? 0)) * 100).toFixed(2)),
              memUsedMb: Math.round(Number(liveStatus.mem ?? 0) / 1024 / 1024),
              memTotalMb: Math.round(Number(liveStatus.maxmem ?? 0) / 1024 / 1024),
              uptimeSeconds: Number(liveStatus.uptime ?? 0),
              netInBytes: Number(liveStatus.netin ?? 0),
              netOutBytes: Number(liveStatus.netout ?? 0),
            }
          : null,
        history: rrdPoints,
      },
    });
  } catch (error) {
    console.error("[VPS_API_METRICS]", error);
    return vpsApiError("Internal server error", 500);
  }
}
