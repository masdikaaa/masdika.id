import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateVpsApiKey, LIVE_VPS_STATUSES, vpsApiError } from "@/lib/vps-api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateVpsApiKey(req, {
      name: "VPS_API_LIST",
      max: 120,
      windowSec: 60,
    });
    if (auth.error) return auth.error;
    const { apiKey } = auth;

    const instances = await prisma.vpsService.findMany({
      where: {
        userId: apiKey.userId,
        status: { in: [...LIVE_VPS_STATUSES, "ERROR"] },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        hostname: true,
        status: true,
        cpuCores: true,
        ramGb: true,
        diskGb: true,
        osTemplate: true,
        node: true,
        hourlyRate: true,
        createdAt: true,
        assignedIps: {
          select: {
            ipAddress: true,
            publicIp: true,
            isPrimary: true,
          },
        },
      },
    });

    const data = instances.map(({ assignedIps, hourlyRate, ...vps }) => {
      const primary = assignedIps.find((ip) => ip.isPrimary) ?? assignedIps[0];
      return {
        ...vps,
        billingMode: hourlyRate > 0 ? "PAYG" : "MONTHLY",
        ipAddress: primary?.ipAddress ?? null,
        publicIp: primary?.publicIp ?? primary?.ipAddress ?? null,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[VPS_API_LIST]", error);
    return vpsApiError("Internal server error", 500);
  }
}
