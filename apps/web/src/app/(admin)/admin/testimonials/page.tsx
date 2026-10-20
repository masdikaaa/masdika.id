"use client";
import { useUrlString } from "@/lib/useUrlTab";
import { cn } from "@/lib/utils";

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Search, CheckCircle, X, Pencil, Check, Loader2, Image as ImageIcon, LayoutDashboard, RefreshCw, MessageSquare, Star, UserCheck } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { motion, AnimatePresence } from "framer-motion";
import { AdminLoader } from "@/components/admin/AdminLoader";

export default function AdminTestimonialsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useUrlString<string>("search", "");

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk actions
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Add/Edit modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: "", role: "", text: "", image: "", rating: 5, order: 0 });
  const [editId, setEditId] = useState<number | null>(null);

  // Profile Image Image States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showDeleteImageModal, setShowDeleteImageModal] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const toastId = toast.loading('Uploading image...');

    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('folder', 'testimonials');

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: uploadData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        toast.success('Image uploaded', { id: toastId });
        setFormData({ ...formData, image: data.url });
      } else {
        toast.error(data.error || 'Failed to upload image', { id: toastId });
      }
    } catch (err) {
      toast.error('An error occurred during upload', { id: toastId });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteImage = () => {
    setFormData({ ...formData, image: "" });
    setShowDeleteImageModal(false);
    toast.success("Image removed (Remember to update to save changes)");
  };

  const fetchTestimonials = async () => {
    try {
      const res = await fetch('/api/admin/testimonials');
      const data = await res.json();
      if (!data.error) {
        setTestimonials(data);
      }
    } catch (err) {
      toast.error("Failed to load testimonials");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/testimonials/${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("Testimonial deleted");
        fetchTestimonials();
      } else {
        toast.error("Failed to delete testimonial");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeletingAll(true);
    try {
      const res = await fetch('/api/admin/testimonials', { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });
      if (res.ok) {
        toast.success(`${selectedIds.length} testimonials deleted`);
        fetchTestimonials();
        setSelectedIds([]);
      } else {
        toast.error("Failed to delete testimonials");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setIsDeletingAll(false);
      setShowDeleteAllModal(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredTestimonials.length && filteredTestimonials.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTestimonials.map(c => c.id));
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editId ? `/api/admin/testimonials/${editId}` : '/api/admin/testimonials';
      const method = editId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        toast.success(editId ? "Testimonial updated" : "Testimonial added");
        setShowAddModal(false);
        setFormData({ name: "", role: "", text: "", image: "", rating: 5, order: 0 });
        setEditId(null);
        fetchTestimonials();
      } else {
        toast.error(editId ? "Failed to update testimonial" : "Failed to add testimonial");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (testimonial: any) => {
    setEditId(testimonial.id);
    setFormData({
      name: testimonial.name,
      role: testimonial.role,
      text: testimonial.text,
      image: testimonial.image || "",
      rating: testimonial.rating,
      order: testimonial.order
    });
    setShowAddModal(true);
  };

  const openAddModal = () => {
    setEditId(null);
    setFormData({ name: "", role: "", text: "", image: "", rating: 5, order: 0 });
    setShowAddModal(true);
  };

  const filteredTestimonials = testimonials.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.role.toLowerCase().includes(search.toLowerCase()) ||
    t.text.toLowerCase().includes(search.toLowerCase())
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="w-full space-y-6 md:space-y-8 pb-10 relative z-10">
      {/* Top Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row md:items-end justify-between gap-6 mb-2">
        <div>
          <h1 className={cn("text-2xl md:text-3xl font-extrabold mb-1 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Testimonials Management</h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Manage verified client reviews, star ratings, and feedback display.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn("px-4 py-2 rounded-lg font-medium text-sm border", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
            Total Testimonials: {testimonials.length}
          </div>
          <button
            onClick={() => { setLoading(true); fetchTestimonials(); }}
            className={cn("px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border", isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700")}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button onClick={openAddModal} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm transition-all">
            <Plus className="w-4 h-4" /> Add Testimonial
          </button>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Total Reviews</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            {testimonials.length}
          </div>
          <div className={cn("mt-2 text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-700")}>
            Verified client reviews
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>5-Star Reviews</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
              <Star className="w-4 h-4" />
            </div>
          </div>
          <div className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            {testimonials.filter(t => t.rating === 5).length}
          </div>
          <div className={cn("mt-2 text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-700")}>
            {testimonials.length > 0 ? Math.round((testimonials.filter(t => t.rating === 5).length / testimonials.length) * 100) : 0}% top ratings
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Average Score</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
              <Star className="w-4 h-4" />
            </div>
          </div>
          <div className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            {testimonials.length > 0 ? (testimonials.reduce((acc, t) => acc + (t.rating || 5), 0) / testimonials.length).toFixed(1) : "5.0"} <span className="text-sm font-normal text-zinc-500">/ 5.0</span>
          </div>
          <div className={cn("mt-2 text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-700")}>
            Platform satisfaction
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Verified Clients</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            {testimonials.filter(t => !!t.image).length}
          </div>
          <div className={cn("mt-2 text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-700")}>
            With profile avatar
          </div>
        </div>
      </div>

      {/* GAMBAR 1 Filter Bar */}
      <div className={cn("p-4 rounded-2xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-4", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user, role, or review text..." 
            className={cn("w-full pl-9 pr-4 py-2 text-xs md:text-sm border rounded-xl focus:outline-none focus:border-cyan-500 transition-colors", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
          />
        </div>
        <div className="flex items-center gap-3 self-end md:self-auto">
          {filteredTestimonials.length > 0 && (
            <button 
              onClick={toggleSelectAll}
              className={cn("flex items-center gap-2 px-3.5 py-2 font-bold text-xs rounded-xl transition-all border whitespace-nowrap", isDark ? "text-white border-slate-800 bg-[#060b14] hover:bg-slate-800/60" : "text-slate-900 border-slate-200 bg-white hover:bg-slate-50")}
            >
              <div className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${selectedIds.length === filteredTestimonials.length && filteredTestimonials.length > 0 ? 'bg-cyan-500 border-cyan-500 text-slate-950' : isDark ? "border-slate-700 bg-[#060b14]" : "border-slate-300 bg-white"}`}>
                {selectedIds.length === filteredTestimonials.length && filteredTestimonials.length > 0 && <Check className="w-3 h-3 text-slate-950 stroke-[3]" />}
              </div>
              <span>{selectedIds.length === filteredTestimonials.length && filteredTestimonials.length > 0 ? 'Deselect All' : 'Select All'}</span>
            </button>
          )}
          {selectedIds.length > 0 && (
            <button 
              onClick={() => setShowDeleteAllModal(true)}
              className={cn("flex items-center gap-2 px-3.5 py-2 font-bold text-xs rounded-xl transition-all border whitespace-nowrap", isDark ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20" : "bg-red-50 hover:bg-red-100 text-red-700 border-red-200")}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete ({selectedIds.length})</span>
            </button>
          )}
        </div>
      </div>

      <motion.div variants={itemVariants} className={cn("rounded-2xl border overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className="overflow-x-auto">
          <table className={cn("w-full text-left text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
            <thead className={cn("text-xs uppercase border-b tracking-wider font-semibold", isDark ? "bg-[#060b14] text-slate-400 border-slate-800" : "bg-slate-50 text-slate-500 border-slate-200")}>
              <tr>
                <th className="px-6 py-4 font-semibold w-12 whitespace-nowrap">
                  <button onClick={toggleSelectAll} className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${selectedIds.length === filteredTestimonials.length && filteredTestimonials.length > 0 ? 'bg-cyan-500 border-cyan-500 text-slate-950' : isDark ? "border-slate-700 hover:border-cyan-400 bg-[#060b14]" : "bg-slate-100 border-slate-200 hover:border-cyan-600"}`}>
                    {selectedIds.length === filteredTestimonials.length && filteredTestimonials.length > 0 && <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />}
                  </button>
                </th>
                <th className="px-6 py-4 font-bold whitespace-nowrap">Name</th>
                <th className="px-6 py-4 font-bold whitespace-nowrap">Role</th>
                <th className="px-6 py-4 font-bold whitespace-nowrap">Text</th>
                <th className="px-6 py-4 font-bold whitespace-nowrap">Rating</th>
                <th className="px-6 py-4 font-bold whitespace-nowrap">Date Added</th>
                <th className="px-6 py-4 font-bold text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDark ? "divide-slate-800/80" : "divide-slate-200")}>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <AdminLoader className="min-h-[200px]" />
                  </td>
                </tr>
              ) : filteredTestimonials.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-4 border", isDark ? "border-white/10" : "border-slate-200")}>
                        <CheckCircle className="w-8 h-8 text-zinc-500" />
                      </div>
                      <h3 className={cn("font-bold mb-1", isDark ? "text-white" : "text-slate-900")}>No testimonials found</h3>
                      <p className="text-zinc-500 text-sm max-w-sm">No testimonials match your criteria.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTestimonials.map((t) => (
                  <tr key={t.id} className={cn("transition-colors group", selectedIds.includes(t.id) ? (isDark ? "bg-cyan-500/10" : "bg-cyan-50/60") : (isDark ? "hover:bg-white/5" : "hover:bg-slate-50/80"))}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button onClick={() => toggleSelect(t.id)} className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${selectedIds.includes(t.id) ? 'bg-cyan-500 border-cyan-500 text-slate-950' : isDark ? "bg-[#060b14] border-slate-700 hover:border-cyan-400" : "bg-white border-slate-300 hover:border-cyan-600"}`}>
                        {selectedIds.includes(t.id) && <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />}
                      </button>
                    </td>
                    <td className={cn("px-6 py-4 font-bold group-hover:text-cyan-400 transition-colors whitespace-nowrap flex items-center gap-3", isDark ? "text-white" : "text-slate-900")}>
                      {t.image ? (
                        <div className={cn("w-8 h-8 rounded-full overflow-hidden border flex-shrink-0", isDark ? "border-slate-800" : "border-slate-200")}>
                          <img referrerPolicy="no-referrer" src={t.image} alt={t.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                        </div>
                      ) : (
                        <div className={cn("w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                          <span className={cn("text-xs font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>{t.name.substring(0,2).toUpperCase()}</span>
                        </div>
                      )}
                      {t.name}
                    </td>
                    <td className="px-6 py-4 font-medium whitespace-nowrap">{t.role}</td>
                    <td className="px-6 py-4">
                       <span className="truncate block max-w-xs">{t.text}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn("inline-flex items-center gap-1.5 bg-yellow-400/10 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border border-yellow-400/20", isDark ? "text-yellow-400" : "text-yellow-700")}>
                        {t.rating} / 5
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium whitespace-nowrap">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEditModal(t)} className={cn("p-2 rounded-lg transition-colors border border-transparent", isDark ? "bg-cyan-500/10 hover:bg-cyan-500 hover:text-white text-cyan-400" : "bg-cyan-50 hover:bg-cyan-500 hover:text-white text-cyan-700")} title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteId(t.id)} className={cn("p-2 rounded-lg transition-colors border border-transparent", isDark ? "bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400" : "bg-red-50 hover:bg-red-500 hover:text-white text-red-700")} title="Delete">
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
      </motion.div>

      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Testimonial"
        description="Are you sure you want to delete this testimonial? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />

      <ConfirmModal 
        isOpen={showDeleteAllModal}
        onClose={() => setShowDeleteAllModal(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Testimonials"
        description={`Are you sure you want to delete ${selectedIds.length} testimonials? This action cannot be undone.`}
        confirmText="Delete All"
        variant="danger"
        isLoading={isDeletingAll}
      />

      <ConfirmModal 
        isOpen={showDeleteImageModal}
        onClose={() => setShowDeleteImageModal(false)}
        onConfirm={handleDeleteImage}
        title="Remove Profile Image"
        description="Are you sure you want to remove the profile image from this testimonial? The image will be deleted from storage if you save the form."
        confirmText="Remove"
        variant="danger"
      />

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn("border rounded-2xl p-6 md:p-8 w-full max-w-lg relative shadow-2xl", isDark ? "bg-[#0b1322] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900")}
            >
              <button
                onClick={() => setShowAddModal(false)}
                className={cn("absolute top-4 right-4 p-2 rounded-full transition-colors", isDark ? "text-zinc-400 hover:text-white hover:bg-slate-800" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100")}
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className={cn("text-2xl font-extrabold mb-6 border-b pb-4", isDark ? "text-white border-slate-800" : "text-slate-900 border-slate-200")}>{editId ? "Edit Testimonial" : "Add Testimonial"}</h2>

              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div className="space-y-3">
                  <label className={cn("text-xs font-bold uppercase tracking-widest block", isDark ? "text-zinc-400" : "text-slate-500")}>Client Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={cn("w-full px-5 py-3.5 border rounded-xl font-bold focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
                  />
                </div>
                <div className="space-y-3">
                  <label className={cn("text-xs font-bold uppercase tracking-widest block", isDark ? "text-zinc-400" : "text-slate-500")}>Profile Image</label>
                  
                  <div className="flex flex-col gap-3">
                    {/* Display existing image or placeholder */}
                    <div className="flex items-center gap-4">
                       <div className={cn("w-16 h-16 rounded-full border bg-black/40 overflow-hidden flex items-center justify-center shrink-0", isDark ? "border-slate-800" : "border-slate-200")}>
                         {formData.image ? (
                           <img referrerPolicy="no-referrer" src={formData.image} alt="Profile" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                         ) : (
                           <ImageIcon className="w-6 h-6 text-zinc-500" />
                         )}
                       </div>
                       <div className="flex-1 flex gap-2">
                         <button 
                           type="button"
                           onClick={() => fileInputRef.current?.click()}
                           disabled={uploadingImage}
                           className={cn("flex-1 border text-sm font-medium py-2 px-3 rounded-xl transition-colors", isDark ? "bg-[#060b14] hover:bg-slate-800 border-slate-800 text-white" : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-900")}
                         >
                           {uploadingImage ? 'Uploading...' : 'Upload File'}
                         </button>
                         {formData.image && (
                           <button 
                             type="button"
                             onClick={() => setShowDeleteImageModal(true)}
                             className={cn("p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-colors", isDark ? "text-red-400" : "text-red-700")}
                             title="Remove Image"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                         )}
                       </div>
                    </div>
                    
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden"
                    />

                    {/* Or use external URL */}
                    <input
                      type="text"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      placeholder="Or enter image URL here..."
                      className={cn("w-full px-4 py-2.5 border rounded-xl font-medium focus:outline-none focus:border-cyan-500 transition-all text-sm", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className={cn("text-xs font-bold uppercase tracking-widest block", isDark ? "text-zinc-400" : "text-slate-500")}>Role / Company *</label>
                  <input
                    type="text"
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className={cn("w-full px-5 py-3.5 border rounded-xl font-medium focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
                  />
                </div>
                <div className="space-y-3">
                  <label className={cn("text-xs font-bold uppercase tracking-widest block", isDark ? "text-zinc-400" : "text-slate-500")}>Testimonial Text *</label>
                  <textarea
                    required
                    rows={4}
                    value={formData.text}
                    onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                    className={cn("w-full px-5 py-3.5 border rounded-xl font-medium focus:outline-none focus:border-cyan-500 transition-all resize-none", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
                  ></textarea>
                </div>
                <div className="space-y-3">
                  <label className={cn("text-xs font-bold uppercase tracking-widest block", isDark ? "text-zinc-400" : "text-slate-500")}>Rating (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    required
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) || 5 })}
                    className={cn("w-full px-5 py-3.5 border rounded-xl font-bold focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
                  />
                </div>
                
                <div className={cn("pt-6 flex justify-end gap-3 border-t mt-6", isDark ? "border-slate-800" : "border-slate-200")}>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className={cn("px-4 py-2.5 rounded-lg border font-medium text-sm transition-colors", isDark ? "border-slate-800 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-700 hover:bg-slate-100")}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm transition-all disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {isSubmitting ? (editId ? "Updating..." : "Adding...") : (editId ? "Update Testimonial" : "Add Testimonial")}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
