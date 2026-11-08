import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { ProxmoxClient } from "@/lib/proxmox";
import { mikrotikMutex } from "@/lib/mikrotik";
import { Address4 } from "ip-address";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const releaseMutex = await mikrotikMutex.acquire();
  try {
    const params = await props.params;
    const auth = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) {
      return NextResponse.json({ error: "No active Proxmox server configured" }, { status: 500 });
    }
    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);

    const vpcId = parseInt(params.id, 10);
    if (isNaN(vpcId)) {
      return NextResponse.json({ error: "Invalid VPC ID" }, { status: 400 });
    }
    const body = await req.json();
    const { vpsId, privateIpAddress } = body;

    const parsedVpsId = parseInt(String(vpsId), 10);
    if (!vpsId || isNaN(parsedVpsId)) {
      return NextResponse.json({ error: "VPS ID is required" }, { status: 400 });
    }
    if (privateIpAddress !== undefined && privateIpAddress !== null && typeof privateIpAddress !== "string") {
      return NextResponse.json({ error: "Invalid Private IP format" }, { status: 400 });
    }

    // 1. Verify VPC
    const vpc = await prisma.vpcNetwork.findUnique({
      where: { id: vpcId, userId: auth.userId! },
      include: { router: true }
    });
    if (!vpc) {
      return NextResponse.json({ error: "VPC not found" }, { status: 404 });
    }
    if (!vpc.router) {
      return NextResponse.json({ error: "VPC router is not available" }, { status: 500 });
    }

    // 2. Verify VPS
    const vps = await prisma.vpsService.findUnique({
      where: { id: parsedVpsId, userId: auth.userId! },
      include: { assignedIps: true }
    });
    if (!vps) {
      return NextResponse.json({ error: "VPS not found" }, { status: 404 });
    }
    if (vps.status === "SUSPENDED" || vps.status === "TERMINATED" || vps.status === "TERMINATING" || vps.status === "PROVISIONING") {
      return NextResponse.json({ error: `Cannot attach VPC while VPS is ${vps.status}.` }, { status: 403 });
    }
    if (vps.vpcId) {
      return NextResponse.json({ error: "VPS is already attached to a VPC" }, { status: 400 });
    }

    // 2.5 Verify VPS is Powered Off
    try {
      const vmStatus = await proxmox.getVmStatus(vps.node, vps.vmid!);
      if (vmStatus.status !== "stopped") {
        return NextResponse.json({ error: "VM must be powered off (STOPPED) before it can be attached to the VPC." }, { status: 400 });
      }
    } catch (err: any) {
      console.warn("Could not fetch VM status, assuming it might be offline:", err);
      return NextResponse.json({ error: "Failed to verify VM power state from Proxmox." }, { status: 500 });
    }

    // 3. IP Allocation Logic (strict Address4 subnet & host validation)
    const vpcSubnet = new Address4(vpc.cidr);
    const networkIp = vpcSubnet.startAddress().addressMinusSuffix;
    const broadcastIp = vpcSubnet.endAddress().addressMinusSuffix;

    const existingVpsInVpc = await prisma.vpsService.findMany({
      where: { vpcId: vpc.id },
      select: { vpcIp: true }
    });
    const usedIps = new Set(existingVpsInVpc.map(v => v.vpcIp).filter(Boolean));
    usedIps.add(vpc.gateway!);
    usedIps.add(networkIp);
    usedIps.add(broadcastIp);

    let allocatedVpcIp = typeof privateIpAddress === "string" ? privateIpAddress.trim() : "";

    if (allocatedVpcIp) {
      if (allocatedVpcIp.includes("/") || !/^(?:\d{1,3}\.){3}\d{1,3}$/.test(allocatedVpcIp)) {
        return NextResponse.json({ error: "Invalid Private IPv4 address format." }, { status: 400 });
      }

      let parsedCandidate: Address4;
      try {
        parsedCandidate = new Address4(allocatedVpcIp);
      } catch {
        return NextResponse.json({ error: "Invalid Private IPv4 address." }, { status: 400 });
      }

      const canonicalIp = parsedCandidate.addressMinusSuffix;
      if (!parsedCandidate.isInSubnet(vpcSubnet)) {
        return NextResponse.json({ error: `Requested Private IP ${canonicalIp} is outside the VPC subnet (${vpc.cidr}).` }, { status: 400 });
      }
      if (canonicalIp === networkIp || canonicalIp === broadcastIp) {
        return NextResponse.json({ error: `Requested Private IP ${canonicalIp} is a reserved network or broadcast address.` }, { status: 400 });
      }
      if (usedIps.has(canonicalIp)) {
        return NextResponse.json({ error: `Requested Private IP ${canonicalIp} is already in use in this VPC.` }, { status: 400 });
      }
      allocatedVpcIp = canonicalIp;
    } else {
      // Auto Allocate within usable subnet host range
      const startBig = BigInt(vpcSubnet.startAddressExclusive().bigInt().toString());
      const endBig = BigInt(vpcSubnet.endAddressExclusive().bigInt().toString());
      const maxProbe = startBig + BigInt(1024) < endBig ? startBig + BigInt(1024) : endBig;

      for (let curr = startBig; curr <= maxProbe; curr++) {
        const candidate = Address4.fromBigInt(curr).addressMinusSuffix;
        if (!usedIps.has(candidate)) {
          allocatedVpcIp = candidate;
          break;
        }
      }
      if (!allocatedVpcIp) {
        return NextResponse.json({ error: "No available IPs in this VPC." }, { status: 409 });
      }
    }

    // 4. Determine next available net index from Proxmox Config
    let netIndex = 1; // Default
    try {
      const vmConfig = await proxmox.getVmConfig(vps.node, vps.vmid!);
      for (let i = 0; i < 10; i++) {
        if (!vmConfig[`net${i}`]) {
          netIndex = i;
          break;
        }
      }
    } catch (e) {
      console.warn("Could not fetch VM config, defaulting to netIndex based on assignedIps count", e);
      netIndex = vps.assignedIps.length || 1;
    }

    // 5. Update Proxmox Config
    const cidrSuffix = vpc.cidr.split('/')[1] || '24';
    const speedMbps = vps.bandwidthMbps || 100;
    const config: any = {};
    config[`net${netIndex}`] = `model=virtio,bridge=${vpc.router.proxmoxBridge},tag=${vpc.vlanId},rate=${speedMbps}`;

    // If VM has no public IPs, VPC must be the gateway
    if (vps.assignedIps.length === 0) {
      config[`ipconfig${netIndex}`] = `ip=${allocatedVpcIp}/${cidrSuffix},gw=${vpc.gateway}`;
    } else {
      config[`ipconfig${netIndex}`] = `ip=${allocatedVpcIp}/${cidrSuffix}`;
    }

    try {
      await proxmox.configVm(vps.node, vps.vmid!, config);
    } catch (err: any) {
      console.error("Failed to attach VPC network to Proxmox VM:", err);
      return NextResponse.json({ error: "Failed to configure network on hypervisor" }, { status: 500 });
    }

    // 6. Apply VPC Auto-Firewall Rule
    try {
      await proxmox.updateFirewallOptions(vps.node, vps.vmid!, { enable: 1 });
      await proxmox.createFirewallRule(vps.node, vps.vmid!, {
        type: 'in',
        action: 'ACCEPT',
        source: vpc.cidr,
        enable: 1,
        comment: `Allow internal VPC ${vpc.name} traffic`
      });
      // Explicitly allow ICMP for ping since Proxmox might default omitted proto to TCP
      await proxmox.createFirewallRule(vps.node, vps.vmid!, {
        type: 'in',
        action: 'ACCEPT',
        source: vpc.cidr,
        proto: 'icmp',
        enable: 1,
        comment: `Allow internal VPC ${vpc.name} ICMP (Ping)`
      });
    } catch (err: any) {
      console.error("Failed to apply VPC firewall rule:", err);
      // Don't fail the whole request, but log it
    }

    // 7. Update Database
    await prisma.vpsService.update({
      where: { id: vps.id },
      data: { vpcId: vpc.id, vpcIp: allocatedVpcIp }
    });

    await prisma.vpcNetwork.update({
      where: { id: vpc.id },
      data: { lastUsedAt: new Date() }
    });

    return NextResponse.json({ success: true, message: "VM attached to VPC successfully. Please restart the VM from the panel for the network changes to take effect." });
  } catch (error) {
    console.error("VPC Attach Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  } finally {
    releaseMutex();
  }
}
