import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { allocateAvailablePort, deployDatabase, parseDatabasePlanLimits, getK8sClusterConfig, buildConnectionDetails } from "@/lib/k8s-database";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    const user = authResult.user!;

    const databases = await prisma.databaseService.findMany({
      where: user.role === "ADMIN" ? { status: { not: "TERMINATED" } } : { userId: user.id, status: { not: "TERMINATED" } },
      orderBy: { createdAt: "desc" },
    });

    const clusterConfig = await getK8sClusterConfig().catch(() => null);
    const enriched = databases.map((db) => {
      const details = buildConnectionDetails(db, clusterConfig || undefined);
      return {
        ...db,
        host: db.host || clusterConfig?.publicDomain || clusterConfig?.publicIp || "",
        connectionDetails: details,
      };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (error: any) {
    console.error("Error fetching databases:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    const user = authResult.user!;

    const body = await req.json();
    const {
      name,
      type = "MYSQL",
      version = "8.0",
      tier = "SHARED", // "SHARED" or "DEDICATED"
      planId,
      planName,
      billingMode = "PAYG", // "PAYG" or "MONTHLY"
      customDbName,
      customUsername,
      customPassword,
    } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Instance name is required" }, { status: 400 });
    }

    const typeUpper = type.toUpperCase();
    const allowedTypes = ["MYSQL", "MARIADB", "POSTGRES", "MONGODB"];
    if (!allowedTypes.includes(typeUpper)) {
      return NextResponse.json({ error: `Invalid database type. Allowed: ${allowedTypes.join(", ")}` }, { status: 400 });
    }

    // Dynamic Plan Lookup (supports standard & any admin-created custom plan)
    let selectedPlan: any = null;
    if (planId) {
      selectedPlan = await prisma.plan.findUnique({
        where: { id: parseInt(String(planId), 10) },
      });
    }

    if (!selectedPlan && planName) {
      selectedPlan = await prisma.plan.findFirst({
        where: { service: "DATABASE", name: planName, isActive: true },
      });
    }

    // Default fallbacks if no plan specified
    let cpuShares = 0.5;
    let memoryMb = 1024;
    let storageGb = 1;
    let effectiveTier = "SHARED";
    let effectivePlanName = "Shared Database";
    let monthlyPrice = 10000;
    let hourlyRate = 14;

    const requestedStorage = typeof body.storageGb === 'number' || typeof body.storageGb === 'string'
      ? Math.max(1, Math.min(100, parseInt(String(body.storageGb), 10) || 1))
      : null;

    if (selectedPlan && selectedPlan.service === "DATABASE") {
      const parsed = parseDatabasePlanLimits(selectedPlan.limits);
      cpuShares = parsed.cpuShares;
      memoryMb = parsed.memoryMb;
      effectiveTier = parsed.shared ? "SHARED" : "DEDICATED";

      if (effectiveTier === "SHARED") {
        storageGb = requestedStorage ?? 1;
        monthlyPrice = storageGb * 10000;
        hourlyRate = Math.max(1, Math.ceil(monthlyPrice / 720));
        effectivePlanName = `Shared Database (${storageGb} GB)`;
      } else {
        storageGb = requestedStorage ?? 1;
        const storageCost = storageGb * 5000;
        monthlyPrice = selectedPlan.price + storageCost;
        hourlyRate = Math.max(1, Math.ceil(monthlyPrice / 720));
        effectivePlanName = `${selectedPlan.name} (${storageGb} GB)`;
      }
    } else {
      const isDedicated =
        (typeof tier === 'string' && tier.toUpperCase() === 'DEDICATED') ||
        (typeof planName === 'string' && planName.toLowerCase().includes('dedi'));
      if (isDedicated) {
        effectiveTier = "DEDICATED";
        effectivePlanName = "Dedicated 1 vCPU / 2 GB";
        cpuShares = 1.0;
        memoryMb = 2048;
        storageGb = requestedStorage ?? 1;
        const storageCost = storageGb * 5000;
        monthlyPrice = 45000 + storageCost;
        hourlyRate = Math.max(1, Math.ceil(monthlyPrice / 720));
      } else {
        storageGb = requestedStorage ?? 1;
        monthlyPrice = storageGb * 10000;
        hourlyRate = Math.max(1, Math.ceil(monthlyPrice / 720));
      }
    }

    const upfrontCharge = billingMode === "MONTHLY" ? monthlyPrice : hourlyRate;

    // Check & atomically decrement user balance with concurrency protection
    const balanceDeduct = await prisma.user.updateMany({
      where: {
        id: user.id,
        balance: { gte: upfrontCharge },
      },
      data: {
        balance: { decrement: upfrontCharge },
      },
    });

    if (balanceDeduct.count === 0) {
      return NextResponse.json({
        error: `Insufficient balance. ${effectivePlanName} requires at least Rp ${upfrontCharge.toLocaleString("id-ID")} balance.`,
      }, { status: 400 });
    }

    // Allocate unique NodePort
    const port = await allocateAvailablePort();

    // Generate or sanitize credentials
    const randSuffix = crypto.randomBytes(3).toString("hex");
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "db";
    const dbName = customDbName && customDbName.trim()
      ? customDbName.trim().replace(/[^a-zA-Z0-9_]/g, "").slice(0, 32)
      : `db_${sanitizedName}_${randSuffix}`;
    const username = customUsername && customUsername.trim()
      ? customUsername.trim().replace(/[^a-zA-Z0-9_]/g, "").slice(0, 32)
      : `u_${sanitizedName}_${randSuffix}`;
    const password = customPassword && customPassword.trim().length >= 8
      ? customPassword.trim()
      : crypto.randomBytes(12).toString("base64").replace(/[^a-zA-Z0-9]/g, "X").slice(0, 16);
    const rootPassword = crypto.randomBytes(12).toString("base64").replace(/[^a-zA-Z0-9]/g, "Y").slice(0, 16);

    const clusterConfig = await getK8sClusterConfig().catch(() => null);
    const clusterPublicHost = clusterConfig?.publicDomain || clusterConfig?.publicIp || process.env.MANAGED_DB_PUBLIC_DOMAIN || "";

    // Create DatabaseService record with enforced resource specs
    const dbRecord = await prisma.databaseService.create({
      data: {
        userId: user.id,
        name: name.trim(),
        type: typeUpper,
        version: String(version).trim(),
        planName: effectivePlanName,
        region: "Sidoarjo",
        node: "managed-database",
        host: clusterPublicHost,
        port,
        dbName,
        username,
        password,
        rootPassword,
        cpuShares,
        memoryMb,
        storageGb,
        billingMode,
        monthlyPrice,
        hourlyRate,
        accumulatedCost: upfrontCharge,
        status: "PROVISIONING",
        k8sNamespace: "managed-db",
        lastBilledAt: new Date(),
      },
    });

    // Trigger Kubernetes deployment asynchronously
    (async () => {
      try {
        const deployRes = await deployDatabase({
          id: dbRecord.id,
          userId: dbRecord.userId,
          name: dbRecord.name,
          type: dbRecord.type,
          version: dbRecord.version,
          planName: dbRecord.planName,
          region: dbRecord.region,
          node: dbRecord.node,
          host: dbRecord.host,
          port: dbRecord.port,
          dbName: dbRecord.dbName,
          username: dbRecord.username,
          password: dbRecord.password,
          rootPassword: dbRecord.rootPassword,
          cpuShares: dbRecord.cpuShares,
          memoryMb: dbRecord.memoryMb,
          storageGb: dbRecord.storageGb,
          status: "RUNNING",
          k8sNamespace: dbRecord.k8sNamespace,
        });

        if (deployRes.success) {
          await prisma.databaseService.update({
            where: { id: dbRecord.id },
            data: {
              status: "RUNNING",
              k8sDeployment: `db-${dbRecord.id}`,
              k8sService: `svc-db-${dbRecord.id}`,
              k8sPvc: `data-db-${dbRecord.id}`,
            },
          });
        } else {
          console.error(`[ManagedDB] Deploy failed for DB ${dbRecord.id}:`, deployRes.error);
          await prisma.databaseService.update({
            where: { id: dbRecord.id },
            data: { status: "ERROR", suspendReason: deployRes.error || "Failed to launch Kubernetes pod" },
          });
        }
      } catch (e: any) {
        console.error(`[ManagedDB] Deployment error for DB ${dbRecord.id}:`, e);
      }
    })();

    return NextResponse.json({
      success: true,
      message: "Database provisioning started",
      data: dbRecord,
    });
  } catch (error: any) {
    console.error("Error creating database:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
