import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";
import { Address4, Address6 } from "ip-address";

// ---- IPv4 helpers ----
function ipv4ToNum(ip: string): number {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3]) >>> 0;
}

function numToIpv4(num: number): string {
  return `${(num >>> 24) & 255}.${(num >>> 16) & 255}.${(num >>> 8) & 255}.${num & 255}`;
}

/**
 * Generate all usable IPv4 host IPs from a CIDR network.
 * Works for ANY prefix length (/8 to /30).
 * Respects startIp/endIp bounds if provided.
 * Excludes gateway, network address, and broadcast address.
 */
function generateIpv4FromCidr(network: string, gateway: string, startIp?: string | null, endIp?: string | null): string[] {
  const ips: string[] = [];
  try {
    const addr = new Address4(network);
    const netNum = ipv4ToNum(addr.startAddress().address);
    const bcastNum = ipv4ToNum(addr.endAddress().address);

    let rangeStart = netNum + 1;   // First host
    let rangeEnd = bcastNum - 1;   // Last host (before broadcast)

    // For /31 or /32 point-to-point links
    if (bcastNum - netNum <= 1) {
      rangeStart = netNum;
      rangeEnd = bcastNum;
    }

    // Narrow to startIp/endIp if provided
    if (startIp) rangeStart = Math.max(rangeStart, ipv4ToNum(startIp));
    if (endIp) rangeEnd = Math.min(rangeEnd, ipv4ToNum(endIp));

    const gatewayNum = ipv4ToNum(gateway);

    for (let i = rangeStart; i <= rangeEnd; i++) {
      if (i !== gatewayNum && i !== netNum && i !== bcastNum) {
        ips.push(numToIpv4(i));
      }
    }
  } catch (e) {
    console.error("IPv4 CIDR parse error:", e);
  }
  return ips;
}

// ---- IPv6 helpers ----
function ipv6ToBigInt(ip: string): bigint {
  try {
    const addr = new Address6(ip);
    const hex = addr.canonicalForm().replace(/:/g, '');
    return BigInt('0x' + hex);
  } catch (e) {
    return BigInt(0);
  }
}

function bigIntToIpv6(num: bigint): string {
  const hex = num.toString(16).padStart(32, '0');
  const groups: string[] = [];
  for (let i = 0; i < 32; i += 4) {
    groups.push(hex.slice(i, i + 4));
  }
  // Simplify: remove leading zeros per group
  return groups.map(g => g.replace(/^0+/, '') || '0').join(':');
}

const MAX_IPV6_LIST = 4096; // Cap to prevent memory issues on large subnets

/**
 * Generate usable IPv6 host IPs from a CIDR network.
 * Works for ANY prefix length.
 * For large subnets like /64, we cap at MAX_IPV6_LIST to prevent memory issues.
 * Respects startIp/endIp bounds if provided.
 */
function generateIpv6FromCidr(network: string, gateway: string, startIp?: string | null, endIp?: string | null): string[] {
  const ips: string[] = [];
  try {
    const addr = new Address6(network);
    const startAddr = ipv6ToBigInt(addr.startAddress().address);
    const endAddr = ipv6ToBigInt(addr.endAddress().address);

    let rangeStart = startAddr + BigInt(1); // Skip network address
    let rangeEnd = endAddr;

    // Narrow range if startIp/endIp provided
    if (startIp) {
      const s = ipv6ToBigInt(startIp);
      if (s > rangeStart) rangeStart = s;
    }
    if (endIp) {
      const e = ipv6ToBigInt(endIp);
      if (e < rangeEnd) rangeEnd = e;
    }

    // Cap to prevent generating billions of IPs
    if (rangeEnd - rangeStart > BigInt(MAX_IPV6_LIST)) {
      rangeEnd = rangeStart + BigInt(MAX_IPV6_LIST) - BigInt(1);
    }

    const gatewayNum = ipv6ToBigInt(gateway);

    for (let i = rangeStart; i <= rangeEnd; i++) {
      if (i !== gatewayNum) {
        ips.push(bigIntToIpv6(i));
      }
    }
  } catch (e) {
    console.error("IPv6 CIDR parse error:", e);
  }
  return ips;
}

