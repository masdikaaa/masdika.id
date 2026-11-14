import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { decryptDeterministic } from "@/lib/encryption";
import {
  startAppService,
  stopAppService,
  restartAppService,
  deleteAppService,
  getAppClusterConfig,
  getAppPodStatus,
} from "@/lib/k8s-app";
import { getAppDefinition } from "@/lib/app-catalog";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const clusterConfig = await getAppClusterConfig().catch(() => null);

    const apps = await prisma.appService.findMany({
      where: {
        status: { not: "TERMINATED" },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const mapped = apps.map((app) => {
      let resolvedCustomerName = "Customer";
      let resolvedCustomerEmail = "customer@domain.com";

      if (app.user) {
        if (app.user.name) {
          try {
            resolvedCustomerName = decryptDeterministic(app.user.name) || app.user.name;
          } catch {
            resolvedCustomerName = app.user.name;
          }
        }
        if (app.user.email) {
          try {
            resolvedCustomerEmail = decryptDeterministic(app.user.email) || app.user.email;
          } catch {
            resolvedCustomerEmail = app.user.email;
          }
        }
      }

      const fullDomain = `${app.subdomain}.app.masdika.id`;
      const catalog = getAppDefinition(app.appType);

      return {
        ...app,
        customerName: resolvedCustomerName,
        customerEmail: resolvedCustomerEmail,
        fullDomain,
        httpsUrl: `https://${fullDomain}`,
        nodePortUrl: `http://${clusterConfig?.publicIp || "103.247.10.61"}:${app.port}`,
        catalog,
      };
    });

    const totalInstances = mapped.length;
    const runningCount = mapped.filter((a) => a.status === "RUNNING").length;
    const stoppedCount = totalInstances - runningCount;
    const totalCpu = mapped.reduce((acc, a) => acc + (a.cpuShares || 0), 0);
    const totalMemoryMb = mapped.reduce((acc, a) => acc + (a.memoryMb || 0), 0);
    const totalStorageGb = mapped.reduce((acc, a) => acc + (a.storageGb || 10), 0);
    const totalMonthlyRunRate = mapped.reduce((acc, a) => acc + (a.monthlyPrice || 0), 0);

    return NextResponse.json({
      success: true,
      data: mapped,
      stats: {
        totalInstances,
        runningCount,
        stoppedCount,
        totalCpu: parseFloat(totalCpu.toFixed(1)),
        totalMemoryGb: parseFloat((totalMemoryMb / 1024).toFixed(1)),
        totalStorageGb,
        totalMonthlyRunRate,
        publicIp: clusterConfig?.publicIp || "103.247.10.61",
        publicDomain: clusterConfig?.publicDomain || "app.masdika.id",
      },
    });
  } catch (error: any) {
    console.error("[AdminManagedApps] Error fetching applications:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const { action, id } = body;

    if (!id || !action) {
      return NextResponse.json({ error: "Missing required fields (id, action)" }, { status: 400 });
    }

    const app = await prisma.appService.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!app) {
      return NextResponse.json({ error: "Application instance not found" }, { status: 404 });
    }

    if (action === "start") {
      await startAppService(app as any);
      await prisma.appService.update({
        where: { id: app.id },
        data: { status: "RUNNING" },
      });
      return NextResponse.json({ success: true, message: `Application ${app.name} started successfully` });
    }

    if (action === "stop") {
      await stopAppService(app as any);
      await prisma.appService.update({
        where: { id: app.id },
        data: { status: "STOPPED" },
      });
      return NextResponse.json({ success: true, message: `Application ${app.name} stopped successfully` });
    }

    if (action === "restart") {
      await restartAppService(app as any);
      return NextResponse.json({ success: true, message: `Application ${app.name} restarted successfully` });
    }

    if (action === "delete") {
      await deleteAppService(app as any);
      await prisma.appService.update({
        where: { id: app.id },
        data: {
          status: "TERMINATED",
        },
      });
      return NextResponse.json({ success: true, message: `Application ${app.name} terminated and cleaned up` });
    }

    return NextResponse.json({ error: `Unsupported admin action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error("[AdminManagedApps] Action error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
