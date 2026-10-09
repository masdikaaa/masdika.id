import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";
import { requireAuth } from "@/lib/auth-middleware";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user!;

    // Rate Limit: Max 10 actions per minute per user to prevent API spam
    const allowed = await checkRateLimit("VPS_ACTION", user.id.toString(), 10, 60);
    if (!allowed) {
      return NextResponse.json({ error: "Too many actions. Please wait a moment." }, { status: 429 });
    }

    const { vpsId, action } = await req.json();

    const vps = await prisma.vpsService.findUnique({
      where: { id: vpsId, userId: Number(user.id) },
    });

    if (!vps || !vps.vmid) {
      return NextResponse.json({ error: "VPS not found or not provisioned" }, { status: 404 });
    }

    if (vps.status === "SUSPENDED") {
      return NextResponse.json({ error: "VPS is suspended. You cannot perform this action." }, { status: 403 });
    }

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) {
      return NextResponse.json({ error: "Proxmox server is offline" }, { status: 500 });
    }

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
    
    let result;
    try {
      switch (action) {
        case "start":
          result = await proxmox.startVm(vps.node, vps.vmid);
          break;
        case "stop":
          result = await proxmox.stopVm(vps.node, vps.vmid);
          break;
        case "shutdown":
          result = await proxmox.shutdownVm(vps.node, vps.vmid);
          break;
        case "reboot":
          result = await proxmox.rebootVm(vps.node, vps.vmid);
          break;
        case "reset":
          result = await proxmox.resetVm(vps.node, vps.vmid);
          break;
        default:
          return NextResponse.json({ error: "Invalid action" }, { status: 400 });
      }
    } catch (proxmoxErr: any) {
      console.error("Proxmox Action Error:", proxmoxErr);
      const errMsg = proxmoxErr.message || "";
      if (errMsg.includes("AnyEvent.pm") || errMsg.includes("lock") || errMsg.includes("locked")) {
        return NextResponse.json({ error: "Server is busy processing another task (Locked). Please try again in a few seconds." }, { status: 423 });
      }
      throw proxmoxErr; // Let the outer catch handle it
    }

    // Update DB status to reflect new power state
    const newStatus: Record<string, string> = {
      start: "RUNNING",
      stop: "STOPPED",
      shutdown: "STOPPED",
      reboot: "RUNNING",
      reset: "RUNNING",
    };
    if (newStatus[action]) {
      await prisma.vpsService.update({
        where: { id: vpsId },
        data: { status: newStatus[action] },
      });
    }

    return NextResponse.json({ success: true, result });

  } catch (error: any) {
    console.error("POST VPS action error:", error);
    return NextResponse.json({ error: error.message || "Failed to execute action" }, { status: 500 });
  }
}
