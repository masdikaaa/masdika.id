"use client";
import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Check, Tag, ArrowLeft , RefreshCw , FileText } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import Link from "next/link";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

interface Category {
  id: number;
  name: string;
  slug: string;
  _count: { posts: number };
}

const generateSlug = (text: string) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
};

export default function CategoriesPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingSlug, setEditingSlug] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/blog/categories');
      const data = await res.json();
      if (!data.error) setCategories(data);
    } catch (err) {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error("Category name is required");
      return;
    }
    try {
      const res = await fetch('/api/admin/blog/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), slug: newSlug.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Category created!");
        setNewName("");
        setNewSlug("");
        fetchCategories();
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error("Something went wrong");
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editingName.trim()) {
      toast.error("Category name is required");
      return;
    }
    try {
      const res = await fetch(`/api/admin/blog/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingName.trim(), slug: editingSlug.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Category updated!");
        setEditingId(null);
        fetchCategories();
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error("Something went wrong");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/blog/categories/${deleteId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success("Category deleted!");
        fetchCategories();
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  if (loading) return (
    <div className="min-h-[60vh] w-full flex items-center justify-center">
      <RefreshCw className={cn("w-10 h-10 animate-spin", isDark ? "text-cyan-500" : "text-cyan-700")} />
    </div>
  );

  return (
    <div className="space-y-8 w-full relative z-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
        <Link href="/admin/blog" className={cn("p-2.5 rounded-xl transition-all border shrink-0", isDark ? "bg-white/5 hover:bg-white/10 text-white border-white/10" : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200")}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex flex-col sm:flex-row md:items-end justify-between gap-6 mb-6">
        <div>
          <h1 className={cn("text-3xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Blog Categories</h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Manage your article categories.</p>
        </div>
      </div>
      </motion.div>

      {/* Add New Category */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className={cn("glass-card rounded-2xl p-6 border", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}
      >
        <h2 className={cn("text-lg font-bold mb-4 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}><Tag className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-700")} /> Add New Category</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setNewSlug(generateSlug(e.target.value));
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Category Name"
            className={cn("flex-1 px-4 py-3 border rounded-xl focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-zinc-500", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
          />
          <input
            type="text"
            value={newSlug}
            onChange={(e) => setNewSlug(generateSlug(e.target.value))}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Custom Slug (optional)"
            className={cn("flex-1 px-4 py-3 border rounded-xl focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-zinc-500", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
          />
          <button
            onClick={handleCreate}
            className="flex items-center justify-center gap-2 px-5 py-2.5 font-semibold text-sm rounded-lg bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm transition-all w-full sm:w-auto"
          >
            <Plus className="w-5 h-5" /> Add
          </button>
        </div>
      </motion.div>

      {/* Categories List */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className={cn("glass-card rounded-2xl border overflow-hidden", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}
      >
        {categories.length === 0 ? (
          <div className="p-16 text-center">
            <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border", isDark ? "border-white/10" : "border-slate-200")}>
              <Tag className="w-8 h-8 text-zinc-500" />
            </div>
            <h2 className={cn("font-bold mb-1", isDark ? "text-white" : "text-slate-900")}>No Categories</h2>
            <p className="text-zinc-500 text-sm">Create your first category using the form above.</p>
          </div>
        ) : (
          <div className={cn("divide-y", isDark ? "divide-white/5" : "divide-slate-200")}>
            {categories.map((cat, index) => (
              <motion.div 
                key={cat.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className={cn("flex items-center justify-between p-4 sm:px-6 transition-colors group", isDark ? "hover:bg-white/[0.03]" : "hover:bg-slate-50")}
              >
                {editingId === cat.id ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => {
                        setEditingName(e.target.value);
                        setEditingSlug(generateSlug(e.target.value));
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdate(cat.id)}
                      autoFocus
                      placeholder="Name"
                      className={cn("flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:border-cyan-400 transition-colors", isDark ? "bg-[#0A0B1A] border-cyan-500/50 text-white" : "bg-white border-slate-300 text-slate-900")}
                    />
                    <input
                      type="text"
                      value={editingSlug}
                      onChange={(e) => setEditingSlug(generateSlug(e.target.value))}
                      onKeyDown={(e) => e.key === 'Enter' && handleUpdate(cat.id)}
                      placeholder="Slug"
                      className={cn("flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:border-cyan-400 transition-colors", isDark ? "bg-[#0A0B1A] border-cyan-500/50 text-white" : "bg-white border-slate-300 text-slate-900")}
                    />
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button onClick={() => handleUpdate(cat.id)} className={cn("p-2.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 transition-colors flex-1 sm:flex-none flex justify-center", isDark ? "text-cyan-400" : "text-cyan-700")}>
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className={cn("p-2.5 rounded-lg transition-colors flex-1 sm:flex-none flex justify-center", isDark ? "text-zinc-400 hover:bg-white/10" : "text-slate-500 hover:bg-slate-100")}>
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4 flex-1 min-w-0 mr-4">
                      <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 group-hover:border-cyan-500/30 transition-colors", isDark ? "border-white/10" : "border-slate-200")}>
                        <Tag className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-700")} />
                      </div>
                      <div className="min-w-0">
                        <span className={cn("font-bold block truncate transition-colors", isDark ? "text-white group-hover:text-cyan-400" : "text-slate-900 group-hover:text-cyan-700")}>{cat.name}</span>
                        <span className="text-xs text-zinc-500 block truncate">/{cat.slug}</span>
                      </div>
                      <span className={cn("hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border ml-auto mr-4 whitespace-nowrap", isDark ? "border-white/10 text-zinc-400" : "border-slate-200 text-slate-500")}>
                        {cat._count.posts} articles
                      </span>
                    </div>
                    <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button 
                        onClick={() => { setEditingId(cat.id); setEditingName(cat.name || ""); setEditingSlug(cat.slug || ""); }}
                        className={cn("p-2 rounded-lg border border-transparent transition-all", isDark ? "text-zinc-400 hover:border-white/10 hover:text-white hover:bg-white/10" : "text-slate-500 hover:border-slate-200 hover:text-slate-900 hover:bg-slate-100")}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setDeleteId(cat.id)}
                        className={cn("p-2 rounded-lg border border-transparent transition-all", isDark ? "bg-red-500/10 hover:border-red-500/20 hover:text-red-400 hover:bg-red-500/20 text-red-400" : "bg-red-50 hover:bg-red-500 hover:text-white text-red-700")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Category?"
        description="This category will be permanently deleted. Categories that still have articles cannot be deleted."
        confirmText="Delete"
        isLoading={deleting}
        variant="danger"
      />
    </div>
  );
}
