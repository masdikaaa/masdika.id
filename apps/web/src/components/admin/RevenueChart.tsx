"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatRupiah } from "@/lib/billing";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

export function RevenueChart({ data }: { data: any[] }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const chartData = useMemo(() => {
    return data || [];
  }, [data]);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <p className="text-zinc-500 font-medium">No revenue data available for the last 30 days.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
      <AreaChart
        data={chartData}
        margin={{
          top: 10,
          right: 30,
          left: -10,
          bottom: 20,
        }}
      >
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1f2937" : "#e2e8f0"} vertical={false} />
        <XAxis
          dataKey="date"
          stroke={isDark ? "#4b5563" : "#94a3b8"}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          minTickGap={20}
        />
        <YAxis
          stroke={isDark ? "#4b5563" : "#94a3b8"}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          tickFormatter={(value) => {
            if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(1)}M`;
            if (value >= 1000) return `Rp ${(value / 1000).toFixed(0)}k`;
            return `Rp ${value}`;
          }}
          dx={0}
          width={70}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              return (
                <div className={cn("border rounded-xl p-3", isDark ? "bg-[#0b1322] border-slate-800 shadow-xl" : "bg-white border-slate-200 shadow-lg")}>
                  <p className={cn("text-xs mb-1 font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>{label}</p>
                  <p className={cn("font-bold text-lg", isDark ? "text-cyan-400" : "text-cyan-700")}>
                    {formatRupiah(payload[0].value as number)}
                  </p>
                </div>
              );
            }
            return null;
          }}
          cursor={{ stroke: '#22d3ee', strokeWidth: 1, strokeDasharray: '4 4', fill: 'transparent' }}
        />
        <Area
          type="monotoneX"
          dataKey="revenue"
          stroke="#22d3ee"
          strokeWidth={3}
          fillOpacity={1}
          fill="url(#colorRevenue)"
          activeDot={{ r: 6, fill: isDark ? "#0b1322" : "#ffffff", stroke: '#22d3ee', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
