import { PrismaClient } from '@prisma/client';
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from 'pg';
import crypto from 'crypto';
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL as string });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Hash password function (mocking standard hash for now, since we don't have bcrypt)
function hashPassword(password: string) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  const adminEmail = 'admin@masdika.dev';
  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!existingUser) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashPassword('password123'),
        name: 'Masdika',
        role: 'ADMIN'
      }
    });
    console.log('Admin user created: admin@masdika.dev / password123');
  } else {
    console.log('Admin user already exists.');
  }

  // 2. Seed Default Managed Database Plans (1 Shared + 6 Dedicated Flavors matching SumoPod)
  const databasePlans = [
    {
      name: 'Shared Database',
      service: 'DATABASE',
      description: 'Shared multi-tenant database with isolated container runtime and SATA SSD storage. Billed per GB starting from 1 GB.',
      price: 10000,
      hourlyPrice: 14,
      limits: JSON.stringify({
        cpu: '0.5 vCPU',
        ram: '1 GB',
        storage: '1 GB',
        region: 'Sidoarjo',
        shared: true,
        pricePerGb: 10000,
        engines: ['MySQL', 'MariaDB', 'PostgreSQL', 'MongoDB'],
      }),
      isActive: true,
      isPopular: true,
    },
    {
      name: 'Dedicated 1 vCPU / 1 GB',
      service: 'DATABASE',
      description: 'Reserved 1 vCPU & 1 GB RAM dedicated compute for lightweight databases and background microservices.',
      price: 30000,
      hourlyPrice: 42,
      limits: JSON.stringify({
        cpu: '1 vCPU',
        ram: '1 GB',
        storage: '1 GB',
        region: 'Sidoarjo',
        shared: false,
        pricePerGb: 5000,
        engines: ['MySQL', 'MariaDB', 'PostgreSQL', 'MongoDB'],
      }),
      isActive: true,
      isPopular: false,
    },
    {
      name: 'Dedicated 1 vCPU / 2 GB',
      service: 'DATABASE',
      description: 'Reserved 1 vCPU & 2 GB RAM dedicated compute. Ideal for Laravel, Node.js, and growing web applications.',
      price: 45000,
      hourlyPrice: 62,
      limits: JSON.stringify({
        cpu: '1 vCPU',
        ram: '2 GB',
        storage: '1 GB',
        region: 'Sidoarjo',
        shared: false,
        pricePerGb: 5000,
        engines: ['MySQL', 'MariaDB', 'PostgreSQL', 'MongoDB'],
      }),
      isActive: true,
      isPopular: true,
    },
    {
      name: 'Dedicated 2 vCPU / 2 GB',
      service: 'DATABASE',
      description: 'Reserved 2 vCPU cores & 2 GB RAM. Great concurrency for active transactional database workloads.',
      price: 55000,
      hourlyPrice: 76,
      limits: JSON.stringify({
        cpu: '2 vCPU',
        ram: '2 GB',
        storage: '1 GB',
        region: 'Sidoarjo',
        shared: false,
        pricePerGb: 5000,
        engines: ['MySQL', 'MariaDB', 'PostgreSQL', 'MongoDB'],
      }),
      isActive: true,
      isPopular: false,
    },
    {
      name: 'Dedicated 2 vCPU / 4 GB',
      service: 'DATABASE',
      description: 'Reserved 2 vCPU cores & 4 GB RAM. High throughput with large buffer pool for production apps.',
      price: 150000,
      hourlyPrice: 208,
      limits: JSON.stringify({
        cpu: '2 vCPU',
        ram: '4 GB',
        storage: '1 GB',
        region: 'Sidoarjo',
        shared: false,
        pricePerGb: 5000,
        engines: ['MySQL', 'MariaDB', 'PostgreSQL', 'MongoDB'],
      }),
      isActive: true,
      isPopular: false,
    },
    {
      name: 'Dedicated 2 vCPU / 8 GB',
      service: 'DATABASE',
      description: 'Reserved 2 vCPU cores & 8 GB RAM. Heavy read/write operations and in-memory caching capacity.',
      price: 250000,
      hourlyPrice: 347,
      limits: JSON.stringify({
        cpu: '2 vCPU',
        ram: '8 GB',
        storage: '1 GB',
        region: 'Sidoarjo',
        shared: false,
        pricePerGb: 5000,
        engines: ['MySQL', 'MariaDB', 'PostgreSQL', 'MongoDB'],
      }),
      isActive: true,
      isPopular: false,
    },
    {
      name: 'Dedicated 4 vCPU / 8 GB',
      service: 'DATABASE',
      description: 'Maximum performance host capacity with 4 vCPU cores & 8 GB RAM. Zero noisy neighbors guaranteed.',
      price: 400000,
      hourlyPrice: 555,
      limits: JSON.stringify({
        cpu: '4 vCPU',
        ram: '8 GB',
        storage: '1 GB',
        region: 'Sidoarjo',
        shared: false,
        pricePerGb: 5000,
        engines: ['MySQL', 'MariaDB', 'PostgreSQL', 'MongoDB'],
      }),
      isActive: true,
      isPopular: false,
    },
  ];

  for (const plan of databasePlans) {
    const existingPlan = await prisma.plan.findFirst({
      where: { service: 'DATABASE', name: plan.name },
    });
    if (!existingPlan) {
      await prisma.plan.create({ data: plan });
      console.log(`Plan created: ${plan.name}`);
    } else {
      await prisma.plan.update({
        where: { id: existingPlan.id },
        data: {
          description: plan.description,
          price: plan.price,
          hourlyPrice: plan.hourlyPrice,
          limits: plan.limits,
          isActive: true,
        },
      });
      console.log(`Plan updated: ${plan.name}`);
    }
  }

  // 3. Clean up obsolete duplicate 'Dedicated Database' plan
  const obsoletePlans = await prisma.plan.findMany({
    where: { service: 'DATABASE', name: 'Dedicated Database' },
  });
  for (const obs of obsoletePlans) {
    const subCount = await prisma.subscription.count({ where: { planId: obs.id } });
    if (subCount === 0) {
      await prisma.plan.delete({ where: { id: obs.id } });
      console.log(`Obsolete plan deleted: Dedicated Database (ID ${obs.id})`);
    } else {
      await prisma.plan.update({ where: { id: obs.id }, data: { isActive: false } });
    }
  }

  // 4. Seed default Managed Database GUI Viewers & Settings
  const defaultSettings = [
    { key: 'managed_db_public_domain', value: 'db.masdika.id' },
    { key: 'managed_db_public_ip', value: '103.247.10.61' },
    { key: 'managed_db_pma_url', value: 'https://pma.db.masdika.id' },
    { key: 'managed_db_pgadmin_url', value: 'https://pgadmin.db.masdika.id' },
    { key: 'managed_db_mongo_url', value: 'https://mongo.db.masdika.id' },
  ];

  for (const s of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: { key: s.key, value: s.value },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
