export interface ManagedAppDefinition {
  id: 'hermes' | 'ninerouter' | 'n8n' | 'opencode' | 'openclaw';
  name: string;
  tagline: string;
  category: string;
  description: string;
  icon: string;
  appPort: number;
  dataDir: string;
  defaultImage: string;
  color: string;
  badge: string;
  website: string;
  github?: string;
  features: string[];
  accessProtocol: 'WEB' | 'SSH' | 'BOTH';
}

export interface ManagedAppPlanDefinition {
  id: string; // e.g. "1c1g"
  planCode: string; // e.g. "1C1G"
  cpuLabel: string; // "1 CPU"
  cpuShares: number; // 1.0
  ramLabel: string; // "1.0 GB RAM"
  memoryMb: number; // 1024
  storageGb: number; // 10 GB
  monthlyPrice: number; // in IDR
  hourlyPrice: number; // in IDR
  remainingStock: number;
  isPopular?: boolean;
}

export const MANAGED_APPS_CATALOG: ManagedAppDefinition[] = [
  {
    id: 'hermes',
    name: 'Hermes Agent',
    tagline: 'NousResearch Autonomous AI Coding Agent with Web Dashboard & SSH',
    category: 'AI Agent',
    description: 'Autonomous AI agent built by NousResearch featuring browser-based Web Dashboard (FastAPI/Uvicorn), persistent memory, and sandboxed SSH terminal access.',
    icon: '/images/apps/hermes-agent.png',
    appPort: 9119,
    dataDir: '/app/data',
    defaultImage: 'docker.io/library/node:22-alpine',
    color: 'from-amber-500 to-orange-600',
    badge: 'WEB + SSH',
    accessProtocol: 'BOTH',
    website: 'https://hermes-agent.nousresearch.com/docs/user-guide/features/web-dashboard',
    github: 'https://github.com/NousResearch/hermes-agent',
    features: [
      'Browser Web Dashboard with Let\'s Encrypt SSL',
      'Direct High-Speed Sandboxed SSH Terminal Access',
      'Persistent Memory & Learning Loop across Restarts (/app/data)',
      'Multi-Model LLM Orchestration & Web UI Configuration',
    ],
  },
  {
    id: 'ninerouter',
    name: '9Router',
    tagline: 'Smart Multi-LLM API Gateway & Token Router',
    category: 'AI Gateway',
    description: 'High-performance AI proxy gateway providing automatic multi-tier failover, format translation (OpenAI / Anthropic), and token compression.',
    icon: '/images/apps/9router.png',
    appPort: 20128,
    dataDir: '/app/data',
    defaultImage: 'docker.io/decolua/9router:latest',
    color: 'from-violet-500 to-purple-600',
    badge: 'API Gateway',
    accessProtocol: 'WEB',
    website: 'https://github.com/decolua/9router',
    github: 'https://github.com/decolua/9router',
    features: [
      'Multi-Tier Auto-Fallback on 429 / Quotas',
      'OpenAI & Anthropic Format Translation',
      'RTK Token Saver (Compresses Tool Results)',
      'Compatible with Claude Code, Cursor, Cline & Copilot',
    ],
  },
  {
    id: 'n8n',
    name: 'n8n',
    tagline: 'Visual Fair-Code Workflow Automation Engine',
    category: 'Workflow Automation',
    description: 'Self-hosted workflow automation platform connecting 400+ enterprise services, AI models, and custom webhooks with visual drag-and-drop builder.',
    icon: '/images/apps/n8n.png',
    appPort: 5678,
    dataDir: '/home/node/.n8n',
    defaultImage: 'docker.io/n8nio/n8n:latest',
    color: 'from-orange-500 to-amber-600',
    badge: 'Workflow Engine',
    accessProtocol: 'WEB',
    website: 'https://n8n.io',
    github: 'https://github.com/n8n-io/n8n',
    features: [
      '400+ Pre-Built Integrations & Community Nodes',
      'Native AI Agent & LangChain Nodes',
      'Full Webhook Triggers & Schedule Execution',
      'Self-Hosted Privacy & Zero Execution Limits',
    ],
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    tagline: 'Terminal AI Coding Assistant & Developer Environment',
    category: 'Developer Tools',
    description: 'Fast, native AI developer assistant and terminal environment accessed via direct SSH that indexes codebases, automates git workflows, and pairs with multiple LLMs.',
    icon: '/images/apps/opencode.png',
    appPort: 22,
    dataDir: '/workspace',
    defaultImage: 'docker.io/library/node:22-alpine',
    color: 'from-blue-500 to-cyan-600',
    badge: 'SSH / CLI Access',
    accessProtocol: 'SSH',
    website: 'https://opencode.ai',
    github: 'https://github.com/anomalyco/opencode',
    features: [
      'Direct High-Speed SSH Terminal Access',
      'Persistent Workspace Storage at /workspace',
      'Git Commit, Diff & Automated PR Generation',
      'Seamless OpenAI / Anthropic / Local Model Pairing',
    ],
  },
  {
    id: 'openclaw',
    name: 'OpenClaw',
    tagline: 'AI Agent Platform for Messaging & Web Crawling',
    category: 'Autonomous Agent',
    description: 'Open-source AI agent platform connecting LLMs to WhatsApp, Telegram, Discord, and Slack with real-time browser execution and scheduled tasks.',
    icon: '/images/apps/openclaw.png',
    appPort: 3000,
    dataDir: '/data',
    defaultImage: 'docker.io/library/node:22-alpine',
    color: 'from-emerald-500 to-teal-600',
    badge: 'Multi-Channel AI',
    accessProtocol: 'WEB',
    website: 'https://openclaw.ai',
    github: 'https://github.com/openclaw/openclaw',
    features: [
      'Direct WhatsApp, Telegram, Discord & Slack Connectors',
      'Headless Chromium Web Browsing & Extraction',
      'Background Task Scheduling & Cron Automations',
      'Persistent Local Workspace & Secret Storage',
    ],
  },
];

