'use client';
import { useUrlNumber } from "@/lib/useUrlTab";
import { cn } from "@/lib/utils";

import { useEffect, useState } from "react";
import { motion, Variants } from "framer-motion";
import { Bell, BellRing, CheckCircle2, Loader2, MessageSquare, AlertCircle, Users, HardDrive , LayoutDashboard } from "lucide-react";
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

  return (
    <motion.div
      className="space-y-6 pb-10"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex flex-col sm:flex-row md:items-end justify-between gap-6 mb-6">
        <div>
          <h1 className={cn("text-3xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Admin Notifications</h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Monitor all platform activities, new messages, and system alerts.</p>
        </div>
      </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors text-sm font-medium", isDark ? "text-white border-slate-800 hover:bg-slate-800" : "text-slate-900 border-slate-200 hover:bg-slate-50")}
          >
            <CheckCircle2 className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-700")} />
            Mark all as read
          </button>
        )}
      </div>

      <div className={cn("border rounded-2xl overflow-hidden relative", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
        
        {notifications.length === 0 ? (
          <div className="py-20 text-center relative z-10">
            <div className={cn("w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}>
              <BellRing className="w-8 h-8 text-zinc-500" />
            </div>
            <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No Notifications</h3>
            <p className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>Everything is caught up. No recent activities.</p>
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
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${notif.isRead ? 'bg-zinc-800/50 text-zinc-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                          <MessageSquare className="w-5 h-5" />
                        </div>
                      ) : notif.type === 'TICKET' ? (
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${notif.isRead ? 'bg-zinc-800/50 text-zinc-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                          <AlertCircle className="w-5 h-5" />
                        </div>
                      ) : notif.type === 'COMMUNITY' ? (
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${notif.isRead ? 'bg-zinc-800/50 text-zinc-400' : 'bg-purple-500/20 text-purple-400'}`}>
                          <Users className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${notif.isRead ? 'bg-zinc-800/50 text-zinc-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
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
              <div className={cn("p-4 border-t mt-2", isDark ? "bg-[#060b14]/50 border-slate-800" : "bg-slate-50 border-slate-200")}>
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
