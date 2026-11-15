import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { scaleAppService, checkAppClusterCapacity } from "@/lib/k8s-app";
import { resolveAuthoritativeAppPlan, getAppDefinition } from "@/lib/app-catalog";
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
      "APP_UPGRADE",
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
        { error: user.suspendReason || "Your account is currently suspended. App scaling is disabled." },
        { status: 403 }
      );
    }

    // 3. IDOR Protection: App lookup & ownership verification
    const { id: appIdStr } = await params;
    const appId = parseInt(appIdStr, 10);
    if (isNaN(appId) || appId <= 0) {
      return NextResponse.json({ error: "Invalid app ID" }, { status: 400 });
    }

    const app = await prisma.appService.findFirst({
      where: user.role === "ADMIN" ? { id: appId } : { id: appId, userId: user.id },
    });

    if (!app || app.status === "TERMINATED") {
      return NextResponse.json({ error: "Application instance not found" }, { status: 404 });
    }

    if (app.status === "PROVISIONING") {
      return NextResponse.json(
        { error: "Application is currently initializing. Please wait until it is ready before scaling." },
        { status: 400 }
      );
    }

    if (app.status === "SUSPENDED") {
      return NextResponse.json(
        { error: "Suspended applications cannot be scaled. Please top up your account balance first." },
        { status: 400 }
      );
    }

    // 4. Strict Request Payload Parsing & Validation
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request payload format" }, { status: 400 });
    }

    const { planCode } = body;
    if (!planCode || typeof planCode !== "string") {
      return NextResponse.json({ error: "Plan code is required for scaling" }, { status: 400 });
    }

    // Dynamic strict resolution from DB Plan record or official catalog (never substring contains)
    const targetPlan = await resolveAuthoritativeAppPlan(planCode, prisma);
    if (!targetPlan) {
      return NextResponse.json(
        { error: `Invalid compute plan code: '${planCode}'. Allowed: 1C1G, 1C2G, 2C2G, 2C4G, 4C4G, 4C8G, 4C16G` },
        { status: 400 }
      );
    }

    // Check if new specs are identical to current specs
    if (
      app.planName.toUpperCase() === targetPlan.planCode.toUpperCase() &&
      Math.abs(app.cpuShares - targetPlan.cpuShares) < 0.05 &&
      app.memoryMb === targetPlan.memoryMb
    ) {
      return NextResponse.json(
        { error: "New specifications are identical to current specifications." },
        { status: 400 }
      );
    }

    const catalogItem = getAppDefinition(app.appType);
    if (catalogItem?.minMemoryMb && targetPlan.memoryMb < catalogItem.minMemoryMb) {
      return NextResponse.json(
        { error: `${catalogItem.name} requires at least ${Math.ceil(catalogItem.minMemoryMb / 1024)} GB RAM (1C2G or higher).` },
        { status: 400 }
      );
    }

    // 5. Server-side Pricing & Cluster Capacity Pre-flight Check
    const monthlyPrice = targetPlan.monthlyPrice;
    const hourlyRate = targetPlan.hourlyPrice;
    const diffCpu = Math.max(0, targetPlan.cpuShares - app.cpuShares);
    const diffRam = Math.max(0, targetPlan.memoryMb - app.memoryMb);
    if (diffCpu > 0 || diffRam > 0) {
      const clusterCapacity = await checkAppClusterCapacity(diffCpu, diffRam, 0);
      if (!clusterCapacity.available) {
        return NextResponse.json(
          { error: clusterCapacity.userMessage || "Cluster compute limits reached. Unable to upgrade app to larger compute flavor." },
          { status: 400 }
        );
      }
    }

    // 5.5 Serialize commitment check + Atomic Concurrency Lock (Prevents parallel race condition scaling)
    const previousStatus = app.status;
    const shortfallState: { requiredBalance: number; currentBalance: number } = {
      requiredBalance: 0,
      currentBalance: 0,
    };
    try {
      const lockOutcome = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;

        const freshUser = await tx.user.findUnique({
          where: { id: user.id },
          select: { balance: true, isSuspended: true },
        });
        if (!freshUser || freshUser.isSuspended) {
          throw new Error("USER_SUSPENDED");
        }

        const freshApp = await tx.appService.findUnique({
          where: { id: app.id },
        });
        if (!freshApp || ["PROVISIONING", "TERMINATED", "SUSPENDED"].includes(freshApp.status)) {
          throw new Error("APP_LOCKED");
        }

        const currentAppMonthly = freshApp.monthlyPrice || Math.round((freshApp.hourlyRate || 0) * 720);
        const diffMonthly = monthlyPrice - currentAppMonthly;

        if (diffMonthly > 0) {
          const commitment = await getUserServicesCommitment(user.id, tx);
          const requiredBalance = commitment.totalMonthly - currentAppMonthly + monthlyPrice;

          if (freshUser.balance < requiredBalance) {
            shortfallState.requiredBalance = requiredBalance;
            shortfallState.currentBalance = freshUser.balance;
            throw new Error("INSUFFICIENT_COMMITMENT");
          }
        }

        const locked = await tx.appService.updateMany({
          where: {
            id: app.id,
            status: { notIn: ["PROVISIONING", "TERMINATED", "SUSPENDED"] },
          },
          data: { status: "PROVISIONING" },
        });
        if (locked.count === 0) {
          throw new Error("APP_LOCKED");
        }
        return true;
      });
      if (!lockOutcome) {
        return NextResponse.json({ error: "Application is currently busy." }, { status: 409 });
      }
    } catch (txErr: any) {
      if (txErr?.message === "INSUFFICIENT_COMMITMENT") {
        const { requiredBalance, currentBalance } = shortfallState;
        return NextResponse.json(
          {
            error: `Insufficient account balance for this upgrade. Scaling to ${targetPlan.planCode} requires an account balance of at least Rp ${requiredBalance.toLocaleString("id-ID")} to cover your accumulated monthly commitment, but your current balance is Rp ${currentBalance.toLocaleString("id-ID")}. Please top up your balance.`,
            requiredBalance,
            currentBalance,
            shortfall: requiredBalance - currentBalance,
          },
          { status: 400 }
        );
      }
      if (txErr?.message === "USER_SUSPENDED") {
        return NextResponse.json({ error: "Account is currently suspended." }, { status: 403 });
      }
      return NextResponse.json(
        { error: "Application is currently busy or locked by another operation. Please wait." },
        { status: 409 }
      );
    }

    // 6. Execute Zero-Data-Loss Scaling in Kubernetes (with status rollback on failure)
    const newTemplateName = `${catalogItem?.name || app.appType} (${targetPlan.planCode})`;

    try {
      await scaleAppService(app as any, targetPlan.cpuShares, targetPlan.memoryMb);
    } catch (scaleErr: any) {
      await prisma.appService.update({
        where: { id: app.id },
        data: { status: previousStatus },
      }).catch(() => {});
      return NextResponse.json(
        { error: `Failed to scale application pod in cluster: ${scaleErr?.message || "Cluster error"}` },
        { status: 500 }
      );
    }

    // 7. Update App Record in Database & restore operational status
    const updatedApp = await prisma.appService.update({
      where: { id: app.id },
      data: {
        templateName: newTemplateName,
        planName: targetPlan.planCode,
        cpuShares: targetPlan.cpuShares,
        memoryMb: targetPlan.memoryMb,
        monthlyPrice,
        hourlyRate,
        status: previousStatus === "STOPPED" ? "STOPPED" : "RUNNING",
      },
    });

    // 8. Audit Log
    await logClientActivity({
      userId: user.id,
      description: `Scaled Managed App '${app.name}' from ${app.planName} (${app.cpuShares} vCPU, ${app.memoryMb} MB) to ${targetPlan.planCode} (${targetPlan.cpuShares} vCPU, ${targetPlan.memoryMb} MB) with zero data loss`,
      ipAddress: clientIp,
      category: "service",
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Successfully scaled '${app.name}' to ${targetPlan.planCode} (${targetPlan.cpuLabel}, ${targetPlan.ramLabel}) with zero downtime/data loss.`,
      data: updatedApp,
    });
  } catch (error: any) {
    console.error("Error upgrading managed app:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
