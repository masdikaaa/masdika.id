"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import {
  Boxes,
  Plus,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Activity,
  Server,
  Globe,
  ShieldCheck,
  Check,
  Copy,
  Zap,
  Play,
  Square,
  RotateCw,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  MANAGED_APPS_CATALOG,
  formatRupiah,
  getAppDefinition,
} from "@/lib/app-catalog";
import { AppScaleModal } from "@/components/AppScaleModal";

export default function ManagedAppsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scalingApp, setScalingApp] = useState<any | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchApps = async () => {
    try {
      const res = await fetch("/api/user/apps");
      const data = await res.json();
      if (res.ok && data.data) {
        setApps(data.data);
      }
    } catch {
      toast.error("Failed to load managed applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const runningCount = apps.filter((a) => a.status === "RUNNING").length;
  const totalMonthlySpend = apps.reduce((sum, a) => sum + (a.monthlyPrice || 0), 0);

  return (
    <div className="space-y-6 sm:space-y-8 max-w-full pb-16">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-medium">
        <Link href="/dashboard" className="hover:text-cyan-400 transition-colors">
          Dashboard
        </Link>
        <ChevronRight className="w-3.5 h-3.5 opacity-50" />
        <span className={cn(isDark ? "text-zinc-200" : "text-slate-700", "font-semibold")}>
          Managed Apps
        </span>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className={cn("text-xl sm:text-2xl lg:text-3xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Managed Applications
            </h1>
            <span className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border",
              isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200"
            )}>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              Production K8s Engine
            </span>
          </div>
          <p className={cn("text-xs sm:text-sm font-medium mt-1.5 max-w-2xl leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
            Deploy autonomous AI agents, multi-LLM gateways, and workflow engines with dedicated Kubernetes compute and automatic Let&apos;s Encrypt SSL.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/apps/new"
            className={cn(
              "px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95",
              isDark
                ? "bg-blue-600 hover:bg-blue-500 shadow-blue-600/20"
                : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/10"
            )}
          >
            <Plus className="w-4 h-4" />
            <span>Deploy New App</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={cn(
          "p-4 rounded-2xl border transition-all",
          isDark ? "bg-[#101014] border-white/[0.08]" : "bg-white border-slate-200 shadow-2xs"
        )}>
          <div className="flex items-center justify-between text-xs font-medium text-[var(--text-muted)] mb-2">
            <span>Total Apps</span>
            <Boxes className="w-4 h-4 text-blue-400" />
          </div>
          <p className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            {apps.length}
          </p>
          <span className="text-[11px] text-[var(--text-muted)]">Active container instances</span>
        </div>

        <div className={cn(
          "p-4 rounded-2xl border transition-all",
          isDark ? "bg-[#101014] border-white/[0.08]" : "bg-white border-slate-200 shadow-2xs"
        )}>
          <div className="flex items-center justify-between text-xs font-medium text-[var(--text-muted)] mb-2">
            <span>Running Pods</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <p className={cn("text-2xl font-black tracking-tight text-emerald-400")}>
            {runningCount}
          </p>
          <span className="text-[11px] text-[var(--text-muted)]">Operational & ready</span>
        </div>

        <div className={cn(
          "p-4 rounded-2xl border transition-all",
          isDark ? "bg-[#101014] border-white/[0.08]" : "bg-white border-slate-200 shadow-2xs"
        )}>
          <div className="flex items-center justify-between text-xs font-medium text-[var(--text-muted)] mb-2">
            <span>Monthly Commitment</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <p className={cn("text-2xl font-black tracking-tight", isDark ? "text-cyan-400" : "text-cyan-700")}>
            {formatRupiah(totalMonthlySpend)}
          </p>
          <span className="text-[11px] text-[var(--text-muted)]">Estimated recurring cost</span>
        </div>

        <div className={cn(
          "p-4 rounded-2xl border transition-all",
          isDark ? "bg-[#101014] border-white/[0.08]" : "bg-white border-slate-200 shadow-2xs"
        )}>
          <div className="flex items-center justify-between text-xs font-medium text-[var(--text-muted)] mb-2">
            <span>Kubernetes Cluster</span>
            <Server className="w-4 h-4 text-violet-400" />
          </div>
          <p className={cn("text-sm font-bold truncate mt-1.5", isDark ? "text-white" : "text-slate-900")}>
            managed-apps
          </p>
          <span className="text-[11px] font-mono text-[var(--text-muted)]">192.168.79.17:6443</span>
        </div>
      </div>

      {/* Main Apps List / Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="w-7 h-7 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </div>
      ) : apps.length === 0 ? (
        /* Empty State */
        <div className={cn(
          "p-8 sm:p-12 rounded-3xl border text-center space-y-6 transition-all",
          isDark ? "bg-[#101014] border-white/[0.08]" : "bg-white border-slate-200 shadow-sm"
        )}>
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
            <Boxes className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h3 className={cn("text-lg font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              No Applications Deployed Yet
            </h3>
            <p className={cn("text-xs sm:text-sm leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
              Get started by launching Hermes Agent, 9Router, n8n, OpenCode, or OpenClaw in a single click with automated SSL.
            </p>
          </div>

          <div>
            <Link
              href="/dashboard/apps/new"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Deploy Your First App</span>
            </Link>
          </div>

          {/* Quick Showcase of 5 Apps */}
          <div className="pt-8 border-t border-inherit grid grid-cols-1 sm:grid-cols-5 gap-3 max-w-4xl mx-auto text-left">
            {MANAGED_APPS_CATALOG.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "p-3 rounded-xl border text-xs space-y-1.5",
                  isDark ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-200"
                )}
              >
                <div className="w-8 h-8 rounded-lg p-1 bg-black/40 border border-white/10 relative overflow-hidden">
                  <Image
                    src={item.icon}
                    alt={item.name}
                    width={28}
                    height={28}
                    className="object-contain w-full h-full"
                    unoptimized
                  />
                </div>
                <p className="font-bold tracking-tight truncate">{item.name}</p>
                <p className="text-[10px] text-[var(--text-muted)] line-clamp-1">{item.badge}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Applications Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {apps.map((app) => {
            const catalog = getAppDefinition(app.appType);
            const fullDomain = `${app.subdomain}.app.masdika.id`;
            const httpsUrl = `https://${fullDomain}`;
            const isRunning = app.status === "RUNNING";

            return (
              <div
                key={app.id}
                className={cn(
                  "p-5 rounded-2xl border transition-all flex flex-col justify-between gap-5 relative overflow-hidden",
                  isDark
                    ? "bg-[#101014] border-white/[0.08] hover:border-white/[0.16] shadow-sm"
                    : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                )}
              >
                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 p-1.5 bg-black/40 border border-white/10 shadow-sm relative overflow-hidden">
                        <Image
                          src={catalog?.icon || "/images/apps/docker.svg"}
                          alt={app.name}
                          width={40}
                          height={40}
                          className="object-contain w-full h-full"
                          unoptimized
                        />
                      </div>

                      <div className="min-w-0">
                        <h3 className={cn("text-base font-bold tracking-tight truncate", isDark ? "text-white" : "text-slate-900")}>
                          {app.name}
                        </h3>
                        <p className={cn("text-xs text-[var(--text-muted)] font-medium truncate")}>
                          {app.templateName}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border shrink-0",
                      isRunning
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", isRunning ? "bg-emerald-400 animate-pulse" : "bg-amber-400")} />
                      {app.status}
                    </span>
                  </div>

                  {/* Resource Badges */}
                  <div className="flex items-center gap-2 flex-wrap text-xs text-[var(--text-muted)] font-medium">
                    <span className={cn("px-2 py-0.5 rounded-lg border", isDark ? "bg-white/[0.03] border-white/5" : "bg-slate-100 border-slate-200")}>
                      {app.cpuShares} vCPU
                    </span>
                    <span className={cn("px-2 py-0.5 rounded-lg border", isDark ? "bg-white/[0.03] border-white/5" : "bg-slate-100 border-slate-200")}>
                      {app.memoryMb} MB RAM
                    </span>
                    <span className={cn("px-2 py-0.5 rounded-lg border", isDark ? "bg-white/[0.03] border-white/5" : "bg-slate-100 border-slate-200")}>
                      {app.storageGb || 10} GB SSD
                    </span>
                    <span className={cn("font-bold ml-auto", isDark ? "text-cyan-400" : "text-cyan-700")}>
                      {formatRupiah(app.monthlyPrice)}/mo
                    </span>
                  </div>

                  {/* HTTPS Domain Access Box */}
                  <div className={cn(
                    "p-3 rounded-xl border flex items-center justify-between gap-2 text-xs",
                    isDark ? "bg-[#09090b] border-white/10" : "bg-slate-50 border-slate-200"
                  )}>
                    <div className="flex items-center gap-2 min-w-0 font-mono text-[11px] truncate">
                      <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">{fullDomain}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => copyToClipboard(httpsUrl, `url-${app.id}`)}
                        className={cn("p-1.5 rounded-lg hover:bg-white/10 transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}
                        title="Copy HTTPS URL"
                      >
                        {copiedField === `url-${app.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <a
                        href={httpsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                        title="Open App in Browser"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className={cn("pt-4 border-t flex items-center justify-between gap-3", isDark ? "border-white/5" : "border-slate-100")}>
                  {/* Scale Compute Button */}
                  <button
                    type="button"
                    onClick={() => setScalingApp(app)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer",
                      isDark
                        ? "border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                        : "border-blue-200 text-blue-700 hover:bg-blue-50"
                    )}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Scale</span>
                  </button>

                  <Link
                    href={`/dashboard/apps/${app.id}`}
                    className={cn(
                      "px-4 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer",
                      isDark
                        ? "bg-white/[0.04] hover:bg-white/[0.08] text-white border-white/10"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
                    )}
                  >
                    <span>Manage</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Zero Data Loss Scaling Modal */}
      {scalingApp && (
        <AppScaleModal
          isOpen={!!scalingApp}
          onClose={() => setScalingApp(null)}
          app={scalingApp}
          onSuccess={fetchApps}
          isDark={isDark}
        />
      )}
    </div>
  );
}
