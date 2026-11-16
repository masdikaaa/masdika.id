"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Copy,
  Check,
  KeyRound,
  ShieldCheck,
  Terminal,
  Cpu,
  Activity,
  Camera,
  Shield,
  Network,
  Layers,
  HardDrive,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

type Lang = "curl" | "node" | "python";
type Category =
  | "ALL"
  | "POWER"
  | "UPGRADE"
  | "METRICS"
  | "SNAPSHOTS"
  | "BACKUPS"
  | "FIREWALL"
  | "IPS";

export interface EndpointSpec {
  id: string;
  category: Exclude<Category, "ALL">;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  title: string;
  description: string;
  body?: Record<string, any>;
  responseStatus: string;
  response: Record<string, any>;
}

const ENDPOINTS: EndpointSpec[] = [
  {
    id: "list-vps",
    category: "POWER",
    method: "GET",
    path: "/api/v1/vps",
    title: "List Cloud VPS Instances",
    description:
      "Returns all active Cloud VPS instances owned by your account along with their IDs, status, specs, and IP addresses.",
    responseStatus: "200 OK",
    response: {
      success: true,
      data: [
        {
          id: 113,
          hostname: "andika.com",
          status: "RUNNING",
          cpuCores: 1,
          ramGb: 1,
          diskGb: 20,
          osTemplate: "Ubuntu-25.04",
          node: "proxmox",
          billingMode: "PAYG",
          ipAddress: "192.168.78.2",
          publicIp: "192.168.78.2",
        },
      ],
    },
  },
  {
    id: "detail-vps",
    category: "POWER",
    method: "GET",
    path: "/api/v1/vps/113",
    title: "Get VPS Instance Details",
    description:
      "Fetches detailed specifications, networking, and available power control endpoints for a specific VPS.",
    responseStatus: "200 OK",
    response: {
      success: true,
      data: {
        id: 113,
        hostname: "andika.com",
        status: "RUNNING",
        cpuCores: 1,
        ramGb: 1,
        diskGb: 20,
        osTemplate: "Ubuntu-25.04",
        node: "proxmox",
        billingMode: "PAYG",
        ipAddress: "192.168.78.2",
        publicIp: "192.168.78.2",
        endpoints: {
          start: "/api/v1/vps/113/start",
          stop: "/api/v1/vps/113/stop",
          reboot: "/api/v1/vps/113/reboot",
        },
      },
    },
  },
  {
    id: "start-vps",
    category: "POWER",
    method: "POST",
    path: "/api/v1/vps/113/start",
    title: "Start VPS Instance",
    description:
      "Powers on a stopped Cloud VPS instance via the Proxmox hypervisor and updates its status to RUNNING.",
    responseStatus: "200 OK",
    response: {
      success: true,
      data: { id: 113, hostname: "andika.com", action: "start", status: "RUNNING" },
      message: "VPS 'andika.com' start command executed successfully",
    },
  },
  {
    id: "stop-vps",
    category: "POWER",
    method: "POST",
    path: "/api/v1/vps/113/stop",
    title: "Stop VPS Instance",
    description:
      "Immediately stops a running Cloud VPS instance and updates its status to STOPPED.",
    responseStatus: "200 OK",
    response: {
      success: true,
      data: { id: 113, hostname: "andika.com", action: "stop", status: "STOPPED" },
      message: "VPS 'andika.com' stop command executed successfully",
    },
  },
  {
    id: "reboot-vps",
    category: "POWER",
    method: "POST",
    path: "/api/v1/vps/113/reboot",
    title: "Reboot VPS Instance",
    description:
      "Triggers a clean hypervisor reboot on a running Cloud VPS instance.",
    responseStatus: "200 OK",
    response: {
      success: true,
      data: { id: 113, hostname: "andika.com", action: "reboot", status: "RUNNING" },
      message: "VPS 'andika.com' reboot command executed successfully",
    },
  },
  {
    id: "vps-pricing",
    category: "UPGRADE",
    method: "GET",
    path: "/api/v1/vps/pricing",
    title: "Get Upgrade Pricing & Bandwidth Tiers",
    description:
      "Retrieves current hourly PAYG resource rates (CPU, RAM, Disk, IPs) and allowed bandwidth tiers starting from 100 Mbps.",
    responseStatus: "200 OK",
    response: {
      success: true,
      data: {
        currency: "IDR",
        hourlyRates: {
          cpu: 14,
          ram: 14,
          disk_ssd: 1,
          ipv4: 20,
          ipv6: 20,
        },
        bandwidthOptionsMbps: [100, 150, 200, 250, 300],
      },
    },
  },
  {
    id: "upgrade-vps",
    category: "UPGRADE",
    method: "POST",
    path: "/api/v1/vps/113/upgrade",
    title: "Upgrade VPS Hardware & Bandwidth",
    description:
      "Scales up CPU cores, RAM, Disk GB, or Bandwidth Mbps (e.g. 100 → 150 Mbps) on your VPS. Downgrades are blocked and balance is validated server-side.",
    body: {
      cpuCores: 2,
      ramGb: 4,
      diskGb: 40,
      bandwidthMbps: 150,
    },
    responseStatus: "200 OK",
    response: {
      success: true,
      data: {
        id: 113,
        hostname: "andika.com",
        cpuCores: 2,
        ramGb: 4,
        diskGb: 40,
        bandwidthMbps: 150,
        hourlyRate: 147,
        status: "RUNNING",
      },
      message: "VPS 'andika.com' upgraded successfully",
    },
  },
  {
    id: "vps-metrics",
    category: "METRICS",
    method: "GET",
    path: "/api/v1/vps/113/metrics?timeframe=hour",
    title: "Get Live & Historical Metrics",
    description:
      "Returns live CPU, memory, network I/O, and uptime telemetry along with RRD time-series history (hour, day, week, month, year).",
    responseStatus: "200 OK",
    response: {
      success: true,
      data: {
        id: 113,
        hostname: "andika.com",
        timeframe: "hour",
        live: {
          status: "running",
          cpuPercent: 1.42,
          memUsedMb: 612,
          memTotalMb: 1024,
          uptimeSeconds: 54210,
        },
        history: [
          {
            timestamp: "2026-11-16T06:00:00.000Z",
            cpuPercent: 1.15,
            memUsedMb: 608,
            memTotalMb: 1024,
          },
        ],
      },
    },
  },
  {
    id: "list-snapshots",
    category: "SNAPSHOTS",
    method: "GET",
    path: "/api/v1/vps/113/snapshots",
    title: "List VPS Snapshots",
    description: "Lists all snapshots currently stored for the VPS instance.",
    responseStatus: "200 OK",
    response: {
      success: true,
      data: [
        {
          name: "pre_deploy_v2",
          description: "Before nginx upgrade",
          snaptime: 1794784000,
          vmstate: 0,
        },
      ],
    },
  },
  {
    id: "create-snapshot",
    category: "SNAPSHOTS",
    method: "POST",
    path: "/api/v1/vps/113/snapshots",
    title: "Create VPS Snapshot",
    description:
      "Creates a point-in-time snapshot of your VPS disk (and optionally RAM state with includeRam: true).",
    body: {
      snapname: "pre_deploy_v2",
      description: "Before nginx upgrade",
      includeRam: false,
    },
    responseStatus: "201 Created",
    response: {
      success: true,
      data: { vpsId: 113, snapname: "pre_deploy_v2", task: "UPID:proxmox:..." },
      message: "Snapshot 'pre_deploy_v2' creation initiated",
    },
  },
  {
    id: "rollback-snapshot",
    category: "SNAPSHOTS",
    method: "POST",
    path: "/api/v1/vps/113/snapshots/pre_deploy_v2",
    title: "Rollback to Snapshot",
    description: "Restores the VPS disk/state back to the specified snapshot.",
    responseStatus: "200 OK",
    response: {
      success: true,
      data: { vpsId: 113, snapname: "pre_deploy_v2", task: "UPID:proxmox:..." },
      message: "Rollback to snapshot 'pre_deploy_v2' initiated",
    },
  },
  {
    id: "delete-snapshot",
    category: "SNAPSHOTS",
    method: "DELETE",
    path: "/api/v1/vps/113/snapshots/pre_deploy_v2",
    title: "Delete Snapshot",
    description: "Deletes a snapshot from the VPS to reclaim storage.",
    responseStatus: "200 OK",
    response: {
      success: true,
      data: { vpsId: 113, snapname: "pre_deploy_v2", task: "UPID:proxmox:..." },
      message: "Snapshot 'pre_deploy_v2' deleted",
    },
  },
  {
    id: "list-backups",
    category: "BACKUPS",
    method: "GET",
    path: "/api/v1/vps/113/backups",
    title: "List VPS Backups",
    description: "Lists all backups stored for this VPS along with quota usage.",
    responseStatus: "200 OK",
    response: {
      success: true,
      data: {
        quotaGb: 20,
        usedBytes: 1073741824,
        backups: [
          {
            volume: "local:backup/vzdump-qemu-113-2026_11_16.vma.zst",
            size: 1073741824,
            format: "vma.zst",
            ctime: 1794784000,
          },
        ],
      },
    },
  },
  {
    id: "create-backup",
    category: "BACKUPS",
    method: "POST",
    path: "/api/v1/vps/113/backups",
    title: "Create VPS Backup",
    description: "Initiates a full vzdump backup on the Proxmox backup storage (requires backup addon quota).",
    responseStatus: "201 Created",
    response: {
      success: true,
      data: { vpsId: 113, task: "UPID:proxmox:..." },
      message: "Backup job initiated",
    },
  },
  {
    id: "delete-backup",
    category: "BACKUPS",
    method: "DELETE",
    path: "/api/v1/vps/113/backups?volume=local:backup/vzdump-qemu-113.vma.zst",
    title: "Delete VPS Backup",
    description: "Deletes a specific backup archive volume belonging to this VPS.",
    responseStatus: "200 OK",
    response: {
      success: true,
      message: "Backup 'local:backup/vzdump-qemu-113.vma.zst' deleted",
    },
  },
  {
    id: "list-firewall",
    category: "FIREWALL",
    method: "GET",
    path: "/api/v1/vps/113/firewall",
    title: "List Firewall Rules",
    description: "Retrieves all inbound and outbound firewall rules configured on the VPS.",
    responseStatus: "200 OK",
    response: {
      success: true,
      data: [
        {
          pos: 0,
          type: "in",
          action: "ACCEPT",
          proto: "tcp",
          dport: "443",
          enable: 1,
          comment: "Allow HTTPS",
        },
      ],
    },
  },
  {
    id: "create-firewall",
    category: "FIREWALL",
    method: "POST",
    path: "/api/v1/vps/113/firewall",
    title: "Create Firewall Rule",
    description:
      "Adds a new inbound ('in') or outbound ('out') firewall rule with ACCEPT, DROP, or REJECT action.",
    body: {
      type: "in",
      action: "ACCEPT",
      proto: "tcp",
      dport: "443",
      enable: 1,
      comment: "Allow HTTPS",
    },
    responseStatus: "201 Created",
    response: {
      success: true,
      data: null,
      message: "Firewall rule created successfully",
    },
  },
  {
    id: "update-firewall",
    category: "FIREWALL",
    method: "PUT",
    path: "/api/v1/vps/113/firewall/0",
    title: "Update Firewall Rule",
    description: "Updates an existing custom firewall rule (e.g., enable/disable or change port/action) at position index.",
    body: {
      enable: 0,
      comment: "Temporarily disabled",
    },
    responseStatus: "200 OK",
    response: {
      success: true,
      message: "Firewall rule #0 updated",
    },
  },
  {
    id: "delete-firewall",
    category: "FIREWALL",
    method: "DELETE",
    path: "/api/v1/vps/113/firewall/0",
    title: "Delete Firewall Rule",
    description:
      "Removes a custom firewall rule by its position index (system-managed VPC/node rules are protected).",
    responseStatus: "200 OK",
    response: {
      success: true,
      message: "Firewall rule #0 deleted",
    },
  },
  {
    id: "list-ips",
    category: "IPS",
    method: "GET",
    path: "/api/v1/vps/ips",
    title: "List Elastic Static IPs",
    description:
      "Lists all Elastic Static IPv4/IPv6 addresses allocated to your account and shows which VPS they are attached to.",
    responseStatus: "200 OK",
    response: {
      success: true,
      data: [
        {
          id: 9,
          ipAddress: "103.180.10.25",
          publicIp: "103.180.10.25",
          version: 4,
          hourlyRate: 20,
          isAttached: true,
          vps: { id: 113, hostname: "andika.com", status: "RUNNING" },
        },
      ],
    },
  },
];

