"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  GitBranch,
  Cpu,
  HardDrive,
  Check,
  Sparkles,
  RefreshCw,
  Terminal,
  MapPin,
  Lock,
  Boxes,
  Code2,
  AlertTriangle,
  Zap,
  Search,
  X,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import {
  SiNodedotjs,
  SiPython,
  SiGo,
  SiPhp,
  SiHtml5,
  SiDocker,
  SiLaravel,
  SiNextdotjs,
  SiFastapi,
  SiDjango,
  SiNestjs,
  SiRubyonrails,
  SiRust,
  SiVite,
  SiAstro,
  SiSvelte,
  SiRemix,
  SiWordpress,
} from "react-icons/si";
import { toast } from "sonner";
import { AdminCheckbox } from "@/components/ui/AdminCheckbox";
import { Select } from "@/components/ui/Select";
import {
  OFFICIAL_APP_PLATFORM_PLANS,
  AppPlatformPlan,
} from "@/lib/app-platform-plans";
import { formatRupiah } from "@/lib/billing";

function generateRandomSuffix(): string {
  return Math.random().toString(36).substring(2, 6);
}

function generateAutoSubdomain(appName: string): string {
  const clean = appName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 14);
  const prefix = clean || "web";
  return `${prefix}-${generateRandomSuffix()}`;
}

interface FrameworkItem {
  id: string;
  name: string;
  category: "FULLSTACK" | "BACKEND" | "FRONTEND" | "CUSTOM";
  desc: string;
  icon: any;
  color: string;
  bgColor: string;
  defaultPort: number;
  defaultBuild: string;
  defaultStart: string;
}

const FRAMEWORKS: FrameworkItem[] = [
  {
    id: "DOCKERFILE",
    name: "Native Dockerfile",
    category: "CUSTOM",
    desc: "Build directly from your repository Dockerfile or inline editor (Recommended)",
    icon: SiDocker,
    color: "text-[#2496ED]",
    bgColor: "bg-[#2496ED]/10 border-[#2496ED]/25",
    defaultPort: 80,
    defaultBuild: "",
    defaultStart: "",
  },
  {
    id: "LARAVEL",
    name: "Laravel",
    category: "FULLSTACK",
    desc: "Artisan, Blade, Eloquent, PHP 8.2 & Apache mod_rewrite",
    icon: SiLaravel,
    color: "text-[#FF2D20]",
    bgColor: "bg-[#FF2D20]/10 border-[#FF2D20]/25",
    defaultPort: 80,
    defaultBuild: "",
    defaultStart: "",
  },
  {
    id: "NEXTJS",
    name: "Next.js",
    category: "FULLSTACK",
    desc: "App Router, SSR, Server Components & API routes",
    icon: SiNextdotjs,
    color: "text-slate-950 dark:text-white",
    bgColor: "bg-slate-950/10 border-slate-950/20 dark:bg-white/10 dark:border-white/25",
    defaultPort: 3000,
    defaultBuild: "npm run build",
    defaultStart: "npm start",
  },
  {
    id: "NODEJS",
    name: "Node.js (Express)",
    category: "BACKEND",
    desc: "Fast unopinionated REST APIs, Fastify & microservices",
    icon: SiNodedotjs,
    color: "text-[#5FA04E]",
    bgColor: "bg-[#5FA04E]/10 border-[#5FA04E]/25",
    defaultPort: 3000,
    defaultBuild: "npm run build",
    defaultStart: "npm start",
  },
  {
    id: "FASTAPI",
    name: "FastAPI",
    category: "BACKEND",
    desc: "High performance async Python REST APIs with Pydantic",
    icon: SiFastapi,
    color: "text-[#009688]",
    bgColor: "bg-[#009688]/10 border-[#009688]/25",
    defaultPort: 8000,
    defaultBuild: "",
    defaultStart: "uvicorn main:app --host 0.0.0.0 --port 8000",
  },
  {
    id: "DJANGO",
    name: "Django",
    category: "FULLSTACK",
    desc: "Batteries-included full-stack Python web framework",
    icon: SiDjango,
    color: "text-[#44B78B]",
    bgColor: "bg-[#44B78B]/10 border-[#44B78B]/25",
    defaultPort: 8000,
    defaultBuild: "python manage.py collectstatic --noinput",
    defaultStart: "gunicorn wsgi:application --bind 0.0.0.0:8000",
  },
  {
    id: "PYTHON",
    name: "Python (Flask)",
    category: "BACKEND",
    desc: "Flask, Streamlit, automated scrapers & Python scripts",
    icon: SiPython,
    color: "text-[#3776AB]",
    bgColor: "bg-[#3776AB]/10 border-[#3776AB]/25",
    defaultPort: 8000,
    defaultBuild: "",
    defaultStart: "python app.py",
  },
  {
    id: "GOLANG",
    name: "Go (Golang)",
    category: "BACKEND",
    desc: "High concurrency compiled microservices in Gin or Fiber",
    icon: SiGo,
    color: "text-[#00ADD8]",
    bgColor: "bg-[#00ADD8]/10 border-[#00ADD8]/25",
    defaultPort: 8080,
    defaultBuild: "",
    defaultStart: "./server",
  },
  {
    id: "PHP",
    name: "PHP / Apache",
    category: "BACKEND",
    desc: "Modern PHP 8.2 runtime with Apache rewrite module",
    icon: SiPhp,
    color: "text-[#777BB4]",
    bgColor: "bg-[#777BB4]/10 border-[#777BB4]/25",
    defaultPort: 80,
    defaultBuild: "",
    defaultStart: "",
  },
  {
    id: "NESTJS",
    name: "NestJS",
    category: "BACKEND",
    desc: "Progressive enterprise TypeScript Node.js backend",
    icon: SiNestjs,
    color: "text-[#E0234E]",
    bgColor: "bg-[#E0234E]/10 border-[#E0234E]/25",
    defaultPort: 3000,
    defaultBuild: "npm run build",
    defaultStart: "npm run start:prod",
  },
  {
    id: "RUBY",
    name: "Ruby on Rails",
    category: "FULLSTACK",
    desc: "Convention over configuration full-stack Ruby app",
    icon: SiRubyonrails,
    color: "text-[#CC0000]",
    bgColor: "bg-[#CC0000]/10 border-[#CC0000]/25",
    defaultPort: 3000,
    defaultBuild: "bundle exec rails assets:precompile",
    defaultStart: "bundle exec rails server -b 0.0.0.0 -p 3000",
  },
  {
    id: "RUST",
    name: "Rust (Actix / Axum)",
    category: "BACKEND",
    desc: "Blazing fast memory-safe compiled web services",
    icon: SiRust,
    color: "text-[#B7410E] dark:text-[#DEA584]",
    bgColor: "bg-[#B7410E]/10 border-[#B7410E]/25",
    defaultPort: 8080,
    defaultBuild: "cargo build --release",
    defaultStart: "./server",
  },
  {
    id: "STATIC",
    name: "Static HTML",
    category: "FRONTEND",
    desc: "Pure HTML, CSS, JavaScript served via high-speed Nginx",
    icon: SiHtml5,
    color: "text-[#E34F26]",
    bgColor: "bg-[#E34F26]/10 border-[#E34F26]/25",
    defaultPort: 80,
    defaultBuild: "",
    defaultStart: "",
  },
  {
    id: "VITE",
    name: "Vite (React / Vue)",
    category: "FRONTEND",
    desc: "Ultra-fast frontend SPA build with Nginx reverse proxy",
    icon: SiVite,
    color: "text-[#646CFF]",
    bgColor: "bg-[#646CFF]/10 border-[#646CFF]/25",
    defaultPort: 80,
    defaultBuild: "npm run build",
    defaultStart: "",
  },
  {
    id: "ASTRO",
    name: "Astro",
    category: "FULLSTACK",
    desc: "Content-driven modern web framework for fast websites",
    icon: SiAstro,
    color: "text-[#BC52EE]",
    bgColor: "bg-[#BC52EE]/10 border-[#BC52EE]/25",
    defaultPort: 4321,
    defaultBuild: "npm run build",
    defaultStart: "npm start",
  },
  {
    id: "SVELTE",
    name: "SvelteKit",
    category: "FULLSTACK",
    desc: "Cybernetically enhanced reactive web applications",
    icon: SiSvelte,
    color: "text-[#FF3E00]",
    bgColor: "bg-[#FF3E00]/10 border-[#FF3E00]/25",
    defaultPort: 3000,
    defaultBuild: "npm run build",
    defaultStart: "node build",
  },
  {
    id: "REMIX",
    name: "Remix",
    category: "FULLSTACK",
    desc: "Edge-ready full stack web framework by Shopify",
    icon: SiRemix,
    color: "text-[#3992FF]",
    bgColor: "bg-[#3992FF]/10 border-[#3992FF]/25",
    defaultPort: 3000,
    defaultBuild: "npm run build",
    defaultStart: "npm start",
  },
  {
    id: "WORDPRESS",
    name: "WordPress",
    category: "FULLSTACK",
    desc: "World's most popular CMS & blogging platform",
    icon: SiWordpress,
    color: "text-[#21759B]",
    bgColor: "bg-[#21759B]/10 border-[#21759B]/25",
    defaultPort: 80,
    defaultBuild: "",
    defaultStart: "",
  },
];

