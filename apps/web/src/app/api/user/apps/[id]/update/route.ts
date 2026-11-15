import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { updateAppServiceToLatest } from "@/lib/k8s-app";
import { logClientActivity } from "@/lib/activity-log";
import { getClientIp } from "@/lib/get-ip";
import { checkRateLimit } from "@/lib/rate-limit";

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

    const clientIp = getClientIp(req);
    const rateLimitAllowed = await checkRateLimit("APP_UPDATE", `${user.id}:${clientIp}`, 5, 60);
    if (!rateLimitAllowed) {
      return NextResponse.json(
        { error: "Too many image update requests. Please wait a minute before trying again." },
        { status: 429 }
      );
    }

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

    if (app.status === "SUSPENDED") {
      return NextResponse.json({ error: "Cannot update suspended app. Please top up your balance first." }, { status: 403 });
    }

    if (app.status === "PROVISIONING") {
      return NextResponse.json({ error: "Application is currently provisioning or scaling. Please wait." }, { status: 409 });
    }

    const updateResult = await updateAppServiceToLatest(app as any);

    await prisma.appService.update({
      where: { id: app.id },
      data: {
        status: "RUNNING",
        updatedAt: new Date(),
      },
    });

    await logClientActivity({
      userId: user.id,
      description: `UPDATE_TO_LATEST executed on Managed App '${app.name}'`,
      ipAddress: clientIp,
      category: "service",
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: updateResult.message || `Application '${app.name}' has been successfully updated to the latest image version with zero data loss.`,
      image: updateResult.image,
      status: "RUNNING",
    });
  } catch (error: any) {
    console.error("Error updating app version:", error);
    return NextResponse.json({ error: error.message || "Failed to update application" }, { status: 500 });
  }
}
