'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Cpu,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  DollarSign,
  Key,
  Activity,
  TrendingUp,
  Search,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Tag,
  Sliders,
  Users,
  Wallet,
  Plus,
  Minus,
  X,
  Image as ImageIcon,
  MessageSquare,
  Trophy,
} from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { AdminCheckbox } from '@/components/ui/AdminCheckbox';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';
import { AiTokenUsageChart, TokenTimelineEntry } from '@/components/admin/AiTokenUsageChart';
import { AiTopModelsRanking, type TopModelRankingItem } from '@/components/admin/AiTopModelsRanking';

interface AiModelItem {
  id: number;
  modelId: string;
  name: string;
  provider: string;
  contextWindow: string;
  inputPricePer1M: number;
  cachePricePer1M: number;
  outputPricePer1M: number;
  originalInputPricePer1M: number | null;
  originalCachePricePer1M: number | null;
  originalOutputPricePer1M: number | null;
  discountBadge: string | null;
  openaiOnly: boolean;
  hasPeakPricing: boolean;
  isActive: boolean;
  sortOrder: number;
}

interface AiImageModelItem {
  modelId: string;
  name: string;
  sizes: string[];
  tokensPerImage: number;
  basePriceRp: number;
  sellPriceRp: number;
  maxN: number;
  maxRefImages: number;
}

interface CustomerAiItem {
  id: number;
  name: string | null;
  email: string;
  balance: number;
  aiBalance: number;
  aiAutoTopupEnabled: boolean;
  aiAutoTopupThreshold: number;
  aiAutoTopupAmount: number;
  _count: {
    aiGatewayKeys: number;
    aiUsageLogs: number;
  };
}

function paginateItems<T>(items: T[], page: number, perPage: number) {
  const totalPages = perPage === -1 ? 1 : Math.max(1, Math.ceil(items.length / (perPage > 0 ? perPage : 10)));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paginated = perPage === -1 ? items : items.slice((safePage - 1) * perPage, safePage * perPage);
  const startItem = items.length > 0 ? (perPage === -1 ? 1 : (safePage - 1) * perPage + 1) : 0;
  const endItem = perPage === -1 ? items.length : Math.min(safePage * perPage, items.length);

  return { paginated, totalPages, safePage, startItem, endItem };
}

function TablePaginationBar({
  totalItems,
  itemLabel,
  page,
  perPage,
  totalPages,
  startItem,
  endItem,
  isDark,
  onPageChange,
  onPerPageChange,
}: {
  totalItems: number;
  itemLabel: string;
  page: number;
  perPage: number;
  totalPages: number;
  startItem: number;
  endItem: number;
  isDark: boolean;
  onPageChange: (nextPage: number) => void;
  onPerPageChange: (nextPerPage: number) => void;
}) {
  if (totalItems === 0) return null;

  return (
    <div
      className={cn(
        "pt-3 sm:pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs",
        isDark ? "border-white/[0.07]" : "border-slate-200"
      )}
    >
      <div className={cn(isDark ? "text-zinc-400" : "text-slate-600", "text-center sm:text-left")}>
        Showing <span className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>{startItem}</span> to{" "}
        <span className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>{endItem}</span> of{" "}
        <span className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>{totalItems}</span> {itemLabel}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3 w-full sm:w-auto justify-center">
        <div className={cn("flex items-center gap-1.5", isDark ? "text-zinc-400" : "text-slate-600")}>
          <span className="hidden xs:inline">Show:</span>
          <div className="w-24">
            <Select
              value={perPage}
              onChange={(val) => {
                onPerPageChange(Number(val));
                onPageChange(1);
              }}
              options={[
                { value: 10, label: "10" },
                { value: 25, label: "25" },
                { value: 50, label: "50" },
                { value: -1, label: `All (${totalItems})` },
              ]}
              direction="up"
              className="py-1 px-2.5 text-xs font-semibold rounded-lg"
            />
          </div>
        </div>

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={onPageChange} />
      </div>
    </div>
  );
}

