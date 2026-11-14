"use client";

import { useState, useRef, useEffect, useCallback, useId } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Database,
  Cloud, 
  Zap, 
  ShieldCheck, 
  Shield, 
  Terminal, 
  ArrowRight, 
  Cpu, 
  Box, 
  Globe, 
  CheckCircle2, 
  MapPin, 
  HardDrive, 
  Activity, 
  TrendingUp, 
  Network, 
  Server, 
  ChevronLeft, 
  ChevronRight, 
  Info,
  Layers,
  Lock,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Check,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HeroAvatarFrame } from "@/components/ui/HeroAvatarFrame";
import { FadeIn } from "@/components/animations/FadeIn";
import { AnimatedBeam, OrbitalRings } from "@/components/animations/DeploymentAnimations";
import { ProvisioningSection } from "@/components/ui/ProvisioningSection";
import { FaqSection } from "@/components/ui/FaqSection";
import { EnterpriseInfraSection } from "@/components/infra/EnterpriseInfraSection";
import { AntiDdosWorkflowSection } from "@/components/infra/AntiDdosWorkflowSection";
import { cn } from "@/lib/utils";

const DB_TERMINAL_LOGS = [
  { time: "00:01", module: "CLUSTER", message: "Verifying Kubernetes node capacity and cluster quotas..." },
  { time: "00:02", module: "STORAGE", message: "Provisioning persistent volume claim (PVC) on SATA SSD..." },
  { time: "00:03", module: "SECRETS", message: "Generating cryptographic passwords and isolation secrets..." },
  { time: "00:04", module: "POD", message: "Scheduling database container pod with resource limits..." },
  { time: "00:05", module: "NETWORK", message: "Binding dedicated TCP NodePort and routing ingress..." },
  { time: "00:06", module: "WEB-GUI", message: "Mounting web management panel with automated SSL certificate..." },
  { time: "00:07", module: "READY", message: "Database instance healthy. Ready for queries.", isCommand: true },
];

const DB_TERMINAL_STATS = [
  { value: "Included", label: "WEB GUI (SSL)" },
  { value: "Dedicated", label: "NODEPORT TCP" },
  { value: "1-Click", label: "EXPORT & IMPORT" },
  { value: "SATA SSD", label: "PERSISTENT PVC" },
];

const DEDICATED_FLAVORS = [
  { id: "flavor-1vcpu-1gb", vcpu: "1 vCPU", ram: "1 GB", price: 30000, hourlyPrice: 42, planName: "Dedicated 1 vCPU / 1 GB" },
  { id: "flavor-1vcpu-2gb", vcpu: "1 vCPU", ram: "2 GB", price: 45000, hourlyPrice: 62, planName: "Dedicated 1 vCPU / 2 GB" },
  { id: "flavor-2vcpu-2gb", vcpu: "2 vCPU", ram: "2 GB", price: 55000, hourlyPrice: 76, planName: "Dedicated 2 vCPU / 2 GB" },
  { id: "flavor-2vcpu-4gb", vcpu: "2 vCPU", ram: "4 GB", price: 150000, hourlyPrice: 208, planName: "Dedicated 2 vCPU / 4 GB" },
  { id: "flavor-2vcpu-8gb", vcpu: "2 vCPU", ram: "8 GB", price: 250000, hourlyPrice: 347, planName: "Dedicated 2 vCPU / 8 GB" },
  { id: "flavor-4vcpu-8gb", vcpu: "4 vCPU", ram: "8 GB", price: 400000, hourlyPrice: 555, planName: "Dedicated 4 vCPU / 8 GB" },
];

const SHARED_ENGINE_VERSIONS: Record<string, Array<{ id: string; name: string; ratePerGb: number; badge?: string }>> = {
  POSTGRESQL: [
    { id: "18", name: "18 (Latest)", ratePerGb: 10000 },
    { id: "17", name: "17 LTS", ratePerGb: 10000 },
    { id: "16", name: "16 LTS", ratePerGb: 10000 },
    { id: "15", name: "15 LTS", ratePerGb: 10000 },
    { id: "postgres-postgis", name: "16 + PostGIS", ratePerGb: 12500, badge: "GIS" },
    { id: "postgres-vector", name: "16 + pgvector", ratePerGb: 12500, badge: "AI" },
    { id: "postgres-full", name: "16 + PostGIS + pgvector", ratePerGb: 15000, badge: "Full" },
  ],
  MYSQL: [
    { id: "8.0", name: "8.0 LTS", ratePerGb: 10000 },
    { id: "8.4", name: "8.4 LTS", ratePerGb: 10000 },
  ],
  MARIADB: [
    { id: "10.11", name: "10.11 LTS", ratePerGb: 10000 },
    { id: "11.4", name: "11.4 LTS", ratePerGb: 10000 },
  ],
  MONGODB: [
    { id: "7.0", name: "7.0 (Current)", ratePerGb: 10000 },
    { id: "6.0", name: "6.0 LTS", ratePerGb: 10000 },
  ],
  REDIS: [
    { id: "7.2", name: "7.2 LTS", ratePerGb: 10000 },
    { id: "7.0", name: "7.0 LTS", ratePerGb: 10000 },
  ],
};

