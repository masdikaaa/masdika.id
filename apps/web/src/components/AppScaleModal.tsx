"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Cpu,
  HardDrive,
  Check,
  AlertTriangle,
  Loader2,
  X,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  MANAGED_APP_PLANS,
  ManagedAppPlanDefinition,
  getAppDefinition,
  getAppPlan,
  formatRupiah,
} from "@/lib/app-catalog";

interface AppScaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  app: {
    id: number;
    name: string;
    appType: string;
    planName: string;
    cpuShares: number;
    memoryMb: number;
    monthlyPrice: number;
    hourlyRate: number;
    status: string;
  };
  onSuccess: () => void;
  isDark: boolean;
}

export function AppScaleModal({
  isOpen,
  onClose,
  app,
  onSuccess,
  isDark,
}: AppScaleModalProps) {
  const currentPlan = getAppPlan(app.planName) || MANAGED_APP_PLANS[1];
  const [selectedPlanCode, setSelectedPlanCode] = useState(currentPlan.planCode);
  const [submitting, setSubmitting] = useState(false);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [activeCommitment, setActiveCommitment] = useState<number>(0);
  const [loadingBilling, setLoadingBilling] = useState(true);

  // Sync when app changes
  useEffect(() => {
    setSelectedPlanCode(app.planName || "1C2G");
  }, [app.planName]);

  // Fetch billing commitment on modal open
  useEffect(() => {
    if (!isOpen) return;
    setLoadingBilling(true);
    Promise.all([
      fetch("/api/user/profile").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/user/commitment").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([profileData, commitmentData]) => {
        if (profileData?.user) {
          setUserBalance(profileData.user.balance || 0);
        }
        if (commitmentData?.totalMonthly !== undefined) {
          setActiveCommitment(commitmentData.totalMonthly);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingBilling(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const targetPlan = getAppPlan(selectedPlanCode) || currentPlan;
  const catalogItem = getAppDefinition(app.appType);

  const currentMonthly = app.monthlyPrice || currentPlan.monthlyPrice;
  const newMonthly = targetPlan.monthlyPrice;
  const diffMonthly = newMonthly - currentMonthly;

  const isIdentical =
    targetPlan.planCode.toUpperCase() === (app.planName || "").toUpperCase() &&
    Math.abs(app.cpuShares - targetPlan.cpuShares) < 0.05 &&
    app.memoryMb === targetPlan.memoryMb;

  // Total required balance to maintain commitment
  const requiredBalance = activeCommitment - currentMonthly + newMonthly;
  const isBalanceInsufficient = !loadingBilling && diffMonthly > 0 && userBalance < requiredBalance;
  const shortfall = Math.max(0, requiredBalance - userBalance);

  const handleScaleSubmit = async () => {
    if (isIdentical) {
      toast.info("Target specifications are identical to current specifications.");
      return;
    }

    if (isBalanceInsufficient) {
      toast.error(
        `Insufficient balance. Please top up at least ${formatRupiah(shortfall)} before upgrading.`
      );
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading(
      `Scaling ${app.name} to ${targetPlan.planCode} (${targetPlan.cpuLabel}, ${targetPlan.ramLabel})...`
    );

    try {
      const res = await fetch(`/api/user/apps/${app.id}/upgrade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planCode: targetPlan.planCode,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to scale application.");
      }

      toast.success(
        `Successfully scaled ${app.name} to ${targetPlan.planCode}! Zero data loss applied.`,
        { id: toastId }
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Scale operation failed.", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={cn(
          "w-full max-w-2xl rounded-2xl border p-6 space-y-6 shadow-2xl relative max-h-[92vh] overflow-y-auto",
          isDark
            ? "bg-[#101014] border-white/[0.08] text-white"
            : "bg-white border-slate-200 text-slate-900 shadow-xl"
        )}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={submitting}
          className={cn(
            "absolute top-5 right-5 p-2 rounded-xl transition-colors cursor-pointer",
            isDark
              ? "text-zinc-400 hover:text-white hover:bg-white/5"
              : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          )}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">
              Scale Compute Resources
            </h2>
            <p className={cn("text-xs font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
              Seamlessly upgrade vCPU & RAM for <strong>{app.name}</strong> ({catalogItem?.name || app.appType}) without data loss.
            </p>
          </div>
        </div>

        {/* Zero Data Loss Guarantee Banner */}
        <div className={cn(
          "p-3.5 rounded-xl border text-xs flex items-start gap-2.5",
          isDark
            ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-300"
            : "bg-cyan-50 border-cyan-200 text-cyan-900"
        )}>
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-cyan-400" />
          <div className="space-y-0.5">
            <p className="font-bold">Zero-Data-Loss Rolling Upgrade</p>
            <p className="text-[11px] opacity-90 leading-relaxed">
              Your application container compute limits are updated dynamically on the cluster. Storage volumes remain safely attached and untouched.
            </p>
          </div>
        </div>

        {/* Plan Flavors Selection Grid */}
        <div className="space-y-3">
          <label className={cn("text-xs font-bold uppercase tracking-wider block", isDark ? "text-zinc-400" : "text-slate-600")}>
            Select Target Compute Tier
          </label>

          <div className="space-y-2">
            {MANAGED_APP_PLANS.map((plan) => {
              const isSelected = selectedPlanCode.toUpperCase() === plan.planCode.toUpperCase();
              const isCurrent = (app.planName || "").toUpperCase() === plan.planCode.toUpperCase();

              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlanCode(plan.planCode)}
                  className={cn(
                    "p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4",
                    isSelected
                      ? isDark
                        ? "bg-cyan-500/10 border-cyan-400 ring-1 ring-cyan-400/30"
                        : "bg-cyan-50/90 border-cyan-500 ring-1 ring-cyan-500/30"
                      : isDark
                        ? "bg-[#141419] border-white/5 hover:border-white/10 hover:bg-white/[0.02]"
                        : "bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-white"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                      isSelected ? "border-cyan-400 bg-cyan-400/20" : isDark ? "border-zinc-600" : "border-slate-300"
                    )}>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm">
                          {catalogItem?.name || app.appType} ({plan.planCode})
                        </span>
                        {isCurrent && (
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                            isDark ? "bg-white/10 text-zinc-300 border-white/10" : "bg-slate-200 text-slate-700 border-slate-300"
                          )}>
                            Current Tier
                          </span>
                        )}
                        {plan.isPopular && !isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                            Recommended
                          </span>
                        )}
                      </div>

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
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm">
                      {formatRupiah(plan.monthlyPrice)}<span className="text-[11px] font-normal text-[var(--text-muted)]">/mo</span>
                    </p>
                    <p className={cn("text-[10px] font-semibold flex items-center justify-end gap-1", isDark ? "text-emerald-400" : "text-emerald-700")}>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Available
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Price Difference Summary Card */}
        <div className={cn(
          "p-4 rounded-xl border space-y-2 text-xs",
          isDark ? "bg-[#141419] border-white/5" : "bg-slate-50 border-slate-200"
        )}>
          <div className="flex items-center justify-between">
            <span className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>Current Tier ({app.planName}):</span>
            <span className="font-semibold">{formatRupiah(currentMonthly)}/month</span>
          </div>
          <div className="flex items-center justify-between">
            <span className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>Target Tier ({targetPlan.planCode}):</span>
            <span className="font-semibold">{formatRupiah(newMonthly)}/month</span>
          </div>
          <div className={cn("pt-2 border-t flex items-center justify-between font-bold text-sm", isDark ? "border-white/5" : "border-slate-200")}>
            <span>Net Price Adjustment:</span>
            <span className={cn(
              diffMonthly > 0
                ? isDark ? "text-cyan-400" : "text-cyan-700"
                : diffMonthly < 0
                ? isDark ? "text-emerald-400" : "text-emerald-600"
                : isDark ? "text-zinc-400" : "text-slate-600"
            )}>
              {diffMonthly > 0 ? `+${formatRupiah(diffMonthly)}/month` : diffMonthly < 0 ? `-${formatRupiah(Math.abs(diffMonthly))}/month` : "No Change"}
            </span>
          </div>
        </div>

        {/* Insufficient Account Balance Alert */}
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
                  Upgrading requires sufficient balance to cover your accumulated monthly services commitment.
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

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className={cn(
              "px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer disabled:opacity-50",
              isDark
                ? "border-white/10 hover:bg-white/5 text-zinc-300"
                : "border-slate-300 hover:bg-slate-100 text-slate-700"
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleScaleSubmit}
            disabled={submitting || isIdentical || isBalanceInsufficient}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-bold text-slate-950 transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95",
              isDark
                ? "bg-cyan-400 hover:bg-cyan-300 shadow-cyan-400/20"
                : "bg-cyan-400 hover:bg-cyan-300 shadow-cyan-400/20"
            )}
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Applying Scale...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                <span>Confirm & Scale App</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
