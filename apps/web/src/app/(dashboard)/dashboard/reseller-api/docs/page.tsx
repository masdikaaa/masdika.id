"use client";

import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { ArrowLeft, BookOpen, Key, Link as LinkIcon, Copy, Check } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const EndpointSection = ({ id, title, method, endpoint, description, parameters, payload, response }: any) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [copied, setCopied] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);

  const handleCopy = () => {
    let curlCommand = `curl "https://www.masdika.id${endpoint}" \\\n  -H "Authorization: Bearer masdika_YOUR_SECRET_KEY" \\\n  -X ${method}`;
    if (payload) {
      curlCommand += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${payload}'`;
    }
    navigator.clipboard.writeText(curlCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyResponse = () => {
    navigator.clipboard.writeText(response);
    setCopiedResponse(true);
    setTimeout(() => setCopiedResponse(false), 2000);
  };

  return (
    <div id={id} className={cn("grid grid-cols-1 xl:grid-cols-2 border-b scroll-mt-20", isDark ? "border-white/15" : "border-slate-400")}>
      {/* Left Column: Documentation */}
      <div className={cn("p-6 md:p-10 lg:p-16", isDark ? "bg-transparent" : "bg-white")}>
        <h2 className={cn("text-2xl font-bold mb-4 flex items-center gap-2 group", isDark ? "text-white" : "text-slate-900")}>
          {title}
          <a href={`#${id}`} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-cyan-500">
            <LinkIcon className="w-4 h-4" />
          </a>
        </h2>
        <div className={cn("prose prose-sm max-w-none mb-8", isDark ? "prose-invert text-zinc-400" : "text-slate-600")}>
          <p className="leading-relaxed">{description}</p>
        </div>
        
        {method && endpoint && (
          <div className="mb-8">
            <h3 className={cn("font-bold text-xs uppercase tracking-wider mb-3", isDark ? "text-zinc-500" : "text-slate-500")}>HTTP Request</h3>
            <div className={cn("flex items-center gap-3 px-4 py-2.5 rounded-lg border font-mono text-[13px] sm:text-sm shadow-sm overflow-x-auto whitespace-nowrap w-full", isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200")}>
              <span className={cn("font-bold shrink-0", 
                method === 'GET' ? 'text-blue-500' : 
                method === 'POST' ? 'text-green-500' : 
                method === 'DELETE' ? 'text-red-500' : 
                'text-amber-500'
              )}>{method}</span>
              <span className={cn("shrink-0", isDark ? "text-zinc-300" : "text-slate-700")}>https://www.masdika.id{endpoint}</span>
            </div>
          </div>
        )}

        {parameters && (
          <div>
            <h3 className={cn("font-bold text-xs uppercase tracking-wider mb-3", isDark ? "text-zinc-500" : "text-slate-500")}>Parameters</h3>
            <div className={cn("overflow-x-auto rounded-xl border shadow-sm", isDark ? "border-white/10" : "border-slate-200")}>
              <table className="w-full text-sm text-left">
                <thead className={cn("text-xs uppercase border-b", isDark ? "bg-white/5 border-white/10 text-zinc-400" : "bg-slate-50 border-slate-200 text-slate-500")}>
                  <tr>
                    <th className="px-4 py-3 font-semibold">Parameter</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody className={cn("divide-y", isDark ? "divide-white/5 bg-transparent" : "divide-slate-100 bg-white")}>
                  {parameters.map((p: any, i: number) => (
                    <tr key={i} className={isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50/50"}>
                      <td className={cn("px-4 py-3 font-mono text-[13px] font-bold", isDark ? "text-cyan-400" : "text-cyan-600")}>{p.name}</td>
                      <td className={cn("px-4 py-3 text-[13px]", isDark ? "text-zinc-500" : "text-slate-500")}>{p.type}</td>
                      <td className={cn("px-4 py-3", isDark ? "text-zinc-400" : "text-slate-600")}>{p.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Code Examples */}
      <div className={cn("p-6 md:p-10 lg:p-16 border-t xl:border-t-0 xl:border-l shadow-inner", isDark ? "bg-[#1E1E2E] border-white/15" : "bg-slate-50 border-slate-400")}>
        {payload !== undefined && (
          <div className="mb-8">
            <h4 className={cn("text-[11px] font-bold uppercase tracking-wider mb-3", isDark ? "text-[#71717a]" : "text-slate-500")}>Example Request</h4>
            <div className={cn("rounded-xl border overflow-hidden shadow-lg", isDark ? "bg-[#000000]/40 border-white/10" : "bg-white border-slate-200 shadow-slate-200/50")}>
              <div className={cn("flex items-center justify-between gap-2 px-4 py-2 border-b", isDark ? "border-white/5 bg-[#000000]/40" : "border-slate-100 bg-slate-50")}>
                <div className="flex items-center">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                  </div>
                  <span className={cn("text-[10px] font-bold ml-2", isDark ? "text-[#71717a]" : "text-slate-500")}>bash</span>
                </div>
                <button onClick={handleCopy} className={cn("p-1.5 rounded-md transition-colors", isDark ? "hover:bg-white/10 text-zinc-500 hover:text-zinc-300" : "hover:bg-slate-200 text-slate-400 hover:text-slate-600")} title="Copy code">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="p-4 overflow-x-auto">
                <pre className={cn("font-mono text-[13px] leading-relaxed", isDark ? "text-[#d4d4d8]" : "text-slate-700")}>
                  <span className={isDark ? "text-[#f472b6]" : "text-pink-600"}>curl</span> <span className={isDark ? "text-[#fcd34d]" : "text-amber-600"}>"https://www.masdika.id{endpoint}"</span> \<br/>
                  <span className={isDark ? "text-[#f472b6]" : "text-pink-600"}>  -H</span> <span className={isDark ? "text-[#fcd34d]" : "text-amber-600"}>"Authorization: Bearer masdika_YOUR_SECRET_KEY"</span> \<br/>
                  <span className={isDark ? "text-[#f472b6]" : "text-pink-600"}>  -X</span> <span className={isDark ? "text-[#22d3ee]" : "text-cyan-600"}>{method}</span>
                  {payload && (
                    <>
                      {` \\\n`}
                      <span className={isDark ? "text-[#f472b6]" : "text-pink-600"}>  -H</span> <span className={isDark ? "text-[#fcd34d]" : "text-amber-600"}>"Content-Type: application/json"</span> \<br/>
                      <span className={isDark ? "text-[#f472b6]" : "text-pink-600"}>  -d</span> <span className={isDark ? "text-[#4ade80]" : "text-emerald-600"}>'{payload}'</span>
                    </>
                  )}
                </pre>
              </div>
            </div>
          </div>
        )}

        {response !== undefined && (
          <div>
            <h4 className={cn("text-[11px] font-bold uppercase tracking-wider mb-3", isDark ? "text-[#71717a]" : "text-slate-500")}>Example Response</h4>
            <div className={cn("rounded-xl border overflow-hidden shadow-lg", isDark ? "bg-[#000000]/40 border-white/10" : "bg-white border-slate-200 shadow-slate-200/50")}>
              <div className={cn("flex items-center justify-between gap-2 px-4 py-2 border-b", isDark ? "border-white/5 bg-[#000000]/40" : "border-slate-100 bg-slate-50")}>
                <span className={cn("text-[10px] font-bold", isDark ? "text-[#71717a]" : "text-slate-500")}>JSON</span>
                <button onClick={handleCopyResponse} className={cn("p-1.5 rounded-md transition-colors", isDark ? "hover:bg-white/10 text-zinc-500 hover:text-zinc-300" : "hover:bg-slate-200 text-slate-400 hover:text-slate-600")} title="Copy JSON">
                  {copiedResponse ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="p-4 overflow-x-auto">
                <pre className={cn("font-mono text-[13px] leading-relaxed", isDark ? "text-[#34d399]" : "text-emerald-600")}>
                  {response}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function ResellerApiDocsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className={cn("min-h-[calc(100vh-4rem)] flex flex-col xl:flex-row -mx-4 sm:-mx-6 lg:-mx-8 -my-4 sm:-my-6 lg:-my-8", isDark ? "bg-[#0A0B1A]" : "bg-white")}>
      
      {/* Sidebar Navigation */}
      <div className={cn("xl:w-64 flex-shrink-0 border-r xl:h-[calc(100vh-4rem)] xl:sticky xl:top-16 overflow-y-auto hidden xl:block z-10", isDark ? "bg-[#0A0B1A] border-white/15" : "bg-slate-50 border-slate-400")}>
        <div className="p-6">
          <Link href="/dashboard/reseller-api" className={cn("inline-flex items-center gap-2 text-sm font-medium transition-colors hover:text-cyan-500 mb-8", isDark ? "text-zinc-400" : "text-slate-500")}>
            <ArrowLeft className="w-4 h-4" /> Back to Panel
          </Link>
          
          <div className="space-y-6">
            <div>
              <h5 className={cn("text-xs font-bold uppercase tracking-wider mb-3", isDark ? "text-white" : "text-slate-900")}>Getting Started</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="#introduction" className={cn("block hover:text-cyan-500 transition-colors", isDark ? "text-zinc-400" : "text-slate-600")}>Introduction</a></li>
                <li><a href="#authentication" className={cn("block hover:text-cyan-500 transition-colors", isDark ? "text-zinc-400" : "text-slate-600")}>Authentication</a></li>
              </ul>
            </div>
            <div>
              <h5 className={cn("text-xs font-bold uppercase tracking-wider mb-3", isDark ? "text-white" : "text-slate-900")}>Virtual Machines</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="#list-images" className={cn("block hover:text-cyan-500 transition-colors", isDark ? "text-zinc-400" : "text-slate-600")}>List OS Images</a></li>
                <li><a href="#create-vm" className={cn("block hover:text-cyan-500 transition-colors", isDark ? "text-zinc-400" : "text-slate-600")}>Create VM</a></li>
                <li><a href="#list-vms" className={cn("block hover:text-cyan-500 transition-colors", isDark ? "text-zinc-400" : "text-slate-600")}>List VMs</a></li>
                <li><a href="#get-vm" className={cn("block hover:text-cyan-500 transition-colors", isDark ? "text-zinc-400" : "text-slate-600")}>Get VM Info</a></li>
                <li><a href="#power-vm" className={cn("block hover:text-cyan-500 transition-colors", isDark ? "text-zinc-400" : "text-slate-600")}>Power Management</a></li>
                <li><a href="#reinstall-vm" className={cn("block hover:text-cyan-500 transition-colors", isDark ? "text-zinc-400" : "text-slate-600")}>Reinstall VM</a></li>
                <li><a href="#vnc-console" className={cn("block hover:text-cyan-500 transition-colors", isDark ? "text-zinc-400" : "text-slate-600")}>VNC Console</a></li>
                <li><a href="#delete-vm" className={cn("block hover:text-cyan-500 transition-colors", isDark ? "text-zinc-400" : "text-slate-600")}>Delete VM</a></li>
              </ul>
            </div>
            <div>
              <h5 className={cn("text-xs font-bold uppercase tracking-wider mb-3", isDark ? "text-white" : "text-slate-900")}>Billing</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="#get-balance" className={cn("block hover:text-cyan-500 transition-colors", isDark ? "text-zinc-400" : "text-slate-600")}>Get Balance</a></li>
                <li><a href="#create-deposit" className={cn("block hover:text-cyan-500 transition-colors", isDark ? "text-zinc-400" : "text-slate-600")}>Create Deposit</a></li>
                <li><a href="#integration-guide" className={cn("block hover:text-cyan-500 transition-colors", isDark ? "text-zinc-400" : "text-slate-600")}>Integration Guide</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden min-w-0">
        
        {/* Intro Section */}
        <div id="introduction" className={cn("grid grid-cols-1 xl:grid-cols-2 border-b scroll-mt-20", isDark ? "border-white/15" : "border-slate-400")}>
          <div className={cn("p-6 md:p-10 lg:p-16", isDark ? "bg-[#0A0B1A]" : "bg-white")}>
            <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold mb-6 tracking-wide", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
              <BookOpen className="w-3.5 h-3.5" /> API Documentation v1.0
            </div>
            <h1 className={cn("text-3xl md:text-5xl font-extrabold mb-6 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Masdika <span className={cn(isDark ? "text-cyan-400" : "text-cyan-600")}>API</span>
            </h1>
            <p className={cn("text-base leading-relaxed mb-4", isDark ? "text-zinc-400" : "text-slate-600")}>
              Welcome to the Masdika Reseller API! You can use our API to provision and manage cloud infrastructure such as Virtual Machines programmatically.
            </p>
            <p className={cn("text-base leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>
              All endpoints are RESTful, consume and produce JSON, and require secure authentication via an API key.
            </p>
          </div>
          <div className={cn("p-6 md:p-10 lg:p-16 border-t xl:border-t-0 xl:border-l flex flex-col justify-center shadow-inner", isDark ? "bg-[#1E1E2E] border-white/15" : "bg-slate-50 border-slate-400")}>
            <div className={cn("border rounded-xl p-6 text-sm leading-relaxed shadow-inner", isDark ? "bg-[#22d3ee]/10 border-[#22d3ee]/20 text-[#cffafe]" : "bg-white border-slate-200 text-slate-800 shadow-slate-200/50")}>
              <strong className={cn("block mb-2", isDark ? "text-[#22d3ee]" : "text-slate-600")}>Base URL:</strong>
              <code className={cn("px-2 py-1 rounded font-mono", isDark ? "text-white bg-[#000000]/30" : "text-slate-700 bg-slate-50 shadow-sm border border-slate-100")}>https://masdika.id/api/v1</code>
            </div>
          </div>
        </div>

        {/* Auth Section */}
        <div id="authentication" className={cn("grid grid-cols-1 xl:grid-cols-2 border-b scroll-mt-20", isDark ? "border-white/15" : "border-slate-400")}>
          <div className={cn("p-6 md:p-10 lg:p-16", isDark ? "bg-[#0A0B1A]" : "bg-white")}>
            <h2 className={cn("text-2xl font-bold mb-4 flex items-center gap-3 group", isDark ? "text-white" : "text-slate-900")}>
              <Key className="w-6 h-6 text-cyan-500" /> Authentication
              <a href="#authentication" className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-cyan-500">
                <LinkIcon className="w-4 h-4" />
              </a>
            </h2>
            <p className={cn("text-base leading-relaxed mb-4", isDark ? "text-zinc-400" : "text-slate-600")}>
              Masdika API uses token-based authentication. You must include your API key in the <code className="text-cyan-500 font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded">Authorization</code> header for every request.
            </p>
            <p className={cn("text-base leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>
              You can generate a new API token at the Reseller API Dashboard. Keep your token secure, as it carries full privileges to provision servers and deduct from your master balance.
            </p>
          </div>
          <div className={cn("p-6 md:p-10 lg:p-16 border-t xl:border-t-0 xl:border-l flex flex-col justify-center shadow-inner", isDark ? "bg-[#1E1E2E] border-white/15" : "bg-slate-50 border-slate-400")}>
            <h4 className={cn("text-[11px] font-bold uppercase tracking-wider mb-3", isDark ? "text-[#71717a]" : "text-slate-500")}>Header Format</h4>
            <div className={cn("rounded-xl border p-4 font-mono text-[13px] shadow-lg break-all sm:break-normal", isDark ? "bg-[#000000]/40 border-white/10 text-[#d4d4d8]" : "bg-white border-slate-200 text-slate-700 shadow-slate-200/50")}>
              <span className={cn("font-bold", isDark ? "text-[#22d3ee]" : "text-cyan-600")}>Authorization:</span> Bearer masdika_YOUR_SECRET_KEY
            </div>
          </div>
        </div>

        {/* Endpoints */}
        <EndpointSection
          id="list-images"
          title="List OS Images"
          description="Retrieve a list of all available Operating System templates and their versions that can be used to provision a new Virtual Machine."
          method="GET"
          endpoint="/api/v1/images"
          payload={""}
          response={`{\n  "success": true,\n  "data": [\n    {\n      "id": 1,\n      "slug": "ubuntu-22.04",\n      "name": "ubuntu-22.04",\n      "family": "ubuntu",\n      "version": "22.04",\n      "osType": "l26"\n    },\n    {\n      "id": 2,\n      "slug": "almalinux-9",\n      "name": "almalinux-9",\n      "family": "almalinux",\n      "version": "9",\n      "osType": "l26"\n    }\n  ]\n}`}
        />

        <EndpointSection
          id="create-vm"
          title="Create VM"
          description="Create and provision a new VPS instance directly onto the Public Network (vmbr1). The upfront monthly cost will be deducted from your master balance automatically."
          method="POST"
          endpoint="/api/v1/instances"
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
          id="list-vms"
          title="List VMs"
          description="Retrieve a list of all active VPS instances provisioned by your Reseller account."
          method="GET"
          endpoint="/api/v1/instances"
          payload={""}
          response={`{\n  "success": true,\n  "data": [\n    {\n      "id": 142,\n      "hostname": "server1.yourdomain.com",\n      "status": "RUNNING",\n      "cpuCores": 1,\n      "ramGb": 1,\n      "diskGb": 20,\n      "osTemplate": "ubuntu-22.04",\n      "createdAt": "2024-01-01T12:00:00Z"\n    }\n  ]\n}`}
        />

        <EndpointSection
          id="get-vm"
          title="Get VM Info"
          description="Get detailed information about a specific VPS instance, including exact resource usage, IP addresses, and real-time power state."
          method="GET"
          endpoint="/api/v1/instances/:id"
          parameters={[
            { name: "id", type: "Integer", description: "Required. The unique ID of the instance." }
          ]}
          payload={""}
          response={`{\n  "success": true,\n  "data": {\n    "id": 142,\n    "hostname": "server1.yourdomain.com",\n    "status": "RUNNING",\n    "networkBridge": "vmbr1",\n    "powerState": "running",\n    "assignedIps": [\n      {\n        "ipAddress": "103.44.23.11",\n        "gateway": "103.44.23.1"\n      }\n    ],\n    "stats": {\n      "cpu": 4.2,\n      "mem": 536870912,\n      "disk": 2147483648\n    }\n  }\n}`}
        />

        <EndpointSection
          id="power-vm"
          title="Power Management"
          description="Manage the power state of your VPS instance. Valid actions are 'start', 'stop', 'shutdown', and 'reboot'."
          method="POST"
          endpoint="/api/v1/instances/:id/power"
          parameters={[
            { name: "id", type: "Integer", description: "Required. The unique ID of the instance." },
            { name: "action", type: "String", description: "Required. Must be start, stop, shutdown, or reboot." }
          ]}
          payload={`{\n  "action": "reboot"\n}`}
          response={`{\n  "success": true,\n  "message": "Power action 'reboot' executed successfully"\n}`}
        />

        <EndpointSection
          id="reinstall-vm"
          title="Reinstall VM"
          description="Reinstall the operating system of the VPS. Warning: This will destroy all data currently on the disk."
          method="POST"
          endpoint="/api/v1/instances/:id/reinstall"
          parameters={[
            { name: "id", type: "Integer", description: "Required. The unique ID of the instance." },
            { name: "os", type: "String", description: "Required. The new OS template." },
            { name: "password", type: "String", description: "Required. The new root password." }
          ]}
          payload={`{\n  "os": "debian-12",\n  "password": "NewSecurePassword123!"\n}`}
          response={`{\n  "success": true,\n  "message": "OS Reinstallation process started"\n}`}
        />

        <EndpointSection
          id="vnc-console"
          title="VNC Console"
          description="Open a remote VNC console session to the VPS instance. Returns a secure one-time session URL and ticket that can be used to connect via noVNC in a browser. The session expires after 30 minutes."
          method="POST"
          endpoint="/api/v1/instances/:id/console"
          parameters={[
            { name: "id", type: "Integer", description: "Required. The unique ID of the instance." }
          ]}
          payload={""}
          response={`{\n  "success": true,\n  "data": {\n    "consoleUrl": "/novnc-ui/vnc.html?path=...",\n    "ticket": "PVEVNC:6A6AC39A5D...",\n    "port": 5900,\n    "sessionToken": "encrypted_session_token",\n    "expiresIn": 1800\n  }\n}`}
        />

        <EndpointSection
          id="delete-vm"
          title="Delete VM"
          description="Permanently destroy a VPS instance. Data cannot be recovered after this action. No refunds are provided for early termination of reseller instances."
          method="DELETE"
          endpoint="/api/v1/instances/:id"
          parameters={[
            { name: "id", type: "Integer", description: "Required. The unique ID of the instance." }
          ]}
          payload={""}
          response={`{\n  "success": true,\n  "message": "Instance 142 has been successfully destroyed"\n}`}
        />

        <EndpointSection
          id="get-balance"
          title="Get Balance"
          description="Check your current reseller balance, number of active instances, and estimated monthly spend. Use this endpoint to verify sufficient funds before provisioning new instances."
          method="GET"
          endpoint="/api/v1/billing"
          payload={""}
          response={`{\n  "success": true,\n  "data": {\n    "balance": 485400,\n    "currency": "IDR",\n    "activeInstances": 3,\n    "totalMonthlySpend": 43800\n  }\n}`}
        />

        <EndpointSection
          id="create-deposit"
          title="Create Deposit"
          description="Create a top-up request to add funds to your reseller balance. This endpoint returns a payment URL (Duitku) that you or your automated systems can use to complete the payment."
          method="POST"
          endpoint="/api/v1/billing/deposit"
          parameters={[
            { name: "amount", type: "Integer", description: "Required. The top-up amount (Minimum: 50,000)." },
            { name: "paymentMethodCode", type: "String", description: (
              <div className="flex flex-col gap-2">
                <span>Required. Code of the payment method to use. Available codes:</span>
                <div className="flex flex-wrap gap-2 mt-1">
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
                    <div key={pm.code} className={cn("flex items-center gap-1.5 px-2 py-1 rounded border text-[11px] whitespace-nowrap", isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-slate-200")}>
                      <code className={cn("font-bold", isDark ? "text-cyan-400" : "text-cyan-600")}>{pm.code}</code>
                      <span className={isDark ? "text-zinc-400" : "text-slate-500"}>{pm.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) }
          ]}
          payload={`{\n  "amount": 100000,\n  "paymentMethodCode": "SQ"\n}`}
          response={`{\n  "success": true,\n  "data": {\n    "invoiceNumber": "TOPUP-1710000000000-123",\n    "amount": 101000,\n    "paymentUrl": "https://sandbox.duitku.com/webapi/...",\n    "reference": "D12345678",\n    "paymentMethod": "QRIS",\n    "expiresAt": "2024-03-10T12:00:00Z"\n  }\n}`}
        />

        {/* Integration Guide Section */}
        <div id="integration-guide" className={cn("grid grid-cols-1 xl:grid-cols-2 w-full border-b scroll-mt-20", isDark ? "border-white/15" : "border-slate-400")}>
          <div className={cn("p-6 md:p-10 lg:p-16", isDark ? "bg-[#0A0B1A]" : "bg-white")}>
            <h2 className={cn("text-2xl font-bold mb-4 flex items-center gap-2 group", isDark ? "text-white" : "text-slate-900")}>
              Integration Guide
              <a href="#integration-guide" className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-cyan-500">
                <LinkIcon className="w-4 h-4" />
              </a>
            </h2>
            <p className={cn("text-base leading-relaxed mb-6", isDark ? "text-zinc-400" : "text-slate-600")}>
              Masdika operates on a <strong className={isDark ? "text-white" : "text-slate-900"}>prepaid wholesale</strong> model. You top up your balance on Masdika, then provision VPS instances via the API. The wholesale cost is deducted from your balance automatically.
            </p>
            <p className={cn("text-base leading-relaxed mb-6", isDark ? "text-zinc-400" : "text-slate-600")}>
              You handle your own customer billing using any payment gateway of your choice (<strong className={isDark ? "text-white" : "text-slate-900"}>Xendit, Midtrans, Duitku, Stripe</strong>, etc). Masdika only deducts the wholesale VPS cost - you keep all the profit from your markup.
            </p>

            <h3 className={cn("font-bold text-xs uppercase tracking-wider mb-3 mt-8", isDark ? "text-zinc-500" : "text-slate-500")}>Recommended Flow</h3>
            <div className={cn("space-y-4 text-sm", isDark ? "text-zinc-400" : "text-slate-600")}>
              <div className="flex items-start gap-3">
                <span className={cn("flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold", isDark ? "bg-cyan-500/20 text-cyan-400" : "bg-cyan-50 text-cyan-600")}>1</span>
                <p>Customer places order on <strong className={isDark ? "text-white" : "text-slate-900"}>your website</strong> and pays via your payment gateway (Xendit, Midtrans, Duitku, etc).</p>
              </div>
              <div className="flex items-start gap-3">
                <span className={cn("flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold", isDark ? "bg-cyan-500/20 text-cyan-400" : "bg-cyan-50 text-cyan-600")}>2</span>
                <p>Your server receives <strong className={isDark ? "text-white" : "text-slate-900"}>payment webhook</strong> confirming successful payment from the customer.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className={cn("flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold", isDark ? "bg-cyan-500/20 text-cyan-400" : "bg-cyan-50 text-cyan-600")}>3</span>
                <p>Call <code className={cn("font-mono text-xs px-1.5 py-0.5 rounded", isDark ? "bg-white/5 text-cyan-400" : "bg-slate-100 text-cyan-600")}>GET /api/v1/billing</code> to verify your Masdika balance is sufficient.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className={cn("flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold", isDark ? "bg-cyan-500/20 text-cyan-400" : "bg-cyan-50 text-cyan-600")}>4</span>
                <p>Call <code className={cn("font-mono text-xs px-1.5 py-0.5 rounded", isDark ? "bg-white/5 text-cyan-400" : "bg-slate-100 text-cyan-600")}>POST /api/v1/instances</code> to provision the VPS. Masdika deducts the wholesale cost.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className={cn("flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold", isDark ? "bg-cyan-500/20 text-cyan-400" : "bg-cyan-50 text-cyan-600")}>5</span>
                <p><strong className={isDark ? "text-emerald-400" : "text-emerald-600"}>Your profit</strong> = Customer payment − Masdika wholesale cost. You set your own markup freely.</p>
              </div>
            </div>

            <h3 className={cn("font-bold text-xs uppercase tracking-wider mb-3 mt-10", isDark ? "text-zinc-500" : "text-slate-500")}>Billing Lifecycle & Terminations</h3>
            <div className={cn("space-y-4 text-sm p-5 rounded-xl border", isDark ? "bg-white/[0.02] border-white/5 text-zinc-300" : "bg-white border-slate-200 text-slate-700")}>
              <p><strong className={isDark ? "text-red-400" : "text-red-600"}>Important:</strong> You must maintain a sufficient balance to cover the monthly renewals of all your active instances. Masdika automates the entire billing lifecycle:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className={isDark ? "text-white" : "text-slate-900"}>Low Balance Warning (H-1):</strong> If your balance is insufficient to cover an upcoming renewal within 24 hours, you will receive an email notification urging you to top up.</li>
                <li><strong className={isDark ? "text-white" : "text-slate-900"}>Suspension (H=0):</strong> If the instance expires and your balance is still insufficient, the instance will be automatically <strong>STOPPED</strong> and marked as <code>SUSPENDED</code>.</li>
                <li><strong className={isDark ? "text-emerald-400" : "text-emerald-600"}>Auto-Unsuspend:</strong> If an instance is suspended, simply <strong>Top Up your balance</strong>. Our system will automatically detect the top-up, deduct the required amount, extend the instance, and start the VM again.</li>
                <li><strong className={isDark ? "text-white" : "text-slate-900"}>Termination (H+3):</strong> If a suspended instance is not renewed within <strong>3 days</strong> of suspension, it will be permanently <strong>DESTROYED</strong>. All data will be irrecoverable.</li>
              </ul>
            </div>
          </div>
          <div className={cn("p-6 md:p-10 lg:p-16 border-l shadow-inner", isDark ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-200")}>
            <h4 className={cn("text-[11px] font-bold uppercase tracking-wider mb-3", isDark ? "text-zinc-500" : "text-slate-500")}>Example: Full Provisioning Flow</h4>
            <div className={cn("rounded-xl border overflow-hidden shadow-lg", isDark ? "bg-[#0a1624] border-white/10" : "bg-white border-slate-200 shadow-sm")}>
              <div className={cn("flex items-center gap-2 px-4 py-2 border-b", isDark ? "border-white/5 bg-[#0a1624]" : "border-slate-100 bg-slate-50")}>
                <span className={cn("text-[10px] font-bold", isDark ? "text-zinc-500" : "text-slate-500")}>pseudocode</span>
              </div>
              <div className="p-4 overflow-x-auto">
                <pre className={cn("font-mono text-[13px] leading-relaxed", isDark ? "text-[#d4d4d8]" : "text-slate-700")}>{`// 1. Customer pays on YOUR website
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
}`}</pre>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
