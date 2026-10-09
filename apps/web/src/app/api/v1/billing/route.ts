import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateReseller, apiError, BILLABLE_VPS_STATUSES, HOURS_PER_MONTH } from "@/lib/reseller-api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateReseller(req, { name: "RESELLER_API_BILLING", max: 120, windowSec: 60 });
    if (auth.error) return auth.error;
    const { apiKey } = auth;

    // Always read the fresh balance (the key's user snapshot could be stale)
    const user = await prisma.user.findUnique({ where: { id: apiKey.userId }, select: { balance: true } });

    // Monthly spend = what the monthly cron will charge (hourlyRate * 730) for every billable instance
    const instances = await prisma.vpsService.findMany({
      where: { userId: apiKey.userId, isReseller: true, status: { in: BILLABLE_VPS_STATUSES } },
      select: { hourlyRate: true },
    });
    const totalMonthlySpend = instances.reduce((sum, i) => sum + (i.hourlyRate || 0) * HOURS_PER_MONTH, 0);

    return NextResponse.json({
      success: true,
      data: {
        balance: user?.balance ?? 0,
        currency: "IDR",
        activeInstances: instances.length,
        totalMonthlySpend,
      },
    });
  } catch (error: any) {
    console.error("[RESELLER_API_BILLING]", error);
    return apiError("Internal server error", 500);
  }
}
