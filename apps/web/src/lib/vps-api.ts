import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";
import { decryptDeterministic } from "@/lib/encryption";
import { checkRateLimit } from "@/lib/rate-limit";

export const LIVE_VPS_STATUSES = ["PROVISIONING", "RUNNING", "STOPPED", "SUSPENDED"];

export function vpsApiError(message: string, status: number) {
  return NextResponse.json({ success: false, message, error: message }, { status });
}

function getClientIp(req: NextRequest): string {
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "unknown";
}

function extractApiKey(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  const bearerMatch = authHeader?.match(/^Bearer\s+(masdika_[A-Za-z0-9]+)$/i);
  if (bearerMatch) return bearerMatch[1];

  const headerKey = req.headers.get("x-api-key")?.trim();
  if (headerKey && /^masdika_[A-Za-z0-9]+$/.test(headerKey)) {
    return headerKey;
  }
  return null;
}

export function parseVpsId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 && n <= 2147483647 ? n : null;
}

type RateConfig = { name: string; max: number; windowSec: number };

/**
 * Authenticates a free VPS API request using `Authorization: Bearer masdika_...`
 * or `x-api-key: masdika_...`.
 */
export async function authenticateVpsApiKey(req: NextRequest, rate: RateConfig) {
  const token = extractApiKey(req);
  const ip = getClientIp(req);

  if (!token) {
    const allowed = await checkRateLimit("VPS_API_BAD_AUTH", ip, 30, 60);
    if (!allowed) {
      return { error: vpsApiError("Too many failed authentication attempts. Please try again later.", 429) };
    }
    return {
      error: vpsApiError(
        "Missing or invalid API Key. Pass Authorization: Bearer masdika_... or x-api-key header.",
        401
      ),
    };
  }

  const apiKey = await prisma.apiKey.findUnique({
    where: { key: token },
    include: { user: true },
  });

  if (!apiKey) {
    const allowed = await checkRateLimit("VPS_API_BAD_AUTH", ip, 30, 60);
    if (!allowed) {
      return { error: vpsApiError("Too many failed authentication attempts. Please try again later.", 429) };
    }
    return { error: vpsApiError("Invalid API Key", 401) };
  }

  if (apiKey.status !== "ACTIVE") {
    return { error: vpsApiError("This API Key has been suspended or revoked", 403) };
  }

  if (apiKey.service !== "VPS" && apiKey.service !== "RESELLER") {
    return { error: vpsApiError("This API Key is not authorized for VPS control", 403) };
  }

  if (apiKey.user.isSuspended) {
    return { error: vpsApiError("Your account is suspended", 403) };
  }

  const allowed = await checkRateLimit(rate.name, apiKey.userId.toString(), rate.max, rate.windowSec);
  if (!allowed) {
    return { error: vpsApiError("Rate limit exceeded. Please try again later.", 429) };
  }

  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsed: new Date(), usageCount: { increment: 1 } },
    })
    .catch(() => {});

  return { apiKey, user: apiKey.user };
}

export type VpsPowerAction = "start" | "stop" | "reboot";

const POWER_HANDLERS: Record<
  VpsPowerAction,
  { run: (p: ProxmoxClient, node: string, vmid: number) => Promise<any>; targetStatus: string }
> = {
  start: { run: (p, n, v) => p.startVm(n, v), targetStatus: "RUNNING" },
  stop: { run: (p, n, v) => p.stopVm(n, v), targetStatus: "STOPPED" },
  reboot: { run: (p, n, v) => p.rebootVm(n, v), targetStatus: "RUNNING" },
};

/**
 * Shared handler for POST /api/v1/vps/[id]/{start|stop|reboot}.
 */
export async function executeVpsPowerAction(
  req: NextRequest,
  rawId: string,
  action: VpsPowerAction
) {
  try {
    const auth = await authenticateVpsApiKey(req, {
      name: `VPS_API_${action.toUpperCase()}`,
      max: 30,
      windowSec: 60,
    });
    if (auth.error) return auth.error;
    const { apiKey } = auth;

    const vpsId = parseVpsId(rawId);
    if (!vpsId) return vpsApiError("Invalid VPS ID", 400);

    const vps = await prisma.vpsService.findFirst({
      where: { id: vpsId, userId: apiKey.userId },
    });

    if (!vps || !vps.vmid || vps.status === "TERMINATED") {
      return vpsApiError("VPS instance not found", 404);
    }

    if (vps.status === "SUSPENDED") {
      return vpsApiError(
        "VPS instance is suspended. Please top up your balance or contact support first.",
        403
      );
    }

    if (vps.status !== "RUNNING" && vps.status !== "STOPPED") {
      return vpsApiError(
        `VPS instance is not ready for '${action}' (current status: ${vps.status})`,
        409
      );
    }

    const pveRes = await getActiveProxmoxClient();
    if (pveRes.error) return pveRes.error;
    const { proxmox } = pveRes;
    const handler = POWER_HANDLERS[action];

    try {
      await handler.run(proxmox, vps.node, vps.vmid);
    } catch (err: any) {
      console.error(`[VPS_API_${action.toUpperCase()}]`, err);
      const msg = String(err?.message || "");
      if (/lock|timeout|already|not running/i.test(msg)) {
        return vpsApiError(`Hypervisor rejected '${action}': ${msg}`, 409);
      }
      return vpsApiError(`Failed to execute '${action}' on VPS #${vps.id}`, 502);
    }

    await prisma.vpsService.updateMany({
      where: { id: vps.id, status: { in: ["RUNNING", "STOPPED"] } },
      data: { status: handler.targetStatus },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: vps.id,
        hostname: vps.hostname,
        action,
        status: handler.targetStatus,
      },
      message: `VPS '${vps.hostname}' ${action} command executed successfully`,
    });
  } catch (error) {
    console.error(`[VPS_API_${action.toUpperCase()}]`, error);
    return vpsApiError("Internal server error", 500);
  }
}

