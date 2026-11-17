"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Zap,
  ShieldCheck,
  Terminal,
  ArrowRight,
  Cpu,
  Globe,
  CheckCircle2,
  Lock,
  Layers,
  Search,
  Copy,
  Check,
  RefreshCw,
  Coins,
  Activity,
  KeyRound,
  Bot,
  Workflow,
  Sliders,
  Gauge,
  ChevronLeft,
  ChevronRight,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { HeroAvatarFrame } from "@/components/ui/HeroAvatarFrame";
import { FadeIn } from "@/components/animations/FadeIn";
import { AnimatedBeam, OrbitalRings } from "@/components/animations/DeploymentAnimations";
import { ProvisioningSection } from "@/components/ui/ProvisioningSection";
import { FaqSection } from "@/components/ui/FaqSection";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/billing";
import {
  DEFAULT_AI_MODELS,
  DEFAULT_AI_IMAGE_MODELS,
  sortModelsWithPromoFirst,
  sortAiModels,
  isModelPromo,
  getModelCapabilities,
  modelHasCapability,
  MODEL_SORT_OPTIONS,
  type AiModelCapability,
} from "@/lib/ai-gateway-constants";

interface AiModelItem {
  id?: number;
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
  openaiOnly?: boolean;
  hasPeakPricing?: boolean;
}

interface AiImageModelItem {
  modelId: string;
  name: string;
  description?: string;
  sizes: string[];
  tokensPerImage: number;
  basePriceRp: number;
  maxN: number;
  maxRefImages: number;
}

interface AiGatewayClientProps {
  chatModels: AiModelItem[];
  imageModels: AiImageModelItem[];
  isGatewayEnabled: boolean;
}

const AI_TERMINAL_LOGS = [
  { time: "00:01", module: "AUTH", message: "Verifying Bearer token SHA-256 hash (masdika_ai_...)..." },
  { time: "00:02", module: "KEY-SCOPE", message: "Key scoped for requested model 'qwen3.7-flash'. Access granted." },
  { time: "00:03", module: "BALANCE", message: "Checking AI balance and monthly spending budget limit: OK." },
  { time: "00:04", module: "UPSTREAM", message: "Connecting to low-latency edge inference cluster (TTFT ~180ms)..." },
  { time: "00:05", module: "STREAMING", message: "Piping Server-Sent Events (SSE) chunks to client at 85 tok/s..." },
  { time: "00:06", module: "METERING", message: "Accounting: 142 prompt tokens, 388 completion tokens recorded." },
  { time: "00:07", module: "SETTLED", message: "Deduction Rp 12 settled. Zero training retention verified.", isCommand: true },
];

const AI_TERMINAL_STATS = [
  { value: "70+", label: "FRONTIER MODELS" },
  { value: "100%", label: "OPENAI DROP-IN" },
  { value: "Rp 0", label: "FAILED REQUEST COST" },
  { value: "Zero", label: "DATA RETENTION" },
];

const CODE_EXAMPLES = [
  {
    id: "curl",
    label: "cURL",
    language: "bash",
    code: `curl -N https://www.masdika.id/api/ai/openai/v1/chat/completions \\
  -H "Authorization: Bearer masdika_ai_YOUR_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "qwen3.7-flash",
    "stream": true,
    "messages": [
      { "role": "system", "content": "You are a helpful coding assistant." },
      { "role": "user", "content": "Explain Kubernetes NodePort in one paragraph." }
    ]
  }'`,
  },
  {
    id: "python",
    label: "Python (OpenAI)",
    language: "python",
    code: `from openai import OpenAI

client = OpenAI(
    api_key="masdika_ai_YOUR_KEY_HERE",
    base_url="https://www.masdika.id/api/ai/openai/v1",
)

response = client.chat.completions.create(
    model="claude-3-7-sonnet",
    messages=[{"role": "user", "content": "Draft an API design for order processing."}],
    stream=True,
)

for chunk in response:
    content = chunk.choices[0].delta.content or ""
    print(content, end="", flush=True)`,
  },
  {
    id: "node",
    label: "Node.js / TS",
    language: "typescript",
    code: `import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.MASDIKA_AI_KEY,
  baseURL: "https://www.masdika.id/api/ai/openai/v1",
});

async function main() {
  const stream = await openai.chat.completions.create({
    model: "deepseek-v3",
    messages: [{ role: "user", content: "Optimize this SQL query..." }],
    stream: true,
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || "");
  }
}

main();`,
  },
  {
    id: "vercel",
    label: "Vercel AI SDK",
    language: "typescript",
    code: `import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const masdika = createOpenAI({
  apiKey: process.env.MASDIKA_AI_KEY,
  baseURL: "https://www.masdika.id/api/ai/openai/v1",
});

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({
    model: masdika("gemini-2.5-flash"),
    messages,
  });
  return result.toDataStreamResponse();
}`,
  },
  {
    id: "cursor",
    label: "Cursor / Aider",
    language: "plaintext",
    code: `# Cursor IDE Settings -> Models -> OpenAI API Key:
Base URL: https://www.masdika.id/api/ai/openai/v1
API Key : masdika_ai_YOUR_KEY_HERE

# Aider CLI Configuration (.env):
OPENAI_API_BASE=https://www.masdika.id/api/ai/openai/v1
OPENAI_API_KEY=masdika_ai_YOUR_KEY_HERE
AIDER_MODEL=openai/claude-3-7-sonnet`,
  },
];

