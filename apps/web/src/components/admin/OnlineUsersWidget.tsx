"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { Users, Wifi, ChevronLeft, ChevronRight } from "lucide-react";
import { useRealtimePresence } from "@/lib/useRealtimePresence";

function getRelativeTime(dateString: string) {
  const diffInSeconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
  if (diffInSeconds < 60) return "Active now";
  return `${Math.floor(diffInSeconds / 60)}m ago`;
}

export function OnlineUsersWidget() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { onlineUsers, isConnected } = useRealtimePresence();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Re-render relative time every 10 seconds in real-time
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => (t + 1) % 1000000);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const totalPages = Math.max(1, Math.ceil(onlineUsers.length / itemsPerPage));
  const displayedUsers = onlineUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className={cn("backdrop-blur-xl rounded-2xl border p-4 sm:p-5 relative overflow-hidden group hover:border-cyan-500/30 transition-colors", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-sm" : "bg-white border-slate-200 shadow-sm")}>
      <div className={cn("absolute right-0 top-1/2 -translate-y-1/2 w-40 h-40 rounded-full blur-[50px] pointer-events-none group-hover:bg-emerald-500/10 transition-all duration-500", isDark ? "bg-emerald-500/5 border-emerald-500/10" : "bg-emerald-50 border-emerald-200")} />
      
      <div className="relative z-10 flex items-center justify-between mb-4">
        <div>
          <h2 className={cn("text-sm font-bold tracking-tight flex items-center gap-1.5", isDark ? "text-white" : "text-slate-900")}>
            <Wifi className={cn("w-3.5 h-3.5 text-emerald-500", isConnected && "animate-pulse")} />
            Online Users
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          </h2>
          <div className={cn("text-[11px] mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>Real-time live presence</div>
        </div>
        <div className={cn("px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5", isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200")}>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {onlineUsers.length} Online
        </div>
      </div>

      <div className="relative z-10 flex flex-col min-h-[170px]">
        {onlineUsers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 my-auto">
            <div className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center mb-2.5 border",
              isDark ? "bg-white/[0.03] border-white/[0.06] text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-400"
            )}>
              <Users className="w-4 h-4 opacity-70" />
            </div>
            <p className={cn("text-xs font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>
              No users online right now
            </p>
            <p className={cn("text-[10px] mt-0.5", isDark ? "text-zinc-600" : "text-slate-400")}>
              Active user sessions will appear here in real-time
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 flex-1">
            {displayedUsers.map((user) => (
              <Link
                key={user.id}
                href={`/admin/customers/${user.id}`}
                className={cn(
                  "flex items-center justify-between gap-2.5 p-2 rounded-xl transition-all border group/user cursor-pointer",
                  isDark
                    ? "hover:bg-white/[0.06] border-transparent hover:border-cyan-500/30"
                    : "hover:bg-cyan-50/60 border-transparent hover:border-cyan-200"
                )}
                title={`View ${user.name}'s customer profile`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="relative shrink-0">
                    {user.image ? (
                      <img src={user.image} alt={user.name} className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className={cn("w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px]", isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600")}>
                        {user.name?.substring(0, 2).toUpperCase() || 'US'}
                      </div>
                    )}
                    <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white dark:border-[#0c0c0e]"></div>
                  </div>
                  <div className="flex flex-col truncate min-w-0">
                    <span className={cn(
                      "text-xs font-semibold truncate transition-colors",
                      isDark ? "text-zinc-200 group-hover/user:text-cyan-400" : "text-slate-800 group-hover/user:text-cyan-700"
                    )}>
                      {user.name}
                    </span>
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={cn("text-[10px] truncate", isDark ? "text-zinc-500" : "text-slate-500")}>{user.email}</span>
                      <span className={cn("text-[9px] px-1.5 rounded-full border shrink-0", isDark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700")}>
                        {getRelativeTime(user.lastActive)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={cn(
                  "opacity-0 group-hover/user:opacity-100 transition-all transform translate-x-1 group-hover/user:translate-x-0 p-1 rounded-lg shrink-0",
                  isDark ? "text-cyan-400" : "text-cyan-600"
                )}>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className={cn("relative z-10 flex items-center justify-between mt-4 pt-4 border-t", isDark ? "border-white/[0.08]" : "border-slate-200")}>
          <div className={cn("text-[10px]", isDark ? "text-zinc-500" : "text-slate-500")}>
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={cn("p-1 rounded-md transition-colors", currentPage === 1 ? "opacity-30 cursor-not-allowed" : isDark ? "hover:bg-white/10 text-white" : "hover:bg-slate-100 text-slate-700")}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={cn("p-1 rounded-md transition-colors", currentPage === totalPages ? "opacity-30 cursor-not-allowed" : isDark ? "hover:bg-white/10 text-white" : "hover:bg-slate-100 text-slate-700")}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
