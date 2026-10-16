"use client";

import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

import { CheckCircle2, Clock, ShieldCheck, ArrowRight, Server, Cloud, Activity, Rocket } from "lucide-react";
import Link from "next/link";
import { formatRupiah } from "@/lib/billing";
import { FadeIn } from "@/components/animations/FadeIn";
import { TiltCard } from "@/components/animations/TiltCard";
import { MagneticButton } from "@/components/animations/MagneticButton";
import { AnimatedBeam, OrbitalRings } from "@/components/animations/DeploymentAnimations";
import { ProvisioningSection } from "@/components/ui/ProvisioningSection";
import { FaqSection } from "@/components/ui/FaqSection";

const CDN_LOGS = [
  { time: "00:01", module: "CONFIG", message: "Parsing file size and expiration limits..." },
  { time: "00:02", module: "ENCRYPT", message: "Encrypting file and generating secure token..." },
  { time: "00:03", module: "EDGE", message: "Distributing payload to high-speed edge nodes..." },
  { time: "00:04", module: "LINK", message: "Generating shareable download link..." },
  { time: "00:05", module: "READY", message: "curl https://cdn.masdika.id/dl/token", isCommand: true },
];

const CDN_STATS = [
  { value: "Edge", label: "DELIVERY SPEED" },
  { value: "E2E", label: "ENCRYPTION" },
  { value: "Auto", label: "EXPIRATION" },
  { value: "100MB", label: "MAX FILE SIZE" },
];

const CDN_FAQS = [
  {
    q: "How does the file expiration work?",
    a: "You can set an exact expiration time when generating the link. Once expired, the download link will instantly invalidate and the payload is securely scrubbed from our edge nodes."
  },
  {
    q: "Are the files encrypted?",
    a: "Yes, all files are encrypted in-transit using TLS 1.3 and at-rest across our edge network, ensuring complete data privacy."
  },
  {
    q: "Is there a limit to how many files I can share?",
    a: "You can share an unlimited number of files as long as each individual file is under the 100MB size limit."
  }
];

