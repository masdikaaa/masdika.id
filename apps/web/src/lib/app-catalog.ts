export interface ManagedAppDefinition {
  id: 'hermes' | 'ninerouter' | 'n8n' | 'opencode' | 'openclaw' | 'omniroute' | 'uptimekuma' | 'qwenpaw';
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
  minMemoryMb?: number;
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
    tagline: 'Browser Web UI & Terminal AI Coding Assistant',
    category: 'Developer Tools',
    description: 'Fast, native AI developer assistant and coding environment with a password-protected HTTPS Web Dashboard and direct SSH terminal access backed by persistent storage.',
    icon: '/images/apps/opencode.png',
    appPort: 4096,
    dataDir: '/workspace',
    defaultImage: 'docker.io/library/node:22-alpine',
    color: 'from-blue-500 to-cyan-600',
    badge: 'WEB + SSH',
    accessProtocol: 'BOTH',
    website: 'https://opencode.ai',
    github: 'https://github.com/anomalyco/opencode',
    features: [
      'Browser Web Dashboard with HTTP Basic Auth & SSL',
      'Direct High-Speed SSH Terminal Access',
      'Persistent Workspace Storage at /workspace',
      'Git Commit, Diff & Automated PR Generation',
    ],
  },
  {
    id: 'openclaw',
    name: 'OpenClaw',
    tagline: 'Multi-Channel AI Gateway with Control UI & SSH CLI',
    category: 'Autonomous Agent',
    description: 'Official OpenClaw multi-channel AI agent gateway running token-protected Control UI over HTTPS and direct SSH terminal access with persistent storage.',
    icon: '/images/apps/openclaw.png',
    appPort: 18789,
    dataDir: '/home/node/.openclaw',
    defaultImage: 'ghcr.io/openclaw/openclaw:latest',
    color: 'from-emerald-500 to-teal-600',
    badge: 'WEB + SSH',
    accessProtocol: 'BOTH',
    minMemoryMb: 2048,
    website: 'https://openclaw.ai',
    github: 'https://github.com/openclaw/openclaw',
    features: [
      'Token-Protected Browser Control UI with Auto SSL',
      'Direct SSH CLI for Device Pairing & Channel Setup',
      'WhatsApp, Telegram, Discord & Slack Agent Bridge',
      'Persistent Workspace & State (/home/node/.openclaw)',
    ],
  },
  {
    id: 'omniroute',
    name: 'OmniRoute',
    tagline: 'Multi-Provider AI Gateway & Intelligent LLM Router',
    category: 'AI Gateway',
    description: 'Self-hosted, cost-aware AI proxy and routing gateway providing unified OpenAI-compatible endpoints, smart load balancing, retries, and multi-provider failover.',
    icon: '/images/apps/omniroute.svg',
    appPort: 20128,
    dataDir: '/app/data',
    defaultImage: 'docker.io/diegosouzapw/omniroute:latest',
    color: 'from-cyan-500 to-blue-600',
    badge: 'API Gateway',
    accessProtocol: 'WEB',
    website: 'https://omniroute.online',
    github: 'https://github.com/ChrisCompton/omniroute',
    features: [
      'Unified OpenAI-Compatible Multi-Model Proxy (/v1)',
      'Smart Routing, Load Balancing & Automatic Retries',
      'Cost & Quota Awareness with Fallback Rules',
      'Compatible with Cursor, Claude Code, Cline & Continue.dev',
    ],
  },
  {
    id: 'uptimekuma',
    name: 'Uptime Kuma',
    tagline: 'Self-Hosted Monitoring Dashboard & Public Status Pages',
    category: 'Monitoring',
    description: 'Sleek self-hosted uptime monitoring tool supporting HTTP(s), TCP, Ping, DNS, and Docker checks with real-time notifications (Telegram, Discord, Slack, Webhook) and custom status pages.',
    icon: '/images/apps/uptime-kuma.svg',
    appPort: 3001,
    dataDir: '/app/data',
    defaultImage: 'docker.io/louislam/uptime-kuma:latest',
    color: 'from-emerald-500 to-teal-600',
    badge: 'Monitoring',
    accessProtocol: 'WEB',
    website: 'https://uptime.kuma.pet',
    github: 'https://github.com/louislam/uptime-kuma',
    features: [
      'HTTP(s), TCP, Ping, DNS & Keyword Uptime Monitors',
      '90+ Notification Integrations (Telegram, Discord, Slack, Email)',
      'Customizable Public Status Pages with Auto HTTPS SSL',
      'Persistent SQLite Metrics & Alert History (/app/data)',
    ],
  },
  {
    id: 'qwenpaw',
    name: 'QwenPaw',
    tagline: 'AgentScope Personal AI Assistant with Authenticated Web Console',
    category: 'AI Agent',
    description: 'Official AgentScope QwenPaw personal AI assistant featuring a password-protected HTTPS Web Console, persistent working directory, secrets vault, and automated backups.',
    icon: '/images/apps/qwenpaw.svg',
    appPort: 8088,
    dataDir: '/app/working',
    defaultImage: 'docker.io/agentscope/qwenpaw:latest',
    color: 'from-indigo-500 to-violet-600',
    badge: 'Web UI',
    accessProtocol: 'WEB',
    website: 'https://qwenpaw.agentscope.io',
    github: 'https://github.com/agentscope-ai/QwenPaw',
    features: [
      'Authenticated Web Console with Let\'s Encrypt HTTPS SSL',
      'Pre-Configured Admin Login (Username & Generated Password)',
      'Persistent Working Memory, Secrets & Backups (/app/working)',
      'Multi-Model AI Assistant Powered by AgentScope',
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
  const normalized = id.toLowerCase().trim();
  return MANAGED_APPS_CATALOG.find(
    (app) =>
      app.id.toLowerCase() === normalized ||
      app.name.toLowerCase() === normalized ||
      (app.id === 'uptimekuma' && normalized === 'uptime-kuma')
  );
}

export function getAppPlan(planCodeOrId: string): ManagedAppPlanDefinition | undefined {
  return MANAGED_APP_PLANS.find(
    (plan) =>
      plan.id.toLowerCase() === planCodeOrId.toLowerCase() ||
      plan.planCode.toLowerCase() === planCodeOrId.toLowerCase()
  );
}

export interface ResolvedAppPlanSpecs {
  planCode: string;
  cpuLabel: string;
  cpuShares: number;
  ramLabel: string;
  memoryMb: number;
  storageGb: number;
  monthlyPrice: number;
  hourlyPrice: number;
}

const VALID_APP_PLAN_CODE_REGEX = /^[A-Z0-9_-]{2,20}$/;

const RESERVED_APP_SUBDOMAINS = new Set([
  'www', 'api', 'admin', 'mail', 'smtp', 'imap', 'pop3', 'ftp', 'ssh',
  'db', 'app', 'panel', 'billing', 'status', 'traefik', 'rancher', 'argocd',
  'auth', 'login', 'root', 'system', 'internal', 'localhost', 'masdika',
]);

/**
 * Normalizes and validates custom app subdomains against RFC-1123 label rules
 * and reserved infrastructure hostnames. Returns "" to fall back to random generation.
 */
export function sanitizeCustomSubdomain(input: unknown): string {
  if (typeof input !== 'string') return '';
  const cleaned = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
    .replace(/-+$/g, '');

  if (cleaned.length < 3 || RESERVED_APP_SUBDOMAINS.has(cleaned)) {
    return '';
  }
  return cleaned;
}

/**
 * Strictly resolves an app compute plan from active DB Plan rows and/or official catalog.
 * Never performs loose substring (`contains`) matching on limits JSON so attackers cannot
 * match unintended plans via strings like "1" or "cpuShares".
 */
export function matchAppPlanFromRecords(
  planCodeInput: unknown,
  activeDbPlans: Array<{ name: string; limits: string; price: number; hourlyPrice: number | null; service?: string; isActive?: boolean }>
): ResolvedAppPlanSpecs | null {
  if (typeof planCodeInput !== 'string') return null;
  const normalized = planCodeInput.trim().toUpperCase();
  if (!normalized || !VALID_APP_PLAN_CODE_REGEX.test(normalized)) {
    return null;
  }

  const catalogPlan = getAppPlan(normalized);

  const matchedDbPlan = activeDbPlans.find((p) => {
    if (p.service && p.service !== 'APP') return false;
    if (p.isActive === false) return false;
    if (p.name.trim().toUpperCase() === normalized) return true;
    try {
      const parsed = JSON.parse(p.limits);
      const limitCode = typeof parsed?.planCode === 'string' ? parsed.planCode.trim().toUpperCase() : '';
      const limitId = typeof parsed?.id === 'string' ? parsed.id.trim().toUpperCase() : '';
      return (
        limitCode === normalized ||
        limitId === normalized ||
        (catalogPlan ? limitCode === catalogPlan.planCode.toUpperCase() : false)
      );
    } catch {
      return false;
    }
  });

  if (!matchedDbPlan && !catalogPlan) {
    return null;
  }

  let parsedLimits: Record<string, any> = {};
  if (matchedDbPlan) {
    try {
      parsedLimits = JSON.parse(matchedDbPlan.limits) || {};
    } catch {
      parsedLimits = {};
    }
  }

  const finalCode =
    (typeof parsedLimits.planCode === 'string' && parsedLimits.planCode.trim().toUpperCase()) ||
    catalogPlan?.planCode ||
    normalized;

  const cpuShares =
    Number(parsedLimits.cpuShares) ||
    parseFloat(String(parsedLimits.cpu || '')) ||
    catalogPlan?.cpuShares ||
    1.0;

  const parsedRamNum = typeof parsedLimits.ram === 'string' ? parseFloat(parsedLimits.ram) : NaN;
  const memoryMb =
    Number(parsedLimits.memoryMb) ||
    (typeof parsedLimits.ram === 'string' && parsedLimits.ram.toUpperCase().includes('GB') && !isNaN(parsedRamNum)
      ? Math.round(parsedRamNum * 1024)
      : 0) ||
    catalogPlan?.memoryMb ||
    1024;

  const storageGb = Number(parsedLimits.storageGb) || catalogPlan?.storageGb || 10;
  const monthlyPrice = matchedDbPlan ? matchedDbPlan.price : catalogPlan!.monthlyPrice;
  const hourlyPrice = matchedDbPlan
    ? matchedDbPlan.hourlyPrice || Math.max(1, Math.round(matchedDbPlan.price / 720))
    : catalogPlan!.hourlyPrice;

  return {
    planCode: finalCode,
    cpuLabel: (typeof parsedLimits.cpu === 'string' && parsedLimits.cpu) || catalogPlan?.cpuLabel || `${cpuShares} CPU`,
    cpuShares,
    ramLabel: (typeof parsedLimits.ram === 'string' && parsedLimits.ram) || catalogPlan?.ramLabel || `${memoryMb / 1024} GB RAM`,
    memoryMb,
    storageGb,
    monthlyPrice,
    hourlyPrice,
  };
}

export async function resolveAuthoritativeAppPlan(
  planCodeInput: unknown,
  prismaClient: { plan: { findMany: (args: any) => Promise<any[]> } }
): Promise<ResolvedAppPlanSpecs | null> {
  if (typeof planCodeInput !== 'string') return null;
  const normalized = planCodeInput.trim().toUpperCase();
  if (!normalized || !VALID_APP_PLAN_CODE_REGEX.test(normalized)) {
    return null;
  }

  const activeDbPlans = await prismaClient.plan.findMany({
    where: { service: 'APP', isActive: true },
    select: { name: true, limits: true, price: true, hourlyPrice: true, service: true, isActive: true },
  });

  return matchAppPlanFromRecords(normalized, activeDbPlans);
}

export function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}
