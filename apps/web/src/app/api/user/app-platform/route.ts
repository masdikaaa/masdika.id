import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import {
  allocateAppPlatformPort,
  releaseReservedAppPlatformPort,
  checkAppPlatformCapacity,
  getAppPlatformClusterConfig,
  triggerAppPlatformBuild,
  trackAppPlatformBuildAsync,
} from "@/lib/k8s-app-platform";
import { APP_PLATFORM_PLANS, getAppPlatformPlan } from "@/lib/app-platform-plans";
import { assertSufficientCommitmentBalance } from "@/lib/billing-commitment";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/get-ip";
import { logClientActivity } from "@/lib/activity-log";
import { isServiceEnabled } from "@/lib/service-availability";
import { createServiceOrderInvoice } from "@/lib/payg-invoice";
import { decryptDeterministic } from "@/lib/encryption";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const user = authResult.user!;

    const apps = await prisma.appPlatformService.findMany({
      where: user.role === "ADMIN" ? { status: { not: "TERMINATED" } } : { userId: user.id, status: { not: "TERMINATED" } },
      orderBy: { createdAt: "desc" },
    });

    const clusterConfig = await getAppPlatformClusterConfig().catch(() => null);
    const baseDomain = clusterConfig?.publicDomain || "app.masdikacloud.my.id";
    const publicIp = clusterConfig?.publicIp || "206.237.98.230";

    const enriched = apps.map((app) => {
      const fullDomain = `${app.subdomain}.${baseDomain}`;
      const plan = getAppPlatformPlan(app.planName);
      return {
        ...app,
        fullDomain,
        publicIp,
        httpsUrl: `https://${fullDomain}`,
        nodePortUrl: `http://${publicIp}:${app.port}`,
        plan,
      };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (error: any) {
    console.error("[AppPlatform] Error fetching apps:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const authUser = authResult.user!;

    const enabled = await isServiceEnabled("app_platform_enabled");
    if (!enabled && authUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "App Platform is currently disabled. Coming soon!" },
        { status: 403 }
      );
    }

    // Rate Limiting (5 requests per 30 seconds)
    const clientIp = getClientIp(req);
    const rateLimitAllowed = await checkRateLimit(
      "APP_PLATFORM_DEPLOY",
      `${authUser.id}:${clientIp}`,
      5,
      30
    );
    if (!rateLimitAllowed) {
      return NextResponse.json(
        { error: "Too many deployment requests. Please wait a moment before trying again." },
        { status: 429 }
      );
    }

    // Fresh User Balance & Suspension Check
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { id: true, email: true, name: true, role: true, balance: true, isSuspended: true, suspendReason: true, githubAccessToken: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User account not found" }, { status: 401 });
    }

    if (user.isSuspended) {
      return NextResponse.json(
        { error: user.suspendReason || "Your account is currently suspended. Deployment is disabled." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request payload format" }, { status: 400 });
    }

    const {
      name,
      gitUrl,
      branch = "main",
      buildType = "DOCKERFILE",
      dockerfilePath = "Dockerfile",
      rootDirectory = "/",
      buildCommand = "",
      startCommand = "",
      envVars = "",
      subdomain: customSubdomain = "",
      planCode = "1C1G",
      billingMode = "PAYG",
      appPort = 3000,
    } = body;

    const normalizedBillingMode = typeof billingMode === "string" ? billingMode.trim().toUpperCase() : "PAYG";
    if (!["PAYG", "MONTHLY"].includes(normalizedBillingMode)) {
      return NextResponse.json({ error: "Invalid billing mode. Allowed: PAYG, MONTHLY" }, { status: 400 });
    }

    // Strict Name Validation
    const cleanName = typeof name === "string" ? name.trim() : "";
    if (!cleanName || cleanName.length < 2 || cleanName.length > 50) {
      return NextResponse.json({ error: "App name must be between 2 and 50 characters." }, { status: 400 });
    }

    // Git URL Validation (public git repos: https:// or git://)
    let cleanGitUrl = typeof gitUrl === "string" ? gitUrl.trim() : "";
    if (!cleanGitUrl || !/^(https?|git):\/\/[^\s$.?#].[^\s]*$/.test(cleanGitUrl)) {
      return NextResponse.json({ error: "Please enter a valid Git repository URL (e.g. https://github.com/username/repository.git)." }, { status: 400 });
    }

    // Automatically inject connected GitHub/GitLab token if no inline credentials are already present
    if (user.githubAccessToken && !cleanGitUrl.includes("@")) {
      try {
        const decryptedToken = decryptDeterministic(user.githubAccessToken);
        if (decryptedToken.startsWith("gitlab:") && cleanGitUrl.startsWith("https://gitlab.com/")) {
          const glTok = decryptedToken.slice("gitlab:".length);
          cleanGitUrl = cleanGitUrl.replace(
            "https://gitlab.com/",
            `https://oauth2:${encodeURIComponent(glTok)}@gitlab.com/`
          );
        } else if (!decryptedToken.startsWith("gitlab:") && cleanGitUrl.startsWith("https://github.com/")) {
          cleanGitUrl = cleanGitUrl.replace(
            "https://github.com/",
            `https://x-access-token:${encodeURIComponent(decryptedToken)}@github.com/`
          );
        }
      } catch {}
    }

    const cleanBranch = typeof branch === "string" && branch.trim() ? branch.trim() : "main";
    const allowedBuildTypes = [
      "DOCKERFILE",
      "NODEJS",
      "NEXTJS",
      "NESTJS",
      "LARAVEL",
      "PYTHON",
      "FASTAPI",
      "DJANGO",
      "GOLANG",
      "PHP",
      "RUBY",
      "RAILS",
      "RUST",
      "STATIC",
      "VITE",
      "ASTRO",
      "SVELTE",
      "REMIX",
      "WORDPRESS",
    ];
    const normalizedBuildType = (buildType || "DOCKERFILE").toUpperCase().trim();
    if (!allowedBuildTypes.includes(normalizedBuildType)) {
      return NextResponse.json({ error: `Invalid build type. Allowed: ${allowedBuildTypes.join(", ")}` }, { status: 400 });
    }

    // Resolve Plan Specs (Dynamic DB plan support with fallback to static catalog)
    const plan = getAppPlatformPlan(planCode);
    let cpuShares = plan.cpuShares;
    let memoryMb = plan.memoryMb;
    let storageGb = plan.storageGb;
    let monthlyPrice = plan.monthlyPrice;
    let hourlyRate = plan.hourlyRate;
    let planName = plan.name;
    let resolvedPlanCode = plan.planCode;

    const dbPlan = await prisma.plan.findFirst({
      where: {
        service: "APP_PLATFORM",
        isActive: true,
        OR: [
          { name: { contains: planCode, mode: "insensitive" } },
          { limits: { contains: planCode } },
        ],
      },
    });

    if (dbPlan) {
      planName = dbPlan.name;
      monthlyPrice = dbPlan.price;
      hourlyRate = dbPlan.hourlyPrice || Math.max(1, Math.round(dbPlan.price / 720));
      try {
        const parsed = JSON.parse(dbPlan.limits);
        resolvedPlanCode = parsed.planCode || resolvedPlanCode;
        cpuShares = Number(parsed.cpuShares) || parseFloat(parsed.cpu || "1") || cpuShares;
        memoryMb = Number(parsed.memoryMb) || (parsed.ram?.includes("GB") ? parseFloat(parsed.ram) * 1024 : memoryMb);
        storageGb = Number(parsed.storageGb) || (parsed.storage ? parseInt(parsed.storage, 10) : storageGb);
      } catch {
        // fallback to defaults
      }
    }

    // Cluster Hardware Capacity Pre-Flight Check (8 Core / 16 GB RAM / 96 GB SSD)
    const clusterCapacity = await checkAppPlatformCapacity(cpuShares, memoryMb, storageGb);
    if (!clusterCapacity.available) {
      return NextResponse.json({
        error: clusterCapacity.userMessage || "The App Platform cluster is currently at capacity. Deployments are temporarily paused.",
      }, { status: 400 });
    }

    // Subdomain Sanitization & Generation
    let resolvedSubdomain = "";
    if (customSubdomain && typeof customSubdomain === "string") {
      let sub = customSubdomain.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      if (sub.length >= 3 && sub.length <= 32) {
        resolvedSubdomain = sub;
      }
    }
    if (!resolvedSubdomain) {
      resolvedSubdomain = `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16) || "app"}-${crypto.randomBytes(3).toString("hex")}`;
    }

    // Port Allocation (Range 30000..32767)
    const port = await allocateAppPlatformPort();

    // Default Container Port based on framework
    let finalAppPort = Number(appPort) || 3000;
    if (!appPort || finalAppPort === 3000) {
      if (["PHP", "LARAVEL", "WORDPRESS", "STATIC", "VITE"].includes(normalizedBuildType)) finalAppPort = 80;
      else if (["GOLANG", "RUST"].includes(normalizedBuildType)) finalAppPort = 8080;
      else if (["FASTAPI", "DJANGO"].includes(normalizedBuildType)) finalAppPort = 8000;
      else if (normalizedBuildType === "ASTRO") finalAppPort = 4321;
    }

    let appRecord: any;
    try {
      const txOutcome = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;

        const freshUser = await tx.user.findUnique({
          where: { id: user.id },
          select: { id: true, balance: true, isSuspended: true, suspendReason: true },
        });
        if (!freshUser) throw new Error("USER_NOT_FOUND");
        if (freshUser.isSuspended) throw new Error(`ACCOUNT_SUSPENDED:${freshUser.suspendReason || "Your account is suspended."}`);

        // Billing commitment check
        await assertSufficientCommitmentBalance({
          userId: user.id,
          userBalance: freshUser.balance,
          newServiceMonthly: monthlyPrice,
          serviceName: `App Platform (${cleanName} - ${planName})`,
          tx,
        });

        // Ensure subdomain uniqueness across both Cloud Apps and Managed Apps
        let candidate = resolvedSubdomain;
        while (
          (await tx.appPlatformService.findUnique({ where: { subdomain: candidate } })) ||
          (await tx.appService.findUnique({ where: { subdomain: candidate } }))
        ) {
          candidate = `${resolvedSubdomain.slice(0, 20)}-${crypto.randomBytes(2).toString("hex")}`;
        }
        resolvedSubdomain = candidate;

        // Deduct upfront balance if Monthly billing
        if (normalizedBillingMode === "MONTHLY") {
          const deducted = await tx.user.updateMany({
            where: { id: user.id, balance: { gte: monthlyPrice } },
            data: { balance: { decrement: monthlyPrice } },
          });
          if (deducted.count === 0) throw new Error("INSUFFICIENT_BALANCE");
        }

        const webhookSecret = crypto.randomBytes(24).toString("hex");

        const created = await tx.appPlatformService.create({
          data: {
            userId: user.id,
            name: cleanName,
            gitUrl: cleanGitUrl,
            branch: cleanBranch,
            buildType: normalizedBuildType,
            dockerfilePath: dockerfilePath || "Dockerfile",
            rootDirectory: rootDirectory || "/",
            buildCommand: buildCommand || null,
            startCommand: startCommand || null,
            envVars: envVars || null,
            subdomain: resolvedSubdomain,
            host: "app.masdikacloud.my.id",
            port,
            appPort: finalAppPort,
            planName: resolvedPlanCode,
            cpuShares,
            memoryMb,
            storageGb,
            billingMode: normalizedBillingMode,
            monthlyPrice,
            hourlyRate,
            accumulatedCost: normalizedBillingMode === "MONTHLY" ? monthlyPrice : 0,
            status: "PROVISIONING",
            lastBuildStatus: "QUEUED",
            webhookSecret,
            autoDeploy: true,
            deployOnPush: true,
            buildMode: (body.buildMode || "DOCKERFILE").toUpperCase().trim(),
            healthCheckPath: typeof body.healthCheckPath === "string" && body.healthCheckPath.trim() ? body.healthCheckPath.trim() : null,
            persistentVolumePath: typeof body.persistentVolumePath === "string" && body.persistentVolumePath.trim() ? body.persistentVolumePath.trim() : null,
            persistentVolumeGb: Number(body.persistentVolumeGb) > 0 ? Math.min(50, Math.round(Number(body.persistentVolumeGb))) : 0,
            enableBuildCache: body.enableBuildCache !== false,
            prPreviewEnabled: Boolean(body.prPreviewEnabled),
            node: "cloudapps",
            k8sNamespace: "app-platform",
            k8sDeployment: `app-${resolvedSubdomain}`,
            k8sService: `app-${resolvedSubdomain}`,
            k8sIngress: `app-${resolvedSubdomain}`,
          },
        });

        // Create unified invoice per AGENTS.md
        await createServiceOrderInvoice(tx, {
          userId: user.id,
          serviceIdField: "appPlatformServiceId",
          serviceId: created.id,
          type: "APP_PLATFORM",
          amount: normalizedBillingMode === "MONTHLY" ? monthlyPrice : 0,
          billingMode: normalizedBillingMode,
          serviceName: cleanName,
          extraDetails: {
            gitUrl: cleanGitUrl,
            branch: cleanBranch,
            buildType: normalizedBuildType,
            planName: resolvedPlanCode,
            cpuShares,
            memoryMb,
            storageGb,
            billingMode: normalizedBillingMode,
          },
        });

        return { created };
      });

      appRecord = txOutcome.created;
    } catch (txErr: any) {
      releaseReservedAppPlatformPort(port);
      const msg = txErr?.message || "Order transaction failed.";
      if (msg === "USER_NOT_FOUND") return NextResponse.json({ error: "User account not found." }, { status: 401 });
      if (msg.startsWith("ACCOUNT_SUSPENDED:")) return NextResponse.json({ error: msg.slice("ACCOUNT_SUSPENDED:".length) }, { status: 403 });
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Trigger Kaniko build in cluster
    try {
      const { jobName, imageTag, deploymentId } = await triggerAppPlatformBuild(appRecord);

      // Asynchronously track build and deploy resources when complete
      trackAppPlatformBuildAsync(appRecord.id, jobName, imageTag, deploymentId).catch((err) => {
        console.error("[AppPlatform] Async build tracking error:", err);
      });
    } catch (buildErr: any) {
      console.error("[AppPlatform] Failed to trigger build job:", buildErr);
      await prisma.appPlatformService.update({
        where: { id: appRecord.id },
        data: {
          status: "ERROR",
          lastBuildStatus: "FAILED",
          lastBuildLog: `Failed to trigger build job: ${buildErr?.message || "Unknown error"}`,
        },
      });
    }

    await logClientActivity({
      userId: user.id,
      description: `Deployed App Platform application ${cleanName} (${resolvedSubdomain}) from ${cleanGitUrl}`,
      category: "service",
    }).catch(() => {});

    const baseDomain = "app.masdikacloud.my.id";
    const fullDomain = `${resolvedSubdomain}.${baseDomain}`;

    return NextResponse.json({
      success: true,
      data: {
        ...appRecord,
        fullDomain,
        httpsUrl: `https://${fullDomain}`,
        nodePortUrl: `http://206.237.98.230:${port}`,
      },
    });
  } catch (error: any) {
    console.error("[AppPlatform] Unexpected deploy error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
