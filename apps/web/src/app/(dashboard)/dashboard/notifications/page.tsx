'use client';

import { useUrlNumber } from "@/lib/useUrlTab";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { motion, Variants } from "framer-motion";
import { Bell, BellRing, CheckCircle2, AlertCircle, MessageSquare, Receipt, ChevronLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Pagination } from "@/components/ui/Pagination";

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

export default function NotificationsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [currentPage, setCurrentPage] = useUrlNumber("currentPage", 1);
  const itemsPerPage = 10;

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/user/notifications?all=true");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);



  const markAllAsRead = async () => {
    try {
      const res = await fetch("/api/user/notifications/mark-all", { method: 'POST' });
      if (res.ok) {
        toast.success("All notifications marked as read");
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
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center">
        <RefreshCw className="w-10 h-10 text-cyan-500 animate-spin" />
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;
  
  const totalPages = Math.max(1, Math.ceil(notifications.length / itemsPerPage));
  const paginatedNotifications = notifications.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <motion.div
      className="space-y-6 pb-10"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Compact Unboxed Page Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              All Notifications
            </h1>
            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-500/10 border-cyan-500/20 text-cyan-700")}>
              <Bell className="w-3 h-3" /> Updates & Alerts
            </span>
          </div>
          <p className={cn("text-xs sm:text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>View your recent updates, billing alerts, and support responses.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto shrink-0">
          <Link 
            href="/dashboard"
            className={cn("w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border transition-all", isDark ? "bg-[#0a0a0c] hover:bg-white/[0.04] text-zinc-300 hover:text-white border-white/[0.08]" : "bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200/90 shadow-2xs")}
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shrink-0 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-2xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark all as read
            </button>
          )}
        </div>
      </motion.div>

      {notifications.length === 0 ? (
        <motion.div variants={itemVariants} className={cn("border rounded-2xl p-8 sm:p-12 text-center relative overflow-hidden", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
          <div className="relative z-10">
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 border", isDark ? "bg-white/[0.03] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")}>
              <BellRing className={cn("w-8 h-8", isDark ? "text-zinc-500" : "text-slate-400")} />
            </div>
            <h3 className={cn("text-lg sm:text-xl font-bold mb-1.5", isDark ? "text-white" : "text-slate-900")}>No Notifications</h3>
            <p className={cn("text-xs sm:text-sm max-w-md mx-auto", isDark ? "text-zinc-400" : "text-slate-500")}>You don't have any recent notifications at the moment.</p>
          </div>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className={cn("border rounded-2xl overflow-hidden relative", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
          
          <div className={cn("divide-y relative z-10", isDark ? "divide-white/[0.06]" : "divide-slate-200/90")}>
            {paginatedNotifications.map((notif) => (
              <div key={notif.id}>
                <Link
                  href={notif.link || "#"}
                  className={cn("block p-4 sm:p-5 transition-all group", isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50/80")}
                >
                  <div className="flex gap-3.5 sm:gap-4">
                    <div className="shrink-0 mt-0.5">
                      {notif.type === 'TICKET' ? (
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${notif.isRead ? (isDark ? 'bg-[#111115] border-white/[0.08] text-zinc-400' : 'bg-slate-50/80 border-slate-200/90 text-slate-500') : (isDark ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' : 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20')}`}>
                          <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                      ) : notif.type === 'INVOICE' ? (
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${notif.isRead ? (isDark ? 'bg-[#111115] border-white/[0.08] text-zinc-400' : 'bg-slate-50/80 border-slate-200/90 text-slate-500') : (isDark ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' : 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20')}`}>
                          <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                      ) : (
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${notif.isRead ? (isDark ? 'bg-[#111115] border-white/[0.08] text-zinc-400' : 'bg-slate-50/80 border-slate-200/90 text-slate-500') : (isDark ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' : 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20')}`}>
                          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 mb-1">
                        <h4 className={`font-bold text-sm sm:text-base truncate ${notif.isRead ? (isDark ? 'text-zinc-300' : 'text-slate-700') : (isDark ? 'text-white' : 'text-slate-900')}`}>
                          {notif.subject}
                        </h4>
                        <span className={cn("text-xs font-medium shrink-0", isDark ? "text-zinc-500" : "text-slate-500")}>
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                      </div>
                      <p className={`text-xs sm:text-sm line-clamp-2 ${notif.isRead ? (isDark ? 'text-zinc-500' : 'text-slate-500') : (isDark ? 'text-zinc-400' : 'text-slate-600')}`}>
                        {notif.content}
                      </p>
                      
                      {!notif.isRead && (
                        <div className={cn("mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-500/10 text-cyan-800 border-cyan-500/20")}>
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                          Unread
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
          
          {totalPages > 1 && (
            <div className={cn("p-5 sm:p-6 border-t relative z-10", isDark ? "border-white/[0.08] bg-[#111115]" : "border-slate-200/90 bg-slate-50/80")}>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}