import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { VpsAppProvisioningService } from "@/lib/vps-app-provisioning";
import { decryptDeterministic } from "@/lib/encryption";
import { getAppByName, getAppById } from "@/lib/vps-apps";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth({ allowedRoles: ["ADMIN", "USER"] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const userId = auth.userId!;
    const user = auth.user!;

    const { id } = await params;
    const vpsId = parseInt(id, 10);
    if (isNaN(vpsId)) {
      return NextResponse.json({ error: "Invalid VPS ID" }, { status: 400 });
    }

    const whereClause: any = { id: vpsId };
    if (user?.role !== "ADMIN") {
      whereClause.userId = userId;
    }

    const vps = await prisma.vpsService.findFirst({
      where: whereClause,
      include: {
        assignedIps: true
      }
    });

    if (!vps) {
      return NextResponse.json({ error: "VPS not found" }, { status: 404 });
    }

    if (!vps.appName) {
      return NextResponse.json({ error: "This VPS does not have a 1-Click Application assigned" }, { status: 400 });
    }

    if (vps.status !== "ACTIVE") {
      return NextResponse.json({ error: "VPS must be in ACTIVE status before installing applications" }, { status: 400 });
    }

    const primaryIp = vps.assignedIps?.[0]?.ipAddress;
    if (!primaryIp) {
      return NextResponse.json({ error: "No primary IP assigned to this VPS" }, { status: 400 });
    }

    const targetApp = getAppByName(vps.appName) || getAppById(vps.appName);
    if (!targetApp) {
      return NextResponse.json({ error: `Application '${vps.appName}' definition not found` }, { status: 400 });
    }

    const rootPassword = decryptDeterministic(vps.rootPassword) || vps.rootPassword;

    // Trigger installation in background
    VpsAppProvisioningService.installApp(
      vps.id,
      targetApp.id,
      primaryIp,
      rootPassword
    ).catch(err => console.error(`[RetryAppInstall] Failed for VPS #${vps.id}:`, err));

    return NextResponse.json({
      success: true,
      message: `Installation for ${targetApp.name} initiated.`
    });
  } catch (err: any) {
    console.error("Error retrying app installation:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
