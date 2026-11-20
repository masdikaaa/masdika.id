import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import {
  getAppPlatformRuntimeLogs,
  syncAppPlatformBuildProgress,
} from "@/lib/k8s-app-platform";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const user = authResult.user!;
    const { id } = await context.params;
    const appId = parseInt(id, 10);
    if (isNaN(appId)) {
      return NextResponse.json({ error: "Invalid app ID" }, { status: 400 });
    }

    let app = await prisma.appPlatformService.findUnique({
      where: { id: appId },
    });

    if (!app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (user.role !== "ADMIN" && app.userId !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const logType = searchParams.get("type") || "runtime"; // "build" | "runtime"

    if (
      logType === "build" ||
      app.lastBuildStatus === "BUILDING" ||
      app.lastBuildStatus === "QUEUED" ||
      app.status === "BUILDING" ||
      app.status === "PROVISIONING"
    ) {
      await syncAppPlatformBuildProgress(app.id).catch(() => {});
      const refreshed = await prisma.appPlatformService.findUnique({ where: { id: appId } });
      if (refreshed) app = refreshed;
    }

    if (logType === "build") {
      return NextResponse.json({
        success: true,
        type: "build",
        status: app.lastBuildStatus || "QUEUED",
        logs: app.lastBuildLog || "No build logs available yet.",
      });
    }

    // Runtime logs from live container
    const runtimeLogs = await getAppPlatformRuntimeLogs(app as any, 300);

    return NextResponse.json({
      success: true,
      type: "runtime",
      status: app.status,
      logs: runtimeLogs,
    });
  } catch (error: any) {
    console.error("[AppPlatform] Logs error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
