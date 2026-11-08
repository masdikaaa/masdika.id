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

/**
 * Computes the unbreakable minimum hourly rate floor for a PAYG VPS based on its
 * core allocated hardware (CPU, RAM, primary OS disk, and backup quota).
 * Detaching optional add-on disks or secondary/reserved IPs must NEVER reduce
 * `vps.hourlyRate` below this floor.
 */
export function calculateMinimumBaseVpsRate(
  vps: {
    cpuCores?: number | null;
    ramGb?: number | null;
    diskGb?: number | null;
    diskType?: string | null;
    backupGb?: number | null;
  },
  pricing: Record<string, number>
): number {
  const isSsd = (vps.diskType || "").toUpperCase() === "SSD";
  const diskUnitRate = isSsd ? (pricing.diskSsd ?? pricing.disk ?? 0) : (pricing.disk ?? 0);
  const cpuCost = Math.max(0, vps.cpuCores || 0) * Math.max(0, pricing.vcpu || 0);
  const ramCost = Math.max(0, vps.ramGb || 0) * Math.max(0, pricing.ram || 0);
  const diskCost = Math.max(0, vps.diskGb || 0) * Math.max(0, diskUnitRate);
  const backupCost = Math.max(0, vps.backupGb || 0) * Math.max(0, pricing.backup || 0);
  return cpuCost + ramCost + diskCost + backupCost;
}
