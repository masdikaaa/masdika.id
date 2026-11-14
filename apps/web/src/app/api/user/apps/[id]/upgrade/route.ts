import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { scaleAppService } from "@/lib/k8s-app";
import { getAppPlan, getAppDefinition } from "@/lib/app-catalog";
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

    const targetPlan = getAppPlan(planCode);
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
        { error: "New compute specifications are identical to current specifications." },
        { status: 400 }
      );
    }

    // 5. Server-side Pricing & Commitment Balance Verification
    const monthlyPrice = targetPlan.monthlyPrice;
    const hourlyRate = targetPlan.hourlyPrice;
    const currentAppMonthly = app.monthlyPrice || Math.round((app.hourlyRate || 0) * 720);
    const diffMonthly = monthlyPrice - currentAppMonthly;

    if (diffMonthly > 0) {
      const commitment = await getUserServicesCommitment(user.id);
      const requiredBalance = commitment.totalMonthly - currentAppMonthly + monthlyPrice;

      if (user.balance < requiredBalance) {
        return NextResponse.json(
          {
            error: `Insufficient account balance for this upgrade. Scaling to ${targetPlan.planCode} requires an account balance of at least Rp ${requiredBalance.toLocaleString("id-ID")} to cover your accumulated monthly commitment, but your current balance is Rp ${user.balance.toLocaleString("id-ID")}. Please top up your balance.`,
            requiredBalance,
            currentBalance: user.balance,
            shortfall: requiredBalance - user.balance,
          },
          { status: 400 }
        );
      }
    }

    // 6. Execute Zero-Data-Loss Scaling in Kubernetes
    const catalogItem = getAppDefinition(app.appType);
    const newTemplateName = `${catalogItem?.name || app.appType} (${targetPlan.planCode})`;

    await scaleAppService(app as any, targetPlan.cpuShares, targetPlan.memoryMb);

    // 7. Update App Record in Database
    const updatedApp = await prisma.appService.update({
      where: { id: app.id },
      data: {
        templateName: newTemplateName,
        planName: targetPlan.planCode,
        cpuShares: targetPlan.cpuShares,
        memoryMb: targetPlan.memoryMb,
        monthlyPrice,
        hourlyRate,
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
