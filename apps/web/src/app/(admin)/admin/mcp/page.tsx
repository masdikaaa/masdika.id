"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Bot,
  Key,
  ShieldCheck,
  Activity,
  RefreshCw,
  Search,
  ExternalLink,
  Trash2,
  Power,
  Copy,
  Check,
  Terminal,
  Server,
  Code2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Sliders,
  Shield,
  Layers,
} from "lucide-react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { MASDIKA_MCP_TOOLS } from "@/lib/mcp-schema";

interface AdminMcpKeyItem {
  id: number;
  name: string;
  key: string;
  maskedKey: string;
  status: "ACTIVE" | "SUSPENDED";
  usageCount: number;
  lastUsed: string | null;
  createdAt: string;
  user: {
    id: number;
    name: string;
    email: string;
    balance: number;
    isSuspended: boolean;
  };
}

interface McpStats {
  totalKeys: number;
  activeKeys: number;
  suspendedKeys: number;
  totalInvocations: number;
  toolsCount: number;
}

type TabType = "keys" | "tools" | "architecture";

export default function AdminMcpPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [activeTab, setActiveTab] = useState<TabType>("keys");
  const [keys, setKeys] = useState<AdminMcpKeyItem[]>([]);
  const [stats, setStats] = useState<McpStats>({
    totalKeys: 0,
    activeKeys: 0,
    suspendedKeys: 0,
    totalInvocations: 0,
    toolsCount: MASDIKA_MCP_TOOLS.length,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "SUSPENDED">("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [keyToDelete, setKeyToDelete] = useState<AdminMcpKeyItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Tools tab state
  const [toolSearchQuery, setToolSearchQuery] = useState("");
  const [selectedToolCategory, setSelectedToolCategory] = useState<string>("All");
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [toolPage, setToolPage] = useState(1);
  const TOOLS_PER_PAGE = 8;

  const fetchMcpData = async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/admin/mcp");
      const data = await res.json();
      if (data.success) {
        setKeys(data.keys || []);
        if (data.stats) setStats(data.stats);
      } else {
        toast.error(data.error || "Failed to load MCP administration data.");
      }
    } catch {
      toast.error("Network error fetching MCP data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMcpData();
  }, []);

  const handleToggleStatus = async (item: AdminMcpKeyItem) => {
    try {
      setTogglingId(item.id);
      const newStatus = item.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
      const res = await fetch("/api/admin/mcp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Key "${item.name}" is now ${newStatus}.`);
        setKeys((prev) =>
          prev.map((k) => (k.id === item.id ? { ...k, status: newStatus } : k))
        );
        setStats((prev) => ({
          ...prev,
          activeKeys: newStatus === "ACTIVE" ? prev.activeKeys + 1 : prev.activeKeys - 1,
          suspendedKeys: newStatus === "SUSPENDED" ? prev.suspendedKeys + 1 : prev.suspendedKeys - 1,
        }));
      } else {
        toast.error(data.error || "Failed to toggle status.");
      }
    } catch {
      toast.error("Network error updating key status.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteKey = async () => {
    if (!keyToDelete) return;
    try {
      setDeleting(true);
      const res = await fetch("/api/admin/mcp", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: keyToDelete.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Key "${keyToDelete.name}" revoked permanently.`);
        setKeys((prev) => prev.filter((k) => k.id !== keyToDelete.id));
        setStats((prev) => ({
          ...prev,
          totalKeys: Math.max(0, prev.totalKeys - 1),
          activeKeys: keyToDelete.status === "ACTIVE" ? Math.max(0, prev.activeKeys - 1) : prev.activeKeys,
          suspendedKeys: keyToDelete.status === "SUSPENDED" ? Math.max(0, prev.suspendedKeys - 1) : prev.suspendedKeys,
        }));
        setKeyToDelete(null);
      } else {
        toast.error(data.error || "Failed to revoke key.");
      }
    } catch {
      toast.error("Network error deleting key.");
    } finally {
      setDeleting(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter keys
  const filteredKeys = keys.filter((k) => {
    const matchesStatus = statusFilter === "ALL" || k.status === statusFilter;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      k.name.toLowerCase().includes(query) ||
      k.key.toLowerCase().includes(query) ||
      k.user.name.toLowerCase().includes(query) ||
      k.user.email.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  // Categories for tools tab
  const toolCategories = [
    "All",
    "Billing",
    "Cloud VPS",
    "Database",
    "Storage & CDN",
    "Applications",
    "AI Gateway",
    "Network",
    "Support",
  ];

  return (
    <div className="space-y-6 max-w-full pb-16">
      {/* ── 1. HEADER SECTION (Consistent with other Admin pages) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Model Context Protocol (MCP) Gateway
          </h1>
          <p className={cn("text-xs sm:text-sm font-medium mt-1.5 max-w-3xl leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
            Manage Model Context Protocol client tokens, inspect tool invocation telemetry, and configure autonomous AI access across Masdika Cloud infrastructure.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <Link
            href="/dashboard/mcp"
            target="_blank"
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 border cursor-pointer",
              isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
            )}
          >
            <span>Customer View</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <button
            type="button"
            onClick={fetchMcpData}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-md cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── 2. STAT SUMMARY CARDS (Consistent 4-column layout) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Client Keys */}
        <div className={cn("rounded-2xl border p-5 transition-all shadow-2xs", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200 shadow-2xs")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              REGISTERED MCP KEYS
            </span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <Key className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {stats.totalKeys}
            </span>
            <span className={cn("text-xs font-semibold", isDark ? "text-cyan-400" : "text-cyan-600")}>
              Tokens
            </span>
          </div>
        </div>

        {/* Card 2: Active Keys */}
        <div className={cn("rounded-2xl border p-5 transition-all shadow-2xs", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200 shadow-2xs")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              ACTIVE TOKENS
            </span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {stats.activeKeys}
            </span>
            <span className={cn("text-xs font-semibold", isDark ? "text-cyan-400" : "text-cyan-600")}>
              Authorized
            </span>
          </div>
        </div>

        {/* Card 3: Invocations */}
        <div className={cn("rounded-2xl border p-5 transition-all shadow-2xs", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200 shadow-2xs")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              TOTAL INVOCATIONS
            </span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {stats.totalInvocations.toLocaleString("id-ID")}
            </span>
            <span className={cn("text-xs font-semibold", isDark ? "text-cyan-400" : "text-cyan-600")}>
              Calls
            </span>
          </div>
        </div>

        {/* Card 4: Tools Count */}
        <div className={cn("rounded-2xl border p-5 transition-all shadow-2xs", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200 shadow-2xs")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              REGISTERED TOOLS
            </span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-purple-500/15 border-purple-500/25 text-purple-400" : "bg-purple-50 border-purple-200 text-purple-700")}>
              <Bot className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {stats.toolsCount}
            </span>
            <span className={cn("text-xs font-semibold", isDark ? "text-purple-400" : "text-purple-600")}>
              Core Tools
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. TAB CONTROLS ── */}
      <div className={cn("flex items-center gap-1 border-b pb-3 overflow-x-auto [scrollbar-width:none]", isDark ? "border-white/10" : "border-slate-200")}>
        {[
          { id: "keys", label: `Client API Keys (${keys.length})`, icon: Key },
          { id: "tools", label: `Platform Tools (${MASDIKA_MCP_TOOLS.length})`, icon: Bot },
          { id: "architecture", label: "Protocol Architecture", icon: Terminal },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap",
                isActive
                  ? isDark
                    ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-bold shadow-xs"
                    : "bg-cyan-50 text-cyan-800 border border-cyan-300 font-bold shadow-xs"
                  : isDark
                    ? "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── 4. TAB CONTENT ── */}
      {activeTab === "keys" && (
        <div className="space-y-4">
          {/* Search & Status Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400" />
              <input
                type="text"
                placeholder="Search by customer name, email, or key..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "w-full pl-9 pr-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400",
                  isDark
                    ? "bg-[#09090b] border border-white/10 text-white placeholder-zinc-500"
                    : "bg-white border border-slate-200 text-slate-900 placeholder-slate-400 shadow-2xs"
                )}
              />
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {(["ALL", "ACTIVE", "SUSPENDED"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                    statusFilter === status
                      ? isDark
                        ? "bg-cyan-400 text-slate-950 border-cyan-400 font-bold"
                        : "bg-cyan-500 text-white border-cyan-500 font-bold"
                      : isDark
                        ? "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs"
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Keys Table */}
          <div className={cn(
            "rounded-2xl border overflow-hidden shadow-2xs",
            isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200 shadow-2xs"
          )}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={cn(
                    "border-b uppercase font-bold tracking-wider text-[11px]",
                    isDark ? "border-white/10 bg-[#16161d] text-zinc-400" : "border-slate-200 bg-slate-50 text-slate-600"
                  )}>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Key Label &amp; Token</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Invocations</th>
                    <th className="py-3 px-4">Last Used</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={cn("divide-y", isDark ? "divide-white/5" : "divide-slate-100")}>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-zinc-500">
                        <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-cyan-400" />
                        <span>Loading MCP keys...</span>
                      </td>
                    </tr>
                  ) : filteredKeys.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-zinc-500">
                        No MCP keys matching current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredKeys.map((item) => {
                      const isActive = item.status === "ACTIVE";
                      return (
                        <tr key={item.id} className={cn("transition-colors", isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50/80")}>
                          {/* Customer */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5">
                              <Link
                                href={`/admin/customers/${item.user.id}`}
                                className={cn("font-bold hover:underline flex items-center gap-1", isDark ? "text-white" : "text-slate-900")}
                              >
                                <span>{item.user.name}</span>
                                <ExternalLink className="w-2.5 h-2.5 text-cyan-400" />
                              </Link>
                              <div className="text-[11px] text-zinc-500 font-mono truncate max-w-[180px]">
                                {item.user.email}
                              </div>
                            </div>
                          </td>

                          {/* Key Label & Token */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <div className={cn("font-semibold", isDark ? "text-zinc-200" : "text-slate-800")}>
                                {item.name || "Masdika MCP Key"}
                              </div>
                              <div className="flex items-center gap-1.5 font-mono text-[11px] text-cyan-500">
                                <span>{item.maskedKey}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(item.key, `key-${item.id}`)}
                                  className={cn("p-1 rounded hover:bg-white/10 transition-colors cursor-pointer")}
                                  title="Copy raw key"
                                >
                                  {copiedId === `key-${item.id}` ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border",
                              isActive
                                ? isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : isDark ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-rose-50 text-rose-700 border-rose-200"
                            )}>
                              <span className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-emerald-400" : "bg-rose-400")} />
                              {item.status}
                            </span>
                          </td>

                          {/* Invocations */}
                          <td className="py-3.5 px-4 text-center">
                            <span className={cn("font-mono font-bold text-xs", isDark ? "text-cyan-400" : "text-cyan-600")}>
                              {item.usageCount.toLocaleString("id-ID")}
                            </span>
                          </td>

                          {/* Last Used */}
                          <td className="py-3.5 px-4 text-zinc-500 font-mono text-[11px]">
                            {item.lastUsed ? new Date(item.lastUsed).toLocaleString("id-ID") : "Never"}
                          </td>

                          {/* Created */}
                          <td className="py-3.5 px-4 text-zinc-500 font-mono text-[11px]">
                            {new Date(item.createdAt).toISOString().split("T")[0]}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                disabled={togglingId === item.id}
                                onClick={() => handleToggleStatus(item)}
                                className={cn(
                                  "px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                                  isActive
                                    ? isDark
                                      ? "border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
                                      : "border-amber-200 text-amber-700 hover:bg-amber-50"
                                    : isDark
                                      ? "border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
                                      : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                )}
                              >
                                {isActive ? "Suspend" : "Activate"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setKeyToDelete(item)}
                                className={cn(
                                  "p-1.5 rounded-lg border transition-all cursor-pointer",
                                  isDark
                                    ? "border-rose-500/20 text-rose-400 hover:bg-rose-500/10"
                                    : "border-rose-200 text-rose-600 hover:bg-rose-50"
                                )}
                                title="Revoke Key Permanently"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "tools" && (() => {
        const filteredTools = MASDIKA_MCP_TOOLS.filter((t) => {
          if (!toolSearchQuery) return true;
          const q = toolSearchQuery.toLowerCase();
          return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
        });
        const totalToolPages = Math.max(1, Math.ceil(filteredTools.length / TOOLS_PER_PAGE));
        const safeToolPage = Math.min(toolPage, totalToolPages);
        const startToolIndex = (safeToolPage - 1) * TOOLS_PER_PAGE;
        const paginatedTools = filteredTools.slice(startToolIndex, startToolIndex + TOOLS_PER_PAGE);

        return (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className={cn("text-base font-bold", isDark ? "text-white" : "text-slate-900")}>
                Supported Platform Tools ({MASDIKA_MCP_TOOLS.length})
              </h3>
              <p className={cn("text-xs font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
                Full schema definition of all tools callable by AI agents via JSON-RPC 2.0 and Stdio.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400" />
              <input
                type="text"
                placeholder="Search tools or arguments..."
                value={toolSearchQuery}
                onChange={(e) => {
                  setToolSearchQuery(e.target.value);
                  setToolPage(1);
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

          {/* Tools Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {paginatedTools.length === 0 ? (
              <div className={cn("col-span-full p-8 text-center rounded-2xl border", isDark ? "border-white/10 bg-white/5 text-zinc-400" : "border-slate-200 bg-slate-50 text-slate-500")}>
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold">No tools found matching &quot;{toolSearchQuery}&quot;</p>
              </div>
            ) : (
              paginatedTools.map((tool) => {
              const isExpanded = expandedTool === tool.name;
              const props = tool.inputSchema?.properties || {};
              const propKeys = Object.keys(props);

              return (
                <div
                  key={tool.name}
                  className={cn(
                    "self-start rounded-2xl border transition-all shadow-2xs overflow-hidden flex flex-col justify-start",
                    isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200 shadow-2xs"
                  )}
                >
                  <div
                    onClick={() => setExpandedTool(isExpanded ? null : tool.name)}
                    className="p-4 sm:p-5 flex items-start gap-3.5 cursor-pointer select-none min-h-[96px] sm:min-h-[102px]"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 mt-0.5",
                      isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700"
                    )}>
                      <Code2 className="w-5 h-5" />
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
                          {propKeys.length} Arg(s)
                        </span>
                      </div>
                      <p className={cn("text-xs leading-relaxed font-medium line-clamp-2 h-10 overflow-hidden", isDark ? "text-zinc-400" : "text-slate-600")}>
                        {tool.description}
                      </p>
                    </div>

                    <div className="shrink-0 pt-1">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-cyan-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className={cn(
                      "px-5 pb-5 pt-3 border-t space-y-3",
                      isDark ? "border-white/5 bg-black/20" : "border-slate-100 bg-slate-50/50"
                    )}>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-500">
                        Input Parameters Schema
                      </div>
                      {propKeys.length === 0 ? (
                        <div className={cn("p-2.5 rounded-xl border text-xs", isDark ? "border-white/10 text-zinc-400" : "border-slate-200 text-slate-600")}>
                          No parameters required. Safe for natural prompt queries.
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {propKeys.map((pKey) => {
                            const p = props[pKey];
                            const isReq = tool.inputSchema?.required?.includes(pKey);
                            return (
                              <div
                                key={pKey}
                                className={cn(
                                  "p-2.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-2",
                                  isDark ? "bg-[#09090b] border-white/10" : "bg-white border-slate-200"
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <code className="font-mono font-bold text-cyan-400">{pKey}</code>
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-zinc-400 border border-white/10">
                                    {p.type || "any"}
                                  </span>
                                  {isReq && <span className="text-[10px] font-bold text-rose-400 uppercase">required</span>}
                                </div>
                                <span className={cn("text-[11px] font-medium leading-relaxed sm:text-right", isDark ? "text-zinc-400" : "text-slate-600")}>
                                  {p.description}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }))}
          </div>

          {/* Pagination Bar */}
          {filteredTools.length > 0 && totalToolPages > 1 && (
            <div className={cn(
              "flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 pb-1 border-t",
              isDark ? "border-white/10 text-zinc-400" : "border-slate-200 text-slate-600"
            )}>
              <div className="text-xs font-medium">
                Showing <span className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>{startToolIndex + 1}</span> to{" "}
                <span className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>
                  {Math.min(startToolIndex + TOOLS_PER_PAGE, filteredTools.length)}
                </span>{" "}
                of <span className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>{filteredTools.length}</span> tools
              </div>

              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                <button
                  type="button"
                  disabled={safeToolPage <= 1}
                  onClick={() => setToolPage((p) => Math.max(1, p - 1))}
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

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalToolPages }, (_, idx) => idx + 1).map((pageNum) => {
                    if (
                      totalToolPages > 5 &&
                      pageNum !== 1 &&
                      pageNum !== totalToolPages &&
                      Math.abs(pageNum - safeToolPage) > 1
                    ) {
                      if (pageNum === 2 || pageNum === totalToolPages - 1) {
                        return (
                          <span key={pageNum} className="px-1 text-xs text-zinc-500 select-none">
                            ...
                          </span>
                        );
                      }
                      return null;
                    }

                    const isActive = pageNum === safeToolPage;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setToolPage(pageNum)}
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
                  disabled={safeToolPage >= totalToolPages}
                  onClick={() => setToolPage((p) => Math.min(totalToolPages, p + 1))}
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
        );
      })()}

      {activeTab === "architecture" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={cn("rounded-2xl border p-5 sm:p-6 space-y-4 shadow-2xs", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200 shadow-2xs")}>
            <div className="flex items-center gap-2.5">
              <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center shrink-0", isDark ? "bg-cyan-500/10 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <h3 className={cn("text-base font-bold", isDark ? "text-white" : "text-slate-900")}>
                  Stdio Transport Mode
                </h3>
                <p className={cn("text-xs font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
                  Used by Cursor IDE, Windsurf, Claude Desktop, and Antigravity.
                </p>
              </div>
            </div>

            <p className={cn("text-xs leading-relaxed font-medium", isDark ? "text-zinc-300" : "text-slate-600")}>
              The official NPM package <code className="font-mono text-cyan-400 font-bold">@masdika/mcp</code> is spawned locally as a child process. It reads standard JSON-RPC 2.0 lines from <code className="font-mono">stdin</code> and streams execution results to <code className="font-mono">stdout</code>, relaying tool execution to the Masdika Gateway.
            </p>

            <div className={cn("p-3 rounded-xl border font-mono text-xs overflow-x-auto", isDark ? "bg-[#09090b] border-white/10 text-cyan-300" : "bg-slate-50 border-slate-200 text-slate-800")}>
              npx -y @masdika/mcp
            </div>
          </div>

          <div className={cn("rounded-2xl border p-5 sm:p-6 space-y-4 shadow-2xs", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200 shadow-2xs")}>
            <div className="flex items-center gap-2.5">
              <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center shrink-0", isDark ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700")}>
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className={cn("text-base font-bold", isDark ? "text-white" : "text-slate-900")}>
                  Security &amp; Rate Safeguards
                </h3>
                <p className={cn("text-xs font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
                  Multi-layered authentication, scope isolation, and anti-abuse limits.
                </p>
              </div>
            </div>

            <ul className={cn("space-y-2 text-xs font-medium leading-relaxed list-disc list-inside", isDark ? "text-zinc-300" : "text-slate-600")}>
              <li>Strict 1 active MCP key policy per account.</li>
              <li>Keys are scoped to <code className="font-mono text-cyan-400">service = &quot;MCP&quot;</code> to prevent cross-service privilege escalation.</li>
              <li>Rate limited to 180 requests/min per account with IP fallback protection.</li>
              <li>All database and application operations enforce commitment balance checks.</li>
            </ul>
          </div>
        </div>
      )}

      {/* ── 5. CONFIRM REVOKE MODAL ── */}
      <ConfirmModal
        isOpen={Boolean(keyToDelete)}
        onClose={() => !deleting && setKeyToDelete(null)}
        onConfirm={handleDeleteKey}
        title="Revoke Customer MCP Key?"
        description={`Are you sure you want to permanently revoke key "${keyToDelete?.name}" owned by ${keyToDelete?.user.name} (${keyToDelete?.user.email})? Any active AI IDE using this key will immediately be disconnected.`}
        confirmText={deleting ? "Revoking..." : "Revoke Key"}
      />
    </div>
  );
}
