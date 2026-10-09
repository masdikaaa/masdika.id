import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";
import { createVncSession } from "@/lib/vnc-session";
import { authenticateReseller, apiError, parseId } from "@/lib/reseller-api";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate Limit: Max 30 console requests per 5 minutes per reseller
    const auth = await authenticateReseller(req, { name: "RESELLER_API_CONSOLE", max: 30, windowSec: 300 });
    if (auth.error) return auth.error;
    const { apiKey } = auth;

    const instanceId = parseId((await params).id);
    if (!instanceId) {
      return apiError("Invalid instance ID", 400);
    }

    // Only allow access to reseller's own instances
    const vps = await prisma.vpsService.findFirst({
      where: {
        id: instanceId,
        userId: apiKey.userId,
        isReseller: true
      }
    });

    if (!vps || !vps.vmid || vps.status === "TERMINATED") {
      return apiError("Instance not found or not provisioned", 404);
    }

    if (vps.status !== "RUNNING") {
      return apiError(`Instance is not running (current status: ${vps.status})`, 409);
    }

    // Get Proxmox server
    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) {
      return apiError("Hypervisor is currently unavailable", 503);
    }

    // Request VNC proxy ticket from Proxmox
    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
    const vncData = await proxmox.getVncProxy(vps.node, vps.vmid);
    const proxmoxBase = server.host.replace(/\/+$/, "");

    // Create a secure VNC session token
    const vncSessionId = createVncSession({
      proxmoxHost: proxmoxBase,
      node: vps.node,
      vmid: vps.vmid,
      port: vncData.port,
      ticket: vncData.ticket,
      tokenId: server.tokenId,
      tokenSecret: server.tokenSecret,
      userId: apiKey.userId,
    });

    // Build the noVNC console URL  
    const proxyPath = `/api/ws/vnc`;
    const consoleUrl = `/novnc-ui/vnc.html?path=${encodeURIComponent(proxyPath)}&password=${encodeURIComponent(vncData.ticket)}&title=${encodeURIComponent(vps.hostname + " Console")}&resize=remote&autoconnect=true&vpsId=${vps.id}`;

    return NextResponse.json({
      success: true,
      data: {
        consoleUrl,
        ticket: vncData.ticket,
        port: vncData.port,
        sessionToken: vncSessionId,
        expiresIn: 1800 // 30 minutes
      }
    });

  } catch (error: any) {
    console.error("[RESELLER_API_VNC]", error);
    return apiError("Failed to get VNC console", 500);
  }
}
