import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { assertSufficientCommitmentBalance } from "@/lib/billing-commitment";
import { Address6 } from "ip-address";

const CANONICAL_IPV4_REGEX = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

function ipv4ToNum(ip: string): number {
  const parts = ip.split(".").map(Number);
  return (
    parts[0] * 16777216 +
    parts[1] * 65536 +
    parts[2] * 256 +
    parts[3]
  );
}

function numToIpv4(num: number): string {
  return [
    (num >>> 24) & 255,
    (num >>> 16) & 255,
    (num >>> 8) & 255,
    num & 255,
  ].join(".");
}

function formatIpv6FromBigInt(val: bigint): string {
  const hex = val.toString(16).padStart(32, "0");
  const groups = hex.match(/.{1,4}/g) || [];
  try {
    return new Address6(groups.join(":")).correctForm();
  } catch {
    return groups.join(":");
  }
}

export async function GET() {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });

    const ips = await prisma.reservedIp.findMany({
      where: { userId: authResult.user!.id },
      include: {
        vps: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(ips);
  } catch (error: any) {
    console.error("Fetch Reserved IPs Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Rate Limit: Max 5 IP allocations per 10 minutes per client IP
    const clientIp =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const allowed = await checkRateLimit("IP_RESERVE", clientIp, 5, 600);
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    const user = authResult.user!;

    // Elastic IP model: client selects protocol version only (4 or 6).
    // Specific IP addresses cannot be hand-picked by the client.
    const body = await req.json().catch(() => ({}));
    const version = Number(body?.version) === 6 ? 6 : 4;

    // Get IP pricing (fail closed if unconfigured)
    const pricingItems = await prisma.vpsPricing.findMany();
    const pricingKey = version === 6 ? "ipv6" : "ipv4";
    const ipPricing = pricingItems.find((p) => p.key === pricingKey);
    if (!ipPricing || !Number.isSafeInteger(ipPricing.pricePerHour) || ipPricing.pricePerHour <= 0) {
      return NextResponse.json({ error: `Elastic IPv${version} pricing is not configured.` }, { status: 503 });
    }
    const ipPricePerHour = ipPricing.pricePerHour;

    // Fetch public IP pools for the requested protocol version
    const pools = await prisma.ipPool.findMany({
      where: { version, type: "PUBLIC" },
      orderBy: { id: "asc" },
    });
    if (pools.length === 0) {
      return NextResponse.json({ error: `No public IPv${version} pool is currently configured.` }, { status: 409 });
    }

    const newIpMonthly = ipPricePerHour * 730;
    let requiredBalance = newIpMonthly;

    try {
      const result = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;
        const freshUser = await tx.user.findUnique({
          where: { id: user.id },
          select: { balance: true },
        });
        try {
          const commitmentCheck = await assertSufficientCommitmentBalance({
            userId: user.id,
            userBalance: freshUser?.balance || 0,
            newServiceMonthly: newIpMonthly,
            serviceName: `Elastic IPv${version}`,
            tx,
          });
          requiredBalance = commitmentCheck.requiredBalance;
        } catch (commitmentErr: any) {
          throw new Error(`COMMITMENT_ERROR:${commitmentErr.message}`);
        }

        // Quota Limit enforced atomically inside transaction: Max 5 Reserved IPs per User Account
        if (user.role === "USER") {
          const existingReservedIpsCount = await tx.reservedIp.count({
            where: { userId: user.id },
          });
          if (existingReservedIpsCount >= 5) {
            throw new Error("QUOTA_EXCEEDED");
          }
        }

        let allocatedIp: string | null = null;
        let allocatedPoolId: number | null = null;

        for (const pool of pools) {
          if (!pool.startIp || !pool.endIp) continue;

          // Row-level lock on IpPool to serialize concurrent allocations
          await tx.ipPool.update({
            where: { id: pool.id },
            data: { updatedAt: new Date() },
          });

          const [usedByVps, usedByReserved] = await Promise.all([
            tx.vpsIpAssignment.findMany({
              where: { ipPoolId: pool.id },
              select: { ipAddress: true },
            }),
            tx.reservedIp.findMany({
              where: { ipPoolId: pool.id },
              select: { ipAddress: true },
            }),
          ]);

          const takenSet = new Set<string>([
            ...usedByVps.map((x) => x.ipAddress),
            ...usedByReserved.map((x) => x.ipAddress),
          ]);
          if (pool.gateway) takenSet.add(pool.gateway);

          if (version === 4) {
            if (!CANONICAL_IPV4_REGEX.test(pool.startIp) || !CANONICAL_IPV4_REGEX.test(pool.endIp)) {
              continue;
            }
            const startNum = ipv4ToNum(pool.startIp);
            const endNum = ipv4ToNum(pool.endIp);
            if (endNum < startNum) continue;

            const availableCandidates: string[] = [];
            const maxScan = Math.min(endNum, startNum + 4096);
            for (let n = startNum; n <= maxScan; n++) {
              const candidate = numToIpv4(n);
              if (!takenSet.has(candidate)) {
                availableCandidates.push(candidate);
              }
            }

            if (availableCandidates.length > 0) {
              // Pick randomly among available pool IPs so allocation feels elastic & unpredictable
              const randomIdx = crypto.randomInt(0, availableCandidates.length);
              allocatedIp = availableCandidates[randomIdx];
              allocatedPoolId = pool.id;
              break;
            }
          } else {
            try {
              const startBig = (new Address6(pool.startIp) as any).bigInteger() as bigint;
              const endBig = (new Address6(pool.endIp) as any).bigInteger() as bigint;
              if (endBig < startBig) continue;

              const limit = startBig + BigInt(512);
              const scanEnd = endBig < limit ? endBig : limit;
              for (let cur = startBig; cur <= scanEnd; cur += BigInt(1)) {
                const candidate = formatIpv6FromBigInt(cur);
                if (!takenSet.has(candidate)) {
                  allocatedIp = candidate;
                  allocatedPoolId = pool.id;
                  break;
                }
              }
              if (allocatedIp) break;
            } catch {
              continue;
            }
          }
        }

        if (!allocatedIp || !allocatedPoolId) {
          throw new Error("NO_AVAILABLE_IPS");
        }

        // Enforce full 730h balance requirement atomically while charging 1st hour upfront
        const updateResult = await tx.user.updateMany({
          where: { id: user.id, balance: { gte: requiredBalance } },
          data: { balance: { decrement: ipPricePerHour } },
        });
        if (updateResult.count === 0) throw new Error(`COMMITMENT_ERROR:A minimum balance of Rp ${requiredBalance.toLocaleString("id-ID")} is required.`);

        const reservedIp = await tx.reservedIp.create({
          data: {
            userId: user.id,
            ipPoolId: allocatedPoolId,
            ipAddress: allocatedIp,
            hourlyRate: ipPricePerHour,
            accumulatedCost: ipPricePerHour,
          },
        });

        // Create initial isolated PAYG_RUNNING invoice
        const timestamp = Date.now().toString();
        const random = crypto.randomBytes(3).toString("hex").toUpperCase();
        const invoiceNumber = `INV-PAYG-${timestamp}-${random}`;

        await tx.invoice.create({
          data: {
            invoiceNumber,
            userId: user.id,
            amount: ipPricePerHour,
            status: "PAID",
            paymentMethod: "Account Balance",
            merchantOrderId: invoiceNumber,
            type: "IP_RESERVATION",
            reference: "PAYG_RUNNING",
            paidAt: new Date(),
            details: JSON.stringify({
              reservedIpId: reservedIp.id,
              ipAddress: allocatedIp,
              billingMode: "PAYG",
            }),
          },
        });

        return reservedIp;
      });

      return NextResponse.json({ success: true, ip: result });
    } catch (e: any) {
      if (e.message?.startsWith("COMMITMENT_ERROR:")) {
        return NextResponse.json({ error: e.message.slice("COMMITMENT_ERROR:".length) }, { status: 400 });
      }
      if (e.message === "QUOTA_EXCEEDED") {
        return NextResponse.json(
          { error: "Maximum quota reached. You can only allocate up to 5 Elastic IPs." },
          { status: 403 }
        );
      }
      if (e.message === "NO_AVAILABLE_IPS") {
        return NextResponse.json(
          { error: `No static IPv${version} addresses are currently available in the pool. Please contact support.` },
          { status: 409 }
        );
      }
      if (e.message === "IP_ALREADY_IN_USE" || e.message === "IP_ALREADY_RESERVED" || e.code === "P2002") {
        return NextResponse.json(
          { error: "IP allocation conflict detected. Please try again." },
          { status: 409 }
        );
      }
      if (e.message === "INSUFFICIENT_BALANCE") {
        return NextResponse.json(
          { error: `A minimum balance of Rp ${requiredBalance.toLocaleString("id-ID")} is required.` },
          { status: 400 }
        );
      }
      throw e;
    }
  } catch (error: any) {
    console.error("Global Allocate Elastic IP Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
