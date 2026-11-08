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
    const vpsId = Number(id);
    if (!Number.isSafeInteger(vpsId) || vpsId <= 0) {
      return NextResponse.json({ error: "Invalid VPS ID" }, { status: 400 });
    }

    const body = await req.json();
    const sizeGb = Number(body?.sizeGb);

    if (!Number.isSafeInteger(sizeGb) || sizeGb < 1 || sizeGb > 2000) {
      return NextResponse.json({ error: "Invalid disk size. Must be an integer between 1 GB and 2000 GB." }, { status: 400 });
    }

    const vps = await prisma.vpsService.findFirst({
      where: { id: vpsId, userId: user.id },
    });

    if (!vps) return NextResponse.json({ error: "VPS not found" }, { status: 404 });
    if (!vps.vmid) return NextResponse.json({ error: "VPS not provisioned yet" }, { status: 400 });
    if (vps.isReseller) {
      return NextResponse.json({ error: "Add-on disks are not supported on fixed-plan Reseller instances" }, { status: 403 });
    }
    if (vps.status === "SUSPENDED" || vps.status === "TERMINATED" || vps.status === "PROVISIONING") {
      return NextResponse.json({ error: `Cannot attach add-on disk while VPS is ${vps.status}` }, { status: 400 });
    }

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) return NextResponse.json({ error: "No active Proxmox server configured" }, { status: 500 });

    const targetStorage = vps.storageId;
    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);

    // Before adding new disk, calculate pricing (fail closed if addon_disk pricing is missing/zero)
    const addonPricing = await prisma.vpsPricing.findUnique({ where: { key: "addon_disk" } });
    if (!addonPricing || !Number.isSafeInteger(addonPricing.pricePerHour) || addonPricing.pricePerHour <= 0) {
      return NextResponse.json({ error: "Add-on disk pricing is not configured" }, { status: 503 });
    }
    const pricePerHour = addonPricing.pricePerHour;
    const hourlyCost = sizeGb * pricePerHour;
    const newHourlyRate = vps.hourlyRate + hourlyCost;
    const requiredBalance = newHourlyRate * 730;

    if (!Number.isSafeInteger(hourlyCost) || !Number.isSafeInteger(requiredBalance)) {
      return NextResponse.json({ error: "Disk pricing calculation out of range" }, { status: 400 });
    }

    // Atomic VPS Lock + 1-month minimum balance check + 1st hour upfront deduction BEFORE Provisioning
    try {
      await prisma.$transaction(async (tx) => {
        const lockResult = await tx.vpsService.updateMany({
          where: { id: vpsId, userId: user.id, status: vps.status },
          data: { status: "PROVISIONING" }
        });
        if (lockResult.count === 0) {
          throw new Error("VPS_LOCKED");
        }

        const deductResult = await tx.user.updateMany({
          where: { id: user.id, balance: { gte: requiredBalance } },
          data: { balance: { decrement: hourlyCost } }
        });
        if (deductResult.count === 0) {
          throw new Error("INSUFFICIENT_BALANCE");
        }
      });
    } catch (err: any) {
      if (err.message === "VPS_LOCKED") {
        return NextResponse.json({ error: "VPS is currently being modified by another process. Please wait." }, { status: 409 });
      }
      if (err.message === "INSUFFICIENT_BALANCE") {
        return NextResponse.json(
          { error: `A minimum balance of Rp ${requiredBalance.toLocaleString("id-ID")} (1 month estimation) is required to attach this add-on disk.` },
          { status: 400 }
        );
      }
      throw err;
    }

    const refundAndUnlock = async () => {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: { balance: { increment: hourlyCost } }
        }),
        prisma.vpsService.update({
          where: { id: vpsId },
          data: { status: vps.status }
        })
      ]).catch((rollbackErr) => console.error("Failed to rollback addon-disk lock/charge:", rollbackErr));
    };

    // Get current VM config to find an empty scsi slot
    let config: any;
    try {
      config = await proxmox.getVmConfig(vps.node, vps.vmid);
    } catch (cfgErr: any) {
      await refundAndUnlock();
      return NextResponse.json({ error: "Failed to read VM configuration from hypervisor" }, { status: 502 });
    }

    // Find empty slot (scsi1..scsi31; scsi0 is reserved for OS disk)
    let nextIndex = -1;
    for (let i = 1; i < 32; i++) {
      if (!config[`scsi${i}`]) {
        nextIndex = i;
        break;
      }
    }

    if (nextIndex < 1 || nextIndex >= 32) {
      await refundAndUnlock();
      return NextResponse.json({ error: "Maximum number of disks reached" }, { status: 400 });
    }

    // Add new disk
    try {
      await proxmox.configVm(vps.node, vps.vmid, {
        [`scsi${nextIndex}`]: `${targetStorage}:${sizeGb}`,
      });
    } catch (proxmoxErr: any) {
      await refundAndUnlock();
      throw new Error(proxmoxErr.message || "Failed to attach add-on disk in Proxmox");
    }

    // Update Billing, running PAYG invoice, and unlock VPS state
    try {
      await prisma.$transaction(async (tx) => {
        const runningInvoice = await tx.invoice.findFirst({
          where: { vpsServiceId: vps.id, reference: "PAYG_RUNNING" },
          orderBy: { createdAt: "desc" }
        });
        if (runningInvoice) {
          await tx.invoice.update({
            where: { id: runningInvoice.id },
            data: { amount: { increment: hourlyCost } }
          });
        }

        await tx.vpsService.update({
          where: { id: vps.id },
          data: {
            status: vps.status,
            hourlyRate: newHourlyRate,
            stoppedRate: newHourlyRate,
            accumulatedCost: { increment: hourlyCost }
          }
        });
      });
    } catch (dbErr) {
      console.error(`CRITICAL: Proxmox successfully created disk for VPS ${vps.id} but billing update failed:`, dbErr);
    }

    return NextResponse.json({ message: "Add-on disk attached successfully", slot: `scsi${nextIndex}` });

  } catch (error: any) {
    console.error("Addon Disk API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to attach add-on disk" }, { status: 500 });
  }
}
