"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { 
  Boxes, 
  Rocket, 
  Sparkles, 
  Database, 
  Terminal, 
  Layers, 
  Globe, 
  ShieldCheck, 
  Zap, 
  GitBranch, 
  Cpu, 
  CheckCircle2, 
  Bell, 
  ArrowRight,
  Clock,
  ChevronRight
} from "lucide-react";
import { 
  SiNextdotjs, 
  SiNodedotjs, 
  SiPython, 
  SiWordpress, 
  SiDocker, 
  SiGhost, 
  SiStrapi, 
  SiFastapi 
} from "react-icons/si";
import { toast } from "sonner";

const UPCOMING_FRAMEWORKS = [
  { name: "Next.js", icon: SiNextdotjs, color: "text-zinc-100", category: "Full-Stack React" },
  { name: "Node.js", icon: SiNodedotjs, color: "text-emerald-400", category: "Backend Runtime" },
  { name: "Python FastAPI", icon: SiFastapi, color: "text-teal-400", category: "High-Performance API" },
  { name: "WordPress", icon: SiWordpress, color: "text-sky-400", category: "Headless & CMS" },
  { name: "Docker", icon: SiDocker, color: "text-blue-400", category: "Custom Containers" },
  { name: "Ghost", icon: SiGhost, color: "text-amber-400", category: "Modern Publishing" },
  { name: "Strapi", icon: SiStrapi, color: "text-indigo-400", category: "Headless CMS" },
];

