"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown, Calendar, Briefcase, Users, FileText, ChevronRight, Home, User, Server, LayoutDashboard, Mail, Compass, BookOpen, UploadCloud, Code, CodeXml, Link2, Database, Cloud, Box, HardDrive, Terminal, Sun, Moon } from "lucide-react";
import { SiKubernetes } from "react-icons/si";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";

const NAV_LINKS = [
  { name: "Home", href: "/", icon: Home, color: "text-cyan-400", bgColor: "bg-cyan-500/10" },
  { name: "Profile", href: "#", hasMegaMenu: true, icon: Briefcase, color: "text-cyan-400", bgColor: "bg-cyan-500/10" },
  { name: "Explore", href: "#", hasMegaMenu: true, icon: Compass, color: "text-cyan-400", bgColor: "bg-cyan-500/10" },
  { name: "Developers", href: "#", hasMegaMenu: true, icon: Code, color: "text-cyan-400", bgColor: "bg-cyan-500/10" },
  { name: "Contact", href: "/contact", icon: Mail, color: "text-cyan-400", bgColor: "bg-cyan-500/10" },
];

const EXPLORE_MENU_ITEMS = [
  {
    title: "Events & Webinars",
    description: "Join the latest tech events and learn from the experts.",
    href: "/events",
    icon: Calendar,
    badge: "New",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10"
  },
  {
    title: "Job Vacancies",
    description: "Discover the best career opportunities in the tech industry.",
    href: "/vacancies",
    icon: Briefcase,
    badge: "New",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10"
  },
  {
    title: "Community",
    description: "Connect and discuss with other developers in the community.",
    href: "/community",
    icon: Users,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10"
  },
  {
    title: "Blog & Articles",
    description: "Read our latest technical insights and tutorials.",
    href: "/blog",
    icon: FileText,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10"
  },
  {
    title: "Series",
    description: "Structured learning paths covering networking, cloud, DevOps, and more.",
    href: "/series",
    icon: BookOpen,
    badge: "New",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10"
  }
];

const COMPANY_MENU_ITEMS = [
  {
    title: "About",
    description: "Learn more about who we are and what we do.",
    href: "/resume",
    icon: User,
    badge: undefined as string | undefined,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10"
  },
  {
    title: "Services",
    description: "Professional services tailored for your needs.",
    href: "/services",
    icon: Server,
    badge: undefined as string | undefined,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10"
  },
  {
    title: "Portfolio",
    description: "A showcase of our past projects and achievements.",
    href: "/portfolio",
    icon: LayoutDashboard,
    badge: undefined as string | undefined,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10"
  },
  {
    title: "Skills",
    description: "Our technical capabilities and core competencies.",
    href: "/skills",
    icon: Compass,
    badge: undefined as string | undefined,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10"
  }
];

const DEV_MENU_ITEMS = [
  {
    title: "Reseller API",
    description: "White-label VPS provisioning API for hosting providers.",
    href: "/reseller-api",
    icon: CodeXml,
    badge: "New",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10"
  },
  {
    title: "File CDN",
    description: "Securely upload temporary files up to 100MB.",
    href: "/file-cdn",
    icon: UploadCloud,
    badge: "New",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10"
  },
  {
    title: "API Hub",
    description: "Discover and test public REST APIs for your projects.",
    href: "/api-hub",
    icon: CodeXml,
    badge: "New",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10"
  },
  {
    title: "URL Shortener",
    description: "Create premium short links with custom aliases.",
    href: "/shortener",
    icon: Link2,
    badge: "New",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10"
  },

  {
    title: "Cloud VPS",
    description: "High-performance virtual private servers with high-speed storage.",
    href: "/vps",
    icon: Terminal,
    badge: "Premium",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10"
  },
  {
    title: "Kubernetes (K3s)",
    description: "Lightweight, fully managed Kubernetes clusters.",
    href: "/k3s",
    icon: SiKubernetes,
    badge: "Premium",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10"
  }
];