const SUPPORTED_ENGINES = [
  { 
    name: "PostgreSQL", 
    type: "POSTGRESQL",
    desc: "Advanced open-source relational database with native JSONB, strong indexing, and full ACID compliance.",
    webTool: "pgAdmin 4",
    icon: "/images/apps/postgresql.svg",
    color: "from-blue-600/20 to-sky-600/20",
    border: "border-sky-500/30",
    text: "text-sky-400",
    defaultVersion: "16",
    versions: [
      { id: "18", name: "18 (Latest)" },
      { id: "17", name: "17 LTS" },
      { id: "16", name: "16 LTS" },
      { id: "15", name: "15 LTS" },
    ],
  },
  { 
    name: "MySQL", 
    type: "MYSQL",
    desc: "The world's most popular open-source relational database, optimized for high read throughput and web scale.",
    webTool: "phpMyAdmin",
    icon: "/images/apps/mysql.svg",
    color: "from-cyan-600/20 to-teal-600/20",
    border: "border-cyan-500/30",
    text: "text-cyan-400",
    defaultVersion: "8.0",
    versions: [
      { id: "8.0", name: "8.0 LTS" },
      { id: "8.4", name: "8.4 LTS" },
    ],
  },
  { 
    name: "MariaDB", 
    type: "MARIADB",
    desc: "Robust, drop-in replacement for MySQL with enhanced query optimizations, Galera replication, and LTS stability.",
    webTool: "phpMyAdmin",
    icon: "/images/apps/mariadb.svg",
    color: "from-amber-600/20 to-orange-600/20",
    border: "border-amber-500/30",
    text: "text-amber-400",
    defaultVersion: "10.11",
    versions: [
      { id: "10.11", name: "10.11 LTS" },
      { id: "11.4", name: "11.4 LTS" },
    ],
  },
  { 
    name: "MongoDB", 
    type: "MONGODB",
    desc: "Leading document-oriented NoSQL database engineered for agile schema iterations and high-volume collections.",
    webTool: "Mongo Express",
    icon: "/images/apps/mongodb.svg",
    color: "from-emerald-600/20 to-teal-600/20",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    defaultVersion: "7.0",
    versions: [
      { id: "7.0", name: "7.0 (Current)" },
      { id: "6.0", name: "6.0 LTS" },
    ],
  },
  { 
    name: "Redis", 
    type: "REDIS",
    desc: "Ultra-fast in-memory key-value data structure store used as a database, cache, message broker, and queue.",
    webTool: "Redis Commander",
    icon: "/images/apps/redis.svg",
    color: "from-red-600/20 to-rose-600/20",
    border: "border-red-500/30",
    text: "text-red-400",
    defaultVersion: "7.2",
    versions: [
      { id: "7.2", name: "7.2 LTS" },
      { id: "7.0", name: "7.0 LTS" },
    ],
  },
];

const REPEATED_ENGINES = [
  ...SUPPORTED_ENGINES,
  ...SUPPORTED_ENGINES,
  ...SUPPORTED_ENGINES,
  ...SUPPORTED_ENGINES,
  ...SUPPORTED_ENGINES,
  ...SUPPORTED_ENGINES,
];

const DB_FAQS = [
  {
    q: "How does Masdika Managed Database work?",
    a: "Every managed database runs inside an isolated container Pod orchestrated by Kubernetes on enterprise Dell PowerEdge nodes. Storage is bound via Persistent Volume Claims (PVC) on enterprise SSDs, ensuring zero data loss across Pod restarts or node maintenance."
  },
  {
    q: "Which database engines are supported?",
    a: "We natively support PostgreSQL 16, MySQL 8.0, MariaDB 10.11, and MongoDB 7.0. Each database instance comes with its own web-based management GUI: pgAdmin 4 for PostgreSQL, phpMyAdmin for MySQL and MariaDB, and Mongo Express for MongoDB."
  },
  {
    q: "Can I connect using desktop database clients like DBeaver, TablePlus, or Navicat?",
    a: "Yes! Every database instance is assigned a unique public TCP NodePort (e.g., db.masdika.id:30500). You can connect from your local development machine, remote servers, or CI/CD pipelines using any standard database client or ORM."
  },
  {
    q: "What is the difference between Shared and Dedicated tiers?",
    a: "Shared Database gives you cost-effective burstable resources (0.5 vCPU and 1 GB RAM) starting at just Rp 10.000/month, perfect for personal projects, testing, and small websites. Dedicated Database reserves dedicated CPU cores and 2 GB+ RAM exclusively for your Pod with maximum IOPS, engineered for production workloads."
  },
  {
    q: "How does hourly Pay-As-You-Go billing work?",
    a: "You top up your deposit balance and are charged strictly for each active hour your database is deployed. If you stop or terminate an instance, billing ceases immediately. There are no lock-in contracts or termination fees."
  },
  {
    q: "How does database export and import work?",
    a: "You can download full database dump files (.sql for relational engines, .rdb for Redis, and dump archives for MongoDB) directly from the instance dashboard with 1-click. You can also upload and import SQL or dump scripts on-demand, or use the included web GUIs (phpMyAdmin, pgAdmin, Mongo Express, Redis Commander)."
  }
];

interface ManagedDbClientProps {
  safePricing: {
    sharedMonthlyPerGb: number;
    sharedHourlyPerGb: number;
    dedicatedMonthlyBase: number;
    dedicatedHourlyBase: number;
    dedicatedStoragePerGbMonthly: number;
    dedicatedStoragePerGbHourly: number;
  };
  isDatabaseEnabled: boolean;
}

