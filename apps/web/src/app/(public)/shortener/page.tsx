"use client";

import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Link2, Sparkles, Copy, ExternalLink, ShieldCheck, Shield, Zap, ArrowRight, Activity, Trash2, CheckCircle2, Lock, LayoutDashboard, Globe, Rocket, Cloud } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { formatRupiah } from "@/lib/billing";
import { FadeIn } from "@/components/animations/FadeIn";
import { TiltCard } from "@/components/animations/TiltCard";
import { MagneticButton } from "@/components/animations/MagneticButton";
import { AnimatedBeam, OrbitalRings } from "@/components/animations/DeploymentAnimations";
import { ProvisioningSection } from "@/components/ui/ProvisioningSection";
import { FaqSection } from "@/components/ui/FaqSection";

const SHORTENER_LOGS = [
  { time: "00:01", module: "CONFIG", message: "Validating target URL and custom alias..." },
  { time: "00:02", module: "DNS", message: "Propagating custom domain records..." },
  { time: "00:03", module: "ROUTER", message: "Configuring fast edge redirects..." },
  { time: "00:04", module: "ANALYTICS", message: "Initializing click tracking database..." },
  { time: "00:05", module: "READY", message: "https://masdika.id/custom", isCommand: true },
];

const SHORTENER_STATS = [
  { value: "Included", label: "CUSTOM DOMAIN" },
  { value: "Real-time", label: "ANALYTICS" },
  { value: "Active", label: "API ACCESS" },
  { value: "301/302", label: "REDIRECTS" },
];

const SHORTENER_FAQS = [
  {
    q: "Can I use my own domain?",
    a: "Yes, you can easily connect your own custom domain (e.g., link.yourcompany.com) to our shortener platform to create fully branded short links."
  },
  {
    q: "What kind of analytics do you track?",
    a: "We track real-time click volume, geographic locations, referral sources, device types, and browsers, giving you comprehensive insights into your audience."
  },
  {
    q: "Are the links permanent?",
    a: "Yes, the links you create are permanent and will never expire unless you manually delete them from your dashboard or set a custom expiration date."
  }
];

