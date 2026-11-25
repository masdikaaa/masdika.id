import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { decryptDeterministic } from "@/lib/encryption";
import {
  applyAppPlatformResources,
  deleteAppPlatformResources,
  getAppPlatformClusterConfig,
  isDirectImageApp,
  restartAppPlatform,
  scaleAppPlatform,
  trackAppPlatformBuildAsync,
  triggerAppPlatformBuild,
} from "@/lib/k8s-app-platform";

export const dynamic = "force-dynamic";

function sanitizeGitUrl(url?: string | null): string {
  if (!url) return "";
  return url.replace(/\/\/[^/@]+@/, "//");
}

export async function GET() {
  const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const apps = await prisma.appPlatformService.findMany({
      where: {
        status: { not: "TERMINATED" },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            deployments: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const clusterConfig = await getAppPlatformClusterConfig();
    const publicDomain = clusterConfig.publicDomain || "app.masdikacloud.my.id";
    const publicIp = clusterConfig.publicIp || "";

    let runningCount = 0;
    let buildingCount = 0;
    let stoppedCount = 0;
    let suspendedCount = 0;
    let totalCpu = 0;
    let totalMemoryMb = 0;
    let totalStorageGb = 0;
    let totalMonthlyRunRate = 0;

    const formattedApps = apps.map((app) => {
      let customerName = app.user?.name || "Customer";
      let customerEmail = app.user?.email || "";
      try {
        customerName = decryptDeterministic(customerName);
      } catch {}
      try {
        customerEmail = decryptDeterministic(customerEmail);
      } catch {}

      if (app.status === "RUNNING") runningCount++;
      else if (app.status === "SUSPENDED") suspendedCount++;
      else if (app.status === "STOPPED") stoppedCount++;
      if (app.lastBuildStatus === "BUILDING" || app.lastBuildStatus === "QUEUED") {
        buildingCount++;
      }

      totalCpu += app.cpuShares;
      totalMemoryMb += app.memoryMb;
      totalStorageGb += app.storageGb;
      if (app.status !== "SUSPENDED") {
        totalMonthlyRunRate += app.monthlyPrice;
      }

      const defaultHost = `${app.subdomain}.${publicDomain}`;
      const fullDomain = app.customDomain || defaultHost;
      const directImage = isDirectImageApp(app);

      return {
        id: app.id,
        userId: app.userId,
        name: app.name,
        subdomain: app.subdomain,
        customDomain: app.customDomain,
        fullDomain,
        httpsUrl: `https://${fullDomain}`,
        port: app.port,
        appPort: app.appPort,
        publicIp,
        isDirectImage: directImage,
        sourceLabel: directImage ? "Docker Image" : "Git Repository",
        dockerImage: app.dockerImage || null,
        gitUrl: sanitizeGitUrl(app.gitUrl),
        branch: app.branch,
        buildMode: app.buildMode,
        buildType: app.buildType,
        preDeployCommand: app.preDeployCommand || null,
        planName: app.planName,
        cpuShares: app.cpuShares,
        memoryMb: app.memoryMb,
        storageGb: app.storageGb,
        billingMode: app.billingMode,
        monthlyPrice: app.monthlyPrice,
        hourlyRate: app.hourlyRate,
        accumulatedCost: app.accumulatedCost,
        status: app.status,
        suspendReason: app.suspendReason,
        lastBuildStatus: app.lastBuildStatus,
        lastDeployedAt: app.lastDeployedAt,
        deploymentsCount: app._count.deployments,
        customerName,
        customerEmail,
        createdAt: app.createdAt,
      };
    });

    return NextResponse.json({
      apps: formattedApps,
      stats: {
        totalInstances: formattedApps.length,
        runningCount,
        buildingCount,
        stoppedCount,
        suspendedCount,
        totalCpu: Number(totalCpu.toFixed(1)),
        totalMemoryGb: Number((totalMemoryMb / 1024).toFixed(1)),
        totalStorageGb,
        totalMonthlyRunRate,
        maxInstances: clusterConfig.maxInstances || 100,
        maxCpu: clusterConfig.maxCpu || 64,
        maxRamGb: clusterConfig.maxRamGb || 128,
        maxDiskGb: clusterConfig.maxDiskGb || 1000,
        publicDomain,
        publicIp,
      },
    });
  } catch (err: unknown) {
    console.error("[AdminAppPlatform] GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch App Platform instances" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await req.json();
    const { action, id, reason } = body;

    if (!action || !id) {
      return NextResponse.json({ error: "Action and App ID are required" }, { status: 400 });
    }

    const app = await prisma.appPlatformService.findUnique({
      where: { id: Number(id) },
    });

    if (!app || app.status === "TERMINATED") {
      return NextResponse.json({ error: "App Platform instance not found" }, { status: 404 });
    }

    if (action === "start") {
      await scaleAppPlatform(app, 1);
      await prisma.appPlatformService.update({
        where: { id: app.id },
        data: {
          status: "RUNNING",
          suspendReason: null,
          terminationDate: null,
        },
      });
      return NextResponse.json({ success: true, message: `Application ${app.name} started successfully` });
    }

    if (action === "stop") {
      await scaleAppPlatform(app, 0);
      await prisma.appPlatformService.update({
        where: { id: app.id },
        data: { status: "STOPPED" },
      });
      return NextResponse.json({ success: true, message: `Application ${app.name} stopped successfully` });
    }

    if (action === "restart") {
      await restartAppPlatform(app);
      return NextResponse.json({ success: true, message: `Application ${app.name} restarted successfully` });
    }

    if (action === "suspend") {
      await scaleAppPlatform(app, 0);
      await prisma.appPlatformService.update({
        where: { id: app.id },
        data: {
          status: "SUSPENDED",
          suspendReason: reason || "Suspended by Administrator",
          terminationDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        },
      });
      return NextResponse.json({ success: true, message: `Application ${app.name} suspended successfully` });
    }

    if (action === "unsuspend") {
      await scaleAppPlatform(app, 1);
      await prisma.appPlatformService.update({
        where: { id: app.id },
        data: {
          status: "RUNNING",
          suspendReason: null,
          terminationDate: null,
        },
      });
      return NextResponse.json({ success: true, message: `Application ${app.name} unsuspended successfully` });
    }

    if (action === "rebuild") {
      if (isDirectImageApp(app)) {
        await applyAppPlatformResources(app, "latest");
        await prisma.appPlatformService.update({
          where: { id: app.id },
          data: {
            status: "RUNNING",
            lastBuildStatus: "SUCCESS",
            lastDeployedAt: new Date(),
          },
        });
        return NextResponse.json({
          success: true,
          message: `Docker image deployment refreshed for ${app.name}`,
        });
      }

      const { jobName, imageTag } = await triggerAppPlatformBuild(app);
      const deployment = await prisma.appPlatformDeployment.create({
        data: {
          appId: app.id,
          status: "BUILDING",
          commitMessage: "Admin triggered manual rebuild",
          imageTag,
        },
      });
      await prisma.appPlatformService.update({
        where: { id: app.id },
        data: { lastBuildStatus: "BUILDING" },
      });
      trackAppPlatformBuildAsync(app.id, jobName, imageTag, deployment.id).catch((err) =>
        console.error("[AdminAppPlatform] Async build tracker error:", err)
      );
      return NextResponse.json({
        success: true,
        message: `Rebuild triggered for ${app.name}`,
      });
    }

    if (action === "delete") {
      await deleteAppPlatformResources(app);
      await prisma.appPlatformService.update({
        where: { id: app.id },
        data: {
          status: "TERMINATED",
          terminationDate: new Date(),
        },
      });
      return NextResponse.json({
        success: true,
        message: `Application ${app.name} terminated and cleaned up`,
      });
    }

    return NextResponse.json({ error: `Unsupported admin action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    console.error("[AdminAppPlatform] POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id) {
      return NextResponse.json({ error: "App ID is required" }, { status: 400 });
    }

    const app = await prisma.appPlatformService.findUnique({ where: { id } });
    if (!app || app.status === "TERMINATED") {
      return NextResponse.json({ error: "App Platform instance not found" }, { status: 404 });
    }

    await deleteAppPlatformResources(app);
    await prisma.appPlatformService.update({
      where: { id: app.id },
      data: {
        status: "TERMINATED",
        terminationDate: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Application ${app.name} terminated and cleaned up`,
    });
  } catch (err: unknown) {
    console.error("[AdminAppPlatform] DELETE error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
