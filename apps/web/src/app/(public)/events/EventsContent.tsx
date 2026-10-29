"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
  Video,
  Terminal,
  Users,
  Sparkles,
  ArrowRight,
  Calendar,
  MessageSquare,
  Presentation,
  Layers,
  CheckCircle2,
  Mic
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OpportunityGrid } from "@/components/ui/OpportunityGrid";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HeroAvatarFrame } from "@/components/ui/HeroAvatarFrame";
import { FadeIn } from "@/components/animations/FadeIn";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
} as const;

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } }
};

export function EventsContent({ opportunities }: { opportunities: any }) {
  return (
    <div className="flex flex-col min-h-screen pt-24 md:pt-32 pb-20 overflow-x-hidden">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1">

        {/* ── 0. HERO (Identik Patokan Home Page & design.md) ────────── */}
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
                  WORKSHOPS &amp; KEYNOTES
                </Badge>
              </div>

              {/* Headline H1 (Ukuran sama persis Home Page) */}
              <h1 className="text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] mb-4 text-[var(--text-primary)]">
                Tech Events, <br />
                <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-100 bg-clip-text text-transparent">
                  Talks &amp; Webinars.
                </span>
              </h1>

              {/* Subtitle / Lead (Ukuran sama persis Home Page) */}
              <p className="text-lg md:text-xl mb-10 max-w-xl leading-relaxed text-[var(--text-secondary)] font-normal">
                Join interactive sessions, deep-dive cloud workshops, and community keynotes designed to elevate your technical prowess and infrastructure mastery.
              </p>

              {/* Action Buttons (size="lg" sama persis Home Page) */}
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href="#events-grid"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Explore Events
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href="/contact"
                  leftIcon={<Mic className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                >
                  Invite as Speaker
                </Button>
              </div>
            </motion.div>

            {/* Right – Hero Avatar (event-webinar.webp) with 4 Floating Badges */}
            <div className="relative flex items-center justify-center mt-6 lg:mt-0">
              <HeroAvatarFrame
                imageSrc="/event-webinar.webp"
                imageAlt="Masdika – Events & Webinars"
                imageWidth={1536}
                imageHeight={1024}
                badges={[
                  { icon: Video, label: "Keynote Speaker", value: "Conferences" },
                  { icon: Terminal, label: "Live Workshop", value: "DevOps Lab" },
                  { icon: Users, label: "Community", value: "1,000+ Reach" },
                  { icon: Sparkles, label: "Interactive", value: "Live Q&A" },
                ]}
              />
            </div>
          </div>
        </section>

        {/* ── 1. EVENTS GRID SECTION ─────────────────────────────────── */}
        <section id="events-grid" className="py-16 lg:py-24 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <span className="text-xs font-semibold uppercase tracking-widest mb-4 block text-cyan-600 dark:text-cyan-400">
              Scheduled Sessions
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] mb-5 leading-[1.15]">
              Explore Upcoming &amp; Past Sessions
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed">
              Filter and search across technical webinars, architecture masterclasses, and open conference sessions.
            </p>
          </motion.div>

          <OpportunityGrid opportunities={opportunities} emptyType="EVENT" />
        </section>

        {/* ── 2. SESSION FORMATS SECTION ─────────────────────────────── */}
        <section className="py-16 lg:py-24 relative z-10 border-t border-[var(--border-primary)]">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <span className="text-xs font-semibold uppercase tracking-widest mb-4 block text-cyan-600 dark:text-cyan-400">
              Session Formats
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] mb-5 leading-[1.15]">
              How I Share Knowledge
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed">
              Tailored event formats designed for high audience engagement, actionable takeaways, and practical engineering skills.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Terminal,
                title: "Hands-on Workshops",
                desc: "Live coding and infrastructure provisioning labs where attendees follow along step-by-step."
              },
              {
                icon: Layers,
                title: "Architecture Teardowns",
                desc: "In-depth reviews of high-availability cloud setups, disaster recovery, and real production cases."
              },
              {
                icon: Presentation,
                title: "Keynote Presentations",
                desc: "Engaging tech conference talks exploring future trends in Kubernetes, DevOps, and cloud economics."
              },
              {
                icon: MessageSquare,
                title: "Ask-Me-Anything & Q&A",
                desc: "Open floor sessions answering community questions on career growth, cloud certifications, and tooling."
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
                    <format.icon className="w-7 h-7" strokeWidth={1.75} />
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

        {/* ── 3. CALL TO ACTION ──────────────────────────────────────── */}
        <section className="pt-8 pb-12">
          <div className="rounded-2xl sm:rounded-3xl bg-[var(--surface)] border border-[var(--border-primary)] p-8 sm:p-12 lg:p-16 text-center relative overflow-hidden shadow-sm">
            <div className="absolute top-0 left-0 w-full h-px bg-cyan-500/40" />
            <Badge variant="brand" size="md" className="mb-4 font-mono uppercase">
              COMMUNITY &amp; SPEAKING
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--text-primary)] tracking-tight mb-4">
              Planning a Tech Meetup or Conference?
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
              I am available for keynotes, virtual panels, and technical workshops on Kubernetes, Cloud Architecture, and DevOps automation.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button
                variant="primary"
                size="lg"
                href="/contact"
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                Request a Speaker
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
