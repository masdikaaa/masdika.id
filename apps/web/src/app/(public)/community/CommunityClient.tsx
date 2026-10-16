"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, ExternalLink, Users, Copy } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";


// WhatsApp SVG icon
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// Telegram SVG icon
const TelegramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

// Detect platform from link
function getPlatform(link: string): 'whatsapp' | 'telegram' | 'unknown' {
  if (link.includes('whatsapp.com')) return 'whatsapp';
  if (link.includes('t.me') || link.includes('telegram.me')) return 'telegram';
  return 'unknown';
}


export default function CommunityClient({ initialGroups }: { initialGroups: any[] }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [groups] = useState<any[]>(initialGroups);
  const [visibleCount, setVisibleCount] = useState(8);
  
  // Form state
  const [link, setLink] = useState("");
  const [submitting, setSubmitting] = useState(false);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!link.trim()) return;

    const isWhatsApp = link.startsWith('https://chat.whatsapp.com/');
    const isTelegram = link.startsWith('https://t.me/') || link.startsWith('https://telegram.me/');

    if (!isWhatsApp && !isTelegram) {
      toast.error("Link must be a WhatsApp (chat.whatsapp.com) or Telegram (t.me) group link.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link })
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || "Group submitted successfully!");
        setLink("");
      } else {
        toast.error(data.error || "Failed to submit group");
      }
    } catch (error) {
      toast.error("A system error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-24 md:pt-32 pb-20 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 min-h-screen">
      <svg width="0" height="0" className="absolute">
        <linearGradient id="icon-gradient-community" x1="0%" y1="0%" x2="100%" y2="100%" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22d3ee" offset="0%" />
          <stop stopColor="#3b82f6" offset="50%" />
          <stop stopColor="#8b5cf6" offset="100%" />
        </linearGradient>
      </svg>
        
        {/* Header */}
        <div className="text-center mb-16 relative pt-10">
          <motion.span 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={cn("font-black tracking-[0.2em] text-xs mb-4 inline-block uppercase px-4 py-2 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.15)]", isDark ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20" : "text-cyan-600 bg-cyan-50 border border-cyan-200")}
          >
            Network
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={cn("text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black mb-6 tracking-tight leading-[1.1]", isDark ? "text-white" : "text-slate-900")}
          >
            Developer <br className="hidden sm:block" />
            <span className={cn("text-transparent bg-clip-text drop-shadow-sm", isDark ? "bg-gradient-to-r from-cyan-400 to-cyan-200" : "bg-gradient-to-r from-cyan-600 to-cyan-400")}>Community</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={cn("text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-medium", isDark ? "text-zinc-400" : "text-slate-600")}
          >
            Find and join various WhatsApp & Telegram IT and Developer groups to discuss, learn, and network.
          </motion.p>
        </div>

        {/* Grid of Groups */}
        {groups.length === 0 ? (
          <div className={cn("text-center py-16 px-6 sm:px-8 rounded-3xl border backdrop-blur-sm shadow-xl", isDark ? "bg-[#0d1629] border-slate-700/80 ring-1 ring-white/5 shadow-black/40" : "bg-cyan-50 border-cyan-200")}>
            <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 border relative", isDark ? "bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-cyan-500/10 border-cyan-500/20" : "bg-cyan-100 border-cyan-300")}>
              <Users className="w-10 h-10" style={{ stroke: isDark ? "url(#icon-gradient-community)" : "#0284c7" }} />
            </div>
            <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No groups yet</h3>
            <p className={isDark ? "text-white/50" : "text-slate-500"}>Be the first to share your community group.</p>
          </div>
        ) : (
          <div className="mb-12 lg:mb-16">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {groups.slice(0, visibleCount).map((group, index) => (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  className="group relative flex flex-col items-center p-5 sm:p-6 rounded-3xl overflow-hidden hover:-translate-y-1 transition-transform duration-300"
                >
                  <div className={cn("absolute inset-0 backdrop-blur-sm transition-colors", isDark ? "bg-[#0d1629] group-hover:bg-[#111f38]" : "bg-white group-hover:bg-cyan-50/50")} />
                  {/* Blobs on hover */}
                  <div className={cn("absolute -top-6 -left-6 w-32 h-32 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none", isDark ? "bg-cyan-500/15" : "bg-cyan-500/5")} />
                  <div className={cn("absolute -bottom-6 -right-6 w-32 h-32 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none", isDark ? "bg-cyan-500/15" : "bg-cyan-500/5")} />
                  {/* Shine */}
                  <div className={cn("absolute inset-0 bg-gradient-to-br via-transparent to-transparent pointer-events-none", isDark ? "from-white/[0.05]" : "from-black/[0.02]")} />
                  <div className={cn("absolute inset-0 rounded-3xl border transition-colors duration-300 pointer-events-none", isDark ? "border-slate-700/80 group-hover:border-cyan-500/50 ring-1 ring-white/5 shadow-xl shadow-black/40" : "border-slate-200 group-hover:border-cyan-300 shadow-[0_4px_24px_rgba(0,0,0,0.07)]")} />

                  {/* Avatar */}
                  <div className={cn("relative z-10 w-16 h-16 mb-4 rounded-2xl overflow-hidden border flex items-center justify-center shrink-0", isDark ? "border-white/10 bg-white/5" : "border-black/10 bg-slate-50")}>
                    {group.image ? (
                      <img referrerPolicy="no-referrer" src={group.image} alt={group.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    ) : getPlatform(group.link) === 'whatsapp' ? (
                      <WhatsAppIcon className={cn("h-8 w-8 group-hover:scale-110 transition-transform", isDark ? "text-cyan-400" : "text-cyan-600")} />
                    ) : getPlatform(group.link) === 'telegram' ? (
                      <TelegramIcon className={cn("h-8 w-8 group-hover:scale-110 transition-transform", isDark ? "text-cyan-400" : "text-cyan-600")} />
                    ) : (
                      <svg className={cn("h-7 w-7 group-hover:scale-110 transition-transform", isDark ? "text-cyan-400" : "text-cyan-600")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    )}
                  </div>

                  {/* Name */}
                  <h3 className={cn("relative z-10 font-bold text-center text-sm leading-snug mb-1 flex-1 flex items-center justify-center transition-all", isDark ? "text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-200" : "text-slate-900 group-hover:text-cyan-600")}>
                    {group.name}
                  </h3>
                  
                  {/* Description */}
                  <p className={cn("relative z-10 text-center text-xs mb-4 line-clamp-2", isDark ? "text-zinc-400" : "text-slate-600")}>
                    {group.description || "An active developer community for discussion, learning, and sharing experiences."}
                  </p>

                  {/* Actions */}
                  <div className="relative z-10 mt-auto flex items-center gap-2 w-full">
                    <a
                      href={group.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn("flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-[10px] sm:text-xs font-bold border transition-all flex items-center justify-center gap-1.5 whitespace-nowrap", isDark ? "bg-white/5 text-cyan-400 border-white/10 hover:bg-cyan-500 hover:text-[#011627] hover:border-cyan-500" : "bg-slate-50 text-cyan-600 border-black/10 hover:bg-cyan-600 hover:text-white hover:border-cyan-600 shadow-sm")}
                    >
                      Join Group <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    </a>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        navigator.clipboard.writeText(group.link);
                        toast.success("Link copied to clipboard!");
                      }}
                      className={cn("cursor-pointer p-2 sm:p-2.5 rounded-full border transition-all flex items-center justify-center shrink-0 focus:outline-none", isDark ? "bg-white/5 text-cyan-400 border-white/10 hover:bg-cyan-500 hover:text-[#011627] hover:border-cyan-500" : "bg-slate-50 text-cyan-600 border-black/10 hover:bg-cyan-600 hover:text-white hover:border-cyan-600 shadow-sm")}
                      title="Copy Link"
                    >
                      <Copy className="w-4 h-4 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {visibleCount < groups.length && (
              <div className="mt-12 flex justify-center">
                <button
                  onClick={() => setVisibleCount(prev => prev + 8)}
                  className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-cyan-600 text-white font-bold hover:bg-cyan-500 transition-all gap-2 w-fit shrink-0 shadow-md"
                >
                  Load More
                </button>
              </div>
            )}
          </div>
        )}

        {/* Submit Form Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className={cn("mt-10 pt-16 border-t", isDark ? "border-white/[0.06]" : "border-black/5")}
        >
          <div className="relative w-full flex flex-col md:flex-row items-center md:items-start gap-8 p-8 rounded-3xl overflow-hidden shadow-2xl">
            {/* Glass */}
            <div className={cn("absolute inset-0 backdrop-blur-sm", isDark ? "bg-gradient-to-br from-[#0e172a] to-[#0a1324]" : "bg-white")} />
            <div className={cn("absolute -top-10 -left-10 w-56 h-56 rounded-full blur-3xl pointer-events-none", isDark ? "bg-cyan-500/15" : "bg-cyan-500/5")} />
            <div className={cn("absolute -bottom-10 -right-10 w-56 h-56 rounded-full blur-3xl pointer-events-none", isDark ? "bg-cyan-500/15" : "bg-cyan-500/5")} />
            <div className={cn("absolute inset-0 bg-gradient-to-br via-transparent to-transparent pointer-events-none", isDark ? "from-white/[0.05]" : "from-black/[0.02]")} />
            <div className={cn("absolute inset-0 rounded-3xl border pointer-events-none", isDark ? "border-slate-700/80 ring-1 ring-white/5 shadow-xl shadow-black/40" : "border-transparent")} />

            <div className="relative z-10 flex-1 text-center md:text-left">
              <h2 className={cn("text-2xl font-bold mb-3", isDark ? "bg-gradient-to-r from-cyan-300 via-cyan-400 to-cyan-200 bg-clip-text text-transparent" : "text-slate-900")}>
                Have a Developer Group?
              </h2>
              <p className={cn("text-sm leading-relaxed max-w-xl", isDark ? "text-white/60" : "text-slate-600")}>
                Share your WhatsApp or Telegram developer group to connect with thousands of other tech enthusiasts across our network. Building a strong community helps everyone grow, learn, and collaborate together. All submissions will be carefully reviewed by our admin team before being published to ensure a high-quality environment for all members.
              </p>
            </div>
            
            <div className="relative z-10 w-full md:w-auto md:min-w-[400px]">
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    {(() => {
                      const p = getPlatform(link);
                      if (p === 'whatsapp') return <WhatsAppIcon className={cn("h-5 w-5", isDark ? "text-cyan-400" : "text-cyan-600")} />;
                      if (p === 'telegram') return <TelegramIcon className={cn("h-5 w-5", isDark ? "text-cyan-400" : "text-cyan-600")} />;
                      return (
                        <svg className={cn("h-5 w-5", isDark ? "text-white/40" : "text-slate-400")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        </svg>
                      );
                    })()}
                  </div>
                  <input
                    type="url"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="https://chat.whatsapp.com/... or https://t.me/..."
                    required
                    className={cn(
                      "w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-1 transition-all",
                      isDark 
                        ? "bg-white/[0.04] border-white/[0.08] text-white placeholder-white/30 focus:border-cyan-500/50 focus:ring-cyan-500/50" 
                        : "bg-white border-black/10 text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500 shadow-sm"
                    )}
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting || !link}
                  className="w-full flex items-center justify-center px-8 py-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Submit Group
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </motion.div>

      </div>
  );
}
