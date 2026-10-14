"use client";

import { useState, useEffect } from "react";
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
import { Suspense } from "react";
import VpsCheckoutFlow from "@/components/VpsCheckoutFlow";

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

const CATEGORIES = [
  { id: "COMPUTE", name: "Compute & VPS", icon: Server },
  { id: "STORAGE_CDN", name: "File CDN", icon: UploadCloud },
  { id: "DEVELOPER_API", name: "Developer APIs", icon: Code2 },
  { id: "URL_SHORTENER", name: "URL Shortener", icon: LinkIcon }
];

const SERVICES = [
  { id: "VPS", name: "Cloud VPS", category: "COMPUTE", icon: Terminal, desc: "High performance virtual private servers." },
  { id: "KUBERNETES", name: "Managed Kubernetes (KaaS)", category: "COMPUTE", icon: SiKubernetes, desc: "Ready to use K3s cluster." },
  { id: "CDN", name: "File CDN", category: "STORAGE_CDN", icon: UploadCloud, desc: "Fast global content delivery network." },
  { id: "SHORTENER", name: "URL Shortener", category: "URL_SHORTENER", icon: LinkIcon, desc: "Custom branded short links." },
  { id: "TIKTOK", name: "TikTok API", category: "DEVELOPER_API", icon: FileVideo, desc: "Video data & downloader API." },
  { id: "SPOTIFY", name: "Spotify API", category: "DEVELOPER_API", icon: Music, desc: "Track metadata & downloader." },
  { id: "YOUTUBE", name: "YouTube API", category: "DEVELOPER_API", icon: PlaySquare, desc: "Video data & downloader API." },
  { id: "BLOG", name: "Blog API", category: "DEVELOPER_API", icon: FileText, desc: "Headless CMS API access." },
  { id: "BMKG_WEATHER", name: "BMKG Weather API", category: "DEVELOPER_API", icon: Cloud, desc: "Real-time weather forecast API." },
  { id: "BMKG_EARTHQUAKE", name: "BMKG Earthquake API", category: "DEVELOPER_API", icon: Activity, desc: "Real-time earthquake info & shakemap." },
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
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);

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
            if (subToUpgrade) {
              setSelectedCategory(SERVICES.find(s => s.id === subToUpgrade.plan.service)?.category || "STORAGE_CDN");
              setSelectedService(subToUpgrade.plan.service);
            }
          }
        }
      }
      setPaymentMethods(pms);

      const defaultServicePlans = plansRes.data.filter((p: any) => p.service === "OBJECT_STORAGE" && p.price > 0);
      if (defaultServicePlans.length > 0) {
        setSelectedPlanId(defaultServicePlans[0].id);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const catServices = SERVICES.filter(s => s.category === selectedCategory);
    if (catServices.length > 0 && !catServices.find(s => s.id === selectedService)) {
      setSelectedService(catServices[0].id);
    }
  }, [selectedCategory, selectedService]);

  const cycles = [
    { id: "HOURLY", name: "Pay As You Go (Hourly)", multiplier: 1 }
  ];

  const currentServicePlans = plans.filter(p => p.service === selectedService);
  const selectedPlan = plans.find(p => p.id === selectedPlanId);
  const selectedCycleData = cycles[0];
  const selectedPmData = paymentMethods.find(pm => pm.code === selectedPaymentMethod);

  useEffect(() => {
    if (currentServicePlans.length > 0) {
      let available = currentServicePlans.filter(p => p.price > 0);

      if (upgradeId) {
        const subToUpgrade = activeSubscriptions.find(s => s.id === parseInt(upgradeId));
        if (subToUpgrade) {
          available = available.filter(p => p.price > subToUpgrade.plan.price);
        }
      }

      if (available.length > 0 && !available.find(p => p.id === selectedPlanId)) {
        setSelectedPlanId(available[0].id);
      } else if (available.length === 0) {
        setSelectedPlanId(null);
      }
    }
  }, [selectedService, activeSubscriptions, plans, selectedPlanId, currentServicePlans]);

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

    if (plan.service === 'OBJECT_STORAGE' || plan.service === 'CDN') {
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

      <motion.div variants={itemVariants}>
        <Link
          href="/dashboard/billing"
          className={cn("inline-flex items-center gap-2 transition-colors text-sm font-medium mb-2", isDark ? "text-zinc-400 hover:text-white" : "text-slate-500 hover:text-slate-900")}
        >
          <ArrowLeft className="w-4 h-4" />
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

      <div className="space-y-6 md:space-y-8 w-full max-w-full min-w-0">
        {/* Step 1: Select Service (Moved outside to be full width) */}
        {action !== "add_node" && (
          <motion.section variants={itemVariants} className={cn("rounded-3xl p-4 sm:p-6 md:p-8 shadow-md relative z-[60] border", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200 shadow-sm")}>
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black text-sm border border-cyan-500/30 shrink-0">1</div>
              <div className="min-w-0 flex-1">
                <h2 className={cn("text-xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>Select Service</h2>
                <p className={cn("text-xs mt-0.5", isDark ? "text-slate-400" : "text-slate-500")}>Choose a product category and select the service you wish to configure.</p>
              </div>
            </div>

            {/* Sub-header 1: Category Selection */}
            <div className="flex items-center justify-between gap-2.5 mb-3.5 relative z-10">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <h3 className={cn("text-sm sm:text-base font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                  1. Choose Category
                </h3>
              </div>
              <span className={cn("text-[10px] sm:text-[11px] font-semibold px-2.5 py-0.5 rounded-full border whitespace-nowrap shrink-0", isDark ? "bg-[#060b14] text-slate-400 border-slate-800" : "bg-slate-100 text-slate-600 border-slate-200")}>
                {CATEGORIES.length} Categories
              </span>
            </div>

            {/* Category Grid (Responsive: vertical stack on mobile to prevent any text truncation, horizontal row on desktop) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-6 relative z-10">
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
                    }}
                    className={cn(
                      "p-3 sm:p-3.5 lg:p-4 rounded-2xl border text-left transition-all flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 relative group cursor-pointer min-h-[76px] sm:min-h-[80px] hover:-translate-y-0.5 active:scale-[0.99]",
                      active
                        ? isDark
                          ? "bg-[#0b162c] border-cyan-500 text-cyan-400 shadow-md ring-1 ring-cyan-500/30"
                          : "bg-white border-cyan-600 text-cyan-900 shadow-md ring-2 ring-cyan-600/20"
                        : isDark
                          ? "bg-[#060b14] border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white"
                          : "bg-white border-slate-200/90 hover:border-slate-300 text-slate-700 hover:text-slate-900 shadow-sm"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors border shadow-sm",
                      active
                        ? isDark ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" : "bg-slate-100 text-cyan-700 border-slate-300"
                        : isDark ? "bg-slate-800/80 border-slate-700 text-slate-400 group-hover:text-cyan-400" : "bg-slate-50 border-slate-200 text-slate-500 group-hover:bg-slate-100 group-hover:text-slate-900"
                    )}>
                      <CatIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1 w-full sm:w-auto sm:pr-4">
                      <div className={cn("text-xs sm:text-sm font-bold leading-snug break-words", active ? (isDark ? "text-cyan-400" : "text-cyan-900") : (isDark ? "text-white" : "text-slate-900"))}>
                        {cat.name}
                      </div>
                      <div className={cn("text-[10px] sm:text-xs font-medium mt-0.5", active ? (isDark ? "text-cyan-400/70" : "text-cyan-700/70") : (isDark ? "text-zinc-500" : "text-slate-500"))}>
                        {count} {count === 1 ? "Service" : "Services"}
                      </div>
                    </div>
                    {/* Active check indicator */}
                    <div className={cn(
                      "absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all",
                      active
                        ? "bg-cyan-600 border-cyan-600 text-white shadow-sm"
                        : isDark ? "border-slate-800 bg-slate-900/40" : "border-slate-200 bg-slate-50"
                    )}>
                      {active && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Divider between Category and Services */}
            <div className={cn("my-6 border-t", isDark ? "border-slate-800" : "border-slate-100")} />

            {/* Sub-header 2: Available Services for Selected Category */}
            {(() => {
              const currentCat = CATEGORIES.find(c => c.id === selectedCategory);
              const categoryServices = SERVICES.filter(s => s.category === selectedCategory);
              return (
                <div className="flex items-center justify-between gap-2.5 mb-3.5 relative z-10">
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                    <h3 className={cn("text-sm sm:text-base font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                      2. Available Services - <span className={isDark ? "text-cyan-400" : "text-cyan-600"}>{currentCat?.name || "Category"}</span>
                    </h3>
                  </div>
                  <span className={cn("text-[10px] sm:text-[11px] font-semibold px-2.5 py-0.5 rounded-full border whitespace-nowrap shrink-0", isDark ? "bg-[#060b14] text-slate-400 border-slate-800" : "bg-slate-100 text-slate-600 border-slate-200")}>
                    {categoryServices.length} {categoryServices.length === 1 ? "Service" : "Services"}
                  </span>
                </div>
              );
            })()}

            {/* Service Cards Grid */}
            <div className={cn("relative z-10", SERVICES.filter(s => s.category === selectedCategory).length > 2 && "min-h-[162px] sm:min-h-[170px]")}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`${selectedCategory}-${servicePage}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3"
                >
                  {SERVICES.filter(s => s.category === selectedCategory)
                    .slice((servicePage - 1) * 4, servicePage * 4)
                    .map(srv => {
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
                            "p-3 sm:p-3.5 lg:p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 relative group cursor-pointer min-h-[76px] sm:min-h-[80px] hover:-translate-y-0.5 active:scale-[0.99]",
                            isSelected
                              ? isDark
                                ? "bg-[#0b162c] border-cyan-500 text-cyan-400 shadow-md ring-1 ring-cyan-500/30"
                                : "bg-white border-cyan-600 text-cyan-900 shadow-md ring-2 ring-cyan-600/20"
                              : isDark
                                ? "bg-[#060b14] border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white"
                                : "bg-white border-slate-200/90 hover:border-slate-300 text-slate-700 hover:text-slate-900 shadow-sm"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors border shadow-sm",
                            isSelected
                              ? isDark ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" : "bg-slate-100 text-cyan-700 border-slate-300"
                              : isDark ? "bg-slate-800/80 border-slate-700 text-slate-400 group-hover:text-cyan-400" : "bg-slate-50 border-slate-200 text-slate-500 group-hover:bg-slate-100 group-hover:text-slate-900"
                          )}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1 w-full sm:w-auto sm:pr-4">
                            <div
                              className={cn("text-xs sm:text-sm font-bold leading-snug break-words truncate", isSelected ? (isDark ? "text-cyan-400" : "text-cyan-900") : (isDark ? "text-white" : "text-slate-900"))}
                              title={srv.name}
                            >
                              {srv.name}
                            </div>
                            <div
                              className={cn("text-[10px] sm:text-xs font-medium mt-0.5 line-clamp-1", isSelected ? (isDark ? "text-cyan-400/70" : "text-cyan-700/70") : (isDark ? "text-zinc-500" : "text-slate-500"))}
                              title={srv.desc}
                            >
                              {srv.desc}
                            </div>
                          </div>

                          {/* Active check indicator */}
                          <div className={cn(
                            "absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all duration-200",
                            isSelected
                              ? "bg-cyan-600 border-cyan-600 text-white shadow-sm scale-100"
                              : isDark ? "border-slate-800 bg-slate-900/40 scale-90" : "border-slate-200 bg-slate-50 scale-90"
                          )}>
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Pagination Controls */}
            <Pager
              page={servicePage}
              pageSize={4}
              total={SERVICES.filter(s => s.category === selectedCategory).length}
              onChange={setServicePage}
              isDark={isDark}
              label="services"
            />
          </motion.section>
        )}

        <AnimatePresence mode="wait" initial={false}>
          {selectedService === "VPS" || selectedService === "KUBERNETES" ? (
            <motion.div
              key="vps-flow"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <VpsCheckoutFlow serviceType={selectedService} />
            </motion.div>
          ) : (
            <motion.div
              key="generic-flow"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8 w-full max-w-full min-w-0"
            >
            {/* Left Column - Generic Steps */}
            <div className="xl:col-span-2 space-y-6 md:space-y-8 w-full max-w-full min-w-0">
              {/* Step 2: Choose Plan */}
              <motion.section variants={itemVariants} className={cn("rounded-3xl p-4 sm:p-6 md:p-8 shadow-md overflow-hidden relative border w-full max-w-full min-w-0", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200 shadow-sm")}>
                <div className="flex items-center gap-3 mb-6 relative z-10">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black text-sm border border-cyan-500/30 shrink-0">2</div>
                  <h2 className={cn("text-xl font-bold tracking-wide", isDark ? "text-white" : "text-slate-900")}>Choose Tier</h2>
                </div>

                <div className="relative z-10 min-h-[220px]">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={`${selectedService}-${tierPage}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                    >
                      {currentServicePlans.slice((tierPage - 1) * 6, tierPage * 6).map(plan => {
                        const currentSubForService = activeSubscriptions.find(s => s.plan.service === selectedService);
                        const isDowngrade = currentSubForService && plan.price <= currentSubForService.plan.price;
                        const isCustom = plan.price === 0;
                        const isDisabled = isCustom || isDowngrade;
                        const isSelected = selectedPlanId === plan.id;

                        return (
                          <div
                            key={plan.id}
                            onClick={() => !isDisabled && setSelectedPlanId(plan.id)}
                            className={cn(
                              "relative flex flex-col p-5 sm:p-6 rounded-2xl border transition-all duration-200 shadow-sm cursor-pointer hover:-translate-y-1 active:scale-[0.99]",
                              isDisabled && "opacity-50 cursor-not-allowed bg-black/40 border-slate-800 grayscale hover:translate-y-0",
                              isSelected
                                ? isDark
                                  ? "bg-[#0b162c] border-cyan-500 shadow-md ring-1 ring-cyan-500/30"
                                  : "bg-white border-cyan-600 shadow-md ring-2 ring-cyan-600/20"
                                : (!isDisabled && (isDark ? "bg-[#060b14] border-slate-800 hover:border-slate-700 hover:bg-[#0a1222]" : "bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-md"))
                            )}
                          >
                            {/* Header: Name + Radio check */}
                            <div className="flex items-center justify-between gap-2 mb-4">
                              <div className="flex items-center gap-2 min-w-0">
                                <h3 className={cn("text-base sm:text-lg font-bold truncate", isDark ? "text-white" : "text-slate-900")}>
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
                                  ? "bg-cyan-600 border-cyan-600 text-white shadow-sm"
                                  : isDark ? "border-slate-700 bg-slate-800/40" : "border-slate-300 bg-slate-50"
                              )}>
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            </div>

                            {/* Pricing */}
                            <div className={cn("mb-5 pb-5 border-b", isDark ? "border-slate-800" : "border-slate-100")}>
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
                            <ul className="space-y-2.5 text-xs flex-1">
                              {getPlanFeatures(plan).map((feature: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-2.5">
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
                    </motion.div>
                  </AnimatePresence>
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
              </motion.section>

              {/* Step 3 & 4: Cycle & Payment */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">

                {/* Payment Method */}
                <motion.section variants={itemVariants} className={cn("h-fit border rounded-3xl p-4 sm:p-6 md:p-8 shadow-md overflow-hidden relative w-full max-w-full min-w-0", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200 shadow-sm")}>
                  <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black text-sm border border-cyan-500/30 shrink-0">3</div>
                    <h2 className={cn("text-xl font-bold tracking-wide", isDark ? "text-white" : "text-slate-900")}>Payment Method</h2>
                  </div>

                  <div className="space-y-6 relative z-10">
                    <div className="flex flex-col gap-2">
                      <div className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl border transition-all text-left shadow-sm",
                        balance < total
                          ? "opacity-60 border-red-500/30 bg-red-500/5"
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
                            <div className={cn("text-xs font-semibold", isDark ? "text-slate-400" : "text-slate-500")}>Available: {formatRupiah(balance)}</div>
                          </div>
                          {balance < total && (
                            <div className="text-xs text-red-500 font-bold mt-2 bg-red-500/10 px-3 py-1 rounded-lg w-fit flex items-center gap-2 border border-red-500/20">
                              <X className="w-3 h-3" /> Insufficient Balance
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.section>

              </div>
            </div>

            {/* Right Column - Order Summary */}
            <motion.div variants={itemVariants} className="xl:col-span-1 w-full max-w-full min-w-0">
              <div className={cn("sticky top-6 border rounded-3xl p-4 sm:p-6 md:p-8 shadow-md overflow-hidden w-full max-w-full min-w-0", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200 shadow-sm")}>
                <h2 className={cn("text-xl font-bold mb-6 border-b pb-4 flex items-center gap-2 relative z-10", isDark ? "text-white border-slate-800" : "text-slate-900 border-slate-100")}>
                  <BadgeCheck className="w-5 h-5 text-cyan-400" /> Order Summary
                </h2>

                <div className="space-y-4 mb-8 relative z-10">
                  <div className={cn("flex justify-between items-center p-4 rounded-2xl border shadow-sm", isDark ? "bg-[#060b14] border-slate-800" : "bg-white border-slate-200/90")}>
                    <div className="flex flex-col gap-1">
                      <div className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-900")}>{selectedPlan?.name || 'No Plan'}</div>
                      {(selectedPlan?.hourlyPrice || 0) > 0 && (
                        <div className={cn("text-[10px] font-bold uppercase tracking-widest", isDark ? "text-slate-500" : "text-slate-500")}>
                          ≈ {formatRupiah((selectedPlan?.hourlyPrice || 0) * 24 * 30)} / MO
                        </div>
                      )}
                    </div>
                    <div className={cn("font-black", isDark ? "text-white" : "text-slate-900")}>{formatRupiah(selectedPlan?.hourlyPrice || 0)}</div>
                  </div>

                  <div className="flex justify-between items-center text-xs px-2">
                    <div className={cn("font-bold uppercase tracking-widest", isDark ? "text-slate-500" : "text-slate-500")}>Billing Cycle</div>
                    <div className={cn("font-bold px-2 py-1 rounded-lg border", isDark ? "text-white bg-slate-800/50 border-slate-700" : "text-slate-900 bg-slate-100 border-slate-200")}>Hourly</div>
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
                  onClick={handleCheckout}
                  disabled={isProcessing || !selectedPlanId || !selectedPaymentMethod || !isTermsAccepted}
                  className={cn(
                    "w-full py-3 px-5 rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 transition-all relative z-10",
                    !isProcessing && selectedPlanId && selectedPaymentMethod && isTermsAccepted
                      ? "bg-cyan-600 hover:bg-cyan-700 active:scale-[0.99] text-white shadow-sm cursor-pointer"
                      : isDark
                        ? "bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed"
                        : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
                  )}
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  {isProcessing ? "Processing..." : "Complete Secure Payment"}
                </button>

                <div className={cn("mt-5 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest relative z-10", isDark ? "text-zinc-500" : "text-slate-500")}>
                  <ShieldCheck className="w-4 h-4 text-cyan-500" />
                  256-bit Encrypted Checkout
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>
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