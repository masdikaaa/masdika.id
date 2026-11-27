"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronRight,
  Copy,
  CornerLeftUp,
  Disc,
  Download,
  FileCode,
  FileText,
  Folder,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
} from "lucide-react";

const MIRROR_ORIGIN = "https://mirror.masdika.id";

interface MirrorIndexEntry {
  name: string;
  href: string;
  isDir: boolean;
  size: string;
  lastSync: string;
}

const ROOT_REPOS: MirrorIndexEntry[] = [
  { name: "ubuntu/", href: "/ubuntu/", isDir: true, size: "-", lastSync: "Active Cache" },
  { name: "ubuntu-releases/", href: "/ubuntu-releases/", isDir: true, size: "-", lastSync: "ISO Releases" },
  { name: "debian/", href: "/debian/", isDir: true, size: "-", lastSync: "Active Cache" },
  { name: "debian-cd/", href: "/debian-cd/", isDir: true, size: "-", lastSync: "Debian 13 ISO" },
  { name: "debian-cd-testing/", href: "/debian-cd-testing/", isDir: true, size: "-", lastSync: "Debian 14 (Forky) ISO" },
  { name: "debian-cd-archive/", href: "/debian-cd-archive/", isDir: true, size: "-", lastSync: "Debian 11 / 12 ISO" },
  { name: "debian-security/", href: "/debian-security/", isDir: true, size: "-", lastSync: "Active Cache" },
  { name: "kali/", href: "/kali/", isDir: true, size: "-", lastSync: "Kali Rolling" },
  { name: "kali-images/", href: "/kali-images/", isDir: true, size: "-", lastSync: "Kali ISO Releases" },
  { name: "parrot/", href: "/parrot/", isDir: true, size: "-", lastSync: "Packages & ISO" },
  { name: "linuxmint/", href: "/linuxmint/", isDir: true, size: "-", lastSync: "Active Cache" },
  { name: "linuxmint-iso/", href: "/linuxmint-iso/", isDir: true, size: "-", lastSync: "Mint ISO Releases" },
  { name: "almalinux/", href: "/almalinux/", isDir: true, size: "-", lastSync: "Packages & ISO" },
  { name: "rocky/", href: "/rocky/", isDir: true, size: "-", lastSync: "Packages & ISO" },
  { name: "centos-stream/", href: "/centos-stream/", isDir: true, size: "-", lastSync: "Stream 9 & 10" },
  { name: "epel/", href: "/epel/", isDir: true, size: "-", lastSync: "RHEL Extra Packages" },
  { name: "archlinux/", href: "/archlinux/", isDir: true, size: "-", lastSync: "Packages & ISO" },
  { name: "alpine/", href: "/alpine/", isDir: true, size: "-", lastSync: "Packages & ISO" },
  { name: "freebsd/", href: "/freebsd/", isDir: true, size: "-", lastSync: "Releases & ISO" },
  { name: "freebsd-pkg/", href: "/freebsd-pkg/", isDir: true, size: "-", lastSync: "Binary Packages" },
  { name: "openbsd/", href: "/openbsd/", isDir: true, size: "-", lastSync: "Packages & ISO" },
  { name: "mikrotik/", href: "/mikrotik/", isDir: true, size: "-", lastSync: "CHR & RouterOS v6/v7" },
  { name: "proxmox/", href: "/proxmox/", isDir: true, size: "-", lastSync: "PVE 8 / 9 & ISO" },
];

const PAGE_SIZE = 50;

