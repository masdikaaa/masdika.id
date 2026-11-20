import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { checkAppPlatformCapacity, applyAppPlatformResources } from "@/lib/k8s-app-platform";
import { OFFICIAL_APP_PLATFORM_PLANS } from "@/lib/app-platform-plans";
import { getUserServicesCommitment } from "@/lib/billing-commitment";
import { getClientIp } from "@/lib/get-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { logClientActivity } from "@/lib/activity-log";

/**
 * POST /api/user/app-platform/[id]/upgrade
 * Upgrade or resize App Platform compute tier (CPU & RAM) without losing container data or PVC storage.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const authUser = authResult.user!;

    const clientIp = getClientIp(req);
    const rateLimitAllowed = await checkRateLimit(
      "APP_PLATFORM_UPGRADE",
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

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { id: true, email: true, name: true, role: true, balance: true, isSuspended: true, suspendReason: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User account not found" }, { status: 401 });
    }

    if (user.isSuspended) {
      return NextResponse.json(
        { error: user.suspendReason || "Your account is currently suspended. Scaling is disabled." },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const appId = parseInt(id, 10);
    if (isNaN(appId) || appId <= 0) {
      return NextResponse.json({ error: "Invalid app ID" }, { status: 400 });
    }

    const app = await prisma.appPlatformService.findFirst({
      where: user.role === "ADMIN" ? { id: appId } : { id: appId, userId: user.id },
    });

    if (!app || app.status === "TERMINATED") {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (app.status === "PROVISIONING" || app.status === "BUILDING") {
      return NextResponse.json(
        { error: "Application is currently building/provisioning. Please wait until it finishes before resizing." },
        { status: 400 }
      );
    }

    if (app.status === "SUSPENDED") {
      return NextResponse.json(
        { error: "Suspended applications cannot be resized. Please top up your balance first." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const planCode = typeof body?.planCode === "string" ? body.planCode.trim().toUpperCase() : "";
    const targetPlan = OFFICIAL_APP_PLATFORM_PLANS.find(
      (p) => p.planCode.toUpperCase() === planCode
    );

    if (!targetPlan) {
      return NextResponse.json(
        { error: `Invalid plan code '${planCode}'. Allowed: ${OFFICIAL_APP_PLATFORM_PLANS.map((p) => p.planCode).join(", ")}` },
        { status: 400 }
      );
    }

    if (
      app.planName.toUpperCase() === targetPlan.planCode.toUpperCase() &&
      Math.abs(app.cpuShares - targetPlan.cpuShares) < 0.05 &&
      app.memoryMb === targetPlan.memoryMb
    ) {
      return NextResponse.json(
        { error: "Selected compute plan is identical to the current plan." },
        { status: 400 }
      );
    }

    // Cluster capacity check for scale-up delta
    const cpuDelta = Math.max(0, targetPlan.cpuShares - app.cpuShares);
    const ramDelta = Math.max(0, targetPlan.memoryMb - app.memoryMb);
    if (cpuDelta > 0 || ramDelta > 0) {
      const cap = await checkAppPlatformCapacity(cpuDelta, ramDelta, 0);
      if (!cap.available) {
        return NextResponse.json(
          { error: cap.userMessage || "Cluster capacity is full for this upgrade." },
          { status: 400 }
        );
      }
    }

    // Commitment balance check if scaling up
    if (targetPlan.monthlyPrice > app.monthlyPrice) {
      const commitment = await getUserServicesCommitment(user.id);
      const newRequired = commitment.totalMonthly - app.monthlyPrice + targetPlan.monthlyPrice;
      if (user.balance < newRequired) {
        return NextResponse.json(
          {
            error: `Insufficient balance for upgrade commitment. Required: Rp ${newRequired.toLocaleString("id-ID")}, Available: Rp ${user.balance.toLocaleString("id-ID")}.`,
          },
          { status: 402 }
        );
      }
    }

    const updated = await prisma.appPlatformService.update({
      where: { id: app.id },
      data: {
        planName: targetPlan.planCode,
        cpuShares: targetPlan.cpuShares,
        memoryMb: targetPlan.memoryMb,
        storageGb: targetPlan.storageGb,
        monthlyPrice: targetPlan.monthlyPrice,
        hourlyRate: targetPlan.hourlyRate,
      },
    });

    // Apply new CPU/RAM limits in Kubernetes using existing imageTag and keeping PVC intact (zero data loss)
    const lastSuccess = await prisma.appPlatformDeployment.findFirst({
      where: { appId: app.id, status: "SUCCESS", imageTag: { not: null } },
      orderBy: { createdAt: "desc" },
    });

    await applyAppPlatformResources(updated as any, lastSuccess?.imageTag || "latest");

    await logClientActivity({
      userId: user.id,
      description: `Resized App Platform ${app.name} (${app.subdomain}) from ${app.planName} to ${targetPlan.planCode}`,
      category: "service",
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Compute plan updated to ${targetPlan.planCode} (${targetPlan.cpuShares} vCPU / ${targetPlan.memoryMb} MB RAM) with zero data loss.`,
      data: updated,
    });
  } catch (error: any) {
    console.error("[AppPlatform Upgrade] Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
