"use client";

import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { Cloud, Zap, ShieldCheck, Shield, Terminal, ArrowRight, Cpu, Box, Globe, CheckCircle2, Database, MapPin, HardDrive, Activity, TrendingUp, Network, Server } from "lucide-react";
import VpsSpecSlider from "@/components/ui/VpsSpecSlider";
import Link from "next/link";
import { FadeIn } from "@/components/animations/FadeIn";
import { TiltCard } from "@/components/animations/TiltCard";
import { MagneticButton } from "@/components/animations/MagneticButton";
import { AnimatedBeam, OrbitalRings } from "@/components/animations/DeploymentAnimations";
import { ProvisioningSection } from "@/components/ui/ProvisioningSection";
import { FaqSection } from "@/components/ui/FaqSection";

const VPS_TERMINAL_LOGS = [
  { time: "00:01", module: "CONFIG", message: "Parsing instance specifications..." },
  { time: "00:02", module: "REGION", message: "Initializing resources in Sidoarjo Data Center..." },
  { time: "00:03", module: "COMPUTE", message: "Allocating scalable vCPU and RAM..." },
  { time: "00:04", module: "STORAGE", message: "Attaching high-speed SSD block storage..." },
  { time: "00:05", module: "NET", message: "Configuring VPC, NAT Gateway, and Firewall Rules..." },
  { time: "00:06", module: "BOOT", message: "Booting instance and passing health checks..." },
  { time: "00:07", module: "READY", message: "ssh root@masdika.node", isCommand: true },
];

const VPS_TERMINAL_STATS = [
  { value: "Custom", label: "FIREWALL" },
  { value: "Included", label: "NAT GATEWAY" },
  { value: "Included", label: "VPC PEERING" },
  { value: "Any", label: "OPEN PORTS" },
];



const VPS_FAQS = [
  {
    q: "Why is the Sidoarjo datacenter important?",
    a: "Having our servers locally in Sidoarjo, East Java guarantees ultra-low latency (under 20ms) across Indonesia, ensuring much faster response times compared to routing traffic to Singapore or the US."
  },
  {
    q: "Should I choose SSD or HDD?",
    a: "Select SSD if you are running databases, high-traffic websites, or applications requiring fast I/O. Opt for HDD if you need massive storage space for backups, file hosting, or archives at a lower cost."
  },
  {
    q: "What kind of applications can I run?",
    a: "Yes! You can run almost anything. Our high-core count Intel Xeon E5-2673v4 processors make these servers excellent for hosting websites, databases, VPNs, or custom backend applications. You have full root access to install whatever you need."
  },
  {
    q: "Do I get full root access and VNC?",
    a: "Absolutely. You get full root access via SSH, plus an out-of-band VNC Console directly in your dashboard, giving you total control to install packages, tweak the kernel, and configure the OS exactly to your requirements."
  },
  {
    q: "How can I expose my applications online with VPS NAT?",
    a: "Since the VPS NAT does not come with a dedicated public IP by default, you can easily use Cloudflare Tunnel (cloudflared) to securely expose your web services and applications to the internet without needing port forwarding."
  }
];



