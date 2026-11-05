"use client";

import {
  Briefcase,
  GraduationCap,
  Server,
  Terminal,
  ArrowRight,
  Download,
  Cloud,
  Database,
  Activity,
  ShieldCheck,
  Cpu,
  Network,
  CheckCircle2,
  Building2,
  Calendar,
  Award,
  Layers,
} from "lucide-react";
import { SiKubernetes } from "react-icons/si";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/animations/FadeIn";
import { TechStackMarquee } from "@/components/ui/TechStackMarquee";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HeroAvatarFrame } from "@/components/ui/HeroAvatarFrame";
import { SectionOrnaments } from "@/components/ui/PremiumBackground";

interface ResumeContentProps {
  experiences: any[];
  educations: any[];
  cvUrl: string | null;
}

const CORE_COMPETENCIES = [
  {
    icon: Network,
    badge: "L2/L3 Networking",
    title: "Datacenter & Network Engineering",
    description:
      "Designing carrier-grade routing topologies, secure tunnel interconnects, and high-throughput packet forwarding.",
    skills: [
      "MikroTik RouterOS & Juniper Switching",
      "BGP, OSPF, VLAN & Failover Routing",
      "OpenVPN, WireGuard & Zero-Trust Tunnels",
      "L3/L7 Firewalling & DDoS Mitigation",
    ],
  },
  {
    icon: Cloud,
    badge: "Container Platform",
    title: "Cloud & Kubernetes Orchestration",
    description:
      "Operating production-ready container clusters with automated scaling, self-healing workloads, and edge ingress.",
    skills: [
      "Kubernetes (K8s) & Managed K3s Clusters",
      "Docker, Containerd & Registry Management",
      "Helm Charts & ArgoCD GitOps Delivery",
      "Cloudflare Anycast CDN & Edge WAF",
    ],
  },
  {
    icon: Server,
    badge: "Bare-Metal & Virtualization",
    title: "Linux Systems & Virtualization",
    description:
      "Provisioning enterprise bare-metal rack servers, hypervisors, and hardened Linux production environments.",
    skills: [
      "Debian, Ubuntu Server, RHEL & AlmaLinux",
      "Proxmox VE, KVM & Bare-Metal Dell/Xeon",
      "Nginx, Traefik & Caddy Auto-TLS Ingress",
      "Automated Snapshot & Disaster Recovery",
    ],
  },
  {
    icon: Activity,
    badge: "SRE & Telemetry",
    title: "Databases, CI/CD & Observability",
    description:
      "Ensuring 99.98% service reliability through full-stack metrics, log aggregation, and zero-downtime pipelines.",
    skills: [
      "PostgreSQL, MySQL & Redis High Availability",
      "GitHub Actions, GitLab CI & Terraform IaC",
      "Prometheus, Grafana & Real-Time Alerting",
      "ELK Stack, Loki & Distributed Tracing",
    ],
  },
];

function getExperienceDetails(item: {
  role: string;
  company: string;
  type?: string | null;
  description?: string | null;
  tags?: string | null;
}) {
  const parsedTags = item.tags
    ? item.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  return {
    type: item.type && item.type.trim().length > 0 ? item.type : "Verified Role",
    summary: item.description && item.description.trim().length > 0 ? item.description : "",
    tags: parsedTags,
  };
}

function getEducationDetails(item: {
  degree: string;
  school: string;
  type?: string | null;
  description?: string | null;
  tags?: string | null;
}) {
  const parsedTags = item.tags
    ? item.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  return {
    type: item.type && item.type.trim().length > 0 ? item.type : "Academic",
    summary: item.description && item.description.trim().length > 0 ? item.description : "",
    tags: parsedTags,
  };
}