const DOCKERFILE_TEMPLATES: { label: string; port: number; content: string }[] = [
  {
    label: "Node.js / Next.js",
    port: 3000,
    content: `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
COPY . .
RUN npm run build || true

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app ./
EXPOSE 3000
CMD ["npm", "start"]`,
  },
  {
    label: "PHP / Laravel",
    port: 80,
    content: `FROM composer:2 AS vendor
WORKDIR /app
COPY . /app
RUN if [ -f composer.json ]; then composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction --no-scripts --ignore-platform-reqs || true; composer dump-autoload --optimize --no-dev --no-scripts --ignore-platform-reqs || true; fi

FROM node:20-alpine AS frontend
WORKDIR /app
COPY --from=vendor /app /app
RUN if [ -f package.json ]; then (npm ci || npm install || true) && (npm run build || true); fi

FROM php:8.2-apache
WORKDIR /var/www/html
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN docker-php-ext-install pdo pdo_mysql bcmath opcache
COPY --from=frontend /app /var/www/html/
RUN ([ ! -f .env ] && [ -f .env.example ] && cp .env.example .env || true) && php artisan key:generate --force || true && mkdir -p database storage bootstrap/cache && touch database/database.sqlite && php artisan migrate --force || true && chown -R www-data:www-data storage bootstrap/cache database && chmod -R 775 storage bootstrap/cache database || true
RUN a2enmod rewrite && sed -ri -e 's!/var/www/html!/var/www/html/public!g' /etc/apache2/sites-available/*.conf && sed -ri -e 's!/var/www/!/var/www/html/public!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf
EXPOSE 80
CMD ["apache2-foreground"]`,
  },
  {
    label: "Python / FastAPI",
    port: 8000,
    content: `FROM python:3.11-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt || true
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]`,
  },
  {
    label: "Go / Fiber",
    port: 8080,
    content: `FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download || true
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

FROM alpine:latest
WORKDIR /app
RUN apk --no-cache add ca-certificates
COPY --from=builder /app/server .
EXPOSE 8080
CMD ["./server"]`,
  },
  {
    label: "Static HTML / Nginx",
    port: 80,
    content: `FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`,
  },
];

const QUICK_STARTERS = [
  {
    name: "Laravel Demo",
    framework: "LARAVEL",
    gitUrl: "https://github.com/laravel/laravel.git",
    branch: "11.x",
    port: 80,
  },
  {
    name: "Next.js Demo",
    framework: "NEXTJS",
    gitUrl: "https://github.com/vercel/next-learn-starter.git",
    branch: "master",
    port: 3000,
  },
  {
    name: "FastAPI Demo",
    framework: "FASTAPI",
    gitUrl: "https://github.com/tiangolo/fastapi.git",
    branch: "master",
    port: 8000,
  },
  {
    name: "Go Fiber Demo",
    framework: "GOLANG",
    gitUrl: "https://github.com/gofiber/recipes.git",
    branch: "master",
    port: 8080,
  },
];

const CATEGORIES = [
  { id: "ALL", label: "All Frameworks" },
  { id: "FULLSTACK", label: "Fullstack" },
  { id: "BACKEND", label: "Backend / API" },
  { id: "FRONTEND", label: "Frontend" },
  { id: "CUSTOM", label: "Custom" },
] as const;

