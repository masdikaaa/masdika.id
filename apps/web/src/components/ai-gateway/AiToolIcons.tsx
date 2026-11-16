'use client';

import React from 'react';
import {
  SiAnthropic,
  SiClaude,
  SiCurl,
  SiCursor,
  SiGo,
  SiNodedotjs,
  SiPhp,
  SiPython,
} from 'react-icons/si';
import { Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type QuickstartDocId =
  | 'curl'
  | 'node'
  | 'python'
  | 'go'
  | 'php'
  | 'responses'
  | 'anthropic'
  | 'images'
  | 'claudecode'
  | 'codex'
  | 'opencode'
  | 'cline'
  | 'cursor'
  | 'continue'
  | 'aider';

function OpenAiMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
    </svg>
  );
}

function OpenCodeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2.2" />
      <rect x="7.5" y="7.5" width="9" height="9" rx="1.5" fill="currentColor" />
    </svg>
  );
}

function ClineMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="3" y="5" width="18" height="14" rx="4.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="9.25" cy="12" r="1.6" fill="currentColor" />
      <circle cx="14.75" cy="12" r="1.6" fill="currentColor" />
      <path d="M12 2.5V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ContinueMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M5 6.5L11.5 12L5 17.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.5 6.5L19 12L12.5 17.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AiderMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M12 3.5L19.5 19.5H16.2L14.5 15.8H9.5L7.8 19.5H4.5L12 3.5Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M10.4 13H13.6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function AiToolIcon({
  id,
  active = false,
  isDark = true,
  className = 'w-3.5 h-3.5 shrink-0',
}: {
  id: QuickstartDocId;
  active?: boolean;
  isDark?: boolean;
  className?: string;
}) {
  const color = (brandClass: string) =>
    active ? 'text-slate-950' : brandClass;

  switch (id) {
    case 'curl':
      return <SiCurl className={cn(className, color(isDark ? 'text-emerald-400' : 'text-emerald-600'))} />;
    case 'node':
      return <SiNodedotjs className={cn(className, color('text-[#5FA04E]'))} />;
    case 'python':
      return <SiPython className={cn(className, color('text-[#3776AB]'))} />;
    case 'go':
      return <SiGo className={cn(className, color('text-[#00ADD8]'))} />;
    case 'php':
      return <SiPhp className={cn(className, color('text-[#777BB4]'))} />;
    case 'responses':
      return <OpenAiMark className={cn(className, color(isDark ? 'text-white' : 'text-slate-900'))} />;
    case 'anthropic':
      return <SiAnthropic className={cn(className, color('text-[#D97757]'))} />;
    case 'images':
      return <ImageIcon className={cn(className, color('text-violet-400'))} />;
    case 'claudecode':
      return <SiClaude className={cn(className, color('text-[#D97757]'))} />;
    case 'codex':
      return <OpenAiMark className={cn(className, color(isDark ? 'text-white' : 'text-slate-900'))} />;
    case 'opencode':
      return <OpenCodeMark className={cn(className, color(isDark ? 'text-zinc-200' : 'text-slate-800'))} />;
    case 'cline':
      return <ClineMark className={cn(className, color('text-amber-400'))} />;
    case 'cursor':
      return <SiCursor className={cn(className, color(isDark ? 'text-white' : 'text-slate-900'))} />;
    case 'continue':
      return <ContinueMark className={cn(className, color('text-sky-400'))} />;
    case 'aider':
      return <AiderMark className={cn(className, color('text-emerald-400'))} />;
  }
}
