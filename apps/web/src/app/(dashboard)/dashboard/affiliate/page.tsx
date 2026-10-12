"use client";

import { useUrlNumber } from "@/lib/useUrlTab";
import { useState, useEffect } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { Users, DollarSign, ArrowUpRight, Copy, Check, Gift, Landmark, Clock, Activity, AlertCircle } from "lucide-react";
import { formatRupiah } from "@/lib/billing";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function AffiliatePage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
  // Pagination State
  const [earningsPage, setEarningsPage] = useUrlNumber("earningsPage", 1);
  const [withdrawalsPage, setWithdrawalsPage] = useUrlNumber("withdrawalsPage", 1);
  
  // Withdraw Modal State
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  const fetchAffiliateData = async (ePage = earningsPage, wPage = withdrawalsPage) => {
    try {
      const res = await fetch(`/api/user/affiliate?earningsPage=${ePage}&withdrawalsPage=${wPage}`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
      } else {
        toast.error(json.error || "Failed to load affiliate data");
      }
    } catch (error) {
      toast.error("Error loading affiliate data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAffiliateData(earningsPage, withdrawalsPage);
  }, [earningsPage, withdrawalsPage]);

  const getReferralLink = () => {
    if (!data?.referralCode) return "";
    return `${window.location.origin}/register?ref=${data.referralCode}`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getReferralLink());
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(withdrawAmount.replace(/[^0-9]/g, ''));
    
    if (amount < 50000) {
      toast.error("Minimum withdrawal amount is Rp 50.000");
      return;
    }
    if (amount > data.affiliateBalance) {
      toast.error("Insufficient balance");
      return;
    }

    setWithdrawing(true);
    try {
      const res = await fetch("/api/user/affiliate/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, bankName, accountNumber, accountName })
      });
      const json = await res.json();
      
      if (res.ok) {
        toast.success("Withdrawal request submitted successfully!");
        setShowWithdraw(false);
        setWithdrawAmount("");
        setBankName("");
        setAccountNumber("");
        setAccountName("");
        fetchAffiliateData();
      } else {
        toast.error(json.error || "Failed to submit withdrawal");
      }
    } catch (error) {
      toast.error("Network error occurred");
    } finally {
      setWithdrawing(false);
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

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse pb-10">
        <div className="h-8 bg-zinc-800/50 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-zinc-800/50 rounded-xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <motion.div className="space-y-6 md:space-y-8 pb-10" variants={containerVariants} initial="hidden" animate="visible">
      {/* Hero Header */}
      <motion.div variants={itemVariants} className={cn("relative overflow-hidden rounded-3xl p-6 md:p-8 shadow-sm group flex flex-col md:flex-row md:items-center justify-between gap-6 border", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        

        <div className="relative z-10 shrink-0">
          <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 tracking-wide border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-100 border-cyan-200 text-cyan-700")}>
            <Gift className="w-3 h-3" /> Partner System
          </div>
          <h1 className={cn("text-3xl md:text-4xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Affiliate <span className={cn(isDark ? "text-cyan-400" : "text-cyan-600")}>Program</span>
          </h1>
          <p className={cn("text-sm max-w-md", isDark ? "text-zinc-400" : "text-slate-500")}>Share your referral link and earn Rp 5.000 for every new VPS purchase made by your invited friends.</p>
        </div>
      </motion.div>

      {/* Referral Link Box */}
      <motion.div 
        variants={itemVariants}
        className={cn("p-6 md:p-8 rounded-3xl flex flex-col md:flex-row items-center gap-4 shadow-md relative overflow-hidden border", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}
      >
        <div className="flex-1 w-full relative z-10">
          <label className={cn("text-xs font-bold uppercase tracking-widest mb-2 block", isDark ? "text-zinc-400" : "text-slate-500")}>Your Referral Link</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input 
              readOnly 
              value={getReferralLink()}
              className={cn("flex-1 w-full border rounded-xl px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 transition-all", isDark ? "bg-[#060b14] border-slate-800 text-zinc-300 focus:border-cyan-500 focus:ring-cyan-500/20" : "bg-slate-50 border-slate-200 text-slate-700 focus:border-cyan-400 focus:ring-cyan-400/20")}
            />
            <button
              onClick={copyToClipboard}
              className={cn("px-6 py-3 w-full sm:w-auto border rounded-xl font-medium transition-colors flex items-center justify-center gap-2", isDark ? "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-200")}
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        <div className={cn("hidden md:flex h-16 w-px mx-4 relative z-10", isDark ? "bg-white/5" : "bg-slate-200")}></div>
        <div className={cn("flex flex-col sm:flex-row items-center gap-4 text-sm w-full md:w-auto relative z-10 p-4 rounded-2xl border", isDark ? "bg-[#060b14] border-slate-800 text-zinc-400" : "bg-slate-50 border-slate-200 text-slate-600")}><AlertCircle className={cn("w-8 h-8 shrink-0", isDark ? "text-cyan-400/50" : "text-cyan-600/50")} />
          <p className="max-w-full sm:max-w-[200px] text-center sm:text-left">Commission of Rp 5.000 is granted once on the new user's first VPS purchase.</p>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          variants={itemVariants}
          className={cn("p-6 md:p-8 rounded-3xl shadow-md relative overflow-hidden group border", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}
        >
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className={cn("p-3 rounded-2xl border", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-600 border-cyan-200")}>
                <Landmark className="w-6 h-6" />
              </div>
              <h3 className={cn("text-sm font-bold uppercase tracking-widest", isDark ? "text-zinc-300" : "text-slate-500")}>Affiliate Balance</h3>
            </div>
            <div className={cn("text-3xl font-bold mb-4 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {formatRupiah(data?.affiliateBalance || 0)}
            </div>
            <button
              onClick={() => setShowWithdraw(true)}
              disabled={data?.affiliateBalance < 50000}
              className={cn("w-full py-3 font-semibold rounded-xl transition-all flex items-center justify-center gap-2", 
                isDark 
                  ? "bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-zinc-500 text-slate-950 shadow-sm hover:shadow disabled:shadow-none" 
                  : "bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-200 disabled:text-slate-400 text-white shadow-sm hover:shadow-md disabled:shadow-none"
              )}
            >
            Withdraw Funds <ArrowUpRight className="w-4 h-4" />
          </button>
            {data?.affiliateBalance < 50000 && (
              <p className={cn("text-xs mt-2 text-center", isDark ? "text-zinc-500" : "text-slate-400")}>Min. Rp 50.000</p>
            )}
          </div>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          className={cn("p-6 md:p-8 rounded-3xl shadow-md relative overflow-hidden group border", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}
        >
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className={cn("p-3 rounded-2xl border", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-600 border-cyan-200")}>
                <Gift className="w-6 h-6" />
              </div>
              <h3 className={cn("text-sm font-bold uppercase tracking-widest", isDark ? "text-zinc-300" : "text-slate-500")}>Total Earned</h3>
            </div>
            <div className={cn("text-3xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {formatRupiah(data?.totalEarned || 0)}
            </div>
            <p className={cn("text-sm mt-2", isDark ? "text-zinc-500" : "text-slate-400")}>Since joined</p>
          </div>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          className={cn("p-6 md:p-8 rounded-3xl shadow-md relative overflow-hidden group border", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}
        >
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className={cn("p-3 rounded-2xl border", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-600 border-cyan-200")}>
                <Users className="w-6 h-6" />
              </div>
              <h3 className={cn("text-sm font-bold uppercase tracking-widest", isDark ? "text-zinc-300" : "text-slate-500")}>Total Referrals</h3>
            </div>
            <div className={cn("text-3xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {data?.totalReferrals || 0}
            </div>
            <p className={cn("text-sm mt-2", isDark ? "text-zinc-500" : "text-slate-400")}>Registered users</p>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Recent Earnings */}
        <motion.div variants={itemVariants} className="flex flex-col h-full">
          <h2 className={cn("text-lg font-bold flex items-center gap-2 mb-4", isDark ? "text-white" : "text-slate-900")}>
            <Activity className="w-5 h-5 text-cyan-600 dark:text-cyan-400" /> Commission History
          </h2>
          <div className={cn("flex-1 border rounded-3xl shadow-md overflow-hidden flex flex-col relative min-h-[300px]", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
            <div className="relative z-10 flex-1 flex flex-col">
              {data?.recentEarnings?.length > 0 ? (
                <div className={cn("divide-y", isDark ? "divide-slate-800/60" : "divide-slate-100")}>
                  {data.recentEarnings.map((earning: any) => (
                    <div key={earning.id} className={cn("p-5 flex flex-col sm:flex-row sm:items-center justify-between transition-colors gap-2", isDark ? "hover:bg-slate-800/40" : "hover:bg-slate-50")}>
                      <div>
                        <p className={cn("font-medium", isDark ? "text-zinc-200" : "text-slate-800")}>{earning.description || "VPS Commission"}</p>
                        <p className={cn("text-xs flex items-center gap-1 mt-1", isDark ? "text-zinc-500" : "text-slate-500")}>
                          <Clock className="w-3 h-3" />
                          {new Date(earning.createdAt).toLocaleString('en-US')}
                        </p>
                      </div>
                      <div className="text-emerald-400 font-bold self-start sm:self-auto bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        +{formatRupiah(earning.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={cn("p-8 text-center flex flex-col items-center justify-center flex-1 min-h-[250px]", isDark ? "text-zinc-500" : "text-slate-500")}>
                  <Activity className={cn("w-12 h-12 mb-4", isDark ? "text-zinc-700" : "text-slate-300")} />
                  No commissions yet. Share your referral link to get started!
                </div>
              )}
            </div>
            
            {data?.earningsPagination && data.earningsPagination.totalPages > 1 && (
              <div className={cn("flex items-center justify-between px-5 py-4 border-t", isDark ? "border-slate-800 bg-[#060b14]" : "border-slate-100 bg-slate-50")}>
                <button 
                  onClick={() => setEarningsPage(p => Math.max(1, p - 1))}
                  disabled={earningsPage === 1}
                  className={cn("px-3 py-1.5 text-sm disabled:opacity-50 transition-colors", isDark ? "text-zinc-400 hover:text-white" : "text-slate-500 hover:text-slate-900")}
                >
                  Previous
                </button>
                <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>
                  Page {earningsPage} of {data.earningsPagination.totalPages}
                </span>
                <button 
                  onClick={() => setEarningsPage(p => Math.min(data.earningsPagination.totalPages, p + 1))}
                  disabled={earningsPage === data.earningsPagination.totalPages}
                  className={cn("px-3 py-1.5 text-sm disabled:opacity-50 transition-colors", isDark ? "text-zinc-400 hover:text-white" : "text-slate-500 hover:text-slate-900")}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Withdrawals */}
        <motion.div variants={itemVariants} className="flex flex-col h-full">
          <h2 className={cn("text-lg font-bold flex items-center gap-2 mb-4", isDark ? "text-white" : "text-slate-900")}>
            <Landmark className="w-5 h-5 text-purple-600 dark:text-purple-400" /> Withdrawal History
          </h2>
          <div className={cn("flex-1 border rounded-3xl shadow-md overflow-hidden flex flex-col relative min-h-[300px]", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
            <div className="relative z-10 flex-1 flex flex-col">
              {data?.recentWithdrawals?.length > 0 ? (
                <div className={cn("divide-y", isDark ? "divide-slate-800/60" : "divide-slate-100")}>
                  {data.recentWithdrawals.map((req: any) => (
                    <div key={req.id} className={cn("p-5 flex flex-col sm:flex-row sm:items-center justify-between transition-colors gap-3", isDark ? "hover:bg-slate-800/40" : "hover:bg-slate-50")}>
                      <div>
                        <p className={cn("font-medium", isDark ? "text-zinc-200" : "text-slate-800")}>{req.bankName} - {req.accountNumber}</p>
                        <p className={cn("text-xs flex items-center gap-1 mt-1", isDark ? "text-zinc-500" : "text-slate-500")}>
                          <Clock className="w-3 h-3" />
                          {new Date(req.createdAt).toLocaleString('en-US')}
                        </p>
                      </div>
                      <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-1 w-full sm:w-auto">
                        <div className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>
                          {formatRupiah(req.amount)}
                        </div>
                        <StatusBadge status={req.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={cn("p-8 text-center flex flex-col items-center justify-center flex-1 min-h-[250px]", isDark ? "text-zinc-500" : "text-slate-500")}>
                  <Landmark className={cn("w-12 h-12 mb-4", isDark ? "text-zinc-700" : "text-slate-300")} />
                  No withdrawal history found.
                </div>
              )}
            </div>
            
            {data?.withdrawalsPagination && data.withdrawalsPagination.totalPages > 1 && (
              <div className={cn("flex items-center justify-between px-5 py-4 border-t", isDark ? "border-slate-800 bg-[#060b14]" : "border-slate-100 bg-slate-50")}>
                <button 
                  onClick={() => setWithdrawalsPage(p => Math.max(1, p - 1))}
                  disabled={withdrawalsPage === 1}
                  className={cn("px-3 py-1.5 text-sm disabled:opacity-50 transition-colors", isDark ? "text-zinc-400 hover:text-white" : "text-slate-500 hover:text-slate-900")}
                >
                  Previous
                </button>
                <span className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>
                  Page {withdrawalsPage} of {data.withdrawalsPagination.totalPages}
                </span>
                <button 
                  onClick={() => setWithdrawalsPage(p => Math.min(data.withdrawalsPagination.totalPages, p + 1))}
                  disabled={withdrawalsPage === data.withdrawalsPagination.totalPages}
                  className={cn("px-3 py-1.5 text-sm disabled:opacity-50 transition-colors", isDark ? "text-zinc-400 hover:text-white" : "text-slate-500 hover:text-slate-900")}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Withdraw Modal */}
      {showWithdraw && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn("border p-6 md:p-8 rounded-3xl max-w-md w-full shadow-2xl relative overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200")}
          >
            <div className="relative z-10">
              <h2 className={cn("text-2xl font-bold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Withdraw Affiliate Funds</h2>
              <p className={cn("text-sm mb-6", isDark ? "text-zinc-400" : "text-slate-500")}>Available Balance: <strong className={cn("", isDark ? "text-white" : "text-slate-900")}>{formatRupiah(data?.affiliateBalance || 0)}</strong></p>

              <form onSubmit={handleWithdraw} className="space-y-4">
                <div>
                  <label className={cn("text-xs font-bold uppercase tracking-widest mb-2 block", isDark ? "text-zinc-400" : "text-slate-500")}>Amount (Min. Rp 50.000)</label>
                  <input
                    type="text"
                    placeholder="50000"
                    value={withdrawAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setWithdrawAmount(val);
                    }}
                    required
                    className={cn("w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-1 transition-all", isDark ? "bg-[#060b14] border-slate-800 text-white focus:border-cyan-500 focus:ring-cyan-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500 focus:ring-cyan-500")}
                  />
                </div>
                <div>
                  <label className={cn("text-xs font-bold uppercase tracking-widest mb-2 block", isDark ? "text-zinc-400" : "text-slate-500")}>Bank / E-Wallet (e.g., BCA, GoPay)</label>
                  <input
                    type="text"
                    placeholder="Bank Name"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    required
                    className={cn("w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-1 transition-all", isDark ? "bg-[#060b14] border-slate-800 text-white focus:border-cyan-500 focus:ring-cyan-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500 focus:ring-cyan-500")}
                  />
                </div>
                <div>
                  <label className={cn("text-xs font-bold uppercase tracking-widest mb-2 block", isDark ? "text-zinc-400" : "text-slate-500")}>Account Number / Phone</label>
                  <input
                    type="text"
                    placeholder="081234..."
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    required
                    className={cn("w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-1 transition-all", isDark ? "bg-[#060b14] border-slate-800 text-white focus:border-cyan-500 focus:ring-cyan-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500 focus:ring-cyan-500")}
                  />
                </div>
                <div>
                  <label className={cn("text-xs font-bold uppercase tracking-widest mb-2 block", isDark ? "text-zinc-400" : "text-slate-500")}>Account Holder Name</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    required
                    className={cn("w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-1 transition-all", isDark ? "bg-[#060b14] border-slate-800 text-white focus:border-cyan-500 focus:ring-cyan-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500 focus:ring-cyan-500")}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowWithdraw(false)}
                    className={cn("flex-1 py-3 border rounded-xl font-medium transition-colors", isDark ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-white" : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-900")}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={withdrawing}
                    className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-sm hover:shadow disabled:shadow-none"
                  >
                    {withdrawing ? "Processing..." : "Withdraw Now"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

    </motion.div>
  );
}