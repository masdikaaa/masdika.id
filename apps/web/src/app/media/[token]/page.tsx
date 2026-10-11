"use client";

import React, { useState, useEffect, useRef, use } from "react";
import dynamic from "next/dynamic";
import {
  Download, FileImage, FileVideo, FileAudio, FileText,
  File, Presentation, AlertTriangle, Clock, CheckCircle2, Loader2, Link2, ArrowLeft,
  Sun, Moon, Lock,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { MediaEngagement } from "@/components/media/MediaEngagement";
import { PremiumLoader } from "@/components/ui/PremiumLoader";

// Dynamically import Video.js player to prevent SSR window issues
const VideoPlayer = dynamic(
  () => import("@/components/media/VideoPlayer").then((mod) => mod.VideoPlayer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full aspect-video rounded-2xl bg-[#03040b] border border-white/10 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
      </div>
    ),
  }
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface MediaInfo {
  id: number;
  originalName: string;
  mimeType: string;
  size: number;
  expiresAt: string | null;
  token: string;
  isPublic?: boolean;
}

type PreviewType = "image" | "video" | "audio" | "pdf" | "text" | "office" | "none";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPreviewType(mimeType: string, originalName: string): PreviewType {
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  return "none";
}

function getFileIcon(mimeType: string, originalName: string) {
  switch (getPreviewType(mimeType, originalName)) {
    case "video":  return FileVideo;
    case "image":  return FileImage;
    case "audio":  return FileAudio;
    case "pdf":
    case "text":   return FileText;
    case "office": return Presentation;
    default:       return File;
  }
}

function formatBytes(bytes: number) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatExpiry(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

// ─── Image viewer with zoom + pan ─────────────────────────────────────────────

function ImageViewer({ src, alt }: { src: string; alt: string }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale]   = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart  = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const lastTouches = useRef<React.TouchList | null>(null);

  const MIN = 0.1, MAX = 10;
  const clamp = (s: number) => Math.min(MAX, Math.max(MIN, s));

  const reset = () => { setScale(1); setOffset({ x: 0, y: 0 }); };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left - rect.width  / 2;
    const cy = e.clientY - rect.top  - rect.height / 2;
    const factor = e.deltaY > 0 ? 0.85 : 1.15;
    const next = clamp(scale * factor);
    const ratio = next / scale;
    setScale(next);
    setOffset((o) => ({
      x: o.x * ratio + cx * (1 - ratio),
      y: o.y * ratio + cy * (1 - ratio),
    }));
  };

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !dragStart.current) return;
    setOffset({
      x: dragStart.current.ox + e.clientX - dragStart.current.x,
      y: dragStart.current.oy + e.clientY - dragStart.current.y,
    });
  };
  const stopDrag = () => { setDragging(false); dragStart.current = null; };

  const onTouchStart = (e: React.TouchEvent) => { lastTouches.current = e.touches; };
  const onTouchMove  = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!lastTouches.current) return;
    if (e.touches.length === 2 && lastTouches.current.length === 2) {
      const prev = lastTouches.current;
      const pDist = Math.hypot(prev[0].clientX - prev[1].clientX, prev[0].clientY - prev[1].clientY);
      const cDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      setScale((s) => clamp(s * (cDist / pDist)));
    } else if (e.touches.length === 1 && lastTouches.current.length === 1) {
      const dx = e.touches[0].clientX - lastTouches.current[0].clientX;
      const dy = e.touches[0].clientY - lastTouches.current[0].clientY;
      setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
    }
    lastTouches.current = e.touches;
  };

  return (
    <div className={cn("relative w-full h-[65vh] rounded-2xl overflow-hidden flex flex-col select-none transition-all", isDark ? "border border-white/10 bg-[#03040b]" : "border border-slate-200 bg-slate-100/80 shadow-md")}>
      {/* Zoom controls */}
      <div className={cn("absolute top-3 right-3 z-20 flex items-center gap-0.5 backdrop-blur-md rounded-xl overflow-hidden border shadow-lg", isDark ? "bg-black/70 border-white/10" : "bg-white/95 border-slate-200 shadow-sm")}>
        <button
          onClick={() => setScale((s) => clamp(s / 1.3))}
          aria-label="Zoom out"
          className={cn("px-3 py-2 text-base font-bold transition-colors hover:text-cyan-500", isDark ? "text-white hover:bg-white/10" : "text-slate-800 hover:bg-slate-100")}
        >−</button>
        <span className={cn("text-xs w-14 text-center tabular-nums font-mono", isDark ? "text-zinc-300" : "text-slate-600")}>
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale((s) => clamp(s * 1.3))}
          aria-label="Zoom in"
          className={cn("px-3 py-2 text-base font-bold transition-colors hover:text-cyan-500", isDark ? "text-white hover:bg-white/10" : "text-slate-800 hover:bg-slate-100")}
        >+</button>
        <div className={cn("w-px h-5", isDark ? "bg-white/10" : "bg-slate-200")} />
        <button
          onClick={reset}
          aria-label="Reset zoom"
          className={cn("text-xs px-3 py-2 transition-colors font-medium hover:text-cyan-500", isDark ? "text-zinc-400 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100")}
        >Reset</button>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden flex items-center justify-center"
        style={{ cursor: dragging ? "grabbing" : "grab", touchAction: "none" }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={() => { lastTouches.current = null; }}
      >
        <img
          referrerPolicy="no-referrer"
          src={src}
          alt={alt}
          draggable={false}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transition: dragging ? "none" : "transform 0.12s ease",
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            userSelect: "none",
            pointerEvents: "none",
          }}
          loading="lazy"
          decoding="async"
        />
      </div>

      {/* Hint bar */}
      <div className={cn("shrink-0 flex items-center justify-center gap-4 py-2 text-xs border-t transition-colors", isDark ? "text-zinc-500 bg-black/40 border-white/5" : "text-slate-500 bg-white/90 border-slate-200")}>
        <span>Scroll to zoom</span>
        <span className={cn("w-px h-3", isDark ? "bg-zinc-700" : "bg-slate-300")} />
        <span>Drag to pan</span>
        <span className={cn("w-px h-3", isDark ? "bg-zinc-700" : "bg-slate-300")} />
        <span>Pinch on touch</span>
      </div>
    </div>
  );
}

