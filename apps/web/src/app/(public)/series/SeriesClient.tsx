"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  GraduationCap, 
  ArrowRight, 
  Search, 
  Calendar, 
  Play, 
  ChevronRight, 
  X, 
  Server, 
  Layers, 
  Terminal, 
  ShieldCheck, 
  Zap,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HeroAvatarFrame } from "@/components/ui/HeroAvatarFrame";
import { cn } from "@/lib/utils";

export interface SeriesEpisode {
  id: number;
  slug: string;
  title: string;
  order?: number;
}

export interface SeriesItem {
  id: number;
  slug: string;
  title: string;
  description: string;
  image?: string | null;
  level: string;
  tags?: string | null;
  published: boolean;
  createdAt: string | Date;
  updatedAt?: string | Date;
  episodes?: SeriesEpisode[];
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } }
};

function SeriesThumbnail({ src, alt }: { src?: string | null; alt: string }) {
  const [imgError, setImgError] = useState(false);
  const finalSrc = !imgError && src ? src : "/list-episodes.webp";

  return (
    <Image
      src={finalSrc}
      alt={alt}
      fill
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      onError={() => setImgError(true)}
      className="object-cover group-hover:scale-105 transition-transform duration-700 brightness-95 group-hover:brightness-100"
    />
  );
}

