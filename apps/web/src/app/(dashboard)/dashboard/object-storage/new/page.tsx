'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/ThemeProvider';
import { toast } from 'sonner';
import {
  ChevronLeft,
  MapPin,
  HardDrive,
  Database,
  KeyRound,
  AlertTriangle,
  Rocket,
  Loader2,
  RefreshCw,
  Check,
} from 'lucide-react';

interface StorageClusterCapacity {
  available: boolean;
  totalPoolGb: number;
  allocatedGb: number;
  freeGb: number;
  reason?: string;
}

interface StoragePlan {
  id: string;
  name: string;
  description?: string;
  storageGb: number;
  monthlyPrice: number;
  hourlyRate: number;
  maxBuckets?: number;
  maxKeys?: number;
  isPopular?: boolean;
}

function formatRupiah(amount: number): string {
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
}

export default function NewObjectStoragePage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [plans, setPlans] = useState<StoragePlan[]>([]);
  const [selectedPlanGb, setSelectedPlanGb] = useState<number>(10);
  const [serviceName, setServiceName] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [capacity, setCapacity] = useState<StorageClusterCapacity | null>(null);

  const [userBalance, setUserBalance] = useState(0);
  const [activeCommitment, setActiveCommitment] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/user/object-storage').then((r) => r.json()),
      fetch('/api/public/plans').then((r) => r.json()),
      fetch('/api/user/object-storage/capacity').then((r) => r.json()).catch(() => null),
    ])
      .then(([objRes, pubRes, capRes]) => {
        setEnabled(Boolean(objRes.enabled));
        const capData: StorageClusterCapacity | null = capRes?.data || null;
        if (capData) setCapacity(capData);

        const pubObjPlans = Array.isArray(pubRes?.data)
          ? pubRes.data.filter((p: any) => p.service === 'OBJECT_STORAGE')
          : [];

        const fitsCapacity = (gb: number) =>
          capData ? capData.available && capData.freeGb >= gb : true;

        if (pubObjPlans.length > 0) {
          const mapped: StoragePlan[] = pubObjPlans.map((p: any) => {
            let limits: any = {};
            try {
              limits = JSON.parse(p.limits || '{}');
            } catch {
              limits = {};
            }
            const storageGb = Number(limits.storageGb) || parseInt(String(limits.storage || '10'), 10) || 10;
            return {
              id: String(p.id),
              name: p.name,
              description: p.description,
              storageGb,
              monthlyPrice: p.price,
              hourlyRate: p.hourlyPrice || Math.max(1, Math.ceil(p.price / 730)),
              maxBuckets: limits.maxBuckets !== undefined ? Number(limits.maxBuckets) : undefined,
              maxKeys: limits.maxKeys !== undefined ? Number(limits.maxKeys) : undefined,
              isPopular: Boolean(p.isPopular),
            };
          });
          setPlans(mapped);
          const featured = mapped.find((m) => m.isPopular && fitsCapacity(m.storageGb))
            || mapped.find((m) => fitsCapacity(m.storageGb))
            || mapped.find((m) => m.isPopular)
            || mapped[0];
          if (featured) setSelectedPlanGb(featured.storageGb);
        } else if (Array.isArray(objRes?.plans)) {
          setPlans(objRes.plans);
          const firstFitting = objRes.plans.find((m: StoragePlan) => fitsCapacity(m.storageGb)) || objRes.plans[0];
          if (firstFitting) setSelectedPlanGb(firstFitting.storageGb);
        }
      })
      .catch(() => toast.error('Failed to load Object Storage plans'))
      .finally(() => setLoading(false));

    fetch('/api/user/billing')
      .then((res) => res.json())
      .then((data) => {
        if (data.data?.balance !== undefined) {
          setUserBalance(data.data.balance);
        }
        if (data.data?.commitment?.totalMonthly !== undefined) {
          setActiveCommitment(data.data.commitment.totalMonthly);
        } else if (data.data?.activeMonthlyCommitment !== undefined) {
          setActiveCommitment(data.data.activeMonthlyCommitment);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingBalance(false));
  }, []);

  const selectedPlan = plans.find((p) => p.storageGb === selectedPlanGb) || plans[0];
  const monthlyEstimate = selectedPlan ? selectedPlan.monthlyPrice : 0;
  const selectedPlanHasCapacity = capacity
    ? capacity.available && capacity.freeGb >= (selectedPlan?.storageGb || 0)
    : true;
  const totalRequiredBalance = activeCommitment + monthlyEstimate;
  const isBalanceInsufficient = !loadingBalance && userBalance < totalRequiredBalance;
  const shortfall = Math.max(0, totalRequiredBalance - userBalance);

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    if (!selectedPlanHasCapacity) {
      toast.error(capacity?.reason || 'Cluster capacity full for this storage tier.');
      return;
    }
    if (!serviceName.trim()) {
      toast.error('Please enter a service name');
      return;
    }
    if (isBalanceInsufficient) {
      toast.error(`Insufficient account balance. You need at least ${formatRupiah(totalRequiredBalance)} to deploy.`);
      return;
    }

    setDeploying(true);
    try {
      const res = await fetch('/api/user/object-storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: serviceName.trim(),
          storageGb: selectedPlan.storageGb,
          billingMode: 'PAYG',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deploy failed');

      const createdService = data.service || data.data;
      toast.success('Object Storage deployed!');
      if (data.initialCredentials && createdService?.id) {
        try {
          sessionStorage.setItem(
            `obj_init_creds_${createdService.id}`,
            JSON.stringify(data.initialCredentials)
          );
        } catch {
          // ignore storage quota errors
        }
      }
      if (createdService?.id) {
        router.push(`/dashboard/object-storage/${createdService.id}`);
      } else {
        router.push('/dashboard/object-storage');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to deploy Object Storage');
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="space-y-6 max-w-full pb-14">
      {/* Back Navigation */}
      <div>
        <Link
          href="/dashboard/object-storage"
          className={cn(
            'inline-flex items-center gap-2 text-xs font-medium px-3.5 py-2 rounded-xl transition-all border w-fit',
            isDark
              ? 'text-zinc-400 hover:text-white bg-[#0a0a0c] hover:bg-white/[0.04] border-white/[0.08] hover:border-cyan-500/40'
              : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs'
          )}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Object Storage
        </Link>
      </div>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className={cn('text-lg sm:text-2xl font-bold tracking-tight', isDark ? 'text-white' : 'text-slate-900')}>
              Deploy Object Storage (S3)
            </h1>
            <span className={cn('px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-bold border shrink-0', isDark ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-cyan-50 text-cyan-700 border-cyan-200')}>
              Isolated S3 &amp; IAM Keys
            </span>
          </div>
          <p className={cn('text-xs sm:text-sm font-medium mt-0.5', isDark ? 'text-zinc-400' : 'text-slate-500')}>
            Deploy AWS S3-compatible object storage with isolated buckets, presigned URLs, and IAM Access Keys on Masdika Cloud.
          </p>
        </div>

        {/* Datacenter Region Badge */}
        <div
          className={cn(
            'inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold shrink-0 self-start sm:self-center transition-all',
            isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-zinc-300' : 'bg-white border-slate-200/90 text-slate-700 shadow-2xs'
          )}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <MapPin className={cn('w-3.5 h-3.5 shrink-0', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
          <span>
            Region: <strong className={isDark ? 'text-white' : 'text-slate-900'}>Sidoarjo (ID-SDA)</strong>
          </span>
        </div>
      </div>

      {!loading && !enabled && (
        <div className={cn('p-4 rounded-2xl border flex items-center gap-3 text-xs', isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800')}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Object Storage provisioning is currently disabled by Administrator.</span>
        </div>
      )}

      {/* 2-Column Checkout Flow matching Managed Apps */}
      <form onSubmit={handleDeploy} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Step 1: Choose Storage Plan */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>
                1. Choose Storage Plan
              </h2>
              <span className={cn('text-xs font-medium', isDark ? 'text-zinc-400' : 'text-slate-500')}>
                {plans.length} Official S3 Storage Tiers
              </span>
            </div>

            {loading ? (
              <div className="min-h-[350px] w-full flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                <p className={cn('text-xs font-medium', isDark ? 'text-zinc-400' : 'text-slate-500')}>
                  Loading object storage plans...
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {plans.map((plan) => {
                  const isSelected = selectedPlan?.storageGb === plan.storageGb;
                  const hasCapacity = capacity ? capacity.available && capacity.freeGb >= plan.storageGb : true;
                  return (
                    <button
                      type="button"
                      key={plan.id}
                      disabled={!hasCapacity}
                      onClick={() => hasCapacity && setSelectedPlanGb(plan.storageGb)}
                      className={cn(
                        'w-full text-left p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4',
                        !hasCapacity
                          ? isDark
                            ? 'bg-[#111115]/60 border-white/[0.05] opacity-60 cursor-not-allowed'
                            : 'bg-slate-50 border-slate-200/70 opacity-60 cursor-not-allowed'
                          : isSelected
                            ? isDark
                              ? 'bg-cyan-500/[0.06] border-cyan-500/60 shadow-[0_0_0_1px_rgba(6,182,212,0.2)] cursor-pointer'
                              : 'bg-cyan-50/70 border-cyan-500 shadow-2xs cursor-pointer'
                            : isDark
                              ? 'bg-[#111115] border-white/[0.08] hover:border-white/20 cursor-pointer'
                              : 'bg-white border-slate-200/90 hover:border-cyan-300 shadow-2xs cursor-pointer'
                      )}
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-xl border flex items-center justify-center shrink-0',
                            isSelected
                              ? isDark
                                ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                                : 'bg-cyan-100 border-cyan-300 text-cyan-700'
                              : isDark
                                ? 'bg-white/[0.04] border-white/[0.08] text-zinc-400'
                                : 'bg-slate-50 border-slate-200 text-slate-500'
                          )}
                        >
                          <HardDrive className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>
                              {plan.name}
                            </span>
                            {plan.isPopular && (
                              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', isDark ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700')}>
                                Popular
                              </span>
                            )}
                          </div>
                          {plan.description && (
                            <p className={cn('text-xs mt-0.5 line-clamp-1', isDark ? 'text-zinc-400' : 'text-slate-500')}>
                              {plan.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                            <span className={cn('inline-flex items-center gap-1 font-medium', isDark ? 'text-zinc-300' : 'text-slate-700')}>
                              <HardDrive className={cn('w-3.5 h-3.5', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
                              {plan.storageGb} GB SSD
                            </span>
                            {plan.maxBuckets !== undefined && (
                              <span className={cn('inline-flex items-center gap-1 font-medium', isDark ? 'text-zinc-300' : 'text-slate-700')}>
                                <Database className={cn('w-3.5 h-3.5', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
                                {plan.maxBuckets === -1 ? 'Unlimited Buckets' : `${plan.maxBuckets} Buckets`}
                              </span>
                            )}
                            {plan.maxKeys !== undefined && (
                              <span className={cn('inline-flex items-center gap-1 font-medium', isDark ? 'text-zinc-300' : 'text-slate-700')}>
                                <KeyRound className={cn('w-3.5 h-3.5', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
                                {plan.maxKeys === -1 ? 'Unlimited Keys' : `${plan.maxKeys} S3 Keys`}
                              </span>
                            )}
                            <span className={cn('font-bold', isDark ? 'text-white' : 'text-slate-900')}>
                              • {formatRupiah(plan.monthlyPrice)}/month
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        {hasCapacity ? (
                          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border', isDark ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700')}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', isDark ? 'bg-emerald-400' : 'bg-emerald-600')} />
                            Available
                          </span>
                        ) : (
                          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border', isDark ? 'bg-red-500/10 border-red-500/25 text-red-400' : 'bg-red-50 border-red-200 text-red-700')}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', isDark ? 'bg-red-400' : 'bg-red-600')} />
                            Cluster Capacity Full
                          </span>
                        )}
                        <div
                          className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                            isSelected
                              ? 'border-cyan-400 bg-cyan-400 text-slate-950'
                              : isDark
                                ? 'border-zinc-600'
                                : 'border-slate-300'
                          )}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 2: Configuration */}
          <div className={cn('p-5 rounded-2xl border space-y-5', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
            <h2 className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>
              2. Configuration
            </h2>

            <div>
              <label className={cn('block text-xs font-bold mb-1.5', isDark ? 'text-zinc-300' : 'text-slate-700')}>
                Service Name *
              </label>
              <input
                type="text"
                required
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="e.g. production-s3-assets"
                className={cn(
                  'w-full rounded-xl px-4 py-2.5 text-xs sm:text-sm border focus:outline-none focus:border-cyan-500',
                  isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-white placeholder-zinc-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                )}
              />
              <p className={cn('text-[11px] mt-1.5', isDark ? 'text-zinc-500' : 'text-slate-500')}>
                2–50 characters (letters, numbers, spaces, dots, hyphens, underscores).
              </p>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Deployment Summary (Matching Managed Apps) */}
        <div className="lg:col-span-4 sticky top-6 space-y-4">
          <div
            className={cn(
              'p-6 rounded-2xl border space-y-6 transition-all',
              isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs'
            )}
          >
            <h3 className={cn('text-base font-bold', isDark ? 'text-white' : 'text-slate-900')}>
              Deployment Summary
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <div className={cn('text-[10px] font-bold uppercase tracking-wider mb-1', isDark ? 'text-zinc-500' : 'text-slate-400')}>
                  STORAGE PLAN
                </div>
                <div className={cn('font-bold text-sm flex items-center gap-2', isDark ? 'text-white' : 'text-slate-900')}>
                  <HardDrive className={cn('w-4 h-4', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
                  {selectedPlan?.name || 'Select Plan'}
                </div>
              </div>

              <div>
                <div className={cn('text-[10px] font-bold uppercase tracking-wider mb-1', isDark ? 'text-zinc-500' : 'text-slate-400')}>
                  SERVICE NAME
                </div>
                <div className={cn('font-semibold', isDark ? 'text-zinc-200' : 'text-slate-800')}>
                  {serviceName.trim() || '—'}
                </div>
              </div>

              <div>
                <div className={cn('text-[10px] font-bold uppercase tracking-wider mb-1', isDark ? 'text-zinc-500' : 'text-slate-400')}>
                  QUOTAS &amp; ACCESS
                </div>
                <div className={cn('font-semibold', isDark ? 'text-zinc-200' : 'text-slate-800')}>
                  {selectedPlan ? `${selectedPlan.storageGb} GB • ${selectedPlan.maxBuckets ?? '-'} Buckets • ${selectedPlan.maxKeys ?? '-'} Keys` : '—'}
                </div>
              </div>

              <div>
                <div className={cn('text-[10px] font-bold uppercase tracking-wider mb-1', isDark ? 'text-zinc-500' : 'text-slate-400')}>
                  BILLING CYCLE
                </div>
                <div className={cn('font-semibold', isDark ? 'text-zinc-200' : 'text-slate-800')}>
                  Monthly
                </div>
              </div>

              <div className={cn('pt-3 border-t flex items-center justify-between', isDark ? 'border-white/[0.08]' : 'border-slate-100')}>
                <span className={cn('font-semibold', isDark ? 'text-zinc-400' : 'text-slate-600')}>
                  Cost
                </span>
                <span className={cn('text-base font-extrabold font-mono', isDark ? 'text-cyan-400' : 'text-cyan-600')}>
                  {formatRupiah(monthlyEstimate)}/month
                </span>
              </div>

              {/* Account Balance & Commitment */}
              <div className={cn('pt-3 border-t space-y-2', isDark ? 'border-white/[0.08]' : 'border-slate-100')}>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className={isDark ? 'text-zinc-400' : 'text-slate-600'}>Account Balance:</span>
                    <span className={cn('font-bold font-mono', !isBalanceInsufficient ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : (isDark ? 'text-red-400' : 'text-red-600'))}>
                      {loadingBalance ? '...' : formatRupiah(userBalance)}
                    </span>
                  </div>
                  {activeCommitment > 0 && (
                    <div className={cn('flex items-center justify-between text-[11px]', isDark ? 'text-zinc-400' : 'text-slate-600')}>
                      <span>Active Services Commitment:</span>
                      <span className={cn('font-mono font-medium', isDark ? 'text-zinc-300' : 'text-slate-700')}>
                        {formatRupiah(activeCommitment)}/mo
                      </span>
                    </div>
                  )}
                  <div className={cn('flex items-center justify-between text-[11px]', isDark ? 'text-zinc-400' : 'text-slate-600')}>
                    <span>New Storage Estimate:</span>
                    <span className={cn('font-mono font-medium', isDark ? 'text-zinc-300' : 'text-slate-700')}>
                      {formatRupiah(monthlyEstimate)}/mo
                    </span>
                  </div>
                  <div className={cn('flex items-center justify-between text-xs pt-1.5 border-t font-semibold', isDark ? 'border-white/[0.06]' : 'border-slate-200')}>
                    <span className={isDark ? 'text-zinc-300' : 'text-slate-700'}>Total Required Balance:</span>
                    <span className={cn('font-mono font-bold', !isBalanceInsufficient ? (isDark ? 'text-cyan-400' : 'text-cyan-600') : (isDark ? 'text-red-400' : 'text-red-600'))}>
                      {formatRupiah(totalRequiredBalance)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {isBalanceInsufficient && (
              <div
                className={cn(
                  'p-3.5 rounded-xl border text-xs space-y-2 transition-colors',
                  isDark ? 'bg-red-500/15 border-red-500/35 text-red-200' : 'bg-red-50 border-red-300 text-red-950 shadow-2xs'
                )}
              >
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className={cn('w-4 h-4 shrink-0 mt-0.5', isDark ? 'text-red-400' : 'text-red-600')} />
                  <div>
                    <p className={cn('font-bold tracking-tight text-xs', isDark ? 'text-red-300' : 'text-red-900')}>
                      Insufficient Account Balance
                    </p>
                    <p className={cn('text-[11px] mt-0.5 leading-relaxed', isDark ? 'text-red-200/90' : 'text-red-800')}>
                      Orders require sufficient balance to cover the accumulated monthly commitment of your active services plus this storage space.
                    </p>
                  </div>
                </div>
                <div className={cn('pl-6 pt-2 flex items-center justify-between border-t', isDark ? 'border-red-500/25' : 'border-red-200')}>
                  <span className={cn('text-[11px] font-semibold', isDark ? 'text-red-200' : 'text-red-900')}>
                    Shortfall: <strong className={cn(isDark ? 'text-red-300 font-extrabold' : 'text-red-700 font-extrabold')}>{formatRupiah(shortfall)}</strong>
                  </span>
                  <Link
                    href="/dashboard/topup"
                    className={cn('font-bold underline transition-colors text-xs inline-flex items-center gap-1', isDark ? 'text-red-300 hover:text-white' : 'text-red-700 hover:text-red-950')}
                  >
                    Top Up Balance →
                  </Link>
                </div>
              </div>
            )}

            {!selectedPlanHasCapacity && (
              <div
                className={cn(
                  'p-3.5 rounded-xl border text-xs flex items-start gap-2.5',
                  isDark ? 'bg-red-500/15 border-red-500/35 text-red-200' : 'bg-red-50 border-red-300 text-red-950 shadow-2xs'
                )}
              >
                <AlertTriangle className={cn('w-4 h-4 shrink-0 mt-0.5', isDark ? 'text-red-400' : 'text-red-600')} />
                <div>
                  <p className={cn('font-bold tracking-tight text-xs', isDark ? 'text-red-300' : 'text-red-900')}>
                    Cluster Capacity Full
                  </p>
                  <p className={cn('text-[11px] mt-0.5 leading-relaxed', isDark ? 'text-red-200/90' : 'text-red-800')}>
                    {capacity?.reason || 'Storage pool capacity is currently full for this tier. Please choose a smaller plan or try again later.'}
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={deploying || !enabled || !selectedPlan || !selectedPlanHasCapacity || !serviceName.trim() || isBalanceInsufficient}
              className="w-full py-3 rounded-xl text-xs sm:text-sm font-bold bg-cyan-400 hover:bg-cyan-300 active:scale-[0.99] text-slate-950 shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {deploying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Deploying Storage...</span>
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  <span>Deploy Object Storage</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
