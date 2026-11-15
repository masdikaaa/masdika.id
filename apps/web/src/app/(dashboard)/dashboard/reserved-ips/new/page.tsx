'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ChevronLeft,
  Globe,
  Lock,
  ShieldCheck,
  Receipt,
  Sparkles,
  Loader2,
  CheckCircle2,
  Rocket,
  Server,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';
import { formatRupiah } from '@/lib/billing';

interface PoolStatus {
  ipv4: {
    availableCount: number;
    pricePerHour: number;
  };
  ipv6: {
    availableCount: number;
    pricePerHour: number;
  };
}

export default function AllocateElasticIpPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [selectedVersion, setSelectedVersion] = useState<4 | 6>(4);
  const [poolStatus, setPoolStatus] = useState<PoolStatus | null>(null);
  const [loadingPool, setLoadingPool] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [userBalance, setUserBalance] = useState(0);
  const [activeCommitment, setActiveCommitment] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);

  useEffect(() => {
    const loadPoolStatus = async () => {
      try {
        const res = await fetch('/api/user/reserved-ips/pool-status');
        const data = await res.json();
        if (res.ok && data?.success) {
          setPoolStatus(data.data);
        }
      } catch {
        toast.error('Failed to check public IP pool availability');
      } finally {
        setLoadingPool(false);
      }
    };

    loadPoolStatus();

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

  const currentPool = selectedVersion === 4 ? poolStatus?.ipv4 : poolStatus?.ipv6;
  const hourlyRate = currentPool?.pricePerHour ?? (selectedVersion === 4 ? 21 : 7);
  const availableCount = currentPool?.availableCount ?? null;
  const monthlyEstimate = hourlyRate * 730;
  const isOutOfStock = availableCount !== null && availableCount <= 0;
  const totalRequiredBalance = activeCommitment + monthlyEstimate;
  const isBalanceInsufficient = !loadingBalance && userBalance < totalRequiredBalance;
  const shortfall = Math.max(0, totalRequiredBalance - userBalance);

  const handleAllocate = async () => {
    if (isBalanceInsufficient) {
      toast.error(`Insufficient account balance. You need at least ${formatRupiah(totalRequiredBalance)} to allocate.`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/user/reserved-ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: selectedVersion }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to allocate Elastic IP');
        return;
      }

      const assignedIp = data?.ip?.publicIp || data?.ip?.ipAddress || 'Static IP';
      toast.success(`Elastic IP ${assignedIp} allocated and locked to your account`);
      router.push('/dashboard/reserved-ips');
      router.refresh();
    } catch {
      toast.error('Network error while allocating Elastic IP');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-full pb-14">
      {/* Back Navigation */}
      <div>
        <Link
          href="/dashboard/reserved-ips"
          className={cn(
            'inline-flex items-center gap-2 text-xs font-medium px-3.5 py-2 rounded-xl transition-all border w-fit',
            isDark
              ? 'text-zinc-400 hover:text-white bg-[#0a0a0c] hover:bg-white/[0.04] border-white/[0.08] hover:border-cyan-500/40'
              : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs'
          )}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Elastic Static IPs
        </Link>
      </div>

      {/* Title */}
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1
            className={cn(
              'text-lg sm:text-2xl font-bold tracking-tight',
              isDark ? 'text-white' : 'text-slate-900'
            )}
          >
            Allocate Elastic Static IP
          </h1>
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border',
              isDark
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                : 'bg-cyan-50 text-cyan-700 border-cyan-200'
            )}
          >
            <Sparkles className="w-3 h-3" />
            Auto-Assigned from Pool
          </span>
        </div>
        <p className={cn('text-xs sm:text-sm', isDark ? 'text-zinc-400' : 'text-slate-600')}>
          Choose your IP protocol version. Our system automatically assigns an available static
          public IP from the pool and locks it permanently to your account.
        </p>
      </div>

      {/* 2-Column Full-Space Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Configuration */}
        <div className="lg:col-span-8 space-y-6">
          {/* Protocol Selector */}
          <div
            className={cn(
              'rounded-2xl border p-6 space-y-4',
              isDark
                ? 'bg-[#111115] border-white/[0.08]'
                : 'bg-white border-slate-200 shadow-sm'
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className={cn('text-base font-semibold', isDark ? 'text-white' : 'text-slate-900')}>
                  1. Select IP Protocol Version
                </h2>
                <p className={cn('text-xs mt-0.5', isDark ? 'text-zinc-400' : 'text-slate-500')}>
                  Specific IP addresses cannot be hand-picked; an available address is allocated
                  automatically.
                </p>
              </div>
              <Globe className="w-5 h-5 text-cyan-400 shrink-0" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([4, 6] as const).map((version) => {
                const isSelected = selectedVersion === version;
                const info = version === 4 ? poolStatus?.ipv4 : poolStatus?.ipv6;
                const count = info?.availableCount ?? null;
                const rate = info?.pricePerHour ?? (version === 4 ? 21 : 7);
                const unavailable = count !== null && count <= 0;

                return (
                  <button
                    key={version}
                    type="button"
                    onClick={() => setSelectedVersion(version)}
                    className={cn(
                      'text-left p-5 rounded-2xl border transition-all relative',
                      isSelected
                        ? 'border-cyan-400 bg-cyan-500/10 ring-1 ring-cyan-400/40'
                        : isDark
                        ? 'border-white/[0.08] bg-zinc-900/60 hover:border-white/[0.16]'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-cyan-500/15 text-cyan-400">
                        IPv{version} Public
                      </span>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-cyan-400" />}
                    </div>

                    <div className="flex items-baseline gap-1.5 mb-2">
                      <span
                        className={cn(
                          'text-xl font-bold',
                          isDark ? 'text-white' : 'text-slate-900'
                        )}
                      >
                        {formatRupiah(rate)}
                      </span>
                      <span className={cn('text-xs', isDark ? 'text-zinc-400' : 'text-slate-500')}>
                        / hour
                      </span>
                    </div>

                    <p className={cn('text-xs mb-3', isDark ? 'text-zinc-400' : 'text-slate-600')}>
                      {version === 4
                        ? 'Standard public IPv4 address compatible with all Cloud VPS instances and legacy clients.'
                        : 'Modern public IPv6 address for next-generation dual-stack Cloud VPS networking.'}
                    </p>

                    <div
                      className={cn(
                        'inline-flex items-center gap-1.5 text-xs font-medium',
                        unavailable ? 'text-red-400' : 'text-emerald-400'
                      )}
                    >
                      <span
                        className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          unavailable ? 'bg-red-400' : 'bg-emerald-400'
                        )}
                      />
                      {loadingPool
                        ? 'Checking pool capacity...'
                        : count !== null
                        ? `${count} available in pool`
                        : 'Ready for auto-allocation'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Elastic Static IP Guarantees */}
          <div
            className={cn(
              'rounded-2xl border p-6 space-y-4',
              isDark
                ? 'bg-[#111115] border-white/[0.08]'
                : 'bg-white border-slate-200 shadow-sm'
            )}
          >
            <h2 className={cn('text-base font-semibold', isDark ? 'text-white' : 'text-slate-900')}>
              2. Elastic Static IP Guarantees
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                className={cn(
                  'rounded-xl border p-4 space-y-1.5',
                  isDark ? 'bg-zinc-900/50 border-white/[0.06]' : 'bg-slate-50 border-slate-200'
                )}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-cyan-400">
                  <Lock className="w-4 h-4" />
                  Auto-Assigned & Permanently Static
                </div>
                <p className={cn('text-xs leading-relaxed', isDark ? 'text-zinc-400' : 'text-slate-600')}>
                  Your assigned public IP never rotates or becomes dynamic. It stays locked to your
                  account across VPS stops, rebuilds, and reassignments until you release it.
                </p>
              </div>

              <div
                className={cn(
                  'rounded-xl border p-4 space-y-1.5',
                  isDark ? 'bg-zinc-900/50 border-white/[0.06]' : 'bg-slate-50 border-slate-200'
                )}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-cyan-400">
                  <Receipt className="w-4 h-4" />
                  Independent PAYG Running Invoice
                </div>
                <p className={cn('text-xs leading-relaxed', isDark ? 'text-zinc-400' : 'text-slate-600')}>
                  Each Elastic IP generates its own isolated{' '}
                  <span className="font-semibold">PAYG Running</span> invoice, billed hourly
                  separately from your Cloud VPS invoices.
                </p>
              </div>

              <div
                className={cn(
                  'rounded-xl border p-4 space-y-1.5',
                  isDark ? 'bg-zinc-900/50 border-white/[0.06]' : 'bg-slate-50 border-slate-200'
                )}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-cyan-400">
                  <Server className="w-4 h-4" />
                  Hot-Swappable Across VPS
                </div>
                <p className={cn('text-xs leading-relaxed', isDark ? 'text-zinc-400' : 'text-slate-600')}>
                  Attach to any existing Cloud VPS or detach and move it to another instance at any
                  time with zero IP address changes.
                </p>
              </div>

              <div
                className={cn(
                  'rounded-xl border p-4 space-y-1.5',
                  isDark ? 'bg-zinc-900/50 border-white/[0.06]' : 'bg-slate-50 border-slate-200'
                )}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-cyan-400">
                  <ShieldCheck className="w-4 h-4" />
                  Account Quota Protection
                </div>
                <p className={cn('text-xs leading-relaxed', isDark ? 'text-zinc-400' : 'text-slate-600')}>
                  Up to 5 Elastic Static IPs can be held per account simultaneously. Release unused
                  IPs anytime to stop hourly billing immediately.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Sticky Allocation Summary */}
        <div className="lg:col-span-4 lg:sticky lg:top-6">
          <div
            className={cn(
              'rounded-2xl border p-5 sm:p-6 space-y-5',
              isDark
                ? 'bg-[#111115] border-white/[0.08]'
                : 'bg-white border-slate-200/90 shadow-2xs'
            )}
          >
            <div className="flex items-center justify-between">
              <h3 className={cn('text-base font-bold', isDark ? 'text-white' : 'text-slate-900')}>
                Allocation Summary
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                PAYG RUNNING
              </span>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <div className={cn('text-[10px] font-bold uppercase tracking-wider mb-1', isDark ? 'text-zinc-500' : 'text-slate-400')}>
                  PROTOCOL
                </div>
                <div className={cn('font-bold text-sm flex items-center gap-2', isDark ? 'text-white' : 'text-slate-900')}>
                  <Globe className={cn('w-4 h-4', isDark ? 'text-cyan-400' : 'text-cyan-600')} />
                  IPv{selectedVersion} Public
                </div>
              </div>

              <div>
                <div className={cn('text-[10px] font-bold uppercase tracking-wider mb-1', isDark ? 'text-zinc-500' : 'text-slate-400')}>
                  IP ASSIGNMENT
                </div>
                <div className="font-semibold text-cyan-400">
                  Auto-Assigned from Pool
                </div>
              </div>

              <div>
                <div className={cn('text-[10px] font-bold uppercase tracking-wider mb-1', isDark ? 'text-zinc-500' : 'text-slate-400')}>
                  PERSISTENCE
                </div>
                <div className={cn('font-semibold', isDark ? 'text-zinc-200' : 'text-slate-800')}>
                  Permanently Static
                </div>
              </div>

              <div>
                <div className={cn('text-[10px] font-bold uppercase tracking-wider mb-1', isDark ? 'text-zinc-500' : 'text-slate-400')}>
                  BILLING MODE
                </div>
                <div className={cn('font-semibold', isDark ? 'text-zinc-200' : 'text-slate-800')}>
                  Pay-As-You-Go (Hourly)
                </div>
              </div>

              <div className={cn('pt-3 border-t flex items-center justify-between', isDark ? 'border-white/[0.08]' : 'border-slate-100')}>
                <span className={cn('font-semibold', isDark ? 'text-zinc-400' : 'text-slate-600')}>
                  Hourly Rate
                </span>
                <span className={cn('text-base font-extrabold font-mono', isDark ? 'text-cyan-400' : 'text-cyan-600')}>
                  {formatRupiah(hourlyRate)}/hour
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
                    <span>New Elastic IP Estimate (730h):</span>
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
                      Allocating a PAYG Elastic IP requires sufficient balance to cover the accumulated monthly commitment of your active services plus this IP&apos;s 730-hour cap.
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

            {isOutOfStock && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  No IPv{selectedVersion} addresses are currently available in the public pool.
                  Please try the other protocol or contact support.
                </span>
              </div>
            )}

            <button
              onClick={handleAllocate}
              disabled={submitting || isOutOfStock || isBalanceInsufficient}
              className="w-full py-3 rounded-xl text-xs sm:text-sm font-bold bg-cyan-400 hover:bg-cyan-300 active:scale-[0.99] text-slate-950 shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Allocating Static IP...</span>
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  <span>Allocate IPv{selectedVersion} Now</span>
                </>
              )}
            </button>

            <p className={cn('text-[11px] text-center', isDark ? 'text-zinc-500' : 'text-slate-500')}>
              First hour ({formatRupiah(hourlyRate)}) is charged upfront from your account balance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
