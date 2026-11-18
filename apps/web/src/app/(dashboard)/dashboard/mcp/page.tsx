"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Bot,
  Key,
  Copy,
  Check,
  Plus,
  Terminal,
  Server,
  Sparkles,
  ShieldCheck,
  Play,
  Loader2,
  Search,
  Code2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Boxes,
  Package,
  Wallet,
  CreditCard,
  Receipt,
  Power,
  Cpu,
  Database,
  UploadCloud,
  Rocket,
  RotateCcw,
  HardDrive,
  MessageSquare,
  Activity,
  Camera,
  Layers,
  Lock,
  Tag,
  FileText,
  FileCode,
  Trash2,
  KeyRound,
  ArrowRightLeft,
  Shield,
  Globe,
  Send,
  X,
  ExternalLink,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/Select";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { MASDIKA_MCP_TOOLS } from "@/lib/mcp-schema";

interface ApiKeyItem {
  id: number;
  name: string;
  key: string;
  service: string;
  status: string;
  usageCount: number;
  lastUsed: string | null;
  createdAt: string;
}

type ClientTab = "cursor" | "claude" | "windsurf" | "claudecode" | "antigravity";
type ToolCategory = "All" | "Billing" | "Cloud VPS" | "Database" | "Storage & CDN" | "Applications" | "AI Gateway" | "Network" | "Support";

const TOOL_METADATA: Record<string, { category: ToolCategory; icon: any; prompt: string }> = {
  // ── 1. BILLING & ACCOUNT ──
  masdika_get_account: {
    category: "Billing",
    icon: Wallet,
    prompt: "Check my Masdika wallet balance and active services status.",
  },
  masdika_create_topup: {
    category: "Billing",
    icon: CreditCard,
    prompt: "Generate an instant top-up invoice for Rp 50,000 using QRIS or BCA Virtual Account.",
  },
  masdika_check_invoice: {
    category: "Billing",
    icon: Receipt,
    prompt: "Check the payment status and details of invoice INV-TOPUP-12345.",
  },
  masdika_list_invoices: {
    category: "Billing",
    icon: FileText,
    prompt: "List my recent Masdika invoices and their payment statuses.",
  },
  masdika_check_voucher: {
    category: "Billing",
    icon: Tag,
    prompt: "Check if promo code 'WELCOME2026' is valid for my account.",
  },

  // ── 2. CLOUD VPS ──
  masdika_list_vps: {
    category: "Cloud VPS",
    icon: Server,
    prompt: "List all my active Masdika VPS servers and their IP addresses.",
  },
  masdika_control_vps: {
    category: "Cloud VPS",
    icon: Power,
    prompt: "Reboot my VPS server with id 12.",
  },
  masdika_get_vps_metrics: {
    category: "Cloud VPS",
    icon: Activity,
    prompt: "Get real-time CPU and RAM utilization for VPS 12.",
  },
  masdika_upgrade_vps: {
    category: "Cloud VPS",
    icon: Cpu,
    prompt: "My VPS 14 is running out of memory, upgrade it to 4 vCPU and 8 GB RAM.",
  },
  masdika_reinstall_vps: {
    category: "Cloud VPS",
    icon: RotateCcw,
    prompt: "Reinstall my VPS with ID 12 using Ubuntu 24.04 LTS.",
  },
  masdika_create_vps_snapshot: {
    category: "Cloud VPS",
    icon: Camera,
    prompt: "Take a snapshot of VPS 12 named 'pre-upgrade' before doing updates.",
  },
  masdika_list_vps_snapshots: {
    category: "Cloud VPS",
    icon: Layers,
    prompt: "List all available snapshots for VPS 12.",
  },
  masdika_reset_vps_password: {
    category: "Cloud VPS",
    icon: Lock,
    prompt: "Reset the root administrator password for VPS 12.",
  },
  masdika_list_vps_firewall: {
    category: "Cloud VPS",
    icon: Shield,
    prompt: "List all firewall rules currently configured on VPS 12.",
  },
  masdika_add_vps_firewall: {
    category: "Cloud VPS",
    icon: ShieldCheck,
    prompt: "Open inbound TCP port 8080 on VPS 12 in the firewall.",
  },

  // ── 3. MANAGED DATABASE ──
  masdika_list_databases: {
    category: "Database",
    icon: Database,
    prompt: "List all my managed databases and their connection ports.",
  },
  masdika_create_database: {
    category: "Database",
    icon: Database,
    prompt: "Create a PostgreSQL database named dev-db and return its connection string.",
  },
  masdika_control_database: {
    category: "Database",
    icon: Power,
    prompt: "Restart my PostgreSQL database with ID 4.",
  },
  masdika_get_database_connection: {
    category: "Database",
    icon: KeyRound,
    prompt: "Get connection URI and credentials for database ID 4.",
  },
  masdika_delete_database: {
    category: "Database",
    icon: Trash2,
    prompt: "Deprovision and safely delete Managed Database 7.",
  },

  // ── 4. MANAGED APPLICATIONS ──
  masdika_list_apps: {
    category: "Applications",
    icon: Boxes,
    prompt: "Show all my running Managed Applications on Masdika Cloud.",
  },
  masdika_deploy_app: {
    category: "Applications",
    icon: Rocket,
    prompt: "Deploy a high-availability OmniRoute application instance named my-ai-router.",
  },
  masdika_control_app: {
    category: "Applications",
    icon: Power,
    prompt: "Restart my n8n workflow automation app with ID 3.",
  },
  masdika_get_app_logs: {
    category: "Applications",
    icon: FileCode,
    prompt: "Fetch the latest 50 lines of logs from my OmniRoute app with ID 2.",
  },
  masdika_delete_app: {
    category: "Applications",
    icon: Trash2,
    prompt: "Terminate and delete Managed Application with ID 5.",
  },

  // ── 5. STORAGE & CDN ──
  masdika_upload_cdn: {
    category: "Storage & CDN",
    icon: UploadCloud,
    prompt: "Upload this exported banner image to Masdika File CDN.",
  },
  masdika_list_cdn_files: {
    category: "Storage & CDN",
    icon: FileText,
    prompt: "List my recently uploaded files on Masdika File CDN.",
  },
  masdika_delete_cdn_file: {
    category: "Storage & CDN",
    icon: Trash2,
    prompt: "Delete the obsolete CDN file with token abc123def.",
  },
  masdika_list_storage: {
    category: "Storage & CDN",
    icon: HardDrive,
    prompt: "List all my S3-compatible Object Storage buckets and endpoints.",
  },
  masdika_create_bucket: {
    category: "Storage & CDN",
    icon: HardDrive,
    prompt: "Create a new private S3 Object Storage bucket named my-app-backups.",
  },
  masdika_create_s3_key: {
    category: "Storage & CDN",
    icon: Key,
    prompt: "Generate an S3 Access Key ID and Secret Key for AWS CLI backups.",
  },
  masdika_list_s3_keys: {
    category: "Storage & CDN",
    icon: KeyRound,
    prompt: "List all my active S3 Object Storage credentials.",
  },

  // ── 6. AI GATEWAY ──
  masdika_list_ai_models: {
    category: "AI Gateway",
    icon: Sparkles,
    prompt: "List all available AI models and current token pricing on Masdika AI Gateway.",
  },
  masdika_create_ai_key: {
    category: "AI Gateway",
    icon: Key,
    prompt: "Generate an AI Gateway API Key named 'Cursor Key' so I can use DeepSeek and Qwen in my IDE.",
  },
  masdika_list_ai_keys: {
    category: "AI Gateway",
    icon: Sparkles,
    prompt: "List all my Masdika AI Gateway API Keys.",
  },
  masdika_revoke_ai_key: {
    category: "AI Gateway",
    icon: Trash2,
    prompt: "Revoke my unused AI Gateway key with ID 4.",
  },
  masdika_topup_ai_balance: {
    category: "AI Gateway",
    icon: ArrowRightLeft,
    prompt: "Transfer Rp 50,000 from my main wallet to my AI Gateway balance.",
  },

  // ── 7. NETWORK & SECURITY ──
  masdika_list_ssh_keys: {
    category: "Network",
    icon: Shield,
    prompt: "List all SSH public keys registered for my Cloud VPS instances.",
  },
  masdika_create_ssh_key: {
    category: "Network",
    icon: Key,
    prompt: "Register my new SSH public key 'MacBook Pro' on Masdika Cloud.",
  },
  masdika_delete_ssh_key: {
    category: "Network",
    icon: Trash2,
    prompt: "Remove my old SSH key with ID 3 from my account.",
  },
  masdika_list_reserved_ips: {
    category: "Network",
    icon: Globe,
    prompt: "List all my Elastic Static Reserved IPs and their VPS attachments.",
  },
  masdika_list_cloudflared_tunnels: {
    category: "Network",
    icon: Globe,
    prompt: "List all my active Cloudflare Tunnels and their status.",
  },

  // ── 8. SUPPORT ──
  masdika_list_tickets: {
    category: "Support",
    icon: MessageSquare,
    prompt: "Check the status of my open customer support tickets.",
  },
  masdika_create_ticket: {
    category: "Support",
    icon: MessageSquare,
    prompt: "Open a support ticket asking for help configuring a custom domain on my VPS.",
  },
  masdika_reply_ticket: {
    category: "Support",
    icon: Send,
    prompt: "Send a reply message to ticket TCK-ABC123 with additional log details.",
  },
};

