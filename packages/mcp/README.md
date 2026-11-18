# Masdika Cloud MCP Server (`@masdika/mcp`)

Official Model Context Protocol (MCP) server for **Masdika Cloud**.  
Connect AI coding assistants (**Cursor IDE, Claude Desktop, Antigravity, Windsurf, Claude Code CLI, and autonomous AI agents**) directly to your Masdika Cloud infrastructure via natural language.

---

## Quick Start

### 1. Generate Your Masdika MCP Key
1. Open [https://www.masdika.id/dashboard/mcp](https://www.masdika.id/dashboard/mcp).
2. Click **Generate MCP Key** (1 active MCP key per account).
3. Copy your `masdika_...` API key and keep it private.

---

## Client Configuration

### Cursor IDE
Add to `~/.cursor/mcp.json` (or **Cursor Settings > Features > MCP > Add New MCP Server**):

```json
{
  "mcpServers": {
    "masdika": {
      "command": "npx",
      "args": ["-y", "@masdika/mcp"],
      "env": {
        "MASDIKA_API_KEY": "masdika_YOUR_API_KEY_HERE"
      }
    }
  }
}
```

### Claude Desktop
Add to your `claude_desktop_config.json`:
* **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
* **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "masdika": {
      "command": "npx",
      "args": ["-y", "@masdika/mcp"],
      "env": {
        "MASDIKA_API_KEY": "masdika_YOUR_API_KEY_HERE"
      }
    }
  }
}
```

### Windsurf IDE
Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "masdika": {
      "command": "npx",
      "args": ["-y", "@masdika/mcp"],
      "env": {
        "MASDIKA_API_KEY": "masdika_YOUR_API_KEY_HERE"
      }
    }
  }
}
```

### Antigravity / Gemini CLI
Add to `antigravity.mcp.json`:

```json
{
  "mcpServers": {
    "masdika": {
      "command": "npx",
      "args": ["-y", "@masdika/mcp"],
      "env": {
        "MASDIKA_API_KEY": "masdika_YOUR_API_KEY_HERE"
      }
    }
  }
}
```

### Claude Code CLI
Run in your terminal:
```bash
export MASDIKA_API_KEY="masdika_YOUR_API_KEY_HERE"
claude mcp add masdika -- npx -y @masdika/mcp
```

---

## Available Tools (45 Tools)

### 1. Billing & Account (5)
| Tool | Description |
| :--- | :--- |
| `masdika_get_account` | Check profile, main wallet balance (Rupiah), AI Gateway balance, and active service counts. |
| `masdika_create_topup` | Generate instant wallet top-up invoice via QRIS or Bank Virtual Account (BCA, Mandiri, BRI, BNI). |
| `masdika_check_invoice` | Check payment status (PAID, PENDING, EXPIRED) and details of an invoice by invoice number. |
| `masdika_list_invoices` | List recent invoices with total amounts, payment methods, and timestamps. |
| `masdika_check_voucher` | Validate a promotional voucher or discount code before applying it. |

### 2. Cloud VPS (10)
| Tool | Description |
| :--- | :--- |
| `masdika_list_vps` | List all Cloud VPS instances including status, public IP address, CPU, RAM, Disk, and hourly rate. |
| `masdika_control_vps` | Start, stop, reboot, or query live power status of a Cloud VPS instance. |
| `masdika_get_vps_metrics` | Get real-time CPU, RAM, Disk, and Network I/O performance metrics for a Cloud VPS. |
| `masdika_upgrade_vps` | Scale up CPU cores, RAM, or SSD storage on an active Cloud VPS instance. |
| `masdika_reinstall_vps` | Reinstall clean OS image on a Cloud VPS (Ubuntu, Debian, Rocky Linux, Windows Server). |
| `masdika_create_vps_snapshot` | Take a point-in-time snapshot backup of a Cloud VPS before making changes. |
| `masdika_list_vps_snapshots` | List all existing snapshots and rollback points created for a Cloud VPS. |
| `masdika_reset_vps_password` | Reset the root/administrator password for a Cloud VPS instance. |
| `masdika_list_vps_firewall` | List all active Proxmox firewall rules (inbound/outbound) configured on a Cloud VPS. |
| `masdika_add_vps_firewall` | Add a new inbound or outbound firewall rule (`ACCEPT`, `DROP`, `REJECT`) to a Cloud VPS. |

