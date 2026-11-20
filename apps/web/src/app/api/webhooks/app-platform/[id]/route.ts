import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { triggerAppPlatformBuild, trackAppPlatformBuildAsync } from "@/lib/k8s-app-platform";
import crypto from "crypto";

/**
 * GitHub / GitLab Push Webhook Endpoint for Automated CI/CD Deploy on Push
 * POST /api/webhooks/app-platform/[id]
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const appId = parseInt(id, 10);
    if (isNaN(appId)) {
      return NextResponse.json({ error: "Invalid application ID" }, { status: 400 });
    }

    const app = await prisma.appPlatformService.findUnique({
      where: { id: appId },
    });

    if (!app || app.status === "TERMINATED" || app.status === "SUSPENDED") {
      return NextResponse.json({ error: "Application not found or inactive" }, { status: 404 });
    }

    const rawBody = await req.text();
    const signature256 = req.headers.get("x-hub-signature-256");
    const tokenHeader = req.headers.get("x-masdika-token") || req.headers.get("x-gitlab-token");
    const queryToken = req.nextUrl.searchParams.get("token");

    // Verify webhook secret if configured
    if (app.webhookSecret) {
      let verified = false;

      if (signature256) {
        const expected = `sha256=${crypto
          .createHmac("sha256", app.webhookSecret)
          .update(rawBody)
          .digest("hex")}`;
        try {
          verified = crypto.timingSafeEqual(
            Buffer.from(signature256),
            Buffer.from(expected)
          );
        } catch {
          verified = false;
        }
      } else if (tokenHeader && tokenHeader === app.webhookSecret) {
        verified = true;
      } else if (queryToken && queryToken === app.webhookSecret) {
        verified = true;
      }

      if (!verified) {
        return NextResponse.json({ error: "Invalid webhook signature or secret token" }, { status: 401 });
      }
    }

    let payload: any = {};
    try {
      payload = JSON.parse(rawBody || "{}");
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // Handle GitHub ping event cleanly
    const ghEvent = req.headers.get("x-github-event");
    if (ghEvent === "ping") {
      return NextResponse.json({ success: true, message: "Webhook connected successfully (pong)" });
    }

    if (!app.autoDeploy || !app.deployOnPush) {
      return NextResponse.json({
        success: true,
        ignored: true,
        message: "Auto Deploy / Deploy on Push is currently disabled for this application.",
      });
    }

    // Extract branch and commit metadata (GitHub & GitLab compatible)
    const ref: string = payload.ref || "";
    const pushedBranch = ref.startsWith("refs/heads/") ? ref.slice("refs/heads/".length) : ref;
    const targetBranch = (app.branch || "main").trim();

    if (pushedBranch && pushedBranch !== targetBranch) {
      return NextResponse.json({
        success: true,
        ignored: true,
        message: `Push to branch '${pushedBranch}' ignored (configured branch is '${targetBranch}').`,
      });
    }

    const headCommit = payload.head_commit || (Array.isArray(payload.commits) ? payload.commits[payload.commits.length - 1] : null);
    const commitHash: string | null = (headCommit?.id || payload.after || "").slice(0, 7) || null;
    const commitMessage: string | null = headCommit?.message ? String(headCommit.message).split("\n")[0].slice(0, 200) : "Triggered by Git Push";

    const depCount = await prisma.appPlatformDeployment.count({ where: { appId: app.id } });
    const deployment = await prisma.appPlatformDeployment.create({
      data: {
        appId: app.id,
        deploymentNumber: depCount + 1,
        commitHash,
        commitMessage,
        branch: targetBranch,
        trigger: "GIT_PUSH",
        status: "QUEUED",
      },
    });

    await prisma.appPlatformService.update({
      where: { id: app.id },
      data: {
        lastCommitHash: commitHash,
        lastCommitMessage: commitMessage,
      },
    });

    const { jobName, imageTag } = await triggerAppPlatformBuild(app as any, deployment.id);

    trackAppPlatformBuildAsync(app.id, jobName, imageTag, deployment.id).catch((err) => {
      console.error("[Webhook AppPlatform] Async build tracking error:", err);
    });

    return NextResponse.json({
      success: true,
      message: "Deployment triggered via Git Push webhook",
      deploymentId: deployment.id,
      deploymentNumber: deployment.deploymentNumber,
      commitHash,
    });
  } catch (error: any) {
    console.error("[Webhook AppPlatform] Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