export default function SeriesClient({ initialSeries = [] }: { initialSeries?: SeriesItem[] }) {
  const [seriesList] = useState<SeriesItem[]>(initialSeries);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>("All");

  const levels = ["All", "Beginner", "Intermediate", "Advanced"];

  const filteredSeries = useMemo(() => {
    return seriesList.filter((s) => {
      let matches = true;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = s.title.toLowerCase().includes(query);
        const matchDesc = s.description.toLowerCase().includes(query);
        const matchTags = s.tags ? s.tags.toLowerCase().includes(query) : false;
        if (!matchTitle && !matchDesc && !matchTags) matches = false;
      }

      if (selectedLevel !== "All") {
        if (s.level?.toLowerCase() !== selectedLevel.toLowerCase()) {
          matches = false;
        }
      }

      return matches;
    });
  }, [seriesList, searchQuery, selectedLevel]);

  const getLevelBadge = (level: string) => {
    switch (level?.toLowerCase()) {
      case "beginner":
        return <Badge variant="success" size="sm">Beginner</Badge>;
      case "intermediate":
        return <Badge variant="brand" size="sm">Intermediate</Badge>;
      case "advanced":
        return <Badge variant="warning" size="sm">Advanced</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{level || "All Levels"}</Badge>;
    }
  };

  return (
    <div className="flex flex-col min-h-screen pt-24 md:pt-32 pb-20 overflow-x-hidden">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1">

        {/* ── 0. HERO SECTION (Identik dengan Vacancies, Blog & design.md) ── */}
        <section className="relative pt-8 sm:pt-12 pb-16 lg:pb-24 flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full">
            
            {/* Left – Text & Actions */}
            <div className="max-w-2xl relative z-30">
              {/* Status pill using shared Badge */}
              <div className="mb-8">
                <Badge variant="brand" dot dotColor="bg-emerald-400" size="md" className="font-mono uppercase">
                  STRUCTURED LEARNING PATHWAYS
                </Badge>
              </div>

              {/* Headline H1 (Ukuran sama persis Home Page & design.md) */}
              <h1 className="text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] mb-4 text-[var(--text-primary)]">
                Master Tech with <br />
                <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-100 bg-clip-text text-transparent">
                  Learning Series.
                </span>
              </h1>

              {/* Subtitle / Lead (Ukuran sama persis Home Page & design.md) */}
              <p className="text-lg md:text-xl mb-10 max-w-xl leading-relaxed text-[var(--text-secondary)] font-normal">
                Follow curated, sequential curriculum tracks covering cloud infrastructure, Kubernetes orchestration, CI/CD automation, and Linux systems from basics to production.
              </p>

              {/* Action Buttons (size="lg" sama persis Home Page & design.md) */}
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href="#series-catalog"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Explore Series
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href="#curriculum"
                  leftIcon={<Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                >
                  View Curriculum
                </Button>
              </div>
            </div>

            {/* Right – Hero Avatar (series.webp) with 4 Floating Badges */}
            <div className="relative flex items-center justify-center mt-6 lg:mt-0">
              <HeroAvatarFrame
                imageSrc="/series.webp"
                imageAlt="Masdika – Learning Series"
                imageWidth={1536}
                imageHeight={1024}
                badges={[
                  { icon: GraduationCap, label: "Structured Tracks", value: "Step-by-Step Paths" },
                  { icon: Play, label: "Hands-on Labs", value: "Interactive Code" },
                  { icon: Layers, label: "Skill Levels", value: "Beginner to Pro" },
                  { icon: Zap, label: "Production Stacks", value: "Enterprise Grade" },
                ]}
              />
            </div>
          </div>
        </section>

        {/* ── 1. SERIES CATALOG SECTION ──────────────────────────────── */}
        <section id="series-catalog" className="py-16 lg:py-24 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true, margin: "100px" }}
            className="text-center max-w-2xl mx-auto mb-12 sm:mb-16"
          >
            <span className="text-xs font-semibold uppercase tracking-widest mb-4 block text-cyan-600 dark:text-cyan-400">
              Curated Courses
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] mb-5 leading-[1.15]">
              Available Learning Series
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed">
              Step-by-step video &amp; article series structured to accelerate your mastery in cloud architecture, container management, and DevOps pipelines.
            </p>
          </motion.div>

          {/* Controls: Search Bar & Level Filters */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-10 pb-6 border-b border-[var(--border-primary)]">
            {/* Search Input */}
            <div className="relative w-full md:w-80 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-cyan-600 dark:group-focus-within:text-cyan-400 transition-colors pointer-events-none" />
              <input
                type="text"
                placeholder="Search series or topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 text-sm rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Level Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {levels.map((lvl) => {
                const isActive = selectedLevel === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSelectedLevel(lvl)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all border",
                      isActive
                        ? "bg-cyan-400 text-slate-950 border-cyan-400 shadow-sm"
                        : "border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-500/40"
                    )}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Series Grid or Premium Empty State */}
          {filteredSeries.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-10 sm:p-14 text-center max-w-xl mx-auto shadow-sm"
            >
              <div className="w-16 h-16 rounded-2xl mx-auto mb-6 border bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                <GraduationCap className="w-8 h-8" strokeWidth={1.75} />
              </div>
              <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
                {seriesList.length === 0 ? "New Series In Production" : "No Matching Series Found"}
              </h3>
              <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed mb-8 max-w-md mx-auto">
                {seriesList.length === 0
                  ? "Our comprehensive learning tracks on Cloud Infrastructure, Kubernetes, and DevOps automation are currently in development. Explore our blog articles in the meantime!"
                  : "We couldn't find any learning series matching your search or level filters. Try clearing your search query."}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                {seriesList.length === 0 ? (
                  <>
                    <Button
                      variant="primary"
                      size="md"
                      href="/blog"
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      Read Tech Articles
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      href="/contact"
                    >
                      Request a Topic
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedLevel("All");
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {filteredSeries.map((s, idx) => (
                <motion.div
                  key={s.id}
                  variants={item}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: "100px" }}
                  transition={{ duration: 0.5, delay: idx * 0.08, ease: "easeOut" }}
                  className="h-full"
                >
                  <article className="rounded-xl lg:rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 transition-all duration-300 overflow-hidden group flex flex-col h-full hover:shadow-xl hover:-translate-y-1">
                    
                    {/* Thumbnail Cover */}
                    <Link
                      href={`/series/${s.slug}`}
                      className="aspect-[16/10] relative overflow-hidden bg-[var(--surface-secondary)] block cursor-pointer"
                    >
                      <SeriesThumbnail src={s.image} alt={s.title} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-70" />

                      {/* Level Badge Floating Top Left */}
                      <div className="absolute top-3.5 left-3.5 z-10">
                        {getLevelBadge(s.level)}
                      </div>

                      {/* Episodes Count Floating Bottom Right */}
                      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 text-slate-800 border border-slate-200/80 dark:bg-slate-950/80 dark:text-white dark:border-white/10 backdrop-blur-md text-xs font-semibold shadow-md">
                        <Play className="w-3 h-3 text-cyan-600 dark:text-cyan-400 fill-cyan-600 dark:fill-cyan-400" />
                        <span>{s.episodes?.length ?? 0} Episodes</span>
                      </div>
                    </Link>

                    {/* Series Card Body */}
                    <div className="p-6 flex flex-col flex-1">
                      {/* Meta: Creation Date */}
                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-medium mb-3">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          {new Date(s.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          })}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-2 leading-snug mb-3">
                        <Link href={`/series/${s.slug}`}>
                          {s.title}
                        </Link>
                      </h3>

                      {/* Description */}
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-3 mb-6 flex-1">
                        {s.description}
                      </p>

                      {/* Tags */}
                      {s.tags && (
                        <div className="flex flex-wrap gap-1.5 mb-5">
                          {s.tags.split(",").slice(0, 3).map((t) => (
                            <span
                              key={t.trim()}
                              className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[var(--surface-secondary)] text-[var(--text-secondary)]"
                            >
                              #{t.trim()}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Card Footer Action */}
                      <div className="pt-4 border-t border-[var(--border-primary)] flex items-center justify-between mt-auto">
                        <span className="text-xs text-[var(--text-muted)] font-medium">
                          {s.episodes?.length ?? 0} modules
                        </span>

                        <Link
                          href={`/series/${s.slug}`}
                          className="text-sm font-semibold text-cyan-600 dark:text-cyan-400 inline-flex items-center gap-1.5 group-hover:gap-2.5 transition-all"
                        >
                          <span>Start Series</span>
                          <ChevronRight className="w-4 h-4 transition-transform" />
                        </Link>
                      </div>
                    </div>

                  </article>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* ── 2. CURRICULUM TRACKS (Identik dengan Section 2 Vacancies) ── */}
        <section id="curriculum" className="py-16 lg:py-24 relative z-10 border-t border-[var(--border-primary)]">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true, margin: "100px" }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <span className="text-xs font-semibold uppercase tracking-widest mb-4 block text-cyan-600 dark:text-cyan-400">
              Structured Pathways
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] mb-5 leading-[1.15]">
              Core Curriculum Specializations
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed">
              Explore sequential learning journeys designed to take you from foundational syntax to multi-region cloud architecture and bare-metal orchestration.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Server,
                title: "Cloud Infrastructure Track",
                desc: "AWS, GCP & Azure VPC topologies, Terraform IaC automation, high-availability storage, and hybrid networking."
              },
              {
                icon: Layers,
                title: "Kubernetes & K3s Track",
                desc: "Container orchestration from scratch, Helm chart management, ingress controllers, GitOps, and bare-metal clusters."
              },
              {
                icon: Terminal,
                title: "DevOps & CI/CD Track",
                desc: "Automated pipelines with GitLab CI & GitHub Actions, Docker multi-stage builds, automated testing, and zero-downtime deploy."
              },
              {
                icon: ShieldCheck,
                title: "Linux & Security Track",
                desc: "Debian/Ubuntu production hardening, WireGuard tunnels, database replication, and zero-trust perimeter access."
              }
            ].map((track, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "100px" }}
                transition={{ duration: 0.5, delay: idx * 0.1, ease: "easeOut" }}
                className="h-full"
              >
                <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 transition-colors duration-200 p-6 sm:p-8 flex flex-col items-center text-center h-full group">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform duration-300">
                    <track.icon className="w-7 h-7" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    {track.title}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {track.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── 3. COMMUNITY & WORKSHOP CTA (Identik dengan Section 3 Vacancies) ── */}
        <section className="pt-8 pb-12">
          <div className="rounded-2xl sm:rounded-3xl bg-[var(--surface)] border border-[var(--border-primary)] p-8 sm:p-12 lg:p-16 text-center relative overflow-hidden shadow-sm">
            <div className="absolute top-0 left-0 w-full h-px bg-cyan-500/40" />
            <Badge variant="brand" size="md" className="mb-4 font-mono uppercase">
              CUSTOM WORKSHOPS &amp; TRAINING
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--text-primary)] tracking-tight mb-4">
              Need a Custom Series or Team Workshop?
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
              We provide tailored technical workshops and infrastructure masterclasses for engineering teams. Reach out with your requirements.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button
                variant="primary"
                size="lg"
                href="/contact"
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                Request a Topic
              </Button>
              <Button
                variant="secondary"
                size="lg"
                href="/services"
              >
                Explore Services
              </Button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
