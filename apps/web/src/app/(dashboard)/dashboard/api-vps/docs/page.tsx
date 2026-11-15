'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ChevronLeft,
  Copy,
  Check,
  Terminal,
  Key,
  ShieldCheck,
  Power,
  RotateCw,
  Play,
  Square,
  List,
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';

type LangTab = 'curl' | 'node' | 'python';

interface EndpointDoc {
  id: string;
  method: 'GET' | 'POST';
  path: string;
  title: string;
  description: string;
  icon: typeof Power;
  responseExample: string;
}

const ENDPOINTS: EndpointDoc[] = [
  {
    id: 'list',
    method: 'GET',
    path: '/api/v1/vps',
    title: 'List Cloud VPS Instances',
    description: 'Returns all active Cloud VPS instances owned by your account along with their IDs, status, and IP addresses.',
    icon: List,
    responseExample: `{
  "success": true,
  "data": [
    {
      "id": 113,
      "hostname": "andika.com",
      "status": "RUNNING",
      "cpuCores": 1,
      "ramGb": 1,
      "diskGb": 20,
      "osTemplate": "Ubuntu-25.04",
      "node": "proxmox",
      "billingMode": "PAYG",
      "ipAddress": "192.168.78.2",
      "publicIp": "192.168.78.2"
    }
  ]
}`,
  },
  {
    id: 'detail',
    method: 'GET',
    path: '/api/v1/vps/{id}',
    title: 'Get VPS Details',
    description: 'Fetch details and available power action endpoints for a specific Cloud VPS instance by ID.',
    icon: Terminal,
    responseExample: `{
  "success": true,
  "data": {
    "id": 113,
    "hostname": "andika.com",
    "status": "RUNNING",
    "cpuCores": 1,
    "ramGb": 1,
    "diskGb": 20,
    "ipAddress": "192.168.78.2",
    "publicIp": "192.168.78.2",
    "endpoints": {
      "start": "/api/v1/vps/113/start",
      "stop": "/api/v1/vps/113/stop",
      "reboot": "/api/v1/vps/113/reboot"
    }
  }
}`,
  },
  {
    id: 'start',
    method: 'POST',
    path: '/api/v1/vps/{id}/start',
    title: 'Start VPS',
    description: 'Powers on a stopped Cloud VPS instance on the hypervisor and updates its status to RUNNING.',
    icon: Play,
    responseExample: `{
  "success": true,
  "data": {
    "id": 113,
    "hostname": "andika.com",
    "action": "start",
    "status": "RUNNING"
  },
  "message": "VPS 'andika.com' start command executed successfully"
}`,
  },
  {
    id: 'stop',
    method: 'POST',
    path: '/api/v1/vps/{id}/stop',
    title: 'Stop VPS',
    description: 'Powers off a running Cloud VPS instance on the hypervisor and updates its status to STOPPED.',
    icon: Square,
    responseExample: `{
  "success": true,
  "data": {
    "id": 113,
    "hostname": "andika.com",
    "action": "stop",
    "status": "STOPPED"
  },
  "message": "VPS 'andika.com' stop command executed successfully"
}`,
  },
  {
    id: 'reboot',
    method: 'POST',
    path: '/api/v1/vps/{id}/reboot',
    title: 'Reboot VPS',
    description: 'Restarts a running Cloud VPS instance cleanly on the hypervisor.',
    icon: RotateCw,
    responseExample: `{
  "success": true,
  "data": {
    "id": 113,
    "hostname": "andika.com",
    "action": "reboot",
    "status": "RUNNING"
  },
  "message": "VPS 'andika.com' reboot command executed successfully"
}`,
  },
];

