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
  MANAGED_APPS_CATALOG,
  getAppDefinition,
  resolveAuthoritativeAppPlan,
  sanitizeCustomSubdomain,
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
      const hasSshAccess = catalog?.accessProtocol === "SSH" || catalog?.accessProtocol === "BOTH";
      return {
        ...app,
        fullDomain,
        publicIp: clusterIp,
        httpsUrl: `https://${fullDomain}`,
        nodePortUrl: hasSshAccess && clusterIp ? `http://${clusterIp}:${app.port}` : null,
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

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request payload format" }, { status: 400 });
    }
    const {
      name,
      appType,
      planCode = "1C2G",
      billingMode = "MONTHLY",
      customSubdomain,
    } = body;

    const normalizedBillingMode = typeof billingMode === "string" ? billingMode.trim().toUpperCase() : "MONTHLY";
    if (!["PAYG", "MONTHLY"].includes(normalizedBillingMode)) {
      return NextResponse.json({ error: "Invalid billing mode. Allowed: PAYG, MONTHLY" }, { status: 400 });
    }

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
        error: `Invalid application type. Allowed: ${MANAGED_APPS_CATALOG.map((a) => a.id).join(", ")}`,
      }, { status: 400 });
    }

    // 4. Dynamic Server-Side Price & Commitment Calculation (Tamper-Proof from DB / Catalog)
    const resolvedPlan = await resolveAuthoritativeAppPlan(planCode, prisma);
    if (!resolvedPlan) {
      return NextResponse.json({
        error: `Invalid compute plan code. Allowed: 1C1G, 1C2G, 2C2G, 2C4G, 4C4G, 4C8G, 4C16G`,
      }, { status: 400 });
    }

    const planCodeFinal = resolvedPlan.planCode;
    const cpuShares = resolvedPlan.cpuShares;
    const memoryMb = resolvedPlan.memoryMb;
    const storageGb = resolvedPlan.storageGb;
    const monthlyPrice = resolvedPlan.monthlyPrice;
    const hourlyRate = resolvedPlan.hourlyPrice;

    if (catalogItem.minMemoryMb && memoryMb < catalogItem.minMemoryMb) {
      return NextResponse.json({
        error: `${catalogItem.name} requires at least ${Math.ceil(catalogItem.minMemoryMb / 1024)} GB RAM (1C2G or higher). Please choose a larger compute plan.`,
      }, { status: 400 });
    }

    // 4.5 Cluster Hardware Capacity Check (8 Core CPU / 16 GB RAM / 60 GB Disk)
    const clusterCapacity = await checkAppClusterCapacity(cpuShares, memoryMb, storageGb);
    if (!clusterCapacity.available) {
      return NextResponse.json({
        error: clusterCapacity.userMessage || "The Managed Applications cluster is currently at full capacity. Deployments are paused.",
      }, { status: 400 });
    }

    // 5. Smart Collision-Proof Subdomain Sanitizer (RFC-1123 & reserved domain guard)
    const cleanSub = catalogItem.accessProtocol !== "SSH" ? sanitizeCustomSubdomain(customSubdomain) : "";

    // 6. Smart NodePort Allocation (Dedicated Range 31500..32767 with in-memory lock & cross-checks)
    const port = await allocateAppPort();

    // 7. Generate Initial Credentials
    const randomPassword = `MkApp_${crypto.randomBytes(6).toString("base64url")}`;
    const randomApiKey = `mk_${crypto.randomBytes(16).toString("hex")}`;
    const defaultUsername = (catalogItem.accessProtocol === "SSH" || catalogItem.accessProtocol === "BOTH") ? "root" : "admin";

    // 8. Serialize commitment check & record creation per user to eliminate TOCTOU parallel deploy race conditions
    let appRecord: any;
    let subdomain = "";
    try {
      const txOutcome = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;

        const freshUser = await tx.user.findUnique({
          where: { id: user.id },
          select: { id: true, balance: true, isSuspended: true, suspendReason: true },
        });
        if (!freshUser) {
          throw new Error("USER_NOT_FOUND");
        }
        if (freshUser.isSuspended) {
          throw new Error(`ACCOUNT_SUSPENDED:${freshUser.suspendReason || "Your account is suspended."}`);
        }

        await assertSufficientCommitmentBalance({
          userId: user.id,
          userBalance: freshUser.balance,
          newServiceMonthly: monthlyPrice,
          serviceName: `Managed App (${catalogItem.name} - ${planCodeFinal})`,
          tx,
        });

        let resolvedSubdomain = "";
        if (cleanSub) {
          const existing = await tx.appService.findUnique({ where: { subdomain: cleanSub } });
          if (!existing) {
            resolvedSubdomain = cleanSub;
          } else {
            let candidate = `${cleanSub.slice(0, 24)}-${crypto.randomBytes(2).toString("hex")}`;
            while (await tx.appService.findUnique({ where: { subdomain: candidate } })) {
              candidate = `${cleanSub.slice(0, 24)}-${crypto.randomBytes(2).toString("hex")}`;
            }
            resolvedSubdomain = candidate;
          }
        }
        if (!resolvedSubdomain) {
          let candidate = `${catalogItem.id}-${crypto.randomBytes(3).toString("hex")}`;
          while (await tx.appService.findUnique({ where: { subdomain: candidate } })) {
            candidate = `${catalogItem.id}-${crypto.randomBytes(3).toString("hex")}`;
          }
          resolvedSubdomain = candidate;
        }

        const created = await tx.appService.create({
          data: {
            userId: user.id,
            name: cleanName,
            appType: catalogItem.id,
            templateName: `${catalogItem.name} (${planCodeFinal})`,
            planName: planCodeFinal,
            region: "Sidoarjo",
            node: "managed-apps",
            subdomain: resolvedSubdomain,
            host: "app.masdika.id",
            port,
            appPort: catalogItem.appPort,
            username: defaultUsername,
            password: randomPassword,
            apiKey: randomApiKey,
            cpuShares,
            memoryMb,
            storageGb,
            billingMode: normalizedBillingMode,
            monthlyPrice,
            hourlyRate,
            status: "PROVISIONING",
          },
        });

        const { createServiceOrderInvoice } = await import('@/lib/payg-invoice');
        await createServiceOrderInvoice(tx, {
          userId: user.id,
          serviceIdField: 'appServiceId',
          serviceId: created.id,
          type: 'MANAGED_APP',
          amount: normalizedBillingMode === 'MONTHLY' ? monthlyPrice : 0,
          billingMode: normalizedBillingMode,
          serviceName: cleanName,
          extraDetails: {
            appType: catalogItem.id,
            appName: catalogItem.name,
            planName: planCodeFinal,
            cpuShares,
            memoryMb,
            storageGb,
            billingMode: normalizedBillingMode,
          },
        });

        return { created, resolvedSubdomain };
      });
      appRecord = txOutcome.created;
      subdomain = txOutcome.resolvedSubdomain;
    } catch (txErr: any) {
      releaseReservedAppPort(port);
      const msg = txErr?.message || "Insufficient account balance";
      if (msg === "USER_NOT_FOUND") {
        return NextResponse.json({ error: "User account not found" }, { status: 401 });
      }
      if (msg.startsWith("ACCOUNT_SUSPENDED:")) {
        return NextResponse.json({ error: msg.slice("ACCOUNT_SUSPENDED:".length) }, { status: 403 });
      }
      return NextResponse.json({ error: msg }, { status: 400 });
    }

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
          nodePortUrl: hasSsh && clusterIp ? `http://${clusterIp}:${port}` : null,
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
