import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import {
  deleteAppService,
  getAppClusterConfig,
  getAppPodStatus,
} from "@/lib/k8s-app";
import { getAppDefinition } from "@/lib/app-catalog";
import { logClientActivity } from "@/lib/activity-log";
import { getClientIp } from "@/lib/get-ip";

export async function GET(
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
      include: { user: { select: { email: true, name: true } } },
    });

    if (!app || app.status === "TERMINATED") {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const [clusterConfig, telemetry] = await Promise.all([
      getAppClusterConfig().catch(() => null),
      getAppPodStatus(app as any).catch(() => ({
        phase: "Unknown",
        ready: false,
        restartCount: 0,
      })),
    ]);

    const baseDomain = clusterConfig?.publicDomain || "app.masdika.id";
    const clusterIp = clusterConfig?.publicIp || "";
    const fullDomain = `${app.subdomain}.${baseDomain}`;
    const catalog = getAppDefinition(app.appType);
    const hasSshAccess = catalog?.accessProtocol === "SSH" || catalog?.accessProtocol === "BOTH";

    return NextResponse.json({
      success: true,
      data: {
        ...app,
        fullDomain,
        publicIp: clusterIp,
        httpsUrl: `https://${fullDomain}`,
        nodePortUrl: hasSshAccess && clusterIp ? `http://${clusterIp}:${app.port}` : null,
        catalog,
        telemetry,
      },
    });
  } catch (error: any) {
    console.error("Error fetching app detail:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
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
      include: { user: { select: { email: true, name: true } } },
    });

    if (!app || app.status === "TERMINATED" || app.status === "TERMINATING") {
      return NextResponse.json({ error: "Application not found or already terminated" }, { status: 404 });
    }

    const lock = await prisma.appService.updateMany({
      where: { id: app.id, status: { notIn: ["TERMINATED", "TERMINATING"] } },
      data: { status: "TERMINATING" },
    });
    if (lock.count === 0) {
      return NextResponse.json({ error: "Application is already being terminated" }, { status: 409 });
    }

    // Cleanup Kubernetes cluster resources
    try {
      await deleteAppService(app as any);
    } catch (k8sErr: any) {
      console.warn("Notice: Failed to delete some K8s resources:", k8sErr.message);
    }

    // Update status in Database
    await prisma.appService.update({
      where: { id: app.id },
      data: {
        status: "TERMINATED",
        terminationDate: new Date(),
      },
    });

    const { settleServicePaygInvoices } = await import("@/lib/payg-invoice");
    await settleServicePaygInvoices(prisma, {
      userId: app.userId,
      serviceIdField: "appServiceId",
      serviceId: app.id,
      serviceName: app.name,
      type: "MANAGED_APP",
    });

    if (app.user?.email) {
      const { sendTerminationEmail } = await import("@/lib/email");
      sendTerminationEmail(
        app.user.email,
        app.user.name || "Customer",
        `${app.name} (${app.appType})`,
        "Managed Application",
        "Terminated by user from dashboard"
      ).catch((err) => console.error("[APP_TERMINATION_EMAIL_ERROR]", err));
    }

    const clientIp = getClientIp(req);
    await logClientActivity({
      userId: user.id,
      description: `Terminated Managed App '${app.name}' (${app.appType}) and cleaned up Kubernetes resources`,
      ipAddress: clientIp,
      category: "service",
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Application '${app.name}' has been terminated and resources released.`,
    });
  } catch (error: any) {
    console.error("Error terminating app:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
