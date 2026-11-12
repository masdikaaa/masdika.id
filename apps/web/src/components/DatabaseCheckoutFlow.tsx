"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/billing";
import { toast } from "sonner";
import {
  Database, Check, Sparkles, Server, HardDrive,
  Cpu, Layers, ShieldCheck, Zap, AlertCircle, RefreshCw, Key, Eye, EyeOff, MapPin
} from "lucide-react";
import { SiMysql, SiPostgresql, SiMariadb, SiMongodb } from "react-icons/si";

const DATABASE_ENGINES = [
  {
    id: "MYSQL",
    name: "MySQL",
    icon: SiMysql,
    color: "text-[#00758F]",
    borderHover: "hover:border-[#00758F]/50",
    borderActive: "border-[#00758F]",
    bgActive: "bg-[#00758F]/10",
    desc: "The world's most popular open-source relational database. Great for web apps, CMS, and Laravel.",
    defaultPort: 3306,
    versions: [
      { id: "8.0", name: "8.0 (Recommended LTS)", default: true },
      { id: "8.4", name: "8.4 LTS" },
    ],
    webPanel: "phpMyAdmin",
  },
  {
    id: "MARIADB",
    name: "MariaDB",
    icon: SiMariadb,
    color: "text-[#C0765A]",
    borderHover: "hover:border-[#C0765A]/50",
    borderActive: "border-[#C0765A]",
    bgActive: "bg-[#C0765A]/10",
    desc: "Fast, drop-in replacement for MySQL created by the original developers with advanced storage engines.",
    defaultPort: 3306,
    versions: [
      { id: "10.11", name: "10.11 LTS (Recommended)", default: true },
      { id: "11.4", name: "11.4 LTS" },
    ],
    webPanel: "phpMyAdmin",
  },
  {
    id: "POSTGRES",
    name: "PostgreSQL",
    icon: SiPostgresql,
    color: "text-[#336791]",
    borderHover: "hover:border-[#336791]/50",
    borderActive: "border-[#336791]",
    bgActive: "bg-[#336791]/10",
    desc: "Advanced object-relational database known for reliability, robust feature set, and high concurrency.",
    defaultPort: 5432,
    versions: [
      { id: "16", name: "16.x Alpine (Latest)", default: true },
      { id: "15", name: "15.x Alpine" },
    ],
    webPanel: "pgAdmin 4",
  },
  {
    id: "MONGODB",
    name: "MongoDB",
    icon: SiMongodb,
    color: "text-[#47A248]",
    borderHover: "hover:border-[#47A248]/50",
    borderActive: "border-[#47A248]",
    bgActive: "bg-[#47A248]/10",
    desc: "Document-oriented NoSQL database designed for modern web apps, JSON storage, and flexible schemas.",
    defaultPort: 27017,
    versions: [
      { id: "7.0", name: "7.0 (Current)", default: true },
      { id: "6.0", name: "6.0 LTS" },
    ],
    webPanel: "Mongo Express",
  },
];

