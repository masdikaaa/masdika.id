import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";
import { createDuitkuTransaction } from "@/lib/duitku";
import { decryptDeterministic } from "@/lib/encryption";
import { getBandwidthOptions, bandwidthUpgradeHourlyCost, bandwidthToProxmoxRate, BASE_BANDWIDTH_MBPS } from "@/lib/vps-bandwidth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    const user = authResult.user!;

    const { id } = await params;
    const vpsId = parseInt(id);
    const body = await req.json();
    const { cpuCores, ramGb, diskGb, backupGb, bandwidthMbps, addIpv4Count = 0, addIpv6Count = 0, paymentMethodCode } = body;

    const safeAddIpv4 = Math.max(0, Math.floor(Number(addIpv4Count)));
    const safeAddIpv6 = Math.max(0, Math.floor(Number(addIpv6Count)));

    const vps = await prisma.vpsService.findFirst({
      where: { id: vpsId, userId: user.id },
    });

    if (!vps) {
      console.log(`[VPS Upgrade] 404 Error: vpsId=${vpsId}, userId=${user.id}`);
      return NextResponse.json({ error: "VPS not found" }, { status: 404 });
    }
    if (!vps.vmid) return NextResponse.json({ error: "VPS not provisioned yet" }, { status: 400 });

    // Security: Block upgrades on suspended/terminated VPS
    if (vps.status === 'SUSPENDED' || vps.status === 'TERMINATED') {
      return NextResponse.json({ error: "VPS is suspended or terminated. Upgrade is not allowed." }, { status: 403 });
    }

    // Security: Validate and sanitize resource inputs
    const currentBandwidth = vps.bandwidthMbps || BASE_BANDWIDTH_MBPS;
    const safeCpu = Math.min(Math.max(Math.floor(Number(cpuCores) || vps.cpuCores), 1), 32);
    const safeRam = Math.min(Math.max(Math.floor(Number(ramGb) || vps.ramGb), 1), 128);
    const safeDisk = Math.min(Math.max(Math.floor(Number(diskGb) || vps.diskGb), 10), 2000);
    const safeBackup = Math.min(Math.max(Math.floor(Number(backupGb) || vps.backupGb || 0), 0), 2000);

    // Security: bandwidth target must be the current value (no change) or an admin-approved tier
    let safeBandwidth = currentBandwidth;
    if (bandwidthMbps !== undefined && bandwidthMbps !== null && bandwidthMbps !== "") {
      const requestedBandwidth = Number(bandwidthMbps);
      if (!Number.isInteger(requestedBandwidth)) {
        return NextResponse.json({ error: "Invalid bandwidth value" }, { status: 400 });
      }
      if (requestedBandwidth !== currentBandwidth) {
        const allowedBandwidth = await getBandwidthOptions();
        if (!allowedBandwidth.includes(requestedBandwidth)) {
          return NextResponse.json({ error: `Invalid bandwidth tier. Allowed: ${allowedBandwidth.join(", ")} Mbps` }, { status: 400 });
        }
      }
      safeBandwidth = requestedBandwidth;
    }

    if (safeCpu < vps.cpuCores || safeRam < vps.ramGb || safeDisk < vps.diskGb || safeBackup < (vps.backupGb || 0) || safeBandwidth < currentBandwidth) {
      return NextResponse.json({ error: "Downgrading specifications is not allowed" }, { status: 400 });
    }

    const hasChanges = safeCpu > vps.cpuCores || safeRam > vps.ramGb || safeDisk > vps.diskGb || safeBackup > (vps.backupGb || 0) || safeBandwidth > currentBandwidth || safeAddIpv4 > 0 || safeAddIpv6 > 0;
    if (!hasChanges) {
      return NextResponse.json({ error: "No specification changes requested" }, { status: 400 });
    }

    // Calculate new pricing FIRST
    const pricingItems = await prisma.vpsPricing.findMany();
    const pricing: Record<string, number> = {};
    pricingItems.forEach(item => {
      pricing[item.key] = item.pricePerHour;
    });

    let additionalHourlyRate = 0;
    let additionalStorageRate = 0;
    if (safeCpu > vps.cpuCores) {
      const addedCpuCores = safeCpu - vps.cpuCores;
      // Active VPS CPU upgrade pricing: Rp 50.000 / Core / month
      const addedCpuMonthly = addedCpuCores * 50000;
      const addedCpuHourly = Math.ceil(addedCpuMonthly / 730);
      additionalHourlyRate += addedCpuHourly;
    }
    if (safeRam > vps.ramGb) {
      const addedRamGb = safeRam - vps.ramGb;
      // Active VPS RAM upgrade pricing: Rp 25.000 / GB / month
      const addedRamMonthly = addedRamGb * 25000;
      const addedRamHourly = Math.ceil(addedRamMonthly / 730);
      additionalHourlyRate += addedRamHourly;
    }
    if (safeDisk > vps.diskGb) {
      const addedDiskGb = safeDisk - vps.diskGb;
      // Active VPS disk upgrade pricing: HDD Rp 4.000 / GB / month, SSD Rp 5.000 / GB / month
      // Determine diskType strictly from database record (cannot be forged by client payload)
      const isSsd = (vps.diskType || "").toUpperCase() === "SSD";
      const diskRateMonthlyPerGb = isSsd ? 5000 : 4000;
      const addedDiskMonthly = addedDiskGb * diskRateMonthlyPerGb;
      // Standard hours per month is 730; Math.ceil ensures host never suffers fractional loss
      const addedDiskHourly = Math.ceil(addedDiskMonthly / 730);
      additionalHourlyRate += addedDiskHourly;
      additionalStorageRate += addedDiskHourly;
    }
    if (safeBackup > (vps.backupGb || 0)) {
      additionalHourlyRate += (safeBackup - (vps.backupGb || 0)) * (pricing.backup || 0);
      additionalStorageRate += (safeBackup - (vps.backupGb || 0)) * (pricing.backup || 0);
    }
    if (safeBandwidth > currentBandwidth) {
      // Charged as full-tier difference so splitting upgrades can never skip payment
      const addedBandwidthHourly = bandwidthUpgradeHourlyCost(currentBandwidth, safeBandwidth, pricing);
      additionalHourlyRate += addedBandwidthHourly;
      additionalStorageRate += addedBandwidthHourly;
    }
    if (safeAddIpv4 > 0) {
      additionalHourlyRate += safeAddIpv4 * (pricing.ipv4 || 0);
      additionalStorageRate += safeAddIpv4 * (pricing.ipv4 || 0);
    }
    if (safeAddIpv6 > 0) {
      additionalHourlyRate += safeAddIpv6 * (pricing.ipv6 || 0);
      additionalStorageRate += safeAddIpv6 * (pricing.ipv6 || 0);
    }

    const newHourlyRate = vps.hourlyRate + additionalHourlyRate;
    const newStoppedRate = (vps.stoppedRate || 0) + additionalStorageRate;
    
    // Security: Prevent abuse by requiring 1 month equivalent balance of the new rate
    const requiredBalance = newHourlyRate * 730;
    if (user.balance < requiredBalance) {
      return NextResponse.json({ error: `A minimum balance of Rp ${requiredBalance.toLocaleString('id-ID')} (1 month estimation) is required to upgrade to this specification to prevent abuse. Please top up first.` }, { status: 400 });
    }

    // Lock the VPS state before modifying
    const lockResult = await prisma.vpsService.updateMany({
      where: { id: vpsId, status: vps.status },
      data: { status: 'PROVISIONING' }
    });
    if (lockResult.count === 0) {
      return NextResponse.json({ error: "VPS is currently being modified by another process. Please wait." }, { status: 409 });
    }

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) return NextResponse.json({ error: "No active Proxmox server configured" }, { status: 500 });

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);

    try {
      // Upgrade CPU and RAM if changed
      if (safeCpu > vps.cpuCores || safeRam > vps.ramGb) {
        await proxmox.configVm(vps.node, vps.vmid, {
          cores: safeCpu,
          memory: safeRam * 1024,
        });
      }

      // Upgrade Bandwidth rate limit if changed
      if (safeBandwidth > currentBandwidth) {
        const rateMBs = bandwidthToProxmoxRate(safeBandwidth);
        const currentConfig = await proxmox.getVmConfig(vps.node, vps.vmid);
        const netConfigUpdates: Record<string, string> = {};
        for (let i = 0; i < 5; i++) {
          const netKey = `net${i}`;
          if (currentConfig[netKey]) {
            let netStr = currentConfig[netKey];
            if (netStr.includes("rate=")) {
              netStr = netStr.replace(/rate=[0-9.]+/g, `rate=${rateMBs}`);
            } else {
              netStr = `${netStr},rate=${rateMBs}`;
            }
            netConfigUpdates[netKey] = netStr;
          }
        }
        if (Object.keys(netConfigUpdates).length > 0) {
          await proxmox.configVm(vps.node, vps.vmid, netConfigUpdates);
        }
      }

    // Upgrade Disk if changed
    if (safeDisk > vps.diskGb) {
      const addedGb = safeDisk - vps.diskGb;

      // Anti-manipulation / fail-safe: Check Proxmox node storage capacity before executing resize
      try {
        const storages = await proxmox.getStorages(vps.node);
        const targetStorage = storages.find((s: any) => s.storage === (vps.storageId || server.mainDiskStorage || 'local-lvm'));
        if (targetStorage && typeof targetStorage.avail === 'number') {
          const neededBytes = addedGb * 1024 * 1024 * 1024;
          if (neededBytes > targetStorage.avail) {
            await prisma.vpsService.update({
              where: { id: vpsId },
              data: { status: vps.status }
            });
            return NextResponse.json({
              error: `Insufficient storage space on node. Available: ${Math.floor(targetStorage.avail / (1024 * 1024 * 1024))} GB, requested: ${addedGb} GB.`
            }, { status: 400 });
          }
        }
      } catch (capErr: any) {
        console.warn("[VPS Upgrade] Could not verify Proxmox storage capacity pre-flight:", capErr?.message);
      }
      
      const config = await proxmox.getVmConfig(vps.node, vps.vmid);
      
      let mainDisk = "scsi0";
      if (config.virtio0 && config.virtio0.includes(vps.storageId)) mainDisk = "virtio0";
      else if (config.sata0 && config.sata0.includes(vps.storageId)) mainDisk = "sata0";
      else if (config.scsi0) mainDisk = "scsi0";

      await proxmox.resizeVmDisk(vps.node, vps.vmid, mainDisk, `+${addedGb}G`);
    }

    // Network Upgrades (Add IPs) for PAYG and Balance-paid Fixed upgrades
    let networkConfigUpdate: any = {};
    if (safeAddIpv4 > 0 || safeAddIpv6 > 0) {
      const { VpsProvisioningService } = await import('@/lib/vps-provisioning');
      const vmConfig = await proxmox.getVmConfig(vps.node, vps.vmid);
      
      const getNextAvailableNetIndex = () => {
          for (let i = 0; i < 10; i++) {
              if (i === 1) continue; // Reserved strictly for VPC
              if (vmConfig[`net${i}`] === undefined && networkConfigUpdate[`net${i}`] === undefined) {
                  return i;
              }
          }
          return 10; // Fallback
      };

      const provisionIps = async (count: number, ipVersion: number) => {
          if (!count) return;
          const pool = await prisma.ipPool.findFirst({ where: { version: ipVersion, type: 'PUBLIC' } });
          if (!pool) return;

          for (let i = 0; i < count; i++) {
            try {
                const ipAddress = await VpsProvisioningService.allocateIp(pool.id);
                await prisma.vpsIpAssignment.create({
                  data: { vpsId: vps.id, ipPoolId: pool.id, ipAddress: ipAddress, isPrimary: false }
                });

                const cidrSuffix = pool.network.split('/')[1] || (ipVersion === 4 ? '24' : '64');
                const ipKey = ipVersion === 4 ? 'ip' : 'ip6';
                const gwKey = ipVersion === 4 ? 'gw' : 'gw6';
                
                const nextNetIndex = getNextAvailableNetIndex();
                const bridgeToUse = pool.type === 'PUBLIC' && server.publicNetworkBridge ? server.publicNetworkBridge : vps.networkBridge;
                networkConfigUpdate[`net${nextNetIndex}`] = `model=virtio,bridge=${bridgeToUse},firewall=1`;
                networkConfigUpdate[`ipconfig${nextNetIndex}`] = `${ipKey}=${ipAddress}/${cidrSuffix},${gwKey}=${pool.gateway}`;
            } catch (e) {
                console.error(`Failed to provision IP version ${ipVersion} for VPS ${vps.id}`, e);
            }
          }
      };

      await provisionIps(safeAddIpv4, 4);
      await provisionIps(safeAddIpv6, 6);
      
      if (Object.keys(networkConfigUpdate).length > 0) {
          await proxmox.configVm(vps.node, vps.vmid, networkConfigUpdate);
      }
    }
    } catch (proxmoxErr: any) {

      
      // Unlock VPS state on failure
      await prisma.vpsService.update({
        where: { id: vpsId },
        data: { status: vps.status }
      });
      throw new Error(proxmoxErr.message || "Failed to upgrade VPS in Proxmox");
    }

    // Update Database and unlock VPS state atomically
    const updatedVps = await prisma.$transaction(async (tx) => {
      if (additionalHourlyRate > 0) {
        // Deduct initial hour of the upgraded rate
        await tx.user.updateMany({
          where: { id: user.id, balance: { gte: additionalHourlyRate } },
          data: { balance: { decrement: additionalHourlyRate } }
        });

        // Update running invoice
        const runningInvoice = await tx.invoice.findFirst({
          where: { vpsServiceId: vps.id, reference: 'PAYG_RUNNING' },
          orderBy: { createdAt: 'desc' }
        });
        if (runningInvoice) {
          await tx.invoice.update({
            where: { id: runningInvoice.id },
            data: { amount: { increment: additionalHourlyRate } }
          });
        }
      }

      return await tx.vpsService.update({
        where: { id: vps.id },
        data: {
          cpuCores: safeCpu,
          ramGb: safeRam,
          diskGb: safeDisk,
          backupGb: safeBackup,
          bandwidthMbps: safeBandwidth,
          hourlyRate: newHourlyRate,
          stoppedRate: newStoppedRate,
          ...(additionalHourlyRate > 0 ? { accumulatedCost: { increment: additionalHourlyRate } } : {}),
          status: vps.status, // Restore original status
        }
      });
    });

    return NextResponse.json({ message: "Specifications upgraded successfully", vps: updatedVps });

  } catch (error: any) {
    console.error("Upgrade API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to upgrade VPS specifications" }, { status: 500 });
  }
}
