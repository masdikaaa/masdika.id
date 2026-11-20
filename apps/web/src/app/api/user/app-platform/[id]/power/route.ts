import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import {
  scaleAppPlatform,
  restartAppPlatform,
  triggerAppPlatformBuild,
  trackAppPlatformBuildAsync,
} from "@/lib/k8s-app-platform";
import { logClientActivity } from "@/lib/activity-log";

export async function POST(
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

    const app = await prisma.appPlatformService.findUnique({
      where: { id: appId },
    });

    if (!app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (user.role !== "ADMIN" && app.userId !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (app.status === "TERMINATED") {
      return NextResponse.json({ error: "Cannot control a terminated application." }, { status: 400 });
    }

    if (app.status === "SUSPENDED") {
      return NextResponse.json({ error: "Application is suspended due to billing. Please top up your account balance to unsuspend." }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const action = body?.action?.toLowerCase()?.trim();

    if (!["start", "stop", "restart", "rebuild"].includes(action)) {
      return NextResponse.json({ error: "Invalid action. Allowed: start, stop, restart, rebuild" }, { status: 400 });
    }

    switch (action) {
      case "start": {
        await scaleAppPlatform(app as any, 1);
        await logClientActivity({
          userId: user.id,
          description: `Started App Platform ${app.name} (${app.subdomain})`,
          category: "service",
        }).catch(() => {});
        return NextResponse.json({ success: true, message: "Application started successfully", status: "RUNNING" });
      }

      case "stop": {
        await scaleAppPlatform(app as any, 0);
        await logClientActivity({
          userId: user.id,
          description: `Stopped App Platform ${app.name} (${app.subdomain})`,
          category: "service",
        }).catch(() => {});
        return NextResponse.json({ success: true, message: "Application stopped successfully", status: "STOPPED" });
      }

      case "restart": {
        await restartAppPlatform(app as any);
        await logClientActivity({
          userId: user.id,
          description: `Restarted App Platform ${app.name} (${app.subdomain})`,
          category: "service",
        }).catch(() => {});
        return NextResponse.json({ success: true, message: "Application restarted successfully", status: "RUNNING" });
      }

      case "rebuild": {
        const { jobName, imageTag } = await triggerAppPlatformBuild(app as any);
        trackAppPlatformBuildAsync(app.id, jobName, imageTag).catch((err) => {
          console.error("[AppPlatform] Async build error on rebuild:", err);
        });

        await logClientActivity({
          userId: user.id,
          description: `Triggered rebuild for App Platform ${app.name} (${app.subdomain})`,
          category: "service",
        }).catch(() => {});
        return NextResponse.json({
          success: true,
          message: "Build triggered successfully",
          jobName,
          status: "BUILDING",
        });
      }

      default:
        return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("[AppPlatform] Power control error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
