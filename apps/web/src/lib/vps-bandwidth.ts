import { prisma } from "@/lib/prisma";

/**
 * Single source of truth for VPS bandwidth (port speed) tiers & pricing.
 *
 * Rules:
 * - 100 Mbps is the free base tier.
 * - Paid tiers are strict multiples of 50 Mbps (150, 200, 250, ...).
 * - Each 50 Mbps step above 100 Mbps costs `pricing.bandwidth` per hour
 *   (default Rp 69/hr ≈ Rp 50.000/month).
 * - Only tiers listed in the admin setting `vps_bandwidth_options` can be
 *   ordered/upgraded to. Any other value sent by a client is rejected.
 */

export const BANDWIDTH_SETTING_KEY = "vps_bandwidth_options";
export const BASE_BANDWIDTH_MBPS = 100;
export const BANDWIDTH_STEP_MBPS = 50;
export const MAX_BANDWIDTH_MBPS = 10000;
export const DEFAULT_BANDWIDTH_OPTIONS = [100, 150, 200, 250, 300];
export const DEFAULT_BANDWIDTH_RATE_PER_HOUR = Math.ceil(50000 / 730); // 69

/** Normalise any list into valid, sorted, unique tiers that always include 100. */
export function sanitizeBandwidthOptions(input: unknown): number[] {
  const list = Array.isArray(input) ? input : [];
  const valid = list
    .map((v) => Number(v))
    .filter(
      (v) =>
        Number.isInteger(v) &&
        v >= BASE_BANDWIDTH_MBPS &&
        v <= MAX_BANDWIDTH_MBPS &&
        (v - BASE_BANDWIDTH_MBPS) % BANDWIDTH_STEP_MBPS === 0
    );
  const set = new Set<number>([BASE_BANDWIDTH_MBPS, ...valid]);
  return Array.from(set).sort((a, b) => a - b);
}

/** Reads admin-configured tiers. Falls back to defaults if missing/corrupt. */
export async function getBandwidthOptions(): Promise<number[]> {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: BANDWIDTH_SETTING_KEY } });
    if (!setting?.value) return [...DEFAULT_BANDWIDTH_OPTIONS];
    const parsed = sanitizeBandwidthOptions(JSON.parse(setting.value));
    return parsed.length > 0 ? parsed : [...DEFAULT_BANDWIDTH_OPTIONS];
  } catch {
    return [...DEFAULT_BANDWIDTH_OPTIONS];
  }
}

/** Number of paid 50 Mbps steps for a given speed (never negative). */
export function bandwidthSteps(mbps: number): number {
  return Math.max(0, Math.floor((mbps - BASE_BANDWIDTH_MBPS) / BANDWIDTH_STEP_MBPS));
}

export function bandwidthRatePerHour(pricing: Record<string, number>): number {
  const rate = Number(pricing.bandwidth);
  return Number.isFinite(rate) && rate >= 0 ? rate : DEFAULT_BANDWIDTH_RATE_PER_HOUR;
}

/** Hourly cost of a full bandwidth tier (used at order time). */
export function bandwidthHourlyCost(mbps: number, pricing: Record<string, number>): number {
  return bandwidthSteps(mbps) * bandwidthRatePerHour(pricing);
}

/**
 * Hourly cost to go from `currentMbps` to `targetMbps` (used at upgrade time).
 * Computed as the difference of full tier costs so it can never be gamed by
 * splitting an upgrade into several small requests.
 */
export function bandwidthUpgradeHourlyCost(
  currentMbps: number,
  targetMbps: number,
  pricing: Record<string, number>
): number {
  const diff = bandwidthSteps(targetMbps) - bandwidthSteps(currentMbps);
  return Math.max(0, diff) * bandwidthRatePerHour(pricing);
}

/** Proxmox `rate` is in MB/s (1 MB/s = 8 Mbps). */
export function bandwidthToProxmoxRate(mbps: number): number {
  return mbps / 8;
}
