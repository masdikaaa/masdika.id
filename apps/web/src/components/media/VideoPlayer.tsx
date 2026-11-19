"use client";

import React, { useRef, useState } from "react";
import {
  Video,
  VideoPlayer as VjsVideoPlayer,
  VideoSkin,
} from "@videojs/react/video";
import "@videojs/react/video/skin.css";
import { AlertCircle, ExternalLink, Download } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

const DEFAULT_PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

interface VideoPlayerProps {
  src: string;
  mimeType: string;
  poster?: string;
  title?: string;
  downloadUrl?: string;
}

function VideoPlayerInner({
  src,
  mimeType,
  poster,
  title,
  downloadUrl,
  isDark,
}: VideoPlayerProps & { isDark: boolean }) {
  const mediaRef = useRef<HTMLVideoElement | null>(null);
  const [playbackError, setPlaybackError] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [isPortrait, setIsPortrait] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const isQuickTime =
    mimeType === "video/quicktime" ||
    (src && src.toLowerCase().includes(".mov")) ||
    (title && title.toLowerCase().endsWith(".mov"));

  const handleDimensions = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const { videoWidth, videoHeight } = e.currentTarget;
    if (videoWidth && videoHeight) {
      setIsPortrait(videoHeight > videoWidth);
    }
  };

  const handleMediaError = (fallbackCode?: number) => {
    const mediaErr = mediaRef.current?.error;
    const errCode = mediaErr?.code ?? fallbackCode;
    console.warn("Video.js playback error:", mediaErr ?? { code: errCode });
    setPlaybackError(true);
    if (errCode === 4) {
      setErrorDetails(
        "This video codec (such as iPhone HEVC / ProRes) may require your device's native media player."
      );
    } else {
      setErrorDetails("Failed to play video in this browser.");
    }
  };

  return (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden transition-all duration-300 group mx-auto",
        isPortrait
          ? "w-full max-w-[350px] sm:max-w-[390px] lg:max-w-[420px] is-portrait-video"
          : "w-full",
        isDark
          ? "border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.7)] bg-[#050610]"
          : "border border-slate-200 shadow-[0_10px_35px_rgba(0,0,0,0.12)] bg-black"
      )}
    >
      {/* Title watermark on top-left overlay */}
      {title && (
        <div
          className={cn(
            "absolute top-3 left-3 sm:top-4 sm:left-4 z-20 pointer-events-none transition-opacity duration-300 max-w-[calc(100%-1.5rem)]",
            !isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <div className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[11px] sm:text-xs font-medium text-zinc-200 truncate shadow-sm">
            {title}
          </div>
        </div>
      )}

      {/* Fallback Overlay if Codec is completely unsupported by browser */}
      {playbackError && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-[#03040b]/95 backdrop-blur-md text-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3 sm:mb-4 shadow-[0_0_25px_rgba(245,158,11,0.2)]">
            <AlertCircle className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white mb-2">
            Native Player Required
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mb-5 sm:mb-6 leading-relaxed">
            {errorDetails ||
              "This video format (.mov) requires your device's built-in media player."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 font-semibold text-xs flex items-center gap-2 transition-all shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in Native Player
            </a>
            {downloadUrl && (
              <a
                href={downloadUrl}
                download
                className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium text-xs border border-white/15 flex items-center gap-2 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Download Original Video
              </a>
            )}
          </div>
        </div>
      )}

      {/* Video.js 10 Player */}
      <div
        className={cn(
          "w-full relative overflow-hidden",
          isPortrait
            ? "aspect-[9/16] max-h-[calc(100dvh-11.5rem)] sm:max-h-[75vh]"
            : "aspect-video max-h-[calc(100dvh-11.5rem)] sm:max-h-[75vh]"
        )}
      >
        <VjsVideoPlayer
          poster={poster || undefined}
          defaultPlaybackRates={DEFAULT_PLAYBACK_RATES}
        >
          <VideoSkin className="vjs-theme-masdika w-full h-full">
            <Video
              ref={mediaRef}
              playsInline
              preload="metadata"
              onLoadedMetadata={handleDimensions}
              onLoadedData={handleDimensions}
              onResize={handleDimensions}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              onError={() => handleMediaError()}
            >
              {isQuickTime ? (
                <>
                  <source src={src} type="video/mp4" />
                  <source
                    src={src}
                    type="video/quicktime"
                    onError={() => handleMediaError(4)}
                  />
                </>
              ) : (
                <source
                  src={src}
                  type={mimeType || "video/mp4"}
                  onError={() => handleMediaError()}
                />
              )}
            </Video>
          </VideoSkin>
        </VjsVideoPlayer>
      </div>

      {/* Custom Theme Styles for Masdika Dark & Cyan Glow */}
      <style jsx global>{`
        .vjs-theme-masdika.media-skin {
          --media-background: #03040b;
          --media-foreground: #f1f5f9;
          --media-controls-foreground: #f1f5f9;
          --media-primary: #22d3ee;
          --media-primary-foreground: #020617;
          --media-accent-color: #22d3ee;
          --media-accent-text-color: #020617;
          --media-accent: rgba(6, 182, 212, 0.22);
          --media-accent-foreground: #38bdf8;
          --media-popover: rgba(10, 15, 30, 0.88);
          --media-popover-foreground: #f1f5f9;
          --media-border-color: rgba(255, 255, 255, 0.08);
          --media-surface-border: rgba(255, 255, 255, 0.12);
          --media-ring: #22d3ee;
          --media-border-radius: 0px;
          --media-video-border-radius: 0px;
          --media-shadow-thumb: 0 0 10px rgba(6, 182, 212, 0.9), 0 0 3px #ffffff;
          font-family: inherit;
        }

        .vjs-theme-masdika .video-controls-center-play {
          border: 2px solid rgba(34, 211, 238, 0.8) !important;
          box-shadow: 0 0 30px rgba(6, 182, 212, 0.45), inset 0 0 14px rgba(255, 255, 255, 0.25) !important;
        }

        .vjs-theme-masdika .media-slider-fill:before {
          background: linear-gradient(90deg, #06b6d4, #38bdf8) !important;
          box-shadow: 0 0 12px rgba(6, 182, 212, 0.55);
        }

        /* Defer error UI to Masdika's localized codec fallback overlay */
        .vjs-theme-masdika .media-dialog-backdrop,
        .vjs-theme-masdika .media-dialog-popup {
          display: none !important;
        }

        .is-portrait-video .vjs-theme-masdika.media-skin {
          --media-scale: 0.9;
        }

        @media (max-width: 640px) {
          .vjs-theme-masdika.media-skin {
            --media-scale: 0.88;
          }
        }
      `}</style>
    </div>
  );
}

export function VideoPlayer(props: VideoPlayerProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const resetKey = `${props.src}|${props.mimeType}|${props.poster ?? ""}|${props.title ?? ""}`;

  return <VideoPlayerInner key={resetKey} {...props} isDark={isDark} />;
}