const FALLBACK_PLANS = [
  {
    id: 62,
    name: "Shared Database",
    service: "DATABASE",
    price: 20000,
    hourlyPrice: 28,
    shared: true,
    tier: "SHARED" as const,
    cpu: "500m Shared",
    ram: "1 GB RAM",
    storage: "10 GB NVMe",
    badge: "Shared Multi-Tenant",
    badgeColor: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    desc: "Isolated container runtime with burstable 500m shared compute. Ideal for small-to-medium web projects, Laravel, CMS, and staging."
  },
  {
    id: 64,
    name: "Dedicated Nano",
    service: "DATABASE",
    price: 25000,
    hourlyPrice: 35,
    shared: false,
    tier: "DEDICATED" as const,
    cpu: "500m Dedicated",
    ram: "1 GB RAM",
    storage: "10 GB NVMe",
    badge: "Dedicated Tier 1",
    badgeColor: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    desc: "Dedicated 500m CPU core with guaranteed memory. Great for personal projects, microservices, and lightweight databases."
  },
  {
    id: 65,
    name: "Dedicated Micro",
    service: "DATABASE",
    price: 45000,
    hourlyPrice: 62,
    shared: false,
    tier: "DEDICATED" as const,
    cpu: "1 vCPU (1000m)",
    ram: "2 GB RAM",
    storage: "15 GB NVMe",
    badge: "Dedicated Tier 2",
    badgeColor: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    desc: "Dedicated 1 vCPU with 2 GB RAM. Excellent for Laravel apps, WordPress, and growing web services."
  },
  {
    id: 66,
    name: "Dedicated Small",
    service: "DATABASE",
    price: 75000,
    hourlyPrice: 104,
    shared: false,
    tier: "DEDICATED" as const,
    cpu: "2 vCPU (2000m)",
    ram: "4 GB RAM",
    storage: "25 GB NVMe",
    badge: "Dedicated Tier 3",
    badgeColor: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    desc: "Dedicated 2 vCPU cores with 4 GB RAM. High throughput and caching for active web services."
  },
  {
    id: 67,
    name: "Dedicated Medium",
    service: "DATABASE",
    price: 110000,
    hourlyPrice: 153,
    shared: false,
    tier: "DEDICATED" as const,
    cpu: "3 vCPU (3000m)",
    ram: "6 GB RAM",
    storage: "40 GB NVMe",
    badge: "Dedicated Tier 4",
    badgeColor: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    desc: "Dedicated 3 vCPU cores with 6 GB RAM & 40 GB NVMe. Heavy read/write operations with zero lag."
  },
  {
    id: 68,
    name: "Dedicated Pro",
    service: "DATABASE",
    price: 150000,
    hourlyPrice: 208,
    shared: false,
    tier: "DEDICATED" as const,
    cpu: "4 vCPU (4000m)",
    ram: "8 GB RAM",
    storage: "60 GB NVMe",
    badge: "Full Host Capacity",
    badgeColor: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    desc: "Full dedicated VM host capacity (4 CPU, 8 GB RAM, 60 GB NVMe). Maximum performance and zero noisy neighbors."
  }
];

