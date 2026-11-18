"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import {
  Users,
  FileText,
  FolderGit2,
  ArrowUpRight,
  Activity,
  MessageSquare,
  Plus,
  Wallet,
  Bell,
  UserPlus,
  Server,
  Database,
  Boxes,
  HardDrive,
  UploadCloud,
  Sparkles,
  Bot,
  Ticket,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { cn, formatCompact } from "@/lib/utils";
import { formatRupiah } from "@/lib/billing";
import { useTheme } from "@/components/ThemeProvider";
import { OnlineUsersWidget } from "@/components/admin/OnlineUsersWidget";

const VisitorChart = dynamic(
  () => import("@/components/admin/VisitorChart").then((mod) => mod.VisitorChart),
  { ssr: false }
);

interface DashboardStats {
  totalProjects: number;
  totalPosts: number;
  unreadMessages: number;
  openTickets: number;
  totalViews: number;
  cloud: {
    totalCustomers: number;
    totalCustomerBalance: number;
    activeVps: number;
    suspendedVps: number;
    activeDatabases: number;
    activeApps: number;
    activeObjectStorage: number;
    activeCdn: number;
    activeAiKeys: number;
    activeMcpKeys: number;
    monthRevenue: number;
  };
}

const DEFAULT_STATS: DashboardStats = {
  totalProjects: 0,
  totalPosts: 0,
  unreadMessages: 0,
  openTickets: 0,
  totalViews: 0,
  cloud: {
    totalCustomers: 0,
    totalCustomerBalance: 0,
    activeVps: 0,
    suspendedVps: 0,
    activeDatabases: 0,
    activeApps: 0,
    activeObjectStorage: 0,
    activeCdn: 0,
    activeAiKeys: 0,
    activeMcpKeys: 0,
    monthRevenue: 0,
  },
};