### 3. Managed Database (5)
| Tool | Description |
| :--- | :--- |
| `masdika_list_databases` | List all Managed Databases (PostgreSQL, MySQL, MariaDB, Redis, MongoDB) and endpoints. |
| `masdika_create_database` | Provision a new Managed Database on the Masdika Kubernetes cluster and return credentials. |
| `masdika_control_database` | Start, stop, or restart a Managed Database instance. |
| `masdika_get_database_connection` | Retrieve connection URI, host, port, username, and password for a Managed Database. |
| `masdika_delete_database` | Permanently deprovision and delete a Managed Database instance. |

### 4. Managed Applications (5)
| Tool | Description |
| :--- | :--- |
| `masdika_list_apps` | List all Managed Applications (OmniRoute, n8n, 9Router, OpenClaw, Hermes Agent, OpenCode, WordPress). |
| `masdika_deploy_app` | Deploy a Managed Application in seconds with automated HTTPS subdomain provisioning. |
| `masdika_control_app` | Start, stop, or restart a Managed Application container. |
| `masdika_get_app_logs` | Fetch live stdout/stderr Kubernetes pod logs from a running Managed Application. |
| `masdika_delete_app` | Terminate and delete a Managed Application instance. |

### 5. Storage & File CDN (7)
| Tool | Description |
| :--- | :--- |
| `masdika_upload_cdn` | Upload files, scripts, or images directly to Masdika File CDN and get a public delivery URL. |
| `masdika_list_cdn_files` | List recent files and media uploaded to Masdika File CDN with download URLs and sizes. |
| `masdika_delete_cdn_file` | Delete a previously uploaded file from Masdika File CDN by token. |
| `masdika_list_storage` | List S3-compatible Object Storage services, buckets, and endpoints. |
| `masdika_create_bucket` | Create a new private or public S3-compatible Object Storage bucket. |
| `masdika_create_s3_key` | Generate S3 API credentials (`Access Key ID` and `Secret Access Key`) for AWS CLI or rclone. |
| `masdika_list_s3_keys` | List active S3 Object Storage API access keys and permissions. |

### 6. AI Token Gateway (5)
| Tool | Description |
| :--- | :--- |
| `masdika_list_ai_models` | List all active AI & LLM models (DeepSeek, Qwen, Gemini, Claude, Llama) with token pricing. |
| `masdika_create_ai_key` | Generate a new Masdika AI Gateway API Key (`masdika_ai_...`) for OpenAI/Anthropic compatible SDKs. |
| `masdika_list_ai_keys` | List all generated Masdika AI Gateway API Keys on your account. |
| `masdika_revoke_ai_key` | Revoke and permanently delete an AI Gateway API Key by ID. |
| `masdika_topup_ai_balance` | Transfer balance from your main Masdika Wallet directly into your AI Gateway balance. |

### 7. Network & Security (5)
| Tool | Description |
| :--- | :--- |
| `masdika_list_ssh_keys` | List all registered SSH public keys used for passwordless Cloud VPS authentication. |
| `masdika_create_ssh_key` | Add a new SSH public key to your Masdika account. |
| `masdika_delete_ssh_key` | Remove a registered SSH public key from your account by ID. |
| `masdika_list_reserved_ips` | List Elastic Static Reserved IP addresses and see their VPS attachments. |
| `masdika_list_cloudflared_tunnels` | List all Cloudflare Tunnels configured in your account with Tunnel IDs. |

### 8. Support & Tickets (3)
| Tool | Description |
| :--- | :--- |
| `masdika_list_tickets` | List recent support tickets and inquiries with status and priority. |
| `masdika_create_ticket` | Open a new support ticket with Masdika Cloud technical or billing engineers. |
| `masdika_reply_ticket` | Send a reply or follow-up message to an open support ticket. |

---

## Example AI Prompts

You can speak naturally to your AI editor:

* *"Check my Masdika wallet balance and active services."*
* *"Generate a QRIS invoice for Rp 50,000 wallet top up."*
* *"Create a new PostgreSQL database named 'production-db' and save its connection string to `.env.local`."*
* *"Open inbound TCP port 8080 on VPS 12 in the firewall."*
* *"Generate an AI Gateway API Key named 'Cursor Key' so I can use DeepSeek and Qwen in my IDE."*
* *"Upload `assets/logo.png` to Masdika File CDN and replace the image source in my code."*

---

## License
MIT © [Masdika Cloud](https://www.masdika.id)