export default function DatabaseCheckoutFlow() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();

  // Selection states
  const [selectedEngine, setSelectedEngine] = useState("MYSQL");
  const [selectedVersion, setSelectedVersion] = useState("8.0");
  const [selectedTier, setSelectedTier] = useState<"SHARED" | "DEDICATED">("SHARED");
  const [plans, setPlans] = useState<any[]>(FALLBACK_PLANS);
  const [selectedPlanId, setSelectedPlanId] = useState<number>(62);
  const [instanceName, setInstanceName] = useState("");
  const [customDbName, setCustomDbName] = useState("");
  const [customUsername, setCustomUsername] = useState("");
  const [customPassword, setCustomPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleEngineChange = (engineId: string) => {
    setSelectedEngine(engineId);
    const eng = DATABASE_ENGINES.find(e => e.id === engineId);
    if (eng && eng.versions.length > 0) {
      const def = eng.versions.find(v => v.default) || eng.versions[0];
      setSelectedVersion(def.id);
    }
  };

  useEffect(() => {
    // 1. Fetch user balance
    fetch("/api/user/billing")
      .then(res => res.json())
      .then(data => {
        if (data.data?.balance !== undefined) {
          setUserBalance(data.data.balance);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingBalance(false));

    // 2. Fetch live plans from database (includes any custom plans created by admin)
    fetch("/api/public/plans")
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          const dbCatalogPlans = data.data
            .filter((p: any) => p.service === "DATABASE")
            .map((p: any) => {
              let limits: any = {};
              try {
                limits = typeof p.limits === "string" ? JSON.parse(p.limits) : p.limits || {};
              } catch {
                limits = {};
              }
              const isShared = limits.shared !== false && !limits.tier?.toUpperCase().includes("DEDICATED");
              return {
                id: p.id,
                name: p.name,
                service: p.service,
                price: p.price,
                hourlyPrice: p.hourlyPrice || Math.ceil(p.price / 720),
                shared: isShared,
                tier: isShared ? ("SHARED" as const) : ("DEDICATED" as const),
                cpu: limits.cpu || (isShared ? "0.5 vCPU" : "1 vCPU"),
                ram: limits.ram || (isShared ? "1 GB RAM" : "2 GB RAM"),
                storage: limits.storage || "10 GB NVMe",
                badge: isShared ? "Shared Multi-Tenant" : "Dedicated Resources",
                badgeColor: isShared ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" : "bg-purple-500/15 text-purple-300 border-purple-500/30",
                desc: p.description || (isShared ? "Isolated container runtime with burstable compute." : "Dedicated CPU and RAM capacity.")
              };
            });

          if (dbCatalogPlans.length > 0) {
            setPlans(dbCatalogPlans);
            // Default to first shared plan
            const firstShared = dbCatalogPlans.find((p: any) => p.shared);
            if (firstShared) setSelectedPlanId(firstShared.id);
          }
        }
      })
      .catch(() => {});
  }, []);

  const sharedPlans = plans.filter(p => p.shared);
  const dedicatedPlans = plans.filter(p => !p.shared);

  // Switch tier and auto-select appropriate plan
  const handleTierSwitch = (tier: "SHARED" | "DEDICATED") => {
    setSelectedTier(tier);
    if (tier === "SHARED") {
      const first = sharedPlans[0] || plans[0];
      if (first) setSelectedPlanId(first.id);
    } else {
      const first = dedicatedPlans[0] || plans[0];
      if (first) setSelectedPlanId(first.id);
    }
  };

  const currentPlan = plans.find(p => p.id === selectedPlanId) || plans[0] || FALLBACK_PLANS[0];
  const currentEngineMeta = DATABASE_ENGINES.find(e => e.id === selectedEngine) || DATABASE_ENGINES[0];
  const requiredUpfront = currentPlan.hourlyPrice;

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!instanceName.trim()) {
      toast.error("Please provide an instance name");
      return;
    }

    if (userBalance < requiredUpfront) {
      toast.error(`Insufficient balance. ${currentPlan.name} requires at least ${formatRupiah(requiredUpfront)} (1 hour PAYG) balance.`);
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading(`Provisioning ${currentPlan.name} on K3s cluster...`);

    try {
      const res = await fetch("/api/user/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: instanceName.trim(),
          type: selectedEngine,
          version: selectedVersion,
          tier: currentPlan.tier,
          planId: currentPlan.id,
          planName: currentPlan.name,
          billingMode: "PAYG",
          customDbName: customDbName.trim() || undefined,
          customUsername: customUsername.trim() || undefined,
          customPassword: customPassword.trim() || undefined,
        })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success("Database deployed successfully!", { id: toastId });
        router.push(`/dashboard/database/${json.data.id}`);
      } else {
        toast.error(json.error || "Failed to deploy database", { id: toastId });
      }
    } catch {
      toast.error("Connection error while deploying database", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleDeploy} className="space-y-6 w-full max-w-full min-w-0">
      {/* Step 1: Database Engine Selector */}
      <div className={cn("rounded-2xl border p-5 sm:p-6 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className={cn("text-[11px] font-bold uppercase tracking-wider block", isDark ? "text-cyan-400" : "text-cyan-700")}>
              STEP 1
            </span>
            <h2 className={cn("text-base sm:text-lg font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Select Database Engine
            </h2>
          </div>
          <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-800 border-cyan-200")}>
            K3s Container Native
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {DATABASE_ENGINES.map((engine) => {
            const EngineIcon = engine.icon;
            const isSelected = selectedEngine === engine.id;

            return (
              <button
                type="button"
                key={engine.id}
                onClick={() => handleEngineChange(engine.id)}
                className={cn(
                  "rounded-2xl border p-5 text-left transition-all relative flex flex-col justify-between cursor-pointer",
                  isSelected
                    ? `${engine.borderActive} ${isDark ? engine.bgActive : "bg-slate-50"} ring-1 ring-cyan-500/30 shadow-md`
                    : isDark
                      ? "border-white/[0.08] bg-[#0a0a0c] hover:border-white/20"
                      : "border-slate-200 bg-white hover:border-slate-300 shadow-2xs"
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center", isDark ? "bg-white/[0.04] border-white/[0.08]" : "bg-slate-100 border-slate-200")}>
                      <EngineIcon className={cn("w-6 h-6", engine.color)} />
                    </div>
                    <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center transition-all", isSelected ? "bg-cyan-500 border-cyan-500 text-slate-950" : isDark ? "border-zinc-700" : "border-slate-300")}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  <h3 className={cn("text-base font-bold mb-1", isDark ? "text-white" : "text-slate-900")}>
                    {engine.name}
                  </h3>
                  <p className={cn("text-xs leading-relaxed line-clamp-3", isDark ? "text-zinc-400" : "text-slate-500")}>
                    {engine.desc}
                  </p>
                </div>

                <div className={cn("pt-4 mt-4 border-t flex items-center justify-between text-[11px]", isDark ? "border-white/[0.06]" : "border-slate-100")}>
                  <span className={cn("font-medium", isDark ? "text-zinc-500" : "text-slate-400")}>
                    Web GUI:
                  </span>
                  <span className={cn("font-bold", isDark ? "text-zinc-300" : "text-slate-700")}>
                    {engine.webPanel || "Direct / CLI"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Version & Region Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Version Selection */}
        <div className={cn("rounded-2xl border p-5 sm:p-6 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
          <span className={cn("text-[11px] font-bold uppercase tracking-wider block mb-1", isDark ? "text-cyan-400" : "text-cyan-700")}>
            STEP 2
          </span>
          <h2 className={cn("text-base sm:text-lg font-bold tracking-tight mb-4", isDark ? "text-white" : "text-slate-900")}>
            Select {currentEngineMeta.name} Version
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentEngineMeta.versions.map((ver) => {
              const isSelected = selectedVersion === ver.id;
              return (
                <button
                  type="button"
                  key={ver.id}
                  onClick={() => setSelectedVersion(ver.id)}
                  className={cn(
                    "p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer",
                    isSelected
                      ? "bg-cyan-500/15 border-cyan-500 text-cyan-300 font-bold"
                      : isDark
                        ? "bg-[#0a0a0c] border-white/[0.08] text-zinc-300 hover:border-white/20"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <span className="text-sm font-semibold">{ver.name}</span>
                  <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center shrink-0", isSelected ? "bg-cyan-500 border-cyan-500 text-slate-950" : isDark ? "border-zinc-700" : "border-slate-300")}>
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Region & Datacenter */}
        <div className={cn("rounded-2xl border p-5 sm:p-6 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
          <span className={cn("text-[11px] font-bold uppercase tracking-wider block mb-1", isDark ? "text-cyan-400" : "text-cyan-700")}>
            STEP 3
          </span>
          <h2 className={cn("text-base sm:text-lg font-bold tracking-tight mb-4", isDark ? "text-white" : "text-slate-900")}>
            Datacenter & Region
          </h2>

          <div className={cn("p-4 rounded-xl border flex items-center justify-between", isDark ? "bg-cyan-500/10 border-cyan-500/30" : "bg-cyan-50 border-cyan-200")}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>
                    Sidoarjo, Jawa Timur (ID-SDA)
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </div>
                <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-slate-600")}>
                  Direct BGP Peering, ultra-low latency &lt; 5ms local ping.
                </p>
              </div>
            </div>
            <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold border", isDark ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-emerald-100 text-emerald-800 border-emerald-200")}>
              Active
            </span>
          </div>
        </div>
      </div>

      {/* Step 4: Hardware Resource Plan (Shared vs Dedicated Selection) */}
      <div className={cn("rounded-2xl border p-5 sm:p-6 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <span className={cn("text-[11px] font-bold uppercase tracking-wider block", isDark ? "text-cyan-400" : "text-cyan-700")}>
              STEP 4
            </span>
            <h2 className={cn("text-base sm:text-lg font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Choose Architecture & Resource Plan
            </h2>
          </div>

          {/* Architecture Switcher */}
          <div className={cn("inline-flex p-1 rounded-xl border self-start sm:self-auto", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-100 border-slate-200")}>
            <button
              type="button"
              onClick={() => handleTierSwitch("SHARED")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                selectedTier === "SHARED"
                  ? "bg-cyan-500 text-slate-950 shadow-xs"
                  : isDark ? "text-zinc-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <span>Shared Multi-Tenant</span>
              <span className={cn("px-1.5 py-0.2 rounded text-[10px] font-extrabold", selectedTier === "SHARED" ? "bg-cyan-900/30 text-slate-950" : isDark ? "bg-white/10 text-zinc-300" : "bg-slate-200 text-slate-700")}>
                {sharedPlans.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleTierSwitch("DEDICATED")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                selectedTier === "DEDICATED"
                  ? "bg-purple-500 text-white shadow-xs"
                  : isDark ? "text-zinc-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
              )}
            >
              <span>Dedicated Host Resources</span>
              <span className={cn("px-1.5 py-0.2 rounded text-[10px] font-extrabold", selectedTier === "DEDICATED" ? "bg-purple-900/30 text-white" : isDark ? "bg-white/10 text-zinc-300" : "bg-slate-200 text-slate-700")}>
                {dedicatedPlans.length}
              </span>
            </button>
          </div>
        </div>

        {/* Selected Tier Banner Description */}
        <div className={cn("p-3.5 rounded-xl border mb-5 flex items-center justify-between text-xs", selectedTier === "SHARED" ? (isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-200" : "bg-cyan-50 border-cyan-200 text-cyan-800") : (isDark ? "bg-purple-500/10 border-purple-500/20 text-purple-200" : "bg-purple-50 border-purple-200 text-purple-800"))}>
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded border border-current">
              {selectedTier === "SHARED" ? "Burstable Shared Pool" : "Isolated Dedicated Hardware"}
            </span>
            <span>
              {selectedTier === "SHARED"
                ? "Optimal cost efficiency for personal apps, testing, and microservices with noisy-neighbor isolation."
                : "Guaranteed CPU cores & memory limits provisioned directly into Kubernetes pods with zero resource contention."}
            </span>
          </div>
        </div>

        {/* Plan Cards Grid */}
        <div className={cn("grid gap-4", selectedTier === "SHARED" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3")}>
          {(selectedTier === "SHARED" ? sharedPlans : dedicatedPlans).map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            return (
              <button
                type="button"
                key={plan.id}
                onClick={() => {
                  setSelectedPlanId(plan.id);
                  setSelectedTier(plan.tier);
                }}
                className={cn(
                  "rounded-2xl border p-5 text-left transition-all relative flex flex-col justify-between cursor-pointer",
                  isSelected
                    ? plan.shared
                      ? "border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500/30 shadow-md"
                      : "border-purple-500 bg-purple-500/10 ring-1 ring-purple-500/30 shadow-md"
                    : isDark
                      ? "border-white/[0.08] bg-[#0a0a0c] hover:border-white/20"
                      : "border-slate-200 bg-white hover:border-slate-300 shadow-2xs"
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-md border", plan.badgeColor)}>
                      {plan.badge}
                    </span>
                    <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center transition-all", isSelected ? (plan.shared ? "bg-cyan-500 border-cyan-500 text-slate-950" : "bg-purple-500 border-purple-500 text-slate-950") : isDark ? "border-zinc-700" : "border-slate-300")}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  <h3 className={cn("text-base font-bold mb-1", isDark ? "text-white" : "text-slate-900")}>
                    {plan.name}
                  </h3>
                  <p className={cn("text-xs leading-relaxed mb-4 line-clamp-2", isDark ? "text-zinc-400" : "text-slate-500")}>
                    {plan.desc}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 mb-4">
                    <span className={cn("px-2 py-0.5 rounded-lg text-xs font-semibold border flex items-center gap-1", isDark ? "bg-white/[0.03] text-zinc-300 border-white/[0.08]" : "bg-slate-100 text-slate-700 border-slate-200")}>
                      <Cpu className="w-3 h-3 text-cyan-400" /> {plan.cpu}
                    </span>
                    <span className={cn("px-2 py-0.5 rounded-lg text-xs font-semibold border flex items-center gap-1", isDark ? "bg-white/[0.03] text-zinc-300 border-white/[0.08]" : "bg-slate-100 text-slate-700 border-slate-200")}>
                      <Layers className="w-3 h-3 text-purple-400" /> {plan.ram}
                    </span>
                    <span className={cn("px-2 py-0.5 rounded-lg text-xs font-semibold border flex items-center gap-1", isDark ? "bg-white/[0.03] text-zinc-300 border-white/[0.08]" : "bg-slate-100 text-slate-700 border-slate-200")}>
                      <HardDrive className="w-3 h-3 text-amber-400" /> {plan.storage}
                    </span>
                  </div>
                </div>

                <div className={cn("pt-4 border-t flex items-baseline justify-between", isDark ? "border-white/[0.06]" : "border-slate-100")}>
                  <div>
                    <span className={cn("text-lg font-black", plan.shared ? (isDark ? "text-cyan-400" : "text-cyan-700") : (isDark ? "text-purple-400" : "text-purple-700"))}>
                      {formatRupiah(plan.price)}
                    </span>
                    <span className={cn("text-xs ml-1", isDark ? "text-zinc-500" : "text-slate-400")}>/bln</span>
                  </div>
                  <span className={cn("text-xs font-bold", isDark ? "text-zinc-300" : "text-slate-600")}>
                    ~{formatRupiah(plan.hourlyPrice)} / jam (PAYG)
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 5: Database Instance Details */}
      <div className={cn("rounded-2xl border p-5 sm:p-6 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
        <span className={cn("text-[11px] font-bold uppercase tracking-wider block mb-1", isDark ? "text-cyan-400" : "text-cyan-700")}>
          STEP 5
        </span>
        <h2 className={cn("text-base sm:text-lg font-bold tracking-tight mb-4", isDark ? "text-white" : "text-slate-900")}>
          Instance Configuration & Credentials
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={cn("text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-600")}>
              Instance Display Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
              placeholder="e.g. production-crm-database"
              className={cn("w-full border rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#0a0a0c] border-white/[0.08] text-white placeholder:text-zinc-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
            />
          </div>

          <div className="space-y-1.5">
            <label className={cn("text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-600")}>
              Initial Database Name (Optional)
            </label>
            <input
              type="text"
              value={customDbName}
              onChange={(e) => setCustomDbName(e.target.value)}
              placeholder="Leave blank to auto-generate"
              className={cn("w-full border rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#0a0a0c] border-white/[0.08] text-white placeholder:text-zinc-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
            />
          </div>

          <div className="space-y-1.5">
            <label className={cn("text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-600")}>
              Database Username (Optional)
            </label>
            <input
              type="text"
              value={customUsername}
              onChange={(e) => setCustomUsername(e.target.value)}
              placeholder="Leave blank to auto-generate"
              className={cn("w-full border rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#0a0a0c] border-white/[0.08] text-white placeholder:text-zinc-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
            />
          </div>

          <div className="space-y-1.5">
            <label className={cn("text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-600")}>
              Custom Password (Optional)
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
                placeholder="Leave blank to auto-generate securely"
                className={cn("w-full border rounded-xl px-3.5 py-2.5 pr-10 text-sm font-mono focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#0a0a0c] border-white/[0.08] text-white placeholder:text-zinc-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={cn("absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white")}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Step 6: Confirmation & Deploy Button */}
      <div className={cn("rounded-2xl border p-5 sm:p-6 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-xs")}>
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center shrink-0", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={cn("text-xs font-semibold", isDark ? "text-zinc-400" : "text-slate-500")}>
                Your Balance:
              </span>
              <span className={cn("font-bold text-sm", userBalance >= requiredUpfront ? (isDark ? "text-emerald-400" : "text-emerald-700") : "text-red-500")}>
                {loadingBalance ? "..." : formatRupiah(userBalance)}
              </span>
              <span className={cn("text-[11px] px-2 py-0.5 rounded font-bold border", isDark ? "bg-white/[0.04] text-zinc-300 border-white/[0.08]" : "bg-slate-100 text-slate-700 border-slate-200")}>
                Need: {formatRupiah(requiredUpfront)}
              </span>
            </div>
            <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-500" : "text-slate-400")}>
              Selected: <strong className={isDark ? "text-white" : "text-slate-900"}>{currentPlan.name}</strong> • 1st hr PAYG: {formatRupiah(requiredUpfront)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {userBalance < requiredUpfront && (
            <Link
              href="/dashboard/topup"
              className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all"
            >
              Top Up Balance
            </Link>
          )}
          <button
            type="submit"
            disabled={submitting || userBalance < requiredUpfront}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs bg-cyan-400 hover:bg-cyan-300 active:scale-95 text-slate-950 transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Provisioning {currentPlan.name}...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-current" />
                <span>Deploy {currentPlan.name}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
