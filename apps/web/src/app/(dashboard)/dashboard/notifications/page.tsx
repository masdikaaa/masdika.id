'use client';

import { useUrlNumber } from "@/lib/useUrlTab";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { motion, Variants } from "framer-motion";
import { Bell, BellRing, CheckCircle2, AlertCircle, MessageSquare, Receipt, ArrowLeft, RefreshCw } from "lucide-react";
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
      className="space-y-6 md:space-y-8 pb-10"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hero Header */}
      <motion.div variants={itemVariants} className={cn("relative overflow-hidden rounded-3xl p-6 md:p-8 shadow-sm group flex flex-col md:flex-row md:items-center justify-between gap-6 border", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        
        
        <div className="relative z-10 shrink-0">
          <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 tracking-wide border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-100 border-cyan-200 text-cyan-700")}>
            <Bell className="w-3 h-3" /> Updates & Alerts
          </div>
          <h1 className={cn("text-3xl md:text-4xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            All <span className={cn(isDark ? "text-cyan-400" : "text-cyan-600")}>Notifications</span>
          </h1>
          <p className={cn("text-sm max-w-md", isDark ? "text-zinc-400" : "text-slate-500")}>View your recent updates, billing alerts, and support responses.</p>
        </div>
        
        <div className="relative z-10 shrink-0 flex flex-col sm:flex-row gap-3">
          <Link 
            href="/dashboard"
            className={cn("w-full sm:w-auto px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 border transition-all", isDark ? "bg-slate-800/60 hover:bg-slate-800 text-white border-slate-700/80" : "bg-white hover:bg-slate-50 text-slate-900 border-slate-200 shadow-sm")}
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className={cn("px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shrink-0", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-sm hover:shadow" : "bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm hover:shadow-md")}
            >
              <CheckCircle2 className="w-5 h-5" />
              Mark all as read
            </button>
          )}
        </div>
      </motion.div>

      {notifications.length === 0 ? (
        <motion.div variants={itemVariants} className={cn("border rounded-3xl p-12 text-center shadow-sm relative overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="relative z-10">
            <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 transform -rotate-6", isDark ? "bg-white/5" : "bg-slate-100")}>
              <BellRing className={cn("w-10 h-10 transform rotate-6", isDark ? "text-zinc-500" : "text-slate-500")} />
            </div>
            <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No Notifications</h3>
            <p className={cn("max-w-md mx-auto mb-6", isDark ? "text-zinc-400" : "text-slate-500")}>You don't have any recent notifications at the moment.</p>
          </div>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className={cn("border rounded-3xl overflow-hidden shadow-md relative", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          
          <div className={cn("divide-y relative z-10", isDark ? "divide-slate-800/60" : "divide-slate-100")}>
            {paginatedNotifications.map((notif) => (
              <div key={notif.id}>
                <Link
                  href={notif.link || "#"}
                  className={cn("block p-5 sm:p-6 transition-all group", isDark ? "hover:bg-slate-800/40" : "hover:bg-slate-50/80")}
                >
                  <div className="flex gap-4 sm:gap-6">
                    <div className="shrink-0 mt-1">
                      {notif.type === 'TICKET' ? (
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${notif.isRead ? (isDark ? 'bg-slate-800 border-transparent text-zinc-400' : 'bg-slate-100 border-slate-200 text-slate-500') : (isDark ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-slate-100 text-cyan-700 border-slate-200 shadow-sm')}`}>
                          <MessageSquare className="w-5 h-5" />
                        </div>
                      ) : notif.type === 'INVOICE' ? (
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${notif.isRead ? (isDark ? 'bg-slate-800 border-transparent text-zinc-400' : 'bg-slate-100 border-slate-200 text-slate-500') : (isDark ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-slate-100 text-cyan-700 border-slate-200 shadow-sm')}`}>
                          <Receipt className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${notif.isRead ? (isDark ? 'bg-slate-800 border-transparent text-zinc-400' : 'bg-slate-100 border-slate-200 text-slate-500') : (isDark ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' : 'bg-slate-100 text-cyan-700 border-slate-200 shadow-sm')}`}>
                          <AlertCircle className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 mb-1">
                        <h4 className={`font-semibold text-base truncate ${notif.isRead ? (isDark ? 'text-zinc-300' : 'text-slate-700') : (isDark ? 'text-white' : 'text-slate-900')}`}>
                          {notif.subject}
                        </h4>
                        <span className={cn("text-xs font-medium shrink-0", isDark ? "text-zinc-500" : "text-slate-500")}>
                          {formatRelativeTime(notif.createdAt)}
                        </span>
                      </div>
                      <p className={`text-sm line-clamp-2 ${notif.isRead ? (isDark ? 'text-zinc-500' : 'text-slate-500') : (isDark ? 'text-zinc-400' : 'text-slate-600')}`}>
                        {notif.content}
                      </p>
                      
                      {!notif.isRead && (
                        <div className={cn("mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-slate-100 text-cyan-800 border-slate-200")}>
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
            <div className={cn("p-6 border-t relative z-10", isDark ? "border-slate-800 bg-[#060b14]" : "border-slate-200 bg-slate-50/50")}>
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