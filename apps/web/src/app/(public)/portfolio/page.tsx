"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Grid, Server, Activity, Cloud, Network, Database, ExternalLink, FolderOpen, ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/animations/FadeIn";
import { TiltCard } from "@/components/animations/TiltCard";
import { MagneticButton } from "@/components/animations/MagneticButton";
import { useTheme } from "@/components/ThemeProvider";

const ICONS: Record<string, any> = {
  Grid, Server, Activity, Cloud, Network, Database
};

export default function PortfolioPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [activeFilter, setActiveFilter] = useState("All");
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter]);

  useEffect(() => {
    fetch('/api/portfolio')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setProjects(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const categories = ["All", ...new Set(projects.map(p => p.category?.name || "Uncategorized"))];
  const FILTERS = categories.map(cat => ({
    name: cat as string,
    icon: cat === 'All' ? Grid : (cat === 'Kubernetes' ? Server : (cat === 'DevOps' ? Activity : Cloud))
  }));

  const filteredProjects = activeFilter === "All"
    ? projects
    : projects.filter(p => (p.category?.name || "Uncategorized") === activeFilter);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / itemsPerPage));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProjects = filteredProjects.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="flex flex-col min-h-screen pt-24 md:pt-32 pb-20 bg-transparent relative">


      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center max-w-3xl mx-auto mb-16 pt-10 relative z-10"
        >
          <span className={cn("font-black tracking-[0.2em] text-xs mb-4 inline-block uppercase px-4 py-2 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.15)]", isDark ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20" : "text-cyan-600 bg-cyan-50 border border-cyan-200")}>
            Latest Portfolio
          </span>
          <h1 className={cn("text-4xl sm:text-5xl md:text-7xl font-black mb-6 tracking-tight leading-[1.1]", isDark ? "text-white" : "text-slate-900")}>
            Featured <br className="hidden sm:block" />
            <span className={cn("bg-clip-text text-transparent drop-shadow-sm", isDark ? "bg-gradient-to-r from-cyan-400 to-cyan-400" : "bg-gradient-to-r from-cyan-600 to-cyan-400")}>Case Studies</span>
          </h1>
          <p className={cn("text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>
            A showcase of architectural deployments, cloud migrations, and scalable solutions that drive digital transformation.
          </p>
        </motion.div>

        {/* Filter Pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="flex flex-wrap items-center justify-center gap-3 mb-16 relative z-10"
        >
          {FILTERS.map((filter) => (
            <MagneticButton key={filter.name} intensity={10}>
              <button
                onClick={() => setActiveFilter(filter.name)}
                className={cn(
                  "px-8 py-4 rounded-xl font-bold transition-all flex items-center gap-2 w-fit shrink-0 backdrop-blur-md",
                  activeFilter === filter.name
                    ? (isDark ? "bg-cyan-600 hover:bg-cyan-500 text-white" : "bg-cyan-600 hover:bg-cyan-700 text-white")
                    : (isDark 
                        ? "bg-white/5 text-zinc-400 border border-white/10 hover:text-white hover:bg-white/10 hover:border-white/20" 
                        : "bg-slate-900/5 text-slate-600 border border-slate-900/10 hover:text-slate-900 hover:bg-slate-900/10 hover:border-slate-900/20")
                )}
              >
                <filter.icon className="w-5 h-5" />
                {filter.name}
              </button>
            </MagneticButton>
          ))}
        </motion.div>

        {/* Projects Grid */}
        <div className="relative z-10">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin shadow-[0_0_20px_rgba(6,182,212,0.5)]"></div>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className={cn("text-center py-24 px-6 sm:px-8 rounded-3xl backdrop-blur-sm shadow-2xl border", isDark ? "bg-white/5 border-white/10" : "bg-white border-black/5")}>
              <div className={cn("w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 border", isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-black/5")}>
                <FolderOpen className="w-10 h-10 text-zinc-500" />
              </div>
              <h3 className={cn("text-3xl font-black mb-3 tracking-tight", isDark ? "text-white" : "text-slate-900")}>No projects found</h3>
              <p className={cn("max-w-md mx-auto font-medium text-lg", isDark ? "text-zinc-400" : "text-slate-600")}>Check back later or select a different category to explore my work.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentProjects.map((project, index) => {
                const techList = project.techStack ? project.techStack.split(',').map((t: string) => t.trim()) : [];
                return (
                  <FadeIn key={project.id} delay={index * 0.1} direction="up" className="h-full">
                    <TiltCard intensity={5} className={cn("group flex flex-col rounded-[24px] overflow-hidden transition-all duration-300 h-full shadow-xl border hover:border-cyan-500/40", isDark ? "bg-[#0b1120] border-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.5)]" : "bg-white border-black/5 hover:shadow-xl")}>
                      {/* Image Section */}
                      <div className={cn("relative h-48 sm:h-56 overflow-hidden", isDark ? "bg-black/40" : "bg-slate-100")}>
                        {project.image ? (
                          <Image referrerPolicy="no-referrer"                             src={project.image}
                            alt={project.title}
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            unoptimized={true}
                            className="object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100"
                          />
                        ) : (
                          <div className={cn("w-full h-full flex items-center justify-center font-bold uppercase tracking-widest text-sm", isDark ? "bg-[#111827] text-zinc-700" : "bg-slate-200 text-slate-400")}>No Image</div>
                        )}

                        {/* Gradient Overlay for subtle fade at bottom */}
                        <div className={cn("absolute inset-0 bg-gradient-to-t via-transparent to-transparent opacity-80", isDark ? "from-[#0b1120]" : "from-white")} />

                        {/* Category Badge */}
                        <div className="absolute top-4 left-4 z-10">
                          <span className={cn("backdrop-blur-md border px-3 py-1.5 rounded-full font-medium text-[11px]", isDark ? "bg-black/60 border-white/10 text-zinc-300" : "bg-white/80 border-black/10 text-slate-700 shadow-sm")}>
                            {project.category?.name || "Web Apps"}
                          </span>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className={cn("flex-1 p-6 flex flex-col relative bg-gradient-to-b from-transparent", isDark ? "to-[#050b14]/50" : "to-slate-50/50")}>
                        {/* Tech Stack */}
                        {techList.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {techList.slice(0, 3).map((tech: string, i: number) => (
                              <span key={i} className={cn("px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase border rounded-md", isDark ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" : "text-cyan-600 bg-cyan-50 border-cyan-200")}>
                                {tech}
                              </span>
                            ))}
                          </div>
                        )}

                        <Link href={`/portfolio/${project.slug}`} className="group/link">
                          <h3 className={cn("text-xl sm:text-2xl font-bold mb-3 transition-colors line-clamp-2 leading-snug", isDark ? "text-white group-hover/link:text-cyan-400" : "text-slate-900 group-hover/link:text-cyan-600")}>
                            {project.title}
                          </h3>
                        </Link>

                        <p className={cn("text-sm leading-relaxed mb-6 flex-1 min-h-[4.5rem]", isDark ? "text-zinc-400" : "text-slate-600")}>
                          {(() => {
                            const desc = project.description || "Discover the full case study including architectural decisions, challenges faced, and the technology stack used.";
                            return desc.length > 90 ? desc.substring(0, 90) + '...' : desc;
                          })()}
                        </p>

                        {/* Bottom Section */}
                        <div className={cn("mt-auto pt-5 border-t flex items-center justify-between", isDark ? "border-white/5" : "border-black/5")}>
                          <span className={cn("text-xs font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>
                            {project.client ? `Client: ${project.client}` : 'Case Study'}
                          </span>

                          <Link
                            href={`/portfolio/${project.slug}`}
                            className={cn("flex items-center gap-1.5 text-sm font-bold transition-colors", isDark ? "text-white group-hover:text-cyan-400" : "text-slate-900 group-hover:text-cyan-600")}
                          >
                            Read More
                            <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                          </Link>
                        </div>
                      </div>
                    </TiltCard>
                  </FadeIn>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && totalPages > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.5, ease: "easeOut" }}
              className="flex justify-center items-center gap-3 mt-20"
            >
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={cn("p-3 rounded-xl backdrop-blur-md border disabled:opacity-50 disabled:cursor-not-allowed transition-colors transform-gpu shadow-sm", isDark ? "bg-white/5 border-white/10 hover:bg-white/10 text-white" : "bg-white border-black/10 hover:bg-slate-50 text-slate-900")}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <div className="flex gap-2">
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPage(idx + 1)}
                    className={cn(
                      "w-12 h-12 rounded-xl font-bold text-lg transition-all flex items-center justify-center border",
                      currentPage === idx + 1
                        ? (isDark ? "bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] border-transparent" : "bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] border-transparent")
                        : (isDark ? "bg-white/5 backdrop-blur-md border-white/10 text-zinc-400 hover:text-white hover:bg-white/10" : "bg-white backdrop-blur-md border-black/10 text-slate-600 hover:text-slate-900 hover:bg-slate-50")
                    )}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={cn("p-3 rounded-xl backdrop-blur-md border disabled:opacity-50 disabled:cursor-not-allowed transition-colors transform-gpu shadow-sm", isDark ? "bg-white/5 border-white/10 hover:bg-white/10 text-white" : "bg-white border-black/10 hover:bg-slate-50 text-slate-900")}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
