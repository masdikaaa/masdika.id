'use client';
import { cn } from "@/lib/utils";

import { useEffect, useState } from "react";
import { motion, Variants } from "framer-motion";
import { Bell, BellRing, CheckCircle2, Loader2, MessageSquare, AlertCircle, Users, HardDrive , LayoutDashboard } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
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

export default function AdminNotificationsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchNotifications();
  }, []);

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
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-zinc-500">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium">Loading...</p>
      </div>
    );
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
          <h1 className={cn("text-3xl font-extrabold drop-shadow-sm mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Admin Notifications</h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Monitor all platform activities, new messages, and system alerts.</p>
        </div>
      </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className={cn("flex items-center gap-2 px-4 py-2 hover:bg-white/10 rounded-xl border transition-colors text-sm font-medium", isDark ? "text-white border-white/5" : "text-slate-900 border-slate-200")}
          >
            <CheckCircle2 className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-700")} />
            Mark all as read
          </button>
        )}
      </div>

      <div className={cn("bg-[#0a1f33]/40 backdrop-blur-sm border rounded-3xl overflow-hidden shadow-2xl relative", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
        
        {notifications.length === 0 ? (
          <div className="py-20 text-center relative z-10">
            <div className={cn("w-20 h-20 bg-zinc-800/30 rounded-full flex items-center justify-center mx-auto mb-4 border", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
              <BellRing className="w-8 h-8 text-zinc-500" />
            </div>
            <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No Notifications</h3>
            <p className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>Everything is caught up. No recent activities.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5 relative z-10">
            {paginatedNotifications.map((notif, index) => (
              <motion.div key={notif.id} variants={itemVariants}>
                <Link
                  href={notif.link || "#"}
                  className={`block p-5 sm:p-6 transition-all hover:bg-white/[0.03] group ${!notif.isRead ? 'bg-cyan-500/[0.02]' : ''}`}
                >
                  <div className="flex gap-4 sm:gap-6">
                    <div className="shrink-0 mt-1">
                      {notif.type === 'MESSAGE' ? (
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${notif.isRead ? 'bg-zinc-800/50 text-zinc-400' : 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]'}`}>
                          <MessageSquare className="w-5 h-5" />
                        </div>
                      ) : notif.type === 'TICKET' ? (
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${notif.isRead ? 'bg-zinc-800/50 text-zinc-400' : 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]'}`}>
                          <AlertCircle className="w-5 h-5" />
                        </div>
                      ) : notif.type === 'COMMUNITY' ? (
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${notif.isRead ? 'bg-zinc-800/50 text-zinc-400' : 'bg-purple-500/20 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]'}`}>
                          <Users className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${notif.isRead ? 'bg-zinc-800/50 text-zinc-400' : 'bg-indigo-500/20 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]'}`}>
                          <HardDrive className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 mb-1">
                        <h4 className={`font-semibold text-base truncate ${notif.isRead ? 'text-zinc-300' : 'text-white'}`}>
                          {notif.subject}
                        </h4>
                        <span className="text-xs font-medium text-zinc-500 shrink-0">
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                      </div>
                      <p className={`text-sm line-clamp-2 ${notif.isRead ? 'text-zinc-500' : 'text-zinc-400'}`}>
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
              <div className={cn("p-4 border-t bg-white/[0.01] mt-2", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
