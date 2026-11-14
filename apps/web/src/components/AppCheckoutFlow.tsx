"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MANAGED_APPS_CATALOG,
  MANAGED_APP_PLANS,
  ManagedAppDefinition,
  ManagedAppPlanDefinition,
  formatRupiah,
} from "@/lib/app-catalog";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import {
  Zap,
  Check,
  AlertTriangle,
  Cpu,
  HardDrive,
  Globe,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  id: number;
  balance: number;
  role: string;
}

function generateRandomSuffix(): string {
  return Math.random().toString(36).substring(2, 6);
}

export default function AppCheckoutFlow() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [selectedApp, setSelectedApp] = useState<ManagedAppDefinition>(MANAGED_APPS_CATALOG[0]);
  const [selectedPlan, setSelectedPlan] = useState<ManagedAppPlanDefinition>(MANAGED_APP_PLANS[1]); // Default 1C2G
  const [appName, setAppName] = useState(`${MANAGED_APPS_CATALOG[0].name} Instance`);
  const [customSubdomain, setCustomSubdomain] = useState("");
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "PAYG">("MONTHLY");

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [existingCommitment, setExistingCommitment] = useState(0);
  const [loadingUser, setLoadingUser] = useState(true);
  const [deploying, setDeploying] = useState(false);

  // Fetch user balance and existing commitments
  useEffect(() => {
    fetch("/api/user/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUserProfile(data.user);
        }
      })
      .catch(() => { })
      .finally(() => setLoadingUser(false));

    fetch("/api/user/commitment")
      .then((res) => res.json())
      .then((data) => {
        if (data.totalMonthly !== undefined) {
          setExistingCommitment(data.totalMonthly);
        }
      })
      .catch(() => { });
  }, []);

  // Update instance name default when app changes
  const handleSelectApp = (app: ManagedAppDefinition) => {
    setSelectedApp(app);
    setAppName(`${app.name} Instance`);
    // auto-suggest subdomain using pure module-scoped generator
    const randomSuffix = generateRandomSuffix();
    setCustomSubdomain(`${app.id}-${randomSuffix}`);
  };

  const currentCost = selectedPlan.monthlyPrice;
  const userBalance = userProfile?.balance || 0;
  const totalRequiredBalance = existingCommitment + currentCost;
  const isBalanceInsufficient = !loadingUser && userBalance < totalRequiredBalance;
  const shortfall = Math.max(0, totalRequiredBalance - userBalance);

  const cleanSubdomain = customSubdomain
    ? customSubdomain.toLowerCase().trim().replace(/[^a-z0-9-]/g, "")
    : `${selectedApp.id}-abc`;

  const handleDeploy = async () => {
    if (!appName.trim()) {
      toast.error("Please enter a name for your application.");
      return;
    }

    if (isBalanceInsufficient) {
      toast.error(
        `Insufficient account balance. You need at least ${formatRupiah(totalRequiredBalance)} to deploy this application.`
      );
      return;
    }

    setDeploying(true);
    const toastId = toast.loading(`Deploying ${selectedApp.name} (${selectedPlan.planCode}) to Kubernetes cluster...`);

    try {
      const res = await fetch("/api/user/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: appName.trim(),
          appType: selectedApp.id,
          planCode: selectedPlan.planCode,
          billingMode: billingCycle,
          customSubdomain: customSubdomain.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to deploy application");
      }

      toast.success(`Successfully deployed ${selectedApp.name}!`, { id: toastId });
      router.push(`/dashboard/apps/${data.data.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to deploy application", { id: toastId });
      setDeploying(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Main Flow: 8 Cols */}
      <div className="lg:col-span-8 space-y-8">
        {/* Step 1: Choose Application */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={cn("text-base font-bold tracking-tight flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
              <span>1. Choose Application</span>
            </h2>
            <span className={cn("text-xs font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
              5 Official AI & Automation Engines
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {MANAGED_APPS_CATALOG.map((app) => {
              const isSelected = selectedApp.id === app.id;
              return (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => handleSelectApp(app)}
                  className={cn(
                    "relative p-4 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer group text-left",
                    isSelected
                      ? isDark
                        ? "bg-cyan-500/10 border-cyan-400 ring-2 ring-cyan-400/20 shadow-lg shadow-cyan-500/10"
                        : "bg-cyan-50/80 border-cyan-500 ring-2 ring-cyan-500/20 shadow-sm"
                      : isDark
                        ? "bg-[#101014] border-white/[0.08] hover:border-white/[0.18] hover:bg-white/[0.02]"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 shadow-2xs"
                  )}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 p-1.5 bg-black/40 border border-white/10 relative overflow-hidden">
                      <Image
                        src={app.icon}
                        alt={app.name}
                        width={40}
                        height={40}
                        className="object-contain w-full h-full"
                        unoptimized
                      />
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0",
                      isSelected
                        ? isDark ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" : "bg-cyan-100 text-cyan-800 border-cyan-200"
                        : isDark ? "bg-white/5 text-zinc-400 border-white/10" : "bg-slate-100 text-slate-600 border-slate-200"
                    )}>
                      {app.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className={cn("text-sm font-bold tracking-tight mb-1", isDark ? "text-white" : "text-slate-900")}>
                      {app.name}
                    </h3>
                    <p className={cn("text-xs leading-relaxed line-clamp-2", isDark ? "text-zinc-400" : "text-slate-500")}>
                      {app.tagline}
                    </p>
                  </div>

                  <div className={cn("mt-3 pt-3 border-t text-[11px] flex items-center justify-between", isDark ? "border-white/5" : "border-slate-100")}>
                    <span className={cn("font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
                      Access: <strong className={isDark ? "text-zinc-200" : "text-slate-700"}>{app.accessProtocol === "SSH" ? "SSH Terminal" : "Web UI"}</strong>
                    </span>
                    {app.accessProtocol === "SSH" ? (
                      <span className={cn("font-semibold flex items-center gap-1", isDark ? "text-cyan-400" : "text-cyan-700")}>
                        <Terminal className="w-3 h-3" /> Direct SSH
                      </span>
                    ) : (
                      <span className={cn("font-semibold flex items-center gap-1", isDark ? "text-cyan-400" : "text-cyan-700")}>
                        Auto SSL <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Choose Template / Compute Tier (Matching Gambar 1 & 2) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={cn("text-base font-bold tracking-tight flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
              <span>2. Choose Template</span>
            </h2>
            <span className={cn("text-xs font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
              Dedicated vCPU & RAM Flavors
            </span>
          </div>

          <div className="space-y-2.5">
            {MANAGED_APP_PLANS.map((plan) => {
              const isSelected = selectedPlan.id === plan.id;
              const templateTitle = `${selectedApp.name} (${plan.planCode})`;
              const templateDesc = `${selectedApp.name} with ${plan.cpuShares} CPU and ${plan.memoryMb >= 1024 ? `${plan.memoryMb / 1024}GB` : `${plan.memoryMb}MB`} RAM`;

              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  className={cn(
                    "relative p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                    isSelected
                      ? isDark
                        ? "bg-cyan-500/10 border-cyan-400 ring-1 ring-cyan-400/40 shadow-md"
                        : "bg-cyan-50/90 border-cyan-500 ring-1 ring-cyan-500/30 shadow-xs"
                      : isDark
                        ? "bg-[#101014] border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.02]"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 shadow-2xs"
                  )}
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    {/* Cloud Icon container matching Gambar 1 */}
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors",
                      isSelected
                        ? isDark ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-400" : "bg-cyan-100 border-cyan-300 text-cyan-700"
                        : isDark ? "bg-white/[0.03] border-white/[0.08] text-zinc-400" : "bg-slate-100 border-slate-200 text-slate-500"
                    )}>
                      <Image
                        src={selectedApp.icon}
                        alt={selectedApp.name}
                        width={22}
                        height={22}
                        className="object-contain"
                        unoptimized
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={cn("text-sm font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                          {templateTitle}
                        </h4>
                      </div>
                      <p className={cn("text-xs leading-relaxed line-clamp-1", isDark ? "text-zinc-400" : "text-slate-500")}>
                        {templateDesc}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-[var(--text-muted)] font-medium flex-wrap">
                        <span className="flex items-center gap-1 whitespace-nowrap shrink-0">
                          <Cpu className="w-3 h-3 text-cyan-400" />
                          {plan.cpuLabel}
                        </span>
                        <span className="shrink-0">•</span>
                        <span className="flex items-center gap-1 whitespace-nowrap shrink-0">
                          <HardDrive className="w-3 h-3 text-cyan-400" />
                          {plan.ramLabel}
                        </span>
                        <span className="shrink-0">•</span>
                        <span className={cn("font-bold whitespace-nowrap shrink-0", isDark ? "text-zinc-200" : "text-slate-800")}>
                          {formatRupiah(plan.monthlyPrice)}/month
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 self-stretch sm:self-auto pt-2 sm:pt-0 border-t sm:border-0 border-inherit">
                    {/* Stock Status Badge */}
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                      isDark
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    )}>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Available
                    </span>

                    {/* Radio circle indicator */}
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                      isSelected
                        ? "border-cyan-400 bg-cyan-400/20 shadow-xs"
                        : isDark ? "border-zinc-600" : "border-slate-300"
                    )}>
                      {isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-xs shadow-cyan-400/60" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 3: Application Configuration */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={cn("text-base font-bold tracking-tight flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
              <span>3. Instance Configuration</span>
            </h2>
          </div>

          <div className={cn(
            "p-5 rounded-2xl border space-y-4",
            isDark ? "bg-[#101014] border-white/[0.08]" : "bg-white border-slate-200 shadow-2xs"
          )}>
            {selectedApp.accessProtocol === "SSH" ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className={cn("text-xs font-bold uppercase tracking-wider block", isDark ? "text-zinc-400" : "text-slate-600")}>
                    App Instance Name *
                  </label>
                  <input
                    type="text"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="e.g. My OpenCode Environment"
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400",
                      isDark
                        ? "bg-[#09090b] border-white/10 text-white placeholder-zinc-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                    )}
                  />
                </div>

                <div className={cn(
                  "p-4 rounded-xl border space-y-3",
                  isDark ? "bg-[#09090b] border-white/10" : "bg-slate-50 border-slate-200"
                )}>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                      <Terminal className="w-4 h-4 text-cyan-400" />
                      <span>Direct SSH Terminal Access</span>
                    </span>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                      isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200"
                    )}>
                      Dedicated Instance
                    </span>
                  </div>
                  <p className={cn("text-xs leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>
                    This application operates as a headless CLI / SSH developer container. A dedicated direct SSH connection will be dynamically assigned upon deployment - no public web domain or HTTPS ingress is assigned.
                  </p>
                  <div className={cn(
                    "p-2.5 rounded-lg border font-mono text-xs flex items-center justify-between",
                    isDark ? "bg-black/60 border-white/5 text-zinc-300" : "bg-white border-slate-200 text-slate-800"
                  )}>
                    <span className="text-zinc-500">Access Mode:</span>
                    <span className="font-semibold text-cyan-400">Direct High-Speed SSH (CLI)</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className={cn("text-xs font-bold uppercase tracking-wider block", isDark ? "text-zinc-400" : "text-slate-600")}>
                      App Instance Name *
                    </label>
                    <input
                      type="text"
                      value={appName}
                      onChange={(e) => setAppName(e.target.value)}
                      placeholder="e.g. My Hermes Agent"
                      className={cn(
                        "w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400",
                        isDark
                          ? "bg-[#09090b] border-white/10 text-white placeholder-zinc-500"
                          : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                      )}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className={cn("text-xs font-bold uppercase tracking-wider block", isDark ? "text-zinc-400" : "text-slate-600")}>
                      Custom Subdomain (Optional)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={customSubdomain}
                        onChange={(e) => setCustomSubdomain(e.target.value)}
                        placeholder={`${selectedApp.id}-production`}
                        className={cn(
                          "w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400 font-mono",
                          isDark
                            ? "bg-[#09090b] border-white/10 text-white placeholder-zinc-500"
                            : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                        )}
                      />
                    </div>
                    <p className={cn("text-[11px] leading-tight mt-1", isDark ? "text-zinc-500" : "text-slate-500")}>
                      Smart conflict resolver: If taken, a unique suffix is automatically assigned.
                    </p>
                  </div>
                </div>

                <div className={cn(
                  "p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5",
                  isDark ? "bg-white/[0.02] border-white/5 text-zinc-400" : "bg-slate-50 border-slate-200 text-slate-600"
                )}>
                  <span className="flex items-center gap-2 shrink-0">
                    <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="whitespace-nowrap font-medium">Target HTTPS URL:</span>
                  </span>
                  <strong className={cn("font-mono font-bold break-all sm:text-right text-xs", isDark ? "text-cyan-400" : "text-cyan-700")}>
                    https://{cleanSubdomain}.app.masdika.id
                  </strong>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar: Deployment Summary (Exact match of Gambar 1 & 2) */}
      <div className="lg:col-span-4 sticky top-6 space-y-4">
        <div className={cn(
          "p-6 rounded-2xl border space-y-6 transition-all",
          isDark
            ? "bg-[#101014] border-white/[0.08] shadow-xl"
            : "bg-white border-slate-200 shadow-sm"
        )}>
          <h3 className={cn("text-base font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Deployment Summary
          </h3>

          <div className="space-y-4 text-xs">
            <div>
              <p className={cn("text-[11px] font-semibold uppercase tracking-wider mb-1", isDark ? "text-zinc-500" : "text-slate-400")}>
                App Type
              </p>
              <p className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>
                {selectedApp.id}
              </p>
            </div>

            <div>
              <p className={cn("text-[11px] font-semibold uppercase tracking-wider mb-1", isDark ? "text-zinc-500" : "text-slate-400")}>
                Template
              </p>
              <p className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>
                {selectedApp.name} ({selectedPlan.planCode})
              </p>
            </div>

            <div>
              <p className={cn("text-[11px] font-semibold uppercase tracking-wider mb-1", isDark ? "text-zinc-500" : "text-slate-400")}>
                Connection Mode
              </p>
              <p className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>
                {selectedApp.accessProtocol === "SSH" ? "Direct SSH (CLI)" : "HTTPS Web (Auto SSL)"}
              </p>
            </div>

            <div>
              <p className={cn("text-[11px] font-semibold uppercase tracking-wider mb-1", isDark ? "text-zinc-500" : "text-slate-400")}>
                Billing Cycle
              </p>
              <p className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>
                Monthly
              </p>
            </div>

            <div className={cn("pt-4 border-t flex items-baseline justify-between", isDark ? "border-white/[0.08]" : "border-slate-200")}>
              <span className={cn("font-semibold text-xs", isDark ? "text-zinc-400" : "text-slate-600")}>
                Cost
              </span>
              <span className={cn("text-base font-black tracking-tight", isDark ? "text-cyan-400" : "text-cyan-700")}>
                {formatRupiah(currentCost)}/month
              </span>
            </div>
          </div>

          {/* Insufficient Balance Alert (Matching user request with high-contrast text in light and dark mode) */}
          {isBalanceInsufficient && (
            <div className={cn(
              "p-3.5 rounded-xl border text-xs space-y-2 transition-colors",
              isDark
                ? "bg-red-500/15 border-red-500/35 text-red-200"
                : "bg-red-50 border-red-300 text-red-950 shadow-xs"
            )}>
              <div className="flex items-start gap-2.5">
                <AlertTriangle className={cn("w-4 h-4 shrink-0 mt-0.5", isDark ? "text-red-400" : "text-red-600")} />
                <div>
                  <p className={cn("font-bold tracking-tight text-xs", isDark ? "text-red-300" : "text-red-900")}>
                    Insufficient Account Balance
                  </p>
                  <p className={cn("text-[11px] mt-0.5 leading-relaxed", isDark ? "text-red-200/90" : "text-red-800")}>
                    Orders require sufficient balance to cover the accumulated monthly commitment of your active services plus this app.
                  </p>
                </div>
              </div>
              <div className={cn("pl-6.5 pt-2 flex items-center justify-between border-t", isDark ? "border-red-500/25" : "border-red-200")}>
                <span className={cn("text-[11px] font-semibold", isDark ? "text-red-200" : "text-red-900")}>
                  Shortfall: <strong className={cn(isDark ? "text-red-300 font-extrabold" : "text-red-700 font-extrabold")}>{formatRupiah(shortfall)}</strong>
                </span>
                <Link
                  href="/dashboard/topup"
                  className={cn(
                    "font-bold underline transition-colors text-xs inline-flex items-center gap-1",
                    isDark ? "text-red-300 hover:text-white" : "text-red-700 hover:text-red-950"
                  )}
                >
                  Top Up Balance →
                </Link>
              </div>
            </div>
          )}

          {/* Deploy Button (Matching Masdika Cyan Brand Theme) */}
          <button
            type="button"
            onClick={handleDeploy}
            disabled={deploying || isBalanceInsufficient}
            className={cn(
              "w-full py-3 px-4 rounded-xl font-bold text-sm text-slate-950 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95",
              isDark
                ? "bg-cyan-400 hover:bg-cyan-300 shadow-cyan-400/20"
                : "bg-cyan-400 hover:bg-cyan-300 shadow-cyan-400/20"
            )}
          >
            <Zap className={cn("w-4 h-4", deploying && "animate-spin")} />
            <span>{deploying ? "Deploying App..." : "Deploy App"}</span>
          </button>

          {selectedApp.accessProtocol === "SSH" ? (
            <div className="space-y-2 pt-2 text-[11px] text-[var(--text-muted)] leading-relaxed">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Direct High-Speed SSH Access</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Isolated Container & Persistent {selectedApp.dataDir} Storage</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2 pt-2 text-[11px] text-[var(--text-muted)] leading-relaxed">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Automated Let&apos;s Encrypt SSL on Ingress</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Dedicated Isolated Container & SSD storage</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
