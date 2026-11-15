import { NextRequest, NextResponse } from "next/server";
import {
  authenticateVpsApiKey,
  getActiveProxmoxClient,
  getOwnedProvisionedVps,
  vpsApiError,
} from "@/lib/vps-api";

export const dynamic = "force-dynamic";

const SNAPSHOT_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_-]{1,39}$/;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; snapname: string }> }
) {
  try {
    const auth = await authenticateVpsApiKey(req, {
      name: "VPS_API_SNAPSHOT_ROLLBACK",
      max: 15,
      windowSec: 60,
    });
    if (auth.error) return auth.error;

    const { id, snapname } = await params;
    if (!SNAPSHOT_NAME_REGEX.test(snapname) || snapname === "current") {
      return vpsApiError("Invalid snapshot name", 400);
    }

    const vpsRes = await getOwnedProvisionedVps(auth.apiKey.userId, id);
    if (vpsRes.error) return vpsRes.error;

    const pveRes = await getActiveProxmoxClient();
    if (pveRes.error) return pveRes.error;

    const result = await pveRes.proxmox.rollbackVMSnapshot(
      vpsRes.vps.node,
      vpsRes.vps.vmid!,
      snapname
    );

    return NextResponse.json({
      success: true,
      data: { vpsId: vpsRes.vps.id, snapname, task: result },
      message: `Rollback to snapshot '${snapname}' initiated`,
    });
  } catch (error) {
    console.error("[VPS_API_SNAPSHOT_ROLLBACK]", error);
    return vpsApiError("Failed to rollback snapshot", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; snapname: string }> }
) {
  try {
    const auth = await authenticateVpsApiKey(req, {
      name: "VPS_API_SNAPSHOT_DELETE",
      max: 30,
      windowSec: 60,
    });
    if (auth.error) return auth.error;

    const { id, snapname } = await params;
    if (!SNAPSHOT_NAME_REGEX.test(snapname) || snapname === "current") {
      return vpsApiError("Invalid snapshot name", 400);
    }

    const vpsRes = await getOwnedProvisionedVps(auth.apiKey.userId, id);
    if (vpsRes.error) return vpsRes.error;

    const pveRes = await getActiveProxmoxClient();
    if (pveRes.error) return pveRes.error;

    const result = await pveRes.proxmox.deleteVMSnapshot(
      vpsRes.vps.node,
      vpsRes.vps.vmid!,
      snapname
    );

    return NextResponse.json({
      success: true,
      data: { vpsId: vpsRes.vps.id, snapname, task: result },
      message: `Snapshot '${snapname}' deleted`,
    });
  } catch (error) {
    console.error("[VPS_API_SNAPSHOT_DELETE]", error);
    return vpsApiError("Failed to delete snapshot", 500);
  }
}
