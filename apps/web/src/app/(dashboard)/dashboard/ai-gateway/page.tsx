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
  MessageSquare,
  Image as ImageIcon,
  ImagePlus,
  Send,
  Download,
  Sliders,
  Zap,
  ArrowUpRight,
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';
import { formatRupiah } from '@/lib/billing';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Select } from '@/components/ui/Select';
import { AdminCheckbox } from '@/components/ui/AdminCheckbox';
import { PlainTextArea } from '@/components/ui/PlainTextArea';
import { AiToolIcon, type QuickstartDocId } from '@/components/ai-gateway/AiToolIcons';
import { AiGatewayDocsPortal } from '@/components/ai-gateway/AiGatewayDocsPortal';

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

interface AiImageModelItem {
  modelId: string;
  name: string;
  description?: string;
  sizes: string[];
  sizePrices?: Record<string, number>;
  tokensPerImage: number;
  basePriceRp: number;
  priceRp: number;
  maxN: number;
  maxRefImages: number;
}

interface AiKeyItem {
  id: number;
  name: string;
  keyPrefix: string;
  monthlyLimit: number | null;
  monthlySpent: number;
  allowedModels?: string[];
  expiresAt?: string | null;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

interface AiUsageItem {
  id: number;
  apiKeyId: number;
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
  apiKey?: { id?: number; name: string; keyPrefix: string } | null;
}

interface MonthModelSummary {
  modelId: string;
  requests: number;
  costRp: number;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
}

interface ChatMessageItem {
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  reasoning?: string;
  requestId?: string;
  latencyMs?: number;
  costRp?: number;
  tokens?: number;
  isError?: boolean;
}

interface GeneratedImageRecord {
  id: string;
  prompt: string;
  modelId: string;
  size: string;
  url: string;
  costRp: number;
  createdAt: string;
}

type TabId = 'overview' | 'keys' | 'playground' | 'images' | 'usage' | 'models' | 'docs';
type DocLang =
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

const SAMPLE_IMAGE_PROMPTS = [
  'A cat flying a helicopter over rice fields, photo',
  'Minimalist logo of a hummingbird, flat vector',
  'Cozy coffee shop in Bandung at night, rain, watercolor',
  'Product shot of a ceramic mug on a wooden table',
];

export default function CustomerAiGatewayPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [lockedCommitment, setLockedCommitment] = useState(0);
  const [availableWalletBalance, setAvailableWalletBalance] = useState(0);
  const [aiBalance, setAiBalance] = useState(0);
  const [topupFeeRp, setTopupFeeRp] = useState(5000);
  const [isPeakNow, setIsPeakNow] = useState(false);
  const [models, setModels] = useState<AiModelItem[]>([]);
  const [imageModels, setImageModels] = useState<AiImageModelItem[]>([]);
  const [keys, setKeys] = useState<AiKeyItem[]>([]);
  const [usageLogs, setUsageLogs] = useState<AiUsageItem[]>([]);
  const [thisMonthByModel, setThisMonthByModel] = useState<MonthModelSummary[]>([]);
  const [stats, setStats] = useState({
    totalRequests: 0,
    totalSpentRp: 0,
    spentThisMonthRp: 0,
    avgLatencyMs: 0,
    inputTokens: 0,
    cachedTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  });

  // Navigation & Filters
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [modelTypeTab, setModelTypeTab] = useState<'chat' | 'image'>('chat');
  const [modelSearch, setModelSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('ALL');
  const [expandedModelId, setExpandedModelId] = useState<number | null>(null);
  const [docLang, setDocLang] = useState<DocLang>('curl');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [origin, setOrigin] = useState('https://www.masdika.id');

  // Overview: Manual Top-up Modal & Auto Top-up State
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [customTopupAmount, setCustomTopupAmount] = useState('100000');
  const [pendingTopupAmount, setPendingTopupAmount] = useState<number | null>(null);
  const [toppingUp, setToppingUp] = useState(false);
  const [autoTopupEnabled, setAutoTopupEnabled] = useState(false);
  const [autoTopupThreshold, setAutoTopupThreshold] = useState('20000');
  const [autoTopupAmount, setAutoTopupAmount] = useState('100000');
  const [savingAutoTopup, setSavingAutoTopup] = useState(false);

  // Create & Revoke Key Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newMonthlyLimit, setNewMonthlyLimit] = useState('');
  const [newKeyExpiresDays, setNewKeyExpiresDays] = useState('');
  const [restrictModels, setRestrictModels] = useState(false);
  const [selectedAllowedModels, setSelectedAllowedModels] = useState<string[]>([]);
  const [keyModelSearch, setKeyModelSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<AiKeyItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Playground State
  const [pgKeyId, setPgKeyId] = useState<number>(0);
  const [pgModelId, setPgModelId] = useState<string>('deepseek-v4.1-flash');
  const [pgFormat, setPgFormat] = useState<'openai' | 'anthropic'>('openai');
  const [pgSystemPrompt, setPgSystemPrompt] = useState('');
  const [pgMaxTokens, setPgMaxTokens] = useState(2048);
  const [pgTemp, setPgTemp] = useState(0.7);
  const [pgShowAdvanced, setPgShowAdvanced] = useState(false);
  const [pgInput, setPgInput] = useState('');
  const [pgImages, setPgImages] = useState<string[]>([]);
  const [pgMessages, setPgMessages] = useState<ChatMessageItem[]>([]);
  const [pgSending, setPgSending] = useState(false);

  // Image Generation State
  const [imgKeyId, setImgKeyId] = useState<number>(0);
  const [imgModelId, setImgModelId] = useState<string>('seedream-image-v5.0-flash');
  const [imgSize, setImgSize] = useState<string>('2048x2048');
  const [imgPrompt, setImgPrompt] = useState<string>('');
  const [imgRefUrl, setImgRefUrl] = useState<string>('');
  const [imgShowRef, setImgShowRef] = useState<boolean>(false);
  const [imgGenerating, setImgGenerating] = useState<boolean>(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImageRecord[]>([]);

  // Usage Filters State
  const [usageKeyFilter, setUsageKeyFilter] = useState<string>('ALL');
  const [usageModelFilter, setUsageModelFilter] = useState<string>('ALL');
  const [usageRange, setUsageRange] = useState<'24h' | '7d' | '30d'>('7d');

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/user/ai-gateway', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load AI Gateway');
      const d = json.data;
      setEnabled(Boolean(d.enabled));
      setWalletBalance(d.walletBalance ?? 0);
      setLockedCommitment(d.lockedCommitment ?? 0);
      setAvailableWalletBalance(d.availableWalletBalance ?? d.walletBalance ?? 0);
      setAiBalance(d.aiBalance ?? d.balance ?? 0);
      setTopupFeeRp(Number(d.topupFeeRp ?? 5000));
      setIsPeakNow(Boolean(d.isPeakNow));
      if (d.autoTopup) {
        setAutoTopupEnabled(Boolean(d.autoTopup.enabled));
        setAutoTopupThreshold(String(d.autoTopup.threshold ?? 20000));
        setAutoTopupAmount(String(d.autoTopup.amount ?? 100000));
      }
      const loadedModels: AiModelItem[] = d.models || [];
      setModels(loadedModels);
      setImageModels(d.imageModels || []);
      const loadedKeys: AiKeyItem[] = d.keys || [];
      setKeys(loadedKeys);
      const firstActiveKey = loadedKeys.find((k) => k.isActive);
      if (firstActiveKey) {
        setPgKeyId((prev) => (prev > 0 ? prev : firstActiveKey.id));
        setImgKeyId((prev) => (prev > 0 ? prev : firstActiveKey.id));
      }
      setUsageLogs(d.usageLogs || []);
      setThisMonthByModel(d.thisMonthByModel || []);
      setStats(
        d.stats || {
          totalRequests: 0,
          totalSpentRp: 0,
          spentThisMonthRp: 0,
          avgLatencyMs: 0,
          inputTokens: 0,
          cachedTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
        }
      );
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

  // Open Confirmation Modal before Top-up
  const requestTopupConfirmation = (amount: number) => {
    if (!Number.isSafeInteger(amount) || amount < 5000) {
      toast.error('Minimum AI balance top-up is Rp 5.000');
      return;
    }
    setPendingTopupAmount(amount);
  };

  // Manual Top-up AI Balance from Masdika Wallet (Confirmed inside Top-Up Modal)
  const handleConfirmTopupAiBalance = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const amount = pendingTopupAmount ?? Number(customTopupAmount);
    if (!Number.isSafeInteger(amount) || amount < 5000) {
      toast.error('Minimum AI balance top-up is Rp 5.000');
      return;
    }
    setToppingUp(true);
    try {
      const res = await fetch('/api/user/ai-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'topup_ai_balance', amount }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to top up AI balance');
      setWalletBalance(json.walletBalance);
      setAiBalance(json.aiBalance);
      setPendingTopupAmount(null);
      setIsTopupModalOpen(false);
      toast.success(`Added ${formatRupiah(amount)} to your AI Balance`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to top up AI balance');
    } finally {
      setToppingUp(false);
    }
  };

  // Save Auto Top-up Settings
  const handleSaveAutoTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    const threshold = Number(autoTopupThreshold);
    const amount = Number(autoTopupAmount);
    if (!Number.isSafeInteger(threshold) || threshold < 5000) {
      toast.error('Trigger balance threshold must be at least Rp 5.000');
      return;
    }
    if (!Number.isSafeInteger(amount) || amount < 5000) {
      toast.error('Auto top-up amount must be at least Rp 5.000');
      return;
    }
    setSavingAutoTopup(true);
    try {
      const res = await fetch('/api/user/ai-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_auto_topup',
          enabled: autoTopupEnabled,
          threshold,
          amount,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update auto top-up');
      setWalletBalance(json.walletBalance);
      setAiBalance(json.aiBalance);
      toast.success(autoTopupEnabled ? 'Auto top-up enabled and saved' : 'Auto top-up settings saved');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update auto top-up');
    } finally {
      setSavingAutoTopup(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (restrictModels && selectedAllowedModels.length === 0) {
      toast.error('Please select at least 1 allowed model or disable model restriction.');
      return;
    }
    if (newMonthlyLimit) {
      const lim = Number(newMonthlyLimit);
      if (!Number.isSafeInteger(lim) || lim < 1000 || lim > 100000000) {
        toast.error('Monthly spend limit must be between Rp 1.000 and Rp 100.000.000.');
        return;
      }
    }
    if (newKeyExpiresDays) {
      const days = Number(newKeyExpiresDays);
      if (!Number.isSafeInteger(days) || days < 1 || days > 3650) {
        toast.error('Expiration must be between 1 and 3650 days.');
        return;
      }
    }
    setCreating(true);
    try {
      const res = await fetch('/api/user/ai-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName.trim() || 'AI Gateway Key',
          monthlyLimit: newMonthlyLimit ? Number(newMonthlyLimit) : null,
          expiresInDays: newKeyExpiresDays ? Number(newKeyExpiresDays) : null,
          allowedModels: restrictModels ? selectedAllowedModels : [],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create API key');
      setRevealedKey(json.rawKey);
      setNewKeyName('');
      setNewMonthlyLimit('');
      setNewKeyExpiresDays('');
      setRestrictModels(false);
      setSelectedAllowedModels([]);
      setKeyModelSearch('');
      setIsCreateOpen(false);
      toast.success('AI Gateway API Key created');
      await fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create API key');
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
      setKeys((prev) => prev.map((x) => (x.id === k.id ? { ...x, isActive: !x.isActive } : x)));
      toast.success(`API Key ${k.isActive ? 'paused' : 'activated'}`);
    } catch {
      toast.error('Failed to update API key status');
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

  // Playground Image Upload (converts to in-memory Data URL, never stored on Masdika disk)
  const handlePlaygroundImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    for (const file of files.slice(0, 4)) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be under 5 MB');
        continue;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPgImages((prev) => [...prev.slice(0, 3), reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  // Playground Chat Submit
  const handleSendPlayground = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const prompt = pgInput.trim();
    if ((!prompt && pgImages.length === 0) || pgSending) return;

    const attachedImages = [...pgImages];
    const nextHistory: ChatMessageItem[] = [
      ...pgMessages,
      { role: 'user', content: prompt, ...(attachedImages.length > 0 ? { images: attachedImages } : {}) },
    ];
    setPgMessages(nextHistory);
    setPgInput('');
    setPgImages([]);
    setPgSending(true);

    try {
      const res = await fetch('/api/user/ai-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'playground_chat',
          apiKeyId: pgKeyId,
          model: pgModelId,
          format: pgFormat,
          systemPrompt: pgSystemPrompt,
          maxTokens: pgMaxTokens,
          temperature: pgTemp,
          messages: nextHistory
            .filter((m) => !m.isError)
            .map((m) => ({
              role: m.role,
              content: m.content,
              ...(m.images && m.images.length > 0 ? { images: m.images } : {}),
            })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPgMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: json.error || 'Request failed',
            requestId: json.requestId,
            isError: true,
          },
        ]);
        return;
      }

      setAiBalance(json.aiBalance);
      setWalletBalance(json.walletBalance);
      setPgMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: json.content || '(Empty response)',
          reasoning: json.reasoning || undefined,
          requestId: json.requestId,
          latencyMs: json.latencyMs,
          costRp: json.usage?.costRp ?? 0,
          tokens:
            (json.usage?.inputTokens || 0) +
            (json.usage?.cachedTokens || 0) +
            (json.usage?.outputTokens || 0),
        },
      ]);
      fetchData();
    } catch (err: any) {
      setPgMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: err?.message || 'Network error while calling Playground',
          isError: true,
        },
      ]);
    } finally {
      setPgSending(false);
    }
  };

