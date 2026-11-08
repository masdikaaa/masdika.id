import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";
import { calculateMinimumBaseVpsRate } from "@/lib/vps-billing-rate";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string, slot: string }> }) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    const user = authResult.user!;

    const { id, slot } = await params;
    const vpsId = Number(id);
    if (!Number.isSafeInteger(vpsId) || vpsId <= 0) {
      return NextResponse.json({ error: "Invalid VPS ID" }, { status: 400 });
    }

    // Strictly allow only scsi1 through scsi31 (never scsi0 OS disk or arbitrary keys)
    if (!/^scsi([1-9]|[12]\d|3[01])$/.test(slot)) {
      return NextResponse.json({ error: "Invalid slot" }, { status: 400 });
    }

    const vps = await prisma.vpsService.findFirst({
      where: { id: vpsId, userId: user.id },
    });

    if (!vps) return NextResponse.json({ error: "VPS not found" }, { status: 404 });
    if (!vps.vmid) return NextResponse.json({ error: "VPS not provisioned yet" }, { status: 400 });
    if (vps.isReseller) {
      return NextResponse.json({ error: "Add-on disk removal is not supported on fixed-plan Reseller instances" }, { status: 403 });
    }
    if (vps.status === "SUSPENDED" || vps.status === "TERMINATED" || vps.status === "PROVISIONING") {
      return NextResponse.json({ error: `Cannot modify disks while VPS is ${vps.status}` }, { status: 400 });
    }

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) return NextResponse.json({ error: "No active Proxmox server configured" }, { status: 500 });

    // Atomically lock VPS state so concurrent DELETE calls cannot subtract hourlyRate twice!
    const lockResult = await prisma.vpsService.updateMany({
      where: { id: vps.id, userId: user.id, status: vps.status },
      data: { status: "PROVISIONING" }
    });
    if (lockResult.count === 0) {
      return NextResponse.json({ error: "VPS is currently being modified by another process. Please wait." }, { status: 409 });
    }

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);

    try {
      // Get current VM config to verify slot exists and get size
      const config = await proxmox.getVmConfig(vps.node, vps.vmid);
      const diskConfig = config[slot];

      if (!diskConfig || typeof diskConfig !== "string") {
        await prisma.vpsService.update({ where: { id: vps.id }, data: { status: vps.status } });
        return NextResponse.json({ error: "Disk not found on this slot" }, { status: 404 });
      }

      let sizeGb = 0;
      const sizeMatch = diskConfig.match(/size=(\d+)G/);
      if (sizeMatch) {
        sizeGb = parseInt(sizeMatch[1], 10);
      }

      const volumeName = diskConfig.split(",")[0]; // e.g. "local-lvm:vm-9001-disk-1"

      // 1. Detach disk in Proxmox
      await proxmox.configVm(vps.node, vps.vmid, {
        delete: slot
      });

      // 2. Try to destroy the unattached disk volume to prevent storage leaks (only if volume belongs to this VMID)
      try {
        const [storageName, volId] = volumeName.split(":");
        if (
          storageName &&
          volId &&
          /^[a-zA-Z0-9_-]+$/.test(storageName) &&
          /^[a-zA-Z0-9_./-]+$/.test(volId) &&
          volId.includes(`vm-${vps.vmid}-`)
        ) {
          await (proxmox as any).request(
            "DELETE",
            `/nodes/${encodeURIComponent(vps.node)}/storage/${encodeURIComponent(storageName)}/content/${encodeURIComponent(volId)}`
          );
        }
      } catch (e) {
        console.warn(`Failed to destroy detached volume ${volumeName}:`, e);
      }

      // 3. Update Billing (clamped to minimum base hardware rate) and unlock VPS
      const pricingItems = await prisma.vpsPricing.findMany();
      const pricingMap: Record<string, number> = {};
      for (const p of pricingItems) {
        pricingMap[p.key] = p.pricePerHour;
      }
      const minBaseRate = calculateMinimumBaseVpsRate(vps, pricingMap);
      const pricePerHour = pricingMap.addon_disk || 0;
      const deductedCost = sizeGb > 0 && pricePerHour > 0 ? sizeGb * pricePerHour : 0;
      const newRate = deductedCost > 0
        ? Math.max(minBaseRate, vps.hourlyRate - deductedCost)
        : vps.hourlyRate;

      await prisma.vpsService.update({
        where: { id: vps.id },
        data: {
          status: vps.status,
          hourlyRate: newRate,
          stoppedRate: newRate
        }
      });

      return NextResponse.json({ message: "Add-on disk deleted successfully" });
    } catch (innerErr) {
      await prisma.vpsService.update({
        where: { id: vps.id },
        data: { status: vps.status }
      }).catch(() => {});
      throw innerErr;
    }

  } catch (error: any) {
    console.error("Delete Addon Disk API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete add-on disk" }, { status: 500 });
  }
}