// ─── Download button with progress ───────────────────────────────────────────

function DownloadButton({
  onClick, downloading, progress, label = "Download File"
}: {
  onClick: () => void;
  downloading: boolean;
  progress: number;
  label?: string;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      onClick={onClick}
      disabled={downloading}
      aria-label={label}
      className={cn("cursor-pointer relative inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-80 disabled:cursor-not-allowed rounded-xl font-bold text-sm transition-colors overflow-hidden min-w-[160px]", isDark ? "text-[#011627]" : "text-white")}
    >
      {downloading && progress > 0 && (
        <span
          className="absolute inset-0 bg-cyan-300/40 transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      )}
      <span className="relative flex items-center gap-2">
        {downloading
          ? <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
          : <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
        }
        {downloading
          ? progress > 0 ? `Downloading ${progress}%` : "Preparing…"
          : label
        }
      </span>
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PublicMediaPage({ params }: { params: Promise<{ token: string }> }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const { token } = use(params);

  const [media, setMedia]     = useState<MediaInfo | null>(null);
  const [status, setStatus]   = useState<"loading" | "ok" | "expired" | "notfound" | "private" | "error">("loading");
  const [downloading, setDownloading] = useState(false);
  const [dlProgress, setDlProgress]   = useState(0);
  const [copied, setCopied]   = useState(false);

  const inlineUrl   = `/api/media/${token}?inline=true`;
  const downloadUrl = `/api/media/${token}`;

  useEffect(() => {
    fetch(`/api/media/${token}/info`)
      .then((r) => {
        if (r.status === 403) { setStatus("private");  return null; }
        if (r.status === 410) { setStatus("expired");  return null; }
        if (r.status === 404) { setStatus("notfound"); return null; }
        if (!r.ok)            { setStatus("error");    return null; }
        return r.json();
      })
      .then((data) => { if (data) { setMedia(data); setStatus("ok"); } })
      .catch(() => setStatus("error"));
  }, [token]);

  const handleDownload = async () => {
    setDownloading(true);
    setDlProgress(0);
    try {
      const res = await fetch(downloadUrl);
      if (!res.ok) throw new Error();

      const contentLength = res.headers.get("Content-Length");
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      let loaded = 0;
      const reader = res.body!.getReader();
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        if (total > 0) {
          setDlProgress(Math.round((loaded / total) * 100));
        }
      }

      const blob = new Blob(chunks as BlobPart[]);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = media?.originalName ?? "download";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDlProgress(100);
    } catch {
      window.location.href = downloadUrl;
    } finally {
      setDownloading(false);
      setTimeout(() => setDlProgress(0), 1000);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (status === "loading") return <PremiumLoader />;

  // ── Private ──────────────────────────────────────────────────────────────────
  if (status === "private") return (
    <div className={cn("min-h-screen flex items-center justify-center p-6 relative overflow-hidden", isDark ? "bg-[#011627]" : "bg-slate-50")}>
      {/* Background ambient cyber glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className={cn("text-center max-w-md w-full mx-auto p-8 md:p-10 rounded-3xl border backdrop-blur-xl shadow-2xl transition-all relative z-10", isDark ? "bg-[#0A0E1A]/90 border-cyan-500/20 shadow-[0_0_50px_rgba(6,182,212,0.12)]" : "bg-white border-slate-200 shadow-xl")}>
        <div className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 border transition-all",
          isDark
            ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.25)]"
            : "bg-cyan-50 border-cyan-200 text-cyan-600 shadow-sm"
        )}>
          <Lock className="w-8 h-8" />
        </div>
        <h1 className={cn("text-2xl font-extrabold mb-2.5 tracking-tight", isDark ? "text-white" : "text-slate-900")}>This File is Private</h1>
        <p className={cn("text-sm mb-7 leading-relaxed font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>
          This file is marked as <strong>Private</strong>. Only the file owner or authorized administrators can access and download this content.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 rounded-xl text-sm font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-[0_0_20px_rgba(6,182,212,0.35)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] inline-flex items-center justify-center gap-2"
          >
            Sign In to Access
          </Link>
          <Link
            href="/"
            className={cn("px-6 py-3 rounded-xl text-sm font-semibold border transition-all inline-flex items-center justify-center", isDark ? "border-white/10 text-zinc-300 hover:text-white hover:bg-white/5 hover:border-white/20" : "border-slate-200 text-slate-700 hover:bg-slate-100")}
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );

  // ── Expired ──────────────────────────────────────────────────────────────────
  if (status === "expired") return (
    <div className={cn("min-h-screen flex items-center justify-center p-6", isDark ? "bg-[#011627]" : "bg-slate-50")}>
      <div className="text-center max-w-sm">
        <Clock className="w-16 h-16 text-orange-400 mx-auto mb-4" />
        <h1 className={cn("text-2xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>Link Expired</h1>
        <p className={isDark ? "text-zinc-400" : "text-slate-500"}>This secure link has expired and is no longer accessible.</p>
      </div>
    </div>
  );

  // ── Not found / error ────────────────────────────────────────────────────────
  if (status !== "ok" || !media) return (
    <div className={cn("min-h-screen flex items-center justify-center p-6", isDark ? "bg-[#011627]" : "bg-slate-50")}>
      <div className="text-center max-w-sm">
        <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h1 className={cn("text-2xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>File Not Found</h1>
        <p className={isDark ? "text-zinc-400" : "text-slate-500"}>This link is invalid or the file has been removed.</p>
      </div>
    </div>
  );

  const type = getPreviewType(media.mimeType, media.originalName);
  const fileIconComponent = getFileIcon(media.mimeType, media.originalName);
  const hasExpiry = !!media.expiresAt;

  return (
    <div className={cn("min-h-screen flex flex-col selection:bg-cyan-500/30 transition-colors duration-300", isDark ? "bg-[#050714] text-white" : "bg-[#f8fafc] text-slate-900")}>
      {/* ── Top bar (Fixed on scroll) ────────────────────────────────────────── */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 h-16 shrink-0 flex items-center justify-between px-3 sm:px-8 backdrop-blur-xl border-b transition-colors duration-300",
          isDark
            ? "bg-[#070918]/90 border-white/10 shadow-[0_4px_25px_rgba(0,0,0,0.5)]"
            : "bg-white/90 border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
        )}
      >
        {/* File info */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
          <Link
            href="/"
            aria-label="Back to Masdika"
            title="Back to Masdika"
            className={cn("cursor-pointer shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center transition-all", isDark ? "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-zinc-400 hover:text-white" : "border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900")}
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </Link>

          <div className={cn("w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all", isDark ? "bg-cyan-500/15 border-cyan-500/25 shadow-[0_0_15px_rgba(6,182,212,0.15)]" : "bg-cyan-50 border-cyan-200 shadow-xs")}>
            {React.createElement(fileIconComponent, { className: "w-4 h-4 sm:w-5 sm:h-5 text-cyan-500", "aria-hidden": "true" })}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className={cn("font-semibold text-xs sm:text-base leading-tight truncate", isDark ? "text-white" : "text-slate-900")}>
              {media.originalName}
            </h1>
            <p className={cn("text-[11px] sm:text-xs leading-tight mt-0.5 truncate", isDark ? "text-zinc-400" : "text-slate-500")}>
              {formatBytes(media.size)} · {media.mimeType.split("/")[1]?.toUpperCase() ?? media.mimeType}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className={cn(
              "cursor-pointer w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all duration-300 border",
              isDark
                ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20"
                : "bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-200 shadow-xs"
            )}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={copyLink}
            aria-label="Copy share link"
            title={copied ? "Copied!" : "Copy Link"}
            className={cn(
              "cursor-pointer shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all border",
              copied
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                : isDark
                  ? "bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10 hover:border-white/20 hover:text-white"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-xs"
            )}
          >
            {copied ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
            ) : (
              <Link2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            )}
          </button>

          <button
            onClick={handleDownload}
            disabled={downloading}
            aria-label={`Download ${media.originalName}`}
            title={
              downloading
                ? dlProgress > 0 ? `Downloading ${dlProgress}%` : "Preparing download…"
                : `Download ${media.originalName}`
            }
            className={cn(
              "cursor-pointer relative shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all overflow-hidden",
              "bg-cyan-500 hover:bg-cyan-400 active:scale-95 disabled:opacity-80 text-[#011627] shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] border border-cyan-400/50"
            )}
          >
            {downloading && dlProgress > 0 && (
              <span
                className="absolute inset-0 bg-cyan-300/40 transition-all duration-200"
                style={{ width: `${dlProgress}%` }}
              />
            )}
            <span className="relative flex items-center justify-center">
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#011627]" aria-hidden="true" />
              ) : (
                <Download className="w-4 h-4 text-[#011627]" aria-hidden="true" />
              )}
            </span>
          </button>
        </div>
      </header>

      {/* Spacer for fixed top navbar */}
      <div className="h-16 shrink-0" aria-hidden="true" />

      {/* ── Expiry banner ─────────────────────────────────────────────────────── */}
      {hasExpiry && (
        <div className={cn("shrink-0 border-b px-4 py-2.5 flex items-center justify-center gap-2 text-xs transition-colors", isDark ? "bg-amber-500/10 border-amber-500/20 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-800")}>
          <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>This link will expire on <strong>{formatExpiry(media.expiresAt!)}</strong></span>
        </div>
      )}

      {/* ── Media Player Showcase ────────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        {/* VIDEO (Video.js Player with Cyberpunk Theme) */}
        {type === "video" && (
          <div className="w-full">
            <VideoPlayer
              src={inlineUrl}
              mimeType={media.mimeType}
              title={media.originalName}
            />
          </div>
        )}

        {/* IMAGE */}
        {type === "image" && (
          <div className="w-full">
            <ImageViewer src={inlineUrl} alt={media.originalName} />
          </div>
        )}

        {/* AUDIO */}
        {type === "audio" && (
          <div className={cn("w-full rounded-2xl border p-8 sm:p-12 flex flex-col items-center justify-center gap-6 shadow-xl transition-all", isDark ? "bg-gradient-to-b from-[#0c0f24] to-[#070914] border-white/10" : "bg-white border-slate-200")}>
            <div className={cn("w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border flex items-center justify-center transition-all", isDark ? "bg-cyan-500/10 border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.2)]" : "bg-cyan-50 border-cyan-200 shadow-sm")}>
              <FileAudio className="w-12 h-12 text-cyan-500" aria-hidden="true" />
            </div>
            <div className="text-center max-w-md">
              <p className={cn("font-semibold text-base sm:text-lg truncate", isDark ? "text-white" : "text-slate-900")}>
                {media.originalName}
              </p>
              <p className={cn("text-xs mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>
                {formatBytes(media.size)} · Audio Player
              </p>
            </div>
            <audio controls controlsList="nodownload" className="w-full max-w-lg mt-2">
              <source src={inlineUrl} type={media.mimeType} />
              Your browser does not support audio playback.
            </audio>
          </div>
        )}

        {/* DOCUMENT / OTHER FALLBACKS */}
        {type !== "video" && type !== "image" && type !== "audio" && (
          <div className={cn("w-full rounded-2xl border p-10 flex flex-col items-center justify-center gap-5 text-center shadow-lg transition-all", isDark ? "bg-[#0c0f24] border-white/10" : "bg-white border-slate-200")}>
            <div className={cn("w-20 h-20 rounded-2xl border flex items-center justify-center transition-all", isDark ? "bg-white/5 border-white/10 text-zinc-400" : "bg-slate-100 border-slate-200 text-slate-500")}>
              <FileText className="w-10 h-10" aria-hidden="true" />
            </div>
            <div className="max-w-sm">
              <p className={cn("font-bold text-lg mb-1", isDark ? "text-white" : "text-slate-900")}>{media.originalName}</p>
              <p className={cn("text-xs mb-6", isDark ? "text-zinc-400" : "text-slate-500")}>
                {formatBytes(media.size)} · Direct browser preview is not supported for this file type.
              </p>
              <DownloadButton
                onClick={handleDownload}
                downloading={downloading}
                progress={dlProgress}
                label="Download Document"
              />
            </div>
          </div>
        )}

        {/* ── ANIMATED SCROLL DOWN INDICATOR ───────────────────────────────── */}
        <div className="flex justify-center pt-5 pb-2">
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("engagement-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className={cn("group flex items-center gap-2.5 px-4 py-2 rounded-full border transition-all cursor-pointer shadow-sm", isDark ? "bg-white/5 hover:bg-cyan-500/10 border-white/10 hover:border-cyan-500/30 text-zinc-400 hover:text-cyan-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.25)]" : "bg-white hover:bg-cyan-50 border-slate-200 hover:border-cyan-300 text-slate-600 hover:text-cyan-700 hover:shadow-sm")}
          >
            <span className="font-semibold text-xs tracking-wide">
              Scroll down for reviews & discussion
            </span>
            <span className="animate-bounce inline-block text-cyan-500 font-extrabold text-xs">
              ↓
            </span>
          </button>
        </div>

        {/* ── RATINGS & DISCUSSIONS (EMAIL OTP PROTECTED) ─────────────────────── */}
        <MediaEngagement token={token} fileName={media.originalName} />
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer className={cn("mt-auto border-t py-6 text-center text-xs backdrop-blur-md transition-colors", isDark ? "border-white/5 bg-[#040612]/90 text-zinc-500" : "border-slate-200 bg-white/90 text-slate-500")}>
        Powered by{" "}
        <span className="text-cyan-500 font-semibold">
          PT Masdika Teknologi Indonesia
        </span>
      </footer>
    </div>
  );
}
