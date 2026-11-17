"use client";

import { useState, useMemo, useId } from "react";
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
  Sliders,
  Search,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Coins,
  Activity,
  CodeXml,
  Boxes,
  HelpCircle,
  TrendingDown,
  ArrowUpRight,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { HeroAvatarFrame } from "@/components/ui/HeroAvatarFrame";
import { FadeIn } from "@/components/animations/FadeIn";
import { ProvisioningSection } from "@/components/ui/ProvisioningSection";
import { FaqSection } from "@/components/ui/FaqSection";
import { useTheme } from "@/components/ThemeProvider";
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
    language: "yaml",
    code: `# In Cursor: Settings -> Models -> OpenAI API Key
# 1. Override Base URL:
https://www.masdika.id/api/ai/openai/v1

# 2. Enter API Key:
masdika_ai_YOUR_SECRET_KEY

# 3. Add Custom Models:
claude-3-7-sonnet
deepseek-r1
qwen3.7-flash
gpt-4o

# In Aider CLI:
export OPENAI_API_BASE="https://www.masdika.id/api/ai/openai/v1"
export OPENAI_API_KEY="masdika_ai_YOUR_KEY"
aider --model openai/claude-3-7-sonnet`,
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
  const { theme } = useTheme();
  const isDark = theme === "dark";

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
      const matchSearch = !q || m.name.toLowerCase().includes(q) || m.modelId.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q);
      return matchProvider && matchSearch;
    });
  }, [allChatModels, selectedProvider, modelSearch]);

  const filteredImageModels = useMemo(() => {
    const q = modelSearch.toLowerCase().trim();
    if (!q) return imageModels;
    return imageModels.filter((m) => m.name.toLowerCase().includes(q) || m.modelId.toLowerCase().includes(q) || (m.description && m.description.toLowerCase().includes(q)));
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
    <div className="relative w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-16 sm:space-y-24">
        {/* ── 0. HERO SECTION ──────────────────────────────────────────────── */}
        <section className="relative pt-0 pb-6 sm:pb-10 flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-start w-full">
            {/* Left: Headline & Code Showcase */}
            <div className="flex flex-col items-start text-left z-10">
              <FadeIn delay={0.05}>
                <div
                  className={cn(
                    "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold tracking-widest uppercase mb-6 shadow-xs",
                    isDark ? "border-cyan-800/80 bg-cyan-950/30 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700"
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>UNIFIED AI INFERENCE GATEWAY</span>
                </div>
              </FadeIn>

              <FadeIn delay={0.1}>
                <h1
                  className={cn(
                    "text-3xl sm:text-4xl md:text-5xl lg:text-[46px] font-black tracking-tight leading-[1.12] mb-5",
                    isDark ? "text-white" : "text-slate-900"
                  )}
                >
                  One Universal Key.{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500">
                    70+ Frontier AI Models.
                  </span>{" "}
                  100% Rupiah Pay-As-You-Go.
                </h1>
              </FadeIn>

              <FadeIn delay={0.15}>
                <p
                  className={cn(
                    "text-base sm:text-lg mb-8 leading-relaxed max-w-xl font-normal",
                    isDark ? "text-zinc-300" : "text-slate-600"
                  )}
                >
                  Drop-in OpenAI compatible gateway routing your prompts to Claude 3.7, GPT-4o, Gemini 2.5, DeepSeek R1, and Qwen 3.7 with sub-millisecond edge latency and zero expired token bundles.
                </p>
              </FadeIn>

              <FadeIn delay={0.2} className="w-full">
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-8">
                  <Link
                    href="/dashboard/ai-gateway"
                    className="inline-flex items-center gap-2 font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-500/20 rounded-xl px-6 py-3.5 text-sm sm:text-base transition-colors"
                  >
                    <span>Get API Key</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <a
                    href="#models"
                    className={cn(
                      "inline-flex items-center gap-2 font-semibold rounded-xl px-5 py-3.5 text-sm sm:text-base border transition-colors",
                      isDark
                        ? "border-white/10 hover:border-cyan-500/50 hover:bg-white/5 text-zinc-200"
                        : "border-slate-200 hover:border-cyan-500 hover:bg-slate-100 text-slate-700"
                    )}
                  >
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    <span>Explore 70+ Models</span>
                  </a>
                </div>
              </FadeIn>

              {/* Code Snippet Switcher Box */}
              <FadeIn delay={0.25} className="w-full">
                <div
                  className={cn(
                    "w-full rounded-2xl border shadow-xl overflow-hidden",
                    isDark ? "bg-[#0c0c10] border-white/[0.08]" : "bg-slate-900 border-slate-800 text-slate-100"
                  )}
                >
                  <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/[0.08] bg-black/30">
                    <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
                      {CODE_EXAMPLES.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setActiveCodeTab(c.id)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                            activeCodeTab === c.id
                              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                              : "text-zinc-400 hover:text-zinc-200"
                          )}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => handleCopyCode(currentCode.code)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-zinc-400 hover:text-cyan-300 transition-colors cursor-pointer"
                      title="Copy code snippet"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-zinc-200 overflow-x-auto leading-relaxed max-h-56">
                    <code>{currentCode.code}</code>
                  </pre>
                </div>
              </FadeIn>
            </div>

            {/* Right: Hero Mascot Illustration Frame */}
            <div className="relative flex items-center justify-center mt-4 lg:mt-0 lg:self-center">
              <HeroAvatarFrame
                imageSrc="/images/mascots/ai-gateway.webp"
                imageAlt="Masdika AI Gateway - Unified OpenAI-Compatible Router"
                imageWidth={1240}
                imageHeight={1268}
                badges={[
                  { icon: Sparkles, label: "MODELS", value: "70+ Live LLMs" },
                  { icon: Terminal, label: "COMPATIBILITY", value: "OpenAI Drop-In" },
                  { icon: Zap, label: "LATENCY", value: "Sub-ms Edge Proxy" },
                  { icon: ShieldCheck, label: "PRIVACY", value: "Zero Data Training" },
                ]}
              />
            </div>
          </div>
        </section>

        {/* ── 1. VALUE PILLARS (4 Trust Highlights) ────────────────────────── */}
        <section className="py-6 sm:py-10 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {[
              {
                icon: Terminal,
                title: "100% OpenAI Drop-in",
                desc: "Switch baseURL to masdika.id/api/ai/openai/v1. Works seamlessly with Cursor, Aider, LangChain, and official OpenAI SDKs.",
                badge: "Zero Rewrite",
              },
              {
                icon: Sparkles,
                title: "70+ Frontier Models",
                desc: "Direct access to Claude 3.7 Sonnet, GPT-4o, Gemini 2.5 Flash & Pro, DeepSeek R1/V3, Qwen 3.7, and Kling Image generators.",
                badge: "All-in-One",
              },
              {
                icon: Coins,
                title: "Rupiah Pay-As-You-Go",
                desc: "Pay per exact prompt and completion token from your AI Balance. No monthly lock-ins, and failed requests cost exactly Rp 0.",
                badge: "Rp 0 Failed Calls",
              },
              {
                icon: Lock,
                title: "Zero Training Retention",
                desc: "Enterprise data privacy: your prompts and generated output pass through volatile memory and are never stored to train models.",
                badge: "100% Confidential",
              },
            ].map((p, i) => (
              <FadeIn key={i} delay={0.08 * i}>
                <div
                  className={cn(
                    "h-full p-6 rounded-2xl border flex flex-col justify-between transition-all group hover:border-cyan-500/50 shadow-sm",
                    isDark ? "bg-[var(--surface)] border-[var(--border-primary)]" : "bg-white border-slate-200"
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl border flex items-center justify-center transition-colors group-hover:bg-cyan-500/20 group-hover:border-cyan-500/40",
                          isDark ? "bg-cyan-500/10 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700"
                        )}
                      >
                        <p.icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {p.badge}
                      </span>
                    </div>
                    <h3 className={cn("text-base font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>
                      {p.title}
                    </h3>
                    <p className={cn("text-xs sm:text-sm leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>
                      {p.desc}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── 2. FRONTIER MODEL DIRECTORY & PRICING TABLE ──────────────────── */}
        <section id="models" className="scroll-mt-24 py-6 sm:py-10 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
            <div
              className={cn(
                "inline-flex items-center gap-2 px-3.5 py-1 rounded-full border text-[11px] font-bold tracking-widest uppercase mb-4 shadow-xs",
                isDark ? "border-cyan-800/80 bg-cyan-950/30 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600"
              )}
            >
              MODEL CATALOG & PRICING
            </div>
            <h2 className={cn("text-3xl sm:text-4xl font-black mb-3", isDark ? "text-white" : "text-slate-900")}>
              Transparent Token Pricing in Rupiah
            </h2>
            <p className={cn("text-sm sm:text-base leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>
              No hidden foreign exchange markups or minimum billing brackets. Filter through 70+ text and image models.
            </p>
          </div>

          <div
            className={cn(
              "rounded-2xl border shadow-xl overflow-hidden",
              isDark ? "bg-[var(--surface)] border-[var(--border-primary)]" : "bg-white border-slate-200"
            )}
          >
            {/* Control Bar: Model Type, Provider Pills & Search */}
            <div
              className={cn(
                "p-4 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-4",
                isDark ? "border-white/[0.08]" : "border-slate-200"
              )}
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModelTypeTab("chat")}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2",
                    modelTypeTab === "chat"
                      ? "bg-cyan-400 text-slate-950 shadow-xs"
                      : isDark
                      ? "text-zinc-400 hover:text-white"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Chat & Reasoning Models ({allChatModels.length})</span>
                </button>
                <button
                  onClick={() => setModelTypeTab("image")}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2",
                    modelTypeTab === "image"
                      ? "bg-cyan-400 text-slate-950 shadow-xs"
                      : isDark
                      ? "text-zinc-400 hover:text-white"
                      : "text-slate-600 hover:text-slate-900"
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
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                            : isDark
                            ? "text-zinc-400 hover:text-zinc-200"
                            : "text-slate-600 hover:text-slate-900"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
                <div className="relative min-w-[220px]">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    placeholder="Search model ID or name..."
                    className={cn(
                      "w-full pl-8 pr-3 py-1.5 rounded-xl text-xs border outline-none transition-colors",
                      isDark
                        ? "bg-[#0a0a0c] border-white/[0.08] text-white focus:border-cyan-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500"
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Models Table */}
            {modelTypeTab === "chat" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead
                    className={cn(
                      "text-[11px] font-bold uppercase tracking-wider border-b",
                      isDark ? "bg-[#0d0d12] border-white/[0.08] text-zinc-400" : "bg-slate-50 border-slate-200 text-slate-600"
                    )}
                  >
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
                  <tbody className={cn("divide-y", isDark ? "divide-white/[0.06]" : "divide-slate-200")}>
                    {filteredChatModels.map((m) => (
                      <tr
                        key={m.modelId}
                        className={cn(
                          "transition-colors",
                          isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50"
                        )}
                      >
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="font-bold flex items-center gap-2">
                            <span className={isDark ? "text-white" : "text-slate-900"}>{m.name}</span>
                            {m.discountBadge && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {m.discountBadge}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-400">{m.provider}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <code className="font-mono text-cyan-400 text-xs">{m.modelId}</code>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap font-mono text-zinc-400">
                          {m.contextWindow || "128K"}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap font-mono font-semibold text-emerald-400">
                          {formatRupiah(m.inputPricePer1M)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap font-mono text-cyan-400">
                          {formatRupiah(m.cachePricePer1M)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap font-mono font-bold text-sky-400">
                          {formatRupiah(m.outputPricePer1M)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleCopyModelId(m.modelId)}
                            className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                              copiedModelId === m.modelId
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                : isDark
                                ? "border-white/10 text-zinc-300 hover:border-cyan-500 hover:text-cyan-300"
                                : "border-slate-200 text-slate-700 hover:border-cyan-500 hover:text-cyan-600"
                            )}
                          >
                            {copiedModelId === m.modelId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
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
                    className={cn(
                      "p-4 rounded-xl border flex flex-col justify-between",
                      isDark ? "bg-[#0c0c10] border-white/[0.08]" : "bg-slate-50 border-slate-200"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-900")}>
                          {img.name}
                        </h4>
                        <span className="font-mono text-xs font-bold text-cyan-400">
                          {formatRupiah(img.basePriceRp)} / img
                        </span>
                      </div>
                      <code className="text-[11px] font-mono text-zinc-400 block mb-2">{img.modelId}</code>
                      <p className={cn("text-xs leading-relaxed mb-3", isDark ? "text-zinc-400" : "text-slate-600")}>
                        {img.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[11px] text-zinc-400">
                      <span>Sizes: {img.sizes.join(", ")}</span>
                      <button
                        onClick={() => handleCopyModelId(img.modelId)}
                        className="text-cyan-400 hover:underline cursor-pointer"
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

        {/* ── 3. INTERACTIVE TOKEN COST ESTIMATOR ───────────────────────────── */}
        <section id="calculator" className="scroll-mt-24 py-6 sm:py-10 relative z-10">
          <div
            className={cn(
              "rounded-2xl border p-6 sm:p-10 shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-8 items-center",
              isDark ? "bg-[var(--surface)] border-[var(--border-primary)]" : "bg-white border-slate-200"
            )}
          >
            {/* Left Controls */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <div
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold tracking-widest uppercase mb-3 shadow-xs",
                    isDark ? "border-cyan-800/80 bg-cyan-950/30 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600"
                  )}
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>TOKEN COST CALCULATOR</span>
                </div>
                <h3 className={cn("text-2xl sm:text-3xl font-black mb-2", isDark ? "text-white" : "text-slate-900")}>
                  Estimate Your Monthly AI Spend
                </h3>
                <p className={cn("text-xs sm:text-sm leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>
                  Drag the sliders to estimate real token consumption. See how much you save with Pay-As-You-Go Rupiah billing.
                </p>
              </div>

              {/* Model Picker */}
              <div>
                <label className={cn("block text-xs font-bold mb-2", isDark ? "text-zinc-300" : "text-slate-700")}>
                  Select AI Model
                </label>
                <select
                  value={calcModelId}
                  onChange={(e) => setCalcModelId(e.target.value)}
                  className={cn(
                    "w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border outline-none font-semibold transition-colors cursor-pointer",
                    isDark ? "bg-[#0a0a0c] border-white/[0.08] text-white focus:border-cyan-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-cyan-500"
                  )}
                >
                  {allChatModels.map((m) => (
                    <option key={m.modelId} value={m.modelId}>
                      {m.name} ({m.provider}) • Input {formatRupiah(m.inputPricePer1M)}/1M, Output {formatRupiah(m.outputPricePer1M)}/1M
                    </option>
                  ))}
                </select>
              </div>

              {/* Sliders */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <span className={isDark ? "text-zinc-300" : "text-slate-700"}>Avg. Prompt Tokens per Request</span>
                    <span className="font-mono text-cyan-400 font-bold">{promptTokens.toLocaleString()} tokens</span>
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
                    <span className={isDark ? "text-zinc-300" : "text-slate-700"}>Avg. Completion Tokens per Request</span>
                    <span className="font-mono text-cyan-400 font-bold">{completionTokens.toLocaleString()} tokens</span>
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
                    <span className={isDark ? "text-zinc-300" : "text-slate-700"}>Estimated Requests per Month</span>
                    <span className="font-mono text-cyan-400 font-bold">{monthlyRequests.toLocaleString()} calls</span>
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
              <div
                className={cn(
                  "p-6 sm:p-8 rounded-2xl border text-center space-y-6 shadow-xl",
                  isDark ? "bg-[#0c0c10] border-cyan-500/30" : "bg-cyan-50/50 border-cyan-200"
                )}
              >
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                    ESTIMATED MONTHLY COST
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-cyan-400 font-mono tracking-tight">
                    {formatRupiah(monthlyTotalRp)}
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">
                    approx. {formatRupiah(costPerRequestRp)} per API call
                  </div>
                </div>

                <div className={cn("p-4 rounded-xl border text-left space-y-2 text-xs", isDark ? "bg-[#141418] border-white/[0.08]" : "bg-white border-cyan-100")}>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Model Selected</span>
                    <span className="font-semibold">{activeCalcModel.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Total Monthly Tokens</span>
                    <span className="font-mono font-bold text-zinc-300">
                      {((promptTokens + completionTokens) * monthlyRequests).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Failed Request Cost</span>
                    <span className="font-mono font-bold text-emerald-400">Rp 0 (Guaranteed)</span>
                  </div>
                </div>

                <Link
                  href="/dashboard/ai-gateway"
                  className="block w-full font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 py-3 rounded-xl shadow-md text-center transition-colors"
                >
                  Top Up & Start Querying
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. LIVE INFERENCE PIPELINE SIMULATOR ──────────────────────────── */}
        <ProvisioningSection
          subtitle="REAL-TIME INFERENCE PIPELINE"
          title="Edge Routing With Sub-Millisecond Overhead"
          description="Every prompt is cryptographically validated at the edge, token-metered in real time, and streamed via low-latency Server-Sent Events with zero retention."
          buttonText="Test in Playground"
          buttonHref="/dashboard/ai-gateway"
          logs={AI_TERMINAL_LOGS}
          stats={AI_TERMINAL_STATS}
          terminalTitle="MASDIKA AI STREAM ROUTER"
          iconType="api-hub"
          targetServer="Masdika Edge Gateway • Sidoarjo Cluster"
          provisionEstimate="Latency: Sub-ms Proxy + Instant TTFT"
        />

        {/* ── 5. FREQUENTLY ASKED QUESTIONS ─────────────────────────────────── */}
        <FaqSection faqs={AI_FAQS} />

        {/* ── 6. FINAL CALL TO ACTION ───────────────────────────────────────── */}
        <section className="py-6 sm:py-10 relative z-10 w-full">
          <div
            className={cn(
              "relative rounded-2xl border p-10 md:p-16 text-center shadow-xl overflow-hidden w-full",
              isDark ? "bg-[var(--surface)] border-[var(--border-primary)]" : "bg-white border-slate-200"
            )}
          >
            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
              <div
                className={cn(
                  "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold tracking-widest uppercase shadow-xs",
                  isDark ? "border-cyan-800/80 bg-cyan-950/30 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700"
                )}
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>START IN UNDER 60 SECONDS</span>
              </div>
              <h2 className={cn("text-3xl sm:text-4xl md:text-5xl font-black leading-tight", isDark ? "text-white" : "text-slate-900")}>
                Build Smarter Apps With Universal AI Inference
              </h2>
              <p className={cn("text-sm sm:text-base leading-relaxed font-normal", isDark ? "text-zinc-300" : "text-slate-600")}>
                Generate an API key, top up your AI balance starting from Rp 10.000, and query 70+ state-of-the-art AI models today.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <Link
                  href="/dashboard/ai-gateway"
                  className="inline-flex items-center gap-2 font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-500/20 rounded-xl px-8 py-3.5 text-sm sm:text-base transition-colors"
                >
                  <span>Generate API Key</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/register"
                  className={cn(
                    "inline-flex items-center font-semibold rounded-xl px-6 py-3.5 text-sm sm:text-base border transition-colors",
                    isDark
                      ? "border-white/10 hover:border-cyan-500/50 hover:bg-white/5 text-zinc-200"
                      : "border-slate-200 hover:border-cyan-500 hover:bg-slate-100 text-slate-700"
                  )}
                >
                  Create Account
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
