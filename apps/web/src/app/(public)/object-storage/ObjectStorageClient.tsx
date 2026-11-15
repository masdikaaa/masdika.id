"use client";

import { useState } from "react";
import {
  HardDrive,
  Zap,
  ShieldCheck,
  ArrowRight,
  Globe,
  CheckCircle2,
  Lock,
  Sparkles,
  Terminal,
  Copy,
  Check,
  Rocket,
  Layers,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HeroAvatarFrame } from "@/components/ui/HeroAvatarFrame";
import { FadeIn } from "@/components/animations/FadeIn";
import { AnimatedBeam, OrbitalRings } from "@/components/animations/DeploymentAnimations";
import { ProvisioningSection } from "@/components/ui/ProvisioningSection";
import { FaqSection } from "@/components/ui/FaqSection";
import { formatRupiah } from "@/lib/billing";
import { cn } from "@/lib/utils";

const S3_LOGS = [
  { time: "00:01", module: "BUCKET", message: "Allocating isolated S3 namespace & quota policy on storage cluster..." },
  { time: "00:02", module: "IAM", message: "Minting scoped Access Key ID & Secret Access Key with AES-256..." },
  { time: "00:03", module: "TLS", message: "Binding S3-compatible endpoint https://s3.masdika.id with TLS 1.3..." },
  { time: "00:04", module: "CORS", message: "Applying bucket ACL & presigned URL signing policies..." },
  { time: "00:05", module: "READY", message: "aws s3 ls s3://masdika-s3-prod --endpoint-url https://s3.masdika.id", isCommand: true },
];

const S3_STATS = [
  { value: "S3 v4", label: "PROTOCOL SIGNING" },
  { value: "AES-256", label: "AT-REST CIPHER" },
  { value: "99.9%", label: "CLUSTER UPTIME" },
  { value: "<12ms", label: "IIX PEERING" },
];

const S3_FAQS = [
  {
    q: "Is Masdika Object Storage 100% compatible with AWS S3 SDKs and tools?",
    a: "Yes. Masdika Object Storage implements the standard Amazon S3 REST API with Signature Version 4 (AWS4-HMAC-SHA256). You can use AWS CLI, boto3, @aws-sdk/client-s3, Laravel Flysystem S3, rclone, Terraform, or Cyberduck simply by pointing the endpoint URL to https://s3.masdika.id."
  },
  {
    q: "Can I upgrade my Object Storage plan later without losing data?",
    a: "Yes! Upgrades are completely non-destructive and take effect immediately. Your existing buckets, objects, folder structure, and IAM access keys remain intact while your storage quota, max buckets, and max IAM keys expand seamlessly."
  },
  {
    q: "How are buckets and IAM credentials isolated?",
    a: "Each Object Storage instance runs inside its own isolated tenant namespace with dedicated IAM Access Keys and Secret Keys. You can create multiple buckets, toggle public-read or private ACLs per bucket, and rotate or revoke keys anytime from the dashboard."
  },
  {
    q: "What is the difference between Object Storage and File CDN?",
    a: "Object Storage gives you full S3-compatible buckets, folders, IAM keys, presigned URLs, and SDK/CLI integration for application backends, backups, and media pipelines. File CDN is tailored for instant browser/REST uploads with temporary auto-expiring links and edge caching."
  },
  {
    q: "How does Pay-As-You-Go (PAYG) hourly billing work?",
    a: "Your wallet is billed hourly based on your selected storage tier starting from Rp 7/hour (Rp 5.000/month for 1 GB). You can scale up anytime, and if your balance runs low we provide a 3-day grace period before data is removed."
  },
  {
    q: "Where is the data physically stored?",
    a: "All buckets and objects are stored on enterprise SSD/NVMe arrays inside our Sidoarjo Data Center in Indonesia with direct IIX and OpenIX peering for sub-15ms local throughput."
  }
];

