import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { calculateMinimumBaseVpsRate } from "@/lib/vps-billing-rate";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    const user = authResult.user!;

    const { id } = await params;
    const vpsId = Number(id);
    if (!Number.isSafeInteger(vpsId) || vpsId <= 0) {
      return NextResponse.json({ error: "Invalid VPS ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const ipAddress = typeof body?.ipAddress === "string" ? body.ipAddress.trim() : "";

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
        assignedIps: {
          include: { ipPool: true }
        },
      }
    });

    if (!vps) {
      return NextResponse.json({ error: "VPS not found" }, { status: 404 });
    }

    if (vps.isReseller) {
      return NextResponse.json({ error: "Unreserving IPs is not supported on fixed-plan Reseller instances" }, { status: 403 });
    }

    if (vps.status === "SUSPENDED" || vps.status === "TERMINATED" || vps.status === "PROVISIONING") {
      return NextResponse.json({ error: `Cannot modify IPs while VPS is ${vps.status}` }, { status: 400 });
    }

    // Find the assignment
    const assignment = vps.assignedIps.find((a) => a.ipAddress === ipAddress);
    if (!assignment) {
      return NextResponse.json({ error: "IP address not assigned to this VPS" }, { status: 404 });
    }

    if (assignment.isPrimary) {
      return NextResponse.json({ error: "Cannot unreserve primary IP" }, { status: 400 });
    }

    // Block unreserving a standalone ReservedIp through this endpoint (must use Reserved IP detach)
    const linkedReservedIp = await prisma.reservedIp.findFirst({
      where: { ipAddress }
    });
    if (linkedReservedIp) {
      return NextResponse.json(
        { error: "This IP is a Reserved IP. Please detach it from the Reserved IPs page instead." },
        { status: 400 }
      );
    }

    // Get IP pricing based on actual IP version (prevents subtracting IPv4 rate when removing IPv6!)
    const pricingItems = await prisma.vpsPricing.findMany();
    const pricingMap: Record<string, number> = {};
    for (const p of pricingItems) {
      pricingMap[p.key] = p.pricePerHour;
    }

    const isIpv6 = assignment.ipPool?.version === 6 || ipAddress.includes(":");
    const ipPricePerHour = isIpv6 ? (pricingMap.ipv6 || 0) : (pricingMap.ipv4 || 0);
    const minBaseRate = calculateMinimumBaseVpsRate(vps, pricingMap);

    // Use transaction with atomic deleteMany + VPS status check to prevent double-discount race conditions
    try {
      await prisma.$transaction(async (tx) => {
        const deleted = await tx.vpsIpAssignment.deleteMany({
          where: { id: assignment.id, vpsId: vps.id, isPrimary: false }
        });
        if (deleted.count === 0) {
          throw new Error("ALREADY_UNRESERVED");
        }

        if (ipPricePerHour > 0) {
          const currentVps = await tx.vpsService.findUnique({ where: { id: vps.id } });
          if (currentVps) {
            const newHourlyRate = Math.max(minBaseRate, currentVps.hourlyRate - ipPricePerHour);
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
      if (txErr.message === "ALREADY_UNRESERVED") {
        return NextResponse.json({ error: "IP address was already removed concurrently" }, { status: 409 });
      }
      throw txErr;
    }

    // Detach Network Interface via Proxmox
    if (vps.vmid) {
      try {
        const { ProxmoxClient } = await import("@/lib/proxmox");
        const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
        if (server) {
          const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
          const vmConfig = await proxmox.getVmConfig(vps.node, vps.vmid);

          // Find which net index corresponds to this IP (IPv4 or IPv6)
          let netIndexToDelete = -1;
          for (let i = 1; i <= 31; i++) {
            const ipconfig = vmConfig[`ipconfig${i}`];
            if (
              typeof ipconfig === "string" &&
              (ipconfig.includes(`ip=${ipAddress}/`) || ipconfig.includes(`ip6=${ipAddress}/`))
            ) {
              netIndexToDelete = i;
              break;
            }
          }

          if (netIndexToDelete !== -1) {
            await proxmox.configVm(vps.node, vps.vmid, {
              delete: `net${netIndexToDelete},ipconfig${netIndexToDelete}`
            });
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
