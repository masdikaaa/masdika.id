"use client";

import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { RefreshCw, Terminal as TerminalIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PodInteractiveTerminalProps {
  appId: number | string;
  subdomain: string;
  isRunning: boolean;
  isDark: boolean;
  quickCommand?: { cmd: string; nonce: number } | null;
}

export default function PodInteractiveTerminal({
  appId,
  subdomain,
  isRunning,
  isDark,
  quickCommand,
}: PodInteractiveTerminalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "disconnected" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [reconnectTick, setReconnectTick] = useState(0);

  // Send preset command directly into active PTY when clicked
  useEffect(() => {
    if (!quickCommand?.cmd) return;
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "input", data: `${quickCommand.cmd}\r` }));
      termRef.current?.focus();
    }
  }, [quickCommand]);

  useEffect(() => {
    if (!isRunning || !containerRef.current) {
      setStatus("idle");
      return;
    }

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      lineHeight: 1.35,
      fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      scrollback: 5000,
      theme: isDark
        ? {
            background: "#090d16",
            foreground: "#e2e8f0",
            cursor: "#22d3ee",
            selectionBackground: "rgba(34, 211, 238, 0.25)",
          }
        : {
            background: "#0f172a",
            foreground: "#f8fafc",
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
    setStatusMsg(`Connecting to ${subdomain} PTY...`);
    term.writeln(`\x1b[36m[Masdika Pod Shell]\x1b[0m Connecting to interactive Linux PTY (${subdomain})...`);

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${proto}//${window.location.host}/api/ws/app-platform/shell?appId=${encodeURIComponent(String(appId))}`;
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

    ws.onopen = () => {
      setStatus("connected");
      setStatusMsg("Live PTY");
      sendResize();
      term.focus();
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === "data" && typeof msg.data === "string") {
          term.write(msg.data);
        } else if (msg.type === "ready") {
          setStatus("connected");
          setStatusMsg(msg.podName ? `PTY: ${msg.podName}` : "Live PTY");
          sendResize();
        } else if (msg.type === "error") {
          setStatus("error");
          setStatusMsg(msg.message || "PTY Error");
          term.writeln(`\r\n\x1b[31m[Error]\x1b[0m ${msg.message || "Failed to attach terminal"}`);
        } else if (msg.type === "exit") {
          setStatus("disconnected");
          setStatusMsg("Session ended");
          term.writeln("\r\n\x1b[33m[Session closed]\x1b[0m Click Reconnect to open a new shell.");
        }
      } catch {}
    };

    ws.onerror = () => {
      setStatus("error");
      setStatusMsg("Connection failed");
    };

    ws.onclose = () => {
      setStatus((prev) => (prev === "error" ? "error" : "disconnected"));
    };

    const dataDisposable = term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
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
      <div className={cn("p-5 font-mono text-xs min-h-[360px]", isDark ? "bg-[#090d16] text-amber-400" : "bg-slate-950 text-amber-300")}>
        Container must be RUNNING to open an interactive Linux PTY shell session.
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-[#090d16]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.08] bg-[#0b101b] text-[11px] font-mono">
        <div className="flex items-center gap-2 text-zinc-400">
          <TerminalIcon className="w-3.5 h-3.5 text-cyan-400" />
          <span
            className={cn(
              "inline-flex items-center gap-1.5 font-semibold",
              status === "connected"
                ? "text-emerald-400"
                : status === "connecting"
                ? "text-cyan-400"
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
                  : "bg-amber-400"
              )}
            />
            {statusMsg || status}
          </span>
          <span className="hidden sm:inline text-zinc-500">
            - Tab autocomplete, Ctrl+C, arrow history &amp; interactive CLI supported
          </span>
        </div>
        <button
          type="button"
          onClick={() => setReconnectTick((t) => t + 1)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-white/10 bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Reconnect</span>
        </button>
      </div>
      <div
        ref={containerRef}
        onClick={() => termRef.current?.focus()}
        className="w-full h-[420px] p-2 overflow-hidden"
      />
    </div>
  );
}
