import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateVpsApiKey, vpsApiError } from "@/lib/vps-api";
import { getBandwidthOptions } from "@/lib/vps-bandwidth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateVpsApiKey(req, {
      name: "VPS_API_PRICING",
      max: 120,
      windowSec: 60,
    });
    if (auth.error) return auth.error;

    const [pricingItems, bandwidthOptions] = await Promise.all([
      prisma.vpsPricing.findMany({
        select: { key: true, pricePerHour: true },
        orderBy: { key: "asc" },
      }),
      getBandwidthOptions(),
    ]);

    const hourlyRates: Record<string, number> = {};
    for (const item of pricingItems) {
      hourlyRates[item.key] = item.pricePerHour;
    }

    return NextResponse.json({
      success: true,
      data: {
        currency: "IDR",
        hourlyRates,
        bandwidthOptionsMbps: bandwidthOptions,
      },
    });
  } catch (error) {
    console.error("[VPS_API_PRICING]", error);
    return vpsApiError("Internal server error", 500);
  }
}
