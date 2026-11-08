import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { Address6 } from 'ip-address';

const CANONICAL_IPV4_REGEX = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });

    const ips = await prisma.reservedIp.findMany({
      where: { userId: authResult.user!.id },
      include: {
        vps: true
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(ips);
  } catch (error: any) {
    console.error("Fetch Reserved IPs Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Rate Limit: Max 5 IP reservations per 10 minutes per unspoofable client IP
    const ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const allowed = await checkRateLimit("IP_RESERVE", ip, 5, 600);
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    const user = authResult.user!;

    const body = await req.json().catch(() => ({}));
    const rawIpAddress = typeof body?.ipAddress === "string" ? body.ipAddress.trim() : "";

    if (!rawIpAddress) return NextResponse.json({ error: "No IP address selected." }, { status: 400 });

    const isIPv6 = rawIpAddress.includes(':');
    const version = isIPv6 ? 6 : 4;

    let ipAddress = rawIpAddress;
    let candidateIp6: Address6 | null = null;
    if (isIPv6) {
      try {
        candidateIp6 = new Address6(rawIpAddress);
        ipAddress = candidateIp6.correctForm();
      } catch {
        return NextResponse.json({ error: "Invalid IPv6 address format." }, { status: 400 });
      }
    } else {
      if (!CANONICAL_IPV4_REGEX.test(rawIpAddress)) {
        return NextResponse.json({ error: "Invalid canonical IPv4 address format." }, { status: 400 });
      }
    }

    // Get IP pricing (fail closed if unconfigured)
    const pricingItems = await prisma.vpsPricing.findMany();
    const pricingKey = version === 6 ? 'ipv6' : 'ipv4';
    const ipPricing = pricingItems.find(p => p.key === pricingKey);
    if (!ipPricing || !Number.isSafeInteger(ipPricing.pricePerHour) || ipPricing.pricePerHour <= 0) {
      return NextResponse.json({ error: "Reserved IP pricing is not configured." }, { status: 503 });
    }
    const ipPricePerHour = ipPricing.pricePerHour;

    // Verify IP is in a public IP pool
    const pools = await prisma.ipPool.findMany({ where: { version, type: "PUBLIC" } });
    let targetPoolId: number | null = null;

    const ipToNum = (parts: number[]) =>
      (parts[0] * Math.pow(2, 24)) +
      (parts[1] * Math.pow(2, 16)) +
      (parts[2] * Math.pow(2, 8)) +
      parts[3];

    try {
      const candidateParts = isIPv6 ? [] : ipAddress.split('.').map(Number);
      const candidateNum = isIPv6 ? null : ipToNum(candidateParts);

      for (const pool of pools) {
        if (!pool.startIp || !pool.endIp) continue;
        if (ipAddress === pool.gateway) continue;

        try {
          if (isIPv6) {
            const gatewayIp6 = pool.gateway.includes(':') ? new Address6(pool.gateway).correctForm() : pool.gateway;
            if (ipAddress === gatewayIp6) continue;
            const startIp = new Address6(pool.startIp);
            const endIp = new Address6(pool.endIp);

            if ((candidateIp6 as any)!.bigInteger() >= (startIp as any).bigInteger() && (candidateIp6 as any)!.bigInteger() <= (endIp as any).bigInteger()) {
              targetPoolId = pool.id;
              break;
            }
          } else {
            if (!CANONICAL_IPV4_REGEX.test(pool.startIp) || !CANONICAL_IPV4_REGEX.test(pool.endIp)) continue;
            const startNum = ipToNum(pool.startIp.split('.').map(Number));
            const endNum = ipToNum(pool.endIp.split('.').map(Number));
            if (candidateNum !== null && candidateNum >= startNum && candidateNum <= endNum) {
              targetPoolId = pool.id;
              break;
            }
          }
        } catch {
          // ignore parsing errors for a specific pool
        }
      }
    } catch {
      return NextResponse.json({ error: "Invalid IP address format." }, { status: 400 });
    }

    if (!targetPoolId) return NextResponse.json({ error: "Invalid IP address or out of range." }, { status: 400 });

    const currentUser = await prisma.user.findUnique({ where: { id: user.id } });
    const requiredBalance = ipPricePerHour * 730;
    if ((currentUser?.balance || 0) < requiredBalance) {
      return NextResponse.json({ error: `A minimum balance of Rp ${requiredBalance.toLocaleString('id-ID')} (1 month estimation) is required to reserve this IP address to prevent abuse. Please top up first.` }, { status: 400 });
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        // SECURITY: Row-level lock on IpPool to serialize all IP reservations
        await tx.ipPool.update({
          where: { id: targetPoolId! },
          data: { updatedAt: new Date() }
        });

        // Quota Limit enforced atomically inside serialized transaction: Max 5 Reserved IPs per User Account
        if (user.role === "USER") {
          const existingReservedIpsCount = await tx.reservedIp.count({
            where: { userId: user.id }
          });
          if (existingReservedIpsCount >= 5) {
            throw new Error("QUOTA_EXCEEDED");
          }
        }

        // Ensure IP is not already in use by any VPS
        const inUseByVps = await tx.vpsIpAssignment.findFirst({
          where: { ipPoolId: targetPoolId!, ipAddress }
        });
        if (inUseByVps) throw new Error("IP_ALREADY_IN_USE");

        // Ensure IP is not already reserved
        const alreadyReserved = await tx.reservedIp.findFirst({
          where: { ipPoolId: targetPoolId!, ipAddress }
        });
        if (alreadyReserved) throw new Error("IP_ALREADY_RESERVED");

        // Enforce full 730h balance requirement atomically while charging 1st hour upfront
        const updateResult = await tx.user.updateMany({
          where: { id: user.id, balance: { gte: requiredBalance } },
          data: { balance: { decrement: ipPricePerHour } }
        });
        if (updateResult.count === 0) throw new Error("INSUFFICIENT_BALANCE");

        const reservedIp = await tx.reservedIp.create({
          data: {
            userId: user.id,
            ipPoolId: targetPoolId!,
            ipAddress,
            hourlyRate: ipPricePerHour,
            accumulatedCost: ipPricePerHour,
          }
        });

        // Create the initial PAYG invoice
        const timestamp = Date.now().toString();
        const random = crypto.randomBytes(3).toString("hex").toUpperCase();
        const invoiceNumber = `INV-PAYG-${timestamp}-${random}`;
        
        await tx.invoice.create({
          data: {
            invoiceNumber,
            userId: user.id,
            amount: ipPricePerHour,
            status: 'PAID',
            paymentMethod: 'Account Balance',
            merchantOrderId: invoiceNumber,
            type: 'IP_RESERVATION',
            reference: 'PAYG_RUNNING',
            paidAt: new Date(),
            details: JSON.stringify({ reservedIpId: reservedIp.id, ipAddress: ipAddress })
          }
        });

        return reservedIp;
      });

      return NextResponse.json({ success: true, ip: result });
    } catch (e: any) {
      if (e.message === 'QUOTA_EXCEEDED') {
        return NextResponse.json({ error: "Maximum quota reached. You can only reserve up to 5 Public IP addresses." }, { status: 403 });
      }
      if (e.message === 'IP_ALREADY_IN_USE' || e.message === 'IP_ALREADY_RESERVED' || e.code === 'P2002') {
        return NextResponse.json({ error: "The selected IP has already been reserved or assigned to a VPS by someone else." }, { status: 409 });
      }
      if (e.message === 'INSUFFICIENT_BALANCE') {
        return NextResponse.json({ error: `A minimum balance of Rp ${requiredBalance.toLocaleString('id-ID')} is required.` }, { status: 400 });
      }
      throw e;
    }
  } catch (error: any) {
    console.error("Global Reserve IP Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
