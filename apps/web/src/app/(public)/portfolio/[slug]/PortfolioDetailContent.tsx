"use client";

import { ChevronLeft, CheckCircle2, ExternalLink, LayoutTemplate, Award, Quote, User } from "lucide-react";
import Link from "next/link";
import { renderMarkdown } from "@/lib/markdown";
import { ImageZoom } from "@/components/ui/ImageZoom";
import { TechIcon } from "@/components/ui/TechIcon";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

export function PortfolioDetailContent({ 
  project, 
  keyResultsParsed, 
  techStackParsed 
}: { 
  project: any;
  keyResultsParsed: Array<{ title: string, desc: string }>;
  techStackParsed: string[];
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const proseClass = cn(
    "prose prose-lg max-w-none prose-a:no-underline hover:prose-a:underline prose-img:rounded-2xl prose-img:border prose-ul:list-disc prose-ol:list-decimal",
    "prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none",
    isDark 
      ? "prose-invert prose-headings:text-white prose-a:text-cyan-400 prose-img:border-white/10 prose-li:text-zinc-300 prose-strong:text-white prose-code:text-cyan-300 prose-code:bg-white/5" 
      : "prose-headings:text-slate-900 prose-a:text-cyan-600 prose-img:border-black/10 prose-li:text-slate-600 prose-strong:text-slate-900 prose-code:text-cyan-600 prose-code:bg-slate-100 prose-p:text-slate-600"
  );

  return (
    <div className="pt-24 md:pt-32 pb-20 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      
      {/* Hero Section */}
      <header className="mb-16 md:mb-24 pt-10 relative">
        {/* Cinematic Background Glow */}
        <div className={cn("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[600px] md:h-[600px] blur-[100px] md:blur-[120px] rounded-full pointer-events-none", isDark ? "bg-cyan-500/20" : "bg-cyan-500/10")} />
        
        <div className="text-center max-w-5xl mx-auto relative z-10">
          <span className={cn("font-black tracking-[0.2em] text-xs mb-8 inline-flex items-center gap-2 uppercase px-5 py-2.5 rounded-full shadow-[0_0_20px_rgba(34,211,238,0.2)] backdrop-blur-md", isDark ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/30" : "text-cyan-600 bg-cyan-50 border border-cyan-200")}>
            <Award className="w-4 h-4" />
            {project.category?.name || "Portfolio Detail"}
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-8 tracking-tight leading-[1.1]">
            <span className={cn("text-transparent bg-clip-text drop-shadow-sm", isDark ? "bg-gradient-to-br from-cyan-400 to-cyan-200" : "bg-gradient-to-br from-cyan-600 to-cyan-400")}>{project.title}</span>
          </h1>
        </div>

        {/* Floating Meta Bar */}
        <div className="max-w-4xl mx-auto mt-12 md:mt-16 relative z-10">
          <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-0 p-2 md:p-3 rounded-3xl md:rounded-[2.5rem] backdrop-blur-sm shadow-2xl relative overflow-hidden", isDark ? "bg-white/[0.03] border border-white/10" : "bg-white border border-black/5")}>
            <div className={cn("absolute inset-0 mix-blend-overlay", isDark ? "bg-gradient-to-r from-cyan-500/10 via-cyan-500/5 to-cyan-500/10" : "bg-gradient-to-r from-cyan-500/5 via-cyan-500/0 to-cyan-500/5")} />
            
            <div className={cn("flex flex-col gap-1 p-6 md:px-8 border-b md:border-b-0 md:border-r relative group", isDark ? "border-white/10" : "border-black/5")}>
              <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl md:rounded-l-[2rem] md:rounded-r-none", isDark ? "bg-white/5" : "bg-black/5")} />
              <h4 className={cn("font-bold uppercase tracking-widest text-[10px] mb-1", isDark ? "text-cyan-400" : "text-cyan-600")}>Client</h4>
              <p className={cn("font-bold text-base md:text-lg", isDark ? "text-white" : "text-slate-900")}>{project.client || "N/A"}</p>
            </div>
            
            <div className={cn("flex flex-col gap-1 p-6 md:px-8 border-b md:border-b-0 md:border-r relative group", isDark ? "border-white/10" : "border-black/5")}>
              <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl md:rounded-none", isDark ? "bg-white/5" : "bg-black/5")} />
              <h4 className={cn("font-bold uppercase tracking-widest text-[10px] mb-1", isDark ? "text-cyan-400" : "text-cyan-600")}>Timeline</h4>
              <p className={cn("font-bold text-base md:text-lg", isDark ? "text-white" : "text-slate-900")}>{project.timeline || "N/A"}</p>
            </div>
            
            <div className="flex flex-col gap-1 p-6 md:px-8 relative group">
              <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl md:rounded-r-[2rem] md:rounded-l-none", isDark ? "bg-white/5" : "bg-black/5")} />
              <h4 className={cn("font-bold uppercase tracking-widest text-[10px] mb-1", isDark ? "text-cyan-400" : "text-cyan-600")}>Role</h4>
              <p className={cn("font-bold text-base md:text-lg leading-tight", isDark ? "text-white" : "text-slate-900")}>{project.role || "N/A"}</p>
            </div>
          </div>
        </div>

        {project.projectUrl && (
          <div className="mt-12 md:mt-16 text-center relative z-10">
            <a
              href={project.projectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 px-10 py-5 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-black rounded-full transition-all duration-300 group transform hover:-translate-y-1"
            >
              <ExternalLink className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              Launch Live Preview
            </a>
          </div>
        )}
      </header>

      {project.image ? (
        <div className={cn("w-full rounded-3xl overflow-hidden shadow-2xl relative group mb-16 md:mb-24 border", isDark ? "border-white/10" : "border-black/5")}>
          <div className="absolute inset-0 bg-cyan-500/10 mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 pointer-events-none" />
          <ImageZoom src={project.image} alt={project.title} variant="hero" />
        </div>
      ) : (
        <div className={cn("h-[400px] md:h-[600px] w-full rounded-3xl overflow-hidden relative flex items-center justify-center backdrop-blur-sm mb-16 md:mb-24 border", isDark ? "bg-black/40 border-white/5" : "bg-slate-100 border-black/5")}>
          <span className="text-zinc-600 font-mono text-xl">No Project Image</span>
        </div>
      )}

      {/* Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
        
        {/* Main Content */}
        <div className="lg:col-span-8 flex flex-col gap-12">
          
          {project.content && (
            <section className={cn("p-8 md:p-10 rounded-3xl relative overflow-hidden group transition-all border", isDark ? "bg-[#0d1629] border-slate-700/80 hover:border-cyan-500/40 shadow-xl shadow-black/40 ring-1 ring-white/5" : "bg-white border-slate-200 hover:border-cyan-500/30 hover:shadow-xl")}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-colors duration-500" />
              <h2 className={cn("text-3xl font-black tracking-tight mb-6", isDark ? "text-white" : "text-slate-900")}>Project Overview</h2>
              <div className={`${proseClass} relative z-10`} dangerouslySetInnerHTML={{ __html: renderMarkdown(project.content) }} />
            </section>
          )}
          
          {project.challenge && (
            <section className={cn("p-8 md:p-10 rounded-3xl relative overflow-hidden group transition-all border", isDark ? "bg-[#0d1629] border-slate-700/80 hover:border-cyan-500/40 shadow-xl shadow-black/40 ring-1 ring-white/5" : "bg-white border-slate-200 hover:border-cyan-500/30 hover:shadow-xl")}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-colors duration-500" />
              <h2 className={cn("text-3xl font-black tracking-tight mb-6", isDark ? "text-white" : "text-slate-900")}>The Challenge</h2>
              <div className={`${proseClass} relative z-10`} dangerouslySetInnerHTML={{ __html: renderMarkdown(project.challenge) }} />
            </section>
          )}

          {project.solution && (
            <section className={cn("p-8 md:p-10 rounded-3xl relative overflow-hidden group transition-all border", isDark ? "bg-[#0d1629] border-slate-700/80 hover:border-cyan-500/40 shadow-xl shadow-black/40 ring-1 ring-white/5" : "bg-white border-slate-200 hover:border-cyan-500/30 hover:shadow-xl")}>
               <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-colors duration-500" />
              <h2 className={cn("text-3xl font-black tracking-tight mb-6", isDark ? "text-white" : "text-slate-900")}>The Solution</h2>
              <div className={`${proseClass} relative z-10`} dangerouslySetInnerHTML={{ __html: renderMarkdown(project.solution) }} />
            </section>
          )}

          {project.testimonial && (
            <div className="relative my-10 rounded-3xl overflow-hidden group hover:scale-[1.01] transition-transform duration-500 shadow-xl">
              {/* Premium Background */}
              <div className={cn("absolute inset-0 backdrop-blur-md", isDark ? "bg-gradient-to-br from-[#0b1120] to-[#070d18]" : "bg-gradient-to-br from-cyan-50 via-white to-cyan-50/50")} />
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              
              {/* Elegant Border */}
              <div className={cn("absolute inset-0 rounded-3xl border transition-colors duration-500", isDark ? "border-slate-700/80 group-hover:border-cyan-500/40" : "border-slate-200 group-hover:border-cyan-500/30")} />
              
              {/* Top Accent Line */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative z-10 p-8 md:p-12">
                {/* Quote Icon Header */}
                <div className="mb-8">
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500", isDark ? "bg-gradient-to-br from-cyan-400/10 to-cyan-500/10 border border-cyan-400/20 shadow-[0_0_20px_rgba(34,211,238,0.1)] group-hover:border-cyan-400/40 group-hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]" : "bg-cyan-50 border border-cyan-200 group-hover:border-cyan-300 group-hover:shadow-[0_0_20px_rgba(34,211,238,0.1)]")}>
                    <Quote className={cn("w-6 h-6", isDark ? "text-cyan-400" : "text-cyan-600")} />
                  </div>
                </div>
                
                {/* The Quote */}
                <div className="relative">
                  <p className={cn("text-xl md:text-2xl leading-relaxed md:leading-[1.7] font-light", isDark ? "text-white/90" : "text-slate-800")}>
                    "{project.testimonial}"
                  </p>
                </div>
                
                {/* Author Info */}
                {project.testimonialAuthor && (
                  <div className="mt-10 flex items-center gap-4">
                    <div className={cn("w-12 h-12 rounded-full border flex items-center justify-center shrink-0", isDark ? "bg-gradient-to-br from-white/10 to-white/5 border-white/10" : "bg-white border-black/10 shadow-sm")}>
                      <User className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                    </div>
                    <div>
                      <div className={cn("font-bold tracking-wide", isDark ? "text-white" : "text-slate-900")}>
                        {project.testimonialAuthor}
                      </div>
                      <div className={cn("text-sm font-medium tracking-wide uppercase mt-0.5", isDark ? "text-cyan-500/80" : "text-cyan-600")}>
                        Client Testimonial
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {keyResultsParsed.length > 0 && (
            <section>
              <div className="flex items-center gap-4 mb-8">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border", isDark ? "bg-cyan-500/10 border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.1)]" : "bg-cyan-50 border-cyan-200")}>
                  <Award className={cn("w-7 h-7", isDark ? "text-cyan-400" : "text-cyan-600")} />
                </div>
                <h2 className={cn("text-3xl md:text-4xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>Key Results</h2>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none pl-0">
                {keyResultsParsed.map((kr, idx) => (
                  <li key={idx} className={cn("flex gap-4 p-6 rounded-2xl border transition-colors", isDark ? "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10" : "bg-white border-black/5 hover:border-cyan-500/20 shadow-sm")}>
                    <CheckCircle2 className={cn("w-6 h-6 shrink-0", isDark ? "text-cyan-400" : "text-cyan-600")} />
                    <div className="flex flex-col gap-1">
                      <strong className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>{kr.title}</strong>
                      <span className={cn("text-sm leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>{kr.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4">
          <div className={cn("sticky top-32 p-8 rounded-3xl relative overflow-hidden border", isDark ? "bg-[#0d1629] border-slate-700/80 shadow-xl shadow-black/40 ring-1 ring-white/5" : "bg-white border-slate-200 shadow-xl")}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl" />
            <h3 className={cn("text-xl font-black mb-8 tracking-tight flex items-center gap-3 relative z-10", isDark ? "text-white" : "text-slate-900")}>
              <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                <LayoutTemplate className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-600")} />
              </span>
              Tech Stack
            </h3>
            {techStackParsed.length > 0 ? (
              <div className="flex flex-col gap-3 relative z-10">
                {techStackParsed.map((tech, idx) => (
                  <div key={idx} className={cn("group flex items-center gap-4 rounded-2xl border transition-all duration-300 px-5 py-4", isDark ? "bg-white/5 border-white/5 hover:border-cyan-500/30 hover:bg-white/10" : "bg-slate-50 border-black/5 hover:border-cyan-500/30 hover:bg-white")}>
                    <div className="shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                      <TechIcon tech={tech} size={28} />
                    </div>
                    <span className={cn("font-bold text-sm transition-colors", isDark ? "text-zinc-300 group-hover:text-white" : "text-slate-600 group-hover:text-slate-900")}>{tech}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={cn("text-sm font-medium px-4 py-3 rounded-xl border relative z-10", isDark ? "text-zinc-500 bg-white/5 border-white/10" : "text-slate-500 bg-slate-50 border-black/5")}>No tech stack specified.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