export default function McpDashboardPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [activeClientTab, setActiveClientTab] = useState<ClientTab>("cursor");
  const [activeCategory, setActiveCategory] = useState<ToolCategory>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTool, setExpandedTool] = useState<string | null>("masdika_get_account");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // Modal states for Create, Manage & Delete
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<ApiKeyItem | null>(null);
  const [deletingKey, setDeletingKey] = useState(false);

  // Sandbox state
  const [testTool, setTestTool] = useState<string>("masdika_get_account");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/user/api-keys");
      const data = await res.json();
      if (data.success && data.apiKeys) {
        // Enforce MCP-only keys on this MCP management dashboard (strictly 1 key per account)
        const mcpKeys = data.apiKeys.filter((k: ApiKeyItem) => k.service === "MCP");
        setApiKeys(mcpKeys);
        if (mcpKeys.length > 0) {
          setSelectedKey(mcpKeys[0].key);
        } else {
          setSelectedKey("");
        }
      }
    } catch (err) {
      console.error("Failed to load API keys", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (apiKeys.length >= 1) {
      toast.error("Only 1 active MCP key is permitted per account. Please revoke your existing key before creating a new one.");
      return;
    }
    const label = newKeyLabel.trim() || "Masdika MCP Key";

    try {
      setGeneratingKey(true);
      const res = await fetch("/api/user/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: label,
          service: "MCP",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("New Masdika MCP Key generated successfully!");
        setApiKeys((prev) => [data.apiKey, ...prev]);
        setSelectedKey(data.apiKey.key);
        setNewlyCreatedKey(data.apiKey.key);
      } else {
        toast.error(data.error || "Failed to generate MCP key.");
      }
    } catch {
      toast.error("Network error creating API Key.");
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleDeleteKey = async () => {
    if (!keyToDelete) return;
    try {
      setDeletingKey(true);
      const res = await fetch("/api/user/api-keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: keyToDelete.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`API Key "${keyToDelete.name}" revoked successfully.`);
        const remaining = apiKeys.filter((k) => k.id !== keyToDelete.id);
        setApiKeys(remaining);
        if (selectedKey === keyToDelete.key) {
          setSelectedKey(remaining[0]?.key || "");
        }
        setKeyToDelete(null);
      } else {
        toast.error(data.error || "Failed to revoke API key.");
      }
    } catch {
      toast.error("Network error revoking API key.");
    } finally {
      setDeletingKey(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedText(null), 2000);
  };

  const displayKey = selectedKey || "masdika_YOUR_API_KEY_HERE";

  const getClientConfig = () => {
    switch (activeClientTab) {
      case "cursor":
        return {
          fileName: "~/.cursor/mcp.json",
          instructions:
            "Add to your Cursor MCP settings (Settings > Features > MCP > Add New MCP Server) or edit ~/.cursor/mcp.json:",
          code: JSON.stringify(
            {
              mcpServers: {
                masdika: {
                  command: "npx",
                  args: ["-y", "@masdika/mcp"],
                  env: {
                    MASDIKA_API_KEY: displayKey,
                  },
                },
              },
            },
            null,
            2
          ),
        };
      case "claude":
        return {
          fileName: "claude_desktop_config.json",
          instructions:
            "Paste into claude_desktop_config.json (%APPDATA%\\Claude on Windows, ~/Library/Application Support/Claude on macOS):",
          code: JSON.stringify(
            {
              mcpServers: {
                masdika: {
                  command: "npx",
                  args: ["-y", "@masdika/mcp"],
                  env: {
                    MASDIKA_API_KEY: displayKey,
                  },
                },
              },
            },
            null,
            2
          ),
        };
      case "windsurf":
        return {
          fileName: "~/.codeium/windsurf/mcp_config.json",
          instructions: "Add to Windsurf Cascade MCP config file:",
          code: JSON.stringify(
            {
              mcpServers: {
                masdika: {
                  command: "npx",
                  args: ["-y", "@masdika/mcp"],
                  env: {
                    MASDIKA_API_KEY: displayKey,
                  },
                },
              },
            },
            null,
            2
          ),
        };
      case "claudecode":
        return {
          fileName: "Terminal / CLI",
          instructions: "Run this command in your terminal to register Masdika MCP in Claude Code CLI:",
          code: `export MASDIKA_API_KEY="${displayKey}"\nclaude mcp add masdika -- npx -y @masdika/mcp`,
        };
      case "antigravity":
        return {
          fileName: "antigravity.mcp.json",
          instructions: "Add to your Antigravity IDE / Gemini CLI MCP Servers configuration:",
          code: JSON.stringify(
            {
              mcpServers: {
                masdika: {
                  command: "npx",
                  args: ["-y", "@masdika/mcp"],
                  env: {
                    MASDIKA_API_KEY: displayKey,
                  },
                },
              },
            },
            null,
            2
          ),
        };
    }
  };

  const currentConfig = getClientConfig();
  const codeLines = currentConfig.code.split("\n");

  const filteredTools = MASDIKA_MCP_TOOLS.filter((t) => {
    const meta = TOOL_METADATA[t.name];
    const matchesCategory = activeCategory === "All" || meta?.category === activeCategory;
    const matchesSearch =
      !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meta?.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredTools.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const paginatedTools = filteredTools.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleRunTest = async () => {
    if (!selectedKey) {
      toast.error("Please select or generate an API key first.");
      return;
    }
    try {
      setTesting(true);
      setTestResult("Connecting to Masdika MCP gateway...");
      const res = await fetch("/api/v1/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${selectedKey}`,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
          params: {
            name: testTool,
            arguments: {},
          },
        }),
      });
      const data = await res.json();
      setTestResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setTestResult(`Error: ${err?.message || "Execution failed"}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-full pb-16">
      {/* ── 1. TOP HEADER (Identical to Managed Apps & Managed DB) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Masdika MCP (Model Context Protocol)
            </h1>
            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold border whitespace-nowrap shrink-0", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
              <Bot className="w-3 h-3 shrink-0" />
              Official Protocol
            </span>
          </div>
          <p className={cn("text-xs sm:text-sm font-medium mt-1.5 max-w-3xl leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
            Connect AI IDEs and autonomous agents directly to Masdika Cloud to manage VPS, databases, applications, storage, and billing via natural language.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsManageModalOpen(true)}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 border cursor-pointer",
              isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
            )}
          >
            <Key className="w-3.5 h-3.5 text-cyan-400" />
            <span>Manage Key ({apiKeys.length}/1)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (apiKeys.length >= 1) {
                toast.info("Only 1 active MCP key is permitted per account. Revoke your existing key to generate a new one.");
                return;
              }
              setNewKeyLabel("");
              setNewlyCreatedKey(null);
              setIsGenerateModalOpen(true);
            }}
            disabled={apiKeys.length >= 1}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 flex items-center justify-center gap-2 bg-cyan-400 hover:bg-cyan-300 active:scale-95 text-slate-950 shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span>{apiKeys.length >= 1 ? "MCP Key Active (1/1)" : "Generate MCP Key"}</span>
          </button>
        </div>
      </div>

      {/* ── 2. SUMMARY STAT CARDS (Identical to Managed Apps & Managed DB) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Available Tools */}
        <div className={cn("rounded-2xl border p-5 transition-all shadow-2xs", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              AVAILABLE TOOLS
            </span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {MASDIKA_MCP_TOOLS.length}
            </span>
            <span className={cn("text-xs font-semibold", isDark ? "text-cyan-400" : "text-cyan-600")}>
              Core Tools
            </span>
          </div>
        </div>

        {/* Card 2: Transport Protocol */}
        <div className={cn("rounded-2xl border p-5 transition-all shadow-2xs", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              TRANSPORT MODES
            </span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <Terminal className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Stdio + REST
            </span>
            <span className={cn("text-xs font-semibold", isDark ? "text-cyan-400" : "text-cyan-600")}>
              JSON-RPC
            </span>
          </div>
        </div>

        {/* Card 3: Region & Cluster */}
        <div className={cn("rounded-2xl border p-5 transition-all shadow-2xs", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              REGION & CLUSTER
            </span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Sidoarjo
            </span>
            <span className={cn("text-xs font-semibold", isDark ? "text-cyan-400" : "text-cyan-600")}>
              ID-SDA
            </span>
          </div>
        </div>

        {/* Card 4: Official NPM */}
        <div className={cn("rounded-2xl border p-5 transition-all shadow-2xs", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              OFFICIAL NPM
            </span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-lg font-black tracking-tight truncate", isDark ? "text-white" : "text-slate-900")}>
              @masdika/mcp
            </span>
            <span className={cn("text-xs font-semibold shrink-0", isDark ? "text-cyan-400" : "text-cyan-600")}>
              v1.0.1
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. QUICK CONFIG GENERATOR & LIVE SANDBOX ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Client Config Setup (7 cols on large screens) */}
        <div className="lg:col-span-7 space-y-4">
          <div className={cn("p-5 sm:p-6 rounded-2xl border transition-all shadow-2xs space-y-5", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200 shadow-2xs")}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className={cn("text-base font-bold tracking-tight flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span>1-Click Client Setup</span>
                </h2>
                <p className={cn("text-xs font-medium mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                  Select your AI editor below to generate the exact MCP configuration JSON:
                </p>
              </div>

              {/* API Key Selector Custom Reinstall-style Dropdown */}
              <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
                <span className={cn("text-xs font-bold uppercase tracking-wider shrink-0", isDark ? "text-zinc-400" : "text-slate-500")}>Key:</span>
                <div className="flex-1 min-w-0 sm:w-auto sm:max-w-[260px] sm:flex-initial">
                  <Select
                    value={selectedKey}
                    onChange={(val) => setSelectedKey(String(val))}
                    options={
                      apiKeys.length > 0
                        ? apiKeys.map((k) => ({
                            value: k.key,
                            label: (
                              <div className="flex items-center gap-1.5 text-xs min-w-0">
                                <span className="font-semibold truncate">{k.name || "API Key"}</span>
                                <span className={cn("shrink-0", isDark ? "text-zinc-600" : "text-slate-400")}>•</span>
                                <span className="font-mono text-[11px] text-cyan-400 shrink-0">{k.key.slice(0, 10)}...</span>
                              </div>
                            ),
                          }))
                        : [{ value: "", label: <span className="text-xs">No keys found (Demo Key)</span> }]
                    }
                    placeholder="Select API Key"
                    className="py-1.5 px-3 text-xs rounded-xl w-full"
                  />
                </div>
                {(() => {
                  const currentItem = apiKeys.find((k) => k.key === selectedKey);
                  if (!currentItem) return null;
                  return (
                    <button
                      type="button"
                      onClick={() => setKeyToDelete(currentItem)}
                      title={`Revoke Key "${currentItem.name}"`}
                      className={cn(
                        "w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 transition-all cursor-pointer",
                        isDark
                          ? "bg-rose-500/10 border-rose-500/25 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/40"
                          : "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 hover:border-rose-300 shadow-2xs"
                      )}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  );
                })()}
              </div>
            </div>

            {/* Client Tabs */}
            <div className={cn("flex items-center gap-1.5 border-b pb-3 overflow-x-auto [scrollbar-width:none]", isDark ? "border-white/10" : "border-slate-200")}>
              {[
                { id: "cursor", label: "Cursor IDE" },
                { id: "claude", label: "Claude Desktop" },
                { id: "windsurf", label: "Windsurf" },
                { id: "claudecode", label: "Claude Code CLI" },
                { id: "antigravity", label: "Antigravity" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveClientTab(tab.id as ClientTab)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
                    activeClientTab === tab.id
                      ? isDark
                        ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-bold shadow-xs"
                        : "bg-cyan-50 text-cyan-800 border border-cyan-300 font-bold shadow-xs"
                      : isDark
                        ? "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Instruction description */}
            <p className={cn("text-xs font-medium", isDark ? "text-zinc-300" : "text-slate-600")}>
              {currentConfig.instructions}
            </p>

            {/* macOS-style Code Snippet Window (Light & Dark Mode Authentic - Identical to AI Gateway Playground) */}
            <div className={cn(
              "w-full rounded-2xl border shadow-xl overflow-hidden ring-1",
              isDark
                ? "border-white/10 bg-[#0d0e15] text-slate-100 ring-white/5 shadow-2xl"
                : "border-slate-200/90 bg-white text-slate-800 ring-black/5"
            )}>
              {/* macOS Window Titlebar */}
              <div className={cn(
                "flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b gap-2 sm:gap-3 select-none",
                isDark ? "border-white/[0.08] bg-[#14151f]" : "border-slate-200/90 bg-slate-100/90"
              )}>
                {/* Traffic Light Buttons */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]/80 shadow-xs inline-block" />
                  <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]/80 shadow-xs inline-block" />
                  <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#27c93f] border border-[#1aab29]/80 shadow-xs inline-block" />
                </div>

                <div className="font-mono text-[11px] sm:text-xs text-slate-600 dark:text-zinc-400 truncate flex-1 px-2">
                  {currentConfig.fileName}
                </div>

                {/* Copy Button */}
                <button
                  onClick={() => handleCopy(currentConfig.code, "config-code")}
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-medium border shadow-xs transition-colors cursor-pointer shrink-0",
                    isDark
                      ? "text-zinc-300 hover:text-cyan-300 bg-white/5 hover:bg-white/10 border-white/10"
                      : "text-slate-700 hover:text-cyan-600 bg-white hover:bg-slate-50 border-slate-200"
                  )}
                  title="Copy code to clipboard"
                >
                  {copiedText === "config-code" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedText === "config-code" ? "Copied" : "Copy"}</span>
                </button>
              </div>

              {/* Code Area with Line Numbers */}
              <div className={cn(
                "p-3.5 sm:p-5 flex text-[11px] sm:text-xs font-mono overflow-x-auto leading-relaxed",
                isDark ? "bg-[#0a0b10]" : "bg-slate-50/70"
              )}>
                <div className={cn(
                  "select-none pr-3 sm:pr-4 text-right font-mono text-[11px] sm:text-xs border-r space-y-0.5 min-w-[1.8rem] sm:min-w-[2.2rem] shrink-0",
                  isDark ? "text-zinc-600 border-white/[0.08]" : "text-slate-400 border-slate-200/90"
                )}>
                  {codeLines.map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <pre className={cn(
                  "pl-3 sm:pl-4 font-mono text-[11px] sm:text-xs overflow-x-auto leading-relaxed flex-1",
                  isDark ? "text-cyan-300" : "text-slate-800"
                )}>
                  <code>{currentConfig.code}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* Installation & Usage Guide */}
          <div className={cn(
            "p-4 sm:p-5 rounded-2xl border text-xs space-y-3 transition-all shadow-2xs",
            isDark ? "bg-[#111115] border-white/[0.08] text-zinc-300" : "bg-white border-slate-200 text-slate-700 shadow-2xs"
          )}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className={cn("font-bold text-xs sm:text-sm", isDark ? "text-white" : "text-slate-900")}>
                  How to Install &amp; Use @masdika/mcp
                </span>
              </div>
              <span className={cn("text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border", isDark ? "bg-white/5 border-white/10 text-zinc-400" : "bg-slate-100 border-slate-200 text-slate-600")}>
                Requires Node.js &ge; 18
              </span>
            </div>

            <ol className="space-y-2 list-decimal list-inside leading-relaxed">
              <li>
                <span className={cn("font-semibold", isDark ? "text-white" : "text-slate-900")}>Generate MCP Key:</span>{" "}
                Click <span className="font-semibold text-cyan-500">Generate MCP Key</span> at the top right to create your dedicated <code className="font-mono text-cyan-400">MASDIKA_API_KEY</code>.
              </li>
              <li>
                <span className={cn("font-semibold", isDark ? "text-white" : "text-slate-900")}>Zero-Install via npx:</span>{" "}
                Copy the JSON config above into your AI editor. Running <code className={cn("px-1.5 py-0.5 rounded font-mono text-[11px] border", isDark ? "bg-black/40 border-white/10 text-cyan-300" : "bg-slate-100 border-slate-200 text-slate-800")}>npx -y @masdika/mcp</code> automatically fetches and runs the latest package without manual installation. (Optional global install: <code className={cn("px-1.5 py-0.5 rounded font-mono text-[11px] border", isDark ? "bg-black/40 border-white/10 text-cyan-300" : "bg-slate-100 border-slate-200 text-slate-800")}>npm install -g @masdika/mcp</code>)
              </li>
              <li>
                <span className={cn("font-semibold", isDark ? "text-white" : "text-slate-900")}>Reload &amp; Prompt:</span>{" "}
                Restart your editor to load the MCP server, then chat naturally (e.g., <em>&ldquo;Check my Masdika wallet balance and list my VPS&rdquo;</em>).
              </li>
            </ol>
          </div>

          {/* Quick Setup Instructions & Tips (Cyan Theme - Consistent with Brand) */}
          <div className={cn(
            "p-4 rounded-2xl border text-xs flex items-start gap-3 transition-all",
            isDark
              ? "bg-cyan-500/10 border-cyan-500/25 text-cyan-200"
              : "bg-cyan-50/90 border-cyan-200 text-cyan-950"
          )}>
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-cyan-400">Security Best Practice:</span>
              <p className={isDark ? "text-cyan-200/90" : "text-cyan-900"}>
                Keep your Masdika API Key confidential. Never commit <code className={cn("px-1.5 py-0.5 rounded font-mono text-[11px] border", isDark ? "bg-black/40 border-cyan-500/30 text-cyan-300" : "bg-cyan-100 border-cyan-300 text-cyan-900")}>MASDIKA_API_KEY</code> to public Git repositories. You can regenerate or revoke keys anytime from the dashboard.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Live Interactive Sandbox / Test Runner (5 cols on large screens) */}
        <div className="lg:col-span-5 space-y-4">
          <div className={cn("p-5 sm:p-6 rounded-2xl border transition-all shadow-2xs space-y-4", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200 shadow-2xs")}>
            <div className="flex items-center justify-between">
              <h2 className={cn("text-base font-bold tracking-tight flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Live Tool Sandbox</span>
              </h2>
              <span className={cn("text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
                JSON-RPC 2.0
              </span>
            </div>
            <p className={cn("text-xs font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
              Simulate an AI Agent calling a Masdika MCP tool directly against your account:
            </p>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className={cn("text-xs font-bold uppercase tracking-wider block", isDark ? "text-zinc-400" : "text-slate-600")}>
                  Select Tool to Test
                </label>
                <Select
                  value={testTool}
                  onChange={(val) => setTestTool(String(val))}
                  options={MASDIKA_MCP_TOOLS.map((t) => {
                    const meta = TOOL_METADATA[t.name];
                    const IconComponent = meta?.icon || Code2;
                    return {
                      value: t.name,
                      label: (
                        <div className="flex items-center gap-2 py-0.5 text-xs">
                          <IconComponent className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="font-mono font-semibold text-slate-800 dark:text-zinc-200 truncate">{t.name}</span>
                          <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-500 ml-auto shrink-0">({meta?.category})</span>
                        </div>
                      ),
                    };
                  })}
                  placeholder="Select Tool to Test"
                  className="py-2.5 px-3.5 text-xs rounded-xl"
                />
              </div>

              <button
                onClick={handleRunTest}
                disabled={testing || !selectedKey}
                className="w-full py-2.5 rounded-xl font-bold text-xs bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                <span>Execute Tool via MCP Gateway</span>
              </button>
            </div>

            {/* Test Results Output (macOS-style mini terminal) */}
            {testResult && (
              <div className={cn(
                "rounded-xl border overflow-hidden",
                isDark ? "border-white/10 bg-[#09090b]" : "border-slate-200 bg-slate-50"
              )}>
                <div className={cn(
                  "px-3 py-1.5 border-b flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider",
                  isDark ? "border-white/10 text-zinc-400 bg-black/40" : "border-slate-200 text-slate-600 bg-slate-100"
                )}>
                  <span>Gateway Response</span>
                  <span className="text-cyan-400 font-semibold">Live JSON</span>
                </div>
                <pre className={cn(
                  "p-3 text-[11px] font-mono max-h-56 overflow-y-auto leading-relaxed whitespace-pre-wrap [scrollbar-width:thin]",
                  isDark ? "text-cyan-300" : "text-slate-800"
                )}>
                  {testResult}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. COMPREHENSIVE TOOLS CATALOG & PROMPTS DIRECTORY (Redesigned UI/UX) ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className={cn("text-lg sm:text-xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Supported MCP Tools Directory ({MASDIKA_MCP_TOOLS.length})
            </h2>
            <p className={cn("text-xs sm:text-sm font-medium mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
              Every tool your AI Agent can call automatically when prompted in your editor:
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400" />
            <input
              type="text"
              placeholder="Search tools or capabilities..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className={cn(
                "w-full pl-9 pr-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400",
                isDark
                  ? "bg-[#09090b] border border-white/10 text-white placeholder-zinc-500"
                  : "bg-white border border-slate-200 text-slate-900 placeholder-slate-400 shadow-2xs"
              )}
            />
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] pb-1">
          {(["All", "Billing", "Cloud VPS", "Database", "Storage & CDN", "Applications", "AI Gateway", "Network", "Support"] as ToolCategory[]).map((cat) => {
            const count = cat === "All"
              ? MASDIKA_MCP_TOOLS.length
              : MASDIKA_MCP_TOOLS.filter((t) => TOOL_METADATA[t.name]?.category === cat).length;
            const isSelected = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0",
                  isSelected
                    ? isDark
                      ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-bold shadow-xs"
                      : "bg-cyan-50 text-cyan-800 border border-cyan-300 font-bold shadow-xs"
                    : isDark
                      ? "bg-[#111115] text-zinc-400 hover:text-white border border-white/[0.08]"
                      : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-2xs"
                )}
              >
                <span>{cat}</span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                  isSelected
                    ? isDark ? "bg-cyan-400/20 text-cyan-300" : "bg-cyan-200 text-cyan-900"
                    : isDark ? "bg-white/10 text-zinc-400" : "bg-slate-100 text-slate-600"
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {filteredTools.length === 0 ? (
            <div className={cn("col-span-full p-8 text-center rounded-2xl border", isDark ? "border-white/10 bg-white/5 text-zinc-400" : "border-slate-200 bg-slate-50 text-slate-500")}>
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold">No tools found matching &quot;{searchQuery}&quot;</p>
              <p className="text-xs mt-1">Try another search term or choose another category.</p>
            </div>
          ) : (
            paginatedTools.map((tool) => {
              const meta = TOOL_METADATA[tool.name];
              const IconComponent = meta?.icon || Code2;
              const isExpanded = expandedTool === tool.name;
              const paramProperties = tool.inputSchema?.properties || {};
              const paramKeys = Object.keys(paramProperties);

              return (
                <div
                  key={tool.name}
                  className={cn(
                    "self-start rounded-2xl border transition-all shadow-2xs overflow-hidden flex flex-col justify-start",
                    isDark
                      ? "bg-[#111115] border-white/[0.08] hover:border-cyan-500/30"
                      : "bg-white border-slate-200/90 hover:border-cyan-500/40 shadow-2xs"
                  )}
                >
                  {/* Header Row (Clickable) - Fixed Uniform Height */}
                  <div
                    onClick={() => setExpandedTool(isExpanded ? null : tool.name)}
                    className="p-4 sm:p-5 flex items-start gap-3.5 cursor-pointer select-none min-h-[96px] sm:min-h-[102px]"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-colors mt-0.5",
                      isDark
                        ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                        : "bg-cyan-50 border-cyan-200 text-cyan-700"
                    )}>
                      <IconComponent className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {tool.name}
                        </span>
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 uppercase tracking-wider",
                          isDark ? "bg-white/5 border-white/10 text-zinc-400" : "bg-slate-100 border-slate-200 text-slate-600"
                        )}>
                          {meta?.category}
                        </span>
                      </div>
                      <p className={cn("text-xs leading-relaxed font-medium line-clamp-2 h-10 flex items-start overflow-hidden", isDark ? "text-zinc-400" : "text-slate-600")}>
                        {tool.description}
                      </p>
                    </div>

                    <div className="shrink-0 pt-1">
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                        isDark ? "hover:bg-white/5 text-zinc-400" : "hover:bg-slate-100 text-slate-500"
                      )}>
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-cyan-400" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details Pane */}
                  {isExpanded && (
                    <div className={cn(
                      "px-5 pb-5 pt-3 border-t space-y-4 animate-in fade-in duration-200",
                      isDark ? "border-white/5 bg-black/20" : "border-slate-100 bg-slate-50/50"
                    )}>
                      {/* Parameters Schema */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
                            Parameters Schema
                          </span>
                          <span className="text-[11px] font-mono text-zinc-500">
                            {paramKeys.length === 0 ? "No arguments" : `${paramKeys.length} argument(s)`}
                          </span>
                        </div>

                        {paramKeys.length === 0 ? (
                          <div className={cn(
                            "px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-2",
                            isDark ? "bg-[#09090b] border-white/10 text-zinc-400" : "bg-white border-slate-200 text-slate-600"
                          )}>
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>Zero parameters required. Safe for natural prompt queries.</span>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {paramKeys.map((pKey) => {
                              const prop = paramProperties[pKey];
                              const isReq = tool.inputSchema?.required?.includes(pKey);
                              return (
                                <div
                                  key={pKey}
                                  className={cn(
                                    "p-2.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-2",
                                    isDark ? "bg-[#09090b] border-white/10" : "bg-white border-slate-200"
                                  )}
                                >
                                  <div className="flex items-center gap-2 shrink-0">
                                    <code className="font-mono font-bold text-cyan-400">{pKey}</code>
                                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-zinc-400 border border-white/10">
                                      {prop.type || "any"}
                                    </span>
                                    {isReq && (
                                      <span className="text-[10px] font-bold text-rose-400 uppercase">required</span>
                                    )}
                                  </div>
                                  <span className={cn("text-[11px] font-medium leading-relaxed sm:text-right", isDark ? "text-zinc-400" : "text-slate-600")}>
                                    {prop.description}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Example Natural Prompt with Copy Button */}
                      <div className={cn(
                        "p-3.5 rounded-xl border space-y-1.5",
                        isDark ? "bg-cyan-500/5 border-cyan-500/20 text-cyan-300" : "bg-cyan-50/80 border-cyan-200 text-cyan-900"
                      )}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-[11px] uppercase tracking-wider text-cyan-500">
                            Example Prompt
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (meta?.prompt) handleCopy(meta.prompt, `prompt-${tool.name}`);
                            }}
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer",
                              isDark
                                ? "bg-white/10 hover:bg-white/20 border-white/10 text-cyan-300"
                                : "bg-white hover:bg-slate-50 border-cyan-300 text-cyan-800 shadow-2xs"
                            )}
                          >
                            {copiedText === `prompt-${tool.name}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedText === `prompt-${tool.name}` ? "Copied" : "Copy Prompt"}</span>
                          </button>
                        </div>
                        <p className={cn("italic text-xs font-medium leading-relaxed", isDark ? "text-zinc-200" : "text-slate-800")}>
                          &ldquo;{meta?.prompt}&rdquo;
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Bar */}
        {filteredTools.length > 0 && totalPages > 1 && (
          <div className={cn(
            "flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 pb-1 border-t",
            isDark ? "border-white/10 text-zinc-400" : "border-slate-200 text-slate-600"
          )}>
            {/* Page indicator info */}
            <div className="text-xs font-medium">
              Showing <span className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>{startIndex + 1}</span> to{" "}
              <span className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>
                {Math.min(startIndex + ITEMS_PER_PAGE, filteredTools.length)}
              </span>{" "}
              of <span className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>{filteredTools.length}</span> tools
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
                  isDark
                    ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
                )}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => {
                  if (
                    totalPages > 5 &&
                    pageNum !== 1 &&
                    pageNum !== totalPages &&
                    Math.abs(pageNum - safePage) > 1
                  ) {
                    if (pageNum === 2 || pageNum === totalPages - 1) {
                      return (
                        <span key={pageNum} className="px-1 text-xs text-zinc-500 select-none">
                          ...
                        </span>
                      );
                    }
                    return null;
                  }

                  const isActive = pageNum === safePage;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        "w-8 h-8 rounded-xl text-xs font-bold border flex items-center justify-center transition-all cursor-pointer",
                        isActive
                          ? isDark
                            ? "bg-cyan-400 text-slate-950 border-cyan-400 shadow-sm"
                            : "bg-cyan-500 text-white border-cyan-500 shadow-sm"
                          : isDark
                            ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300"
                            : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
                  isDark
                    ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
                )}
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 5. GENERATE MCP KEY MODAL ── */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className={cn(
              "w-full max-w-lg rounded-2xl border p-5 sm:p-6 space-y-5 shadow-2xl",
              isDark ? "bg-[#0c0c0e] border-white/[0.1]" : "bg-white border-slate-200"
            )}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "w-9 h-9 rounded-xl border flex items-center justify-center shrink-0",
                  isDark ? "bg-cyan-500/10 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700"
                )}>
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={cn("text-base font-bold", isDark ? "text-white" : "text-slate-900")}>
                    {newlyCreatedKey ? "MCP Key Generated" : "Generate MCP API Key"}
                  </h3>
                  <p className={cn("text-xs font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
                    {newlyCreatedKey
                      ? "Your new access key is ready to connect with AI editors."
                      : "Create a dedicated token to connect Cursor, Claude, or Antigravity."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsGenerateModalOpen(false);
                  setNewlyCreatedKey(null);
                  setNewKeyLabel("");
                }}
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
                  isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!newlyCreatedKey ? (
              /* Form view */
              <form onSubmit={handleCreateKey} className="space-y-4">
                <div>
                  <label className={cn("text-xs font-bold uppercase tracking-wider block mb-1.5", isDark ? "text-zinc-400" : "text-slate-600")}>
                    Key Label / Name
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={64}
                    value={newKeyLabel}
                    onChange={(e) => setNewKeyLabel(e.target.value)}
                    placeholder="e.g. Cursor Workstation Key, Claude Desktop Mac"
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none transition-all font-medium",
                      isDark
                        ? "bg-[#141418] border-white/[0.08] text-white focus:border-cyan-400 placeholder-zinc-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500 placeholder-slate-400 shadow-2xs"
                    )}
                  />
                  <p className={cn("text-[11px] font-medium mt-1.5", isDark ? "text-zinc-500" : "text-slate-500")}>
                    A friendly identifier to track which device or agent is using this key.
                  </p>
                </div>

                <div className={cn(
                  "p-3.5 rounded-xl border text-xs font-medium space-y-1",
                  isDark ? "bg-cyan-500/10 border-cyan-500/25 text-cyan-200" : "bg-cyan-50 border-cyan-200 text-cyan-900"
                )}>
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Security &amp; Permissions</span>
                  </div>
                  <p className="leading-relaxed opacity-90 text-[11px]">
                    This key authenticates MCP tools to query your VPS, databases, applications, storage, and billing. Keep it private.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsGenerateModalOpen(false);
                      setNewKeyLabel("");
                    }}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                      isDark ? "border-white/10 text-zinc-300 hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={generatingKey || apiKeys.length >= 1}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {generatingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Generate Key</span>
                  </button>
                </div>
              </form>
            ) : (
              /* Success view showing generated key */
              <div className="space-y-4">
                <div className={cn(
                  "p-3.5 rounded-xl border flex items-center gap-2 text-xs font-semibold",
                  isDark ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-800"
                )}>
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Key generated and automatically selected for client config below.</span>
                </div>

                <div className="space-y-1.5">
                  <label className={cn("text-xs font-bold uppercase tracking-wider block", isDark ? "text-zinc-400" : "text-slate-600")}>
                    Your Secret API Key
                  </label>
                  <div className={cn(
                    "flex items-center justify-between gap-2 p-3 rounded-xl border font-mono text-xs select-all",
                    isDark ? "bg-[#141418] border-white/10 text-cyan-300" : "bg-slate-100 border-slate-200 text-cyan-800 font-bold"
                  )}>
                    <span className="truncate">{newlyCreatedKey}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(newlyCreatedKey, "modal-key")}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-sans font-bold flex items-center gap-1 shrink-0 transition-all cursor-pointer",
                        copiedText === "modal-key"
                          ? "bg-emerald-500 text-white"
                          : isDark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-2xs"
                      )}
                    >
                      {copiedText === "modal-key" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedText === "modal-key" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <p className={cn("text-[11px] font-medium leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
                    Keep this key safe. Do not commit it to public repositories. You can revoke it anytime from this page.
                  </p>
                </div>

                <div className="flex items-center justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsGenerateModalOpen(false);
                      setNewlyCreatedKey(null);
                      setNewKeyLabel("");
                    }}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all cursor-pointer"
                  >
                    Done &amp; Apply to Config
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 6. MANAGE MCP KEYS MODAL ── */}
      {isManageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className={cn(
              "w-full max-w-xl rounded-2xl border p-5 sm:p-6 space-y-5 shadow-2xl max-h-[90vh] flex flex-col",
              isDark ? "bg-[#0c0c0e] border-white/[0.1]" : "bg-white border-slate-200"
            )}
          >
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "w-9 h-9 rounded-xl border flex items-center justify-center shrink-0",
                  isDark ? "bg-cyan-500/10 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700"
                )}>
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={cn("text-base font-bold", isDark ? "text-white" : "text-slate-900")}>
                    Manage MCP API Key
                  </h3>
                  <p className={cn("text-xs font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
                    {apiKeys.length >= 1
                      ? "1 active key registered for your account (maximum 1 key limit)."
                      : "No active MCP key. Generate a key to connect your AI IDE."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsManageModalOpen(false)}
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
                  isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto flex-1 pr-1">
              {apiKeys.length === 0 ? (
                <div className={cn(
                  "p-8 text-center rounded-xl border space-y-2",
                  isDark ? "bg-[#141418] border-white/5 text-zinc-400" : "bg-slate-50 border-slate-200 text-slate-500"
                )}>
                  <Key className="w-8 h-8 mx-auto opacity-30 text-cyan-400" />
                  <p className="text-sm font-semibold">No API keys found.</p>
                  <p className="text-xs">Generate your first MCP key to connect AI editors.</p>
                </div>
              ) : (
                apiKeys.map((k) => {
                  const isSelected = selectedKey === k.key;
                  return (
                    <div
                      key={k.id}
                      className={cn(
                        "p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                        isSelected
                          ? isDark
                            ? "bg-cyan-500/10 border-cyan-500/30"
                            : "bg-cyan-50/70 border-cyan-300"
                          : isDark
                          ? "bg-[#141418] border-white/[0.08]"
                          : "bg-slate-50 border-slate-200"
                      )}
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-xs font-bold truncate", isDark ? "text-white" : "text-slate-900")}>
                            {k.name || "API Key"}
                          </span>
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.2 rounded-full border uppercase",
                            isDark ? "bg-white/5 border-white/10 text-cyan-400" : "bg-white border-slate-200 text-cyan-700"
                          )}>
                            {k.service || "MCP"}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-cyan-400 text-slate-950">
                              Selected
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
                          <span>{k.key.slice(0, 16)}...</span>
                          <span>•</span>
                          <span className="text-[11px] font-sans">
                            {new Date(k.createdAt).toISOString().split("T")[0]}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedKey(k.key);
                            toast.success(`Selected "${k.name}" for client config.`);
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                            isSelected
                              ? "bg-cyan-400 text-slate-950 border-cyan-400 font-bold"
                              : isDark
                              ? "bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300"
                              : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                          )}
                        >
                          {isSelected ? "Active" : "Use"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopy(k.key, `copy-list-${k.id}`)}
                          className={cn(
                            "p-1.5 rounded-lg border transition-all cursor-pointer",
                            copiedText === `copy-list-${k.id}`
                              ? "bg-emerald-500 text-white border-emerald-500"
                              : isDark
                              ? "bg-white/5 hover:bg-white/10 border-white/10 text-zinc-400 hover:text-white"
                              : "bg-white hover:bg-slate-50 border-slate-200 text-slate-600"
                          )}
                          title="Copy Key"
                        >
                          {copiedText === `copy-list-${k.id}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => setKeyToDelete(k)}
                          className={cn(
                            "p-1.5 rounded-lg border transition-all cursor-pointer",
                            isDark
                              ? "bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/25 text-rose-400"
                              : "bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-600"
                          )}
                          title="Revoke Key"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/10 shrink-0">
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>1 active MCP key limit per account</span>
              </div>
              {apiKeys.length < 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsManageModalOpen(false);
                    setNewKeyLabel("");
                    setNewlyCreatedKey(null);
                    setIsGenerateModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Generate Key</span>
                </button>
              ) : (
                <span className={cn(
                  "text-xs font-semibold px-2.5 py-1 rounded-lg border",
                  isDark ? "bg-white/5 border-white/10 text-zinc-400" : "bg-slate-100 border-slate-200 text-slate-600"
                )}>
                  Limit reached (1/1)
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 7. DELETE / REVOKE CONFIRMATION MODAL ── */}
      <ConfirmModal
        isOpen={Boolean(keyToDelete)}
        onClose={() => !deletingKey && setKeyToDelete(null)}
        onConfirm={handleDeleteKey}
        title="Revoke MCP API Key?"
        description={`Are you sure you want to permanently revoke "${keyToDelete?.name}" (${keyToDelete?.key.slice(0, 16)}...)? Any AI editor (Cursor, Claude, Antigravity) using this key will immediately lose access.`}
        confirmText={deletingKey ? "Revoking..." : "Revoke Key"}
        isLoading={deletingKey}
        variant="danger"
      />
    </div>
  );
}
