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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HeroAvatarFrame } from "@/components/ui/HeroAvatarFrame";
import { FadeIn } from "@/components/animations/FadeIn";
import { AnimatedBeam, OrbitalRings } from "@/components/animations/DeploymentAnimations";
import { ProvisioningSection } from "@/components/ui/ProvisioningSection";
import { FaqSection } from "@/components/ui/FaqSection";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/billing";

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
  const [modelSearch, setModelSearch] = useState("");
  const [copiedModelId, setCopiedModelId] = useState<string | null>(null);

  // Calculator state
  const [calcModelId, setCalcModelId] = useState("qwen3.7-flash");
  const [promptTokens, setPromptTokens] = useState(2000);
  const [completionTokens, setCompletionTokens] = useState(800);
  const [monthlyRequests, setMonthlyRequests] = useState(2500);

  // Fallback chat models if database empty
  const allChatModels: AiModelItem[] = useMemo(() => {
    if (chatModels && chatModels.length > 0) return chatModels;
    return [
      { modelId: "qwen3.7-flash", name: "Qwen 3.7 Flash", provider: "Qwen", contextWindow: "128K", inputPricePer1M: 1500, cachePricePer1M: 750, outputPricePer1M: 4500, discountBadge: "Fast & Cheap" },
      { modelId: "deepseek-v3", name: "DeepSeek V3", provider: "DeepSeek", contextWindow: "64K", inputPricePer1M: 4500, cachePricePer1M: 1500, outputPricePer1M: 18000, discountBadge: "Cost Leader" },
      { modelId: "deepseek-r1", name: "DeepSeek R1", provider: "DeepSeek", contextWindow: "64K", inputPricePer1M: 15000, cachePricePer1M: 5000, outputPricePer1M: 60000, discountBadge: "Deep Reasoning" },
      { modelId: "claude-3-7-sonnet", name: "Claude 3.7 Sonnet", provider: "Anthropic", contextWindow: "200K", inputPricePer1M: 48000, cachePricePer1M: 4800, outputPricePer1M: 240000, discountBadge: "Top Coding" },
      { modelId: "claude-3-5-haiku", name: "Claude 3.5 Haiku", provider: "Anthropic", contextWindow: "200K", inputPricePer1M: 16000, cachePricePer1M: 1600, outputPricePer1M: 80000 },
      { modelId: "gpt-4o", name: "OpenAI GPT-4o", provider: "OpenAI", contextWindow: "128K", inputPricePer1M: 40000, cachePricePer1M: 20000, outputPricePer1M: 160000 },
      { modelId: "gpt-4o-mini", name: "OpenAI GPT-4o Mini", provider: "OpenAI", contextWindow: "128K", inputPricePer1M: 2500, cachePricePer1M: 1250, outputPricePer1M: 10000 },
      { modelId: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "Google", contextWindow: "1M", inputPricePer1M: 2500, cachePricePer1M: 625, outputPricePer1M: 10000, discountBadge: "1M Context" },
      { modelId: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "Google", contextWindow: "2M", inputPricePer1M: 20000, cachePricePer1M: 5000, outputPricePer1M: 80000 },
      { modelId: "llama-3.3-70b", name: "Meta Llama 3.3 70B", provider: "Meta", contextWindow: "128K", inputPricePer1M: 8000, cachePricePer1M: 2500, outputPricePer1M: 24000 },
      { modelId: "minimax-01", name: "MiniMax-01", provider: "MiniMax", contextWindow: "1M", inputPricePer1M: 4000, cachePricePer1M: 1000, outputPricePer1M: 18000 },
      { modelId: "glm-5.3", name: "GLM-5.3 Turbo", provider: "Zhipu", contextWindow: "128K", inputPricePer1M: 5000, cachePricePer1M: 1500, outputPricePer1M: 20000 },
    ];
  }, [chatModels]);

  const providers = useMemo(() => {
    const set = new Set<string>();
    allChatModels.forEach((m) => set.add(m.provider));
    return ["all", ...Array.from(set)];
  }, [allChatModels]);

  const filteredChatModels = useMemo(() => {
    return allChatModels.filter((m) => {
      const matchProvider = selectedProvider === "all" || m.provider.toLowerCase() === selectedProvider.toLowerCase();
      const q = modelSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.modelId.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q);
      return matchProvider && matchSearch;
    });
  }, [allChatModels, selectedProvider, modelSearch]);

  const filteredImageModels = useMemo(() => {
    const q = modelSearch.toLowerCase().trim();
    if (!q) return imageModels;
    return imageModels.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.modelId.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q))
    );
  }, [imageModels, modelSearch]);

  // Current calculator model
  const activeCalcModel = useMemo(() => {
    return allChatModels.find((m) => m.modelId === calcModelId) || allChatModels[0];
  }, [allChatModels, calcModelId]);

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

            {/* Right – Hero Avatar (ai-gateway.webp) with 4 Floating Badges */}
            <div className="relative flex items-center justify-center mt-6 lg:mt-0 lg:self-center">
              <HeroAvatarFrame
                imageSrc="/images/mascots/ai-gateway.webp"
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

              {/* Right: macOS-style Code Snippet Window */}
              <div className="lg:col-span-7">
                <div className="w-full rounded-2xl border border-white/10 dark:border-[var(--border-primary)] bg-[#0d0e15] text-slate-100 shadow-2xl overflow-hidden ring-1 ring-white/5">
                  {/* macOS Window Titlebar */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-[#14151f] gap-3 select-none">
                    {/* macOS Traffic Light Buttons (Close, Minimize, Expand) */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]/80 shadow-xs inline-block" />
                      <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]/80 shadow-xs inline-block" />
                      <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]/80 shadow-xs inline-block" />
                    </div>

                    {/* Tabs / Switcher */}
                    <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex-1 px-1 sm:px-2">
                      {CODE_EXAMPLES.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setActiveCodeTab(c.id)}
                          className={cn(
                            "px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                            activeCodeTab === c.id
                              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs"
                              : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                          )}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>

                    {/* Copy Button */}
                    <button
                      onClick={() => handleCopyCode(currentCode.code)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-cyan-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer shrink-0"
                      title="Copy code to clipboard"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? "Copied!" : "Copy"}</span>
                    </button>
                  </div>

                  {/* Code Area with Line Numbers (Clean, Hidden Scrollbars, No Bottom Status Bar) */}
                  <div className="p-4 sm:p-5 flex text-xs font-mono overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden leading-relaxed bg-[#0a0b10]">
                    <div className="select-none pr-4 text-right text-zinc-600 font-mono text-xs border-r border-white/[0.08] space-y-0.5 min-w-[2.2rem] shrink-0">
                      {currentCode.code.split("\n").map((_, i) => (
                        <div key={i}>{i + 1}</div>
                      ))}
                    </div>
                    <pre className="pl-4 font-mono text-xs text-zinc-200 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden leading-relaxed flex-1">
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
            <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed">
              No hidden foreign exchange markups or minimum billing brackets. Filter through 70+ text and image models.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] shadow-xl overflow-hidden">
            {/* Control Bar: Model Type, Provider Pills & Search */}
            <div className="p-4 border-b border-[var(--border-primary)] bg-[var(--surface-secondary)]/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModelTypeTab("chat")}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2",
                    modelTypeTab === "chat"
                      ? "bg-cyan-400 text-slate-950 shadow-xs"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Chat &amp; Reasoning Models ({allChatModels.length})</span>
                </button>
                <button
                  onClick={() => setModelTypeTab("image")}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2",
                    modelTypeTab === "image"
                      ? "bg-cyan-400 text-slate-950 shadow-xs"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Image Models ({imageModels.length})</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {modelTypeTab === "chat" && (
                  <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
                    {providers.slice(0, 7).map((p) => (
                      <button
                        key={p}
                        onClick={() => setSelectedProvider(p)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer whitespace-nowrap",
                          selectedProvider === p
                            ? "bg-cyan-500/20 text-cyan-500 dark:text-cyan-300 border border-cyan-500/40"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
                <div className="relative min-w-[220px]">
                  <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    placeholder="Search model ID or name..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)] outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Models Table */}
            {modelTypeTab === "chat" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] font-bold uppercase tracking-wider border-b border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-muted)]">
                    <tr>
                      <th className="px-5 py-3.5">Model Name</th>
                      <th className="px-4 py-3.5">Model ID</th>
                      <th className="px-4 py-3.5">Context</th>
                      <th className="px-4 py-3.5">Input / 1M</th>
                      <th className="px-4 py-3.5">Cache Read / 1M</th>
                      <th className="px-4 py-3.5">Output / 1M</th>
                      <th className="px-4 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-primary)]">
                    {filteredChatModels.map((m) => (
                      <tr
                        key={m.modelId}
                        className="hover:bg-[var(--surface-secondary)]/40 transition-colors"
                      >
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="font-bold flex items-center gap-2">
                            <span className="text-[var(--text-primary)]">{m.name}</span>
                            {m.discountBadge && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                {m.discountBadge}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)]">{m.provider}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <code className="font-mono text-cyan-600 dark:text-cyan-400 text-xs font-semibold">{m.modelId}</code>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap font-mono text-[var(--text-secondary)]">
                          {m.contextWindow || "128K"}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatRupiah(m.inputPricePer1M)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap font-mono text-cyan-600 dark:text-cyan-400">
                          {formatRupiah(m.cachePricePer1M)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap font-mono font-bold text-sky-600 dark:text-sky-400">
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
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
                {filteredImageModels.map((img) => (
                  <div
                    key={img.modelId}
                    className="p-4 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)]/30 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-bold text-[var(--text-primary)]">
                          {img.name}
                        </h4>
                        <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400">
                          {formatRupiah(img.basePriceRp)} / img
                        </span>
                      </div>
                      <code className="text-[11px] font-mono text-[var(--text-muted)] block mb-2">{img.modelId}</code>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3">
                        {img.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[var(--border-primary)] text-[11px] text-[var(--text-muted)]">
                      <span>Sizes: {img.sizes.join(", ")}</span>
                      <button
                        onClick={() => handleCopyModelId(img.modelId)}
                        className="text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer font-medium"
                      >
                        {copiedModelId === img.modelId ? "Copied!" : "Copy ID"}
                      </button>
                    </div>
                  </div>
                ))}
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

          <div className="rounded-2xl sm:rounded-3xl border border-[var(--border-primary)] bg-[var(--surface)] p-6 sm:p-10 md:p-12 shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Controls */}
            <div className="lg:col-span-7 space-y-6">
              {/* Model Picker */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">
                  Select AI Model
                </label>
                <select
                  value={calcModelId}
                  onChange={(e) => setCalcModelId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-primary)] outline-none font-semibold transition-colors cursor-pointer focus:border-cyan-500"
                >
                  {allChatModels.map((m) => (
                    <option key={m.modelId} value={m.modelId}>
                      {m.name} ({m.provider}) • Input {formatRupiah(m.inputPricePer1M)}/1M, Output {formatRupiah(m.outputPricePer1M)}/1M
                    </option>
                  ))}
                </select>
              </div>

              {/* Sliders */}
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <span className="text-[var(--text-secondary)]">Avg. Prompt Tokens per Request</span>
                    <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{promptTokens.toLocaleString()} tokens</span>
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
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <span className="text-[var(--text-secondary)]">Avg. Completion Tokens per Request</span>
                    <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{completionTokens.toLocaleString()} tokens</span>
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
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <span className="text-[var(--text-secondary)]">Estimated Requests per Month</span>
                    <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{monthlyRequests.toLocaleString()} calls</span>
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
              <div className="p-6 sm:p-8 rounded-2xl border border-cyan-500/30 bg-[var(--surface-secondary)] text-center space-y-6 shadow-xl">
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

                <div className="p-4 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] text-left space-y-2 text-xs">
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
