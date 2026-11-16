"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { Ticket, Gift, CheckCircle2, RefreshCw } from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';
import PromoImage from './PromoImage';
import ClaimRewardButton from './ClaimRewardButton';

interface PromosClientProps {
  promos: any[];
  totalPages: number;
  currentPage: number;
}

export default function PromosClient({ promos, totalPages, currentPage }: PromosClientProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const rewardCount = promos.filter((p) => p.isReward).length;
  const claimedCount = promos.filter((p) => Array.isArray(p.claims) && p.claims.length > 0).length;

  const handleRefresh = () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Promo &amp; Rewards
            </h1>
            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold border whitespace-nowrap shrink-0", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
              <Ticket className="w-3 h-3 shrink-0" />
              Special Offers
            </span>
          </div>
          <p className={cn("text-xs sm:text-sm font-medium mt-1.5 max-w-2xl leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
            Discover our latest offers and announcements. Claim free rewards during special events before they expire!
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 border cursor-pointer",
              isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
            )}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && (isDark ? "animate-spin text-cyan-400" : "animate-spin text-cyan-600"))} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={cn("rounded-2xl border p-5 transition-all shadow-2xs", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              AVAILABLE PROMOS
            </span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <Ticket className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {promos.length}
            </span>
            <span className={cn("text-xs font-semibold", isDark ? "text-cyan-400" : "text-cyan-600")}>
              Active Offers
            </span>
          </div>
        </div>

        <div className={cn("rounded-2xl border p-5 transition-all shadow-2xs", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              REWARD OFFERS
            </span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {rewardCount}
            </span>
            <span className={cn("text-xs font-semibold", isDark ? "text-cyan-400" : "text-cyan-600")}>
              Claimable
            </span>
          </div>
        </div>

        <div className={cn("rounded-2xl border p-5 transition-all shadow-2xs", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              CLAIMED REWARDS
            </span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700")}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {claimedCount}
            </span>
            <span className={cn("text-xs font-semibold", isDark ? "text-emerald-400" : "text-emerald-600")}>
              Redeemed
            </span>
          </div>
        </div>
      </div>

      {promos.length === 0 ? (
        <div className={cn("border rounded-2xl overflow-hidden relative", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
          <div className="py-16 px-4 text-center relative z-10">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 border", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
              <Ticket className="w-7 h-7" />
            </div>
            <h2 className={cn("text-lg sm:text-xl font-bold mb-1.5", isDark ? "text-white" : "text-slate-900")}>No Promos Available</h2>
            <p className={cn("text-xs sm:text-sm max-w-md mx-auto", isDark ? "text-zinc-400" : "text-slate-500")}>Check back later for exciting new offers and claimable credit rewards!</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {promos.map((promo) => (
              <div key={promo.id} className={cn("rounded-2xl overflow-hidden flex flex-col transition-all hover:-translate-y-0.5 group relative border", isDark ? "bg-[#0a0a0c] border-white/[0.08] hover:border-cyan-500/40" : "bg-white border-slate-200/90 hover:border-cyan-400 shadow-2xs")}>
                {promo.image ? (
                  <PromoImage src={promo.image} alt={promo.title} />
                ) : (
                  <div className={cn("w-full aspect-[1200/630] bg-gradient-to-br flex items-center justify-center", isDark ? "from-cyan-900/30 to-blue-900/30" : "from-cyan-50 to-blue-50")}>
                    <Ticket className={cn("w-14 h-14", isDark ? "text-cyan-500/30" : "text-cyan-600/30")} />
                  </div>
                )}
                
                <div className="p-5 sm:p-6 flex-1 flex flex-col relative z-10">
                  <h2 className={cn("text-lg sm:text-xl font-bold mb-2.5 line-clamp-2 leading-snug", isDark ? "text-white" : "text-slate-900")}>{promo.title}</h2>
                  <p className={cn("text-xs sm:text-sm mb-5 flex-1 line-clamp-3 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>{promo.description}</p>
                  
                  <div className={cn("mt-auto pt-4 border-t", isDark ? "border-white/[0.08]" : "border-slate-200/90")}>
                    {promo.isReward ? (
                      <ClaimRewardButton 
                        promoId={promo.id} 
                        rewardAmount={promo.rewardAmount} 
                        isClaimed={promo.claims.length > 0} 
                        isFullyClaimed={promo.maxClaims > 0 && promo.currentClaims >= promo.maxClaims}
                        validUntil={promo.validUntil}
                      />
                    ) : promo.link ? (
                      <a href={promo.link} target="_blank" rel="noopener noreferrer" className="w-full font-bold px-3.5 py-2 rounded-xl transition-all text-center block text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 shadow-2xs text-xs sm:text-xs">
                        Learn More
                      </a>
                    ) : (
                      <div className={cn("w-full font-semibold px-3.5 py-2 rounded-xl text-center border cursor-not-allowed text-xs sm:text-xs", isDark ? "bg-[#111115] text-zinc-500 border-white/[0.08]" : "bg-slate-50/80 text-slate-500 border-slate-200/90")}>
                        Information Only
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center pt-6">
              <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                baseUrl="/dashboard/promos"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}