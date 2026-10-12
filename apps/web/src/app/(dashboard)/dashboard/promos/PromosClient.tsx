"use client";

import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { Ticket } from 'lucide-react';
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

  return (
    <div className="space-y-6">
      <div className={cn("relative overflow-hidden rounded-3xl p-6 md:p-8 shadow-sm group flex flex-col md:flex-row md:items-center justify-between gap-6 border", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className="relative z-10 shrink-0">
          <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 tracking-wide border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-500/10 border-cyan-500/20 text-cyan-800")}>
            <Ticket className="w-3 h-3" /> Special Offers
          </div>
          <h1 className={cn("text-3xl md:text-4xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Promo & <span className={cn(isDark ? "text-cyan-400" : "text-cyan-600")}>Rewards</span>
          </h1>
          <p className={cn("text-sm max-w-md", isDark ? "text-zinc-400" : "text-slate-500")}>Discover our latest offers and announcements. Claim free rewards during special events before they expire!</p>
        </div>
      </div>

      {promos.length === 0 ? (
        <div className={cn("border rounded-3xl overflow-hidden shadow-md relative", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="py-20 text-center relative z-10">
            <div className={cn("w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-slate-100 border-slate-200")}>
              <Ticket className={cn("w-8 h-8", isDark ? "text-cyan-400" : "text-cyan-600")} />
            </div>
            <h2 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No Promos Available</h2>
            <p className={isDark ? "text-zinc-400" : "text-slate-500"}>Check back later for exciting new offers!</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {promos.map((promo) => (
              <div key={promo.id} className={cn("rounded-2xl overflow-hidden flex flex-col transition-all hover:-translate-y-1 group relative border", isDark ? "bg-[#0b1322] border-slate-800/80 hover:border-cyan-500/50 shadow-md hover:shadow-lg" : "bg-white border-slate-200 hover:border-cyan-400 shadow-sm hover:shadow-md")}>
                {promo.image ? (
                  <PromoImage src={promo.image} alt={promo.title} />
                ) : (
                  <div className={cn("w-full aspect-[1200/630] bg-gradient-to-br flex items-center justify-center", isDark ? "from-cyan-900/40 to-blue-900/40" : "from-cyan-50 to-blue-50")}>
                    <Ticket className={cn("w-16 h-16", isDark ? "text-cyan-500/30" : "text-cyan-600/30")} />
                  </div>
                )}
                
                <div className="p-6 flex-1 flex flex-col relative z-10">
                  <h2 className={cn("text-xl font-bold mb-3 line-clamp-2 leading-snug", isDark ? "text-white" : "text-slate-900")}>{promo.title}</h2>
                  <p className={cn("text-sm mb-6 flex-1 line-clamp-3 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>{promo.description}</p>
                  
                  <div className={cn("mt-auto pt-4 border-t", isDark ? "border-slate-800" : "border-slate-100")}>
                    {promo.isReward ? (
                      <ClaimRewardButton 
                        promoId={promo.id} 
                        rewardAmount={promo.rewardAmount} 
                        isClaimed={promo.claims.length > 0} 
                        isFullyClaimed={promo.maxClaims > 0 && promo.currentClaims >= promo.maxClaims}
                        validUntil={promo.validUntil}
                      />
                    ) : promo.link ? (
                      <a href={promo.link} target="_blank" rel="noopener noreferrer" className={cn("w-full font-bold py-3 rounded-xl transition-all text-center block text-white shadow-sm", isDark ? "bg-cyan-600 hover:bg-cyan-500" : "bg-cyan-600 hover:bg-cyan-700")}>
                        Learn More
                      </a>
                    ) : (
                      <div className={cn("w-full font-bold py-3 rounded-xl text-center border cursor-not-allowed", isDark ? "bg-[#060b14] text-zinc-500 border-slate-800" : "bg-slate-100 text-slate-500 border-slate-200")}>
                        Information Only
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center pt-8">
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