"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useTheme } from "@/components/ThemeProvider";
import {
  ArrowLeft, Check, ChevronRight, ChevronLeft, ShieldCheck,
  Building2, Wallet, Store, QrCode, HardDrive,
  Database, Code2, Link as LinkIcon, Cloud,
  UploadCloud, Server, FileVideo, Music, PlaySquare,
  FileText, Cpu, ServerCog, Activity, Ticket, X, ArrowUpCircle, ShoppingCart, Loader2, BadgeCheck, CheckCircle, RefreshCw, Terminal
} from "lucide-react";
import { SiKubernetes } from "react-icons/si";
import Link from "next/link";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/billing";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import VpsCheckoutFlow from "@/components/VpsCheckoutFlow";
import { EnterpriseInfraBanner, EnterpriseInfraSidebarCard } from "@/components/EnterpriseInfraBadges";

function Pager({
  page,
  pageSize,
  total,
  onChange,
  isDark,
  label = "items",
}: {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  isDark: boolean;
  label?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const navBtn = cn(
    "w-9 h-9 rounded-lg border flex items-center justify-center transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer",
    isDark
      ? "bg-[#060b14] border-slate-800 text-zinc-400 hover:text-white hover:border-slate-700"
      : "bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300"
  );

  return (
    <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-5 border-t relative z-10 transition-colors", isDark ? "border-slate-800" : "border-slate-100")}>
      <div className={cn("text-xs font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>
        Showing <span className={cn("font-bold", isDark ? "text-zinc-300" : "text-slate-700")}>{from}–{to}</span> of{" "}
        <span className={cn("font-bold", isDark ? "text-zinc-300" : "text-slate-700")}>{total}</span> {label}
      </div>
      <div className="flex items-center gap-1.5">
        <button type="button" aria-label="Previous page" onClick={() => onChange(page - 1)} disabled={page === 1} className={navBtn}>
          <ChevronLeft className="w-4 h-4" />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
          const active = p === page;
          return (
            <button
              type="button"
              key={p}
              onClick={() => onChange(p)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "min-w-9 h-9 px-3 rounded-lg border text-sm font-bold transition-all duration-200 active:scale-95 cursor-pointer",
                active
                  ? "bg-cyan-600 border-cyan-600 text-white shadow-sm"
                  : isDark
                    ? "bg-[#060b14] border-slate-800 text-zinc-400 hover:text-white hover:border-slate-700 hover:bg-white/5"
                    : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              {p}
            </button>
          );
        })}
        <button type="button" aria-label="Next page" onClick={() => onChange(page + 1)} disabled={page === totalPages} className={navBtn}>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface ServiceDef {
  id: string;
  name: string;
  category: string;
  icon: any;
  desc: string;
  badge?: string;
  tags?: string[];
}

const CATEGORIES = [
  { id: "COMPUTE", name: "Compute & VPS", icon: Server },
  { id: "STORAGE_CDN", name: "File CDN", icon: UploadCloud },
  { id: "DEVELOPER_API", name: "Developer APIs", icon: Code2 },
  { id: "URL_SHORTENER", name: "URL Shortener", icon: LinkIcon }
];

const SERVICES: ServiceDef[] = [
  {
    id: "VPS",
    name: "Cloud VPS",
    category: "COMPUTE",
    icon: Terminal,
    desc: "High-performance virtual private servers with high-speed SSD storage & 1 Gbps uplink.",
    badge: "Popular",
    tags: ["1 Gbps Uplink", "Anti-DDoS BGP", "SSD Storage", "Sidoarjo DC"]
  },
  {
    id: "KUBERNETES",
    name: "Managed Kubernetes (KaaS)",
    category: "COMPUTE",
    icon: SiKubernetes,
    desc: "Lightweight, production-ready K3s cluster with automated HA control plane.",
    badge: "Enterprise",
    tags: ["K3s Engine", "Traefik Ingress", "High Availability", "Cluster Auto-heal"]
  },
  {
    id: "CDN",
    name: "File CDN",
    category: "STORAGE_CDN",
    icon: UploadCloud,
    desc: "High-speed global content delivery network with edge media optimization.",
    badge: "Edge Speed",
    tags: ["Global Edge", "High Throughput", "Image Optimizer", "98.99% SLA"]
  },
  {
    id: "SHORTENER",
    name: "URL Shortener",
    category: "URL_SHORTENER",
    icon: LinkIcon,
    desc: "Enterprise custom branded links with real-time analytics and QR codes.",
    badge: "Analytics",
    tags: ["Custom Domains", "Click Analytics", "QR Generator", "Fast Redirects"]
  },
  {
    id: "TIKTOK",
    name: "TikTok API",
    category: "DEVELOPER_API",
    icon: FileVideo,
    desc: "Video data & HD downloader without watermark at high throughput.",
    badge: "API v2",
    tags: ["HD No-Watermark", "Metadata Extract", "Batch Ready"]
  },
  {
    id: "SPOTIFY",
    name: "Spotify API",
    category: "DEVELOPER_API",
    icon: Music,
    desc: "High-fidelity track metadata search, album covers, and audio downloader.",
    badge: "Audio API",
    tags: ["Track Search", "Album Metadata", "High Bitrate"]
  },
  {
    id: "YOUTUBE",
    name: "YouTube API",
    category: "DEVELOPER_API",
    icon: PlaySquare,
    desc: "Ultra-fast YouTube video metadata scraper, subtitle and stream extractor.",
    badge: "Media Stream",
    tags: ["Up to 4K Stream", "Audio Extractor", "Subtitle Track"]
  },
  {
    id: "BLOG",
    name: "Blog API",
    category: "DEVELOPER_API",
    icon: FileText,
    desc: "Modern headless CMS backend API with markdown parsing and instant caching.",
    badge: "Headless CMS",
    tags: ["REST & GraphQL", "Markdown Format", "Low-Latency Cache"]
  },
  {
    id: "BMKG_WEATHER",
    name: "BMKG Weather API",
    category: "DEVELOPER_API",
    icon: Cloud,
    desc: "Real-time Indonesian meteorological weather forecasts and satellite telemetry.",
    badge: "Real-time",
    tags: ["All Provinces", "3-Day Forecast", "BMKG Telemetry"]
  },
  {
    id: "BMKG_EARTHQUAKE",
    name: "BMKG Earthquake API",
    category: "DEVELOPER_API",
    icon: Activity,
    desc: "Instant seismic event notifications, tsunami warnings, and shakemap telemetry.",
    badge: "Live Alert",
    tags: ["Seismic Alerts", "Shakemap Image", "M 5.0+ Early Warning"]
  },
];

function CheckoutContent() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const searchParams = useSearchParams();
  const upgradeId = searchParams.get("upgrade_id") || searchParams.get("upgradeId");
  const action = searchParams.get("action");
  const urlService = searchParams.get("service")?.toUpperCase();

  const [plans, setPlans] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [activeSubscriptions, setActiveSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const defaultService = urlService || "VPS";
  const defaultCategory = SERVICES.find(s => s.id === defaultService)?.category || "COMPUTE";

  const [selectedCategory, setSelectedCategory] = useState<string>(defaultCategory);
  const [servicePage, setServicePage] = useState<number>(1);
  const [selectedService, setSelectedService] = useState<string>(defaultService);
  const [tierPage, setTierPage] = useState<number>(1);
  const [pmPages, setPmPages] = useState<Record<string, number>>({});
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>("BALANCE");
  const [isProcessing, setIsProcessing] = useState(false);

  // Dynamic Discounts & Vouchers removed since it is handled on Top Up
  const [isTermsAccepted, setIsTermsAccepted] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/public/plans").then(res => res.json()).catch(() => ({ success: false, data: [] })),
      fetch("/api/public/payment-methods").then(res => res.json()).catch(() => ({ success: false, data: [] })),
      fetch("/api/user/billing").then(res => res.json()).catch(() => ({ success: false, data: { balance: 0, subscriptions: [] } })),
      fetch("/api/public/discounts").then(res => res.json()).catch(() => ({ success: false, data: {} }))
    ]).then(([plansRes, pmRes, billingRes, discRes]) => {
      if (plansRes.success) setPlans(plansRes.data);

      const pms = pmRes.success ? pmRes.data : [];
      if (billingRes.success) {
        if (billingRes.data.balance > 0) {
          setBalance(billingRes.data.balance);
          pms.unshift({
            code: 'BALANCE',
            name: 'Account Balance',
            type: 'WALLET',
            fee: 0,
            isActive: true
          });
        }
        if (billingRes.data.subscriptions) {
          const subs = billingRes.data.subscriptions;
          setActiveSubscriptions(subs.filter((s: any) => s.status === 'ACTIVE'));

          if (upgradeId) {
            const subToUpgrade = subs.find((s: any) => s.id === parseInt(upgradeId));
            if (subToUpgrade && subToUpgrade.plan?.service) {
              setSelectedCategory(SERVICES.find(s => s.id === subToUpgrade.plan.service)?.category || "STORAGE_CDN");
              setSelectedService(subToUpgrade.plan.service);
            }
          }
        }
      }
      setPaymentMethods(pms);

      const defaultServicePlans = plansRes.data.filter((p: any) => p.service === "CDN" && p.price > 0);
      if (defaultServicePlans.length > 0) {
        setSelectedPlanId(defaultServicePlans[0].id);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [upgradeId]);

  useEffect(() => {
    const catServices = SERVICES.filter(s => s.category === selectedCategory);
    if (catServices.length > 0 && !catServices.find(s => s.id === selectedService)) {
      setSelectedService(catServices[0].id);
    }
  }, [selectedCategory, selectedService]);

  const cycles = [
    { id: "HOURLY", name: "Pay As You Go (Hourly)", multiplier: 1 }
  ];

  const currentServicePlans = useMemo(() => plans.filter(p => p.service === selectedService), [plans, selectedService]);
  const selectedPlan = useMemo(() => plans.find(p => p.id === selectedPlanId), [plans, selectedPlanId]);
  const selectedCycleData = cycles[0];
  const selectedPmData = paymentMethods.find(pm => pm.code === selectedPaymentMethod);

  useEffect(() => {
    if (currentServicePlans.length > 0) {
      let available = currentServicePlans.filter(p => p.price > 0);

      if (upgradeId) {
        const subToUpgrade = activeSubscriptions.find(s => s.id === parseInt(upgradeId));
        if (subToUpgrade && subToUpgrade.plan?.price) {
          available = available.filter(p => p.price > subToUpgrade.plan.price);
        }
      }

      if (available.length > 0 && (!selectedPlanId || !available.find(p => p.id === selectedPlanId))) {
        setSelectedPlanId(available[0].id);
      } else if (available.length === 0) {
        setSelectedPlanId(null);
      }
    }
  }, [currentServicePlans, activeSubscriptions, upgradeId, selectedPlanId]);

  const handleCheckout = async () => {
    if (!selectedPlanId) {
      toast.error("Please select a plan");
      return;
    }

    if (selectedPaymentMethod !== "BALANCE") {
      toast.error("Pay as You Go requires Account Balance as payment method");
      return;
    }

    if (!isTermsAccepted) {
      toast.error("Please agree to the Terms of Service and Privacy Policy");
      return;
    }

    setIsProcessing(true);
    const toastId = toast.loading("Processing secure transaction...");

    // Force React to paint the loading state before the heavy network request blocks it
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const res = await fetch("/api/user/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlanId,
          paymentMethodCode: selectedPaymentMethod,
          upgradeSubscriptionId: upgradeId ? parseInt(upgradeId) : undefined
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.paymentUrl) {
          toast.success("Transaction created! Redirecting...", { id: toastId });
          window.location.href = data.paymentUrl;
        } else {
          toast.success("Service Activated Successfully!", { id: toastId });
          router.push("/dashboard/billing");
        }
      } else {
        toast.error(data.error || "Checkout failed", { id: toastId });
        setIsProcessing(false);
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during checkout", { id: toastId });
      setIsProcessing(false);
    }
  };

  const finalSubtotal = selectedPlan ? (selectedPlan.hourlyPrice || 0) : 0;

  // Calculate Prorated Credit for Upgrades
  let creditAmount = 0;
  if (upgradeId) {
    const subToUpgrade = activeSubscriptions.find(s => s.id === parseInt(upgradeId));
    if (subToUpgrade && subToUpgrade.status === 'ACTIVE') {
      const now = new Date();
      const expires = new Date(subToUpgrade.expiresAt);
      if (expires > now) {
        const remainingDays = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const dailyValue = subToUpgrade.plan.price / 30;
        creditAmount = Math.floor(remainingDays * dailyValue);
      }
    }
  }

  const finalSubtotalAfterCredit = Math.max(0, finalSubtotal - creditAmount);
  const fee = selectedPmData ? selectedPmData.fee : 0;
  const total = finalSubtotalAfterCredit + fee;

  const getPlanFeatures = (plan: any) => {
    if (!plan.limits) return [];
    let limits: any = {};
    try {
      limits = typeof plan.limits === 'string' ? JSON.parse(plan.limits) : plan.limits;
    } catch (e) {
      limits = {};
    }
    const specs: string[] = [];

    if (plan.service === 'CDN') {
      if (limits.storageGB) specs.push(`${limits.storageGB} GB Storage`);
      if (limits.transferGB) specs.push(`${limits.transferGB} GB Bandwidth / mo`);
      if (limits.requests && limits.requests !== 'unlimited') specs.push(`${limits.requests.toString().toUpperCase()} API Requests`);
      if (limits.requests === 'unlimited') specs.push(`Unlimited API Requests`);
    } else if (plan.service === 'SHORTENER') {
      if (limits.requests && limits.requests !== 'unlimited') specs.push(`${limits.requests.toString().toUpperCase()} Custom Short Links`);
      if (limits.requests === 'unlimited') specs.push(`Unlimited Custom Links`);
      specs.push('Advanced Analytics');
    } else {
      if (limits.requests && limits.requests !== 'unlimited') specs.push(`${limits.requests.toString().toUpperCase()} API Requests`);
      if (limits.requests === 'unlimited') specs.push(`Unlimited API Requests`);
      specs.push('Real-time Webhooks');
    }

    if (plan.price > 0) {
      specs.push("Priority 24/7 Support");
    } else {
      specs.push("Community Support");
    }

    return specs;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center">
        <RefreshCw className="w-10 h-10 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div className="space-y-6 md:space-y-8 pb-20 w-full max-w-full min-w-0" variants={containerVariants} initial="hidden" animate="visible">

      <motion.div variants={itemVariants} className="flex items-center">
        <Link
          href="/dashboard/billing"
          className={cn(
            "inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-all border shadow-sm",
            isDark 
              ? "text-zinc-400 hover:text-white bg-[#0b1322] hover:bg-[#111c33] border-slate-800 hover:border-cyan-500/40" 
              : "text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border-slate-200"
          )}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Billing
        </Link>
      </motion.div>

      {/* Hero Header */}
      <motion.div variants={itemVariants} className={cn("relative overflow-hidden rounded-3xl border p-4 sm:p-6 md:p-8 group shadow-md w-full max-w-full min-w-0", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200 shadow-sm")}>
        <div className="relative z-10 shrink-0">
          <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 tracking-wide border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-500/10 border-cyan-500/20 text-cyan-800")}>
            <ShoppingCart className="w-3 h-3" /> Secure Checkout
          </div>
          <h1 className={cn("text-3xl md:text-4xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Order <span className={cn(isDark ? "text-cyan-400" : "text-cyan-600")}>Service</span>
          </h1>
          <p className={cn("text-sm max-w-md", isDark ? "text-zinc-400" : "text-slate-500")}>Select your desired premium tier and finalize your order.</p>
        </div>
      </motion.div>

      {/* Enterprise Infrastructure Trust Showcase (Intel, Juniper, MikroTik) */}
      <motion.div variants={itemVariants} className="w-full max-w-full min-w-0">
        <EnterpriseInfraBanner />
      </motion.div>

      <div className="space-y-6 md:space-y-8 w-full max-w-full min-w-0">
        {/* Step 1: Select Service (Full-width modern selector) */}
        {action !== "add_node" && (
          <motion.div
            variants={itemVariants}
            className={cn(
              "rounded-3xl p-5 sm:p-7 md:p-8 border shadow-sm relative z-[60] overflow-hidden",
              isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200"
            )}
          >
            {/* Step Header */}
            <div
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b relative z-10"
              style={{ borderColor: isDark ? "rgba(30, 41, 59, 0.7)" : "rgba(226, 232, 240, 0.8)" }}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center font-black text-sm border border-cyan-500/30 shrink-0 shadow-sm">
                  1
                </div>
                <div>
                  <h2 className={cn("text-lg sm:text-xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                    Select Service & Architecture
                  </h2>
                  <p className={cn("text-xs mt-0.5", isDark ? "text-slate-400" : "text-slate-500")}>
                    Choose an infrastructure category and pick the service you want to deploy.
                  </p>
                </div>
              </div>

              {/* Active Selection Badge */}
              {(() => {
                const activeSrv = SERVICES.find(s => s.id === selectedService);
                if (!activeSrv) return null;
                const ActiveIcon = activeSrv.icon;
                return (
                  <div
                    className={cn(
                      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold self-start sm:self-auto border transition-all",
                      isDark ? "bg-[#060b14] border-cyan-500/40 text-cyan-400" : "bg-cyan-50 border-cyan-500/30 text-cyan-800"
                    )}
                  >
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <ActiveIcon className="w-3.5 h-3.5" />
                    <span>Selected: <strong className="font-bold">{activeSrv.name}</strong></span>
                  </div>
                );
              })()}
            </div>

            {/* Category Segmented Tabs */}
            <div className="mb-6 relative z-10">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                1. Category
              </div>
              <div
                className={cn(
                  "p-1.5 rounded-2xl border grid grid-cols-2 lg:grid-cols-4 gap-1.5",
                  isDark ? "bg-[#060b14]/80 border-slate-800/80" : "bg-slate-100/80 border-slate-200"
                )}
              >
                {CATEGORIES.map(cat => {
                  const CatIcon = cat.icon;
                  const active = selectedCategory === cat.id;
                  const count = SERVICES.filter(s => s.category === cat.id).length;
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      id={`checkout-category-${cat.id.toLowerCase()}`}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setServicePage(1);
                        const firstSrv = SERVICES.find(s => s.category === cat.id);
                        if (firstSrv) {
                          setSelectedService(firstSrv.id);
                          setTierPage(1);
                        }
                      }}
                      className={cn(
                        "w-full flex items-center justify-between gap-2 px-3 py-2.5 sm:px-3.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all relative cursor-pointer",
                        active
                          ? isDark
                            ? "bg-[#0b162c] text-cyan-400 shadow-md border border-cyan-500/40"
                            : "bg-white text-cyan-900 shadow-sm border border-cyan-600/30"
                          : isDark
                            ? "text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 border border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CatIcon className={cn("w-4 h-4 shrink-0 transition-colors", active ? "text-cyan-400" : isDark ? "text-slate-400" : "text-slate-500")} />
                        <span className="truncate">{cat.name}</span>
                      </div>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-md font-bold shrink-0",
                          active
                            ? isDark ? "bg-cyan-500/20 text-cyan-300" : "bg-cyan-100 text-cyan-800"
                            : isDark ? "bg-slate-800/80 text-slate-400" : "bg-slate-200 text-slate-600"
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Available Services Section */}
            {(() => {
              const currentCat = CATEGORIES.find(c => c.id === selectedCategory);
              const categoryServices = SERVICES.filter(s => s.category === selectedCategory);
              return (
                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-2.5 mb-3.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      2. Available Services — <span className={isDark ? "text-cyan-400" : "text-cyan-600"}>{currentCat?.name}</span>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                        isDark ? "bg-[#060b14] text-slate-400 border-slate-800" : "bg-slate-100 text-slate-600 border-slate-200"
                      )}
                    >
                      {categoryServices.length} {categoryServices.length === 1 ? "Option" : "Options"}
                    </span>
                  </div>

                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={selectedCategory}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.16, ease: "easeOut" }}
                      className={cn(
                        "grid gap-3.5 sm:gap-4",
                        categoryServices.length <= 2
                          ? "grid-cols-1 md:grid-cols-2"
                          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                      )}
                    >
                      {categoryServices.map(srv => {
                        const Icon = srv.icon;
                        const isSelected = selectedService === srv.id;
                        return (
                          <button
                            type="button"
                            key={srv.id}
                            id={`checkout-service-${srv.id.toLowerCase()}`}
                            onClick={() => {
                              setSelectedService(srv.id);
                              setTierPage(1);
                            }}
                            className={cn(
                              "group relative text-left p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between cursor-pointer",
                              isSelected
                                ? isDark
                                  ? "bg-[#0e1a30] border-cyan-500 text-white shadow-lg ring-1 ring-cyan-500/40 -translate-y-0.5"
                                  : "bg-white border-cyan-600 text-slate-900 shadow-md ring-2 ring-cyan-600/20 -translate-y-0.5"
                                : isDark
                                  ? "bg-[#060b14]/70 border-slate-800/90 hover:border-slate-700 hover:bg-[#070e1c] text-slate-300 hover:text-white"
                                  : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 text-slate-700 hover:text-slate-900 shadow-sm"
                            )}
                          >
                            <div>
                              {/* Card Header: Icon + Badge + Check */}
                              <div className="flex items-center justify-between gap-3 mb-3.5">
                                <div
                                  className={cn(
                                    "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors border shadow-sm",
                                    isSelected
                                      ? isDark ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40" : "bg-cyan-100 text-cyan-700 border-cyan-300"
                                      : isDark ? "bg-slate-800/80 border-slate-700 text-slate-400 group-hover:text-cyan-400 group-hover:border-slate-600" : "bg-slate-100 border-slate-200 text-slate-500 group-hover:text-slate-900"
                                  )}
                                >
                                  <Icon className="w-5 h-5" />
                                </div>

                                <div className="flex items-center gap-2">
                                  {srv.badge && (
                                    <span
                                      className={cn(
                                        "text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider",
                                        isSelected
                                          ? isDark ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" : "bg-cyan-100 text-cyan-800 border-cyan-300"
                                          : isDark ? "bg-slate-800/80 text-slate-400 border-slate-700" : "bg-slate-100 text-slate-600 border-slate-200"
                                      )}
                                    >
                                      {srv.badge}
                                    </span>
                                  )}
                                  <div
                                    className={cn(
                                      "w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-200 shrink-0",
                                      isSelected
                                        ? "bg-cyan-500 border-cyan-500 text-white shadow-sm scale-105"
                                        : isDark ? "border-slate-700 bg-slate-900/60" : "border-slate-300 bg-slate-50"
                                    )}
                                  >
                                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                  </div>
                                </div>
                              </div>

                              {/* Title & Description */}
                              <h3
                                className={cn(
                                  "text-sm sm:text-base font-bold leading-snug tracking-tight mb-1 transition-colors",
                                  isSelected ? (isDark ? "text-cyan-400" : "text-cyan-900") : (isDark ? "text-white" : "text-slate-900")
                                )}
                              >
                                {srv.name}
                              </h3>
                              <p
                                className={cn(
                                  "text-xs font-normal leading-relaxed line-clamp-2",
                                  isSelected ? (isDark ? "text-slate-300" : "text-slate-600") : (isDark ? "text-slate-400" : "text-slate-500")
                                )}
                              >
                                {srv.desc}
                              </p>
                            </div>

                            {/* Feature Tags */}
                            {srv.tags && srv.tags.length > 0 && (
                              <div
                                className={cn(
                                  "flex flex-wrap gap-1.5 mt-3.5 pt-3 border-t transition-colors",
                                  isDark ? "border-slate-800/80" : "border-slate-100"
                                )}
                              >
                                {srv.tags.map(tag => (
                                  <span
                                    key={tag}
                                    className={cn(
                                      "text-[10px] font-medium px-2 py-0.5 rounded-md border",
                                      isSelected
                                        ? isDark ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30" : "bg-cyan-50 text-cyan-800 border-cyan-200"
                                        : isDark ? "bg-slate-900/80 text-slate-400 border-slate-800" : "bg-slate-100 text-slate-600 border-slate-200"
                                    )}
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </motion.div>
                  </AnimatePresence>
                </div>
              );
            })()}
          </motion.div>
        )}

        {/* Service Checkout Content */}
        {selectedService === "VPS" || selectedService === "KUBERNETES" ? (
          <div key="vps-flow" className="w-full max-w-full min-w-0 transition-all duration-200">
            <VpsCheckoutFlow serviceType={selectedService} />
          </div>
        ) : (
          <div
            key={`generic-flow-${selectedService}`}
            className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8 w-full max-w-full min-w-0 transition-all duration-200"
          >
            {/* Left Column - Generic Steps */}
            <div className="xl:col-span-2 space-y-6 md:space-y-8 w-full max-w-full min-w-0">
              {/* Step 2: Choose Plan */}
              <section className={cn("rounded-3xl p-5 sm:p-7 md:p-8 shadow-sm overflow-hidden relative border w-full max-w-full min-w-0", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200")}>
                <div className="flex items-center gap-3 mb-6 relative z-10">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center font-black text-sm border border-cyan-500/30 shrink-0 shadow-sm">2</div>
                  <div>
                    <h2 className={cn("text-lg sm:text-xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>Choose Tier</h2>
                    <p className={cn("text-xs mt-0.5", isDark ? "text-slate-400" : "text-slate-500")}>Select the plan tier for {SERVICES.find(s => s.id === selectedService)?.name || selectedService}.</p>
                  </div>
                </div>

                <div className="relative z-10 min-h-[200px]">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    {currentServicePlans.slice((tierPage - 1) * 6, tierPage * 6).map(plan => {
                      const currentSubForService = activeSubscriptions.find(s => s.plan?.service === selectedService);
                      const isDowngrade = currentSubForService && plan.price <= (currentSubForService.plan?.price ?? 0);
                      const isCustom = plan.price === 0;
                      const isDisabled = isCustom || isDowngrade;
                      const isSelected = selectedPlanId === plan.id;

                      return (
                        <div
                          key={plan.id}
                          onClick={() => !isDisabled && setSelectedPlanId(plan.id)}
                          className={cn(
                            "relative flex flex-col p-5 rounded-2xl border transition-all duration-200 shadow-sm cursor-pointer hover:-translate-y-1 active:scale-[0.99]",
                            isDisabled && "opacity-50 cursor-not-allowed bg-black/40 border-slate-800 grayscale hover:translate-y-0",
                            isSelected
                              ? isDark
                                ? "bg-[#0e1a30] border-cyan-500 text-white shadow-lg ring-1 ring-cyan-500/40"
                                : "bg-cyan-50/40 border-cyan-600 text-slate-900 shadow-md ring-2 ring-cyan-600/20"
                              : (!isDisabled && (isDark ? "bg-[#060b14]/70 border-slate-800 hover:border-slate-700 hover:bg-[#070e1c]" : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-md"))
                          )}
                        >
                          {/* Header: Name + Radio check */}
                          <div className="flex items-center justify-between gap-2 mb-4">
                            <div className="flex items-center gap-2 min-w-0">
                              <h3 className={cn("text-base font-bold truncate", isDark ? "text-white" : "text-slate-900")}>
                                {plan.name}
                              </h3>
                              {isDowngrade && (
                                <span className={cn("text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md border shrink-0", isDark ? "bg-slate-800 text-slate-400 border-slate-700" : "bg-slate-100 text-slate-600 border-slate-200")}>
                                  Current
                                </span>
                              )}
                            </div>
                            <div className={cn(
                              "w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0",
                              isSelected
                                ? "bg-cyan-500 border-cyan-500 text-white shadow-sm scale-105"
                                : isDark ? "border-slate-700 bg-slate-900/60" : "border-slate-300 bg-slate-50"
                            )}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>

                          {/* Pricing */}
                          <div className={cn("mb-4 pb-4 border-b", isDark ? "border-slate-800/80" : "border-slate-100")}>
                            <div className="flex items-baseline gap-1">
                              <span className={cn("text-2xl sm:text-3xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                                {isCustom ? "Custom" : formatRupiah(plan.hourlyPrice || 0)}
                              </span>
                              {!isCustom && (
                                <span className={cn("text-xs font-semibold", isDark ? "text-slate-400" : "text-slate-500")}>
                                  / hr
                                </span>
                              )}
                            </div>
                            {!isCustom && (plan.hourlyPrice || 0) > 0 && (
                              <div className={cn("text-xs font-medium mt-1", isDark ? "text-slate-400" : "text-slate-500")}>
                                ≈ <span className="font-semibold">{formatRupiah((plan.hourlyPrice || 0) * 24 * 30)}</span> / mo
                              </div>
                            )}
                          </div>

                          {/* Feature list */}
                          <ul className="space-y-2 text-xs flex-1">
                            {getPlanFeatures(plan).map((feature: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <div className={cn(
                                  "w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                                  isSelected
                                    ? isDark ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-slate-100 text-cyan-700 border border-slate-200"
                                    : isDark ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"
                                )}>
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                </div>
                                <span className={cn("font-medium leading-relaxed", isDark ? "text-slate-300" : "text-slate-600")}>
                                  {feature}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                    {currentServicePlans.length === 0 && (
                      <div className={cn("col-span-full py-12 text-center font-medium rounded-2xl border shadow-sm", isDark ? "text-zinc-500 bg-[#060b14] border-slate-800" : "text-slate-500 bg-white border-slate-200/90")}>
                        No active plans available for this service right now.
                      </div>
                    )}
                  </div>
                </div>

                {/* Tier Pagination Controls */}
                <Pager
                  page={tierPage}
                  pageSize={6}
                  total={currentServicePlans.length}
                  onChange={setTierPage}
                  isDark={isDark}
                  label="tiers"
                />
              </section>

              {/* Step 3: Payment Method */}
              <section className={cn("h-fit border rounded-3xl p-5 sm:p-7 md:p-8 shadow-sm overflow-hidden relative w-full max-w-full min-w-0", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200")}>
                <div className="flex items-center gap-3 mb-6 relative z-10">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center font-black text-sm border border-cyan-500/30 shrink-0 shadow-sm">3</div>
                  <div>
                    <h2 className={cn("text-lg sm:text-xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>Payment Method</h2>
                    <p className={cn("text-xs mt-0.5", isDark ? "text-slate-400" : "text-slate-500")}>All Pay-As-You-Go services are billed directly from your Account Balance.</p>
                  </div>
                </div>

                <div className="space-y-6 relative z-10">
                  <div className="flex flex-col gap-2">
                    <div className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl border transition-all text-left shadow-sm",
                      balance < total
                        ? "border-red-500/30 bg-red-500/5"
                        : isDark
                          ? "bg-[#060b14] border-slate-800"
                          : "bg-white border-slate-200"
                    )}>
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-sm", isDark ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "bg-slate-100 border-slate-200 text-cyan-700")}>
                        <Wallet className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={cn("text-base font-bold", isDark ? "text-white" : "text-slate-900")}>Account Balance</div>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <div className={cn("text-xs font-semibold", isDark ? "text-slate-400" : "text-slate-500")}>
                            Available: <strong className="font-bold text-cyan-400">{formatRupiah(balance)}</strong>
                          </div>
                        </div>
                        {balance < total && (
                          <div className="text-xs text-red-500 font-bold mt-2 bg-red-500/10 px-3 py-1.5 rounded-lg w-fit flex items-center gap-2 border border-red-500/20">
                            <X className="w-3.5 h-3.5" /> Insufficient balance. <Link href="/dashboard/topup" className="underline hover:text-red-400 ml-1">Top up now &rarr;</Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column - Order Summary */}
            <div className="xl:col-span-1 w-full max-w-full min-w-0">
              <div className={cn("sticky top-6 border rounded-3xl p-5 sm:p-7 md:p-8 shadow-sm overflow-hidden w-full max-w-full min-w-0", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200")}>
                <h2 className={cn("text-lg sm:text-xl font-bold mb-6 border-b pb-4 flex items-center gap-2 relative z-10", isDark ? "text-white border-slate-800" : "text-slate-900 border-slate-100")}>
                  <BadgeCheck className="w-5 h-5 text-cyan-400" /> Order Summary
                </h2>

                <div className="space-y-4 mb-6 relative z-10">
                  <div className={cn("flex justify-between items-center p-4 rounded-2xl border shadow-sm", isDark ? "bg-[#060b14] border-slate-800" : "bg-white border-slate-200/90")}>
                    <div className="flex flex-col gap-1 min-w-0 flex-1 pr-2">
                      <div className={cn("text-sm font-bold truncate", isDark ? "text-white" : "text-slate-900")}>
                        {selectedPlan?.name || 'No Plan Selected'}
                      </div>
                      {(selectedPlan?.hourlyPrice || 0) > 0 && (
                        <div className={cn("text-[10px] font-bold uppercase tracking-widest", isDark ? "text-slate-500" : "text-slate-500")}>
                          ≈ {formatRupiah((selectedPlan?.hourlyPrice || 0) * 24 * 30)} / MO
                        </div>
                      )}
                    </div>
                    <div className={cn("font-black shrink-0", isDark ? "text-white" : "text-slate-900")}>{formatRupiah(selectedPlan?.hourlyPrice || 0)}</div>
                  </div>

                  <div className="flex justify-between items-center text-xs px-2">
                    <div className={cn("font-bold uppercase tracking-widest", isDark ? "text-slate-500" : "text-slate-500")}>Billing Cycle</div>
                    <div className={cn("font-bold px-2 py-1 rounded-lg border", isDark ? "text-white bg-slate-800/50 border-slate-700" : "text-slate-900 bg-slate-100 border-slate-200")}>Hourly (PAYG)</div>
                  </div>

                  {creditAmount > 0 && (
                    <div className={cn("flex justify-between items-center text-xs py-3 border-y px-2", isDark ? "border-slate-800" : "border-slate-100")}>
                      <span className="text-cyan-400 font-bold flex items-center gap-2 uppercase tracking-widest">
                        <ArrowUpCircle className="w-3.5 h-3.5" />
                        Prorated Credit
                      </span>
                      <span className="text-cyan-400 font-black bg-cyan-500/10 px-2 py-1 rounded-lg border border-cyan-500/20">-{formatRupiah(creditAmount)}</span>
                    </div>
                  )}

                  <div className={cn("border-t pt-4 flex justify-between items-center text-xs px-2", isDark ? "border-slate-800" : "border-slate-100")}>
                    <div className={cn("font-bold uppercase tracking-widest", isDark ? "text-slate-500" : "text-slate-500")}>Subtotal</div>
                    <div className={cn("font-black", isDark ? "text-white" : "text-slate-900")}>{formatRupiah(finalSubtotal)}</div>
                  </div>

                  <div className="flex justify-between items-center text-xs px-2 pb-2">
                    <div className={cn("font-bold uppercase tracking-widest", isDark ? "text-slate-500" : "text-slate-500")}>Payment Fee</div>
                    <div className={cn("font-black", isDark ? "text-white" : "text-slate-900")}>{formatRupiah(fee)}</div>
                  </div>
                </div>

                <div className={cn("rounded-2xl p-5 mb-5 border relative overflow-hidden z-10 shadow-sm", isDark ? "bg-[#060b14] border-slate-800" : "bg-white border-slate-200/90")}>
                  <div className={cn("text-[10px] font-black uppercase tracking-widest mb-1.5", isDark ? "text-slate-400" : "text-slate-500")}>Total Payment</div>
                  <div className={cn("text-3xl font-black tracking-tight leading-tight break-all", isDark ? "text-cyan-400" : "text-cyan-600")}>{formatRupiah(total)}</div>
                </div>

                {/* Legal Checkbox */}
                <div className={cn("mb-5 relative z-10 border-t pt-5", isDark ? "border-slate-800" : "border-slate-100")}>
                  <label className="flex items-start gap-3 cursor-pointer group select-none">
                    <div className="relative flex items-center justify-center shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={isTermsAccepted}
                        onChange={e => setIsTermsAccepted(e.target.checked)}
                        className={cn(
                          "w-4 h-4 rounded-md border cursor-pointer appearance-none transition-all",
                          isTermsAccepted
                            ? "bg-cyan-600 border-cyan-600"
                            : isDark ? "border-slate-700 bg-[#060b14]" : "border-slate-300 bg-white"
                        )}
                      />
                      <ShieldCheck className={cn("absolute w-3 h-3 text-white pointer-events-none transition-opacity", isTermsAccepted ? "opacity-100" : "opacity-0")} />
                    </div>
                    <span className={cn("text-xs leading-relaxed transition-colors", isDark ? "text-slate-400 group-hover:text-slate-300" : "text-slate-500 group-hover:text-slate-700")}>
                      I have read and agree to the <a href="/terms" target="_blank" className="text-cyan-600 dark:text-cyan-400 font-medium hover:underline">Terms of Service</a> and <a href="/privacy" target="_blank" className="text-cyan-600 dark:text-cyan-400 font-medium hover:underline">Privacy Policy</a>.
                    </span>
                  </label>
                </div>

                <button
                  id="checkout-complete-btn"
                  onClick={handleCheckout}
                  disabled={isProcessing || !selectedPlanId || !selectedPaymentMethod || !isTermsAccepted}
                  className={cn(
                    "w-full py-3.5 px-5 rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 transition-all relative z-10 shadow-md",
                    !isProcessing && selectedPlanId && selectedPaymentMethod && isTermsAccepted
                      ? "bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 cursor-pointer shadow-cyan-500/20"
                      : isDark
                        ? "bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed shadow-none"
                        : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
                  )}
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                  {isProcessing ? "Processing..." : "Order Now - Complete Payment"}
                </button>

                <div className="mt-5 relative z-10">
                  <EnterpriseInfraSidebarCard />
                </div>

                <div className={cn("mt-4 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest relative z-10", isDark ? "text-zinc-500" : "text-slate-500")}>
                  <ShieldCheck className="w-4 h-4 text-cyan-500" />
                  256-bit Encrypted Checkout
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function CheckoutPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
        <div className={cn("font-bold uppercase tracking-widest text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>Loading checkout...</div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}