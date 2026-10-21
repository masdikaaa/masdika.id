"use client";
import { cn } from "@/lib/utils";
import { AdminLoader } from "@/components/admin/AdminLoader";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, Trash2, Edit2, Image as ImageIcon, Play, ChevronUp, ChevronDown, CheckCircle2, Clock, BookOpen, Loader2, LayoutDashboard, AlertCircle } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import Link from "next/link";
import { toast } from "sonner";
import MediaLibrary from "@/components/admin/MediaLibrary";
import Editor from "@/components/admin/Editor";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { motion } from "framer-motion";
import { Select } from "@/components/ui/Select";

const LEVELS = ["Beginner", "Intermediate", "Advanced"];

export default function EditSeriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const { id } = use(params);
  const isNew = id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<'series' | number>('series');
  const [mediaInsertCallback, setMediaInsertCallback] = useState<((url: string) => void) | null>(null);

  const [form, setForm] = useState({
    title: '', description: '', image: '', level: 'Beginner', tags: '', published: false,
  });

  const [episodes, setEpisodes] = useState<any[]>([]);
  const [editingEp, setEditingEp] = useState<any | null>(null);
  const [epSaving, setEpSaving] = useState(false);
  const [deleteEpId, setDeleteEpId] = useState<number | null>(null);
  const [deletingEp, setDeletingEp] = useState(false);

  const [epForm, setEpForm] = useState({
    title: '', excerpt: '', content: '', image: '', videoUrl: '', published: false,
  });

  const [epPage, setEpPage] = useState(1);
  const [epTotalPages, setEpTotalPages] = useState(1);
  const [epTotal, setEpTotal] = useState(0);

  const fetchSeriesData = async (currentPage = epPage) => {
    if (isNew) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/admin/series/${id}?epPage=${currentPage}&epLimit=10`);
    const data = await res.json();
    if (data.error) { toast.error(data.error); router.push('/admin/series'); return; }
    
    setForm(f => f.title ? f : { title: data.title, description: data.description, image: data.image || '', level: data.level, tags: data.tags || '', published: data.published });
    setEpisodes(data.episodes || []);
    if (data.meta?.episodes) {
      setEpTotalPages(data.meta.episodes.totalPages);
      setEpTotal(data.meta.episodes.total);
    } else {
      setEpTotalPages(1);
      setEpTotal(data.episodes?.length || 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSeriesData(epPage);
  }, [id, isNew, epPage, router]);

  const handleSaveSeries = async () => {
    if (!form.title) { toast.error('Title is required'); return; }
    setSaving(true);
    const url = isNew ? '/api/admin/series' : `/api/admin/series/${id}`;
    const method = isNew ? 'POST' : 'PUT';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json();
    if (res.ok) {
      toast.success(isNew ? 'Series created!' : 'Series updated!');
      if (isNew) router.push(`/admin/series/edit/${data.id}`);
    } else {
      toast.error(data.error || 'Failed to save');
    }
    setSaving(false);
  };

  const openNewEpisode = () => {
    setEpForm({ title: '', excerpt: '', content: '', image: '', videoUrl: '', published: false });
    setEditingEp({});
  };

  const openEditEpisode = (ep: any) => {
    setEpForm({ title: ep.title, excerpt: ep.excerpt || '', content: ep.content, image: ep.image || '', videoUrl: ep.videoUrl || '', published: ep.published });
    setEditingEp(ep);
  };

  const handleSaveEpisode = async () => {
    if (!epForm.title) { toast.error('Episode title is required'); return; }
    setEpSaving(true);
    const isNewEp = !editingEp?.id;
    const url = isNewEp ? `/api/admin/series/${id}/episodes` : `/api/admin/series/${id}/episodes/${editingEp.id}`;
    const method = isNewEp ? 'POST' : 'PUT';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(epForm) });
    if (res.ok) {
      toast.success(isNewEp ? 'Episode added!' : 'Episode updated!');
      if (epForm.published && !form.published) {
        toast.info('Catatan: Jangan lupa simpan Series ("Save Series") agar episode tampil di publik!', { duration: 5000 });
      }
      fetchSeriesData(epPage);
      setEditingEp(null);
    } else {
      const d = await res.json();
      toast.error(d.error || 'Failed to save episode');
    }
    setEpSaving(false);
  };

  const handleToggleEpisodePublish = async (ep: any) => {
    const nextStatus = !ep.published;
    setEpisodes(prev => prev.map(e => e.id === ep.id ? { ...e, published: nextStatus } : e));
    try {
      const res = await fetch(`/api/admin/series/${id}/episodes/${ep.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: nextStatus }),
      });
      if (res.ok) {
        toast.success(`Episode ${nextStatus ? 'published' : 'dipindah ke draft'}!`);
        if (nextStatus && !form.published) {
          toast.info('Catatan: Series masih Draft. Aktifkan toggle Series dan klik Save Series agar tampil di publik.', { duration: 5000 });
        }
      } else {
        const d = await res.json();
        toast.error(d.error || 'Gagal mengubah status episode');
        setEpisodes(prev => prev.map(e => e.id === ep.id ? { ...e, published: ep.published } : e));
      }
    } catch {
      toast.error('Network error saat memperbarui status');
      setEpisodes(prev => prev.map(e => e.id === ep.id ? { ...e, published: ep.published } : e));
    }
  };

  const handleDeleteEpisode = async () => {
    if (!deleteEpId) return;
    setDeletingEp(true);
    await fetch(`/api/admin/series/${id}/episodes/${deleteEpId}`, { method: 'DELETE' });
    toast.success('Episode deleted');
    fetchSeriesData(epPage);
    setDeletingEp(false);
    setDeleteEpId(null);
  };

  const handleReorder = async (epId: number, dir: 'up' | 'down') => {
    const idx = episodes.findIndex(e => e.id === epId);
    if (idx < 0) return;
    if (dir === 'up' && idx === 0) return;
    if (dir === 'down' && idx === episodes.length - 1) return;
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    const newOrder = [...episodes];
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    await Promise.all(newOrder.map((e, i) => fetch(`/api/admin/series/${id}/episodes/${e.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: i }),
    })));
    setEpisodes(newOrder.map((e, i) => ({ ...e, order: i })));
  };

  if (loading) return <AdminLoader />;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <Link href="/admin/series" className={cn("p-2.5 transition-all border rounded-xl", isDark ? "text-white border-white/10 hover:bg-white/10" : "text-slate-900 border-slate-200 hover:bg-slate-100")}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex flex-col sm:flex-row md:items-end justify-between gap-6 mb-6">
        <div>
          <h1 className={cn("text-3xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>{isNew ? 'Create New Series' : 'Edit Series'}</h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Manage series details and episodes.</p>
        </div>
      </div>
      </div>

      {/* Series Form */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={cn("rounded-2xl p-6 md:p-8 space-y-6 border", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <h2 className={cn("text-xl font-extrabold border-b pb-4 flex items-center gap-2", isDark ? "text-white border-slate-800" : "text-slate-900 border-slate-200")}><BookOpen className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-700")} /> Series Information</h2>

        <div className="space-y-3">
          <label className={cn("text-xs font-bold uppercase tracking-widest block", isDark ? "text-zinc-400" : "text-slate-500")}>Series Title *</label>
          <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Learn Kubernetes from Scratch"
            className={cn("w-full px-5 py-3.5 border rounded-xl text-lg font-bold focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className={cn("text-xs font-bold uppercase tracking-widest block", isDark ? "text-zinc-400" : "text-slate-500")}>Level</label>
            <Select 
              value={form.level} 
              onChange={val => setForm(f => ({ ...f, level: val }))}
              options={LEVELS.map(l => ({ value: l, label: l }))}
              placeholder="Select Level..."
              className={cn("w-full rounded-xl px-5 py-3.5 text-sm", isDark ? "border-slate-800" : "border-slate-200")}
            />
          </div>
          <div className="space-y-3">
            <label className={cn("text-xs font-bold uppercase tracking-widest block", isDark ? "text-zinc-400" : "text-slate-500")}>Tags (comma separated)</label>
            <input type="text" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              placeholder="e.g. devops, kubernetes, cloud"
              className={cn("w-full px-5 py-3.5 border rounded-xl font-medium focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")} />
          </div>
        </div>

        <div className="space-y-3">
          <label className={cn("text-xs font-bold uppercase tracking-widest block", isDark ? "text-zinc-400" : "text-slate-500")}>Description</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3} placeholder="Brief description of this series..."
            className={cn("w-full px-5 py-3.5 border rounded-xl font-medium focus:outline-none focus:border-cyan-500 transition-all resize-none", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")} />
        </div>

        <div className="space-y-3">
          <label className={cn("text-xs font-bold uppercase tracking-widest flex items-center gap-2", isDark ? "text-zinc-400" : "text-slate-500")}><ImageIcon className="w-4 h-4" /> Cover Image</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input type="text" value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
              placeholder="https://... or select from media library"
              className={cn("flex-1 px-5 py-3.5 border rounded-xl font-medium focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")} />
            <button type="button" onClick={() => { setMediaTarget('series'); setShowMediaLibrary(true); }}
              className={cn("px-5 py-3.5 border rounded-xl flex items-center justify-center gap-2 text-sm font-semibold whitespace-nowrap transition-all", isDark ? "bg-[#060b14] border-slate-800 text-white hover:bg-slate-800/60" : "bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100")}>
              Select Image
            </button>
          </div>
          {form.image && (
            <div className={cn("mt-4 aspect-video w-full max-w-sm rounded-2xl overflow-hidden border group", isDark ? "border-slate-800" : "border-slate-200")}>
              <img referrerPolicy="no-referrer" src={form.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" />
            </div>
          )}
        </div>

        <div className={cn("flex flex-col sm:flex-row gap-6 sm:gap-0 sm:items-center justify-between pt-6 border-t", isDark ? "border-slate-800" : "border-slate-200")}>
          <label className={cn(
            "flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-colors select-none",
            isDark ? "bg-cyan-500/5 border-cyan-500/10 hover:bg-cyan-500/10" : "bg-cyan-50/50 border-cyan-200/60 hover:bg-cyan-50"
          )}>
            <div className="relative shrink-0">
              <input
                type="checkbox"
                id="series-published-input"
                checked={form.published}
                onChange={(e) => setForm(f => ({ ...f, published: e.target.checked }))}
                className="sr-only peer"
              />
              <div className={cn(
                "w-11 h-6 rounded-full peer peer-focus:outline-none transition-all",
                "after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all",
                "peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:bg-cyan-500",
                isDark ? "bg-black/50" : "bg-slate-300"
              )}></div>
            </div>
            <div>
              <span className={cn("text-sm font-medium block", isDark ? "text-white" : "text-slate-900")}>
                {form.published ? 'Published' : 'Draft'}
              </span>
              <span className={cn("text-xs block", isDark ? "text-zinc-400" : "text-slate-500")}>
                {form.published ? 'Series is visible on the public site' : 'Series and its episodes are hidden from public view'}
              </span>
            </div>
          </label>

          <button onClick={handleSaveSeries} disabled={saving}
            className="flex items-center justify-center gap-2 px-6 py-3 w-full sm:w-auto font-semibold text-sm rounded-lg bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm disabled:opacity-50 transition-all">
            <Save className="w-5 h-5" /> {saving ? 'Saving...' : 'Save Series'}
          </button>
        </div>
      </motion.div>

      {/* Episodes Section */}
      {!isNew && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={cn("rounded-2xl p-6 md:p-8 space-y-6 border", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className={cn("flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-b pb-4", isDark ? "border-slate-800" : "border-slate-200")}>
            <h2 className={cn("text-xl font-extrabold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}><Play className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-700")} /> Episodes ({epTotal})</h2>
            <button onClick={openNewEpisode}
              className={cn("flex items-center gap-2 px-5 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 font-bold rounded-xl transition-all text-sm whitespace-nowrap", isDark ? "text-cyan-400" : "text-cyan-700")}>
              <Plus className="w-4 h-4" /> Add Episode
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {episodes.length === 0 ? (
              <div className="text-center py-12">
                <div className={cn("w-16 h-16 rounded-full border flex items-center justify-center mx-auto mb-4", isDark ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-slate-50")}>
                  <Play className="w-8 h-8 text-zinc-500" />
                </div>
                <h3 className={cn("font-bold mb-1", isDark ? "text-white" : "text-slate-900")}>No episodes yet</h3>
                <p className="text-zinc-500 text-sm max-w-sm mx-auto">Click "Add Episode" to create the first episode for this series.</p>
              </div>
            ) : episodes.map((ep, i) => (
              <div key={ep.id} className={cn("flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border transition-colors group", isDark ? "bg-[#060b14] border-slate-800 hover:bg-white/5" : "bg-slate-50 border-slate-200 hover:bg-slate-100/80")}>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="flex flex-col gap-1">
                    <button onClick={() => handleReorder(ep.id, 'up')} disabled={i === 0} className="p-0.5 text-zinc-600 hover:text-white disabled:opacity-20 transition-colors">
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleReorder(ep.id, 'down')} disabled={i === episodes.length - 1} className="p-0.5 text-zinc-600 hover:text-white disabled:opacity-20 transition-colors">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center text-cyan-400 font-bold text-sm shrink-0 group-hover:border-cyan-500/30 transition-colors", isDark ? "border-slate-800" : "border-slate-200")}>
                    {i + 1}
                  </div>
                  {ep.image && <img referrerPolicy="no-referrer" src={ep.image} alt="" className={cn("w-20 h-12 rounded-lg object-cover border shrink-0", isDark ? "border-slate-800" : "border-slate-200")} loading="lazy" decoding="async" />}
                  
                  <div className="flex-1 min-w-0 sm:hidden">
                    <p className={cn("font-bold text-sm line-clamp-1 group-hover:text-cyan-400 transition-colors", isDark ? "text-white" : "text-slate-900")}>{ep.title}</p>
                    <div className="mt-1">
                      <button
                        type="button"
                        onClick={() => handleToggleEpisodePublish(ep)}
                        title={`Click to ${ep.published ? 'unpublish' : 'publish'} episode`}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95 cursor-pointer",
                          ep.published
                            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20"
                            : isDark
                            ? "text-zinc-400 border border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:text-white"
                            : "text-slate-500 border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:text-slate-900"
                        )}
                      >
                        <span className={cn("w-1.5 h-1.5 rounded-full", ep.published ? "bg-cyan-400 animate-pulse" : "bg-zinc-500")} />
                        {ep.published ? 'Published' : 'Draft'}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="hidden sm:block flex-1 min-w-0 ml-2">
                  <p className={cn("font-bold text-sm line-clamp-1 group-hover:text-cyan-400 transition-colors", isDark ? "text-white" : "text-slate-900")}>{ep.title}</p>
                  <div className="mt-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleEpisodePublish(ep)}
                      title={`Click to ${ep.published ? 'unpublish' : 'publish'} episode`}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95 cursor-pointer",
                        ep.published
                          ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20"
                          : isDark
                          ? "text-zinc-400 border border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:text-white"
                          : "text-slate-500 border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:text-slate-900"
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full", ep.published ? "bg-cyan-400 animate-pulse" : "bg-zinc-500")} />
                      {ep.published ? 'Published' : 'Draft'}
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-2 sm:mt-0 justify-end sm:justify-start w-full sm:w-auto">
                  <button onClick={() => openEditEpisode(ep)}
                    className={cn("p-2 rounded-lg bg-cyan-500/10 hover:text-white hover:bg-cyan-500/20 border border-transparent hover:border-cyan-500/20 transition-colors flex-1 sm:flex-none flex justify-center", isDark ? "text-cyan-400" : "text-cyan-700")}>
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteEpId(ep.id)}
                    className={cn("p-2 rounded-lg bg-red-500/10 hover:text-white hover:bg-red-500/20 border border-transparent hover:border-red-500/20 transition-colors flex-1 sm:flex-none flex justify-center", isDark ? "text-red-400" : "text-red-700")}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {epTotalPages > 1 && (
            <div className={cn("flex flex-col sm:flex-row items-center justify-between pt-4 border-t gap-4 mt-6", isDark ? "border-slate-800" : "border-slate-200")}>
              <div className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
                Showing <span className={cn("font-medium", isDark ? "text-white" : "text-slate-900")}>{episodes.length}</span> of <span className={cn("font-medium", isDark ? "text-white" : "text-slate-900")}>{epTotal}</span> episodes
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEpPage(p => Math.max(1, p - 1))}
                  disabled={epPage === 1}
                  className={cn("px-3 py-1.5 text-sm rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed transition-colors", isDark ? "border-slate-800 text-zinc-300 hover:bg-slate-800/50" : "border-slate-200 text-slate-600 hover:bg-slate-100")}
                >
                  Previous
                </button>
                <div className={cn("text-sm mx-2", isDark ? "text-zinc-400" : "text-slate-500")}>
                  Page <span className={cn("font-medium", isDark ? "text-white" : "text-slate-900")}>{epPage}</span> of {epTotalPages}
                </div>
                <button
                  onClick={() => setEpPage(p => Math.min(epTotalPages, p + 1))}
                  disabled={epPage === epTotalPages}
                  className={cn("px-3 py-1.5 text-sm rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed transition-colors", isDark ? "border-slate-800 text-zinc-300 hover:bg-slate-800/50" : "border-slate-200 text-slate-600 hover:bg-slate-100")}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Episode Editor Modal */}
      {editingEp !== null && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-16 overflow-y-auto">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditingEp(null)} />
          <div className={cn("relative z-10 w-full max-w-4xl border rounded-2xl shadow-2xl", isDark ? "bg-[#0b1322] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900")}>
            <div className={cn("p-6 border-b flex items-center justify-between", isDark ? "border-slate-800" : "border-slate-200")}>
              <h3 className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>{editingEp.id ? 'Edit Episode' : 'Add New Episode'}</h3>
              <button onClick={() => setEditingEp(null)} className={cn("hover:text-white text-2xl leading-none", isDark ? "text-zinc-400" : "text-slate-500")}>×</button>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-3">
                <label className={cn("text-xs font-bold uppercase tracking-widest block", isDark ? "text-zinc-400" : "text-slate-500")}>Episode Title *</label>
                <input type="text" value={epForm.title} onChange={e => setEpForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Episode 1 - Introduction to Kubernetes"
                  className={cn("w-full px-5 py-3.5 border rounded-xl font-bold focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")} />
              </div>

              <div className="space-y-3">
                <label className={cn("text-xs font-bold uppercase tracking-widest block", isDark ? "text-zinc-400" : "text-slate-500")}>Excerpt / Short Summary</label>
                <textarea value={epForm.excerpt} onChange={e => setEpForm(f => ({ ...f, excerpt: e.target.value }))}
                  rows={2} placeholder="Brief overview of this episode..."
                  className={cn("w-full px-5 py-3.5 border rounded-xl font-medium focus:outline-none focus:border-cyan-500 transition-all resize-none", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className={cn("text-xs font-bold uppercase tracking-widest block", isDark ? "text-zinc-400" : "text-slate-500")}>YouTube Video URL</label>
                  <div className="relative">
                    <Play className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 /70", isDark ? "text-cyan-500" : "text-cyan-700")} />
                    <input type="url" value={epForm.videoUrl} onChange={e => setEpForm(f => ({ ...f, videoUrl: e.target.value }))}
                      placeholder="https://youtube.com/watch?v=..."
                      className={cn("w-full pl-11 pr-5 py-3.5 border rounded-xl font-medium focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")} />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className={cn("text-xs font-bold uppercase tracking-widest block", isDark ? "text-zinc-400" : "text-slate-500")}>Thumbnail Image</label>
                  <div className="flex gap-3">
                    <input type="text" value={epForm.image} onChange={e => setEpForm(f => ({ ...f, image: e.target.value }))}
                      placeholder="https://..."
                      className={cn("flex-1 px-5 py-3.5 border rounded-xl font-medium focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")} />
                    <button type="button" onClick={() => { setMediaTarget(0); setShowMediaLibrary(true); }}
                      className={cn("px-5 py-3.5 border rounded-xl font-semibold transition-all", isDark ? "bg-[#060b14] border-slate-800 text-white hover:bg-slate-800/60" : "bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100")}>
                      Select
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className={cn("text-xs font-bold uppercase tracking-widest block", isDark ? "text-zinc-400" : "text-slate-500")}>Episode Content</label>
                <div className={cn("rounded-xl border", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}>
                  <Editor
                    markdown={epForm.content ?? ''}
                    onChange={val => setEpForm(f => ({ ...f, content: val }))}
                    onOpenMedia={(onSelect) => {
                      setMediaTarget(-2);
                      setShowMediaLibrary(true);
                      setMediaInsertCallback(() => onSelect);
                    }}
                  />
                </div>
              </div>

              {/* Draft warning banner if series itself is draft */}
              {!form.published && epForm.published && (
                <div className={cn(
                  "p-4 rounded-xl border flex items-start gap-3 text-xs leading-relaxed transition-all",
                  isDark ? "bg-amber-500/10 border-amber-500/20 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-800"
                )}>
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <p className="font-bold text-amber-400 mb-0.5">Catatan: Series Utama Masih Berstatus "Draft"</p>
                    <p className="opacity-90">
                      Episode ini di-publish, tetapi pengunjung belum dapat melihatnya karena Series utama masih diset <strong>Draft</strong>. Untuk mempublikasikan ke publik, aktifkan toggle <strong>Published</strong> pada Series dan klik <strong>Save Series</strong>.
                    </p>
                  </div>
                </div>
              )}

              <div className={cn("flex flex-col sm:flex-row gap-4 sm:gap-0 sm:items-center justify-between pt-6 border-t mt-6", isDark ? "border-slate-800" : "border-slate-200")}>
                <label className={cn(
                  "flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-colors select-none",
                  isDark ? "bg-cyan-500/5 border-cyan-500/10 hover:bg-cyan-500/10" : "bg-cyan-50/50 border-cyan-200/60 hover:bg-cyan-50"
                )}>
                  <div className="relative shrink-0">
                    <input
                      type="checkbox"
                      id="episode-published-input"
                      checked={epForm.published}
                      onChange={(e) => setEpForm(f => ({ ...f, published: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className={cn(
                      "w-11 h-6 rounded-full peer peer-focus:outline-none transition-all",
                      "after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all",
                      "peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:bg-cyan-500",
                      isDark ? "bg-black/50" : "bg-slate-300"
                    )}></div>
                  </div>
                  <div>
                    <span className={cn("text-sm font-medium block", isDark ? "text-white" : "text-slate-900")}>
                      {epForm.published ? 'Published' : 'Draft'}
                    </span>
                    <span className={cn("text-xs block", isDark ? "text-zinc-400" : "text-slate-500")}>
                      {epForm.published ? 'Visible to public readers' : 'Hidden from public view'}
                    </span>
                  </div>
                </label>

                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={() => setEditingEp(null)} className={cn("px-4 py-2.5 rounded-lg border font-medium text-sm transition-colors", isDark ? "border-slate-800 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-700 hover:bg-slate-100")}>
                    Cancel
                  </button>
                  <button type="button" onClick={handleSaveEpisode} disabled={epSaving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 font-semibold text-sm rounded-lg shadow-sm disabled:opacity-50 transition-all">
                    <Save className="w-4 h-4" /> {epSaving ? 'Saving...' : 'Save Episode'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <MediaLibrary
        isOpen={showMediaLibrary}
        onClose={() => setShowMediaLibrary(false)}
        onSelect={url => {
          if (mediaTarget === 'series') {
            setForm(f => ({ ...f, image: url }));
          } else if (mediaTarget === -2) {
            mediaInsertCallback?.(url);
          } else {
            setEpForm(f => ({ ...f, image: url }));
          }
          setMediaInsertCallback(null);
        }}
        title="Select Image"
      />

      <ConfirmModal isOpen={!!deleteEpId} onClose={() => setDeleteEpId(null)} onConfirm={handleDeleteEpisode}
        title="Delete Episode?" description="This episode will be permanently deleted."
        confirmText="Delete" isLoading={deletingEp} variant="danger" />
    </motion.div>
  );
}
