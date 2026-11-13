"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/billing";
import { toast } from "sonner";
import {
  Database, Check, Server, HardDrive,
  Cpu, Layers, ShieldCheck, Zap, RefreshCw, Eye, EyeOff, MapPin, Sparkles, CheckCircle2, Loader2
} from "lucide-react";
import { SiMysql, SiPostgresql, SiMariadb, SiMongodb } from "react-icons/si";

// Dedicated database engines & versions
const DATABASE_ENGINES = [
  {
    id: "POSTGRES",
    name: "PostgreSQL",
    icon: SiPostgresql,
    color: "text-[#336791]",
    defaultPort: 5432,
    versions: [
      { id: "16", name: "16 LTS", default: true },
      { id: "17", name: "17 (Latest)" },
      { id: "15", name: "15 LTS" },
    ],
    webPanel: "pgAdmin 4",
  },
  {
    id: "MYSQL",
    name: "MySQL",
    icon: SiMysql,
    color: "text-[#00758F]",
    defaultPort: 3306,
    versions: [
      { id: "8.0", name: "8.0 LTS", default: true },
      { id: "8.4", name: "8.4 LTS" },
    ],
    webPanel: "phpMyAdmin",
  },
  {
    id: "MARIADB",
    name: "MariaDB",
    icon: SiMariadb,
    color: "text-[#C0765A]",
    defaultPort: 3306,
    versions: [
      { id: "10.11", name: "10.11 LTS", default: true },
      { id: "11.4", name: "11.4 LTS" },
    ],
    webPanel: "phpMyAdmin",
  },
  {
    id: "MONGODB",
    name: "MongoDB",
    icon: SiMongodb,
    color: "text-[#47A248]",
    defaultPort: 27017,
    versions: [
      { id: "7.0", name: "7.0 (Current)", default: true },
      { id: "6.0", name: "6.0 LTS" },
    ],
    webPanel: "Mongo Express",
  },
];

// Dedicated Flavors matching SumoPod (Gambar 1)
const DEDICATED_FLAVORS = [
  { id: "flavor-1vcpu-1gb", vcpu: "1 vCPU", ram: "1 GB", price: 30000, hourlyPrice: 42, isOutOfStock: false, planName: "Dedicated 1 vCPU / 1 GB" },
  { id: "flavor-1vcpu-2gb", vcpu: "1 vCPU", ram: "2 GB", price: 45000, hourlyPrice: 62, isOutOfStock: false, planName: "Dedicated 1 vCPU / 2 GB" },
  { id: "flavor-2vcpu-2gb", vcpu: "2 vCPU", ram: "2 GB", price: 55000, hourlyPrice: 76, isOutOfStock: false, planName: "Dedicated 2 vCPU / 2 GB" },
  { id: "flavor-2vcpu-4gb", vcpu: "2 vCPU", ram: "4 GB", price: 150000, hourlyPrice: 208, isOutOfStock: false, planName: "Dedicated 2 vCPU / 4 GB" },
  { id: "flavor-2vcpu-8gb", vcpu: "2 vCPU", ram: "8 GB", price: 250000, hourlyPrice: 347, isOutOfStock: false, planName: "Dedicated 2 vCPU / 8 GB" },
  { id: "flavor-4vcpu-8gb", vcpu: "4 vCPU", ram: "8 GB", price: 400000, hourlyPrice: 555, isOutOfStock: false, planName: "Dedicated 4 vCPU / 8 GB" },
];

// Shared Database Variants grouped by Engine (matching Gambar 2 Dedicated Engine style)
const SHARED_DATABASE_VARIANTS: Record<string, Array<{
  id: string;
  name: string;
  version: string;
  engine: string;
  ratePerGb: number;
  badge?: string;
  default?: boolean;
}>> = {
  POSTGRES: [
    { id: "postgres-16", name: "16 LTS", version: "16", engine: "POSTGRES", ratePerGb: 10000, default: true },
    { id: "postgres-17", name: "17 (Latest)", version: "17", engine: "POSTGRES", ratePerGb: 10000 },
    { id: "postgres-15", name: "15 LTS", version: "15", engine: "POSTGRES", ratePerGb: 10000 },
    { id: "postgres-postgis", name: "16 + PostGIS", version: "16", engine: "POSTGRES", ratePerGb: 12500, badge: "GIS" },
    { id: "postgres-vector", name: "16 + pgvector", version: "16", engine: "POSTGRES", ratePerGb: 12500, badge: "AI" },
    { id: "postgres-full", name: "16 + PostGIS + pgvector", version: "16", engine: "POSTGRES", ratePerGb: 15000, badge: "Full" },
  ],
  MYSQL: [
    { id: "mysql-8", name: "8.0 LTS", version: "8.0", engine: "MYSQL", ratePerGb: 10000, default: true },
    { id: "mysql-8.4", name: "8.4 LTS", version: "8.4", engine: "MYSQL", ratePerGb: 10000 },
  ],
  MARIADB: [
    { id: "mariadb-11", name: "10.11 LTS", version: "10.11", engine: "MARIADB", ratePerGb: 10000, default: true },
    { id: "mariadb-11.4", name: "11.4 LTS", version: "11.4", engine: "MARIADB", ratePerGb: 10000 },
  ],
  MONGODB: [
    { id: "mongo-7", name: "7.0 (Current)", version: "7.0", engine: "MONGODB", ratePerGb: 10000, default: true },
    { id: "mongo-6", name: "6.0 LTS", version: "6.0", engine: "MONGODB", ratePerGb: 10000 },
  ],
};

