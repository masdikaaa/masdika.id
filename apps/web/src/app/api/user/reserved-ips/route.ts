import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { Address4, Address6 } from 'ip-address';

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
    // Rate Limit: Max 5 IP reservations per 10 minutes per IP
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    const allowed = await checkRateLimit("IP_RESERVE", ip, 5, 600);
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    const user = authResult.user!;

    // Quota Limit: Max 5 Reserved IPs per User Account (except Admin)
    if (user.role === "USER") {
      const existingReservedIpsCount = await prisma.reservedIp.count({
        where: { userId: user.id }
      });
      if (existingReservedIpsCount >= 5) {
        return NextResponse.json({ error: "Maximum quota reached. You can only reserve up to 5 Public IP addresses." }, { status: 403 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const { ipAddress } = body;

    if (!ipAddress) return NextResponse.json({ error: "No IP address selected." }, { status: 400 });

    const isIPv6 = ipAddress.includes(':');
    const version = isIPv6 ? 6 : 4;

    // Get IP pricing
    const pricingItems = await prisma.vpsPricing.findMany();
    let ipPricePerHour = 0;
    const pricingKey = version === 6 ? 'ipv6' : 'ipv4';
    const ipPricing = pricingItems.find(p => p.key === pricingKey);
    if (ipPricing) ipPricePerHour = ipPricing.pricePerHour;


    // Verify IP is in a public IP pool
    const pools = await prisma.ipPool.findMany({ where: { version, type: "PUBLIC" } });
    let targetPoolId: number | null = null;

    const ipToNum = (parts: number[]) =>
      (parts[0] * Math.pow(2, 24)) +
      (parts[1] * Math.pow(2, 16)) +
      (parts[2] * Math.pow(2, 8)) +
      parts[3];

    try {
      const candidateIp6 = isIPv6 ? new Address6(ipAddress) : null;
      const candidateParts = isIPv6 ? [] : ipAddress.split('.').map(Number);
      const candidateNum = isIPv6 ? null : (candidateParts.length === 4 ? ipToNum(candidateParts) : null);

      for (const pool of pools) {
        if (!pool.startIp || !pool.endIp) continue;
        if (ipAddress === pool.gateway) continue;

        try {
          if (isIPv6) {
            const startIp = new Address6(pool.startIp);
            const endIp = new Address6(pool.endIp);

            if ((candidateIp6 as any)!.bigInteger() >= (startIp as any).bigInteger() && (candidateIp6 as any)!.bigInteger() <= (endIp as any).bigInteger()) {
              targetPoolId = pool.id;
              break;
            }
          } else {
            const startParts = pool.startIp.split('.').map(Number);
            const endParts = pool.endIp.split('.').map(Number);
            if (startParts.length === 4 && endParts.length === 4 && candidateNum !== null) {
              const startNum = ipToNum(startParts);
              const endNum = ipToNum(endParts);
              if (candidateNum >= startNum && candidateNum <= endNum) {
                targetPoolId = pool.id;
                break;
              }
            }
          }
        } catch (e) {
          // ignore parsing errors for a specific pool
        }
      }
    } catch (e) {
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

        // Charge for the first hour upfront
        const updateResult = await tx.user.updateMany({
          where: { id: user.id, balance: { gte: ipPricePerHour } },
          data: { balance: { decrement: ipPricePerHour } }
        });
        if (updateResult.count === 0) throw new Error("INSUFFICIENT_BALANCE");

        const reservedIp = await tx.reservedIp.create({
          data: {
            userId: user.id,
            ipPoolId: targetPoolId,
            ipAddress,
            hourlyRate: ipPricePerHour,
            accumulatedCost: ipPricePerHour,
          }
        });

        // Create the initial PAYG invoice
        const timestamp = Date.now().toString();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
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
      if (e.message === 'IP_ALREADY_IN_USE' || e.message === 'IP_ALREADY_RESERVED' || e.code === 'P2002') {
        return NextResponse.json({ error: "The selected IP has already been reserved or assigned to a VPS by someone else." }, { status: 409 });
      }
      if (e.message === 'INSUFFICIENT_BALANCE') {
        return NextResponse.json({ error: "Insufficient account balance." }, { status: 400 });
      }
      throw e;
    }
  } catch (error: any) {
    console.error("Global Reserve IP Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
