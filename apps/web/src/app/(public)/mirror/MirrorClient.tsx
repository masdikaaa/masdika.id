"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  Disc,
  FolderOpen,
  HardDrive,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { HeroAvatarFrame } from "@/components/ui/HeroAvatarFrame";

const MIRROR_BASE = "https://mirror.masdika.id";

const DISTROS = [
  {
    id: "ubuntu",
    name: "Ubuntu",
    sub: "22.04 Jammy - 24.04 Noble - 26.04 Resolute",
    paths: ["/ubuntu/"],
    isoPath: "/mirror/browse/ubuntu-releases",
    snippet: [
      "# Ubuntu 24.04+ (DEB822 format)",
      `sudo sed -i 's|https\\?://[^/]*archive.ubuntu.com/ubuntu|${MIRROR_BASE}/ubuntu|g; s|https\\?://security.ubuntu.com/ubuntu|${MIRROR_BASE}/ubuntu|g' /etc/apt/sources.list.d/ubuntu.sources`,
      "",
      "# Ubuntu 22.04 / older (sources.list)",
      `sudo sed -i 's|https\\?://[^/]*archive.ubuntu.com/ubuntu|${MIRROR_BASE}/ubuntu|g; s|https\\?://security.ubuntu.com/ubuntu|${MIRROR_BASE}/ubuntu|g' /etc/apt/sources.list`,
      "",
      "sudo apt-get update",
    ].join("\n"),
  },
  {
    id: "debian",
    name: "Debian",
    sub: "12 Bookworm - 13 Trixie + Security",
    paths: ["/debian/", "/debian-security/"],
    isoPath: "/mirror/browse/debian-cd",
    snippet: [
      "# Debian 12+ (DEB822 format)",
      `sudo sed -i 's|https\\?://deb.debian.org/debian-security|${MIRROR_BASE}/debian-security|g; s|https\\?://deb.debian.org/debian|${MIRROR_BASE}/debian|g' /etc/apt/sources.list.d/debian.sources`,
      "",
      "# Debian classic (sources.list)",
      `sudo sed -i 's|https\\?://deb.debian.org/debian|${MIRROR_BASE}/debian|g; s|https\\?://security.debian.org/debian-security|${MIRROR_BASE}/debian-security|g' /etc/apt/sources.list`,
      "",
      "sudo apt-get update",
    ].join("\n"),
  },
  {
    id: "almalinux",
    name: "AlmaLinux",
    sub: "AlmaLinux 8 - 9 - 10 (BaseOS & AppStream)",
    paths: ["/almalinux/"],
    isoPath: "/mirror/browse/almalinux/9/isos/x86_64",
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
    sub: "Rocky Linux 8 - 9 (BaseOS & AppStream)",
    paths: ["/rocky/"],
    isoPath: "/mirror/browse/rocky/9/isos/x86_64",
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
    id: "alpine",
    name: "Alpine Linux",
    sub: "v3.20 - v3.21 - latest-stable - edge",
    paths: ["/alpine/"],
    isoPath: "/mirror/browse/alpine/latest-stable/releases/x86_64",
    snippet: [
      "# Alpine Linux (Container & Host)",
      `sed -i 's|https\\?://dl-cdn.alpinelinux.org/alpine|${MIRROR_BASE}/alpine|g' /etc/apk/repositories`,
      "",
      "apk update",
    ].join("\n"),
  },
  {
    id: "centos-stream",
    name: "CentOS Stream",
    sub: "CentOS Stream 9 - 10 (Active)",
    paths: ["/centos-stream/"],
    isoPath: "/mirror/browse/centos-stream/9-stream/BaseOS/x86_64/iso",
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
    id: "freebsd",
    name: "FreeBSD",
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
];

export default function MirrorClient() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("ubuntu");

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const activeSnippet = DISTROS.find((d) => d.id === activeTab)?.snippet || DISTROS[0].snippet;

  return (
    <div className="flex flex-col min-h-screen pt-28 sm:pt-36 md:pt-40 pb-10 sm:pb-14 overflow-x-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300 relative">
      {/* Background Glow (identical to AppPlatformClient) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[900px] h-[520px] rounded-full opacity-[0.12] dark:opacity-[0.18] blur-[140px]"
          style={{ background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)" }}
        />
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1 space-y-16 sm:space-y-24">
        {/* HERO SECTION */}
        <section className="relative pt-0 pb-4 sm:pb-8 flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-start w-full">
            <div className="max-w-2xl relative z-30 lg:pt-20">
              <div className="mb-8">
                <Badge variant="brand" dot dotColor="bg-emerald-400" size="md" className="font-mono uppercase whitespace-nowrap">
                  LINUX &amp; BSD MIRROR · MIRROR.MASDIKA.ID
                </Badge>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] mb-4 text-[var(--text-primary)]">
                Fast Package Cache. <br />
                <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-100 bg-clip-text text-transparent">
                  Direct ISO Mirror.
                </span>
              </h1>

              <p className="text-lg md:text-xl mb-10 max-w-xl leading-relaxed text-[var(--text-secondary)] font-normal">
                High-speed, GPG-verified package caching and ISO releases for Ubuntu, Debian, AlmaLinux, Rocky, CentOS
                Stream, EPEL, Arch Linux, Alpine, FreeBSD, and OpenBSD.
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
                  href="/mirror/browse/ubuntu-releases"
                  leftIcon={<Disc className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
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
                  { icon: HardDrive, label: "Distributions", value: "Linux & BSD Mirrors" },
                  { icon: RefreshCw, label: "Metadata Sync", value: "5-Minute Refresh" },
                  { icon: Disc, label: "ISO Images", value: "Direct Full-Speed Stream" },
                  { icon: ShieldCheck, label: "Verification", value: "GPG Signature Preserved" },
                ]}
              />
            </div>
          </div>
        </section>

        {/* SUPPORTED DISTRIBUTIONS */}
        <section id="mirrors" className="relative z-10 space-y-8">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-2 block">
              ALL ACTIVE DISTRIBUTIONS
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] leading-tight">
              Supported Repositories &amp; ISO Images
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-2">
              Copy the mirror URL for your package manager or browse directories to download ISO images directly.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {DISTROS.map((d) => (
              <article
                key={d.id}
                className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-6 flex flex-col gap-4 hover:border-cyan-500/40 transition-colors shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-primary)]">{d.name}</h3>
                    <span className="text-xs text-[var(--text-secondary)]">{d.sub}</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                    Online
                  </span>
                </div>

                <div className="space-y-2">
                  {d.paths.map((p) => {
                    const full = MIRROR_BASE + p;
                    return (
                      <div
                        key={p}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] font-mono text-xs"
                      >
                        <code className="truncate text-[var(--text-primary)]">{full}</code>
                        <button
                          type="button"
                          onClick={() => copyText(full, full)}
                          className="p-1.5 rounded-lg border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-cyan-500 cursor-pointer shrink-0 transition-colors"
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

                <div className="mt-auto pt-3 flex items-center justify-between gap-2 text-xs border-t border-[var(--border-subtle)]">
                  <Link
                    href={`/mirror/browse${d.paths[0].replace(/\/$/, "")}`}
                    className="font-semibold text-cyan-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-1.5"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Browse Repo</span>
                  </Link>
                  <Link
                    href={d.isoPath}
                    className="font-semibold text-[var(--text-secondary)] hover:text-cyan-600 dark:hover:text-cyan-400 inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Disc className="w-3.5 h-3.5" />
                    <span>Download ISO</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* QUICK SETUP */}
        <section id="setup" className="relative z-10 space-y-6">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-2 block">
              CLIENT CONFIGURATION
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] leading-tight">
              Switch in One Command
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-2">
              Select your distribution below and run the snippet on your VPS, bare-metal server, or container.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-[var(--border-primary)] bg-[var(--surface-secondary)] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 max-w-full">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                  <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                  <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
                </div>
                <div className="flex items-center gap-1 overflow-x-auto max-w-full">
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

            <pre className="p-5 font-mono text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap break-all text-[var(--text-primary)]">
              {activeSnippet}
            </pre>
          </div>
        </section>

        {/* ARCHITECTURE HIGHLIGHTS */}
        <section className="relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: RefreshCw,
                title: "5-Minute Metadata Sync",
                desc: "Repository indexes (InRelease, Packages, repomd.xml, APKINDEX) refresh every 5 minutes so Hash Sum Mismatch never occurs.",
              },
              {
                icon: HardDrive,
                title: "30-Day Cache + ISO Stream",
                desc: "Binary packages are cached on fast SSD storage while ISO images stream directly at full speed.",
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
      </div>
    </div>
  );
}
