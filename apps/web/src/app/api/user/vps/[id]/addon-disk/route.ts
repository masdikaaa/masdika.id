import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user: any = null;
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    user = authResult.user!;

    const { id } = await params;
    const vpsId = parseInt(id);
    const body = await req.json();
    const { sizeGb } = body;

    if (!sizeGb || sizeGb <= 0) {
      return NextResponse.json({ error: "Invalid size" }, { status: 400 });
    }

    const vps = await prisma.vpsService.findFirst({
      where: { id: vpsId, userId: user.id },
    });

    if (!vps) return NextResponse.json({ error: "VPS not found" }, { status: 404 });
    if (!vps.vmid) return NextResponse.json({ error: "VPS not provisioned yet" }, { status: 400 });

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) return NextResponse.json({ error: "No active Proxmox server configured" }, { status: 500 });

    const targetStorage = vps.storageId;

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);

    // Before adding new disk, calculate pricing
    const addonPricing = await prisma.vpsPricing.findUnique({ where: { key: "addon_disk" } });
    const pricePerHour = addonPricing?.pricePerHour || 0;
    const hourlyCost = sizeGb * pricePerHour;

    // Atomic VPS Lock BEFORE Provisioning
    if (hourlyCost > 0) {
      if (user.balance < hourlyCost) {
        return NextResponse.json({ error: "Insufficient balance to attach this add-on disk. Please top up your account." }, { status: 400 });
      }

      try {
        await prisma.$transaction(async (tx) => {
          // 1. Lock VPS State
          const lockResult = await tx.vpsService.updateMany({
            where: { id: vpsId, status: vps.status },
            data: { status: 'PROVISIONING' }
          });
          
          if (lockResult.count === 0) {
            throw new Error('VPS_LOCKED');
          }
        });
      } catch (err: any) {
        if (err.message === 'VPS_LOCKED') {
          return NextResponse.json({ error: "VPS is currently being modified by another process. Please wait." }, { status: 409 });
        }
        throw err;
      }
    }

    // Get current VM config to find an empty scsi slot
    const config = await proxmox.getVmConfig(vps.node, vps.vmid);
    
    // Find empty slot (scsi1, scsi2, etc. scsi0 is usually the main disk)
    let nextIndex = 1;
    for (let i = 1; i < 32; i++) {
      if (!config[`scsi${i}`]) {
        nextIndex = i;
        break;
      }
    }

    if (nextIndex >= 32) {
      return NextResponse.json({ error: "Maximum number of disks reached" }, { status: 400 });
    }

    // Add new disk
    try {
      await proxmox.configVm(vps.node, vps.vmid, {
        [`scsi${nextIndex}`]: `${targetStorage}:${sizeGb}`,
      });
    } catch (proxmoxErr: any) {
      // Unlock VPS state on failure
      await prisma.vpsService.update({
        where: { id: vpsId },
        data: { status: vps.status }
      });
      throw new Error(proxmoxErr.message || "Failed to attach add-on disk in Proxmox");
    }

    // Update Billing and unlock VPS state
    try {
      let updateData: any = {
        status: vps.status // Restore original status
      };

      if (hourlyCost > 0) {
        updateData.hourlyRate = vps.hourlyRate + hourlyCost;
        updateData.stoppedRate = (vps.stoppedRate || 0) + hourlyCost;
      }
      
      await prisma.vpsService.update({
        where: { id: vps.id },
        data: updateData
      });
    } catch (dbErr) {
      console.error(`CRITICAL: Proxmox successfully created disk for VPS ${vps.id} but billing update failed:`, dbErr);
      // We don't refund here because the user got the disk!
    }

    return NextResponse.json({ message: "Add-on disk attached successfully", slot: `scsi${nextIndex}` });

  } catch (error: any) {
    console.error("Addon Disk API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to attach add-on disk" }, { status: 500 });
  }
}
