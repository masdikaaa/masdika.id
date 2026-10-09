"use client";
import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";
import { Reorder } from "framer-motion";
import { GripVertical, Calendar, Briefcase, Users, FileText, BookOpen, Save, RotateCcw, UploadCloud, Code, Compass, User, Server, LayoutDashboard, Star, Link2, Database, Cloud, Box , RefreshCw , Settings, Terminal, CodeXml } from "lucide-react";
import { SiKubernetes } from "react-icons/si";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";

const MENU_META: Record<string, { label: string; description: string; icon: React.ElementType; color: string; bg: string }> = {
  events:    { label: "Events & Webinars",  description: "Join the latest tech events and learn from the experts.",       icon: Calendar,  color: "text-cyan-400", bg: "bg-cyan-500/10" },
  vacancies: { label: "Job Vacancies",       description: "Discover the best career opportunities in the tech industry.", icon: Briefcase, color: "text-cyan-400",   bg: "bg-cyan-500/10"   },
  community: { label: "Community",           description: "Connect and discuss with other developers in the community.",   icon: Users,     color: "text-cyan-400", bg: "bg-cyan-500/10" },
  blog:      { label: "Blog & Articles",     description: "Read our latest technical insights and tutorials.",            icon: FileText,  color: "text-cyan-400", bg: "bg-cyan-500/10" },
  series:    { label: "Series",              description: "Structured learning paths covering networking, cloud, DevOps.", icon: BookOpen,  color: "text-cyan-400",   bg: "bg-cyan-500/10"   },
  upload:    { label: "File CDN",       description: "Securely upload temporary files up to 100MB.",                 icon: UploadCloud, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  "api-hub": { label: "API Hub",             description: "Discover and test public REST APIs for your projects.",        icon: Code,      color: "text-cyan-400", bg: "bg-cyan-500/10" },
  "reseller-api": { label: "Reseller API",   description: "White-label VPS provisioning API.",                            icon: CodeXml,   color: "text-cyan-400", bg: "bg-cyan-500/10" },
  shortener: { label: "URL Shortener",       description: "Create premium short links with custom aliases.",              icon: Link2,     color: "text-cyan-400", bg: "bg-cyan-500/10" },
  vps:       { label: "Cloud VPS",           description: "High-performance virtual private servers.",                    icon: Terminal,     color: "text-cyan-400", bg: "bg-cyan-500/10" },
  k3s:       { label: "Kubernetes (K3s)",    description: "Lightweight, fully managed Kubernetes clusters.",              icon: SiKubernetes,       color: "text-cyan-400", bg: "bg-cyan-500/10" },
  about:     { label: "About",               description: "Learn more about who we are and what we do.",                  icon: User,      color: "text-cyan-400", bg: "bg-cyan-500/10" },
  services:  { label: "Services",            description: "Professional services tailored for your needs.",               icon: Server,    color: "text-cyan-400", bg: "bg-cyan-500/10" },
  portfolio: { label: "Portfolio",           description: "A showcase of our past projects and achievements.",            icon: LayoutDashboard, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  skills:    { label: "Skills",              description: "Our technical capabilities and core competencies.",            icon: Compass,      color: "text-cyan-400", bg: "bg-cyan-500/10" },
};

const DEFAULT_ORDER  = ['events', 'vacancies', 'community', 'blog', 'series'];
const DEFAULT_BADGES = { events: 'New', vacancies: 'New', series: 'New' } as Record<string, string | false>;

const DEFAULT_DEV_ORDER  = ['api-hub', 'reseller-api', 'shortener', 'upload', 'vps', 'k3s'];
const DEFAULT_DEV_BADGES = { 'api-hub': 'New', 'reseller-api': 'New', shortener: 'New', upload: 'New', vps: 'Premium', k3s: 'Premium' } as Record<string, string | false>;

const DEFAULT_COMPANY_ORDER  = ['about', 'services', 'portfolio', 'skills'];
const DEFAULT_COMPANY_BADGES = {} as Record<string, string | false>;

export default function MenuOrderPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [order,   setOrder]   = useState<string[]>(DEFAULT_ORDER);
  const [badges,  setBadges]  = useState<Record<string, string | false>>(DEFAULT_BADGES);
  
  const [devOrder, setDevOrder] = useState<string[]>(DEFAULT_DEV_ORDER);
  const [devBadges, setDevBadges] = useState<Record<string, string | false>>(DEFAULT_DEV_BADGES);

  const [companyOrder, setCompanyOrder] = useState<string[]>(DEFAULT_COMPANY_ORDER);
  const [companyBadges, setCompanyBadges] = useState<Record<string, string | false>>(DEFAULT_COMPANY_BADGES);

  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/settings/menu-order')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.order)) setOrder(data.order);
        if (data.badges && typeof data.badges === 'object') setBadges(prev => ({ ...prev, ...data.badges }));
        
        if (Array.isArray(data.devOrder)) {
          // ensure new items are added if not present in saved order
          const savedDevOrder = data.devOrder;
          const missingItems = DEFAULT_DEV_ORDER.filter(id => !savedDevOrder.includes(id));
          setDevOrder([...savedDevOrder, ...missingItems]);
        }
        if (data.devBadges && typeof data.devBadges === 'object') setDevBadges(prev => ({ ...DEFAULT_DEV_BADGES, ...prev, ...data.devBadges }));
        
        if (Array.isArray(data.companyOrder)) setCompanyOrder(data.companyOrder);
        if (data.companyBadges && typeof data.companyBadges === 'object') setCompanyBadges(prev => ({ ...prev, ...data.companyBadges }));
        
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggleBadge = (key: string, listType: 'explore' | 'dev' | 'company') => {
    const isEnabled = (prev: Record<string, string | false>) => prev[key] !== false && prev[key] !== undefined;
    const defaultText = 'New';
    if (listType === 'dev') {
      setDevBadges(prev => ({ ...prev, [key]: isEnabled(prev) ? false : defaultText }));
    } else if (listType === 'company') {
      setCompanyBadges(prev => ({ ...prev, [key]: isEnabled(prev) ? false : defaultText }));
    } else {
      setBadges(prev => ({ ...prev, [key]: isEnabled(prev) ? false : defaultText }));
    }
  };

  const updateBadgeText = (key: string, listType: 'explore' | 'dev' | 'company', text: string) => {
    if (listType === 'dev') {
      setDevBadges(prev => ({ ...prev, [key]: text }));
    } else if (listType === 'company') {
      setCompanyBadges(prev => ({ ...prev, [key]: text }));
    } else {
      setBadges(prev => ({ ...prev, [key]: text }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings/menu-order', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order, badges, devOrder, devBadges, companyOrder, companyBadges }),
      });
      if (res.ok) {
        toast.success('Menu config saved! Changes appear on the navbar.');
      } else {
        toast.error('Failed to save');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setOrder(DEFAULT_ORDER);
    setBadges(DEFAULT_BADGES);
    setDevOrder(DEFAULT_DEV_ORDER);
    setDevBadges(DEFAULT_DEV_BADGES);
    setCompanyOrder(DEFAULT_COMPANY_ORDER);
    setCompanyBadges(DEFAULT_COMPANY_BADGES);
    toast.info('Reset to default — click Save to apply.');
  };

  if (loading) return (
    <div className="min-h-[60vh] w-full flex items-center justify-center">
      <RefreshCw className={cn("w-10 h-10 animate-spin", isDark ? "text-cyan-500" : "text-cyan-700")} />
    </div>
  );

  const renderList = (currentOrder: string[], currentBadges: Record<string, string | false>, setOrderFn: any, listType: 'explore' | 'dev' | 'company') => (
    <div className="space-y-4">
      {/* Column headers — hidden on mobile */}
      <div className={cn("hidden sm:flex items-center gap-3 px-4 pb-2 border-b text-xs text-zinc-500 font-medium uppercase tracking-wider", isDark ? "border-white/5" : "border-slate-200")}>
        <span className="w-5 shrink-0" />
        <span className="w-6 shrink-0" />
        <span className="w-10 shrink-0" />
        <span className="flex-1">Menu Item</span>
        <span className="w-48 shrink-0 text-right">Badge Settings</span>
      </div>

      <Reorder.Group axis="y" values={currentOrder} onReorder={setOrderFn} className="flex flex-col gap-3">
        {currentOrder.filter(k => MENU_META[k]).map((key, idx) => {
          const meta = MENU_META[key];
          if (!meta) return null;
          const hasBadge = currentBadges[key] !== false && currentBadges[key] !== undefined;
          return (
            <Reorder.Item
              key={key}
              value={key}
              className={cn("flex items-center gap-3 p-3 sm:p-4 rounded-2xl bg-white/[0.04] border hover:border-white/20 cursor-grab active:cursor-grabbing active:scale-[1.01] active:shadow-2xl transition-colors select-none", isDark ? "border-white/10" : "border-slate-200")}
            >
              <GripVertical className="w-5 h-5 text-zinc-500 shrink-0" />

              <span className={cn("w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0", isDark ? "text-zinc-400" : "text-slate-500")}>
                {idx + 1}
              </span>

              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.bg} ${meta.color}`}>
                <meta.icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={cn("font-bold text-sm leading-tight", isDark ? "text-white" : "text-slate-900")}>{meta.label}</p>
                </div>
                <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5 hidden sm:block">{meta.description}</p>
              </div>

              {/* Badge settings right column */}
              <div className="flex items-center gap-2 shrink-0 sm:w-48 justify-end">
                {hasBadge && (
                  <input
                    type="text"
                    value={currentBadges[key] as string}
                    onChange={(e) => updateBadgeText(key, listType, e.target.value)}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={cn("px-2 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-bold uppercase tracking-wider shrink-0 w-16 sm:w-24 outline-none focus:border-cyan-400/50 focus:bg-cyan-500/20 transition-colors text-center", isDark ? "text-cyan-400" : "text-cyan-700")}
                    maxLength={12}
                  />
                )}
                <button
                  type="button"
                  onClick={() => toggleBadge(key, listType)}
                  onPointerDown={(e) => e.stopPropagation()}
                  className={`shrink-0 px-3 w-16 sm:w-20 py-1.5 rounded-lg text-xs font-bold border transition-all whitespace-nowrap ${
                    hasBadge
                      ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400 hover:bg-red-500/15 hover:border-red-500/30 hover:text-red-400'
                      : 'bg-white/5 border-white/10 text-zinc-500 hover:bg-cyan-500/10 hover:border-cyan-500/20 hover:text-cyan-400'
                  }`}
                >
                  {hasBadge ? 'Hide' : '+ Add'}
                </button>
              </div>
            </Reorder.Item>
          );
        })}
      </Reorder.Group>
    </div>
  );

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className={cn("text-3xl font-extrabold drop-shadow-sm mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
          Menu Order Configuration
        </h1>
        <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Drag to reorder dropdown items. Toggle the "New" badge on each item.</p>
      </div>

      <div className="space-y-8">
        <div className="glass-card p-6">
          <h2 className={cn("text-xl font-bold mb-6 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
            <div className={cn("w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center", isDark ? "text-cyan-400" : "text-cyan-700")}>
              <Compass className="w-5 h-5" />
            </div>
            Explore Menu
          </h2>
          {renderList(order, badges, setOrder, 'explore')}
        </div>

        <div className="glass-card p-6">
          <h2 className={cn("text-xl font-bold mb-6 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
            <div className={cn("w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center", isDark ? "text-cyan-400" : "text-cyan-700")}>
              <Code className="w-5 h-5" />
            </div>
            Developers Menu
          </h2>
          {renderList(devOrder, devBadges, setDevOrder, 'dev')}
        </div>

        <div className="glass-card p-6">
          <h2 className={cn("text-xl font-bold mb-6 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
            <div className={cn("w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center", isDark ? "text-cyan-400" : "text-cyan-700")}>
              <Briefcase className="w-5 h-5" />
            </div>
            Profile Menu
          </h2>
          {renderList(companyOrder, companyBadges, setCompanyOrder, 'company')}
        </div>

        <div className="glass-card p-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button onClick={handleReset}
            className={cn("flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl hover:bg-white/10 hover:text-white border text-sm font-medium transition-colors", isDark ? "text-zinc-400 border-white/10" : "text-slate-500 border-slate-200")}>
            <RotateCcw className="w-4 h-4" /> Reset to Default
          </button>
          <button onClick={handleSave} disabled={saving}
            className={cn("flex items-center justify-center gap-2 px-8 py-2.5 transition-all shadow-md hover:shadow-lg hover:from-cyan-400 hover:to-cyan-400 font-bold rounded-xl disabled:opacity-50 transition-all shadow-lg shadow-cyan-500/20", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-slate-900 shadow-cyan-500/20" : "bg-cyan-600 hover:bg-cyan-700 text-white shadow-cyan-600/20")}>
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