// GET assigned IPs for a VPS + available IPs from all pools
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });

    const { id } = await params;
    const vpsId = parseInt(id);

    const ips = await prisma.vpsIpAssignment.findMany({
      where: { vpsId },
      include: { ipPool: true }
    });

    // Get all pools and all assignments to compute available IPs
    const pools = await prisma.ipPool.findMany({ include: { assignedIps: true } });
    const availableIps: { ip: string; poolId: number; poolNetwork: string; version: number }[] = [];

    for (const pool of pools) {
      const usedIps = new Set(pool.assignedIps.map(a => a.ipAddress));

      if (pool.version === 4) {
        const allIps = generateIpv4FromCidr(pool.network, pool.gateway, pool.startIp, pool.endIp);
        for (const ip of allIps) {
          if (!usedIps.has(ip)) {
            availableIps.push({ ip, poolId: pool.id, poolNetwork: pool.network, version: 4 });
          }
        }
      } else if (pool.version === 6) {
        const allIps = generateIpv6FromCidr(pool.network, pool.gateway, pool.startIp, pool.endIp);
        for (const ip of allIps) {
          if (!usedIps.has(ip)) {
            availableIps.push({ ip, poolId: pool.id, poolNetwork: pool.network, version: 6 });
          }
        }
      }
    }

    return NextResponse.json({ ips, availableIps });
  } catch (error: any) {
    console.error("Fetch IPs Error:", error);
    return NextResponse.json({ error: "Failed to fetch IPs" }, { status: 500 });
  }
}

// Helper: extract prefix length from CIDR network string
function getPrefixFromCidr(network: string): number {
  const parts = network.split('/');
  return parts.length > 1 ? parseInt(parts[1]) : (network.includes(':') ? 64 : 24);
}

