"use client";
import { cn } from "@/lib/utils";

import { useState, useEffect, useCallback } from "react";
import { formatCompact } from "@/lib/utils";
import { formatRupiah } from "@/lib/billing";
import { DollarSign, Wallet, TrendingUp, Calendar, CreditCard, Activity, ArrowUpRight, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const RevenueChart = dynamic(() => import("@/components/admin/RevenueChart").then(mod => mod.RevenueChart), { ssr: false });
import { AdminLoader } from "@/components/admin/AdminLoader";

export default function AdminRevenuePage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [data, setData] = useState<{
    totalRevenue: number;
    monthlyRevenue: number;
    dailyRevenue: number;
    revenueByType: { SUBSCRIPTION: number; TOP_UP: number };
    chartData: any[];
    recentInvoices: any[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const limit = 10;

  const fetchRevenueData = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/revenue?page=${page}&limit=${limit}&search=${encodeURIComponent(searchQuery)}`)
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setData(result.data);
        } else {
          toast.error(result.error || "Failed to load revenue data");
        }
      })
      .catch(err => {
        toast.error("An error occurred while fetching revenue");
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [page, limit, searchQuery]);

  useEffect(() => {
    fetchRevenueData();
  }, [fetchRevenueData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput);
  };

  if (loading && !data) {
    return (
      <div className="w-full h-full flex flex-col gap-6 max-w-[1600px] mx-auto pb-8 animate-pulse">
        <div className="h-10 rounded-xl w-64 mb-2"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 rounded-3xl"></div>
          <div className="h-32 rounded-3xl"></div>
          <div className="h-32 rounded-3xl"></div>
        </div>
        <div className="h-[400px] rounded-3xl mt-2"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={cn("w-full h-full flex flex-col items-center justify-center p-8", isDark ? "text-zinc-400" : "text-slate-500")}>
        Failed to load revenue data. Please try again later.
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col gap-6 max-w-[1600px] mx-auto pb-8 z-10 relative">
      
      {/* Top Title */}
      <div className="flex items-center justify-between mb-2">
        <h1 className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
          Revenue Monitoring
        </h1>
        <div className={cn("text-sm hidden sm:block", isDark ? "text-zinc-400" : "text-slate-500")}>Track financial performance in real-time</div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Revenue */}
        <div className={cn("rounded-2xl border p-6 relative overflow-hidden transition-all duration-300 shadow-sm", isDark ? "bg-[#0b1322] border-slate-800/80 hover:border-slate-700 shadow-md" : "bg-white border-slate-200 hover:border-slate-300")}>
          <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-full blur-[50px] pointer-events-none group-hover:bg-cyan-500/20 transition-all duration-700", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")} />
          <div className="relative z-10 flex items-center justify-between mb-4">
            <h2 className={cn("text-sm font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Total Revenue</h2>
            <div className={cn("p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20", isDark ? "text-cyan-400" : "text-cyan-700")}>
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="relative z-10">
            <div className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{formatRupiah(data.totalRevenue)}</div>
            <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1.5">
              <TrendingUp className={cn("w-3.5 h-3.5", isDark ? "text-cyan-400" : "text-cyan-700")} />
              All-time realized income
            </p>
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className={cn("rounded-2xl border p-6 relative overflow-hidden transition-all duration-300 shadow-sm", isDark ? "bg-[#0b1322] border-slate-800/80 hover:border-slate-700 shadow-md" : "bg-white border-slate-200 hover:border-slate-300")}>
          <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-full blur-[50px] pointer-events-none group-hover:bg-cyan-500/20 transition-all duration-700", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")} />
          <div className="relative z-10 flex items-center justify-between mb-4">
            <h2 className={cn("text-sm font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>This Month</h2>
            <div className={cn("p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20", isDark ? "text-cyan-400" : "text-cyan-700")}>
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="relative z-10">
            <div className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{formatRupiah(data.monthlyRevenue)}</div>
            <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1.5">
              <Activity className={cn("w-3.5 h-3.5", isDark ? "text-cyan-400" : "text-cyan-700")} />
              {format(new Date(), 'MMMM yyyy')}
            </p>
          </div>
        </div>

        {/* Daily Revenue */}
        <div className={cn("rounded-2xl border p-6 relative overflow-hidden transition-all duration-300 shadow-sm", isDark ? "bg-[#0b1322] border-slate-800/80 hover:border-slate-700 shadow-md" : "bg-white border-slate-200 hover:border-slate-300")}>
          <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-full blur-[50px] pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-700", isDark ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-200")} />
          <div className="relative z-10 flex items-center justify-between mb-4">
            <h2 className={cn("text-sm font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Today</h2>
            <div className={cn("p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20", isDark ? "text-emerald-400" : "text-emerald-700")}>
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="relative z-10">
            <div className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{formatRupiah(data.dailyRevenue)}</div>
            <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1.5">
              <ArrowUpRight className={cn("w-3.5 h-3.5", isDark ? "text-emerald-400" : "text-emerald-700")} />
              Cash in today
            </p>
          </div>
        </div>
      </div>

      {/* Main Chart Card */}
      <div className={cn("rounded-2xl border p-4 sm:p-6 relative overflow-hidden mt-2 shrink-0", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className={cn("text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>30-Day Revenue Trend</h2>
            <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Daily gross revenue over the last month</p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs font-medium">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
              <span className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>Services: {formatCompact(data.revenueByType.SUBSCRIPTION)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
              <span className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>Top-Ups: {formatCompact(data.revenueByType.TOP_UP)}</span>
            </div>
          </div>
        </div>
        <div className="relative z-10 h-[350px] sm:h-[400px] min-h-[350px] w-full shrink-0">
          <RevenueChart data={data.chartData} />
        </div>
      </div>

      {/* Paid Invoices Table */}
      <div className={cn("rounded-2xl border p-6 relative overflow-hidden mt-2 shrink-0", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <h2 className={cn("text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>Paid Invoices</h2>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Search ID, Name, or Email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={cn("w-full border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          </form>
        </div>
        
        <div className="overflow-x-auto relative min-h-[200px]">
          {loading && (
            <div className={cn("absolute inset-0 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl", isDark ? "bg-[#0b1322]/80" : "bg-white/80")}>
               <AdminLoader className="min-h-0" size="sm" />
            </div>
          )}
          <table className={cn("w-full text-left text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
            <thead className={cn("text-xs uppercase", isDark ? "bg-slate-900/60 text-slate-400 border-b border-slate-800 font-semibold" : "bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold")}>
              <tr>
                <th className="px-4 py-3 rounded-l-lg font-semibold whitespace-nowrap">Date</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Invoice ID</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Customer</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Type</th>
                <th className="px-4 py-3 rounded-r-lg font-semibold text-right whitespace-nowrap">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.recentInvoices.map((inv: any, i: number) => (
                <tr key={i} className={cn("border-b transition-colors", isDark ? "border-slate-800/80 hover:bg-white/5" : "border-slate-200 hover:bg-slate-50/80")}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {format(new Date(inv.paidAt), 'dd MMM yyyy, HH:mm')}
                  </td>
                  <td className={cn("px-4 py-3 font-mono text-xs whitespace-nowrap", isDark ? "text-white" : "text-slate-900")}>
                    {inv.invoiceNumber}
                  </td>
                  <td className={cn("px-4 py-3 min-w-[200px]", isDark ? "text-zinc-300" : "text-slate-600")}>
                    <div className={cn("font-medium", isDark ? "text-white" : "text-slate-900")}>{inv.user?.name || "Unknown"}</div>
                    <div className="text-xs text-zinc-500">{inv.user?.email || "-"}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      inv.type === 'TOP_UP' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-500/20 text-cyan-400'
                    }`}>
                      {inv.type === 'TOP_UP' ? 'Top-Up' : 'Service'}
                    </span>
                  </td>
                  <td className={cn("px-4 py-3 text-right font-bold whitespace-nowrap", isDark ? "text-white" : "text-slate-900")}>
                    {formatRupiah(inv.amount)}
                  </td>
                </tr>
              ))}
              {data.recentInvoices.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                    No paid invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {data.pagination && data.pagination.totalPages > 0 && (
          <div className={cn("flex items-center justify-between mt-6 pt-4 border-t", isDark ? "border-slate-800" : "border-slate-200")}>
            <div className="text-xs text-zinc-500 font-medium">
              Showing <span className={cn(isDark ? "text-white" : "text-slate-900")}>{(data.pagination.page - 1) * data.pagination.limit + (data.recentInvoices.length > 0 ? 1 : 0)}</span> to <span className={cn(isDark ? "text-white" : "text-slate-900")}>{(data.pagination.page - 1) * data.pagination.limit + data.recentInvoices.length}</span> of <span className={cn(isDark ? "text-white" : "text-slate-900")}>{data.pagination.total}</span> entries
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={data.pagination.page === 1 || loading}
                className={cn("p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed transition-all", isDark ? "border-slate-800 bg-[#060b14] text-slate-400 hover:text-white hover:bg-slate-800" : "border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50")}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-1">
                <span className={cn("text-sm font-bold w-8 text-center", isDark ? "text-white" : "text-slate-900")}>{data.pagination.page}</span>
                <span className="text-sm text-zinc-500">/</span>
                <span className="text-sm font-medium text-zinc-500 w-8 text-center">{data.pagination.totalPages}</span>
              </div>

              <button
                onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                disabled={data.pagination.page === data.pagination.totalPages || loading}
                className={cn("p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed transition-all", isDark ? "border-slate-800 bg-[#060b14] text-slate-400 hover:text-white hover:bg-slate-800" : "border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50")}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