export default function NewAppPlatformPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Form State
  const [name, setName] = useState("");
  const [gitUrl, setGitUrl] = useState("");
  const [isPrivateRepo, setIsPrivateRepo] = useState(false);
  const [gitToken, setGitToken] = useState("");
  const [gitUser, setGitUser] = useState("");
  const [branch, setBranch] = useState("main");
  const [buildMode, setBuildMode] = useState<"DOCKERFILE" | "AUTO" | "BUILDPACK">("DOCKERFILE");
  const [dockerfileSource, setDockerfileSource] = useState<"REPO" | "INLINE">("REPO");
  const [inlineDockerfile, setInlineDockerfile] = useState(DOCKERFILE_TEMPLATES[0].content);
  const [buildType, setBuildType] = useState("DOCKERFILE");
  const [dockerfilePath, setDockerfilePath] = useState("Dockerfile");
  const [rootDirectory, setRootDirectory] = useState("/");
  const [buildCommand, setBuildCommand] = useState("");
  const [startCommand, setStartCommand] = useState("");
  const [appPort, setAppPort] = useState(80);
  const [envVars, setEnvVars] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [mounted, setMounted] = useState(false);
  const [detectingRepo, setDetectingRepo] = useState(false);
  const [detectedBadge, setDetectedBadge] = useState<string | null>(null);

  // GitHub Integration & Repo Picker State
  const [ghConnected, setGhConnected] = useState(false);
  const [ghOauthConfigured, setGhOauthConfigured] = useState(false);
  const [ghUsername, setGhUsername] = useState<string | null>(null);
  const [ghRepos, setGhRepos] = useState<any[]>([]);
  const [ghBranches, setGhBranches] = useState<string[]>([]);
  const [ghPatInput, setGhPatInput] = useState("");
  const [showGhPatBox, setShowGhPatBox] = useState(false);
  const [ghLoading, setGhLoading] = useState(false);

  // Advanced PaaS Options (Health Check, Persistent Volume, Cache, PR Previews)
  const [healthCheckPath, setHealthCheckPath] = useState("");
  const [persistentVolumePath, setPersistentVolumePath] = useState("");
  const [persistentVolumeGb, setPersistentVolumeGb] = useState(0);
  const [enableBuildCache, setEnableBuildCache] = useState(true);
  const [prPreviewEnabled, setPrPreviewEnabled] = useState(false);
  const [selectedGhRepo, setSelectedGhRepo] = useState("");
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Framework UI Navigation (Category, Search, Pagination)
  const [frameworkCategory, setFrameworkCategory] = useState<string>("ALL");
  const [frameworkSearch, setFrameworkSearch] = useState<string>("");
  const [frameworkPage, setFrameworkPage] = useState<number>(1);
  const FRAMEWORKS_PER_PAGE = 6;

  // Dynamic Plans State (matching Managed App plans from live DB)
  const [availablePlans, setAvailablePlans] = useState<AppPlatformPlan[]>(OFFICIAL_APP_PLATFORM_PLANS);
  const [selectedPlan, setSelectedPlan] = useState<AppPlatformPlan>(OFFICIAL_APP_PLATFORM_PLANS[1]); // Default 1C2G

  // Commitment & Balance States
  const [userBalance, setUserBalance] = useState<number>(0);
  const [activeCommitment, setActiveCommitment] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [clusterCapacity, setClusterCapacity] = useState<{
    available: boolean;
    status: string;
    capacityPercent: number;
    allocatedCpu: number;
    totalCpu: number;
    cpuPercent: number;
    allocatedMemoryMb: number;
    totalMemoryMb: number;
    memoryPercent: number;
    allocatedStorageGb: number;
    totalStorageGb: number;
    storagePercent: number;
    userMessage?: string;
    serviceEnabled?: boolean;
  } | null>(null);

  // Fetch dynamic plans & billing commitment on mount
  useEffect(() => {
    document.title = "Deploy Web Application - App Platform | Masdika Cloud";
    setMounted(true);
    setSubdomain((prev) => (prev ? prev : `web-${generateRandomSuffix()}`));

    // Fetch cluster capacity
    fetch("/api/user/app-platform/capacity")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setClusterCapacity(json.data);
        }
      })
      .catch(() => {});

    // Fetch GitHub Connection & Repositories
    fetch("/api/user/app-platform/github")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setGhConnected(Boolean(json.connected));
          setGhOauthConfigured(Boolean(json.oauthConfigured));
          setGhUsername(json.githubUsername || null);
          setGhRepos(Array.isArray(json.repos) ? json.repos : []);
        }
      })
      .catch(() => {});

    // Fetch user balance and active monthly commitment
    fetch("/api/user/billing")
      .then((res) => res.json())
      .then((data) => {
        if (data.data?.balance !== undefined) {
          setUserBalance(data.data.balance);
        }
        if (data.data?.commitment?.totalMonthly !== undefined) {
          setActiveCommitment(data.data.commitment.totalMonthly);
        } else if (data.data?.activeMonthlyCommitment !== undefined) {
          setActiveCommitment(data.data.activeMonthlyCommitment);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingBalance(false));

    // Fetch dynamic plans from DB (Admin editable in /admin/plans)
    fetch("/api/public/plans")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          const dbPlans = data.data.filter(
            (p: any) => p.service === "APP_PLATFORM" && p.isActive
          );
          if (dbPlans.length > 0) {
            const mapped: AppPlatformPlan[] = dbPlans.map((p: any) => {
              let parsed: any = {};
              try {
                parsed = JSON.parse(p.limits);
              } catch {
                parsed = {};
              }
              const planCode =
                parsed.planCode ||
                p.name.replace(/[^0-9a-zA-Z]/g, "").slice(-4).toUpperCase() ||
                "CUSTOM";
              const cpuVal = Number(parsed.cpuShares) || parseFloat(parsed.cpu || "1") || 1.0;
              const memMb =
                Number(parsed.memoryMb) ||
                (parsed.ram?.includes("GB") ? parseFloat(parsed.ram) * 1024 : 1024);
              const storageGb =
                Number(parsed.storageGb) ||
                (parsed.storage ? parseInt(parsed.storage, 10) : 10);

              return {
                id: `app-${planCode.toLowerCase()}`,
                name: p.name,
                planCode,
                cpuLabel: parsed.cpu || `${cpuVal} CPU`,
                ramLabel: parsed.ram || `${(memMb / 1024).toFixed(1)} GB RAM`,
                diskLabel: `${storageGb} GB SSD`,
                cpuShares: cpuVal,
                memoryMb: memMb,
                storageGb,
                monthlyPrice: p.price,
                hourlyRate: p.hourlyPrice || Math.max(1, Math.round(p.price / 720)),
                popular: Boolean(p.isPopular),
                badge: p.isPopular ? "Popular" : undefined,
                planId: p.id,
              };
            });
            setAvailablePlans(mapped);
            const popular = mapped.find((pl) => pl.popular) || mapped[1] || mapped[0];
            setSelectedPlan(popular);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Filter frameworks
  const filteredFrameworks = useMemo(() => {
    return FRAMEWORKS.filter((fw) => {
      const matchCat =
        frameworkCategory === "ALL" || fw.category === frameworkCategory;
      const matchQuery =
        !frameworkSearch.trim() ||
        fw.name.toLowerCase().includes(frameworkSearch.toLowerCase()) ||
        fw.desc.toLowerCase().includes(frameworkSearch.toLowerCase()) ||
        fw.id.toLowerCase().includes(frameworkSearch.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [frameworkCategory, frameworkSearch]);

  const totalFrameworkPages = Math.max(
    1,
    Math.ceil(filteredFrameworks.length / FRAMEWORKS_PER_PAGE)
  );

  const currentFrameworks = useMemo(() => {
    const start = (frameworkPage - 1) * FRAMEWORKS_PER_PAGE;
    return filteredFrameworks.slice(start, start + FRAMEWORKS_PER_PAGE);
  }, [filteredFrameworks, frameworkPage]);

  // Reset pagination on category or search change
  useEffect(() => {
    setFrameworkPage(1);
  }, [frameworkCategory, frameworkSearch]);

  // Update defaults when framework changes
  const handleFrameworkChange = (fwId: string) => {
    setBuildType(fwId);
    if (fwId === "DOCKERFILE") {
      setBuildMode("DOCKERFILE");
    }
    const fw = FRAMEWORKS.find((f) => f.id === fwId);
    if (fw) {
      setAppPort(fw.defaultPort);
      setBuildCommand(fw.defaultBuild);
      setStartCommand(fw.defaultStart);
    }
  };

  // Auto-generate subdomain from app name while allowing custom overrides
  const handleNameChange = (val: string) => {
    setName(val);
    if (!subdomain || subdomain.startsWith("web-") || subdomain.includes("-")) {
      const generated = generateAutoSubdomain(val);
      setSubdomain(generated);
    }
  };

  const handleRegenerateSubdomain = () => {
    const fresh = generateAutoSubdomain(name || "app");
    setSubdomain(fresh);
    toast.success("New subdomain generated");
  };

  // Quick Preset Selector
  const handleApplyPreset = (preset: (typeof QUICK_STARTERS)[number]) => {
    setGitUrl(preset.gitUrl);
    setBranch(preset.branch);
    setBuildMode("AUTO");
    handleFrameworkChange(preset.framework);
    if (!name) {
      setName(preset.name);
      setSubdomain(generateAutoSubdomain(preset.name));
    }
    toast.success(`Loaded ${preset.name} template`);
  };

  const handleConnectGithubPat = async () => {
    if (!ghPatInput.trim()) {
      toast.error("Please enter a GitHub Personal Access Token");
      return;
    }
    setGhLoading(true);
    try {
      const res = await fetch("/api/user/app-platform/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: ghPatInput.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(`Connected GitHub as @${json.githubUsername}`);
        setShowGhPatBox(false);
        setGhPatInput("");
        const listRes = await fetch("/api/user/app-platform/github");
        const listJson = await listRes.json();
        if (listJson.success) {
          setGhConnected(Boolean(listJson.connected));
          setGhUsername(listJson.githubUsername || null);
          setGhRepos(Array.isArray(listJson.repos) ? listJson.repos : []);
        }
      } else {
        toast.error(json.error || "Failed to connect GitHub");
      }
    } catch {
      toast.error("Connection error");
    } finally {
      setGhLoading(false);
    }
  };

  const handleDisconnectGithub = async () => {
    await fetch("/api/user/app-platform/github", { method: "DELETE" });
    setGhConnected(false);
    setGhUsername(null);
    setGhRepos([]);
    setGhBranches([]);
    toast.success("GitHub account disconnected");
  };

  const handleSelectGithubRepo = async (fullName: string) => {
    const repoObj = ghRepos.find((r) => r.fullName === fullName);
    if (!repoObj) return;
    setGitUrl(repoObj.cloneUrl);
    setBranch(repoObj.defaultBranch || "main");
    if (!name) {
      setName(repoObj.name);
      setSubdomain(generateAutoSubdomain(repoObj.name));
    }
    // Fetch branches for dropdown
    fetch(`/api/user/app-platform/github?repo=${encodeURIComponent(fullName)}`)
      .then((res) => res.json())
      .then((j) => {
        if (j.success && Array.isArray(j.branches)) {
          setGhBranches(j.branches);
        }
      })
      .catch(() => {});
    // Automatically run stack detection
    handleAutoDetectRepo(repoObj.cloneUrl);
  };

  const handleAutoDetectRepo = async (overrideUrl?: string) => {
    const targetUrl = (overrideUrl ?? gitUrl).trim();
    if (!targetUrl) {
      toast.error("Please enter a Git repository URL first");
      return;
    }
    setDetectingRepo(true);
    setDetectedBadge(null);
    try {
      const res = await fetch("/api/user/app-platform/detect-repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gitUrl: targetUrl,
          branch: branch.trim() || undefined,
          gitToken: isPrivateRepo ? gitToken.trim() : undefined,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success && json.detected) {
        const d = json.detected;
        if (d.defaultBranch) setBranch(d.defaultBranch);
        if (d.hasDockerfile) {
          setBuildMode("DOCKERFILE");
          setDockerfileSource("REPO");
          setBuildType("DOCKERFILE");
          setDockerfilePath("Dockerfile");
          if (d.defaultPort) setAppPort(d.defaultPort);
          setDetectedBadge(d.detectedLabel || "Dockerfile Detected");
          toast.success(`Auto-detected: ${d.detectedLabel || "Dockerfile"}`);
        } else if (d.detectedFramework && d.detectedFramework !== "DOCKERFILE") {
          setBuildMode("AUTO");
          handleFrameworkChange(d.detectedFramework);
          if (d.defaultPort) setAppPort(d.defaultPort);
          setDetectedBadge(d.detectedLabel || d.detectedFramework);
          toast.success(`Auto-detected language/framework: ${d.detectedLabel || d.detectedFramework}`);
        } else {
          toast.info(d.message || "Could not auto-detect stack. You can choose Dockerfile or Preset manually.");
        }
      } else {
        toast.error(json.error || "Failed to inspect repository");
      }
    } catch {
      toast.error("Failed to inspect repository");
    } finally {
      setDetectingRepo(false);
    }
  };

  // Commitment & Cost Calculations
  const currentCost = selectedPlan.monthlyPrice;
  const currentHourlyRate =
    selectedPlan.hourlyRate || Math.max(1, Math.ceil(currentCost / 720));
  const totalRequiredBalance = activeCommitment + currentCost;
  const isBalanceInsufficient =
    !loadingBalance && userBalance < totalRequiredBalance;
  const shortfall = Math.max(0, totalRequiredBalance - userBalance);

  const isClusterFull = Boolean(
    clusterCapacity &&
      (!clusterCapacity.available ||
        clusterCapacity.status === "FULL" ||
        clusterCapacity.status === "OFFLINE")
  );
  const isPlanExceedsCapacity = Boolean(
    clusterCapacity &&
      clusterCapacity.totalMemoryMb > 0 &&
      clusterCapacity.totalMemoryMb - clusterCapacity.allocatedMemoryMb <
        selectedPlan.memoryMb
  );
  const isServiceDisabled = clusterCapacity?.serviceEnabled === false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter an application name");
      return;
    }
    if (!gitUrl.trim()) {
      toast.error("Please enter a valid Git repository URL");
      return;
    }
    if (isServiceDisabled) {
      toast.error("App Platform is currently disabled by administrator.");
      return;
    }
    if (isClusterFull || isPlanExceedsCapacity) {
      toast.error(
        clusterCapacity?.userMessage ||
          "The App Platform cluster is currently at full capacity. Deployments are temporarily paused."
      );
      return;
    }
    if (isBalanceInsufficient) {
      toast.error(
        `Insufficient balance. You need at least ${formatRupiah(totalRequiredBalance)} to deploy this application.`
      );
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Validating repository & provisioning build...");

    let effectiveGitUrl = gitUrl.trim();
    if (isPrivateRepo && gitToken.trim()) {
      const defaultUser = effectiveGitUrl.includes("gitlab") ? "oauth2" : "git";
      const userPart = gitUser.trim() ? encodeURIComponent(gitUser.trim()) : defaultUser;
      const tokenPart = encodeURIComponent(gitToken.trim());
      effectiveGitUrl = effectiveGitUrl.replace(
        /^(https?:\/\/)([^@]+@)?/,
        `$1${userPart}:${tokenPart}@`
      );
    }

    try {
      const res = await fetch("/api/user/app-platform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          gitUrl: effectiveGitUrl,
          branch: branch.trim() || "main",
          buildMode,
          buildType: buildMode === "DOCKERFILE" ? "DOCKERFILE" : buildType,
          dockerfilePath: buildMode === "DOCKERFILE" ? (dockerfilePath.trim() || "Dockerfile") : "Dockerfile",
          rootDirectory: rootDirectory.trim() || "/",
          buildCommand:
            buildMode === "DOCKERFILE" && dockerfileSource === "INLINE"
              ? inlineDockerfile.trim() || null
              : buildCommand.trim() || null,
          startCommand: startCommand.trim() || null,
          appPort: Number(appPort) || 80,
          envVars: envVars.trim() || null,
          subdomain: subdomain.trim().toLowerCase(),
          planCode: selectedPlan.planCode,
          billingMode: "PAYG",
          healthCheckPath: healthCheckPath.trim() || null,
          persistentVolumePath: persistentVolumePath.trim() || null,
          persistentVolumeGb: Number(persistentVolumeGb) || 0,
          enableBuildCache,
          prPreviewEnabled,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success("Application created! Build pipeline has been queued.", {
          id: toastId,
        });
        router.push(`/dashboard/app-platform/${json.data.id}`);
      } else {
        toast.error(json.error || "Failed to deploy application", { id: toastId });
      }
    } catch {
      toast.error("An unexpected connection error occurred", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const previewSubdomain = subdomain.trim()
    ? subdomain.trim().toLowerCase()
    : "web-app";
  const previewDomain = `${previewSubdomain}.app.masdikacloud.my.id`;

  const activeFrameworkObj =
    FRAMEWORKS.find((f) => f.id === buildType) || FRAMEWORKS[0];
  const ActiveFwIcon = activeFrameworkObj.icon;

  return (
    <div className="space-y-6 max-w-full pb-16">
      {/* Back Navigation */}
      <div>
        <Link
          href="/dashboard/app-platform"
          className={cn(
            "inline-flex items-center gap-2 text-xs font-medium px-3.5 py-2 rounded-xl transition-all border w-fit cursor-pointer",
            isDark
              ? "text-zinc-400 hover:text-white bg-[#0a0a0c] hover:bg-white/[0.04] border-white/[0.08] hover:border-cyan-500/40"
              : "text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs"
          )}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to App Platform
        </Link>
      </div>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1
              className={cn(
                "text-xl sm:text-2xl font-bold tracking-tight",
                isDark ? "text-white" : "text-slate-900"
              )}
            >
              Deploy Web Application
            </h1>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold border shrink-0",
                isDark
                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                  : "bg-cyan-50 text-cyan-700 border-cyan-200"
              )}
            >
              <Globe className="w-3 h-3 shrink-0" />
              Automated Kaniko Build
            </span>
          </div>
          <p
            className={cn(
              "text-xs sm:text-sm font-medium mt-1 max-w-2xl",
              isDark ? "text-zinc-400" : "text-slate-500"
            )}
          >
            Deploy Laravel, Next.js, FastAPI, Go, and 18+ frameworks directly
            from Git with auto SSL and isolated container runtime.
          </p>
        </div>

        {/* Region Badge */}
        <div
          className={cn(
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold shrink-0 self-start sm:self-center transition-all",
            isDark
              ? "bg-[#0a0a0c] border-white/[0.08] text-zinc-300"
              : "bg-white border-slate-200/90 text-slate-700 shadow-2xs"
          )}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>
            Region:{" "}
            <strong className={isDark ? "text-white" : "text-slate-900"}>
              Sidoarjo (ID-SDA)
            </strong>
          </span>
        </div>
      </div>

      {/* 2-Column Layout */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"
      >
        {/* Left Column (Inputs & Options) - spans 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Git Repository & Starters */}
          <div
            className={cn(
              "rounded-2xl border p-5 sm:p-6 shadow-2xs space-y-4",
              isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90"
            )}
          >
            <div className="flex items-center justify-between border-b pb-3 border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <GitBranch className="w-5 h-5 text-cyan-400" />
                <h2
                  className={cn(
                    "text-base font-bold",
                    isDark ? "text-white" : "text-slate-900"
                  )}
                >
                  1. Git Repository Source
                </h2>
              </div>
              <span className="text-xs text-zinc-400 font-mono">Public HTTPS</span>
            </div>

            {/* Quick Starter Templates */}
            <div>
              {/* Git Provider Integration & Repository Picker */}
              <div
                className={cn(
                  "p-3.5 rounded-xl border space-y-3 mb-3",
                  isDark ? "bg-black/30 border-white/[0.08]" : "bg-slate-50 border-slate-200"
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-cyan-400" />
                      <span className={cn("text-xs font-bold", isDark ? "text-white" : "text-slate-900")}>
                        Git Provider Integration (GitHub / GitLab / Bitbucket)
                      </span>
                      {ghConnected && ghUsername && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          @{ghUsername}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Connect GitHub or GitLab to pick from a dropdown, or paste any Git HTTPS URL below.
                    </p>
                  </div>

                  {!ghConnected ? (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {ghOauthConfigured && (
                        <a
                          href="/api/auth/github/login?returnTo=/dashboard/app-platform/new"
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-950 hover:bg-zinc-200 transition-colors cursor-pointer"
                        >
                          Connect via OAuth
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowGhPatBox(!showGhPatBox)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer",
                          isDark
                            ? "bg-white/5 border-white/10 text-zinc-300 hover:text-white"
                            : "bg-white border-slate-200 text-slate-700"
                        )}
                      >
                        {showGhPatBox ? "Cancel" : "Connect Git Account"}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleDisconnectGithub}
                      className="text-[11px] font-semibold text-rose-400 hover:underline cursor-pointer shrink-0"
                    >
                      Disconnect
                    </button>
                  )}
                </div>

                {showGhPatBox && !ghConnected && (
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <input
                      type="password"
                      value={ghPatInput}
                      onChange={(e) => setGhPatInput(e.target.value)}
                      placeholder="ghp_... (GitHub) or glpat-... (GitLab)"
                      className={cn(
                        "flex-1 px-3 py-2 rounded-lg text-xs font-mono border focus:outline-none focus:border-cyan-400",
                        isDark ? "bg-[#09090b] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                      )}
                    />
                    <button
                      type="button"
                      disabled={ghLoading}
                      onClick={handleConnectGithubPat}
                      className="px-4 py-2 rounded-lg text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 cursor-pointer disabled:opacity-50"
                    >
                      {ghLoading ? "Connecting..." : "Save & Load Repos"}
                    </button>
                  </div>
                )}

                {ghConnected && ghRepos.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                        Select Repository ({ghRepos.length})
                      </label>
                      <Select
                        value={selectedGhRepo}
                        onChange={(val) => {
                          setSelectedGhRepo(String(val));
                          handleSelectGithubRepo(String(val));
                        }}
                        placeholder="-- Choose a repository --"
                        options={ghRepos.map((r) => ({
                          value: r.fullName,
                          label: `${r.fullName} (${r.private ? "Private" : "Public"})${r.language ? ` • ${r.language}` : ""}`,
                        }))}
                      />
                    </div>

                    {ghBranches.length > 0 && (
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                          Select Branch
                        </label>
                        <Select
                          value={branch}
                          onChange={(val) => setBranch(String(val))}
                          options={ghBranches.map((b) => ({ value: b, label: b }))}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <label
                className={cn(
                  "block text-xs font-bold uppercase tracking-wider mb-2",
                  isDark ? "text-zinc-400" : "text-slate-600"
                )}
              >
                Quick Starter Templates (Optional)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {QUICK_STARTERS.map((starter) => (
                  <button
                    key={starter.name}
                    type="button"
                    onClick={() => handleApplyPreset(starter)}
                    className={cn(
                      "p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer flex items-center justify-between group",
                      isDark
                        ? "bg-white/[0.02] border-white/[0.08] hover:border-cyan-500/40 hover:bg-white/[0.04] text-zinc-300"
                        : "bg-slate-50 border-slate-200 hover:border-cyan-400 hover:bg-slate-100 text-slate-700"
                    )}
                  >
                    <span className="truncate">{starter.name}</span>
                    <Sparkles className="w-3 h-3 text-cyan-400 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-1">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    className={cn(
                      "block text-xs font-bold uppercase tracking-wider",
                      isDark ? "text-zinc-300" : "text-slate-700"
                    )}
                  >
                    Repository URL <span className="text-rose-400">*</span>
                  </label>
                  {detectedBadge && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <Sparkles className="w-3 h-3" />
                      Detected: {detectedBadge}
                    </span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    required
                    value={gitUrl}
                    onChange={(e) => setGitUrl(e.target.value)}
                    placeholder="https://github.com/username/repository.git"
                    className={cn(
                      "flex-1 px-4 py-2.5 rounded-xl text-sm border font-mono transition-colors focus:outline-none focus:border-cyan-400",
                      isDark
                        ? "bg-black/30 border-white/10 text-white placeholder-zinc-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                    )}
                  />
                  <button
                    type="button"
                    disabled={detectingRepo || !gitUrl.trim()}
                    onClick={() => handleAutoDetectRepo()}
                    className={cn(
                      "px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50",
                      isDark
                        ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
                        : "bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100"
                    )}
                  >
                    <Sparkles className={cn("w-3.5 h-3.5", detectingRepo && "animate-spin")} />
                    <span>{detectingRepo ? "Detecting..." : "Auto-Detect Stack"}</span>
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1.5">
                  Public or private HTTPS repositories on GitHub, GitLab, Bitbucket, or Gitea.
                </p>

                {/* Private Repository Toggle & Token Input */}
                <div className="pt-2">
                  <AdminCheckbox
                    checked={isPrivateRepo}
                    onChange={setIsPrivateRepo}
                    label={
                      <span className="font-semibold text-xs">
                        Private Repository (GitHub, GitLab, Bitbucket, Gitea)
                      </span>
                    }
                  />

                  {isPrivateRepo && (
                    <div
                      className={cn(
                        "mt-3 p-3.5 rounded-xl border grid grid-cols-1 sm:grid-cols-2 gap-3 transition-all",
                        isDark
                          ? "bg-white/[0.02] border-white/10"
                          : "bg-slate-50 border-slate-200"
                      )}
                    >
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                          Access Token / Deploy Token <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="password"
                          required={isPrivateRepo}
                          value={gitToken}
                          onChange={(e) => setGitToken(e.target.value)}
                          placeholder="ghp_... or glpat-..."
                          className={cn(
                            "w-full px-3 py-2 rounded-lg text-xs border font-mono transition-colors focus:outline-none focus:border-cyan-400",
                            isDark
                              ? "bg-black/30 border-white/10 text-white"
                              : "bg-white border-slate-200 text-slate-900"
                          )}
                        />
                        <p className="text-[10px] text-zinc-500">
                          Token will be encrypted at rest and masked in all build logs.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                          Git Username (Optional)
                        </label>
                        <input
                          type="text"
                          value={gitUser}
                          onChange={(e) => setGitUser(e.target.value)}
                          placeholder="e.g. git (GitHub) or oauth2 (GitLab)"
                          className={cn(
                            "w-full px-3 py-2 rounded-lg text-xs border font-mono transition-colors focus:outline-none focus:border-cyan-400",
                            isDark
                              ? "bg-black/30 border-white/10 text-white"
                              : "bg-white border-slate-200 text-slate-900"
                          )}
                        />
                        <p className="text-[10px] text-zinc-500">
                          Defaults to &apos;git&apos; for GitHub/Bitbucket or &apos;oauth2&apos; for GitLab.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    className={cn(
                      "block text-xs font-bold uppercase tracking-wider mb-2",
                      isDark ? "text-zinc-300" : "text-slate-700"
                    )}
                  >
                    Branch
                  </label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="main"
                    className={cn(
                      "w-full px-4 py-2.5 rounded-xl text-sm border font-mono transition-colors focus:outline-none focus:border-cyan-400",
                      isDark
                        ? "bg-black/30 border-white/10 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-900"
                    )}
                  />
                </div>

                <div>
                  <label
                    className={cn(
                      "block text-xs font-bold uppercase tracking-wider mb-2",
                      isDark ? "text-zinc-300" : "text-slate-700"
                    )}
                  >
                    Root Directory
                  </label>
                  <input
                    type="text"
                    value={rootDirectory}
                    onChange={(e) => setRootDirectory(e.target.value)}
                    placeholder="/"
                    className={cn(
                      "w-full px-4 py-2.5 rounded-xl text-sm border font-mono transition-colors focus:outline-none focus:border-cyan-400",
                      isDark
                        ? "bg-black/30 border-white/10 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-900"
                    )}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Build Configuration (Dockerfile / Auto Detect / Buildpack) */}
          <div
            className={cn(
              "rounded-2xl border p-5 sm:p-6 shadow-2xs space-y-4",
              isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90"
            )}
          >
            {/* Header with Active Selection Pill */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <Code2 className="w-5 h-5 text-cyan-400" />
                <h2
                  className={cn(
                    "text-base font-bold",
                    isDark ? "text-white" : "text-slate-900"
                  )}
                >
                  2. Build Configuration
                </h2>
              </div>

              {/* Active Selection Badge */}
              <div
                className={cn(
                  "inline-flex items-center gap-2 px-2.5 py-1 rounded-xl border text-xs font-semibold shrink-0 self-start sm:self-auto",
                  buildMode === "DOCKERFILE"
                    ? "bg-[#2496ED]/10 border-[#2496ED]/25 text-[#2496ED]"
                    : buildMode === "BUILDPACK"
                    ? "bg-purple-500/10 border-purple-500/25 text-purple-400"
                    : activeFrameworkObj.bgColor
                )}
              >
                {buildMode === "DOCKERFILE" ? (
                  <>
                    <SiDocker className="w-3.5 h-3.5" />
                    <span>Mode: <strong>Native Dockerfile</strong></span>
                  </>
                ) : buildMode === "BUILDPACK" ? (
                  <>
                    <Boxes className="w-3.5 h-3.5" />
                    <span>Mode: <strong>Cloud Buildpack</strong></span>
                  </>
                ) : (
                  <>
                    <ActiveFwIcon className={cn("w-3.5 h-3.5", activeFrameworkObj.color)} />
                    <span className={activeFrameworkObj.color}>
                      Auto Detect: <strong>{activeFrameworkObj.name}</strong>
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* 3 Build Mode Cards (Dockerfile / Auto Detect / Buildpack) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => {
                  setBuildMode("DOCKERFILE");
                  setBuildType("DOCKERFILE");
                }}
                className={cn(
                  "p-4 rounded-xl border text-left transition-all cursor-pointer relative",
                  buildMode === "DOCKERFILE"
                    ? "border-cyan-400 bg-cyan-500/10 ring-1 ring-cyan-400/40 shadow-sm"
                    : isDark
                    ? "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#2496ED]/15 border border-[#2496ED]/30 flex items-center justify-center">
                    <SiDocker className="w-4 h-4 text-[#2496ED]" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-cyan-400 text-slate-950">
                    Recommended
                  </span>
                </div>
                <div className={cn("text-xs font-bold", isDark ? "text-white" : "text-slate-900")}>
                  Dockerfile
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                  Use your repository&apos;s Dockerfile or write your own custom Dockerfile inline.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setBuildMode("AUTO");
                  if (buildType === "DOCKERFILE") {
                    handleFrameworkChange("LARAVEL");
                  }
                }}
                className={cn(
                  "p-4 rounded-xl border text-left transition-all cursor-pointer relative",
                  buildMode === "AUTO"
                    ? "border-cyan-400 bg-cyan-500/10 ring-1 ring-cyan-400/40 shadow-sm"
                    : isDark
                    ? "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">18 Stacks</span>
                </div>
                <div className={cn("text-xs font-bold", isDark ? "text-white" : "text-slate-900")}>
                  Auto Detect
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                  Pick a language/framework preset (Laravel, Next.js, Python, Go, Node.js, etc.).
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setBuildMode("BUILDPACK");
                }}
                className={cn(
                  "p-4 rounded-xl border text-left transition-all cursor-pointer relative",
                  buildMode === "BUILDPACK"
                    ? "border-cyan-400 bg-cyan-500/10 ring-1 ring-cyan-400/40 shadow-sm"
                    : isDark
                    ? "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
                    <Boxes className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">Zero-Config</span>
                </div>
                <div className={cn("text-xs font-bold", isDark ? "text-white" : "text-slate-900")}>
                  Buildpack
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                  Automated build without needing a Dockerfile in your repository.
                </p>
              </button>
            </div>

            {/* MODE 1: NATIVE DOCKERFILE (REPO OR INLINE EDITOR) */}
            {buildMode === "DOCKERFILE" && (
              <div
                className={cn(
                  "p-4 rounded-xl border space-y-4",
                  isDark ? "bg-black/30 border-white/[0.06]" : "bg-slate-50 border-slate-200"
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Dockerfile Source
                  </span>
                  <div className="inline-flex items-center gap-1 p-1 rounded-lg border border-white/10 bg-black/40">
                    <button
                      type="button"
                      onClick={() => setDockerfileSource("REPO")}
                      className={cn(
                        "px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                        dockerfileSource === "REPO"
                          ? "bg-cyan-500 text-slate-950 font-bold"
                          : "text-zinc-400 hover:text-white"
                      )}
                    >
                      From Git Repository
                    </button>
                    <button
                      type="button"
                      onClick={() => setDockerfileSource("INLINE")}
                      className={cn(
                        "px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                        dockerfileSource === "INLINE"
                          ? "bg-cyan-500 text-slate-950 font-bold"
                          : "text-zinc-400 hover:text-white"
                      )}
                    >
                      Write / Edit Dockerfile
                    </button>
                  </div>
                </div>

                {dockerfileSource === "REPO" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                        Dockerfile Path in Repository
                      </label>
                      <input
                        type="text"
                        value={dockerfilePath}
                        onChange={(e) => setDockerfilePath(e.target.value)}
                        placeholder="Dockerfile"
                        className={cn(
                          "w-full px-3 py-2 rounded-xl text-xs border font-mono transition-colors focus:outline-none focus:border-cyan-400",
                          isDark
                            ? "bg-black/30 border-white/10 text-white"
                            : "bg-white border-slate-200 text-slate-900"
                        )}
                      />
                      <p className="text-[11px] text-zinc-500 mt-1">
                        Auto-reads <code>Dockerfile</code> from your Git repository root or subfolder (e.g. <code>docker/Dockerfile</code>).
                      </p>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                        Container Exposed Port
                      </label>
                      <input
                        type="number"
                        value={appPort}
                        onChange={(e) => setAppPort(Number(e.target.value))}
                        placeholder="80"
                        className={cn(
                          "w-full px-3 py-2 rounded-xl text-xs border font-mono transition-colors focus:outline-none focus:border-cyan-400",
                          isDark
                            ? "bg-black/30 border-white/10 text-white"
                            : "bg-white border-slate-200 text-slate-900"
                        )}
                      />
                      <p className="text-[11px] text-zinc-500 mt-1">
                        TCP port exposed by your Dockerfile (e.g. 80, 3000, 8080).
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-zinc-400 mr-1 font-medium">Quick Templates:</span>
                      {DOCKERFILE_TEMPLATES.map((tpl) => (
                        <button
                          key={tpl.label}
                          type="button"
                          onClick={() => {
                            setInlineDockerfile(tpl.content);
                            setAppPort(tpl.port);
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer",
                            isDark
                              ? "bg-white/5 border-white/10 text-zinc-300 hover:bg-cyan-500/15 hover:border-cyan-500/30 hover:text-cyan-400"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                          )}
                        >
                          {tpl.label}
                        </button>
                      ))}
                    </div>

                    <div className={cn(
                      "rounded-2xl border overflow-hidden shadow-2xs transition-colors",
                      isDark ? "bg-[#090d16] border-white/10" : "bg-white border-slate-200"
                    )}>
                      <div className={cn(
                        "px-3.5 py-2 border-b flex items-center justify-between select-none",
                        isDark ? "bg-[#14161f] border-white/[0.08]" : "bg-slate-50/90 border-slate-200"
                      )}>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] inline-block" />
                          <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] inline-block" />
                          <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f] inline-block" />
                          <span className={cn("text-[11px] font-mono font-bold ml-1.5", isDark ? "text-zinc-300" : "text-slate-700")}>
                            Dockerfile
                          </span>
                        </div>
                        <span className={cn("text-[10px] font-mono", isDark ? "text-zinc-500" : "text-slate-400")}>
                          custom-container
                        </span>
                      </div>
                      <textarea
                        rows={11}
                        value={inlineDockerfile}
                        onChange={(e) => setInlineDockerfile(e.target.value)}
                        placeholder="FROM node:20-alpine..."
                        spellCheck={false}
                        className={cn(
                          "w-full p-3.5 text-xs font-mono leading-relaxed transition-colors focus:outline-none resize-y",
                          isDark
                            ? "bg-[#090d16] text-emerald-300 placeholder-zinc-600"
                            : "bg-white text-slate-800 placeholder-slate-400"
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                          Container Exposed Port
                        </label>
                        <input
                          type="number"
                          value={appPort}
                          onChange={(e) => setAppPort(Number(e.target.value))}
                          placeholder="3000"
                          className={cn(
                            "w-full px-3 py-2 rounded-xl text-xs border font-mono transition-colors focus:outline-none focus:border-cyan-400",
                            isDark
                              ? "bg-black/30 border-white/10 text-white"
                              : "bg-white border-slate-200 text-slate-900"
                          )}
                        />
                      </div>
                      <div className="flex items-end pb-2">
                        <p className="text-[11px] text-zinc-500">
                          Your custom Dockerfile will be mounted directly into the Kaniko builder and packaged into your container image.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MODE 3: CLOUD NATIVE BUILDPACKS (PAKETO) */}
            {buildMode === "BUILDPACK" && (
              <div
                className={cn(
                  "p-4 rounded-xl border space-y-3",
                  isDark ? "bg-black/30 border-purple-500/20" : "bg-purple-50/50 border-purple-200"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-purple-400" />
                    <span className={cn("text-xs font-bold", isDark ? "text-white" : "text-slate-900")}>
                      Cloud Buildpack Auto-Detector (Zero-Apt Multi-Stage)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                    Zero-Dockerfile
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Automatically inspects your repository stack (Laravel, PHP, Node.js/Next.js, Python, Go, Rust, Static HTML) and builds an optimized zero-apt-get multi-stage container image without needing any Dockerfile.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Container Exposed Port (PORT env)
                    </label>
                    <input
                      type="number"
                      value={appPort}
                      onChange={(e) => setAppPort(Number(e.target.value))}
                      placeholder="8080"
                      className={cn(
                        "w-full px-3 py-2 rounded-xl text-xs border font-mono transition-colors focus:outline-none focus:border-cyan-400",
                        isDark
                          ? "bg-black/30 border-white/10 text-white"
                          : "bg-white border-slate-200 text-slate-900"
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Root Directory
                    </label>
                    <input
                      type="text"
                      value={rootDirectory}
                      onChange={(e) => setRootDirectory(e.target.value)}
                      placeholder="/"
                      className={cn(
                        "w-full px-3 py-2 rounded-xl text-xs border font-mono transition-colors focus:outline-none focus:border-cyan-400",
                        isDark
                          ? "bg-black/30 border-white/10 text-white"
                          : "bg-white border-slate-200 text-slate-900"
                      )}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* MODE 2: AUTO DETECT FRAMEWORK GRID */}
            {buildMode === "AUTO" && (
              <>
            {/* Filter Categories and Live Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              {/* Category Pills */}
              <div
                className={cn(
                  "inline-flex items-center gap-1 p-1 rounded-xl border overflow-x-auto no-scrollbar",
                  isDark ? "bg-black/30 border-white/10" : "bg-slate-100 border-slate-200"
                )}
              >
                {CATEGORIES.map((cat) => {
                  const isActive = frameworkCategory === cat.id;
                  const count =
                    cat.id === "ALL"
                      ? FRAMEWORKS.length
                      : FRAMEWORKS.filter((f) => f.category === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFrameworkCategory(cat.id)}
                      className={cn(
                        "px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer",
                        isActive
                          ? "bg-cyan-500 text-slate-950 font-bold shadow-xs"
                          : isDark
                          ? "text-zinc-400 hover:text-white hover:bg-white/5"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white"
                      )}
                    >
                      <span>{cat.label}</span>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.2 rounded-full",
                          isActive
                            ? "bg-slate-950/20 text-slate-950 font-black"
                            : isDark
                            ? "bg-white/10 text-zinc-400"
                            : "bg-slate-200 text-slate-600"
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search Input */}
              <div className="relative sm:w-56">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={frameworkSearch}
                  onChange={(e) => setFrameworkSearch(e.target.value)}
                  placeholder="Search framework..."
                  className={cn(
                    "w-full pl-8 pr-7 py-1.5 rounded-xl text-xs border transition-colors focus:outline-none focus:border-cyan-400",
                    isDark
                      ? "bg-black/30 border-white/10 text-white placeholder-zinc-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                  )}
                />
                {frameworkSearch && (
                  <button
                    type="button"
                    onClick={() => setFrameworkSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Framework Cards (Paginated Grid) */}
            {currentFrameworks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {currentFrameworks.map((fw) => {
                  const isSelected = buildType === fw.id;
                  const Icon = fw.icon;
                  return (
                    <button
                      key={fw.id}
                      type="button"
                      onClick={() => handleFrameworkChange(fw.id)}
                      className={cn(
                        "p-3.5 rounded-xl border text-left transition-all cursor-pointer relative group flex flex-col justify-between",
                        isSelected
                          ? "border-cyan-400 bg-cyan-500/10 shadow-sm ring-1 ring-cyan-400/40"
                          : isDark
                          ? "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                          : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100"
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <div
                            className={cn(
                              "w-9 h-9 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-105 shadow-2xs",
                              fw.bgColor
                            )}
                          >
                            <Icon className={cn("w-5 h-5", fw.color)} />
                          </div>
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-cyan-400/30 animate-pulse" />
                          )}
                        </div>
                        <div
                          className={cn(
                            "text-xs font-bold truncate",
                            isDark ? "text-white" : "text-slate-900"
                          )}
                        >
                          {fw.name}
                        </div>
                        <div className="text-[10px] text-zinc-500 line-clamp-2 mt-0.5 leading-snug">
                          {fw.desc}
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                        <span>Port {fw.defaultPort}</span>
                        <span className="uppercase text-[9px] text-zinc-500">
                          {fw.category}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div
                className={cn(
                  "p-8 text-center rounded-xl border space-y-1 text-xs",
                  isDark ? "border-white/5 bg-white/[0.01]" : "border-slate-200 bg-slate-50"
                )}
              >
                <p className="text-zinc-400 font-medium">
                  No framework matches your search &quot;{frameworkSearch}&quot;
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFrameworkSearch("");
                    setFrameworkCategory("ALL");
                  }}
                  className="text-cyan-400 hover:underline text-xs"
                >
                  Clear filter &amp; view all
                </button>
              </div>
            )}

            {/* Pagination Controls */}
            {totalFrameworkPages > 1 && (
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/[0.04]">
                <div className="text-xs text-zinc-400">
                  Showing{" "}
                  <strong className={isDark ? "text-zinc-200" : "text-slate-800"}>
                    {(frameworkPage - 1) * FRAMEWORKS_PER_PAGE + 1} -{" "}
                    {Math.min(
                      frameworkPage * FRAMEWORKS_PER_PAGE,
                      filteredFrameworks.length
                    )}
                  </strong>{" "}
                  of{" "}
                  <strong className={isDark ? "text-zinc-200" : "text-slate-800"}>
                    {filteredFrameworks.length}
                  </strong>{" "}
                  frameworks
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    disabled={frameworkPage <= 1}
                    onClick={() => setFrameworkPage((p) => Math.max(1, p - 1))}
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
                      isDark
                        ? "bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300"
                        : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalFrameworkPages }).map((_, idx) => {
                      const pNum = idx + 1;
                      const isActive = frameworkPage === pNum;
                      return (
                        <button
                          key={pNum}
                          type="button"
                          onClick={() => setFrameworkPage(pNum)}
                          className={cn(
                            "w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer",
                            isActive
                              ? "bg-cyan-500 text-slate-950 shadow-xs"
                              : isDark
                              ? "text-zinc-400 hover:text-white hover:bg-white/5"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                          )}
                        >
                          {pNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={frameworkPage >= totalFrameworkPages}
                    onClick={() =>
                      setFrameworkPage((p) => Math.min(totalFrameworkPages, p + 1))
                    }
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
                      isDark
                        ? "bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300"
                        : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Custom Commands / Overrides Box */}
            <div
              className={cn(
                "p-4 rounded-xl border space-y-3 mt-3",
                isDark ? "bg-black/30 border-white/[0.06]" : "bg-slate-50 border-slate-200"
              )}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-zinc-400">
                  Build &amp; Run Overrides ({activeFrameworkObj.name})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setBuildMode("DOCKERFILE");
                    setDockerfileSource("INLINE");
                    setBuildType("DOCKERFILE");
                  }}
                  className="text-[11px] font-bold text-cyan-400 hover:underline cursor-pointer"
                >
                  Use Custom Dockerfile Instead →
                </button>
              </div>

              {buildType !== "DOCKERFILE" ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Build Command
                    </label>
                    <input
                      type="text"
                      value={buildCommand}
                      onChange={(e) => setBuildCommand(e.target.value)}
                      placeholder={activeFrameworkObj.defaultBuild || "None"}
                      className={cn(
                        "w-full px-3 py-2 rounded-xl text-xs border font-mono transition-colors focus:outline-none focus:border-cyan-400",
                        isDark
                          ? "bg-black/30 border-white/10 text-white"
                          : "bg-white border-slate-200 text-slate-900"
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Start Command
                    </label>
                    <input
                      type="text"
                      value={startCommand}
                      onChange={(e) => setStartCommand(e.target.value)}
                      placeholder={activeFrameworkObj.defaultStart || "Default"}
                      className={cn(
                        "w-full px-3 py-2 rounded-xl text-xs border font-mono transition-colors focus:outline-none focus:border-cyan-400",
                        isDark
                          ? "bg-black/30 border-white/10 text-white"
                          : "bg-white border-slate-200 text-slate-900"
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Container Port
                    </label>
                    <input
                      type="number"
                      value={appPort}
                      onChange={(e) => setAppPort(Number(e.target.value))}
                      placeholder={String(activeFrameworkObj.defaultPort)}
                      className={cn(
                        "w-full px-3 py-2 rounded-xl text-xs border font-mono transition-colors focus:outline-none focus:border-cyan-400",
                        isDark
                          ? "bg-black/30 border-white/10 text-white"
                          : "bg-white border-slate-200 text-slate-900"
                      )}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Dockerfile Path
                    </label>
                    <input
                      type="text"
                      value={dockerfilePath}
                      onChange={(e) => setDockerfilePath(e.target.value)}
                      placeholder="Dockerfile"
                      className={cn(
                        "w-full px-3 py-2 rounded-xl text-xs border font-mono transition-colors focus:outline-none focus:border-cyan-400",
                        isDark
                          ? "bg-black/30 border-white/10 text-white"
                          : "bg-white border-slate-200 text-slate-900"
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Exposed Port
                    </label>
                    <input
                      type="number"
                      value={appPort}
                      onChange={(e) => setAppPort(Number(e.target.value))}
                      placeholder="3000"
                      className={cn(
                        "w-full px-3 py-2 rounded-xl text-xs border font-mono transition-colors focus:outline-none focus:border-cyan-400",
                        isDark
                          ? "bg-black/30 border-white/10 text-white"
                          : "bg-white border-slate-200 text-slate-900"
                      )}
                    />
                  </div>
                </div>
              )}
            </div>
              </>
            )}
            {/* Advanced Production Options (Collapsible so main flow stays clean) */}
            <div
              className={cn(
                "rounded-xl border transition-all",
                isDark ? "bg-black/20 border-white/[0.06]" : "bg-slate-50/70 border-slate-200"
              )}
            >
              <button
                type="button"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="w-full p-4 flex items-center justify-between text-left cursor-pointer"
              >
                <div>
                  <span className={cn("text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-300" : "text-slate-700")}>
                    Advanced Production Options (Optional)
                  </span>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Health check probe, persistent disk mount, Docker build cache, and PR preview deployments.
                  </p>
                </div>
                <span className="text-xs font-bold text-cyan-400 shrink-0 ml-2">
                  {showAdvancedOptions ? "Hide ▲" : "Configure ▼"}
                </span>
              </button>

              {showAdvancedOptions && (
                <div className="px-4 pb-4 pt-2 border-t border-white/[0.06] space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                        Health Check Path
                      </label>
                      <input
                        type="text"
                        value={healthCheckPath}
                        onChange={(e) => setHealthCheckPath(e.target.value)}
                        placeholder="/health or /"
                        className={cn(
                          "w-full h-[42px] px-3.5 rounded-xl text-xs border font-mono transition-colors focus:outline-none focus:border-cyan-400",
                          isDark ? "bg-black/40 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                        )}
                      />
                      <p className="text-[10px] text-zinc-500 mt-1">Zero-downtime readiness probe</p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                        Persistent Volume Path
                      </label>
                      <input
                        type="text"
                        value={persistentVolumePath}
                        onChange={(e) => setPersistentVolumePath(e.target.value)}
                        placeholder="/var/www/html/storage"
                        className={cn(
                          "w-full h-[42px] px-3.5 rounded-xl text-xs border font-mono transition-colors focus:outline-none focus:border-cyan-400",
                          isDark ? "bg-black/40 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900"
                        )}
                      />
                      <p className="text-[10px] text-zinc-500 mt-1">Mount permanent disk across redeploys</p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                        Volume Size (GB)
                      </label>
                      <Select
                        value={persistentVolumeGb}
                        onChange={(val) => setPersistentVolumeGb(Number(val))}
                        className="h-[42px] px-3.5 py-0 text-xs font-mono"
                        options={[
                          { value: 0, label: "Disabled (Ephemeral)" },
                          { value: 1, label: "1 GB Persistent Disk" },
                          { value: 5, label: "5 GB Persistent Disk" },
                          { value: 10, label: "10 GB Persistent Disk" },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className={cn("p-3 rounded-xl border", isDark ? "bg-black/30 border-white/[0.06]" : "bg-white border-slate-200")}>
                      <AdminCheckbox
                        checked={enableBuildCache}
                        onChange={setEnableBuildCache}
                        label={
                          <div>
                            <div className={cn("text-xs font-bold", isDark ? "text-white" : "text-slate-900")}>Registry Layer Build Cache</div>
                            <div className="text-[10px] text-zinc-500 font-normal">Cache Docker layers in cluster registry for faster rebuilds</div>
                          </div>
                        }
                      />
                    </div>

                    <div className={cn("p-3 rounded-xl border", isDark ? "bg-black/30 border-white/[0.06]" : "bg-white border-slate-200")}>
                      <AdminCheckbox
                        checked={prPreviewEnabled}
                        onChange={setPrPreviewEnabled}
                        label={
                          <div>
                            <div className={cn("text-xs font-bold", isDark ? "text-white" : "text-slate-900")}>PR Preview Environments</div>
                            <div className="text-[10px] text-zinc-500 font-normal">Auto-deploy temporary preview URLs on Pull Requests</div>
                          </div>
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Compute Plan Selection (Matching Managed App 100%) */}
          <div
            className={cn(
              "rounded-2xl border p-5 sm:p-6 shadow-2xs space-y-4",
              isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90"
            )}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4 border-b pb-3 border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <Cpu className="w-5 h-5 text-cyan-400 shrink-0" />
                <h2
                  className={cn(
                    "text-base font-bold tracking-tight",
                    isDark ? "text-white" : "text-slate-900"
                  )}
                >
                  3. Compute Tier &amp; Plan
                </h2>
              </div>
              <span className={cn("text-xs font-medium shrink-0", isDark ? "text-zinc-400" : "text-slate-500")}>
                10 GB SSD Storage Included
              </span>
            </div>

            <div className="space-y-2.5">
              {availablePlans.map((plan) => {
                const isSelected = selectedPlan.planCode === plan.planCode;
                const isPlanDisabled = Boolean(
                  clusterCapacity &&
                    (!clusterCapacity.available ||
                      clusterCapacity.status === "FULL" ||
                      clusterCapacity.status === "OFFLINE" ||
                      (clusterCapacity.totalMemoryMb > 0 &&
                        clusterCapacity.totalMemoryMb -
                          clusterCapacity.allocatedMemoryMb <
                          plan.memoryMb))
                );

                return (
                  <div
                    key={plan.planCode}
                    onClick={() => !isPlanDisabled && setSelectedPlan(plan)}
                    className={cn(
                      "relative p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                      isPlanDisabled
                        ? "opacity-60 cursor-not-allowed border-dashed bg-white/[0.01]"
                        : "cursor-pointer",
                      isSelected && !isPlanDisabled
                        ? isDark
                          ? "bg-cyan-500/10 border-cyan-400 ring-1 ring-cyan-400/40 shadow-md"
                          : "bg-cyan-50/90 border-cyan-500 ring-1 ring-cyan-500/30 shadow-xs"
                        : isDark
                        ? "bg-[#111115] border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.02]"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 shadow-2xs"
                    )}
                  >
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all shadow-2xs",
                          isSelected && !isPlanDisabled
                            ? activeFrameworkObj.bgColor
                            : isDark
                            ? "bg-white/[0.03] border-white/[0.08]"
                            : "bg-slate-100 border-slate-200"
                        )}
                      >
                        <ActiveFwIcon
                          className={cn(
                            "w-5 h-5",
                            isSelected && !isPlanDisabled
                              ? activeFrameworkObj.color
                              : isDark
                              ? "text-zinc-400"
                              : "text-slate-500"
                          )}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4
                            className={cn(
                              "text-sm font-bold tracking-tight",
                              isDark ? "text-white" : "text-slate-900"
                            )}
                          >
                            {activeFrameworkObj.name} ({plan.planCode})
                          </h4>
                          {plan.popular && !isPlanDisabled && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-cyan-400 text-slate-950">
                              Popular
                            </span>
                          )}
                        </div>
                        <p
                          className={cn(
                            "text-xs leading-relaxed line-clamp-1",
                            isDark ? "text-zinc-400" : "text-slate-500"
                          )}
                        >
                          {activeFrameworkObj.name} with {plan.cpuShares} CPU and {plan.memoryMb >= 1024 ? `${plan.memoryMb / 1024}GB` : `${plan.memoryMb}MB`} RAM
                        </p>
                        <div className="flex items-center gap-x-2.5 sm:gap-x-3 gap-y-1 mt-1 text-[11px] text-[var(--text-muted)] font-medium flex-wrap">
                          <span className="flex items-center gap-1 whitespace-nowrap shrink-0">
                            <Cpu className="w-3 h-3 text-cyan-400" />
                            {plan.cpuLabel}
                          </span>
                          <span className="shrink-0 text-zinc-500">•</span>
                          <span className="flex items-center gap-1 whitespace-nowrap shrink-0">
                            <Zap className="w-3 h-3 text-cyan-400" />
                            {plan.ramLabel}
                          </span>
                          <span className="shrink-0 text-zinc-500">•</span>
                          <span
                            className={cn(
                              "font-bold whitespace-nowrap shrink-0",
                              isDark ? "text-zinc-200" : "text-slate-800"
                            )}
                          >
                            {formatRupiah(plan.monthlyPrice)}/month
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 self-stretch sm:self-auto pt-2 sm:pt-0 border-t sm:border-0 border-inherit">
                      {/* Stock / Capacity Status Badge */}
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                          isPlanDisabled
                            ? isDark
                              ? "bg-red-500/10 text-red-400 border-red-500/20"
                              : "bg-red-50 text-red-700 border-red-200"
                            : isDark
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        )}
                      >
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            isPlanDisabled
                              ? "bg-red-400"
                              : "bg-emerald-400 animate-pulse"
                          )}
                        />
                        {isPlanDisabled ? "Full Capacity" : "Available"}
                      </span>

                      <div
                        className={cn(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                          isSelected && !isPlanDisabled
                            ? "border-cyan-400 bg-cyan-400/20 shadow-xs"
                            : isDark
                            ? "border-zinc-600"
                            : "border-slate-300"
                        )}
                      >
                        {isSelected && !isPlanDisabled && (
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-xs shadow-cyan-400/60" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: App Identity & Configuration */}
          <div
            className={cn(
              "rounded-2xl border p-5 sm:p-6 shadow-2xs space-y-4",
              isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90"
            )}
          >
            <div className="flex items-center gap-2.5 border-b pb-3 border-white/[0.06]">
              <Globe className="w-5 h-5 text-cyan-400" />
              <h2
                className={cn(
                  "text-base font-bold",
                  isDark ? "text-white" : "text-slate-900"
                )}
              >
                4. App Identity &amp; Auto Subdomain
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  className={cn(
                    "block text-xs font-bold uppercase tracking-wider mb-2",
                    isDark ? "text-zinc-300" : "text-slate-700"
                  )}
                >
                  Application Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. my-laravel-app"
                  className={cn(
                    "w-full px-4 py-2.5 rounded-xl text-sm border transition-colors focus:outline-none focus:border-cyan-400",
                    isDark
                      ? "bg-black/30 border-white/10 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-900"
                  )}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    className={cn(
                      "block text-xs font-bold uppercase tracking-wider",
                      isDark ? "text-zinc-300" : "text-slate-700"
                    )}
                  >
                    Auto Subdomain <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleRegenerateSubdomain}
                    className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Regenerate</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={subdomain}
                    suppressHydrationWarning
                    onChange={(e) =>
                      setSubdomain(
                        e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                      )
                    }
                    placeholder="e.g. web-a0gt"
                    className={cn(
                      "w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono font-medium transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400",
                      isDark
                        ? "bg-black/30 border-white/10 text-white placeholder-zinc-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                    )}
                  />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Prefix for <span className="font-mono text-cyan-400">*.app.masdikacloud.my.id</span>
                </p>
              </div>
            </div>

            {/* Live Domain Preview Alert */}
            <div
              className={cn(
                "p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs",
                isDark
                  ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-300"
                  : "bg-cyan-50 border-cyan-200 text-cyan-800"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-medium shrink-0">
                  <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Target HTTPS URL:</span>
                </span>
                <span className="text-[10px] uppercase font-bold shrink-0 bg-cyan-400/20 px-2 py-0.5 rounded sm:hidden">
                  Auto SSL Active
                </span>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-2 min-w-0">
                <strong className="font-mono text-xs font-bold text-cyan-400 break-all leading-normal" suppressHydrationWarning>
                  https://{previewDomain}
                </strong>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold shrink-0 bg-cyan-400/20 px-2 py-0.5 rounded">
                  Auto SSL Active
                </span>
              </div>
            </div>

            {/* Environment Variables */}
            <div className="pt-2 border-t border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Environment Variables</span>
                </label>
                <span className="text-[11px] text-zinc-500 font-mono">Optional</span>
              </div>

              <textarea
                rows={3}
                value={envVars}
                onChange={(e) => setEnvVars(e.target.value)}
                placeholder="APP_KEY=base64:...&#10;DB_CONNECTION=mysql&#10;DB_HOST=192.168.79.20"
                className={cn(
                  "w-full px-4 py-2.5 rounded-xl text-xs font-mono border transition-colors focus:outline-none focus:border-cyan-400 resize-y",
                  isDark
                    ? "bg-black/30 border-white/10 text-white placeholder-zinc-500"
                    : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                )}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Summary & Commitment Breakdown (Exact Match with Gambar 2 / Managed App) */}
        <div className="lg:col-span-1 lg:sticky lg:top-24 space-y-4">
          <div
            className={cn(
              "rounded-2xl border p-5 sm:p-6 shadow-2xs space-y-5",
              isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90"
            )}
          >
            <div>
              <h3
                className={cn(
                  "text-base sm:text-lg font-bold tracking-tight",
                  isDark ? "text-white" : "text-slate-900"
                )}
              >
                Deployment Summary
              </h3>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <p
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-wider mb-1.5",
                    isDark ? "text-zinc-500" : "text-slate-400"
                  )}
                >
                  App Type
                </p>
                <div
                  className={cn(
                    "flex items-center gap-2 font-bold text-sm",
                    isDark ? "text-white" : "text-slate-900"
                  )}
                >
                  <span
                    className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border shadow-2xs",
                      activeFrameworkObj.bgColor
                    )}
                  >
                    <ActiveFwIcon
                      className={cn("w-3.5 h-3.5", activeFrameworkObj.color)}
                    />
                  </span>
                  <span>{activeFrameworkObj.name}</span>
                </div>
              </div>

              <div>
                <p
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-wider mb-1",
                    isDark ? "text-zinc-500" : "text-slate-400"
                  )}
                >
                  Template
                </p>
                <p
                  className={cn(
                    "font-bold text-sm",
                    isDark ? "text-white" : "text-slate-900"
                  )}
                >
                  {activeFrameworkObj.name} ({selectedPlan.planCode})
                </p>
              </div>

              <div>
                <p
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-wider mb-1",
                    isDark ? "text-zinc-500" : "text-slate-400"
                  )}
                >
                  Connection Mode
                </p>
                <p
                  className={cn(
                    "font-bold text-sm",
                    isDark ? "text-white" : "text-slate-900"
                  )}
                >
                  Web HTTPS + Auto SSL (Let&apos;s Encrypt)
                </p>
              </div>

              <div
                className={cn(
                  "pt-4 border-t space-y-2",
                  isDark ? "border-white/[0.08]" : "border-slate-100"
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "text-sm font-bold",
                      isDark ? "text-zinc-400" : "text-slate-500"
                    )}
                  >
                    Estimated Cost
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-cyan-400 font-mono tracking-tight">
                    {formatRupiah(currentCost)}/month
                  </span>
                </div>
                <div
                  className={cn(
                    "text-[11px]",
                    isDark ? "text-zinc-500" : "text-slate-400"
                  )}
                >
                  Billed hourly · ~{formatRupiah(currentHourlyRate)}/hr (PAYG)
                </div>
              </div>

              {/* Balance check & Commitment Breakdown (Exact match of Managed App) */}
              <div
                className={cn(
                  "pt-3 border-t space-y-2",
                  isDark ? "border-white/[0.08]" : "border-slate-100"
                )}
              >
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span
                      className={isDark ? "text-zinc-400" : "text-slate-600"}
                    >
                      Account Balance:
                    </span>
                    <span
                      className={cn(
                        "font-bold font-mono",
                        !isBalanceInsufficient
                          ? isDark
                            ? "text-emerald-400"
                            : "text-emerald-600"
                          : isDark
                          ? "text-red-400"
                          : "text-red-600"
                      )}
                    >
                      {loadingBalance ? "..." : formatRupiah(userBalance)}
                    </span>
                  </div>

                  {activeCommitment > 0 && (
                    <div
                      className={cn(
                        "flex items-center justify-between text-[11px]",
                        isDark ? "text-zinc-400" : "text-slate-600"
                      )}
                    >
                      <span>Active Services Commitment:</span>
                      <span
                        className={cn(
                          "font-mono font-medium",
                          isDark ? "text-zinc-300" : "text-slate-700"
                        )}
                      >
                        {formatRupiah(activeCommitment)}/mo
                      </span>
                    </div>
                  )}

                  <div
                    className={cn(
                      "flex items-center justify-between text-[11px]",
                      isDark ? "text-zinc-400" : "text-slate-600"
                    )}
                  >
                    <span>New App Estimate:</span>
                    <span
                      className={cn(
                        "font-mono font-medium",
                        isDark ? "text-zinc-300" : "text-slate-700"
                      )}
                    >
                      {formatRupiah(currentCost)}/mo
                    </span>
                  </div>

                  <div
                    className={cn(
                      "flex items-center justify-between text-xs pt-1.5 border-t font-semibold",
                      isDark ? "border-white/[0.06]" : "border-slate-200"
                    )}
                  >
                    <span
                      className={isDark ? "text-zinc-300" : "text-slate-700"}
                    >
                      Total Required Balance:
                    </span>
                    <span
                      className={cn(
                        "font-mono font-bold",
                        !isBalanceInsufficient
                          ? isDark
                            ? "text-cyan-400"
                            : "text-cyan-600"
                          : isDark
                          ? "text-red-400"
                          : "text-red-600"
                      )}
                    >
                      {formatRupiah(totalRequiredBalance)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Insufficient Balance Alert */}
              {isBalanceInsufficient && (
                <div
                  className={cn(
                    "p-3.5 rounded-xl border text-xs space-y-2 transition-colors",
                    isDark
                      ? "bg-red-500/15 border-red-500/35 text-red-200"
                      : "bg-red-50 border-red-300 text-red-950 shadow-xs"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle
                      className={cn(
                        "w-4 h-4 shrink-0 mt-0.5",
                        isDark ? "text-red-400" : "text-red-600"
                      )}
                    />
                    <div>
                      <p
                        className={cn(
                          "font-bold tracking-tight text-xs",
                          isDark ? "text-red-300" : "text-red-900"
                        )}
                      >
                        Insufficient Account Balance
                      </p>
                      <p
                        className={cn(
                          "text-[11px] mt-0.5 leading-relaxed",
                          isDark ? "text-red-200/90" : "text-red-800"
                        )}
                      >
                        Orders require sufficient balance to cover the accumulated
                        monthly commitment of your active services plus this app.
                      </p>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "pl-6.5 pt-2 flex items-center justify-between border-t",
                      isDark ? "border-red-500/25" : "border-red-200"
                    )}
                  >
                    <span
                      className={cn(
                        "text-[11px] font-semibold",
                        isDark ? "text-red-200" : "text-red-900"
                      )}
                    >
                      Shortfall:{" "}
                      <strong
                        className={cn(
                          isDark
                            ? "text-red-300 font-extrabold"
                            : "text-red-700 font-extrabold"
                        )}
                      >
                        {formatRupiah(shortfall)}
                      </strong>
                    </span>
                    <Link
                      href="/dashboard/topup"
                      className={cn(
                        "font-bold underline transition-colors text-xs inline-flex items-center gap-1",
                        isDark
                          ? "text-red-300 hover:text-white"
                          : "text-red-700 hover:text-red-950"
                      )}
                    >
                      Top Up Balance →
                    </Link>
                  </div>
                </div>
              )}

              {/* Service Disabled Alert */}
              {isServiceDisabled && (
                <div
                  className={cn(
                    "rounded-xl p-3.5 border text-xs space-y-1.5",
                    isDark
                      ? "bg-rose-500/10 border-rose-500/20 text-rose-300"
                      : "bg-rose-50 border-rose-200 text-rose-800"
                  )}
                >
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>Service Temporarily Disabled</span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    New App Platform deployments are currently disabled by administrator.
                  </p>
                </div>
              )}

              {/* Cluster Full / Capacity Alert */}
              {(isClusterFull || isPlanExceedsCapacity) && !isServiceDisabled && (
                <div
                  className={cn(
                    "rounded-xl p-3.5 border text-xs space-y-1.5",
                    isDark
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                      : "bg-amber-50 border-amber-200 text-amber-800"
                  )}
                >
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>
                      {isClusterFull
                        ? "Cluster at Full Capacity"
                        : "Plan Exceeds Server Capacity"}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    {clusterCapacity?.userMessage ||
                      "Server resources (8 Core CPU / 16 GB RAM / 100 GB SSD) are fully allocated. Please choose a smaller flavor or wait until resources are freed."}
                  </p>
                </div>
              )}

              {/* Deploy Button (Matching Gambar 2 / Managed App Rocket Style) */}
              <button
                type="submit"
                disabled={
                  loading ||
                  isBalanceInsufficient ||
                  isClusterFull ||
                  isPlanExceedsCapacity ||
                  isServiceDisabled
                }
                className={cn(
                  "w-full py-3.5 px-5 rounded-xl font-bold text-sm text-slate-950 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]",
                  "bg-cyan-400 hover:bg-cyan-300 shadow-cyan-400/25"
                )}
              >
                <Rocket
                  className={cn("w-4 h-4", loading && "animate-spin")}
                />
                <span>
                  {loading
                    ? "Deploying App..."
                    : isServiceDisabled
                    ? "Service Disabled"
                    : isClusterFull
                    ? "Cluster at Full Capacity"
                    : isPlanExceedsCapacity
                    ? "Selected Plan Exceeds Capacity"
                    : "Deploy App"}
                </span>
              </button>

              <div className="space-y-2 pt-2 text-[11px] text-[var(--text-muted)] leading-relaxed">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Web Dashboard with Automated Let&apos;s Encrypt SSL</span>
                </div>
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Automated Git CI/CD Build &amp; Rolling Deploy</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
