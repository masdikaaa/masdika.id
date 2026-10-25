"use client";
import { useUrlNumber, useUrlString } from "@/lib/useUrlTab";
import { cn } from "@/lib/utils";
import React, { useState, useEffect, Fragment } from "react";
import { toast } from "sonner";
import { Activity, Clock, Loader2, Save, RefreshCw, Terminal, Network, Package, Info, Users, Layers, Wallet, CheckCircle2, AlertTriangle, XCircle, AlertCircle } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { formatRupiah } from "@/lib/billing";
import { Pagination } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";

interface ServiceInfo {
  id: string;
  type: string;
  name: string;
  hourlyRate: number;
  fullHourlyRate?: number;
  accumulatedCost: number;
  status: string;
  createdAt: string;
}

interface CustomerInfo {
  id: number;
  name: string;
  email: string;
  image?: string | null;
  balance: number;
  totalHourlyBurn: number;
  balanceStatus: 'SUFFICIENT' | 'LOW' | 'EXHAUSTED';
  remainingHours: number;
  remainingDays: number;
  services: ServiceInfo[];
  totalAccumulatedCost: number;
  hasInvoiceThisMonth: boolean;
}

export default function PaygMonitorPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [interval, setIntervalVal] = useState<string>("hourly");
  const [customers, setCustomers] = useState<CustomerInfo[]>([]);
  const [expandedCustomerId, setExpandedCustomerId] = useState<number | null>(null);
  const [customerPage, setCustomerPage] = useUrlNumber("customerPage", 1);
  const customersPerPage = 5;
  const [searchQuery, setSearchQuery] = useUrlString<string>("searchQuery", "");
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUFFICIENT' | 'LOW' | 'EXHAUSTED'>('ALL');
  const [servicePageMap, setServicePageMap] = useState<Record<number, number>>({});
  const servicesPerPage = 5;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/payg-monitor");
      const data = await res.json();
      if (!data.error) {
        setIntervalVal(data.interval);
        setCustomers(data.customers || []);
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/payg-monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'VPS': return <Terminal className={cn("w-4 h-4 sm:w-5 sm:h-5", isDark ? "text-cyan-400" : "text-cyan-700")} />;
      case 'Reserved IP': return <Network className={cn("w-4 h-4 sm:w-5 sm:h-5", isDark ? "text-cyan-400" : "text-cyan-700")} />;
      default: return <Package className={cn("w-4 h-4 sm:w-5 sm:h-5", isDark ? "text-purple-400" : "text-purple-700")} />;
    }
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = (c.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
      (c.email || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || c.balanceStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sufficientCount = customers.filter(c => c.balanceStatus === 'SUFFICIENT').length;
  const lowCount = customers.filter(c => c.balanceStatus === 'LOW').length;
  const exhaustedCount = customers.filter(c => c.balanceStatus === 'EXHAUSTED').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row md:items-end justify-between gap-4 sm:gap-6 mb-2">
        <div>
          <h1 className={cn("text-2xl md:text-3xl font-extrabold mb-1 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            PAYG Billing Monitor
          </h1>
          <p className={cn("text-xs sm:text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
            Monitor customer balance sufficiency, estimated runtime, hourly burn rate, and billing cycle rotation.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className={cn("px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg font-semibold text-xs border text-center flex items-center justify-center whitespace-nowrap", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
            <Users className="w-3.5 h-3.5 mr-1.5 shrink-0 hidden sm:inline" />
            <span>Total: <strong>{customers.length}</strong></span>
          </div>
          <button 
            type="button"
            onClick={fetchData}
            disabled={loading}
            className={cn("justify-center px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border cursor-pointer whitespace-nowrap disabled:opacity-50", isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700")}
          >
            <RefreshCw className={cn("w-3.5 h-3.5 shrink-0", loading ? 'animate-spin' : '')} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: PAYG Customers */}
        <div className={cn("relative overflow-hidden rounded-2xl border p-3.5 sm:p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-start justify-between gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            <span className={cn("text-[10px] sm:text-xs font-semibold uppercase tracking-tight sm:tracking-wider leading-tight min-w-0 pr-1 break-words", isDark ? "text-zinc-400" : "text-slate-500")}>Total Customers</span>
            <div className={cn("w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-lg sm:rounded-xl border flex items-center justify-center shrink-0 -mt-0.5", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            </div>
          </div>
          <div className={cn("text-2xl sm:text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            {customers.length}
          </div>
          <div className={cn("mt-1 sm:mt-2 text-[10px] sm:text-xs font-medium truncate", isDark ? "text-cyan-400" : "text-cyan-700")}>
            Registered PAYG Accounts
          </div>
        </div>

        {/* Card 2: Saldo Cukup (Sufficient) */}
        <div 
          onClick={() => { setStatusFilter(statusFilter === 'SUFFICIENT' ? 'ALL' : 'SUFFICIENT'); setCustomerPage(1); }}
          className={cn("relative overflow-hidden rounded-2xl border p-3.5 sm:p-5 transition-colors cursor-pointer group", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md hover:border-emerald-500/40" : "bg-white border-slate-200 shadow-sm hover:border-emerald-500/40")}
        >
          <div className="flex items-start justify-between gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            <span className={cn("text-[10px] sm:text-xs font-semibold uppercase tracking-tight sm:tracking-wider leading-tight min-w-0 pr-1 break-words", isDark ? "text-zinc-400" : "text-slate-500")}>Healthy Balance</span>
            <div className={cn("w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-lg sm:rounded-xl border flex items-center justify-center shrink-0 -mt-0.5", isDark ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-600")}>
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            </div>
          </div>
          <div className={cn("text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-400")}>
            {sufficientCount}
          </div>
          <div className={cn("mt-1 sm:mt-2 text-[10px] sm:text-xs font-medium text-emerald-500 truncate")}>
            Safe & Operational
          </div>
        </div>

        {/* Card 3: Saldo Kritis / Menipis */}
        <div 
          onClick={() => { setStatusFilter(statusFilter === 'LOW' ? 'ALL' : 'LOW'); setCustomerPage(1); }}
          className={cn("relative overflow-hidden rounded-2xl border p-3.5 sm:p-5 transition-colors cursor-pointer group", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md hover:border-amber-500/40" : "bg-white border-slate-200 shadow-sm hover:border-amber-500/40")}
        >
          <div className="flex items-start justify-between gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            <span className={cn("text-[10px] sm:text-xs font-semibold uppercase tracking-tight sm:tracking-wider leading-tight min-w-0 pr-1 break-words", isDark ? "text-zinc-400" : "text-slate-500")}>Needs Top-up</span>
            <div className={cn("w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-lg sm:rounded-xl border flex items-center justify-center shrink-0 -mt-0.5", isDark ? "bg-amber-500/15 border-amber-500/25 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-600")}>
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            </div>
          </div>
          <div className={cn("text-2xl sm:text-3xl font-extrabold tracking-tight text-amber-400")}>
            {lowCount + exhaustedCount}
          </div>
          <div className={cn("mt-1 sm:mt-2 text-[10px] sm:text-xs font-medium text-amber-500 truncate")}>
            {exhaustedCount > 0 ? `${exhaustedCount} Exhausted, ${lowCount} Low` : 'Low (<24 hrs)'}
          </div>
        </div>

        {/* Card 4: Total Unbilled */}
        <div className={cn("relative overflow-hidden rounded-2xl border p-3.5 sm:p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-start justify-between gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            <span className={cn("text-[10px] sm:text-xs font-semibold uppercase tracking-tight sm:tracking-wider leading-tight min-w-0 pr-1 break-words", isDark ? "text-zinc-400" : "text-slate-500")}>Unbilled Cycle</span>
            <div className={cn("w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-lg sm:rounded-xl border flex items-center justify-center shrink-0 -mt-0.5", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            </div>
          </div>
          <div className={cn("text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight truncate", isDark ? "text-white" : "text-slate-900")}>
            {formatRupiah(customers.reduce((acc, c) => acc + c.totalAccumulatedCost, 0))}
          </div>
          <div className={cn("mt-1 sm:mt-2 text-[10px] sm:text-xs font-medium truncate", isDark ? "text-cyan-400" : "text-cyan-700")}>
            Current Cycle Accumulated
          </div>
        </div>
      </div>

      {/* Billing Deduction Frequency & Automation Settings */}
      <div className={cn("border rounded-2xl p-4 sm:p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center shrink-0", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <Clock className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className={cn("text-sm sm:text-base font-bold", isDark ? "text-white" : "text-slate-900")}>
                  Billing Deduction Interval
                </h2>
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", interval === 'hourly' ? (isDark ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700") : (isDark ? "bg-amber-500/15 border-amber-500/25 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700"))}>
                  {interval === 'hourly' ? 'Hourly Active' : 'Minutely Testing'}
                </span>
              </div>
              <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                Cron execution frequency for automated PAYG deductions (docker schedule: <code className="px-1 py-0.5 rounded bg-black/20 dark:bg-black/40 font-mono text-[11px]">* * * * *</code>).
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <div className="w-full sm:w-60">
              <Select
                value={interval}
                onChange={(val) => setIntervalVal(val)}
                options={[
                  { value: "hourly", label: "Hourly (Normal Production)" },
                  { value: "minutely", label: "Minutely (Fast Testing)" }
                ]}
                placeholder="Select frequency..."
                className={cn("w-full rounded-xl px-3.5 py-2 text-xs sm:text-sm", isDark ? "border-slate-800 bg-[#060b14] text-white" : "border-slate-200 bg-slate-50 text-slate-900")}
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-4 py-2 rounded-xl font-bold text-xs bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs whitespace-nowrap"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : <Save className="w-3.5 h-3.5 shrink-0" />}
              <span>Save Setting</span>
            </button>
          </div>
        </div>
      </div>

      {/* Full-width Active PAYG Customers Card */}
      <div className={cn("border rounded-2xl p-4 sm:p-6 w-full", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-5">
          <div>
            <h2 className={cn("text-base sm:text-lg font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
              <Activity className={cn("w-4 h-4 sm:w-5 sm:h-5", isDark ? "text-cyan-400" : "text-cyan-700")} />
              Active PAYG Customers ({filteredCustomers.length})
            </h2>
            <p className={cn("text-xs font-normal mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
              Monitor account balances, hourly burn deductions, and service runtime
            </p>
          </div>
          <div className="relative w-full sm:w-72 shrink-0">
            <input
              type="text"
              placeholder="Search name or email..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCustomerPage(1); }}
              className={cn("w-full border rounded-xl pl-3.5 pr-4 py-2 text-xs sm:text-sm focus:outline-none focus:border-cyan-500 transition-colors", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
            />
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-4">
          {(
            [
              { key: 'ALL' as const, label: 'All Status', count: customers.length },
              { key: 'SUFFICIENT' as const, label: '✓ Sufficient', count: sufficientCount },
              { key: 'LOW' as const, label: '⚠ Low Balance', count: lowCount },
              { key: 'EXHAUSTED' as const, label: '✕ Exhausted', count: exhaustedCount },
            ]
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => { setStatusFilter(tab.key); setCustomerPage(1); }}
              className={cn(
                "px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1.5 cursor-pointer",
                statusFilter === tab.key
                  ? (isDark ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-sm" : "bg-cyan-50 border-cyan-400 text-cyan-800 shadow-sm")
                  : (isDark ? "bg-[#060b14] border-slate-800/80 text-zinc-400 hover:text-white hover:border-slate-700" : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900")
              )}
            >
              <span>{tab.label}</span>
              <span className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                statusFilter === tab.key
                  ? (isDark ? "bg-cyan-500/30 text-cyan-200" : "bg-cyan-200 text-cyan-900")
                  : (isDark ? "bg-slate-800 text-zinc-400" : "bg-slate-200 text-slate-700")
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        
        {loading ? (
          <div className={cn("flex flex-col items-center justify-center h-48 gap-3", isDark ? "text-zinc-400" : "text-slate-500")}>
            <Loader2 className={cn("w-6 h-6 animate-spin", isDark ? "text-cyan-400" : "text-cyan-700")} />
            <p>Loading data...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className={cn("flex flex-col items-center justify-center h-48 border border-dashed rounded-lg", isDark ? "text-zinc-500 border-slate-800" : "text-slate-500 border-slate-300")}>
            <p>No active Pay-As-You-Go customers found matching filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-none">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className={cn("text-[11px] sm:text-xs uppercase tracking-wider", isDark ? "bg-[#060b14] text-slate-400 border-b border-slate-800 font-semibold" : "bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold")}>
                <tr>
                  <th className="py-3 px-3 sm:px-4 rounded-l-lg font-semibold w-[26%]">Customer</th>
                  <th className="py-3 px-3 sm:px-4 font-semibold text-right w-[15%]">Customer Balance</th>
                  <th className="py-3 px-3 sm:px-4 font-semibold text-right w-[14%]">Hourly Rate</th>
                  <th className="py-3 px-3 sm:px-4 font-semibold text-center w-[18%]">Balance Status</th>
                  <th className="py-3 px-2 sm:px-3 font-semibold text-center w-[10%]">Services</th>
                  <th className="py-3 px-3 sm:px-4 rounded-r-lg font-semibold text-right w-[17%]">Unbilled Cycle</th>
                </tr>
              </thead>
              <tbody className={cn("divide-y", isDark ? "divide-slate-800/80" : "divide-slate-200")}>
                {filteredCustomers.slice((customerPage - 1) * customersPerPage, customerPage * customersPerPage).map((cust) => (
                  <Fragment key={cust.id}>
                    <tr 
                      className={cn("transition-colors cursor-pointer group", isDark ? "hover:bg-white/5" : "hover:bg-slate-50/80", expandedCustomerId === cust.id ? (isDark ? "bg-white/[0.03]" : "bg-slate-50/60") : "")}
                      onClick={() => setExpandedCustomerId(expandedCustomerId === cust.id ? null : cust.id)}
                    >
                      <td className="py-3 sm:py-4 px-3 sm:px-4">
                        <div className="flex items-center gap-2.5 sm:gap-3">
                          <div className={cn("w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border shrink-0 flex items-center justify-center", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}>
                            <img referrerPolicy="no-referrer" 
                              src={cust.image || `/api/avatar?email=${encodeURIComponent(cust.email || '')}&name=${encodeURIComponent(cust.name || 'User')}`} 
                              alt={cust.name} 
                              className="w-full h-full object-cover" 
                            loading="lazy" decoding="async" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className={cn("font-bold text-xs sm:text-sm truncate", isDark ? "text-white" : "text-slate-900")}>{cust.name}</div>
                            <div className={cn("text-[10px] sm:text-xs truncate", isDark ? "text-zinc-500" : "text-slate-500")}>{cust.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className={cn("py-3 sm:py-4 px-3 sm:px-4 text-right font-extrabold text-xs sm:text-sm whitespace-nowrap", cust.balance <= 0 ? "text-rose-400" : cust.balanceStatus === 'LOW' ? "text-amber-400" : (isDark ? "text-slate-100" : "text-slate-900"))}>
                        {formatRupiah(cust.balance)}
                      </td>
                      <td className={cn("py-3 sm:py-4 px-3 sm:px-4 text-right font-semibold text-xs sm:text-sm whitespace-nowrap", isDark ? "text-cyan-400" : "text-cyan-700")}>
                        {formatRupiah(cust.totalHourlyBurn)}<span className="text-[10px] font-normal text-zinc-500">/hr</span>
                      </td>
                      <td className="py-3 sm:py-4 px-3 sm:px-4 text-center">
                        {cust.balanceStatus === 'SUFFICIENT' ? (
                          <div className="inline-flex flex-col items-center">
                            <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold whitespace-nowrap", isDark ? "bg-emerald-500/15 border border-emerald-500/25 text-emerald-400" : "bg-emerald-50 border border-emerald-200 text-emerald-700")}>
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                              Sufficient
                            </span>
                            <span className={cn("text-[9px] sm:text-[10px] mt-0.5 whitespace-nowrap", isDark ? "text-emerald-400/80" : "text-emerald-700")}>
                              ~{cust.remainingDays > 0 ? `${cust.remainingDays} days` : `${cust.remainingHours} hrs`}
                            </span>
                          </div>
                        ) : cust.balanceStatus === 'LOW' ? (
                          <div className="inline-flex flex-col items-center">
                            <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold whitespace-nowrap", isDark ? "bg-amber-500/15 border border-amber-500/25 text-amber-400" : "bg-amber-50 border border-amber-200 text-amber-700")}>
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              Low Balance
                            </span>
                            <span className={cn("text-[9px] sm:text-[10px] mt-0.5 whitespace-nowrap", isDark ? "text-amber-400/80" : "text-amber-700")}>
                              ~{cust.remainingHours} hrs left
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold whitespace-nowrap", isDark ? "bg-rose-500/15 border border-rose-500/25 text-rose-400" : "bg-rose-50 border border-rose-200 text-rose-700")}>
                              <XCircle className="w-3 h-3 shrink-0" />
                              Exhausted
                            </span>
                            <span className={cn("text-[9px] sm:text-[10px] mt-0.5 whitespace-nowrap", isDark ? "text-rose-400/80" : "text-rose-700")}>
                              Top-up Required
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 sm:py-4 px-2 sm:px-3 text-center">
                        <span className={cn("inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full font-bold text-xs border", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
                          {cust.services.length}
                        </span>
                      </td>
                      <td className={cn("py-3 sm:py-4 px-3 sm:px-4 text-right font-bold text-xs sm:text-sm whitespace-nowrap", isDark ? "text-slate-300" : "text-slate-900")}>
                        {formatRupiah(cust.totalAccumulatedCost)}
                      </td>
                    </tr>
                    {expandedCustomerId === cust.id && (
                      <tr className={cn(isDark ? "bg-[#060b14]/50" : "bg-slate-50/70")}>
                        <td colSpan={6} className={cn("p-3 sm:p-5 border-b", isDark ? "border-slate-800/80" : "border-slate-200")}>
                          <div className={cn("border rounded-xl p-3.5 sm:p-5 w-full", isDark ? "bg-[#0b1322] border-slate-800 shadow-sm" : "bg-white border-slate-200 shadow-sm")}>
                            
                            {/* Sufficiency Health Banner */}
                            {cust.balanceStatus === 'SUFFICIENT' && (
                              <div className={cn("p-3.5 sm:p-4 rounded-xl border flex items-start gap-3 mb-4 text-xs transition-all shadow-sm", isDark ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-800")}>
                                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5 text-emerald-400" />
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-emerald-400 text-xs sm:text-sm mb-0.5">Healthy Balance & Normal Operation</div>
                                  <p className={cn("leading-relaxed break-words whitespace-normal text-xs", isDark ? "text-emerald-200/90" : "text-slate-600")}>
                                    Current balance is <strong>{formatRupiah(cust.balance)}</strong> with an estimated burn rate of <strong>{formatRupiah(cust.totalHourlyBurn)}/hr</strong>. Balance is sufficient for <strong>~{cust.remainingDays > 0 ? `${cust.remainingDays} days (${cust.remainingHours} hrs)` : `${cust.remainingHours} hrs`}</strong> of continuous operation.
                                  </p>
                                </div>
                              </div>
                            )}
                            {cust.balanceStatus === 'LOW' && (
                              <div className={cn("p-3.5 sm:p-4 rounded-xl border flex items-start gap-3 mb-4 text-xs transition-all shadow-sm", isDark ? "bg-amber-500/10 border-amber-500/25 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-800")}>
                                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5 text-amber-400" />
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-amber-400 text-xs sm:text-sm mb-0.5">Warning: Critical Low Balance (&lt; 24 Hours)</div>
                                  <p className={cn("leading-relaxed break-words whitespace-normal text-xs", isDark ? "text-amber-200/90" : "text-slate-600")}>
                                    Remaining balance is <strong>{formatRupiah(cust.balance)}</strong>, sufficient for only <strong>~{cust.remainingHours} hrs</strong> at <strong>{formatRupiah(cust.totalHourlyBurn)}/hr</strong> burn rate. Recommend customer to top up soon to prevent service suspension.
                                  </p>
                                </div>
                              </div>
                            )}
                            {cust.balanceStatus === 'EXHAUSTED' && (
                              <div className={cn("p-3.5 sm:p-4 rounded-xl border flex items-start gap-3 mb-4 text-xs transition-all shadow-sm", isDark ? "bg-rose-500/10 border-rose-500/25 text-rose-300" : "bg-rose-50 border-rose-200 text-rose-800")}>
                                <XCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5 text-rose-400" />
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-rose-400 text-xs sm:text-sm mb-0.5">Alert: Balance Exhausted (Zero or Negative)</div>
                                  <p className={cn("leading-relaxed break-words whitespace-normal text-xs", isDark ? "text-rose-200/90" : "text-slate-600")}>
                                    Current balance of <strong>{formatRupiah(cust.balance)}</strong> is insufficient for the next hourly deduction (requires <strong>{formatRupiah(cust.totalHourlyBurn)}/hr</strong>). Services risk automatic suspension if balance is not topped up immediately.
                                  </p>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between mb-3">
                              <h4 className={cn("text-xs sm:text-sm font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                                <Layers className="w-4 h-4 text-cyan-400" />
                                PAYG Service Breakdown ({cust.services.length})
                              </h4>
                            </div>
                            <div className="overflow-x-auto scrollbar-none">
                              <table className="w-full text-left text-xs">
                                <thead className={cn("text-[11px] sm:text-xs uppercase tracking-wider", isDark ? "bg-[#060b14] text-slate-400 border-b border-slate-800 font-semibold" : "bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold")}>
                                  <tr>
                                    <th className="py-2.5 px-3 rounded-l-lg font-medium w-[32%]">Service</th>
                                    <th className="py-2.5 px-3 font-medium w-[14%]">Type</th>
                                    <th className="py-2.5 px-3 font-medium text-right w-[18%]">Hourly Rate</th>
                                    <th className="py-2.5 px-3 font-medium text-right w-[18%]">Accumulated</th>
                                    <th className="py-2.5 px-3 rounded-r-lg font-medium text-center w-[18%]">Status</th>
                                  </tr>
                                </thead>
                                <tbody className={cn("divide-y", isDark ? "divide-slate-800/80" : "divide-slate-200")}>
                                  {cust.services
                                    .slice(((servicePageMap[cust.id] || 1) - 1) * servicesPerPage, (servicePageMap[cust.id] || 1) * servicesPerPage)
                                    .map((svc) => (
                                    <tr key={svc.id} className={cn("transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-slate-50/80")}>
                                      <td className={cn("py-2.5 px-3 font-medium flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                                        {getIcon(svc.type)}
                                        <span className="truncate">{svc.name}</span>
                                      </td>
                                      <td className={cn("py-2.5 px-3", isDark ? "text-zinc-400" : "text-slate-500")}>{svc.type}</td>
                                      <td className={cn("py-2.5 px-3 text-right font-medium whitespace-nowrap", isDark ? "text-cyan-400" : "text-cyan-700")}>
                                        {formatRupiah(svc.hourlyRate)}
                                        {svc.fullHourlyRate !== undefined && svc.fullHourlyRate !== svc.hourlyRate && (
                                          <div className={cn("text-[10px] font-normal", isDark ? "text-zinc-500" : "text-slate-400")} title="Full rate when running. Stopped VPS only pays storage.">
                                            <span className="line-through">{formatRupiah(svc.fullHourlyRate)}</span> storage only
                                          </div>
                                        )}
                                      </td>
                                      <td className={cn("py-2.5 px-3 text-right font-bold whitespace-nowrap", isDark ? "text-slate-200" : "text-slate-900")}>{formatRupiah(svc.accumulatedCost)}</td>
                                      <td className="py-2.5 px-3 text-center">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                          svc.status === 'RUNNING' || svc.status === 'ACTIVE' || svc.status === 'ATTACHED' 
                                            ? (isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-50 text-emerald-700") 
                                            : svc.status === 'STOPPED' || svc.status === 'UNATTACHED' 
                                              ? (isDark ? "bg-amber-500/20 text-amber-400" : "bg-amber-50 text-amber-700")
                                              : (isDark ? "bg-zinc-500/20 text-zinc-400" : "bg-slate-100 text-slate-500")
                                        }`}>
                                          {svc.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {cust.services.length > servicesPerPage && (
                              <div className={cn("flex items-center justify-between mt-3 pt-3 border-t", isDark ? "border-slate-800" : "border-slate-200")}>
                                <p className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>
                                  Showing {((servicePageMap[cust.id] || 1) - 1) * servicesPerPage + 1} to {Math.min((servicePageMap[cust.id] || 1) * servicesPerPage, cust.services.length)} of {cust.services.length} services
                                </p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setServicePageMap(prev => ({ ...prev, [cust.id]: Math.max(1, (prev[cust.id] || 1) - 1) }))}
                                    disabled={(servicePageMap[cust.id] || 1) === 1}
                                    className={cn("px-2 py-1 text-xs rounded-lg disabled:opacity-50 disabled:cursor-not-allowed border transition-all", isDark ? "bg-[#060b14] border-slate-800 text-slate-300 hover:bg-slate-800" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}
                                  >
                                    Prev
                                  </button>
                                  <button
                                    onClick={() => setServicePageMap(prev => ({ ...prev, [cust.id]: Math.min(Math.ceil(cust.services.length / servicesPerPage), (prev[cust.id] || 1) + 1) }))}
                                    disabled={(servicePageMap[cust.id] || 1) >= Math.ceil(cust.services.length / servicesPerPage)}
                                    className={cn("px-2 py-1 text-xs rounded-lg disabled:opacity-50 disabled:cursor-not-allowed border transition-all", isDark ? "bg-[#060b14] border-slate-800 text-slate-300 hover:bg-slate-800" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50")}
                                  >
                                    Next
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
            {filteredCustomers.length > customersPerPage && (
              <div className={cn("p-4 border-t", isDark ? "bg-[#060b14]/50 border-slate-800" : "bg-slate-50 border-slate-200")}>
                <Pagination 
                  currentPage={customerPage} 
                  totalPages={Math.ceil(filteredCustomers.length / customersPerPage)} 
                  onPageChange={setCustomerPage} 
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
