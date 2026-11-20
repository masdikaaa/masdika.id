import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  triggerAppPlatformBuild,
  trackAppPlatformBuildAsync,
  applyPrPreviewResources,
  deletePrPreviewResources,
} from "@/lib/k8s-app-platform";
import crypto from "crypto";

/**
 * Health / Info Check for GitHub / GitLab Webhook URL
 * GET /api/webhooks/app-platform/[id]
 */
export async function GET(
  _req: NextRequest,
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
      select: {
        id: true,
        subdomain: true,
        branch: true,
        status: true,
        autoDeploy: true,
        deployOnPush: true,
      },
    });

    if (!app || app.status === "TERMINATED") {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      status: "active",
      endpoint: "Masdika Cloud Git Push Webhook",
      appId: app.id,
      subdomain: app.subdomain,
      branch: app.branch,
      autoDeploy: app.autoDeploy,
      deployOnPush: app.deployOnPush,
      method: "POST",
      supportedProviders: ["GitHub", "GitLab"],
      message: "Webhook listener is active. Configure this URL in GitHub or GitLab Webhooks (POST).",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

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
      const contentType = (req.headers.get("content-type") || "").toLowerCase();
      if (contentType.includes("application/x-www-form-urlencoded")) {
        const formParams = new URLSearchParams(rawBody);
        const formPayload = formParams.get("payload");
        payload = JSON.parse(formPayload || "{}");
      } else {
        payload = JSON.parse(rawBody || "{}");
      }
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // Handle GitHub ping event cleanly
    const ghEvent = req.headers.get("x-github-event");
    if (ghEvent === "ping") {
      return NextResponse.json({ success: true, message: "Webhook connected successfully (pong)" });
    }

    // Handle GitHub Pull Request events for PR Preview Environments
    if (ghEvent === "pull_request" && app.prPreviewEnabled) {
      const prAction = payload.action;
      const prNumber = Number(payload.number || payload.pull_request?.number);
      const prHeadSha = payload.pull_request?.head?.sha ? String(payload.pull_request.head.sha) : null;
      const prBranch = payload.pull_request?.head?.ref ? String(payload.pull_request.head.ref) : app.branch;

      if (!prNumber || isNaN(prNumber)) {
        return NextResponse.json({ success: true, ignored: true, message: "Missing PR number" });
      }

      if (prAction === "closed") {
        await deletePrPreviewResources(app as any, prNumber).catch(() => {});
        return NextResponse.json({ success: true, message: `PR #${prNumber} preview environment cleaned up.` });
      }

      if (["opened", "reopened", "synchronize"].includes(prAction)) {
        const prTag = `pr-${prNumber}-${Date.now().toString(36)}`;
        const { jobName } = await triggerAppPlatformBuild(
          { ...app, branch: prBranch } as any,
          undefined,
          prHeadSha,
          prTag
        );
        // Deploy ephemeral preview after short build watch
        applyPrPreviewResources(app as any, prNumber, prTag).catch(() => {});
        return NextResponse.json({
          success: true,
          message: `PR #${prNumber} preview build (${jobName}) triggered.`,
          previewDomain: `pr-${prNumber}-${app.subdomain}.app.masdikacloud.my.id`,
        });
      }

      return NextResponse.json({ success: true, ignored: true, message: `PR action '${prAction}' ignored.` });
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
