"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, FolderGit2, FileText, MessageSquare, Settings, LogOut, Menu, Search, Bell, MessageCircle, Briefcase, ShieldBan, ShieldAlert, Heart, Mail, Users, HardDrive, Calendar, BookOpen, LayoutList, Bot, Key, Database, Receipt, CreditCard, Server, Ticket, Network, Terminal, Activity, Gift, DollarSign, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SIDEBAR_LINKS = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard, color: "text-cyan-400", group: "Overview" },

  { name: "Portfolio", href: "/admin/portfolio", icon: FolderGit2, color: "text-purple-400", group: "Content Management" },
  { name: "Series", href: "/admin/series", icon: BookOpen, color: "text-cyan-400", group: "Content Management" },
  { name: "Blog", href: "/admin/blog", icon: FileText, color: "text-emerald-400", group: "Content Management" },
  { name: "Events & Jobs", href: "/admin/opportunities", icon: Calendar, color: "text-amber-400", group: "Content Management" },
  { name: "Resume Data", href: "/admin/resume", icon: Briefcase, color: "text-teal-400", group: "Content Management" },

  { name: "Testimonials", href: "/admin/testimonials", icon: Heart, color: "text-pink-400", group: "Engagement & Community" },
  { name: "Comments", href: "/admin/comments", icon: MessageCircle, color: "text-indigo-400", group: "Engagement & Community" },
  { name: "Messages", href: "/admin/messages", icon: MessageSquare, color: "text-cyan-400", group: "Engagement & Community" },
  { name: "Live Chat", href: "/admin/live-chat", icon: MessageSquare, color: "text-cyan-300", group: "Engagement & Community" },
  { name: "Chat History", href: "/admin/chat-history", icon: Bot, color: "text-rose-400", group: "Engagement & Community" },
  { name: "Newsletter", href: "/admin/newsletter", icon: Mail, color: "text-orange-400", group: "Engagement & Community" },
  { name: "Community", href: "/admin/community", icon: Users, color: "text-fuchsia-400", group: "Engagement & Community" },

  { name: "Proxmox VPS", href: "/admin/vps", icon: Terminal, color: "text-cyan-500", group: "Cloud Services" },
  { name: "VPC Routers", href: "/admin/vpc-routers", icon: Network, color: "text-cyan-500", group: "Cloud Services" },
  { name: "Secure Media", href: "/admin/media", icon: HardDrive, color: "text-sky-400", group: "Cloud Services" },

  { name: "Customers", href: "/admin/customers", icon: Users, color: "text-cyan-500", group: "Billing & Subscriptions" },
  { name: "Invoices", href: "/admin/invoices", icon: Receipt, color: "text-emerald-500", group: "Billing & Subscriptions" },
  { name: "Subscription Plans", href: "/admin/plans", icon: LayoutList, color: "text-cyan-400", group: "Billing & Subscriptions" },
  { name: "Vouchers & Discounts", href: "/admin/vouchers", icon: Ticket, color: "text-rose-400", group: "Billing & Subscriptions" },
  { name: "Payment Settings", href: "/admin/payment-settings", icon: CreditCard, color: "text-amber-500", group: "Billing & Subscriptions" },
  { name: "Support Tickets", href: "/admin/tickets", icon: MessageSquare, color: "text-cyan-400", group: "Billing & Subscriptions" },
  { name: "Affiliate System", href: "/admin/affiliate", icon: Gift, color: "text-purple-400", group: "Affiliate" },
  { name: "PAYG Monitor", href: "/admin/payg-monitor", icon: Activity, color: "text-cyan-400", group: "Billing & Subscriptions" },
  { name: "Revenue", href: "/admin/revenue", icon: DollarSign, color: "text-emerald-400", group: "Billing & Subscriptions" },

  { name: "Resellers", href: "/admin/resellers", icon: Users, color: "text-amber-400", group: "System & Security" },
  { name: "API Hub Users", href: "/admin/api-hub", icon: Key, color: "text-indigo-500", group: "System & Security" },
  { name: "Blocked Users", href: "/admin/blocked", icon: ShieldBan, color: "text-red-400", group: "System & Security" },
  { name: "Login Logs", href: "/admin/login-logs", icon: ShieldAlert, color: "text-violet-400", group: "System & Security" },
  { name: "Announcements", href: "/admin/announcements", icon: Bell, color: "text-cyan-400", group: "System & Security" },
  { name: "Menu Order", href: "/admin/settings/menu-order", icon: LayoutList, color: "text-yellow-400", group: "System & Security" },
  { name: "Settings", href: "/admin/settings", icon: Settings, color: "text-zinc-300", group: "System & Security" },
];

