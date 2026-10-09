import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";
import { authenticateReseller, apiError, parseId, readJson, proxmoxBusyResponse } from "@/lib/reseller-api";

export const dynamic = "force-dynamic";

const ACTIONS: Record<string, { run: (p: ProxmoxClient, node: string, vmid: number) => Promise<any>; status: string }> = {
  start: { run: (p, n, v) => p.startVm(n, v), status: "RUNNING" },
  stop: { run: (p, n, v) => p.stopVm(n, v), status: "STOPPED" },
  shutdown: { run: (p, n, v) => p.shutdownVm(n, v), status: "STOPPED" },
  reboot: { run: (p, n, v) => p.rebootVm(n, v), status: "RUNNING" },
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticateReseller(req, { name: "RESELLER_API_POWER", max: 30, windowSec: 60 });
    if (auth.error) return auth.error;
    const { apiKey } = auth;

    const instanceId = parseId((await params).id);
    if (!instanceId) return apiError("Invalid instance ID", 400);

    const body = await readJson(req);
    const action = typeof body?.action === "string" ? body.action.toLowerCase() : "";
    if (!ACTIONS[action]) {
      return apiError("Invalid action. Must be one of: start, stop, shutdown, reboot", 400);
    }

    const vps = await prisma.vpsService.findFirst({
      where: { id: instanceId, userId: apiKey.userId, isReseller: true },
    });
    if (!vps || !vps.vmid || vps.status === "TERMINATED") return apiError("Instance not found", 404);

    if (vps.status === "SUSPENDED") {
      return apiError("Instance is suspended (e.g. insufficient balance for renewal). Top up your balance first.", 403);
    }
    if (vps.status !== "RUNNING" && vps.status !== "STOPPED") {
      return apiError(`Instance is not ready for power actions (current status: ${vps.status})`, 409);
    }

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) return apiError("Hypervisor is currently unavailable", 503);

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
    try {
      await ACTIONS[action].run(proxmox, vps.node, vps.vmid);
    } catch (e: any) {
      console.error("[RESELLER_API_POWER]", e);
      return proxmoxBusyResponse(e) || apiError(`Failed to execute power action '${action}'`, 502);
    }

    // Only update if the state didn't change underneath us (e.g. suspended by billing cron meanwhile)
    await prisma.vpsService.updateMany({
      where: { id: vps.id, status: { in: ["RUNNING", "STOPPED"] } },
      data: { status: ACTIONS[action].status },
    });

    return NextResponse.json({ success: true, message: `Power action '${action}' executed successfully` });
  } catch (error: any) {
    console.error("[RESELLER_API_POWER]", error);
    return apiError("Internal server error", 500);
  }
}
