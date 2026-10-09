/**
 * Shared PAYG VPS rate helpers.
 *
 * A STOPPED VPS must only be billed for resources that still occupy capacity
 * while powered off (disk, backup, and any non-reserved IP). CPU and RAM are
 * never billed while stopped.
 *
 * `stoppedRate` is stored on the VPS, but it can drift (e.g. a reserved IP is
 * attached and billed separately, yet still counted in `stoppedRate`). To make
 * sure a stopped VPS is never overcharged, we cap it at
 * `hourlyRate - (cpu + ram cost)`, which is the storage-only part of the rate.
 */

export type VpsRateInput = {
  status: string;
  hourlyRate: number;
  stoppedRate: number | null;
  cpuCores: number;
  ramGb: number;
};

export function getComputeRate(vps: Pick<VpsRateInput, "cpuCores" | "ramGb">, pricing: Record<string, number>): number {
  return (vps.cpuCores || 0) * (pricing.vcpu || 0) + (vps.ramGb || 0) * (pricing.ram || 0);
}

/** Storage-only hourly cost for a powered-off VPS (never above the storage part of hourlyRate). */
export function getStoppedRate(vps: VpsRateInput, pricing: Record<string, number>): number {
  const storageCeiling = Math.max(0, vps.hourlyRate - getComputeRate(vps, pricing));
  const locked = Math.max(0, vps.stoppedRate || 0);
  return Math.min(locked, storageCeiling);
}

/** The hourly cost that applies right now, based on the power state. */
export function getEffectiveHourlyRate(vps: VpsRateInput, pricing: Record<string, number>): number {
  if (vps.status === "RUNNING") return vps.hourlyRate;
  if (vps.status === "STOPPED") return getStoppedRate(vps, pricing);
  return 0;
}
