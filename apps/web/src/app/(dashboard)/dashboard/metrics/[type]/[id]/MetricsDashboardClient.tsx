"use client";

import { useUrlString } from "@/lib/useUrlTab";
import React, { useState, useEffect } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { ArrowLeft, RefreshCw, Server, Activity, HardDrive, Network, MemoryStick } from "lucide-react";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

interface MetricsDashboardClientProps {
  type: "vps" | "k3s";
  id: string;
}

export default function MetricsDashboardClient({ type, id }: MetricsDashboardClientProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [timeframe, setTimeframe] = useUrlString<string>("timeframe", "hour");
  const [loading, setLoading] = useState(true);
  const [metricsData, setMetricsData] = useState<any[]>([]);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/user/${type}/${id}/metrics?timeframe=${timeframe}`);
      const data = await res.json();

      if (res.ok) {
        if (type === "vps") {
          setMetricsData(formatData(data.data));
        } else {
          // For K3s, if there are multiple nodes, we can aggregate or show the first one for simplicity
          // Currently, let's just show the first node's metrics to emulate CloudWatch
          if (data.nodes && data.nodes.length > 0) {
            setMetricsData(formatData(data.nodes[0].data));
          } else {
            setMetricsData([]);
          }
        }
      } else {
        toast.error(data.error || "Failed to fetch metrics");
      }
    } catch (err) {
      toast.error("An error occurred while fetching metrics");
    } finally {
      setLoading(false);
    }
  };

  const formatData = (rawData: any[]) => {
    if (!Array.isArray(rawData)) return [];

    return rawData.map(point => {
      const date = new Date(point.time * 1000);
      return {
        time: timeframe === "hour" ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit' }),
        cpu: point.cpu ? (point.cpu * 100).toFixed(2) : 0,
        memory: point.maxmem && point.mem ? ((point.mem / point.maxmem) * 100).toFixed(2) : 0,
        netin: point.netin ? (point.netin / (1024 * 1024)).toFixed(2) : 0, // MB
        netout: point.netout ? (point.netout / (1024 * 1024)).toFixed(2) : 0, // MB
        diskread: point.diskread ? (point.diskread / (1024 * 1024)).toFixed(2) : 0, // MB
        diskwrite: point.diskwrite ? (point.diskwrite / (1024 * 1024)).toFixed(2) : 0, // MB
      };
    }).filter(p => p.cpu !== 0 || p.memory !== 0); // Filter out empty initial points
  };

  useEffect(() => {
    fetchMetrics();

    // Auto refresh every 1 minute if timeframe is hour
    let interval: any;
    if (timeframe === "hour") {
      interval = setInterval(fetchMetrics, 60000);
    }
    return () => clearInterval(interval);
  }, [timeframe]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={cn("bg-black/90 border p-3 rounded-lg shadow-sm", isDark ? "border-white/10" : "border-slate-200")}>
          <p className="text-white/70 text-xs mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm font-medium">
              {entry.name}: {entry.value} {entry.unit}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = (title: string, icon: any, dataKey1: string, dataKey2: string | null, color1: string, color2: string | null, unit: string) => (
    <div className={cn("border rounded-2xl p-6 shadow-md", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h3 className={cn("font-medium", isDark ? "text-white" : "text-slate-900")}>{title}</h3>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color1 }}></div>
            <span className={cn("text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>{dataKey1 === 'cpu' ? 'CPU' : dataKey1 === 'memory' ? 'Memory' : dataKey1 === 'netin' ? 'Download' : 'Read'}</span>
          </div>
          {dataKey2 && color2 && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color2 }}></div>
              <span className={cn("text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>{dataKey2 === 'netout' ? 'Upload' : 'Write'}</span>
            </div>
          )}
        </div>
      </div>

      <div className="h-[250px] w-full">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <RefreshCw className="w-6 h-6 text-cyan-500 animate-spin" />
          </div>
        ) : metricsData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-white/40 text-sm">No data available. Try adjusting the timeframe.</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={metricsData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`color${dataKey1}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color1} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color1} stopOpacity={0} />
                </linearGradient>
                {dataKey2 && color2 && (
                  <linearGradient id={`color${dataKey2}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color2} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color2} stopOpacity={0} />
                  </linearGradient>
                )}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="time" stroke="#334155" tick={{ fill: '#64748b', fontSize: 11 }} minTickGap={30} />
              <YAxis stroke="#334155" tick={{ fill: '#64748b', fontSize: 11 }} width={90} tickFormatter={(val) => `${val} ${unit}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }} 
              />
              <Area type="monotone" dataKey={dataKey1} stroke={color1} strokeWidth={2} fillOpacity={1} fill={`url(#color${dataKey1})`} unit={unit} name={dataKey1 === 'cpu' ? 'CPU' : dataKey1 === 'memory' ? 'Memory' : dataKey1 === 'netin' ? 'Download' : 'Read'} />
              {dataKey2 && color2 && (
                <Area type="monotone" dataKey={dataKey2} stroke={color2} strokeWidth={2} fillOpacity={1} fill={`url(#color${dataKey2})`} unit={unit} name={dataKey2 === 'netout' ? 'Upload' : 'Write'} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-6">
      <div>
        <Link href="/dashboard/alerts" className={cn("inline-flex items-center gap-2 text-sm font-medium hover:text-white transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}>
          <ArrowLeft className="w-4 h-4" />
          Back to Alerts
        </Link>
      </div>

      {/* Hero Header */}
      <div className={cn("relative overflow-hidden rounded-3xl border p-6 md:p-8 group shadow-sm", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 tracking-wide border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-100 border-cyan-200 text-cyan-700")}>
              <Activity className="w-3 h-3" /> Resource Telemetry
            </div>
            <h1 className={cn("text-3xl md:text-4xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              CloudWatch <span className={cn(isDark ? "text-cyan-400" : "text-cyan-600")}>Metrics</span>
            </h1>
            <p className={cn("text-sm max-w-md", isDark ? "text-zinc-400" : "text-slate-500")}>Real-time and historical resource telemetry for your instances.</p>
          </div>

          <div className={cn("flex items-center gap-2 bg-white/5 p-1 rounded-xl border", isDark ? "border-white/10" : "border-slate-200")}>
            {[
              { id: "hour", label: "1H" },
              { id: "day", label: "1D" },
              { id: "week", label: "1W" },
              { id: "month", label: "1M" },
            ].map(tf => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${timeframe === tf.id
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
              >
                {tf.label}
              </button>
            ))}

            <button
              onClick={fetchMetrics}
              disabled={loading}
              className="px-3 py-2 text-white/60 hover:text-white transition-colors ml-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderChart("CPU Usage (%)", Activity, "cpu", null, "#22d3ee", null, "%")}
        {renderChart("Memory Used (%)", MemoryStick, "memory", null, "#8b5cf6", null, "%")}
        {renderChart("Network Speed", Network, "netin", "netout", "#34d399", "#818cf8", "MB/s")}
        {renderChart("Disk I/O", HardDrive, "diskread", "diskwrite", "#34d399", "#fb923c", "MB/s")}
      </div>
    </div>
  );
}