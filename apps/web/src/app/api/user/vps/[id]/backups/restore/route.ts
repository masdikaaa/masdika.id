import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { volume } = await req.json();
    if (!volume) return NextResponse.json({ error: "Volume is required" }, { status: 400 });

    const vps = await prisma.vpsService.findUnique({
      where: { id: parseInt(id), userId: auth.userId }
    });

    if (!vps) return NextResponse.json({ error: "VPS not found" }, { status: 404 });
    if (!vps.vmid) return NextResponse.json({ error: "VPS is not provisioned" }, { status: 400 });
    if (vps.status === "SUSPENDED" || vps.status === "TERMINATED") return NextResponse.json({ error: "VPS is suspended or terminated. Restore is blocked." }, { status: 403 });

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) return NextResponse.json({ error: "No active Proxmox server configured" }, { status: 500 });

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
    
    // Ensure the VM is stopped before restoring (restoring over a running VM will fail)
    try {
      const status = await proxmox.getVmStatus(vps.node, vps.vmid);
      if (status && status.status === "running") {
        await proxmox.stopVm(vps.node, vps.vmid);
        // Wait a few seconds for the stop to complete
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (e) {
      console.log("Could not check/stop VM before restore (might already be stopped):", e);
    }

    // Trigger restore (this will overwrite the existing VM config and disk)
    const task = await proxmox.restoreBackup(vps.node, vps.vmid, volume);
    
    return NextResponse.json({ success: true, upid: task.data });
  } catch (error: any) {
    console.error("Restore backup error:", error);
    return NextResponse.json({ error: error.message || "Failed to restore backup" }, { status: 500 });
  }
}
