import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { applyAppPlatformResources } from "@/lib/k8s-app-platform";
import { logClientActivity } from "@/lib/activity-log";

/**
 * POST /api/user/app-platform/[id]/rollback
 * Instant Rollback to a previously successful deployment imageTag
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
    if (app.status === "SUSPENDED") {
      return NextResponse.json({ error: "Cannot rollback a suspended application." }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const targetDeploymentId = parseInt(body?.deploymentId, 10);
    if (isNaN(targetDeploymentId)) {
      return NextResponse.json({ error: "Invalid deploymentId" }, { status: 400 });
    }

    const targetDep = await prisma.appPlatformDeployment.findFirst({
      where: { id: targetDeploymentId, appId },
    });

    if (!targetDep || targetDep.status !== "SUCCESS" || !targetDep.imageTag) {
      return NextResponse.json(
        { error: "Rollback is only available for successful deployments with a valid container image." },
        { status: 400 }
      );
    }

    // Re-apply K8s Deployment pointing to the previous imageTag
    await applyAppPlatformResources(app as any, targetDep.imageTag);

    const depCount = await prisma.appPlatformDeployment.count({ where: { appId } });
    const rollbackDep = await prisma.appPlatformDeployment.create({
      data: {
        appId,
        deploymentNumber: depCount + 1,
        commitHash: targetDep.commitHash,
        commitMessage: `Rollback to #deployment-${targetDep.deploymentNumber}${targetDep.commitHash ? ` (${targetDep.commitHash})` : ""}`,
        branch: targetDep.branch,
        trigger: "ROLLBACK",
        status: "SUCCESS",
        imageTag: targetDep.imageTag,
        durationSeconds: 1,
        buildLogs: `Instant Rollback executed.\nRestored container image tag: 127.0.0.1:5000/${app.subdomain}:${targetDep.imageTag}\nDeployment healthy.`,
      },
    });

    await prisma.appPlatformService.update({
      where: { id: appId },
      data: {
        status: "RUNNING",
        lastBuildStatus: "SUCCESS",
        lastDeployedAt: new Date(),
        lastCommitHash: targetDep.commitHash,
        lastCommitMessage: rollbackDep.commitMessage,
      },
    });

    await logClientActivity({
      userId: user.id,
      description: `Rolled back App Platform ${app.name} to #deployment-${targetDep.deploymentNumber}`,
      category: "service",
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Successfully rolled back to #deployment-${targetDep.deploymentNumber}`,
      data: rollbackDep,
    });
  } catch (error: any) {
    console.error("[AppPlatform] Rollback error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
