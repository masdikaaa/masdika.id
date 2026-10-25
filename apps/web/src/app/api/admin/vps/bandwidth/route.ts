import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import {
  BANDWIDTH_SETTING_KEY,
  BASE_BANDWIDTH_MBPS,
  BANDWIDTH_STEP_MBPS,
  DEFAULT_BANDWIDTH_OPTIONS,
  DEFAULT_BANDWIDTH_RATE_PER_HOUR,
  getBandwidthOptions,
  sanitizeBandwidthOptions,
} from "@/lib/vps-bandwidth";

export async function GET() {
  try {
    const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const bandwidthOptions = await getBandwidthOptions();

    // Fetch bandwidth pricing rate per hour
    const bandwidthPrice = await prisma.vpsPricing.findUnique({
      where: { key: "bandwidth" },
    });

    return NextResponse.json({
      bandwidthOptions,
      baseBandwidth: BASE_BANDWIDTH_MBPS,
      stepBandwidth: BANDWIDTH_STEP_MBPS,
      ratePerHour: bandwidthPrice?.pricePerHour ?? DEFAULT_BANDWIDTH_RATE_PER_HOUR,
      defaultOptions: DEFAULT_BANDWIDTH_OPTIONS,
    });
  } catch (error) {
    console.error("GET Bandwidth Options Error:", error);
    return NextResponse.json({ error: "Failed to fetch bandwidth options" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { bandwidthOptions, ratePerHour } = body;

    if (!Array.isArray(bandwidthOptions)) {
      return NextResponse.json({ error: "bandwidthOptions must be an array" }, { status: 400 });
    }

    const sanitized = sanitizeBandwidthOptions(bandwidthOptions);
    if (!sanitized.includes(BASE_BANDWIDTH_MBPS)) {
      sanitized.unshift(BASE_BANDWIDTH_MBPS);
    }
    sanitized.sort((a, b) => a - b);

    // Save options to database
    await prisma.setting.upsert({
      where: { key: BANDWIDTH_SETTING_KEY },
      update: { value: JSON.stringify(sanitized) },
      create: { key: BANDWIDTH_SETTING_KEY, value: JSON.stringify(sanitized) },
    });

    // Update bandwidth pricing if ratePerHour is provided
    let updatedRate = DEFAULT_BANDWIDTH_RATE_PER_HOUR;
    if (ratePerHour !== undefined && ratePerHour !== null) {
      const numericRate = Number(ratePerHour);
      if (!Number.isFinite(numericRate)) {
        return NextResponse.json({ error: "ratePerHour must be a valid number" }, { status: 400 });
      }
      const parsedRate = Math.max(0, Math.floor(numericRate));
      const maxItem = await prisma.vpsPricing.findFirst({ orderBy: { id: "desc" } });
      const pricing = await prisma.vpsPricing.upsert({
        where: { key: "bandwidth" },
        update: { pricePerHour: parsedRate },
        create: {
          id: (maxItem?.id || 0) + 1,
          key: "bandwidth",
          name: "Bandwidth (+50 Mbps over 100M)",
          pricePerHour: parsedRate,
          unit: "50 Mbps",
        },
      });
      updatedRate = pricing.pricePerHour;
    } else {
      const existing = await prisma.vpsPricing.findUnique({ where: { key: "bandwidth" } });
      if (existing) updatedRate = existing.pricePerHour;
    }

    return NextResponse.json({
      success: true,
      message: "Bandwidth speed options saved successfully",
      bandwidthOptions: sanitized,
      ratePerHour: updatedRate,
    });
  } catch (error) {
    console.error("POST Bandwidth Options Error:", error);
    return NextResponse.json({ error: "Failed to save bandwidth options" }, { status: 500 });
  }
}
