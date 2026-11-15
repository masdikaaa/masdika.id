'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/ThemeProvider';
import { toast } from 'sonner';
import { Database, HardDrive, RefreshCw, ShieldAlert, Play, Pause, Trash2, ExternalLink, Loader2 } from 'lucide-react';

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function AdminObjectStoragePage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [publicEndpoint, setPublicEndpoint] = useState('');

  const fetchMonitor = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/object-storage');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setServices(data.services || []);
      setStats(data.stats || {});
      setPublicEndpoint(data.publicEndpoint || '');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load Object Storage monitor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitor();
  }, []);

  const handleToggleSuspend = async (svc: any) => {
    const suspend = svc.status !== 'SUSPENDED';
    try {
      const res = await fetch(`/api/admin/services/object-storage/${svc.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: suspend ? 'suspend' : 'unsuspend',
          reason: suspend ? 'Suspended by Administrator' : undefined,
        }),
      });
      if (!res.ok) throw new Error('Action failed');
      toast.success(suspend ? 'Service suspended & S3 keys disabled' : 'Service unsuspended');
      fetchMonitor();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update status');
    }
  };

  const handleTerminate = async (svc: any) => {
    if (!confirm(`Terminate Object Storage "${svc.name}" and delete all buckets & keys?`)) return;
    try {
      const res = await fetch(`/api/admin/services/object-storage/${svc.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      toast.success('Object Storage terminated');
      fetchMonitor();
    } catch {
      toast.error('Failed to terminate service');
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={cn('text-2xl font-bold tracking-tight flex items-center gap-2.5', isDark ? 'text-white' : 'text-slate-900')}>
            <Database className="w-6 h-6 text-indigo-400" /> Object Storage Monitor
          </h1>
          <p className={cn('text-xs sm:text-sm mt-1', isDark ? 'text-zinc-400' : 'text-slate-500')}>
            Monitor customer S3 Object Storage services, bucket quotas, IAM keys &amp; cluster usage ({publicEndpoint || 'No public domain configured'}).
          </p>
        </div>
        <button
          onClick={fetchMonitor}
          className={cn('px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 cursor-pointer', isDark ? 'bg-white/5 border-white/10 text-zinc-200' : 'bg-white border-slate-200 text-slate-700')}
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Services', value: stats.totalServices ?? 0, sub: `${stats.runningCount ?? 0} running • ${stats.suspendedCount ?? 0} suspended` },
          { label: 'Allocated Quota', value: `${stats.totalQuotaGb ?? 0} GB`, sub: 'Total customer S3 quota' },
          { label: 'Actual Used', value: formatBytes(stats.totalUsedBytes ?? 0), sub: 'Across all customer buckets' },
          { label: 'Hourly Revenue', value: `Rp ${(stats.totalHourlyRevenue ?? 0).toLocaleString('id-ID')}/hr`, sub: 'Active PAYG burn rate' },
        ].map((card) => (
          <div key={card.label} className={cn('p-4 rounded-2xl border', isDark ? 'bg-[#0a0a0c] border-white/[0.08]' : 'bg-white border-slate-200')}>
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">{card.label}</div>
            <div className={cn('text-xl font-bold mt-1', isDark ? 'text-white' : 'text-slate-900')}>{card.value}</div>
            <div className="text-[11px] text-zinc-500 mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className={cn('rounded-2xl border overflow-hidden', isDark ? 'bg-[#0a0a0c] border-white/[0.08]' : 'bg-white border-slate-200')}>
        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
        ) : services.length === 0 ? (
          <div className="py-16 text-center text-xs text-zinc-500">No customer Object Storage services deployed yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={cn('border-b text-[11px] uppercase tracking-wider', isDark ? 'border-white/[0.08] bg-white/[0.02] text-zinc-400' : 'border-slate-200 bg-slate-50 text-slate-500')}>
                <tr>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Usage / Quota</th>
                  <th className="px-4 py-3">Buckets / Keys</th>
                  <th className="px-4 py-3">Billing</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {services.map((svc) => (
                  <tr key={svc.id} className={isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}>
                    <td className="px-4 py-3">
                      <div className={cn('font-bold', isDark ? 'text-white' : 'text-slate-900')}>{svc.name}</div>
                      <div className="text-[11px] text-zinc-500">{svc.planName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/customers/${svc.user.id}`} className="text-indigo-400 hover:underline font-semibold flex items-center gap-1">
                        {svc.user.name} <ExternalLink className="w-3 h-3" />
                      </Link>
                      <div className="text-[11px] text-zinc-500">{svc.user.email}</div>
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {formatBytes(svc.usedBytes)} / {svc.storageGb} GB
                    </td>
                    <td className="px-4 py-3">
                      {svc.buckets?.length || 0} buckets • {svc.keys?.length || 0} keys
                    </td>
                    <td className="px-4 py-3">
                      <div>Rp {svc.hourlyRate.toLocaleString('id-ID')}/hr</div>
                      <div className="text-[11px] text-zinc-500">Acc: Rp {svc.accumulatedCost.toLocaleString('id-ID')}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border', svc.status === 'SUSPENDED' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400')}>
                        {svc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleSuspend(svc)}
                          title={svc.status === 'SUSPENDED' ? 'Unsuspend' : 'Suspend'}
                          className="p-1.5 rounded-lg border border-white/10 hover:bg-white/10 text-amber-400 cursor-pointer"
                        >
                          {svc.status === 'SUSPENDED' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleTerminate(svc)}
                          title="Terminate"
                          className="p-1.5 rounded-lg border border-white/10 hover:bg-red-500/20 text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
