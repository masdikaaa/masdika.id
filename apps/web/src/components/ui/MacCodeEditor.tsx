"use client";

import { useRef, useState } from "react";
import { FileCode2, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MacCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  filename?: string;
  badge?: string;
  placeholder?: string;
  rows?: number;
  isDark?: boolean;
  textColorClassName?: string;
  minLines?: number;
}

export function MacCodeEditor({
  value,
  onChange,
  filename = ".env",
  badge = "UTF-8",
  placeholder,
  rows = 6,
  isDark = true,
  textColorClassName,
  minLines = 3,
}: MacCodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const lines = value.split("\n");
  const totalLines = Math.max(lines.length, minLines, rows);
  const heightPx = rows * 24 + 24;

  const handleScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`Copied ${filename}`);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden transition-colors focus-within:border-cyan-400/70 shadow-2xs",
        isDark
          ? "bg-[#0d0f17] border-white/[0.08]"
          : "bg-white border-slate-200"
      )}
    >
      {/* macOS Title Bar */}
      <div
        className={cn(
          "px-3.5 py-2.5 border-b flex items-center justify-between gap-3 select-none",
          isDark
            ? "bg-[#14161f] border-white/[0.08]"
            : "bg-slate-50/90 border-slate-200"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] border border-[#e0443e] inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] border border-[#dea123] inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f] border border-[#1aab29] inline-block" />
          </div>
          <div
            className={cn(
              "flex items-center gap-1.5 pl-2.5 border-l min-w-0 font-mono text-[11px] font-bold",
              isDark
                ? "border-white/10 text-zinc-200"
                : "border-slate-300 text-slate-800"
            )}
          >
            <FileCode2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">{filename}</span>
            {badge && (
              <span
                className={cn(
                  "hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded font-mono font-medium border shrink-0",
                  isDark
                    ? "bg-white/5 border-white/10 text-zinc-400"
                    : "bg-white border-slate-200 text-slate-500"
                )}
              >
                {badge}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={cn(
              "text-[10px] font-mono",
              isDark ? "text-zinc-500" : "text-slate-400"
            )}
          >
            {lines.length} {lines.length === 1 ? "line" : "lines"}
          </span>
          {value.trim().length > 0 && (
            <button
              type="button"
              onClick={handleCopy}
              title={`Copy ${filename}`}
              className={cn(
                "p-1 rounded-md border transition-colors cursor-pointer",
                isDark
                  ? "bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.08]"
                  : "bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              {copied ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* VS Code Line Numbers + Editor */}
      <div className="relative flex font-mono text-xs" style={{ minHeight: `${heightPx}px` }}>
        <div
          ref={gutterRef}
          aria-hidden="true"
          className={cn(
            "w-11 shrink-0 py-3 pr-2.5 text-right select-none overflow-hidden border-r leading-6",
            isDark
              ? "bg-[#0a0c12] border-white/[0.06] text-zinc-600"
              : "bg-slate-50/80 border-slate-200/80 text-slate-400"
          )}
          style={{ height: `${heightPx}px` }}
        >
          {Array.from({ length: totalLines }, (_, idx) => (
            <div key={idx + 1} className="leading-6">
              {idx + 1}
            </div>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          placeholder={placeholder}
          spellCheck={false}
          wrap="off"
          style={{ height: `${heightPx}px` }}
          className={cn(
            "flex-1 w-full py-3 px-3.5 text-xs font-mono leading-6 bg-transparent focus:outline-none resize-y overflow-x-auto",
            textColorClassName ||
              (isDark
                ? "text-zinc-100 placeholder-zinc-600"
                : "text-slate-900 placeholder-slate-400")
          )}
        />
      </div>
    </div>
  );
}
