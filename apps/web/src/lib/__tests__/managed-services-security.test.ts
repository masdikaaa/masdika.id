import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockState = vi.hoisted(() => ({
  authUser: { id: 10, role: 'USER', email: 'user@example.com', name: 'Test User', balance: 500000, isSuspended: false } as any,
  appRow: null as any,
  dbPlans: [] as any[],
  rateSetting: null as any,
  freshUser: { id: 10, balance: 500000, isSuspended: false, suspendReason: null } as any,
  createdDbPayload: null as any,
  startAppCalled: false,
  releasedPort: null as number | null,
}));

vi.mock('@/lib/auth-middleware', () => ({
  requireAuth: vi.fn(async () => ({ userId: mockState.authUser.id, user: mockState.authUser })),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(async () => true),
}));

vi.mock('@/lib/get-ip', () => ({
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/activity-log', () => ({
  logClientActivity: vi.fn(async () => {}),
}));

vi.mock('@/lib/billing-commitment', () => ({
  assertSufficientCommitmentBalance: vi.fn(async ({ newServiceMonthly }: any) => ({
    requiredBalance: newServiceMonthly,
    currentCommitment: 0,
  })),
  getUserServicesCommitment: vi.fn(async () => ({
    totalMonthly: 0,
  })),
}));

vi.mock('@/lib/email', () => ({
  sendDatabaseProvisionedEmail: vi.fn(async () => {}),
  sendReactivatedEmail: vi.fn(async () => {}),
  sendAdminServiceReactivatedEmail: vi.fn(async () => {}),
}));

vi.mock('@/lib/k8s-app', () => ({
  startAppService: vi.fn(async () => {
    mockState.startAppCalled = true;
  }),
  stopAppService: vi.fn(async () => {}),
  restartAppService: vi.fn(async () => {}),
  updateAppServiceToLatest: vi.fn(async () => ({ message: 'updated' })),
}));

vi.mock('@/lib/k8s-database', () => ({
  allocateAvailablePort: vi.fn(async () => 30555),
  releaseReservedDbPort: vi.fn((port: number) => {
    mockState.releasedPort = port;
  }),
  deployDatabase: vi.fn(async () => ({ success: false, error: 'mocked skip deploy' })),
  getK8sClusterConfig: vi.fn(async () => ({ publicDomain: 'db.masdika.id', publicIp: '1.2.3.4' })),
  buildConnectionDetails: vi.fn(() => ({ uri: 'postgresql://u:p@db.masdika.id:30555/db' })),
  checkDatabaseClusterCapacity: vi.fn(async () => ({ available: true })),
  getDatabaseStatus: vi.fn(async () => ({ ready: false, status: 'PROVISIONING' })),
}));