export function Navbar({ socialLinks }: { socialLinks?: any }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isMenuScrolled, setIsMenuScrolled] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileExploreOpen, setMobileExploreOpen] = useState(false);
  const [mobileDevOpen, setMobileDevOpen] = useState(false);
  const [mobileCompanyOpen, setMobileCompanyOpen] = useState(false);
  const [exploreItems, setExploreItems] = useState(EXPLORE_MENU_ITEMS);
  const [devItems, setDevItems] = useState(DEV_MENU_ITEMS);
  const [companyItems, setCompanyItems] = useState(COMPANY_MENU_ITEMS);
  const [session, setSession] = useState<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const handleMouseEnter = (menu: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveMenu(menu);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveMenu(null);
    }, 150);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      setActiveMenu(null);
      setIsOpen(false);
    }, 0);
    return () => clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.ok ? res.json() : { user: null })
      .then(data => {
        if (data && data.user) {
          setSession(data.user);
        }
      })
      .catch(() => { });
  }, []);

  // Load menu order and badges from settings
  useEffect(() => {
    fetch('/api/settings/menu-order')
      .then(r => r.json())
      .then(({ order, badges = {}, devOrder, devBadges = {}, companyOrder, companyBadges = {} }) => {
        if (Array.isArray(order)) {
          const keyMap: Record<string, typeof EXPLORE_MENU_ITEMS[0]> = {};
          EXPLORE_MENU_ITEMS.forEach(item => { keyMap[item.href.replace('/', '')] = item; });
          const sorted = order.map((k: string) => {
            const item = keyMap[k];
            if (!item) return null;
            return { ...item, badge: badges[k] === false ? undefined : (badges[k] !== undefined ? String(badges[k]) : item.badge) };
          }).filter(Boolean) as typeof EXPLORE_MENU_ITEMS;
          EXPLORE_MENU_ITEMS.forEach(item => {
            if (!order.includes(item.href.replace('/', ''))) sorted.push(item);
          });
          setExploreItems(sorted);
        }
        if (Array.isArray(devOrder)) {
          const devKeyMap: Record<string, typeof DEV_MENU_ITEMS[0]> = {};
          DEV_MENU_ITEMS.forEach(item => {
            let key = item.href.replace('/', '');
            if (key === 'file-cdn') key = 'upload';
            devKeyMap[key] = item;
          });
          const devSorted = devOrder.map((k: string) => {
            const item = devKeyMap[k];
            if (!item) return null;
            return { ...item, badge: devBadges[k] === false ? undefined : (devBadges[k] !== undefined ? String(devBadges[k]) : item.badge) };
          }).filter(Boolean) as typeof DEV_MENU_ITEMS;
          DEV_MENU_ITEMS.forEach(item => {
            let key = item.href.replace('/', '');
            if (key === 'file-cdn') key = 'upload';
            if (!devOrder.includes(key)) devSorted.push(item);
          });
          setDevItems(devSorted);
        }
        if (Array.isArray(companyOrder)) {
          const companyKeyMap: Record<string, typeof COMPANY_MENU_ITEMS[0]> = {};
          COMPANY_MENU_ITEMS.forEach(item => {
            let key = item.href.replace('/', '');
            if (key === 'resume') key = 'about'; // Map /resume to 'about' key
            companyKeyMap[key] = item;
          });
          const companySorted = companyOrder.map((k: string) => {
            const item = companyKeyMap[k];
            if (!item) return null;
            return { ...item, badge: companyBadges[k] === false ? undefined : (companyBadges[k] !== undefined ? String(companyBadges[k]) : item.badge) };
          }).filter(Boolean) as typeof COMPANY_MENU_ITEMS;
          COMPANY_MENU_ITEMS.forEach(item => {
            let key = item.href.replace('/', '');
            if (key === 'resume') key = 'about';
            if (!companyOrder.includes(key)) companySorted.push(item);
          });
          setCompanyItems(companySorted);
        }
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-300",
        isOpen
          ? (isDark ? "bg-[#050B14] shadow-xl" : "bg-white shadow-xl")
          : (scrolled ? (isDark ? "bg-[#050B14]/95 backdrop-blur-md shadow-xl" : "bg-white/95 backdrop-blur-md shadow-lg") : "bg-transparent"),
        scrolled ? "py-3" : "py-5",
        (scrolled && !isOpen) && (isDark ? "border-b border-white/5" : "border-b border-black/5")
      )}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex items-center justify-between h-12 relative">

          {/* Logo */}
          <div className="flex-shrink-0 z-10">
            <Link href="/" className="flex items-center group w-fit">
              <img
                src={isDark ? "/masdika-logo-dark-mode.svg" : "/masdika-logo-light-mode.svg"}
                alt="Masdika Logo"
                className="h-8 w-auto"
              />
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden lg:flex flex-1 justify-center relative z-10">
            <div className="flex items-center space-x-2 xl:space-x-4">
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href) && link.href !== "#");

                if (link.hasMegaMenu) {
                  let isMegaMenuActive = false;
                  if (link.name === 'Explore') {
                    isMegaMenuActive = exploreItems.some(item => pathname === item.href || pathname.startsWith(item.href + '/'));
                  } else if (link.name === 'Profile') {
                    isMegaMenuActive = companyItems.some(item => pathname === item.href || pathname.startsWith(item.href + '/'));
                  } else if (link.name === 'Developers') {
                    isMegaMenuActive = devItems.some(item => pathname === item.href || pathname.startsWith(item.href + '/'));
                  }

                  return (
                    <div
                      key={link.name}
                      className="relative group"
                      onMouseEnter={() => handleMouseEnter(link.name)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <button
                        onClick={() => setActiveMenu(prev => prev === link.name ? null : link.name)}
                        className={cn(
                          "px-4 py-2 rounded-lg text-[15px] font-bold transition-all flex items-center gap-1.5 outline-none relative",
                          activeMenu === link.name || isMegaMenuActive ? "text-white" : "text-white/80 hover:text-white hover:bg-white/5"
                        )}
                      >
                        {link.name}
                        <ChevronDown className={cn(
                          "w-4 h-4 transition-transform duration-300",
                          activeMenu === link.name ? "rotate-180" : ""
                        )} />
                        <span className={cn(
                          "absolute bottom-1 left-4 right-[38px] h-0.5 bg-cyan-400 transition-transform duration-300 origin-left",
                          isMegaMenuActive || activeMenu === link.name ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                        )}></span>
                      </button>
                    </div>
                  );
                }

                return (
                  <Link
                    key={link.name}
                    href={link.href}

                    className={cn(
                      "px-4 py-2 rounded-lg text-[15px] font-bold transition-all relative group",
                      isActive ? "text-white" : "text-white/80 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {link.name}
                    <span className={cn(
                      "absolute bottom-1 left-4 right-4 h-0.5 bg-cyan-400 transition-transform duration-300 origin-left",
                      isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                    )}></span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right side icons */}
          <div className="hidden md:flex items-center gap-3 z-10">
            <div className="flex items-center gap-2">
              <a href={socialLinks?.social_facebook || '#'} target="_blank" rel="noopener noreferrer" className={cn("w-9 h-9 rounded-full border flex items-center justify-center transition-all duration-300", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:text-cyan-500 hover:bg-cyan-600/20 hover:border-cyan-500/50 hover:shadow-[0_0_8px_rgba(6,182,212,0.2)]" : "bg-cyan-50 border-cyan-200 text-cyan-700 hover:text-cyan-800 hover:bg-cyan-100 hover:border-cyan-300")}>
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z"></path></svg>
              </a>
              <a href={socialLinks?.social_twitter || '#'} target="_blank" rel="noopener noreferrer" className={cn("w-9 h-9 rounded-full border flex items-center justify-center transition-all duration-300", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:text-cyan-500 hover:bg-cyan-600/20 hover:border-cyan-500/50 hover:shadow-[0_0_8px_rgba(6,182,212,0.2)]" : "bg-cyan-50 border-cyan-200 text-cyan-700 hover:text-cyan-800 hover:bg-cyan-100 hover:border-cyan-300")}>
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
              </a>
              <a href={socialLinks?.social_linkedin || '#'} target="_blank" rel="noopener noreferrer" className={cn("w-9 h-9 rounded-full border flex items-center justify-center transition-all duration-300", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:text-cyan-500 hover:bg-cyan-600/20 hover:border-cyan-500/50 hover:shadow-[0_0_8px_rgba(6,182,212,0.2)]" : "bg-cyan-50 border-cyan-200 text-cyan-700 hover:text-cyan-800 hover:bg-cyan-100 hover:border-cyan-300")}>
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"></path></svg>
              </a>
              <a href={socialLinks?.social_instagram || '#'} target="_blank" rel="noopener noreferrer" className={cn("w-9 h-9 rounded-full border flex items-center justify-center transition-all duration-300", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:text-cyan-500 hover:bg-cyan-600/20 hover:border-cyan-500/50 hover:shadow-[0_0_8px_rgba(6,182,212,0.2)]" : "bg-cyan-50 border-cyan-200 text-cyan-700 hover:text-cyan-800 hover:bg-cyan-100 hover:border-cyan-300")}>
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm3.98-10.98a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"></path></svg>
              </a>
            </div>
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300",
                isDark
                  ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20"
                  : "bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-200"
              )}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className={cn("h-6 w-px mx-1 hidden lg:block", isDark ? "bg-white/10" : "bg-black/10")}></div>
            {session ? (
              <Link
                href={session.role === 'ADMIN' ? '/admin' : '/dashboard'}
                className="ml-2 px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all text-sm flex items-center gap-2"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="ml-2 px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all text-sm flex items-center gap-2"
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center z-10">
            <button
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={isOpen}
              className="p-2 rounded-xl text-white/70 hover:text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/20 border border-transparent transition-all group flex flex-col items-end justify-center w-10 h-10 gap-1.5 overflow-hidden relative focus:outline-none"
            >
              <span className={cn("h-[2px] bg-current rounded-full transform transition-all duration-300 ease-out origin-center", isOpen ? "w-6 -rotate-45 translate-y-[8px]" : "w-6 group-hover:w-6 group-active:scale-x-90")} />
              <span className={cn("h-[2px] bg-current rounded-full transform transition-all duration-300 ease-out origin-center delay-75", isOpen ? "w-0 opacity-0" : "w-4 group-hover:w-6 group-active:scale-x-90")} />
              <span className={cn("h-[2px] bg-current rounded-full transform transition-all duration-300 ease-out origin-center", isOpen ? "w-6 rotate-45 -translate-y-[8px]" : "w-5 group-hover:w-6 group-active:scale-x-90 delay-150")} />
              <span className="absolute inset-0 bg-cyan-400/20 scale-0 group-active:scale-150 transition-transform duration-500 rounded-full opacity-0 group-active:opacity-100" />
            </button>
          </div>
        </div>

        {/* Mega Menu Dropdown */}
        <AnimatePresence>
          {(activeMenu === 'Explore' || activeMenu === 'Developers' || activeMenu === 'Profile') && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              onMouseEnter={() => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }}
              onMouseLeave={handleMouseLeave}
              className="absolute top-full left-0 right-0 pt-4 px-4 sm:px-6 lg:px-8 z-50 hidden lg:block"
            >
              <div className={cn("backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden flex", isDark ? "bg-[#050B14]/95 border border-white/10" : "bg-white/95 border border-black/5")}>
                {/* Left Panel */}
                <div className={cn("w-1/3 p-8 border-r flex flex-col justify-center relative overflow-hidden", isDark ? "bg-black/20 border-white/5" : "bg-slate-50 border-black/5")}>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

                  <h3 className={cn("text-3xl font-bold mb-4 relative z-10", isDark ? "text-white" : "text-slate-900")}>
                    {activeMenu === 'Explore' ? 'Explore' : activeMenu === 'Profile' ? 'Profile' : 'Developers'}<br />
                    <span className={cn(isDark ? "text-cyan-400" : "text-cyan-600")}>{activeMenu === 'Explore' ? 'Opportunities' : activeMenu === 'Profile' ? 'Profile & Work' : 'Tools & APIs'}</span>
                  </h3>
                  <p className={cn("mb-8 max-w-sm relative z-10", isDark ? "text-zinc-400" : "text-slate-600")}>
                    {activeMenu === 'Explore'
                      ? 'Discover new events, connect with the community, and find your next big career move.'
                      : activeMenu === 'Profile'
                        ? 'Learn about our services, view our portfolio, and discover our core expertise.'
                        : 'Build powerful integrations with our public REST APIs and secure file delivery network.'}
                  </p>

                  <Link href={activeMenu === 'Explore' ? '/opportunities' : activeMenu === 'Profile' ? '/resume' : '/api-hub'} onClick={() => { setActiveMenu(null); if (timeoutRef.current) clearTimeout(timeoutRef.current); }} className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-colors w-fit shrink-0 relative z-10 group">
                    {activeMenu === 'Explore' ? 'View All' : activeMenu === 'Profile' ? 'About Us' : 'Browse APIs'}
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                {/* Right Panel - Grid */}
                <div className="w-2/3 p-8">
                  <div className="grid grid-cols-2 gap-4">
                    {(activeMenu === 'Explore' ? exploreItems : activeMenu === 'Profile' ? companyItems : devItems).map((item) => (
                      <Link
                        key={item.title}
                        href={item.href}
                        onClick={() => { setActiveMenu(null); if (timeoutRef.current) clearTimeout(timeoutRef.current); }}
                        className={cn("group flex gap-4 p-4 rounded-xl transition-colors border items-start min-h-[88px]", isDark ? "hover:bg-white/5 border-transparent hover:border-white/10" : "hover:bg-slate-50 border-transparent hover:border-slate-200")}
                      >
                        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-transform group-hover:scale-110 group-hover:rotate-3", isDark ? cn(item.bgColor, item.color) : "bg-cyan-50 text-cyan-600 border border-cyan-100 group-hover:border-cyan-300 group-hover:bg-cyan-100")}>
                          <item.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className={cn("font-bold transition-colors text-sm leading-tight", isDark ? "text-white group-hover:text-cyan-400" : "text-slate-900 group-hover:text-cyan-600")}>{item.title}</h4>
                            {item.badge && (
                              <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0", isDark ? "bg-cyan-500/20 text-cyan-400" : "bg-cyan-100 text-cyan-700")}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className={cn("text-xs leading-snug line-clamp-2", isDark ? "text-zinc-400" : "text-slate-500")}>{item.description}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onScroll={(e) => {
              const scrolled = e.currentTarget.scrollTop > 10;
              if (scrolled !== isMenuScrolled) setIsMenuScrolled(scrolled);
            }}
            className={cn(
              "lg:hidden absolute top-[100%] w-full shadow-2xl h-[calc(100vh-72px)] overflow-y-auto",
              isDark ? "bg-[#050B14]" : "bg-white",
              isMenuScrolled && (isDark ? "border-t border-white/5" : "border-t border-black/5")
            )}
          >
            <div className="px-4 pt-4 pb-24">
              <div className="flex flex-col">
                {NAV_LINKS.map((link) => {
                  if (link.hasMegaMenu) {
                    const isExplore = link.name === 'Explore';
                    const isCompany = link.name === 'Profile';
                    const isOpenState = isExplore ? mobileExploreOpen : isCompany ? mobileCompanyOpen : mobileDevOpen;
                    const setOpenState = isExplore ? setMobileExploreOpen : isCompany ? setMobileCompanyOpen : setMobileDevOpen;
                    const menuList = isExplore ? exploreItems : isCompany ? companyItems : devItems;

                    return (
                      <div key={link.name} className="py-2 border-b border-white/5 last:border-0">
                        <button
                          onClick={() => setOpenState(!isOpenState)}
                          className={cn("w-full flex items-center justify-between px-4 py-3 rounded-xl text-base font-bold transition-all border group", isDark ? "text-white/70 hover:bg-white/5 border-transparent hover:border-white/10" : "text-slate-600 hover:bg-slate-50 border-transparent hover:border-slate-200")}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", isDark ? cn(link.bgColor, link.color) : "bg-cyan-50 text-cyan-600 border border-cyan-100")}>
                              {link.icon && <link.icon className="w-4 h-4" />}
                            </div>
                            <span className={cn(isOpenState ? (isDark ? "text-cyan-400" : "text-cyan-600") : (isDark ? "group-hover:text-white transition-colors" : "group-hover:text-slate-900 transition-colors"))}>{link.name}</span>
                          </div>
                          <ChevronDown className={cn("w-5 h-5 transition-transform duration-300", isOpenState ? (isDark ? "rotate-180 text-cyan-400" : "rotate-180 text-cyan-600") : (isDark ? "group-hover:text-white" : "group-hover:text-slate-900"))} />
                        </button>

                        <AnimatePresence>
                          {isOpenState && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="flex flex-col gap-2 mt-1 px-4 pb-3">
                                {menuList.map(item => (
                                  <Link
                                    key={item.title}
                                    href={item.href}
                                    onClick={() => { setIsOpen(false); setOpenState(false); }}
                                    className={cn("flex items-center gap-3 p-3 rounded-xl transition-colors group h-[68px] border", isDark ? "bg-black/20 hover:bg-white/5 border-white/5 hover:border-white/10" : "bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200 shadow-sm")}
                                  >
                                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", isDark ? cn(item.bgColor, item.color) : "bg-cyan-50 text-cyan-600 border border-cyan-100")}>
                                      <item.icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-0.5">
                                        <span className={cn("font-bold text-sm leading-tight transition-colors", isDark ? "text-white group-hover:text-cyan-400" : "text-slate-900 group-hover:text-cyan-600")}>{item.title}</span>
                                        {item.badge && (
                                          <span className={cn("px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider shrink-0", isDark ? "bg-cyan-500/20 text-cyan-400" : "bg-cyan-100 text-cyan-700")}>
                                            {item.badge}
                                          </span>
                                        )}
                                      </div>
                                      <p className={cn("text-xs leading-snug line-clamp-2", isDark ? "text-zinc-400" : "text-slate-500")}>{item.description}</p>
                                    </div>
                                  </Link>
                                ))}
                                <Link
                                  href={isExplore ? "/opportunities" : isCompany ? "/resume" : "/api-hub"}
                                  onClick={() => { setIsOpen(false); setOpenState(false); }}
                                  className="flex items-center justify-center gap-2 p-3 mt-1 rounded-xl bg-cyan-600 hover:bg-cyan-500 transition-colors font-bold text-white text-sm"
                                >
                                  {isExplore ? "View All Opportunities" : isCompany ? "More About Us" : "Browse All APIs"}
                                  <ChevronRight className="w-4 h-4" />
                                </Link>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  }

                  const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                  return (
                    <div key={link.name} className="py-2 border-b border-white/5 last:border-0">
                      <Link
                        href={link.href}
                        onClick={() => { setIsOpen(false); }}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl text-base font-bold transition-all group border",
                          isActive
                            ? (isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-100")
                            : (isDark ? "hover:bg-white/5 border-transparent hover:border-white/10" : "hover:bg-slate-50 border-transparent hover:border-slate-200")
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 group-hover:-rotate-3",
                          isDark ? cn(link.bgColor, link.color) : "bg-cyan-50 text-cyan-600 border border-cyan-100"
                        )}>
                          {link.icon && <link.icon className="w-4 h-4" />}
                        </div>
                        <span className={cn(
                          isActive ? (isDark ? "text-cyan-400" : "text-cyan-600") : (isDark ? "text-white/70 group-hover:text-white" : "text-slate-600 group-hover:text-slate-900"),
                          "transition-colors"
                        )}>
                          {link.name}
                        </span>
                      </Link>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 mt-2 border-t border-white/5 flex justify-center gap-3 px-4">
                <a href={socialLinks?.social_facebook || '#'} target="_blank" rel="noopener noreferrer" className={cn("w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-300", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:text-cyan-500 hover:bg-cyan-600/20 hover:border-cyan-500/50 hover:shadow-[0_0_8px_rgba(6,182,212,0.2)]" : "bg-cyan-50 border-cyan-200 text-cyan-700 hover:text-cyan-800 hover:bg-cyan-100 hover:border-cyan-300")}><svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z"></path></svg></a>
                <a href={socialLinks?.social_twitter || '#'} target="_blank" rel="noopener noreferrer" className={cn("w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-300", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:text-cyan-500 hover:bg-cyan-600/20 hover:border-cyan-500/50 hover:shadow-[0_0_8px_rgba(6,182,212,0.2)]" : "bg-cyan-50 border-cyan-200 text-cyan-700 hover:text-cyan-800 hover:bg-cyan-100 hover:border-cyan-300")}><svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg></a>
                <a href={socialLinks?.social_linkedin || '#'} target="_blank" rel="noopener noreferrer" className={cn("w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-300", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:text-cyan-500 hover:bg-cyan-600/20 hover:border-cyan-500/50 hover:shadow-[0_0_8px_rgba(6,182,212,0.2)]" : "bg-cyan-50 border-cyan-200 text-cyan-700 hover:text-cyan-800 hover:bg-cyan-100 hover:border-cyan-300")}><svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"></path></svg></a>
                <a href={socialLinks?.social_instagram || '#'} target="_blank" rel="noopener noreferrer" className={cn("w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-300", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:text-cyan-500 hover:bg-cyan-600/20 hover:border-cyan-500/50 hover:shadow-[0_0_8px_rgba(6,182,212,0.2)]" : "bg-cyan-50 border-cyan-200 text-cyan-700 hover:text-cyan-800 hover:bg-cyan-100 hover:border-cyan-300")}><svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm3.98-10.98a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"></path></svg></a>
              </div>
              {/* Mobile Theme Toggle */}
              <div className="px-4 py-3 flex justify-center">
                <button
                  onClick={toggleTheme}
                  aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                  className={cn(
                    "flex items-center gap-3 px-6 py-3 rounded-xl font-bold text-sm transition-all w-full justify-center",
                    isDark
                      ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20"
                      : "bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {isDark ? "Light Mode" : "Dark Mode"}
                </button>
              </div>
              <div className="px-4 pb-2">
                {session ? (
                  <Link
                    href={session.role === 'ADMIN' ? '/admin' : '/dashboard'}
                    onClick={() => setIsOpen(false)}
                    className="block w-full text-center py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all mt-2"
                  >
                    Dashboard
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="block w-full text-center py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all mt-2"
                  >
                    Login
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

