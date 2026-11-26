"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import {
  Globe,
  Plus,
  RefreshCw,
  Trash2,
  Pencil,
  Copy,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Server,
  Search,
  X,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/Select";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Pagination } from "@/components/ui/Pagination";
import { useUrlNumber } from "@/lib/useUrlTab";

interface DnsZoneItem {
  id: number;
  zoneId: string;
  domain: string;
  nameservers: string[];
  status: string;
  recordCount: number;
  detectedNs: string[];
  createdAt: string;
}

interface DnsRecordEntry {
  content: string;
  disabled?: boolean;
}

interface DnsRecordItem {
  fqdn: string;
  name: string;
  type: string;
  ttl: number;
  records: DnsRecordEntry[];
}

interface DnsPublicInfo {
  enabled?: boolean;
  configured?: boolean;
  nameservers: string[];
  resolver: string;
  publicIp: string;
}

interface ParsedDsRecord {
  keyTag: string;
  algorithm: string;
  digestType: string;
  digest: string;
  raw: string;
}

interface DnssecInfo {
  enabled: boolean;
  algorithm?: string;
  keyType?: string;
  dnskey?: string;
  dsRecords: ParsedDsRecord[];
}

const RECORD_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV", "CAA"] as const;

const TTL_OPTIONS = [
  { value: "60", label: "1 min (60s)" },
  { value: "300", label: "5 min (300s)" },
  { value: "600", label: "10 min (600s)" },
  { value: "3600", label: "1 hour (3600s)" },
  { value: "86400", label: "1 day (86400s)" },
];

