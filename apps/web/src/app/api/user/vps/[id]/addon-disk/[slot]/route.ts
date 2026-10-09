import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string, slot: string }> }) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    const user = authResult.user!;

    const { id, slot } = await params;
    const vpsId = parseInt(id);

    const vps = await prisma.vpsService.findFirst({
      where: { id: vpsId, userId: user.id },
    });

    if (!vps) return NextResponse.json({ error: "VPS not found" }, { status: 404 });
    if (!vps.vmid) return NextResponse.json({ error: "VPS not provisioned yet" }, { status: 400 });

    if (!/^scsi\d+$/.test(slot) || slot === "scsi0") {
      return NextResponse.json({ error: "Invalid slot" }, { status: 400 });
    }

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) return NextResponse.json({ error: "No active Proxmox server configured" }, { status: 500 });

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);

    // Get current VM config to verify slot exists and get size
    const config = await proxmox.getVmConfig(vps.node, vps.vmid);
    const diskConfig = config[slot];

    if (!diskConfig) {
      return NextResponse.json({ error: "Disk not found on this slot" }, { status: 404 });
    }

    let sizeGb = 0;
    const sizeMatch = diskConfig.match(/size=(\d+)G/);
    if (sizeMatch) {
      sizeGb = parseInt(sizeMatch[1]);
    }
    
    const volumeName = diskConfig.split(',')[0]; // e.g. "local-lvm:vm-9001-disk-1"

    // 1. Detach disk in Proxmox
    await proxmox.configVm(vps.node, vps.vmid, {
      delete: slot
    });

    // 2. Try to destroy the unattached disk volume to prevent storage leaks
    try {
        const [storageName, volId] = volumeName.split(':');
        if (storageName && volId) {
            // Need to use the raw request method since there isn't a dedicated delete volume method
            await (proxmox as any).request("DELETE", `/nodes/${vps.node}/storage/${storageName}/content/${volId}`);
        }
    } catch (e) {
        console.warn(`Failed to destroy detached volume ${volumeName}:`, e);
    }

    // 3. Update Billing
    if (sizeGb > 0) {
      const addonPricing = await prisma.vpsPricing.findUnique({ where: { key: "addon_disk" } });
      const pricePerHour = addonPricing?.pricePerHour || 0;
      const deductedCost = sizeGb * pricePerHour;

      if (deductedCost > 0) {
          const newRate = Math.max(0, vps.hourlyRate - deductedCost);
          const newStoppedRate = Math.max(0, (vps.stoppedRate || 0) - deductedCost);
          await prisma.vpsService.update({
            where: { id: vps.id },
            data: { hourlyRate: newRate, stoppedRate: newStoppedRate }
          });
      }
    }

    return NextResponse.json({ message: "Add-on disk deleted successfully" });

  } catch (error: any) {
    console.error("Delete Addon Disk API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete add-on disk" }, { status: 500 });
  }
}
