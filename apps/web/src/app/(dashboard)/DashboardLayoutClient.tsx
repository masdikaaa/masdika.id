"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Key, Settings, LogOut, Bell, Menu, LayoutDashboard, BarChart3, Link2, Database, Receipt, ArrowUpCircle, HardDrive, Server, Layers, MessageSquare, Wallet, Ticket, Network, Terminal, UploadCloud, MapPin, Flame, Activity, Gift, Clock, Code2, Sun, Moon, ShieldAlert } from "lucide-react";
import { SiKubernetes, SiCloudflare } from "react-icons/si";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/billing";

const VpcIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="11" />
    <polyline points="9 6 12 3 15 6" />
    <polyline points="9 18 12 21 15 18" />
    <polyline points="6 9 3 12 6 15" />
    <polyline points="18 9 21 12 18 15" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="12" y1="3" x2="12" y2="21" />
  </svg>
);

const FirewallIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <g transform="scale(0.8) translate(3, -2)">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </g>
    <rect x="2" y="15" width="20" height="7" rx="1" />
    <line x1="2" y1="18.5" x2="22" y2="18.5" />
    <line x1="8" y1="15" x2="8" y2="18.5" />
    <line x1="16" y1="15" x2="16" y2="18.5" />
    <line x1="12" y1="18.5" x2="12" y2="22" />
  </svg>
);

const TunnelIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="6" cy="18" r="3" />
    <circle cx="12" cy="12" r="3" />
    <circle cx="18" cy="6" r="3" />
    <line x1="8.12" y1="15.88" x2="9.88" y2="14.12" />
    <line x1="14.12" y1="9.88" x2="15.88" y2="8.12" />
  </svg>
);

const SIDEBAR_LINKS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, color: "text-blue-400", group: "Main" },
  { name: "My Services", href: "/dashboard/services", icon: Layers, color: "text-cyan-400", group: "Main" },
  { name: "Cloud VPS", href: "/dashboard/vps", icon: Terminal, color: "text-blue-400", group: "Compute & Network" },
  { name: "Managed K3s", href: "/dashboard/k3s", icon: SiKubernetes, color: "text-cyan-400", group: "Compute & Network" },
  { name: "Metric & Alert", href: "/dashboard/alerts", icon: Activity, color: "text-cyan-400", group: "Compute & Network" },
  { name: "Incident Reports", href: "/dashboard/incidents", icon: ShieldAlert, color: "text-cyan-400", group: "Compute & Network" },
  { name: "Auto Scheduler", href: "/dashboard/scheduler", icon: Clock, color: "text-cyan-400", group: "Compute & Network" },
  { name: "Reserved IPs", href: "/dashboard/reserved-ips", icon: Network, color: "text-cyan-400", group: "Compute & Network" },
  { name: "Virtual Private Cloud", href: "/dashboard/vpc", icon: VpcIcon, color: "text-cyan-400", group: "Compute & Network" },
  { name: "Cloudflared", href: "/dashboard/cloudflared", icon: SiCloudflare, color: "text-[#F38020]", group: "Compute & Network" },
  { name: "Firewalls", href: "/dashboard/firewalls", icon: FirewallIcon, color: "text-orange-500", group: "Compute & Network" },
  { name: "File CDN", href: "/dashboard/cdn", icon: UploadCloud, color: "text-cyan-400", group: "Storage & Data" },
  { name: "URL Shortener", href: "/dashboard/shortener", icon: Link2, color: "text-cyan-400", group: "Tools" },
  { name: "API Keys", href: "/dashboard/api-keys", icon: Key, color: "text-amber-400", group: "Tools" },
  { name: "Reseller API", href: "/dashboard/reseller-api", icon: Code2, color: "text-cyan-400", group: "Tools" },
  { name: "Support Tickets", href: "/dashboard/tickets", icon: MessageSquare, color: "text-cyan-400", group: "Support" },
  { name: "Affiliate Program", href: "/dashboard/affiliate", icon: Gift, color: "text-purple-400", group: "Affiliate" },
  { name: "Promo & Rewards", href: "/dashboard/promos", icon: Ticket, color: "text-cyan-400", group: "Promotions" },
  { name: "Order Service", href: "/dashboard/checkout", icon: ArrowUpCircle, color: "text-cyan-400", group: "Billing & Account" },
  { name: "Billing & Invoices", href: "/dashboard/billing", icon: Receipt, color: "text-cyan-500", group: "Billing & Account" },
  { name: "Settings", href: "/dashboard/settings", icon: Settings, color: "text-zinc-400", group: "Billing & Account" },
];

