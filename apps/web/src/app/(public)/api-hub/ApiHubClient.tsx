"use client";

import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import Link from "next/link";
import { formatRupiah } from "@/lib/billing";
import { Star, ChevronRight, ChevronDown, Zap, Code, Shield, Cpu, Image as ImageIcon, MessageSquare, Download, CheckCircle2, Rocket, Cloud, ShieldCheck, Activity, ArrowRight } from "lucide-react";
import { FadeIn } from "@/components/animations/FadeIn";
import { TiltCard } from "@/components/animations/TiltCard";
import { MagneticButton } from "@/components/animations/MagneticButton";
import { AnimatedBeam, OrbitalRings } from "@/components/animations/DeploymentAnimations";
import { ProvisioningSection } from "@/components/ui/ProvisioningSection";
import { FaqSection } from "@/components/ui/FaqSection";

const API_HUB_LOGS = [
  { time: "00:01", module: "CONFIG", message: "Validating API schema and endpoints..." },
  { time: "00:02", module: "ENV", message: "Configuring isolated endpoint environment..." },
  { time: "00:03", module: "GATEWAY", message: "Deploying scalable API Gateway..." },
  { time: "00:04", module: "CACHE", message: "Deploying Redis cache edge nodes..." },
  { time: "00:05", module: "READY", message: "curl https://api.masdika.id/v1/health", isCommand: true },
];

const API_HUB_STATS = [
  { value: "Unlimited", label: "API KEYS" },
  { value: "Instant", label: "PROVISIONING" },
  { value: "Redis", label: "EDGE CACHING" },
  { value: "Any", label: "ENDPOINTS" },
];

const API_HUB_FAQS = [
  {
    q: "How does the API Hub work?",
    a: "The API Hub is a marketplace where you can discover and integrate various public and private APIs. Once you order, you get instant access to the endpoints and can generate unlimited API keys to use in your applications."
  },
  {
    q: "Is there a limit on API requests?",
    a: "It depends on the plan you choose. Each plan has a monthly quota. We provide built-in edge caching which can help reduce the load and latency for repetitive requests."
  },
  {
    q: "Are the API keys secure?",
    a: "Yes, you can generate isolated API keys and revoke them at any time. All endpoints are protected by enterprise-grade security and delivered over HTTPS."
  }
];

