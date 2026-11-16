import { NextRequest, NextResponse } from "next/server";
import {
  authenticateVpsApiKey,
  getActiveProxmoxClient,
  getOwnedProvisionedVps,
  validateFirewallRulePayload,
  vpsApiError,
} from "@/lib/vps-api";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateVpsApiKey(req, {
      name: "VPS_API_FIREWALL_LIST",
      max: 60,
      windowSec: 60,
    });
    if (auth.error) return auth.error;

    const { id } = await params;
    const vpsRes = await getOwnedProvisionedVps(auth.apiKey.userId, id);
    if (vpsRes.error) return vpsRes.error;

    const pveRes = await getActiveProxmoxClient();
    if (pveRes.error) return pveRes.error;

    const rules = await pveRes.proxmox.getFirewallRules(
      vpsRes.vps.node,
      vpsRes.vps.vmid!
    );
    return NextResponse.json({ success: true, data: rules });
  } catch (error) {
    console.error("[VPS_API_FIREWALL_LIST]", error);
    return vpsApiError("Failed to fetch firewall rules", 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateVpsApiKey(req, {
      name: "VPS_API_FIREWALL_CREATE",
      max: 30,
      windowSec: 60,
    });
    if (auth.error) return auth.error;

    const { id } = await params;
    const vpsRes = await getOwnedProvisionedVps(auth.apiKey.userId, id);
    if (vpsRes.error) return vpsRes.error;

    const rawBody = await req.json().catch(() => null);
    const validated = validateFirewallRulePayload(rawBody, { partial: false });
    if ("error" in validated) return validated.error;
    const body = validated.data;

    const pveRes = await getActiveProxmoxClient();
    if (pveRes.error) return pveRes.error;

    const result = await pveRes.proxmox.createFirewallRule(
      vpsRes.vps.node,
      vpsRes.vps.vmid!,
      body
    );

    return NextResponse.json(
      {
        success: true,
        data: result,
        message: "Firewall rule created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[VPS_API_FIREWALL_CREATE]", error);
    return vpsApiError("Failed to create firewall rule", 500);
  }
}
