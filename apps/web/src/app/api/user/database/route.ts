import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import {
  allocateAvailablePort,
  deployDatabase,
  parseDatabasePlanLimits,
  getK8sClusterConfig,
  buildConnectionDetails,
  checkDatabaseClusterCapacity,
  getDatabaseStatus,
} from "@/lib/k8s-database";
import { assertSufficientCommitmentBalance } from "@/lib/billing-commitment";
import { sendDatabaseProvisionedEmail } from "@/lib/email";
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
      ratePerGb,
    } = body;

    // Strict Input Validation & Shell Metacharacter Protection
    const cleanName = typeof name === "string" ? name.trim() : "";
    if (!cleanName) {
      return NextResponse.json({ error: "Instance name is required" }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_\-\.\s]{2,50}$/.test(cleanName)) {
      return NextResponse.json({
        error: "Instance name can only contain letters, numbers, spaces, dots, hyphens, and underscores (2-50 characters)."
      }, { status: 400 });
    }

    const typeUpper = (type || "").toUpperCase();
    const allowedTypes = ["MYSQL", "MARIADB", "POSTGRES", "MONGODB", "REDIS"];
    if (!allowedTypes.includes(typeUpper)) {
      return NextResponse.json({ error: `Invalid database type. Allowed: ${allowedTypes.join(", ")}` }, { status: 400 });
    }

    const allowedVersions: Record<string, string[]> = {
      MYSQL: ["8.0", "8.4"],
      MARIADB: ["10.11", "11.2", "11.4"],
      POSTGRES: ["15", "16", "17"],
      MONGODB: ["6.0", "7.0"],
      REDIS: ["7.0", "7.2"],
    };
    const validVersions = allowedVersions[typeUpper] || ["latest"];
    const requestedVersion = String(version || "").trim();
    const cleanVersion = validVersions.includes(requestedVersion) ? requestedVersion : validVersions[0];

    if (customDbName && typeof customDbName === "string" && customDbName.trim()) {
      const cleanDb = customDbName.trim();
      if (!/^[a-zA-Z][a-zA-Z0-9_]{1,31}$/.test(cleanDb)) {
        return NextResponse.json({
          error: "Database name must begin with a letter and contain only alphanumeric characters and underscores (2-32 characters)."
        }, { status: 400 });
      }
    }

    if (customUsername && typeof customUsername === "string" && customUsername.trim()) {
      const cleanUser = customUsername.trim();
      if (!/^[a-zA-Z][a-zA-Z0-9_]{1,31}$/.test(cleanUser)) {
        return NextResponse.json({
          error: "Username must begin with a letter and contain only alphanumeric characters and underscores (2-32 characters)."
        }, { status: 400 });
      }
      const reservedUsers = ["root", "admin", "administrator", "postgres", "mysql", "system", "sys"];
      if (reservedUsers.includes(cleanUser.toLowerCase())) {
        return NextResponse.json({
          error: `Username cannot be a reserved system user (${reservedUsers.join(", ")}).`
        }, { status: 400 });
      }
    }

    if (customPassword && typeof customPassword === "string" && customPassword.trim()) {
      const cleanPass = customPassword.trim();
      if (cleanPass.length < 8 || cleanPass.length > 64) {
        return NextResponse.json({
          error: "Password must be between 8 and 64 characters."
        }, { status: 400 });
      }
      if (!/^[a-zA-Z0-9@#%^+=_\-\.]{8,64}$/.test(cleanPass)) {
        return NextResponse.json({
          error: "Password can only contain alphanumeric characters and safe symbols (@#%^+=_-.). Shell metacharacters, quotes, and whitespace are prohibited."
        }, { status: 400 });
      }
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
        const rate = typeof ratePerGb === 'number' && ratePerGb > 0 ? ratePerGb : 10000;
        monthlyPrice = storageGb * rate;
        hourlyRate = Math.max(1, Math.ceil(monthlyPrice / 720));
        effectivePlanName = typeof planName === 'string' && planName.trim().length > 0
          ? `${planName.trim()} (${storageGb} GB)`
          : `Shared Database (${storageGb} GB)`;
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
        const rate = typeof ratePerGb === 'number' && ratePerGb > 0 ? ratePerGb : 10000;
        monthlyPrice = storageGb * rate;
        hourlyRate = Math.max(1, Math.ceil(monthlyPrice / 720));
        effectivePlanName = typeof planName === 'string' && planName.trim().length > 0
          ? `${planName.trim()} (${storageGb} GB)`
          : `Shared Database (${storageGb} GB)`;
      }
    }

    const upfrontCharge = billingMode === "MONTHLY" ? monthlyPrice : hourlyRate;
    const newDbMonthly = billingMode === "MONTHLY" ? monthlyPrice : (monthlyPrice || Math.round(hourlyRate * 720));

    // Security: Validate accumulated active services commitment + 1 month new database estimation
    let requiredBalance = newDbMonthly;
    try {
      const commitmentCheck = await assertSufficientCommitmentBalance({
        userId: user.id,
        userBalance: user.balance,
        newServiceMonthly: newDbMonthly,
        serviceName: `${effectivePlanName} (${cleanName})`,
      });
      requiredBalance = commitmentCheck.requiredBalance;
    } catch (commitmentErr: any) {
      return NextResponse.json({ error: commitmentErr.message }, { status: 400 });
    }

    // 1. Pre-flight Cluster Resource Capacity Check (prevents charging or errors if server is full)
    const capacityCheck = await checkDatabaseClusterCapacity(cpuShares, memoryMb, storageGb);
    if (!capacityCheck.available) {
      return NextResponse.json({
        error: capacityCheck.userMessage || capacityCheck.reason || "The Managed Database cluster is currently at full capacity. Please try again later.",
      }, { status: 503 });
    }

    // 2. Pre-flight NodePort Allocation Check (before deducting balance)
    let port: number;
    try {
      port = await allocateAvailablePort();
    } catch (portErr: any) {
      return NextResponse.json({
        error: portErr.message || "No available network ports remaining in cluster port pool.",
      }, { status: 503 });
    }

    // 3. Check & atomically decrement user balance with concurrency protection and commitment check
    const balanceDeduct = await prisma.user.updateMany({
      where: {
        id: user.id,
        balance: { gte: requiredBalance },
      },
      data: {
        balance: { decrement: upfrontCharge },
      },
    });

    if (balanceDeduct.count === 0) {
      return NextResponse.json({
        error: `Saldo akun tidak mencukupi untuk akumulasi komitmen layanan aktif (Dibutuhkan minimal saldo Rp ${requiredBalance.toLocaleString("id-ID")}).`,
      }, { status: 400 });
    }

    // Generate or sanitize credentials safely
    const randSuffix = crypto.randomBytes(3).toString("hex");
    const sanitizedName = cleanName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "db";
    const dbName = customDbName && customDbName.trim()
      ? customDbName.trim().replace(/[^a-zA-Z0-9_]/g, "").slice(0, 32)
      : `db_${sanitizedName}_${randSuffix}`;
    const username = customUsername && customUsername.trim()
      ? customUsername.trim().replace(/[^a-zA-Z0-9_]/g, "").slice(0, 32)
      : `u_${sanitizedName}_${randSuffix}`;
    const password = customPassword && customPassword.trim().length >= 8
      ? customPassword.trim()
      : crypto.randomBytes(9).toString("base64").replace(/[^a-zA-Z0-9]/g, "X").slice(0, 12) + "A1!";
    const rootPassword = crypto.randomBytes(9).toString("base64").replace(/[^a-zA-Z0-9]/g, "Y").slice(0, 12) + "R9!";

    const clusterConfig = await getK8sClusterConfig().catch(() => null);
    const clusterPublicHost = clusterConfig?.publicDomain || clusterConfig?.publicIp || process.env.MANAGED_DB_PUBLIC_DOMAIN || "";

    // Create DatabaseService record with enforced resource specs
    const dbRecord = await prisma.databaseService.create({
      data: {
        userId: user.id,
        name: cleanName,
        type: typeUpper,
        version: cleanVersion,
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

    // Dispatch Database Credentials Email to user asynchronously
    (async () => {
      try {
        const userRecord = await prisma.user.findUnique({
          where: { id: user.id },
          select: { email: true, name: true },
        });

        if (userRecord?.email) {
          const connDetails = buildConnectionDetails(dbRecord, clusterConfig || undefined);
          let webToolName: string | null = null;
          let webToolUrl: string | null = null;
          if (typeUpper === "MYSQL" || typeUpper === "MARIADB") {
            webToolName = "phpMyAdmin";
            webToolUrl = connDetails.pmaUrl;
          } else if (typeUpper === "POSTGRES" || typeUpper === "POSTGRESQL") {
            webToolName = "pgAdmin 4";
            webToolUrl = connDetails.pgAdminUrl;
          } else if (typeUpper === "MONGODB" || typeUpper === "MONGO") {
            webToolName = "Mongo Express";
            webToolUrl = connDetails.mongoUrl;
          } else if (typeUpper === "REDIS") {
            webToolName = "Redis Commander";
            webToolUrl = connDetails.redisUrl;
          }

          await sendDatabaseProvisionedEmail({
            email: userRecord.email,
            userName: userRecord.name || "Pelanggan Masdika",
            instanceName: dbRecord.name,
            dbType: typeUpper,
            version: dbRecord.version,
            host: dbRecord.host,
            port: dbRecord.port,
            databaseName: dbRecord.dbName,
            username: dbRecord.username,
            password: dbRecord.password,
            rootPassword: dbRecord.rootPassword || undefined,
            planName: dbRecord.planName,
            storageGb: dbRecord.storageGb,
            hourlyRate: dbRecord.hourlyRate,
            monthlyPrice: dbRecord.monthlyPrice,
            webToolName,
            webToolUrl,
            connectionUri: connDetails.uri,
            databaseId: dbRecord.id,
          });
        }
      } catch (mailErr) {
        console.warn("[ManagedDB] Failed to dispatch credentials email:", mailErr);
      }
    })();

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
          // Immediately register K8s resource identifiers while keeping status PROVISIONING until ready
          await prisma.databaseService.update({
            where: { id: dbRecord.id },
            data: {
              k8sDeployment: `db-${dbRecord.id}`,
              k8sService: `svc-db-${dbRecord.id}`,
              k8sPvc: `data-db-${dbRecord.id}`,
            },
          });

          // Poll until K8s pod container readiness check passes before transitioning to RUNNING
          const maxWaitMs = 180000;
          const startTime = Date.now();
          while (Date.now() - startTime < maxWaitMs) {
            await new Promise((resolve) => setTimeout(resolve, 3000));
            try {
              const live = await getDatabaseStatus(dbRecord.id, dbRecord.k8sNamespace || "managed-db");
              if (live.ready && live.status === "RUNNING") {
                await prisma.databaseService.update({
                  where: { id: dbRecord.id },
                  data: { status: "RUNNING" },
                });
                break;
              }
            } catch {}
          }
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
