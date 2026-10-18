"use client";

import { cn } from "@/lib/utils";
import { 
  ArrowRight, 
  BookOpen, 
  Key, 
  Link as LinkIcon, 
  Server, 
  ShieldCheck, 
  Zap, 
  CheckCircle2, 
  Activity, 
  CodeXml, 
  Copy, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  Wallet, 
  Trash2, 
  RotateCcw, 
  Monitor, 
  Power, 
  List, 
  ImageIcon, 
  HardDrive,
  MapPin,
  Globe,
  Layers
} from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { FadeIn } from "@/components/animations/FadeIn";
import { ProvisioningSection } from "@/components/ui/ProvisioningSection";
import { FaqSection } from "@/components/ui/FaqSection";
import { useState, useEffect, useRef, useCallback } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

/* ─── Supported Operating Systems ─── */
const SUPPORTED_OPERATING_SYSTEMS = [
  { name: "AlmaLinux", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/almalinux/almalinux-original.svg" },
  { name: "Alpine Linux", icon: "https://cdn.simpleicons.org/alpinelinux/0D597F" },
  { name: "Debian", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/debian/debian-original.svg" },
  { name: "FreeBSD", icon: "https://cdn.simpleicons.org/freebsd/AB2B28" },
  { name: "Ubuntu", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/ubuntu/ubuntu-original.svg" },
  { name: "Windows Server", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/windows8/windows8-original.svg" },
];

const REPEATED_OPERATING_SYSTEMS = [
  ...SUPPORTED_OPERATING_SYSTEMS,
  ...SUPPORTED_OPERATING_SYSTEMS,
  ...SUPPORTED_OPERATING_SYSTEMS,
  ...SUPPORTED_OPERATING_SYSTEMS,
  ...SUPPORTED_OPERATING_SYSTEMS,
  ...SUPPORTED_OPERATING_SYSTEMS,
];

/* ─── Terminal Logs & Stats for ProvisioningSection ─── */
const RESELLER_TERMINAL_LOGS = [
  { time: "00:01", module: "CONFIG", message: "POST /api/v1/instances (plan: vps-1gb, os: ubuntu-22.04)" },
  { time: "00:02", module: "AUTH", message: "Bearer token validated. Master deposit balance deducted." },
  { time: "00:03", module: "REGION", message: "Allocating KVM hypervisor slot in Sidoarjo Data Center..." },
  { time: "00:05", module: "STORAGE", message: "Cloning OS image template to enterprise NVMe storage..." },
  { time: "00:07", module: "NET", message: "Attaching vmbr1 network bridge, configuring NAT & firewall..." },
  { time: "00:09", module: "BOOT", message: "Powering on virtual machine and initial health checks..." },
  { time: "00:10", module: "READY", message: '{"success":true,"status":"RUNNING","id":142}', isCommand: true },
];

const RESELLER_TERMINAL_STATS = [
  { value: "< 30s", label: "DEPLOY SPEED" },
  { value: "100%", label: "WHITE-LABEL" },
  { value: "NVMe", label: "STORAGE" },
  { value: "KVM", label: "HYPERVISOR" },
];

/* ─── Reseller FAQs ─── */
const RESELLER_FAQS = [
  {
    q: "Is Masdika branding completely hidden from my customers?",
    a: "Yes, 100%. Masdika operates purely as an invisible backend infrastructure provider. Your customers will never see the Masdika name, brand, or logo. Invoices, hostnames, and reverse DNS (PTR) can all be customized to your own domain."
  },
  {
    q: "How does the prepaid wholesale billing model work?",
    a: "You maintain a master wallet deposit on Masdika. When you provision or renew a VM via API, the wholesale price is automatically deducted. You bill your customers at your own chosen retail pricing and retain 100% of the margin."
  },
  {
    q: "How fast is Virtual Machine provisioning via API?",
    a: "Virtual Machines are provisioned asynchronously on our enterprise Dell PowerEdge R630 hypervisors. In most cases, disk attachment and OS bootstrapping complete with status RUNNING in approximately 5 minutes."
  },
  {
    q: "Can my clients access the out-of-band noVNC console?",
    a: "Yes. You can generate a secure temporary console URL and token via POST /api/v1/instances/:id/console, which can be embedded as an iframe or popup directly inside your customer dashboard."
  },
  {
    q: "Can I automate WHMCS or custom billing portals?",
    a: "Absolutely. Our standard RESTful JSON API makes it easy to integrate automated provisioning, suspensions, power reboots, and terminations into WHMCS, Clientexec, or your custom client control panel."
  },
  {
    q: "What happens if my master wallet balance runs low?",
    a: "You will receive an automated low-balance alert 24 hours before any instance renewal. If renewal fails, instances are suspended temporarily and can be reactivated instantly upon topping up your master balance."
  }
];

/* ─── Developer Quickstart Snippets ─── */
const QUICKSTART_SNIPPETS = {
  curl: `curl -X POST "https://www.masdika.id/api/v1/instances" \\
  -H "Authorization: Bearer masdika_YOUR_SECRET_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "hostname": "vps-client-01.yourdomain.com",
    "os": "ubuntu-22.04",
    "plan": "vps-1gb",
    "password": "SecureRootPassword123!"
  }'`,

  node: `const response = await fetch("https://www.masdika.id/api/v1/instances", {
  method: "POST",
  headers: {
    "Authorization": "Bearer masdika_YOUR_SECRET_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    hostname: "vps-client-01.yourdomain.com",
    os: "ubuntu-22.04",
    plan: "vps-1gb",
    password: "SecureRootPassword123!"
  })
});

const data = await response.json();
console.log("Provisioned VM ID:", data.data.id);`,

  python: `import requests

url = "https://www.masdika.id/api/v1/instances"
headers = {
    "Authorization": "Bearer masdika_YOUR_SECRET_KEY",
    "Content-Type": "application/json"
}
payload = {
    "hostname": "vps-client-01.yourdomain.com",
    "os": "ubuntu-22.04",
    "plan": "vps-1gb",
    "password": "SecureRootPassword123!"
}

response = requests.post(url, json=payload, headers=headers)
print("Response:", response.json())`,

  php: `<?php
$ch = curl_init("https://www.masdika.id/api/v1/instances");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        "Authorization: Bearer masdika_YOUR_SECRET_KEY",
        "Content-Type: application/json"
    ],
    CURLOPT_POSTFIELDS => json_encode([
        "hostname" => "vps-client-01.yourdomain.com",
        "os" => "ubuntu-22.04",
        "plan" => "vps-1gb",
        "password" => "SecureRootPassword123!"
    ])
]);

$response = curl_exec($ch);
curl_close($ch);
$result = json_decode($response, true);
print_r($result);
?>`
};

/* ─── Reusable Copy Button ─── */
const CopyBtn = ({ text, small, darkStyle }: { text: string; small?: boolean; darkStyle?: boolean }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button 
      onClick={handleCopy} 
      className={cn(
        "rounded-md transition-all shrink-0 cursor-pointer flex items-center justify-center", 
        small ? "p-1" : "p-1.5",
        darkStyle
          ? "hover:bg-white/10"
          : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"
      )} 
      style={darkStyle ? { color: "#94a3b8" } : undefined}
      title="Copy to clipboard"
    >
      {copied ? <Check className={cn("text-emerald-400", small ? "w-3 h-3" : "w-3.5 h-3.5")} /> : <Copy className={small ? "w-3 h-3" : "w-3.5 h-3.5"} />}
    </button>
  );
};

/* ─── Method Badge ─── */
const MethodBadge = ({ method }: { method: string }) => {
  const colors: Record<string, string> = {
    GET: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    POST: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    DELETE: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
    PUT: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    PATCH: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
  };
  return (
    <span className={cn("px-2 py-0.5 rounded text-[11px] font-black tracking-wider border", colors[method] || colors.GET)}>
      {method}
    </span>
  );
};

/* ─── Dedicated Dark Code Block (Always Crisp in Both Light & Dark) ─── */
const CodeBlock = ({ title, children, raw }: { title: string; children: React.ReactNode; raw?: string }) => (
  <div 
    className="rounded-xl overflow-hidden shadow-xl"
    style={{ backgroundColor: "#020617", border: "1px solid rgba(255, 255, 255, 0.1)" }}
  >
    <div 
      className="flex items-center justify-between px-4 py-2.5"
      style={{ backgroundColor: "#090d16", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}
    >
      <div className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300 ml-1.5 font-mono">{title}</span>
      </div>
      {raw && <CopyBtn text={raw} small darkStyle />}
    </div>
    <div 
      className="p-4 overflow-x-auto font-mono text-[13px] leading-[1.7] text-slate-100 selection:bg-cyan-500/30 hide-scrollbar"
      style={{ backgroundColor: "#020617", color: "#f8fafc" }}
    >
      {children}
    </div>
  </div>
);

/* ─── Endpoint Section ─── */
const EndpointSection = ({ id, title, method, endpoint, description, parameters, payload, response }: any) => {
  let curlCommand = `curl "https://www.masdika.id${endpoint}" \\\n  -H "Authorization: Bearer masdika_YOUR_SECRET_KEY" \\\n  -X ${method}`;
  if (payload) {
    curlCommand += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${payload}'`;
  }

  return (
    <section id={id} className="scroll-mt-24 border-b border-[var(--border-primary)] last:border-b-0">
      <div className="grid grid-cols-1 xl:grid-cols-2">
        {/* Left: Documentation */}
        <div className="p-6 md:p-8 lg:p-10 bg-[var(--surface)]">
          <div className="flex items-center gap-3 mb-4">
            <MethodBadge method={method} />
            <h2 className="text-xl font-bold flex items-center gap-2 group text-[var(--text-primary)]">
              {title}
              <a href={`#${id}`} className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-muted)] hover:text-cyan-500">
                <LinkIcon className="w-3.5 h-3.5" />
              </a>
            </h2>
          </div>

          <div className="mb-6 text-[var(--text-secondary)]">
            <p className="text-sm leading-relaxed">{description}</p>
          </div>

          {/* Endpoint */}
          <div className="mb-6">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] font-mono text-sm overflow-x-auto text-[var(--text-primary)]">
              <span className={cn("font-black text-xs",
                method === "GET" ? "text-blue-600 dark:text-blue-400" :
                  method === "POST" ? "text-emerald-600 dark:text-emerald-400" :
                    method === "DELETE" ? "text-red-600 dark:text-red-400" :
                      "text-amber-600 dark:text-amber-400"
              )}>{method}</span>
              <span className="font-semibold">https://www.masdika.id{endpoint}</span>
            </div>
          </div>

          {/* Parameters Table */}
          {parameters && (
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">Parameters</h3>
              <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] overflow-x-auto">
                <table className="w-full min-w-[500px] text-sm text-left">
                  <thead className="text-[10px] uppercase tracking-wider border-b border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-muted)]">
                    <tr>
                      <th className="px-4 py-2.5 font-bold">Parameter</th>
                      <th className="px-4 py-2.5 font-bold">Type</th>
                      <th className="px-4 py-2.5 font-bold">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-primary)]">
                    {parameters.map((p: any, i: number) => (
                      <tr key={i} className="hover:bg-[var(--surface-secondary)]/50 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-[12px] font-bold text-cyan-600 dark:text-cyan-400">{p.name}</td>
                        <td className="px-4 py-2.5 text-[12px] text-[var(--text-muted)]">{p.type}</td>
                        <td className="px-4 py-2.5 text-[12px] text-[var(--text-secondary)]">{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right: Code Examples */}
        <div className="p-6 md:p-8 lg:p-10 border-t xl:border-t-0 xl:border-l border-[var(--border-primary)] bg-[var(--surface-secondary)]/40 space-y-6">
          {payload !== undefined && (
            <CodeBlock title="Request" raw={curlCommand}>
              <span className="text-pink-400 font-bold">curl</span> <span className="text-amber-300 font-medium">&quot;https://www.masdika.id{endpoint}&quot;</span> \<br />
              <span className="text-pink-400 font-bold">  -H</span> <span className="text-amber-300 font-medium">&quot;Authorization: Bearer masdika_YOUR_SECRET_KEY&quot;</span> \<br />
              <span className="text-pink-400 font-bold">  -X</span> <span className="text-cyan-400 font-bold">{method}</span>
              {payload && (
                <>
                  {` \\\n`}
                  <span className="text-pink-400 font-bold">  -H</span> <span className="text-amber-300 font-medium">&quot;Content-Type: application/json&quot;</span> \<br />
                  <span className="text-pink-400 font-bold">  -d</span> <span className="text-emerald-400 font-medium">&#39;{payload}&#39;</span>
                </>
              )}
            </CodeBlock>
          )}

          {response !== undefined && (
            <CodeBlock title="Response" raw={response}>
              <code className="text-emerald-400 font-mono">{response}</code>
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
  const [activeId, setActiveId] = useState("introduction");
  const [quickstartTab, setQuickstartTab] = useState<"curl" | "node" | "python" | "php">("curl");

  // OS Slider ref and dragging logic
  const osScrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const isPausedRef = useRef(false);
  const dragLastXRef = useRef(0);
  const lastTouchXRef = useRef(0);

  // Helper to measure exact width of 1 complete OS set
  const getItemSetWidth = useCallback((container: HTMLDivElement) => {
    const children = container.children;
    const n = SUPPORTED_OPERATING_SYSTEMS.length;
    if (children.length >= n * 2) {
      const el0 = children[0] as HTMLElement;
      const elN = children[n] as HTMLElement;
      const diff = elN.offsetLeft - el0.offsetLeft;
      if (diff > 0) return diff;
    }
    return container.scrollWidth / 6;
  }, []);

  // Seamless wrap-around logic ensuring infinite continuous flow
  const wrapScroll = useCallback((container: HTMLDivElement) => {
    const setWidth = getItemSetWidth(container);
    if (!setWidth || setWidth <= 10) return;

    const minScroll = setWidth * 1.5;
    const maxScroll = setWidth * 3.5;

    while (container.scrollLeft >= maxScroll) {
      container.scrollLeft -= setWidth;
    }
    while (container.scrollLeft < minScroll) {
      container.scrollLeft += setWidth;
    }
  }, [getItemSetWidth]);

  // Initial scroll positioning into middle sets
  useEffect(() => {
    const container = osScrollRef.current;
    if (!container) return;

    const initPos = () => {
      const setWidth = getItemSetWidth(container);
      if (setWidth > 0 && (container.scrollLeft === 0 || container.scrollLeft < setWidth)) {
        container.scrollLeft = setWidth * 2;
      }
    };

    initPos();
    const timer = setTimeout(initPos, 150);
    return () => clearTimeout(timer);
  }, [getItemSetWidth]);

  // Infinite continuous auto-scroll loop (60fps)
  useEffect(() => {
    const container = osScrollRef.current;
    if (!container) return;

    let animationId: number;
    let accumulated = 0;
    const speed = 0.75;
    let isVisible = true;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]) {
        isVisible = entries[0].isIntersecting;
      }
    });
    observer.observe(container);

    const step = () => {
      if (!isPausedRef.current && !isDraggingRef.current && isVisible) {
        accumulated += speed;
        if (accumulated >= 1) {
          const px = Math.floor(accumulated);
          container.scrollLeft += px;
          accumulated -= px;
          wrapScroll(container);
        }
      }
      animationId = requestAnimationFrame(step);
    };

    animationId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationId);
      observer.disconnect();
    };
  }, [wrapScroll]);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!osScrollRef.current) return;
    setIsDragging(true);
    isDraggingRef.current = true;
    isPausedRef.current = true;
    dragLastXRef.current = e.pageX;
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const container = osScrollRef.current;
      if (!container || !isDraggingRef.current) return;
      e.preventDefault();
      const deltaX = e.pageX - dragLastXRef.current;
      dragLastXRef.current = e.pageX;
      container.scrollLeft -= deltaX;
      wrapScroll(container);
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      isDraggingRef.current = false;
      isPausedRef.current = false;
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    window.addEventListener("blur", handleGlobalMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("blur", handleGlobalMouseUp);
    };
  }, [isDragging, wrapScroll]);

  // Touch drag handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    isPausedRef.current = true;
    if (e.touches[0]) {
      lastTouchXRef.current = e.touches[0].pageX;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const container = osScrollRef.current;
    if (!container || !e.touches[0]) return;
    const currentX = e.touches[0].pageX;
    const deltaX = currentX - lastTouchXRef.current;
    lastTouchXRef.current = currentX;
    container.scrollLeft -= deltaX;
    wrapScroll(container);
  };

  const handleTouchEnd = () => {
    isPausedRef.current = false;
  };

  const handleManualSlide = (direction: "left" | "right") => {
    const container = osScrollRef.current;
    if (!container) return;
    const delta = direction === "left" ? -280 : 280;
    container.scrollBy({ left: delta, behavior: "smooth" });
  };

  // Scroll spy for API documentation
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
    <div className="flex flex-col min-h-screen pt-24 md:pt-32 pb-20 overflow-x-clip font-sans">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1">

        {/* ── 0. HERO (Identik Patokan Home Page, VPS, K3s & design.md) ────────── */}
        <section className="relative pt-8 sm:pt-12 pb-16 lg:pb-24 flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full">
            
            {/* Left – Text & Actions */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="max-w-2xl relative z-30"
            >
              {/* Status pill using shared Badge */}
              <div className="mb-8">
                <Badge variant="brand" dot dotColor="bg-emerald-400" size="md" className="font-mono uppercase">
                  WHITE-LABEL RESELLER API
                </Badge>
              </div>

              {/* Headline H1 (Ukuran sama persis Home Page, VPS & design.md) */}
              <h1 className="text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] mb-4 text-[var(--text-primary)]">
                Start Your Own Cloud Hosting Company
              </h1>

              {/* Subtitle / Lead (Ukuran sama persis Home Page) */}
              <p className="text-lg md:text-xl mb-10 max-w-xl leading-relaxed text-[var(--text-secondary)] font-normal">
                Use Masdika&apos;s white-label Reseller API to provision and manage high-performance Virtual Machines programmatically. Set your own markup and keep 100% of the profit.
              </p>

              {/* Action Buttons (size="lg" sama persis Home Page) */}
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href="/login"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Get Started
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href="#documentation"
                  leftIcon={<BookOpen className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                >
                  API Reference
                </Button>
              </div>
            </motion.div>

            {/* Right – Hero Avatar (reseller-api.png) with 4 Floating Badges */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="relative flex items-center justify-center mt-10 lg:mt-0"
            >
              <div className="relative w-full max-w-[360px] sm:max-w-[460px] lg:max-w-[520px] xl:max-w-[560px] h-[380px] sm:h-[440px] lg:h-[480px] mx-auto flex items-end justify-center">
                {/* Subtle ambient depth bloom behind avatar */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[300px] sm:w-[440px] sm:h-[360px] bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-3xl pointer-events-none -z-0" />

                {/* Floating Card 1: Top-Left (RESTful API) */}
                <div
                  className="absolute top-1 -left-1 sm:top-4 sm:-left-6 lg:-left-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-1 bg-white/95 dark:bg-[#061e33]/85 backdrop-blur-xl border border-slate-200/80 dark:border-cyan-500/30 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.5)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[145px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <CodeXml className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none">
                      RESTful API
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap">
                      JSON &amp; OpenAPI
                    </div>
                  </div>
                </div>

                {/* Floating Card 2: Top-Right (100% White-Label) */}
                <div
                  className="absolute top-14 -right-1 sm:top-4 sm:-right-6 lg:-right-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-2 bg-white/95 dark:bg-[#061e33]/85 backdrop-blur-xl border border-slate-200/80 dark:border-cyan-500/30 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.5)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[145px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none">
                      100% White-Label
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap">
                      Invisible Provider
                    </div>
                  </div>
                </div>

                {/* Floating Card 3: Bottom-Left (Instant Compute) */}
                <div
                  className="absolute bottom-20 -left-1 sm:bottom-12 sm:-left-6 lg:-left-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-3 bg-white/95 dark:bg-[#061e33]/85 backdrop-blur-xl border border-slate-200/80 dark:border-cyan-500/30 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.5)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[145px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <Server className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none">
                      Instant Compute
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap">
                      Programmatic VPS
                    </div>
                  </div>
                </div>

                {/* Floating Card 4: Bottom-Right (Power & VNC Console) */}
                <div
                  className="absolute bottom-2 -right-1 sm:bottom-12 sm:-right-6 lg:-right-10 z-20 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 animate-float-4 bg-white/95 dark:bg-[#061e33]/85 backdrop-blur-xl border border-slate-200/80 dark:border-cyan-500/30 shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.5)] hover:border-cyan-500/50 hover:scale-105 transition-all duration-200 select-none cursor-default max-w-[145px] sm:max-w-none"
                >
                  <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
                    <Activity className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <div className="text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-400 leading-none">
                      Control &amp; Metrics
                    </div>
                    <div className="text-[10px] sm:text-sm font-bold text-slate-800 dark:text-white leading-tight mt-0.5 sm:mt-1 whitespace-nowrap">
                      Power &amp; VNC Console
                    </div>
                  </div>
                </div>

                {/* Karakter reseller-api.png utuh & proporsional sesuai design.md */}
                <div
                  className="w-full h-full relative z-10 flex items-end justify-center"
                  style={{
                    maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 70%, rgba(0,0,0,0.7) 88%, rgba(0,0,0,0) 98%)",
                    WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 70%, rgba(0,0,0,0.7) 88%, rgba(0,0,0,0) 98%)"
                  }}
                >
                  <Image
                    src="/reseller-api.webp"
                    alt="Masdika – White-Label Reseller API"
                    width={1536}
                    height={1024}
                    priority={true}
                    unoptimized={true}
                    className="w-full h-full object-contain object-bottom"
                  />
                  <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/40 to-transparent pointer-events-none" />
                </div>
              </div>
            </motion.div>

          </div>
        </section>

        {/* ── 1. VALUE PILLARS (4 Trust Highlights, Equal Height) ────────── */}
        <section className="py-12 border-y border-[var(--border-primary)] mb-16 lg:mb-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {[
              { icon: CodeXml, title: "RESTful JSON API", desc: "Straightforward endpoints with predictable JSON responses and full OpenAPI reference." },
              { icon: ShieldCheck, title: "100% White-Label", desc: "No Masdika branding, custom PTR records, and completely invisible upstream provider." },
              { icon: Wallet, title: "Prepaid Master Balance", desc: "Top up via QRIS or Virtual Account with automatic hourly & monthly billing deduction." },
              { icon: Activity, title: "Real-time VM Lifecycle", desc: "Automate create, reboot, rebuild, ISO reinstall, and noVNC access programmatically." },
            ].map((pillar, i) => (
              <FadeIn key={i} delay={i * 0.1} direction="up" className="h-full">
                <div className="p-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] flex items-start gap-4 h-full shadow-sm hover:border-cyan-500/40 transition-colors">
                  <div className="w-11 h-11 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                    <pillar.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base mb-1.5 text-[var(--text-primary)]">{pillar.title}</h3>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">{pillar.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── 2. HARDWARE & ARCHITECTURE SHOWCASE ───────────────────────── */}
        <section id="features" className="scroll-mt-24 mb-16 lg:mb-24">
          <div className="relative rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-8 sm:p-12 shadow-xl overflow-hidden">
            <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-0" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              <div className="lg:col-span-7">
                <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
                  INFRASTRUCTURE ARCHITECTURE
                </span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
                  Enterprise Hardware Behind Your Custom Brand
                </h2>
                <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed mb-8 max-w-xl">
                  Deliver uncompromised cloud performance to your end clients. All virtual machines are backed by enterprise-grade Dell PowerEdge R630 servers, Intel Xeon processors, and high-IOPS NVMe/SSD storage located in Sidoarjo Datacenter.
                </p>

                <div className="space-y-3.5">
                  {[
                    "Dell PowerEdge R630 Dual-Socket Hardware Architecture",
                    "Intel Xeon E5-2673v4 High-Thread Processors",
                    "Enterprise NVMe & SSD Storage for High-Throughput I/O",
                    "Direct IIX & Local Routing with Under 20ms Latency across Indonesia",
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

              {/* Hardware Stats Grid */}
              <div className="lg:col-span-5 grid grid-cols-2 gap-4">
                <div className="p-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-center flex flex-col items-center justify-center">
                  <span className="text-4xl sm:text-5xl font-black text-cyan-600 dark:text-cyan-400 mb-1">
                    40
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Physical Cores
                  </span>
                </div>

                <div className="p-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-center flex flex-col items-center justify-center">
                  <span className="text-4xl sm:text-5xl font-black text-cyan-600 dark:text-cyan-400 mb-1">
                    80
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Compute Threads
                  </span>
                </div>

                <div className="p-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-center flex flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-2">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                    SSD Storage
                  </span>
                </div>

                <div className="p-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-center flex flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-2">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                    Sidoarjo DC
                  </span>
                </div>

                <div className="col-span-2 p-5 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] flex items-center gap-4">
                  <div className="w-11 h-11 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[var(--text-primary)]">
                      99.99% Network Availability
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">
                      Carrier-neutral backbone with enterprise reliability
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. WORKLOAD SOLUTIONS / TARGET USE CASES ──────────────────── */}
        <section className="mb-16 lg:mb-24">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              TARGET USE CASES
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Engineered for Modern Hosting &amp; Reselling
            </h2>
            <p className="text-base text-[var(--text-secondary)]">
              Scale your hosting business, SaaS platform, or digital agency without upfront hardware capital.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
            {[
              { 
                icon: Globe, 
                title: "Web Hosting & WHMCS Portals", 
                desc: "Automate VPS ordering, instant provisioning, automated renewals, and terminations directly inside your billing portal or WHMCS module." 
              },
              { 
                icon: Layers, 
                title: "SaaS & Multi-Tenant Platforms", 
                desc: "Spin up dedicated, isolated Linux or Windows environments programmatically for enterprise clients or on-demand customer sandboxes." 
              },
              { 
                icon: Server, 
                title: "Digital Agencies & Managed IT", 
                desc: "Offer reliable cloud hosting, staging environments, and database servers under your agency brand with 100% markup retention." 
              }
            ].map((srv, idx) => (
              <FadeIn key={idx} delay={idx * 0.1} direction="up" className="h-full">
                <div className="p-8 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 transition-all duration-200 h-full flex flex-col justify-between group shadow-sm">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-6 group-hover:scale-105 transition-transform">
                      <srv.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                      {srv.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      {srv.desc}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── 4. RESELLER WORKFLOW (3 Simple Steps) ─────────────────────── */}
        <section className="mb-16 lg:mb-24">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              RESELLER WORKFLOW
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Launch Your Cloud Brand in 3 Simple Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative items-stretch">
            {[
              { step: "01", title: "Generate API Key", desc: "Create your secure API token in your reseller dashboard and fund your master wallet via QRIS or Virtual Account." },
              { step: "02", title: "Integrate REST API", desc: "Connect your web app, billing portal, or WHMCS with standard cURL, Node.js, Python, or PHP using our OpenAPI specs." },
              { step: "03", title: "Scale & Keep 100% Margin", desc: "Set your own retail pricing, bill your customers, and let Masdika handle hypervisors, hardware, and network uptime." }
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 0.15} direction="up" className="h-full">
                <div className="p-8 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] text-center shadow-sm hover:border-cyan-500/40 transition-all flex flex-col justify-between h-full">
                  <div>
                    <div className="w-16 h-16 mx-auto rounded-full border border-[var(--border-primary)] bg-[var(--surface-secondary)] flex items-center justify-center mb-6">
                      <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400">{item.step}</span>
                    </div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-3">{item.title}</h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── 5. PROVISIONING SECTION (Live Terminal Simulation) ─────────── */}
        <div className="mb-16 lg:mb-24 rounded-3xl overflow-hidden border border-[var(--border-primary)] shadow-sm">
          <ProvisioningSection
            subtitle="AUTOMATED API PROVISIONING"
            title="Programmatic VM deployment in ~5 minutes."
            description="Send a single POST request with desired CPU cores, RAM, and OS image. Our hypervisors provision storage, attach network interfaces, and boot the instance automatically."
            buttonText="Explore API Documentation"
            buttonHref="#documentation"
            logs={RESELLER_TERMINAL_LOGS}
            stats={RESELLER_TERMINAL_STATS}
            terminalTitle="PROVISIONING RESELLER VM"
            iconType="vps"
            targetServer="Dell PowerEdge R630 • Sidoarjo DC"
            provisionEstimate="Backend: KVM Hypervisor (Estimasi ~5 Menit)"
          />
        </div>

        {/* ── 6. SUPPORTED OPERATING SYSTEMS CAROUSEL ───────────────────── */}
        <section className="pt-6 sm:pt-10 mb-16 lg:mb-24">
          <div className="text-center mb-8">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              OPERATING SYSTEMS
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] leading-[1.15] mb-3">
              Deploy Any OS Image via API
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)]">
              Choose from leading Linux distributions or Windows Server images ready in seconds via the <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 border border-cyan-200/80 dark:border-cyan-500/30">os</code> parameter.
            </p>
          </div>

          <div className="relative overflow-hidden w-full border border-[var(--border-primary)] bg-[var(--surface)] rounded-2xl p-6 shadow-md group">
            {/* Left Arrow Button */}
            <button
              type="button"
              onClick={() => handleManualSlide("left")}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-cyan-500 transition-all duration-200 shadow-md hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-105"
              aria-label="Previous OS"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Scroll Track */}
            <div className="w-full [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
              <div
                ref={osScrollRef}
                onMouseDown={handleMouseDown}
                onMouseEnter={() => { isPausedRef.current = true; }}
                onMouseLeave={() => {
                  if (!isDraggingRef.current) isPausedRef.current = false;
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onScroll={() => {
                  if (osScrollRef.current) wrapScroll(osScrollRef.current);
                }}
                className={cn(
                  "flex items-center gap-12 sm:gap-16 overflow-x-auto select-none py-2 w-full",
                  "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
                  isDragging ? "cursor-grabbing" : "cursor-grab"
                )}
              >
                {REPEATED_OPERATING_SYSTEMS.map((os, idx) => (
                  <div
                    key={`os-${idx}`}
                    className="flex items-center gap-3 shrink-0 transition-transform duration-200 select-none hover:scale-105"
                  >
                    <img
                      referrerPolicy="no-referrer"
                      src={os.icon}
                      alt={os.name}
                      className="h-8 w-8 sm:h-9 sm:w-9 object-contain pointer-events-none select-none"
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                    />
                    <span className="font-bold text-base sm:text-lg tracking-tight text-[var(--text-primary)] select-none pointer-events-none">
                      {os.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Arrow Button */}
            <button
              type="button"
              onClick={() => handleManualSlide("right")}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-cyan-500 transition-all duration-200 shadow-md hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-105"
              aria-label="Next OS"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* ── 7. DEVELOPER QUICKSTART CODE TABS (Always Dark High-Contrast Terminal) ─────────────────────────── */}
        <section className="mb-16 lg:mb-24">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              DEVELOPER QUICKSTART
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Integrate in Minutes With Any Stack
            </h2>
            <p className="text-base text-[var(--text-secondary)]">
              Standard HTTP REST requests with Bearer Token authentication. Copy-paste working examples in your favorite language.
            </p>
          </div>

          <div 
            className="max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl"
            style={{ backgroundColor: "#020617", border: "1px solid rgba(255, 255, 255, 0.12)" }}
          >
            {/* Header with terminal controls, tabs, and copy button */}
            <div 
              className="flex items-center justify-between px-4 py-3"
              style={{ backgroundColor: "#090d16", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden sm:flex items-center gap-1.5 mr-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                </div>
                {(["curl", "node", "python", "php"] as const).map((tab) => {
                  const isActive = quickstartTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setQuickstartTab(tab)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                      style={
                        isActive
                          ? { backgroundColor: "#00d2ff", color: "#050b14", fontWeight: 900, boxShadow: "0 2px 8px rgba(0, 210, 255, 0.3)" }
                          : { backgroundColor: "transparent", color: "#94a3b8" }
                      }
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLElement).style.color = "#ffffff";
                          (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255, 255, 255, 0.08)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLElement).style.color = "#94a3b8";
                          (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      {tab === "curl" ? "cURL" : tab === "node" ? "Node.js" : tab === "python" ? "Python" : "PHP"}
                    </button>
                  );
                })}
              </div>
              <CopyBtn text={QUICKSTART_SNIPPETS[quickstartTab]} darkStyle />
            </div>

            {/* High-Contrast Code Viewer with VS Code Syntax Highlighting */}
            <div 
              className="p-5 sm:p-6 overflow-x-auto font-mono text-[13px] leading-[1.7] selection:bg-cyan-500/30 hide-scrollbar"
              style={{ backgroundColor: "#020617" }}
            >
              <SyntaxHighlighter
                language={quickstartTab === "curl" ? "bash" : quickstartTab === "node" ? "javascript" : quickstartTab}
                style={vscDarkPlus}
                wrapLines={false}
                wrapLongLines={false}
                customStyle={{
                  margin: 0,
                  padding: 0,
                  background: 'transparent',
                  fontSize: '13px',
                  lineHeight: '1.7',
                }}
                codeTagProps={{
                  className: "font-mono",
                  style: { fontFamily: 'inherit' }
                }}
              >
                {QUICKSTART_SNIPPETS[quickstartTab]}
              </SyntaxHighlighter>
            </div>
          </div>
        </section>

        {/* ── 8. INTERACTIVE API DOCUMENTATION EXPLORER ──────────────────── */}
        <section id="documentation" className="scroll-mt-24 mb-16 lg:mb-24">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              API REFERENCE &amp; ENDPOINTS
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Complete RESTful API Documentation
            </h2>
            <p className="text-base text-[var(--text-secondary)]">
              Comprehensive specifications for virtual machine provisioning, power controls, console tickets, and automated deposit billing.
            </p>
          </div>

          <div className="flex w-full border border-[var(--border-primary)] bg-[var(--surface)] rounded-2xl shadow-xl">

            {/* Sidebar */}
            <aside 
              className="w-64 flex-shrink-0 border-r border-[var(--border-primary)] bg-[var(--surface)] hidden xl:block sticky top-24 self-start max-h-[calc(100vh-7rem)] overflow-y-auto rounded-l-2xl z-20"
              style={{ top: '96px' }}
            >
              <div className="p-5 space-y-6">
                  {navSections.map((section) => (
                    <div key={section.label}>
                      <h5 className="text-[10px] font-black uppercase tracking-widest mb-2 px-2 text-[var(--text-muted)]">
                        {section.label}
                      </h5>
                      <ul className="space-y-0.5">
                        {section.items.map((item) => (
                          <li key={item.id}>
                            <a
                              href={`#${item.id}`}
                              className={cn(
                                "flex items-center gap-2 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all",
                                activeId === item.id
                                  ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold"
                                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"
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
            </aside>

            {/* Main Content */}
            <div className="flex-1 min-w-0 bg-[var(--surface)] rounded-r-2xl overflow-hidden">

              {/* Introduction */}
              <section id="introduction" className="scroll-mt-24 border-b border-[var(--border-primary)]">
                <div className="grid grid-cols-1 xl:grid-cols-2">
                  <div className="p-6 md:p-8 lg:p-10 bg-[var(--surface)]">
                    <h2 className="text-xl font-bold mb-4 text-[var(--text-primary)]">Introduction</h2>
                    <div className="space-y-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                      <p>Welcome to the Masdika Reseller API! You can use our API to provision and manage cloud infrastructure such as Virtual Machines programmatically.</p>
                      <p>All endpoints are RESTful, consume and produce JSON, and require secure authentication via an API key.</p>
                    </div>
                    <div className="mt-6 p-4 rounded-xl border border-cyan-200/80 dark:border-cyan-500/30 bg-cyan-50/50 dark:bg-cyan-950/20 flex gap-3 text-sm">
                      <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-cyan-600 dark:text-cyan-400" />
                      <div>
                        <strong className="block mb-0.5 text-[var(--text-primary)]">White-Label Guarantee</strong>
                        <span className="text-[var(--text-secondary)]">We are purely a backend infrastructure provider. Your customers will never see the Masdika brand, logo, or pricing.</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 md:p-8 lg:p-10 border-t xl:border-t-0 xl:border-l border-[var(--border-primary)] bg-[var(--surface-secondary)]/30 flex flex-col justify-center">
                    <h4 className="text-[11px] font-bold uppercase tracking-widest mb-3 text-[var(--text-muted)]">Base URL</h4>
                    <div className="px-4 py-3 rounded-lg border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)] font-mono text-sm shadow-sm font-semibold">
                      https://www.masdika.id/api/v1
                    </div>
                  </div>
                </div>
              </section>

              {/* Authentication */}
              <section id="authentication" className="scroll-mt-24 border-b border-[var(--border-primary)]">
                <div className="grid grid-cols-1 xl:grid-cols-2">
                  <div className="p-6 md:p-8 lg:p-10 bg-[var(--surface)]">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-[var(--text-primary)]">
                      <Key className="w-5 h-5 text-cyan-600 dark:text-cyan-400" /> Authentication
                    </h2>
                    <div className="space-y-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                      <p>
                        Masdika API uses token-based authentication. You must include your API key in the <code className="font-mono font-bold px-1.5 py-0.5 rounded text-[12px] bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400">Authorization</code> header for every request.
                      </p>
                      <p>
                        You can generate a new API token at the Reseller API Dashboard after registering an account. Keep your token secure, as it carries full privileges to provision servers and deduct from your master balance.
                      </p>
                    </div>
                  </div>
                  <div className="p-6 md:p-8 lg:p-10 border-t xl:border-t-0 xl:border-l border-[var(--border-primary)] bg-[var(--surface-secondary)]/30 flex flex-col justify-center">
                    <h4 className="text-[11px] font-bold uppercase tracking-widest mb-3 text-[var(--text-muted)]">Header Format</h4>
                    <div className="px-4 py-3 rounded-lg border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)] font-mono text-[13px] shadow-sm">
                      <span className="font-bold text-cyan-600 dark:text-cyan-400">Authorization:</span> Bearer masdika_YOUR_SECRET_KEY
                    </div>
                  </div>
                </div>
              </section>

              {/* ── Endpoints ── */}
              <EndpointSection
                id="list-images"
                title="List OS Images"
                method="GET"
                endpoint="/api/v1/images"
                description="Retrieve a list of all available Operating System templates and their versions that can be used to provision a new Virtual Machine."
                payload={""}
                response={`{\n  "success": true,\n  "data": [\n    {\n      "id": 1,\n      "slug": "ubuntu-22.04",\n      "name": "ubuntu-22.04",\n      "family": "ubuntu",\n      "version": "22.04",\n      "osType": "l26"\n    },\n    {\n      "id": 2,\n      "slug": "almalinux-9",\n      "name": "almalinux-9",\n      "family": "almalinux",\n      "version": "9",\n      "osType": "l26"\n    }\n  ]\n}`}
              />

              <EndpointSection
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
                id="list-vms"
                title="List VMs"
                method="GET"
                endpoint="/api/v1/instances"
                description="Retrieve a list of all active VPS instances provisioned by your Reseller account."
                payload={""}
                response={`{\n  "success": true,\n  "data": [\n    {\n      "id": 142,\n      "hostname": "server1.yourdomain.com",\n      "status": "RUNNING",\n      "cpuCores": 1,\n      "ramGb": 1,\n      "diskGb": 20,\n      "osTemplate": "ubuntu-22.04",\n      "createdAt": "2024-01-01T12:00:00Z"\n    }\n  ]\n}`}
              />

              <EndpointSection
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
                id="get-balance"
                title="Get Balance"
                method="GET"
                endpoint="/api/v1/billing"
                description="Check your current reseller balance, number of active instances, and estimated monthly spend. Use this endpoint to verify sufficient funds before provisioning new instances."
                payload={""}
                response={`{\n  "success": true,\n  "data": {\n    "balance": 485400,\n    "currency": "IDR",\n    "activeInstances": 3,\n    "totalMonthlySpend": 43800\n  }\n}`}
              />

              <EndpointSection
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
                            <span key={pm.code} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-secondary)] shadow-xs">
                              <code className="font-bold text-cyan-600 dark:text-cyan-400">{pm.code}</code>
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
              <section id="integration-guide" className="scroll-mt-24 border-b border-[var(--border-primary)] last:border-b-0">
                <div className="grid grid-cols-1 xl:grid-cols-2">
                  <div className="p-6 md:p-8 lg:p-10 bg-[var(--surface)]">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 group text-[var(--text-primary)]">
                      Integration Guide
                      <a href="#integration-guide" className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-muted)] hover:text-cyan-500">
                        <LinkIcon className="w-3.5 h-3.5" />
                      </a>
                    </h2>
                    <div className="space-y-3 text-sm leading-relaxed mb-6 text-[var(--text-secondary)]">
                      <p>Masdika operates on a <strong className="text-[var(--text-primary)]">prepaid wholesale</strong> model. You top up your balance on Masdika, then provision VPS instances via the API. The wholesale cost is deducted from your balance automatically.</p>
                      <p>You handle your own customer billing using any payment gateway of your choice (<strong className="text-[var(--text-primary)]">Xendit, Midtrans, Duitku, Stripe</strong>, etc). Masdika only deducts the wholesale VPS cost — you keep all the profit from your markup.</p>
                    </div>

                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">Recommended Flow</h3>
                    <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                      {[
                        <>Customer places order on <strong className="text-[var(--text-primary)]">your website</strong> and pays via your payment gateway.</>,
                        <>Your server receives <strong className="text-[var(--text-primary)]">payment webhook</strong> confirming successful payment.</>,
                        <>Call <code className="font-mono text-[11px] px-1 py-0.5 rounded bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-cyan-600 dark:text-cyan-400">GET /api/v1/billing</code> to verify your Masdika balance is sufficient.</>,
                        <>Call <code className="font-mono text-[11px] px-1 py-0.5 rounded bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-cyan-600 dark:text-cyan-400">POST /api/v1/instances</code> to provision the VPS. Masdika deducts the wholesale cost.</>,
                        <><strong className="text-emerald-600 dark:text-emerald-400 font-bold">Your profit</strong> = Customer payment − Masdika wholesale cost. You set your own markup freely.</>,
                      ].map((text, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black mt-0.5 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400 shrink-0">{i + 1}</span>
                          <p>{text}</p>
                        </div>
                      ))}
                    </div>

                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3 mt-8">Billing Lifecycle &amp; Terminations</h3>
                    <div className="space-y-3 text-sm p-5 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-secondary)] shadow-sm">
                      <p><strong className="text-rose-600 dark:text-rose-400 font-bold">Important:</strong> You must maintain a sufficient balance to cover the monthly renewals of all your active instances.</p>
                      <ul className="list-disc pl-5 space-y-2">
                        <li><strong className="text-[var(--text-primary)]">Low Balance Warning (H-1):</strong> If your balance is insufficient within 24 hours, you will receive an email notification.</li>
                        <li><strong className="text-[var(--text-primary)]">Suspension (H=0):</strong> If the instance expires and your balance is still insufficient, the instance will be automatically <strong>STOPPED</strong> and marked as <code className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 px-1 py-0.5 rounded bg-[var(--surface)] border border-[var(--border-primary)]">SUSPENDED</code>.</li>
                        <li><strong className="text-emerald-600 dark:text-emerald-400 font-bold">Auto-Unsuspend:</strong> Simply <strong>Top Up your balance</strong>. Our system will automatically detect the top-up, deduct the required amount, extend the instance, and start the VM again.</li>
                        <li><strong className="text-[var(--text-primary)]">Termination (H+3):</strong> If a suspended instance is not renewed within <strong>3 days</strong> of suspension, it will be permanently <strong>DESTROYED</strong>. All data will be irrecoverable.</li>
                      </ul>
                    </div>
                  </div>

                  <div className="p-6 md:p-8 lg:p-10 border-t xl:border-t-0 xl:border-l border-[var(--border-primary)] bg-[var(--surface-secondary)]/30">
                    <CodeBlock 
                      title="Pseudocode"
                      raw={`// 1. Customer pays on YOUR website
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
}`}
                    >
                      <pre className="text-slate-100 font-mono text-[13px] leading-[1.7] m-0" style={{ color: "#f8fafc" }}>
                        <code>{`// 1. Customer pays on YOUR website
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
                      </pre>
                    </CodeBlock>
                  </div>
                </div>
              </section>

            </div>
          </div>
        </section>

        {/* ── 9. FINAL CTA SECTION ──────────────────────────────────────── */}
        <section className="py-16 lg:py-24">
          <div className="relative rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-10 md:p-16 text-center shadow-xl overflow-hidden max-w-5xl mx-auto">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-0" />

            <div className="relative z-10 max-w-2xl mx-auto">
              <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
                START RESELLING TODAY
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-tight mb-4">
                Ready to Launch Your Cloud Hosting Business?
              </h2>
              <p className="text-base sm:text-lg text-[var(--text-secondary)] mb-8 leading-relaxed">
                Join hosting providers, software agencies, and SaaS companies powered by Masdika Cloud infrastructure. Keep 100% of your retail margins.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href="/login"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Generate API Key
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href="/contact"
                >
                  Contact Reseller Support
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ── 10. FAQ SECTION ───────────────────────────────────────────── */}
        <FaqSection faqs={RESELLER_FAQS} />

      </div>
    </div>
  );
}