const ALL_SHARED_VARIANTS = Object.values(SHARED_DATABASE_VARIANTS).flat();

const STORAGE_PRESETS = [1, 2, 5, 10, 15, 20];

export default function DatabaseCheckoutFlow() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();

  // Tier switcher: DEDICATED (Gambar 1) vs SHARED (Gambar 2)
  const [selectedTier, setSelectedTier] = useState<"DEDICATED" | "SHARED">("DEDICATED");

  // Dedicated states
  const [selectedEngine, setSelectedEngine] = useState("POSTGRES");
  const [selectedVersion, setSelectedVersion] = useState("16");
  const [selectedFlavorId, setSelectedFlavorId] = useState("flavor-1vcpu-2gb");

  // Shared states
  const [selectedSharedEngine, setSelectedSharedEngine] = useState("POSTGRES");
  const [selectedSharedId, setSelectedSharedId] = useState("postgres-16");

  // Universal Storage scale bar (Min 1 GB, Max 20 GB)
  const [storageGb, setStorageGb] = useState<number>(1);

  // Configuration form fields
  const [instanceName, setInstanceName] = useState("");
  const [customDbName, setCustomDbName] = useState("");
  const [customUsername, setCustomUsername] = useState("");
  const [customPassword, setCustomPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // User balance & submission state
  const [userBalance, setUserBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Catalog plans mapping for API submission
  const [catalogPlans, setCatalogPlans] = useState<any[]>([]);

  useEffect(() => {
    // Fetch user balance
    fetch("/api/user/billing")
      .then((res) => res.json())
      .then((data) => {
        if (data.data?.balance !== undefined) {
          setUserBalance(data.data.balance);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingBalance(false));

    // Fetch official plans from DB
    fetch("/api/public/plans")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setCatalogPlans(data.data.filter((p: any) => p.service === "DATABASE"));
        }
      })
      .catch(() => {});
  }, []);

  const handleEngineChange = (engineId: string) => {
    setSelectedEngine(engineId);
    const eng = DATABASE_ENGINES.find((e) => e.id === engineId);
    if (eng && eng.versions.length > 0) {
      const def = eng.versions.find((v) => v.default) || eng.versions[0];
      setSelectedVersion(def.id);
    }
  };

  const handleSharedEngineChange = (engineId: string) => {
    setSelectedSharedEngine(engineId);
    const variants = SHARED_DATABASE_VARIANTS[engineId] || [];
    if (variants.length > 0) {
      const def = variants.find((v) => v.default) || variants[0];
      setSelectedSharedId(def.id);
    }
  };

  // Calculations for Dedicated (Gambar 1)
  const activeFlavor = DEDICATED_FLAVORS.find((f) => f.id === selectedFlavorId) || DEDICATED_FLAVORS[1];
  const activeEngineMeta = DATABASE_ENGINES.find((e) => e.id === selectedEngine) || DATABASE_ENGINES[0];
  const dedicatedStorageCost = storageGb * 5000;
  const dedicatedTotalMonthly = activeFlavor.price + dedicatedStorageCost;
  const dedicatedHourlyRate = Math.max(1, Math.ceil(dedicatedTotalMonthly / 720));

  // Calculations for Shared (Gambar 2 Dedicated-style Engine & Version selector)
  const activeSharedEngineMeta = DATABASE_ENGINES.find((e) => e.id === selectedSharedEngine) || DATABASE_ENGINES[0];
  const activeSharedType = ALL_SHARED_VARIANTS.find((s) => s.id === selectedSharedId) || ALL_SHARED_VARIANTS[0];
  const currentSharedVariants = SHARED_DATABASE_VARIANTS[selectedSharedEngine] || [];
  const sharedStorageCost = storageGb * activeSharedType.ratePerGb;
  const sharedTotalMonthly = sharedStorageCost;
  const sharedHourlyRate = Math.max(1, Math.ceil(sharedTotalMonthly / 720));

  // Overall selection totals
  const currentTotalMonthly = selectedTier === "DEDICATED" ? dedicatedTotalMonthly : sharedTotalMonthly;
  const currentHourlyRate = selectedTier === "DEDICATED" ? dedicatedHourlyRate : sharedHourlyRate;
  const requiredUpfront = currentHourlyRate;

  // Resolve DB Plan for submission
  const matchedPlan = catalogPlans.find((p) => {
    if (selectedTier === "SHARED") return p.name.toLowerCase().includes("shared");
    return p.name === activeFlavor.planName;
  });

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!instanceName.trim()) {
      toast.error("Please enter a database instance name");
      return;
    }

    if (!/^[a-zA-Z0-9_\-\.\s]{2,50}$/.test(instanceName.trim())) {
      toast.error("Instance name can only contain letters, numbers, spaces, dots, hyphens, and underscores (2-50 characters).");
      return;
    }

    if (customDbName.trim() && !/^[a-zA-Z][a-zA-Z0-9_]{1,31}$/.test(customDbName.trim())) {
      toast.error("Database name must start with a letter and contain only alphanumeric characters and underscores (2-32 characters).");
      return;
    }

    if (customUsername.trim() && !/^[a-zA-Z][a-zA-Z0-9_]{1,31}$/.test(customUsername.trim())) {
      toast.error("Username must start with a letter and contain only alphanumeric characters and underscores (2-32 characters).");
      return;
    }

    const reservedUsers = ["root", "admin", "administrator", "postgres", "mysql", "system", "sys"];
    if (customUsername.trim() && reservedUsers.includes(customUsername.trim().toLowerCase())) {
      toast.error(`Username cannot be a reserved user (${reservedUsers.join(", ")}).`);
      return;
    }

    if (customPassword.trim()) {
      if (customPassword.trim().length < 8) {
        toast.error("Password must be at least 8 characters.");
        return;
      }
      if (!/^[a-zA-Z0-9@#%^+=_\-\.]{8,64}$/.test(customPassword.trim())) {
        toast.error("Password can only contain letters, numbers, and safe symbols (@#%^+=_-.). Quotes and shell metacharacters are disallowed.");
        return;
      }
    }

    if (userBalance < requiredUpfront) {
      toast.error(`Insufficient balance. Requires at least ${formatRupiah(requiredUpfront)} (1 hour PAYG) balance.`);
      return;
    }

    setSubmitting(true);
    const deployName = selectedTier === "DEDICATED"
      ? `${activeFlavor.planName} (${storageGb} GB)`
      : `Shared ${activeSharedEngineMeta.name} ${activeSharedType.name} (${storageGb} GB)`;
    const toastId = toast.loading(`Provisioning ${deployName} on Kubernetes...`);

    try {
      const res = await fetch("/api/user/database", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: instanceName.trim(),
          type: selectedTier === "DEDICATED" ? selectedEngine : activeSharedType.engine,
          version: selectedTier === "DEDICATED" ? selectedVersion : activeSharedType.version,
          tier: selectedTier,
          planId: matchedPlan?.id,
          planName: selectedTier === "DEDICATED" ? activeFlavor.planName : `Shared ${activeSharedEngineMeta.name} ${activeSharedType.name}`,
          storageGb,
          ratePerGb: selectedTier === "SHARED" ? activeSharedType.ratePerGb : undefined,
          billingMode: "PAYG",
          customDbName: customDbName.trim() || undefined,
          customUsername: customUsername.trim() || undefined,
          customPassword: customPassword.trim() || undefined,
        }),
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
      {/* Top Architecture Mode Selector */}
      <div className={cn("p-1.5 rounded-2xl border flex items-center justify-between gap-3 flex-wrap w-full max-w-full min-w-0", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-100 border-slate-200")}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedTier("DEDICATED")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2",
              selectedTier === "DEDICATED"
                ? "bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20"
                : isDark ? "text-zinc-400 hover:text-white hover:bg-white/[0.04]" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            )}
          >
            <Server className="w-4 h-4" />
            <span>Dedicated Host Resources</span>
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-extrabold uppercase", selectedTier === "DEDICATED" ? "bg-slate-950/20 text-slate-950" : isDark ? "bg-white/5 text-zinc-400" : "bg-slate-200 text-slate-700")}>
              6 Flavors
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTier("SHARED")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2",
              selectedTier === "SHARED"
                ? "bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20"
                : isDark ? "text-zinc-400 hover:text-white hover:bg-white/[0.04]" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            )}
          >
            <Database className="w-4 h-4" />
            <span>Shared Multi-Tenant</span>
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-extrabold uppercase", selectedTier === "SHARED" ? "bg-slate-950/20 text-slate-950" : isDark ? "bg-white/5 text-zinc-400" : "bg-slate-200 text-slate-700")}>
              Per-GB Storage
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium px-3 text-zinc-400">
          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
          <span>Region: Sidoarjo (K3s Cluster)</span>
        </div>
      </div>

      {/* Main Grid: Left Options (2 col) + Right Sticky Summary (1 col) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full max-w-full min-w-0 items-start">
        {/* Left Column (2 cols): Options & Sliders */}
        <div className="xl:col-span-2 space-y-6 w-full max-w-full min-w-0">

          {/* DEDICATED MODE (Gambar 1) */}
          {selectedTier === "DEDICATED" && (
            <>
              {/* Step 1: Engine & Version */}
              <div className={cn("rounded-2xl border p-5 sm:p-6 transition-all w-full max-w-full min-w-0", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-xs")}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className={cn("text-base sm:text-lg font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                      Select Database Engine
                    </h2>
                    <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                      Dedicated container with isolated resources & web GUI viewer
                    </p>
                  </div>
                  <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full border", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
                    K8s Native
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {DATABASE_ENGINES.map((engine) => {
                    const EngineIcon = engine.icon;
                    const isSelected = selectedEngine === engine.id;
                    return (
                      <button
                        type="button"
                        key={engine.id}
                        onClick={() => handleEngineChange(engine.id)}
                        className={cn(
                          "rounded-xl border p-3.5 text-left transition-all cursor-pointer flex items-center gap-3",
                          isSelected
                            ? "border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500/40 shadow-xs text-white"
                            : isDark
                              ? "border-white/[0.08] bg-[#0c0c0e] hover:border-white/20 hover:bg-white/[0.02]"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                        )}
                      >
                        <div className={cn("w-9 h-9 rounded-lg border flex items-center justify-center shrink-0", isDark ? "bg-white/[0.04] border-white/[0.08]" : "bg-slate-100 border-slate-200")}>
                          <EngineIcon className={cn("w-5 h-5", engine.color)} />
                        </div>
                        <div className="min-w-0">
                          <span className={cn("text-sm font-bold block truncate", isDark ? "text-white" : "text-slate-900")}>
                            {engine.name}
                          </span>
                          <span className={cn("text-[11px] block truncate", isDark ? "text-zinc-500" : "text-slate-400")}>
                            {engine.webPanel}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Version Selector for Active Engine */}
                <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
                  <span className={cn("text-xs font-semibold", isDark ? "text-zinc-400" : "text-slate-600")}>Version:</span>
                  <div className="flex flex-wrap gap-2">
                    {activeEngineMeta.versions.map((ver) => (
                      <button
                        type="button"
                        key={ver.id}
                        onClick={() => setSelectedVersion(ver.id)}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border",
                          selectedVersion === ver.id
                            ? "bg-cyan-400 text-slate-950 border-cyan-400 font-bold shadow-xs"
                            : isDark
                              ? "bg-white/[0.03] text-zinc-400 border-white/[0.08] hover:text-white hover:bg-white/[0.06]"
                              : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                        )}
                      >
                        {ver.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 2: Select Flavor (SumoPod Style Table Gambar 1) */}
              <div className={cn("rounded-2xl border p-5 sm:p-6 transition-all w-full max-w-full min-w-0", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-xs")}>
                <div className="mb-4">
                  <h2 className={cn("text-base sm:text-lg font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                    Select Flavor
                  </h2>
                  <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                    Reserved vCPU & RAM for this database instance. Storage is configured separately below.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className={cn("border-b text-[11px] font-bold uppercase tracking-wider", isDark ? "border-white/[0.08] text-zinc-500" : "border-slate-200 text-slate-500")}>
                        <th className="py-2.5 px-3 w-8"></th>
                        <th className="py-2.5 px-3">ENGINE</th>
                        <th className="py-2.5 px-3">VERSION</th>
                        <th className="py-2.5 px-3">VCPU</th>
                        <th className="py-2.5 px-3">RAM</th>
                        <th className="py-2.5 px-3 text-right">PRICE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {DEDICATED_FLAVORS.map((flavor) => {
                        const isSelected = selectedFlavorId === flavor.id;
                        const EngineIcon = activeEngineMeta.icon;

                        return (
                          <tr
                            key={flavor.id}
                            onClick={() => !flavor.isOutOfStock && setSelectedFlavorId(flavor.id)}
                            className={cn(
                              "group transition-all cursor-pointer font-medium border-l-2",
                              flavor.isOutOfStock ? "opacity-50 cursor-not-allowed border-l-transparent" : "",
                              isSelected
                                ? isDark
                                  ? "bg-cyan-500/10 text-white border-l-cyan-400"
                                  : "bg-cyan-50/70 text-slate-900 border-l-cyan-500"
                                : isDark
                                  ? "border-l-transparent hover:bg-white/[0.02] text-zinc-300"
                                  : "border-l-transparent hover:bg-slate-50 text-slate-700"
                            )}
                          >
                            <td className="py-3 px-3">
                              <div className={cn(
                                "w-4 h-4 rounded-full border flex items-center justify-center transition-all shrink-0",
                                isSelected
                                  ? "border-cyan-400 bg-cyan-400/20 shadow-xs"
                                  : isDark ? "border-zinc-600 group-hover:border-zinc-400" : "border-slate-300 group-hover:border-slate-400"
                              )}>
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-xs shadow-cyan-400/60" />}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <EngineIcon className={cn("w-4 h-4", activeEngineMeta.color)} />
                                <span className="font-bold">{activeEngineMeta.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-zinc-400">{selectedVersion}</td>
                            <td className="py-3 px-3">
                              <span className={cn("px-2 py-0.5 rounded font-mono text-[11px]", isDark ? "bg-white/5 text-zinc-200" : "bg-slate-100 text-slate-800")}>
                                {flavor.vcpu}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className={cn("px-2 py-0.5 rounded font-mono text-[11px]", isDark ? "bg-white/5 text-zinc-200" : "bg-slate-100 text-slate-800")}>
                                {flavor.ram}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              {flavor.isOutOfStock ? (
                                <div className="text-right">
                                  <span className="text-zinc-500 line-through">{formatRupiah(flavor.price)}/mo</span>
                                  <span className="block text-[10px] text-amber-500 font-bold">(Out of Stock)</span>
                                </div>
                              ) : (
                                <span className={cn("font-bold text-sm font-mono", isSelected ? "text-cyan-400" : isDark ? "text-zinc-300" : "text-slate-800")}>
                                  {formatRupiah(flavor.price)}/mo
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Step 3: Storage Size Scale Bar (Gambar 1) */}
              <div className={cn("rounded-2xl border p-5 sm:p-6 transition-all w-full max-w-full min-w-0", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-xs")}>
                <div className="mb-4">
                  <h2 className={cn("text-base sm:text-lg font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                    Storage Size
                  </h2>
                  <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                    Freely adjustable, billed per GB on top of the flavor price above.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={cn("text-sm font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                      <span>Storage:</span>
                      <span className="text-cyan-400 font-mono text-base">{storageGb} GB</span>
                    </span>
                    <span className={cn("text-xs font-semibold", isDark ? "text-zinc-500" : "text-slate-500")}>
                      Max: 20 GB
                    </span>
                  </div>

                  {/* Range Slider */}
                  <div className="relative py-2">
                    <input
                      type="range"
                      min={1}
                      max={20}
                      step={1}
                      value={storageGb}
                      onChange={(e) => setStorageGb(parseInt(e.target.value, 10))}
                      className="w-full h-2.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 transition-all"
                    />
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mr-1">Presets:</span>
                    {STORAGE_PRESETS.map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => setStorageGb(preset)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border",
                          storageGb === preset
                            ? "bg-cyan-400 text-slate-950 border-cyan-400 shadow-xs"
                            : isDark
                              ? "bg-white/[0.03] text-zinc-400 border-white/[0.08] hover:text-white hover:bg-white/[0.06]"
                              : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                        )}
                      >
                        {preset} GB
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-500 font-mono pt-1">
                    <span>1 GB</span>
                    <span>20 GB</span>
                  </div>

                  <div className={cn("pt-2 text-xs border-t border-white/[0.06]", isDark ? "text-zinc-400" : "text-slate-600")}>
                    Rp 5.000/GB/month · Storage cost: <strong className="text-cyan-400 font-mono">{formatRupiah(dedicatedStorageCost)}/month</strong>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* SHARED MODE (Matching Dedicated Engine + Version selector style) */}
          {selectedTier === "SHARED" && (
            <>
              {/* Step 1: Engine & Version / Edition */}
              <div className={cn("rounded-2xl border p-5 sm:p-6 transition-all w-full max-w-full min-w-0", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-xs")}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className={cn("text-base sm:text-lg font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                      Select Database Engine
                    </h2>
                    <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                      Shared multi-tenant containers with burstable 0.5 vCPU pool. Billed purely on storage capacity.
                    </p>
                  </div>
                  <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full border", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
                    Shared Multi-Tenant
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {DATABASE_ENGINES.map((engine) => {
                    const EngineIcon = engine.icon;
                    const isSelected = selectedSharedEngine === engine.id;
                    return (
                      <button
                        type="button"
                        key={engine.id}
                        onClick={() => handleSharedEngineChange(engine.id)}
                        className={cn(
                          "rounded-xl border p-3.5 text-left transition-all cursor-pointer flex items-center gap-3",
                          isSelected
                            ? "border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500/40 shadow-xs text-white"
                            : isDark
                              ? "border-white/[0.08] bg-[#0c0c0e] hover:border-white/20 hover:bg-white/[0.02]"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                        )}
                      >
                        <div className={cn("w-9 h-9 rounded-lg border flex items-center justify-center shrink-0", isDark ? "bg-white/[0.04] border-white/[0.08]" : "bg-slate-100 border-slate-200")}>
                          <EngineIcon className={cn("w-5 h-5", engine.color)} />
                        </div>
                        <div className="min-w-0">
                          <span className={cn("text-sm font-bold block truncate", isDark ? "text-white" : "text-slate-900")}>
                            {engine.name}
                          </span>
                          <span className={cn("text-[11px] block truncate", isDark ? "text-zinc-500" : "text-slate-400")}>
                            {engine.webPanel}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Version & Edition Selector for Active Shared Engine */}
                <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06] flex-wrap">
                  <span className={cn("text-xs font-semibold mr-1 shrink-0", isDark ? "text-zinc-400" : "text-slate-600")}>Version:</span>
                  <div className="flex flex-wrap gap-2">
                    {currentSharedVariants.map((ver) => {
                      const isSelected = selectedSharedId === ver.id;
                      return (
                        <button
                          type="button"
                          key={ver.id}
                          onClick={() => setSelectedSharedId(ver.id)}
                          className={cn(
                            "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5",
                            isSelected
                              ? "bg-cyan-400 text-slate-950 border-cyan-400 font-bold shadow-xs"
                              : isDark
                                ? "bg-white/[0.03] text-zinc-400 border-white/[0.08] hover:text-white hover:bg-white/[0.06]"
                                : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                          )}
                        >
                          <span>{ver.name}</span>
                          {ver.ratePerGb > 10000 && (
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.2 rounded font-mono font-bold",
                              isSelected ? "bg-slate-950/20 text-slate-950" : isDark ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "bg-cyan-100 text-cyan-800"
                            )}>
                              {formatRupiah(ver.ratePerGb)}/GB
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Step 2: Storage Size Scale Bar */}
              <div className={cn("rounded-2xl border p-5 sm:p-6 transition-all w-full max-w-full min-w-0", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-xs")}>
                <div className="mb-4">
                  <h2 className={cn("text-base sm:text-lg font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                    Storage Size
                  </h2>
                  <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                    Choose disk quota on ultra-fast SSD storage. Scale up anytime.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={cn("text-sm font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                      <span>Storage:</span>
                      <span className="text-cyan-400 font-mono text-base">{storageGb} GB</span>
                    </span>
                    <span className={cn("text-xs font-semibold", isDark ? "text-zinc-500" : "text-slate-500")}>
                      Max: 20 GB
                    </span>
                  </div>

                  {/* Range Slider */}
                  <div className="relative py-2">
                    <input
                      type="range"
                      min={1}
                      max={20}
                      step={1}
                      value={storageGb}
                      onChange={(e) => setStorageGb(parseInt(e.target.value, 10))}
                      className="w-full h-2.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 transition-all"
                    />
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mr-1">Presets:</span>
                    {STORAGE_PRESETS.map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => setStorageGb(preset)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border",
                          storageGb === preset
                            ? "bg-cyan-400 text-slate-950 border-cyan-400 shadow-xs"
                            : isDark
                              ? "bg-white/[0.03] text-zinc-400 border-white/[0.08] hover:text-white hover:bg-white/[0.06]"
                              : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                        )}
                      >
                        {preset} GB
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-500 font-mono pt-1">
                    <span>1 GB</span>
                    <span>20 GB</span>
                  </div>

                  <div className={cn("pt-2 text-xs border-t border-white/[0.06]", isDark ? "text-zinc-400" : "text-slate-600")}>
                    {formatRupiah(activeSharedType.ratePerGb)}/GB/month · Storage cost: <strong className="text-cyan-400 font-mono">{formatRupiah(sharedStorageCost)}/month</strong>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Instance Configuration & Credentials */}
          <div className={cn("rounded-2xl border p-5 sm:p-6 transition-all w-full max-w-full min-w-0", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-xs")}>
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
                  placeholder="e.g. production-database"
                  className={cn("w-full border rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] text-white placeholder:text-zinc-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
                />
                <p className="text-[11px] text-zinc-500">Alphanumeric, spasi, titik, strip & underscore (2-50 chars)</p>
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
                  className={cn("w-full border rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] text-white placeholder:text-zinc-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
                />
                <p className="text-[11px] text-zinc-500">Awali huruf, alphanumeric & underscore (2-32 chars)</p>
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
                  className={cn("w-full border rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] text-white placeholder:text-zinc-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
                />
                <p className="text-[11px] text-zinc-500">Awali huruf, alphanumeric & underscore (non-root)</p>
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
                    placeholder="Leave blank to auto-generate"
                    className={cn("w-full border rounded-xl px-3.5 py-2.5 pr-10 text-sm font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08] text-white placeholder:text-zinc-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500">Min 8 karakter (@#%^+=_-. aman), tanpa kutip atau shell</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Sticky Summary Box (Gambar 1 & Gambar 2) */}
        <div className="xl:col-span-1 sticky top-6 space-y-6 w-full">
          <div className={cn("rounded-2xl border p-5 sm:p-6 transition-all space-y-5", isDark ? "bg-[#0a0a0c] border-white/[0.08] shadow-xl" : "bg-white border-slate-200/90 shadow-md")}>

            {/* DEDICATED SUMMARY (Gambar 1) */}
            {selectedTier === "DEDICATED" ? (
              <>
                <div className="space-y-1">
                  <div className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-400")}>
                    Engine & Version
                  </div>
                  <div className={cn("flex items-center gap-2 font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>
                    <activeEngineMeta.icon className={cn("w-4 h-4", activeEngineMeta.color)} />
                    <span>{activeEngineMeta.name} {selectedVersion}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-400")}>
                    Flavor
                  </div>
                  <div className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>
                    {activeFlavor.vcpu} / {activeFlavor.ram} RAM
                  </div>
                </div>

                <div className="space-y-1">
                  <div className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-400")}>
                    Storage Size
                  </div>
                  <div className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>
                    {storageGb} GB SSD
                  </div>
                </div>

                <div className="space-y-1">
                  <div className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-400")}>
                    Region
                  </div>
                  <div className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>
                    Sidoarjo (ID-SDA)
                  </div>
                </div>

                <div className={cn("pt-4 border-t space-y-2 text-xs", isDark ? "border-white/[0.08]" : "border-slate-100")}>
                  <div className={cn("flex items-center justify-between", isDark ? "text-zinc-400" : "text-slate-500")}>
                    <span>Flavor ({activeFlavor.vcpu} / {activeFlavor.ram})</span>
                    <span className={cn("font-mono font-bold", isDark ? "text-white" : "text-slate-900")}>{formatRupiah(activeFlavor.price)}</span>
                  </div>
                  <div className={cn("flex items-center justify-between", isDark ? "text-zinc-400" : "text-slate-500")}>
                    <span>Storage ({storageGb} GB × Rp 5.000)</span>
                    <span className={cn("font-mono font-bold", isDark ? "text-white" : "text-slate-900")}>{formatRupiah(dedicatedStorageCost)}</span>
                  </div>
                </div>

                <div className={cn("pt-4 border-t flex items-baseline justify-between", isDark ? "border-white/[0.08]" : "border-slate-100")}>
                  <span className={cn("text-sm font-bold", isDark ? "text-zinc-400" : "text-slate-500")}>Total</span>
                  <div className="text-right">
                    <span className="text-xl sm:text-2xl font-black text-cyan-400 font-mono tracking-tight">
                      {formatRupiah(dedicatedTotalMonthly)}/month
                    </span>
                    <span className={cn("block text-[11px] mt-0.5", isDark ? "text-zinc-500" : "text-slate-400")}>
                      ~{formatRupiah(dedicatedHourlyRate)} / hr (PAYG)
                    </span>
                  </div>
                </div>
              </>
            ) : (
              /* SHARED SUMMARY (Gambar 2) */
              <>
                <div className={cn("text-base font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>
                  Summary
                </div>

                <div className="space-y-1">
                  <div className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-400")}>
                    Engine & Version
                  </div>
                  <div className={cn("flex items-center gap-2 font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>
                    <activeSharedEngineMeta.icon className={cn("w-4 h-4", activeSharedEngineMeta.color)} />
                    <span>{activeSharedEngineMeta.name} {activeSharedType.name}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-400")}>
                    Storage Size
                  </div>
                  <div className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>
                    {storageGb} GB SSD
                  </div>
                </div>

                <div className="space-y-1">
                  <div className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-400")}>
                    Region
                  </div>
                  <div className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>
                    Sidoarjo (ID-SDA)
                  </div>
                </div>

                <div className="space-y-1">
                  <div className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-400")}>
                    Tier Mode
                  </div>
                  <div className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>
                    Shared Multi-Tenant
                  </div>
                </div>

                <div className={cn("pt-4 border-t space-y-2", isDark ? "border-white/[0.08]" : "border-slate-100")}>
                  <div className="flex items-center justify-between">
                    <span className={cn("text-sm font-bold", isDark ? "text-zinc-400" : "text-slate-500")}>Storage Cost</span>
                    <span className="text-xl sm:text-2xl font-black text-cyan-400 font-mono tracking-tight">
                      {formatRupiah(sharedTotalMonthly)}/month
                    </span>
                  </div>
                  <div className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-slate-400")}>
                    {formatRupiah(activeSharedType.ratePerGb)} per GB/month · ~{formatRupiah(sharedHourlyRate)}/hr (PAYG)
                  </div>
                </div>
              </>
            )}

            {/* Balance check & Deploy button */}
            <div className={cn("pt-4 border-t space-y-3", isDark ? "border-white/[0.08]" : "border-slate-100")}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Your Balance:</span>
                <span className={cn("font-bold font-mono", userBalance >= requiredUpfront ? "text-emerald-400" : "text-red-400")}>
                  {loadingBalance ? "..." : formatRupiah(userBalance)}
                </span>
              </div>

              {userBalance < requiredUpfront && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
                  <span>Insufficient balance</span>
                  <Link href="/dashboard/topup" className="font-bold underline hover:text-white">
                    Top Up
                  </Link>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || userBalance < requiredUpfront}
                className="w-full py-3.5 rounded-xl font-bold text-sm bg-cyan-400 hover:bg-cyan-300 active:scale-95 text-slate-950 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Provisioning Database...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current text-slate-950" />
                    <span>Create Database</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Animated Deployment Modal Overlay */}
      {submitting && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className={cn(
            "w-full max-w-md rounded-3xl border p-6 sm:p-8 text-center space-y-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200",
            isDark ? "bg-[#0c0c0e] border-white/10" : "bg-white border-slate-200"
          )}>
            {/* Glowing Aura Effect */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

            {/* Icon Animation */}
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-cyan-400/20 animate-ping opacity-30" />
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-cyan-400/10 border border-cyan-400/40 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                {selectedTier === "DEDICATED" ? (
                  <activeEngineMeta.icon className={cn("w-10 h-10 animate-pulse", activeEngineMeta.color)} />
                ) : (
                  <activeSharedEngineMeta.icon className={cn("w-10 h-10 animate-pulse", activeSharedEngineMeta.color)} />
                )}
              </div>
            </div>

            <div>
              <h3 className={cn("text-lg font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                Deploying Managed Database
              </h3>
              <p className={cn("text-xs mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>
                Please wait, allocating container and K3s configuration...
              </p>
            </div>

            {/* Multi-step progress pipeline */}
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className={isDark ? "text-zinc-200" : "text-slate-700"}>Account authorization & PAYG balance allocation</span>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className={isDark ? "text-zinc-200" : "text-slate-700"}>SSD storage allocation {storageGb} GB (local-path)</span>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs">
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                <span className="text-cyan-400 font-semibold">Creating Secret, Deployment & NodePort</span>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.01] border border-white/[0.03] text-xs opacity-60">
                <div className="w-4 h-4 rounded-full border border-dashed border-zinc-500 shrink-0" />
                <span className={isDark ? "text-zinc-500" : "text-slate-400"}>Redirecting to Database Dashboard...</span>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-zinc-500 flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>Do not close or refresh this page</span>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