export default function MirrorBrowsePage() {
  const params = useParams<{ slug?: string[] }>();
  const slug = params?.slug || [];
  const currentPath = slug.length > 0 ? `/${slug.join("/")}/` : "/";

  const [entries, setEntries] = useState<MirrorIndexEntry[]>(slug.length === 0 ? ROOT_REPOS : []);
  const [loading, setLoading] = useState(slug.length > 0);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(1);
  const [shaLoadingHref, setShaLoadingHref] = useState<string | null>(null);
  const [shaCopiedHref, setShaCopiedHref] = useState<string | null>(null);

  const isIsoFile = (name: string) => /\.(iso|img|qcow2|raw)$/i.test(name);

  const handleCopySha256 = async (e: React.MouseEvent, entry: MirrorIndexEntry) => {
    e.preventDefault();
    e.stopPropagation();
    setShaLoadingHref(entry.href);
    try {
      const res = await fetch(`/api/mirror/checksum?path=${encodeURIComponent(entry.href)}`);
      const data = await res.json();
      if (res.ok && data.sha256) {
        await navigator.clipboard.writeText(data.sha256);
        setShaCopiedHref(entry.href);
        setTimeout(() => setShaCopiedHref((prev) => (prev === entry.href ? null : prev)), 2500);
      }
    } catch {
      // ignore
    } finally {
      setShaLoadingHref(null);
    }
  };

  useEffect(() => {
    setSearch("");
    setPage(1);
    if (slug.length === 0) {
      setEntries(ROOT_REPOS);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/mirror/index?path=${encodeURIComponent(currentPath)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error && (!data.entries || data.entries.length === 0)) {
          setError(data.error);
          setEntries([]);
        } else {
          setEntries(data.entries || []);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load directory listing");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentPath, slug.length]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => e.name.toLowerCase().includes(q));
  }, [entries, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedEntries = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage]
  );

  const parentHref =
    slug.length > 1 ? `/mirror/browse/${slug.slice(0, -1).join("/")}` : slug.length === 1 ? "/mirror/browse" : null;

  const renderFileIcon = (entry: MirrorIndexEntry) => {
    if (entry.isDir) {
      return <Folder className="w-4 h-4 text-cyan-500 dark:text-cyan-400 fill-cyan-400/15 shrink-0" />;
    }
    const lower = entry.name.toLowerCase();
    if (lower.endsWith(".iso") || lower.endsWith(".img")) {
      return <Disc className="w-4 h-4 text-cyan-400 shrink-0" />;
    }
    if (lower.endsWith(".deb") || lower.endsWith(".rpm") || lower.endsWith(".apk")) {
      return <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />;
    }
    return <FileText className="w-4 h-4 text-slate-400 dark:text-zinc-400 shrink-0" />;
  };

  return (
    <div className="relative pt-28 sm:pt-32 pb-16 min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 space-y-5 relative z-10">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--text-secondary)]">
          <Link href="/mirror" className="hover:text-cyan-500 font-medium">
            Linux Mirror
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/mirror/browse" className="hover:text-cyan-500 font-medium">
            Repositories
          </Link>
          {slug.map((seg, i) => {
            const href = `/mirror/browse/${slug.slice(0, i + 1).join("/")}`;
            return (
              <span key={href} className="inline-flex items-center gap-1.5">
                <ChevronRight className="w-3.5 h-3.5" />
                <Link
                  href={href}
                  className={
                    i === slug.length - 1
                      ? "text-cyan-600 dark:text-cyan-400 font-semibold"
                      : "hover:text-cyan-500"
                  }
                >
                  {seg}
                </Link>
              </span>
            );
          })}
        </div>

        {/* Directory Index Card */}
        <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] overflow-hidden shadow-sm">
          {/* Top Bar */}
          <div className="px-4 sm:px-6 py-4 border-b border-[var(--border-primary)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-[var(--text-primary)] font-mono truncate">
              Index of {currentPath}
            </h1>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search this directory..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-cyan-400"
                />
              </div>

              <button
                type="button"
                onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
                className="px-3 py-1.5 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-xs font-semibold text-[var(--text-primary)] hover:border-cyan-500/40 inline-flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <span>{viewMode === "list" ? "List" : "Grid"}</span>
                {viewMode === "list" ? <List className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-500 dark:text-zinc-400">
              <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin mx-auto mb-2" />
              <span className="text-xs">Loading directory index...</span>
            </div>
          ) : error ? (
            <div className="py-16 text-center text-red-500 text-xs px-4">{error}</div>
          ) : viewMode === "list" ? (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/[0.08] bg-slate-50/80 dark:bg-white/[0.02] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                      <th className="py-3 px-6">Name</th>
                      <th className="py-3 px-4">Size</th>
                      <th className="py-3 px-6">Last Sync</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05] text-[13px]">
                    {parentHref && (
                      <tr className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
                        <td className="py-2.5 px-6" colSpan={3}>
                          <Link
                            href={parentHref}
                            className="inline-flex items-center gap-2 font-mono font-medium text-cyan-600 dark:text-cyan-400 hover:underline"
                          >
                            <CornerLeftUp className="w-3.5 h-3.5" />
                            <span>Parent Directory/</span>
                          </Link>
                        </td>
                      </tr>
                    )}

                    {pagedEntries.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-12 text-center text-slate-500 dark:text-zinc-500 text-xs">
                          No files or directories match your search.
                        </td>
                      </tr>
                    ) : (
                      pagedEntries.map((entry) => (
                        <tr
                          key={entry.href}
                          className="hover:bg-slate-50 dark:hover:bg-cyan-500/[0.06] transition-colors"
                        >
                          <td className="py-2.5 px-6 font-mono">
                            {entry.isDir ? (
                              <Link
                                href={`/mirror/browse${entry.href.replace(/\/$/, "")}`}
                                className="inline-flex items-center gap-2.5 text-cyan-600 dark:text-cyan-400 hover:underline font-medium"
                              >
                                {renderFileIcon(entry)}
                                <span className="break-words">{entry.name}</span>
                              </Link>
                            ) : (
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <a
                                  href={`${MIRROR_ORIGIN}${entry.href}`}
                                  className="inline-flex items-center gap-2.5 text-slate-800 dark:text-zinc-200 hover:text-cyan-600 dark:hover:text-cyan-400"
                                >
                                  {renderFileIcon(entry)}
                                  <span className="break-words">{entry.name}</span>
                                  <Download className="w-3 h-3 opacity-50 shrink-0" />
                                </a>
                                {isIsoFile(entry.name) && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleCopySha256(e, entry)}
                                    disabled={shaLoadingHref === entry.href}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold border border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                                    title="Copy SHA256 Checksum"
                                  >
                                    {shaCopiedHref === entry.href ? (
                                      <>
                                        <Check className="w-3 h-3" /> SHA256 Copied
                                      </>
                                    ) : shaLoadingHref === entry.href ? (
                                      "SHA256..."
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" /> SHA256
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                            {entry.size}
                          </td>
                          <td className="py-2.5 px-6 font-mono text-slate-500 dark:text-zinc-400 whitespace-nowrap">
                            {entry.lastSync}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Compact List */}
              <div className="block md:hidden divide-y divide-slate-100 dark:divide-white/[0.05]">
                {parentHref && (
                  <Link
                    href={parentHref}
                    className="px-4 py-3 flex items-center gap-2.5 font-mono text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                  >
                    <CornerLeftUp className="w-3.5 h-3.5 shrink-0" />
                    <span>Parent Directory/</span>
                  </Link>
                )}

                {pagedEntries.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 dark:text-zinc-500 text-xs">
                    No files or directories match your search.
                  </div>
                ) : (
                  pagedEntries.map((entry) =>
                    entry.isDir ? (
                      <Link
                        key={entry.href}
                        href={`/mirror/browse${entry.href.replace(/\/$/, "")}`}
                        className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-cyan-500/[0.06] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {renderFileIcon(entry)}
                          <div className="min-w-0">
                            <div className="font-mono text-xs font-semibold text-cyan-600 dark:text-cyan-400 truncate">
                              {entry.name}
                            </div>
                            <div className="font-mono text-[11px] text-slate-500 dark:text-zinc-500 truncate mt-0.5">
                              {entry.lastSync}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0" />
                      </Link>
                    ) : (
                      <a
                        key={entry.href}
                        href={`${MIRROR_ORIGIN}${entry.href}`}
                        className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-cyan-500/[0.06] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {renderFileIcon(entry)}
                          <div className="min-w-0">
                            <div className="font-mono text-xs font-medium text-slate-800 dark:text-zinc-200 truncate">
                              {entry.name}
                            </div>
                            <div className="font-mono text-[11px] text-slate-500 dark:text-zinc-500 truncate mt-0.5">
                              {entry.size !== "-" ? `${entry.size} • ${entry.lastSync}` : entry.lastSync}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isIsoFile(entry.name) && (
                            <button
                              type="button"
                              onClick={(e) => handleCopySha256(e, entry)}
                              className="px-2 py-1 rounded-md text-[10px] font-mono font-semibold border border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                            >
                              {shaCopiedHref === entry.href ? "Copied" : "SHA256"}
                            </button>
                          )}
                          <Download className="w-4 h-4 text-cyan-500 shrink-0" />
                        </div>
                      </a>
                    )
                  )
                )}
              </div>
            </>
          ) : (
            <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pagedEntries.map((entry) =>
                entry.isDir ? (
                  <Link
                    key={entry.href}
                    href={`/mirror/browse${entry.href.replace(/\/$/, "")}`}
                    className="p-3 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.02] hover:border-cyan-500/40 flex items-center gap-3 transition-colors"
                  >
                    {renderFileIcon(entry)}
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-semibold text-cyan-600 dark:text-cyan-400 truncate">
                        {entry.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-500 truncate">
                        {entry.lastSync}
                      </div>
                    </div>
                  </Link>
                ) : (
                  <a
                    key={entry.href}
                    href={`${MIRROR_ORIGIN}${entry.href}`}
                    className="p-3 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.02] hover:border-cyan-500/40 flex items-center gap-3 transition-colors"
                  >
                    {renderFileIcon(entry)}
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-xs font-medium text-slate-800 dark:text-zinc-200 truncate">
                        {entry.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-500 truncate">
                        {entry.size}
                      </div>
                    </div>
                    <Download className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                  </a>
                )
              )}
            </div>
          )}

          {!loading && !error && totalPages > 1 && (
            <div className="px-4 sm:px-6 py-3 border-t border-[var(--border-primary)] bg-[var(--surface-secondary)] flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-[var(--text-secondary)]">
                Showing {(safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} items
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)] font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <span className="font-mono text-[var(--text-secondary)]">
                  Page {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)] font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
