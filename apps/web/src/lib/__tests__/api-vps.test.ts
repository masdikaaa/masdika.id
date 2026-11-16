import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockPrisma = vi.hoisted(() => {
  const prismaObj: any = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    apiKey: {
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    vpsService: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    reservedIp: {
      findMany: vi.fn(),
    },
    vpsPricing: {
      findMany: vi.fn(),
    },
    systemSetting: {
      findUnique: vi.fn(),
    },
    proxmoxServer: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(async (cb: any) => cb(prismaObj)),
  };
  return prismaObj;
});

const mockProxmoxMethods = vi.hoisted(() => ({
  startVm: vi.fn(),
  stopVm: vi.fn(),
  rebootVm: vi.fn(),
  getVmStatus: vi.fn(),
  getRRDData: vi.fn(),
  getVMSnapshots: vi.fn(),
  createVMSnapshot: vi.fn(),
  rollbackVMSnapshot: vi.fn(),
  deleteVMSnapshot: vi.fn(),
  getFirewallRules: vi.fn(),
  createFirewallRule: vi.fn(),
  updateFirewallRule: vi.fn(),
  deleteFirewallRule: vi.fn(),
  getVmConfig: vi.fn(),
  configVm: vi.fn(),
  resizeVmDisk: vi.fn(),
  getStorages: vi.fn(),
  getBackups: vi.fn(),
  deleteBackup: vi.fn(),
}));

const mockRequireAuth = vi.hoisted(() => vi.fn());
const mockCheckRateLimit = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth-middleware", () => ({
  requireAuth: mockRequireAuth,
}));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));
vi.mock("@/lib/proxmox", () => ({
  ProxmoxClient: vi.fn().mockImplementation(function () {
    return mockProxmoxMethods;
  }),
}));

import { POST as createApiKey } from "@/app/api/user/api-keys/route";
import { GET as listVps } from "@/app/api/v1/vps/route";
import { GET as getVpsDetail } from "@/app/api/v1/vps/[id]/route";
import { POST as startVps } from "@/app/api/v1/vps/[id]/start/route";
import { POST as stopVps } from "@/app/api/v1/vps/[id]/stop/route";
import { POST as rebootVps } from "@/app/api/v1/vps/[id]/reboot/route";
import { GET as getVpsMetrics } from "@/app/api/v1/vps/[id]/metrics/route";
import { GET as listSnapshots, POST as createSnapshot } from "@/app/api/v1/vps/[id]/snapshots/route";
import { GET as listFirewall, POST as createFirewall } from "@/app/api/v1/vps/[id]/firewall/route";
import { PUT as updateFirewall } from "@/app/api/v1/vps/[id]/firewall/[pos]/route";
import { DELETE as deleteBackup } from "@/app/api/v1/vps/[id]/backups/route";
import { GET as listIps } from "@/app/api/v1/vps/ips/route";
import { GET as getPricing } from "@/app/api/v1/vps/pricing/route";
import { POST as upgradeVps } from "@/app/api/v1/vps/[id]/upgrade/route";

