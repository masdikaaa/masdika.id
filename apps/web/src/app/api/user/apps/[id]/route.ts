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

    const fullDomain = `${app.subdomain}.app.masdika.id`;
    const catalog = getAppDefinition(app.appType);

    return NextResponse.json({
      success: true,
      data: {
        ...app,
        fullDomain,
        publicIp: clusterConfig?.publicIp || "103.247.10.61",
        httpsUrl: `https://${fullDomain}`,
        nodePortUrl: `http://${clusterConfig?.publicIp || "103.247.10.61"}:${app.port}`,
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
    });

    if (!app || app.status === "TERMINATED") {
      return NextResponse.json({ error: "Application not found or already terminated" }, { status: 404 });
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
