import { NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user!;

    // Fetch active templates
    const templates = await prisma.vpsTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" }
    });

    // Fetch plans
    const url = new URL(req.url);
    const isResellerParam = url.searchParams.get("isReseller");
    const isReseller = isResellerParam === "true";

    const plans = await prisma.vpsPlan.findMany({
      where: { 
        isActive: true,
        isReseller: isReseller
      },
      orderBy: { order: "asc" }
    });

    // Fetch pricing
    const pricingItems = await prisma.vpsPricing.findMany();
    
    // Convert pricing array into an object for easier frontend use
    // e.g. { vcpu: 100, ram: 50, disk: 50, ipv4: 10, ipv6: 5 }
    const pricingMap: Record<string, number> = {};
    pricingItems.forEach(item => {
      pricingMap[item.key] = item.pricePerHour;
    });

    // Fetch dynamic max specs from Proxmox
    let maxSpecs: Record<string, number> = { cpu: 32, ram: 128, diskHdd: 2000, diskSsd: 1000, backup: 500 };
    try {
      const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
      if (server) {
        const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
        const node = "proxmox"; // TODO: If you have multiple nodes, you'd pick the active one. Assuming single node for now or fallback
        let activeNode = "proxmox";
        try {
           const nodes = await proxmox.getNodes();
           if (nodes && nodes.length > 0) {
              activeNode = nodes[0].node;
           }
        } catch (e) {
           console.warn("Failed to list nodes, falling back to default node 'proxmox'");
        }
        
        // Fetch node CPU and RAM
        const nodeStatus = await proxmox.getNodeStatus(activeNode);
        if (nodeStatus && nodeStatus.memory && nodeStatus.cpuinfo) {
          maxSpecs.cpu = nodeStatus.cpuinfo.cpus;
          maxSpecs.ram = Math.floor(nodeStatus.memory.total / (1024 * 1024 * 1024));
        }

        // Fetch storage free space (avail)
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
    } catch (e) {
      console.warn("Failed to get node max specs for order data", e);
    }

    // Check if IPv4 and IPv6 pools exist
    const ipv4PoolsCount = await prisma.ipPool.count({ where: { version: 4, type: "PUBLIC" } });
    const ipv6PoolsCount = await prisma.ipPool.count({ where: { version: 6, type: "PUBLIC" } });

    // Check if we need to force billing mode for K3s worker node
    const clusterIdStr = url.searchParams.get("cluster_id");
    let forcedBillingMode: string | null = null;
    
      if (clusterIdStr) {
      const clusterId = parseInt(clusterIdStr);
      if (!isNaN(clusterId)) {
        const cluster = await prisma.kubernetesCluster.findFirst({
          where: { id: clusterId, userId: user.id },
          include: { nodes: true }
        });
        
        if (cluster && cluster.nodes.length > 0) {
          // Find master or first node
          const masterNode = cluster.nodes.find((n: any) => n.kubernetesRole === 'MASTER') || cluster.nodes[0];
          forcedBillingMode = "PAYG";
        }
      }
    }

    // Fetch unattached Reserved IPs
    const unattachedReservedIps = await prisma.reservedIp.findMany({
      where: {
        userId: user.id,
        isAttached: false
      }
    });

    // Fetch VPCs
    const userVpcs = await prisma.vpcNetwork.findMany({
      where: { userId: user.id },
      include: {
        vpsServices: {
          where: { status: { notIn: ["TERMINATED", "TERMINATING"] } },
          select: { vpcIp: true }
        }
      },
      orderBy: { name: "asc" }
    });

    if (pricingMap.bandwidth === undefined) {
      pricingMap.bandwidth = 69;
    }

    return NextResponse.json({
      templates,
      plans,
      pricing: pricingMap,
      bandwidthOptions: [100, 150, 200, 250, 300],
      hasIpv4Pool: ipv4PoolsCount > 0,
      hasIpv6Pool: ipv6PoolsCount > 0,
      maxSpecs,
      forcedBillingMode,
      vpsEnabled: true,
      k3sEnabled: true,
      reservedIps: unattachedReservedIps,
      vpcs: userVpcs
    });
  } catch (error) {
    console.error("Order Data Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