// Assign a new IP to a VPS
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });

    const { id } = await params;
    const vpsId = parseInt(id);
    const { ipAddress } = await req.json();

    if (!ipAddress) return NextResponse.json({ error: "IP Address is required" }, { status: 400 });

    const vps = await prisma.vpsService.findUnique({ where: { id: vpsId } });
    if (!vps) return NextResponse.json({ error: "VPS not found" }, { status: 404 });

    // Validate IP and find matching pool
    let isIpv6 = ipAddress.includes(":");
    try {
      if (isIpv6) {
        new Address6(ipAddress);
      } else {
        new Address4(ipAddress);
      }
    } catch (e) {
      return NextResponse.json({ error: "Invalid IP address format" }, { status: 400 });
    }

    // Find matching IP Pool
    const pools = await prisma.ipPool.findMany({ where: { version: isIpv6 ? 6 : 4 } });
    let matchedPool: any = null;

    for (const pool of pools) {
      try {
        if (isIpv6) {
          const addr = new Address6(ipAddress);
          const subnet = new Address6(pool.network);
          if (addr.isInSubnet(subnet)) {
            matchedPool = pool;
            break;
          }
        } else {
          const addr = new Address4(ipAddress);
          const subnet = new Address4(pool.network);
          if (addr.isInSubnet(subnet)) {
            matchedPool = pool;
            break;
          }
        }
      } catch (e) {}
    }

    if (!matchedPool) {
      return NextResponse.json({ error: "No matching IP Pool found for this IP network" }, { status: 400 });
    }

    // Check if IP is already used
    const existing = await prisma.vpsIpAssignment.findFirst({
      where: { ipPoolId: matchedPool.id, ipAddress }
    });

    if (existing) {
      return NextResponse.json({ error: "IP address is already assigned to a VPS" }, { status: 400 });
    }

    // Check how many IPs are already assigned to this VPS (to determine net index)
    const existingAssignments = await prisma.vpsIpAssignment.findMany({
      where: { vpsId },
      orderBy: { id: 'asc' }
    });

    // Assign IP in DB
    const assignment = await prisma.vpsIpAssignment.create({
      data: {
        vpsId,
        ipPoolId: matchedPool.id,
        ipAddress,
        isPrimary: existingAssignments.length === 0 // First IP is primary
      }
    });

    // Configure on Proxmox: add network interface + Cloud-Init ipconfig + Firewall IPSet
    if (vps.vmid) {
      const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
      if (server) {
        const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
        const bridge = matchedPool.type === 'PUBLIC' && server.publicNetworkBridge 
          ? server.publicNetworkBridge 
          : (vps.networkBridge || "vmbr0");
        const prefix = getPrefixFromCidr(matchedPool.network);

        // Determine the next net/ipconfig index
        // net0 + ipconfig0 = primary (already exists from provisioning)
        // net1 + ipconfig1 = 2nd IP, etc.
        const netIndex = existingAssignments.length; // 0-indexed, but 0 is primary

        if (netIndex > 0) {
          // Add a new virtual NIC on the same bridge
          const vmConfig: any = {};
          vmConfig[`net${netIndex}`] = `virtio,bridge=${bridge},firewall=1`;
          
          // Set Cloud-Init ipconfig for this new interface
          // Secondary IPs don't need a gateway (traffic routes via primary)
          if (isIpv6) {
            vmConfig[`ipconfig${netIndex}`] = `ip6=${ipAddress}/${prefix}`;
          } else {
            vmConfig[`ipconfig${netIndex}`] = `ip=${ipAddress}/${prefix}`;
          }

          try {
            await proxmox.configVm(vps.node, vps.vmid, vmConfig);
          } catch (e: any) {
            console.error(`Failed to add net${netIndex}/ipconfig${netIndex} to VM:`, e);
          }
        }

        // Update Firewall IPSet for ALL interfaces
        // Ensure IPSet exists for net0 (primary)
        try {
          await proxmox.createFirewallIpSet(vps.node, vps.vmid, "ipfilter-net0", "Allowed IPs for net0");
        } catch (e: any) { /* already exists */ }

        // Also create IPSet for the new net interface
        if (netIndex > 0) {
          try {
            await proxmox.createFirewallIpSet(vps.node, vps.vmid, `ipfilter-net${netIndex}`, `Allowed IPs for net${netIndex}`);
          } catch (e: any) { /* already exists */ }

          try {
            const cidr = isIpv6 ? `${ipAddress}/128` : `${ipAddress}/32`;
            await proxmox.addIpToFirewallIpSet(vps.node, vps.vmid, cidr, `ipfilter-net${netIndex}`);
          } catch (e: any) {
            console.error("Failed to add IP to Proxmox IPSet", e);
          }
        } else {
          // Primary IP, add to ipfilter-net0
          try {
            const cidr = isIpv6 ? `${ipAddress}/128` : `${ipAddress}/32`;
            await proxmox.addIpToFirewallIpSet(vps.node, vps.vmid, cidr, "ipfilter-net0");
          } catch (e: any) {
            console.error("Failed to add IP to Proxmox IPSet", e);
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      assignment,
      message: existingAssignments.length > 0 
        ? `IP ${ipAddress} assigned as additional IP (net${existingAssignments.length}). A VM reboot may be needed for Cloud-Init to apply.` 
        : `IP ${ipAddress} assigned as primary IP.`
    });

  } catch (error: any) {
    console.error("Assign IP Error:", error);
    return NextResponse.json({ error: error.message || "Failed to assign IP" }, { status: 500 });
  }
}

