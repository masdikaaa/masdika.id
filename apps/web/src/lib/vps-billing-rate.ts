/**
 * Shared PAYG VPS & K3s rate helpers.
 *
 * Dedicated Cloud VPS and Managed K3s nodes maintain full physical resource reservations
 * on the hypervisor (CPU cores, RAM slices, NVMe disks, network interfaces, and public IPs)
 * even when powered off (STOPPED). Therefore, the full hourlyRate continues
 * to be charged while STOPPED to cover operational infrastructure costs without loopholes.
 *
 * Only TERMINATED or SUSPENDED instances cease hourly billing.
 */

export type VpsRateInput = {
  status: string;
  hourlyRate: number;
  stoppedRate?: number | null;
  cpuCores?: number;
  ramGb?: number;
};

export function getComputeRate(vps: Pick<VpsRateInput, "cpuCores" | "ramGb">, pricing?: Record<string, number>): number {
  if (!pricing) return 0;
  return (vps.cpuCores || 0) * (pricing.vcpu || 0) + (vps.ramGb || 0) * (pricing.ram || 0);
}

/** Rate charged when an instance is STOPPED (full reservation rate matching hourlyRate). */
export function getStoppedRate(vps: VpsRateInput, pricing?: Record<string, number>): number {
  return Math.max(0, vps.hourlyRate);
}

/** The hourly cost that applies right now, based on the power state. */
export function getEffectiveHourlyRate(vps: VpsRateInput, pricing?: Record<string, number>): number {
  if (vps.status === "RUNNING" || vps.status === "STOPPED") {
    return Math.max(0, vps.hourlyRate);
  }
  return 0;
}
