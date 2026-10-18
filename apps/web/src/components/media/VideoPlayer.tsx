"use client";

import React, { useEffect, useRef, useState } from "react";
import videojs from "video.js";
import type Player from "video.js/dist/types/player";
import "video.js/dist/video-js.css";
import { AlertCircle, ExternalLink, Download } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  src: string;
  mimeType: string;
  poster?: string;
  title?: string;
  downloadUrl?: string;
}

export function VideoPlayer({ src, mimeType, poster, title, downloadUrl }: VideoPlayerProps) {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const [playbackError, setPlaybackError] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    // Ensure container element exists
    if (!videoRef.current) return;

    setPlaybackError(false);
    setErrorDetails(null);

    // Create video element dynamically for clean disposal and hot reloading in React 19
    const videoElement = document.createElement("video-js");
    videoElement.classList.add("vjs-big-play-centered", "vjs-theme-masdika");
    videoElement.setAttribute("playsinline", "true");
    videoElement.setAttribute("webkit-playsinline", "true");
    videoRef.current.appendChild(videoElement);

    const isQuickTime =
      mimeType === "video/quicktime" ||
      (src && src.toLowerCase().includes(".mov")) ||
      (title && title.toLowerCase().endsWith(".mov"));

    // QuickTime (.mov) shares the ISO-BMFF container with MP4.
    // Modern browsers (Chrome on Android/Desktop, Firefox) do NOT support "video/quicktime"
    // as an HTML5 video MIME type and will reject it with MEDIA_ERR_SRC_NOT_SUPPORTED.
    // Providing "video/mp4" as the primary source allows browsers to use their ISO-BMFF demuxer.
    const sources = isQuickTime
      ? [
          { src, type: "video/mp4" },
          { src, type: "video/quicktime" },
        ]
      : [
          { src, type: mimeType || "video/mp4" },
        ];

    const player = videojs(
      videoElement,
      {
        autoplay: false,
        controls: true,
        responsive: true,
        fluid: true,
        preload: "metadata",
        poster: poster || undefined,
        playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
        userActions: {
          hotkeys: true,
        },
        html5: {
          vhs: {
            overrideNative: false,
          },
          nativeAudioTracks: true,
          nativeVideoTracks: true,
        },
        controlBar: {
          children: [
            "playToggle",
            "volumePanel",
            "currentTimeDisplay",
            "timeDivider",
            "durationDisplay",
            "progressControl",
            "playbackRateMenuButton",
            "pictureInPictureToggle",
            "fullscreenToggle",
          ],
        },
        sources,
      },
      () => {
        // Player ready
      }
    );

    player.on("error", () => {
      const err = player.error();
      console.warn("Video.js playback error:", err);
      setPlaybackError(true);
      if (err?.code === 4) {
        setErrorDetails("Codec video (seperti HEVC / ProRes iPhone) mungkin memerlukan pemutar bawaan perangkat Anda.");
      } else {
        setErrorDetails("Gagal memutar video di browser ini.");
      }
    });

    playerRef.current = player;

    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, [src, mimeType, poster, title]);

  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={cn(
        "relative w-full rounded-2xl overflow-hidden transition-all group",
        isDark
          ? "border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.7)] bg-[#050610]"
          : "border border-slate-200 shadow-[0_10px_35px_rgba(0,0,0,0.12)] bg-black"
      )}
    >
      {/* Title watermark on top-left overlay */}
      {title && (
        <div className="absolute top-4 left-4 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-xs font-medium text-zinc-200 truncate max-w-sm">
            {title}
          </div>
        </div>
      )}

      {/* Fallback Overlay if Codec is completely unsupported by browser */}
      {playbackError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-[#03040b]/95 backdrop-blur-md text-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3 sm:mb-4 shadow-[0_0_25px_rgba(245,158,11,0.2)]">
            <AlertCircle className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white mb-2">
            Perlu Pemutar Bawaan Perangkat
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mb-5 sm:mb-6 leading-relaxed">
            {errorDetails || "Format file iPhone (.mov) ini membutuhkan pemutar sistem bawaan perangkat Anda."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Buka di Pemutar Bawaan
            </a>
            {downloadUrl && (
              <a
                href={downloadUrl}
                download
                className="px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium text-xs sm:text-sm border border-white/15 flex items-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" />
                Unduh Video Asli
              </a>
            )}
          </div>
        </div>
      )}

      {/* Video.js container */}
      <div ref={videoRef} className="w-full aspect-video" />

      {/* Custom Theme Styles for Masdika Dark & Cyan Glow */}
      <style jsx global>{`
        .vjs-theme-masdika.video-js {
          font-family: inherit;
          color: #f1f5f9;
          background-color: #03040b;
        }

        /* Big Play Button Exactly in Center */
        .vjs-theme-masdika .vjs-big-play-button {
          position: absolute !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          margin: 0 !important;
          margin-top: 0 !important;
          margin-left: 0 !important;
          width: 76px !important;
          height: 76px !important;
          line-height: 76px !important;
          font-size: 38px !important;
          border-radius: 9999px !important;
          border: 2px solid rgba(6, 182, 212, 0.75) !important;
          background: rgba(10, 15, 30, 0.75) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          color: #22d3ee !important;
          box-shadow: 0 0 30px rgba(6, 182, 212, 0.35), inset 0 0 15px rgba(6, 182, 212, 0.2) !important;
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
        }

        .vjs-theme-masdika:hover .vjs-big-play-button,
        .vjs-theme-masdika .vjs-big-play-button:hover,
        .vjs-theme-masdika .vjs-big-play-button:focus {
          transform: translate(-50%, -50%) scale(1.1) !important;
          border-color: #06b6d4 !important;
          background: rgba(6, 182, 212, 0.25) !important;
          color: #ffffff !important;
          box-shadow: 0 0 45px rgba(6, 182, 212, 0.6), inset 0 0 20px rgba(6, 182, 212, 0.3) !important;
        }

        /* HIDE big play button ONLY while video is actively playing */
        .vjs-theme-masdika.vjs-playing .vjs-big-play-button {
          display: none !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }

        /* SHOW big play button when paused, ended, or before playback has started */
        .vjs-theme-masdika.vjs-paused .vjs-big-play-button,
        .vjs-theme-masdika.vjs-ended .vjs-big-play-button,
        .vjs-theme-masdika:not(.vjs-has-started) .vjs-big-play-button {
          display: flex !important;
          opacity: 1 !important;
          pointer-events: auto !important;
        }

        .vjs-theme-masdika .vjs-big-play-button .vjs-icon-placeholder {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 100% !important;
          height: 100% !important;
        }

        .vjs-theme-masdika .vjs-big-play-button .vjs-icon-placeholder:before {
          position: static !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 100% !important;
          height: 100% !important;
          line-height: 1 !important;
          padding-left: 3px !important;
        }

        /* Control Bar Bottom */
        .vjs-theme-masdika .vjs-control-bar {
          background: linear-gradient(180deg, transparent 0%, rgba(5, 7, 20, 0.88) 30%, rgba(3, 4, 12, 0.96) 100%) !important;
          backdrop-filter: blur(16px) !important;
          -webkit-backdrop-filter: blur(16px) !important;
          height: 48px !important;
          padding: 0 10px !important;
          border-top: 1px solid rgba(255, 255, 255, 0.06) !important;
          display: flex !important;
          align-items: center !important;
        }

        /* Progress Control (Skip / Seek Bar) Centered in Control Bar */
        .vjs-theme-masdika .vjs-progress-control {
          display: flex !important;
          align-items: center !important;
          height: 100% !important;
          flex: 1 1 auto !important;
          margin: 0 10px !important;
          cursor: pointer !important;
          position: relative !important;
        }

        .vjs-theme-masdika .vjs-progress-control .vjs-progress-holder {
          cursor: pointer !important;
          height: 6px !important;
          width: 100% !important;
          margin: 0 !important;
          border-radius: 9999px !important;
          transition: height 0.15s ease !important;
          position: relative !important;
          background-color: rgba(255, 255, 255, 0.12) !important;
          display: flex !important;
          align-items: center !important;
        }

        .vjs-theme-masdika .vjs-progress-control:hover .vjs-progress-holder {
          height: 8px !important;
        }

        /* Play Progress Slider */
        .vjs-theme-masdika .vjs-play-progress {
          height: 100% !important;
          top: 0 !important;
          bottom: 0 !important;
          background: linear-gradient(90deg, #06b6d4, #38bdf8) !important;
          box-shadow: 0 0 12px rgba(6, 182, 212, 0.5) !important;
          border-radius: 9999px !important;
          position: absolute !important;
        }

        /* Scrubber Handle Knob (Centered Circle) */
        .vjs-theme-masdika .vjs-play-progress:before {
          content: "" !important;
          position: absolute !important;
          top: 50% !important;
          right: -7px !important;
          transform: translateY(-50%) !important;
          width: 14px !important;
          height: 14px !important;
          border-radius: 9999px !important;
          background: #ffffff !important;
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.9), 0 0 3px rgba(255, 255, 255, 1) !important;
          transition: width 0.15s ease, height 0.15s ease, right 0.15s ease !important;
          z-index: 10 !important;
        }

        .vjs-theme-masdika .vjs-progress-control:hover .vjs-play-progress:before {
          width: 16px !important;
          height: 16px !important;
          right: -8px !important;
          box-shadow: 0 0 15px rgba(6, 182, 212, 1), 0 0 4px rgba(255, 255, 255, 1) !important;
        }

        /* Load Progress (Buffered) */
        .vjs-theme-masdika .vjs-load-progress {
          height: 100% !important;
          top: 0 !important;
          bottom: 0 !important;
          background: rgba(255, 255, 255, 0.2) !important;
          border-radius: 9999px !important;
          position: absolute !important;
        }

        .vjs-theme-masdika .vjs-slider {
          background-color: rgba(255, 255, 255, 0.12) !important;
          border-radius: 9999px !important;
        }

        /* Volume Panel & Bar Centered on Same Axis as Progress Bar */
        .vjs-theme-masdika .vjs-volume-panel {
          display: flex !important;
          align-items: center !important;
          height: 100% !important;
        }

        .vjs-theme-masdika .vjs-mute-control {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          height: 100% !important;
          width: 36px !important;
        }

        .vjs-theme-masdika .vjs-volume-control,
        .vjs-theme-masdika .vjs-volume-control.vjs-volume-horizontal {
          display: flex !important;
          align-items: center !important;
          height: 100% !important;
          margin: 0 !important;
        }

        .vjs-theme-masdika .vjs-volume-bar,
        .vjs-theme-masdika .vjs-volume-bar.vjs-slider-horizontal {
          cursor: pointer !important;
          height: 6px !important;
          width: 56px !important;
          margin: 0 10px 0 2px !important;
          border-radius: 9999px !important;
          background-color: rgba(255, 255, 255, 0.12) !important;
          position: relative !important;
          display: flex !important;
          align-items: center !important;
          transition: height 0.15s ease, width 0.15s ease !important;
        }

        .vjs-theme-masdika .vjs-volume-control:hover .vjs-volume-bar,
        .vjs-theme-masdika .vjs-volume-panel:hover .vjs-volume-bar {
          height: 8px !important;
        }

        /* Volume Level Slider Fill */
        .vjs-theme-masdika .vjs-volume-bar .vjs-volume-level {
          height: 100% !important;
          top: 0 !important;
          bottom: 0 !important;
          left: 0 !important;
          background: linear-gradient(90deg, #06b6d4, #38bdf8) !important;
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.5) !important;
          border-radius: 9999px !important;
          position: absolute !important;
        }

        /* Volume Scrubber Knob (Centered Circle matching Progress Knob) */
        .vjs-theme-masdika .vjs-volume-bar .vjs-volume-level:before {
          content: "" !important;
          position: absolute !important;
          top: 50% !important;
          right: -6px !important;
          transform: translateY(-50%) !important;
          width: 12px !important;
          height: 12px !important;
          border-radius: 9999px !important;
          background: #ffffff !important;
          box-shadow: 0 0 8px rgba(6, 182, 212, 0.9), 0 0 2px rgba(255, 255, 255, 1) !important;
          transition: width 0.15s ease, height 0.15s ease, right 0.15s ease !important;
          z-index: 10 !important;
        }

        .vjs-theme-masdika .vjs-volume-control:hover .vjs-volume-level:before,
        .vjs-theme-masdika .vjs-volume-panel:hover .vjs-volume-level:before {
          width: 14px !important;
          height: 14px !important;
          right: -7px !important;
          box-shadow: 0 0 12px rgba(6, 182, 212, 1), 0 0 3px rgba(255, 255, 255, 1) !important;
        }

        /* Hide conflicting SVG icons inside scrubber levels */
        .vjs-theme-masdika .vjs-volume-level .vjs-svg-icon,
        .vjs-theme-masdika .vjs-play-progress .vjs-svg-icon {
          display: none !important;
        }

        /* Buttons & Icons */
        .vjs-theme-masdika .vjs-button {
          height: 48px !important;
          width: 38px !important;
        }

        .vjs-theme-masdika .vjs-button > .vjs-icon-placeholder:before {
          font-size: 20px;
          line-height: 48px;
          color: #cbd5e1;
          transition: color 0.15s ease, transform 0.15s ease;
        }

        .vjs-theme-masdika .vjs-button:hover > .vjs-icon-placeholder:before {
          color: #38bdf8;
          text-shadow: 0 0 12px rgba(6, 182, 212, 0.6);
        }

        /* Playback Rate Button (1x, 1.25x, etc.) Centered & Aligned */
        .vjs-theme-masdika .vjs-playback-rate,
        .vjs-theme-masdika .vjs-playback-rate .vjs-button {
          position: relative !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          height: 48px !important;
          width: 38px !important;
          margin: 0 !important;
          padding: 0 !important;
          cursor: pointer !important;
          border: none !important;
          background: transparent !important;
        }

        .vjs-theme-masdika .vjs-playback-rate .vjs-playback-rate-value {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100% !important;
          height: 100% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-family: inherit !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          line-height: 48px !important;
          color: #cbd5e1 !important;
          text-align: center !important;
          pointer-events: none !important;
          margin: 0 !important;
          padding: 0 !important;
          transition: color 0.15s ease, text-shadow 0.15s ease !important;
        }

        .vjs-theme-masdika .vjs-playback-rate:hover .vjs-playback-rate-value,
        .vjs-theme-masdika .vjs-playback-rate:focus .vjs-playback-rate-value {
          color: #38bdf8 !important;
          text-shadow: 0 0 12px rgba(6, 182, 212, 0.6) !important;
        }

        /* Picture in Picture & Fullscreen Controls Alignment */
        .vjs-theme-masdika .vjs-picture-in-picture-control,
        .vjs-theme-masdika .vjs-fullscreen-control {
          height: 48px !important;
          width: 38px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        /* Time Display */
        .vjs-theme-masdika .vjs-time-control {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 12px;
          line-height: 48px;
          color: #94a3b8;
          display: flex !important;
          align-items: center !important;
          padding: 0 4px !important;
        }

        /* Menu / Dropdown Settings */
        .vjs-theme-masdika .vjs-menu-button-popup .vjs-menu {
          margin-bottom: 8px;
        }

        .vjs-theme-masdika .vjs-menu-content {
          background: rgba(10, 15, 30, 0.95);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.6);
          padding: 6px;
        }

        .vjs-theme-masdika .vjs-menu-item {
          border-radius: 8px;
          font-size: 12px;
          padding: 6px 12px;
          transition: all 0.15s ease;
        }

        .vjs-theme-masdika .vjs-menu-item:hover {
          background: rgba(6, 182, 212, 0.2);
          color: #38bdf8;
        }

        .vjs-theme-masdika .vjs-menu-item.vjs-selected {
          background: #06b6d4;
          color: #011627;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}
