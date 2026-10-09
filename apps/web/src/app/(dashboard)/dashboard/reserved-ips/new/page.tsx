"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { Network, Plus, Calculator, ArrowLeft, RefreshCw, AlertTriangle, CheckCircle, ChevronDown, Info } from "lucide-react";
import { formatRupiah } from "@/lib/billing";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Select } from "@/components/ui/Select";

export default function ReserveNewIpPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState<Record<string, number>>({});
  
  const [availableIps, setAvailableIps] = useState<any[]>([]);
  const [fetchingIps, setFetchingIps] = useState(false);
  const [selectedIp, setSelectedIp] = useState("");

  const [isReserving, setIsReserving] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setFetchingIps(true);
    try {
      const [ipsRes, pricingRes] = await Promise.all([
        fetch('/api/user/checkout/available-ips'),
        fetch('/api/user/vps/order-data')
      ]);
      
      if (ipsRes.ok) {
        const data = await ipsRes.json();
        setAvailableIps(data);
        if (data.length > 0) setSelectedIp(data[0].ipAddress);
      }
      
      if (pricingRes.ok) {
        const data = await pricingRes.json();
        if (data.pricing) {
          setPricing(data.pricing);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch available IPs");
    } finally {
      setLoading(false);
      setFetchingIps(false);
    }
  };

  const handleReserve = async () => {
    if (!selectedIp) return toast.error("Please select an IP address.");
    setIsReserving(true);
    try {
      const res = await fetch('/api/user/reserved-ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ipAddress: selectedIp })
      });
      const data = await res.json();
      
      if (res.ok) {
        toast.success("IP reserved successfully!");
        router.push("/dashboard/reserved-ips");
      } else {
        toast.error(data.error || "Failed to reserve IP");
      }
    } catch (error) {
      toast.error("Internal server error");
    } finally {
      setIsReserving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center">
        <RefreshCw className="w-10 h-10 text-cyan-500 animate-spin" />
      </div>
    );
  }

  const isIPv6 = selectedIp.includes(':');
  const ipPrice = isIPv6 ? (pricing?.ipv6 || 0) : (pricing?.ipv4 || 0);

  return (
    <div className="w-full space-y-6 md:space-y-8 pb-10">
      <Link href="/dashboard/reserved-ips" className={cn("inline-flex items-center hover:text-white transition-colors font-medium text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Reserved IPs
      </Link>

      {/* Hero Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={cn("relative overflow-hidden rounded-3xl p-6 md:p-8 shadow-sm group flex flex-col md:flex-row md:items-center justify-between gap-6 border", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200")}>
        
        
        <div className="relative z-10">
          <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 tracking-wide border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
            <Plus className="w-3 h-3" /> New Reservation
          </div>
          <h1 className={cn("text-3xl md:text-4xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Reserve <span className={cn(isDark ? "text-cyan-400" : "text-cyan-600")}>Global IP</span>
          </h1>
          <p className={cn("text-sm max-w-md", isDark ? "text-zinc-400" : "text-slate-500")}>Select an available IP address from the pool. This IP will be reserved for your account and can be attached to any future deployment.</p>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={cn("backdrop-blur-sm border rounded-3xl p-6 md:p-8 shadow-md relative overflow-hidden", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200")}>
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
        
        <div className="relative z-10 space-y-8">
          {/* IP Selection */}
          <div>
            <label className={cn("text-sm font-semibold mb-3 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
              <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 font-bold", isDark ? "bg-cyan-500/20 text-cyan-400" : "bg-cyan-100 text-cyan-700")}>1</span>
              Select Available IP Address
            </label>
            <div className="ml-0 sm:ml-8 mt-2 sm:mt-0">
              {fetchingIps ? (
                <div className={cn("flex items-center gap-2 text-sm py-2", isDark ? "text-zinc-400" : "text-slate-500")}>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Fetching available IPs...
                </div>
              ) : availableIps.length === 0 ? (
                <div className={cn("text-sm py-2 p-4 rounded-xl border", isDark ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : "text-amber-700 bg-amber-50 border-amber-200")}>
                  No IP addresses are currently available. Please contact support.
                </div>
              ) : (
                  <div className="space-y-4">
                    <Select
                      value={selectedIp}
                      onChange={(val) => setSelectedIp(val)}
                      options={availableIps.map((ip) => ({ value: ip.ipAddress, label: ip.ipAddress }))}
                      placeholder="Select an IP..."
                      className="font-mono text-sm py-3.5"
                    />
                    
                    <div className={cn("p-3 rounded-lg flex items-start gap-3 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                      <Info className={cn("w-5 h-5 shrink-0 mt-0.5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                      <p className={cn("text-sm", isDark ? "text-cyan-200" : "text-cyan-800")}>
                        <strong>Note:</strong> After reserving a Local IP, please open a support ticket to request a Public IP allocation.
                      </p>
                    </div>
                  </div>
              )}
            </div>
          </div>



          {/* Cost Calculator */}
          {selectedIp && (
            <div className={cn("ml-0 sm:ml-8 rounded-2xl p-5 space-y-4 relative overflow-hidden border", isDark ? "bg-gradient-to-br from-cyan-500/10 to-transparent border-cyan-500/30" : "bg-cyan-50 border-cyan-200")}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[40px] -mr-10 -mt-10 pointer-events-none" />
              <div className="flex items-center gap-3 relative z-10">
                <div className={cn("p-2.5 rounded-xl shrink-0 border", isDark ? "bg-cyan-500/20 border-cyan-500/20" : "bg-cyan-100 border-cyan-200")}>
                  <Calculator className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-700")} />
                </div>
                <h5 className={cn("text-base font-bold", isDark ? "text-white" : "text-slate-900")}>Estimated Cost</h5>
              </div>
              
              <div className={cn("backdrop-blur-sm p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10", isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-slate-200")}>
                 <div className="min-w-0">
                     <div className={cn("text-sm font-semibold", isDark ? "text-zinc-300" : "text-slate-500")}>
                      Hourly Accumulation
                    </div>
                    <div className={cn("text-xs mt-1", isDark ? "text-zinc-500" : "text-slate-500")}>
                      ~{formatRupiah(ipPrice * 720)}/mo total
                    </div>
                 </div>
                 <div className="text-left sm:text-right shrink-0">
                    <div className={cn("text-2xl font-black", isDark ? "text-cyan-400" : "text-cyan-700")}>
                       {formatRupiah(ipPrice)}
                    </div>
                    <div className={cn("text-xs font-medium mt-1 uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-500")}>
                       /hour
                    </div>
                 </div>
              </div>
            </div>
          )}

          <div className="pt-6 flex flex-col sm:flex-row justify-end">
            <button
              onClick={handleReserve}
              disabled={isReserving || availableIps.length === 0}
              className={cn("w-full sm:w-auto px-8 py-4 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0", isDark ? "shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] hover:-translate-y-0.5" : "shadow-md hover:shadow-lg hover:-translate-y-0.5")}
            >
              {isReserving ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" /> Reserving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" /> Reserve IP Now
                </>
              )}
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
}