export const MANAGED_APP_PLANS: ManagedAppPlanDefinition[] = [
  {
    id: '1c1g',
    planCode: '1C1G',
    cpuLabel: '1 CPU',
    cpuShares: 1.0,
    ramLabel: '1.0 GB RAM',
    memoryMb: 1024,
    storageGb: 10,
    monthlyPrice: 20000,
    hourlyPrice: 28,
    remainingStock: 23,
    isPopular: false,
  },
  {
    id: '1c2g',
    planCode: '1C2G',
    cpuLabel: '1 CPU',
    cpuShares: 1.0,
    ramLabel: '2.0 GB RAM',
    memoryMb: 2048,
    storageGb: 10,
    monthlyPrice: 30000,
    hourlyPrice: 42,
    remainingStock: 35,
    isPopular: true,
  },
  {
    id: '2c2g',
    planCode: '2C2G',
    cpuLabel: '2 CPU',
    cpuShares: 2.0,
    ramLabel: '2.0 GB RAM',
    memoryMb: 2048,
    storageGb: 10,
    monthlyPrice: 40000,
    hourlyPrice: 56,
    remainingStock: 21,
    isPopular: false,
  },
  {
    id: '2c4g',
    planCode: '2C4G',
    cpuLabel: '2 CPU',
    cpuShares: 2.0,
    ramLabel: '4.0 GB RAM',
    memoryMb: 4096,
    storageGb: 10,
    monthlyPrice: 75000,
    hourlyPrice: 105,
    remainingStock: 19,
    isPopular: false,
  },
  {
    id: '4c4g',
    planCode: '4C4G',
    cpuLabel: '4 CPU',
    cpuShares: 4.0,
    ramLabel: '4.0 GB RAM',
    memoryMb: 4096,
    storageGb: 10,
    monthlyPrice: 135000,
    hourlyPrice: 188,
    remainingStock: 10,
    isPopular: false,
  },
  {
    id: '4c8g',
    planCode: '4C8G',
    cpuLabel: '4 CPU',
    cpuShares: 4.0,
    ramLabel: '8.0 GB RAM',
    memoryMb: 8192,
    storageGb: 10,
    monthlyPrice: 225000,
    hourlyPrice: 313,
    remainingStock: 10,
    isPopular: false,
  },
  {
    id: '4c16g',
    planCode: '4C16G',
    cpuLabel: '4 CPU',
    cpuShares: 4.0,
    ramLabel: '16.0 GB RAM',
    memoryMb: 16384,
    storageGb: 10,
    monthlyPrice: 375000,
    hourlyPrice: 521,
    remainingStock: 10,
    isPopular: false,
  },
];

export function getAppDefinition(id: string): ManagedAppDefinition | undefined {
  return MANAGED_APPS_CATALOG.find(
    (app) => app.id.toLowerCase() === id.toLowerCase() || app.name.toLowerCase() === id.toLowerCase()
  );
}

export function getAppPlan(planCodeOrId: string): ManagedAppPlanDefinition | undefined {
  return MANAGED_APP_PLANS.find(
    (plan) =>
      plan.id.toLowerCase() === planCodeOrId.toLowerCase() ||
      plan.planCode.toLowerCase() === planCodeOrId.toLowerCase()
  );
}

export function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}