vi.mock('@/lib/prisma', () => {
  const tx = {
    $executeRaw: vi.fn(async () => 1),
    user: {
      findUnique: vi.fn(async () => mockState.freshUser),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    databaseService: {
      create: vi.fn(async ({ data }: any) => {
        mockState.createdDbPayload = data;
        return { id: 99, ...data };
      }),
    },
  };

  return {
    prisma: {
      plan: {
        findMany: vi.fn(async () => mockState.dbPlans),
      },
      setting: {
        findUnique: vi.fn(async () => mockState.rateSetting),
      },
      user: {
        findUnique: vi.fn(async () => mockState.freshUser),
      },
      appService: {
        findFirst: vi.fn(async () => mockState.appRow),
        update: vi.fn(async ({ data }: any) => ({ ...mockState.appRow, ...data })),
      },
      databaseService: {
        update: vi.fn(async () => ({})),
      },
      $transaction: vi.fn(async (cb: any) => cb(tx)),
    },
  };
});

import {
  calculateAuthoritativeDatabaseOrder,
  parseStrictStorageGb,
  OFFICIAL_DATABASE_PLANS,
} from '../database-plans';
import { matchAppPlanFromRecords, sanitizeCustomSubdomain } from '../app-catalog';
import { isBillingSuspension } from '../auto-unsuspend';
import { POST as appPowerPost } from '@/app/api/user/apps/[id]/power/route';
import { POST as dbCreatePost } from '@/app/api/user/database/route';

describe('Managed DB & Managed App Security Hardening', () => {
  beforeEach(() => {
    mockState.authUser = { id: 10, role: 'USER', email: 'user@example.com', name: 'Test User', balance: 500000, isSuspended: false };
    mockState.freshUser = { id: 10, balance: 500000, isSuspended: false, suspendReason: null };
    mockState.appRow = null;
    mockState.dbPlans = [];
    mockState.rateSetting = null;
    mockState.createdDbPayload = null;
    mockState.startAppCalled = false;
    mockState.releasedPort = null;
  });

  describe('1. Database Pricing, Storage & Plan Integrity', () => {
    it('enforces strict integer storage between 1 and 20 GB', () => {
      expect(parseStrictStorageGb(undefined, 1)).toBe(1);
      expect(parseStrictStorageGb(1)).toBe(1);
      expect(parseStrictStorageGb('20')).toBe(20);
      expect(parseStrictStorageGb(0)).toBeNull();
      expect(parseStrictStorageGb(-5)).toBeNull();
      expect(parseStrictStorageGb(21)).toBeNull();
      expect(parseStrictStorageGb(100)).toBeNull();
      expect(parseStrictStorageGb(2.5)).toBeNull();
      expect(parseStrictStorageGb('10abc')).toBeNull();
    });

    it('derives shared PostgreSQL PostGIS/pgvector rates purely server-side and strips arbitrary planName text', () => {
      const regular = calculateAuthoritativeDatabaseOrder({
        typeUpper: 'POSTGRES',
        version: '16',
        tier: 'SHARED',
        planName: '<script>alert(1)</script>Shared PostgreSQL',
        storageGb: 3,
        activeDbPlans: [],
        baseSharedRatePerGb: 10000,
      });
      expect(regular.ok).toBe(true);
      if (regular.ok) {
        expect(regular.data.monthlyPrice).toBe(30000);
        expect(regular.data.effectivePlanName).toBe('Shared PostgreSQL 16 (3 GB)');
        expect(regular.data.effectivePlanName).not.toContain('<script>');
      }

      const gisVector = calculateAuthoritativeDatabaseOrder({
        typeUpper: 'POSTGRES',
        version: '18',
        tier: 'SHARED',
        planName: 'Shared PostgreSQL 16 + PostGIS + pgvector',
        storageGb: 2,
        activeDbPlans: [],
        baseSharedRatePerGb: 10000,
      });
      expect(gisVector.ok).toBe(true);
      if (gisVector.ok) {
        expect(gisVector.data.monthlyPrice).toBe(30000);
        expect(gisVector.data.hourlyRate).toBe(42);
        expect(gisVector.data.cleanVersion).toBe('16');
        expect(gisVector.data.effectivePlanName).toBe('Shared PostgreSQL 16 + PostGIS + pgvector (2 GB)');
      }
    });

    it('rejects inactive or unknown planId rather than provisioning deprecated pricing', () => {
      const res = calculateAuthoritativeDatabaseOrder({
        typeUpper: 'MYSQL',
        version: '8.0',
        tier: 'DEDICATED',
        planId: 999,
        storageGb: 2,
        activeDbPlans: [
          {
            id: 999,
            name: OFFICIAL_DATABASE_PLANS[1].name,
            service: 'DATABASE',
            price: 100,
            limits: JSON.stringify(OFFICIAL_DATABASE_PLANS[1].limits),
            isActive: false,
          },
        ],
      });
      expect(res.ok).toBe(false);
    });

    it('ignores client-manipulated ratePerGb=1 on POST /api/user/database', async () => {
      const req = new NextRequest('http://localhost/api/user/database', {
        method: 'POST',
        body: JSON.stringify({
          name: 'prod-db',
          type: 'POSTGRES',
          version: '16',
          tier: 'SHARED',
          planName: 'Shared PostgreSQL 16 + PostGIS',
          storageGb: 4,
          ratePerGb: 1, // Attacker tries Rp 1/GB
          billingMode: 'PAYG',
        }),
        headers: { 'content-type': 'application/json' },
      });

      const res = await dbCreatePost(req);
      expect(res.status).toBe(200);
      expect(mockState.createdDbPayload).not.toBeNull();
      // Server must enforce 4 GB * Rp 12.500 = Rp 50.000/month (NOT Rp 4!)
      expect(mockState.createdDbPayload.monthlyPrice).toBe(50000);
      expect(mockState.createdDbPayload.hourlyRate).toBe(Math.ceil(50000 / 720));
      expect(mockState.createdDbPayload.accumulatedCost).toBe(Math.ceil(50000 / 720));
    });

    it('rejects storageGb > 20 GB on POST /api/user/database', async () => {
      const req = new NextRequest('http://localhost/api/user/database', {
        method: 'POST',
        body: JSON.stringify({
          name: 'oversize-db',
          type: 'MYSQL',
          tier: 'SHARED',
          storageGb: 100,
          billingMode: 'PAYG',
        }),
        headers: { 'content-type': 'application/json' },
      });

      const res = await dbCreatePost(req);
      expect(res.status).toBe(400);
      expect(mockState.createdDbPayload).toBeNull();
    });
  });

  describe('2. Managed App Plan Manipulation & Subdomain Sanitization', () => {
    it('rejects partial/substring planCode inputs that bypass loose `contains` lookups', () => {
      const activePlans = [
        {
          name: 'App 1C1G',
          service: 'APP',
          isActive: true,
          price: 25000,
          hourlyPrice: 35,
          limits: JSON.stringify({ planCode: '1C1G', cpuShares: 1, memoryMb: 1024, storageGb: 10 }),
        },
        {
          name: 'App 4C8G',
          service: 'APP',
          isActive: true,
          price: 250000,
          hourlyPrice: 347,
          limits: JSON.stringify({ planCode: '4C8G', cpuShares: 4, memoryMb: 8192, storageGb: 10 }),
        },
      ];

      expect(matchAppPlanFromRecords('1', activePlans)).toBeNull();
      expect(matchAppPlanFromRecords('cpuShares', activePlans)).toBeNull();
      expect(matchAppPlanFromRecords('storageGb', activePlans)).toBeNull();
      expect(matchAppPlanFromRecords('C', activePlans)).toBeNull();

      const valid = matchAppPlanFromRecords('4c8g', activePlans);
      expect(valid?.planCode).toBe('4C8G');
      expect(valid?.monthlyPrice).toBe(250000);
    });

    it('rejects reserved subdomains and malformed RFC-1123 labels', () => {
      expect(sanitizeCustomSubdomain('admin')).toBe('');
      expect(sanitizeCustomSubdomain('api')).toBe('');
      expect(sanitizeCustomSubdomain('traefik')).toBe('');
      expect(sanitizeCustomSubdomain('---')).toBe('');
      expect(sanitizeCustomSubdomain('--ab--')).toBe('');
      expect(sanitizeCustomSubdomain('--My--Agent--01--')).toBe('my-agent-01');
    });
  });

  describe('3. Suspension & Lifecycle Bypass Defenses', () => {
    it('blocks power start/restart/update on SUSPENDED Managed Apps', async () => {
      mockState.appRow = {
        id: 42,
        userId: 10,
        name: 'my-openclaw',
        status: 'SUSPENDED',
      };

      const req = new NextRequest('http://localhost/api/user/apps/42/power', {
        method: 'POST',
        body: JSON.stringify({ action: 'start' }),
        headers: { 'content-type': 'application/json' },
      });

      const res = await appPowerPost(req, { params: Promise.resolve({ id: '42' }) });
      expect(res.status).toBe(403);
      expect(mockState.startAppCalled).toBe(false);
    });

    it('blocks power actions while Managed App is PROVISIONING', async () => {
      mockState.appRow = {
        id: 43,
        userId: 10,
        name: 'my-n8n',
        status: 'PROVISIONING',
      };

      const req = new NextRequest('http://localhost/api/user/apps/43/power', {
        method: 'POST',
        body: JSON.stringify({ action: 'restart' }),
        headers: { 'content-type': 'application/json' },
      });

      const res = await appPowerPost(req, { params: Promise.resolve({ id: '43' }) });
      expect(res.status).toBe(409);
      expect(mockState.startAppCalled).toBe(false);
    });

    it('ensures non-billing/admin suspensions are never auto-unsuspended', () => {
      expect(isBillingSuspension('Suspended by Administrator - Policy Violation')).toBe(false);
      expect(isBillingSuspension('[ABUSE_LOCKED] Resource abuse detected')).toBe(false);
      expect(isBillingSuspension(null)).toBe(false);
      expect(isBillingSuspension('Insufficient balance for Pay as You Go hourly database billing.')).toBe(true);
    });
  });
});
