'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Sparkles,
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  Activity,
  Wallet,
  Cpu,
  Search,
  Terminal,
  BookOpen,
  ShieldCheck,
  X,
  Power,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';
import { formatRupiah } from '@/lib/billing';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface AiModelItem {
  id: number;
  modelId: string;
  name: string;
  provider: string;
  contextWindow: string;
  inputPricePer1M: number;
  cachePricePer1M: number;
  outputPricePer1M: number;
  originalInputPricePer1M?: number | null;
  originalCachePricePer1M?: number | null;
  originalOutputPricePer1M?: number | null;
  discountBadge?: string | null;
  openaiOnly: boolean;
  hasPeakPricing: boolean;
}

interface AiKeyItem {
  id: number;
  name: string;
  keyPrefix: string;
  monthlyLimit: number | null;
  monthlySpent: number;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

interface AiUsageItem {
  id: number;
  requestId: string;
  modelId: string;
  endpoint: string;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  costRp: number;
  latencyMs: number;
  statusCode: number;
  createdAt: string;
  apiKey?: { name: string; keyPrefix: string } | null;
}

type TabId = 'keys' | 'models' | 'usage' | 'docs';
type DocLang = 'curl' | 'node' | 'python' | 'anthropic' | 'claudecode';

export default function CustomerAiGatewayPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [balance, setBalance] = useState(0);
  const [models, setModels] = useState<AiModelItem[]>([]);
  const [keys, setKeys] = useState<AiKeyItem[]>([]);
  const [usageLogs, setUsageLogs] = useState<AiUsageItem[]>([]);
  const [stats, setStats] = useState({ totalRequests: 0, totalSpentRp: 0, totalTokens: 0 });

  const [activeTab, setActiveTab] = useState<TabId>('keys');
  const [modelSearch, setModelSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('ALL');
  const [expandedModelId, setExpandedModelId] = useState<number | null>(null);
  const [docLang, setDocLang] = useState<DocLang>('curl');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [origin, setOrigin] = useState('https://www.masdika.id');

  // Create Key Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newMonthlyLimit, setNewMonthlyLimit] = useState('');
  const [creating, setCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  // Revoke Modal
  const [deletingKey, setDeletingKey] = useState<AiKeyItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/user/ai-gateway', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load AI Gateway');
      const d = json.data;
      setEnabled(Boolean(d.enabled));
      setBalance(d.balance || 0);
      setModels(d.models || []);
      setKeys(d.keys || []);
      setUsageLogs(d.usageLogs || []);
      setStats(d.stats || { totalRequests: 0, totalSpentRp: 0, totalTokens: 0 });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load AI Gateway');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setOrigin(window.location.origin);
    fetchData();
  }, []);

  const handleCopy = (val: string, id: string, label = 'Copied to clipboard') => {
    navigator.clipboard.writeText(val);
    setCopiedId(id);
    toast.success(label);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/user/ai-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName.trim() || 'AI Gateway Key',
          monthlyLimit: newMonthlyLimit.trim() ? Number(newMonthlyLimit.trim()) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Failed to create API key');
        return;
      }
      setRevealedKey(json.rawKey);
      setNewKeyName('');
      setNewMonthlyLimit('');
      setIsCreateOpen(false);
      toast.success('AI Gateway key created');
      await fetchData();
    } catch {
      toast.error('Network error while creating key');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleKey = async (k: AiKeyItem) => {
    try {
      const res = await fetch('/api/user/ai-gateway', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: k.id, isActive: !k.isActive }),
      });
      if (!res.ok) throw new Error('Failed to update key');
      toast.success(k.isActive ? 'Key paused' : 'Key activated');
      await fetchData();
    } catch {
      toast.error('Failed to update key status');
    }
  };

  const handleDeleteKey = async () => {
    if (!deletingKey) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/user/ai-gateway', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deletingKey.id }),
      });
      if (!res.ok) throw new Error('Failed to revoke key');
      toast.success('API key revoked');
      setDeletingKey(null);
      await fetchData();
    } catch {
      toast.error('Failed to revoke API key');
    } finally {
      setDeleting(false);
    }
  };

  const providers = useMemo(() => {
    const set = new Set(models.map((m) => m.provider));
    return ['ALL', ...Array.from(set)];
  }, [models]);

  const filteredModels = useMemo(() => {
    const q = modelSearch.trim().toLowerCase();
    return models.filter((m) => {
      if (providerFilter !== 'ALL' && m.provider !== providerFilter) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.modelId.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q)
      );
    });
  }, [models, modelSearch, providerFilter]);

  const openaiBase = `${origin}/api/ai/v1`;
  const anthropicBase = `${origin}/api/ai`;
  const sampleModel = models[0]?.modelId || 'deepseek-v4.1-flash';

  const codeSnippets: Record<DocLang, { title: string; code: string }> = {
    curl: {
      title: 'curl (OpenAI Format)',
      code: `curl ${openaiBase}/chat/completions \\
  -H "Authorization: Bearer masdika_ai_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${sampleModel}",
    "messages": [{ "role": "user", "content": "Hello Masdika AI!" }]
  }'`,
    },
    node: {
      title: 'OpenAI SDK (Node.js)',
      code: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${openaiBase}",
  apiKey: process.env.MASDIKA_AI_KEY,
});

