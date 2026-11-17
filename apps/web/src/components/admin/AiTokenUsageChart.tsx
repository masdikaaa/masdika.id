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
  Legend,
} from 'recharts';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';
import { Activity, Zap, ArrowDownLeft, ArrowUpRight, Database } from 'lucide-react';

export interface TokenTimelineEntry {
  date: string;
  fullDate: string;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  totalTokens: number;
  requests: number;
  costRp: number;
}

interface AiTokenUsageChartProps {
  data: TokenTimelineEntry[];
}

export function AiTokenUsageChart({ data }: AiTokenUsageChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [metric, setMetric] = useState<'all' | 'total'>('all');

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
        'rounded-2xl p-5 sm:p-6 border transition-all space-y-4',
        isDark
          ? 'bg-[#111115] border-white/[0.08]'
          : 'bg-white border-slate-200 shadow-sm',
      )}
    >
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-inherit">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Activity className="w-4 h-4" />
            </div>
            <h2
              className={cn(
                'text-sm font-bold uppercase tracking-wider',
                isDark ? 'text-white' : 'text-slate-900',
              )}
            >
              Customer Token Usage Trends (Last 14 Days)
            </h2>
          </div>
          <p className={cn('text-xs', isDark ? 'text-zinc-400' : 'text-slate-600')}>
            Daily aggregate token consumption, cache hits, and request volume across all active customer AI keys.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 w-full sm:w-auto bg-slate-100 dark:bg-white/[0.04] p-1 rounded-xl border border-slate-200 dark:border-white/[0.08] overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setMetric('all')}
            className={cn(
              'flex-1 sm:flex-initial text-center justify-center px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap',
              metric === 'all'
                ? 'bg-cyan-400 text-slate-950 font-bold shadow-xs'
                : isDark
                ? 'text-zinc-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900',
            )}
          >
            Breakdown (In / Out / Cache)
          </button>
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
        </div>
      </div>

      {/* Quick Summary Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div
          className={cn(
            'p-2.5 sm:p-3 rounded-xl border',
            isDark ? 'bg-black/30 border-white/[0.06]' : 'bg-slate-50 border-slate-200',
          )}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-cyan-500 truncate">
            <Zap className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Total 14-Day Tokens</span>
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

        <div
          className={cn(
            'p-2.5 sm:p-3 rounded-xl border',
            isDark ? 'bg-black/30 border-white/[0.06]' : 'bg-slate-50 border-slate-200',
          )}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-cyan-400 truncate">
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

        <div
          className={cn(
            'p-2.5 sm:p-3 rounded-xl border',
            isDark ? 'bg-black/30 border-white/[0.06]' : 'bg-slate-50 border-slate-200',
          )}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-500 truncate">
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

        <div
          className={cn(
            'p-2.5 sm:p-3 rounded-xl border',
            isDark ? 'bg-black/30 border-white/[0.06]' : 'bg-slate-50 border-slate-200',
          )}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-purple-400 truncate">
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

      {/* Chart Canvas */}
      <div className="h-[260px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <AreaChart
            data={chartData}
            margin={{
              top: 10,
              right: 12,
              left: -10,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorInput" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorCache" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
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
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              stroke={isDark ? '#71717a' : '#94a3b8'}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => formatTokenNumber(value)}
              width={56}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const entry = payload[0].payload as TokenTimelineEntry;
                  return (
                    <div
                      className={cn(
                        'border rounded-xl p-3.5 shadow-xl text-xs space-y-2 min-w-[210px]',
                        isDark
                          ? 'bg-[#0f1015] border-white/10 text-white'
                          : 'bg-white border-slate-200 text-slate-900',
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
                            <span className="w-2 h-2 rounded-full bg-cyan-400" />
                            Total Tokens:
                          </span>
                          <span className="font-bold">
                            {entry.totalTokens.toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sky-400">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-sky-400" />
                            Input:
                          </span>
                          <span>{entry.inputTokens.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex items-center justify-between text-emerald-400">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            Output:
                          </span>
                          <span>{entry.outputTokens.toLocaleString('id-ID')}</span>
                        </div>
                        {entry.cachedTokens > 0 && (
                          <div className="flex items-center justify-between text-purple-400">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-purple-400" />
                              Cached:
                            </span>
                            <span>{entry.cachedTokens.toLocaleString('id-ID')}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-1 border-t border-inherit text-zinc-400 text-[10px]">
                          <span>Billed:</span>
                          <span className="font-bold text-emerald-400">
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
                fill="url(#colorTotal)"
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
                  stroke="#38bdf8"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorInput)"
                  activeDot={{
                    r: 4,
                    fill: isDark ? '#09090b' : '#ffffff',
                    stroke: '#38bdf8',
                    strokeWidth: 2,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="outputTokens"
                  name="Output Tokens"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorOutput)"
                  activeDot={{
                    r: 4,
                    fill: isDark ? '#09090b' : '#ffffff',
                    stroke: '#10b981',
                    strokeWidth: 2,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cachedTokens"
                  name="Cached Tokens"
                  stroke="#a855f7"
                  strokeWidth={1.5}
                  fillOpacity={1}
                  fill="url(#colorCache)"
                  activeDot={{
                    r: 4,
                    fill: isDark ? '#09090b' : '#ffffff',
                    stroke: '#a855f7',
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