const CATEGORIES: { key: Category; label: string; icon: any }[] = [
  { key: "ALL", label: "All Endpoints", icon: Layers },
  { key: "POWER", label: "Instances & Power", icon: Terminal },
  { key: "UPGRADE", label: "Upgrade & Pricing", icon: Cpu },
  { key: "METRICS", label: "Metrics", icon: Activity },
  { key: "SNAPSHOTS", label: "Snapshots", icon: Camera },
  { key: "BACKUPS", label: "Backups", icon: HardDrive },
  { key: "FIREWALL", label: "Firewall", icon: Shield },
  { key: "IPS", label: "Elastic IPs", icon: Network },
];

function buildSnippet(lang: Lang, baseUrl: string, ep: EndpointSpec): string {
  const url = `${baseUrl}${ep.path}`;
  const bodyJson = ep.body ? JSON.stringify(ep.body, null, 2) : null;

  if (lang === "curl") {
    if (bodyJson) {
      return `curl -X ${ep.method} "${url}" \\\n  -H "Authorization: Bearer masdika_YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(ep.body)}'`;
    }
    return `curl -X ${ep.method} "${url}" \\\n  -H "Authorization: Bearer masdika_YOUR_API_KEY"`;
  }

  if (lang === "node") {
    if (bodyJson) {
      return `const res = await fetch("${url}", {\n  method: "${ep.method}",\n  headers: {\n    "Authorization": "Bearer masdika_YOUR_API_KEY",\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify(${JSON.stringify(ep.body)})\n});\nconst data = await res.json();\nconsole.log(data);`;
    }
    return `const res = await fetch("${url}", {\n  method: "${ep.method}",\n  headers: { "Authorization": "Bearer masdika_YOUR_API_KEY" }\n});\nconst data = await res.json();\nconsole.log(data);`;
  }

  const pyMethod = ep.method.toLowerCase();
  if (bodyJson) {
    return `import requests\n\nres = requests.${pyMethod}(\n    "${url}",\n    headers={"Authorization": "Bearer masdika_YOUR_API_KEY"},\n    json=${JSON.stringify(ep.body, null, 4)}\n)\nprint(res.json())`;
  }
  return `import requests\n\nres = requests.${pyMethod}(\n    "${url}",\n    headers={"Authorization": "Bearer masdika_YOUR_API_KEY"}\n)\nprint(res.json())`;
}

