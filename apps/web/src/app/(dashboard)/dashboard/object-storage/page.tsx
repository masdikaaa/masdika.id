'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/ThemeProvider';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HardDrive,
  Plus,
  Database,
  KeyRound,
  Globe,
  ArrowRight,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  Server,
  RefreshCw,
  Rocket,
} from 'lucide-react';

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function ObjectStoragePage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [publicEndpoint, setPublicEndpoint] = useState('');
  const [ratePerGb, setRatePerGb] = useState(500);
  const [plans, setPlans] = useState<Array<{ id: string; name: string; storageGb: number; monthlyPrice: number; hourlyRate: number }>>([]);
  const [services, setServices] = useState<any[]>([]);

  const [showDeploy, setShowDeploy] = useState(false);
  const [deployName, setDeployName] = useState('');
  const [deployStorageGb, setDeployStorageGb] = useState(10);
  const [deployBillingMode, setDeployBillingMode] = useState<'PAYG' | 'MONTHLY'>('PAYG');
  const [deploying, setDeploying] = useState(false);

  const [initialCreds, setInitialCreds] = useState<{
    endpoint: string;
    accessKey: string;
    secretKey: string;
    defaultBucket: string;
  } | null>(null);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/object-storage');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEnabled(!!data.enabled);
      setPublicEndpoint(data.publicEndpoint || '');
      setRatePerGb(data.ratePerGbMonthly || 500);
      setPlans(data.plans || []);
      setServices(data.data || []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load Object Storage services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deployName.trim()) return;
    setDeploying(true);
    try {
      const res = await fetch('/api/user/object-storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: deployName.trim(),
          storageGb: deployStorageGb,
          billingMode: deployBillingMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deploy failed');
      toast.success('Object Storage deployed!');
      setShowDeploy(false);
      setDeployName('');
      if (data.initialCredentials) {
        setInitialCreds(data.initialCredentials);
      }
      fetchServices();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to deploy Object Storage');
    } finally {
      setDeploying(false);
    }
  };

  const matchedPlan = plans.find((p) => p.storageGb === deployStorageGb);
  const estimatedMonthly = matchedPlan ? matchedPlan.monthlyPrice : deployStorageGb * Math.max(ratePerGb, 2000);
  const estimatedHourly = matchedPlan ? matchedPlan.hourlyRate : Math.max(1, Math.ceil(estimatedMonthly / 730));

  return (
    <div className="space-y-6 max-w-full pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className={cn('text-xl sm:text-2xl font-bold tracking-tight', isDark ? 'text-white' : 'text-slate-900')}>
              Object Storage (S3)
            </h1>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold border whitespace-nowrap shrink-0', isDark ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-cyan-50 text-cyan-700 border-cyan-200')}>
                <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', isDark ? 'bg-cyan-400' : 'bg-cyan-600')} />
                S3 Compatible
              </span>
              <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold border whitespace-nowrap shrink-0', isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200')}>
                <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', isDark ? 'bg-emerald-400' : 'bg-emerald-600')} />
                IAM Ready
              </span>
            </div>
          </div>
          <p className={cn('text-xs sm:text-sm font-medium mt-1.5 max-w-2xl leading-relaxed', isDark ? 'text-zinc-400' : 'text-slate-500')}>
            AWS S3-compatible object storage with isolated buckets, IAM Access Keys &amp; public/private ACLs.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchServices}
            disabled={loading}
            className={cn(
              'px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 border cursor-pointer',
              isDark ? 'border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs'
            )}
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && (isDark ? 'animate-spin text-cyan-400' : 'animate-spin text-cyan-600'))} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowDeploy(true)}
            disabled={!enabled}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 flex items-center justify-center gap-2 bg-cyan-400 hover:bg-cyan-300 active:scale-95 text-slate-950 shadow-md disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Deploy Object Storage</span>
          </button>
        </div>
      </div>

      {/* Global S3 Endpoint Banner (only shown after customer has ordered) */}
      {publicEndpoint && services.length > 0 && (
        <div className={cn('p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90')}>
          <div className="flex items-center gap-3 text-xs">
            <div className={cn('w-8 h-8 rounded-lg border flex items-center justify-center shrink-0', isDark ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : 'bg-cyan-50 border-cyan-200 text-cyan-700')}>
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <span className={cn('font-semibold', isDark ? 'text-zinc-300' : 'text-slate-700')}>S3 API Endpoint: </span>
              <code className={cn('font-mono font-bold', isDark ? 'text-cyan-400' : 'text-cyan-700')}>{publicEndpoint}</code>
              <span className={cn('ml-2 text-[11px]', isDark ? 'text-zinc-500' : 'text-slate-500')}>(Region: us-east-1 • Path-Style &amp; Virtual-Host Supported)</span>
            </div>
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(publicEndpoint); toast.success('Endpoint copied!'); }}
            className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors', isDark ? 'bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100')}
          >
            <Copy className="w-3.5 h-3.5" /> Copy Endpoint
          </button>
        </div>
      )}

      {!loading && !enabled && (
        <div className={cn('p-4 rounded-2xl border flex items-center gap-3 text-xs', isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800')}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Object Storage provisioning is currently disabled. Enable <strong>RustFS Customer Cluster</strong> &amp; <strong>Object Storage Product</strong> in Admin Settings to allow deployments.</span>
        </div>
      )}

      {/* One-time Initial Credentials Banner */}
      <AnimatePresence>
        {initialCreds && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn('p-5 rounded-2xl border space-y-3', isDark ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50')}
          >
            <div className="flex items-start justify-between gap-4">
              <div className={cn('flex items-center gap-2 font-bold text-sm', isDark ? 'text-emerald-400' : 'text-emerald-800')}>
                <CheckCircle2 className="w-5 h-5" />
                <span>S3 Access Credentials Created (Copy your Secret Key now — shown once!)</span>
              </div>
              <button onClick={() => setInitialCreds(null)} className={cn('cursor-pointer', isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
              <div className={cn('p-3 rounded-xl border', isDark ? 'bg-black/40 border-white/10' : 'bg-white border-emerald-200')}>
                <div className={cn('text-[10px] uppercase mb-1', isDark ? 'text-zinc-400' : 'text-slate-500')}>Endpoint</div>
                <div className={cn('break-all', isDark ? 'text-white' : 'text-slate-900')}>{initialCreds.endpoint}</div>
              </div>
              <div className={cn('p-3 rounded-xl border', isDark ? 'bg-black/40 border-white/10' : 'bg-white border-emerald-200')}>
                <div className={cn('text-[10px] uppercase mb-1', isDark ? 'text-zinc-400' : 'text-slate-500')}>Default Bucket</div>
                <div className={isDark ? 'text-white' : 'text-slate-900'}>{initialCreds.defaultBucket}</div>
              </div>
              <div className={cn('p-3 rounded-xl border', isDark ? 'bg-black/40 border-white/10' : 'bg-white border-emerald-200')}>
                <div className={cn('text-[10px] uppercase mb-1', isDark ? 'text-zinc-400' : 'text-slate-500')}>Access Key ID</div>
                <div className={cn('break-all', isDark ? 'text-cyan-300' : 'text-cyan-700')}>{initialCreds.accessKey}</div>
              </div>
              <div className={cn('p-3 rounded-xl border', isDark ? 'bg-black/40 border-white/10' : 'bg-white border-emerald-200')}>
                <div className={cn('text-[10px] uppercase mb-1', isDark ? 'text-zinc-400' : 'text-slate-500')}>Secret Access Key</div>
                <div className={cn('break-all', isDark ? 'text-emerald-300' : 'text-emerald-700')}>{initialCreds.secretKey}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Services List */}
      {loading ? (
        <div className="min-h-[350px] w-full flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className={cn('text-xs font-medium', isDark ? 'text-zinc-400' : 'text-slate-500')}>
            Loading object storage services...
          </p>
        </div>
      ) : services.length === 0 ? (
        <div className={cn('rounded-2xl border p-10 sm:p-14 text-center shadow-2xs', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90')}>
          <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border', isDark ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : 'bg-cyan-50 border-cyan-200 text-cyan-700')}>
            <HardDrive className="w-8 h-8" />
          </div>
          <h2 className={cn('text-lg font-bold mb-1.5', isDark ? 'text-white' : 'text-slate-900')}>
            No Object Storage Services Provisioned
          </h2>
          <p className={cn('text-xs sm:text-sm max-w-md mx-auto mb-6 leading-relaxed', isDark ? 'text-zinc-400' : 'text-slate-500')}>
            Deploy an S3-compatible Object Storage space with isolated buckets, IAM Access Keys &amp; PAYG hourly billing starting from Rp {(plans[0]?.monthlyPrice || 5000).toLocaleString('id-ID')}/mo.
          </p>
          <button
            onClick={() => setShowDeploy(true)}
            disabled={!enabled}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all shadow-md disabled:opacity-50 cursor-pointer"
          >
            <Rocket className="w-4 h-4" />
            <span>Deploy Object Storage Now</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((svc) => {
            const quotaBytes = svc.storageGb * 1024 * 1024 * 1024;
            const pct = Math.min(100, Math.round(((svc.usedBytes || 0) / quotaBytes) * 100));
            const isSuspended = svc.status === 'SUSPENDED';

            return (
              <div
                key={svc.id}
                className={cn(
                  'rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-all shadow-2xs',
                  isDark ? 'bg-[#111115] border-white/[0.08] hover:border-cyan-500/40' : 'bg-white border-slate-200/90 hover:border-cyan-300'
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border', isDark ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300' : 'bg-cyan-50 border-cyan-200 text-cyan-700')}>
                        {svc.planName} • {svc.billingMode}
                      </span>
                      <h3 className={cn('text-base font-bold mt-2', isDark ? 'text-white' : 'text-slate-900')}>{svc.name}</h3>
                    </div>
                    <span
                      className={cn(
                        'text-[10px] font-bold px-2.5 py-1 rounded-full border',
                        isSuspended
                          ? isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'
                          : isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      )}
                    >
                      {isSuspended ? 'SUSPENDED (Grace 3 Hari)' : svc.status}
                    </span>
                  </div>

                  {isSuspended && (
                    <div className={cn('p-2.5 rounded-xl border text-[11px] flex items-center gap-2', isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800')}>
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>S3 keys disabled. Top up balance to auto-unsuspend.</span>
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>Storage Used</span>
                      <span className={cn('font-semibold', isDark ? 'text-zinc-200' : 'text-slate-800')}>
                        {formatBytes(svc.usedBytes || 0)} / {svc.storageGb} GB
                      </span>
                    </div>
                    <div className={cn('w-full h-2 rounded-full overflow-hidden', isDark ? 'bg-white/[0.06]' : 'bg-slate-100')}>
                      <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <div className={cn('p-2.5 rounded-xl border flex items-center gap-2', isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-slate-50 border-slate-200')}>
                      <Database className={cn('w-3.5 h-3.5', isDark ? 'text-cyan-400' : 'text-cyan-700')} />
                      <span className={isDark ? 'text-zinc-300' : 'text-slate-700'}>{svc.buckets?.length || 0} Buckets</span>
                    </div>
                    <div className={cn('p-2.5 rounded-xl border flex items-center gap-2', isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-slate-50 border-slate-200')}>
                      <KeyRound className={cn('w-3.5 h-3.5', isDark ? 'text-cyan-400' : 'text-cyan-700')} />
                      <span className={isDark ? 'text-zinc-300' : 'text-slate-700'}>{svc.keys?.length || 0} S3 Keys</span>
                    </div>
                  </div>
                </div>

                <div className={cn('pt-3 border-t flex items-center justify-between', isDark ? 'border-white/[0.08]' : 'border-slate-200')}>
                  <div className="text-xs">
                    <span className={cn('font-bold', isDark ? 'text-cyan-400' : 'text-cyan-700')}>Rp {svc.hourlyRate.toLocaleString('id-ID')}</span>
                    <span className={isDark ? 'text-zinc-500' : 'text-slate-500'}>/hr (Rp {svc.monthlyPrice.toLocaleString('id-ID')}/mo)</span>
                  </div>
                  <Link
                    href={`/dashboard/object-storage/${svc.id}`}
                    className={cn('px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors', isDark ? 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300' : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200')}
                  >
                    Open Console <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Deploy Modal */}
      <AnimatePresence>
        {showDeploy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={cn('rounded-2xl max-w-lg w-full p-6 border shadow-2xl space-y-5', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200')}
            >
              <div className="flex items-center justify-between">
                <h3 className={cn('text-lg font-bold', isDark ? 'text-white' : 'text-slate-900')}>Deploy Object Storage (S3)</h3>
                <button onClick={() => setShowDeploy(false)} className={cn('cursor-pointer', isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-400 hover:text-slate-900')}><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleDeploy} className="space-y-4">
                <div>
                  <label className={cn('block text-xs font-bold mb-1.5', isDark ? 'text-zinc-300' : 'text-slate-700')}>Service Name *</label>
                  <input
                    type="text"
                    required
                    value={deployName}
                    onChange={(e) => setDeployName(e.target.value)}
                    placeholder="e.g. production-s3-assets"
                    className={cn('w-full rounded-xl px-3.5 py-2.5 text-xs border focus:outline-none focus:border-cyan-500', isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-900')}
                  />
                </div>

                <div>
                  <label className={cn('block text-xs font-bold mb-1.5', isDark ? 'text-zinc-300' : 'text-slate-700')}>Capacity Quota (GB)</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2">
                    {plans.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => setDeployStorageGb(p.storageGb)}
                        className={cn(
                          'py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer',
                          deployStorageGb === p.storageGb
                            ? isDark ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-cyan-50 border-cyan-500 text-cyan-700'
                            : isDark
                              ? 'bg-[#0a0a0c] border-white/[0.08] text-zinc-400'
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                        )}
                      >
                        {p.storageGb >= 1000 ? `${p.storageGb / 1000}TB` : `${p.storageGb}GB`}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={deployStorageGb}
                    onChange={(e) => setDeployStorageGb(Math.max(1, parseInt(e.target.value || '1', 10)))}
                    className={cn('w-full rounded-xl px-3.5 py-2 text-xs border focus:outline-none focus:border-cyan-500', isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-900')}
                  />
                </div>

                <div>
                  <label className={cn('block text-xs font-bold mb-1.5', isDark ? 'text-zinc-300' : 'text-slate-700')}>Billing Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['PAYG', 'MONTHLY'] as const).map((m) => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => setDeployBillingMode(m)}
                        className={cn(
                          'py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer',
                          deployBillingMode === m
                            ? isDark ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-cyan-50 border-cyan-500 text-cyan-700'
                            : isDark
                              ? 'bg-[#0a0a0c] border-white/[0.08] text-zinc-400'
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                        )}
                      >
                        {m === 'PAYG' ? `Pay-As-You-Go (Rp ${estimatedHourly.toLocaleString('id-ID')}/hr)` : `Monthly (Rp ${estimatedMonthly.toLocaleString('id-ID')}/mo)`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={cn('p-3.5 rounded-xl border text-xs flex items-center justify-between', isDark ? 'bg-[#0a0a0c] border-white/[0.08]' : 'bg-slate-50 border-slate-200')}>
                  <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>Upfront Charge Now</span>
                  <span className={cn('font-bold', isDark ? 'text-cyan-400' : 'text-cyan-700')}>
                    Rp {(deployBillingMode === 'MONTHLY' ? estimatedMonthly : estimatedHourly).toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDeploy(false)}
                    className={cn('flex-1 py-2.5 rounded-xl text-xs font-semibold border cursor-pointer', isDark ? 'border-white/10 text-zinc-300 hover:bg-white/5' : 'border-slate-200 text-slate-700 hover:bg-slate-50')}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={deploying || !deployName.trim()}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {deploying ? 'Provisioning...' : 'Deploy Now'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