const TYPE_BADGE_STYLES: Record<string, string> = {
  A: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  AAAA: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  CNAME: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  MX: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  TXT: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  NS: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  SRV: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  CAA: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

const RECORDS_PER_PAGE = 10;

export default function DnsDashboardPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [zones, setZones] = useState<DnsZoneItem[]>([]);
  const [maxZones, setMaxZones] = useState(20);
  const [dnsInfo, setDnsInfo] = useState<DnsPublicInfo>({
    enabled: true,
    configured: true,
    nameservers: [],
    resolver: "",
    publicIp: "",
  });
  const [loadingZones, setLoadingZones] = useState(true);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);

  const [records, setRecords] = useState<DnsRecordItem[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordSearch, setRecordSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [recordPage, setRecordPage] = useUrlNumber("recordPage", 1);

  // Add Domain modal
  const [showAddDomainModal, setShowAddDomainModal] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [isCreatingDomain, setIsCreatingDomain] = useState(false);

  // Delete Domain modal
  const [deletingZone, setDeletingZone] = useState<DnsZoneItem | null>(null);
  const [isDeletingZone, setIsDeletingZone] = useState(false);

  // Add / Edit Record modal
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DnsRecordItem | null>(null);
  const [recType, setRecType] = useState<string>("A");
  const [recName, setRecName] = useState("@");
  const [recContent, setRecContent] = useState("");
  const [recPriority, setRecPriority] = useState("10");
  const [recTtl, setRecTtl] = useState("300");
  const [isSavingRecord, setIsSavingRecord] = useState(false);

  // Delete Record modal
  const [deletingRecord, setDeletingRecord] = useState<DnsRecordItem | null>(null);
  const [isDeletingRecord, setIsDeletingRecord] = useState(false);

  // DNSSEC & DS Records modal
  const [dnssec, setDnssec] = useState<DnssecInfo>({ enabled: false, dsRecords: [] });
  const [showDnssecModal, setShowDnssecModal] = useState(false);
  const [isTogglingDnssec, setIsTogglingDnssec] = useState(false);

  const selectedZone = useMemo(
    () => zones.find((z) => z.id === selectedZoneId) || null,
    [zones, selectedZoneId]
  );

  const copyText = (text: string, label = "Copied to clipboard") => {
    navigator.clipboard.writeText(text);
    toast.success(label);
  };

  const fetchZones = async (preserveSelection = true) => {
    setLoadingZones(true);
    try {
      const res = await fetch("/api/user/dns", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to load DNS zones");
        return;
      }
      const list: DnsZoneItem[] = data.zones || [];
      setZones(list);
      if (data.maxZones) setMaxZones(data.maxZones);
      if (data.dnsInfo) setDnsInfo(data.dnsInfo);

      if (list.length === 0) {
        setSelectedZoneId(null);
      } else if (!preserveSelection || !list.some((z) => z.id === selectedZoneId)) {
        setSelectedZoneId(list[0].id);
      }
    } catch {
      toast.error("An error occurred while loading DNS zones");
    } finally {
      setLoadingZones(false);
    }
  };

  const fetchRecords = async (zoneId: number) => {
    setLoadingRecords(true);
    try {
      const res = await fetch(`/api/user/dns/${zoneId}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to load DNS records");
        setRecords([]);
        return;
      }
      setRecords(data.records || []);
      setDnssec(data.dnssec || { enabled: false, dsRecords: [] });
      if (data.zone) {
        setZones((prev) =>
          prev.map((z) =>
            z.id === zoneId
              ? {
                ...z,
                status: data.zone.status,
                detectedNs: data.zone.detectedNs || [],
                recordCount: (data.records || []).length,
              }
              : z
          )
        );
      }
    } catch {
      toast.error("An error occurred while loading DNS records");
      setRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    fetchZones(false);
  }, []);

  useEffect(() => {
    if (selectedZoneId) {
      fetchRecords(selectedZoneId);
      setRecordPage(1);
    } else {
      setRecords([]);
      setDnssec({ enabled: false, dsRecords: [] });
    }
  }, [selectedZoneId]);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;
    setIsCreatingDomain(true);
    try {
      const res = await fetch("/api/user/dns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to add domain");
        return;
      }
      toast.success(`Domain ${data.zone.domain} added to Masdika DNS`);
      setNewDomain("");
      setShowAddDomainModal(false);
      setZones((prev) => [data.zone, ...prev]);
      setSelectedZoneId(data.zone.id);
    } catch {
      toast.error("An error occurred while adding domain");
    } finally {
      setIsCreatingDomain(false);
    }
  };

  const handleDeleteDomain = async () => {
    if (!deletingZone) return;
    setIsDeletingZone(true);
    try {
      const res = await fetch(`/api/user/dns/${deletingZone.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete domain");
        return;
      }
      toast.success(`Domain ${deletingZone.domain} deleted`);
      const remaining = zones.filter((z) => z.id !== deletingZone.id);
      setZones(remaining);
      if (selectedZoneId === deletingZone.id) {
        setSelectedZoneId(remaining[0]?.id ?? null);
      }
      setDeletingZone(null);
    } catch {
      toast.error("An error occurred while deleting domain");
    } finally {
      setIsDeletingZone(false);
    }
  };

  const openAddRecordModal = () => {
    if (!selectedZone) {
      toast.error("Please add or select a domain first");
      return;
    }
    setEditingRecord(null);
    setRecType("A");
    setRecName("@");
    setRecContent("");
    setRecPriority("10");
    setRecTtl("300");
    setShowRecordModal(true);
  };

  const openEditRecordModal = (rec: DnsRecordItem) => {
    setEditingRecord(rec);
    setRecType(rec.type);
    setRecName(rec.name);
    setRecTtl(String(rec.ttl || 300));

    const firstVal = rec.records[0]?.content || "";
    if (rec.type === "MX") {
      const parts = firstVal.split(/\s+/);
      if (parts.length >= 2 && /^\d+$/.test(parts[0])) {
        setRecPriority(parts[0]);
        setRecContent(parts.slice(1).join(" ").replace(/\.+$/, ""));
      } else {
        setRecPriority("10");
        setRecContent(firstVal.replace(/\.+$/, ""));
      }
    } else if (rec.type === "TXT") {
      setRecContent(
        rec.records.map((r) => r.content.replace(/^"|"$/g, "")).join("\n")
      );
    } else if (rec.type === "CNAME" || rec.type === "NS") {
      setRecContent(
        rec.records.map((r) => r.content.replace(/\.+$/, "")).join("\n")
      );
    } else {
      setRecContent(rec.records.map((r) => r.content).join("\n"));
    }

    setShowRecordModal(true);
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedZone) return;

    setIsSavingRecord(true);
    try {
      const lines = recContent
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length === 0) {
        toast.error("Record value is required");
        setIsSavingRecord(false);
        return;
      }

      const payloadRecords = lines.map((line) => ({
        content: line,
        priority: recType === "MX" ? Number(recPriority || 10) : undefined,
      }));

      const res = await fetch(`/api/user/dns/${selectedZone.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert",
          type: recType,
          name: recName.trim() || "@",
          ttl: Number(recTtl || 300),
          records: payloadRecords,
          previousName: editingRecord?.name,
          previousType: editingRecord?.type,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save DNS record");
        return;
      }

      toast.success(
        `DNS ${recType} record ${editingRecord ? "updated" : "created"} successfully`
      );
      setShowRecordModal(false);
      fetchRecords(selectedZone.id);
    } catch {
      toast.error("An error occurred while saving DNS record");
    } finally {
      setIsSavingRecord(false);
    }
  };

  const handleToggleDnssec = async (enabled: boolean) => {
    if (!selectedZone) return;
    setIsTogglingDnssec(true);
    try {
      const res = await fetch(`/api/user/dns/${selectedZone.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_dnssec", enabled }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update DNSSEC");
        return;
      }
      setDnssec(data.dnssec || { enabled, dsRecords: [] });
      toast.success(enabled ? "DNSSEC enabled for zone" : "DNSSEC disabled for zone");
    } catch {
      toast.error("An error occurred while updating DNSSEC");
    } finally {
      setIsTogglingDnssec(false);
    }
  };

  const handleDeleteRecord = async () => {
    if (!selectedZone || !deletingRecord) return;
    setIsDeletingRecord(true);
    try {
      const res = await fetch(`/api/user/dns/${selectedZone.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          type: deletingRecord.type,
          name: deletingRecord.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete DNS record");
        return;
      }
      toast.success(`Deleted ${deletingRecord.type} record for ${deletingRecord.name}`);
      setDeletingRecord(null);
      fetchRecords(selectedZone.id);
    } catch {
      toast.error("An error occurred while deleting DNS record");
    } finally {
      setIsDeletingRecord(false);
    }
  };

  const filteredRecords = useMemo(() => {
    const q = recordSearch.trim().toLowerCase();
    return records.filter((rec) => {
      if (typeFilter !== "ALL" && rec.type !== typeFilter) return false;
      if (!q) return true;
      const values = rec.records.map((r) => r.content.toLowerCase()).join(" ");
      const displayName =
        rec.name === "@" && selectedZone ? selectedZone.domain.toLowerCase() : rec.name.toLowerCase();
      return (
        rec.name.toLowerCase().includes(q) ||
        displayName.includes(q) ||
        rec.type.toLowerCase().includes(q) ||
        values.includes(q)
      );
    });
  }, [records, recordSearch, typeFilter, selectedZone]);

  const totalRecordPages = Math.max(
    1,
    Math.ceil(filteredRecords.length / RECORDS_PER_PAGE)
  );
  const paginatedRecords = filteredRecords.slice(
    (recordPage - 1) * RECORDS_PER_PAGE,
    recordPage * RECORDS_PER_PAGE
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
  };

  const activeZonesCount = zones.filter((z) => z.status === "active").length;

  const getPlaceholderForType = (type: string) => {
    switch (type) {
      case "A":
        return "e.g. 103.247.10.61";
      case "AAAA":
        return "e.g. 2001:db8::1";
      case "CNAME":
        return "e.g. target.example.com";
      case "MX":
        return "e.g. mail.example.com";
      case "TXT":
        return "e.g. v=spf1 include:_spf.masdika.id ~all";
      case "NS":
        return "e.g. ns1.masdika.id";
      case "SRV":
        return "e.g. 10 5 5060 sip.example.com";
      case "CAA":
        return 'e.g. 0 issue "letsencrypt.org"';
      default:
        return "Enter record value";
    }
  };

  return (
    <motion.div
      className="space-y-6 pb-10"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1
              className={cn(
                "text-2xl font-bold tracking-tight",
                isDark ? "text-white" : "text-slate-900"
              )}
            >
              DNS Pointing
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
            Point your custom domains to Masdika Cloud and manage A, AAAA, CNAME, MX, and TXT records in real time.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => fetchZones(true)}
            disabled={loadingZones}
            className={cn(
              "inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium border transition-colors",
              isDark
                ? "bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08] text-zinc-300"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
            )}
          >
            <RefreshCw className={cn("w-4 h-4", loadingZones && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => setShowAddDomainModal(true)}
            disabled={dnsInfo.configured === false || dnsInfo.enabled === false}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-cyan-500/20 bg-cyan-400 hover:bg-cyan-300 text-zinc-950 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" /> Add Domain
          </button>
        </div>
      </motion.div>

      {(dnsInfo.configured === false || dnsInfo.enabled === false) && (
        <motion.div
          variants={itemVariants}
          className={cn(
            "rounded-2xl border p-4 flex items-start gap-3",
            isDark
              ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
              : "bg-amber-50 border-amber-200 text-amber-800"
          )}
        >
          <Info className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <p className="font-semibold">
              {dnsInfo.enabled === false
                ? "DNS Pointing Service Disabled"
                : "PowerDNS Server Not Configured"}
            </p>
            <p className="opacity-90 mt-0.5">
              {dnsInfo.enabled === false
                ? "DNS Pointing is currently disabled by the administrator."
                : "PowerDNS API credentials and nameservers have not been configured in Admin Settings yet."}
            </p>
          </div>
        </motion.div>
      )}

      {/* 3 Summary Stat Cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div
          className={cn(
            "rounded-2xl border p-5 transition-colors",
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
              Managed Domains
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
            <span
              className={cn(
                "text-xs",
                isDark ? "text-zinc-500" : "text-slate-500"
              )}
            >
              / {maxZones} zones ({activeZonesCount} active)
            </span>
          </div>
          <p
            className={cn(
              "text-xs mt-2.5",
              isDark ? "text-zinc-500" : "text-slate-500"
            )}
          >
            Free authoritative DNS hosting included with your account.
          </p>
        </div>

        <div
          className={cn(
            "rounded-2xl border p-5 transition-colors",
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
              Authoritative Nameserver
            </span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1.5">
            {dnsInfo.nameservers.length > 0 ? (
              dnsInfo.nameservers.map((ns) => (
                <div key={ns} className="flex items-center justify-between gap-2">
                  <code
                    className={cn(
                      "text-sm sm:text-base font-mono font-bold truncate",
                      isDark ? "text-cyan-400" : "text-cyan-700"
                    )}
                  >
                    {ns}
                  </code>
                  <button
                    onClick={() => copyText(ns, `${ns} copied`)}
                    className={cn(
                      "p-1 rounded-lg transition-colors shrink-0",
                      isDark
                        ? "hover:bg-white/10 text-zinc-400 hover:text-white"
                        : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"
                    )}
                    title={`Copy ${ns}`}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <code
                className={cn(
                  "text-base sm:text-lg font-mono font-bold truncate",
                  isDark ? "text-cyan-400" : "text-cyan-700"
                )}
              >
                Not configured
              </code>
            )}
          </div>
          <p
            className={cn(
              "text-xs mt-2.5",
              isDark ? "text-zinc-500" : "text-slate-500"
            )}
          >
            Set these nameservers at your domain registrar to activate DNS.
          </p>
        </div>

        <div
          className={cn(
            "rounded-2xl border p-5 transition-colors",
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
              Public DNS Resolver
            </span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className={cn("text-[10px] font-semibold uppercase tracking-wider block", isDark ? "text-zinc-500" : "text-slate-500")}>
                  Standard DNS (Port 53)
                </span>
                <code
                  className={cn(
                    "text-base sm:text-lg font-mono font-bold truncate block",
                    isDark ? "text-white" : "text-slate-900"
                  )}
                >
                  {dnsInfo.publicIp || "Not configured"}
                </code>
              </div>
              {dnsInfo.publicIp && (
                <button
                  onClick={() => copyText(dnsInfo.publicIp, "Resolver IP copied")}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors shrink-0",
                    isDark
                      ? "hover:bg-white/10 text-zinc-400 hover:text-white"
                      : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"
                  )}
                  title="Copy Standard DNS IP"
                >
                  <Copy className="w-4 h-4" />
                </button>
              )}
            </div>

            {dnsInfo.resolver && (
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
                <div className="min-w-0">
                  <span className={cn("text-[10px] font-semibold uppercase tracking-wider block", isDark ? "text-zinc-500" : "text-slate-500")}>
                    DNS-over-HTTPS (DoH)
                  </span>
                  <code className={cn("text-xs font-mono truncate block", isDark ? "text-cyan-400" : "text-cyan-700")}>
                    https://{dnsInfo.resolver}/dns-query
                  </code>
                </div>
                <button
                  onClick={() =>
                    copyText(`https://${dnsInfo.resolver}/dns-query`, "DoH URL copied")
                  }
                  className={cn(
                    "p-1.5 rounded-lg transition-colors shrink-0",
                    isDark
                      ? "hover:bg-white/10 text-zinc-400 hover:text-white"
                      : "hover:bg-slate-100 text-slate-500 hover:text-slate-900"
                  )}
                  title="Copy DNS-over-HTTPS URL"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <p
              className={cn(
                "text-[11px]",
                isDark ? "text-zinc-500" : "text-slate-500"
              )}
            >
              Use IP for Router/OS (port 53) or DoH URL for browsers. SafeDNS filtering enabled.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Main DNS Workspace Card */}
      <motion.div
        variants={itemVariants}
        className={cn(
          "rounded-2xl overflow-hidden border",
          isDark
            ? "bg-[#111115] border-white/[0.08]"
            : "bg-white border-slate-200 shadow-sm"
        )}
      >
        <div className="p-4 sm:p-6 space-y-5">
          {/* Domain Selector Bar */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="w-full lg:w-96">
              <label
                className={cn(
                  "block text-xs font-medium uppercase tracking-wider mb-2",
                  isDark ? "text-zinc-400" : "text-slate-500"
                )}
              >
                Active Domain Zone
              </label>
              {loadingZones ? (
                <div
                  className={cn(
                    "w-full border rounded-xl px-3.5 py-2.5 text-xs flex items-center gap-2",
                    isDark
                      ? "bg-zinc-900/80 border-white/[0.08] text-zinc-500"
                      : "bg-slate-50 border-slate-200 text-slate-500"
                  )}
                >
                  <RefreshCw className="w-4 h-4 animate-spin" /> Loading domains...
                </div>
              ) : (
                <Select
                  value={selectedZoneId?.toString() || ""}
                  onChange={(val) => setSelectedZoneId(parseInt(val, 10))}
                  options={zones.map((z) => ({
                    value: z.id.toString(),
                    label: `${z.domain} (${z.status === "active" ? "Active" : "Pending NS"})`,
                  }))}
                  placeholder={
                    zones.length === 0 ? "No domains added yet" : "Select a domain"
                  }
                  className={cn(
                    "w-full border rounded-xl px-3.5 py-2 focus:outline-none focus:border-cyan-500 transition-colors",
                    isDark
                      ? "bg-zinc-900/80 border-white/[0.08] text-white"
                      : "bg-slate-50 border-slate-200 text-slate-900"
                  )}
                />
              )}
            </div>

            {selectedZone && (
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2.5 w-full lg:w-auto">
                {selectedZone.status === "active" ? (
                  <span
                    className={cn(
                      "col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-semibold border",
                      isDark
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : "bg-emerald-50 border-emerald-200 text-emerald-700"
                    )}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Nameserver Active
                  </span>
                ) : (
                  <span
                    className={cn(
                      "col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-semibold border",
                      isDark
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                        : "bg-amber-50 border-amber-200 text-amber-700"
                    )}
                  >
                    <Clock className="w-3.5 h-3.5" /> Pending NS Delegation
                  </span>
                )}

                <button
                  onClick={() => fetchRecords(selectedZone.id)}
                  disabled={loadingRecords}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors",
                    isDark
                      ? "bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.08] text-zinc-300"
                      : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                  )}
                >
                  <RefreshCw
                    className={cn("w-3.5 h-3.5", loadingRecords && "animate-spin")}
                  />
                  Verify NS
                </button>

                <button
                  onClick={() => setShowDnssecModal(true)}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors",
                    dnssec.enabled
                      ? isDark
                        ? "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-400"
                        : "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700"
                      : isDark
                        ? "bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.08] text-zinc-300"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                  )}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {dnssec.enabled ? "DNSSEC / DS" : "DNSSEC"}
                </button>

                <button
                  onClick={() => setDeletingZone(selectedZone)}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors",
                    isDark
                      ? "bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400"
                      : "bg-red-50 hover:bg-red-100 border-red-200 text-red-600"
                  )}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Zone
                </button>

                <button
                  onClick={openAddRecordModal}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-400 hover:bg-cyan-300 text-zinc-950 transition-colors shadow-md shadow-cyan-500/15"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Record
                </button>
              </div>
            )}
          </div>

          {/* Pending NS Guidance Banner */}
          {selectedZone && selectedZone.status !== "active" && (
            <div
              className={cn(
                "rounded-xl border p-4 flex items-start gap-3",
                isDark
                  ? "bg-cyan-500/5 border-cyan-500/20 text-cyan-200"
                  : "bg-cyan-50/70 border-cyan-200 text-cyan-900"
              )}
            >
              <Info
                className={cn(
                  "w-5 h-5 shrink-0 mt-0.5",
                  isDark ? "text-cyan-400" : "text-cyan-600"
                )}
              />
              <div className="text-xs sm:text-sm space-y-1">
                <p className="font-semibold">
                  Point your domain nameserver to activate DNS resolution:
                </p>
                <p className={isDark ? "text-zinc-300" : "text-slate-700"}>
                  Update the Nameserver (NS) at your domain registrar for{" "}
                  <span className="font-mono font-semibold">{selectedZone.domain}</span> to{" "}
                  {dnsInfo.nameservers.length > 0 ? (
                    dnsInfo.nameservers.map((ns, idx) => (
                      <span key={ns}>
                        {idx > 0 && ", "}
                        <button
                          type="button"
                          onClick={() => copyText(ns, `${ns} copied`)}
                          className="font-mono font-bold text-cyan-400 hover:underline"
                        >
                          {ns}
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="font-mono font-bold text-cyan-400">
                      your assigned nameservers
                    </span>
                  )}
                  . Propagation usually completes within a few minutes up to 24 hours.
                </p>
              </div>
            </div>
          )}

          {/* Empty state or Records Table */}
          {!selectedZone && !loadingZones ? (
            <div
              className={cn(
                "py-14 px-4 text-center border-t",
                isDark ? "border-white/[0.08]" : "border-slate-200/90"
              )}
            >
              <div className="w-16 h-16 bg-cyan-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-cyan-500/20">
                <Globe className="w-8 h-8 text-cyan-400" />
              </div>
              <h3
                className={cn(
                  "text-lg font-bold mb-2",
                  isDark ? "text-white" : "text-slate-900"
                )}
              >
                No Domains Configured
              </h3>
              <p
                className={cn(
                  "text-xs sm:text-sm max-w-md mx-auto mb-5",
                  isDark ? "text-zinc-400" : "text-slate-500"
                )}
              >
                Add your domain name to start managing DNS records on Masdika&apos;s PowerDNS network ({dnsInfo.nameservers[0]}).
              </p>
              <button
                onClick={() => setShowAddDomainModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-cyan-400 hover:bg-cyan-300 text-zinc-950 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Your First Domain
              </button>
            </div>
          ) : selectedZone ? (
            <div
              className={cn(
                "border-t pt-5 space-y-4",
                isDark ? "border-white/[0.08]" : "border-slate-200/90"
              )}
            >
              {/* Search & Type Filter */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search
                    className={cn(
                      "w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2",
                      isDark ? "text-zinc-500" : "text-slate-400"
                    )}
                  />
                  <input
                    type="text"
                    value={recordSearch}
                    onChange={(e) => {
                      setRecordSearch(e.target.value);
                      setRecordPage(1);
                    }}
                    placeholder="Search host or record value..."
                    className={cn(
                      "w-full pl-10 pr-3.5 py-2 rounded-xl border text-sm focus:outline-none focus:border-cyan-500 transition-colors",
                      isDark
                        ? "bg-zinc-900/70 border-white/[0.08] text-white placeholder:text-zinc-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                    )}
                  />
                </div>

                <div className="w-full sm:w-44">
                  <Select
                    value={typeFilter}
                    onChange={(val) => {
                      setTypeFilter(val);
                      setRecordPage(1);
                    }}
                    options={[
                      { value: "ALL", label: "All Types" },
                      ...RECORD_TYPES.map((t) => ({ value: t, label: t })),
                    ]}
                    className={cn(
                      "w-full border rounded-xl px-3.5 py-2 text-sm",
                      isDark
                        ? "bg-zinc-900/70 border-white/[0.08] text-white"
                        : "bg-slate-50 border-slate-200 text-slate-900"
                    )}
                  />
                </div>
              </div>

              {loadingRecords ? (
                <div className="w-full flex items-center justify-center py-16">
                  <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="py-12 text-center">
                  <p
                    className={cn(
                      "text-sm",
                      isDark ? "text-zinc-400" : "text-slate-500"
                    )}
                  >
                    No DNS records match your filter.
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile Responsive Record Cards */}
                  <div className="md:hidden space-y-3">
                    {paginatedRecords.map((rec) => {
                      const isRootNs = rec.type === "NS" && rec.name === "@";
                      return (
                        <div
                          key={`mobile-${rec.fqdn}-${rec.type}`}
                          className={cn(
                            "rounded-xl border p-3.5 space-y-2.5",
                            isDark
                              ? "bg-white/[0.02] border-white/[0.08]"
                              : "bg-slate-50/70 border-slate-200"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border shrink-0",
                                  TYPE_BADGE_STYLES[rec.type] ||
                                    "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                                )}
                              >
                                {rec.type}
                              </span>
                              <span
                                className={cn(
                                  "font-mono text-xs font-semibold truncate",
                                  isDark ? "text-white" : "text-slate-900"
                                )}
                              >
                                {rec.name === "@" ? selectedZone.domain : rec.name}
                              </span>
                              <span
                                className={cn(
                                  "text-[11px] shrink-0",
                                  isDark ? "text-zinc-500" : "text-slate-500"
                                )}
                              >
                                &middot; {rec.ttl}s
                              </span>
                            </div>

                            <div className="inline-flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => openEditRecordModal(rec)}
                                className={cn(
                                  "p-1.5 rounded-lg border transition-colors",
                                  isDark
                                    ? "bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.08] text-zinc-300"
                                    : "bg-white hover:bg-slate-100 border-slate-200 text-slate-600"
                                )}
                                title="Edit record"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => !isRootNs && setDeletingRecord(rec)}
                                disabled={isRootNs}
                                className={cn(
                                  "p-1.5 rounded-lg border transition-colors disabled:opacity-35 disabled:cursor-not-allowed",
                                  isDark
                                    ? "bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400"
                                    : "bg-red-50 hover:bg-red-100 border-red-200 text-red-600"
                                )}
                                title={isRootNs ? "Root NS record cannot be deleted" : "Delete record"}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1.5 pt-1 border-t border-inherit">
                            {rec.records.map((entry, idx) => (
                              <div
                                key={idx}
                                className="flex items-start justify-between gap-2"
                              >
                                <code
                                  className={cn(
                                    "font-mono text-xs break-words min-w-0",
                                    isDark ? "text-zinc-300" : "text-slate-700"
                                  )}
                                >
                                  {entry.content}
                                </code>
                                <button
                                  onClick={() =>
                                    copyText(entry.content, "Record value copied")
                                  }
                                  className={cn(
                                    "p-1 rounded shrink-0",
                                    isDark
                                      ? "hover:bg-white/10 text-zinc-400"
                                      : "hover:bg-slate-200 text-slate-500"
                                  )}
                                  title="Copy value"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto w-full">
                    <table className="w-full min-w-[680px] text-left border-collapse">
                      <thead>
                        <tr
                          className={cn(
                            "border-b text-[11px] font-semibold uppercase tracking-wider",
                            isDark
                              ? "border-white/[0.08] text-zinc-400"
                              : "border-slate-200 text-slate-500"
                          )}
                        >
                          <th className="py-3 px-3">Type</th>
                          <th className="py-3 px-3">Name</th>
                          <th className="py-3 px-3">Value</th>
                          <th className="py-3 px-3">TTL</th>
                          <th className="py-3 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody
                        className={cn(
                          "divide-y text-sm",
                          isDark ? "divide-white/[0.06]" : "divide-slate-100"
                        )}
                      >
                        {paginatedRecords.map((rec) => {
                          const isRootNs =
                            rec.type === "NS" && rec.name === "@";
                          return (
                            <tr
                              key={`${rec.fqdn}-${rec.type}`}
                              className={cn(
                                "transition-colors",
                                isDark
                                  ? "hover:bg-white/[0.02]"
                                  : "hover:bg-slate-50/80"
                              )}
                            >
                              <td className="py-3.5 px-3 whitespace-nowrap">
                                <span
                                  className={cn(
                                    "inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono font-bold border",
                                    TYPE_BADGE_STYLES[rec.type] ||
                                    "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                                  )}
                                >
                                  {rec.type}
                                </span>
                              </td>
                              <td className="py-3.5 px-3 font-mono text-xs sm:text-sm whitespace-nowrap">
                                <span
                                  className={
                                    isDark ? "text-white" : "text-slate-900"
                                  }
                                >
                                  {rec.name === "@" ? selectedZone.domain : rec.name}
                                </span>
                              </td>
                              <td className="py-3.5 px-3 font-mono text-xs max-w-md">
                                <div className="space-y-1">
                                  {rec.records.map((entry, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center gap-2 group"
                                    >
                                      <span
                                        className={cn(
                                          "break-words",
                                          isDark
                                            ? "text-zinc-300"
                                            : "text-slate-700"
                                        )}
                                      >
                                        {entry.content}
                                      </span>
                                      <button
                                        onClick={() =>
                                          copyText(
                                            entry.content,
                                            "Record value copied"
                                          )
                                        }
                                        className={cn(
                                          "opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity shrink-0",
                                          isDark
                                            ? "hover:bg-white/10 text-zinc-400"
                                            : "hover:bg-slate-200 text-slate-500"
                                        )}
                                        title="Copy value"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td
                                className={cn(
                                  "py-3.5 px-3 text-xs whitespace-nowrap",
                                  isDark ? "text-zinc-400" : "text-slate-500"
                                )}
                              >
                                {rec.ttl}s
                              </td>
                              <td className="py-3.5 px-3 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    onClick={() => openEditRecordModal(rec)}
                                    className={cn(
                                      "p-1.5 rounded-lg border transition-colors",
                                      isDark
                                        ? "bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.08] text-zinc-300"
                                        : "bg-white hover:bg-slate-100 border-slate-200 text-slate-600"
                                    )}
                                    title="Edit record"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => !isRootNs && setDeletingRecord(rec)}
                                    disabled={isRootNs}
                                    className={cn(
                                      "p-1.5 rounded-lg border transition-colors disabled:opacity-35 disabled:cursor-not-allowed",
                                      isDark
                                        ? "bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400"
                                        : "bg-red-50 hover:bg-red-100 border-red-200 text-red-600"
                                    )}
                                    title={isRootNs ? "Root NS record cannot be deleted" : "Delete record"}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {totalRecordPages > 1 && (
                    <div className="pt-2">
                      <Pagination
                        currentPage={recordPage}
                        totalPages={totalRecordPages}
                        onPageChange={setRecordPage}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          ) : null}
        </div>
      </motion.div>

      {/* Add Domain Modal */}
      <AnimatePresence>
        {showAddDomainModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className={cn(
                "w-full max-w-md rounded-2xl border p-6 shadow-2xl",
                isDark
                  ? "bg-[#111115] border-white/[0.1]"
                  : "bg-white border-slate-200"
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <h3
                  className={cn(
                    "text-lg font-bold",
                    isDark ? "text-white" : "text-slate-900"
                  )}
                >
                  Add Domain to DNS
                </h3>
                <button
                  onClick={() => setShowAddDomainModal(false)}
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

              <form onSubmit={handleAddDomain} className="space-y-4">
                <div>
                  <label
                    className={cn(
                      "block text-xs font-medium uppercase tracking-wider mb-1.5",
                      isDark ? "text-zinc-400" : "text-slate-500"
                    )}
                  >
                    Domain Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    placeholder="example.com"
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono focus:outline-none focus:border-cyan-500",
                      isDark
                        ? "bg-zinc-900/80 border-white/[0.1] text-white placeholder:text-zinc-600"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                    )}
                  />
                </div>

                <div
                  className={cn(
                    "rounded-xl border p-3.5 text-xs space-y-1.5",
                    isDark
                      ? "bg-white/[0.02] border-white/[0.08] text-zinc-400"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  )}
                >
                  <p className="font-semibold text-cyan-400">
                    Nameserver Instructions
                  </p>
                  <p>
                    After adding your domain, point its Nameserver (NS) at your registrar to:
                  </p>
                  <p className="font-mono font-bold text-cyan-400">
                    {dnsInfo.nameservers[0]} ({dnsInfo.publicIp})
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddDomainModal(false)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-medium border",
                      isDark
                        ? "border-white/[0.1] text-zinc-300 hover:bg-white/[0.05]"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingDomain}
                    className="px-4 py-2 rounded-xl text-sm font-semibold bg-cyan-400 hover:bg-cyan-300 text-zinc-950 disabled:opacity-50"
                  >
                    {isCreatingDomain ? "Creating..." : "Create Zone"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add / Edit Record Modal */}
      <AnimatePresence>
        {showRecordModal && selectedZone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className={cn(
                "w-full max-w-lg rounded-2xl border p-6 shadow-2xl",
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
                    {editingRecord ? "Edit DNS Record" : "Add DNS Record"}
                  </h3>
                  <p
                    className={cn(
                      "text-xs font-mono mt-0.5",
                      isDark ? "text-zinc-400" : "text-slate-500"
                    )}
                  >
                    Zone: {selectedZone.domain}
                  </p>
                </div>
                <button
                  onClick={() => setShowRecordModal(false)}
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

              <form onSubmit={handleSaveRecord} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      className={cn(
                        "block text-xs font-medium uppercase tracking-wider mb-1.5",
                        isDark ? "text-zinc-400" : "text-slate-500"
                      )}
                    >
                      Record Type
                    </label>
                    <Select
                      value={recType}
                      onChange={(val) => setRecType(val)}
                      options={RECORD_TYPES.map((t) => ({ value: t, label: t }))}
                      className={cn(
                        "w-full border rounded-xl px-3.5 py-2 text-sm",
                        isDark
                          ? "bg-zinc-900/80 border-white/[0.1] text-white"
                          : "bg-slate-50 border-slate-200 text-slate-900"
                      )}
                    />
                  </div>

                  <div>
                    <label
                      className={cn(
                        "block text-xs font-medium uppercase tracking-wider mb-1.5",
                        isDark ? "text-zinc-400" : "text-slate-500"
                      )}
                    >
                      TTL
                    </label>
                    <Select
                      value={recTtl}
                      onChange={(val) => setRecTtl(val)}
                      options={TTL_OPTIONS}
                      className={cn(
                        "w-full border rounded-xl px-3.5 py-2 text-sm",
                        isDark
                          ? "bg-zinc-900/80 border-white/[0.1] text-white"
                          : "bg-slate-50 border-slate-200 text-slate-900"
                      )}
                    />
                  </div>
                </div>

                <div>
                  <label
                    className={cn(
                      "block text-xs font-medium uppercase tracking-wider mb-1.5",
                      isDark ? "text-zinc-400" : "text-slate-500"
                    )}
                  >
                    Host / Name (use @ for root)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      value={recName}
                      onChange={(e) => setRecName(e.target.value)}
                      placeholder="@ or www or api"
                      className={cn(
                        "flex-1 px-3.5 py-2.5 rounded-xl border text-sm font-mono focus:outline-none focus:border-cyan-500",
                        isDark
                          ? "bg-zinc-900/80 border-white/[0.1] text-white placeholder:text-zinc-600"
                          : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                      )}
                    />
                    <span
                      className={cn(
                        "text-xs font-mono shrink-0",
                        isDark ? "text-zinc-500" : "text-slate-500"
                      )}
                    >
                      .{selectedZone.domain}
                    </span>
                  </div>
                </div>

                {recType === "MX" && (
                  <div>
                    <label
                      className={cn(
                        "block text-xs font-medium uppercase tracking-wider mb-1.5",
                        isDark ? "text-zinc-400" : "text-slate-500"
                      )}
                    >
                      Priority
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={65535}
                      required
                      value={recPriority}
                      onChange={(e) => setRecPriority(e.target.value)}
                      className={cn(
                        "w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono focus:outline-none focus:border-cyan-500",
                        isDark
                          ? "bg-zinc-900/80 border-white/[0.1] text-white"
                          : "bg-slate-50 border-slate-200 text-slate-900"
                      )}
                    />
                  </div>
                )}

                <div>
                  <label
                    className={cn(
                      "block text-xs font-medium uppercase tracking-wider mb-1.5",
                      isDark ? "text-zinc-400" : "text-slate-500"
                    )}
                  >
                    Value / Target (one per line for multiple values)
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={recContent}
                    onChange={(e) => setRecContent(e.target.value)}
                    placeholder={getPlaceholderForType(recType)}
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono focus:outline-none focus:border-cyan-500",
                      isDark
                        ? "bg-zinc-900/80 border-white/[0.1] text-white placeholder:text-zinc-600"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                    )}
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRecordModal(false)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-medium border",
                      isDark
                        ? "border-white/[0.1] text-zinc-300 hover:bg-white/[0.05]"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingRecord}
                    className="px-4 py-2 rounded-xl text-sm font-semibold bg-cyan-400 hover:bg-cyan-300 text-zinc-950 disabled:opacity-50"
                  >
                    {isSavingRecord
                      ? "Saving..."
                      : editingRecord
                        ? "Save Changes"
                        : "Add Record"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DNSSEC & DS Records Modal */}
      <AnimatePresence>
        {showDnssecModal && selectedZone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className={cn(
                "w-full max-w-2xl rounded-2xl border p-6 shadow-2xl max-h-[90vh] overflow-y-auto",
                isDark
                  ? "bg-[#111115] border-white/[0.1]"
                  : "bg-white border-slate-200"
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3
                    className={cn(
                      "text-lg font-bold flex items-center gap-2",
                      isDark ? "text-white" : "text-slate-900"
                    )}
                  >
                    <ShieldCheck className="w-5 h-5 text-cyan-400" /> DNSSEC &amp; Registrar DS Records
                  </h3>
                  <p
                    className={cn(
                      "text-xs font-mono mt-0.5",
                      isDark ? "text-zinc-400" : "text-slate-500"
                    )}
                  >
                    Zone: {selectedZone.domain}
                  </p>
                </div>
                <button
                  onClick={() => setShowDnssecModal(false)}
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

              <div
                className={cn(
                  "rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5",
                  isDark
                    ? "bg-white/[0.02] border-white/[0.08]"
                    : "bg-slate-50 border-slate-200"
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        isDark ? "text-white" : "text-slate-900"
                      )}
                    >
                      DNSSEC Signing
                    </span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                        dnssec.enabled
                          ? isDark
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            : "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : isDark
                            ? "bg-zinc-500/10 border-zinc-500/20 text-zinc-400"
                            : "bg-slate-100 border-slate-200 text-slate-600"
                      )}
                    >
                      {dnssec.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "text-xs",
                      isDark ? "text-zinc-400" : "text-slate-500"
                    )}
                  >
                    {dnssec.enabled
                      ? "Copy the DS record details below into your domain registrar to complete DNSSEC validation."
                      : "Enable DNSSEC to generate cryptographic keys and DS records for your domain registrar."}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isTogglingDnssec}
                  onClick={() => handleToggleDnssec(!dnssec.enabled)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-semibold transition-colors shrink-0 disabled:opacity-50",
                    dnssec.enabled
                      ? isDark
                        ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                        : "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                      : "bg-cyan-400 hover:bg-cyan-300 text-zinc-950"
                  )}
                >
                  {isTogglingDnssec
                    ? "Updating..."
                    : dnssec.enabled
                      ? "Disable DNSSEC"
                      : "Enable DNSSEC"}
                </button>
              </div>

              {dnssec.enabled && dnssec.dsRecords.length > 0 && (
                <div className="space-y-4">
                  {dnssec.dsRecords.map((ds, idx) => (
                    <div
                      key={`${ds.keyTag}-${ds.digestType}-${idx}`}
                      className={cn(
                        "rounded-xl border p-4 space-y-3",
                        isDark
                          ? "bg-zinc-900/60 border-white/[0.08]"
                          : "bg-white border-slate-200"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "text-xs font-bold uppercase tracking-wider",
                            isDark ? "text-cyan-400" : "text-cyan-700"
                          )}
                        >
                          DS Record #{idx + 1} (Digest Type {ds.digestType})
                        </span>
                        <button
                          type="button"
                          onClick={() => copyText(ds.raw, "Full DS record copied")}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border",
                            isDark
                              ? "bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-zinc-300"
                              : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                          )}
                        >
                          <Copy className="w-3 h-3" /> Copy Full DS
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div
                          className={cn(
                            "rounded-lg border p-2.5",
                            isDark
                              ? "bg-black/30 border-white/[0.06]"
                              : "bg-slate-50 border-slate-200"
                          )}
                        >
                          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
                            <span>Key Tag</span>
                            <button
                              type="button"
                              onClick={() => copyText(ds.keyTag, "Key Tag copied")}
                              className="hover:text-cyan-400"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <code className="text-xs font-mono font-bold text-cyan-400">
                            {ds.keyTag}
                          </code>
                        </div>

                        <div
                          className={cn(
                            "rounded-lg border p-2.5",
                            isDark
                              ? "bg-black/30 border-white/[0.06]"
                              : "bg-slate-50 border-slate-200"
                          )}
                        >
                          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
                            <span>Algorithm</span>
                            <button
                              type="button"
                              onClick={() => copyText(ds.algorithm, "Algorithm copied")}
                              className="hover:text-cyan-400"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <code className="text-xs font-mono font-bold">
                            {ds.algorithm}{dnssec.algorithm ? ` (${dnssec.algorithm})` : ""}
                          </code>
                        </div>

                        <div
                          className={cn(
                            "rounded-lg border p-2.5",
                            isDark
                              ? "bg-black/30 border-white/[0.06]"
                              : "bg-slate-50 border-slate-200"
                          )}
                        >
                          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
                            <span>Digest Type</span>
                            <button
                              type="button"
                              onClick={() => copyText(ds.digestType, "Digest Type copied")}
                              className="hover:text-cyan-400"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <code className="text-xs font-mono font-bold">
                            {ds.digestType}
                          </code>
                        </div>
                      </div>

                      <div
                        className={cn(
                          "rounded-lg border p-2.5",
                          isDark
                            ? "bg-black/30 border-white/[0.06]"
                            : "bg-slate-50 border-slate-200"
                        )}
                      >
                        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
                          <span>Digest</span>
                          <button
                            type="button"
                            onClick={() => copyText(ds.digest, "Digest copied")}
                            className="hover:text-cyan-400"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <code className="text-xs font-mono break-all">
                          {ds.digest}
                        </code>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-5">
                <button
                  type="button"
                  onClick={() => setShowDnssecModal(false)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-medium border",
                    isDark
                      ? "border-white/[0.1] text-zinc-300 hover:bg-white/[0.05]"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  )}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Zone Confirmation */}
      <ConfirmModal
        isOpen={Boolean(deletingZone)}
        onClose={() => setDeletingZone(null)}
        onConfirm={handleDeleteDomain}
        title="Delete DNS Zone"
        description={`Are you sure you want to delete ${deletingZone?.domain} and all of its DNS records from Masdika DNS? This action cannot be undone.`}
        confirmText="Delete Zone"
        variant="danger"
        isLoading={isDeletingZone}
      />

      {/* Delete Record Confirmation */}
      <ConfirmModal
        isOpen={Boolean(deletingRecord)}
        onClose={() => setDeletingRecord(null)}
        onConfirm={handleDeleteRecord}
        title="Delete DNS Record"
        description={`Are you sure you want to delete the ${deletingRecord?.type} record for ${
          deletingRecord?.name === "@" && selectedZone ? selectedZone.domain : deletingRecord?.name
        }?`}
        confirmText="Delete Record"
        variant="danger"
        isLoading={isDeletingRecord}
      />
    </motion.div>
  );
}
