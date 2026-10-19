"use client";
import { useUpdateEffect, useUrlNumber, useUrlString } from "@/lib/useUrlTab";
import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Search, ExternalLink, Tag, CheckCircle, Check , FileText } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import Link from "next/link";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Pagination } from "@/components/ui/Pagination";
import { AdminLoader } from "@/components/admin/AdminLoader";

export default function AdminBlogPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useUrlString<string>("search", "");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useUrlNumber("currentPage", 1);
  const itemsPerPage = 10;

  const fetchArticles = async () => {
    try {
      const res = await fetch('/api/admin/blog');
      const data = await res.json();
      if (!data.error) {
        setArticles(data);
      }
    } catch (err) {
      toast.error("Failed to load articles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/blog/${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("Article deleted");
        fetchArticles();
      } else {
        toast.error("Failed to delete article");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeletingAll(true);
    try {
      const res = await fetch('/api/admin/blog/bulk-delete', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });
      if (res.ok) {
        setArticles(articles.filter(a => !selectedIds.includes(a.id)));
        setSelectedIds([]);
        toast.success(`${selectedIds.length} articles deleted`);
      } else {
        toast.error("Failed to delete articles");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setIsDeletingAll(false);
      setShowDeleteAllModal(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredArticles.length && filteredArticles.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredArticles.map(a => a.id));
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const filteredArticles = articles.filter(a => 
    a.title.toLowerCase().includes(search.toLowerCase()) || 
    (a.category?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredArticles.length / itemsPerPage);
  const paginatedArticles = filteredArticles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useUpdateEffect(() => {
    setCurrentPage(1);
  }, [search]);

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
      <div className="flex flex-col sm:flex-row md:items-end justify-between gap-6 mb-6">
        <div>
          <h1 className={cn("text-3xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Blog Management</h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Write, edit, and publish your technical articles.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/blog/categories" className={cn("inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border", isDark ? "text-slate-200 border-white/10 hover:bg-white/10" : "text-slate-700 border-slate-200 hover:bg-slate-100")}>
            <Tag className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-700")} /> Categories
          </Link>
          <Link href="/admin/blog/edit/new" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm transition-all">
            <Plus className="w-4 h-4" /> New Article
          </Link>
      </div>
      </div>

      <motion.div variants={itemVariants} className={cn("rounded-2xl border overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className={cn("p-5 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4", isDark ? "bg-[#060b14] border-slate-800" : "bg-white border-slate-200")}>
          <div className="relative w-full max-w-md">
            <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 /70", isDark ? "text-cyan-500" : "text-cyan-700")} />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles by title or category..." 
              className={cn("w-full pl-11 pr-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:border-cyan-500 transition-all font-medium", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
            />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {filteredArticles.length > 0 && (
              <button 
                onClick={toggleSelectAll}
                className={cn("flex items-center justify-center gap-2 flex-1 sm:flex-none px-4 py-2.5 text-sm font-bold rounded-xl transition-all border whitespace-nowrap", isDark ? "text-white border-slate-800 hover:bg-slate-800/60" : "text-slate-900 border-slate-200 hover:bg-slate-50")}
              >
                <div className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${selectedIds.length === filteredArticles.length && filteredArticles.length > 0 ? 'bg-cyan-400 border-cyan-400 text-slate-950' : isDark ? "border-slate-700" : "border-slate-300"}`}>
                  {selectedIds.length === filteredArticles.length && filteredArticles.length > 0 && <Check className="w-3 h-3 text-slate-950 font-bold" strokeWidth={3} />}
                </div>
                <span>{selectedIds.length === filteredArticles.length && filteredArticles.length > 0 ? 'Deselect All' : 'Select All'}</span>
              </button>
            )}
            {selectedIds.length > 0 && (
              <button 
                onClick={() => setShowDeleteAllModal(true)}
                className={cn("flex items-center justify-center gap-2 flex-1 sm:flex-none px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-sm font-bold rounded-xl transition-all border border-red-500/20 whitespace-nowrap", isDark ? "text-red-400" : "text-red-700")}
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete ({selectedIds.length})</span>
              </button>
            )}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className={cn("w-full text-left text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
            <thead className={cn("text-[10px] uppercase border-b tracking-wider font-semibold", isDark ? "bg-slate-900/60 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500")}>
              <tr>
                <th className="px-6 py-4 w-10 whitespace-nowrap"></th>
                <th className="px-6 py-4 whitespace-nowrap">Article Title</th>
                <th className="px-6 py-4 whitespace-nowrap">Category</th>
                <th className="px-6 py-4 whitespace-nowrap">Status</th>
                <th className="px-6 py-4 whitespace-nowrap">Date</th>
                <th className="px-6 py-4 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDark ? "divide-slate-800/80" : "divide-slate-200")}>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12">
                    <AdminLoader className="min-h-[200px]" />
                  </td>
                </tr>
              ) : filteredArticles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-4 border", isDark ? "border-white/10" : "border-slate-200")}>
                        <Search className="w-8 h-8 text-zinc-500" />
                      </div>
                      <h3 className={cn("font-bold mb-1", isDark ? "text-white" : "text-slate-900")}>No articles found</h3>
                      <p className="text-zinc-500 text-sm max-w-sm">We couldn't find any articles matching your search criteria. Try adjusting your filters or create a new one.</p>
                      {search && (
                        <button onClick={() => setSearch('')} className={cn("mt-4 text-sm hover:text-cyan-300 font-medium transition-colors", isDark ? "text-cyan-400" : "text-cyan-700")}>
                          Clear search
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedArticles.map((article) => (
                  <tr key={article.id} className={cn("transition-colors group", selectedIds.includes(article.id) ? (isDark ? "bg-cyan-500/10" : "bg-cyan-50/60") : (isDark ? "hover:bg-white/5" : "hover:bg-slate-50/80"))}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button onClick={() => toggleSelect(article.id)} className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${selectedIds.includes(article.id) ? 'bg-cyan-400 border-cyan-400 text-slate-950' : isDark ? 'bg-[#060b14] border-slate-700 hover:border-cyan-400' : 'bg-white border-slate-300 hover:border-cyan-600'}`}>
                        {selectedIds.includes(article.id) && <Check className="w-3 h-3 text-slate-950 font-bold" strokeWidth={3} />}
                      </button>
                    </td>
                    <td className={cn("px-6 py-4 font-bold transition-colors whitespace-nowrap", isDark ? "text-white group-hover:text-cyan-400" : "text-slate-900 group-hover:text-cyan-700")}>
                      <Link href={`/admin/blog/edit/${article.id}`}>{article.title}</Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-zinc-500/10 border border-zinc-500/20", isDark ? "text-zinc-400" : "text-slate-500")}>
                        {article.category?.name || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {article.published ? (
                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20", isDark ? "text-emerald-400" : "text-emerald-700")}>
                          <CheckCircle className="w-3 h-3" /> Published
                        </span>
                      ) : (
                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-amber-500/10 border border-amber-500/20", isDark ? "text-amber-400" : "text-amber-700")}>
                          <Edit2 className="w-3 h-3" /> Draft
                        </span>
                      )}
                    </td>
                    <td className={cn("px-6 py-4 whitespace-nowrap font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>{new Date(article.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/blog/${article.slug}`} target="_blank" className={cn("p-2 rounded-lg transition-colors border border-transparent", isDark ? "hover:text-white hover:bg-white/10 hover:border-white/10 text-zinc-400" : "hover:text-slate-900 hover:bg-slate-100 hover:border-slate-200 text-slate-500")} title="View Public">
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                        <Link href={`/admin/blog/edit/${article.id}`} className={cn("p-2 rounded-lg transition-colors border border-transparent", isDark ? "bg-cyan-500/10 hover:bg-cyan-500 hover:text-white text-cyan-400" : "bg-cyan-50 hover:bg-cyan-500 hover:text-white text-cyan-700")} title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button onClick={() => setDeleteId(article.id)} className={cn("p-2 rounded-lg transition-colors border border-transparent", isDark ? "bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400" : "bg-red-50 hover:bg-red-500 hover:text-white text-red-700")} title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className={cn("p-4 border-t", isDark ? "border-slate-800" : "border-slate-200")}>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      </motion.div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Article?"
        description="This article and all related images will be permanently deleted."
        confirmText="Delete"
        isLoading={deleting}
        variant="danger"
      />

      <ConfirmModal
        isOpen={showDeleteAllModal}
        onClose={() => setShowDeleteAllModal(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Articles?"
        description={`Are you sure you want to delete ${selectedIds.length} selected articles and all related images? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isDeletingAll}
        variant="danger"
      />
    </motion.div>
  );
}