function MacTerminalWindow({
  title,
  badge,
  code,
  copied,
  onCopy,
  isDark,
}: {
  title: string;
  badge?: string;
  code: string;
  copied: boolean;
  onCopy: () => void;
  isDark: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden shadow-lg",
        isDark
          ? "bg-[#09090b] border-white/[0.08]"
          : "bg-slate-950 border-slate-800"
      )}
    >
      {/* macOS Title Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#16161b] border-b border-white/[0.07]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
          <span className="ml-2 text-[11px] font-mono text-zinc-400">{title}</span>
        </div>

        <div className="flex items-center gap-2.5">
          {badge && (
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {badge}
            </span>
          )}
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* Code Body */}
      <pre className="p-3.5 text-xs font-mono text-zinc-200 overflow-x-auto leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

export default function ApiVpsDocsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [lang, setLang] = useState<Lang>("curl");
  const [category, setCategory] = useState<Category>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [livePricing, setLivePricing] = useState<Record<string, number> | null>(null);
  const [liveBandwidthOptions, setLiveBandwidthOptions] = useState<number[] | null>(null);
  const [liveVps, setLiveVps] = useState<{ id: number; hostname: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/user/vps/order-data").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/user/vps").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([orderData, vpsData]) => {
        if (orderData?.pricing && typeof orderData.pricing === "object") {
          setLivePricing(orderData.pricing);
        }
        if (Array.isArray(orderData?.bandwidthOptions) && orderData.bandwidthOptions.length > 0) {
          setLiveBandwidthOptions(orderData.bandwidthOptions);
        }
        if (Array.isArray(vpsData) && vpsData.length > 0) {
          setLiveVps({ id: vpsData[0].id, hostname: vpsData[0].hostname });
        }
      })
      .catch(() => {});
  }, []);

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "https://masdika.id";

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 1800);
  };

  const hydratedEndpoints = useMemo(() => {
    const sampleId = liveVps?.id ?? 113;
    const sampleHost = liveVps?.hostname ?? "andika.com";
    const bwOptions = liveBandwidthOptions ?? [100, 150, 200, 250, 300];
    const nextBw = bwOptions.find((b) => b > 100) ?? 150;

    return ENDPOINTS.map((ep) => {
      const path = ep.path.replace("/vps/113", `/vps/${sampleId}`);
      if (ep.id === "vps-pricing") {
        return {
          ...ep,
          path,
          response: {
            success: true,
            data: {
              currency: "IDR",
              hourlyRates: livePricing ?? ep.response.data.hourlyRates,
              bandwidthOptionsMbps: bwOptions,
            },
          },
        };
      }
      if (ep.id === "upgrade-vps") {
        return {
          ...ep,
          path,
          body: { ...(ep.body || {}), bandwidthMbps: nextBw },
          response: {
            ...ep.response,
            data: { ...ep.response.data, id: sampleId, hostname: sampleHost, bandwidthMbps: nextBw },
            message: `VPS '${sampleHost}' upgraded successfully`,
          },
        };
      }
      return { ...ep, path };
    });
  }, [liveVps, livePricing, liveBandwidthOptions]);

  const filteredEndpoints =
    category === "ALL"
      ? hydratedEndpoints
      : hydratedEndpoints.filter((ep) => ep.category === category);

  const fileLabel = lang === "curl" ? "request.sh" : lang === "node" ? "client.mjs" : "client.py";

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard/api-vps"
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border mb-3 transition-colors",
              isDark
                ? "bg-[#111115] border-white/[0.08] text-zinc-300 hover:text-white"
                : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"
            )}
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back to API VPS
          </Link>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1
              className={cn(
                "text-2xl font-bold tracking-tight",
                isDark ? "text-white" : "text-slate-900"
              )}
            >
              API VPS Documentation
            </h1>
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border",
                isDark
                  ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                  : "bg-cyan-50 border-cyan-200 text-cyan-700"
              )}
            >
              v1 • {ENDPOINTS.length} Endpoints • 100% Free
            </span>
          </div>
          <p className={cn("text-sm mt-1", isDark ? "text-zinc-400" : "text-slate-600")}>
            Complete REST API reference for VPS power control, hardware upgrades, metrics, snapshots, firewall rules, and Elastic Static IPs.
          </p>
        </div>

        {/* Language Selector */}
        <div
          className={cn(
            "inline-flex p-1 rounded-xl border self-start",
            isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200"
          )}
        >
          {(["curl", "node", "python"] as Lang[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setLang(item)}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                lang === item
                  ? "bg-cyan-500 text-slate-950"
                  : isDark
                  ? "text-zinc-400 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              {item === "curl" ? "cURL" : item === "node" ? "Node.js" : "Python"}
            </button>
          ))}
        </div>
      </div>

      {/* Authentication Notice */}
      <div
        className={cn(
          "rounded-2xl border p-5 space-y-2",
          isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200 shadow-2xs"
        )}
      >
        <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
          <KeyRound className="w-4 h-4" /> Authentication & Rate Limits
        </div>
        <p className={cn("text-xs leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>
          Include your free API key in every request using either{" "}
          <code className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono">
            Authorization: Bearer &lt;API_KEY&gt;
          </code>{" "}
          or the{" "}
          <code className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono">
            x-api-key: &lt;API_KEY&gt;
          </code>{" "}
          header.
        </p>
        <div className="flex items-center gap-2 text-[11px] text-zinc-500 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          100% Free REST API • Rate limit: 120 GET requests/min, 30 write/power actions/min per account.
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const active = category === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setCategory(cat.key)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all",
                active
                  ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-400"
                  : isDark
                  ? "bg-[#111115] border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/[0.16]"
                  : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Endpoints */}
      <div className="space-y-4">
        {filteredEndpoints.map((ep) => {
          const snippet = buildSnippet(lang, baseUrl, ep);
          const responseJson = JSON.stringify(ep.response, null, 2);
          const methodStyle =
            ep.method === "GET"
              ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
              : ep.method === "POST"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : ep.method === "PUT"
              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-400";

          return (
            <div
              key={ep.id}
              className={cn(
                "rounded-2xl border p-5 space-y-4",
                isDark
                  ? "bg-[#111115] border-white/[0.08]"
                  : "bg-white border-slate-200 shadow-2xs"
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold border",
                      methodStyle
                    )}
                  >
                    {ep.method}
                  </span>
                  <code
                    className={cn(
                      "text-sm font-mono font-semibold",
                      isDark ? "text-white" : "text-slate-900"
                    )}
                  >
                    {ep.path}
                  </code>
                </div>
                <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" /> {ep.title}
                </span>
              </div>

              <p className={cn("text-xs", isDark ? "text-zinc-400" : "text-slate-600")}>
                {ep.description}
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <MacTerminalWindow
                  title={fileLabel}
                  code={snippet}
                  copied={copiedId === `${ep.id}-req`}
                  onCopy={() => copyText(`${ep.id}-req`, snippet)}
                  isDark={isDark}
                />

                <MacTerminalWindow
                  title="response.json"
                  badge={ep.responseStatus}
                  code={responseJson}
                  copied={copiedId === `${ep.id}-res`}
                  onCopy={() => copyText(`${ep.id}-res`, responseJson)}
                  isDark={isDark}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
