"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Key, Settings, LogOut, Bell, Menu, LayoutDashboard, BarChart3, Link2, Database, Receipt, ArrowUpCircle, HardDrive, Server, Layers, MessageSquare, Wallet, Ticket, Network, Terminal, UploadCloud, MapPin, Flame, Activity, Gift, Clock, Code2, Sun, Moon, ShieldAlert, Loader2, Plus, ChevronDown, Search } from "lucide-react";
import { SiKubernetes, SiCloudflare } from "react-icons/si";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";
import { formatRupiah, formatCompactRupiah } from "@/lib/billing";

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
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, color: "text-cyan-400", group: "Main" },
  { name: "My Services", href: "/dashboard/services", icon: Layers, color: "text-cyan-400", group: "Main" },
  { name: "Cloud VPS", href: "/dashboard/vps", icon: Terminal, color: "text-cyan-400", group: "Compute & Network" },
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
  { name: "Affiliate Program", href: "/dashboard/affiliate", icon: Gift, color: "text-cyan-400", group: "Affiliate" },
  { name: "Promo & Rewards", href: "/dashboard/promos", icon: Ticket, color: "text-cyan-400", group: "Promotions" },
  { name: "Order Service", href: "/dashboard/checkout", icon: ArrowUpCircle, color: "text-cyan-400", group: "Billing & Account" },
  { name: "Billing & Invoices", href: "/dashboard/billing", icon: Receipt, color: "text-cyan-400", group: "Billing & Account" },
  { name: "Settings", href: "/dashboard/settings", icon: Settings, color: "text-zinc-400", group: "Billing & Account" },
];

