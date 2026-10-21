import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { ProxmoxClient } from "@/lib/proxmox";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const vpcId = parseInt(params.id);
    const body = await req.json();
    const { vpsId, forceDbOnly } = body;

    if (!vpsId) {
      return NextResponse.json({ error: "VPS ID is required" }, { status: 400 });
    }

    // 1. Verify VPC
    const vpc = await prisma.vpcNetwork.findUnique({
      where: { id: vpcId },
      include: { router: true },
    });
    if (!vpc) return NextResponse.json({ error: "VPC not found" }, { status: 404 });

    // 2. Verify VPS
    const vps = await prisma.vpsService.findUnique({
      where: { id: parseInt(vpsId), vpcId: vpc.id },
    });
    if (!vps) {
      return NextResponse.json({ error: "VPS not found or not attached to this VPC" }, { status: 404 });
    }

    // 3. Remove network interface from Proxmox (if not forceDbOnly)
    if (!forceDbOnly && vps.vmid && vpc.router) {
      try {
        const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
        if (server) {
          const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);

          const vmConfig = await proxmox.getVmConfig(vps.node, vps.vmid);
          let netIndexToDelete = -1;

          for (let i = 0; i < 10; i++) {
            const netValue = vmConfig[`net${i}`];
            if (netValue) {
              if (
                netValue.includes(`bridge=${vpc.router.proxmoxBridge}`) &&
                netValue.includes(`tag=${vpc.vlanId}`)
              ) {
                netIndexToDelete = i;
                break;
              }
            }
          }

          if (netIndexToDelete !== -1) {
            const keysToDelete = [`net${netIndexToDelete}`];
            if (vmConfig[`ipconfig${netIndexToDelete}`]) {
              keysToDelete.push(`ipconfig${netIndexToDelete}`);
            }
            await proxmox.configVm(vps.node, vps.vmid, { delete: keysToDelete.join(",") });
          }

          // Clean firewall rules
          try {
            const fwRules = await proxmox.getFirewallRules(vps.node, vps.vmid);
            const rulesToDelete = fwRules
              .filter(
                (rule: any) =>
                  rule.comment === `Allow internal VPC ${vpc.name} traffic` ||
                  rule.comment === `Allow internal VPC ${vpc.name} ICMP (Ping)` ||
                  (rule.comment && rule.comment.startsWith("Allow Peering VPC"))
              )
              .sort((a: any, b: any) => b.pos - a.pos);

            for (const rule of rulesToDelete) {
              await proxmox.deleteFirewallRule(vps.node, vps.vmid, rule.pos);
            }
          } catch (fwErr: any) {
            console.warn("Proxmox firewall rule cleanup error:", fwErr?.message);
          }
        }
      } catch (proxErr: any) {
        console.warn("Proxmox interface removal warning (falling back to DB update):", proxErr?.message);
      }
    }

    // 4. Update Database
    await prisma.vpsService.update({
      where: { id: vps.id },
      data: { vpcId: null, vpcIp: null },
    });

    await prisma.vpcNetwork.update({
      where: { id: vpc.id },
      data: { lastUsedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: `VM ${vps.hostname} detached from VPC successfully.`,
    });
  } catch (error) {
    console.error("Admin VPC Detach Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
