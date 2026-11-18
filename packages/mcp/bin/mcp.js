#!/usr/bin/env node

/**
 * Official Masdika Cloud Model Context Protocol (MCP) Server
 * Connects Cursor, Claude Desktop, Antigravity, and AI Agents to Masdika Cloud infrastructure.
 */

const readline = require("readline");
const https = require("https");
const http = require("http");

const DEFAULT_API_URL = process.env.MASDIKA_API_URL || "https://www.masdika.id/api/v1/mcp";

// Extract API Key from env or command args
let apiKey = process.env.MASDIKA_API_KEY || "";
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if ((args[i] === "--key" || args[i] === "--api-key") && args[i + 1]) {
    apiKey = args[i + 1];
    break;
  }
}

// Fallback Tool definitions for offline discovery or initial handshake
const FALLBACK_TOOLS = [
  // ── 1. BILLING & ACCOUNT ──
  {
    name: "masdika_get_account",
    description: "Get current Masdika Cloud account profile, live wallet balance (Rupiah), AI balance, and active service counts.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "masdika_create_topup",
    description: "Generate an instant top-up invoice for Masdika Wallet with QRIS or Bank Virtual Account (BCA, Mandiri, BRI, BNI).",
    inputSchema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Top-up amount in Rupiah (min: 10,000, max: 50,000,000)." },
        paymentMethod: { type: "string", description: "Payment method code: 'QRIS', 'BCA', 'MANDIRI', 'BRI', 'BNI', or 'PERMATA' (default: 'QRIS')." },
      },
      required: ["amount"],
    },
  },
  {
    name: "masdika_check_invoice",
    description: "Check the payment status (PAID, PENDING, EXPIRED) and details of a Masdika Cloud invoice by invoice number.",
    inputSchema: {
      type: "object",
      properties: {
        invoiceNumber: { type: "string", description: "The invoice number, e.g., 'INV-TOPUP-...' or 'TOPUP-...'." },
      },
      required: ["invoiceNumber"],
    },
  },
  {
    name: "masdika_list_invoices",
    description: "List recent invoices (PAID, PENDING, EXPIRED) with total amounts, payment methods, and timestamps.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Maximum number of invoices to return (default: 10, max: 50)." },
        status: { type: "string", enum: ["ALL", "PAID", "PENDING", "EXPIRED"], description: "Filter by status (default: 'ALL')." },
      },
    },
  },
  {
    name: "masdika_check_voucher",
    description: "Validate a promotional voucher code or referral discount before applying it to your account.",
    inputSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "Voucher code (e.g. 'PROMO2026', 'WELCOME')." },
      },
      required: ["code"],
    },
  },

  // ── 2. CLOUD VPS ──
  {
    name: "masdika_list_vps",
    description: "List all Cloud VPS instances owned by the account including status, public IP address, CPU cores, RAM, and Disk specifications.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "masdika_control_vps",
    description: "Control power state of a Cloud VPS instance (start, stop, reboot, or check live status).",
    inputSchema: {
      type: "object",
      properties: {
        vpsId: { type: "number", description: "The ID of the VPS instance." },
        action: { type: "string", enum: ["start", "stop", "reboot", "status"], description: "Action to perform: 'start', 'stop', 'reboot', or 'status'." },
      },
      required: ["vpsId", "action"],
    },
  },
  {
    name: "masdika_get_vps_metrics",
    description: "Get real-time performance metrics (CPU percentage, memory usage, disk I/O, network traffic) for a Cloud VPS.",
    inputSchema: {
      type: "object",
      properties: {
        vpsId: { type: "number", description: "The ID of the VPS instance." },
      },
      required: ["vpsId"],
    },
  },
  {
    name: "masdika_upgrade_vps",
    description: "Upgrade or resize CPU cores, RAM, or Disk storage on an active Cloud VPS instance.",
    inputSchema: {
      type: "object",
      properties: {
        vpsId: { type: "number", description: "The ID of the VPS instance to upgrade." },
        cpuCores: { type: "number", description: "Target number of CPU cores (e.g. 2, 4, 8)." },
        ramGb: { type: "number", description: "Target RAM size in GB (e.g. 2, 4, 8, 16)." },
        diskGb: { type: "number", description: "Target Disk size in GB (e.g. 40, 80, 160)." },
      },
      required: ["vpsId"],
    },
  },
  {
    name: "masdika_reinstall_vps",
    description: "Reinstall clean OS image on a Cloud VPS instance (Ubuntu 24.04, Debian 12, Rocky Linux 9, Windows Server, etc.).",
    inputSchema: {
      type: "object",
      properties: {
        vpsId: { type: "number", description: "The ID of the VPS instance to reinstall." },
        templateName: { type: "string", description: "Target OS template name (e.g. 'ubuntu-24.04-standard', 'debian-12-standard', 'rockylinux-9-standard')." },
        password: { type: "string", description: "New root/administrator password (minimum 8 characters with letters and numbers)." },
      },
      required: ["vpsId", "templateName", "password"],
    },
  },
  {
    name: "masdika_create_vps_snapshot",
    description: "Take a point-in-time snapshot backup of a Cloud VPS before making configuration changes.",
    inputSchema: {
      type: "object",
      properties: {
        vpsId: { type: "number", description: "The ID of the VPS instance." },
        snapshotName: { type: "string", description: "Unique name for the snapshot (alphanumeric, e.g. 'pre_update_snap')." },
        description: { type: "string", description: "Optional description explaining the snapshot purpose." },
      },
      required: ["vpsId", "snapshotName"],
    },
  },
  {
    name: "masdika_list_vps_snapshots",
    description: "List all existing snapshots and rollback points created for a Cloud VPS instance.",
    inputSchema: {
      type: "object",
      properties: {
        vpsId: { type: "number", description: "The ID of the VPS instance." },
      },
      required: ["vpsId"],
    },
  },
  {
    name: "masdika_reset_vps_password",
    description: "Reset the root/administrator password for a Cloud VPS instance.",
    inputSchema: {
      type: "object",
      properties: {
        vpsId: { type: "number", description: "The ID of the VPS instance." },
        password: { type: "string", description: "New root/administrator password (min 8 chars)." },
      },
      required: ["vpsId", "password"],
    },
  },
  {
    name: "masdika_list_vps_firewall",
    description: "List all active Proxmox firewall rules (inbound/outbound) configured for a Cloud VPS instance.",
    inputSchema: {
      type: "object",
      properties: {
        vpsId: { type: "number", description: "The ID of the VPS instance." },
      },
      required: ["vpsId"],
    },
  },
  {
    name: "masdika_add_vps_firewall",
    description: "Add a new inbound or outbound firewall rule (ACCEPT/DROP/REJECT) to a Cloud VPS instance.",
    inputSchema: {
      type: "object",
      properties: {
        vpsId: { type: "number", description: "The ID of the VPS instance." },
        type: { type: "string", enum: ["in", "out"], description: "Traffic direction: 'in' (inbound) or 'out' (outbound)." },
        action: { type: "string", enum: ["ACCEPT", "DROP", "REJECT"], description: "Rule action: 'ACCEPT', 'DROP', or 'REJECT'." },
        proto: { type: "string", enum: ["tcp", "udp", "icmp", "any"], description: "Network protocol (e.g. 'tcp', 'udp')." },
        dport: { type: "string", description: "Destination port or range (e.g. '80', '443', '8000:8080')." },
        source: { type: "string", description: "Optional source IP or CIDR." },
        comment: { type: "string", description: "Optional rule comment." },
      },
      required: ["vpsId", "type", "action"],
    },
  },

  // ── 3. MANAGED DATABASE ──
  {
    name: "masdika_list_databases",
    description: "List all Managed Databases (PostgreSQL, MySQL, Redis, MongoDB) including connection endpoints, ports, and status.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "masdika_create_database",
    description: "Provision a new Managed Database (PostgreSQL, MySQL, or Redis) on Masdika Cloud Kubernetes cluster.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Instance name for the database (e.g. 'my-app-db')." },
        dbType: { type: "string", enum: ["POSTGRES", "MYSQL", "MARIADB", "MONGODB"], description: "Database engine: 'POSTGRES', 'MYSQL', 'MARIADB', or 'MONGODB'." },
        planName: { type: "string", description: "Plan name: 'Starter' (1GB RAM, 10GB SSD) or 'Developer' (2GB RAM, 25GB SSD). Default: 'Starter'." },
      },
      required: ["name", "dbType"],
    },
  },
  {
    name: "masdika_control_database",
    description: "Control power state of a Managed Database on Kubernetes (start, stop, or restart).",
    inputSchema: {
      type: "object",
      properties: {
        dbId: { type: "number", description: "The ID of the Managed Database instance." },
        action: { type: "string", enum: ["start", "stop", "restart"], description: "Action to perform: 'start', 'stop', or 'restart'." },
      },
      required: ["dbId", "action"],
    },
  },
  {
    name: "masdika_get_database_connection",
    description: "Retrieve connection string, host, port, username, and password for a Managed Database.",
    inputSchema: {
      type: "object",
      properties: {
        dbId: { type: "number", description: "The ID of the Managed Database instance." },
      },
      required: ["dbId"],
    },
  },
  {
    name: "masdika_delete_database",
    description: "Safely delete and deprovision a Managed Database instance from Kubernetes cluster.",
    inputSchema: {
      type: "object",
      properties: {
        dbId: { type: "number", description: "The ID of the Managed Database to delete." },
      },
      required: ["dbId"],
    },
  },

  // ── 4. MANAGED APPLICATIONS ──
  {
    name: "masdika_list_apps",
    description: "List all Managed Applications (n8n, OmniRoute, 9Router, OpenClaw, Hermes Agent, OpenCode, WordPress) deployed on Masdika.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "masdika_deploy_app",
    description: "Deploy a high-availability Managed Application on Masdika Kubernetes cluster (OmniRoute, n8n, 9Router, OpenClaw, etc.).",
    inputSchema: {
      type: "object",
      properties: {
        appType: { type: "string", enum: ["omniroute", "n8n", "9router", "openclaw", "hermes", "opencode", "wordpress"], description: "Application engine type." },
        name: { type: "string", description: "Instance name for the application." },
      },
      required: ["appType", "name"],
    },
  },
  {
    name: "masdika_control_app",
    description: "Control power state of a Managed Application on Kubernetes (start, stop, or restart).",
    inputSchema: {
      type: "object",
      properties: {
        appId: { type: "number", description: "The ID of the Managed Application instance." },
        action: { type: "string", enum: ["start", "stop", "restart"], description: "Action to perform: 'start', 'stop', or 'restart'." },
      },
      required: ["appId", "action"],
    },
  },
  {
    name: "masdika_get_app_logs",
    description: "Fetch real-time pod/container logs for a Managed Application to debug runtime errors.",
    inputSchema: {
      type: "object",
      properties: {
        appId: { type: "number", description: "The ID of the Managed Application instance." },
        lines: { type: "number", description: "Number of tail log lines to fetch (default: 50, max: 200)." },
      },
      required: ["appId"],
    },
  },
  {
    name: "masdika_delete_app",
    description: "Safely terminate and remove a Managed Application from Kubernetes cluster.",
    inputSchema: {
      type: "object",
      properties: {
        appId: { type: "number", description: "The ID of the Managed Application to delete." },
      },
      required: ["appId"],
    },
  },

  // ── 5. STORAGE & CDN ──
  {
    name: "masdika_upload_cdn",
    description: "Upload a file or script directly to Masdika File CDN and receive an instant, high-speed public CDN delivery link.",
    inputSchema: {
      type: "object",
      properties: {
        fileName: { type: "string", description: "File name with extension (e.g. 'index.html', 'schema.sql', 'banner.png')." },
        content: { type: "string", description: "File content as plain text or base64 encoded string." },
        isBase64: { type: "boolean", description: "Set to true if content is base64 encoded." },
        mimeType: { type: "string", description: "MIME type (e.g. 'text/plain', 'image/png', 'application/json')." },
      },
      required: ["fileName", "content"],
    },
  },
  {
    name: "masdika_list_cdn_files",
    description: "List recent files and media uploaded to Masdika File CDN with download URLs and file sizes.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Number of files to return (default: 20, max: 50)." },
      },
    },
  },
  {
    name: "masdika_delete_cdn_file",
    description: "Delete a previously uploaded file from Masdika File CDN by its token or file ID.",
    inputSchema: {
      type: "object",
      properties: {
        token: { type: "string", description: "The public token or file ID of the CDN asset to delete." },
      },
      required: ["token"],
    },
  },
  {
    name: "masdika_list_storage",
    description: "List S3-compatible Object Storage services, storage consumption, buckets, and S3 API endpoint.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "masdika_create_bucket",
    description: "Create a new S3-compatible Object Storage bucket on Masdika Cloud.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Globally unique bucket name (e.g. 'my-app-backups')." },
        visibility: { type: "string", enum: ["PRIVATE", "PUBLIC"], description: "Bucket visibility: 'PRIVATE' or 'PUBLIC' (default: 'PRIVATE')." },
      },
      required: ["name"],
    },
  },
  {
    name: "masdika_create_s3_key",
    description: "Generate S3 API credentials (Access Key ID & Secret Access Key) to connect AWS CLI, rclone, or MinIO clients.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Friendly key identifier (e.g. 'Backup Script Key')." },
        permission: { type: "string", enum: ["READ_WRITE", "READ_ONLY"], description: "Access permission (default: 'READ_WRITE')." },
      },
    },
  },
  {
    name: "masdika_list_s3_keys",
    description: "List active S3 Object Storage API access keys and credentials.",
    inputSchema: { type: "object", properties: {} },
  },

  // ── 6. AI GATEWAY ──
  {
    name: "masdika_list_ai_models",
    description: "List all active AI & LLM models (DeepSeek, Qwen, Gemini, Claude, Llama) with live token pricing on Masdika AI Gateway.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "masdika_create_ai_key",
    description: "Generate a new Masdika AI Gateway API Key (masdika_ai_...) to connect Cursor, Claude, OpenAI SDK, and aider directly to models like Qwen 2.5, DeepSeek, and Gemini.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Friendly name for the key (e.g. 'Cursor Key', 'Dev Script Key'). Default: 'Masdika AI Key'." },
      },
    },
  },
  {
    name: "masdika_list_ai_keys",
    description: "List all generated Masdika AI Gateway API Keys on your account.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "masdika_revoke_ai_key",
    description: "Revoke and permanently delete a Masdika AI Gateway API Key by ID.",
    inputSchema: {
      type: "object",
      properties: {
        keyId: { type: "number", description: "The ID of the AI Gateway key to revoke." },
      },
      required: ["keyId"],
    },
  },
  {
    name: "masdika_topup_ai_balance",
    description: "Transfer balance from your main Masdika Wallet directly into your AI Gateway balance for LLM token usage.",
    inputSchema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Amount in Rupiah to transfer (min: 10,000)." },
      },
      required: ["amount"],
    },
  },

  // ── 7. NETWORK & SECURITY ──
  {
    name: "masdika_list_ssh_keys",
    description: "List all registered SSH public keys on your account used for passwordless Cloud VPS authentication.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "masdika_create_ssh_key",
    description: "Add a new SSH public key to your Masdika account for passwordless Cloud VPS authentication.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name/label for the SSH key (e.g. 'MacBook Pro Key')." },
        publicKey: { type: "string", description: "OpenSSH public key string (e.g. 'ssh-ed25519 AAAAC3...')." },
      },
      required: ["name", "publicKey"],
    },
  },
  {
    name: "masdika_delete_ssh_key",
    description: "Remove a registered SSH public key from your Masdika Cloud account.",
    inputSchema: {
      type: "object",
      properties: {
        keyId: { type: "number", description: "The ID of the SSH key to delete." },
      },
      required: ["keyId"],
    },
  },
  {
    name: "masdika_list_reserved_ips",
    description: "List Elastic Static Reserved IP addresses and see which VPS instance each IP is attached to.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "masdika_list_cloudflared_tunnels",
    description: "List all active Cloudflare Tunnels configured on your account, including tunnel IDs and public hostnames.",
    inputSchema: { type: "object", properties: {} },
  },

  // ── 8. SUPPORT ──
  {
    name: "masdika_list_tickets",
    description: "List recent support tickets and inquiries opened by the user with status and priority.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "masdika_create_ticket",
    description: "Open a new support ticket with Masdika Cloud technical and billing support engineers.",
    inputSchema: {
      type: "object",
      properties: {
        subject: { type: "string", description: "Ticket subject or title summarizing the inquiry." },
        message: { type: "string", description: "Detailed message description of the issue or question." },
        priority: { type: "string", enum: ["LOW", "NORMAL", "HIGH", "URGENT"], description: "Ticket priority level (default: 'NORMAL')." },
        service: { type: "string", description: "Related service (e.g. 'Cloud VPS', 'Managed Database', 'AI Gateway', 'Billing')." },
      },
      required: ["subject", "message"],
    },
  },
  {
    name: "masdika_reply_ticket",
    description: "Send a reply or additional message to an open support ticket.",
    inputSchema: {
      type: "object",
      properties: {
        ticketId: { type: "string", description: "The ticket ID, e.g. 'TCK-XXXXX'." },
        message: { type: "string", description: "Message reply content." },
      },
      required: ["ticketId", "message"],
    },
  },
];