export default function ApiVpsDocsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [lang, setLang] = useState<LangTab>('curl');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://masdika.id';

  const copyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Snippet copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const buildSnippet = (ep: EndpointDoc): string => {
    const resolvedPath = ep.path.replace('{id}', '113');
    const url = `${baseUrl}${resolvedPath}`;

    if (lang === 'curl') {
      return `curl -X ${ep.method} "${url}" \\\n  -H "Authorization: Bearer masdika_YOUR_API_KEY"`;
    }

    if (lang === 'node') {
      return `const res = await fetch("${url}", {\n  method: "${ep.method}",\n  headers: {\n    "Authorization": "Bearer masdika_YOUR_API_KEY"\n  }\n});\nconst data = await res.json();\nconsole.log(data);`;
    }

    return `import requests\n\nres = requests.${ep.method.toLowerCase()}(\n    "${url}",\n    headers={"Authorization": "Bearer masdika_YOUR_API_KEY"}\n)\nprint(res.json())`;
  };

  return (
    <div className="space-y-6 max-w-full pb-14">
      {/* Back Button */}
      <div>
        <Link
          href="/dashboard/api-vps"
          className={cn(
            'inline-flex items-center gap-2 text-xs font-medium px-3.5 py-2 rounded-xl transition-all border w-fit',
            isDark
              ? 'text-zinc-400 hover:text-white bg-[#0a0a0c] hover:bg-white/[0.04] border-white/[0.08] hover:border-cyan-500/40'
              : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs'
          )}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to API VPS
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className={cn('text-2xl font-bold tracking-tight', isDark ? 'text-white' : 'text-slate-900')}>
              API VPS Documentation
            </h1>
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border',
                isDark
                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                  : 'bg-cyan-50 text-cyan-700 border-cyan-200'
              )}
            >
              v1 • Free REST API
            </span>
          </div>
          <p className={cn('text-sm mt-1', isDark ? 'text-zinc-400' : 'text-slate-600')}>
            Complete reference for listing instances and executing start, stop, and reboot actions on
            your Cloud VPS.
          </p>
        </div>

        {/* Language Selector */}
        <div
          className={cn(
            'flex items-center gap-1 p-1 rounded-xl border w-fit',
            isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200 shadow-sm'
          )}
        >
          {(['curl', 'node', 'python'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setLang(tab)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                lang === tab
                  ? 'bg-cyan-400 text-zinc-950'
                  : isDark
                  ? 'text-zinc-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              {tab === 'curl' ? 'cURL' : tab === 'node' ? 'Node.js' : 'Python'}
            </button>
          ))}
        </div>
      </div>

      {/* Authentication Card */}
      <div
        className={cn(
          'rounded-2xl border p-5 sm:p-6 space-y-3',
          isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200 shadow-sm'
        )}
      >
        <div className="flex items-center gap-2 text-sm font-bold text-cyan-400">
          <Key className="w-4 h-4" />
          Authentication
        </div>
        <p className={cn('text-xs sm:text-sm', isDark ? 'text-zinc-300' : 'text-slate-700')}>
          Include your free API key in every request using either the{' '}
          <code className="font-mono text-cyan-400">Authorization: Bearer &lt;API_KEY&gt;</code>{' '}
          header or the <code className="font-mono text-cyan-400">x-api-key: &lt;API_KEY&gt;</code>{' '}
          header.
        </p>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>Rate limit: 120 GET requests/min and 30 power actions/min per account.</span>
        </div>
      </div>

      {/* Endpoints */}
      <div className="space-y-4">
        {ENDPOINTS.map((ep) => {
          const Icon = ep.icon;
          const snippet = buildSnippet(ep);

          return (
            <div
              key={ep.id}
              className={cn(
                'rounded-2xl border p-5 sm:p-6 space-y-4',
                isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200 shadow-sm'
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span
                    className={cn(
                      'px-2.5 py-0.5 rounded-md text-xs font-mono font-bold border',
                      ep.method === 'POST'
                        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                        : isDark
                        ? 'bg-zinc-800 text-zinc-200 border-white/[0.08]'
                        : 'bg-slate-100 text-slate-800 border-slate-200'
                    )}
                  >
                    {ep.method}
                  </span>
                  <code className={cn('font-mono text-sm font-semibold', isDark ? 'text-white' : 'text-slate-900')}>
                    {ep.path}
                  </code>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400">
                  <Icon className="w-4 h-4" />
                  {ep.title}
                </div>
              </div>

              <p className={cn('text-xs sm:text-sm', isDark ? 'text-zinc-400' : 'text-slate-600')}>
                {ep.description}
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={cn('text-[11px] font-bold uppercase tracking-wider', isDark ? 'text-zinc-500' : 'text-slate-500')}>
                      Request Example
                    </span>
                    <button
                      onClick={() => copyCode(snippet, `req-${ep.id}`)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-cyan-400 hover:text-cyan-300"
                    >
                      {copiedId === `req-${ep.id}` ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      Copy
                    </button>
                  </div>
                  <pre
                    className={cn(
                      'p-4 rounded-xl border text-xs font-mono overflow-x-auto leading-relaxed',
                      isDark
                        ? 'bg-[#0a0a0c] border-white/[0.08] text-zinc-300'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    )}
                  >
                    {snippet}
                  </pre>
                </div>

                <div className="space-y-2">
                  <span className={cn('text-[11px] font-bold uppercase tracking-wider block', isDark ? 'text-zinc-500' : 'text-slate-500')}>
                    200 OK Response
                  </span>
                  <pre
                    className={cn(
                      'p-4 rounded-xl border text-xs font-mono overflow-x-auto leading-relaxed',
                      isDark
                        ? 'bg-[#0a0a0c] border-white/[0.08] text-cyan-300/90'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    )}
                  >
                    {ep.responseExample}
                  </pre>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status Codes */}
      <div
        className={cn(
          'rounded-2xl border p-5 sm:p-6 space-y-3',
          isDark ? 'bg-[#111115] border-white/[0.08]' : 'bg-white border-slate-200 shadow-sm'
        )}
      >
        <h2 className={cn('text-sm font-bold', isDark ? 'text-white' : 'text-slate-900')}>
          HTTP Status Codes
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {[
            { code: '200 OK', desc: 'Request or power action succeeded.' },
            { code: '401 Unauthorized', desc: 'Missing or invalid API key.' },
            { code: '403 Forbidden', desc: 'Key revoked or VPS/account suspended.' },
            { code: '404 Not Found', desc: 'VPS instance not found or not owned by you.' },
            { code: '409 Conflict', desc: 'VPS is still provisioning or hypervisor locked.' },
            { code: '429 Too Many Requests', desc: 'Rate limit exceeded; retry shortly.' },
          ].map((item) => (
            <div
              key={item.code}
              className={cn(
                'p-3 rounded-xl border',
                isDark ? 'bg-[#0a0a0c] border-white/[0.06]' : 'bg-slate-50 border-slate-200'
              )}
            >
              <div className="font-mono font-bold text-cyan-400">{item.code}</div>
              <div className={cn('mt-1', isDark ? 'text-zinc-400' : 'text-slate-600')}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
