"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Grid,
  Server,
  Activity,
  Cloud,
  Database,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  ArrowRight,
  Briefcase,
  Layers,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  Building2
} from "lucide-react";
import { SiKubernetes } from "react-icons/si";
import { cn } from "@/lib/utils";
import { PremiumLoader } from "@/components/ui/PremiumLoader";
import { FadeIn } from "@/components/animations/FadeIn";
import { TiltCard } from "@/components/animations/TiltCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { TechIcon } from "@/components/ui/TechIcon";
import { HeroAvatarFrame } from "@/components/ui/HeroAvatarFrame";

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } }
};

export default function PortfolioPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

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
  const FILTERS = categories.map(cat => {
    const lower = cat.toLowerCase();
    let Icon = Cloud;
    if (cat === 'All') Icon = Grid;
    else if (lower.includes('kuber')) Icon = Server;
    else if (lower.includes('devops') || lower.includes('ci')) Icon = Activity;
    else if (lower.includes('web') || lower.includes('app')) Icon = Layers;
    else if (lower.includes('data') || lower.includes('db')) Icon = Database;
    return { name: cat as string, icon: Icon };
  });

  const filteredProjects = activeFilter === "All"
    ? projects
    : projects.filter(p => (p.category?.name || "Uncategorized") === activeFilter);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / itemsPerPage));
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProjects = filteredProjects.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="flex flex-col min-h-screen pt-24 md:pt-32 pb-20 overflow-x-hidden">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1">

        {/* ── 0. HERO (Identik Patokan Events & design.md) ────────── */}
        <section className="relative pt-8 sm:pt-12 pb-16 lg:pb-24 flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full">

            {/* Left – Text & Actions */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="max-w-2xl relative z-30"
            >
              <div className="mb-8">
                <Badge variant="brand" dot dotColor="bg-emerald-400" size="md" className="font-mono uppercase">
                  FEATURED CASE STUDIES &amp; ARCHITECTURES
                </Badge>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] mb-4 text-[var(--text-primary)]">
                Engineering Scalable <br />
                <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-100 bg-clip-text text-transparent">
                  Architectures &amp; Cloud.
                </span>
              </h1>

              <p className="text-lg md:text-xl mb-10 max-w-xl leading-relaxed text-[var(--text-secondary)] font-normal">
                A comprehensive showcase of architectural deployments, cloud migrations, high-availability clusters, and automated CI/CD pipelines engineered to drive operational excellence.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href="#projects-grid"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Explore Case Studies
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href="/contact"
                  leftIcon={<Briefcase className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                >
                  Consult Architecture
                </Button>
              </div>
            </motion.div>

            {/* Right – Hero Avatar (portofolio.webp) with 4 Floating Info Badges (All 4 Visible on Mobile) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="relative flex items-center justify-center mt-6 lg:mt-0"
            >
              <HeroAvatarFrame
                imageSrc="/portofolio.webp"
                imageAlt="Masdika – Portfolio Works"
                imageWidth={1323}
                imageHeight={1189}
                badges={[
                  { icon: Cloud, label: "AWS & GCP", value: "Cloud Architect" },
                  { icon: Database, label: "High Availability", value: "Multi-Node" },
                  { icon: Activity, label: "GitOps CI/CD", value: "Zero Downtime" },
                  { icon: SiKubernetes, label: "Kubernetes", value: "Orchestration" },
                ]}
              />
            </motion.div>

          </div>
        </section>

        {/* ── 1. FILTER TABS & PROJECTS GRID ───────────────────────────── */}
        <section id="projects-grid" className="py-16 lg:py-24 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              PORTFOLIO REPOSITORY
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Selected Works &amp; Systems
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-2xl mx-auto">
              Browse verified deployments, system architectures, and client projects across various engineering domains.
            </p>
          </div>

          {/* Filter Pills Segment Bar */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex justify-center mb-12"
          >
            <div className="inline-flex flex-wrap items-center justify-center p-1.5 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] shadow-sm gap-1.5 max-w-full">
              {FILTERS.map((filter) => {
                const isActive = activeFilter === filter.name;
                return (
                  <button
                    key={filter.name}
                    onClick={() => setActiveFilter(filter.name)}
                    className={cn(
                      "px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 whitespace-nowrap",
                      isActive
                        ? "bg-cyan-400 text-slate-950 font-bold shadow-md shadow-cyan-500/20"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"
                    )}
                  >
                    <filter.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-slate-950" : "text-cyan-600 dark:text-cyan-400")} />
                    <span>{filter.name}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Projects Grid */}
          <div>
            {loading ? (
              <PremiumLoader inline />
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-24 px-6 sm:px-8 rounded-2xl border border-dashed border-[var(--border-primary)] bg-[var(--surface)]">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400">
                  <FolderOpen className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-[var(--text-primary)]">No projects found</h3>
                <p className="max-w-md mx-auto text-sm text-[var(--text-secondary)] leading-relaxed">
                  Check back later or select a different category to explore my work.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {currentProjects.map((project, index) => {
                  const techList = project.techStack ? project.techStack.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
                  return (
                    <FadeIn key={project.id} delay={index * 0.08} direction="up" className="h-full">
                      <div className="group flex flex-col rounded-2xl overflow-hidden transition-all duration-300 h-full border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 hover:shadow-xl shadow-sm">

                        {/* Image Section */}
                        <Link href={`/portfolio/${project.slug}`} className="block relative aspect-[16/10] overflow-hidden bg-[var(--surface-secondary)] group/img border-b border-[var(--border-primary)]">
                          {project.image ? (
                            <Image
                              referrerPolicy="no-referrer"
                              src={project.image}
                              alt={project.title}
                              fill
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              unoptimized={true}
                              className="object-cover object-top transition-transform duration-700 ease-out group-hover/img:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-mono text-xs text-[var(--text-muted)]">
                              No Image Available
                            </div>
                          )}

                          {/* Category Badge */}
                          {project.category?.name && (
                            <div className="absolute top-3.5 left-3.5 z-10">
                              <Badge variant="brand" size="sm" className="shadow-sm bg-white/95 dark:bg-[#121212]/95 border border-[var(--border-primary)]">
                                {project.category.name}
                              </Badge>
                            </div>
                          )}
                        </Link>

                        {/* Content Section */}
                        <div className="flex-1 p-4 sm:p-6 flex flex-col">
                          {/* Tech Stack Chips */}
                          {techList.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 mb-3 sm:mb-3.5">
                              {techList.slice(0, 4).map((tech: string, i: number) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-semibold rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] group-hover:border-cyan-500/30 transition-colors"
                                >
                                  <TechIcon tech={tech} size={12} />
                                  <span>{tech}</span>
                                </span>
                              ))}
                              {techList.length > 4 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 text-[9px] sm:text-[10px] font-bold rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-[var(--text-muted)]">
                                  +{techList.length - 4}
                                </span>
                              )}
                            </div>
                          )}

                          <Link href={`/portfolio/${project.slug}`} className="group/link focus:outline-none mb-2">
                            <h3 className="text-lg sm:text-xl font-bold transition-colors line-clamp-1 leading-snug text-[var(--text-primary)] group-hover/link:text-cyan-600 dark:group-hover/link:text-cyan-400">
                              {project.title}
                            </h3>
                          </Link>

                          <p className="text-sm leading-relaxed mb-6 flex-1 text-[var(--text-secondary)] line-clamp-2">
                            {project.description || "Discover the full case study including architectural decisions, challenges faced, and the technology stack used."}
                          </p>

                          {/* Bottom Section */}
                          <div className="mt-auto pt-4 border-t border-[var(--border-primary)] flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                              <Building2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                              <span className="truncate max-w-[130px] sm:max-w-[160px] font-medium">
                                {project.client || "Personal Project"}
                              </span>
                            </div>

                            <Link
                              href={`/portfolio/${project.slug}`}
                              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-cyan-600 dark:text-cyan-400 group-hover:text-cyan-500 transition-colors"
                            >
                              <span>View Case Study</span>
                              <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                            </Link>
                          </div>
                        </div>

                      </div>
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
                transition={{ duration: 0.4, delay: 0.2 }}
                className="flex justify-center items-center gap-2 mt-16"
              >
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2.5 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed hover:border-cyan-500/40 transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex gap-1.5">
                  {Array.from({ length: totalPages }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPage(idx + 1)}
                      className={cn(
                        "w-10 h-10 rounded-xl font-bold text-sm transition-all flex items-center justify-center border",
                        currentPage === idx + 1
                          ? "bg-cyan-500 text-slate-950 font-bold border-cyan-500 shadow-sm"
                          : "bg-[var(--surface)] border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-cyan-500/40"
                      )}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2.5 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed hover:border-cyan-500/40 transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </motion.div>
            )}
          </div>
        </section>

        {/* ── 2. ENGINEERING HIGHLIGHTS SECTION (Format identik Session Formats di Events) ────────── */}
        <section className="py-16 lg:py-24 relative z-10 border-t border-[var(--border-primary)]">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <span className="text-xs font-semibold uppercase tracking-widest mb-4 block text-cyan-600 dark:text-cyan-400">
              Architectural Domains
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] mb-5 leading-[1.15]">
              Core Engineering Focus
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed">
              Every production system is engineered following modern cloud-native standards, high availability, and operational resilience.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Cloud,
                title: "Cloud Infrastructure",
                desc: "Resilient multi-region architectures across AWS, GCP, and bare-metal environments."
              },
              {
                icon: SiKubernetes,
                title: "Kubernetes & GitOps",
                desc: "Production container orchestration with automated scaling and declarative ArgoCD sync."
              },
              {
                icon: Activity,
                title: "CI/CD Automation",
                desc: "Zero-downtime deployment pipelines, automated security scanning, and declarative IaC."
              },
              {
                icon: Database,
                title: "High Availability",
                desc: "Distributed database replication, automated failover routing, and disaster recovery."
              }
            ].map((format, idx) => (
              <motion.div
                key={idx}
                variants={item}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1, ease: "easeOut" }}
                className="h-full"
              >
                <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 transition-colors duration-200 p-6 sm:p-8 flex flex-col items-center text-center h-full group">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform duration-300">
                    {format.icon === SiKubernetes ? (
                      <format.icon className="w-7 h-7" />
                    ) : (
                      <format.icon className="w-7 h-7" strokeWidth={1.75} />
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
                    {format.title}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {format.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── 3. CALL TO ACTION (Identik Patokan Events) ──────────────────────── */}
        <section className="pt-8 pb-12">
          <div className="rounded-2xl sm:rounded-3xl bg-[var(--surface)] border border-[var(--border-primary)] p-8 sm:p-12 lg:p-16 text-center relative overflow-hidden shadow-sm">
            <div className="absolute top-0 left-0 w-full h-px bg-cyan-500/40" />
            <Badge variant="brand" size="md" className="mb-4 font-mono uppercase">
              ENGINEERING &amp; COLLABORATION
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--text-primary)] tracking-tight mb-4">
              Have a Mission-Critical Architecture to Build?
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
              Whether you are scaling high-concurrency systems, architecting Kubernetes clusters, or migrating to multi-cloud, let&apos;s engineer your success.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button
                variant="primary"
                size="lg"
                href="/contact"
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                Start a Project
              </Button>
              <Button
                variant="secondary"
                size="lg"
                href="/skills"
              >
                View Skills &amp; Stack
              </Button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
