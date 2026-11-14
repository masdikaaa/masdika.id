"use client";

import { useUpdateEffect, useUrlNumber, useUrlTab } from "@/lib/useUrlTab";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Plus, Edit2, Trash2, Server, Zap, Database, Boxes, Check, X, ShieldAlert,
  CheckCircle, FileText, FileVideo, Music, PlaySquare, Cloud, Activity,
  UploadCloud, RefreshCw, LayoutDashboard, Search, LayoutGrid, Table as TableIcon,
  HardDrive, Cpu, Layers, Sparkles, SlidersHorizontal, ArrowUpDown, MapPin
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { formatRupiah } from "@/lib/billing";
import { Pagination } from "@/components/ui/Pagination";
import { AdminLoader } from "@/components/admin/AdminLoader";
import { Select } from "@/components/ui/Select";

interface Plan {
  id: number;
  name: string;
  service: string;
  description: string;
  price: number;
  hourlyPrice: number;
  limits: string;
  isPopular: boolean;
  isActive: boolean;
}

const VALID_SERVICES = [
  "ALL",
  "DATABASE",
  "APP",
  "CDN",
  "TIKTOK",
  "SPOTIFY",
  "YOUTUBE",
  "BLOG",
  "BMKG_WEATHER",
  "BMKG_EARTHQUAKE"
] as const;

const SERVICE_LABELS: Record<string, string> = {
  ALL: "All Services",
  DATABASE: "Managed Database",
  APP: "Managed Apps",
  CDN: "File CDN",
  TIKTOK: "TikTok API",
  SPOTIFY: "Spotify API",
  YOUTUBE: "YouTube API",
  BLOG: "Blog API",
  BMKG_WEATHER: "BMKG Weather",
  BMKG_EARTHQUAKE: "BMKG Earthquake",
};

interface DatabaseLimitsState {
  cpu: string;
  ram: string;
  storage: string;
  region: string;
  shared: boolean;
  engines: string[];
}

interface AppLimitsState {
  cpu: string;
  ram: string;
  storage: string;
  planCode: string;
  region: string;
  shared: boolean;
}

interface CdnLimitsState {
  storageGB: string;
  transferGB: string;
  requests: string;
}

interface ApiLimitsState {
  requests: string;
  rateLimit: string;
}

