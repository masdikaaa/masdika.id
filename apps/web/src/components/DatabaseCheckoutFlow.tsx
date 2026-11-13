"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/billing";
import { toast } from "sonner";
import {
  Database, Check, Server, HardDrive,
  Cpu, Layers, ShieldCheck, Rocket, RefreshCw, Eye, EyeOff, Sparkles, CheckCircle2, Loader2,
  AlertTriangle, AlertCircle
} from "lucide-react";
// Dedicated database engines & versions (Using authentic official SVG icons & Masdika Cyan theme)
const DATABASE_ENGINES = [
  {
    id: "POSTGRES",
    name: "PostgreSQL",
    icon: "/images/apps/postgresql.svg",
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
    icon: "/images/apps/mysql.svg",
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
    icon: "/images/apps/mariadb.svg",
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
    icon: "/images/apps/mongodb.svg",
    defaultPort: 27017,
    versions: [
      { id: "7.0", name: "7.0 (Current)", default: true },
      { id: "6.0", name: "6.0 LTS" },
    ],
    webPanel: "Mongo Express",
  },
  {
    id: "REDIS",
    name: "Redis",
    icon: "/images/apps/redis.svg",
    defaultPort: 6379,
    versions: [
      { id: "7.2", name: "7.2 LTS", default: true },
      { id: "7.0", name: "7.0 LTS" },
    ],
    webPanel: "Redis Commander",
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
  REDIS: [
    { id: "redis-7.2", name: "7.2 LTS", version: "7.2", engine: "REDIS", ratePerGb: 10000, default: true },
    { id: "redis-7.0", name: "7.0 LTS", version: "7.0", engine: "REDIS", ratePerGb: 10000 },
  ],
};

const ALL_SHARED_VARIANTS = Object.values(SHARED_DATABASE_VARIANTS).flat();

const STORAGE_PRESETS = [1, 2, 5, 10, 15, 20];

export default function DatabaseCheckoutFlow() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const searchParams = useSearchParams();

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

  // Parse search params on load
  useEffect(() => {
    if (!searchParams) return;
    const engineParam = searchParams.get("engine");
    const tierParam = searchParams.get("tier");
    const storageParam = searchParams.get("storage");
    const versionParam = searchParams.get("version");
    const flavorParam = searchParams.get("flavor");

    if (tierParam && (tierParam.toUpperCase() === "SHARED" || tierParam.toUpperCase() === "DEDICATED")) {
      setSelectedTier(tierParam.toUpperCase() as "SHARED" | "DEDICATED");
    }

    let activeEngineId = "POSTGRES";
    if (engineParam) {
      const engUpper = engineParam.toUpperCase();
      const matched = DATABASE_ENGINES.find(e => e.id === engUpper || (engUpper === "POSTGRESQL" && e.id === "POSTGRES") || (engUpper === "MONGO" && e.id === "MONGODB"));
      if (matched) {
        activeEngineId = matched.id;
        setSelectedEngine(matched.id);
        setSelectedSharedEngine(matched.id);
        const variants = SHARED_DATABASE_VARIANTS[matched.id] || [];
        if (variants.length > 0) {
          const def = variants.find(v => v.default) || variants[0];
          setSelectedSharedId(def.id);
        }
      }
    }

    if (flavorParam && DEDICATED_FLAVORS.some(f => f.id === flavorParam)) {
      setSelectedFlavorId(flavorParam);
    }

    if (versionParam) {
      setSelectedVersion(versionParam);
      const variants = SHARED_DATABASE_VARIANTS[activeEngineId] || [];
      const match = variants.find(v => v.version === versionParam || v.id === versionParam || (versionParam.includes("postgis") && v.id.includes("postgis")) || (versionParam.includes("vector") && v.id.includes("vector")) || (versionParam.includes("full") && v.id.includes("full")));
      if (match) {
        setSelectedSharedId(match.id);
      }
    }

    if (storageParam) {
      const parsedStorage = parseInt(storageParam, 10);
      if (!isNaN(parsedStorage) && parsedStorage >= 1) {
        setStorageGb(Math.min(parsedStorage, 20));
      }
    }
  }, [searchParams]);

  // User balance & submission state
  const [userBalance, setUserBalance] = useState<number>(0);
  const [activeCommitment, setActiveCommitment] = useState<{
    totalMonthly: number;
    activeVpsCount: number;
    activeDbCount: number;
    activeSubCount: number;
    activeIpCount: number;
    totalActiveCount: number;
  }>({
    totalMonthly: 0,
    activeVpsCount: 0,
    activeDbCount: 0,
    activeSubCount: 0,
    activeIpCount: 0,
    totalActiveCount: 0,
  });
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Cluster resource capacity state
  const [clusterCapacity, setClusterCapacity] = useState<{
    available: boolean;
    status: "HEALTHY" | "NEAR_CAPACITY" | "FULL" | "OFFLINE";
    capacityPercent: number;
    activeInstances: number;
    maxInstances: number;
    allocatedCpu: number;
    totalCpu: number;
    cpuPercent: number;
    allocatedMemoryMb: number;
    totalMemoryMb: number;
    memoryPercent: number;
    availablePorts: number;
    totalPorts: number;
    reason?: string;
    userMessage?: string;
  } | null>(null);
  const [loadingCapacity, setLoadingCapacity] = useState(true);

  // Catalog plans mapping for API submission
  const [catalogPlans, setCatalogPlans] = useState<any[]>([]);

  useEffect(() => {
    // Fetch user balance and active services commitment
    fetch("/api/user/billing")
      .then((res) => res.json())
      .then((data) => {
        if (data.data?.balance !== undefined) {
          setUserBalance(data.data.balance);
        }
        if (data.data?.commitment) {
          setActiveCommitment(data.data.commitment);
        } else if (data.data?.activeMonthlyCommitment !== undefined) {
          setActiveCommitment({
            totalMonthly: data.data.activeMonthlyCommitment,
            activeVpsCount: data.data.vpsServices?.length || 0,
            activeDbCount: data.data.databases?.length || 0,
            activeSubCount: data.data.subscriptions?.length || 0,
            activeIpCount: data.data.reservedIps?.length || 0,
            totalActiveCount: (data.data.vpsServices?.length || 0) + (data.data.databases?.length || 0) + (data.data.subscriptions?.length || 0),
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoadingBalance(false));

    // Fetch cluster capacity & resource limits
    fetch("/api/user/database/capacity")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setClusterCapacity(data.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCapacity(false));

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
  const totalRequiredBalance = (activeCommitment.totalMonthly || 0) + currentTotalMonthly;
  const isBalanceInsufficient = userBalance < totalRequiredBalance;

  // Cluster resource capacity evaluation
  const isClusterFull = Boolean(
    clusterCapacity && (!clusterCapacity.available || clusterCapacity.status === "FULL" || clusterCapacity.status === "OFFLINE")
  );

  const selectedMemoryMb = selectedTier === "DEDICATED"
    ? (activeFlavor.ram.includes("8 GB") ? 8192 : activeFlavor.ram.includes("4 GB") ? 4096 : activeFlavor.ram.includes("2 GB") ? 2048 : 1024)
    : 1024;

  const isFlavorExceedsCapacity = Boolean(
    clusterCapacity &&
    !isClusterFull &&
    clusterCapacity.totalMemoryMb > 0 &&
    (clusterCapacity.totalMemoryMb - clusterCapacity.allocatedMemoryMb < selectedMemoryMb)
  );

  // Resolve DB Plan for submission
  const matchedPlan = catalogPlans.find((p) => {
    if (selectedTier === "SHARED") return p.name.toLowerCase().includes("shared");
    return p.name === activeFlavor.planName;
  });

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isClusterFull) {
      toast.error(clusterCapacity?.userMessage || "The Managed Database cluster is currently at full capacity. New deployments are temporarily paused.");
      return;
    }

    if (isFlavorExceedsCapacity) {
      toast.error(`The requested flavor requires ${selectedMemoryMb / 1024} GB RAM, which exceeds available cluster memory. Please choose a smaller tier.`);
      return;
    }

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

    if (isBalanceInsufficient) {
      toast.error(
        `Insufficient balance for accumulated services commitment. Required: ${formatRupiah(totalRequiredBalance)} (Active services: ${formatRupiah(activeCommitment.totalMonthly)} + New database: ${formatRupiah(currentTotalMonthly)}). Your balance: ${formatRupiah(userBalance)}.`
      );
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
      {/* Cluster Resource Alert Banner if Full */}
      {isClusterFull && (
        <div className={cn(
          "p-4 sm:p-5 rounded-2xl border flex items-start gap-3.5 transition-all shadow-md",
          isDark ? "bg-amber-500/10 border-amber-500/30 text-amber-200" : "bg-amber-50 border-amber-300 text-amber-900"
        )}>
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h4 className="font-bold text-sm text-amber-400">
                Database Server Resource Capacity Reached
              </h4>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Deployment Paused
              </span>
            </div>
            <p className="text-xs leading-relaxed opacity-90">
              {clusterCapacity?.userMessage || "The Managed Database cluster in Sidoarjo (ID-SDA) is currently at maximum resource capacity. New deployments are temporarily paused while our infrastructure team provisions additional cluster nodes."}
            </p>
            {clusterCapacity && (
              <div className="pt-2 border-t border-amber-500/20 flex flex-wrap items-center gap-3 text-[11px] font-mono text-zinc-400">
                <span>CPU Load: <strong className="text-amber-300">{clusterCapacity.cpuPercent}%</strong></span>
                <span>•</span>
                <span>RAM Allocated: <strong className="text-amber-300">{clusterCapacity.memoryPercent}%</strong></span>
                <span>•</span>
                <span>Region: <strong className="text-zinc-200">Sidoarjo (ID-SDA)</strong></span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* High Cluster Load Warning if Near Capacity */}
      {clusterCapacity && clusterCapacity.status === "NEAR_CAPACITY" && !isClusterFull && (
        <div className={cn(
          "px-4 py-3 rounded-2xl border flex items-center justify-between gap-3 text-xs transition-all",
          isDark ? "bg-amber-500/[0.07] border-amber-500/20 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-800"
        )}>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>High cluster utilization ({clusterCapacity.capacityPercent}% allocated). Limited deployment slots remaining.</span>
          </div>
          <span className="text-[10px] font-mono text-amber-400 font-semibold shrink-0">
            Region: ID-SDA
          </span>
        </div>
      )}

      {/* Top Architecture Mode Selector */}
      <div className={cn(
        "p-1.5 rounded-2xl border grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 w-full max-w-full min-w-0",
        isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-100 border-slate-200/80"
      )}>
        <button
          type="button"
          onClick={() => setSelectedTier("DEDICATED")}
          className={cn(
            "w-full px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-between gap-3",
            selectedTier === "DEDICATED"
              ? "bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20 font-bold"
              : isDark
                ? "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                : "text-slate-600 hover:text-slate-900 hover:bg-white"
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Server className="w-4 h-4 shrink-0" />
            <span className="truncate">Dedicated Host</span>
          </div>
          <span className={cn(
            "text-[10px] px-2 py-0.5 rounded font-extrabold uppercase shrink-0 whitespace-nowrap",
            selectedTier === "DEDICATED"
              ? "bg-slate-950/20 text-slate-950"
              : isDark
                ? "bg-white/5 text-zinc-400 border border-white/[0.06]"
                : "bg-slate-200 text-slate-700 border border-slate-300/60"
          )}>
            6 Flavors
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedTier("SHARED")}
          className={cn(
            "w-full px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-between gap-3",
            selectedTier === "SHARED"
              ? "bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20 font-bold"
              : isDark
                ? "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                : "text-slate-600 hover:text-slate-900 hover:bg-white"
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Database className="w-4 h-4 shrink-0" />
            <span className="truncate">Shared Multi-Tenant</span>
          </div>
          <span className={cn(
            "text-[10px] px-2 py-0.5 rounded font-extrabold uppercase shrink-0 whitespace-nowrap",
            selectedTier === "SHARED"
              ? "bg-slate-950/20 text-slate-950"
              : isDark
                ? "bg-white/5 text-zinc-400 border border-white/[0.06]"
                : "bg-slate-200 text-slate-700 border border-slate-300/60"
          )}>
            Per-GB Storage
          </span>
        </button>
      </div>

      {/* Main Grid: Left Options (2 col) + Right Sticky Summary (1 col) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full max-w-full min-w-0 items-start">
        {/* Left Column (2 cols): Options & Sliders */}
        <div className="xl:col-span-2 space-y-6 w-full max-w-full min-w-0">

          {/* DEDICATED MODE (Gambar 1) */}
          {selectedTier === "DEDICATED" && (
            <>
              {/* Step 1: Engine & Version */}
              <div className={cn("rounded-2xl border p-4 sm:p-6 transition-all w-full max-w-full min-w-0", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-xs")}>
                <div className="flex items-start sm:items-center justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <h2 className={cn("text-base sm:text-lg font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                      Select Database Engine
                    </h2>
                    <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                      Dedicated container with isolated resources & web GUI viewer
                    </p>
                  </div>
                  <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 whitespace-nowrap", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
                    K8s Native
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3 mb-4">
                  {DATABASE_ENGINES.map((engine, idx) => {
                    const isSelected = selectedEngine === engine.id;
                    const isLastOdd = idx === DATABASE_ENGINES.length - 1;
                    return (
                      <button
                        type="button"
                        key={engine.id}
                        onClick={() => handleEngineChange(engine.id)}
                        className={cn(
                          "rounded-xl border transition-all cursor-pointer group relative overflow-hidden",
                          "p-2.5 sm:p-3.5 flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-2 sm:gap-3",
                          isLastOdd ? "col-span-2 sm:col-span-2 lg:col-span-1" : "col-span-1",
                          isSelected
                            ? "border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500/40 shadow-xs text-white"
                            : isDark
                              ? "border-white/[0.08] bg-[#0c0c0e] hover:border-white/20 hover:bg-white/[0.02]"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                        )}
                      >
                        <div className={cn(
                          "w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                          isSelected
                            ? "border-cyan-500/30 bg-cyan-500/15"
                            : isDark
                              ? "border-white/[0.08] bg-white/[0.04]"
                              : "border-slate-200 bg-slate-50"
                        )}>
                          <img src={engine.icon} alt={engine.name} className="w-5 h-5 sm:w-6 sm:h-6 object-contain pointer-events-none select-none" />
                        </div>
                        <div className="min-w-0 w-full sm:w-auto">
                          <span className={cn("text-xs sm:text-sm font-bold block leading-tight", isDark ? "text-white" : "text-slate-900")}>
                            {engine.name}
                          </span>
                          <span className="text-[10px] sm:text-[11px] block text-cyan-500 dark:text-cyan-400 font-semibold mt-0.5 leading-tight">
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
                        const flavorRamMb = flavor.ram.includes("8 GB") ? 8192 : flavor.ram.includes("4 GB") ? 4096 : flavor.ram.includes("2 GB") ? 2048 : 1024;
                        const isFlavorFull = isClusterFull || Boolean(
                          clusterCapacity &&
                          clusterCapacity.totalMemoryMb > 0 &&
                          (clusterCapacity.totalMemoryMb - clusterCapacity.allocatedMemoryMb < flavorRamMb)
                        );
                        const isUnavailable = flavor.isOutOfStock || isFlavorFull;

                        return (
                          <tr
                            key={flavor.id}
                            onClick={() => !isUnavailable && setSelectedFlavorId(flavor.id)}
                            className={cn(
                              "group transition-all cursor-pointer font-medium border-l-2",
                              isUnavailable ? "opacity-40 cursor-not-allowed border-l-transparent" : "",
                              isSelected && !isUnavailable
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
                                isSelected && !isUnavailable
                                  ? "border-cyan-400 bg-cyan-400/20 shadow-xs"
                                  : isDark ? "border-zinc-600 group-hover:border-zinc-400" : "border-slate-300 group-hover:border-slate-400"
                              )}>
                                {isSelected && !isUnavailable && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-xs shadow-cyan-400/60" />}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <img src={activeEngineMeta.icon} alt={activeEngineMeta.name} className="w-4 h-4 object-contain" />
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
                              {isUnavailable ? (
                                <div className="text-right">
                                  <span className="text-zinc-500 line-through">{formatRupiah(flavor.price)}/mo</span>
                                  <span className="block text-[10px] text-amber-500 font-bold">
                                    {flavor.isOutOfStock ? "(Out of Stock)" : "(Full Capacity)"}
                                  </span>
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
                <div className="flex items-start sm:items-center justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <h2 className={cn("text-base sm:text-lg font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                      Select Database Engine
                    </h2>
                    <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                      Shared multi-tenant containers with burstable 0.5 vCPU pool. Billed purely on storage capacity.
                    </p>
                  </div>
                  <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 whitespace-nowrap", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
                    Shared Multi-Tenant
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 mb-4">
                  {DATABASE_ENGINES.map((engine, idx) => {
                    const isSelected = selectedSharedEngine === engine.id;
                    const isLastOdd = idx === DATABASE_ENGINES.length - 1;
                    return (
                      <button
                        type="button"
                        key={engine.id}
                        onClick={() => handleSharedEngineChange(engine.id)}
                        className={cn(
                          "rounded-xl border transition-all cursor-pointer group relative overflow-hidden",
                          "p-2.5 sm:p-3.5 flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-2 sm:gap-3",
                          isLastOdd ? "col-span-2 sm:col-span-1" : "col-span-1",
                          isSelected
                            ? "border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500/40 shadow-xs text-white"
                            : isDark
                              ? "border-white/[0.08] bg-[#0c0c0e] hover:border-white/20 hover:bg-white/[0.02]"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                        )}
                      >
                        <div className={cn(
                          "w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                          isSelected
                            ? "border-cyan-500/30 bg-cyan-500/15"
                            : isDark
                              ? "border-white/[0.08] bg-white/[0.04]"
                              : "border-slate-200 bg-slate-50"
                        )}>
                          <img src={engine.icon} alt={engine.name} className="w-5 h-5 sm:w-6 sm:h-6 object-contain pointer-events-none select-none" />
                        </div>
                        <div className="min-w-0 w-full sm:w-auto">
                          <span className={cn("text-xs sm:text-sm font-bold block leading-tight", isDark ? "text-white" : "text-slate-900")}>
                            {engine.name}
                          </span>
                          <span className="text-[10px] sm:text-[11px] block text-cyan-500 dark:text-cyan-400 font-semibold mt-0.5 leading-tight">
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

              {/* Step 2: Shared Package Details (Spec Overview) */}
              <div className={cn("rounded-2xl border p-4 sm:p-6 transition-all w-full max-w-full min-w-0", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-xs")}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className={cn("text-base sm:text-lg font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                      Shared Package Details
                    </h2>
                    <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                      Burstable multi-tenant container specification on Kubernetes K3s
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs font-mono font-bold px-2.5 py-1 rounded-full border shrink-0", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
                      {formatRupiah(activeSharedType.ratePerGb)}/GB/mo
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                  <div className={cn("p-3 rounded-xl border flex flex-col justify-between", isDark ? "bg-white/[0.02] border-white/[0.06]" : "bg-slate-50 border-slate-200/80")}>
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-500")}>Compute</span>
                    <span className={cn("text-xs sm:text-sm font-bold mt-1.5 flex items-center gap-1.5", isDark ? "text-zinc-200" : "text-slate-800")}>
                      <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> 0.5 vCPU Pool
                    </span>
                  </div>
                  <div className={cn("p-3 rounded-xl border flex flex-col justify-between", isDark ? "bg-white/[0.02] border-white/[0.06]" : "bg-slate-50 border-slate-200/80")}>
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-500")}>Memory</span>
                    <span className={cn("text-xs sm:text-sm font-bold mt-1.5 flex items-center gap-1.5", isDark ? "text-zinc-200" : "text-slate-800")}>
                      <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> 1 GB RAM
                    </span>
                  </div>
                  <div className={cn("p-3 rounded-xl border flex flex-col justify-between", isDark ? "bg-white/[0.02] border-white/[0.06]" : "bg-slate-50 border-slate-200/80")}>
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-500")}>Storage PVC</span>
                    <span className={cn("text-xs sm:text-sm font-bold mt-1.5 flex items-center gap-1.5", isDark ? "text-zinc-200" : "text-slate-800")}>
                      <HardDrive className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> SATA SSD
                    </span>
                  </div>
                  <div className={cn("p-3 rounded-xl border flex flex-col justify-between", isDark ? "bg-white/[0.02] border-white/[0.06]" : "bg-slate-50 border-slate-200/80")}>
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-500")}>Web Viewer</span>
                    <span className="text-xs sm:text-sm font-bold text-cyan-500 dark:text-cyan-400 mt-1.5 flex items-center gap-1.5 truncate">
                      {activeSharedEngineMeta.webPanel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 3: Storage Size Scale Bar */}
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
                    <img src={activeEngineMeta.icon} alt={activeEngineMeta.name} className="w-4 h-4 object-contain" />
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
                    <img src={activeSharedEngineMeta.icon} alt={activeSharedEngineMeta.name} className="w-4 h-4 object-contain" />
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
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Account Balance:</span>
                  <span className={cn("font-bold font-mono", !isBalanceInsufficient ? "text-emerald-400" : "text-red-400")}>
                    {loadingBalance ? "..." : formatRupiah(userBalance)}
                  </span>
                </div>
                {activeCommitment.totalMonthly > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Active Services Commitment:</span>
                    <span className="font-mono">{formatRupiah(activeCommitment.totalMonthly)}/mo</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>New Database Estimate:</span>
                  <span className="font-mono">{formatRupiah(currentTotalMonthly)}/mo</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-white/[0.06] font-semibold">
                  <span className={isDark ? "text-zinc-300" : "text-slate-700"}>Total Required Balance:</span>
                  <span className={cn("font-mono font-bold", !isBalanceInsufficient ? "text-cyan-400" : "text-red-400")}>
                    {formatRupiah(totalRequiredBalance)}
                  </span>
                </div>
              </div>

              {isBalanceInsufficient && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs space-y-1.5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-red-300">Insufficient Account Balance</p>
                      <p className="text-[11px] text-zinc-300 mt-0.5 leading-relaxed">
                        Orders require sufficient balance to cover the accumulated monthly commitment of your active services plus this database.
                      </p>
                    </div>
                  </div>
                  <div className="pl-6 pt-1 flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400">Shortfall: {formatRupiah(totalRequiredBalance - userBalance)}</span>
                    <Link href="/dashboard/topup" className="font-bold underline text-red-300 hover:text-white transition-colors">
                      Top Up Balance →
                    </Link>
                  </div>
                </div>
              )}

              {/* Cluster Full / Capacity Warnings */}
              {isClusterFull && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">
                    Cluster is currently at maximum capacity. New deployments are temporarily paused.
                  </span>
                </div>
              )}

              {isFlavorExceedsCapacity && !isClusterFull && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">
                    Requested flavor requires {selectedMemoryMb / 1024} GB RAM, which exceeds remaining cluster memory. Please choose a smaller tier.
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || isClusterFull || isFlavorExceedsCapacity || isBalanceInsufficient}
                className="w-full py-3.5 rounded-xl font-bold text-sm bg-cyan-400 hover:bg-cyan-300 active:scale-95 text-slate-950 transition-all shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Provisioning Database...</span>
                  </>
                ) : isClusterFull ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-slate-950" />
                    <span>Cluster at Full Capacity</span>
                  </>
                ) : isFlavorExceedsCapacity ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-slate-950" />
                    <span>Flavor Exceeds Available RAM</span>
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4 text-slate-950" />
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
                <img 
                  src={selectedTier === "DEDICATED" ? activeEngineMeta.icon : activeSharedEngineMeta.icon} 
                  alt="Engine" 
                  className="w-10 h-10 object-contain animate-pulse select-none pointer-events-none" 
                />
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
