'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Globe,
  Plus,
  Trash2,
  Link as LinkIcon,
  Unlink,
  Server,
  Copy,
  Check,
  Search,
  Lock,
  ShieldCheck,
  Receipt,
  Loader2,
  X,
  ArrowRight,
  Zap,
  Activity,
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';
import { formatRupiah } from '@/lib/billing';
import { Select } from '@/components/ui/Select';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface ReservedIp {
  id: number;
  ipAddress: string;
  publicIp: string | null;
  hourlyRate: number;
  accumulatedCost: number;
  isAttached: boolean;
  vpsId: number | null;
  vps?: {
    id: number;
    hostname: string;
    name: string;
  } | null;
  createdAt: string;
}

interface VpsItem {
  id: number;
  hostname: string;
  name: string;
  status: string;
  assignedIps?: string[];
  vpcIp?: string;
}

const MAX_ELASTIC_IP_QUOTA = 5;

function isIpv6Address(ip: string): boolean {
  return ip.includes(':');
}

export default function ElasticIpsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [ips, setIps] = useState<ReservedIp[]>([]);
  const [vpsList, setVpsList] = useState<VpsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ATTACHED' | 'AVAILABLE'>('ALL');

  // Attach Modal State
  const [attachingIp, setAttachingIp] = useState<ReservedIp | null>(null);
  const [selectedVpsId, setSelectedVpsId] = useState<string>('');
  const [attaching, setAttaching] = useState(false);

  // Detach Confirm State
  const [detachingIp, setDetachingIp] = useState<ReservedIp | null>(null);
  const [detaching, setDetaching] = useState(false);

  // Release Confirm State
  const [releasingIp, setReleasingIp] = useState<ReservedIp | null>(null);
  const [releasing, setReleasing] = useState(false);

  // Bulk Release State
  const [isBulkReleaseOpen, setIsBulkReleaseOpen] = useState(false);
  const [bulkReleasing, setBulkReleasing] = useState(false);

  const fetchData = async () => {
    try {
      const [ipsRes, vpsRes] = await Promise.all([
        fetch('/api/user/reserved-ips'),
        fetch('/api/user/vps'),
      ]);

      if (ipsRes.ok) {
        const data = await ipsRes.json();
        setIps(Array.isArray(data) ? data : []);
      }
      if (vpsRes.ok) {
        const data = await vpsRes.json();
        setVpsList(Array.isArray(data) ? data : []);
      }
    } catch {
      toast.error('Failed to load Elastic IP data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCopy = (value: string, key: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    toast.success('IP address copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleAttach = async () => {
    if (!attachingIp || !selectedVpsId) return;
    setAttaching(true);
    try {
      const res = await fetch(`/api/user/reserved-ips/${attachingIp.id}/attach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vpsId: Number(selectedVpsId) }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to attach Elastic IP');
      } else {
        toast.success(data.message || 'Elastic IP attached to instance');
        setAttachingIp(null);
        setSelectedVpsId('');
        await fetchData();
      }
    } catch {
      toast.error('Failed to attach Elastic IP');
    } finally {
      setAttaching(false);
    }
  };

  const handleDetach = async () => {
    if (!detachingIp) return;
    setDetaching(true);
    try {
      const res = await fetch(`/api/user/reserved-ips/${detachingIp.id}/detach`, {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to detach Elastic IP');
      } else {
        toast.success(data.message || 'Elastic IP detached and returned to available pool');
        setDetachingIp(null);
        await fetchData();
      }
    } catch {
      toast.error('Failed to detach Elastic IP');
    } finally {
      setDetaching(false);
    }
  };

  const handleRelease = async () => {
    if (!releasingIp) return;
    setReleasing(true);
    try {
      const res = await fetch(`/api/user/reserved-ips/${releasingIp.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to release Elastic IP');
      } else {
        toast.success('Elastic IP permanently released');
        setReleasingIp(null);
        await fetchData();
      }
    } catch {
      toast.error('Failed to release Elastic IP');
    } finally {
      setReleasing(false);
    }
  };

  const unattachedIps = useMemo(() => ips.filter((ip) => !ip.isAttached), [ips]);
  const attachedCount = ips.length - unattachedIps.length;
  const totalHourlyBurn = useMemo(
    () => ips.reduce((acc, ip) => acc + (ip.hourlyRate || 0), 0),
    [ips]
  );

  const handleBulkRelease = async () => {
    if (unattachedIps.length === 0) return;
    setBulkReleasing(true);
    let successCount = 0;

    for (const ip of unattachedIps) {
      try {
        const res = await fetch(`/api/user/reserved-ips/${ip.id}`, {
          method: 'DELETE',
        });
        if (res.ok) successCount++;
      } catch {
        // continue releasing remaining unattached IPs
      }
    }

    toast.success(`Released ${successCount} unattached Elastic IP(s)`);
    setIsBulkReleaseOpen(false);
    setBulkReleasing(false);
    await fetchData();
  };

  const filteredIps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ips.filter((ip) => {
      if (statusFilter === 'ATTACHED' && !ip.isAttached) return false;
      if (statusFilter === 'AVAILABLE' && ip.isAttached) return false;

      if (!q) return true;
      const matchesLocal = ip.ipAddress.toLowerCase().includes(q);
      const matchesPublic = (ip.publicIp || '').toLowerCase().includes(q);
      const matchesVps =
        (ip.vps?.hostname || '').toLowerCase().includes(q) ||
        (ip.vps?.name || '').toLowerCase().includes(q);
      return matchesLocal || matchesPublic || matchesVps;
    });
  }, [ips, searchQuery, statusFilter]);

  const quotaReached = ips.length >= MAX_ELASTIC_IP_QUOTA;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1
              className={cn(
                'text-2xl font-bold tracking-tight',
                isDark ? 'text-white' : 'text-slate-900'
              )}
            >
              Elastic Static IPs
            </h1>
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border',
                isDark
                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                  : 'bg-cyan-50 text-cyan-700 border-cyan-200'
              )}
            >
              <Lock className="w-3 h-3" />
              Static Public IP
            </span>
          </div>
          <p className={cn('text-sm mt-1', isDark ? 'text-zinc-400' : 'text-slate-600')}>
            Auto-allocated static public IP addresses that stay permanently bound to your account
            and can be attached or moved across any Cloud VPS.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:flex sm:items-center gap-2.5 w-full sm:w-auto shrink-0">
          {unattachedIps.length > 0 && (
            <button
              onClick={() => setIsBulkReleaseOpen(true)}
              className={cn(
                'inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium border transition-colors whitespace-nowrap',
                isDark
                  ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'
                  : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
              )}
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              Release Unattached ({unattachedIps.length})
            </button>
          )}
          {quotaReached ? (
            <span
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-zinc-700 text-zinc-400 cursor-not-allowed whitespace-nowrap"
            >
              <Plus className="w-4 h-4 shrink-0" />
              Quota Reached ({MAX_ELASTIC_IP_QUOTA}/{MAX_ELASTIC_IP_QUOTA})
            </span>
          ) : (
            <Link
              href="/dashboard/reserved-ips/new"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg bg-cyan-400 hover:bg-cyan-300 text-zinc-950 shadow-cyan-500/20 whitespace-nowrap"
            >
              <Plus className="w-4 h-4 shrink-0" />
              Allocate Elastic IP
            </Link>
          )}
        </div>
      </div>

      {/* 3 Summary Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className={cn(
            'rounded-2xl border p-5 transition-colors',
            isDark
              ? 'bg-[#111115] border-white/[0.08]'
              : 'bg-white border-slate-200 shadow-sm'
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={cn('text-xs font-medium uppercase tracking-wider', isDark ? 'text-zinc-400' : 'text-slate-500')}>
              Allocated Quota
            </span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn('text-2xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>
              {ips.length} / {MAX_ELASTIC_IP_QUOTA}
            </span>
            <span className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-slate-500')}>
              Elastic IPs
            </span>
          </div>
          <div className={cn('mt-3 h-1.5 rounded-full overflow-hidden', isDark ? 'bg-zinc-800' : 'bg-slate-100')}>
            <div
              className="h-full bg-cyan-400 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (ips.length / MAX_ELASTIC_IP_QUOTA) * 100)}%` }}
            />
          </div>
        </div>

        <div
          className={cn(
            'rounded-2xl border p-5 transition-colors',
            isDark
              ? 'bg-[#111115] border-white/[0.08]'
              : 'bg-white border-slate-200 shadow-sm'
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={cn('text-xs font-medium uppercase tracking-wider', isDark ? 'text-zinc-400' : 'text-slate-500')}>
              Attachment Status
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-4">
            <div>
              <span className={cn('text-2xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>
                {attachedCount}
              </span>
              <span className="text-xs text-emerald-400 ml-1.5 font-medium">Attached</span>
            </div>
            <span className={cn('text-sm', isDark ? 'text-zinc-600' : 'text-slate-300')}>/</span>
            <div>
              <span className={cn('text-2xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>
                {unattachedIps.length}
              </span>
              <span className="text-xs text-cyan-400 ml-1.5 font-medium">Available</span>
            </div>
          </div>
          <p className={cn('text-xs mt-2.5', isDark ? 'text-zinc-500' : 'text-slate-500')}>
            Static IPs persist across VPS rebuilds and reassignments.
          </p>
        </div>

        <div
          className={cn(
            'rounded-2xl border p-5 transition-colors',
            isDark
              ? 'bg-[#111115] border-white/[0.08]'
              : 'bg-white border-slate-200 shadow-sm'
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={cn('text-xs font-medium uppercase tracking-wider', isDark ? 'text-zinc-400' : 'text-slate-500')}>
              Total Hourly Burn Rate
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              PAYG RUNNING
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={cn('text-2xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>
              {formatRupiah(totalHourlyBurn)}
            </span>
            <span className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-slate-500')}>/ hour</span>
          </div>
          <p className={cn('text-xs mt-2.5 flex items-center gap-1.5', isDark ? 'text-zinc-500' : 'text-slate-500')}>
            <Receipt className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            Billed independently via PAYG Running invoice
          </p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div
        className={cn(
          'flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl border',
          isDark
            ? 'bg-[#111115] border-white/[0.08]'
            : 'bg-white border-slate-200 shadow-sm'
        )}
      >
        <div className="relative flex-1 max-w-md">
          <Search
            className={cn(
              'w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2',
              isDark ? 'text-zinc-500' : 'text-slate-400'
            )}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by public IP, local IP, or attached VPS..."
            className={cn(
              'w-full pl-10 pr-4 py-2 rounded-xl text-sm border outline-none transition-colors',
              isDark
                ? 'bg-zinc-900/80 border-white/[0.08] text-white placeholder:text-zinc-500 focus:border-cyan-500/50'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500'
            )}
          />
        </div>

        <div className="flex items-center gap-1.5">
          {(['ALL', 'ATTACHED', 'AVAILABLE'] as const).map((tab) => {
            const active = statusFilter === tab;
            const label = tab === 'ALL' ? 'All' : tab === 'ATTACHED' ? 'Attached' : 'Available';
            return (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all',
                  active
                    ? 'bg-cyan-400 text-zinc-950'
                    : isDark
                    ? 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/[0.06]'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content List */}
      {loading ? (
        <div
          className={cn(
            'rounded-2xl border p-12 flex flex-col items-center justify-center gap-3',
            isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200'
          )}
        >
          <Loader2 className="w-7 h-7 animate-spin text-cyan-400" />
          <p className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-slate-500')}>
            Loading Elastic Static IPs...
          </p>
        </div>
      ) : ips.length === 0 ? (
        <div
          className={cn(
            'rounded-2xl border p-12 text-center',
            isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200 shadow-sm'
          )}
        >
          <div
            className={cn(
              'w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4 border',
              isDark
                ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                : 'bg-cyan-50 border-cyan-200 text-cyan-600'
            )}
          >
            <Globe className="w-7 h-7" />
          </div>
          <h3 className={cn('text-lg font-semibold', isDark ? 'text-white' : 'text-slate-900')}>
            No Elastic Static IPs Allocated
          </h3>
          <p
            className={cn(
              'text-sm max-w-md mx-auto mt-1.5 mb-6',
              isDark ? 'text-zinc-400' : 'text-slate-600'
            )}
          >
            Allocate a static public IPv4 or IPv6 address automatically from our pool. Your IP
            never changes and can be attached to any Cloud VPS on demand.
          </p>
          <Link
            href="/dashboard/reserved-ips/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-zinc-950 font-semibold text-sm transition-all shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4" />
            Allocate Your First Elastic IP
          </Link>
        </div>
      ) : filteredIps.length === 0 ? (
        <div
          className={cn(
            'rounded-2xl border p-10 text-center',
            isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200'
          )}
        >
          <p className={cn('text-sm font-medium', isDark ? 'text-zinc-300' : 'text-slate-700')}>
            No Elastic IPs match your current filter.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
            }}
            className="mt-3 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredIps.map((ip) => {
            const isIpv6 = isIpv6Address(ip.ipAddress);
            const displayPublicIp = ip.publicIp || ip.ipAddress;
            const showLocalIp = Boolean(ip.publicIp && ip.publicIp !== ip.ipAddress);

            return (
              <div
                key={ip.id}
                className={cn(
                  'rounded-2xl border p-5 transition-all',
                  isDark
                    ? 'bg-[#111115] border-white/[0.08] hover:border-white/[0.15]'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                )}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  {/* Left: IP Info & Badges */}
                  <div className="space-y-3 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {isIpv6 ? 'IPv6' : 'IPv4'}
                      </span>

                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'text-lg font-mono font-bold tracking-tight',
                            isDark ? 'text-white' : 'text-slate-900'
                          )}
                        >
                          {displayPublicIp}
                        </span>
                        <button
                          onClick={() => handleCopy(displayPublicIp, `pub-${ip.id}`)}
                          title="Copy Public IP"
                          className={cn(
                            'p-1.5 rounded-lg transition-colors',
                            isDark
                              ? 'hover:bg-white/[0.06] text-zinc-400 hover:text-white'
                              : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                          )}
                        >
                          {copiedKey === `pub-${ip.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {ip.isAttached ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Attached
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                          Available
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        PAYG RUNNING
                      </span>
                    </div>

                    {/* Secondary details row */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                      {showLocalIp && (
                        <div className="flex items-center gap-1.5">
                          <span className={isDark ? 'text-zinc-500' : 'text-slate-500'}>
                            Local Gateway IP:
                          </span>
                          <code
                            className={cn(
                              'font-mono px-1.5 py-0.5 rounded',
                              isDark ? 'bg-zinc-900 text-zinc-300' : 'bg-slate-100 text-slate-700'
                            )}
                          >
                            {ip.ipAddress}
                          </code>
                          <button
                            onClick={() => handleCopy(ip.ipAddress, `loc-${ip.id}`)}
                            title="Copy Local IP"
                            className={cn(
                              'p-1 rounded transition-colors',
                              isDark ? 'text-zinc-500 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                            )}
                          >
                            {copiedKey === `loc-${ip.id}` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5">
                        <Server className="w-3.5 h-3.5 text-cyan-400" />
                        <span className={isDark ? 'text-zinc-500' : 'text-slate-500'}>Target:</span>
                        {ip.isAttached && ip.vps ? (
                          <Link
                            href={`/dashboard/vps/${ip.vps.id}`}
                            className="font-semibold text-cyan-400 hover:text-cyan-300 hover:underline"
                          >
                            {ip.vps.hostname || ip.vps.name}
                          </Link>
                        ) : (
                          <span className={isDark ? 'text-zinc-400' : 'text-slate-600'}>
                            Unassigned (Ready to attach)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-cyan-400" />
                        <span className={isDark ? 'text-zinc-500' : 'text-slate-500'}>Rate:</span>
                        <span className={cn('font-semibold', isDark ? 'text-zinc-200' : 'text-slate-800')}>
                          {formatRupiah(ip.hourlyRate)}/hr
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                        <span className={isDark ? 'text-zinc-500' : 'text-slate-500'}>
                          Accumulated Cost:
                        </span>
                        <span className={cn('font-semibold', isDark ? 'text-zinc-200' : 'text-slate-800')}>
                          {formatRupiah(ip.accumulatedCost || 0)}
                        </span>
                      </div>
                    </div>

                    <p className={cn('text-[11px] flex items-center gap-1.5', isDark ? 'text-zinc-500' : 'text-slate-500')}>
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      Static IP locked to your account. Billed independently via PAYG Running invoice.
                    </p>
                  </div>

                  {/* Right: Actions */}
                  <div className="grid grid-cols-2 lg:flex lg:items-center gap-2 w-full lg:w-auto shrink-0">
                    {ip.isAttached ? (
                      <button
                        onClick={() => setDetachingIp(ip)}
                        className={cn(
                          'col-span-2 lg:col-span-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap',
                          isDark
                            ? 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/20'
                            : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-200'
                        )}
                      >
                        <Unlink className="w-3.5 h-3.5 shrink-0" />
                        Detach
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setAttachingIp(ip);
                            setSelectedVpsId('');
                          }}
                          className="col-span-2 lg:col-span-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-400 hover:bg-cyan-300 text-zinc-950 transition-colors whitespace-nowrap"
                        >
                          <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                          Attach to VPS
                        </button>

                        <Link
                          href={`/dashboard/vps/new?reservedIpId=${ip.id}`}
                          className={cn(
                            'inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap',
                            isDark
                              ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-white/[0.08]'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                          )}
                        >
                          Deploy VPS
                          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                        </Link>

                        <button
                          onClick={() => setReleasingIp(ip)}
                          className={cn(
                            'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap',
                            isDark
                              ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'
                              : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
                          )}
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          Release
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Attach to VPS Modal */}
      {attachingIp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div
            className={cn(
              'w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-5',
              isDark ? 'bg-[#111115] border-white/[0.1]' : 'bg-white border-slate-200'
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className={cn('text-lg font-bold', isDark ? 'text-white' : 'text-slate-900')}>
                  Attach Elastic IP to VPS
                </h2>
                <p className={cn('text-xs mt-1', isDark ? 'text-zinc-400' : 'text-slate-600')}>
                  Bind <span className="font-mono font-semibold text-cyan-400">{attachingIp.publicIp || attachingIp.ipAddress}</span> to an active Cloud VPS instance.
                </p>
              </div>
              <button
                onClick={() => setAttachingIp(null)}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  isDark ? 'text-zinc-400 hover:text-white hover:bg-white/[0.06]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                )}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className={cn('text-xs font-medium block', isDark ? 'text-zinc-300' : 'text-slate-700')}>
                Select Target Cloud VPS
              </label>
              <Select
                value={selectedVpsId}
                onChange={setSelectedVpsId}
                placeholder="Choose a Cloud VPS..."
                options={vpsList.map((vps) => ({
                  value: String(vps.id),
                  label: `${vps.hostname || vps.name} (${vps.status})`,
                }))}
              />
              {vpsList.length === 0 && (
                <p className="text-xs text-amber-400">
                  No Cloud VPS instances found. Deploy a VPS first to attach this IP.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setAttachingIp(null)}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium border transition-colors',
                  isDark
                    ? 'border-white/[0.08] text-zinc-300 hover:bg-white/[0.05]'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                )}
              >
                Cancel
              </button>
              <button
                onClick={handleAttach}
                disabled={!selectedVpsId || attaching}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-cyan-400 hover:bg-cyan-300 text-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {attaching && <Loader2 className="w-4 h-4 animate-spin" />}
                {attaching ? 'Attaching...' : 'Attach IP'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detach Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(detachingIp)}
        onClose={() => setDetachingIp(null)}
        onConfirm={handleDetach}
        title="Detach Elastic IP?"
        description={
          detachingIp
            ? `Detaching ${detachingIp.publicIp || detachingIp.ipAddress} will remove it from ${
                detachingIp.vps?.hostname || detachingIp.vps?.name || 'the attached VPS'
              }. The static IP will remain reserved in your account and continue PAYG billing until released.`
            : ''
        }
        confirmText={detaching ? 'Detaching...' : 'Detach IP'}
        variant="warning"
        isLoading={detaching}
      />

      {/* Release Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(releasingIp)}
        onClose={() => setReleasingIp(null)}
        onConfirm={handleRelease}
        title="Release Elastic IP Permanently?"
        description={
          releasingIp
            ? `Are you sure you want to release ${releasingIp.publicIp || releasingIp.ipAddress}? This IP will be returned to the public pool and cannot be guaranteed back later. Hourly billing for this IP will stop immediately.`
            : ''
        }
        confirmText={releasing ? 'Releasing...' : 'Release IP'}
        variant="danger"
        isLoading={releasing}
      />

      {/* Bulk Release Confirm Modal */}
      <ConfirmModal
        isOpen={isBulkReleaseOpen}
        onClose={() => setIsBulkReleaseOpen(false)}
        onConfirm={handleBulkRelease}
        title={`Release ${unattachedIps.length} Unattached Elastic IP(s)?`}
        description="All unattached Elastic IPs will be permanently returned to the public pool and their PAYG billing will stop immediately. Attached IPs will not be affected."
        confirmText={bulkReleasing ? 'Releasing...' : 'Release All Unattached'}
        variant="danger"
        isLoading={bulkReleasing}
      />
    </div>
  );
}
