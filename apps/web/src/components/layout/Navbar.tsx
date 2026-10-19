"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  ChevronDown,
  Calendar,
  Briefcase,
  Users,
  FileText,
  ChevronRight,
  Home,
  User,
  Server,
  LayoutDashboard,
  Mail,
  Compass,
  BookOpen,
  UploadCloud,
  Code,
  CodeXml,
  Link2,
  Terminal,
  Sun,
  Moon,
} from "lucide-react";
import { SiKubernetes } from "react-icons/si";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";

export interface MenuItem {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: string;
}

const NAV_LINKS = [
  { name: "Home", href: "/", icon: Home },
  { name: "Profile", href: "#", hasMegaMenu: true, icon: Briefcase },
  { name: "Explore", href: "#", hasMegaMenu: true, icon: Compass },
  { name: "Developers", href: "#", hasMegaMenu: true, icon: Code },
  { name: "Contact", href: "/contact", icon: Mail },
];

const EXPLORE_MENU_ITEMS: MenuItem[] = [
  {
    title: "Events & Webinars",
    description: "Join tech events and learn from industry experts.",
    href: "/events",
    icon: Calendar,
    badge: "New",
  },
  {
    title: "Job Vacancies",
    description: "Discover top career opportunities in tech.",
    href: "/vacancies",
    icon: Briefcase,
    badge: "New",
  },
  {
    title: "Community",
    description: "Connect and collaborate with developer peers.",
    href: "/community",
    icon: Users,
  },
  {
    title: "Blog & Articles",
    description: "Read our technical insights, guides, and tutorials.",
    href: "/blog",
    icon: FileText,
  },
  {
    title: "Series",
    description: "Structured learning paths for cloud and DevOps.",
    href: "/series",
    icon: BookOpen,
    badge: "New",
  },
];

const COMPANY_MENU_ITEMS: MenuItem[] = [
  {
    title: "About",
    description: "Learn more about who we are and what we do.",
    href: "/resume",
    icon: User,
  },
  {
    title: "Services",
    description: "Professional services tailored for your needs.",
    href: "/services",
    icon: Server,
  },
  {
    title: "Portfolio",
    description: "A showcase of our past projects and achievements.",
    href: "/portfolio",
    icon: LayoutDashboard,
  },
  {
    title: "Skills",
    description: "Our technical capabilities and core competencies.",
    href: "/skills",
    icon: Compass,
  },
];