export default function FileCdnClient({ isEnabled = true }: { isEnabled?: boolean }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/public/plans")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const cdnPlans = data.data.filter((p: any) => p.service === 'CDN');
          setPlans(cdnPlans);
        }
      })
      .catch(() => { });
  }, []);

  const getPlanSpecs = (plan: any) => {
    try {
      if (!plan.limits) return [];
      const limits = typeof plan.limits === 'string' ? JSON.parse(plan.limits) : plan.limits;
      let specs = [];
      if (limits.storageGB) specs.push(`${limits.storageGB} GB CDN Storage`);
      if (limits.transferGB) specs.push(`${limits.transferGB} GB Bandwidth / mo`);
      if (limits.requests && limits.requests !== 'unlimited') specs.push(`${limits.requests.toString().toUpperCase()} Upload Requests`);
      return specs;
    } catch (e) {
      return [];
    }
  };

  return (
    <div className={cn("pt-24 md:pt-32 pb-20 px-4  selection:bg-cyan-500/30 font-sans overflow-hidden relative min-h-screen".trim(), isDark ? "text-white" : "text-slate-900")}>


      <main className="relative z-10 max-w-[1400px] mx-auto">
        {/* Hero Section */}
        <section className="pt-10 pb-8 px-6 max-w-5xl mx-auto text-center">
          <span className={cn("font-black tracking-[0.2em] text-xs mb-4 inline-block uppercase px-4 py-2 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.15)]", isDark ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20" : "text-cyan-600 bg-cyan-50 border border-cyan-200")}>
            Secure File CDN
          </span>

          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black mb-6 tracking-tight leading-[1.1]">
            Share Files with <br className="hidden sm:block" /><span className="bg-gradient-to-r from-cyan-400 to-cyan-200 bg-clip-text text-transparent drop-shadow-sm">Lightning Speed</span>
          </h1>

          <p className={cn(" text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed font-medium".trim(), isDark ? "text-zinc-400" : "text-slate-600")}>
            Deliver files instantly with sub-millisecond latency through our global edge network. We handle the caching, bandwidth scaling, and security so you can focus on building.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-[280px] sm:max-w-none mx-auto">
            <MagneticButton intensity={15} className="w-full sm:w-auto flex">
              {isEnabled ? (
                <Link
                  href="/dashboard"
                  className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 w-full shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                >
                  Deploy Now
                  <ArrowRight className="w-5 h-5" />
                </Link>
              ) : (
                <button disabled className={cn("px-8 py-4 bg-zinc-800  font-bold rounded-xl transition-all flex items-center justify-center gap-2 w-full shadow-[0_0_20px_rgba(34,211,238,0.2)] cursor-not-allowed border border-zinc-700".trim(), isDark ? "text-zinc-400" : "text-slate-600")}>
                  Coming Soon
                </button>
              )}
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


        {/* Features Section */}
        <section className="py-24 px-6 border-y border-cyan-500/10 relative">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Enterprise-Grade CDN Features</h2>
              <p className={cn(" max-w-2xl mx-auto".trim(), isDark ? "text-zinc-400" : "text-slate-600")}>Everything you need to deliver content globally without worrying about infrastructure limits.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Server,
                  title: "Global Edge Network",
                  desc: "Files are automatically cached at edge locations worldwide, delivering content with sub-millisecond latency."
                },
                {
                  icon: Clock,
                  title: "Temporary Storage",
                  desc: "Perfect for sharing quick files. Files are automatically securely wiped after their expiration period."
                },
                {
                  icon: ShieldCheck,
                  title: "Secure & Private",
                  desc: "Your data is encrypted in transit and at rest, protected against unauthorized access."
                }
              ].map((feat, i) => (
                <FadeIn key={i} delay={i * 0.1} direction="up" className="h-full">
                  <TiltCard intensity={5} className={cn("backdrop-blur-md p-8 rounded-3xl border transition-colors h-full flex flex-col shadow-xl", isDark ? "bg-[#0d1629] border-slate-700/80 ring-1 ring-white/5 hover:bg-[#111f38] hover:border-cyan-500/50 shadow-black/40" : "bg-white border-slate-200 hover:border-cyan-300 hover:shadow-md")}>
                    <div className={cn("w-14 h-14 flex items-center justify-center rounded-2xl mb-6", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border border-cyan-200")}>
                      <feat.icon className={cn("w-7 h-7", isDark ? "text-cyan-400" : "text-cyan-600")} />
                    </div>
                    <h3 className={cn("text-xl font-bold mb-3", isDark ? "text-white" : "text-slate-900")}>{feat.title}</h3>
                    <p className={cn("leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>{feat.desc}</p>
                  </TiltCard>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        {plans && plans.length > 0 && (
          <section id="pricing" className="pt-32 pb-10 px-6 max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Simple, Predictable Pricing</h2>
              <p className={cn("text-xl  max-w-2xl mx-auto".trim(), isDark ? "text-zinc-400" : "text-slate-600")}>Start for free, scale when you need more bandwidth and storage.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-start max-w-6xl mx-auto">
              {plans.map((plan: any, index: number) => {
                const isPopular = plan.isPopular;
                const specs = getPlanSpecs(plan);

                return (
                  <FadeIn key={plan.id} delay={index * 0.1} direction="up" className="h-full">
                    <TiltCard
                      intensity={5}
                      className={cn(
                        "relative rounded-[2rem] p-8 h-full transition-all shadow-xl",
                        isPopular
                          ? (isDark ? "bg-gradient-to-b from-[#0e172a] to-[#0a1324] border-2 border-cyan-400 ring-1 ring-white/10 shadow-black/50 transform md:-translate-y-4" : "bg-white border-[3px] border-cyan-400 shadow-xl transform md:-translate-y-4")
                          : (isDark ? "bg-[#0d1629] border border-slate-700/80 ring-1 ring-white/5 hover:border-cyan-500/50 hover:bg-[#111f38] shadow-black/40" : "bg-white border border-cyan-200 shadow-sm hover:border-cyan-400 hover:shadow-md")
                      )}
                    >
                      {isPopular && (
                        <div className={cn(
                          "absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-cyan-500 text-xs font-bold uppercase tracking-wider py-1.5 px-4 rounded-full",
                          isDark ? "text-[#0a1929]" : "text-white shadow-md"
                        )}>
                          Most Popular
                        </div>
                      )}

                      <h3 className={cn("text-2xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>{plan.name}</h3>
                      <p className={cn("text-sm mb-6 min-h-[40px]", isDark ? "text-zinc-400" : "text-slate-600")}>{plan.description}</p>

                      <div className={cn("mb-8 pb-8 border-b", isDark ? "border-white/10" : "border-slate-100")}>
                        <div className="flex items-baseline flex-wrap gap-1.5 md:gap-2">
                          <span className={cn("text-3xl lg:text-4xl font-extrabold tracking-tight truncate", isDark ? "text-white" : "text-slate-900")}>{formatRupiah(plan.price)}</span>
                          <span className={cn("text-sm md:text-base font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>/month</span>
                        </div>
                      </div>

                      <ul className="space-y-4 mb-8">
                        {specs.map((spec: string, i: number) => (
                          <li key={i} className="flex items-start gap-3">
                            <CheckCircle2 className={cn("w-5 h-5 shrink-0", isPopular ? "text-cyan-400" : (isDark ? "text-zinc-500" : "text-slate-400"))} />
                            <span className={cn(isDark ? "text-zinc-300" : "text-slate-600")}>{spec}</span>
                          </li>
                        ))}
                        <li className="flex items-start gap-3">
                          <CheckCircle2 className={cn("w-5 h-5 shrink-0", isPopular ? "text-cyan-400" : (isDark ? "text-zinc-500" : "text-slate-400"))} />
                          <span className={cn(isDark ? "text-zinc-300" : "text-slate-600")}>Global Edge Delivery</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle2 className={cn("w-5 h-5 shrink-0", isPopular ? "text-cyan-400" : (isDark ? "text-zinc-500" : "text-slate-400"))} />
                          <span className={cn(isDark ? "text-zinc-300" : "text-slate-600")}>24/7 Priority Support</span>
                        </li>
                      </ul>

                      {isEnabled ? (
                        <Link
                          href={`/dashboard/checkout?service=CDN&plan=${plan.id}`}
                          className={cn(
                            "block w-full mt-auto text-center py-4 rounded-xl font-bold transition-all group flex justify-center items-center gap-2",
                            isPopular
                              ? "bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                              : (isDark ? "bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-400 border border-cyan-500/20" : "bg-cyan-50 hover:bg-cyan-100 text-cyan-600 border border-cyan-200")
                          )}
                        >
                          <Rocket className="w-5 h-5 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                          Deploy
                        </Link>
                      ) : (
                        <button disabled className="block w-full mt-auto text-center py-4 rounded-xl font-bold transition-all flex justify-center items-center gap-2 bg-zinc-800/50 text-zinc-500 border border-zinc-700/50 cursor-not-allowed">
                          Coming Soon
                        </button>
                      )}
                    </TiltCard>
                  </FadeIn>
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
                { step: "01", title: "Upload Files", desc: "Select or drag & drop files up to 100MB for secure, temporary storage." },
                { step: "02", title: "Get Link", desc: "Instantly receive a shareable download link with expiration controls." },
                { step: "03", title: "Secure Delivery", desc: "Your file is delivered at edge speed and auto-deletes when expired." }
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
          title="Instant File Distribution"
          description="Upload files and instantly get a shareable, secure download link. Powered by our global edge network for lightning-fast delivery."
          buttonText="Start Sharing Files"
          buttonHref="/dashboard"
          logs={CDN_LOGS}
          stats={CDN_STATS}
          iconType="file-cdn"
        />

        <FaqSection faqs={CDN_FAQS} />
      </main>
    </div>
  );
}
