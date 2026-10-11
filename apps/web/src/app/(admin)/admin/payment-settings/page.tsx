"use client";

import { useState, useEffect } from "react";
import { CreditCard, Save, Building2, Wallet, Store, QrCode, Loader2 } from "lucide-react";
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
        <h3 className={cn("text-lg font-medium mb-4 border-b pb-2", isDark ? "text-white border-white/10" : "text-slate-900 border-slate-200")}>{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {group.map((pm) => (
            <div 
              key={pm.id} 
              className={cn(
                "flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer",
                pm.isActive 
                  ? "bg-white/5 border-emerald-500/50 hover:bg-white/10" 
                  : (isDark ? "bg-black/20 border-white/5 hover:bg-black/40 opacity-75" : "bg-slate-50 border-slate-200 hover:bg-slate-100 opacity-75")
              )}
              onClick={() => handleToggle(pm.id)}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className={cn(
                  "w-12 h-10 flex items-center justify-center shrink-0 rounded transition-colors overflow-hidden",
                  pm.isActive ? (isDark ? "bg-white border-emerald-500/50" : "bg-white border-emerald-500") : (isDark ? "bg-white opacity-70 border-white/10 text-zinc-400" : "bg-white opacity-70 border-slate-200 text-slate-500")
                )}>
                  {pm.image ? (
                    <img referrerPolicy="no-referrer" 
                      src={pm.image} 
                      alt={pm.name} 
                      className={cn("w-full h-full object-contain p-1.5", pm.isActive ? "" : "grayscale")} 
                    loading="lazy" decoding="async" />
                  ) : (
                    <>
                      {type === "VIRTUAL_ACCOUNT" && <Building2 className="w-5 h-5" />}
                      {type === "EWALLET" && <Wallet className="w-5 h-5" />}
                      {type === "RETAIL" && <Store className="w-5 h-5" />}
                      {type === "QRIS" && <QrCode className="w-5 h-5" />}
                    </>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn("text-sm font-semibold break-words whitespace-normal leading-tight", isDark ? "text-white" : "text-slate-900")}>{pm.name}</div>
                  <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[10px] font-bold uppercase tracking-widest", isDark ? "text-zinc-500" : "text-slate-500")}>Fee Rp</span>
                      <input 
                        type="number" 
                        value={pm.fee} 
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                          setPaymentMethods(prev => prev.map(p => p.id === pm.id ? { ...p, fee: val } : p));
                        }}
                        className={cn("border rounded px-2 py-1 text-xs w-24 focus:outline-none focus:border-cyan-500/50 transition-colors", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                      />
                      <button 
                        onClick={() => handleUpdateFee(pm.id, pm.fee)}
                        className={cn("text-[10px] px-3 py-1 rounded transition-colors", isDark ? "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400" : "bg-cyan-50 hover:bg-cyan-100 text-cyan-700")}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <button
                type="button"
                className={cn(
                  "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2",
                  pm.isActive ? "bg-cyan-500" : (isDark ? "bg-white/10" : "bg-slate-300")
                )}
              >
                <span className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  pm.isActive ? "translate-x-5" : "translate-x-0"
                )} />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row md:items-end justify-between gap-6 mb-6">
        <div>
          <h1 className={cn("text-3xl font-extrabold drop-shadow-sm mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Payment Settings</h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Enable or disable payment methods across the platform.</p>
        </div>
      </div>

      <div className={cn("border rounded-2xl shadow-xl overflow-hidden p-6", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
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