const DEV_MENU_ITEMS: MenuItem[] = [
  {
    title: "Reseller API",
    description: "White-label VPS provisioning API for hosts.",
    href: "/reseller-api",
    icon: CodeXml,
    badge: "New",
  },
  {
    title: "File CDN",
    description: "Securely upload temporary files up to 100MB.",
    href: "/file-cdn",
    icon: UploadCloud,
    badge: "New",
  },
  {
    title: "API Hub",
    description: "Discover and test public REST APIs for your projects.",
    href: "/api-hub",
    icon: CodeXml,
    badge: "New",
  },
  {
    title: "URL Shortener",
    description: "Create premium short links with custom aliases.",
    href: "/shortener",
    icon: Link2,
    badge: "New",
  },
  {
    title: "Cloud VPS",
    description: "High-performance virtual private servers.",
    href: "/vps",
    icon: Terminal,
    badge: "Premium",
  },
  {
    title: "Kubernetes (K3s)",
    description: "Lightweight, fully managed Kubernetes clusters.",
    href: "/k3s",
    icon: SiKubernetes,
    badge: "Premium",
  },
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
    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => {
        if (data && data.user) {
          setSession(data.user);
        }
      })
      .catch(() => {});
  }, []);

  // Load menu order and badges from settings
  useEffect(() => {
    fetch("/api/settings/menu-order")
      .then((r) => r.json())
      .then(({ order, badges = {}, devOrder, devBadges = {}, companyOrder, companyBadges = {} }) => {
        if (Array.isArray(order)) {
          const keyMap: Record<string, (typeof EXPLORE_MENU_ITEMS)[0]> = {};
          EXPLORE_MENU_ITEMS.forEach((item) => {
            keyMap[item.href.replace("/", "")] = item;
          });
          const sorted = order
            .map((k: string) => {
              const item = keyMap[k];
              if (!item) return null;
              return {
                ...item,
                badge: badges[k] === false ? undefined : badges[k] !== undefined ? String(badges[k]) : item.badge,
              };
            })
            .filter(Boolean) as typeof EXPLORE_MENU_ITEMS;
          EXPLORE_MENU_ITEMS.forEach((item) => {
            if (!order.includes(item.href.replace("/", ""))) sorted.push(item);
          });
          setExploreItems(sorted);
        }
        if (Array.isArray(devOrder)) {
          const devKeyMap: Record<string, (typeof DEV_MENU_ITEMS)[0]> = {};
          DEV_MENU_ITEMS.forEach((item) => {
            let key = item.href.replace("/", "");
            if (key === "file-cdn") key = "upload";
            devKeyMap[key] = item;
          });
          const devSorted = devOrder
            .map((k: string) => {
              const item = devKeyMap[k];
              if (!item) return null;
              return {
                ...item,
                badge: devBadges[k] === false ? undefined : devBadges[k] !== undefined ? String(devBadges[k]) : item.badge,
              };
            })
            .filter(Boolean) as typeof DEV_MENU_ITEMS;
          DEV_MENU_ITEMS.forEach((item) => {
            let key = item.href.replace("/", "");
            if (key === "file-cdn") key = "upload";
            if (!devOrder.includes(key)) devSorted.push(item);
          });
          setDevItems(devSorted);
        }
        if (Array.isArray(companyOrder)) {
          const companyKeyMap: Record<string, (typeof COMPANY_MENU_ITEMS)[0]> = {};
          COMPANY_MENU_ITEMS.forEach((item) => {
            let key = item.href.replace("/", "");
            if (key === "resume") key = "about";
            companyKeyMap[key] = item;
          });
          const companySorted = companyOrder
            .map((k: string) => {
              const item = companyKeyMap[k];
              if (!item) return null;
              return {
                ...item,
                badge: companyBadges[k] === false ? undefined : companyBadges[k] !== undefined ? String(companyBadges[k]) : item.badge,
              };
            })
            .filter(Boolean) as typeof COMPANY_MENU_ITEMS;
          COMPANY_MENU_ITEMS.forEach((item) => {
            let key = item.href.replace("/", "");
            if (key === "resume") key = "about";
            if (!companyOrder.includes(key)) companySorted.push(item);
          });
          setCompanyItems(companySorted);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const isScrolled = window.scrollY > 20;
          setScrolled((prev) => (prev !== isScrolled ? isScrolled : prev));
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-300",
        isOpen
          ? "bg-[var(--surface)] shadow-lg border-b border-[var(--border-primary)]"
          : scrolled
            ? "bg-[var(--navbar-bg)] backdrop-blur-md shadow-sm border-b border-[var(--border-subtle)]"
            : "bg-transparent",
        scrolled ? "py-3" : "py-5"
      )}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex items-center justify-between h-12 relative">

          {/* Logo */}
          <div className="flex-shrink-0 z-10">
            <Link
              href="/"
              scroll={false}
              className="flex items-center group w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-lg p-1"
            >
              <img
                src={isDark ? "/masdika-logo-dark-mode.svg" : "/masdika-logo-light-mode.svg"}
                alt="Masdika Logo"
                className="h-8 w-auto"
              />
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden lg:flex flex-1 justify-center relative z-10">
            <div className="flex items-center space-x-1 xl:space-x-2">
              {NAV_LINKS.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== "/" && pathname.startsWith(link.href) && link.href !== "#");

                if (link.hasMegaMenu) {
                  let isMegaMenuActive = false;
                  if (link.name === "Explore") {
                    isMegaMenuActive = exploreItems.some(
                      (item) => pathname === item.href || pathname.startsWith(item.href + "/")
                    );
                  } else if (link.name === "Profile") {
                    isMegaMenuActive = companyItems.some(
                      (item) => pathname === item.href || pathname.startsWith(item.href + "/")
                    );
                  } else if (link.name === "Developers") {
                    isMegaMenuActive = devItems.some(
                      (item) => pathname === item.href || pathname.startsWith(item.href + "/")
                    );
                  }

                  return (
                    <div
                      key={link.name}
                      className="relative group"
                      onMouseEnter={() => handleMouseEnter(link.name)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <button
                        onClick={() => setActiveMenu((prev) => (prev === link.name ? null : link.name))}
                        className={cn(
                          "px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 relative",
                          activeMenu === link.name || isMegaMenuActive
                            ? "text-[var(--text-primary)] bg-[var(--surface-secondary)]"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"
                        )}
                      >
                        {link.name}
                        <ChevronDown
                          className={cn(
                            "w-3.5 h-3.5 transition-transform duration-200 text-cyan-600 dark:text-cyan-400",
                            activeMenu === link.name ? "rotate-180" : ""
                          )}
                        />
                        <span
                          className={cn(
                            "absolute bottom-0 left-3 right-3 h-0.5 bg-cyan-500 transition-transform duration-200 origin-left",
                            isMegaMenuActive || activeMenu === link.name ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                          )}
                        />
                      </button>
                    </div>
                  );
                }

                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    scroll={false}
                    className={cn(
                      "px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors relative group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500",
                      isActive
                        ? "text-[var(--text-primary)] bg-[var(--surface-secondary)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"
                    )}
                  >
                    {link.name}
                    <span
                      className={cn(
                        "absolute bottom-0 left-3 right-3 h-0.5 bg-cyan-500 transition-transform duration-200 origin-left",
                        isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                      )}
                    />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right side icons & actions */}
          <div className="hidden md:flex items-center gap-2.5 z-10">
            <div className="flex items-center gap-1.5">
              {[
                { icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z"></path></svg>, link: socialLinks?.social_facebook || "#", name: "Facebook" },
                { icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>, link: socialLinks?.social_twitter || "#", name: "X" },
                { icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"></path></svg>, link: socialLinks?.social_linkedin || "#", name: "LinkedIn" },
                { icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm3.98-10.98a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"></path></svg>, link: socialLinks?.social_instagram || "#", name: "Instagram" },
              ].map((social, idx) => (
                <a
                  key={idx}
                  href={social.link}
                  aria-label={social.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 hover:border-cyan-500/30 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                >
                  {social.icon}
                </a>
              ))}
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="w-8 h-8 rounded-full border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 hover:border-[var(--text-muted)] flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              {isDark ? <Sun className="w-4 h-4 text-cyan-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            <div className="h-5 w-px mx-1 bg-[var(--border-primary)]" />

            {session ? (
              <Link
                href={session.role === "ADMIN" ? "/admin" : "/dashboard"}
                scroll={false}
                className="px-4 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                scroll={false}
                className="px-4 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile menu trigger */}
          <div className="lg:hidden flex items-center z-10">
            <button
              onClick={() => setIsOpen(!isOpen)}
              aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={isOpen}
              className="p-2 rounded-lg text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 hover:bg-[var(--surface-secondary)] border border-[var(--border-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 transition-colors"
            >
              <Menu className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            </button>
          </div>
        </div>

        {/* Mega Menu Dropdown */}
        <AnimatePresence>
          {(activeMenu === "Explore" || activeMenu === "Developers" || activeMenu === "Profile") && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.15 }}
              onMouseEnter={() => {
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
              }}
              onMouseLeave={handleMouseLeave}
              className="absolute top-full left-0 right-0 pt-3 px-4 sm:px-6 lg:px-8 z-50 hidden lg:block"
            >
              <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] shadow-2xl overflow-hidden flex">
                {/* Left Panel */}
                <div className="w-[30%] min-w-[270px] max-w-[320px] p-7 sm:p-8 border-r border-[var(--border-primary)] bg-[var(--surface-secondary)] flex flex-col justify-center">
                  <h3 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">
                    {activeMenu === "Explore" ? "Explore Opportunities" : activeMenu === "Profile" ? "Profile & Work" : "Developer Tools & APIs"}
                  </h3>
                  <p className="mb-6 max-w-sm text-sm text-[var(--text-secondary)] leading-relaxed">
                    {activeMenu === "Explore"
                      ? "Discover new events, connect with the community, and find your next big career move."
                      : activeMenu === "Profile"
                        ? "Learn about our services, view our portfolio, and discover our core expertise."
                        : "Build powerful integrations with our public REST APIs and secure file delivery network."}
                  </p>

                  <Link
                    href={activeMenu === "Explore" ? "/opportunities" : activeMenu === "Profile" ? "/resume" : "/api-hub"}
                    scroll={false}
                    onClick={() => {
                      setActiveMenu(null);
                      if (timeoutRef.current) clearTimeout(timeoutRef.current);
                    }}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-lg font-semibold text-sm transition-colors w-fit shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                  >
                    {activeMenu === "Explore" ? "View All" : activeMenu === "Profile" ? "About Us" : "Browse APIs"}
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                {/* Right Panel - Grid */}
                <div className="flex-1 p-6 lg:p-7 flex flex-col justify-center">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {(activeMenu === "Explore" ? exploreItems : activeMenu === "Profile" ? companyItems : devItems).map((item) => (
                      <Link
                        key={item.title}
                        href={item.href}
                        scroll={false}
                        onClick={() => {
                          setActiveMenu(null);
                          if (timeoutRef.current) clearTimeout(timeoutRef.current);
                        }}
                        className="group flex items-center gap-3.5 px-3.5 py-3 rounded-xl border border-transparent hover:border-[var(--border-primary)] hover:bg-[var(--surface-secondary)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                      >
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
                          <item.icon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="font-bold text-sm leading-snug text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors truncate">
                              {item.title}
                            </h4>
                            {"badge" in item && item.badge && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider shrink-0 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--text-muted)] line-clamp-1 leading-normal">
                            {item.description}
                          </p>
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
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            onScroll={(e) => {
              const scrolled = e.currentTarget.scrollTop > 10;
              if (scrolled !== isMenuScrolled) setIsMenuScrolled(scrolled);
            }}
            className={cn(
              "lg:hidden absolute top-[100%] w-full h-[calc(100vh-72px)] overflow-y-auto bg-[var(--surface)] text-[var(--text-primary)] border-b border-[var(--border-primary)]",
              isMenuScrolled && "border-t border-[var(--border-subtle)]"
            )}
          >
            <div className="px-4 pt-4 pb-24">
              <div className="flex flex-col">
                {NAV_LINKS.map((link) => {
                  if (link.hasMegaMenu) {
                    const isExplore = link.name === "Explore";
                    const isCompany = link.name === "Profile";
                    const isOpenState = isExplore ? mobileExploreOpen : isCompany ? mobileCompanyOpen : mobileDevOpen;
                    const setOpenState = isExplore ? setMobileExploreOpen : isCompany ? setMobileCompanyOpen : setMobileDevOpen;
                    const menuList = isExplore ? exploreItems : isCompany ? companyItems : devItems;

                    return (
                      <div key={link.name} className="py-1.5 border-b border-[var(--border-subtle)] last:border-0">
                        <button
                          onClick={() => setOpenState(!isOpenState)}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors hover:bg-[var(--surface-secondary)] text-[var(--text-primary)]"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
                              {link.icon && <link.icon className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />}
                            </div>
                            <span>{link.name}</span>
                          </div>
                          <ChevronDown
                            className={cn(
                              "w-4 h-4 transition-transform duration-200",
                              isOpenState ? "rotate-180 text-cyan-500" : "text-cyan-600 dark:text-cyan-400"
                            )}
                          />
                        </button>

                        <AnimatePresence>
                          {isOpenState && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="flex flex-col gap-1.5 mt-1 pl-4 pr-1 pb-2">
                                {menuList.map((item) => (
                                  <Link
                                    key={item.title}
                                    href={item.href}
                                    scroll={false}
                                    onClick={() => {
                                      setIsOpen(false);
                                      setOpenState(false);
                                    }}
                                    className="flex items-center gap-3 p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)] hover:border-cyan-500/30 transition-colors"
                                  >
                                    <div className={cn("w-8 h-8 rounded-md flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
                                      <item.icon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold text-xs text-[var(--text-primary)]">
                                          {item.title}
                                        </span>
                                        {"badge" in item && item.badge && (
                                          <span className="px-1 py-0.2 rounded-full text-[8px] font-semibold uppercase bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20">
                                            {item.badge}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-[var(--text-muted)] line-clamp-1">
                                        {item.description}
                                      </p>
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }

                  const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                  return (
                    <div key={link.name} className="py-1.5 border-b border-[var(--border-subtle)] last:border-0">
                      <Link
                        href={link.href}
                        scroll={false}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors",
                          isActive
                            ? "bg-[var(--surface-secondary)] text-cyan-600 dark:text-cyan-400 font-bold"
                            : "text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"
                        )}
                      >
                        <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0 border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
                          {link.icon && <link.icon className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />}
                        </div>
                        <span>{link.name}</span>
                      </Link>
                    </div>
                  );
                })}
              </div>

              {/* Mobile Theme Toggle & Actions */}
              <div className="pt-4 mt-2 border-t border-[var(--border-subtle)] flex flex-col gap-3">
                <button
                  onClick={toggleTheme}
                  aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                  className="flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-primary)] text-sm font-semibold transition-colors"
                >
                  {isDark ? <Sun className="w-4 h-4 text-cyan-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
                  <span>{isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}</span>
                </button>

                {session ? (
                  <Link
                    href={session.role === "ADMIN" ? "/admin" : "/dashboard"}
                    scroll={false}
                    onClick={() => setIsOpen(false)}
                    className="block w-full text-center py-2.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-sm transition-colors"
                  >
                    Dashboard
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    scroll={false}
                    onClick={() => setIsOpen(false)}
                    className="block w-full text-center py-2.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-sm transition-colors"
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
