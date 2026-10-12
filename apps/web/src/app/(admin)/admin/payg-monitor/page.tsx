"use client";
import { useUrlNumber, useUrlString } from "@/lib/useUrlTab";
import { cn } from "@/lib/utils";

import React, { useState, useEffect, Fragment } from "react";
import { toast } from "sonner";
import { Activity, Clock, Loader2, Save, RefreshCw, Terminal, Network, Package } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { formatRupiah } from "@/lib/billing";
import { Pagination } from "@/components/ui/Pagination";

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
    } catch (e) {
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
    } catch (e) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'VPS': return <Terminal className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-700")} />;
      case 'Reserved IP': return <Network className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-700")} />;
      default: return <Package className={cn("w-5 h-5", isDark ? "text-purple-400" : "text-purple-700")} />;
    }
  };

  const filteredCustomers = customers.filter(c => 
    (c.name || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={cn("text-3xl font-extrabold drop-shadow-sm mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            PAYG Billing Monitor
          </h1>
          <p className={cn("text-sm mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>Manage and monitor Pay-As-You-Go billing execution.</p>
        </div>
        <button 
          onClick={fetchData}
          disabled={loading}
          className={cn("flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-white/10 font-medium transition-colors disabled:opacity-50", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className={cn("glass border rounded-xl p-6", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
            <h2 className={cn("text-lg font-bold mb-4 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
              <Clock className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-700")} />
              Billing Interval
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-600")}>Cron Execution Frequency</label>
                <select
                  value={interval}
                  onChange={(e) => setIntervalVal(e.target.value)}
                  className={cn("w-full border rounded-lg p-3 focus:outline-none focus:border-cyan-500/50 transition-colors appearance-none cursor-pointer", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                  style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2306b6d4%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}
                >
                  <option value="hourly" className={cn(isDark ? "bg-[#0A0B1A] text-white" : "bg-white text-slate-900")}>Hourly (Normal Production)</option>
                  <option value="minutely" className={cn(isDark ? "bg-[#0A0B1A] text-white" : "bg-white text-slate-900")}>Minutely (Fast Testing / Accelerated)</option>
                </select>
                <p className={cn("text-xs leading-relaxed mt-2", isDark ? "text-zinc-500" : "text-slate-500")}>
                  When set to "Minutely", the cron will execute the billing deduction every 1 minute. 
                  Note: The cron Docker container schedule is set to `* * * * *`. The API will check this setting to decide whether to process every minute or wait for the top of the hour.
                </p>
              </div>
              
              <button
                onClick={handleSave}
                disabled={saving || loading}
                className={cn("w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold transition-all shadow-md hover:shadow-lg hover:from-cyan-400 hover:to-cyan-400 transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] disabled:opacity-50", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-slate-900 shadow-cyan-500/20" : "bg-cyan-600 hover:bg-cyan-700 text-white shadow-cyan-600/20")}
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Save Setting
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className={cn("glass border rounded-xl p-6 h-full", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h2 className={cn("text-lg font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                <Activity className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-700")} />
                Active PAYG Customers ({filteredCustomers.length})
              </h2>
              <div className="relative w-full sm:w-64 shrink-0">
                <input
                  type="text"
                  placeholder="Search name or email..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCustomerPage(1); }}
                  className={cn("w-full border rounded-lg pl-3 pr-4 py-2 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                />
              </div>
            </div>
            
            {loading ? (
              <div className={cn("flex flex-col items-center justify-center h-48 gap-3", isDark ? "text-zinc-400" : "text-slate-500")}>
                <Loader2 className={cn("w-6 h-6 animate-spin", isDark ? "text-cyan-400" : "text-cyan-700")} />
                <p>Loading data...</p>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className={cn("flex flex-col items-center justify-center h-48 border border-dashed rounded-lg", isDark ? "text-zinc-500 border-white/10" : "text-slate-500 border-slate-300")}>
                <p>No active Pay-As-You-Go customers found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                    <tr className={cn("border-b", isDark ? "border-white/10 text-zinc-400" : "border-slate-200 text-slate-500")}>
                      <th className="pb-3 pl-4 font-medium">Customer</th>
                      <th className="pb-3 font-medium text-center">Active Services</th>
                      <th className="pb-3 font-medium text-right">Total Accumulated</th>
                      <th className="pb-3 font-medium text-center">Invoice Status</th>
                    </tr>
                  </thead>
                  <tbody className={cn("divide-y", isDark ? "divide-white/5" : "divide-slate-200")}>
                    {filteredCustomers.slice((customerPage - 1) * customersPerPage, customerPage * customersPerPage).map((cust) => (
                      <Fragment key={cust.id}>
                        <tr 
                          className="hover:bg-white/5 transition-colors cursor-pointer group"
                          onClick={() => setExpandedCustomerId(expandedCustomerId === cust.id ? null : cust.id)}
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className={cn("w-10 h-10 rounded-full overflow-hidden border shrink-0 flex items-center justify-center", isDark ? "bg-[#0A0B1A] border-white/10" : "bg-slate-50 border-slate-200")}>
                                <img referrerPolicy="no-referrer" 
                                  src={cust.image || `/api/avatar?email=${encodeURIComponent(cust.email || '')}&name=${encodeURIComponent(cust.name || 'User')}`} 
                                  alt={cust.name} 
                                  className="w-full h-full object-cover" 
                                loading="lazy" decoding="async" />
                              </div>
                              <div>
                                <div className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>{cust.name}</div>
                                <div className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>{cust.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={cn("inline-flex items-center justify-center w-8 h-8 rounded-full font-bold border", isDark ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
                              {cust.services.length}
                            </span>
                          </td>
                          <td className={cn("py-4 px-4 text-right font-bold", isDark ? "text-slate-200" : "text-slate-900")}>
                            {formatRupiah(cust.totalAccumulatedCost)}
                          </td>
                          <td className="py-4 pl-4 text-center">
                            {cust.hasInvoiceThisMonth ? (
                              <span className={cn("inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-emerald-500/20", isDark ? "text-emerald-400" : "text-emerald-700")}>
                                Tracking Active
                              </span>
                            ) : (
                              <span className={cn("inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-emerald-500/20", isDark ? "text-emerald-400" : "text-emerald-700")}>
                                Tracking Active
                              </span>
                            )}
                          </td>
                        </tr>
                        {expandedCustomerId === cust.id && (
                          <tr className={cn(isDark ? "bg-black/20" : "bg-slate-50")}>
                            <td colSpan={4} className={cn("p-4 border-b", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                              <div className={cn("border rounded-xl p-4", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200")}>
                                <h4 className={cn("text-sm font-bold mb-3", isDark ? "text-white" : "text-slate-900")}>Service Details</h4>
                                <table className="w-full text-left text-xs whitespace-nowrap">
                                  <thead>
                                    <tr className={cn("border-b", isDark ? "text-zinc-500 border-white/10" : "text-slate-500 border-slate-200")}>
                                      <th className="pb-2 pl-2 font-medium">Service</th>
                                      <th className="pb-2 font-medium">Type</th>
                                      <th className="pb-2 font-medium text-right">Hourly Rate</th>
                                      <th className="pb-2 font-medium text-right">Accumulated</th>
                                      <th className="pb-2 font-medium text-center">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className={cn("divide-y", isDark ? "divide-white/5" : "divide-slate-200")}>
                                    {cust.services
                                      .slice(((servicePageMap[cust.id] || 1) - 1) * servicesPerPage, (servicePageMap[cust.id] || 1) * servicesPerPage)
                                      .map((svc) => (
                                      <tr key={svc.id} className="hover:bg-white/5 transition-colors">
                                        <td className={cn("py-2 px-2 font-medium flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                                          {getIcon(svc.type)}
                                          {svc.name}
                                        </td>
                                        <td className={cn("py-2 px-4", isDark ? "text-zinc-400" : "text-slate-500")}>{svc.type}</td>
                                        <td className={cn("py-2 px-4 text-right font-medium", isDark ? "text-cyan-400" : "text-cyan-700")}>
                                          {formatRupiah(svc.hourlyRate)}
                                          {svc.fullHourlyRate !== undefined && svc.fullHourlyRate !== svc.hourlyRate && (
                                            <div className={cn("text-[10px] font-normal", isDark ? "text-zinc-500" : "text-slate-400")} title="Full rate when running. Stopped VPS only pays storage.">
                                              <span className="line-through">{formatRupiah(svc.fullHourlyRate)}</span> storage only
                                            </div>
                                          )}
                                        </td>
                                        <td className={cn("py-2 px-4 text-right font-bold", isDark ? "text-slate-200" : "text-slate-900")}>{formatRupiah(svc.accumulatedCost)}</td>
                                        <td className="py-2 pl-4 text-center">
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
                                {cust.services.length > servicesPerPage && (
                                  <div className={cn("flex items-center justify-between mt-3 pt-3 border-t", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                                    <p className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>
                                      Showing {((servicePageMap[cust.id] || 1) - 1) * servicesPerPage + 1} to {Math.min((servicePageMap[cust.id] || 1) * servicesPerPage, cust.services.length)} of {cust.services.length} services
                                    </p>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => setServicePageMap(prev => ({ ...prev, [cust.id]: Math.max(1, (prev[cust.id] || 1) - 1) }))}
                                        disabled={(servicePageMap[cust.id] || 1) === 1}
                                        className={cn("px-2 py-1 text-xs rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed border transition-all", isDark ? "bg-[#0A0B1A]/50 border-white/5 text-zinc-300" : "bg-white border-slate-200 text-slate-600")}
                                      >
                                        Prev
                                      </button>
                                      <button
                                        onClick={() => setServicePageMap(prev => ({ ...prev, [cust.id]: Math.min(Math.ceil(cust.services.length / servicesPerPage), (prev[cust.id] || 1) + 1) }))}
                                        disabled={(servicePageMap[cust.id] || 1) >= Math.ceil(cust.services.length / servicesPerPage)}
                                        className={cn("px-2 py-1 text-xs rounded-lg hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed border transition-all", isDark ? "bg-[#0A0B1A]/50 border-white/5 text-zinc-300" : "bg-white border-slate-200 text-slate-600")}
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
                  <div className={cn("p-4 border-t", isDark ? "bg-black/10 border-white/10" : "bg-slate-50 border-slate-200")}>
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
      </div>
    </div>
  );
}
