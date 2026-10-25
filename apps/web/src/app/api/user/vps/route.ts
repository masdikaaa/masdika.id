import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";
import { requireAuth } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user!;

    const isResellerParam = req.nextUrl.searchParams.get("isReseller");
    const isReseller = isResellerParam === "true";

    // 1. Fetch user's VPS from DB (excluding sensitive credential fields)
    const vpsList = await prisma.vpsService.findMany({
      where: {
        userId: Number(user.id),
        kubernetesClusterId: null,
        status: { not: 'TERMINATED' },
        isReseller: isReseller,
      },
      select: {
        id: true, userId: true, hostname: true, username: true, status: true,
        node: true, vmid: true, cpuCores: true, ramGb: true, diskGb: true,
        backupGb: true, backupSchedule: true, networkBridge: true, storageId: true,
        hourlyRate: true, accumulatedCost: true,
        expiresAt: true, createdAt: true, updatedAt: true, suspendReason: true,
        osTemplate: true, vpcId: true, vpcIp: true, autoRenew: true,
        kubernetesClusterId: true, kubernetesRole: true,
        diskType: true,
        assignedIps: true,
        // rootPassword and sshKey intentionally excluded
      },
      orderBy: { createdAt: "desc" },
    });

    if (vpsList.length === 0) {
      return NextResponse.json([]);
    }

    // 2. Fetch live status from Proxmox
    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });

    if (server) {
      const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);

      // Update the status dynamically for the UI
      await Promise.all(vpsList.map(async (vps) => {
        if (vps.vmid) {
          try {
            const status = await proxmox.getVmStatus(vps.node, vps.vmid);
            // status contains: status, maxmem, mem, maxdisk, disk, uptime, cpu, cpus, maxcpu, netin, netout
            (vps as any).liveStatus = status;
          } catch (e) {
            console.error(`Failed to fetch status for VMID ${vps.vmid}`);
          }
        }
      }));
    }

    return NextResponse.json(vpsList);
  } catch (error) {
    console.error("GET user VPS error:", error);
    return NextResponse.json({ error: "Failed to fetch VPS list" }, { status: 500 });
  }
}
