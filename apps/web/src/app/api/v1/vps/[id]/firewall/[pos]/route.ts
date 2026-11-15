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
