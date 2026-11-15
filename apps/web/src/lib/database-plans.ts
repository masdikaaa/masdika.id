export interface DatabasePlanDefinition {
  name: string;
  service: 'DATABASE';
  description: string;
  price: number;
  hourlyPrice: number;
  limits: {
    cpu: string;
    ram: string;
    storage: string;
    region: string;
    shared: boolean;
    engines: string[];
    pricePerGb?: number;
  };
  isActive: boolean;
  isPopular: boolean;
}

/**
 * Official Managed Database Plans matching SumoPod Flavors & Pay-Per-GB Storage:
 * - Shared Database: Burstable compute, billed per GB storage (Rp 10.000/GB/month)
 * - 6 Dedicated Flavors: Reserved vCPU & RAM + Rp 5.000/GB/month storage slider
 */
export const OFFICIAL_DATABASE_PLANS: DatabasePlanDefinition[] = [
  {
    name: 'Shared Database',
    service: 'DATABASE',
    description: 'Shared multi-tenant database with isolated container runtime and SSD storage. Billed per GB starting from 1 GB.',
    price: 10000,
    hourlyPrice: 14,
    limits: {
      cpu: '0.5 vCPU',
      ram: '1 GB',
      storage: '1 GB',
      region: 'Sidoarjo',
      shared: true,
      pricePerGb: 10000,
      engines: ['MySQL', 'MariaDB', 'PostgreSQL', 'MongoDB'],
    },
    isActive: true,
    isPopular: true,
  },
  {
    name: 'Dedicated 1 vCPU / 1 GB',
    service: 'DATABASE',
    description: 'Reserved 1 vCPU & 1 GB RAM dedicated compute for lightweight databases and background microservices.',
    price: 30000,
    hourlyPrice: 42,
    limits: {
      cpu: '1 vCPU',
      ram: '1 GB',
      storage: '1 GB',
      region: 'Sidoarjo',
      shared: false,
      pricePerGb: 5000,
      engines: ['MySQL', 'MariaDB', 'PostgreSQL', 'MongoDB'],
    },
    isActive: true,
    isPopular: false,
  },
  {
    name: 'Dedicated 1 vCPU / 2 GB',
    service: 'DATABASE',
    description: 'Reserved 1 vCPU & 2 GB RAM dedicated compute. Ideal for Laravel, Node.js, and growing web applications.',
    price: 45000,
    hourlyPrice: 62,
    limits: {
      cpu: '1 vCPU',
      ram: '2 GB',
      storage: '1 GB',
      region: 'Sidoarjo',
      shared: false,
      pricePerGb: 5000,
      engines: ['MySQL', 'MariaDB', 'PostgreSQL', 'MongoDB'],
    },
    isActive: true,
    isPopular: true,
  },
  {
    name: 'Dedicated 2 vCPU / 2 GB',
    service: 'DATABASE',
    description: 'Reserved 2 vCPU cores & 2 GB RAM. Great concurrency for active transactional database workloads.',
    price: 55000,
    hourlyPrice: 76,
    limits: {
      cpu: '2 vCPU',
      ram: '2 GB',
      storage: '1 GB',
      region: 'Sidoarjo',
      shared: false,
      pricePerGb: 5000,
      engines: ['MySQL', 'MariaDB', 'PostgreSQL', 'MongoDB'],
    },
    isActive: true,
    isPopular: false,
  },
  {
    name: 'Dedicated 2 vCPU / 4 GB',
    service: 'DATABASE',
    description: 'Reserved 2 vCPU cores & 4 GB RAM. High throughput with large buffer pool for production apps.',
    price: 150000,
    hourlyPrice: 208,
    limits: {
      cpu: '2 vCPU',
      ram: '4 GB',
      storage: '1 GB',
      region: 'Sidoarjo',
      shared: false,
      pricePerGb: 5000,
      engines: ['MySQL', 'MariaDB', 'PostgreSQL', 'MongoDB'],
    },
    isActive: true,
    isPopular: false,
  },
  {
    name: 'Dedicated 2 vCPU / 8 GB',
    service: 'DATABASE',
    description: 'Reserved 2 vCPU cores & 8 GB RAM. Heavy read/write operations and in-memory caching capacity.',
    price: 250000,
    hourlyPrice: 347,
    limits: {
      cpu: '2 vCPU',
      ram: '8 GB',
      storage: '1 GB',
      region: 'Sidoarjo',
      shared: false,
      pricePerGb: 5000,
      engines: ['MySQL', 'MariaDB', 'PostgreSQL', 'MongoDB'],
    },
    isActive: true,
    isPopular: false,
  },
  {
    name: 'Dedicated 4 vCPU / 8 GB',
    service: 'DATABASE',
    description: 'Maximum performance host capacity with 4 vCPU cores & 8 GB RAM. Zero noisy neighbors guaranteed.',
    price: 400000,
    hourlyPrice: 555,
    limits: {
      cpu: '4 vCPU',
      ram: '8 GB',
      storage: '1 GB',
      region: 'Sidoarjo',
      shared: false,
      pricePerGb: 5000,
      engines: ['MySQL', 'MariaDB', 'PostgreSQL', 'MongoDB'],
    },
    isActive: true,
    isPopular: false,
  },
];

