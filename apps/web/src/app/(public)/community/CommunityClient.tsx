"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { 
  Users, 
  Send, 
  Globe, 
  Server, 
  ShieldCheck, 
  Terminal, 
  ArrowRight, 
  ExternalLink, 
  Copy, 
  Check, 
  Search, 
  X, 
  CheckCircle2, 
  MessageSquare,
  Sparkles,
  Layers
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { HeroAvatarFrame } from "@/components/ui/HeroAvatarFrame";
import { FadeIn } from "@/components/animations/FadeIn";
import { cn } from "@/lib/utils";

// WhatsApp SVG icon
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// Telegram SVG icon
const TelegramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

// Detect platform from link
function getPlatform(link: string): "whatsapp" | "telegram" | "unknown" {
  if (link.includes("whatsapp.com")) return "whatsapp";
  if (link.includes("t.me") || link.includes("telegram.me")) return "telegram";
  return "unknown";
}

export interface CommunityGroupItem {
  id: number;
  name: string;
  link: string;
  image?: string | null;
  description?: string | null;
  isPublished?: boolean;
  createdAt?: string | Date;
}

export default function CommunityClient({ initialGroups }: { initialGroups: CommunityGroupItem[] }) {
  const [groups] = useState<CommunityGroupItem[]>(initialGroups);
  const [selectedPlatform, setSelectedPlatform] = useState<"all" | "whatsapp" | "telegram">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(8);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Form state
  const [link, setLink] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Filtered groups
  const filteredGroups = useMemo(() => {
    return groups.filter((group) => {
      const platform = getPlatform(group.link);
      const matchesPlatform =
        selectedPlatform === "all" ||
        (selectedPlatform === "whatsapp" && platform === "whatsapp") ||
        (selectedPlatform === "telegram" && platform === "telegram");

      const matchesSearch =
        searchQuery.trim() === "" ||
        group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.link.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesPlatform && matchesSearch;
    });
  }, [groups, selectedPlatform, searchQuery]);

  const platformCounts = useMemo(() => {
    const wa = groups.filter((g) => getPlatform(g.link) === "whatsapp").length;
    const tg = groups.filter((g) => getPlatform(g.link) === "telegram").length;
    return { all: groups.length, whatsapp: wa, telegram: tg };
  }, [groups]);

  const handleCopy = (id: number, groupLink: string) => {
    navigator.clipboard.writeText(groupLink);
    setCopiedId(id);
    toast.success("Community link copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!link.trim()) return;

    const isWhatsApp = link.startsWith("https://chat.whatsapp.com/");
    const isTelegram = link.startsWith("https://t.me/") || link.startsWith("https://telegram.me/");

    if (!isWhatsApp && !isTelegram) {
      toast.error("Link must be a WhatsApp (chat.whatsapp.com) or Telegram (t.me) group link.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link }),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || "Group submitted successfully and waiting for admin review!");
        setLink("");
      } else {
        toast.error(data.error || "Failed to submit group");
      }
    } catch {
      toast.error("A system error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const detectedPlatform = getPlatform(link);

  return (
    <div className="flex flex-col min-h-screen pt-24 md:pt-32 pb-20 overflow-x-hidden">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 flex-1">

        {/* ── 0. HERO (Identik Patokan Home Page, Vacancies & design.md) ────────── */}
        <section className="relative pt-8 sm:pt-12 pb-16 lg:pb-24 flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center w-full">
            
            {/* Left – Text & Actions */}
            <div className="max-w-2xl relative z-30">
              {/* Status pill using shared Badge */}
              <div className="mb-8">
                <Badge variant="brand" dot dotColor="bg-emerald-400" size="md" className="font-mono uppercase">
                  ACTIVE DEVELOPER NETWORK
                </Badge>
              </div>

              {/* Headline H1 (Ukuran sama persis Home Page & design.md) */}
              <h1 className="text-5xl md:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.05] mb-4 text-[var(--text-primary)]">
                Developer &amp; <br />
                <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-100 bg-clip-text text-transparent">
                  Tech Communities.
                </span>
              </h1>

              {/* Subtitle / Lead (Ukuran sama persis Home Page) */}
              <p className="text-lg md:text-xl mb-10 max-w-xl leading-relaxed text-[var(--text-secondary)] font-normal">
                Join active WhatsApp and Telegram developer groups to discuss cloud architecture, DevOps pipelines, Linux administration, and network with tech engineers.
              </p>

              {/* Action Buttons (size="lg" sama persis Home Page) */}
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  href="#community-groups"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Explore Communities
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  href="#submit-group"
                  leftIcon={<Users className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                >
                  Submit a Group
                </Button>
              </div>
            </div>

            {/* Right – Hero Avatar (community.webp) with 4 Floating Badges */}
            <div className="relative flex items-center justify-center mt-6 lg:mt-0">
              <HeroAvatarFrame
                imageSrc="/community.webp"
                imageAlt="Masdika – Developer Community"
                imageWidth={1536}
                imageHeight={1024}
                badges={[
                  { icon: Users, label: "Active Network", value: "Tech Enthusiasts" },
                  { icon: Globe, label: "Channels", value: "WhatsApp & TG" },
                  { icon: Server, label: "Tech Tracks", value: "Cloud & DevOps" },
                  { icon: ShieldCheck, label: "Moderated", value: "Spam-Free Groups" },
                ]}
              />
            </div>

          </div>
        </section>

        {/* ── 1. VALUE PILLARS (3 Highlights) ───────────────────────────── */}
        <section className="py-12 border-y border-[var(--border-primary)] mb-16 lg:mb-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
            <FadeIn delay={0.1} direction="up" className="h-full">
              <div className="p-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] flex items-start gap-4 h-full shadow-sm">
                <div className="w-11 h-11 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
                    Verified Tech Groups
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    Direct invite links inspected and filtered to ensure high-quality discussion and spam-free technical networking.
                  </p>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.2} direction="up" className="h-full">
              <div className="p-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] flex items-start gap-4 h-full shadow-sm">
                <div className="w-11 h-11 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                  <Terminal className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
                    Cloud &amp; DevOps Focused
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    Engage in technical discussions on Kubernetes, Linux, Terraform, Docker, and automation pipelines.
                  </p>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.3} direction="up" className="h-full">
              <div className="p-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] flex items-start gap-4 h-full shadow-sm">
                <div className="w-11 h-11 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
                    Engineering Networking
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    Collaborate with peers, share project opportunities, and ask troubleshooting advice in real time.
                  </p>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ── 2. COMMUNITY GROUPS DIRECTORY ─────────────────────────────── */}
        <section id="community-groups" className="scroll-mt-24 mb-20 lg:mb-28">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-4 block">
                DISCOVER COMMUNITIES
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-[var(--text-primary)] leading-[1.15]">
                Verified Developer Groups
              </h2>
            </div>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-md">
              Browse through developer communities across Indonesia and globally. Filter by your preferred chat platform.
            </p>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8 p-3 rounded-xl border border-[var(--border-primary)] bg-[var(--surface)]">
            {/* Platform Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setSelectedPlatform("all")}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap",
                  selectedPlatform === "all"
                    ? "bg-cyan-400 text-slate-950 shadow-sm"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"
                )}
              >
                All Groups
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px]",
                  selectedPlatform === "all" ? "bg-slate-950/20 text-slate-950" : "bg-[var(--surface-secondary)] text-[var(--text-muted)]"
                )}>
                  {platformCounts.all}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlatform("whatsapp")}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap",
                  selectedPlatform === "whatsapp"
                    ? "bg-cyan-400 text-slate-950 shadow-sm"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"
                )}
              >
                <WhatsAppIcon className="w-3.5 h-3.5" />
                WhatsApp
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px]",
                  selectedPlatform === "whatsapp" ? "bg-slate-950/20 text-slate-950" : "bg-[var(--surface-secondary)] text-[var(--text-muted)]"
                )}>
                  {platformCounts.whatsapp}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlatform("telegram")}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap",
                  selectedPlatform === "telegram"
                    ? "bg-cyan-400 text-slate-950 shadow-sm"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]"
                )}
              >
                <TelegramIcon className="w-3.5 h-3.5" />
                Telegram
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px]",
                  selectedPlatform === "telegram" ? "bg-slate-950/20 text-slate-950" : "bg-[var(--surface-secondary)] text-[var(--text-muted)]"
                )}>
                  {platformCounts.telegram}
                </span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px] sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search group name..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Grid Content */}
          {filteredGroups.length === 0 ? (
            <div className="text-center py-16 px-6 rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200/80 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mx-auto mb-4">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">
                No Community Groups Found
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-sm mx-auto">
                {searchQuery || selectedPlatform !== "all"
                  ? "Try clearing your search query or platform filter to see more groups."
                  : "Be the first to share your developer community with our network."}
              </p>
              {searchQuery || selectedPlatform !== "all" ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedPlatform("all");
                  }}
                >
                  Reset Filters
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  href="#submit-group"
                  leftIcon={<Users className="w-4 h-4" />}
                >
                  Submit First Group
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredGroups.slice(0, visibleCount).map((group, index) => {
                  const platform = getPlatform(group.link);
                  const isWhatsApp = platform === "whatsapp";
                  const isTelegram = platform === "telegram";
                  const isCopied = copiedId === group.id;

                  return (
                    <FadeIn key={group.id} delay={index * 0.05} direction="up" className="h-full">
                      <div className="group rounded-xl border border-[var(--border-primary)] bg-[var(--surface)] hover:border-cyan-500/40 p-5 sm:p-6 transition-all duration-200 flex flex-col justify-between h-full shadow-sm hover:shadow-md">
                        <div>
                          {/* Top row: Platform Tag */}
                          <div className="flex items-center justify-between gap-2 mb-4">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider",
                                isWhatsApp
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  : isTelegram
                                  ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                                  : "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"
                              )}
                            >
                              {isWhatsApp ? (
                                <>
                                  <WhatsAppIcon className="w-3 h-3" />
                                  WhatsApp
                                </>
                              ) : isTelegram ? (
                                <>
                                  <TelegramIcon className="w-3 h-3" />
                                  Telegram
                                </>
                              ) : (
                                <>
                                  <Globe className="w-3 h-3" />
                                  Community
                                </>
                              )}
                            </span>

                            <span className="text-[10px] font-medium text-[var(--text-muted)] flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-500" />
                              Verified
                            </span>
                          </div>

                          {/* Center: Avatar & Details */}
                          <div className="flex items-start gap-3.5 mb-3">
                            <div className="w-12 h-12 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] overflow-hidden flex items-center justify-center shrink-0">
                              {group.image ? (
                                <img
                                  referrerPolicy="no-referrer"
                                  src={group.image}
                                  alt={group.name}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  decoding="async"
                                />
                              ) : isWhatsApp ? (
                                <WhatsAppIcon className="w-6 h-6 text-emerald-500 group-hover:scale-110 transition-transform" />
                              ) : isTelegram ? (
                                <TelegramIcon className="w-6 h-6 text-sky-500 group-hover:scale-110 transition-transform" />
                              ) : (
                                <Users className="w-6 h-6 text-cyan-500 group-hover:scale-110 transition-transform" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-1 leading-snug">
                                {group.name}
                              </h3>
                              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                Public Group
                              </p>
                            </div>
                          </div>

                          {/* Description */}
                          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-2 mb-6">
                            {group.description || "Active tech and developer community for discussion, learning, and networking."}
                          </p>
                        </div>

                        {/* Bottom Action Row */}
                        <div className="flex items-center gap-2 pt-4 border-t border-[var(--border-primary)]">
                          <a
                            href={group.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-colors"
                          >
                            Join Group
                            <ExternalLink className="w-3 h-3" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleCopy(group.id, group.link)}
                            title="Copy link"
                            className="p-2 rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition-all flex items-center justify-center shrink-0"
                          >
                            {isCopied ? (
                              <Check className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </FadeIn>
                  );
                })}
              </div>

              {/* Load More Button */}
              {visibleCount < filteredGroups.length && (
                <div className="mt-12 flex justify-center">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setVisibleCount((prev) => prev + 8)}
                  >
                    Load More Communities ({filteredGroups.length - visibleCount} remaining)
                  </Button>
                </div>
              )}
            </>
          )}
        </section>

        {/* ── 3. SUBMIT GROUP SECTION (Design-system Compliant Card) ────── */}
        <section id="submit-group" className="scroll-mt-24 mb-12">
          <div className="relative rounded-2xl border border-[var(--border-primary)] bg-[var(--surface)] p-8 sm:p-12 overflow-hidden shadow-xl">
            {/* Soft Ambient Accent */}
            <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-gradient-to-bl from-cyan-500/10 via-sky-500/5 to-transparent rounded-full blur-3xl pointer-events-none -z-0" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              
              {/* Left Column: Information */}
              <div className="lg:col-span-7">
                <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-3 block">
                  COMMUNITY SUBMISSION
                </span>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[var(--text-primary)] leading-tight mb-4">
                  Have a Developer Group to Share?
                </h2>
                <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed mb-6 max-w-xl">
                  Share your WhatsApp or Telegram tech community with thousands of developers and engineers. Help build a strong collaborative ecosystem across Indonesia.
                </p>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-[var(--text-secondary)]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>WhatsApp (`chat.whatsapp.com`) &amp; Telegram (`t.me`) direct invite links</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-[var(--text-secondary)]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Focused on IT, cloud, DevOps, networking, programming, or Linux</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs sm:text-sm text-[var(--text-secondary)]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Reviewed by admin team before publishing to ensure zero spam</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Submission Form */}
              <div className="lg:col-span-5 w-full">
                <div className="p-6 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-secondary)] shadow-sm">
                  <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
                    Submit Invite Link
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mb-4">
                    Paste your group invite URL below to submit for review.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        {detectedPlatform === "whatsapp" ? (
                          <WhatsAppIcon className="h-4 w-4 text-emerald-500" />
                        ) : detectedPlatform === "telegram" ? (
                          <TelegramIcon className="h-4 w-4 text-sky-500" />
                        ) : (
                          <Globe className="h-4 w-4 text-[var(--text-muted)]" />
                        )}
                      </div>
                      <input
                        type="url"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        placeholder="https://chat.whatsapp.com/... or https://t.me/..."
                        required
                        className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-lg border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                      />
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      loading={submitting}
                      disabled={submitting || !link.trim()}
                      className="w-full"
                      leftIcon={<Send className="w-4 h-4" />}
                    >
                      Submit for Review
                    </Button>

                    <p className="text-[11px] text-[var(--text-muted)] text-center">
                      Protected by rate-limiting &amp; spam verification.
                    </p>
                  </form>
                </div>
              </div>

            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
