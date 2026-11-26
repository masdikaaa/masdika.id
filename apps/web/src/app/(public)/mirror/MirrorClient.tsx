"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cloud,
  Copy,
  Disc,
  Download,
  ExternalLink,
  FolderOpen,
  GitCompareArrows,
  HardDrive,
  KeyRound,
  Layers,
  Lock,
  PackageCheck,
  RefreshCw,
  RotateCw,
  Server,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import type { MirrorStatusPayload } from "@/app/api/mirror/status/route";
import { SiMikrotik } from "react-icons/si";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FaqSection } from "@/components/ui/FaqSection";
import { HeroAvatarFrame } from "@/components/ui/HeroAvatarFrame";
import { GlowCtaCard } from "@/components/ui/GlowCtaCard";

const MIRROR_BASE = "https://mirror.masdika.id";

type DistroCategory = "ALL" | "DEBIAN_UBUNTU" | "RHEL" | "ROLLING_BSD" | "SECURITY";

interface DistroItem {
  id: string;
  name: string;
  pkgMgr: string;
  category: Exclude<DistroCategory, "ALL">;
  sub: string;
  paths: string[];
  isoPath: string;
  snippet: string;
}

const DISTROS: DistroItem[] = [
  {
    id: "ubuntu",
    name: "Ubuntu",
    pkgMgr: "APT",
    category: "DEBIAN_UBUNTU",
    sub: "22.04 Jammy - 24.04 Noble - 26.04 Resolute",
    paths: ["/ubuntu/"],
    isoPath: "/mirror/browse/ubuntu-releases",
    snippet: [
      "# Ubuntu 24.04+ (DEB822) & 22.04 (sources.list) - run as root or with sudo",
      `[ -f /etc/apt/sources.list.d/ubuntu.sources ] && sed -i 's|https\\?://[^/]*archive.ubuntu.com/ubuntu|${MIRROR_BASE}/ubuntu|g; s|https\\?://security.ubuntu.com/ubuntu|${MIRROR_BASE}/ubuntu|g' /etc/apt/sources.list.d/ubuntu.sources`,
      `[ -f /etc/apt/sources.list ] && sed -i 's|https\\?://[^/]*archive.ubuntu.com/ubuntu|${MIRROR_BASE}/ubuntu|g; s|https\\?://security.ubuntu.com/ubuntu|${MIRROR_BASE}/ubuntu|g' /etc/apt/sources.list`,
      "",
      "apt-get update",
    ].join("\n"),
  },
  {
    id: "debian",
    name: "Debian",
    pkgMgr: "APT",
    category: "DEBIAN_UBUNTU",
    sub: "12 Bookworm - 13 Trixie - 14 Forky + Security",
    paths: ["/debian/", "/debian-security/"],
    isoPath: "/mirror/browse/debian-cd",
    snippet: [
      "# Debian 12+ (DEB822) & classic (sources.list) - run as root or with sudo",
      `[ -f /etc/apt/sources.list.d/debian.sources ] && sed -i 's|https\\?://security\\.debian\\.org/debian-security|${MIRROR_BASE}/debian-security|g; s|https\\?://deb\\.debian\\.org/debian-security|${MIRROR_BASE}/debian-security|g; s|https\\?://deb\\.debian\\.org/debian|${MIRROR_BASE}/debian|g' /etc/apt/sources.list.d/debian.sources`,
      `[ -f /etc/apt/sources.list ] && sed -i 's|https\\?://security\\.debian\\.org/debian-security|${MIRROR_BASE}/debian-security|g; s|https\\?://deb\\.debian\\.org/debian-security|${MIRROR_BASE}/debian-security|g; s|https\\?://deb\\.debian\\.org/debian|${MIRROR_BASE}/debian|g' /etc/apt/sources.list`,
      "",
      "apt-get update",
    ].join("\n"),
  },
  {
    id: "linuxmint",
    name: "Linux Mint",
    pkgMgr: "APT",
    category: "DEBIAN_UBUNTU",
    sub: "Wilma - Zara - LMDE (Packages & ISO)",
    paths: ["/linuxmint/"],
    isoPath: "/mirror/browse/linuxmint-iso",
    snippet: [
      "# Linux Mint (/etc/apt/sources.list.d/official-package-repositories.list)",
      `sudo sed -i 's|https\\?://packages.linuxmint.com|${MIRROR_BASE}/linuxmint|g' /etc/apt/sources.list.d/official-package-repositories.list`,
      "",
      "sudo apt-get update",
    ].join("\n"),
  },
  {
    id: "kali",
    name: "Kali Linux",
    pkgMgr: "APT",
    category: "SECURITY",
    sub: "Kali Rolling (Packages & ISO Images)",
    paths: ["/kali/"],
    isoPath: "/mirror/browse/kali-images",
    snippet: [
      "# Kali Rolling (/etc/apt/sources.list)",
      `echo 'deb ${MIRROR_BASE}/kali kali-rolling main contrib non-free non-free-firmware' | sudo tee /etc/apt/sources.list`,
      "",
      "sudo apt-get update",
    ].join("\n"),
  },
  {
    id: "parrot",
    name: "Parrot OS",
    pkgMgr: "APT",
    category: "SECURITY",
    sub: "Parrot 6 Lory (Packages & ISO)",
    paths: ["/parrot/"],
    isoPath: "/mirror/browse/parrot/iso",
    snippet: [
      "# Parrot OS (/etc/apt/sources.list.d/parrot.list)",
      `sudo sed -i 's|https\\?://deb.parrot.sh/parrot|${MIRROR_BASE}/parrot|g' /etc/apt/sources.list.d/parrot.list`,
      "",
      "sudo apt-get update",
    ].join("\n"),
  },
  {
    id: "almalinux",
    name: "AlmaLinux",
    pkgMgr: "DNF",
    category: "RHEL",
    sub: "AlmaLinux 8 - 9 - 10 (BaseOS & AppStream)",
    paths: ["/almalinux/"],
    isoPath: "/mirror/browse/almalinux",
    snippet: [
      "# AlmaLinux 8 / 9 / 10",
      "sudo sed -e 's|^mirrorlist=|#mirrorlist=|g' \\",
      `  -e 's|^#\\s*baseurl=https://repo.almalinux.org/almalinux|baseurl=${MIRROR_BASE}/almalinux|g' \\`,
      "  -i.bak /etc/yum.repos.d/almalinux*.repo",
      "",
      "sudo dnf makecache",
    ].join("\n"),
  },
  {
    id: "rocky",
    name: "Rocky Linux",
    pkgMgr: "DNF",
    category: "RHEL",
    sub: "Rocky Linux 8 - 9 (BaseOS & AppStream)",
    paths: ["/rocky/"],
    isoPath: "/mirror/browse/rocky",
    snippet: [
      "# Rocky Linux 8 / 9",
      "sudo sed -e 's|^mirrorlist=|#mirrorlist=|g' \\",
      `  -e 's|^#baseurl=http://dl.rockylinux.org/\\$contentdir|baseurl=${MIRROR_BASE}/rocky|g' \\`,
      "  -i.bak /etc/yum.repos.d/rocky*.repo",
      "",
      "sudo dnf makecache",
    ].join("\n"),
  },
  {
    id: "centos-stream",
    name: "CentOS Stream",
    pkgMgr: "DNF",
    category: "RHEL",
    sub: "CentOS Stream 9 - 10 (Active)",
    paths: ["/centos-stream/"],
    isoPath: "/mirror/browse/centos-stream",
    snippet: [
      "# CentOS Stream 9 / 10",
      "sudo sed -e 's|^metalink=|#metalink=|g' \\",
      `  -e 's|^#baseurl=http://mirror.stream.centos.org|baseurl=${MIRROR_BASE}/centos-stream|g' \\`,
      "  -i.bak /etc/yum.repos.d/centos*.repo",
      "",
      "sudo dnf makecache",
    ].join("\n"),
  },
  {
    id: "epel",
    name: "EPEL (RHEL)",
    pkgMgr: "DNF",
    category: "RHEL",
    sub: "EPEL 8 - 9 - 10 for Alma / Rocky / CentOS",
    paths: ["/epel/"],
    isoPath: "/mirror/browse/epel",
    snippet: [
      "# EPEL for AlmaLinux / Rocky / CentOS Stream",
      "sudo dnf install -y epel-release",
      "sudo sed -e 's|^metalink=|#metalink=|g' \\",
      `  -e 's|^#baseurl=https://download.example/pub/epel|baseurl=${MIRROR_BASE}/epel|g' \\`,
      "  -i.bak /etc/yum.repos.d/epel*.repo",
      "",
      "sudo dnf makecache",
    ].join("\n"),
  },
  {
    id: "archlinux",
    name: "Arch Linux",
    pkgMgr: "PACMAN",
    category: "ROLLING_BSD",
    sub: "Core - Extra - Multilib + ISO",
    paths: ["/archlinux/"],
    isoPath: "/mirror/browse/archlinux/iso",
    snippet: [
      "# Arch Linux (/etc/pacman.d/mirrorlist)",
      `echo 'Server = ${MIRROR_BASE}/archlinux/$repo/os/$arch' | sudo tee /etc/pacman.d/mirrorlist`,
      "",
      "sudo pacman -Syyu",
    ].join("\n"),
  },
  {
    id: "alpine",
    name: "Alpine Linux",
    pkgMgr: "APK",
    category: "ROLLING_BSD",
    sub: "v3.20 - v3.21 - latest-stable - edge",
    paths: ["/alpine/"],
    isoPath: "/mirror/browse/alpine",
    snippet: [
      "# Alpine Linux (Container & Host)",
      `sed -i 's|https\\?://dl-cdn.alpinelinux.org/alpine|${MIRROR_BASE}/alpine|g' /etc/apk/repositories`,
      "",
      "apk update",
    ].join("\n"),
  },
  {
    id: "freebsd",
    name: "FreeBSD",
    pkgMgr: "PKG",
    category: "ROLLING_BSD",
    sub: "FreeBSD 13 - 14 - 15 (pkg & ISO)",
    paths: ["/freebsd/", "/freebsd-pkg/"],
    isoPath: "/mirror/browse/freebsd/releases/ISO-IMAGES",
    snippet: [
      "# FreeBSD pkg (/usr/local/etc/pkg/repos/Masdika.conf)",
      "sudo mkdir -p /usr/local/etc/pkg/repos",
      `cat <<'EOF' | sudo tee /usr/local/etc/pkg/repos/Masdika.conf`,
      "Masdika: {",
      `  url: "pkg+${MIRROR_BASE}/freebsd-pkg/\${ABI}/quarterly",`,
      '  mirror_type: "srv",',
      '  signature_type: "fingerprints",',
      '  fingerprints: "/usr/share/keys/pkg",',
      "  enabled: yes",
      "}",
      "EOF",
      "sudo pkg update -f",
    ].join("\n"),
  },
  {
    id: "openbsd",
    name: "OpenBSD",
    pkgMgr: "PKG_ADD",
    category: "ROLLING_BSD",
    sub: "7.5 - 7.6 - snapshots (pkg & ISO)",
    paths: ["/openbsd/"],
    isoPath: "/mirror/browse/openbsd",
    snippet: [
      "# OpenBSD (/etc/installurl)",
      `echo '${MIRROR_BASE}/openbsd' | doas tee /etc/installurl`,
      "",
      "doas pkg_add -u",
    ].join("\n"),
  },
  {
    id: "mikrotik",
    name: "MikroTik RouterOS",
    pkgMgr: "NPK / CHR",
    category: "ROLLING_BSD",
    sub: "CHR - RouterOS v6 - RouterOS v7 (ISO & Packages)",
    paths: ["/mikrotik/"],
    isoPath: "/mirror/browse/mikrotik",
    snippet: [
      "# MikroTik RouterOS & CHR Mirror",
      `# Browse CHR, RouterOS v6, and RouterOS v7 images:`,
      `${MIRROR_BASE}/mikrotik/`,
      "",
      "# Example download via curl/fetch:",
      `curl -LO ${MIRROR_BASE}/mikrotik/RouterOS_v7/`,
    ].join("\n"),
  },
];

