import { NextRequest, NextResponse } from "next/server";
import {
  authenticateVpsApiKey,
  getActiveProxmoxClient,
  getOwnedProvisionedVps,
  vpsApiError,
} from "@/lib/vps-api";

export const dynamic = "force-dynamic";

function isSystemManagedRule(rule: any): boolean {
  const comment = String(rule?.comment || "");
  return (
    comment.startsWith("Allow internal VPC") ||
    comment.startsWith("[SYSTEM]") ||
    comment.startsWith("K3s")
  );
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; pos: string }> }
) {
  try {
    const auth = await authenticateVpsApiKey(req, {
      name: "VPS_API_FIREWALL_UPDATE",
      max: 30,
      windowSec: 60,
    });
    if (auth.error) return auth.error;

    const { id, pos: rawPos } = await params;
    if (!/^\d+$/.test(rawPos)) {
      return vpsApiError("Invalid rule position", 400);
    }
    const pos = Number(rawPos);

    const vpsRes = await getOwnedProvisionedVps(auth.apiKey.userId, id);
    if (vpsRes.error) return vpsRes.error;

    const rawBody = await req.json().catch(() => null);
    if (!rawBody || typeof rawBody !== "object") {
      return vpsApiError("Invalid JSON payload", 400);
    }

    const ALLOWED = ["action", "type", "dport", "sport", "proto", "source", "dest", "comment", "enable"] as const;
    const body: Record<string, any> = {};
    for (const f of ALLOWED) {
      if (rawBody[f] !== undefined) body[f] = rawBody[f];
    }

    const pveRes = await getActiveProxmoxClient();
    if (pveRes.error) return pveRes.error;

    const rules = await pveRes.proxmox.getFirewallRules(vpsRes.vps.node, vpsRes.vps.vmid!);
    const targetRule = Array.isArray(rules) ? rules.find((r: any) => Number(r?.pos) === pos) : null;
    if (targetRule && isSystemManagedRule(targetRule)) {
      return vpsApiError("System-managed firewall rules cannot be modified.", 403);
    }

    await pveRes.proxmox.updateFirewallRule(vpsRes.vps.node, vpsRes.vps.vmid!, pos, body);
    return NextResponse.json({
      success: true,
      message: `Firewall rule #${pos} updated`,
    });
  } catch (error) {
    console.error("[VPS_API_FIREWALL_UPDATE]", error);
    return vpsApiError("Failed to update firewall rule", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; pos: string }> }
) {
  try {
    const auth = await authenticateVpsApiKey(req, {
      name: "VPS_API_FIREWALL_DELETE",
      max: 30,
      windowSec: 60,
    });
    if (auth.error) return auth.error;

    const { id, pos: rawPos } = await params;
    if (!/^\d+$/.test(rawPos)) {
      return vpsApiError("Invalid rule position", 400);
    }
    const pos = Number(rawPos);

    const vpsRes = await getOwnedProvisionedVps(auth.apiKey.userId, id);
    if (vpsRes.error) return vpsRes.error;

    const pveRes = await getActiveProxmoxClient();
    if (pveRes.error) return pveRes.error;

    const rules = await pveRes.proxmox.getFirewallRules(
      vpsRes.vps.node,
      vpsRes.vps.vmid!
    );
    const targetRule = Array.isArray(rules)
      ? rules.find((r: any) => Number(r?.pos) === pos)
      : null;

    if (targetRule && isSystemManagedRule(targetRule)) {
      return vpsApiError("System-managed firewall rules cannot be deleted.", 403);
    }

    await pveRes.proxmox.deleteFirewallRule(vpsRes.vps.node, vpsRes.vps.vmid!, pos);

    return NextResponse.json({
      success: true,
      message: `Firewall rule #${pos} deleted`,
    });
  } catch (error) {
    console.error("[VPS_API_FIREWALL_DELETE]", error);
    return vpsApiError("Failed to delete firewall rule", 500);
  }
}
