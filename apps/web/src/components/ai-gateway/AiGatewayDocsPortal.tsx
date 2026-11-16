'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  FileText,
  Info,
  List,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AiToolIcon, type QuickstartDocId } from './AiToolIcons';

export type DocPageId =
  | 'overview'
  | 'authentication'
  | 'coding-tools'
  | 'openai'
  | 'responses'
  | 'images'
  | 'anthropic'
  | 'models'
  | 'pricing'
  | 'limits'
  | 'management';

interface PropRow {
  prop: string;
  type: string;
  desc: string;
}

interface EndpointCardItem {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  desc: string;
  badges?: string[];
}

interface ExampleTab {
  id: string;
  label: string;
  code: string;
}

interface AiGatewayDocsPortalProps {
  isDark: boolean;
  openaiBase: string;
  anthropicBase: string;
  mgmtBase: string;
  sampleModel: string;
  modelCount: number;
  imageModelCount: number;
  topupFeeRp: number;
}

const SIDEBAR_GROUPS: {
  title?: string;
  items: { id: DocPageId; label: string }[];
}[] = [
  {
    items: [
      { id: 'overview', label: 'Overview' },
      { id: 'authentication', label: 'Authentication' },
      { id: 'coding-tools', label: 'Coding tools' },
    ],
  },
  {
    title: 'Reference',
    items: [
      { id: 'openai', label: 'OpenAI compatible' },
      { id: 'responses', label: 'Responses API' },
      { id: 'images', label: 'Image generation' },
      { id: 'anthropic', label: 'Anthropic compatible' },
      { id: 'models', label: 'Models' },
      { id: 'pricing', label: 'Pricing and billing' },
      { id: 'limits', label: 'Limits and errors' },
    ],
  },
  {
    title: 'Management',
    items: [{ id: 'management', label: 'Management API' }],
  },
];

function MethodBadge({ method }: { method: EndpointCardItem['method'] }) {
  const styles =
    method === 'POST'
      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
      : method === 'GET'
      ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
      : method === 'PUT'
      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
      : 'bg-rose-500/15 text-rose-400 border-rose-500/30';

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border uppercase shrink-0',
        styles,
      )}
    >
      {method}
    </span>
  );
}

function EndpointCard({
  item,
  isDark,
}: {
  item: EndpointCardItem;
  isDark: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-3 space-y-1',
        isDark ? 'bg-[#0b0d12] border-white/[0.08]' : 'bg-slate-50 border-slate-200',
      )}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <MethodBadge method={item.method} />
        <code className={cn('text-xs font-mono font-semibold break-all', isDark ? 'text-white' : 'text-slate-900')}>
          {item.path}
        </code>
        {item.badges?.map((b) => (
          <span
            key={b}
            className={cn(
              'px-2 py-0.5 rounded-md text-[10px] font-mono border',
              isDark ? 'bg-white/[0.04] border-white/[0.08] text-zinc-400' : 'bg-white border-slate-200 text-slate-600',
            )}
          >
            {b}
          </span>
        ))}
      </div>
      <p className={cn('text-xs leading-relaxed', isDark ? 'text-zinc-400' : 'text-slate-600')}>{item.desc}</p>
    </div>
  );
}

