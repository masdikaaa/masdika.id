'use client';

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { motion, Variants } from "framer-motion";
import { Activity, Key, FolderDot, ArrowUpRight, Loader2, BarChart2, RefreshCw } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";

const COLORS = ["#06b6d4", "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b"];

export default function ApiStatsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/dashboard/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch API stats", error);
    } finally {
      setLoading(false);
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center">
        <RefreshCw className="w-10 h-10 text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={cn("flex flex-col items-center justify-center min-h-[60vh] border rounded-3xl backdrop-blur-sm m-4", isDark ? "bg-white/[0.02]/40 border-white/5" : "bg-white border-slate-200")}>
        <Activity className="w-16 h-16 text-cyan-500/50 mb-6 animate-pulse" />
        <h2 className={cn("text-2xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No Data Available</h2>
        <p className={cn("text-center max-w-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Create an API Key and start making requests to see your API statistics here.</p>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6 pb-10"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hero Header */}
      <motion.div variants={itemVariants} className={cn("relative overflow-hidden rounded-3xl backdrop-blur-sm border p-6 md:p-8 group shadow-sm", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200")}>
        
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 tracking-wide border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-100 border-cyan-200 text-cyan-700")}>
              <BarChart2 className="w-3 h-3" /> Analytics Engine
            </div>
            <h1 className={cn("text-3xl md:text-4xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              API <span className={cn(isDark ? "text-cyan-400" : "text-cyan-600")}>Statistics</span>
            </h1>
            <p className={cn("text-sm max-w-md", isDark ? "text-zinc-400" : "text-slate-500")}>Monitor your API usage, performance, and key metrics across all projects in real-time.</p>
          </div>
          <div className="flex items-center gap-2 px-5 py-2.5 bg-[#011627]/80 backdrop-blur-md text-cyan-400 rounded-2xl border border-cyan-500/20 text-sm font-bold shadow-[0_0_20px_rgba(6,182,212,0.15)]">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
            Live Metrics Active
          </div>
        </div>
      </motion.div>

      {/* Stats Grid - Bento Style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className={cn("backdrop-blur-sm border p-6 rounded-3xl shadow-sm relative overflow-hidden group hover:border-cyan-500/30 hover:-translate-y-1 transition-all duration-300", isDark ? "bg-white/[0.02] border-white/5 hover:bg-white/[0.02]/80" : "bg-white border-slate-200 hover:bg-slate-50")}>
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all" />
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.15)] group-hover:shadow-[0_0_25px_rgba(6,182,212,0.3)] transition-all">
              <Activity className="w-6 h-6 text-cyan-400" />
            </div>
            <span className="flex items-center gap-1 text-[10px] font-black text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
              <ArrowUpRight className="w-3 h-3" /> Total
            </span>
          </div>
          <h3 className={cn("text-xs font-bold uppercase tracking-widest mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>Total API Requests</h3>
          <p className={cn("text-4xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>{stats.totalRequests.toLocaleString()}</p>
        </motion.div>

        <motion.div variants={itemVariants} className={cn("backdrop-blur-sm border p-6 rounded-3xl shadow-sm relative overflow-hidden group hover:border-cyan-500/30 hover:-translate-y-1 transition-all duration-300", isDark ? "bg-white/[0.02] border-white/5 hover:bg-white/[0.02]/80" : "bg-white border-slate-200 hover:bg-slate-50")}>
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all" />
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.15)] group-hover:shadow-[0_0_25px_rgba(168,85,247,0.3)] transition-all">
              <Key className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <h3 className={cn("text-xs font-bold uppercase tracking-widest mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>Active API Keys</h3>
          <div className="flex items-baseline gap-2">
            <p className={cn("text-4xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>{stats.activeKeys}</p>
            <p className={cn("text-sm font-semibold", isDark ? "text-zinc-500" : "text-slate-500")}>/ {stats.totalKeys}</p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className={cn("backdrop-blur-sm border p-6 rounded-3xl shadow-sm relative overflow-hidden group hover:border-blue-500/30 hover:-translate-y-1 transition-all duration-300", isDark ? "bg-white/[0.02] border-white/5 hover:bg-white/[0.02]/80" : "bg-white border-slate-200 hover:bg-slate-50")}>
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all" />
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.15)] group-hover:shadow-[0_0_25px_rgba(59,130,246,0.3)] transition-all">
              <FolderDot className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <h3 className={cn("text-xs font-bold uppercase tracking-widest mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>Projects Used</h3>
          <p className={cn("text-4xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>{stats.projectUsage.length}</p>
        </motion.div>
      </div>

      {/* Main Chart */}
      <motion.div variants={itemVariants} className={cn("backdrop-blur-sm border rounded-3xl p-6 md:p-8 shadow-md relative", isDark ? "bg-white/[0.02]/40 border-white/5" : "bg-white border-slate-200")}>
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none rounded-3xl" />
        <div className="relative z-10 mb-8">
          <h3 className={cn("text-xl font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
            Traffic Overview
            <span className={cn("text-xs font-semibold px-2 py-1 rounded-lg", isDark ? "bg-white/10 text-zinc-300" : "bg-slate-100 text-slate-500")}>Last 7 Days</span>
          </h3>
        </div>
        <div className="h-[350px] w-full relative z-10">
          <ResponsiveContainer width="99%" height={250}>
            <AreaChart data={stats.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <defs>
                <linearGradient id="themeLine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#06b6d4"/>
                  <stop offset="100%" stopColor="#3b82f6"/>
                </linearGradient>
                <linearGradient id="themeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.5}/>
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
              <XAxis dataKey="day" stroke="#ffffff40" tick={{ fill: '#ffffff60', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} dy={15} />
              <YAxis stroke="#ffffff40" tick={{ fill: '#ffffff60', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} dx={-15} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                itemStyle={{ color: '#06b6d4', fontWeight: 'bold' }}
                cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2, strokeDasharray: '5 5' }}
              />
              <Area type="monotone" dataKey="requests" stroke="url(#themeLine)" strokeWidth={4} fillOpacity={1} fill="url(#themeFill)" animationDuration={1500} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Grid for Pie and Bar charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={itemVariants} className={cn("backdrop-blur-sm border rounded-3xl p-6 md:p-8 shadow-sm", isDark ? "bg-white/[0.02]/40 border-white/5" : "bg-white border-slate-200")}>
          <h3 className={cn("text-lg font-bold mb-6 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>Usage by Project</h3>
          {stats.projectUsage.length > 0 ? (
            <div className="h-[300px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height={250} minWidth={1} minHeight={1}>
                <PieChart>
                  <Pie
                    data={stats.projectUsage}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={0}
                    dataKey="usage"
                    stroke="none"
                  >
                    {stats.projectUsage.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="outline-none" />
                    ))}
                  </Pie>
                  <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" className={cn("text-4xl font-black", isDark ? "fill-white" : "fill-slate-900")}>
                    {stats.projectUsage.length}
                  </text>
                  <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" className="fill-zinc-400 text-sm font-semibold">
                    Total Items
                  </text>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className={cn("h-[300px] flex items-center justify-center font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>
              No project usage data
            </div>
          )}
          {/* Custom Legend */}
          <div className="flex flex-wrap gap-4 justify-center mt-6 max-h-[120px] overflow-y-auto custom-scrollbar pr-2">
            {stats.projectUsage.map((entry: any, index: number) => (
              <div key={entry.name} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-xl border shrink-0", isDark ? "bg-white/5 border-white/5" : "bg-slate-50 border-slate-200")}>
                <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className={cn("text-xs font-bold", isDark ? "text-zinc-300" : "text-slate-700")}>{entry.name} <span className="opacity-50 font-normal">({entry.usage})</span></span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className={cn("backdrop-blur-sm border rounded-3xl p-6 md:p-8 shadow-sm", isDark ? "bg-white/[0.02]/40 border-white/5" : "bg-white border-slate-200")}>
          <h3 className={cn("text-lg font-bold mb-6 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>Top API Keys</h3>
          {stats.topKeys.length > 0 ? (
            <div className="h-[300px] w-full overflow-y-auto custom-scrollbar pr-2">
              <div style={{ height: Math.max(300, stats.topKeys.length * 50) }} className="w-full">
                <ResponsiveContainer width="100%" height={250} minWidth={1} minHeight={1}>
                  <BarChart data={stats.topKeys} layout="vertical" margin={{ top: 0, right: 20, left: 40, bottom: 0 }}>
                    <defs>
                      <linearGradient id="themeBar" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#06b6d4"/>
                        <stop offset="100%" stopColor="#3b82f6"/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" horizontal={false} />
                    <XAxis type="number" stroke="#ffffff40" tick={{ fill: '#ffffff60', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" stroke="#ffffff40" tick={{ fill: '#ffffff80', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} dx={-15} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                    />
                    <Bar dataKey="usage" fill="url(#themeBar)" radius={[0, 8, 8, 0]} barSize={24} animationDuration={1500} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className={cn("h-[300px] flex items-center justify-center font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>
              No API keys data
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}