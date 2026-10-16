"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Network, Lock, Router, Award, CheckCircle2, Trophy, Brain, Users, Lightbulb, Target } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

export default function SkillsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
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
      title: "Cloud",
      color: "from-cyan-500 to-cyan-400",
      glow: "bg-cyan-500/10",
      skills: [
        { name: "AWS", level: 90, icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/amazonwebservices/amazonwebservices-original-wordmark.svg" },
        { name: "GCP", level: 80, icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/googlecloud/googlecloud-original.svg" },
        { name: "Azure", level: 65, icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/azure/azure-original.svg" },
      ]
    },
    {
      title: "Containers & Orchestration",
      color: "from-cyan-500 to-cyan-400",
      glow: "bg-cyan-500/10",
      skills: [
        { name: "Docker", level: 95, icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/docker/docker-original.svg" },
        { name: "Kubernetes", level: 85, icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/kubernetes/kubernetes-plain.svg" },
      ]
    },
    {
      title: "DevOps & CI/CD",
      color: "from-cyan-500 to-cyan-400",
      glow: "bg-cyan-500/10",
      skills: [
        { name: "GitLab CI", level: 90, icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/gitlab/gitlab-original.svg" },
        { name: "GitHub Actions", level: 85, icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/github/github-original.svg", invert: true },
        { name: "Jenkins", level: 75, icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/jenkins/jenkins-original.svg" },
      ]
    },
    {
      title: "Infrastructure as Code",
      color: "from-cyan-500 to-cyan-400",
      glow: "bg-cyan-500/10",
      skills: [
        { name: "Terraform", level: 90, icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/terraform/terraform-original.svg" },
        { name: "Ansible", level: 85, icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/ansible/ansible-original.svg" },
      ]
    },
    {
      title: "Operating Systems",
      color: "from-cyan-500 to-cyan-400",
      glow: "bg-cyan-500/10",
      skills: [
        { name: "AlmaLinux", level: 90, icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/almalinux/almalinux-original.svg" },
        { name: "Red Hat", level: 85, icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/redhat/redhat-original.svg" },
        { name: "Debian", level: 90, icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/debian/debian-original.svg" },
        { name: "Ubuntu", level: 95, icon: "https://cdn.simpleicons.org/ubuntu/E95420" },
      ]
    },
    {
      title: "Networking & VPN",
      color: "from-cyan-500 to-cyan-400",
      glow: "bg-cyan-500/10",
      skills: [
        { name: "Proxmox", level: 95, icon: "https://cdn.simpleicons.org/proxmox/E57000" },
        { name: "Mikrotik", level: 85, icon: "https://cdn.simpleicons.org/mikrotik/white" },
        { name: "WireGuard", level: 90, icon: "https://cdn.simpleicons.org/wireguard/88171A" },
        { name: "OpenVPN", level: 80, icon: "https://cdn.simpleicons.org/openvpn/EA7E20" },
      ]
    }
  ];

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.5 } }
  } as const;

  const item = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } }
  };

  return (
    <div className="flex flex-col min-h-screen pt-24 md:pt-32 pb-20 bg-transparent relative overflow-hidden">


      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8 border-b border-white/5 pb-12 pt-10 relative z-10"
        >
          <div className="max-w-2xl">
            <span className={cn("font-black tracking-[0.2em] text-xs mb-4 inline-block uppercase px-4 py-2 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.15)]", isDark ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20" : "text-cyan-600 bg-cyan-50 border border-cyan-200")}>
              My Expertise
            </span>
            <h1 className={cn("text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-6 tracking-tight leading-[1.1]", isDark ? "text-white" : "text-slate-900")}>
              Technical Skills <br className="hidden sm:block" />
              <span className={cn("bg-clip-text text-transparent drop-shadow-sm", isDark ? "bg-gradient-to-r from-cyan-400 to-cyan-200" : "bg-gradient-to-r from-cyan-600 to-cyan-400")}>& Proficiencies</span>
            </h1>
            <p className={cn("text-lg md:text-xl leading-relaxed font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>
              A comprehensive overview of my technical expertise, professional traits, and proficiency levels across various platforms.
            </p>
          </div>
        </motion.div>

        {/* Main Skills Grid */}
        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10"
        >
          {categories.map((category, i) => (
            <motion.div 
              variants={item} 
              transition={{ delay: i * 0.1 }} 
              key={i} 
              className={cn(
                "backdrop-blur-xl rounded-2xl rounded-tr-[3rem] p-8 md:p-10 border-r-2 border-t-2 transition-all transform-gpu duration-500 relative overflow-hidden group border",
                isDark 
                  ? "bg-gradient-to-br from-[#0b1120]/95 to-[#050a14]/95 border-slate-800 border-r-cyan-500/20 border-t-cyan-500/20 hover:border-r-cyan-400 hover:border-t-cyan-400 hover:bg-gradient-to-bl hover:from-[#0d1627]/95 hover:to-[#050a14]/95 shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
                  : "bg-white border-black/5 border-r-cyan-500/30 border-t-cyan-500/30 hover:border-r-cyan-500 hover:border-t-cyan-500 hover:bg-slate-50 shadow-xl"
              )}
            >
              {/* Soft background glow tied to category color */}
              <div className={cn("absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] -mr-20 -mt-20 opacity-30 group-hover:opacity-60 transition-opacity duration-500 pointer-events-none", isDark ? "bg-cyan-500/20" : "bg-cyan-500/10")} />
              
              <h2 className={cn("text-3xl font-black mb-10 flex items-center gap-4 relative z-10", isDark ? "text-white" : "text-slate-900")}>
                {category.title}
              </h2>
              
              <div className="space-y-8 relative z-10">
                {category.skills.map((skill, j) => (
                  <div key={j} className="group/skill">
                    <div className="flex justify-between items-center mb-4 gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={cn("w-12 h-12 flex-shrink-0 rounded-2xl border flex items-center justify-center p-2.5 transition-colors", isDark ? "bg-[#050B14] border-white/10 group-hover/skill:border-white/30 shadow-inner" : "bg-slate-50 border-black/10 group-hover/skill:border-cyan-300 shadow-sm")}>
                          {(() => {
                            const s = skill as any;
                            if (s.icon) {
                              return <img referrerPolicy="no-referrer" src={s.icon} alt={s.name} className={"w-full h-full object-contain max-w-full max-h-full drop-shadow-lg " + (s.invert && isDark ? "filter invert brightness-0 saturate-100" : "")} loading="lazy" decoding="async" />;
                            }
                            if (s.isLucide) {
                              return <s.isLucide className="w-full h-full flex-shrink-0 text-zinc-300" />;
                            }
                            return null;
                          })()}
                        </div>
                        <span className={cn("font-bold text-lg truncate tracking-wide", isDark ? "text-white" : "text-slate-900")}>{skill.name}</span>
                      </div>
                      <span className={cn("text-sm font-black px-3 py-1.5 rounded-lg border transition-colors", isDark ? "text-white bg-white/5 border-white/10 shadow-inner group-hover/skill:bg-white/10" : "text-slate-900 bg-slate-50 border-black/10 shadow-sm group-hover/skill:bg-slate-100")}>
                        {skill.level}%
                      </span>
                    </div>
                    <div className={cn("h-3 rounded-full overflow-hidden relative border", isDark ? "bg-[#050B14] border-white/5 shadow-inner" : "bg-slate-100 border-black/5")}>
                      <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: skill.level + "%" }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.1 * j }}
                        className={cn("h-full rounded-full relative overflow-hidden bg-gradient-to-r", category.color)}
                      >
                        {/* Animated shine effect on the progress bar */}
                        <div className="absolute top-0 bottom-0 left-0 w-[200%] bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                      </motion.div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* 1. Professional Traits Section */}
        <section className="mt-32 mb-20 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            viewport={{ once: true, margin: "-50px" }}
            className="text-center mb-16 max-w-3xl mx-auto"
          >
            <span className={cn("font-black tracking-[0.2em] text-xs mb-4 inline-block uppercase px-4 py-2 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.15)]", isDark ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20" : "text-cyan-600 bg-cyan-50 border border-cyan-200")}>
              Soft Skills
            </span>
            <h2 className={cn("text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight", isDark ? "text-white" : "text-slate-900")}>
              Professional Traits
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: "Problem Solving", desc: "Analytical approach to complex technical challenges.", icon: Brain },
              { label: "Team Collaboration", desc: "Effective communication and teamwork across departments.", icon: Users },
              { label: "Adaptability", desc: "Quick learner, easily adapting to new technologies.", icon: Lightbulb },
              { label: "Goal-Oriented", desc: "Focused on delivering tangible business value.", icon: Target }
            ].map((trait, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: idx * 0.1, ease: "easeOut" }}
                className={cn(
                  "backdrop-blur-md border border-t-[6px] rounded-3xl p-10 flex flex-col items-center text-center transition-all transform-gpu duration-300 group",
                  isDark 
                    ? "bg-gradient-to-b from-[#0b1120]/90 to-[#070b14]/90 border-slate-800 border-t-cyan-500/20 hover:border-t-cyan-400 hover:from-[#0f1926]/90 hover:to-[#070b14]/90 shadow-[0_15px_35px_rgba(0,0,0,0.5)]"
                    : "bg-white border-black/5 border-t-cyan-500/30 hover:border-t-cyan-500 hover:bg-slate-50 shadow-xl"
                )}
              >
                <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300 border", isDark ? "bg-cyan-500/10 border-cyan-500/20 shadow-inner" : "bg-cyan-50 border-cyan-200")}>
                  <trait.icon className={cn("w-10 h-10", isDark ? "text-cyan-400" : "text-cyan-600")} strokeWidth={1.5} />
                </div>
                <h3 className={cn("text-2xl font-bold mb-4", isDark ? "text-white" : "text-slate-900")}>{trait.label}</h3>
                <p className={cn("font-medium leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>{trait.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 2. Certifications Section */}
        <section className={cn("mt-32 pt-16 border-t relative z-10", isDark ? "border-slate-800" : "border-black/5")}>
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="w-full lg:w-1/3"
            >
              <span className={cn("font-black tracking-[0.2em] text-xs mb-4 inline-block uppercase px-4 py-2 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.15)]", isDark ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20" : "text-cyan-600 bg-cyan-50 border border-cyan-200")}>
                Achievements
              </span>
              <h2 className={cn("text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight", isDark ? "text-white" : "text-slate-900")}>
                Certifications & Awards
              </h2>
              <p className={cn("text-lg leading-relaxed mb-8 font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>
                Continuous learning is at the core of my professional journey. Here are some of the milestones and certifications I have achieved along the way.
              </p>
            </motion.div>
            
            <div className="w-full lg:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {certifications.length > 0 ? certifications.map((cert, idx) => {
                const IconComponent = (LucideIcons as any)[cert.icon] || Award;
                
                return (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.5, delay: idx * 0.1, ease: "easeOut" }}
                    className={cn(
                      "backdrop-blur-md border border-l-[6px] rounded-2xl rounded-tr-[2rem] rounded-br-md p-8 transition-all transform-gpu duration-300 flex flex-col gap-6 group overflow-hidden relative",
                      isDark 
                        ? "bg-gradient-to-r from-[#0b1120]/95 to-[#070b14]/95 border-slate-800 border-l-cyan-500/30 hover:border-l-cyan-400 hover:from-[#0f1926]/95 shadow-[0_10px_30px_rgba(0,0,0,0.4)]"
                        : "bg-white border-black/5 border-l-cyan-500/40 hover:border-l-cyan-500 hover:bg-slate-50 shadow-xl"
                    )}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className={cn("w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center border transition-transform group-hover:scale-110", isDark ? "bg-cyan-500/10 border-cyan-500/20 shadow-inner" : "bg-cyan-50 border-cyan-200")}>
                        <IconComponent className={cn("w-8 h-8", isDark ? "text-cyan-400" : "text-cyan-600")} strokeWidth={1.5} />
                      </div>
                      <span className={cn("text-xs font-black px-3 py-1.5 rounded-lg border uppercase tracking-wider", isDark ? "text-zinc-500 bg-[#050B14] border-slate-800" : "text-slate-500 bg-slate-50 border-black/5")}>{cert.date}</span>
                    </div>
                    <div>
                      <h3 className={cn("text-xl font-bold mb-2 leading-tight", isDark ? "text-white" : "text-slate-900")}>{cert.title}</h3>
                      <p className={cn("text-base font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>{cert.org}</p>
                    </div>
                  </motion.div>
                );
              }) : (
                <div className={cn("col-span-2 text-center py-20 rounded-[2rem] border backdrop-blur-sm shadow-xl", isDark ? "bg-white/5 border-white/10" : "bg-white border-black/5")}>
                  <Trophy className={cn("w-16 h-16 mx-auto mb-6", isDark ? "text-zinc-600" : "text-slate-300")} />
                  <h3 className={cn("text-2xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No Certifications Yet</h3>
                  <p className={cn("font-medium text-lg", isDark ? "text-zinc-500" : "text-slate-500")}>Certifications will appear here once they are added.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
