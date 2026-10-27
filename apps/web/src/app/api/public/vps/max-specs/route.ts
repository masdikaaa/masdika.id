import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";
import { getBandwidthOptions } from "@/lib/vps-bandwidth";

export const dynamic = 'force-dynamic'; // Disable cache to ensure real-time storage availability

export async function GET() {
  try {
    let maxSpecs: Record<string, number> = { cpu: 16, ram: 64, diskHdd: 1000, diskSsd: 500, backup: 500 };
    const bandwidthOptions = await getBandwidthOptions();
    
    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (server) {
      const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
      let activeNode = "proxmox";
      try {
         const nodes = await proxmox.getNodes();
         if (nodes && nodes.length > 0) {
            activeNode = nodes[0].node;
         }
      } catch (e) {
         console.warn("Failed to list nodes, falling back to default node 'proxmox'");
      }
      
      const nodeStatus = await proxmox.getNodeStatus(activeNode);
      if (nodeStatus && nodeStatus.memory && nodeStatus.cpuinfo) {
        maxSpecs.cpu = nodeStatus.cpuinfo.cpus;
        maxSpecs.ram = Math.floor(nodeStatus.memory.total / (1024 * 1024 * 1024));
      }

      const mainStorageName = server.mainDiskStorage || 'local-lvm';
      const mainStorageSsdName = server.mainDiskStorageSsd || mainStorageName;
      
      const storages = await proxmox.getStorages(activeNode);
      const targetStorage = storages.find((s: any) => s.storage === mainStorageName);
      const targetStorageSsd = storages.find((s: any) => s.storage === mainStorageSsdName);
      
      if (targetStorage && targetStorage.avail) {
        maxSpecs.diskHdd = Math.floor(targetStorage.avail / (1024 * 1024 * 1024));
      }
      if (targetStorageSsd && targetStorageSsd.avail) {
        maxSpecs.diskSsd = Math.floor(targetStorageSsd.avail / (1024 * 1024 * 1024));
      }

      const backupStorageName = server.backupStorage;
      if (backupStorageName) {
        const backupTarget = storages.find((s: any) => s.storage === backupStorageName);
        if (backupTarget && backupTarget.avail) {
          maxSpecs.backup = Math.floor(backupTarget.avail / (1024 * 1024 * 1024));
        }
      }
    }

    return NextResponse.json({ maxSpecs, bandwidthOptions });
  } catch (error) {
    return NextResponse.json({ 
      maxSpecs: { cpu: 16, ram: 64, diskHdd: 1000, diskSsd: 500, backup: 500 },
      bandwidthOptions: [100, 150, 200, 250, 300]
    });
  }
}
