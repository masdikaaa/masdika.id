"use client";

import { useEffect, useState } from "react";
import { motion, Variants } from "framer-motion";
import { Server, Loader2, Database, ChevronRight, ChevronLeft, HardDrive, Cpu, Wallet, Network, Receipt, Globe, RefreshCw, Terminal, UploadCloud, Layers, Box, Cloud, Newspaper } from "lucide-react";
import { SiKubernetes } from "react-icons/si";
import Link from "next/link";
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

export default function DashboardOverview() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [storageUsage, setStorageUsage] = useState<any>(null);
  const [cdnUsage, setCdnUsage] = useState<any>(null);
  const [vpsList, setVpsList] = useState<any[]>([]);
  const [k3sList, setK3sList] = useState<any[]>([]);
  const [reservedIpsList, setReservedIpsList] = useState<any[]>([]);
  const [vpcList, setVpcList] = useState<any[]>([]);
  const [billingData, setBillingData] = useState<any>({ balance: 0, invoices: [] });
  const [beritaList, setBeritaList] = useState<any[]>([]);
  const [bannersList, setBannersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [vpsPage, setVpsPage] = useState(1);
  const [k3sPage, setK3sPage] = useState(1);
  const [beritaPage, setBeritaPage] = useState(1);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  useEffect(() => {
    const safeJson = (res: Response) => res.ok ? res.json() : Promise.resolve(null);

    Promise.all([
      fetch("/api/user/billing").then(safeJson),
      fetch("/api/user/storage-usage").then(safeJson),
      fetch("/api/user/cdn/quota").then(safeJson),  
      fetch("/api/user/vps").then(safeJson),
      fetch("/api/user/k3s").then(safeJson),
      fetch("/api/user/reserved-ips").then(safeJson),
      fetch("/api/dashboard/vpc").then(safeJson),
      fetch("/api/announcements").then(safeJson),
      fetch("/api/banners").then(safeJson)
    ])
      .then(([billingRes, storageData, cdnData, vpsData, k3sData, ipsData, vpcData, beritaData, bannersData]) => {
        if (billingRes?.success) setBillingData(billingRes.data);
        if (storageData?.success) setStorageUsage(storageData.data);
        if (cdnData && !cdnData.error) setCdnUsage(cdnData);
        if (Array.isArray(vpsData)) setVpsList(vpsData);
        if (Array.isArray(k3sData)) setK3sList(k3sData);
        if (Array.isArray(ipsData)) setReservedIpsList(ipsData);
        if (Array.isArray(vpcData)) setVpcList(vpcData);
        if (Array.isArray(beritaData)) setBeritaList(beritaData);
        if (Array.isArray(bannersData)) setBannersList(bannersData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalVps = vpsList.length;
  const totalK3s = k3sList.length;
  const totalIps = reservedIpsList.length;
  const totalVpc = vpcList.length;
  const unpaidInvoices = billingData.invoices?.filter((i: any) => i.status === 'PENDING').length || 0;

  const activeBanners = bannersList.filter(b => b.isActive && b.imageUrl);
  const newsList = beritaList;

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % activeBanners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeBanners.length]);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
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
    const stripped = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return stripped.length > 0 ? stripped : "No summary available";
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center">
        <RefreshCw className="w-10 h-10 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6 pb-10"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Top Section: Promo Banner & Berita Widget */}
      <div className={cn("grid gap-6", activeBanners.length > 0 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>
        {/* Promo Banner */}
        {activeBanners.length > 0 && (
          <motion.div variants={itemVariants} className={cn("relative overflow-hidden rounded-3xl shadow-sm group aspect-[2/1] w-full border bg-[#0f172a]", isDark ? "border-white/5" : "border-slate-200")}>
            {activeBanners.map((banner, idx) => (
              <Link 
                key={banner.id} 
                href={banner.actionUrl || "#"} 
                className={cn(
                  "absolute inset-0 w-full h-full cursor-pointer transition-opacity duration-1000",
                  idx === currentBannerIndex ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                )}
              >
                <img referrerPolicy="no-referrer" 
                  src={banner.imageUrl} 
                  alt={banner.title || "Promo Banner"} 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-[10000ms] group-hover:scale-105"
                loading="lazy" decoding="async" />
              </Link>
            ))}
            
            {/* Overlay for slider navigation dots */}
            {activeBanners.length > 1 && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
                {activeBanners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => { e.preventDefault(); setCurrentBannerIndex(idx); }}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300 shadow-sm",
                      idx === currentBannerIndex ? "w-6 bg-white/90" : "w-2 bg-white/40 hover:bg-white/70"
                    )}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Berita Widget */}
        <motion.div variants={itemVariants} className={cn("rounded-3xl flex flex-col w-full border backdrop-blur-sm transition-colors", activeBanners.length > 0 ? "lg:aspect-[2/1] min-h-[350px] lg:min-h-0" : "min-h-[250px]", isDark ? "bg-white/[0.02] border-white/5 shadow-sm" : "bg-white border-slate-200 shadow-sm")}>
          <div className={cn("p-5 border-b flex justify-between items-center shrink-0", isDark ? "border-white/5" : "border-slate-100")}>
            <h3 className={cn("text-base font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
              <Newspaper className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-600")} />
              Announcements
            </h3>
            <Link href="/dashboard/berita" className={cn("text-xs font-medium transition-colors", isDark ? "text-cyan-400 hover:text-cyan-300" : "text-cyan-600 hover:text-cyan-700")}>
              View All
            </Link>
          </div>
          <div className="p-5 flex flex-col gap-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
            {newsList.length === 0 ? (
              <div className={cn("text-sm text-center py-8", isDark ? "text-zinc-500" : "text-slate-500")}>No announcements yet.</div>
            ) : (
              newsList.slice((beritaPage - 1) * 3, beritaPage * 3).map((berita) => (
                <div key={berita.id} className={cn("group border-b pb-4 last:border-0 last:pb-0", isDark ? "border-white/5" : "border-slate-100")}>
                  <Link href={`/dashboard/berita/${berita.id}`} className="block">
                    <h4 className={cn("text-sm font-bold transition-colors mb-1.5 line-clamp-1", isDark ? "text-cyan-400 group-hover:text-cyan-300" : "text-cyan-600 group-hover:text-cyan-700")}>
                      {berita.title}
                    </h4>
                    <p className={cn("text-xs line-clamp-2 mb-2.5 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>
                      {getBeritaExcerpt(berita.content)}
                    </p>
                    <div className="flex justify-between items-center mt-2">
                      <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-md transition-colors", isDark ? "bg-white/5 text-zinc-400 group-hover:bg-cyan-500/10 group-hover:text-cyan-400" : "bg-slate-100 text-slate-500 group-hover:bg-cyan-50 group-hover:text-cyan-600")}>
                        {berita.type === "MAINTENANCE" ? "Maintenance" : berita.type === "WARNING" ? "Warning" : "Info"}
                      </span>
                      <span className={cn("text-[10px] font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>
                        {new Date(berita.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </Link>
                </div>
              ))
            )}
          </div>
          
          {newsList.length > 3 && (
            <div className={cn("p-4 border-t shrink-0", isDark ? "border-white/5 bg-black/20" : "border-slate-100 bg-slate-50/50 rounded-b-3xl")}>
              <Pagination currentPage={beritaPage} totalPages={Math.ceil(newsList.length / 3)} onPageChange={setBeritaPage} />
            </div>
          )}
        </motion.div>
      </div>

      {/* Stats Grid - Bento Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div variants={itemVariants} className={cn("backdrop-blur-sm border rounded-3xl relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 cursor-pointer", isDark ? "bg-white/[0.02] border-white/5 shadow-sm hover:border-cyan-500/30 hover:bg-white/[0.04]" : "bg-white border-slate-200 shadow-sm hover:border-cyan-300 hover:shadow-md")}>
          <Link href="/dashboard/vps" className="block p-6 h-full w-full">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h3 className={cn("font-medium text-xs uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Active VPS</h3>
              <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center transition-all", isDark ? "bg-cyan-500/10 border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]" : "bg-cyan-50 border-cyan-200")}>
                <Terminal className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
              </div>
            </div>
            <p className={cn("text-4xl font-black tracking-tight relative z-10", isDark ? "text-white" : "text-slate-900")}>{totalVps}</p>
            <p className={cn("text-xs mt-2 font-medium relative z-10", isDark ? "text-zinc-500" : "text-slate-400")}>Currently deployed virtual servers</p>
          </Link>
        </motion.div>

        <motion.div variants={itemVariants} className={cn("backdrop-blur-sm border rounded-3xl relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 cursor-pointer", isDark ? "bg-white/[0.02] border-white/5 shadow-sm hover:border-cyan-500/30 hover:bg-white/[0.04]" : "bg-white border-slate-200 shadow-sm hover:border-cyan-300 hover:shadow-md")}>
          <Link href="/dashboard/k3s" className="block p-6 h-full w-full">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h3 className={cn("font-medium text-xs uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Managed K3s</h3>
              <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center transition-all", isDark ? "bg-cyan-500/10 border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]" : "bg-cyan-50 border-cyan-200")}>
                <SiKubernetes className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
              </div>
            </div>
            <p className={cn("text-4xl font-black tracking-tight relative z-10", isDark ? "text-white" : "text-slate-900")}>{totalK3s}</p>
            <p className={cn("text-xs mt-2 font-medium relative z-10", isDark ? "text-zinc-500" : "text-slate-400")}>Active Kubernetes clusters</p>
          </Link>
        </motion.div>

        <motion.div variants={itemVariants} className={cn("backdrop-blur-sm border rounded-3xl relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 cursor-pointer", isDark ? "bg-white/[0.02] border-white/5 shadow-sm hover:border-cyan-500/30 hover:bg-white/[0.04]" : "bg-white border-slate-200 shadow-sm hover:border-cyan-300 hover:shadow-md")}>
          <Link href="/dashboard/reserved-ips" className="block p-6 h-full w-full">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h3 className={cn("font-medium text-xs uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Reserved IPs</h3>
              <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center transition-all", isDark ? "bg-cyan-500/10 border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]" : "bg-cyan-50 border-cyan-200")}>
                <Network className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
              </div>
            </div>
            <p className={cn("text-4xl font-black tracking-tight relative z-10", isDark ? "text-white" : "text-slate-900")}>{totalIps}</p>
            <p className={cn("text-xs mt-2 font-medium relative z-10", isDark ? "text-zinc-500" : "text-slate-400")}>Reserved static IPs (IPv4 / IPv6)</p>
          </Link>
        </motion.div>




        <motion.div variants={itemVariants} className={cn("backdrop-blur-sm border rounded-3xl relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 cursor-pointer", isDark ? "bg-white/[0.02] border-white/5 shadow-sm hover:border-cyan-500/30 hover:bg-white/[0.04]" : "bg-white border-slate-200 shadow-sm hover:border-cyan-300 hover:shadow-md")}>
          <Link href="/dashboard/cdn" className="block p-6 h-full w-full">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h3 className={cn("font-medium text-xs uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>File CDN</h3>
              <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center transition-all", isDark ? "bg-cyan-500/10 border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]" : "bg-cyan-50 border-cyan-200")}>
                <UploadCloud className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
              </div>
            </div>
            <div className="mt-4 relative z-10">
              <div className="flex justify-between items-end mb-2">
                <div className="flex items-end gap-1">
                  <span className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                    {cdnUsage ? (cdnUsage.usedBytes / (1024 * 1024 * 1024)).toFixed(2) : "0.00"}
                  </span>
                  <span className={cn("text-xs font-semibold mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>GB used</span>
                </div>
                <div className={cn("text-xs mb-1", isDark ? "text-zinc-500" : "text-slate-400")}>
                  of {cdnUsage && cdnUsage.limitGB > 0 ? cdnUsage.limitGB + " GB" : "0 GB"}
                </div>
              </div>
              <div className={cn("w-full rounded-full h-1.5 overflow-hidden", isDark ? "bg-white/5" : "bg-slate-100")}>
                <div 
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-1.5 rounded-full" 
                  style={{ width: cdnUsage?.limitBytes > 0 ? `${Math.min(100, ((cdnUsage?.usedBytes || 0) / cdnUsage.limitBytes) * 100)}%` : '0%' }}
                />
              </div>
            </div>
          </Link>
        </motion.div>

        <motion.div variants={itemVariants} className={cn("backdrop-blur-sm border rounded-3xl relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 cursor-pointer", isDark ? "bg-white/[0.02] border-white/5 shadow-sm hover:border-cyan-500/30 hover:bg-white/[0.04]" : "bg-white border-slate-200 shadow-sm hover:border-cyan-300 hover:shadow-md")}>
          <Link href="/dashboard/vpc" className="block p-6 h-full w-full">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h3 className={cn("font-medium text-xs uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>VPC Networks</h3>
              <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center transition-all", isDark ? "bg-cyan-500/10 border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]" : "bg-cyan-50 border-cyan-200")}>
                <VpcIcon className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
              </div>
            </div>
            <p className={cn("text-4xl font-black tracking-tight relative z-10", isDark ? "text-white" : "text-slate-900")}>{totalVpc}</p>
            <p className={cn("text-xs mt-2 font-medium relative z-10", isDark ? "text-zinc-500" : "text-slate-400")}>Active Virtual Private Clouds</p>
          </Link>
        </motion.div>

        <motion.div variants={itemVariants} className={cn("backdrop-blur-sm border rounded-3xl relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 cursor-pointer", isDark ? "bg-white/[0.02] border-white/5 shadow-sm hover:border-cyan-500/30 hover:bg-white/[0.04]" : "bg-white border-slate-200 shadow-sm hover:border-cyan-300 hover:shadow-md")}>
          <Link href="/dashboard/billing" className="block p-6 h-full w-full">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h3 className={cn("font-medium text-xs uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Account Balance</h3>
              <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center transition-all", isDark ? "bg-cyan-500/10 border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]" : "bg-cyan-50 border-cyan-200")}>
                <Wallet className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
              </div>
            </div>
            <p className={cn("text-3xl font-black tracking-tight truncate relative z-10", isDark ? "text-white" : "text-slate-900")}>{formatRupiah(billingData.balance || 0)}</p>
            <p className={cn("text-xs mt-2 font-medium relative z-10", isDark ? "text-zinc-500" : "text-slate-400")}>Available credits for deployment</p>
          </Link>
        </motion.div>

        <motion.div variants={itemVariants} className={cn("backdrop-blur-sm border rounded-3xl relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 cursor-pointer", isDark ? "bg-white/[0.02] border-white/5 shadow-sm hover:border-cyan-500/30 hover:bg-white/[0.04]" : "bg-white border-slate-200 shadow-sm hover:border-cyan-300 hover:shadow-md")}>
          <Link href="/dashboard/billing" className="block p-6 h-full w-full">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h3 className={cn("font-medium text-xs uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Unpaid Invoices</h3>
              <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center transition-all", isDark ? "bg-cyan-500/10 border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]" : "bg-cyan-50 border-cyan-200")}>
                <Receipt className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
              </div>
            </div>
            <p className={cn("text-4xl font-black tracking-tight relative z-10", isDark ? "text-white" : "text-slate-900")}>{unpaidInvoices}</p>
            <p className={cn("text-xs mt-2 font-medium relative z-10", isDark ? "text-zinc-500" : "text-slate-400")}>Invoices pending payment</p>
          </Link>
        </motion.div>
      </div>

      {/* Active Cloud VPS */}
      {vpsList.length > 0 && (
        <motion.div
          variants={itemVariants}
          className={cn("backdrop-blur-md border rounded-3xl overflow-hidden shadow-md relative", isDark ? "bg-white/[0.02]/40 border-white/5" : "bg-white/70 border-slate-200")}
        >
          <div className={cn("absolute inset-0 pointer-events-none", isDark ? "bg-gradient-to-b from-white/[0.02] to-transparent" : "bg-gradient-to-b from-slate-50 to-transparent")} />

          <div className={cn("p-6 md:p-8 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10", isDark ? "border-white/5" : "border-slate-100")}>
            <div>
              <h2 className={cn("text-xl font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                <Cloud className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                Active Cloud VPS
              </h2>
              <p className={cn("text-sm mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>Your virtual private servers and their current status.</p>
            </div>
            <Link
              href="/dashboard/vps"
              className={cn("group flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm transition-all", isDark ? "bg-white/5 hover:bg-white/10 border-white/5 text-zinc-300 hover:text-white" : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900")}
            >
              Manage VPS <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="p-6 md:p-8 grid gap-4 relative z-10">
            {vpsList.slice((vpsPage - 1) * 3, vpsPage * 3).map((vps) => (
              <div key={vps.id} className={cn("group flex flex-col md:flex-row items-center justify-between p-4 rounded-xl border transition-all duration-300", isDark ? "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-cyan-500/30" : "bg-white border-slate-200 hover:bg-slate-50 hover:border-cyan-300 hover:shadow-sm")}>
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center shrink-0">
                    <Terminal className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                  </div>
                  <div>
                    <h3 className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>{vps.hostname}</h3>
                    <p className={cn("text-xs font-mono tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>{vps.assignedIps?.[0]?.publicIp || vps.assignedIps?.[0]?.ipAddress || (vps.status === 'PENDING' ? "Provisioning IP" : "No IP")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto mt-4 md:mt-0 justify-between md:justify-end">
                  <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider", vps.liveStatus?.status === "running" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30")}>
                    {vps.liveStatus?.status || "STOPPED"}
                  </span>
                  <Link href={`/dashboard/vps/${vps.id}`} className={cn("px-4 py-2 rounded-lg border text-sm font-medium transition-all", isDark ? "bg-white/5 hover:bg-white/10 border-white/5 text-white" : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900")}>
                    Console
                  </Link>
                </div>
              </div>
            ))}

            {vpsList.length > 3 && (
              <div className={cn("mt-2 pt-6 border-t", isDark ? "border-white/5" : "border-slate-100")}>
                <Pagination currentPage={vpsPage} totalPages={Math.ceil(vpsList.length / 3)} onPageChange={setVpsPage} />
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Managed Kubernetes */}
      {k3sList.length > 0 && (
        <motion.div
          variants={itemVariants}
          className={cn("bg-white/[0.02]/40 backdrop-blur-md border rounded-3xl overflow-hidden shadow-md relative", isDark ? "border-white/5" : "border-slate-200")}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

          <div className={cn("p-6 md:p-8 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10", isDark ? "border-white/5" : "border-slate-100")}>
            <div>
              <h2 className={cn("text-xl font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                <Server className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                Managed Kubernetes
              </h2>
              <p className={cn("text-sm mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>Your K3s clusters and their deployment status.</p>
            </div>
            <Link
              href="/dashboard/k3s"
              className={cn("group flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm transition-all", isDark ? "bg-white/5 hover:bg-white/10 border-white/5 text-zinc-300 hover:text-white" : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900")}
            >
              Manage Clusters <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="p-6 md:p-8 grid gap-4 relative z-10">
            {k3sList.slice((k3sPage - 1) * 3, k3sPage * 3).map((cluster) => (
              <div key={cluster.id} className={cn("group flex flex-col md:flex-row items-center justify-between p-4 rounded-xl border transition-all duration-300", isDark ? "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-cyan-500/30" : "bg-white border-slate-200 hover:bg-slate-50 hover:border-cyan-300 hover:shadow-sm")}>
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/20 border border-cyan-500/20 flex items-center justify-center shrink-0">
                    <SiKubernetes className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                  </div>
                  <div>
                    <h3 className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>{cluster.name}</h3>
                    <p className={cn("text-xs font-mono tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>{cluster.version} • {cluster.nodeCount} nodes</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto mt-4 md:mt-0 justify-between md:justify-end">
                  <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider", (cluster.status === "ACTIVE" || cluster.status === "RUNNING") ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30")}>
                    {cluster.status}
                  </span>
                  <Link href={`/dashboard/k3s/${cluster.id}`} className={cn("px-4 py-2 rounded-lg border text-sm font-medium transition-all", isDark ? "bg-white/5 hover:bg-white/10 border-white/5 text-white" : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900")}>
                    Manage
                  </Link>
                </div>
              </div>
            ))}

            {k3sList.length > 3 && (
              <div className={cn("mt-2 pt-6 border-t", isDark ? "border-white/5" : "border-slate-100")}>
                <Pagination currentPage={k3sPage} totalPages={Math.ceil(k3sList.length / 3)} onPageChange={setK3sPage} />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}