export default function ManagedAppsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleNotifyMe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setIsSubscribed(true);
    toast.success("Thank you! We will notify you when Managed Apps launches.");
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-full">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-medium">
        <Link href="/dashboard" className="hover:text-cyan-400 transition-colors">
          Dashboard
        </Link>
        <ChevronRight className="w-3.5 h-3.5 opacity-50" />
        <span className={cn(isDark ? "text-zinc-200" : "text-slate-700", "font-semibold")}>
          Managed Apps
        </span>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className={cn("text-xl sm:text-2xl lg:text-3xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Managed Apps
            </h1>
            <span className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border",
              isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200"
            )}>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              Coming Soon
            </span>
          </div>
          <p className={cn("text-xs sm:text-sm font-medium mt-1.5 max-w-2xl leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
            Deploy full-stack applications, Docker containers, and modern frameworks with zero DevOps maintenance, automated Let&apos;s Encrypt SSL, and seamless database integration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/database/new"
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 border cursor-pointer",
              isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
            )}
          >
            <Database className="w-4 h-4 text-cyan-400" />
            <span>Deploy Database</span>
          </Link>
          <Link
            href="/dashboard/vps/create"
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 flex items-center justify-center gap-2 bg-cyan-400 hover:bg-cyan-300 active:scale-95 text-slate-950 shadow-md cursor-pointer"
          >
            <Rocket className="w-4 h-4" />
            <span>Deploy Cloud VPS</span>
          </Link>
        </div>
      </div>

      {/* Hero Announcement Card */}
      <div className={cn(
        "relative rounded-2xl sm:rounded-3xl border p-6 sm:p-8 lg:p-10 overflow-hidden shadow-xl",
        isDark 
          ? "bg-gradient-to-br from-zinc-950 via-[#0a0f1d] to-[#040814] border-white/10" 
          : "bg-gradient-to-br from-white via-cyan-50/40 to-slate-50 border-slate-200 shadow-slate-100"
      )}>
        {/* Decorative background glows */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4 border bg-cyan-500/10 border-cyan-500/20 text-cyan-400">
            <Sparkles className="w-3.5 h-3.5" />
            Platform-as-a-Service (PaaS) in Development
          </div>

          <h2 className={cn("text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight mb-3", isDark ? "text-white" : "text-slate-900")}>
            Ship Your Web Applications <br />
            <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-sky-300 bg-clip-text text-transparent">
              Without Managing Servers or Kubernetes.
            </span>
          </h2>

          <p className={cn("text-sm sm:text-base leading-relaxed mb-6 font-normal", isDark ? "text-zinc-300" : "text-slate-600")}>
            Managed Apps transforms code deployment into a frictionless experience. Push code via Git or deploy a Docker image, and our orchestrator handles container builds, load balancing, SSL termination, and horizontal autoscaling automatically.
          </p>

          {/* Subscription / Notification box */}
          <div className="max-w-md">
            {!isSubscribed ? (
              <form onSubmit={handleNotifyMe} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email to get early access..."
                  className={cn(
                    "px-4 py-2.5 rounded-xl text-xs sm:text-sm border focus:outline-none focus:ring-2 focus:ring-cyan-400/40 transition-all flex-1",
                    isDark 
                      ? "bg-white/5 border-white/10 text-white placeholder-zinc-500" 
                      : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"
                  )}
                  required
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-cyan-400 hover:bg-cyan-300 active:scale-95 text-slate-950 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Bell className="w-4 h-4" />
                  <span>Notify Me</span>
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs sm:text-sm font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>You&apos;re on the early-access waitlist! We will notify you once open.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feature Capabilities Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className={cn("text-base sm:text-lg font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            What to Expect from Managed Apps
          </h3>
          <span className="text-xs text-[var(--text-muted)] font-medium">
            Core Architecture
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: GitBranch,
              title: "Git-Powered Deployments",
              desc: "Connect your GitHub or GitLab repo. Every push to your production branch triggers an atomic zero-downtime release.",
            },
            {
              icon: Globe,
              title: "Automated SSL & Ingress",
              desc: "Bring custom domains with instant Let's Encrypt TLS certificates, HTTP/2 routing, and built-in Cloudflare integration.",
            },
            {
              icon: Database,
              title: "1-Click DB Connection",
              desc: "Native direct private network bridging with your Masdika Managed PostgreSQL, MySQL, Redis, or MongoDB instances.",
            },
            {
              icon: Cpu,
              title: "Resource Isolation",
              desc: "Dedicated CPU and RAM limits per container pod with automated health checks, rolling restarts, and crash loops recovery.",
            },
          ].map((feature, idx) => (
            <div
              key={idx}
              className={cn(
                "p-5 rounded-2xl border transition-all flex flex-col justify-between shadow-sm",
                isDark 
                  ? "border-white/10 bg-zinc-950/60 hover:border-cyan-500/30" 
                  : "border-slate-200 bg-white hover:border-cyan-400/50 shadow-2xs"
              )}
            >
              <div>
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-3.5">
                  <feature.icon className="w-4 h-4" />
                </div>
                <h4 className={cn("text-sm font-bold mb-1.5", isDark ? "text-white" : "text-slate-900")}>
                  {feature.title}
                </h4>
                <p className={cn("text-xs leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
                  {feature.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Supported Frameworks Preview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className={cn("text-base sm:text-lg font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Supported Frameworks &amp; Stacks
          </h3>
          <span className="text-xs text-[var(--text-muted)] font-medium">
            Roadmap Previews
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {UPCOMING_FRAMEWORKS.map((fw, idx) => (
            <div
              key={idx}
              className={cn(
                "p-4 rounded-xl border text-center flex flex-col items-center justify-center gap-2 transition-all",
                isDark 
                  ? "border-white/10 bg-zinc-950/40 hover:border-white/20" 
                  : "border-slate-200 bg-white hover:border-slate-300 shadow-2xs"
              )}
            >
              <fw.icon className={cn("w-7 h-7 object-contain", fw.color)} />
              <div>
                <div className={cn("text-xs font-bold", isDark ? "text-zinc-200" : "text-slate-800")}>
                  {fw.name}
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                  {fw.category}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Current Alternatives Card */}
      <div className={cn(
        "p-6 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-6",
        isDark ? "border-white/10 bg-zinc-950/40" : "border-slate-200 bg-slate-50"
      )}>
        <div>
          <h4 className={cn("text-sm sm:text-base font-bold mb-1", isDark ? "text-white" : "text-slate-900")}>
            Need to deploy your applications today?
          </h4>
          <p className={cn("text-xs sm:text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
            You can spin up an isolated Cloud VPS or deploy pre-configured 1-click applications via our App Catalog.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <Link
            href="/dashboard/catalog-apps"
            className={cn(
              "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all border cursor-pointer",
              isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-white" : "border-slate-200 bg-white hover:bg-slate-100 text-slate-800"
            )}
          >
            Browse App Catalog
          </Link>
          <Link
            href="/dashboard/vps/create"
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <span>Deploy Cloud VPS</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
