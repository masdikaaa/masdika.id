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

function parseSpecInteger(
  raw: unknown,
  fallback: number,
  min: number,
  max: number,
  fieldName: string
): { value: number } | { error: NextResponse } {
  if (raw === undefined || raw === null || raw === "") {
    return { value: fallback };
  }
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isSafeInteger(n) || n < min || n > max) {
    return {
      error: vpsApiError(
        `Invalid ${fieldName}. Must be an integer between ${min} and ${max}.`,
        400
      ),
    };
  }
  return { value: n };
}

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

    if (vps.isReseller) {
      return vpsApiError(
        "PAYG hardware upgrades are not supported on fixed-plan instances.",
        403
      );
    }

    if (vps.status !== "RUNNING" && vps.status !== "STOPPED") {
      return vpsApiError(`VPS is ${vps.status}. Upgrade is not allowed.`, 403);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return vpsApiError("Invalid JSON payload", 400);
    }

    const cpuRes = parseSpecInteger(body.cpuCores, vps.cpuCores, 1, 32, "cpuCores");
    if ("error" in cpuRes) return cpuRes.error;
    const ramRes = parseSpecInteger(body.ramGb, vps.ramGb, 1, 128, "ramGb");
    if ("error" in ramRes) return ramRes.error;
    const diskRes = parseSpecInteger(body.diskGb, vps.diskGb, 10, 2000, "diskGb");
    if ("error" in diskRes) return diskRes.error;

    const safeCpu = cpuRes.value;
    const safeRam = ramRes.value;
    const safeDisk = diskRes.value;
    const currentBandwidth = vps.bandwidthMbps || BASE_BANDWIDTH_MBPS;

    let safeBandwidth = currentBandwidth;
    if (body.bandwidthMbps !== undefined && body.bandwidthMbps !== null && body.bandwidthMbps !== "") {
      const requestedBw = Number(body.bandwidthMbps);
      if (!Number.isSafeInteger(requestedBw)) {
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
    const hasChanges =
      addedCpu > 0 || addedRam > 0 || addedDisk > 0 || safeBandwidth > currentBandwidth;

    if (!hasChanges) {
      return vpsApiError("No specification changes requested", 400);
    }

    const pricingItems = await prisma.vpsPricing.findMany();
    const pricing: Record<string, number> = {};
    for (const item of pricingItems) pricing[item.key] = item.pricePerHour;

    let additionalHourly = 0;
    if (addedCpu > 0) {
      additionalHourly += Math.ceil((addedCpu * 50000) / 730);
    }
    if (addedRam > 0) {
      additionalHourly += Math.ceil((addedRam * 25000) / 730);
    }
    if (addedDisk > 0) {
      const isSsd = (vps.diskType || "").toUpperCase() === "SSD";
      const diskRateMonthlyPerGb = isSsd ? 5000 : 4000;
      additionalHourly += Math.ceil((addedDisk * diskRateMonthlyPerGb) / 730);
    }
    if (safeBandwidth > currentBandwidth) {
      additionalHourly += bandwidthUpgradeHourlyCost(currentBandwidth, safeBandwidth, pricing);
    }

    const newHourlyRate = vps.hourlyRate + additionalHourly;
    const requiredBalance = newHourlyRate * 730;

    if (
      !Number.isSafeInteger(newHourlyRate) ||
      !Number.isSafeInteger(requiredBalance) ||
      additionalHourly < 0
    ) {
      return vpsApiError("Invalid upgrade billing calculation", 400);
    }

    const pveRes = await getActiveProxmoxClient();
    if (pveRes.error) return pveRes.error;
    const { proxmox } = pveRes;

    try {
      await prisma.$transaction(async (tx) => {
        const lockResult = await tx.vpsService.updateMany({
          where: { id: vps.id, userId: auth.apiKey.userId, status: vps.status },
          data: { status: "PROVISIONING" },
        });
        if (lockResult.count === 0) {
          throw new Error("VPS_LOCKED");
        }

        const deductResult = await tx.user.updateMany({
          where: { id: auth.apiKey.userId, balance: { gte: requiredBalance } },
          data: {
            ...(additionalHourly > 0 ? { balance: { decrement: additionalHourly } } : {}),
          },
        });
        if (deductResult.count === 0) {
          throw new Error("INSUFFICIENT_BALANCE");
        }
      });
    } catch (lockErr: any) {
      if (lockErr?.message === "VPS_LOCKED") {
        return vpsApiError(
          "VPS is currently being modified by another process. Please wait.",
          409
        );
      }
      if (lockErr?.message === "INSUFFICIENT_BALANCE") {
        return vpsApiError(
          `A minimum balance of Rp ${requiredBalance.toLocaleString("id-ID")} (1 month commitment) is required to upgrade to this specification.`,
          402
        );
      }
      throw lockErr;
    }

    const refundAndUnlock = async () => {
      await prisma
        .$transaction([
          ...(additionalHourly > 0
            ? [
                prisma.user.update({
                  where: { id: auth.apiKey.userId },
                  data: { balance: { increment: additionalHourly } },
                }),
              ]
            : []),
          prisma.vpsService.update({
            where: { id: vps.id },
            data: { status: vps.status },
          }),
        ])
        .catch((rbErr) => console.error("[VPS_API_UPGRADE] Rollback error:", rbErr));
    };

    try {
      const vmConfig = await proxmox.getVmConfig(vps.node, vps.vmid!);

      if (addedDisk > 0) {
        try {
          const storages = await proxmox.getStorages(vps.node);
          const targetStorage = storages.find(
            (s: any) => s.storage === (vps.storageId || "local-lvm")
          );
          if (targetStorage && typeof targetStorage.avail === "number") {
            const neededBytes = addedDisk * 1024 * 1024 * 1024;
            if (neededBytes > targetStorage.avail) {
              await refundAndUnlock();
              return vpsApiError(
                `Insufficient storage space on node. Available: ${Math.floor(targetStorage.avail / (1024 * 1024 * 1024))} GB, requested: ${addedDisk} GB.`,
                400
              );
            }
          }
        } catch {
          // Proceed if storage query is unsupported on mock/node
        }

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
          hourlyRate: newHourlyRate,
          stoppedRate: newHourlyRate,
          status: vps.status,
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
    } catch (proxmoxErr) {
      await refundAndUnlock();
      throw proxmoxErr;
    }
  } catch (error) {
    console.error("[VPS_API_UPGRADE]", error);
    return vpsApiError("Failed to upgrade VPS", 500);
  }
}
