'use client';

import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';
import { Activity, Zap, ArrowDownLeft, ArrowUpRight, Database } from 'lucide-react';

export interface CustomerTokenTimelineEntry {
  date: string;
  fullDate: string;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  totalTokens: number;
  requests: number;
  costRp: number;
}

interface CustomerAiTokenUsageChartProps {
  data: CustomerTokenTimelineEntry[];
}

export function CustomerAiTokenUsageChart({ data }: CustomerAiTokenUsageChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [metric, setMetric] = useState<'total' | 'breakdown'>('total');

  const chartData = useMemo(() => {
    return data || [];
  }, [data]);

  const totals = useMemo(() => {
    return chartData.reduce(
      (acc, item) => {
        acc.totalTokens += item.totalTokens || 0;
        acc.inputTokens += item.inputTokens || 0;
        acc.outputTokens += item.outputTokens || 0;
        acc.cachedTokens += item.cachedTokens || 0;
        acc.requests += item.requests || 0;
        acc.costRp += item.costRp || 0;
        return acc;
      },
      { totalTokens: 0, inputTokens: 0, outputTokens: 0, cachedTokens: 0, requests: 0, costRp: 0 },
    );
  }, [chartData]);

  const formatTokenNumber = (val: number) => {
    if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(2)}B`;
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
    return `${val}`;
  };

  return (
    <div
      className={cn(
        'rounded-2xl p-4 sm:p-6 border transition-all space-y-4 shadow-2xs',
        isDark
          ? 'bg-[#111115] border-white/[0.08]'
          : 'bg-white border-slate-200',
      )}
    >
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-inherit">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <h2
              className={cn(
                'text-xs sm:text-sm font-bold uppercase tracking-wider',
                isDark ? 'text-white' : 'text-slate-900',
              )}
            >
              Token Usage Trends (Last 14 Days)
            </h2>
          </div>
          <p className={cn('text-[11px] sm:text-xs', isDark ? 'text-zinc-400' : 'text-slate-600')}>
            Daily aggregate token consumption, cache hits, and request volume for your account.
          </p>
        </div>

        {/* View Toggle - Strictly Cyan & Smooth horizontal swipe with hidden scrollbar */}
        <div className="flex items-center gap-1 w-full sm:w-auto bg-slate-100 dark:bg-white/[0.04] p-1 rounded-xl border border-slate-200 dark:border-white/[0.08] overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setMetric('total')}
            className={cn(
              'flex-1 sm:flex-initial text-center justify-center px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap',
              metric === 'total'
                ? 'bg-cyan-400 text-slate-950 font-bold shadow-xs'
                : isDark
                ? 'text-zinc-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900',
            )}
          >
            Total Tokens
          </button>
          <button
            type="button"
            onClick={() => setMetric('breakdown')}
            className={cn(
              'flex-1 sm:flex-initial text-center justify-center px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap',
              metric === 'breakdown'
                ? 'bg-cyan-400 text-slate-950 font-bold shadow-xs'
                : isDark
                ? 'text-zinc-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900',
            )}
          >
            Breakdown
          </button>
        </div>
      </div>

      {/* Quick Summary Badges - Cyan Monochromatic Theme */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {/* Total 14-Day Tokens */}
        <div
          className={cn(
            'p-2.5 sm:p-3 rounded-xl border transition-all',
            isDark ? 'bg-black/30 border-cyan-500/20' : 'bg-cyan-50/50 border-cyan-200/80',
          )}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-400 dark:text-cyan-400">
            <Zap className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">14-Day Total</span>
          </div>
          <div
            className={cn(
              'text-base sm:text-lg font-black font-mono mt-1 truncate',
              isDark ? 'text-white' : 'text-slate-900',
            )}
          >
            {formatTokenNumber(totals.totalTokens)}
          </div>
          <div className="text-[10px] text-zinc-500 truncate">
            {totals.totalTokens.toLocaleString('id-ID')} tokens
          </div>
        </div>

        {/* Input Tokens */}
        <div
          className={cn(
            'p-2.5 sm:p-3 rounded-xl border transition-all',
            isDark ? 'bg-black/30 border-cyan-500/15' : 'bg-slate-50 border-cyan-100',
          )}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-cyan-400">
            <ArrowDownLeft className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Input Tokens</span>
          </div>
          <div
            className={cn(
              'text-base sm:text-lg font-black font-mono mt-1 truncate',
              isDark ? 'text-white' : 'text-slate-900',
            )}
          >
            {formatTokenNumber(totals.inputTokens)}
          </div>
          <div className="text-[10px] text-zinc-500 truncate">
            {totals.inputTokens.toLocaleString('id-ID')} tokens
          </div>
        </div>

        {/* Output Tokens */}
        <div
          className={cn(
            'p-2.5 sm:p-3 rounded-xl border transition-all',
            isDark ? 'bg-black/30 border-cyan-500/15' : 'bg-slate-50 border-cyan-100',
          )}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-cyan-500">
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Output Tokens</span>
          </div>
          <div
            className={cn(
              'text-base sm:text-lg font-black font-mono mt-1 truncate',
              isDark ? 'text-white' : 'text-slate-900',
            )}
          >
            {formatTokenNumber(totals.outputTokens)}
          </div>
          <div className="text-[10px] text-zinc-500 truncate">
            {totals.outputTokens.toLocaleString('id-ID')} tokens
          </div>
        </div>

        {/* Cached Tokens */}
        <div
          className={cn(
            'p-2.5 sm:p-3 rounded-xl border transition-all',
            isDark ? 'bg-black/30 border-cyan-500/15' : 'bg-slate-50 border-cyan-100',
          )}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-cyan-300">
            <Database className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Cached Tokens</span>
          </div>
          <div
            className={cn(
              'text-base sm:text-lg font-black font-mono mt-1 truncate',
              isDark ? 'text-white' : 'text-slate-900',
            )}
          >
            {formatTokenNumber(totals.cachedTokens)}
          </div>
          <div className="text-[10px] text-zinc-500 truncate">
            {totals.cachedTokens.toLocaleString('id-ID')} tokens
          </div>
        </div>
      </div>

      {/* Chart Canvas - Responsive & Pure Cyan */}
      <div className="h-[200px] sm:h-[250px] md:h-[270px] w-full pt-1 sm:pt-2">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <AreaChart
            data={chartData}
            margin={{
              top: 8,
              right: 6,
              left: -18,
              bottom: 0,
            }}
          >
            <defs>
              {/* Cyan Gradients Only */}
              <linearGradient id="customerCyanTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="customerCyanInput" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="customerCyanOutput" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0891b2" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#0891b2" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="customerCyanCache" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#67e8f9" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#67e8f9" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? '#27272a' : '#e2e8f0'}
              vertical={false}
            />
            <XAxis
              dataKey="date"
              stroke={isDark ? '#71717a' : '#94a3b8'}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickMargin={6}
            />
            <YAxis
              stroke={isDark ? '#71717a' : '#94a3b8'}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              tickFormatter={(value) => formatTokenNumber(value)}
              width={48}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const entry = payload[0].payload as CustomerTokenTimelineEntry;
                  return (
                    <div
                      className={cn(
                        'border rounded-xl p-3 shadow-xl text-xs space-y-2 min-w-[190px] max-w-[260px]',
                        isDark
                          ? 'bg-[#0f1015] border-cyan-500/30 text-white'
                          : 'bg-white border-cyan-200 text-slate-900 shadow-md',
                      )}
                    >
                      <div className="flex items-center justify-between border-b pb-1.5 border-inherit">
                        <span className="font-bold">{label}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {entry.requests} req{entry.requests !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="space-y-1 font-mono text-[11px]">
                        <div className="flex items-center justify-between text-cyan-400">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                            Total Tokens:
                          </span>
                          <span className="font-bold">
                            {entry.totalTokens.toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-cyan-300">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-cyan-300 shrink-0" />
                            Input:
                          </span>
                          <span>{entry.inputTokens.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex items-center justify-between text-cyan-500">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-cyan-500 shrink-0" />
                            Output:
                          </span>
                          <span>{entry.outputTokens.toLocaleString('id-ID')}</span>
                        </div>
                        {entry.cachedTokens > 0 && (
                          <div className="flex items-center justify-between text-cyan-200">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-cyan-200 shrink-0" />
                              Cached:
                            </span>
                            <span>{entry.cachedTokens.toLocaleString('id-ID')}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-1 border-t border-inherit text-zinc-400 text-[10px]">
                          <span>Billed:</span>
                          <span className="font-bold text-cyan-400">
                            Rp {(entry.costRp || 0).toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
              cursor={{
                stroke: '#06b6d4',
                strokeWidth: 1,
                strokeDasharray: '4 4',
                fill: 'transparent',
              }}
            />
            {metric === 'total' ? (
              <Area
                type="monotone"
                dataKey="totalTokens"
                name="Total Tokens"
                stroke="#06b6d4"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#customerCyanTotal)"
                activeDot={{
                  r: 5,
                  fill: isDark ? '#09090b' : '#ffffff',
                  stroke: '#06b6d4',
                  strokeWidth: 2,
                }}
              />
            ) : (
              <>
                <Area
                  type="monotone"
                  dataKey="inputTokens"
                  name="Input Tokens"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#customerCyanInput)"
                  activeDot={{
                    r: 4,
                    fill: isDark ? '#09090b' : '#ffffff',
                    stroke: '#22d3ee',
                    strokeWidth: 2,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="outputTokens"
                  name="Output Tokens"
                  stroke="#0891b2"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#customerCyanOutput)"
                  activeDot={{
                    r: 4,
                    fill: isDark ? '#09090b' : '#ffffff',
                    stroke: '#0891b2',
                    strokeWidth: 2,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cachedTokens"
                  name="Cached Tokens"
                  stroke="#67e8f9"
                  strokeWidth={1.5}
                  fillOpacity={1}
                  fill="url(#customerCyanCache)"
                  activeDot={{
                    r: 4,
                    fill: isDark ? '#09090b' : '#ffffff',
                    stroke: '#67e8f9',
                    strokeWidth: 2,
                  }}
                />
              </>
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
