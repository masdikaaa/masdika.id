"use client";
import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";
import { Users, FileText, FolderGit2, ArrowUpRight, Activity, PieChart, ExternalLink, MessageSquare, Plus , LayoutDashboard, Wallet, Bell, UserPlus } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import Link from "next/link";
import { toast } from "sonner";
import dynamic from "next/dynamic";
const VisitorChart = dynamic(() => import("@/components/admin/VisitorChart").then(mod => mod.VisitorChart), { ssr: false });
import { OnlineUsersWidget } from "@/components/admin/OnlineUsersWidget";
import { formatCompact } from "@/lib/utils";

export default function AdminDashboard() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalPosts: 0,
    unreadMessages: 0,
    totalViews: 0
  });
  
  const [recentMessages, setRecentMessages] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setStats(data);
        }
      })
      .catch(err => {
        toast.error("Failed to load dashboard stats");
      });
      
    fetch('/api/admin/messages?limit=4')
      .then(res => res.json())
      .then(data => {
        if (!data.error && Array.isArray(data)) {
          setRecentMessages(data);
        }
      })
      .catch(err => {
        console.error("Failed to load recent messages", err);
      });
  }, []);

  return (
    <div className="w-full h-full flex flex-col gap-5 max-w-[1600px] mx-auto pb-8 z-10 relative">
      
      {/* Top Welcome Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-white/[0.06]">
        <div>
          <h1 className={cn("text-xl sm:text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>Dashboard Overview</h1>
          <p className={cn("text-xs sm:text-sm mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>Welcome back to your control center</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        
        {/* Main Column (Left and Center) - 8 cols */}
        <div className="xl:col-span-8 flex flex-col gap-5">
          
          {/* Main Chart Card */}
          <div className={cn("backdrop-blur-md rounded-2xl border p-4 sm:p-5 relative overflow-hidden group", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-sm" : "bg-white border-slate-200 shadow-sm")}>
            {/* Inner Glows */}
            <div className={cn("absolute top-0 right-0 w-56 h-56 rounded-full blur-[80px] pointer-events-none group-hover:bg-cyan-500/15 transition-all duration-700", isDark ? "bg-cyan-500/10" : "bg-cyan-50")} />
            <div className="absolute bottom-0 left-0 w-56 h-56 bg-cyan-600/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-cyan-600/15 transition-all duration-700" />
            
            <div className="relative z-10 h-[310px] sm:h-[340px] w-full">
              <VisitorChart />
            </div>
          </div>

          {/* Bottom Grid for Secondary Widgets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Abstract Pie Chart Widget */}
            <div className={cn("backdrop-blur-md rounded-2xl border p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group hover:border-cyan-500/30 transition-colors", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-sm" : "bg-white border-slate-200 shadow-sm")}>
              
              <div className="relative z-10 flex items-center justify-between mb-4">
                <h2 className={cn("text-sm font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>Content Distribution</h2>
                <div className={cn("w-8 h-8 rounded-lg border flex items-center justify-center", isDark ? "border-white/[0.08] bg-[#0a0a0c]" : "border-slate-200 bg-slate-50")}>
                  <PieChart className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-700")} />
                </div>
              </div>
              
              <div className="relative z-10 flex-1 flex items-center justify-center min-h-[140px]">
                 <div className="relative w-32 h-32">
                   <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 overflow-visible">
                     <circle cx="50" cy="50" r="40" fill="transparent" stroke={isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"} strokeWidth="12" />
                     <circle cx="50" cy="50" r="40" fill="transparent" stroke="#22d3ee" strokeWidth="12" strokeDasharray="251.2" strokeDashoffset="60" />
                     <circle cx="50" cy="50" r="40" fill="transparent" stroke="#06b6d4" strokeWidth="12" strokeDasharray="251.2" strokeDashoffset="200" />
                   </svg>
                   <div className="absolute inset-0 flex items-center justify-center flex-col">
                     <span className={cn("text-xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{stats.totalPosts + stats.totalProjects}</span>
                     <span className={cn("text-[10px] font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Total Items</span>
                   </div>
                 </div>
              </div>
              <div className="relative z-10 flex items-center justify-center gap-5 mt-4">
                 <div className={cn("flex items-center gap-1.5 text-[11px] font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
                    <div className="w-2 h-2 rounded-full bg-cyan-400"></div> Projects
                 </div>
                 <div className={cn("flex items-center gap-1.5 text-[11px] font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
                    <div className="w-2 h-2 rounded-full bg-cyan-600"></div> Blog Posts
                 </div>
               </div>
            </div>

            {/* Quick Actions Widget */}
            <div className={cn("rounded-2xl border p-4 sm:p-5 relative overflow-hidden group hover:border-cyan-500/30 transition-colors", isDark ? "border-white/[0.08] bg-[#0c0c0e] shadow-sm" : "bg-white border-slate-200 shadow-sm")}>
               <div className="relative z-10 flex items-center justify-between mb-4">
                <h2 className={cn("text-sm font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>Quick Overview</h2>
                <div className={cn("w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20", isDark ? "text-cyan-400" : "text-cyan-700")}>
                  <Activity className="w-4 h-4" />
                </div>
              </div>

              <div className="relative z-10 space-y-4 mt-2">
                <Link href="/admin/messages" className="flex items-end gap-2.5 group/msg cursor-pointer">
                  <div className={cn("text-xl sm:text-2xl font-bold tracking-tight group-hover/msg:text-cyan-500 transition-colors", isDark ? "text-white" : "text-slate-900")}>{stats.unreadMessages}</div>
                  <div className={cn("text-xs font-medium mb-1 flex items-center gap-1 group-hover/msg:underline", isDark ? "text-cyan-400" : "text-cyan-700")}>
                    <ArrowUpRight className="w-3 h-3" /> Unread Messages
                  </div>
                </Link>

                <div className={cn("space-y-2.5 pt-4 border-t", isDark ? "border-white/[0.06]" : "border-slate-200")}>
                  <Link href="/admin/portfolio/edit/new" className={cn("w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors border group/link", isDark ? "bg-[#0a0a0c] hover:bg-white/[0.04] border-white/[0.08]" : "bg-slate-50 hover:bg-slate-100 border-slate-200")}>
                    <div className="flex items-center gap-2.5">
                      <FolderGit2 className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-700")} />
                      <span className={cn("text-xs font-semibold transition-colors", isDark ? "text-zinc-200 group-hover/link:text-white" : "text-slate-700 group-hover/link:text-slate-900")}>New Project</span>
                    </div>
                    <ExternalLink className={cn("w-3.5 h-3.5 transition-colors", isDark ? "text-cyan-400" : "text-cyan-700")} />
                  </Link>
                  <Link href="/admin/blog" className={cn("w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors border group/link", isDark ? "bg-[#0a0a0c] hover:bg-white/[0.04] border-white/[0.08]" : "bg-slate-50 hover:bg-slate-100 border-slate-200")}>
                    <div className="flex items-center gap-2.5">
                      <FileText className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-700")} />
                      <span className={cn("text-xs font-semibold transition-colors", isDark ? "text-zinc-200 group-hover/link:text-white" : "text-slate-700 group-hover/link:text-slate-900")}>Write Article</span>
                    </div>
                    <ExternalLink className={cn("w-3.5 h-3.5 transition-colors", isDark ? "text-cyan-400" : "text-cyan-700")} />
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Right Side Column - 4 cols */}
        <div className="xl:col-span-4 flex flex-col gap-4">
          
          {/* Vertical Metric Cards */}
          <div className={cn("backdrop-blur-xl rounded-2xl border p-4 sm:p-5 relative overflow-hidden group transition-colors", isDark ? "bg-[#0c0c0e] border-cyan-500/30 hover:border-cyan-400/50 shadow-sm" : "bg-white border-cyan-200 hover:border-cyan-400 shadow-sm")}>
            <div className={cn("absolute right-0 top-1/2 -translate-y-1/2 w-40 h-40 rounded-full blur-[50px] pointer-events-none group-hover:bg-cyan-500/15 transition-all duration-500", isDark ? "bg-cyan-500/10" : "bg-cyan-50")} />
            <div className="relative z-10 flex justify-between items-center">
              <div>
                <div className={cn("text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span> Live Reach
                </div>
                <div className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{formatCompact(stats.totalViews)}</div>
                <div className={cn("text-[11px] font-medium mt-1.5 flex items-center gap-1 w-fit px-2 py-0.5 rounded-full border", isDark ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" : "text-cyan-700 bg-cyan-50 border-cyan-200")}>
                  <ArrowUpRight className="w-3 h-3" /> Total Organic Views
                </div>
              </div>
              <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center transition-transform", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                <Users className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-700")} />
              </div>
            </div>
          </div>

          <Link href="/admin/portfolio" className={cn("backdrop-blur-xl rounded-2xl border p-4 sm:p-5 relative overflow-hidden group hover:border-cyan-500/30 transition-colors block cursor-pointer", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-sm" : "bg-white border-slate-200 shadow-sm")}>
             <div className={cn("absolute right-0 top-1/2 -translate-y-1/2 w-40 h-40 rounded-full blur-[50px] pointer-events-none group-hover:bg-cyan-600/15 transition-all duration-500", isDark ? "bg-cyan-600/10" : "bg-cyan-50")} />
             <div className="relative z-10 flex justify-between items-center">
              <div>
                <div className={cn("text-[10px] font-bold uppercase tracking-wider mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>Portfolio</div>
                <div className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{formatCompact(stats.totalProjects)}</div>
                <div className={cn("text-[11px] font-medium mt-1 flex items-center gap-1", isDark ? "text-zinc-400" : "text-slate-500")}>
                  Live Projects
                </div>
              </div>
              <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center relative group-hover:border-cyan-500/30 transition-colors", isDark ? "border-white/[0.08] bg-[#0a0a0c]" : "border-slate-200 bg-slate-50")}>
                 <FolderGit2 className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-700")} />
              </div>
            </div>
          </Link>

          <Link href="/admin/blog" className={cn("backdrop-blur-xl rounded-2xl border p-4 sm:p-5 relative overflow-hidden group hover:border-cyan-500/30 transition-colors block cursor-pointer", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-sm" : "bg-white border-slate-200 shadow-sm")}>
            <div className={cn("absolute right-0 top-1/2 -translate-y-1/2 w-40 h-40 rounded-full blur-[50px] pointer-events-none group-hover:bg-cyan-500/15 transition-all duration-500", isDark ? "bg-cyan-500/10" : "bg-cyan-50")} />
             <div className="relative z-10 flex justify-between items-center">
              <div>
                <div className={cn("text-[10px] font-bold uppercase tracking-wider mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>Blog</div>
                <div className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{formatCompact(stats.totalPosts)}</div>
                <div className={cn("text-[11px] font-medium mt-1 flex items-center gap-1", isDark ? "text-zinc-400" : "text-slate-500")}>
                  Published Articles
                </div>
              </div>
              <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center relative group-hover:border-cyan-500/30 transition-colors", isDark ? "border-white/[0.08] bg-[#0a0a0c]" : "border-slate-200 bg-slate-50")}>
                 <FileText className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-700")} />
              </div>
            </div>
          </Link>

          {/* Online Users Widget */}
          <OnlineUsersWidget />

          {/* Contacts / Activity List */}
          <div className={cn("backdrop-blur-xl rounded-2xl border p-4 sm:p-5 flex-1 flex flex-col", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-sm" : "bg-white border-slate-200 shadow-sm")}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className={cn("text-sm font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>Recent Messages</h2>
                <div className={cn("text-[11px] mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>You have {stats.unreadMessages} unread messages</div>
              </div>
              <Link href="/admin/messages" className={cn("w-7 h-7 rounded-lg flex items-center justify-center transition-colors border", isDark ? "text-zinc-300 border-white/[0.08] bg-[#0a0a0c] hover:bg-white/[0.05]" : "text-slate-600 border-slate-200 bg-slate-50 hover:bg-slate-100")}>
                <Plus className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-2.5 flex-1">
               {recentMessages.length === 0 ? (
                 <div className="flex-1 flex items-center justify-center flex-col text-zinc-500 h-[160px]">
                   <MessageSquare className="w-6 h-6 mb-1.5 opacity-50" />
                   <div className="text-xs">No messages found</div>
                 </div>
               ) : (
                 recentMessages.map((msg, idx) => {
                   const colors = [
                     isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200",
                     isDark ? "bg-cyan-600/10 text-cyan-500 border-cyan-600/20" : "bg-cyan-100 text-cyan-800 border-cyan-300"
                   ];
                   const colorClass = colors[idx % colors.length];
                   
                   return (
                     <Link key={msg.id} href="/admin/messages" className={cn("flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer group", isDark ? "bg-[#0a0a0c] hover:bg-white/[0.04] border-white/[0.08]" : "bg-slate-50 hover:bg-slate-100 border-slate-200")}>
                       <div className="flex items-center gap-3 truncate">
                         {msg.name === "System Notification" ? (
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/25" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
                              {msg.subject?.toLowerCase().includes("top up") || msg.subject?.toLowerCase().includes("payment") ? <Wallet className="w-4 h-4" /> : msg.subject?.toLowerCase().includes("user") ? <UserPlus className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                            </div>
                         ) : (
                           <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border shrink-0 ${colorClass}`}>
                             {msg.name?.substring(0, 2).toUpperCase() || 'AN'}
                           </div>
                         )}
                         <div className="truncate pr-2">
                           <div className={cn("text-xs font-semibold transition-colors truncate", isDark ? "text-zinc-200 group-hover:text-white" : "text-slate-800 group-hover:text-slate-900")}>{msg.name}</div>
                           <div className="text-[10px] text-zinc-500 truncate mt-0.5">{msg.subject || 'No Subject'}</div>
                         </div>
                       </div>
                       <div className={cn("w-6 h-6 rounded-md flex items-center justify-center shrink-0 group-hover:bg-cyan-500 group-hover:text-white transition-all", isDark ? "text-zinc-400" : "text-slate-500")}>
                         <ArrowUpRight className="w-3.5 h-3.5" />
                       </div>
                     </Link>
                   );
                 })
               )}
            </div>
            
            <div className={cn("mt-3 pt-3 border-t text-center", isDark ? "border-white/[0.06]" : "border-slate-200")}>
               <Link href="/admin/messages" className={cn("text-xs font-semibold hover:text-cyan-300 transition-colors flex items-center justify-center gap-1", isDark ? "text-cyan-400" : "text-cyan-700")}>
                 View all messages <ArrowUpRight className="w-3 h-3" />
               </Link>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
