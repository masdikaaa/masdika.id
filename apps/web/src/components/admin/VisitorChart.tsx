"use client";

import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity } from "lucide-react";
import { formatCompact, cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

interface DataPoint {
  date: string;
  visitors: number;
  timestamp: number;
  isMock?: boolean;
}

const RANGES = [
  { label: "1D", value: "1d" },
  { label: "7D", value: "7d" },
  { label: "30D", value: "30d" },
  { label: "90D", value: "90d" },
  { label: "6M", value: "180d" },
  { label: "1Y", value: "365d" },
];

export function VisitorChart() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [range, setRange] = useState("30d");
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetch(`/api/admin/analytics/visitors?range=${range}`)
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP error! status: ${res.status}, response: ${text.substring(0, 100)}`);
        }
        return res.json();
      })
      .then((json) => {
        if (isMounted) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch chart data", err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [range]);

  const formatXAxis = (dateStr: string) => {
    const d = new Date(dateStr);
    if (range === "1d") {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (range === "365d" || range === "180d") {
      return d.toLocaleDateString([], { month: 'short', year: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className={cn("backdrop-blur-md border p-4 rounded-xl shadow-2xl", isDark ? "bg-[#0f172a]/90 border-cyan-500/20" : "bg-white/90 border-slate-200")}>
          <p className={cn("text-xs mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>{formatXAxis(label)}</p>
          <p className={cn("font-bold text-lg flex items-center gap-2", isDark ? "text-cyan-400" : "text-cyan-700")}>
            {formatCompact(payload[0].value)} <span className="text-zinc-500 text-xs font-normal">Visitors</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const currentTotal = data.reduce((sum, item) => sum + item.visitors, 0);

  return (
    <div className="w-full h-full flex flex-col relative z-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className={cn("w-5 h-5", isDark ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" : "text-cyan-600")} />
            <h2 className={cn("text-xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>Visitor Traffic</h2>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>{formatCompact(currentTotal)}</span>
            <span className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>total in period</span>
          </div>
        </div>

        {/* Range Toggles */}
        <div className={cn("flex backdrop-blur-md rounded-xl p-1 border shadow-inner overflow-x-auto max-w-full", isDark ? "bg-[#0A0B1A]/80 border-white/5" : "bg-slate-100 border-slate-200")}>
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-3 sm:px-4 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${range === r.value
                  ? "bg-cyan-500 text-slate-900 shadow-md font-bold"
                  : cn(isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-white")
                }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 w-full relative min-h-[200px]">
        {loading ? (
          <div className={cn("absolute inset-0 flex items-center justify-center backdrop-blur-sm z-10 rounded-xl", isDark ? "bg-[#0a1f33]/50" : "bg-white/50")}>
            <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
          </div>
        ) : null}

        {isClient && (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart data={data} margin={{ top: 10, right: 30, left: -20, bottom: 15 }}>
              <defs>
                <linearGradient id="lineColor" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#0891b2" />    {/* cyan-600 */}
                  <stop offset="50%" stopColor="#06b6d4" />   {/* cyan-500 */}
                  <stop offset="100%" stopColor="#22d3ee" />  {/* cyan-400 */}
                </linearGradient>
                <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0891b2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#ffffff0a" : "#f1f5f9"} vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatXAxis}
                stroke={isDark ? "#94a3b8" : "#64748b"}
                fontSize={12}
                fontWeight={500}
                tickLine={false}
                axisLine={false}
                tickMargin={12}
                interval={data.length > 15 ? Math.floor(data.length / 7) : 0}
              />
              <YAxis
                stroke={isDark ? "#94a3b8" : "#64748b"}
                fontSize={12}
                fontWeight={500}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                tickMargin={12}
                tickFormatter={(value) => formatCompact(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="visitors"
                stroke="url(#lineColor)"
                strokeWidth={4}
                fillOpacity={1}
                fill="url(#colorVisitors)"
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