export default function VpsClient({ safePricing, isVpsEnabled }: { safePricing: any, isVpsEnabled: boolean }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className={cn("pt-24 md:pt-32 pb-20 px-4  selection:bg-cyan-500/30 font-sans overflow-hidden relative min-h-screen bg-transparent".trim(), isDark ? "text-white" : "text-slate-900")}>
      {/* Background Gradients */}
      <div className={cn("absolute inset-0 -z-20", isDark ? "bg-gradient-to-b from-[#050B14] via-[#09152a]/50 to-[#050B14]" : "bg-transparent")} />

      {/* Grid Pattern Background */}
      <div className={cn("absolute inset-0 bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 -z-10", isDark ? "bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)]" : "bg-[linear-gradient(to_right,#475569_1px,transparent_1px),linear-gradient(to_bottom,#475569_1px,transparent_1px)]")} />

      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute top-[40%] right-[-10%] w-[30%] h-[30%] bg-cyan-500/10 rounded-full blur-[120px]"></div>
      </div>

      <main className="relative z-10 max-w-[1400px] mx-auto">
        {/* Hero Section */}
        <section className="pt-10 pb-24 px-4 sm:px-6 max-w-5xl mx-auto text-center relative z-30">
          <FadeIn direction="up">
            <div className={cn("inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-black tracking-widest uppercase mb-8 shadow-sm", isDark ? "border-cyan-800/80 bg-cyan-950/30 text-cyan-400" : "border-cyan-200 bg-cyan-50 text-cyan-700")}>
              MASDIKA KVM CLOUD VPS
            </div>
          </FadeIn>

          <FadeIn direction="up" delay={0.1}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[76px] font-black mb-6 tracking-tight leading-[1.1]">
              High-Performance KVM <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-100 bg-clip-text text-transparent drop-shadow-sm">Cloud VPS Indonesia</span>
            </h1>
          </FadeIn>

          <FadeIn direction="up" delay={0.2}>
            <p className={cn(" text-lg md:text-xl max-w-3xl mx-auto mb-10 leading-relaxed font-medium px-2".trim(), isDark ? "text-zinc-400" : "text-slate-600")}>
              Deploy scalable, lightning-fast KVM cloud instances in seconds. Located securely in Sidoarjo, engineered for intensive workloads with dedicated kernel isolation and under 20ms latency across Indonesia.
            </p>
          </FadeIn>

          <FadeIn direction="up" delay={0.3}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-[280px] sm:max-w-none mx-auto">
              <MagneticButton intensity={15} className="w-full sm:w-auto flex">
                <Link
                  href="#pricing"
                  className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 w-full"
                >
                  Deploy Now
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </MagneticButton>

              <MagneticButton intensity={15} className="w-full sm:w-auto flex">
                <Link
                  href="#features"
                  className={cn("px-8 py-4 border font-bold rounded-xl transition-all flex items-center justify-center w-full", isDark ? "bg-white/5 hover:bg-white/10 border-white/10 text-white" : "bg-white hover:bg-slate-50 border-slate-200 text-slate-900")}
                >
                  Explore Features
                </Link>
              </MagneticButton>
            </div>
          </FadeIn>

          <FadeIn direction="up" delay={0.4}>
                        {/* Trust badges */}
            <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-4 mt-16 max-w-4xl mx-auto")}>
              {[
                { icon: Cloud, title: "98.99% SLA", sub: "Uptime Guarantee" },
                { icon: ShieldCheck, title: "Enterprise Security", sub: "Anti-DDoS Protected" },
                { icon: CheckCircle2, title: "Proven Reliability", sub: "Trusted by Developers" },
                { icon: Activity, title: "24/7 Support", sub: "Expert Assistance" },
              ].map((b, i) => (
                <div key={i} className={cn("flex items-center gap-3 p-4 rounded-xl border", isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-white border-slate-200 shadow-sm")}>
                  <b.icon className={cn("w-6 h-6 shrink-0", isDark ? "text-cyan-400" : "text-cyan-600")} />
                  <div className="text-left">
                    <span className={cn("font-bold text-sm leading-tight block", isDark ? "text-white" : "text-slate-900")}>{b.title}</span>
                    <span className={cn("text-[10px] uppercase tracking-wider font-bold", isDark ? "text-zinc-500" : "text-slate-500")}>{b.sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </section>

        {/* Hardware / Specs Section */}
        <section id="features" className="py-10 lg:py-16 px-4 sm:px-6 max-w-7xl mx-auto relative z-20">
          <div className={cn("backdrop-blur-md rounded-3xl p-6 md:p-12 border shadow-2xl relative overflow-hidden hover:border-cyan-400/50 transition-colors group", isDark ? "bg-gradient-to-br from-cyan-950/40 to-[#050B14]/40 border-cyan-500/20" : "bg-white border-slate-200 shadow-lg")}>
            <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <Cpu className="w-64 h-64 text-cyan-400" />
            </div>

            <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className={cn("font-black tracking-[0.2em] text-xs mb-4 inline-block uppercase px-3 py-1.5 rounded-lg", isDark ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20" : "text-cyan-700 bg-cyan-50 border border-cyan-200")}>Performance</span>
                <h2 className={cn("text-4xl md:text-5xl font-black  mb-6 leading-[1.2]".trim(), isDark ? "text-white" : "text-slate-900")}>
                  Engineered for <br className="hidden md:block" />
                  <span className="bg-gradient-to-r from-cyan-400 to-cyan-200 bg-clip-text text-transparent drop-shadow-sm">Extreme Power</span>
                </h2>
                <p className={cn(" text-lg leading-relaxed font-medium mb-8".trim(), isDark ? "text-zinc-400" : "text-slate-600")}>
                  We don't compromise on hardware. Every VPS instance is backed by enterprise-grade processors and localized routing (Sidoarjo Datacenter) ensuring multi-threaded applications run flawlessly with under 20ms latency.
                </p>

                <div className="space-y-4">
                  {[
                    "Dual Socket Dell PowerEdge Server",
                    "2x Intel Xeon E5-2673v4 Processors",
                    "Choose between Enterprise SATA SSD or SAS HDD",
                    "500Mbps Shared Bandwidth",
                  ].map((item, i) => (
                    <div key={i} className={cn("flex items-center gap-4 p-4 rounded-2xl border", isDark ? "bg-cyan-950/30 border-cyan-500/10" : "bg-slate-50 border-slate-200")}>
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", isDark ? "bg-cyan-500/20" : "bg-cyan-50 border border-cyan-200")}>
                        <CheckCircle2 className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-600")} />
                      </div>
                      <span className={cn("font-bold tracking-wide", isDark ? "text-white" : "text-slate-900")}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-6">
                <div className={cn("backdrop-blur-md border p-4 sm:p-8 rounded-2xl sm:rounded-3xl text-center group-hover:border-cyan-500/30 transition-colors shadow-xl flex flex-col items-center justify-center", isDark ? "bg-[#0b1120]/80 border-white/10" : "bg-white border-slate-200")}>
                  <div className="text-3xl sm:text-5xl font-black bg-gradient-to-r from-cyan-400 to-cyan-200 bg-clip-text text-transparent mb-1 sm:mb-2">40</div>
                  <div className="text-[10px] sm:text-xs font-bold uppercase tracking-widest" style={{color: isDark ? '#71717a' : '#64748b'}}>Physical Cores</div>
                </div>
                <div className={cn("backdrop-blur-md border p-4 sm:p-8 rounded-2xl sm:rounded-3xl text-center group-hover:border-cyan-500/30 transition-colors shadow-xl flex flex-col items-center justify-center", isDark ? "bg-[#0b1120]/80 border-white/10" : "bg-white border-slate-200")}>
                  <div className="text-3xl sm:text-5xl font-black bg-gradient-to-r from-cyan-400 to-cyan-200 bg-clip-text text-transparent mb-1 sm:mb-2">80</div>
                  <div className="text-[10px] sm:text-xs font-bold uppercase tracking-widest" style={{color: isDark ? '#71717a' : '#64748b'}}>Threads</div>
                </div>
                <div className={cn("backdrop-blur-md border p-4 sm:p-8 rounded-2xl sm:rounded-3xl text-center flex flex-col items-center justify-center group-hover:border-cyan-500/30 transition-colors shadow-xl", isDark ? "bg-[#0b1120]/80 border-white/10" : "bg-white border-slate-200")}>
                  <div className={cn("w-10 h-10 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-4 border", isDark ? "bg-cyan-500/20 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                    <HardDrive className={cn("w-5 h-5 sm:w-8 sm:h-8", isDark ? "text-cyan-400" : "text-cyan-600")} />
                  </div>
                  <div className="text-[10px] sm:text-xs font-bold uppercase tracking-widest" style={{color: isDark ? '#71717a' : '#64748b'}}>SSD / HDD</div>
                </div>
                <div className={cn("backdrop-blur-md border p-4 sm:p-8 rounded-2xl sm:rounded-3xl text-center flex flex-col items-center justify-center group-hover:border-cyan-500/30 transition-colors shadow-xl", isDark ? "bg-[#0b1120]/80 border-white/10" : "bg-white border-slate-200")}>
                  <div className={cn("w-10 h-10 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-4 border", isDark ? "bg-cyan-500/20 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                    <MapPin className={cn("w-5 h-5 sm:w-8 sm:h-8", isDark ? "text-cyan-400" : "text-cyan-600")} />
                  </div>
                  <div className="text-[10px] sm:text-xs font-bold uppercase tracking-widest" style={{color: isDark ? '#71717a' : '#64748b'}}>Sidoarjo</div>
                </div>
                <div className={cn("col-span-2 backdrop-blur-md border p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex items-center justify-between group-hover:border-cyan-500/40 transition-colors shadow-xl", isDark ? "bg-gradient-to-br from-cyan-950/40 to-[#0b1120]/80 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/20 shrink-0">
                      <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
                    </div>
                    <div className="text-left">
                      <div className={cn("text-sm sm:text-base font-bold ".trim(), isDark ? "text-white" : "text-slate-900")}>95% Network Uptime</div>
                      <div className={cn("text-[10px] sm:text-xs  mt-0.5".trim(), isDark ? "text-zinc-400" : "text-slate-600")}>Enterprise-grade reliability</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Spec Slider Section */}
        <section id="pricing" className="py-10 lg:py-16 px-0 sm:px-6 max-w-[1200px] mx-auto relative z-20">
          <div className="text-center max-w-3xl mx-auto mb-16 px-6 sm:px-0">
            <div className={cn("inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-black tracking-widest uppercase mb-8 shadow-sm", isDark ? "border-cyan-800/80 bg-cyan-950/30 text-cyan-400" : "border-cyan-200 bg-cyan-50 text-cyan-700")}>
              Pricing
            </div>
            <h2 className={cn("text-4xl md:text-5xl font-black  leading-tight mb-6".trim(), isDark ? "text-white" : "text-slate-900")}>
              Flexible Billing Options
            </h2>
            <p className={cn(" text-lg leading-relaxed font-medium mb-8".trim(), isDark ? "text-zinc-400" : "text-slate-600")}>
              Choose Pay-As-You-Go (hourly) billing. Simply top up your deposit balance to get started and deploy your server instantly.
            </p>
            <div className={cn("inline-block px-5 py-3 rounded-2xl bg-cyan-950/30 backdrop-blur-md border border-cyan-500/20  text-sm font-medium shadow-xl".trim(), isDark ? "text-white" : "text-slate-900")}>
              <span className="font-bold text-cyan-400 mr-2">Note:</span>
              By default, all VPS are provisioned with NAT IPv4. Dedicated IPs are available via support ticket.
            </div>
          </div>

          <VpsSpecSlider pricing={safePricing} serviceType="VPS" isDisabled={!isVpsEnabled} />

          <div className="max-w-4xl mx-auto mt-12 grid sm:grid-cols-2 gap-x-12 gap-y-8 px-4 sm:px-0">
            <div className="flex gap-4">
              <ShieldCheck className="w-6 h-6 text-cyan-500 shrink-0 mt-1" />
              <div>
                <h4 className={cn(" font-bold text-lg mb-1".trim(), isDark ? "text-white" : "text-slate-900")}>Isolated Resources</h4>
                <p className={cn(" text-sm leading-relaxed".trim(), isDark ? "text-zinc-400" : "text-slate-600")}>Dedicated resources - zero noisy neighbors.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <Terminal className="w-6 h-6 text-cyan-500 shrink-0 mt-1" />
              <div>
                <h4 className={cn(" font-bold text-lg mb-1".trim(), isDark ? "text-white" : "text-slate-900")}>Full Root Access</h4>
                <p className={cn(" text-sm leading-relaxed".trim(), isDark ? "text-zinc-400" : "text-slate-600")}>Custom OS - install apps as needed.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <TrendingUp className="w-6 h-6 text-cyan-500 shrink-0 mt-1" />
              <div>
                <h4 className={cn(" font-bold text-lg mb-1".trim(), isDark ? "text-white" : "text-slate-900")}>Flexible Upgrades</h4>
                <p className={cn(" text-sm leading-relaxed".trim(), isDark ? "text-zinc-400" : "text-slate-600")}>Scale anytime - add CPU, RAM, or storage.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <Shield className="w-6 h-6 text-cyan-500 shrink-0 mt-1" />
              <div>
                <h4 className={cn(" font-bold text-lg mb-1".trim(), isDark ? "text-white" : "text-slate-900")}>Full Virtualization</h4>
                <p className={cn(" text-sm leading-relaxed".trim(), isDark ? "text-zinc-400" : "text-slate-600")}>KVM-based - separate kernel for each VPS.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Supported OS Section */}
        <section className="py-16 lg:py-24 relative z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className={cn("text-3xl md:text-4xl font-black  mb-4".trim(), isDark ? "text-white" : "text-slate-900")}>Available Operating Systems</h2>
              <p className={cn(" font-medium text-lg".trim(), isDark ? "text-zinc-400" : "text-slate-600")}>Deploy your instance with your preferred OS in seconds.</p>
            </div>
            <div className={cn("relative overflow-hidden flex w-full backdrop-blur-sm border rounded-[2rem] p-6 shadow-2xl group [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]", isDark ? "bg-white/5 border-white/10" : "bg-white border-slate-200")}>
              <div className="flex whitespace-nowrap animate-marquee shrink-0 items-center gap-12 sm:gap-20 min-w-full pr-12 sm:pr-20 group-hover:[animation-play-state:paused]">
                {[
                  { name: "AlmaLinux", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/almalinux/almalinux-original.svg" },
                  { name: "CloudLinux OS", icon: "https://cdn.worldvectorlogo.com/logos/cloudlinux.svg" },
                  { name: "Debian", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/debian/debian-original.svg" },
                  { name: "Ubuntu", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/ubuntu/ubuntu-original.svg" },
                  { name: "Windows Server", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/windows8/windows8-original.svg" },
                ].map((os, idx) => (
                  <div key={`os-1-${idx}`} className="flex items-center gap-3 md:gap-4 transition-transform duration-300 cursor-default">
                    <img referrerPolicy="no-referrer" src={os.icon} alt={os.name} className="h-8 w-8 md:h-10 md:w-10" loading="lazy" decoding="async" />
                    <span className={cn(" font-bold text-lg md:text-2xl tracking-tight".trim(), isDark ? "text-white" : "text-slate-900")}>{os.name}</span>
                  </div>
                ))}
              </div>
              <div className="flex whitespace-nowrap animate-marquee shrink-0 items-center gap-12 sm:gap-20 min-w-full pr-12 sm:pr-20 group-hover:[animation-play-state:paused]" aria-hidden="true">
                {[
                  { name: "AlmaLinux", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/almalinux/almalinux-original.svg" },
                  { name: "CloudLinux OS", icon: "https://cdn.worldvectorlogo.com/logos/cloudlinux.svg" },
                  { name: "Debian", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/debian/debian-original.svg" },
                  { name: "Ubuntu", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/ubuntu/ubuntu-original.svg" },
                  { name: "Windows Server", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/windows8/windows8-original.svg" },
                ].map((os, idx) => (
                  <div key={`os-2-${idx}`} className="flex items-center gap-3 md:gap-4 transition-transform duration-300 cursor-default">
                    <img referrerPolicy="no-referrer" src={os.icon} alt={os.name} className="h-8 w-8 md:h-10 md:w-10" loading="lazy" decoding="async" />
                    <span className={cn(" font-bold text-lg md:text-2xl tracking-tight".trim(), isDark ? "text-white" : "text-slate-900")}>{os.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="py-10 lg:py-16 relative z-20">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className={cn("inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-black tracking-widest uppercase mb-8 shadow-sm", isDark ? "border-cyan-800/80 bg-cyan-950/30 text-cyan-400" : "border-cyan-200 bg-cyan-50 text-cyan-700")}>
                Use Cases
              </div>
              <h2 className={cn("text-4xl md:text-5xl font-black  mb-6 leading-tight".trim(), isDark ? "text-white" : "text-slate-900")}>
                Built for Modern Workloads
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {[
                { icon: Box, title: "Docker & Containers", desc: "Perfectly optimized for running containerized applications. Leverage our high-thread CPU for orchestration and microservices." },
                { icon: Globe, title: "High-Traffic Web Hosting", desc: "Host your Next.js, Laravel, or WordPress applications. With dedicated resources, your sites stay fast and responsive." },
                { icon: Database, title: "Database Clusters", desc: "Run MySQL, PostgreSQL, or Redis with confidence. Our enterprise-grade SSD storage ensures high IOPS for database-heavy workloads." }
              ].map((srv, idx) => (
                <TiltCard key={idx} intensity={5} className={cn("backdrop-blur-md p-8 md:p-10 rounded-3xl border hover:border-cyan-500/30 transition-colors duration-300 transform-gpu h-full flex flex-col shadow-xl group", isDark ? "bg-[#0b1120]/80 border-white/10 hover:bg-[#0f1926]" : "bg-white border-slate-200 hover:border-cyan-300 hover:shadow-md")}>
                  <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-8 transition-transform group-hover:scale-110 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                    <srv.icon className={cn("w-8 h-8", isDark ? "text-cyan-400" : "text-cyan-600")} />
                  </div>
                  <h3 className={cn("text-2xl font-bold  mb-4".trim(), isDark ? "text-white" : "text-slate-900")}>{srv.title}</h3>
                  <p className={cn(" font-medium leading-relaxed mb-8 flex-1".trim(), isDark ? "text-zinc-400" : "text-slate-600")}>{srv.desc}</p>
                </TiltCard>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className={cn("py-10 lg:py-16 relative z-20 transition-colors", isDark ? "bg-[#09152a]/30" : "bg-slate-50")}>
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className={cn("inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-black tracking-widest uppercase mb-8 shadow-sm", isDark ? "border-cyan-800/80 bg-cyan-950/30 text-cyan-400" : "border-cyan-200 bg-cyan-50 text-cyan-700")}>
                Features
              </div>
              <h2 className={cn("text-4xl md:text-5xl font-black  mb-6 leading-tight".trim(), isDark ? "text-white" : "text-slate-900")}>Everything you need</h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {[
                { icon: Zap, title: "SSD & HDD Options", desc: "Choose SSD for database-heavy workloads or HDD for cheap mass storage." },
                { icon: ShieldCheck, title: "DDoS Protection", desc: "Enterprise-grade DDoS mitigation included free of charge to keep your apps online." },
                { icon: Terminal, title: "Root & VNC Access", desc: "Total control over your environment. Connect via SSH or use the built-in VNC Console directly from your dashboard." },
                { icon: Cloud, title: "98.99% Uptime SLA", desc: "Highly available infrastructure with automatic failover ensures maximum reliability." },
                { icon: TrendingUp, title: "Seamless Upgrades", desc: "Easily upgrade your server specifications (CPU, RAM, and Storage) anytime your business grows." },
                { icon: Network, title: "Virtual Private Cloud", desc: "Create isolated private networks to securely deploy your instances without public internet exposure." },
                { icon: Server, title: "VPC Peering", desc: "Connect multiple VPS servers securely over a fast internal network with zero egress costs." },
                { icon: Activity, title: "High-Speed Networking", desc: "Experience ultra-low latency and blazing fast throughput across our local datacenter." }
              ].map((feat, i) => (
                <FadeIn key={i} delay={i * 0.1} direction="up" className="h-full">
                  <div className={cn("backdrop-blur-sm border p-8 rounded-3xl hover:bg-white/10 transition-colors flex flex-col shadow-xl h-full group aspect-square", isDark ? "bg-white/5 border-white/10" : "bg-white border-slate-200 hover:border-cyan-200 hover:shadow-md")}>
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center shadow-lg mb-6 group-hover:scale-110 transition-transform">
                      <feat.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className={cn("text-xl font-bold  mb-3".trim(), isDark ? "text-white" : "text-slate-900")}>{feat.title}</h3>
                    <p className={cn(" font-medium leading-relaxed".trim(), isDark ? "text-zinc-400" : "text-slate-600")}>{feat.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className={cn("py-16 lg:py-24 relative z-20 transition-colors", isDark ? "bg-gradient-to-b from-transparent to-[#09152a]/50" : "bg-gradient-to-b from-transparent to-slate-50")}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className={cn("inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-black tracking-widest uppercase mb-6 shadow-sm", isDark ? "border-cyan-800/80 bg-cyan-950/30 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
                Deployment Process
              </div>
              <h2 className={cn("text-4xl md:text-5xl font-black  leading-tight mb-6".trim(), isDark ? "text-white" : "text-slate-900")}>
                Go Live in 3 Simple Steps
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8 relative">
              {/* Connecting Line Container */}
              <div className={cn("hidden md:block absolute top-10 left-[15%] right-[15%] h-[2px]  overflow-hidden rounded-full".trim(), isDark ? "bg-white/5 text-zinc-400" : "bg-slate-100 text-slate-600")}>
                <AnimatedBeam />
              </div>

              {[
                { step: "01", title: "Choose Specifications", desc: "Select the CPU, RAM, and storage size that fits your application's requirements perfectly." },
                { step: "02", title: "Top Up Balance", desc: "Add funds to your account seamlessly. You only pay for the exact resources you allocate." },
                { step: "03", title: "Deploy Instantly", desc: "Your high-performance cloud instance will be provisioned and ready to use in less than 60 seconds." }
              ].map((item, i) => (
                <FadeIn key={i} delay={i * 0.2} direction="up" className="relative group">
                  <div className={cn("backdrop-blur-md border  p-8 rounded-3xl text-center shadow-xl hover:border-cyan-500/30 transition-colors h-full flex flex-col relative z-10", isDark ? "bg-[#0b1120]/80 backdrop-blur-md border border-white/10 shadow-xl" : "bg-white border border-black/5 shadow-xl")}>

                    {/* Animated Step Circle */}
                    <div className={cn("w-20 h-20 mx-auto rounded-full border flex items-center justify-center mb-8 relative shadow-[0_0_30px_rgba(6,182,212,0.1)] group-hover:scale-110 transition-transform duration-500", isDark ? "bg-[#0b1120] border-cyan-900/50" : "bg-white border-cyan-200")}>
                      <OrbitalRings />
                      <span className={cn("relative z-10 text-3xl font-black bg-clip-text text-transparent", isDark ? "bg-gradient-to-br from-white to-zinc-400" : "bg-gradient-to-br from-cyan-600 to-cyan-400")}>{item.step}</span>
                    </div>

                    <h3 className={cn("text-xl font-bold  mb-4".trim(), isDark ? "text-white" : "text-slate-900")}>{item.title}</h3>
                    <p className={cn(" font-medium leading-relaxed".trim(), isDark ? "text-zinc-400" : "text-slate-600")}>{item.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        <ProvisioningSection 
          subtitle="READY TO START?"
          title="One click, instant server deployment."
          description="Our panel handles complex provisioning in the background. Simply select your specifications, pay strictly for what you use, and connect via SSH instantly."
          buttonText="Open Dashboard"
          buttonHref="/dashboard"
          logs={VPS_TERMINAL_LOGS}
          stats={VPS_TERMINAL_STATS}
          terminalTitle="PROVISIONING CLOUD VPS"
          iconType="vps"
        />

        {/* Final CTA Section */}
        <section className="py-20 lg:py-32 relative z-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className={cn("backdrop-blur-xl border rounded-[2.5rem] p-10 md:p-16 text-center shadow-2xl relative overflow-hidden group", isDark ? "bg-gradient-to-br from-cyan-900/40 via-[#0a1526]/80 to-[#050b14]/90 border-cyan-500/20" : "bg-white border-slate-200 shadow-xl")}>
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
              <div className="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

              <div className="relative z-10">
                <h2 className={cn("text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight", isDark ? "text-white" : "text-slate-900")}>
                  Ready to experience <br className="hidden md:block" />
                  <span className={cn("bg-clip-text text-transparent bg-gradient-to-r", isDark ? "from-cyan-400 to-cyan-100" : "from-cyan-600 to-cyan-400")}>true performance?</span>
                </h2>
                <p className={cn("text-lg md:text-xl font-medium max-w-2xl mx-auto mb-10 leading-relaxed", isDark ? "text-zinc-300" : "text-slate-600")}>
                  Join thousands of developers deploying workloads on Masdika Cloud today. Start scaling without limits.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
                  <MagneticButton intensity={20} className="w-full sm:w-auto flex">
                    <Link
                      href="/dashboard/checkout"
                      className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all gap-2 w-full"
                    >
                      Deploy Your Server
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </MagneticButton>
                </div>
              </div>
            </div>
          </div>
        </section>

        <FaqSection faqs={VPS_FAQS} />
      </main>
    </div>
  );
}

