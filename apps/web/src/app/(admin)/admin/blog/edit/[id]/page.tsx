"use client";
import { cn } from "@/lib/utils";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { Code2, AlertTriangle, ImagePlus, Eye, EyeOff, Plus, ImageIcon, X, ArrowLeft, Save, Send, Trash2, Bold, Italic, List, ListOrdered, Table, Link2, Type, Check , RefreshCw , FileText } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import Link from "next/link";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import MediaLibrary from "@/components/admin/MediaLibrary";
import { CodeBlock } from "@/components/ui/CodeBlock";
import Editor from "@/components/admin/Editor";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Select } from "@/components/ui/Select";

export default function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const resolvedParams = use(params);
  const router = useRouter();
  const isNew = resolvedParams.id === 'new';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [categories, setCategories] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tags, setTags] = useState<any[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [preview, setPreview] = useState(false);
  
  // Media Library State
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [mediaLibraryMode, setMediaLibraryMode] = useState<'featured' | 'insert'>('insert');
  const [mediaCallback, setMediaCallback] = useState<((url: string) => void) | null>(null);
  const [showLinkPrompt, setShowLinkPrompt] = useState(false);
  const [linkData, setLinkData] = useState({ url: "" });
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    categoryName: "",
    published: false,
    image: ""
  });

  const [deleteTarget, setDeleteTarget] = useState<{ type: 'category' | 'tag', id: number } | null>(null);
  const [isDeletingTarget, setIsDeletingTarget] = useState(false);

  // Fetch categories and tags
  useEffect(() => {
    fetch('/api/admin/blog/categories')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setCategories(data);
      })
      .catch(console.error);
      
    fetch('/api/admin/blog/tags')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setTags(data);
      })
      .catch(console.error);
  }, []);

  // Fetch article data if editing
  useEffect(() => {
    if (!isNew) {
      fetch(`/api/admin/blog/${resolvedParams.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            toast.error(data.error);
            router.push('/admin/blog');
            return;
          }
          setFormData({
            title: data.title,
            slug: data.slug || "",
            excerpt: data.excerpt,
            content: data.content,
            categoryName: data.category?.name || "",
            published: data.published,
            image: data.image || ""
          });
          if (data.tags) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setSelectedTags(data.tags.map((t: any) => t.id));
          }
          setLoading(false);
        })
        .catch(() => {
          toast.error("Failed to load article");
          setLoading(false);
        });
    }
  }, [resolvedParams.id, isNew, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => {
        const newData = { ...prev, [name]: value };
        if (name === 'title') {
          const generatedFromOld = prev.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
          if (!prev.slug || prev.slug === generatedFromOld) {
            newData.slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
          }
        }
        return newData;
      });
    }
  };

  const handleMediaSelect = (url: string) => {
    if (mediaLibraryMode === 'insert' && mediaCallback) {
      mediaCallback(url);
      setMediaCallback(null);
    } else {
      setFormData(prev => ({ ...prev, image: url }));
    }
    setShowMediaLibrary(false);
  };

  // We no longer need manual insertAtCursor because RichBlockEditor handles it natively.
  // We keep handleMediaSelect for the featured image.

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Category name is required");
      return;
    }
    try {
      const res = await fetch('/api/admin/blog/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Category created!");
        setCategories(prev => [...prev, { ...data, _count: { posts: 0 } }]);
        setFormData(prev => ({ ...prev, categoryName: newCategoryName.trim() }));
        setNewCategoryName("");
        setShowNewCategory(false);
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error("Something went wrong");
    }
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) {
      toast.error("Tag name is required");
      return;
    }
    try {
      const res = await fetch('/api/admin/blog/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Tag created!");
        setTags(prev => [...prev, { ...data, _count: { posts: 0 } }]);
        setSelectedTags(prev => [...prev, data.id]);
        setNewTagName("");
        setShowNewTag(false);
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error("Something went wrong");
    }
  };

  const confirmDeleteTarget = async () => {
    if (!deleteTarget) return;
    setIsDeletingTarget(true);
    try {
      if (deleteTarget.type === 'category') {
        const res = await fetch(`/api/admin/blog/categories/${deleteTarget.id}`, { method: 'DELETE' });
        if (res.ok) {
          setCategories(prev => prev.filter(c => c.id !== deleteTarget.id));
          if (formData.categoryName === categories.find(c => c.id === deleteTarget.id)?.name) {
            setFormData(prev => ({ ...prev, categoryName: "" }));
          }
          toast.success("Category deleted");
        } else toast.error("Failed to delete category");
      } else {
        const res = await fetch(`/api/admin/blog/tags/${deleteTarget.id}`, { method: 'DELETE' });
        if (res.ok) {
          setTags(prev => prev.filter(t => t.id !== deleteTarget.id));
          setSelectedTags(prev => prev.filter(t => t !== deleteTarget.id));
          toast.success("Tag deleted");
        } else toast.error("Failed to delete tag");
      }
    } catch {
      toast.error(`Failed to delete ${deleteTarget.type}`);
    } finally {
      setIsDeletingTarget(false);
      setDeleteTarget(null);
    }
  };

  const handleSave = async (publish: boolean) => {
    if (!formData.title || !formData.content) {
      toast.error("Title and Content are required");
      return;
    }
    
    setSaving(true);
    try {
      const url = isNew ? '/api/admin/blog' : `/api/admin/blog/${resolvedParams.id}`;
      const method = isNew ? 'POST' : 'PUT';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, published: publish, tags: selectedTags })
      });
      
      if (res.ok) {
        toast.success(publish ? "Article published!" : "Draft saved!");
        if (isNew) {
           const data = await res.json();
           router.replace(`/admin/blog/edit/${data.id}`);
        } else {
           router.refresh();
        }
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to save article");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-[60vh] w-full flex items-center justify-center">
      <RefreshCw className={cn("w-10 h-10 animate-spin", isDark ? "text-cyan-500" : "text-cyan-700")} />
    </div>
  );

  return (
    <div className="space-y-6 w-full relative z-10 pb-28 md:pb-32">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/blog" className={cn("p-2.5 rounded-xl transition-all border shrink-0", isDark ? "bg-white/5 hover:bg-white/10 text-white border-white/10" : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200")}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex flex-col sm:flex-row md:items-end justify-between gap-6 mb-6">
        <div>
          <h1 className={cn("text-3xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>{isNew ? 'Create New Article' : 'Edit Article'}</h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Write and publish your thoughts.</p>
        </div>
      </div>
        </div>
      </motion.div>

      {/* Floating Action Bar for Save/Publish */}
      <motion.div 
        drag
        dragMomentum={false}
        initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className={cn("fixed bottom-[76px] left-4 right-4 md:left-auto md:bottom-[96px] md:right-6 lg:bottom-[112px] lg:right-10 z-50 flex items-center justify-between md:justify-end gap-3 p-3 backdrop-blur-sm border rounded-2xl cursor-grab active:cursor-grabbing", isDark ? "bg-[#0a0e12]/90 border-white/10" : "bg-white/90 border-slate-200")}
      >
        <button
          onClick={() => handleSave(false)}
          disabled={saving}
          className={cn("flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 font-medium text-sm rounded-lg transition-all border disabled:opacity-50 whitespace-nowrap", isDark ? "text-slate-200 border-white/10 hover:bg-white/10" : "text-slate-700 border-slate-200 hover:bg-slate-100")}
        >
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Draft"}
        </button>
        <button
          onClick={() => handleSave(true)}
          disabled={saving}
          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 font-semibold text-sm rounded-lg bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm transition-all disabled:opacity-50 whitespace-nowrap"
        >
          <Send className="w-4 h-4" /> {saving ? "Publishing..." : "Publish"}
        </button>
      </motion.div>

      {/* Editor Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className={cn("glass-card rounded-2xl p-4 sm:p-6 md:p-8 space-y-8 border min-w-0 max-w-full", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}
      >
        {/* Featured Image */}
        <div className="space-y-3">
          <label className={cn("text-xs font-bold uppercase tracking-widest flex items-center gap-2", isDark ? "text-zinc-400" : "text-slate-500")}><ImageIcon className="w-4 h-4" /> Featured Image</label>
          {formData.image ? (
            <div className={cn("relative aspect-[21/9] w-full rounded-2xl overflow-hidden border group bg-black/40", isDark ? "border-white/10" : "border-slate-200")}>
              <img referrerPolicy="no-referrer" src={formData.image} alt="Featured" className="w-full h-full object-cover" loading="lazy" decoding="async" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                <button 
                  onClick={() => { setMediaLibraryMode('featured'); setShowMediaLibrary(true); }}
                  className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-xl transition-all"
                >
                  Change Image
                </button>
                <button 
                  onClick={() => setFormData(prev => ({ ...prev, image: "" }))}
                  className={cn("px-5 py-2.5 bg-red-500/20 hover:bg-red-500/40 font-bold rounded-xl transition-all", isDark ? "text-red-400" : "text-red-700")}
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setMediaLibraryMode('featured'); setShowMediaLibrary(true); }}
              className={cn("w-full aspect-[21/9] rounded-2xl border-2 border-dashed hover:border-cyan-500/50 hover:bg-cyan-500/5 flex flex-col items-center justify-center gap-4 hover:text-cyan-400 transition-all group", isDark ? "border-white/10 bg-white/[0.02] text-zinc-400" : "border-slate-200 bg-white text-slate-500")}
            >
              <div className={cn("w-14 h-14 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform border", isDark ? "border-white/10" : "border-slate-200")}>
                <ImagePlus className="w-6 h-6" />
              </div>
              <span className="font-bold text-sm">Upload or Select Featured Image</span>
            </button>
          )}
        </div>

        {/* Title & Slug */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className={cn("text-xs font-bold uppercase tracking-widest flex items-center gap-2", isDark ? "text-zinc-400" : "text-slate-500")}><Type className="w-4 h-4" /> Article Title</label>
            <input 
              type="text" 
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Next.js 14 Server Actions Guide" 
              className={cn("w-full px-5 py-3.5 border rounded-xl text-lg font-bold focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-zinc-500 placeholder:font-medium", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")} 
            />
          </div>
          <div className="space-y-3">
            <label className={cn("text-xs font-bold uppercase tracking-widest flex items-center gap-2", isDark ? "text-zinc-400" : "text-slate-500")}><Link2 className="w-4 h-4" /> Permalink / Slug</label>
            <div className={cn("flex items-center px-5 py-3.5 border rounded-xl transition-all focus-within:border-cyan-500/50 focus-within:bg-white/10", isDark ? "border-white/10" : "border-slate-200")}>
              <span className="text-zinc-500 mr-1 whitespace-nowrap overflow-hidden font-medium">/blog/</span>
              <input 
                type="text" 
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                placeholder="auto-generated-from-title" 
                className={cn("w-full bg-transparent font-medium focus:outline-none placeholder:text-zinc-600", isDark ? "text-white" : "text-slate-900")} 
              />
            </div>
          </div>
        </div>

        {/* Category & Read Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className={cn("text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Category</label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Select
                  value={formData.categoryName}
                  onChange={(val) => setFormData(prev => ({ ...prev, categoryName: val }))}
                  options={[
                    { value: "", label: "Select Category..." },
                    ...categories.map(cat => ({ value: cat.name, label: cat.name }))
                  ]}
                  placeholder="Select Category..."
                  className={cn("w-full rounded-xl px-5 py-3 text-sm", isDark ? "border-white/10" : "border-slate-200")}
                />
              </div>
              {formData.categoryName && (
                <button
                  onClick={() => {
                    const cat = categories.find(c => c.name === formData.categoryName);
                    if (cat) setDeleteTarget({ type: 'category', id: cat.id });
                  }}
                  className={cn("p-3.5 bg-red-500/10 rounded-xl border border-red-500/20 hover:bg-red-500/20 transition-all", isDark ? "text-red-400" : "text-red-700")}
                  title="Delete this category"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => setShowNewCategory(!showNewCategory)}
                className={cn("p-3.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20 hover:bg-cyan-500/20 transition-all", isDark ? "text-cyan-400" : "text-cyan-700")}
                title="Add new category"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            {showNewCategory && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                  placeholder="New category name..."
                  className={cn("flex-1 px-4 py-2.5 bg-black/40 border border-cyan-500/20 rounded-xl focus:outline-none focus:border-cyan-500 transition-all text-sm", isDark ? "text-white" : "text-slate-900")}
                  autoFocus
                />
                <button onClick={handleAddCategory} className={cn("px-4 py-2.5 bg-cyan-500 font-bold rounded-xl text-sm hover:bg-cyan-400 transition-colors", isDark ? "text-white" : "text-slate-900")}>
                  Add
                </button>
              </motion.div>
            )}
          </div>
          
          <div className="space-y-2">
            <label className={cn("text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Tags</label>
            <div className="flex flex-col gap-2">
              <div className={cn("flex flex-wrap gap-2 p-2 pr-12 min-h-[52px] max-h-32 overflow-y-auto bg-black/40 border rounded-xl focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500/50 transition-all relative", isDark ? "bg-[#0A0B1A]/50 border-white/5 text-white" : "bg-white border-slate-200 text-slate-900")}>
                {tags.map(tag => (
                  <div
                    key={tag.id}
                    className={`flex items-center gap-1 pl-3 pr-1 py-1 text-sm rounded-lg transition-colors border cursor-pointer ${
                      selectedTags.includes(tag.id) 
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' 
                        : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                    onClick={() => {
                      setSelectedTags(prev => 
                        prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
                      );
                    }}
                  >
                    <span>{tag.name}</span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({ type: 'tag', id: tag.id });
                      }}
                      className={cn("p-1 hover:bg-red-500/20 hover: rounded-md transition-colors ml-1", isDark ? "text-red-400" : "text-red-700")}
                      title="Delete tag"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {tags.length === 0 && <span className="text-sm text-zinc-500 py-1.5 px-2">No tags available.</span>}
                
                <button
                  onClick={() => setShowNewTag(!showNewTag)}
                  className={cn("absolute right-2 top-2 p-1.5 bg-cyan-500/10 rounded-lg hover:bg-cyan-500/20 transition-all", isDark ? "text-cyan-400" : "text-cyan-700")}
                  title="Create new tag"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              {showNewTag && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex gap-2">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    placeholder="New tag name..."
                    className={cn("flex-1 px-4 py-2.5 bg-black/40 border border-cyan-500/20 rounded-xl focus:outline-none focus:border-cyan-500 transition-all text-sm", isDark ? "text-white" : "text-slate-900")}
                    autoFocus
                  />
                  <button onClick={handleAddTag} className={cn("px-4 py-2.5 bg-cyan-500 font-bold rounded-xl text-sm hover:bg-cyan-400 transition-colors", isDark ? "text-white" : "text-slate-900")}>
                    Add
                  </button>
                </motion.div>
              )}
            </div>
          </div>


        </div>

        {/* Excerpt */}
        <div className="space-y-2">
          <label className={cn("text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Excerpt (Short Description)</label>
          <textarea 
            name="excerpt"
            value={formData.excerpt}
            onChange={handleChange}
            rows={2}
            placeholder="A brief summary of what this article is about..." 
            className={cn("w-full px-5 py-3.5 bg-black/40 border rounded-xl focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all resize-none", isDark ? "bg-[#0A0B1A]/50 border-white/5 text-white" : "bg-white border-slate-200 text-slate-900")} 
          />
        </div>

        {/* Content Editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className={cn("text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Content (Markdown)</label>
            <button
              onClick={() => setPreview(!preview)}
              className={cn("flex items-center gap-1.5 text-xs font-medium hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10", isDark ? "text-zinc-400" : "text-slate-500")}
            >
              {preview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {preview ? "Edit" : "Preview"}
            </button>
          </div>

          {preview ? (
            <div className={cn("bg-black/40 border rounded-xl p-5", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
              <MarkdownPreview content={formData.content} />
            </div>
          ) : (
            <div className="mt-4">
               <Editor 
                  markdown={formData.content} 
                  onChange={(content) => setFormData(prev => ({ ...prev, content }))} 
                  onOpenMedia={(onSelect) => {
                     setMediaLibraryMode('insert');
                     setMediaCallback(() => onSelect);
                     setShowMediaLibrary(true);
                  }}
               />
            </div>
          )}
        </div>

        {/* Status indicator */}
        {!isNew && (
          <div className="flex items-center gap-2 pt-2 text-sm">
            <span className={"w-2 h-2 rounded-full " + (formData.published ? 'bg-cyan-500' : 'bg-yellow-500')} />
            <span className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>Status: <span className={cn("font-medium", isDark ? "text-white" : "text-slate-900")}>{formData.published ? 'Published' : 'Draft'}</span></span>
          </div>
        )}
      </motion.div>

      <MediaLibrary 
        isOpen={showMediaLibrary} 
        onClose={() => setShowMediaLibrary(false)} 
        onSelect={handleMediaSelect} 
      />

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteTarget}
        title={`Delete ${deleteTarget?.type === 'category' ? 'Category' : 'Tag'}?`}
        description={`Are you sure you want to permanently delete this ${deleteTarget?.type === 'category' ? 'category' : 'tag'}?`}
        confirmText="Delete"
        isLoading={isDeletingTarget}
        variant="danger"
      />
    </div>
  );
}

// Simple markdown renderer for preview
function renderMarkdown(md: string): string {
  const html = md
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Important alerts
    .replace(/&gt; \[!IMPORTANT\]\n&gt; (.*)/g, '<div class="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 my-3 text-yellow-300"><strong>⚠️ Important:</strong> $1</div>')
    // Images
    .replace(/!\[(.*?)\]\((.*?)\)/g, '<img referrerPolicy="no-referrer" src="$2" alt="$1" class="rounded-lg my-3 max-w-full border border-white/10" loading="lazy" decoding="async" />')
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-cyan-500 font-bold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-cyan-500 font-bold mt-6 mb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-cyan-500 font-bold mt-6 mb-3">$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-cyan-500 font-bold">$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-white/5 px-1.5 py-0.5 rounded text-cyan-400 text-sm">$1</code>')
    // YouTube links (matches raw, <link>, or [link](link))
    .replace(/^(?:<)?(?:\[.*?\]\()?https?:\/\/(?:www\.youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)[^\s>)]*(?:\))?(?:>)?$/gm, '<div class="w-full aspect-video my-8 rounded-xl overflow-hidden border border-white/10"><iframe width="100%" height="100%" src="https://www.youtube.com/embed/$1" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>')
    // Links
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-cyan-400 underline">$1</a>')
    // Line breaks
    .replace(/\n/g, '<br />');

  return html;
}

