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
import { Select } from "@/components/ui/Select";

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
    <motion.div className="space-y-6 md:space-y-8 pb-20" variants={containerVariants} initial="hidden" animate="visible">

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
      <motion.div variants={itemVariants} className={cn("relative overflow-hidden rounded-3xl backdrop-blur-sm border p-6 md:p-8 group shadow-sm", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200")}>

        <div className="relative z-10 shrink-0">
          <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold mb-4 tracking-wide", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
            <ShoppingCart className="w-3 h-3" /> Secure Checkout
          </div>
          <h1 className={cn("text-3xl md:text-4xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Order Service
          </h1>
          <p className={cn("text-sm max-w-md", isDark ? "text-zinc-400" : "text-slate-500")}>Select your desired premium tier and finalize your order.</p>
        </div>
      </motion.div>

      <div className="space-y-8">
        {/* Step 1: Select Service (Moved outside to be full width) */}
        {action !== "add_node" && (
          <motion.section variants={itemVariants} className={cn("rounded-3xl p-6 md:p-8 shadow-md relative z-[60]", isDark ? "bg-white/[0.02] backdrop-blur-sm border-white/5" : "bg-white border-slate-200")}>
            <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none -z-10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
            </div>

            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black text-sm border border-cyan-500/30">1</div>
              <h2 className={cn("text-xl font-bold tracking-wide", isDark ? "text-white" : "text-slate-900")}>Select Service</h2>
            </div>

            {/* Category Dropdown */}
            <div className="mb-8 relative z-50">
              <Select
                value={selectedCategory}
                onChange={(val) => {
                  setSelectedCategory(val);
                  setServicePage(1);
                }}
                options={CATEGORIES.map(cat => ({ value: cat.id, label: cat.name }))}
                className={cn("w-full rounded-2xl px-5 py-3.5 text-sm font-bold", isDark ? "bg-white/[0.02] border-white/10 shadow-inner" : "bg-slate-50 border-slate-200")}
              />
            </div>

            {/* Service Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              <AnimatePresence mode="popLayout">
                {SERVICES.filter(s => s.category === selectedCategory)
                  .slice((servicePage - 1) * 4, servicePage * 4)
                  .map(srv => {
                    const Icon = srv.icon;
                    const isSelected = selectedService === srv.id;
                    return (
                      <motion.button
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        key={srv.id}
                        onClick={() => {
                          setSelectedService(srv.id);
                          setTierPage(1);
                        }}
                        className={cn(
                          "relative p-5 rounded-2xl border text-left transition-all overflow-hidden group shadow-inner h-full min-h-[112px] flex items-center",
                          isSelected
                            ? "bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.1)]"
                            : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
                        )}
                      >
                        {isSelected && isDark && (
                          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-cyan-500/20 to-transparent rounded-bl-3xl pointer-events-none" />
                        )}
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-inner",
                            isSelected ? (isDark ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" : "bg-cyan-100 text-cyan-700 border-cyan-300") : (isDark ? "bg-white/5 border-white/10 text-zinc-400 group-hover:bg-white/10 group-hover:text-cyan-400" : "bg-slate-100 border-slate-200 text-slate-500 group-hover:bg-cyan-50 group-hover:text-cyan-600")
                          )}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className={cn("font-bold mb-1", isSelected ? (isDark ? "text-cyan-400" : "text-cyan-700") : (isDark ? "text-white" : "text-slate-900"))}>{srv.name}</div>
                            <div className={cn("text-xs font-medium leading-relaxed", isDark ? "text-zinc-500" : "text-slate-500")}>{srv.desc}</div>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
              </AnimatePresence>
            </div>

            {/* Pagination Controls */}
            {SERVICES.filter(s => s.category === selectedCategory).length > 4 && (
              <div className="flex justify-center gap-2 mt-6 relative z-10">
                <button
                  onClick={() => setServicePage(p => Math.max(1, p - 1))}
                  disabled={servicePage === 1}
                  className={cn("px-4 py-2 border rounded-xl disabled:opacity-50 disabled:pointer-events-none transition-all text-sm font-semibold", isDark ? "bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10" : "bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50")}
                >
                  Previous
                </button>
                <div className={cn("px-4 py-2 border rounded-xl font-bold text-sm", isDark ? "bg-white/5 border-white/10 text-white" : "bg-slate-100 border-slate-200 text-slate-900")}>
                  {servicePage} / {Math.ceil(SERVICES.filter(s => s.category === selectedCategory).length / 4)}
                </div>
                <button
                  onClick={() => setServicePage(p => Math.min(Math.ceil(SERVICES.filter(s => s.category === selectedCategory).length / 4), p + 1))}
                  disabled={servicePage === Math.ceil(SERVICES.filter(s => s.category === selectedCategory).length / 4)}
                  className={cn("px-4 py-2 border rounded-xl disabled:opacity-50 disabled:pointer-events-none transition-all text-sm font-semibold", isDark ? "bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10" : "bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50")}
                >
                  Next
                </button>
              </div>
            )}
          </motion.section>
        )}

        {selectedService === "VPS" || selectedService === "KUBERNETES" ? (
          <VpsCheckoutFlow serviceType={selectedService} />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Left Column - Generic Steps */}
            <div className="xl:col-span-2 space-y-6 md:space-y-8">
              {/* Step 2: Choose Plan */}
              <motion.section variants={itemVariants} className={cn("rounded-3xl p-6 md:p-8 shadow-md overflow-hidden relative", isDark ? "bg-white/[0.02] backdrop-blur-sm border-white/5" : "bg-white border-slate-200")}>
                {isDark && <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />}
                <div className="flex items-center gap-3 mb-6 relative z-10">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black text-sm border border-cyan-500/30">2</div>
                  <h2 className={cn("text-xl font-bold tracking-wide", isDark ? "text-white" : "text-slate-900")}>Choose Tier</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10">
                  {currentServicePlans.slice((tierPage - 1) * 6, tierPage * 6).map(plan => {
                    const currentSubForService = activeSubscriptions.find(s => s.plan.service === selectedService);
                    const isDowngrade = currentSubForService && plan.price <= currentSubForService.plan.price;
                    const isCustom = plan.price === 0;
                    const isDisabled = isCustom || isDowngrade;
                    const isSelected = selectedPlanId === plan.id;

                    return (
                      <motion.div
                        whileHover={!isDisabled ? { y: -5 } : {}}
                        key={plan.id}
                        onClick={() => !isDisabled && setSelectedPlanId(plan.id)}
                        className={cn(
                          "relative flex flex-col p-6 rounded-3xl border transition-all shadow-inner",
                          isDisabled ? "opacity-50 cursor-not-allowed bg-black/40 border-white/5 grayscale" : "cursor-pointer",
                          isSelected
                            ? "bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.15)]"
                            : (!isDisabled && "bg-[#0b1120] border-white/5 hover:border-white/20 hover:bg-white/5")
                        )}
                      >
                        {isSelected && (
                          <div className={cn("absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-xl shadow-lg border", isDark ? "bg-gradient-to-r from-cyan-400 to-cyan-600 text-white border-cyan-400/50" : "bg-cyan-600 text-white border-cyan-700")}>
                            Selected
                          </div>
                        )}

                        <h3 className={cn("text-lg font-bold mb-2 flex items-center justify-between", isDark ? "text-white" : "text-slate-900")}>
                          {plan.name}
                          {isDowngrade && <span className={cn("text-[9px] uppercase tracking-widest font-black px-2 py-0.5 rounded-lg flex-shrink-0 border", isDark ? "bg-white/10 text-zinc-400 border-white/10" : "bg-slate-100 text-slate-500 border-slate-200")}>Current</span>}
                        </h3>

                        <div className={cn("text-3xl font-black mb-6 tracking-tight flex flex-col items-start gap-1", isDark ? "text-white" : "text-slate-900")}>
                          <div>
                            {isCustom ? "Custom" : formatRupiah(plan.hourlyPrice || 0)}
                            {!isCustom && <span className={cn("text-xs font-bold ml-1", isDark ? "text-zinc-500" : "text-slate-500")}>/ hr</span>}
                          </div>
                          {!isCustom && (plan.hourlyPrice || 0) > 0 && (
                            <div className={cn("text-sm font-bold", isDark ? "text-zinc-500" : "text-slate-500")}>
                              ≈ {formatRupiah((plan.hourlyPrice || 0) * 24 * 30)} <span className="text-xs">/ mo</span>
                            </div>
                          )}
                        </div>

                        <ul className="space-y-3 text-xs flex-1">
                          {getPlanFeatures(plan).map((feature: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-3">
                              <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                              <span className={cn("font-medium leading-snug", isDark ? "text-zinc-400" : "text-slate-600")}>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    );
                  })}
                  {currentServicePlans.length === 0 && (
                    <div className={cn("col-span-full py-12 text-center font-medium rounded-3xl border", isDark ? "text-zinc-500 bg-black/20 border-white/5" : "text-slate-500 bg-slate-50 border-slate-200")}>
                      No active plans available for this service right now.
                    </div>
                  )}
                </div>

                {/* Tier Pagination Controls */}
                {currentServicePlans.length > 6 && (
                  <div className="flex justify-center gap-2 mt-6 relative z-10">
                    <button
                      onClick={() => setTierPage(p => Math.max(1, p - 1))}
                      disabled={tierPage === 1}
                      className={cn("px-4 py-2 border rounded-xl disabled:opacity-50 disabled:pointer-events-none transition-all text-sm font-semibold", isDark ? "bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10" : "bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50")}
                    >
                      Previous
                    </button>
                    <div className={cn("px-4 py-2 border rounded-xl font-bold text-sm", isDark ? "bg-white/5 border-white/10 text-white" : "bg-slate-100 border-slate-200 text-slate-900")}>
                      {tierPage} / {Math.ceil(currentServicePlans.length / 6)}
                    </div>
                    <button
                      onClick={() => setTierPage(p => Math.min(Math.ceil(currentServicePlans.length / 6), p + 1))}
                      disabled={tierPage === Math.ceil(currentServicePlans.length / 6)}
                      className={cn("px-4 py-2 border rounded-xl disabled:opacity-50 disabled:pointer-events-none transition-all text-sm font-semibold", isDark ? "bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10" : "bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50")}
                    >
                      Next
                    </button>
                  </div>
                )}
              </motion.section>

              {/* Step 3 & 4: Cycle & Payment */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">

                {/* Payment Method */}
                <motion.section variants={itemVariants} className={cn("h-fit border rounded-3xl p-6 md:p-8 shadow-md overflow-hidden relative", isDark ? "bg-white/[0.02] backdrop-blur-sm border-white/5" : "bg-white border-slate-200")}>
                  {isDark && <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />}
                  <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black text-sm border border-cyan-500/30">3</div>
                    <h2 className={cn("text-xl font-bold tracking-wide", isDark ? "text-white" : "text-slate-900")}>Payment Method</h2>
                  </div>

                  <div className="space-y-6 relative z-10">
                    <div className="flex flex-col gap-2">
                      <div className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl border transition-all text-left shadow-inner",
                        balance < total ? "opacity-50 border-red-500/30 bg-red-500/5" : "bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                      )}>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-white border border-cyan-500/50 shadow-inner">
                          <Wallet className="w-6 h-6 text-cyan-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-base font-bold text-cyan-400">Account Balance</div>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <div className={cn("text-xs font-bold tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Available: {formatRupiah(balance)}</div>
                          </div>
                          {balance < total && (
                            <div className="text-xs text-red-400 font-bold mt-2 bg-red-500/10 px-3 py-1 rounded-lg w-fit flex items-center gap-2">
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
            <motion.div variants={itemVariants} className="xl:col-span-1">
              <div className={cn("sticky top-6 border rounded-3xl p-6 md:p-8 shadow-md overflow-hidden", isDark ? "bg-white/[0.02] backdrop-blur-sm border-white/10" : "bg-white border-slate-200")}>
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
                <h2 className={cn("text-xl font-bold mb-6 border-b pb-4 flex items-center gap-2 relative z-10", isDark ? "text-white border-white/10" : "text-slate-900 border-slate-100")}>
                  <BadgeCheck className="w-5 h-5 text-cyan-400" /> Order Summary
                </h2>

                <div className="space-y-4 mb-8 relative z-10">
                  <div className={cn("flex justify-between items-center p-4 rounded-2xl border", isDark ? "bg-[#0b1120] border-white/5 shadow-inner" : "bg-slate-50 border-slate-200")}>
                    <div className="flex flex-col gap-1">
                      <div className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-900")}>{selectedPlan?.name || 'No Plan'}</div>
                      {(selectedPlan?.hourlyPrice || 0) > 0 && (
                        <div className={cn("text-[10px] font-bold uppercase tracking-widest", isDark ? "text-zinc-500" : "text-slate-500")}>
                          ≈ {formatRupiah((selectedPlan?.hourlyPrice || 0) * 24 * 30)} / MO
                        </div>
                      )}
                    </div>
                    <div className={cn("font-black", isDark ? "text-white" : "text-slate-900")}>{formatRupiah(selectedPlan?.hourlyPrice || 0)}</div>
                  </div>

                  <div className="flex justify-between items-center text-xs px-2">
                    <div className={cn("font-bold uppercase tracking-widest", isDark ? "text-zinc-500" : "text-slate-500")}>Billing Cycle</div>
                    <div className={cn("font-bold px-2 py-1 rounded-lg border", isDark ? "text-white bg-white/5 border-white/5" : "text-slate-900 bg-slate-100 border-slate-200")}>Hourly</div>
                  </div>

                  {creditAmount > 0 && (
                    <div className={cn("flex justify-between items-center text-xs py-3 border-y px-2", isDark ? "border-white/5" : "border-slate-100")}>
                      <span className="text-cyan-400 font-bold flex items-center gap-2 uppercase tracking-widest">
                        <ArrowUpCircle className="w-3.5 h-3.5" />
                        Prorated Credit
                      </span>
                      <span className="text-cyan-400 font-black bg-cyan-500/10 px-2 py-1 rounded-lg border border-cyan-500/20">-{formatRupiah(creditAmount)}</span>
                    </div>
                  )}



                  <div className={cn("border-t pt-4 flex justify-between items-center text-xs px-2", isDark ? "border-white/10" : "border-slate-100")}>
                    <div className={cn("font-bold uppercase tracking-widest", isDark ? "text-zinc-500" : "text-slate-500")}>Subtotal</div>
                    <div className={cn("font-black", isDark ? "text-white" : "text-slate-900")}>{formatRupiah(finalSubtotal)}</div>
                  </div>

                  <div className="flex justify-between items-center text-xs px-2 pb-2">
                    <div className={cn("font-bold uppercase tracking-widest", isDark ? "text-zinc-500" : "text-slate-500")}>Payment Fee</div>
                    <div className={cn("font-black", isDark ? "text-white" : "text-slate-900")}>{formatRupiah(fee)}</div>
                  </div>
                </div>



                <div className={cn("rounded-3xl p-6 mb-6 border relative overflow-hidden z-10 group", isDark ? "bg-black/40 border-white/10 shadow-inner" : "bg-slate-50 border-slate-200")}>
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-teal-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                  <div className={cn("text-[10px] font-black uppercase tracking-widest mb-1", isDark ? "text-zinc-500" : "text-slate-500")}>Total Payment</div>
                  <div className={cn("text-3xl font-black tracking-tight leading-tight break-all", isDark ? "text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400" : "text-cyan-700")}>{formatRupiah(total)}</div>
                </div>

                {/* Legal Checkbox */}
                <div className={cn("mb-6 relative z-10 border-t pt-6", isDark ? "border-white/10" : "border-slate-100")}>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center shrink-0">
                      <input type="checkbox" checked={isTermsAccepted} onChange={e => setIsTermsAccepted(e.target.checked)} className={cn("w-5 h-5 rounded border cursor-pointer appearance-none checked:bg-cyan-600 checked:border-cyan-600 transition-all", isDark ? "border-white/20 bg-white/5 text-cyan-500" : "border-slate-300 bg-white text-cyan-600")} />
                      <ShieldCheck className={cn("absolute w-3.5 h-3.5 text-white pointer-events-none transition-opacity", isTermsAccepted ? "opacity-100" : "opacity-0")} />
                    </div>
                    <span className={cn("text-xs leading-relaxed transition-colors", isDark ? "text-zinc-400 group-hover:text-zinc-300" : "text-slate-500 group-hover:text-slate-700")}>
                      I have read and agree to the <a href="/terms" target="_blank" className="text-cyan-400 hover:underline">Terms of Service</a> and <a href="/privacy" target="_blank" className="text-cyan-400 hover:underline">Privacy Policy</a>.
                    </span>
                  </label>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={isProcessing || !selectedPlanId || !selectedPaymentMethod || !isTermsAccepted}
                  className={cn("w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed relative z-10", isDark ? "shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)]" : "shadow-sm")}
                >
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                  {isProcessing ? "Processing..." : "Complete Secure Payment"}
                </button>

                <div className={cn("mt-6 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest relative z-10", isDark ? "text-zinc-500" : "text-slate-500")}>
                  <ShieldCheck className="w-4 h-4 text-cyan-500" />
                  256-bit Encrypted Checkout
                </div>
              </div>
            </motion.div>
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