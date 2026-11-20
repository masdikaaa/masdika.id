import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDatabasePlansExist } from "@/lib/database-plans-server";
import { ensureAppPlansExist } from "@/lib/app-plans-server";
import { ensureAppPlatformPlansExist } from "@/lib/app-platform-plans-server";
import { ensureObjectStoragePlansExist } from "@/lib/object-storage-plans-server";
import { ensureCdnPlansExist } from "@/lib/cdn-plans-server";

export async function GET() {
  try {
    let plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" }
    });

    // If database, app, app platform, object storage, or CDN plans are missing from a fresh database / CI/CD environment, auto-seed them
    const hasDbPlans = plans.some((p) => p.service === "DATABASE");
    const hasAppPlans = plans.some((p) => p.service === "APP");
    const hasAppPlatformPlans = plans.some((p) => p.service === "APP_PLATFORM");
    const hasObjPlans = plans.some((p) => p.service === "OBJECT_STORAGE");
    const hasCdnPlans = plans.some((p) => p.service === "CDN");

    let needsRefetch = false;
    if (!hasDbPlans) {
      await ensureDatabasePlansExist();
      needsRefetch = true;
    }
    if (!hasAppPlans) {
      await ensureAppPlansExist();
      needsRefetch = true;
    }
    if (!hasAppPlatformPlans) {
      await ensureAppPlatformPlansExist();
      needsRefetch = true;
    }
    if (!hasObjPlans) {
      await ensureObjectStoragePlansExist();
      needsRefetch = true;
    }
    if (!hasCdnPlans) {
      await ensureCdnPlansExist();
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
