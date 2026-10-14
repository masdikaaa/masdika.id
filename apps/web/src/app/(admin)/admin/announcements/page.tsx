"use client";
import { useUpdateEffect, useUrlNumber, useUrlString, useUrlTab } from "@/lib/useUrlTab";
import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Search, AlertCircle, Info, Hammer, AlertTriangle, FileText, AlignLeft, CheckCircle, UploadCloud, Check } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Pagination } from "@/components/ui/Pagination";
import { motion } from "framer-motion";
import { AdminLoader } from "@/components/admin/AdminLoader";
import { Select } from "@/components/ui/Select";

const defaultFormData = {
  title: "",
  content: "",
  type: "INFO",
  isActive: true,
  imageUrl: "",
  actionUrl: "",
};

export default function AdminAnnouncementsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [announcements, setAnnouncements] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useUrlString<string>("search", "");
  const [activeTab, setActiveTab] = useUrlTab<'berita' | 'banner'>('berita', { allowed: ['berita', 'banner'] as const });
  const [currentPage, setCurrentPage] = useUrlNumber("currentPage", 1);
  const ITEMS_PER_PAGE = 10;

  useUpdateEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search]);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [isLegacyHtml, setIsLegacyHtml] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [structuredData, setStructuredData] = useState<any>({});

  const [showModal, setShowModal] = useState(false);
  const [showRemoveImageModal, setShowRemoveImageModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState(defaultFormData);

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch('/api/admin/announcements');
      const data = await res.json();
      if (!data.error) {
        setAnnouncements(data);
      }
    } catch (err) {
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  const fetchBanners = async () => {
    try {
      const res = await fetch('/api/admin/banners');
      const data = await res.json();
      if (!data.error) setBanners(data);
    } catch (err) {
      toast.error("Failed to load banners");
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    fetchBanners();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const url = activeTab === 'banner' ? `/api/admin/banners/${deleteId}` : `/api/admin/announcements/${deleteId}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) {
        toast.success(activeTab === 'banner' ? "Banner deleted" : "Announcement deleted");
        if (activeTab === 'banner') fetchBanners();
        else fetchAnnouncements();
      } else {
        toast.error("Failed to delete item");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith("image/")) {
        toast.error("Only image files are allowed for Banners.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Maximum file size is 5MB.");
        return;
      }

      setIsUploading(true);
      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("folder", "banners");

      const loadingToast = toast.loading("Uploading banner image...");
      try {
        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          body: uploadData
        });
        const data = await res.json();

        if (res.ok && data.url) {
          setFormData({ ...formData, imageUrl: data.url });
          toast.success("Banner image uploaded successfully!", { id: loadingToast });
        } else {
          toast.error(data.error || "Failed to upload image", { id: loadingToast });
        }
      } catch (err) {
        toast.error("Network error during upload", { id: loadingToast });
      } finally {
        setIsUploading(false);
        // Clear input to allow re-uploading same file if deleted
        e.target.value = '';
      }
    }
  };

  const handleRemoveImage = async () => {
    const currentUrl = formData.imageUrl;

    // Optimistically clear the UI
    setFormData({ ...formData, imageUrl: "" });

    // If it's an uploaded file (not an external link), delete it from server
    if (currentUrl && currentUrl.startsWith('/uploads/')) {
      try {
        await fetch('/api/admin/upload', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: currentUrl })
        });
      } catch (err) {
        console.error("Failed to delete image from storage", err);
      }
    }
  };

  const handleToggleAnnouncement = async (id: number, currentStatus: boolean) => {
    try {
      const url = activeTab === 'banner' ? `/api/admin/banners/${id}` : `/api/admin/announcements/${id}`;
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (res.ok) {
        toast.success(`Item ${!currentStatus ? 'activated' : 'disabled'}`);
        if (activeTab === 'banner') fetchBanners();
        else fetchAnnouncements();
      } else {
        toast.error("Failed to toggle item status");
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const base = activeTab === 'banner' ? '/api/admin/banners' : '/api/admin/announcements';
      const url = editingId ? `${base}/${editingId}` : base;

      let finalContent = formData.content;

      if (activeTab !== 'banner') {
        if (!isLegacyHtml) {
          if (formData.type === 'MAINTENANCE') {
            finalContent = `<!-- state:${JSON.stringify(structuredData)} -->
<p>Salam,</p>
<br/>
<p>${(structuredData.maintenanceDesc || '').replace(/\\n/g, '<br/>')}</p>
<br/>
<table>
  <thead>
    <tr>
      <th style="width: 30%; text-align: left;">Item</th>
      <th style="text-align: left;">Keterangan</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Tanggal Mulai</td>
      <td>${structuredData.maintenanceStart ? new Date(structuredData.maintenanceStart).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' }) : '-'}</td>
    </tr>
    <tr>
      <td>Tanggal Selesai</td>
      <td>${structuredData.maintenanceEnd ? new Date(structuredData.maintenanceEnd).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' }) : '-'}</td>
    </tr>
    <tr>
      <td>Dampak Layanan</td>
      <td>${structuredData.maintenanceImpact || '-'}</td>
    </tr>
  </tbody>
</table>
<br/>
<p>Demikian informasi ini kami sampaikan. Jika ada pertanyaan, jangan ragu menghubungi tim support kami.</p>
<p>Terima kasih,</p>`;
          } else {
            finalContent = `<!-- state:${JSON.stringify(structuredData)} -->
<p>${(structuredData.simpleContent || '').replace(/\\n/g, '<br/>')}</p>`;
          }
        } else {
          finalContent = structuredData.rawHtml || "";
        }
      } else {
        finalContent = "Banner Image";
      }

      const payload = {
        title: formData.title,
        content: finalContent,
        type: activeTab === 'banner' ? "BANNER" : formData.type,
        isActive: formData.isActive,
        imageUrl: formData.imageUrl,
        actionUrl: formData.actionUrl,
      };

      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(`${activeTab === 'banner' ? 'Banner' : 'Announcement'} ${editingId ? 'updated' : 'created'}`);
        if (activeTab === 'banner') fetchBanners();
        else fetchAnnouncements();
        closeModal();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save item");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openModal = (announcement?: any) => {
    if (announcement) {
      setEditingId(announcement.id);
      
      let initialStructured = {};
      let isLegacy = false;
      const content = announcement.content || "";
      if (content.includes("<!-- state:")) {
        try {
           const stateJson = content.split("<!-- state:")[1].split("-->")[0].trim();
           initialStructured = JSON.parse(stateJson);
        } catch(e) {
           isLegacy = true;
           initialStructured = { rawHtml: content };
        }
      } else {
        isLegacy = false; // Auto-convert to fields
        
        let desc = content.replace(/<table[\s\S]*?<\/table>/gi, ''); // remove table
        desc = desc.replace(/<br\s*\/?>/gi, '\n'); // br to newline
        desc = desc.replace(/<[^>]+>/g, ''); // strip tags
        desc = desc.replace(/Salam,\s*\n\s*/i, ''); // remove "Salam,"
        desc = desc.replace(/Demikian informasi[\s\S]*$/i, ''); // remove closing

        let maintenanceImpact = 'Mungkin terjadi interupsi layanan';
        
        if (announcement.type === 'MAINTENANCE') {
           const tableMatch = content.match(/<table[\s\S]*?<\/table>/i);
           if (tableMatch) {
              const impactMatch = tableMatch[0].match(/Dampak Layanan.*?<td[^>]*>([\s\S]*?)<\/td>/i);
              if (impactMatch) maintenanceImpact = impactMatch[1].replace(/<[^>]+>/g, '').trim();
           }
        }

        initialStructured = {
           maintenanceDesc: desc.trim(),
           simpleContent: desc.trim(),
           maintenanceStart: '', 
           maintenanceEnd: '',
           maintenanceImpact: maintenanceImpact
        };
      }

      setStructuredData(initialStructured);
      setIsLegacyHtml(isLegacy);

      setFormData({
        title: announcement.title,
        content: announcement.content,
        type: announcement.type,
        isActive: announcement.isActive,
        imageUrl: announcement.imageUrl || "",
        actionUrl: announcement.actionUrl || "",
      });
    } else {
      setEditingId(null);
      setStructuredData({});
      setIsLegacyHtml(false);
      setFormData({
        ...defaultFormData,
        type: activeTab === 'banner' ? 'INFO' : 'INFO'
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const sourceList = activeTab === 'banner' ? banners : announcements;
  const filteredAnnouncements = sourceList.filter(a => {
    return a.title.toLowerCase().includes(search.toLowerCase());
  });

  const totalPages = Math.ceil(filteredAnnouncements.length / ITEMS_PER_PAGE);
  const paginatedAnnouncements = filteredAnnouncements.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredAnnouncements.length && filteredAnnouncements.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAnnouncements.map(a => a.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirm = window.confirm(`Are you sure you want to delete ${selectedIds.length} items?`);
    if (!confirm) return;

    setIsBulkDeleting(true);
    try {
      const base = activeTab === 'banner' ? '/api/admin/banners' : '/api/admin/announcements';
      await Promise.all(selectedIds.map(id => fetch(`${base}/${id}`, { method: 'DELETE' })));
      toast.success(`${selectedIds.length} items deleted successfully`);
      setSelectedIds([]);
      if (activeTab === 'banner') fetchBanners();
      else fetchAnnouncements();
    } catch (err) {
      toast.error("Failed to delete some items");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'MAINTENANCE': return <Hammer className={cn("w-4 h-4", isDark ? "text-zinc-400" : "text-slate-500")} />;
      case 'WARNING': return <AlertTriangle className={cn("w-4 h-4", isDark ? "text-zinc-400" : "text-slate-500")} />;
      case 'BANNER': return <Info className={cn("w-4 h-4", isDark ? "text-zinc-400" : "text-slate-500")} />;
      default: return <Info className={cn("w-4 h-4", isDark ? "text-zinc-400" : "text-slate-500")} />;
    }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-4">
        <div>
          <h1 className={cn("text-3xl font-extrabold drop-shadow-sm mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>News & Announcements</h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Manage news, promos, and information displayed to customers.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className={cn("w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-sm font-bold hover:bg-red-500/30 hover:text-red-300 transition-all shadow-[0_0_15px_rgba(239,68,68,0.15)] disabled:opacity-50", isDark ? "text-red-400" : "text-red-700")}
            >
              {isBulkDeleting ? <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete Selected ({selectedIds.length})
            </button>
          )}
          <button onClick={() => openModal()} className={cn("w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-slate-900" : "bg-cyan-600 hover:bg-cyan-700 text-white")}>
            <Plus className="w-4 h-4" /> {activeTab === 'banner' ? 'Create Banner' : 'Create Announcement'}
          </button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="glass-card overflow-hidden">
        {/* Tabs */}
        <div className={cn("flex border-b px-5 pt-3", isDark ? "border-white/10" : "border-slate-200")}>
          <button
            onClick={() => setActiveTab('berita')}
            className={cn("px-4 py-3 text-sm font-bold transition-all relative", activeTab === 'berita' ? (isDark ? "text-white" : "text-slate-900") : (isDark ? "text-zinc-500 hover:text-zinc-300" : "text-slate-500 hover:text-slate-700"))}
          >
            News & Promos
            {activeTab === 'berita' && (
              <div className={cn("absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full", isDark ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" : "bg-cyan-500")} />
            )}
          </button>
          <button
            onClick={() => setActiveTab('banner')}
            className={cn("px-4 py-3 text-sm font-bold transition-all relative", activeTab === 'banner' ? (isDark ? "text-white" : "text-slate-900") : (isDark ? "text-zinc-500 hover:text-zinc-300" : "text-slate-500 hover:text-slate-700"))}
          >
            Dashboard Banners
            {activeTab === 'banner' && (
              <div className={cn("absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full", isDark ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" : "bg-cyan-500")} />
            )}
          </button>
        </div>

        <div className={cn("p-5 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
          <div className="relative w-full sm:max-w-md">
            <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 /70", isDark ? "text-cyan-500" : "text-cyan-700")} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={activeTab === 'banner' ? "Search banners..." : "Search news..."}
              className={cn("w-full pl-11 pr-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-400 shadow-inner", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
            />
          </div>
        </div>
      </motion.div>

      {/* Table Section */}
      <motion.div variants={itemVariants} className={cn("border rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200")}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={cn("border-b", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-slate-50 border-slate-200")}>
                <th className="px-6 py-4 w-12 text-center">
                  <div className="flex items-center">
                    {(() => {
                      const allSelected = paginatedAnnouncements.length > 0 && paginatedAnnouncements.every(a => selectedIds.includes(a.id));
                      return (
                        <label className="relative flex items-center justify-center cursor-pointer group">
                          <input type="checkbox" className="sr-only" checked={allSelected} onChange={toggleSelectAll} />
                          <div className={cn("w-5 h-5 rounded-md border transition-all flex items-center justify-center shadow-inner group-hover:border-cyan-500/50", allSelected ? "bg-cyan-500 border-cyan-500" : (isDark ? "border-white/20 bg-black/40" : "border-slate-300 bg-white"))}>
                            {allSelected && <CheckCircle className="w-3.5 h-3.5 text-black" strokeWidth={3} />}
                          </div>
                        </label>
                      );
                    })()}
                  </div>
                </th>
                <th className={cn("px-6 py-4 text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Title</th>
                {activeTab === 'berita' && (
                  <th className={cn("px-6 py-4 text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Type</th>
                )}
                <th className={cn("px-6 py-4 text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Status</th>
                <th className={cn("px-6 py-4 text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Date</th>
                <th className={cn("px-6 py-4 text-xs font-bold uppercase tracking-wider text-right", isDark ? "text-zinc-400" : "text-slate-500")}>Actions</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDark ? "divide-white/5" : "divide-slate-200")}>
              {loading ? (
                <tr>
                  <td colSpan={activeTab === 'berita' ? 6 : 5} className="px-6 py-12">
                    <AdminLoader className="min-h-[200px]" />
                  </td>
                </tr>
              ) : paginatedAnnouncements.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'berita' ? 6 : 5} className="px-6 py-16">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-4 border shadow-inner", isDark ? "border-white/10" : "border-slate-200")}>
                        <AlertCircle className={cn("w-8 h-8", isDark ? "text-zinc-500" : "text-slate-400")} />
                      </div>
                      <h3 className={cn("font-bold mb-1", isDark ? "text-white" : "text-slate-900")}>No {activeTab === 'banner' ? 'Banners' : 'News'}</h3>
                      <p className={cn("text-sm max-w-sm", isDark ? "text-zinc-400" : "text-slate-600")}>No {activeTab === 'banner' ? 'banners' : 'news'} have been created or match your search.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedAnnouncements.map((announcement) => (
                  <tr key={announcement.id} className={cn("transition-colors group", selectedIds.includes(announcement.id) ? (isDark ? "bg-cyan-500/5" : "bg-cyan-50") : (isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50"))}>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {(() => {
                          const isChecked = selectedIds.includes(announcement.id);
                          return (
                            <label className="relative flex items-center justify-center cursor-pointer group">
                              <input type="checkbox" className="sr-only" checked={isChecked} onChange={() => toggleSelect(announcement.id)} />
                              <div className={cn("w-5 h-5 rounded-md border transition-all flex items-center justify-center shadow-inner group-hover:border-cyan-500/50", isChecked ? "bg-cyan-500 border-cyan-500" : (isDark ? "border-white/20 bg-black/40" : "border-slate-300 bg-white"))}>
                                {isChecked && <CheckCircle className="w-3.5 h-3.5 text-black" strokeWidth={3} />}
                              </div>
                            </label>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn("font-semibold transition-colors", isDark ? "text-zinc-200 group-hover:text-white" : "text-slate-900 group-hover:text-cyan-700")}>{announcement.title}</div>
                      {activeTab === 'berita' && (
                        <div className={cn("text-xs truncate max-w-xs", isDark ? "text-zinc-400" : "text-slate-600")}>{announcement.content.replace(/<[^>]+>/g, '').substring(0, 50)}...</div>
                      )}
                      {activeTab === 'banner' && announcement.imageUrl && (
                        <div className={cn("text-xs truncate max-w-xs mt-1", isDark ? "text-zinc-500" : "text-slate-500")}>Image: {announcement.imageUrl.substring(0, 30)}...</div>
                      )}
                    </td>
                    {activeTab === 'berita' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(announcement.type)}
                          <span className={cn("text-xs font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>{announcement.type}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleAnnouncement(announcement.id, announcement.isActive)}
                        className={cn("px-3 py-1 text-[10px] font-bold rounded-full border transition-colors", announcement.isActive ? (isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100") : (isDark ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20 hover:bg-zinc-500/20" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"))}
                      >
                        {announcement.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className={cn("px-6 py-4 whitespace-nowrap text-xs", isDark ? "text-zinc-400" : "text-slate-600")}>
                      {new Date(announcement.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openModal(announcement)}
                          className={cn("p-2 rounded-lg transition-all", isDark ? "text-zinc-400 hover:text-cyan-400 hover:bg-cyan-500/10" : "text-slate-500 hover:text-cyan-700 hover:bg-cyan-50")}
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(announcement.id)}
                          className={cn("p-2 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all", isDark ? "text-zinc-400" : "text-slate-500")}
                          title="Delete"
                        >
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
        {totalPages > 1 && (
          <div className={cn("p-4 border-t", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        )}
      </motion.div>

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={activeTab === 'banner' ? "Delete Banner" : "Delete Announcement"}
        description={`Are you sure you want to delete this ${activeTab === 'banner' ? 'banner' : 'announcement'}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />

      <ConfirmModal
        isOpen={showRemoveImageModal}
        onClose={() => setShowRemoveImageModal(false)}
        onConfirm={async () => {
          setShowRemoveImageModal(false);
          await handleRemoveImage();
        }}
        title="Remove Image?"
        description="Are you sure you want to remove this image? If it was uploaded, it will be permanently deleted from the server."
        confirmText="Remove"
        variant="danger"
      />

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className={cn("absolute inset-0 backdrop-blur-sm", isDark ? "bg-[#0A0B1A]/80" : "bg-slate-50")} onClick={closeModal} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn("relative w-full max-w-3xl border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]", isDark ? "border-white/10" : "border-slate-200")}
          >
            <div className={cn("p-4 sm:p-6 border-b flex items-center justify-between shrink-0", isDark ? "bg-[#0A0B1A]/50 border-white/5 bg-white/[0.02]" : "bg-white border-slate-200 bg-white")}>
              <h2 className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>
                {editingId
                  ? (activeTab === 'banner' ? 'Edit Banner' : 'Edit Announcement')
                  : (activeTab === 'banner' ? 'Create Banner' : 'Create Announcement')}
              </h2>
              <button onClick={closeModal} className={cn("p-2 hover:text-white rounded-lg hover:bg-white/5 transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
              <div className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 custom-scrollbar">

                <div className="space-y-1.5">
                  <label className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-600")}>
                    {activeTab === 'banner' ? 'Banner Title (Internal)' : 'Title'} <span className={cn("", isDark ? "text-red-400" : "text-red-700")}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={activeTab === 'banner' ? "E.g. Banner Lebaran 2026" : "E.g. Diskon 50% Hosting"}
                    className={cn("w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-zinc-600", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                  />
                </div>

                {activeTab === 'berita' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-600")}>Type</label>
                        <Select
                          value={formData.type}
                          onChange={(val) => setFormData({ ...formData, type: val })}
                          options={[
                            { value: "INFO", label: "Info" },
                            { value: "MAINTENANCE", label: "Maintenance" },
                            { value: "WARNING", label: "Warning" }
                          ]}
                          placeholder="Type"
                          className={cn("w-full rounded-xl px-4 py-2.5 text-sm", isDark ? "border-white/10" : "border-slate-200")}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-600")}>Status</label>
                        <label className={cn("flex items-center gap-3 cursor-pointer p-2.5 bg-cyan-500/5 border rounded-xl hover: transition-colors", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                          <div className="relative shrink-0">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={formData.isActive}
                              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                            />
                            <div className={cn("w-11 h-6 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500", isDark ? "bg-black/50" : "bg-slate-300")}></div>
                          </div>
                          <span className={cn("text-sm font-medium", isDark ? "text-white" : "text-slate-900")}>{formData.isActive ? 'Active (Visible)' : 'Inactive (Hidden)'}</span>
                        </label>
                      </div>
                    </div>

                    {isLegacyHtml ? (
                      <div className="space-y-1.5">
                        <label className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-600")}>Legacy Content (HTML) <span className={cn("", isDark ? "text-red-400" : "text-red-700")}>*</span></label>
                        <textarea
                          required
                          value={structuredData.rawHtml || ''}
                          onChange={(e) => setStructuredData({ ...structuredData, rawHtml: e.target.value })}
                          rows={6}
                          style={{ colorScheme: 'dark' }}
                          className={cn("w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono resize-none", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                        />
                      </div>
                    ) : (
                      <>
                        {formData.type === 'MAINTENANCE' ? (
                          <div className={cn("space-y-4 border p-4 rounded-xl", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                            <div className="space-y-1.5">
                              <label className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-600")}>Maintenance Description <span className={cn("", isDark ? "text-red-400" : "text-red-700")}>*</span></label>
                              <textarea
                                required
                                value={structuredData.maintenanceDesc || ''}
                                onChange={(e) => setStructuredData({ ...structuredData, maintenanceDesc: e.target.value })}
                                placeholder="E.g. Kami informasikan bahwa tim NOC akan melaksanakan upgrade network..."
                                rows={3}
                                style={{ colorScheme: 'dark' }}
                                className={cn("w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-zinc-600 resize-none", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                              />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-600")}>Start Time <span className={cn("", isDark ? "text-red-400" : "text-red-700")}>*</span></label>
                                <input
                                  type="datetime-local"
                                  required
                                  value={structuredData.maintenanceStart || ''}
                                  onChange={(e) => setStructuredData({ ...structuredData, maintenanceStart: e.target.value })}
                                  className={cn("w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50 transition-all", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-600")}>End Time <span className={cn("", isDark ? "text-red-400" : "text-red-700")}>*</span></label>
                                <input
                                  type="datetime-local"
                                  required
                                  value={structuredData.maintenanceEnd || ''}
                                  onChange={(e) => setStructuredData({ ...structuredData, maintenanceEnd: e.target.value })}
                                  className={cn("w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50 transition-all", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                                />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <label className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-600")}>Service Impact <span className={cn("", isDark ? "text-red-400" : "text-red-700")}>*</span></label>
                              <input
                                type="text"
                                required
                                value={structuredData.maintenanceImpact || ''}
                                onChange={(e) => setStructuredData({ ...structuredData, maintenanceImpact: e.target.value })}
                                placeholder="E.g. Jaringan mungkin terputus selama 15-30 menit"
                                className={cn("w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-zinc-600", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <label className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-600")}>Content Message <span className={cn("", isDark ? "text-red-400" : "text-red-700")}>*</span></label>
                            <textarea
                              required
                              value={structuredData.simpleContent || ''}
                              onChange={(e) => setStructuredData({ ...structuredData, simpleContent: e.target.value })}
                              placeholder="Enter your announcement text here..."
                              rows={5}
                              style={{ colorScheme: 'dark' }}
                              className={cn("w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-zinc-600 resize-none", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                            />
                            <p className={cn("text-xs mt-1", isDark ? "text-zinc-500" : "text-slate-500")}>Paragraphs will be automatically formatted.</p>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}

                {activeTab === 'banner' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-600")}>Image (Optional)</label>
                        {formData.imageUrl ? (
                          <div className={cn("relative w-full h-32 rounded-xl overflow-hidden border group", isDark ? "border-white/10" : "border-slate-200")}>
                            <img referrerPolicy="no-referrer" src={formData.imageUrl} alt="Banner Preview" className="w-full h-full object-contain" loading="lazy" decoding="async" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => setShowRemoveImageModal(true)}
                                className={cn("p-2 bg-red-500/80 hover:bg-red-500 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium shadow-xl", isDark ? "text-white" : "text-slate-900")}
                              >
                                <Trash2 className="w-4 h-4" /> Remove Image
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <label className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed ${isUploading ? 'border-cyan-500/50 bg-cyan-500/5' : isDark ? "border-white/10 hover:border-cyan-500/50 hover:bg-white/5" : "border-slate-300 hover:border-cyan-600 hover:bg-slate-50"} rounded-xl cursor-pointer transition-all group`}>
                              {isUploading ? (
                                <>
                                  <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                                  <span className={cn("text-sm font-medium", isDark ? "text-cyan-400" : "text-cyan-700")}>Uploading...</span>
                                </>
                              ) : (
                                <>
                                  <UploadCloud className={cn("w-5 h-5 mb-2 transition-colors", isDark ? "text-zinc-500 group-hover:text-cyan-400" : "text-slate-400 group-hover:text-cyan-700")} />
                                  <span className={cn("text-sm font-medium group-hover:text-cyan-400 transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}>Click to upload banner image</span>
                                </>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleBannerUpload}
                                disabled={isUploading}
                              />
                            </label>

                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-px bg-white/10"></div>
                              <span className={cn("text-[10px] font-bold tracking-wider", isDark ? "text-zinc-500" : "text-slate-500")}>OR PASTE URL</span>
                              <div className="flex-1 h-px bg-white/10"></div>
                            </div>

                            <input
                              type="text"
                              value={formData.imageUrl}
                              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                              placeholder="https://..."
                              className={cn("w-full border rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-zinc-600", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                            />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-600")}>Action Link (Optional)</label>
                        <input
                          type="text"
                          value={formData.actionUrl}
                          onChange={(e) => setFormData({ ...formData, actionUrl: e.target.value })}
                          placeholder="e.g. /dashboard/checkout"
                          className={cn("w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-zinc-600", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-600")}>Status</label>
                      <label className={cn("flex items-center gap-3 cursor-pointer p-2.5 bg-cyan-500/5 border rounded-xl hover: transition-colors w-fit", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                        <div className="relative shrink-0">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={formData.isActive}
                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                          />
                          <div className={cn("w-11 h-6 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500", isDark ? "bg-black/50" : "bg-slate-300")}></div>
                        </div>
                        <span className={cn("text-sm font-medium", isDark ? "text-white" : "text-slate-900")}>{formData.isActive ? 'Active (Visible)' : 'Inactive (Hidden)'}</span>
                      </label>
                    </div>
                  </>
                )}

              </div>

              <div className={cn("p-4 sm:p-6 border-t flex flex-col sm:flex-row items-center justify-end gap-3 shrink-0", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                <button
                  type="button"
                  onClick={closeModal}
                  className={cn("w-full sm:w-auto px-4 py-2 hover:bg-white/10 rounded-xl text-sm font-medium transition-colors", isDark ? "text-white" : "text-slate-900")}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cn("w-full sm:w-auto px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 min-w-[120px] justify-center", isDark ? "text-white" : "text-slate-900")}
                >
                  {isSubmitting ? (
                    <div className={cn("w-4 h-4 border-2 border-t-white rounded-full animate-spin", isDark ? "border-white/30" : "border-slate-200")} />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  {editingId ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
