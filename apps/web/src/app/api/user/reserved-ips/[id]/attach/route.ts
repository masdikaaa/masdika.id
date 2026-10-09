import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    const user = authResult.user!;

    const { id } = await params;
    const reservedIpId = parseInt(id);
    const body = await req.json();
    const { vpsId } = body;

    if (!vpsId) {
      return NextResponse.json({ error: "VPS ID is required" }, { status: 400 });
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

    if (vps.status === "TERMINATED" || vps.status === "SUSPENDED") {
      return NextResponse.json({ error: "Cannot attach IP to a terminated or suspended VPS" }, { status: 400 });
    }

    const ipVersion = reservedIp.ipPool.version;

    // 3. Handle existing primary IP of the SAME version
    const existingPrimaryIp = vps.assignedIps.find(a => a.isPrimary && a.ipPool.version === ipVersion);
    
    // Fetch pricing to adjust billing if an IP is removed
    const pricingItems = await prisma.vpsPricing.findMany();
    const pricing: Record<string, number> = {};
    pricingItems.forEach(item => {
      pricing[item.key] = item.pricePerHour;
    });

    const pricePerHour = ipVersion === 4 ? (pricing.ipv4 || 0) : (pricing.ipv6 || 0);

    // We will use a transaction to ensure database consistency
    await prisma.$transaction(async (tx) => {
      let hourlyDeduction = 0;

      if (existingPrimaryIp) {
        // Delete the existing primary IP assignment to free it
        await tx.vpsIpAssignment.delete({
          where: { id: existingPrimaryIp.id }
        });
        
        hourlyDeduction = pricePerHour;
      }

      // Create new assignment for the reserved IP
      await tx.vpsIpAssignment.create({
        data: {
          vpsId: vps.id,
          ipPoolId: reservedIp.ipPoolId,
          ipAddress: reservedIp.ipAddress,
          publicIp: reservedIp.publicIp,
          isPrimary: true
        }
      });

      // Mark reserved IP as attached
      await tx.reservedIp.update({
        where: { id: reservedIp.id },
        data: {
          isAttached: true,
          vpsId: vps.id
        }
      });

      // Deduct the cost of the removed IP from VPS billing
      if (hourlyDeduction > 0) {
        const newHourlyRate = Math.max(0, vps.hourlyRate - hourlyDeduction);
        const newStoppedRate = Math.max(0, (vps.stoppedRate || 0) - hourlyDeduction);

        await tx.vpsService.update({
          where: { id: vps.id },
          data: {
            hourlyRate: newHourlyRate,
            stoppedRate: newStoppedRate
          }
        });
      }
    });

    // Fetch updated VPS to get ALL its current IPs in order (so we can calculate net0, net2 properly)
    const updatedVps = await prisma.vpsService.findUnique({
      where: { id: vps.id },
      include: { assignedIps: { include: { ipPool: true }, orderBy: { id: 'asc' } } }
    });

    // 4. Update Proxmox configuration
    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) {
      console.error("No active Proxmox server configured");
      // DB updated successfully, just proxmox is unavailable
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
    let netIndex = 0;
    
    // Rebuild the cloud-init network config exactly like the provisioner does
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

      config[`net${netIndex}`] = `model=virtio,bridge=${bridgeToUse},firewall=1`;
      config[`ipconfig${netIndex}`] = `${ipKey}=${assignment.ipAddress}/${cidrSuffix},${gwKey}=${assignment.ipPool.gateway}`;
      netIndex++;
    }

    try {
      await proxmox.configVm(vps.node, vps.vmid!, config);
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
