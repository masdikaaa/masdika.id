'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Sparkles,
  Save,
  RefreshCw,
  Activity,
  Cpu,
  TrendingUp,
  Search,
  Check,
  ShieldCheck,
  KeyRound,
  Globe,
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';
import { formatRupiah } from '@/lib/billing';

interface AdminAiModel {
  id: number;
  modelId: string;
  name: string;
  provider: string;
  contextWindow: string;
  inputPricePer1M: number;
  cachePricePer1M: number;
  outputPricePer1M: number;
  originalInputPricePer1M?: number | null;
  originalCachePricePer1M?: number | null;
  originalOutputPricePer1M?: number | null;
  discountBadge?: string | null;
  openaiOnly: boolean;
  hasPeakPricing: boolean;
  isActive: boolean;
}

export default function AdminAiGatewayPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  const [enabled, setEnabled] = useState(true);
  const [upstreamUrl, setUpstreamUrl] = useState('https://ai.helipod.io');
  const [upstreamKeyInput, setUpstreamKeyInput] = useState('');
  const [maskedKey, setMaskedKey] = useState('');
  const [markupPercent, setMarkupPercent] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastSyncStatus, setLastSyncStatus] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const [models, setModels] = useState<AdminAiModel[]>([]);
  const [stats, setStats] = useState({
    totalRequests: 0,
    totalRevenueRp: 0,
    totalUpstreamCostRp: 0,
    totalProfitRp: 0,
    totalTokens: 0,
  });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  const [modelSearch, setModelSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('ALL');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrices, setEditPrices] = useState({
    input: 0,
    cache: 0,
    output: 0,
    origInput: '',
    origOutput: '',
    discountBadge: '',
  });

  const handleSyncUpstream = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/ai-gateway', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_upstream' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Sync failed');
      toast.success(json.data?.status || 'Synced models from upstream');
      await fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to sync from upstream');
    } finally {
      setSyncing(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ai-gateway', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load AI Gateway admin data');
      const d = json.data;
      setEnabled(Boolean(d.config.enabled));
      setUpstreamUrl(d.config.upstreamUrl || 'https://ai.helipod.io');
      setMaskedKey(d.config.maskedUpstreamKey || '');
      setMarkupPercent(d.config.markupPercent ?? 0);
      setLastSyncAt(d.config.lastSyncAt || null);
      setLastSyncStatus(d.config.lastSyncStatus || null);
      setModels(d.models || []);
      setStats(d.stats || stats);
      setRecentLogs(d.recentLogs || []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load AI Gateway settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await fetch('/api/admin/ai-gateway', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          upstreamUrl,
          markupPercent,
          ...(upstreamKeyInput.trim() ? { upstreamKey: upstreamKeyInput.trim() } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save config');
      setUpstreamKeyInput('');
      toast.success('AI Gateway configuration saved');
      await fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save settings');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleToggleModel = async (m: AdminAiModel) => {
    try {
      const res = await fetch('/api/admin/ai-gateway', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_model', id: m.id, isActive: !m.isActive }),
      });
      if (!res.ok) throw new Error('Failed to update model');
      setModels((prev) => prev.map((x) => (x.id === m.id ? { ...x, isActive: !x.isActive } : x)));
      toast.success(`${m.name} ${m.isActive ? 'disabled' : 'enabled'}`);
    } catch {
      toast.error('Failed to update model status');
    }
  };

  const handleSaveModelPrices = async (id: number) => {
    try {
      const res = await fetch('/api/admin/ai-gateway', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_model',
          id,
          inputPricePer1M: editPrices.input,
          cachePricePer1M: editPrices.cache,
          outputPricePer1M: editPrices.output,
          originalInputPricePer1M: editPrices.origInput ? Number(editPrices.origInput) : null,
          originalOutputPricePer1M: editPrices.origOutput ? Number(editPrices.origOutput) : null,
          discountBadge: editPrices.discountBadge.trim() || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to save prices');
      setEditingId(null);
      toast.success('Model prices updated');
      await fetchData();
    } catch {
      toast.error('Failed to save model prices');
    }
  };

  const providers = useMemo(() => ['ALL', ...Array.from(new Set(models.map((m) => m.provider)))], [models]);

  const filteredModels = useMemo(() => {
    const q = modelSearch.trim().toLowerCase();
    return models.filter((m) => {
      if (providerFilter !== 'ALL' && m.provider !== providerFilter) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.modelId.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q)
      );
    });
  }, [models, modelSearch, providerFilter]);

  return (
    <div className="space-y-6 max-w-full pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className={cn('text-xl sm:text-2xl font-bold tracking-tight', isDark ? 'text-white' : 'text-slate-900')}>
              AI Gateway &amp; Token Proxy
            </h1>
            <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border', isDark ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-cyan-50 text-cyan-700 border-cyan-200')}>
              <Sparkles className="w-3 h-3" /> Upstream Proxy
            </span>
          </div>
          <p className={cn('text-xs sm:text-sm mt-1', isDark ? 'text-zinc-400' : 'text-slate-500')}>
            Configure upstream AI provider key, profit markup %, and manage all {models.length} AI models.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-center">
          <button
            type="button"
            onClick={handleSyncUpstream}
            disabled={syncing || loading}
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', syncing && 'animate-spin')} />
            {syncing ? 'Syncing Upstream...' : 'Sync Models & Prices'}
          </button>
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className={cn('px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border flex items-center gap-2 cursor-pointer', isDark ? 'border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300' : 'border-slate-200 bg-white text-slate-700')}
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin text-cyan-400')} />
            Refresh
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={cn('rounded-2xl border p-5', isDark ? 'bg-[#0c0c0e] border-white/[0.08]' : 'bg-white border-slate-200 shadow-xs')}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn('text-[11px] font-bold uppercase tracking-wider', isDark ? 'text-zinc-400' : 'text-slate-500')}>TOTAL REQUESTS</span>
            <div className={cn('w-9 h-9 rounded-xl border flex items-center justify-center', isDark ? 'bg-cyan-500/15 border-cyan-500/25 text-cyan-400' : 'bg-cyan-50 border-cyan-200 text-cyan-700')}>
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn('text-2xl font-black', isDark ? 'text-white' : 'text-slate-900')}>{stats.totalRequests.toLocaleString()}</span>
            <span className="text-xs font-semibold text-cyan-400">API Calls</span>
          </div>
        </div>

        <div className={cn('rounded-2xl border p-5', isDark ? 'bg-[#0c0c0e] border-white/[0.08]' : 'bg-white border-slate-200 shadow-xs')}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn('text-[11px] font-bold uppercase tracking-wider', isDark ? 'text-zinc-400' : 'text-slate-500')}>GROSS REVENUE</span>
            <div className={cn('w-9 h-9 rounded-xl border flex items-center justify-center', isDark ? 'bg-cyan-500/15 border-cyan-500/25 text-cyan-400' : 'bg-cyan-50 border-cyan-200 text-cyan-700')}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn('text-2xl font-black', isDark ? 'text-white' : 'text-slate-900')}>{formatRupiah(stats.totalRevenueRp)}</span>
            <span className="text-xs font-semibold text-cyan-400">Billed</span>
          </div>
        </div>

        <div className={cn('rounded-2xl border p-5', isDark ? 'bg-[#0c0c0e] border-white/[0.08]' : 'bg-white border-slate-200 shadow-xs')}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn('text-[11px] font-bold uppercase tracking-wider', isDark ? 'text-zinc-400' : 'text-slate-500')}>NET PROFIT</span>
            <div className={cn('w-9 h-9 rounded-xl border flex items-center justify-center', isDark ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : 'bg-cyan-50 border-cyan-200 text-cyan-700')}>
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn('text-2xl font-black', isDark ? 'text-white' : 'text-slate-900')}>{formatRupiah(stats.totalProfitRp)}</span>
            <span className="text-xs font-semibold text-cyan-400">+{markupPercent}% Margin</span>
          </div>
        </div>

        <div className={cn('rounded-2xl border p-5', isDark ? 'bg-[#0c0c0e] border-white/[0.08]' : 'bg-white border-slate-200 shadow-xs')}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn('text-[11px] font-bold uppercase tracking-wider', isDark ? 'text-zinc-400' : 'text-slate-500')}>ACTIVE MODELS</span>
            <div className={cn('w-9 h-9 rounded-xl border flex items-center justify-center', isDark ? 'bg-cyan-500/15 border-cyan-500/25 text-cyan-400' : 'bg-cyan-50 border-cyan-200 text-cyan-700')}>
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn('text-2xl font-black', isDark ? 'text-white' : 'text-slate-900')}>{models.filter((m) => m.isActive).length}</span>
            <span className="text-xs font-semibold text-cyan-400">/ {models.length} Models</span>
          </div>
        </div>
      </div>

      {/* Upstream Configuration Form */}
      <form onSubmit={handleSaveConfig} className={cn('rounded-2xl border p-5 sm:p-6 space-y-5', isDark ? 'bg-[#0c0c0e] border-white/[0.08]' : 'bg-white border-slate-200 shadow-xs')}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
          <div>
            <h2 className={cn('text-base font-bold', isDark ? 'text-white' : 'text-slate-900')}>Upstream Provider Settings</h2>
            <p className={cn('text-xs mt-0.5', isDark ? 'text-zinc-400' : 'text-slate-500')}>
              Customers call your Masdika domain endpoint; Masdika proxies requests to the upstream URL using your encrypted master key.
            </p>
          </div>
          <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-zinc-700 rounded-full peer peer-checked:bg-cyan-400 relative transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
            <span className={cn('text-xs font-bold', enabled ? 'text-cyan-400' : 'text-zinc-400')}>
              {enabled ? 'Gateway Enabled' : 'Gateway Disabled'}
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={cn('text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5', isDark ? 'text-zinc-400' : 'text-slate-600')}>
              <Globe className="w-3.5 h-3.5 text-cyan-400" /> Upstream Base URL
            </label>
            <input
              type="url"
              required
              value={upstreamUrl}
              onChange={(e) => setUpstreamUrl(e.target.value)}
              placeholder="https://ai.helipod.io"
              className={cn('w-full px-3.5 py-2.5 rounded-xl text-sm font-mono border outline-none focus:border-cyan-500', isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-900')}
            />
          </div>

          <div>
            <label className={cn('text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5', isDark ? 'text-zinc-400' : 'text-slate-600')}>
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" /> Master Upstream Key
            </label>
            <input
              type="password"
              value={upstreamKeyInput}
              onChange={(e) => setUpstreamKeyInput(e.target.value)}
              placeholder={maskedKey ? `Configured (${maskedKey})` : 'Paste hel_ai_... key'}
              className={cn('w-full px-3.5 py-2.5 rounded-xl text-sm font-mono border outline-none focus:border-cyan-500', isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-900')}
            />
          </div>

          <div>
            <label className={cn('text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5', isDark ? 'text-zinc-400' : 'text-slate-600')}>
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" /> Profit Markup (%)
            </label>
            <input
              type="number"
              min={0}
              max={500}
              step="1"
              value={markupPercent}
              onChange={(e) => setMarkupPercent(Math.max(0, Number(e.target.value) || 0))}
              className={cn('w-full px-3.5 py-2.5 rounded-xl text-sm font-bold border outline-none focus:border-cyan-500', isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-cyan-400' : 'bg-slate-50 border-slate-200 text-cyan-700')}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-zinc-400">
            {lastSyncStatus ? (
              <span>
                Last sync: <strong className="text-cyan-400">{lastSyncStatus}</strong>
                {lastSyncAt ? ` (${new Date(lastSyncAt).toLocaleString('id-ID')})` : ''}
              </span>
            ) : (
              <span>Click &ldquo;Sync Models &amp; Prices&rdquo; after saving your Master Key to fetch updates from upstream API.</span>
            )}
          </div>
          <button
            type="submit"
            disabled={savingConfig}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs sm:text-sm shadow-md cursor-pointer disabled:opacity-50 self-end"
          >
            <Save className="w-4 h-4" />
            {savingConfig ? 'Saving...' : 'Save Gateway Settings'}
          </button>
        </div>
      </form>

      {/* Models & Base Cost Table */}
      <div className={cn('rounded-2xl border overflow-hidden', isDark ? 'bg-[#0c0c0e] border-white/[0.08]' : 'bg-white border-slate-200 shadow-xs')}>
        <div className={cn('p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3', isDark ? 'border-white/[0.08]' : 'border-slate-200')}>
          <div className="relative flex-1 max-w-md">
            <Search className={cn('w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2', isDark ? 'text-zinc-500' : 'text-slate-400')} />
            <input
              type="text"
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
              placeholder="Search models..."
              className={cn('w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm border outline-none', isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-900')}
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {providers.map((prov) => (
              <button
                key={prov}
                type="button"
                onClick={() => setProviderFilter(prov)}
                className={cn(
                  'px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer',
                  providerFilter === prov ? 'bg-cyan-400 text-slate-950' : isDark ? 'bg-zinc-900 text-zinc-400 hover:text-white' : 'bg-slate-100 text-slate-600'
                )}
              >
                {prov}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={cn('text-[11px] font-bold uppercase tracking-wider border-b', isDark ? 'text-zinc-400 border-white/[0.08] bg-[#0a0a0c]' : 'text-slate-500 border-slate-200 bg-slate-50')}>
                <th className="px-5 py-3.5">Model</th>
                <th className="px-4 py-3.5 text-right">Base Input</th>
                <th className="px-4 py-3.5 text-right">Base Cache</th>
                <th className="px-4 py-3.5 text-right">Base Output</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className={cn('divide-y text-xs sm:text-sm', isDark ? 'divide-white/[0.06]' : 'divide-slate-100')}>
              {filteredModels.map((m) => {
                const isEditing = editingId === m.id;
                return (
                  <tr key={m.id}>
                    <td className="px-5 py-3">
                      <div className={cn('font-bold', isDark ? 'text-white' : 'text-slate-900')}>{m.name}</div>
                      <div className="font-mono text-xs text-zinc-500">{m.modelId} • {m.contextWindow}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {isEditing ? (
                        <div className="space-y-1">
                          <input
                            type="number"
                            value={editPrices.input}
                            onChange={(e) => setEditPrices((p) => ({ ...p, input: Number(e.target.value) || 0 }))}
                            className="w-24 px-2 py-1 rounded-lg bg-[#0a0a0c] border border-cyan-500/40 text-right text-cyan-400"
                          />
                          <input
                            type="number"
                            placeholder="Coret Rp"
                            value={editPrices.origInput}
                            onChange={(e) => setEditPrices((p) => ({ ...p, origInput: e.target.value }))}
                            className="w-24 px-2 py-0.5 rounded-lg bg-[#0a0a0c] border border-white/10 text-right text-[11px] text-zinc-400 block ml-auto"
                          />
                        </div>
                      ) : (
                        <>
                          {m.originalInputPricePer1M && m.originalInputPricePer1M > m.inputPricePer1M && (
                            <span className="text-[11px] line-through text-zinc-500 block">
                              {formatRupiah(m.originalInputPricePer1M)}
                            </span>
                          )}
                          {formatRupiah(m.inputPricePer1M)}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-400">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editPrices.cache}
                          onChange={(e) => setEditPrices((p) => ({ ...p, cache: Number(e.target.value) || 0 }))}
                          className="w-24 px-2 py-1 rounded-lg bg-[#0a0a0c] border border-cyan-500/40 text-right text-cyan-400"
                        />
                      ) : (
                        formatRupiah(m.cachePricePer1M)
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      {isEditing ? (
                        <div className="space-y-1">
                          <input
                            type="number"
                            value={editPrices.output}
                            onChange={(e) => setEditPrices((p) => ({ ...p, output: Number(e.target.value) || 0 }))}
                            className="w-24 px-2 py-1 rounded-lg bg-[#0a0a0c] border border-cyan-500/40 text-right text-cyan-400"
                          />
                          <input
                            type="number"
                            placeholder="Coret Rp"
                            value={editPrices.origOutput}
                            onChange={(e) => setEditPrices((p) => ({ ...p, origOutput: e.target.value }))}
                            className="w-24 px-2 py-0.5 rounded-lg bg-[#0a0a0c] border border-white/10 text-right text-[11px] text-zinc-400 block ml-auto"
                          />
                        </div>
                      ) : (
                        <>
                          {m.originalOutputPricePer1M && m.originalOutputPricePer1M > m.outputPricePer1M && (
                            <span className="text-[11px] font-normal line-through text-zinc-500 block">
                              {formatRupiah(m.originalOutputPricePer1M)}
                            </span>
                          )}
                          {formatRupiah(m.outputPricePer1M)}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleModel(m)}
                        className={cn(
                          'px-2.5 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer',
                          m.isActive
                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                            : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                        )}
                      >
                        {m.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {isEditing ? (
                        <button
                          type="button"
                          onClick={() => handleSaveModelPrices(m.id)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" /> Save
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(m.id);
                            setEditPrices({
                              input: m.inputPricePer1M,
                              cache: m.cachePricePer1M,
                              output: m.outputPricePer1M,
                              origInput: m.originalInputPricePer1M ? String(m.originalInputPricePer1M) : '',
                              origOutput: m.originalOutputPricePer1M ? String(m.originalOutputPricePer1M) : '',
                              discountBadge: m.discountBadge || '',
                            });
                          }}
                          className="px-3 py-1 rounded-lg border border-white/[0.08] text-xs font-semibold text-cyan-400 hover:bg-white/[0.04] cursor-pointer"
                        >
                          Edit Price
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Usage Logs */}
      {recentLogs.length > 0 && (
        <div className={cn('rounded-2xl border overflow-hidden', isDark ? 'bg-[#0c0c0e] border-white/[0.08]' : 'bg-white border-slate-200 shadow-xs')}>
          <div className="px-5 py-4 border-b border-white/[0.08] font-bold text-sm">Recent Customer AI Usage</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={cn('text-[11px] font-bold uppercase tracking-wider border-b', isDark ? 'text-zinc-400 border-white/[0.08] bg-[#0a0a0c]' : 'text-slate-500 border-slate-200 bg-slate-50')}>
                  <th className="px-5 py-3">User ID</th>
                  <th className="px-4 py-3">Model</th>
                  <th className="px-4 py-3 text-right">Tokens (In/Out)</th>
                  <th className="px-4 py-3 text-right">Billed</th>
                  <th className="px-5 py-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className={cn('divide-y text-xs', isDark ? 'divide-white/[0.06]' : 'divide-slate-100')}>
                {recentLogs.map((l) => (
                  <tr key={l.id}>
                    <td className="px-5 py-3 font-mono">User #{l.userId}</td>
                    <td className="px-4 py-3 font-mono text-cyan-400">{l.modelId}</td>
                    <td className="px-4 py-3 text-right font-mono">{l.inputTokens} / {l.outputTokens}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-cyan-400">{formatRupiah(l.costRp)}</td>
                    <td className="px-5 py-3 text-right text-zinc-400">{new Date(l.createdAt).toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
