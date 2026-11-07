"use client";
import { useUrlString } from "@/lib/useUrlTab";
import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";
import { Check, X, Clock, RefreshCw, Gift, CheckCircle, Wallet, Search, AlertCircle } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { formatRupiah } from "@/lib/billing";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { motion } from "framer-motion";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Select } from "@/components/ui/Select";

export default function AdminAffiliatePage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
   
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useUrlString<string>("statusFilter", "ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ id: number; action: "APPROVE" | "REJECT" } | null>(null);

  const fetchWithdrawals = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/admin/affiliate${statusFilter !== 'ALL' ? `?status=${statusFilter}` : ''}`);
      const json = await res.json();
      if (res.ok) {
        setWithdrawals(Array.isArray(json) ? json : []);
      } else {
        toast.error(json.error || "Failed to load data");
      }
    } catch {
      toast.error("Network error occurred");
    } finally {
      setLoading(false);
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, [statusFilter]);

  const handleAction = async (id: number, action: "APPROVE" | "REJECT") => {
    setProcessingId(id);
    try {
      const res = await fetch("/api/admin/affiliate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action })
      });
      const json = await res.json();

      if (res.ok) {
        toast.success(`Withdrawal successfully ${action === 'APPROVE' ? 'approved' : 'rejected'}`);
        setConfirmAction(null);
        fetchWithdrawals();
      } else {
        toast.error(json.error || "Failed to process action");
      }
    } catch {
      toast.error("Network error occurred");
    } finally {
      setProcessingId(null);
    }
  };

  const totalRequests = withdrawals.length;
  const pendingCount = withdrawals.filter(w => w.status === 'PENDING').length;
  const paidCount = withdrawals.filter(w => w.status === 'PAID').length;
  const totalPaidAmount = withdrawals.filter(w => w.status === 'PAID').reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

  const filteredWithdrawals = withdrawals.filter(req => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = req.user?.name?.toLowerCase().includes(q);
    const emailMatch = req.user?.email?.toLowerCase().includes(q);
    const bankMatch = req.bankName?.toLowerCase().includes(q);
    const accountMatch = req.accountNumber?.toLowerCase().includes(q);
    const holderMatch = req.accountName?.toLowerCase().includes(q);
    return nameMatch || emailMatch || bankMatch || accountMatch || holderMatch;
  });

  return (
    <div className="w-full space-y-6 md:space-y-8 pb-10 relative z-10">
      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 w-full">
        <div className="flex-1 min-w-0">
          <h1 className={cn("text-xl sm:text-2xl font-bold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Affiliate System
          </h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
            Manage and process affiliate commission withdrawal requests from platform partners.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
          <div className={cn("px-3.5 py-2 rounded-lg border font-semibold text-xs flex items-center gap-1.5", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
            <span>Total Requests:</span>
            <span className="font-bold text-white">{totalRequests}</span>
          </div>
          <button
            onClick={() => fetchWithdrawals()}
            disabled={isRefreshing || loading}
            className={cn(
              "inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer",
              isDark
                ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white"
                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900"
            )}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", (isRefreshing || loading) && "animate-spin text-cyan-400")} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── STATS CARDS ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 w-full">
        {/* Total Requests */}
        <div className={cn(
          "relative overflow-hidden rounded-xl border p-3.5 sm:p-4 transition-colors",
          isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-sm" : "bg-white border-slate-200 shadow-sm"
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className={cn("text-[10px] font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              Total Requests
            </span>
            <div className={cn(
              "w-8 h-8 rounded-lg border flex items-center justify-center",
              isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600"
            )}>
              <Gift className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-lg sm:text-xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {totalRequests}
            </span>
            <span className={cn("text-[11px] font-medium", isDark ? "text-cyan-400" : "text-cyan-600")}>All Submissions</span>
          </div>
        </div>

        {/* Pending Review */}
        <div className={cn(
          "relative overflow-hidden rounded-xl border p-3.5 sm:p-4 transition-colors",
          isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-sm" : "bg-white border-slate-200 shadow-sm"
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className={cn("text-[10px] font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              Pending Review
            </span>
            <div className={cn(
              "w-8 h-8 rounded-lg border flex items-center justify-center",
              isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600"
            )}>
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-lg sm:text-xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {pendingCount}
            </span>
            <span className={cn("text-[11px] font-medium", isDark ? "text-amber-400" : "text-amber-600")}>Awaiting Action</span>
          </div>
        </div>

        {/* Paid Requests */}
        <div className={cn(
          "relative overflow-hidden rounded-xl border p-3.5 sm:p-4 transition-colors",
          isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-sm" : "bg-white border-slate-200 shadow-sm"
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className={cn("text-[10px] font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              Completed Payouts
            </span>
            <div className={cn(
              "w-8 h-8 rounded-lg border flex items-center justify-center",
              isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600"
            )}>
              <CheckCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-lg sm:text-xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {paidCount}
            </span>
            <span className={cn("text-[11px] font-medium", isDark ? "text-emerald-400" : "text-emerald-600")}>Approved</span>
          </div>
        </div>

        {/* Total Paid Volume */}
        <div className={cn(
          "relative overflow-hidden rounded-xl border p-3.5 sm:p-4 transition-colors",
          isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-md" : "bg-white border-slate-200 shadow-sm"
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className={cn("text-[10px] font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              Total Paid Out
            </span>
            <div className={cn(
              "w-8 h-8 rounded-lg border flex items-center justify-center",
              isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600"
            )}>
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-lg sm:text-xl font-bold truncate tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {formatRupiah(totalPaidAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* ── CONTROLS & FILTER BAR ────────────────────────────────────────────── */}
      <div className={cn(
        "flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border p-3 rounded-xl transition-colors w-full",
        isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-sm" : "bg-white border-slate-200 shadow-sm"
      )}>
        {/* Status Tab switch */}
        <div className={cn(
          "inline-flex items-center gap-1 p-1 rounded-lg border max-w-full overflow-x-auto scrollbar-none self-start",
          isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-100 border-slate-200"
        )}>
          {[
            { id: "ALL", label: "All Requests", count: totalRequests },
            { id: "PENDING", label: "Pending", count: pendingCount },
            { id: "PAID", label: "Paid", count: paidCount },
            { id: "REJECTED", label: "Rejected", count: withdrawals.filter(w => w.status === 'REJECTED').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer whitespace-nowrap select-none",
                statusFilter === tab.id
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                  : isDark
                    ? "text-zinc-400 hover:text-white hover:bg-white/5"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              )}
            >
              <span>{tab.label}</span>
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none shrink-0 transition-colors",
                statusFilter === tab.id
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

        {/* Search */}
        <div className="relative w-full sm:w-64 md:w-72 shrink-0">
          <Search className={cn("w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2", isDark ? "text-zinc-500" : "text-slate-400")} />
          <input
            type="text"
            placeholder="Search user, email, bank, or account..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs focus:outline-none transition-all",
              isDark
                ? "bg-[#0a0a0c] border-white/[0.08] text-white placeholder-zinc-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 focus:bg-white"
            )}
          />
        </div>
      </div>

      {/* ── DATA SECTION ─────────────────────────────────────────────────────── */}
      <div className={cn("border rounded-xl overflow-hidden relative z-10", isDark ? "bg-[#0c0c0e] border-white/[0.08] shadow-sm" : "bg-white border-slate-200 shadow-sm")}>
        <div className="overflow-x-auto relative z-10">
          <table className={cn("w-full text-left text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
            <thead className={cn("text-xs uppercase font-semibold border-b", isDark ? "bg-[#0a0a0c] text-slate-400 border-white/[0.08]" : "bg-slate-50 text-slate-500 border-slate-200")}>
              <tr>
                <th className="px-3.5 py-2.5">Date</th>
                <th className="px-3.5 py-2.5">User</th>
                <th className="px-3.5 py-2.5">Amount</th>
                <th className="px-3.5 py-2.5">Bank Details</th>
                <th className="px-3.5 py-2.5">Status</th>
                <th className="px-3.5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDark ? "divide-slate-800/80" : "divide-slate-200")}>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-500" />
                    Loading requests...
                  </td>
                </tr>
              ) : filteredWithdrawals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Gift className={cn("w-12 h-12 mx-auto mb-3", isDark ? "text-zinc-600" : "text-slate-300")} />
                      <p className={cn("font-semibold text-base mb-1", isDark ? "text-white" : "text-slate-900")}>No withdrawal requests found</p>
                      <p className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>
                        {searchQuery || statusFilter !== 'ALL' ? "No requests matching your search or status filter." : "There are currently no withdrawal requests."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredWithdrawals.map((req) => (
                  <tr key={req.id} className={cn("transition-colors group", isDark ? "hover:bg-white/5" : "hover:bg-slate-50/80")}>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-zinc-500" />
                        {new Date(req.createdAt).toLocaleString('en-US')}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className={cn("font-medium", isDark ? "text-white" : "text-slate-900")}>{req.user?.name}</div>
                      <div className="text-xs">{req.user?.email}</div>
                    </td>
                    <td className={cn("px-3.5 py-2.5 font-bold", isDark ? "text-white" : "text-slate-900")}>
                      {formatRupiah(req.amount)}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className={cn("font-medium", isDark ? "text-white" : "text-slate-900")}>{req.bankName} - {req.accountNumber}</div>
                      <div className="text-xs">A/N: {req.accountName}</div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      {req.status === 'PENDING' && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setConfirmAction({ id: req.id, action: 'REJECT' })}
                            disabled={processingId === req.id}
                            className={cn("p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50", isDark ? "text-red-400" : "text-red-700")}
                            title="Reject & Refund"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirmAction({ id: req.id, action: 'APPROVE' })}
                            disabled={processingId === req.id}
                            className={cn("p-2 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors disabled:opacity-50", isDark ? "text-emerald-400" : "text-emerald-700")}
                            title="Mark as Paid"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => confirmAction && handleAction(confirmAction.id, confirmAction.action)}
        title={confirmAction?.action === "APPROVE" ? "Approve Withdrawal?" : "Reject Withdrawal?"}
        description={`Are you sure you want to ${confirmAction?.action === "APPROVE" ? "approve and mark as paid" : "reject and refund"} this withdrawal request?`}
        confirmText={confirmAction?.action === "APPROVE" ? "Approve" : "Reject"}
        cancelText="Cancel"
        isLoading={!!processingId}
        variant={confirmAction?.action === "APPROVE" ? "warning" : "danger"}
      />
    </div>
  );
}