function makeReq(url: string, init: { method?: string; headers?: Record<string, string>; body?: any } = {}) {
  return new NextRequest(url, {
    method: init.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}

describe("Free API VPS & Key Management", () => {
  const validKey = "masdika_0123456789abcdef0123456789abcdef";

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue(true);
    mockPrisma.apiKey.update.mockResolvedValue({});
    mockPrisma.proxmoxServer.findFirst.mockResolvedValue({
      id: 1,
      host: "https://pve.example.com:8006",
      tokenId: "root@pam!api",
      tokenSecret: "secret",
      backupStorage: "local",
      isActive: true,
    });
    mockProxmoxMethods.startVm.mockResolvedValue("UPID:start");
    mockProxmoxMethods.stopVm.mockResolvedValue("UPID:stop");
    mockProxmoxMethods.rebootVm.mockResolvedValue("UPID:reboot");
    mockPrisma.vpsService.count.mockResolvedValue(1);
    mockPrisma.vpsService.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });
    mockProxmoxMethods.getStorages.mockResolvedValue([]);
  });

  it("blocks creating an API key when user has no VPS ordered", async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 42, balance: 500000, isSuspended: false } });
    mockPrisma.vpsService.count.mockResolvedValue(0);

    const res = await createApiKey(
      makeReq("http://localhost/api/user/api-keys", {
        method: "POST",
        body: { name: "No VPS Key" },
      })
    );
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toContain("order at least one Cloud VPS");
  });

  it("allows creating a free VPS API key even when user balance is Rp 0", async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 42, balance: 0, isSuspended: false } });
    mockPrisma.apiKey.count.mockResolvedValue(0);
    mockPrisma.apiKey.create.mockImplementation(async ({ data }: any) => ({
      id: 1,
      name: data.name,
      key: data.key,
      service: data.service,
      status: "ACTIVE",
      createdAt: new Date(),
    }));

    const res = await createApiKey(
      makeReq("http://localhost/api/user/api-keys", {
        method: "POST",
        body: { name: "CI Runner" },
      })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.apiKey.service).toBe("VPS");
    expect(json.apiKey.key.startsWith("masdika_")).toBe(true);
  });

  it("enforces maximum 5 API keys per user", async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: 42, balance: 0, isSuspended: false } });
    mockPrisma.apiKey.count.mockResolvedValue(5);

    const res = await createApiKey(
      makeReq("http://localhost/api/user/api-keys", {
        method: "POST",
        body: { name: "Sixth Key" },
      })
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("Maximum limit of 5 API keys reached");
  });

  it("lists VPS instances via Authorization: Bearer and x-api-key headers", async () => {
    mockPrisma.apiKey.findUnique.mockResolvedValue({
      id: 10,
      userId: 42,
      key: validKey,
      service: "VPS",
      status: "ACTIVE",
      user: { id: 42, isSuspended: false },
    });
    mockPrisma.vpsService.findMany.mockResolvedValue([
      {
        id: 7,
        hostname: "web-01.masdika.id",
        status: "RUNNING",
        cpuCores: 2,
        ramGb: 4,
        diskGb: 40,
        osTemplate: "ubuntu-24.04",
        node: "pve1",
        hourlyRate: 28,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        assignedIps: [{ ipAddress: "10.0.0.7", publicIp: "103.1.2.7", isPrimary: true }],
      },
    ]);

    const resBearer = await listVps(
      makeReq("http://localhost/api/v1/vps", {
        headers: { authorization: `Bearer ${validKey}` },
      })
    );
    const jsonBearer = await resBearer.json();
    expect(resBearer.status).toBe(200);
    expect(jsonBearer.success).toBe(true);
    expect(jsonBearer.data).toHaveLength(1);
    expect(jsonBearer.data[0].publicIp).toBe("103.1.2.7");

    const resHeader = await listVps(
      makeReq("http://localhost/api/v1/vps", {
        headers: { "x-api-key": validKey },
      })
    );
    expect(resHeader.status).toBe(200);
  });

  it("returns VPS detail for owner and 404 for non-owner", async () => {
    mockPrisma.apiKey.findUnique.mockResolvedValue({
      id: 10,
      userId: 42,
      key: validKey,
      service: "VPS",
      status: "ACTIVE",
      user: { id: 42, isSuspended: false },
    });
    mockPrisma.vpsService.findFirst.mockResolvedValueOnce({
      id: 7,
      hostname: "web-01.masdika.id",
      status: "RUNNING",
      cpuCores: 2,
      ramGb: 4,
      diskGb: 40,
      osTemplate: "ubuntu-24.04",
      node: "pve1",
      hourlyRate: 28,
      createdAt: new Date(),
      assignedIps: [],
    });

    const okRes = await getVpsDetail(
      makeReq("http://localhost/api/v1/vps/7", {
        headers: { authorization: `Bearer ${validKey}` },
      }),
      { params: Promise.resolve({ id: "7" }) }
    );
    expect(okRes.status).toBe(200);

    mockPrisma.vpsService.findFirst.mockResolvedValueOnce(null);
    const notFoundRes = await getVpsDetail(
      makeReq("http://localhost/api/v1/vps/999", {
        headers: { authorization: `Bearer ${validKey}` },
      }),
      { params: Promise.resolve({ id: "999" }) }
    );
    expect(notFoundRes.status).toBe(404);
  });

  it("executes start, stop, and reboot on Proxmox and updates DB status", async () => {
    mockPrisma.apiKey.findUnique.mockResolvedValue({
      id: 10,
      userId: 42,
      key: validKey,
      service: "VPS",
      status: "ACTIVE",
      user: { id: 42, isSuspended: false },
    });

    mockPrisma.vpsService.findFirst.mockResolvedValueOnce({
      id: 7,
      userId: 42,
      hostname: "web-01",
      node: "pve1",
      vmid: 107,
      status: "STOPPED",
    });
    const startRes = await startVps(
      makeReq("http://localhost/api/v1/vps/7/start", {
        method: "POST",
        headers: { authorization: `Bearer ${validKey}` },
      }),
      { params: Promise.resolve({ id: "7" }) }
    );
    const startJson = await startRes.json();
    expect(startRes.status).toBe(200);
    expect(mockProxmoxMethods.startVm).toHaveBeenCalledWith("pve1", 107);
    expect(startJson.data.status).toBe("RUNNING");
    expect(mockPrisma.vpsService.updateMany).toHaveBeenCalledWith({
      where: { id: 7, status: { in: ["RUNNING", "STOPPED"] } },
      data: { status: "RUNNING" },
    });

    mockPrisma.vpsService.findFirst.mockResolvedValueOnce({
      id: 7,
      userId: 42,
      hostname: "web-01",
      node: "pve1",
      vmid: 107,
      status: "RUNNING",
    });
    const stopRes = await stopVps(
      makeReq("http://localhost/api/v1/vps/7/stop", {
        method: "POST",
        headers: { "x-api-key": validKey },
      }),
      { params: Promise.resolve({ id: "7" }) }
    );
    const stopJson = await stopRes.json();
    expect(stopRes.status).toBe(200);
    expect(mockProxmoxMethods.stopVm).toHaveBeenCalledWith("pve1", 107);
    expect(stopJson.data.status).toBe("STOPPED");

    mockPrisma.vpsService.findFirst.mockResolvedValueOnce({
      id: 7,
      userId: 42,
      hostname: "web-01",
      node: "pve1",
      vmid: 107,
      status: "RUNNING",
    });
    const rebootRes = await rebootVps(
      makeReq("http://localhost/api/v1/vps/7/reboot", {
        method: "POST",
        headers: { authorization: `Bearer ${validKey}` },
      }),
      { params: Promise.resolve({ id: "7" }) }
    );
    const rebootJson = await rebootRes.json();
    expect(rebootRes.status).toBe(200);
    expect(mockProxmoxMethods.rebootVm).toHaveBeenCalledWith("pve1", 107);
    expect(rebootJson.data.action).toBe("reboot");
    expect(rebootJson.data.status).toBe("RUNNING");
  });

  it("blocks unauthenticated (401), revoked key (403), and SUSPENDED VPS (403)", async () => {
    const unauthRes = await startVps(
      makeReq("http://localhost/api/v1/vps/7/start", { method: "POST" }),
      { params: Promise.resolve({ id: "7" }) }
    );
    expect(unauthRes.status).toBe(401);

    mockPrisma.apiKey.findUnique.mockResolvedValueOnce({
      id: 10,
      userId: 42,
      key: validKey,
      service: "VPS",
      status: "REVOKED",
      user: { id: 42, isSuspended: false },
    });
    const revokedRes = await stopVps(
      makeReq("http://localhost/api/v1/vps/7/stop", {
        method: "POST",
        headers: { authorization: `Bearer ${validKey}` },
      }),
      { params: Promise.resolve({ id: "7" }) }
    );
    expect(revokedRes.status).toBe(403);

    mockPrisma.apiKey.findUnique.mockResolvedValueOnce({
      id: 10,
      userId: 42,
      key: validKey,
      service: "VPS",
      status: "ACTIVE",
      user: { id: 42, isSuspended: false },
    });
    mockPrisma.vpsService.findFirst.mockResolvedValueOnce({
      id: 7,
      userId: 42,
      hostname: "web-01",
      node: "pve1",
      vmid: 107,
      status: "SUSPENDED",
    });
    const suspendedRes = await rebootVps(
      makeReq("http://localhost/api/v1/vps/7/reboot", {
        method: "POST",
        headers: { authorization: `Bearer ${validKey}` },
      }),
      { params: Promise.resolve({ id: "7" }) }
    );
    expect(suspendedRes.status).toBe(403);
    expect(mockProxmoxMethods.rebootVm).not.toHaveBeenCalled();
  });

  it("supports metrics, snapshots, firewall, Elastic IPs, pricing, and hardware upgrade", async () => {
    mockPrisma.apiKey.findUnique.mockResolvedValue({
      id: 10,
      userId: 42,
      key: validKey,
      service: "VPS",
      status: "ACTIVE",
      user: { id: 42, isSuspended: false },
    });
    mockPrisma.vpsService.findFirst.mockResolvedValue({
      id: 7,
      userId: 42,
      hostname: "web-01",
      node: "pve1",
      vmid: 107,
      status: "RUNNING",
      cpuCores: 1,
      ramGb: 1,
      diskGb: 20,
      diskType: "SSD",
      storageId: "local-lvm",
      bandwidthMbps: 100,
      hourlyRate: 28,
      stoppedRate: 10,
    });

    mockProxmoxMethods.getVmStatus.mockResolvedValue({ status: "running", cpu: 0.12, mem: 536870912, maxmem: 1073741824, uptime: 1000 });
    mockProxmoxMethods.getRRDData.mockResolvedValue([{ time: 1794784000, cpu: 0.1, mem: 536870912, maxmem: 1073741824 }]);
    const metricsRes = await getVpsMetrics(
      makeReq("http://localhost/api/v1/vps/7/metrics?timeframe=hour", {
        headers: { authorization: `Bearer ${validKey}` },
      }),
      { params: Promise.resolve({ id: "7" }) }
    );
    expect(metricsRes.status).toBe(200);
    const metricsJson = await metricsRes.json();
    expect(metricsJson.data.live.cpuPercent).toBe(12);

    mockProxmoxMethods.getVMSnapshots.mockResolvedValue([{ name: "snap1" }, { name: "current" }]);
    const snapListRes = await listSnapshots(
      makeReq("http://localhost/api/v1/vps/7/snapshots", {
        headers: { authorization: `Bearer ${validKey}` },
      }),
      { params: Promise.resolve({ id: "7" }) }
    );
    expect((await snapListRes.json()).data).toEqual([{ name: "snap1" }]);

    mockProxmoxMethods.createVMSnapshot.mockResolvedValue("UPID:snap");
    const snapCreateRes = await createSnapshot(
      makeReq("http://localhost/api/v1/vps/7/snapshots", {
        method: "POST",
        headers: { authorization: `Bearer ${validKey}` },
        body: { snapname: "pre_upgrade" },
      }),
      { params: Promise.resolve({ id: "7" }) }
    );
    expect(snapCreateRes.status).toBe(201);

    mockProxmoxMethods.getFirewallRules.mockResolvedValue([{ pos: 0, action: "ACCEPT", type: "in", dport: "443" }]);
    const fwListRes = await listFirewall(
      makeReq("http://localhost/api/v1/vps/7/firewall", {
        headers: { authorization: `Bearer ${validKey}` },
      }),
      { params: Promise.resolve({ id: "7" }) }
    );
    expect(fwListRes.status).toBe(200);

    mockProxmoxMethods.createFirewallRule.mockResolvedValue(null);
    const fwCreateRes = await createFirewall(
      makeReq("http://localhost/api/v1/vps/7/firewall", {
        method: "POST",
        headers: { authorization: `Bearer ${validKey}` },
        body: { type: "in", action: "ACCEPT", proto: "tcp", dport: "443" },
      }),
      { params: Promise.resolve({ id: "7" }) }
    );
    expect(fwCreateRes.status).toBe(201);

    mockPrisma.reservedIp.findMany.mockResolvedValue([
      { id: 9, ipAddress: "103.1.2.3", publicIp: "103.1.2.3", hourlyRate: 20, isAttached: true, ipPool: { version: 4, cidr: "24", gateway: "103.1.2.1" }, vps: { id: 7, hostname: "web-01", status: "RUNNING" }, createdAt: new Date() },
    ]);
    const ipsRes = await listIps(
      makeReq("http://localhost/api/v1/vps/ips", {
        headers: { authorization: `Bearer ${validKey}` },
      })
    );
    expect((await ipsRes.json()).data).toHaveLength(1);

    mockPrisma.vpsPricing.findMany.mockResolvedValue([
      { key: "cpu", pricePerHour: 14 },
      { key: "ram", pricePerHour: 14 },
      { key: "disk_ssd", pricePerHour: 1 },
    ]);
    mockPrisma.systemSetting.findUnique.mockResolvedValue(null);
    const pricingRes = await getPricing(
      makeReq("http://localhost/api/v1/vps/pricing", {
        headers: { authorization: `Bearer ${validKey}` },
      })
    );
    expect((await pricingRes.json()).data.hourlyRates.cpu).toBe(14);

    mockPrisma.user.findUnique.mockResolvedValue({ balance: 50000 });
    mockProxmoxMethods.getVmConfig.mockResolvedValue({ scsi0: "local-lvm:vm-107-disk-0", net0: "virtio=AA:BB:CC:DD:EE:FF,bridge=vmbr0" });
    mockProxmoxMethods.resizeVmDisk.mockResolvedValue(null);
    mockProxmoxMethods.configVm.mockResolvedValue(null);
    mockPrisma.vpsService.update.mockResolvedValue({
      id: 7,
      hostname: "web-01",
      cpuCores: 2,
      ramGb: 4,
      diskGb: 40,
      bandwidthMbps: 100,
      hourlyRate: 104,
      status: "RUNNING",
    });

    const upgradeRes = await upgradeVps(
      makeReq("http://localhost/api/v1/vps/7/upgrade", {
        method: "POST",
        headers: { authorization: `Bearer ${validKey}` },
        body: { cpuCores: 2, ramGb: 4, diskGb: 40 },
      }),
      { params: Promise.resolve({ id: "7" }) }
    );
    expect(upgradeRes.status).toBe(200);
    expect(mockProxmoxMethods.resizeVmDisk).toHaveBeenCalledWith("pve1", 107, "scsi0", "+20G");
    expect(mockProxmoxMethods.configVm).toHaveBeenCalledWith("pve1", 107, { cores: 2, memory: 4096 });
  });

  it("blocks upgrade manipulation: insufficient 1-month commitment balance, concurrent lock, and invalid inputs", async () => {
    mockPrisma.apiKey.findUnique.mockResolvedValue({
      id: 10,
      userId: 42,
      service: "VPS",
      status: "ACTIVE",
      user: { id: 42, isSuspended: false },
    });
    mockPrisma.vpsService.findFirst.mockResolvedValue({
      id: 7,
      userId: 42,
      vmid: 107,
      node: "pve1",
      hostname: "web-01",
      status: "RUNNING",
      cpuCores: 1,
      ramGb: 1,
      diskGb: 20,
      diskType: "SSD",
      storageId: "local-lvm",
      hourlyRate: 50,
      bandwidthMbps: 100,
      isReseller: false,
      createdAt: new Date(),
    });
    mockPrisma.vpsPricing.findMany.mockResolvedValue([]);

    // Invalid fractional CPU
    const badCpuRes = await upgradeVps(
      makeReq("http://localhost/api/v1/vps/7/upgrade", {
        method: "POST",
        headers: { authorization: `Bearer ${validKey}` },
        body: { cpuCores: 2.5 },
      }),
      { params: Promise.resolve({ id: "7" }) }
    );
    expect(badCpuRes.status).toBe(400);

    // Insufficient 1-month commitment balance
    mockPrisma.user.updateMany.mockResolvedValueOnce({ count: 0 });
    const lowBalRes = await upgradeVps(
      makeReq("http://localhost/api/v1/vps/7/upgrade", {
        method: "POST",
        headers: { authorization: `Bearer ${validKey}` },
        body: { cpuCores: 2 },
      }),
      { params: Promise.resolve({ id: "7" }) }
    );
    expect(lowBalRes.status).toBe(402);

    // Concurrent lock conflict
    mockPrisma.vpsService.updateMany.mockResolvedValueOnce({ count: 0 });
    const lockRes = await upgradeVps(
      makeReq("http://localhost/api/v1/vps/7/upgrade", {
        method: "POST",
        headers: { authorization: `Bearer ${validKey}` },
        body: { cpuCores: 2 },
      }),
      { params: Promise.resolve({ id: "7" }) }
    );
    expect(lockRes.status).toBe(409);

    // Invalid firewall PUT payload
    const badFwRes = await updateFirewall(
      makeReq("http://localhost/api/v1/vps/7/firewall/0", {
        method: "PUT",
        headers: { authorization: `Bearer ${validKey}` },
        body: { action: "HACK", source: "0.0.0.0/0\nrm -rf" },
      }),
      { params: Promise.resolve({ id: "7", pos: "0" }) }
    );
    expect(badFwRes.status).toBe(400);

    // Backup DELETE verifies actual Proxmox backup list
    mockProxmoxMethods.getBackups.mockResolvedValue([
      { volid: "local:backup/vzdump-qemu-107-2026_11_16.vma.zst", ctime: Math.floor(Date.now() / 1000) },
    ]);
    const spoofedDelRes = await deleteBackup(
      makeReq("http://localhost/api/v1/vps/7/backups?volume=local:backup/vzdump-qemu-999-107-fake.vma.zst", {
        method: "DELETE",
        headers: { authorization: `Bearer ${validKey}` },
      }),
      { params: Promise.resolve({ id: "7" }) }
    );
    expect(spoofedDelRes.status).toBe(404);
    expect(mockProxmoxMethods.deleteBackup).not.toHaveBeenCalled();
  });
});
