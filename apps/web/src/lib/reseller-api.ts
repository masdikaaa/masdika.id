import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

/** VPS states in which the instance is still "alive" for a reseller (not terminated / failed). */
export const LIVE_VPS_STATUSES = ["PROVISIONING", "RUNNING", "STOPPED", "SUSPENDED"];

/** Billing-relevant states (these are the ones the monthly cron renews). */
export const BILLABLE_VPS_STATUSES = ["PROVISIONING", "RUNNING", "STOPPED"];

export const HOURS_PER_MONTH = 730;

export function apiError(message: string, status: number) {
  // `error` is kept alongside `message` for backwards compatibility with older clients.
  return NextResponse.json({ success: false, message, error: message }, { status });
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

type RateConfig = { name: string; max: number; windowSec: number };

/**
 * Authenticates a Reseller API request.
 *
 * Checks (in order): Bearer header format, per-IP brute-force limit for failed attempts,
 * key exists, key ACTIVE, key bound to RESELLER service, owner not suspended,
 * then the per-key rate limit. Returns either a ready-to-return error response or the key + user.
 */
export async function authenticateReseller(req: NextRequest, rate: RateConfig) {
  const authHeader = req.headers.get("authorization");
  const match = authHeader?.match(/^Bearer\s+(masdika_[A-Za-z0-9]+)$/);

  const ip = clientIp(req);

  if (!match) {
    await checkRateLimit("RESELLER_API_BAD_AUTH", ip, 30, 60);
    return { error: apiError("Missing or invalid API Key. Use header: Authorization: Bearer masdika_...", 401) };
  }

  const apiKey = await prisma.apiKey.findUnique({
    where: { key: match[1] },
    include: { user: true },
  });

  if (!apiKey) {
    const allowed = await checkRateLimit("RESELLER_API_BAD_AUTH", ip, 30, 60);
    if (!allowed) return { error: apiError("Too many failed authentication attempts. Please try again later.", 429) };
    return { error: apiError("Invalid API Key", 401) };
  }

  if (apiKey.status !== "ACTIVE") {
    return { error: apiError("This API Key has been suspended or revoked", 403) };
  }

  if (apiKey.service !== "RESELLER") {
    return { error: apiError("This API Key is not a Reseller API Key", 403) };
  }

  if (apiKey.user.isSuspended) {
    return { error: apiError("Your account is suspended", 403) };
  }

  const allowed = await checkRateLimit(rate.name, apiKey.id.toString(), rate.max, rate.windowSec);
  if (!allowed) {
    return { error: apiError("Too many requests. Please try again later.", 429) };
  }

  // Usage tracking must never break or slow down the request.
  prisma.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsed: new Date(), usageCount: { increment: 1 } } })
    .catch(() => {});

  return { apiKey, user: apiKey.user };
}

/** Parses a positive integer route param. Returns null if invalid. */
export function parseId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 && n <= 2147483647 ? n : null;
}

/** Reads a JSON body safely (returns null for malformed / non-object bodies). */
export async function readJson(req: NextRequest): Promise<Record<string, any> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

/** Hostname: letters, digits, hyphens and dots (FQDN), each label max 63 chars, total max 253. */
export function isValidHostname(h: unknown): h is string {
  if (typeof h !== "string" || h.length === 0 || h.length > 253) return false;
  return h.split(".").every((label) => /^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label));
}

/** Password policy (same as the panel's order flow): min 8 chars, letters + numbers. */
export function passwordError(p: unknown): string | null {
  if (typeof p !== "string") return "password must be a string";
  if (p.length < 8) return "Password must be at least 8 characters long";
  if (p.length > 128) return "Password must be at most 128 characters long";
  if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) return "Password must contain both letters and numbers";
  // Cloud-init / Proxmox config safety: no whitespace or control characters
  if (/[\s\u0000-\u001f]/.test(p)) return "Password must not contain whitespace or control characters";
  return null;
}

export function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Maps Proxmox lock/busy errors to a friendly 423. Returns null if not a lock error. */
export function proxmoxBusyResponse(err: any) {
  const msg: string = err?.message || "";
  if (msg.includes("AnyEvent.pm") || /lock/i.test(msg)) {
    return apiError("Server is busy processing another task. Please try again in a few seconds.", 423);
  }
  return null;
}
