"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import {
  AppWindow,
  BookOpen,
  ChevronLeft,
  Code2,
  Cpu,
  ExternalLink,
  FileText,
  GitBranch,
  Globe,
  HardDrive,
  History,
  KeyRound,
  Layers,
  Lock,
  Plus,
  Rocket,
  Server,
  Settings,
  ShieldCheck,
  Terminal,
  Webhook,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

const DOC_SECTIONS = [
  { id: "overview", label: "Overview & Concepts", icon: BookOpen },
  { id: "sources", label: "Git & Docker Registry", icon: GitBranch },
  { id: "env-vars", label: "Environment Variables", icon: KeyRound },
  { id: "pre-deploy", label: "Pre-Deploy Migrations", icon: Rocket },
  { id: "menus", label: "Dashboard Menus Guide", icon: Layers },
  { id: "troubleshooting", label: "Tips & Troubleshooting", icon: AlertTriangle },
];

export default function AppPlatformDocsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [activeNav, setActiveNav] = useState("overview");

  const cardClass = cn(
    "rounded-2xl border p-5 sm:p-6 space-y-4 transition-all shadow-2xs scroll-mt-24",
    isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90"
  );

  const subCardClass = cn(
    "rounded-xl border p-4 space-y-2",
    isDark ? "bg-black/30 border-white/[0.06]" : "bg-slate-50 border-slate-200"
  );

  const codeBlockClass = cn(
    "rounded-xl border p-3.5 font-mono text-xs overflow-x-auto leading-relaxed",
    isDark ? "bg-[#090d16] border-white/10 text-zinc-200" : "bg-slate-900 border-slate-800 text-slate-100"
  );

  return (
    <div className="space-y-6 max-w-full pb-16">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <Link
            href="/dashboard/app-platform"
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-semibold transition-colors",
              isDark ? "text-zinc-400 hover:text-cyan-400" : "text-slate-600 hover:text-cyan-700"
            )}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Back to App Platform</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              App Platform Documentation
            </h1>
            <span className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap",
              isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200"
            )}>
              <AppWindow className="w-3 h-3" />
              <span>User Guide</span>
            </span>
          </div>
          <p className={cn("text-xs sm:text-sm max-w-2xl", isDark ? "text-zinc-400" : "text-slate-600")}>
            Complete guide to deploying containers, configuring environment variables, running pre-deploy migrations, and managing your applications on Masdika Cloud.
          </p>
        </div>

        <Link
          href="/dashboard/app-platform/new"
          className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 self-start sm:self-center inline-flex items-center gap-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Deploy New App</span>
        </Link>
      </div>

      {/* Main Responsive Grid: Sidebar TOC + Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sticky Table of Contents */}
        <aside className="lg:col-span-3 lg:sticky lg:top-24 min-w-0">
          <div className={cn(
            "rounded-2xl border p-3 space-y-1.5",
            isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90"
          )}>
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              On This Page
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-col gap-1.5">
              {DOC_SECTIONS.map((sec) => {
                const Icon = sec.icon;
                const active = activeNav === sec.id;
                return (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    onClick={() => setActiveNav(sec.id)}
                    className={cn(
                      "px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors min-w-0",
                      active
                        ? isDark
                          ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                          : "bg-cyan-50 text-cyan-700 border border-cyan-200"
                        : isDark
                        ? "text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{sec.label}</span>
                  </a>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Documentation Body */}
        <div className="lg:col-span-9 space-y-6 min-w-0">
          {/* 1. Overview */}
          <section id="overview" className={cardClass}>
            <div className="flex items-center gap-2.5 border-b pb-3 border-white/[0.06]">
              <BookOpen className="w-5 h-5 text-cyan-400 shrink-0" />
              <h2 className={cn("text-base sm:text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>
                1. Overview &amp; How App Platform Works
              </h2>
            </div>
            <p className={cn("text-xs sm:text-sm leading-relaxed", isDark ? "text-zinc-300" : "text-slate-600")}>
              <strong>Masdika App Platform</strong> is a container-based PaaS running on Kubernetes. You can deploy any application in two ways: directly from a <strong>Git Repository</strong> (built with BuildKit &amp; Dockerfile) or directly from a <strong>Docker Registry</strong> image. Every app automatically receives an HTTPS endpoint (<code className="font-mono text-cyan-400">*.app.masdikacloud.my.id</code>) with Let&apos;s Encrypt TLS, resource isolation, and a live Linux PTY web terminal.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className={subCardClass}>
                <div className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                  <Code2 className="w-4 h-4" />
                  <span>Dockerfile-Native BuildKit</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Builds run in an isolated BuildKit container identical to local <code className="font-mono">docker build</code>, with layer caching and 4 GB build RAM.
                </p>
              </div>
              <div className={subCardClass}>
                <div className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Zero-Downtime Rollouts</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Kubernetes keeps your old container live until the new image passes Pre-Deploy migrations and Readiness probes.
                </p>
              </div>
              <div className={subCardClass}>
                <div className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4" />
                  <span>Flexible Hourly PAYG</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Billed per hour from your balance. Includes a 3-day Grace Period protection if your balance runs low.
                </p>
              </div>
            </div>
          </section>

          {/* 2. Git & Docker Registry */}
          <section id="sources" className={cardClass}>
            <div className="flex items-center gap-2.5 border-b pb-3 border-white/[0.06]">
              <GitBranch className="w-5 h-5 text-cyan-400 shrink-0" />
              <h2 className={cn("text-base sm:text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>
                2. Application Sources: Git Repository vs. Docker Registry
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={subCardClass}>
                <h3 className={cn("text-sm font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                  <GitBranch className="w-4 h-4 text-cyan-400" />
                  <span>Option A: Git Repository (BuildKit)</span>
                </h3>
                <ul className="space-y-1.5 text-xs text-zinc-400 list-disc pl-4">
                  <li>Connect <strong>GitHub, GitLab, or Bitbucket</strong> (public or private repos via OAuth/PAT) or paste any HTTPS Git URL.</li>
                  <li>Click <strong>Inspect Repo</strong> to list branches (newest first) and auto-detect your framework &amp; port.</li>
                  <li><strong>From Git Repo</strong>: Uses the <code className="font-mono text-cyan-400">Dockerfile</code> inside your repo (or custom path like <code className="font-mono">docker/Dockerfile</code>).</li>
                  <li><strong>Write / Edit Inline</strong>: Auto-fills a production Dockerfile template if your repo doesn&apos;t have one yet.</li>
                </ul>
              </div>

              <div className={subCardClass}>
                <h3 className={cn("text-sm font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                  <Server className="w-4 h-4 text-cyan-400" />
                  <span>Option B: Docker Registry (No Git Needed)</span>
                </h3>
                <ul className="space-y-1.5 text-xs text-zinc-400 list-disc pl-4">
                  <li>Pull pre-built OCI images directly from <strong>Docker Hub</strong> (<code className="font-mono text-cyan-400">nginx:alpine</code>), <strong>GHCR</strong> (<code className="font-mono text-cyan-400">ghcr.io/org/app:v1</code>), GitLab Registry, or Quay.</li>
                  <li>Skips Git clone and BuildKit completely for near-instant Pod rollouts.</li>
                  <li>Optional <strong>Private Registry Credentials</strong>: Stored encrypted and mounted via a per-app Kubernetes <code className="font-mono">imagePullSecret</code>.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 3. Environment Variables */}
          <section id="env-vars" className={cardClass}>
            <div className="flex items-center gap-2.5 border-b pb-3 border-white/[0.06]">
              <KeyRound className="w-5 h-5 text-cyan-400 shrink-0" />
              <h2 className={cn("text-base sm:text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>
                3. Environment Variables (.env &amp; Build ARGs)
              </h2>
            </div>
            <p className={cn("text-xs sm:text-sm leading-relaxed", isDark ? "text-zinc-300" : "text-slate-600")}>
              Use either the <strong>Key-Value</strong> editor (with masked secret inputs) or switch to <strong>Raw .env</strong> to paste an entire <code className="font-mono">.env</code> file at once. Masdika injects your configured variables in three places:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className={subCardClass}>
                <div className="text-xs font-bold text-cyan-400">1. Build-Time .env File</div>
                <p className="text-xs text-zinc-400">Written cleanly into the build workspace from your Masdika config, replacing any stale repo <code className="font-mono">.env.example</code>.</p>
              </div>
              <div className={subCardClass}>
                <div className="text-xs font-bold text-cyan-400">2. BuildKit ARG Values</div>
                <p className="text-xs text-zinc-400">Passed as <code className="font-mono">--opt build-arg:KEY=VALUE</code> so <code className="font-mono">NEXT_PUBLIC_*</code> or <code className="font-mono">VITE_*</code> variables work during build.</p>
              </div>
              <div className={subCardClass}>
                <div className="text-xs font-bold text-cyan-400">3. Pod OS Environment</div>
                <p className="text-xs text-zinc-400">Mounted into the live Kubernetes Pod. Updating env vars in <strong>Settings</strong> applies immediately on Save.</p>
              </div>
            </div>
          </section>

          {/* 4. Pre-Deploy Command */}
          <section id="pre-deploy" className={cardClass}>
            <div className="flex items-center gap-2.5 border-b pb-3 border-white/[0.06]">
              <Rocket className="w-5 h-5 text-cyan-400 shrink-0" />
              <h2 className={cn("text-base sm:text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>
                4. Pre-Deploy / Release Command (Database Migrations)
              </h2>
            </div>
            <p className={cn("text-xs sm:text-sm leading-relaxed", isDark ? "text-zinc-300" : "text-slate-600")}>
              Set an optional command to run inside an isolated Kubernetes Job using your newly built/pulled image and environment variables <strong>before</strong> traffic switches to the new Pod. If the command exits with a non-zero code, the rollout is <strong>automatically aborted</strong> and your previous healthy Pod stays online.
            </p>
            <pre className={codeBlockClass}>
{`# Laravel
php artisan migrate --force

# Prisma (Node.js / Next.js)
npx prisma migrate deploy

# Django / Python
python manage.py migrate --noinput`}
            </pre>
          </section>

          {/* 5. Dashboard Menus Guide */}
          <section id="menus" className={cardClass}>
            <div className="flex items-center gap-2.5 border-b pb-3 border-white/[0.06]">
              <Layers className="w-5 h-5 text-cyan-400 shrink-0" />
              <h2 className={cn("text-base sm:text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>
                5. Dashboard Menus &amp; Controls Explained
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {[
                {
                  icon: Layers,
                  title: "Overview Tab",
                  desc: "View your primary HTTPS domain, Let's Encrypt SSL status, and real-time CPU, RAM, and SSD utilization charts (Live 5s, 1 Hour, 24 Hours, 7 Days).",
                },
                {
                  icon: History,
                  title: "Deployments Tab",
                  desc: "Inspect deployment history, trigger a Manual Deploy (latest branch HEAD or a specific Commit SHA), view historical build logs, or perform a 1-click Instant Rollback.",
                },
                {
                  icon: FileText,
                  title: "Build Logs Tab",
                  desc: "Watch live output from git-clone, BuildKit image compilation, and Pre-Deploy migration Jobs.",
                },
                {
                  icon: Terminal,
                  title: "Runtime Logs Tab",
                  desc: "Stream live stdout/stderr application logs directly from your active Kubernetes container Pod.",
                },
                {
                  icon: Code2,
                  title: "Shell Tab (Live Linux PTY)",
                  desc: "Interactive bash/sh terminal inside your container supporting Tab autocomplete, arrow history, Ctrl+C, and CLI tools like php artisan tinker. Includes One-Shot fallback mode.",
                },
                {
                  icon: Settings,
                  title: "Settings & Environment Tab",
                  desc: "Switch between Git & Docker Registry, edit Dockerfile, manage Pre-Deploy commands, bind Custom Domains (CNAME/A), configure CI/CD Git Push Webhooks, mount Persistent Storage, set Health Check Paths, and update Env Vars.",
                },
                {
                  icon: Webhook,
                  title: "CI/CD Git Push Webhook",
                  desc: "Copy the Webhook URL and Secret from Settings into your GitHub/GitLab repository settings to automatically rebuild and roll out whenever you git push.",
                },
                {
                  icon: HardDrive,
                  title: "Scale, Power & Persistent Disk",
                  desc: "Use Scale to upgrade/downgrade vCPU & RAM without data loss, Restart/Stop/Rebuild anytime, or attach a Persistent Volume path (e.g. /var/www/html/storage).",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className={subCardClass}>
                    <div className={cn("text-xs sm:text-sm font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                      <Icon className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>{item.title}</span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 6. Troubleshooting */}
          <section id="troubleshooting" className={cardClass}>
            <div className="flex items-center gap-2.5 border-b pb-3 border-white/[0.06]">
              <AlertTriangle className="w-5 h-5 text-cyan-400 shrink-0" />
              <h2 className={cn("text-base sm:text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>
                6. Best Practices &amp; Troubleshooting
              </h2>
            </div>

            <div className="space-y-3">
              {[
                {
                  q: "TypeScript TS18003: No inputs were found in tsconfig.json during build",
                  a: "Ensure your Dockerfile runs COPY . . BEFORE RUN npm run build (or tsc). Also check that .dockerignore does not exclude src/.",
                },
                {
                  q: "502 Bad Gateway after deployment succeeds",
                  a: "Verify that Container Exposed Port in Masdika matches the port your server listens on (e.g. 80 for Apache/Nginx, 3000 for Node/Next.js, 8000 for FastAPI) and that your app binds to 0.0.0.0 rather than 127.0.0.1.",
                },
                {
                  q: "How to verify active Environment Variables inside the container",
                  a: "Open the Shell tab and run env (or printenv). Kubernetes mounts your variables directly into the Pod OS environment, which takes precedence over static files.",
                },
              ].map((faq) => (
                <div key={faq.q} className={subCardClass}>
                  <div className={cn("text-xs sm:text-sm font-bold flex items-start gap-2", isDark ? "text-white" : "text-slate-900")}>
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{faq.q}</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed pl-6">{faq.a}</p>
                </div>
              ))}
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06]">
              <span className="text-xs text-zinc-400">
                Need help with a specific container build?
              </span>
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard/tickets"
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors inline-flex items-center gap-1.5",
                    isDark ? "border-white/10 bg-white/5 text-zinc-300 hover:text-white" : "border-slate-200 bg-white text-slate-700"
                  )}
                >
                  <span>Open Support Ticket</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <Link
                  href="/dashboard/app-platform/new"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Deploy New App</span>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
