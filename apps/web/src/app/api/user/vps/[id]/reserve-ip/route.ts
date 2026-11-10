import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { bandwidthToProxmoxRate, BASE_BANDWIDTH_MBPS } from "@/lib/vps-bandwidth";
import { syncVpsAppUrlsWithPublicIp } from "@/lib/vps-app-urls";

const CANONICAL_IPV4_REGEX = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    const user = authResult.user!;

    const { id } = await params;
    const vpsId = Number(id);
    if (!Number.isSafeInteger(vpsId) || vpsId <= 0) {
      return NextResponse.json({ error: "Invalid VPS ID" }, { status: 400 });
    }

    const vps = await prisma.vpsService.findFirst({
      where: { id: vpsId, userId: user.id },
      include: { assignedIps: true }
    });

    if (!vps) {
      return NextResponse.json({ error: "VPS not found" }, { status: 404 });
    }

    if (vps.isReseller) {
      return NextResponse.json({ error: "Reserving additional IPs is not supported on fixed-plan Reseller instances." }, { status: 403 });
    }

    if (vps.status === "SUSPENDED" || vps.status === "TERMINATED" || vps.status === "PROVISIONING") {
      return NextResponse.json({ error: `Cannot reserve IP while VPS is ${vps.status}.` }, { status: 403 });
    }

    if (vps.assignedIps.length >= 5) {
      return NextResponse.json({ error: "Maximum of 5 IP addresses per VPS reached." }, { status: 400 });
    }

    // Get IP pricing (fail closed if unconfigured)
    const pricingItems = await prisma.vpsPricing.findMany();
    const ipPricing = pricingItems.find(p => p.key === "ipv4");
    if (!ipPricing || !Number.isSafeInteger(ipPricing.pricePerHour) || ipPricing.pricePerHour <= 0) {
      return NextResponse.json({ error: "IPv4 pricing is not configured." }, { status: 503 });
    }
    const ipPricePerHour = ipPricing.pricePerHour;

    const body = await req.json().catch(() => ({}));
    const ipAddress = typeof body?.ipAddress === "string" ? body.ipAddress.trim() : "";

    if (!ipAddress || !CANONICAL_IPV4_REGEX.test(ipAddress)) {
      return NextResponse.json({ error: "Invalid canonical IPv4 address." }, { status: 400 });
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

    const candidateParts = ipAddress.split(".").map(Number);
    const candidateNum = ipToNum(candidateParts);

    for (const pool of pools) {
      if (!pool.startIp || !pool.endIp || !CANONICAL_IPV4_REGEX.test(pool.startIp) || !CANONICAL_IPV4_REGEX.test(pool.endIp)) continue;
      if (ipAddress === pool.gateway) continue;

      const startNum = ipToNum(pool.startIp.split(".").map(Number));
      const endNum = ipToNum(pool.endIp.split(".").map(Number));

      if (candidateNum >= startNum && candidateNum <= endNum) {
        targetPoolId = pool.id;
        break;
      }
    }

    if (!targetPoolId) {
      return NextResponse.json({ error: "Invalid IP address or out of range." }, { status: 400 });
    }

    const requiredBalance = (vps.hourlyRate + ipPricePerHour) * 730;
    if (user.balance < requiredBalance) {
      return NextResponse.json(
        { error: `A minimum balance of Rp ${requiredBalance.toLocaleString("id-ID")} (1 month estimation) is required to reserve this IP.` },
        { status: 400 }
      );
    }

    // Transaction to serialize pool allocation, verify ReservedIp & VpsIpAssignment, lock VPS, and deduct 1st hour upfront
    try {
      await prisma.$transaction(async (tx) => {
        // 1. Serialize pool allocation
        await tx.ipPool.update({
          where: { id: targetPoolId! },
          data: { updatedAt: new Date() }
        });

        // 2. Block hijacking any customer's ReservedIp (attached or detached!) or VpsIpAssignment
        const [existingAssignment, existingReserved] = await Promise.all([
          tx.vpsIpAssignment.findFirst({ where: { ipPoolId: targetPoolId!, ipAddress } }),
          tx.reservedIp.findFirst({ where: { ipPoolId: targetPoolId!, ipAddress } })
        ]);
        if (existingAssignment || existingReserved) {
          throw new Error("IP_ALREADY_TAKEN");
        }

        // 3. Lock VPS state atomically
        const lockResult = await tx.vpsService.updateMany({
          where: { id: vps.id, userId: user.id, status: vps.status },
          data: { status: "PROVISIONING" }
        });
        if (lockResult.count === 0) {
          throw new Error("VPS_LOCKED");
        }

        // 4. Deduct 1st hour upfront while verifying 730h minimum balance
        const deductResult = await tx.user.updateMany({
          where: { id: user.id, balance: { gte: requiredBalance } },
          data: { balance: { decrement: ipPricePerHour } }
        });
        if (deductResult.count === 0) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        // 5. Assign IP
        await tx.vpsIpAssignment.create({
          data: {
            vpsId: vps.id,
            ipPoolId: targetPoolId!,
            ipAddress: ipAddress,
            isPrimary: vps.assignedIps.length === 0
          }
        });

        // 6. Update VPS Pricing + running PAYG invoice
        const runningInvoice = await tx.invoice.findFirst({
          where: { vpsServiceId: vps.id, reference: "PAYG_RUNNING" },
          orderBy: { createdAt: "desc" }
        });
        if (runningInvoice) {
          await tx.invoice.update({
            where: { id: runningInvoice.id },
            data: { amount: { increment: ipPricePerHour } }
          });
        }

        await tx.vpsService.update({
          where: { id: vps.id },
          data: {
            hourlyRate: { increment: ipPricePerHour },
            stoppedRate: { increment: ipPricePerHour },
            accumulatedCost: { increment: ipPricePerHour }
          }
        });
      });
    } catch (e: any) {
      if (e.message === "VPS_LOCKED") {
        return NextResponse.json({ error: "VPS is currently being modified by another process. Please wait." }, { status: 409 });
      }
      if (e.message === "INSUFFICIENT_BALANCE") {
        return NextResponse.json(
          { error: `A minimum balance of Rp ${requiredBalance.toLocaleString("id-ID")} (1 month estimation) is required.` },
          { status: 400 }
        );
      }
      if (e.message === "IP_ALREADY_TAKEN" || e.code === "P2002") {
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

          const getNextAvailableNetIndex = () => {
            for (let i = 0; i < 32; i++) {
              if (i === 1) continue; // Reserved strictly for VPC
              if (vmConfig[`net${i}`] === undefined) {
                return i;
              }
            }
            return -1;
          };
          const netIndex = getNextAvailableNetIndex();

          if (netIndex >= 0) {
            const pool = pools.find(p => p.id === targetPoolId);
            const cidrSuffix = pool?.network.split("/")[1] || "24";
            const bridgeToUse = pool?.type === "PUBLIC" && server.publicNetworkBridge
              ? server.publicNetworkBridge
              : vps.networkBridge;
            const rateMBs = bandwidthToProxmoxRate(vps.bandwidthMbps || BASE_BANDWIDTH_MBPS);

            const configToSet: Record<string, string> = {};
            configToSet[`net${netIndex}`] = `model=virtio,bridge=${bridgeToUse},rate=${rateMBs}`;
            configToSet[`ipconfig${netIndex}`] = `ip=${ipAddress}/${cidrSuffix},gw=${pool?.gateway}`;

            await proxmox.configVm(vps.node, vps.vmid, configToSet);

            // Set up IP Filter
            const ipSetName = `ipfilter-net${netIndex}`;
            await proxmox.createFirewallIpSet(vps.node, vps.vmid, ipSetName, `Allowed IPs for net${netIndex}`);
            await proxmox.addIpToFirewallIpSet(vps.node, vps.vmid, `${ipAddress}/32`, ipSetName, `Secondary IP`);
          }
        }
      } catch (proxmoxErr) {
        console.error("Failed to attach IP to Proxmox VM:", proxmoxErr);
      }
    }

    // Unlock VPS state
    await prisma.vpsService.update({
      where: { id: vps.id },
      data: { status: vps.status }
    });

    // Automatically align application URLs and credentials with the newly attached IP
    await syncVpsAppUrlsWithPublicIp(prisma, vps.id, ipAddress, [vps.vpcIp]);

    return NextResponse.json({ success: true, ipAddress });

  } catch (error: any) {
    console.error("Reserve IP Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
