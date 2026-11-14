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
import { OFFICIAL_DATABASE_PLANS } from "@/lib/database-plans";

const STORAGE_PRESETS = [1, 2, 5, 10, 15, 20];

interface DatabaseScaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  database: {
    id: number;
    name: string;
    type: string;
    version: string;
    planName?: string;
    cpuShares: number;
    memoryMb: number;
    storageGb: number;
    monthlyPrice?: number;
    hourlyRate?: number;
    status: string;
  };
  onSuccess: () => void;
  isDark: boolean;
}

export function DatabaseScaleModal({
  isOpen,
  onClose,
  database,
  onSuccess,
  isDark,
}: DatabaseScaleModalProps) {
  const currentPlanName = database.planName || "Shared Database";
  const currentStorage = database.storageGb || 1;
  const currentMonthly = database.monthlyPrice || Math.round((database.hourlyRate || 0) * 720);

  // Match initial flavor from database planName
  const initialPlan = OFFICIAL_DATABASE_PLANS.find(
    (p) =>
      currentPlanName.toLowerCase().startsWith(p.name.toLowerCase()) ||
      (p.limits.shared && currentPlanName.toLowerCase().includes("shared"))
  ) || OFFICIAL_DATABASE_PLANS[0];

  const [selectedPlanName, setSelectedPlanName] = useState(initialPlan.name);
  const [selectedStorageGb, setSelectedStorageGb] = useState(currentStorage);
  const [submitting, setSubmitting] = useState(false);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [activeCommitment, setActiveCommitment] = useState<number>(0);
  const [loadingBilling, setLoadingBilling] = useState(true);

  // Fetch billing commitment on modal open
  useEffect(() => {
    if (!isOpen) return;
    setLoadingBilling(true);
    fetch("/api/user/billing")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setUserBalance(data.user.balance || 0);
        }
        if (data?.commitment) {
          setActiveCommitment(data.commitment.totalMonthly || 0);
        }
      })
      .catch((err) => console.error("Error fetching billing in scale modal:", err))
      .finally(() => setLoadingBilling(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedPlan = OFFICIAL_DATABASE_PLANS.find(
    (p) => p.name === selectedPlanName
  ) || OFFICIAL_DATABASE_PLANS[0];

  const isShared = selectedPlan.limits.shared;

  // Calculate new pricing
  let newMonthlyPrice = 10000;
  if (isShared) {
    newMonthlyPrice = selectedStorageGb * 10000;
  } else {
    newMonthlyPrice = selectedPlan.price + selectedStorageGb * 5000;
  }
  const newHourlyRate = Math.max(1, Math.ceil(newMonthlyPrice / 720));

  // Commitment & required balance calculation
  const requiredBalance = Math.max(
    newMonthlyPrice,
    activeCommitment - currentMonthly + newMonthlyPrice
  );
  const isBalanceInsufficient = userBalance < requiredBalance;
  const shortfall = Math.max(0, requiredBalance - userBalance);

  // Check if target specs are identical to current
  const isPlanSame =
    currentPlanName.toLowerCase().startsWith(selectedPlan.name.toLowerCase()) ||
    (isShared && currentPlanName.toLowerCase().includes("shared"));
  const isStorageSame = selectedStorageGb === currentStorage;
  const isIdentical = isPlanSame && isStorageSame;

  const handleScaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isIdentical || isBalanceInsufficient || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/user/database/${database.id}/upgrade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planName: selectedPlan.name,
          storageGb: selectedStorageGb,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to scale database instance");
      }

      toast.success(data.message || "Database scaled successfully! Zero data loss guaranteed.");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Scaling failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        onClick={() => !submitting && onClose()}
      />

      <div
        className={cn(
          "relative border rounded-2xl w-full max-w-2xl my-6 p-5 sm:p-6 overflow-hidden shadow-2xl z-10 transition-all",
          isDark
            ? "bg-[#0c0c0e] border-white/10 text-white"
            : "bg-white border-slate-200 text-slate-900"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center border shrink-0",
                isDark
                  ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                  : "bg-cyan-50 border-cyan-200 text-cyan-600"
              )}
            >
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight">
                Scale & Upgrade Database
              </h3>
              <p className={cn("text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>
                Scale compute capacity and expand persistent storage with zero data loss.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className={cn(
              "p-2 rounded-xl transition-colors cursor-pointer",
              isDark
                ? "text-zinc-400 hover:text-white hover:bg-white/5"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleScaleSubmit} className="space-y-5 pt-4">
          {/* Current Specification Callout */}
          <div
            className={cn(
              "p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs",
              isDark ? "bg-[#111115] border-white/[0.06]" : "bg-slate-50 border-slate-200"
            )}
          >
            <div>
              <span className={cn("text-[10px] font-bold uppercase tracking-wider block", isDark ? "text-zinc-500" : "text-slate-400")}>
                Current Allocation ({database.name})
              </span>
              <span className="font-semibold text-sm">
                {currentPlanName} • {currentStorage} GB SSD
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn("px-2.5 py-1 rounded-lg border font-mono font-bold", isDark ? "bg-white/[0.03] border-white/10 text-cyan-300" : "bg-white border-slate-200 text-slate-700")}>
                {database.cpuShares} vCPU / {database.memoryMb >= 1024 ? `${database.memoryMb / 1024} GB` : `${database.memoryMb} MB`} RAM
              </span>
              <span className="font-mono text-xs font-bold text-cyan-400">
                Rp {currentMonthly.toLocaleString("id-ID")}/mo
              </span>
            </div>
          </div>

          {/* Step 1: Select Compute Flavor */}
          <div>
            <label className={cn("block text-xs font-bold uppercase tracking-wider mb-2", isDark ? "text-zinc-400" : "text-slate-600")}>
              1. Choose Compute Flavor (vCPU & RAM)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {OFFICIAL_DATABASE_PLANS.map((plan) => {
                const isSelected = selectedPlanName === plan.name;
                const isPlanCurrent = currentPlanName.toLowerCase().startsWith(plan.name.toLowerCase());
                return (
                  <button
                    key={plan.name}
                    type="button"
                    onClick={() => setSelectedPlanName(plan.name)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer",
                      isSelected
                        ? (isDark
                            ? "bg-cyan-500/10 border-cyan-400 ring-1 ring-cyan-400/30 text-white"
                            : "bg-cyan-50 border-cyan-400 ring-1 ring-cyan-400/20 text-slate-950")
                        : (isDark
                            ? "bg-[#111115] border-white/[0.06] hover:border-white/20 text-zinc-300"
                            : "bg-white border-slate-200 hover:border-slate-300 text-slate-700 shadow-2xs")
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-xs truncate">
                          {plan.limits.shared ? "Shared Database" : plan.name.replace("Dedicated ", "")}
                        </span>
                        {isPlanCurrent && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-zinc-500/20 text-zinc-400 border border-zinc-500/30">
                            Current
                          </span>
                        )}
                        {isSelected && !isPlanCurrent && (
                          <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-medium opacity-80">
                        <Cpu className="w-3 h-3 text-cyan-400" />
                        <span>{plan.limits.cpu} • {plan.limits.ram}</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-white/[0.06] text-[11px] font-mono font-bold text-cyan-400">
                      {plan.limits.shared ? "Rp 10.000/GB" : `Rp ${plan.price.toLocaleString("id-ID")}/mo base`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Storage Size (Max 20 GB matching initial checkout) */}
          <div>
            <div className="mb-2">
              <label className={cn("text-xs font-bold uppercase tracking-wider block", isDark ? "text-zinc-400" : "text-slate-600")}>
                2. Storage Size (SATA SSD)
              </label>
              <p className={cn("text-[11px] mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                Freely adjustable, billed per GB on top of the flavor price above.
              </p>
            </div>

            <div className={cn("p-4 rounded-xl border space-y-3.5", isDark ? "bg-[#111115] border-white/[0.06]" : "bg-slate-50 border-slate-200")}>
              <div className="flex items-center justify-between">
                <span className={cn("text-sm font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                  <span>Storage:</span>
                  <span className="text-cyan-400 font-mono text-base">{selectedStorageGb} GB</span>
                </span>
                <span className={cn("text-xs font-semibold", isDark ? "text-zinc-500" : "text-slate-500")}>
                  Max: 20 GB
                </span>
              </div>

              {/* Range Slider */}
              <div className="relative py-1">
                <input
                  type="range"
                  min={currentStorage}
                  max={20}
                  step={1}
                  value={selectedStorageGb}
                  onChange={(e) => setSelectedStorageGb(Math.max(currentStorage, Math.min(20, parseInt(e.target.value, 10) || currentStorage)))}
                  className="w-full h-2.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 transition-all"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("text-[11px] font-bold uppercase tracking-wider mr-1", isDark ? "text-zinc-500" : "text-slate-400")}>
                  Presets:
                </span>
                {STORAGE_PRESETS.map((preset) => {
                  const isDisabled = preset < currentStorage;
                  const isSelected = selectedStorageGb === preset;
                  return (
                    <button
                      type="button"
                      key={preset}
                      disabled={isDisabled}
                      onClick={() => setSelectedStorageGb(preset)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border",
                        isSelected
                          ? "bg-cyan-400 text-slate-950 border-cyan-400 shadow-xs cursor-pointer"
                          : isDisabled
                          ? (isDark
                              ? "bg-white/[0.02] text-zinc-600 border-white/[0.04] cursor-not-allowed opacity-35"
                              : "bg-slate-100/60 text-slate-400 border-slate-200/60 cursor-not-allowed opacity-45")
                          : isDark
                          ? "bg-white/[0.03] text-zinc-400 border-white/[0.08] hover:text-white hover:bg-white/[0.06] cursor-pointer"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 cursor-pointer"
                      )}
                      title={isDisabled ? `Cannot downgrade below current storage (${currentStorage} GB)` : undefined}
                    >
                      {preset} GB
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-500 font-mono pt-0.5">
                <span>{currentStorage} GB</span>
                <span>20 GB</span>
              </div>

              <div className={cn("pt-2 text-xs border-t border-white/[0.06] flex items-center justify-between", isDark ? "text-zinc-400" : "text-slate-600")}>
                <span>
                  {isShared ? "Rp 10.000/GB/month" : "Rp 5.000/GB/month"} · Storage cost:{" "}
                  <strong className="text-cyan-400 font-mono">
                    Rp {(selectedStorageGb * (isShared ? 10000 : 5000)).toLocaleString("id-ID")}/month
                  </strong>
                </span>
                {currentStorage > 1 && (
                  <span className={cn("text-[10px] italic", isDark ? "text-zinc-500" : "text-slate-400")}>
                    (Min: {currentStorage} GB)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Zero Data Loss Guarantee Banner */}
          <div
            className={cn(
              "p-3 rounded-xl border flex items-start gap-2.5 text-xs",
              isDark
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                : "bg-emerald-50 border-emerald-200 text-emerald-900"
            )}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-snug">
              <strong>Zero Data Loss Guarantee:</strong> Your persistent storage volume (PVC) and existing databases remain completely intact. The container pod will perform a rolling restart in ~5-10 seconds to apply the upgraded vCPU, RAM, and storage limits.
            </p>
          </div>

          {/* Pricing Breakdown & Balance Verification */}
          <div className={cn("p-4 rounded-xl border space-y-2 text-xs", isDark ? "bg-[#111115] border-white/[0.06]" : "bg-slate-50 border-slate-200")}>
            <div className="flex items-center justify-between">
              <span className={isDark ? "text-zinc-400" : "text-slate-600"}>New Database Price:</span>
              <span className="font-mono font-bold text-sm text-cyan-400">
                Rp {newMonthlyPrice.toLocaleString("id-ID")}/mo (~Rp {newHourlyRate}/hr)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={isDark ? "text-zinc-400" : "text-slate-600"}>Current Monthly Burn:</span>
              <span className={cn("font-mono font-medium", isDark ? "text-zinc-300" : "text-slate-700")}>
                Rp {currentMonthly.toLocaleString("id-ID")}/mo
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-white/[0.06] pt-2">
              <span className={isDark ? "text-zinc-400" : "text-slate-600"}>Your Current Balance:</span>
              <span className={cn("font-mono font-bold", isBalanceInsufficient ? "text-red-400" : "text-emerald-400")}>
                {loadingBilling ? "..." : `Rp ${userBalance.toLocaleString("id-ID")}`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={isDark ? "text-zinc-400" : "text-slate-600"}>Total Required Balance:</span>
              <span className={cn("font-mono font-bold", isBalanceInsufficient ? "text-red-400" : (isDark ? "text-cyan-400" : "text-cyan-600"))}>
                Rp {requiredBalance.toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          {/* Insufficient Balance Alert (High Contrast Fix) */}
          {isBalanceInsufficient && (
            <div
              className={cn(
                "p-3.5 rounded-xl border text-xs space-y-1.5 transition-colors",
                isDark
                  ? "bg-red-500/10 border-red-500/25 text-red-300"
                  : "bg-red-50/90 border-red-200 text-slate-800 shadow-2xs"
              )}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className={cn("w-4 h-4 shrink-0 mt-0.5", isDark ? "text-red-400" : "text-red-600")} />
                <div>
                  <p className={cn("font-bold tracking-tight", isDark ? "text-red-300" : "text-red-700")}>
                    Insufficient Account Balance for Upgrade
                  </p>
                  <p className={cn("text-[11px] mt-0.5 leading-relaxed", isDark ? "text-zinc-300" : "text-slate-600")}>
                    Upgrading requires sufficient balance to cover the accumulated commitment of your active services with this upgraded database.
                  </p>
                </div>
              </div>
              <div className={cn("pl-6 pt-1.5 flex items-center justify-between border-t", isDark ? "border-red-500/20" : "border-red-200/80")}>
                <span className={cn("text-[11px] font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>
                  Shortfall: <strong className={cn(isDark ? "text-red-300" : "text-red-600")}>Rp {shortfall.toLocaleString("id-ID")}</strong>
                </span>
                <Link
                  href="/dashboard/topup"
                  className={cn(
                    "font-bold underline transition-colors text-xs",
                    isDark ? "text-red-300 hover:text-white" : "text-red-600 hover:text-red-800"
                  )}
                >
                  Top Up Balance →
                </Link>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className={cn(
                "px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                isDark
                  ? "border-white/10 hover:bg-white/5 text-zinc-300"
                  : "border-slate-200 hover:bg-slate-100 text-slate-700"
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || isIdentical || isBalanceInsufficient}
              className={cn(
                "px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
                "bg-cyan-400 hover:bg-cyan-300 active:scale-95 text-slate-950 shadow-cyan-500/20"
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Scaling Database Pod...</span>
                </>
              ) : isIdentical ? (
                <span>No Changes Selected</span>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Confirm & Scale Database</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