function sendJson(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

function sendError(id, code, message) {
  sendJson({
    jsonrpc: "2.0",
    id,
    error: { code, message },
  });
}

function forwardToMasdika(payload) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(DEFAULT_API_URL);
    const client = urlObj.protocol === "http:" ? http : https;
    const bodyStr = JSON.stringify(payload);

    const req = client.request(
      urlObj,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(bodyStr),
          Authorization: `Bearer ${apiKey}`,
          "User-Agent": "Masdika-MCP/1.0.0",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (e) {
            resolve({
              jsonrpc: "2.0",
              id: payload.id,
              result: {
                content: [{ type: "text", text: data || `HTTP status ${res.statusCode}` }],
                isError: res.statusCode >= 400,
              },
            });
          }
        });
      }
    );

    req.on("error", (err) => {
      reject(err);
    });

    req.write(bodyStr);
    req.end();
  });
}

// Stdio JSON-RPC Listener Loop
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on("line", async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  let message;
  try {
    message = JSON.parse(trimmed);
  } catch (err) {
    sendError(null, -32700, "Parse error");
    return;
  }

  const { id, method, params } = message;

  // Handle standard MCP lifecycle
  if (method === "initialize") {
    sendJson({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {
            listChanged: false,
          },
        },
        serverInfo: {
          name: "masdika-mcp",
          version: "1.0.0",
        },
      },
    });
    return;
  }

  if (method === "notifications/initialized") {
    // Protocol notification acknowledgment, no response required
    return;
  }

  if (method === "tools/list") {
    // Try fetching live tools from API, fall back if offline
    try {
      const remoteRes = await forwardToMasdika({ jsonrpc: "2.0", id, method: "tools/list" });
      if (remoteRes && remoteRes.result && remoteRes.result.tools) {
        sendJson(remoteRes);
        return;
      }
    } catch {
      // ignore, fall back to local schema
    }

    sendJson({
      jsonrpc: "2.0",
      id,
      result: {
        tools: FALLBACK_TOOLS,
      },
    });
    return;
  }

  if (method === "tools/call") {
    if (!apiKey) {
      sendJson({
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: "⚠️ MASDIKA_API_KEY is not set.\nPlease obtain your API Key from https://www.masdika.id/dashboard/mcp and configure it in your MCP settings.",
            },
          ],
          isError: true,
        },
      });
      return;
    }

    try {
      const response = await forwardToMasdika({
        jsonrpc: "2.0",
        id,
        method: "tools/call",
        params,
      });
      sendJson(response);
    } catch (err) {
      sendJson({
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: `Network error connecting to Masdika Cloud: ${err.message}`,
            },
          ],
          isError: true,
        },
      });
    }
    return;
  }

  // Unknown method
  sendError(id, -32601, `Method not found: ${method}`);
});

process.stderr.write("[Masdika MCP] Server running on stdio transport.\n");