// Remove an assigned IP from a VPS
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });

    const { id } = await params;
    const vpsId = parseInt(id);
    const { searchParams } = new URL(req.url);
    const assignmentId = parseInt(searchParams.get("assignmentId") || "0");

    if (!assignmentId) return NextResponse.json({ error: "assignmentId is required" }, { status: 400 });

    const assignment = await prisma.vpsIpAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment || assignment.vpsId !== vpsId) {
      return NextResponse.json({ error: "IP assignment not found" }, { status: 404 });
    }

    const vps = await prisma.vpsService.findUnique({ where: { id: vpsId } });

    // Find the index of this IP among all assignments
    const allAssignments = await prisma.vpsIpAssignment.findMany({
      where: { vpsId },
      orderBy: { id: 'asc' }
    });
    const ipIndex = allAssignments.findIndex(a => a.id === assignmentId);

    // Remove from Proxmox
    if (vps && vps.vmid) {
      const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
      if (server) {
        const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);

        // Remove from Firewall IPSet
        const ipSetName = ipIndex > 0 ? `ipfilter-net${ipIndex}` : "ipfilter-net0";
        try {
          const isIpv6 = assignment.ipAddress.includes(":");
          const cidr = isIpv6 ? `${assignment.ipAddress}/128` : `${assignment.ipAddress}/32`;
          await proxmox.removeIpFromFirewallIpSet(vps.node, vps.vmid, cidr, ipSetName);
        } catch (e: any) {
          console.error("Failed to remove IP from Proxmox IPSet", e);
        }

        // Remove the network interface and ipconfig if it's not the primary (net0)
        if (ipIndex > 0) {
          try {
            // Proxmox: to remove a config key, use the "delete" parameter
            await proxmox.configVm(vps.node, vps.vmid, {
              delete: `net${ipIndex},ipconfig${ipIndex}`
            });
          } catch (e: any) {
            console.error(`Failed to remove net${ipIndex}/ipconfig${ipIndex}:`, e);
          }
        }
      }
    }

    // Delete from DB
    await prisma.vpsIpAssignment.delete({ where: { id: assignmentId } });

    // After deletion, re-index remaining assignments' net interfaces
    // This is needed because if we remove net1 and net2 still exists, Proxmox gets confused
    const remainingAssignments = await prisma.vpsIpAssignment.findMany({
      where: { vpsId },
      orderBy: { id: 'asc' },
      include: { ipPool: true }
    });

    if (vps && vps.vmid && ipIndex > 0 && ipIndex < allAssignments.length - 1) {
      // We removed a middle interface, need to re-index
      const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
      if (server) {
        const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
        const bridge = vps.networkBridge || "vmbr0";

        // First, remove all interfaces after ipIndex
        for (let i = ipIndex; i < allAssignments.length - 1; i++) {
          try {
            await proxmox.configVm(vps.node, vps.vmid, {
              delete: `net${i + 1},ipconfig${i + 1}`
            });
          } catch (e) {}
        }

        // Re-add them with correct indices
        for (let i = 1; i < remainingAssignments.length; i++) {
          const ra = remainingAssignments[i];
          const isIpv6 = ra.ipAddress.includes(":");
          const prefix = ra.ipPool ? getPrefixFromCidr(ra.ipPool.network) : (isIpv6 ? 64 : 24);
          
          const targetBridge = (ra.ipPool && ra.ipPool.type === 'PUBLIC' && server.publicNetworkBridge) 
            ? server.publicNetworkBridge 
            : bridge;

          const vmConfig: any = {};
          vmConfig[`net${i}`] = `virtio,bridge=${targetBridge},firewall=1`;
          if (isIpv6) {
            vmConfig[`ipconfig${i}`] = `ip6=${ra.ipAddress}/${prefix}`;
          } else {
            vmConfig[`ipconfig${i}`] = `ip=${ra.ipAddress}/${prefix}`;
          }
          try {
            await proxmox.configVm(vps.node, vps.vmid, vmConfig);
          } catch (e) {}
        }
      }
    }

    return NextResponse.json({ 
      success: true,
      message: ipIndex > 0 
        ? "IP removed. A VM reboot may be needed for changes to take effect."
        : "Primary IP removed from database."
    });

  } catch (error: any) {
    console.error("Remove IP Error:", error);
    return NextResponse.json({ error: error.message || "Failed to remove IP" }, { status: 500 });
  }
}

// Update an assigned IP (e.g. setting publicIp)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });

    const { id } = await params;
    const vpsId = parseInt(id);
    const { assignmentId, publicIp } = await req.json();

    if (!assignmentId) return NextResponse.json({ error: "assignmentId is required" }, { status: 400 });

    const assignment = await prisma.vpsIpAssignment.findUnique({ where: { id: assignmentId } });
    if (!assignment || assignment.vpsId !== vpsId) {
      return NextResponse.json({ error: "IP assignment not found" }, { status: 404 });
    }

    const updated = await prisma.vpsIpAssignment.update({
      where: { id: assignmentId },
      data: {
        publicIp: publicIp ? publicIp : null
      }
    });

    return NextResponse.json({
      success: true,
      assignment: updated,
      message: "Public IP configuration updated successfully."
    });

  } catch (error: any) {
    console.error("Update IP Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update IP" }, { status: 500 });
  }
}

