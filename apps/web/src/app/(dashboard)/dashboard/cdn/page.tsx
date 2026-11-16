'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/ThemeProvider';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Cloud,
  Plus,
  Database,
  KeyRound,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  Rocket,
  MessageSquareQuote,
  ShieldCheck,
  Activity,
  Server,
} from 'lucide-react';

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function FileCdnListPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [services, setServices] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/cdn/services');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load File CDN services');
      setEnabled(data.enabled !== false);
      setServices(data.data || []);
      setPlans(data.plans || []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load File CDN services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const activeCount = services.filter((s) => s.status === 'ACTIVE').length;
  const totalHourlyBurn = services
    .filter((s) => s.status === 'ACTIVE' && s.billingMode === 'PAYG')
    .reduce((acc, s) => acc + (s.hourlyRate || 0), 0);

  return (
    <div className="space-y-6 max-w-full pb-16">
      {/* Top Header (Matching Managed Apps & Object Storage) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className={cn('text-xl sm:text-2xl font-bold tracking-tight', isDark ? 'text-white' : 'text-slate-900')}>
              File CDN
            </h1>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold border whitespace-nowrap shrink-0',
                  isDark ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                )}
              >
                <Cloud className="w-3 h-3 shrink-0" />
                Global Edge Network
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold border whitespace-nowrap shrink-0',
                  isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                )}
              >
                <ShieldCheck className="w-3 h-3 shrink-0" />
                AES-256 Encrypted
              </span>
            </div>
          </div>
          <p className={cn('text-xs sm:text-sm font-medium mt-1.5 max-w-2xl leading-relaxed', isDark ? 'text-zinc-400' : 'text-slate-500')}>
            Deploy isolated File CDN spaces with encrypted edge storage, instant delivery links, and REST API keys.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/dashboard/cdn/reviews"
            className={cn(
              'px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 border cursor-pointer',
              isDark ? 'border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs'
            )}
          >
            <MessageSquareQuote className="w-3.5 h-3.5" />
            <span>Reviews</span>
          </Link>
          <button
            type="button"
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
          <Link
            href="/dashboard/cdn/new"
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 flex items-center justify-center gap-2 bg-cyan-400 hover:bg-cyan-300 active:scale-95 text-slate-950 shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Deploy File CDN</span>
          </Link>
        </div>
      </div>

      {!loading && !enabled && (
        <div
          className={cn(
            'p-4 rounded-2xl border flex items-center gap-3 text-xs',
            isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
          )}
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>File CDN provisioning is currently disabled by administrator settings.</span>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={cn('rounded-2xl border p-5 transition-all shadow-2xs', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn('text-[11px] font-bold uppercase tracking-wider', isDark ? 'text-zinc-400' : 'text-slate-500')}>
              CDN SPACES
            </span>
            <div className={cn('w-9 h-9 rounded-xl border flex items-center justify-center', isDark ? 'bg-cyan-500/15 border-cyan-500/25 text-cyan-400' : 'bg-cyan-50 border-cyan-200 text-cyan-700')}>
              <Cloud className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn('text-2xl font-black tracking-tight', isDark ? 'text-white' : 'text-slate-900')}>
              {services.length}
            </span>
            <span className={cn('text-xs font-semibold', isDark ? 'text-cyan-400' : 'text-cyan-600')}>
              Instances
            </span>
          </div>
        </div>

        <div className={cn('rounded-2xl border p-5 transition-all shadow-2xs', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn('text-[11px] font-bold uppercase tracking-wider', isDark ? 'text-zinc-400' : 'text-slate-500')}>
              ACTIVE STATUS
            </span>
            <div className={cn('w-9 h-9 rounded-xl border flex items-center justify-center', isDark ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700')}>
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn('text-2xl font-black tracking-tight', isDark ? 'text-white' : 'text-slate-900')}>
              {activeCount}
            </span>
            <span className={cn('text-xs font-semibold', isDark ? 'text-emerald-400' : 'text-emerald-600')}>
              Online
            </span>
          </div>
        </div>

        <div className={cn('rounded-2xl border p-5 transition-all shadow-2xs', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn('text-[11px] font-bold uppercase tracking-wider', isDark ? 'text-zinc-400' : 'text-slate-500')}>
              REGION &amp; EDGE
            </span>
            <div className={cn('w-9 h-9 rounded-xl border flex items-center justify-center', isDark ? 'bg-cyan-500/15 border-cyan-500/25 text-cyan-400' : 'bg-cyan-50 border-cyan-200 text-cyan-700')}>
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn('text-2xl font-black tracking-tight', isDark ? 'text-white' : 'text-slate-900')}>
              Sidoarjo
            </span>
            <span className={cn('text-xs font-semibold', isDark ? 'text-cyan-400' : 'text-cyan-600')}>
              ID-SDA
            </span>
          </div>
        </div>

        <div className={cn('rounded-2xl border p-5 transition-all shadow-2xs', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90 shadow-2xs')}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn('text-[11px] font-bold uppercase tracking-wider', isDark ? 'text-zinc-400' : 'text-slate-500')}>
              HOURLY PAYG RATE
            </span>
            <div className={cn('w-9 h-9 rounded-xl border flex items-center justify-center', isDark ? 'bg-cyan-500/15 border-cyan-500/25 text-cyan-400' : 'bg-cyan-50 border-cyan-200 text-cyan-700')}>
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn('text-2xl font-black tracking-tight', isDark ? 'text-white' : 'text-slate-900')}>
              Rp {totalHourlyBurn.toLocaleString('id-ID')}
            </span>
            <span className={cn('text-xs font-semibold', isDark ? 'text-cyan-400' : 'text-cyan-600')}>
              /hr
            </span>
          </div>
        </div>
      </div>

      {/* Services List */}
      {loading ? (
        <div className="min-h-[350px] w-full flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className={cn('text-xs font-medium', isDark ? 'text-zinc-400' : 'text-slate-500')}>
            Loading File CDN instances...
          </p>
        </div>
      ) : services.length === 0 ? (
        <div className={cn('rounded-2xl border p-10 sm:p-14 text-center shadow-2xs', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90')}>
          <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border', isDark ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : 'bg-cyan-50 border-cyan-200 text-cyan-700')}>
            <Cloud className="w-8 h-8" />
          </div>
          <h2 className={cn('text-lg font-bold mb-1.5', isDark ? 'text-white' : 'text-slate-900')}>
            No File CDN Services Provisioned
          </h2>
          <p className={cn('text-xs sm:text-sm max-w-md mx-auto mb-6 leading-relaxed', isDark ? 'text-zinc-400' : 'text-slate-500')}>
            Deploy an encrypted File CDN instance with its own isolated storage space, instant share links &amp; REST API access starting from Rp {(plans[0]?.price || 15000).toLocaleString('id-ID')}/mo.
          </p>
          <Link
            href="/dashboard/cdn/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all shadow-md cursor-pointer"
          >
            <Rocket className="w-4 h-4" />
            <span>Deploy Your First File CDN</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((svc) => {
            const isSuspended = svc.status === 'SUSPENDED';
            const isActive = svc.status === 'ACTIVE';
            const rawPct = svc.limitBytes > 0 ? Math.min(100, (svc.usedBytes / svc.limitBytes) * 100) : 0;

            const activeCount = services.filter((s) => s.status === 'ACTIVE').length;
  const totalHourlyBurn = services
    .filter((s) => s.status === 'ACTIVE' && s.billingMode === 'PAYG')
    .reduce((acc, s) => acc + (s.hourlyRate || 0), 0);

  return (
              <motion.div
                key={svc.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'rounded-2xl border p-5 transition-all flex flex-col justify-between group shadow-2xs',
                  isDark ? 'bg-[#111115] border-white/[0.08] hover:border-cyan-500/30' : 'bg-white border-slate-200/90 hover:border-slate-300'
                )}
              >
                <div>
                  {/* Card Header: Icon, Name, Status */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          'w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105',
                          isDark
                            ? 'bg-cyan-500/10 border-cyan-500/25 text-cyan-400 shadow-sm shadow-cyan-500/10'
                            : 'bg-cyan-50 border-cyan-200 text-cyan-700 shadow-2xs'
                        )}
                      >
                        <Cloud className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={cn(
                              'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border',
                              isDark ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300' : 'bg-cyan-50 border-cyan-200 text-cyan-700'
                            )}
                          >
                            {svc.planName} • PAYG
                          </span>
                        </div>
                        <h3 className={cn('font-bold text-sm sm:text-base tracking-tight truncate mt-1', isDark ? 'text-white' : 'text-slate-900')}>
                          {svc.name}
                        </h3>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap',
                          isSuspended
                            ? isDark
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                              : 'bg-amber-50 border-amber-200 text-amber-700'
                            : isActive
                              ? isDark
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : isDark
                                ? 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400'
                                : 'bg-slate-100 border-slate-200 text-slate-600'
                        )}
                      >
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full shrink-0',
                            isSuspended ? 'bg-amber-400' : isActive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-400'
                          )}
                        />
                        {isSuspended ? 'SUSPENDED (3-Day Grace)' : svc.status}
                      </span>
                    </div>
                  </div>

                  {isSuspended && (
                    <div
                      className={cn(
                        'p-2.5 rounded-xl border text-[11px] flex items-center gap-2 mb-3',
                        isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
                      )}
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Uploads disabled. Top up balance to auto-unsuspend.</span>
                    </div>
                  )}

                  {/* Storage Quota Box */}
                  <div className={cn('p-3 rounded-xl border mb-3', isDark ? 'bg-[#0a0a0c] border-white/[0.06]' : 'bg-slate-50 border-slate-200')}>
                    <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                      <span className={cn('text-[11px] font-medium', isDark ? 'text-zinc-400' : 'text-slate-500')}>Storage Used</span>
                      <span className={cn('font-mono font-bold text-[11px]', isDark ? 'text-zinc-200' : 'text-slate-800')}>
                        {formatBytes(svc.usedBytes || 0)} / {svc.limitGB > 0 ? `${svc.limitGB} GB` : 'Unlimited'}
                      </span>
                    </div>
                    <div className={cn('w-full h-1.5 rounded-full overflow-hidden', isDark ? 'bg-white/[0.06]' : 'bg-slate-200/80')}>
                      <div className="h-full bg-cyan-400 rounded-full transition-all" style={{ width: `${rawPct}%` }} />
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                    <div className={cn('p-2 rounded-lg border', isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-200')}>
                      <span className={cn('text-[10px] font-bold uppercase tracking-wider block', isDark ? 'text-zinc-500' : 'text-slate-400')}>
                        Storage Quota
                      </span>
                      <span className={cn('font-semibold text-[11px] inline-flex items-center gap-1.5 mt-0.5', isDark ? 'text-zinc-200' : 'text-slate-800')}>
                        <Database className={cn('w-3.5 h-3.5 shrink-0', isDark ? 'text-cyan-400' : 'text-cyan-700')} />
                        {svc.storageLimitGb || svc.quotaGb || 10} GB Edge CDN
                      </span>
                    </div>
                    <div className={cn('p-2 rounded-lg border', isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50 border-slate-200')}>
                      <span className={cn('text-[10px] font-bold uppercase tracking-wider block', isDark ? 'text-zinc-500' : 'text-slate-400')}>
                        API Keys
                      </span>
                      <span className={cn('font-semibold text-[11px] inline-flex items-center gap-1.5 mt-0.5', isDark ? 'text-zinc-200' : 'text-slate-800')}>
                        <KeyRound className={cn('w-3.5 h-3.5 shrink-0', isDark ? 'text-cyan-400' : 'text-cyan-700')} />
                        {svc.apiKeysCount || 0} Keys
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className={cn('pt-3 border-t flex items-center justify-between gap-2', isDark ? 'border-white/[0.06]' : 'border-slate-100')}>
                  <div className="min-w-0">
                    <span className={cn('text-[10px] block', isDark ? 'text-zinc-500' : 'text-slate-400')}>Commitment</span>
                    <div className="flex items-baseline gap-1 flex-wrap">
                      <span className={cn('font-mono font-bold text-xs sm:text-sm', isDark ? 'text-cyan-400' : 'text-cyan-700')}>
                        Rp {(svc.hourlyRate || 0).toLocaleString('id-ID')}
                        <span className={cn('text-[10px] font-normal', isDark ? 'text-zinc-500' : 'text-slate-500')}>/hr</span>
                      </span>
                      <span className={cn('text-[10px]', isDark ? 'text-zinc-500' : 'text-slate-400')}>
                        (Rp {(svc.monthlyPrice || 0).toLocaleString('id-ID')}/mo)
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/cdn/${svc.id}`}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-cyan-400 hover:bg-cyan-300 active:scale-95 text-slate-950 shadow-sm transition-all whitespace-nowrap shrink-0"
                  >
                    <span>Open Console</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
