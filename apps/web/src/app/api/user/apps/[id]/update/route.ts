import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { updateAppServiceToLatest } from "@/lib/k8s-app";
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

    if (app.status === "SUSPENDED") {
      return NextResponse.json({ error: "Cannot update suspended app. Please top up your balance first." }, { status: 400 });
    }

    const updateResult = await updateAppServiceToLatest(app as any);

    await prisma.appService.update({
      where: { id: app.id },
      data: {
        status: "RUNNING",
        updatedAt: new Date(),
      },
    });

    const clientIp = getClientIp(req);
    await logClientActivity({
      userId: user.id,
      description: `UPDATE_TO_LATEST executed on Managed App '${app.name}'`,
      ipAddress: clientIp,
      category: "service",
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: updateResult.message || `Aplikasi '${app.name}' berhasil diperbarui ke versi image terbaru. Data persistent storage Anda tetap utuh.`,
      image: updateResult.image,
      status: "RUNNING",
    });
  } catch (error: any) {
    console.error("Error updating app version:", error);
    return NextResponse.json({ error: error.message || "Failed to update application" }, { status: 500 });
  }
}