export default function ManagedDbClient({ safePricing, isDatabaseEnabled }: ManagedDbClientProps) {
  // Engine carousel state & drag logic
  const engineScrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const isPausedRef = useRef(false);
  const dragLastXRef = useRef(0);
  const lastTouchXRef = useRef(0);

  // Interactive Configurator State
  const [selectedEngine, setSelectedEngine] = useState<string>("POSTGRESQL");
  const [selectedVersion, setSelectedVersion] = useState<string>("16");
  const [selectedTier, setSelectedTier] = useState<"SHARED" | "DEDICATED">("SHARED");
  const [selectedFlavorId, setSelectedFlavorId] = useState<string>("flavor-1vcpu-1gb");
  const [storageGb, setStorageGb] = useState<number>(1);
  const storageSliderId = useId();

  const isShared = selectedTier === "SHARED";
  const activeEngineObj = SUPPORTED_ENGINES.find(e => e.type === selectedEngine) || SUPPORTED_ENGINES[0];

  const availableVersions = isShared
    ? (SHARED_ENGINE_VERSIONS[selectedEngine] || activeEngineObj.versions || [])
    : (activeEngineObj.versions || []);

  const activeSharedVersion = availableVersions.find(v => v.id === selectedVersion);
  const effectiveSharedRate = (activeSharedVersion as any)?.ratePerGb || safePricing.sharedMonthlyPerGb;

  const handleSelectEngine = (engineType: string) => {
    setSelectedEngine(engineType);
    const eng = SUPPORTED_ENGINES.find(e => e.type === engineType);
    if (eng && eng.versions && eng.versions.length > 0) {
      const vers = isShared ? (SHARED_ENGINE_VERSIONS[engineType] || eng.versions) : eng.versions;
      setSelectedVersion(vers[0]?.id || eng.defaultVersion || "16");
    }
  };

  const handleTierChange = (tier: "SHARED" | "DEDICATED") => {
    setSelectedTier(tier);
    if (tier === "DEDICATED") {
      const dedicatedVers = activeEngineObj.versions || [];
      if (!dedicatedVers.some(v => v.id === selectedVersion)) {
        setSelectedVersion(activeEngineObj.defaultVersion || dedicatedVers[0]?.id || "16");
      }
    }
  };

  const selectedFlavor = DEDICATED_FLAVORS.find(f => f.id === selectedFlavorId) || DEDICATED_FLAVORS[0];

  // Price Calculation exactly matching dashboard checkout:
  // Shared: storageGb * ratePerGb (Rp 10.000/GB base, or custom edition rate)
  // Dedicated: flavor.price + (storageGb * 5.000)
  const monthlyPrice = isShared 
    ? storageGb * effectiveSharedRate
    : selectedFlavor.price + (storageGb * safePricing.dedicatedStoragePerGbMonthly);
  
  const hourlyRate = Math.max(1, Math.ceil(monthlyPrice / 720));

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Helper to measure exact width of 1 complete engine set
  const getItemSetWidth = useCallback((container: HTMLDivElement) => {
    const children = container.children;
    const n = SUPPORTED_ENGINES.length;
    if (children.length >= n * 2) {
      const el0 = children[0] as HTMLElement;
      const elN = children[n] as HTMLElement;
      const diff = elN.offsetLeft - el0.offsetLeft;
      if (diff > 0) return diff;
    }
    return container.scrollWidth / 6;
  }, []);

  // Seamless wrap-around logic ensuring infinite continuous flow
  const wrapScroll = useCallback((container: HTMLDivElement) => {
    const setWidth = getItemSetWidth(container);
    if (!setWidth || setWidth <= 10) return;

    const minScroll = setWidth * 1.5;
    const maxScroll = setWidth * 3.5;

    while (container.scrollLeft >= maxScroll) {
      container.scrollLeft -= setWidth;
    }
    while (container.scrollLeft < minScroll) {
      container.scrollLeft += setWidth;
    }
  }, [getItemSetWidth]);

  // Initial scroll positioning into the middle sets
  useEffect(() => {
    const container = engineScrollRef.current;
    if (!container) return;

    const initPos = () => {
      const setWidth = getItemSetWidth(container);
      if (setWidth > 0 && (container.scrollLeft === 0 || container.scrollLeft < setWidth)) {
        container.scrollLeft = setWidth * 2;
      }
    };

    initPos();
    const timer = setTimeout(initPos, 150);
    return () => clearTimeout(timer);
  }, [getItemSetWidth]);

  // Infinite continuous auto-scroll loop (60fps)
  useEffect(() => {
    const container = engineScrollRef.current;
    if (!container) return;

    let animationId: number;
    let accumulated = 0;
    const speed = 0.75;
    let isVisible = true;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]) {
        isVisible = entries[0].isIntersecting;
      }
    });
    observer.observe(container);

    const step = () => {
      if (!isPausedRef.current && !isDraggingRef.current && isVisible) {
        accumulated += speed;
        if (accumulated >= 1) {
          const px = Math.floor(accumulated);
          container.scrollLeft += px;
          accumulated -= px;
          wrapScroll(container);
        }
      }
      animationId = requestAnimationFrame(step);
    };

    animationId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationId);
      observer.disconnect();
    };
  }, [wrapScroll]);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!engineScrollRef.current) return;
    setIsDragging(true);
    isDraggingRef.current = true;
    isPausedRef.current = true;
    dragLastXRef.current = e.pageX;
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const container = engineScrollRef.current;
      if (!container || !isDraggingRef.current) return;
      e.preventDefault();
      const deltaX = e.pageX - dragLastXRef.current;
      dragLastXRef.current = e.pageX;
      container.scrollLeft -= deltaX;
      wrapScroll(container);
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      isDraggingRef.current = false;
      isPausedRef.current = false;
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    window.addEventListener("blur", handleGlobalMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("blur", handleGlobalMouseUp);
    };
  }, [isDragging, wrapScroll]);

  const handleTouchStart = (e: React.TouchEvent) => {
    isPausedRef.current = true;
    if (e.touches[0]) {
      lastTouchXRef.current = e.touches[0].pageX;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const container = engineScrollRef.current;
    if (!container || !e.touches[0]) return;
    const currentX = e.touches[0].pageX;
    const deltaX = currentX - lastTouchXRef.current;
    lastTouchXRef.current = currentX;
    container.scrollLeft -= deltaX;
    wrapScroll(container);
  };

  const handleTouchEnd = () => {
    isPausedRef.current = false;
  };

  const handleManualSlide = (direction: "left" | "right") => {
    const container = engineScrollRef.current;
    if (!container) return;
    const delta = direction === "left" ? -280 : 280;
    container.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col min-h-screen pt-24 md:pt-32 pb-10 sm:pb-14 overflow-x-hidden">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1">

        {/* ── 0. HERO (Identical to VPS & Home Page Pattern) ──────────────────── */}
        <section className="relative pt-6 sm:pt-10 pb-8 sm:pb-12 flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full">
            
            {/* Left – Text & Actions */}
            <div className="max-w-2xl relative z-30">
              <div className="mb-8">
                <Badge variant="brand" dot dotColor="bg-emerald-400" size="md" className="font-mono uppercase whitespace-nowrap">
                  ENTERPRISE KUBERNETES CLUSTER
                </Badge>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] mb-4 text-[var(--text-primary)]">
                Managed Database &amp; <br />
                <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-100 bg-clip-text text-transparent">
                  High-Availability Storage.
                </span>
              </h1>

              <p className="text-lg md:text-xl mb-10 max-w-xl leading-relaxed text-[var(--text-secondary)] font-normal">
                Deploy production-grade PostgreSQL, MySQL, MariaDB, Redis, and MongoDB clusters in seconds. Powered by Kubernetes container isolation, persistent SATA SSD storage, instant data export &amp; import, browser web GUIs, and under 20ms local latency across Indonesia.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href="#pricing"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Configure &amp; Deploy
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href="#engines"
                  leftIcon={<Database className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                >
                  Explore Engines
                </Button>
              </div>
            </div>

            {/* Right – Hero Avatar (managed-db.webp) with 4 Floating Badges */}
            <div className="relative flex items-center justify-center mt-6 lg:mt-0">
              <HeroAvatarFrame
                imageSrc="/images/mascots/managed-db.webp"
                imageAlt="Masdika – Managed Database & Kubernetes Storage"
                imageWidth={1536}
                imageHeight={1024}
                badges={[
                  { icon: Database, label: "Database Engines", value: "Postgres, MySQL, Redis, Mongo" },
                  { icon: HardDrive, label: "Storage Engine", value: "SATA SSD Persistent PVC" },
                  { icon: Zap, label: "NodePort Access", value: "Direct Public TCP Port" },
                  { icon: ShieldCheck, label: "Architecture", value: "Isolated Kubernetes Pods" },
                ]}
              />
            </div>

          </div>
        </section>

        {/* ── 1. VALUE PILLARS (4 Trust Highlights) ─────────────────────── */}
        <section className="py-10 sm:py-14 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {[
              { icon: Box, title: "Kubernetes Pod Isolation", desc: "Every database runs inside dedicated container pods with strict CPU and memory resource quotas." },
              { icon: Globe, title: "Browser Web GUIs", desc: "Built-in phpMyAdmin, pgAdmin 4, and Mongo Express with automatic SSL & secure authentication." },
              { icon: HardDrive, title: "Persistent SATA SSD PVC", desc: "Enterprise SSD block storage mounted via Kubernetes PVC guarantees zero data loss on restart." },
              { icon: Activity, title: "Local Sidoarjo DC", desc: "Under 20ms ultra-low ping across Indonesia with direct IIX, OpenIX, and CDIX peering." },
            ].map((pillar, i) => (
              <FadeIn key={i} delay={i * 0.1} direction="up" className="h-full">
                <div className="p-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] flex items-start gap-4 h-full shadow-sm hover:border-cyan-500/40 transition-colors">
                  <div className="w-11 h-11 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                    <pillar.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
                      {pillar.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      {pillar.desc}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── 2. SUPPORTED DATABASE ENGINES CAROUSEL ────────────────────── */}
        <section id="engines" className="scroll-mt-24 py-10 sm:py-14 relative z-10">
          <div className="text-center mb-6 sm:mb-8">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              SUPPORTED ENGINES
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] leading-[1.15] mb-3">
              One-Click Production Database Stacks
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)]">
              Select your favorite SQL or NoSQL database engine, pre-configured with web viewers and public TCP endpoints.
            </p>
          </div>

          <div className="relative overflow-hidden w-full border border-[var(--border-primary)] bg-[var(--surface)] rounded-2xl p-6 shadow-md group">
            {/* Left Arrow Button */}
            <button
              type="button"
              onClick={() => handleManualSlide("left")}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-cyan-500 transition-all duration-200 shadow-md hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-105"
              aria-label="Previous Engine"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Scroll Track */}
            <div className="w-full [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
              <div
                ref={engineScrollRef}
                onMouseDown={handleMouseDown}
                onMouseEnter={() => { isPausedRef.current = true; }}
                onMouseLeave={() => {
                  if (!isDraggingRef.current) isPausedRef.current = false;
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onScroll={() => {
                  if (engineScrollRef.current) wrapScroll(engineScrollRef.current);
                }}
                className={cn(
                  "flex items-center gap-12 sm:gap-16 overflow-x-auto select-none py-2 w-full",
                  "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
                  isDragging ? "cursor-grabbing" : "cursor-grab"
                )}
              >
                {REPEATED_ENGINES.map((eng, idx) => (
                  <div
                    key={`engine-${idx}`}
                    className="flex items-center gap-3 shrink-0 transition-transform duration-200 select-none hover:scale-105 cursor-pointer"
                    onClick={() => {
                      setSelectedEngine(eng.type);
                      const el = document.getElementById("pricing");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    <img
                      referrerPolicy="no-referrer"
                      src={eng.icon}
                      alt={eng.name}
                      className="h-8 w-8 sm:h-9 sm:w-9 object-contain pointer-events-none select-none"
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                    <div className="flex flex-col">
                      <span className="font-bold text-base sm:text-lg tracking-tight text-[var(--text-primary)] select-none pointer-events-none">
                        {eng.name}
                      </span>
                      <span className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">
                        {eng.webTool}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Arrow Button */}
            <button
              type="button"
              onClick={() => handleManualSlide("right")}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-cyan-500 transition-all duration-200 shadow-md hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-105"
              aria-label="Next Engine"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* ── 3. HARDWARE & K8S ARCHITECTURE SHOWCASE ───────────────────── */}
        <section id="features" className="scroll-mt-24 py-10 sm:py-14 relative z-10">
          <div className="relative rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-8 sm:p-12 shadow-xl overflow-hidden">
            <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-gradient-to-tr from-cyan-500/15 via-cyan-400/10 to-transparent dark:from-cyan-500/20 dark:via-cyan-400/10 dark:to-transparent rounded-full blur-3xl pointer-events-none -z-0" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              <div className="lg:col-span-7">
                <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
                  KUBERNETES CLUSTER ARCHITECTURE
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
                  Built on Cloud-Native Kubernetes
                </h2>
                <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed mb-8 max-w-xl">
                  Unlike traditional shared web hosting, each Masdika database instance runs in an isolated StatefulSet Pod with dedicated memory buffers, persistent block volumes, and automated self-healing.
                </p>

                <div className="space-y-3.5">
                  {[
                    "Isolated Kubernetes StatefulSet Pod with Dedicated Resource Limits",
                    "Persistent SATA SSD Block Storage mounted via StorageClass PVC",
                    "Direct Public TCP NodePort (e.g. 30500 - 30600) for Remote GUI & App Access",
                    "Automated Let's Encrypt TLS/SSL Ingress for Web Management Panels",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                      <div className="w-6 h-6 rounded-md bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-medium text-[var(--text-primary)]">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cluster Stats Grid */}
              <div className="lg:col-span-5 grid grid-cols-2 gap-4">
                <div className="p-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-center flex flex-col items-center justify-center">
                  <span className="text-4xl sm:text-5xl font-black text-cyan-600 dark:text-cyan-400 mb-1">
                    &lt;1s
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Failover Detection
                  </span>
                </div>

                <div className="p-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-center flex flex-col items-center justify-center">
                  <span className="text-4xl sm:text-5xl font-black text-cyan-600 dark:text-cyan-400 mb-1">
                    100%
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Data Persistence
                  </span>
                </div>

                <div className="p-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-center flex flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-2">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                    SATA SSD PVC
                  </span>
                </div>

                <div className="p-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-center flex flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-2">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                    Sidoarjo DC
                  </span>
                </div>

                <div className="col-span-2 p-5 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] flex items-center gap-4">
                  <div className="w-11 h-11 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[var(--text-primary)]">
                      99.9% Database Availability
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">
                      Orchestrated auto-restart and zero-touch node health reconciliation
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3.5. SUPPORT INFRA & CARRIER-GRADE NETWORK (K3s Mode) ─────── */}
        <EnterpriseInfraSection mode="k3s" />

        {/* ── 3.6. ANTI-DDOS WORKFLOW (K3s Mode) ────────────────────────── */}
        <AntiDdosWorkflowSection mode="k3s" />

        {/* ── 4. INTERACTIVE PRICING & SPEC CONFIGURATOR ────────────────── */}
        <section id="pricing" className="scroll-mt-24 py-10 sm:py-14 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-4 block">
              FLEXIBLE DATABASE PRICING
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Pay-As-You-Go Database Configurator
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed mb-6">
              Select your engine, tier, and storage volume. Billed transparently per active hour with zero setup fees or long-term commitments.
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border-primary)] bg-[var(--surface)] text-xs text-[var(--text-secondary)] shadow-sm">
              <Info className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span>
                <strong>Zero Maintenance:</strong> Web GUI, SSL certificates, instant export/import tools, and TCP NodePorts are completely included in every plan.
              </span>
            </div>
          </div>

          {/* Configurator Box - Full Space Container */}
          <div className="relative rounded-2xl sm:rounded-3xl border border-[var(--border-primary)] bg-[var(--surface)] p-4 sm:p-8 md:p-12 shadow-xl overflow-hidden w-full">
            
            {/* Step 1: Select Database Engine */}
            <div className="mb-8 sm:mb-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-4">
                <label className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] shrink-0">1</span>
                  <span>Select Database Engine</span>
                </label>
                <span className="text-xs text-[var(--text-muted)] font-medium pl-7 sm:pl-0">
                  Web viewer included with automated SSL
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
                {SUPPORTED_ENGINES.map((eng, idx) => {
                  const isSelected = selectedEngine === eng.type;
                  const isLast = idx === SUPPORTED_ENGINES.length - 1;
                  return (
                    <button
                      key={eng.type}
                      type="button"
                      onClick={() => handleSelectEngine(eng.type)}
                      className={cn(
                        "rounded-xl border text-left transition-all relative group cursor-pointer",
                        isLast
                          ? "col-span-2 sm:col-span-2 lg:col-span-1 p-3.5 sm:p-4 flex flex-row lg:flex-col items-center lg:items-start justify-between min-h-[72px] lg:min-h-[120px]"
                          : "col-span-1 p-3.5 sm:p-4 flex flex-col justify-between min-h-[100px] sm:min-h-[120px]",
                        isSelected
                          ? "border-cyan-500 bg-cyan-500/10 shadow-sm ring-1 ring-cyan-500/30"
                          : "border-[var(--border-primary)] bg-[var(--surface-secondary)] hover:border-cyan-500/40"
                      )}
                    >
                      {/* Full-width Row Layout for Last Item (Redis) when spanning 2 columns (< lg) */}
                      {isLast ? (
                        <>
                          {/* Row view (< lg): Horizontal wide card taking full row width */}
                          <div className="flex lg:hidden items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                              <img src={eng.icon} alt={eng.name} className="w-8 h-8 object-contain shrink-0" />
                              <div>
                                <div className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                                  {eng.name}
                                </div>
                                <div className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold mt-0.5">
                                  {eng.webTool}
                                </div>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shrink-0">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            )}
                          </div>

                          {/* Desktop view (>= lg): Standard vertical card */}
                          <div className="hidden lg:flex items-center justify-between mb-3 w-full">
                            <img src={eng.icon} alt={eng.name} className="w-8 h-8 object-contain" />
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            )}
                          </div>
                          <div className="hidden lg:block">
                            <div className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                              {eng.name}
                            </div>
                            <div className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold mt-0.5">
                              {eng.webTool}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-3 w-full">
                            <img src={eng.icon} alt={eng.name} className="w-8 h-8 object-contain" />
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                              {eng.name}
                            </div>
                            <div className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold mt-0.5">
                              {eng.webTool}
                            </div>
                          </div>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Version Selector for Selected Engine */}
              {availableVersions && availableVersions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[var(--border-primary)] flex flex-wrap items-center gap-3">
                  <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider shrink-0">
                    Engine Version:
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {availableVersions.map((ver: any) => {
                      const isVerSelected = selectedVersion === ver.id;
                      return (
                        <button
                          key={ver.id}
                          type="button"
                          onClick={() => setSelectedVersion(ver.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5",
                            isVerSelected
                              ? "bg-cyan-400 text-slate-950 border-cyan-400 shadow-sm"
                              : "border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-cyan-500/40"
                          )}
                        >
                          <span>{ver.name}</span>
                          {isShared && ver.ratePerGb && ver.ratePerGb > 10000 && (
                            <span className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded font-mono font-bold",
                              isVerSelected
                                ? "bg-slate-950/20 text-slate-950"
                                : "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                            )}>
                              {formatCurrency(ver.ratePerGb)}/GB
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Select Architecture Tier */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-4">
                <label className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] shrink-0">2</span>
                  <span>Select Architecture Tier</span>
                </label>
                <span className="text-xs text-[var(--text-muted)] font-medium pl-7 sm:pl-0">
                  {isShared ? "Cost-Effective Burstable" : "Guaranteed Production Compute"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Shared Tier */}
                <button
                  type="button"
                  onClick={() => handleTierChange("SHARED")}
                  className={cn(
                    "p-4 sm:p-5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer",
                    isShared
                      ? "border-cyan-500 bg-cyan-500/10 shadow-sm ring-1 ring-cyan-500/30"
                      : "border-[var(--border-primary)] bg-[var(--surface-secondary)] hover:border-cyan-500/40"
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap sm:flex-nowrap">
                      <span className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                        Shared Database
                      </span>
                      <span className="text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 whitespace-nowrap shrink-0">
                        From Rp 10.000/mo
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mb-4 leading-relaxed">
                      Burstable resources on a shared multi-tenant cluster. Best for staging, personal blogs, hobby apps, and low-write traffic.
                    </p>
                    <div className="space-y-1.5 text-xs text-[var(--text-muted)]">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>0.5 vCPU (Burstable Compute)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Box className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>1 GB RAM Allocation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>Scalable SSD Storage (1 - 20 GB)</span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Dedicated Tier */}
                <button
                  type="button"
                  onClick={() => handleTierChange("DEDICATED")}
                  className={cn(
                    "p-4 sm:p-5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer",
                    !isShared
                      ? "border-cyan-500 bg-cyan-500/10 shadow-sm ring-1 ring-cyan-500/30"
                      : "border-[var(--border-primary)] bg-[var(--surface-secondary)] hover:border-cyan-500/40"
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap sm:flex-nowrap">
                      <span className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                        Dedicated Cluster
                      </span>
                      <span className="text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 whitespace-nowrap shrink-0">
                        From Rp 35.000/mo
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mb-4 leading-relaxed">
                      Dedicated StatefulSet Pod with exclusive CPU and RAM allocation. Engineered for production APIs, SaaS, and e-commerce.
                    </p>
                    <div className="space-y-1.5 text-xs text-[var(--text-muted)]">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>1.0 - 4.0 Dedicated vCPU</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Box className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>1 GB - 8 GB Dedicated RAM</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>SATA SSD Storage (1 - 20 GB)</span>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Step 2b: Architecture Flavor / Package Specification */}
            {isShared ? (
              <div className="mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] shrink-0">2b</span>
                    <span>Shared Database Package Specification</span>
                  </label>
                  <span className="text-xs text-[var(--text-muted)] font-medium pl-7 sm:pl-0">
                    Burstable multi-tenant container on Kubernetes
                  </span>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl border border-cyan-500/30 bg-cyan-500/[0.04] relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-[var(--border-primary)]">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-bold text-[var(--text-primary)]">
                          Shared Multi-Tenant Package
                        </span>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                          Burstable Tier
                        </span>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                          Active &amp; Ready
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                        Isolated container Pod running on Dell PowerEdge hardware with Linux cgroup limits and persistent SATA SSD block storage.
                      </p>
                    </div>
                    <div className="sm:text-right shrink-0">
                      <div className="text-xl sm:text-2xl font-black text-cyan-600 dark:text-cyan-400">
                        {formatCurrency(effectiveSharedRate)}
                        <span className="text-xs font-normal text-[var(--text-muted)]">/GB/mo</span>
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] font-mono">
                        ~{formatCurrency(Math.max(1, Math.ceil(effectiveSharedRate / 720)))}/GB/hr (PAYG)
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] flex flex-col justify-between">
                      <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Compute</span>
                      <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)] mt-1.5 flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> 0.5 vCPU Pool
                      </span>
                    </div>
                    <div className="p-3 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] flex flex-col justify-between">
                      <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Memory</span>
                      <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)] mt-1.5 flex items-center gap-1.5">
                        <Box className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> 1 GB RAM
                      </span>
                    </div>
                    <div className="p-3 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] flex flex-col justify-between">
                      <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Storage Engine</span>
                      <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)] mt-1.5 flex items-center gap-1.5">
                        <HardDrive className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> SATA SSD PVC
                      </span>
                    </div>
                    <div className="p-3 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] flex flex-col justify-between">
                      <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Web Management</span>
                      <span className="text-xs sm:text-sm font-bold text-cyan-600 dark:text-cyan-400 mt-1.5 flex items-center gap-1.5 truncate">
                        <Globe className="w-3.5 h-3.5 shrink-0" /> {activeEngineObj.webTool}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] shrink-0">2b</span>
                    <span>Select Dedicated Flavor</span>
                  </label>
                  <span className="text-xs text-[var(--text-muted)] font-medium pl-7 sm:pl-0">
                    Reserved CPU &amp; RAM allocation
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {DEDICATED_FLAVORS.map((flavor) => {
                    const isFlavorSelected = selectedFlavorId === flavor.id;
                    return (
                      <button
                        key={flavor.id}
                        type="button"
                        onClick={() => setSelectedFlavorId(flavor.id)}
                        className={cn(
                          "p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer",
                          isFlavorSelected
                            ? "border-cyan-500 bg-cyan-500/10 shadow-sm ring-1 ring-cyan-500/30"
                            : "border-[var(--border-primary)] bg-[var(--surface-secondary)] hover:border-cyan-500/40"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-[var(--text-primary)]">
                            {flavor.vcpu} / {flavor.ram}
                          </span>
                          <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
                            {formatCurrency(flavor.price)}/mo
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                          <span>Dedicated Pod</span>
                          <span>~{formatCurrency(flavor.hourlyPrice)}/hr</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Storage Slider */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-3 mb-3">
                <label htmlFor={storageSliderId} className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-2 cursor-pointer">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] shrink-0">3</span>
                  <span>Persistent SSD Storage</span>
                </label>
                <div className="flex items-baseline sm:items-center gap-2 pl-7 sm:pl-0">
                  <span className="text-xl sm:text-2xl font-black text-cyan-600 dark:text-cyan-400">
                    {storageGb} GB
                  </span>
                  <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                    SATA SSD PVC ({isShared ? `${formatCurrency(effectiveSharedRate)}/GB` : "Rp 5.000/GB"})
                  </span>
                </div>
              </div>

              <input
                id={storageSliderId}
                type="range"
                min={1}
                max={20}
                step={1}
                value={storageGb}
                onChange={(e) => setStorageGb(parseInt(e.target.value, 10))}
                className="w-full h-2.5 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
              />

              <div className="flex justify-between items-center text-[11px] text-[var(--text-muted)] font-mono mt-2">
                <span>1 GB</span>
                <span>10 GB</span>
                <span>20 GB (Max)</span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2 flex-wrap mt-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mr-1">
                  Presets:
                </span>
                {[1, 2, 5, 10, 15, 20].map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => setStorageGb(preset)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border",
                      storageGb === preset
                        ? "bg-cyan-400 text-slate-950 border-cyan-400 shadow-xs"
                        : "border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-cyan-500/40"
                    )}
                  >
                    {preset} GB
                  </button>
                ))}
              </div>
            </div>

            {/* Price Calculation Card */}
            <div className="p-4 sm:p-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs uppercase tracking-wider font-bold text-[var(--text-muted)]">
                    ESTIMATED RATE
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400">
                    PAYG HOURLY
                  </span>
                </div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-3xl sm:text-4xl font-black text-[var(--text-primary)]">
                    {formatCurrency(monthlyPrice)}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] font-medium">
                    /month (~{formatCurrency(hourlyRate)}/hr)
                  </span>
                </div>
                {isShared ? (
                  <p className="text-xs text-[var(--text-secondary)] mt-1.5">
                    Includes {activeEngineObj.name} {(availableVersions.find((v: any) => v.id === selectedVersion) as any)?.name || selectedVersion}, 0.5 vCPU / 1GB RAM, {storageGb} GB SATA SSD &amp; {activeEngineObj.webTool}.
                  </p>
                ) : (
                  <div className="text-xs text-[var(--text-secondary)] mt-1.5">
                    <p>
                      Includes {activeEngineObj.name} {activeEngineObj.versions?.find(v => v.id === selectedVersion)?.name || selectedVersion}, {selectedFlavor.vcpu} / {selectedFlavor.ram}, {storageGb} GB SATA SSD &amp; {activeEngineObj.webTool}.
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5 font-medium">
                      Flavor: {formatCurrency(selectedFlavor.price)} + Storage ({storageGb} GB × Rp 5.000): {formatCurrency(storageGb * 5000)}
                    </p>
                  </div>
                )}
              </div>

              <div className="w-full md:w-auto">
                <Button
                  variant="primary"
                  size="lg"
                  href={`/dashboard/database/new?engine=${selectedEngine}&tier=${selectedTier}&version=${selectedVersion}&flavor=${selectedFlavorId}&storage=${storageGb}`}
                  className="w-full md:w-auto justify-center font-bold px-7 sm:px-8 py-3.5 sm:py-4 text-sm sm:text-base rounded-xl shadow-lg shadow-cyan-400/10 hover:shadow-cyan-400/25 active:scale-[0.98] transition-all cursor-pointer"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Deploy {activeEngineObj.name} {selectedVersion}
                </Button>
              </div>
            </div>

            {/* 4 Feature Badges Under Configurator */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
              {[
                { icon: ShieldCheck, title: "Kubernetes Pod Isolation", desc: "Noisy neighbor protection with Linux cgroup enforcement." },
                { icon: Globe, title: "Web GUI Included", desc: "Zero configuration single sign-on web management." },
                { icon: Zap, title: "Public NodePort", desc: "Direct TCP connectivity for external dev tools and CI/CD." },
                { icon: Download, title: "Instant Export / Import", desc: "On-demand dump downloads and one-click data import." },
              ].map((feat, i) => (
                <div key={i} className="p-4 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] flex items-start gap-3">
                  <feat.icon className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-primary)] mb-0.5">{feat.title}</h4>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ── 5. USE CASES SECTION ──────────────────────────────────────── */}
        <section className="py-10 sm:py-14 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              PRODUCTION WORKLOADS
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Engineered for Modern Applications
            </h2>
            <p className="text-base text-[var(--text-secondary)]">
              From microservices to high-traffic database clusters, Masdika Managed Database delivers rock-solid stability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              { 
                icon: Globe, 
                title: "Next.js, Laravel & Node.js Backends", 
                desc: "Connect your web and API servers seamlessly with standard connection strings and under 20ms local latency across Indonesia." 
              },
              { 
                icon: Database, 
                title: "E-Commerce & High-Read Stacks", 
                desc: "PostgreSQL and MySQL instances tuned with optimized memory buffers to handle spikes during flash sales and product launches." 
              },
              { 
                icon: Layers, 
                title: "Microservices & Analytics", 
                desc: "MongoDB document stores with flexible JSON schemas, ideal for logging, IoT telemetry, real-time analytics, and mobile apps." 
              }
            ].map((srv, idx) => (
              <FadeIn key={idx} delay={idx * 0.1} direction="up" className="h-full">
                <div className="p-8 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 transition-all duration-200 h-full flex flex-col justify-between group shadow-sm">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-6 group-hover:scale-105 transition-transform">
                      <srv.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                      {srv.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      {srv.desc}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── 6. COMPREHENSIVE FEATURES GRID ────────────────────────────── */}
        <section className="py-10 sm:py-14 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              ENTERPRISE CAPABILITIES
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Everything Your Data Layer Requires
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: HardDrive, title: "Persistent SATA SSD PVC", desc: "Enterprise SATA SSD block storage mounted via Kubernetes ensures zero loss on restart." },
              { icon: Globe, title: "Web Management GUIs", desc: "Instant access to pgAdmin 4, phpMyAdmin, Mongo Express, and Redis Commander with SSL." },
              { icon: Zap, title: "Public TCP NodePorts", desc: "Connect desktop IDEs like DBeaver, TablePlus, or Navicat effortlessly." },
              { icon: Download, title: "Instant Export & Import", desc: "Download full database dump files (.sql, .rdb, archive) and restore data on-demand." },
              { icon: TrendingUp, title: "Dynamic Scaling", desc: "Expand your persistent storage anytime without recreating your database." },
              { icon: RefreshCw, title: "Graceful Restarts", desc: "Perform rolling Pod restarts safely without dropping active transactions." },
              { icon: Lock, title: "Let's Encrypt SSL", desc: "Automated HTTPS certificates provisioned for all web viewer interfaces." },
              { icon: Activity, title: "Real-Time Telemetry", desc: "Monitor live CPU usage, memory consumption, and disk capacity in dashboard." }
            ].map((feat, i) => (
              <FadeIn key={i} delay={i * 0.05} direction="up" className="h-full">
                <div className="p-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 transition-colors flex flex-col justify-between h-full shadow-sm">
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-4">
                      <feat.icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">
                      {feat.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── 7. HOW IT WORKS SECTION ───────────────────────────────────── */}
        <section className="py-10 sm:py-14 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              PROVISIONING WORKFLOW
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Deploy Your Database in 3 Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative items-stretch">
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-[2px] bg-slate-200 dark:bg-white/10 overflow-hidden rounded-full">
              <AnimatedBeam />
            </div>

            {[
              { step: "01", title: "Select Engine & Tier", desc: "Choose PostgreSQL, MySQL, MariaDB, or MongoDB and select your desired SSD storage." },
              { step: "02", title: "Top Up Balance", desc: "Fund your account via QRIS or automated gateway. Only pay for exact active hours." },
              { step: "03", title: "Connect & Build", desc: "Receive immediate credentials, public host/port, and launch your web GUI instantly." }
            ].map((st, i) => (
              <FadeIn key={i} delay={i * 0.15} direction="up" className="h-full">
                <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-8 text-center shadow-sm hover:border-cyan-500/40 transition-all duration-300 h-full flex flex-col justify-between relative z-10 group">
                  <div>
                    <div className="w-20 h-20 mx-auto rounded-full bg-[var(--surface-secondary)] border border-[var(--border-primary)] flex items-center justify-center mb-6 relative group-hover:scale-110 transition-transform duration-300">
                      <OrbitalRings />
                      <span className="relative z-10 text-3xl font-black bg-gradient-to-br from-cyan-600 to-cyan-400 bg-clip-text text-transparent">
                        {st.step}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">
                      {st.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      {st.desc}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── 8. PROVISIONING SECTION (Live K3s Terminal) ───────────────── */}
        <ProvisioningSection
          subtitle="AUTOMATED CLUSTER PROVISIONING"
          title="Instant, native Kubernetes deployment."
          description="Our control panel manages Kubernetes Pod scheduling, persistent volume claim binding, secret encryption, and public TCP routing automatically. Your database is query-ready in seconds."
          buttonText="Open Database Panel"
          buttonHref="/dashboard/database"
          logs={DB_TERMINAL_LOGS}
          stats={DB_TERMINAL_STATS}
          terminalTitle="PROVISIONING MANAGED DATABASE (KUBERNETES)"
          iconType="k3s"
          targetServer="Dell PowerEdge R630 • Sidoarjo DC (Kubernetes Cluster)"
          provisionEstimate="Backend: Native Kubernetes (~15 Seconds)"
        />

        {/* ── 9. FINAL CTA SECTION ──────────────────────────────────────── */}
        <section className="py-10 sm:py-14 relative z-10 w-full">
          <div className="relative rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-10 md:p-16 text-center shadow-xl overflow-hidden w-full">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-gradient-to-tr from-cyan-500/15 via-cyan-400/10 to-transparent dark:from-cyan-500/20 dark:via-cyan-400/10 dark:to-transparent rounded-full blur-3xl pointer-events-none -z-0" />

            <div className="relative z-10 max-w-2xl mx-auto">
              <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
                START STORING DATA TODAY
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-tight mb-4">
                Ready for True Managed Cloud Databases?
              </h2>
              <p className="text-base sm:text-lg text-[var(--text-secondary)] mb-8 leading-relaxed">
                Deploy production-ready databases on Masdika Kubernetes infrastructure today. Enjoy isolated Pods, persistent SATA SSD storage, and 1-click web GUIs.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href="/dashboard/database"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Deploy Your Database
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href="/contact"
                >
                  Contact Support
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ── 10. FAQ SECTION ───────────────────────────────────────────── */}
        <FaqSection faqs={DB_FAQS} />

      </div>
    </div>
  );
}

