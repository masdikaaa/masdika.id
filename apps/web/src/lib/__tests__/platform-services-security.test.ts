import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockState = vi.hoisted(() => ({
  authUser: {
    id: 42,
    role: "USER",
    email: "user@example.com",
    name: "Test User",
    balance: 1_000_000,
    isSuspended: false,
    referredById: null,
  } as any,
  lockedBalance: 1_000_000,
  forUpdateCalls: 0,
  txCommitmentCalls: 0,
  enqueuedJobs: [] as any[],
  createdVps: null as any,
  createdSub: null as any,
  vpsRow: null as any,
  planRow: null as any,
  cdnSubRow: null as any,
  invoiceRow: null as any,
  topupCredited: 0,
  validSignature: true,
}));

vi.mock("@/lib/auth-middleware", () => ({
  requireAuth: vi.fn(async () => ({
    userId: mockState.authUser.id,
    user: mockState.authUser,
  })),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(async () => true),
}));

vi.mock("@/lib/encryption", () => ({
  encryptDeterministic: vi.fn((val: string) => `enc:${val}`),
  decryptDeterministic: vi.fn((val: string) => (val?.startsWith("enc:") ? val.slice(4) : val)),
}));

vi.mock("@/lib/vps-bandwidth", () => ({
  BASE_BANDWIDTH_MBPS: 100,
  getBandwidthOptions: vi.fn(async () => [100, 500, 1000]),
  bandwidthHourlyCost: vi.fn(() => 0),
}));

vi.mock("@/lib/job-queue", () => ({
  JobQueueService: {
    enqueue: vi.fn(async (type: string, payload: any) => {
      mockState.enqueuedJobs.push({ type, payload });
      return { id: 1 };
    }),
  },
}));

vi.mock("@/lib/vps-apps", () => ({
  getAppById: vi.fn(() => null),
  matchTemplateForApp: vi.fn(() => null),
  sanitizeAppConfig: vi.fn(() => null),
}));

vi.mock("@/lib/subscription", () => ({
  getActiveSubscription: vi.fn(async () => mockState.cdnSubRow),
  getSuspendedSubscription: vi.fn(async () => null),
}));

vi.mock("@/lib/rustfs", () => ({
  uploadFileToRustFS: vi.fn(async () => ({ key: "mock-key" })),
  deleteFromRustFS: vi.fn(async () => {}),
}));

vi.mock("@/lib/sync-elasticsearch", () => ({
  syncMediaToElastic: vi.fn(async () => {}),
  syncInvoiceToElastic: vi.fn(async () => {}),
}));

vi.mock("@/lib/email", () => ({
  sendCustomerInvoiceEmail: vi.fn(async () => {}),
  sendCustomerPaymentSuccessEmail: vi.fn(async () => {}),
  sendAdminNewOrderEmail: vi.fn(async () => {}),
  sendReactivatedEmail: vi.fn(async () => {}),
  sendAdminServiceReactivatedEmail: vi.fn(async () => {}),
}));

vi.mock("@/lib/duitku", () => ({
  validateCallbackSignature: vi.fn(() => mockState.validSignature),
}));

vi.mock("@/lib/auto-unsuspend", () => ({
  attemptAutoUnsuspendAllForUser: vi.fn(async () => {}),
}));

vi.mock("@/lib/low-balance-alert", () => ({
  clearLowBalanceAlert: vi.fn(async () => {}),
}));

vi.mock("@/lib/proxmox", () => ({
  ProxmoxClient: class MockProxmoxClient {
    async getNodes() {
      return [{ node: "proxmox" }];
    }
    async getNodeStatus() {
      return {
        memory: { total: 64 * 1024 ** 3, used: 8 * 1024 ** 3 },
        cpu: 0.1,
        cpuinfo: { cpus: 16 },
      };
    }
    async getStorages() {
      return [{ storage: "local-lvm", total: 1000 * 1024 ** 3, used: 100 * 1024 ** 3 }];
    }
    async startVm() {
      return { data: "UPID:ok" };
    }
    async getVMSnapshots() {
      return { data: [{ name: "current" }] };
    }
    async createVMSnapshot() {
      return { data: "UPID:snap" };
    }
  },
}));

