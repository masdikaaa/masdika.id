"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { 
  Cloud, 
  Server, 
  Activity, 
  Shield, 
  Award, 
  Terminal, 
  ArrowRight, 
  Brain, 
  Users, 
  Lightbulb, 
  Target, 
  Trophy, 
  Code,
  CheckCircle2,
  Cpu,
  Layers
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { SiKubernetes } from "react-icons/si";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FadeIn } from "@/components/animations/FadeIn";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
} as const;

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } }
};

export default function SkillsPage() {
  const [certifications, setCertifications] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/certifications')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setCertifications(data);
      })
      .catch(err => console.error("Error fetching certifications:", err));
  }, []);

  const categories = [
    {
      title: "Cloud Platforms",
      skills: [
        { name: "AWS", level: 90, icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/amazonwebservices/amazonwebservices-original-wordmark.svg" },
        { name: "Google Cloud (GCP)", level: 80, icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/googlecloud/googlecloud-original.svg" },
        { name: "Microsoft Azure", level: 65, icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/azure/azure-original.svg" },
      ]
    },
    {
      title: "Containers & Orchestration",
      skills: [
        { name: "Docker", level: 95, icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/docker/docker-original.svg" },
        { name: "Kubernetes & K3s", level: 88, icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/kubernetes/kubernetes-plain.svg" },
      ]
    },
    {
      title: "DevOps & CI/CD Pipelines",
      skills: [
        { name: "GitLab CI", level: 90, icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/gitlab/gitlab-original.svg" },
        { name: "GitHub Actions", level: 85, icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/github/github-original.svg", invert: true },
        { name: "Jenkins", level: 75, icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/jenkins/jenkins-original.svg" },
      ]
    },
    {
      title: "Infrastructure as Code (IaC)",
      skills: [
        { name: "Terraform", level: 90, icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/terraform/terraform-original.svg" },
        { name: "Ansible", level: 85, icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/ansible/ansible-original.svg" },
      ]
    },
    {
      title: "Operating Systems & Linux",
      skills: [
        { name: "Ubuntu Server", level: 95, icon: "https://cdn.simpleicons.org/ubuntu/E95420" },
        { name: "Debian", level: 90, icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/debian/debian-original.svg" },
        { name: "AlmaLinux", level: 90, icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/almalinux/almalinux-original.svg" },
        { name: "Red Hat Enterprise", level: 85, icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/redhat/redhat-original.svg" },
      ]
    },
    {
      title: "Networking & VPN Infrastructure",
      skills: [
        { name: "Proxmox VE", level: 95, icon: "https://cdn.simpleicons.org/proxmox/E57000" },
        { name: "WireGuard Mesh", level: 90, icon: "https://cdn.simpleicons.org/wireguard/88171A" },
        { name: "MikroTik RouterOS", level: 85, icon: "https://cdn.simpleicons.org/mikrotik/white" },
        { name: "OpenVPN", level: 80, icon: "https://cdn.simpleicons.org/openvpn/EA7E20" },
      ]
    }
  ];

  return (
    <div className="flex flex-col min-h-screen pt-24 md:pt-32 pb-20 overflow-x-hidden">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1">

        {/* ── 0. HERO (Identik Patokan Home Page) ────────────────────── */}
        <section className="relative pt-8 sm:pt-12 pb-16 lg:pb-24 flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full">
            
            {/* Left – Text & Actions */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="max-w-2xl relative z-30"
            >
              {/* Status pill using shared Badge */}
              <div className="mb-8">
                <Badge variant="brand" dot dotColor="bg-emerald-400" size="md" className="font-mono uppercase">
                  TECHNICAL EXPERTISE &amp; PROFICIENCIES
                </Badge>
              </div>

              {/* Headline H1 (Ukuran sama persis Home Page) */}
              <h1 className="text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] mb-4 text-[var(--text-primary)]">
                Technical Skills &amp; Proficiencies
              </h1>

              {/* Subtitle / Lead (Ukuran sama persis Home Page) */}
              <p className="text-lg md:text-xl mb-10 max-w-xl leading-relaxed text-[var(--text-secondary)] font-normal">
                A comprehensive overview of my technical proficiencies, DevOps automation toolchains, multi-cloud competencies, and engineering traits.
              </p>

              {/* Action Buttons (size="lg" sama persis Home Page) */}
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href="#skills-grid"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Explore Stack
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href="#certifications-section"
                  leftIcon={<Award className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                >
                  Certifications
                </Button>
              </div>
            </motion.div>

            {/* Right – Hero Avatar (skills.webp) with 4 Floating Badges (All 4 Visible on Mobile) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.2 }}
              className="relative flex items-center justify-center mt-10 lg:mt-0"
            >
              <div className="relative w-full max-w-[360px] sm:max-w-[460px] lg:max-w-[520px] xl:max-w-[560px] h-[380px] sm:h-[440px] lg:h-[480px] mx-auto flex items-end justify-center">
                {/* Subtle ambient depth bloom behind avatar */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[300px] sm:w-[440px] sm:h-[360px] bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-3xl pointer-events-none -z-0" />

                {/* Floating Card 1: Top-Left */}
                <div
                  className="absolute top-1 -left-1 sm:top-4 sm:-left-6 lg:-left-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-1 bg-white/95 dark:bg-[#061e33]/85 backdrop-blur-xl border border-slate-200/80 dark:border-cyan-500/30 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.5)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[145px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <Cloud className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none">
                      Cloud Platform
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap">
                      AWS &amp; GCP
                    </div>
                  </div>
                </div>

                {/* Floating Card 2: Top-Right */}
                <div
                  className="absolute top-14 -right-1 sm:top-4 sm:-right-6 lg:-right-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-2 bg-white/95 dark:bg-[#061e33]/85 backdrop-blur-xl border border-slate-200/80 dark:border-cyan-500/30 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.5)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[145px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <SiKubernetes className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none">
                      Containers
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap">
                      Docker &amp; K8s
                    </div>
                  </div>
                </div>

                {/* Floating Card 3: Bottom-Left */}
                <div
                  className="absolute bottom-20 -left-1 sm:bottom-12 sm:-left-6 lg:-left-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-3 bg-white/95 dark:bg-[#061e33]/85 backdrop-blur-xl border border-slate-200/80 dark:border-cyan-500/30 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.5)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[145px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <Activity className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none">
                      Automation
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap">
                      CI/CD &amp; GitOps
                    </div>
                  </div>
                </div>

                {/* Floating Card 4: Bottom-Right */}
                <div
                  className="absolute bottom-2 -right-1 sm:bottom-12 sm:-right-6 lg:-right-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2.5 sm:gap-3 animate-float-4 bg-white/95 dark:bg-[#061e33]/85 backdrop-blur-xl border border-slate-200/80 dark:border-cyan-500/30 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.5)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[145px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <Server className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none">
                      Infrastructure
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap">
                      Terraform &amp; IaC
                    </div>
                  </div>
                </div>

                {/* Karakter skills.webp utuh & proporsional */}
                <div
                  className="w-full h-full relative z-10 flex items-end justify-center"
                  style={{
                    maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 70%, rgba(0,0,0,0.7) 88%, rgba(0,0,0,0) 98%)",
                    WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 70%, rgba(0,0,0,0.7) 88%, rgba(0,0,0,0) 98%)"
                  }}
                >
                  <Image
                    src="/skills.webp"
                    alt="Masdika – Technical Skills"
                    width={1024}
                    height={1024}
                    priority={true}
                    unoptimized={true}
                    className="w-full h-full object-contain object-bottom"
                  />
                  <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/40 to-transparent pointer-events-none" />
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── 1. TECHNICAL PROFICIENCIES SECTION ──────────────────────── */}
        <section id="skills-grid" className="py-16 lg:py-24 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <span className="text-xs font-semibold uppercase tracking-widest mb-4 block text-cyan-600 dark:text-cyan-400">
              Core Competencies
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] mb-5 leading-[1.15]">
              Domains of Technical Expertise
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed">
              Hands-on experience and verified proficiency across enterprise cloud providers, container orchestration, and continuous delivery systems.
            </p>
          </motion.div>

          {/* Categories Grid */}
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8"
          >
            {categories.map((category, i) => (
              <motion.div variants={item} key={i}>
                <div className="h-full rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 transition-colors duration-200 p-6 sm:p-8 flex flex-col justify-between">
                  <div className="mb-6 pb-4 border-b border-[var(--border-primary)] flex items-center justify-between">
                    <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
                      {category.title}
                    </h3>
                    <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
                      {category.skills.length} Tools
                    </span>
                  </div>

                  <div className="space-y-6">
                    {category.skills.map((skill, j) => (
                      <div key={j} className="group/skill">
                        <div className="flex justify-between items-center mb-2.5 gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 shrink-0 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] flex items-center justify-center p-2 transition-colors">
                              <img
                                referrerPolicy="no-referrer"
                                src={skill.icon}
                                alt={skill.name}
                                className={cn(
                                  "w-full h-full object-contain max-w-full max-h-full",
                                  skill.invert && "dark:filter dark:invert dark:brightness-0 dark:saturate-100"
                                )}
                                loading="lazy"
                                decoding="async"
                              />
                            </div>
                            <span className="font-bold text-sm sm:text-base text-[var(--text-primary)] truncate">
                              {skill.name}
                            </span>
                          </div>
                          <span className="text-xs sm:text-sm font-bold text-cyan-600 dark:text-cyan-400">
                            {skill.level}%
                          </span>
                        </div>

                        {/* Progress Bar with Cyan Tone */}
                        <div className="h-2 rounded-full overflow-hidden bg-[var(--surface-secondary)] border border-[var(--border-primary)]">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${skill.level}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 1.2, ease: "easeOut", delay: 0.05 * j }}
                            className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-cyan-400"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ── 2. PROFESSIONAL TRAITS SECTION ─────────────────────────── */}
        <section className="py-16 lg:py-24 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <span className="text-xs font-semibold uppercase tracking-widest mb-4 block text-cyan-600 dark:text-cyan-400">
              Engineering Mindset
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] mb-5 leading-[1.15]">
              Professional Traits &amp; Delivery
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed">
              Core operating principles that guide high-impact engineering collaboration, continuous growth, and mission-critical execution.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { label: "Problem Solving", desc: "Analytical approach to complex technical challenges and rapid root-cause diagnosis.", icon: Brain },
              { label: "Team Collaboration", desc: "Clear communication, transparent documentation, and cross-functional synergy.", icon: Users },
              { label: "Adaptability", desc: "Rapid adoption of emerging tools, cloud patterns, and evolving architectures.", icon: Lightbulb },
              { label: "Goal-Oriented", desc: "Laser focus on delivering measurable uptime, cost efficiency, and business velocity.", icon: Target }
            ].map((trait, idx) => (
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
                    <trait.icon className="w-7 h-7" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
                    {trait.label}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {trait.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── 3. CERTIFICATIONS SECTION ──────────────────────────────── */}
        <section id="certifications-section" className="py-16 lg:py-24 relative z-10 border-t border-[var(--border-primary)]">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">
            
            {/* Left Header Column */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="w-full lg:w-1/3"
            >
              <span className="text-xs font-semibold uppercase tracking-widest mb-4 block text-cyan-600 dark:text-cyan-400">
                Milestones &amp; Accreditations
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] mb-5 leading-[1.15]">
                Certifications &amp; Awards
              </h2>
              <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed mb-8">
                Continuous learning is at the core of my professional journey. Here are some of the milestones and industry certifications achieved.
              </p>
              <Button
                variant="primary"
                size="md"
                href="/contact"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Hire Cloud Expertise
              </Button>
            </motion.div>
            
            {/* Right Certifications Grid */}
            <div className="w-full lg:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-5">
              {certifications.length > 0 ? certifications.map((cert, idx) => {
                const IconComponent = (LucideIcons as any)[cert.icon] || Award;
                
                return (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: idx * 0.1, ease: "easeOut" }}
                    className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 transition-colors p-6 flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center border bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400 group-hover:scale-105 transition-transform duration-300">
                          <IconComponent className="w-6 h-6" strokeWidth={1.75} />
                        </div>
                        <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 px-2.5 py-1 rounded-md bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 uppercase tracking-wider">
                          {cert.date}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] mb-1 leading-snug">
                        {cert.title}
                      </h3>
                      <p className="text-sm text-[var(--text-secondary)] font-medium">
                        {cert.org}
                      </p>
                    </div>
                  </motion.div>
                );
              }) : (
                <div className="col-span-2 text-center py-16 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)]">
                  <Trophy className="w-14 h-14 mx-auto mb-4 text-slate-300 dark:text-zinc-600" />
                  <h3 className="text-xl font-bold mb-2 text-[var(--text-primary)]">No Certifications Listed</h3>
                  <p className="text-sm text-[var(--text-secondary)]">Certifications will appear here once configured.</p>
                </div>
              )}
            </div>

          </div>
        </section>

        {/* ── 4. CALL TO ACTION ──────────────────────────────────────── */}
        <section className="pt-8 pb-12">
          <div className="rounded-3xl bg-gradient-to-b from-cyan-500/5 to-transparent dark:from-cyan-500/10 dark:to-transparent border border-cyan-500/20 p-8 sm:p-12 lg:p-16 text-center relative overflow-hidden">
            <Badge variant="brand" size="md" className="mb-4 font-mono uppercase">
              LET&apos;S COLLABORATE
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--text-primary)] tracking-tight mb-4">
              Looking for Verified Cloud &amp; DevOps Expertise?
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
              Let&apos;s discuss how my architecture design, Kubernetes automation, and cloud engineering skills can accelerate your development roadmap.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button
                variant="primary"
                size="lg"
                href="/contact"
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                Start a Conversation
              </Button>
              <Button
                variant="secondary"
                size="lg"
                href="/portfolio"
              >
                View Case Studies
              </Button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
