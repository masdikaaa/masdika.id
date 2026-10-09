import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { VpsProvisioningService } from "@/lib/vps-provisioning";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    const user = authResult.user!;

    const { id } = await params;
    const vpsId = parseInt(id);

    const vps = await prisma.vpsService.findFirst({
      where: { id: vpsId, userId: user.id },
      include: { assignedIps: true }
    });

    if (!vps) {
      return NextResponse.json({ error: "VPS not found" }, { status: 404 });
    }
    
    if (vps.status === 'SUSPENDED' || vps.status === 'TERMINATED') {
      return NextResponse.json({ error: "VPS is suspended or terminated. Reserving an IP is not allowed." }, { status: 403 });
    }

    // Get IP pricing
    const pricingItems = await prisma.vpsPricing.findMany();
    let ipPricePerHour = 0;
    const ipPricing = pricingItems.find(p => p.key === 'ipv4');
    if (ipPricing) {
      ipPricePerHour = ipPricing.pricePerHour;
    }



    const body = await req.json().catch(() => ({}));
    const { ipAddress } = body;

    if (!ipAddress) {
      return NextResponse.json({ error: "No IP address selected." }, { status: 400 });
    }

    // Verify IP is in a public IPv4 pool
    const pools = await prisma.ipPool.findMany({
      where: { version: 4, type: "PUBLIC" }
    });

    let targetPoolId: number | null = null;
    const ipToNum = (parts: number[]) => 
      (parts[0] * Math.pow(2, 24)) + 
      (parts[1] * Math.pow(2, 16)) + 
      (parts[2] * Math.pow(2, 8)) + 
      parts[3];
    const candidateParts = ipAddress.split('.').map(Number);
    if (candidateParts.length === 4) {
      const candidateNum = ipToNum(candidateParts);

      for (const pool of pools) {
        if (!pool.startIp || !pool.endIp) continue;
        if (ipAddress === pool.gateway) continue;

        const startNum = ipToNum(pool.startIp.split('.').map(Number));
        const endNum = ipToNum(pool.endIp.split('.').map(Number));

        if (candidateNum >= startNum && candidateNum <= endNum) {
          targetPoolId = pool.id;
          break;
        }
      }
    }

    if (!targetPoolId) {
      return NextResponse.json({ error: "Invalid IP address or out of range." }, { status: 400 });
    }

    // Prevent abuse: require at least enough balance to cover the first hour of the new IP
    if (user.balance < ipPricePerHour) {
      return NextResponse.json({ error: "Insufficient balance to reserve this IP. Please top up your account." }, { status: 400 });
    }

    // Transaction to assign IP and deduct balance
    try {
      await prisma.$transaction(async (tx) => {
        // SECURITY: Lock VPS state atomically to prevent concurrent Proxmox network reconfigurations
        const lockResult = await tx.vpsService.updateMany({
          where: { id: vps.id, status: vps.status },
          data: { status: 'PROVISIONING' }
        });

        if (lockResult.count === 0) {
          throw new Error("VPS_LOCKED");
        }

        // 1. Assign IP
        // If someone else already assigned this IP, this create will throw a Unique Constraint error 
        // due to @@unique([ipPoolId, ipAddress]) in schema.prisma.
        await tx.vpsIpAssignment.create({
          data: {
            vpsId: vps.id,
            ipPoolId: targetPoolId,
            ipAddress: ipAddress,
            isPrimary: vps.assignedIps.length === 0
          }
        });

      // 2. Update VPS Pricing to include the new IP
      await tx.vpsService.update({
        where: { id: vps.id },
        data: {
          hourlyRate: { increment: ipPricePerHour },
          stoppedRate: { increment: ipPricePerHour }
        }
      });
    });
    } catch (e: any) {
      if (e.message !== 'VPS_LOCKED') {
        // Unlock VPS state on failure
        await prisma.vpsService.update({
          where: { id: vps.id },
          data: { status: vps.status }
        });
      }

      if (e.message === 'VPS_LOCKED') {
        return NextResponse.json({ error: "VPS is currently being modified by another process. Please wait." }, { status: 409 });
      }

      if (e.code === 'P2002') {
        return NextResponse.json({ error: "The selected IP has already been reserved by someone else. Please choose another one." }, { status: 409 });
      }
      throw e;
    }

    // Attach Network Interface via Proxmox
    if (vps.vmid) {
      try {
        const { ProxmoxClient } = await import("@/lib/proxmox");
        const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
        if (server) {
          const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
          const vmConfig = await proxmox.getVmConfig(vps.node, vps.vmid);

          // Find the lowest available net interface
          const getNextAvailableNetIndex = () => {
              for (let i = 0; i < 32; i++) {
                  if (i === 1) continue; // Reserved strictly for VPC
                  if (vmConfig[`net${i}`] === undefined) {
                      return i;
                  }
              }
              return 31; // Fallback
          };
          const netIndex = getNextAvailableNetIndex();

          const pool = pools.find(p => p.id === targetPoolId);
          const cidrSuffix = pool?.network.split('/')[1] || '24';

          const bridgeToUse = pool?.type === 'PUBLIC' && server.publicNetworkBridge
            ? server.publicNetworkBridge
            : vps.networkBridge;

          const configToSet: any = {};
          configToSet[`net${netIndex}`] = `model=virtio,bridge=${bridgeToUse},firewall=1`;
          configToSet[`ipconfig${netIndex}`] = `ip=${ipAddress}/${cidrSuffix},gw=${pool?.gateway}`;

          console.log(`Attaching net${netIndex} to VMID ${vps.vmid}`);
          await proxmox.configVm(vps.node, vps.vmid, configToSet);

          // Set up IP Filter
          const ipSetName = `ipfilter-net${netIndex}`;
          await proxmox.createFirewallIpSet(vps.node, vps.vmid, ipSetName, `Allowed IPs for net${netIndex}`);
          await proxmox.addIpToFirewallIpSet(vps.node, vps.vmid, `${ipAddress}/32`, ipSetName, `Secondary IP`);
        }
      } catch (proxmoxErr) {
        console.error("Failed to attach IP to Proxmox VM:", proxmoxErr);
        // We log the error but don't fail the request since DB is updated.
      }
    }

    // Unlock VPS state
    await prisma.vpsService.update({
      where: { id: vps.id },
      data: { status: vps.status }
    });

    return NextResponse.json({ success: true, ipAddress });

  } catch (error: any) {
    console.error("Reserve IP Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
