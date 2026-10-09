import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";
import { VpsProvisioningService } from '@/lib/vps-provisioning';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    const user = authResult.user!;

    const { id } = await params;
    const reservedIpId = parseInt(id);

    // 1. Verify Reserved IP
    const reservedIp = await prisma.reservedIp.findFirst({
      where: { id: reservedIpId, userId: user.id },
      include: { ipPool: true }
    });

    if (!reservedIp || !reservedIp.isAttached || !reservedIp.vpsId) {
      return NextResponse.json({ error: "Reserved IP is not currently attached to a VPS" }, { status: 400 });
    }

    const vps = await prisma.vpsService.findFirst({
      where: { id: reservedIp.vpsId, userId: user.id },
      include: { assignedIps: { include: { ipPool: true } } }
    });

    if (!vps) {
       // Just detach it if VPS is already deleted
       await prisma.reservedIp.update({
         where: { id: reservedIp.id },
         data: { isAttached: false, vpsId: null }
       });
       return NextResponse.json({ success: true, message: "IP detached successfully." });
    }

    if (vps.status === "TERMINATED") {
       await prisma.reservedIp.update({
         where: { id: reservedIp.id },
         data: { isAttached: false, vpsId: null }
       });
       return NextResponse.json({ success: true, message: "IP detached from terminated VPS." });
    }

    if (vps.status === "SUSPENDED") {
      return NextResponse.json({ error: "Cannot detach IP from a suspended VPS" }, { status: 400 });
    }

    const oldIpAssignment = vps.assignedIps.find(a => a.ipAddress === reservedIp.ipAddress);

    // Fetch pricing to add back standard IP cost
    const pricingItems = await prisma.vpsPricing.findMany();
    const pricing: Record<string, number> = {};
    pricingItems.forEach(item => {
      pricing[item.key] = item.pricePerHour;
    });

    const ipVersion = reservedIp.ipPool.version;
    const pricePerHour = ipVersion === 4 ? (pricing.ipv4 || 0) : (pricing.ipv6 || 0);

    // Allocate a new public IP from the same version pool
    const pool = await prisma.ipPool.findFirst({ where: { version: ipVersion, type: 'PUBLIC' } });
    if (!pool) {
       return NextResponse.json({ error: "No public IP pool available to reassign standard IP." }, { status: 500 });
    }

    let newIpAddress = "";
    try {
      newIpAddress = await VpsProvisioningService.allocateIp(pool.id);
    } catch (e: any) {
      return NextResponse.json({ error: "Failed to allocate new standard IP for the VPS." }, { status: 500 });
    }

    // Run transaction
    await prisma.$transaction(async (tx) => {
      if (oldIpAssignment) {
        await tx.vpsIpAssignment.delete({
          where: { id: oldIpAssignment.id }
        });
      }

      await tx.vpsIpAssignment.create({
        data: {
          vpsId: vps.id,
          ipPoolId: pool.id,
          ipAddress: newIpAddress,
          isPrimary: true
        }
      });

      await tx.reservedIp.update({
        where: { id: reservedIp.id },
        data: {
          isAttached: false,
          vpsId: null
        }
      });

      // We add the cost of the new standard IP to the VPS billing
      if (pricePerHour > 0) {
        await tx.vpsService.update({
          where: { id: vps.id },
          data: {
            hourlyRate: { increment: pricePerHour },
            stoppedRate: { increment: pricePerHour }
          }
        });
      }
    });

    // Proxmox config
    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (server && vps.node && vps.vmid) {
      try {
        const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
        const vmConfig = await proxmox.getVmConfig(vps.node, vps.vmid);

        let targetNetIndex = -1;
        for (let i = 0; i <= 31; i++) {
           const ipconfig = vmConfig[`ipconfig${i}`];
           if (ipconfig && ipconfig.includes(`ip=${reservedIp.ipAddress}/`)) {
              targetNetIndex = i;
              break;
           }
        }

        if (targetNetIndex !== -1) {
           const cidrSuffix = pool.network.split('/')[1] || (ipVersion === 4 ? '24' : '64');
           const ipKey = ipVersion === 4 ? 'ip' : 'ip6';
           const gwKey = ipVersion === 4 ? 'gw' : 'gw6';
           
           await proxmox.configVm(vps.node, vps.vmid, {
              [`ipconfig${targetNetIndex}`]: `${ipKey}=${newIpAddress}/${cidrSuffix},${gwKey}=${pool.gateway}`
           });
        }
      } catch (proxmoxError) {
         console.error("Proxmox detached IP assignment failed:", proxmoxError);
         // Don't fail the request since DB is already updated
      }
    }

    return NextResponse.json({ success: true, message: "IP detached successfully. New dynamic IP assigned." });

  } catch (error: any) {
    console.error("Detach Reserved IP Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
