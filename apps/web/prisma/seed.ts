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

  // 2. Seed Default Managed Database Plans (1 Shared + 5 Dedicated tiers)
  const databasePlans = [
    {
      name: 'Shared Database',
      service: 'DATABASE',
      description: 'High-performance shared managed database with isolated container & NVMe storage in Sidoarjo.',
      price: 20000,
      hourlyPrice: 28,
      limits: JSON.stringify({
        cpu: '0.5 vCPU',
        ram: '1 GB',
        storage: '10 GB',
        region: 'Sidoarjo',
        shared: true,
        engines: ['MySQL', 'MariaDB', 'PostgreSQL', 'MongoDB'],
      }),
      isActive: true,
      isPopular: true,
    },
    {
      name: 'Dedicated Nano',
      service: 'DATABASE',
      description: 'Dedicated 500m CPU core with guaranteed memory. Great for personal projects, microservices, and lightweight databases.',
      price: 25000,
      hourlyPrice: 35,
      limits: JSON.stringify({
        cpu: '500m Dedicated',
        ram: '1 GB',
        storage: '10 GB',
        region: 'Sidoarjo',
        shared: false,
        engines: ['MySQL', 'MariaDB', 'PostgreSQL', 'MongoDB'],
      }),
      isActive: true,
      isPopular: false,
    },
    {
      name: 'Dedicated Micro',
      service: 'DATABASE',
      description: 'Dedicated 1 vCPU with 2 GB RAM. Excellent for Laravel apps, WordPress, and growing web services.',
      price: 45000,
      hourlyPrice: 62,
      limits: JSON.stringify({
        cpu: '1 vCPU (1000m)',
        ram: '2 GB',
        storage: '15 GB',
        region: 'Sidoarjo',
        shared: false,
        engines: ['MySQL', 'MariaDB', 'PostgreSQL', 'MongoDB'],
      }),
      isActive: true,
      isPopular: true,
    },
    {
      name: 'Dedicated Small',
      service: 'DATABASE',
      description: 'Dedicated 2 vCPU cores with 4 GB RAM. High throughput and caching for active web services.',
      price: 75000,
      hourlyPrice: 104,
      limits: JSON.stringify({
        cpu: '2 vCPU (2000m)',
        ram: '4 GB',
        storage: '25 GB',
        region: 'Sidoarjo',
        shared: false,
        engines: ['MySQL', 'MariaDB', 'PostgreSQL', 'MongoDB'],
      }),
      isActive: true,
      isPopular: false,
    },
    {
      name: 'Dedicated Medium',
      service: 'DATABASE',
      description: 'Dedicated 3 vCPU cores with 6 GB RAM & 40 GB NVMe. Heavy read/write operations with zero lag.',
      price: 110000,
      hourlyPrice: 153,
      limits: JSON.stringify({
        cpu: '3 vCPU (3000m)',
        ram: '6 GB',
        storage: '40 GB',
        region: 'Sidoarjo',
        shared: false,
        engines: ['MySQL', 'MariaDB', 'PostgreSQL', 'MongoDB'],
      }),
      isActive: true,
      isPopular: false,
    },
    {
      name: 'Dedicated Pro',
      service: 'DATABASE',
      description: 'Full dedicated VM host capacity (4 CPU, 8 GB RAM, 60 GB NVMe). Maximum performance and zero noisy neighbors.',
      price: 150000,
      hourlyPrice: 208,
      limits: JSON.stringify({
        cpu: '4 vCPU (4000m)',
        ram: '8 GB',
        storage: '60 GB',
        region: 'Sidoarjo',
        shared: false,
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
