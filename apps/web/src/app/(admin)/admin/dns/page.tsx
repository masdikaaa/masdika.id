"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import {
  Globe,
  RefreshCw,
  Search,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Server,
  Settings,
  X,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/ui/Pagination";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useUrlNumber, useUrlString } from "@/lib/useUrlTab";

interface AdminDnsZone {
  id: number;
  zoneId: string;
  domain: string;
  status: string;
  nameservers: string[];
  recordCount: number;
  dnssecEnabled: boolean;
  createdAt: string;
  user: {
    id: number;
    name: string;
    email: string;
  } | null;
}

interface AdminDnsInfo {
  enabled: boolean;
  configured: boolean;
  nameservers: string[];
  resolver: string;
  publicIp: string;
}

const ITEMS_PER_PAGE = 10;

export default function AdminDnsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [zones, setZones] = useState<AdminDnsZone[]>([]);
  const [dnsInfo, setDnsInfo] = useState<AdminDnsInfo>({
    enabled: true,
    configured: true,
    nameservers: [],
    resolver: "",
    publicIp: "",
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useUrlString<string>("q", "");
  const [page, setPage] = useUrlNumber("page", 1);

  const [deletingZone, setDeletingZone] = useState<AdminDnsZone | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [inspectingZone, setInspectingZone] = useState<AdminDnsZone | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectRecords, setInspectRecords] = useState<any[]>([]);
  const [inspectDnssec, setInspectDnssec] = useState<any>(null);
  const [dnsStats, setDnsStats] = useState<any>(null);

  const fetchZones = async () => {
    setLoading(true);
    try {
      const [res, statsRes] = await Promise.all([
        fetch("/api/admin/dns", { cache: "no-store" }),
        fetch("/api/admin/dns/stats", { cache: "no-store" }).catch(() => null),
      ]);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to load DNS zones");
        return;
      }
      setZones(data.zones || []);
      if (data.dnsInfo) setDnsInfo(data.dnsInfo);
      if (statsRes && statsRes.ok) {
        const statsJson = await statsRes.json();
        if (statsJson.available) setDnsStats(statsJson);
      }
    } catch {
      toast.error("An error occurred while loading DNS zones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  const handleInspect = async (zone: AdminDnsZone) => {
    setInspectingZone(zone);
    setInspectLoading(true);
    setInspectRecords([]);
    setInspectDnssec(null);
    try {
      const res = await fetch(`/api/admin/dns/${zone.id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to load zone records");
        return;
      }
      setInspectRecords(data.records || []);
      setInspectDnssec(data.dnssec || null);
      if (data.zone) {
        setZones((prev) =>
          prev.map((z) =>
            z.id === zone.id
              ? { ...z, status: data.zone.status, recordCount: (data.records || []).length }
              : z
          )
        );
      }
    } catch {
      toast.error("An error occurred while inspecting zone");
    } finally {
      setInspectLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingZone) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/dns/${deletingZone.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete DNS zone");
        return;
      }
      toast.success(`Zone ${deletingZone.domain} deleted`);
      setZones((prev) => prev.filter((z) => z.id !== deletingZone.id));
      setDeletingZone(null);
    } catch {
      toast.error("An error occurred while deleting zone");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredZones = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return zones;
    return zones.filter(
      (z) =>
        z.domain.toLowerCase().includes(q) ||
        z.user?.name?.toLowerCase().includes(q) ||
        z.user?.email?.toLowerCase().includes(q)
    );
  }, [zones, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredZones.length / ITEMS_PER_PAGE));
  const paginatedZones = filteredZones.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const activeCount = zones.filter((z) => z.status === "active").length;
  const dnssecCount = zones.filter((z) => z.dnssecEnabled).length;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1
              className={cn(
                "text-2xl font-bold tracking-tight",
                isDark ? "text-white" : "text-slate-900"
              )}
            >
              DNS Management
            </h1>
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border",
                isDark
                  ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                  : "bg-cyan-50 border-cyan-200 text-cyan-700"
              )}
            >
              <Globe className="w-3 h-3" /> PowerDNS
            </span>
          </div>
          <p
            className={cn(
              "text-sm mt-1",
              isDark ? "text-zinc-400" : "text-slate-600"
            )}
          >
            Monitor and manage all customer authoritative DNS zones, delegation status, and DNSSEC state.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/admin/settings?tab=powerdns"
            className={cn(
              "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors",
              isDark
                ? "bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.08] text-zinc-200"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
            )}
          >
            <Settings className="w-3.5 h-3.5 text-cyan-400" />
            PowerDNS Settings
          </Link>
          <button
            onClick={fetchZones}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-400 hover:bg-cyan-300 text-zinc-950 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className={cn(
            "rounded-2xl border p-5",
            isDark
              ? "bg-[#111115] border-white/[0.08]"
              : "bg-white border-slate-200 shadow-sm"
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <span
              className={cn(
                "text-xs font-medium uppercase tracking-wider",
                isDark ? "text-zinc-400" : "text-slate-500"
              )}
            >
              Total Customer Zones
            </span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "text-2xl font-bold",
                isDark ? "text-white" : "text-slate-900"
              )}
            >
              {zones.length}
            </span>
            <span className="text-xs text-emerald-400 font-medium">
              {activeCount} active
            </span>
          </div>
          <p className={cn("text-xs mt-2", isDark ? "text-zinc-500" : "text-slate-500")}>
            {dnssecCount} zone{dnssecCount === 1 ? "" : "s"} with DNSSEC enabled
          </p>
        </div>

        <div
          className={cn(
            "rounded-2xl border p-5",
            isDark
              ? "bg-[#111115] border-white/[0.08]"
              : "bg-white border-slate-200 shadow-sm"
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <span
              className={cn(
                "text-xs font-medium uppercase tracking-wider",
                isDark ? "text-zinc-400" : "text-slate-500"
              )}
            >
              Nameservers
            </span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-sm font-bold text-cyan-400 truncate">
            {dnsInfo.nameservers.length > 0
              ? dnsInfo.nameservers.join(", ")
              : "Not configured"}
          </div>
          <p className={cn("text-xs mt-2", isDark ? "text-zinc-500" : "text-slate-500")}>
            Resolver IP: <span className="font-mono">{dnsInfo.publicIp || "—"}</span>
          </p>
        </div>

        <div
          className={cn(
            "rounded-2xl border p-5",
            isDark
              ? "bg-[#111115] border-white/[0.08]"
              : "bg-white border-slate-200 shadow-sm"
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <span
              className={cn(
                "text-xs font-medium uppercase tracking-wider",
                isDark ? "text-zinc-400" : "text-slate-500"
              )}
            >
              Service Status
            </span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold">
            {dnsInfo.configured && dnsInfo.enabled ? (
              <span className="text-emerald-400">Online &amp; Active</span>
            ) : (
              <span className="text-amber-400">
                {!dnsInfo.configured ? "Not Configured" : "Disabled"}
              </span>
            )}
          </div>
          <p className={cn("text-xs mt-2", isDark ? "text-zinc-500" : "text-slate-500")}>
            Resolver: <span className="font-mono">{dnsInfo.resolver || "—"}</span>
          </p>
        </div>
      </div>

      {/* DNS Traffic & Latency Graphs */}
      {dnsStats?.available && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div
            className={cn(
              "rounded-2xl border p-5 space-y-4",
              isDark
                ? "bg-[#111115] border-white/[0.08]"
                : "bg-white border-slate-200 shadow-sm"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3
                  className={cn(
                    "text-sm font-bold",
                    isDark ? "text-white" : "text-slate-900"
                  )}
                >
                  DNS Query Distribution
                </h3>
                <p className="text-xs text-zinc-500">
                  Total Queries: <span className="font-mono font-semibold text-cyan-400">{dnsStats.queries.toLocaleString()}</span>
                </p>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Uptime: {Math.floor((dnsStats.uptimeSec || 0) / 60)}m
              </span>
            </div>

            <div className="space-y-3">
              {[
                { label: "Recursive (Resolver / SafeDNS)", value: dnsStats.rdQueries, color: "bg-cyan-400" },
                { label: "Authoritative (Domain Pointing)", value: dnsStats.authQueries, color: "bg-emerald-400" },
                { label: "Blocked / NXDOMAIN", value: dnsStats.nxdomainAnswers, color: "bg-amber-400" },
                { label: "Rate-Limited / Dropped", value: dnsStats.blockedOrDropped, color: "bg-red-400" },
              ].map((item) => {
                const max = Math.max(1, dnsStats.queries);
                const pct = Math.min(100, Math.round((item.value / max) * 100));
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={isDark ? "text-zinc-300" : "text-slate-700"}>{item.label}</span>
                      <span className="font-mono font-semibold">
                        {item.value.toLocaleString()} ({pct}%)
                      </span>
                    </div>
                    <div className={cn("h-2 rounded-full overflow-hidden", isDark ? "bg-white/[0.06]" : "bg-slate-100")}>
                      <div className={cn("h-full rounded-full transition-all", item.color)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            className={cn(
              "rounded-2xl border p-5 space-y-4",
              isDark
                ? "bg-[#111115] border-white/[0.08]"
                : "bg-white border-slate-200 shadow-sm"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3
                  className={cn(
                    "text-sm font-bold",
                    isDark ? "text-white" : "text-slate-900"
                  )}
                >
                  Response Latency Histogram
                </h3>
                <p className="text-xs text-zinc-500">
                  Avg Latency:{" "}
                  <span className="font-mono font-semibold text-cyan-400">
                    {((dnsStats.latencyAvgUs || 0) / 1000).toFixed(2)} ms
                  </span>
                </p>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                NOERROR: {(dnsStats.noerrorAnswers || 0).toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-3 items-end h-36 pt-4">
              {(() => {
                const maxBucket = Math.max(
                  1,
                  ...(dnsStats.latencyBuckets || []).map((b: any) => b.count)
                );
                return (dnsStats.latencyBuckets || []).map((b: any) => {
                  const hPct = Math.max(6, Math.round((b.count / maxBucket) * 100));
                  return (
                    <div key={b.label} className="flex flex-col items-center gap-1.5 h-full justify-end">
                      <span className="text-[10px] font-mono text-zinc-400">
                        {b.count}
                      </span>
                      <div className={cn("w-full rounded-t-lg overflow-hidden flex items-end h-24", isDark ? "bg-white/[0.04]" : "bg-slate-100")}>
                        <div
                          className="w-full bg-gradient-to-t from-cyan-500 to-cyan-300 rounded-t-lg transition-all"
                          style={{ height: `${hPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 whitespace-nowrap">
                        {b.label}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Zones Table Card */}
      <div
        className={cn(
          "rounded-2xl border overflow-hidden",
          isDark
            ? "bg-[#111115] border-white/[0.08]"
            : "bg-white border-slate-200 shadow-sm"
        )}
      >
        <div className="p-4 sm:p-5 space-y-4">
          <div className="relative max-w-sm">
            <Search
              className={cn(
                "w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2",
                isDark ? "text-zinc-500" : "text-slate-400"
              )}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search domain or customer..."
              className={cn(
                "w-full pl-10 pr-3.5 py-2 rounded-xl border text-sm focus:outline-none focus:border-cyan-500",
                isDark
                  ? "bg-zinc-900/70 border-white/[0.08] text-white placeholder:text-zinc-500"
                  : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
              )}
            />
          </div>

          {loading ? (
            <div className="py-16 flex items-center justify-center">
              <RefreshCw className="w-7 h-7 text-cyan-400 animate-spin" />
            </div>
          ) : paginatedZones.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-500">
              No DNS zones found.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left border-collapse">
                  <thead>
                    <tr
                      className={cn(
                        "border-b text-[11px] font-semibold uppercase tracking-wider",
                        isDark
                          ? "border-white/[0.08] text-zinc-400"
                          : "border-slate-200 text-slate-500"
                      )}
                    >
                      <th className="py-3 px-3">Domain</th>
                      <th className="py-3 px-3">Customer</th>
                      <th className="py-3 px-3">Delegation</th>
                      <th className="py-3 px-3">Records</th>
                      <th className="py-3 px-3">DNSSEC</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody
                    className={cn(
                      "divide-y text-sm",
                      isDark ? "divide-white/[0.06]" : "divide-slate-100"
                    )}
                  >
                    {paginatedZones.map((zone) => (
                      <tr
                        key={zone.id}
                        className={cn(
                          "transition-colors",
                          isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50"
                        )}
                      >
                        <td className="py-3.5 px-3 font-mono font-semibold text-cyan-400">
                          {zone.domain}
                        </td>
                        <td className="py-3.5 px-3">
                          {zone.user ? (
                            <Link
                              href={`/admin/customers/${zone.user.id}`}
                              className="group inline-flex flex-col"
                            >
                              <span
                                className={cn(
                                  "text-xs font-semibold group-hover:text-cyan-400 transition-colors flex items-center gap-1",
                                  isDark ? "text-white" : "text-slate-900"
                                )}
                              >
                                <User className="w-3 h-3 text-zinc-500" />
                                {zone.user.name}
                              </span>
                              <span className="text-[11px] text-zinc-500">
                                {zone.user.email}
                              </span>
                            </Link>
                          ) : (
                            <span className="text-xs text-zinc-500">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {zone.status === "active" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <Clock className="w-3 h-3" /> Pending NS
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-xs">
                          {zone.recordCount}
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {zone.dnssecEnabled ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                              Enabled
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-500">Off</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleInspect(zone)}
                              className={cn(
                                "p-1.5 rounded-lg border transition-colors",
                                isDark
                                  ? "bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.08] text-zinc-300"
                                  : "bg-white hover:bg-slate-100 border-slate-200 text-slate-600"
                              )}
                              title="Inspect records"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingZone(zone)}
                              className={cn(
                                "p-1.5 rounded-lg border transition-colors",
                                isDark
                                  ? "bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400"
                                  : "bg-red-50 hover:bg-red-100 border-red-200 text-red-600"
                              )}
                              title="Delete zone"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Inspect Zone Records Modal */}
      {inspectingZone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className={cn(
              "w-full max-w-2xl rounded-2xl border p-6 shadow-2xl max-h-[85vh] overflow-y-auto",
              isDark
                ? "bg-[#111115] border-white/[0.1]"
                : "bg-white border-slate-200"
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3
                  className={cn(
                    "text-lg font-bold",
                    isDark ? "text-white" : "text-slate-900"
                  )}
                >
                  DNS Records: {inspectingZone.domain}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Owner: {inspectingZone.user?.name || "Unknown"} ({inspectingZone.user?.email || "—"})
                </p>
              </div>
              <button
                onClick={() => setInspectingZone(null)}
                className={cn(
                  "p-1.5 rounded-lg",
                  isDark
                    ? "hover:bg-white/10 text-zinc-400"
                    : "hover:bg-slate-100 text-slate-500"
                )}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {inspectLoading ? (
              <div className="py-12 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {inspectDnssec?.enabled && inspectDnssec?.dsRecords?.length > 0 && (
                  <div
                    className={cn(
                      "rounded-xl border p-3 text-xs",
                      isDark
                        ? "bg-cyan-500/5 border-cyan-500/20 text-cyan-300"
                        : "bg-cyan-50 border-cyan-200 text-cyan-800"
                    )}
                  >
                    <span className="font-semibold">DNSSEC Active:</span>{" "}
                    <span className="font-mono break-all">
                      {inspectDnssec.dsRecords[0].raw}
                    </span>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/[0.08] text-zinc-400 uppercase">
                        <th className="py-2 px-2">Type</th>
                        <th className="py-2 px-2">Name</th>
                        <th className="py-2 px-2">Value</th>
                        <th className="py-2 px-2">TTL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {inspectRecords.map((rec) => (
                        <tr key={`${rec.fqdn}-${rec.type}`}>
                          <td className="py-2.5 px-2 font-mono font-bold text-cyan-400">
                            {rec.type}
                          </td>
                          <td className="py-2.5 px-2 font-mono">
                            {rec.name === "@" ? inspectZone.domain : rec.name}
                          </td>
                          <td className="py-2.5 px-2 font-mono break-words">
                            {rec.records.map((r: any, i: number) => (
                              <div key={i}>{r.content}</div>
                            ))}
                          </td>
                          <td className="py-2.5 px-2 text-zinc-400">{rec.ttl}s</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={Boolean(deletingZone)}
        onClose={() => setDeletingZone(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Customer DNS Zone"
        description={`Are you sure you want to delete ${deletingZone?.domain} (owned by ${deletingZone?.user?.name || "customer"}) from PowerDNS? This action cannot be undone.`}
        confirmText="Delete Zone"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
