"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import {
  Network,
  Calculator,
  ChevronLeft,
  RefreshCw,
  CheckCircle,
  Info,
  MapPin,
  ShieldCheck,
  Zap,
  Globe,
} from "lucide-react";
import { formatRupiah } from "@/lib/billing";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Select } from "@/components/ui/Select";

export default function ReserveNewIpPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState<Record<string, number>>({});

  const [availableIps, setAvailableIps] = useState<any[]>([]);
  const [fetchingIps, setFetchingIps] = useState(false);
  const [selectedIp, setSelectedIp] = useState("");
  const [isReserving, setIsReserving] = useState(false);

  const fetchData = async () => {
    setFetchingIps(true);
    try {
      const [ipsRes, pricingRes] = await Promise.all([
        fetch("/api/user/checkout/available-ips"),
        fetch("/api/user/vps/order-data"),
      ]);

      if (ipsRes.ok) {
        const data = await ipsRes.json();
        setAvailableIps(data);
        if (data.length > 0) setSelectedIp(data[0].ipAddress);
      }

      if (pricingRes.ok) {
        const data = await pricingRes.json();
        if (data.pricing) {
          setPricing(data.pricing);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch available IPs");
    } finally {
      setLoading(false);
      setFetchingIps(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReserve = async () => {
    if (!selectedIp) return toast.error("Please select an IP address.");
    setIsReserving(true);
    try {
      const res = await fetch("/api/user/reserved-ips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ipAddress: selectedIp }),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success("IP reserved successfully!");
        router.push("/dashboard/reserved-ips");
      } else {
        toast.error(data.error || "Failed to reserve IP");
      }
    } catch {
      toast.error("Internal server error");
    } finally {
      setIsReserving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] w-full flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className={cn("text-xs font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
          Loading available IP addresses...
        </p>
      </div>
    );
  }

  const isIPv6 = selectedIp.includes(":");
  const ipPrice = isIPv6 ? pricing?.ipv6 || 0 : pricing?.ipv4 || 0;

  return (
    <div className="space-y-6 max-w-full pb-14">
      {/* Back Navigation */}
      <div>
        <Link
          href="/dashboard/reserved-ips"
          className={cn(
            "inline-flex items-center gap-2 text-xs font-medium px-3.5 py-2 rounded-xl transition-all border w-fit",
            isDark
              ? "text-zinc-400 hover:text-white bg-[#0a0a0c] hover:bg-white/[0.04] border-white/[0.08] hover:border-cyan-500/40"
              : "text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs"
          )}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Reserved IPs
        </Link>
      </div>

      {/* Top Header matching Managed Apps */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className={cn("text-lg sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Reserve Global IP
            </h1>
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-bold border shrink-0",
                isDark
                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                  : "bg-cyan-50 text-cyan-700 border-cyan-200"
              )}
            >
              Static IPv4 / IPv6 Pool
            </span>
          </div>
          <p className={cn("text-xs sm:text-sm font-medium mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
            Select an available IP address from the pool. Reserved IPs stay dedicated to your account and can be attached to any Cloud VPS.
          </p>
        </div>

        {/* Datacenter Region Badge */}
        <div
          className={cn(
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold shrink-0 self-start sm:self-center transition-all",
            isDark
              ? "bg-[#0a0a0c] border-white/[0.08] text-zinc-300"
              : "bg-white border-slate-200/90 text-slate-700 shadow-2xs"
          )}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <MapPin className={cn("w-3.5 h-3.5 shrink-0", isDark ? "text-cyan-400" : "text-cyan-600")} />
          <span>
            Region: <strong className={isDark ? "text-white" : "text-slate-900"}>Sidoarjo (ID-SDA)</strong>
          </span>
        </div>
      </div>

      {/* 2-Column Checkout Layout matching Managed Apps / Object Storage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column */}
        <div className="lg:col-span-8 space-y-6">
          <div
            className={cn(
              "p-5 sm:p-6 rounded-2xl border space-y-5",
              isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border",
                    isDark
                      ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400"
                      : "bg-cyan-50 border-cyan-200 text-cyan-700"
                  )}
                >
                  1
                </span>
                <h2 className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-900")}>
                  Select Available IP Address
                </h2>
              </div>
              <span className={cn("text-xs font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
                {availableIps.length} Available
              </span>
            </div>

            {fetchingIps ? (
              <div className={cn("flex items-center gap-2 text-xs py-3", isDark ? "text-zinc-400" : "text-slate-500")}>
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                <span>Fetching available IPs...</span>
              </div>
            ) : availableIps.length === 0 ? (
              <div
                className={cn(
                  "text-xs py-4 px-4 rounded-xl border",
                  isDark ? "text-amber-300 bg-amber-500/10 border-amber-500/25" : "text-amber-800 bg-amber-50 border-amber-200"
                )}
              >
                No IP addresses are currently available in the pool. Please contact support.
              </div>
            ) : (
              <div className="space-y-4">
                <Select
                  value={selectedIp}
                  onChange={(val) => setSelectedIp(val)}
                  options={availableIps.map((ip) => ({
                    value: ip.ipAddress,
                    label: ip.ipAddress,
                  }))}
                  placeholder="Select an IP address..."
                  className="font-mono text-sm py-3"
                />

                <div
                  className={cn(
                    "p-4 rounded-xl flex items-start gap-3 border",
                    isDark
                      ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-200"
                      : "bg-cyan-50 border-cyan-200 text-cyan-800"
                  )}
                >
                  <Info className={cn("w-4 h-4 shrink-0 mt-0.5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                  <p className="text-xs leading-relaxed">
                    <strong className={isDark ? "text-cyan-300" : "text-cyan-900"}>Note:</strong> After reserving a Local IP, you can open a support ticket anytime to request a Public IP allocation, or attach it directly to an existing Cloud VPS.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Highlights */}
          <div
            className={cn(
              "p-5 rounded-2xl border grid grid-cols-1 sm:grid-cols-3 gap-4",
              isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs"
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn("p-2 rounded-xl border shrink-0", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
                <Network className="w-4 h-4" />
              </div>
              <div>
                <p className={cn("text-xs font-bold", isDark ? "text-white" : "text-slate-900")}>Portable IP</p>
                <p className={cn("text-[11px] mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                  Attach or detach between VPS instances anytime.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className={cn("p-2 rounded-xl border shrink-0", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className={cn("text-xs font-bold", isDark ? "text-white" : "text-slate-900")}>BGP Anti-DDoS</p>
                <p className={cn("text-[11px] mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                  Protected by MikroTik &amp; Juniper edge filtering.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className={cn("p-2 rounded-xl border shrink-0", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <p className={cn("text-xs font-bold", isDark ? "text-white" : "text-slate-900")}>Merged Billing</p>
                <p className={cn("text-[11px] mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                  Auto-merges into VPS billing when attached.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Summary Card */}
        <div className="lg:col-span-4 lg:sticky lg:top-6">
          <div
            className={cn(
              "p-5 sm:p-6 rounded-2xl border space-y-5",
              isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs"
            )}
          >
            <div className="flex items-center gap-2.5">
              <div className={cn("p-2 rounded-xl border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
                <Calculator className="w-4 h-4" />
              </div>
              <h3 className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-900")}>
                Reservation Summary
              </h3>
            </div>

            <div className={cn("space-y-2.5 text-xs pt-3 border-t", isDark ? "border-white/[0.08]" : "border-slate-200")}>
              <div className="flex items-center justify-between gap-2">
                <span className={isDark ? "text-zinc-400" : "text-slate-500"}>Selected IP</span>
                <span className={cn("font-mono font-bold", isDark ? "text-white" : "text-slate-900")}>
                  {selectedIp || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className={isDark ? "text-zinc-400" : "text-slate-500"}>IP Protocol</span>
                <span className={cn("font-semibold inline-flex items-center gap-1", isDark ? "text-cyan-400" : "text-cyan-700")}>
                  <Globe className="w-3.5 h-3.5" />
                  {selectedIp ? (isIPv6 ? "IPv6" : "IPv4") : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className={isDark ? "text-zinc-400" : "text-slate-500"}>Billing Mode</span>
                <span className={cn("font-semibold", isDark ? "text-zinc-200" : "text-slate-800")}>
                  Pay-As-You-Go
                </span>
              </div>
            </div>

            <div className={cn("p-4 rounded-xl border", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-slate-50 border-slate-200")}>
              <div className={cn("text-[11px] font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
                Estimated Rate
              </div>
              <div className="flex items-baseline justify-between gap-2 mt-1">
                <span className={cn("text-2xl font-black font-mono", isDark ? "text-cyan-400" : "text-cyan-700")}>
                  {formatRupiah(ipPrice)}
                  <span className={cn("text-xs font-normal ml-1", isDark ? "text-zinc-400" : "text-slate-500")}>/hr</span>
                </span>
                <span className={cn("text-[11px] font-mono", isDark ? "text-zinc-500" : "text-slate-500")}>
                  ~{formatRupiah(ipPrice * 720)}/mo
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleReserve}
              disabled={isReserving || availableIps.length === 0 || !selectedIp}
              className="w-full py-3 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 active:scale-[0.99] text-slate-950 font-bold text-xs transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-cyan-400/20"
            >
              {isReserving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Reserving IP...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Reserve IP Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
