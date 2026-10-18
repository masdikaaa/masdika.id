"use client";
import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";
import { Users, CheckCircle2, XCircle, Trash2, ExternalLink, Loader2, Edit2, ImageIcon, Save, Check, CheckCircle , LayoutDashboard } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { FaWhatsapp, FaTelegram } from "react-icons/fa";
import { AdminLoader } from "@/components/admin/AdminLoader";

const GroupIcon = ({ link = "" }: { link?: string }) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const isWhatsapp = link.includes('wa.me') || link.includes('whatsapp.com');
  const isTelegram = link.includes('t.me') || link.includes('telegram.org');
  return (
    <div className={cn("w-10 h-10 flex items-center justify-center rounded-xl border shrink-0", isDark ? "bg-white/5 border-white/10 text-cyan-400" : "bg-slate-50 border-slate-200 text-slate-600")}>
      {isWhatsapp ? <FaWhatsapp className="h-5 w-5" /> : isTelegram ? <FaTelegram className="h-5 w-5" /> : <Users className="h-5 w-5" />}
    </div>
  );
};

export default function AdminCommunityPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  // Edit State
  const [editGroup, setEditGroup] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showRemoveImageModal, setShowRemoveImageModal] = useState(false);
  const [removingImage, setRemovingImage] = useState(false);

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/admin/community');
      const data = await res.json();
      if (data.success) {
        setGroups(data.data);
      }
      setLoading(false);
    } catch (err) {
      toast.error("Failed to fetch community groups");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const [togglePublishId, setTogglePublishId] = useState<number | null>(null);
  const [togglePublishStatus, setTogglePublishStatus] = useState<boolean>(false);
  const [toggling, setToggling] = useState(false);

  const confirmTogglePublish = async () => {
    if (!togglePublishId) return;
    setToggling(true);
    try {
      const res = await fetch(`/api/admin/community/${togglePublishId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !togglePublishStatus })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(togglePublishStatus ? "Group unpublished" : "Group published");
        fetchGroups();
        window.dispatchEvent(new Event('notificationsUpdated'));
      } else {
        toast.error("Failed to update status");
      }
    } catch (err) {
      toast.error("Error updating status");
    } finally {
      setToggling(false);
      setTogglePublishId(null);
    }
  };

  const handleToggleClick = (id: number, currentStatus: boolean) => {
    setTogglePublishId(id);
    setTogglePublishStatus(currentStatus);
  };


  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/community/${deleteId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Group deleted");
        setGroups(groups.filter(g => g.id !== deleteId));
        window.dispatchEvent(new Event('notificationsUpdated'));
      } else {
        toast.error("Failed to delete group");
      }
    } catch (err) {
      toast.error("Error deleting group");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeletingAll(true);
    try {
      const res = await fetch('/api/admin/community/bulk-delete', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });
      if (res.ok) {
        setGroups(groups.filter(g => !selectedIds.includes(g.id)));
        setSelectedIds([]);
        toast.success(`${selectedIds.length} groups deleted`);
        window.dispatchEvent(new Event('notificationsUpdated'));
      } else {
        toast.error("Failed to delete groups");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setIsDeletingAll(false);
      setShowDeleteAllModal(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGroup) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/community/${editGroup.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editGroup.name,
          link: editGroup.link,
          image: editGroup.image
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Group updated successfully");
        setEditGroup(null);
        fetchGroups();
      } else {
        toast.error("Failed to update group");
      }
    } catch (err) {
      toast.error("Error updating group");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setUploading(true);
    const formDataUpload = new FormData();
    formDataUpload.append('file', e.target.files[0]);
    formDataUpload.append('folder', 'community');

    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formDataUpload
      });
      const data = await res.json();
      if (data.url) {
        setEditGroup({ ...editGroup, image: data.url });
        toast.success("Image uploaded successfully");
      } else {
        toast.error("Upload failed");
      }
    } catch (err) {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!editGroup?.image) return;
    setRemovingImage(true);
    try {
      if (editGroup.image.startsWith('/uploads/')) {
        await fetch('/api/admin/upload', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: editGroup.image })
        });
      }
      setEditGroup({ ...editGroup, image: null });
      setShowRemoveImageModal(false);
      toast.success("Image removed");
    } catch (err) {
      toast.error("Failed to remove image file");
      setEditGroup({ ...editGroup, image: null });
      setShowRemoveImageModal(false);
    } finally {
      setRemovingImage(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === groups.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(groups.map(g => g.id));
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  if (loading) return <AdminLoader />;

  return (
    <div className="space-y-8 relative z-10 w-full p-6 sm:p-0">
      <div className="flex flex-col sm:flex-row md:items-end justify-between gap-6 mb-6">
        <div>
          <h1 className={cn("text-3xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Community</h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Manage WhatsApp IT groups</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {groups.length > 0 && (
            <button 
              onClick={toggleSelectAll}
              className={cn("flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl transition-all border", isDark ? "text-white border-white/10 hover:bg-white/10" : "text-slate-900 border-slate-200 hover:bg-slate-100")}
            >
              <div className={`w-5 h-5 border rounded flex items-center justify-center ${selectedIds.length === groups.length ? 'bg-cyan-500 border-cyan-500' : isDark ? "border-zinc-500" : "border-slate-300"}`}>
                {selectedIds.length === groups.length && <CheckCircle className="w-3.5 h-3.5 text-slate-900" />}
              </div>
              {selectedIds.length === groups.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
          {selectedIds.length > 0 && (
            <button 
              onClick={() => setShowDeleteAllModal(true)}
              className={cn("flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 font-bold rounded-xl transition-all border border-red-500/20", isDark ? "text-red-400" : "text-red-700")}
            >
              <Trash2 className="w-5 h-5" />
              Delete ({selectedIds.length})
            </button>
          )}
      </div>
      </div>

      <div className="grid gap-6">
        {groups.length === 0 ? (
          <div className={cn("glass-card rounded-[32px] p-16 text-center border relative overflow-hidden group", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
            <div className={cn("absolute top-0 left-1/4 w-96 h-96 blur-[100px] rounded-full pointer-events-none", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")} />
            <div className={cn("w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border group-hover:scale-110 transition-transform duration-500", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
              <Users className={cn("w-12 h-12 opacity-80", isDark ? "text-cyan-400" : "text-cyan-700")} />
            </div>
            <h2 className={cn("text-2xl font-extrabold mb-3", isDark ? "text-white" : "text-[#0F3B4A]")}>No Groups Yet</h2>
            <p className={cn("font-medium max-w-sm mx-auto", isDark ? "text-zinc-400" : "text-slate-500")}>When someone submits a WhatsApp group, it will appear here for you to review and publish.</p>
          </div>
        ) : (
          <div className={cn("glass-card rounded-2xl overflow-hidden border", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className={cn("bg-white/5 border-b", isDark ? "bg-[#0A0B1A]/50 border-white/5 text-zinc-400" : "bg-white border-slate-200 text-slate-500")}>
                  <tr>
                    <th className="px-6 py-4 w-10"></th>
                    <th className="px-6 py-4 font-medium">Group</th>
                    <th className="px-6 py-4 font-medium">Link</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={cn("divide-y", isDark ? "divide-white/5" : "divide-slate-200")}>
                  {groups.map((group, index) => (
                    <motion.tr 
                      key={group.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <button onClick={() => toggleSelect(group.id)} className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${selectedIds.includes(group.id) ? 'bg-cyan-500 border-cyan-500' : isDark ? "border-zinc-500 hover:border-cyan-400" : "border-slate-300 hover:border-cyan-600"}`}>
                          {selectedIds.includes(group.id) && <CheckCircle className="w-3.5 h-3.5 text-slate-900" />}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-10 h-10 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center border", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                            {group.image ? (
                              <img referrerPolicy="no-referrer" src={group.image} alt={group.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                            ) : (
                              <GroupIcon link={group.link} />
                            )}
                          </div>
                          <span className={cn("font-medium line-clamp-1", isDark ? "text-white" : "text-slate-900")}>{group.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <a 
                          href={group.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={cn("hover:underline flex items-center gap-1", isDark ? "text-cyan-400" : "text-cyan-700")}
                        >
                          Open Link <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                      <td className="px-6 py-4">
                        {group.isPublished ? (
                          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", isDark ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-green-50 text-green-700 border-green-200")}>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Published
                          </span>
                        ) : (
                          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 border border-yellow-500/20", isDark ? "text-yellow-400" : "text-yellow-700")}>
                            <Loader2 className="w-3.5 h-3.5" />
                            Pending Review
                          </span>
                        )}
                      </td>
                      <td className={cn("px-6 py-4", isDark ? "text-zinc-400" : "text-slate-500")}>
                        {new Date(group.createdAt).toLocaleDateString('en-US')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditGroup(group)}
                            className={cn("inline-flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors", isDark ? "text-cyan-400" : "text-cyan-700")}
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleClick(group.id, group.isPublished)}
                            className={cn("inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors", group.isPublished ? (isDark ? "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20" : "bg-yellow-50 text-yellow-600 hover:bg-yellow-100") : (isDark ? "bg-green-500/10 text-green-400 hover:bg-green-500/20" : "bg-green-50 text-green-600 hover:bg-green-100"))}
                            title={group.isPublished ? "Unpublish" : "Publish"}
                          >
                            {group.isPublished ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => setDeleteId(group.id)}
                            className={cn("inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors", isDark ? "text-red-400" : "text-red-700")}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Group?"
        description="Are you sure you want to delete this group? This action cannot be undone."
        confirmText="Delete"
        isLoading={deleting}
        variant="danger"
      />

      <ConfirmModal
        isOpen={!!togglePublishId}
        onClose={() => setTogglePublishId(null)}
        onConfirm={confirmTogglePublish}
        title={togglePublishStatus ? "Unpublish Group?" : "Publish Group?"}
        description={togglePublishStatus 
          ? "This group will no longer be visible on the public community page." 
          : "This group will be visible on the public community page."}
        confirmText={togglePublishStatus ? "Unpublish" : "Publish"}
        isLoading={toggling}
        variant="warning"
      />

      <ConfirmModal
        isOpen={showDeleteAllModal}
        onClose={() => setShowDeleteAllModal(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Groups?"
        description={`Are you sure you want to delete ${selectedIds.length} selected groups? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isDeletingAll}
        variant="danger"
      />

      {/* Edit Modal */}
      {editGroup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className={cn("absolute inset-0 backdrop-blur-md", isDark ? "bg-[#011627]/80" : "bg-slate-900/40")} onClick={() => setEditGroup(null)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={cn("border rounded-[32px] w-full max-w-lg overflow-hidden relative z-10", isDark ? "glass-card border-cyan-500/30" : "bg-white border-slate-200")}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-cyan-500"></div>
            <div className={cn("p-6 border-b flex items-center justify-between", isDark ? "border-white/10" : "border-slate-200")}>
              <h2 className={cn("text-xl font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                <Edit2 className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-700")} />
                Edit Group
              </h2>
              <button onClick={() => setEditGroup(null)} className={cn("hover:text-white transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}>
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 md:p-8 space-y-6">
              <div className="space-y-2">
                <label className={cn("block text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Group Name</label>
                <input 
                  type="text" 
                  value={editGroup.name}
                  onChange={e => setEditGroup({...editGroup, name: e.target.value})}
                  className={cn("w-full border rounded-xl px-5 py-3.5 font-bold focus:outline-none focus:border-cyan-500/50 transition-all", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className={cn("block text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>WhatsApp Link</label>
                <div className="relative">
                  <ExternalLink className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5", isDark ? "text-zinc-500" : "text-slate-400")} />
                  <input 
                    type="url" 
                    value={editGroup.link}
                    onChange={e => setEditGroup({...editGroup, link: e.target.value})}
                    className={cn("w-full border rounded-xl pl-12 pr-5 py-3.5 font-medium focus:outline-none focus:border-cyan-500/50 transition-all", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={cn("block text-sm font-medium mb-1.5", isDark ? "text-zinc-400" : "text-slate-500")}>Group Image (Optional)</label>
                {editGroup.image ? (
                  <div className={cn("relative group rounded-xl overflow-hidden border w-32 h-32", isDark ? "border-white/10" : "border-slate-200")}>
                    <img referrerPolicy="no-referrer" src={editGroup.image} alt="Group" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                      <label className={cn("cursor-pointer px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition-colors backdrop-blur-md border flex items-center gap-1.5", isDark ? "text-white border-white/20" : "text-slate-900 border-slate-200")}>
                        <ImageIcon className="w-3 h-3" /> Change
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                      </label>
                      <button 
                        type="button"
                        onClick={() => setShowRemoveImageModal(true)}
                        className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-200 rounded-lg text-xs font-medium transition-colors backdrop-blur-md border border-red-500/30 flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className={cn("flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed rounded-xl transition-colors cursor-pointer group", isDark ? "bg-cyan-950/20 hover:bg-cyan-900/40 border-white/10 hover:border-cyan-500/50" : "bg-cyan-50 hover:bg-cyan-100 border-cyan-200 hover:border-cyan-400")}>
                    {uploading ? (
                      <div className={cn("w-6 h-6 border-2 border-t-transparent rounded-full animate-spin", isDark ? "border-cyan-500" : "border-slate-400")}></div>
                    ) : (
                      <>
                        <div className={cn("p-2 rounded-full mb-2 group-hover:bg-cyan-500/10 group-hover: transition-colors text-zinc-500", isDark ? "text-cyan-400" : "text-cyan-700")}>
                          <ImageIcon className="w-5 h-5" />
                        </div>
                        <span className={cn("text-[11px] font-bold text-center px-2", isDark ? "text-zinc-400" : "text-slate-600")}>Upload Image</span>
                        <span className={cn("text-[9px] mt-1 text-center leading-tight px-1", isDark ? "text-zinc-500" : "text-slate-400")}>Recommended 1:1<br/>(Max 5MB)</span>
                      </>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                  </label>
                )}
              </div>

              <div className={cn("pt-4 border-t flex justify-end gap-3 mt-4", isDark ? "border-white/10" : "border-slate-200")}>
                <button type="button" onClick={() => setEditGroup(null)} className={cn("px-4 py-2.5 rounded-lg border font-medium text-sm transition-colors", isDark ? "border-slate-800 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-700 hover:bg-slate-100")}>
                  Cancel
                </button>
                <button type="submit" disabled={saving || uploading} className="flex items-center justify-center gap-2 px-5 py-2.5 font-semibold text-sm rounded-lg bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm transition-all disabled:opacity-50">
                  {saving ? <div className={cn("w-4 h-4 border-2 border-t-white rounded-full animate-spin", isDark ? "border-white/30" : "border-slate-200")} /> : <Save className="w-4 h-4" />} 
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <ConfirmModal
        isOpen={showRemoveImageModal}
        onClose={() => setShowRemoveImageModal(false)}
        onConfirm={handleRemoveImage}
        title="Remove Image?"
        description="Are you sure you want to delete this group image from storage? This action cannot be undone."
        confirmText="Remove Image"
        isLoading={removingImage}
        variant="danger"
      />
    </div>
  );
}
