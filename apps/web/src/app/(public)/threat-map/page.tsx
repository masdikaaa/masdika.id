"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  Globe,
  Radio,
  Zap,
  Crosshair,
  Activity,
  Flame,
  ShieldCheck,
  Terminal,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  Lock,
  Server,
  AlertTriangle,
  Play,
  Pause,
  MapPin,
  CheckCircle2,
  Clock,
  Compass
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HeroAvatarFrame } from "@/components/ui/HeroAvatarFrame";
import { TiltCard } from "@/components/animations/TiltCard";
import { cn } from "@/lib/utils";

interface AttackEvent {
  id: string;
  timestamp: string;
  attackName: string;
  sourceCity: string;
  sourceCountry: string;
  sourceCode: string;
  sourceFlag: string;
  sourceIp: string;
  sourceCoords: [number, number];
  targetCity: string;
  targetCountry: string;
  targetCode: string;
  targetFlag: string;
  targetCoords: [number, number];
  severity: 'Critical' | 'High' | 'Medium';
  protocol: 'TCP' | 'UDP' | 'HTTPS' | 'SSH';
  port: number;
  mitigation: string;
  isReal?: boolean;
}

interface ActiveLaser {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cx: number;
  cy: number;
  progress: number;
  color: string;
  severity: string;
  sourceCity: string;
  attackName: string;
  isReal?: boolean;
  sourceIp?: string;
}

interface ImpactWave {
  id: string;
  x: number;
  y: number;
  color: string;
  radius: number;
  opacity: number;
}

// Coordinate projection helper: converts [lat, lng] to SVG canvas coordinates [x, y] in viewBox 0 0 1000 500
function projectCoords(lat: number, lng: number, mode: 'world' | 'indonesia'): [number, number] {
  if (mode === 'indonesia') {
    // Focused on Indonesian archipelago roughly Lat -11 to 6, Lng 95 to 141
    const x = ((lng - 95) / (141 - 95)) * 1000;
    const y = ((6 - lat) / (6 - -11)) * 500;
    return [Math.max(15, Math.min(985, x)), Math.max(15, Math.min(485, y))];
  }

  // Equirectangular projection for world
  const x = ((lng + 180) / 360) * 1000;
  const y = ((90 - lat) / 180) * 500;
  return [Math.max(10, Math.min(990, x)), Math.max(10, Math.min(490, y))];
}

