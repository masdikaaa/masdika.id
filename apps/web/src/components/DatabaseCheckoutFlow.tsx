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
  Cpu, Layers, ShieldCheck, Zap, RefreshCw, Eye, EyeOff, MapPin
} from "lucide-react";
import { SiMysql, SiPostgresql, SiMariadb, SiMongodb } from "react-icons/si";

// Dedicated database engines & versions
const DATABASE_ENGINES = [
  {
    id: "POSTGRES",
    name: "PostgreSQL",
    icon: SiPostgresql,
    color: "text-[#336791]",
    borderHover: "hover:border-[#336791]/50",
    borderActive: "border-[#336791]",
    bgActive: "bg-[#336791]/10",
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
    borderHover: "hover:border-[#00758F]/50",
    borderActive: "border-[#00758F]",
    bgActive: "bg-[#00758F]/10",
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
    borderHover: "hover:border-[#C0765A]/50",
    borderActive: "border-[#C0765A]",
    bgActive: "bg-[#C0765A]/10",
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
    borderHover: "hover:border-[#47A248]/50",
    borderActive: "border-[#47A248]",
    bgActive: "bg-[#47A248]/10",
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

// Shared Database Types matching SumoPod (Gambar 2)
const SHARED_DATABASE_TYPES = [
  { id: "postgres-16", engine: "POSTGRES", version: "16", name: "PostgreSQL 16 (Shared)", ratePerGb: 10000, icon: SiPostgresql, color: "text-[#336791]", isOutOfStock: false },
  { id: "mysql-8", engine: "MYSQL", version: "8.0", name: "MySQL 8 (Shared)", ratePerGb: 10000, icon: SiMysql, color: "text-[#00758F]", isOutOfStock: false },
  { id: "mariadb-11", engine: "MARIADB", version: "10.11", name: "MariaDB 11 (Shared)", ratePerGb: 10000, icon: SiMariadb, color: "text-[#C0765A]", isOutOfStock: false },
  { id: "mongo-7", engine: "MONGODB", version: "7.0", name: "MongoDB 7 (Shared)", ratePerGb: 10000, icon: SiMongodb, color: "text-[#47A248]", isOutOfStock: false },
  { id: "postgres-postgis", engine: "POSTGRES", version: "16", name: "PostgreSQL 16 + PostGIS (Shared)", ratePerGb: 12500, icon: SiPostgresql, color: "text-[#336791]", isOutOfStock: false },
  { id: "postgres-vector", engine: "POSTGRES", version: "16", name: "PostgreSQL 16 + pgvector (Shared)", ratePerGb: 12500, icon: SiPostgresql, color: "text-[#336791]", isOutOfStock: false },
  { id: "postgres-full", engine: "POSTGRES", version: "16", name: "PostgreSQL 16 + PostGIS + pgvector (Shared)", ratePerGb: 15000, icon: SiPostgresql, color: "text-[#336791]", isOutOfStock: false },
];

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

  // Calculations for Dedicated (Gambar 1)
  const activeFlavor = DEDICATED_FLAVORS.find((f) => f.id === selectedFlavorId) || DEDICATED_FLAVORS[1];
  const activeEngineMeta = DATABASE_ENGINES.find((e) => e.id === selectedEngine) || DATABASE_ENGINES[0];
  const dedicatedStorageCost = storageGb * 5000;
  const dedicatedTotalMonthly = activeFlavor.price + dedicatedStorageCost;
  const dedicatedHourlyRate = Math.max(1, Math.ceil(dedicatedTotalMonthly / 720));

  // Calculations for Shared (Gambar 2)
  const activeSharedType = SHARED_DATABASE_TYPES.find((s) => s.id === selectedSharedId) || SHARED_DATABASE_TYPES[0];
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

    if (userBalance < requiredUpfront) {
      toast.error(`Insufficient balance. Requires at least ${formatRupiah(requiredUpfront)} (1 hour PAYG) balance.`);
      return;
    }

    setSubmitting(true);
    const deployName = selectedTier === "DEDICATED" ? `${activeFlavor.planName} (${storageGb} GB)` : `Shared Database (${storageGb} GB)`;
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
          planName: selectedTier === "DEDICATED" ? activeFlavor.planName : "Shared Database",
          storageGb,
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
    <form onSubmit={handleDeploy} className="space-y-6 w-full max-w-7xl mx-auto">
      {/* Top Architecture Mode Selector */}
      <div className={cn("p-1.5 rounded-2xl border flex items-center justify-between gap-3 flex-wrap", isDark ? "bg-[#0c0c0e] border-white/[0.08]" : "bg-slate-100 border-slate-200")}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedTier("DEDICATED")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2",
              selectedTier === "DEDICATED"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : isDark ? "text-zinc-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Server className="w-4 h-4" />
            <span>Dedicated Host Resources</span>
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-extrabold uppercase", selectedTier === "DEDICATED" ? "bg-white/20 text-white" : isDark ? "bg-white/5 text-zinc-400" : "bg-slate-200 text-slate-700")}>
              6 Flavors
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedTier("SHARED")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2",
              selectedTier === "SHARED"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : isDark ? "text-zinc-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Database className="w-4 h-4" />
            <span>Shared Multi-Tenant</span>
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-extrabold uppercase", selectedTier === "SHARED" ? "bg-white/20 text-white" : isDark ? "bg-white/5 text-zinc-400" : "bg-slate-200 text-slate-700")}>
              Per-GB Storage
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium px-3 text-zinc-400">
          <MapPin className="w-3.5 h-3.5 text-blue-400" />
          <span>Region: Sidoarjo (K3s Cluster)</span>
        </div>
      </div>

      {/* Main Grid: Left Options + Right Sticky Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Options & Sliders */}
        <div className="lg:col-span-8 space-y-6">

          {/* DEDICATED MODE (Gambar 1) */}
          {selectedTier === "DEDICATED" && (
            <>
              {/* Step 1: Engine & Version */}
              <div className={cn("rounded-2xl border p-5 sm:p-6 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08]" : "bg-white border-slate-200 shadow-xs")}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className={cn("text-base sm:text-lg font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                      Select Database Engine
                    </h2>
                    <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                      Dedicated container with isolated resources & web GUI viewer
                    </p>
                  </div>
                  <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border", isDark ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-800 border-blue-200")}>
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
                            ? `${engine.borderActive} ${isDark ? engine.bgActive : "bg-blue-50/50"} ring-1 ring-blue-500/30 shadow-xs`
                            : isDark
                              ? "border-white/[0.08] bg-[#0a0a0c] hover:border-white/20"
                              : "border-slate-200 bg-white hover:border-slate-300"
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
                <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                  <span className={cn("text-xs font-semibold", isDark ? "text-zinc-400" : "text-slate-600")}>Version:</span>
                  <div className="flex flex-wrap gap-2">
                    {activeEngineMeta.versions.map((ver) => (
                      <button
                        type="button"
                        key={ver.id}
                        onClick={() => setSelectedVersion(ver.id)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border",
                          selectedVersion === ver.id
                            ? "bg-blue-600 text-white border-blue-500 shadow-xs"
                            : isDark
                              ? "bg-white/[0.03] text-zinc-400 border-white/[0.08] hover:text-white"
                              : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                        )}
                      >
                        {ver.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 2: Select Flavor (Exact Table from Gambar 1) */}
              <div className={cn("rounded-2xl border p-5 sm:p-6 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08]" : "bg-white border-slate-200 shadow-xs")}>
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
                              "transition-all cursor-pointer font-medium",
                              flavor.isOutOfStock ? "opacity-50 cursor-not-allowed" : "",
                              isSelected
                                ? isDark
                                  ? "bg-blue-600/10 text-white"
                                  : "bg-blue-50/80 text-slate-900"
                                : isDark
                                  ? "hover:bg-white/[0.02] text-zinc-300"
                                  : "hover:bg-slate-50 text-slate-700"
                            )}
                          >
                            <td className="py-3 px-3">
                              <input
                                type="radio"
                                name="dedicatedFlavor"
                                checked={isSelected}
                                onChange={() => setSelectedFlavorId(flavor.id)}
                                disabled={flavor.isOutOfStock}
                                className="w-4 h-4 accent-blue-600 cursor-pointer"
                              />
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
                                <span className={cn("font-bold text-sm", isSelected ? "text-blue-400" : isDark ? "text-blue-400/90" : "text-blue-600")}>
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
              <div className={cn("rounded-2xl border p-5 sm:p-6 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08]" : "bg-white border-slate-200 shadow-xs")}>
                <div className="mb-4">
                  <h2 className={cn("text-base sm:text-lg font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                    Storage Size
                  </h2>
                  <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                    Freely adjustable, billed per GB on top of the flavor price above.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-900")}>
                      Storage: {storageGb} GB
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
                      className="w-full h-2.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600 transition-all"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-500 font-mono">
                    <span>1 GB</span>
                    <span>20 GB</span>
                  </div>

                  <div className={cn("pt-2 text-xs", isDark ? "text-zinc-400" : "text-slate-600")}>
                    Rp 5.000/GB/month · Storage cost: <strong className={isDark ? "text-white" : "text-slate-900"}>{formatRupiah(dedicatedStorageCost)}/month</strong>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* SHARED MODE (Gambar 2) */}
          {selectedTier === "SHARED" && (
            <>
              {/* Step 1: Select Database Type Grid */}
              <div className={cn("rounded-2xl border p-5 sm:p-6 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08]" : "bg-white border-slate-200 shadow-xs")}>
                <div className="mb-4">
                  <h2 className={cn("text-base sm:text-lg font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                    Select Database Type
                  </h2>
                  <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                    Shared multi-tenant containers with burstable 0.5 vCPU pool. Billed purely on storage capacity.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {SHARED_DATABASE_TYPES.map((typeOption) => {
                    const isSelected = selectedSharedId === typeOption.id;
                    const EngineIcon = typeOption.icon;

                    return (
                      <button
                        type="button"
                        key={typeOption.id}
                        disabled={typeOption.isOutOfStock}
                        onClick={() => setSelectedSharedId(typeOption.id)}
                        className={cn(
                          "rounded-2xl border p-4 text-left transition-all cursor-pointer relative flex flex-col justify-between",
                          typeOption.isOutOfStock ? "opacity-40 cursor-not-allowed" : "",
                          isSelected
                            ? "border-blue-600 bg-blue-600/10 ring-1 ring-blue-500/30 shadow-md"
                            : isDark
                              ? "border-white/[0.08] bg-[#0a0a0c] hover:border-white/20"
                              : "border-slate-200 bg-white hover:border-slate-300"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center shrink-0", isDark ? "bg-white/[0.04] border-white/[0.08]" : "bg-slate-100 border-slate-200")}>
                            <EngineIcon className={cn("w-5 h-5", typeOption.color)} />
                          </div>
                          <div>
                            <span className={cn("text-sm font-bold block", isDark ? "text-white" : "text-slate-900")}>
                              {typeOption.name}
                            </span>
                            <span className={cn("text-xs font-semibold mt-1 block", isDark ? "text-zinc-400" : "text-slate-500")}>
                              {formatRupiah(typeOption.ratePerGb)}/GB
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="absolute top-3.5 right-3.5 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Storage Size Scale Bar (Gambar 2) */}
              <div className={cn("rounded-2xl border p-5 sm:p-6 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08]" : "bg-white border-slate-200 shadow-xs")}>
                <div className="mb-4">
                  <h2 className={cn("text-base sm:text-lg font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                    Storage Size
                  </h2>
                  <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                    Choose disk quota on ultra-fast NVMe storage. Scale up anytime.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-900")}>
                      Storage: {storageGb} GB
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
                      className="w-full h-2.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600 transition-all"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-500 font-mono">
                    <span>1 GB</span>
                    <span>20 GB</span>
                  </div>

                  <div className={cn("pt-2 text-xs", isDark ? "text-zinc-400" : "text-slate-600")}>
                    Storage cost: <strong className={isDark ? "text-white" : "text-slate-900"}>{formatRupiah(sharedStorageCost)}/month</strong>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Instance Configuration & Credentials */}
          <div className={cn("rounded-2xl border p-5 sm:p-6 transition-all", isDark ? "bg-[#0c0c0e] border-white/[0.08]" : "bg-white border-slate-200 shadow-xs")}>
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
                  className={cn("w-full border rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-blue-500 transition-all", isDark ? "bg-[#0a0a0c] border-white/[0.08] text-white placeholder:text-zinc-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
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
                  className={cn("w-full border rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:border-blue-500 transition-all", isDark ? "bg-[#0a0a0c] border-white/[0.08] text-white placeholder:text-zinc-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
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
                  className={cn("w-full border rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:border-blue-500 transition-all", isDark ? "bg-[#0a0a0c] border-white/[0.08] text-white placeholder:text-zinc-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
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
                    placeholder="Leave blank to auto-generate"
                    className={cn("w-full border rounded-xl px-3.5 py-2.5 pr-10 text-sm font-mono focus:outline-none focus:border-blue-500 transition-all", isDark ? "bg-[#0a0a0c] border-white/[0.08] text-white placeholder:text-zinc-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Sticky Summary Box (Gambar 1 & Gambar 2) */}
        <div className="lg:col-span-4 sticky top-6">
          <div className={cn("rounded-2xl border p-5 sm:p-6 transition-all space-y-5", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-xl" : "bg-white border-slate-200 shadow-md")}>

            {/* DEDICATED SUMMARY (Gambar 1) */}
            {selectedTier === "DEDICATED" ? (
              <>
                <div className="space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    Engine & Version
                  </div>
                  <div className="flex items-center gap-2 font-bold text-sm text-white">
                    <activeEngineMeta.icon className={cn("w-4 h-4", activeEngineMeta.color)} />
                    <span>{activeEngineMeta.name} {selectedVersion}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    Flavor
                  </div>
                  <div className="font-bold text-sm text-white">
                    {activeFlavor.vcpu} / {activeFlavor.ram} RAM
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    Storage Size
                  </div>
                  <div className="font-bold text-sm text-white">
                    {storageGb} GB
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    Region
                  </div>
                  <div className="font-bold text-sm text-white">
                    Sidoarjo
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.08] space-y-2 text-xs">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Flavor ({activeFlavor.vcpu} / {activeFlavor.ram})</span>
                    <span className="font-mono text-white">{formatRupiah(activeFlavor.price)}</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Storage ({storageGb} GB × Rp 5.000)</span>
                    <span className="font-mono text-white">{formatRupiah(dedicatedStorageCost)}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.08] flex items-baseline justify-between">
                  <span className="text-sm font-bold text-zinc-400">Total</span>
                  <div className="text-right">
                    <span className="text-xl sm:text-2xl font-black text-blue-500">
                      {formatRupiah(dedicatedTotalMonthly)}/month
                    </span>
                    <span className="block text-[11px] text-zinc-500 mt-0.5">
                      ~{formatRupiah(dedicatedHourlyRate)} / jam (PAYG)
                    </span>
                  </div>
                </div>
              </>
            ) : (
              /* SHARED SUMMARY (Gambar 2) */
              <>
                <div className="text-base font-bold text-white mb-2">
                  Summary
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    Database Type
                  </div>
                  <div className="font-bold text-sm text-white">
                    {activeSharedType.name}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    Storage Size
                  </div>
                  <div className="font-bold text-sm text-white">
                    {storageGb} GB
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    Region
                  </div>
                  <div className="font-bold text-sm text-white">
                    Sidoarjo
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    Type
                  </div>
                  <div className="font-bold text-sm text-white">
                    Shared
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.08] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-zinc-400">Storage Cost</span>
                    <span className="text-lg font-black text-blue-500">
                      {formatRupiah(sharedTotalMonthly)}/month
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {formatRupiah(activeSharedType.ratePerGb)} per GB/month · ~{formatRupiah(sharedHourlyRate)}/jam (PAYG)
                  </div>
                </div>
              </>
            )}

            {/* Balance check & Deploy button */}
            <div className="pt-4 border-t border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Your Balance:</span>
                <span className={cn("font-bold", userBalance >= requiredUpfront ? "text-emerald-400" : "text-red-400")}>
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
                className="w-full py-3 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 active:scale-95 text-white transition-all shadow-lg shadow-blue-600/30 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Provisioning Database...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current" />
                    <span>Create Database</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
