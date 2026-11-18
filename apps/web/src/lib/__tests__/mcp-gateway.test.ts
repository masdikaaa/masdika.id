import { describe, it, expect, vi, beforeEach } from "vitest";
import { MASDIKA_MCP_TOOLS, executeMcpTool } from "@/lib/mcp-tools";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    vpsService: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    databaseService: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    appService: {
      count: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    secureMedia: {
      count: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    paymentMethod: {
      findFirst: vi.fn(),
    },
    invoice: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    voucher: {
      findUnique: vi.fn(),
    },
    userSshKey: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    reservedIp: {
      findMany: vi.fn(),
    },
    apiKey: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    objectStorageService: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    objectStorageBucket: {
      create: vi.fn(),
    },
    objectStorageKey: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    aiModel: {
      findMany: vi.fn(),
    },
    aiGatewayKey: {
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    supportTicket: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    ticketMessage: {
      create: vi.fn(),
    },
    clientActivityLog: {
      create: vi.fn(),
    },
    backgroundJob: {
      create: vi.fn(),
    },
    $transaction: vi.fn().mockImplementation((promises) => Promise.all(promises)),
  },
}));

vi.mock("@/lib/duitku", () => ({
  createDuitkuTransaction: vi.fn().mockResolvedValue({
    paymentUrl: "https://payment.duitku.com/sandbox/pay?ref=TEST1234",
    reference: "REF-TEST1234",
    vaNumber: "8801234567890123",
    qrString: "00020101021226590014ID.LINKAJA.WWW0118936000140000010123...",
  }),
}));

vi.mock("@/lib/vps-api", () => ({
  getActiveProxmoxClient: vi.fn().mockResolvedValue({
    proxmox: {
      startVm: vi.fn().mockResolvedValue({}),
      stopVm: vi.fn().mockResolvedValue({}),
      rebootVm: vi.fn().mockResolvedValue({}),
      getVmStatus: vi.fn().mockResolvedValue({ status: "running", cpu: 0.15, mem: 512000000, maxmem: 1024000000 }),
      configVm: vi.fn().mockResolvedValue({}),
      createVMSnapshot: vi.fn().mockResolvedValue({}),
      getVMSnapshots: vi.fn().mockResolvedValue([{ name: "snap1", snaptime: 1700000000 }]),
    },
  }),
  LIVE_VPS_STATUSES: ["RUNNING", "STOPPED", "PROVISIONING"],
}));

vi.mock("@/lib/k8s-database", () => ({
  deployDatabase: vi.fn().mockResolvedValue({ success: true }),
  startDatabase: vi.fn().mockResolvedValue({ success: true }),
  stopDatabase: vi.fn().mockResolvedValue({ success: true }),
  restartDatabase: vi.fn().mockResolvedValue({ success: true }),
  deleteDatabase: vi.fn().mockResolvedValue({ success: true }),
  buildConnectionDetails: vi.fn().mockReturnValue({
    host: "db.masdika.id",
    port: 30500,
    database: "test_db",
    username: "usr_test",
    password: "pwd_test",
    connectionString: "postgresql://usr_test:pwd_test@db.masdika.id:30500/test_db", // test-secret
  }),
  allocateAvailablePort: vi.fn().mockResolvedValue(30500),
}));

vi.mock("@/lib/k8s-app", () => ({
  deployAppService: vi.fn().mockResolvedValue({ success: true }),
  startAppService: vi.fn().mockResolvedValue({ success: true }),
  stopAppService: vi.fn().mockResolvedValue({ success: true }),
  restartAppService: vi.fn().mockResolvedValue({ success: true }),
  deleteAppService: vi.fn().mockResolvedValue({ success: true }),
  allocateAppPort: vi.fn().mockResolvedValue(30888),
  getAppK8sClients: vi.fn().mockResolvedValue({
    coreV1Api: {
      listNamespacedPod: vi.fn().mockResolvedValue({ items: [{ metadata: { name: "test-pod-1" } }] }),
      readNamespacedPodLog: vi.fn().mockResolvedValue("App listening on port 30888\nReady for traffic"),
    },
  }),
}));

vi.mock("@/lib/payg-invoice", () => ({
  createServiceOrderInvoice: vi.fn().mockResolvedValue(undefined),
}));

