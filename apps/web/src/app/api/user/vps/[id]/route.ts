import { NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const userId = auth.userId!;
    const user = auth.user!;

    const { id } = await params;
    
    const parsedId = parseInt(id);
    if (isNaN(parsedId)) {
      return NextResponse.json({ error: "Invalid VPS ID" }, { status: 400 });
    }
    
    const whereClause: any = { id: parsedId };
    if (user?.role !== "ADMIN") {
        whereClause.userId = userId;
    }

    const vps = await prisma.vpsService.findFirst({
      where: whereClause,
      select: {
        id: true, userId: true, hostname: true, username: true, status: true,
        node: true, vmid: true, cpuCores: true, ramGb: true, diskGb: true,
        backupGb: true, backupSchedule: true, networkBridge: true, storageId: true,
        hourlyRate: true, accumulatedCost: true,
        expiresAt: true, createdAt: true, updatedAt: true, suspendReason: true,
        osTemplate: true, vpcId: true, vpcIp: true, autoRenew: true,
        kubernetesClusterId: true, kubernetesRole: true,
        diskType: true,
        bandwidthMbps: true,
        assignedIps: true,
        // rootPassword and sshKey intentionally excluded from API response
      }
    });

    if (!vps) {
      return NextResponse.json({ error: "VPS not found" }, { status: 404 });
    }

    // Try fetching live status from proxmox
    let liveStatus = null;
    let allowedAddonStorages: string[] = [];
    let addonDisks: any[] = [];
    let maxSpecs = {
      cpu: 32, // defaults
      ram: 128,
      disk: 2000
    };

    try {
      const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
      if (server) {
          if (server.addonDiskStorages) {
              allowedAddonStorages = server.addonDiskStorages.split(",");
          }
          if (vps.vmid) {
              const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
              try {
                liveStatus = await proxmox.getVmStatus(vps.node, vps.vmid);
              } catch (e: any) {
                if (e.message && !e.message.includes("does not exist")) {
                  console.warn(`[API] Failed to get VM status for ${vps.vmid}:`, e.message);
                }
              }

              // Fetch actual guest filesystem usage via QEMU Guest Agent (if available/running)
              try {
                if (liveStatus && liveStatus.status === "running") {
                  const fsInfo = await proxmox.getVmAgentFsInfo(vps.node, vps.vmid);
                  if (fsInfo && fsInfo.result && Array.isArray(fsInfo.result)) {
                    let totalDisk = 0;
                    let usedDisk = 0;
                    const ignoredFsTypes = ['tmpfs', 'devtmpfs', 'squashfs', 'iso9660', 'overlay', 'ramfs'];
                    
                    fsInfo.result.forEach((fs: any) => {
                      if (fs['total-bytes'] && fs['used-bytes'] && !ignoredFsTypes.includes(fs.fstype)) {
                        totalDisk += fs['total-bytes'];
                        usedDisk += fs['used-bytes'];
                      }
                    });
                    
                    if (totalDisk > 0) {
                      liveStatus.disk = usedDisk;
                      liveStatus.maxdisk = totalDisk;
                    }
                  }
                }
              } catch (e) {
                // Guest agent might not be installed or running, fail silently
              }

              // Fetch VM Config for addon disks
              try {
                const vmConfig = await proxmox.getVmConfig(vps.node, vps.vmid);
                for (const key of Object.keys(vmConfig)) {
                  if (/^scsi[1-9][0-9]*$/.test(key) && key !== "scsi0") {
                    const val = vmConfig[key];
                    if (val && !val.includes("media=cdrom") && !val.includes("cloudinit")) {
                      const sizeMatch = val.match(/size=(\d+)G/);
                      const sizeGb = sizeMatch ? parseInt(sizeMatch[1]) : 0;
                      const storage = val.split(':')[0];
                      addonDisks.push({
                        slot: key,
                        storage,
                        sizeGb,
                        raw: val
                      });
                    }
                  }
                }
              } catch (e: any) {
                if (e.message && !e.message.includes("does not exist")) {
                  console.warn(`[API] Failed to get VM config for addon disks (VMID ${vps.vmid}):`, e.message);
                }
              }

              // Fetch node max resources
              try {
                const nodeStatus = await proxmox.getNodeStatus(vps.node);
                if (nodeStatus && nodeStatus.memory && nodeStatus.cpuinfo) {
                  maxSpecs.cpu = nodeStatus.cpuinfo.cpus; // total cores
                  // bytes to GB
                  maxSpecs.ram = Math.floor(nodeStatus.memory.total / (1024 * 1024 * 1024));
                }

                // Get storage max size (from server settings or default local-lvm if not set)
                const mainStorageName = server.mainDiskStorage || 'local-lvm';
                const storages = await proxmox.getStorages(vps.node);
                const targetStorage = storages.find((s: any) => s.storage === mainStorageName);
                
                if (targetStorage && targetStorage.avail) {
                  maxSpecs.disk = Math.floor(targetStorage.avail / (1024 * 1024 * 1024));
                }
              } catch (e: any) {
                console.warn(`[API] Failed to get node max specs: ${e.message}`);
              }
          }
      }
    } catch (error: any) {
      if (error && error.message && !error.message.includes("does not exist")) {
        console.warn("[API] Failed to get live VM status:", error.message);
      }
    }

    // Check IP pools availability
    const ipv4PoolsCount = await prisma.ipPool.count({ where: { version: 4, type: "PUBLIC" } });
    const ipv6PoolsCount = await prisma.ipPool.count({ where: { version: 6, type: "PUBLIC" } });

    // Fetch pricing for UI calculation
    const pricingItems = await prisma.vpsPricing.findMany();
    const pricing: Record<string, number> = {};
    pricingItems.forEach(item => {
      pricing[item.key] = item.pricePerHour;
    });

    return NextResponse.json({ 
      vps, 
      liveStatus,
      allowedAddonStorages,
      addonDisks,
      maxSpecs,
      hasIpv4Pool: ipv4PoolsCount > 0,
      hasIpv6Pool: ipv6PoolsCount > 0,
      pricing
    });
  } catch (error) {
    console.error("GET VPS detail error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const userId = auth.userId!;
    const user = auth.user!;

    const { id } = await params;
    
    const parsedId = parseInt(id);
    if (isNaN(parsedId)) {
      return NextResponse.json({ error: "Invalid VPS ID" }, { status: 400 });
    }
    
    const whereClause: any = { id: parsedId };
    if (user?.role !== "ADMIN") {
        whereClause.userId = userId;
    }

    const vps = await prisma.vpsService.findFirst({
      where: whereClause,
      include: {
        assignedIps: true
      }
    });

    if (!vps) {
      return NextResponse.json({ error: "VPS not found" }, { status: 404 });
    }

    if (vps.status === "TERMINATED" || vps.status === "TERMINATING") {
      return NextResponse.json({ error: "VPS is already terminated or being terminated" }, { status: 400 });
    }

    if (vps.vpcId || vps.vpcIp) {
      return NextResponse.json({ error: "Cannot delete VPS while it is attached to a VPC. Please detach the private IP first." }, { status: 400 });
    }

    // SECURITY: Unconditional Atomic Lock to prevent double-termination race conditions
    const lockResult = await prisma.vpsService.updateMany({
      where: { id: vps.id, status: { notIn: ['TERMINATED', 'TERMINATING'] } },
      data: { status: 'TERMINATING' }
    });
    if (lockResult.count === 0) {
      return NextResponse.json({ error: "VPS is already being terminated by another process." }, { status: 409 });
    }

    // 1. Finalize PAYG Billing — balance was already deducted every hour by cron,
    //    so we just finalize the running invoice (no additional charge needed).
    {
      // Find and finalize the running invoice
      const runningInvoice = await prisma.invoice.findFirst({
        where: { vpsServiceId: vps.id, reference: 'PAYG_RUNNING', type: 'VPS' },
        orderBy: { createdAt: 'desc' }
      });
      if (runningInvoice) {
        await prisma.invoice.update({
          where: { id: runningInvoice.id },
          data: { reference: 'PAYG_COMPLETED' }
        });
      }
    }

    // 2. Free IP Addresses and Detach Reserved IPs
    for (const ip of vps.assignedIps) {
      await prisma.vpsIpAssignment.delete({ where: { id: ip.id } });
    }
    
    // Detach reserved IPs so they remain owned and billed to the user
    await prisma.reservedIp.updateMany({
      where: { vpsId: vps.id },
      data: { isAttached: false, vpsId: null }
    });

    // 3. Delete VM in Proxmox
    if (vps.vmid) {
      try {
        const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
        if (server) {
          const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
          // Make sure it's stopped before deleting
          try {
            await proxmox.stopVm(vps.node, vps.vmid);
            // wait a little bit for it to stop
            await new Promise(r => setTimeout(r, 2000));
          } catch(e) {
            console.log("Failed to stop VM or it was already stopped");
          }
          await proxmox.deleteVm(vps.node, vps.vmid);
        }
      } catch (e) {
        console.error("Failed to delete VM in Proxmox", e);
      }
    }

    // 4. Mark as TERMINATED
    await prisma.vpsService.update({
      where: { id: vps.id },
      data: { status: "TERMINATED", vmid: null, vpcIp: null, vpcId: null } // Clear vmid, vpcIp, and vpcId so they can be reused
    });

    return NextResponse.json({ success: true, message: "VPS Terminated successfully" });
  } catch (error) {
    console.error("DELETE VPS error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