export default function AdminDashboard() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async () => {
    setRefreshing(true);
    try {
      const [dashRes, msgRes] = await Promise.all([
        fetch("/api/admin/dashboard"),
        fetch("/api/admin/messages?limit=5"),
      ]);
      const dashData = await dashRes.json();
      if (!dashData.error) {
        setStats({
          ...DEFAULT_STATS,
          ...dashData,
          cloud: {
            ...DEFAULT_STATS.cloud,
            ...(dashData.cloud || {}),
          },
        });
      }
      const msgData = await msgRes.json();
      if (!msgData.error && Array.isArray(msgData)) {
        setRecentMessages(msgData);
      }
    } catch {
      toast.error("Failed to load dashboard stats");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const totalActiveServices =
    stats.cloud.activeVps +
    stats.cloud.activeDatabases +
    stats.cloud.activeApps +
    stats.cloud.activeObjectStorage +
    stats.cloud.activeCdn;

  const serviceTiles = [
    {
      name: "Cloud VPS",
      href: "/admin/vps",
      icon: Server,
      count: stats.cloud.activeVps,
      sub: stats.cloud.suspendedVps > 0 ? `${stats.cloud.suspendedVps} Suspended` : "Proxmox KVM",
    },
    {
      name: "Managed Database",
      href: "/admin/database",
      icon: Database,
      count: stats.cloud.activeDatabases,
      sub: "Kubernetes Clusters",
    },
    {
      name: "Managed Apps",
      href: "/admin/apps",
      icon: Boxes,
      count: stats.cloud.activeApps,
      sub: "Container Workloads",
    },
    {
      name: "Object Storage",
      href: "/admin/object-storage",
      icon: HardDrive,
      count: stats.cloud.activeObjectStorage,
      sub: "RustFS S3 Buckets",
    },
    {
      name: "File CDN",
      href: "/admin/customer-cdn",
      icon: UploadCloud,
      count: stats.cloud.activeCdn,
      sub: "Edge Delivery",
    },
    {
      name: "AI Gateway & MCP",
      href: "/admin/mcp",
      icon: Bot,
      count: stats.cloud.activeMcpKeys + stats.cloud.activeAiKeys,
      sub: `${stats.cloud.activeAiKeys} AI · ${stats.cloud.activeMcpKeys} MCP Keys`,
    },
  ];

  const quickActions = [
    { name: "Customers", href: "/admin/customers", icon: Users, desc: "Manage accounts & balances" },
    { name: "PAYG Monitor", href: "/admin/payg-monitor", icon: Activity, desc: "Hourly billing & burn rate" },
    { name: "Support Tickets", href: "/admin/tickets", icon: Ticket, desc: `${stats.openTickets} open ticket(s)` },
    { name: "AI Gateway", href: "/admin/ai-gateway", icon: Sparkles, desc: "Models, pricing & upstream" },
    { name: "MCP Gateway", href: "/admin/mcp", icon: Bot, desc: "Client tokens & 45 tools" },
    { name: "Invoices & Revenue", href: "/admin/invoices", icon: Wallet, desc: "Transactions & settlements" },
  ];

  return (
    <div className="w-full flex flex-col gap-5 max-w-[1600px] mx-auto pb-10 z-10 relative">
      {/* ── 1. TOP HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-white/[0.06]">
        <div>
          <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Dashboard Overview
          </h1>
          <p className={cn("text-xs sm:text-sm mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
            Real-time control center for Masdika Cloud infrastructure, customers, and billing.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/admin/payg-monitor"
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5",
              isDark
                ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white"
                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
            )}
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>PAYG Monitor</span>
          </Link>
          <button
            type="button"
            onClick={loadDashboard}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── 2. TOP KPI CARDS (4 Columns) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Customers */}
        <Link
          href="/admin/customers"
          className={cn(
            "rounded-2xl border p-4 sm:p-5 transition-all group cursor-pointer",
            isDark
              ? "bg-[#0c0c0e] border-white/[0.08] hover:border-cyan-500/40"
              : "bg-white border-slate-200 hover:border-cyan-400 shadow-2xs"
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              TOTAL CUSTOMERS
            </span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {stats.cloud.totalCustomers.toLocaleString("id-ID")}
            </span>
            <span className={cn("text-[11px] font-semibold truncate", isDark ? "text-cyan-400" : "text-cyan-700")}>
              {formatRupiah(stats.cloud.totalCustomerBalance)} Wallet
            </span>
          </div>
        </Link>

        {/* KPI 2: Active Cloud Services */}
        <Link
          href="/admin/payg-monitor"
          className={cn(
            "rounded-2xl border p-4 sm:p-5 transition-all group cursor-pointer",
            isDark
              ? "bg-[#0c0c0e] border-white/[0.08] hover:border-cyan-500/40"
              : "bg-white border-slate-200 hover:border-cyan-400 shadow-2xs"
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              ACTIVE SERVICES
            </span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700")}>
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {totalActiveServices}
            </span>
            <span className={cn("text-[11px] font-semibold truncate", isDark ? "text-emerald-400" : "text-emerald-700")}>
              {stats.cloud.activeVps} VPS · {stats.cloud.activeDatabases} DB · {stats.cloud.activeApps} App
            </span>
          </div>
        </Link>

        {/* KPI 3: Monthly Revenue */}
        <Link
          href="/admin/revenue"
          className={cn(
            "rounded-2xl border p-4 sm:p-5 transition-all group cursor-pointer",
            isDark
              ? "bg-[#0c0c0e] border-white/[0.08] hover:border-cyan-500/40"
              : "bg-white border-slate-200 hover:border-cyan-400 shadow-2xs"
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              THIS MONTH REVENUE
            </span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className={cn("text-xl sm:text-2xl font-black tracking-tight truncate", isDark ? "text-white" : "text-slate-900")}>
              {formatRupiah(stats.cloud.monthRevenue)}
            </span>
            <span className={cn("text-[11px] font-semibold shrink-0", isDark ? "text-cyan-400" : "text-cyan-700")}>
              Paid Invoices
            </span>
          </div>
        </Link>

        {/* KPI 4: Support & Alerts */}
        <Link
          href="/admin/tickets"
          className={cn(
            "rounded-2xl border p-4 sm:p-5 transition-all group cursor-pointer",
            isDark
              ? "bg-[#0c0c0e] border-white/[0.08] hover:border-cyan-500/40"
              : "bg-white border-slate-200 hover:border-cyan-400 shadow-2xs"
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              TICKETS &amp; MESSAGES
            </span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <Ticket className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {stats.openTickets + stats.unreadMessages}
            </span>
            <span className={cn("text-[11px] font-semibold truncate", isDark ? "text-cyan-400" : "text-cyan-700")}>
              {stats.openTickets} Tickets · {stats.unreadMessages} Unread
            </span>
          </div>
        </Link>
      </div>

      {/* ── 3. MAIN 2-COLUMN BALANCED WORKSPACE ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left Column (8 cols) */}
        <div className="xl:col-span-8 flex flex-col gap-5">
          {/* Traffic / Reach Chart */}
          <div className={cn("backdrop-blur-md rounded-2xl border p-4 sm:p-5 relative overflow-hidden group", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-sm" : "bg-white border-slate-200 shadow-sm")}>
            <div className={cn("absolute top-0 right-0 w-56 h-56 rounded-full blur-[80px] pointer-events-none group-hover:bg-cyan-500/15 transition-all duration-700", isDark ? "bg-cyan-500/10" : "bg-cyan-50")} />
            <div className="relative z-10 h-[290px] sm:h-[320px] w-full">
              <VisitorChart />
            </div>
          </div>

          {/* Cloud Infrastructure Breakdown */}
          <div className={cn("rounded-2xl border p-4 sm:p-5 space-y-4", isDark ? "bg-[#0c0c0e] border-white/[0.08]" : "bg-white border-slate-200 shadow-sm")}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className={cn("text-sm sm:text-base font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                  Cloud Infrastructure Services
                </h2>
                <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                  Click any service category to inspect nodes, customer instances, or logs.
                </p>
              </div>
              <Link
                href="/admin/payg-monitor"
                className={cn("text-xs font-semibold flex items-center gap-1 shrink-0 hover:underline", isDark ? "text-cyan-400" : "text-cyan-700")}
              >
                <span>Monitor All</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {serviceTiles.map((svc) => {
                const Icon = svc.icon;
                return (
                  <Link
                    key={svc.name}
                    href={svc.href}
                    className={cn(
                      "p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 group",
                      isDark
                        ? "bg-[#111115] border-white/[0.06] hover:border-cyan-500/35 hover:bg-white/[0.03]"
                        : "bg-slate-50/70 border-slate-200 hover:border-cyan-400 hover:bg-cyan-50/40"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "w-9 h-9 rounded-xl border flex items-center justify-center shrink-0",
                        isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700"
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className={cn("text-xs font-bold truncate group-hover:text-cyan-400 transition-colors", isDark ? "text-white" : "text-slate-900")}>
                          {svc.name}
                        </div>
                        <div className={cn("text-[11px] truncate", isDark ? "text-zinc-400" : "text-slate-500")}>
                          {svc.sub}
                        </div>
                      </div>
                    </div>
                    <span className={cn("text-lg font-black tabular-nums shrink-0", isDark ? "text-white" : "text-slate-900")}>
                      {svc.count}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Quick Management Shortcuts */}
          <div className={cn("rounded-2xl border p-4 sm:p-5 space-y-4", isDark ? "bg-[#0c0c0e] border-white/[0.08]" : "bg-white border-slate-200 shadow-sm")}>
            <div className="flex items-center justify-between">
              <h2 className={cn("text-sm sm:text-base font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                Quick Management Shortcuts
              </h2>
              <span className={cn("text-[11px] font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
                Operations &amp; Billing
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {quickActions.map((act) => {
                const Icon = act.icon;
                return (
                  <Link
                    key={act.name}
                    href={act.href}
                    className={cn(
                      "p-3 rounded-xl border transition-all flex items-center justify-between gap-2.5 group",
                      isDark
                        ? "bg-[#111115] border-white/[0.06] hover:border-cyan-500/35"
                        : "bg-slate-50/70 border-slate-200 hover:border-cyan-400"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div className="min-w-0">
                        <div className={cn("text-xs font-bold truncate", isDark ? "text-zinc-100" : "text-slate-800")}>
                          {act.name}
                        </div>
                        <div className={cn("text-[10px] truncate", isDark ? "text-zinc-500" : "text-slate-500")}>
                          {act.desc}
                        </div>
                      </div>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-cyan-400 shrink-0 transition-colors" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols) */}
        <div className="xl:col-span-4 flex flex-col gap-5">
          {/* Online Users Widget */}
          <OnlineUsersWidget />

          {/* Recent Messages & System Notifications */}
          <div className={cn("backdrop-blur-xl rounded-2xl border p-4 sm:p-5 flex flex-col", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-sm" : "bg-white border-slate-200 shadow-sm")}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className={cn("text-sm font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                  Recent Messages
                </h2>
                <div className={cn("text-[11px] mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                  {stats.unreadMessages} unread message(s)
                </div>
              </div>
              <Link
                href="/admin/messages"
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center transition-colors border",
                  isDark ? "text-zinc-300 border-white/[0.08] bg-[#0a0a0c] hover:bg-white/[0.05]" : "text-slate-600 border-slate-200 bg-slate-50 hover:bg-slate-100"
                )}
              >
                <Plus className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {recentMessages.length === 0 ? (
                <div className="flex items-center justify-center flex-col text-zinc-500 py-10">
                  <MessageSquare className="w-6 h-6 mb-1.5 opacity-50" />
                  <div className="text-xs">No messages found</div>
                </div>
              ) : (
                recentMessages.map((msg, idx) => {
                  const colors = [
                    isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200",
                    isDark ? "bg-cyan-600/10 text-cyan-500 border-cyan-600/20" : "bg-cyan-100 text-cyan-800 border-cyan-300",
                  ];
                  const colorClass = colors[idx % colors.length];

                  return (
                    <Link
                      key={msg.id}
                      href="/admin/messages"
                      className={cn(
                        "flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer group",
                        isDark ? "bg-[#0a0a0c] hover:bg-white/[0.04] border-white/[0.08]" : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {msg.name === "System Notification" ? (
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/25" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
                            {msg.subject?.toLowerCase().includes("top up") || msg.subject?.toLowerCase().includes("payment") ? (
                              <Wallet className="w-4 h-4" />
                            ) : msg.subject?.toLowerCase().includes("user") ? (
                              <UserPlus className="w-4 h-4" />
                            ) : (
                              <Bell className="w-4 h-4" />
                            )}
                          </div>
                        ) : (
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border shrink-0 ${colorClass}`}>
                            {msg.name?.substring(0, 2).toUpperCase() || "AN"}
                          </div>
                        )}
                        <div className="min-w-0 pr-2">
                          <div className={cn("text-xs font-semibold transition-colors truncate", isDark ? "text-zinc-200 group-hover:text-white" : "text-slate-800 group-hover:text-slate-900")}>
                            {msg.name}
                          </div>
                          <div className="text-[10px] text-zinc-500 truncate mt-0.5">
                            {msg.subject || "No Subject"}
                          </div>
                        </div>
                      </div>
                      <div className={cn("w-6 h-6 rounded-md flex items-center justify-center shrink-0 group-hover:bg-cyan-500 group-hover:text-white transition-all", isDark ? "text-zinc-400" : "text-slate-500")}>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </div>
                    </Link>
                  );
                })
              )}
            </div>

            <div className={cn("mt-3 pt-3 border-t text-center", isDark ? "border-white/[0.06]" : "border-slate-200")}>
              <Link href="/admin/messages" className={cn("text-xs font-semibold hover:underline transition-colors inline-flex items-center gap-1", isDark ? "text-cyan-400" : "text-cyan-700")}>
                <span>View all messages</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Content & Organic Reach Compact Summary */}
          <div className={cn("rounded-2xl border p-4 sm:p-5 space-y-3", isDark ? "bg-[#0c0c0e] border-white/[0.08]" : "bg-white border-slate-200 shadow-sm")}>
            <div className="flex items-center justify-between">
              <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
                CONTENT &amp; ORGANIC REACH
              </span>
              <span className={cn("text-xs font-bold font-mono", isDark ? "text-cyan-400" : "text-cyan-700")}>
                {formatCompact(stats.totalViews)} Views
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/admin/portfolio"
                className={cn(
                  "p-3 rounded-xl border transition-all flex items-center justify-between",
                  isDark ? "bg-[#111115] border-white/[0.06] hover:border-cyan-500/30" : "bg-slate-50 border-slate-200 hover:border-cyan-400"
                )}
              >
                <div className="flex items-center gap-2">
                  <FolderGit2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span className={cn("text-xs font-semibold", isDark ? "text-zinc-300" : "text-slate-700")}>Projects</span>
                </div>
                <span className={cn("text-sm font-black", isDark ? "text-white" : "text-slate-900")}>{stats.totalProjects}</span>
              </Link>
              <Link
                href="/admin/blog"
                className={cn(
                  "p-3 rounded-xl border transition-all flex items-center justify-between",
                  isDark ? "bg-[#111115] border-white/[0.06] hover:border-cyan-500/30" : "bg-slate-50 border-slate-200 hover:border-cyan-400"
                )}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span className={cn("text-xs font-semibold", isDark ? "text-zinc-300" : "text-slate-700")}>Articles</span>
                </div>
                <span className={cn("text-sm font-black", isDark ? "text-white" : "text-slate-900")}>{stats.totalPosts}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
