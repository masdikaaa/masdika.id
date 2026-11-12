import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDatabasePlansExist } from "@/lib/database-plans";

export async function GET() {
  try {
    let plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" }
    });

    // If database plans are missing from a fresh database / CI/CD environment, auto-seed them
    const hasDbPlans = plans.some((p) => p.service === "DATABASE");
    if (!hasDbPlans) {
      await ensureDatabasePlansExist();
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
