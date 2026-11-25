import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import {
  deleteAppPlatformResources,
  getAppPlatformClusterConfig,
  applyAppPlatformResources,
  syncAppPlatformBuildProgress,
} from "@/lib/k8s-app-platform";
import { getAppPlatformPlan } from "@/lib/app-platform-plans";
import { logClientActivity } from "@/lib/activity-log";
import { decryptDeterministic } from "@/lib/encryption";

function stripGitUrlCredentials(url: string): string {
  return (url || "").replace(/\/\/[^/@]+@/, "//");
}

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
      include: {
        deployments: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (user.role !== "ADMIN" && app.userId !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (
      app.lastBuildStatus === "BUILDING" ||
      app.lastBuildStatus === "QUEUED" ||
      app.status === "BUILDING" ||
      app.status === "PROVISIONING"
    ) {
      await syncAppPlatformBuildProgress(app.id).catch(() => {});
      const refreshed = await prisma.appPlatformService.findUnique({
        where: { id: appId },
        include: {
          deployments: {
            orderBy: { createdAt: "desc" },
            take: 20,
          },
        },
      });
      if (refreshed) app = refreshed;
    }

    const clusterConfig = await getAppPlatformClusterConfig().catch(() => null);
    const baseDomain = clusterConfig?.publicDomain || "app.masdikacloud.my.id";
    const publicIp = clusterConfig?.publicIp || "206.237.98.230";
    const fullDomain = `${app.subdomain}.${baseDomain}`;
    const plan = getAppPlatformPlan(app.planName);

    return NextResponse.json({
      success: true,
      data: {
        ...app,
        gitUrl: stripGitUrlCredentials(app.gitUrl),
        fullDomain,
        publicIp,
        httpsUrl: `https://${fullDomain}`,
        nodePortUrl: `http://${publicIp}:${app.port}`,
        plan,
      },
    });
  } catch (error: any) {
    console.error("[AppPlatform] Detail error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
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
      include: {
        deployments: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (user.role !== "ADMIN" && app.userId !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });
    }

    const {
      name,
      gitUrl,
      branch,
      buildType,
      buildMode,
      dockerfilePath,
      rootDirectory,
      buildCommand,
      startCommand,
      envVars,
      customDomain,
      appPort,
      autoDeploy,
      deployOnPush,
      healthCheckPath,
      persistentVolumePath,
      persistentVolumeGb,
      enableBuildCache,
      prPreviewEnabled,
    } = body;

    const dataToUpdate: any = {};
    if (name && typeof name === "string") dataToUpdate.name = name.trim();
    if (gitUrl && typeof gitUrl === "string") {
      let cleanGitUrl = gitUrl.trim();
      if (!cleanGitUrl.includes("@")) {
        // Preserve existing embedded credentials if repository URL did not change
        if (stripGitUrlCredentials(app.gitUrl) === cleanGitUrl && app.gitUrl.includes("@")) {
          cleanGitUrl = app.gitUrl;
        } else {
          const dbUser = await prisma.user.findUnique({
            where: { id: app.userId },
            select: { githubAccessToken: true },
          });
          if (dbUser?.githubAccessToken) {
            try {
              const decryptedToken = decryptDeterministic(dbUser.githubAccessToken);
              if (decryptedToken.startsWith("gitlab:") && cleanGitUrl.startsWith("https://gitlab.com/")) {
                const glTok = decryptedToken.slice("gitlab:".length);
                cleanGitUrl = cleanGitUrl.replace(
                  "https://gitlab.com/",
                  `https://oauth2:${encodeURIComponent(glTok)}@gitlab.com/`
                );
              } else if (decryptedToken.startsWith("bitbucket:") && cleanGitUrl.startsWith("https://bitbucket.org/")) {
                const bbTok = decryptedToken.slice("bitbucket:".length);
                cleanGitUrl = cleanGitUrl.replace(
                  "https://bitbucket.org/",
                  `https://x-token-auth:${encodeURIComponent(bbTok)}@bitbucket.org/`
                );
              } else if (
                !decryptedToken.startsWith("gitlab:") &&
                !decryptedToken.startsWith("bitbucket:") &&
                cleanGitUrl.startsWith("https://github.com/")
              ) {
                cleanGitUrl = cleanGitUrl.replace(
                  "https://github.com/",
                  `https://x-access-token:${encodeURIComponent(decryptedToken)}@github.com/`
                );
              }
            } catch {}
          }
        }
      }
      dataToUpdate.gitUrl = cleanGitUrl;
    }
    if (branch && typeof branch === "string") dataToUpdate.branch = branch.trim();
    if (buildType && typeof buildType === "string") dataToUpdate.buildType = buildType.trim().toUpperCase();
    if (buildMode && typeof buildMode === "string") dataToUpdate.buildMode = buildMode.trim().toUpperCase();
    if (dockerfilePath !== undefined) dataToUpdate.dockerfilePath = dockerfilePath ? dockerfilePath.trim() : "Dockerfile";
    if (rootDirectory !== undefined) dataToUpdate.rootDirectory = rootDirectory ? rootDirectory.trim() : "/";
    if (buildCommand !== undefined) dataToUpdate.buildCommand = buildCommand;
    if (startCommand !== undefined) dataToUpdate.startCommand = startCommand;
    if (envVars !== undefined) dataToUpdate.envVars = envVars;
    if (customDomain !== undefined) dataToUpdate.customDomain = customDomain ? customDomain.trim().toLowerCase() : null;
    if (appPort && !isNaN(parseInt(appPort, 10))) dataToUpdate.appPort = parseInt(appPort, 10);
    if (typeof autoDeploy === "boolean") dataToUpdate.autoDeploy = autoDeploy;
    if (typeof deployOnPush === "boolean") dataToUpdate.deployOnPush = deployOnPush;
    if (healthCheckPath !== undefined) dataToUpdate.healthCheckPath = healthCheckPath ? String(healthCheckPath).trim() : null;
    if (persistentVolumePath !== undefined) dataToUpdate.persistentVolumePath = persistentVolumePath ? String(persistentVolumePath).trim() : null;
    if (persistentVolumeGb !== undefined) dataToUpdate.persistentVolumeGb = Math.max(0, Math.min(50, parseInt(persistentVolumeGb, 10) || 0));
    if (typeof enableBuildCache === "boolean") dataToUpdate.enableBuildCache = enableBuildCache;
    if (typeof prPreviewEnabled === "boolean") dataToUpdate.prPreviewEnabled = prPreviewEnabled;

    const updated = await prisma.appPlatformService.update({
      where: { id: appId },
      data: dataToUpdate,
    });

    // If app is currently running, re-apply ingress and deployment env vars with latest successful image tag
    if (updated.status === "RUNNING") {
      try {
        const lastSuccess = await prisma.appPlatformDeployment.findFirst({
          where: { appId, status: "SUCCESS", imageTag: { not: null } },
          orderBy: { createdAt: "desc" },
        });
        await applyAppPlatformResources(updated as any, lastSuccess?.imageTag || "latest");
      } catch (applyErr) {
        console.warn("[AppPlatform] Re-apply resources warning on patch:", applyErr);
      }
    }

    await logClientActivity({
      userId: user.id,
      description: `Updated configuration for App Platform ${updated.name} (${updated.subdomain})`,
      category: "service",
    }).catch(() => {});

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[AppPlatform] Patch error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
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
      include: {
        deployments: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (user.role !== "ADMIN" && app.userId !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Clean up physical K8s resources
    await deleteAppPlatformResources(app as any).catch((cleanErr) => {
      console.warn("[AppPlatform] Cleanup K8s resources warning:", cleanErr);
    });

    // Update status to TERMINATED
    await prisma.appPlatformService.update({
      where: { id: appId },
      data: {
        status: "TERMINATED",
        terminationDate: new Date(),
      },
    });

    await logClientActivity({
      userId: user.id,
      description: `Terminated App Platform application ${app.name} (${app.subdomain})`,
      category: "service",
    }).catch(() => {});

    return NextResponse.json({ success: true, message: "Application terminated successfully" });
  } catch (error: any) {
    console.error("[AppPlatform] Delete error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
