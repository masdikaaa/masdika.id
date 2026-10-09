import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { ProxmoxClient } from "@/lib/proxmox";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const auth = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) return NextResponse.json({ error: "No active Proxmox server configured" }, { status: 500 });
    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);

    const vpcId = parseInt(params.id);
    const body = await req.json();
    const { vpsId } = body;

    if (!vpsId) {
      return NextResponse.json({ error: "VPS ID is required" }, { status: 400 });
    }

    // 1. Verify VPC
    const vpc = await prisma.vpcNetwork.findUnique({
      where: { id: vpcId, userId: auth.userId! },
      include: { router: true }
    });
    if (!vpc) return NextResponse.json({ error: "VPC not found" }, { status: 404 });
    if (!vpc.router) return NextResponse.json({ error: "VPC router is not available" }, { status: 500 });

    // 2. Verify VPS
    const vps = await prisma.vpsService.findUnique({
      where: { id: parseInt(vpsId), userId: auth.userId!, vpcId: vpc.id }
    });
    if (!vps) return NextResponse.json({ error: "VPS not found or not attached to this VPC" }, { status: 404 });

    // 2.5 Verify VPS is Powered Off
    try {
      const vmStatus = await proxmox.getVmStatus(vps.node, vps.vmid!);
      if (vmStatus.status !== "stopped") {
        return NextResponse.json({ error: "VM must be powered off (STOPPED) before it can be detached from the VPC." }, { status: 400 });
      }
    } catch (err: any) {
      console.warn("Could not fetch VM status, assuming it might be offline:", err);
      // We can either block or let it pass if proxmox API is down. Safer to block to prevent inconsistency if the VM is actually running.
      return NextResponse.json({ error: "Failed to verify VM power state from Proxmox." }, { status: 500 });
    }

    // 3. Find and remove network interface from Proxmox Config
    try {
      const vmConfig = await proxmox.getVmConfig(vps.node, vps.vmid!);
      let netIndexToDelete = -1;
      
      for (let i = 0; i < 10; i++) {
        const netValue = vmConfig[`net${i}`];
        if (netValue) {
          // Look for bridge and tag to identify the VPC interface
          if (netValue.includes(`bridge=${vpc.router.proxmoxBridge}`) && netValue.includes(`tag=${vpc.vlanId}`)) {
            netIndexToDelete = i;
            break;
          }
        }
      }

      if (netIndexToDelete !== -1) {
        // Delete the interface from Proxmox. We also delete the ipconfig if it exists.
        const keysToDelete = [`net${netIndexToDelete}`];
        if (vmConfig[`ipconfig${netIndexToDelete}`]) {
            keysToDelete.push(`ipconfig${netIndexToDelete}`);
        }
        await proxmox.configVm(vps.node, vps.vmid!, { delete: keysToDelete.join(',') });
      }
    } catch (err: any) {
      console.warn("Could not delete VM network interface from Proxmox, maybe already deleted:", err);
      // We continue to update DB even if Proxmox fails (e.g. if node is offline, we still want to detach in UI)
    }

    // 3.5. Find and remove firewall rules related to VPC
    try {
      const fwRules = await proxmox.getFirewallRules(vps.node, vps.vmid!);
      
      const rulesToDelete = fwRules.filter((rule: any) => 
        rule.comment === `Allow internal VPC ${vpc.name} traffic` || 
        rule.comment === `Allow internal VPC ${vpc.name} ICMP (Ping)` ||
        (rule.comment && rule.comment.startsWith('Allow Peering VPC'))
      ).sort((a: any, b: any) => b.pos - a.pos);

      for (const rule of rulesToDelete) {
        await proxmox.deleteFirewallRule(vps.node, vps.vmid!, rule.pos);
      }
    } catch (err: any) {
      console.warn("Could not delete VPC firewall rules from Proxmox:", err);
    }

    // 4. Update Database
    await prisma.vpsService.update({
      where: { id: vps.id },
      data: { vpcId: null, vpcIp: null }
    });

    await prisma.vpcNetwork.update({
      where: { id: vpc.id },
      data: { lastUsedAt: new Date() }
    });

    return NextResponse.json({ success: true, message: "VM detached from VPC successfully." });
  } catch (error) {
    console.error("VPC Detach Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
