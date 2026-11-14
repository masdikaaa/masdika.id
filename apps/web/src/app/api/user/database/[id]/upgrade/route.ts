import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import {
  scaleDatabase,
  checkDatabaseClusterCapacity,
} from "@/lib/k8s-database";
import { OFFICIAL_DATABASE_PLANS } from "@/lib/database-plans";
import { getUserServicesCommitment } from "@/lib/billing-commitment";
import { getClientIp } from "@/lib/get-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { logClientActivity } from "@/lib/activity-log";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const authUser = authResult.user!;

    // 1. Anti-Brute-Force & Rate Limiting (5 requests per 30s per user)
    const clientIp = getClientIp(req);
    const rateLimitAllowed = await checkRateLimit(
      "DB_UPGRADE",
      `${authUser.id}:${clientIp}`,
      5,
      30
    );
    if (!rateLimitAllowed) {
      return NextResponse.json(
        { error: "Too many upgrade requests. Please wait a moment before trying again." },
        { status: 429 }
      );
    }

    // 2. Fetch fresh user data from database (prevents stale balance / token exploitation)
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { id: true, email: true, name: true, role: true, balance: true, isSuspended: true, suspendReason: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User account not found" }, { status: 401 });
    }

    if (user.isSuspended) {
      return NextResponse.json(
        { error: user.suspendReason || "Your account is currently suspended. Database scaling is disabled." },
        { status: 403 }
      );
    }

    // 3. IDOR Protection: Database lookup & ownership verification
    const { id: dbIdStr } = await params;
    const dbId = parseInt(dbIdStr, 10);
    if (isNaN(dbId) || dbId <= 0) {
      return NextResponse.json({ error: "Invalid database ID" }, { status: 400 });
    }

    const db = await prisma.databaseService.findFirst({
      where: user.role === "ADMIN" ? { id: dbId } : { id: dbId, userId: user.id },
    });

    if (!db || db.status === "TERMINATED") {
      return NextResponse.json({ error: "Database instance not found" }, { status: 404 });
    }

    if (db.status === "PROVISIONING") {
      return NextResponse.json(
        { error: "Database is currently initializing or scaling. Please wait until it is ready." },
        { status: 400 }
      );
    }

    if (db.status === "SUSPENDED") {
      return NextResponse.json(
        { error: "Suspended databases cannot be scaled. Please top up your account balance first." },
        { status: 400 }
      );
    }

    // 4. Strict Request Payload Parsing & Validation
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request payload format" }, { status: 400 });
    }

    const { planName, storageGb } = body;

    if (!planName || typeof planName !== "string" || !planName.trim()) {
      return NextResponse.json({ error: "Plan name is required for scaling" }, { status: 400 });
    }

    // Resolve target plan definition strictly from official catalog
    const cleanPlanName = planName.trim().toLowerCase();
    const targetPlan = OFFICIAL_DATABASE_PLANS.find(
      (p) => p.name.toLowerCase() === cleanPlanName
    );

    if (!targetPlan) {
      return NextResponse.json(
        { error: `Invalid database plan: '${planName}'. Please choose an official tier.` },
        { status: 400 }
      );
    }

    // Parse compute resource limits from official plan
    const cpuShares = parseFloat(targetPlan.limits.cpu.replace(/[^0-9.]/g, "")) || 0.5;
    const memoryMb =
      parseInt(targetPlan.limits.ram.replace(/[^0-9]/g, ""), 10) *
      (targetPlan.limits.ram.toLowerCase().includes("gb") ? 1024 : 1);
    const isShared = targetPlan.limits.shared;

    // 5. Strict Storage Validation (Integer, Min currentStorage, Max 20 GB, No Shrink)
    const currentStorage = Math.max(1, Math.min(20, Math.round(db.storageGb || 1)));
    const requestedStorage = typeof storageGb === "number"
      ? storageGb
      : typeof storageGb === "string"
      ? parseInt(storageGb, 10)
      : currentStorage;

    if (
      !Number.isInteger(requestedStorage) ||
      requestedStorage < currentStorage ||
      requestedStorage > 20
    ) {
      return NextResponse.json(
        {
          error: `Storage capacity must be an integer between ${currentStorage} GB and 20 GB. Storage cannot be decreased.`,
        },
        { status: 400 }
      );
    }

    const newStorageGb = requestedStorage;

    // 6. Server-side Pricing Calculation (Tamper-proof: client cannot send prices)
    let monthlyPrice = 10000;
    let hourlyRate = 14;
    let effectivePlanName = targetPlan.name;

    if (isShared) {
      monthlyPrice = newStorageGb * 10000;
      hourlyRate = Math.max(1, Math.ceil(monthlyPrice / 720));
      effectivePlanName = newStorageGb > 1 ? `Shared Database (${newStorageGb} GB)` : "Shared Database";
    } else {
      const storageCost = newStorageGb * 5000;
      monthlyPrice = targetPlan.price + storageCost;
      hourlyRate = Math.max(1, Math.ceil(monthlyPrice / 720));
      effectivePlanName = `${targetPlan.name} (${newStorageGb} GB)`;
    }

    // 7. Check if new specs are identical to current specs (Prevent redundant restarts)
    const isPlanSame =
      db.planName?.toLowerCase().startsWith(targetPlan.name.toLowerCase()) ||
      (isShared && db.planName?.toLowerCase().includes("shared"));
    if (
      isPlanSame &&
      newStorageGb === currentStorage &&
      Math.abs(db.cpuShares - cpuShares) < 0.05 &&
      db.memoryMb === memoryMb
    ) {
      return NextResponse.json(
        { error: "New specifications are identical to current specifications." },
        { status: 400 }
      );
    }

    // 8. Hardware Cluster Capacity Pre-flight Check
    const additionalCpu = Math.max(0, parseFloat((cpuShares - db.cpuShares).toFixed(2)));
    const additionalRamMb = Math.max(0, memoryMb - db.memoryMb);
    const additionalDiskGb = Math.max(0, newStorageGb - currentStorage);

    if (additionalCpu > 0 || additionalRamMb > 0) {
      const capacity = await checkDatabaseClusterCapacity(
        additionalCpu,
        additionalRamMb,
        additionalDiskGb
      );
      if (!capacity.available) {
        const reason = capacity.userMessage || capacity.reason || "Cluster capacity is insufficient for this upgrade tier.";
        return NextResponse.json(
          { error: `Cluster capacity limit reached: ${reason}` },
          { status: 400 }
        );
      }
    }

    // 9. Accumulated Commitment Balance Check (Prevents negative balance exploitation)
    const currentDbMonthly = db.monthlyPrice || Math.round((db.hourlyRate || 0) * 720);
    const diffMonthly = monthlyPrice - currentDbMonthly;

    if (diffMonthly > 0) {
      const commitment = await getUserServicesCommitment(user.id);
      const requiredBalance = commitment.totalMonthly - currentDbMonthly + monthlyPrice;

      if (user.balance < requiredBalance) {
        const shortfall = requiredBalance - user.balance;
        return NextResponse.json(
          {
            error: `Insufficient account balance for upgraded services commitment. Estimated new database cost: Rp ${monthlyPrice.toLocaleString("id-ID")}/mo. Total required balance: Rp ${requiredBalance.toLocaleString("id-ID")}, but your current balance is Rp ${user.balance.toLocaleString("id-ID")} (Shortfall: Rp ${shortfall.toLocaleString("id-ID")}). Please top up your balance to upgrade.`,
            requiredBalance,
            shortfall,
          },
          { status: 400 }
        );
      }
    }

    // 10. Atomic Concurrency Lock (Prevents double-click / parallel race condition scaling)
    const lockResult = await prisma.databaseService.updateMany({
      where: {
        id: db.id,
        status: { notIn: ["PROVISIONING", "TERMINATED", "SUSPENDED"] },
      },
      data: {
        status: "PROVISIONING",
      },
    });

    if (lockResult.count === 0) {
      return NextResponse.json(
        { error: "Database instance is currently busy, scaling, or locked by another concurrent operation. Please wait." },
        { status: 409 }
      );
    }

    // 11. Execute Kubernetes rolling scale & PVC expansion (Zero data loss)
    const scaleResult = await scaleDatabase(
      db,
      cpuShares,
      memoryMb,
      newStorageGb,
      db.k8sNamespace || "managed-db"
    );

    // Rollback atomic lock if Kubernetes API fails
    if (!scaleResult.success) {
      await prisma.databaseService.update({
        where: { id: db.id },
        data: { status: db.status },
      }).catch((rollbackErr) => {
        console.error(`[ManagedDB Rollback Error] Failed to revert status for db #${db.id}:`, rollbackErr);
      });

      return NextResponse.json(
        { error: `Failed to scale database pod in cluster: ${scaleResult.error}` },
        { status: 500 }
      );
    }

    // 12. Update database record in PostgreSQL
    const updatedDb = await prisma.databaseService.update({
      where: { id: db.id },
      data: {
        planName: effectivePlanName,
        cpuShares,
        memoryMb,
        storageGb: newStorageGb,
        monthlyPrice,
        hourlyRate,
        status: db.status === "STOPPED" ? "STOPPED" : "PROVISIONING",
      },
    });

    // 13. Audit Log Recording (Kafka event stream & client activity log)
    logClientActivity({
      userId: user.id,
      username: user.name || user.email,
      ipAddress: clientIp,
      category: "service",
      description: `Scaled Managed Database #${db.id} (${db.name}) to ${effectivePlanName} [${cpuShares} vCPU, ${memoryMb}MB RAM, ${newStorageGb}GB SSD]`,
      metadata: {
        databaseId: db.id,
        oldPlan: db.planName,
        newPlan: effectivePlanName,
        oldStorageGb: currentStorage,
        newStorageGb,
        oldMonthly: currentDbMonthly,
        newMonthly: monthlyPrice,
      },
    }).catch((logErr) => {
      console.warn("[ManagedDB Audit Log Warning]", logErr?.message);
    });

    return NextResponse.json({
      success: true,
      message: `Database successfully scaled to ${targetPlan.name} with ${newStorageGb} GB SSD storage. Zero data loss guaranteed.`,
      data: updatedDb,
    });
  } catch (error: any) {
    console.error("[ManagedDB Upgrade Error]", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error during database scaling" },
      { status: 500 }
    );
  }
}