export default function AdminLayout({
  children,
  initialName,
  initialImage
}: {
  children: React.ReactNode;
  initialName?: string;
  initialImage?: string | null;
}) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profileData, setProfileData] = useState<{ name: string, image: string | null }>({ name: initialName || "Admin", image: initialImage || null });
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const searchResults = searchQuery.trim() === ""
    ? []
    : SIDEBAR_LINKS.filter(link => link.name.toLowerCase().includes(searchQuery.toLowerCase()));

  useEffect(() => {
    // Initial fetch for count only
    const fetchUnreadCount = () => {
      fetch(`/api/admin/notifications?countOnly=true&t=${Date.now()}`, { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (!data.error && data.totalNotifications !== undefined) {
            setUnreadCount(data.totalNotifications);
          }
        })
        .catch(err => console.debug('admin fetch count error:', err));
        
      // Ping user presence
      fetch('/api/user/ping', { method: 'POST' }).catch(() => {});
    };

    const fetchProfile = () => {
      fetch('/api/admin/settings')
        .then(res => res.json())
        .then(data => {
          if (!data.error && data.user) {
            setProfileData({
              name: data.user.name || "Admin",
              image: data.settings?.profileImage || null
            });
          }
        })
        .catch(err => console.debug('fetchProfile error:', err));
    };

    fetchUnreadCount();
    fetchProfile();
    const interval = setInterval(fetchUnreadCount, 15000); // Check every 15s

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUnreadCount();
      }
    };

    window.addEventListener('profileUpdated', fetchProfile);
    window.addEventListener('notificationsUpdated', fetchUnreadCount);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', fetchUnreadCount);

    return () => {
      clearInterval(interval);
      window.removeEventListener('profileUpdated', fetchProfile);
      window.removeEventListener('notificationsUpdated', fetchUnreadCount);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', fetchUnreadCount);
    };
  }, []);



  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      toast.success("Signed out successfully");
      setTimeout(() => {
        window.location.href = '/login';
      }, 500);
    } catch (error) {
      console.error('Logout failed', error);
      toast.error("Failed to sign out");
      setTimeout(() => {
        window.location.href = '/login';
      }, 500);
    }
  };
  const handleMarkAllAsRead = async () => {
    try {
      await fetch('/api/admin/notifications/mark-all', { method: 'POST' });
      // Keep comments/groups but remove messages/tickets that were marked read
      setNotifications(prev => prev.filter(n => !['MESSAGE', 'TICKET'].includes(n.type)));
      // Fire event so that layout updates unread count
      window.dispatchEvent(new Event('notificationsUpdated'));
    } catch (err) {
      console.error('Failed to mark admin notifications as read', err);
    }
  };

  const toggleNotifications = () => {
    if (!showNotifications) {
      // Fetch notifications when opening
      fetch(`/api/admin/notifications?limit=5&t=${Date.now()}`, { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            setNotifications(data);
          }
        })
        .catch(console.error);
    }
    setShowNotifications(!showNotifications);
  };

  return (
    <div className="flex h-[100dvh] bg-background relative overflow-hidden selection:bg-cyan-500/30 text-zinc-100">

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-[#0A0B1A]/80 backdrop-blur-sm lg:hidden cursor-default"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label="Admin navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 glass border-r border-white/5 transform transition-transform duration-300 lg:translate-x-0 lg:relative lg:inset-0 flex flex-col h-full",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className={cn("h-16 flex items-center px-6 border-b shrink-0", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
          <Link href="/" className="flex items-center group w-fit">
              <img
                src={isDark ? "/masdika-logo-dark-mode.svg" : "/masdika-logo-light-mode.svg"}
                alt="Masdika Logo"
                className="h-8 w-auto"
              />
            </Link>
        </div>

        <div className="p-4 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          {Object.entries(
            SIDEBAR_LINKS.reduce((acc, link) => {
              if (!acc[link.group]) acc[link.group] = [];
              acc[link.group].push(link);
              return acc;
            }, {} as Record<string, typeof SIDEBAR_LINKS>)
          ).map(([groupName, links]) => (
            <div key={groupName}>
              <h3 className="px-3 mb-2 text-xs font-bold text-zinc-500 uppercase tracking-wider">{groupName}</h3>
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
                        isActive ? "bg-cyan-500 text-slate-900 shadow-md font-bold" : cn("transition-colors", isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100")
                      )}
                    >
                      <link.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive ? "text-slate-900" : cn("group-hover:scale-110 transition-transform", isDark ? "text-cyan-500/60 group-hover:text-cyan-400" : "text-slate-400 group-hover:text-cyan-600"))} />
                      <span className="relative z-10">{link.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className={cn("shrink-0 w-full h-[72px] flex items-center px-4 border-t bg-background/80 backdrop-blur-sm z-10 mt-auto", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
          <button
            onClick={() => {
              setSidebarOpen(false);
              handleLogout();
            }}
            aria-label="Sign out"
            className={cn("flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium transition-colors", isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100")}
          >
            <LogOut className="w-5 h-5" aria-hidden="true" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden z-10 relative">
        {/* Topbar */}
        <header className={cn("shrink-0 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 glass border-b sticky top-0 z-30", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
          <div className="flex items-center flex-1 gap-6">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
              className={cn("lg:hidden p-2 hover:text-cyan-400 transition-colors group flex flex-col items-center justify-center w-10 h-10 gap-1.5 relative focus:outline-none", isDark ? "text-zinc-400" : "text-slate-500")}
            >
              <span className="w-6 h-[2px] bg-current rounded-full transform transition-all duration-300 ease-out origin-center" />
              <span className="w-6 h-[2px] bg-current rounded-full transform transition-all duration-300 ease-out origin-center" />
              <span className="w-6 h-[2px] bg-current rounded-full transform transition-all duration-300 ease-out origin-center" />
            </button>

            <div className="hidden lg:flex items-center max-w-md w-full relative z-50">
              <Search className={cn("w-4 h-4 absolute left-4 z-10 pointer-events-none", isDark ? "text-zinc-400" : "text-slate-400")} />
              <input
                type="text"
                placeholder="Search menus..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                className={cn("w-full backdrop-blur-md border text-sm rounded-full pl-11 pr-4 py-2.5 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner", isDark ? "bg-[#0A0B1A]/50 border-white/5 text-white placeholder:text-zinc-500" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400")}
              />

              {/* Search Results Dropdown */}
              {isSearchFocused && searchQuery.trim() !== "" && (
                <div className={cn("absolute top-full mt-2 w-full bg-slate-900/95 backdrop-blur-sm border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200", isDark ? "border-white/10" : "border-slate-200")}>
                  <div className="max-h-64 overflow-y-auto p-2">
                    {searchResults.length > 0 ? (
                      searchResults.map(link => (
                        <Link
                          key={link.name}
                          href={link.href}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group"
                        >
                          <link.icon className={cn("w-4 h-4", link.color)} />
                          <span className="text-sm font-medium text-zinc-200 group-hover:text-white">{link.name}</span>
                        </Link>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-zinc-500">
                        No results found for "{searchQuery}"
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 ml-auto">
            <div className="flex items-center gap-4 relative">
              <button onClick={() => setTheme(isDark ? 'light' : 'dark')} aria-label="Toggle Theme" className={cn("transition-colors relative group outline-none", isDark ? "text-zinc-400 hover:text-white" : "text-slate-400 hover:text-slate-900")}>
                {isDark ? <Sun className="w-5 h-5 transition-transform group-hover:rotate-12" /> : <Moon className="w-5 h-5 transition-transform group-hover:-rotate-12" />}
              </button>
              <button onClick={toggleNotifications} aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`} className={cn("hover:text-white transition-colors relative group outline-none", isDark ? "text-zinc-400" : "text-slate-500")}>
                <Bell className={cn("w-5 h-5 transition-transform", showNotifications ? "animate-ring" : "group-hover:rotate-12")} aria-hidden="true" />
                {unreadCount > 0 && (
                  <span aria-live="polite" className={cn("absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center border-2 border-background", isDark ? "text-white" : "text-slate-900")}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <>
                  <button type="button" aria-label="Close notifications" className="fixed inset-0 z-40 cursor-default" onClick={() => setShowNotifications(false)} />
                  <div className={cn("fixed top-[72px] left-4 right-4 sm:absolute sm:top-12 sm:right-0 sm:left-auto sm:w-80 bg-slate-900/95 backdrop-blur-sm border rounded-2xl shadow-2xl z-50 overflow-hidden transform origin-top sm:origin-top-right transition-all", isDark ? "border-white/10" : "border-slate-200")}>
                    <div className={cn("p-4 border-b flex items-center justify-between", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                      <h3 className={cn("font-bold drop-shadow-sm", isDark ? "text-white" : "text-slate-900")}>Notifications</h3>
                      <div className="flex items-center gap-3">
                        {notifications.length > 0 && (
                          <button
                            onClick={handleMarkAllAsRead}
                            className={cn("text-xs hover:text-cyan-300 transition-colors", isDark ? "text-cyan-400" : "text-cyan-700")}
                          >
                            Mark all as read
                          </button>
                        )}
                        <Link href="/admin/notifications" onClick={() => setShowNotifications(false)} className={cn("text-xs hover:text-white", isDark ? "text-zinc-400" : "text-slate-500")}>
                          View All
                        </Link>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className={cn("p-6 text-center text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
                          No new notifications
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <Link
                            key={notif.id}
                            href={notif.link || `/admin/messages`}
                            onClick={() => setShowNotifications(false)}
                            className={cn("block p-4 border-b transition-colors", isDark ? "bg-[#0A0B1A]/50 border-white/5 hover:bg-white/5" : "bg-white border-slate-200 hover:bg-slate-50")}
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
                            <div className={cn("text-xs mt-1 truncate", isDark ? "text-zinc-400" : "text-slate-500")}>
                              <span className={cn("font-medium mr-1", isDark ? "text-cyan-500" : "text-cyan-700")}>{notif.type}</span>
                              {notif.name} - {notif.content}
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-2">{new Date(notif.createdAt).toLocaleString()}</div>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <Link href="/admin/settings" aria-label={`Go to settings for ${profileData.name}`} className={cn("flex items-center gap-3 pl-4 border-l hover:opacity-80 transition-opacity", isDark ? "border-white/10" : "border-slate-200")}>
              <div className="text-right hidden sm:block" aria-hidden="true">
                <div className={cn("text-sm font-bold leading-tight", isDark ? "text-white" : "text-slate-900")}>{profileData.name}</div>
                <div className={cn("text-xs", isDark ? "text-zinc-300" : "text-slate-600")}>Super Admin</div>
              </div>
              <div className={cn("w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center font-bold overflow-hidden border", isDark ? "text-white border-white/10" : "text-slate-900 border-slate-200")}>
                {profileData.image ? (
                  <img referrerPolicy="no-referrer" src={profileData.image} alt={`${profileData.name} profile picture`} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <span aria-hidden="true">{profileData.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
            </Link>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>

        {/* Footer */}
        {!(pathname?.match(/\/admin\/tickets\/(tkt-[a-z0-9-]+)/i)) && (
          <footer className="py-3 md:py-0 md:h-[60px] flex items-center px-4 sm:px-6 lg:px-8 text-zinc-500 shrink-0 z-10 mt-auto">
            <div className="w-full flex flex-col md:flex-row items-center justify-between gap-1.5 md:gap-2 text-[10px] sm:text-sm text-center md:text-left">
              <p>&copy; {new Date().getFullYear()} PT Masdika Teknologi Indonesia. All rights reserved.</p>
              <div className="flex items-center gap-1.5">
                <span>Crafted with</span>
                <Heart className={cn("w-4 h-4 fill-red-500 animate-pulse", isDark ? "text-red-500" : "text-red-700")} />
                <span>by</span>
                <Link href="/" target="_blank" className={cn("font-bold hover:text-cyan-300 transition-colors", isDark ? "text-cyan-400" : "text-cyan-700")}>
                  Masdika
                </Link>
              </div>
            </div>
          </footer>
        )}
      </main>
    </div>
  );
}
