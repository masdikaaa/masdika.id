"use client";

import { useUrlNumber, useUrlString } from "@/lib/useUrlTab";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Receipt, Trash2, CheckCircle, Clock, XCircle, CreditCard, Download, Search, Eye, Printer, Globe, Wallet, RefreshCw } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { AdminLoader } from "@/components/admin/AdminLoader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getInvoiceServiceIcon, InvoiceItemDescription } from "@/components/invoice/InvoiceServiceIcon";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Pagination } from "@/components/ui/Pagination";
import { cn } from "@/lib/utils";

export default function AdminInvoicesPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const fetchInvoices = async (query?: string | React.MouseEvent) => {
    try {
      const q = typeof query === "string" ? query.trim() : searchQuery.trim();
      const url = q ? `/api/admin/invoices?search=${encodeURIComponent(q)}` : "/api/admin/invoices";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedInvoiceDetails, setSelectedInvoiceDetails] = useState<any>(null);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [searchQuery, setSearchQuery] = useUrlString<string>("searchQuery", "");
  const [statusTab, setStatusTab] = useState<string>("all");

  const totalPaidCount = invoices.filter(i => i.status === 'PAID').length;
  const totalPendingCount = invoices.filter(i => i.status === 'PENDING').length;
  const totalFailedCount = invoices.filter(i => ['FAILED', 'CANCELED', 'EXPIRED'].includes(i.status)).length;
  const totalPaidVolume = invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  // Filtering
  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus = statusTab === "all" ? true : statusTab === "FAILED" ? ['FAILED', 'CANCELED', 'EXPIRED'].includes(inv.status) : inv.status === statusTab;
    const term = searchQuery.toLowerCase().trim();
    if (!term) return matchesStatus;

    const invoiceId = (inv.invoiceNumber || inv.merchantOrderId || "").toLowerCase();
    const customerName = (inv.user?.name || "").toLowerCase();
    const customerEmail = (inv.user?.email || "").toLowerCase();
    const planTitle = (inv.subscription?.plan?.name || inv.subscription?.plan?.title || inv.plan?.name || inv.plan?.title || "").toLowerCase();
    const vpsHostname = (inv.vpsService?.hostname || "").toLowerCase();
    const method = (inv.paymentMethod || "").toLowerCase();

    return matchesStatus && (
      invoiceId.includes(term) ||
      customerName.includes(term) ||
      customerEmail.includes(term) ||
      planTitle.includes(term) ||
      vpsHostname.includes(term) ||
      method.includes(term)
    );
  });

  // Pagination
  const [currentPage, setCurrentPage] = useUrlNumber("currentPage", 1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInvoices(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);


  const handleValidateInvoice = async (id: number) => {
    const toastId = toast.loading("Validating payment...");
    try {
      const res = await fetch(`/api/admin/invoices/${id}/validate`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Payment manually validated!", { id: toastId });
        fetchInvoices();
      } else {
        toast.error(data.error || "Failed to validate payment", { id: toastId });
      }
    } catch (err) {
      toast.error("Internal error", { id: toastId });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedInvoices.length === 0) return;
    setIsBulkDeleting(true);
    const toastId = toast.loading(`Deleting ${selectedInvoices.length} invoices...`);
    let successCount = 0;
    
    for (const id of selectedInvoices) {
      try {
        const res = await fetch(`/api/admin/invoices/${id}`, { method: "DELETE" });
        if (res.ok) successCount++;
      } catch (e) {
        // ignore
      }
    }
    
    toast.success(`Successfully deleted ${successCount} invoices`, { id: toastId });
    setSelectedInvoices([]);
    setShowBulkDeleteModal(false);
    setIsBulkDeleting(false);
    fetchInvoices();
  };

  const toggleSelectAll = () => {
    if (selectedInvoices.length === filteredInvoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(filteredInvoices.map(i => i.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedInvoices(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    return <StatusBadge status={status} />;
  };

  const handlePrint = () => {
    if (!selectedInvoiceDetails) return;
    const invId = selectedInvoiceDetails.invoiceNumber || selectedInvoiceDetails.merchantOrderId;
    window.open(`/invoice/${invId}`, '_blank');
  };

  if (loading) {
    return <AdminLoader />;
  }

  return (
    <div className="w-full space-y-6 md:space-y-8 pb-10 relative z-10">
      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 w-full">
        <div className="flex-1 min-w-0">
          <h1 className={cn("text-xl sm:text-2xl font-bold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Invoices & Billing
          </h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
            Manage customer orders, transactions, payment gateways, and billing history.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
          <div className={cn("px-4 py-2 rounded-lg border font-medium text-sm md:text-base text-center sm:text-left", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
            Total Invoices: {invoices.length}
          </div>
          <button
            onClick={fetchInvoices}
            disabled={loading}
            className={cn(
              "inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer",
              isDark
                ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white"
                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900"
            )}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin text-cyan-500")} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── STATS CARDS ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {/* Total Invoices */}
        <div className={cn(
          "relative overflow-hidden rounded-2xl border p-5 transition-colors",
          isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-sm"
        )}>
          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              Total Invoices
            </span>
            <div className={cn(
              "w-9 h-9 rounded-xl border flex items-center justify-center",
              isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600"
            )}>
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className={cn("text-xl sm:text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>
              {invoices.length}
            </span>
            <span className={cn("text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-600")}>All Orders</span>
          </div>
        </div>

        {/* Paid Invoices */}
        <div className={cn(
          "relative overflow-hidden rounded-2xl border p-5 transition-colors",
          isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-sm"
        )}>
          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              Paid Invoices
            </span>
            <div className={cn(
              "w-9 h-9 rounded-xl border flex items-center justify-center",
              isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600"
            )}>
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className={cn("text-xl sm:text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>
              {totalPaidCount}
            </span>
            <span className={cn("text-xs font-medium", isDark ? "text-emerald-400" : "text-emerald-600")}>Settled</span>
          </div>
        </div>

        {/* Pending Invoices */}
        <div className={cn(
          "relative overflow-hidden rounded-2xl border p-5 transition-colors",
          isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-sm"
        )}>
          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              Pending Invoices
            </span>
            <div className={cn(
              "w-9 h-9 rounded-xl border flex items-center justify-center",
              isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600"
            )}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className={cn("text-xl sm:text-2xl font-bold", isDark ? "text-white" : "text-slate-900")}>
              {totalPendingCount}
            </span>
            <span className={cn("text-xs font-medium", isDark ? "text-amber-400" : "text-amber-600")}>Awaiting Pay</span>
          </div>
        </div>

        {/* Total Paid Volume */}
        <div className={cn(
          "relative overflow-hidden rounded-2xl border p-5 transition-colors",
          isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-sm"
        )}>
          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              Total Paid Volume
            </span>
            <div className={cn(
              "w-9 h-9 rounded-xl border flex items-center justify-center",
              isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600"
            )}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className={cn("text-lg sm:text-xl font-bold truncate", isDark ? "text-white" : "text-slate-900")}>
              {formatRupiah(totalPaidVolume)}
            </span>
          </div>
        </div>
      </div>

      {/* ── CONTROLS & FILTER BAR ────────────────────────────────────────────── */}
      <div className={cn(
        "flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border p-4 rounded-2xl transition-colors w-full",
        isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-sm"
      )}>
        {/* Status Tab switch */}
        <div className={cn(
          "inline-flex items-center gap-1 p-1 rounded-xl border max-w-full overflow-x-auto scrollbar-none self-start",
          isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-100 border-slate-200"
        )}>
          {[
            { id: "all", label: "All Invoices", count: invoices.length },
            { id: "PAID", label: "Paid", count: totalPaidCount },
            { id: "PENDING", label: "Pending", count: totalPendingCount },
            { id: "FAILED", label: "Failed", count: totalFailedCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusTab(tab.id);
                setCurrentPage(1);
              }}
              className={cn(
                "inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap select-none",
                statusTab === tab.id
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                  : isDark
                    ? "text-zinc-400 hover:text-white hover:bg-white/5"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              )}
            >
              <span>{tab.label}</span>
              <span className={cn(
                "px-1.5 py-0.5 rounded-md text-[10px] font-bold leading-none shrink-0 transition-colors",
                statusTab === tab.id
                  ? "bg-slate-950/20 text-slate-950 font-bold"
                  : isDark
                    ? "bg-white/10 text-zinc-300"
                    : "bg-slate-200 text-slate-700"
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Bulk delete */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {selectedInvoices.length > 0 && (
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              disabled={isBulkDeleting}
              className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 font-semibold py-2 px-4 rounded-xl transition-all disabled:opacity-50 text-xs text-white"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected ({selectedInvoices.length})
            </button>
          )}

          <div className="relative flex-1 min-w-[200px] sm:min-w-[260px] w-full sm:w-auto">
            <Search className={cn("w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2", isDark ? "text-zinc-500" : "text-slate-400")} />
            <input
              type="text"
              placeholder="Search user, email, ID, or plan..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className={cn(
                "w-full pl-10 pr-4 py-2 rounded-xl border text-xs focus:outline-none transition-all",
                isDark
                  ? "bg-[#0a0a0c] border-white/[0.08] text-white placeholder-zinc-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 focus:bg-white"
              )}
            />
          </div>
        </div>
      </div>

      {/* ── DATA SECTION ─────────────────────────────────────────────────────── */}
      <div className={cn("border rounded-2xl overflow-hidden relative z-10", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className="overflow-x-auto">
          <table className={cn("w-full text-left text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
            <thead className={cn("text-xs uppercase border-b font-semibold", isDark ? "bg-[#0a0a0c] text-slate-400 border-white/[0.08]" : "bg-slate-50 text-slate-500 border-slate-200")}>
              <tr>
                <th scope="col" className="px-6 py-4 w-12 text-center">
                  <button
                    onClick={toggleSelectAll}
                    className={`w-5 h-5 border rounded flex items-center justify-center transition-colors mx-auto ${
                      filteredInvoices.length > 0 && selectedInvoices.length === filteredInvoices.length
                        ? 'bg-cyan-500 border-cyan-500'
                        : isDark ? 'border-slate-700 bg-[#0a0a0c] hover:border-cyan-400' : 'border-zinc-300 bg-white hover:border-cyan-600'
                    }`}
                  >
                    {filteredInvoices.length > 0 && selectedInvoices.length === filteredInvoices.length && <CheckCircle className="w-3.5 h-3.5 text-slate-900" />}
                  </button>
                </th>
                <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Invoice ID</th>
                <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Customer</th>
                <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Description</th>
                <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Amount</th>
                <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Method</th>
                <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Status</th>
                <th scope="col" className="px-6 py-4 font-semibold text-right whitespace-nowrap">Date</th>
                <th scope="col" className="px-6 py-4 font-semibold text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDark ? "divide-slate-800/80" : "divide-slate-200")}>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <AdminLoader className="min-h-[200px]" />
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Receipt className={cn("w-12 h-12 mx-auto mb-3", isDark ? "text-zinc-600" : "text-slate-300")} />
                      <p className={cn("font-semibold text-base mb-1", isDark ? "text-white" : "text-slate-900")}>No invoices found</p>
                      <p className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>
                        {searchQuery || statusTab !== 'all' ? "No invoices matching your search or filter criteria." : "There are currently no customer invoices."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((invoice) => (
                  <tr key={invoice.id} className={cn("transition-colors group", isDark ? "hover:bg-white/5" : "hover:bg-slate-50/80", selectedInvoices.includes(invoice.id) ? (isDark ? "bg-cyan-500/10" : "bg-cyan-50") : "")}>
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-center">
                      <button
                        onClick={() => toggleSelect(invoice.id)}
                        className={`w-5 h-5 border rounded flex items-center justify-center transition-colors mx-auto ${
                          selectedInvoices.includes(invoice.id)
                            ? 'bg-cyan-500 border-cyan-500'
                            : isDark ? 'border-slate-700 bg-[#0a0a0c] group-hover:border-cyan-400' : 'border-zinc-300 bg-white group-hover:border-cyan-600'
                        }`}
                      >
                        {selectedInvoices.includes(invoice.id) && <CheckCircle className="w-3.5 h-3.5 text-slate-900" />}
                      </button>
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center transition-colors border", isDark ? "bg-white/[0.03] border-white/[0.08] group-hover:bg-cyan-500/10 group-hover:text-cyan-400" : "bg-slate-100 border-slate-200/90 group-hover:bg-slate-200 group-hover:text-slate-900")}>
                          <Receipt className="w-4 h-4" />
                        </div>
                        <span className={cn("font-mono text-xs px-2.5 py-1 rounded-lg border", isDark ? "bg-[#111115] text-white border-white/[0.08]" : "bg-slate-50/80 text-slate-900 border-slate-200/90")}>
                          {invoice.invoiceNumber || invoice.merchantOrderId}
                        </span>
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <div className={cn("font-medium", isDark ? "text-white" : "text-slate-900")}>{invoice.user?.name}</div>
                      <div className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>{invoice.user?.email}</div>
                    </td>
                    <td className={cn("px-3.5 py-2.5 whitespace-nowrap font-medium", isDark ? "text-white" : "text-slate-900")}>
                      <InvoiceItemDescription invoice={invoice} isDark={isDark} />
                    </td>
                    <td className={cn("px-3.5 py-2.5 font-medium whitespace-nowrap", isDark ? "text-white" : "text-slate-900")}>
                      {formatRupiah(invoice.amount)}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <CreditCard className={cn("w-4 h-4", isDark ? "text-zinc-400" : "text-slate-500")} />
                        <span className={cn(isDark ? "text-zinc-300" : "text-slate-600")}>{invoice.paymentMethod || '-'}</span>
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                      {new Date(invoice.createdAt).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {invoice.status === 'PENDING' && (
                          <button
                            onClick={() => handleValidateInvoice(invoice.id)}
                            className={cn("px-3 py-1.5 text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl transition-colors border border-emerald-500/20 whitespace-nowrap", isDark ? "text-emerald-400" : "text-emerald-700")}
                          >
                            Mark as Paid
                          </button>
                        )}
                        <Link
                          href={`/invoice/${invoice.invoiceNumber || invoice.merchantOrderId}`}
                          target="_blank"
                          className={cn("inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-colors text-xs font-medium border whitespace-nowrap", isDark ? "bg-white/[0.03] hover:bg-white/[0.08] text-white border-white/[0.08]" : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200/90 shadow-2xs")}
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Print / View
                        </Link>
                        <button
                          onClick={() => setSelectedInvoiceDetails(invoice)}
                          className={cn("p-1.5 hover:bg-cyan-500/10 rounded-xl transition-colors border border-transparent hover:border-cyan-500/20", isDark ? "text-cyan-400" : "text-cyan-700")}
                          title="Quick Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className={cn("p-4 border-t", isDark ? "bg-[#0c0c0e] border-white/[0.08]" : "bg-white border-slate-200")}>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      </div>

      {/* Invoice Details Modal */}
      {selectedInvoiceDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={cn("w-full max-w-2xl rounded-2xl border flex flex-col max-h-[90vh] shadow-2xl overflow-hidden", isDark ? "bg-[#0c0c0e] border-white/[0.08] text-white" : "bg-white border-slate-200 text-slate-900")}>
            <div className={cn("p-6 border-b flex justify-between items-center", isDark ? "bg-[#0c0c0e] border-white/[0.08]" : "bg-white border-slate-200")}>
              <div>
                <h3 className={cn("text-sm sm:text-base font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                  <Receipt className={cn("w-5 h-5", isDark ? "text-cyan-500" : "text-cyan-700")} />
                  Invoice Details
                </h3>
                <p className={cn("text-xs sm:text-sm mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>{selectedInvoiceDetails.invoiceNumber || selectedInvoiceDetails.merchantOrderId}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  className={cn("p-2 rounded-xl transition-colors border border-transparent", isDark ? "text-zinc-400 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100")}
                  title="Print Invoice"
                >
                  <Printer className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setSelectedInvoiceDetails(null)}
                  className={cn("p-2 rounded-xl transition-colors", isDark ? "text-zinc-400 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100")}
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Status & Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div className={cn("p-4 rounded-2xl border", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50 border-slate-200")}>
                  <div className={cn("text-sm mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>Status</div>
                  <div>{getStatusBadge(selectedInvoiceDetails.status)}</div>
                </div>
                <div className={cn("p-4 rounded-2xl border", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50 border-slate-200")}>
                  <div className={cn("text-sm mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>Total Amount</div>
                  <div className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>{formatRupiah(selectedInvoiceDetails.amount)}</div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="space-y-3">
                <h4 className={cn("text-sm font-semibold uppercase tracking-wider", isDark ? "text-white" : "text-slate-900")}>Customer Information</h4>
                <div className={cn("p-4 rounded-2xl border space-y-2 text-sm", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50 border-slate-200")}>
                  <div className="flex justify-between">
                    <span className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>Name</span>
                    <span className={cn("font-medium", isDark ? "text-white" : "text-slate-900")}>{selectedInvoiceDetails.user?.name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>Email</span>
                    <span className={cn(isDark ? "text-white" : "text-slate-900")}>{selectedInvoiceDetails.user?.email || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="space-y-3">
                <h4 className={cn("text-sm font-semibold uppercase tracking-wider", isDark ? "text-white" : "text-slate-900")}>Payment Details</h4>
                <div className={cn("p-4 rounded-2xl border space-y-2 text-sm", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50 border-slate-200")}>
                  <div className="flex justify-between">
                    <span className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>Method</span>
                    <span className={cn(isDark ? "text-white" : "text-slate-900")}>{selectedInvoiceDetails.paymentMethod || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>Reference</span>
                    <span className={cn("font-mono text-xs break-all text-right max-w-[60%]", isDark ? "text-white" : "text-slate-900")}>{selectedInvoiceDetails.reference || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>Created At</span>
                    <span className={cn(isDark ? "text-white" : "text-slate-900")}>
                      {new Date(selectedInvoiceDetails.createdAt).toLocaleString('id-ID')}
                    </span>
                  </div>
                  {selectedInvoiceDetails.paidAt && (
                    <div className="flex justify-between">
                      <span className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>Paid At</span>
                      <span className={cn("", isDark ? "text-emerald-400" : "text-emerald-700")}>
                        {new Date(selectedInvoiceDetails.paidAt).toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className={cn("text-sm font-semibold uppercase tracking-wider", isDark ? "text-white" : "text-slate-900")}>Order Items</h4>
                  <Link
                    href={`/invoice/${selectedInvoiceDetails.invoiceNumber || selectedInvoiceDetails.merchantOrderId}`}
                    target="_blank"
                    className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border transition-colors", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20" : "bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100")}
                  >
                    <Printer className="w-3.5 h-3.5" /> Open Official Invoice
                  </Link>
                </div>
                <div className={cn("p-4 rounded-2xl border", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200")}>
                  <InvoiceItemDescription invoice={selectedInvoiceDetails} isDark={isDark} />
                </div>
              </div>
            </div>
            
            <div className={cn("p-6 border-t", isDark ? "bg-[#0c0c0e] border-white/[0.08]" : "bg-slate-50 border-slate-200")}>
              <button
                onClick={() => setSelectedInvoiceDetails(null)}
                className={cn("w-full py-2 text-xs font-bold rounded-xl transition-colors border", isDark ? "bg-[#0a0a0c] border-white/[0.08] hover:bg-white/5 text-white" : "bg-white border-slate-200 hover:bg-slate-100 text-slate-900")}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleBulkDelete}
        title="Delete Invoices"
        description={`Are you sure you want to permanently delete ${selectedInvoices.length} selected invoice(s)? This action cannot be undone.`}
        confirmText="Delete Invoices"
        variant="danger"
        isLoading={isBulkDeleting}
      />
    </div>
  );
}
