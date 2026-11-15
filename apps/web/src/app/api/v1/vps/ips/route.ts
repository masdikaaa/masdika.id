import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateVpsApiKey, vpsApiError } from "@/lib/vps-api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateVpsApiKey(req, {
      name: "VPS_API_IPS",
      max: 120,
      windowSec: 60,
    });
    if (auth.error) return auth.error;

    const ips = await prisma.reservedIp.findMany({
      where: { userId: auth.apiKey.userId },
      orderBy: { createdAt: "desc" },
      include: {
        ipPool: { select: { version: true, network: true, gateway: true } },
        vps: { select: { id: true, hostname: true, status: true } },
      },
    });

    const data = ips.map((ip) => ({
      id: ip.id,
      ipAddress: ip.ipAddress,
      publicIp: ip.publicIp ?? ip.ipAddress,
      version: ip.ipPool.version,
      hourlyRate: ip.hourlyRate,
      isAttached: ip.isAttached,
      vps: ip.vps,
      createdAt: ip.createdAt,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[VPS_API_IPS]", error);
    return vpsApiError("Internal server error", 500);
  }
}
