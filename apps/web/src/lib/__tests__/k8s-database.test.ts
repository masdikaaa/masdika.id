import { describe, it, expect } from 'vitest';
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
      expect(details.mongoUrl).toBe('https://mongo.db.masdika.id');
      expect(details.mongoExpressUrl).toBe('https://mongo.db.masdika.id');
      expect(details.laravelEnv).toContain('DB_CONNECTION=mongodb');
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
    it('should have exactly 6 official tiers (1 Shared + 5 Dedicated)', () => {
      expect(OFFICIAL_DATABASE_PLANS).toHaveLength(6);
      const names = OFFICIAL_DATABASE_PLANS.map((p) => p.name);
      expect(names).toEqual([
        'Shared Database',
        'Dedicated Nano',
        'Dedicated Micro',
        'Dedicated Small',
        'Dedicated Medium',
        'Dedicated Pro',
      ]);
    });

    it('should include MongoDB engine in all 6 plans', () => {
      for (const plan of OFFICIAL_DATABASE_PLANS) {
        expect(plan.limits.engines).toContain('MongoDB');
        expect(plan.limits.engines).toContain('MySQL');
        expect(plan.limits.engines).toContain('MariaDB');
        expect(plan.limits.engines).toContain('PostgreSQL');
      }
    });

    it('should match accurate pricing and resource scaling', () => {
      const nano = OFFICIAL_DATABASE_PLANS.find((p) => p.name === 'Dedicated Nano')!;
      expect(nano.price).toBe(25000);
      expect(nano.hourlyPrice).toBe(35);
      expect(nano.limits.cpu).toBe('500m Dedicated');

      const pro = OFFICIAL_DATABASE_PLANS.find((p) => p.name === 'Dedicated Pro')!;
      expect(pro.price).toBe(150000);
      expect(pro.hourlyPrice).toBe(208);
      expect(pro.limits.ram).toBe('8 GB');
    });
  });
});
