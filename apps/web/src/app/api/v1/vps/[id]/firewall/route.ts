import { NextRequest, NextResponse } from "next/server";
import {
  authenticateVpsApiKey,
  getActiveProxmoxClient,
  getOwnedProvisionedVps,
  vpsApiError,
} from "@/lib/vps-api";

export const dynamic = "force-dynamic";

const ALLOWED_FIELDS = [
  "action",
  "type",
  "dport",
  "sport",
  "proto",
  "source",
  "dest",
  "comment",
  "enable",
] as const;
const VALID_ACTIONS = ["ACCEPT", "DROP", "REJECT"] as const;
const VALID_PROTOS = ["tcp", "udp", "icmp", "any", "igmp"] as const;
const VALID_TYPES = ["in", "out"] as const;

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
    if (!rawBody || typeof rawBody !== "object") {
      return vpsApiError("Invalid JSON payload", 400);
    }

    const body: Record<string, any> = {};
    for (const field of ALLOWED_FIELDS) {
      if (rawBody[field] !== undefined) body[field] = rawBody[field];
    }

    if (!body.action || !VALID_ACTIONS.includes(body.action)) {
      return vpsApiError("Invalid action. Must be ACCEPT, DROP, or REJECT.", 400);
    }
    if (!body.type || !VALID_TYPES.includes(body.type)) {
      return vpsApiError("Invalid type. Must be 'in' or 'out'.", 400);
    }
    if (body.proto && !VALID_PROTOS.includes(body.proto)) {
      return vpsApiError("Invalid protocol.", 400);
    }
    if (body.dport && !/^[\d,:*-]+$/.test(String(body.dport))) {
      return vpsApiError("Invalid destination port format.", 400);
    }
    if (body.sport && !/^[\d,:*-]+$/.test(String(body.sport))) {
      return vpsApiError("Invalid source port format.", 400);
    }
    if (body.comment && String(body.comment).length > 255) {
      return vpsApiError("Comment exceeds 255 characters.", 400);
    }

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
