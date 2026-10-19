'use client';

import { useUrlNumber, useUrlString } from "@/lib/useUrlTab";
import { useState, useEffect } from "react";
import { Receipt, Globe, Clock, CheckCircle, XCircle, CreditCard, ExternalLink, ArrowUpCircle, Printer, Plus, X, Wallet, Building2, Store, QrCode, Database, Layers, ArrowRight, RefreshCw, HardDrive, Cloud, Activity, Music, PlaySquare, FileText, Link as LinkIcon, Code2, Server, Box, Loader2, Search, Calendar, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { formatRupiah, getCycleText } from "@/lib/billing";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Pagination } from "@/components/ui/Pagination";
import { useTheme } from "@/components/ThemeProvider";

const getServiceIcon = (service: string) => {
  if (!service) return <Database className="w-4 h-4 text-cyan-400" />;
  const s = service.toUpperCase();
  if (s.includes('STORAGE') || s.includes('CDN')) return <HardDrive className="w-4 h-4 text-cyan-400" />;
  if (s.includes('DB') || s.includes('DATABASE')) return <Database className="w-4 h-4 text-cyan-400" />;
  if (s.includes('BMKG') || s.includes('WEATHER')) return <Cloud className="w-4 h-4 text-cyan-400" />;
  if (s.includes('EARTHQUAKE') || s.includes('QUAKE')) return <Activity className="w-4 h-4 text-cyan-400" />;
  if (s.includes('SPOTIFY') || s.includes('MUSIC')) return <Music className="w-4 h-4 text-cyan-400" />;
  if (s.includes('TIKTOK') || s.includes('YOUTUBE') || s.includes('VIDEO')) return <PlaySquare className="w-4 h-4 text-cyan-400" />;
  if (s.includes('BLOG') || s.includes('TEXT')) return <FileText className="w-4 h-4 text-cyan-400" />;
  if (s.includes('SHORTENER') || s.includes('URL')) return <LinkIcon className="w-4 h-4 text-cyan-400" />;
  
  return <Code2 className="w-4 h-4 text-cyan-400" />;
};

