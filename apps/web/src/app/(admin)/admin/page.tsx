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
    <div className="w-full h-full flex flex-col gap-6 max-w-[1600px] mx-auto pb-8 z-10 relative">
      
      {/* Top Welcome Title */}
      {/* Top Welcome Title */}
      <div className="flex items-center justify-between mb-2">
        <h1 className={cn("text-3xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Dashboard Overview</h1>
        <div className={cn("text-sm hidden sm:block", isDark ? "text-zinc-400" : "text-slate-500")}>Welcome back to your control center</div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Main Column (Left and Center) - 8 cols */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          
          {/* Main Chart Card (Like Balance Summary in ref) */}
          <div className={cn("backdrop-blur-md rounded-3xl border p-6 relative overflow-hidden group", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
            {/* Inner Glows */}
            <div className={cn("absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] pointer-events-none group-hover:bg-cyan-500/20 transition-all duration-700", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")} />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-600/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-cyan-600/20 transition-all duration-700" />
            
            <div className="relative z-10 h-[350px] sm:h-[400px] w-full">
              <VisitorChart />
            </div>
          </div>

          {/* Bottom Grid for Secondary Widgets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Abstract Pie Chart Widget Placeholder */}
            <div className={cn("backdrop-blur-md rounded-3xl border p-6 flex flex-col justify-between relative overflow-hidden group hover:border-slate-700 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
              
              <div className="relative z-10 flex items-center justify-between mb-8">
                <h2 className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-900")}>Content Distribution</h2>
                <div className={cn("p-2 rounded-lg border", isDark ? "border-slate-800 bg-[#060b14]" : "border-slate-200 bg-slate-50")}>
                  <PieChart className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-700")} />
                </div>
              </div>
              
              <div className="relative z-10 flex-1 flex items-center justify-center min-h-[160px]">
                 {/* Visual Mock of the Donut Chart from the reference */}
                 <div className="relative w-40 h-40">
                   <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 overflow-visible">
                     <circle cx="50" cy="50" r="40" fill="transparent" stroke={isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"} strokeWidth="12" />
                     {/* cyan segment */}
                     <circle cx="50" cy="50" r="40" fill="transparent" stroke="#22d3ee" strokeWidth="12" strokeDasharray="251.2" strokeDashoffset="60" />
                     {/* purple segment */}
                     <circle cx="50" cy="50" r="40" fill="transparent" stroke="#06b6d4" strokeWidth="12" strokeDasharray="251.2" strokeDashoffset="200" />
                   </svg>
                   <div className="absolute inset-0 flex items-center justify-center flex-col">
                     <span className={cn("text-2xl font-extrabold", isDark ? "text-white" : "text-slate-900")}>{stats.totalPosts + stats.totalProjects}</span>
                     <span className={cn("text-[10px]", isDark ? "text-zinc-400" : "text-slate-500")}>Total Items</span>
                   </div>
                 </div>
              </div>
              <div className="relative z-10 flex items-center justify-center gap-6 mt-6">
                 <div className={cn("flex items-center gap-2 text-xs font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-400"></div> Projects
                 </div>
                 <div className={cn("flex items-center gap-2 text-xs font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-600"></div> Blog Posts
                 </div>
               </div>
            </div>

            {/* Quick Actions / Balance Widget Placeholder */}
            <div className={cn("rounded-3xl border p-6 relative overflow-hidden group hover:border-slate-700 transition-colors", isDark ? "border-slate-800/80 bg-[#0b1322] shadow-md" : "bg-white border-slate-200 shadow-sm")}>
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none" />
               <div className="relative z-10 flex items-center justify-between mb-6">
                <h2 className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-900")}>Quick Overview</h2>
                <div className={cn("w-8 h-8 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20", isDark ? "text-cyan-400" : "text-cyan-700")}>
                  <Activity className="w-4 h-4" />
                </div>
              </div>

              <div className="relative z-10 space-y-5 mt-4">
                <Link href="/admin/messages" className="flex items-end gap-3 group/msg cursor-pointer">
                  <div className={cn("text-5xl font-black tracking-tighter group-hover/msg:text-cyan-500 transition-colors", isDark ? "text-white" : "text-slate-900")}>{stats.unreadMessages}</div>
                  <div className={cn("text-sm font-medium mb-2 flex items-center gap-1 group-hover/msg:underline", isDark ? "text-cyan-400" : "text-cyan-700")}>
                    <ArrowUpRight className="w-3 h-3" /> Unread Messages
                  </div>
                </Link>

                <div className={cn("space-y-3 pt-6 border-t", isDark ? "border-slate-800/80" : "border-slate-200")}>
                  <Link href="/admin/portfolio/edit/new" className={cn("w-full flex items-center justify-between p-3.5 rounded-2xl transition-colors border group/link", isDark ? "bg-[#060b14] hover:bg-slate-800/50 border-slate-800" : "bg-slate-50 hover:bg-slate-100 border-slate-200")}>
                    <div className="flex items-center gap-3">
                      <FolderGit2 className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-700")} />
                      <span className={cn("text-sm font-bold transition-colors", isDark ? "text-zinc-200 group-hover/link:text-white" : "text-slate-700 group-hover/link:text-slate-900")}>New Project</span>
                    </div>
                    <ExternalLink className={cn("w-3 h-3 text-zinc-500 group-hover/link: transition-colors", isDark ? "text-cyan-400" : "text-cyan-700")} />
                  </Link>
                  <Link href="/admin/blog" className={cn("w-full flex items-center justify-between p-3.5 rounded-2xl transition-colors border group/link", isDark ? "bg-[#060b14] hover:bg-slate-800/50 border-slate-800" : "bg-slate-50 hover:bg-slate-100 border-slate-200")}>
                    <div className="flex items-center gap-3">
                      <FileText className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-700")} />
                      <span className={cn("text-sm font-bold transition-colors", isDark ? "text-zinc-200 group-hover/link:text-white" : "text-slate-700 group-hover/link:text-slate-900")}>Write Article</span>
                    </div>
                    <ExternalLink className={cn("w-3 h-3 text-zinc-500 group-hover/link: transition-colors", isDark ? "text-cyan-400" : "text-cyan-700")} />
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Right Side Column - 4 cols */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          
          {/* Vertical Metric Cards (Like Income/Expense in ref) */}
          <div className={cn("backdrop-blur-xl rounded-3xl border p-6 relative overflow-hidden group transition-colors", isDark ? "bg-[#0b1322] border-cyan-500/30 hover:border-cyan-400/50 shadow-md" : "bg-white border-cyan-200 hover:border-cyan-400 shadow-sm")}>
            <div className={cn("absolute right-0 top-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-[50px] pointer-events-none group-hover:bg-cyan-500/20 transition-all duration-500", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")} />
            <div className="relative z-10 flex justify-between items-center">
              <div>
                <div className={cn("text-[10px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1", isDark ? "text-zinc-400" : "text-slate-500")}>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span> Live Reach
                </div>
                <div className={cn("text-3xl font-black tracking-tight", isDark ? "text-white" : "text-[#0F3B4A]")}>{formatCompact(stats.totalViews)}</div>
                <div className={cn("text-xs font-medium mt-2 flex items-center gap-1 w-fit px-2 py-1 rounded-full border", isDark ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" : "text-cyan-700 bg-cyan-50 border-cyan-200")}>
                  <ArrowUpRight className="w-3 h-3" /> Total Organic Views
                </div>
              </div>
              <div className={cn("w-14 h-14 rounded-2xl border flex items-center justify-center rotate-3 group-hover:-rotate-3 transition-transform", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                <Users className={cn("w-6 h-6", isDark ? "text-cyan-400" : "text-cyan-700")} />
              </div>
            </div>
          </div>

          <Link href="/admin/portfolio" className={cn("backdrop-blur-xl rounded-3xl border p-6 relative overflow-hidden group hover:border-cyan-500/30 transition-colors block cursor-pointer", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
             <div className={cn("absolute right-0 top-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-[50px] pointer-events-none group-hover:bg-cyan-600/20 transition-all duration-500", isDark ? "bg-cyan-600/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")} />
             <div className="relative z-10 flex justify-between items-center">
              <div>
                <div className={cn("text-[10px] font-semibold uppercase tracking-wider mb-2", isDark ? "text-zinc-400" : "text-slate-500")}>Portfolio</div>
                <div className={cn("text-3xl font-black tracking-tight", isDark ? "text-white" : "text-[#0F3B4A]")}>{formatCompact(stats.totalProjects)}</div>
                <div className={cn("text-xs font-medium mt-2 flex items-center gap-1", isDark ? "text-zinc-400" : "text-slate-500")}>
                  Live Projects
                </div>
              </div>
              <div className={cn("w-14 h-14 rounded-full border flex items-center justify-center relative group-hover:border-cyan-500/30 transition-colors", isDark ? "border-slate-800 bg-[#060b14]" : "border-slate-200 bg-slate-50")}>
                 <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                   <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeDasharray="75, 100" />
                 </svg>
                 <FolderGit2 className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-700")} />
              </div>
            </div>
          </Link>

          <Link href="/admin/blog" className={cn("backdrop-blur-xl rounded-3xl border p-6 relative overflow-hidden group hover:border-cyan-500/30 transition-colors block cursor-pointer", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
            <div className={cn("absolute right-0 top-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-[50px] pointer-events-none group-hover:bg-cyan-500/20 transition-all duration-500", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")} />
             <div className="relative z-10 flex justify-between items-center">
              <div>
                <div className={cn("text-[10px] font-semibold uppercase tracking-wider mb-2", isDark ? "text-zinc-400" : "text-slate-500")}>Blog</div>
                <div className={cn("text-3xl font-black tracking-tight", isDark ? "text-white" : "text-[#0F3B4A]")}>{formatCompact(stats.totalPosts)}</div>
                <div className={cn("text-xs font-medium mt-2 flex items-center gap-1", isDark ? "text-zinc-400" : "text-slate-500")}>
                  Published Articles
                </div>
              </div>
              <div className={cn("w-14 h-14 rounded-full border flex items-center justify-center relative group-hover:border-cyan-500/30 transition-colors", isDark ? "border-slate-800 bg-[#060b14]" : "border-slate-200 bg-slate-50")}>
                 <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                   <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeDasharray="45, 100" />
                 </svg>
                 <FileText className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-700")} />
              </div>
            </div>
          </Link>

          {/* Online Users Widget */}
          <OnlineUsersWidget />

          {/* Contacts / Activity List (Like Contacts in ref) */}
          <div className={cn("backdrop-blur-xl rounded-3xl border p-6 flex-1 flex flex-col min-h-[350px]", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-900")}>Recent Messages</h2>
                <div className={cn("text-[10px] mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>You have {stats.unreadMessages} unread messages</div>
              </div>
              <Link href="/admin/messages" className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-colors border", isDark ? "text-zinc-300 border-slate-800 bg-[#060b14] hover:bg-slate-800" : "text-slate-600 border-slate-200 bg-slate-50 hover:bg-slate-100")}>
                <Plus className="w-4 h-4" />
              </Link>
            </div>

            <div className="space-y-4 flex-1">
               {recentMessages.length === 0 ? (
                 <div className="flex-1 flex items-center justify-center flex-col text-zinc-500 h-[200px]">
                   <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                   <div className="text-sm">No messages found</div>
                 </div>
               ) : (
                 recentMessages.map((msg, idx) => {
                   // Generate consistent colors based on index
                   const colors = [
                     isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200",
                     isDark ? "bg-cyan-600/10 text-cyan-500 border-cyan-600/20" : "bg-cyan-100 text-cyan-800 border-cyan-300"
                   ];
                   const colorClass = colors[idx % colors.length];
                   
                   return (
                     <Link key={msg.id} href="/admin/messages" className={cn("flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer group", isDark ? "bg-[#060b14] hover:bg-slate-800/50 border-slate-800" : "bg-slate-50 hover:bg-slate-100 border-slate-200")}>
                       <div className="flex items-center gap-4 truncate">
                         {msg.name === "System Notification" ? (
                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/25" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
                              {msg.subject?.toLowerCase().includes("top up") || msg.subject?.toLowerCase().includes("payment") ? <Wallet className="w-5 h-5" /> : msg.subject?.toLowerCase().includes("user") ? <UserPlus className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                            </div>
                         ) : (
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border shrink-0 ${colorClass}`}>
                             {msg.name?.substring(0, 2).toUpperCase() || 'AN'}
                           </div>
                         )}
                         <div className="truncate pr-4">
                           <div className={cn("text-sm font-bold transition-colors truncate", isDark ? "text-zinc-200 group-hover:text-white" : "text-slate-800 group-hover:text-slate-900")}>{msg.name}</div>
                           <div className="text-[11px] text-zinc-500 truncate mt-0.5">{msg.subject || 'No Subject'}</div>
                         </div>
                       </div>
                       <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 group-hover:bg-cyan-500 group-hover:text-white transition-all", isDark ? "text-zinc-400" : "text-slate-500")}>
                         <ArrowUpRight className="w-4 h-4" />
                       </div>
                     </Link>
                   );
                 })
               )}
            </div>
            
            <div className={cn("mt-4 pt-4 border-t text-center", isDark ? "border-slate-800/80" : "border-slate-200")}>
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
