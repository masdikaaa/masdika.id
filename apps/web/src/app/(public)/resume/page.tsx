"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Briefcase, GraduationCap, Link2, Megaphone, Lock, ArrowRight, Download } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/animations/FadeIn";
import { TiltCard } from "@/components/animations/TiltCard";
import { TechStackMarquee } from "@/components/ui/TechStackMarquee";
import { MagneticButton } from "@/components/animations/MagneticButton";
import { useTheme } from "@/components/ThemeProvider";

export default function ResumePage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [experiences, setExperiences] = useState<any[]>([]);
  const [educations, setEducations] = useState<any[]>([]);
  const [linkedinUrl, setLinkedinUrl] = useState<string>("https://linkedin.com");
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/resume')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setExperiences(data.experiences || []);
          setEducations(data.educations || []);
          if (data.linkedinUrl) setLinkedinUrl(data.linkedinUrl);
          if (data.cv_url) setCvUrl(data.cv_url);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col min-h-screen pt-24 md:pt-32 pb-20 bg-transparent relative overflow-hidden">


      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1">
        
        {/* 0. HERO HEADER */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center max-w-3xl mx-auto mb-16 pt-10 relative z-10"
        >
          <span className={cn("font-black tracking-[0.2em] text-xs mb-4 inline-block uppercase px-4 py-2 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.15)]", isDark ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20" : "text-cyan-600 bg-cyan-50 border border-cyan-200")}>
            My Journey
          </span>
          <h1 className={cn("text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black mb-6 tracking-tight leading-[1.1]", isDark ? "text-white" : "text-slate-900")}>
            Crafting Scalable <br className="hidden sm:block" />
            <span className={cn("bg-clip-text text-transparent drop-shadow-sm", isDark ? "bg-gradient-to-r from-cyan-400 to-cyan-200" : "bg-gradient-to-r from-cyan-600 to-cyan-400")}>Solutions with Passion</span>
          </h1>
          <p className={cn("text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>
            I am a dedicated Cloud & DevOps Engineer focused on building resilient, high-performance infrastructure. With a deep understanding of modern cloud architectures, I help businesses scale seamlessly.
          </p>
        </motion.div>

        {/* 1. ABOUT ME SECTION (BENTO GRID DESIGN) */}
        <section className="mb-24 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            
            {/* Main Content Box */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className={cn("md:col-span-2 lg:col-span-3 relative rounded-[2.5rem] border p-8 lg:p-12 overflow-hidden group transition-all transform-gpu duration-500", isDark ? "bg-[#0b1120] border-slate-800 hover:border-cyan-500/40 hover:bg-[#0e172a] shadow-2xl" : "bg-white border-slate-200 hover:border-cyan-500/30 shadow-lg hover:shadow-xl")}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-cyan-600/5 opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px]" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-600/10 rounded-full blur-[80px]" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                  <motion.span 
                    animate={{ opacity: [1, 0.4, 1], scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className={cn("w-12 h-1.5 rounded-full block shadow-[0_0_15px_rgba(6,182,212,0.8)]", isDark ? "bg-gradient-to-r from-cyan-400 to-cyan-200" : "bg-gradient-to-r from-cyan-500 to-cyan-300")}
                  ></motion.span>
                  <span className={cn("font-black tracking-[0.3em] text-[10px] uppercase", isDark ? "text-cyan-300" : "text-cyan-600")}>About Me</span>
                </div>
                <h2 className={cn("text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text leading-[1.1] mb-8 drop-shadow-sm", isDark ? "bg-gradient-to-br from-white via-cyan-100 to-cyan-400" : "bg-gradient-to-br from-slate-900 via-cyan-700 to-cyan-500")}>
                  Boost Business Strategic Solutions with Us
                </h2>
                <p className={cn("text-base md:text-lg leading-relaxed max-w-3xl font-medium mb-10", isDark ? "text-zinc-400" : "text-slate-600")}>
                  Cloud consulting experts provide expert advice and guidance to businesses to help them improve their performance, efficiency, and organizational scaling. With a robust background in multi-cloud deployments, we ensure your infrastructure is secure, scalable, and highly available.
                </p>
                
                {cvUrl && (
                  <MagneticButton intensity={20}>
                    <a href={cvUrl} target="_blank" rel="noopener noreferrer" download className="relative inline-flex group/btn overflow-hidden rounded-2xl">
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-cyan-700 transition-transform duration-300 group-hover/btn:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-cyan-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                      <div className="relative px-8 py-4 flex items-center gap-3 text-white font-bold tracking-wide shadow-[0_0_30px_rgba(6,182,212,0.2)] group-hover/btn:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-shadow">
                        <Download className="w-5 h-5" />
                        Download CV
                      </div>
                    </a>
                  </MagneticButton>
                )}
              </div>
            </motion.div>

            {/* Years of Experience Box */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
              className={cn("md:col-span-1 lg:col-span-1 relative rounded-[2.5rem] border overflow-hidden group transition-all transform-gpu duration-500 flex flex-col items-center justify-center text-center p-8", isDark ? "bg-[#0b1120] border-slate-800 hover:border-cyan-500/40 hover:bg-[#0e172a] shadow-xl" : "bg-white border-slate-200 hover:border-cyan-500/30 shadow-md hover:shadow-xl")}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-cyan-500/20 rounded-full blur-[60px] group-hover:bg-cyan-500/20 transition-colors duration-700" />
              <div className="relative z-10">
                <h2 className={cn("text-8xl font-black text-transparent bg-clip-text mb-4 group-hover:scale-110 transition-transform duration-500 drop-shadow-[0_0_30px_rgba(6,182,212,0.3)]", isDark ? "bg-gradient-to-b from-white to-cyan-300" : "bg-gradient-to-b from-slate-900 to-cyan-500")}>4<span className={cn("transition-colors", isDark ? "text-cyan-400 group-hover:text-white" : "text-cyan-600 group-hover:text-cyan-700")}>+</span></h2>
                <p className={cn("text-sm font-black uppercase tracking-[0.3em] leading-relaxed transition-colors", isDark ? "text-cyan-300 group-hover:text-cyan-300" : "text-cyan-600 group-hover:text-cyan-700")}>Years Of<br/>Experience</p>
              </div>
            </motion.div>

            {/* Business Box */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
              className={cn("md:col-span-1 lg:col-span-2 relative rounded-[2.5rem] border p-10 hover:-translate-y-2 transition-all transform-gpu duration-500 group overflow-hidden", isDark ? "bg-[#0b1120] border-slate-800 hover:border-cyan-500/40 hover:bg-[#0e172a] shadow-xl" : "bg-white border-slate-200 hover:border-cyan-500/30 shadow-md hover:shadow-xl")}
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/10 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="flex items-center gap-6 mb-6">
                  <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-500 shadow-inner group-hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]", isDark ? "bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white" : "bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white border border-cyan-200 group-hover:border-transparent")}>
                    <Link2 className="w-8 h-8" />
                  </div>
                  <h3 className={cn("text-3xl font-black transition-colors", isDark ? "text-white group-hover:text-cyan-100" : "text-slate-900 group-hover:text-cyan-700")}>Business</h3>
                </div>
                <p className={cn("font-medium leading-relaxed text-base md:text-lg", isDark ? "text-zinc-400" : "text-slate-600")}>Each one showcases my approach to solving complex architectural challenges effectively and efficiently, delivering solid business value.</p>
              </div>
            </motion.div>

            {/* Partners Box */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
              className={cn("md:col-span-1 lg:col-span-1 relative rounded-[2.5rem] border p-10 hover:-translate-y-2 transition-all transform-gpu duration-500 group overflow-hidden", isDark ? "bg-[#0b1120] border-slate-800 hover:border-cyan-500/40 hover:bg-[#0e172a] shadow-xl" : "bg-white border-slate-200 hover:border-cyan-500/30 shadow-md hover:shadow-xl")}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="flex items-center gap-6 mb-6">
                  <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-500 shadow-inner group-hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]", isDark ? "bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white" : "bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white border border-cyan-200 group-hover:border-transparent")}>
                    <Megaphone className="w-8 h-8" />
                  </div>
                  <h3 className={cn("text-3xl font-black transition-colors", isDark ? "text-white group-hover:text-cyan-100" : "text-slate-900 group-hover:text-cyan-700")}>Partners</h3>
                </div>
                <p className={cn("font-medium leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>Cloud consulting consultants provide expert advice and strategic guidance.</p>
              </div>
            </motion.div>

            {/* Cloud Deployments Box */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
              className={cn("md:col-span-1 lg:col-span-1 relative rounded-[2.5rem] border p-8 flex items-center justify-between gap-4 hover:-translate-y-2 transition-all transform-gpu duration-500 group overflow-hidden", isDark ? "bg-[#0b1120] border-slate-800 hover:border-cyan-500/40 hover:bg-[#0e172a] shadow-xl" : "bg-white border-slate-200 hover:border-cyan-500/30 shadow-md hover:shadow-xl")}
            >
              <div className="absolute top-1/2 right-10 -translate-y-1/2 w-24 h-24 bg-cyan-500/20 rounded-full blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <h3 className={cn("text-5xl font-black text-transparent bg-clip-text mb-2 drop-shadow-sm", isDark ? "bg-gradient-to-br from-white to-cyan-200" : "bg-gradient-to-br from-slate-900 to-cyan-600")}>200<span className={cn("transition-colors", isDark ? "text-cyan-400 group-hover:text-cyan-300" : "text-cyan-600 group-hover:text-cyan-500")}>+</span></h3>
                <p className={cn("text-[10px] font-black uppercase tracking-[0.25em] leading-snug", isDark ? "text-cyan-500/80" : "text-cyan-600")}>Cloud<br/>Deployments</p>
              </div>
              <div className={cn("w-20 h-20 rounded-full border-2 border-dashed flex items-center justify-center shrink-0 group-hover:animate-[spin_6s_linear_infinite] transition-colors relative z-10", isDark ? "border-cyan-500/30 group-hover:border-cyan-400/60" : "border-cyan-500/30 group-hover:border-cyan-500")}>
                <div className={cn("w-16 h-16 rounded-full flex items-center justify-center group-hover:animate-none transition-colors shadow-inner", isDark ? "bg-cyan-500/10 group-hover:bg-cyan-500/20" : "bg-cyan-50 group-hover:bg-cyan-100")}>
                  <Lock className={cn("w-7 h-7", isDark ? "text-cyan-400" : "text-cyan-600")} />
                </div>
              </div>
            </motion.div>

          </div>
        </section>

        {/* 2. TECH STACK & SKILLS */}
        <section className="mb-24 relative z-10">
          <div className="mb-16 text-center">
            <span className={cn("font-black tracking-[0.2em] text-xs mb-4 inline-block uppercase px-4 py-2 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.15)]", isDark ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20" : "text-cyan-600 bg-cyan-50 border border-cyan-200")}>
              My Skills
            </span>
            <h2 className={cn("text-4xl md:text-5xl lg:text-6xl font-black leading-tight", isDark ? "text-white" : "text-slate-900")}>Tech Stack & Tools</h2>
          </div>

          <TechStackMarquee />

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            viewport={{ once: true, margin: "-50px" }}
            className="flex justify-center mt-16"
          >
            <MagneticButton intensity={20}>
              <Link href="/skills" className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-cyan-600 text-white font-bold hover:bg-cyan-500 transition-all gap-2 w-fit shrink-0 shadow-lg">
                View All Skills <ArrowRight className="w-5 h-5" />
              </Link>
            </MagneticButton>
          </motion.div>
        </section>

        {/* 3. EXPERIENCE & EDUCATION SECTION */}
        <section className="relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-16">
            
            {/* Experience Column */}
            <div>
              <div className="flex items-center gap-6 mb-12">
                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner", isDark ? "bg-cyan-500/10" : "bg-cyan-50 border border-cyan-200")}>
                  <Briefcase className={cn("w-8 h-8", isDark ? "text-cyan-400" : "text-cyan-600")} strokeWidth={1.5} />
                </div>
                <h2 className={cn("text-4xl font-black", isDark ? "text-white" : "text-slate-900")}>My Experience</h2>
              </div>
              
              <div className="space-y-6">
                {loading ? (
                  <div className="flex justify-center py-10">
                    <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                  </div>
                ) : (
                  experiences.map((item, i) => (
                    <FadeIn delay={i * 0.1} direction="up" key={i}>
                      <TiltCard intensity={8} className={cn("relative backdrop-blur-xl rounded-2xl rounded-tr-[3rem] rounded-bl-[3rem] p-8 border-l-4 transition-all transform-gpu duration-500 group overflow-hidden", isDark ? "bg-gradient-to-br from-[#0b1120]/90 to-[#070b14]/90 border-slate-800 border-l-cyan-500/30 hover:border-l-cyan-400 hover:bg-gradient-to-br hover:from-[#0f1926]/90 hover:to-[#0b1120]/90 hover:border-cyan-500/30 shadow-[0_8px_30px_rgba(0,0,0,0.4)]" : "bg-white border-black/5 border-l-cyan-500/50 hover:border-l-cyan-500 hover:bg-slate-50 hover:border-cyan-500/30 shadow-[0_8px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)]")}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative z-10">
                          <div className="flex items-center gap-3 mb-5">
                            <div className={cn("w-3 h-3 rounded-full border-2 bg-transparent transition-all shadow-[0_0_10px_rgba(6,182,212,0.8)]", isDark ? "border-cyan-400 group-hover:bg-cyan-400 group-hover:scale-125" : "border-cyan-500 group-hover:bg-cyan-500 group-hover:scale-125")}></div>
                            <span className={cn("font-black text-xs tracking-[0.2em] uppercase transition-colors", isDark ? "text-cyan-300 group-hover:text-cyan-200" : "text-cyan-600 group-hover:text-cyan-700")}>{item.year}</span>
                          </div>
                          <h3 className={cn("text-2xl lg:text-3xl font-black text-transparent bg-clip-text mb-2 leading-tight drop-shadow-sm transition-colors", isDark ? "bg-gradient-to-r from-white to-zinc-300 group-hover:to-white" : "bg-gradient-to-r from-slate-900 to-slate-700 group-hover:to-slate-900")}>{item.role}</h3>
                          <p className={cn("font-medium text-lg", isDark ? "text-cyan-400/80" : "text-cyan-600")}>{item.company}</p>
                        </div>
                      </TiltCard>
                    </FadeIn>
                  ))
                )}
              </div>
            </div>

            {/* Education Column */}
            <div>
              <div className="flex items-center gap-6 mb-12">
                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner", isDark ? "bg-cyan-500/10" : "bg-cyan-50 border border-cyan-200")}>
                  <GraduationCap className={cn("w-8 h-8", isDark ? "text-cyan-400" : "text-cyan-600")} strokeWidth={1.5} />
                </div>
                <h2 className={cn("text-4xl font-black", isDark ? "text-white" : "text-slate-900")}>My Education</h2>
              </div>
              
              <div className="space-y-6">
                {loading ? (
                  <div className="flex justify-center py-10">
                    <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-purple-500 rounded-full animate-spin" />
                  </div>
                ) : (
                  educations.map((item, i) => (
                    <FadeIn delay={i * 0.1} direction="up" key={i}>
                      <TiltCard intensity={8} className={cn("relative backdrop-blur-xl rounded-2xl rounded-tr-[3rem] rounded-bl-[3rem] p-8 border-l-4 transition-all transform-gpu duration-500 group overflow-hidden", isDark ? "bg-gradient-to-br from-[#0b1120]/90 to-[#070b14]/90 border-slate-800 border-l-cyan-500/30 hover:border-l-cyan-400 hover:bg-gradient-to-br hover:from-[#0f1926]/90 hover:to-[#0b1120]/90 hover:border-cyan-500/30 shadow-[0_8px_30px_rgba(0,0,0,0.4)]" : "bg-white border-black/5 border-l-cyan-500/50 hover:border-l-cyan-500 hover:bg-slate-50 hover:border-cyan-500/30 shadow-[0_8px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)]")}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative z-10">
                          <div className="flex items-center gap-3 mb-5">
                            <div className={cn("w-3 h-3 rounded-full border-2 bg-transparent transition-all shadow-[0_0_10px_rgba(6,182,212,0.8)]", isDark ? "border-cyan-400 group-hover:bg-cyan-400 group-hover:scale-125" : "border-cyan-500 group-hover:bg-cyan-500 group-hover:scale-125")}></div>
                            <span className={cn("font-black text-xs tracking-[0.2em] uppercase transition-colors", isDark ? "text-cyan-300 group-hover:text-cyan-200" : "text-cyan-600 group-hover:text-cyan-700")}>{item.year}</span>
                          </div>
                          <h3 className={cn("text-2xl lg:text-3xl font-black text-transparent bg-clip-text mb-2 leading-tight drop-shadow-sm transition-colors", isDark ? "bg-gradient-to-r from-white to-zinc-300 group-hover:to-white" : "bg-gradient-to-r from-slate-900 to-slate-700 group-hover:to-slate-900")}>{item.degree}</h3>
                          <p className={cn("font-medium text-lg", isDark ? "text-cyan-400/80" : "text-cyan-600")}>{item.school}</p>
                        </div>
                      </TiltCard>
                    </FadeIn>
                  ))
                )}
              </div>
            </div>
            
          </div>
        </section>
      </div>
    </div>
  );
}