export function ResumeContent({ experiences, educations, cvUrl }: ResumeContentProps) {
  return (
    <div className="flex flex-col min-h-screen pt-24 md:pt-32 pb-20 lg:pb-28 overflow-x-hidden">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1">

        {/* ── 0. HERO ────────────────────────────────────────────────── */}
        <section className="relative pt-8 sm:pt-12 pb-16 lg:pb-24 flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full">

            {/* Left – Text & Actions */}
            <div className="max-w-2xl relative z-20">
              <div className="mb-8">
                <Badge variant="brand" dot dotColor="bg-emerald-400" size="md" className="font-mono uppercase">
                  MY JOURNEY &amp; CAREER
                </Badge>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] mb-4 text-[var(--text-primary)]">
                Crafting Scalable <br />
                <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-100 bg-clip-text text-transparent">
                  Solutions with Passion.
                </span>
              </h1>

              <p className="text-lg md:text-xl mb-10 max-w-xl leading-relaxed text-[var(--text-secondary)] font-normal">
                I am a dedicated Cloud &amp; DevOps Engineer focused on building resilient, high-performance infrastructure. With a deep understanding of modern cloud architectures, I help businesses scale seamlessly.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                {cvUrl && (
                  <Button
                    variant="primary"
                    size="lg"
                    href={cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    leftIcon={<Download className="w-4 h-4" />}
                  >
                    Download CV
                  </Button>
                )}
                <Button
                  variant={cvUrl ? "secondary" : "primary"}
                  size="lg"
                  href="/contact"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Get in Touch
                </Button>
              </div>
            </div>

            {/* Right – Hero Avatar */}
            <div className="relative flex items-center justify-center mt-6 lg:mt-0">
              <HeroAvatarFrame
                imageSrc="/about.webp"
                imageAlt="Masdika – About Me"
                imageWidth={1180}
                imageHeight={1060}
                badges={[
                  { icon: Cloud, label: "AWS Certified", value: "Cloud Expert" },
                  { icon: Database, label: "High Availability", value: "DB Architect" },
                  { icon: Activity, label: "CI/CD Pipeline", value: "Automation" },
                  { icon: SiKubernetes, label: "Kubernetes", value: "Mastery" },
                ]}
              />
            </div>

          </div>
        </section>

        {/* ── 1. ENGINEERING PROFILE (REFINED BENTO GRID) ────────────── */}
        <section className="py-16 lg:py-24 relative z-10">
          <SectionOrnaments variant="sides" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch relative z-10">

            {/* Row 1, Left (8 cols): Main Engineering Bio */}
            <FadeIn direction="up" duration={0.6} className="lg:col-span-8 flex">
              <div className="w-full h-full rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-6 sm:p-8 lg:p-10 hover:border-cyan-500/40 transition-all duration-300 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <span className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                      <Terminal className="w-3.5 h-3.5" />
                      Engineering Profile
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Sidoarjo, ID • Available for Projects
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
                    Architecting Resilient Cloud &amp; Bare-Metal Infrastructure
                  </h2>

                  <p className="text-sm sm:text-base leading-relaxed text-[var(--text-secondary)] mb-6">
                    I design, provision, and operate mission-critical infrastructure across bare-metal datacenters, enterprise routing networks (MikroTik &amp; Juniper), and multi-cloud Kubernetes clusters. My work focuses on eliminating single points of failure, automating delivery pipelines, and maintaining strict production uptime.
                  </p>
                </div>

                <div className="pt-5 border-t border-[var(--border-primary)] flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      "Bare-Metal & BGP",
                      "Kubernetes (K8s / K3s)",
                      "Terraform & GitOps",
                      "Zero-Downtime Ops",
                    ].map((chip) => (
                      <span
                        key={chip}
                        className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-secondary)]"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>

                  {cvUrl && (
                    <Button
                      variant="primary"
                      size="sm"
                      href={cvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      leftIcon={<Download className="w-3.5 h-3.5" />}
                    >
                      Download CV
                    </Button>
                  )}
                </div>
              </div>
            </FadeIn>

            {/* Row 1, Right (4 cols): Key Metrics & Track Record Card */}
            <FadeIn direction="up" delay={0.1} duration={0.6} className="lg:col-span-4 flex">
              <div className="w-full h-full rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-6 sm:p-8 hover:border-cyan-500/40 transition-all duration-300 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400" />
                    Production Metrics
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-[var(--text-muted)]">
                    EST. 2020
                  </span>
                </div>

                <div className="my-6 flex items-center gap-4">
                  <div className="inline-flex items-center text-5xl sm:text-6xl font-black tracking-tight text-[var(--text-primary)] leading-none shrink-0">
                    4<span className="text-cyan-500 dark:text-cyan-400">+</span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="text-sm sm:text-base font-bold text-[var(--text-primary)] leading-tight">
                      Years of Experience
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1 leading-tight">
                      Cloud, Network &amp; SysAdmin
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[var(--border-primary)]">
                  <div className="p-3 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)]">
                    <p className="text-lg sm:text-xl font-black font-mono text-[var(--text-primary)]">
                      200<span className="text-cyan-500 dark:text-cyan-400">+</span>
                    </p>
                    <p className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
                      Cloud Deployments
                    </p>
                  </div>
                  <div className="p-3 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)]">
                    <p className="text-lg sm:text-xl font-black font-mono text-emerald-500 dark:text-emerald-400">
                      99.98%
                    </p>
                    <p className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">
                      Production Uptime
                    </p>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Row 2: 3 Equal-Height Pillar Cards (4 + 4 + 4 cols) */}
            {[
              {
                icon: Server,
                title: "Bare-Metal & Core Routing",
                badge: "Datacenter Ops",
                desc: "Provisioning rackmount Xeon servers, enterprise RAID storage, and carrier-grade MikroTik & Juniper BGP routing.",
                delay: 0.15,
              },
              {
                icon: Cpu,
                title: "Kubernetes & Cloud Native",
                badge: "High Availability",
                desc: "Designing fault-tolerant K8s & K3s clusters, containerized microservices, and multi-region failover topologies.",
                delay: 0.2,
              },
              {
                icon: ShieldCheck,
                title: "DevSecOps & Automation",
                badge: "Zero-Touch CI/CD",
                desc: "Automating infrastructure as code with Terraform & Ansible, hardened with Cloudflare Zero Trust and L3/L7 WAF.",
                delay: 0.25,
              },
            ].map((pillar) => (
              <FadeIn key={pillar.title} direction="up" delay={pillar.delay} duration={0.6} className="lg:col-span-4 flex">
                <div className="group w-full h-full rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-5 sm:p-6 hover:border-cyan-500/40 dark:hover:border-cyan-500/30 hover:shadow-xl dark:hover:shadow-[0_0_25px_rgba(6,182,212,0.08)] transition-all duration-300 hover:-translate-y-0.5 flex flex-col">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shrink-0">
                      <pillar.icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400" />
                      {pillar.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors mb-2">
                    {pillar.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)] flex-1">
                    {pillar.desc}
                  </p>
                </div>
              </FadeIn>
            ))}

          </div>
        </section>

        {/* ── 2. CORE COMPETENCIES & ARCHITECTURE PILLARS (NEW SECTION) ─ */}
        <section className="py-16 lg:py-24 relative z-10">
          <FadeIn direction="down" className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              Technical Depth
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Core Engineering Competencies
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed">
              End-to-end infrastructure capabilities spanning physical datacenter networking, container orchestration, and automated SRE operations.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 items-stretch">
            {CORE_COMPETENCIES.map((comp, idx) => (
              <FadeIn key={comp.title} delay={idx * 0.08} direction="up" className="flex">
                <div className="group w-full h-full rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-6 sm:p-7 hover:border-cyan-500/40 dark:hover:border-cyan-500/30 hover:shadow-xl dark:hover:shadow-[0_0_25px_rgba(6,182,212,0.08)] transition-all duration-300 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-5">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shrink-0">
                        <comp.icon className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
                      </div>
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-secondary)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400" />
                        {comp.badge}
                      </span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors mb-2">
                      {comp.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-5">
                      {comp.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[var(--border-primary)] grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {comp.skills.map((sk) => (
                      <div key={sk} className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400 shrink-0" />
                        <span className="truncate">{sk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── 3. TECH STACK & SKILLS ──────────────────────────────────── */}
        <section className="py-16 lg:py-24 relative z-10">
          <div className="mb-12 text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              My Skills
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[var(--text-primary)]">
              Tech Stack &amp; Tools
            </h2>
          </div>

          <TechStackMarquee />

          <div className="flex justify-center mt-12">
            <Button
              variant="primary"
              size="md"
              href="/skills"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              View All Skills
            </Button>
          </div>
        </section>

        {/* ── 4. EXPERIENCE & EDUCATION TIMELINE ──────────────────────── */}
        <section className="py-16 lg:py-24 relative z-10">
          <FadeIn direction="down" className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              Career &amp; Academic Background
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[var(--text-primary)] leading-[1.15]">
              Experience &amp; Education
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-start">

            {/* Experience Column */}
            <div>
              <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border-primary)]">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shrink-0">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] leading-tight">
                      My Experience
                    </h3>
                    <p className="text-xs font-mono text-[var(--text-muted)]">
                      Professional &amp; Infrastructure Roles
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center whitespace-nowrap shrink-0 px-3 py-1 rounded-full text-[11px] font-mono font-bold border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-secondary)]">
                  {experiences.length} {experiences.length === 1 ? "Role" : "Roles"}
                </span>
              </div>

              <div className="relative pl-6 border-l border-[var(--border-primary)] space-y-6">
                {experiences.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-muted)] text-sm">
                    No experience records available.
                  </div>
                ) : (
                  experiences.map((item, i) => {
                    const details = getExperienceDetails(item);
                    const isPresent = String(item.year).toUpperCase().includes("PRESENT");
                    return (
                      <FadeIn delay={i * 0.1} direction="up" key={item.id || i}>
                        <div className="relative group">
                          {/* Timeline Node */}
                          <span
                            className={cn(
                              "absolute -left-[31px] top-6 w-3.5 h-3.5 rounded-full border-2 transition-colors",
                              isPresent
                                ? "bg-emerald-400 border-emerald-500/40 shadow-[0_0_10px_rgba(52,211,153,0.6)]"
                                : "bg-[var(--surface)] border-cyan-500 group-hover:bg-cyan-400"
                            )}
                          />

                          <div className="rounded-2xl p-5 sm:p-6 border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 dark:hover:border-cyan-500/30 hover:shadow-xl dark:hover:shadow-[0_0_25px_rgba(6,182,212,0.08)] transition-all duration-300">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider border",
                                  isPresent
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                    : "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
                                )}
                              >
                                {isPresent ? (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                ) : (
                                  <Calendar className="w-3 h-3" />
                                )}
                                {item.year}
                              </span>
                              <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                                {details.type}
                              </span>
                            </div>

                            <h4 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors mb-1">
                              {item.role}
                            </h4>

                            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] mb-3.5">
                              <Building2 className="w-4 h-4 text-cyan-500 dark:text-cyan-400 shrink-0" />
                              <span>{item.company}</span>
                            </div>

                            {details.summary && (
                              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
                                {details.summary}
                              </p>
                            )}

                            {details.tags.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-3.5 border-t border-[var(--border-primary)]">
                                {details.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-muted)]"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </FadeIn>
                    );
                  })
                )}
              </div>
            </div>

            {/* Education Column */}
            <div>
              <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border-primary)]">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] leading-tight">
                      My Education
                    </h3>
                    <p className="text-xs font-mono text-[var(--text-muted)]">
                      Academic Degrees &amp; Technical Training
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center whitespace-nowrap shrink-0 px-3 py-1 rounded-full text-[11px] font-mono font-bold border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-secondary)]">
                  {educations.length} {educations.length === 1 ? "Record" : "Records"}
                </span>
              </div>

              <div className="relative pl-6 border-l border-[var(--border-primary)] space-y-6">
                {educations.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-muted)] text-sm">
                    No education records available.
                  </div>
                ) : (
                  educations.map((item, i) => {
                    const details = getEducationDetails(item);
                    const isPresent = String(item.year).toUpperCase().includes("PRESENT");
                    return (
                      <FadeIn delay={i * 0.1} direction="up" key={item.id || i}>
                        <div className="relative group">
                          {/* Timeline Node */}
                          <span
                            className={cn(
                              "absolute -left-[31px] top-6 w-3.5 h-3.5 rounded-full border-2 transition-colors",
                              isPresent
                                ? "bg-emerald-400 border-emerald-500/40 shadow-[0_0_10px_rgba(52,211,153,0.6)]"
                                : "bg-[var(--surface)] border-cyan-500 group-hover:bg-cyan-400"
                            )}
                          />

                          <div className="rounded-2xl p-5 sm:p-6 border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 dark:hover:border-cyan-500/30 hover:shadow-xl dark:hover:shadow-[0_0_25px_rgba(6,182,212,0.08)] transition-all duration-300">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider border",
                                  isPresent
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                    : "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
                                )}
                              >
                                {isPresent ? (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                ) : (
                                  <Calendar className="w-3 h-3" />
                                )}
                                {item.year}
                              </span>
                              <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                                {details.type}
                              </span>
                            </div>

                            <h4 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors mb-1">
                              {item.degree}
                            </h4>

                            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] mb-3.5">
                              <Award className="w-4 h-4 text-cyan-500 dark:text-cyan-400 shrink-0" />
                              <span>{item.school}</span>
                            </div>

                            {details.summary && (
                              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
                                {details.summary}
                              </p>
                            )}

                            {details.tags.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-3.5 border-t border-[var(--border-primary)]">
                                {details.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-muted)]"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </FadeIn>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </section>

        {/* ── 5. CALL TO ACTION ──────────────────────────────────────── */}
        <section className="pt-16 pb-0">
          <div className="rounded-2xl sm:rounded-3xl bg-[var(--surface)] border border-[var(--border-primary)] p-8 sm:p-12 lg:p-16 text-center relative overflow-hidden shadow-sm">
            <div className="absolute top-0 left-0 w-full h-px bg-cyan-500/40" />
            <Badge variant="brand" size="md" className="mb-4 font-mono uppercase">
              CAREER &amp; COLLABORATION
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--text-primary)] tracking-tight mb-4">
              Looking for Senior Engineering Talent?
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
              Available for high-impact cloud infrastructure engineering, Kubernetes platform architecture, and DevOps advisory.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {cvUrl ? (
                <Button
                  variant="primary"
                  size="lg"
                  href={cvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  leftIcon={<Download className="w-5 h-5" />}
                >
                  Download CV
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  href="/contact"
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                >
                  Get in Touch
                </Button>
              )}
              <Button
                variant="secondary"
                size="lg"
                href="/portfolio"
              >
                Explore Portfolio
              </Button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
