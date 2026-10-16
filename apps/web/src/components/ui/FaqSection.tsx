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
    <section className="py-16 lg:py-24 relative z-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <div className={cn("inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-black tracking-widest uppercase mb-8 shadow-sm", isDark ? "border-cyan-800/80 bg-cyan-950/30 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
            Support
          </div>
          <h2 className={cn("text-4xl md:text-5xl font-black leading-tight", isDark ? "text-white" : "text-slate-900")}>Frequently Asked Questions</h2>
        </div>

        <div className="space-y-6">
          {faqs.map((faq, i) => (
            <details key={i} className={cn("group rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer shadow-xl transition-colors", isDark ? "bg-[#0b1120] backdrop-blur-md border border-cyan-500/20 hover:border-cyan-500/40" : "bg-white border border-cyan-200 hover:border-cyan-400 shadow-sm")}>
              <summary className={cn("flex items-center justify-between gap-4 p-5 sm:p-8 font-bold text-base sm:text-lg md:text-xl select-none list-none group-open:text-cyan-400 transition-colors [&::-webkit-details-marker]:hidden", isDark ? "text-white" : "text-slate-900")}>
                <span className="flex-1 leading-snug">{faq.q}</span>
                <div className={cn("shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition-all", isDark ? "bg-cyan-500/10 border-cyan-500/20 group-open:bg-cyan-500/20 group-open:border-cyan-500/40" : "bg-cyan-50 border-cyan-200 group-open:bg-cyan-100 group-open:border-cyan-300")}>
                  <svg fill="none" height="16" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="16" className="transition-transform duration-300 group-open:rotate-180 sm:w-5 sm:h-5"><path d="M6 9l6 6 6-6"></path></svg>
                </div>
              </summary>
              <div className={cn("px-5 pb-5 sm:px-8 sm:pb-8 pt-0 text-sm sm:text-base md:text-lg leading-relaxed font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
