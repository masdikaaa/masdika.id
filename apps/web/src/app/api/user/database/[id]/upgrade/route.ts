import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import {
  scaleDatabase,
  checkDatabaseClusterCapacity,
} from "@/lib/k8s-database";
import { OFFICIAL_DATABASE_PLANS } from "@/lib/database-plans";
import { getUserServicesCommitment } from "@/lib/billing-commitment";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const user = authResult.user!;

    const { id: dbIdStr } = await params;
    const dbId = parseInt(dbIdStr, 10);
    if (isNaN(dbId)) {
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

    const body = await req.json().catch(() => ({}));
    const { planName, storageGb } = body;

    if (!planName) {
      return NextResponse.json({ error: "Plan name is required for scaling" }, { status: 400 });
    }

    // Resolve target plan definition
    const targetPlan = OFFICIAL_DATABASE_PLANS.find(
      (p) => p.name.toLowerCase() === String(planName).toLowerCase()
    );

    if (!targetPlan) {
      return NextResponse.json(
        { error: `Invalid database plan: ${planName}. Please choose an official tier.` },
        { status: 400 }
      );
    }

    // Parse resource limits
    const cpuShares = parseFloat(targetPlan.limits.cpu.replace(/[^0-9.]/g, "")) || 0.5;
    const memoryMb =
      parseInt(targetPlan.limits.ram.replace(/[^0-9]/g, ""), 10) *
      (targetPlan.limits.ram.toLowerCase().includes("gb") ? 1024 : 1);
    const isShared = targetPlan.limits.shared;

    // Validate storage (cannot shrink, min 1GB, max 500GB)
    const currentStorage = db.storageGb || 1;
    const requestedStorage = typeof storageGb === "number" || typeof storageGb === "string"
      ? parseInt(String(storageGb), 10)
      : currentStorage;

    if (isNaN(requestedStorage) || requestedStorage < currentStorage) {
      return NextResponse.json(
        {
          error: `Storage capacity cannot be decreased (current: ${currentStorage} GB). You can only maintain or expand storage.`,
        },
        { status: 400 }
      );
    }

    if (requestedStorage > 500) {
      return NextResponse.json(
        { error: "Maximum storage capacity is 500 GB." },
        { status: 400 }
      );
    }

    const newStorageGb = requestedStorage;

    // Calculate new pricing
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

    // Check if new specs are identical to current specs
    const isPlanSame =
      db.planName?.toLowerCase().startsWith(targetPlan.name.toLowerCase()) ||
      (isShared && db.planName?.toLowerCase().includes("shared"));
    if (isPlanSame && newStorageGb === currentStorage && Math.abs(db.cpuShares - cpuShares) < 0.05 && db.memoryMb === memoryMb) {
      return NextResponse.json(
        { error: "New specifications are identical to current specifications." },
        { status: 400 }
      );
    }

    // Hardware Cluster Capacity Pre-flight Check
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

    // Accumulated Commitment Balance Check
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

    // Execute Kubernetes rolling scale & PVC expansion (Zero data loss)
    const scaleResult = await scaleDatabase(
      db,
      cpuShares,
      memoryMb,
      newStorageGb,
      db.k8sNamespace || "managed-db"
    );

    if (!scaleResult.success) {
      return NextResponse.json(
        { error: `Failed to scale database pod in cluster: ${scaleResult.error}` },
        { status: 500 }
      );
    }

    // Update database record in PostgreSQL
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