export default function DashboardLayoutClient({
  children,
  userName,
  userEmail,
  userImage,
  userBalance,
  promos,
  isImpersonating = false,
  impersonatorAdminName = 'Admin',
}: {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  userImage?: string | null;
  userBalance?: number;
  promos?: any[];
  isImpersonating?: boolean;
  impersonatorAdminName?: string;
}) {
  const pathname = usePathname();
  const [isStoppingImpersonation, setIsStoppingImpersonation] = useState(false);

  const handleStopImpersonation = async () => {
    setIsStoppingImpersonation(true);
    try {
      let res = await fetch('/api/admin/impersonate/stop', { method: 'POST' });
      if (!res.ok) {
        res = await fetch('/api/auth/impersonate/stop', { method: 'POST' });
      }
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Kembali ke sesi admin');
        window.location.href = data.redirectUrl || '/admin/customers';
      } else {
        toast.error(data.error || 'Gagal mengakhiri impersonasi');
        setIsStoppingImpersonation(false);
      }
    } catch {
      toast.error('Terjadi kesalahan saat mengakhiri impersonasi');
      setIsStoppingImpersonation(false);
    }
  };
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const searchResults = searchQuery.trim() === ""
    ? []
    : SIDEBAR_LINKS.filter(link => link.name.toLowerCase().includes(searchQuery.toLowerCase()));

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
    <div className={cn("flex h-[100dvh] relative overflow-hidden selection:bg-cyan-500/30", isDark ? "bg-[#000000] text-white" : "bg-[#f8fafb] text-slate-900")}>

      {/* Clean atmospheric cyan background matching frontend */}
      <div 
        className="absolute inset-0 overflow-hidden pointer-events-none z-0 transition-colors duration-500"
        style={{ backgroundColor: isDark ? "#000000" : "#f8fafb" }}
      >
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isDark
              ? "radial-gradient(ellipse 70% 60% at 80% 10%, rgba(6,182,212,0.18) 0%, rgba(6,182,212,0.05) 45%, transparent 75%), radial-gradient(ellipse 55% 45% at 20% 85%, rgba(6,182,212,0.10) 0%, transparent 65%)"
              : "radial-gradient(ellipse 70% 60% at 80% 10%, rgba(6,182,212,0.12) 0%, rgba(6,182,212,0.03) 45%, transparent 75%), radial-gradient(ellipse 55% 45% at 20% 85%, rgba(6,182,212,0.06) 0%, transparent 65%)",
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
          isDark ? "bg-[#0c0c0e] border-white/10" : "bg-white border-slate-200 shadow-sm",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className={cn("h-16 flex items-center px-6 border-b", isDark ? "border-white/10" : "border-slate-200")}>
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
              <h3 className={cn("px-3 mb-2 text-xs font-bold uppercase tracking-wider", isDark ? "text-slate-500" : "text-slate-400")}>{groupName}</h3>
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
                        isActive ? "bg-cyan-400 text-slate-950 shadow-sm font-bold" : cn("transition-colors", isDark ? "text-slate-400 hover:text-white hover:bg-white/5" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100")
                      )}
                    >
                      <link.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", 
                        isActive 
                          ? "text-slate-950" 
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

        <div className={cn("absolute bottom-0 left-0 w-full h-[72px] flex items-center px-4 border-t z-10", isDark ? "border-white/10 bg-[#0c0c0e]" : "border-slate-200 bg-white")}>
          <button
            onClick={() => {
              setSidebarOpen(false);
              handleLogout();
            }}
            aria-label="Sign out"
            className={cn("flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium transition-colors", isDark ? "text-slate-400 hover:text-white hover:bg-white/5" : "text-slate-500 hover:text-red-600 hover:bg-red-50")}
          >
            <LogOut className="w-5 h-5" aria-hidden="true" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {isImpersonating && (
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 px-3.5 py-2.5 sm:px-6 sm:py-2 text-xs font-medium shadow-md sticky top-0 z-40 border-b border-orange-600/30">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-4">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className="p-1 rounded-md bg-slate-950/10 shrink-0">
                  <ShieldAlert className="w-4 h-4 text-slate-950" />
                </span>
                <p className="text-xs text-slate-950 leading-snug break-words">
                  Mode Impersonasi: Mengelola akun <strong className="font-bold">{userName}</strong>{" "}
                  <span className="hidden sm:inline opacity-85">({userEmail})</span> sebagai <strong className="font-bold">{impersonatorAdminName}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={handleStopImpersonation}
                disabled={isStoppingImpersonation}
                className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-900 active:scale-95 text-amber-300 hover:text-amber-200 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isStoppingImpersonation ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogOut className="w-3.5 h-3.5" />
                )}
                <span>Kembali ke Admin Panel</span>
              </button>
            </div>
          </div>
        )}

        {/* Topbar */}
        <header
          className={cn(
            "h-16 flex items-center justify-between px-2.5 sm:px-6 lg:px-8 border-b sticky top-0 z-30 transition-colors",
            isDark
              ? "bg-[#0a0a0c]/90 backdrop-blur-xl border-white/[0.08]"
              : "bg-white/90 backdrop-blur-xl border-slate-200/80 shadow-2xs"
          )}
        >
          {/* Left: Mobile Menu Trigger + Desktop Quick Search */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
              className={cn(
                "lg:hidden h-9 w-9 sm:h-10 sm:w-auto p-1 rounded-xl border flex items-center justify-center transition-all shrink-0 focus:outline-none group cursor-pointer",
                isDark
                  ? "bg-white/[0.02] border-white/[0.08] hover:border-white/[0.15]"
                  : "bg-slate-100/80 border-slate-200/80 hover:border-slate-300"
              )}
            >
              <span
                className={cn(
                  "w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all",
                  isDark
                    ? "text-zinc-300 group-hover:text-cyan-400 group-hover:bg-white/[0.07]"
                    : "text-slate-600 group-hover:text-cyan-700 group-hover:bg-white shadow-2xs"
                )}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4"
                >
                  <rect width="18" height="18" x="3" y="3" rx="3" />
                  <path d="M9 3v18" />
                  <path d="m14 9 3 3-3 3" />
                </svg>
              </span>
            </button>

            <div className="hidden md:flex items-center max-w-xs lg:max-w-sm w-full relative z-50">
              <Search className={cn("w-4 h-4 absolute left-3.5 z-10 pointer-events-none", isDark ? "text-zinc-500" : "text-slate-400")} />
              <input
                type="text"
                placeholder="Quick jump to service or menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                className={cn(
                  "w-full h-10 border text-xs sm:text-sm rounded-xl pl-10 pr-9 focus:outline-none transition-all",
                  isDark
                    ? "bg-white/[0.02] border-white/[0.08] text-white placeholder:text-zinc-500 focus:bg-[#111115] focus:border-cyan-500/40"
                    : "bg-slate-50/80 border-slate-200/90 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-cyan-500"
                )}
              />
              <span
                className={cn(
                  "absolute right-2.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border pointer-events-none",
                  isDark ? "bg-white/[0.04] border-white/[0.08] text-zinc-500" : "bg-white border-slate-200 text-slate-400"
                )}
              >
                /
              </span>

              {isSearchFocused && searchQuery.trim() !== "" && (
                <div
                  className={cn(
                    "absolute top-full mt-2 w-full border rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 z-50",
                    isDark ? "bg-[#0c0c0e] border-white/[0.1] shadow-[0_20px_50px_rgba(0,0,0,0.85)]" : "bg-white border-slate-200 shadow-xl"
                  )}
                >
                  <div className="max-h-64 overflow-y-auto p-1.5">
                    {searchResults.length > 0 ? (
                      searchResults.map(link => (
                        <Link
                          key={link.name}
                          href={link.href}
                          className={cn(
                            "flex items-center justify-between gap-3 px-3 py-2 rounded-xl transition-colors group",
                            isDark ? "hover:bg-white/[0.05]" : "hover:bg-slate-100"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <link.icon className={cn("w-4 h-4 shrink-0", link.color)} />
                            <span className={cn("text-xs sm:text-sm font-medium truncate", isDark ? "text-zinc-200 group-hover:text-white" : "text-slate-700 group-hover:text-slate-900")}>
                              {link.name}
                            </span>
                          </div>
                          <span className={cn("text-[10px] font-medium shrink-0", isDark ? "text-zinc-500" : "text-slate-400")}>
                            {link.group}
                          </span>
                        </Link>
                      ))
                    ) : (
                      <div className={cn("p-4 text-center text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>
                        No results found for &quot;{searchQuery}&quot;
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Wallet Capsule + Action Dock + Profile Pill */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 ml-auto shrink-0">
            {/* 1. Wallet & Top-Up Capsule */}
            <Link
              href="/dashboard/billing"
              className={cn(
                "group h-9 sm:h-10 p-1 flex items-center gap-1.5 sm:gap-2 rounded-xl border transition-all duration-200 shrink-0",
                isDark
                  ? "bg-gradient-to-r from-cyan-500/[0.08] via-cyan-500/[0.03] to-white/[0.01] border-cyan-500/25 hover:border-cyan-400/50 hover:from-cyan-500/[0.14]"
                  : "bg-slate-50/90 hover:bg-white border-slate-200/90 hover:border-cyan-500/40 shadow-2xs"
              )}
              title={`Credit: ${formatRupiah(userBalance || 0)} (Click to Top Up)`}
            >
              <div
                className={cn(
                  "w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors",
                  isDark
                    ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-400"
                    : "bg-cyan-50 border-cyan-200 text-cyan-700"
                )}
              >
                <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>

              <div className="flex flex-col justify-center leading-none px-0.5">
                <span className={cn("text-[9px] font-bold uppercase tracking-wider hidden sm:inline", isDark ? "text-cyan-400/75" : "text-slate-400")}>
                  Credit
                </span>
                <span className={cn("text-xs sm:text-[13px] font-bold font-mono tracking-tight whitespace-nowrap sm:mt-0.5", isDark ? "text-white" : "text-slate-900")}>
                  {/* Desktop / Tablet: Full Rupiah */}
                  <span className="hidden sm:inline">
                    {formatRupiah(userBalance || 0)}
                  </span>
                  {/* Mobile: Compact when in millions (e.g. Rp 1,5 jt) to prevent header overflow */}
                  <span className="inline sm:hidden">
                    {formatCompactRupiah(userBalance || 0)}
                  </span>
                </span>
              </div>

              <span
                className={cn(
                  "h-7 w-7 sm:h-8 sm:w-auto sm:px-2.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all shrink-0",
                  isDark
                    ? "bg-cyan-400 group-hover:bg-cyan-300 text-slate-950 shadow-2xs"
                    : "bg-cyan-500 group-hover:bg-cyan-600 text-white"
                )}
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.75]" />
                <span className="hidden sm:inline">Top Up</span>
              </span>
            </Link>

            {/* 2. Utility Action Dock (Theme + Notifications) */}
            <div
              className={cn(
                "h-9 sm:h-10 p-0.5 sm:p-1 flex items-center gap-0.5 sm:gap-1 rounded-xl border relative shrink-0",
                isDark ? "bg-white/[0.02] border-white/[0.08]" : "bg-slate-100/80 border-slate-200/80"
              )}
            >
              <button
                type="button"
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                aria-label="Toggle Theme"
                title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                className={cn(
                  "w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all group outline-none cursor-pointer",
                  isDark
                    ? "text-zinc-400 hover:text-white hover:bg-white/[0.07]"
                    : "text-slate-500 hover:text-slate-900 hover:bg-white shadow-2xs"
                )}
              >
                {isDark ? (
                  <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 group-hover:rotate-12 text-amber-300/90" />
                ) : (
                  <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 group-hover:-rotate-12" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowProfileMenu(false);
                }}
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                title="Notifications"
                className={cn(
                  "w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all relative group outline-none cursor-pointer",
                  showNotifications
                    ? isDark ? "bg-white/[0.1] text-cyan-400" : "bg-white text-cyan-700 shadow-2xs"
                    : isDark ? "text-zinc-400 hover:text-white hover:bg-white/[0.07]" : "text-slate-500 hover:text-slate-900 hover:bg-white"
                )}
              >
                <Bell className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform", showNotifications ? "animate-ring" : "group-hover:rotate-12")} aria-hidden="true" />
                {unreadCount > 0 && (
                  <span
                    aria-live="polite"
                    className={cn(
                      "absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center ring-2",
                      isDark ? "ring-[#0a0a0c]" : "ring-white"
                    )}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <>
                  <button type="button" aria-label="Close notifications" className="fixed inset-0 z-40 cursor-default" onClick={() => setShowNotifications(false)} />
                  <div className={cn("fixed top-[72px] left-4 right-4 sm:absolute sm:top-12 sm:right-0 sm:left-auto sm:w-80 border rounded-2xl shadow-2xl z-50 overflow-hidden transform origin-top sm:origin-top-right transition-all", isDark ? "bg-[#0c0c0e] border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.85)]" : "bg-white border-slate-200 shadow-xl")}>
                    <div className={cn("p-4 border-b flex items-center justify-between", isDark ? "border-white/10" : "border-slate-100")}>
                      <h3 className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-900")}>Notifications</h3>
                      <div className="flex items-center gap-3">
                        {notifications.length > 0 && (
                          <button
                            onClick={handleMarkAllAsRead}
                            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                          >
                            Mark all read
                          </button>
                        )}
                        <Link href="/dashboard/notifications" onClick={() => setShowNotifications(false)} className={cn("text-xs font-medium", isDark ? "text-zinc-400 hover:text-white" : "text-slate-500 hover:text-slate-900")}>
                          View All
                        </Link>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className={cn("p-6 text-center text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>
                          No new notifications
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <Link
                            key={notif.id}
                            href={notif.link || `/dashboard`}
                            onClick={() => setShowNotifications(false)}
                            className={cn("block p-3.5 border-b transition-colors", isDark ? "border-white/5 hover:bg-white/[0.04]" : "border-slate-100 hover:bg-slate-50")}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className={cn("font-semibold text-xs sm:text-sm truncate", isDark ? "text-white" : "text-slate-900")}>{notif.subject || 'No Subject'}</div>
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
                            <div className={cn("text-xs mt-1 truncate", isDark ? "text-zinc-400" : "text-slate-500")}>
                              <span className="font-medium text-cyan-500 mr-1">{notif.type}</span>
                              {notif.name} - {notif.content}
                            </div>
                            <div className={cn("text-[10px] mt-1.5", isDark ? "text-zinc-500" : "text-slate-400")}>{new Date(notif.createdAt).toLocaleString()}</div>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Vertical Divider */}
            <div className={cn("h-7 w-[1px] hidden sm:block", isDark ? "bg-white/[0.08]" : "bg-slate-200")} />

            {/* 3. Interactive User Profile Pill & Quick Menu */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowProfileMenu(!showProfileMenu);
                  setShowNotifications(false);
                }}
                className={cn(
                  "group h-9 sm:h-10 flex items-center gap-2.5 p-0.5 sm:p-1 sm:pl-3 sm:pr-2 rounded-xl border transition-all duration-200 cursor-pointer text-left",
                  showProfileMenu
                    ? isDark ? "bg-white/[0.06] border-cyan-500/40" : "bg-slate-100 border-cyan-500/40"
                    : isDark
                      ? "bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.08] hover:border-white/[0.15]"
                      : "bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs"
                )}
              >
                <div className="hidden sm:flex flex-col items-end justify-center leading-none">
                  <span className={cn("text-xs sm:text-[13px] font-bold tracking-tight truncate max-w-[150px]", isDark ? "text-white" : "text-slate-900")}>
                    {userName}
                  </span>
                  <span className={cn("text-[10px] truncate max-w-[150px] mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>
                    {userEmail}
                  </span>
                </div>

                <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-lg p-[1.5px] bg-gradient-to-br from-cyan-400 via-cyan-500 to-blue-600 shrink-0 shadow-xs">
                  <div className={cn("w-full h-full rounded-[6.5px] flex items-center justify-center overflow-hidden", isDark ? "bg-[#0a0a0c]" : "bg-slate-900")}>
                    {userImage ? (
                      <img referrerPolicy="no-referrer" src={userImage} alt={userName} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <span className="text-xs font-bold text-white">
                        {userName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2",
                      isDark ? "ring-[#0a0a0c]" : "ring-white"
                    )}
                    title="Online"
                  />
                </div>

                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 hidden sm:block transition-transform duration-200",
                    isDark ? "text-zinc-500 group-hover:text-zinc-300" : "text-slate-400 group-hover:text-slate-700",
                    showProfileMenu && "rotate-180 text-cyan-400"
                  )}
                />
              </button>

              {showProfileMenu && (
                <>
                  <button
                    type="button"
                    aria-label="Close profile menu"
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setShowProfileMenu(false)}
                  />
                  <div
                    className={cn(
                      "absolute right-0 top-12 w-60 rounded-2xl border p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150",
                      isDark
                        ? "bg-[#0c0c0e] border-white/[0.1] shadow-[0_20px_50px_rgba(0,0,0,0.85)]"
                        : "bg-white border-slate-200 shadow-xl"
                    )}
                  >
                    <div className={cn("px-3 py-2.5 mb-1 border-b", isDark ? "border-white/[0.07]" : "border-slate-100")}>
                      <div className={cn("text-xs font-bold truncate", isDark ? "text-white" : "text-slate-900")}>
                        {userName}
                      </div>
                      <div className={cn("text-[11px] truncate mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                        {userEmail}
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <Link
                        href="/dashboard/settings"
                        onClick={() => setShowProfileMenu(false)}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors",
                          isDark ? "text-zinc-300 hover:text-white hover:bg-white/[0.05]" : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                        )}
                      >
                        <Settings className="w-4 h-4 text-cyan-400" />
                        Account Settings
                      </Link>
                      <Link
                        href="/dashboard/billing"
                        onClick={() => setShowProfileMenu(false)}
                        className={cn(
                          "flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors",
                          isDark ? "text-zinc-300 hover:text-white hover:bg-white/[0.05]" : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                        )}
                      >
                        <span className="flex items-center gap-2.5">
                          <Wallet className="w-4 h-4 text-cyan-400" />
                          Billing & Wallet
                        </span>
                        <span className="text-[10px] font-mono font-bold text-cyan-400">
                          {formatRupiah(userBalance || 0)}
                        </span>
                      </Link>
                      <Link
                        href="/dashboard/api-keys"
                        onClick={() => setShowProfileMenu(false)}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors",
                          isDark ? "text-zinc-300 hover:text-white hover:bg-white/[0.05]" : "text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                        )}
                      >
                        <Key className="w-4 h-4 text-amber-400" />
                        API Keys
                      </Link>
                    </div>

                    <div className={cn("mt-1 pt-1 border-t", isDark ? "border-white/[0.07]" : "border-slate-100")}>
                      <button
                        type="button"
                        onClick={() => {
                          setShowProfileMenu(false);
                          handleLogout();
                        }}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer",
                          isDark ? "text-rose-400 hover:bg-rose-500/10" : "text-rose-600 hover:bg-rose-50"
                        )}
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 min-w-0 w-full max-w-full overflow-y-auto overflow-x-hidden relative">
          <div className="w-full max-w-full min-w-0 p-3.5 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 box-border">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
