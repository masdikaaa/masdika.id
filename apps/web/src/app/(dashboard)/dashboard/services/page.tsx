"use client";

import { useUrlNumber } from "@/lib/useUrlTab";
import { useState, useEffect } from "react";
import { Layers, ArrowUpCircle, AlertTriangle, CheckCircle2, Clock, XCircle, Box, Server, Database, Activity, PackageOpen, RefreshCw, Terminal, HardDrive, UploadCloud, Code } from "lucide-react";
import { SiKubernetes } from "react-icons/si";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatRupiah, getCycleText } from "@/lib/billing";
import { useTheme } from "@/components/ThemeProvider";
import { Pagination } from "@/components/ui/Pagination";
import { motion } from "framer-motion";

export default function MyServicesPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [vpsServices, setVpsServices] = useState<any[]>([]);
  const [k3sServices, setK3sServices] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useUrlNumber("page", 1);
  const [terminateModal, setTerminateModal] = useState<{ id: number, name: string, service: string } | null>(null);
  const [terminateLoading, setTerminateLoading] = useState(false);
  const itemsPerPage = 6;

  const fetchServices = async () => {
    try {
      const [billingRes, vpsRes, k3sRes, plansRes] = await Promise.all([
        fetch("/api/user/billing"),
        fetch("/api/user/vps"),
        fetch("/api/user/k3s"),
        fetch("/api/public/plans")
      ]);

      if (billingRes.ok) {
        const json = await billingRes.json();
        setSubscriptions(json.data?.subscriptions || []);
      }

      if (vpsRes.ok) {
        const vpsData = await vpsRes.json();
        setVpsServices(Array.isArray(vpsData) ? vpsData : []);
      }

      if (k3sRes.ok) {
        const k3sData = await k3sRes.json();
        setK3sServices(Array.isArray(k3sData) ? k3sData : []);
      }

      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleTerminate = async () => {
    if (!terminateModal) return;
    setTerminateLoading(true);
    try {
      const res = await fetch(`/api/user/subscription/${terminateModal.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Service terminated successfully");
        fetchServices();
      } else {
        toast.error(data.error || "Failed to terminate service");
      }
    } catch (e) {
      toast.error("Network error");
    } finally {
      setTerminateLoading(false);
      setTerminateModal(null);
    }
  };

  const hasHigherPlan = (sub: any) => {
    if (!plans || plans.length === 0) return true; // Default to true if plans failed to load

    // Find if there is any plan for the same service with a higher price
    const higherPlans = plans.filter((p: any) => p.service === sub.plan.service && p.price > sub.plan.price);
    return higherPlans.length > 0;
  };

  const allServices = [...subscriptions, ...vpsServices, ...k3sServices];

  const totalHourlyBurnRate = allServices.reduce((sum, service) => {
    if (service.status === 'TERMINATED' || service.status === 'SUSPENDED') return sum;

    let rate = 0;
    if (service.billingMode === 'PAYG' || service.cycle === 'HOURLY') {
      if (service.hourlyRate) rate = Number(service.hourlyRate);
      if (service.plan?.hourlyPrice) rate = Number(service.plan.hourlyPrice);
    }
    if (service.nodeCount !== undefined && service.hourlyRate) {
      rate = Number(service.hourlyRate);
    }
    return sum + rate;
  }, 0);

  const totalPages = Math.max(1, Math.ceil(allServices.length / itemsPerPage));
  const paginatedServices = allServices.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'OBJECT_STORAGE': return <HardDrive className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />;
      case 'CDN': return <UploadCloud className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />;
      case 'API_HUB': return <Code className="w-6 h-6 text-fuchsia-400 group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />;
      case 'VPS': return <Terminal className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />;
      case 'K3S': return <SiKubernetes className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />;
      default: return <Box className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />;
    }
  };

  const getServiceColor = (service: string) => {
    switch (service) {
      case 'OBJECT_STORAGE': return "from-cyan-500/20 text-cyan-400 border-cyan-500/30";
      case 'API_HUB': return "from-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30";
      case 'VPS': return "from-cyan-500/20 text-cyan-400 border-cyan-500/30";
      default: return "from-cyan-500/20 text-cyan-400 border-cyan-500/30";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <span className={cn("border", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" : "bg-slate-100 text-cyan-700 border-slate-200", "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider")}><CheckCircle2 className="w-3.5 h-3.5" /> Active</span>;
      case "SUSPENDED":
        return <span className={cn("border", isDark ? "bg-red-500/10 text-red-400 border-red-500/30" : "bg-red-50 text-red-700 border-red-200", "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider")}><AlertTriangle className="w-3.5 h-3.5" /> Suspended</span>;
      case "TERMINATED":
        return <span className={cn("border", isDark ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/30" : "bg-slate-100 text-slate-700 border-slate-300", "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider")}><XCircle className="w-3.5 h-3.5" /> Terminated</span>;
      case "PENDING":
        return <span className={cn("border", isDark ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-amber-50 text-amber-700 border-amber-200", "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider")}><Clock className="w-3.5 h-3.5" /> Pending</span>;
      case "UPGRADED":
        return <span className={cn("border", isDark ? "bg-blue-500/10 text-blue-400 border-blue-500/30" : "bg-slate-100 text-slate-700 border-slate-200", "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider")}><ArrowUpCircle className="w-3.5 h-3.5" /> Upgraded</span>;
      case "CANCELLED":
        return <span className={cn("border", isDark ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/30" : "bg-slate-100 text-slate-700 border-slate-300", "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider")}><XCircle className="w-3.5 h-3.5" /> Cancelled</span>;
      default:
        return <span className={cn("border", isDark ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/30" : "bg-slate-100 text-slate-700 border-slate-300", "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider")}>{status}</span>;
    }
  };

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
    <motion.div className="space-y-8 pb-10" variants={containerVariants} initial="hidden" animate="visible">

      {/* Hero Header */}
      <motion.div variants={itemVariants} className={cn("border rounded-3xl p-8 md:p-12 transition-all flex flex-col md:flex-row md:items-center justify-between gap-8", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className="relative z-10 shrink-0">
          <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 tracking-wide border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-100 border-cyan-200 text-cyan-700")}>
            <PackageOpen className="w-3 h-3" /> Portfolio & Usage
          </div>
          <h1 className={cn("text-3xl md:text-4xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            My <span className={cn(isDark ? "text-cyan-400" : "text-cyan-600")}>Services</span>
          </h1>
          <p className={cn("text-sm max-w-md", isDark ? "text-zinc-400" : "text-slate-500")}>View and manage all your active and past subscriptions.</p>
        </div>

        <div className="relative z-10 shrink-0">
          <Link
            href="/dashboard/checkout"
            className="w-full md:w-auto bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 text-slate-950"
          >
            <Box className="w-4 h-4" />
            Order New Service
          </Link>
        </div>
      </motion.div>

      {subscriptions.length === 0 && vpsServices.length === 0 && k3sServices.length === 0 ? (
        <motion.div variants={itemVariants} className={cn("border rounded-3xl p-12 text-center", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="relative z-10">
            <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 transform -rotate-6", isDark ? "bg-slate-800/50" : "bg-slate-100")}>
              <Layers className={cn("w-10 h-10 transform rotate-6", isDark ? "text-zinc-500" : "text-slate-400")} />
            </div>
            <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No Services Found</h3>
            <p className={cn("max-w-md mx-auto mb-6", isDark ? "text-zinc-400" : "text-slate-500")}>You haven't subscribed to any Masdika services yet. Explore our high-performance infrastructure.</p>
            <Link
              href="/dashboard/checkout"
              className="font-semibold text-slate-950 px-5 py-2.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 transition-all shadow-sm inline-flex items-center justify-center gap-2 text-sm"
            >
              Browse Services
            </Link>
          </div>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedServices.map((item, idx) => {
              const isVps = item.hostname !== undefined;

              if (isVps) {
                const vps = item;
                const colorClass = getServiceColor('VPS');
                return (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={`vps-${vps.id}`}
                    className={cn("group border rounded-[2rem] p-6 md:p-8 transition-all flex flex-col h-full relative overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md hover:border-slate-700" : "bg-white border-slate-200 shadow-sm hover:border-slate-300", vps.status === 'TERMINATED' && "opacity-75 grayscale-[30%]")}
                  >
                    <div className="flex justify-between items-start mb-8 relative z-10">
                      <div className="flex gap-4 items-center">
                        <div className={cn(
                          "w-14 h-14 rounded-2xl bg-gradient-to-br border flex items-center justify-center shadow-sm",
                          colorClass
                        )}>
                          {getServiceIcon(vps.kubernetesClusterId ? 'K3S' : 'VPS')}
                        </div>
                        <div>
                          <h3 className={cn("text-lg font-bold group-hover:text-cyan-400 transition-colors leading-tight mb-1", isDark ? "text-white" : "text-slate-900")}>{vps.hostname}</h3>
                          <p className={cn("text-[10px] font-black uppercase tracking-widest", isDark ? "text-zinc-500" : "text-slate-400")}>
                            {vps.kubernetesClusterId ? "KUBERNETES NODE" : "CLOUD VPS"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 flex-1 relative z-10">
                      <div className={cn("col-span-2 border p-4 rounded-2xl flex justify-between items-center", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50/50 border-slate-200")}>
                        <span className={cn("text-[10px] font-black uppercase tracking-widest", isDark ? "text-zinc-500" : "text-slate-400")}>Status</span>
                        {getStatusBadge(vps.status)}
                      </div>

                      <div className={cn("border p-4 rounded-2xl flex flex-col justify-center", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50/50 border-slate-200")}>
                        <span className={cn("text-[10px] font-black uppercase tracking-widest mb-1", isDark ? "text-zinc-500" : "text-slate-400")}>Cycle</span>
                        <span className={cn("text-xs font-bold tracking-wide", isDark ? "text-white" : "text-slate-900")}>Pay-As-You-Go</span>
                      </div>

                      <div className={cn("border p-4 rounded-2xl flex flex-col justify-center", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50/50 border-slate-200")}>
                        <span className={cn("text-[10px] font-black uppercase tracking-widest mb-1", isDark ? "text-zinc-500" : "text-slate-400")}>Expires</span>
                        <span className={cn("text-xs font-bold tracking-wide", isDark ? "text-white" : "text-slate-900")}>
                          {vps.expiresAt ? new Date(vps.expiresAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                        </span>
                      </div>

                      <div className={cn("col-span-2 border p-4 rounded-2xl flex justify-between items-center", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50/50 border-slate-200")}>
                        <div className="flex flex-col">
                          <span className={cn("text-[10px] font-black uppercase tracking-widest", isDark ? "text-zinc-500" : "text-slate-400")}>Usage Cost</span>
                          <span className="text-xs text-cyan-400 font-bold mt-1">{formatRupiah(vps.hourlyRate || (vps.monthlyPrice ? vps.monthlyPrice / 720 : 0))}/hr (PAYG)</span>
                        </div>
                        <span className={cn("text-lg font-black tracking-tight text-right", isDark ? "text-white" : "text-slate-900")}>
                          {vps.billingMode === "PAYG" ? formatRupiah(vps.accumulatedCost || 0) : formatRupiah(vps.monthlyPrice || ((vps.hourlyRate || 0) * 720))}
                          {vps.billingMode !== "PAYG" && <span className={cn("text-xs font-bold ml-1", isDark ? "text-zinc-500" : "text-slate-400")}>/mo</span>}
                        </span>
                      </div>

                      {vps.status === 'SUSPENDED' && (
                        <div className="col-span-2 mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl shadow-sm">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-0.5">Suspension Reason</p>
                              <p className="text-xs font-semibold text-red-300">{vps.suspendReason || "Service suspended by system/administrator."}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-6 pt-4 flex gap-3 relative z-10">
                      {vps.status !== 'TERMINATED' ? (
                        <Link
                          href={`/dashboard/vps/${vps.id}`}
                          className="flex-1 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 py-2.5 px-4 rounded-lg text-sm font-semibold flex items-center justify-center transition-all shadow-sm text-slate-950"
                        >
                          Manage Instance
                        </Link>
                      ) : (
                        <div className="flex-1 bg-red-500/5 text-red-500/40 border border-red-500/10 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center shadow-sm cursor-not-allowed">
                          Terminated
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              } else if (item.nodeCount !== undefined) {
                const k3s = item;
                const colorClass = "from-cyan-500/20 text-cyan-400 border-cyan-500/30";
                return (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={`k3s-${k3s.id}`}
                    className={cn(
                      "group border rounded-[2rem] p-6 md:p-8 transition-all flex flex-col h-full relative overflow-hidden",
                      isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md hover:border-slate-700" : "bg-white border-slate-200 shadow-sm hover:border-slate-300",
                      k3s.status === 'TERMINATED' && "opacity-75 grayscale-[30%]"
                    )}
                  >
                    <div className="flex justify-between items-start mb-8 relative z-10">
                      <div className="flex gap-4 items-center">
                        <div className={cn(
                          "w-14 h-14 rounded-2xl bg-gradient-to-br border flex items-center justify-center shadow-sm",
                          colorClass
                        )}>
                          {getServiceIcon('K3S')}
                        </div>
                        <div>
                          <h3 className={cn("text-lg font-bold group-hover:text-cyan-400 transition-colors leading-tight mb-1", isDark ? "text-white" : "text-slate-900")}>{k3s.name}</h3>
                          <p className={cn("text-[10px] font-black uppercase tracking-widest", isDark ? "text-zinc-500" : "text-slate-400")}>
                            MANAGED K3S CLUSTER
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 flex-1 relative z-10">
                      <div className={cn("col-span-2 border p-4 rounded-2xl flex justify-between items-center", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50/50 border-slate-200")}>
                        <span className={cn("text-[10px] font-black uppercase tracking-widest", isDark ? "text-zinc-500" : "text-slate-400")}>Status</span>
                        {getStatusBadge(k3s.status)}
                      </div>

                      <div className={cn("border p-4 rounded-2xl flex flex-col justify-center", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50/50 border-slate-200")}>
                        <span className={cn("text-[10px] font-black uppercase tracking-widest mb-1", isDark ? "text-zinc-500" : "text-slate-400")}>Nodes</span>
                        <span className={cn("text-xs font-bold tracking-wide", isDark ? "text-white" : "text-slate-900")}>{k3s.nodeCount}</span>
                      </div>

                      <div className={cn("border p-4 rounded-2xl flex flex-col justify-center", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50/50 border-slate-200")}>
                        <span className={cn("text-[10px] font-black uppercase tracking-widest mb-1", isDark ? "text-zinc-500" : "text-slate-400")}>Cycle</span>
                        <span className={cn("text-xs font-bold tracking-wide", isDark ? "text-white" : "text-slate-900")}>Pay-As-You-Go</span>
                      </div>

                      <div className={cn("col-span-2 border p-4 rounded-2xl flex justify-between items-center", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50/50 border-slate-200")}>
                        <div className="flex flex-col">
                          <span className={cn("text-[10px] font-black uppercase tracking-widest", isDark ? "text-zinc-500" : "text-slate-400")}>Usage Cost</span>
                          <span className="text-xs text-cyan-400 font-bold mt-1">{formatRupiah(k3s.hourlyRate || (k3s.monthlyPrice ? k3s.monthlyPrice / 720 : 0))}/hr (PAYG)</span>
                        </div>
                        <span className={cn("text-lg font-black tracking-tight text-right", isDark ? "text-white" : "text-slate-900")}>
                          {k3s.billingMode === "PAYG" ? formatRupiah(k3s.accumulatedCost || 0) : formatRupiah(k3s.monthlyPrice || ((k3s.hourlyRate || 0) * 720))}
                          {k3s.billingMode !== "PAYG" && <span className={cn("text-xs font-bold ml-1", isDark ? "text-zinc-500" : "text-slate-400")}>/mo</span>}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 pt-4 flex gap-3 relative z-10">
                      {k3s.status !== 'TERMINATED' ? (
                        <Link
                          href={`/dashboard/k3s/${k3s.id}`}
                          className="flex-1 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 py-2.5 px-4 rounded-lg text-sm font-semibold flex items-center justify-center transition-all shadow-sm text-slate-950"
                        >
                          Manage Cluster
                        </Link>
                      ) : (
                        <div className="flex-1 bg-red-500/5 text-red-500/40 border border-red-500/10 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center shadow-sm cursor-not-allowed">
                          Terminated
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              } else {
                const sub = item;
                const colorClass = getServiceColor(sub.plan.service);
                return (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={sub.id}
                    className={cn(
                      "group border rounded-[2rem] p-6 md:p-8 transition-all flex flex-col h-full relative overflow-hidden",
                      isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md hover:border-slate-700" : "bg-white border-slate-200 shadow-sm hover:border-slate-300",
                      sub.status === 'CANCELLED' && "opacity-75 grayscale-[30%]"
                    )}
                  >
                    <div className="flex justify-between items-start mb-8 relative z-10">
                      <div className="flex gap-4 items-center">
                        <div className={cn(
                          "w-14 h-14 rounded-2xl bg-gradient-to-br border flex items-center justify-center shadow-sm",
                          colorClass
                        )}>
                          {getServiceIcon(sub.plan.service)}
                        </div>
                        <div>
                          <h3 className={cn("text-lg font-bold group-hover:text-cyan-400 transition-colors leading-tight mb-1", isDark ? "text-white" : "text-slate-900")}>{sub.plan.name}</h3>
                          <p className={cn("text-[10px] font-black uppercase tracking-widest", isDark ? "text-zinc-500" : "text-slate-400")}>{sub.plan.service.replace('_', ' ')}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 flex-1 relative z-10">
                      <div className={cn("col-span-2 border p-4 rounded-2xl flex justify-between items-center", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50/50 border-slate-200")}>
                        <span className={cn("text-[10px] font-black uppercase tracking-widest", isDark ? "text-zinc-500" : "text-slate-400")}>Status</span>
                        {getStatusBadge(sub.status)}
                      </div>

                      <div className={cn("border p-4 rounded-2xl flex flex-col justify-center", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50/50 border-slate-200")}>
                        <span className={cn("text-[10px] font-black uppercase tracking-widest mb-1", isDark ? "text-zinc-500" : "text-slate-400")}>Cycle</span>
                        <span className={cn("text-xs font-bold tracking-wide", isDark ? "text-white" : "text-slate-900")}>{getCycleText(sub.cycle)}</span>
                      </div>

                      <div className={cn("border p-4 rounded-2xl flex flex-col justify-center", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50/50 border-slate-200")}>
                        <span className={cn("text-[10px] font-black uppercase tracking-widest mb-1", isDark ? "text-zinc-500" : "text-slate-400")}>Expires</span>
                        <span className={cn("text-xs font-bold tracking-wide", isDark ? "text-white" : "text-slate-900")}>{new Date(sub.expiresAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>

                      <div className={cn("col-span-2 border p-4 rounded-2xl flex justify-between items-center", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50/50 border-slate-200")}>
                        <div className="flex flex-col">
                          <span className={cn("text-[10px] font-black uppercase tracking-widest", isDark ? "text-zinc-500" : "text-slate-400")}>Usage Cost</span>
                          <span className="text-xs text-cyan-400 font-bold mt-1">{formatRupiah(sub.plan.hourlyPrice || (sub.plan.price / 720))}/hr (PAYG)</span>
                        </div>
                        <span className={cn("text-lg font-black tracking-tight text-right", isDark ? "text-white" : "text-slate-900")}>
                          {formatRupiah(sub.plan.price)}
                          <span className={cn("text-xs font-bold ml-1", isDark ? "text-zinc-500" : "text-slate-400")}>/mo</span>
                        </span>
                      </div>

                      {sub.status === 'SUSPENDED' && (
                        <div className="col-span-2 mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl shadow-sm">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-0.5">Suspension Reason</p>
                              <p className="text-xs font-semibold text-red-300">{sub.suspendReason || "Service suspended by system/administrator."}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-6 pt-4 flex gap-3 relative z-10">
                      {sub.status !== 'TERMINATED' && sub.status !== 'CANCELLED' ? (
                        <>
                          <button
                            onClick={() => setTerminateModal({ id: sub.id, name: sub.plan.name, service: sub.plan.service })}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 p-2.5 rounded-lg flex items-center justify-center transition-all shadow-sm shrink-0"
                            title="Terminate Service"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>

                          {sub.status === 'ACTIVE' && hasHigherPlan(sub) && (
                            <Link
                              href={`/dashboard/checkout?upgradeId=${sub.id}`}
                              className={cn("flex-1 bg-white/5 hover:bg-white/10 border border-white/10 py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm", isDark ? "text-white" : "text-slate-900")}
                            >
                              <ArrowUpCircle className="w-4 h-4" /> Upgrade
                            </Link>
                          )}

                          <Link
                            href={
                              sub.plan.service === 'SHORTENER' ? '/dashboard/shortener' :
                                  '/dashboard'
                            }
                            className="flex-1 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center transition-all shadow-sm text-slate-950"
                          >
                            Manage
                          </Link>
                        </>
                      ) : (
                        <div className="flex-1 bg-red-500/5 text-red-500/40 border border-red-500/10 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center shadow-sm cursor-not-allowed">
                          Terminated
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              }
            })}
          </div>

          {totalPages > 1 && (
            <div className={cn("pt-6 border-t", isDark ? "border-slate-800" : "border-slate-200")}>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </motion.div>
      )}

      {/* Terminate Confirmation Modal */}
      {terminateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className={cn("border w-full max-w-sm rounded-3xl p-6 shadow-xl relative", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200")}>
            <button onClick={() => setTerminateModal(null)} className={cn("absolute top-4 right-4 transition-colors", isDark ? "text-zinc-500 hover:text-white" : "text-slate-400 hover:text-slate-900")}>
              <XCircle className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500/10 text-red-500">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h2 className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>Terminate Service</h2>
            </div>

            <p className={cn("text-sm mb-2", isDark ? "text-zinc-400" : "text-slate-500")}>
              Are you sure you want to terminate <strong className={cn(isDark ? "text-white" : "text-slate-900")}>{terminateModal.name}</strong>?
            </p>
            <p className="text-red-400 text-xs font-medium bg-red-500/10 border border-red-500/20 p-3 rounded-xl mb-6">
              This action is permanent. All data associated with this service (including files, keys, and settings) will be immediately deleted and cannot be recovered.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setTerminateModal(null)}
                className={cn("px-4 py-2.5 rounded-lg border transition-colors text-sm font-medium", isDark ? "text-zinc-400 border-slate-700 hover:bg-slate-800" : "text-slate-600 border-slate-200 hover:bg-slate-100")}
                disabled={terminateLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleTerminate}
                disabled={terminateLoading}
                className="px-5 py-2.5 rounded-lg font-semibold transition-all shadow-sm bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                {terminateLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Yes, Terminate
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}