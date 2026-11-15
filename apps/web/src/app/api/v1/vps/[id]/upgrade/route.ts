import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  authenticateVpsApiKey,
  getActiveProxmoxClient,
  getOwnedProvisionedVps,
  vpsApiError,
} from "@/lib/vps-api";
import {
  BASE_BANDWIDTH_MBPS,
  bandwidthToProxmoxRate,
  bandwidthUpgradeHourlyCost,
  getBandwidthOptions,
} from "@/lib/vps-bandwidth";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateVpsApiKey(req, {
      name: "VPS_API_UPGRADE",
      max: 15,
      windowSec: 60,
    });
    if (auth.error) return auth.error;

    const { id } = await params;
    const vpsRes = await getOwnedProvisionedVps(auth.apiKey.userId, id);
    if (vpsRes.error) return vpsRes.error;
    const { vps } = vpsRes;

    if (vps.status !== "RUNNING" && vps.status !== "STOPPED") {
      return vpsApiError(`VPS is ${vps.status}. Upgrade is not allowed.`, 403);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return vpsApiError("Invalid JSON payload", 400);
    }

    const currentBandwidth = vps.bandwidthMbps || BASE_BANDWIDTH_MBPS;
    const safeCpu = Math.min(Math.max(Math.floor(Number(body.cpuCores) || vps.cpuCores), 1), 32);
    const safeRam = Math.min(Math.max(Math.floor(Number(body.ramGb) || vps.ramGb), 1), 128);
    const safeDisk = Math.min(Math.max(Math.floor(Number(body.diskGb) || vps.diskGb), 10), 2000);

    let safeBandwidth = currentBandwidth;
    if (body.bandwidthMbps !== undefined && body.bandwidthMbps !== null && body.bandwidthMbps !== "") {
      const requestedBw = Number(body.bandwidthMbps);
      if (!Number.isInteger(requestedBw)) {
        return vpsApiError("Invalid bandwidthMbps value", 400);
      }
      if (requestedBw !== currentBandwidth) {
        const allowedBw = await getBandwidthOptions();
        if (!allowedBw.includes(requestedBw)) {
          return vpsApiError(`Invalid bandwidth tier. Allowed: ${allowedBw.join(", ")} Mbps`, 400);
        }
      }
      safeBandwidth = requestedBw;
    }

    if (
      safeCpu < vps.cpuCores ||
      safeRam < vps.ramGb ||
      safeDisk < vps.diskGb ||
      safeBandwidth < currentBandwidth
    ) {
      return vpsApiError("Downgrading specifications is not allowed", 400);
    }

    const addedCpu = safeCpu - vps.cpuCores;
    const addedRam = safeRam - vps.ramGb;
    const addedDisk = safeDisk - vps.diskGb;
    const hasChanges = addedCpu > 0 || addedRam > 0 || addedDisk > 0 || safeBandwidth > currentBandwidth;

    if (!hasChanges) {
      return vpsApiError("No specification changes requested", 400);
    }

    const pricingItems = await prisma.vpsPricing.findMany();
    const pricing: Record<string, number> = {};
    for (const item of pricingItems) pricing[item.key] = item.pricePerHour;

    const diskType = (vps.diskType || "HDD").toUpperCase();
    const diskKey = diskType === "NVME" ? "disk_nvme" : diskType === "SSD" ? "disk_ssd" : "disk_hdd";
    const diskRate = pricing[diskKey] ?? pricing.disk_hdd ?? 0;

    let additionalHourly = 0;
    additionalHourly += addedCpu * (pricing.cpu || 0);
    additionalHourly += addedRam * (pricing.ram || 0);
    additionalHourly += addedDisk * diskRate;
    if (safeBandwidth > currentBandwidth) {
      additionalHourly += bandwidthUpgradeHourlyCost(currentBandwidth, safeBandwidth, pricing);
    }

    const additionalStorageHourly = addedDisk * diskRate;

    const user = await prisma.user.findUnique({
      where: { id: auth.apiKey.userId },
      select: { balance: true },
    });
    if (!user || user.balance < additionalHourly) {
      return vpsApiError(
        `Insufficient balance for upgrade. Required at least Rp ${additionalHourly}/hr.`,
        402
      );
    }

    const pveRes = await getActiveProxmoxClient();
    if (pveRes.error) return pveRes.error;
    const { proxmox } = pveRes;

    const vmConfig = await proxmox.getVmConfig(vps.node, vps.vmid!);

    if (addedDisk > 0) {
      let mainDisk = "scsi0";
      if (vmConfig?.virtio0 && String(vmConfig.virtio0).includes(vps.storageId)) mainDisk = "virtio0";
      else if (vmConfig?.sata0 && String(vmConfig.sata0).includes(vps.storageId)) mainDisk = "sata0";
      await proxmox.resizeVmDisk(vps.node, vps.vmid!, mainDisk, `+${addedDisk}G`);
    }

    const configUpdate: Record<string, any> = {};
    if (addedCpu > 0) configUpdate.cores = safeCpu;
    if (addedRam > 0) configUpdate.memory = safeRam * 1024;
    if (safeBandwidth > currentBandwidth && vmConfig?.net0) {
      const rateMBs = bandwidthToProxmoxRate(safeBandwidth);
      configUpdate.net0 = String(vmConfig.net0).replace(/,rate=[^,]+/, "") + `,rate=${rateMBs}`;
    }
    if (Object.keys(configUpdate).length > 0) {
      await proxmox.configVm(vps.node, vps.vmid!, configUpdate);
    }

    const updated = await prisma.vpsService.update({
      where: { id: vps.id },
      data: {
        cpuCores: safeCpu,
        ramGb: safeRam,
        diskGb: safeDisk,
        bandwidthMbps: safeBandwidth,
        hourlyRate: vps.hourlyRate + additionalHourly,
        stoppedRate: (vps.stoppedRate || 0) + additionalStorageHourly,
      },
      select: {
        id: true,
        hostname: true,
        cpuCores: true,
        ramGb: true,
        diskGb: true,
        bandwidthMbps: true,
        hourlyRate: true,
        status: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: `VPS '${vps.hostname}' upgraded successfully`,
    });
  } catch (error) {
    console.error("[VPS_API_UPGRADE]", error);
    return vpsApiError("Failed to upgrade VPS", 500);
  }
}
