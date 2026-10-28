"use client";

import { useState, useEffect } from "react";
import { Cpu, MemoryStick, HardDrive, ArrowRight, ShieldCheck, Wifi, Rocket, Network, Database } from "lucide-react";
import { formatRupiah } from "@/lib/billing";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { EnterpriseInfraSidebarCard } from "@/components/EnterpriseInfraBadges";

interface Pricing {
  vcpu: number;
  ram: number;
  disk: number;
  diskSsd?: number;
  ipv4: number;
  backup?: number;
  bandwidth?: number;
}

interface VpsSpecSliderProps {
  pricing: Pricing;
  serviceType?: "VPS" | "K3S";
  isDisabled?: boolean;
}

export default function VpsSpecSlider({ pricing, serviceType = "VPS", isDisabled = false }: VpsSpecSliderProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [cpu, setCpu] = useState(1);
  const [ram, setRam] = useState(1);
  const [disk, setDisk] = useState(20);
  const [diskType, setDiskType] = useState<"SSD" | "HDD">("HDD");
  const [backup, setBackup] = useState(0);
  const [includeIpv4, setIncludeIpv4] = useState(true);
  const [bandwidth, setBandwidth] = useState(100);
  const [bandwidthOptions, setBandwidthOptions] = useState<number[]>([100, 150, 200, 250, 300]);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [maxSpecs, setMaxSpecs] = useState<Record<string, number>>({ cpu: 16, ram: 64, diskHdd: 1000, diskSsd: 500, backup: 500 });

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.ok ? res.json() : { user: null })
      .then(data => {
        if (data && data.user) {
          setSession(data.user);
        }
      })
      .catch(() => { })
      .finally(() => setLoading(false));

    fetch('/api/public/vps/max-specs')
      .then(res => res.ok ? res.json() : { maxSpecs: null, bandwidthOptions: null })
      .then(data => {
        if (data && data.maxSpecs) {
          setMaxSpecs(data.maxSpecs);
        }
        if (data && data.bandwidthOptions && Array.isArray(data.bandwidthOptions) && data.bandwidthOptions.length > 0) {
          setBandwidthOptions(data.bandwidthOptions);
        }
      })
      .catch(() => { });
  }, []);

  const currentMaxDisk = diskType === "SSD" ? (maxSpecs.diskSsd || 500) : (maxSpecs.diskHdd || 1000);
  const currentMaxBackup = maxSpecs.backup || currentMaxDisk;
  const currentMaxCpu = maxSpecs.cpu || 16;
  const currentMaxRam = maxSpecs.ram || 64;

  const minBandwidth = bandwidthOptions[0] || 100;
  const maxBandwidth = bandwidthOptions[bandwidthOptions.length - 1] || 300;
  const bandwidthExtraSteps = Math.max(0, Math.floor((bandwidth - 100) / 50));
  const bandwidthRatePerHour = pricing.bandwidth !== undefined ? pricing.bandwidth : Math.ceil(50000 / 730);
  const bandwidthHourlyCost = bandwidthExtraSteps * bandwidthRatePerHour;

  useEffect(() => {
    const t = setTimeout(() => {
      if (disk > currentMaxDisk) {
        setDisk(currentMaxDisk);
      }
      if (backup > currentMaxBackup) {
        setBackup(currentMaxBackup);
      }
    }, 0);
    return () => clearTimeout(t);
  }, [diskType, maxSpecs, disk, backup, currentMaxDisk, currentMaxBackup]);

  const calculateHourlyPrice = () => {
    const diskPrice = diskType === "SSD" ? (pricing.diskSsd || pricing.disk) : pricing.disk;
    const ipPrice = includeIpv4 ? pricing.ipv4 : 0;
    const backupPrice = backup * (pricing.backup || 0);
    return (cpu * pricing.vcpu) + (ram * pricing.ram) + (disk * diskPrice) + ipPrice + backupPrice + bandwidthHourlyCost;
  };

  const calculateMonthlyPrice = () => {
    return calculateHourlyPrice() * 730;
  };

  const handleDeploy = () => {
    const targetUrl = "/dashboard/checkout";
    const serviceParam = serviceType === "K3S" ? "KUBERNETES" : "VPS";
    const ipv4Param = includeIpv4 ? '1' : '0';

    if (session) {
      router.push(`${targetUrl}?service=${serviceParam}&cpu=${cpu}&ram=${ram}&disk=${disk}&diskType=${diskType}&ipv4=${ipv4Param}&bandwidth=${bandwidth}`);
    } else {
      router.push(`/login?callbackUrl=${encodeURIComponent(`${targetUrl}?service=${serviceParam}&cpu=${cpu}&ram=${ram}&disk=${disk}&diskType=${diskType}&ipv4=${ipv4Param}&bandwidth=${bandwidth}`)}`);
    }
  };

  // Slider track color - uses theme-aware background for unfilled portion
  const sliderTrackBg = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";

  // Toggle button styles
  const toggleContainerClass = cn(
    "flex rounded-lg p-0.5 border",
    isDark ? "bg-cyan-950/40 border-cyan-500/20" : "bg-slate-100 border-slate-200"
  );
  const toggleActiveClass = isDark
    ? "bg-cyan-400 text-slate-950 font-semibold shadow-sm"
    : "bg-white text-slate-900 shadow-sm border border-slate-200";
  const toggleInactiveClass = isDark
    ? "text-zinc-400 hover:text-white"
    : "text-slate-500 hover:text-slate-700";

  return (
    <div className={cn(
      "border rounded-[2rem] p-4 sm:p-8 md:p-12 shadow-2xl relative overflow-hidden mx-2 sm:mx-0 transition-all",
      isDark ? "bg-[var(--surface)] border-[var(--border-primary)] shadow-2xl shadow-black/50" : "bg-white border-cyan-200 shadow-xl"
    )}>
      <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 relative z-10 items-start">

        {/* Sliders */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-8 lg:space-y-10">
          {/* CPU */}
          <div>
            <div className="flex justify-between items-center mb-3 md:mb-4">
              <label className={cn("text-base md:text-lg font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                <Cpu className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} /> CPU Cores
              </label>
              <span className={cn(
                "px-3 py-1 md:px-4 md:py-1.5 rounded-xl font-bold font-mono text-sm md:text-base border",
                isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700"
              )}>
                {cpu} vCPU
              </span>
            </div>
            <input
              type="range"
              min="1"
              max={currentMaxCpu}
              step="1"
              value={cpu}
              onChange={(e) => setCpu(parseInt(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-500 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-cyan-500 [&::-moz-range-thumb]:border-none hover:opacity-90 transition-opacity"
              style={{ background: `linear-gradient(to right, #06b6d4 ${((cpu - 1) / Math.max(1, currentMaxCpu - 1)) * 100}%, ${sliderTrackBg} ${((cpu - 1) / Math.max(1, currentMaxCpu - 1)) * 100}%)` }}
            />
          </div>

          {/* RAM */}
          <div>
            <div className="flex justify-between items-center mb-3 md:mb-4">
              <label className={cn("text-base md:text-lg font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                <MemoryStick className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} /> Memory (RAM)
              </label>
              <span className={cn(
                "px-3 py-1 md:px-4 md:py-1.5 rounded-xl font-bold font-mono text-sm md:text-base border",
                isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700"
              )}>
                {ram} GB
              </span>
            </div>
            <input
              type="range"
              min="1"
              max={currentMaxRam}
              step="1"
              value={ram}
              onChange={(e) => setRam(parseInt(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-500 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-cyan-500 [&::-moz-range-thumb]:border-none hover:opacity-90 transition-opacity"
              style={{ background: `linear-gradient(to right, #06b6d4 ${((ram - 1) / Math.max(1, currentMaxRam - 1)) * 100}%, ${sliderTrackBg} ${((ram - 1) / Math.max(1, currentMaxRam - 1)) * 100}%)` }}
            />
          </div>

          {/* Storage */}
          <div>
            <div className="flex justify-between items-center mb-3 md:mb-4 gap-2">
              <div className="flex items-center gap-2 md:gap-4">
                <label className={cn("text-base md:text-lg font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                  <HardDrive className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} /> Storage
                </label>
                <div className={toggleContainerClass}>
                  <button
                    onClick={() => setDiskType("HDD")}
                    className={cn("px-2 md:px-3 py-1 text-[10px] md:text-xs font-bold rounded-md transition-all", diskType === "HDD" ? toggleActiveClass : toggleInactiveClass)}
                  >
                    HDD
                  </button>
                  <button
                    onClick={() => setDiskType("SSD")}
                    className={cn("px-2 md:px-3 py-1 text-[10px] md:text-xs font-bold rounded-md transition-all", diskType === "SSD" ? toggleActiveClass : toggleInactiveClass)}
                  >
                    SSD
                  </button>
                </div>
              </div>
              <span className={cn(
                "px-3 py-1 md:px-4 md:py-1.5 rounded-xl font-bold font-mono text-sm md:text-base border shrink-0",
                isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700"
              )}>
                {disk} GB
              </span>
            </div>
            <input
              type="range"
              min="20"
              max={currentMaxDisk}
              step="5"
              value={disk}
              onChange={(e) => setDisk(parseInt(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-500 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-cyan-500 [&::-moz-range-thumb]:border-none hover:opacity-90 transition-opacity"
              style={{ background: `linear-gradient(to right, #06b6d4 ${((disk - 20) / Math.max(1, currentMaxDisk - 20)) * 100}%, ${sliderTrackBg} ${((disk - 20) / Math.max(1, currentMaxDisk - 20)) * 100}%)` }}
            />
          </div>

          {/* Backup */}
          <div>
            <div className="flex justify-between items-center mb-3 md:mb-4 gap-2">
              <label className={cn("text-base md:text-lg font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                <Database className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} /> Backup Storage
              </label>
              <div className={cn(
                "flex items-center gap-1 px-2 md:px-3 py-1 md:py-1.5 rounded-xl shrink-0 border",
                isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200"
              )}>
                <input
                  type="number"
                  min="0"
                  max={currentMaxBackup}
                  value={backup.toString()}
                  onChange={(e) => {
                    if (e.target.value === "") {
                      setBackup(0);
                    } else {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val >= 0) {
                        setBackup(Math.min(val, currentMaxBackup));
                      }
                    }
                  }}
                  className={cn(
                    "bg-transparent text-center font-bold text-sm md:text-base font-mono focus:outline-none p-0 border-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                    isDark ? "text-cyan-400" : "text-cyan-700"
                  )}
                  style={{ width: `${Math.max(1, backup.toString().length)}ch` }}
                />
                <span className={cn("font-bold text-sm md:text-base font-mono pr-0.5", isDark ? "text-cyan-400" : "text-cyan-700")}>GB</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max={currentMaxBackup}
              step="5"
              value={backup}
              onChange={(e) => setBackup(parseInt(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-500 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-cyan-500 [&::-moz-range-thumb]:border-none hover:opacity-90 transition-opacity"
              style={{ background: `linear-gradient(to right, #06b6d4 ${(backup / Math.max(1, currentMaxBackup)) * 100}%, ${sliderTrackBg} ${(backup / Math.max(1, currentMaxBackup)) * 100}%)` }}
            />
          </div>

          {/* IPv4 Toggle */}
          {serviceType === "VPS" && (
            <div>
              <div className="flex justify-between items-center mb-3 md:mb-4 gap-2">
                <div className="flex items-center gap-2 md:gap-4">
                  <label className={cn("text-base md:text-lg font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                    <Network className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} /> Public IPv4
                  </label>
                  <div className={toggleContainerClass}>
                    <button
                      onClick={() => setIncludeIpv4(false)}
                      className={cn("px-2 md:px-3 py-1 text-[10px] md:text-xs font-bold rounded-md transition-all", !includeIpv4 ? toggleActiveClass : toggleInactiveClass)}
                    >
                      NAT (None)
                    </button>
                    <button
                      onClick={() => setIncludeIpv4(true)}
                      className={cn("px-2 md:px-3 py-1 text-[10px] md:text-xs font-bold rounded-md transition-all", includeIpv4 ? toggleActiveClass : toggleInactiveClass)}
                    >
                      Included
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bandwidth Speed Slider */}
          <div>
            <div className="flex justify-between items-center mb-3 md:mb-4 gap-2">
              <label className={cn("text-base md:text-lg font-bold flex items-center gap-2 whitespace-nowrap shrink-0", isDark ? "text-white" : "text-slate-900")}>
                <Wifi className={cn("w-5 h-5 shrink-0", isDark ? "text-cyan-400" : "text-cyan-600")} /> Bandwidth Speed
              </label>
              <span className={cn(
                "px-3 py-1 md:px-4 md:py-1.5 rounded-xl font-bold font-mono text-sm md:text-base border shrink-0",
                isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700"
              )}>
                {bandwidth} Mbps
              </span>
            </div>
            <input
              type="range"
              min={minBandwidth}
              max={maxBandwidth}
              step="50"
              value={bandwidth}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                const closest = bandwidthOptions.reduce((prev, curr) =>
                  Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev, bandwidthOptions[0]
                );
                setBandwidth(closest);
              }}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-500 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-cyan-500 [&::-moz-range-thumb]:border-none hover:opacity-90 transition-opacity"
              style={{ background: `linear-gradient(to right, #06b6d4 ${((bandwidth - minBandwidth) / Math.max(1, maxBandwidth - minBandwidth)) * 100}%, ${sliderTrackBg} ${((bandwidth - minBandwidth) / Math.max(1, maxBandwidth - minBandwidth)) * 100}%)` }}
            />
            <div className="flex justify-between items-center text-[10px] sm:text-xs font-mono font-medium text-[var(--text-muted)] mt-1.5 px-0.5">
              <span>{minBandwidth} Mbps (Free)</span>
              <span>{maxBandwidth} Mbps Port</span>
            </div>
          </div>

          {/* Bandwidth Banner */}
          <div className="pt-2 lg:pt-4">
            <div className={cn(
              "p-4 rounded-2xl flex items-start sm:items-center gap-4 border transition-colors",
              isDark ? "bg-[var(--surface-secondary)] border-[var(--border-primary)]" : "bg-slate-50 border-slate-200"
            )}>
              <div className={cn(
                "w-12 h-12 rounded-xl border text-cyan-500 flex items-center justify-center shrink-0",
                isDark ? "bg-cyan-500/20 border-cyan-500/20" : "bg-cyan-50 border-cyan-200"
              )}>
                <Wifi className="w-6 h-6" />
              </div>
              <div>
                <h4 className={cn("font-bold text-sm md:text-base mb-1", isDark ? "text-white" : "text-slate-900")}>Unlimited Traffic Quota Included</h4>
                <p className={cn("text-xs md:text-sm leading-relaxed font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>All port speeds include unmetered traffic data transfer for your {serviceType === "K3S" ? "K3s" : "VPS"} workloads with zero bandwidth overage charges.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Summary */}
        <div className={cn(
          "lg:col-span-5 xl:col-span-4 border rounded-2xl md:rounded-[2rem] p-4 sm:p-6 md:p-8 flex flex-col relative overflow-hidden group shadow-xl h-fit lg:sticky lg:top-24",
          isDark ? "bg-[var(--surface-secondary)] border-[var(--border-primary)]" : "bg-slate-50 border-slate-200"
        )}>
          <div className="relative z-10">
            <h3 className={cn("text-lg md:text-xl font-black mb-4 sm:mb-5 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Estimated Cost</h3>

            <div className="space-y-3.5 mb-5 sm:mb-6 text-sm md:text-base font-medium">
              <div className={cn("flex justify-between gap-2 items-center", isDark ? "text-zinc-400" : "text-slate-500")}>
                <span className="whitespace-nowrap flex items-center"><Cpu className="w-4 h-4 mr-2 text-cyan-500" /> {cpu} vCPU</span>
                <span className={cn("text-right shrink-0 font-bold", isDark ? "text-white" : "text-slate-900")}>{formatRupiah(cpu * pricing.vcpu * 730)}/mo</span>
              </div>
              <div className={cn("flex justify-between gap-2 items-center", isDark ? "text-zinc-400" : "text-slate-500")}>
                <span className="whitespace-nowrap flex items-center"><MemoryStick className="w-4 h-4 mr-2 text-cyan-500" /> {ram} GB RAM</span>
                <span className={cn("text-right shrink-0 font-bold", isDark ? "text-white" : "text-slate-900")}>{formatRupiah(ram * pricing.ram * 730)}/mo</span>
              </div>
              <div className={cn("flex justify-between gap-2 items-center w-full", isDark ? "text-zinc-400" : "text-slate-500")}>
                <span className="flex items-center min-w-0 truncate flex-1"><HardDrive className="w-4 h-4 mr-2 text-cyan-500 shrink-0" /> <span className="truncate">{disk} GB {diskType}</span></span>
                <span className={cn("text-right shrink-0 font-bold pl-1", isDark ? "text-white" : "text-slate-900")}>{formatRupiah(disk * (diskType === "SSD" ? (pricing.diskSsd || pricing.disk) : pricing.disk) * 730)}/mo</span>
              </div>
              {backup > 0 && (
                <div className={cn("flex justify-between gap-2 items-center w-full", isDark ? "text-zinc-400" : "text-slate-500")}>
                  <span className="flex items-center min-w-0 truncate flex-1"><Database className="w-4 h-4 mr-2 text-cyan-500 shrink-0" /> <span className="truncate">{backup} GB Backup</span></span>
                  <span className={cn("text-right shrink-0 font-bold pl-1", isDark ? "text-white" : "text-slate-900")}>{formatRupiah(backup * (pricing.backup || 0) * 730)}/mo</span>
                </div>
              )}
              <div className={cn("flex justify-between gap-2 items-center", isDark ? "text-zinc-400" : "text-slate-500")}>
                <span className="whitespace-nowrap flex items-center"><ShieldCheck className="w-4 h-4 mr-2 text-cyan-500" /> {includeIpv4 ? "1x IPv4" : "NAT (No IPv4)"}</span>
                <span className={cn("text-right shrink-0 font-bold", isDark ? "text-white" : "text-slate-900")}>{formatRupiah((includeIpv4 ? pricing.ipv4 : 0) * 730)}/mo</span>
              </div>
              <div className={cn("flex justify-between gap-2 items-center", isDark ? "text-zinc-400" : "text-slate-500")}>
                <span className="whitespace-nowrap flex items-center"><Wifi className="w-4 h-4 mr-2 text-cyan-500" /> {bandwidth} Mbps Port</span>
                <span className={cn("text-right shrink-0 font-bold", isDark ? "text-white" : "text-slate-900")}>
                  {bandwidthHourlyCost > 0 ? `${formatRupiah(bandwidthHourlyCost * 730)}/mo` : "Included (Free)"}
                </span>
              </div>
            </div>

            <div className={cn("pt-5 border-t", isDark ? "border-white/10" : "border-slate-200")}>
              <div className="flex items-baseline flex-wrap gap-1 sm:gap-2 mb-1.5">
                <span className={cn("text-3xl sm:text-4xl font-black break-all sm:break-normal max-w-full tracking-tight", isDark ? "text-cyan-400" : "text-cyan-600")}>
                  {formatRupiah(calculateMonthlyPrice())}
                </span>
                <span className={cn("text-sm font-bold tracking-widest uppercase", isDark ? "text-zinc-500" : "text-slate-400")}>/MO</span>
              </div>
              <p className={cn("text-xs font-medium mb-3.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                Or {formatRupiah(calculateHourlyPrice())}/hour (Pay-As-You-Go)
              </p>

              <div className={cn("rounded-xl p-3 sm:p-3.5 text-[10px] sm:text-xs leading-relaxed shadow-sm border", isDark ? "bg-cyan-950/30 border-cyan-500/20 text-zinc-300" : "bg-cyan-50 border-cyan-200 text-slate-600")}>
                <p className="mb-1.5"><span className={cn("font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>Free VPC:</span> Virtual Private Cloud (VPC) feature is available for free with no additional charges.</p>
                <p><span className={cn("font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>Billing Policy:</span> Similar to global cloud providers, Storage, Backup Storage, and Reserved IPs are billed per hour even when your instance is Shutdown/Stopped or the IP is unused, as the resources are still allocated to your account.</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleDeploy}
            disabled={loading || isDisabled}
            className={cn(
              "w-full px-7 py-3.5 mt-5 sm:mt-6 rounded-xl font-semibold flex items-center justify-center gap-2.5 transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 cursor-pointer",
              isDisabled
                ? (isDark ? "bg-white/5 text-zinc-500 border border-white/10 cursor-not-allowed" : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed")
                : "bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm",
              loading && !isDisabled && "opacity-70 cursor-not-allowed"
            )}
          >
            <span className="relative z-10 flex items-center gap-2 tracking-wide font-semibold">
              {!isDisabled && <Rocket className="w-5 h-5 group-hover:-translate-y-1.5 group-hover:translate-x-1.5 transition-transform duration-300" />}
              {isDisabled ? "Coming Soon" : loading ? "Loading..." : "Deploy Now"}
            </span>
          </button>

          {/* Infrastructure Brands: MikroTik, Juniper, Dell */}
          <EnterpriseInfraSidebarCard className="mt-4" />
        </div>
      </div>
    </div>
  );
}