export default function CustomerBillingPage() {
  const fetchBilling = async () => {
    try {
      const res = await fetch("/api/user/billing");
      if (res.ok) {
        const json = await res.json();
        setData({
          subscriptions: json.data.subscriptions || [],
          invoices: json.data.invoices || [],
          vpsServices: json.data.vpsServices || [],
          reservedIps: json.data.reservedIps || [],
          balance: json.data.balance || 0
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [data, setData] = useState<{subscriptions: any[], invoices: any[], vpsServices: any[], reservedIps: any[], balance: number}>({ subscriptions: [], invoices: [], vpsServices: [], reservedIps: [], balance: 0 });
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  

  
  // Pagination State
  const [page, setPage] = useUrlNumber("page", 1);
  const itemsPerPage = 10;
  const [servicesPage, setServicesPage] = useUrlNumber("servicesPage", 1);
  const servicesPerPage = 4;
  const [searchQuery, setSearchQuery] = useUrlString<string>("searchQuery", "");
  const [selectedDate, setSelectedDate] = useUrlString<string>("selectedDate", "");

  const filteredInvoices = data.invoices.filter((inv) => {
    const invDate = new Date(inv.createdAt);

    if (selectedDate) {
      const invDateStr = invDate.toLocaleDateString('en-CA');
      if (invDateStr !== selectedDate) return false;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const invNumber = (inv.invoiceNumber || inv.merchantOrderId || "").toLowerCase();
      const status = (inv.status || "").toLowerCase();
      const desc = inv.type === 'TOP_UP' ? 'account top up' :
                   inv.type === 'VPS' || inv.type === 'VPS_UPGRADE' ? `cloud vps ${inv.vpsService?.hostname || ''}` :
                   inv.type === 'IP_RESERVATION' ? 'reserved ip' :
                   inv.type === 'SUBSCRIPTION' ? (inv.vpsService?.hostname || `${inv.subscription?.plan?.service || ''} ${inv.subscription?.plan?.name || ''}`) : '';
      const dateFormatted = invDate.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }).toLowerCase();
      if (!invNumber.includes(q) && !desc.toLowerCase().includes(q) && !status.includes(q) && !dateFormatted.includes(q)) {
        return false;
      }
    }
    return true;
  });

  useEffect(() => {
    fetchBilling();
    // Real-time polling every 15 seconds
    const interval = setInterval(fetchBilling, 15000);
    return () => clearInterval(interval);
  }, []);





  const handleToggleAutoRenew = async (serviceId: number | string, serviceType: string, currentStatus: boolean) => {
    const toggleId = `${serviceType}-${serviceId}`;
    if (toggling === toggleId) return;
    setToggling(toggleId);
    const toastId = toast.loading("Updating auto-renew setting...");
    try {
      const res = await fetch("/api/user/billing/toggle-autorenew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, serviceType, autoRenew: !currentStatus })
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Auto-renew setting updated!", { id: toastId });
        await fetchBilling(); // Refresh data
      } else {
        toast.error(json.error || "Failed to update setting", { id: toastId });
      }
    } catch (error) {
      toast.error("An error occurred", { id: toastId });
    } finally {
      setToggling(null);
    }
  };

  const activeSubscriptions = data.subscriptions.filter(s => s.status === 'ACTIVE');
  const activeVps = data.vpsServices.filter(s => s.status === 'RUNNING' || s.status === 'STOPPED');
  const activeIps = data.reservedIps;
  const totalActive = activeSubscriptions.length + activeVps.length + activeIps.length;

  const unifiedServices = [
    ...activeSubscriptions.map(s => ({ type: 'SUBSCRIPTION', data: s, key: `sub-${s.id}` })),
    ...activeVps.map(v => ({ type: 'VPS', data: v, key: `vps-${v.id}` })),
    ...activeIps.map(ip => ({ type: 'RESERVED_IP', data: ip, key: `ip-${ip.id}` }))
  ];
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center">
        <RefreshCw className="w-10 h-10 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div className="space-y-6 md:space-y-8 pb-10" variants={containerVariants} initial="hidden" animate="visible">
      {/* Hero Header */}
      <motion.div variants={itemVariants} className={cn("relative overflow-hidden rounded-3xl p-6 md:p-8 shadow-md group flex flex-col md:flex-row md:items-center justify-between gap-6 border", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200 shadow-sm")}>
        <div className="relative z-10 shrink-0">
          <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 tracking-wide border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-100 border-cyan-200 text-cyan-700")}>
            <CreditCard className="w-3 h-3" /> Secure Billing
          </div>
          <h1 className={cn("text-3xl md:text-4xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Billing & <span className={cn(isDark ? "text-cyan-400" : "text-cyan-600")}>Invoices</span>
          </h1>
          <p className={cn("text-sm max-w-md", isDark ? "text-zinc-400" : "text-slate-500")}>Manage your subscriptions, view invoice history, and securely top up your account balance.</p>
        </div>
        
        <div className="relative z-10 shrink-0">
          <Link 
            href="/dashboard/checkout"
            className="w-full md:w-auto px-5 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Order New Service
          </Link>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div variants={itemVariants} className={cn("rounded-3xl shadow-md overflow-hidden p-6 md:p-8 flex flex-col relative group border", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200 shadow-sm")}>
          <h2 className={cn("text-lg font-bold mb-2 relative z-10 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
            <Layers className="w-5 h-5 text-cyan-400" /> Services Summary
          </h2>
          <p className={cn("text-xs mb-6 relative z-10 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
            Manage your active services and their auto-renewal preferences. Services with auto-renew enabled will automatically bill your account balance or default payment method.
          </p>
          <div className="flex-1 relative z-10">
            {loading ? (
              <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 text-cyan-500 animate-spin" /></div>
            ) : totalActive === 0 ? (
              <div className={cn("flex flex-col items-center justify-center h-full py-8 text-center rounded-2xl border shadow-sm", isDark ? "bg-[#060b14] border-slate-800" : "bg-white border-slate-200/90")}>
                <Layers className={cn("w-12 h-12 mb-4", isDark ? "text-zinc-600" : "text-slate-900")} />
                <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>You don't have any active services.</p>
              </div>
            ) : (
              <div className={cn("flex flex-col h-full rounded-2xl border shadow-sm overflow-hidden", isDark ? "bg-[#060b14] border-slate-800" : "bg-white border-slate-200/90")}>
                <div className={cn("p-4 border-b flex items-center justify-between", isDark ? "border-slate-800 bg-[#060b14]" : "border-slate-200 bg-slate-50/60")}>
                  <span className={cn("text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Active Services</span>
                  <span className={cn("text-xs font-bold px-2 py-1 rounded-full border", isDark ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" : "text-cyan-800 bg-cyan-500/10 border-cyan-500/20")}>{totalActive} Total</span>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[300px] custom-scrollbar p-2">
                  {unifiedServices.slice((servicesPage - 1) * servicesPerPage, servicesPage * servicesPerPage).map((item) => {
                    const type = item.type;
                    const key = item.key;
                    
                    if (type === 'SUBSCRIPTION') {
                      const s = item.data;
                      return (
                        <div key={key} className={cn("flex items-center justify-between p-3 rounded-xl transition-colors border mb-1", isDark ? "hover:bg-slate-800/40 border-transparent hover:border-slate-800" : "hover:bg-slate-50 border-transparent hover:border-slate-200")}>
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="shrink-0">{getServiceIcon(s.plan?.service)}</div>
                            <div className="min-w-0">
                              <div className={cn("text-sm font-bold truncate", isDark ? "text-white" : "text-slate-900")}>{s.plan?.name}</div>
                              <div className={cn("text-xs truncate", isDark ? "text-zinc-500" : "text-slate-500")}>{formatRupiah(s.plan?.price)}</div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end shrink-0 pl-2">
                            <button
                              onClick={() => handleToggleAutoRenew(s.id, 'SUBSCRIPTION', s.autoRenew)}
                              disabled={toggling === `SUBSCRIPTION-${s.id}`}
                              className={cn(
                                "group relative flex items-center justify-center w-10 h-5 rounded-full transition-all duration-300 border focus:outline-none",
                                s.autoRenew ? "bg-cyan-500/20 border-cyan-500/50" : isDark ? "bg-zinc-800 border-zinc-700 hover:border-zinc-600" : "bg-slate-200 border-slate-300 hover:border-slate-400",
                                toggling === `SUBSCRIPTION-${s.id}` && "opacity-50 cursor-wait"
                              )}
                            >
                              <div className={cn(
                                "absolute w-3.5 h-3.5 rounded-full transition-all duration-300 shadow-sm flex items-center justify-center",
                                s.autoRenew ? "translate-x-2 bg-cyan-400" : isDark ? "-translate-x-2 bg-zinc-500 group-hover:bg-zinc-400" : "-translate-x-2 bg-slate-400 group-hover:bg-slate-500"
                              )}>
                                {toggling === `SUBSCRIPTION-${s.id}` && <Loader2 className={cn("w-2.5 h-2.5 animate-spin", isDark ? "text-zinc-900" : "text-slate-900")} />}
                              </div>
                            </button>
                            <span className={cn("text-[9px] mt-1.5 font-bold uppercase tracking-widest transition-colors duration-300", s.autoRenew ? "text-cyan-400" : "text-zinc-500")}>
                              {s.autoRenew ? 'Auto' : 'Manual'}
                            </span>
                          </div>
                        </div>
                      );
                    } else if (type === 'VPS') {
                      const v = item.data;
                      return (
                        <div key={key} className={cn("flex items-center justify-between p-3 rounded-xl transition-colors border mb-1", isDark ? "hover:bg-slate-800/40 border-transparent hover:border-slate-800" : "hover:bg-slate-50 border-transparent hover:border-slate-200")}>
                          <div className="flex items-center gap-3 overflow-hidden">
                            <Server className="w-4 h-4 text-cyan-400 shrink-0" />
                            <div className="min-w-0">
                              <div className={cn("text-sm font-bold truncate", isDark ? "text-white" : "text-slate-900")}>{v.hostname}</div>
                              <div className={cn("text-xs truncate", isDark ? "text-zinc-500" : "text-slate-500")}>{v.billingMode === 'PAYG' ? 'PAYG' : formatRupiah(v.monthlyPrice || (v.hourlyRate * 720))}</div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end shrink-0 pl-2">
                            <button
                              onClick={() => handleToggleAutoRenew(v.id, 'VPS', v.autoRenew)}
                              disabled={toggling === `VPS-${v.id}`}
                              className={cn(
                                "group relative flex items-center justify-center w-10 h-5 rounded-full transition-all duration-300 border focus:outline-none",
                                v.autoRenew ? "bg-cyan-500/20 border-cyan-500/50" : isDark ? "bg-zinc-800 border-zinc-700 hover:border-zinc-600" : "bg-slate-200 border-slate-300 hover:border-slate-400",
                                toggling === `VPS-${v.id}` && "opacity-50 cursor-wait"
                              )}
                            >
                              <div className={cn(
                                "absolute w-3.5 h-3.5 rounded-full transition-all duration-300 shadow-sm flex items-center justify-center",
                                v.autoRenew ? "translate-x-2 bg-cyan-400" : isDark ? "-translate-x-2 bg-zinc-500 group-hover:bg-zinc-400" : "-translate-x-2 bg-slate-400 group-hover:bg-slate-500"
                              )}>
                                {toggling === `VPS-${v.id}` && <Loader2 className={cn("w-2.5 h-2.5 animate-spin", isDark ? "text-zinc-900" : "text-slate-900")} />}
                              </div>
                            </button>
                            <span className={cn("text-[9px] mt-1.5 font-bold uppercase tracking-widest transition-colors duration-300", v.autoRenew ? "text-cyan-400" : "text-zinc-500")}>
                              {v.autoRenew ? 'Auto' : 'Manual'}
                            </span>
                          </div>
                        </div>
                      );

                    } else if (type === 'RESERVED_IP') {
                      const ip = item.data;
                      return (
                        <div key={key} className={cn("flex items-center justify-between p-3 rounded-xl transition-colors border mb-1", isDark ? "hover:bg-slate-800/40 border-transparent hover:border-slate-800" : "hover:bg-slate-50 border-transparent hover:border-slate-200")}>
                          <div className="flex items-center gap-3 overflow-hidden">
                            <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
                            <div className="min-w-0">
                              <div className={cn("text-sm font-bold truncate", isDark ? "text-white" : "text-slate-900")}>{ip.ipAddress}</div>
                              <div className={cn("text-xs truncate", isDark ? "text-zinc-500" : "text-slate-500")}>{ip.billingMode === 'PAYG' ? 'PAYG' : formatRupiah(ip.monthlyPrice || (ip.hourlyRate * 720))}</div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end shrink-0 pl-2">
                            <button
                              onClick={() => handleToggleAutoRenew(ip.id, 'RESERVED_IP', ip.autoRenew)}
                              disabled={toggling === `RESERVED_IP-${ip.id}`}
                              className={cn(
                                "group relative flex items-center justify-center w-10 h-5 rounded-full transition-all duration-300 border focus:outline-none",
                                ip.autoRenew ? "bg-cyan-500/20 border-cyan-500/50" : isDark ? "bg-zinc-800 border-zinc-700 hover:border-zinc-600" : "bg-slate-200 border-slate-300 hover:border-slate-400",
                                toggling === `RESERVED_IP-${ip.id}` && "opacity-50 cursor-wait"
                              )}
                            >
                              <div className={cn(
                                "absolute w-3.5 h-3.5 rounded-full transition-all duration-300 shadow-sm flex items-center justify-center",
                                ip.autoRenew ? "translate-x-2 bg-cyan-400" : isDark ? "-translate-x-2 bg-zinc-500 group-hover:bg-zinc-400" : "-translate-x-2 bg-slate-400 group-hover:bg-slate-500"
                              )}>
                                {toggling === `RESERVED_IP-${ip.id}` && <Loader2 className={cn("w-2.5 h-2.5 animate-spin", isDark ? "text-zinc-900" : "text-slate-900")} />}
                              </div>
                            </button>
                            <span className={cn("text-[9px] mt-1.5 font-bold uppercase tracking-widest transition-colors duration-300", ip.autoRenew ? "text-cyan-400" : "text-zinc-500")}>
                              {ip.autoRenew ? 'Auto' : 'Manual'}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
                {totalActive > servicesPerPage && (
                  <div className={cn("p-3 border-t flex justify-between items-center", isDark ? "border-slate-800 bg-[#060b14]" : "border-slate-200 bg-slate-100/50")}>
                    <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>
                      Showing {(servicesPage - 1) * servicesPerPage + 1} to {Math.min(servicesPage * servicesPerPage, totalActive)} of {totalActive}
                    </span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setServicesPage(p => Math.max(1, p - 1))} 
                        disabled={servicesPage === 1} 
                        className={cn("p-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed border transition-all", isDark ? "bg-white/5 hover:bg-white/10 border-white/5 text-zinc-300" : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700")}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setServicesPage(p => Math.min(Math.ceil(totalActive / servicesPerPage), p + 1))} 
                        disabled={servicesPage >= Math.ceil(totalActive / servicesPerPage)} 
                        className={cn("p-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed border transition-all", isDark ? "bg-white/5 hover:bg-white/10 border-white/5 text-zinc-300" : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700")}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
        
        <motion.div variants={itemVariants} className={cn("rounded-3xl shadow-md overflow-hidden p-6 md:p-8 flex flex-col justify-between relative group border", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200 shadow-sm")}>
           <div className="relative z-10">
             <h2 className={cn("text-lg font-bold mb-6 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
               <Wallet className="w-5 h-5 text-cyan-400" /> Account Balance
             </h2>
             <div className={cn("p-6 rounded-2xl mb-6 relative overflow-hidden transition-colors border shadow-sm", isDark ? "bg-[#060b14] border-slate-800 group-hover:border-slate-700" : "bg-white border-slate-200/90 group-hover:border-slate-300")}>
               <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none select-none">
                 <Wallet className="w-24 h-24 -mb-6 -mr-6" />
               </div>
               <div className={cn("text-xs font-bold uppercase tracking-widest mb-2", isDark ? "text-zinc-500" : "text-slate-500")}>Available Balance</div>
               <div className={cn("text-3xl font-black text-transparent bg-clip-text break-all leading-tight", isDark ? "bg-gradient-to-r from-cyan-400 to-blue-500" : "bg-gradient-to-r from-cyan-600 to-blue-600")}>
                 {loading ? <span className={cn("text-2xl", isDark ? "text-zinc-600" : "text-slate-900")}>Loading...</span> : formatRupiah(data.balance)}
               </div>
             </div>
             <p className={cn("text-sm mb-8 leading-relaxed max-w-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
               Use your balance to pay for new subscriptions, automatic renewals, or pay-as-you-go usage.
             </p>
           </div>
           
           <Link
             href="/dashboard/topup"
             className="w-full px-5 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm"
           >
             <Plus className="w-4 h-4" />
             Top Up Balance
           </Link>
        </motion.div>
      </div>

      <motion.div variants={itemVariants} className={cn("rounded-3xl shadow-md overflow-hidden relative border", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200 shadow-sm")}>
        <div className={cn("p-6 md:p-8 border-b relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4", isDark ? "border-slate-800" : "border-slate-200")}>
          <h2 className={cn("text-xl font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
            <Receipt className="w-5 h-5 text-cyan-400" /> Billing History
          </h2>
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Calendar Filter */}
            <div className="relative flex items-center">
              <Calendar className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); setPage(1); }}
                className={cn("rounded-xl pl-10 pr-3 py-2 text-xs focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer relative z-0 border", isDark ? "bg-[#060b14] border-slate-800 text-white [color-scheme:dark]" : "bg-slate-50 border-slate-200 text-slate-900 [color-scheme:light]")}
                title="Filter by date (Day/Month/Year)"
              />
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className={cn("w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2", isDark ? "text-zinc-400" : "text-slate-500")} />
              <input
                type="text"
                placeholder="Search invoice, status, date..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className={cn("w-full border rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-cyan-500 transition-colors", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
              />
            </div>

            {/* Reset Button */}
            {(selectedDate || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedDate("");
                  setSearchQuery("");
                  setPage(1);
                }}
                className={cn("p-2 rounded-xl border transition-colors font-bold flex items-center justify-center", isDark ? "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500 hover:text-white" : "bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200")}
                title="Reset filters"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto relative z-10">
          <table className={cn("w-full text-left text-sm", isDark ? "text-zinc-400" : "text-slate-600")}>
            <thead className={cn("text-xs uppercase tracking-widest font-bold", isDark ? "bg-[#060b14] text-zinc-400" : "bg-slate-50 text-slate-500 border-b border-slate-200")}>
              <tr>
                <th className="px-6 py-5 whitespace-nowrap">Invoice Number</th>
                <th className="px-6 py-5 whitespace-nowrap">Description</th>
                <th className="px-6 py-5 whitespace-nowrap">Amount</th>
                <th className="px-6 py-5 whitespace-nowrap">Status</th>
                <th className="px-6 py-5 whitespace-nowrap">Date</th>
                <th className="px-6 py-5"></th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDark ? "divide-slate-800" : "divide-slate-200")}>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Receipt className={cn("w-12 h-12 mx-auto mb-3", isDark ? "text-zinc-600" : "text-slate-900")} />
                    <span className={cn("font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>{searchQuery ? "No matching invoices found." : "No invoices found."}</span>
                  </td>
                </tr>
              ) : (
                filteredInvoices.slice((page - 1) * itemsPerPage, page * itemsPerPage).map((invoice) => (
                  <tr key={invoice.id} className={cn("transition-colors group", isDark ? "hover:bg-slate-800/30" : "hover:bg-slate-50")}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-colors border", isDark ? "bg-slate-800/50 border-slate-700/50 group-hover:bg-cyan-500/10 group-hover:text-cyan-400" : "bg-slate-100 border-slate-200 group-hover:bg-slate-200 group-hover:text-slate-900")}>
                          <Receipt className="w-4 h-4" />
                        </div>
                        <span className={cn("font-mono text-xs px-2 py-1 rounded-md border", isDark ? "bg-[#060b14] text-white border-slate-800" : "bg-slate-100 text-slate-900 border-slate-200")}>{invoice.invoiceNumber || invoice.merchantOrderId}</span>
                      </div>
                    </td>
                    <td className={cn("px-6 py-4 whitespace-nowrap font-medium", isDark ? "text-white" : "text-slate-900")}>
                      {invoice.type === 'TOP_UP' ? (
                        <div className="flex items-center gap-2">
                          <ArrowUpCircle className="w-4 h-4 text-cyan-400" />
                          <span>Account Top Up</span>
                        </div>
                      ) : invoice.type === 'VPS' || invoice.type === 'VPS_UPGRADE' ? (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <Server className="w-4 h-4 text-cyan-400 shrink-0" />
                            <span className={cn("truncate font-bold", isDark ? "text-white" : "text-slate-900")}>{invoice.vpsService?.hostname ? `${invoice.type === 'VPS_UPGRADE' ? 'VPS Upgrade' : 'Cloud VPS'} - ${invoice.vpsService.hostname}` : (['PAYG_FIRST_HOUR', 'PAYG_RUNNING', 'PAYG_COMPLETED'].includes(invoice.reference) ? 'Cloud VPS (PAYG)' : 'Cloud VPS Order')}</span>
                          </div>
                          <span className={cn("text-xs ml-[24px]", isDark ? "text-zinc-500" : "text-slate-500")}>
                            {invoice.vpsService?.billingMode === 'PAYG' || ['PAYG_FIRST_HOUR', 'PAYG_RUNNING', 'PAYG_COMPLETED'].includes(invoice.reference) ? 'Pay-As-You-Go' : 'Flex Month'}
                          </span>
                          {(invoice.type === 'VPS_UPGRADE' || invoice.type === 'VPS') && invoice.details && (() => {
                            try {
                              const d = JSON.parse(invoice.details);
                              const hasDetails = d.type === 'PAYG_MONTHLY_USAGE' || d.newCpu || d.cpu || d.newRam || d.ram || d.newDisk || d.disk || d.newBackup !== undefined;
                              if (!hasDetails) return null;
                              return (
                                <div className="ml-[24px] mt-1.5 flex flex-wrap gap-1.5 text-[10px] text-cyan-400 font-mono bg-cyan-500/10 px-2 py-1.5 rounded-lg border border-cyan-500/20 w-fit">
                                  {d.type === 'PAYG_MONTHLY_USAGE' && <span>Monthly Usage</span>}
                                  {(d.newCpu || d.cpu) && <span>CPU: {d.newCpu || d.cpu} Cores</span>}
                                  {(d.newRam || d.ram) && <span>RAM: {d.newRam || d.ram}GB</span>}
                                  {(d.newDisk || d.disk) && <span>Disk: {d.newDisk || d.disk}GB</span>}
                                  {d.newBackup !== undefined && <span>Backup: {d.newBackup}GB</span>}
                                </div>
                              )
                            } catch (e) { return null; }
                          })()}
                        </div>

                      ) : invoice.type === 'IP_RESERVATION' ? (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-cyan-400 shrink-0" />
                            <span className={cn("truncate font-bold font-mono", isDark ? "text-white" : "text-slate-900")}>
                              {invoice.details ? (() => { try { return JSON.parse(invoice.details).ipAddress; } catch(e) { return 'Reserved IP'; } })() : 'Reserved IP'}
                            </span>
                          </div>
                          <span className={cn("text-xs ml-[24px]", isDark ? "text-zinc-500" : "text-slate-500")}>Reserved IP</span>
                        </div>
                      ) : invoice.type === 'SUBSCRIPTION' && invoice.vpsServiceId ? (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <Server className="w-4 h-4 text-cyan-400 shrink-0" />
                            <span className={cn("truncate font-bold", isDark ? "text-white" : "text-slate-900")}>{invoice.vpsService?.hostname || 'Cloud VPS'}</span>
                          </div>
                          <span className={cn("text-xs ml-[24px]", isDark ? "text-zinc-500" : "text-slate-500")}>PAYG FINAL BILLING</span>
                          {invoice.details && (() => {
                            try {
                              const d = JSON.parse(invoice.details);
                              if (Array.isArray(d) && d[0]?.name) {
                                return (
                                  <div className="ml-[24px] mt-1.5 flex flex-wrap gap-1.5 text-[10px] text-cyan-400 font-mono bg-cyan-500/10 px-2 py-1.5 rounded-lg border border-cyan-500/20 w-fit">
                                    <span>{d[0].name}</span>
                                  </div>
                                )
                              }
                            } catch(e) {}
                            return null;
                          })()}
                        </div>
                      ) : invoice.subscription ? (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <div className="shrink-0">{getServiceIcon(invoice.subscription?.plan?.service)}</div>
                            <span className={cn("truncate font-bold", isDark ? "text-white" : "text-slate-900")}>{`${invoice.subscription?.plan?.service?.replace('_', ' ')} - ${invoice.subscription?.plan?.name}`}</span>
                          </div>
                          <span className={cn("text-xs ml-[24px]", isDark ? "text-zinc-500" : "text-slate-500")}>
                            {['PAYG_RUNNING', 'PAYG_COMPLETED'].includes(invoice.reference) ? 'Pay-As-You-Go' : `Cycle: ${getCycleText(invoice.subscription?.cycle)}`}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <Database className={cn("w-4 h-4 shrink-0", isDark ? "text-zinc-500" : "text-slate-500")} />
                            <span className={cn("italic", isDark ? "text-zinc-500" : "text-slate-500")}>Plan Data Unavailable</span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold whitespace-nowrap">
                      {formatRupiah(invoice.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <StatusBadge status={invoice.status} />
                        {invoice.status === 'PENDING' && invoice.type === 'TOP_UP' && invoice.paymentUrl && (
                          <a 
                            href={invoice.paymentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap shadow-sm border hover:bg-cyan-500 hover:text-white", isDark ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" : "text-cyan-700 bg-cyan-50 border-cyan-200")}
                          >
                            Pay TopUp <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className={cn("px-6 py-4 whitespace-nowrap font-medium text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>
                      {new Date(invoice.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <Link
                        href={`/invoice/${invoice.invoiceNumber || invoice.merchantOrderId}`}
                        target="_blank"
                        className={cn("inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-colors text-xs font-medium border whitespace-nowrap shadow-sm", isDark ? "bg-slate-800/50 hover:bg-slate-800 text-white border-slate-700" : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200")}
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print / View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {Math.ceil(filteredInvoices.length / itemsPerPage) > 1 && (
          <div className={cn("p-6 border-t relative z-10", isDark ? "border-slate-800 bg-[#060b14]" : "border-slate-200 bg-slate-50")}>
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(filteredInvoices.length / itemsPerPage)}
              onPageChange={setPage}
            />
          </div>
        )}
      </motion.div>


    </motion.div>
  );
}