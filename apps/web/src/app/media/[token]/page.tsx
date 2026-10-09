"use client";

import React, { useState, useEffect, useRef, use } from "react";
import {
  Download, FileImage, FileVideo, FileAudio, FileText,
  File, Presentation, AlertTriangle, Clock, CheckCircle2, Loader2, Link2, ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MediaInfo {
  id: number;
  originalName: string;
  mimeType: string;
  size: number;
  expiresAt: string | null;
  token: string;
}

type PreviewType = "image" | "video" | "audio" | "pdf" | "text" | "office" | "none";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPreviewType(mimeType: string, originalName: string): PreviewType {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  // PDF, text, office — no browser preview, show download card
  return "none";
}

function getFileIcon(mimeType: string, originalName: string) {
  switch (getPreviewType(mimeType, originalName)) {
    case "image":  return FileImage;
    case "video":  return FileVideo;
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

  // Scroll-wheel zoom — zoom toward cursor position
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

  // Mouse drag
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

  // Touch: pinch-to-zoom + one-finger pan
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
    <div className="relative w-full h-full flex flex-col select-none">
      {/* Zoom controls — floating top-right */}
      <div className={cn("absolute top-3 right-3 z-20 flex items-center gap-0.5 backdrop-blur-md rounded-xl overflow-hidden border shadow-lg", isDark ? "bg-black/70 border-white/10" : "bg-white/90 border-slate-200")}>
        <button
          onClick={() => setScale((s) => clamp(s / 1.3))}
          aria-label="Zoom out"
          className={cn("px-3 py-2 text-base font-bold transition-colors hover:text-cyan-400", isDark ? "text-white hover:bg-white/10" : "text-slate-700 hover:bg-slate-100")}
        >−</button>
        <span className={cn("text-xs w-14 text-center tabular-nums font-mono", isDark ? "text-zinc-300" : "text-slate-600")}>
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale((s) => clamp(s * 1.3))}
          aria-label="Zoom in"
          className={cn("px-3 py-2 text-base font-bold transition-colors hover:text-cyan-400", isDark ? "text-white hover:bg-white/10" : "text-slate-700 hover:bg-slate-100")}
        >+</button>
        <div className={cn("w-px h-5", isDark ? "bg-white/10" : "bg-slate-200")} />
        <button
          onClick={reset}
          aria-label="Reset zoom"
          className={cn("text-xs px-3 py-2 transition-colors font-medium hover:text-cyan-400", isDark ? "text-zinc-400 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100")}
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
        <img referrerPolicy="no-referrer"           src={src}
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
        loading="lazy" decoding="async" />
      </div>

      {/* Hint bar */}
      <div className={cn("shrink-0 flex items-center justify-center gap-4 py-2.5 text-xs border-t", isDark ? "text-zinc-500 bg-black/30 border-white/5" : "text-slate-500 bg-slate-50 border-slate-200")}>
        <span>Scroll to zoom</span>
        <span className={cn("w-px h-3", isDark ? "bg-zinc-700" : "bg-slate-300")} />
        <span>Drag to pan</span>
        <span className={cn("w-px h-3", isDark ? "bg-zinc-700" : "bg-slate-300")} />
        <span>Pinch on touch</span>
      </div>
    </div>
  );
}

