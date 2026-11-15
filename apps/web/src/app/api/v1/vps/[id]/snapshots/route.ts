import { NextRequest, NextResponse } from "next/server";
import {
  authenticateVpsApiKey,
  getActiveProxmoxClient,
  getOwnedProvisionedVps,
  vpsApiError,
} from "@/lib/vps-api";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateVpsApiKey(req, {
      name: "VPS_API_SNAPSHOTS_LIST",
      max: 60,
      windowSec: 60,
    });
    if (auth.error) return auth.error;

    const { id } = await params;
    const vpsRes = await getOwnedProvisionedVps(auth.apiKey.userId, id, {
      blockSuspended: false,
    });
    if (vpsRes.error) return vpsRes.error;

    const pveRes = await getActiveProxmoxClient();
    if (pveRes.error) return pveRes.error;

    const raw = await pveRes.proxmox.getVMSnapshots(vpsRes.vps.node, vpsRes.vps.vmid!);
    const snapshots = (Array.isArray(raw) ? raw : raw?.data || []).filter(
      (s: any) => s?.name && s.name !== "current"
    );

    return NextResponse.json({ success: true, data: snapshots });
  } catch (error) {
    console.error("[VPS_API_SNAPSHOTS_LIST]", error);
    return vpsApiError("Failed to fetch snapshots", 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateVpsApiKey(req, {
      name: "VPS_API_SNAPSHOT_CREATE",
      max: 20,
      windowSec: 60,
    });
    if (auth.error) return auth.error;

    const { id } = await params;
    const vpsRes = await getOwnedProvisionedVps(auth.apiKey.userId, id);
    if (vpsRes.error) return vpsRes.error;
    const { vps } = vpsRes;

    if (vps.status !== "RUNNING" && vps.status !== "STOPPED") {
      return vpsApiError(`Cannot create snapshot while VPS is ${vps.status}`, 409);
    }

    const body = await req.json().catch(() => null);
    const snapname = typeof body?.snapname === "string" ? body.snapname.trim() : "";
    const description = typeof body?.description === "string" ? body.description.slice(0, 200) : "";
    const includeRam = Boolean(body?.includeRam);

    if (!/^[a-zA-Z][a-zA-Z0-9_-]{1,39}$/.test(snapname) || snapname === "current") {
      return vpsApiError(
        "Invalid snapname. Start with a letter and use 2-40 alphanumeric, '-' or '_' characters.",
        400
      );
    }

    const pveRes = await getActiveProxmoxClient();
    if (pveRes.error) return pveRes.error;

    const result = await pveRes.proxmox.createVMSnapshot(
      vps.node,
      vps.vmid!,
      snapname,
      description,
      includeRam
    );

    return NextResponse.json(
      {
        success: true,
        data: { vpsId: vps.id, snapname, task: result },
        message: `Snapshot '${snapname}' creation initiated`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[VPS_API_SNAPSHOT_CREATE]", error);
    return vpsApiError("Failed to create snapshot", 500);
  }
}
