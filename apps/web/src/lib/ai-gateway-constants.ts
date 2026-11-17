export interface AiModelSeed {
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

export const DEFAULT_AI_MODELS: AiModelSeed[] = [
  { modelId: 'qwen3.7-flash', name: 'Qwen3.7 Flash', provider: 'Qwen', contextWindow: '1M', inputPricePer1M: 614, cachePricePer1M: 614, outputPricePer1M: 2661 },
  { modelId: 'gpt-5-nano', name: 'GPT-5 Nano', provider: 'OpenAI', contextWindow: '400K', inputPricePer1M: 1024, cachePricePer1M: 205, outputPricePer1M: 8188 },
  { modelId: 'gpt-oss-20b', name: 'GPT OSS 20B', provider: 'OpenAI', contextWindow: '131K', inputPricePer1M: 1433, cachePricePer1M: 1433, outputPricePer1M: 6141 },
  { modelId: 'qwen-vl-ocr', name: 'Qwen VL OCR', provider: 'Qwen', contextWindow: '38K', inputPricePer1M: 1433, cachePricePer1M: 1433, outputPricePer1M: 3275 },
  { modelId: 'claude-haiku-5-5', name: 'Claude Haiku 5.5', provider: 'Anthropic', contextWindow: '200K', inputPricePer1M: 2047, cachePricePer1M: 205, outputPricePer1M: 10235 },
  { modelId: 'gpt-6-luna', name: 'GPT-6 Luna', provider: 'OpenAI', contextWindow: '1.05M', inputPricePer1M: 2047, cachePricePer1M: 205, outputPricePer1M: 10235 },
  { modelId: 'qwen3.5-flash', name: 'Qwen3.5 Flash', provider: 'Qwen', contextWindow: '1M', inputPricePer1M: 2047, cachePricePer1M: 2047, outputPricePer1M: 8188 },
  {
    modelId: 'hy3',
    name: 'Hunyuan Hy3',
    provider: 'Hunyuan',
    contextWindow: '256K',
    inputPricePer1M: 1880,
    cachePricePer1M: 470,
    outputPricePer1M: 7519,
    originalInputPricePer1M: 2350,
    originalCachePricePer1M: 587,
    originalOutputPricePer1M: 9398,
    discountBadge: '-20%',
  },
  {
    modelId: 'deepseek-v4.1-flash',
    name: 'DeepSeek V4.1 Flash',
    provider: 'DeepSeek',
    contextWindow: '1M',
    inputPricePer1M: 1869,
    cachePricePer1M: 37,
    outputPricePer1M: 7476,
    originalInputPricePer1M: 2670,
    originalCachePricePer1M: 53,
    originalOutputPricePer1M: 10680,
    discountBadge: '-30%',
    hasPeakPricing: true,
  },
  {
    modelId: 'deepseek-v4.1-flash-1017',
    name: 'DeepSeek V4.1 Flash 1017',
    provider: 'DeepSeek',
    contextWindow: '1M',
    inputPricePer1M: 6141,
    cachePricePer1M: 123,
    outputPricePer1M: 24564,
  },
  {
    modelId: 'glm-5.3-flash',
    name: 'GLM-5.3 Flash',
    provider: 'GLM',
    contextWindow: '1M',
    inputPricePer1M: 2136,
    cachePricePer1M: 427,
    outputPricePer1M: 7120,
    originalInputPricePer1M: 2670,
    originalCachePricePer1M: 534,
    originalOutputPricePer1M: 8900,
    discountBadge: '-20%',
  },
  { modelId: 'meta-llama-3-1-8b-instruct', name: 'Meta Llama 3.1 8B Instruct', provider: 'Meta', contextWindow: '131K', inputPricePer1M: 3071, cachePricePer1M: 3071, outputPricePer1M: 9212 },
  { modelId: 'gemma-3-12b', name: 'Gemma 3 12B', provider: 'Google', contextWindow: '131K', inputPricePer1M: 3071, cachePricePer1M: 3071, outputPricePer1M: 10235 },
  { modelId: 'gpt-oss-120b', name: 'GPT OSS 120B', provider: 'OpenAI', contextWindow: '131K', inputPricePer1M: 3071, cachePricePer1M: 3071, outputPricePer1M: 12282 },
  { modelId: 'qwen3-next-80b-a3b-instruct', name: 'Qwen3 Next Instruct', provider: 'Qwen', contextWindow: '131K', inputPricePer1M: 3071, cachePricePer1M: 3071, outputPricePer1M: 24564 },
  { modelId: 'qwen3.8-flash', name: 'Qwen3.8 Flash', provider: 'Qwen', contextWindow: '1M', inputPricePer1M: 3071, cachePricePer1M: 3071, outputPricePer1M: 9621 },
  { modelId: 'gpt-5-6-luna', name: 'GPT-5.6 Luna', provider: 'OpenAI', contextWindow: '1.05M', inputPricePer1M: 4094, cachePricePer1M: 409, outputPricePer1M: 24564 },
  { modelId: 'gpt-5-4-nano', name: 'GPT-5.4 Nano', provider: 'OpenAI', contextWindow: '400K', inputPricePer1M: 4094, cachePricePer1M: 409, outputPricePer1M: 25588 },
  { modelId: 'qwen3-vl-plus', name: 'Qwen3 VL Plus', provider: 'Qwen', contextWindow: '256K', inputPricePer1M: 4094, cachePricePer1M: 4094, outputPricePer1M: 32752 },
  { modelId: 'qwen35-122b-a10b', name: 'Qwen3.5 122B A10B', provider: 'Qwen', contextWindow: '262K', inputPricePer1M: 4503, cachePricePer1M: 4503, outputPricePer1M: 45034 },
  { modelId: 'gemini-3-1-flash-lite', name: 'Gemini 3.1 Flash Lite', provider: 'Google', contextWindow: '1.048576M', inputPricePer1M: 5118, cachePricePer1M: 512, outputPricePer1M: 30705 },
  { modelId: 'gpt-5-mini', name: 'GPT-5 Mini', provider: 'OpenAI', contextWindow: '400K', inputPricePer1M: 5118, cachePricePer1M: 512, outputPricePer1M: 40940 },
  { modelId: 'qwen3.6-flash', name: 'Qwen3.6 Flash', provider: 'Qwen', contextWindow: '1M', inputPricePer1M: 5118, cachePricePer1M: 5118, outputPricePer1M: 30705 },
  {
    modelId: 'minimax-m3',
    name: 'MiniMax M3',
    provider: 'MiniMax',
    contextWindow: '1M',
    inputPricePer1M: 4272,
    cachePricePer1M: 854,
    outputPricePer1M: 17088,
    originalInputPricePer1M: 5340,
    originalCachePricePer1M: 1068,
    originalOutputPricePer1M: 21360,
    discountBadge: '-20%',
  },
  { modelId: 'gemini-3-5-flash-lite', name: 'Gemini 3.5 Flash Lite', provider: 'Google', contextWindow: '1.048576M', inputPricePer1M: 6141, cachePricePer1M: 614, outputPricePer1M: 51175 },
  {
    modelId: 'deepseek/deepseek-v4.1-flash:fast',
    name: 'DeepSeek V4.1 Flash Fast Edition',
    provider: 'DeepSeek',
    contextWindow: '1M',
    inputPricePer1M: 4984,
    cachePricePer1M: 1424,
    outputPricePer1M: 21360,
    originalInputPricePer1M: 6230,
    originalCachePricePer1M: 1780,
    originalOutputPricePer1M: 26700,
    discountBadge: '-20%',
  },
  {
    modelId: 'glm-5.3-flashx',
    name: 'GLM-5.3 FlashX',
    provider: 'GLM',
    contextWindow: '1M',
    inputPricePer1M: 5269,
    cachePricePer1M: 1068,
    outputPricePer1M: 17800,
    originalInputPricePer1M: 6586,
    originalCachePricePer1M: 1335,
    originalOutputPricePer1M: 22250,
    discountBadge: '-20%',
  },
  { modelId: 'qwen3.7-plus', name: 'Qwen3.7 Plus', provider: 'Qwen', contextWindow: '1M', inputPricePer1M: 8188, cachePricePer1M: 8188, outputPricePer1M: 32752 },
  { modelId: 'llama-4-maverick', name: 'Llama 4 Maverick', provider: 'Meta', contextWindow: '1M', inputPricePer1M: 10235, cachePricePer1M: 10235, outputPricePer1M: 30705 },
  { modelId: 'meta-llama-3-3-70b-instruct', name: 'Meta Llama 3.3 70B Instruct', provider: 'Meta', contextWindow: '128K', inputPricePer1M: 10235, cachePricePer1M: 10235, outputPricePer1M: 30705 },
  { modelId: 'gemini-3-flash', name: 'Gemini 3 Flash', provider: 'Google', contextWindow: '1.048576M', inputPricePer1M: 10235, cachePricePer1M: 1024, outputPricePer1M: 61410 },
  {
    modelId: 'qwen3.8-27b',
    name: 'Qwen3.8 27B',
    provider: 'Qwen',
    contextWindow: '1M',
    inputPricePer1M: 5118,
    cachePricePer1M: 1024,
    outputPricePer1M: 30705,
    originalInputPricePer1M: 10235,
    originalCachePricePer1M: 2047,
    originalOutputPricePer1M: 61410,
    discountBadge: '-50%',
  },
  { modelId: 'qwen3.6-plus', name: 'Qwen3.6 Plus', provider: 'Qwen', contextWindow: '1M', inputPricePer1M: 10235, cachePricePer1M: 10235, outputPricePer1M: 61410 },
  { modelId: 'qwen3.6-27b', name: 'Qwen3.6 27B', provider: 'Qwen', contextWindow: '256K', inputPricePer1M: 12282, cachePricePer1M: 12282, outputPricePer1M: 73692 },
  { modelId: 'gpt-5-4-mini', name: 'GPT-5.4 Mini', provider: 'OpenAI', contextWindow: '400K', inputPricePer1M: 15353, cachePricePer1M: 1535, outputPricePer1M: 92115 },
  { modelId: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', provider: 'Anthropic', contextWindow: '200K', inputPricePer1M: 20470, cachePricePer1M: 2047, outputPricePer1M: 102350 },
  {
    modelId: 'glm-5.3',
    name: 'GLM-5.3',
    provider: 'GLM',
    contextWindow: '1M',
    inputPricePer1M: 19936,
    cachePricePer1M: 3702,
    outputPricePer1M: 62656,
    originalInputPricePer1M: 24920,
    originalCachePricePer1M: 4628,
    originalOutputPricePer1M: 78320,
    discountBadge: '-20%',
  },
  {
    modelId: 'glm-5.2',
    name: 'GLM-5.2',
    provider: 'GLM',
    contextWindow: '1M',
    inputPricePer1M: 19936,
    cachePricePer1M: 3702,
    outputPricePer1M: 62656,
    originalInputPricePer1M: 24920,
    originalCachePricePer1M: 4628,
    originalOutputPricePer1M: 78320,
    discountBadge: '-20%',
  },
  {
    modelId: 'glm-5.1',
    name: 'GLM-5.1',
    provider: 'GLM',
    contextWindow: '200K',
    inputPricePer1M: 19936,
    cachePricePer1M: 3702,
    outputPricePer1M: 62656,
    originalInputPricePer1M: 24920,
    originalCachePricePer1M: 4628,
    originalOutputPricePer1M: 78320,
    discountBadge: '-20%',
  },
  { modelId: 'gpt-5', name: 'GPT-5', provider: 'OpenAI', contextWindow: '400K', inputPricePer1M: 25588, cachePricePer1M: 2559, outputPricePer1M: 204700 },
  { modelId: 'gpt-5-1', name: 'GPT-5.1', provider: 'OpenAI', contextWindow: '400K', inputPricePer1M: 25588, cachePricePer1M: 2559, outputPricePer1M: 204700 },
  { modelId: 'gemini-3-6-flash', name: 'Gemini 3.6 Flash', provider: 'Google', contextWindow: '1.048576M', inputPricePer1M: 30705, cachePricePer1M: 3071, outputPricePer1M: 153525 },
  { modelId: 'gemini-3-5-flash', name: 'Gemini 3.5 Flash', provider: 'Google', contextWindow: '1.048576M', inputPricePer1M: 30705, cachePricePer1M: 3071, outputPricePer1M: 184230 },
  { modelId: 'gemini-3-7-flash', name: 'Gemini 3.7 Flash', provider: 'Google', contextWindow: '1.048576M', inputPricePer1M: 30705, cachePricePer1M: 3071, outputPricePer1M: 153525 },
  { modelId: 'gemini-3-8-flash', name: 'Gemini 3.8 Flash', provider: 'Google', contextWindow: '1.048576M', inputPricePer1M: 30705, cachePricePer1M: 3071, outputPricePer1M: 153525 },
  {
    modelId: 'deepseek-v4-pro',
    name: 'DeepSeek V4 Pro',
    provider: 'DeepSeek',
    contextWindow: '1M',
    inputPricePer1M: 24778,
    cachePricePer1M: 2065,
    outputPricePer1M: 49555,
    originalInputPricePer1M: 30972,
    originalCachePricePer1M: 2581,
    originalOutputPricePer1M: 61944,
    discountBadge: '-20%',
  },
  { modelId: 'gpt-5-2', name: 'GPT-5.2', provider: 'OpenAI', contextWindow: '400K', inputPricePer1M: 35823, cachePricePer1M: 3582, outputPricePer1M: 286580 },
  { modelId: 'grok-4-6', name: 'Grok 4.6', provider: 'Grok', contextWindow: '500K', inputPricePer1M: 40940, cachePricePer1M: 10235, outputPricePer1M: 122820 },
  { modelId: 'claude-sonnet-5', name: 'Claude Sonnet 5', provider: 'Anthropic', contextWindow: '1M', inputPricePer1M: 40940, cachePricePer1M: 4094, outputPricePer1M: 204700 },
  { modelId: 'gemini-3-1-pro', name: 'Gemini 3.1 Pro', provider: 'Google', contextWindow: '1.048576M', inputPricePer1M: 40940, cachePricePer1M: 4094, outputPricePer1M: 245640 },
  { modelId: 'gpt-5-6-terra', name: 'GPT-5.6 Terra', provider: 'OpenAI', contextWindow: '1.05M', inputPricePer1M: 40940, cachePricePer1M: 4094, outputPricePer1M: 245640 },
  { modelId: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5', provider: 'Anthropic', contextWindow: '1M', inputPricePer1M: 40940, cachePricePer1M: 4094, outputPricePer1M: 204700 },
  { modelId: 'gpt-6-sol', name: 'GPT-6 Sol', provider: 'OpenAI', contextWindow: '1.05M', inputPricePer1M: 40940, cachePricePer1M: 4094, outputPricePer1M: 204700 },
  { modelId: 'gpt-6-1-sol', name: 'GPT-6.1 Sol', provider: 'OpenAI', contextWindow: '1.05M', inputPricePer1M: 40940, cachePricePer1M: 2047, outputPricePer1M: 204700 },
  { modelId: 'qwen3.8-max', name: 'Qwen3.8 Max', provider: 'Qwen', contextWindow: '1M', inputPricePer1M: 40940, cachePricePer1M: 40940, outputPricePer1M: 122820 },
  { modelId: 'gpt-5-4', name: 'GPT-5.4', provider: 'OpenAI', contextWindow: '1.05M', inputPricePer1M: 51175, cachePricePer1M: 5118, outputPricePer1M: 307050 },
  { modelId: 'grok-4-7', name: 'Grok 4.7', provider: 'Grok', contextWindow: '500K', inputPricePer1M: 51175, cachePricePer1M: 10235, outputPricePer1M: 153525 },
  { modelId: 'qwen3.7-max', name: 'Qwen3.7 Max', provider: 'Qwen', contextWindow: '1M', inputPricePer1M: 51175, cachePricePer1M: 51175, outputPricePer1M: 153525 },
  {
    modelId: 'kimi-k3',
    name: 'Kimi K3',
    provider: 'Kimi',
    contextWindow: '1M',
    inputPricePer1M: 42720,
    cachePricePer1M: 4272,
    outputPricePer1M: 213600,
    originalInputPricePer1M: 53400,
    originalCachePricePer1M: 5340,
    originalOutputPricePer1M: 267000,
    discountBadge: '-20%',
  },
  { modelId: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', provider: 'Anthropic', contextWindow: '1M', inputPricePer1M: 61410, cachePricePer1M: 6141, outputPricePer1M: 307050 },
  { modelId: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', provider: 'Anthropic', contextWindow: '200K', inputPricePer1M: 61410, cachePricePer1M: 6141, outputPricePer1M: 307050 },
  { modelId: 'claude-opus-5-5', name: 'Claude Opus 5.5', provider: 'Anthropic', contextWindow: '1M', inputPricePer1M: 81880, cachePricePer1M: 4094, outputPricePer1M: 409400 },
  { modelId: 'gemini-4-argon', name: 'Gemini 4 Argon', provider: 'Google', contextWindow: '1.048576M', inputPricePer1M: 81880, cachePricePer1M: 4094, outputPricePer1M: 409400 },
  { modelId: 'claude-opus-4-8', name: 'Claude Opus 4.8', provider: 'Anthropic', contextWindow: '1M', inputPricePer1M: 102350, cachePricePer1M: 10235, outputPricePer1M: 511750 },
  { modelId: 'claude-opus-4-7', name: 'Claude Opus 4.7', provider: 'Anthropic', contextWindow: '1M', inputPricePer1M: 102350, cachePricePer1M: 10235, outputPricePer1M: 511750 },
  { modelId: 'claude-opus-4-6', name: 'Claude Opus 4.6', provider: 'Anthropic', contextWindow: '1M', inputPricePer1M: 102350, cachePricePer1M: 10235, outputPricePer1M: 511750 },
  { modelId: 'claude-opus-4-5', name: 'Claude Opus 4.5', provider: 'Anthropic', contextWindow: '200K', inputPricePer1M: 102350, cachePricePer1M: 10235, outputPricePer1M: 511750 },
  { modelId: 'claude-opus-5', name: 'Claude Opus 5', provider: 'Anthropic', contextWindow: '1M', inputPricePer1M: 102350, cachePricePer1M: 10235, outputPricePer1M: 511750 },
  { modelId: 'gpt-5-5', name: 'GPT-5.5', provider: 'OpenAI', contextWindow: '1.05M', inputPricePer1M: 102350, cachePricePer1M: 10235, outputPricePer1M: 614100 },
  { modelId: 'gpt-5-6-sol', name: 'GPT-5.6 Sol', provider: 'OpenAI', contextWindow: '1.05M', inputPricePer1M: 102350, cachePricePer1M: 10235, outputPricePer1M: 614100 },
  { modelId: 'claude-fable-5', name: 'Claude Fable 5', provider: 'Anthropic', contextWindow: '1M', inputPricePer1M: 204700, cachePricePer1M: 20470, outputPricePer1M: 1023500 },
  { modelId: 'claude-fable-5-1', name: 'Claude Fable 5.1', provider: 'Anthropic', contextWindow: '1M', inputPricePer1M: 204700, cachePricePer1M: 5118, outputPricePer1M: 1023500 },
  { modelId: 'gpt-6-astra', name: 'GPT-6 Astra', provider: 'OpenAI', contextWindow: '1.05M', inputPricePer1M: 204700, cachePricePer1M: 20470, outputPricePer1M: 1023500 },
  { modelId: 'claude-opus-4-1', name: 'Claude Opus 4.1', provider: 'Anthropic', contextWindow: '200K', inputPricePer1M: 307050, cachePricePer1M: 30705, outputPricePer1M: 1535250 },
];

export interface AiImageModelSpec {
  modelId: string;
  name: string;
  description?: string;
  sizes: string[];
  sizePrices?: Record<string, number>;
  tokensPerImage: number;
  basePriceRp: number;
  maxN: number;
  maxRefImages: number;
}

export const DEFAULT_AI_IMAGE_MODELS: AiImageModelSpec[] = [
  { modelId: 'seedream-image-v5.0-flash', name: 'Seedream 5.0 Flash', description: 'Fast, low-cost 2K images.', sizes: ['2048x2048'], tokensPerImage: 11250, basePriceRp: 320, maxN: 1, maxRefImages: 4 },
  { modelId: 'wand-vega-image-lite', name: 'Vega Image Lite', description: 'Low-cost 1K images.', sizes: ['1024x1024'], tokensPerImage: 13500, basePriceRp: 384, maxN: 1, maxRefImages: 0 },
  { modelId: 'hy-image-v3.5-preview', name: 'Hunyuan Image 3.5 (preview)', description: 'Hunyuan text-to-image: square, landscape or portrait.', sizes: ['1024x768', '1280x768', '768x1024', '768x1280', '1024x1024'], tokensPerImage: 15000, basePriceRp: 427, maxN: 1, maxRefImages: 0 },
  { modelId: 'kling-image-v3', name: 'Kling Image 3', description: 'Kling text-to-image, up to 4 images per request.', sizes: ['1024x1024'], tokensPerImage: 17500, basePriceRp: 498, maxN: 4, maxRefImages: 1 },
  { modelId: 'kling-image-o1', name: 'Kling Image O1', description: 'Kling O1 image model, up to 4 images per request.', sizes: ['1024x1024'], tokensPerImage: 17500, basePriceRp: 498, maxN: 4, maxRefImages: 1 },
  { modelId: 'kling-image-v3-omni', name: 'Kling Image 3 Omni', description: 'Kling multi-reference image model.', sizes: ['1024x1024'], tokensPerImage: 17500, basePriceRp: 498, maxN: 1, maxRefImages: 4 },
  { modelId: 'vidu-image-q2', name: 'Vidu Image Q2', description: 'Vidu 1080p images (16:9).', sizes: ['1920x1080'], tokensPerImage: 18750, basePriceRp: 534, maxN: 1, maxRefImages: 3 },
  { modelId: 'hy-image-v3', name: 'Hunyuan Image 3', description: 'Hunyuan text-to-image, 1K.', sizes: ['1024x1024'], tokensPerImage: 20000, basePriceRp: 570, maxN: 1, maxRefImages: 0 },
  { modelId: 'seedream-image-v5.0-lite', name: 'Seedream 5.0 Lite', description: 'Balanced quality 2K images.', sizes: ['2048x2048'], tokensPerImage: 21875, basePriceRp: 623, maxN: 1, maxRefImages: 4 },
  { modelId: 'seedream-image-v5.0-pro', name: 'Seedream 5.0 Pro', description: 'Highest-quality Seedream, 1.5K or 2K.', sizes: ['1536x1536', '2048x2048'], sizePrices: { '1536x1536': 801, '2048x2048': 1602 }, tokensPerImage: 28125, basePriceRp: 801, maxN: 1, maxRefImages: 4 },
  { modelId: 'wand-vega-image-flash', name: 'Vega Image Flash', description: 'Fast wide images (1408x768).', sizes: ['1408x768'], tokensPerImage: 37687, basePriceRp: 1073, maxN: 1, maxRefImages: 0 },
  { modelId: 'wand-vega-image-1.5-pro', name: 'Vega Image 1.5 Pro', description: 'High-quality 1K images, takes reference images.', sizes: ['1024x1024'], tokensPerImage: 41875, basePriceRp: 1193, maxN: 1, maxRefImages: 4 },
  { modelId: 'wand-vega-image-pro', name: 'Vega Image Pro', description: 'Premium 1K images.', sizes: ['1024x1024'], tokensPerImage: 80156, basePriceRp: 2283, maxN: 1, maxRefImages: 0 },
];

export interface AiModelLike {
  originalOutputPricePer1M?: number | null;
  outputPricePer1M?: number;
  originalInputPricePer1M?: number | null;
  inputPricePer1M?: number;
  originalCachePricePer1M?: number | null;
  cachePricePer1M?: number;
  discountBadge?: string | null;
  contextWindow?: string;
  [key: string]: any;
}

export function isModelPromo(m: AiModelLike): boolean {
  if (Boolean(m.discountBadge)) return true;
  if (Boolean(m.originalOutputPricePer1M && m.outputPricePer1M !== undefined && m.originalOutputPricePer1M > m.outputPricePer1M)) return true;
  if (Boolean(m.originalInputPricePer1M && m.inputPricePer1M !== undefined && m.originalInputPricePer1M > m.inputPricePer1M)) return true;
  if (Boolean(m.originalCachePricePer1M && m.cachePricePer1M !== undefined && m.originalCachePricePer1M > m.cachePricePer1M)) return true;
  return false;
}

export function getModelDiscountPct(m: AiModelLike): number {
  if (m.originalOutputPricePer1M && m.outputPricePer1M !== undefined && m.originalOutputPricePer1M > m.outputPricePer1M) {
    return ((m.originalOutputPricePer1M - m.outputPricePer1M) / m.originalOutputPricePer1M) * 100;
  }
  if (m.originalInputPricePer1M && m.inputPricePer1M !== undefined && m.originalInputPricePer1M > m.inputPricePer1M) {
    return ((m.originalInputPricePer1M - m.inputPricePer1M) / m.originalInputPricePer1M) * 100;
  }
  if (m.discountBadge) {
    const num = parseInt(m.discountBadge.replace(/[^0-9]/g, ''), 10);
    return isNaN(num) ? 1 : num;
  }
  return 0;
}

export function sortModelsWithPromoFirst<T extends AiModelLike>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const promoA = isModelPromo(a);
    const promoB = isModelPromo(b);
    if (promoA && !promoB) return -1;
    if (!promoA && promoB) return 1;
    if (promoA && promoB) {
      const diff = getModelDiscountPct(b) - getModelDiscountPct(a);
      if (diff !== 0) return diff;
    }
    return 0;
  });
}

export type AiModelCapability = 'Reasoning' | 'Tools' | 'JSON' | 'Vision' | 'Video';

export const VISION_MODEL_IDS = new Set<string>([
  'deepseek-v4.1-flash',
  'deepseek-v4.1-flash-1017',
  'deepseek/deepseek-v4.1-flash:fast',
  'glm-5.3-flashx',
  'glm-5.3-flash',
  'gpt-5-nano',
  'gemma-3-12b',
  'gpt-5-6-luna',
  'gpt-5-4-nano',
  'gemini-3-1-flash-lite',
  'llama-4-maverick',
  'gpt-5-mini',
  'gemini-3-5-flash-lite',
  'gemini-3-flash',
  'gpt-5-4-mini',
  'claude-haiku-4-5',
  'grok-4-6',
  'gemini-3-6-flash',
  'gemini-3-5-flash',
  'claude-sonnet-5',
  'gpt-5',
  'gpt-5-1',
  'gemini-3-1-pro',
  'gpt-5-6-terra',
  'gpt-5-2',
  'claude-sonnet-4-6',
  'claude-sonnet-4-5',
  'gpt-5-4',
  'claude-opus-5-5',
  'claude-opus-4-8',
  'claude-opus-4-7',
  'claude-opus-4-6',
  'claude-opus-4-5',
  'claude-opus-5',
  'gpt-5-5',
  'gpt-5-6-sol',
  'claude-fable-5',
  'claude-fable-5-1',
  'gpt-6-astra',
  'claude-opus-4-1',
  'claude-haiku-5-5',
  'gpt-6-luna',
  'gemini-3-7-flash',
  'gemini-3-8-flash',
  'claude-sonnet-5-5',
  'gpt-6-sol',
  'gpt-6-1-sol',
  'gemini-4-argon',
  'qwen3.8-max',
  'qwen3.8-flash',
  'qwen3.8-27b',
  'qwen3.7-max',
  'qwen3.7-plus',
  'qwen3.7-flash',
  'qwen3.6-plus',
  'qwen3.6-flash',
  'qwen3.6-27b',
  'qwen3.5-flash',
  'qwen3-vl-plus',
  'qwen-vl-ocr',
]);

export const REASONING_MODEL_IDS = new Set<string>([
  'hy3',
  'deepseek-v4.1-flash',
  'deepseek-v4.1-flash-1017',
  'deepseek-v4-pro',
  'deepseek/deepseek-v4.1-flash:fast',
  'glm-5.3',
  'glm-5.2',
  'glm-5.1',
  'glm-5.3-flashx',
  'glm-5.3-flash',
  'kimi-k3',
  'minimax-m3',
  'gpt-oss-20b',
  'gpt-5-nano',
  'gpt-oss-120b',
  'gpt-5-6-luna',
  'gpt-5-4-nano',
  'gemini-3-1-flash-lite',
  'gpt-5-mini',
  'qwen35-122b-a10b',
  'gemini-3-5-flash-lite',
  'gemini-3-flash',
  'gpt-5-4-mini',
  'claude-haiku-4-5',
  'grok-4-6',
  'gemini-3-6-flash',
  'gemini-3-5-flash',
  'claude-sonnet-5',
  'gpt-5',
  'gpt-5-1',
  'gemini-3-1-pro',
  'gpt-5-6-terra',
  'gpt-5-2',
  'claude-sonnet-4-6',
  'claude-sonnet-4-5',
  'gpt-5-4',
  'claude-opus-5-5',
  'claude-opus-4-8',
  'claude-opus-4-7',
  'claude-opus-4-6',
  'claude-opus-4-5',
  'claude-opus-5',
  'gpt-5-5',
  'gpt-5-6-sol',
  'claude-fable-5',
  'claude-fable-5-1',
  'gpt-6-astra',
  'claude-opus-4-1',
  'claude-haiku-5-5',
  'gpt-6-luna',
  'gemini-3-7-flash',
  'gemini-3-8-flash',
  'grok-4-7',
  'claude-sonnet-5-5',
  'gpt-6-sol',
  'gpt-6-1-sol',
  'gemini-4-argon',
  'qwen3.8-max',
  'qwen3.8-flash',
  'qwen3.8-27b',
  'qwen3.7-max',
  'qwen3.7-plus',
  'qwen3.7-flash',
  'qwen3.6-plus',
  'qwen3.6-flash',
  'qwen3.6-27b',
  'qwen3.5-flash',
  'qwen3-vl-plus',
]);

export const TOOLS_MODEL_IDS = new Set<string>([
  'hy3',
  'deepseek-v4.1-flash',
  'deepseek-v4.1-flash-1017',
  'deepseek-v4-pro',
  'deepseek/deepseek-v4.1-flash:fast',
  'glm-5.3',
  'glm-5.2',
  'glm-5.1',
  'glm-5.3-flashx',
  'glm-5.3-flash',
  'kimi-k3',
  'minimax-m3',
  'gpt-oss-20b',
  'gpt-5-nano',
  'meta-llama-3-1-8b-instruct',
  'gemma-3-12b',
  'gpt-oss-120b',
  'gpt-5-6-luna',
  'qwen3-next-80b-a3b-instruct',
  'gpt-5-4-nano',
  'gemini-3-1-flash-lite',
  'llama-4-maverick',
  'meta-llama-3-3-70b-instruct',
  'gpt-5-mini',
  'qwen35-122b-a10b',
  'gemini-3-5-flash-lite',
  'gemini-3-flash',
  'gpt-5-4-mini',
  'claude-haiku-4-5',
  'grok-4-6',
  'gemini-3-6-flash',
  'gemini-3-5-flash',
  'claude-sonnet-5',
  'gpt-5',
  'gpt-5-1',
  'gemini-3-1-pro',
  'gpt-5-6-terra',
  'gpt-5-2',
  'claude-sonnet-4-6',
  'claude-sonnet-4-5',
  'gpt-5-4',
  'claude-opus-5-5',
  'claude-opus-4-8',
  'claude-opus-4-7',
  'claude-opus-4-6',
  'claude-opus-4-5',
  'claude-opus-5',
  'gpt-5-5',
  'gpt-5-6-sol',
  'claude-fable-5',
  'claude-fable-5-1',
  'gpt-6-astra',
  'claude-opus-4-1',
  'claude-haiku-5-5',
  'gpt-6-luna',
  'gemini-3-7-flash',
  'gemini-3-8-flash',
  'grok-4-7',
  'claude-sonnet-5-5',
  'gpt-6-sol',
  'gpt-6-1-sol',
  'gemini-4-argon',
  'qwen3.8-max',
  'qwen3.8-flash',
  'qwen3.8-27b',
  'qwen3.7-max',
  'qwen3.7-plus',
  'qwen3.7-flash',
  'qwen3.6-plus',
  'qwen3.6-flash',
  'qwen3.6-27b',
  'qwen3.5-flash',
  'qwen3-vl-plus',
]);

export const JSON_MODEL_IDS = new Set<string>([
  'hy3',
  'deepseek-v4.1-flash',
  'deepseek-v4.1-flash-1017',
  'deepseek-v4-pro',
  'deepseek/deepseek-v4.1-flash:fast',
  'glm-5.3',
  'glm-5.2',
  'glm-5.1',
  'glm-5.3-flashx',
  'glm-5.3-flash',
  'kimi-k3',
  'gpt-oss-20b',
  'gpt-5-nano',
  'meta-llama-3-1-8b-instruct',
  'gemma-3-12b',
  'gpt-oss-120b',
  'gpt-5-6-luna',
  'qwen3-next-80b-a3b-instruct',
  'gpt-5-4-nano',
  'gemini-3-1-flash-lite',
  'llama-4-maverick',
  'meta-llama-3-3-70b-instruct',
  'gpt-5-mini',
  'qwen35-122b-a10b',
  'gemini-3-5-flash-lite',
  'gemini-3-flash',
  'gpt-5-4-mini',
  'claude-haiku-4-5',
  'grok-4-6',
  'gemini-3-6-flash',
  'gemini-3-5-flash',
  'claude-sonnet-5',
  'gpt-5',
  'gpt-5-1',
  'gemini-3-1-pro',
  'gpt-5-6-terra',
  'gpt-5-2',
  'claude-sonnet-4-6',
  'claude-sonnet-4-5',
  'gpt-5-4',
  'claude-opus-4-8',
  'claude-opus-4-7',
  'claude-opus-4-6',
  'claude-opus-4-5',
  'claude-opus-5',
  'gpt-5-5',
  'gpt-5-6-sol',
  'claude-fable-5',
  'gpt-6-astra',
  'claude-opus-4-1',
  'claude-haiku-5-5',
  'gpt-6-luna',
  'gemini-3-7-flash',
  'gemini-3-8-flash',
  'grok-4-7',
  'claude-sonnet-5-5',
  'gpt-6-sol',
  'gpt-6-1-sol',
  'gemini-4-argon',
  'qwen3.8-max',
  'qwen3.8-flash',
  'qwen3.8-27b',
  'qwen3.7-max',
  'qwen3.7-plus',
  'qwen3.7-flash',
  'qwen3.6-plus',
  'qwen3.6-flash',
  'qwen3.6-27b',
  'qwen3.5-flash',
]);

export const VIDEO_MODEL_IDS = new Set<string>([
  'glm-5.3-flashx',
  'glm-5.3-flash',
]);

export function parseContextWindowTokens(ctx?: string): number {
  if (!ctx) return 0;
  const s = ctx.toUpperCase().trim();
  if (s.endsWith('M')) {
    const val = parseFloat(s.slice(0, -1));
    return isNaN(val) ? 0 : Math.round(val * 1_000_000);
  }
  if (s.endsWith('K')) {
    const val = parseFloat(s.slice(0, -1));
    return isNaN(val) ? 0 : Math.round(val * 1_000);
  }
  const num = parseInt(s.replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? 0 : num;
}

export function sortAiModels<T extends AiModelLike>(list: T[], sortBy: string = 'recommended'): T[] {
  if (sortBy === 'price_asc') {
    return [...list].sort((a, b) => {
      const pA = a.outputPricePer1M ?? a.inputPricePer1M ?? 0;
      const pB = b.outputPricePer1M ?? b.inputPricePer1M ?? 0;
      return pA - pB;
    });
  }
  if (sortBy === 'price_desc') {
    return [...list].sort((a, b) => {
      const pA = a.outputPricePer1M ?? a.inputPricePer1M ?? 0;
      const pB = b.outputPricePer1M ?? b.inputPricePer1M ?? 0;
      return pB - pA;
    });
  }
  if (sortBy === 'context_desc') {
    return [...list].sort((a, b) => {
      const cA = parseContextWindowTokens(a.contextWindow);
      const cB = parseContextWindowTokens(b.contextWindow);
      return cB - cA;
    });
  }
  return sortModelsWithPromoFirst(list);
}

export function getModelCapabilities(modelId: string): AiModelCapability[] {
  const caps: AiModelCapability[] = [];
  const id = modelId.toLowerCase().trim();
  const cleanId = id.includes('/') ? id.split('/').pop()! : id;
  if (REASONING_MODEL_IDS.has(id) || REASONING_MODEL_IDS.has(cleanId)) caps.push('Reasoning');
  if (TOOLS_MODEL_IDS.has(id) || TOOLS_MODEL_IDS.has(cleanId)) caps.push('Tools');
  if (JSON_MODEL_IDS.has(id) || JSON_MODEL_IDS.has(cleanId)) caps.push('JSON');
  if (VISION_MODEL_IDS.has(id) || VISION_MODEL_IDS.has(cleanId)) caps.push('Vision');
  if (VIDEO_MODEL_IDS.has(id) || VIDEO_MODEL_IDS.has(cleanId)) caps.push('Video');
  return caps;
}

export function modelHasCapability(modelId: string, cap: 'Vision' | 'Reasoning' | 'Tools' | 'JSON' | 'Video'): boolean {
  const id = modelId.toLowerCase().trim();
  const cleanId = id.includes('/') ? id.split('/').pop()! : id;
  if (cap === 'Vision') return VISION_MODEL_IDS.has(id) || VISION_MODEL_IDS.has(cleanId);
  if (cap === 'Reasoning') return REASONING_MODEL_IDS.has(id) || REASONING_MODEL_IDS.has(cleanId);
  if (cap === 'Tools') return TOOLS_MODEL_IDS.has(id) || TOOLS_MODEL_IDS.has(cleanId);
  if (cap === 'JSON') return JSON_MODEL_IDS.has(id) || JSON_MODEL_IDS.has(cleanId);
  if (cap === 'Video') return VIDEO_MODEL_IDS.has(id) || VIDEO_MODEL_IDS.has(cleanId);
  return false;
}