const AI_FAQS = [
  {
    q: "How does Masdika AI Gateway work as a drop-in OpenAI replacement?",
    a: "Masdika AI Gateway implements the official OpenAI v1 API specification (/v1/chat/completions, /v1/models, and /v1/images/generations). Any library or developer tool that works with OpenAI can connect simply by changing the baseURL to 'https://www.masdika.id/api/ai/openai/v1' and passing your Masdika API key. You get access to 70+ frontier models (Claude, GPT, Gemini, DeepSeek, Qwen, Llama) through that one endpoint.",
  },
  {
    q: "How does Pay-As-You-Go Rupiah token billing work?",
    a: "There are no monthly minimum fees or expiring credit bundles. You deposit funds into your Masdika AI Balance (starting from Rp 10.000), and each request deducts only the exact tokens consumed (prompt + completion) at transparent Indonesian Rupiah rates. If an upstream call fails or drops, you are billed Rp 0.",
  },
  {
    q: "Can I restrict an API key to specific models or set monthly budget limits?",
    a: "Yes! Each API key can be scoped to 'All models' or restricted to specific models (e.g., only 'qwen3.7-flash' for internal workers). You can also set a hard monthly spend limit in Rupiah and configure automated top-ups from your main account wallet when your AI Balance drops below a threshold.",
  },
  {
    q: "Are my prompts and streaming tokens stored or used for AI model training?",
    a: "Never. Masdika Cloud enforces a strict Zero Data Retention policy for training. Your prompts, system instructions, and generated completions pass through in-memory streaming pipelines and are never recorded, analyzed, or utilized to train any public or private artificial intelligence models.",
  },
  {
    q: "What coding and developer tools can connect to Masdika AI Gateway?",
    a: "Virtually every tool supporting OpenAI-compatible endpoints works out-of-the-box: Cursor IDE, Windsurf, Aider CLI, Claude Code, Cline, Continue.dev, LangChain, LlamaIndex, LiteLLM, Vercel AI SDK, Next.js, FastAPI, and direct cURL scripts.",
  },
];

