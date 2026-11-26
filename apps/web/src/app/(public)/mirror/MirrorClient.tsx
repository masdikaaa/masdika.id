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
  Terminal,
} from "lucide-react";
import { SectionOrnaments, PageOrnaments } from "@/components/ui/PremiumBackground";
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
    <div className="relative overflow-hidden">
      <PageOrnaments />

      {/* Hero */}
      <section className="relative pt-24 pb-14 sm:pt-28 sm:pb-16">
        <SectionOrnaments variant="hero" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/25 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[11px] font-bold uppercase tracking-wider mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400" />
              <span>Public Linux Repository Mirror</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.08] mb-4">
              Masdika Linux
              <span className="block text-cyan-600 dark:text-cyan-400">Repository Mirror</span>
            </h1>

            <p className="max-w-xl text-sm sm:text-base text-slate-600 dark:text-zinc-400 leading-relaxed mb-8">
              High-speed, GPG-verified package caching and ISO mirror for Ubuntu, Debian, AlmaLinux, Rocky, CentOS
              Stream, EPEL, Arch Linux, Alpine, FreeBSD, and OpenBSD at{" "}
              <code className="font-mono text-cyan-600 dark:text-cyan-400">mirror.masdika.id</code>.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/mirror/browse"
                className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-sm font-bold inline-flex items-center gap-2 transition-colors shadow-sm"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Browse Repositories</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/mirror/browse/ubuntu-releases"
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0c0e] hover:bg-slate-50 dark:hover:bg-white/5 text-slate-800 dark:text-zinc-200 text-sm font-semibold inline-flex items-center gap-2 transition-colors"
              >
                <Disc className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                <span>Download ISO</span>
              </Link>

              <a
                href="#setup"
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0c0e] hover:bg-slate-50 dark:hover:bg-white/5 text-slate-800 dark:text-zinc-200 text-sm font-semibold inline-flex items-center gap-2 transition-colors"
              >
                <Terminal className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                <span>Quick Setup</span>
              </a>
            </div>
          </div>

          <div className="relative flex items-center justify-center mt-4 lg:mt-0">
            <HeroAvatarFrame
              imageSrc="/images/mirror-hero.webp"
              imageAlt="Masdika Linux Repository & ISO Mirror"
              imageWidth={1230}
              imageHeight={1278}
              badges={[
                { icon: HardDrive, label: "Distributions", value: "Ubuntu, Debian, Alpine" },
                { icon: RefreshCw, label: "Metadata Sync", value: "5-Minute Refresh" },
                { icon: Disc, label: "ISO Images", value: "Direct Full-Speed Stream" },
                { icon: ShieldCheck, label: "Verification", value: "GPG Signature Preserved" },
              ]}
            />
          </div>
        </div>
      </section>

      {/* Supported Distributions */}
      <section id="mirrors" className="py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-6">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Supported Distributions &amp; ISO Images
            </h2>
            <span className="text-xs font-mono text-slate-500 dark:text-zinc-500">{MIRROR_BASE}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DISTROS.map((d) => (
              <article
                key={d.id}
                className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0a0a0c] p-5 flex flex-col gap-3.5 hover:border-cyan-500/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{d.name}</h3>
                    <span className="text-xs text-slate-500 dark:text-zinc-400">{d.sub}</span>
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
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.07] bg-slate-50 dark:bg-white/[0.03] font-mono text-xs"
                      >
                        <code className="truncate text-slate-800 dark:text-zinc-200">{full}</code>
                        <button
                          type="button"
                          onClick={() => copyText(full, full)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 text-slate-500 dark:text-zinc-400 hover:text-cyan-500 cursor-pointer shrink-0"
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

                <div className="mt-auto pt-2 flex items-center justify-between gap-2 text-xs border-t border-slate-100 dark:border-white/[0.06]">
                  <Link
                    href={`/mirror/browse${d.paths[0].replace(/\/$/, "")}`}
                    className="font-semibold text-cyan-600 dark:text-cyan-400 hover:underline inline-flex items-center gap-1.5"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Browse Repo</span>
                  </Link>
                  <Link
                    href={d.isoPath}
                    className="font-semibold text-slate-700 dark:text-zinc-300 hover:text-cyan-600 dark:hover:text-cyan-400 inline-flex items-center gap-1.5"
                  >
                    <Disc className="w-3.5 h-3.5" />
                    <span>Download ISO</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Setup */}
      <section id="setup" className="py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Quick Client Configuration
            </h2>
            <span className="text-xs text-slate-500 dark:text-zinc-500">
              Copy and run on your server or container
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#08080a] overflow-hidden shadow-xs">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-white/[0.08] bg-slate-50/80 dark:bg-[#0f0f13] flex flex-wrap items-center justify-between gap-3">
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
                          : "px-3 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
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
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:border-cyan-500/40 inline-flex items-center gap-1.5 cursor-pointer shrink-0"
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

            <pre className="p-5 font-mono text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap break-all text-slate-800 dark:text-zinc-200">
              {activeSnippet}
            </pre>
          </div>
        </div>
      </section>

      {/* Architecture Highlights */}
      <section className="py-6 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0a0a0c] p-5 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <RefreshCw className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">5-Minute Metadata Sync</h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
              Repository indexes (InRelease, Packages, repomd.xml, APKINDEX) refresh every 5 minutes so Hash Sum Mismatch never occurs.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0a0a0c] p-5 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">30-Day Cache + ISO Stream</h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
              Binary .deb, .rpm, and .apk packages are cached on fast SSD storage while ISO images stream directly at full speed.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0a0a0c] p-5 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">GPG Signature Preserved</h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
              All packages and Release signatures are proxied untouched from official ID/SG upstreams and verified by apt, dnf, and apk.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
