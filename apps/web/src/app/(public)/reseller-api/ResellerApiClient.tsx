"use client";

import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { ArrowRight, BookOpen, Key, Link as LinkIcon, Server, ShieldCheck, Zap, Cloud, CheckCircle2, Activity, CodeXml, Copy, Check, ChevronRight, Terminal, Wallet, Trash2, RotateCcw, Monitor, Power, List, ImageIcon } from "lucide-react";
import Link from "next/link";
import { FadeIn } from "@/components/animations/FadeIn";
import { MagneticButton } from "@/components/animations/MagneticButton";
import { useState, useEffect, useRef } from "react";

/* ─── Reusable Copy Button ─── */
const CopyBtn = ({ text, isDark, small }: { text: string; isDark: boolean; small?: boolean }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className={cn("rounded-md transition-all shrink-0", small ? "p-1" : "p-1.5", isDark ? "hover:bg-white/10 text-zinc-500 hover:text-zinc-300" : "hover:bg-slate-200 text-slate-400 hover:text-slate-600")} title="Copy">
      {copied ? <Check className={cn("text-emerald-500", small ? "w-3 h-3" : "w-3.5 h-3.5")} /> : <Copy className={small ? "w-3 h-3" : "w-3.5 h-3.5"} />}
    </button>
  );
};

/* ─── Method Badge ─── */
const MethodBadge = ({ method }: { method: string }) => {
  const colors: Record<string, string> = {
    GET: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    POST: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    DELETE: "bg-red-500/15 text-red-400 border-red-500/20",
    PUT: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    PATCH: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  };
  return (
    <span className={cn("px-2 py-0.5 rounded text-[11px] font-black tracking-wider border", colors[method] || colors.GET)}>
      {method}
    </span>
  );
};

