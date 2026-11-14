import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import {
  startAppService,
  stopAppService,
  restartAppService,
  updateAppServiceToLatest,
} from "@/lib/k8s-app";
import { logClientActivity } from "@/lib/activity-log";
import { getClientIp } from "@/lib/get-ip";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const user = authResult.user!;

    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid app ID" }, { status: 400 });
    }

    const app = await prisma.appService.findFirst({
      where: user.role === "ADMIN" ? { id } : { id, userId: user.id },
    });

    if (!app || app.status === "TERMINATED") {
      return NextResponse.json({ error: "Application not found or terminated" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const action = (body.action || "").toLowerCase().trim();

    if (!["start", "stop", "restart", "update"].includes(action)) {
      return NextResponse.json({ error: "Invalid action. Allowed: start, stop, restart, update" }, { status: 400 });
    }

    let updateMessage = "";
    if (action === "stop") {
      await stopAppService(app as any);
      await prisma.appService.update({
        where: { id: app.id },
        data: { status: "STOPPED" },
      });
    } else if (action === "start") {
      await startAppService(app as any);
      await prisma.appService.update({
        where: { id: app.id },
        data: { status: "RUNNING" },
      });
    } else if (action === "restart") {
      await restartAppService(app as any);
      await prisma.appService.update({
        where: { id: app.id },
        data: { status: "RUNNING" },
      });
    } else if (action === "update") {
      const updateResult = await updateAppServiceToLatest(app as any);
      updateMessage = updateResult.message;
      await prisma.appService.update({
        where: { id: app.id },
        data: { status: "RUNNING", updatedAt: new Date() },
      });
    }

    const clientIp = getClientIp(req);
    await logClientActivity({
      userId: user.id,
      description: `${action.toUpperCase()} action executed on Managed App '${app.name}'`,
      ipAddress: clientIp,
      category: "service",
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: updateMessage || `Application '${app.name}' has been ${action === "stop" ? "stopped" : action === "start" ? "started" : "restarted"} successfully.`,
      status: action === "stop" ? "STOPPED" : "RUNNING",
    });
  } catch (error: any) {
    console.error("Error executing app power action:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
