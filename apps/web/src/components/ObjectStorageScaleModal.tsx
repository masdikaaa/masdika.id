'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  HardDrive,
  Database,
  KeyRound,
  AlertTriangle,
  Loader2,
  X,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface ObjectStoragePlanOption {
  id: string;
  name: string;
  storageGb: number;
  monthlyPrice: number;
  hourlyRate: number;
  maxBuckets?: number;
  maxKeys?: number;
  isPopular?: boolean;
}

export interface ObjectStorageClusterCapacity {
  available: boolean;
  totalPoolGb: number;
  allocatedGb: number;
  freeGb: number;
  reason?: string;
}

interface ObjectStorageScaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: {
    id: number;
    name: string;
    planName: string;
    storageGb: number;
    monthlyPrice?: number;
    hourlyRate?: number;
    usedBytes?: number;
    bucketsCount?: number;
    keysCount?: number;
  };
  plans: ObjectStoragePlanOption[];
  capacity: ObjectStorageClusterCapacity | null;
  onSuccess: () => void;
  isDark: boolean;
}

function formatRupiah(amount: number): string {
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
}

export function ObjectStorageScaleModal({
  isOpen,
  onClose,
  service,
  plans,
  capacity,
  onSuccess,
  isDark,
}: ObjectStorageScaleModalProps) {
  const [selectedStorageGb, setSelectedStorageGb] = useState<number>(service.storageGb);
  const [submitting, setSubmitting] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [activeCommitment, setActiveCommitment] = useState(0);
  const [loadingBilling, setLoadingBilling] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedStorageGb(service.storageGb);
    setLoadingBilling(true);
    fetch('/api/user/billing')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.data?.balance !== undefined) {
          setUserBalance(data.data.balance);
        } else if (data?.user?.balance !== undefined) {
          setUserBalance(data.user.balance);
        }
        if (data?.data?.commitment?.totalMonthly !== undefined) {
          setActiveCommitment(data.data.commitment.totalMonthly);
        } else if (data?.commitment?.totalMonthly !== undefined) {
          setActiveCommitment(data.commitment.totalMonthly);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingBilling(false));
  }, [isOpen, service.storageGb]);

  if (!isOpen) return null;

  const currentMonthly = service.monthlyPrice || Math.round((service.hourlyRate || 0) * 720);
  const targetPlan = plans.find((p) => p.storageGb === selectedStorageGb) || plans[0];
  const targetMonthly = targetPlan ? targetPlan.monthlyPrice : currentMonthly;
  const diffMonthly = targetMonthly - currentMonthly;
  const isIdentical = selectedStorageGb === service.storageGb;

  const requiredBalance = Math.max(
    targetMonthly,
    activeCommitment - currentMonthly + targetMonthly
  );
  const isBalanceInsufficient = !loadingBilling && diffMonthly > 0 && userBalance < requiredBalance;
  const shortfall = Math.max(0, requiredBalance - userBalance);

  const deltaGb = Math.max(0, selectedStorageGb - service.storageGb);
  const hasCapacityForTarget =
    deltaGb === 0 || !capacity
      ? true
      : capacity.available && capacity.freeGb >= deltaGb;

  const handleScaleSubmit = async () => {
    if (isIdentical) {
      toast.info('Target tier is identical to your current tier.');
      return;
    }
    if (!hasCapacityForTarget) {
      toast.error(capacity?.reason || 'Cluster capacity full for this tier.');
      return;
    }
    if (isBalanceInsufficient) {
      toast.error(`Insufficient balance. Please top up at least ${formatRupiah(shortfall)} before upgrading.`);
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading(`Scaling ${service.name} to ${targetPlan?.name || `${selectedStorageGb} GB`}...`);
    try {
      const res = await fetch(`/api/user/object-storage/${service.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storageGb: selectedStorageGb }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to scale Object Storage.');
      }

      toast.success(`Successfully scaled ${service.name} to ${targetPlan?.name || `${selectedStorageGb} GB`}! Zero data loss applied.`, {
        id: toastId,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Scale operation failed.', { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={cn(
          'w-full max-w-2xl rounded-2xl border p-6 space-y-6 shadow-2xl relative max-h-[92vh] overflow-y-auto',
          isDark
            ? 'bg-[#101014] border-white/[0.08] text-white'
            : 'bg-white border-slate-200 text-slate-900 shadow-xl'
        )}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className={cn(
            'absolute top-5 right-5 p-2 rounded-xl transition-colors cursor-pointer',
            isDark
              ? 'text-zinc-400 hover:text-white hover:bg-white/5'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          )}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pr-8">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Scale Object Storage</h2>
            <p className={cn('text-xs font-medium', isDark ? 'text-zinc-400' : 'text-slate-500')}>
              Seamlessly upgrade storage quota &amp; limits for <strong>{service.name}</strong> ({service.planName}) without data loss.
            </p>
          </div>
        </div>

        {/* Zero Data Loss Guarantee Banner */}
        <div
          className={cn(
            'p-3.5 rounded-xl border text-xs flex items-start gap-2.5',
            isDark ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300' : 'bg-cyan-50 border-cyan-200 text-cyan-900'
          )}
        >
          <ShieldCheck className={cn('w-4 h-4 shrink-0 mt-0.5', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
          <div className="space-y-0.5">
            <p className="font-bold">Zero-Data-Loss Rolling Upgrade</p>
            <p className="text-[11px] opacity-90 leading-relaxed">
              Your existing buckets, objects, and S3 IAM Access Keys remain completely intact and untouched. Quotas update immediately with zero downtime.
            </p>
          </div>
        </div>

        {/* Select Target Storage Tier */}
        <div className="space-y-3">
          <label className={cn('text-xs font-bold uppercase tracking-wider block', isDark ? 'text-zinc-400' : 'text-slate-600')}>
            Select Target Storage Tier
          </label>

          <div className="space-y-2">
            {plans.map((plan) => {
              const isSelected = selectedStorageGb === plan.storageGb;
              const isCurrent = service.storageGb === plan.storageGb;
              const planDeltaGb = Math.max(0, plan.storageGb - service.storageGb);
              const planHasCap =
                planDeltaGb === 0 || !capacity
                  ? true
                  : capacity.available && capacity.freeGb >= planDeltaGb;
              const usedExceedsPlan = (service.usedBytes || 0) > plan.storageGb * 1024 * 1024 * 1024;
              const bucketsExceedPlan =
                plan.maxBuckets !== undefined && plan.maxBuckets > 0 && (service.bucketsCount || 0) > plan.maxBuckets;
              const keysExceedPlan =
                plan.maxKeys !== undefined && plan.maxKeys > 0 && (service.keysCount || 0) > plan.maxKeys;
              const isDisabled = !planHasCap || usedExceedsPlan || bucketsExceedPlan || keysExceedPlan;

              return (
                <div
                  key={plan.id}
                  onClick={() => !isDisabled && setSelectedStorageGb(plan.storageGb)}
                  className={cn(
                    'p-3.5 rounded-xl border transition-all flex items-center justify-between gap-4',
                    isDisabled
                      ? isDark
                        ? 'bg-[#141419]/60 border-white/5 opacity-50 cursor-not-allowed'
                        : 'bg-slate-100 border-slate-200 opacity-55 cursor-not-allowed'
                      : isSelected
                        ? isDark
                          ? 'bg-cyan-500/10 border-cyan-400 ring-1 ring-cyan-400/30 cursor-pointer'
                          : 'bg-cyan-50/90 border-cyan-500 ring-1 ring-cyan-500/30 cursor-pointer'
                        : isDark
                          ? 'bg-[#141419] border-white/5 hover:border-white/10 hover:bg-white/[0.02] cursor-pointer'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-white cursor-pointer'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                        isSelected ? 'border-cyan-400 bg-cyan-400/20' : isDark ? 'border-zinc-600' : 'border-slate-300'
                      )}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm">{plan.name}</span>
                        {isCurrent && (
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                              isDark ? 'bg-white/10 text-zinc-300 border-white/10' : 'bg-slate-200 text-slate-700 border-slate-300'
                            )}
                          >
                            Current Tier
                          </span>
                        )}
                        {plan.isPopular && !isCurrent && (
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                              isDark ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' : 'bg-cyan-100 text-cyan-700 border-cyan-200'
                            )}
                          >
                            Recommended
                          </span>
                        )}
                      </div>

                      <div className={cn('flex items-center gap-3 mt-1 text-[11px] font-medium flex-wrap', isDark ? 'text-zinc-400' : 'text-slate-500')}>
                        <span className="flex items-center gap-1 whitespace-nowrap shrink-0">
                          <HardDrive className={cn('w-3 h-3', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
                          {plan.storageGb} GB SSD
                        </span>
                        {plan.maxBuckets !== undefined && (
                          <span className="flex items-center gap-1 whitespace-nowrap shrink-0">
                            <Database className={cn('w-3 h-3', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
                            {plan.maxBuckets === -1 ? 'Unlimited Buckets' : `${plan.maxBuckets} Buckets`}
                          </span>
                        )}
                        {plan.maxKeys !== undefined && (
                          <span className="flex items-center gap-1 whitespace-nowrap shrink-0">
                            <KeyRound className={cn('w-3 h-3', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
                            {plan.maxKeys === -1 ? 'Unlimited Keys' : `${plan.maxKeys} S3 Keys`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold font-mono">
                      {formatRupiah(plan.monthlyPrice)}
                      <span className={cn('text-[10px] font-normal', isDark ? 'text-zinc-400' : 'text-slate-500')}>/mo</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] font-semibold">
                      {planHasCap ? (
                        <span className={isDark ? 'text-emerald-400' : 'text-emerald-600'}>• Available</span>
                      ) : (
                        <span className={isDark ? 'text-red-400' : 'text-red-600'}>• Cluster Capacity Full</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pricing Comparison Box */}
        <div
          className={cn(
            'p-4 rounded-xl border space-y-2 text-xs',
            isDark ? 'bg-[#0a0a0c] border-white/[0.06]' : 'bg-slate-50 border-slate-200'
          )}
        >
          <div className="flex items-center justify-between">
            <span className={isDark ? 'text-zinc-400' : 'text-slate-600'}>Current Tier ({service.planName}):</span>
            <span className="font-mono font-semibold">{formatRupiah(currentMonthly)}/month</span>
          </div>
          <div className="flex items-center justify-between">
            <span className={isDark ? 'text-zinc-400' : 'text-slate-600'}>Target Tier ({targetPlan?.name || `${selectedStorageGb} GB`}):</span>
            <span className="font-mono font-semibold">{formatRupiah(targetMonthly)}/month</span>
          </div>
          <div className={cn('pt-2 border-t flex items-center justify-between font-bold', isDark ? 'border-white/[0.06]' : 'border-slate-200')}>
            <span>Net Price Adjustment:</span>
            <span className={cn('font-mono', diffMonthly > 0 ? (isDark ? 'text-cyan-400' : 'text-cyan-600') : diffMonthly < 0 ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : '')}>
              {diffMonthly === 0
                ? 'No Change'
                : `${diffMonthly > 0 ? '+' : '-'}${formatRupiah(Math.abs(diffMonthly))}/month`}
            </span>
          </div>
        </div>

        {isBalanceInsufficient && (
          <div
            className={cn(
              'p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2',
              isDark ? 'bg-red-500/15 border-red-500/35 text-red-200' : 'bg-red-50 border-red-300 text-red-900'
            )}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className={cn('w-4 h-4 shrink-0', isDark ? 'text-red-400' : 'text-red-600')} />
              <span>
                Insufficient account balance for upgrade. Shortfall: <strong>{formatRupiah(shortfall)}</strong>
              </span>
            </div>
            <Link
              href="/dashboard/topup"
              className={cn('font-bold underline shrink-0', isDark ? 'text-red-300 hover:text-white' : 'text-red-700 hover:text-red-950')}
            >
              Top Up Balance →
            </Link>
          </div>
        )}

        {/* Footer Actions */}
        <div className={cn('flex items-center justify-end gap-3 pt-2 border-t', isDark ? 'border-white/[0.08]' : 'border-slate-200')}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer',
              isDark ? 'bg-white/[0.04] border-white/[0.08] text-zinc-300 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleScaleSubmit}
            disabled={submitting || isIdentical || isBalanceInsufficient || !hasCapacityForTarget}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Upgrading...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                <span>Upgrade Storage</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
