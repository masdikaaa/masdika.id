import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import {
  allocateAvailablePort,
  releaseReservedDbPort,
  deployDatabase,
  getK8sClusterConfig,
  buildConnectionDetails,
  checkDatabaseClusterCapacity,
  getDatabaseStatus,
} from "@/lib/k8s-database";
import {
  DATABASE_STORAGE_MAX_GB,
  parseStrictStorageGb,
  calculateAuthoritativeDatabaseOrder,
} from "@/lib/database-plans";
import { assertSufficientCommitmentBalance } from "@/lib/billing-commitment";
import { sendDatabaseProvisionedEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/get-ip";
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

    // Rate limiting (5 provisioning requests per 30 seconds per user/IP)
    const clientIp = getClientIp(req);
    const rateLimitAllowed = await checkRateLimit("DB_DEPLOY", `${user.id}:${clientIp}`, 5, 30);
    if (!rateLimitAllowed) {
      return NextResponse.json(
        { error: "Too many database provisioning requests. Please wait a moment before trying again." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request payload format" }, { status: 400 });
    }

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

    const normalizedBillingMode = typeof billingMode === "string" ? billingMode.trim().toUpperCase() : "PAYG";
    if (!["PAYG", "MONTHLY"].includes(normalizedBillingMode)) {
      return NextResponse.json({ error: "Invalid billing mode. Allowed: PAYG, MONTHLY" }, { status: 400 });
    }

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
      POSTGRES: ["15", "16", "17", "18"],
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

    // Strict Server-Authoritative Plan & Storage Validation (Tamper-Proof Pricing)
    const requestedStorage = parseStrictStorageGb(body.storageGb, 1, 1, DATABASE_STORAGE_MAX_GB);
    if (requestedStorage === null) {
      return NextResponse.json({
        error: `Storage capacity must be an integer between 1 GB and ${DATABASE_STORAGE_MAX_GB} GB.`,
      }, { status: 400 });
    }

    let parsedPlanId: number | null = null;
    if (planId !== undefined && planId !== null && planId !== "") {
      const pIdNum = typeof planId === "number" ? planId : parseInt(String(planId), 10);
      if (!Number.isInteger(pIdNum) || pIdNum <= 0) {
        return NextResponse.json({ error: "Invalid database plan ID." }, { status: 400 });
      }
      parsedPlanId = pIdNum;
    }

    const [activeDbPlans, rateSetting] = await Promise.all([
      prisma.plan.findMany({
        where: { service: "DATABASE", isActive: true },
        select: { id: true, name: true, service: true, price: true, limits: true, isActive: true },
      }),
      prisma.setting.findUnique({ where: { key: "database_shared_rate_per_gb" } }),
    ]);

    const parsedSettingRate = rateSetting ? parseInt(rateSetting.value, 10) : 10000;
    const baseSharedRatePerGb = !isNaN(parsedSettingRate) && parsedSettingRate > 0 ? parsedSettingRate : 10000;

    const orderSpec = calculateAuthoritativeDatabaseOrder({
      typeUpper,
      version: cleanVersion,
      tier: typeof tier === "string" ? tier : undefined,
      planId: parsedPlanId,
      planName: typeof planName === "string" ? planName : undefined,
      storageGb: requestedStorage,
      activeDbPlans,
      baseSharedRatePerGb,
    });

    if (!orderSpec.ok) {
      return NextResponse.json({ error: orderSpec.error }, { status: 400 });
    }

    const {
      cpuShares,
      memoryMb,
      storageGb,
      effectivePlanName,
      cleanVersion: effectiveVersion,
      monthlyPrice,
      hourlyRate,
    } = orderSpec.data;

    const upfrontCharge = normalizedBillingMode === "MONTHLY" ? monthlyPrice : hourlyRate;
    const newDbMonthly = monthlyPrice;

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
        code: "PORT_POOL_EXHAUSTED",
      }, { status: 503 });
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

    // 3. Serialize per-user commitment check, atomic upfront charge, and record creation to eliminate TOCTOU race conditions
    let dbRecord: any;
    try {
      dbRecord = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;

        const freshUser = await tx.user.findUnique({
          where: { id: user.id },
          select: { id: true, balance: true, isSuspended: true, suspendReason: true },
        });
        if (!freshUser) {
          throw new Error("USER_NOT_FOUND");
        }
        if (freshUser.isSuspended) {
          throw new Error(`ACCOUNT_SUSPENDED:${freshUser.suspendReason || "Account is suspended"}`);
        }

        const commitmentCheck = await assertSufficientCommitmentBalance({
          userId: user.id,
          userBalance: freshUser.balance,
          newServiceMonthly: newDbMonthly,
          serviceName: `${effectivePlanName} (${cleanName})`,
          tx,
        });

        const balanceDeduct = await tx.user.updateMany({
          where: {
            id: user.id,
            balance: { gte: commitmentCheck.requiredBalance },
          },
          data: {
            balance: { decrement: upfrontCharge },
          },
        });

        if (balanceDeduct.count === 0) {
          throw new Error(
            `Saldo akun tidak mencukupi untuk akumulasi komitmen layanan aktif (Dibutuhkan minimal saldo Rp ${commitmentCheck.requiredBalance.toLocaleString("id-ID")}).`
          );
        }

        return await tx.databaseService.create({
          data: {
            userId: user.id,
            name: cleanName,
            type: typeUpper,
            version: effectiveVersion,
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
            billingMode: normalizedBillingMode,
            monthlyPrice,
            hourlyRate,
            accumulatedCost: upfrontCharge,
            status: "PROVISIONING",
            k8sNamespace: "managed-db",
            lastBilledAt: new Date(),
          },
        });
      });
    } catch (txErr: any) {
      releaseReservedDbPort(port);
      const msg = txErr?.message || "Insufficient balance";
      if (msg === "USER_NOT_FOUND") {
        return NextResponse.json({ error: "User account not found" }, { status: 401 });
      }
      if (msg.startsWith("ACCOUNT_SUSPENDED:")) {
        return NextResponse.json({ error: msg.slice("ACCOUNT_SUSPENDED:".length) }, { status: 403 });
      }
      return NextResponse.json({ error: msg }, { status: 400 });
    }

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
