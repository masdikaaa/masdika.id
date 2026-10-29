"use client";

import { motion } from "framer-motion";
import { Briefcase, GraduationCap, Link2, Megaphone, Lock, ArrowRight, Download, Cloud, Database, Activity } from "lucide-react";
import { SiKubernetes } from "react-icons/si";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/animations/FadeIn";
import { TiltCard } from "@/components/animations/TiltCard";
import { TechStackMarquee } from "@/components/ui/TechStackMarquee";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HeroAvatarFrame } from "@/components/ui/HeroAvatarFrame";

interface ResumeContentProps {
  experiences: any[];
  educations: any[];
  cvUrl: string | null;
}

export function ResumeContent({ experiences, educations, cvUrl }: ResumeContentProps) {
  return (
    <div className="flex flex-col min-h-screen pt-24 md:pt-32 pb-20 overflow-x-hidden">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1">

        {/* ── 0. HERO (Identik Patokan Events & design.md) ────────── */}
        <section className="relative pt-8 sm:pt-12 pb-16 lg:pb-24 flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full">

            {/* Left – Text & Actions */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="max-w-2xl relative z-20"
            >
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
            </motion.div>

            {/* Right – Hero Avatar (about.webp) with 4 Floating Info Badges (All 4 Visible on Mobile) */}
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

        {/* ── 1. ABOUT ME (BENTO GRID) ─────────────────────────────────── */}
        <section className="mb-24 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">

            {/* Main Content Box */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="md:col-span-2 lg:col-span-3 relative rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-7 sm:p-10 lg:p-12 hover:border-cyan-500/40 transition-colors shadow-sm flex flex-col justify-between"
            >
              <div className="relative z-10">
                <span className="text-xs font-bold tracking-[0.22em] text-cyan-600 dark:text-cyan-400 uppercase mb-4 block">
                  About Me
                </span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-6">
                  Boost Business Strategic Solutions with Us
                </h2>
                <p className="text-base sm:text-lg leading-relaxed max-w-3xl text-[var(--text-secondary)] mb-8">
                  Cloud consulting experts provide expert advice and guidance to businesses to help them improve their performance, efficiency, and organizational scaling. With a robust background in multi-cloud deployments, we ensure your infrastructure is secure, scalable, and highly available.
                </p>
              </div>

              {cvUrl && (
                <div className="relative z-10 pt-2">
                  <Button
                    variant="primary"
                    size="md"
                    href={cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    leftIcon={<Download className="w-4 h-4" />}
                  >
                    Download CV
                  </Button>
                </div>
              )}
            </motion.div>

            {/* Years of Experience Box */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
              className="md:col-span-1 lg:col-span-1 relative rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-6 sm:p-8 flex flex-col items-center justify-center text-center hover:border-cyan-500/40 transition-colors shadow-sm"
            >
              <div className="text-6xl sm:text-7xl font-black text-[var(--text-primary)] mb-2 tracking-tight">
                4+
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--text-muted)] leading-relaxed">
                Years Of<br />Experience
              </p>
            </motion.div>

            {/* Business Box */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
              className="md:col-span-1 lg:col-span-2 relative rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-6 sm:p-8 hover:border-cyan-500/40 transition-colors shadow-sm"
            >
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shrink-0">
                  <Link2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Business</h3>
              </div>
              <p className="text-sm sm:text-base leading-relaxed text-[var(--text-secondary)]">
                Each one showcases my approach to solving complex architectural challenges effectively and efficiently, delivering solid business value.
              </p>
            </motion.div>

            {/* Partners Box */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
              className="md:col-span-1 lg:col-span-1 relative rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-6 sm:p-8 hover:border-cyan-500/40 transition-colors shadow-sm"
            >
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shrink-0">
                  <Megaphone className="w-6 h-6" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">Partners</h3>
              </div>
              <p className="text-sm sm:text-base leading-relaxed text-[var(--text-secondary)]">
                Cloud consulting consultants provide expert advice and strategic guidance.
              </p>
            </motion.div>

            {/* Cloud Deployments Box */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
              className="md:col-span-1 lg:col-span-1 relative rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-6 sm:p-8 flex items-center justify-between gap-4 hover:border-cyan-500/40 transition-colors shadow-sm"
            >
              <div>
                <div className="text-4xl sm:text-5xl font-black text-[var(--text-primary)] mb-1 tracking-tight">
                  200+
                </div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] leading-snug">
                  Cloud<br />Deployments
                </p>
              </div>
              <div className="w-14 h-14 rounded-full border border-dashed border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                <Lock className="w-6 h-6" />
              </div>
            </motion.div>

          </div>
        </section>

        {/* ── 2. TECH STACK & SKILLS ──────────────────────────────────── */}
        <section className="mb-24 relative z-10">
          <div className="mb-12 text-center">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-400 mb-3 block">
              My Skills
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[var(--text-primary)]">
              Tech Stack &amp; Tools
            </h2>
          </div>

          <TechStackMarquee />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            viewport={{ once: true, margin: "-50px" }}
            className="flex justify-center mt-12"
          >
            <Button
              variant="primary"
              size="md"
              href="/skills"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              View All Skills
            </Button>
          </motion.div>
        </section>

        {/* ── 3. EXPERIENCE & EDUCATION SECTION ───────────────────────── */}
        <section className="relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

            {/* Experience Column */}
            <div>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shrink-0">
                  <Briefcase className="w-6 h-6" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)]">
                  My Experience
                </h2>
              </div>

              <div className="space-y-5">
                {experiences.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-muted)] text-sm">
                    No experience records available.
                  </div>
                ) : (
                  experiences.map((item, i) => (
                    <FadeIn delay={i * 0.1} direction="up" key={item.id || i}>
                      <TiltCard intensity={6} className="relative rounded-2xl p-6 sm:p-7 border border-[var(--border-primary)] border-l-4 border-l-cyan-500 bg-[var(--surface)] hover:border-cyan-500/40 transition-colors shadow-sm group">
                        <Badge variant="brand" size="sm" dot dotColor="bg-cyan-500" className="font-semibold uppercase tracking-wider mb-3">
                          {item.year}
                        </Badge>
                        <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-1 leading-snug">
                          {item.role}
                        </h3>
                        <p className="text-sm sm:text-base font-medium text-[var(--text-secondary)]">
                          {item.company}
                        </p>
                      </TiltCard>
                    </FadeIn>
                  ))
                )}
              </div>
            </div>

            {/* Education Column */}
            <div>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shrink-0">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)]">
                  My Education
                </h2>
              </div>

              <div className="space-y-5">
                {educations.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-muted)] text-sm">
                    No education records available.
                  </div>
                ) : (
                  educations.map((item, i) => (
                    <FadeIn delay={i * 0.1} direction="up" key={item.id || i}>
                      <TiltCard intensity={6} className="relative rounded-2xl p-6 sm:p-7 border border-[var(--border-primary)] border-l-4 border-l-cyan-500 bg-[var(--surface)] hover:border-cyan-500/40 transition-colors shadow-sm group">
                        <Badge variant="brand" size="sm" dot dotColor="bg-cyan-500" className="font-semibold uppercase tracking-wider mb-3">
                          {item.year}
                        </Badge>
                        <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mb-1 leading-snug">
                          {item.degree}
                        </h3>
                        <p className="text-sm sm:text-base font-medium text-[var(--text-secondary)]">
                          {item.school}
                        </p>
                      </TiltCard>
                    </FadeIn>
                  ))
                )}
              </div>
            </div>

          </div>
        </section>

        {/* ── 4. CALL TO ACTION (Identik Patokan Events) ──────────────────────── */}
        <section className="pt-16 pb-12">
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