export const DATABASE_STORAGE_MIN_GB = 1;
export const DATABASE_STORAGE_MAX_GB = 20;
export const DATABASE_DEDICATED_STORAGE_RATE_PER_GB = 5000;
export const DATABASE_SHARED_DEFAULT_RATE_PER_GB = 10000;
export const DATABASE_SHARED_EXTENSION_RATE_PER_GB = 12500;
export const DATABASE_SHARED_FULL_EXTENSIONS_RATE_PER_GB = 15000;

const DB_ENGINE_LABELS: Record<string, string> = {
  POSTGRES: 'PostgreSQL',
  MYSQL: 'MySQL',
  MARIADB: 'MariaDB',
  MONGODB: 'MongoDB',
  REDIS: 'Redis',
};

/**
 * Parses storage capacity strictly as an integer in [minGb, maxGb].
 * Rejects decimals, negative numbers, trailing junk ("10abc"), or values > maxGb.
 */
export function parseStrictStorageGb(
  input: unknown,
  defaultGb: number = 1,
  minGb: number = DATABASE_STORAGE_MIN_GB,
  maxGb: number = DATABASE_STORAGE_MAX_GB
): number | null {
  if (input === undefined || input === null || input === '') {
    return defaultGb;
  }

  let parsed: number;
  if (typeof input === 'number') {
    if (!Number.isFinite(input) || !Number.isInteger(input)) return null;
    parsed = input;
  } else if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    parsed = parseInt(trimmed, 10);
  } else {
    return null;
  }

  if (parsed < minGb || parsed > maxGb) {
    return null;
  }
  return parsed;
}

export interface DbPlanRecordLike {
  id: number;
  name: string;
  service: string;
  price: number;
  limits: string;
  isActive: boolean;
}

export interface AuthoritativeDatabaseOrderResult {
  cpuShares: number;
  memoryMb: number;
  storageGb: number;
  effectiveTier: 'SHARED' | 'DEDICATED';
  effectivePlanName: string;
  cleanVersion: string;
  monthlyPrice: number;
  hourlyRate: number;
  ratePerGbUsed: number;
}

function parseSimpleDbPlanLimits(limitsStr: string): { cpuShares: number; memoryMb: number; shared: boolean } {
  try {
    const obj = JSON.parse(limitsStr || '{}');
    const cpuRaw = String(obj.cpu || '0.5');
    const cpuShares = Math.max(0.1, parseFloat(cpuRaw.replace(/[^0-9.]/g, '')) || 0.5);
    const ramRaw = String(obj.ram || '1 GB').toLowerCase();
    const ramNum = parseFloat(ramRaw.replace(/[^0-9.]/g, '')) || 1;
    const memoryMb = ramRaw.includes('gb') ? Math.round(ramNum * 1024) : Math.round(ramNum);
    return { cpuShares, memoryMb, shared: Boolean(obj.shared) };
  } catch {
    return { cpuShares: 0.5, memoryMb: 1024, shared: true };
  }
}

/**
 * Pure server-authoritative pricing & spec resolver for Managed Database provisioning.
 * Ignores any client-supplied price or `ratePerGb` completely to prevent price tampering.
 */
