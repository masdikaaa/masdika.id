import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { VpsProvisioningService } from "@/lib/vps-provisioning";
import { authenticateReseller, apiError, parseId, readJson, passwordError } from "@/lib/reseller-api";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticateReseller(req, { name: "RESELLER_API_REINSTALL", max: 5, windowSec: 60 });
    if (auth.error) return auth.error;
    const { apiKey } = auth;

    const instanceId = parseId((await params).id);
    if (!instanceId) return apiError("Invalid instance ID", 400);

    const body = await readJson(req);
    if (!body) return apiError("Request body must be a valid JSON object", 400);

    const { os, password } = body;
    if (!os || !password) return apiError("Missing required fields: os, password", 400);
    if (typeof os !== "string") return apiError("os must be a string", 400);
    const pwErr = passwordError(password);
    if (pwErr) return apiError(pwErr, 400);

    const vps = await prisma.vpsService.findFirst({
      where: { id: instanceId, userId: apiKey.userId, isReseller: true },
    });
    if (!vps || !vps.vmid || vps.status === "TERMINATED") return apiError("Instance not found", 404);

    if (vps.status === "SUSPENDED") {
      return apiError("Instance is suspended. Reinstallation is blocked until it is reactivated.", 403);
    }
    if (vps.status !== "RUNNING" && vps.status !== "STOPPED") {
      return apiError(`Instance is not ready for reinstallation (current status: ${vps.status})`, 409);
    }

    const template = await prisma.vpsTemplate.findFirst({ where: { name: os, isActive: true } });
    if (!template) return apiError(`OS Template '${os}' not found`, 404);

    // Atomic lock so two concurrent reinstall calls can't both rebuild the same VM
    const lock = await prisma.vpsService.updateMany({
      where: { id: vps.id, status: vps.status },
      data: { status: "PROVISIONING" },
    });
    if (lock.count === 0) return apiError("Instance state changed. Please retry.", 409);

    // Runs in the background; on failure the service puts the VM into STOPPED so it can be retried
    VpsProvisioningService.reinstallVps(vps.id, template.name, password).catch((e) => {
      console.error(`[RESELLER_API] Reinstall failed for VPS ${vps.id}:`, e);
    });

    return NextResponse.json({ success: true, message: "OS Reinstallation process started" }, { status: 202 });
  } catch (error: any) {
    console.error("[RESELLER_API_REINSTALL]", error);
    return apiError("Internal server error", 500);
  }
}
