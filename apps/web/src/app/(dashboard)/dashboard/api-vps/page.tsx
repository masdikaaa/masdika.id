'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  BookOpen,
  Server,
  Sparkles,
  Loader2,
  X,
  Terminal,
  ShieldCheck,
  Activity,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface ApiKeyItem {
  id: number;
  name: string;
  key: string;
  service: string;
  status: string;
  usageCount: number;
  lastUsed: string | null;
  createdAt: string;
}

interface VpsItem {
  id: number;
  hostname: string;
  name?: string;
  status: string;
  cpuCores: number;
  ramGb: number;
  diskGb: number;
  assignedIps?: { ipAddress: string; publicIp?: string | null; isPrimary?: boolean }[];
}

const MAX_API_KEYS = 5;
const VPS_PER_PAGE = 5;

export default function ApiVpsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [vpsList, setVpsList] = useState<VpsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [vpsSearch, setVpsSearch] = useState('');
  const [vpsPage, setVpsPage] = useState(1);

  // Generate Key Modal
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [generating, setGenerating] = useState(false);

  // Revoke Confirm Modal
  const [revokingKey, setRevokingKey] = useState<ApiKeyItem | null>(null);
  const [revoking, setRevoking] = useState(false);

  const fetchData = async () => {
    try {
      const [keysRes, vpsRes] = await Promise.all([
        fetch('/api/user/api-keys'),
        fetch('/api/user/vps'),
      ]);

      if (keysRes.ok) {
        const data = await keysRes.json();
        setApiKeys(Array.isArray(data.apiKeys) ? data.apiKeys : []);
      }

      if (vpsRes.ok) {
        const data = await vpsRes.json();
        setVpsList(Array.isArray(data) ? data : []);
      }
    } catch {
      toast.error('Failed to load API VPS data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCopy = (value: string, id: string, label = 'Copied to clipboard') => {
    navigator.clipboard.writeText(value);
    setCopiedId(id);
    toast.success(label);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: keyName.trim() || 'VPS API Key',
          service: 'VPS',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to generate API key');
        return;
      }

      toast.success('Free VPS API key generated successfully');
      setKeyName('');
      setIsGenerateOpen(false);
      await fetchData();
    } catch {
      toast.error('Network error while generating API key');
    } finally {
      setGenerating(false);
    }
  };

  const handleRevokeKey = async () => {
    if (!revokingKey) return;
    setRevoking(true);
    try {
      const res = await fetch('/api/user/api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: revokingKey.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to revoke API key');
        return;
      }

      toast.success('API key revoked');
      setRevokingKey(null);
      await fetchData();
    } catch {
      toast.error('Failed to revoke API key');
    } finally {
      setRevoking(false);
    }
  };

  const quotaReached = apiKeys.length >= MAX_API_KEYS;
  const activeVpsCount = vpsList.filter((v) => v.status !== 'TERMINATED').length;
  const canGenerateKey = !quotaReached && activeVpsCount > 0;
  const normalizedSearch = vpsSearch.trim().toLowerCase();
  const filteredVpsList = normalizedSearch
    ? vpsList.filter((v) => {
        const ipMatches = v.assignedIps?.some(
          (ip) =>
            ip.ipAddress?.toLowerCase().includes(normalizedSearch) ||
            ip.publicIp?.toLowerCase().includes(normalizedSearch)
        );
        return (
          String(v.id).includes(normalizedSearch) ||
          v.hostname?.toLowerCase().includes(normalizedSearch) ||
          v.status?.toLowerCase().includes(normalizedSearch) ||
          Boolean(ipMatches)
        );
      })
    : vpsList;
  const totalVpsPages = Math.max(1, Math.ceil(filteredVpsList.length / VPS_PER_PAGE));
  const safeVpsPage = Math.min(vpsPage, totalVpsPages);
  const paginatedVpsList = filteredVpsList.slice(
    (safeVpsPage - 1) * VPS_PER_PAGE,
    safeVpsPage * VPS_PER_PAGE
  );
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://masdika.id';
  const sampleKey = apiKeys[0]?.key || 'masdika_your_api_key';

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1
              className={cn(
                'text-2xl font-bold tracking-tight',
                isDark ? 'text-white' : 'text-slate-900'
              )}
            >
              API VPS
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
              Free Forever
            </span>
          </div>
          <p className={cn('text-sm mt-1', isDark ? 'text-zinc-400' : 'text-slate-600')}>
            Automate your Cloud VPS power operations (start, stop, reboot, and status checks) via
            REST API at zero cost.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/dashboard/api-vps/docs"
            className={cn(
              'inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium border transition-colors',
              isDark
                ? 'bg-[#111115] hover:bg-white/[0.04] text-zinc-200 border-white/[0.08]'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm'
            )}
          >
            <BookOpen className="w-4 h-4 text-cyan-400" />
            Documentation
          </Link>

          <button
            onClick={() => setIsGenerateOpen(true)}
            disabled={!canGenerateKey}
            title={activeVpsCount === 0 ? 'Order a Cloud VPS first to generate an API key' : undefined}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg',
              !canGenerateKey
                ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed shadow-none'
                : 'bg-cyan-400 hover:bg-cyan-300 text-zinc-950 shadow-cyan-500/20'
            )}
          >
            <Plus className="w-4 h-4" />
            Generate API Key
          </button>
        </div>
      </div>

      {/* 3 Summary Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className={cn(
            'rounded-2xl border p-5 transition-colors',
            isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200 shadow-sm'
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={cn('text-xs font-medium uppercase tracking-wider', isDark ? 'text-zinc-400' : 'text-slate-500')}>
              API Key Quota
            </span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Key className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn('text-2xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>
              {apiKeys.length} / {MAX_API_KEYS}
            </span>
            <span className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-slate-500')}>
              active keys
            </span>
          </div>
          <div className={cn('mt-3 h-1.5 rounded-full overflow-hidden', isDark ? 'bg-zinc-800' : 'bg-slate-100')}>
            <div
              className="h-full bg-cyan-400 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (apiKeys.length / MAX_API_KEYS) * 100)}%` }}
            />
          </div>
        </div>

        <div
          className={cn(
            'rounded-2xl border p-5 transition-colors',
            isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200 shadow-sm'
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={cn('text-xs font-medium uppercase tracking-wider', isDark ? 'text-zinc-400' : 'text-slate-500')}>
              Controllable Instances
            </span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn('text-2xl font-bold', isDark ? 'text-white' : 'text-slate-900')}>
              {activeVpsCount}
            </span>
            <span className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-slate-500')}>
              Cloud VPS
            </span>
          </div>
          <p className={cn('text-xs mt-2.5', isDark ? 'text-zinc-500' : 'text-slate-500')}>
            Supports start, stop, reboot &amp; status inspection.
          </p>
        </div>

        <div
          className={cn(
            'rounded-2xl border p-5 transition-colors',
            isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200 shadow-sm'
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={cn('text-xs font-medium uppercase tracking-wider', isDark ? 'text-zinc-400' : 'text-slate-500')}>
              API Access Fee
            </span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-cyan-400">FREE</span>
            <span className={cn('text-xs', isDark ? 'text-zinc-500' : 'text-slate-500')}>
              Rp 0 / Forever
            </span>
          </div>
          <p className={cn('text-xs mt-2.5 flex items-center gap-1.5', isDark ? 'text-zinc-500' : 'text-slate-500')}>
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            No minimum balance or subscription required.
          </p>
        </div>
      </div>

      {/* Controllable VPS Instances */}
      <div
        className={cn(
          'rounded-2xl border overflow-hidden',
          isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200 shadow-sm'
        )}
      >
        <div
          className={cn(
            'px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3',
            isDark ? 'border-white/[0.08]' : 'border-slate-200'
          )}
        >
          <div className="flex items-center gap-2.5">
            <Server className="w-4 h-4 text-cyan-400" />
            <h2 className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>
              Your Cloud VPS Instances
            </h2>
            <span
              className={cn(
                'text-xs px-2.5 py-0.5 rounded-full border font-medium',
                isDark
                  ? 'bg-zinc-900 border-white/[0.08] text-zinc-400'
                  : 'bg-slate-100 border-slate-200 text-slate-600'
              )}
            >
              {activeVpsCount} Instances
            </span>
          </div>

          {vpsList.length > 0 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setVpsPage(1);
              }}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <div className="relative flex-1 sm:w-64">
                <Search
                  className={cn(
                    'w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none',
                    isDark ? 'text-zinc-500' : 'text-slate-400'
                  )}
                />
                <input
                  type="text"
                  value={vpsSearch}
                  onChange={(e) => {
                    setVpsSearch(e.target.value);
                    setVpsPage(1);
                  }}
                  placeholder="Search ID, hostname, or IP..."
                  className={cn(
                    'w-full pl-8 pr-8 py-1.5 rounded-xl text-xs border focus:outline-none focus:ring-2 transition-all',
                    isDark
                      ? 'bg-zinc-900/80 border-white/[0.08] text-zinc-200 placeholder:text-zinc-500 focus:border-cyan-500/50 focus:ring-cyan-500/20'
                      : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20'
                  )}
                />
                {vpsSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setVpsSearch('');
                      setVpsPage(1);
                    }}
                    aria-label="Clear search"
                    className={cn(
                      'absolute right-2.5 top-1/2 -translate-y-1/2',
                      isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-slate-400 hover:text-slate-600'
                    )}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors shrink-0',
                  isDark
                    ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-white/[0.08]'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
                )}
              >
                <Search className="w-3.5 h-3.5 text-cyan-400" />
                Search
              </button>
            </form>
          )}
        </div>

        {loading ? (
          <div className="p-10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          </div>
        ) : vpsList.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Server className="w-6 h-6" />
            </div>
            <h3 className={cn('text-base font-semibold', isDark ? 'text-white' : 'text-slate-900')}>
              No Cloud VPS Instances
            </h3>
            <p className={cn('text-xs max-w-md mx-auto', isDark ? 'text-zinc-400' : 'text-slate-600')}>
              Deploy a Cloud VPS first to control its power state remotely using the VPS API.
            </p>
            <Link
              href="/dashboard/vps/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-zinc-950 font-semibold text-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Deploy Cloud VPS
            </Link>
          </div>
        ) : filteredVpsList.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Search className="w-5 h-5" />
            </div>
            <h3 className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-slate-900')}>
              No Matching Cloud VPS Instances
            </h3>
            <p className={cn('text-xs max-w-md mx-auto', isDark ? 'text-zinc-400' : 'text-slate-600')}>
              No instances matched &ldquo;{vpsSearch}&rdquo;. Try a different ID, hostname, or IP address.
            </p>
            <button
              type="button"
              onClick={() => {
                setVpsSearch('');
                setVpsPage(1);
              }}
              className={cn(
                'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors',
                isDark
                  ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-white/[0.08]'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              )}
            >
              Clear Search
            </button>
          </div>
        ) : (
          <>
            <div className={cn('divide-y', isDark ? 'divide-white/[0.06]' : 'divide-slate-100')}>
              {paginatedVpsList.map((vps) => {
                const primaryIp =
                  vps.assignedIps?.find((i) => i.isPrimary)?.publicIp ||
                  vps.assignedIps?.find((i) => i.isPrimary)?.ipAddress ||
                  vps.assignedIps?.[0]?.publicIp ||
                  vps.assignedIps?.[0]?.ipAddress ||
                  'Pending IP';
                const rebootCurl = `curl -X POST "${baseUrl}/api/v1/vps/${vps.id}/reboot" -H "Authorization: Bearer ${sampleKey}"`;

                return (
                  <div
                    key={vps.id}
                    className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          ID: {vps.id}
                        </span>
                        <span className={cn('font-semibold text-sm', isDark ? 'text-white' : 'text-slate-900')}>
                          {vps.hostname}
                        </span>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border',
                            vps.status === 'RUNNING'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                          )}
                        >
                          {vps.status}
                        </span>
                      </div>
                      <p className={cn('text-xs font-mono', isDark ? 'text-zinc-400' : 'text-slate-600')}>
                        {primaryIp} • {vps.cpuCores} vCPU • {vps.ramGb} GB RAM • {vps.diskGb} GB Disk
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleCopy(rebootCurl, `curl-${vps.id}`, 'Reboot cURL copied')}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors',
                          isDark
                            ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-white/[0.08]'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        )}
                      >
                        {copiedId === `curl-${vps.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                        )}
                        Copy Reboot cURL
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalVpsPages > 1 && (
              <div
                className={cn(
                  'px-5 py-3.5 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3',
                  isDark ? 'border-white/[0.08]' : 'border-slate-200'
                )}
              >
                <span className={cn('text-xs', isDark ? 'text-zinc-400' : 'text-slate-500')}>
                  Showing {(safeVpsPage - 1) * VPS_PER_PAGE + 1}–
                  {Math.min(safeVpsPage * VPS_PER_PAGE, filteredVpsList.length)} of{' '}
                  {filteredVpsList.length} instances
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setVpsPage((p) => Math.max(1, p - 1))}
                    disabled={safeVpsPage <= 1}
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40 disabled:pointer-events-none',
                      isDark
                        ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-white/[0.08]'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    )}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Prev
                  </button>
                  <span className={cn('text-xs font-medium px-2', isDark ? 'text-zinc-300' : 'text-slate-700')}>
                    Page {safeVpsPage} / {totalVpsPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setVpsPage((p) => Math.min(totalVpsPages, p + 1))}
                    disabled={safeVpsPage >= totalVpsPages}
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40 disabled:pointer-events-none',
                      isDark
                        ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-white/[0.08]'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    )}
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* API Keys Card */}
      <div
        className={cn(
          'rounded-2xl border overflow-hidden',
          isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200 shadow-sm'
        )}
      >
        <div
          className={cn(
            'px-5 py-4 border-b flex items-center justify-between',
            isDark ? 'border-white/[0.08]' : 'border-slate-200'
          )}
        >
          <div className="flex items-center gap-2.5">
            <Key className="w-4 h-4 text-cyan-400" />
            <h2 className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>
              API Keys
            </h2>
          </div>
          <span
            className={cn(
              'text-xs px-2.5 py-0.5 rounded-full border font-medium',
              isDark
                ? 'bg-zinc-900 border-white/[0.08] text-zinc-400'
                : 'bg-slate-100 border-slate-200 text-slate-600'
            )}
          >
            {apiKeys.length} / {MAX_API_KEYS} Keys
          </span>
        </div>

        {loading ? (
          <div className="p-10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Key className="w-6 h-6" />
            </div>
            <h3 className={cn('text-base font-semibold', isDark ? 'text-white' : 'text-slate-900')}>
              No Active API Keys
            </h3>
            <p className={cn('text-xs max-w-md mx-auto', isDark ? 'text-zinc-400' : 'text-slate-600')}>
              {activeVpsCount === 0
                ? 'Order at least one Cloud VPS instance first to unlock free API key generation.'
                : 'Generate a free API key to start controlling your Cloud VPS instances programmatically.'}
            </p>
            {activeVpsCount === 0 ? (
              <Link
                href="/dashboard/vps/order"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-zinc-950 font-semibold text-xs transition-colors"
              >
                <Server className="w-3.5 h-3.5" /> Order Cloud VPS
              </Link>
            ) : (
              <button
                onClick={() => setIsGenerateOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-zinc-950 font-semibold text-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Generate Key Now
              </button>
            )}
          </div>
        ) : (
          <div className={cn('divide-y', isDark ? 'divide-white/[0.06]' : 'divide-slate-100')}>
            {apiKeys.map((k) => (
              <div
                key={k.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('font-semibold text-sm', isDark ? 'text-white' : 'text-slate-900')}>
                      {k.name}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {k.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <code
                      className={cn(
                        'font-mono text-xs px-2.5 py-1 rounded-lg border truncate max-w-md',
                        isDark
                          ? 'bg-zinc-900 border-white/[0.08] text-zinc-300'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      )}
                    >
                      {k.key}
                    </code>
                    <button
                      onClick={() => handleCopy(k.key, `key-${k.id}`, 'API Key copied')}
                      className={cn(
                        'p-1.5 rounded-lg border transition-colors',
                        isDark
                          ? 'bg-zinc-900 border-white/[0.08] text-zinc-400 hover:text-white'
                          : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900'
                      )}
                      title="Copy API Key"
                    >
                      {copiedId === `key-${k.id}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <p className={cn('text-[11px]', isDark ? 'text-zinc-500' : 'text-slate-500')}>
                    Requests: {k.usageCount || 0} • Last used:{' '}
                    {k.lastUsed ? new Date(k.lastUsed).toLocaleString() : 'Never'}
                  </p>
                </div>

                <button
                  onClick={() => setRevokingKey(k)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors shrink-0 self-start md:self-center',
                    isDark
                      ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'
                      : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
                  )}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate Key Modal */}
      {isGenerateOpen && (
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
                  Generate Free VPS API Key
                </h2>
                <p className={cn('text-xs mt-1', isDark ? 'text-zinc-400' : 'text-slate-600')}>
                  Create an API key to start, stop, reboot, and inspect your Cloud VPS instances.
                </p>
              </div>
              <button
                onClick={() => setIsGenerateOpen(false)}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  isDark ? 'text-zinc-400 hover:text-white hover:bg-white/[0.06]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                )}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGenerateKey} className="space-y-4">
              <div className="space-y-2">
                <label className={cn('text-xs font-medium block', isDark ? 'text-zinc-300' : 'text-slate-700')}>
                  Key Name
                </label>
                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g. GitHub Actions / Server Automation"
                  maxLength={64}
                  className={cn(
                    'w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none transition-colors',
                    isDark
                      ? 'bg-zinc-900/80 border-white/[0.08] text-white placeholder:text-zinc-500 focus:border-cyan-500/50'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500'
                  )}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGenerateOpen(false)}
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
                  type="submit"
                  disabled={generating}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-cyan-400 hover:bg-cyan-300 text-zinc-950 disabled:opacity-50 transition-colors"
                >
                  {generating && <Loader2 className="w-4 h-4 animate-spin" />}
                  {generating ? 'Generating...' : 'Generate Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revoke Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(revokingKey)}
        onClose={() => setRevokingKey(null)}
        onConfirm={handleRevokeKey}
        title="Revoke API Key?"
        description={
          revokingKey
            ? `Are you sure you want to revoke "${revokingKey.name}"? Any scripts or automations using this key will immediately stop working.`
            : ''
        }
        confirmText={revoking ? 'Revoking...' : 'Revoke Key'}
        variant="danger"
        isLoading={revoking}
      />
    </div>
  );
}
