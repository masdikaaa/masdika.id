# Masdika Cloud MCP Server

Official Model Context Protocol (MCP) server for **Masdika Cloud**.  
Allows AI coding assistants (**Cursor IDE, Claude Desktop, Antigravity, Windsurf, Claude Code CLI, and AI Agents**) to manage and interact directly with Masdika Cloud infrastructure.

---

## ⚡ Quick Start

### 1. Obtain Your Masdika API Key
1. Go to [https://www.masdika.id/dashboard/mcp](https://www.masdika.id/dashboard/mcp) or `/dashboard/api-keys`.
2. Generate an API Key with `MCP` or `ALL` scope.
3. Keep the key (`masdika_...`) secure.

---

## 🛠️ Client Configuration

### Cursor IDE
Add to `~/.cursor/mcp.json` (or **Cursor Settings ➔ Features ➔ MCP ➔ Add New MCP Server**):

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

---

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

---

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

---

### Claude Code CLI
Run in your terminal:
```bash
claude mcp add masdika -- npx -y @masdika/mcp
```
And set the environment variable:
```bash
export MASDIKA_API_KEY="masdika_YOUR_API_KEY_HERE"
```

---

## 📦 Available Tools

| Tool | Description |
| :--- | :--- |
| `masdika_get_account` | Check profile, wallet balance (Rp), and active service counts. |
| `masdika_create_topup` | Generate instant QRIS QR string/link or Bank Virtual Account for wallet top-up. |
| `masdika_check_invoice` | Check status of any invoice (PAID, PENDING, EXPIRED). |
| `masdika_list_vps` | Inspect Cloud VPS instances, IP addresses, and hardware specs. |
| `masdika_control_vps` | Start, stop, or reboot a Cloud VPS. |
| `masdika_upgrade_vps` | Upgrade CPU, RAM, or Disk storage on a Cloud VPS. |
| `masdika_list_databases` | List Managed Databases (PostgreSQL, MySQL, Redis) and connection URIs. |
| `masdika_create_database` | 1-Click deploy a PostgreSQL, MySQL, or Redis database on Kubernetes. |
| `masdika_upload_cdn` | Upload files or assets directly to Masdika File CDN. |
| `masdika_list_apps` | List Managed Applications (OmniRoute, n8n, 9Router, etc.). |
| `masdika_deploy_app` | Deploy Managed Applications in seconds. |

---

## 💬 Example AI Prompts

You can speak naturally to your AI editor:

* *"Check my Masdika wallet balance and active services."*
* *"My Masdika balance is low, generate a QRIS bill for Rp 50,000 top up."*
* *"Create a new PostgreSQL database named 'production-db' on Masdika and put the connection string into my `.env.local` file."*
* *"My VPS id 12 is running out of memory, upgrade it to 4 vCPU and 8 GB RAM."*
* *"Upload `assets/logo.png` to Masdika File CDN and replace the image source in my code."*

---

## License
MIT © [Masdika Cloud](https://www.masdika.id)
