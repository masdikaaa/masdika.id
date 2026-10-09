"use client";

import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { OpportunityGrid } from "@/components/ui/OpportunityGrid";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { Opportunity } from "@prisma/client";

export function VacanciesContent({ opportunities }: { opportunities: Opportunity[] }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="pt-24 md:pt-32 pb-20 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 min-h-screen">

      <AnimatedSection className="text-center max-w-4xl mx-auto mb-16 pt-10 relative z-10">
        <span className={cn("font-black tracking-[0.2em] text-xs mb-4 inline-block uppercase px-4 py-2 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.15)]", isDark ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20" : "text-cyan-600 bg-cyan-50 border border-cyan-200")}>
          Job Openings
        </span>
        <h1 className={cn("text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black mb-6 tracking-tight leading-[1.1]", isDark ? "text-white" : "text-slate-900")}>
          Top Career <br className="hidden sm:block" />
          <span className={cn("bg-clip-text text-transparent drop-shadow-sm", isDark ? "bg-gradient-to-r from-cyan-400 to-cyan-200" : "bg-gradient-to-r from-cyan-600 to-cyan-400")}>Vacancies</span>
        </h1>
        <p className={cn("text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>
          Discover the latest job vacancies and career opportunities. Curated and shared to help you grow your career.
        </p>
      </AnimatedSection>

      <div className="relative z-10">
        <OpportunityGrid opportunities={opportunities} emptyType="JOBS" />
      </div>
    </div>
  );
}
