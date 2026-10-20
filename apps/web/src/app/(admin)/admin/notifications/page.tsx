'use client';
import { useUrlNumber } from "@/lib/useUrlTab";
import { cn } from "@/lib/utils";

import { useEffect, useState } from "react";
import { motion, Variants } from "framer-motion";
import { Bell, BellRing, CheckCircle2, Loader2, MessageSquare, AlertCircle, Users, HardDrive , LayoutDashboard, RefreshCw } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import Link from "next/link";
import { toast } from "sonner";
import { Pagination } from "@/components/ui/Pagination";
import { AdminLoader } from "@/components/admin/AdminLoader";

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}mo ago`;
  
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears}y ago`;
}

export default function AdminNotificationsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/admin/notifications?all=true");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch admin notifications", error);
    } finally {
      setLoading(false);
    }
  };

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useUrlNumber("currentPage", 1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchNotifications();
  }, []);


  const markAllAsRead = async () => {
    try {
      const res = await fetch("/api/admin/notifications/mark-all", { method: 'POST' });
      if (res.ok) {
        toast.success("Notifications marked as read");
        setNotifications(notifications.map(n => ({ ...n, isRead: true })));
        window.dispatchEvent(new Event('notificationsUpdated'));
      }
    } catch (error) {
      toast.error("Failed to mark all as read");
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  if (loading) {
    return <AdminLoader />;
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const totalPages = Math.ceil(notifications.length / itemsPerPage);
  const paginatedNotifications = notifications.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const readCount = notifications.length - unreadCount;

  return (
    <motion.div
      className="space-y-6 pb-10"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header matching Gambar 1 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={cn("text-2xl md:text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Admin Notifications
          </h1>
          <p className={cn("text-sm font-medium mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>
            Monitor all platform activities, new messages, and system alerts.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3.5 py-2 rounded-xl font-medium text-xs flex items-center gap-2">
            <span>Total Alerts:</span>
            <span className="font-extrabold text-white">{notifications.length}</span>
          </div>
          <button
            onClick={() => { setLoading(true); fetchNotifications(); }}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border",
              isDark ? "border-slate-800 bg-[#0b1322] hover:bg-white/5 text-zinc-300 hover:text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            )}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            <span>Refresh</span>
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 font-semibold text-xs shadow-sm transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards Grid (GAMBAR 1 Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>TOTAL NOTIFICATIONS</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{notifications.length}</span>
            <span className={cn("text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-600")}>All activities</span>
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>UNREAD ALERTS</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-amber-500/15 border-amber-500/25 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700")}>
              <BellRing className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{unreadCount}</span>
            <span className={cn("text-xs font-medium", isDark ? "text-amber-400" : "text-amber-600")}>Action needed</span>
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>READ & ARCHIVED</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700")}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{readCount}</span>
            <span className={cn("text-xs font-medium", isDark ? "text-emerald-400" : "text-emerald-600")}>Completed</span>
          </div>
        </div>
      </div>

      {/* Notifications List Container */}
      <div className={cn("border rounded-2xl overflow-hidden relative z-10", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        {notifications.length === 0 ? (
          <div className="py-20 text-center relative z-10">
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 border", isDark ? "bg-[#060b14] border-slate-800 text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-400")}>
              <BellRing className="w-8 h-8" />
            </div>
            <h3 className={cn("text-lg font-bold mb-1", isDark ? "text-white" : "text-slate-900")}>No Notifications</h3>
            <p className={cn("text-xs text-zinc-500", isDark ? "text-zinc-400" : "text-slate-500")}>Everything is caught up. No recent activities.</p>
          </div>
        ) : (
          <div className={cn("divide-y relative z-10", isDark ? "divide-slate-800/80" : "divide-slate-200")}>
            {paginatedNotifications.map((notif, index) => (
              <motion.div key={notif.id} variants={itemVariants}>
                <Link
                  href={notif.link || "#"}
                  className={cn("block p-5 sm:p-6 transition-all group", !notif.isRead ? (isDark ? "bg-cyan-500/10 hover:bg-cyan-500/15" : "bg-cyan-50/70 hover:bg-cyan-50") : (isDark ? "hover:bg-white/5" : "hover:bg-slate-50/80"))}
                >
                  <div className="flex gap-4 sm:gap-6">
                    <div className="shrink-0 mt-1">
                      {notif.type === 'MESSAGE' ? (
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${notif.isRead ? (isDark ? 'bg-[#060b14] border-slate-800 text-zinc-400' : 'bg-slate-100 border-slate-200 text-slate-500') : 'bg-cyan-500/15 border-cyan-500/25 text-cyan-400'}`}>
                          <MessageSquare className="w-5 h-5" />
                        </div>
                      ) : notif.type === 'TICKET' ? (
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${notif.isRead ? (isDark ? 'bg-[#060b14] border-slate-800 text-zinc-400' : 'bg-slate-100 border-slate-200 text-slate-500') : 'bg-cyan-500/15 border-cyan-500/25 text-cyan-400'}`}>
                          <AlertCircle className="w-5 h-5" />
                        </div>
                      ) : notif.type === 'COMMUNITY' ? (
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${notif.isRead ? (isDark ? 'bg-[#060b14] border-slate-800 text-zinc-400' : 'bg-slate-100 border-slate-200 text-slate-500') : 'bg-purple-500/15 border-purple-500/25 text-purple-400'}`}>
                          <Users className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${notif.isRead ? (isDark ? 'bg-[#060b14] border-slate-800 text-zinc-400' : 'bg-slate-100 border-slate-200 text-slate-500') : 'bg-indigo-500/15 border-indigo-500/25 text-indigo-400'}`}>
                          <HardDrive className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 mb-1">
                        <h4 className={cn("font-semibold text-base truncate", notif.isRead ? (isDark ? "text-slate-300" : "text-slate-700") : (isDark ? "text-white font-bold" : "text-slate-900 font-bold"))}>
                          {notif.subject}
                        </h4>
                        <span className="text-xs font-medium text-zinc-500 shrink-0">
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                      </div>
                      <p className={cn("text-sm line-clamp-2", notif.isRead ? (isDark ? "text-zinc-500" : "text-slate-400") : (isDark ? "text-zinc-300" : "text-slate-600"))}>
                        {notif.content}
                      </p>
                      
                      {!notif.isRead && (
                        <div className={cn("mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/10 text-xs font-bold border border-cyan-500/20", isDark ? "text-cyan-400" : "text-cyan-700")}>
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          Unread
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
            
            {totalPages > 1 && (
              <div className={cn("p-4 border-t", isDark ? "bg-[#060b14]/50 border-slate-800" : "bg-slate-50 border-slate-200")}>
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
