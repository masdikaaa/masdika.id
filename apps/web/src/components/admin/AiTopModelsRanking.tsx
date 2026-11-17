'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  Trophy,
  Award,
  Flame,
  Zap,
  TrendingUp,
  DollarSign,
  Search,
  Copy,
  Check,
  Cpu,
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Pagination } from '@/components/ui/Pagination';

export interface TopModelRankingItem {
  rank: number;
  modelId: string;
  name: string;
  provider: string;
  contextWindow: string;
  isImageModel: boolean;
  requests: number;
  requestSharePct: number;
  totalTokens: number;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  revenueRp: number;
  upstreamCostRp: number;
  profitRp: number;
  marginPercent: number;
  avgLatencyMs: number;
}

interface AiTopModelsRankingProps {
  rankings: TopModelRankingItem[];
  totalGatewayRequests?: number;
  onSelectModel?: (modelId: string) => void;
}

export function AiTopModelsRanking({
  rankings,
  totalGatewayRequests = 0,
  onSelectModel,
}: AiTopModelsRankingProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [sortBy, setSortBy] = useState<'requests' | 'tokens' | 'revenue' | 'profit'>('requests');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success(`Copied "${text}" to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTokenNumber = (val: number) => {
    if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(2)}B`;
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
    return `${val}`;
  };

  const formatRp = (val: number) => {
    return `Rp ${val.toLocaleString('id-ID')}`;
  };

  // Reset page when search or sortBy changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortBy]);

  // Sort and filter (Top 20 models)
  const sortedAndFiltered = useMemo(() => {
    let list = [...(rankings || [])];

    // Filter by search query
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.modelId.toLowerCase().includes(q) ||
          m.provider.toLowerCase().includes(q),
      );
    }

    // Sort according to active criterion
    list.sort((a, b) => {
      if (sortBy === 'requests') return b.requests - a.requests;
      if (sortBy === 'tokens') return b.totalTokens - a.totalTokens;
      if (sortBy === 'revenue') return b.revenueRp - a.revenueRp;
      if (sortBy === 'profit') return b.profitRp - a.profitRp;
      return 0;
    });

    return list.slice(0, 20);
  }, [rankings, search, sortBy]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(sortedAndFiltered.length / pageSize));
  const paginatedModels = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedAndFiltered.slice(start, start + pageSize);
  }, [sortedAndFiltered, currentPage, pageSize]);

  // Top 3 Podium (Masdika Cyan Theme)
  const topThree = useMemo(() => {
    const list = [...(rankings || [])].sort((a, b) => b.requests - a.requests);
    return list.slice(0, 3);
  }, [rankings]);

  return (
    <div className="space-y-6">
      {/* Top 3 Visual Podium Highlights - Pure Masdika Cyan */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Rank #1 Champion */}
          {topThree[0] && (
            <div
              className={cn(
                'relative rounded-2xl p-5 border transition-all overflow-hidden flex flex-col justify-between order-1 md:order-2',
                isDark
                  ? 'bg-gradient-to-b from-cyan-500/15 via-[#111115] to-[#111115] border-cyan-400/40 shadow-lg shadow-cyan-500/5'
                  : 'bg-gradient-to-b from-cyan-50 to-white border-cyan-300 shadow-sm',
              )}
            >
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-cyan-400 text-slate-950 shadow-xs">
                    <Trophy className="w-3.5 h-3.5 fill-current" />
                    <span>#1 Top Model</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-cyan-400">
                    {topThree[0].requestSharePct}% Traffic
                  </span>
                </div>

                <div className="space-y-1">
                  <h3
                    className={cn(
                      'text-base sm:text-lg font-black truncate',
                      isDark ? 'text-white' : 'text-slate-900',
                    )}
                  >
                    {topThree[0].name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs">
                    <code className="text-cyan-400 font-mono text-[11px] truncate">
                      {topThree[0].modelId}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopy(topThree[0].modelId, `podium-${topThree[0].modelId}`)}
                      className="text-zinc-400 hover:text-white cursor-pointer"
                      title="Copy Model ID"
                    >
                      {copiedId === `podium-${topThree[0].modelId}` ? (
                        <Check className="w-3 h-3 text-cyan-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-inherit grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-black/10 dark:bg-white/[0.03]">
                  <span className="text-[10px] text-zinc-400 block">Requests</span>
                  <span className={cn('text-xs font-black font-mono', isDark ? 'text-white' : 'text-slate-900')}>
                    {topThree[0].requests.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-black/10 dark:bg-white/[0.03]">
                  <span className="text-[10px] text-zinc-400 block">Tokens</span>
                  <span className="text-xs font-black font-mono text-cyan-400">
                    {formatTokenNumber(topThree[0].totalTokens)}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-black/10 dark:bg-white/[0.03]">
                  <span className="text-[10px] text-zinc-400 block">Revenue</span>
                  <span className="text-xs font-black font-mono text-cyan-300">
                    {formatRp(topThree[0].revenueRp)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Rank #2 */}
          {topThree[1] && (
            <div
              className={cn(
                'relative rounded-2xl p-5 border transition-all overflow-hidden flex flex-col justify-between order-2 md:order-1',
                isDark
                  ? 'bg-gradient-to-b from-cyan-500/10 via-[#111115] to-[#111115] border-cyan-500/25 shadow-xs'
                  : 'bg-gradient-to-b from-cyan-50/50 to-white border-cyan-200 shadow-xs',
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    <Award className="w-3.5 h-3.5" />
                    <span>#2 Runner Up</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-cyan-400/80">
                    {topThree[1].requestSharePct}% Traffic
                  </span>
                </div>

                <div className="space-y-1">
                  <h3
                    className={cn(
                      'text-base font-bold truncate',
                      isDark ? 'text-white' : 'text-slate-900',
                    )}
                  >
                    {topThree[1].name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs">
                    <code className="text-cyan-400 font-mono text-[11px] truncate">
                      {topThree[1].modelId}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopy(topThree[1].modelId, `podium-${topThree[1].modelId}`)}
                      className="text-zinc-400 hover:text-white cursor-pointer"
                      title="Copy Model ID"
                    >
                      {copiedId === `podium-${topThree[1].modelId}` ? (
                        <Check className="w-3 h-3 text-cyan-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-inherit grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-black/10 dark:bg-white/[0.03]">
                  <span className="text-[10px] text-zinc-400 block">Requests</span>
                  <span className={cn('text-xs font-black font-mono', isDark ? 'text-white' : 'text-slate-900')}>
                    {topThree[1].requests.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-black/10 dark:bg-white/[0.03]">
                  <span className="text-[10px] text-zinc-400 block">Tokens</span>
                  <span className="text-xs font-black font-mono text-cyan-400">
                    {formatTokenNumber(topThree[1].totalTokens)}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-black/10 dark:bg-white/[0.03]">
                  <span className="text-[10px] text-zinc-400 block">Revenue</span>
                  <span className="text-xs font-black font-mono text-cyan-300">
                    {formatRp(topThree[1].revenueRp)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Rank #3 */}
          {topThree[2] && (
            <div
              className={cn(
                'relative rounded-2xl p-5 border transition-all overflow-hidden flex flex-col justify-between order-3',
                isDark
                  ? 'bg-gradient-to-b from-cyan-500/5 via-[#111115] to-[#111115] border-cyan-500/20 shadow-xs'
                  : 'bg-gradient-to-b from-cyan-50/30 to-white border-cyan-200/80 shadow-xs',
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    <Award className="w-3.5 h-3.5" />
                    <span>#3 Third Place</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-cyan-400/70">
                    {topThree[2].requestSharePct}% Traffic
                  </span>
                </div>

                <div className="space-y-1">
                  <h3
                    className={cn(
                      'text-base font-bold truncate',
                      isDark ? 'text-white' : 'text-slate-900',
                    )}
                  >
                    {topThree[2].name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs">
                    <code className="text-cyan-400 font-mono text-[11px] truncate">
                      {topThree[2].modelId}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopy(topThree[2].modelId, `podium-${topThree[2].modelId}`)}
                      className="text-zinc-400 hover:text-white cursor-pointer"
                      title="Copy Model ID"
                    >
                      {copiedId === `podium-${topThree[2].modelId}` ? (
                        <Check className="w-3 h-3 text-cyan-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-inherit grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-black/10 dark:bg-white/[0.03]">
                  <span className="text-[10px] text-zinc-400 block">Requests</span>
                  <span className={cn('text-xs font-black font-mono', isDark ? 'text-white' : 'text-slate-900')}>
                    {topThree[2].requests.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-black/10 dark:bg-white/[0.03]">
                  <span className="text-[10px] text-zinc-400 block">Tokens</span>
                  <span className="text-xs font-black font-mono text-cyan-400">
                    {formatTokenNumber(topThree[2].totalTokens)}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-black/10 dark:bg-white/[0.03]">
                  <span className="text-[10px] text-zinc-400 block">Revenue</span>
                  <span className="text-xs font-black font-mono text-cyan-300">
                    {formatRp(topThree[2].revenueRp)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Leaderboard Table Container */}
      <div
        className={cn(
          'rounded-2xl border transition-all overflow-hidden space-y-4 p-4 sm:p-6',
          isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200 shadow-sm',
        )}
      >
        {/* Header & Filter Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 border-b pb-4 border-inherit">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Trophy className="w-4 h-4" />
              </div>
              <h2
                className={cn(
                  'text-xs sm:text-sm font-bold uppercase tracking-wider',
                  isDark ? 'text-white' : 'text-slate-900',
                )}
              >
                Top 20 AI Models Leaderboard
              </h2>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border',
                  isDark
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                    : 'bg-cyan-50 text-cyan-700 border-cyan-200',
                )}
              >
                {sortedAndFiltered.length} Models
              </span>
            </div>
            <p className={cn('text-[11px] sm:text-xs mt-1', isDark ? 'text-zinc-400' : 'text-slate-600')}>
              Top 20 most utilized models ranked by request traffic volume, tokens, or revenue.
            </p>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search model name or ID..."
                className={cn(
                  'w-full pl-8 pr-3 py-1.5 rounded-xl text-xs border outline-none transition-colors focus:border-cyan-500',
                  isDark
                    ? 'bg-[#0a0a0c] border-white/10 text-white placeholder:text-zinc-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400',
                )}
              />
            </div>

            {/* Sort Toggle - Smooth horizontal scroll with hidden scrollbar */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/[0.04] p-1 rounded-xl border border-slate-200 dark:border-white/[0.08] overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden w-full sm:w-auto">
              {(
                [
                  { id: 'requests', label: 'Requests', icon: Flame },
                  { id: 'tokens', label: 'Tokens', icon: Zap },
                  { id: 'revenue', label: 'Revenue', icon: DollarSign },
                  { id: 'profit', label: 'Profit', icon: TrendingUp },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const active = sortBy === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSortBy(tab.id)}
                    className={cn(
                      'flex-1 sm:flex-initial text-center justify-center px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap',
                      active
                        ? 'bg-cyan-400 text-slate-950 font-bold shadow-xs'
                        : isDark
                        ? 'text-zinc-400 hover:text-white'
                        : 'text-slate-600 hover:text-slate-900',
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Empty State */}
        {sortedAndFiltered.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <Cpu className="w-9 h-9 text-cyan-400/60 mx-auto" />
            <h3 className={cn('text-sm font-bold', isDark ? 'text-zinc-300' : 'text-slate-800')}>
              No Model Usage Records Found
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {search
                ? `No models match your query "${search}". Try clearing the search filter.`
                : 'Customer usage logs will automatically populate this leaderboard as API requests flow through the AI Gateway.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View - Hidden scrollbar */}
            <div className="hidden lg:block overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr
                    className={cn(
                      'border-b text-[11px] font-bold uppercase tracking-wider',
                      isDark ? 'border-white/[0.08] text-zinc-400' : 'border-slate-200 text-slate-500',
                    )}
                  >
                    <th className="py-3 px-3 w-16">Rank</th>
                    <th className="py-3 px-3">Model Details</th>
                    <th className="py-3 px-3 w-48">Traffic &amp; Share</th>
                    <th className="py-3 px-3">Token Consumption</th>
                    <th className="py-3 px-3">Financials (Rev / Profit)</th>
                    <th className="py-3 px-3 w-24 text-right">Avg Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-inherit">
                  {paginatedModels.map((item, idx) => {
                    const rankNum = (currentPage - 1) * pageSize + idx + 1;
                    return (
                      <tr
                        key={item.modelId}
                        className={cn(
                          'transition-colors font-mono',
                          isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/80',
                        )}
                      >
                        {/* Rank Badge - Typography only in pure Cyan */}
                        <td className="py-3.5 px-3">
                          {rankNum === 1 ? (
                            <span className="w-7 h-7 rounded-lg bg-cyan-400 text-slate-950 font-black flex items-center justify-center text-xs font-mono shadow-xs">
                              #1
                            </span>
                          ) : rankNum === 2 ? (
                            <span className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-bold flex items-center justify-center text-xs font-mono shadow-xs">
                              #2
                            </span>
                          ) : rankNum === 3 ? (
                            <span className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center text-xs font-mono shadow-xs">
                              #3
                            </span>
                          ) : (
                            <span
                              className={cn(
                                'w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-bold font-mono',
                                isDark
                                  ? 'bg-white/[0.03] border-white/10 text-zinc-400'
                                  : 'bg-slate-100 border-slate-200 text-slate-700',
                              )}
                            >
                              #{rankNum}
                            </span>
                          )}
                        </td>

                        {/* Model Details */}
                        <td className="py-3.5 px-3">
                          <div className="font-sans">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  'font-bold text-sm truncate max-w-[220px]',
                                  isDark ? 'text-white' : 'text-slate-900',
                                )}
                              >
                                {item.name}
                              </span>
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                                  isDark
                                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                    : 'bg-cyan-50 text-cyan-700 border border-cyan-200',
                                )}
                              >
                                {item.provider}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <code className="text-cyan-400 font-mono text-[11px] truncate max-w-[200px]">
                                {item.modelId}
                              </code>
                              <button
                                type="button"
                                onClick={() => handleCopy(item.modelId, `tbl-${item.modelId}`)}
                                className="text-zinc-400 hover:text-white cursor-pointer"
                                title="Copy Model ID"
                              >
                                {copiedId === `tbl-${item.modelId}` ? (
                                  <Check className="w-3 h-3 text-cyan-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Traffic & Share */}
                        <td className="py-3.5 px-3">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className={isDark ? 'text-white' : 'text-slate-900'}>
                                {item.requests.toLocaleString('id-ID')} calls
                              </span>
                              <span className="text-cyan-400 font-mono text-[11px]">
                                {item.requestSharePct}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                              <div
                                className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, item.requestSharePct)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Token Consumption */}
                        <td className="py-3.5 px-3">
                          <div>
                            <span className={cn('font-bold text-xs', isDark ? 'text-white' : 'text-slate-900')}>
                              {formatTokenNumber(item.totalTokens)}
                            </span>
                            <div className="text-[10px] text-zinc-500 space-x-1.5 mt-0.5">
                              <span title="Input Tokens">↓ {formatTokenNumber(item.inputTokens)}</span>
                              <span>·</span>
                              <span title="Output Tokens">↑ {formatTokenNumber(item.outputTokens)}</span>
                              {item.cachedTokens > 0 && (
                                <>
                                  <span>·</span>
                                  <span title="Cached Tokens">⚡ {formatTokenNumber(item.cachedTokens)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Financials (Pure Cyan) */}
                        <td className="py-3.5 px-3">
                          <div>
                            <span className="font-bold text-xs text-cyan-400">
                              {formatRp(item.revenueRp)}
                            </span>
                            <div className="text-[10px] text-zinc-500 mt-0.5 flex items-center gap-1.5">
                              <span>Upstream: {formatRp(item.upstreamCostRp)}</span>
                              <span className="text-cyan-300 font-bold">
                                (+{item.marginPercent}% margin)
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Avg Latency */}
                        <td className="py-3.5 px-3 text-right">
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            {item.avgLatencyMs} ms
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Responsive Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-3">
              {paginatedModels.map((item, idx) => {
                const rankNum = (currentPage - 1) * pageSize + idx + 1;
                return (
                  <div
                    key={item.modelId}
                    className={cn(
                      'rounded-xl border p-4 space-y-3 transition-all',
                      isDark ? 'bg-[#0a0a0c] border-white/[0.08]' : 'bg-slate-50 border-slate-200',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'w-6 h-6 rounded-md flex items-center justify-center text-xs font-black font-mono',
                            rankNum === 1
                              ? 'bg-cyan-400 text-slate-950'
                              : rankNum === 2
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                              : rankNum === 3
                              ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                              : isDark
                              ? 'bg-white/10 text-zinc-400'
                              : 'bg-slate-200 text-slate-700',
                          )}
                        >
                          #{rankNum}
                        </span>
                        <div>
                          <div className={cn('font-bold text-xs truncate max-w-[170px]', isDark ? 'text-white' : 'text-slate-900')}>
                            {item.name}
                          </div>
                          <div className="text-[10px] text-cyan-400 font-mono truncate max-w-[160px]">
                            {item.modelId}
                          </div>
                        </div>
                      </div>

                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase',
                          isDark ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-cyan-50 text-cyan-700 border border-cyan-200',
                        )}
                      >
                        {item.provider}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-zinc-400">{item.requests.toLocaleString('id-ID')} calls</span>
                        <span className="text-cyan-400 font-bold">{item.requestSharePct}% share</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-cyan-400 rounded-full"
                          style={{ width: `${Math.min(100, item.requestSharePct)}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-inherit text-[11px] font-mono">
                      <div>
                        <span className="text-[10px] text-zinc-500 block">Total Tokens</span>
                        <span className={cn('font-bold', isDark ? 'text-white' : 'text-slate-900')}>
                          {formatTokenNumber(item.totalTokens)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block">Revenue</span>
                        <span className="font-bold text-cyan-400">
                          {formatRp(item.revenueRp)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-inherit">
                <span className={cn('text-xs font-mono', isDark ? 'text-zinc-400' : 'text-slate-600')}>
                  Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, sortedAndFiltered.length)} of {sortedAndFiltered.length} Top Models
                </span>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
