 import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { decryptDeterministic, encryptDeterministic } from "@/lib/encryption";
import { ProxmoxClient } from "@/lib/proxmox";
import { Address4 } from "ip-address";
import {
  BASE_BANDWIDTH_MBPS,
  bandwidthHourlyCost,
  getBandwidthOptions,
} from "@/lib/vps-bandwidth";
import { JobQueueService } from "@/lib/job-queue";
import { createVpcOnMikrotik } from "@/lib/mikrotik";
import {
  assertSufficientCommitmentBalance,
  getUserServicesCommitment,
} from "@/lib/billing-commitment";

function isPrivateRfc1918Cidr(cidr: string): boolean {
  try {
    const ip = cidr.trim().split("/")[0];
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some((n) => isNaN(n) || n < 0 || n > 255)) return false;
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    return false;
  } catch {
    return false;
  }
}

const HOSTNAME_REGEX =
  /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

async function findTargetCustomer(customerId?: number, customerEmail?: string) {
  if (customerId && Number.isSafeInteger(customerId) && customerId > 0) {
    return prisma.user.findUnique({ where: { id: customerId } });
  }
  if (customerEmail && customerEmail.trim()) {
    const normalized = customerEmail.trim().toLowerCase();
    const encrypted = encryptDeterministic(normalized);
    return prisma.user.findFirst({
      where: {
        OR: [{ email: encrypted }, { email: normalized }],
      },
    });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const customerIdParam = searchParams.get("customerId");
    const emailParam = searchParams.get("email") || "";
    const customerId = customerIdParam ? parseInt(customerIdParam, 10) : undefined;

    const [
      templates,
      pricingItems,
      bandwidthOptions,
      ipv4PoolsCount,
      ipv6PoolsCount,
      serverConfig,
      vpcRouters,
    ] = await Promise.all([
      prisma.vpsTemplate.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      prisma.vpsPricing.findMany(),
      getBandwidthOptions(),
      prisma.ipPool.count({ where: { version: 4, type: "PUBLIC" } }),
      prisma.ipPool.count({ where: { version: 6, type: "PUBLIC" } }),
      prisma.proxmoxServer.findFirst({ where: { isActive: true } }),
      prisma.vpcRouter.findMany({
        select: { id: true, name: true },
        orderBy: { id: "asc" },
      }),
    ]);

    const pricing: Record<string, number> = {};
    for (const item of pricingItems) {
      pricing[item.key] = item.pricePerHour;
    }
    if (pricing.bandwidth === undefined) {
      pricing.bandwidth = 69;
    }

    let nodes: string[] = ["proxmox"];
    if (serverConfig) {
      try {
        const proxmox = new ProxmoxClient(
          serverConfig.host,
          serverConfig.tokenId,
          decryptDeterministic(serverConfig.tokenSecret)
        );
        const clusterNodes = await proxmox.getNodes();
        if (Array.isArray(clusterNodes) && clusterNodes.length > 0) {
          nodes = clusterNodes.map((n: any) => n.node).filter(Boolean);
        }
      } catch {
        // Fallback to default node name if Proxmox API is temporarily unreachable
      }
    }

    let customerSummary: any = null;
    if (customerId || emailParam.trim()) {
      const targetUser = await findTargetCustomer(customerId, emailParam);
      if (!targetUser || targetUser.role !== "USER") {
        return NextResponse.json(
          { error: "Customer not found with that email or ID." },
          { status: 404 }
        );
      }

      const [commitment, vpcs, reservedIps] = await Promise.all([
        getUserServicesCommitment(targetUser.id),
        prisma.vpcNetwork.findMany({
          where: { userId: targetUser.id },
          include: {
            vpsServices: {
              where: { status: { notIn: ["TERMINATED", "TERMINATING"] } },
              select: { vpcIp: true },
            },
          },
          orderBy: { name: "asc" },
        }),
        prisma.reservedIp.findMany({
          where: { userId: targetUser.id, isAttached: false },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      customerSummary = {
        id: targetUser.id,
        name: targetUser.name ? decryptDeterministic(targetUser.name) : "Unnamed",
        email: decryptDeterministic(targetUser.email),
        balance: targetUser.balance,
        isBlocked: targetUser.isSuspended,
        blockReason: targetUser.suspendReason,
        commitment,
        vpcs,
        reservedIps,
      };
    }

    return NextResponse.json({
      templates,
      pricing,
      bandwidthOptions,
      nodes,
      hasIpv4Pool: ipv4PoolsCount > 0,
      hasIpv6Pool: ipv6PoolsCount > 0,
      hasSsdStorage: Boolean(serverConfig?.mainDiskStorageSsd),
      vpcRouters,
      customer: customerSummary,
    });
  } catch (error) {
    console.error("Admin VPS Create GET Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (auth.impersonatedBy) {
    return NextResponse.json(
      { error: "Cannot create VPS during impersonation." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();

    if (body.action === "create_vpc") {
      const targetUser = await findTargetCustomer(
        body.customerId ? Number(body.customerId) : undefined,
        typeof body.customerEmail === "string" ? body.customerEmail : undefined
      );
      if (!targetUser || targetUser.role !== "USER") {
        return NextResponse.json({ error: "Customer not found." }, { status: 404 });
      }
      if (targetUser.isSuspended) {
        return NextResponse.json(
          { error: "Cannot create VPC for a blocked customer." },
          { status: 400 }
        );
      }

      const vpcName = typeof body.name === "string" ? body.name.trim() : "";
      const rawCidr = typeof body.cidr === "string" ? body.cidr.trim() : "";
      const isNatEnabled = Boolean(body.isNatEnabled);
      const routerId = body.routerId ? Number(body.routerId) : undefined;

      if (!/^[a-zA-Z0-9 _-]{2,40}$/.test(vpcName)) {
        return NextResponse.json(
          { error: "VPC name must be 2-40 characters (letters, numbers, spaces, hyphens, underscores)." },
          { status: 400 }
        );
      }
      if (!rawCidr.includes("/") || !isPrivateRfc1918Cidr(rawCidr)) {
        return NextResponse.json(
          { error: "Invalid CIDR. Use a private RFC 1918 range (e.g. 10.10.0.0/24)." },
          { status: 400 }
        );
      }

      let parsedCidr: Address4;
      try {
        parsedCidr = new Address4(rawCidr);
        if (parsedCidr.subnetMask < 16 || parsedCidr.subnetMask > 28) {
          return NextResponse.json(
            { error: "CIDR prefix length must be between /16 and /28." },
            { status: 400 }
          );
        }
        const baseNetwork = parsedCidr.startAddress().addressMinusSuffix;
        parsedCidr = new Address4(`${baseNetwork}/${parsedCidr.subnetMask}`);
      } catch {
        return NextResponse.json({ error: "Invalid CIDR format." }, { status: 400 });
      }

      const normalizedCidr = `${parsedCidr.addressMinusSuffix}/${parsedCidr.subnetMask}`;
      const existingVpcs = await prisma.vpcNetwork.findMany({
        where: { userId: targetUser.id },
        select: { cidr: true, name: true },
      });
      for (const uv of existingVpcs) {
        try {
          const existingAddr = new Address4(uv.cidr);
          if (parsedCidr.isInSubnet(existingAddr) || existingAddr.isInSubnet(parsedCidr)) {
            return NextResponse.json(
              { error: `CIDR ${normalizedCidr} overlaps with customer's existing VPC "${uv.name}" (${uv.cidr}).` },
              { status: 400 }
            );
          }
        } catch {
          // ignore invalid stored cidr
        }
      }

      const gateway = parsedCidr.startAddressExclusive().address;
      const router = routerId
        ? await prisma.vpcRouter.findUnique({ where: { id: routerId } })
        : await prisma.vpcRouter.findFirst();
      if (!router) {
        return NextResponse.json({ error: "No VPC Router configured in the system." }, { status: 404 });
      }

      let createdVpc: any = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          createdVpc = await prisma.$transaction(async (tx) => {
            await tx.vpcRouter.update({
              where: { id: router.id },
              data: { updatedAt: new Date() },
            });
            const usedVlans = await tx.vpcNetwork.findMany({
              where: { routerId: router.id },
              select: { vlanId: true },
            });
            const usedSet = new Set(usedVlans.map((v) => v.vlanId));
            let nextVlan = 2;
            while (usedSet.has(nextVlan) && nextVlan <= 4094) nextVlan++;
            if (nextVlan > 4094) throw new Error("Maximum VLAN capacity reached (4094)");

            return tx.vpcNetwork.create({
              data: {
                name: vpcName,
                cidr: normalizedCidr,
                gateway,
                vlanId: nextVlan,
                isNatEnabled,
                userId: targetUser.id,
                routerId: router.id,
              },
              include: {
                vpsServices: {
                  where: { status: { notIn: ["TERMINATED", "TERMINATING"] } },
                  select: { vpcIp: true },
                },
              },
            });
          });
          break;
        } catch (err: any) {
          if (err?.code === "P2002" && attempt < 4) {
            await new Promise((r) => setTimeout(r, 100 * (attempt + 1)));
            continue;
          }
          if (err?.message === "Maximum VLAN capacity reached (4094)") {
            return NextResponse.json({ error: err.message }, { status: 400 });
          }
          throw err;
        }
      }

      if (!createdVpc) {
        return NextResponse.json({ error: "Failed to allocate VLAN ID for VPC." }, { status: 409 });
      }

      setImmediate(async () => {
        try {
          await createVpcOnMikrotik(router, createdVpc, targetUser);
          await prisma.vpcNetwork.update({
            where: { id: createdVpc.id },
            data: { status: "ACTIVE" },
          });
        } catch (err) {
          console.error("Admin VPC MikroTik provisioning error:", err);
          await prisma.vpcNetwork.update({
            where: { id: createdVpc.id },
            data: { status: "FAILED" },
          });
        }
      });

      return NextResponse.json({ success: true, vpc: createdVpc });
    }

    const {
      customerId,
      customerEmail,
      hostname,
      username,
      rootPassword,
      sshKey,
      templateId,
      cpuCores,
      ramGb,
      diskGb,
      diskType = "HDD",
      backupGb = 0,
      bandwidthMbps,
      useIpv4 = true,
      useIpv6 = false,
      reservedIpId,
      vpcId,
      privateIpAddress,
      targetNode,
    } = body;

    const targetUser = await findTargetCustomer(
      customerId ? Number(customerId) : undefined,
      typeof customerEmail === "string" ? customerEmail : undefined
    );

    if (!targetUser) {
      return NextResponse.json(
        { error: "Customer not found. Please select or enter a valid customer email." },
        { status: 404 }
      );
    }

    if (targetUser.role !== "USER") {
      return NextResponse.json(
        { error: "VPS can only be provisioned for customer accounts." },
        { status: 400 }
      );
    }

    if (targetUser.isSuspended) {
      return NextResponse.json(
        { error: "Cannot create VPS for a blocked customer account." },
        { status: 400 }
      );
    }

    if (!hostname || typeof hostname !== "string" || !hostname.trim()) {
      return NextResponse.json({ error: "Hostname is required." }, { status: 400 });
    }
    const cleanHostname = hostname.trim();
    if (!HOSTNAME_REGEX.test(cleanHostname) || cleanHostname.length > 63) {
      return NextResponse.json(
        { error: "Invalid hostname. Use a valid domain format (e.g. vps.example.com, max 63 chars)." },
        { status: 400 }
      );
    }

    if (!rootPassword || typeof rootPassword !== "string") {
      return NextResponse.json({ error: "Root/Admin password is required." }, { status: 400 });
    }
    if (rootPassword.length < 8 || rootPassword.length > 128) {
      return NextResponse.json(
        { error: "Password must be between 8 and 128 characters long." },
        { status: 400 }
      );
    }
    if (!/[a-zA-Z]/.test(rootPassword) || !/[0-9]/.test(rootPassword)) {
      return NextResponse.json(
        { error: "Password must contain both letters and numbers." },
        { status: 400 }
      );
    }

    if (sshKey !== undefined && sshKey !== null && sshKey !== "") {
      if (typeof sshKey !== "string" || sshKey.length > 4096 || /[\r\n]/.test(sshKey.trim())) {
        return NextResponse.json({ error: "Invalid SSH public key format." }, { status: 400 });
      }
    }

    const validatedNode =
      typeof targetNode === "string" && targetNode.trim() ? targetNode.trim() : "proxmox";
    if (!/^[a-zA-Z0-9-]+$/.test(validatedNode) || validatedNode.length > 63) {
      return NextResponse.json({ error: "Invalid target Proxmox node." }, { status: 400 });
    }

    if (!templateId) {
      return NextResponse.json({ error: "Operating system template is required." }, { status: 400 });
    }
    const template = await prisma.vpsTemplate.findUnique({
      where: { id: Number(templateId) },
    });
    if (!template) {
      return NextResponse.json({ error: "OS template not found." }, { status: 404 });
    }

    const serverConfig = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!serverConfig) {
      return NextResponse.json({ error: "No active Proxmox server configured." }, { status: 500 });
    }

    const normalizedDiskType = diskType === "SSD" ? "SSD" : "HDD";
    const defaultBridge = serverConfig.networkBridge || "vmbr0";
    const defaultStorage =
      normalizedDiskType === "SSD" && serverConfig.mainDiskStorageSsd
        ? serverConfig.mainDiskStorageSsd
        : serverConfig.mainDiskStorage;

    if (!defaultStorage) {
      return NextResponse.json(
        { error: `VPS storage (${normalizedDiskType}) is not configured.` },
        { status: 400 }
      );
    }

    const safeCpu = Math.min(Math.max(Math.floor(Number(cpuCores) || 1), 1), 32);
    const safeRam = Math.min(Math.max(Math.floor(Number(ramGb) || 1), 1), 128);
    const safeDisk = Math.min(Math.max(Math.floor(Number(diskGb) || 10), 10), 2000);
    const safeBackup = Math.min(Math.max(Math.floor(Number(backupGb) || 0), 0), 500);

    const allowedBandwidth = await getBandwidthOptions();
    const requestedBandwidth =
      bandwidthMbps === undefined || bandwidthMbps === null || bandwidthMbps === ""
        ? BASE_BANDWIDTH_MBPS
        : Number(bandwidthMbps);
    if (!Number.isInteger(requestedBandwidth) || !allowedBandwidth.includes(requestedBandwidth)) {
      return NextResponse.json(
        { error: `Invalid bandwidth tier. Allowed: ${allowedBandwidth.join(", ")} Mbps` },
        { status: 400 }
      );
    }

    const ipv4Count = useIpv4 ? 1 : 0;
    const ipv6Count = useIpv6 ? 1 : 0;

    if (reservedIpId) {
      const reserved = await prisma.reservedIp.findFirst({
        where: { id: Number(reservedIpId), userId: targetUser.id, isAttached: false },
      });
      if (!reserved) {
        return NextResponse.json(
          { error: "Selected Reserved IP is not available for this customer." },
          { status: 400 }
        );
      }
    }

    const parsedVpcId = vpcId ? Number(vpcId) : undefined;
    if (parsedVpcId) {
      const vpc = await prisma.vpcNetwork.findUnique({
        where: { id: parsedVpcId },
        include: {
          vpsServices: {
            where: { status: { notIn: ["TERMINATED", "TERMINATING"] } },
            select: { vpcIp: true },
          },
        },
      });
      if (!vpc || vpc.userId !== targetUser.id) {
        return NextResponse.json(
          { error: "Selected VPC does not belong to this customer." },
          { status: 400 }
        );
      }

      if (privateIpAddress && String(privateIpAddress).trim()) {
        const ip = String(privateIpAddress).trim();
        try {
          const requestedIp = new Address4(ip);
          const vpcSubnet = new Address4(vpc.cidr);
          if (!requestedIp.isInSubnet(vpcSubnet)) {
            return NextResponse.json(
              { error: `Private IP (${ip}) is outside the VPC subnet (${vpc.cidr}).` },
              { status: 400 }
            );
          }
        } catch {
          return NextResponse.json({ error: "Invalid private IP address format." }, { status: 400 });
        }
        if (ip === vpc.gateway) {
          return NextResponse.json(
            { error: "Private IP cannot be the VPC gateway address." },
            { status: 400 }
          );
        }
        if (vpc.vpsServices?.some((v) => v.vpcIp === ip)) {
          return NextResponse.json(
            { error: "Private IP is already used by another VM in this VPC." },
            { status: 400 }
          );
        }
      }
    }

    // Proxmox node pre-flight capacity check
    try {
      const proxmox = new ProxmoxClient(
        serverConfig.host,
        serverConfig.tokenId,
        decryptDeterministic(serverConfig.tokenSecret)
      );
      const clusterNodes = await proxmox.getNodes();
      if (
        Array.isArray(clusterNodes) &&
        clusterNodes.length > 0 &&
        !clusterNodes.some((n: any) => n.node === validatedNode)
      ) {
        return NextResponse.json(
          { error: "Selected Proxmox node does not exist in cluster." },
          { status: 400 }
        );
      }

      const nodeStatus = await proxmox.getNodeStatus(validatedNode);
      if (nodeStatus?.memory?.total) {
        const requestedRamBytes = safeRam * 1024 * 1024 * 1024;
        if ((nodeStatus.memory.used + requestedRamBytes) / nodeStatus.memory.total > 0.95) {
          return NextResponse.json(
            { error: "Target Proxmox node is at maximum memory capacity." },
            { status: 503 }
          );
        }
        if (nodeStatus.cpu > 0.95) {
          return NextResponse.json(
            { error: "Target Proxmox node is experiencing high CPU load." },
            { status: 503 }
          );
        }
      }

      const storages = await proxmox.getStorages(validatedNode);
      const targetStorageData = storages.find((s: any) => s.storage === defaultStorage);
      if (targetStorageData?.total) {
        const requestedDiskBytes = safeDisk * 1024 * 1024 * 1024;
        if ((targetStorageData.used + requestedDiskBytes) / targetStorageData.total > 0.95) {
          return NextResponse.json(
            { error: "Target Proxmox storage is out of disk capacity." },
            { status: 503 }
          );
        }
      }
    } catch (err) {
      console.error("Admin VPS Create capacity check warning:", err);
    }

    // Calculate PAYG pricing identically to customer order flow
    const pricingItems = await prisma.vpsPricing.findMany();
    const pricing: Record<string, number> = {};
    for (const item of pricingItems) {
      pricing[item.key] = item.pricePerHour;
    }

    const diskPrice =
      normalizedDiskType === "SSD"
        ? pricing.diskSsd || pricing.disk || 0
        : pricing.disk || 0;
    const hourlyRate =
      safeCpu * (pricing.vcpu || 0) +
      safeRam * (pricing.ram || 0) +
      safeDisk * diskPrice +
      safeBackup * (pricing.backup || 0) +
      (ipv4Count > 0 ? ipv4Count * (pricing.ipv4 || 0) : 0) +
      (ipv6Count > 0 ? ipv6Count * (pricing.ipv6 || 0) : 0) +
      bandwidthHourlyCost(requestedBandwidth, pricing);

    const newVpsMonthly = Math.round(hourlyRate * 730);
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const vpsData: any = {
      userId: targetUser.id,
      hostname: cleanHostname,
      username: template.name.toLowerCase().includes("windows")
        ? "Administrator"
        : typeof username === "string" && username.trim()
          ? username.trim()
          : "root",
      osTemplate: template.name,
      rootPassword: encryptDeterministic(rootPassword),
      sshKey: sshKey && typeof sshKey === "string" && sshKey.trim() ? sshKey.trim() : null,
      status: "PENDING",
      node: validatedNode,
      networkBridge: defaultBridge,
      storageId: defaultStorage,
      diskType: normalizedDiskType,
      cpuCores: safeCpu,
      ramGb: safeRam,
      diskGb: safeDisk,
      backupGb: safeBackup,
      bandwidthMbps: requestedBandwidth,
      vpcId: parsedVpcId,
      vpcIp:
        parsedVpcId && typeof privateIpAddress === "string" && privateIpAddress.trim()
          ? privateIpAddress.trim()
          : null,
      hourlyRate,
      stoppedRate: hourlyRate,
      accumulatedCost: hourlyRate,
      expiresAt,
      appStatus: "NONE",
    };

    let requiredBalance = newVpsMonthly;
    let createdInvoiceNumber = "";
    let createdVps: any;

    try {
      const txResult = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT id FROM "User" WHERE id = ${targetUser.id} FOR UPDATE`;

        const freshUser = await tx.user.findUnique({
          where: { id: targetUser.id },
          select: { balance: true },
        });

        const commitmentCheck = await assertSufficientCommitmentBalance({
          userId: targetUser.id,
          userBalance: freshUser?.balance || 0,
          newServiceMonthly: newVpsMonthly,
          serviceName: `Cloud VPS (${cleanHostname})`,
          tx,
        });
        requiredBalance = commitmentCheck.requiredBalance;

        const vps = await tx.vpsService.create({ data: vpsData });

        const updateResult = await tx.user.updateMany({
          where: { id: targetUser.id, balance: { gte: requiredBalance } },
          data: { balance: { decrement: hourlyRate } },
        });
        if (updateResult.count === 0) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        const invoiceNumber = `INV-PAYG-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        await tx.invoice.create({
          data: {
            invoiceNumber,
            userId: targetUser.id,
            vpsServiceId: vps.id,
            amount: hourlyRate,
            status: "PAID",
            merchantOrderId: invoiceNumber,
            type: "VPS",
            paymentMethod: "Account Balance",
            paidAt: new Date(),
            reference: "PAYG_RUNNING",
          },
        });

        return { vps, invoiceNumber };
      });

      createdVps = txResult.vps;
      createdInvoiceNumber = txResult.invoiceNumber;
    } catch (txError: any) {
      if (txError?.message?.startsWith("Insufficient account balance")) {
        return NextResponse.json({ error: txError.message }, { status: 400 });
      }
      if (txError?.message === "INSUFFICIENT_BALANCE") {
        return NextResponse.json(
          {
            error: `Insufficient customer balance. A minimum balance of Rp ${requiredBalance.toLocaleString("id-ID")} (including active commitments + 1 month estimation) is required.`,
          },
          { status: 400 }
        );
      }
      throw txError;
    }

    await JobQueueService.enqueue("PROVISION_VPS", {
      vpsId: createdVps.id,
      options: {
        ipv4Count,
        ipv6Count,
        reservedIpId: reservedIpId ? Number(reservedIpId) : undefined,
        vpcId: parsedVpcId,
      },
      userId: targetUser.id,
      hourlyRate,
    });

    return NextResponse.json({
      success: true,
      vpsId: createdVps.id,
      invoiceNumber: createdInvoiceNumber,
      hourlyRate,
      newVpsMonthly,
      requiredBalance,
    });
  } catch (error) {
    console.error("Admin VPS Create POST Error:", error);
    return NextResponse.json({ error: "Failed to create VPS for customer." }, { status: 500 });
  }
}