export default function ShortenerPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/public/plans")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const shortenerPlans = data.data.filter((p: any) => p.service === 'SHORTENER');
          setPlans(shortenerPlans);
        }
      })
      .catch(() => { });
  }, []);

  const getPlanSpecs = (plan: any) => {
    try {
      if (!plan.limits) return [];
      const limits = typeof plan.limits === 'string' ? JSON.parse(plan.limits) : plan.limits;
      let specs = [];
      if (limits.links && limits.links !== 'unlimited') specs.push(`${limits.links.toString().toUpperCase()} Custom Short Links`);
      if (limits.links === 'unlimited') specs.push(`Unlimited Custom Links`);
      return specs;
    } catch (e) {
      return [];
    }
  };

  return (
    <div className={cn("pt-24 md:pt-32 pb-20 px-4 selection:bg-cyan-500/30 font-sans overflow-hidden relative min-h-screen bg-transparent", isDark ? "text-white" : "text-slate-900")}>
      <main className="relative z-10 max-w-[1400px] mx-auto">
        {/* Hero Section */}
        <section className="pt-10 pb-8 px-6 max-w-5xl mx-auto text-center">
          <FadeIn direction="up">
            <span className={cn("font-black tracking-[0.2em] text-xs mb-4 inline-block uppercase px-4 py-2 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.15)]", isDark ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20" : "text-cyan-600 bg-cyan-50 border border-cyan-200")}>
              Premium URL Shortener
            </span>
          </FadeIn>

          <FadeIn direction="up" delay={0.1}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[76px] font-black mb-6 tracking-tight leading-[1.1]">
              Shorten. Share. <br className="hidden sm:block" /><span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-100 bg-clip-text text-transparent drop-shadow-sm">Track Everything.</span>
            </h1>
          </FadeIn>

          <FadeIn direction="up" delay={0.2}>
            <p className={cn(" text-lg md:text-xl max-w-3xl mx-auto mb-10 leading-relaxed font-medium px-2".trim(), isDark ? "text-zinc-400" : "text-slate-600")}>
              Create branded short links, track real-time analytics, and manage your URLs with our enterprise-grade shortening service. Built for high performance and reliability.
            </p>
          </FadeIn>

          <FadeIn direction="up" delay={0.3}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-[280px] sm:max-w-none mx-auto mb-16">
              <MagneticButton intensity={15} className="w-full sm:w-auto flex">
                <Link
                  href="/dashboard"
                  className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 w-full shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                >
                  Deploy Now
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </MagneticButton>

              <MagneticButton intensity={15} className="w-full sm:w-auto flex">
                <Link
                  href="#pricing"
                  className={cn("px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10  font-bold rounded-xl transition-all flex items-center justify-center w-full".trim(), isDark ? "text-white" : "text-slate-900")}
                >
                  View Pricing
                </Link>
              </MagneticButton>
            </div>
          </FadeIn>

          <FadeIn direction="up" delay={0.4}>
                        {/* Trust badges */}
            <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16 max-w-4xl mx-auto")}>
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

        {/* Features Section */}
        <section className="py-12 lg:py-16 px-6 border-y border-cyan-500/10 relative">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Enterprise-Grade Features</h2>
              <p className={cn(" max-w-2xl mx-auto".trim(), isDark ? "text-zinc-400" : "text-slate-600")}>Everything you need to build robust tracking applications without worrying about infrastructure limits.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Zap,
                  title: "Ultra-Fast Redirects",
                  desc: "Built on edge infrastructure, our short links redirect your users in milliseconds.",
                  color: "text-cyan-400",
                  bgColor: "bg-cyan-500/20"
                },
                {
                  icon: Link2,
                  title: "Auto-Generated Links",
                  desc: "Automatically generate short and unique links instantly without manual configuration.",
                  color: "text-cyan-400",
                  bgColor: "bg-cyan-500/20"
                },
                {
                  icon: Shield,
                  title: "Secure & Private",
                  desc: "Your data is safe, protected against spam, and highly reliable with 95% uptime.",
                  color: "text-cyan-400",
                  bgColor: "bg-cyan-500/20"
                }
              ].map((feat, i) => (
                <FadeIn key={i} delay={i * 0.1} direction="up" className="h-full">
                  <TiltCard intensity={5} className="bg-cyan-500/5 border border-cyan-500/30 p-8 rounded-3xl hover:bg-cyan-500/10 hover:border-cyan-400/50 transition-all h-full">
                    <div className={cn("w-14 h-14 flex items-center justify-center rounded-2xl mb-6", isDark ? `${feat.bgColor} ${feat.color}` : "bg-cyan-50 border border-cyan-200 text-cyan-600")}>
                      <feat.icon className="w-7 h-7" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{feat.title}</h3>
                    <p className={cn(" leading-relaxed".trim(), isDark ? "text-zinc-400" : "text-slate-600")}>{feat.desc}</p>
                  </TiltCard>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="pt-32 pb-10 px-6 max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Simple, Predictable Pricing</h2>
            <p className={cn("text-xl  max-w-2xl mx-auto".trim(), isDark ? "text-zinc-400" : "text-slate-600")}>Start for free, scale when you need more custom short links.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-start max-w-6xl mx-auto">
            {plans.map((plan: any, index: number) => {
              const isPopular = plan.isPopular;
              const specs = getPlanSpecs(plan);

              return (
                <FadeIn key={plan.id} delay={index * 0.1} direction="up" className="h-full">
                  <TiltCard
                    intensity={5}
                    className={cn( "relative rounded-[2rem] p-8 h-full transition-all", isPopular ? (isDark ? "bg-gradient-to-b from-cyan-900/40 to-[#0a1929] border border-cyan-400 transform md:-translate-y-4" : "bg-white border-[3px] border-cyan-400 shadow-xl transform md:-translate-y-4") : (isDark ? "bg-cyan-500/5 border border-cyan-500/30 hover:border-cyan-400/50 hover:bg-cyan-500/10" : "bg-white border border-cyan-200 shadow-sm hover:border-cyan-400 hover:shadow-md") )}
                  >
                    {isPopular && (
                      <div className={cn("absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-cyan-500 text-xs font-bold uppercase tracking-wider py-1.5 px-4 rounded-full", isDark ? "text-[#0a1929]" : "text-white shadow-md")}>
                        Most Popular
                      </div>
                    )}

                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                    <p className={cn(" text-sm mb-6 min-h-[40px]".trim(), isDark ? "text-zinc-400" : "text-slate-600")}>{plan.description}</p>

                    <div className={cn("mb-8 pb-8 border-b", isDark ? "border-white/10" : "border-slate-100")}>
                      <div className="flex items-baseline flex-wrap gap-1.5 md:gap-2">
                        <span className={cn("text-3xl lg:text-4xl font-extrabold tracking-tight  truncate".trim(), isDark ? "text-white" : "text-slate-900")}>{formatRupiah(plan.price)}</span>
                        <span className={cn(" text-sm md:text-base font-medium".trim(), isDark ? "text-zinc-400" : "text-slate-600")}>/month</span>
                      </div>
                    </div>

                    <ul className="space-y-4 mb-8">
                      {specs.map((spec: string, i: number) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircle2 className={`w-5 h-5 shrink-0 ${isPopular ? 'text-cyan-400' : 'text-zinc-500'}`} />
                          <span className={cn(isDark ? "text-zinc-300" : "text-slate-600")}>{spec}</span>
                        </li>
                      ))}
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className={`w-5 h-5 shrink-0 ${isPopular ? 'text-cyan-400' : 'text-zinc-500'}`} />
                        <span className={cn(isDark ? "text-zinc-300" : "text-slate-600")}>Basic Click Analytics</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className={`w-5 h-5 shrink-0 ${isPopular ? 'text-cyan-400' : 'text-zinc-500'}`} />
                        <span className={cn(isDark ? "text-zinc-300" : "text-slate-600")}>24/7 Priority Support</span>
                      </li>
                    </ul>

                    <Link
                      href={`/dashboard/checkout?service=SHORTENER&plan=${plan.id}`}
                      className={cn("block w-full mt-auto text-center py-4 rounded-xl font-bold transition-all group flex justify-center items-center gap-2", isPopular ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_20px_rgba(34,211,238,0.2)]" : (isDark ? "bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-400 border border-cyan-500/20" : "bg-cyan-50 hover:bg-cyan-100 text-cyan-600 border border-cyan-200"))}
                    >
                      <Rocket className="w-5 h-5 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                      Deploy
                    </Link>
                  </TiltCard>
                </FadeIn>
              );
            })}
          </div>
        </section>

        {/* How It Works Section */}
        <section className={cn("py-16 lg:py-24 relative z-20", isDark ? "bg-gradient-to-b from-transparent to-[#09152a]/50" : "bg-transparent")}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className={cn("inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-black tracking-widest uppercase mb-6 shadow-sm", isDark ? "border-cyan-800/80 bg-cyan-950/30 text-cyan-400" : "border-cyan-200 bg-cyan-50 text-cyan-700")}>
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
                { step: "01", title: "Paste Long URL", desc: "Enter your long, messy URL into the input field above." },
                { step: "02", title: "Auto-Generate Link", desc: "Our system automatically generates a short and unique link for you instantly." },
                { step: "03", title: "Share & Track", desc: "Share your branded short link and track real-time analytics in your dashboard." }
              ].map((item, i) => (
                <FadeIn key={i} delay={i * 0.2} direction="up" className="relative group">
                  <div className={cn("backdrop-blur-md border  p-8 rounded-3xl text-center shadow-xl hover:border-cyan-500/30 transition-colors h-full flex flex-col relative z-10", isDark ? "bg-[#0b1120]/80 backdrop-blur-md border border-white/10 shadow-xl" : "bg-white border border-black/5 shadow-xl")}>
                    
                    {/* Animated Step Circle */}
                    <div className={cn("w-20 h-20 mx-auto rounded-full border flex items-center justify-center mb-8 relative shadow-[0_0_30px_rgba(6,182,212,0.1)] group-hover:scale-110 transition-transform duration-500", isDark ? "bg-[#0b1120] border-cyan-900/50" : "bg-white border-cyan-200")}>
                      <OrbitalRings />
                      <span className={cn("relative z-10 text-3xl font-black bg-gradient-to-br bg-clip-text text-transparent", isDark ? "from-white to-zinc-400" : "from-cyan-600 to-cyan-400")}>{item.step}</span>
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
          title="Instant Link Generation"
          description="Create branded short links in seconds. We automatically configure fast edge redirects and real-time analytics tracking."
          buttonText="Shorten a Link"
          buttonHref="/dashboard"
          logs={SHORTENER_LOGS}
          stats={SHORTENER_STATS}
          iconType="shortener"
        />

        <FaqSection faqs={SHORTENER_FAQS} />
      </main>
    </div>
  );
}


