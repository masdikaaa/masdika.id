"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Gift, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/billing";
import { useTheme } from "@/components/ThemeProvider";

interface ClaimRewardButtonProps {
  promoId: number;
  rewardAmount: number;
  isClaimed: boolean;
  isFullyClaimed: boolean;
  validUntil: Date | null;
}

export default function ClaimRewardButton({ promoId, rewardAmount, isClaimed, isFullyClaimed, validUntil }: ClaimRewardButtonProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [loading, setLoading] = useState(false);
  const [claimed, setClaimed] = useState(isClaimed);

  const [nowTime, setNowTime] = useState(0);
  useEffect(() => { setNowTime(Date.now()); }, []);

  const isExpired = validUntil ? new Date(validUntil).getTime() < (nowTime || 1700000000000) : false;

  const handleClaim = async () => {
    if (claimed || isFullyClaimed || isExpired || loading) return;
    
    setLoading(true);
    const toastId = toast.loading("Claiming reward...");
    
    try {
      const res = await fetch("/api/user/promos/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promoId })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Reward claimed! ${formatRupiah(rewardAmount)} has been added to your balance.`, { id: toastId });
        setClaimed(true);
        // Dispatch event to update navbar balance
        window.dispatchEvent(new Event('notificationsUpdated'));
      } else {
        toast.error(data.error || "Failed to claim reward", { id: toastId });
      }
    } catch (err) {
      toast.error("An error occurred while claiming", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (claimed) {
    return (
      <div className="w-full bg-cyan-500/10 text-cyan-400 font-semibold py-2.5 rounded-lg text-center border border-cyan-500/20 cursor-default flex items-center justify-center gap-2 text-sm">
        <Check className="w-4 h-4" /> Reward Claimed!
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="w-full bg-rose-500/10 text-rose-400 font-semibold py-2.5 rounded-lg text-center border border-rose-500/20 cursor-default text-sm">
        Promo Expired
      </div>
    );
  }

  if (isFullyClaimed) {
    return (
      <div className={cn("w-full bg-zinc-500/10 font-semibold py-2.5 rounded-lg text-center border border-zinc-500/20 cursor-default text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
        Fully Claimed
      </div>
    );
  }

  return (
    <button
      onClick={handleClaim}
      disabled={loading}
      className="w-full bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 font-semibold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 group shadow-sm text-sm"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          <Gift className="w-4 h-4 group-hover:scale-110 transition-transform" />
          Claim {formatRupiah(rewardAmount)}
        </>
      )}
    </button>
  );
}