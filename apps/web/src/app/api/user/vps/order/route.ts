import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { encryptDeterministic, decryptDeterministic } from "@/lib/encryption";
import { checkRateLimit } from "@/lib/rate-limit";
import { ProxmoxClient } from "@/lib/proxmox";
import { Address4 } from "ip-address";
import { getBandwidthOptions, bandwidthHourlyCost, BASE_BANDWIDTH_MBPS } from "@/lib/vps-bandwidth";

// Security: Hostname validation regex (RFC 1123)
const HOSTNAME_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

export async function POST(req: NextRequest) {
  try {
    const vpsEnabledSetting = await prisma.setting.findUnique({ where: { key: 'vps_enabled' } });
    if (vpsEnabledSetting && vpsEnabledSetting.value === 'false') {
      return NextResponse.json({ error: "Cloud VPS deployment is currently disabled. Coming soon!" }, { status: 403 });
    }

    let { 
      hostname, username, rootPassword, password, sshKey, templateId, billingMode, planId, 
      cpuCores, ramGb, diskGb, diskType, backupGb, bandwidthMbps, ipv4Count = 1, ipv6Count = 0, paymentMethodCode,
      useIpv4, useIpv6, isKubernetes, kubernetesVersion, action, kubernetesClusterId, billingCycle = 1, reservedIpId, firewallRules, vpcId, privateIpAddress, targetNode
    } = await req.json();
    
    // Support both rootPassword and password for backward compatibility
    const finalPassword = rootPassword || password;

    // Rate Limit: Max 5 orders per 10 minutes per IP
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    const allowed = await checkRateLimit("VPS_ORDER", ip, 5, 600);
    if (!allowed) {
      return NextResponse.json({ error: "Too many orders. Please try again later." }, { status: 429 });
    }

    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    
    const userId = auth.userId!;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (!hostname || !finalPassword || !templateId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Security: Validate hostname format (prevent injection)
    if (!HOSTNAME_REGEX.test(hostname) || hostname.length > 63) {
      return NextResponse.json({ error: "Invalid hostname. Use only letters, numbers, and hyphens (max 63 chars)." }, { status: 400 });
    }

    // Security: Enforce minimum password strength
    if (finalPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
    }
    if (!/[a-zA-Z]/.test(finalPassword) || !/[0-9]/.test(finalPassword)) {
      return NextResponse.json({ error: "Password must contain both letters and numbers." }, { status: 400 });
    }
    
    if (useIpv4 !== undefined) ipv4Count = useIpv4 ? 1 : 0;
    if (useIpv6 !== undefined) ipv6Count = useIpv6 ? 1 : 0;

    ipv4Count = Math.max(0, Math.floor(Number(ipv4Count) || 0));
    ipv6Count = Math.max(0, Math.floor(Number(ipv6Count) || 0));

    let template = await prisma.vpsTemplate.findUnique({ where: { id: templateId } });

    // Enforce Debian-13 template for Kubernetes
    if (isKubernetes) {
      const debian13 = await prisma.vpsTemplate.findFirst({
        where: { name: { contains: "Debian-13", mode: "insensitive" } }
      }) || await prisma.vpsTemplate.findFirst({
        where: { name: { contains: "Debian", mode: "insensitive" } }
      });
      if (debian13) {
        template = debian13;
        templateId = debian13.id;
      }
    }

    if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    let amount = 0;
    const serverConfig = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!serverConfig) return NextResponse.json({ error: "No active Proxmox server configured" }, { status: 500 });
    
    const defaultBridge = serverConfig.networkBridge || "vmbr0";
    const defaultStorage = diskType === "SSD" && serverConfig.mainDiskStorageSsd ? serverConfig.mainDiskStorageSsd : serverConfig.mainDiskStorage;

    if (!defaultStorage) {
      return NextResponse.json({ error: `VPS storage (${diskType || "HDD"}) is not configured by the administrator.` }, { status: 400 });
    }

    const pricingItems = await prisma.vpsPricing.findMany();
    const pricing: Record<string, number> = {};
    pricingItems.forEach(item => {
      pricing[item.key] = item.pricePerHour;
    });

    const safeBackup = Math.min(Math.max(Math.floor(Number(backupGb) || 0), 0), 500);
    const backupCost = safeBackup * (pricing.backup || 0);
    const ipCost = (ipv4Count > 0 ? ipv4Count * (pricing.ipv4 || 0) : 0)
                 + (ipv6Count > 0 ? ipv6Count * (pricing.ipv6 || 0) : 0);

    // Security: bandwidth must be one of the admin-approved tiers (blocks values like 149 Mbps for free)
    const allowedBandwidth = await getBandwidthOptions();
    const requestedBandwidth = bandwidthMbps === undefined || bandwidthMbps === null || bandwidthMbps === ""
      ? BASE_BANDWIDTH_MBPS
      : Number(bandwidthMbps);
    if (!Number.isInteger(requestedBandwidth) || !allowedBandwidth.includes(requestedBandwidth)) {
      return NextResponse.json({ error: `Invalid bandwidth tier. Allowed: ${allowedBandwidth.join(", ")} Mbps` }, { status: 400 });
    }
    const safeBandwidth = requestedBandwidth;
    const bandwidthCost = bandwidthHourlyCost(safeBandwidth, pricing);

    let vpsData: any = {
      userId,
      hostname,
      username: template.name.toLowerCase().includes("windows") ? "Administrator" : (username || "root"),
      osTemplate: template.name,
      rootPassword: encryptDeterministic(finalPassword),
      sshKey: sshKey ? sshKey.trim() : null,
      status: "PENDING_PAYMENT", 
      node: targetNode || "proxmox", // dynamically selected node or default
      networkBridge: defaultBridge,
      storageId: defaultStorage,
      diskType: diskType || "HDD",
      backupGb: safeBackup,
      bandwidthMbps: safeBandwidth,
      vpcId: vpcId ? Number(vpcId) : undefined,
      vpcIp: privateIpAddress ? privateIpAddress.trim() : null
    };

    // Security: Validate VPC ownership to prevent IDOR (attaching VPS to another user's VPC)
    // Enforce VPC as mandatory
    if (!vpcId) {
      return NextResponse.json({ error: "Virtual Private Cloud (VPC) is mandatory for deployment. Please select or create a VPC." }, { status: 400 });
    }

    // Enforce Public IPv4 as mandatory for K3s deployments (except worker nodes)
    if (isKubernetes && action !== "add_node" && !reservedIpId && ipv4Count < 1) {
      return NextResponse.json({ error: "A Public IPv4 address is strictly required for Kubernetes Master Nodes." }, { status: 400 });
    }
    
    if (vpcId) {
      const vpc = await prisma.vpcNetwork.findUnique({
        where: { id: Number(vpcId) },
        include: { 
          vpsServices: { 
            where: { status: { notIn: ["TERMINATED", "TERMINATING"] } },
            select: { vpcIp: true } 
          } 
        }
      });
      if (!vpc) {
        return NextResponse.json({ error: "VPC not found" }, { status: 404 });
      }
      if (vpc.userId !== userId) {
        return NextResponse.json({ error: "Unauthorized: VPC does not belong to you" }, { status: 403 });
      }
      
      if (privateIpAddress) {
        const ip = privateIpAddress.trim();
        
        try {
          const requestedIp = new Address4(ip);
          const vpcSubnet = new Address4(vpc.cidr);
          
          if (!requestedIp.isInSubnet(vpcSubnet)) {
            return NextResponse.json({ error: `The requested IP address (${ip}) is outside the VPC network bounds (${vpc.cidr}).` }, { status: 400 });
          }
        } catch (e) {
          return NextResponse.json({ error: "Invalid private IP address format." }, { status: 400 });
        }

        if (ip === vpc.gateway) {
          return NextResponse.json({ error: "IP address is reserved for the VPC Gateway." }, { status: 400 });
        }
        const isIpUsed = vpc.vpsServices?.some(v => v.vpcIp === ip);
        if (isIpUsed) {
          return NextResponse.json({ error: "IP address is already in use by another VM in this VPC." }, { status: 400 });
        }
      }
    }


      // Security: Validate resource limits to prevent abuse
      const safeCpu = Math.min(Math.max(Math.floor(Number(cpuCores) || 1), 1), 32);
      const safeRam = Math.min(Math.max(Math.floor(Number(ramGb) || 1), 1), 128);
      const safeDisk = Math.min(Math.max(Math.floor(Number(diskGb) || 10), 10), 2000);
      // safeBackup is already defined and validated earlier

      // --- Node Capacity Check ---
      try {
        const proxmox = new ProxmoxClient(serverConfig.host, serverConfig.tokenId, decryptDeterministic(serverConfig.tokenSecret));
        const activeNode = targetNode || "proxmox";
        
        const nodeStatus = await proxmox.getNodeStatus(activeNode);
        if (nodeStatus && nodeStatus.memory && nodeStatus.cpuinfo) {
           const totalRam = nodeStatus.memory.total;
           const usedRam = nodeStatus.memory.used;
           const requestedRamBytes = safeRam * 1024 * 1024 * 1024;
           
           if ((usedRam + requestedRamBytes) / totalRam > 0.95) {
             return NextResponse.json({ error: "The target region is currently at maximum memory capacity. Please try again later." }, { status: 503 });
           }
           
           // For CPU we can just check if cpu usage is very high (e.g., > 95%)
           if (nodeStatus.cpu > 0.95) {
             return NextResponse.json({ error: "The target region is currently experiencing high CPU load. Please try again later." }, { status: 503 });
           }
        }

        const storages = await proxmox.getStorages(activeNode);
        const targetStorageData = storages.find((s: any) => s.storage === defaultStorage);
        if (targetStorageData && targetStorageData.total) {
           const requestedDiskBytes = safeDisk * 1024 * 1024 * 1024;
           if ((targetStorageData.used + requestedDiskBytes) / targetStorageData.total > 0.95) {
             return NextResponse.json({ error: "The target region is currently out of disk storage capacity. Please try again later." }, { status: 503 });
           }
        }
      } catch (err) {
        console.error("Failed to check node capacity:", err);
        // We log the error but don't strictly block if API fails occasionally, 
        // or we can choose to block:
        // return NextResponse.json({ error: "Failed to verify region capacity. Please try again." }, { status: 500 });
      }
      // --- End Node Capacity Check ---

      const currentDiskPrice = diskType === "SSD" ? (pricing.diskSsd || pricing.disk || 0) : (pricing.disk || 0);
      const diskCost = safeDisk * currentDiskPrice;

      // stoppedRate: costs that accrue even when VM is powered off (disk, backup, IPs, bandwidth rate)
      const stoppedRate = diskCost + backupCost + ipCost + bandwidthCost;

      // hourlyRate: full cost when VM is running (adds CPU + RAM on top)
      const cpuCost = safeCpu * (pricing.vcpu || 0);
      const ramCost = safeRam * (pricing.ram || 0);
      const hourlyRate = stoppedRate + cpuCost + ramCost;

      // Security: Prevent abuse by requiring 1 month equivalent balance upfront for PAYG
      const requiredBalance = hourlyRate * 730;
      if (user.balance < requiredBalance) {
        return NextResponse.json({ error: `A minimum balance of Rp ${requiredBalance.toLocaleString('id-ID')} (1 month estimation) is required to deploy this specification to prevent abuse. Please top up first.` }, { status: 400 });
      }

      vpsData.cpuCores = safeCpu;
      vpsData.ramGb = safeRam;
      vpsData.diskGb = safeDisk;
      vpsData.backupGb = safeBackup; // Save the backup capacity to the VPS service model
      vpsData.hourlyRate = hourlyRate; 
      vpsData.stoppedRate = stoppedRate;
      vpsData.accumulatedCost = hourlyRate; // First hour is charged upfront
      
      // Set billing cycle to exactly 1 month from now
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      vpsData.expiresAt = expiresAt;
      vpsData.expiresAt = expiresAt;
      vpsData.status = "PENDING"; // Instantly start provisioning since no upfront payment is needed
    // If isKubernetes is true, handle cluster association or creation
    let k3sClusterId: number | undefined = undefined;
    if (isKubernetes) {
      if (action === "add_node" && kubernetesClusterId) {
        const cluster = await prisma.kubernetesCluster.findFirst({
          where: { id: Number(kubernetesClusterId), userId }
        });
        if (!cluster) {
          return NextResponse.json({ error: "Kubernetes cluster not found or access denied" }, { status: 404 });
        }
        if (cluster.status !== "RUNNING") {
          return NextResponse.json({ error: "Cannot add nodes while the cluster is not in RUNNING state. Please wait for the master node to finish provisioning." }, { status: 400 });
        }
        k3sClusterId = cluster.id;
        vpsData.kubernetesClusterId = k3sClusterId;
        vpsData.kubernetesRole = "WORKER";
      } else {
        const k3s = await prisma.kubernetesCluster.create({
          data: {
            name: hostname,
            userId,
            version: kubernetesVersion || "v1.31",
            status: "PENDING"
          }
        });
        k3sClusterId = k3s.id;
        vpsData.kubernetesClusterId = k3sClusterId;
        vpsData.kubernetesRole = "MASTER"; // First node is master
      }
    }

    // Create the VPS Service record
    const vpsService = await prisma.vpsService.create({
      data: vpsData
    });


      try {
        await prisma.$transaction(async (tx) => {
          const updateResult = await tx.user.updateMany({
            where: { id: userId, balance: { gte: vpsData.hourlyRate } },
            data: { balance: { decrement: vpsData.hourlyRate } }
          });

          if (updateResult.count === 0) {
            throw new Error("INSUFFICIENT_BALANCE");
          }

          const invoiceNumber = `INV-PAYG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          // Create the running invoice — this single invoice will be updated every hour by the cron
          await tx.invoice.create({
            data: {
              invoiceNumber,
              userId,
              vpsServiceId: vpsService.id,
              amount: vpsData.hourlyRate,
              status: "PAID",
              merchantOrderId: invoiceNumber,
              type: "VPS",
              paymentMethod: "Account Balance",
              paidAt: new Date(),
              reference: "PAYG_RUNNING"
            }
          });
        });
      } catch (txError: any) {
        await prisma.vpsService.delete({ where: { id: vpsService.id } });
        if (k3sClusterId && action !== "add_node") {
          await prisma.kubernetesCluster.delete({ where: { id: k3sClusterId } });
        }
        if (txError.message === "INSUFFICIENT_BALANCE") {
          return NextResponse.json({ error: "Insufficient account balance for PAYG initialization" }, { status: 400 });
        }
        throw txError;
      }

      // Process affiliate commission if applicable
      if (auth.user?.referredById) {
        try {
          const existingEarning = await prisma.affiliateEarning.findUnique({
            where: { referredId: userId }
          });
          
          if (!existingEarning) {
            await prisma.$transaction([
              prisma.affiliateEarning.create({
                data: {
                  referrerId: auth.user.referredById,
                  referredId: userId,
                  amount: 5000,
                  description: `Commission from first VPS purchase by ${user.name || 'referred user'}`
                }
              }),
              prisma.user.update({
                where: { id: auth.user.referredById },
                data: { affiliateBalance: { increment: 5000 } }
              })
            ]);
          }
        } catch (affiliateErr) {
          console.error("Failed to process affiliate commission:", affiliateErr);
        }
      }

      // Trigger the provisioning via Job Queue
      import('@/lib/job-queue').then(({ JobQueueService }) => {
        JobQueueService.enqueue('PROVISION_VPS', { 
          vpsId: vpsService.id, 
          options: { ipv4Count, ipv6Count, reservedIpId, firewallRules, vpcId },
          userId,
          hourlyRate: vpsData.hourlyRate,
          k3sClusterId,
          action
        })
        .catch((err) => console.error(`Failed to enqueue PROVISION_VPS job for VPS ID ${vpsService.id}:`, err));
      });

      return NextResponse.json({ success: true, vpsId: vpsService.id, k3sClusterId });


  } catch (error) {
    console.error("VPS Order Error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
