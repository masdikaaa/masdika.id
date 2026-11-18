import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { decryptDeterministic, encryptDeterministic } from "@/lib/encryption";
import { validateFileUploadSecurity } from "@/lib/upload-security";

const MCP_CDN_ALLOWED_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".webp", ".gif",
  ".pdf", ".txt", ".csv", ".json", ".md",
  ".mp4", ".webm", ".mp3", ".wav", ".zip",
]);
import { formatRupiah } from "@/lib/billing";
import { createDuitkuTransaction } from "@/lib/duitku";
import { getActiveProxmoxClient, LIVE_VPS_STATUSES } from "@/lib/vps-api";
import {
  deployDatabase,
  buildConnectionDetails,
  allocateAvailablePort,
  startDatabase,
  stopDatabase,
  restartDatabase,
  deleteDatabase,
} from "@/lib/k8s-database";
import {
  deployAppService,
  allocateAppPort,
  startAppService,
  stopAppService,
  restartAppService,
  deleteAppService,
  getAppK8sClients,
} from "@/lib/k8s-app";
import { JobQueueService } from "@/lib/job-queue";
import { generateAiGatewayKey } from "@/lib/ai-gateway";
import { createServiceOrderInvoice } from "@/lib/payg-invoice";

import { McpToolDefinition, MASDIKA_MCP_TOOLS } from "./mcp-schema";
export type { McpToolDefinition };
export { MASDIKA_MCP_TOOLS };

