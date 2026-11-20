import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { execAppPlatformCommand } from "@/lib/k8s-app-platform";

/**
 * POST /api/user/app-platform/[id]/exec
 * Execute a shell command inside the running container pod (Web Terminal)
 */
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

    if (!app || app.status === "TERMINATED") {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }
    if (user.role !== "ADMIN" && app.userId !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    if (app.status !== "RUNNING") {
      return NextResponse.json(
        { error: "Application must be RUNNING to execute terminal commands." },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    const command = typeof body?.command === "string" ? body.command.trim() : "";
    if (!command || command.length > 1000) {
      return NextResponse.json({ error: "Command must be between 1 and 1000 characters." }, { status: 400 });
    }

    const result = await execAppPlatformCommand(app as any, command);
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("[AppPlatform Exec] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to execute command in container" }, { status: 500 });
  }
}