export function calculateAuthoritativeDatabaseOrder(params: {
  typeUpper: string;
  version: string;
  tier?: string;
  planId?: number | null;
  planName?: string;
  storageGb: number;
  activeDbPlans: DbPlanRecordLike[];
  baseSharedRatePerGb?: number;
}): { ok: true; data: AuthoritativeDatabaseOrderResult } | { ok: false; error: string } {
  const baseSharedRate =
    typeof params.baseSharedRatePerGb === 'number' && params.baseSharedRatePerGb > 0
      ? Math.round(params.baseSharedRatePerGb)
      : DATABASE_SHARED_DEFAULT_RATE_PER_GB;

  const engineLabel = DB_ENGINE_LABELS[params.typeUpper] || params.typeUpper;
  const reqPlanLower = (params.planName || '').toLowerCase();

  let selectedDbPlan: DbPlanRecordLike | undefined;
  if (params.planId !== undefined && params.planId !== null) {
    selectedDbPlan = params.activeDbPlans.find(
      (p) => p.id === params.planId && p.service === 'DATABASE' && p.isActive
    );
    if (!selectedDbPlan) {
      return { ok: false, error: 'Selected database plan does not exist or is no longer active.' };
    }
  } else if (params.planName) {
    selectedDbPlan = params.activeDbPlans.find(
      (p) => p.service === 'DATABASE' && p.isActive && p.name.toLowerCase() === reqPlanLower.trim()
    );
  }

  const officialFallbackPlan = !selectedDbPlan && params.planName
    ? OFFICIAL_DATABASE_PLANS.find((p) => p.name.toLowerCase() === reqPlanLower.trim())
    : undefined;

  const isDedicatedRequested =
    (selectedDbPlan ? !parseSimpleDbPlanLimits(selectedDbPlan.limits).shared : false) ||
    (officialFallbackPlan ? !officialFallbackPlan.limits.shared : false) ||
    (typeof params.tier === 'string' && params.tier.trim().toUpperCase() === 'DEDICATED');

  if (isDedicatedRequested) {
    const matchedDedicated =
      selectedDbPlan
        ? {
            name: selectedDbPlan.name,
            price: selectedDbPlan.price,
            ...parseSimpleDbPlanLimits(selectedDbPlan.limits),
          }
        : officialFallbackPlan && !officialFallbackPlan.limits.shared
          ? {
              name: officialFallbackPlan.name,
              price: officialFallbackPlan.price,
              ...parseSimpleDbPlanLimits(JSON.stringify(officialFallbackPlan.limits)),
            }
          : {
              name: 'Dedicated 1 vCPU / 2 GB',
              price: 45000,
              cpuShares: 1.0,
              memoryMb: 2048,
            };

    const storageCost = params.storageGb * DATABASE_DEDICATED_STORAGE_RATE_PER_GB;
    const monthlyPrice = matchedDedicated.price + storageCost;
    const hourlyRate = Math.max(1, Math.ceil(monthlyPrice / 720));

    return {
      ok: true,
      data: {
        cpuShares: matchedDedicated.cpuShares,
        memoryMb: matchedDedicated.memoryMb,
        storageGb: params.storageGb,
        effectiveTier: 'DEDICATED',
        effectivePlanName: `${matchedDedicated.name} (${params.storageGb} GB)`,
        cleanVersion: params.version,
        monthlyPrice,
        hourlyRate,
        ratePerGbUsed: DATABASE_DEDICATED_STORAGE_RATE_PER_GB,
      },
    };
  }

  // SHARED tier: compute ratePerGb strictly from server rules & PostgreSQL extension selections
  let ratePerGbUsed = baseSharedRate;
  let cleanVersion = params.version;
  let variantLabel = params.version;

  if (params.typeUpper === 'POSTGRES') {
    const wantsPostgis = reqPlanLower.includes('postgis') || reqPlanLower.includes('gis');
    const wantsVector = reqPlanLower.includes('pgvector') || reqPlanLower.includes('vector');
    if (wantsPostgis && wantsVector) {
      ratePerGbUsed = Math.max(baseSharedRate, DATABASE_SHARED_FULL_EXTENSIONS_RATE_PER_GB);
      cleanVersion = '16';
      variantLabel = '16 + PostGIS + pgvector';
    } else if (wantsPostgis) {
      ratePerGbUsed = Math.max(baseSharedRate, DATABASE_SHARED_EXTENSION_RATE_PER_GB);
      cleanVersion = '16';
      variantLabel = '16 + PostGIS';
    } else if (wantsVector) {
      ratePerGbUsed = Math.max(baseSharedRate, DATABASE_SHARED_EXTENSION_RATE_PER_GB);
      cleanVersion = '16';
      variantLabel = '16 + pgvector';
    }
  }

  const sharedPlanSpecs = selectedDbPlan
    ? parseSimpleDbPlanLimits(selectedDbPlan.limits)
    : { cpuShares: 0.5, memoryMb: 1024 };

  const monthlyPrice = params.storageGb * ratePerGbUsed;
  const hourlyRate = Math.max(1, Math.ceil(monthlyPrice / 720));

  return {
    ok: true,
    data: {
      cpuShares: sharedPlanSpecs.cpuShares,
      memoryMb: sharedPlanSpecs.memoryMb,
      storageGb: params.storageGb,
      effectiveTier: 'SHARED',
      effectivePlanName: `Shared ${engineLabel} ${variantLabel} (${params.storageGb} GB)`,
      cleanVersion,
      monthlyPrice,
      hourlyRate,
      ratePerGbUsed,
    },
  };
}
