"use client";

import { motion, Variants } from "framer-motion";
import { AlertOctagon, Settings, Mail, MessageCircle, ArrowRight } from "lucide-react";

type BlockedScreenProps = {
  isSuspended?: boolean;
  blockTitle: string;
  blockDesc: string;
  blockReasonTitle: string;
  blockReason: string;
};

export default function BlockedScreen({
  isSuspended,
  blockTitle,
  blockDesc,
  blockReasonTitle,
  blockReason,
}: BlockedScreenProps) {
  const colors = isSuspended ? {
    glow: "bg-red-500/20",
    border: "border-red-500/30",
    shadow: "shadow-red-900/30",
    accent: "via-red-500",
    iconBg: "from-red-500/20 to-red-600/30",
    iconText: "text-red-400",
    reasonBorder: "border-red-500/20",
    reasonTitle: "text-red-400",
    badgeBg: "bg-red-500/10",
    badgeText: "text-red-400",
  } : {
    glow: "bg-indigo-500/20",
    border: "border-indigo-500/30",
    shadow: "shadow-indigo-900/30",
    accent: "via-indigo-500",
    iconBg: "from-indigo-500/20 to-indigo-600/30",
    iconText: "text-indigo-400",
    reasonBorder: "border-indigo-500/20",
    reasonTitle: "text-indigo-400",
    badgeBg: "bg-indigo-500/10",
    badgeText: "text-indigo-400",
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="flex min-h-[calc(100vh-5rem)] w-full items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background Animated Orbs */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
          rotate: [0, 90, 0]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] ${colors.glow} rounded-full blur-[100px] pointer-events-none`}
      />

      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="w-full max-w-xl relative z-10"
      >
        <motion.div 
          className={`relative bg-[#0a0f1c]/80 backdrop-blur-xl border ${colors.border} shadow-2xl ${colors.shadow} rounded-3xl p-8 sm:p-12 text-center overflow-hidden`}
        >
          {/* Top animated gradient line */}
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent ${colors.accent} to-transparent`}
          />

          {/* Icon */}
          <motion.div variants={itemVariants} className="flex justify-center mb-8">
            <div className="relative">
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className={`absolute inset-0 ${colors.badgeBg} rounded-full blur-2xl`}
              />
              <div className={`w-20 h-20 bg-gradient-to-br ${colors.iconBg} rounded-2xl flex items-center justify-center relative z-10 border ${colors.border} rotate-3 shadow-xl`}>
                <div className="-rotate-3">
                  {isSuspended ? (
                    <AlertOctagon className={`w-10 h-10 ${colors.iconText}`} />
                  ) : (
                    <Settings className={`w-10 h-10 ${colors.iconText} animate-[spin_4s_linear_infinite]`} />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <div className={`inline-block px-3 py-1 rounded-full ${colors.badgeBg} border ${colors.border} mb-4`}>
              <span className={`text-xs font-bold uppercase tracking-widest ${colors.badgeText}`}>
                {isSuspended ? "Access Denied" : "System Status"}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-4 text-white tracking-tight leading-tight">
              {blockTitle}
            </h1>
          </motion.div>
          
          <motion.p variants={itemVariants} className="text-zinc-400 mb-8 text-sm sm:text-base leading-relaxed max-w-md mx-auto">
            {blockDesc}
          </motion.p>
          
          <motion.div variants={itemVariants} className={`bg-black/40 border ${colors.reasonBorder} rounded-2xl p-5 mb-8 text-left shadow-inner relative overflow-hidden group`}>
            <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent ${colors.accent} to-transparent opacity-50`} />
            <span className={`block text-[11px] font-bold ${colors.reasonTitle} uppercase tracking-widest mb-2 flex items-center gap-2`}>
              {blockReasonTitle}
              <ArrowRight className="w-3 h-3" />
            </span>
            <p className="text-white text-sm sm:text-base font-medium leading-relaxed">{blockReason}</p>
          </motion.div>

          <motion.div variants={itemVariants} className="pt-6 border-t border-white/5">
            <p className="text-sm text-zinc-400 font-medium mb-5">
              Need assistance? Our support team is ready to help.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="mailto:me@masdika.id" className="group flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-semibold rounded-xl transition-all w-full sm:w-auto justify-center hover:scale-105 active:scale-95">
                <Mail className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
                Email Support
              </a>
              <a href="https://wa.me/6282331623374" className="group flex items-center gap-2 px-6 py-3 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 text-[#25D366] hover:text-white text-sm font-semibold rounded-xl transition-all w-full sm:w-auto justify-center hover:scale-105 active:scale-95 shadow-lg shadow-[#25D366]/10">
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </a>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
