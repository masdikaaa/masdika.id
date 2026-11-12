import { prisma } from './prisma';

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
  };
  isActive: boolean;
  isPopular: boolean;
}

export const OFFICIAL_DATABASE_PLANS: DatabasePlanDefinition[] = [
  {
    name: 'Shared Database',
    service: 'DATABASE',
    description: 'High-performance shared managed database with isolated container & NVMe storage in Sidoarjo.',
    price: 20000,
    hourlyPrice: 28,
    limits: {
      cpu: '0.5 vCPU',
      ram: '1 GB',
      storage: '10 GB',
      region: 'Sidoarjo',
      shared: true,
      engines: ['MySQL', 'MariaDB', 'PostgreSQL', 'MongoDB'],
    },
    isActive: true,
    isPopular: true,
  },
  {
    name: 'Dedicated Nano',
    service: 'DATABASE',
    description: 'Dedicated 500m CPU core with guaranteed memory. Great for personal projects, microservices, and lightweight databases.',
    price: 25000,
    hourlyPrice: 35,
    limits: {
      cpu: '500m Dedicated',
      ram: '1 GB',
      storage: '10 GB',
      region: 'Sidoarjo',
      shared: false,
      engines: ['MySQL', 'MariaDB', 'PostgreSQL', 'MongoDB'],
    },
    isActive: true,
    isPopular: false,
  },
  {
    name: 'Dedicated Micro',
    service: 'DATABASE',
    description: 'Dedicated 1 vCPU with 2 GB RAM. Excellent for Laravel apps, WordPress, and growing web services.',
    price: 45000,
    hourlyPrice: 62,
    limits: {
      cpu: '1 vCPU (1000m)',
      ram: '2 GB',
      storage: '15 GB',
      region: 'Sidoarjo',
      shared: false,
      engines: ['MySQL', 'MariaDB', 'PostgreSQL', 'MongoDB'],
    },
    isActive: true,
    isPopular: true,
  },
  {
    name: 'Dedicated Small',
    service: 'DATABASE',
    description: 'Dedicated 2 vCPU cores with 4 GB RAM. High throughput and caching for active web services.',
    price: 75000,
    hourlyPrice: 104,
    limits: {
      cpu: '2 vCPU (2000m)',
      ram: '4 GB',
      storage: '25 GB',
      region: 'Sidoarjo',
      shared: false,
      engines: ['MySQL', 'MariaDB', 'PostgreSQL', 'MongoDB'],
    },
    isActive: true,
    isPopular: false,
  },
  {
    name: 'Dedicated Medium',
    service: 'DATABASE',
    description: 'Dedicated 3 vCPU cores with 6 GB RAM & 40 GB NVMe. Heavy read/write operations with zero lag.',
    price: 110000,
    hourlyPrice: 153,
    limits: {
      cpu: '3 vCPU (3000m)',
      ram: '6 GB',
      storage: '40 GB',
      region: 'Sidoarjo',
      shared: false,
      engines: ['MySQL', 'MariaDB', 'PostgreSQL', 'MongoDB'],
    },
    isActive: true,
    isPopular: false,
  },
  {
    name: 'Dedicated Pro',
    service: 'DATABASE',
    description: 'Full dedicated VM host capacity (4 CPU, 8 GB RAM, 60 GB NVMe). Maximum performance and zero noisy neighbors.',
    price: 150000,
    hourlyPrice: 208,
    limits: {
      cpu: '4 vCPU (4000m)',
      ram: '8 GB',
      storage: '60 GB',
      region: 'Sidoarjo',
      shared: false,
      engines: ['MySQL', 'MariaDB', 'PostgreSQL', 'MongoDB'],
    },
    isActive: true,
    isPopular: false,
  },
];

/**
 * Ensures all 6 official database plans exist and are active in the database.
 * Also cleans up any obsolete duplicate plans (such as legacy 'Dedicated Database').
 */
export async function ensureDatabasePlansExist(): Promise<void> {
  try {
    for (const def of OFFICIAL_DATABASE_PLANS) {
      const existing = await prisma.plan.findFirst({
        where: { service: 'DATABASE', name: def.name },
      });

      const limitsJson = JSON.stringify(def.limits);

      if (!existing) {
        await prisma.plan.create({
          data: {
            name: def.name,
            service: def.service,
            description: def.description,
            price: def.price,
            hourlyPrice: def.hourlyPrice,
            limits: limitsJson,
            isActive: def.isActive,
            isPopular: def.isPopular,
          },
        });
      } else {
        // Ensure engines include MongoDB and specs match current definitions
        await prisma.plan.update({
          where: { id: existing.id },
          data: {
            description: def.description,
            price: def.price,
            hourlyPrice: def.hourlyPrice,
            limits: limitsJson,
            isActive: true,
          },
        });
      }
    }

    // Clean up obsolete duplicate 'Dedicated Database' plan if Dedicated Pro exists
    const obsoletePlans = await prisma.plan.findMany({
      where: {
        service: 'DATABASE',
        name: 'Dedicated Database',
      },
    });

    for (const obs of obsoletePlans) {
      const subCount = await prisma.subscription.count({
        where: { planId: obs.id },
      });
      if (subCount === 0) {
        await prisma.plan.delete({ where: { id: obs.id } });
      } else {
        await prisma.plan.update({
          where: { id: obs.id },
          data: { isActive: false },
        });
      }
    }
  } catch (error) {
    console.error('[DatabasePlans] Failed to ensure database plans:', error);
  }
}
