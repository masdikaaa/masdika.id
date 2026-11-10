import React from 'react';
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

interface FaqItem {
  q: string;
  a: string;
}

interface FaqSectionProps {
  faqs: FaqItem[];
}

export function FaqSection({ faqs }: FaqSectionProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <section className="py-10 sm:py-14 relative z-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-12">
          <div className={cn("inline-flex items-center gap-2 px-3.5 py-1 rounded-full border text-[11px] font-bold tracking-widest uppercase mb-5 shadow-xs", isDark ? "border-cyan-800/80 bg-cyan-950/30 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
            Support
          </div>
          <h2 className={cn("text-3xl sm:text-4xl lg:text-5xl font-black leading-tight", isDark ? "text-white" : "text-slate-900")}>Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4 sm:space-y-5">
          {faqs.map((faq, i) => (
            <details key={i} className={cn("group rounded-2xl overflow-hidden cursor-pointer shadow-md transition-colors", isDark ? "bg-[var(--surface)] backdrop-blur-md border border-[var(--border-primary)] hover:border-cyan-500/50 shadow-black/40" : "bg-white border border-cyan-200 hover:border-cyan-400 shadow-sm")}>
              <summary className={cn("flex items-center justify-between gap-4 p-5 sm:p-6 font-bold text-base sm:text-lg select-none list-none group-open:text-cyan-400 transition-colors [&::-webkit-details-marker]:hidden", isDark ? "text-white" : "text-slate-900")}>
                <span className="flex-1 leading-snug">{faq.q}</span>
                <div className={cn("shrink-0 w-8 h-8 rounded-full border flex items-center justify-center transition-all", isDark ? "bg-cyan-500/10 border-cyan-500/20 group-open:bg-cyan-500/20 group-open:border-cyan-500/40" : "bg-cyan-50 border-cyan-200 group-open:bg-cyan-100 group-open:border-cyan-300")}>
                  <svg fill="none" height="14" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="14" className="transition-transform duration-300 group-open:rotate-180"><path d="M6 9l6 6 6-6"></path></svg>
                </div>
              </summary>
              <div className={cn("px-5 pb-5 sm:px-6 sm:pb-6 pt-0 text-sm sm:text-base leading-relaxed font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
