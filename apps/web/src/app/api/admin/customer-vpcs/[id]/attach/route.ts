import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { ProxmoxClient } from "@/lib/proxmox";
import { mikrotikMutex } from "@/lib/mikrotik";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const releaseMutex = await mikrotikMutex.acquire();
  try {
    const params = await props.params;
    const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const vpcId = parseInt(params.id);
    const body = await req.json();
    const { vpsId, privateIpAddress, forceDbOnly } = body;

    if (!vpsId) {
      return NextResponse.json({ error: "VPS ID is required" }, { status: 400 });
    }

    // 1. Verify VPC
    const vpc = await prisma.vpcNetwork.findUnique({
      where: { id: vpcId },
      include: { router: true },
    });
    if (!vpc) {
      return NextResponse.json({ error: "VPC not found" }, { status: 404 });
    }

    // 2. Verify VPS
    const vps = await prisma.vpsService.findUnique({
      where: { id: parseInt(vpsId) },
      include: { assignedIps: true },
    });
    if (!vps) {
      return NextResponse.json({ error: "VPS not found" }, { status: 404 });
    }
    if (vps.userId !== vpc.userId) {
      return NextResponse.json({
        error: "VPS does not belong to the same customer as the VPC",
      }, { status: 400 });
    }
    if (vps.vpcId) {
      return NextResponse.json({ error: "VPS is already attached to a VPC" }, { status: 400 });
    }

    // 3. IP Allocation Validation
    const existingVpsInVpc = await prisma.vpsService.findMany({
      where: { vpcId: vpc.id },
      select: { vpcIp: true },
    });
    const usedIps = new Set(existingVpsInVpc.map((v) => v.vpcIp).filter(Boolean));
    if (vpc.gateway) usedIps.add(vpc.gateway);

    let allocatedVpcIp = (privateIpAddress || "").trim();

    if (allocatedVpcIp) {
      if (usedIps.has(allocatedVpcIp)) {
        return NextResponse.json({
          error: `Requested Private IP ${allocatedVpcIp} is already in use in this VPC.`,
        }, { status: 400 });
      }
      const baseIpParts = (vpc.gateway || "10.0.0.1").split(".");
      if (!allocatedVpcIp.startsWith(`${baseIpParts[0]}.${baseIpParts[1]}.${baseIpParts[2]}.`)) {
        return NextResponse.json({
          error: `Requested Private IP ${allocatedVpcIp} is outside the VPC subnet (${baseIpParts[0]}.${baseIpParts[1]}.${baseIpParts[2]}.x).`,
        }, { status: 400 });
      }
    } else {
      // Auto Allocate next IP
      const baseIpParts = (vpc.gateway || "10.0.0.1").split(".");
      for (let i = 2; i <= 254; i++) {
        const candidate = `${baseIpParts[0]}.${baseIpParts[1]}.${baseIpParts[2]}.${i}`;
        if (!usedIps.has(candidate)) {
          allocatedVpcIp = candidate;
          break;
        }
      }
      if (!allocatedVpcIp) {
        return NextResponse.json({ error: "No available IPs in this VPC subnet." }, { status: 409 });
      }
    }

    // 4. Configure Proxmox (if not forceDbOnly)
    if (!forceDbOnly && vps.vmid && vpc.router) {
      try {
        const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
        if (server) {
          const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);

          let netIndex = 1;
          try {
            const vmConfig = await proxmox.getVmConfig(vps.node, vps.vmid);
            for (let i = 0; i < 10; i++) {
              if (!vmConfig[`net${i}`]) {
                netIndex = i;
                break;
              }
            }
          } catch {
            netIndex = vps.assignedIps?.length || 1;
          }

          const cidrSuffix = vpc.cidr.split("/")[1] || "24";
          const speedMbps = vps.bandwidthMbps || 100;
          const config: any = {};
          config[`net${netIndex}`] = `model=virtio,bridge=${vpc.router.proxmoxBridge},tag=${vpc.vlanId},firewall=1,rate=${speedMbps}`;

          if (!vps.assignedIps || vps.assignedIps.length === 0) {
            config[`ipconfig${netIndex}`] = `ip=${allocatedVpcIp}/${cidrSuffix},gw=${vpc.gateway}`;
          } else {
            config[`ipconfig${netIndex}`] = `ip=${allocatedVpcIp}/${cidrSuffix}`;
          }

          await proxmox.configVm(vps.node, vps.vmid, config);

          // Firewall rules
          try {
            await proxmox.updateFirewallOptions(vps.node, vps.vmid, { enable: 1 });
            await proxmox.createFirewallRule(vps.node, vps.vmid, {
              type: "in",
              action: "ACCEPT",
              source: vpc.cidr,
              enable: 1,
              comment: `Allow internal VPC ${vpc.name} traffic`,
            });
            await proxmox.createFirewallRule(vps.node, vps.vmid, {
              type: "in",
              action: "ACCEPT",
              source: vpc.cidr,
              proto: "icmp",
              enable: 1,
              comment: `Allow internal VPC ${vpc.name} ICMP (Ping)`,
            });
          } catch (fwErr: any) {
            console.warn("Proxmox firewall rule creation warning:", fwErr?.message);
          }
        }
      } catch (proxErr: any) {
        console.warn("Proxmox configuration warning (continuing to DB):", proxErr?.message);
        // If not forceDbOnly and proxmox fails, we can return warning or allow admin
      }
    }

    // 5. Update Database
    await prisma.vpsService.update({
      where: { id: vps.id },
      data: { vpcId: vpc.id, vpcIp: allocatedVpcIp },
    });

    await prisma.vpcNetwork.update({
      where: { id: vpc.id },
      data: { lastUsedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: `VM ${vps.hostname} successfully attached to VPC with IP ${allocatedVpcIp}.`,
    });
  } catch (error) {
    console.error("Admin VPC Attach Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  } finally {
    releaseMutex();
  }
}
