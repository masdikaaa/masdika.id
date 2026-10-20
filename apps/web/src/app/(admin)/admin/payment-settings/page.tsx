"use client";

import { useState, useEffect } from "react";
import { CreditCard, Save, Building2, Wallet, Store, QrCode, Loader2, RefreshCw, CheckCircle2, ShieldCheck } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AdminLoader } from "@/components/admin/AdminLoader";

export default function AdminPaymentSettingsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const fetchPaymentMethods = async () => {
    try {
      const res = await fetch("/api/admin/payment-methods");
      if (res.ok) {
        const data = await res.json();
        setPaymentMethods(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);


  const handleToggle = async (id: number) => {
    const pm = paymentMethods.find(p => p.id === id);
    if (!pm) return;
    const newStatus = !pm.isActive;
    
    // Optimistic UI update
    setPaymentMethods(prev => 
      prev.map(p => p.id === id ? { ...p, isActive: newStatus } : p)
    );

    const actionText = newStatus ? "Activated" : "Disabled";
    const toastId = toast.loading(`${actionText} ${pm.name}...`);
    
    try {
      const updatedMethods = paymentMethods.map(p => p.id === id ? { ...p, isActive: newStatus } : p);
      
      const res = await fetch("/api/admin/payment-methods", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethods: updatedMethods })
      });
      
      if (res.ok) {
        toast.success(`${pm.name} has been ${newStatus ? 'activated' : 'disabled'}`, { id: toastId });
      } else {
        toast.error("Failed to update status", { id: toastId });
        // Revert local state if failed
        setPaymentMethods(prev => 
          prev.map(p => p.id === id ? { ...p, isActive: !newStatus } : p)
        );
      }
    } catch (err) {
      toast.error("An error occurred", { id: toastId });
      // Revert local state
      setPaymentMethods(prev => 
        prev.map(p => p.id === id ? { ...p, isActive: !newStatus } : p)
      );
    }
  };

  const handleUpdateFee = async (id: number, newFee: number) => {
    const pm = paymentMethods.find(p => p.id === id);
    if (!pm) return;
    
    // We update local state in onChange, so by the time onBlur happens, 
    // we don't necessarily know the "old" fee to compare against. 
    // Let's just fire the update.
    
    const toastId = toast.loading(`Updating fee for ${pm.name}...`);
    try {
      const updatedMethods = paymentMethods.map(p => p.id === id ? { ...p, fee: newFee } : p);
      
      const res = await fetch("/api/admin/payment-methods", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethods: updatedMethods })
      });
      
      if (res.ok) {
        toast.success(`Fee for ${pm.name} updated`, { id: toastId });
      } else {
        toast.error("Failed to update fee", { id: toastId });
      }
    } catch (err) {
      toast.error("An error occurred", { id: toastId });
    }
  };

  const renderGroup = (title: string, type: string) => {
    const group = paymentMethods.filter(pm => pm.type === type);
    if (group.length === 0) return null;

    return (
      <div className="mb-8">
        <h3 className={cn("text-lg font-medium mb-4 border-b pb-2", isDark ? "text-white border-slate-800" : "text-slate-900 border-slate-200")}>{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {group.map((pm) => (
            <div 
              key={pm.id} 
              className={cn(
                "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border transition-all cursor-pointer",
                pm.isActive 
                  ? (isDark ? "bg-[#060b14] border-emerald-500/50 hover:bg-[#060b14]/80 shadow-sm" : "bg-white border-emerald-500 shadow-sm") 
                  : (isDark ? "bg-[#060b14]/40 border-slate-800/80 opacity-60 hover:opacity-80" : "bg-slate-50 border-slate-200 opacity-60 hover:opacity-80")
              )}
              onClick={() => handleToggle(pm.id)}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className={cn(
                  "w-12 h-10 flex items-center justify-center shrink-0 rounded transition-colors overflow-hidden bg-white border",
                  pm.isActive ? "border-emerald-500" : "border-slate-200 opacity-70"
                )}>
                  {pm.image ? (
                    <img referrerPolicy="no-referrer" 
                      src={pm.image} 
                      alt={pm.name} 
                      className={cn("w-full h-full object-contain p-1.5", pm.isActive ? "" : "grayscale")} 
                      loading="lazy" decoding="async" />
                  ) : (
                    <>
                      {type === "VIRTUAL_ACCOUNT" && <Building2 className="w-5 h-5 text-slate-800" />}
                      {type === "EWALLET" && <Wallet className="w-5 h-5 text-slate-800" />}
                      {type === "RETAIL" && <Store className="w-5 h-5 text-slate-800" />}
                      {type === "QRIS" && <QrCode className="w-5 h-5 text-slate-800" />}
                    </>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn("text-sm font-semibold break-words leading-tight", isDark ? "text-white" : "text-slate-900")}>{pm.name}</div>
                </div>
              </div>

              {/* Action row: Fee input & Toggle */}
              <div 
                className="flex items-center justify-between sm:justify-end gap-3 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-800/40 w-full sm:w-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider shrink-0", isDark ? "text-zinc-500" : "text-slate-500")}>Fee Rp</span>
                  <input 
                    type="number" 
                    value={pm.fee} 
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                      setPaymentMethods(prev => prev.map(p => p.id === pm.id ? { ...p, fee: val } : p));
                    }}
                    className={cn("border rounded-lg px-2.5 py-1 text-xs w-20 sm:w-24 focus:outline-none focus:border-cyan-500 transition-colors", isDark ? "bg-[#0b1322] border-slate-800 text-white placeholder:text-zinc-500" : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400")}
                  />
                  <button 
                    onClick={() => handleUpdateFee(pm.id, pm.fee)}
                    className="text-[10px] px-3 py-1.5 rounded-lg font-bold transition-all bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm shrink-0"
                  >
                    Save
                  </button>
                </div>
                
                <button
                  type="button"
                  onClick={() => handleToggle(pm.id)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2",
                    pm.isActive ? "bg-cyan-400" : (isDark ? "bg-slate-800" : "bg-slate-300")
                  )}
                >
                  <span className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 ring-0 transition duration-200 ease-in-out",
                    pm.isActive ? "translate-x-5 bg-slate-950" : "translate-x-0 bg-white"
                  )} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row md:items-end justify-between gap-6 mb-6">
        <div>
          <h1 className={cn("text-2xl md:text-3xl font-extrabold mb-1 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Payment Settings</h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Enable, disable, and configure fees for payment methods across the platform.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn("px-4 py-2 rounded-lg font-medium text-sm border", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
            Total Gateways: {paymentMethods.length}
          </div>
          <button
            onClick={() => { setLoading(true); fetchPaymentMethods(); }}
            className={cn("px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border", isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700")}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Total Gateways</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            {paymentMethods.length}
          </div>
          <div className={cn("mt-2 text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-700")}>
            {paymentMethods.filter(p => p.isActive).length} active methods
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Active Methods</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            {paymentMethods.filter(p => p.isActive).length}
          </div>
          <div className={cn("mt-2 text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-700")}>
            Available for users
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Virtual Accounts</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            {paymentMethods.filter(p => p.type === 'VIRTUAL_ACCOUNT').length}
          </div>
          <div className={cn("mt-2 text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-700")}>
            {paymentMethods.filter(p => p.type === 'VIRTUAL_ACCOUNT' && p.isActive).length} active bank channels
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>E-Wallets & QRIS</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            {paymentMethods.filter(p => p.type === 'EWALLET' || p.type === 'QRIS').length}
          </div>
          <div className={cn("mt-2 text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-700")}>
            Instant payment settlement
          </div>
        </div>
      </div>

      <div className={cn("border rounded-2xl overflow-hidden p-6", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        {loading ? (
          <AdminLoader className="min-h-[300px] py-20" />
        ) : (
          <>
            {renderGroup("Virtual Accounts", "VIRTUAL_ACCOUNT")}
            {renderGroup("E-Wallets", "EWALLET")}
            {renderGroup("Retail (Convenience Stores)", "RETAIL")}
            {renderGroup("QRIS", "QRIS")}
          </>
        )}
      </div>
    </div>
  );
}