const res = await client.chat.completions.create({
  model: "${sampleModel}",
  messages: [{ role: "user", content: "Hello!" }],
});
console.log(res.choices[0].message.content);`,
    },
    python: {
      title: 'OpenAI SDK (Python)',
      code: `import os
from openai import OpenAI

client = OpenAI(
    base_url="${openaiBase}",
    api_key=os.environ["MASDIKA_AI_KEY"],
)
res = client.chat.completions.create(
    model="${sampleModel}",
    messages=[{"role": "user", "content": "Hello!"}],
)
print(res.choices[0].message.content)`,
    },
    anthropic: {
      title: 'Anthropic SDK (Node.js)',
      code: `import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  baseURL: "${anthropicBase}",
  apiKey: process.env.MASDIKA_AI_KEY,
});

const msg = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello!" }],
});`,
    },
    claudecode: {
      title: 'Claude Code CLI',
      code: `export ANTHROPIC_BASE_URL=${anthropicBase}
export ANTHROPIC_AUTH_TOKEN=masdika_ai_YOUR_KEY
export ANTHROPIC_MODEL=claude-sonnet-4-6
export ANTHROPIC_DEFAULT_HAIKU_MODEL=claude-haiku-4-5
claude`,
    },
  };

  return (
    <div className="space-y-6 max-w-full pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className={cn('text-xl sm:text-2xl font-bold tracking-tight', isDark ? 'text-white' : 'text-slate-900')}>
              AI Gateway
            </h1>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold border whitespace-nowrap shrink-0',
                isDark ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-cyan-50 text-cyan-700 border-cyan-200'
              )}
            >
              <Sparkles className="w-3 h-3 shrink-0" />
              OpenAI &amp; Anthropic Compatible
            </span>
          </div>
          <p className={cn('text-xs sm:text-sm font-medium mt-1.5 max-w-2xl leading-relaxed', isDark ? 'text-zinc-400' : 'text-slate-500')}>
            Access {models.length || 73}+ AI models using your Masdika wallet balance via a unified OpenAI, Anthropic, and Claude Code API endpoint.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            className={cn(
              'px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 border cursor-pointer',
              isDark ? 'border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs'
            )}
          >
            <RefreshCw className={cn('w-3.5 h-3.5', (refreshing || loading) && 'animate-spin text-cyan-400')} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            disabled={keys.length >= 10}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 flex items-center justify-center gap-2 bg-cyan-400 hover:bg-cyan-300 active:scale-95 disabled:opacity-50 text-slate-950 shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create API Key</span>
          </button>
        </div>
      </div>

      {!loading && !enabled && (
        <div
          className={cn(
            'p-4 rounded-2xl border flex items-center gap-3 text-xs',
            isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
          )}
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>AI Gateway is currently offline or awaiting upstream configuration by the administrator.</span>
        </div>
      )}

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={cn('rounded-2xl border p-5 transition-all shadow-2xs', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90')}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn('text-[11px] font-bold uppercase tracking-wider', isDark ? 'text-zinc-400' : 'text-slate-500')}>
              API KEYS
            </span>
            <div className={cn('w-9 h-9 rounded-xl border flex items-center justify-center', isDark ? 'bg-cyan-500/15 border-cyan-500/25 text-cyan-400' : 'bg-cyan-50 border-cyan-200 text-cyan-700')}>
              <Key className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn('text-2xl font-black tracking-tight', isDark ? 'text-white' : 'text-slate-900')}>
              {keys.filter((k) => k.isActive).length}
            </span>
            <span className={cn('text-xs font-semibold', isDark ? 'text-cyan-400' : 'text-cyan-600')}>
              / 10 Active
            </span>
          </div>
        </div>

        <div className={cn('rounded-2xl border p-5 transition-all shadow-2xs', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90')}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn('text-[11px] font-bold uppercase tracking-wider', isDark ? 'text-zinc-400' : 'text-slate-500')}>
              TOTAL REQUESTS
            </span>
            <div className={cn('w-9 h-9 rounded-xl border flex items-center justify-center', isDark ? 'bg-cyan-500/15 border-cyan-500/25 text-cyan-400' : 'bg-cyan-50 border-cyan-200 text-cyan-700')}>
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn('text-2xl font-black tracking-tight', isDark ? 'text-white' : 'text-slate-900')}>
              {stats.totalRequests.toLocaleString('id-ID')}
            </span>
            <span className={cn('text-xs font-semibold', isDark ? 'text-cyan-400' : 'text-cyan-600')}>
              Calls
            </span>
          </div>
        </div>

        <div className={cn('rounded-2xl border p-5 transition-all shadow-2xs', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90')}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn('text-[11px] font-bold uppercase tracking-wider', isDark ? 'text-zinc-400' : 'text-slate-500')}>
              TOKENS PROCESSED
            </span>
            <div className={cn('w-9 h-9 rounded-xl border flex items-center justify-center', isDark ? 'bg-cyan-500/15 border-cyan-500/25 text-cyan-400' : 'bg-cyan-50 border-cyan-200 text-cyan-700')}>
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn('text-2xl font-black tracking-tight', isDark ? 'text-white' : 'text-slate-900')}>
              {stats.totalTokens.toLocaleString('id-ID')}
            </span>
            <span className={cn('text-xs font-semibold', isDark ? 'text-cyan-400' : 'text-cyan-600')}>
              Tokens
            </span>
          </div>
        </div>

        <div className={cn('rounded-2xl border p-5 transition-all shadow-2xs', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200/90')}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn('text-[11px] font-bold uppercase tracking-wider', isDark ? 'text-zinc-400' : 'text-slate-500')}>
              WALLET BALANCE
            </span>
            <div className={cn('w-9 h-9 rounded-xl border flex items-center justify-center', isDark ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : 'bg-cyan-50 border-cyan-200 text-cyan-700')}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className={cn('text-2xl font-black tracking-tight', isDark ? 'text-white' : 'text-slate-900')}>
              {formatRupiah(balance)}
            </span>
            <Link href="/dashboard/topup" className="text-xs font-semibold text-cyan-400 hover:underline">
              Top Up →
            </Link>
          </div>
        </div>
      </div>

      {/* Endpoint Quick Bar */}
      <div className={cn('rounded-2xl border p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200 shadow-2xs')}>
        <div>
          <span className={cn('text-[10px] font-bold uppercase tracking-wider block mb-1.5', isDark ? 'text-zinc-400' : 'text-slate-500')}>
            OpenAI Base URL
          </span>
          <div className="flex items-center gap-2">
            <code className={cn('flex-1 px-3 py-2 rounded-xl border font-mono text-xs truncate', isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-cyan-400' : 'bg-slate-50 border-slate-200 text-cyan-700')}>
              {openaiBase}
            </code>
            <button
              type="button"
              onClick={() => handleCopy(openaiBase, 'openai-url', 'OpenAI Base URL copied')}
              className={cn('p-2 rounded-xl border transition-colors', isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-zinc-300 hover:text-white' : 'bg-white border-slate-200 text-slate-700')}
            >
              {copiedId === 'openai-url' ? <Check className="w-4 h-4 text-cyan-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <span className={cn('text-[10px] font-bold uppercase tracking-wider block mb-1.5', isDark ? 'text-zinc-400' : 'text-slate-500')}>
            Anthropic &amp; Claude Code Base URL
          </span>
          <div className="flex items-center gap-2">
            <code className={cn('flex-1 px-3 py-2 rounded-xl border font-mono text-xs truncate', isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-cyan-400' : 'bg-slate-50 border-slate-200 text-cyan-700')}>
              {anthropicBase}
            </code>
            <button
              type="button"
              onClick={() => handleCopy(anthropicBase, 'anthropic-url', 'Anthropic Base URL copied')}
              className={cn('p-2 rounded-xl border transition-colors', isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-zinc-300 hover:text-white' : 'bg-white border-slate-200 text-slate-700')}
            >
              {copiedId === 'anthropic-url' ? <Check className="w-4 h-4 text-cyan-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Masdika Navigation Tabs */}
      <div className={cn('w-fit max-w-full rounded-2xl border p-1.5', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200 shadow-2xs')}>
        <div className={cn('flex items-center gap-1.5 p-1.5 rounded-xl border overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden', isDark ? 'bg-[#0a0a0c] border-white/[0.08]' : 'bg-slate-100 border-slate-200')}>
          {([
            { id: 'keys', label: 'API Keys', icon: Key, count: keys.length },
            { id: 'models', label: 'Models & Pricing', icon: Cpu, count: models.length },
            { id: 'usage', label: 'Usage Logs', icon: Activity, count: usageLogs.length },
            { id: 'docs', label: 'Quickstart Docs', icon: BookOpen },
          ] as const).map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer',
                  active
                    ? 'bg-cyan-400 text-slate-950 shadow-sm'
                    : isDark
                    ? 'text-zinc-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <t.icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
                {'count' in t && (
                  <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-mono', active ? 'bg-slate-950/15 text-slate-950' : isDark ? 'bg-white/[0.08] text-zinc-300' : 'bg-slate-200 text-slate-700')}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: API KEYS */}
      {activeTab === 'keys' && (
        <div className={cn('rounded-2xl border overflow-hidden', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200 shadow-2xs')}>
          {keys.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center bg-cyan-500/15 border border-cyan-500/25 text-cyan-400">
                <Key className="w-6 h-6" />
              </div>
              <h3 className={cn('text-base font-bold', isDark ? 'text-white' : 'text-slate-900')}>
                No AI Gateway Keys Yet
              </h3>
              <p className={cn('text-xs max-w-md mx-auto', isDark ? 'text-zinc-400' : 'text-slate-600')}>
                Create an API key to start calling {models.length}+ models using OpenAI SDK, Anthropic SDK, or Claude Code.
              </p>
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Create API Key
              </button>
            </div>
          ) : (
            <div className={cn('divide-y', isDark ? 'divide-white/[0.06]' : 'divide-slate-100')}>
              {keys.map((k) => (
                <div key={k.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn('font-bold text-sm', isDark ? 'text-white' : 'text-slate-900')}>{k.name}</span>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                          k.isActive
                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                            : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                        )}
                      >
                        {k.isActive ? 'ACTIVE' : 'PAUSED'}
                      </span>
                    </div>
                    <div className={cn('text-xs font-mono flex flex-wrap items-center gap-x-3 gap-y-1', isDark ? 'text-zinc-400' : 'text-slate-600')}>
                      <span>{k.keyPrefix}••••••••</span>
                      <span>• Spent this month: {formatRupiah(k.monthlySpent)}</span>
                      <span>• Limit: {k.monthlyLimit ? formatRupiah(k.monthlyLimit) : 'Unlimited'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleKey(k)}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer',
                        isDark ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-white/[0.08]' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      )}
                    >
                      <Power className="w-3.5 h-3.5 text-cyan-400" />
                      {k.isActive ? 'Pause' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingKey(k)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-red-500/25 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MODELS & PRICING */}
      {activeTab === 'models' && (
        <div className={cn('rounded-2xl border overflow-hidden', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200 shadow-2xs')}>
          <div className={cn('p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3', isDark ? 'border-white/[0.08]' : 'border-slate-200')}>
            <div className="relative flex-1 max-w-md">
              <Search className={cn('w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2', isDark ? 'text-zinc-500' : 'text-slate-400')} />
              <input
                type="text"
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                placeholder="Search model name, ID, or provider..."
                className={cn(
                  'w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm border outline-none transition-colors',
                  isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-white placeholder:text-zinc-500 focus:border-cyan-500/50' : 'bg-slate-50 border-slate-200 text-slate-900'
                )}
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {providers.map((prov) => (
                <button
                  key={prov}
                  type="button"
                  onClick={() => setProviderFilter(prov)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer',
                    providerFilter === prov
                      ? 'bg-cyan-400 text-slate-950'
                      : isDark
                      ? 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/[0.06]'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  )}
                >
                  {prov}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={cn('text-[11px] font-bold uppercase tracking-wider border-b', isDark ? 'text-zinc-400 border-white/[0.08] bg-[#0a0a0c]' : 'text-slate-500 border-slate-200 bg-slate-50')}>
                  <th className="px-5 py-3.5">Model</th>
                  <th className="px-4 py-3.5">Context</th>
                  <th className="px-4 py-3.5 text-right">Input / 1M</th>
                  <th className="px-4 py-3.5 text-right">Cache / 1M</th>
                  <th className="px-5 py-3.5 text-right">Output / 1M</th>
                  <th className="w-10 px-3 py-3.5"></th>
                </tr>
              </thead>
              <tbody className={cn('divide-y text-xs sm:text-sm', isDark ? 'divide-white/[0.06]' : 'divide-slate-100')}>
                {filteredModels.map((m) => {
                  const discountPct =
                    m.originalOutputPricePer1M && m.originalOutputPricePer1M > m.outputPricePer1M
                      ? Math.round(((m.originalOutputPricePer1M - m.outputPricePer1M) / m.originalOutputPricePer1M) * 100)
                      : m.originalInputPricePer1M && m.originalInputPricePer1M > m.inputPricePer1M
                      ? Math.round(((m.originalInputPricePer1M - m.inputPricePer1M) / m.originalInputPricePer1M) * 100)
                      : 0;
                  const badgeText = m.discountBadge || (discountPct > 0 ? `-${discountPct}%` : null);
                  const isExpanded = expandedModelId === m.id;

                  // Example: 1,000 input + 1,000 cached + 500 output
                  const sampleInputCost = (1000 * m.inputPricePer1M) / 1_000_000;
                  const sampleCacheCost = (1000 * m.cachePricePer1M) / 1_000_000;
                  const sampleOutputCost = (500 * m.outputPricePer1M) / 1_000_000;
                  const sampleTotal = sampleInputCost + sampleCacheCost + sampleOutputCost;
                  const requestsPer5000 = sampleTotal > 0 ? Math.floor(5000 / sampleTotal) : 0;
                  const fmtDec = (val: number) => `Rp ${val.toFixed(2).replace('.', ',')}`;

                  return (
                  <Fragment key={m.id}>
                  <tr
                    onClick={() => setExpandedModelId(isExpanded ? null : m.id)}
                    className={cn(
                      'cursor-pointer transition-colors',
                      isExpanded
                        ? isDark ? 'bg-cyan-500/[0.05]' : 'bg-cyan-50/70'
                        : isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'
                    )}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('font-bold', isDark ? 'text-white' : 'text-slate-900')}>{m.name}</span>
                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold border', isDark ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-cyan-50 text-cyan-700 border-cyan-200')}>
                          {m.provider}
                        </span>
                        {badgeText && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-400/15 text-cyan-400 border border-cyan-400/30">
                            {badgeText}
                          </span>
                        )}
                        {m.hasPeakPricing && (
                          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold border', isDark ? 'bg-zinc-800 text-zinc-300 border-white/10' : 'bg-slate-100 text-slate-600 border-slate-200')}>
                            Peak Pricing
                          </span>
                        )}
                      </div>
                      <div className={cn('font-mono text-xs mt-0.5 flex items-center gap-2', isDark ? 'text-zinc-500' : 'text-slate-500')}>
                        <span>{m.modelId}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(m.modelId, `model-${m.id}`, `Copied ${m.modelId}`);
                          }}
                          className="hover:text-cyan-400 transition-colors cursor-pointer"
                        >
                          {copiedId === `model-${m.id}` ? <Check className="w-3 h-3 text-cyan-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                    <td className={cn('px-4 py-3.5 font-mono text-xs', isDark ? 'text-zinc-300' : 'text-slate-700')}>
                      {m.contextWindow}
                    </td>
                    <td className={cn('px-4 py-3.5 font-mono font-bold text-right', isDark ? 'text-cyan-400' : 'text-cyan-700')}>
                      {m.originalInputPricePer1M && m.originalInputPricePer1M > m.inputPricePer1M && (
                        <span className="text-[11px] font-normal line-through text-zinc-500 block">
                          {formatRupiah(m.originalInputPricePer1M)}
                        </span>
                      )}
                      {formatRupiah(m.inputPricePer1M)}
                    </td>
                    <td className={cn('px-4 py-3.5 font-mono text-right', isDark ? 'text-zinc-300' : 'text-slate-600')}>
                      {m.originalCachePricePer1M && m.originalCachePricePer1M > m.cachePricePer1M && (
                        <span className="text-[11px] font-normal line-through text-zinc-500 block">
                          {formatRupiah(m.originalCachePricePer1M)}
                        </span>
                      )}
                      {formatRupiah(m.cachePricePer1M)}
                    </td>
                    <td className={cn('px-5 py-3.5 font-mono font-bold text-right', isDark ? 'text-white' : 'text-slate-900')}>
                      {m.originalOutputPricePer1M && m.originalOutputPricePer1M > m.outputPricePer1M && (
                        <span className="text-[11px] font-normal line-through text-zinc-500 block">
                          {formatRupiah(m.originalOutputPricePer1M)}
                        </span>
                      )}
                      {formatRupiah(m.outputPricePer1M)}
                    </td>
                    <td className="px-3 py-3.5 text-center text-zinc-500">
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-cyan-400 mx-auto" /> : <ChevronDown className="w-4 h-4 mx-auto" />}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className={isDark ? 'bg-[#0a0a0c]' : 'bg-slate-50/80'}>
                      <td colSpan={6} className="px-5 py-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                          <div className="space-y-2.5 text-xs">
                            <div className="flex items-center gap-3">
                              <span className={cn('w-24 shrink-0', isDark ? 'text-zinc-500' : 'text-slate-500')}>Model ID</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(m.modelId, `exp-${m.id}`, `Copied ${m.modelId}`)}
                                className={cn('inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border font-mono text-xs cursor-pointer transition-colors', isDark ? 'bg-[#111115] border-white/10 text-zinc-200 hover:border-cyan-500/40' : 'bg-white border-slate-200 text-slate-800 hover:border-cyan-500')}
                              >
                                {m.modelId}
                                {copiedId === `exp-${m.id}` ? <Check className="w-3 h-3 text-cyan-400" /> : <Copy className="w-3 h-3 text-zinc-400" />}
                              </button>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={cn('w-24 shrink-0', isDark ? 'text-zinc-500' : 'text-slate-500')}>Context</span>
                              <span className={isDark ? 'text-zinc-200 font-medium' : 'text-slate-800 font-medium'}>{m.contextWindow} tokens</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={cn('w-24 shrink-0', isDark ? 'text-zinc-500' : 'text-slate-500')}>API Format</span>
                              <span className={isDark ? 'text-zinc-200' : 'text-slate-800'}>
                                {m.openaiOnly ? 'OpenAI Chat Completions only' : 'OpenAI Chat Completions · Anthropic Messages'}
                              </span>
                            </div>
                          </div>

                          <div className={cn('rounded-2xl overflow-hidden border shadow-xl text-xs', isDark ? 'bg-[#0b0d12] border-white/[0.1]' : 'bg-white border-slate-200')}>
                            <div className={cn('px-4 py-2.5 border-b flex items-center justify-between', isDark ? 'bg-[#12151e] border-white/[0.07]' : 'bg-slate-100 border-slate-200')}>
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                                <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                                <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                                <span className={cn('ml-1.5 font-mono text-[11px] font-semibold', isDark ? 'text-zinc-300' : 'text-slate-700')}>
                                  Example: one chat request
                                </span>
                              </div>
                              <span className={cn('font-mono text-[10px]', isDark ? 'text-zinc-500' : 'text-slate-500')}>
                                {m.modelId}
                              </span>
                            </div>
                            <div className="p-4 space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>New input</span>
                                <span className="font-mono tabular-nums">
                                  <span className={isDark ? 'text-zinc-500' : 'text-slate-400'}>1,000 × {formatRupiah(m.inputPricePer1M)}/1M </span>
                                  <span className={isDark ? 'text-zinc-200 font-semibold ml-2' : 'text-slate-800 font-semibold ml-2'}>{fmtDec(sampleInputCost)}</span>
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>Cached input</span>
                                <span className="font-mono tabular-nums">
                                  <span className={isDark ? 'text-zinc-500' : 'text-slate-400'}>1,000 × {formatRupiah(m.cachePricePer1M)}/1M </span>
                                  <span className={isDark ? 'text-zinc-200 font-semibold ml-2' : 'text-slate-800 font-semibold ml-2'}>{fmtDec(sampleCacheCost)}</span>
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>Output</span>
                                <span className="font-mono tabular-nums">
                                  <span className={isDark ? 'text-zinc-500' : 'text-slate-400'}>500 × {formatRupiah(m.outputPricePer1M)}/1M </span>
                                  <span className={isDark ? 'text-zinc-200 font-semibold ml-2' : 'text-slate-800 font-semibold ml-2'}>{fmtDec(sampleOutputCost)}</span>
                                </span>
                              </div>
                              <div className={cn('flex items-center justify-between pt-2 mt-2 border-t font-bold', isDark ? 'border-white/[0.08] text-white' : 'border-slate-200 text-slate-900')}>
                                <span>Total</span>
                                <span className="font-mono tabular-nums text-cyan-400">{fmtDec(sampleTotal)}</span>
                              </div>
                              <p className={cn('text-[11px] pt-1', isDark ? 'text-zinc-400' : 'text-slate-500')}>
                                ≈ {requestsPer5000.toLocaleString('id-ID')} requests like this with Rp 5.000.
                              </p>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: USAGE LOGS */}
      {activeTab === 'usage' && (
        <div className={cn('rounded-2xl border overflow-hidden', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200 shadow-2xs')}>
          {usageLogs.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Activity className="w-8 h-8 text-cyan-400 mx-auto opacity-60" />
              <p className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-slate-900')}>No Usage Recorded Yet</p>
              <p className={cn('text-xs', isDark ? 'text-zinc-400' : 'text-slate-500')}>
                Prompts and answers are never stored — only token counts, charges, and latency appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={cn('text-[11px] font-bold uppercase tracking-wider border-b', isDark ? 'text-zinc-400 border-white/[0.08] bg-[#0a0a0c]' : 'text-slate-500 border-slate-200 bg-slate-50')}>
                    <th className="px-5 py-3.5">Model / Key</th>
                    <th className="px-4 py-3.5 text-right">Input</th>
                    <th className="px-4 py-3.5 text-right">Cache</th>
                    <th className="px-4 py-3.5 text-right">Output</th>
                    <th className="px-4 py-3.5 text-right">Charge</th>
                    <th className="px-5 py-3.5 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className={cn('divide-y text-xs', isDark ? 'divide-white/[0.06]' : 'divide-slate-100')}>
                  {usageLogs.map((u) => (
                    <tr key={u.id}>
                      <td className="px-5 py-3">
                        <div className={cn('font-mono font-bold', isDark ? 'text-white' : 'text-slate-900')}>{u.modelId}</div>
                        <div className={cn('text-[11px]', isDark ? 'text-zinc-500' : 'text-slate-500')}>
                          {u.apiKey?.name || 'Key'} • {u.latencyMs}ms
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{u.inputTokens.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-400">{u.cachedTokens.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono">{u.outputTokens.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-cyan-400">{formatRupiah(u.costRp)}</td>
                      <td className="px-5 py-3 text-right text-zinc-400">{new Date(u.createdAt).toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: QUICKSTART DOCS (macOS terminal style) */}
      {activeTab === 'docs' && (
        <div className={cn('rounded-2xl border p-5 sm:p-6 space-y-5', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200 shadow-2xs')}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className={cn('text-base font-bold flex items-center gap-2', isDark ? 'text-white' : 'text-slate-900')}>
                <Terminal className="w-4 h-4 text-cyan-400" />
                SDK &amp; CLI Integration
              </h2>
              <p className={cn('text-xs mt-1', isDark ? 'text-zinc-400' : 'text-slate-600')}>
                Works with OpenAI SDK, Anthropic SDK, cURL, and Claude Code. Failed upstream calls are never charged.
              </p>
            </div>
            <div className={cn('inline-flex items-center gap-1 p-1 rounded-xl border max-w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden', isDark ? 'bg-[#0a0a0c] border-white/[0.08]' : 'bg-slate-100 border-slate-200')}>
              {([
                { id: 'curl', label: 'cURL' },
                { id: 'node', label: 'OpenAI Node' },
                { id: 'python', label: 'OpenAI Python' },
                { id: 'anthropic', label: 'Anthropic SDK' },
                { id: 'claudecode', label: 'Claude Code' },
              ] as const).map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setDocLang(l.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer',
                    docLang === l.id ? 'bg-cyan-400 text-slate-950' : isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-600'
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden border border-white/[0.1] bg-[#0b0d12] shadow-xl">
            <div className="px-4 py-2.5 bg-[#12151e] border-b border-white/[0.07] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
                <span className="ml-2 text-xs font-mono text-zinc-400">{codeSnippets[docLang].title}</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(codeSnippets[docLang].code, `doc-${docLang}`, 'Snippet copied')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer"
              >
                {copiedId === `doc-${docLang}` ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                Copy
              </button>
            </div>
            <pre className="p-4 sm:p-5 text-xs font-mono text-zinc-200 overflow-x-auto leading-relaxed">
              <code>{codeSnippets[docLang].code}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Create Key Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={cn('w-full max-w-md rounded-2xl border p-6 space-y-5 shadow-2xl', isDark ? 'bg-[#0c0c0e] border-white/[0.1]' : 'bg-white border-slate-200')}>
            <div className="flex items-center justify-between">
              <h3 className={cn('text-lg font-bold', isDark ? 'text-white' : 'text-slate-900')}>Create AI Gateway Key</h3>
              <button type="button" onClick={() => setIsCreateOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateKey} className="space-y-4">
              <div>
                <label className={cn('text-xs font-bold uppercase tracking-wider block mb-1.5', isDark ? 'text-zinc-400' : 'text-slate-600')}>
                  Key Label
                </label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Claude Code Laptop"
                  className={cn('w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none', isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-900')}
                />
              </div>
              <div>
                <label className={cn('text-xs font-bold uppercase tracking-wider block mb-1.5', isDark ? 'text-zinc-400' : 'text-slate-600')}>
                  Monthly Spend Limit (Rp, optional)
                </label>
                <input
                  type="number"
                  min={1000}
                  value={newMonthlyLimit}
                  onChange={(e) => setNewMonthlyLimit(e.target.value)}
                  placeholder="Leave empty for unlimited (uses wallet balance)"
                  className={cn('w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none', isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-900')}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsCreateOpen(false)} className={cn('px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer', isDark ? 'border-white/[0.08] text-zinc-300' : 'border-slate-200 text-slate-700')}>
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 cursor-pointer disabled:opacity-50">
                  {creating ? 'Creating...' : 'Generate Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* One-time Key Reveal Modal */}
      {revealedKey && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={cn('w-full max-w-lg rounded-2xl border p-6 space-y-4 shadow-2xl', isDark ? 'bg-[#0c0c0e] border-white/[0.1]' : 'bg-white border-slate-200')}>
            <div className="flex items-center gap-2.5 text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
              <h3 className={cn('text-lg font-bold', isDark ? 'text-white' : 'text-slate-900')}>Save Your AI API Key</h3>
            </div>
            <p className={cn('text-xs leading-relaxed', isDark ? 'text-zinc-400' : 'text-slate-600')}>
              This secret key will only be shown once. Copy and store it securely in your environment variables.
            </p>
            <div className="flex items-center gap-2">
              <code className={cn('flex-1 px-3.5 py-2.5 rounded-xl border font-mono text-xs break-all', isDark ? 'bg-[#0a0a0c] border-cyan-500/30 text-cyan-400' : 'bg-slate-50 border-slate-200 text-cyan-700')}>
                {revealedKey}
              </code>
              <button
                type="button"
                onClick={() => handleCopy(revealedKey, 'new-key', 'API Key copied')}
                className="px-3.5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs cursor-pointer"
              >
                {copiedId === 'new-key' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setRevealedKey(null)} className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white cursor-pointer">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deletingKey)}
        onClose={() => setDeletingKey(null)}
        onConfirm={handleDeleteKey}
        title="Revoke AI Gateway Key"
        description={`Are you sure you want to permanently revoke "${deletingKey?.name}"? Any applications using this key will immediately stop working.`}
        confirmText="Revoke Key"
        variant="danger"
        isLoading={deleting}
      />
    </div>
  );
}