const ISO_SHORTCUTS = [
  { id: "ubuntu", name: "Ubuntu Releases", tag: "26.04 / 24.04 LTS", href: "/mirror/browse/ubuntu-releases" },
  { id: "debian", name: "Debian 14 (Forky) ISO", tag: "Testing Weekly Builds", href: "/mirror/browse/debian-cd-testing" },
  { id: "debian", name: "Debian 13 ISO", tag: "Current & Live CD", href: "/mirror/browse/debian-cd" },
  { id: "debian", name: "Debian 11 / 12 ISO", tag: "Archive Releases", href: "/mirror/browse/debian-cd-archive" },
  { id: "kali", name: "Kali Linux Images", tag: "Weekly & Installer", href: "/mirror/browse/kali-images" },
  { id: "parrot", name: "Parrot OS ISO", tag: "Security & Home", href: "/mirror/browse/parrot/iso" },
  { id: "linuxmint", name: "Linux Mint ISO", tag: "Cinnamon / XFCE", href: "/mirror/browse/linuxmint-iso" },
  { id: "almalinux", name: "AlmaLinux ISO", tag: "8 / 9 / 10 (All Versions)", href: "/mirror/browse/almalinux" },
  { id: "rocky", name: "Rocky Linux ISO", tag: "8 / 9 / 10 (All Versions)", href: "/mirror/browse/rocky" },
  { id: "centos-stream", name: "CentOS Stream ISO", tag: "9-stream & 10-stream", href: "/mirror/browse/centos-stream" },
  { id: "archlinux", name: "Arch Linux ISO", tag: "Monthly Releases", href: "/mirror/browse/archlinux/iso" },
  { id: "alpine", name: "Alpine Linux ISO", tag: "v3.18 - v3.21 / edge", href: "/mirror/browse/alpine" },
  { id: "freebsd", name: "FreeBSD ISO", tag: "13.x / 14.x / 15.x", href: "/mirror/browse/freebsd/releases/ISO-IMAGES" },
  { id: "freebsd", name: "FreeBSD Packages", tag: "Quarterly & Latest pkg", href: "/mirror/browse/freebsd-pkg" },
  { id: "openbsd", name: "OpenBSD ISO", tag: "7.x & Snapshots", href: "/mirror/browse/openbsd" },
  { id: "mikrotik", name: "MikroTik RouterOS", tag: "CHR / v6 / v7", href: "/mirror/browse/mikrotik" },
];

