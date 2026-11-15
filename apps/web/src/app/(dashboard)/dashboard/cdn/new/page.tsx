'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/ThemeProvider';
import { toast } from 'sonner';
import {
  ChevronLeft,
  Cloud,
  Check,
  Rocket,
  Loader2,
  ShieldCheck,
  Zap,
  Globe,
} from 'lucide-react';

export default function NewFileCdnPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [serviceName, setServiceName] = useState('');
  const [deploying, setDeploying] = useState(false);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const res = await fetch('/api/user/cdn/services');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load plans');
        const list = data.plans || [];
        setPlans(list);
        if (list.length > 0) {
          const popular = list.find((p: any) => p.isPopular) || list[0];
          setSelectedPlanId(popular.id);
        }
      } catch (err: any) {
        toast.error(err?.message || 'Failed to load File CDN plans');
      } finally {
        setLoading(false);
      }
    };
    loadPlans();
  }, []);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) {
      toast.error('Please select a File CDN plan');
      return;
    }
    setDeploying(true);
    try {
      const res = await fetch('/api/user/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlanId,
          paymentMethodCode: 'BALANCE',
          serviceName: serviceName.trim() || selectedPlan?.name || 'File CDN',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deployment failed');
      toast.success('File CDN provisioned with a unique isolated bucket!');
      if (data.subscriptionId) {
        router.push(`/dashboard/cdn/${data.subscriptionId}`);
      } else {
        router.push('/dashboard/cdn');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to deploy File CDN');
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl pb-16">
      <div>
        <Link
          href="/dashboard/cdn"
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
            isDark ? 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs'
          )}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Back to File CDN
        </Link>
      </div>

      {/* Header */}
      <div className={cn('rounded-2xl border p-5 sm:p-6 flex items-center gap-4', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
        <div className={cn('w-12 h-12 rounded-xl border flex items-center justify-center shrink-0', isDark ? 'bg-cyan-500/10 border-cyan-500/25 text-cyan-400' : 'bg-cyan-50 border-cyan-200 text-cyan-700')}>
          <Cloud className="w-6 h-6" />
        </div>
        <div>
          <h1 className={cn('text-lg sm:text-xl font-bold tracking-tight', isDark ? 'text-white' : 'text-slate-900')}>
            Deploy File CDN Instance
          </h1>
          <p className={cn('text-xs sm:text-sm mt-0.5', isDark ? 'text-zinc-400' : 'text-slate-500')}>
            Each deployment provisions a globally unique S3-backed CDN bucket, AES-256 encryption, and dedicated API keys.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[260px] flex items-center justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-cyan-400" />
        </div>
      ) : (
        <form onSubmit={handleDeploy} className="space-y-6">
          {/* Step 1: Service Name */}
          <div className={cn('rounded-2xl border p-5 sm:p-6 space-y-3', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
            <label className={cn('text-xs font-bold uppercase tracking-wider block', isDark ? 'text-cyan-400' : 'text-cyan-700')}>
              1. Instance Name
            </label>
            <input
              type="text"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="e.g. production-media-cdn"
              className={cn(
                'w-full rounded-xl px-4 py-2.5 text-sm border focus:outline-none focus:border-cyan-500',
                isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-white placeholder-zinc-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
              )}
            />
            <p className={cn('text-[11px]', isDark ? 'text-zinc-500' : 'text-slate-500')}>
              A unique storage bucket (e.g. <code className="font-mono text-cyan-400">masdika-cdn-u...-s...</code>) is automatically assigned to this instance.
            </p>
          </div>

          {/* Step 2: Select Plan */}
          <div className={cn('rounded-2xl border p-5 sm:p-6 space-y-4', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
            <span className={cn('text-xs font-bold uppercase tracking-wider block', isDark ? 'text-cyan-400' : 'text-cyan-700')}>
              2. Select Storage &amp; Bandwidth Tier
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((p) => {
                const active = selectedPlanId === p.id;
                let featuresList: string[] = [];
                try {
                  featuresList = JSON.parse(p.features || '[]');
                } catch {
                  featuresList = [];
                }
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPlanId(p.id)}
                    className={cn(
                      'p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-4',
                      active
                        ? 'border-cyan-400 bg-cyan-500/10 ring-1 ring-cyan-400/40'
                        : isDark
                          ? 'bg-[#0a0a0c] border-white/[0.08] hover:border-white/20'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn('font-bold text-sm', isDark ? 'text-white' : 'text-slate-900')}>{p.name}</span>
                        {p.isPopular && (
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', isDark ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300' : 'bg-cyan-100 border-cyan-200 text-cyan-800')}>
                            Popular
                          </span>
                        )}
                      </div>
                      <div className={cn('mt-2 font-mono font-extrabold text-lg', isDark ? 'text-cyan-400' : 'text-cyan-700')}>
                        Rp {p.hourlyPrice.toLocaleString('id-ID')}
                        <span className={cn('text-xs font-normal', isDark ? 'text-zinc-400' : 'text-slate-500')}>/hr</span>
                      </div>
                      <div className={cn('text-[11px] font-mono', isDark ? 'text-zinc-500' : 'text-slate-500')}>
                        Rp {p.price.toLocaleString('id-ID')}/month
                      </div>

                      <ul className="mt-3 space-y-1.5">
                        {featuresList.slice(0, 4).map((feat, idx) => (
                          <li key={idx} className={cn('text-[11px] flex items-center gap-1.5', isDark ? 'text-zinc-300' : 'text-slate-700')}>
                            <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="truncate">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary & Submit */}
          <div className={cn('rounded-2xl border p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-4 flex-wrap">
                <span className={cn('inline-flex items-center gap-1.5', isDark ? 'text-zinc-300' : 'text-slate-700')}>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> AES-256 Encryption
                </span>
                <span className={cn('inline-flex items-center gap-1.5', isDark ? 'text-zinc-300' : 'text-slate-700')}>
                  <Zap className="w-4 h-4 text-cyan-400" /> Instant Bucket Provisioning
                </span>
                <span className={cn('inline-flex items-center gap-1.5', isDark ? 'text-zinc-300' : 'text-slate-700')}>
                  <Globe className="w-4 h-4 text-cyan-400" /> PAYG Hourly Billing
                </span>
              </div>
              {selectedPlan && (
                <p className={cn('text-[11px]', isDark ? 'text-zinc-400' : 'text-slate-500')}>
                  Selected: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{selectedPlan.name}</strong> — Rp {selectedPlan.hourlyPrice.toLocaleString('id-ID')}/hr (Commitment: Rp {selectedPlan.price.toLocaleString('id-ID')}/mo)
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={deploying || !selectedPlan}
              className="px-6 py-3 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 active:scale-95 text-slate-950 shadow-md shadow-cyan-400/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              {deploying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Provisioning...</span>
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  <span>Deploy File CDN</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
