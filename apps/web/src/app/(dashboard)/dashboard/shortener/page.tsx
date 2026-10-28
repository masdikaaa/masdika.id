'use client';

import { useUrlNumber } from "@/lib/useUrlTab";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { Plus, Link2, Copy, Trash2, ExternalLink, Activity, CheckCircle, Search, Calendar, ChevronLeft, ChevronRight, RefreshCw, ArrowLeft, Link as LinkIcon, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Pagination } from "@/components/ui/Pagination";

export default function DashboardShortenerPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [linkToDelete, setLinkToDelete] = useState<number | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [page, setPage] = useUrlNumber("page", 1);
  const itemsPerPage = 10;

  const fetchLinks = async () => {
    try {
      const res = await fetch("/api/shortener");
      if (res.status === 403) {
        setHasAccess(false);
        setLoading(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setLinks(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const openDeleteModal = (id: number) => {
    setLinkToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!linkToDelete) return;
    setDeletingId(linkToDelete);
    setShowDeleteModal(false);
    
    try {
      const res = await fetch(`/api/shortener/${linkToDelete}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Short link deleted");
        fetchLinks();
      } else {
        toast.error("Failed to delete short link");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setDeletingId(null);
      setLinkToDelete(null);
    }
  };

  const copyToClipboard = (text: string, code: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(code);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setShowBulkDeleteModal(true);
  };

  const confirmBulkDelete = async () => {
    setIsBulkDeleting(true);
    setShowBulkDeleteModal(false);
    try {
      const res = await fetch("/api/shortener", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (res.ok) {
        toast.success(`Deleted ${selectedIds.length} short links`);
        setSelectedIds([]);
        fetchLinks();
      } else {
        toast.error("Failed to delete short links");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === links.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(links.map(link => link.id));
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl) return toast.error("URL is required");
    
    setIsCreating(true);
    try {
      const res = await fetch("/api/shortener", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Short link created!");
        setShowCreateModal(false);
        setNewUrl("");
        fetchLinks();
      } else {
        toast.error(data.error || "Failed to create short link");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setIsCreating(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  const totalPages = Math.max(1, Math.ceil(links.length / itemsPerPage));
  const paginatedLinks = links.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  if (loading) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center">
        <RefreshCw className="w-10 h-10 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div className="space-y-6 pb-10 w-full" variants={containerVariants} initial="hidden" animate="visible">
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              URL Shortener
            </h1>
            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <LinkIcon className="w-3 h-3" /> Link Management
            </span>
          </div>
          <p className={cn("text-xs sm:text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
            Create short links instantly, monitor clicks, and manage your shortened URLs all in one place.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="flex-1 sm:flex-none bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
            >
              {isBulkDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              <span className="hidden md:inline">Delete Selected ({selectedIds.length})</span>
              <span className="md:hidden">Delete ({selectedIds.length})</span>
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden md:inline">Create New Link</span>
            <span className="md:hidden">New Link</span>
          </button>
        </div>
      </motion.div>

      {!hasAccess ? (
        <motion.div variants={itemVariants}>
          <div className={cn("rounded-2xl p-8 sm:p-12 text-center border", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 border", isDark ? "bg-white/[0.02] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")}>
              <LinkIcon className={cn("w-8 h-8", isDark ? "text-zinc-500" : "text-slate-500")} />
            </div>
            <h4 className={cn("text-lg sm:text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No Active Subscription</h4>
            <p className={cn("text-xs sm:text-sm max-w-md mx-auto mb-6 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
              You need an active URL Shortener subscription to start creating, managing, and tracking your shortened links.
            </p>
            <Link href="/dashboard/checkout?service=SHORTENER" className="inline-flex items-center justify-center bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 font-bold py-2.5 px-5 rounded-xl text-xs sm:text-sm transition-all shadow-sm">
              View Plans
            </Link>
          </div>
        </motion.div>
      ) : (
        <>
          <motion.div variants={itemVariants} className={cn("rounded-2xl overflow-hidden relative border", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
                <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={cn("border-b", isDark ? "border-white/[0.08] bg-white/[0.02]" : "border-slate-200/90 bg-slate-50/80")}>
                <th className="p-3 sm:p-4 w-10 sm:w-12 text-center">
                  <button 
                    onClick={toggleSelectAll} 
                    className={cn("w-5 h-5 border rounded-md flex items-center justify-center cursor-pointer transition-colors mx-auto", links.length > 0 && selectedIds.length === links.length ? 'bg-cyan-500 border-cyan-500' : (isDark ? 'border-white/[0.15] hover:border-white/30 bg-[#111115]' : 'border-slate-300 hover:border-slate-400 bg-white'))}
                  >
                    {links.length > 0 && selectedIds.length === links.length && <CheckCircle className="w-3.5 h-3.5 text-slate-950" />}
                  </button>
                </th>
                <th className={cn("p-3 sm:p-4 text-xs font-semibold uppercase tracking-wider whitespace-nowrap", isDark ? "text-zinc-400" : "text-slate-500")}>Short Link</th>
                <th className={cn("p-3 sm:p-4 text-xs font-semibold uppercase tracking-wider hidden md:table-cell", isDark ? "text-zinc-400" : "text-slate-500")}>Destination</th>
                <th className={cn("p-3 sm:p-4 text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Clicks</th>
                <th className={cn("p-3 sm:p-4 text-xs font-semibold uppercase tracking-wider text-right", isDark ? "text-zinc-400" : "text-slate-500")}>Actions</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDark ? "divide-white/[0.06]" : "divide-slate-100")}>
              {links.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 sm:p-12 text-center">
                    <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 border", isDark ? "bg-white/[0.02] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")}>
                      <Link2 className="w-8 h-8 text-cyan-400" />
                    </div>
                    <h3 className={cn("text-lg sm:text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No short links yet</h3>
                    <p className={cn("mb-6 max-w-sm mx-auto text-xs sm:text-sm leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
                      Create your first custom short link and start tracking clicks! It's fast and easy.
                    </p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className={cn("inline-flex items-center gap-2 font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition-all border", isDark ? "bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.08] text-cyan-400" : "bg-slate-50/80 hover:bg-slate-100 border-slate-200/90 text-cyan-600")}
                    >
                      <Plus className="w-4 h-4" />
                      Create Short Link
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedLinks.map((link) => {
                  const shortUrl = `${window.location.origin}/${link.code}`;
                  const isSelected = selectedIds.includes(link.id);
                  return (
                    <tr key={link.id} className={cn("transition-colors group", isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50/80", isSelected ? (isDark ? "bg-cyan-500/[0.06]" : "bg-slate-50") : "")}>
                      <td className="p-3 sm:p-4 text-center">
                        <button 
                          onClick={() => toggleSelect(link.id)} 
                          className={cn("w-5 h-5 border rounded-md flex items-center justify-center cursor-pointer transition-colors mx-auto", isSelected ? "bg-cyan-500 border-cyan-500" : (isDark ? "border-white/[0.15] hover:border-white/30 bg-[#111115]" : "border-slate-300 hover:border-slate-400 bg-white"))}
                        >
                          {isSelected && <CheckCircle className="w-3.5 h-3.5 text-slate-950" />}
                        </button>
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-2 sm:gap-3">
                          <span className={cn("font-bold text-xs sm:text-sm tracking-wide px-2.5 py-1 rounded-lg border w-fit font-mono", isDark ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" : "text-cyan-700 bg-slate-50/80 border-slate-200/90")}>
                            {link.code}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button 
                              onClick={() => copyToClipboard(shortUrl, link.code)}
                              className={cn("p-1.5 rounded-lg border transition-colors", isDark ? "text-zinc-400 hover:text-white bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.08]" : "text-slate-500 hover:text-slate-900 bg-slate-50/80 hover:bg-slate-100 border-slate-200/90")}
                              title="Copy Link"
                            >
                              {copiedCode === link.code ? <span className="text-emerald-400 font-bold text-[10px] px-1 uppercase tracking-widest">Copied</span> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <a href={shortUrl} target="_blank" rel="noopener noreferrer" className={cn("p-1.5 rounded-lg border transition-colors", isDark ? "text-zinc-400 hover:text-white bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.08]" : "text-slate-500 hover:text-slate-900 bg-slate-50/80 hover:bg-slate-100 border-slate-200/90")} title="Open Link">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                        <div className={cn("text-xs mt-1.5 block md:hidden truncate max-w-[160px] sm:max-w-[220px]", isDark ? "text-zinc-500" : "text-slate-500")}>
                          {link.url}
                        </div>
                      </td>
                      <td className="p-3 sm:p-4 hidden md:table-cell">
                        <div className={cn("text-sm truncate max-w-[250px] lg:max-w-[400px] font-medium", isDark ? "text-zinc-300" : "text-slate-500")} title={link.url}>
                          {link.url}
                        </div>
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="inline-flex items-center gap-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-1 rounded-lg font-bold text-xs sm:text-sm">
                          <Activity className="w-3.5 h-3.5" />
                          {link.clicks.toLocaleString()}
                        </div>
                      </td>
                      <td className="p-3 sm:p-4 text-right">
                        <button 
                          onClick={() => openDeleteModal(link.id)}
                          disabled={deletingId === link.id}
                          className="p-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white rounded-xl transition-all disabled:opacity-50"
                          title="Delete Link"
                        >
                          {deletingId === link.id ? (
                            <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {!loading && totalPages > 1 && (
          <div className={cn("p-4 sm:p-5 border-t", isDark ? "border-white/[0.08] bg-white/[0.02]" : "border-slate-200/90 bg-slate-50/80")}>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </motion.div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={cn("rounded-2xl p-5 sm:p-6 max-w-sm w-full shadow-2xl border", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90")}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mb-5 border border-red-500/20">
                  <AlertTriangle className="w-7 h-7 text-red-400" />
                </div>
                <h3 className={cn("text-lg sm:text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>Delete Short Link?</h3>
                <p className={cn("text-xs sm:text-sm mb-6 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
                  Are you sure you want to delete this short link? This action cannot be undone and the URL will no longer redirect.
                </p>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className={cn("flex-1 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-colors", isDark ? "bg-white/[0.02] border-white/[0.08] text-zinc-300 hover:bg-white/[0.06]" : "bg-slate-50/80 border-slate-200/90 text-slate-700 hover:bg-slate-100")}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 text-xs sm:text-sm font-bold hover:bg-red-600 transition-colors text-white"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Confirmation Modal */}
      <AnimatePresence>
        {showBulkDeleteModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={cn("rounded-2xl p-5 sm:p-6 max-w-sm w-full shadow-2xl border", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90")}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mb-5 border border-red-500/20">
                  <AlertTriangle className="w-7 h-7 text-red-400" />
                </div>
                <h3 className={cn("text-lg sm:text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>Delete {selectedIds.length} Links?</h3>
                <p className={cn("text-xs sm:text-sm mb-6 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
                  Are you sure you want to delete the {selectedIds.length} selected short links? This action cannot be undone.
                </p>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setShowBulkDeleteModal(false)}
                    className={cn("flex-1 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-colors", isDark ? "bg-white/[0.02] border-white/[0.08] text-zinc-300 hover:bg-white/[0.06]" : "bg-slate-50/80 border-slate-200/90 text-slate-700 hover:bg-slate-100")}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmBulkDelete}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 text-xs sm:text-sm font-bold hover:bg-red-600 transition-colors text-white"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              className={cn("rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl relative overflow-hidden border", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90")}
            >
                            
              <div className="flex items-center justify-between mb-6 relative z-10">
                <h3 className={cn("text-lg sm:text-xl font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                  <Link2 className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} /> Create Short Link
                </h3>
                <button onClick={() => setShowCreateModal(false)} className={cn("transition-colors p-2 rounded-xl border", isDark ? "text-zinc-400 hover:text-white bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.08]" : "text-slate-500 hover:text-slate-900 bg-slate-50/80 hover:bg-slate-100 border-slate-200/90")}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
              
              <form onSubmit={handleCreate} className="space-y-5 relative z-10">
                <div>
                  <label className={cn("block text-xs font-bold tracking-wider uppercase mb-2", isDark ? "text-zinc-400" : "text-slate-500")}>Destination URL</label>
                  <input
                    type="url"
                    required
                    placeholder="https://example.com/very-long-url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className={cn("w-full rounded-xl px-4 py-3 text-xs sm:text-sm transition-all focus:outline-none focus:ring-1 border", isDark ? "bg-[#111115] border-white/[0.08] text-white placeholder-zinc-500 focus:border-cyan-500 focus:ring-cyan-500" : "bg-slate-50/80 border-slate-200/90 text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500")}
                  />
                </div>

                <div className={cn("flex gap-3 pt-4 border-t", isDark ? "border-white/[0.08]" : "border-slate-200/90")}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className={cn("flex-1 py-2.5 px-4 rounded-xl border font-medium text-xs sm:text-sm transition-colors", isDark ? "bg-white/[0.02] border-white/[0.08] text-zinc-300 hover:bg-white/[0.06]" : "bg-slate-50/80 border-slate-200/90 text-slate-700 hover:bg-slate-100")}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="flex-1 py-2.5 px-4 rounded-xl text-slate-950 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 shadow-sm"
                  >
                    {isCreating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Create Link
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}