export default function AdminPlansPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Filtering & Pagination
  const [activeTab, setActiveTab] = useUrlTab<string>("ALL");
  const [currentPage, setCurrentPage] = useUrlNumber("currentPage", 1);
  const itemsPerPage = 12;

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    service: "DATABASE",
    description: "",
    price: 20000,
    hourlyPrice: 28,
    isPopular: false,
    isActive: true
  });

  // Dedicated structured limit builders
  const [dbLimits, setDbLimits] = useState<DatabaseLimitsState>({
    cpu: "0.5 vCPU",
    ram: "1 GB",
    storage: "10 GB",
    region: "Sidoarjo",
    shared: true,
    engines: ["MySQL", "MariaDB", "PostgreSQL", "MongoDB"]
  });

  const [appLimits, setAppLimits] = useState<AppLimitsState>({
    cpu: "1 CPU",
    ram: "1.0 GB RAM",
    storage: "10 GB",
    planCode: "1C1G",
    region: "Sidoarjo",
    shared: true
  });

  const [cdnLimits, setCdnLimits] = useState<CdnLimitsState>({
    storageGB: "10",
    transferGB: "50",
    requests: "unlimited"
  });

  const [apiLimits, setApiLimits] = useState<ApiLimitsState>({
    requests: "10000",
    rateLimit: "60"
  });

  // Fallback custom JSON or key-value mode
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customKeyValues, setCustomKeyValues] = useState<{ key: string; value: string }[]>([]);

  const fetchPlans = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/admin/plans");
      const data = await res.json();
      if (data.success) {
        setPlans(data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch plans");
    } finally {
      setLoading(false);
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openAddModal = () => {
    setEditingPlan(null);
    setIsCustomMode(false);
    const initialService = activeTab !== "ALL" && activeTab !== "PROXMOX" ? activeTab : "DATABASE";
    
    setFormData({
      name: initialService === "DATABASE" ? "Shared Database" : "Starter",
      service: initialService,
      description: initialService === "DATABASE" 
        ? "High-performance shared managed database with isolated container & SSD storage in Sidoarjo."
        : "Standard microservice pricing tier.",
      price: initialService === "DATABASE" ? 20000 : 45000,
      hourlyPrice: initialService === "DATABASE" ? 28 : 62,
      isPopular: false,
      isActive: true
    });

    setDbLimits({
      cpu: "500m",
      ram: "1 GB",
      storage: "10 GB",
      region: "Sidoarjo",
      shared: true,
      engines: ["MySQL", "MariaDB", "PostgreSQL", "MongoDB"]
    });

    setAppLimits({
      cpu: "1 CPU",
      ram: "1.0 GB RAM",
      storage: "10 GB",
      planCode: "1C1G",
      region: "Sidoarjo",
      shared: true
    });

    setCdnLimits({
      storageGB: "10",
      transferGB: "50",
      requests: "unlimited"
    });

    setApiLimits({
      requests: "10000",
      rateLimit: "60"
    });

    setIsModalOpen(true);
  };

  const openEditModal = (plan: Plan) => {
    setEditingPlan(plan);
    setIsCustomMode(false);

    setFormData({
      name: plan.name,
      service: plan.service,
      description: plan.description || "",
      price: plan.price,
      hourlyPrice: plan.hourlyPrice || 0,
      isPopular: plan.isPopular || false,
      isActive: plan.isActive
    });

    try {
      const parsed = JSON.parse(plan.limits);
      if (plan.service === "DATABASE") {
        setDbLimits({
          cpu: parsed.cpu || "0.5 vCPU",
          ram: parsed.ram || "1 GB",
          storage: parsed.storage || "10 GB",
          region: parsed.region || "Sidoarjo",
          shared: parsed.shared !== undefined ? Boolean(parsed.shared) : true,
          engines: Array.isArray(parsed.engines) ? parsed.engines : ["MySQL", "MariaDB", "PostgreSQL", "MongoDB"]
        });
      } else if (plan.service === "APP") {
        setAppLimits({
          cpu: parsed.cpu || "1 CPU",
          ram: parsed.ram || "1.0 GB RAM",
          storage: parsed.storage || (parsed.storageGb ? `${parsed.storageGb} GB` : "10 GB"),
          planCode: parsed.planCode || "1C1G",
          region: parsed.region || "Sidoarjo",
          shared: parsed.shared !== undefined ? Boolean(parsed.shared) : true
        });
      } else if (plan.service === "CDN") {
        setCdnLimits({
          storageGB: String(parsed.storageGB || "10"),
          transferGB: String(parsed.transferGB || "50"),
          requests: String(parsed.requests || "unlimited")
        });
      } else {
        setApiLimits({
          requests: String(parsed.requests || "10000"),
          rateLimit: String(parsed.rateLimit || "60")
        });
      }

      const kv = Object.entries(parsed).map(([key, value]) => ({
        key,
        value: typeof value === "object" ? JSON.stringify(value) : String(value)
      }));
      setCustomKeyValues(kv);
    } catch {
      setCustomKeyValues([{ key: "limits", value: plan.limits }]);
    }

    setIsModalOpen(true);
  };

  const handleAutoCalculateHourly = () => {
    const hourly = Math.round(formData.price / 720);
    setFormData(prev => ({ ...prev, hourlyPrice: hourly }));
    toast.success(`Calculated PAYG: ${formatRupiah(hourly)} / hour`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let limitsJsonString = "{}";
    if (isCustomMode) {
      const customObj: Record<string, any> = {};
      for (const item of customKeyValues) {
        if (!item.key.trim()) continue;
        const num = Number(item.value);
        customObj[item.key] = isNaN(num) || item.value.trim() === "" ? item.value : num;
      }
      limitsJsonString = JSON.stringify(customObj);
    } else if (formData.service === "DATABASE") {
      limitsJsonString = JSON.stringify(dbLimits);
    } else if (formData.service === "APP") {
      const cpuVal = parseFloat(appLimits.cpu) || 1.0;
      const ramVal = appLimits.ram.toUpperCase().includes("MB")
        ? parseInt(appLimits.ram, 10)
        : Math.round((parseFloat(appLimits.ram) || 1.0) * 1024);
      const storageVal = parseInt(appLimits.storage || "10", 10) || 10;
      limitsJsonString = JSON.stringify({
        ...appLimits,
        cpuShares: cpuVal,
        memoryMb: ramVal,
        storageGb: storageVal,
      });
    } else if (formData.service === "CDN") {
      limitsJsonString = JSON.stringify({
        storageGB: Number(cdnLimits.storageGB) || cdnLimits.storageGB,
        transferGB: Number(cdnLimits.transferGB) || cdnLimits.transferGB,
        requests: cdnLimits.requests
      });
    } else {
      limitsJsonString = JSON.stringify({
        requests: isNaN(Number(apiLimits.requests)) ? apiLimits.requests : Number(apiLimits.requests),
        rateLimit: isNaN(Number(apiLimits.rateLimit)) ? apiLimits.rateLimit : Number(apiLimits.rateLimit)
      });
    }

    setIsSubmitting(true);
    const toastId = toast.loading(editingPlan ? "Updating plan..." : "Creating plan...");
    try {
      const url = editingPlan
        ? `/api/admin/plans/${editingPlan.id}`
        : "/api/admin/plans";

      const payload = { ...formData, limits: limitsJsonString };
      const res = await fetch(url, {
        method: editingPlan ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Plan successfully ${editingPlan ? "updated" : "created"}`, { id: toastId });
        setIsModalOpen(false);
        fetchPlans();
      } else {
        toast.error(data.error || "Failed to save plan", { id: toastId });
      }
    } catch {
      toast.error("An error occurred", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (plan: Plan) => {
    const toastId = toast.loading(`${plan.isActive ? "Disabling" : "Enabling"} plan...`);
    try {
      const res = await fetch(`/api/admin/plans/${plan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...plan,
          isActive: !plan.isActive
        })
      });
      if (res.ok) {
        toast.success(`Plan ${!plan.isActive ? "enabled" : "disabled"}`, { id: toastId });
        fetchPlans();
      } else {
        toast.error("Failed to update status", { id: toastId });
      }
    } catch {
      toast.error("An error occurred", { id: toastId });
    }
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);

    const toastId = toast.loading("Deleting plan...");
    try {
      const res = await fetch(`/api/admin/plans/${deleteConfirmId}`, { method: "DELETE" });
      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || "Plan deleted", { id: toastId });
        fetchPlans();
      } else {
        toast.error(data.error || "Failed to delete plan", { id: toastId });
      }
    } catch {
      toast.error("An error occurred", { id: toastId });
    } finally {
      setIsDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  const executeBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);
    const toastId = toast.loading("Deleting plans...");
    try {
      const res = await fetch("/api/admin/plans", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds })
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(`${selectedIds.length} plans deleted`, { id: toastId });
        setSelectedIds([]);
        fetchPlans();
        setIsBulkDeleteModalOpen(false);
      } else {
        toast.error(data.error || "Failed to delete plans", { id: toastId });
      }
    } catch {
      toast.error("An error occurred", { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case "DATABASE": return <Database className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-600")} />;
      case "APP": return <Boxes className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-600")} />;
      case "CDN": return <UploadCloud className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-600")} />;
      case "TIKTOK": return <FileVideo className={cn("w-4 h-4", isDark ? "text-purple-400" : "text-purple-600")} />;
      case "SPOTIFY": return <Music className={cn("w-4 h-4", isDark ? "text-emerald-400" : "text-emerald-600")} />;
      case "YOUTUBE": return <PlaySquare className={cn("w-4 h-4", isDark ? "text-red-400" : "text-red-600")} />;
      case "BLOG": return <FileText className={cn("w-4 h-4", isDark ? "text-amber-400" : "text-amber-600")} />;
      case "BMKG_WEATHER": return <Cloud className={cn("w-4 h-4", isDark ? "text-sky-400" : "text-sky-600")} />;
      case "BMKG_EARTHQUAKE": return <Activity className={cn("w-4 h-4", isDark ? "text-orange-400" : "text-orange-600")} />;
      default: return <Server className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-600")} />;
    }
  };

  const renderLimitBadges = (plan: Plan) => {
    try {
      const parsed = JSON.parse(plan.limits);
      if (plan.service === "DATABASE") {
        return (
          <div className="flex flex-wrap items-center gap-1.5 max-w-[340px]">
            {parsed.cpu && (
              <span className={cn("px-2 py-0.5 rounded-md text-[11px] font-semibold border flex items-center gap-1", isDark ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
                <Cpu className="w-3 h-3" /> {parsed.cpu}
              </span>
            )}
            {parsed.ram && (
              <span className={cn("px-2 py-0.5 rounded-md text-[11px] font-semibold border flex items-center gap-1", isDark ? "bg-purple-500/10 text-purple-300 border-purple-500/20" : "bg-purple-50 text-purple-700 border-purple-200")}>
                <Layers className="w-3 h-3" /> {parsed.ram}
              </span>
            )}
            {parsed.storage && (
              <span className={cn("px-2 py-0.5 rounded-md text-[11px] font-semibold border flex items-center gap-1", isDark ? "bg-amber-500/10 text-amber-300 border-amber-500/20" : "bg-amber-50 text-amber-700 border-amber-200")}>
                <HardDrive className="w-3 h-3" /> {parsed.storage}
              </span>
            )}
            {parsed.region && (
              <span className={cn("px-2 py-0.5 rounded-md text-[11px] font-semibold border flex items-center gap-1", isDark ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200")}>
                <MapPin className="w-3 h-3" /> {parsed.region}
              </span>
            )}
            {(parsed.storage || parsed.storageGb) && (
              <span className={cn("px-2 py-0.5 rounded-md text-[11px] font-semibold border flex items-center gap-1", isDark ? "bg-amber-500/10 text-amber-300 border-amber-500/20" : "bg-amber-50 text-amber-700 border-amber-200")}>
                <HardDrive className="w-3 h-3" /> {parsed.storage || `${parsed.storageGb} GB`}
              </span>
            )}
            <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-medium border", isDark ? "bg-white/[0.04] text-zinc-400 border-white/[0.08]" : "bg-slate-100 text-slate-600 border-slate-200")}>
              {parsed.shared ? "Shared Pool" : "Dedicated"}
            </span>
          </div>
        );
      }

      if (plan.service === "APP") {
        return (
          <div className="flex flex-wrap items-center gap-1.5 max-w-[340px]">
            {parsed.cpu && (
              <span className={cn("px-2 py-0.5 rounded-md text-[11px] font-semibold border flex items-center gap-1", isDark ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
                <Cpu className="w-3 h-3" /> {parsed.cpu}
              </span>
            )}
            {parsed.ram && (
              <span className={cn("px-2 py-0.5 rounded-md text-[11px] font-semibold border flex items-center gap-1", isDark ? "bg-purple-500/10 text-purple-300 border-purple-500/20" : "bg-purple-50 text-purple-700 border-purple-200")}>
                <Layers className="w-3 h-3" /> {parsed.ram}
              </span>
            )}
            {parsed.region && (
              <span className={cn("px-2 py-0.5 rounded-md text-[11px] font-semibold border flex items-center gap-1", isDark ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200")}>
                <MapPin className="w-3 h-3" /> {parsed.region}
              </span>
            )}
            {(parsed.storage || parsed.storageGb) && (
              <span className={cn("px-2 py-0.5 rounded-md text-[11px] font-semibold border flex items-center gap-1", isDark ? "bg-amber-500/10 text-amber-300 border-amber-500/20" : "bg-amber-50 text-amber-700 border-amber-200")}>
                <HardDrive className="w-3 h-3" /> {parsed.storage || `${parsed.storageGb} GB`}
              </span>
            )}
            <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-medium border", isDark ? "bg-white/[0.04] text-zinc-400 border-white/[0.08]" : "bg-slate-100 text-slate-600 border-slate-200")}>
              Shared Pool
            </span>
            {parsed.planCode && (
              <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" : "bg-cyan-50 text-cyan-800 border-cyan-200")}>
                {parsed.planCode}
              </span>
            )}
          </div>
        );
      }

      if (plan.service === "CDN") {
        return (
          <div className="flex flex-wrap items-center gap-1.5 max-w-[320px]">
            {parsed.storageGB && (
              <span className={cn("px-2 py-0.5 rounded-md text-[11px] font-semibold border flex items-center gap-1", isDark ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
                <HardDrive className="w-3 h-3" /> {parsed.storageGB} GB Storage
              </span>
            )}
            {parsed.transferGB && (
              <span className={cn("px-2 py-0.5 rounded-md text-[11px] font-semibold border", isDark ? "bg-purple-500/10 text-purple-300 border-purple-500/20" : "bg-purple-50 text-purple-700 border-purple-200")}>
                {parsed.transferGB} GB Bandwidth
              </span>
            )}
            {parsed.requests && (
              <span className={cn("px-2 py-0.5 rounded-md text-[11px] font-semibold border", isDark ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200")}>
                {parsed.requests === "unlimited" ? "Unlimited Requests" : `${parsed.requests} req`}
              </span>
            )}
          </div>
        );
      }

      // API services
      return (
        <div className="flex flex-wrap items-center gap-1.5 max-w-[320px]">
          {parsed.requests && (
            <span className={cn("px-2 py-0.5 rounded-md text-[11px] font-semibold border", isDark ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
              {parsed.requests === "unlimited" ? "Unlimited req/mo" : `${Number(parsed.requests).toLocaleString()} req/mo`}
            </span>
          )}
          {parsed.rateLimit && (
            <span className={cn("px-2 py-0.5 rounded-md text-[11px] font-semibold border", isDark ? "bg-amber-500/10 text-amber-300 border-amber-500/20" : "bg-amber-50 text-amber-700 border-amber-200")}>
              {parsed.rateLimit} req/min
            </span>
          )}
        </div>
      );
    } catch {
      return (
        <span className={cn("text-xs font-mono px-2 py-1 rounded border truncate max-w-[200px] inline-block", isDark ? "bg-white/[0.03] text-zinc-400 border-white/[0.08]" : "bg-slate-50 text-slate-600 border-slate-200")}>
          {plan.limits}
        </span>
      );
    }
  };

  // Filter plans based on active tab and search query
  const filteredPlans = useMemo(() => {
    return plans.filter(p => {
      const matchesTab = activeTab === "ALL" ? true : p.service === activeTab;
      if (!matchesTab) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.service.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        p.limits.toLowerCase().includes(q)
      );
    });
  }, [plans, activeTab, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredPlans.length / itemsPerPage));
  const paginatedPlans = filteredPlans.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useUpdateEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [activeTab, searchQuery]);

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedPlans.length && paginatedPlans.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedPlans.map(p => p.id));
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  if (loading) {
    return <AdminLoader />;
  }

  const totalCount = plans.length;
  const activeCount = plans.filter(p => p.isActive).length;
  const popularCount = plans.filter(p => p.isPopular).length;
  const distinctServices = Array.from(new Set(plans.map(p => p.service))).length;

  return (
    <div className="space-y-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Subscription Plans & Pricing
            </h1>
            <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold border", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
              PAYG Ready
            </span>
          </div>
          <p className={cn("text-xs sm:text-sm font-medium mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>
            Manage pricing tiers, quotas, and PAYG billing rates for Managed Database, CDN, and Developer APIs.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => fetchPlans()}
            disabled={isRefreshing || loading}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 border cursor-pointer",
              isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
            )}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", (isRefreshing || loading) && "animate-spin text-cyan-400")} />
            <span>Refresh</span>
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 flex items-center justify-center gap-2 bg-cyan-400 hover:bg-cyan-300 active:scale-95 text-slate-950 shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Plan</span>
          </button>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>TOTAL PLANS</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <LayoutDashboard className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>{totalCount}</span>
            <span className={cn("text-xs font-semibold", isDark ? "text-cyan-400" : "text-cyan-600")}>Configured</span>
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>ACTIVE PLANS</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700")}>
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>{activeCount}</span>
            <span className={cn("text-xs font-semibold", isDark ? "text-emerald-400" : "text-emerald-600")}>Purchasable</span>
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>SERVICES COVERED</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-purple-500/15 border-purple-500/25 text-purple-400" : "bg-purple-50 border-purple-200 text-purple-700")}>
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>{distinctServices}</span>
            <span className={cn("text-xs font-semibold", isDark ? "text-purple-400" : "text-purple-600")}>Modules</span>
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>POPULAR HIGHLIGHTS</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-amber-500/15 border-amber-500/25 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700")}>
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>{popularCount}</span>
            <span className={cn("text-xs font-semibold", isDark ? "text-amber-400" : "text-amber-600")}>Featured</span>
          </div>
        </div>
      </div>

      {/* Filter, Search & View Controls Bar */}
      <div className={cn("p-4 rounded-2xl border flex flex-col gap-4", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Service Tabs */}
          <div className={cn("inline-flex items-center gap-1.5 p-1 rounded-xl border max-w-full overflow-x-auto no-scrollbar", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-100 border-slate-200")}>
            {VALID_SERVICES.map((srv) => {
              const count = srv === "ALL" ? plans.length : plans.filter(p => p.service === srv).length;
              const label = SERVICE_LABELS[srv] || srv;
              const isActive = activeTab === srv;
              return (
                <button
                  key={srv}
                  onClick={() => { setActiveTab(srv); setCurrentPage(1); }}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer select-none",
                    isActive
                      ? "bg-cyan-500 text-slate-950 shadow-sm"
                      : isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-slate-600 hover:text-slate-900 hover:bg-white"
                  )}
                >
                  <span>{label}</span>
                  <span className={cn("px-1.5 py-0.2 rounded-full text-[10px] font-black", isActive ? "bg-slate-950/20 text-slate-950" : isDark ? "bg-white/10 text-zinc-300" : "bg-slate-200 text-slate-700")}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Actions: Search + View Switcher + Bulk Delete */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", isDark ? "text-zinc-500" : "text-slate-400")} />
              <input
                type="text"
                placeholder="Search plan or limit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn("w-full pl-9 pr-3.5 py-1.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#0a0a0c] border-white/[0.08] text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className={cn("absolute right-2.5 top-1/2 -translate-y-1/2", isDark ? "text-zinc-400 hover:text-white" : "text-slate-400 hover:text-slate-700")}>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className={cn("flex items-center rounded-xl border p-0.5", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-100 border-slate-200")}>
              <button
                onClick={() => setViewMode("table")}
                className={cn("p-1.5 rounded-lg text-xs font-medium transition-all", viewMode === "table" ? (isDark ? "bg-white/10 text-white" : "bg-white text-slate-900 shadow-2xs") : (isDark ? "text-zinc-500 hover:text-zinc-300" : "text-slate-500 hover:text-slate-800"))}
                title="Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={cn("p-1.5 rounded-lg text-xs font-medium transition-all", viewMode === "grid" ? (isDark ? "bg-white/10 text-white" : "bg-white text-slate-900 shadow-2xs") : (isDark ? "text-zinc-500 hover:text-zinc-300" : "text-slate-500 hover:text-slate-800"))}
                title="Cards Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {selectedIds.length > 0 && (
              <button
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className={cn("flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border", isDark ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20" : "bg-red-50 hover:bg-red-100 text-red-600 border-red-200")}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete ({selectedIds.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content: Table View or Grid View */}
      {viewMode === "table" ? (
        <div className={cn("border rounded-2xl overflow-hidden relative", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
          <div className="overflow-x-auto">
            <table className={cn("w-full text-left text-sm", isDark ? "text-zinc-400" : "text-slate-600")}>
              <thead className={cn("text-xs uppercase border-b tracking-wider font-bold", isDark ? "bg-[#0a0a0c] text-zinc-400 border-white/[0.08]" : "bg-slate-50 text-slate-500 border-slate-200")}>
                <tr>
                  <th scope="col" className="px-5 py-4 w-12 text-center">
                    <button
                      onClick={toggleSelectAll}
                      className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer",
                        selectedIds.length === paginatedPlans.length && paginatedPlans.length > 0
                          ? "bg-cyan-500 border-cyan-500 text-slate-950"
                          : isDark ? "border-zinc-600 hover:border-cyan-400" : "border-slate-300 hover:border-cyan-600"
                      )}
                    >
                      {selectedIds.length === paginatedPlans.length && paginatedPlans.length > 0 && (
                        <Check className="w-3 h-3 stroke-[3]" />
                      )}
                    </button>
                  </th>
                  <th scope="col" className="px-5 py-4 whitespace-nowrap">Plan Details</th>
                  <th scope="col" className="px-5 py-4 whitespace-nowrap">Service</th>
                  <th scope="col" className="px-5 py-4 whitespace-nowrap">Pricing (Monthly / PAYG)</th>
                  <th scope="col" className="px-5 py-4 whitespace-nowrap">Quotas & Resource Limits</th>
                  <th scope="col" className="px-5 py-4 text-center whitespace-nowrap">Status</th>
                  <th scope="col" className="px-5 py-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className={cn("divide-y", isDark ? "divide-white/[0.06]" : "divide-slate-200")}>
                {paginatedPlans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={cn("px-6 py-14 text-center text-sm", isDark ? "text-zinc-500" : "text-slate-500")}>
                      No plans found matching your filter or search query.
                    </td>
                  </tr>
                ) : (
                  paginatedPlans.map((plan) => {
                    const isSelected = selectedIds.includes(plan.id);
                    return (
                      <tr
                        key={plan.id}
                        className={cn(
                          "transition-colors",
                          isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50/80",
                          isSelected ? (isDark ? "bg-cyan-500/10" : "bg-cyan-50/80") : ""
                        )}
                      >
                        <td className="px-5 py-4 text-center">
                          <button
                            onClick={() => toggleSelect(plan.id)}
                            className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer",
                              isSelected
                                ? "bg-cyan-500 border-cyan-500 text-slate-950"
                                : isDark ? "border-zinc-600 hover:border-cyan-400" : "border-slate-300 hover:border-cyan-600"
                            )}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>
                        </td>

                        <td className="px-5 py-4 min-w-[220px]">
                          <div className="flex items-center gap-2">
                            <span className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>
                              {plan.name}
                            </span>
                            {plan.isPopular && (
                              <span className={cn("px-2 py-0.5 rounded text-[10px] font-extrabold border flex items-center gap-1", isDark ? "bg-amber-500/15 text-amber-300 border-amber-500/30" : "bg-amber-50 text-amber-800 border-amber-200")}>
                                <Sparkles className="w-3 h-3" /> Featured
                              </span>
                            )}
                          </div>
                          {plan.description && (
                            <p className={cn("text-xs mt-0.5 max-w-sm line-clamp-1", isDark ? "text-zinc-500" : "text-slate-500")}>
                              {plan.description}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-7 h-7 rounded-lg border flex items-center justify-center", isDark ? "bg-white/[0.04] border-white/[0.08]" : "bg-slate-100 border-slate-200")}>
                              {getServiceIcon(plan.service)}
                            </div>
                            <span className={cn("font-semibold text-xs", isDark ? "text-zinc-200" : "text-slate-700")}>
                              {SERVICE_LABELS[plan.service] || plan.service}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className={cn("font-black text-sm", isDark ? "text-cyan-400" : "text-cyan-700")}>
                            {formatRupiah(plan.price)}
                            <span className={cn("text-[11px] font-normal ml-1", isDark ? "text-zinc-500" : "text-slate-500")}>/bln</span>
                          </div>
                          <div className={cn("text-xs font-semibold mt-0.5 flex items-center gap-1", isDark ? "text-purple-400" : "text-purple-700")}>
                            <span>{formatRupiah(plan.hourlyPrice || Math.round(plan.price / 720))}</span>
                            <span className="text-[10px] opacity-75 font-normal">/jam (PAYG)</span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          {renderLimitBadges(plan)}
                        </td>

                        <td className="px-5 py-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleToggleActive(plan)}
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer",
                              plan.isActive
                                ? isDark
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                : isDark
                                  ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20 hover:bg-zinc-500/20"
                                  : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                            )}
                            title="Click to toggle active/inactive"
                          >
                            {plan.isActive ? (
                              <>
                                <Check className="w-3 h-3 stroke-[3]" /> Active
                              </>
                            ) : (
                              <>
                                <X className="w-3 h-3 stroke-[3]" /> Disabled
                              </>
                            )}
                          </button>
                        </td>

                        <td className="px-5 py-4 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => openEditModal(plan)}
                            className={cn("p-2 rounded-xl transition-all border cursor-pointer", isDark ? "bg-[#0a0a0c] border-white/[0.08] text-zinc-300 hover:text-white hover:border-cyan-500/40" : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-2xs")}
                            title="Edit Plan"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(plan.id)}
                            className={cn("p-2 rounded-xl transition-all border cursor-pointer", isDark ? "bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400" : "bg-red-50 hover:bg-red-100 border-red-200 text-red-600 shadow-2xs")}
                            title="Delete Plan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className={cn("p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3", isDark ? "bg-[#0c0c0e] border-white/[0.08]" : "bg-white border-slate-200")}>
            <div className={cn("text-xs font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>
              Showing {paginatedPlans.length} of {filteredPlans.length} plans
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        </div>
      ) : (
        /* Grid Cards View */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedPlans.map((plan) => {
              return (
                <div
                  key={plan.id}
                  className={cn(
                    "rounded-2xl border p-5 transition-all flex flex-col justify-between relative group",
                    isDark ? "bg-[#0c0c0e] border-white/[0.08] hover:border-cyan-500/30" : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                  )}
                >
                  <div>
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center shrink-0", isDark ? "bg-white/[0.04] border-white/[0.08]" : "bg-slate-100 border-slate-200")}>
                          {getServiceIcon(plan.service)}
                        </div>
                        <div>
                          <span className={cn("text-[11px] font-bold uppercase tracking-wider block", isDark ? "text-zinc-400" : "text-slate-500")}>
                            {SERVICE_LABELS[plan.service] || plan.service}
                          </span>
                          <h3 className={cn("text-base font-bold leading-tight", isDark ? "text-white" : "text-slate-900")}>
                            {plan.name}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {plan.isPopular && (
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-extrabold border flex items-center gap-1", isDark ? "bg-amber-500/15 text-amber-300 border-amber-500/30" : "bg-amber-50 text-amber-800 border-amber-200")}>
                            <Sparkles className="w-3 h-3" /> Featured
                          </span>
                        )}
                        <button
                          onClick={() => handleToggleActive(plan)}
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer",
                            plan.isActive
                              ? isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : isDark ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" : "bg-slate-100 text-slate-500 border-slate-200"
                          )}
                        >
                          {plan.isActive ? "Active" : "Disabled"}
                        </button>
                      </div>
                    </div>

                    {plan.description && (
                      <p className={cn("text-xs leading-relaxed mb-4", isDark ? "text-zinc-400" : "text-slate-500")}>
                        {plan.description}
                      </p>
                    )}

                    {/* Price Block */}
                    <div className={cn("p-3 rounded-xl border mb-4 flex items-baseline justify-between", isDark ? "bg-[#0a0a0c] border-white/[0.06]" : "bg-slate-50 border-slate-200")}>
                      <div>
                        <div className={cn("text-lg font-black", isDark ? "text-cyan-400" : "text-cyan-700")}>
                          {formatRupiah(plan.price)}
                          <span className={cn("text-xs font-normal ml-1", isDark ? "text-zinc-500" : "text-slate-500")}>/bln</span>
                        </div>
                      </div>
                      <div className={cn("text-xs font-bold text-right", isDark ? "text-purple-400" : "text-purple-700")}>
                        {formatRupiah(plan.hourlyPrice || Math.round(plan.price / 720))}
                        <span className="text-[10px] font-normal block opacity-80">/jam PAYG</span>
                      </div>
                    </div>

                    {/* Limits */}
                    <div className="mb-4">
                      <span className={cn("text-[11px] font-bold uppercase tracking-wider block mb-2", isDark ? "text-zinc-500" : "text-slate-400")}>
                        Resource Specifications
                      </span>
                      {renderLimitBadges(plan)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className={cn("pt-4 border-t flex items-center justify-end gap-2", isDark ? "border-white/[0.06]" : "border-slate-100")}>
                    <button
                      onClick={() => openEditModal(plan)}
                      className={cn("px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer", isDark ? "bg-white/5 border-white/10 text-zinc-300 hover:text-white" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100")}
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(plan.id)}
                      className={cn("px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer", isDark ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20" : "bg-red-50 border-red-200 text-red-600 hover:bg-red-100")}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={cn("p-4 border rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3", isDark ? "bg-[#0c0c0e] border-white/[0.08]" : "bg-white border-slate-200")}>
            <div className={cn("text-xs font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>
              Showing {paginatedPlans.length} of {filteredPlans.length} plans
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        </div>
      )}

      {/* Modern Add / Edit Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className={cn("relative border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl z-10", isDark ? "bg-[#0c0c0e] border-white/[0.1] text-white" : "bg-white border-slate-200 text-slate-900")}>
            
            {/* Modal Header */}
            <div className={cn("flex justify-between items-center p-6 border-b sticky top-0 backdrop-blur-md z-20", isDark ? "bg-[#0c0c0e]/95 border-white/[0.08]" : "bg-white/95 border-slate-200")}>
              <div>
                <h2 className="text-base sm:text-lg font-bold">
                  {editingPlan ? "Edit Subscription Plan" : "Create Subscription Plan"}
                </h2>
                <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                  Configure plan pricing, limits, and service specifications.
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className={cn("p-1.5 rounded-lg transition-colors cursor-pointer", isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100")}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Row 1: Plan Name & Service */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={cn("text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-600")}>
                    Plan Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Shared Database, Starter, Pro"
                    className={cn("w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition-all font-medium", isDark ? "bg-[#0a0a0c] border-white/[0.08] text-white placeholder:text-zinc-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={cn("text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-600")}>
                    Target Service <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={formData.service}
                    onChange={(val) => {
                      const newService = val.toString();
                      setFormData({ ...formData, service: newService });
                    }}
                    options={[
                      { value: "DATABASE", label: "Managed Database (Kubernetes)" },
                      { value: "APP", label: "Managed Apps (Kubernetes)" },
                      { value: "CDN", label: "File CDN" },
                      { value: "TIKTOK", label: "TikTok API" },
                      { value: "SPOTIFY", label: "Spotify API" },
                      { value: "YOUTUBE", label: "YouTube API" },
                      { value: "BLOG", label: "Blog API" },
                      { value: "BMKG_WEATHER", label: "BMKG Weather API" },
                      { value: "BMKG_EARTHQUAKE", label: "BMKG Earthquake API" }
                    ]}
                    placeholder="Select Service..."
                    className={cn("w-full rounded-xl px-3.5 py-2 text-sm", isDark ? "bg-[#0a0a0c] border-white/[0.08] text-white" : "bg-slate-50 border-slate-200 text-slate-900")}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className={cn("text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-600")}>
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. High-performance shared managed database with isolated container & SSD storage in Sidoarjo."
                  className={cn("w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition-all font-medium", isDark ? "bg-[#0a0a0c] border-white/[0.08] text-white placeholder:text-zinc-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
                />
              </div>

              {/* Pricing Row: Monthly Price & Hourly PAYG Rate with Auto Calculator */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className={cn("text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-600")}>
                      Monthly Price (Rp) <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <div className="relative">
                    <span className={cn("absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>Rp</span>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      className={cn("w-full border rounded-xl pl-11 pr-3.5 py-2.5 text-sm font-bold focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#0a0a0c] border-white/[0.08] text-cyan-400" : "bg-slate-50 border-slate-200 text-cyan-700")}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className={cn("text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-600")}>
                      Hourly PAYG Rate (Rp) <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoCalculateHourly}
                      className={cn("text-[10px] font-bold text-cyan-400 hover:underline cursor-pointer flex items-center gap-1")}
                    >
                      <Sparkles className="w-3 h-3" /> Auto (~Price/720)
                    </button>
                  </div>
                  <div className="relative">
                    <span className={cn("absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>Rp</span>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.hourlyPrice}
                      onChange={(e) => setFormData({ ...formData, hourlyPrice: Number(e.target.value) })}
                      className={cn("w-full border rounded-xl pl-11 pr-3.5 py-2.5 text-sm font-bold focus:outline-none focus:border-purple-500 transition-all", isDark ? "bg-[#0a0a0c] border-white/[0.08] text-purple-400" : "bg-slate-50 border-slate-200 text-purple-700")}
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Limit Builder by Service */}
              <div className={cn("p-4 rounded-xl border space-y-4", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50 border-slate-200")}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                    <span className={cn("text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-200" : "text-slate-800")}>
                      {formData.service === "DATABASE" ? "Managed Database Specifications" : "Service Quotas & Limits"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCustomMode(!isCustomMode)}
                    className={cn("text-[11px] font-semibold text-zinc-400 hover:text-white cursor-pointer underline")}
                  >
                    {isCustomMode ? "Switch to Preset Form" : "Advanced JSON / Custom"}
                  </button>
                </div>

                {isCustomMode ? (
                  <div className="space-y-2">
                    <p className={cn("text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>
                      Custom key-value limits. These will be serialized into JSON.
                    </p>
                    {customKeyValues.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Key (e.g. storageGB)"
                          value={item.key}
                          onChange={(e) => {
                            const updated = [...customKeyValues];
                            updated[idx].key = e.target.value;
                            setCustomKeyValues(updated);
                          }}
                          className={cn("w-1/2 border rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-cyan-500", isDark ? "bg-white/[0.03] border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900")}
                        />
                        <input
                          type="text"
                          placeholder="Value (e.g. 50)"
                          value={item.value}
                          onChange={(e) => {
                            const updated = [...customKeyValues];
                            updated[idx].value = e.target.value;
                            setCustomKeyValues(updated);
                          }}
                          className={cn("w-1/2 border rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-cyan-500", isDark ? "bg-white/[0.03] border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900")}
                        />
                        <button
                          type="button"
                          onClick={() => setCustomKeyValues(customKeyValues.filter((_, i) => i !== idx))}
                          className="p-1.5 text-red-400 hover:text-red-300"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCustomKeyValues([...customKeyValues, { key: "", value: "" }])}
                      className="text-xs text-cyan-400 hover:underline font-semibold flex items-center gap-1 pt-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add custom limit
                    </button>
                  </div>
                ) : formData.service === "DATABASE" ? (
                  /* Form for Managed Database */
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className={cn("text-[11px] font-bold block mb-1", isDark ? "text-zinc-400" : "text-slate-600")}>
                          CPU Shares
                        </label>
                        <input
                          type="text"
                          value={dbLimits.cpu}
                          onChange={(e) => setDbLimits({ ...dbLimits, cpu: e.target.value })}
                          placeholder="e.g. 500m or 1 vCPU"
                          className={cn("w-full border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-cyan-500", isDark ? "bg-white/[0.03] border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900")}
                        />
                      </div>
                      <div>
                        <label className={cn("text-[11px] font-bold block mb-1", isDark ? "text-zinc-400" : "text-slate-600")}>
                          RAM Limit
                        </label>
                        <input
                          type="text"
                          value={dbLimits.ram}
                          onChange={(e) => setDbLimits({ ...dbLimits, ram: e.target.value })}
                          placeholder="e.g. 1 GB"
                          className={cn("w-full border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-cyan-500", isDark ? "bg-white/[0.03] border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900")}
                        />
                      </div>
                      <div>
                        <label className={cn("text-[11px] font-bold block mb-1", isDark ? "text-zinc-400" : "text-slate-600")}>
                          SSD Storage
                        </label>
                        <input
                          type="text"
                          value={dbLimits.storage}
                          onChange={(e) => setDbLimits({ ...dbLimits, storage: e.target.value })}
                          placeholder="e.g. 10 GB"
                          className={cn("w-full border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-cyan-500", isDark ? "bg-white/[0.03] border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900")}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className={cn("text-[11px] font-bold block mb-1", isDark ? "text-zinc-400" : "text-slate-600")}>
                          Region & Datacenter
                        </label>
                        <input
                          type="text"
                          value={dbLimits.region}
                          onChange={(e) => setDbLimits({ ...dbLimits, region: e.target.value })}
                          placeholder="e.g. Sidoarjo"
                          className={cn("w-full border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-cyan-500", isDark ? "bg-white/[0.03] border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900")}
                        />
                      </div>
                      <div>
                        <label className={cn("text-[11px] font-bold block mb-1", isDark ? "text-zinc-400" : "text-slate-600")}>
                          Resource Pool Mode
                        </label>
                        <select
                          value={dbLimits.shared ? "shared" : "dedicated"}
                          onChange={(e) => setDbLimits({ ...dbLimits, shared: e.target.value === "shared" })}
                          className={cn("w-full border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-cyan-500", isDark ? "bg-[#0c0c0e] border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900")}
                        >
                          <option value="shared">Shared Multi-Tenant (Kubernetes)</option>
                          <option value="dedicated">Dedicated Kubernetes Worker Node</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className={cn("text-[11px] font-bold block mb-1.5", isDark ? "text-zinc-400" : "text-slate-600")}>
                        Supported Database Engines
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {["MySQL", "MariaDB", "PostgreSQL", "MongoDB"].map((eng) => {
                          const isChecked = dbLimits.engines.includes(eng);
                          return (
                            <button
                              type="button"
                              key={eng}
                              onClick={() => {
                                const newEngines = isChecked
                                  ? dbLimits.engines.filter(e => e !== eng)
                                  : [...dbLimits.engines, eng];
                                setDbLimits({ ...dbLimits, engines: newEngines });
                              }}
                              className={cn(
                                "px-3 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer",
                                isChecked
                                  ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-300"
                                  : isDark ? "bg-white/[0.02] border-white/[0.08] text-zinc-500" : "bg-white border-slate-200 text-slate-500"
                              )}
                            >
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              <span>{eng}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : formData.service === "APP" ? (
                  /* Form for Managed Apps */
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className={cn("text-[11px] font-bold block mb-1", isDark ? "text-zinc-400" : "text-slate-600")}>
                          CPU Allocation
                        </label>
                        <input
                          type="text"
                          value={appLimits.cpu}
                          onChange={(e) => setAppLimits({ ...appLimits, cpu: e.target.value })}
                          placeholder="e.g. 1 CPU or 2 vCPU"
                          className={cn("w-full border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-cyan-500", isDark ? "bg-white/[0.03] border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900")}
                        />
                      </div>
                      <div>
                        <label className={cn("text-[11px] font-bold block mb-1", isDark ? "text-zinc-400" : "text-slate-600")}>
                          RAM Allocation
                        </label>
                        <input
                          type="text"
                          value={appLimits.ram}
                          onChange={(e) => setAppLimits({ ...appLimits, ram: e.target.value })}
                          placeholder="e.g. 1.0 GB RAM"
                          className={cn("w-full border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-cyan-500", isDark ? "bg-white/[0.03] border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900")}
                        />
                      </div>
                      <div>
                        <label className={cn("text-[11px] font-bold block mb-1", isDark ? "text-zinc-400" : "text-slate-600")}>
                          Plan Code
                        </label>
                        <input
                          type="text"
                          value={appLimits.planCode}
                          onChange={(e) => setAppLimits({ ...appLimits, planCode: e.target.value })}
                          placeholder="e.g. 1C1G or 2C4G"
                          className={cn("w-full border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-cyan-500", isDark ? "bg-white/[0.03] border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900")}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className={cn("text-[11px] font-bold block mb-1", isDark ? "text-zinc-400" : "text-slate-600")}>
                          Storage (SSD)
                        </label>
                        <input
                          type="text"
                          value={appLimits.storage}
                          onChange={(e) => setAppLimits({ ...appLimits, storage: e.target.value })}
                          placeholder="e.g. 10 GB"
                          className={cn("w-full border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-cyan-500", isDark ? "bg-white/[0.03] border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900")}
                        />
                      </div>
                      <div>
                        <label className={cn("text-[11px] font-bold block mb-1", isDark ? "text-zinc-400" : "text-slate-600")}>
                          Region & Datacenter
                        </label>
                        <input
                          type="text"
                          value={appLimits.region}
                          onChange={(e) => setAppLimits({ ...appLimits, region: e.target.value })}
                          placeholder="e.g. Sidoarjo"
                          className={cn("w-full border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-cyan-500", isDark ? "bg-white/[0.03] border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900")}
                        />
                      </div>
                      <div>
                        <label className={cn("text-[11px] font-bold block mb-1", isDark ? "text-zinc-400" : "text-slate-600")}>
                          Resource Pool Mode
                        </label>
                        <div className={cn("w-full border rounded-lg px-3 py-2 text-xs font-semibold flex items-center", isDark ? "bg-white/[0.02] border-white/[0.08] text-zinc-300" : "bg-slate-50 border-slate-200 text-slate-700")}>
                          Shared Multi-Tenant (Kubernetes Pods)
                        </div>
                      </div>
                    </div>
                  </div>
                ) : formData.service === "CDN" ? (
                  /* Form for CDN */
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className={cn("text-[11px] font-bold block mb-1", isDark ? "text-zinc-400" : "text-slate-600")}>
                        Storage (GB)
                      </label>
                      <input
                        type="number"
                        value={cdnLimits.storageGB}
                        onChange={(e) => setCdnLimits({ ...cdnLimits, storageGB: e.target.value })}
                        className={cn("w-full border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-cyan-500", isDark ? "bg-white/[0.03] border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900")}
                      />
                    </div>
                    <div>
                      <label className={cn("text-[11px] font-bold block mb-1", isDark ? "text-zinc-400" : "text-slate-600")}>
                        Monthly Bandwidth (GB)
                      </label>
                      <input
                        type="number"
                        value={cdnLimits.transferGB}
                        onChange={(e) => setCdnLimits({ ...cdnLimits, transferGB: e.target.value })}
                        className={cn("w-full border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-cyan-500", isDark ? "bg-white/[0.03] border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900")}
                      />
                    </div>
                    <div>
                      <label className={cn("text-[11px] font-bold block mb-1", isDark ? "text-zinc-400" : "text-slate-600")}>
                        API Requests
                      </label>
                      <input
                        type="text"
                        value={cdnLimits.requests}
                        onChange={(e) => setCdnLimits({ ...cdnLimits, requests: e.target.value })}
                        placeholder="unlimited"
                        className={cn("w-full border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-cyan-500", isDark ? "bg-white/[0.03] border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900")}
                      />
                    </div>
                  </div>
                ) : (
                  /* Form for APIs */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={cn("text-[11px] font-bold block mb-1", isDark ? "text-zinc-400" : "text-slate-600")}>
                        Monthly Request Quota
                      </label>
                      <input
                        type="text"
                        value={apiLimits.requests}
                        onChange={(e) => setApiLimits({ ...apiLimits, requests: e.target.value })}
                        placeholder="e.g. 10000 or unlimited"
                        className={cn("w-full border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-cyan-500", isDark ? "bg-white/[0.03] border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900")}
                      />
                    </div>
                    <div>
                      <label className={cn("text-[11px] font-bold block mb-1", isDark ? "text-zinc-400" : "text-slate-600")}>
                        Rate Limit (requests / min)
                      </label>
                      <input
                        type="text"
                        value={apiLimits.rateLimit}
                        onChange={(e) => setApiLimits({ ...apiLimits, rateLimit: e.target.value })}
                        placeholder="e.g. 60"
                        className={cn("w-full border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-cyan-500", isDark ? "bg-white/[0.03] border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900")}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Checkboxes: Active & Popular */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-all", formData.isPopular ? "bg-amber-500 border-amber-500 text-slate-950" : isDark ? "border-zinc-600" : "border-slate-300")}>
                    {formData.isPopular && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className={cn("text-xs font-bold", isDark ? "text-zinc-300" : "text-slate-700")}>
                    Mark as Most Popular / Featured
                  </span>
                  <input
                    type="checkbox"
                    checked={formData.isPopular}
                    onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                    className="hidden"
                  />
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-all", formData.isActive ? "bg-emerald-500 border-emerald-500 text-slate-950" : isDark ? "border-zinc-600" : "border-slate-300")}>
                    {formData.isActive && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className={cn("text-xs font-bold", isDark ? "text-zinc-300" : "text-slate-700")}>
                    Plan is Active & Purchasable
                  </span>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Modal Footer Buttons */}
              <div className={cn("flex justify-end gap-3 pt-6 border-t", isDark ? "border-white/[0.08]" : "border-slate-200")}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={cn("px-4 py-2.5 rounded-xl font-semibold text-xs border transition-colors cursor-pointer", isDark ? "border-white/[0.08] text-zinc-300 hover:bg-white/5" : "border-slate-200 text-slate-700 hover:bg-slate-100")}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs disabled:opacity-50 transition-all flex items-center gap-2 bg-cyan-400 hover:bg-cyan-300 active:scale-95 text-slate-950 shadow-md cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{editingPlan ? "Save Changes" : "Create Plan"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !isDeleting && setDeleteConfirmId(null)} />
          <div className={cn("relative border rounded-2xl w-full max-w-md p-6 overflow-hidden shadow-2xl z-10", isDark ? "bg-[#0c0c0e] border-white/[0.1] text-white" : "bg-white border-slate-200 text-slate-900")}>
            <div className="flex flex-col items-center text-center">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-4 border", isDark ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-200 text-red-600")}>
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold mb-2">Delete Subscription Plan?</h3>
              <p className={cn("text-xs leading-relaxed mb-6", isDark ? "text-zinc-400" : "text-slate-500")}>
                Are you sure you want to permanently delete this plan? This action will remove the plan from public catalog and cleanly unlink active subscriptions.
              </p>

              <div className="flex w-full gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  disabled={isDeleting}
                  className={cn("flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 border", isDark ? "border-white/[0.08] text-zinc-300 hover:bg-white/5" : "border-slate-200 text-slate-700 hover:bg-slate-100")}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition-all flex justify-center items-center gap-2 cursor-pointer shadow-md"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : "Delete Plan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !isDeleting && setIsBulkDeleteModalOpen(false)} />
          <div className={cn("relative border rounded-2xl w-full max-w-md p-6 overflow-hidden shadow-2xl z-10", isDark ? "bg-[#0c0c0e] border-white/[0.1] text-white" : "bg-white border-slate-200 text-slate-900")}>
            <div className="flex flex-col items-center text-center">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-4 border", isDark ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-200 text-red-600")}>
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold mb-2">Delete {selectedIds.length} Plans?</h3>
              <p className={cn("text-xs leading-relaxed mb-6", isDark ? "text-zinc-400" : "text-slate-500")}>
                Are you sure you want to permanently delete {selectedIds.length} selected plans? This cannot be undone!
              </p>

              <div className="flex w-full gap-3">
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  disabled={isDeleting}
                  className={cn("flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 border", isDark ? "border-white/[0.08] text-zinc-300 hover:bg-white/5" : "border-slate-200 text-slate-700 hover:bg-slate-100")}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeBulkDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition-all flex justify-center items-center gap-2 cursor-pointer shadow-md"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : `Delete All (${selectedIds.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