export default function ApiHubClient({ initialProjects, initialPlans }: { initialProjects: any[], initialPlans: any[] }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [projects, setProjects] = useState<any[]>(initialProjects);
  const [plans, setPlans] = useState<any[]>(initialPlans);
  const [activeCategory, setActiveCategory] = useState("All");
  const [activePricingTab, setActivePricingTab] = useState<string>(
    initialPlans.length > 0 ? Array.from(new Set(initialPlans.map((p: any) => p.service)))[0] as string : ""
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const categories = ["All", ...Array.from(new Set(projects.map((p: any) => p.category)))];

  const filteredProjects = activeCategory === "All"
    ? projects
    : projects.filter(p => p.category === activeCategory);

  const recommended = projects.filter(p => p.isPremium).slice(0, 3);
  const latest = filteredProjects;

  const getIcon = (iconStr: string) => {
    switch (iconStr) {
      case 'echo': return <Code className="w-5 h-5" />;
      case 'key': return <Shield className="w-5 h-5" />;
      case 'bot': return <Cpu className="w-5 h-5" />;
      case 'instagram': return <ImageIcon className="w-5 h-5" />;
      case 'whatsapp': return <MessageSquare className="w-5 h-5" />;
      case 'download': return <Download className="w-5 h-5" />;
      default: return <Zap className="w-5 h-5" />;
    }
  };

  return (
    <div className={cn("pt-24 md:pt-32 pb-20 px-4 relative overflow-hidden  bg-transparent min-h-screen".trim(), isDark ? "text-white" : "text-slate-900")}>


      <div className="max-w-[1400px] mx-auto relative z-10">

        {/* Hero Section */}
        <section className="pt-10 pb-8 px-6 max-w-5xl mx-auto text-center">
          <span className={cn("font-black tracking-[0.2em] text-xs mb-4 inline-block uppercase px-4 py-2 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.15)]", isDark ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20" : "text-cyan-600 bg-cyan-50 border border-cyan-200")}>
            Public API Directory
          </span>

          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black mb-6 tracking-tight leading-[1.1]">
            Discover Powerful <br className="hidden sm:block" /><span className="bg-gradient-to-r from-cyan-400 to-cyan-200 bg-clip-text text-transparent drop-shadow-sm">REST APIs</span>
          </h1>

          <p className={cn(" text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed font-medium".trim(), isDark ? "text-zinc-400" : "text-slate-600")}>
            Browse and test public REST APIs in the Masdika API Hub directory. Build powerful integrations and scale your applications faster.
          </p>

          <FadeIn direction="up" delay={0.3}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-[280px] sm:max-w-none mx-auto">
              <MagneticButton intensity={15} className="w-full sm:w-auto flex">
                <Link
                  href="/dashboard/api-hub"
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

        {/* Categories */}
        <div className="flex flex-wrap gap-3 mb-12 justify-center md:justify-start">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn("px-5 py-2.5 rounded-full text-sm font-bold transition-all", activeCategory === cat ? (isDark ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]" : "bg-cyan-50 text-cyan-600 border border-cyan-200 shadow-[0_0_15px_rgba(34,211,238,0.15)]") : (isDark ? "bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10 hover:text-white" : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 hover:text-slate-900"))}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* All APIs */}
        <div className="mb-20">

          {/* Latest APIs */}
          <div>
            <div className="mb-6">
              <h2 className={cn("text-2xl font-extrabold  flex items-center gap-2".trim(), isDark ? "text-white" : "text-slate-900")}>
                {activeCategory === "All" ? "Latest APIs" : `${activeCategory} APIs`}
              </h2>
              <p className={cn("text-sm font-medium", isDark ? "text-cyan-400/80" : "text-cyan-700")}>More APIs ready to use.</p>
            </div>
            {latest.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {latest.map(project => (
                  <ApiCard key={project.id} project={project} getIcon={getIcon} />
                ))}
              </div>
            ) : (
              <div className={cn("backdrop-blur-md rounded-3xl p-12 text-center shadow-xl", isDark ? "bg-[#0d1629] border border-slate-700/80 ring-1 ring-white/5 shadow-black/40" : "bg-white border border-slate-200 shadow-sm")}>
                <Code className="w-12 h-12 text-cyan-500/30 mx-auto mb-4" />
                <h3 className={cn("text-xl font-bold  mb-2".trim(), isDark ? "text-white" : "text-slate-900")}>No APIs found</h3>
                <p className="text-zinc-500">Check back later for more updates.</p>
              </div>
            )}
          </div>
        </div>

        {/* Features Section */}
        <section className="py-24 px-6 border-y border-cyan-500/10 relative mt-20">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Enterprise-Grade API Infrastructure</h2>
              <p className={cn(" max-w-2xl mx-auto".trim(), isDark ? "text-zinc-400" : "text-slate-600")}>Build with confidence using our reliable, fast, and scalable API platform designed for modern applications.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Zap,
                  title: "Ultra-Low Latency",
                  desc: "Our APIs are served from global edge locations, ensuring sub-millisecond response times worldwide.",
                  color: "text-cyan-400",
                  bgColor: "bg-cyan-500/20"
                },
                {
                  icon: Shield,
                  title: "Bank-Grade Security",
                  desc: "Every API request is encrypted in transit and authenticated securely using advanced key management.",
                  color: "text-cyan-400",
                  bgColor: "bg-cyan-500/20"
                },
                {
                  icon: Code,
                  title: "Developer Friendly",
                  desc: "Comprehensive documentation, interactive labs, and ready-to-use SDKs for seamless integration.",
                  color: "text-cyan-400",
                  bgColor: "bg-cyan-500/20"
                }
              ].map((feat, i) => (
                <FadeIn key={i} delay={i * 0.1} direction="up" className="h-full">
                  <TiltCard intensity={5} className={cn("p-8 rounded-3xl transition-all h-full shadow-xl", isDark ? "bg-[#0d1629] border border-slate-700/80 ring-1 ring-white/5 hover:border-cyan-500/50 hover:bg-[#111f38] shadow-black/40" : "bg-white border border-cyan-200 shadow-sm hover:border-cyan-400 hover:shadow-md")}>
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
        {plans.length > 0 && (
          <section id="pricing" className="pt-32 pb-10 px-6 max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Simple, Predictable Pricing</h2>
              <p className={cn("text-xl  max-w-2xl mx-auto".trim(), isDark ? "text-zinc-400" : "text-slate-600")}>Subscribe to individual APIs as you need them. No hidden fees or complex usage tiers.</p>
            </div>

            <div className="flex justify-center mb-16 w-full px-4">
              <div className="relative w-full max-w-sm">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={cn("w-full backdrop-blur-sm px-6 py-4 rounded-2xl flex items-center justify-between shadow-2xl transition-all font-bold", isDark ? "bg-[#0a1f33]/80 border border-white/10 hover:border-cyan-500/50 text-white" : "bg-white border border-slate-200 hover:border-cyan-400 text-slate-900")}
                >
                  <span className="truncate">{activePricingTab.replace(/_/g, ' ')}</span>
                  <ChevronDown className={`w-5 h-5 shrink-0 transition-transform ${isDropdownOpen ? 'rotate-180 text-cyan-500' : (isDark ? 'text-zinc-400' : 'text-slate-400')}`} />
                </button>

                {isDropdownOpen && (
                  <div className={cn("absolute top-full left-0 right-0 mt-2 backdrop-blur-xl rounded-2xl overflow-hidden z-50 max-h-[300px] overflow-y-auto custom-scrollbar", isDark ? "bg-[#0a1f33]/95 border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]" : "bg-white border border-slate-200 shadow-2xl")}>
                    {Array.from(new Set(plans.map((p: any) => p.service))).map((service) => (
                      <button
                        key={service as string}
                        onClick={() => {
                          setActivePricingTab(service as string);
                          setIsDropdownOpen(false);
                        }}
                        className={cn("w-full text-left px-6 py-3.5 text-sm font-bold transition-all border-l-2", activePricingTab === service ? (isDark ? "bg-cyan-500/20 text-cyan-400 border-cyan-500" : "bg-cyan-50 text-cyan-600 border-cyan-500") : (isDark ? "text-zinc-400 hover:bg-white/5 hover:text-white border-transparent" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-transparent"))}
                      >
                        {(service as string).replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-start max-w-6xl mx-auto justify-center">
              {plans.filter((p: any) => p.service === activePricingTab).map((plan, idx, arr) => {
                const isPopular = plan.isPopular;

                let specs = [];
                try {
                  if (plan.limits) {
                    const limits = typeof plan.limits === 'string' ? JSON.parse(plan.limits) : plan.limits;
                    if (limits.requests && limits.requests !== 'unlimited') specs.push(`${limits.requests.toString().toUpperCase()} API Requests`);
                    if (limits.requests === 'unlimited') specs.push(`Unlimited API Requests`);
                  }
                } catch (e) { }

                return (
                  <div
                    key={plan.id}
                    className={cn(
                      "relative rounded-[2rem] p-8 h-full transition-all shadow-xl",
                      isPopular
                        ? (isDark ? "bg-gradient-to-b from-[#0e172a] to-[#0a1324] border-2 border-cyan-400 ring-1 ring-white/10 shadow-black/50 transform md:-translate-y-4" : "bg-white border-[3px] border-cyan-400 shadow-xl transform md:-translate-y-4")
                        : (isDark ? "bg-[#0d1629] border border-slate-700/80 ring-1 ring-white/5 hover:border-cyan-500/50 hover:bg-[#111f38] shadow-black/40" : "bg-white border border-cyan-200 shadow-sm hover:border-cyan-400 hover:shadow-md")
                    )}
                  >
                    {isPopular && (
                      <div className={cn("absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-cyan-500 text-xs font-bold uppercase tracking-wider py-1.5 px-4 rounded-full", isDark ? "text-[#0a1929]" : "text-white shadow-md")}>
                        Most Popular
                      </div>
                    )}

                    <h3 className={cn("text-2xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>{plan.name}</h3>
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
                          <span className="text-zinc-300">{spec}</span>
                        </li>
                      ))}
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className={`w-5 h-5 shrink-0 ${isPopular ? 'text-cyan-400' : 'text-zinc-500'}`} />
                        <span className="text-zinc-300">98.99% Uptime SLA</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle2 className={`w-5 h-5 shrink-0 ${isPopular ? 'text-cyan-400' : 'text-zinc-500'}`} />
                        <span className="text-zinc-300">Premium Developer Support</span>
                      </li>
                    </ul>

                    <Link
                      href={`/dashboard/checkout?service=${plan.service.toLowerCase()}&plan=${plan.id}`}
                      className={`block w-full text-center py-4 rounded-xl font-bold transition-all group flex justify-center items-center gap-2 ${isPopular
                        ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                        : 'bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-400 border border-cyan-500/20'
                        }`}
                    >
                      <Rocket className="w-5 h-5 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                      Subscribe Now
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* How It Works Section */}
        <section className={cn("py-16 lg:py-24 relative z-20 transition-colors", isDark ? "bg-gradient-to-b from-transparent to-[#09152a]/50" : "bg-gradient-to-b from-transparent to-slate-50")}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className={cn("inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-black tracking-widest uppercase mb-6 shadow-sm", isDark ? "border-cyan-800/80 bg-cyan-950/30 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
                Integration Process
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
                { step: "01", title: "Browse APIs", desc: "Explore our comprehensive directory of public REST APIs across various categories." },
                { step: "02", title: "Generate Key", desc: "Register and generate your unique API key from the developer dashboard." },
                { step: "03", title: "Integrate & Go Live", desc: "Use our provided code snippets to integrate the API into your application instantly." }
              ].map((item, i) => (
                <FadeIn key={i} delay={i * 0.2} direction="up" className="relative group">
                  <div className={cn("backdrop-blur-md border p-8 rounded-3xl text-center shadow-xl hover:border-cyan-500/50 hover:bg-[#111f38] transition-colors h-full flex flex-col relative z-10", isDark ? "bg-[#0d1629] border-slate-700/80 ring-1 ring-white/5 shadow-black/40" : "bg-white border border-black/5 shadow-xl")}>

                    {/* Animated Step Circle */}
                    <div className={cn("w-20 h-20 mx-auto rounded-full border flex items-center justify-center mb-8 relative shadow-[0_0_30px_rgba(6,182,212,0.1)] group-hover:scale-110 transition-transform duration-500", isDark ? "bg-[#091122] border-slate-700/80" : "bg-white border-cyan-200")}>
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
          title="Instant API Deployment"
          description="Deploy and manage your APIs globally in seconds. Enjoy built-in edge caching and scalable infrastructure instantly."
          buttonText="Start Using API Hub"
          buttonHref="/dashboard"
          logs={API_HUB_LOGS}
          stats={API_HUB_STATS}
          iconType="api-hub"
        />

        <FaqSection faqs={API_HUB_FAQS} />
      </div>
    </div>
  );
}

function ApiCard({ project, getIcon }: { project: any, getIcon: (str: string) => any }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <Link href={`/api-hub/${project.slug}/lab`} className="group block h-full">
      <div className={cn("backdrop-blur-sm border hover:border-cyan-500/50 rounded-2xl p-6 transition-colors transform-gpu h-full flex flex-col relative overflow-hidden shadow-xl", isDark ? "bg-[#0d1629] border-slate-700/80 ring-1 ring-white/5 hover:bg-[#111f38] shadow-black/40" : "bg-white border-slate-200 shadow-xl")}>
        {/* Glow effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 via-cyan-500/0 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        <div className="flex justify-between items-start mb-4 relative z-10">
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform", isDark ? "bg-gradient-to-br from-cyan-500/20 to-cyan-500/20 border border-cyan-500/30 text-cyan-400" : "bg-cyan-50 border border-cyan-200 text-cyan-600")}>
            {getIcon(project.icon)}
          </div>
          <button className="text-zinc-500 hover:text-cyan-400 transition-colors">
            <Star className="w-5 h-5" />
          </button>
        </div>

        <h3 className={cn("text-lg font-bold mb-2 group-hover:text-cyan-400 transition-colors relative z-10 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
          {project.name}
        </h3>

        <p className={cn("text-sm leading-relaxed line-clamp-3 mb-6 relative z-10", isDark ? "text-zinc-400" : "text-slate-600")}>
          {project.description}
        </p>

        <div className="mt-auto flex items-center justify-between relative z-10">
          <span className={cn("text-xs font-bold px-3 py-1.5 rounded-full border", isDark ? "bg-white/5 text-zinc-300 border-white/10" : "bg-slate-100 text-slate-600 border-slate-200")}>
            {project.method}
          </span>
          <span className="text-cyan-400 flex items-center text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0">
            Lab <ChevronRight className="w-4 h-4 ml-1" />
          </span>
        </div>
      </div>
    </Link>
  );
}