export default function AiGatewayClient({
  chatModels = [],
  imageModels = [],
  isGatewayEnabled = true,
}: AiGatewayClientProps) {
  // Code snippet state
  const [activeCodeTab, setActiveCodeTab] = useState("curl");
  const [copiedCode, setCopiedCode] = useState(false);

  // Model explorer state
  const [modelTypeTab, setModelTypeTab] = useState<"chat" | "image">("chat");
  const [selectedProvider, setSelectedProvider] = useState("all");
  const [selectedCapability, setSelectedCapability] = useState<AiModelCapability | null>(null);
  const [modelSortBy, setModelSortBy] = useState<string>("recommended");
  const [modelSearch, setModelSearch] = useState("");
  const [copiedModelId, setCopiedModelId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Calculator state
  const [calcModelId, setCalcModelId] = useState("qwen3.7-flash");
  const [promptTokens, setPromptTokens] = useState(2000);
  const [completionTokens, setCompletionTokens] = useState(800);
  const [monthlyRequests, setMonthlyRequests] = useState(2500);

  // Fallback chat models & image models from single source of truth if empty
  const allChatModels: AiModelItem[] = useMemo(() => {
    if (chatModels && chatModels.length > 0) return chatModels;
    return DEFAULT_AI_MODELS as AiModelItem[];
  }, [chatModels]);

  const allImageModels: AiImageModelItem[] = useMemo(() => {
    if (imageModels && imageModels.length > 0) return imageModels;
    return DEFAULT_AI_IMAGE_MODELS as AiImageModelItem[];
  }, [imageModels]);

  // Pre-seed priority providers matching Gambar 1 (On Promo, Qwen, OpenAI, Anthropic, Hunyuan, DeepSeek, GLM)
  const providers = useMemo(() => {
    const set = new Set<string>();
    const priority = ["on promo", "Qwen", "OpenAI", "Anthropic", "Hunyuan", "DeepSeek", "GLM"];
    priority.forEach((p) => set.add(p));
    allChatModels.forEach((m) => {
      if (m.provider) set.add(m.provider);
    });
    return ["all", ...Array.from(set)];
  }, [allChatModels]);

  const filteredChatModels = useMemo(() => {
    const filtered = allChatModels.filter((m) => {
      const matchProvider =
        selectedProvider === "all" ||
        (selectedProvider === "on promo"
          ? isModelPromo(m)
          : m.provider.toLowerCase() === selectedProvider.toLowerCase());
      if (selectedCapability && !modelHasCapability(m.modelId, selectedCapability)) {
        return false;
      }
      const q = modelSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.modelId.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q);
      return matchProvider && matchSearch;
    });
    return sortAiModels(filtered, modelSortBy);
  }, [allChatModels, selectedProvider, modelSearch, selectedCapability, modelSortBy]);

  const filteredImageModels = useMemo(() => {
    const q = modelSearch.toLowerCase().trim();
    if (!q) return allImageModels;
    return allImageModels.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.modelId.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q))
    );
  }, [allImageModels, modelSearch]);

  // Pagination calculation
  const currentTotal = modelTypeTab === "chat" ? filteredChatModels.length : filteredImageModels.length;
  const effectivePageSize = pageSize === -1 ? currentTotal : pageSize;
  const totalPages = Math.max(1, Math.ceil(currentTotal / (effectivePageSize || 1)));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedChatModels = useMemo(() => {
    if (pageSize === -1 || pageSize >= filteredChatModels.length) return filteredChatModels;
    const start = (safePage - 1) * pageSize;
    return filteredChatModels.slice(start, start + pageSize);
  }, [filteredChatModels, safePage, pageSize]);

  const paginatedImageModels = useMemo(() => {
    if (pageSize === -1 || pageSize >= filteredImageModels.length) return filteredImageModels;
    const start = (safePage - 1) * pageSize;
    return filteredImageModels.slice(start, start + pageSize);
  }, [filteredImageModels, safePage, pageSize]);

  const startItem = currentTotal === 0 ? 0 : (safePage - 1) * effectivePageSize + 1;
  const endItem = currentTotal === 0 ? 0 : Math.min(safePage * effectivePageSize, currentTotal);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const el = document.getElementById("models-table");
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.top < 80) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (safePage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (safePage >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", safePage - 1, safePage, safePage + 1, "...", totalPages];
  }, [safePage, totalPages]);

  // Current calculator model
  const activeCalcModel = useMemo(() => {
    return allChatModels.find((m) => m.modelId === calcModelId) || allChatModels[0];
  }, [allChatModels, calcModelId]);

  const calcModelOptions = useMemo(() => {
    return allChatModels.map((m) => ({
      value: m.modelId,
      label: `${m.name} (${m.provider}) • Input ${formatRupiah(m.inputPricePer1M)}/1M, Output ${formatRupiah(m.outputPricePer1M)}/1M`,
    }));
  }, [allChatModels]);

  // Calculator cost math
  const costPerRequestRp = useMemo(() => {
    if (!activeCalcModel) return 0;
    const inputCost = (promptTokens / 1_000_000) * activeCalcModel.inputPricePer1M;
    const outputCost = (completionTokens / 1_000_000) * activeCalcModel.outputPricePer1M;
    return Math.max(1, Math.round(inputCost + outputCost));
  }, [activeCalcModel, promptTokens, completionTokens]);

  const monthlyTotalRp = useMemo(() => {
    return costPerRequestRp * monthlyRequests;
  }, [costPerRequestRp, monthlyRequests]);

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyModelId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedModelId(id);
    setTimeout(() => setCopiedModelId(null), 2000);
  };

  const currentCode = CODE_EXAMPLES.find((c) => c.id === activeCodeTab) || CODE_EXAMPLES[0];

  return (
    <div className="flex flex-col min-h-screen pt-28 sm:pt-36 md:pt-40 pb-10 sm:pb-14 overflow-x-hidden">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1">

        {/* ── 0. HERO (Identical to Managed Apps & Managed DB Page Pattern) ───── */}
        <section className="relative pt-0 pb-8 sm:pb-12 flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-start w-full">

            {/* Left – Text & Actions */}
            <div className="max-w-2xl relative z-30 lg:pt-20">
              <div className="mb-8">
                <Badge variant="brand" dot dotColor="bg-emerald-400" size="md" className="font-mono uppercase whitespace-nowrap">
                  UNIFIED AI INFERENCE GATEWAY
                </Badge>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-5xl xl:text-6xl 2xl:text-[70px] font-black tracking-tight leading-[1.08] mb-4 text-[var(--text-primary)] text-balance">
                AI Gateway &amp; <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-100 bg-clip-text text-transparent">
                  70+ Frontier Models.
                </span>
              </h1>

              <p className="text-lg md:text-xl mb-10 max-w-xl leading-relaxed text-[var(--text-secondary)] font-normal">
                One universal API key to route your prompts to Claude 3.7, GPT-4o, Gemini 2.5, DeepSeek R1, and Qwen 3.7 with sub-millisecond edge latency and 100% Rupiah Pay-As-You-Go.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href="/dashboard/ai-gateway"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Get API Key
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href="#models"
                  leftIcon={<Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                >
                  Explore 70+ Models
                </Button>
              </div>
            </div>

            {/* Right – Hero Avatar (ai-token-gateway.webp) with 4 Floating Badges */}
            <div className="relative flex items-center justify-center mt-6 lg:mt-0 lg:self-center">
              <HeroAvatarFrame
                imageSrc="/images/mascots/ai-token-gateway.webp"
                imageAlt="Masdika AI Gateway – Unified OpenAI-Compatible Router"
                imageWidth={1536}
                imageHeight={1024}
                badges={[
                  { icon: Sparkles, label: "Live LLM Models", value: "70+ Live Models" },
                  { icon: Terminal, label: "Compatibility", value: "OpenAI Drop-In" },
                  { icon: Zap, label: "Edge Latency", value: "Sub-ms Edge Proxy" },
                  { icon: ShieldCheck, label: "Data Privacy", value: "Zero Data Training" },
                ]}
              />
            </div>

          </div>
        </section>

        {/* ── 1. VALUE PILLARS (4 Trust Highlights) ───────────────────────── */}
        <section className="py-10 sm:py-14 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {[
              {
                icon: Terminal,
                title: "100% OpenAI Drop-In",
                desc: "Switch baseURL to masdika.id/api/ai/openai/v1. Works out of the box with Cursor, Aider, LangChain, and official OpenAI SDKs.",
              },
              {
                icon: Sparkles,
                title: "70+ Frontier AI Models",
                desc: "Direct access to Claude 3.7 Sonnet, GPT-4o, Gemini 2.5 Flash, DeepSeek R1/V3, Qwen 3.7, and Kling Image models.",
              },
              {
                icon: Coins,
                title: "Rupiah Pay-As-You-Go",
                desc: "Pay per exact prompt and completion token from your deposit balance. Zero expired bundles; failed calls cost Rp 0.",
              },
              {
                icon: Lock,
                title: "Zero Data Retention",
                desc: "Enterprise privacy: prompts pass through in-memory proxy and are never stored or used to train any public or private models.",
              },
            ].map((pillar, i) => (
              <FadeIn key={i} delay={i * 0.1} direction="up" className="h-full">
                <div className="p-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] flex items-start gap-4 h-full shadow-sm hover:border-cyan-500/40 transition-colors">
                  <div className="w-11 h-11 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                    <pillar.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
                      {pillar.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      {pillar.desc}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── 2. CODE INTEGRATION SHOWCASE (Matching Managed Apps Section 3) ── */}
        <section id="integration" className="scroll-mt-24 py-10 sm:py-14 relative z-10">
          <div className="relative rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-8 sm:p-12 shadow-xl overflow-hidden">
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              <div className="lg:col-span-5">
                <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
                  OPENAI DROP-IN COMPATIBILITY
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
                  Change One Line of Code. Unlock 70+ Models.
                </h2>
                <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed mb-8 max-w-xl">
                  Masdika AI Gateway natively implements the OpenAI v1 API specification. Replace your <code className="text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-mono">baseURL</code> and pass your API key to route to Claude, GPT-4o, DeepSeek, Qwen, or Gemini instantly.
                </p>

                <div className="space-y-3.5">
                  {[
                    "Compatible with Cursor IDE, Windsurf, Aider CLI & Claude Code",
                    "High-throughput Server-Sent Events (SSE) streaming at 85+ tok/s",
                    "Zero code rewrite: works with official OpenAI Python & Node.js SDKs",
                    "Granular per-key model whitelisting and hard monthly spend limits",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                      <div className="w-6 h-6 rounded-md bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-medium text-[var(--text-primary)]">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: macOS-style Code Snippet Window (Light & Dark Mode Authentic) */}
              <div className="lg:col-span-7">
                <div className="w-full rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0d0e15] text-slate-800 dark:text-slate-100 shadow-xl dark:shadow-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
                  {/* macOS Window Titlebar */}
                  <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-slate-200/90 dark:border-white/[0.08] bg-slate-100/90 dark:bg-[#14151f] gap-2 sm:gap-3 select-none">
                    {/* macOS Traffic Light Buttons (Close, Minimize, Expand) */}
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]/80 shadow-xs inline-block" />
                      <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]/80 shadow-xs inline-block" />
                      <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#27c93f] border border-[#1aab29]/80 shadow-xs inline-block" />
                    </div>

                    {/* Tabs / Switcher */}
                    <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex-1 min-w-0 px-1">
                      {CODE_EXAMPLES.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setActiveCodeTab(c.id)}
                          className={cn(
                            "px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0",
                            activeCodeTab === c.id
                              ? "bg-white dark:bg-cyan-500/20 text-slate-900 dark:text-cyan-300 border border-slate-300/80 dark:border-cyan-500/40 shadow-xs font-bold"
                              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/50 dark:hover:bg-white/5"
                          )}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>

                    {/* Copy Button */}
                    <button
                      onClick={() => handleCopyCode(currentCode.code)}
                      className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-medium text-slate-700 dark:text-zinc-300 hover:text-cyan-600 dark:hover:text-cyan-300 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 shadow-xs transition-colors cursor-pointer shrink-0"
                      title="Copy code to clipboard"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span className="hidden xs:inline sm:inline">{copiedCode ? "Copied!" : "Copy"}</span>
                    </button>
                  </div>

                  {/* Code Area with Line Numbers (Clean, Hidden Scrollbars, No Bottom Status Bar) */}
                  <div className="p-3.5 sm:p-5 flex text-[11px] sm:text-xs font-mono overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden leading-relaxed bg-slate-50/70 dark:bg-[#0a0b10]">
                    <div className="select-none pr-3 sm:pr-4 text-right text-slate-400 dark:text-zinc-600 font-mono text-[11px] sm:text-xs border-r border-slate-200/90 dark:border-white/[0.08] space-y-0.5 min-w-[1.8rem] sm:min-w-[2.2rem] shrink-0">
                      {currentCode.code.split("\n").map((_, i) => (
                        <div key={i}>{i + 1}</div>
                      ))}
                    </div>
                    <pre className="pl-3 sm:pl-4 font-mono text-[11px] sm:text-xs text-slate-800 dark:text-zinc-200 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden leading-relaxed flex-1">
                      <code>{currentCode.code}</code>
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. FRONTIER MODEL DIRECTORY & PRICING TABLE ─────────────────── */}
        <section id="models" className="scroll-mt-24 py-10 sm:py-14 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              MODEL CATALOG &amp; PRICING
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Transparent Token Pricing in Rupiah
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed mb-4">
              No hidden foreign exchange markups or minimum billing brackets. Filter through 70+ text and image models.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-xs font-medium shadow-xs">
              <Rocket className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
              <span>Pay-as-you-go per token in Rupiah – no token bundles required. Failed requests cost Rp 0.</span>
            </div>
          </div>

          <div id="models-table" className="rounded-2xl border border-[var(--border-primary)] dark:border-white/10 bg-[var(--surface)] dark:bg-[#0c0d12] shadow-xl overflow-hidden">
            {/* Control Bar: Model Type, Provider Pills & Search (Unified Single-Row on Desktop matching Gambar 1) */}
            <div className="p-3 sm:p-3.5 border-b border-[var(--border-primary)] dark:border-white/10 bg-[var(--surface-secondary)]/50 dark:bg-[#0f1117] flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 sm:gap-3">
              {/* Left: Model Type Tabs (Responsive with auto-scroll safeguard) */}
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden w-full sm:w-auto shrink-0 pb-0.5 sm:pb-0">
                <button
                  onClick={() => {
                    setModelTypeTab("chat");
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0",
                    modelTypeTab === "chat"
                      ? "bg-cyan-400 text-slate-950 shadow-xs font-black"
                      : "text-[var(--text-secondary)] dark:text-zinc-400 hover:text-[var(--text-primary)] dark:hover:text-white hover:bg-[var(--surface)] dark:hover:bg-white/5"
                  )}
                >
                  <Cpu className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Chat &amp; Reasoning<span className="hidden sm:inline">&nbsp;Models</span> ({allChatModels.length})
                  </span>
                </button>
                <button
                  onClick={() => {
                    setModelTypeTab("image");
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0",
                    modelTypeTab === "image"
                      ? "bg-cyan-400 text-slate-950 shadow-xs font-black"
                      : "text-[var(--text-secondary)] dark:text-zinc-400 hover:text-[var(--text-primary)] dark:hover:text-white hover:bg-[var(--surface)] dark:hover:bg-white/5"
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Image<span className="hidden sm:inline">&nbsp;Models</span> ({allImageModels.length})
                  </span>
                </button>
              </div>

              {/* Center: Provider Horizontal Filter Pills (Chat only) */}
              {modelTypeTab === "chat" && (
                <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-0.5 w-full xl:w-auto max-w-full">
                  {providers.map((p) => {
                    const isSelected = selectedProvider.toLowerCase() === p.toLowerCase();
                    return (
                      <button
                        key={p}
                        onClick={() => {
                          setSelectedProvider(p);
                          setCurrentPage(1);
                        }}
                        className={cn(
                          "px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer whitespace-nowrap shrink-0",
                          isSelected
                            ? "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/50 shadow-xs font-bold"
                            : "text-[var(--text-secondary)] dark:text-zinc-400 hover:text-[var(--text-primary)] dark:hover:text-white hover:bg-[var(--surface)] dark:hover:bg-white/5"
                        )}
                      >
                        {p === "all" ? "All" : p === "on promo" ? "On Promo" : p}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Right: Search Input */}
              <div className="relative w-full sm:w-60 xl:w-64 shrink-0">
                <Search className="w-3.5 h-3.5 text-[var(--text-muted)] dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={modelSearch}
                  onChange={(e) => {
                    setModelSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search model ID or name..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-xl text-xs border border-[var(--border-primary)] dark:border-white/10 bg-[var(--surface)] dark:bg-[#0c0d14] text-[var(--text-primary)] dark:text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500 transition-colors"
                />
                {modelSearch && (
                  <button
                    onClick={() => {
                      setModelSearch("");
                      setCurrentPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white cursor-pointer"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Capability Filter Bar & Sorter matching media_1794902772036_da127c35.jpg */}
            {modelTypeTab === "chat" && (
              <div className="px-4 sm:px-6 py-2.5 sm:py-3 border-b border-[var(--border-primary)] dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--surface-secondary)]/50 dark:bg-[#0c0d12]">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="text-xs font-semibold mr-1 text-[var(--text-muted)] dark:text-zinc-400">Bisa:</span>
                  {(['Vision', 'Reasoning', 'Tools', 'JSON'] as const).map((cap) => {
                    const isSelected = selectedCapability === cap;
                    return (
                      <button
                        key={cap}
                        type="button"
                        onClick={() => {
                          setSelectedCapability(isSelected ? null : cap);
                          setCurrentPage(1);
                        }}
                        className={cn(
                          'px-2.5 sm:px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border',
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs shadow-emerald-500/20'
                            : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-white/20'
                        )}
                      >
                        {cap}
                      </button>
                    );
                  })}
                  {selectedCapability && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCapability(null);
                        setCurrentPage(1);
                      }}
                      className="text-[11px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline cursor-pointer ml-1"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-medium text-[var(--text-muted)] dark:text-zinc-400">Urutkan</span>
                  <div className="w-44 sm:w-52">
                    <Select
                      value={modelSortBy}
                      onChange={(val) => {
                        setModelSortBy(val);
                        setCurrentPage(1);
                      }}
                      options={MODEL_SORT_OPTIONS}
                      className="py-1.5 px-3 text-xs rounded-xl font-medium"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Models Table & Mobile Cards */}
            {modelTypeTab === "chat" ? (
              <>
                {/* 1. Desktop Table View (>= md screens) */}
                <div className="hidden md:block overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="text-[11px] font-bold uppercase tracking-wider border-b border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-muted)]">
                      <tr>
                        <th className="px-5 py-3.5">Model Name</th>
                        <th className="px-4 py-3.5">Model ID</th>
                        <th className="px-4 py-3.5">Context</th>
                        <th className="px-4 py-3.5 text-right">Input / 1M</th>
                        <th className="px-4 py-3.5 text-right">Cache Read / 1M</th>
                        <th className="px-4 py-3.5 text-right">Output / 1M</th>
                        <th className="px-4 py-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-primary)]">
                      {paginatedChatModels.map((m) => {
                        const discountPct =
                          m.originalOutputPricePer1M && m.originalOutputPricePer1M > m.outputPricePer1M
                            ? Math.round(((m.originalOutputPricePer1M - m.outputPricePer1M) / m.originalOutputPricePer1M) * 100)
                            : m.originalInputPricePer1M && m.originalInputPricePer1M > m.inputPricePer1M
                            ? Math.round(((m.originalInputPricePer1M - m.inputPricePer1M) / m.originalInputPricePer1M) * 100)
                            : 0;
                        const badgeText = m.discountBadge || (discountPct > 0 ? `-${discountPct}%` : null);

                        return (
                          <tr
                            key={m.modelId}
                            className="hover:bg-[var(--surface-secondary)]/40 transition-colors"
                          >
                            <td className="px-5 py-4 whitespace-nowrap">
                              <div className="font-bold flex items-center gap-2">
                                <span className="text-[var(--text-primary)]">{m.name}</span>
                                {badgeText && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-400/15 text-cyan-600 dark:text-cyan-400 border border-cyan-400/30">
                                    {badgeText}
                                  </span>
                                )}
                                {m.hasPeakPricing && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold border bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-white/10">
                                    Off-Peak
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[var(--text-muted)]">{m.provider}</div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <code className="font-mono text-cyan-600 dark:text-cyan-400 text-xs font-semibold">{m.modelId}</code>
                              <div className="flex items-center gap-1 flex-wrap mt-1">
                                {getModelCapabilities(m.modelId).map((cap) => (
                                  <span
                                    key={cap}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700/50"
                                  >
                                    {cap}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap font-mono text-[var(--text-secondary)]">
                              {m.contextWindow || "128K"}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap font-mono font-bold text-right text-cyan-600 dark:text-cyan-400">
                              {m.originalInputPricePer1M && m.originalInputPricePer1M > m.inputPricePer1M && (
                                <span className="text-[11px] font-normal line-through text-zinc-400 dark:text-zinc-500 block">
                                  {formatRupiah(m.originalInputPricePer1M)}
                                </span>
                              )}
                              {formatRupiah(m.inputPricePer1M)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap font-mono text-right text-cyan-600 dark:text-cyan-400">
                              {m.originalCachePricePer1M && m.originalCachePricePer1M > m.cachePricePer1M && (
                                <span className="text-[11px] font-normal line-through text-zinc-400 dark:text-zinc-500 block">
                                  {formatRupiah(m.originalCachePricePer1M)}
                                </span>
                              )}
                              {formatRupiah(m.cachePricePer1M)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap font-mono font-bold text-right text-cyan-600 dark:text-cyan-400">
                              {m.originalOutputPricePer1M && m.originalOutputPricePer1M > m.outputPricePer1M && (
                                <span className="text-[11px] font-normal line-through text-zinc-400 dark:text-zinc-500 block">
                                  {formatRupiah(m.originalOutputPricePer1M)}
                                </span>
                              )}
                              {formatRupiah(m.outputPricePer1M)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right">
                              <button
                                onClick={() => handleCopyModelId(m.modelId)}
                                className={cn(
                                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                                  copiedModelId === m.modelId
                                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/40"
                                    : "border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-300"
                                )}
                              >
                                {copiedModelId === m.modelId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedModelId === m.modelId ? "Copied" : "Copy ID"}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 2. Mobile Responsive Card List (< md screens) */}
                <div className="block md:hidden divide-y divide-[var(--border-primary)]">
                  {paginatedChatModels.map((m) => {
                    const discountPct =
                      m.originalOutputPricePer1M && m.originalOutputPricePer1M > m.outputPricePer1M
                        ? Math.round(((m.originalOutputPricePer1M - m.outputPricePer1M) / m.originalOutputPricePer1M) * 100)
                        : m.originalInputPricePer1M && m.originalInputPricePer1M > m.inputPricePer1M
                        ? Math.round(((m.originalInputPricePer1M - m.inputPricePer1M) / m.originalInputPricePer1M) * 100)
                        : 0;
                    const badgeText = m.discountBadge || (discountPct > 0 ? `-${discountPct}%` : null);

                    return (
                      <div key={m.modelId} className="p-3.5 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-sm text-[var(--text-primary)]">{m.name}</span>
                              {badgeText && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-400/15 text-cyan-600 dark:text-cyan-400 border border-cyan-400/30">
                                  {badgeText}
                                </span>
                              )}
                              {m.hasPeakPricing && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold border bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-white/10">
                                  Off-Peak
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-[var(--text-muted)]">{m.provider}</span>
                          </div>
                          <button
                            onClick={() => handleCopyModelId(m.modelId)}
                            className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border shrink-0 transition-all cursor-pointer",
                              copiedModelId === m.modelId
                                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/40"
                                : "border-[var(--border-primary)] text-[var(--text-secondary)] hover:border-cyan-500"
                            )}
                          >
                            {copiedModelId === m.modelId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedModelId === m.modelId ? "Copied" : "Copy ID"}</span>
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-2 text-xs min-w-0">
                          <code className="font-mono text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 truncate">
                            {m.modelId}
                          </code>
                          <span className="font-mono text-[11px] text-[var(--text-muted)] shrink-0">
                            Context: {m.contextWindow || "128K"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap pt-0.5">
                          {getModelCapabilities(m.modelId).map((cap) => (
                            <span
                              key={cap}
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors bg-slate-100 dark:bg-zinc-800/80 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700/50"
                            >
                              {cap}
                            </span>
                          ))}
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono text-xs">
                          <div className="p-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)] min-w-0">
                            <div className="text-[10px] text-[var(--text-muted)] font-sans uppercase truncate">Input / 1M</div>
                            {m.originalInputPricePer1M && m.originalInputPricePer1M > m.inputPricePer1M && (
                              <span className="text-[10px] font-normal line-through text-zinc-400 dark:text-zinc-500 block truncate">
                                {formatRupiah(m.originalInputPricePer1M)}
                              </span>
                            )}
                            <div className="font-semibold text-cyan-600 dark:text-cyan-400 truncate">{formatRupiah(m.inputPricePer1M)}</div>
                          </div>
                          <div className="p-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)] min-w-0">
                            <div className="text-[10px] text-[var(--text-muted)] font-sans uppercase truncate">Cache / 1M</div>
                            {m.originalCachePricePer1M && m.originalCachePricePer1M > m.cachePricePer1M && (
                              <span className="text-[10px] font-normal line-through text-zinc-400 dark:text-zinc-500 block truncate">
                                {formatRupiah(m.originalCachePricePer1M)}
                              </span>
                            )}
                            <div className="font-semibold text-cyan-600 dark:text-cyan-400 truncate">{formatRupiah(m.cachePricePer1M)}</div>
                          </div>
                          <div className="p-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)] min-w-0">
                            <div className="text-[10px] text-[var(--text-muted)] font-sans uppercase truncate">Output / 1M</div>
                            {m.originalOutputPricePer1M && m.originalOutputPricePer1M > m.outputPricePer1M && (
                              <span className="text-[10px] font-normal line-through text-zinc-400 dark:text-zinc-500 block truncate">
                                {formatRupiah(m.originalOutputPricePer1M)}
                              </span>
                            )}
                            <div className="font-bold text-cyan-600 dark:text-cyan-400 truncate">{formatRupiah(m.outputPricePer1M)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 p-3.5 sm:p-5">
                {paginatedImageModels.map((img) => (
                  <div
                    key={img.modelId}
                    className="p-3.5 sm:p-4 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)]/30 flex flex-col justify-between hover:border-cyan-500/40 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">
                          {img.name}
                        </h4>
                        <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400 shrink-0">
                          {formatRupiah(img.basePriceRp)} / img
                        </span>
                      </div>
                      <code className="text-[11px] font-mono text-[var(--text-muted)] block mb-2 break-all bg-[var(--surface)] px-1.5 py-0.5 rounded border border-[var(--border-primary)] w-fit">
                        {img.modelId}
                      </code>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3">
                        {img.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[var(--border-primary)] text-[11px] text-[var(--text-muted)]">
                      <span className="truncate">Sizes: {img.sizes.join(", ")}</span>
                      <button
                        onClick={() => handleCopyModelId(img.modelId)}
                        className="text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer font-medium shrink-0 ml-2"
                      >
                        {copiedModelId === img.modelId ? "Copied!" : "Copy ID"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {currentTotal === 0 && (
              <div className="py-14 px-4 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mx-auto border border-cyan-500/20">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">No models found</h3>
                <p className="text-xs text-[var(--text-secondary)] dark:text-zinc-400 max-w-sm mx-auto">
                  No models matching <span className="font-semibold text-cyan-600 dark:text-cyan-400">"{modelSearch}"</span> in category{" "}
                  <span className="capitalize">{selectedProvider}</span>.
                </p>
                <button
                  onClick={() => {
                    setModelSearch("");
                    setSelectedProvider("all");
                    setCurrentPage(1);
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-400 text-slate-950 hover:bg-cyan-300 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset Filters
                </button>
              </div>
            )}

            {/* Pagination Controls */}
            {currentTotal > 0 && (
              <div className="p-3.5 sm:p-4 border-t border-[var(--border-primary)] dark:border-white/10 bg-[var(--surface-secondary)]/40 dark:bg-[#0c0d14] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                {/* Left: Range Info */}
                <div className="text-[var(--text-secondary)] dark:text-zinc-400 text-center sm:text-left">
                  Showing <span className="font-bold text-[var(--text-primary)] dark:text-white">{startItem}</span> to{" "}
                  <span className="font-bold text-[var(--text-primary)] dark:text-white">{endItem}</span> of{" "}
                  <span className="font-bold text-[var(--text-primary)] dark:text-white">{currentTotal}</span>{" "}
                  {modelTypeTab === "chat" ? "chat models" : "image models"}
                </div>

                {/* Right: Page Size & Nav */}
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  <div className="flex items-center gap-1.5 text-[var(--text-secondary)] dark:text-zinc-400">
                    <span className="hidden xs:inline">Show:</span>
                    <div className="w-24">
                      <Select
                        value={pageSize}
                        onChange={(val) => {
                          setPageSize(Number(val));
                          setCurrentPage(1);
                        }}
                        options={[
                          { value: 10, label: "10" },
                          { value: 20, label: "20" },
                          { value: 50, label: "50" },
                          { value: -1, label: `All (${currentTotal})` },
                        ]}
                        direction="up"
                        className="py-1 px-2.5 text-xs font-semibold rounded-lg"
                      />
                    </div>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden max-w-full py-0.5">
                      <button
                        onClick={() => handlePageChange(safePage - 1)}
                        disabled={safePage === 1}
                        className="p-1.5 rounded-lg border border-[var(--border-primary)] dark:border-white/10 bg-[var(--surface)] dark:bg-[#14151f] text-[var(--text-secondary)] dark:text-zinc-400 hover:text-[var(--text-primary)] dark:hover:text-white hover:border-cyan-500 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                        title="Previous page"
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center gap-1">
                        {pageNumbers.map((p, idx) => {
                          if (p === "...") {
                            return (
                              <span key={`ellipsis-${idx}`} className="px-1 text-[var(--text-muted)] dark:text-zinc-600 font-mono">
                                ...
                              </span>
                            );
                          }
                          const pageNum = Number(p);
                          const isActive = pageNum === safePage;
                          return (
                            <button
                              key={`page-${pageNum}`}
                              onClick={() => handlePageChange(pageNum)}
                              className={cn(
                                "min-w-[28px] h-7 px-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border",
                                isActive
                                  ? "bg-cyan-400 border-cyan-400 text-slate-950 shadow-xs font-black ring-1 ring-cyan-300/40"
                                  : "border-[var(--border-primary)] dark:border-white/10 bg-[var(--surface)] dark:bg-[#14151f] text-[var(--text-secondary)] dark:text-zinc-400 hover:border-cyan-500 hover:text-[var(--text-primary)] dark:hover:text-white"
                              )}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => handlePageChange(safePage + 1)}
                        disabled={safePage === totalPages}
                        className="p-1.5 rounded-lg border border-[var(--border-primary)] dark:border-white/10 bg-[var(--surface)] dark:bg-[#14151f] text-[var(--text-secondary)] dark:text-zinc-400 hover:text-[var(--text-primary)] dark:hover:text-white hover:border-cyan-500 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                        title="Next page"
                        aria-label="Next page"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── 4. INTERACTIVE TOKEN COST ESTIMATOR ──────────────────────────── */}
        <section id="calculator" className="scroll-mt-24 py-10 sm:py-14 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              TOKEN COST ESTIMATOR
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Pay-As-You-Go Token Cost Calculator
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed">
              Drag the sliders to estimate real token consumption. See how much you save with Pay-As-You-Go Rupiah billing.
            </p>
          </div>

          <div className="rounded-2xl sm:rounded-3xl border border-[var(--border-primary)] bg-[var(--surface)] p-4 sm:p-8 lg:p-12 shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
            {/* Left Controls */}
            <div className="lg:col-span-7 space-y-5 sm:space-y-6">
              {/* Model Picker */}
              <div>
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  <Cpu className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                  <span>Select AI Model</span>
                </label>
                <Select
                  value={calcModelId}
                  onChange={(val) => setCalcModelId(String(val))}
                  options={calcModelOptions}
                  placeholder="Select AI Model..."
                  className="py-2.5 sm:py-3 text-xs sm:text-sm font-semibold rounded-xl"
                />
              </div>

              {/* Sliders */}
              <div className="space-y-4 sm:space-y-5">
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                    <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <Terminal className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                      <span>Avg. Prompt Tokens per Request</span>
                    </span>
                    <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-[11px] sm:text-xs">
                      {promptTokens.toLocaleString()} tokens
                    </span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="30000"
                    step="200"
                    value={promptTokens}
                    onChange={(e) => setPromptTokens(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                    <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                      <span>Avg. Completion Tokens per Request</span>
                    </span>
                    <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-[11px] sm:text-xs">
                      {completionTokens.toLocaleString()} tokens
                    </span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="10000"
                    step="100"
                    value={completionTokens}
                    onChange={(e) => setCompletionTokens(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                    <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <Activity className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                      <span>Estimated Requests per Month</span>
                    </span>
                    <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-[11px] sm:text-xs">
                      {monthlyRequests.toLocaleString()} calls
                    </span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="50000"
                    step="100"
                    value={monthlyRequests}
                    onChange={(e) => setMonthlyRequests(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Right Result Card */}
            <div className="lg:col-span-5">
              <div className="p-5 sm:p-6 lg:p-8 rounded-2xl border border-cyan-500/30 bg-[var(--surface-secondary)] text-center space-y-4 sm:space-y-6 shadow-xl">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">
                    ESTIMATED MONTHLY COST
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-cyan-600 dark:text-cyan-400 font-mono tracking-tight">
                    {formatRupiah(monthlyTotalRp)}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-1">
                    approx. {formatRupiah(costPerRequestRp)} per API call
                  </div>
                </div>

                <div className="p-3.5 sm:p-4 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] text-left space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-muted)]">Model Selected</span>
                    <span className="font-semibold text-[var(--text-primary)]">{activeCalcModel.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-muted)]">Total Monthly Tokens</span>
                    <span className="font-mono font-bold text-[var(--text-primary)]">
                      {((promptTokens + completionTokens) * monthlyRequests).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-muted)]">Failed Request Cost</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">Rp 0 (Guaranteed)</span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  href="/dashboard/ai-gateway"
                  className="w-full justify-center"
                >
                  Top Up &amp; Start Querying
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. ENTERPRISE CAPABILITIES GRID ─────────────────────────────── */}
        <section className="py-10 sm:py-14 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              ENTERPRISE CAPABILITIES
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Everything Your AI Infrastructure Requires
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Terminal, title: "100% OpenAI Drop-In", desc: "No migration rewrite needed. Use existing OpenAI SDKs, LangChain, or Cursor." },
              { icon: Zap, title: "Sub-Millisecond Edge Routing", desc: "In-memory proxy routing prompts directly to optimal upstream clusters." },
              { icon: ShieldCheck, title: "Strict Zero Data Retention", desc: "Your proprietary code and prompts are never stored to train AI models." },
              { icon: Coins, title: "Zero Markup Rupiah PAYG", desc: "Clear IDR token rates without hidden currency conversions or bank surcharges." },
              { icon: KeyRound, title: "Scoped API Keys", desc: "Restrict tokens to specific models and enforce hard monthly spending budgets." },
              { icon: RefreshCw, title: "Auto-Failover Resilience", desc: "Automated retries across global nodes ensure 99.9% inference availability." },
              { icon: Activity, title: "Real-Time Usage Telemetry", desc: "Inspect exact prompt tokens, completion tokens, latency, and costs in real time." },
              { icon: Bot, title: "Multi-Model Orchestration", desc: "Switch seamlessly between reasoning, coding, and fast flash models with one key." },
            ].map((feat, i) => (
              <FadeIn key={i} delay={i * 0.05} direction="up" className="h-full">
                <div className="p-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 transition-colors flex flex-col justify-between h-full shadow-sm">
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-4">
                      <feat.icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">
                      {feat.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── 6. HOW IT WORKS SECTION (Provisioning Workflow 3 Steps) ─────── */}
        <section className="py-10 sm:py-14 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              GETTING STARTED
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Start Querying 70+ Models in 3 Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative items-stretch">
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-[2px] bg-slate-200 dark:bg-white/10 overflow-hidden rounded-full">
              <AnimatedBeam />
            </div>

            {[
              {
                step: "01",
                title: "Generate API Key",
                desc: "Create a universal Masdika AI Bearer token and optionally scope it to specific models.",
              },
              {
                step: "02",
                title: "Top Up Balance",
                desc: "Deposit starting from Rp 10.000 via QRIS or automated gateway. No expiring token bundles.",
              },
              {
                step: "03",
                title: "Point baseURL & Stream",
                desc: "Set baseURL to https://www.masdika.id/api/ai/openai/v1 in Cursor, Aider, Python, or Node.js.",
              },
            ].map((st, i) => (
              <FadeIn key={i} delay={i * 0.15} direction="up" className="h-full">
                <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-8 text-center shadow-sm hover:border-cyan-500/40 transition-all duration-300 h-full flex flex-col justify-between relative z-10 group">
                  <div>
                    <div className="w-20 h-20 mx-auto rounded-full bg-[var(--surface-secondary)] border border-[var(--border-primary)] flex items-center justify-center mb-6 relative group-hover:scale-110 transition-transform duration-300">
                      <OrbitalRings />
                      <span className="relative z-10 text-3xl font-black bg-gradient-to-br from-cyan-600 to-cyan-400 bg-clip-text text-transparent">
                        {st.step}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">
                      {st.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      {st.desc}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── 7. PROVISIONING SECTION (Live Inference Pipeline Visualizer) ── */}
        <ProvisioningSection
          subtitle="REAL-TIME INFERENCE PIPELINE"
          title="Edge Routing With Sub-Millisecond Overhead"
          description="Every prompt is cryptographically validated at the edge, token-metered in real time, and streamed via low-latency Server-Sent Events with zero data retention."
          buttonText="Open AI Gateway Panel"
          buttonHref="/dashboard/ai-gateway"
          logs={AI_TERMINAL_LOGS}
          stats={AI_TERMINAL_STATS}
          terminalTitle="MASDIKA AI STREAM ROUTER"
          iconType="api-hub"
          targetServer="Masdika Edge Gateway • Sidoarjo Cluster"
          provisionEstimate="Latency: Sub-ms Proxy + Instant TTFT"
        />

        {/* ── 8. FINAL CTA SECTION ────────────────────────────────────────── */}
        <section className="py-10 sm:py-14 relative z-10 w-full">
          <div className="relative rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-10 md:p-16 text-center shadow-xl overflow-hidden w-full">
            <div className="relative z-10 max-w-2xl mx-auto">
              <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
                START BUILDING TODAY
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-tight mb-4">
                Build Smarter Apps With Universal AI Inference
              </h2>
              <p className="text-base sm:text-lg text-[var(--text-secondary)] mb-8 leading-relaxed">
                Generate an API key, top up your AI balance starting from Rp 10.000, and query 70+ state-of-the-art AI models today.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href="/dashboard/ai-gateway"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Get Your API Key
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href="/register"
                >
                  Create Account
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ── 9. FAQ SECTION ──────────────────────────────────────────────── */}
        <FaqSection faqs={AI_FAQS} />

      </div>
    </div>
  );
}
