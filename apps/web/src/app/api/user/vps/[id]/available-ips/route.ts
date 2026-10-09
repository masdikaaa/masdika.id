import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    const user = authResult.user!;

    const { id } = await params;
    const vpsId = parseInt(id);

    // Verify VPS ownership
    const vps = await prisma.vpsService.findFirst({
      where: {
        id: vpsId,
        userId: user.id,
      },
      include: {
        assignedIps: {
          include: { ipPool: true }
        }
      }
    });

    if (!vps) {
      return NextResponse.json({ error: "VPS not found" }, { status: 404 });
    }

    const hasIpv4 = vps.assignedIps.some((a: any) => a.ipPool.version === 4);
    const hasIpv6 = vps.assignedIps.some((a: any) => a.ipPool.version === 6);

    const poolVersions = [];
    if (hasIpv4) poolVersions.push(4);
    if (hasIpv6) poolVersions.push(6);

    if (poolVersions.length === 0) {
      // Fallback if no IPs assigned, maybe assume IPv4
      poolVersions.push(4);
    }

    // Get all public pools for versions the user has
    const pools = await prisma.ipPool.findMany({
      where: {
        version: { in: poolVersions },
        type: "PUBLIC"
      },
      include: { assignedIps: true }
    });

    const ipToNum = (parts: number[]) => 
      (parts[0] * Math.pow(2, 24)) + 
      (parts[1] * Math.pow(2, 16)) + 
      (parts[2] * Math.pow(2, 8)) + 
      parts[3];

    const numToIp = (num: number) => [
      Math.floor(num / Math.pow(2, 24)) % 256,
      Math.floor(num / Math.pow(2, 16)) % 256,
      Math.floor(num / Math.pow(2, 8)) % 256,
      num % 256
    ].join('.');

    let availableIps: Array<{ id: number, ipAddress: string, gateway: string, netmask: string }> = [];

    for (const pool of pools) {
      if (!pool.startIp || !pool.endIp) continue;

      if (pool.version === 4) {
        const startParts = pool.startIp.split('.').map(Number);
        const endParts = pool.endIp.split('.').map(Number);
        if (startParts.length !== 4 || endParts.length !== 4) continue;

        const startNum = ipToNum(startParts);
        const endNum = ipToNum(endParts);

        const assignedIps = new Set(pool.assignedIps.map((a: any) => a.ipAddress));

        for (let i = startNum; i <= endNum; i++) {
          const candidateIp = numToIp(i);
          if (candidateIp !== pool.gateway && !assignedIps.has(candidateIp)) {
            availableIps.push({
              id: pool.id,
              ipAddress: candidateIp,
              gateway: pool.gateway || "",
              netmask: pool.network || ""
            });
          }
        }
      } else if (pool.version === 6) {
        // Simplified IPv6 availability checking logic can be added here in the future
        // Since we don't have IPv6 prefixes added currently, this branch won't execute anyway
      }
    }

    return NextResponse.json({ ips: availableIps });
  } catch (error: any) {
    console.error("Error fetching available IPs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