  // Image Generation Submit
  const handleGenerateImage = async (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = imgPrompt.trim();
    if (!prompt || imgGenerating) return;

    setImgGenerating(true);
    try {
      const res = await fetch('/api/user/ai-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_image',
          apiKeyId: imgKeyId,
          model: imgModelId,
          size: imgSize,
          prompt,
          referenceImage: imgShowRef ? imgRefUrl.trim() : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Image generation failed');

      setAiBalance(json.aiBalance);
      setWalletBalance(json.walletBalance);
      const url = json.result?.data?.[0]?.url || '';
      if (url) {
        setGeneratedImages((prev) => [
          {
            id: json.result?.id || `img_${Date.now()}`,
            prompt,
            modelId: imgModelId,
            size: imgSize,
            url,
            costRp: json.costRp || 0,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
        toast.success('Image generated');
      } else {
        toast.info(`Image job status: ${json.result?.status || 'processing'}`);
      }
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate image');
    } finally {
      setImgGenerating(false);
    }
  };

  const providers = useMemo(() => {
    const set = new Set(models.map((m) => m.provider));
    return ['ALL', 'ON_PROMO', ...Array.from(set)];
  }, [models]);

  const filteredModels = useMemo(() => {
    const q = modelSearch.trim().toLowerCase();
    return models.filter((m) => {
      if (providerFilter === 'ON_PROMO') {
        if (!m.discountBadge && !(m.originalOutputPricePer1M && m.originalOutputPricePer1M > m.outputPricePer1M)) {
          return false;
        }
      } else if (providerFilter !== 'ALL' && m.provider !== providerFilter) {
        return false;
      }
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.modelId.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q)
      );
    });
  }, [models, modelSearch, providerFilter]);

  const filteredUsageLogs = useMemo(() => {
    const nowMs = Date.now();
    const cutoffMs =
      usageRange === '24h'
        ? nowMs - 24 * 3600 * 1000
        : usageRange === '7d'
        ? nowMs - 7 * 24 * 3600 * 1000
        : nowMs - 30 * 24 * 3600 * 1000;

    return usageLogs.filter((u) => {
      if (new Date(u.createdAt).getTime() < cutoffMs) return false;
      if (usageKeyFilter !== 'ALL' && String(u.apiKeyId) !== usageKeyFilter) return false;
      if (usageModelFilter !== 'ALL' && u.modelId !== usageModelFilter) return false;
      return true;
    });
  }, [usageLogs, usageRange, usageKeyFilter, usageModelFilter]);

  const usageMetrics = useMemo(() => {
    const reqCount = filteredUsageLogs.length;
    const spend = filteredUsageLogs.reduce((acc, r) => acc + r.costRp, 0);
    const okCount = filteredUsageLogs.filter((r) => r.statusCode >= 200 && r.statusCode < 300).length;
    const inTok = filteredUsageLogs.reduce((acc, r) => acc + r.inputTokens, 0);
    const cacheTok = filteredUsageLogs.reduce((acc, r) => acc + r.cachedTokens, 0);
    const outTok = filteredUsageLogs.reduce((acc, r) => acc + r.outputTokens, 0);
    const avgLat =
      reqCount > 0
        ? Math.round(filteredUsageLogs.reduce((acc, r) => acc + r.latencyMs, 0) / reqCount)
        : 0;
    const totalPrompt = inTok + cacheTok;
    const cacheHitPct = totalPrompt > 0 ? Math.round((cacheTok / totalPrompt) * 100) : null;
    const successPct = reqCount > 0 ? Math.round((okCount / reqCount) * 100) : null;

    return {
      reqCount,
      spend,
      okCount,
      errCount: reqCount - okCount,
      inTok,
      cacheTok,
      outTok,
      totalTok: inTok + cacheTok + outTok,
      avgLat,
      cacheHitPct,
      successPct,
    };
  }, [filteredUsageLogs]);

  const currentImageModel = useMemo(
    () => imageModels.find((m) => m.modelId === imgModelId) || imageModels[0],
    [imageModels, imgModelId]
  );

  const openaiBase = `${origin}/api/ai/openai/v1`;
  const anthropicBase = `${origin}/api/ai/anthropic`;
  const sampleModel = models[0]?.modelId || 'deepseek-v4.1-flash';

  const codeSnippets: Record<
    QuickstartDocId,
    {
      title: string;
      summary: string;
      baseUrl: string;
      installCmd?: string;
      configPath?: string;
      code: string;
    }
  > = {
    curl: {
      title: 'cURL - Chat Completions, Streaming SSE, Vision & Models',
      summary: 'Test any model directly from your terminal using standard OpenAI-compatible REST endpoints.',
      baseUrl: openaiBase,
      code: `# 1. Standard Chat Completion
curl ${openaiBase}/chat/completions \\
  -H "Authorization: Bearer masdika_ai_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${sampleModel}",
    "max_completion_tokens": 2000,
    "messages": [
      { "role": "system", "content": "You are a concise assistant." },
      { "role": "user", "content": "Explain what a Cloud VPS is in two sentences." }
    ]
  }'

# 2. Streaming Response (SSE)
curl -N ${openaiBase}/chat/completions \\
  -H "Authorization: Bearer masdika_ai_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${sampleModel}",
    "stream": true,
    "messages": [{ "role": "user", "content": "Write a haiku about Kubernetes." }]
  }'

# 3. Vision / Multimodal (Image URL or Base64 Data URL)
curl ${openaiBase}/chat/completions \\
  -H "Authorization: Bearer masdika_ai_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "qwen3-vl-plus",
    "messages": [{
      "role": "user",
      "content": [
        { "type": "text", "text": "Describe what is in this image." },
        { "type": "image_url", "image_url": { "url": "https://example.com/photo.jpg" } }
      ]
    }]
  }'

# 4. List All Active Models & Live Rupiah Pricing
curl ${openaiBase}/models \\
  -H "Authorization: Bearer masdika_ai_YOUR_KEY"`,
    },
    node: {
      title: 'Node.js / TypeScript - Official OpenAI SDK',
      summary: 'Drop-in replacement for the official openai npm package. Supports streaming, tools, JSON mode, and vision.',
      baseUrl: openaiBase,
      installCmd: 'npm install openai',
      code: `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${openaiBase}",
  apiKey: process.env.MASDIKA_AI_KEY,
});

// 1. Standard Completion
const res = await client.chat.completions.create({
  model: "${sampleModel}",
  messages: [{ role: "user", content: "Hello from Masdika AI Gateway!" }],
});
console.log(res.choices[0].message.content);

// 2. Streaming Completion (SSE)
const stream = await client.chat.completions.create({
  model: "${sampleModel}",
  stream: true,
  messages: [{ role: "user", content: "Count 1 to 5 slowly." }],
});
for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || "");
}

// 3. Tool / Function Calling & JSON Mode
const toolRes = await client.chat.completions.create({
  model: "glm-5.3",
  messages: [{ role: "user", content: "What is the weather in Jakarta?" }],
  tools: [{
    type: "function",
    function: {
      name: "get_weather",
      description: "Get current weather by city name",
      parameters: {
        type: "object",
        properties: { city: { type: "string" } },
        required: ["city"],
      },
    },
  }],
});
console.log(toolRes.choices[0].message.tool_calls);`,
    },
    python: {
      title: 'Python - Official OpenAI SDK (Sync & Async)',
      summary: 'Use the official Python openai library by setting base_url to the Masdika OpenAI endpoint.',
      baseUrl: openaiBase,
      installCmd: 'pip install openai',
      code: `import os
from openai import OpenAI

client = OpenAI(
    base_url="${openaiBase}",
    api_key=os.environ["MASDIKA_AI_KEY"],
)

# 1. Standard Chat Completion
res = client.chat.completions.create(
    model="${sampleModel}",
    messages=[{"role": "user", "content": "Hello from Masdika AI Gateway!"}],
)
print(res.choices[0].message.content)

# 2. Streaming Response
stream = client.chat.completions.create(
    model="${sampleModel}",
    stream=True,
    messages=[{"role": "user", "content": "Explain Docker in 3 bullets."}],
)
for chunk in stream:
    delta = chunk.choices[0].delta.content
    if delta:
        print(delta, end="", flush=True)

# 3. Vision (Base64 or HTTPS URL)
vision = client.chat.completions.create(
    model="qwen3-vl-plus",
    messages=[{
        "role": "user",
        "content": [
            {"type": "text", "text": "Extract all text from this image."},
            {"type": "image_url", "image_url": {"url": "https://example.com/receipt.png"}},
        ],
    }],
)
print(vision.choices[0].message.content)`,
    },
    go: {
      title: 'Go - Official openai-go SDK & Standard net/http',
      summary: 'Connect Go services using either the official openai-go SDK or zero-dependency net/http.',
      baseUrl: openaiBase,
      installCmd: 'go get github.com/openai/openai-go',
      code: `// Option A: Official OpenAI Go SDK
package main

import (
	"context"
	"fmt"
	"os"

	"github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
)

func main() {
	client := openai.NewClient(
		option.WithBaseURL("${openaiBase}"),
		option.WithAPIKey(os.Getenv("MASDIKA_AI_KEY")),
	)

	res, err := client.Chat.Completions.New(context.Background(), openai.ChatCompletionNewParams{
		Model: "${sampleModel}",
		Messages: []openai.ChatCompletionMessageParamUnion{
			openai.UserMessage("Hello from Go!"),
		},
	})
	if err != nil {
		panic(err)
	}
	fmt.Println(res.Choices[0].Message.Content)
}

// Option B: Zero-dependency net/http POST to ${openaiBase}/chat/completions
// Headers: Authorization: Bearer $MASDIKA_AI_KEY, Content-Type: application/json`,
    },
    php: {
      title: 'PHP - Native cURL & Laravel HTTP Client',
      summary: 'Integrate with Laravel, Symfony, or plain PHP using standard HTTP POST requests.',
      baseUrl: openaiBase,
      code: `<?php
// Option A: Native PHP cURL
$ch = curl_init("${openaiBase}/chat/completions");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        "Authorization: Bearer " . getenv("MASDIKA_AI_KEY"),
        "Content-Type: application/json",
    ],
    CURLOPT_POSTFIELDS => json_encode([
        "model" => "${sampleModel}",
        "messages" => [
            ["role" => "system", "content" => "You are a helpful assistant."],
            ["role" => "user", "content" => "Hello from PHP!"]
        ],
    ]),
]);

$response = curl_exec($ch);
curl_close($ch);
$data = json_decode($response, true);
echo $data["choices"][0]["message"]["content"] ?? $response;

// Option B: Laravel HTTP Client
// $res = Http::withToken(env('MASDIKA_AI_KEY'))
//     ->post('${openaiBase}/chat/completions', [
//         'model' => '${sampleModel}',
//         'messages' => [['role' => 'user', 'content' => 'Hello from Laravel!']],
//     ])->json();`,
    },
    responses: {
      title: 'OpenAI Responses API (/v1/responses)',
      summary: 'Stateless Responses API for OpenAI Codex CLI and newer OpenAI SDK clients.',
      baseUrl: openaiBase,
      installCmd: 'npm install openai',
      code: `# 1. cURL
curl ${openaiBase}/responses \\
  -H "Authorization: Bearer masdika_ai_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "glm-5.3",
    "instructions": "You are a concise assistant.",
    "input": "Explain what a VPS is in two sentences.",
    "max_output_tokens": 2000
  }'

# 2. Node.js (OpenAI SDK >= 4.87)
import OpenAI from "openai";
const client = new OpenAI({ baseURL: "${openaiBase}", apiKey: process.env.MASDIKA_AI_KEY });
const response = await client.responses.create({
  model: "glm-5.3",
  instructions: "You are a concise assistant.",
  input: "Write a 3-line Nginx reverse proxy snippet.",
});
console.log(response.output_text);`,
    },
    anthropic: {
      title: 'Anthropic SDK - Node.js & Python (/v1/messages)',
      summary: 'Use official Anthropic SDKs (supports extended thinking, system prompts, streaming, and tool use).',
      baseUrl: anthropicBase,
      installCmd: 'npm install @anthropic-ai/sdk',
      code: `// Node.js (npm install @anthropic-ai/sdk)
import Anthropic from "@anthropic-ai/sdk";

// Note: Do NOT include /v1 here - Anthropic SDK appends /v1/messages automatically
const client = new Anthropic({
  baseURL: "${anthropicBase}",
  apiKey: process.env.MASDIKA_AI_KEY,
});

const msg = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 2000,
  system: "You are a concise assistant.",
  messages: [{ role: "user", content: "Hello from Masdika AI Gateway!" }],
});
console.log(msg.content);

# Python (pip install anthropic)
# import os
# from anthropic import Anthropic
# client = Anthropic(base_url="${anthropicBase}", api_key=os.environ["MASDIKA_AI_KEY"])
# msg = client.messages.create(
#     model="claude-sonnet-4-6",
#     max_tokens=2000,
#     messages=[{"role": "user", "content": "Hello!"}],
# )
# print(msg.content[0].text)`,
    },
    images: {
      title: 'Image Generation API (/v1/images/generations)',
      summary: 'Generate high-resolution images with Seedream, Kling, Vega, Vidu, and HY Image models.',
      baseUrl: openaiBase,
      installCmd: 'npm install openai',
      code: `# 1. cURL
curl ${openaiBase}/images/generations \\
  -H "Authorization: Bearer masdika_ai_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "seedream-image-v5.0-flash",
    "prompt": "A modern cloud data center in Jakarta at night, cyberpunk",
    "size": "2048x2048",
    "n": 1
  }'

# 2. Node.js (OpenAI SDK)
import OpenAI from "openai";
const client = new OpenAI({ baseURL: "${openaiBase}", apiKey: process.env.MASDIKA_AI_KEY });
const img = await client.images.generate({
  model: "seedream-image-v5.0-flash",
  prompt: "Minimalist logo of a hummingbird, flat vector",
  size: "2048x2048",
});
console.log(img.data[0].url);

# Supported Image Models:
# seedream-image-v5.0-flash, seedream-image-v5.0-lite, kling-image-v3, vega-image, vidu-image-q2, hy-image-3.0`,
    },
    claudecode: {
      title: 'Claude Code CLI - Bash, PowerShell & Persistent Settings',
      summary: 'Run Claude Code against any Masdika model using the Anthropic Messages gateway.',
      baseUrl: anthropicBase,
      installCmd: 'npm install -g @anthropic-ai/claude-code',
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
claude

# Or persist permanently in ~/.claude/settings.json:
# {
#   "env": {
#     "ANTHROPIC_BASE_URL": "${anthropicBase}",
#     "ANTHROPIC_AUTH_TOKEN": "masdika_ai_YOUR_KEY",
#     "ANTHROPIC_MODEL": "glm-5.3",
#     "ANTHROPIC_DEFAULT_HAIKU_MODEL": "deepseek-v4.1-flash"
#   }
# }`,
    },
    codex: {
      title: 'OpenAI Codex CLI (~/.codex/config.toml)',
      summary: 'Configure OpenAI Codex CLI to route Responses API traffic through Masdika AI Gateway.',
      baseUrl: openaiBase,
      installCmd: 'npm install -g @openai/codex',
      configPath: '~/.codex/config.toml',
      code: `# 1. Save to ~/.codex/config.toml
model = "glm-5.3"
model_provider = "masdika"

[model_providers.masdika]
name = "Masdika AI Gateway"
base_url = "${openaiBase}"
env_key = "MASDIKA_AI_KEY"
wire_api = "responses"

# 2. Set your key & launch Codex:
# macOS / Linux:
export MASDIKA_AI_KEY="masdika_ai_YOUR_KEY"
codex

# Windows PowerShell:
$env:MASDIKA_AI_KEY="masdika_ai_YOUR_KEY"
codex`,
    },
    opencode: {
      title: 'opencode (~/.config/opencode/opencode.json)',
      summary: 'Add Masdika AI Gateway as an OpenAI-compatible provider inside opencode.',
      baseUrl: openaiBase,
      installCmd: 'npm install -g opencode-ai',
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
        "deepseek-v4.1-flash": { "name": "DeepSeek V4.1 Flash" },
        "claude-sonnet-4-6": { "name": "Claude Sonnet 4.6" }
      }
    }
  }
}

# Run in terminal after setting MASDIKA_AI_KEY:
# export MASDIKA_AI_KEY="masdika_ai_YOUR_KEY" && opencode`,
    },
    cline: {
      title: 'Cline / Roo Code / Kilo Code (VS Code Extension)',
      summary: 'Connect VS Code autonomous coding extensions using OpenAI Compatible mode.',
      baseUrl: openaiBase,
      code: `1. Open Cline / Roo Code / Kilo Code extension settings (gear icon)
2. Set the following fields:
   - API Provider : OpenAI Compatible
   - Base URL     : ${openaiBase}
   - API Key      : masdika_ai_YOUR_KEY
   - Model ID     : glm-5.3 (or deepseek-v4-pro, kimi-k3, claude-sonnet-4-6)

3. Optional advanced settings:
   - Supports streaming & tool calling automatically
   - Recommended coding models: glm-5.3, kimi-k3, deepseek-v4-pro, claude-sonnet-4-6`,
    },
    cursor: {
      title: 'Cursor IDE (Settings -> Models)',
      summary: 'Use your Masdika API key and custom model IDs inside Cursor IDE.',
      baseUrl: openaiBase,
      code: `1. Open Cursor Settings -> Models
2. Under "API Keys", paste your key in "OpenAI API Key":
   masdika_ai_YOUR_KEY
3. Toggle ON "Override OpenAI Base URL" and enter:
   ${openaiBase}
4. Scroll to "Model Names" -> "+ Add Model" and add any active model ID:
   - glm-5.3
   - deepseek-v4-pro
   - kimi-k3
   - claude-sonnet-4-6
5. Click "Verify" and select the model in Cursor Chat / Composer.`,
    },
    continue: {
      title: 'Continue (~/.continue/config.yaml)',
      summary: 'Configure Continue in VS Code or JetBrains with Masdika models for chat, edit, and apply.',
      baseUrl: openaiBase,
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
    roles: [chat, edit, apply]

  - name: DeepSeek V4.1 Flash (Fast)
    provider: openai
    model: deepseek-v4.1-flash
    apiBase: ${openaiBase}
    apiKey: \${{ secrets.MASDIKA_AI_KEY }}
    roles: [chat, autocomplete]`,
    },
    aider: {
      title: 'Aider CLI (Bash, PowerShell & .aider.conf.yml)',
      summary: 'Pair-program in your terminal with Aider using Masdika OpenAI-compatible endpoints.',
      baseUrl: openaiBase,
      installCmd: 'pip install aider-chat',
      configPath: '~/.aider.conf.yml',
      code: `# macOS / Linux (Bash / Zsh)
export OPENAI_API_BASE="${openaiBase}"
export OPENAI_API_KEY="masdika_ai_YOUR_KEY"
aider --model openai/glm-5.3

# Windows PowerShell
$env:OPENAI_API_BASE="${openaiBase}"
$env:OPENAI_API_KEY="masdika_ai_YOUR_KEY"
aider --model openai/glm-5.3

# Or save in ~/.aider.conf.yml:
# openai-api-base: ${openaiBase}
# openai-api-key: masdika_ai_YOUR_KEY
# model: openai/glm-5.3`,
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
              OpenAI, Responses &amp; Anthropic Compatible
            </span>
          </div>
          <p className={cn('text-xs sm:text-sm font-medium mt-1.5 max-w-2xl leading-relaxed', isDark ? 'text-zinc-400' : 'text-slate-500')}>
            One API key for {models.length || 73}+ chat models and {imageModels.length || 13} image models - billed per token in Rupiah from your dedicated AI Balance.
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
            disabled={keys.length >= 25}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 flex items-center justify-center gap-2 bg-cyan-400 hover:bg-cyan-300 active:scale-95 disabled:opacity-50 text-slate-950 shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create API Key</span>
          </button>
        </div>
      </div>

      {!enabled && (
        <div className={cn('rounded-2xl border p-4 flex items-center gap-3', isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800')}>
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-xs sm:text-sm font-medium">
            AI Gateway is currently undergoing maintenance by the administrator. Requests will resume shortly.
          </p>
        </div>
      )}

      {/* One-time Key Reveal Banner */}
      {revealedKey && (
        <div className={cn('rounded-2xl border p-5 space-y-3', isDark ? 'bg-cyan-950/30 border-cyan-500/40' : 'bg-cyan-50 border-cyan-300')}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0" />
              <h3 className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>
                Save Your New AI Gateway Secret Key Now
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setRevealedKey(null)}
              className="text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className={cn('text-xs', isDark ? 'text-zinc-300' : 'text-slate-600')}>
            For security reasons, this full secret key is shown only once. Copy and store it in your environment variables.
          </p>
          <div className="flex items-center gap-2">
            <code className={cn('flex-1 px-3.5 py-2.5 rounded-xl font-mono text-xs sm:text-sm break-all border', isDark ? 'bg-[#0a0a0c] border-cyan-500/30 text-cyan-300' : 'bg-white border-cyan-200 text-slate-900')}>
              {revealedKey}
            </code>
            <button
              type="button"
              onClick={() => handleCopy(revealedKey, 'new-key', 'Secret key copied!')}
              className="px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              {copiedId === 'new-key' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              Copy Key
            </button>
          </div>
        </div>
      )}

      {/* Masdika Signature 4-KPI Grid (Top Position - Consistent with Managed Apps) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={cn('rounded-2xl border p-5 transition-all shadow-2xs flex flex-col justify-between', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200')}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn('text-[11px] font-bold uppercase tracking-wider', isDark ? 'text-zinc-400' : 'text-slate-500')}>
              AI CREDIT BALANCE
            </span>
            <div className={cn('w-9 h-9 rounded-xl border flex items-center justify-center', isDark ? 'bg-cyan-500/15 border-cyan-500/25 text-cyan-400' : 'bg-cyan-50 border-cyan-200 text-cyan-700')}>
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className={cn('text-2xl font-black tracking-tight font-mono', isDark ? 'text-white' : 'text-slate-900')}>
              {formatRupiah(aiBalance)}
            </span>
            <button
              type="button"
              onClick={() => setIsTopupModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Plus className="w-3 h-3" />
              Top Up AI
            </button>
          </div>
        </div>

        <div className={cn('rounded-2xl border p-5 transition-all shadow-2xs flex flex-col justify-between', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200')}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn('text-[11px] font-bold uppercase tracking-wider', isDark ? 'text-zinc-400' : 'text-slate-500')}>
              MASDIKA WALLET
            </span>
            <div className={cn('w-9 h-9 rounded-xl border flex items-center justify-center', isDark ? 'bg-cyan-500/15 border-cyan-500/25 text-cyan-400' : 'bg-cyan-50 border-cyan-200 text-cyan-700')}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className={cn('text-2xl font-black tracking-tight font-mono', isDark ? 'text-white' : 'text-slate-900')}>
              {formatRupiah(walletBalance)}
            </span>
            <Link
              href="/dashboard/topup"
              className="text-xs font-semibold text-cyan-400 hover:underline shrink-0"
            >
              Deposit -&gt;
            </Link>
          </div>
        </div>

        <div className={cn('rounded-2xl border p-5 transition-all shadow-2xs flex flex-col justify-between', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200')}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn('text-[11px] font-bold uppercase tracking-wider', isDark ? 'text-zinc-400' : 'text-slate-500')}>
              MONTHLY AI SPEND
            </span>
            <div className={cn('w-9 h-9 rounded-xl border flex items-center justify-center', isDark ? 'bg-cyan-500/15 border-cyan-500/25 text-cyan-400' : 'bg-cyan-50 border-cyan-200 text-cyan-700')}>
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className={cn('text-2xl font-black tracking-tight font-mono', isDark ? 'text-white' : 'text-slate-900')}>
              {formatRupiah(stats.spentThisMonthRp)}
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('usage')}
              className="text-xs font-semibold text-cyan-400 hover:underline cursor-pointer shrink-0"
            >
              {stats.totalRequests.toLocaleString('id-ID')} Calls -&gt;
            </button>
          </div>
        </div>

        <div className={cn('rounded-2xl border p-5 transition-all shadow-2xs flex flex-col justify-between', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200')}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn('text-[11px] font-bold uppercase tracking-wider', isDark ? 'text-zinc-400' : 'text-slate-500')}>
              ACTIVE API KEYS
            </span>
            <div className={cn('w-9 h-9 rounded-xl border flex items-center justify-center', isDark ? 'bg-cyan-500/15 border-cyan-500/25 text-cyan-400' : 'bg-cyan-50 border-cyan-200 text-cyan-700')}>
              <Key className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className={cn('text-2xl font-black tracking-tight font-mono', isDark ? 'text-white' : 'text-slate-900')}>
              {keys.filter((k) => k.isActive).length}
            </span>
            <span className="text-xs font-semibold text-cyan-400">
              / 25 Active
            </span>
          </div>
        </div>
      </div>

      {/* Endpoint Quick Bar */}
      <div className={cn('rounded-2xl border p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200 shadow-2xs')}>
        <div>
          <span className={cn('text-[10px] font-bold uppercase tracking-wider block mb-1.5', isDark ? 'text-zinc-400' : 'text-slate-500')}>
            OpenAI &amp; Responses Base URL
          </span>
          <div className="flex items-center gap-2">
            <code className={cn('flex-1 px-3 py-2 rounded-xl border font-mono text-xs truncate', isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-cyan-400' : 'bg-slate-50 border-slate-200 text-cyan-700')}>
              {openaiBase}
            </code>
            <button
              type="button"
              onClick={() => handleCopy(openaiBase, 'openai-url', 'OpenAI Base URL copied')}
              className={cn('p-2 rounded-xl border transition-colors cursor-pointer', isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700')}
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
              className={cn('p-2 rounded-xl border transition-colors cursor-pointer', isDark ? 'bg-white/5 border-white/10 hover:bg-white/10 text-zinc-300' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700')}
            >
              {copiedId === 'anthropic-url' ? <Check className="w-4 h-4 text-cyan-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Masdika 7-Tab Navigation Bar */}
      <div className={cn('w-fit max-w-full rounded-2xl border p-1.5', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200 shadow-2xs')}>
        <div className={cn('flex items-center gap-1.5 p-1.5 rounded-xl border overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden', isDark ? 'bg-[#0a0a0c] border-white/[0.08]' : 'bg-slate-100 border-slate-200')}>
          {([
            { id: 'overview', label: 'Overview', icon: Wallet },
            { id: 'keys', label: 'API Keys', icon: Key, count: keys.length },
            { id: 'playground', label: 'Playground', icon: MessageSquare },
            { id: 'images', label: 'Image Generation', icon: ImageIcon },
            { id: 'usage', label: 'Usage', icon: Activity, count: usageLogs.length },
            { id: 'models', label: 'Models & Pricing', icon: Cpu, count: models.length },
            { id: 'docs', label: 'Quickstart', icon: BookOpen },
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

      {/* ==================================================================== */}
      {/* TAB 1: OVERVIEW (Masdika Native 4-KPI + Auto Top-Up & Spend Summary) */}
      {/* ==================================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">

          {/* 2-Column Masdika Control Panel: Left = AI Balance & Auto Top-Up, Right = Quick Actions & Monthly Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left (7 cols): Auto Top-up & Balance Management */}
            <form
              onSubmit={handleSaveAutoTopup}
              className={cn('lg:col-span-7 rounded-2xl border p-5 sm:p-6 space-y-5', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200 shadow-2xs')}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
                <div>
                  <h2 className={cn('text-sm sm:text-base font-bold flex items-center gap-2', isDark ? 'text-white' : 'text-slate-900')}>
                    <RefreshCw className="w-4 h-4 text-cyan-400" />
                    AI Credit &amp; Auto Top-Up Configuration
                  </h2>
                  <p className={cn('text-xs mt-1', isDark ? 'text-zinc-400' : 'text-slate-500')}>
                    Fund your AI Credit Balance manually from your Masdika Wallet or enable automatic refill when balance drops low.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTopupModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shrink-0 cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Top Up AI Balance
                </button>
              </div>

              <div className={cn('rounded-xl border p-4 flex items-center justify-between gap-3', isDark ? 'bg-[#0a0a0c] border-white/[0.08]' : 'bg-slate-50 border-slate-200')}>
                <div>
                  <div className={cn('text-xs font-bold', isDark ? 'text-white' : 'text-slate-900')}>
                    Automatic Wallet Refill (Auto Top-Up)
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    Automatically transfer funds from your Masdika Wallet ({formatRupiah(walletBalance)}) when AI Balance falls below threshold.
                  </div>
                </div>
                <label className="inline-flex items-center gap-2.5 cursor-pointer select-none shrink-0">
                  <input
                    type="checkbox"
                    checked={autoTopupEnabled}
                    onChange={(e) => setAutoTopupEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-700 rounded-full peer peer-checked:bg-cyan-400 relative transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={cn('text-xs font-bold block mb-1.5', isDark ? 'text-zinc-300' : 'text-slate-700')}>
                    When AI Balance Falls Below (Rp)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={autoTopupThreshold ? Number(autoTopupThreshold).toLocaleString('id-ID') : ''}
                    onChange={(e) => setAutoTopupThreshold(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    placeholder="20.000"
                    className={cn(
                      'w-full px-3.5 py-2.5 rounded-xl text-sm font-mono border outline-none focus:border-cyan-500',
                      isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    )}
                  />
                </div>
                <div>
                  <label className={cn('text-xs font-bold block mb-1.5', isDark ? 'text-zinc-300' : 'text-slate-700')}>
                    Auto Top-Up Amount (Rp)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={autoTopupAmount ? Number(autoTopupAmount).toLocaleString('id-ID') : ''}
                    onChange={(e) => setAutoTopupAmount(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    placeholder="100.000"
                    className={cn(
                      'w-full px-3.5 py-2.5 rounded-xl text-sm font-mono border outline-none focus:border-cyan-500',
                      isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    )}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <span className="text-[11px] text-zinc-500">
                  Minimum top-up &amp; threshold: Rp 5.000
                </span>
                <button
                  type="submit"
                  disabled={savingAutoTopup}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs whitespace-nowrap cursor-pointer disabled:opacity-50"
                >
                  {savingAutoTopup ? 'Saving...' : 'Save Auto Top-Up'}
                </button>
              </div>
            </form>

            {/* Right (5 cols): This Month Usage by Model Summary */}
            <div className={cn('lg:col-span-5 rounded-2xl border p-5 sm:p-6 space-y-4', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200 shadow-2xs')}>
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <h3 className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>
                  This Month Model Consumption
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('usage')}
                  className="text-xs font-semibold text-cyan-400 hover:underline cursor-pointer"
                >
                  Full logs →
                </button>
              </div>

              {thisMonthByModel.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <Cpu className="w-7 h-7 text-cyan-400/60 mx-auto" />
                  <p className={cn('text-xs font-semibold', isDark ? 'text-zinc-300' : 'text-slate-700')}>
                    No model requests recorded this month
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Test any model in the Playground tab or connect Claude Code / OpenAI SDK.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {thisMonthByModel.slice(0, 6).map((row) => (
                    <div
                      key={row.modelId}
                      className={cn('rounded-xl border px-3.5 py-2.5 flex items-center justify-between text-xs font-mono', isDark ? 'bg-[#0a0a0c] border-white/[0.06]' : 'bg-slate-50 border-slate-200')}
                    >
                      <div>
                        <div className="font-bold text-cyan-400">{row.modelId}</div>
                        <div className="text-[10px] text-zinc-500">
                          {row.requests} reqs · {(row.inputTokens + row.cachedTokens + row.outputTokens).toLocaleString('id-ID')} tokens
                        </div>
                      </div>
                      <div className={cn('font-bold', isDark ? 'text-white' : 'text-slate-900')}>
                        {formatRupiah(row.costRp)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: API KEYS                                                      */}
      {/* ==================================================================== */}
      {activeTab === 'keys' && (
        <div className={cn('rounded-2xl border overflow-hidden', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200 shadow-2xs')}>
          {keys.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
                <Key className="w-6 h-6" />
              </div>
              <h3 className={cn('text-base font-bold', isDark ? 'text-white' : 'text-slate-900')}>
                No AI Gateway Keys Yet
              </h3>
              <p className={cn('text-xs max-w-md mx-auto', isDark ? 'text-zinc-400' : 'text-slate-500')}>
                Create an API key to start calling {models.length}+ models using OpenAI SDK, Anthropic SDK, Claude Code, or the in-browser Playground.
              </p>
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Create API Key
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <table className="w-full min-w-[640px] text-left border-collapse">
                <thead>
                  <tr className={cn('text-[11px] font-bold uppercase tracking-wider border-b', isDark ? 'text-zinc-400 border-white/[0.08] bg-[#0a0a0c]' : 'text-slate-500 border-slate-200 bg-slate-50')}>
                    <th className="px-5 py-3.5">Name</th>
                    <th className="px-4 py-3.5">Key Prefix</th>
                    <th className="px-4 py-3.5">Monthly Spend / Limit</th>
                    <th className="px-4 py-3.5">Last Used</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={cn('divide-y text-xs sm:text-sm', isDark ? 'divide-white/[0.06]' : 'divide-slate-100')}>
                  {keys.map((k) => (
                    <tr key={k.id} className={cn(isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50')}>
                      <td className={cn('px-5 py-4 font-bold', isDark ? 'text-white' : 'text-slate-900')}>
                        <div>{k.name}</div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 font-normal">
                          {k.allowedModels && k.allowedModels.length > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                              {k.allowedModels.length} {k.allowedModels.length === 1 ? 'model' : 'models'} only
                            </span>
                          ) : (
                            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[10px] border', isDark ? 'bg-white/[0.04] border-white/[0.08] text-zinc-400' : 'bg-slate-100 border-slate-200 text-slate-600')}>
                              All models
                            </span>
                          )}
                          {k.expiresAt && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono bg-amber-500/10 border border-amber-500/20 text-amber-400">
                              Exp: {new Date(k.expiresAt).toLocaleDateString('id-ID')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-cyan-400">
                        {k.keyPrefix}••••••••
                      </td>
                      <td className="px-4 py-4 font-mono text-xs">
                        <span className={isDark ? 'text-white font-bold' : 'text-slate-900 font-bold'}>
                          {formatRupiah(k.monthlySpent)}
                        </span>{' '}
                        <span className={isDark ? 'text-zinc-500' : 'text-slate-400'}>
                          / {k.monthlyLimit ? formatRupiah(k.monthlyLimit) : 'Unlimited'}
                        </span>
                      </td>
                      <td className={cn('px-4 py-4 text-xs', isDark ? 'text-zinc-400' : 'text-slate-500')}>
                        {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString('id-ID') : 'Never'}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border',
                            k.isActive
                              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                              : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                          )}
                        >
                          <span className={cn('w-1.5 h-1.5 rounded-full', k.isActive ? 'bg-cyan-400' : 'bg-zinc-400')} />
                          {k.isActive ? 'ACTIVE' : 'PAUSED'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleToggleKey(k)}
                          title={k.isActive ? 'Pause Key' : 'Activate Key'}
                          className={cn('p-2 rounded-lg border transition-colors cursor-pointer', isDark ? 'border-white/10 hover:bg-white/10 text-zinc-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700')}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingKey(k)}
                          title="Revoke Key"
                          className="p-2 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: PLAYGROUND (Interactive Chat with Any Model)                  */}
      {/* ==================================================================== */}
      {activeTab === 'playground' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Settings Column */}
          <div className={cn('lg:col-span-4 rounded-2xl border p-5 space-y-4', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200 shadow-2xs')}>
            <div>
              <label className={cn('text-xs font-bold uppercase tracking-wider block mb-1.5', isDark ? 'text-zinc-400' : 'text-slate-600')}>
                API Key
              </label>
              {keys.filter((k) => k.isActive).length === 0 ? (
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(true)}
                  className="w-full py-2.5 px-3 rounded-xl border border-dashed border-cyan-500/40 text-cyan-400 text-xs font-bold cursor-pointer hover:bg-cyan-500/10"
                >
                  + Create an API Key first
                </button>
              ) : (
                <Select
                  value={pgKeyId}
                  onChange={(val) => setPgKeyId(Number(val))}
                  options={keys
                    .filter((k) => k.isActive)
                    .map((k) => ({
                      value: k.id,
                      label: `${k.name} · ${k.keyPrefix}...`,
                    }))}
                  placeholder="Select API Key..."
                  className="py-2.5 text-xs font-mono"
                />
              )}
            </div>

            <div>
              <label className={cn('text-xs font-bold uppercase tracking-wider block mb-1.5', isDark ? 'text-zinc-400' : 'text-slate-600')}>
                Model
              </label>
              <Select
                value={pgModelId}
                onChange={(val) => setPgModelId(String(val))}
                options={models.map((m) => ({
                  value: m.modelId,
                  label: `${m.name} (${m.modelId}) - ${formatRupiah(m.inputPricePer1M)}/1M`,
                }))}
                placeholder="Select Model..."
                className="py-2.5 text-xs font-semibold"
              />
            </div>

            <div>
              <label className={cn('text-xs font-bold uppercase tracking-wider block mb-1.5', isDark ? 'text-zinc-400' : 'text-slate-600')}>
                Wire Format
              </label>
              <div className={cn('grid grid-cols-2 gap-1.5 p-1 rounded-xl border', isDark ? 'bg-[#0a0a0c] border-white/[0.08]' : 'bg-slate-100 border-slate-200')}>
                {(['openai', 'anthropic'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setPgFormat(fmt)}
                    className={cn(
                      'py-2 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer',
                      pgFormat === fmt
                        ? 'bg-cyan-400 text-slate-950'
                        : isDark
                        ? 'text-zinc-400 hover:text-white'
                        : 'text-slate-600'
                    )}
                  >
                    {fmt === 'openai' ? 'OpenAI' : 'Anthropic'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={cn('text-xs font-bold uppercase tracking-wider block mb-1.5', isDark ? 'text-zinc-400' : 'text-slate-600')}>
                System Prompt
              </label>
              <PlainTextArea
                value={pgSystemPrompt}
                onChange={setPgSystemPrompt}
                isDark={isDark}
                ariaLabel="System Prompt"
                placeholder="You are a helpful AI assistant..."
                minHeightClass="min-h-[82px] max-h-[160px]"
                className={cn('w-full px-3.5 py-2.5 rounded-xl text-xs', isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-900')}
              />
            </div>

            <button
              type="button"
              onClick={() => setPgShowAdvanced(!pgShowAdvanced)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors',
                pgShowAdvanced
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400'
                  : isDark
                  ? 'bg-white/[0.03] border-white/[0.08] text-zinc-300 hover:border-cyan-500/40'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-cyan-500'
              )}
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Advanced</span>
              {pgShowAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {pgShowAdvanced && (
              <div className="space-y-3.5 pt-1">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className={cn('font-semibold', isDark ? 'text-zinc-200' : 'text-slate-700')}>Temperature</span>
                    <span className="font-mono text-zinc-400">{pgTemp.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.1}
                    value={pgTemp}
                    onChange={(e) => setPgTemp(Number(e.target.value))}
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-cyan-400 bg-zinc-700"
                  />
                </div>
                <div>
                  <label className={cn('text-xs font-semibold block mb-1.5', isDark ? 'text-zinc-200' : 'text-slate-700')}>
                    Max output tokens
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={pgMaxTokens}
                    onChange={(e) => {
                      const val = Number(e.target.value.replace(/\D/g, ''));
                      setPgMaxTokens(val > 0 ? Math.min(16384, val) : 1024);
                    }}
                    className={cn('w-full px-3.5 py-2 rounded-xl text-xs font-mono border outline-none focus:border-cyan-500', isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-900')}
                  />
                  <p className="text-[11px] text-zinc-500 mt-1.5">
                    Reasoning models spend part of this on thinking.
                  </p>
                </div>
              </div>
            )}

            <div className={cn('pt-3 border-t text-[11px] space-y-1.5 leading-relaxed', isDark ? 'border-white/[0.06] text-zinc-400' : 'border-slate-100 text-slate-500')}>
              <p>
                Every message is a real, billed request from your <strong>AI Balance ({formatRupiah(aiBalance)})</strong>. This chat so far:{' '}
                <strong className={isDark ? 'text-white font-mono' : 'text-slate-900 font-mono'}>
                  ≈ {formatRupiah(pgMessages.reduce((sum, m) => sum + (m.costRp || 0), 0))}
                </strong>.
              </p>
              <p>Exact charges appear in Usage.</p>
              <p className="flex items-start gap-1.5 text-zinc-500 pt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5 text-cyan-400" />
                <span>Chats are not saved on Masdika. Messages go from this browser to the model and are gone.</span>
              </p>
            </div>
          </div>

          {/* Right macOS Chat Window */}
          <div className={cn('lg:col-span-8 rounded-2xl overflow-hidden border flex flex-col h-[580px] shadow-xl', isDark ? 'bg-[#0b0d12] border-white/[0.1]' : 'bg-white border-slate-200')}>
            <div className={cn('px-3.5 sm:px-4 py-3 border-b flex items-center justify-between gap-2', isDark ? 'bg-[#12151e] border-white/[0.07]' : 'bg-slate-100 border-slate-200')}>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ff5f56] shrink-0" />
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ffbd2e] shrink-0" />
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#27c93f] shrink-0" />
                <span className={cn('ml-1 sm:ml-2 text-xs font-bold truncate', isDark ? 'text-white' : 'text-slate-900')}>
                  {models.find((m) => m.modelId === pgModelId)?.name || pgModelId}
                </span>
                <span className="hidden sm:inline text-[11px] font-mono text-cyan-400 whitespace-nowrap shrink-0">· {pgFormat}</span>
              </div>
              <button
                type="button"
                onClick={() => setPgMessages([])}
                className="text-xs font-semibold text-zinc-400 hover:text-cyan-400 inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3 shrink-0" />
                <span>New chat</span>
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {pgMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-2 opacity-70">
                  <MessageSquare className="w-8 h-8 text-cyan-400" />
                  <p className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>
                    Test any model in real time
                  </p>
                  <p className="text-xs text-zinc-400 max-w-sm">
                    Send a message below to test responses, reasoning blocks, latency, and exact token charges.
                  </p>
                </div>
              ) : (
                pgMessages.map((m, idx) => (
                  <div
                    key={idx}
                    className={cn('flex flex-col', m.role === 'user' ? 'items-end' : 'items-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed',
                        m.role === 'user'
                          ? 'bg-cyan-400 text-slate-950 font-semibold'
                          : m.isError
                          ? 'bg-red-500/10 border border-red-500/30 text-red-300'
                          : isDark
                          ? 'bg-[#141824] border border-white/[0.08] text-zinc-100'
                          : 'bg-slate-100 border border-slate-200 text-slate-900'
                      )}
                    >
                      {m.images && m.images.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {m.images.map((imgSrc, iIdx) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={iIdx}
                              src={imgSrc}
                              alt="Attachment"
                              className="w-20 h-20 object-cover rounded-lg border border-black/20"
                            />
                          ))}
                        </div>
                      )}
                      {m.reasoning && (
                        <details className="mb-2.5 pb-2 border-b border-white/10 text-xs text-zinc-400">
                          <summary className="cursor-pointer font-mono text-cyan-400">
                            Reasoning / Thinking
                          </summary>
                          <p className="mt-1.5 whitespace-pre-wrap font-mono text-[11px]">{m.reasoning}</p>
                        </details>
                      )}
                      {m.content}
                    </div>
                    {m.role === 'assistant' && (m.requestId || m.latencyMs) && (
                      <div className="mt-1 text-[10px] font-mono text-zinc-500 flex items-center gap-2">
                        {m.latencyMs && <span>{(m.latencyMs / 1000).toFixed(1)}s</span>}
                        {m.tokens !== undefined && <span>· {m.tokens} tokens</span>}
                        {m.costRp !== undefined && <span className="text-cyan-400">· {formatRupiah(m.costRp)}</span>}
                        {m.requestId && <span>· {m.requestId}</span>}
                      </div>
                    )}
                  </div>
                ))
              )}
              {pgSending && (
                <div className="text-xs font-mono text-cyan-400 animate-pulse">
                  Waiting for model response...
                </div>
              )}
            </div>

            {/* Attached Image Thumbnails Preview */}
            {pgImages.length > 0 && (
              <div className={cn('px-3 pt-2.5 flex items-center gap-2 border-t', isDark ? 'bg-[#12151e] border-white/[0.07]' : 'bg-slate-50 border-slate-200')}>
                {pgImages.map((src, idx) => (
                  <div key={idx} className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-cyan-500/40" />
                    <button
                      type="button"
                      onClick={() => setPgImages((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <span className="text-[11px] text-zinc-400 ml-1">
                  Sent directly to vision model in memory (not stored on Masdika disk)
                </span>
              </div>
            )}

            {/* Input Bar with Image Upload + Shift+Enter Textarea */}
            <form
              onSubmit={handleSendPlayground}
              className={cn('p-3 border-t flex items-end gap-2', isDark ? 'bg-[#12151e] border-white/[0.07]' : 'bg-slate-50 border-slate-200')}
            >
              <label
                title="Attach image for vision models"
                className={cn(
                  'w-11 h-11 rounded-xl border transition-colors cursor-pointer shrink-0 flex items-center justify-center',
                  isDark
                    ? 'bg-[#0a0a0c] border-white/[0.1] hover:border-cyan-500/50 text-cyan-400'
                    : 'bg-white border-slate-200 hover:border-cyan-500 text-cyan-700'
                )}
              >
                <ImagePlus className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePlaygroundImageSelect}
                  className="hidden"
                />
              </label>
              <PlainTextArea
                value={pgInput}
                onChange={setPgInput}
                isDark={isDark}
                ariaLabel="Playground Message"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendPlayground();
                  }
                }}
                placeholder="Message... (Enter to send)"
                minHeightClass="min-h-[44px] max-h-32"
                className={cn('flex-1 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm leading-5', isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-white' : 'bg-white border-slate-200 text-slate-900')}
              />
              <button
                type="submit"
                disabled={pgSending || (!pgInput.trim() && pgImages.length === 0)}
                className="w-11 h-11 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold disabled:opacity-50 cursor-pointer shrink-0 flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: IMAGE GENERATION                                              */}
      {/* ==================================================================== */}
      {activeTab === 'images' && (
        <div className="space-y-6">
          <form
            onSubmit={handleGenerateImage}
            className={cn('rounded-2xl border p-5 sm:p-6 space-y-4', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200 shadow-2xs')}
          >
            <PlainTextArea
              value={imgPrompt}
              onChange={setImgPrompt}
              isDark={isDark}
              ariaLabel="Image Prompt"
              placeholder="Describe the image you want..."
              minHeightClass="min-h-[90px] max-h-[180px]"
              className={cn('w-full px-4 py-3 rounded-xl text-sm', isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-900')}
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {/* Model Picker */}
                <div className="w-full sm:w-64">
                  <Select
                    value={imgModelId}
                    onChange={(val) => {
                      const next = imageModels.find((m) => m.modelId === String(val));
                      setImgModelId(String(val));
                      if (next && next.sizes[0]) setImgSize(next.sizes[0]);
                    }}
                    options={imageModels.map((im) => ({
                      value: im.modelId,
                      label: (
                        <span className="inline-flex items-center gap-2 whitespace-nowrap">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="truncate">{im.name}</span>
                          <span className="text-[11px] font-mono text-zinc-400">({formatRupiah(im.priceRp)})</span>
                        </span>
                      ),
                    }))}
                    className="h-10 py-0 text-xs font-bold"
                  />
                </div>

                {/* Size Picker (uniform h-10 trigger; rich 2-line items inside dropdown) */}
                <div className="w-full sm:w-64">
                  <Select
                    value={`${imgModelId}::${imgSize}`}
                    onChange={(val) => {
                      const [mId, sz] = String(val).split('::');
                      if (mId && sz) {
                        setImgModelId(mId);
                        setImgSize(sz);
                      }
                    }}
                    options={(() => {
                      const getSizeInfo = (sz: string) => {
                        const [w, h] = sz.split('x').map(Number);
                        const orient = w > h ? 'Landscape' : h > w ? 'Portrait' : 'Square';
                        const boxCls =
                          w > h ? 'w-3.5 h-2.5' : h > w ? 'w-2.5 h-3.5' : 'w-3 h-3';
                        return { orient, display: sz.replace('x', ' × '), boxCls };
                      };
                      const cur = currentImageModel;
                      const opts: { value: string; label: React.ReactNode; disabled?: boolean }[] = [];
                      if (cur) {
                        opts.push({
                          value: `__hdr_${cur.modelId}`,
                          disabled: true,
                          label: (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                              {cur.name}
                            </span>
                          ),
                        });
                        for (const sz of cur.sizes) {
                          const info = getSizeInfo(sz);
                          const szPrice =
                            cur.sizePrices?.[sz] ??
                            (cur.modelId === 'seedream-image-v5.0-pro' && sz === '2048x2048'
                              ? cur.priceRp * 2
                              : cur.priceRp);
                          opts.push({
                            value: `${cur.modelId}::${sz}`,
                            label: (
                              <span className="flex items-center justify-between gap-2 w-full whitespace-nowrap">
                                <span className="inline-flex items-center gap-2 min-w-0">
                                  <span className={cn('border border-zinc-400 rounded-[2px] shrink-0 inline-block', info.boxCls)} />
                                  <span className="text-xs font-bold truncate">{info.orient}</span>
                                  <span className="text-[11px] font-mono text-zinc-400">{info.display}</span>
                                </span>
                                <span className="text-xs font-mono font-bold text-cyan-400 shrink-0">
                                  {formatRupiah(szPrice)}
                                </span>
                              </span>
                            ),
                          });
                        }
                      }

                      const otherModels = imageModels.filter((m) => m.modelId !== cur?.modelId);
                      if (otherModels.length > 0) {
                        opts.push({
                          value: '__hdr_other',
                          disabled: true,
                          label: (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                              Other Models
                            </span>
                          ),
                        });
                        for (const om of otherModels) {
                          for (const sz of om.sizes) {
                            const info = getSizeInfo(sz);
                            const szPrice =
                              om.sizePrices?.[sz] ??
                              (om.modelId === 'seedream-image-v5.0-pro' && sz === '2048x2048'
                                ? om.priceRp * 2
                                : om.priceRp);
                            opts.push({
                              value: `${om.modelId}::${sz}`,
                              label: (
                                <span className="flex items-center justify-between gap-2 w-full whitespace-nowrap">
                                  <span className="inline-flex items-center gap-2 min-w-0">
                                    <span className={cn('border border-zinc-500 rounded-[2px] shrink-0 inline-block', info.boxCls)} />
                                    <span className="text-xs font-semibold truncate">{info.orient}</span>
                                    <span className="text-[10px] font-mono text-zinc-500">{info.display}</span>
                                  </span>
                                  <span className="text-[11px] text-zinc-400 shrink-0 font-mono">
                                    {om.name} - <strong className="text-white">{formatRupiah(szPrice)}</strong>
                                  </span>
                                </span>
                              ),
                            });
                          }
                        }
                      }
                      return opts;
                    })()}
                    className="h-10 py-0 text-xs font-mono"
                  />
                </div>

                {/* Reference Image Toggle */}
                {(currentImageModel?.maxRefImages ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => setImgShowRef(!imgShowRef)}
                    className={cn(
                      'h-10 px-3.5 rounded-xl text-xs font-semibold border cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap',
                      imgShowRef
                        ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400'
                        : isDark
                        ? 'bg-[#0a0a0c] border-white/[0.1] text-zinc-300'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    )}
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Reference</span>
                  </button>
                )}

                {/* Key Selector (no emoji, uses Lucide Key icon) */}
                {keys.filter((k) => k.isActive).length > 0 && (
                  <div className="w-full sm:w-48">
                    <Select
                      value={imgKeyId}
                      onChange={(val) => setImgKeyId(Number(val))}
                      options={keys
                        .filter((k) => k.isActive)
                        .map((k) => ({
                          value: k.id,
                          label: (
                            <span className="inline-flex items-center gap-2 whitespace-nowrap">
                              <Key className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                              <span className="truncate">{k.name}</span>
                            </span>
                          ),
                        }))}
                      className="h-10 py-0 text-xs font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-cyan-400">
                  {formatRupiah(currentImageModel?.priceRp || 320)}
                </span>
                <button
                  type="submit"
                  disabled={imgGenerating || !imgPrompt.trim()}
                  className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{imgGenerating ? 'Generating...' : 'Generate'}</span>
                </button>
              </div>
            </div>

            {imgShowRef && (
              <input
                type="url"
                value={imgRefUrl}
                onChange={(e) => setImgRefUrl(e.target.value)}
                placeholder="https://example.com/reference-image.jpg"
                className={cn('w-full px-3.5 py-2 rounded-xl text-xs font-mono border outline-none focus:border-cyan-500', isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-900')}
              />
            )}

            <p className="text-[11px] text-center text-zinc-500">
              Images are kept for 7 days, then deleted. Download the ones you want to keep. Failed images are free.
            </p>
          </form>

          {/* Generated Images Gallery or Sample Prompts */}
          <div className={cn('rounded-2xl border p-6', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200 shadow-2xs')}>
            <h3 className={cn('text-xs font-bold uppercase tracking-wider mb-4', isDark ? 'text-zinc-400' : 'text-slate-500')}>
              Your images · last 7 days
            </h3>

            {generatedImages.length === 0 ? (
              <div className="py-10 text-center space-y-4">
                <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>
                    What do you want to create?
                  </p>
                  <p className="text-xs text-zinc-500">
                    Images made in this session appear here. Try one of these prompts:
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto">
                  {SAMPLE_IMAGE_PROMPTS.map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => setImgPrompt(sp)}
                      className={cn(
                        'px-3.5 py-1.5 rounded-full text-xs border transition-colors cursor-pointer',
                        isDark
                          ? 'bg-[#0a0a0c] border-white/[0.08] text-zinc-300 hover:border-cyan-500/40 hover:text-cyan-400'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-cyan-500'
                      )}
                    >
                      {sp}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {generatedImages.map((img) => (
                  <div
                    key={img.id}
                    className={cn('rounded-xl border overflow-hidden flex flex-col', isDark ? 'bg-[#0a0a0c] border-white/[0.08]' : 'bg-slate-50 border-slate-200')}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.prompt} className="w-full aspect-square object-cover" />
                    <div className="p-3 space-y-2">
                      <p className={cn('text-xs line-clamp-2', isDark ? 'text-zinc-200' : 'text-slate-800')}>
                        {img.prompt}
                      </p>
                      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                        <span>{img.modelId} · {formatRupiah(img.costRp)}</span>
                        <a
                          href={img.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" /> Save
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 5: USAGE (Filters, 6 Metric Cards, This Month & Recent Requests) */}
      {/* ==================================================================== */}
      {activeTab === 'usage' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="w-full sm:w-56">
                <Select
                  value={usageKeyFilter}
                  onChange={(val) => setUsageKeyFilter(String(val))}
                  options={[
                    { value: 'ALL', label: 'All keys in account' },
                    ...keys.map((k) => ({
                      value: String(k.id),
                      label: `${k.name} (${k.keyPrefix}...)`,
                    })),
                  ]}
                  className="py-2 text-xs font-semibold"
                />
              </div>

              <div className="w-full sm:w-56">
                <Select
                  value={usageModelFilter}
                  onChange={(val) => setUsageModelFilter(String(val))}
                  options={[
                    { value: 'ALL', label: 'All models' },
                    ...models.map((m) => ({
                      value: m.modelId,
                      label: m.name,
                    })),
                  ]}
                  className="py-2 text-xs font-semibold"
                />
              </div>
            </div>

            <div className={cn('inline-flex items-center gap-1 p-1 rounded-xl border', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200')}>
              {([
                { id: '24h', label: '24 hours' },
                { id: '7d', label: '7 days' },
                { id: '30d', label: '30 days' },
              ] as const).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setUsageRange(r.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                    usageRange === r.id
                      ? 'bg-cyan-400 text-slate-950'
                      : isDark
                      ? 'text-zinc-400 hover:text-white'
                      : 'text-slate-600'
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* 6 Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className={cn('rounded-2xl border p-4', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200')}>
              <span className="text-[11px] font-bold text-zinc-400 block mb-1">Requests</span>
              <span className={cn('text-xl font-black font-mono', isDark ? 'text-white' : 'text-slate-900')}>
                {usageMetrics.reqCount.toLocaleString('id-ID')}
              </span>
            </div>
            <div className={cn('rounded-2xl border p-4', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200')}>
              <span className="text-[11px] font-bold text-zinc-400 block mb-1">Spend</span>
              <span className="text-xl font-black font-mono text-cyan-400">
                {formatRupiah(usageMetrics.spend)}
              </span>
            </div>
            <div className={cn('rounded-2xl border p-4', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200')}>
              <span className="text-[11px] font-bold text-zinc-400 block mb-1">Success rate</span>
              <span className={cn('text-xl font-black font-mono', isDark ? 'text-white' : 'text-slate-900')}>
                {usageMetrics.successPct !== null ? `${usageMetrics.successPct}%` : '-'}
              </span>
              <span className="text-[10px] text-zinc-500 block mt-0.5">
                {usageMetrics.errCount} errors
              </span>
            </div>
            <div className={cn('rounded-2xl border p-4', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200')}>
              <span className="text-[11px] font-bold text-zinc-400 block mb-1">Tokens</span>
              <span className={cn('text-xl font-black font-mono', isDark ? 'text-white' : 'text-slate-900')}>
                {usageMetrics.totalTok.toLocaleString('id-ID')}
              </span>
              <span className="text-[10px] text-zinc-500 block mt-0.5">
                {usageMetrics.inTok.toLocaleString('id-ID')} in · {usageMetrics.outTok.toLocaleString('id-ID')} out
              </span>
            </div>
            <div className={cn('rounded-2xl border p-4', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200')}>
              <span className="text-[11px] font-bold text-zinc-400 block mb-1">Cache hit rate</span>
              <span className={cn('text-xl font-black font-mono', isDark ? 'text-white' : 'text-slate-900')}>
                {usageMetrics.cacheHitPct !== null ? `${usageMetrics.cacheHitPct}%` : '-'}
              </span>
              <span className="text-[10px] text-zinc-500 block mt-0.5">
                share of input from cache
              </span>
            </div>
            <div className={cn('rounded-2xl border p-4', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200')}>
              <span className="text-[11px] font-bold text-zinc-400 block mb-1">Latency</span>
              <span className={cn('text-xl font-black font-mono', isDark ? 'text-white' : 'text-slate-900')}>
                {usageMetrics.avgLat} ms
              </span>
              <span className="text-[10px] text-zinc-500 block mt-0.5">avg response time</span>
            </div>
          </div>

          {/* This Month Breakdown by Model */}
          <div className={cn('rounded-2xl border overflow-hidden', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200')}>
            <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className={cn('text-xs sm:text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>
                This month by model
              </h3>
              <span className="text-xs font-mono text-cyan-400 font-bold">
                {formatRupiah(stats.spentThisMonthRp)}
              </span>
            </div>
            {thisMonthByModel.length === 0 ? (
              <div className="p-6 text-xs text-zinc-500">No requests this month yet.</div>
            ) : (
              <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <table className="w-full min-w-[540px] text-left text-xs border-collapse">
                  <thead>
                    <tr className={cn('border-b text-[10px] uppercase', isDark ? 'border-white/[0.06] text-zinc-400 bg-[#0a0a0c]' : 'border-slate-100 text-slate-500 bg-slate-50')}>
                      <th className="px-5 py-2.5">Model</th>
                      <th className="px-4 py-2.5 text-right">Requests</th>
                      <th className="px-4 py-2.5 text-right">Input / Cache / Output</th>
                      <th className="px-5 py-2.5 text-right">Charge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05] font-mono">
                    {thisMonthByModel.map((row) => (
                      <tr key={row.modelId}>
                        <td className="px-5 py-3 text-cyan-400 font-bold">{row.modelId}</td>
                        <td className="px-4 py-3 text-right">{row.requests.toLocaleString('id-ID')}</td>
                        <td className="px-4 py-3 text-right text-zinc-400">
                          {row.inputTokens.toLocaleString('id-ID')} / {row.cachedTokens.toLocaleString('id-ID')} / {row.outputTokens.toLocaleString('id-ID')}
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-white">{formatRupiah(row.costRp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Requests Table */}
          <div className={cn('rounded-2xl border overflow-hidden', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200 shadow-2xs')}>
            <div className="px-5 py-3.5 border-b border-white/[0.06]">
              <h3 className={cn('text-xs sm:text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>
                Recent requests
              </h3>
            </div>
            {filteredUsageLogs.length === 0 ? (
              <div className="p-8 text-xs text-zinc-500">
                No requests recorded in this period yet. Prompts and answers are never stored - only token counts, charges, and latency.
              </div>
            ) : (
              <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <table className="w-full min-w-[660px] text-left border-collapse">
                  <thead>
                    <tr className={cn('text-[11px] font-bold uppercase tracking-wider border-b', isDark ? 'text-zinc-400 border-white/[0.08] bg-[#0a0a0c]' : 'text-slate-500 border-slate-200 bg-slate-50')}>
                      <th className="px-5 py-3.5">Request ID</th>
                      <th className="px-4 py-3.5">Model &amp; Key</th>
                      <th className="px-4 py-3.5 text-right">Input</th>
                      <th className="px-4 py-3.5 text-right">Cached</th>
                      <th className="px-4 py-3.5 text-right">Output</th>
                      <th className="px-4 py-3.5 text-right">Charge</th>
                      <th className="px-5 py-3.5 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className={cn('divide-y text-xs', isDark ? 'divide-white/[0.06]' : 'divide-slate-100')}>
                    {filteredUsageLogs.map((u) => (
                      <tr key={u.id} className={cn(isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50')}>
                        <td className="px-5 py-3 font-mono text-zinc-400">{u.requestId}</td>
                        <td className="px-4 py-3">
                          <div className={cn('font-bold font-mono', isDark ? 'text-white' : 'text-slate-900')}>{u.modelId}</div>
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
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 6: MODELS & PRICING (Chat Models + Image Models)                 */}
      {/* ==================================================================== */}
      {activeTab === 'models' && (
        <div className="space-y-5">
          {/* Sub-Tabs: Chat Models vs Image Models */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className={cn('w-full sm:w-auto grid grid-cols-2 sm:inline-flex items-center gap-1.5 p-1.5 rounded-xl border', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200')}>
              <button
                type="button"
                onClick={() => setModelTypeTab('chat')}
                className={cn(
                  'inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer',
                  modelTypeTab === 'chat'
                    ? 'bg-cyan-400 text-slate-950 shadow-xs'
                    : isDark
                    ? 'text-zinc-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span>Chat models</span>
                <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-mono', modelTypeTab === 'chat' ? 'bg-slate-950/15 text-slate-950' : isDark ? 'bg-white/[0.08] text-zinc-300' : 'bg-slate-200 text-slate-700')}>
                  {models.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setModelTypeTab('image')}
                className={cn(
                  'inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer',
                  modelTypeTab === 'image'
                    ? 'bg-cyan-400 text-slate-950 shadow-xs'
                    : isDark
                    ? 'text-zinc-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Image models</span>
                <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-mono', modelTypeTab === 'image' ? 'bg-slate-950/15 text-slate-950' : isDark ? 'bg-white/[0.08] text-zinc-300' : 'bg-slate-200 text-slate-700')}>
                  {imageModels.length}
                </span>
              </button>
            </div>
          </div>

          {modelTypeTab === 'chat' && (
          <div className={cn('rounded-2xl border overflow-hidden', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200 shadow-2xs')}>
            <div className={cn('p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3', isDark ? 'border-white/[0.08]' : 'border-slate-200')}>
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  placeholder="Search model name, ID, or provider..."
                  className={cn('w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm border outline-none transition-colors', isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-white focus:border-cyan-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500')}
                />
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {providers.map((prov) => (
                  <button
                    key={prov}
                    type="button"
                    onClick={() => setProviderFilter(prov)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer',
                      providerFilter === prov
                        ? 'bg-cyan-400 text-slate-950 font-bold'
                        : isDark
                        ? 'bg-white/5 text-zinc-400 hover:text-white'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                    )}
                  >
                    {prov === 'ON_PROMO' ? 'On Promo' : prov}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <table className="w-full min-w-[640px] text-left border-collapse">
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
                              ? isDark
                                ? 'bg-cyan-500/[0.05]'
                                : 'bg-cyan-50/70'
                              : isDark
                              ? 'hover:bg-white/[0.02]'
                              : 'hover:bg-slate-50'
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
                                  {isPeakNow ? 'Peak (now)' : 'Off-Peak Price'}
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
                                      {m.openaiOnly ? 'OpenAI Chat Completions · Responses API' : 'OpenAI Chat Completions · Responses API · Anthropic Messages'}
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

          {/* Image Generation Models Pricing Table */}
          {modelTypeTab === 'image' && (
          <div className={cn('rounded-2xl border overflow-hidden', isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200 shadow-2xs')}>
            <div className="px-5 py-4 border-b border-white/[0.08]">
              <h3 className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>
                Image Generation Models (POST /api/ai/v1/images/generations)
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Prices are per image, in Rupiah. Each image is billed by the provider&apos;s token count for its size; failed or refused images cost Rp 0. Images are kept for 7 days on upstream storage.
              </p>
            </div>
            {/* Mobile Stacked Cards for Image Models */}
            <div className="md:hidden divide-y divide-white/[0.06]">
              {imageModels.map((im) => (
                <div key={`mob-im-${im.modelId}`} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={cn('font-bold text-sm', isDark ? 'text-white' : 'text-slate-900')}>{im.name}</span>
                        {im.modelId === 'seedream-image-v5.0-flash' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Cheapest
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-500 mt-0.5">
                        <span className="truncate">{im.modelId}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(im.modelId, `mob-img-${im.modelId}`, `Copied ${im.modelId}`)}
                          className="hover:text-cyan-400 cursor-pointer shrink-0"
                        >
                          {copiedId === `mob-img-${im.modelId}` ? <Check className="w-3 h-3 text-cyan-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setImgModelId(im.modelId);
                        if (im.sizes[0]) setImgSize(im.sizes[0]);
                        setActiveTab('images');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-cyan-400/15 border border-cyan-400/30 text-cyan-400 font-bold text-[11px] whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Try -&gt;
                    </button>
                  </div>
                  {im.description && (
                    <p className="text-[11px] text-zinc-400 leading-relaxed">{im.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {im.sizes.map((sz) => {
                      const szPrice =
                        im.sizePrices?.[sz] ??
                        (im.modelId === 'seedream-image-v5.0-pro' && sz === '2048x2048'
                          ? im.priceRp * 2
                          : im.priceRp);
                      return (
                        <span
                          key={sz}
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono text-[11px]',
                            isDark ? 'bg-[#0a0a0c] border-white/[0.1] text-zinc-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                          )}
                        >
                          <span>{sz.replace('x', '×')}</span>
                          <span className="text-cyan-400 font-bold">{formatRupiah(szPrice)}</span>
                        </span>
                      );
                    })}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {im.maxN > 1 ? `Up to ${im.maxN} per request` : '1 per request'}
                    {im.maxRefImages > 0 && ` · ${im.maxRefImages} reference ${im.maxRefImages === 1 ? 'image' : 'images'}`}
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                <thead>
                  <tr className={cn('text-[11px] font-bold uppercase tracking-wider border-b', isDark ? 'text-zinc-400 border-white/[0.08] bg-[#0a0a0c]' : 'text-slate-500 border-slate-200 bg-slate-50')}>
                    <th className="px-5 py-3.5">Model</th>
                    <th className="px-4 py-3.5">Sizes &amp; Price / Image</th>
                    <th className="px-4 py-3.5">Options</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {imageModels.map((im) => (
                    <tr key={im.modelId} className={isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className={cn('font-bold text-sm', isDark ? 'text-white' : 'text-slate-900')}>{im.name}</span>
                          {im.modelId === 'seedream-image-v5.0-flash' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              Cheapest
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-zinc-500 flex items-center gap-1.5 mt-0.5">
                          <span>{im.modelId}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(im.modelId, `img-m-${im.modelId}`, `Copied ${im.modelId}`)}
                            className="hover:text-cyan-400 cursor-pointer"
                          >
                            {copiedId === `img-m-${im.modelId}` ? <Check className="w-3 h-3 text-cyan-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        {im.description && (
                          <div className="text-[11px] text-zinc-400 mt-1">{im.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          {im.sizes.map((sz) => {
                            const szPrice =
                              im.sizePrices?.[sz] ??
                              (im.modelId === 'seedream-image-v5.0-pro' && sz === '2048x2048'
                                ? im.priceRp * 2
                                : im.priceRp);
                            return (
                              <span
                                key={sz}
                                className={cn(
                                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono text-[11px]',
                                  isDark ? 'bg-[#0a0a0c] border-white/[0.1] text-zinc-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                                )}
                              >
                                <span>{sz.replace('x', '×')}</span>
                                <span className="text-cyan-400 font-bold">{formatRupiah(szPrice)}</span>
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[11px] text-zinc-400">
                        {im.maxN > 1 ? `up to ${im.maxN} per request` : '1 per request'}
                        {im.maxRefImages > 0 && ` - ${im.maxRefImages} reference ${im.maxRefImages === 1 ? 'image' : 'images'}`}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setImgModelId(im.modelId);
                            if (im.sizes[0]) setImgSize(im.sizes[0]);
                            setActiveTab('images');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-400/15 hover:bg-cyan-400/25 border border-cyan-400/30 text-cyan-400 font-bold text-xs cursor-pointer transition-all"
                        >
                          Try -&gt;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 7: QUICKSTART & FULL DOCUMENTATION                               */}
      {/* ==================================================================== */}
      {activeTab === 'docs' && (
        <AiGatewayDocsPortal
          isDark={isDark}
          openaiBase={openaiBase}
          anthropicBase={anthropicBase}
          mgmtBase={`${origin}/api/ai`}
          sampleModel={sampleModel}
          modelCount={models.length}
          imageModelCount={imageModels.length}
          topupFeeRp={topupFeeRp}
        />
      )}

      {/* Top Up AI Balance Modal */}
      {isTopupModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={cn('w-full max-w-md rounded-2xl border p-6 space-y-5 shadow-2xl', isDark ? 'bg-[#0c0c0e] border-white/[0.1]' : 'bg-white border-slate-200')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/25 text-cyan-400 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={cn('text-base font-bold', isDark ? 'text-white' : 'text-slate-900')}>
                    Top Up AI Credit Balance
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Transfer funds from your Masdika Wallet
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !toppingUp && setIsTopupModalOpen(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmTopupAiBalance} className="space-y-4">
              <div>
                <label className={cn('text-xs font-bold uppercase tracking-wider block mb-2', isDark ? 'text-zinc-400' : 'text-slate-600')}>
                  Select Preset Amount
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[50000, 100000, 250000, 500000].map((pack) => {
                    const selected = Number(customTopupAmount) === pack;
                    return (
                      <button
                        key={pack}
                        type="button"
                        onClick={() => setCustomTopupAmount(String(pack))}
                        className={cn(
                          'px-3.5 py-2.5 rounded-xl border text-left font-mono text-xs font-bold transition-all cursor-pointer',
                          selected
                            ? 'bg-cyan-500/15 border-cyan-400 text-cyan-400 ring-1 ring-cyan-400/30'
                            : isDark
                            ? 'bg-[#141418] border-white/[0.08] text-zinc-200 hover:border-white/20'
                            : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300'
                        )}
                      >
                        {formatRupiah(pack)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={cn('text-xs font-bold uppercase tracking-wider block mb-1.5', isDark ? 'text-zinc-400' : 'text-slate-600')}>
                  Custom Amount (Min Rp 5.000)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={customTopupAmount ? Number(customTopupAmount).toLocaleString('id-ID') : ''}
                    onChange={(e) => setCustomTopupAmount(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    placeholder="50.000"
                    className={cn('w-full pl-9 pr-4 py-2.5 rounded-xl text-sm font-mono border outline-none focus:border-cyan-500', isDark ? 'bg-[#141418] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-900')}
                  />
                </div>
              </div>

              <div className={cn('rounded-xl border p-3.5 space-y-1.5 text-xs', isDark ? 'bg-[#141418] border-white/[0.08]' : 'bg-slate-50 border-slate-200')}>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Masdika Wallet Balance</span>
                  <span className={cn('font-mono font-semibold', isDark ? 'text-white' : 'text-slate-900')}>
                    {formatRupiah(walletBalance)}
                  </span>
                </div>
                {lockedCommitment > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Locked for Active Services</span>
                    <span className="font-mono text-amber-400">-{formatRupiah(lockedCommitment)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Available to Top Up AI</span>
                  <span className="font-mono font-bold text-cyan-400">{formatRupiah(availableWalletBalance)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">AI Credit Received</span>
                  <span className="font-mono text-zinc-300">{formatRupiah(Number(customTopupAmount) || 0)}</span>
                </div>
                {topupFeeRp > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Platform Admin Fee</span>
                    <span className="font-mono text-amber-400">+{formatRupiah(topupFeeRp)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.06] font-bold">
                  <span className={isDark ? 'text-white' : 'text-slate-900'}>Total Wallet Deducted</span>
                  <span className="font-mono text-cyan-400">
                    {formatRupiah((Number(customTopupAmount) || 0) + topupFeeRp)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>AI Balance After Top-Up</span>
                  <span className="font-mono text-emerald-400">
                    {formatRupiah(aiBalance + (Number(customTopupAmount) || 0))}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={toppingUp}
                  onClick={() => setIsTopupModalOpen(false)}
                  className={cn('px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer', isDark ? 'border-white/10 text-zinc-300 hover:bg-white/5' : 'border-slate-200 text-slate-600 hover:bg-slate-100')}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={toppingUp || Number(customTopupAmount) < 5000 || (Number(customTopupAmount) + topupFeeRp) > availableWalletBalance}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 cursor-pointer disabled:opacity-50"
                >
                  {toppingUp
                    ? 'Processing...'
                    : (Number(customTopupAmount) + topupFeeRp) > availableWalletBalance
                    ? 'Exceeds Available Balance'
                    : `Confirm Top-Up (${formatRupiah((Number(customTopupAmount) || 0) + topupFeeRp)})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Key Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={cn('w-full max-w-xl rounded-2xl border p-5 sm:p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto', isDark ? 'bg-[#0c0c0e] border-white/[0.1]' : 'bg-white border-slate-200')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={cn('text-base font-bold', isDark ? 'text-white' : 'text-slate-900')}>Create AI Gateway Key</h3>
                  <p className="text-[11px] text-zinc-400">Configure label, spend cap, expiry, and model access scope.</p>
                </div>
              </div>
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
                  required
                  maxLength={64}
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Production Backend / Claude Code"
                  className={cn('w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none focus:border-cyan-500', isDark ? 'bg-[#141418] border-white/[0.08] text-white' : 'bg-slate-50 border-slate-200 text-slate-900')}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={cn('text-xs font-bold uppercase tracking-wider block mb-1.5', isDark ? 'text-zinc-400' : 'text-slate-600')}>
                    Monthly Limit (Rp) - Optional
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newMonthlyLimit ? Number(newMonthlyLimit).toLocaleString('id-ID') : ''}
                    onChange={(e) => setNewMonthlyLimit(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    placeholder="e.g. 100.000 (blank = unlimited)"
                    className={cn(
                      'w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none focus:border-cyan-500 font-mono',
                      newMonthlyLimit && (Number(newMonthlyLimit) < 1000 || Number(newMonthlyLimit) > 100000000)
                        ? 'border-rose-500/60 focus:border-rose-500'
                        : isDark
                        ? 'bg-[#141418] border-white/[0.08] text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900',
                      isDark ? 'bg-[#141418] text-white' : 'bg-slate-50 text-slate-900',
                    )}
                  />
                  <p className={cn('text-[11px] mt-1', newMonthlyLimit && (Number(newMonthlyLimit) < 1000 || Number(newMonthlyLimit) > 100000000) ? 'text-rose-400' : 'text-zinc-500')}>
                    {newMonthlyLimit && (Number(newMonthlyLimit) < 1000 || Number(newMonthlyLimit) > 100000000)
                      ? 'Must be between Rp 1.000 and Rp 100.000.000'
                      : 'Min Rp 1.000 - leave blank for unlimited'}
                  </p>
                </div>
                <div>
                  <label className={cn('text-xs font-bold uppercase tracking-wider block mb-1.5', isDark ? 'text-zinc-400' : 'text-slate-600')}>
                    Expires In (Days) - Optional
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newKeyExpiresDays}
                    onChange={(e) => setNewKeyExpiresDays(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="e.g. 30 (blank = never)"
                    className={cn(
                      'w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none focus:border-cyan-500 font-mono',
                      newKeyExpiresDays && (Number(newKeyExpiresDays) < 1 || Number(newKeyExpiresDays) > 3650)
                        ? 'border-rose-500/60 focus:border-rose-500'
                        : isDark
                        ? 'bg-[#141418] border-white/[0.08] text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900',
                      isDark ? 'bg-[#141418] text-white' : 'bg-slate-50 text-slate-900',
                    )}
                  />
                  <p className={cn('text-[11px] mt-1', newKeyExpiresDays && (Number(newKeyExpiresDays) < 1 || Number(newKeyExpiresDays) > 3650) ? 'text-rose-400' : 'text-zinc-500')}>
                    {newKeyExpiresDays && (Number(newKeyExpiresDays) < 1 || Number(newKeyExpiresDays) > 3650)
                      ? 'Must be between 1 and 3650 days'
                      : '1 - 3650 days - leave blank for no expiry'}
                  </p>
                </div>
              </div>

              {/* Masdika Cyan Model Access Scope */}
              <div className={cn('rounded-xl border p-3.5 space-y-3', isDark ? 'bg-[#141418] border-white/[0.08]' : 'bg-slate-50 border-slate-200')}>
                <div className="flex items-center justify-between gap-2">
                  <AdminCheckbox
                    checked={restrictModels}
                    onChange={(checked) => setRestrictModels(checked)}
                    label={
                      <span className={cn('text-xs font-bold', isDark ? 'text-white' : 'text-slate-900')}>
                        Only allow selected models
                      </span>
                    }
                  />
                  {restrictModels && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 whitespace-nowrap shrink-0">
                      {selectedAllowedModels.length} selected
                    </span>
                  )}
                </div>

                {restrictModels && (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                      <div className="relative flex-1 min-w-[160px]">
                        <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={keyModelSearch}
                          onChange={(e) => setKeyModelSearch(e.target.value)}
                          placeholder="Filter chat or image models..."
                          className={cn('w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border outline-none focus:border-cyan-500', isDark ? 'bg-[#0a0a0c] border-white/[0.08] text-white' : 'bg-white border-slate-200 text-slate-900')}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedAllowedModels([
                            ...models.map((m) => m.modelId),
                            ...imageModels.map((im) => im.modelId),
                          ])
                        }
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/25 cursor-pointer"
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedAllowedModels([])}
                        className={cn('px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border cursor-pointer', isDark ? 'border-white/10 text-zinc-400 hover:text-white' : 'border-slate-200 text-slate-600')}
                      >
                        Clear
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-1">
                      {[
                        ...models.map((m) => ({ modelId: m.modelId, name: m.name, kind: 'Chat' as const })),
                        ...imageModels.map((im) => ({ modelId: im.modelId, name: im.name, kind: 'Image' as const })),
                      ]
                        .filter(
                          (item) =>
                            !keyModelSearch.trim() ||
                            item.name.toLowerCase().includes(keyModelSearch.toLowerCase()) ||
                            item.modelId.toLowerCase().includes(keyModelSearch.toLowerCase()),
                        )
                        .map((item) => {
                          const isSelected = selectedAllowedModels.includes(item.modelId);
                          return (
                            <button
                              key={item.modelId}
                              type="button"
                              onClick={() =>
                                setSelectedAllowedModels((prev) =>
                                  prev.includes(item.modelId)
                                    ? prev.filter((id) => id !== item.modelId)
                                    : [...prev, item.modelId],
                                )
                              }
                              className={cn(
                                'flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-left transition-all cursor-pointer',
                                isSelected
                                  ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300 shadow-2xs shadow-cyan-500/10'
                                  : isDark
                                  ? 'bg-[#0a0a0c] border-white/[0.08] text-zinc-300 hover:border-cyan-500/40'
                                  : 'bg-white border-slate-200 text-slate-700 hover:border-cyan-400',
                              )}
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-bold truncate">{item.name}</div>
                                <div className="text-[10px] font-mono text-zinc-500 truncate">{item.modelId}</div>
                              </div>
                              <span
                                className={cn(
                                  'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0',
                                  isSelected
                                    ? 'bg-cyan-400 text-slate-950'
                                    : isDark
                                    ? 'bg-white/[0.06] text-zinc-400'
                                    : 'bg-slate-100 text-slate-500',
                                )}
                              >
                                {item.kind}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className={cn('px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer', isDark ? 'border-white/10 text-zinc-300 hover:bg-white/5' : 'border-slate-200 text-slate-600 hover:bg-slate-100')}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || (restrictModels && selectedAllowedModels.length === 0)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 cursor-pointer disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={pendingTopupAmount !== null}
        onClose={() => !toppingUp && setPendingTopupAmount(null)}
        onConfirm={handleConfirmTopupAiBalance}
        title="Confirm AI Balance Top-Up"
        description={
          pendingTopupAmount
            ? `Are you sure you want to add ${formatRupiah(pendingTopupAmount)} AI Credit${topupFeeRp > 0 ? ` (+ ${formatRupiah(topupFeeRp)} platform fee = ${formatRupiah(pendingTopupAmount + topupFeeRp)} total deducted)` : ''} from your Masdika Wallet (${formatRupiah(walletBalance)} available)? Your remaining Masdika Wallet balance will be ${formatRupiah(Math.max(0, walletBalance - pendingTopupAmount - topupFeeRp))}.`
            : ''
        }
        confirmText={
          toppingUp
            ? 'Processing...'
            : pendingTopupAmount
            ? `Top Up ${formatRupiah(pendingTopupAmount)}`
            : 'Confirm Top-Up'
        }
        variant="success"
        isLoading={toppingUp}
      />

      <ConfirmModal
        isOpen={Boolean(deletingKey)}
        onClose={() => setDeletingKey(null)}
        onConfirm={handleDeleteKey}
        title="Revoke AI Gateway Key?"
        description={`Are you sure you want to permanently revoke "${deletingKey?.name}" (${deletingKey?.keyPrefix}••••)? Any applications using this key will immediately receive 401 invalid_api_key.`}
        confirmText={deleting ? 'Revoking...' : 'Revoke Key'}
        variant="danger"
      />
    </div>
  );
}
