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
