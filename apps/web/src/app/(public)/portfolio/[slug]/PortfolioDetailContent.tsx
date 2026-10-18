"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { 
  ChevronLeft, 
  ChevronRight,
  CheckCircle2, 
  ExternalLink, 
  LayoutTemplate, 
  Award, 
  Quote, 
  User, 
  ArrowRight,
  Building2,
  Calendar,
  Briefcase,
  FileText,
  AlertCircle,
  Cpu,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { renderMarkdown } from "@/lib/markdown";
import { ImageZoom } from "@/components/ui/ImageZoom";
import { TechIcon } from "@/components/ui/TechIcon";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

function EngineeringRolesScroller({ roles, fallbackRole }: { roles: string[]; fallbackRole: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const startX = useRef(0);
  const scrollStart = useRef(0);
  const isInteracting = useRef(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const hasMore = el.scrollWidth > el.clientWidth + 2;
    setHasOverflow(hasMore);
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    checkScroll();
    const handleResize = () => checkScroll();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [checkScroll, roles]);

  // Gentle auto-sliding ("gerak") when overflowing and idle
  useEffect(() => {
    if (!hasOverflow || isHovered || isDragging) return;
    const el = scrollRef.current;
    if (!el) return;

    let forward = true;
    let animId: number;
    let lastTime = performance.now();
    let isPausedForEnd = false;

    const step = (time: number) => {
      if (isInteracting.current || isHovered || isDragging) return;
      const dt = time - lastTime;
      lastTime = time;

      if (el && !isPausedForEnd) {
        // Smooth ~25px per second
        const speed = 0.025;
        if (forward) {
          el.scrollLeft += speed * dt;
          if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 1) {
            forward = false;
            isPausedForEnd = true;
            setTimeout(() => { isPausedForEnd = false; }, 1800);
          }
        } else {
          el.scrollLeft -= speed * dt;
          if (el.scrollLeft <= 1) {
            forward = true;
            isPausedForEnd = true;
            setTimeout(() => { isPausedForEnd = false; }, 1800);
          }
        }
        checkScroll();
      }
      animId = requestAnimationFrame(step);
    };

    const initialTimer = setTimeout(() => {
      animId = requestAnimationFrame(step);
    }, 1200);

    return () => {
      clearTimeout(initialTimer);
      cancelAnimationFrame(animId);
    };
  }, [hasOverflow, isHovered, isDragging, checkScroll]);

  const handleScrollBtn = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    isInteracting.current = true;
    const amount = 140;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
    setTimeout(() => {
      isInteracting.current = false;
      checkScroll();
    }, 1500);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    setIsDragging(true);
    isInteracting.current = true;
    startX.current = e.pageX - el.offsetLeft;
    scrollStart.current = el.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const el = scrollRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    el.scrollLeft = scrollStart.current - walk;
    checkScroll();
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setTimeout(() => {
      isInteracting.current = false;
      checkScroll();
    }, 2000);
  };

  if (roles.length === 0) {
    return (
      <span className="font-semibold text-xs sm:text-[13px] text-[var(--text-primary)] whitespace-nowrap">
        {fallbackRole}
      </span>
    );
  }

  return (
    <div 
      className="relative group/roles min-w-0 max-w-full overflow-hidden select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        handleMouseUp();
      }}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
    >
      {/* Left Gradient Fade Mask */}
      <div 
        className={cn(
          "absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[var(--surface)] via-[var(--surface)]/80 to-transparent z-10 pointer-events-none transition-opacity duration-200",
          canScrollLeft ? "opacity-100" : "opacity-0"
        )} 
      />

      {/* Left Chevron Button */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => handleScrollBtn("left")}
          aria-label="Scroll roles left"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-5 h-5 rounded-full bg-[var(--surface)] border border-[var(--border-primary)] shadow-md flex items-center justify-center text-cyan-600 dark:text-cyan-400 hover:scale-110 active:scale-95 transition-all opacity-0 group-hover/roles:opacity-100 sm:opacity-90 cursor-pointer"
        >
          <ChevronLeft className="w-3 h-3" />
        </button>
      )}

      {/* Roles Scroll Track */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={cn(
          "flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 px-1",
          hasOverflow ? "cursor-grab active:cursor-grabbing" : "cursor-default"
        )}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {roles.map((r: string, i: number) => (
          <span 
            key={i} 
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 whitespace-nowrap shrink-0 hover:bg-cyan-500/15 hover:border-cyan-500/35 transition-colors shadow-xs"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/80 shrink-0" />
            {r}
          </span>
        ))}
        {/* End spacer for comfortable scroll ending */}
        <div className="w-3 shrink-0 pointer-events-none" />
      </div>

      {/* Right Gradient Fade Mask */}
      <div 
        className={cn(
          "absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[var(--surface)] via-[var(--surface)]/80 to-transparent z-10 pointer-events-none transition-opacity duration-200",
          canScrollRight ? "opacity-100" : "opacity-0"
        )} 
      />

      {/* Right Chevron Button */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => handleScrollBtn("right")}
          aria-label="Scroll roles right"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-5 h-5 rounded-full bg-[var(--surface)] border border-[var(--border-primary)] shadow-md flex items-center justify-center text-cyan-600 dark:text-cyan-400 hover:scale-110 active:scale-95 transition-all opacity-0 group-hover/roles:opacity-100 sm:opacity-90 cursor-pointer"
        >
          <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

export function PortfolioDetailContent({ 
  project, 
  keyResultsParsed, 
  techStackParsed 
}: { 
  project: any;
  keyResultsParsed: Array<{ title: string, desc: string }>;
  techStackParsed: string[];
}) {
  const roles: string[] = project.role 
    ? project.role.split(/[,/|]/).map((r: string) => r.trim()).filter(Boolean)
    : [];

  const cleanTimeline = project.timeline 
    ? project.timeline.replace(/1 Months/i, '1 Month') 
    : "Completed";

  return (
    <div className="pt-24 md:pt-32 pb-20 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      
      {/* Back Navigation Bar */}
      <div className="mb-6 md:mb-8 flex items-center justify-between">
        <Link
          href="/portfolio"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[var(--text-secondary)] hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors group"
        >
          <div className="w-8 h-8 rounded-lg border border-[var(--border-primary)] bg-[var(--surface)] flex items-center justify-center group-hover:border-cyan-500/40 group-hover:bg-cyan-50 dark:group-hover:bg-cyan-950/30 transition-all">
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400" />
          </div>
          <span>Back to Portfolio</span>
        </Link>

        {project.category?.name && (
          <span className="hidden sm:inline-block text-xs font-mono font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Case Study / {project.category.name}
          </span>
        )}
      </div>

      {/* Hero Header */}
      <header className="mb-10 md:mb-16 relative">
        <div className="text-center max-w-4xl mx-auto relative z-10">
          <div className="mb-4 sm:mb-6 flex justify-center">
            <Badge variant="brand" dot dotColor="bg-cyan-400" size="md" className="font-mono uppercase tracking-wider">
              {project.category?.name || "FEATURED CASE STUDY"}
            </Badge>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[68px] font-black tracking-tight leading-[1.08] text-[var(--text-primary)] mb-4 sm:mb-6">
            {project.title.includes(" - ") ? (
              <>
                {project.title.split(" - ")[0]} <br />
                <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-100 bg-clip-text text-transparent">
                  {project.title.split(" - ").slice(1).join(" - ")}
                </span>
              </>
            ) : project.title.includes(" – ") ? (
              <>
                {project.title.split(" – ")[0]} <br />
                <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-100 bg-clip-text text-transparent">
                  {project.title.split(" – ").slice(1).join(" – ")}
                </span>
              </>
            ) : (
              project.title
            )}
          </h1>

          {project.description && (
            <p className="text-base sm:text-lg md:text-xl text-[var(--text-secondary)] font-normal leading-relaxed max-w-2xl mx-auto mb-8 sm:mb-10">
              {project.description}
            </p>
          )}

          {/* Responsive Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 max-w-md sm:max-w-none mx-auto">
            {project.projectUrl && (
              <Button
                variant="primary"
                size="lg"
                href={project.projectUrl}
                target="_blank"
                rel="noopener noreferrer"
                rightIcon={<ExternalLink className="w-4 h-4" />}
                className="w-full sm:w-auto justify-center min-w-[170px]"
              >
                Launch Live Preview
              </Button>
            )}
            <Button
              variant="secondary"
              size="lg"
              href="/contact"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="w-full sm:w-auto justify-center min-w-[170px]"
            >
              Discuss Similar Project
            </Button>
          </div>
        </div>

        {/* Specs Capsule Ribbon (Client, Timeline, Roles) */}
        <div className="max-w-4xl mx-auto mt-8 md:mt-10 relative z-10">
          <div className="p-2 sm:p-2.5 rounded-2xl md:rounded-full border border-[var(--border-primary)] bg-[var(--surface)] shadow-sm">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-0 md:divide-x divide-[var(--border-primary)] px-3 sm:px-6">
              
              {/* 1. Client */}
              <div className="flex items-center gap-3 w-full md:w-auto md:pr-6 shrink-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block leading-tight">
                    Client
                  </span>
                  <span className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] whitespace-nowrap">
                    {project.client || "Personal Project"}
                  </span>
                </div>
              </div>

              {/* 2. Timeline */}
              <div className="flex items-center gap-3 w-full md:w-auto md:px-6 shrink-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block leading-tight">
                    Timeline
                  </span>
                  <span className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] whitespace-nowrap">
                    {cleanTimeline}
                  </span>
                </div>
              </div>

              {/* 3. Engineering Roles */}
              <div className="flex items-center gap-3 w-full md:w-auto md:pl-6 md:pr-4 min-w-0 flex-1 overflow-hidden">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block leading-tight mb-0.5">
                    Engineering Roles
                  </span>
                  <EngineeringRolesScroller roles={roles} fallbackRole={project.role || "Lead Architect"} />
                </div>
              </div>

            </div>
          </div>
        </div>
      </header>

      {/* Hero Showcase Image */}
      {project.image ? (
        <div className="w-full rounded-2xl overflow-hidden shadow-sm border border-[var(--border-primary)] bg-[var(--surface)] relative group mb-8 md:mb-12">
          <ImageZoom src={project.image} alt={project.title} variant="hero" />
        </div>
      ) : (
        <div className="h-[240px] sm:h-[320px] w-full rounded-2xl overflow-hidden relative flex items-center justify-center border border-[var(--border-primary)] bg-[var(--surface)] mb-8 md:mb-12">
          <span className="text-slate-400 dark:text-zinc-500 font-mono text-xs">No Preview Image Available</span>
        </div>
      )}

      {/* Main Grid Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10">
        
        {/* Left Column (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6 sm:gap-7 md:gap-8">
          
          {/* Project Overview */}
          {project.content && (
            <section className="p-6 sm:p-8 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 transition-colors shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                  Project Overview
                </h2>
              </div>
              <div className="portfolio-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(project.content) }} />
            </section>
          )}
          
          {/* The Challenge */}
          {project.challenge && (
            <section className="p-6 sm:p-8 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 transition-colors shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                  The Challenge
                </h2>
              </div>
              <div className="portfolio-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(project.challenge) }} />
            </section>
          )}

          {/* The Solution */}
          {project.solution && (
            <section className="p-6 sm:p-8 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 transition-colors shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                  <Cpu className="w-4 h-4" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                  The Solution
                </h2>
              </div>
              <div className="portfolio-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(project.solution) }} />
            </section>
          )}

          {/* Testimonial */}
          {project.testimonial && (
            <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-6 sm:p-8 hover:border-cyan-500/40 transition-colors shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-4 shrink-0">
                <Quote className="w-4 h-4" />
              </div>
              
              <p className="text-base sm:text-lg leading-relaxed text-[var(--text-secondary)] font-normal italic mb-6">
                "{project.testimonial}"
              </p>

              {project.testimonialAuthor && (
                <div className="flex items-center gap-3 pt-4 border-t border-[var(--border-primary)]">
                  <div className="w-8 h-8 rounded-full border border-[var(--border-primary)] bg-[var(--surface-secondary)] flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <div className="font-bold text-sm sm:text-base text-[var(--text-primary)]">
                      {project.testimonialAuthor}
                    </div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                      Client Testimonial
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Key Results */}
          {keyResultsParsed.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                  Key Results &amp; Impact
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {keyResultsParsed.map((kr, idx) => (
                  <div key={idx} className="flex gap-3 p-4 sm:p-5 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 transition-colors shadow-sm">
                    <CheckCircle2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1">
                      <strong className="font-bold text-sm text-[var(--text-primary)]">{kr.title}</strong>
                      <span className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">{kr.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar Column (4 Cols) */}
        <div className="lg:col-span-4">
          <div className="sticky top-28 space-y-5">
            <div className="p-6 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                    <LayoutTemplate className="w-4 h-4" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold tracking-tight text-[var(--text-primary)]">
                    Tech Stack
                  </h3>
                </div>
                {techStackParsed.length > 0 && (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                    {techStackParsed.length}
                  </span>
                )}
              </div>

              {techStackParsed.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {techStackParsed.map((tech, idx) => (
                    <div key={idx} className="group flex items-center gap-2.5 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] hover:border-cyan-500/40 hover:bg-[var(--surface)] transition-all px-3 py-2.5">
                      <div className="shrink-0 group-hover:scale-110 transition-transform">
                        <TechIcon tech={tech} size={18} />
                      </div>
                      <span className="font-medium text-xs sm:text-[13px] text-[var(--text-primary)]">{tech}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-[var(--text-muted)] p-3 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)]">
                  No specific technologies listed.
                </div>
              )}

              {/* Sidebar CTA Card */}
              <div className="mt-6 pt-5 border-t border-[var(--border-primary)]">
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-500 shrink-0" />
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">
                    Interested in Similar Results?
                  </h4>
                </div>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
                  I can help architect and deploy resilient cloud solutions customized to your business goals.
                </p>
                <Button
                  variant="primary"
                  size="md"
                  href="/contact"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  className="w-full justify-center"
                >
                  Let's Discuss
                </Button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
