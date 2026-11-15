import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockPrisma = vi.hoisted(() => {
  const prismaObj: any = {
    user: {
      findUnique: vi.fn(),
    },
    apiKey: {
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    vpsService: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
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
      isActive: true,
    });
    mockProxmoxMethods.startVm.mockResolvedValue("UPID:start");
    mockProxmoxMethods.stopVm.mockResolvedValue("UPID:stop");
    mockProxmoxMethods.rebootVm.mockResolvedValue("UPID:reboot");
    mockPrisma.vpsService.updateMany.mockResolvedValue({ count: 1 });
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
});