vi.mock("@/lib/billing-commitment", async () => {
  return {
    assertSufficientCommitmentBalance: vi.fn(async ({ userBalance, newServiceMonthly, tx }: any) => {
      if (tx && tx !== undefined) {
        mockState.txCommitmentCalls += 1;
      }
      const requiredBalance = newServiceMonthly;
      if (userBalance < requiredBalance) {
        throw new Error(
          `Insufficient account balance for accumulated services commitment. Total required balance: Rp ${requiredBalance.toLocaleString("id-ID")}, but your current balance is Rp ${userBalance.toLocaleString("id-ID")}. Please top up your balance to deploy.`
        );
      }
      return { requiredBalance, currentCommitment: 0 };
    }),
  };
});

vi.mock("@/lib/prisma", () => {
  const tx = {
    $executeRaw: vi.fn(async () => {
      mockState.forUpdateCalls += 1;
      return 1;
    }),
    user: {
      findUnique: vi.fn(async () => ({ id: mockState.authUser.id, balance: mockState.lockedBalance })),
      updateMany: vi.fn(async ({ where }: any) => {
        if (where?.balance?.gte !== undefined && mockState.lockedBalance < where.balance.gte) {
          return { count: 0 };
        }
        return { count: 1 };
      }),
      update: vi.fn(async ({ data }: any) => {
        if (data?.balance?.increment) {
          mockState.topupCredited += data.balance.increment;
        }
        return { id: mockState.authUser.id, balance: mockState.lockedBalance + mockState.topupCredited };
      }),
    },
    kubernetesCluster: {
      create: vi.fn(async ({ data }: any) => ({ id: 77, ...data })),
    },
    vpsService: {
      create: vi.fn(async ({ data }: any) => {
        mockState.createdVps = { id: 301, ...data };
        return mockState.createdVps;
      }),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    subscription: {
      create: vi.fn(async ({ data }: any) => {
        mockState.createdSub = { id: 401, ...data };
        return mockState.createdSub;
      }),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    invoice: {
      create: vi.fn(async ({ data }: any) => ({ id: 501, ...data })),
      updateMany: vi.fn(async () => {
        if (!mockState.invoiceRow || mockState.invoiceRow.status !== "PENDING") {
          return { count: 0 };
        }
        mockState.invoiceRow.status = "PAID";
        return { count: 1 };
      }),
      findUnique: vi.fn(async () => mockState.invoiceRow),
    },
  };

  return {
    prisma: {
      $transaction: vi.fn(async (cb: any) => cb(tx)),
      setting: {
        findUnique: vi.fn(async () => null),
        findMany: vi.fn(async () => []),
      },
      user: {
        findUnique: vi.fn(async () => mockState.authUser),
      },
      vpsTemplate: {
        findMany: vi.fn(async () => [{ id: 1, name: "debian-12", isActive: true }]),
        findUnique: vi.fn(async () => ({ id: 1, name: "debian-12", isActive: true })),
      },
      proxmoxServer: {
        findFirst: vi.fn(async () => ({
          id: 1,
          isActive: true,
          host: "https://pve.local:8006",
          tokenId: "root@pam!api",
          tokenSecret: "enc:secret",
          networkBridge: "vmbr0",
          mainDiskStorage: "local-lvm",
          mainDiskStorageSsd: "local-lvm",
        })),
      },
      vpsPricing: {
        findMany: vi.fn(async () => [
          { key: "vcpu", pricePerHour: 15 },
          { key: "ram", pricePerHour: 15 },
          { key: "disk", pricePerHour: 2 },
          { key: "ipv4", pricePerHour: 10 },
        ]),
      },
      vpcNetwork: {
        findUnique: vi.fn(async () => ({
          id: 5,
          userId: 42,
          cidr: "10.10.0.0/24",
          gateway: "10.10.0.1",
          vpsServices: [],
        })),
      },
      vpsService: {
        findUnique: vi.fn(async () => mockState.vpsRow),
        findFirst: vi.fn(async () => mockState.vpsRow),
      },
      plan: {
        findUnique: vi.fn(async () => mockState.planRow),
      },
      paymentMethod: {
        findFirst: vi.fn(async () => ({ name: "QRIS", fee: 0 })),
      },
      invoice: {
        findUnique: vi.fn(async () => mockState.invoiceRow),
      },
      databaseService: {
        updateMany: vi.fn(async () => ({ count: 0 })),
      },
      appService: {
        updateMany: vi.fn(async () => ({ count: 0 })),
      },
    },
  };
});

import { POST as orderVpsPost } from "@/app/api/user/vps/order/route";
import { POST as checkoutPost } from "@/app/api/user/checkout/route";
import { POST as vpsActionPost } from "@/app/api/user/vps/action/route";
import { POST as createSnapshotPost } from "@/app/api/user/vps/[id]/snapshots/route";
import { POST as cdnUploadPost } from "@/app/api/user/cdn/upload/route";
import { POST as paymentCallbackPost } from "@/app/api/payment/callback/route";
import { sanitizeCdnFolderPath } from "@/lib/upload-security";

describe("Platform Services Security & Provisioning Integrity", () => {
  beforeEach(() => {
    mockState.authUser = {
      id: 42,
      role: "USER",
      email: "user@example.com",
      name: "Test User",
      balance: 1_000_000,
      isSuspended: false,
      referredById: null,
    };
    mockState.lockedBalance = 1_000_000;
    mockState.forUpdateCalls = 0;
    mockState.txCommitmentCalls = 0;
    mockState.enqueuedJobs = [];
    mockState.createdVps = null;
    mockState.createdSub = null;
    mockState.vpsRow = null;
    mockState.cdnSubRow = null;
    mockState.invoiceRow = null;
    mockState.topupCredited = 0;
    mockState.validSignature = true;
    mockState.planRow = {
      id: 2,
      name: "CDN Pro",
      service: "CDN",
      isActive: true,
      price: 50000,
      hourlyPrice: 70,
    };
    process.env.DUITKU_MERCHANT_CODE = "DS99999";
  });

  it("provisions Cloud VPS normally and enforces commitment atomically with FOR UPDATE lock", async () => {
    const req = new NextRequest("http://localhost/api/user/vps/order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        hostname: "web1.masdika.id",
        rootPassword: "StrongPassword123!",
        templateId: 1,
        cpuCores: 2,
        ramGb: 2,
        diskGb: 20,
        vpcId: 5,
        ipv4Count: 1,
      }),
    });

    const res = await orderVpsPost(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.vpsId).toBe(301);
    expect(mockState.forUpdateCalls).toBe(1);
    expect(mockState.txCommitmentCalls).toBe(1);
    expect(mockState.enqueuedJobs).toHaveLength(1);
    expect(mockState.enqueuedJobs[0].type).toBe("PROVISION_VPS");
  });

  it("blocks Cloud VPS parallel TOCTOU bypass when locked balance inside transaction is insufficient", async () => {
    // Stale outer user shows 1,000,000, but another concurrent TX depleted lockedBalance to 1,000
    mockState.authUser.balance = 1_000_000;
    mockState.lockedBalance = 1_000;

    const req = new NextRequest("http://localhost/api/user/vps/order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        hostname: "race1.masdika.id",
        rootPassword: "StrongPassword123!",
        templateId: 1,
        cpuCores: 2,
        ramGb: 2,
        diskGb: 20,
        vpcId: 5,
        ipv4Count: 1,
      }),
    });

    const res = await orderVpsPost(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("Insufficient account balance");
    expect(mockState.forUpdateCalls).toBe(1);
    expect(mockState.createdVps).toBeNull();
    expect(mockState.enqueuedJobs).toHaveLength(0);
  });

  it("completes checkout normally and enforces locked commitment inside transaction", async () => {
    const req = new NextRequest("http://localhost/api/user/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        planId: 2,
        paymentMethodCode: "BALANCE",
      }),
    });

    const res = await checkoutPost(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockState.forUpdateCalls).toBe(1);
    expect(mockState.txCommitmentCalls).toBe(1);
    expect(mockState.createdSub).not.toBeNull();
  });

  it("blocks checkout race condition cleanly with 400 when locked balance is insufficient", async () => {
    mockState.authUser.balance = 1_000_000;
    mockState.lockedBalance = 500;

    const req = new NextRequest("http://localhost/api/user/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        planId: 2,
        paymentMethodCode: "BALANCE",
      }),
    });

    const res = await checkoutPost(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("Insufficient account balance");
    expect(mockState.createdSub).toBeNull();
  });

  it("blocks VPS power actions on TERMINATED and PROVISIONING instances", async () => {
    for (const status of ["TERMINATED", "TERMINATING", "PROVISIONING", "PENDING", "SUSPENDED"]) {
      mockState.vpsRow = { id: 11, userId: 42, vmid: 201, node: "proxmox", status };
      const req = new NextRequest("http://localhost/api/user/vps/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ vpsId: 11, action: "start" }),
      });

      const res = await vpsActionPost(req);
      expect(res.status).toBe(403);
    }
  });

  it("blocks non-admin snapshot creation on SUSPENDED or TERMINATED VPS", async () => {
    mockState.vpsRow = { id: 12, userId: 42, vmid: 202, node: "proxmox", status: "SUSPENDED" };

    const req = new NextRequest("http://localhost/api/user/vps/12/snapshots", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ snapname: "snap1", description: "test" }),
    });

    const res = await createSnapshotPost(req, { params: Promise.resolve({ id: "12" }) });
    expect(res.status).toBe(403);
  });

  it("sanitizes CDN folder paths and rejects traversal / malformed headers on cdn/upload", async () => {
    expect(sanitizeCdnFolderPath("/videos//2026/")).toBe("/videos/2026");
    expect(sanitizeCdnFolderPath("/docs/../etc")).toBeNull();
    expect(sanitizeCdnFolderPath("a\\b")).toBeNull();

    mockState.cdnSubRow = { id: 9, plan: { limits: JSON.stringify({ storageGB: 50 }) } };
    const traversalB64 = Buffer.from(encodeURIComponent("/docs/../secret")).toString("base64");
    const nameB64 = Buffer.from(encodeURIComponent("photo.jpg")).toString("base64");

    const req = new NextRequest("http://localhost/api/user/cdn/upload", {
      method: "POST",
      headers: {
        "x-upload-token": "11111111-1111-4111-8111-111111111111",
        "x-upload-original-name": nameB64,
        "x-upload-folder-path": traversalB64,
      },
    });

    const res = await cdnUploadPost(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid folder path");
  });

  it("processes valid Duitku TOP_UP callback and blocks tampered signature or amount mismatch", async () => {
    mockState.invoiceRow = {
      id: 88,
      invoiceNumber: "INV-TOPUP-1",
      merchantOrderId: "INV-TOPUP-1",
      type: "TOP_UP",
      status: "PENDING",
      amount: 100000,
      subtotal: 100000,
      taxAmount: 0,
      userId: 42,
      paymentMethod: "QRIS",
      user: {
        id: 42,
        name: "enc:Test User",
        email: "enc:user@example.com",
        balance: 0,
      },
    };

    // 1. Tampered amount rejected
    const badAmountReq = new NextRequest("http://localhost/api/payment/callback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        merchantCode: "DS99999",
        amount: "999999",
        merchantOrderId: "INV-TOPUP-1",
        signature: "0".repeat(32),
        resultCode: "00",
      }),
    });
    const badAmountRes = await paymentCallbackPost(badAmountReq);
    expect(badAmountRes.status).toBe(400);
    expect(mockState.topupCredited).toBe(0);

    // 2. Invalid signature rejected
    mockState.validSignature = false;
    const badSigReq = new NextRequest("http://localhost/api/payment/callback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        merchantCode: "DS99999",
        amount: "100000",
        merchantOrderId: "INV-TOPUP-1",
        signature: "f".repeat(32),
        resultCode: "00",
      }),
    });
    const badSigRes = await paymentCallbackPost(badSigReq);
    expect(badSigRes.status).toBe(401);

    // 3. Valid callback succeeds and credits topup atomically
    mockState.validSignature = true;
    const validReq = new NextRequest("http://localhost/api/payment/callback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        merchantCode: "DS99999",
        amount: "100000",
        merchantOrderId: "INV-TOPUP-1",
        signature: "a".repeat(32),
        resultCode: "00",
        reference: "DuitkuRef123",
      }),
    });
    const validRes = await paymentCallbackPost(validReq);
    expect(validRes.status).toBe(200);
    expect(mockState.topupCredited).toBe(100000);
  });
});
