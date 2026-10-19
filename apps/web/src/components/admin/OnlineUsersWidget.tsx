"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { Users, Wifi, ChevronLeft, ChevronRight } from "lucide-react";

function getRelativeTime(dateString: string) {
  const diffInSeconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
  if (diffInSeconds < 60) return "Just now";
  return `${Math.floor(diffInSeconds / 60)}m ago`;
}

export function OnlineUsersWidget() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchOnlineUsers = () => {
      fetch("/api/admin/online-users", { cache: "no-store" })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setOnlineUsers(data);
          }
        })
        .catch((err) => console.error("Failed to load online users:", err));
    };

    fetchOnlineUsers();
    // Also ping explicitly just in case layout didn't trigger it yet
    fetch('/api/user/ping', { method: 'POST' }).catch(() => {});

    const interval = setInterval(() => {
      fetchOnlineUsers();
      fetch('/api/user/ping', { method: 'POST' }).catch(() => {});
    }, 30000); // refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const totalPages = Math.ceil(onlineUsers.length / itemsPerPage);
  const displayedUsers = onlineUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className={cn("backdrop-blur-xl rounded-3xl border p-6 relative overflow-hidden group hover:border-cyan-500/30 transition-colors", isDark ? "bg-[#11162C]/80 border-white/5" : "bg-white border-slate-200")}>
      <div className={cn("absolute right-0 top-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-[50px] pointer-events-none group-hover:bg-emerald-500/10 transition-all duration-500", isDark ? "bg-emerald-500/5 border-emerald-500/10" : "bg-emerald-50 border-emerald-200")} />
      
      <div className="relative z-10 flex items-center justify-between mb-6">
        <div>
          <h2 className={cn("text-sm font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
            <Wifi className="w-4 h-4 text-emerald-500 animate-pulse" />
            Online Users
          </h2>
          <div className={cn("text-[10px] mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>Active in the last 5 minutes</div>
        </div>
        <div className={cn("px-3 py-1 rounded-full text-xs font-bold border", isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200")}>
          {onlineUsers.length} Online
        </div>
      </div>

      <div className="relative z-10 flex flex-col gap-3 min-h-[200px]">
        {onlineUsers.length === 0 ? (
          <div className={cn("text-sm text-center py-10", isDark ? "text-zinc-500" : "text-slate-500")}>No users online right now</div>
        ) : (
          <div className="flex flex-col gap-2 flex-1">
            {displayedUsers.map((user) => (
              <div key={user.id} className={cn("flex items-center gap-3 p-2 rounded-xl transition-colors border", isDark ? "hover:bg-white/5 border-transparent hover:border-white/5" : "hover:bg-slate-50 border-transparent hover:border-slate-100")}>
                <div className="relative">
                  {user.image ? (
                    <img src={user.image} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs", isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600")}>
                      {user.name?.substring(0, 2).toUpperCase() || 'US'}
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-[#0c0c0e]"></div>
                </div>
                <div className="flex flex-col truncate">
                  <span className={cn("text-sm font-semibold truncate", isDark ? "text-zinc-200" : "text-slate-800")}>{user.name}</span>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[10px] truncate", isDark ? "text-zinc-500" : "text-slate-500")}>{user.email}</span>
                    <span className={cn("text-[9px] px-1.5 rounded-full border", isDark ? "bg-white/5 border-white/10 text-zinc-400" : "bg-slate-100 border-slate-200 text-slate-500")}>
                      {getRelativeTime(user.lastActive)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="relative z-10 flex items-center justify-between mt-4 pt-4 border-t border-white/5 dark:border-white/5">
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
