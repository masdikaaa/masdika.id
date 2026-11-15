import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateVpsApiKey, parseVpsId, vpsApiError } from "@/lib/vps-api";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateVpsApiKey(req, {
      name: "VPS_API_DETAIL",
      max: 120,
      windowSec: 60,
    });
    if (auth.error) return auth.error;
    const { apiKey } = auth;

    const vpsId = parseVpsId((await params).id);
    if (!vpsId) return vpsApiError("Invalid VPS ID", 400);

    const vps = await prisma.vpsService.findFirst({
      where: {
        id: vpsId,
        userId: apiKey.userId,
        status: { not: "TERMINATED" },
      },
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

    if (!vps) {
      return vpsApiError("VPS instance not found", 404);
    }

    const { assignedIps, hourlyRate, ...rest } = vps;
    const primary = assignedIps.find((ip) => ip.isPrimary) ?? assignedIps[0];

    return NextResponse.json({
      success: true,
      data: {
        ...rest,
        billingMode: hourlyRate > 0 ? "PAYG" : "MONTHLY",
        ipAddress: primary?.ipAddress ?? null,
        publicIp: primary?.publicIp ?? primary?.ipAddress ?? null,
        endpoints: {
          start: `/api/v1/vps/${vps.id}/start`,
          stop: `/api/v1/vps/${vps.id}/stop`,
          reboot: `/api/v1/vps/${vps.id}/reboot`,
        },
      },
    });
  } catch (error) {
    console.error("[VPS_API_DETAIL]", error);
    return vpsApiError("Internal server error", 500);
  }
}
