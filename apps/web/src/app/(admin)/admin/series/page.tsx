"use client";
import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";
import { BookOpen, Plus, Edit2, Trash2, Eye, EyeOff, Check, CheckCircle, Loader2, LayoutDashboard, Search, RefreshCw } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import Link from "next/link";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { AdminLoader } from "@/components/admin/AdminLoader";

export default function AdminSeriesPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [series, setSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const fetchSeries = async (currentPage = page, searchQuery = search) => {
    setLoading(true);
    const res = await fetch(`/api/admin/series?page=${currentPage}&limit=10&search=${encodeURIComponent(searchQuery)}`);
    const data = await res.json();
    if (data.data) {
      setSeries(data.data);
      setTotalPages(data.meta.totalPages);
      setTotal(data.meta.total);
    } else {
      setSeries(Array.isArray(data) ? data : []);
      setTotalPages(1);
      setTotal(Array.isArray(data) ? data.length : 0);
    }
    setLoading(false);
  };

  useEffect(() => { 
    const debounce = setTimeout(() => {
      fetchSeries(1, search);
      setPage(1);
    }, 500);
    return () => clearTimeout(debounce);
  }, [search]);

  useEffect(() => { 
    fetchSeries(page, search); 
  }, [page]);

  const handleTogglePublish = async (id: number, current: boolean) => {
    await fetch(`/api/admin/series/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !current }),
    });
    toast.success(current ? 'Series unpublished' : 'Series published');
    fetchSeries(page);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeletingAll(true);
    try {
      const res = await fetch('/api/admin/series/bulk-delete', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });
      if (res.ok) {
        toast.success(`${selectedIds.length} series deleted`);
        fetchSeries(page, search);
        setSelectedIds([]);
      } else {
        toast.error("Failed to delete series");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setIsDeletingAll(false);
      setShowDeleteAllModal(false);
    }
  };

  const filteredSeries = series.filter(s => {
    if (statusFilter === 'published' && !s.published) return false;
    if (statusFilter === 'draft' && s.published) return false;
    return true;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredSeries.length && filteredSeries.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSeries.map(s => s.id));
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await fetch(`/api/admin/series/${deleteId}`, { method: 'DELETE' });
    toast.success('Series deleted');
    fetchSeries(page);
    setDeleting(false);
    setDeleteId(null);
  };

  const totalCount = total || series.length;
  const publishedCount = series.filter(s => s.published).length;
  const draftCount = series.filter(s => !s.published).length;
  const totalEpisodes = series.reduce((acc, s) => acc + (s.episodes?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={cn("text-2xl md:text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Series Management
          </h1>
          <p className={cn("text-sm font-medium mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>
            Manage educational series, episodes, and course curriculum.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2">
            <span>Total Series:</span>
            <span className="font-extrabold text-white">{totalCount}</span>
          </div>
          <button
            onClick={() => fetchSeries(page, search)}
            className={cn(
              "px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border",
              isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            )}
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            <span>Refresh</span>
          </button>
          <Link
            href="/admin/series/edit/new"
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors shrink-0 flex items-center justify-center gap-1.5 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Series</span>
          </Link>
        </div>
      </div>

      {/* Stat Cards Grid (GAMBAR 1 Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>TOTAL SERIES</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{totalCount}</span>
            <span className={cn("text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-600")}>Curriculums</span>
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>PUBLISHED</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{publishedCount}</span>
            <span className={cn("text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-600")}>Live Public</span>
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>DRAFTS</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-amber-500/15 border-amber-500/25 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700")}>
              <EyeOff className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{draftCount}</span>
            <span className={cn("text-xs font-medium", isDark ? "text-amber-400" : "text-amber-600")}>Unpublished</span>
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>TOTAL EPISODES</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <LayoutDashboard className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{totalEpisodes}</span>
            <span className={cn("text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-600")}>Lessons</span>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar (GAMBAR 1 Style) */}
      <div className={cn("p-4 rounded-2xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className={cn("inline-flex p-1 rounded-xl border self-start md:self-auto overflow-x-auto max-w-full", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-100 border-slate-200")}>
          {[
            { key: 'all', label: 'All Series', count: totalCount },
            { key: 'published', label: 'Published', count: publishedCount },
            { key: 'draft', label: 'Drafts', count: draftCount },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key as any)}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
                statusFilter === tab.key
                  ? "bg-cyan-500 text-slate-950 shadow-sm"
                  : isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-slate-600 hover:text-slate-900 hover:bg-white"
              )}
            >
              <span>{tab.label}</span>
              <span className={cn("px-1.5 py-0.2 rounded-full text-[10px]", statusFilter === tab.key ? "bg-slate-950/20 text-slate-950 font-extrabold" : isDark ? "bg-white/10 text-zinc-300" : "bg-slate-200 text-slate-700")}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          {filteredSeries.length > 0 && (
            <button 
              onClick={toggleSelectAll}
              className={cn("flex items-center gap-2 px-3.5 py-2 font-bold rounded-xl text-xs transition-all border", isDark ? "bg-[#060b14] text-white border-slate-800 hover:border-slate-700" : "bg-slate-50 text-slate-900 border-slate-200 hover:bg-white")}
            >
              <div className={cn(
                "w-4 h-4 border rounded flex items-center justify-center transition-colors",
                selectedIds.length === filteredSeries.length && filteredSeries.length > 0
                  ? "bg-cyan-500 border-cyan-500 text-slate-950"
                  : isDark ? "border-slate-700 bg-[#060b14]" : "border-slate-300 bg-white"
              )}>
                {selectedIds.length === filteredSeries.length && filteredSeries.length > 0 && <Check className="w-3 h-3 text-slate-950 font-bold" strokeWidth={3} />}
              </div>
              <span>{selectedIds.length === filteredSeries.length && filteredSeries.length > 0 ? 'Deselect All' : 'Select All'}</span>
            </button>
          )}

          {selectedIds.length > 0 && (
            <button 
              onClick={() => setShowDeleteAllModal(true)}
              className={cn("flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors border", isDark ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20" : "bg-red-50 hover:bg-red-100 text-red-600 border-red-200")}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          )}

          <div className="relative w-full sm:w-64">
            <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", isDark ? "text-zinc-500" : "text-slate-400")} />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search series..." 
              className={cn("w-full pl-9 pr-4 py-2 text-xs md:text-sm rounded-xl border focus:outline-none focus:border-cyan-500 transition-colors", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400")}
            />
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className={cn("border rounded-2xl overflow-hidden relative z-10", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className="overflow-x-auto">
          <table className={cn("w-full text-left text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
            <thead className={cn("text-xs uppercase border-b tracking-wider font-semibold", isDark ? "bg-[#060b14] text-slate-400 border-slate-800" : "bg-slate-50 text-slate-500 border-slate-200")}>
              <tr>
                <th className="p-4 w-12">
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectAll();
                    }}
                    className={cn(
                      "w-5 h-5 border rounded flex items-center justify-center transition-colors",
                      selectedIds.length === filteredSeries.length && filteredSeries.length > 0
                        ? "bg-cyan-500 border-cyan-500 text-slate-950"
                        : isDark ? "border-slate-700 bg-[#060b14] hover:border-cyan-400" : "border-slate-300 bg-white hover:border-slate-400"
                    )}
                  >
                    {selectedIds.length === filteredSeries.length && filteredSeries.length > 0 && <Check className="w-3.5 h-3.5 text-slate-950 font-bold" strokeWidth={3} />}
                  </button>
                </th>
                <th className="p-4 whitespace-nowrap font-medium">Series</th>
                <th className="p-4 whitespace-nowrap font-medium">Level</th>
                <th className="p-4 whitespace-nowrap font-medium">Episodes</th>
                <th className="p-4 whitespace-nowrap font-medium">Status</th>
                <th className="p-4 text-right whitespace-nowrap font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDark ? "divide-slate-800/80" : "divide-slate-200")}>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <AdminLoader className="min-h-[200px]" />
                  </td>
                </tr>
              ) : filteredSeries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 border transition-transform duration-500", isDark ? "bg-[#060b14] border-slate-800 text-zinc-600" : "bg-slate-50 border-slate-200 text-slate-400")}>
                        <BookOpen className="w-10 h-10" />
                      </div>
                      <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No series found</h3>
                      <p className="text-zinc-500 text-sm max-w-sm">No series matching your current filter or search criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : filteredSeries.map(s => (
                <tr key={s.id} className={cn("transition-colors group", isDark ? "hover:bg-white/5" : "hover:bg-slate-50/80", selectedIds.includes(s.id) && (isDark ? "bg-cyan-500/10" : "bg-cyan-50/60"))}>
                  <td className="p-4 whitespace-nowrap">
                    <button 
                      onClick={() => toggleSelect(s.id)}
                      className={cn(
                        "w-5 h-5 border rounded flex items-center justify-center transition-colors",
                        selectedIds.includes(s.id)
                          ? "bg-cyan-500 border-cyan-500 text-slate-950"
                          : isDark ? "border-slate-700 bg-[#060b14] hover:border-cyan-400" : "border-slate-300 bg-white hover:border-slate-400"
                      )}
                    >
                      {selectedIds.includes(s.id) && <Check className="w-3.5 h-3.5 text-slate-950 font-bold" strokeWidth={3} />}
                    </button>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <div className="flex items-center gap-4">
                      <div className={cn("w-12 h-12 rounded-xl overflow-hidden border flex items-center justify-center shrink-0 group-hover:border-cyan-500/30 transition-colors", isDark ? "border-slate-800 bg-[#060b14]" : "border-slate-200 bg-slate-50")}>
                        {s.image ? <img referrerPolicy="no-referrer" src={s.image} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" /> : <BookOpen className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-700")} />}
                      </div>
                      <Link href={`/admin/series/edit/${s.id}`} className={cn("font-bold line-clamp-1 group-hover:text-cyan-400 transition-colors", isDark ? "text-white" : "text-slate-900")}>
                        {s.title}
                      </Link>
                    </div>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-zinc-500/10 border border-zinc-500/20", isDark ? "text-zinc-400" : "text-slate-500")}>
                      {s.level || 'Beginner'}
                    </span>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border", isDark ? "text-zinc-300 border-slate-800 bg-[#060b14]" : "text-slate-600 border-slate-200 bg-slate-50")}>
                      {s.episodes?.length ?? 0} Episodes
                    </span>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border", s.published ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" : isDark ? "text-zinc-400 border-slate-800 bg-[#060b14]" : "text-slate-500 border-slate-200 bg-slate-50")}>
                      {s.published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="p-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleTogglePublish(s.id, s.published)}
                        className={cn("p-2 rounded-lg transition-all border", s.published ? (isDark ? "bg-white/5 border-transparent hover:border-slate-800 text-zinc-400 hover:text-white" : "bg-slate-100 border-transparent hover:border-slate-200 text-slate-500 hover:text-slate-900") : "bg-cyan-500/10 border-transparent hover:border-cyan-500/20 text-cyan-400 hover:text-white")}
                        title={s.published ? 'Unpublish' : 'Publish'}>
                        {s.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <Link href={`/admin/series/edit/${s.id}`}
                        className={cn("p-2 rounded-lg bg-cyan-500/10 hover:text-white hover:bg-cyan-500/20 transition-colors border border-transparent hover:border-cyan-500/20", isDark ? "text-cyan-400" : "text-cyan-700")}>
                        <Edit2 className="w-4 h-4" />
                      </Link>
                      <button onClick={() => setDeleteId(s.id)}
                        className={cn("p-2 rounded-lg bg-red-500/10 hover:text-white hover:bg-red-500/20 transition-colors border border-transparent hover:border-red-500/20", isDark ? "text-red-400" : "text-red-700")}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className={cn("flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t gap-4", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}>
            <div className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
              Showing <span className={cn("font-medium", isDark ? "text-white" : "text-slate-900")}>{series.length}</span> of <span className={cn("font-medium", isDark ? "text-white" : "text-slate-900")}>{total}</span> results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className={cn("px-3 py-1 text-sm rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed transition-colors", isDark ? "border-slate-800 text-zinc-300 hover:bg-slate-800/50" : "border-slate-200 text-slate-600 hover:bg-slate-100")}
              >
                Previous
              </button>
              <div className={cn("text-sm mx-2", isDark ? "text-zinc-400" : "text-slate-500")}>
                Page <span className={cn("font-medium", isDark ? "text-white" : "text-slate-900")}>{page}</span> of {totalPages}
              </div>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={cn("px-3 py-1 text-sm rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed transition-colors", isDark ? "border-slate-800 text-zinc-300 hover:bg-slate-800/50" : "border-slate-200 text-slate-600 hover:bg-slate-100")}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Delete Series?" description="This series and all its episodes will be permanently deleted."
        confirmText="Delete" isLoading={deleting} variant="danger" />
        
      <ConfirmModal isOpen={showDeleteAllModal} onClose={() => setShowDeleteAllModal(false)} onConfirm={handleBulkDelete}
        title="Delete Selected Series?" description={`Are you sure you want to permanently delete ${selectedIds.length} series?`}
        confirmText="Delete All" isLoading={isDeletingAll} variant="danger" />
    </div>
  );
}
