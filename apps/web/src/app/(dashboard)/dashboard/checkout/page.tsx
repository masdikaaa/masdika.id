"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useTheme } from "@/components/ThemeProvider";
import {
  Check, ChevronRight, ChevronLeft, ShieldCheck,
  Wallet, Code2, Link as LinkIcon, Cloud,
  UploadCloud, Server, FileVideo, Music, PlaySquare,
  FileText, Activity, X, ArrowUpCircle, ShoppingCart, Loader2, BadgeCheck, RefreshCw, Terminal, Plus
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
    "w-8 h-8 rounded-lg border flex items-center justify-center transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer",
    isDark
      ? "bg-white/[0.02] border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/[0.15]"
      : "bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300"
  );

  return (
    <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-5 border-t relative z-10 transition-colors", isDark ? "border-white/[0.07]" : "border-slate-100")}>
      <div className={cn("text-xs font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>
        Showing <span className={cn("font-semibold", isDark ? "text-zinc-300" : "text-slate-700")}>{from}–{to}</span> of{" "}
        <span className={cn("font-semibold", isDark ? "text-zinc-300" : "text-slate-700")}>{total}</span> {label}
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
                "min-w-8 h-8 px-2.5 rounded-lg border text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer",
                active
                  ? "bg-cyan-400 border-cyan-400 text-slate-950 shadow-xs"
                  : isDark
                    ? "bg-white/[0.02] border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/[0.15]"
                    : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300"
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
    desc: "Dedicated-core virtual machines with SSD/HDD storage & 1 Gbps uplink.",
    badge: "Popular",
    tags: ["1 Gbps Uplink", "Anti-DDoS BGP", "Root Access"]
  },
  {
    id: "KUBERNETES",
    name: "Managed Kubernetes (KaaS)",
    category: "COMPUTE",
    icon: SiKubernetes,
    desc: "Production-ready K3s cluster with automated control plane & private VPC.",
    badge: "Enterprise",
    tags: ["K3s Engine", "Traefik Ingress", "Auto-heal"]
  },
  {
    id: "CDN",
    name: "File CDN",
    category: "STORAGE_CDN",
    icon: UploadCloud,
    desc: "Low-latency edge object delivery with automatic media optimization.",
    badge: "Edge Speed",
    tags: ["Global Edge", "Image Optimizer", "98.99% SLA"]
  },
  {
    id: "SHORTENER",
    name: "URL Shortener",
    category: "URL_SHORTENER",
    icon: LinkIcon,
    desc: "Custom branded short links with real-time click telemetry and QR generation.",
    badge: "Analytics",
    tags: ["Custom Domains", "Click Telemetry", "QR Codes"]
  },
  {
    id: "TIKTOK",
    name: "TikTok API",
    category: "DEVELOPER_API",
    icon: FileVideo,
    desc: "High-throughput video metadata & watermark-free HD stream extraction.",
    badge: "API v2",
    tags: ["No-Watermark HD", "Metadata", "Batch Ready"]
  },
  {
    id: "SPOTIFY",
    name: "Spotify API",
    category: "DEVELOPER_API",
    icon: Music,
    desc: "Track metadata search, album artwork, and high-bitrate audio streams.",
    badge: "Audio API",
    tags: ["Track Search", "Album Metadata", "High Bitrate"]
  },
  {
    id: "YOUTUBE",
    name: "YouTube API",
    category: "DEVELOPER_API",
    icon: PlaySquare,
    desc: "Fast video metadata scraper, caption track & 4K stream extractor.",
    badge: "Media Stream",
    tags: ["Up to 4K", "Audio Extract", "Subtitles"]
  },
  {
    id: "BLOG",
    name: "Blog API",
    category: "DEVELOPER_API",
    icon: FileText,
    desc: "Headless CMS backend API with markdown rendering and edge caching.",
    badge: "Headless CMS",
    tags: ["REST & GraphQL", "Markdown", "Edge Cache"]
  },
  {
    id: "BMKG_WEATHER",
    name: "BMKG Weather API",
    category: "DEVELOPER_API",
    icon: Cloud,
    desc: "Real-time Indonesian meteorological weather forecasts & radar data.",
    badge: "Real-time",
    tags: ["All Provinces", "3-Day Forecast", "BMKG Feed"]
  },
  {
    id: "BMKG_EARTHQUAKE",
    name: "BMKG Earthquake API",
    category: "DEVELOPER_API",
    icon: Activity,
    desc: "Instant seismic event feed, tsunami warnings, and shakemap coordinates.",
    badge: "Live Alert",
    tags: ["Seismic Alerts", "Shakemap", "M 5.0+ Feed"]
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
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>("BALANCE");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTermsAccepted, setIsTermsAccepted] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/public/plans").then(res => res.json()).catch(() => ({ success: false, data: [] })),
      fetch("/api/public/payment-methods").then(res => res.json()).catch(() => ({ success: false, data: [] })),
      fetch("/api/user/billing").then(res => res.json()).catch(() => ({ success: false, data: { balance: 0, subscriptions: [] } })),
      fetch("/api/public/discounts").then(res => res.json()).catch(() => ({ success: false, data: {} }))
    ]).then(([plansRes, pmRes, billingRes]) => {
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

  const currentServicePlans = useMemo(() => plans.filter(p => p.service === selectedService), [plans, selectedService]);
  const selectedPlan = useMemo(() => plans.find(p => p.id === selectedPlanId), [plans, selectedPlanId]);
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
    } catch {
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
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-5 pb-20 w-full max-w-full min-w-0"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Compact Console Top Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1"
      >
        <div className="flex items-start sm:items-center gap-3.5">
          <Link
            href="/dashboard/billing"
            className={cn(
              "mt-0.5 sm:mt-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all border shrink-0",
              isDark
                ? "text-zinc-400 hover:text-white bg-[#0a0a0c] hover:bg-white/[0.04] border-white/[0.08]"
                : "text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs"
            )}
            title="Back to Billing"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                Deploy & Order Service
              </h1>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border",
                  isDark
                    ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                    : "bg-cyan-50 border-cyan-200 text-cyan-800"
                )}
              >
                Pay-As-You-Go
              </span>
            </div>
            <p className={cn("text-xs sm:text-sm mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
              Configure your cloud instance, Kubernetes cluster, or developer API subscription.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Compact Architectural Hardware Specification Strip */}
      <motion.div variants={itemVariants} className="w-full max-w-full min-w-0">
        <EnterpriseInfraBanner />
      </motion.div>

      <div className="space-y-6 w-full max-w-full min-w-0">
        {/* Service & Architecture Selector */}
        {action !== "add_node" && (
          <motion.div
            variants={itemVariants}
            className={cn(
              "rounded-2xl p-4 sm:p-6 border relative z-[60] overflow-hidden",
              isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-xs"
            )}
          >
            {/* Header + Segmented Category Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 mb-5 border-b border-white/[0.07] dark:border-white/[0.07] light:border-slate-100"
              style={{ borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(226,232,240,0.8)" }}
            >
              <div>
                <h2 className={cn("text-base sm:text-lg font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                  Select Service & Architecture
                </h2>
                <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                  Choose an infrastructure category and select the resource you want to provision.
                </p>
              </div>

              {/* Segmented Category Control */}
              <div
                className={cn(
                  "p-1 rounded-xl border grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1",
                  isDark ? "bg-[#111115] border-white/[0.06]" : "bg-slate-100/90 border-slate-200/80"
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
                        "flex items-center justify-center sm:justify-start gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                        active
                          ? isDark
                            ? "bg-[#1c1c22] text-white border border-white/[0.1] shadow-xs"
                            : "bg-white text-slate-900 border border-slate-200/80 shadow-2xs"
                          : isDark
                            ? "text-zinc-400 hover:text-zinc-200 border border-transparent"
                            : "text-slate-600 hover:text-slate-900 border border-transparent"
                      )}
                    >
                      <CatIcon className={cn("w-3.5 h-3.5 shrink-0", active ? "text-cyan-400" : isDark ? "text-zinc-500" : "text-slate-400")} />
                      <span className="truncate">{cat.name}</span>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.2 rounded font-mono font-bold shrink-0",
                          active
                            ? isDark ? "bg-cyan-500/15 text-cyan-400" : "bg-cyan-50 text-cyan-700"
                            : isDark ? "bg-white/[0.04] text-zinc-500" : "bg-slate-200/70 text-slate-500"
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Service Cards Grid */}
            {(() => {
              const categoryServices = SERVICES.filter(s => s.category === selectedCategory);
              return (
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={selectedCategory}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className={cn(
                      "grid gap-3 sm:gap-3.5",
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
                            "group relative text-left p-4 rounded-xl border transition-all duration-150 flex flex-col justify-between cursor-pointer",
                            isSelected
                              ? isDark
                                ? "bg-cyan-500/[0.05] border-cyan-500/50 text-white ring-1 ring-cyan-500/20"
                                : "bg-cyan-50/40 border-cyan-600 text-slate-900 ring-1 ring-cyan-600/20"
                              : isDark
                                ? "bg-white/[0.015] border-white/[0.07] hover:border-white/[0.15] hover:bg-white/[0.03] text-zinc-300"
                                : "bg-slate-50/40 border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 text-slate-700"
                          )}
                        >
                          <div className="flex items-start gap-3.5">
                            <div
                              className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors border",
                                isSelected
                                  ? isDark
                                    ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
                                    : "bg-cyan-100/80 text-cyan-700 border-cyan-300"
                                  : isDark
                                    ? "bg-white/[0.03] border-white/[0.07] text-zinc-400 group-hover:text-cyan-400"
                                    : "bg-white border-slate-200/90 text-slate-500 group-hover:text-slate-900"
                              )}
                            >
                              <Icon className="w-5 h-5" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <h3
                                    className={cn(
                                      "text-sm sm:text-base font-bold leading-snug truncate",
                                      isSelected
                                        ? isDark ? "text-white" : "text-slate-900"
                                        : isDark ? "text-zinc-100" : "text-slate-900"
                                    )}
                                  >
                                    {srv.name}
                                  </h3>
                                  {srv.badge && (
                                    <span
                                      className={cn(
                                        "text-[10px] font-semibold px-2 py-0.5 rounded-md border shrink-0",
                                        isSelected
                                          ? isDark
                                            ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                                            : "bg-cyan-100 text-cyan-800 border-cyan-200"
                                          : isDark
                                            ? "bg-white/[0.04] text-zinc-400 border-white/[0.07]"
                                            : "bg-white text-slate-500 border-slate-200"
                                      )}
                                    >
                                      {srv.badge}
                                    </span>
                                  )}
                                </div>

                                <div
                                  className={cn(
                                    "w-4 h-4 rounded-full border flex items-center justify-center transition-all shrink-0",
                                    isSelected
                                      ? "bg-cyan-400 border-cyan-400 text-slate-950"
                                      : isDark
                                        ? "border-white/[0.15] bg-transparent"
                                        : "border-slate-300 bg-white"
                                  )}
                                >
                                  {isSelected && <Check className="w-2.5 h-2.5 stroke-[3.5]" />}
                                </div>
                              </div>

                              <p
                                className={cn(
                                  "text-xs leading-relaxed mt-1 line-clamp-2",
                                  isDark ? "text-zinc-400" : "text-slate-500"
                                )}
                              >
                                {srv.desc}
                              </p>

                              {srv.tags && srv.tags.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                                  {srv.tags.map((tag) => (
                                    <span
                                      key={tag}
                                      className={cn(
                                        "text-[10px] font-medium px-2 py-0.5 rounded border",
                                        isSelected
                                          ? isDark
                                            ? "bg-cyan-500/10 text-cyan-300/90 border-cyan-500/20"
                                            : "bg-white text-cyan-800 border-cyan-200"
                                          : isDark
                                            ? "bg-white/[0.02] text-zinc-500 border-white/[0.05]"
                                            : "bg-white text-slate-500 border-slate-200/70"
                                      )}
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
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
            className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full max-w-full min-w-0 transition-all duration-200"
          >
            {/* Left Column - Generic Steps */}
            <div className="xl:col-span-2 space-y-6 w-full max-w-full min-w-0">
              {/* Step 1: Choose Tier */}
              <section
                className={cn(
                  "rounded-2xl p-5 sm:p-6 overflow-hidden relative border w-full max-w-full min-w-0",
                  isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-xs"
                )}
              >
                <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b"
                  style={{ borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(226,232,240,0.8)" }}
                >
                  <div>
                    <h2 className={cn("text-base sm:text-lg font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                      1. Select Plan Tier
                    </h2>
                    <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                      Choose the resource quota for {SERVICES.find(s => s.id === selectedService)?.name || selectedService}.
                    </p>
                  </div>
                </div>

                <div className="relative z-10 min-h-[180px]">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                            "relative flex flex-col p-4 sm:p-5 rounded-xl border transition-all duration-150 cursor-pointer",
                            isDisabled && "opacity-45 cursor-not-allowed grayscale",
                            isSelected
                              ? isDark
                                ? "bg-cyan-500/[0.05] border-cyan-500/50 text-white ring-1 ring-cyan-500/20"
                                : "bg-cyan-50/40 border-cyan-600 text-slate-900 ring-1 ring-cyan-600/20"
                              : !isDisabled && (isDark
                                ? "bg-white/[0.015] border-white/[0.07] hover:border-white/[0.15] hover:bg-white/[0.03]"
                                : "bg-slate-50/40 border-slate-200/90 hover:border-slate-300 hover:bg-white")
                          )}
                        >
                          {/* Header: Name + Radio check */}
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <h3 className={cn("text-sm sm:text-base font-bold truncate", isDark ? "text-white" : "text-slate-900")}>
                                {plan.name}
                              </h3>
                              {isDowngrade && (
                                <span className={cn("text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border shrink-0", isDark ? "bg-white/[0.05] text-zinc-400 border-white/[0.08]" : "bg-slate-100 text-slate-600 border-slate-200")}>
                                  Active
                                </span>
                              )}
                            </div>
                            <div
                              className={cn(
                                "w-4 h-4 rounded-full border flex items-center justify-center transition-all shrink-0",
                                isSelected
                                  ? "bg-cyan-400 border-cyan-400 text-slate-950"
                                  : isDark ? "border-white/[0.15] bg-transparent" : "border-slate-300 bg-white"
                              )}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3.5]" />}
                            </div>
                          </div>

                          {/* Pricing */}
                          <div className={cn("mb-4 pb-3.5 border-b", isDark ? "border-white/[0.07]" : "border-slate-200/70")}>
                            <div className="flex items-baseline gap-1">
                              <span className={cn("text-xl sm:text-2xl font-bold font-mono tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                                {isCustom ? "Custom" : formatRupiah(plan.hourlyPrice || 0)}
                              </span>
                              {!isCustom && (
                                <span className={cn("text-xs font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>
                                  / hr
                                </span>
                              )}
                            </div>
                            {!isCustom && (plan.hourlyPrice || 0) > 0 && (
                              <div className={cn("text-[11px] font-medium mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                                ≈ {formatRupiah((plan.hourlyPrice || 0) * 24 * 30)} / month
                              </div>
                            )}
                          </div>

                          {/* Feature list */}
                          <ul className="space-y-2 text-xs flex-1">
                            {getPlanFeatures(plan).map((feature: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2">
                                <Check className={cn("w-3.5 h-3.5 shrink-0 mt-0.5", isSelected ? "text-cyan-400" : isDark ? "text-zinc-500" : "text-slate-400")} />
                                <span className={cn("leading-relaxed", isDark ? "text-zinc-300" : "text-slate-600")}>
                                  {feature}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                    {currentServicePlans.length === 0 && (
                      <div className={cn("col-span-full py-12 text-center text-sm rounded-xl border", isDark ? "text-zinc-500 bg-white/[0.01] border-white/[0.07]" : "text-slate-500 bg-slate-50 border-slate-200")}>
                        No active plans available for this service right now.
                      </div>
                    )}
                  </div>
                </div>

                <Pager
                  page={tierPage}
                  pageSize={6}
                  total={currentServicePlans.length}
                  onChange={setTierPage}
                  isDark={isDark}
                  label="tiers"
                />
              </section>

              {/* Step 2: Payment Method */}
              <section
                className={cn(
                  "h-fit border rounded-2xl p-5 sm:p-6 overflow-hidden relative w-full max-w-full min-w-0",
                  isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-xs"
                )}
              >
                <div className="mb-4">
                  <h2 className={cn("text-base sm:text-lg font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                    2. Payment Method
                  </h2>
                  <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                    Pay-As-You-Go services are deducted hourly from your Account Balance.
                  </p>
                </div>

                <div
                  className={cn(
                    "flex items-center justify-between gap-4 p-4 rounded-xl border transition-all",
                    balance < total
                      ? "border-red-500/30 bg-red-500/5"
                      : isDark
                        ? "bg-white/[0.02] border-white/[0.08]"
                        : "bg-slate-50/70 border-slate-200"
                  )}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                        isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-white border-slate-200 text-cyan-700"
                      )}
                    >
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-900")}>
                        Account Balance (Wallet)
                      </div>
                      <div className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                        Available: <strong className="font-mono font-bold text-cyan-400">{formatRupiah(balance)}</strong>
                      </div>
                      {balance < total && (
                        <div className="text-xs text-red-400 font-semibold mt-2 flex items-center gap-1.5">
                          <X className="w-3.5 h-3.5" /> Insufficient balance.{" "}
                          <Link href="/dashboard/topup" className="underline hover:text-red-300">
                            Top up now &rarr;
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column - Order Summary */}
            <div className="xl:col-span-1 w-full max-w-full min-w-0">
              <div
                className={cn(
                  "sticky top-6 border rounded-2xl p-5 sm:p-6 overflow-hidden w-full max-w-full min-w-0",
                  isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-xs"
                )}
              >
                <h2
                  className={cn(
                    "text-base sm:text-lg font-bold mb-5 pb-3.5 border-b flex items-center gap-2",
                    isDark ? "text-white border-white/[0.07]" : "text-slate-900 border-slate-100"
                  )}
                >
                  <BadgeCheck className="w-4 h-4 text-cyan-400" />
                  Order Summary
                </h2>

                <div className="space-y-3.5 mb-5">
                  <div
                    className={cn(
                      "flex justify-between items-center p-3.5 rounded-xl border",
                      isDark ? "bg-white/[0.02] border-white/[0.07]" : "bg-slate-50 border-slate-200/80"
                    )}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className={cn("text-xs font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
                        {SERVICES.find(s => s.id === selectedService)?.name}
                      </div>
                      <div className={cn("text-sm font-bold truncate mt-0.5", isDark ? "text-white" : "text-slate-900")}>
                        {selectedPlan?.name || "No Plan Selected"}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={cn("text-sm font-bold font-mono", isDark ? "text-white" : "text-slate-900")}>
                        {formatRupiah(selectedPlan?.hourlyPrice || 0)}/hr
                      </div>
                      {(selectedPlan?.hourlyPrice || 0) > 0 && (
                        <div className={cn("text-[10px] font-mono", isDark ? "text-zinc-500" : "text-slate-500")}>
                          ≈ {formatRupiah((selectedPlan?.hourlyPrice || 0) * 24 * 30)}/mo
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs px-1">
                    <span className={isDark ? "text-zinc-400" : "text-slate-500"}>Billing Cycle</span>
                    <span className={cn("font-semibold", isDark ? "text-zinc-200" : "text-slate-800")}>Hourly (PAYG)</span>
                  </div>

                  {creditAmount > 0 && (
                    <div className={cn("flex justify-between items-center text-xs py-2.5 border-y px-1", isDark ? "border-white/[0.07]" : "border-slate-100")}>
                      <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
                        <ArrowUpCircle className="w-3.5 h-3.5" />
                        Prorated Credit
                      </span>
                      <span className="text-cyan-400 font-mono font-bold">-{formatRupiah(creditAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xs px-1">
                    <span className={isDark ? "text-zinc-400" : "text-slate-500"}>Subtotal</span>
                    <span className={cn("font-mono font-semibold", isDark ? "text-zinc-200" : "text-slate-800")}>{formatRupiah(finalSubtotal)}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs px-1">
                    <span className={isDark ? "text-zinc-400" : "text-slate-500"}>Platform Fee</span>
                    <span className={cn("font-mono font-semibold", isDark ? "text-zinc-200" : "text-slate-800")}>{formatRupiah(fee)}</span>
                  </div>
                </div>

                <div
                  className={cn(
                    "rounded-xl p-4 mb-5 border flex items-baseline justify-between gap-2",
                    isDark ? "bg-white/[0.02] border-white/[0.08]" : "bg-slate-50 border-slate-200/80"
                  )}
                >
                  <span className={cn("text-xs font-semibold", isDark ? "text-zinc-400" : "text-slate-600")}>
                    Due Now (1st Hour)
                  </span>
                  <span className={cn("text-xl sm:text-2xl font-bold font-mono tracking-tight", isDark ? "text-cyan-400" : "text-cyan-700")}>
                    {formatRupiah(total)}
                  </span>
                </div>

                {/* Legal Checkbox */}
                <div className="mb-5">
                  <label className="flex items-start gap-2.5 cursor-pointer group select-none">
                    <div className="relative flex items-center justify-center shrink-0 mt-0.5">
                      <input
                        type="checkbox"
                        checked={isTermsAccepted}
                        onChange={e => setIsTermsAccepted(e.target.checked)}
                        className={cn(
                          "w-4 h-4 rounded border cursor-pointer appearance-none transition-all",
                          isTermsAccepted
                            ? "bg-cyan-400 border-cyan-400"
                            : isDark ? "border-white/[0.2] bg-white/[0.02]" : "border-slate-300 bg-white"
                        )}
                      />
                      <Check className={cn("absolute w-3 h-3 text-slate-950 stroke-[3] pointer-events-none transition-opacity", isTermsAccepted ? "opacity-100" : "opacity-0")} />
                    </div>
                    <span className={cn("text-xs leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
                      I agree to the{" "}
                      <a href="/terms" target="_blank" className="text-cyan-500 hover:underline font-medium">
                        Terms of Service
                      </a>{" "}
                      and{" "}
                      <a href="/privacy" target="_blank" className="text-cyan-500 hover:underline font-medium">
                        Privacy Policy
                      </a>.
                    </span>
                  </label>
                </div>

                <button
                  id="checkout-complete-btn"
                  onClick={handleCheckout}
                  disabled={isProcessing || !selectedPlanId || !selectedPaymentMethod || !isTermsAccepted}
                  className={cn(
                    "w-full py-3 px-5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all",
                    !isProcessing && selectedPlanId && selectedPaymentMethod && isTermsAccepted
                      ? "bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 cursor-pointer shadow-xs"
                      : isDark
                        ? "bg-white/[0.05] text-zinc-500 border border-white/[0.07] cursor-not-allowed"
                        : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                  )}
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                  {isProcessing ? "Processing..." : "Activate Service"}
                </button>

                <div className="mt-4">
                  <EnterpriseInfraSidebarCard />
                </div>

                <div className={cn("mt-3.5 flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-400")}>
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  256-bit Encrypted Provisioning
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <div className={cn("font-semibold text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>Loading console...</div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