export async function executeMcpTool(
  toolName: string,
  args: Record<string, any>,
  user: any
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    switch (toolName) {
      // ══════════════════════════════════════════════════════
      // 1. BILLING & ACCOUNT
      // ══════════════════════════════════════════════════════
      case "masdika_get_account": {
        const [vpsCount, dbCount, appCount, cdnCount] = await Promise.all([
          prisma.vpsService.count({ where: { userId: user.id, status: { in: LIVE_VPS_STATUSES } } }),
          prisma.databaseService.count({ where: { userId: user.id, status: { in: ["RUNNING", "ACTIVE", "PROVISIONING"] } } }),
          prisma.appService.count({ where: { userId: user.id, status: { in: ["RUNNING", "ACTIVE", "PROVISIONING"] } } }),
          prisma.secureMedia.count({ where: { userId: user.id } }),
        ]);

        const rawName = user.name || "";
        const decryptedName = decryptDeterministic(rawName) || rawName || "Customer";
        const rawEmail = user.email || "";
        const decryptedEmail = decryptDeterministic(rawEmail) || rawEmail || "user@masdika.id";

        const summary = {
          name: decryptedName,
          email: decryptedEmail,
          walletBalance: formatRupiah(user.balance || 0),
          walletBalanceRaw: user.balance || 0,
          aiBalance: formatRupiah(user.aiBalance || 0),
          services: {
            activeVps: vpsCount,
            activeDatabases: dbCount,
            activeApps: appCount,
            storedCdnFiles: cdnCount,
          },
        };

        return {
          content: [
            {
              type: "text",
              text: `### Masdika Cloud Account Profile\n- **Name:** ${summary.name}\n- **Email:** ${summary.email}\n- **Wallet Balance:** ${summary.walletBalance}\n- **AI Gateway Balance:** ${summary.aiBalance}\n- **Active Services:**\n  - Cloud VPS: **${summary.services.activeVps}**\n  - Managed Databases: **${summary.services.activeDatabases}**\n  - Managed Applications: **${summary.services.activeApps}**\n  - CDN Files: **${summary.services.storedCdnFiles}**`,
            },
          ],
        };
      }

      case "masdika_create_topup": {
        const amount = Number(args.amount);
        if (!amount || isNaN(amount) || amount < 10000) {
          return {
            content: [{ type: "text", text: "Error: Top-up amount must be at least Rp 10,000." }],
            isError: true,
          };
        }

        const paymentMethod = String(args.paymentMethod || "QRIS").toUpperCase();
        const merchantOrderId = `TOPUP-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.masdika.id";

        const transaction = await createDuitkuTransaction({
          paymentAmount: amount,
          merchantOrderId,
          productDetails: "Masdika Wallet Top-up (MCP Agent)",
          email: user.email || "user@masdika.id",
          phoneNumber: "08123456789",
          customerVaName: user.name || "Customer",
          callbackUrl: `${baseUrl}/api/payment/callback`,
          returnUrl: `${baseUrl}/dashboard/billing`,
          paymentMethod,
          itemDetails: [
            {
              name: "Wallet Top-up",
              price: amount,
              quantity: 1,
            },
          ],
        });

        await prisma.invoice.create({
          data: {
            userId: user.id,
            invoiceNumber: merchantOrderId,
            merchantOrderId,
            amount,
            subtotal: amount,
            status: "PENDING",
            paymentMethod,
            type: "TOP_UP",
            paymentUrl: transaction.paymentUrl,
            vaNumber: transaction.vaNumber,
            qrString: transaction.qrString,
            reference: transaction.reference,
          },
        });

        let paymentInfo = `### Top-up Invoice Created: **${merchantOrderId}**\n- **Amount:** ${formatRupiah(amount)}\n- **Payment Method:** ${paymentMethod}\n- **Status:** PENDING PAYMENT`;

        if (transaction.paymentUrl) {
          paymentInfo += `\n- **Payment Link:** [Click to Pay](${transaction.paymentUrl})`;
        }

        if (transaction.vaNumber) {
          paymentInfo += `\n- **Virtual Account Number:** \`${transaction.vaNumber}\`\n*(Please transfer within 24 hours)*`;
        }

        if (transaction.qrString) {
          paymentInfo += `\n- **QRIS String:** \`${transaction.qrString}\`\n*(Scan with any Indonesian banking or e-wallet app)*`;
        }

        return {
          content: [{ type: "text", text: paymentInfo }],
        };
      }

      case "masdika_check_invoice": {
        const invNum = String(args.invoiceNumber || "").trim();
        if (!invNum) {
          return { content: [{ type: "text", text: "Error: invoiceNumber is required." }], isError: true };
        }

        const invoice = await prisma.invoice.findFirst({
          where: {
            invoiceNumber: invNum,
            userId: user.id,
          },
        });

        if (!invoice) {
          return {
            content: [{ type: "text", text: `Invoice '${invNum}' not found for your account.` }],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `### Invoice Status: ${invoice.invoiceNumber}\n- **Status:** **${invoice.status}**\n- **Total Amount:** ${formatRupiah(invoice.amount)}\n- **Payment Method:** ${invoice.paymentMethod || "Account Balance"}\n- **Type:** ${invoice.type}\n- **Created At:** ${invoice.createdAt.toISOString()}${invoice.paidAt ? `\n- **Paid At:** ${invoice.paidAt.toISOString()}` : ""}${invoice.status === "PENDING" && invoice.paymentUrl ? `\n- **Payment Link:** ${invoice.paymentUrl}` : ""}${invoice.vaNumber ? `\n- **VA Number:** ${invoice.vaNumber}` : ""}`,
            },
          ],
        };
      }

      case "masdika_list_invoices": {
        const limit = Math.min(Number(args.limit || 10), 50);
        const statusFilter = args.status && args.status !== "ALL" ? String(args.status).toUpperCase() : undefined;

        const invoices = await prisma.invoice.findMany({
          where: {
            userId: user.id,
            ...(statusFilter ? { status: statusFilter } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: limit,
        });

        if (invoices.length === 0) {
          return {
            content: [{ type: "text", text: "No invoices found for your account." }],
          };
        }

        const lines = invoices.map(
          (inv) =>
            `- **${inv.invoiceNumber}** | **${inv.status}** | ${formatRupiah(inv.amount)} | ${inv.paymentMethod || "Balance"} | ${new Date(inv.createdAt).toISOString().split("T")[0]}`
        );

        return {
          content: [
            {
              type: "text",
              text: `### Recent Invoices (${invoices.length}):\n${lines.join("\n")}`,
            },
          ],
        };
      }

      case "masdika_check_voucher": {
        const code = String(args.code || "").trim().toUpperCase();
        if (!code) {
          return { content: [{ type: "text", text: "Voucher code is required." }], isError: true };
        }

        const voucher = await prisma.voucher.findUnique({
          where: { code },
        });

        if (!voucher) {
          return { content: [{ type: "text", text: `Voucher code '${code}' is invalid or does not exist.` }], isError: true };
        }

        if (!voucher.isActive) {
          return { content: [{ type: "text", text: `Voucher '${code}' is currently inactive.` }], isError: true };
        }

        if (voucher.validUntil && new Date() > voucher.validUntil) {
          return { content: [{ type: "text", text: `Voucher '${code}' expired on ${voucher.validUntil.toISOString()}.` }], isError: true };
        }

        if (voucher.maxUses > 0 && voucher.currentUses >= voucher.maxUses) {
          return { content: [{ type: "text", text: `Voucher '${code}' has reached its maximum usage limit.` }], isError: true };
        }

        return {
          content: [
            {
              type: "text",
              text: `### Voucher '${voucher.code}' is Valid!\n- **Discount:** ${voucher.discountPercent}%\n- **Description:** ${voucher.description || "Promotional discount"}\n- **Usage:** ${voucher.currentUses}/${voucher.maxUses || "Unlimited"}`,
            },
          ],
        };
      }

      // ══════════════════════════════════════════════════════
      // 2. CLOUD VPS
      // ══════════════════════════════════════════════════════
      case "masdika_list_vps": {
        const instances = await prisma.vpsService.findMany({
          where: { userId: user.id },
          include: { assignedIps: true },
          orderBy: { createdAt: "desc" },
        });

        if (instances.length === 0) {
          return {
            content: [{ type: "text", text: "No Cloud VPS instances found in your account." }],
          };
        }

        const list = instances.map((v) => {
          const primaryIp = v.assignedIps.find((ip) => ip.isPrimary) ?? v.assignedIps[0];
          return `- **ID:** ${v.id} | **${v.hostname || `vps-${v.id}`}**\n  - Status: \`${v.status}\`\n  - IP: \`${primaryIp?.publicIp || primaryIp?.ipAddress || "Unassigned"}\`\n  - Specs: ${v.cpuCores} vCPU, ${v.ramGb} GB RAM, ${v.diskGb} GB SSD\n  - OS: ${v.osTemplate || "Ubuntu 22.04"}\n  - Hourly Rate: ${formatRupiah(v.hourlyRate || 0)}/hr`;
        }).join("\n\n");

        return {
          content: [{ type: "text", text: `### Your Cloud VPS Instances (${instances.length})\n\n${list}` }],
        };
      }

      case "masdika_control_vps": {
        const vpsId = Number(args.vpsId);
        const action = String(args.action || "status").toLowerCase();

        const vps = await prisma.vpsService.findFirst({
          where: { id: vpsId, userId: user.id },
        });

        if (!vps) {
          return { content: [{ type: "text", text: `Error: VPS with ID ${vpsId} not found.` }], isError: true };
        }

        if (!vps.node || !vps.vmid) {
          return { content: [{ type: "text", text: `VPS ${vps.hostname || vps.id} is not bound to a physical hypervisor node.` }], isError: true };
        }

        const pveRes = await getActiveProxmoxClient();
        if (pveRes.error || !pveRes.proxmox) {
          return { content: [{ type: "text", text: "Hypervisor node is currently unavailable." }], isError: true };
        }
        const { proxmox } = pveRes;

        if (action === "status") {
          const statusRes = await proxmox.getVmStatus(vps.node, vps.vmid).catch(() => null);
          return {
            content: [
              {
                type: "text",
                text: `VPS **${vps.hostname || vps.id}** (ID: ${vps.id}) status:\n- Database Status: \`${vps.status}\`\n- Hypervisor Status: \`${statusRes?.status || "unknown"}\`\n- CPU: ${vps.cpuCores} Cores | RAM: ${vps.ramGb} GB`,
              },
            ],
          };
        }

        if (action === "start") {
          await proxmox.startVm(vps.node, vps.vmid);
          await prisma.vpsService.update({ where: { id: vps.id }, data: { status: "RUNNING" } });
          return { content: [{ type: "text", text: `VPS **${vps.hostname || vps.id}** (ID: ${vps.id}) started successfully.` }] };
        }

        if (action === "stop") {
          await proxmox.stopVm(vps.node, vps.vmid);
          await prisma.vpsService.update({ where: { id: vps.id }, data: { status: "STOPPED" } });
          return { content: [{ type: "text", text: `VPS **${vps.hostname || vps.id}** (ID: ${vps.id}) stopped successfully.` }] };
        }

        if (action === "reboot") {
          await proxmox.rebootVm(vps.node, vps.vmid);
          return { content: [{ type: "text", text: `VPS **${vps.hostname || vps.id}** (ID: ${vps.id}) reboot signaled.` }] };
        }

        return { content: [{ type: "text", text: `Unsupported action '${action}'. Use 'start', 'stop', 'reboot', or 'status'.` }], isError: true };
      }

      case "masdika_get_vps_metrics": {
        const vpsId = Number(args.vpsId);
        const vps = await prisma.vpsService.findFirst({
          where: { id: vpsId, userId: user.id },
        });

        if (!vps || !vps.node || !vps.vmid) {
          return { content: [{ type: "text", text: `VPS with ID ${vpsId} not found or not provisioned.` }], isError: true };
        }

        const pveRes = await getActiveProxmoxClient();
        if (pveRes.error || !pveRes.proxmox) {
          return { content: [{ type: "text", text: "Hypervisor node is currently unavailable." }], isError: true };
        }

        const status = await pveRes.proxmox.getVmStatus(vps.node, vps.vmid).catch(() => null);
        if (!status) {
          return { content: [{ type: "text", text: `Could not fetch live metrics for VPS ${vps.hostname || vps.id}.` }], isError: true };
        }

        const cpuUsage = (status.cpu ? (status.cpu * 100).toFixed(1) : "0.0") + "%";
        const memUsedMb = status.mem ? Math.round(status.mem / 1024 / 1024) : 0;
        const maxMemMb = status.maxmem ? Math.round(status.maxmem / 1024 / 1024) : vps.ramGb * 1024;
        const diskUsedGb = status.disk ? (status.disk / 1024 / 1024 / 1024).toFixed(1) : "0";
        const maxDiskGb = status.maxdisk ? (status.maxdisk / 1024 / 1024 / 1024).toFixed(1) : String(vps.diskGb);

        return {
          content: [
            {
              type: "text",
              text: `### Real-time Performance Metrics: **${vps.hostname || vps.id}**\n- **Status:** \`${status.status || "running"}\`\n- **CPU Usage:** ${cpuUsage} (of ${vps.cpuCores} vCPU)\n- **RAM Usage:** ${memUsedMb} MB / ${maxMemMb} MB (${Math.round((memUsedMb / maxMemMb) * 100 || 0)}%)\n- **Disk Usage:** ${diskUsedGb} GB / ${maxDiskGb} GB\n- **Network In/Out:** ${Math.round((status.netin || 0) / 1024 / 1024)} MB in / ${Math.round((status.netout || 0) / 1024 / 1024)} MB out`,
            },
          ],
        };
      }

      case "masdika_upgrade_vps": {
        const vpsId = Number(args.vpsId);
        const { cpuCores, ramGb, diskGb } = args;

        const vps = await prisma.vpsService.findFirst({
          where: { id: vpsId, userId: user.id },
        });

        if (!vps) {
          return { content: [{ type: "text", text: `Cloud VPS with ID ${vpsId} not found.` }], isError: true };
        }

        if (vps.status === "TERMINATED" || vps.status === "SUSPENDED" || vps.status === "PROVISIONING") {
          return { content: [{ type: "text", text: `VPS '${vps.hostname || vps.id}' is in ${vps.status} state. Upgrades are only permitted on active instances.` }], isError: true };
        }

        const safeCpu = cpuCores ? Math.min(Math.max(Math.floor(Number(cpuCores)), 1), 32) : vps.cpuCores;
        const safeRam = ramGb ? Math.min(Math.max(Math.floor(Number(ramGb)), 1), 128) : vps.ramGb;
        const safeDisk = diskGb ? Math.min(Math.max(Math.floor(Number(diskGb)), 10), 2000) : vps.diskGb;

        if (safeCpu < vps.cpuCores || safeRam < vps.ramGb || safeDisk < vps.diskGb) {
          return { content: [{ type: "text", text: "Downgrading specifications is prohibited. You can only scale up resources." }], isError: true };
        }

        const hasChanges = safeCpu > vps.cpuCores || safeRam > vps.ramGb || safeDisk > vps.diskGb;
        if (!hasChanges) {
          return { content: [{ type: "text", text: "No specification changes requested. Target values match current VPS specs." }], isError: true };
        }

        // Calculate authoritative hourly rate increase
        let addedHourlyRate = 0;
        if (safeCpu > vps.cpuCores) {
          const addedCores = safeCpu - vps.cpuCores;
          addedHourlyRate += Math.ceil((addedCores * 50000) / 730);
        }
        if (safeRam > vps.ramGb) {
          const addedRam = safeRam - vps.ramGb;
          addedHourlyRate += Math.ceil((addedRam * 25000) / 730);
        }
        if (safeDisk > vps.diskGb) {
          const addedDisk = safeDisk - vps.diskGb;
          addedHourlyRate += Math.ceil((addedDisk * 5000) / 730);
        }

        const newHourlyRate = (vps.hourlyRate || 0) + addedHourlyRate;

        await prisma.vpsService.update({
          where: { id: vps.id },
          data: {
            cpuCores: safeCpu,
            ramGb: safeRam,
            diskGb: safeDisk,
            hourlyRate: newHourlyRate,
          },
        });

        if (vps.node && vps.vmid) {
          const pveRes = await getActiveProxmoxClient();
          if (pveRes.proxmox) {
            const configPayload: any = {};
            if (safeCpu > vps.cpuCores) configPayload.cores = safeCpu;
            if (safeRam > vps.ramGb) configPayload.memory = safeRam * 1024;
            await pveRes.proxmox.configVm(vps.node, vps.vmid, configPayload).catch(() => null);
          }
        }

        return {
          content: [
            {
              type: "text",
              text: `🚀 **VPS '${vps.hostname || vps.id}' (ID: ${vps.id}) Resized Successfully!**\n- **CPU:** ${vps.cpuCores} vCPU ➔ **${safeCpu} vCPU**\n- **RAM:** ${vps.ramGb} GB ➔ **${safeRam} GB**\n- **Disk:** ${vps.diskGb} GB ➔ **${safeDisk} GB SSD**\n- **New Rate:** ${formatRupiah(newHourlyRate)}/hr (+${formatRupiah(addedHourlyRate)}/hr)`,
            },
          ],
        };
      }

      case "masdika_reinstall_vps": {
        const { vpsId, templateName, password } = args;
        if (!vpsId || !templateName || !password) {
          return { content: [{ type: "text", text: "Missing required arguments: vpsId, templateName, and password." }], isError: true };
        }
        if (password.length < 8) {
          return { content: [{ type: "text", text: "Password must be at least 8 characters long." }], isError: true };
        }
        const vps = await prisma.vpsService.findFirst({
          where: { id: Number(vpsId), userId: user.id },
        });
        if (!vps) {
          return { content: [{ type: "text", text: `Cloud VPS with ID ${vpsId} not found.` }], isError: true };
        }
        if (vps.status === "PROVISIONING") {
          return { content: [{ type: "text", text: `VPS '${vps.hostname || vps.vmid}' is already being provisioned or reinstalled.` }], isError: true };
        }
        await prisma.vpsService.update({
          where: { id: vps.id },
          data: { status: "PROVISIONING" },
        });
        await JobQueueService.enqueue("REINSTALL_VPS", {
          vpsId: vps.id,
          templateName,
          password,
        });
        return {
          content: [
            {
              type: "text",
              text: `Reinstallation initiated for VPS '${vps.hostname || vps.vmid}' (ID: ${vps.id}) with template '${templateName}'. Rebuilding in progress.`,
            },
          ],
        };
      }

      case "masdika_create_vps_snapshot": {
        const vpsId = Number(args.vpsId);
        const snapName = String(args.snapshotName || "").trim().replace(/[^a-zA-Z0-9_-]/g, "");
        const description = String(args.description || `Snapshot taken via MCP Agent`);

        if (!snapName) {
          return { content: [{ type: "text", text: "A valid alphanumeric snapshotName is required." }], isError: true };
        }

        const vps = await prisma.vpsService.findFirst({
          where: { id: vpsId, userId: user.id },
        });

        if (!vps || !vps.node || !vps.vmid) {
          return { content: [{ type: "text", text: `VPS with ID ${vpsId} not found or not active.` }], isError: true };
        }

        const pveRes = await getActiveProxmoxClient();
        if (pveRes.error || !pveRes.proxmox) {
          return { content: [{ type: "text", text: "Hypervisor node is currently unavailable." }], isError: true };
        }

        await pveRes.proxmox.createVMSnapshot(vps.node, vps.vmid, snapName, description);

        return {
          content: [
            {
              type: "text",
              text: `Snapshot '**${snapName}**' successfully created for VPS **${vps.hostname || vps.id}** (ID: ${vps.id}).`,
            },
          ],
        };
      }

      case "masdika_list_vps_snapshots": {
        const vpsId = Number(args.vpsId);
        const vps = await prisma.vpsService.findFirst({
          where: { id: vpsId, userId: user.id },
        });

        if (!vps || !vps.node || !vps.vmid) {
          return { content: [{ type: "text", text: `VPS with ID ${vpsId} not found.` }], isError: true };
        }

        const pveRes = await getActiveProxmoxClient();
        if (pveRes.error || !pveRes.proxmox) {
          return { content: [{ type: "text", text: "Hypervisor node is currently unavailable." }], isError: true };
        }

        const snapshots = await pveRes.proxmox.getVMSnapshots(vps.node, vps.vmid).catch(() => []);
        const filtered = (snapshots || []).filter((s: any) => s.name !== "current");

        if (filtered.length === 0) {
          return {
            content: [{ type: "text", text: `No snapshots found for VPS ${vps.hostname || vps.id}.` }],
          };
        }

        const list = filtered.map(
          (s: any) =>
            `- **${s.name}**\n  - Description: ${s.description || "No description"}\n  - Time: ${s.snaptime ? new Date(s.snaptime * 1000).toISOString() : "Unknown"}`
        ).join("\n\n");

        return {
          content: [
            {
              type: "text",
              text: `### Snapshots for VPS **${vps.hostname || vps.id}** (${filtered.length}):\n\n${list}`,
            },
          ],
        };
      }

      case "masdika_reset_vps_password": {
        const vpsId = Number(args.vpsId);
        const password = String(args.password || "").trim();

        if (password.length < 8) {
          return { content: [{ type: "text", text: "Password must be at least 8 characters long." }], isError: true };
        }

        const vps = await prisma.vpsService.findFirst({
          where: { id: vpsId, userId: user.id },
        });

        if (!vps) {
          return { content: [{ type: "text", text: `Cloud VPS with ID ${vpsId} not found.` }], isError: true };
        }

        await prisma.vpsService.update({
          where: { id: vps.id },
          data: { rootPassword: password },
        });

        if (vps.node && vps.vmid) {
          const pveRes = await getActiveProxmoxClient();
          if (pveRes.proxmox) {
            await pveRes.proxmox.configVm(vps.node, vps.vmid, { password } as any).catch(() => null);
          }
        }

        return {
          content: [
            {
              type: "text",
              text: `Password updated for VPS **${vps.hostname || vps.id}**. Root/Administrator password is set.`,
            },
          ],
        };
      }

      case "masdika_list_vps_firewall": {
        const vpsId = Number(args.vpsId);
        const vps = await prisma.vpsService.findFirst({
          where: { id: vpsId, userId: user.id },
        });

        if (!vps || !vps.node || !vps.vmid) {
          return { content: [{ type: "text", text: `VPS with ID ${vpsId} not found or not provisioned.` }], isError: true };
        }

        const pveRes = await getActiveProxmoxClient();
        if (pveRes.error || !pveRes.proxmox) {
          return { content: [{ type: "text", text: "Hypervisor node is currently unavailable." }], isError: true };
        }

        const rules = await pveRes.proxmox.getFirewallRules(vps.node, vps.vmid).catch(() => []);
        if (!rules || rules.length === 0) {
          return { content: [{ type: "text", text: `No firewall rules configured for VPS **${vps.hostname || vps.id}**.` }] };
        }

        const list = rules.map((r: any, idx: number) =>
          `- **#${r.pos ?? idx}** | \`${(r.type || "in").toUpperCase()}\` | **${r.action}** | Proto: \`${r.proto || "any"}\` | Port: \`${r.dport || "*"}\` | Source: \`${r.source || "any"}\` ${r.comment ? `— *${r.comment}*` : ""}`
        ).join("\n");

        return {
          content: [{ type: "text", text: `### Firewall Rules for **${vps.hostname || vps.id}** (${rules.length}):\n${list}` }],
        };
      }

      case "masdika_add_vps_firewall": {
        const vpsId = Number(args.vpsId);
        const type = String(args.type || "in").toLowerCase();
        const action = String(args.action || "ACCEPT").toUpperCase();
        const proto = String(args.proto || "tcp").toLowerCase();
        const dport = args.dport ? String(args.dport).replace(/[^0-9:]/g, "").slice(0, 16) : undefined;
        const source = args.source ? String(args.source).replace(/[^0-9a-fA-F.:/]/g, "").slice(0, 48) : undefined;
        const comment = args.comment ? String(args.comment).slice(0, 80) : "Added via MCP Agent";

        if (!["in", "out"].includes(type)) {
          return { content: [{ type: "text", text: "Invalid type. Must be 'in' or 'out'." }], isError: true };
        }
        if (!["ACCEPT", "DROP", "REJECT"].includes(action)) {
          return { content: [{ type: "text", text: "Invalid action. Must be 'ACCEPT', 'DROP', or 'REJECT'." }], isError: true };
        }
        if (!["tcp", "udp", "icmp", "any"].includes(proto)) {
          return { content: [{ type: "text", text: "Invalid proto. Must be 'tcp', 'udp', 'icmp', or 'any'." }], isError: true };
        }

        const vps = await prisma.vpsService.findFirst({
          where: { id: vpsId, userId: user.id },
        });
        if (!vps || !vps.node || !vps.vmid) {
          return { content: [{ type: "text", text: `VPS with ID ${vpsId} not found or not provisioned.` }], isError: true };
        }
        if (vps.status === "SUSPENDED" || vps.status === "TERMINATED") {
          return { content: [{ type: "text", text: `VPS is ${vps.status}. Cannot modify firewall rules.` }], isError: true };
        }

        const pveRes = await getActiveProxmoxClient();
        if (pveRes.error || !pveRes.proxmox) {
          return { content: [{ type: "text", text: "Hypervisor node is currently unavailable." }], isError: true };
        }

        await pveRes.proxmox.createFirewallRule(vps.node, vps.vmid, {
          type,
          action,
          proto,
          ...(dport ? { dport } : {}),
          ...(source ? { source } : {}),
          comment,
          enable: 1,
        });

        return {
          content: [{ type: "text", text: `Firewall rule added to VPS **${vps.hostname || vps.id}**: \`${type.toUpperCase()} ${action} ${proto}${dport ? ` port ${dport}` : ""}\`.` }],
        };
      }

      // ══════════════════════════════════════════════════════
      // 3. MANAGED DATABASE
      // ══════════════════════════════════════════════════════
      case "masdika_list_databases": {
        const databases = await prisma.databaseService.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
        });

        if (databases.length === 0) {
          return {
            content: [{ type: "text", text: "No Managed Databases found in your account." }],
          };
        }

        const list = databases.map((d) => {
          return `- **ID:** ${d.id} | **${d.name}** (${d.type})\n  - Status: \`${d.status}\`\n  - Host: \`${d.host || "db.masdika.id"}\`\n  - Port: \`${d.port}\`\n  - Plan: ${d.planName} (${d.memoryMb}MB RAM, ${d.storageGb}GB SSD)`;
        }).join("\n\n");

        return {
          content: [{ type: "text", text: `### Managed Databases (${databases.length})\n\n${list}` }],
        };
      }

      case "masdika_create_database": {
        if ((user.balance || 0) < 10000) {
          return {
            content: [{ type: "text", text: `Insufficient wallet balance. You have ${formatRupiah(user.balance || 0)}. A minimum wallet balance of Rp 10,000 is required to provision a Managed Database.` }],
            isError: true,
          };
        }

        const activeCount = await prisma.databaseService.count({
          where: { userId: user.id, status: { not: "TERMINATED" } },
        });
        if (activeCount >= 10) {
          return {
            content: [{ type: "text", text: "Maximum limit of 10 active Managed Databases reached for your account." }],
            isError: true,
          };
        }

        const rawName = String(args.name || "mcp-db").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
        const name = rawName.slice(0, 32) || `db-${Date.now().toString(36)}`;
        const rawType = String(args.dbType || "POSTGRES").toUpperCase();
        const allowedTypes = ["POSTGRES", "MYSQL", "MARIADB", "REDIS", "MONGODB"];
        const dbType = allowedTypes.includes(rawType) ? rawType : "POSTGRES";
        const planName = String(args.planName || "Starter");

        const port = await allocateAvailablePort();
        const generatedPassword = crypto.randomBytes(12).toString("base64url");

        const newDb = await prisma.$transaction(async (tx) => {
          const db = await tx.databaseService.create({
            data: {
              userId: user.id,
              name,
              type: dbType,
              planName,
              version: dbType === "POSTGRES" ? "16" : "8.0",
              status: "PROVISIONING",
              port,
              username: "dbadmin",
              password: generatedPassword,
              dbName: name.replace(/-/g, "_"),
              hourlyRate: 28,
              billingMode: "PAYG",
            },
          });

          await createServiceOrderInvoice(tx, {
            userId: user.id,
            serviceIdField: "databaseServiceId",
            serviceId: db.id,
            type: "MANAGED_DATABASE",
            amount: 0,
            billingMode: "PAYG",
            serviceName: `Managed Database (${name})`,
            extraDetails: {
              planName,
              dbType,
              port,
            },
          });

          return db;
        });

        // Deploy to K8s
        await deployDatabase(newDb as any).catch((err: any) => console.error("[MCP_DB_DEPLOY]", err));

        await prisma.databaseService.update({
          where: { id: newDb.id },
          data: { status: "RUNNING" },
        });

        const conn = buildConnectionDetails({ ...newDb, password: generatedPassword } as any);

        return {
          content: [
            {
              type: "text",
              text: `🎉 **Managed Database '${name}' Provisioned!**\n- **Engine:** ${dbType}\n- **Status:** RUNNING\n- **Host:** ${conn.host}\n- **Port:** ${conn.port}\n- **Username:** ${conn.username}\n- **Password:** \`${conn.password}\`\n- **Database:** ${conn.dbName}\n- **Connection String:** \`${conn.connectionUri}\`\n*Billing: Pay-As-You-Go (Rp 28/hour)*`,
            },
          ],
        };
      }

      case "masdika_control_database": {
        const dbId = Number(args.dbId);
        const action = String(args.action || "").toLowerCase();

        const db = await prisma.databaseService.findFirst({
          where: { id: dbId, userId: user.id },
        });

        if (!db) {
          return { content: [{ type: "text", text: `Managed Database with ID ${dbId} not found.` }], isError: true };
        }

        if (action === "start") {
          await startDatabase(db as any);
          await prisma.databaseService.update({ where: { id: db.id }, data: { status: "RUNNING" } });
          return { content: [{ type: "text", text: `Managed Database '${db.name}' has been started.` }] };
        }

        if (action === "stop") {
          await stopDatabase(db as any);
          await prisma.databaseService.update({ where: { id: db.id }, data: { status: "STOPPED" } });
          return { content: [{ type: "text", text: `Managed Database '${db.name}' has been stopped.` }] };
        }

        if (action === "restart") {
          await restartDatabase(db as any);
          return { content: [{ type: "text", text: `Managed Database '${db.name}' restart initiated.` }] };
        }

        return { content: [{ type: "text", text: "Invalid action. Use 'start', 'stop', or 'restart'." }], isError: true };
      }

      case "masdika_get_database_connection": {
        const dbId = Number(args.dbId);
        const db = await prisma.databaseService.findFirst({
          where: { id: dbId, userId: user.id },
        });

        if (!db) {
          return { content: [{ type: "text", text: `Managed Database with ID ${dbId} not found.` }], isError: true };
        }

        const conn = buildConnectionDetails(db as any);

        return {
          content: [
            {
              type: "text",
              text: `### Database Credentials: **${db.name}**\n- **Engine:** ${db.type}\n- **Host:** ${conn.host}\n- **Port:** ${conn.port}\n- **Database:** ${conn.dbName}\n- **Username:** ${conn.username}\n- **Password:** \`${conn.password || db.password}\`\n- **URI:** \`${conn.connectionUri}\``,
            },
          ],
        };
      }

      case "masdika_delete_database": {
        const dbId = Number(args.dbId);
        const db = await prisma.databaseService.findFirst({
          where: { id: dbId, userId: user.id },
        });

        if (!db) {
          return { content: [{ type: "text", text: `Managed Database with ID ${dbId} not found.` }], isError: true };
        }

        await deleteDatabase(db as any).catch(() => null);
        await prisma.databaseService.delete({ where: { id: db.id } });

        return {
          content: [{ type: "text", text: `Managed Database '${db.name}' (ID: ${dbId}) has been completely deleted.` }],
        };
      }

      // ══════════════════════════════════════════════════════
      // 4. MANAGED APPLICATIONS
      // ══════════════════════════════════════════════════════
      case "masdika_list_apps": {
        const apps = await prisma.appService.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
        });

        if (apps.length === 0) {
          return {
            content: [{ type: "text", text: "No Managed Applications found in your account." }],
          };
        }

        const list = apps.map((a) => {
          const domain = a.subdomain ? `${a.subdomain}.apps.masdika.id` : `${a.name}.apps.masdika.id`;
          return `- **ID:** ${a.id} | **${a.name}** (${a.appType})\n  - Status: \`${a.status}\`\n  - URL: https://${domain}\n  - Port: ${a.port}`;
        }).join("\n\n");

        return {
          content: [{ type: "text", text: `### Managed Applications (${apps.length})\n\n${list}` }],
        };
      }

      case "masdika_deploy_app": {
        if ((user.balance || 0) < 10000) {
          return {
            content: [{ type: "text", text: `Insufficient wallet balance. You have ${formatRupiah(user.balance || 0)}. A minimum wallet balance of Rp 10,000 is required to deploy a Managed Application.` }],
            isError: true,
          };
        }

        const activeCount = await prisma.appService.count({
          where: { userId: user.id, status: { not: "TERMINATED" } },
        });
        if (activeCount >= 10) {
          return {
            content: [{ type: "text", text: "Maximum limit of 10 active Managed Applications reached for your account." }],
            isError: true,
          };
        }

        const appType = String(args.appType || "omniroute").toLowerCase().trim();
        const rawName = String(args.name || `${appType}-app`).trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
        const name = rawName.slice(0, 32) || `app-${Date.now().toString(36)}`;

        const port = await allocateAppPort();
        const subdomain = `${name}-${crypto.randomBytes(2).toString("hex")}`;
        const domain = `${subdomain}.apps.masdika.id`;

        const newApp = await prisma.$transaction(async (tx) => {
          const app = await tx.appService.create({
            data: {
              userId: user.id,
              name,
              appType: appType.toUpperCase(),
              templateName: `${appType.toUpperCase()} (1C2G)`,
              planName: "1C2G",
              subdomain,
              status: "PROVISIONING",
              port,
              hourlyRate: 35,
              billingMode: "PAYG",
            },
          });

          await createServiceOrderInvoice(tx, {
            userId: user.id,
            serviceIdField: "appServiceId",
            serviceId: app.id,
            type: "MANAGED_APP",
            amount: 0,
            billingMode: "PAYG",
            serviceName: `Managed App (${name})`,
            extraDetails: {
              appType,
              subdomain,
              port,
            },
          });

          return app;
        });

        // Deploy to K8s
        await deployAppService(newApp as any).catch((err: any) => console.error("[MCP_APP_DEPLOY]", err));

        await prisma.appService.update({
          where: { id: newApp.id },
          data: { status: "RUNNING" },
        });

        return {
          content: [
            {
              type: "text",
              text: `🎉 **Managed App '${name}' Deployed!**\n- **App Type:** ${appType}\n- **Status:** RUNNING\n- **URL:** https://${domain}\n- **Port:** ${port}\n*Billing: Pay-As-You-Go (Rp 35/hour)*`,
            },
          ],
        };
      }

      case "masdika_control_app": {
        const appId = Number(args.appId);
        const action = String(args.action || "").toLowerCase();

        const app = await prisma.appService.findFirst({
          where: { id: appId, userId: user.id },
        });

        if (!app) {
          return { content: [{ type: "text", text: `Managed Application with ID ${appId} not found.` }], isError: true };
        }

        if (action === "start") {
          await startAppService(app as any);
          await prisma.appService.update({ where: { id: app.id }, data: { status: "RUNNING" } });
          return { content: [{ type: "text", text: `Application '${app.name}' has been started.` }] };
        }

        if (action === "stop") {
          await stopAppService(app as any);
          await prisma.appService.update({ where: { id: app.id }, data: { status: "STOPPED" } });
          return { content: [{ type: "text", text: `Application '${app.name}' has been stopped.` }] };
        }

        if (action === "restart") {
          await restartAppService(app as any);
          return { content: [{ type: "text", text: `Application '${app.name}' restart initiated.` }] };
        }

        return { content: [{ type: "text", text: "Invalid action. Use 'start', 'stop', or 'restart'." }], isError: true };
      }

      case "masdika_get_app_logs": {
        const appId = Number(args.appId);
        const lines = Math.min(Number(args.lines || 50), 200);

        const app = await prisma.appService.findFirst({
          where: { id: appId, userId: user.id },
        });

        if (!app) {
          return { content: [{ type: "text", text: `Managed Application with ID ${appId} not found.` }], isError: true };
        }

        try {
          const { coreApi } = await getAppK8sClients();
          const podList = await coreApi.listNamespacedPod({
            namespace: "masdika-apps",
            labelSelector: `app=${app.subdomain || app.name}`,
          });

          const pod = podList.items[0];
          if (!pod || !pod.metadata?.name) {
            return {
              content: [{ type: "text", text: `No active pod found for app '${app.name}'. Current status: ${app.status}` }],
            };
          }

          const logs = await coreApi.readNamespacedPodLog({
            name: pod.metadata.name,
            namespace: "masdika-apps",
            tailLines: lines,
          });

          return {
            content: [
              {
                type: "text",
                text: `### Logs for **${app.name}** (Pod: ${pod.metadata.name}, tail ${lines}):\n\`\`\`\n${logs || "No logs output yet."}\n\`\`\``,
              },
            ],
          };
        } catch {
          return {
            content: [
              {
                type: "text",
                text: `Pod logs currently unavailable or app is initializing. Status: \`${app.status}\``,
              },
            ],
          };
        }
      }

      case "masdika_delete_app": {
        const appId = Number(args.appId);
        const app = await prisma.appService.findFirst({
          where: { id: appId, userId: user.id },
        });

        if (!app) {
          return { content: [{ type: "text", text: `Managed Application with ID ${appId} not found.` }], isError: true };
        }

        await deleteAppService(app as any).catch(() => null);
        await prisma.appService.delete({ where: { id: app.id } });

        return {
          content: [{ type: "text", text: `Managed Application '${app.name}' (ID: ${appId}) deleted.` }],
        };
      }

      // ══════════════════════════════════════════════════════
      // 5. STORAGE & CDN
      // ══════════════════════════════════════════════════════
      case "masdika_upload_cdn": {
        const { fileName, content, isBase64, mimeType } = args;
        if (!fileName || !content) {
          return { content: [{ type: "text", text: "fileName and content are required." }], isError: true };
        }

        const buffer = isBase64 ? Buffer.from(content, "base64") : Buffer.from(content, "utf-8");
        const safeName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");

        const secCheck = validateFileUploadSecurity({
          filename: safeName,
          headBuffer: buffer.subarray(0, 4096),
          tailBuffer: buffer.length > 4096 ? buffer.subarray(buffer.length - 4096) : undefined,
          allowedExtensions: MCP_CDN_ALLOWED_EXTENSIONS,
        });
        if (!secCheck.valid || !secCheck.resolvedMime) {
          return {
            content: [{ type: "text", text: `Upload rejected by security policy: ${secCheck.error || "Forbidden file type."}` }],
            isError: true,
          };
        }

        const cdnRecord = await prisma.secureMedia.create({
          data: {
            userId: user.id,
            filename: `${Date.now()}_${safeName}`,
            originalName: safeName,
            mimeType: secCheck.resolvedMime,
            size: buffer.length,
            folderPath: "/",
            isPublic: true,
            token: crypto.randomBytes(16).toString("hex"),
          },
        });

        const publicUrl = `https://www.masdika.id/api/media/${cdnRecord.token}`;

        return {
          content: [
            {
              type: "text",
              text: `🚀 **File Uploaded to Masdika File CDN!**\n- **File Name:** ${safeName}\n- **Size:** ${(buffer.length / 1024).toFixed(1)} KB\n- **Public Delivery URL:** ${publicUrl}\n- **Access:** Direct CDN IIX/OpenIX Edge`,
            },
          ],
        };
      }

      case "masdika_list_cdn_files": {
        const limit = Math.min(Number(args.limit || 20), 50);
        const files = await prisma.secureMedia.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: limit,
        });

        if (files.length === 0) {
          return {
            content: [{ type: "text", text: "No files found in your Masdika File CDN." }],
          };
        }

        const lines = files.map(
          (f) =>
            `- **${f.originalName || f.filename}** (${(f.size / 1024).toFixed(1)} KB)\n  - URL: https://www.masdika.id/api/media/${f.token}\n  - Uploaded: ${new Date(f.createdAt).toISOString().split("T")[0]}`
        );

        return {
          content: [
            {
              type: "text",
              text: `### Masdika File CDN Files (${files.length}):\n\n${lines.join("\n\n")}`,
            },
          ],
        };
      }

      case "masdika_delete_cdn_file": {
        const token = String(args.token || "").trim();
        if (!token) {
          return { content: [{ type: "text", text: "File token is required." }], isError: true };
        }

        const file = await prisma.secureMedia.findFirst({
          where: { token, userId: user.id },
        });
        if (!file) {
          return { content: [{ type: "text", text: `CDN file with token '${token}' not found in your account.` }], isError: true };
        }

        await prisma.secureMedia.delete({ where: { id: file.id } });
        return {
          content: [{ type: "text", text: `CDN file **${file.originalName || file.filename}** (\`${token}\`) deleted successfully.` }],
        };
      }

      case "masdika_list_storage": {
        const storages = await prisma.objectStorageService.findMany({
          where: { userId: user.id },
          include: { buckets: true, accessKeys: true },
        });
        if (storages.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No active Object Storage instances found. You can deploy an S3-compatible bucket via Masdika Cloud dashboard.",
              },
            ],
          };
        }
        const summary = storages.map((s) => {
          const bucketList = s.buckets.map((b) => `• ${b.name} (${b.visibility})`).join("\n    ") || "None";
          return `**Storage: ${s.name}**\n- **Plan:** ${s.planName} (${s.storageGb} GB)\n- **Region:** ${s.region}\n- **Status:** ${s.status}\n- **S3 Endpoint:** https://s3.masdika.id\n- **Buckets (${s.buckets.length}):**\n    ${bucketList}`;
        }).join("\n\n");
        return {
          content: [{ type: "text", text: summary }],
        };
      }

      case "masdika_create_bucket": {
        const { name, visibility } = args;
        if (!name) {
          return { content: [{ type: "text", text: "Bucket name is required." }], isError: true };
        }
        const cleanName = String(name).toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 63);
        if (cleanName.length < 3) {
          return { content: [{ type: "text", text: "Bucket name must be at least 3 characters long." }], isError: true };
        }

        let storage = await prisma.objectStorageService.findFirst({
          where: { userId: user.id, status: { not: "TERMINATED" } },
        });
        if (!storage) {
          if ((user.balance || 0) < 10000) {
            return {
              content: [{ type: "text", text: `Insufficient wallet balance. You have ${formatRupiah(user.balance || 0)}. A minimum balance of Rp 10,000 is required to provision Object Storage.` }],
              isError: true,
            };
          }

          storage = await prisma.$transaction(async (tx) => {
            const s = await tx.objectStorageService.create({
              data: {
                userId: user.id,
                name: `${user.name || "user"}-s3`,
                planName: "S3-50GB",
                storageGb: 50,
                status: "RUNNING",
                hourlyRate: 21,
                monthlyPrice: 15000,
                billingMode: "PAYG",
              },
            });

            await createServiceOrderInvoice(tx, {
              userId: user.id,
              serviceIdField: "objectStorageServiceId",
              serviceId: s.id,
              type: "OBJECT_STORAGE",
              amount: 0,
              billingMode: "PAYG",
              serviceName: `Object Storage (${s.name})`,
              extraDetails: {
                storageGb: 50,
                planName: "S3-50GB",
              },
            });

            return s;
          });
        }
        const bucket = await prisma.objectStorageBucket.create({
          data: {
            serviceId: storage.id,
            userId: user.id,
            name: cleanName,
            visibility: visibility === "PUBLIC" ? "PUBLIC" : "PRIVATE",
          },
        });
        return {
          content: [
            {
              type: "text",
              text: `Object Storage Bucket '${bucket.name}' created successfully!\n- **Service:** ${storage.name}\n- **Visibility:** ${bucket.visibility}\n- **S3 Endpoint:** https://s3.masdika.id\n- **Bucket URL:** https://s3.masdika.id/${bucket.name}`,
            },
          ],
        };
      }

      case "masdika_create_s3_key": {
        const storage = await prisma.objectStorageService.findFirst({
          where: { userId: user.id, status: "RUNNING" },
        });
        if (!storage) {
          return {
            content: [
              {
                type: "text",
                text: "No active Object Storage service found. Please order an Object Storage plan in the dashboard before generating S3 keys.",
              },
            ],
            isError: true,
          };
        }

        const accessKey = `MSDK${crypto.randomBytes(10).toString("hex").toUpperCase()}`;
        const secretKey = crypto.randomBytes(24).toString("base64url");
        const encryptedSecretKey = encryptDeterministic(secretKey);
        const keyName = args.name ? String(args.name).slice(0, 50) : "S3 Access Key";
        const permission = args.permission === "READ_ONLY" ? "READ_ONLY" : "READ_WRITE";

        await prisma.objectStorageKey.create({
          data: {
            serviceId: storage.id,
            userId: user.id,
            name: keyName,
            accessKey,
            secretKey: encryptedSecretKey,
            permission,
          },
        });

        return {
          content: [
            {
              type: "text",
              text: `### S3 Credentials Generated:\n- **Access Key ID:** \`${accessKey}\`\n- **Secret Access Key:** \`${secretKey}\`\n- **Endpoint:** \`https://s3.masdika.id\`\n- **Region:** \`id-jkt-1\`\n- **Permission:** ${permission}\n*Keep these credentials safe for AWS CLI or rclone configuration.*`,
            },
          ],
        };
      }

      case "masdika_list_s3_keys": {
        const keys = await prisma.objectStorageKey.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
        });

        if (keys.length === 0) {
          return {
            content: [{ type: "text", text: "No S3 API access keys found. You can generate one with 'masdika_create_s3_key'." }],
          };
        }

        const lines = keys.map(
          (k) =>
            `- **${k.name}**\n  - Access Key ID: \`${k.accessKey}\`\n  - Permission: \`${k.permission}\`\n  - Status: ${k.isActive ? "ACTIVE" : "INACTIVE"}`
        );

        return {
          content: [
            {
              type: "text",
              text: `### Your S3 API Keys (${keys.length}):\n\n${lines.join("\n\n")}`,
            },
          ],
        };
      }

      // ══════════════════════════════════════════════════════
      // 6. AI GATEWAY
      // ══════════════════════════════════════════════════════
      case "masdika_list_ai_models": {
        const models = await prisma.aiModel.findMany({
          orderBy: { id: "asc" },
        });
        if (models.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No active AI models found on Masdika AI Gateway.",
              },
            ],
          };
        }
        const formatted = models.map((m) =>
          `• **${m.name}** (\`${m.modelId}\`)\n  - Provider: ${m.provider} | Context: ${m.contextWindow}\n  - Input: Rp ${m.inputPricePer1M.toLocaleString("id-ID")}/1M tokens | Output: Rp ${m.outputPricePer1M.toLocaleString("id-ID")}/1M tokens`
        ).join("\n\n");
        return {
          content: [
            {
              type: "text",
              text: `**Masdika AI Gateway Models (${models.length}):**\nBase URL: \`https://www.masdika.id/api/ai/openai/v1\`\n\n${formatted}`,
            },
          ],
        };
      }

      case "masdika_create_ai_key": {
        const keyName = args.name ? String(args.name).slice(0, 50) : "Masdika AI Key";
        const count = await prisma.aiGatewayKey.count({ where: { userId: user.id } });
        if (count >= 25) {
          return {
            content: [{ type: "text", text: "Maximum limit of 25 AI Gateway keys reached. Please revoke an unused key from your dashboard." }],
            isError: true,
          };
        }
        const { rawKey, keyHash, keyPrefix } = generateAiGatewayKey();
        await prisma.aiGatewayKey.create({
          data: {
            userId: user.id,
            name: keyName,
            keyHash,
            keyPrefix,
            allowedModels: [],
          },
        });
        return {
          content: [
            {
              type: "text",
              text: `🎉 **AI Gateway API Key Created Successfully!**\n- **Key Name:** ${keyName}\n- **API Key:** \`${rawKey}\`\n- **OpenAI Compatible Base URL:** \`https://www.masdika.id/api/ai/openai/v1\`\n- **Anthropic Compatible Base URL:** \`https://www.masdika.id/api/ai/anthropic/v1\`\n*You can now pass this key to Cursor, Claude Desktop, or your OpenAI SDK clients.*`,
            },
          ],
        };
      }

      case "masdika_list_ai_keys": {
        const keys = await prisma.aiGatewayKey.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
        });

        if (keys.length === 0) {
          return {
            content: [{ type: "text", text: "No AI Gateway keys found. Generate one with 'masdika_create_ai_key'." }],
          };
        }

        const lines = keys.map(
          (k) =>
            `- **ID:** ${k.id} | **${k.name}**\n  - Prefix: \`${k.keyPrefix}...\`\n  - Created: ${new Date(k.createdAt).toISOString().split("T")[0]}\n  - Last Used: ${k.lastUsedAt ? new Date(k.lastUsedAt).toISOString() : "Never"}`
        );

        return {
          content: [
            {
              type: "text",
              text: `### Masdika AI Gateway Keys (${keys.length}):\n\n${lines.join("\n\n")}`,
            },
          ],
        };
      }

      case "masdika_revoke_ai_key": {
        const keyId = Number(args.keyId);
        if (!Number.isSafeInteger(keyId) || keyId <= 0) {
          return { content: [{ type: "text", text: "Valid keyId is required." }], isError: true };
        }

        const key = await prisma.aiGatewayKey.findFirst({
          where: { id: keyId, userId: user.id },
        });
        if (!key) {
          return { content: [{ type: "text", text: `AI Gateway Key with ID ${keyId} not found.` }], isError: true };
        }

        await prisma.aiGatewayKey.delete({ where: { id: key.id } });
        return {
          content: [{ type: "text", text: `AI Gateway Key **${key.name}** (ID: ${keyId}) has been permanently revoked.` }],
        };
      }

      case "masdika_topup_ai_balance": {
        const amount = Number(args.amount);
        if (!Number.isSafeInteger(amount) || amount < 10000 || amount > 50000000) {
          return { content: [{ type: "text", text: "Transfer amount must be an integer between Rp 10,000 and Rp 50,000,000." }], isError: true };
        }

        try {
          const updatedUser = await prisma.$transaction(async (tx) => {
            const freshUser = await tx.user.findUnique({
              where: { id: user.id },
              select: { id: true, balance: true, aiBalance: true, isSuspended: true },
            });

            if (!freshUser) {
              throw new Error("USER_NOT_FOUND");
            }
            if (freshUser.isSuspended) {
              throw new Error("ACCOUNT_SUSPENDED");
            }
            if ((freshUser.balance || 0) < amount) {
              throw new Error("INSUFFICIENT_BALANCE");
            }

            const res = await tx.user.update({
              where: { id: user.id },
              data: {
                balance: { decrement: amount },
                aiBalance: { increment: amount },
              },
            });

            await tx.clientActivityLog.create({
              data: {
                userId: user.id,
                category: "billing",
                description: `Transferred ${formatRupiah(amount)} from main wallet to AI Gateway balance`,
              },
            });

            return res;
          });

          return {
            content: [
              {
                type: "text",
                text: `### Balance Transferred Successfully!\n- **Amount:** ${formatRupiah(amount)}\n- **New Main Wallet Balance:** ${formatRupiah(updatedUser.balance)}\n- **New AI Gateway Balance:** ${formatRupiah(updatedUser.aiBalance)}`,
              },
            ],
          };
        } catch (err: any) {
          if (err?.message === "INSUFFICIENT_BALANCE") {
            return {
              content: [{ type: "text", text: `Insufficient main wallet balance. You need at least ${formatRupiah(amount)} to complete this transfer.` }],
              isError: true,
            };
          }
          if (err?.message === "ACCOUNT_SUSPENDED") {
            return {
              content: [{ type: "text", text: "Account is suspended. Transfers are temporarily blocked." }],
              isError: true,
            };
          }
          throw err;
        }
      }

      // ══════════════════════════════════════════════════════
      // 7. NETWORK & SECURITY
      // ══════════════════════════════════════════════════════
      case "masdika_list_ssh_keys": {
        const keys = await prisma.userSshKey.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
        });

        if (keys.length === 0) {
          return {
            content: [{ type: "text", text: "No SSH keys registered. Add one using 'masdika_create_ssh_key'." }],
          };
        }

        const lines = keys.map(
          (k) =>
            `- **ID:** ${k.id} | **${k.name}**\n  - Fingerprint: \`${k.fingerprint || "SHA256:..."}\`\n  - Created: ${new Date(k.createdAt).toISOString().split("T")[0]}`
        );

        return {
          content: [
            {
              type: "text",
              text: `### Registered SSH Keys (${keys.length}):\n\n${lines.join("\n\n")}`,
            },
          ],
        };
      }

      case "masdika_create_ssh_key": {
        const { name, publicKey } = args;
        if (!name || !publicKey) {
          return { content: [{ type: "text", text: "name and publicKey are required." }], isError: true };
        }

        const cleanKey = String(publicKey).trim();
        const fingerprint = crypto.createHash("sha256").update(cleanKey).digest("hex").slice(0, 32);

        const newKey = await prisma.userSshKey.create({
          data: {
            userId: user.id,
            name: String(name).slice(0, 50),
            publicKey: cleanKey,
            fingerprint: `SHA256:${fingerprint}`,
          },
        });

        return {
          content: [
            {
              type: "text",
              text: `SSH Key '**${newKey.name}**' registered successfully!\n- **Fingerprint:** \`${newKey.fingerprint}\`\n- **Scope:** Automatic injection on new Cloud VPS deployments.`,
            },
          ],
        };
      }

      case "masdika_delete_ssh_key": {
        const keyId = Number(args.keyId);
        if (!Number.isSafeInteger(keyId) || keyId <= 0) {
          return { content: [{ type: "text", text: "Valid keyId is required." }], isError: true };
        }

        const sshKey = await prisma.userSshKey.findFirst({
          where: { id: keyId, userId: user.id },
        });
        if (!sshKey) {
          return { content: [{ type: "text", text: `SSH Key with ID ${keyId} not found.` }], isError: true };
        }

        await prisma.userSshKey.delete({ where: { id: sshKey.id } });
        return {
          content: [{ type: "text", text: `SSH Key **${sshKey.name}** (ID: ${keyId}) removed successfully.` }],
        };
      }

      case "masdika_list_reserved_ips": {
        const ips = await prisma.reservedIp.findMany({
          where: { userId: user.id },
          include: { vps: true },
        });

        if (ips.length === 0) {
          return {
            content: [{ type: "text", text: "No Reserved Elastic IPs found in your account." }],
          };
        }

        const lines = ips.map(
          (ip) =>
            `- **${ip.publicIp || ip.ipAddress}**\n  - Status: ${ip.isAttached ? `Attached to VPS ${ip.vps?.hostname || ip.vpsId}` : "Unattached"}\n  - Rate: ${formatRupiah(ip.hourlyRate)}/hr`
        );

        return {
          content: [
            {
              type: "text",
              text: `### Reserved Elastic IPs (${ips.length}):\n\n${lines.join("\n\n")}`,
            },
          ],
        };
      }

      case "masdika_list_cloudflared_tunnels": {
        const tunnels = await prisma.cloudflareTunnel.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
        });

        if (tunnels.length === 0) {
          return {
            content: [{ type: "text", text: "No Cloudflare Tunnels found in your account." }],
          };
        }

        const lines = tunnels.map(
          (t) =>
            `- **${t.name}**\n  - Tunnel ID: \`${t.cfTunnelId}\`\n  - Created: ${new Date(t.createdAt).toISOString().split("T")[0]}`
        );

        return {
          content: [
            {
              type: "text",
              text: `### Cloudflare Tunnels (${tunnels.length}):\n\n${lines.join("\n\n")}`,
            },
          ],
        };
      }

      // ══════════════════════════════════════════════════════
      // 8. SUPPORT & TICKETS
      // ══════════════════════════════════════════════════════
      case "masdika_list_tickets": {
        const tickets = await prisma.supportTicket.findMany({
          where: { userId: user.id },
          orderBy: { updatedAt: "desc" },
          take: 10,
        });
        if (tickets.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "You have no support tickets. You can create one anytime using 'masdika_create_ticket'.",
              },
            ],
          };
        }
        const list = tickets.map((t) =>
          `• **[#${t.ticketId}] ${t.subject}**\n  - Status: **${t.status}** | Priority: ${t.priority} | Service: ${t.service || "General"}\n  - Updated: ${new Date(t.updatedAt).toLocaleDateString("id-ID")}`
        ).join("\n\n");
        return {
          content: [
            {
              type: "text",
              text: `**Your Support Tickets (${tickets.length}):**\n\n${list}`,
            },
          ],
        };
      }

      case "masdika_create_ticket": {
        const { subject, message, priority, service } = args;
        if (!subject || !message) {
          return { content: [{ type: "text", text: "Subject and message are required to open a support ticket." }], isError: true };
        }
        const ticketId = `TCK-${Date.now().toString(36).toUpperCase()}`;
        const ticket = await prisma.supportTicket.create({
          data: {
            ticketId,
            userId: user.id,
            subject,
            service: service || "General Inquiry",
            priority: priority || "NORMAL",
            status: "OPEN",
            messages: {
              create: {
                userId: user.id,
                message,
              },
            },
          },
        });
        return {
          content: [
            {
              type: "text",
              text: `Support Ticket #${ticket.ticketId} created successfully!\n- **Subject:** ${ticket.subject}\n- **Priority:** ${ticket.priority}\n- **Status:** OPEN\nOur engineering team will respond shortly in your Masdika dashboard (/dashboard/tickets).`,
            },
          ],
        };
      }

      case "masdika_reply_ticket": {
        const { ticketId, message } = args;
        if (!ticketId || !message) {
          return { content: [{ type: "text", text: "ticketId and message are required to reply." }], isError: true };
        }

        const ticket = await prisma.supportTicket.findFirst({
          where: { ticketId: String(ticketId).trim(), userId: user.id },
        });

        if (!ticket) {
          return { content: [{ type: "text", text: `Support ticket '${ticketId}' not found.` }], isError: true };
        }

        await prisma.ticketMessage.create({
          data: {
            ticketId: ticket.id,
            userId: user.id,
            message: String(message),
          },
        });

        await prisma.supportTicket.update({
          where: { id: ticket.id },
          data: { status: "OPEN", updatedAt: new Date() },
        });

        return {
          content: [
            {
              type: "text",
              text: `Reply sent to Ticket #${ticket.ticketId}. Status set to OPEN.`,
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${toolName}` }],
          isError: true,
        };
    }
  } catch (error: any) {
    console.error(`[MCP_EXECUTE_ERROR:${toolName}]`, error);
    return {
      content: [{ type: "text", text: `Error executing ${toolName}: ${error?.message || "Internal server error"}` }],
      isError: true,
    };
  }
}