export default function ThreatMapPage() {
  const [region, setRegion] = useState<'indonesia' | 'world'>('indonesia');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);
  const [currentTime, setCurrentTime] = useState("");
  const [attacks, setAttacks] = useState<AttackEvent[]>([]);
  const [lasers, setLasers] = useState<ActiveLaser[]>([]);
  const [impacts, setImpacts] = useState<ImpactWave[]>([]);
  const [stats, setStats] = useState({
    attacksPerSecond: 14,
    blockedIn24h: 853490,
    activeOutbreaks: 142,
    realIncidentsCount: 0,
    threatPosture: 'Normal / Protected',
    edgeStatus: '100% Mitigated / Zero Breaches',
  });
  const [topThreats, setTopThreats] = useState<any[]>([]);
  const [targetedIndustries, setTargetedIndustries] = useState<any[]>([]);
  const [selectedAttack, setSelectedAttack] = useState<AttackEvent | null>(null);

  // Live real-time clock (UTC and Asia/Jakarta WIB)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      };
      setCurrentTime(`${now.toLocaleTimeString("id-ID", options)} WIB (UTC+7)`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fire laser animation helper with special highlight for real attacks
  const spawnLaser = (atk: AttackEvent) => {
    const [x1, y1] = projectCoords(atk.sourceCoords[0], atk.sourceCoords[1], region);
    const [x2, y2] = projectCoords(atk.targetCoords[0], atk.targetCoords[1], region);

    // Create a high-altitude control point for quadratic bezier curve
    const midX = (x1 + x2) / 2;
    const midY = Math.min(y1, y2) - (region === 'indonesia' ? 70 : 110);

    const color = atk.isReal
      ? '#ff0055' // Super intense neon red for real attacks!
      : atk.severity === 'Critical'
      ? '#ff2a6d'
      : atk.severity === 'High'
      ? '#ff9f1c'
      : '#05d9e8';

    const newLaser: ActiveLaser = {
      id: atk.id,
      x1,
      y1,
      x2,
      y2,
      cx: midX,
      cy: midY,
      progress: 0,
      color,
      severity: atk.severity,
      sourceCity: atk.sourceCity,
      attackName: atk.attackName,
      isReal: atk.isReal,
      sourceIp: atk.sourceIp,
    };

    setLasers(prev => [...prev.slice(-18), newLaser]);
  };

  // Initial data fetch from /api/threats
  useEffect(() => {
    fetch('/api/threats?count=20')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setAttacks(data.events || []);
          setStats(data.stats);
          setTopThreats(data.topThreats || []);
          setTargetedIndustries(data.targetedIndustries || []);

          // Spawn lasers for initial real attacks so user immediately sees them!
          const realOnes = (data.events || []).filter((e: AttackEvent) => e.isReal);
          if (realOnes.length > 0) {
            realOnes.slice(0, 3).forEach((atk: AttackEvent, idx: number) => {
              setTimeout(() => spawnLaser(atk), idx * 600);
            });
          }
        }
      })
      .catch(err => console.error("Error fetching threat data:", err));
  }, [region]);

  // Continuous animation loop for laser beams & impact shockwaves
  useEffect(() => {
    let animFrame: number;
    const animate = () => {
      setLasers(prevLasers => {
        const nextLasers: ActiveLaser[] = [];
        for (const laser of prevLasers) {
          const nextProgress = laser.progress + (laser.isReal ? 0.045 : 0.035);
          if (nextProgress >= 1) {
            // Impact! Trigger shockwave
            setImpacts(prev => [
              ...prev.slice(-15),
              {
                id: `impact-${Date.now()}-${Math.random()}`,
                x: laser.x2,
                y: laser.y2,
                color: laser.color,
                radius: laser.isReal ? 8 : 4,
                opacity: 1,
              },
              ...(laser.isReal ? [{
                id: `impact-gold-${Date.now()}`,
                x: laser.x2,
                y: laser.y2,
                color: '#ffcc00',
                radius: 2,
                opacity: 0.9,
              }] : [])
            ]);
          } else {
            nextLasers.push({ ...laser, progress: nextProgress });
          }
        }
        return nextLasers;
      });

      // Expand & fade impact shockwaves
      setImpacts(prevImpacts =>
        prevImpacts
          .map(imp => ({
            ...imp,
            radius: imp.radius + 1.4,
            opacity: imp.opacity - 0.03,
          }))
          .filter(imp => imp.opacity > 0)
      );

      animFrame = requestAnimationFrame(animate);
    };

    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, [region]);

  // Real-time attack feed simulator / stream
  useEffect(() => {
    if (!isLiveStreaming) return;

    const streamInterval = setInterval(() => {
      fetch('/api/threats?count=1')
        .then(res => res.json())
        .then(data => {
          if (data.events && data.events.length > 0) {
            const newAtk: AttackEvent = data.events[0];
            setAttacks(prev => {
              // Ensure real events always stay on top
              const exists = prev.some(p => p.id === newAtk.id);
              if (exists) return prev;
              return [newAtk, ...prev.slice(0, 35)];
            });
            spawnLaser(newAtk);

            // Increment stats slightly to reflect live traffic
            setStats(prev => ({
              ...prev,
              attacksPerSecond: Math.floor(Math.random() * 8) + 12,
              blockedIn24h: prev.blockedIn24h + 1,
            }));
          }
        })
        .catch(() => {});
    }, 1800);

    return () => clearInterval(streamInterval);
  }, [isLiveStreaming, region]);

  // Filtered attacks list
  const filteredAttacks = useMemo(() => {
    if (filterSeverity === 'all') return attacks;
    return attacks.filter(a => a.severity.toLowerCase() === filterSeverity.toLowerCase());
  }, [attacks, filterSeverity]);

  return (
    <div className="flex flex-col min-h-screen pt-24 md:pt-32 pb-20 lg:pb-28 font-sans bg-[#020706] text-[#e0f7f3] selection:bg-emerald-500/30 selection:text-emerald-300">
      <main className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1">

        {/* ── 0. HERO SECTION (Identical to Contact, Looking Glass & VPS) ── */}
        <section className="relative pt-6 sm:pt-10 pb-12 lg:pb-16 flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-8 items-center w-full">

            {/* Left Column: Headline & Actions */}
            <div className="max-w-2xl relative z-30">
              <div className="mb-6">
                <Badge variant="brand" dot dotColor="bg-emerald-400" size="md" className="font-mono uppercase bg-emerald-950/60 text-emerald-300 border-emerald-500/30">
                  CYBER THREAT RADAR &amp; TELEMETRY
                </Badge>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-[70px] font-black tracking-tight leading-[1.05] mb-4 text-white">
                Live Cyber Threat &amp; <br />
                <span className="bg-gradient-to-r from-emerald-400 via-cyan-300 to-teal-100 bg-clip-text text-transparent">
                  Attack Radar Map.
                </span>
              </h1>

              <p className="text-lg md:text-xl mb-8 max-w-xl leading-relaxed text-emerald-100/70 font-normal">
                Visualizing incoming exploit probes, DDoS vectors, and real-world attack incidents mitigated across our Sidoarjo Edge Datacenter and tier-1 BGP backbones.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href="#threat-radar"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25 border-emerald-400"
                >
                  Inspect Live Radar
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href="/lg"
                  leftIcon={<Compass className="w-4 h-4 text-emerald-400" />}
                  className="border-emerald-500/30 hover:border-emerald-400/60 bg-[#061813] text-emerald-200"
                >
                  Network Looking Glass
                </Button>
              </div>
            </div>

            {/* Right Column: Hero Mascot with 4 Floating Badges */}
            <div className="relative flex items-center justify-center mt-6 lg:mt-0">
              <HeroAvatarFrame
                imageSrc="/images/mascots/threat-map.webp"
                imageAlt="Masdika Live Cyber Threat Map Mascot"
                imageWidth={1536}
                imageHeight={1024}
                badges={[
                  { icon: ShieldCheck, label: "Edge Mitigation", value: "100% WAF Mitigated" },
                  { icon: Radio, label: "Real-time Telemetry", value: "AS63859 Edge Radar" },
                  { icon: Zap, label: "Active Defense", value: "Layer 3/4 & 7 Shields" },
                  { icon: Server, label: "Primary Datacenter", value: "Sidoarjo, ID" },
                ]}
              />
            </div>

          </div>
        </section>

        {/* ── 1. FORTIGUARD-STYLE LIVE RADAR COCKPIT ─────────────── */}
        <section id="threat-radar" className="scroll-mt-28">
          
          {/* Cockpit HUD Header Bar */}
          <div className="rounded-t-2xl sm:rounded-t-3xl border border-emerald-500/30 bg-[#051410]/95 backdrop-blur-md p-4 sm:p-6 shadow-2xl relative overflow-hidden">
            {/* Ambient matrix top line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-cyan-400 to-emerald-500 animate-pulse" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              
              {/* Left Title & Status Pill */}
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                  <ShieldAlert className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Masdika Threat Labs
                    </span>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    Global Attack Radar
                    <span className="text-xs font-normal text-emerald-300/60 font-mono">({currentTime})</span>
                  </h2>
                </div>
              </div>

              {/* Center / Right: Live Counters & Region Toggles */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                
                {/* Verified Real Attacks Badge */}
                {stats.realIncidentsCount > 0 && (
                  <div className="px-3.5 py-1.5 rounded-xl border border-rose-500/50 bg-rose-950/40 flex items-center gap-2 shadow-lg shadow-rose-950/50 animate-pulse">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-mono uppercase text-rose-300 font-bold">VERIFIED MASDIKA ATTACKS</span>
                      <span className="text-xs font-mono font-black text-white">{stats.realIncidentsCount} INCIDENTS LOGGED</span>
                    </div>
                  </div>
                )}

                {/* Attack Rate Widget */}
                <div className="px-4 py-2 rounded-xl border border-emerald-500/20 bg-[#020b08]/80 flex flex-col items-center">
                  <span className="text-[10px] font-mono uppercase text-emerald-400/80 font-bold">ATTACKS / SEC</span>
                  <span className="text-lg sm:text-xl font-mono font-black text-cyan-300 flex items-center gap-1">
                    <Zap className="w-4 h-4 text-cyan-400 animate-bounce" />
                    {stats.attacksPerSecond}
                  </span>
                </div>

                {/* Blocked in 24h Widget */}
                <div className="px-4 py-2 rounded-xl border border-emerald-500/20 bg-[#020b08]/80 flex flex-col items-center">
                  <span className="text-[10px] font-mono uppercase text-emerald-400/80 font-bold">BLOCKED IN 24H</span>
                  <span className="text-lg sm:text-xl font-mono font-black text-emerald-300">
                    {stats.blockedIn24h.toLocaleString()}
                  </span>
                </div>

                {/* Region Switcher Buttons */}
                <div className="flex items-center p-1 rounded-xl border border-emerald-500/30 bg-[#020b08]">
                  <button
                    type="button"
                    onClick={() => setRegion('indonesia')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                      region === 'indonesia'
                        ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                        : "text-emerald-300 hover:text-white"
                    )}
                  >
                    <span>🇮🇩</span> Indonesia Focus
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegion('world')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                      region === 'world'
                        ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                        : "text-emerald-300 hover:text-white"
                    )}
                  >
                    <Globe className="w-3.5 h-3.5" /> Worldwide
                  </button>
                </div>

                {/* Live Pause/Resume Button */}
                <button
                  type="button"
                  onClick={() => setIsLiveStreaming(prev => !prev)}
                  title={isLiveStreaming ? "Pause radar stream" : "Resume radar stream"}
                  className="p-2 rounded-xl border border-emerald-500/30 bg-[#020b08] text-emerald-400 hover:text-emerald-200 transition-colors"
                >
                  {isLiveStreaming ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>

              </div>
            </div>
          </div>

          {/* Radar Main Grid (Map + Sidebars) */}
          <div className="border-x border-b border-emerald-500/30 bg-[#020a07] relative overflow-hidden">
            
            {/* Background High-Tech Grid & Scanline */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#00ff8808_1px,transparent_1px),linear-gradient(to_bottom,#00ff8808_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_60%,#020706_100%)] pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 relative z-10">
              
              {/* Map Canvas Visualizer (8 Cols) */}
              <div className="lg:col-span-8 p-4 sm:p-6 lg:border-r border-b lg:border-b-0 border-emerald-500/20 flex flex-col justify-between min-h-[480px] sm:min-h-[580px] relative">
                
                {/* HUD Overlay Badges */}
                <div className="absolute top-6 left-6 z-20 flex items-center gap-2">
                  <div className="px-3 py-1 rounded-full bg-[#03150e]/90 border border-emerald-500/40 text-xs font-mono font-bold text-emerald-300 flex items-center gap-1.5 shadow-lg">
                    <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span>RADAR ACTIVE</span>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-[#03150e]/90 border border-cyan-500/40 text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5 shadow-lg">
                    <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                    <span>TARGET: SIDOARJO EDGE DC</span>
                  </div>
                </div>

                {/* SVG Tactical Vector Map */}
                <div className="w-full h-full flex items-center justify-center relative">
                  <svg
                    viewBox="0 0 1000 500"
                    className="w-full h-auto max-h-[520px] drop-shadow-[0_0_20px_rgba(0,255,136,0.15)] select-none"
                  >
                    <defs>
                      {/* Glow Filters */}
                      <filter id="laser-glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3.5" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>

                      <radialGradient id="target-beacon" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#00ff88" stopOpacity="0.8" />
                        <stop offset="50%" stopColor="#00e5ff" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#020a07" stopOpacity="0" />
                      </radialGradient>
                    </defs>

                    {/* Radar sweep circles */}
                    <circle cx="500" cy="250" r="120" fill="none" stroke="#00ff88" strokeWidth="0.5" strokeDasharray="3,3" opacity="0.25" />
                    <circle cx="500" cy="250" r="220" fill="none" stroke="#00ff88" strokeWidth="0.5" strokeDasharray="4,4" opacity="0.2" />
                    <circle cx="500" cy="250" r="320" fill="none" stroke="#00ff88" strokeWidth="0.5" strokeDasharray="5,5" opacity="0.15" />

                    {/* Vector Map Outlines */}
                    {region === 'indonesia' ? (
                      /* Detailed stylized Indonesian Archipelago */
                      <g className="transition-all duration-700 ease-in-out">
                        {/* Sumatra */}
                        <path
                          d="M 120,180 Q 180,240 240,300 L 260,330 L 230,340 L 160,260 L 90,170 Z"
                          fill="#062218"
                          stroke="#00ff88"
                          strokeWidth="1.5"
                          opacity="0.85"
                          className="hover:fill-emerald-800/40 transition-colors"
                        />
                        {/* Java (Home of Sidoarjo Datacenter Hub) */}
                        <path
                          d="M 270,350 L 360,360 L 460,370 L 530,370 L 540,380 L 440,385 L 340,375 L 260,360 Z"
                          fill="#093826"
                          stroke="#00ff88"
                          strokeWidth="2"
                          opacity="0.95"
                          className="hover:fill-emerald-700/50 transition-colors"
                        />
                        {/* Bali & Nusa Tenggara */}
                        <path
                          d="M 550,375 L 570,376 L 620,380 L 680,380 L 670,390 L 610,388 L 545,382 Z"
                          fill="#062218"
                          stroke="#00ff88"
                          strokeWidth="1.5"
                          opacity="0.8"
                        />
                        {/* Kalimantan (Borneo) */}
                        <path
                          d="M 330,190 L 420,180 L 450,230 L 420,290 L 340,280 L 310,230 Z"
                          fill="#062218"
                          stroke="#00ff88"
                          strokeWidth="1.5"
                          opacity="0.85"
                        />
                        {/* Sulawesi */}
                        <path
                          d="M 480,200 L 530,220 L 500,260 L 540,300 L 510,310 L 470,260 L 490,230 Z"
                          fill="#062218"
                          stroke="#00ff88"
                          strokeWidth="1.5"
                          opacity="0.85"
                        />
                        {/* Maluku */}
                        <path
                          d="M 580,240 L 620,260 L 610,310 L 570,290 Z"
                          fill="#062218"
                          stroke="#00ff88"
                          strokeWidth="1.2"
                          opacity="0.75"
                        />
                        {/* Papua */}
                        <path
                          d="M 690,260 Q 770,240 850,260 L 860,340 L 760,340 L 710,300 Z"
                          fill="#062218"
                          stroke="#00ff88"
                          strokeWidth="1.5"
                          opacity="0.85"
                        />

                        {/* Indonesia Labels & Target Beacons */}
                        {/* Sidoarjo Datacenter Hub Beacon */}
                        <g transform="translate(480, 372)">
                          <circle r="24" fill="url(#target-beacon)" className="animate-ping" opacity="0.7" />
                          <circle r="12" fill="#00ff88" opacity="0.3" />
                          <circle r="5" fill="#00ff88" stroke="#ffffff" strokeWidth="1.5" />
                          <text x="12" y="-8" fill="#00ff88" fontSize="11" fontWeight="bold" fontFamily="monospace">
                            Sidoarjo Edge DC 🇮🇩
                          </text>
                          <text x="12" y="6" fill="#00e5ff" fontSize="9" fontFamily="monospace">
                            AS63859 [PRIMARY HUB]
                          </text>
                        </g>

                        {/* Jakarta Core Gateway */}
                        <g transform="translate(290, 355)">
                          <circle r="4" fill="#00e5ff" stroke="#ffffff" strokeWidth="1" />
                          <text x="-90" y="-8" fill="#a7f3d0" fontSize="10" fontFamily="monospace">
                            Jakarta Core 🇮🇩
                          </text>
                        </g>

                        {/* Semarang Transit Node */}
                        <g transform="translate(410, 365)">
                          <circle r="3.5" fill="#00e5ff" />
                          <text x="-40" y="16" fill="#a7f3d0" fontSize="9" fontFamily="monospace">
                            Semarang Node 🇮🇩
                          </text>
                        </g>
                      </g>
                    ) : (
                      /* Global Continents View */
                      <g className="transition-all duration-700 ease-in-out">
                        {/* North America */}
                        <path
                          d="M 100,100 L 250,90 L 280,180 L 210,240 L 150,180 Z"
                          fill="#062218"
                          stroke="#00ff88"
                          strokeWidth="1.2"
                          opacity="0.75"
                        />
                        {/* South America */}
                        <path
                          d="M 260,260 L 340,280 L 320,410 L 260,370 Z"
                          fill="#062218"
                          stroke="#00ff88"
                          strokeWidth="1.2"
                          opacity="0.75"
                        />
                        {/* Europe */}
                        <path
                          d="M 440,110 L 520,100 L 530,170 L 450,170 Z"
                          fill="#062218"
                          stroke="#00ff88"
                          strokeWidth="1.2"
                          opacity="0.75"
                        />
                        {/* Africa */}
                        <path
                          d="M 450,190 L 550,190 L 520,340 L 460,280 Z"
                          fill="#062218"
                          stroke="#00ff88"
                          strokeWidth="1.2"
                          opacity="0.75"
                        />
                        {/* Asia */}
                        <path
                          d="M 540,80 L 820,90 L 800,240 L 650,240 L 540,170 Z"
                          fill="#062218"
                          stroke="#00ff88"
                          strokeWidth="1.2"
                          opacity="0.75"
                        />
                        {/* Australia */}
                        <path
                          d="M 780,330 L 890,340 L 860,430 L 780,410 Z"
                          fill="#062218"
                          stroke="#00ff88"
                          strokeWidth="1.2"
                          opacity="0.75"
                        />
                        {/* Target Node: Indonesia */}
                        <g transform="translate(730, 275)">
                          <circle r="20" fill="url(#target-beacon)" className="animate-ping" opacity="0.8" />
                          <circle r="6" fill="#00ff88" stroke="#ffffff" strokeWidth="1.5" />
                          <text x="12" y="-6" fill="#00ff88" fontSize="10" fontWeight="bold" fontFamily="monospace">
                            Masdika Edge ID 🇮🇩
                          </text>
                        </g>
                      </g>
                    )}

                    {/* Animated Laser Beams (Bezier Arcs) */}
                    {lasers.map(laser => {
                      // Quadratic bezier interpolation: B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
                      const t = laser.progress;
                      const currentX = (1 - t) * (1 - t) * laser.x1 + 2 * (1 - t) * t * laser.cx + t * t * laser.x2;
                      const currentY = (1 - t) * (1 - t) * laser.y1 + 2 * (1 - t) * t * laser.cy + t * t * laser.y2;

                      return (
                        <g key={laser.id} filter="url(#laser-glow)">
                          {/* Laser Trajectory Path (Dotted Arc) */}
                          <path
                            d={`M ${laser.x1},${laser.y1} Q ${laser.cx},${laser.cy} ${laser.x2},${laser.y2}`}
                            fill="none"
                            stroke={laser.color}
                            strokeWidth={laser.isReal ? "3" : "1.2"}
                            strokeDasharray={laser.isReal ? "6,3" : "4,4"}
                            opacity={laser.isReal ? "0.9" : "0.35"}
                          />

                          {/* Source Beacon Dot */}
                          <circle cx={laser.x1} cy={laser.y1} r={laser.isReal ? "5" : "3"} fill={laser.color} opacity="0.9" />

                          {/* Laser Head Projectile */}
                          <circle cx={currentX} cy={currentY} r={laser.isReal ? "6" : "4"} fill="#ffffff" stroke={laser.color} strokeWidth={laser.isReal ? "3" : "2"} />

                          {/* Glowing Comet Tail */}
                          <circle cx={currentX} cy={currentY} r={laser.isReal ? "14" : "8"} fill={laser.color} opacity={laser.isReal ? "0.6" : "0.4"} />

                          {/* Real Attack HUD Floating Label */}
                          {laser.isReal && (
                            <g transform={`translate(${currentX}, ${currentY - 20})`}>
                              <rect x="-85" y="-12" width="170" height="20" rx="4" fill="#ff0055" opacity="0.9" stroke="#ffffff" strokeWidth="1" />
                              <text x="0" y="2" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="monospace">
                                🚨 LIVE ATTACK: {laser.sourceCity}
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })}

                    {/* Impact Shockwaves on Target Hit */}
                    {impacts.map(impact => (
                      <circle
                        key={impact.id}
                        cx={impact.x}
                        cy={impact.y}
                        r={impact.radius}
                        fill="none"
                        stroke={impact.color}
                        strokeWidth="2.5"
                        opacity={impact.opacity}
                      />
                    ))}
                  </svg>
                </div>

                {/* Legend Bar Bottom */}
                <div className="pt-4 border-t border-emerald-500/20 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                      Verified Real Attack (Live DB/Sensor)
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      Target (Masdika Sidoarjo Edge)
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      High / DDoS Vector
                    </span>
                  </div>

                  <div className="text-emerald-400/70">
                    Live Telemetry: Sidoarjo Edge Datacenter (AS63859)
                  </div>
                </div>

              </div>

              {/* Right Sidebars: Top Threats & Targeted Industries (4 Cols) */}
              <div className="lg:col-span-4 p-4 sm:p-6 bg-[#030e0a]/90 space-y-6">
                
                {/* Top Threats Widget */}
                <div>
                  <div className="flex items-center justify-between mb-3 border-b border-emerald-500/20 pb-2">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-rose-400" />
                      Top Threats (Last 24h)
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400/60">Indonesia</span>
                  </div>

                  <div className="space-y-2.5">
                    {topThreats.map((threat, idx) => (
                      <div key={idx} className="group cursor-default">
                        <div className="flex items-center justify-between text-xs font-mono mb-1">
                          <span className="truncate max-w-[200px] text-emerald-200 group-hover:text-emerald-400 transition-colors">
                            {threat.name}
                          </span>
                          <span className="font-bold text-cyan-300 shrink-0 ml-2">
                            {threat.count}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-emerald-950/60 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              idx === 0
                                ? "bg-gradient-to-r from-rose-500 to-amber-400"
                                : "bg-gradient-to-r from-emerald-500 to-cyan-400"
                            )}
                            style={{ width: `${threat.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Targeted Industries */}
                <div>
                  <div className="flex items-center justify-between mb-3 border-b border-emerald-500/20 pb-2">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      Top Targeted Industries
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400/60">Indonesia</span>
                  </div>

                  <div className="space-y-2.5">
                    {targetedIndustries.map((ind, idx) => (
                      <div key={idx} className="group cursor-default">
                        <div className="flex items-center justify-between text-xs font-mono mb-1">
                          <span className="truncate max-w-[200px] text-emerald-200 group-hover:text-emerald-400 transition-colors">
                            {ind.name}
                          </span>
                          <span className="font-bold text-emerald-300 shrink-0 ml-2">
                            {ind.count}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-emerald-950/60 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
                            style={{ width: `${ind.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>

            {/* Bottom Real-Time Attack Feed Ticker (Terminal Style) */}
            <div className="border-t border-emerald-500/30 p-4 sm:p-6 bg-[#010805]">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
                    REAL-TIME ATTACK STREAM &amp; PROBES
                  </span>
                  <span className="text-xs font-mono text-emerald-400/50">
                    (Auto-mitigated by Masdika Shield)
                  </span>
                </div>

                {/* Severity Filter Pills */}
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-emerald-400/60">Filter:</span>
                  {['all', 'critical', 'high', 'medium'].map(sev => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setFilterSeverity(sev)}
                      className={cn(
                        "px-2.5 py-1 rounded-md uppercase font-bold text-[10px] transition-all",
                        filterSeverity === sev
                          ? "bg-emerald-500 text-slate-950 shadow-sm"
                          : "border border-emerald-500/20 text-emerald-400/80 hover:text-white"
                      )}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Streaming Table */}
              <div className="overflow-x-auto rounded-xl border border-emerald-500/20 bg-[#020a07]">
                <table className="w-full text-left font-mono text-xs text-emerald-200">
                  <thead className="bg-[#04160f] text-[10px] uppercase font-bold tracking-wider text-emerald-400 border-b border-emerald-500/20">
                    <tr>
                      <th className="py-2.5 px-4">Time</th>
                      <th className="py-2.5 px-4">Threat Vector / CVE Exploit</th>
                      <th className="py-2.5 px-4">Source Location &amp; IP</th>
                      <th className="py-2.5 px-4">Target Node</th>
                      <th className="py-2.5 px-4">Severity</th>
                      <th className="py-2.5 px-4">Mitigation Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-500/10">
                    <AnimatePresence initial={false}>
                      {filteredAttacks.slice(0, 10).map((atk) => (
                        <motion.tr
                          key={atk.id}
                          initial={{ opacity: 0, y: -10, backgroundColor: atk.isReal ? 'rgba(255, 0, 85, 0.25)' : 'rgba(0, 255, 136, 0.15)' }}
                          animate={{ opacity: 1, y: 0, backgroundColor: atk.isReal ? 'rgba(255, 0, 85, 0.08)' : 'transparent' }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.4 }}
                          className={cn(
                            "transition-colors",
                            atk.isReal ? "bg-rose-950/20 hover:bg-rose-950/40 border-l-2 border-rose-500" : "hover:bg-emerald-950/30"
                          )}
                        >
                          <td className="py-2.5 px-4 text-emerald-400/70 whitespace-nowrap">
                            {atk.timestamp}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-white whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {atk.isReal && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-rose-500 text-white animate-pulse shadow-sm shadow-rose-500/50">
                                  VERIFIED ATTACK
                                </span>
                              )}
                              <span>{atk.attackName}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="flex items-center gap-1.5 font-bold">
                                <span>{atk.sourceFlag}</span>
                                <span className={atk.isReal ? "text-rose-300 font-bold" : "text-emerald-100"}>{atk.sourceCity}</span>
                                <span className="text-emerald-400/60 text-[10px]">({atk.sourceCode})</span>
                              </span>
                              {atk.sourceIp && (
                                <span className="text-[10px] text-cyan-400/90 font-mono">
                                  IP: {atk.sourceIp}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <span className="flex items-center gap-1.5 text-cyan-300">
                              <span>{atk.targetFlag}</span>
                              <span>{atk.targetCity}</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                atk.severity === 'Critical'
                                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                  : atk.severity === 'High'
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                              )}
                            >
                              {atk.severity}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[11px] font-medium">{atk.mitigation}</span>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

            </div>

          </div>

        </section>

        {/* ── 2. ARCHITECTURE & MULTI-LAYER MITIGATION SUITE ──────── */}
        <section className="pt-16 sm:pt-20">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400 mb-3 block">
              ENTERPRISE ATTACK RESISTANCE
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.15] mb-4">
              Bank-Grade Infrastructure Defense
            </h2>
            <p className="text-base sm:text-lg text-emerald-100/70 font-normal leading-relaxed">
              Every packet entering our Sidoarjo Edge and upstream connections is filtered through multiple autonomous defense tiers before reaching your instances.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1: Edge BGP Volumetric DDoS Filtering */}
            <TiltCard intensity={5} className="p-6 sm:p-8 rounded-2xl border border-emerald-500/20 bg-[#04130e] relative overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-6">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Volumetric DDoS Scrubbing
              </h3>
              <p className="text-sm text-emerald-100/70 leading-relaxed mb-6">
                Multi-Tbps Anycast global scrubbing centers intercept UDP amplification, SYN floods, and DNS reflection attacks before they can touch upstream peering lines.
              </p>
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Zero Downtime SLA</span>
              </div>
            </TiltCard>

            {/* Card 2: L7 Application Shield & WAF */}
            <TiltCard intensity={5} className="p-6 sm:p-8 rounded-2xl border border-emerald-500/20 bg-[#04130e] relative overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-6">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Intelligent Layer-7 WAF
              </h3>
              <p className="text-sm text-emerald-100/70 leading-relaxed mb-6">
                Automated rate-limiting, OWASP Top 10 rule enforcement, and real-time behavioral fingerprinting to block credential stuffing and malicious path crawlers.
              </p>
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Traefik &amp; Cloudflare Hardened</span>
              </div>
            </TiltCard>

            {/* Card 3: Host Privilege & Promtail Audit */}
            <TiltCard intensity={5} className="p-6 sm:p-8 rounded-2xl border border-emerald-500/20 bg-[#04130e] relative overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                Host Privilege &amp; Sudo Auditing
              </h3>
              <p className="text-sm text-emerald-100/70 leading-relaxed mb-6">
                Promtail and Loki stream host authentication logs continuously. Unauthorized root escalation and brute-force attempts trigger instant automated IP blacklisting.
              </p>
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
                <Activity className="w-4 h-4" />
                <span>Prometheus SOC Integration</span>
              </div>
            </TiltCard>

          </div>
        </section>

      </main>
    </div>
  );
}