const RAW_CODE = {
  "aws-cli": `export AWS_ACCESS_KEY_ID="YOUR_ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="YOUR_SECRET_KEY"

aws s3 cp ./backup.tar.gz s3://my-app-bucket/backups/ \\
  --endpoint-url https://s3.masdika.id`,
  nodejs: `import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "id-sidoarjo-1",
  endpoint: "https://s3.masdika.id",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
});

await s3.send(new PutObjectCommand({
  Bucket: "my-app-bucket",
  Key: "uploads/avatar.webp",
  Body: fileBuffer,
}));`,
  python: `import boto3

s3 = boto3.client(
    "s3",
    endpoint_url="https://s3.masdika.id",
    aws_access_key_id="YOUR_ACCESS_KEY",
    aws_secret_access_key="YOUR_SECRET_KEY",
)

s3.upload_file("report.pdf", "my-app-bucket", "docs/report.pdf")
print("Uploaded to S3!")`,
  laravel: `// config/filesystems.php
's3' => [
    'driver' => 's3',
    'key' => env('AWS_ACCESS_KEY_ID'),
    'secret' => env('AWS_SECRET_ACCESS_KEY'),
    'region' => 'id-sidoarjo-1',
    'bucket' => env('AWS_BUCKET'),
    'endpoint' => 'https://s3.masdika.id',
    'use_path_style_endpoint' => true,
],`
};

interface PlanItem {
  id: number;
  name: string;
  service: string;
  description: string | null;
  price: number;
  hourlyPrice: number;
  limits: string;
  isPopular: boolean;
  isActive: boolean;
}

