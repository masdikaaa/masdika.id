import { Metadata } from "next";
import { OG_IMAGE_PATH } from "@/lib/og-image";
import { prisma } from "@/lib/prisma";
import { getCachedData } from "@/lib/cache";
import { DEFAULT_AI_IMAGE_MODELS, DEFAULT_AI_MODELS, ensureAiModelsExist, getAiGatewayConfig } from "@/lib/ai-gateway";
import AiGatewayClient from "./AiGatewayClient";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: {
    absolute: "AI Gateway - Unified OpenAI-Compatible API with 70+ Frontier AI Models",
  },
  description: "Access 70+ frontier LLMs and image models (Claude 3.7, GPT-4o, Gemini 2.5, DeepSeek R1/V3, Qwen 3.7) with a single OpenAI-compatible API key. Pay-as-you-go per token in Rupiah, sub-millisecond edge routing, and zero data training retention.",
  keywords: [
    "AI Gateway",
    "OpenAI Compatible API",
    "Claude 3.7 Sonnet API",
    "DeepSeek R1 API",
    "DeepSeek V3 API",
    "Qwen 3.7 Flash",
    "LLM Gateway Indonesia",
    "Pay As You Go AI",
    "Masdika AI",
    "AI API Indonesia",
    "ChatGPT API Murah",
    "AI Inference Router",
  ],
  alternates: {
    canonical: "https://www.masdika.id/ai-gateway",
  },
  openGraph: {
    title: "AI Gateway - Unified OpenAI-Compatible API with 70+ Frontier AI Models",
    description: "Access 70+ frontier LLMs and image models with a single OpenAI-compatible API key. Pay-as-you-go per token in Rupiah, sub-millisecond edge routing, and zero training data retention.",
    url: "https://www.masdika.id/ai-gateway",
    siteName: "Masdika",
    images: [
      {
        url: OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: "Masdika AI Gateway - Unified OpenAI-Compatible API",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Gateway - Unified OpenAI-Compatible API with 70+ Frontier AI Models",
    description: "Access 70+ frontier LLMs and image models with a single OpenAI-compatible API key. Pay-as-you-go per token in Rupiah, sub-millisecond edge routing, and zero training data retention.",
    images: [OG_IMAGE_PATH],
  },
};

export default async function AiGatewayLandingPage() {
  const { chatModels, imageModels, isGatewayEnabled } = await getCachedData(
    'pricing:ai_gateway_landing_v2',
    60,
    async () => {
      let models: any[] = [];
      let enabled = true;

      try {
        await ensureAiModelsExist().catch(() => {});
        const [dbModels, config] = await Promise.all([
          prisma.aiModel.findMany({
            where: { isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          }),
          getAiGatewayConfig().catch(() => ({ enabled: true })),
        ]);
        models = dbModels && dbModels.length > 0 ? dbModels : (DEFAULT_AI_MODELS as any);
        enabled = config.enabled !== false;
      } catch {
        models = DEFAULT_AI_MODELS as any;
      }

      return {
        chatModels: models,
        imageModels: DEFAULT_AI_IMAGE_MODELS,
        isGatewayEnabled: enabled,
      };
    }
  );

  const aiJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": "https://www.masdika.id/ai-gateway#product",
        "name": "AI Gateway - Unified OpenAI-Compatible LLM & Image Router",
        "sku": "MASDIKA-AIGW-ID",
        "mpn": "AIGW-01",
        "description": "High-Performance Unified AI Gateway providing drop-in OpenAI compatible routing across 70+ frontier models (Claude 3.7, GPT-4o, Gemini 2.5, DeepSeek R1, Qwen 3.7) with transparent Rupiah Pay-As-You-Go per token pricing.",
        "category": "Cloud Computing > Artificial Intelligence > AI Gateway",
        "image": "https://www.masdika.id/images/mascots/ai-token-gateway.webp",
        "brand": {
          "@type": "Brand",
          "name": "Masdika",
        },
        "offers": {
          "@type": "AggregateOffer",
          "priceCurrency": "IDR",
          "lowPrice": "1",
          "highPrice": "500000",
          "priceValidUntil": "2027-12-31",
          "availability": "https://schema.org/InStock",
          "offerCount": 75,
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.98",
          "reviewCount": "194",
          "bestRating": "5",
          "worstRating": "1",
        },
        "review": [
          {
            "@type": "Review",
            "author": {
              "@type": "Person",
              "name": "Fajar Nugraha",
            },
            "datePublished": "2026-10-15",
            "reviewBody": "Masdika AI Gateway replaced 4 different foreign API provider accounts with just 1 baseURL change. Sub-millisecond latency, zero failed request billing, and paying per token in Rupiah saved our team over 60% on monthly AI compute.",
            "reviewRating": {
              "@type": "Rating",
              "ratingValue": "5",
              "bestRating": "5",
              "worstRating": "1",
            },
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": "https://www.masdika.id/ai-gateway#faq",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How do I use Masdika AI Gateway as an OpenAI drop-in replacement?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Simply set your API baseURL to 'https://www.masdika.id/api/ai/openai/v1' and pass your Masdika secret key ('masdika_ai_...') as the Bearer token. All official OpenAI SDKs in Python, Node.js, Go, LangChain, Vercel AI SDK, Cursor, and Aider work out of the box with zero code changes.",
            },
          },
          {
            "@type": "Question",
            "name": "How does Pay-As-You-Go Rupiah billing work?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "You only pay for exact tokens processed (input prompt + output completion) deducted in Indonesian Rupiah directly from your AI Balance. There are no monthly subscriptions, minimum spends, or expiring token packs. If an upstream request fails or errors out, you are billed exactly Rp 0.",
            },
          },
          {
            "@type": "Question",
            "name": "Which models are supported?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "We support 70+ top-tier models including Anthropic Claude 3.7 Sonnet & 3.5 Haiku, OpenAI GPT-4o & o1, Google Gemini 2.5 Flash & Pro, DeepSeek R1 & V3, Qwen 2.5 & 3.7 Flash, Meta Llama 3.3, Minimax, GLM-5, and image generation models like Kling, Seedream, and Vega.",
            },
          },
          {
            "@type": "Question",
            "name": "Is my prompt data safe and retained for model training?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Your privacy is guaranteed. Masdika Cloud enforces a strict Zero Data Retention policy for training: prompts and completions pass through our edge memory proxy for streaming SSE tokens and are never logged, stored, or utilized to train any artificial intelligence models.",
            },
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aiJsonLd) }}
      />
      <AiGatewayClient
        chatModels={chatModels}
        imageModels={imageModels}
        isGatewayEnabled={isGatewayEnabled}
      />
    </>
  );
}