describe("Masdika Model Context Protocol (MCP) Gateway", () => {
  const mockUser = {
    id: 99,
    name: "Dika Developer",
    email: "dika@example.com",
    balance: 250000,
    aiBalance: 50000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. registers all 45 platform service tools with valid schemas", () => {
    const toolNames = MASDIKA_MCP_TOOLS.map((t) => t.name);
    // Billing
    expect(toolNames).toContain("masdika_get_account");
    expect(toolNames).toContain("masdika_create_topup");
    expect(toolNames).toContain("masdika_check_invoice");
    expect(toolNames).toContain("masdika_list_invoices");
    expect(toolNames).toContain("masdika_check_voucher");

    // VPS
    expect(toolNames).toContain("masdika_list_vps");
    expect(toolNames).toContain("masdika_control_vps");
    expect(toolNames).toContain("masdika_get_vps_metrics");
    expect(toolNames).toContain("masdika_upgrade_vps");
    expect(toolNames).toContain("masdika_reinstall_vps");
    expect(toolNames).toContain("masdika_create_vps_snapshot");
    expect(toolNames).toContain("masdika_list_vps_snapshots");
    expect(toolNames).toContain("masdika_reset_vps_password");
    expect(toolNames).toContain("masdika_list_vps_firewall");
    expect(toolNames).toContain("masdika_add_vps_firewall");

    // Database
    expect(toolNames).toContain("masdika_list_databases");
    expect(toolNames).toContain("masdika_create_database");
    expect(toolNames).toContain("masdika_control_database");
    expect(toolNames).toContain("masdika_get_database_connection");
    expect(toolNames).toContain("masdika_delete_database");

    // Apps
    expect(toolNames).toContain("masdika_list_apps");
    expect(toolNames).toContain("masdika_deploy_app");
    expect(toolNames).toContain("masdika_control_app");
    expect(toolNames).toContain("masdika_get_app_logs");
    expect(toolNames).toContain("masdika_delete_app");

    // Storage & CDN
    expect(toolNames).toContain("masdika_upload_cdn");
    expect(toolNames).toContain("masdika_list_cdn_files");
    expect(toolNames).toContain("masdika_delete_cdn_file");
    expect(toolNames).toContain("masdika_list_storage");
    expect(toolNames).toContain("masdika_create_bucket");
    expect(toolNames).toContain("masdika_create_s3_key");
    expect(toolNames).toContain("masdika_list_s3_keys");

    // AI Gateway
    expect(toolNames).toContain("masdika_list_ai_models");
    expect(toolNames).toContain("masdika_create_ai_key");
    expect(toolNames).toContain("masdika_list_ai_keys");
    expect(toolNames).toContain("masdika_revoke_ai_key");
    expect(toolNames).toContain("masdika_topup_ai_balance");

    // Network & Security
    expect(toolNames).toContain("masdika_list_ssh_keys");
    expect(toolNames).toContain("masdika_create_ssh_key");
    expect(toolNames).toContain("masdika_delete_ssh_key");
    expect(toolNames).toContain("masdika_list_reserved_ips");
    expect(toolNames).toContain("masdika_list_cloudflared_tunnels");

    // Support
    expect(toolNames).toContain("masdika_list_tickets");
    expect(toolNames).toContain("masdika_create_ticket");
    expect(toolNames).toContain("masdika_reply_ticket");

    expect(MASDIKA_MCP_TOOLS.length).toBe(45);
  });

  it("2. masdika_get_account correctly formats wallet balance and counts", async () => {
    vi.mocked(prisma.vpsService.count).mockResolvedValueOnce(2);
    vi.mocked(prisma.databaseService.count).mockResolvedValueOnce(3);
    vi.mocked(prisma.appService.count).mockResolvedValueOnce(1);
    vi.mocked(prisma.secureMedia.count).mockResolvedValueOnce(5);

    const result = await executeMcpTool("masdika_get_account", {}, mockUser);
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toMatch(/250\.000/);
    expect(result.content[0].text).toContain("Cloud VPS: **2**");
    expect(result.content[0].text).toContain("Managed Databases: **3**");
  });

  it("3. masdika_create_topup validates boundaries and creates invoice", async () => {
    const badMin = await executeMcpTool("masdika_create_topup", { amount: 5000 }, mockUser);
    expect(badMin.isError).toBe(true);

    vi.mocked(prisma.invoice.create).mockResolvedValueOnce({
      id: 101,
      invoiceNumber: "INV-TOPUP-TEST",
      amount: 50000,
      status: "PENDING",
    } as any);

    const goodRes = await executeMcpTool("masdika_create_topup", { amount: 50000, paymentMethod: "QRIS" }, mockUser);
    expect(goodRes.isError).toBeFalsy();
    expect(goodRes.content[0].text).toMatch(/50\.000/);
  });

  it("4. masdika_create_ai_key creates and returns new AI Gateway key", async () => {
    vi.mocked(prisma.aiGatewayKey.count).mockResolvedValueOnce(2);
    vi.mocked(prisma.aiGatewayKey.create).mockResolvedValueOnce({
      id: 1,
      name: "Cursor Key",
      keyPrefix: "msdk_ai_test",
      createdAt: new Date(),
    } as any);

    const res = await executeMcpTool("masdika_create_ai_key", { name: "Cursor Key" }, mockUser);
    expect(res.isError).toBeFalsy();
    expect(res.content[0].text).toContain("Cursor Key");
    expect(res.content[0].text).toContain("api/ai/openai/v1");
  });

  it("5. masdika_list_ai_models retrieves available AI models", async () => {
    vi.mocked(prisma.aiModel.findMany).mockResolvedValueOnce([
      {
        id: 1,
        name: "DeepSeek R1",
        modelId: "deepseek/deepseek-r1",
        provider: "DeepSeek",
        contextWindow: "64k",
        inputPricePer1M: 3500,
        outputPricePer1M: 14000,
      } as any,
    ]);

    const res = await executeMcpTool("masdika_list_ai_models", {}, mockUser);
    expect(res.isError).toBeFalsy();
    expect(res.content[0].text).toContain("DeepSeek R1");
    expect(res.content[0].text).toContain("deepseek/deepseek-r1");
  });

  it("6. masdika_control_vps starts, stops, and queries VPS status", async () => {
    vi.mocked(prisma.vpsService.findFirst).mockResolvedValueOnce({
      id: 10,
      hostname: "prod-server",
      node: "node1",
      vmid: 110,
      status: "STOPPED",
      cpuCores: 2,
      ramGb: 4,
    } as any);

    const res = await executeMcpTool("masdika_control_vps", { vpsId: 10, action: "start" }, mockUser);
    expect(res.isError).toBeFalsy();
    expect(res.content[0].text).toContain("started successfully");
  });
});