/**
 * Loads a provisioned, non-terminated VPS owned by `userId`.
 */
export async function getOwnedProvisionedVps(
  userId: number,
  rawId: string,
  options: { blockSuspended?: boolean } = { blockSuspended: true }
) {
  const vpsId = parseVpsId(rawId);
  if (!vpsId) return { error: vpsApiError("Invalid VPS ID", 400) };

  const vps = await prisma.vpsService.findFirst({
    where: { id: vpsId, userId },
  });

  if (!vps || !vps.vmid || vps.status === "TERMINATED") {
    return { error: vpsApiError("VPS instance not found", 404) };
  }

  if (options.blockSuspended !== false && vps.status === "SUSPENDED") {
    return {
      error: vpsApiError(
        "VPS instance is suspended. Please top up your balance or contact support first.",
        403
      ),
    };
  }

  return { vps };
}

/**
 * Instantiates a ProxmoxClient for the currently active hypervisor.
 */
export async function getActiveProxmoxClient() {
  const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
  if (!server) {
    return { error: vpsApiError("Hypervisor is currently unavailable", 503) };
  }
  const secret = decryptDeterministic(server.tokenSecret) || server.tokenSecret;
  return { proxmox: new ProxmoxClient(server.host, server.tokenId, secret) };
}

const FIREWALL_ALLOWED_FIELDS = [
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
const FIREWALL_VALID_ACTIONS = ["ACCEPT", "DROP", "REJECT"] as const;
const FIREWALL_VALID_PROTOS = ["tcp", "udp", "icmp", "any", "igmp"] as const;
const FIREWALL_VALID_TYPES = ["in", "out"] as const;
const FIREWALL_PORT_REGEX = /^[\d,:*-]{1,64}$/;
const FIREWALL_ADDR_REGEX = /^[a-zA-Z0-9.:\/,-]{1,64}$/;

/**
 * Validates and sanitizes a Proxmox firewall rule payload for POST (full) or PUT (partial).
 */
export function validateFirewallRulePayload(
  rawBody: unknown,
  { partial = false }: { partial?: boolean } = {}
): { data: Record<string, any> } | { error: NextResponse } {
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return { error: vpsApiError("Invalid JSON payload", 400) };
  }

  const input = rawBody as Record<string, unknown>;
  const data: Record<string, any> = {};

  for (const field of FIREWALL_ALLOWED_FIELDS) {
    if (input[field] !== undefined) data[field] = input[field];
  }

  if (partial && Object.keys(data).length === 0) {
    return { error: vpsApiError("At least one valid firewall field must be provided", 400) };
  }

  if ((!partial || data.action !== undefined) && !FIREWALL_VALID_ACTIONS.includes(data.action)) {
    return { error: vpsApiError("Invalid action. Must be ACCEPT, DROP, or REJECT.", 400) };
  }
  if ((!partial || data.type !== undefined) && !FIREWALL_VALID_TYPES.includes(data.type)) {
    return { error: vpsApiError("Invalid type. Must be 'in' or 'out'.", 400) };
  }
  if (data.proto !== undefined && !FIREWALL_VALID_PROTOS.includes(data.proto)) {
    return { error: vpsApiError("Invalid protocol.", 400) };
  }
  if (data.dport !== undefined && !FIREWALL_PORT_REGEX.test(String(data.dport))) {
    return { error: vpsApiError("Invalid destination port format.", 400) };
  }
  if (data.sport !== undefined && !FIREWALL_PORT_REGEX.test(String(data.sport))) {
    return { error: vpsApiError("Invalid source port format.", 400) };
  }
  if (data.source !== undefined && !FIREWALL_ADDR_REGEX.test(String(data.source))) {
    return { error: vpsApiError("Invalid source IP/CIDR format.", 400) };
  }
  if (data.dest !== undefined && !FIREWALL_ADDR_REGEX.test(String(data.dest))) {
    return { error: vpsApiError("Invalid destination IP/CIDR format.", 400) };
  }
  if (data.comment !== undefined) {
    const comment = String(data.comment);
    if (comment.length > 255 || /[\r\n]/.test(comment)) {
      return { error: vpsApiError("Invalid comment (max 255 chars, no newlines).", 400) };
    }
    data.comment = comment;
  }
  if (data.enable !== undefined) {
    if (data.enable === 0 || data.enable === 1 || typeof data.enable === "boolean") {
      data.enable = data.enable ? 1 : 0;
    } else {
      return { error: vpsApiError("Invalid enable flag. Must be 0, 1, or boolean.", 400) };
    }
  }

  return { data };
}