/* ─── Code Block ─── */
const CodeBlock = ({ isDark, title, children, raw }: { isDark: boolean; title: string; children: React.ReactNode; raw?: string }) => (
  <div className={cn("rounded-xl border overflow-hidden", isDark ? "bg-[#080d1a] border-slate-700/60 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
    <div className={cn("flex items-center justify-between px-4 py-2.5 border-b", isDark ? "border-slate-700/60 bg-white/[0.02]" : "border-slate-100 bg-slate-50/80")}>
      <span className={cn("text-[10px] font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-400")}>{title}</span>
      {raw && <CopyBtn text={raw} isDark={isDark} small />}
    </div>
    <div className="p-4 overflow-x-auto">
      <pre className={cn("font-mono text-[13px] leading-[1.7]", isDark ? "text-zinc-300" : "text-slate-700")}>
        {children}
      </pre>
    </div>
  </div>
);

/* ─── Endpoint Section ─── */
const EndpointSection = ({ isDark, id, title, icon: Icon, method, endpoint, description, parameters, payload, response }: any) => {
  let curlCommand = `curl "https://www.masdika.id${endpoint}" \\\n  -H "Authorization: Bearer masdika_YOUR_SECRET_KEY" \\\n  -X ${method}`;
  if (payload) {
    curlCommand += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${payload}'`;
  }

  return (
    <section id={id} className={cn("scroll-mt-24 border-b last:border-b-0", isDark ? "border-white/[0.06]" : "border-slate-200")}>
      <div className="grid grid-cols-1 xl:grid-cols-2">
        {/* Left: Documentation */}
        <div className={cn("p-6 md:p-8 lg:p-10", isDark ? "" : "")}>
          <div className="flex items-center gap-3 mb-4">
            <MethodBadge method={method} />
            <h2 className={cn("text-xl font-bold flex items-center gap-2 group", isDark ? "text-white" : "text-slate-900")}>
              {title}
              <a href={`#${id}`} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-cyan-500">
                <LinkIcon className="w-3.5 h-3.5" />
              </a>
            </h2>
          </div>

          <div className={cn("mb-6", isDark ? "text-zinc-400" : "text-slate-600")}>
            <p className="text-sm leading-relaxed">{description}</p>
          </div>

          {/* Endpoint */}
          <div className="mb-6">
            <div className={cn("flex items-center gap-2 px-4 py-2.5 rounded-lg border font-mono text-sm overflow-x-auto", isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-slate-50 border-slate-200")}>
              <span className={cn("font-black text-xs",
                method === "GET" ? "text-blue-400" :
                  method === "POST" ? "text-emerald-400" :
                    method === "DELETE" ? "text-red-400" :
                      "text-amber-400"
              )}>{method}</span>
              <span className={isDark ? "text-zinc-300" : "text-slate-600"}>https://www.masdika.id{endpoint}</span>
            </div>
          </div>

          {/* Parameters Table */}
          {parameters && (
            <div>
              <h3 className={cn("text-[11px] font-bold uppercase tracking-widest mb-3", isDark ? "text-zinc-600" : "text-slate-400")}>Parameters</h3>
              <div className={cn("rounded-lg border overflow-x-auto", isDark ? "border-white/[0.06]" : "border-slate-200")}>
                <table className="w-full min-w-[500px] text-sm text-left">
                  <thead className={cn("text-[10px] uppercase tracking-wider border-b", isDark ? "bg-white/[0.02] border-white/[0.06] text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-400")}>
                    <tr>
                      <th className="px-4 py-2.5 font-bold">Parameter</th>
                      <th className="px-4 py-2.5 font-bold">Type</th>
                      <th className="px-4 py-2.5 font-bold">Description</th>
                    </tr>
                  </thead>
                  <tbody className={cn("divide-y", isDark ? "divide-white/[0.04]" : "divide-slate-100")}>
                    {parameters.map((p: any, i: number) => (
                      <tr key={i} className={isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50/50"}>
                        <td className={cn("px-4 py-2.5 font-mono text-[12px] font-bold", isDark ? "text-cyan-400" : "text-cyan-600")}>{p.name}</td>
                        <td className={cn("px-4 py-2.5 text-[12px]", isDark ? "text-zinc-600" : "text-slate-400")}>{p.type}</td>
                        <td className={cn("px-4 py-2.5 text-[12px]", isDark ? "text-zinc-400" : "text-slate-600")}>{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right: Code Examples */}
        <div className={cn("p-6 md:p-8 lg:p-10 border-t xl:border-t-0 xl:border-l space-y-6", isDark ? "bg-white/[0.015] border-white/[0.06]" : "bg-slate-50/50 border-slate-200")}>
          {payload !== undefined && (
            <CodeBlock isDark={isDark} title="Request" raw={curlCommand}>
              <span className={isDark ? "text-pink-400" : "text-pink-600"}>curl</span> <span className={isDark ? "text-amber-300" : "text-amber-600"}>&quot;https://www.masdika.id{endpoint}&quot;</span> \<br />
              <span className={isDark ? "text-pink-400" : "text-pink-600"}>  -H</span> <span className={isDark ? "text-amber-300" : "text-amber-600"}>&quot;Authorization: Bearer masdika_YOUR_SECRET_KEY&quot;</span> \<br />
              <span className={isDark ? "text-pink-400" : "text-pink-600"}>  -X</span> <span className={isDark ? "text-cyan-400" : "text-cyan-600"}>{method}</span>
              {payload && (
                <>
                  {` \\\n`}
                  <span className={isDark ? "text-pink-400" : "text-pink-600"}>  -H</span> <span className={isDark ? "text-amber-300" : "text-amber-600"}>&quot;Content-Type: application/json&quot;</span> \<br />
                  <span className={isDark ? "text-pink-400" : "text-pink-600"}>  -d</span> <span className={isDark ? "text-emerald-400" : "text-emerald-600"}>&#39;{payload}&#39;</span>
                </>
              )}
            </CodeBlock>
          )}

          {response !== undefined && (
            <CodeBlock isDark={isDark} title="Response" raw={response}>
              <code className={isDark ? "text-emerald-400" : "text-emerald-600"}>{response}</code>
            </CodeBlock>
          )}
        </div>
      </div>
    </section>
  );
};

/* ─── Sidebar Navigation ─── */
const navSections = [
  {
    label: "Getting Started",
    items: [
      { id: "introduction", label: "Introduction", icon: BookOpen },
      { id: "authentication", label: "Authentication", icon: Key },
    ],
  },
  {
    label: "Virtual Machines",
    items: [
      { id: "list-images", label: "List OS Images", icon: ImageIcon },
      { id: "create-vm", label: "Create VM", icon: Server },
      { id: "list-vms", label: "List VMs", icon: List },
      { id: "get-vm", label: "Get VM Info", icon: Activity },
      { id: "power-vm", label: "Power Management", icon: Power },
      { id: "reinstall-vm", label: "Reinstall VM", icon: RotateCcw },
      { id: "vnc-console", label: "VNC Console", icon: Monitor },
      { id: "delete-vm", label: "Delete VM", icon: Trash2 },
    ],
  },
  {
    label: "Billing",
    items: [
      { id: "get-balance", label: "Get Balance", icon: Wallet },
      { id: "topup-balance", label: "Top Up Balance (Deposit)", icon: Zap },
      { id: "topup-methods", label: "Payment Methods & Status", icon: List },
      { id: "integration-guide", label: "Integration Guide", icon: CodeXml },
    ],
  },
];

export default function ResellerApiClient() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [activeId, setActiveId] = useState("introduction");

  // Scroll spy
  useEffect(() => {
    const allIds = navSections.flatMap(s => s.items.map(i => i.id));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0.1 }
    );
    allIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className={cn("w-full min-h-screen pt-24 md:pt-32 pb-20 relative overflow-hidden font-sans bg-transparent", isDark ? "text-white selection:bg-cyan-500/30" : "text-slate-900 selection:bg-cyan-100")}>

      {/* ══════════ Hero ══════════ */}
      <section className="relative w-full pt-10 pb-8 px-4 sm:px-6 z-10">
        <div className="max-w-5xl mx-auto text-center">
          <FadeIn direction="up">
            <div className={cn("inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-black tracking-widest uppercase mb-8 shadow-sm", isDark ? "border-cyan-800/80 bg-cyan-950/30 text-cyan-400" : "border-cyan-200 bg-cyan-50 text-cyan-700")}>
              MASDIKA RESELLER API
            </div>
          </FadeIn>

          <FadeIn direction="up" delay={0.1}>
            <h1 className={cn("text-5xl md:text-7xl font-black tracking-tighter mb-8 leading-[1.1]", isDark ? "text-white" : "text-slate-900")}>
              Start Your Own <br className="hidden sm:block" />
              <span className={cn("bg-gradient-to-r bg-clip-text text-transparent", isDark ? "from-cyan-400 to-cyan-200" : "from-cyan-600 to-cyan-400")}>Cloud Hosting</span> Company
            </h1>
          </FadeIn>

          <FadeIn direction="up" delay={0.2}>
            <p className={cn("text-lg md:text-xl max-w-3xl mx-auto mb-12 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>
              Use Masdika&apos;s white-label Reseller API to provision and manage high-performance Virtual Machines programmatically. Set your own markup and keep 100% of the profit.
            </p>
          </FadeIn>

          <FadeIn direction="up" delay={0.3}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-[280px] sm:max-w-none mx-auto">
              <MagneticButton intensity={15} className="w-full sm:w-auto flex">
                <Link href="/login" className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 w-full">
                  Get Started <ArrowRight className="w-5 h-5" />
                </Link>
              </MagneticButton>
              <MagneticButton intensity={15} className="w-full sm:w-auto flex">
                <Link href="#documentation" className={cn("px-8 py-4 border font-bold rounded-xl transition-all flex items-center justify-center w-full", isDark ? "bg-white/5 hover:bg-white/10 border-white/10 text-white" : "bg-white hover:bg-slate-50 border-slate-300 text-slate-900")}>
                  Read Docs
                </Link>
              </MagneticButton>
            </div>
          </FadeIn>

          {/* Trust badges */}
          <FadeIn direction="up" delay={0.4}>
            <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-4 mt-16 max-w-4xl mx-auto")}>
              {[
                { icon: CodeXml, title: "RESTful API", sub: "Simple Integration" },
                { icon: ShieldCheck, title: "100% White-Label", sub: "Invisible Provider" },
                { icon: CheckCircle2, title: "Prepaid Billing", sub: "Monthly Upfront" },
                { icon: Activity, title: "Real-time Control", sub: "Power & VNC" },
              ].map((b, i) => (
                <div key={i} className={cn("flex items-center gap-3 p-4 rounded-xl border", isDark ? "bg-[#0d1629] border-slate-700/80 ring-1 ring-white/5 shadow-md shadow-black/30" : "bg-white border-slate-200 shadow-sm")}>
                  <b.icon className={cn("w-6 h-6 shrink-0", isDark ? "text-cyan-400" : "text-cyan-600")} />
                  <div className="text-left">
                    <span className={cn("font-bold text-sm leading-tight block", isDark ? "text-white" : "text-slate-900")}>{b.title}</span>
                    <span className={cn("text-[10px] uppercase tracking-wider font-bold", isDark ? "text-zinc-500" : "text-slate-500")}>{b.sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══════════ Documentation ══════════ */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 lg:pt-16 pb-12 md:pb-20" id="documentation">
        <div className={cn("flex w-full border rounded-2xl overflow-hidden", isDark ? "border-slate-700/80 bg-[#0d1629] ring-1 ring-white/5 shadow-2xl shadow-black/50" : "border-slate-200 bg-white shadow-xl")}>

          {/* Sidebar */}
          <div className={cn("w-64 flex-shrink-0 border-r hidden xl:block", isDark ? "border-white/[0.06]" : "border-slate-200")}>
            <div className="sticky top-[100px] h-[calc(100vh-120px)] overflow-y-auto">
              <div className="p-5 space-y-6">
                {navSections.map((section) => (
                  <div key={section.label}>
                    <h5 className={cn("text-[10px] font-black uppercase tracking-widest mb-2 px-2", isDark ? "text-zinc-600" : "text-slate-400")}>{section.label}</h5>
                    <ul className="space-y-0.5">
                      {section.items.map((item) => (
                        <li key={item.id}>
                          <a
                            href={`#${item.id}`}
                            className={cn(
                              "flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] font-medium transition-all",
                              activeId === item.id
                                ? (isDark ? "bg-cyan-500/10 text-cyan-400" : "bg-cyan-50 text-cyan-700")
                                : (isDark ? "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50")
                            )}
                          >
                            <item.icon className="w-3.5 h-3.5 shrink-0" />
                            {item.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">

            {/* Introduction */}
            <section id="introduction" className={cn("scroll-mt-24 border-b", isDark ? "border-white/[0.06]" : "border-slate-200")}>
              <div className="grid grid-cols-1 xl:grid-cols-2">
                <div className="p-6 md:p-8 lg:p-10">
                  <h2 className={cn("text-xl font-bold mb-4", isDark ? "text-white" : "text-slate-900")}>Introduction</h2>
                  <div className={cn("space-y-3 text-sm leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>
                    <p>Welcome to the Masdika Reseller API! You can use our API to provision and manage cloud infrastructure such as Virtual Machines programmatically.</p>
                    <p>All endpoints are RESTful, consume and produce JSON, and require secure authentication via an API key.</p>
                  </div>
                  <div className={cn("mt-6 p-4 rounded-xl border flex gap-3", isDark ? "bg-cyan-500/5 border-cyan-500/10" : "bg-cyan-50 border-cyan-200")}>
                    <ShieldCheck className={cn("w-5 h-5 shrink-0 mt-0.5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                    <div className="text-sm">
                      <strong className={cn("block mb-0.5", isDark ? "text-white" : "text-slate-900")}>White-Label Guarantee</strong>
                      <span className={isDark ? "text-zinc-400" : "text-slate-600"}>We are purely a backend infrastructure provider. Your customers will never see the Masdika brand, logo, or pricing.</span>
                    </div>
                  </div>
                </div>
                <div className={cn("p-6 md:p-8 lg:p-10 border-t xl:border-t-0 xl:border-l flex flex-col justify-center", isDark ? "bg-white/[0.015] border-white/[0.06]" : "bg-slate-50/50 border-slate-200")}>
                  <h4 className={cn("text-[11px] font-bold uppercase tracking-widest mb-3", isDark ? "text-zinc-600" : "text-slate-400")}>Base URL</h4>
                  <div className={cn("px-4 py-3 rounded-lg border font-mono text-sm", isDark ? "bg-white/[0.03] border-white/[0.06] text-white" : "bg-white border-slate-200 text-slate-700 shadow-sm")}>
                    https://www.masdika.id/api/v1
                  </div>
                </div>
              </div>
            </section>

            {/* Authentication */}
            <section id="authentication" className={cn("scroll-mt-24 border-b", isDark ? "border-white/[0.06]" : "border-slate-200")}>
              <div className="grid grid-cols-1 xl:grid-cols-2">
                <div className="p-6 md:p-8 lg:p-10">
                  <h2 className={cn("text-xl font-bold mb-4 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                    <Key className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} /> Authentication
                  </h2>
                  <div className={cn("space-y-3 text-sm leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>
                    <p>
                      Masdika API uses token-based authentication. You must include your API key in the <code className={cn("font-mono font-bold px-1.5 py-0.5 rounded text-[12px]", isDark ? "bg-cyan-500/10 text-cyan-400" : "bg-cyan-50 text-cyan-600")}>Authorization</code> header for every request.
                    </p>
                    <p>
                      You can generate a new API token at the Reseller API Dashboard after registering an account. Keep your token secure, as it carries full privileges to provision servers and deduct from your master balance.
                    </p>
                  </div>
                </div>
                <div className={cn("p-6 md:p-8 lg:p-10 border-t xl:border-t-0 xl:border-l flex flex-col justify-center", isDark ? "bg-white/[0.015] border-white/[0.06]" : "bg-slate-50/50 border-slate-200")}>
                  <h4 className={cn("text-[11px] font-bold uppercase tracking-widest mb-3", isDark ? "text-zinc-600" : "text-slate-400")}>Header Format</h4>
                  <div className={cn("px-4 py-3 rounded-lg border font-mono text-[13px]", isDark ? "bg-[#0c0c14] border-white/[0.06] text-zinc-300" : "bg-white border-slate-200 text-slate-700 shadow-sm")}>
                    <span className={cn("font-bold", isDark ? "text-cyan-400" : "text-cyan-600")}>Authorization:</span> Bearer masdika_YOUR_SECRET_KEY
                  </div>
                </div>
              </div>
            </section>

            {/* ── Endpoints ── */}
            <EndpointSection
              isDark={isDark}
              id="list-images"
              title="List OS Images"
              method="GET"
              endpoint="/api/v1/images"
              description="Retrieve a list of all available Operating System templates and their versions that can be used to provision a new Virtual Machine."
              payload={""}
              response={`{\n  "success": true,\n  "data": [\n    {\n      "id": 1,\n      "slug": "ubuntu-22.04",\n      "name": "ubuntu-22.04",\n      "family": "ubuntu",\n      "version": "22.04",\n      "osType": "l26"\n    },\n    {\n      "id": 2,\n      "slug": "almalinux-9",\n      "name": "almalinux-9",\n      "family": "almalinux",\n      "version": "9",\n      "osType": "l26"\n    }\n  ]\n}`}
            />

            <EndpointSection
              isDark={isDark}
              id="create-vm"
              title="Create VM"
              method="POST"
              endpoint="/api/v1/instances"
              description="Create and provision a new VPS instance directly onto the Public Network (vmbr1). The upfront monthly cost will be deducted from your master balance automatically."
              parameters={[
                { name: "hostname", type: "String", description: "Required. Valid FQDN for the server." },
                { name: "os", type: "String", description: "Required. OS template (e.g., ubuntu-22.04)." },
                { name: "plan", type: "String", description: "Required. Plan slug (e.g., vps-1gb)." },
                { name: "password", type: "String", description: "Required. Root password for the server." }
              ]}
              payload={`{\n  "hostname": "server1.yourdomain.com",\n  "os": "ubuntu-22.04",\n  "plan": "vps-1gb",\n  "password": "SecureRootPassword123!"\n}`}
              response={`{\n  "success": true,\n  "message": "VPS provisioning started",\n  "data": {\n    "id": 142,\n    "hostname": "server1.yourdomain.com",\n    "status": "PROVISIONING",\n    "cost_deducted": 14600\n  }\n}`}
            />

            <EndpointSection
              isDark={isDark}
              id="list-vms"
              title="List VMs"
              method="GET"
              endpoint="/api/v1/instances"
              description="Retrieve a list of all active VPS instances provisioned by your Reseller account."
              payload={""}
              response={`{\n  "success": true,\n  "data": [\n    {\n      "id": 142,\n      "hostname": "server1.yourdomain.com",\n      "status": "RUNNING",\n      "cpuCores": 1,\n      "ramGb": 1,\n      "diskGb": 20,\n      "osTemplate": "ubuntu-22.04",\n      "createdAt": "2024-01-01T12:00:00Z"\n    }\n  ]\n}`}
            />

            <EndpointSection
              isDark={isDark}
              id="get-vm"
              title="Get VM Info"
              method="GET"
              endpoint="/api/v1/instances/:id"
              description="Get detailed information about a specific VPS instance, including exact resource usage, IP addresses, and real-time power state."
              parameters={[
                { name: "id", type: "Integer", description: "Required. The unique ID of the instance." }
              ]}
              payload={""}
              response={`{\n  "success": true,\n  "data": {\n    "id": 142,\n    "hostname": "server1.yourdomain.com",\n    "status": "RUNNING",\n    "networkBridge": "vmbr1",\n    "powerState": "running",\n    "assignedIps": [\n      {\n        "ipAddress": "103.44.23.11",\n        "gateway": "103.44.23.1"\n      }\n    ],\n    "stats": {\n      "cpu": 4.2,\n      "mem": 536870912,\n      "disk": 2147483648\n    }\n  }\n}`}
            />

            <EndpointSection
              isDark={isDark}
              id="power-vm"
              title="Power Management"
              method="POST"
              endpoint="/api/v1/instances/:id/power"
              description="Manage the power state of your VPS instance. Valid actions are 'start', 'stop', 'shutdown', and 'reboot'."
              parameters={[
                { name: "id", type: "Integer", description: "Required. The unique ID of the instance." },
                { name: "action", type: "String", description: "Required. Must be start, stop, shutdown, or reboot." }
              ]}
              payload={`{\n  "action": "reboot"\n}`}
              response={`{\n  "success": true,\n  "message": "Power action 'reboot' executed successfully"\n}`}
            />

            <EndpointSection
              isDark={isDark}
              id="reinstall-vm"
              title="Reinstall VM"
              method="POST"
              endpoint="/api/v1/instances/:id/reinstall"
              description="Reinstall the operating system of the VPS. Warning: This will destroy all data currently on the disk."
              parameters={[
                { name: "id", type: "Integer", description: "Required. The unique ID of the instance." },
                { name: "os", type: "String", description: "Required. The new OS template." },
                { name: "password", type: "String", description: "Required. The new root password." }
              ]}
              payload={`{\n  "os": "debian-12",\n  "password": "NewSecurePassword123!"\n}`}
              response={`{\n  "success": true,\n  "message": "OS Reinstallation process started"\n}`}
            />

            <EndpointSection
              isDark={isDark}
              id="vnc-console"
              title="VNC Console"
              method="POST"
              endpoint="/api/v1/instances/:id/console"
              description="Open a remote VNC console session to the VPS instance. Returns a secure one-time session URL and ticket that can be used to connect via noVNC in a browser. The session expires after 30 minutes."
              parameters={[
                { name: "id", type: "Integer", description: "Required. The unique ID of the instance." }
              ]}
              payload={""}
              response={`{\n  "success": true,\n  "data": {\n    "consoleUrl": "/novnc-ui/vnc.html?path=...",\n    "ticket": "PVEVNC:6A6AC39A5D...",\n    "port": 5900,\n    "sessionToken": "encrypted_session_token",\n    "expiresIn": 1800\n  }\n}`}
            />

            <EndpointSection
              isDark={isDark}
              id="delete-vm"
              title="Delete VM"
              method="DELETE"
              endpoint="/api/v1/instances/:id"
              description="Permanently destroy a VPS instance. Data cannot be recovered after this action. No refunds are provided for early termination of reseller instances."
              parameters={[
                { name: "id", type: "Integer", description: "Required. The unique ID of the instance." }
              ]}
              payload={""}
              response={`{\n  "success": true,\n  "message": "Instance 142 has been successfully destroyed"\n}`}
            />

            <EndpointSection
              isDark={isDark}
              id="get-balance"
              title="Get Balance"
              method="GET"
              endpoint="/api/v1/billing"
              description="Check your current reseller balance, number of active instances, and estimated monthly spend. Use this endpoint to verify sufficient funds before provisioning new instances."
              payload={""}
              response={`{\n  "success": true,\n  "data": {\n    "balance": 485400,\n    "currency": "IDR",\n    "activeInstances": 3,\n    "totalMonthlySpend": 43800\n  }\n}`}
            />

            <EndpointSection
              isDark={isDark}
              id="topup-balance"
              title="Top Up Balance (Deposit)"
              method="POST"
              endpoint="/api/v1/billing/topup"
              description="Create a top-up request to add funds to your reseller balance. This endpoint returns a secure payment URL (Duitku) and payment identifiers (Virtual Account / QR string) for automated customer flows. Note: Both /api/v1/billing/topup and /api/v1/billing/deposit are supported."
              parameters={[
                { name: "amount", type: "Integer", description: "Required. Top-up amount in IDR (Minimum: 50,000, Maximum: 50,000,000)." },
                {
                  name: "paymentMethodCode",
                  type: "String",
                  description: (
                    <div className="flex flex-col gap-2">
                      <span>Required. Code of the payment method to use. Available channel codes:</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {[
                          { code: "SQ", name: "Nusapay QRIS" },
                          { code: "SA", name: "Shopee Pay Apps" },
                          { code: "OV", name: "OVO" },
                          { code: "DA", name: "DANA" },
                          { code: "LA", name: "LinkAja" },
                          { code: "M2", name: "Mandiri VA" },
                          { code: "I1", name: "BNI VA" },
                          { code: "B1", name: "CIMB Niaga VA" },
                          { code: "BR", name: "BRIVA" },
                          { code: "BV", name: "BSI VA" },
                          { code: "VA", name: "Maybank VA" },
                          { code: "BT", name: "Permata Bank VA" },
                          { code: "NC", name: "Bank Neo Commerce/BNC" },
                          { code: "AG", name: "Bank Artha Graha" },
                          { code: "DM", name: "Danamon VA" },
                          { code: "S1", name: "Bank Sahabat Sampoerna" },
                          { code: "A1", name: "ATM Bersama" },
                          { code: "FT", name: "Pegadaian/ALFA/Pos" }
                        ].map(pm => (
                          <span key={pm.code} className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border", isDark ? "bg-white/[0.04] border-white/10 text-zinc-300" : "bg-slate-100 border-slate-200 text-slate-700")}>
                            <code className={cn("font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>{pm.code}</code>
                            <span>{pm.name}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                },
                { name: "voucherCode", type: "String", description: "Optional. Promo / discount voucher code if available." }
              ]}
              payload={`{\n  "amount": 100000,\n  "paymentMethodCode": "SQ",\n  "voucherCode": "PROMO2026"\n}`}
              response={`{\n  "success": true,\n  "message": "Top up invoice created successfully",\n  "data": {\n    "invoiceNumber": "TOPUP-1710000000000-AB12",\n    "subtotal": 100000,\n    "discountAmount": 0,\n    "taxAmount": 11000,\n    "taxRate": 11,\n    "fee": 1000,\n    "totalAmount": 112000,\n    "creditedBalance": 100000,\n    "currency": "IDR",\n    "paymentMethod": "Nusapay QRIS",\n    "paymentMethodCode": "SQ",\n    "paymentUrl": "https://passport.duitku.com/webapi/...",\n    "reference": "D12345678",\n    "vaNumber": null,\n    "qrString": "00020101021226...",\n    "status": "PENDING",\n    "expiresAt": "2026-10-16T12:00:00.000Z"\n  }\n}`}
            />

            <EndpointSection
              isDark={isDark}
              id="topup-methods"
              title="Payment Methods & Top Up Status"
              method="GET"
              endpoint="/api/v1/billing/topup"
              description="Retrieve available active payment channels and deposit limits, or verify the payment settlement status of an existing top-up invoice using the ?invoiceNumber parameter. Note: Both /api/v1/billing/topup and /api/v1/billing/deposit are supported."
              parameters={[
                { name: "invoiceNumber", type: "String", description: "Optional. Query param to look up a specific top up invoice (e.g. ?invoiceNumber=TOPUP-1710000000000-AB12). If omitted, returns active payment channels and limits." }
              ]}
              payload={""}
              response={`{\n  "success": true,\n  "data": {\n    "limits": {\n      "minAmount": 50000,\n      "maxAmount": 50000000,\n      "currency": "IDR",\n      "taxRatePercent": 11\n    },\n    "paymentMethods": [\n      {\n        "code": "SQ",\n        "name": "Nusapay QRIS",\n        "type": "QRIS",\n        "fee": 1000\n      },\n      {\n        "code": "M2",\n        "name": "Mandiri VA",\n        "type": "VA",\n        "fee": 3000\n      }\n    ],\n    "recentTopups": [\n      {\n        "invoiceNumber": "TOPUP-1710000000000-AB12",\n        "subtotal": 100000,\n        "amount": 112000,\n        "status": "PAID",\n        "paidAt": "2026-10-15T08:30:00.000Z"\n      }\n    ]\n  }\n}`}
            />

            {/* Integration Guide */}
            <section id="integration-guide" className={cn("scroll-mt-24 border-b last:border-b-0", isDark ? "border-white/[0.06]" : "border-slate-200")}>
              <div className="grid grid-cols-1 xl:grid-cols-2">
                <div className="p-6 md:p-8 lg:p-10">
                  <h2 className={cn("text-xl font-bold mb-4 flex items-center gap-2 group", isDark ? "text-white" : "text-slate-900")}>
                    Integration Guide
                    <a href="#integration-guide" className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-cyan-500">
                      <LinkIcon className="w-3.5 h-3.5" />
                    </a>
                  </h2>
                  <div className={cn("space-y-3 text-sm leading-relaxed mb-6", isDark ? "text-zinc-400" : "text-slate-600")}>
                    <p>Masdika operates on a <strong className={isDark ? "text-white" : "text-slate-900"}>prepaid wholesale</strong> model. You top up your balance on Masdika, then provision VPS instances via the API. The wholesale cost is deducted from your balance automatically.</p>
                    <p>You handle your own customer billing using any payment gateway of your choice (<strong className={isDark ? "text-white" : "text-slate-900"}>Xendit, Midtrans, Duitku, Stripe</strong>, etc). Masdika only deducts the wholesale VPS cost — you keep all the profit from your markup.</p>
                  </div>

                  <h3 className={cn("text-[11px] font-bold uppercase tracking-widest mb-3", isDark ? "text-zinc-600" : "text-slate-400")}>Recommended Flow</h3>
                  <div className={cn("space-y-3 text-sm", isDark ? "text-zinc-400" : "text-slate-600")}>
                    {[
                      <>Customer places order on <strong className={isDark ? "text-white" : "text-slate-900"}>your website</strong> and pays via your payment gateway.</>,
                      <>Your server receives <strong className={isDark ? "text-white" : "text-slate-900"}>payment webhook</strong> confirming successful payment.</>,
                      <>Call <code className={cn("font-mono text-[11px] px-1 py-0.5 rounded", isDark ? "bg-white/[0.04] text-cyan-400" : "bg-slate-100 text-cyan-600")}>GET /api/v1/billing</code> to verify your Masdika balance is sufficient.</>,
                      <>Call <code className={cn("font-mono text-[11px] px-1 py-0.5 rounded", isDark ? "bg-white/[0.04] text-cyan-400" : "bg-slate-100 text-cyan-600")}>POST /api/v1/instances</code> to provision the VPS. Masdika deducts the wholesale cost.</>,
                      <><strong className={isDark ? "text-emerald-400" : "text-emerald-600"}>Your profit</strong> = Customer payment − Masdika wholesale cost. You set your own markup freely.</>,
                    ].map((text, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className={cn("flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black mt-0.5", isDark ? "bg-cyan-500/15 text-cyan-400" : "bg-cyan-50 text-cyan-600")}>{i + 1}</span>
                        <p>{text}</p>
                      </div>
                    ))}
                  </div>

                  <h3 className={cn("text-[11px] font-bold uppercase tracking-widest mb-3 mt-8", isDark ? "text-zinc-600" : "text-slate-400")}>Billing Lifecycle & Terminations</h3>
                  <div className={cn("space-y-2 text-sm p-4 rounded-xl border", isDark ? "bg-white/[0.02] border-white/[0.06] text-zinc-400" : "bg-white border-slate-200 text-slate-600")}>
                    <p><strong className={isDark ? "text-red-400" : "text-red-600"}>Important:</strong> You must maintain a sufficient balance to cover the monthly renewals of all your active instances.</p>
                    <ul className="list-disc pl-5 space-y-1.5">
                      <li><strong className={isDark ? "text-white" : "text-slate-900"}>Low Balance Warning (H-1):</strong> If your balance is insufficient within 24 hours, you will receive an email notification.</li>
                      <li><strong className={isDark ? "text-white" : "text-slate-900"}>Suspension (H=0):</strong> If the instance expires and your balance is still insufficient, the instance will be automatically <strong>STOPPED</strong> and marked as <code className={cn("text-[11px]", isDark ? "text-cyan-400" : "text-cyan-600")}>SUSPENDED</code>.</li>
                      <li><strong className={isDark ? "text-emerald-400" : "text-emerald-600"}>Auto-Unsuspend:</strong> Simply <strong>Top Up your balance</strong>. Our system will automatically detect the top-up, deduct the required amount, extend the instance, and start the VM again.</li>
                      <li><strong className={isDark ? "text-white" : "text-slate-900"}>Termination (H+3):</strong> If a suspended instance is not renewed within <strong>3 days</strong> of suspension, it will be permanently <strong>DESTROYED</strong>. All data will be irrecoverable.</li>
                    </ul>
                  </div>
                </div>

                <div className={cn("p-6 md:p-8 lg:p-10 border-t xl:border-t-0 xl:border-l", isDark ? "bg-white/[0.015] border-white/[0.06]" : "bg-slate-50/50 border-slate-200")}>
                  <CodeBlock isDark={isDark} title="Pseudocode">
                    <code className={isDark ? "text-zinc-300" : "text-slate-700"}>{`// 1. Customer pays on YOUR website
onPaymentWebhook(order) {

  // 2. Check Masdika balance
  bal = GET /api/v1/billing
  if (bal.data.balance < estimatedCost) {
    notify("Low balance, top up!")
    return
  }

  // 3. Provision VPS via Masdika
  vps = POST /api/v1/instances {
    hostname: order.hostname,
    os: order.selectedOs,
    plan: order.plan,
    password: generatePassword()
  }

  // 4. Save to YOUR database
  db.save(order.customerId, vps.data)

  // 5. Profit!
  // Customer paid you: Rp 100,000
  // Masdika charged:   Rp 66,430
  // Your profit:       Rp 33,570
}`}</code>
                  </CodeBlock>
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>

      {/* ══════════ CTA ══════════ */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 md:pb-20">
        <div className={cn("relative overflow-hidden border rounded-2xl p-10 md:p-16 text-center", isDark ? "bg-[#080d18]/80 border-white/[0.06] backdrop-blur-xl" : "bg-white border-slate-200 shadow-xl")}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/3" />
          <h2 className={cn("text-3xl md:text-4xl font-black mb-4 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Looking for Custom Specifications?
          </h2>
          <p className={cn("text-base md:text-lg max-w-2xl mx-auto mb-8 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>
            Need a traditional reseller panel without the API integration, or require custom hardware configurations? Let&apos;s talk.
          </p>
          <MagneticButton intensity={20}>
            <Link href="/contact" className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2">
              Contact Sales Team <ArrowRight className="w-5 h-5" />
            </Link>
          </MagneticButton>
        </div>
      </div>
    </div>
  );
}
