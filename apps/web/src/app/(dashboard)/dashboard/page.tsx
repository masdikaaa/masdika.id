"use client";

import { useUrlNumber } from "@/lib/useUrlTab";
import { useEffect, useState } from "react";
import { motion, Variants } from "framer-motion";
import {
  Server,
  ChevronRight,
  ChevronLeft,
  HardDrive,
  Cpu,
  Wallet,
  Network,
  Receipt,
  RefreshCw,
  Terminal,
  UploadCloud,
  Newspaper,
  MessageSquare,
  Plus,
  ArrowUpRight,
  Activity,
  Copy,
  Sparkles,
  Megaphone,
  Calendar,
} from "lucide-react";
import { SiKubernetes } from "react-icons/si";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/billing";
import { Pagination } from "@/components/ui/Pagination";
import { useTheme } from "@/components/ThemeProvider";

const VpcIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="9 6 12 3 15 6" />
    <polyline points="9 18 12 21 15 18" />
    <polyline points="6 9 3 12 6 15" />
    <polyline points="18 9 21 12 18 15" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="12" y1="3" x2="12" y2="21" />
  </svg>
);

const getOsIcon = (osTemplate: string) => {
  const os = osTemplate?.toLowerCase() || "";
  if (os.includes("ubuntu")) return "https://cdn.simpleicons.org/ubuntu/E95420";
  if (os.includes("debian")) return "https://cdn.simpleicons.org/debian/A81D33";
  if (os.includes("centos")) return "https://cdn.simpleicons.org/centos/262577";
  if (os.includes("almalinux") || os.includes("alma"))
    return "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/almalinux/almalinux-original.svg";
  if (os.includes("rocky")) return "https://cdn.simpleicons.org/rockylinux/10B981";
  if (os.includes("alpine")) return "https://www.vectorlogo.zone/logos/alpinelinux/alpinelinux-icon.svg";
  if (os.includes("fedora")) return "https://cdn.simpleicons.org/fedora/3b82f6";
  if (os.includes("windows"))
    return "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/windows11/windows11-original.svg";
  if (os.includes("freebsd")) return "https://cdn.simpleicons.org/freebsd/AB2B28";
  if (os.includes("mikrotik") || os.includes("chr")) {
    return "https://cdn.worldvectorlogo.com/logos/mikrotik.svg";
  }
  return null;
};

