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
    <motion.div className="space-y-8 pb-10 w-full" variants={containerVariants} initial="hidden" animate="visible">
      {/* Hero Header */}
      <motion.div variants={itemVariants} className={cn("relative overflow-hidden rounded-3xl p-6 md:p-8 shadow-sm group flex flex-col md:flex-row md:items-center justify-between gap-6 border", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200")}>
        
        
        <div className="relative z-10">
          <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 tracking-wide border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-500/10 border-cyan-500/20 text-cyan-800")}>
            <LinkIcon className="w-3 h-3" /> Link Management
          </div>
          <h1 className={cn("text-3xl md:text-4xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            URL <span className={cn(isDark ? "text-cyan-400" : "text-cyan-600")}>Shortener</span>
          </h1>
          <p className={cn("text-sm max-w-md", isDark ? "text-zinc-400" : "text-slate-500")}>Create short links instantly, monitor clicks, and manage your shortened URLs all in one place.</p>
        </div>

        <div className="relative z-10 shrink-0 flex items-center gap-2 sm:gap-3 w-full md:w-auto mt-4 md:mt-0">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="flex-1 md:flex-none bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-bold py-3 px-4 sm:py-3.5 sm:px-6 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base"
            >
              {isBulkDeleting ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />}
              <span className="hidden md:inline">Delete Selected ({selectedIds.length})</span>
              <span className="md:hidden">Delete ({selectedIds.length})</span>
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className={cn("px-5 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-white shadow-sm" : "bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm hover:shadow-md")}
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden md:inline">Create New Link</span>
            <span className="md:hidden">New Link</span>
          </button>
        </div>
      </motion.div>

      {!hasAccess ? (
        <motion.div variants={itemVariants}>
          <div className={cn("rounded-3xl p-12 text-center border", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200")}>
            <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 transform -rotate-6", isDark ? "bg-white/5" : "bg-slate-100")}>
              <LinkIcon className={cn("w-10 h-10 transform rotate-6", isDark ? "text-zinc-500" : "text-slate-500")} />
            </div>
            <h4 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No Active Subscription</h4>
            <p className={cn("text-sm max-w-md mx-auto mb-8 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
              You need an active URL Shortener subscription to start creating, managing, and tracking your shortened links.
            </p>
            <Link href="/dashboard/checkout?service=SHORTENER" className="inline-block bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3.5 px-8 rounded-2xl transition-all shadow-sm">
              View Plans
            </Link>
          </div>
        </motion.div>
      ) : (
        <>
          <motion.div variants={itemVariants} className={cn(" rounded-3xl overflow-hidden shadow-md relative border", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200")}>
                <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={cn("border-b", isDark ? "border-white/5 bg-black/20" : "border-slate-200 bg-slate-50/70")}>
                <th className="p-3 sm:p-5 w-10 sm:w-12 text-center rounded-tl-3xl">
                  <button 
                    onClick={toggleSelectAll} 
                    className={`w-5 h-5 border rounded flex items-center justify-center cursor-pointer transition-colors mx-auto ${links.length > 0 && selectedIds.length === links.length ? 'bg-cyan-500 border-cyan-500' : 'border-zinc-500 hover:border-zinc-400'}`}
                  >
                    {links.length > 0 && selectedIds.length === links.length && <CheckCircle className="w-3.5 h-3.5 text-[#011627]" />}
                  </button>
                </th>
                <th className={cn("p-3 sm:p-5 text-xs font-bold uppercase tracking-widest whitespace-nowrap", isDark ? "text-zinc-400" : "text-slate-500")}>Short Link</th>
                <th className={cn("p-3 sm:p-5 text-xs font-bold uppercase tracking-widest hidden md:table-cell", isDark ? "text-zinc-400" : "text-slate-500")}>Destination</th>
                <th className={cn("p-3 sm:p-5 text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Clicks</th>
                <th className={cn("p-3 sm:p-5 text-xs font-bold uppercase tracking-widest text-right rounded-tr-3xl", isDark ? "text-zinc-400" : "text-slate-500")}>Actions</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDark ? "divide-white/5" : "divide-slate-200")}>
              {links.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 md:p-16 text-center">
                    <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 transform -rotate-6", isDark ? "bg-white/5" : "bg-slate-100")}>
                      <Link2 className="w-10 h-10 text-cyan-400 transform rotate-6" />
                    </div>
                    <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No short links yet</h3>
                    <p className={cn("mb-8 max-w-sm mx-auto text-sm leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
                      Create your first custom short link and start tracking clicks! It's fast and easy.
                    </p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className={cn("inline-flex items-center gap-2 font-bold px-6 py-3 rounded-xl transition-all shadow-sm hover:shadow-md border", isDark ? "bg-white/5 hover:bg-white/10 border-white/10 text-cyan-400" : "bg-white hover:bg-slate-50 border-slate-200 text-cyan-600")}
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
                    <tr key={link.id} className={cn("transition-colors group", isDark ? "hover:bg-slate-800/30" : "hover:bg-slate-50/80", isSelected ? (isDark ? "bg-cyan-950/20" : "bg-slate-50") : "")}>
                      <td className="p-3 sm:p-5 text-center">
                        <button 
                          onClick={() => toggleSelect(link.id)} 
                          className={cn("w-5 h-5 border rounded flex items-center justify-center cursor-pointer transition-colors mx-auto", isSelected ? "bg-cyan-600 border-cyan-600" : (isDark ? "border-zinc-700 hover:border-zinc-500 bg-[#060b14]" : "border-slate-300 hover:border-slate-400 bg-white"))}
                        >
                          {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                        </button>
                      </td>
                      <td className="p-3 sm:p-5">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-2 sm:gap-3">
                          <span className={cn("font-bold text-sm md:text-base tracking-wide px-3 py-1.5 rounded-lg border w-fit", isDark ? "text-cyan-400 bg-cyan-950/40 border-cyan-800/40" : "text-cyan-700 bg-slate-100 border-slate-200")}>
                            {link.code}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button 
                              onClick={() => copyToClipboard(shortUrl, link.code)}
                              className={cn("p-1.5 rounded-md transition-colors", isDark ? "text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10" : "text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200")}
                              title="Copy Link"
                            >
                              {copiedCode === link.code ? <span className="text-green-400 font-bold text-[10px] px-1 uppercase tracking-widest">Copied</span> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <a href={shortUrl} target="_blank" rel="noopener noreferrer" className={cn("p-1.5 rounded-md transition-colors", isDark ? "text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10" : "text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200")} title="Open Link">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                        <div className={cn("text-xs mt-2 block md:hidden truncate max-w-[150px] sm:max-w-[200px]", isDark ? "text-zinc-500" : "text-slate-500")}>
                          {link.url}
                        </div>
                      </td>
                      <td className="p-3 sm:p-5 hidden md:table-cell">
                        <div className={cn("text-sm truncate max-w-[250px] lg:max-w-[400px] font-medium", isDark ? "text-zinc-300" : "text-slate-500")} title={link.url}>
                          {link.url}
                        </div>
                      </td>
                      <td className="p-3 sm:p-5">
                        <div className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-black text-xs sm:text-sm shadow-sm">
                          <Activity className="w-3.5 h-3.5" />
                          {link.clicks.toLocaleString()}
                        </div>
                      </td>
                      <td className="p-3 sm:p-5 text-right">
                        <button 
                          onClick={() => openDeleteModal(link.id)}
                          disabled={deletingId === link.id}
                          className="p-2 sm:p-2.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all disabled:opacity-50"
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
          <div className={cn("p-6 border-t", isDark ? "border-white/5" : "border-slate-200")}>
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60  px-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={cn("rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-md border", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200")}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>Delete Short Link?</h3>
                <p className={cn("text-sm mb-8 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
                  Are you sure you want to delete this short link? This action cannot be undone and the URL will no longer redirect.
                </p>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className={cn("flex-1 py-3 rounded-xl border font-medium transition-colors", isDark ? "border-white/10 text-white hover:bg-white/5" : "border-slate-200 text-slate-700 hover:bg-slate-50")}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className={cn("flex-1 py-3 rounded-xl bg-red-500 font-bold hover:bg-red-600 transition-colors", isDark ? "text-white" : "text-slate-900")}
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60  px-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={cn("rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-md border", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200")}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>Delete {selectedIds.length} Links?</h3>
                <p className={cn("text-sm mb-8 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
                  Are you sure you want to delete the {selectedIds.length} selected short links? This action cannot be undone.
                </p>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setShowBulkDeleteModal(false)}
                    className={cn("flex-1 py-3 rounded-xl border font-medium transition-colors", isDark ? "border-white/10 text-white hover:bg-white/5" : "border-slate-200 text-slate-700 hover:bg-slate-50")}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmBulkDelete}
                    className={cn("flex-1 py-3 rounded-xl bg-red-500 font-bold hover:bg-red-600 transition-colors", isDark ? "text-white" : "text-slate-900")}
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60  px-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              className={cn("rounded-3xl p-6 md:p-8 max-w-md w-full shadow-md relative overflow-hidden border", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200")}
            >
                            
              <div className="flex items-center justify-between mb-8 relative z-10">
                <h3 className={cn("text-2xl font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                  <Link2 className={cn("w-6 h-6", isDark ? "text-cyan-400" : "text-cyan-600")} /> Create Short Link
                </h3>
                <button onClick={() => setShowCreateModal(false)} className={cn("transition-colors p-2 rounded-xl", isDark ? "text-zinc-500 hover:text-white bg-white/5 hover:bg-white/10" : "text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200")}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
              
              <form onSubmit={handleCreate} className="space-y-6 relative z-10">
                <div>
                  <label className={cn("block text-xs font-bold tracking-widest uppercase mb-2", isDark ? "text-zinc-400" : "text-slate-500")}>Destination URL</label>
                  <input
                    type="url"
                    required
                    placeholder="https://example.com/very-long-url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className={cn("w-full rounded-2xl px-5 py-4 text-sm transition-all focus:outline-none focus:ring-2 shadow-sm", isDark ? "bg-[#060b14] border border-slate-800 text-white placeholder-zinc-500 focus:border-cyan-500 focus:ring-cyan-500/20" : "bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20 shadow-sm")}
                  />
                </div>

                <div className={cn("flex gap-3 pt-4 border-t", isDark ? "border-white/5" : "border-slate-200")}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className={cn("flex-1 py-3.5 rounded-2xl border font-medium transition-colors", isDark ? "border-white/10 text-white hover:bg-white/5" : "border-slate-200 text-slate-700 hover:bg-slate-50")}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className={cn("flex-1 py-3.5 rounded-2xl text-white font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none", isDark ? "bg-cyan-500 hover:bg-cyan-400 shadow-sm" : "bg-cyan-600 hover:bg-cyan-700 shadow-sm hover:shadow-md")}
                  >
                    {isCreating ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Plus className="w-5 h-5" />
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