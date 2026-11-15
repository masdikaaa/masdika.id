import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { Address6 } from "ip-address";

const CANONICAL_IPV4_REGEX = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

function ipv4ToNum(ip: string): number {
  const parts = ip.split(".").map(Number);
  return parts[0] * 16777216 + parts[1] * 65536 + parts[2] * 256 + parts[3];
}

/**
 * Returns Elastic IP pool capacity counts and hourly pricing per IP version
 * WITHOUT exposing specific free IP addresses to the client.
 */
export async function GET() {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });

    const [pools, pricingItems, vpsAssignments, reservedIps] = await Promise.all([
      prisma.ipPool.findMany({ where: { type: "PUBLIC" } }),
      prisma.vpsPricing.findMany(),
      prisma.vpsIpAssignment.findMany({ select: { ipPoolId: true, ipAddress: true } }),
      prisma.reservedIp.findMany({ select: { ipPoolId: true, ipAddress: true } }),
    ]);

    const pricingMap: Record<string, number> = {};
    pricingItems.forEach((p) => {
      pricingMap[p.key] = p.pricePerHour;
    });

    const usedCountByPool = new Map<number, number>();
    const countedSet = new Set<string>();
    for (const row of [...vpsAssignments, ...reservedIps]) {
      const k = `${row.ipPoolId}:${row.ipAddress}`;
      if (!countedSet.has(k)) {
        countedSet.add(k);
        usedCountByPool.set(row.ipPoolId, (usedCountByPool.get(row.ipPoolId) || 0) + 1);
      }
    }

    let ipv4Available = 0;
    let ipv6Available = 0;

    for (const pool of pools) {
      if (!pool.startIp || !pool.endIp) continue;
      const used = usedCountByPool.get(pool.id) || 0;

      if (pool.version === 4) {
        if (!CANONICAL_IPV4_REGEX.test(pool.startIp) || !CANONICAL_IPV4_REGEX.test(pool.endIp)) continue;
        const total = Math.max(0, ipv4ToNum(pool.endIp) - ipv4ToNum(pool.startIp) + 1);
        const gatewayDeduction = pool.gateway && !countedSet.has(`${pool.id}:${pool.gateway}`) ? 1 : 0;
        ipv4Available += Math.max(0, total - used - gatewayDeduction);
      } else if (pool.version === 6) {
        try {
          const startBig = (new Address6(pool.startIp) as any).bigInteger() as bigint;
          const endBig = (new Address6(pool.endIp) as any).bigInteger() as bigint;
          const totalBig = endBig >= startBig ? endBig - startBig + BigInt(1) : BigInt(0);
          const capped = totalBig > BigInt(100000) ? 100000 : Number(totalBig);
          ipv6Available += Math.max(0, capped - used);
        } catch {
          // ignore malformed ipv6 range
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ipv4: {
          availableCount: ipv4Available,
          pricePerHour: pricingMap["ipv4"] || 0,
        },
        ipv6: {
          availableCount: ipv6Available,
          pricePerHour: pricingMap["ipv6"] || 0,
        },
      },
    });
  } catch (error) {
    console.error("Elastic IP pool status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