function PropTable({ rows, isDark }: { rows: PropRow[]; isDark: boolean }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <div
      className={cn(
        'rounded-xl border overflow-hidden divide-y',
        isDark ? 'bg-[#0b0d12] border-white/[0.08] divide-white/[0.06]' : 'bg-white border-slate-200 divide-slate-100',
      )}
    >
      <div
        className={cn(
          'grid grid-cols-12 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider',
          isDark ? 'bg-white/[0.02] text-zinc-500' : 'bg-slate-50 text-slate-500',
        )}
      >
        <div className="col-span-4">Prop</div>
        <div className="col-span-7">Type</div>
        <div className="col-span-1 text-right" />
      </div>
      {rows.map((r, i) => {
        const expanded = openIdx === i;
        return (
          <div key={r.prop}>
            <button
              type="button"
              onClick={() => setOpenIdx(expanded ? null : i)}
              className={cn(
                'w-full grid grid-cols-12 items-center px-4 py-2.5 text-left text-xs transition-colors cursor-pointer',
                isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50',
              )}
            >
              <div className="col-span-4 font-mono font-semibold text-cyan-400 truncate pr-2">{r.prop}</div>
              <div className={cn('col-span-7 font-mono text-[11px] truncate pr-2', isDark ? 'text-zinc-300' : 'text-slate-700')}>
                {r.type}
              </div>
              <div className="col-span-1 flex justify-end text-zinc-500">
                {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </div>
            </button>
            {expanded && (
              <div className={cn('px-4 pb-3 pt-0.5 text-xs leading-relaxed', isDark ? 'text-zinc-400' : 'text-slate-600')}>
                {r.desc}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CodeBox({
  code,
  tabs,
  isDark,
  copiedKey,
  onCopy,
}: {
  code?: string;
  tabs?: ExampleTab[];
  isDark: boolean;
  copiedKey: string | null;
  onCopy: (text: string, id: string) => void;
}) {
  const [activeTabId, setActiveTabId] = useState<string>(tabs?.[0]?.id || 'default');
  const currentTab = tabs?.find((t) => t.id === activeTabId) || tabs?.[0];
  const displayCode = currentTab ? currentTab.code : code || '';
  const copyId = currentTab ? `tab-${currentTab.id}-${displayCode.slice(0, 16)}` : `code-${displayCode.slice(0, 20)}`;

  return (
    <div
      className={cn(
        'rounded-2xl border overflow-hidden shadow-lg',
        isDark ? 'border-white/[0.1] bg-[#0b0d12]' : 'border-slate-200 bg-white',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-3 px-3.5 sm:px-4 py-2.5 border-b',
          isDark ? 'bg-[#12151e] border-white/[0.07]' : 'bg-slate-100 border-slate-200',
        )}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* macOS traffic lights */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ff5f56] shrink-0" />
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ffbd2e] shrink-0" />
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#27c93f] shrink-0" />
          </div>

          {tabs && tabs.length > 0 ? (
            <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {tabs.map((t) => {
                const active = t.id === (currentTab?.id || activeTabId);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTabId(t.id)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap cursor-pointer outline-none focus:outline-none',
                      active
                        ? 'bg-cyan-400 text-slate-950 font-bold shadow-2xs'
                        : isDark
                        ? 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70',
                    )}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <span className={cn('text-[11px] font-mono font-semibold truncate', isDark ? 'text-zinc-400' : 'text-slate-600')}>
              terminal
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onCopy(displayCode, copyId)}
          className={cn(
            'inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer shrink-0 outline-none focus:outline-none',
            isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-700 hover:text-cyan-800',
          )}
          title="Copy snippet"
        >
          {copiedKey === copyId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedKey === copyId ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre
        className={cn(
          'p-4 text-[11px] sm:text-xs font-mono overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden leading-relaxed',
          isDark ? 'text-zinc-200 bg-[#0b0d12]' : 'text-slate-800 bg-slate-50/60',
        )}
      >
        <code>{displayCode}</code>
      </pre>
    </div>
  );
}

function Callout({
  variant = 'info',
  title,
  children,
  isDark,
}: {
  variant?: 'info' | 'warning';
  title: string;
  children: React.ReactNode;
  isDark: boolean;
}) {
  const isWarn = variant === 'warning';
  return (
    <div
      className={cn(
        'rounded-xl border p-4 flex items-start gap-3',
        isWarn
          ? isDark
            ? 'bg-amber-500/[0.06] border-amber-500/25'
            : 'bg-amber-50 border-amber-200'
          : isDark
          ? 'bg-cyan-500/[0.06] border-cyan-500/25'
          : 'bg-cyan-50 border-cyan-200',
      )}
    >
      {isWarn ? (
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
      ) : (
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
      )}
      <div className="space-y-1 text-xs leading-relaxed">
        <div className={cn('font-bold', isDark ? 'text-white' : 'text-slate-900')}>{title}</div>
        <div className={isDark ? 'text-zinc-300' : 'text-slate-700'}>{children}</div>
      </div>
    </div>
  );
}

export function AiGatewayDocsPortal({
  isDark,
  openaiBase,
  anthropicBase,
  mgmtBase,
  sampleModel,
  modelCount,
  imageModelCount,
  topupFeeRp,
}: AiGatewayDocsPortalProps) {
  const [page, setPage] = useState<DocPageId>('overview');
  const [codingTool, setCodingTool] = useState<QuickstartDocId>('claudecode');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleCopy = async (text: string, id: string, label = 'Copied to clipboard') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(id);
      toast.success(label);
      setTimeout(() => setCopiedKey((prev) => (prev === id ? null : prev)), 1800);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const codingToolSnippets: Record<
    Extract<QuickstartDocId, 'claudecode' | 'codex' | 'opencode' | 'cline' | 'cursor' | 'continue' | 'aider'>,
    { label: string; install?: string; configPath?: string; code: string }
  > = {
    claudecode: {
      label: 'Claude Code',
      install: 'npm install -g @anthropic-ai/claude-code',
      configPath: '~/.claude/settings.json',
      code: `# macOS / Linux (Bash / Zsh)
export ANTHROPIC_BASE_URL="${anthropicBase}"
export ANTHROPIC_AUTH_TOKEN="masdika_ai_YOUR_KEY"
export ANTHROPIC_MODEL="glm-5.3"
export ANTHROPIC_DEFAULT_HAIKU_MODEL="deepseek-v4.1-flash"
claude

# Windows PowerShell
$env:ANTHROPIC_BASE_URL="${anthropicBase}"
$env:ANTHROPIC_AUTH_TOKEN="masdika_ai_YOUR_KEY"
$env:ANTHROPIC_MODEL="glm-5.3"
$env:ANTHROPIC_DEFAULT_HAIKU_MODEL="deepseek-v4.1-flash"
claude`,
    },
    codex: {
      label: 'Codex',
      install: 'npm install -g @openai/codex',
      configPath: '~/.codex/config.toml',
      code: `# ~/.codex/config.toml
model = "glm-5.3"
model_provider = "masdika"

[model_providers.masdika]
name = "Masdika AI Gateway"
base_url = "${openaiBase}"
env_key = "MASDIKA_AI_KEY"
wire_api = "responses"

# Launch:
export MASDIKA_AI_KEY="masdika_ai_YOUR_KEY"
codex`,
    },
    opencode: {
      label: 'opencode',
      install: 'npm install -g opencode-ai',
      configPath: '~/.config/opencode/opencode.json',
      code: `{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "masdika": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Masdika AI Gateway",
      "options": {
        "baseURL": "${openaiBase}",
        "apiKey": "{env:MASDIKA_AI_KEY}"
      },
      "models": {
        "glm-5.3": { "name": "GLM-5.3" },
        "kimi-k3": { "name": "Kimi K3" },
        "deepseek-v4-pro": { "name": "DeepSeek V4 Pro" },
        "deepseek-v4.1-flash": { "name": "DeepSeek V4.1 Flash" }
      }
    }
  }
}`,
    },
    cline: {
      label: 'Cline / Roo / Kilo',
      code: `API Provider : OpenAI Compatible
Base URL     : ${openaiBase}
API Key      : masdika_ai_YOUR_KEY
Model ID     : glm-5.3 (or kimi-k3, deepseek-v4-pro, claude-sonnet-4-6)`,
    },
    cursor: {
      label: 'Cursor',
      code: `1. Open Cursor Settings -> Models
2. Paste your masdika_ai_... key in "OpenAI API Key"
3. Enable "Override OpenAI Base URL": ${openaiBase}
4. Add custom model IDs: glm-5.3, deepseek-v4-pro, kimi-k3, claude-sonnet-4-6
5. Click Verify`,
    },
    continue: {
      label: 'Continue',
      configPath: '~/.continue/config.yaml',
      code: `name: Masdika AI Gateway
version: 1.0.0
schema: v1
models:
  - name: GLM-5.3 (Masdika)
    provider: openai
    model: glm-5.3
    apiBase: ${openaiBase}
    apiKey: \${{ secrets.MASDIKA_AI_KEY }}
    roles: [chat, edit, apply]`,
    },
    aider: {
      label: 'Aider',
      install: 'pip install aider-chat',
      configPath: '~/.aider.conf.yml',
      code: `export OPENAI_API_BASE="${openaiBase}"
export OPENAI_API_KEY="masdika_ai_YOUR_KEY"
aider --model openai/glm-5.3`,
    },
  };

  const pageMeta: Record<DocPageId, { title: string; subtitle: string; anchors: string[] }> = {
    overview: {
      title: 'Overview',
      subtitle: `One API key for ${modelCount || 73}+ chat models and ${imageModelCount || 13} image models, billed per token in Rupiah.`,
      anchors: ['Base URLs', 'Quickstart', 'Supported protocols'],
    },
    authentication: {
      title: 'Authentication',
      subtitle: 'Authenticate gateway inference with AI keys (masdika_ai_...) or manage billing & usage with Masdika API keys (masdika_...).',
      anchors: ['Key types', 'Headers', 'Restrictions & expiry'],
    },
    'coding-tools': {
      title: 'Coding tools',
      subtitle: 'Use Masdika AI Gateway inside Claude Code, Codex CLI, opencode, Cline, Roo Code, Kilo Code, Cursor, Continue, and Aider.',
      anchors: ['Select tool', 'Install & config', 'Recommended models'],
    },
    openai: {
      title: 'OpenAI compatible',
      subtitle: 'Standard Chat Completions endpoint with streaming SSE, tool calling, vision, and JSON mode.',
      anchors: ['Endpoint', 'Request', 'Examples', 'Response'],
    },
    responses: {
      title: 'Responses API',
      subtitle: 'Stateless OpenAI Responses API (/v1/responses) for OpenAI Codex CLI and newer OpenAI SDKs.',
      anchors: ['Endpoint', 'Request', 'Examples', 'Response'],
    },
    images: {
      title: 'Image generation',
      subtitle: 'Create images with POST /v1/images/generations (OpenAI format). Images are kept for 7 days.',
      anchors: ['Endpoints', 'Request', 'Examples', 'Response'],
    },
    anthropic: {
      title: 'Anthropic compatible',
      subtitle: 'Use official Anthropic SDKs and Claude Code with /v1/messages and /v1/messages/count_tokens.',
      anchors: ['Endpoints', 'Base URL rule', 'Examples', 'Response'],
    },
    models: {
      title: 'Models',
      subtitle: 'Discover active chat and image models, context windows, and live Rupiah pricing programmatically.',
      anchors: ['Endpoints', 'Example', 'Response'],
    },
    pricing: {
      title: 'Pricing and billing',
      subtitle: 'Understand AI Balance holds, token cost calculation, prompt caching, and Peak Hours in WIB.',
      anchors: ['AI Balance & Top-Up', 'Token formula', 'Peak hours (WIB)'],
    },
    limits: {
      title: 'Limits and errors',
      subtitle: 'Rate limits, payload caps, response headers, and standard HTTP error codes.',
      anchors: ['Rate & size limits', 'Error codes'],
    },
    management: {
      title: 'Management API',
      subtitle: 'Read prices, balance, usage and metrics, revoke AI keys, top up AI balance, generate images, and chat using a Masdika API key.',
      anchors: ['Base URL & keys', 'Endpoints', 'Top up & Auto top-up', 'Images & Chat', 'Errors'],
    },
  };

  const getPageMarkdown = () => {
    const meta = pageMeta[page];
    return `# ${meta.title}\n\n${meta.subtitle}\n\n- OpenAI Base URL: ${openaiBase}\n- Anthropic Base URL: ${anthropicBase}\n- Management Base URL: ${mgmtBase}\n`;
  };

  const meta = pageMeta[page];

  return (
    <div className={cn('rounded-2xl border overflow-hidden', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200 shadow-2xs')}>
      {/* Mobile / Small Screen Docs Page Switcher */}
      <div className={cn('md:hidden border-b p-3', isDark ? 'bg-[#0b0d12] border-white/[0.08]' : 'bg-slate-50 border-slate-200')}>
        <button
          type="button"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className={cn(
            'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer outline-none focus:outline-none',
            isDark ? 'bg-[#111115] border-white/[0.08] text-white' : 'bg-white border-slate-200 text-slate-900',
          )}
        >
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>Docs: {meta.title}</span>
          </span>
          {mobileNavOpen ? <ChevronDown className="w-4 h-4 text-cyan-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
        </button>

        {mobileNavOpen && (
          <div className="mt-2.5 space-y-3 pt-2 border-t border-white/[0.06]">
            {SIDEBAR_GROUPS.map((grp, gi) => (
              <div key={gi} className="space-y-1">
                {grp.title && (
                  <div className={cn('px-2 text-[10px] font-bold uppercase tracking-wider', isDark ? 'text-zinc-500' : 'text-slate-500')}>
                    {grp.title}
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {grp.items.map((item) => {
                    const active = page === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setPage(item.id);
                          setMobileNavOpen(false);
                        }}
                        className={cn(
                          'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer outline-none focus:outline-none',
                          active
                            ? 'bg-cyan-400 text-slate-950 font-bold shadow-2xs'
                            : isDark
                            ? 'bg-[#111115] border border-white/[0.08] text-zinc-300 hover:text-white'
                            : 'bg-white border border-slate-200 text-slate-700 hover:text-slate-900',
                        )}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12">
        {/* Left Navigation Sidebar (Desktop & Tablet) */}
        <aside className={cn('hidden md:block md:col-span-3 border-r p-4 space-y-5', isDark ? 'bg-[#0b0d12] border-white/[0.08]' : 'bg-slate-50/70 border-slate-200')}>
          {SIDEBAR_GROUPS.map((grp, gi) => (
            <div key={gi} className="space-y-1">
              {grp.title && (
                <div className={cn('px-3 pb-1 text-[10px] font-bold uppercase tracking-widest', isDark ? 'text-zinc-500' : 'text-slate-500')}>
                  {grp.title}
                </div>
              )}
              <div className="flex flex-col gap-1">
                {grp.items.map((item) => {
                  const active = page === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPage(item.id)}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-xl text-xs transition-all cursor-pointer outline-none focus:outline-none',
                        active
                          ? 'bg-cyan-400 text-slate-950 font-bold shadow-xs'
                          : isDark
                          ? 'text-zinc-400 font-medium hover:text-white hover:bg-white/[0.04]'
                          : 'text-slate-600 font-medium hover:text-slate-900 hover:bg-slate-200/60',
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>

        {/* Main Content */}
        <main className="md:col-span-9 xl:col-span-7 p-5 sm:p-7 space-y-6 min-w-0">
          {/* Page Header */}
          <div className={cn('space-y-3 pb-5 border-b', isDark ? 'border-white/[0.08]' : 'border-slate-200')}>
            <h2 className={cn('text-2xl font-bold tracking-tight', isDark ? 'text-white' : 'text-slate-900')}>
              {meta.title}
            </h2>
            <p className={cn('text-sm leading-relaxed', isDark ? 'text-zinc-400' : 'text-slate-600')}>
              {meta.subtitle}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleCopy(getPageMarkdown(), `md-${page}`, 'Markdown copied')}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors',
                  isDark ? 'bg-[#0b0d12] border-white/[0.1] text-zinc-300 hover:text-white hover:border-white/20' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100',
                )}
              >
                {copiedKey === `md-${page}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileText className="w-3.5 h-3.5" />}
                <span>Copy Markdown</span>
              </button>
            </div>
          </div>

          {/* PAGE: OVERVIEW */}
          {page === 'overview' && (
            <div className="space-y-6">
              <div className="space-y-2.5">
                <h3 className={cn('text-base font-bold', isDark ? 'text-white' : 'text-slate-900')}>Base URLs</h3>
                <div className="grid grid-cols-1 gap-2.5">
                  {[
                    { label: 'OpenAI Base URL', url: openaiBase },
                    { label: 'Anthropic Base URL', url: anthropicBase },
                    { label: 'Management API Base URL', url: mgmtBase },
                  ].map((b) => (
                    <div key={b.label} className={cn('rounded-xl border px-4 py-2.5 flex items-center justify-between gap-3', isDark ? 'bg-[#0b0d12] border-white/[0.08]' : 'bg-slate-50 border-slate-200')}>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{b.label}</div>
                        <code className="text-xs font-mono text-cyan-400 break-all">{b.url}</code>
                      </div>
                      <button type="button" onClick={() => handleCopy(b.url, b.label, `${b.label} copied`)} className="text-zinc-400 hover:text-cyan-400 cursor-pointer shrink-0">
                        {copiedKey === b.label ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className={cn('text-base font-bold', isDark ? 'text-white' : 'text-slate-900')}>Quickstart</h3>
                <CodeBox
                  isDark={isDark}
                  copiedKey={copiedKey}
                  onCopy={(txt, id) => handleCopy(txt, id)}
                  tabs={[
                    {
                      id: 'curl',
                      label: 'cURL',
                      code: `curl ${openaiBase}/chat/completions \\\n  -H "Authorization: Bearer masdika_ai_YOUR_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "model": "${sampleModel}",\n    "messages": [{ "role": "user", "content": "Explain Cloud VPS in 2 sentences." }]\n  }'`,
                    },
                    {
                      id: 'node',
                      label: 'JavaScript',
                      code: `import OpenAI from "openai";\n\nconst client = new OpenAI({\n  baseURL: "${openaiBase}",\n  apiKey: process.env.MASDIKA_AI_KEY,\n});\n\nconst res = await client.chat.completions.create({\n  model: "${sampleModel}",\n  messages: [{ role: "user", content: "Hello!" }],\n});\nconsole.log(res.choices[0].message.content);`,
                    },
                    {
                      id: 'python',
                      label: 'Python',
                      code: `import os\nfrom openai import OpenAI\n\nclient = OpenAI(\n    base_url="${openaiBase}",\n    api_key=os.environ["MASDIKA_AI_KEY"],\n)\n\nres = client.chat.completions.create(\n    model="${sampleModel}",\n    messages=[{"role": "user", "content": "Hello!"}],\n)\nprint(res.choices[0].message.content)`,
                    },
                  ]}
                />
              </div>

              <div className="space-y-2.5">
                <h3 className={cn('text-base font-bold', isDark ? 'text-white' : 'text-slate-900')}>Supported protocols</h3>
                <div className="space-y-2">
                  <EndpointCard isDark={isDark} item={{ method: 'POST', path: '/api/ai/openai/v1/chat/completions', desc: 'OpenAI Chat Completions, streaming SSE, tools, vision, reasoning.' }} />
                  <EndpointCard isDark={isDark} item={{ method: 'POST', path: '/api/ai/openai/v1/responses', desc: 'OpenAI Responses API for Codex CLI and newer OpenAI SDKs.' }} />
                  <EndpointCard isDark={isDark} item={{ method: 'POST', path: '/api/ai/openai/v1/images/generations', desc: 'OpenAI Images API for Seedream, Kling, Vega, Vidu, and Hunyuan Image.' }} />
                  <EndpointCard isDark={isDark} item={{ method: 'POST', path: '/api/ai/anthropic/v1/messages', desc: 'Anthropic Messages API for @anthropic-ai/sdk and Claude Code CLI.' }} />
                </div>
              </div>
            </div>
          )}

          {/* PAGE: AUTHENTICATION */}
          {page === 'authentication' && (
            <div className="space-y-6">
              <div className="space-y-2.5">
                <h3 className={cn('text-base font-bold', isDark ? 'text-white' : 'text-slate-900')}>Key types</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className={cn('rounded-xl border p-4 space-y-1.5', isDark ? 'bg-[#0b0d12] border-white/[0.08]' : 'bg-slate-50 border-slate-200')}>
                    <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                      <ShieldCheck className="w-4 h-4" /> AI Gateway Key
                    </div>
                    <code className="text-xs font-mono text-zinc-300">masdika_ai_...</code>
                    <p className="text-xs text-zinc-400">Used for model inference (/v1/chat/completions, /v1/responses, /v1/messages, /v1/images/generations). Max 25 active keys.</p>
                  </div>
                  <div className={cn('rounded-xl border p-4 space-y-1.5', isDark ? 'bg-[#0b0d12] border-white/[0.08]' : 'bg-slate-50 border-slate-200')}>
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                      <ShieldCheck className="w-4 h-4" /> Masdika API Key
                    </div>
                    <code className="text-xs font-mono text-zinc-300">masdika_...</code>
                    <p className="text-xs text-zinc-400">Used for Management API (/api/ai/overview, /api/ai/topup, /api/ai/usage, /api/ai/keys, /api/ai/chat).</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <h3 className={cn('text-base font-bold', isDark ? 'text-white' : 'text-slate-900')}>Headers</h3>
                <CodeBox
                  isDark={isDark}
                  copiedKey={copiedKey}
                  onCopy={(t, id) => handleCopy(t, id)}
                  code={`# OpenAI format\nAuthorization: Bearer masdika_ai_YOUR_KEY\n\n# Anthropic format (also supported everywhere)\nx-api-key: masdika_ai_YOUR_KEY`}
                />
              </div>

              <Callout variant="info" title="Restrictions, spend limits & expiry" isDark={isDark}>
                Each AI Gateway key can optionally restrict <strong>Allowed Models</strong>, cap <strong>Monthly Spend Limit (Rp)</strong>, and set an <strong>Expiry Date (days)</strong>. Always keep keys in server/CLI environment variables and never expose them in browser code.
              </Callout>
            </div>
          )}

          {/* PAGE: CODING TOOLS */}
          {page === 'coding-tools' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                {(Object.keys(codingToolSnippets) as Array<keyof typeof codingToolSnippets>).map((id) => {
                  const active = codingTool === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setCodingTool(id)}
                      className={cn(
                        'inline-flex items-center justify-center sm:justify-start gap-2 px-3 py-2 rounded-xl text-[11px] sm:text-xs font-semibold border transition-all cursor-pointer outline-none focus:outline-none whitespace-nowrap',
                        active
                          ? 'bg-cyan-400 border-cyan-400 text-slate-950 font-bold shadow-2xs'
                          : isDark
                          ? 'bg-[#0b0d12] border-white/[0.08] text-zinc-300 hover:border-cyan-500/40'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-cyan-500/50',
                      )}
                    >
                      <AiToolIcon id={id} active={active} isDark={isDark} />
                      <span className="truncate">{codingToolSnippets[id].label}</span>
                    </button>
                  );
                })}
              </div>

              {(() => {
                const activeTool = codingToolSnippets[codingTool as keyof typeof codingToolSnippets] || codingToolSnippets.claudecode;
                return (
                  <div className="space-y-3">
                    {(activeTool.install || activeTool.configPath) && (
                      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                        {activeTool.install && (
                          <button
                            type="button"
                            onClick={() => handleCopy(activeTool.install!, `install-${codingTool}`, 'Install command copied')}
                            className={cn(
                              'w-full sm:w-auto max-w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl border text-xs font-mono cursor-pointer outline-none focus:outline-none text-left',
                              isDark ? 'bg-[#0b0d12] border-white/[0.08] text-emerald-400 hover:border-emerald-500/40' : 'bg-slate-50 border-slate-200 text-emerald-700 hover:border-emerald-500/50',
                            )}
                          >
                            <span className="flex items-center gap-2 min-w-0 flex-1">
                              <span className={cn('font-sans text-[11px] font-semibold shrink-0', isDark ? 'text-zinc-400' : 'text-slate-500')}>Install:</span>
                              <span className="overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                {activeTool.install}
                              </span>
                            </span>
                            {copiedKey === `install-${codingTool}` ? (
                              <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 shrink-0" />
                            )}
                          </button>
                        )}
                        {activeTool.configPath && (
                          <button
                            type="button"
                            onClick={() => handleCopy(activeTool.configPath!, `cfg-${codingTool}`, 'Config path copied')}
                            className={cn(
                              'w-full sm:w-auto max-w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl border text-xs font-mono cursor-pointer outline-none focus:outline-none text-left',
                              isDark ? 'bg-[#0b0d12] border-white/[0.08] text-zinc-300 hover:border-cyan-500/40' : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-cyan-500/50',
                            )}
                          >
                            <span className="flex items-center gap-2 min-w-0 flex-1">
                              <span className={cn('font-sans text-[11px] font-semibold shrink-0', isDark ? 'text-zinc-400' : 'text-slate-500')}>Config:</span>
                              <span className="truncate">{activeTool.configPath}</span>
                            </span>
                            {copiedKey === `cfg-${codingTool}` ? (
                              <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                            )}
                          </button>
                        )}
                      </div>
                    )}
                    <CodeBox isDark={isDark} copiedKey={copiedKey} onCopy={(t, id) => handleCopy(t, id)} code={activeTool.code} />
                  </div>
                );
              })()}
            </div>
          )}

          {/* PAGE: OPENAI COMPATIBLE */}
          {page === 'openai' && (
            <div className="space-y-6">
              <EndpointCard isDark={isDark} item={{ method: 'POST', path: '/api/ai/openai/v1/chat/completions', desc: 'Chat completions with streaming SSE, tool calling, JSON mode, vision, and reasoning.' }} />
              <div className="space-y-2.5">
                <h3 className={cn('text-base font-bold', isDark ? 'text-white' : 'text-slate-900')}>Request</h3>
                <PropTable
                  isDark={isDark}
                  rows={[
                    { prop: 'model', type: 'string', desc: `Required. Active model ID (e.g. "${sampleModel}", "glm-5.3", "claude-sonnet-4-6").` },
                    { prop: 'messages', type: 'array', desc: 'Required. List of { role: "system" | "user" | "assistant", content } objects.' },
                    { prop: 'stream?', type: 'boolean', desc: 'Stream Server-Sent Events (SSE) token by token. Default false.' },
                    { prop: 'max_completion_tokens?', type: 'number', desc: 'Maximum generated tokens. Default cap 16,384.' },
                    { prop: 'temperature?', type: 'number', desc: 'Sampling temperature between 0 and 2.' },
                    { prop: 'tools?', type: 'array', desc: 'OpenAI function/tool definitions for tool calling.' },
                    { prop: 'response_format?', type: 'object', desc: 'Use { "type": "json_object" } for structured JSON output.' },
                  ]}
                />
              </div>
              <div className="space-y-2.5">
                <h3 className={cn('text-base font-bold', isDark ? 'text-white' : 'text-slate-900')}>Examples</h3>
                <CodeBox
                  isDark={isDark}
                  copiedKey={copiedKey}
                  onCopy={(t, id) => handleCopy(t, id)}
                  tabs={[
                    { id: 'curl', label: 'cURL', code: `curl ${openaiBase}/chat/completions \\\n  -H "Authorization: Bearer masdika_ai_YOUR_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "model": "${sampleModel}",\n    "stream": false,\n    "messages": [{ "role": "user", "content": "Hello!" }]\n  }'` },
                    { id: 'js', label: 'JavaScript', code: `import OpenAI from "openai";\nconst client = new OpenAI({ baseURL: "${openaiBase}", apiKey: process.env.MASDIKA_AI_KEY });\nconst res = await client.chat.completions.create({\n  model: "${sampleModel}",\n  messages: [{ role: "user", content: "Hello!" }],\n});\nconsole.log(res.choices[0].message.content);` },
                    { id: 'py', label: 'Python', code: `from openai import OpenAI\nclient = OpenAI(base_url="${openaiBase}", api_key="masdika_ai_YOUR_KEY")\nres = client.chat.completions.create(\n    model="${sampleModel}",\n    messages=[{"role": "user", "content": "Hello!"}],\n)\nprint(res.choices[0].message.content)` },
                    { id: 'go', label: 'Go', code: `client := openai.NewClient(\n  option.WithBaseURL("${openaiBase}"),\n  option.WithAPIKey(os.Getenv("MASDIKA_AI_KEY")),\n)` },
                    { id: 'php', label: 'PHP', code: `$res = Http::withToken(env('MASDIKA_AI_KEY'))\n  ->post('${openaiBase}/chat/completions', [\n    'model' => '${sampleModel}',\n    'messages' => [['role' => 'user', 'content' => 'Hello!']],\n  ])->json();` },
                  ]}
                />
              </div>
            </div>
          )}

          {/* PAGE: RESPONSES API */}
          {page === 'responses' && (
            <div className="space-y-6">
              <EndpointCard isDark={isDark} item={{ method: 'POST', path: '/api/ai/openai/v1/responses', desc: 'Stateless Responses API for OpenAI Codex CLI and newer OpenAI SDK clients.' }} />
              <div className="space-y-2.5">
                <h3 className={cn('text-base font-bold', isDark ? 'text-white' : 'text-slate-900')}>Request</h3>
                <PropTable
                  isDark={isDark}
                  rows={[
                    { prop: 'model', type: 'string', desc: 'Required. Active model ID (e.g. "glm-5.3").' },
                    { prop: 'input', type: 'string | array', desc: 'Required. User prompt string or structured input items.' },
                    { prop: 'instructions?', type: 'string', desc: 'Optional system-level instructions.' },
                    { prop: 'max_output_tokens?', type: 'number', desc: 'Maximum output tokens.' },
                    { prop: 'stream?', type: 'boolean', desc: 'Stream SSE events when true.' },
                  ]}
                />
              </div>
              <div className="space-y-2.5">
                <h3 className={cn('text-base font-bold', isDark ? 'text-white' : 'text-slate-900')}>Examples</h3>
                <CodeBox
                  isDark={isDark}
                  copiedKey={copiedKey}
                  onCopy={(t, id) => handleCopy(t, id)}
                  tabs={[
                    { id: 'curl', label: 'cURL', code: `curl ${openaiBase}/responses \\\n  -H "Authorization: Bearer masdika_ai_YOUR_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "model": "glm-5.3",\n    "instructions": "Be concise.",\n    "input": "Explain Kubernetes in 2 sentences."\n  }'` },
                    { id: 'js', label: 'JavaScript', code: `import OpenAI from "openai";\nconst client = new OpenAI({ baseURL: "${openaiBase}", apiKey: process.env.MASDIKA_AI_KEY });\nconst res = await client.responses.create({\n  model: "glm-5.3",\n  input: "Explain Kubernetes in 2 sentences.",\n});\nconsole.log(res.output_text);` },
                  ]}
                />
              </div>
            </div>
          )}

          {/* PAGE: IMAGE GENERATION */}
          {page === 'images' && (
            <div className="space-y-6">
              <Callout variant="warning" title="Images are kept for 7 days" isDark={isDark}>
                Generated images are retained for <strong>7 days</strong> and then deleted automatically. Download the ones you want to keep.
              </Callout>
              <div className="space-y-2">
                <EndpointCard isDark={isDark} item={{ method: 'POST', path: '/api/ai/openai/v1/images/generations', desc: 'Create one or more images. Charged to your AI balance only when images are delivered.' }} />
                <EndpointCard isDark={isDark} item={{ method: 'GET', path: '/api/ai/openai/v1/images/generations', desc: 'List image requests of the last 7 days, newest first.' }} />
                <EndpointCard isDark={isDark} item={{ method: 'GET', path: '/api/ai/openai/v1/images/generations/{id}', desc: 'Fetch status and image URLs for a specific generation request.' }} />
              </div>
              <div className="space-y-2.5">
                <h3 className={cn('text-base font-bold', isDark ? 'text-white' : 'text-slate-900')}>Request</h3>
                <PropTable
                  isDark={isDark}
                  rows={[
                    { prop: 'model', type: 'string', desc: 'Image model ID (e.g. "seedream-image-v5.0-flash", "kling-image-v3", "hy-image-v3.5-preview").' },
                    { prop: 'prompt', type: 'string', desc: 'Text prompt describing the desired image.' },
                    { prop: 'size?', type: 'string', desc: 'Supported resolution for the chosen model (e.g. "2048x2048" or "1024x1024").' },
                    { prop: 'n?', type: 'number', desc: 'Number of images to generate (1 up to model maxN).' },
                    { prop: 'images?', type: 'string[]', desc: 'HTTPS reference image URLs (only for models with refImages > 0).' },
                    { prop: 'response_format?', type: '"url" | "b64_json"', desc: 'Return signed image URLs or base64 JSON.' },
                    { prop: 'async?', type: 'boolean', desc: 'Return job ID immediately and poll GET /images/generations/{id}.' },
                  ]}
                />
              </div>
              <div className="space-y-2.5">
                <h3 className={cn('text-base font-bold', isDark ? 'text-white' : 'text-slate-900')}>Examples</h3>
                <CodeBox
                  isDark={isDark}
                  copiedKey={copiedKey}
                  onCopy={(t, id) => handleCopy(t, id)}
                  tabs={[
                    { id: 'curl', label: 'cURL', code: `curl ${openaiBase}/images/generations \\\n  -H "Authorization: Bearer masdika_ai_YOUR_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "model": "seedream-image-v5.0-flash",\n    "prompt": "A small wooden boat on a calm lake at sunrise, watercolor"\n  }'` },
                    { id: 'js', label: 'JavaScript', code: `import OpenAI from "openai";\nconst client = new OpenAI({ baseURL: "${openaiBase}", apiKey: process.env.MASDIKA_AI_KEY });\nconst img = await client.images.generate({\n  model: "seedream-image-v5.0-flash",\n  prompt: "A small wooden boat on a calm lake at sunrise, watercolor",\n});\nconsole.log(img.data[0].url);` },
                    { id: 'py', label: 'Python', code: `from openai import OpenAI\nclient = OpenAI(base_url="${openaiBase}", api_key="masdika_ai_YOUR_KEY")\nimg = client.images.generate(\n    model="seedream-image-v5.0-flash",\n    prompt="A small wooden boat on a calm lake at sunrise, watercolor",\n)\nprint(img.data[0].url)` },
                  ]}
                />
              </div>
            </div>
          )}

          {/* PAGE: ANTHROPIC COMPATIBLE */}
          {page === 'anthropic' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <EndpointCard isDark={isDark} item={{ method: 'POST', path: '/api/ai/anthropic/v1/messages', desc: 'Anthropic Messages API (supports extended thinking, tools, and streaming).' }} />
                <EndpointCard isDark={isDark} item={{ method: 'POST', path: '/api/ai/anthropic/v1/messages/count_tokens', desc: 'Estimate input tokens for a messages request. Free - never charged.' }} />
              </div>
              <Callout variant="info" title="Do not append /v1 to Anthropic baseURL" isDark={isDark}>
                Official Anthropic SDKs and Claude Code append <code className="font-mono text-cyan-400">/v1/messages</code> automatically, so use <code className="font-mono text-cyan-400">{anthropicBase}</code>.
              </Callout>
              <CodeBox
                isDark={isDark}
                copiedKey={copiedKey}
                onCopy={(t, id) => handleCopy(t, id)}
                tabs={[
                  { id: 'js', label: 'JavaScript', code: `import Anthropic from "@anthropic-ai/sdk";\n\nconst client = new Anthropic({\n  baseURL: "${anthropicBase}",\n  apiKey: process.env.MASDIKA_AI_KEY,\n});\n\nconst msg = await client.messages.create({\n  model: "claude-sonnet-4-6",\n  max_tokens: 2000,\n  messages: [{ role: "user", content: "Hello from Anthropic SDK!" }],\n});\nconsole.log(msg.content);` },
                  { id: 'py', label: 'Python', code: `from anthropic import Anthropic\n\nclient = Anthropic(\n    base_url="${anthropicBase}",\n    api_key="masdika_ai_YOUR_KEY",\n)\n\nmsg = client.messages.create(\n    model="claude-sonnet-4-6",\n    max_tokens=2000,\n    messages=[{"role": "user", "content": "Hello from Anthropic SDK!"}],\n)\nprint(msg.content[0].text)` },
                ]}
              />
            </div>
          )}

          {/* PAGE: MODELS */}
          {page === 'models' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <EndpointCard isDark={isDark} item={{ method: 'GET', path: '/api/ai/openai/v1/models', desc: 'OpenAI-format list of active models.' }} />
                <EndpointCard isDark={isDark} item={{ method: 'GET', path: '/api/ai/models', desc: 'Detailed Management API catalog with IDR pricing tiers, peak windows, and imageModels.' }} />
              </div>
              <CodeBox
                isDark={isDark}
                copiedKey={copiedKey}
                onCopy={(t, id) => handleCopy(t, id)}
                code={`curl ${openaiBase}/models \\\n  -H "Authorization: Bearer masdika_ai_YOUR_KEY"`}
              />
            </div>
          )}

          {/* PAGE: PRICING & BILLING */}
          {page === 'pricing' && (
            <div className="space-y-5 text-xs leading-relaxed">
              <div className={cn('rounded-xl border p-4 space-y-2', isDark ? 'bg-[#0b0d12] border-white/[0.08] text-zinc-300' : 'bg-slate-50 border-slate-200 text-slate-700')}>
                <div className={cn('font-bold text-sm', isDark ? 'text-white' : 'text-slate-900')}>AI Balance &amp; Top-Up</div>
                <p>Gateway usage is billed directly in Rupiah from your dedicated <strong>AI Balance</strong>. Top up from your Masdika Wallet manually or enable <strong>Auto Top-Up</strong> (minimum top-up Rp 5.000, platform fee Rp {topupFeeRp.toLocaleString('id-ID')}).</p>
              </div>
              <div className={cn('rounded-xl border p-4 space-y-2', isDark ? 'bg-[#0b0d12] border-white/[0.08] text-zinc-300' : 'bg-slate-50 border-slate-200 text-slate-700')}>
                <div className={cn('font-bold text-sm', isDark ? 'text-white' : 'text-slate-900')}>Token Formula &amp; Peak Hours (WIB)</div>
                <p>Cost formula: <code className="font-mono text-cyan-400">(input × inputPrice + cached × cachePrice + output × outputPrice) / 1,000,000</code>.</p>
                <p>Models with <strong>Peak Pricing</strong> apply peak multipliers on <strong>Monday-Friday, 08:00-11:00 and 13:00-17:00 WIB</strong>. Failed upstream requests (<code className="font-mono">4xx/5xx</code>) cost Rp 0.</p>
              </div>
            </div>
          )}

          {/* PAGE: LIMITS & ERRORS */}
          {page === 'limits' && (
            <div className="space-y-5">
              <div className={cn('rounded-xl border p-4 text-xs leading-relaxed space-y-1', isDark ? 'bg-[#0b0d12] border-white/[0.08] text-zinc-300' : 'bg-slate-50 border-slate-200 text-slate-700')}>
                <div>• Gateway rate limit: <strong>600 requests/minute</strong> per account</div>
                <div>• Management API rate limit: <strong>60 requests/second</strong> per key</div>
                <div>• Max request body: <strong>8 MB</strong> · Default output cap: <strong>16,384 tokens</strong></div>
                <div>• Every gateway response includes <code className="font-mono text-cyan-400">x-request-id</code> and <code className="font-mono text-cyan-400">x-masdika-model</code> headers.</div>
              </div>
              <PropTable
                isDark={isDark}
                rows={[
                  { prop: '400', type: 'invalid_request / unsupported_format', desc: 'Invalid JSON, missing model, or invalid parameter.' },
                  { prop: '401', type: 'missing_api_key / invalid_api_key', desc: 'Missing, unknown, expired, or revoked key.' },
                  { prop: '402', type: 'insufficient_balance', desc: 'AI balance cannot cover the request hold. Top up or enable Auto Top-Up.' },
                  { prop: '403', type: 'key_spend_limit_reached / SCOPE_NOT_ALLOWED', desc: 'Key reached its monthly spend limit or lacks required scope.' },
                  { prop: '404 / 410', type: 'model_not_found / model_retired', desc: 'Unknown, disabled, or retired model ID.' },
                  { prop: '413', type: 'request_too_large', desc: 'Request body exceeds 8 MB.' },
                  { prop: '429', type: 'rate_limited', desc: 'Too many requests. Retry with exponential backoff.' },
                  { prop: '502 / 503 / 504', type: 'upstream_error / TIMEOUT', desc: 'Upstream failure or timeout (>95s). Rp 0 charged.' },
                ]}
              />
            </div>
          )}

          {/* PAGE: MANAGEMENT API */}
          {page === 'management' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className={cn('text-base font-bold', isDark ? 'text-white' : 'text-slate-900')}>Base URL &amp; Authentication</h3>
                <p className={cn('text-xs leading-relaxed', isDark ? 'text-zinc-400' : 'text-slate-600')}>
                  Call <code className="font-mono text-cyan-400">{mgmtBase}</code> with a <strong>Masdika API Key</strong> (<code className="font-mono">masdika_...</code> with <code className="font-mono">AI</code> or <code className="font-mono">ALL</code> scope). AI Gateway keys (<code className="font-mono">masdika_ai_...</code>) are rejected here.
                </p>
                <CodeBox
                  isDark={isDark}
                  copiedKey={copiedKey}
                  onCopy={(t, id) => handleCopy(t, id)}
                  code={`curl ${mgmtBase}/overview \\\n  -H "Authorization: Bearer masdika_YOUR_API_KEY"`}
                />
              </div>

              <div className="space-y-2">
                <h3 className={cn('text-base font-bold', isDark ? 'text-white' : 'text-slate-900')}>Endpoints</h3>
                <div className="space-y-2">
                  <EndpointCard isDark={isDark} item={{ method: 'GET', path: '/api/ai/models', desc: 'All active chat models & imageModels with IDR pricing.' }} />
                  <EndpointCard isDark={isDark} item={{ method: 'GET', path: '/api/ai/overview', desc: 'AI balance, wallet balance, auto top-up settings, and top-up packs.' }} />
                  <EndpointCard isDark={isDark} item={{ method: 'GET', path: '/api/ai/usage', desc: 'Monthly per-model totals and latest 100 requests (?keyId, ?model, ?limit, ?page).' }} />
                  <EndpointCard isDark={isDark} item={{ method: 'GET', path: '/api/ai/metrics', desc: 'Hourly (24h) or daily (7d/30d) WIB series, p95 latency, cache hit rate.' }} />
                  <EndpointCard isDark={isDark} item={{ method: 'GET', path: '/api/ai/keys', desc: 'List AI Gateway keys (without secrets).' }} />
                  <EndpointCard isDark={isDark} item={{ method: 'DELETE', path: '/api/ai/keys/{keyId}', desc: 'Revoke an AI Gateway key immediately.' }} />
                  <EndpointCard isDark={isDark} item={{ method: 'POST', path: '/api/ai/topup', badges: ['charges wallet', 'dryRun', 'Idempotency-Key'], desc: 'Move money from Masdika Wallet to AI Balance via packId or amount.' }} />
                  <EndpointCard isDark={isDark} item={{ method: 'PUT', path: '/api/ai/auto-topup', badges: ['dryRun'], desc: 'Enable/configure automatic wallet-to-AI refill.' }} />
                  <EndpointCard isDark={isDark} item={{ method: 'POST', path: '/api/ai/images', badges: ['dryRun', 'Idempotency-Key'], desc: 'Generate images billed to AI balance.' }} />
                  <EndpointCard isDark={isDark} item={{ method: 'GET', path: '/api/ai/images', desc: 'List image generation requests of the last 7 days.' }} />
                  <EndpointCard isDark={isDark} item={{ method: 'GET', path: '/api/ai/images/{requestId}', desc: 'Poll image request status & URLs.' }} />
                  <EndpointCard isDark={isDark} item={{ method: 'POST', path: '/api/ai/chat', desc: 'Non-streaming single chat reply billed to AI balance (95s timeout).' }} />
                </div>
              </div>

              <div className="space-y-2.5">
                <h3 className={cn('text-base font-bold', isDark ? 'text-white' : 'text-slate-900')}>Top up &amp; Auto top-up</h3>
                <PropTable
                  isDark={isDark}
                  rows={[
                    { prop: 'packId?', type: 'string', desc: 'Pack ID (e.g. "pack-50k", "pack-100k", "pack-250k", "pack-500k", "pack-1m"). Send either packId or amount.' },
                    { prop: 'amount?', type: 'number', desc: 'Custom top-up amount in Rupiah (minimum Rp 5.000).' },
                  ]}
                />
                <CodeBox
                  isDark={isDark}
                  copiedKey={copiedKey}
                  onCopy={(t, id) => handleCopy(t, id)}
                  tabs={[
                    { id: 'dry', label: 'Topup Dry Run', code: `curl -X POST "${mgmtBase}/topup?dryRun=true" \\\n  -H "Authorization: Bearer masdika_YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{ "amount": 100000 }'` },
                    { id: 'real', label: 'Topup Execute', code: `curl -X POST ${mgmtBase}/topup \\\n  -H "Authorization: Bearer masdika_YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -H "Idempotency-Key: ai-topup-2026-11-16-0001" \\\n  -d '{ "amount": 100000 }'` },
                    { id: 'auto', label: 'Auto Top-Up', code: `curl -X PUT ${mgmtBase}/auto-topup \\\n  -H "Authorization: Bearer masdika_YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{ "enabled": true, "threshold": 20000, "amount": 100000 }'` },
                  ]}
                />
              </div>

              <div className="space-y-2.5">
                <h3 className={cn('text-base font-bold', isDark ? 'text-white' : 'text-slate-900')}>Images &amp; Chat</h3>
                <CodeBox
                  isDark={isDark}
                  copiedKey={copiedKey}
                  onCopy={(t, id) => handleCopy(t, id)}
                  tabs={[
                    { id: 'img', label: 'Generate Image', code: `curl -X POST ${mgmtBase}/images \\\n  -H "Authorization: Bearer masdika_YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -H "Idempotency-Key: img-2026-11-16-0001" \\\n  -d '{ "model": "kling-image-v3", "prompt": "A lighthouse at dusk, watercolor" }'` },
                    { id: 'chat', label: 'Chat Reply', code: `curl -X POST ${mgmtBase}/chat \\\n  -H "Authorization: Bearer masdika_YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{ "model": "glm-5.3", "messages": [{ "role": "user", "content": "Write a bakery tagline." }], "maxTokens": 200 }'` },
                  ]}
                />
              </div>
            </div>
          )}
        </main>

        {/* Right "On this page" Anchor Rail */}
        <aside className={cn('hidden xl:block xl:col-span-2 border-l p-5 space-y-3', isDark ? 'border-white/[0.08]' : 'border-slate-200')}>
          <div className={cn('flex items-center gap-1.5 text-[11px] font-semibold', isDark ? 'text-zinc-400' : 'text-slate-600')}>
            <List className="w-3.5 h-3.5" />
            <span>On this page</span>
          </div>
          <ul className="space-y-2 border-l border-white/[0.08] pl-3">
            {meta.anchors.map((a, idx) => (
              <li
                key={a}
                className={cn(
                  'text-xs leading-snug',
                  idx === 0
                    ? 'text-cyan-400 font-semibold'
                    : isDark
                    ? 'text-zinc-500'
                    : 'text-slate-500',
                )}
              >
                {a}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
