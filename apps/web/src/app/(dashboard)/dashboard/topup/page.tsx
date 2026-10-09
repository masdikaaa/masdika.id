'use client';

import { useState, useEffect } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { Wallet, Building2, Store, QrCode, Loader2, ArrowLeft, Check, Plus, ShieldCheck, ChevronLeft, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { formatRupiah } from "@/lib/billing";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Pagination } from "@/components/ui/Pagination";

export default function TopUpPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [topUpAmount, setTopUpAmount] = useState<number>(50000);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<{code: string, description?: string, discountPercent: number} | null>(null);
  const [isCheckingVoucher, setIsCheckingVoucher] = useState(false);

  // Pagination State
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    fetch("/api/public/payment-methods")
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setPaymentMethods(json.data);
          if (json.taxRate !== undefined) setTaxRate(json.taxRate);
        }
      })
      .catch(() => toast.error("Failed to load payment methods"));
  }, []);

  const handleTopUp = async () => {
    if (!selectedMethod) {
      toast.error("Please select a payment method");
      return;
    }
    if (topUpAmount < 50000) {
      toast.error("Minimum top up is Rp 50.000");
      return;
    }

    setIsProcessing(true);
    const toastId = toast.loading("Generating payment link...");

    try {
      const res = await fetch("/api/user/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: topUpAmount,
          paymentMethodCode: selectedMethod,
          voucherCode: appliedVoucher ? appliedVoucher.code : undefined
        })
      });

      const json = await res.json();
      
      if (res.ok && json.success) {
        toast.success("Payment link generated! Redirecting...", { id: toastId });
        window.location.href = json.paymentUrl;
      } else {
        toast.error(json.error || "Failed to process top up", { id: toastId });
        setIsProcessing(false);
      }
    } catch (error) {
      toast.error("An error occurred", { id: toastId });
      setIsProcessing(false);
    }
  };

  const handleCheckVoucher = async () => {
    if (!voucherCode) return;
    setIsCheckingVoucher(true);
    try {
      const res = await fetch("/api/user/vouchers/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: voucherCode })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAppliedVoucher(data.data);
        toast.success(`Voucher applied! ${data.data.discountPercent}% discount`);
      } else {
        toast.error(data.error || "Invalid voucher");
        setAppliedVoucher(null);
      }
    } catch (err) {
      toast.error("Failed to check voucher");
      setAppliedVoucher(null);
    } finally {
      setIsCheckingVoucher(false);
    }
  };

  const selectedPmData = paymentMethods.find(p => p.code === selectedMethod);
  const fee = selectedPmData ? (selectedPmData.fee || 0) : 0;
  
  const discountAmount = appliedVoucher ? Math.floor(topUpAmount * (appliedVoucher.discountPercent / 100)) : 0;
  const paymentSubtotal = Math.max(0, topUpAmount - discountAmount);
  
  const taxAmount = Math.floor(paymentSubtotal * (taxRate / 100));
  const total = paymentSubtotal + taxAmount + fee;

  const totalPages = Math.ceil(paymentMethods.length / itemsPerPage);
  const paginatedMethods = paymentMethods.slice((page - 1) * itemsPerPage, page * itemsPerPage);

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
      <motion.div variants={itemVariants}>
        <Link
          href="/dashboard/billing"
          className={cn("inline-flex items-center gap-2 hover:text-white transition-colors text-sm font-medium mb-2", isDark ? "text-zinc-400" : "text-slate-500")}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Billing
        </Link>
      </motion.div>

      {/* Header section */}
      <motion.div variants={itemVariants} className={cn("relative overflow-hidden rounded-3xl backdrop-blur-sm border p-6 md:p-8 group shadow-sm", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200")}>
        
        
        <div className="relative z-10 shrink-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold mb-4 tracking-wide">
            <Wallet className="w-3 h-3" /> Billing & Payment
          </div>
          <h1 className={cn("text-3xl md:text-4xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Top Up <span className={cn(isDark ? "text-cyan-400" : "text-cyan-600")}>Balance</span>
          </h1>
          <p className={cn("text-sm max-w-md", isDark ? "text-zinc-400" : "text-slate-500")}>Add funds to your account securely. Your balance can be used for new purchases or auto-renewals.</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* Left Column: Form */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          
          {/* Step 1: Amount */}
          <motion.section variants={itemVariants} className={cn("backdrop-blur-sm border rounded-3xl p-6 md:p-8 shadow-md overflow-hidden relative", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200")}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
            
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm border", isDark ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" : "bg-cyan-100 text-cyan-700 border-cyan-300")}>1</div>
              <h2 className={cn("text-xl font-bold tracking-wide", isDark ? "text-white" : "text-slate-900")}>Select Amount</h2>
            </div>

            <div className="relative z-10 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[50000, 100000, 250000, 500000, 1000000, 2000000].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setTopUpAmount(amt)}
                    className={cn(
                      "py-4 rounded-2xl text-base font-bold transition-all border text-center shadow-inner",
                      topUpAmount === amt 
                        ? isDark 
                          ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                          : "bg-cyan-50 border-cyan-200 text-cyan-700 shadow-sm"
                        : isDark 
                          ? "bg-[#0b1120] border-white/5 text-zinc-400 hover:border-white/20 hover:text-white" 
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                    )}
                  >
                    {formatRupiah(amt)}
                  </button>
                ))}
              </div>
              
              <div className="relative">
                <span className={cn("absolute left-6 top-1/2 -translate-y-1/2 font-bold text-lg", isDark ? "text-zinc-500" : "text-slate-500")}>Rp</span>
                <input
                  type="text"
                  value={topUpAmount ? topUpAmount.toLocaleString('id-ID') : ''}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/[^0-9]/g, '');
                    setTopUpAmount(Number(rawValue));
                  }}
                  className={cn("w-full border rounded-2xl pl-16 pr-6 py-5 focus:outline-none focus:ring-2 font-black text-2xl shadow-inner transition-all", isDark ? "bg-[#0b1120] border-white/10 text-white focus:border-cyan-500/50 focus:ring-cyan-500/20" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500 focus:ring-cyan-500/20")}
                  placeholder="Custom amount..."
                />
              </div>
              <p className={cn("text-xs font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>Minimum amount is Rp 50.000.</p>
            </div>
          </motion.section>

          {/* Step 2: Payment Method */}
          <motion.section variants={itemVariants} className={cn("backdrop-blur-sm border rounded-3xl p-6 md:p-8 shadow-md overflow-hidden relative", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200")}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
            
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm border", isDark ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" : "bg-cyan-100 text-cyan-700 border-cyan-300")}>2</div>
              <h2 className={cn("text-xl font-bold tracking-wide", isDark ? "text-white" : "text-slate-900")}>Payment Method</h2>
            </div>

            <div className="relative z-10">
              {paymentMethods.length === 0 ? (
                <div className={cn("flex flex-col items-center justify-center py-10 border rounded-2xl", isDark ? "bg-white/5 border-white/5" : "bg-slate-50 border-slate-200")}>
                  <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mb-4" />
                  <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Loading payment methods...</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {paginatedMethods.map(pm => (
                      <div
                        key={pm.code}
                        onClick={() => setSelectedMethod(pm.code)}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all shadow-inner",
                          selectedMethod === pm.code
                            ? isDark
                              ? "bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                              : "bg-cyan-50 border-cyan-200 shadow-sm"
                            : isDark
                              ? "bg-[#0b1120] border-white/5 hover:border-white/20 hover:bg-white/5"
                              : "bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-14 h-12 flex items-center justify-center rounded-xl overflow-hidden shrink-0",
                            selectedMethod === pm.code ? (isDark ? "bg-white ring-2 ring-cyan-500 ring-offset-2 ring-offset-[#0b1120]" : "bg-white ring-2 ring-cyan-500 ring-offset-2 ring-offset-cyan-50") : (isDark ? "bg-white border border-zinc-200" : "bg-white border border-slate-200")
                          )}>
                            {pm.image ? (
                              <img referrerPolicy="no-referrer" 
                                src={pm.image} 
                                alt={pm.name} 
                                className="w-full h-full object-contain p-2"
                              loading="lazy" decoding="async" />
                            ) : (
                              <div className={cn("flex items-center justify-center", isDark ? "text-zinc-800" : "text-slate-900")}>
                                {pm.type === "VIRTUAL_ACCOUNT" && <Building2 className="w-6 h-6" />}
                                {pm.type === "EWALLET" && <Wallet className="w-6 h-6" />}
                                {pm.type === "RETAIL" && <Store className="w-6 h-6" />}
                                {pm.type === "QRIS" && <QrCode className="w-6 h-6" />}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className={cn("text-sm font-bold leading-tight", isDark ? "text-white" : "text-slate-900")}>{pm.name}</div>
                            {pm.fee > 0 && (
                              <div className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mt-1 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded w-fit">+ Fee {formatRupiah(pm.fee)}</div>
                            )}
                          </div>
                        </div>
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ml-4 transition-colors",
                          selectedMethod === pm.code ? (isDark ? "border-cyan-400 bg-cyan-400/20" : "border-cyan-500 bg-cyan-100") : (isDark ? "border-zinc-600 bg-[#011627]" : "border-slate-300 bg-slate-100")
                        )}>
                          {selectedMethod === pm.code && <Check className="w-3 h-3 text-cyan-400" />}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {totalPages > 1 && (
                    <div className={cn("mt-8 flex items-center justify-center gap-4 border-t pt-6", isDark ? "border-white/5" : "border-slate-200")}>
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className={cn("p-2 rounded-xl bg-white/5 border hover:text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors", isDark ? "border-white/10 text-zinc-400" : "border-slate-200 text-slate-500")}
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <span className={cn("text-sm font-bold tracking-widest", isDark ? "text-white" : "text-slate-900")}>
                        {page}/{totalPages}
                      </span>
                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className={cn("p-2 rounded-xl bg-white/5 border hover:text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors", isDark ? "border-white/10 text-zinc-400" : "border-slate-200 text-slate-500")}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.section>

        </div>

        {/* Right Column: Order Summary */}
        <motion.div variants={itemVariants} className="lg:col-span-1">
          <div className={cn("sticky top-6 backdrop-blur-sm border rounded-3xl p-6 md:p-8 shadow-md overflow-hidden", isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-slate-200")}>
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
            <h2 className={cn("text-xl font-bold mb-6 border-b pb-4 flex items-center gap-2 relative z-10", isDark ? "text-white border-white/10" : "text-slate-900 border-slate-200")}>
              <ShieldCheck className="w-5 h-5 text-cyan-400" /> Payment Details
            </h2>

            <div className="space-y-4 mb-8 relative z-10">
              <div className={cn("flex justify-between items-center p-4 rounded-2xl border shadow-inner", isDark ? "bg-[#0b1120] border-white/5" : "bg-slate-50 border-slate-200")}>
                <div className={cn("text-sm font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Amount</div>
                <div className={cn("font-black text-lg", isDark ? "text-white" : "text-slate-900")}>{formatRupiah(topUpAmount)}</div>
              </div>

              {selectedPmData && (
                <div className="flex justify-between items-center text-xs px-2 mt-4">
                  <div className={cn("font-bold uppercase tracking-widest", isDark ? "text-zinc-500" : "text-slate-500")}>Method</div>
                  <div className={cn("font-bold px-2 py-1 rounded-lg border", isDark ? "bg-white/5 text-white border-white/5" : "bg-slate-100 text-slate-900 border-slate-200")}>{selectedPmData.name}</div>
                </div>
              )}

              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-xs px-2 mt-2 text-green-400">
                  <div className="font-bold uppercase tracking-widest">Discount ({appliedVoucher?.discountPercent}%)</div>
                  <div className="font-black">- {formatRupiah(discountAmount)}</div>
                </div>
              )}

              {fee > 0 && (
                <div className="flex justify-between items-center text-xs px-2 mt-2">
                  <div className={cn("font-bold uppercase tracking-widest", isDark ? "text-zinc-500" : "text-slate-500")}>Payment Fee</div>
                  <div className={cn("font-black", isDark ? "text-white" : "text-slate-900")}>{formatRupiah(fee)}</div>
                </div>
              )}

              {taxRate > 0 && (
                <div className="flex justify-between items-center text-xs px-2 mt-2">
                  <div className={cn("font-bold uppercase tracking-widest", isDark ? "text-zinc-500" : "text-slate-500")}>PPN ({taxRate}%)</div>
                  <div className={cn("font-black", isDark ? "text-white" : "text-slate-900")}>{formatRupiah(taxAmount)}</div>
                </div>
              )}

              <div className={cn("flex justify-between items-end border-t pt-4 mt-6", isDark ? "border-white/10" : "border-slate-200")}>
                <div>
                  <div className={cn("text-[10px] font-black uppercase tracking-widest mb-1", isDark ? "text-zinc-500" : "text-slate-500")}>Total Payment</div>
                  <div className={cn("text-3xl font-black", isDark ? "text-cyan-400" : "text-cyan-600")}>
                    {formatRupiah(total)}
                  </div>
                </div>
              </div>

              {/* Voucher Code Input */}
              <div className="mt-4">
                <div className={cn("text-[10px] font-black uppercase tracking-widest mb-2", isDark ? "text-zinc-500" : "text-slate-500")}>Voucher Code (Optional)</div>
                {appliedVoucher?.description && (
                  <p className={cn("text-xs leading-relaxed mb-3 p-3 rounded-xl border", isDark ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" : "text-cyan-700 bg-cyan-50 border-cyan-200")}>
                    {appliedVoucher.description}
                  </p>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    placeholder="e.g. DISCOUNT10"
                    disabled={appliedVoucher !== null || isCheckingVoucher}
                    className={cn("flex-1 border rounded-xl px-4 py-3 text-sm focus:outline-none disabled:opacity-50", isDark ? "bg-[#0b1120] border-white/10 text-white focus:border-cyan-500/50" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500")}
                  />
                  {appliedVoucher ? (
                    <button
                      onClick={() => { setAppliedVoucher(null); setVoucherCode(""); }}
                      className={cn("px-4 py-3 rounded-xl border font-bold transition-all text-sm", isDark ? "bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20" : "bg-red-50 hover:bg-red-100 text-red-600 border-red-200")}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleCheckVoucher}
                      disabled={!voucherCode || isCheckingVoucher}
                      className={cn("px-4 py-3 rounded-xl border font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center min-w-[80px]", isDark ? "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-200")}
                    >
                      {isCheckingVoucher ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleTopUp}
              disabled={isProcessing || !selectedMethod || topUpAmount < 50000}
              className={cn(
                "w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg transform",
                isProcessing || !selectedMethod || topUpAmount < 50000
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-none cursor-not-allowed"
                  : "bg-cyan-600 hover:bg-cyan-700 text-white shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)] hover:-translate-y-1"
              )}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Link...
                </>
              ) : (
                <>
                  <Wallet className="w-5 h-5" />
                  Continue to Payment
                </>
              )}
            </button>
            <p className={cn("text-[11px] text-center mt-4 font-medium px-4 leading-relaxed", isDark ? "text-zinc-500" : "text-slate-500")}>
              By continuing, you agree to our terms of service. Funds added to your balance are non-refundable.
            </p>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}