const CARDS_PER_PAGE = 8;

const MIRROR_FAQS: { q: string; a: string }[] = [
  {
    q: "How often does Masdika Mirror synchronize repository metadata?",
    a: "Package repository indexes (InRelease, Packages, repomd.xml, APKINDEX, and pacman databases) revalidate every 5 minutes against official upstream mirrors, preventing apt or dnf hash sum mismatches during updates.",
  },
  {
    q: "Are GPG signatures preserved and safe for production servers?",
    a: "Yes. Masdika Mirror proxies release signatures and packages untouched from official upstream distributions. Your local apt, dnf, pacman, apk, or pkg client verifies every GPG key natively without adding custom keys.",
  },
  {
    q: "How are binary packages vs ISO installer images cached?",
    a: "Frequently requested .deb, .rpm, .apk, and .pkg.tar.zst binaries are cached for 30 days on fast SSD storage using request-locking, while large ISO images stream directly at full line speed.",
  },
  {
    q: "Can external VPS or on-premise servers outside Masdika use this mirror?",
    a: "Yes. https://mirror.masdika.id is completely free and publicly accessible from anywhere in Indonesia or Southeast Asia without registration or rate limits.",
  },
  {
    q: "Which MikroTik RouterOS and CHR artifacts are mirrored?",
    a: "Masdika Mirror hosts official MikroTik Cloud Hosted Router (CHR) images as well as RouterOS v6 and RouterOS v7 package bundles browsable under /mirror/browse/mikrotik.",
  },
];

