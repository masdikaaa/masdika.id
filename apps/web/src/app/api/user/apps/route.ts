import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import {
  allocateAppPort,
  releaseReservedAppPort,
  deployAppService,
  getAppClusterConfig,
  checkAppClusterCapacity,
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
    const baseDomain = clusterConfig?.publicDomain || "app.masdika.id";
    const clusterIp = clusterConfig?.publicIp || "";
    const enriched = apps.map((app) => {
      const fullDomain = `${app.subdomain}.${baseDomain}`;
      const catalog = getAppDefinition(app.appType);
      return {
        ...app,
        fullDomain,
        publicIp: clusterIp,
        httpsUrl: `https://${fullDomain}`,
        nodePortUrl: clusterIp ? `http://${clusterIp}:${app.port}` : null,
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

    // 4. Dynamic Server-Side Price & Commitment Calculation (Tamper-Proof from DB)
    const dbPlan = await prisma.plan.findFirst({
      where: {
        service: 'APP',
        isActive: true,
        OR: [
          { name: { contains: planCode, mode: 'insensitive' } },
          { limits: { contains: `"${planCode}"` } },
          { limits: { contains: planCode } },
        ],
      },
    });

    const fallbackPlan = getAppPlan(planCode);
    if (!dbPlan && !fallbackPlan) {
      return NextResponse.json({
        error: `Invalid compute plan code. Allowed: 1C1G, 1C2G, 2C2G, 2C4G, 4C4G, 4C8G, 4C16G`,
      }, { status: 400 });
    }

    let parsedLimits: any = {};
    if (dbPlan) {
      try { parsedLimits = JSON.parse(dbPlan.limits); } catch {}
    }

    const planCodeFinal = parsedLimits.planCode || fallbackPlan?.planCode || planCode.toUpperCase();
    const cpuShares = Number(parsedLimits.cpuShares) || parseFloat(parsedLimits.cpu || "1") || fallbackPlan?.cpuShares || 1.0;
    const memoryMb = Number(parsedLimits.memoryMb) || (parsedLimits.ram?.includes("GB") ? parseFloat(parsedLimits.ram) * 1024 : (fallbackPlan?.memoryMb || 1024));
    const storageGb = Number(parsedLimits.storageGb) || fallbackPlan?.storageGb || 10;
    const monthlyPrice = dbPlan ? dbPlan.price : fallbackPlan!.monthlyPrice;
    const hourlyRate = dbPlan ? (dbPlan.hourlyPrice || Math.round(dbPlan.price / 720)) : fallbackPlan!.hourlyPrice;

    await assertSufficientCommitmentBalance({
      userId: user.id,
      userBalance: user.balance,
      newServiceMonthly: monthlyPrice,
      serviceName: `Managed App (${catalogItem.name} - ${planCodeFinal})`,
    });

    // 4.5 Cluster Hardware Capacity Check (8 Core CPU / 16 GB RAM / 60 GB Disk)
    const clusterCapacity = await checkAppClusterCapacity(cpuShares, memoryMb, storageGb);
    if (!clusterCapacity.available) {
      return NextResponse.json({
        error: clusterCapacity.userMessage || "The Managed Applications cluster is currently at full capacity. Deployments are paused.",
      }, { status: 400 });
    }

    // 5. Smart Collision-Proof Subdomain Generator & Conflict Resolver
    let subdomain = "";
    if (customSubdomain && typeof customSubdomain === "string" && catalogItem.accessProtocol !== "SSH") {
      const cleanSub = customSubdomain.toLowerCase().trim().replace(/[^a-z0-9-]/g, "").slice(0, 30);
      if (cleanSub.length >= 3) {
        // Smart Check: does this subdomain already exist in DB?
        const existing = await prisma.appService.findUnique({ where: { subdomain: cleanSub } });
        if (!existing) {
          subdomain = cleanSub;
        } else {
          // CERDAS: Jika nama sudah dipakai user lain, jangan bentrok atau timpa!
          // Auto-append short unique suffix while preserving the user's custom brand name!
          let candidate = `${cleanSub.slice(0, 24)}-${crypto.randomBytes(2).toString("hex")}`;
          while (await prisma.appService.findUnique({ where: { subdomain: candidate } })) {
            candidate = `${cleanSub.slice(0, 24)}-${crypto.randomBytes(2).toString("hex")}`;
          }
          subdomain = candidate;
        }
      }
    }

    if (!subdomain) {
      let candidate = `${catalogItem.id}-${crypto.randomBytes(3).toString("hex")}`;
      while (await prisma.appService.findUnique({ where: { subdomain: candidate } })) {
        candidate = `${catalogItem.id}-${crypto.randomBytes(3).toString("hex")}`;
      }
      subdomain = candidate;
    }

    // 6. Smart NodePort Allocation (Dedicated Range 31500..32767 with in-memory lock & cross-checks)
    const port = await allocateAppPort();

    // 7. Generate Initial Credentials (9Router uses standard default 123456 as shown in setup prompt)
    const randomPassword = catalogItem.id === "ninerouter" ? "123456" : `MkApp_${crypto.randomBytes(6).toString("base64url")}`;
    const randomApiKey = `mk_${crypto.randomBytes(16).toString("hex")}`;
    const defaultUsername = (catalogItem.accessProtocol === "SSH" || catalogItem.accessProtocol === "BOTH") ? "root" : "admin";

    // 8. Create Record in Database
    const appRecord = await prisma.appService.create({
      data: {
        userId: user.id,
        name: cleanName,
        appType: catalogItem.id,
        templateName: `${catalogItem.name} (${planCodeFinal})`,
        planName: planCodeFinal,
        region: "Sidoarjo",
        node: "managed-apps",
        subdomain,
        host: "app.masdika.id",
        port,
        appPort: catalogItem.appPort,
        username: defaultUsername,
        password: randomPassword,
        apiKey: randomApiKey,
        cpuShares,
        memoryMb,
        storageGb,
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
        planName: planCodeFinal,
        region: "Sidoarjo",
        node: "managed-apps",
        subdomain,
        host: "app.masdika.id",
        port,
        appPort: catalogItem.appPort,
        username: defaultUsername,
        password: randomPassword,
        apiKey: randomApiKey,
        cpuShares,
        memoryMb,
        storageGb,
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
      const hasWeb = catalogItem.accessProtocol === "WEB" || catalogItem.accessProtocol === "BOTH";
      const hasSsh = catalogItem.accessProtocol === "SSH" || catalogItem.accessProtocol === "BOTH";

      const clusterConfig = await getAppClusterConfig().catch(() => null);
      const baseDomain = clusterConfig?.publicDomain || "app.masdika.id";
      const clusterIp = clusterConfig?.publicIp || "";
      const fullDomain = `${subdomain}.${baseDomain}`;

      const connDesc = (hasWeb && hasSsh)
        ? `Web Dashboard (https://${fullDomain}) and SSH port ${port}`
        : hasSsh
        ? (clusterIp ? `SSH port ${port} (${clusterIp})` : `SSH port ${port}`)
        : `https://${fullDomain} (port ${port})`;

      await logClientActivity({
        userId: user.id,
        description: `Deployed Managed App '${cleanName}' (${catalogItem.name} ${planCodeFinal}) on ${connDesc}`,
        ipAddress: clientIp,
        category: "service",
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        data: {
          ...updatedApp,
          fullDomain,
          publicIp: clusterIp,
          httpsUrl: hasWeb ? `https://${fullDomain}` : null,
          sshCommand: hasSsh ? (clusterIp ? `ssh root@${clusterIp} -p ${port}` : null) : null,
          nodePortUrl: clusterIp ? `http://${clusterIp}:${port}` : null,
        },
        message: `Successfully provisioned ${catalogItem.name}.`,
      });
    } catch (k8sErr: any) {
      console.error("Kubernetes deployment error, rolling back record:", k8sErr);
      // Clean rollback: release in-memory reserved port and delete failed app record
      releaseReservedAppPort(port);
      await prisma.appService.delete({
        where: { id: appRecord.id },
      }).catch((delErr) => {
        console.error("Failed to delete orphaned app record on rollback:", delErr);
      });

      return NextResponse.json({
        error: `Failed to deploy application on Kubernetes cluster: ${k8sErr.message || "Cluster error"}`,
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Error creating managed app:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
