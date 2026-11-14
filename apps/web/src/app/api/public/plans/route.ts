import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDatabasePlansExist } from "@/lib/database-plans-server";
import { ensureAppPlansExist } from "@/lib/app-plans-server";

export async function GET() {
  try {
    let plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" }
    });

    // If database or app plans are missing from a fresh database / CI/CD environment, auto-seed them
    const hasDbPlans = plans.some((p) => p.service === "DATABASE");
    const hasAppPlans = plans.some((p) => p.service === "APP");

    let needsRefetch = false;
    if (!hasDbPlans) {
      await ensureDatabasePlansExist();
      needsRefetch = true;
    }
    if (!hasAppPlans) {
      await ensureAppPlansExist();
      needsRefetch = true;
    }

    if (needsRefetch) {
      plans = await prisma.plan.findMany({
        where: { isActive: true },
        orderBy: { price: "asc" }
      });
    }

    return NextResponse.json({ success: true, data: plans });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
