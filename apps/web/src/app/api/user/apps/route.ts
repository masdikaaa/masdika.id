import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import {
  allocateAppPort,
  deployAppService,
  getAppClusterConfig,
} from "@/lib/k8s-app";
import {
  getAppDefinition,
  getAppPlan,
} from "@/lib/app-catalog";
import { assertSufficientCommitmentBalance } from "@/lib/billing-commitment";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/get-ip";
import { logClientActivity } from "@/lib/activity-log";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const user = authResult.user!;

    const apps = await prisma.appService.findMany({
      where: user.role === "ADMIN" ? { status: { not: "TERMINATED" } } : { userId: user.id, status: { not: "TERMINATED" } },
      orderBy: { createdAt: "desc" },
    });

    const clusterConfig = await getAppClusterConfig().catch(() => null);
    const enriched = apps.map((app) => {
      const fullDomain = `${app.subdomain}.app.masdika.id`;
      const catalog = getAppDefinition(app.appType);
      return {
        ...app,
        fullDomain,
        publicIp: clusterConfig?.publicIp || "103.247.10.61",
        httpsUrl: `https://${fullDomain}`,
        nodePortUrl: `http://${clusterConfig?.publicIp || "103.247.10.61"}:${app.port}`,
        catalog,
      };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (error: any) {
    console.error("Error fetching managed apps:", error);
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

    // 1. Rate Limiting (5 requests per 30 seconds)
    const clientIp = getClientIp(req);
    const rateLimitAllowed = await checkRateLimit(
      "APP_DEPLOY",
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

    // 2. Fresh User Balance & Suspension Check
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { id: true, email: true, name: true, role: true, balance: true, isSuspended: true, suspendReason: true },
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

    const body = await req.json();
    const {
      name,
      appType,
      planCode = "1C2G",
      billingMode = "MONTHLY",
      customSubdomain,
    } = body;

    // 3. Strict Input Validation
    const cleanName = typeof name === "string" ? name.trim() : "";
    if (!cleanName) {
      return NextResponse.json({ error: "Application name is required" }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_\-\.\s]{2,50}$/.test(cleanName)) {
      return NextResponse.json({
        error: "Application name can only contain letters, numbers, spaces, dots, hyphens, and underscores (2-50 characters)."
      }, { status: 400 });
    }

    const typeNormalized = (appType || "").toLowerCase().trim();
    const catalogItem = getAppDefinition(typeNormalized);
    if (!catalogItem) {
      return NextResponse.json({
        error: `Invalid application type. Allowed: hermes, ninerouter, n8n, opencode, openclaw`,
      }, { status: 400 });
    }

    const planItem = getAppPlan(planCode);
    if (!planItem) {
      return NextResponse.json({
        error: `Invalid compute plan code. Allowed: 1C1G, 1C2G, 2C2G, 2C4G, 4C4G, 4C8G, 4C16G`,
      }, { status: 400 });
    }

    // 4. Server-Side Price & Commitment Calculation (Tamper-Proof)
    const monthlyPrice = planItem.monthlyPrice;
    const hourlyRate = planItem.hourlyPrice;

    await assertSufficientCommitmentBalance({
      userId: user.id,
      userBalance: user.balance,
      newServiceMonthly: monthlyPrice,
      serviceName: `Managed App (${catalogItem.name} - ${planItem.planCode})`,
    });

    // 5. Generate or Validate Subdomain
    let subdomain = "";
    if (customSubdomain && typeof customSubdomain === "string") {
      const cleanSub = customSubdomain.toLowerCase().trim().replace(/[^a-z0-9-]/g, "");
      if (cleanSub.length >= 3 && cleanSub.length <= 30) {
        // Verify uniqueness
        const existing = await prisma.appService.findUnique({ where: { subdomain: cleanSub } });
        if (!existing) {
          subdomain = cleanSub;
        }
      }
    }

    if (!subdomain) {
      const randomSuffix = crypto.randomBytes(3).toString("hex");
      subdomain = `${catalogItem.id}-${randomSuffix}`;
    }

    // 6. NodePort Allocation (Checking both DatabaseService and AppService used ports)
    const port = await allocateAppPort(30000, 32767);

    // 7. Generate Initial Credentials
    const randomPassword = `MkApp_${crypto.randomBytes(6).toString("base64url")}`;
    const randomApiKey = `mk_${crypto.randomBytes(16).toString("hex")}`;
    const defaultUsername = catalogItem.accessProtocol === "SSH" ? "root" : "admin";

    // 8. Create Record in Database
    const appRecord = await prisma.appService.create({
      data: {
        userId: user.id,
        name: cleanName,
        appType: catalogItem.id,
        templateName: `${catalogItem.name} (${planItem.planCode})`,
        planName: planItem.planCode,
        region: "Sidoarjo",
        node: "managed-apps",
        subdomain,
        host: "app.masdika.id",
        port,
        appPort: catalogItem.appPort,
        username: defaultUsername,
        password: randomPassword,
        apiKey: randomApiKey,
        cpuShares: planItem.cpuShares,
        memoryMb: planItem.memoryMb,
        storageGb: planItem.storageGb,
        billingMode: billingMode === "PAYG" ? "PAYG" : "MONTHLY",
        monthlyPrice,
        hourlyRate,
        status: "PROVISIONING",
      },
    });

    // 9. Deploy to Kubernetes Asynchronously or Synchronously with rollback on failure
    try {
      const k8sResult = await deployAppService({
        id: appRecord.id,
        userId: user.id,
        name: cleanName,
        appType: catalogItem.id,
        templateName: appRecord.templateName,
        planName: planItem.planCode,
        region: "Sidoarjo",
        node: "managed-apps",
        subdomain,
        host: "app.masdika.id",
        port,
        appPort: catalogItem.appPort,
        username: defaultUsername,
        password: randomPassword,
        apiKey: randomApiKey,
        cpuShares: planItem.cpuShares,
        memoryMb: planItem.memoryMb,
        storageGb: planItem.storageGb,
        billingMode: appRecord.billingMode,
        monthlyPrice,
        hourlyRate,
        accumulatedCost: 0,
        status: "PROVISIONING",
      });

      // Update with running status and k8s metadata
      const updatedApp = await prisma.appService.update({
        where: { id: appRecord.id },
        data: {
          status: "RUNNING",
          k8sNamespace: "managed-apps",
          k8sDeployment: k8sResult.deploymentName,
          k8sService: k8sResult.serviceName,
          k8sPvc: k8sResult.pvcName,
          k8sIngress: k8sResult.ingressName || null,
        },
      });

      // Audit Log
      const connDesc = catalogItem.accessProtocol === "SSH"
        ? `SSH port ${port}`
        : `port ${port} and https://${subdomain}.app.masdika.id`;

      await logClientActivity({
        userId: user.id,
        description: `Deployed Managed App '${cleanName}' (${catalogItem.name} ${planItem.planCode}) on ${connDesc}`,
        ipAddress: clientIp,
        category: "service",
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        data: {
          ...updatedApp,
          httpsUrl: catalogItem.accessProtocol === "SSH" ? null : `https://${subdomain}.app.masdika.id`,
          sshCommand: catalogItem.accessProtocol === "SSH" ? `ssh root@103.247.10.61 -p ${port}` : null,
          nodePortUrl: `http://103.247.10.61:${port}`,
        },
        message: `Successfully provisioned ${catalogItem.name}.`,
      });
    } catch (k8sErr: any) {
      console.error("Kubernetes deployment error:", k8sErr);
      // Mark as ERROR in DB
      await prisma.appService.update({
        where: { id: appRecord.id },
        data: { status: "ERROR", suspendReason: k8sErr.message || "Failed to initialize Kubernetes pod" },
      });
      return NextResponse.json({
        error: `Failed to deploy application on Kubernetes cluster: ${k8sErr.message || "Cluster error"}`,
        appId: appRecord.id,
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Error creating managed app:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