export default function MirrorClient() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("ubuntu");
  const [category, setCategory] = useState<DistroCategory>("ALL");
  const [page, setPage] = useState(1);
  const [health, setHealth] = useState<MirrorStatusPayload | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(true);

  const fetchHealth = () => {
    setCheckingHealth(true);
    fetch("/api/mirror/status")
      .then((r) => r.json())
      .then((data: MirrorStatusPayload) => setHealth(data))
      .catch(() => {})
      .finally(() => setCheckingHealth(false));
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const filteredDistros = useMemo(() => {
    if (category === "ALL") return DISTROS;
    return DISTROS.filter((d) => d.category === category);
  }, [category]);

  const totalPages = Math.max(1, Math.ceil(filteredDistros.length / CARDS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pagedDistros = filteredDistros.slice(
    (safePage - 1) * CARDS_PER_PAGE,
    safePage * CARDS_PER_PAGE
  );

  const handleCategoryChange = (cat: DistroCategory) => {
    setCategory(cat);
    setPage(1);
  };

  const activeSnippet = DISTROS.find((d) => d.id === activeTab)?.snippet || DISTROS[0].snippet;

  return (
    <div className="flex flex-col min-h-screen pt-28 sm:pt-36 md:pt-40 pb-10 sm:pb-14 overflow-x-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300 relative">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[900px] h-[520px] rounded-full opacity-[0.12] dark:opacity-[0.18] blur-[140px]"
          style={{ background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)" }}
        />
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1">
        {/* 1. HERO SECTION */}
        <section className="relative pt-0 pb-8 sm:pb-12 flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-start w-full">
            <div className="max-w-2xl relative z-30 lg:pt-20">
              <div className="mb-8">
                <Badge
                  variant="brand"
                  dot
                  dotColor={
                    health?.overallStatus === "outage"
                      ? "bg-red-500"
                      : health?.overallStatus === "degraded"
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                  }
                  size="md"
                  className="font-mono uppercase text-[10px] sm:text-xs"
                >
                  {health?.overallStatus === "outage"
                    ? "MIRROR NODE OFFLINE · MIRROR.MASDIKA.ID"
                    : health?.overallStatus === "degraded"
                      ? `DEGRADED (${health.upCount}/${health.totalCount} UP) · MIRROR.MASDIKA.ID`
                      : health
                        ? `ALL ${health.totalCount} MIRRORS OPERATIONAL · MIRROR.MASDIKA.ID`
                        : "LINUX & BSD MIRROR · MIRROR.MASDIKA.ID"}
                </Badge>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] mb-4 text-[var(--text-primary)]">
                Fast Package Cache. <br />
                <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-100 bg-clip-text text-transparent">
                  Direct ISO Mirror.
                </span>
              </h1>

              <p className="text-lg md:text-xl mb-10 max-w-xl leading-relaxed text-[var(--text-secondary)] font-normal">
                High-speed, GPG-verified package caching and ISO mirror for Ubuntu, Debian, Kali, Parrot OS, Linux Mint,
                AlmaLinux, Rocky, CentOS Stream, EPEL, Arch, Alpine, FreeBSD, and OpenBSD.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href="/mirror/browse"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Browse Repositories
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href="#iso-center"
                  leftIcon={<PackageCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                >
                  Download ISO
                </Button>
              </div>
            </div>

            <div className="relative flex items-center justify-center mt-6 lg:mt-0 lg:self-center">
              <HeroAvatarFrame
                imageSrc="/images/mirror-hero.webp"
                imageAlt="Masdika Linux Repository & ISO Mirror"
                imageWidth={1230}
                imageHeight={1278}
                badges={[
                  { icon: Layers, label: "Distributions", value: "13+ Linux & BSD Mirrors" },
                  { icon: RefreshCw, label: "Metadata Sync", value: "5-Minute Refresh" },
                  { icon: Disc, label: "ISO Images", value: "Direct Full-Speed Stream" },
                  { icon: KeyRound, label: "Verification", value: "GPG Signature Preserved" },
                ]}
              />
            </div>
          </div>
        </section>

        {/* SMART UPSTREAM / MIRROR HEALTH NOTIFICATION */}
        {health && health.overallStatus !== "operational" && (
          <section className="py-4 relative z-10">
            <div
              className={
                health.overallStatus === "outage"
                  ? "rounded-2xl border border-red-500/30 bg-red-500/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  : "rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              }
            >
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className={
                    health.overallStatus === "outage"
                      ? "w-5 h-5 text-red-500 shrink-0 mt-0.5"
                      : "w-5 h-5 text-amber-500 shrink-0 mt-0.5"
                  }
                />
                <div className="space-y-1">
                  <div className="text-sm font-bold text-[var(--text-primary)]">
                    {health.overallStatus === "outage"
                      ? "Mirror Endpoint Unreachable"
                      : `Partial Upstream Degradation (${health.downNames.join(", ")})`}
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    {health.overallStatus === "outage"
                      ? "The mirror node at mirror.masdika.id is currently unreachable. Please check tunnel connectivity or temporarily fall back to official upstream mirrors."
                      : `Upstream mirror for ${health.downNames.join(", ")} is currently slow or unreachable. Previously cached packages remain available from local storage for 30 days.`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={fetchHealth}
                disabled={checkingHealth}
                className="px-3.5 py-2 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] text-xs font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5 shrink-0 cursor-pointer self-start sm:self-center"
              >
                <RotateCw className={`w-3.5 h-3.5 ${checkingHealth ? "animate-spin" : ""}`} />
                <span>Re-check</span>
              </button>
            </div>
          </section>
        )}

        {/* 2. ARCHITECTURE PILLARS */}
        <section className="py-10 sm:py-14 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: Clock,
                title: "5-Minute Metadata Sync",
                desc: "Repository indexes (InRelease, Packages, repomd.xml, APKINDEX) refresh every 5 minutes so Hash Sum Mismatch never occurs.",
              },
              {
                icon: HardDrive,
                title: "30-Day Cache + ISO Stream",
                desc: "Immutable packages are cached on fast SSD storage while ISO images stream directly at full speed.",
              },
              {
                icon: ShieldCheck,
                title: "GPG Signature Preserved",
                desc: "All packages and Release signatures are proxied untouched from official upstreams and verified natively.",
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] flex items-start gap-4 shadow-sm hover:border-cyan-500/40 transition-colors"
              >
                <div className="w-11 h-11 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">{item.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2.5 MIRROR TELEMETRY & CACHE STATS */}
        {health?.telemetry && (
          <section className="py-10 sm:py-14 relative z-10">
            <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
                  Live Mirror Telemetry
                </span>
                <h2 className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)]">
                  Cache Performance &amp; Bandwidth
                </h2>
              </div>
              <span className="text-xs font-mono text-[var(--text-secondary)]">
                Updated: {new Date(health.telemetry.updatedAt).toLocaleTimeString()}
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-[var(--border-primary)] bg-black/[0.02] dark:bg-white/[0.02]">
                <div className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)] font-semibold">
                  Cache Hit Ratio
                </div>
                <div className="text-2xl font-black text-cyan-500 mt-1 font-mono">
                  {health.telemetry.cacheHitRatio.toFixed(1)}%
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 rounded-full"
                    style={{ width: `${Math.min(100, health.telemetry.cacheHitRatio)}%` }}
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl border border-[var(--border-primary)] bg-black/[0.02] dark:bg-white/[0.02]">
                <div className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)] font-semibold">
                  Bandwidth Served
                </div>
                <div className="text-2xl font-black text-[var(--text-primary)] mt-1 font-mono">
                  {(health.telemetry.totalBytesServed / (1024 ** 3)).toFixed(2)} GB
                </div>
                <div className="text-xs text-[var(--text-secondary)] mt-1">
                  {health.telemetry.totalRequests.toLocaleString()} requests
                </div>
              </div>

              <div className="p-4 rounded-xl border border-[var(--border-primary)] bg-black/[0.02] dark:bg-white/[0.02]">
                <div className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)] font-semibold">
                  SSD Cache Used
                </div>
                <div className="text-2xl font-black text-[var(--text-primary)] mt-1 font-mono">
                  {(health.telemetry.cacheUsedBytes / (1024 ** 3)).toFixed(1)} GB
                </div>
                <div className="text-xs text-[var(--text-secondary)] mt-1">
                  {(health.telemetry.diskFreeBytes / (1024 ** 3)).toFixed(0)} GB free on node
                </div>
              </div>

              <div className="p-4 rounded-xl border border-[var(--border-primary)] bg-black/[0.02] dark:bg-white/[0.02]">
                <div className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)] font-semibold mb-1.5">
                  Top Repositories
                </div>
                <div className="space-y-1">
                  {(health.telemetry.topRepos || []).slice(0, 3).map((repo) => (
                    <div key={repo.name} className="flex items-center justify-between text-xs font-mono">
                      <span className="text-cyan-500 truncate">{repo.name}</span>
                      <span className="text-[var(--text-secondary)]">{repo.requests}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            </div>
          </section>
        )}

        {/* 3. SUPPORTED DISTRIBUTIONS WITH CATEGORY FILTER & PAGINATION */}
        <section id="mirrors" className="scroll-mt-24 py-10 sm:py-14 relative z-10 space-y-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              ALL ACTIVE DISTRIBUTIONS
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Supported Repositories &amp; Packages
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed">
              Filter by OS family, copy mirror endpoints, or browse repository directories directly.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex justify-center w-full">
            <div className="inline-flex items-center gap-1.5 p-1.5 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {(
                [
                  { id: "ALL", label: `All (${DISTROS.length})` },
                  { id: "DEBIAN_UBUNTU", label: "Debian / Ubuntu / Mint" },
                  { id: "SECURITY", label: "Kali / Parrot OS" },
                  { id: "RHEL", label: "RHEL / Alma / Rocky / EPEL" },
                  { id: "ROLLING_BSD", label: "Arch / Alpine / BSD" },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id)}
                  className={
                    category === cat.id
                      ? "px-3.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-400 text-slate-950 transition-all cursor-pointer whitespace-nowrap shrink-0"
                      : "px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer whitespace-nowrap shrink-0"
                  }
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Clean Repository Table (Desktop) + Compact List (Mobile) */}
          <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] overflow-hidden shadow-sm relative">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    <th className="py-3.5 px-6">Distribution</th>
                    <th className="py-3.5 px-4">Supported Versions</th>
                    <th className="py-3.5 px-4">Mirror Endpoint</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-sm">
                  {pagedDistros.map((d) => (
                    <tr
                      key={d.id}
                      className="group hover:bg-[var(--surface-secondary)]/70 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl border border-[var(--border-primary)] bg-slate-50 dark:bg-white/95 flex items-center justify-center p-2 shrink-0 shadow-2xs group-hover:border-cyan-500/40 transition-colors">
                            {d.id === "mikrotik" ? (
                              <SiMikrotik className="w-5 h-5 text-[#182230]" />
                            ) : (
                              <img
                                src={`/images/distros/${d.id}.svg`}
                                alt={d.name}
                                width={22}
                                height={22}
                                className="w-5 h-5 object-contain"
                              />
                            )}
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[var(--text-primary)]">{d.name}</span>
                              <span className="px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] border border-[var(--border-primary)] font-mono text-[10px] font-semibold text-[var(--text-secondary)]">
                                {d.pkgMgr}
                              </span>
                            </div>
                            {(() => {
                              const st = health?.distros?.[d.id];
                              if (!st || st.ok) {
                                return (
                                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                    Online
                                  </span>
                                );
                              }
                              return (
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-600 dark:text-red-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                  Offline
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-xs text-[var(--text-secondary)]">
                        {health?.distros?.[d.id]?.detectedVersions || d.sub}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1.5">
                          {d.paths.map((p) => {
                            const full = MIRROR_BASE + p;
                            return (
                              <div
                                key={p}
                                className="inline-flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)]/80 font-mono text-xs w-fit max-w-full"
                              >
                                <code className="text-[var(--text-primary)] truncate">{full}</code>
                                <button
                                  type="button"
                                  onClick={() => copyText(full, full)}
                                  className="p-1 rounded text-[var(--text-secondary)] hover:text-cyan-500 cursor-pointer transition-colors shrink-0"
                                  title="Copy Mirror URL"
                                >
                                  {copiedId === full ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <Link
                            href={`/mirror/browse${d.paths[0].replace(/\/$/, "")}`}
                            className="px-3 py-1.5 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] hover:border-cyan-500/40 text-xs font-semibold text-cyan-600 dark:text-cyan-400 inline-flex items-center gap-1.5 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Browse</span>
                          </Link>
                          <Link
                            href={d.isoPath}
                            className="px-3 py-1.5 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] hover:border-cyan-500/40 text-xs font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5 text-cyan-500" />
                            <span>ISO</span>
                          </Link>
                          <a
                            href="#setup"
                            onClick={() => setActiveTab(d.id)}
                            className="px-3 py-1.5 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] hover:border-cyan-500/40 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1.5 transition-colors"
                            title="Show quick setup command"
                          >
                            <Terminal className="w-3.5 h-3.5" />
                            <span>Setup</span>
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile List */}
            <div className="md:hidden divide-y divide-[var(--border-subtle)]">
              {pagedDistros.map((d) => (
                <div key={d.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg border border-[var(--border-primary)] bg-slate-50 dark:bg-white/95 flex items-center justify-center p-1.5 shrink-0">
                        {d.id === "mikrotik" ? (
                          <SiMikrotik className="w-4.5 h-4.5 text-[#182230]" />
                        ) : (
                          <img
                            src={`/images/distros/${d.id}.svg`}
                            alt={d.name}
                            width={18}
                            height={18}
                            className="w-4.5 h-4.5 object-contain"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[var(--text-primary)]">{d.name}</span>
                          {health?.distros?.[d.id] && !health.distros[d.id].ok ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                              Offline
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              Online
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] truncate">
                          {health?.distros?.[d.id]?.detectedVersions || d.sub}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Link
                        href={`/mirror/browse${d.paths[0].replace(/\/$/, "")}`}
                        className="px-2.5 py-1 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[11px] font-semibold text-cyan-600 dark:text-cyan-400"
                      >
                        Browse
                      </Link>
                      <Link
                        href={d.isoPath}
                        className="px-2.5 py-1 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[11px] font-semibold text-[var(--text-primary)]"
                      >
                        ISO
                      </Link>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {d.paths.map((p) => {
                      const full = MIRROR_BASE + p;
                      return (
                        <div
                          key={p}
                          className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] font-mono text-[11px]"
                        >
                          <code className="truncate text-[var(--text-primary)]">{full}</code>
                          <button
                            type="button"
                            onClick={() => copyText(full, full)}
                            className="p-1 text-[var(--text-secondary)] hover:text-cyan-500 shrink-0 cursor-pointer"
                            title="Copy Mirror URL"
                          >
                            {copiedId === full ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-3 py-2 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] text-xs font-semibold text-[var(--text-primary)] disabled:opacity-40 hover:border-cyan-500/40 inline-flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPage(num)}
                  className={
                    num === safePage
                      ? "w-9 h-9 rounded-xl bg-cyan-400 text-slate-950 text-xs font-bold cursor-pointer"
                      : "w-9 h-9 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold cursor-pointer"
                  }
                >
                  {num}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="px-3 py-2 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] text-xs font-semibold text-[var(--text-primary)] disabled:opacity-40 hover:border-cyan-500/40 inline-flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </section>

        {/* 4. DIRECT ISO DOWNLOAD CENTER */}
        <section id="iso-center" className="scroll-mt-24 py-10 sm:py-14 relative z-10 space-y-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              BOOTABLE ISO IMAGES
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Direct ISO Download Center
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed">
              Jump straight to official installer ISO directories for bare-metal servers, Proxmox VMs, and desktops.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ISO_SHORTCUTS.map((iso) => (
              <Link
                key={iso.href}
                href={iso.href}
                className="group p-5 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 transition-all flex items-center justify-between gap-3 shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl border border-[var(--border-primary)] bg-slate-50 dark:bg-white/95 flex items-center justify-center p-2 shrink-0 shadow-2xs">
                    {iso.id === "mikrotik" ? (
                      <SiMikrotik className="w-5 h-5 text-[#182230]" />
                    ) : (
                      <img
                        src={`/images/distros/${iso.id}.svg`}
                        alt={iso.name}
                        width={22}
                        height={22}
                        className="w-5 h-5 object-contain"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[var(--text-primary)] truncate group-hover:text-cyan-500 transition-colors">
                      {iso.name}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] truncate">{iso.tag}</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            ))}
          </div>

          <div className="flex justify-center pt-1">
            <Link
              href="/mirror/browse"
              className="group inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 text-xs sm:text-sm font-semibold text-[var(--text-primary)] hover:text-cyan-500 transition-all shadow-sm"
            >
              <FolderOpen className="w-4 h-4 text-cyan-500 shrink-0" />
              <span>Browse All 19 Repository Roots</span>
              <ArrowRight className="w-3.5 h-3.5 text-[var(--text-secondary)] group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          </div>
        </section>

        {/* 5. QUICK SETUP */}
        <section id="setup" className="scroll-mt-24 py-10 sm:py-14 relative z-10 space-y-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              CLIENT CONFIGURATION
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Switch in One Command
            </h2>
            <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed">
              Select your distribution below and run the snippet on your VPS, bare-metal server, or container.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-[var(--border-primary)] bg-[var(--surface-secondary)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                  <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                  <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
                </div>
                <span className="font-mono text-xs font-semibold text-[var(--text-secondary)] truncate">
                  {activeTab}-mirror.sh
                </span>
              </div>

              <button
                type="button"
                onClick={() => copyText(activeSnippet, "snippet")}
                className="px-3 py-1.5 rounded-lg border border-[var(--border-primary)] bg-[var(--surface)] text-xs font-semibold text-[var(--text-primary)] hover:border-cyan-500/40 inline-flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {copiedId === "snippet" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--surface)] flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {DISTROS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setActiveTab(d.id)}
                  className={
                    activeTab === d.id
                      ? "px-3 py-1 rounded-lg text-xs font-bold bg-cyan-400 text-slate-950 whitespace-nowrap shrink-0 cursor-pointer"
                      : "px-3 py-1 rounded-lg text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] whitespace-nowrap shrink-0 cursor-pointer"
                  }
                >
                  {d.name}
                </button>
              ))}
            </div>

            <pre className="p-4 sm:p-5 font-mono text-xs sm:text-[13px] leading-relaxed overflow-x-auto whitespace-pre [scrollbar-width:none] [&::-webkit-scrollbar]:hidden text-[var(--text-primary)]">
              {activeSnippet}
            </pre>
          </div>
        </section>

        {/* 6. HOW IT WORKS */}
        <section className="py-10 sm:py-14 relative z-10 space-y-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              CACHING ARCHITECTURE
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Built for Speed &amp; Consistency
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                step: "01",
                icon: GitCompareArrows,
                title: "Upstream Metadata Sync",
                desc: "Release files and package indexes expire every 5 minutes with background revalidation, preventing apt or dnf hash mismatches.",
              },
              {
                step: "02",
                icon: Lock,
                title: "Request-Locked Binary Cache",
                desc: "Concurrent requests for the same .deb, .rpm, .apk, or .pkg.tar.zst package share a single upstream fetch and serve at SSD speed.",
              },
              {
                step: "03",
                icon: Server,
                title: "Direct ISO Streaming",
                desc: "Large installer ISO images bypass the package cache and stream directly from nearby Indonesia and Singapore nodes.",
              },
            ].map((s) => (
              <div
                key={s.step}
                className="p-6 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] space-y-3 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400">STEP {s.step}</span>
                  <s.icon className="w-4 h-4 text-cyan-500" />
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">{s.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 7. BOTTOM CTA */}
        <section className="py-10 sm:py-14 relative z-10">
          <GlowCtaCard>
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
              <div className="max-w-2xl space-y-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 block">
                  MASDIKA CLOUD INFRASTRUCTURE
                </span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[var(--text-primary)] tracking-tight leading-tight">
                  Need High-Speed Cloud VPS or Container Hosting?
                </h2>
                <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                  Deploy Proxmox Cloud VPS or Kubernetes App Platform workloads in Indonesia with fast access to Masdika mirrors.
                </p>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs text-[var(--text-secondary)]">
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-cyan-500" /> Free public access
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-cyan-500" /> 5-minute repo sync
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-cyan-500" /> GPG signature verified
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <Button variant="primary" size="lg" href="/vps" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Explore Cloud VPS
                </Button>
                <Button variant="secondary" size="lg" href="/app-platform" leftIcon={<Cloud className="w-4 h-4" />}>
                  App Platform
                </Button>
              </div>
            </div>
          </GlowCtaCard>
        </section>

        {/* 8. FAQ SECTION */}
        <FaqSection faqs={MIRROR_FAQS} />
      </div>
    </div>
  );
}
