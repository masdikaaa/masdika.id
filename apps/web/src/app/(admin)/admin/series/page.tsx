"use client";
import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";
import { BookOpen, Plus, Edit2, Trash2, Eye, EyeOff, Check, CheckCircle , Loader2, LayoutDashboard, Search } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import Link from "next/link";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { motion } from "framer-motion";
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

  const toggleSelectAll = () => {
    if (selectedIds.length === series.length && series.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(series.map(s => s.id));
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-4">
        <div className="flex flex-col sm:flex-row md:items-end justify-between gap-6 mb-6">
        <div>
          <h1 className={cn("text-3xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Series Management</h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Manage learning series and their episodes.</p>
        </div>
      </div>
        <Link href="/admin/series/edit/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm transition-all">
          <Plus className="w-4 h-4" /> Add Series
        </Link>
      </motion.div>

      <motion.div variants={itemVariants} className={cn("rounded-2xl border overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className={cn("p-5 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}>
          <div className="relative w-full sm:max-w-md">
            <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-70", isDark ? "text-cyan-500" : "text-cyan-700")} />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search series..." 
              className={cn("w-full pl-11 pr-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
            />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {series.length > 0 && (
              <button 
                onClick={toggleSelectAll}
                className={cn("flex items-center justify-center gap-2 flex-1 sm:flex-none px-4 py-2.5 text-sm font-bold rounded-xl transition-all border whitespace-nowrap", isDark ? "text-white border-slate-800 hover:bg-slate-800/60" : "text-slate-900 border-slate-200 hover:bg-slate-100")}
              >
                <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-colors", selectedIds.length === series.length ? "bg-cyan-400 border-cyan-400 text-slate-950" : (isDark ? "border-slate-700 bg-slate-900/50" : "border-slate-300 bg-white"))}>
                  {selectedIds.length === series.length && <Check className="w-3 h-3 text-slate-950 font-bold" strokeWidth={3} />}
                </div>
                Select All
              </button>
            )}
            {selectedIds.length > 0 && (
              <button 
                onClick={() => setShowDeleteAllModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-transparent hover:border-red-500/20 whitespace-nowrap"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Delete Selected ({selectedIds.length})</span>
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className={cn("w-full text-left text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
            <thead className={cn("text-[10px] uppercase border-b tracking-wider font-bold", isDark ? "bg-slate-900/60 text-slate-400 border-slate-800" : "bg-slate-50 text-slate-500 border-slate-200")}>
              <tr>
                <th className="px-6 py-4 whitespace-nowrap w-12"></th>
                <th className="px-6 py-4 whitespace-nowrap">Series</th>
                <th className="px-6 py-4 whitespace-nowrap">Level</th>
                <th className="px-6 py-4 whitespace-nowrap">Episodes</th>
                <th className="px-6 py-4 whitespace-nowrap">Status</th>
                <th className="px-6 py-4 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDark ? "divide-slate-800/80" : "divide-slate-200")}>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <AdminLoader className="min-h-[200px]" />
                  </td>
                </tr>
              ) : series.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-4 border", isDark ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-slate-50")}>
                        <BookOpen className="w-8 h-8 text-zinc-500" />
                      </div>
                      <h3 className={cn("font-bold mb-1", isDark ? "text-white" : "text-slate-900")}>No series found</h3>
                      <p className="text-zinc-500 text-sm max-w-sm">You haven't created any learning series yet.</p>
                    </div>
                  </td>
                </tr>
              ) : series.map(s => (
                <tr key={s.id} className={cn("transition-colors group", isDark ? "hover:bg-white/5" : "hover:bg-slate-50/80", selectedIds.includes(s.id) && (isDark ? "bg-white/5" : "bg-slate-50"))}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button 
                      onClick={() => toggleSelect(s.id)}
                      className={cn("w-4 h-4 rounded border flex items-center justify-center transition-colors", selectedIds.includes(s.id) ? "bg-cyan-400 border-cyan-400 text-slate-950" : (isDark ? "border-slate-700 bg-slate-900/50" : "border-slate-300 bg-white"))}
                    >
                      {selectedIds.includes(s.id) && <Check className="w-3 h-3 text-slate-950 font-bold" strokeWidth={3} />}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-4">
                      <div className={cn("w-12 h-12 rounded-xl overflow-hidden border flex items-center justify-center shrink-0 group-hover:border-cyan-500/30 transition-colors", isDark ? "border-slate-800" : "border-slate-200")}>
                        {s.image ? <img referrerPolicy="no-referrer" src={s.image} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" /> : <BookOpen className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-700")} />}
                      </div>
                      <Link href={`/admin/series/edit/${s.id}`} className={cn("font-bold line-clamp-1 group-hover:text-cyan-400 transition-colors", isDark ? "text-white" : "text-slate-900")}>
                        {s.title}
                      </Link>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-zinc-500/10 border border-zinc-500/20", isDark ? "text-zinc-400" : "text-slate-500")}>
                      {s.level || 'Beginner'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border", isDark ? "text-zinc-300 border-slate-800 bg-slate-900/40" : "text-slate-600 border-slate-200 bg-slate-50")}>
                      {s.episodes?.length ?? 0} Episodes
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
 <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border ${s.published ?'text-cyan-400 bg-cyan-500/10 border-cyan-500/20': isDark ?"text-zinc-400 border-slate-800":"text-slate-500 border-slate-200"}`}>
                      {s.published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleTogglePublish(s.id, s.published)}
 className={`p-2 rounded-lg transition-all border ${s.published ? isDark ?"bg-white/5 border-transparent hover:border-slate-800 text-zinc-400 hover:text-white":"bg-slate-100 border-transparent hover:border-slate-200 text-slate-500 hover:text-slate-900":'bg-cyan-500/10 border-transparent hover:border-cyan-500/20 text-cyan-400 hover:text-white'}`}
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
      </motion.div>

      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Delete Series?" description="This series and all its episodes will be permanently deleted."
        confirmText="Delete" isLoading={deleting} variant="danger" />
        
      <ConfirmModal isOpen={showDeleteAllModal} onClose={() => setShowDeleteAllModal(false)} onConfirm={handleBulkDelete}
        title="Delete Selected Series?" description={`Are you sure you want to permanently delete ${selectedIds.length} series?`}
        confirmText="Delete All" isLoading={isDeletingAll} variant="danger" />
    </motion.div>
  );
}