export default function DashboardOverview() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [cdnUsage, setCdnUsage] = useState<any>(null);
  const [vpsList, setVpsList] = useState<any[]>([]);
  const [k3sList, setK3sList] = useState<any[]>([]);
  const [reservedIpsList, setReservedIpsList] = useState<any[]>([]);
  const [vpcList, setVpcList] = useState<any[]>([]);
  const [billingData, setBillingData] = useState<any>({ balance: 0, invoices: [] });
  const [ticketsList, setTicketsList] = useState<any[]>([]);
  const [beritaList, setBeritaList] = useState<any[]>([]);
  const [bannersList, setBannersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [vpsPage, setVpsPage] = useUrlNumber("vpsPage", 1);
  const [k3sPage, setK3sPage] = useUrlNumber("k3sPage", 1);
  const [beritaPage, setBeritaPage] = useUrlNumber("beritaPage", 1);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  useEffect(() => {
    const safeJson = (res: Response) => (res.ok ? res.json() : Promise.resolve(null));

    Promise.all([
      fetch("/api/user/billing").then(safeJson),
      fetch("/api/user/cdn/quota").then(safeJson),
      fetch("/api/user/vps").then(safeJson),
      fetch("/api/user/k3s").then(safeJson),
      fetch("/api/user/reserved-ips").then(safeJson),
      fetch("/api/dashboard/vpc").then(safeJson),
      fetch("/api/announcements").then(safeJson),
      fetch("/api/banners").then(safeJson),
      fetch("/api/tickets").then(safeJson),
    ])
      .then(([billingRes, cdnData, vpsData, k3sData, ipsData, vpcData, beritaData, bannersData, ticketsData]) => {
        if (billingRes?.success) setBillingData(billingRes.data);
        if (cdnData && !cdnData.error) setCdnUsage(cdnData);
        if (Array.isArray(vpsData)) setVpsList(vpsData);
        if (Array.isArray(k3sData)) setK3sList(k3sData);
        if (Array.isArray(ipsData)) setReservedIpsList(ipsData);
        if (Array.isArray(vpcData)) setVpcList(vpcData);
        if (Array.isArray(beritaData)) setBeritaList(beritaData);
        if (Array.isArray(bannersData)) setBannersList(bannersData);
        if (ticketsData?.tickets && Array.isArray(ticketsData.tickets)) setTicketsList(ticketsData.tickets);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalVps = vpsList.length;
  const runningVps = vpsList.filter((v) => v.liveStatus?.status === "running").length;
  const totalK3s = k3sList.length;
  const totalIps = reservedIpsList.length;
  const totalVpc = vpcList.length;
  const unpaidInvoices = billingData.invoices?.filter((i: any) => i.status === "PENDING").length || 0;
  const openTickets = ticketsList.filter((t: any) => t.status !== "CLOSED" && t.status !== "MERGED").length;

  const activeBanners = bannersList.filter((b) => b.isActive && b.imageUrl);
  const newsList = beritaList;

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % activeBanners.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [activeBanners.length]);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  };

  const getBeritaExcerpt = (content: string) => {
    if (content.startsWith("<!-- state: ")) {
      try {
        const stateStr = content.match(/<!-- state: (.*?) -->/)?.[1];
        if (stateStr) {
          const state = JSON.parse(stateStr);
          return state.reason || state.impact || `Maintenance on ${state.service} (${state.node})`;
        }
      } catch (e) {}
    }
    const stripped = content
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return stripped.length > 0 ? stripped : "No summary available";
  };

  const usedGb = cdnUsage ? (cdnUsage.usedBytes / (1024 * 1024 * 1024)).toFixed(2) : "0.00";
  const limitGb = cdnUsage && cdnUsage.limitGB > 0 ? `${cdnUsage.limitGB} GB` : "0 GB";
  const cdnPercent =
    cdnUsage?.limitBytes > 0 ? Math.min(100, ((cdnUsage?.usedBytes || 0) / cdnUsage.limitBytes) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6 pb-10 w-full max-w-full min-w-0"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Compact Console Header & Quick Action Bar */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1"
      >
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Cloud Overview
            </h1>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border",
                isDark
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700"
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              All Systems Operational
            </span>
          </div>
          <p className={cn("text-xs sm:text-sm mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
            Real-time telemetry, active compute resources, and platform announcements.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2.5 w-full sm:w-auto">
          <Link
            href="/dashboard/topup"
            className={cn(
              "inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-semibold border transition-all",
              isDark
                ? "bg-[#0a0a0c] hover:bg-white/[0.04] border-white/[0.08] text-zinc-200"
                : "bg-white hover:bg-slate-50 border-slate-200/90 text-slate-700 shadow-2xs"
            )}
          >
            <Wallet className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
            <span>Top Up Credit</span>
          </Link>
          <Link
            href="/dashboard/checkout"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 transition-all shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
            <span>Deploy Resource</span>
          </Link>
        </div>
      </motion.div>

      {/* Top Section: Promo Banner & Announcements Feed */}
      <div className={cn("grid gap-5", activeBanners.length > 0 ? "grid-cols-1 lg:grid-cols-12" : "grid-cols-1")}>
        {/* Promo Banner */}
        {activeBanners.length > 0 && (
          <motion.div
            variants={itemVariants}
            className={cn(
              "lg:col-span-6 relative overflow-hidden rounded-2xl group aspect-[2/1] w-full border",
              isDark
                ? "bg-[#0a0a0c] border-white/[0.08] shadow-lg shadow-black/20"
                : "bg-slate-100 border-slate-200/90 shadow-2xs"
            )}
          >
            {activeBanners.map((banner, idx) => (
              <Link
                key={banner.id}
                href={banner.actionUrl || "#"}
                className={cn(
                  "absolute inset-0 w-full h-full cursor-pointer transition-opacity duration-700",
                  idx === currentBannerIndex ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                )}
              >
                <img
                  referrerPolicy="no-referrer"
                  src={banner.imageUrl}
                  alt={banner.title || "Promo Banner"}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-[8000ms] group-hover:scale-[1.03]"
                  loading="lazy"
                  decoding="async"
                />
              </Link>
            ))}

            {/* Sleek Carousel Controls */}
            {activeBanners.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentBannerIndex((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-lg bg-black/50 hover:bg-black/75 border border-white/15 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentBannerIndex((prev) => (prev + 1) % activeBanners.length);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-lg bg-black/50 hover:bg-black/75 border border-white/15 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md"
                  aria-label="Next slide"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
                  {activeBanners.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentBannerIndex(idx);
                      }}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        idx === currentBannerIndex ? "w-5 bg-cyan-400" : "w-1.5 bg-white/40 hover:bg-white/70"
                      )}
                      aria-label={`Slide ${idx + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* Announcements Feed */}
        <motion.div
          variants={itemVariants}
          className={cn(
            "rounded-2xl flex flex-col w-full border overflow-hidden",
            activeBanners.length > 0 ? "lg:col-span-6 lg:aspect-[2/1] min-h-[320px] lg:min-h-0" : "min-h-[240px]",
            isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs"
          )}
        >
          <div
            className={cn(
              "px-5 py-3.5 border-b flex justify-between items-center shrink-0",
              isDark ? "border-white/[0.06] bg-white/[0.01]" : "border-slate-100 bg-slate-50/50"
            )}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center border",
                  isDark
                    ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                    : "bg-cyan-50 border-cyan-200 text-cyan-700"
                )}
              >
                <Megaphone className="w-3.5 h-3.5" />
              </div>
              <h3 className={cn("text-sm font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                Announcements & Advisories
              </h3>
              {newsList.length > 0 && (
                <span
                  className={cn(
                    "text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border",
                    isDark
                      ? "bg-white/[0.03] border-white/[0.07] text-zinc-400"
                      : "bg-white border-slate-200 text-slate-600"
                  )}
                >
                  {newsList.length}
                </span>
              )}
            </div>
            <Link
              href="/dashboard/berita"
              className={cn(
                "inline-flex items-center gap-1 text-xs font-semibold transition-colors",
                isDark ? "text-cyan-400 hover:text-cyan-300" : "text-cyan-700 hover:text-cyan-800"
              )}
            >
              View All
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-4 flex flex-col gap-2.5 flex-1 overflow-y-auto custom-scrollbar">
            {newsList.length === 0 ? (
              <div
                className={cn(
                  "flex-1 flex flex-col items-center justify-center text-center py-8",
                  isDark ? "text-zinc-500" : "text-slate-400"
                )}
              >
                <Newspaper className="w-7 h-7 mb-2 opacity-40" />
                <p className="text-xs font-medium">No active announcements at the moment.</p>
              </div>
            ) : (
              newsList.slice((beritaPage - 1) * 2, beritaPage * 2).map((berita) => {
                const isMaint = berita.type === "MAINTENANCE";
                const isWarn = berita.type === "WARNING";
                return (
                  <Link
                    key={berita.id}
                    href={`/dashboard/berita/${berita.id}`}
                    className={cn(
                      "group rounded-xl p-3.5 border transition-all flex flex-col justify-between gap-2",
                      isDark
                        ? "bg-white/[0.015] hover:bg-white/[0.035] border-white/[0.06] hover:border-white/[0.12]"
                        : "bg-slate-50/60 hover:bg-slate-50 border-slate-200/70 hover:border-slate-300"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border",
                            isMaint
                              ? isDark
                                ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                : "bg-amber-50 border-amber-200 text-amber-800"
                              : isWarn
                              ? isDark
                                ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                                : "bg-rose-50 border-rose-200 text-rose-800"
                              : isDark
                              ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                              : "bg-cyan-50 border-cyan-200 text-cyan-800"
                          )}
                        >
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              isMaint ? "bg-amber-400" : isWarn ? "bg-rose-400" : "bg-cyan-400"
                            )}
                          />
                          {isMaint ? "Maintenance" : isWarn ? "Advisory" : "Platform Info"}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[11px] font-mono",
                            isDark ? "text-zinc-500" : "text-slate-400"
                          )}
                        >
                          <Calendar className="w-3 h-3" />
                          {new Date(berita.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      <h4
                        className={cn(
                          "text-sm font-bold transition-colors line-clamp-1",
                          isDark ? "text-zinc-100 group-hover:text-cyan-400" : "text-slate-900 group-hover:text-cyan-700"
                        )}
                      >
                        {berita.title}
                      </h4>
                      <p
                        className={cn(
                          "text-xs line-clamp-2 mt-1 leading-relaxed",
                          isDark ? "text-zinc-400" : "text-slate-600"
                        )}
                      >
                        {getBeritaExcerpt(berita.content)}
                      </p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          {newsList.length > 2 && (
            <div
              className={cn(
                "px-4 py-2.5 border-t shrink-0",
                isDark ? "border-white/[0.06] bg-white/[0.01]" : "border-slate-100 bg-slate-50/60"
              )}
            >
              <Pagination
                currentPage={beritaPage}
                totalPages={Math.ceil(newsList.length / 2)}
                onPageChange={setBeritaPage}
              />
            </div>
          )}
        </motion.div>
      </div>

      {/* Architectural Resource & Telemetry Grid (8 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Active VPS */}
        <motion.div variants={itemVariants}>
          <Link
            href="/dashboard/vps"
            className={cn(
              "group flex flex-col justify-between p-4 sm:p-5 rounded-2xl border transition-all h-full",
              isDark
                ? "bg-[#0a0a0c] border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.015]"
                : "bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs"
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center border transition-colors",
                    isDark
                      ? "bg-white/[0.03] border-white/[0.08] text-cyan-400 group-hover:border-cyan-500/30 group-hover:bg-cyan-500/10"
                      : "bg-slate-50 border-slate-200/80 text-cyan-700 group-hover:bg-cyan-50 group-hover:border-cyan-200"
                  )}
                >
                  <Terminal className="w-4 h-4" />
                </div>
                <span
                  className={cn(
                    "text-xs font-semibold tracking-wide",
                    isDark ? "text-zinc-400 group-hover:text-zinc-200" : "text-slate-600 group-hover:text-slate-900"
                  )}
                >
                  Cloud VPS
                </span>
              </div>
              <ArrowUpRight
                className={cn(
                  "w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
                  isDark ? "text-zinc-600 group-hover:text-cyan-400" : "text-slate-400 group-hover:text-cyan-600"
                )}
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={cn(
                    "text-2xl sm:text-3xl font-bold font-mono tracking-tight",
                    isDark ? "text-white" : "text-slate-900"
                  )}
                >
                  {totalVps}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border",
                    runningVps > 0
                      ? isDark
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : isDark
                      ? "bg-white/[0.03] border-white/[0.07] text-zinc-500"
                      : "bg-slate-100 border-slate-200 text-slate-500"
                  )}
                >
                  <span
                    className={cn("w-1.5 h-1.5 rounded-full", runningVps > 0 ? "bg-emerald-400" : "bg-zinc-500")}
                  />
                  {runningVps} running
                </span>
              </div>
              <p className={cn("text-[11px] mt-1.5", isDark ? "text-zinc-500" : "text-slate-500")}>
                Deployed virtual machines
              </p>
            </div>
          </Link>
        </motion.div>

        {/* 2. Managed K3s */}
        <motion.div variants={itemVariants}>
          <Link
            href="/dashboard/k3s"
            className={cn(
              "group flex flex-col justify-between p-4 sm:p-5 rounded-2xl border transition-all h-full",
              isDark
                ? "bg-[#0a0a0c] border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.015]"
                : "bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs"
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center border transition-colors",
                    isDark
                      ? "bg-white/[0.03] border-white/[0.08] text-cyan-400 group-hover:border-cyan-500/30 group-hover:bg-cyan-500/10"
                      : "bg-slate-50 border-slate-200/80 text-cyan-700 group-hover:bg-cyan-50 group-hover:border-cyan-200"
                  )}
                >
                  <SiKubernetes className="w-4 h-4" />
                </div>
                <span
                  className={cn(
                    "text-xs font-semibold tracking-wide",
                    isDark ? "text-zinc-400 group-hover:text-zinc-200" : "text-slate-600 group-hover:text-slate-900"
                  )}
                >
                  Managed K3s
                </span>
              </div>
              <ArrowUpRight
                className={cn(
                  "w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
                  isDark ? "text-zinc-600 group-hover:text-cyan-400" : "text-slate-400 group-hover:text-cyan-600"
                )}
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={cn(
                    "text-2xl sm:text-3xl font-bold font-mono tracking-tight",
                    isDark ? "text-white" : "text-slate-900"
                  )}
                >
                  {totalK3s}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-mono uppercase px-2 py-0.5 rounded-md border",
                    isDark
                      ? "bg-white/[0.03] border-white/[0.07] text-zinc-400"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  )}
                >
                  Clusters
                </span>
              </div>
              <p className={cn("text-[11px] mt-1.5", isDark ? "text-zinc-500" : "text-slate-500")}>
                Active Kubernetes control planes
              </p>
            </div>
          </Link>
        </motion.div>

        {/* 3. Reserved IPs */}
        <motion.div variants={itemVariants}>
          <Link
            href="/dashboard/reserved-ips"
            className={cn(
              "group flex flex-col justify-between p-4 sm:p-5 rounded-2xl border transition-all h-full",
              isDark
                ? "bg-[#0a0a0c] border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.015]"
                : "bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs"
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center border transition-colors",
                    isDark
                      ? "bg-white/[0.03] border-white/[0.08] text-cyan-400 group-hover:border-cyan-500/30 group-hover:bg-cyan-500/10"
                      : "bg-slate-50 border-slate-200/80 text-cyan-700 group-hover:bg-cyan-50 group-hover:border-cyan-200"
                  )}
                >
                  <Network className="w-4 h-4" />
                </div>
                <span
                  className={cn(
                    "text-xs font-semibold tracking-wide",
                    isDark ? "text-zinc-400 group-hover:text-zinc-200" : "text-slate-600 group-hover:text-slate-900"
                  )}
                >
                  Reserved IPs
                </span>
              </div>
              <ArrowUpRight
                className={cn(
                  "w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
                  isDark ? "text-zinc-600 group-hover:text-cyan-400" : "text-slate-400 group-hover:text-cyan-600"
                )}
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={cn(
                    "text-2xl sm:text-3xl font-bold font-mono tracking-tight",
                    isDark ? "text-white" : "text-slate-900"
                  )}
                >
                  {totalIps}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-mono uppercase px-2 py-0.5 rounded-md border",
                    isDark
                      ? "bg-white/[0.03] border-white/[0.07] text-zinc-400"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  )}
                >
                  IPv4 / IPv6
                </span>
              </div>
              <p className={cn("text-[11px] mt-1.5", isDark ? "text-zinc-500" : "text-slate-500")}>
                Allocated static addresses
              </p>
            </div>
          </Link>
        </motion.div>

        {/* 4. File CDN */}
        <motion.div variants={itemVariants}>
          <Link
            href="/dashboard/cdn"
            className={cn(
              "group flex flex-col justify-between p-4 sm:p-5 rounded-2xl border transition-all h-full",
              isDark
                ? "bg-[#0a0a0c] border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.015]"
                : "bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs"
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center border transition-colors",
                    isDark
                      ? "bg-white/[0.03] border-white/[0.08] text-cyan-400 group-hover:border-cyan-500/30 group-hover:bg-cyan-500/10"
                      : "bg-slate-50 border-slate-200/80 text-cyan-700 group-hover:bg-cyan-50 group-hover:border-cyan-200"
                  )}
                >
                  <UploadCloud className="w-4 h-4" />
                </div>
                <span
                  className={cn(
                    "text-xs font-semibold tracking-wide",
                    isDark ? "text-zinc-400 group-hover:text-zinc-200" : "text-slate-600 group-hover:text-slate-900"
                  )}
                >
                  Object & File CDN
                </span>
              </div>
              <ArrowUpRight
                className={cn(
                  "w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
                  isDark ? "text-zinc-600 group-hover:text-cyan-400" : "text-slate-400 group-hover:text-cyan-600"
                )}
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-2 mb-2">
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={cn(
                      "text-2xl font-bold font-mono tracking-tight",
                      isDark ? "text-white" : "text-slate-900"
                    )}
                  >
                    {usedGb}
                  </span>
                  <span className={cn("text-[11px] font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
                    GB used
                  </span>
                </div>
                <span className={cn("text-[11px] font-mono", isDark ? "text-zinc-500" : "text-slate-400")}>
                  of {limitGb}
                </span>
              </div>
              <div className={cn("w-full rounded-full h-1.5 overflow-hidden", isDark ? "bg-white/[0.06]" : "bg-slate-100")}>
                <div
                  className="bg-cyan-400 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${cdnPercent}%` }}
                />
              </div>
            </div>
          </Link>
        </motion.div>

        {/* 5. VPC Networks */}
        <motion.div variants={itemVariants}>
          <Link
            href="/dashboard/vpc"
            className={cn(
              "group flex flex-col justify-between p-4 sm:p-5 rounded-2xl border transition-all h-full",
              isDark
                ? "bg-[#0a0a0c] border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.015]"
                : "bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs"
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center border transition-colors",
                    isDark
                      ? "bg-white/[0.03] border-white/[0.08] text-cyan-400 group-hover:border-cyan-500/30 group-hover:bg-cyan-500/10"
                      : "bg-slate-50 border-slate-200/80 text-cyan-700 group-hover:bg-cyan-50 group-hover:border-cyan-200"
                  )}
                >
                  <VpcIcon className="w-4 h-4" />
                </div>
                <span
                  className={cn(
                    "text-xs font-semibold tracking-wide",
                    isDark ? "text-zinc-400 group-hover:text-zinc-200" : "text-slate-600 group-hover:text-slate-900"
                  )}
                >
                  VPC Networks
                </span>
              </div>
              <ArrowUpRight
                className={cn(
                  "w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
                  isDark ? "text-zinc-600 group-hover:text-cyan-400" : "text-slate-400 group-hover:text-cyan-600"
                )}
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={cn(
                    "text-2xl sm:text-3xl font-bold font-mono tracking-tight",
                    isDark ? "text-white" : "text-slate-900"
                  )}
                >
                  {totalVpc}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-mono uppercase px-2 py-0.5 rounded-md border",
                    isDark
                      ? "bg-white/[0.03] border-white/[0.07] text-zinc-400"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  )}
                >
                  Isolated L2/L3
                </span>
              </div>
              <p className={cn("text-[11px] mt-1.5", isDark ? "text-zinc-500" : "text-slate-500")}>
                Private cloud subnets
              </p>
            </div>
          </Link>
        </motion.div>

        {/* 6. Account Balance */}
        <motion.div variants={itemVariants}>
          <Link
            href="/dashboard/billing"
            className={cn(
              "group flex flex-col justify-between p-4 sm:p-5 rounded-2xl border transition-all h-full",
              isDark
                ? "bg-[#0a0a0c] border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.015]"
                : "bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs"
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center border transition-colors",
                    isDark
                      ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                      : "bg-cyan-50 border-cyan-200 text-cyan-700"
                  )}
                >
                  <Wallet className="w-4 h-4" />
                </div>
                <span
                  className={cn(
                    "text-xs font-semibold tracking-wide",
                    isDark ? "text-zinc-400 group-hover:text-zinc-200" : "text-slate-600 group-hover:text-slate-900"
                  )}
                >
                  Credit Balance
                </span>
              </div>
              <ArrowUpRight
                className={cn(
                  "w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
                  isDark ? "text-zinc-600 group-hover:text-cyan-400" : "text-slate-400 group-hover:text-cyan-600"
                )}
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={cn(
                    "text-xl sm:text-2xl font-bold font-mono tracking-tight truncate",
                    isDark ? "text-white" : "text-slate-900"
                  )}
                >
                  {formatRupiah(billingData.balance || 0)}
                </span>
              </div>
              <p className={cn("text-[11px] mt-1.5", isDark ? "text-zinc-500" : "text-slate-500")}>
                Available PAYG cloud credit
              </p>
            </div>
          </Link>
        </motion.div>

        {/* 7. Unpaid Invoices */}
        <motion.div variants={itemVariants}>
          <Link
            href="/dashboard/billing"
            className={cn(
              "group flex flex-col justify-between p-4 sm:p-5 rounded-2xl border transition-all h-full",
              isDark
                ? "bg-[#0a0a0c] border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.015]"
                : "bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs"
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center border transition-colors",
                    unpaidInvoices > 0
                      ? isDark
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                        : "bg-amber-50 border-amber-200 text-amber-700"
                      : isDark
                      ? "bg-white/[0.03] border-white/[0.08] text-cyan-400 group-hover:border-cyan-500/30 group-hover:bg-cyan-500/10"
                      : "bg-slate-50 border-slate-200/80 text-cyan-700 group-hover:bg-cyan-50 group-hover:border-cyan-200"
                  )}
                >
                  <Receipt className="w-4 h-4" />
                </div>
                <span
                  className={cn(
                    "text-xs font-semibold tracking-wide",
                    isDark ? "text-zinc-400 group-hover:text-zinc-200" : "text-slate-600 group-hover:text-slate-900"
                  )}
                >
                  Unpaid Invoices
                </span>
              </div>
              <ArrowUpRight
                className={cn(
                  "w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
                  isDark ? "text-zinc-600 group-hover:text-cyan-400" : "text-slate-400 group-hover:text-cyan-600"
                )}
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={cn(
                    "text-2xl sm:text-3xl font-bold font-mono tracking-tight",
                    isDark ? "text-white" : "text-slate-900"
                  )}
                >
                  {unpaidInvoices}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-mono uppercase px-2 py-0.5 rounded-md border",
                    unpaidInvoices > 0
                      ? isDark
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                        : "bg-amber-50 border-amber-200 text-amber-700"
                      : isDark
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-emerald-50 border-emerald-200 text-emerald-700"
                  )}
                >
                  {unpaidInvoices > 0 ? "Action Needed" : "All Paid"}
                </span>
              </div>
              <p className={cn("text-[11px] mt-1.5", isDark ? "text-zinc-500" : "text-slate-500")}>
                Pending billing statements
              </p>
            </div>
          </Link>
        </motion.div>

        {/* 8. Support Tickets */}
        <motion.div variants={itemVariants}>
          <Link
            href="/dashboard/tickets"
            className={cn(
              "group flex flex-col justify-between p-4 sm:p-5 rounded-2xl border transition-all h-full",
              isDark
                ? "bg-[#0a0a0c] border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.015]"
                : "bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs"
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center border transition-colors",
                    isDark
                      ? "bg-white/[0.03] border-white/[0.08] text-cyan-400 group-hover:border-cyan-500/30 group-hover:bg-cyan-500/10"
                      : "bg-slate-50 border-slate-200/80 text-cyan-700 group-hover:bg-cyan-50 group-hover:border-cyan-200"
                  )}
                >
                  <MessageSquare className="w-4 h-4" />
                </div>
                <span
                  className={cn(
                    "text-xs font-semibold tracking-wide",
                    isDark ? "text-zinc-400 group-hover:text-zinc-200" : "text-slate-600 group-hover:text-slate-900"
                  )}
                >
                  Support Tickets
                </span>
              </div>
              <ArrowUpRight
                className={cn(
                  "w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
                  isDark ? "text-zinc-600 group-hover:text-cyan-400" : "text-slate-400 group-hover:text-cyan-600"
                )}
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={cn(
                    "text-2xl sm:text-3xl font-bold font-mono tracking-tight",
                    isDark ? "text-white" : "text-slate-900"
                  )}
                >
                  {openTickets}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-mono uppercase px-2 py-0.5 rounded-md border",
                    isDark
                      ? "bg-white/[0.03] border-white/[0.07] text-zinc-400"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  )}
                >
                  24/7 NOC
                </span>
              </div>
              <p className={cn("text-[11px] mt-1.5", isDark ? "text-zinc-500" : "text-slate-500")}>
                Active engineering inquiries
              </p>
            </div>
          </Link>
        </motion.div>
      </div>

      {/* Active Cloud VPS Section */}
      {vpsList.length > 0 && (
        <motion.div
          variants={itemVariants}
          className={cn(
            "border rounded-2xl overflow-hidden",
            isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs"
          )}
        >
          <div
            className={cn(
              "px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3",
              isDark ? "border-white/[0.06] bg-white/[0.01]" : "border-slate-100 bg-slate-50/50"
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center border shrink-0",
                  isDark
                    ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                    : "bg-cyan-50 border-cyan-200 text-cyan-700"
                )}
              >
                <Server className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className={cn("text-sm sm:text-base font-bold", isDark ? "text-white" : "text-slate-900")}>
                    Active Cloud VPS Instances
                  </h2>
                  <span
                    className={cn(
                      "text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md border",
                      isDark
                        ? "bg-white/[0.03] border-white/[0.07] text-zinc-400"
                        : "bg-white border-slate-200 text-slate-600"
                    )}
                  >
                    {vpsList.length}
                  </span>
                </div>
                <p className={cn("text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>
                  Deployed virtual servers, hardware allocation, and real-time power status.
                </p>
              </div>
            </div>
          </div>

          <div className={cn("divide-y", isDark ? "divide-white/[0.06]" : "divide-slate-100")}>
            {vpsList.slice((vpsPage - 1) * 4, vpsPage * 4).map((vps) => {
              const isRunning = vps.liveStatus?.status === "running";
              const ipAddr =
                vps.assignedIps?.[0]?.publicIp ||
                vps.assignedIps?.[0]?.ipAddress ||
                (vps.status === "PENDING" ? "Provisioning IP" : "No IP");
              const osIcon = getOsIcon(vps.osTemplate);

              return (
                <div
                  key={vps.id}
                  className={cn(
                    "p-4 sm:px-5 sm:py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 lg:gap-4 transition-colors",
                    isDark ? "hover:bg-white/[0.015]" : "hover:bg-slate-50/70"
                  )}
                >
                  {/* Top Row on Mobile / Left Side on Desktop: Hostname, OS Icon, IP & Mobile Status Pill */}
                  <div className="flex items-start sm:items-center justify-between gap-3 min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl border flex items-center justify-center p-2 shrink-0",
                          isDark ? "bg-white/[0.03] border-white/[0.08]" : "bg-slate-50 border-slate-200/80"
                        )}
                      >
                        {osIcon ? (
                          <img
                            referrerPolicy="no-referrer"
                            src={osIcon}
                            alt={vps.osTemplate || "OS"}
                            className="w-full h-full object-contain"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <Terminal className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-600")} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/vps/${vps.id}`}
                            className={cn(
                              "text-sm font-bold truncate hover:underline",
                              isDark ? "text-white hover:text-cyan-400" : "text-slate-900 hover:text-cyan-700"
                            )}
                          >
                            {vps.hostname}
                          </Link>
                          <span
                            className={cn(
                              "text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0",
                              isDark
                                ? "bg-white/[0.03] border-white/[0.07] text-zinc-500"
                                : "bg-slate-100 border-slate-200 text-slate-500"
                            )}
                          >
                            #{vps.id}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              if (ipAddr && ipAddr !== "No IP" && ipAddr !== "Provisioning IP") {
                                navigator.clipboard.writeText(ipAddr);
                                toast.success("IP address copied");
                              }
                            }}
                            className={cn(
                              "inline-flex items-center gap-1 text-xs font-mono transition-colors group/ip",
                              isDark ? "text-zinc-400 hover:text-cyan-400" : "text-slate-500 hover:text-cyan-700"
                            )}
                            title="Copy IP Address"
                          >
                            {ipAddr}
                            <Copy className="w-3 h-3 opacity-0 group-hover/ip:opacity-100 transition-opacity" />
                          </button>
                          {vps.node && (
                            <>
                              <span className={cn("text-xs", isDark ? "text-zinc-700" : "text-slate-300")}>•</span>
                              <span className={cn("text-[11px] font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>
                                Node: <strong className={isDark ? "text-zinc-300" : "text-slate-700"}>{vps.node}</strong>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge on Mobile (Top-Right aligned) */}
                    <span
                      className={cn(
                        "lg:hidden inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border shrink-0",
                        isRunning
                          ? isDark
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : isDark
                          ? "bg-white/[0.04] text-zinc-400 border-white/[0.08]"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      )}
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          isRunning ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
                        )}
                      />
                      {vps.liveStatus?.status || "STOPPED"}
                    </span>
                  </div>

                  {/* Hardware Specs Strip + Desktop Status & Manage CTA */}
                  <div className="flex flex-col sm:flex-row lg:items-center justify-between lg:justify-end gap-2.5 sm:gap-3">
                    {/* Hardware Spec Pills (Equal 3-column grid on mobile, inline flex on sm+) */}
                    <div className="grid grid-cols-3 sm:flex items-center gap-1.5 w-full sm:w-auto">
                      {vps.cpuCores && (
                        <span
                          className={cn(
                            "inline-flex items-center justify-center sm:justify-start gap-1.5 px-2 sm:px-2.5 py-1.5 sm:py-1 rounded-lg text-[11px] font-mono font-medium border truncate",
                            isDark
                              ? "bg-white/[0.02] border-white/[0.06] text-zinc-300"
                              : "bg-slate-50 border-slate-200/80 text-slate-700"
                          )}
                        >
                          <Cpu className="w-3 h-3 text-cyan-500 shrink-0" />
                          <span className="truncate">{vps.cpuCores} vCPU</span>
                        </span>
                      )}
                      {vps.ramGb && (
                        <span
                          className={cn(
                            "inline-flex items-center justify-center sm:justify-start gap-1.5 px-2 sm:px-2.5 py-1.5 sm:py-1 rounded-lg text-[11px] font-mono font-medium border truncate",
                            isDark
                              ? "bg-white/[0.02] border-white/[0.06] text-zinc-300"
                              : "bg-slate-50 border-slate-200/80 text-slate-700"
                          )}
                        >
                          <Activity className="w-3 h-3 text-cyan-500 shrink-0" />
                          <span className="truncate">{vps.ramGb >= 1 ? `${vps.ramGb} GB` : `${vps.ramGb * 1024} MB`} RAM</span>
                        </span>
                      )}
                      {vps.diskGb && (
                        <span
                          className={cn(
                            "inline-flex items-center justify-center sm:justify-start gap-1.5 px-2 sm:px-2.5 py-1.5 sm:py-1 rounded-lg text-[11px] font-mono font-medium border truncate",
                            isDark
                              ? "bg-white/[0.02] border-white/[0.06] text-zinc-300"
                              : "bg-slate-50 border-slate-200/80 text-slate-700"
                          )}
                        >
                          <HardDrive className="w-3 h-3 text-cyan-500 shrink-0" />
                          <span className="truncate">{vps.diskGb} GB NVMe</span>
                        </span>
                      )}
                    </div>

                    {/* Desktop Status + Manage CTA */}
                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                      <span
                        className={cn(
                          "hidden lg:inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border shrink-0",
                          isRunning
                            ? isDark
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : isDark
                            ? "bg-white/[0.04] text-zinc-400 border-white/[0.08]"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        )}
                      >
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            isRunning ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
                          )}
                        />
                        {vps.liveStatus?.status || "STOPPED"}
                      </span>

                      <Link
                        href={`/dashboard/vps/${vps.id}`}
                        className={cn(
                          "w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl sm:rounded-lg border text-xs font-semibold transition-all shrink-0",
                          isDark
                            ? "bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-zinc-200 hover:text-white"
                            : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-2xs"
                        )}
                      >
                        <span>Manage</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {vpsList.length > 4 && (
            <div
              className={cn(
                "px-5 py-3 border-t",
                isDark ? "border-white/[0.06] bg-white/[0.01]" : "border-slate-100 bg-slate-50/50"
              )}
            >
              <Pagination
                currentPage={vpsPage}
                totalPages={Math.ceil(vpsList.length / 4)}
                onPageChange={setVpsPage}
              />
            </div>
          )}
        </motion.div>
      )}

      {/* Managed Kubernetes Section */}
      {k3sList.length > 0 && (
        <motion.div
          variants={itemVariants}
          className={cn(
            "border rounded-2xl overflow-hidden",
            isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs"
          )}
        >
          <div
            className={cn(
              "px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3",
              isDark ? "border-white/[0.06] bg-white/[0.01]" : "border-slate-100 bg-slate-50/50"
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center border shrink-0",
                  isDark
                    ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                    : "bg-cyan-50 border-cyan-200 text-cyan-700"
                )}
              >
                <SiKubernetes className="w-4 h-4" />
              </div>
              <div>
                <h2 className={cn("text-sm sm:text-base font-bold", isDark ? "text-white" : "text-slate-900")}>
                  Managed Kubernetes Clusters
                </h2>
                <p className={cn("text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>
                  Your K3s control planes and worker node pools.
                </p>
              </div>
            </div>
          </div>

          <div className={cn("divide-y", isDark ? "divide-white/[0.06]" : "divide-slate-100")}>
            {k3sList.slice((k3sPage - 1) * 3, k3sPage * 3).map((cluster) => {
              const isClusterActive = cluster.status === "ACTIVE" || cluster.status === "RUNNING";
              return (
                <div
                  key={cluster.id}
                  className={cn(
                    "p-4 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 transition-colors",
                    isDark ? "hover:bg-white/[0.015]" : "hover:bg-slate-50/70"
                  )}
                >
                  <div className="flex items-start sm:items-center justify-between gap-3 min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0",
                          isDark
                            ? "bg-white/[0.03] border-white/[0.08] text-cyan-400"
                            : "bg-slate-50 border-slate-200 text-cyan-700"
                        )}
                      >
                        <SiKubernetes className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className={cn("text-sm font-bold truncate", isDark ? "text-white" : "text-slate-900")}>
                          {cluster.name}
                        </h3>
                        <p className={cn("text-xs font-mono mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                          {cluster.version} • {cluster.nodeCount} nodes
                        </p>
                      </div>
                    </div>

                    <span
                      className={cn(
                        "sm:hidden inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border shrink-0",
                        isClusterActive
                          ? isDark
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : isDark
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      )}
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          isClusterActive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                        )}
                      />
                      {cluster.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
                    <span
                      className={cn(
                        "hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border shrink-0",
                        isClusterActive
                          ? isDark
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : isDark
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      )}
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          isClusterActive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                        )}
                      />
                      {cluster.status}
                    </span>

                    <Link
                      href={`/dashboard/k3s/${cluster.id}`}
                      className={cn(
                        "w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl sm:rounded-lg border text-xs font-semibold transition-all shrink-0",
                        isDark
                          ? "bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-zinc-200 hover:text-white"
                          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-2xs"
                      )}
                    >
                      <span>Manage</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {k3sList.length > 3 && (
            <div
              className={cn(
                "px-5 py-3 border-t",
                isDark ? "border-white/[0.06] bg-white/[0.01]" : "border-slate-100 bg-slate-50/50"
              )}
            >
              <Pagination
                currentPage={k3sPage}
                totalPages={Math.ceil(k3sList.length / 3)}
                onPageChange={setK3sPage}
              />
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
