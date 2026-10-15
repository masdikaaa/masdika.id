"use client";
import { useUrlString } from "@/lib/useUrlTab";
import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";
import { Check, X, Clock, RefreshCw } from "lucide-react";
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useUrlString<string>("statusFilter", "PENDING");
  const [confirmAction, setConfirmAction] = useState<{ id: number; action: "APPROVE" | "REJECT" } | null>(null);

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/affiliate${statusFilter !== 'ALL' ? `?status=${statusFilter}` : ''}`);
      const json = await res.json();
      if (res.ok) {
        setWithdrawals(json);
      } else {
        toast.error(json.error || "Failed to load data");
      }
    } catch {
      toast.error("Network error occurred");
    } finally {
      setLoading(false);
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <motion.div className="space-y-6 md:space-y-8 pb-10" variants={containerVariants} initial="hidden" animate="visible">
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className={cn("text-3xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Affiliate System
          </h1>
          <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
            Manage affiliate commission withdrawal requests from users.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-44">
            <Select
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={[
                { value: "ALL", label: "All Status" },
                { value: "PENDING", label: "Pending" },
                { value: "PAID", label: "Paid" },
                { value: "REJECTED", label: "Rejected" }
              ]}
              placeholder="Status"
              className={cn("w-full rounded-xl px-4 py-2.5 text-sm", isDark ? "border-white/10" : "border-slate-200")}
            />
          </div>
          <button
            onClick={fetchWithdrawals}
            className={cn("p-2.5 hover:bg-zinc-800 border rounded-xl transition-colors", isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200")}
          >
            <RefreshCw className={cn("w-5 h-5", isDark ? "text-zinc-400" : "text-slate-500")} />
          </button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className={cn("backdrop-blur-sm border rounded-3xl overflow-hidden relative", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200")}>
        <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-transparent pointer-events-none" />
        <div className="overflow-x-auto relative z-10">
          <table className={cn("w-full text-left text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
            <thead className={cn("bg-black/20 text-xs uppercase font-semibold border-b", isDark ? "text-zinc-300 border-white/5" : "text-slate-600 border-slate-200")}>
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Bank Details</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDark ? "divide-white/5" : "divide-slate-200")}>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading data...
                  </td>
                </tr>
              ) : withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                    No withdrawal requests found.
                  </td>
                </tr>
              ) : (
                withdrawals.map((req) => (
                  <tr key={req.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-zinc-500" />
                        {new Date(req.createdAt).toLocaleString('en-US')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn("font-medium", isDark ? "text-white" : "text-slate-900")}>{req.user?.name}</div>
                      <div className="text-xs">{req.user?.email}</div>
                    </td>
                    <td className={cn("px-6 py-4 font-bold", isDark ? "text-white" : "text-slate-900")}>
                      {formatRupiah(req.amount)}
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn("font-medium", isDark ? "text-white" : "text-slate-900")}>{req.bankName} - {req.accountNumber}</div>
                      <div className="text-xs">A/N: {req.accountName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      {req.status === 'PENDING' && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setConfirmAction({ id: req.id, action: 'REJECT' })}
                            disabled={processingId === req.id}
                            className={cn("p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50", isDark ? "text-red-500" : "text-red-700")}
                            title="Reject & Refund"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmAction({ id: req.id, action: 'APPROVE' })}
                            disabled={processingId === req.id}
                            className={cn("p-2 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors disabled:opacity-50", isDark ? "text-emerald-500" : "text-emerald-700")}
                            title="Mark as Paid"
                          >
                            <Check className="w-4 h-4" />
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
      </motion.div>

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
    </motion.div>
  );
}
