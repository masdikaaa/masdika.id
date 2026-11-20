export interface AppPlatformPlan {
  id: string;
  name: string;
  planCode: string;
  cpuLabel: string;
  ramLabel: string;
  diskLabel: string;
  cpuShares: number;
  memoryMb: number;
  storageGb: number;
  monthlyPrice: number;
  hourlyRate: number;
  badge?: string;
  popular?: boolean;
  planId?: number;
}

export const OFFICIAL_APP_PLATFORM_PLANS: AppPlatformPlan[] = [
  {
    id: "app-1c1g",
    name: "Shared App 1C1G",
    planCode: "1C1G",
    cpuLabel: "1 CPU",
    ramLabel: "1.0 GB RAM",
    diskLabel: "10 GB SSD",
    cpuShares: 1.0,
    memoryMb: 1024,
    storageGb: 10,
    monthlyPrice: 20000,
    hourlyRate: 28,
    popular: false,
  },
  {
    id: "app-1c2g",
    name: "Shared App 1C2G",
    planCode: "1C2G",
    cpuLabel: "1 CPU",
    ramLabel: "2.0 GB RAM",
    diskLabel: "10 GB SSD",
    cpuShares: 1.0,
    memoryMb: 2048,
    storageGb: 10,
    monthlyPrice: 30000,
    hourlyRate: 42,
    popular: true,
    badge: "Popular",
  },
  {
    id: "app-2c2g",
    name: "Shared App 2C2G",
    planCode: "2C2G",
    cpuLabel: "2 CPU",
    ramLabel: "2.0 GB RAM",
    diskLabel: "10 GB SSD",
    cpuShares: 2.0,
    memoryMb: 2048,
    storageGb: 10,
    monthlyPrice: 40000,
    hourlyRate: 56,
    popular: false,
  },
  {
    id: "app-2c4g",
    name: "Shared App 2C4G",
    planCode: "2C4G",
    cpuLabel: "2 CPU",
    ramLabel: "4.0 GB RAM",
    diskLabel: "10 GB SSD",
    cpuShares: 2.0,
    memoryMb: 4096,
    storageGb: 10,
    monthlyPrice: 75000,
    hourlyRate: 105,
    popular: false,
  },
  {
    id: "app-4c4g",
    name: "Shared App 4C4G",
    planCode: "4C4G",
    cpuLabel: "4 CPU",
    ramLabel: "4.0 GB RAM",
    diskLabel: "10 GB SSD",
    cpuShares: 4.0,
    memoryMb: 4096,
    storageGb: 10,
    monthlyPrice: 135000,
    hourlyRate: 188,
    popular: false,
  },
  {
    id: "app-4c8g",
    name: "Shared App 4C8G",
    planCode: "4C8G",
    cpuLabel: "4 CPU",
    ramLabel: "8.0 GB RAM",
    diskLabel: "10 GB SSD",
    cpuShares: 4.0,
    memoryMb: 8192,
    storageGb: 10,
    monthlyPrice: 225000,
    hourlyRate: 313,
    popular: false,
  },
  {
    id: "app-4c16g",
    name: "Shared App 4C16G",
    planCode: "4C16G",
    cpuLabel: "4 CPU",
    ramLabel: "16.0 GB RAM",
    diskLabel: "10 GB SSD",
    cpuShares: 4.0,
    memoryMb: 16384,
    storageGb: 10,
    monthlyPrice: 375000,
    hourlyRate: 521,
    popular: false,
  },
];

export const APP_PLATFORM_PLANS = OFFICIAL_APP_PLATFORM_PLANS;

export function getAppPlatformPlan(planCode: string): AppPlatformPlan {
  const norm = (planCode || "").trim().toUpperCase();
  const found = OFFICIAL_APP_PLATFORM_PLANS.find(
    (p) => p.planCode.toUpperCase() === norm || p.id.toUpperCase() === norm
  );
  return found || OFFICIAL_APP_PLATFORM_PLANS[1]; // fallback 1C2G
}
