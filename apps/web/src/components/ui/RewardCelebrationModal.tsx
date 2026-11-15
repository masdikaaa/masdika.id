"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, TicketPercent, Sparkles, CheckCircle2, X, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/billing";
import { useTheme } from "@/components/ThemeProvider";

export interface RewardCelebrationModalProps {
  open: boolean;
  onClose: () => void;
  mode: "reward" | "voucher";
  amount?: number;
  discountPercent?: number;
  voucherCode?: string;
  title?: string;
  subtitle?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vRot: number;
  shape: "rect" | "circle" | "star";
  alpha: number;
}

const MASDIKA_PARTICLE_COLORS = [
  "#00d4ff", // Masdika primary cyan
  "#22d3ee", // Cyan 400
  "#38bdf8", // Sky 400
  "#10b981", // Emerald 500
  "#fbbf24", // Gold coin accent
  "#ffffff", // Crisp white sparkle
];

export default function RewardCelebrationModal({
  open,
  onClose,
  mode,
  amount = 0,
  discountPercent = 0,
  voucherCode = "",
  title,
  subtitle,
}: RewardCelebrationModalProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [displayAmount, setDisplayAmount] = useState(0);

  // Fast Shopee-style count-up animation for reward amount
  useEffect(() => {
    if (!open || mode !== "reward" || amount <= 0) {
      setDisplayAmount(amount);
      return;
    }

    let rafId = 0;
    const duration = 650;
    const startTime = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayAmount(Math.round(amount * eased));
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [open, mode, amount]);

  // Canvas confetti + coin sparkle burst
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const particles: Particle[] = Array.from({ length: 95 }, (_, idx) => {
      const angle = (Math.PI * 2 * idx) / 95 + (Math.random() - 0.5) * 0.4;
      const speed = 5 + Math.random() * 11;
      const shapes: Array<"rect" | "circle" | "star"> = ["rect", "circle", "star"];
      return {
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3.5,
        size: 5 + Math.random() * 7,
        color: MASDIKA_PARTICLE_COLORS[idx % MASDIKA_PARTICLE_COLORS.length],
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.25,
        shape: shapes[idx % shapes.length],
        alpha: 1,
      };
    });

    let rafId = 0;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let aliveCount = 0;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.26; // Gravity
        p.vx *= 0.985; // Air drag
        p.rotation += p.vRot;
        p.alpha = Math.max(0, p.alpha - 0.0085);

        if (p.alpha <= 0.01) continue;
        aliveCount++;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;

        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
        } else if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2.2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // 4-point sparkle star
          const r = p.size / 1.5;
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            const a = (i * Math.PI) / 2;
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            ctx.lineTo(Math.cos(a + Math.PI / 4) * (r * 0.35), Math.sin(a + Math.PI / 4) * (r * 0.35));
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      if (aliveCount > 0) {
        rafId = requestAnimationFrame(render);
      }
    };

    rafId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, [open]);

  const heading =
    title ||
    (mode === "reward" ? "Reward Claimed Successfully!" : "Voucher Applied Successfully!");
  const description =
    subtitle ||
    (mode === "reward"
      ? "The reward credit has been automatically added to your Masdika wallet balance."
      : "Your voucher discount has been applied to this transaction.");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
        >
          {/* Fullscreen Confetti & Sparkle Burst Canvas */}
          <canvas
            ref={canvasRef}
            className="pointer-events-none fixed inset-0 z-[121]"
          />

          {/* Celebration Modal Card */}
          <motion.div
            initial={{ scale: 0.65, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 360, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "relative z-[122] w-full max-w-sm rounded-3xl border p-6 sm:p-7 text-center overflow-hidden shadow-2xl",
              isDark
                ? "bg-[#090d16] border-cyan-500/35 shadow-[0_0_70px_-15px_rgba(0,212,255,0.45)]"
                : "bg-white border-cyan-400/50 shadow-[0_20px_60px_-15px_rgba(6,182,212,0.35)]"
            )}
          >
            {/* Rotating Shopee-style Sunburst Rays in Masdika Cyan */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 16, ease: "linear" }}
              className="pointer-events-none absolute -top-28 left-1/2 -translate-x-1/2 w-[360px] h-[360px] opacity-40"
              style={{
                background:
                  "conic-gradient(from 0deg, transparent 0deg 18deg, rgba(0,212,255,0.22) 18deg 36deg, transparent 36deg 54deg, rgba(16,185,129,0.16) 54deg 72deg, transparent 72deg 90deg, rgba(0,212,255,0.22) 90deg 108deg, transparent 108deg 126deg, rgba(56,189,248,0.18) 126deg 144deg, transparent 144deg 180deg, rgba(0,212,255,0.22) 180deg 198deg, transparent 198deg 216deg, rgba(16,185,129,0.16) 216deg 234deg, transparent 234deg 252deg, rgba(0,212,255,0.22) 252deg 270deg, transparent 270deg 306deg, rgba(56,189,248,0.18) 306deg 324deg, transparent 324deg 360deg)",
                maskImage: "radial-gradient(circle, black 10%, transparent 68%)",
                WebkitMaskImage: "radial-gradient(circle, black 10%, transparent 68%)",
              }}
            />

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close celebration modal"
              className={cn(
                "absolute top-4 right-4 p-1.5 rounded-full transition-colors z-10",
                isDark ? "text-zinc-400 hover:text-white hover:bg-white/10" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              )}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Top Pill */}
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="relative z-10 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 mb-5"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              {mode === "reward" ? "Reward Claimed" : "Voucher Activated"}
            </motion.div>

            {/* Center Bouncing Hero Icon with Pulse Rings */}
            <div className="relative z-10 mx-auto w-24 h-24 mb-5 flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.35, 1], opacity: [0.55, 0, 0.55] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full border-2 border-cyan-400/50"
              />
              <motion.div
                animate={{ scale: [1, 1.6, 1], opacity: [0.35, 0, 0.35] }}
                transition={{ repeat: Infinity, duration: 2, delay: 0.35, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full border border-emerald-400/40"
              />
              <motion.div
                initial={{ scale: 0, rotate: -25 }}
                animate={{ scale: [0, 1.18, 1], rotate: [0, 8, -5, 0] }}
                transition={{ duration: 0.55, ease: "easeOut" }}
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400 via-cyan-500 to-emerald-400 p-[2px] shadow-[0_0_35px_rgba(0,212,255,0.55)]"
              >
                <div className={cn("w-full h-full rounded-[14px] flex items-center justify-center", isDark ? "bg-[#0b1322]" : "bg-slate-950")}>
                  {mode === "reward" ? (
                    <Gift className="w-10 h-10 text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
                  ) : (
                    <TicketPercent className="w-10 h-10 text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
                  )}
                </div>
              </motion.div>

              {/* Floating mini coin/sparkle accents */}
              <motion.div
                animate={{ y: [-4, 4, -4], rotate: [0, 12, 0] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-lg"
              >
                <Coins className="w-3.5 h-3.5" />
              </motion.div>
            </div>

            {/* Title & Highlight Value */}
            <motion.h3
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
              className={cn("relative z-10 text-lg font-extrabold tracking-tight mb-2", isDark ? "text-white" : "text-slate-900")}
            >
              {heading}
            </motion.h3>

            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 18 }}
              className="relative z-10 my-3 py-3 px-4 rounded-2xl border border-cyan-500/25 bg-gradient-to-r from-cyan-500/10 via-emerald-500/10 to-cyan-500/10"
            >
              {mode === "reward" ? (
                <div className="text-3xl font-black font-mono tracking-tight bg-gradient-to-r from-cyan-300 via-white to-emerald-300 bg-clip-text text-transparent">
                  +{formatRupiah(displayAmount)}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <div className="text-2xl font-black tracking-tight bg-gradient-to-r from-cyan-300 via-white to-emerald-300 bg-clip-text text-transparent">
                    {discountPercent}% OFF
                  </div>
                  {voucherCode && (
                    <span className="text-xs font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      {voucherCode}
                    </span>
                  )}
                </div>
              )}
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.26 }}
              className={cn("relative z-10 text-xs leading-relaxed mb-6", isDark ? "text-zinc-400" : "text-slate-600")}
            >
              {description}
            </motion.p>

            {/* Primary CTA Button */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={onClose}
              className="relative z-10 w-full py-3 px-5 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-[0_8px_25px_-6px_rgba(0,212,255,0.6)] transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Awesome, Continue!
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
