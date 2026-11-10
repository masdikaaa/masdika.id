import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";
import { calculateMinimumBaseVpsRate } from "@/lib/vps-billing-rate";
import { bandwidthToProxmoxRate, BASE_BANDWIDTH_MBPS } from "@/lib/vps-bandwidth";
import { syncVpsAppUrlsWithPublicIp } from "@/lib/vps-app-urls";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    const user = authResult.user!;

    const { id } = await params;
    const reservedIpId = Number(id);
    if (!Number.isSafeInteger(reservedIpId) || reservedIpId <= 0) {
      return NextResponse.json({ error: "Invalid Reserved IP ID" }, { status: 400 });
    }

    const body = await req.json();
    const vpsId = Number(body?.vpsId);

    if (!Number.isSafeInteger(vpsId) || vpsId <= 0) {
      return NextResponse.json({ error: "Valid VPS ID is required" }, { status: 400 });
    }

    // 1. Verify Reserved IP
    const reservedIp = await prisma.reservedIp.findFirst({
      where: { id: reservedIpId, userId: user.id },
      include: { ipPool: true }
    });

    if (!reservedIp) {
      return NextResponse.json({ error: "Reserved IP not found" }, { status: 404 });
    }

    if (reservedIp.isAttached) {
      return NextResponse.json({ error: "Reserved IP is already attached to a service" }, { status: 400 });
    }

    // 2. Verify VPS
    const vps = await prisma.vpsService.findFirst({
      where: { id: vpsId, userId: user.id },
      include: { assignedIps: { include: { ipPool: true } } }
    });

    if (!vps) {
      return NextResponse.json({ error: "VPS not found" }, { status: 404 });
    }

    if (vps.isReseller) {
      return NextResponse.json({ error: "Attaching Reserved IPs is not supported on fixed-plan Reseller instances" }, { status: 403 });
    }

    if (vps.status === "TERMINATED" || vps.status === "SUSPENDED" || vps.status === "PROVISIONING") {
      return NextResponse.json({ error: `Cannot attach IP while VPS is ${vps.status}` }, { status: 400 });
    }

    const ipVersion = reservedIp.ipPool.version;

    // 3. Handle existing primary IP of the SAME version
    const existingPrimaryIp = vps.assignedIps.find(a => a.isPrimary && a.ipPool.version === ipVersion);
    
    // Fetch pricing to adjust billing if a standard dynamic IP is removed
    const pricingItems = await prisma.vpsPricing.findMany();
    const pricing: Record<string, number> = {};
    pricingItems.forEach(item => {
      pricing[item.key] = item.pricePerHour;
    });

    const pricePerHour = ipVersion === 4 ? (pricing.ipv4 || 0) : (pricing.ipv6 || 0);
    const minBaseRate = calculateMinimumBaseVpsRate(vps, pricing);

    // Atomic transaction preventing concurrent attach/delete and preventing double-discounting if existingPrimaryIp was also a ReservedIp
    try {
      await prisma.$transaction(async (tx) => {
        const claimed = await tx.reservedIp.updateMany({
          where: { id: reservedIp.id, userId: user.id, isAttached: false },
          data: {
            isAttached: true,
            vpsId: vps.id
          }
        });
        if (claimed.count === 0) {
          throw new Error("RESERVED_IP_BUSY");
        }

        let hourlyDeduction = 0;

        if (existingPrimaryIp) {
          const oldReserved = await tx.reservedIp.findFirst({
            where: { ipAddress: existingPrimaryIp.ipAddress }
          });

          await tx.vpsIpAssignment.deleteMany({
            where: { id: existingPrimaryIp.id, vpsId: vps.id }
          });

          if (oldReserved) {
            await tx.reservedIp.update({
              where: { id: oldReserved.id },
              data: { isAttached: false, vpsId: null }
            });
          } else {
            // Only subtract dynamic IP rate when replacing a non-Reserved dynamic IP
            hourlyDeduction = pricePerHour;
          }
        }

        await tx.vpsIpAssignment.create({
          data: {
            vpsId: vps.id,
            ipPoolId: reservedIp.ipPoolId,
            ipAddress: reservedIp.ipAddress,
            publicIp: reservedIp.publicIp,
            isPrimary: true
          }
        });

        if (hourlyDeduction > 0) {
          const currentVps = await tx.vpsService.findUnique({ where: { id: vps.id } });
          if (currentVps) {
            const newHourlyRate = Math.max(minBaseRate, currentVps.hourlyRate - hourlyDeduction);
            await tx.vpsService.update({
              where: { id: vps.id },
              data: {
                hourlyRate: newHourlyRate,
                stoppedRate: newHourlyRate
              }
            });
          }
        }
      });
    } catch (txErr: any) {
      if (txErr.message === "RESERVED_IP_BUSY") {
        return NextResponse.json({ error: "Reserved IP is already attached or modified concurrently" }, { status: 409 });
      }
      throw txErr;
    }

    // Update VPS application web access URLs to point to the newly attached IP
    const targetAttachedIp = reservedIp.publicIp?.trim() || reservedIp.ipAddress;
    await syncVpsAppUrlsWithPublicIp(prisma, vps.id, targetAttachedIp, [existingPrimaryIp?.publicIp, existingPrimaryIp?.ipAddress]);

    // Fetch updated VPS to get ALL its current IPs in order (so we can calculate net0, net2 properly)
    const updatedVps = await prisma.vpsService.findUnique({
      where: { id: vps.id },
      include: { assignedIps: { include: { ipPool: true }, orderBy: { id: 'asc' } } }
    });

    // 4. Update Proxmox configuration
    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) {
      console.error("No active Proxmox server configured");
      return NextResponse.json({ 
        success: true, 
        message: "Reserved IP attached successfully in database, but Proxmox server is unavailable. Please check backend."
      });
    }

    const proxmox = new ProxmoxClient(
      server.host,
      server.tokenId,
      server.tokenSecret
    );

    const config: Record<string, string> = {};
    const netAssignments: Array<{ netIndex: number; ipAddress: string; version: number }> = [];
    let netIndex = 0;
    const rateMBs = bandwidthToProxmoxRate(vps.bandwidthMbps || BASE_BANDWIDTH_MBPS);
    
    // Rebuild the cloud-init network config preserving bandwidth rate limits and IP anti-spoofing filters
    for (let i = 0; i < updatedVps!.assignedIps.length; i++) {
      if (netIndex === 1 && vps.vpcId) {
        // Reserve net1 strictly for VPC
        netIndex++;
      }
      
      const assignment = updatedVps!.assignedIps[i];
      const version = assignment.ipPool.version;
      const cidrSuffix = assignment.ipPool.network.split('/')[1] || (version === 4 ? '24' : '64');
      const ipKey = version === 4 ? 'ip' : 'ip6';
      const gwKey = version === 4 ? 'gw' : 'gw6';
      
      const bridgeToUse = assignment.ipPool.type === 'PUBLIC' && server.publicNetworkBridge
        ? server.publicNetworkBridge
        : vps.networkBridge;

      config[`net${netIndex}`] = `model=virtio,bridge=${bridgeToUse},rate=${rateMBs}`;
      config[`ipconfig${netIndex}`] = `${ipKey}=${assignment.ipAddress}/${cidrSuffix},${gwKey}=${assignment.ipPool.gateway}`;
      netAssignments.push({ netIndex, ipAddress: assignment.ipAddress, version });
      netIndex++;
    }

    try {
      await proxmox.configVm(vps.node, vps.vmid!, config);
      for (const item of netAssignments) {
        const ipSetName = `ipfilter-net${item.netIndex}`;
        const mask = item.version === 4 ? "32" : "128";
        await proxmox.createFirewallIpSet(vps.node, vps.vmid!, ipSetName, `Allowed IPs for net${item.netIndex}`).catch(() => {});
        await proxmox.addIpToFirewallIpSet(vps.node, vps.vmid!, `${item.ipAddress}/${mask}`, ipSetName, "Assigned IP").catch(() => {});
      }
    } catch (err: any) {
      console.error(`Failed to update Proxmox network config for VMID ${vps.vmid}:`, err);
      return NextResponse.json({ error: "Failed to update VM configuration in Proxmox. IP is attached in DB." }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      requiresReboot: true,
      message: "IP attached successfully! Please restart (reboot) your VPS from the dashboard to apply the new IP address."
    });

  } catch (error: any) {
    console.error("Attach Reserved IP error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
