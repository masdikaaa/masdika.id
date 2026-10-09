import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    const user = authResult.user!;

    const { id } = await params;
    const vpsId = parseInt(id);

    const body = await request.json().catch(() => ({}));
    const { ipAddress } = body;

    if (!ipAddress) {
      return NextResponse.json({ error: "IP address is required" }, { status: 400 });
    }

    // Check VPS
    const vps = await prisma.vpsService.findFirst({
      where: {
        id: vpsId,
        userId: user.id,
      },
      include: {
        assignedIps: true,
      }
    });

    if (!vps) {
      return NextResponse.json({ error: "VPS not found" }, { status: 404 });
    }

    if (vps.status === "SUSPENDED" || vps.status === "TERMINATED") {
      return NextResponse.json({ error: "VPS is suspended or terminated" }, { status: 400 });
    }

    // Find the assignment
    const assignment = vps.assignedIps.find((a: any) => a.ipAddress === ipAddress);
    if (!assignment) {
      return NextResponse.json({ error: "IP address not assigned to this VPS" }, { status: 404 });
    }

    if (assignment.isPrimary) {
      return NextResponse.json({ error: "Cannot unreserve primary IP" }, { status: 400 });
    }

    // Get IP pricing
    const pricingItems = await prisma.vpsPricing.findMany();
    let ipPricePerHour = 0;
    const ipPricing = pricingItems.find((p: any) => p.key === 'ipv4');
    if (ipPricing) {
      ipPricePerHour = ipPricing.pricePerHour;
    }

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Remove assignment (this automatically releases it back to the pool)
      await tx.vpsIpAssignment.delete({
        where: { id: assignment.id }
      });

      // Adjust billing (reducing their future hourly rate)
      if (ipPricePerHour > 0) {
        const newHourlyRate = Math.max(0, vps.hourlyRate - ipPricePerHour);
        const newStoppedRate = Math.max(0, (vps.stoppedRate || 0) - ipPricePerHour);
        
        await tx.vpsService.update({
          where: { id: vps.id },
          data: { 
            hourlyRate: newHourlyRate,
            stoppedRate: newStoppedRate
          }
        });
      }
    });

    // Detach Network Interface via Proxmox
    if (vps.vmid) {
      try {
        const { ProxmoxClient } = await import("@/lib/proxmox");
        const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
        if (server) {
          const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
          const vmConfig = await proxmox.getVmConfig(vps.node, vps.vmid);

          // Find which net index corresponds to this IP
          let netIndexToDelete = -1;
          for (let i = 1; i <= 31; i++) {
            const ipconfig = vmConfig[`ipconfig${i}`];
            if (ipconfig && ipconfig.includes(`ip=${ipAddress}/`)) {
              netIndexToDelete = i;
              break;
            }
          }

          if (netIndexToDelete !== -1) {
            console.log(`Detaching net${netIndexToDelete} from VMID ${vps.vmid}`);
            await proxmox.configVm(vps.node, vps.vmid, {
              delete: `net${netIndexToDelete},ipconfig${netIndexToDelete}`
            });
            // We intentionally skip deleting the IP filter set here to keep ProxmoxClient simple,
            // as deleting the `netX` interface already removes it from the VM.
          }
        }
      } catch (proxmoxErr) {
        console.error("Failed to detach IP from Proxmox VM:", proxmoxErr);
      }
    }

    return NextResponse.json({ success: true, message: "IP successfully unreserved. No refund will be provided for the remaining time." });

  } catch (error: any) {
    console.error("Error unreserving IP:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