// ─── Text preview ─────────────────────────────────────────────────────────────

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
      {/* Progress fill background */}
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
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { token } = use(params);

  const [media, setMedia]     = useState<MediaInfo | null>(null);
  const [status, setStatus]   = useState<"loading" | "ok" | "expired" | "notfound" | "error">("loading");
  const [downloading, setDownloading] = useState(false);
  const [dlProgress, setDlProgress]   = useState(0);
  const [copied, setCopied]   = useState(false);

  const inlineUrl   = `/api/media/${token}?inline=true`;
  const downloadUrl = `/api/media/${token}`;

  useEffect(() => {
    fetch(`/api/media/${token}/info`)
      .then((r) => {
        if (r.status === 410) { setStatus("expired"); return null; }
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

      // Track progress via ReadableStream if Content-Length is available
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
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (status === "loading") return (
    <div className={cn("h-screen flex items-center justify-center", isDark ? "bg-[#011627]" : "bg-slate-50")}>
      <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
    </div>
  );

  // ── Expired ──────────────────────────────────────────────────────────────────
  if (status === "expired") return (
    <div className={cn("h-screen flex items-center justify-center p-6", isDark ? "bg-[#011627]" : "bg-slate-50")}>
      <div className="text-center max-w-sm">
        <Clock className="w-16 h-16 text-orange-400 mx-auto mb-4" />
        <h1 className={cn("text-2xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>Link Expired</h1>
        <p className={isDark ? "text-zinc-400" : "text-slate-500"}>This secure link has expired and is no longer accessible.</p>
      </div>
    </div>
  );

  // ── Not found / error ────────────────────────────────────────────────────────
  if (status !== "ok" || !media) return (
    <div className={cn("h-screen flex items-center justify-center p-6", isDark ? "bg-[#011627]" : "bg-slate-50")}>
      <div className="text-center max-w-sm">
        <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h1 className={cn("text-2xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>File Not Found</h1>
        <p className={isDark ? "text-zinc-400" : "text-slate-500"}>This link is invalid or the file has been removed.</p>
      </div>
    </div>
  );

  const type     = getPreviewType(media.mimeType, media.originalName);
  const fileIconComponent = getFileIcon(media.mimeType, media.originalName);

  // How tall is the chrome above the preview area?
  // header = 56px (h-14), expiry banner = 36px (only when present)
  const hasExpiry   = !!media.expiresAt;
  const footerH     = 48;  // h-12
  const headerH     = 64;  // h-16
  const expiryH     = hasExpiry ? 36 : 0;
  const previewH    = `calc(100vh - ${headerH + expiryH + footerH}px)`;

  return (
    // h-screen + overflow-hidden so nothing overflows and forces a scrollbar
    <div className={cn("h-screen flex flex-col overflow-hidden", isDark ? "bg-[#011627]" : "bg-white")}>

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <header
        className={cn("h-16 shrink-0 flex items-center justify-between px-4 sm:px-6 backdrop-blur-md border-b", isDark ? "bg-[#020f1a]/90 border-white/5" : "bg-white/90 border-slate-200")}
      >
        {/* File info */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            aria-label="Back to Masdika"
            title="Back to Masdika"
            className={cn("cursor-pointer shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center transition-all", isDark ? "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-zinc-400 hover:text-white" : "bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-500 hover:text-slate-900")}
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center shrink-0">
            {React.createElement(fileIconComponent, { className: "w-5 h-5 text-cyan-400", "aria-hidden": "true" })}
          </div>
          <div className="min-w-0">
            <p className={cn("font-semibold text-base leading-tight truncate max-w-[160px] sm:max-w-xs md:max-w-md lg:max-w-lg", isDark ? "text-white" : "text-slate-900")}>
              {media.originalName}
            </p>
            <p className={cn("text-xs leading-tight mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
              {formatBytes(media.size)}&nbsp;·&nbsp;
              {media.mimeType.split("/")[1]?.toUpperCase() ?? media.mimeType}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <button
            onClick={copyLink}
            aria-label="Copy share link"
            className={`cursor-pointer flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                        font-semibold transition-all border
                        ${copied
                          ? (isDark ? "bg-green-500/20 text-green-400 border-green-500/20" : "bg-green-50 text-green-600 border-green-200")
                          : (isDark ? "bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10 hover:text-white" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900")}`}
          >
            {copied
              ? <><CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" /><span className="hidden sm:inline">Copied</span></>
              : <><Link2 className="w-4 h-4 shrink-0" aria-hidden="true" /><span className="hidden sm:inline">Copy Link</span></>
            }
          </button>

          <button
            onClick={handleDownload}
            disabled={downloading}
            aria-label={`Download ${media.originalName}`}
            className={cn("cursor-pointer relative flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-80 disabled:cursor-not-allowed rounded-lg text-sm font-bold transition-colors overflow-hidden", isDark ? "text-[#011627]" : "text-white")}
          >
            {/* Progress fill */}
            {downloading && dlProgress > 0 && (
              <span
                className="absolute inset-0 bg-cyan-300/40 transition-all duration-200"
                style={{ width: `${dlProgress}%` }}
              />
            )}
            <span className="relative flex items-center gap-2">
              {downloading
                ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                : <Download className="w-4 h-4" aria-hidden="true" />
              }
              <span className="hidden sm:inline">
                {downloading
                  ? dlProgress > 0 ? `${dlProgress}%` : "Preparing…"
                  : "Download"
                }
              </span>
            </span>
          </button>
        </div>
      </header>

      {/* ── Expiry banner ─────────────────────────────────────────────────────── */}
      {hasExpiry && (
        <div className="shrink-0 bg-orange-500/10 border-b border-orange-500/20
                        px-4 py-2 flex items-center gap-2 text-xs text-orange-300">
          <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          Expires on {formatExpiry(media.expiresAt!)}
        </div>
      )}

      {/* ── Preview ───────────────────────────────────────────────────────────── */}
      <main
        className="shrink-0 overflow-hidden"
        style={{ height: previewH }}
      >
        {/* IMAGE */}
        {type === "image" && (
          <div className={cn("w-full h-full", isDark ? "bg-zinc-950" : "bg-slate-100")}>
            <ImageViewer src={inlineUrl} alt={media.originalName} />
          </div>
        )}

        {/* VIDEO */}
        {type === "video" && (
          <div className={cn("w-full h-full flex items-center justify-center p-2 sm:p-4", isDark ? "bg-black" : "bg-slate-100")}>
            <video
              controls
              controlsList="nodownload"
              className="max-w-full max-h-full rounded-lg"
              onContextMenu={(e) => e.preventDefault()}
            >
              <source src={inlineUrl} type={media.mimeType} />
              Your browser does not support video playback.
            </video>
          </div>
        )}

        {/* AUDIO */}
        {type === "audio" && (
          <div className={cn("w-full h-full flex flex-col items-center justify-center gap-5 p-6", isDark ? "bg-black/20" : "bg-slate-50")}>
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <FileAudio className="w-14 h-14 sm:w-20 sm:h-20 text-cyan-400/60" aria-hidden="true" />
            </div>
            <p className={cn("font-semibold text-sm sm:text-base text-center px-4 max-w-sm truncate", isDark ? "text-white" : "text-slate-900")}>
              {media.originalName}
            </p>
            <audio controls controlsList="nodownload" className="w-full max-w-sm sm:max-w-lg">
              <source src={inlineUrl} type={media.mimeType} />
              Your browser does not support audio playback.
            </audio>
          </div>
        )}

        {/* PDF — no preview, download only */}
        {type === "pdf" && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-5 p-8 text-center">
            <div className={cn("w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border flex items-center justify-center", isDark ? "bg-zinc-800/50 border-white/5" : "bg-white shadow-sm border-slate-200")}>
              <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-500" aria-hidden="true" />
            </div>
            <div className="max-w-xs">
              <p className={cn("font-semibold text-lg mb-1", isDark ? "text-white" : "text-slate-900")}>PDF File</p>
              <p className={cn("text-sm mb-5", isDark ? "text-zinc-400" : "text-slate-500")}>Download to open in your PDF viewer.</p>
              <DownloadButton onClick={handleDownload} downloading={downloading} progress={dlProgress} label="Download PDF" />
            </div>
          </div>
        )}

        {/* TEXT / CODE — no preview */}
        {type === "text" && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-5 p-8 text-center">
            <div className={cn("w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border flex items-center justify-center", isDark ? "bg-zinc-800/50 border-white/5" : "bg-white shadow-sm border-slate-200")}>
              <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-500" aria-hidden="true" />
            </div>
            <div className="max-w-xs">
              <p className={cn("font-semibold text-lg mb-1", isDark ? "text-white" : "text-slate-900")}>Text File</p>
              <p className={cn("text-sm mb-5", isDark ? "text-zinc-400" : "text-slate-500")}>Download to open in your text editor.</p>
              <DownloadButton onClick={handleDownload} downloading={downloading} progress={dlProgress} />
            </div>
          </div>
        )}

        {/* OFFICE — no preview */}
        {type === "office" && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-5 p-8 text-center">
            <div className={cn("w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border flex items-center justify-center", isDark ? "bg-zinc-800/50 border-white/5" : "bg-white shadow-sm border-slate-200")}>
              <Presentation className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-500" aria-hidden="true" />
            </div>
            <div className="max-w-xs">
              <p className={cn("font-semibold text-lg mb-1", isDark ? "text-white" : "text-slate-900")}>Office Document</p>
              <p className={cn("text-sm mb-5", isDark ? "text-zinc-400" : "text-slate-500")}>Download to open in your office app.</p>
              <DownloadButton onClick={handleDownload} downloading={downloading} progress={dlProgress} />
            </div>
          </div>
        )}

        {/* NO PREVIEW */}
        {type === "none" && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-5 p-8 text-center">
            <div className={cn("w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border flex items-center justify-center", isDark ? "bg-zinc-800/50 border-white/5" : "bg-white shadow-sm border-slate-200")}>
              <File className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-500" aria-hidden="true" />
            </div>
            <div className="max-w-xs">
              <p className={cn("font-semibold text-lg mb-1", isDark ? "text-white" : "text-slate-900")}>No preview available</p>
              <p className={cn("text-sm mb-5", isDark ? "text-zinc-400" : "text-slate-500")}>
                This file type cannot be previewed in the browser.
              </p>
              <DownloadButton onClick={handleDownload} downloading={downloading} progress={dlProgress} />
            </div>
            <p className={cn("text-xs", isDark ? "text-zinc-600" : "text-slate-400")}>{formatBytes(media.size)} · {media.mimeType}</p>
          </div>
        )}
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer
        className={cn("h-12 shrink-0 flex items-center justify-center border-t text-xs backdrop-blur-md", isDark ? "border-white/5 text-zinc-500 bg-[#020f1a]/90" : "border-slate-200 text-slate-500 bg-white/90")}
      >
        Powered by&nbsp;<span className="text-cyan-600 font-semibold">PT Masdika Teknologi Indonesia</span>
      </footer>
    </div>
  );
}
