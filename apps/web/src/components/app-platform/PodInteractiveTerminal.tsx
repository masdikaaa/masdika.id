"use client";

import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { AlertCircle, Loader2, RefreshCw, Terminal as TerminalIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PodInteractiveTerminalProps {
  appId: number | string;
  subdomain: string;
  isRunning: boolean;
  isDark: boolean;
  quickCommand?: { cmd: string; nonce: number } | null;
  onSwitchToOneShot?: () => void;
}

export default function PodInteractiveTerminal({
  appId,
  subdomain,
  isRunning,
  isDark,
  quickCommand,
  onSwitchToOneShot,
}: PodInteractiveTerminalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "disconnected" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [reconnectTick, setReconnectTick] = useState(0);

  // Send preset command directly into active PTY when connected
  useEffect(() => {
    if (!quickCommand?.cmd || status !== "connected") return;
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "input", data: `${quickCommand.cmd}\r` }));
      termRef.current?.focus();
    }
  }, [quickCommand, status]);

  useEffect(() => {
    if (!isRunning || !containerRef.current) {
      setStatus("idle");
      return;
    }

    const term = new Terminal({
      cursorBlink: true,
      disableStdin: true,
      fontSize: 13,
      lineHeight: 1.35,
      fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      scrollback: 5000,
      theme: {
        background: "#090d16",
        foreground: "#e2e8f0",
        cursor: "#22d3ee",
        selectionBackground: "rgba(34, 211, 238, 0.25)",
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitRef.current = fitAddon;

    setStatus("connecting");
    setStatusMsg(`Connecting to ${subdomain} Linux PTY...`);

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${proto}//${window.location.host}/api/app-platform-shell?appId=${encodeURIComponent(String(appId))}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    const sendResize = () => {
      try {
        fitAddon.fit();
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
        }
      } catch {}
    };

    const enableInteractive = (podLabel?: string) => {
      term.options.disableStdin = false;
      setStatus("connected");
      setStatusMsg(podLabel ? `PTY: ${podLabel}` : "Live PTY");
      sendResize();
      term.focus();
    };

    ws.onopen = () => {
      setStatusMsg("Initializing shell...");
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === "data" && typeof msg.data === "string") {
          if (term.options.disableStdin) {
            enableInteractive();
          }
          term.write(msg.data);
        } else if (msg.type === "ready") {
          enableInteractive(msg.podName);
        } else if (msg.type === "error") {
          term.options.disableStdin = true;
          setStatus("error");
          setStatusMsg(msg.message || "Failed to attach container PTY");
        } else if (msg.type === "exit") {
          term.options.disableStdin = true;
          setStatus("disconnected");
          setStatusMsg("Shell session closed");
        }
      } catch {}
    };

    ws.onerror = () => {
      term.options.disableStdin = true;
      setStatus("error");
      setStatusMsg("WebSocket PTY connection failed. Check reverse proxy / server WebSocket support.");
    };

    ws.onclose = () => {
      term.options.disableStdin = true;
      setStatus((prev) => (prev === "error" ? "error" : "disconnected"));
    };

    const dataDisposable = term.onData((data) => {
      if (!term.options.disableStdin && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "input", data }));
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      sendResize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      dataDisposable.dispose();
      try {
        ws.close();
      } catch {}
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
      wsRef.current = null;
    };
  }, [appId, subdomain, isRunning, isDark, reconnectTick]);

  if (!isRunning) {
    return (
      <div className={cn("p-6 font-mono text-xs min-h-[380px] flex items-center justify-center", isDark ? "bg-[#090d16] text-amber-400" : "bg-slate-950 text-amber-300")}>
        Container must be RUNNING to open an interactive Linux PTY shell session.
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-[#090d16]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.08] bg-[#0b101b] text-[11px] font-mono">
        <div className="flex items-center gap-2 text-zinc-400">
          <TerminalIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span
            className={cn(
              "inline-flex items-center gap-1.5 font-semibold",
              status === "connected"
                ? "text-emerald-400"
                : status === "connecting"
                ? "text-cyan-400"
                : status === "error"
                ? "text-rose-400"
                : "text-amber-400"
            )}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                status === "connected"
                  ? "bg-emerald-400 animate-pulse"
                  : status === "connecting"
                  ? "bg-cyan-400 animate-pulse"
                  : status === "error"
                  ? "bg-rose-400"
                  : "bg-amber-400"
              )}
            />
            {status === "connected"
              ? statusMsg || "Live PTY"
              : status === "connecting"
              ? "Connecting..."
              : status === "error"
              ? "Connection Failed"
              : "Disconnected"}
          </span>
          <span className="hidden sm:inline text-zinc-500">
            - Tab autocomplete, Ctrl+C, arrow history &amp; interactive CLI supported
          </span>
        </div>
        <button
          type="button"
          onClick={() => setReconnectTick((t) => t + 1)}
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded border border-white/10 bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
        >
          <RefreshCw className={cn("w-3 h-3", status === "connecting" && "animate-spin")} />
          <span>Reconnect</span>
        </button>
      </div>

      <div className="relative w-full h-[420px] overflow-hidden">
        <div
          ref={containerRef}
          onClick={() => {
            if (status === "connected") termRef.current?.focus();
          }}
          className={cn(
            "w-full h-full p-2.5 transition-opacity duration-200",
            status === "connected" ? "opacity-100" : "opacity-0 pointer-events-none select-none"
          )}
        />

        {status !== "connected" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#090d16]/95">
            {status === "connecting" ? (
              <div className="space-y-3 max-w-sm">
                <Loader2 className="w-7 h-7 text-cyan-400 animate-spin mx-auto" />
                <div className="text-xs font-mono font-semibold text-zinc-200">
                  {statusMsg || `Connecting to ${subdomain} PTY...`}
                </div>
                <p className="text-[11px] text-zinc-500">
                  Allocating interactive Linux shell session. Input will unlock automatically once connected.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-w-md">
                <AlertCircle className="w-7 h-7 text-rose-400 mx-auto" />
                <div className="text-xs font-mono font-semibold text-zinc-200">
                  {statusMsg || "Terminal session disconnected"}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setReconnectTick((t) => t + 1)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reconnect PTY</span>
                  </button>
                  {onSwitchToOneShot && (
                    <button
                      type="button"
                      onClick={onSwitchToOneShot}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-white/10 bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10 cursor-pointer"
                    >
                      <span>Use One-Shot Mode</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
