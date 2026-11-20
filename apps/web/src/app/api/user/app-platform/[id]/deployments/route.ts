import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { triggerAppPlatformBuild, trackAppPlatformBuildAsync } from "@/lib/k8s-app-platform";

/**
 * GET /api/user/app-platform/[id]/deployments
 * List deployment history for an App Platform application
 */
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

    const app = await prisma.appPlatformService.findUnique({
      where: { id: appId },
      select: { id: true, userId: true },
    });

    if (!app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }
    if (user.role !== "ADMIN" && app.userId !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const deployments = await prisma.appPlatformDeployment.findMany({
      where: { appId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ success: true, data: deployments });
  } catch (error: any) {
    console.error("[AppPlatform] List deployments error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/user/app-platform/[id]/deployments
 * Trigger a Manual Deploy (or Deploy Specific Commit)
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
      return NextResponse.json({ error: "Cannot deploy a suspended application. Please top up balance first." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const requestedCommit = typeof body?.commitHash === "string" && body.commitHash.trim()
      ? body.commitHash.trim().slice(0, 40)
      : null;
    const commitHash = requestedCommit || app.lastCommitHash || null;
    const commitMessage = typeof body?.commitMessage === "string" && body.commitMessage.trim()
      ? body.commitMessage.trim().slice(0, 200)
      : (requestedCommit ? `Deploy commit ${requestedCommit.slice(0, 7)}` : "Manual deployment triggered");

    const depCount = await prisma.appPlatformDeployment.count({ where: { appId } });
    const deployment = await prisma.appPlatformDeployment.create({
      data: {
        appId,
        deploymentNumber: depCount + 1,
        commitHash: commitHash ? commitHash.slice(0, 7) : null,
        commitMessage,
        branch: app.branch || "main",
        trigger: "MANUAL",
        status: "QUEUED",
      },
    });

    const { jobName, imageTag } = await triggerAppPlatformBuild(app as any, deployment.id, requestedCommit);

    trackAppPlatformBuildAsync(app.id, jobName, imageTag, deployment.id).catch((err) => {
      console.error("[AppPlatform] Manual deploy async tracking error:", err);
    });

    return NextResponse.json({
      success: true,
      message: "Manual deployment started",
      data: deployment,
    });
  } catch (error: any) {
    console.error("[AppPlatform] Manual deploy error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE /api/user/app-platform/[id]/deployments?deploymentId=123 OR ?clearOld=true
 * Delete a specific deployment record or clean up old non-active deployment history
 */
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
      select: { id: true, userId: true },
    });

    if (!app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }
    if (user.role !== "ADMIN" && app.userId !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const deploymentIdParam = req.nextUrl.searchParams.get("deploymentId");
    const clearOld = req.nextUrl.searchParams.get("clearOld") === "true";

    if (clearOld) {
      const latestDep = await prisma.appPlatformDeployment.findFirst({
        where: { appId },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });

      const deleted = await prisma.appPlatformDeployment.deleteMany({
        where: {
          appId,
          ...(latestDep ? { id: { not: latestDep.id } } : {}),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Cleaned up ${deleted.count} old deployment record(s).`,
        deletedCount: deleted.count,
      });
    }

    const depId = parseInt(deploymentIdParam || "", 10);
    if (isNaN(depId)) {
      return NextResponse.json({ error: "deploymentId or clearOld=true is required" }, { status: 400 });
    }

    const target = await prisma.appPlatformDeployment.findFirst({
      where: { id: depId, appId },
    });
    if (!target) {
      return NextResponse.json({ error: "Deployment record not found" }, { status: 404 });
    }

    await prisma.appPlatformDeployment.delete({ where: { id: depId } });

    return NextResponse.json({
      success: true,
      message: `Deleted #deployment-${target.deploymentNumber}`,
    });
  } catch (error: any) {
    console.error("[AppPlatform] Delete deployment error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