function MarkdownPreview({ content }: { content: string }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const parts = content.split(/```/);

  return (
    <div className={cn("w-full min-h-[400px] px-5 py-4 bg-black/40 border rounded-b-xl prose prose-invert prose-sm max-w-none overflow-y-auto font-sans", isDark ? "bg-[#0A0B1A]/50 border-white/5 text-zinc-300" : "bg-white border-slate-200 text-slate-600")}>
      {parts.map((part, index) => {
        if (index % 2 === 1) {
          // This is a code block
          const match = part.match(/^([^\n]*)\n([\s\S]*)$/);
          const langOrTitle = match ? match[1].trim() : '';
          const code = match ? match[2] : part;
          
          // Determine language and title
          let language = 'bash';
          const title = langOrTitle;
          
          if (langOrTitle) {
            const lower = langOrTitle.toLowerCase();
            if (lower.includes('php') || lower.includes('laravel')) language = 'php';
            else if (lower.includes('js') || lower.includes('jsx')) language = 'javascript';
            else if (lower.includes('ts') || lower.includes('tsx')) language = 'typescript';
            else if (lower.includes('yaml') || lower.includes('yml')) language = 'yaml';
            else if (lower.includes('html')) language = 'html';
            else if (lower.includes('css')) language = 'css';
            else if (lower.includes('json')) language = 'json';
            else if (lower.includes('sh') || lower.includes('bash')) language = 'bash';
            else language = lower; // fallback
          }

          return (
            <div key={index} className="not-prose my-6">
              <CodeBlock 
                code={code.trim()} 
                language={language} 
                title={title || language} 
              />
            </div>
          );
        } else {
          // This is normal markdown
          return (
            <div 
              key={index} 
              dangerouslySetInnerHTML={{ __html: renderMarkdown(part) }} 
            />
          );
        }
      })}
    </div>
  );
}
