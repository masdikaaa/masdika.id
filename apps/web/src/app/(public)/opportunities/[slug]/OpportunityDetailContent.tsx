"use client";

import { Calendar, Briefcase, Video, ExternalLink, ArrowLeft, Clock } from "lucide-react";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { ImageZoom } from "@/components/ui/ImageZoom";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { Opportunity } from "@prisma/client";

export function OpportunityDetailContent({ opportunity }: { opportunity: Opportunity }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'EVENT': return <Calendar className="w-5 h-5" />;
      case 'WEBINAR': return <Video className="w-5 h-5" />;
      case 'JOBS': return <Briefcase className="w-5 h-5" />;
      default: return <Calendar className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'EVENT': return isDark ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" : "text-cyan-600 bg-cyan-50 border-cyan-200";
      case 'WEBINAR': return isDark ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" : "text-cyan-600 bg-cyan-50 border-cyan-200";
      case 'JOBS': return isDark ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" : "text-cyan-600 bg-cyan-50 border-cyan-200";
      default: return isDark ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" : "text-cyan-600 bg-cyan-50 border-cyan-200";
    }
  };

  const parseDescription = (text: string | null) => {
    if (!text) return null;

    // Split by URLs, Hashtags (allowing & and - in hashtags), or Emails
    const regex = /(https?:\/\/[^\s]+)|(#[\w&-]+)|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const parts = text.split(regex);

    return parts.map((part, i) => {
      if (!part) return null;
      if (part.startsWith('http')) {
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className={cn("hover:underline", isDark ? "text-cyan-400 hover:text-cyan-300" : "text-cyan-600 hover:text-cyan-500")}>{part}</a>;
      }
      if (part.startsWith('#')) {
        return <span key={i} className={cn("font-medium", isDark ? "text-cyan-400" : "text-cyan-600")}>{part}</span>;
      }
      if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(part)) {
        return <a key={i} href={`mailto:${part}`} className={cn("hover:underline", isDark ? "text-cyan-400 hover:text-cyan-300" : "text-cyan-600 hover:text-cyan-500")}>{part}</a>;
      }
      return part;
    });
  };

  const backLink = opportunity.type === 'JOBS' ? '/vacancies' : opportunity.type === 'EVENT' ? '/events' : '/opportunities';

  return (
    <div className="pt-28 md:pt-32 pb-12 lg:pb-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <AnimatedSection className="mb-8">
        <header className="mb-12 relative">
          {/* Subtle left-aligned glow */}
          <div className={cn("absolute top-1/2 left-0 -translate-y-1/2 w-[300px] h-[300px] md:w-[500px] md:h-[500px] blur-[100px] rounded-full pointer-events-none", isDark ? "bg-cyan-500/10" : "bg-cyan-500/5")} />

          <div className="relative z-10">
            <Link href={backLink} className={cn("inline-flex items-center text-sm font-medium hover:text-white mb-8 transition-colors gap-2 group", isDark ? "text-zinc-400 hover:text-white" : "text-slate-500 hover:text-slate-900")}>
              <div className={cn("w-8 h-8 rounded-full border flex items-center justify-center transition-all", isDark ? "bg-white/5 border-white/10 group-hover:bg-white/10" : "bg-slate-50 border-black/10 group-hover:bg-slate-100 group-hover:border-black/20")}>
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              </div>
              Back to list
            </Link>

            <div className={cn("flex flex-wrap items-center gap-4 text-sm font-medium mb-6", isDark ? "text-zinc-400" : "text-slate-500")}>
              <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border backdrop-blur-md ${getTypeColor(opportunity.type)} ${isDark ? "shadow-[0_0_15px_rgba(255,255,255,0.05)]" : "shadow-sm"}`}>
                {getTypeIcon(opportunity.type)}
                {opportunity.type}
              </span>
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <Clock className="w-4 h-4" />
                Posted {new Date(opportunity.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            <h1 className={cn("text-3xl sm:text-4xl md:text-5xl font-black mb-8 leading-[1.3] drop-shadow-sm break-words", isDark ? "text-white" : "text-slate-900")} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
              {opportunity.title}
            </h1>
          </div>
        </header>

        {opportunity.image && (
          <div className={cn("rounded-3xl border overflow-hidden mb-10", isDark ? "border-transparent" : "border-black/5")}>
            <ImageZoom src={opportunity.image} alt={opportunity.title} hintText="Click to zoom" />
          </div>
        )}

        <div className={cn(
          "backdrop-blur-xl rounded-2xl rounded-tr-[3rem] rounded-bl-[3rem] p-6 sm:p-10 mb-10 border-l-4 relative overflow-hidden transition-colors border",
          isDark 
            ? "bg-gradient-to-br from-[#0b1120]/95 to-[#070b14]/95 border-white/5 border-l-cyan-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.5)]" 
            : "bg-white border-black/5 border-l-cyan-500/40 shadow-xl"
        )}>
          <div className="relative z-10">
            <div className={cn("whitespace-pre-wrap antialiased text-base sm:text-[1.05rem] leading-[1.8] font-medium tracking-wide", isDark ? "text-zinc-200" : "text-slate-700")}>
              {parseDescription(opportunity.description)}
            </div>
          </div>
        </div>

        {opportunity.link && (
          <div className={cn(
            "flex flex-col sm:flex-row items-center gap-6 backdrop-blur-md rounded-2xl rounded-tr-xl rounded-bl-[3rem] rounded-br-md p-8 text-center sm:text-left justify-between relative overflow-hidden group transition-all duration-300 border",
            isDark 
              ? "bg-gradient-to-r from-cyan-950/40 to-[#070b14]/90 border-cyan-500/40 hover:border-cyan-400/80 shadow-[0_10px_30px_rgba(6,182,212,0.15)]"
              : "bg-gradient-to-r from-cyan-50 to-white border-cyan-200 hover:border-cyan-300 shadow-lg"
          )}>
            {/* Hover glow effect for the CTA card */}
            <div className={cn("absolute inset-0 -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out pointer-events-none", isDark ? "bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0" : "bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-cyan-500/0")} />

            <div className="relative z-10">
              <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>Interested in this opportunity?</h3>
              <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-600")}>
                Click the button to view the external registration or application page.
              </p>
            </div>
            <a
              href={opportunity.link}
              target="_blank"
              rel="noopener noreferrer"
              className={cn("inline-flex items-center justify-center px-8 py-4 rounded-xl font-bold transition-all gap-2 w-full sm:w-auto shrink-0", isDark ? "bg-cyan-600 hover:bg-cyan-500 text-white" : "bg-cyan-600 hover:bg-cyan-700 text-white shadow-md")}
            >
              <ExternalLink className="w-5 h-5" />
              Apply / Register Now
            </a>
          </div>
        )}
      </AnimatedSection>
    </div>
  );
}