export default function DashboardLayoutClient({
  children,
  userName,
  userEmail,
  userImage,
  userBalance,
  promos
}: {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  userImage?: string | null;
  userBalance?: number;
  promos?: any[];
}) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const fetchNotifications = () => {
      fetch(`/api/user/notifications?limit=5&t=${Date.now()}`, { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            setNotifications(data.notifications || []);
            setUnreadCount(data.totalNotifications || 0);
          }
        })
        .catch(err => console.debug('fetchNotifications error:', err));
        
      // Ping user presence
      fetch('/api/user/ping', { method: 'POST' }).catch(() => {});
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // refresh every minute

    const handleNotificationsUpdate = () => {
      fetchNotifications();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    };

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        fetchNotifications();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', fetchNotifications);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('notificationsUpdated', handleNotificationsUpdate as EventListener);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', fetchNotifications);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('notificationsUpdated', handleNotificationsUpdate as EventListener);
    };
  }, []);

  const handleMarkAllAsRead = async () => {
    try {
      await fetch('/api/user/notifications/mark-all', { method: 'POST' });
      setNotifications([]);
      setUnreadCount(0);
      setShowNotifications(false);
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      toast.success("Signed out successfully");
      setTimeout(() => {
        window.location.href = '/login';
      }, 500);
    } catch (error) {
      toast.error("Failed to sign out");
      window.location.href = '/login';
    }
  };

  return (
    <div className={cn("flex h-[100dvh] relative overflow-hidden selection:bg-cyan-500/30", isDark ? "bg-[#050B14] text-white" : "bg-[#f8fafb] text-slate-900")}>

      {/* Clean ambient background with subtle grid lines */}
      <div 
        className="absolute inset-0 overflow-hidden pointer-events-none z-0 transition-colors duration-500"
        style={{ backgroundColor: isDark ? "#050B14" : "#f8fafb" }}
      >
        <div 
          className="absolute inset-0 transition-opacity duration-500" 
          style={{
            opacity: isDark ? 0.07 : 0.05,
            backgroundImage: `
              linear-gradient(to right, ${isDark ? "#ffffff" : "#000000"} 1px, transparent 1px),
              linear-gradient(to bottom, ${isDark ? "#ffffff" : "#000000"} 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-[90] bg-black/60 lg:hidden cursor-default"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label="Customer navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-[100] w-64 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-0 flex flex-col border-r",
          isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200 shadow-sm",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className={cn("h-16 flex items-center px-6 border-b", isDark ? "border-slate-800" : "border-slate-200")}>
          <Link href="/" className="flex items-center group w-fit">
              <img
                src={isDark ? "/masdika-logo-dark-mode.svg" : "/masdika-logo-light-mode.svg"}
                alt="Masdika Logo"
                className="h-8 w-auto"
              />
            </Link>
        </div>

        <div className="p-4 space-y-6 overflow-y-auto flex-1 pb-[72px] custom-scrollbar">
          {Object.entries(
            SIDEBAR_LINKS.reduce((acc, link) => {
              if (!acc[link.group]) acc[link.group] = [];
              acc[link.group].push(link);
              return acc;
            }, {} as Record<string, typeof SIDEBAR_LINKS>)
          ).map(([groupName, links]) => (
            <div key={groupName}>
              <h3 className={cn("px-3 mb-2 text-xs font-bold uppercase tracking-wider", isDark ? "text-slate-400" : "text-slate-400")}>{groupName}</h3>
              <div className="space-y-1">
                {links.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                        isActive ? "bg-cyan-500 text-slate-900 shadow-sm font-bold" : cn("transition-colors", isDark ? "text-slate-400 hover:text-white hover:bg-slate-800/60" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100")
                      )}
                    >
                      <link.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", 
                        isActive 
                          ? "" 
                          : (isDark ? "text-cyan-500/60 group-hover:text-cyan-400" : "text-slate-400 group-hover:text-cyan-600")
                      )} />
                      <span className="relative z-10">{link.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className={cn("absolute bottom-0 left-0 w-full h-[72px] flex items-center px-4 border-t z-10", isDark ? "border-slate-800 bg-[#0b1322]" : "border-slate-200 bg-white")}>
          <button
            onClick={() => {
              setSidebarOpen(false);
              handleLogout();
            }}
            aria-label="Sign out"
            className={cn("flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium transition-colors", isDark ? "text-slate-400 hover:text-white hover:bg-slate-800/60" : "text-slate-500 hover:text-red-600 hover:bg-red-50")}
          >
            <LogOut className="w-5 h-5" aria-hidden="true" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className={cn("h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b sticky top-0 z-30", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200 shadow-sm")}>
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
            className={cn("lg:hidden p-2 transition-colors group flex flex-col items-center justify-center w-10 h-10 gap-1.5 relative focus:outline-none", isDark ? "text-slate-400 hover:text-cyan-400" : "text-slate-500 hover:text-cyan-600")}
          >
            <span className="w-6 h-[2px] bg-current rounded-full transform transition-all duration-300 ease-out origin-center" />
            <span className="w-6 h-[2px] bg-current rounded-full transform transition-all duration-300 ease-out origin-center" />
            <span className="w-6 h-[2px] bg-current rounded-full transform transition-all duration-300 ease-out origin-center" />
          </button>

          <div className="ml-auto flex items-center gap-2 sm:gap-6">
            <div className="flex items-center gap-2 sm:gap-4 relative">

              {/* Balance Display (Top-up button) */}
              <Link href="/dashboard/billing" className={cn("flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl transition-colors mr-1 sm:mr-2 border", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20" : "bg-white text-slate-800 border-slate-200 hover:border-cyan-500/50 hover:bg-slate-50 shadow-sm")}>
                <Wallet className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-600")} />
                <span className="text-xs sm:text-sm font-bold whitespace-nowrap">{formatRupiah(userBalance || 0)}</span>
              </Link>

              <button onClick={() => setTheme(isDark ? 'light' : 'dark')} aria-label="Toggle Theme" className={cn("transition-colors relative group outline-none mr-1 sm:mr-2", isDark ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-900")}>
                {isDark ? <Sun className="w-5 h-5 transition-transform group-hover:rotate-12" /> : <Moon className="w-5 h-5 transition-transform group-hover:-rotate-12" />}
              </button>

              <button onClick={() => setShowNotifications(!showNotifications)} aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`} className={cn("transition-colors relative group outline-none mr-1 sm:mr-2", isDark ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-900")}>
                <Bell className={cn("w-5 h-5 transition-transform", showNotifications ? "animate-ring" : "group-hover:rotate-12")} aria-hidden="true" />
                {unreadCount > 0 && (
                  <span aria-live="polite" className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center border-2 border-background">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <>
                  <button type="button" aria-label="Close notifications" className="fixed inset-0 z-40 cursor-default" onClick={() => setShowNotifications(false)} />
                  <div className={cn("fixed top-[72px] left-4 right-4 sm:absolute sm:top-12 sm:-right-2 sm:left-auto sm:w-80 border rounded-2xl shadow-2xl z-50 overflow-hidden transform origin-top sm:origin-top-right transition-all", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200")}>
                    <div className={cn("p-4 border-b flex items-center justify-between", isDark ? "border-slate-800" : "border-slate-100")}>
                      <h3 className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>Notifications</h3>
                      <div className="flex items-center gap-3">
                        {notifications.length > 0 && (
                          <button
                            onClick={handleMarkAllAsRead}
                            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                          >
                            Mark all as read
                          </button>
                        )}
                        <Link href="/dashboard/notifications" onClick={() => setShowNotifications(false)} className={cn("text-xs", isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900")}>
                          View All
                        </Link>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className={cn("p-6 text-center text-sm", isDark ? "text-slate-400" : "text-slate-500")}>
                          No new notifications
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <Link
                            key={notif.id}
                            href={notif.link || `/dashboard`}
                            onClick={() => setShowNotifications(false)}
                            className={cn("block p-4 border-b transition-colors", isDark ? "border-slate-800 hover:bg-slate-800/40" : "border-slate-100 hover:bg-slate-50")}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className={cn("font-semibold text-sm truncate", isDark ? "text-white" : "text-slate-900")}>{notif.subject || 'No Subject'}</div>
                              {notif.type === 'TICKET' && notif.id.startsWith('ticket-') ? (
                                <button
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const ticketId = notif.subject.match(/\[(.*?)\]/)?.[1];
                                    if (ticketId) {
                                      try {
                                        await fetch(`/api/tickets/${ticketId}`, {
                                          method: 'PATCH',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ action: 'MARK_READ' })
                                        });
                                        setNotifications(prev => prev.filter(n => n.id !== notif.id));
                                        setUnreadCount(prev => Math.max(0, prev - 1));
                                      } catch (err) { }
                                    }
                                  }}
                                  className="w-4 h-4 rounded-full bg-cyan-500/20 hover:bg-cyan-500 flex items-center justify-center transition-colors group/mark"
                                  title="Mark as read"
                                >
                                  <span className="w-2 h-2 rounded-full bg-cyan-500 group-hover/mark:bg-white" />
                                </button>
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-cyan-500 mt-1 shrink-0" />
                              )}
                            </div>
                            <div className={cn("text-xs mt-1 truncate", isDark ? "text-slate-400" : "text-slate-500")}>
                              <span className="font-medium text-cyan-500 mr-1">{notif.type}</span>
                              {notif.name} - {notif.content}
                            </div>
                            <div className={cn("text-[10px] mt-2", isDark ? "text-slate-500" : "text-slate-400")}>{new Date(notif.createdAt).toLocaleString()}</div>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className={cn("text-sm font-medium", isDark ? "text-white" : "text-slate-900")}>{userName}</span>
                <span className={cn("text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>{userEmail}</span>
              </div>
              <Link href="/dashboard/settings" className="w-10 h-10 rounded-full shrink-0 hover:scale-105 transition-transform cursor-pointer">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center overflow-hidden border border-white/20">
                  {userImage ? (
                    <img referrerPolicy="no-referrer" src={userImage} alt={userName} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <span className="text-lg font-bold text-white">
                      {userName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </Link>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
          <div className="w-full p-4 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
