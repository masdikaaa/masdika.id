"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/billing";
import { toast } from "sonner";
import {
  Boxes,
  RefreshCw,
  Server,
  ExternalLink,
  Power,
  Copy,
  Check,
  Activity,
  ShieldCheck,
  HardDrive,
  Cpu,
  Layers,
  AlertTriangle,
  Play,
  Square,
  RotateCw,
  Trash2,
  Search,
  Settings,
  Globe,
  TrendingUp,
} from "lucide-react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { MANAGED_APPS_CATALOG } from "@/lib/app-catalog";

interface AdminAppItem {
  id: number;
  name: string;
  appType: string;
  templateName: string;
  planName: string;
  subdomain: string;
  fullDomain: string;
  httpsUrl: string;
  nodePortUrl: string;
  publicIp?: string;
  port: number;
  appPort: number;
  cpuShares: number;
  memoryMb: number;
  storageGb: number;
  monthlyPrice: number;
  hourlyRate: number;
  status: "RUNNING" | "STOPPED" | "PROVISIONING" | "SUSPENDED" | "TERMINATED";
  createdAt: string;
  customerName: string;
  customerEmail: string;
  catalog?: any;
}

export default function AdminManagedAppsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [apps, setApps] = useState<AdminAppItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [poweringId, setPoweringId] = useState<number | null>(null);
  const [deleteModalItem, setDeleteModalItem] = useState<AdminAppItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchApps = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/apps");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setApps(json.data);
        setStats(json.stats);
      } else {
        toast.error(json.error || "Failed to load managed applications");
      }
    } catch {
      toast.error("Failed to connect to admin API");
    } finally {
      setLoading(false);
      setTimeout(() => setRefreshing(false), 300);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePowerAction = async (id: number, action: "start" | "stop" | "restart") => {
    setPoweringId(id);
    const toastId = toast.loading(`Executing ${action} on application...`);
    try {
      const res = await fetch("/api/admin/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || `Application ${action}ed successfully`, { id: toastId });
        fetchApps();
      } else {
        toast.error(data.error || `Failed to ${action} application`, { id: toastId });
      }
    } catch {
      toast.error("An error occurred during power action", { id: toastId });
    } finally {
      setPoweringId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteModalItem) return;
    setDeleting(true);
    const toastId = toast.loading(`Terminating ${deleteModalItem.name} on cluster...`);
    try {
      const res = await fetch("/api/admin/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: deleteModalItem.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || "Application terminated successfully", { id: toastId });
        setDeleteModalItem(null);
        fetchApps();
      } else {
        toast.error(data.error || "Failed to terminate application", { id: toastId });
      }
    } catch {
      toast.error("An error occurred during termination", { id: toastId });
    } finally {
      setDeleting(false);
    }
  };

  const filteredApps = apps.filter((app) => {
    if (selectedType !== "ALL" && app.appType.toLowerCase() !== selectedType.toLowerCase()) {
      return false;
    }
    if (selectedStatus !== "ALL" && app.status !== selectedStatus) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = app.name.toLowerCase().includes(q);
      const matchCustomer = app.customerName.toLowerCase().includes(q) || app.customerEmail.toLowerCase().includes(q);
      const matchDomain = app.fullDomain.toLowerCase().includes(q);
      if (!matchName && !matchCustomer && !matchDomain) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-full pb-16">
      {/* Top Banner Header (Consistent with Gambar 3 Managed Database) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Managed Applications Clusters
            </h1>
            <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold border", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
              Kubernetes Native
            </span>
          </div>
          <p className={cn("text-xs sm:text-sm font-medium mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>
            Manage all customer AI agents, gateways &amp; workflow pods deployed on Kubernetes.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchApps}
            disabled={refreshing || loading}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 border cursor-pointer",
              isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
            )}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", (refreshing || loading) && "animate-spin text-cyan-400")} />
            <span>Refresh</span>
          </button>
          <Link
            href="/admin/settings?tab=apps"
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Cluster Settings</span>
          </Link>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={cn("rounded-2xl border p-5 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              TOTAL APPS
            </span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {stats?.totalInstances ?? apps.length}
            </span>
            <span className={cn("text-xs font-semibold", isDark ? "text-cyan-400" : "text-cyan-600")}>
              Active Instances
            </span>
          </div>
        </div>

        <div className={cn("rounded-2xl border p-5 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              RUNNING PODS
            </span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700")}>
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-black tracking-tight text-emerald-400")}>
              {stats?.runningCount ?? apps.filter((a) => a.status === "RUNNING").length}
            </span>
            <span className={cn("text-xs font-semibold", isDark ? "text-emerald-400" : "text-emerald-600")}>
              Online
            </span>
          </div>
        </div>

        <div className={cn("rounded-2xl border p-5 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              ALLOCATED COMPUTE
            </span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {stats?.totalCpu ?? 0} vCPU
            </span>
            <span className={cn("text-xs font-semibold", isDark ? "text-cyan-400" : "text-cyan-600")}>
              • {stats?.totalMemoryGb ?? 0} GB RAM
            </span>
          </div>
        </div>

        <div className={cn("rounded-2xl border p-5 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              KUBERNETES HOST CAPACITY
            </span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-xl sm:text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              16 GB • 8 Core
            </span>
            <span className={cn("text-xs font-semibold", isDark ? "text-cyan-400" : "text-cyan-600")}>
              Shared
            </span>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className={cn("rounded-2xl border p-3.5 sm:p-4 transition-all flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3", isDark ? "bg-[#0c0c0e] border-white/[0.08]" : "bg-white border-slate-200 shadow-xs")}>
        <div className="relative w-full md:w-80 shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by instance, customer name, email, or port..."
            className={cn(
              "w-full pl-9 pr-3 py-2 rounded-xl border text-xs transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400",
              isDark ? "bg-white/[0.03] border-white/10 text-white placeholder-zinc-500" : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400"
            )}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto overflow-hidden">
          {/* App Stack Pill Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none no-scrollbar py-0.5 max-w-full">
            <button
              type="button"
              onClick={() => setSelectedType("ALL")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0",
                selectedType === "ALL"
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-xs"
                  : isDark ? "bg-white/5 text-zinc-400 hover:text-white" : "bg-slate-100 text-slate-600 hover:text-slate-900"
              )}
            >
              All Apps
            </button>
            {MANAGED_APPS_CATALOG.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedType(cat.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0",
                  selectedType === cat.id
                    ? "bg-cyan-500 text-slate-950 font-bold shadow-xs"
                    : isDark ? "bg-white/5 text-zinc-400 hover:text-white" : "bg-slate-100 text-slate-600 hover:text-slate-900"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Status Pill Filters */}
          <div className={cn(
            "flex items-center gap-1.5 overflow-x-auto scrollbar-none no-scrollbar py-0.5 max-w-full sm:pl-2.5 sm:border-l border-t sm:border-t-0 pt-2 sm:pt-0 shrink-0",
            isDark ? "border-white/10" : "border-slate-200"
          )}>
            {["ALL", "RUNNING", "STOPPED"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStatus(st)}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer uppercase whitespace-nowrap shrink-0",
                  selectedStatus === st
                    ? "bg-cyan-500 text-slate-950 font-bold shadow-xs"
                    : isDark ? "bg-white/5 text-zinc-400 hover:text-white" : "bg-slate-100 text-slate-600 hover:text-slate-900"
                )}
              >
                {st === "ALL" ? "All Status" : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content: Desktop Table & Mobile Card View */}
      <div className={cn("rounded-2xl border overflow-hidden transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
        {/* Desktop / Tablet Table View */}
        <div className="hidden md:block overflow-x-auto scrollbar-none no-scrollbar">
          <table className="w-full min-w-[700px] text-left text-xs border-collapse">
            <thead>
              <tr className={cn("border-b text-[11px] font-bold uppercase tracking-wider", isDark ? "border-white/[0.08] text-zinc-400 bg-white/[0.02]" : "border-slate-200 text-slate-500 bg-slate-50/70")}>
                <th className="py-3 px-4">APPLICATION</th>
                <th className="py-3 px-4">CUSTOMER</th>
                <th className="py-3 px-4">HTTPS ENDPOINT</th>
                <th className="py-3 px-4">SPECIFICATIONS</th>
                <th className="py-3 px-4">MONTHLY</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mx-auto mb-2" />
                    <span>Loading application instances...</span>
                  </td>
                </tr>
              ) : filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    No managed applications found matching filters.
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => (
                  <tr
                    key={app.id}
                    className={cn(
                      "transition-colors",
                      isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50/60"
                    )}
                  >
                    {/* Application Info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 p-1",
                          isDark ? "bg-cyan-500/10 border-cyan-500/25" : "bg-cyan-50 border-cyan-200"
                        )}>
                          <Image
                            src={app.catalog?.icon || "/images/apps/docker.svg"}
                            alt={app.name}
                            width={24}
                            height={24}
                            className="object-contain"
                            unoptimized
                          />
                        </div>
                        <div className="min-w-0">
                          <span className={cn("font-bold text-sm block truncate", isDark ? "text-white" : "text-slate-900")}>
                            {app.name}
                          </span>
                          <span className={cn("text-[10px] font-semibold block", isDark ? "text-cyan-400" : "text-cyan-700")}>
                            {app.templateName}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4">
                      <span className={cn("font-semibold block", isDark ? "text-zinc-200" : "text-slate-800")}>
                        {app.customerName}
                      </span>
                      <span className={cn("font-mono text-[11px] block", isDark ? "text-zinc-500" : "text-slate-500")}>
                        {app.customerEmail}
                      </span>
                    </td>

                    {/* Ingress / Terminal Endpoint */}
                    <td className="py-3 px-4">
                      {app.catalog?.accessProtocol === 'BOTH' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(app.httpsUrl, `url-${app.id}`)}
                            className={cn("font-mono font-bold text-xs flex items-center gap-1 hover:underline cursor-pointer", isDark ? "text-cyan-400" : "text-cyan-700")}
                            title="Click to copy Web URL"
                          >
                            <Globe className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[180px]">{app.fullDomain}</span>
                            {copiedId === `url-${app.id}` ? <Check className="w-3 h-3 text-emerald-400 shrink-0" /> : <Copy className="w-3 h-3 opacity-60 shrink-0" />}
                          </button>
                          <span className={cn("text-[10px] font-mono block mt-0.5", isDark ? "text-zinc-500" : "text-slate-400")}>
                            SSH: {app.publicIp || stats.publicIp || ""}:{app.port}
                          </span>
                        </>
                      ) : app.catalog?.accessProtocol === 'SSH' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(`ssh root@${app.publicIp || stats.publicIp || ""} -p ${app.port}`, `ssh-${app.id}`)}
                            className={cn("font-mono font-bold text-xs flex items-center gap-1 hover:underline cursor-pointer", isDark ? "text-amber-400" : "text-amber-700")}
                            title="Click to copy SSH command"
                          >
                            <Server className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[180px]">{app.publicIp || stats.publicIp || ""}:{app.port}</span>
                            {copiedId === `ssh-${app.id}` ? <Check className="w-3 h-3 text-emerald-400 shrink-0" /> : <Copy className="w-3 h-3 opacity-60 shrink-0" />}
                          </button>
                          <span className={cn("text-[10px] font-mono block mt-0.5", isDark ? "text-zinc-500" : "text-slate-400")}>
                            Port: {app.port} (SSH Terminal)
                          </span>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(app.httpsUrl, `url-${app.id}`)}
                            className={cn("font-mono font-bold text-xs flex items-center gap-1 hover:underline cursor-pointer", isDark ? "text-cyan-400" : "text-cyan-700")}
                            title="Click to copy Web URL"
                          >
                            <Globe className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[180px]">{app.fullDomain}</span>
                            {copiedId === `url-${app.id}` ? <Check className="w-3 h-3 text-emerald-400 shrink-0" /> : <Copy className="w-3 h-3 opacity-60 shrink-0" />}
                          </button>
                          <span className={cn("text-[10px] font-mono block mt-0.5", isDark ? "text-zinc-500" : "text-slate-400")}>
                            HTTPS Wildcard SSL
                          </span>
                        </>
                      )}
                    </td>

                    {/* Specifications */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={cn("px-2 py-0.5 rounded font-mono text-[11px] font-semibold border", isDark ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
                          {app.cpuShares} vCPU
                        </span>
                        <span className={cn("px-2 py-0.5 rounded font-mono text-[11px] font-semibold border", isDark ? "bg-purple-500/10 text-purple-300 border-purple-500/20" : "bg-purple-50 text-purple-700 border-purple-200")}>
                          {app.memoryMb >= 1024 ? `${app.memoryMb / 1024} GB` : `${app.memoryMb} MB`}
                        </span>
                        <span className={cn("px-2 py-0.5 rounded font-mono text-[10px] font-medium border", isDark ? "bg-white/[0.04] text-zinc-400 border-white/[0.08]" : "bg-slate-100 text-slate-600 border-slate-200")}>
                          Shared Pool
                        </span>
                      </div>
                    </td>

                    {/* Monthly Price */}
                    <td className="py-3 px-4">
                      <span className={cn("font-mono font-bold text-xs", isDark ? "text-cyan-400" : "text-cyan-700")}>
                        {formatRupiah(app.monthlyPrice)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border",
                        app.status === "RUNNING"
                          ? (isDark ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-200")
                          : (isDark ? "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" : "bg-slate-100 text-slate-600 border-slate-200")
                      )}>
                        {app.status === "RUNNING" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                        {app.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Power Controls */}
                        {app.status === "RUNNING" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handlePowerAction(app.id, "stop")}
                              disabled={poweringId === app.id}
                              className={cn(
                                "p-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-50",
                                isDark ? "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20" : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                              )}
                              title="Stop Application"
                            >
                              <Square className="w-3.5 h-3.5 fill-current" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePowerAction(app.id, "restart")}
                              disabled={poweringId === app.id}
                              className={cn(
                                "p-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-50",
                                isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20" : "bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100"
                              )}
                              title="Restart Application"
                            >
                              <RotateCw className={cn("w-3.5 h-3.5", poweringId === app.id && "animate-spin")} />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handlePowerAction(app.id, "start")}
                            disabled={poweringId === app.id}
                            className={cn(
                              "p-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-50",
                              isDark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20" : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                            )}
                            title="Start Application"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        )}

                        {/* Open in Browser / Instance Dashboard */}
                        <a
                          href={app.catalog?.accessProtocol === 'SSH' ? `/dashboard/apps/${app.id}` : app.httpsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn("p-1.5 rounded-lg border transition-all cursor-pointer", isDark ? "bg-white/5 border-white/10 hover:bg-white/10 text-cyan-300" : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-cyan-700")}
                          title={app.catalog?.accessProtocol === 'SSH' ? "Open Instance Dashboard (Terminal)" : "Open Application Web URL"}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        {/* Terminate Instance */}
                        <button
                          type="button"
                          onClick={() => setDeleteModalItem(app)}
                          className={cn("p-1.5 rounded-lg border transition-all cursor-pointer", isDark ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20" : "bg-red-50 border-red-200 text-red-600 hover:bg-red-100")}
                          title="Terminate Application Instance"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Cards (block md:hidden) */}
        <div className={cn("block md:hidden divide-y", isDark ? "divide-white/[0.06]" : "divide-slate-100")}>
          {loading ? (
            <div className="py-12 text-center text-zinc-500">
              <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mx-auto mb-2" />
              <span className="text-xs">Loading application instances...</span>
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              No managed applications found matching filters.
            </div>
          ) : (
            filteredApps.map((app) => (
              <div key={app.id} className="p-4 space-y-3">
                {/* Card Top: Icon + Name + Status */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 p-1.5",
                      isDark ? "bg-cyan-500/10 border-cyan-500/25" : "bg-cyan-50 border-cyan-200"
                    )}>
                      <Image
                        src={app.catalog?.icon || "/images/apps/docker.svg"}
                        alt={app.name}
                        width={26}
                        height={26}
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className={cn("font-bold text-sm truncate", isDark ? "text-white" : "text-slate-900")}>
                        {app.name}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={cn("text-[10px] font-semibold", isDark ? "text-cyan-400" : "text-cyan-700")}>
                          {app.templateName}
                        </span>
                        <span className="text-zinc-600 text-xs">•</span>
                        <span className={cn("font-mono font-bold text-[11px]", isDark ? "text-cyan-300" : "text-cyan-700")}>
                          {formatRupiah(app.monthlyPrice)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0",
                    app.status === "RUNNING"
                      ? (isDark ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-200")
                      : (isDark ? "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" : "bg-slate-100 text-slate-600 border-slate-200")
                  )}>
                    {app.status === "RUNNING" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                    {app.status}
                  </span>
                </div>

                {/* Details Box */}
                <div className={cn("p-2.5 rounded-xl border text-xs space-y-1.5", isDark ? "bg-white/[0.02] border-white/[0.06]" : "bg-slate-50 border-slate-200/80")}>
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className={cn("font-medium shrink-0", isDark ? "text-zinc-400" : "text-slate-500")}>Customer</span>
                    <span className={cn("font-semibold truncate text-right", isDark ? "text-zinc-200" : "text-slate-800")}>
                      {app.customerName} <span className="text-zinc-500 font-mono">({app.customerEmail})</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className={cn("font-medium shrink-0", isDark ? "text-zinc-400" : "text-slate-500")}>Endpoint</span>
                    {app.catalog?.accessProtocol === 'BOTH' ? (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(app.httpsUrl, `url-m-${app.id}`)}
                        className={cn("font-mono font-bold flex items-center gap-1 hover:underline cursor-pointer truncate max-w-[200px]", isDark ? "text-cyan-400" : "text-cyan-700")}
                      >
                        <Globe className="w-3 h-3 shrink-0" />
                        <span className="truncate">{app.fullDomain}</span>
                        {copiedId === `url-m-${app.id}` ? <Check className="w-3 h-3 text-emerald-400 shrink-0" /> : <Copy className="w-3 h-3 opacity-60 shrink-0" />}
                      </button>
                    ) : app.catalog?.accessProtocol === 'SSH' ? (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(`ssh root@${app.publicIp || stats.publicIp || ""} -p ${app.port}`, `ssh-m-${app.id}`)}
                        className={cn("font-mono font-bold flex items-center gap-1 hover:underline cursor-pointer truncate max-w-[200px]", isDark ? "text-amber-400" : "text-amber-700")}
                      >
                        <Server className="w-3 h-3 shrink-0" />
                        <span className="truncate">{app.publicIp || stats.publicIp || ""}:{app.port}</span>
                        {copiedId === `ssh-m-${app.id}` ? <Check className="w-3 h-3 text-emerald-400 shrink-0" /> : <Copy className="w-3 h-3 opacity-60 shrink-0" />}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(app.httpsUrl, `url-m-${app.id}`)}
                        className={cn("font-mono font-bold flex items-center gap-1 hover:underline cursor-pointer truncate max-w-[200px]", isDark ? "text-cyan-400" : "text-cyan-700")}
                      >
                        <Globe className="w-3 h-3 shrink-0" />
                        <span className="truncate">{app.fullDomain}</span>
                        {copiedId === `url-m-${app.id}` ? <Check className="w-3 h-3 text-emerald-400 shrink-0" /> : <Copy className="w-3 h-3 opacity-60 shrink-0" />}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className={cn("font-medium shrink-0", isDark ? "text-zinc-400" : "text-slate-500")}>Spec</span>
                    <div className="flex items-center gap-1.5 font-mono text-[10px]">
                      <span className={cn("px-1.5 py-0.5 rounded border font-semibold", isDark ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
                        {app.cpuShares} vCPU
                      </span>
                      <span className={cn("px-1.5 py-0.5 rounded border font-semibold", isDark ? "bg-purple-500/10 text-purple-300 border-purple-500/20" : "bg-purple-50 text-purple-700 border-purple-200")}>
                        {app.memoryMb >= 1024 ? `${app.memoryMb / 1024} GB` : `${app.memoryMb} MB`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mobile Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  {app.status === "RUNNING" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handlePowerAction(app.id, "restart")}
                        disabled={poweringId === app.id}
                        className={cn(
                          "flex-1 py-1.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50",
                          isDark ? "bg-cyan-500/10 border-cyan-500/25 text-cyan-400 hover:bg-cyan-500/20" : "bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100"
                        )}
                      >
                        <RotateCw className={cn("w-3.5 h-3.5", poweringId === app.id && "animate-spin")} />
                        <span>Restart</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePowerAction(app.id, "stop")}
                        disabled={poweringId === app.id}
                        className={cn(
                          "py-1.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50",
                          isDark ? "bg-amber-500/10 border-amber-500/25 text-amber-400 hover:bg-amber-500/20" : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                        )}
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Stop</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handlePowerAction(app.id, "start")}
                      disabled={poweringId === app.id}
                      className={cn(
                        "flex-1 py-1.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50",
                        isDark ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20" : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                      )}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start</span>
                    </button>
                  )}

                  <a
                    href={app.catalog?.accessProtocol === 'SSH' ? `/dashboard/apps/${app.id}` : app.httpsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center",
                      isDark ? "bg-white/5 border-white/10 hover:bg-white/10 text-cyan-300" : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-cyan-700"
                    )}
                    title={app.catalog?.accessProtocol === 'SSH' ? "Open Instance Dashboard" : "Open Application Web URL"}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={() => setDeleteModalItem(app)}
                    className={cn(
                      "p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center",
                      isDark ? "bg-red-500/10 border-red-500/25 text-red-400 hover:bg-red-500/20" : "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                    )}
                    title="Terminate Instance"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete / Terminate Confirmation Modal */}
      {deleteModalItem && (
        <ConfirmModal
          isOpen={!!deleteModalItem}
          onClose={() => setDeleteModalItem(null)}
          onConfirm={handleDelete}
          title="Terminate Application Instance"
          description={`Are you sure you want to terminate ${deleteModalItem.name} (${deleteModalItem.appType}) belonging to ${deleteModalItem.customerEmail}? This will permanently delete the container pod, service, ingress, and persistent disk volume.`}
          confirmText="Terminate Instance"
          cancelText="Cancel"
          variant="danger"
          icon={<Trash2 className="w-8 h-8" />}
          isLoading={deleting}
        />
      )}
    </div>
  );
}