export default function ObjectStorageClient({
  isEnabled = true,
  initialPlans = []
}: {
  isEnabled?: boolean;
  initialPlans?: PlanItem[];
}) {
  const [activeCodeTab, setActiveCodeTab] = useState<"aws-cli" | "nodejs" | "python" | "laravel">("aws-cli");
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(RAW_CODE[activeCodeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPlanSpecs = (plan: PlanItem) => {
    try {
      if (!plan.limits) return [];
      const limits = typeof plan.limits === "string" ? JSON.parse(plan.limits) : plan.limits;
      const specs: string[] = [];
      const storageLabel = limits.storage || (limits.storageGb ? `${limits.storageGb} GB` : null);
      if (storageLabel) specs.push(`${storageLabel} Enterprise Storage`);
      if (limits.maxBuckets) specs.push(`Up to ${limits.maxBuckets} Isolated Buckets`);
      if (limits.maxKeys) specs.push(`Up to ${limits.maxKeys} IAM Access Keys`);
      if (limits.region) specs.push(`${limits.region} DC Region`);
      return specs;
    } catch {
      return ["S3-Compatible REST API", "IAM Access Keys & Presigned URLs"];
    }
  };

  return (
    <div className="flex flex-col min-h-screen pt-28 sm:pt-36 md:pt-40 pb-10 sm:pb-14 overflow-x-hidden">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1">

        {/* ── 0. HERO ────────── */}
        <section className="relative pt-6 sm:pt-10 pb-8 sm:pb-12 flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full">

            {/* Left – Text & Actions */}
            <div className="max-w-2xl relative z-30">
              <div className="mb-8">
                <Badge variant="brand" dot dotColor="bg-emerald-400" size="md" className="font-mono uppercase">
                  S3-COMPATIBLE OBJECT STORAGE &amp; BUCKETS
                </Badge>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] mb-4 text-[var(--text-primary)]">
                Scalable S3 <br />
                <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-100 bg-clip-text text-transparent">
                  Object Storage.
                </span>
              </h1>

              <p className="text-lg md:text-xl mb-10 max-w-xl leading-relaxed text-[var(--text-secondary)] font-normal">
                Store application assets, database backups, and unstructured data in isolated S3-compatible buckets. Powered by enterprise NVMe storage in Indonesia with IAM access keys, presigned URLs, and instant zero-downtime upgrades.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href={isEnabled ? "/dashboard/object-storage/new" : "#pricing"}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  {isEnabled ? "Create S3 Storage" : "View Storage Plans"}
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href="#pricing"
                  leftIcon={<HardDrive className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                >
                  View Pricing
                </Button>
              </div>
            </div>

            {/* Right – Hero Avatar (object-storage-mascot.webp) with 4 Floating Badges */}
            <div className="relative flex items-center justify-center mt-6 lg:mt-0">
              <HeroAvatarFrame
                imageSrc="/images/object-storage-mascot.webp"
                imageAlt="Masdika S3-Compatible Object Storage"
                imageWidth={1536}
                imageHeight={1024}
                badges={[
                  { icon: HardDrive, label: "S3 Compatible", value: "AWS v4 Signature" },
                  { icon: ShieldCheck, label: "Data Privacy", value: "AES-256 & TLS 1.3" },
                  { icon: KeyRound, label: "IAM Control", value: "Scoped Access Keys" },
                  { icon: Zap, label: "Local Peering", value: "Sub-15ms IIX Speed" },
                ]}
              />
            </div>

          </div>
        </section>

        {/* ── 1. VALUE PILLARS ────────── */}
        <section className="py-10 sm:py-14 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {[
              {
                icon: HardDrive,
                title: "100% S3 API Compatible",
                desc: "Drop-in replacement for Amazon S3. Works out of the box with AWS SDKs, rclone, Laravel, Django, and Terraform."
              },
              {
                icon: KeyRound,
                title: "Dedicated IAM & Presigned URLs",
                desc: "Generate scoped Access Key & Secret Key pairs and issue time-limited presigned URLs for secure client uploads."
              },
              {
                icon: Layers,
                title: "Zero-Downtime Upgrades",
                desc: "Start at 1 GB for Rp 5.000/mo and scale storage quotas anytime without migrating buckets or losing a single object."
              },
              {
                icon: ShieldCheck,
                title: "Enterprise Isolation",
                desc: "Isolated bucket namespaces backed by redundant storage arrays in Sidoarjo DC with encrypted TLS 1.3 transport."
              },
            ].map((pillar, i) => (
              <FadeIn key={i} delay={i * 0.1} direction="up" className="h-full">
                <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 transition-colors duration-200 p-6 flex flex-col justify-between h-full group shadow-sm">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
                      <pillar.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] mb-2 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors">
                      {pillar.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      {pillar.desc}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── 2. DEVELOPER CODE & INTEGRATION SHOWCASE ────────── */}
        <section className="py-10 sm:py-14 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

            {/* Left: Dedicated High-Contrast Code Terminal */}
            <div className="lg:col-span-7">
              <FadeIn direction="up">
                <div
                  className="rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden"
                  style={{ backgroundColor: "#060d19" }}
                >

                  {/* Row 1: Window Controls + Title + Copy Button */}
                  <div
                    className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-slate-800"
                    style={{ backgroundColor: "#0c1425" }}
                  >
                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]" />
                      <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]" />
                      <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]" />
                      <span className="text-xs font-mono font-bold text-slate-200 ml-1.5 tracking-wide">
                        s3-sdk — integration
                      </span>
                    </div>

                    <button
                      onClick={handleCopyCode}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold transition-all flex items-center gap-1.5 text-xs cursor-pointer shadow-sm hover:scale-105 active:scale-95 shrink-0"
                      title="Copy code snippet"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-sans text-xs">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="font-sans text-slate-100 text-xs">Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Row 2: Language Switcher Tabs Sub-bar */}
                  <div
                    className="px-4 sm:px-6 py-2 border-b border-slate-800/80 flex items-center justify-between gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                    style={{ backgroundColor: "#080f1d" }}
                  >
                    <div className="flex items-center gap-1 p-0.5 rounded-xl border border-slate-800 shadow-inner bg-[#040810]">
                      {(["aws-cli", "nodejs", "python", "laravel"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveCodeTab(tab)}
                          className={cn(
                            "px-2.5 sm:px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0",
                            activeCodeTab === tab
                              ? "bg-cyan-500 text-slate-950 shadow-sm"
                              : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                          )}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                      https://s3.masdika.id
                    </span>
                  </div>

                  {/* Code Body */}
                  <div className="relative p-4 sm:p-6 font-mono text-xs sm:text-[14px] md:text-[15px] leading-relaxed overflow-x-auto [scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-700/80 [&::-webkit-scrollbar-thumb]:rounded-full">
                    <div className="flex">
                      {/* Line Numbers Column */}
                      <div className="select-none text-right pr-4 mr-4 border-r border-slate-800 text-slate-500 font-mono text-xs sm:text-sm leading-relaxed space-y-0.5">
                        {RAW_CODE[activeCodeTab].split("\n").map((_, idx) => (
                          <div key={idx}>{idx + 1}</div>
                        ))}
                      </div>

                      {/* Code Content */}
                      <div className="flex-1 min-w-0 font-mono text-slate-100 selection:bg-cyan-500/30 whitespace-pre">
                        {activeCodeTab === "aws-cli" && (
                          <div>
                            <div><span className="text-purple-400 font-bold">export</span> <span className="text-cyan-300">AWS_ACCESS_KEY_ID</span>=<span className="text-emerald-300">&quot;YOUR_ACCESS_KEY&quot;</span></div>
                            <div><span className="text-purple-400 font-bold">export</span> <span className="text-cyan-300">AWS_SECRET_ACCESS_KEY</span>=<span className="text-emerald-300">&quot;YOUR_SECRET_KEY&quot;</span></div>
                            <div>&nbsp;</div>
                            <div><span className="text-cyan-400 font-bold">aws</span> s3 cp ./backup.tar.gz <span className="text-sky-300">s3://my-app-bucket/backups/</span> <span className="text-slate-400 font-bold">\</span></div>
                            <div>{"  "}<span className="text-amber-300 font-bold">--endpoint-url</span> <span className="text-emerald-300">https://s3.masdika.id</span></div>
                          </div>
                        )}
                        {activeCodeTab === "nodejs" && (
                          <div>
                            <div><span className="text-purple-400 font-bold">import</span> &#123; <span className="text-sky-300">S3Client</span>, <span className="text-sky-300">PutObjectCommand</span> &#125; <span className="text-purple-400 font-bold">from</span> <span className="text-emerald-300">&quot;@aws-sdk/client-s3&quot;</span>;</div>
                            <div>&nbsp;</div>
                            <div><span className="text-purple-400 font-bold">const</span> <span className="text-slate-100">s3</span> = <span className="text-purple-400 font-bold">new</span> <span className="text-sky-300">S3Client</span>(&#123;</div>
                            <div>{"  "}region: <span className="text-emerald-300">&quot;id-sidoarjo-1&quot;</span>,</div>
                            <div>{"  "}endpoint: <span className="text-emerald-300">&quot;https://s3.masdika.id&quot;</span>,</div>
                            <div>{"  "}forcePathStyle: <span className="text-amber-300">true</span>,</div>
                            <div>{"  "}credentials: &#123;</div>
                            <div>{"    "}accessKeyId: process.env.S3_ACCESS_KEY!,</div>
                            <div>{"    "}secretAccessKey: process.env.S3_SECRET_KEY!,</div>
                            <div>{"  "}&#125;,</div>
                            <div>&#125;);</div>
                            <div>&nbsp;</div>
                            <div><span className="text-purple-400 font-bold">await</span> s3.<span className="text-blue-300">send</span>(<span className="text-purple-400 font-bold">new</span> <span className="text-sky-300">PutObjectCommand</span>(&#123;</div>
                            <div>{"  "}Bucket: <span className="text-emerald-300">&quot;my-app-bucket&quot;</span>,</div>
                            <div>{"  "}Key: <span className="text-emerald-300">&quot;uploads/avatar.webp&quot;</span>,</div>
                            <div>{"  "}Body: fileBuffer,</div>
                            <div>&#125;));</div>
                          </div>
                        )}
                        {activeCodeTab === "python" && (
                          <div>
                            <div><span className="text-purple-400 font-bold">import</span> <span className="text-sky-300 font-bold">boto3</span></div>
                            <div>&nbsp;</div>
                            <div><span className="text-slate-100">s3</span> = boto3.<span className="text-blue-300">client</span>(</div>
                            <div>{"    "}<span className="text-emerald-300">&quot;s3&quot;</span>,</div>
                            <div>{"    "}endpoint_url=<span className="text-emerald-300">&quot;https://s3.masdika.id&quot;</span>,</div>
                            <div>{"    "}aws_access_key_id=<span className="text-emerald-300">&quot;YOUR_ACCESS_KEY&quot;</span>,</div>
                            <div>{"    "}aws_secret_access_key=<span className="text-emerald-300">&quot;YOUR_SECRET_KEY&quot;</span>,</div>
                            <div>)</div>
                            <div>&nbsp;</div>
                            <div>s3.<span className="text-blue-300">upload_file</span>(<span className="text-emerald-300">&quot;report.pdf&quot;</span>, <span className="text-emerald-300">&quot;my-app-bucket&quot;</span>, <span className="text-emerald-300">&quot;docs/report.pdf&quot;</span>)</div>
                            <div><span className="text-blue-300">print</span>(<span className="text-emerald-300">&quot;Uploaded to S3!&quot;</span>)</div>
                          </div>
                        )}
                        {activeCodeTab === "laravel" && (
                          <div>
                            <div><span className="text-slate-400 italic">// config/filesystems.php</span></div>
                            <div><span className="text-emerald-300">&apos;s3&apos;</span> =&gt; [</div>
                            <div>{"    "}<span className="text-emerald-300">&apos;driver&apos;</span> =&gt; <span className="text-emerald-300">&apos;s3&apos;</span>,</div>
                            <div>{"    "}<span className="text-emerald-300">&apos;key&apos;</span> =&gt; env(<span className="text-emerald-300">&apos;AWS_ACCESS_KEY_ID&apos;</span>),</div>
                            <div>{"    "}<span className="text-emerald-300">&apos;secret&apos;</span> =&gt; env(<span className="text-emerald-300">&apos;AWS_SECRET_ACCESS_KEY&apos;</span>),</div>
                            <div>{"    "}<span className="text-emerald-300">&apos;region&apos;</span> =&gt; <span className="text-emerald-300">&apos;id-sidoarjo-1&apos;</span>,</div>
                            <div>{"    "}<span className="text-emerald-300">&apos;bucket&apos;</span> =&gt; env(<span className="text-emerald-300">&apos;AWS_BUCKET&apos;</span>),</div>
                            <div>{"    "}<span className="text-emerald-300">&apos;endpoint&apos;</span> =&gt; <span className="text-emerald-300">&apos;https://s3.masdika.id&apos;</span>,</div>
                            <div>{"    "}<span className="text-emerald-300">&apos;use_path_style_endpoint&apos;</span> =&gt; <span className="text-amber-300">true</span>,</div>
                            <div>],</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Code Box Footer */}
                  <div
                    className="px-4 sm:px-6 py-2.5 sm:py-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono"
                    style={{ backgroundColor: "#0c1425" }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <span className="font-bold text-emerald-400">200 OK (ETag Verified)</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-300">S3 SigV4</span>
                    </div>

                    <div className="text-slate-200 font-medium flex items-center gap-1.5 overflow-x-auto text-[11px] sm:text-xs">
                      <span className="text-slate-400 shrink-0">Endpoint:</span>
                      <span className="text-cyan-300 font-bold bg-[#060d19] px-2 py-0.5 rounded border border-cyan-800/60 truncate max-w-[260px] sm:max-w-none">
                        https://s3.masdika.id
                      </span>
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>

            {/* Right: Architectural Highlights */}
            <div className="lg:col-span-5 space-y-6">
              <FadeIn direction="up" delay={0.2}>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
                    DEVELOPER ARCHITECTURE
                  </span>
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
                    Standard S3 API, Built for Production
                  </h2>
                  <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed mb-8 font-normal">
                    Connect your applications, CI/CD pipelines, and backup scripts using any standard S3 client library. Manage buckets, folders, ACLs, and IAM credentials from one clean web console.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "S3 Compatibility", value: "SigV4", sub: "AWS SDK & CLI Ready" },
                    { label: "Median TTFB", value: "<12ms", sub: "Direct IIX Peering" },
                    { label: "Entry Pricing", value: "Rp 5rb", sub: "Starts at 1 GB / mo" },
                    { label: "Bucket Upgrades", value: "Live", sub: "Zero Data Loss" },
                  ].map((stat, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] shadow-sm"
                    >
                      <div className="text-2xl sm:text-3xl font-black text-cyan-600 dark:text-cyan-400 mb-1">
                        {stat.value}
                      </div>
                      <div className="text-xs font-bold text-[var(--text-primary)] leading-tight">
                        {stat.label}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                        {stat.sub}
                      </div>
                    </div>
                  ))}
                </div>
              </FadeIn>
            </div>

          </div>
        </section>

        {/* ── 3. ENTERPRISE CAPABILITIES ────────── */}
        <section className="py-10 sm:py-14 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-8">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              ENTERPRISE CAPABILITIES
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Engineered for Durability &amp; Control
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-2xl mx-auto">
              Everything you need to store, organize, and serve unstructured object payloads with full IAM governance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
            {[
              {
                icon: Globe,
                title: "Multi-Bucket Management",
                desc: "Organize environments cleanly with dedicated buckets for staging, production assets, user uploads, and automated database snapshots."
              },
              {
                icon: Lock,
                title: "Granular Bucket Policies",
                desc: "Switch buckets between Private (presigned URL only) and Public Read with a single click, plus CORS support for direct browser uploads."
              },
              {
                icon: Sparkles,
                title: "In-Browser Object Explorer",
                desc: "Browse folders, preview images, upload files via drag-and-drop, and generate signed download links directly inside the macOS-style dashboard."
              }
            ].map((cap, i) => (
              <FadeIn key={i} delay={i * 0.1} direction="up" className="h-full">
                <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 transition-colors duration-200 p-8 h-full flex flex-col justify-between shadow-sm group">
                  <div>
                    <div className="w-14 h-14 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-6 group-hover:scale-110 transition-transform">
                      <cap.icon className="w-7 h-7" />
                    </div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors">
                      {cap.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      {cap.desc}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── 4. PRICING PLANS SECTION ────────── */}
        {initialPlans && initialPlans.length > 0 && (
          <section id="pricing" className="scroll-mt-24 py-10 sm:py-14 relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-8">
              <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
                TRANSPARENT PRICING
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
                Simple, Predictable S3 Tiers
              </h2>
              <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-2xl mx-auto">
                Pay hourly or monthly with zero hidden egress surprises. Upgrade anytime without data loss.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
              {initialPlans.map((plan, index) => {
                const isPopular = plan.isPopular;
                const specs = getPlanSpecs(plan);

                return (
                  <FadeIn key={plan.id} delay={index * 0.1} direction="up" className="h-full">
                    <div
                      className={cn(
                        "relative rounded-2xl p-8 h-full flex flex-col justify-between transition-all duration-300",
                        isPopular
                          ? "border-2 border-cyan-500 dark:border-cyan-400 bg-[var(--surface)] shadow-xl shadow-cyan-500/10 md:-translate-y-2"
                          : "border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 shadow-sm"
                      )}
                    >
                      {isPopular && (
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-cyan-500 text-white text-[11px] font-bold uppercase tracking-wider py-1 px-4 rounded-full shadow-md select-none">
                          Most Popular
                        </div>
                      )}

                      <div>
                        <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                          {plan.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mb-6 min-h-[36px]">
                          {plan.description || "High-durability S3-compatible object storage."}
                        </p>

                        <div className="mb-6 pb-6 border-b border-[var(--border-primary)]">
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl lg:text-4xl font-black text-[var(--text-primary)] tracking-tight">
                              {formatRupiah(plan.price)}
                            </span>
                            <span className="text-sm font-medium text-[var(--text-secondary)]">
                              /month
                            </span>
                          </div>
                          <div className="text-xs font-mono text-cyan-600 dark:text-cyan-400 mt-1">
                            {formatRupiah(plan.hourlyPrice)}/hour PAYG
                          </div>
                        </div>

                        <ul className="space-y-3.5 mb-8">
                          {specs.map((spec, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                              <span className="text-sm text-[var(--text-primary)] font-medium">
                                {spec}
                              </span>
                            </li>
                          ))}
                          <li className="flex items-start gap-3">
                            <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                            <span className="text-sm text-[var(--text-primary)] font-medium">
                              S3 API, Presigned URLs &amp; Web Explorer
                            </span>
                          </li>
                          <li className="flex items-start gap-3">
                            <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                            <span className="text-sm text-[var(--text-primary)] font-medium">
                              Seamless Zero-Loss Plan Upgrade
                            </span>
                          </li>
                        </ul>
                      </div>

                      {isEnabled ? (
                        <Button
                          variant={isPopular ? "primary" : "secondary"}
                          href={`/dashboard/object-storage/new?plan=${plan.id}`}
                          className="w-full justify-center"
                          leftIcon={<Rocket className="w-4 h-4" />}
                        >
                          Deploy Object Storage
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          disabled
                          className="w-full justify-center opacity-60 cursor-not-allowed"
                        >
                          Coming Soon
                        </Button>
                      )}
                    </div>
                  </FadeIn>
                );
              })}
            </div>
          </section>
        )}

        {/* ── 5. THREE-STEP WORKFLOW ────────── */}
        <section className="py-10 sm:py-14 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-8">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
              STORAGE WORKFLOW
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15] mb-4">
              Go Live in 3 Simple Steps
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-2xl mx-auto">
              Provision your isolated S3 namespace in seconds and connect your apps with standard SDKs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative items-stretch">
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-[2px] bg-slate-200 dark:bg-white/10 overflow-hidden rounded-full">
              <AnimatedBeam />
            </div>

            {[
              {
                step: "01",
                title: "Provision Instance",
                desc: "Select a storage tier starting from 1 GB and deploy your isolated S3 workspace with instant IAM credentials."
              },
              {
                step: "02",
                title: "Create Buckets & Keys",
                desc: "Create public or private buckets, upload folders via the web explorer, and mint scoped Access Keys."
              },
              {
                step: "03",
                title: "Connect Any S3 SDK",
                desc: "Point AWS CLI, Node.js, Python boto3, or Laravel to https://s3.masdika.id and scale anytime with zero data loss."
              }
            ].map((st, i) => (
              <FadeIn key={i} delay={i * 0.15} direction="up" className="h-full">
                <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-8 text-center shadow-sm hover:border-cyan-500/40 transition-all duration-300 h-full flex flex-col justify-between relative z-10 group">
                  <div>
                    <div className="w-20 h-20 mx-auto rounded-full bg-[var(--surface-secondary)] border border-[var(--border-primary)] flex items-center justify-center mb-6 relative group-hover:scale-110 transition-transform duration-300">
                      <OrbitalRings />
                      <span className="relative z-10 text-3xl font-black bg-gradient-to-br from-cyan-600 to-cyan-400 bg-clip-text text-transparent">
                        {st.step}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">
                      {st.title}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      {st.desc}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── 6. PROVISIONING TERMINAL & FAQ ────────── */}
        <ProvisioningSection
          title="Instant S3 Bucket Provisioning"
          description="Deploy isolated S3-compatible object storage with IAM keys, presigned URLs, and sub-15ms Indonesian peering."
          buttonText="Deploy Object Storage"
          buttonHref="/dashboard/object-storage/new"
          logs={S3_LOGS}
          stats={S3_STATS}
          iconType="file-cdn"
          terminalTitle="S3 CLUSTER"
          targetServer="S3 NVMe Cluster • Sidoarjo DC"
          provisionEstimate="Backend: S3-Compatible Object Engine (< 5 Sec)"
        />

        <FaqSection faqs={S3_FAQS} />

      </div>
    </div>
  );
}