export default function AdminAiGatewayPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [savingModelId, setSavingModelId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [activeTab, setActiveTab] = useState<'settings' | 'rankings' | 'models' | 'customers' | 'logs'>('settings');

  const [config, setConfig] = useState({
    enabled: true,
    upstreamUrl: 'https://ai.helipod.io',
    upstreamKey: '',
    upstreamKeyMasked: '',
    hasUpstreamKey: false,
    managementKey: '',
    managementKeyMasked: '',
    hasManagementKey: false,
    markupPercent: 10,
    topupFeeRp: 5000,
    lastSyncAt: null as string | null,
    lastSyncStatus: null as string | null,
  });

  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [showMgmtKeyInput, setShowMgmtKeyInput] = useState(false);
  const [models, setModels] = useState<AiModelItem[]>([]);
  const [imageModels, setImageModels] = useState<AiImageModelItem[]>([]);
  const [customers, setCustomers] = useState<CustomerAiItem[]>([]);
  const [stats, setStats] = useState({
    activeKeys: 0,
    totalRequests: 0,
    totalInputTokens: 0,
    totalCachedTokens: 0,
    totalOutputTokens: 0,
    totalRevenueIdr: 0,
    totalUpstreamCostIdr: 0,
    totalProfitIdr: 0,
    totalCustomerAiBalance: 0,
  });
  const [tokenUsageTimeline, setTokenUsageTimeline] = useState<TokenTimelineEntry[]>([]);
  const [topModelRankings, setTopModelRankings] = useState<TopModelRankingItem[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [modelTypeFilter, setModelTypeFilter] = useState<string>('ALL');
  const [modelsPage, setModelsPage] = useState<number>(1);
  const [modelsPerPage, setModelsPerPage] = useState<number>(10);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customersPage, setCustomersPage] = useState<number>(1);
  const [customersPerPage, setCustomersPerPage] = useState<number>(10);
  const [logSearch, setLogSearch] = useState('');
  const [logsPage, setLogsPage] = useState<number>(1);
  const [logsPerPage, setLogsPerPage] = useState<number>(10);

  // Customer AI Balance Adjustment Modal
  const [adjustModalCustomer, setAdjustModalCustomer] = useState<CustomerAiItem | null>(null);
  const [adjustMode, setAdjustMode] = useState<'add' | 'deduct' | 'set'>('add');
  const [adjustAmount, setAdjustAmount] = useState<string>('50000');
  const [adjustAutoTopup, setAdjustAutoTopup] = useState<boolean>(false);
  const [adjustingBalance, setAdjustingBalance] = useState(false);

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/ai-gateway');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load AI Gateway admin data');

      setConfig((prev) => ({
        ...prev,
        ...data.config,
        upstreamKey: '',
        managementKey: '',
      }));
      setModels(data.models || []);
      setImageModels(data.imageModels || []);
      setCustomers(data.customers || []);
      setStats(
        data.stats || {
          activeKeys: 0,
          totalRequests: 0,
          totalInputTokens: 0,
          totalCachedTokens: 0,
          totalOutputTokens: 0,
          totalRevenueIdr: 0,
          totalUpstreamCostIdr: 0,
          totalProfitIdr: 0,
          totalCustomerAiBalance: 0,
        },
      );
      setTokenUsageTimeline(data.tokenUsageTimeline || []);
      setTopModelRankings(data.topModelRankings || []);
      setRecentLogs(data.recentLogs || []);
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await fetch('/api/admin/ai-gateway', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: config.enabled,
          upstreamUrl: config.upstreamUrl,
          upstreamKey: config.upstreamKey,
          managementKey: config.managementKey,
          markupPercent: config.markupPercent,
          topupFeeRp: config.topupFeeRp,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update configuration');
      showToast('success', 'AI Gateway configuration saved.');
      fetchData();
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSyncUpstream = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/ai-gateway', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_upstream' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upstream sync failed');
      showToast(
        data.synced ? 'success' : 'error',
        `${data.message || 'Synchronized'} (${data.updatedCount || 0} models updated)`,
      );
      fetchData();
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleModelChange = (id: number, field: keyof AiModelItem, value: any) => {
    setModels((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  };

  const handleSaveModel = async (model: AiModelItem) => {
    setSavingModelId(model.id);
    try {
      const res = await fetch('/api/admin/ai-gateway', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_model',
          id: model.id,
          isActive: model.isActive,
          inputPricePer1M: model.inputPricePer1M,
          cachePricePer1M: model.cachePricePer1M,
          outputPricePer1M: model.outputPricePer1M,
          originalInputPricePer1M: model.originalInputPricePer1M,
          originalCachePricePer1M: model.originalCachePricePer1M,
          originalOutputPricePer1M: model.originalOutputPricePer1M,
          discountBadge: model.discountBadge,
          hasPeakPricing: model.hasPeakPricing,
          openaiOnly: model.openaiOnly,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save model');
      showToast('success', `Saved model ${model.name} (${model.modelId})`);
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setSavingModelId(null);
    }
  };

  const openAdjustModal = (customer: CustomerAiItem) => {
    setAdjustModalCustomer(customer);
    setAdjustMode('add');
    setAdjustAmount('50000');
    setAdjustAutoTopup(customer.aiAutoTopupEnabled);
  };

  const handleConfirmAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalCustomer) return;
    setAdjustingBalance(true);
    try {
      const res = await fetch('/api/admin/ai-gateway', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust_user_ai_balance',
          userId: adjustModalCustomer.id,
          mode: adjustMode,
          amount: Number(adjustAmount || 0),
          aiAutoTopupEnabled: adjustAutoTopup,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update customer AI balance');
      showToast(
        'success',
        `Updated AI credit balance for ${adjustModalCustomer.name || adjustModalCustomer.email} to Rp ${Number(data.user.aiBalance || 0).toLocaleString('id-ID')}.`,
      );
      setAdjustModalCustomer(null);
      fetchData();
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setAdjustingBalance(false);
    }
  };

  const filteredModels = useMemo(() => {
    if (modelTypeFilter === 'image') return [];
    return models.filter(
      (m) =>
        m.modelId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.provider.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [models, modelTypeFilter, searchQuery]);

  const filteredImageModels = useMemo(() => {
    if (modelTypeFilter === 'chat') return [];
    return imageModels.filter(
      (m) =>
        m.modelId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [imageModels, modelTypeFilter, searchQuery]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        (c.name || '').toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        String(c.id).includes(q),
    );
  }, [customers, customerSearch]);

  const filteredLogs = useMemo(() => {
    const q = logSearch.trim().toLowerCase();
    if (!q) return recentLogs;
    return recentLogs.filter(
      (l) =>
        (l.modelId || '').toLowerCase().includes(q) ||
        (l.user?.name || '').toLowerCase().includes(q) ||
        (l.user?.email || '').toLowerCase().includes(q) ||
        (l.apiKey?.name || '').toLowerCase().includes(q),
    );
  }, [recentLogs, logSearch]);

  const modelsPagination = useMemo(
    () => paginateItems(filteredModels, modelsPage, modelsPerPage),
    [filteredModels, modelsPage, modelsPerPage],
  );

  const customersPagination = useMemo(
    () => paginateItems(filteredCustomers, customersPage, customersPerPage),
    [filteredCustomers, customersPage, customersPerPage],
  );

  const logsPagination = useMemo(
    () => paginateItems(filteredLogs, logsPage, logsPerPage),
    [filteredLogs, logsPage, logsPerPage],
  );
  const paginatedLogs = logsPagination.paginated;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className={cn(isDark ? 'text-xl sm:text-2xl font-bold mb-1 tracking-tight text-white' : 'text-xl sm:text-2xl font-bold mb-1 tracking-tight text-slate-900')}>
            AI Gateway Management
          </h1>
          <p className={cn(isDark ? 'text-sm font-medium text-zinc-400' : 'text-sm font-medium text-slate-600')}>
            Manage upstream routing, profit markup, Chat &amp; Image models, customer AI credit balances, and real-time token usage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleSyncUpstream}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-cyan-500/10"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing Upstream...' : 'Sync Upstream Models & Promo'}
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-xs font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* 5 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className={cn("rounded-2xl p-5 border transition-all", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200 shadow-sm")}>
          <div className={cn(isDark ? 'flex items-center justify-between text-zinc-400 text-[11px] font-bold uppercase tracking-wider mb-2' : 'flex items-center justify-between text-slate-600 text-[11px] font-bold uppercase tracking-wider mb-2')}>
            <span>Customer Revenue</span>
            <DollarSign className="w-4 h-4 text-cyan-400" />
          </div>
          <div className={cn(isDark ? 'text-xl font-black text-white' : 'text-xl font-black text-slate-900')}>
            Rp {stats.totalRevenueIdr.toLocaleString('id-ID')}
          </div>
          <div className={cn("text-[11px] mt-1", isDark ? "text-zinc-500" : "text-slate-500")}>
            Upstream Cost: Rp {stats.totalUpstreamCostIdr.toLocaleString('id-ID')}
          </div>
        </div>

        <div className={cn("rounded-2xl p-5 border transition-all", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200 shadow-sm")}>
          <div className={cn(isDark ? 'flex items-center justify-between text-zinc-400 text-[11px] font-bold uppercase tracking-wider mb-2' : 'flex items-center justify-between text-slate-600 text-[11px] font-bold uppercase tracking-wider mb-2')}>
            <span>Net Margin Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-400">
            Rp {stats.totalProfitIdr.toLocaleString('id-ID')}
          </div>
          <div className={cn("text-[11px] mt-1", isDark ? "text-zinc-500" : "text-slate-500")}>
            Active Markup: +{config.markupPercent}%
          </div>
        </div>

        <div className={cn("rounded-2xl p-5 border transition-all", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200 shadow-sm")}>
          <div className={cn(isDark ? 'flex items-center justify-between text-zinc-400 text-[11px] font-bold uppercase tracking-wider mb-2' : 'flex items-center justify-between text-slate-600 text-[11px] font-bold uppercase tracking-wider mb-2')}>
            <span>Total AI Balances</span>
            <Wallet className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-black text-cyan-400">
            Rp {(stats.totalCustomerAiBalance || 0).toLocaleString('id-ID')}
          </div>
          <div className={cn("text-[11px] mt-1", isDark ? "text-zinc-500" : "text-slate-500")}>
            Held across customer AI wallets
          </div>
        </div>

        <div className={cn("rounded-2xl p-5 border transition-all", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200 shadow-sm")}>
          <div className={cn(isDark ? 'flex items-center justify-between text-zinc-400 text-[11px] font-bold uppercase tracking-wider mb-2' : 'flex items-center justify-between text-slate-600 text-[11px] font-bold uppercase tracking-wider mb-2')}>
            <span>Total Requests</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className={cn(isDark ? 'text-xl font-black text-white' : 'text-xl font-black text-slate-900')}>
            {stats.totalRequests.toLocaleString('id-ID')}
          </div>
          <div className={cn("text-[11px] mt-1", isDark ? "text-zinc-500" : "text-slate-500")}>
            {((stats.totalInputTokens + stats.totalOutputTokens) / 1000).toFixed(1)}K tokens processed
          </div>
        </div>

        <div className={cn("rounded-2xl p-5 border transition-all", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200 shadow-sm")}>
          <div className={cn(isDark ? 'flex items-center justify-between text-zinc-400 text-[11px] font-bold uppercase tracking-wider mb-2' : 'flex items-center justify-between text-slate-600 text-[11px] font-bold uppercase tracking-wider mb-2')}>
            <span>Active Customer Keys</span>
            <Key className="w-4 h-4 text-amber-400" />
          </div>
          <div className={cn(isDark ? 'text-xl font-black text-white' : 'text-xl font-black text-slate-900')}>{stats.activeKeys}</div>
          <div className={cn("text-[11px] mt-1", isDark ? "text-zinc-500" : "text-slate-500")}>
            Status: {config.enabled ? 'Gateway Online' : 'Maintenance'}
          </div>
        </div>
      </div>

      {/* Aggregate Customer Token Usage Graph */}
      <AiTokenUsageChart data={tokenUsageTimeline} />

      {/* Navigation Tabs - Smooth horizontal swipe with hidden scrollbar */}
      <div className={cn("flex items-center gap-1.5 overflow-x-auto pb-1 border-b [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden", isDark ? "border-white/[0.07]" : "border-slate-200")}>
        {[
          { id: 'settings', label: 'Gateway Settings & Upstream', icon: Sliders },
          { id: 'rankings', label: `Top Models Ranking (${topModelRankings.length})`, icon: Trophy },
          { id: 'models', label: `Models & Pricing (${models.length + imageModels.length})`, icon: Sparkles },
          { id: 'customers', label: `Customer AI Balances (${customers.length})`, icon: Users },
          { id: 'logs', label: `Usage & Profit Logs (${recentLogs.length})`, icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                active
                  ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10'
                  : isDark ? 'border-transparent text-zinc-400 hover:text-white hover:bg-white/[0.03]' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: SETTINGS */}
      {activeTab === 'settings' && (
        <form
          onSubmit={handleSaveConfig}
          className={cn("rounded-2xl p-5 sm:p-6 space-y-5 border transition-all", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200 shadow-sm")}
        >
          <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4", isDark ? "border-white/[0.06]" : "border-slate-200")}>
            <div className="flex items-center gap-2.5">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <h2 className={cn(isDark ? 'text-sm font-bold text-white uppercase tracking-wider' : 'text-sm font-bold text-slate-900 uppercase tracking-wider')}>
                Upstream Provider & Auto-Markup Configuration
              </h2>
            </div>
            {config.lastSyncAt && (
              <span className="text-[11px] text-zinc-500">
                Last Sync: {new Date(config.lastSyncAt).toLocaleString('id-ID')} ({config.lastSyncStatus || 'OK'})
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={cn(isDark ? 'block text-xs font-semibold text-zinc-400 mb-1.5' : 'block text-xs font-semibold text-slate-600 mb-1.5')}>
                Upstream Provider Base URL
              </label>
              <input
                type="url"
                value={config.upstreamUrl}
                onChange={(e) => setConfig({ ...config, upstreamUrl: e.target.value })}
                placeholder="https://ai.helipod.io"
                className={cn(isDark ? 'w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-sm text-white focus:border-cyan-400 focus:outline-none' : 'w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:border-cyan-400 focus:outline-none')}
                required
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Hidden from customers. Customers only connect to Masdika endpoints.
              </p>
            </div>

            <div>
              <label className={cn(isDark ? 'block text-xs font-semibold text-zinc-400 mb-1.5' : 'block text-xs font-semibold text-slate-600 mb-1.5')}>
                Master Upstream AI Key (hel_ai_...)
              </label>
              <div className="relative">
                <input
                  type={showApiKeyInput ? 'text' : 'password'}
                  value={config.upstreamKey}
                  onChange={(e) => setConfig({ ...config, upstreamKey: e.target.value })}
                  placeholder={
                    config.hasUpstreamKey
                      ? `Current: ${config.upstreamKeyMasked} (leave empty to keep)`
                      : 'Enter master upstream key (hel_ai_...)'
                  }
                  className={cn(isDark ? 'w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-black/50 border border-white/10 text-sm text-white focus:border-cyan-400 focus:outline-none' : 'w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:border-cyan-400 focus:outline-none')}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                  className={cn(isDark ? 'absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300' : 'absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-slate-700')}
                >
                  {showApiKeyInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                {config.hasUpstreamKey
                  ? 'Master AI key is configured and encrypted on server.'
                  : 'Required to forward live AI requests.'}
              </p>
            </div>

            <div>
              <label className={cn(isDark ? 'block text-xs font-semibold text-zinc-400 mb-1.5' : 'block text-xs font-semibold text-slate-600 mb-1.5')}>
                Management API Key (Optional - for Price Sync)
              </label>
              <div className="relative">
                <input
                  type={showMgmtKeyInput ? 'text' : 'password'}
                  value={config.managementKey}
                  onChange={(e) => setConfig({ ...config, managementKey: e.target.value })}
                  placeholder={
                    config.hasManagementKey
                      ? `Current: ${config.managementKeyMasked} (leave empty to keep)`
                      : 'Optional Helipod API key for /api/ai/models'
                  }
                  className={cn(isDark ? 'w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-black/50 border border-white/10 text-sm text-white focus:border-cyan-400 focus:outline-none' : 'w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:border-cyan-400 focus:outline-none')}
                />
                <button
                  type="button"
                  onClick={() => setShowMgmtKeyInput(!showMgmtKeyInput)}
                  className={cn(isDark ? 'absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300' : 'absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-slate-700')}
                >
                  {showMgmtKeyInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1">
                Used to pull live IDR tiers & promo discounts from Management API.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={cn(isDark ? 'block text-xs font-semibold text-zinc-400 mb-1.5' : 'block text-xs font-semibold text-slate-600 mb-1.5')}>
                  Markup (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={500}
                  step={1}
                  value={config.markupPercent}
                  onChange={(e) => setConfig({ ...config, markupPercent: Number(e.target.value) })}
                  className={cn(isDark ? 'w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-sm text-white font-mono focus:border-cyan-400 focus:outline-none' : 'w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 font-mono focus:border-cyan-400 focus:outline-none')}
                />
              </div>
              <div>
                <label className={cn(isDark ? 'block text-xs font-semibold text-zinc-400 mb-1.5' : 'block text-xs font-semibold text-slate-600 mb-1.5')}>
                  Top-Up Fee (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  max={1000000}
                  step={500}
                  value={config.topupFeeRp}
                  onChange={(e) => setConfig({ ...config, topupFeeRp: Number(e.target.value) })}
                  className={cn(isDark ? 'w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-sm text-white font-mono focus:border-cyan-400 focus:outline-none' : 'w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 font-mono focus:border-cyan-400 focus:outline-none')}
                />
              </div>
              <p className="col-span-2 text-[11px] text-zinc-500">
                Token/image markup (%) + flat profit fee (Rp) per AI Balance top-up.
              </p>
            </div>
          </div>

          <div className={cn("flex flex-wrap items-center justify-between gap-4 pt-2 border-t", isDark ? "border-white/[0.06]" : "border-slate-200")}>
            <AdminCheckbox
              checked={config.enabled}
              onChange={(checked) => setConfig({ ...config, enabled: checked })}
              label="Enable AI Gateway Service Globally"
            />

            <button
              type="submit"
              disabled={savingConfig}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Gateway Settings
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: TOP MODELS RANKING */}
      {activeTab === 'rankings' && (
        <AiTopModelsRanking
          rankings={topModelRankings}
          totalGatewayRequests={stats.totalRequests}
          onSelectModel={(modelId) => {
            setSearchQuery(modelId);
            setActiveTab('models');
          }}
        />
      )}

      {/* TAB 3: MODELS & PRICING */}
      {activeTab === 'models' && (
        <div className={cn("rounded-2xl p-5 sm:p-6 space-y-5 border transition-all", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className={cn(isDark ? 'text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2' : 'text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2')}>
                <Sparkles className="w-4 h-4 text-cyan-400" />
                AI Models, IDR Token Rates & Promo Override
              </h2>
              <p className={cn(isDark ? 'text-xs text-zinc-400 mt-0.5' : 'text-xs text-slate-600 mt-0.5')}>
                Configure base IDR per 1M tokens, promo discount badges, and view Image Generation model pricing (+{config.markupPercent}% markup).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="w-48">
                <Select
                  value={modelTypeFilter}
                  onChange={(val) => {
                    setModelTypeFilter(val);
                    setModelsPage(1);
                  }}
                  options={[
                    { value: 'ALL', label: 'All Model Types' },
                    { value: 'chat', label: `Chat / LLM (${models.length})` },
                    { value: 'image', label: `Image Gen (${imageModels.length})` },
                  ]}
                />
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setModelsPage(1);
                  }}
                  placeholder="Search model ID or provider..."
                  className={cn(isDark ? 'w-full pl-9 pr-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white focus:border-cyan-400 focus:outline-none' : 'w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:border-cyan-400 focus:outline-none')}
                />
              </div>
            </div>
          </div>

          {filteredModels.length > 0 && (
            <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={cn("border-b text-[11px] font-bold uppercase tracking-wider", isDark ? "border-white/[0.07] text-zinc-400" : "border-slate-200 text-slate-600 bg-slate-50/60")}>
                    <th className="py-3 px-3">Active</th>
                    <th className="py-3 px-3">Model / Provider</th>
                    <th className="py-3 px-3">Base Price / 1M (Rp)</th>
                    <th className="py-3 px-3">Sell Price (+{config.markupPercent}%)</th>
                    <th className="py-3 px-3">Discount Badge</th>
                    <th className="py-3 px-3">Original Strikethrough (Rp)</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className={cn("divide-y text-xs", isDark ? "divide-white/[0.05]" : "divide-slate-100")}>
                  {modelsPagination.paginated.map((m) => {
                    const sellIn = Math.round(m.inputPricePer1M * (1 + config.markupPercent / 100));
                    const sellOut = Math.round(m.outputPricePer1M * (1 + config.markupPercent / 100));
                    const rankItem = topModelRankings.find((r) => r.modelId === m.modelId);
                    return (
                      <tr key={m.id} className={cn("transition-colors", isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50/80")}>
                        <td className="py-3 px-3">
                          <AdminCheckbox
                            checked={m.isActive}
                            onChange={(checked) => handleModelChange(m.id, 'isActive', checked)}
                          />
                        </td>
                        <td className="py-3 px-3">
                          <div className={cn(isDark ? 'flex items-center gap-1.5 font-bold text-white' : 'flex items-center gap-1.5 font-bold text-slate-900')}>
                            <MessageSquare className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span>{m.name}</span>
                            {rankItem && rankItem.rank <= 3 && (
                              <span
                                className={cn(
                                  'px-1.5 py-0.5 rounded text-[10px] font-black font-mono',
                                  rankItem.rank === 1
                                    ? 'bg-cyan-400 text-slate-950'
                                    : rankItem.rank === 2
                                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                    : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20',
                                )}
                              >
                                #{rankItem.rank} Top
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-500 font-mono">
                            {m.modelId} • <span className="text-cyan-400">{m.provider}</span> • {m.contextWindow}
                            {rankItem && (
                              <span className="text-cyan-400 font-bold ml-1.5">
                                • {rankItem.requests.toLocaleString('id-ID')} reqs
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-zinc-500 w-9">In:</span>
                              <input
                                type="number"
                                value={m.inputPricePer1M}
                                onChange={(e) =>
                                  handleModelChange(m.id, 'inputPricePer1M', Number(e.target.value))
                                }
                                className={cn(isDark ? 'w-24 px-2 py-1 rounded bg-black/60 border border-white/10 text-white font-mono text-xs' : 'w-24 px-2 py-1 rounded bg-white border border-slate-200 text-slate-900 font-mono text-xs')}
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-zinc-500 w-9">Cache:</span>
                              <input
                                type="number"
                                value={m.cachePricePer1M}
                                onChange={(e) =>
                                  handleModelChange(m.id, 'cachePricePer1M', Number(e.target.value))
                                }
                                className={cn(isDark ? 'w-24 px-2 py-1 rounded bg-black/60 border border-white/10 text-white font-mono text-xs' : 'w-24 px-2 py-1 rounded bg-white border border-slate-200 text-slate-900 font-mono text-xs')}
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-zinc-500 w-9">Out:</span>
                              <input
                                type="number"
                                value={m.outputPricePer1M}
                                onChange={(e) =>
                                  handleModelChange(m.id, 'outputPricePer1M', Number(e.target.value))
                                }
                                className={cn(isDark ? 'w-24 px-2 py-1 rounded bg-black/60 border border-white/10 text-white font-mono text-xs' : 'w-24 px-2 py-1 rounded bg-white border border-slate-200 text-slate-900 font-mono text-xs')}
                              />
                            </div>
                          </div>
                        </td>
                        <td className={cn("py-3 px-3 font-mono", isDark ? "text-cyan-300" : "text-cyan-700 font-semibold")}>
                          <div>In: Rp {sellIn.toLocaleString('id-ID')}</div>
                          <div>Out: Rp {sellOut.toLocaleString('id-ID')}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <Tag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <input
                                type="text"
                                placeholder="e.g. -20%"
                                value={m.discountBadge || ''}
                                onChange={(e) => handleModelChange(m.id, 'discountBadge', e.target.value)}
                                className={cn(isDark ? 'w-28 px-2 py-1 rounded bg-black/60 border border-white/10 text-amber-300 text-xs font-mono' : 'w-28 px-2 py-1 rounded bg-white border border-slate-200 text-amber-600 font-semibold text-xs font-mono')}
                              />
                            </div>
                            <AdminCheckbox
                              checked={m.hasPeakPricing}
                              onChange={(checked) => handleModelChange(m.id, 'hasPeakPricing', checked)}
                              label={<span className={cn(isDark ? 'text-[11px] text-zinc-400' : 'text-[11px] text-slate-600')}>Peak 2x Rate</span>}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-zinc-500 w-8">In:</span>
                              <input
                                type="number"
                                placeholder="Optional"
                                value={m.originalInputPricePer1M ?? ''}
                                onChange={(e) =>
                                  handleModelChange(
                                    m.id,
                                    'originalInputPricePer1M',
                                    e.target.value === '' ? null : Number(e.target.value),
                                  )
                                }
                                className={cn(isDark ? 'w-24 px-2 py-1 rounded bg-black/60 border border-white/10 text-zinc-300 font-mono text-xs' : 'w-24 px-2 py-1 rounded bg-white border border-slate-200 text-slate-700 font-mono text-xs')}
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-zinc-500 w-8">Out:</span>
                              <input
                                type="number"
                                placeholder="Optional"
                                value={m.originalOutputPricePer1M ?? ''}
                                onChange={(e) =>
                                  handleModelChange(
                                    m.id,
                                    'originalOutputPricePer1M',
                                    e.target.value === '' ? null : Number(e.target.value),
                                  )
                                }
                                className={cn(isDark ? 'w-24 px-2 py-1 rounded bg-black/60 border border-white/10 text-zinc-300 font-mono text-xs' : 'w-24 px-2 py-1 rounded bg-white border border-slate-200 text-slate-700 font-mono text-xs')}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleSaveModel(m)}
                            disabled={savingModelId === m.id}
                            className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold text-xs transition-all cursor-pointer",
                              isDark
                                ? "bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-500/30 text-cyan-300"
                                : "bg-cyan-50 hover:bg-cyan-100 border-cyan-200 text-cyan-700"
                            )}
                          >
                            {savingModelId === m.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Save className="w-3.5 h-3.5" />
                            )}
                            Save
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <TablePaginationBar
              totalItems={filteredModels.length}
              itemLabel="models"
              page={modelsPagination.safePage}
              perPage={modelsPerPage}
              totalPages={modelsPagination.totalPages}
              startItem={modelsPagination.startItem}
              endItem={modelsPagination.endItem}
              isDark={isDark}
              onPageChange={setModelsPage}
              onPerPageChange={setModelsPerPage}
            />
            </>
          )}

          {filteredImageModels.length > 0 && (
            <div className={cn("pt-4 border-t space-y-3", isDark ? "border-white/[0.07]" : "border-slate-200")}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Image Generation Models (/v1/images/generations)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredImageModels.map((img) => (
                  <div
                    key={img.modelId}
                    className={cn(
                      'p-3.5 rounded-xl border flex items-center justify-between gap-3',
                      isDark ? 'bg-black/40 border-white/[0.07]' : 'bg-slate-50 border-slate-200',
                    )}
                  >
                    <div>
                      <div className={cn(isDark ? 'font-bold text-white text-xs' : 'font-bold text-slate-900 text-xs')}>{img.name}</div>
                      <div className="text-[11px] text-zinc-500 font-mono">{img.modelId}</div>
                      <div className={cn(isDark ? 'text-[10px] text-zinc-400 mt-1' : 'text-[10px] text-slate-600 mt-1')}>
                        Sizes: {img.sizes.join(', ')} • Max {img.maxN} img
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold font-mono text-cyan-400">
                        Rp {img.sellPriceRp.toLocaleString('id-ID')} / img
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500">
                        Base: Rp {img.basePriceRp.toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CUSTOMER AI BALANCES */}
      {activeTab === 'customers' && (
        <div className={cn("rounded-2xl p-5 sm:p-6 space-y-4 border transition-all", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className={cn(isDark ? 'text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2' : 'text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2')}>
                <Users className="w-4 h-4 text-cyan-400" />
                Customer AI Credit Balances & Auto Top-Up Status
              </h2>
              <p className={cn(isDark ? 'text-xs text-zinc-400 mt-0.5' : 'text-xs text-slate-600 mt-0.5')}>
                View and manage dedicated AI Gateway balances (`aiBalance`) and auto top-up settings for each customer.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setCustomersPage(1);
                }}
                placeholder="Search customer name or email..."
                className={cn(isDark ? 'w-full pl-9 pr-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white focus:border-cyan-400 focus:outline-none' : 'w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:border-cyan-400 focus:outline-none')}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={cn("border-b text-[11px] font-bold uppercase tracking-wider", isDark ? "border-white/[0.07] text-zinc-400" : "border-slate-200 text-slate-600 bg-slate-50/60")}>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">AI Credit Balance</th>
                  <th className="py-3 px-3">Masdika Main Wallet</th>
                  <th className="py-3 px-3">Auto Top-Up</th>
                  <th className="py-3 px-3">API Keys / Calls</th>
                  <th className="py-3 px-3 text-right">Manage Balance</th>
                </tr>
              </thead>
              <tbody className={cn("divide-y text-xs", isDark ? "divide-white/[0.05]" : "divide-slate-100")}>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500">
                      No matching customers found.
                    </td>
                  </tr>
                ) : (
                  customersPagination.paginated.map((c) => (
                    <tr key={c.id} className={cn("transition-colors", isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50/80")}>
                      <td className="py-3 px-3">
                        <div className={cn(isDark ? 'font-bold text-white' : 'font-bold text-slate-900')}>{c.name || 'Unnamed User'}</div>
                        <div className="text-[11px] text-zinc-500">{c.email} (ID #{c.id})</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={cn("font-mono font-bold text-sm", isDark ? "text-cyan-400" : "text-cyan-700")}>
                          Rp {(c.aiBalance || 0).toLocaleString('id-ID')}
                        </span>
                      </td>
                      <td className={cn(isDark ? 'py-3 px-3 font-mono text-zinc-300' : 'py-3 px-3 font-mono text-slate-700')}>
                        Rp {(c.balance || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-3">
                        {c.aiAutoTopupEnabled ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-semibold">
                            Enabled (&lt; Rp {(c.aiAutoTopupThreshold || 0).toLocaleString('id-ID')} -&gt; +Rp{' '}
                            {(c.aiAutoTopupAmount || 0).toLocaleString('id-ID')})
                          </span>
                        ) : (
                          <span className={cn(isDark ? 'inline-flex items-center px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-[11px]' : 'inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[11px]')}>
                            Disabled
                          </span>
                        )}
                      </td>
                      <td className={cn(isDark ? 'py-3 px-3 text-zinc-300' : 'py-3 px-3 text-slate-700')}>
                        <span className={cn(isDark ? 'font-semibold text-white' : 'font-semibold text-slate-900')}>{c._count?.aiGatewayKeys || 0}</span> keys •{' '}
                        <span className={cn(isDark ? 'font-semibold text-white' : 'font-semibold text-slate-900')}>{c._count?.aiUsageLogs || 0}</span> requests
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => openAdjustModal(c)}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-xs transition-all cursor-pointer",
                            isDark
                              ? "bg-cyan-400/15 hover:bg-cyan-400/25 border-cyan-400/30 text-cyan-300"
                              : "bg-cyan-50 hover:bg-cyan-100 border-cyan-200 text-cyan-700"
                          )}
                        >
                          <Wallet className="w-3.5 h-3.5" />
                          Adjust AI Balance
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <TablePaginationBar
            totalItems={filteredCustomers.length}
            itemLabel="customers"
            page={customersPagination.safePage}
            perPage={customersPerPage}
            totalPages={customersPagination.totalPages}
            startItem={customersPagination.startItem}
            endItem={customersPagination.endItem}
            isDark={isDark}
            onPageChange={setCustomersPage}
            onPerPageChange={setCustomersPerPage}
          />
        </div>
      )}

      {/* TAB 4: USAGE & PROFIT LOGS */}
      {activeTab === 'logs' && (
        <div className={cn("rounded-2xl p-5 sm:p-6 space-y-4 border transition-all", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className={cn(isDark ? 'text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2' : 'text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2')}>
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Recent AI Gateway Requests & Profit Breakdown
            </h2>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={logSearch}
                onChange={(e) => {
                  setLogSearch(e.target.value);
                  setLogsPage(1);
                }}
                placeholder="Filter by customer, key, or model..."
                className={cn(isDark ? 'w-full pl-9 pr-3.5 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white focus:border-cyan-400 focus:outline-none' : 'w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:border-cyan-400 focus:outline-none')}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={cn("border-b text-[11px] font-bold uppercase tracking-wider", isDark ? "border-white/[0.07] text-zinc-400" : "border-slate-200 text-slate-600 bg-slate-50/60")}>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Key</th>
                  <th className="py-2.5 px-3">Model / Endpoint</th>
                  <th className="py-2.5 px-3">Tokens (In / Out)</th>
                  <th className="py-2.5 px-3">Charged (Rp)</th>
                  <th className="py-2.5 px-3">Profit (Rp)</th>
                  <th className="py-2.5 px-3">Latency</th>
                </tr>
              </thead>
              <tbody className={cn("divide-y text-xs", isDark ? "divide-white/[0.05]" : "divide-slate-100")}>
                {paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-zinc-500">
                      {filteredLogs.length === 0 ? 'No AI Gateway requests recorded yet.' : 'No matching requests on this page.'}
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log) => {
                    const costRp = Number(log.costRp ?? 0);
                    const upstreamRp = Number(log.upstreamCostRp ?? 0);
                    return (
                      <tr key={log.id} className={cn("transition-colors", isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50/80")}>
                        <td className={cn(isDark ? 'py-2.5 px-3 text-zinc-400 whitespace-nowrap' : 'py-2.5 px-3 text-slate-600 whitespace-nowrap')}>
                          {new Date(log.createdAt).toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className={cn(isDark ? 'text-white font-medium' : 'text-slate-900 font-medium')}>{log.user?.name || 'User'}</div>
                          <div className="text-[11px] text-zinc-500">{log.user?.email || '-'}</div>
                        </td>
                        <td className={cn(isDark ? 'py-2.5 px-3 font-mono text-zinc-400' : 'py-2.5 px-3 font-mono text-slate-600')}>
                          {log.apiKey ? `${log.apiKey.name} (${log.apiKey.keyPrefix}...)` : 'Playground'}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className={cn("font-mono font-medium", isDark ? "text-cyan-400" : "text-cyan-700")}>{log.modelId}</div>
                          <div className="text-[10px] text-zinc-500 font-mono">{log.endpoint}</div>
                        </td>
                        <td className={cn(isDark ? 'py-2.5 px-3 font-mono text-zinc-300' : 'py-2.5 px-3 font-mono text-slate-700')}>
                          {Number(log.inputTokens || 0).toLocaleString('id-ID')} /{' '}
                          {Number(log.outputTokens || 0).toLocaleString('id-ID')}
                        </td>
                        <td className={cn(isDark ? 'py-2.5 px-3 font-mono font-bold text-white' : 'py-2.5 px-3 font-mono font-bold text-slate-900')}>
                          Rp {costRp.toLocaleString('id-ID')}
                        </td>
                        <td className={cn("py-2.5 px-3 font-mono font-semibold", isDark ? "text-emerald-400" : "text-emerald-600")}>
                          +Rp {(costRp - upstreamRp).toLocaleString('id-ID')}
                        </td>
                        <td className={cn(isDark ? 'py-2.5 px-3 font-mono text-zinc-400' : 'py-2.5 px-3 font-mono text-slate-600')}>{log.latencyMs ?? 0} ms</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <TablePaginationBar
            totalItems={filteredLogs.length}
            itemLabel="requests"
            page={logsPagination.safePage}
            perPage={logsPerPage}
            totalPages={logsPagination.totalPages}
            startItem={logsPagination.startItem}
            endItem={logsPagination.endItem}
            isDark={isDark}
            onPageChange={setLogsPage}
            onPerPageChange={setLogsPerPage}
          />
        </div>
      )}

      {/* MODAL: ADJUST CUSTOMER AI BALANCE */}
      {adjustModalCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className={cn("w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 border transition-all", isDark ? "bg-[#111115] border-white/10" : "bg-white border-slate-200")}>
            <div className={cn("flex items-center justify-between border-b pb-3.5", isDark ? "border-white/[0.07]" : "border-slate-200")}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={cn(isDark ? 'text-sm font-bold text-white' : 'text-sm font-bold text-slate-900')}>Adjust Customer AI Balance</h3>
                  <p className={cn(isDark ? 'text-[11px] text-zinc-400' : 'text-[11px] text-slate-600')}>
                    {adjustModalCustomer.name || 'Customer'} ({adjustModalCustomer.email})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdjustModalCustomer(null)}
                className={cn(isDark ? 'p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5' : 'p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAdjustBalance} className="space-y-4">
              <div className={cn("grid grid-cols-2 gap-3 p-3.5 rounded-xl border", isDark ? "bg-black/40 border-white/[0.06]" : "bg-slate-50 border-slate-200")}>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Current AI Credit
                  </div>
                  <div className={cn("text-base font-black font-mono mt-0.5", isDark ? "text-cyan-400" : "text-cyan-700")}>
                    Rp {(adjustModalCustomer.aiBalance || 0).toLocaleString('id-ID')}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Main Wallet Balance
                  </div>
                  <div className={cn(isDark ? 'text-base font-bold text-white font-mono mt-0.5' : 'text-base font-bold text-slate-900 font-mono mt-0.5')}>
                    Rp {(adjustModalCustomer.balance || 0).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              <div>
                <label className={cn(isDark ? 'block text-xs font-semibold text-zinc-300 mb-1.5' : 'block text-xs font-semibold text-slate-700 mb-1.5')}>
                  Adjustment Action
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'add', label: 'Add Credit (+)', icon: Plus },
                    { id: 'deduct', label: 'Deduct (-)', icon: Minus },
                    { id: 'set', label: 'Set Exact (=)', icon: DollarSign },
                  ].map((item) => {
                    const Icon = item.icon;
                    const active = adjustMode === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setAdjustMode(item.id as any)}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          active
                            ? isDark
                              ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300'
                              : 'bg-cyan-50 border-cyan-500 text-cyan-700 shadow-xs'
                            : isDark
                            ? 'bg-black/40 border-white/10 text-zinc-400 hover:text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={cn(isDark ? 'block text-xs font-semibold text-zinc-300 mb-1.5' : 'block text-xs font-semibold text-slate-700 mb-1.5')}>
                  Amount (IDR)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className={cn(isDark ? 'w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-sm text-white font-mono focus:border-cyan-400 focus:outline-none' : 'w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 font-mono focus:border-cyan-400 focus:outline-none')}
                  required
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[25000, 50000, 100000, 250000, 500000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAdjustAmount(String(preset))}
                      className={cn(
                        'px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-all cursor-pointer',
                        isDark
                          ? 'bg-white/[0.04] hover:bg-cyan-500/15 border-white/[0.08] hover:border-cyan-500/30 text-zinc-300 hover:text-cyan-300'
                          : 'bg-slate-100 hover:bg-cyan-50 border-slate-200 hover:border-cyan-300 text-slate-700 hover:text-cyan-700',
                      )}
                    >
                      Rp {preset.toLocaleString('id-ID')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-1">
                <AdminCheckbox
                  checked={adjustAutoTopup}
                  onChange={(checked) => setAdjustAutoTopup(checked)}
                  label="Customer Auto Top-Up Enabled"
                />
              </div>

              <div className={cn("flex items-center justify-end gap-2.5 pt-3 border-t", isDark ? "border-white/[0.07]" : "border-slate-200")}>
                <button
                  type="button"
                  onClick={() => setAdjustModalCustomer(null)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all",
                    isDark
                      ? "bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  )}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustingBalance}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {adjustingBalance ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  Confirm Balance Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
