"use client";

import { useState, useEffect, use } from "react";
import { ArrowLeft, Save, Upload, Link as LinkIcon, Image as ImageIcon, Trash2 , Loader2, LayoutDashboard } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { AdminLoader } from "@/components/admin/AdminLoader";
import { Select } from "@/components/ui/Select";

export default function EditOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const resolvedParams = use(params);
  const isNew = resolvedParams.id === 'new';
  const router = useRouter();

  const fetchOpportunity = async () => {
    try {
      const res = await fetch(`/api/admin/opportunities/${resolvedParams.id}`);
      const data = await res.json();
      if (!data.error) {
        setFormData({
          title: data.title,
          type: data.type,
          description: data.description || "",
          image: data.image || "",
          link: data.link || "",
          status: data.status,
          isNew: data.isNew || false
        });
        // Auto-detect image mode
        if (data.image && data.image.startsWith('http')) {
          setImageMode('url');
        }
      }
    } catch (err) {
      toast.error("Failed to load item");
    } finally {
      setLoading(false);
    }
  };

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removingImage, setRemovingImage] = useState(false);
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');
  
  const [formData, setFormData] = useState({
    title: "",
    type: "EVENT",
    description: "",
    image: "",
    link: "",
    status: "PUBLISHED",
    isNew: false
  });

  useEffect(() => {
    if (!isNew) {
      fetchOpportunity();
    }
  }, [isNew]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    
    setUploading(true);
    const formDataUpload = new FormData();
    formDataUpload.append('file', e.target.files[0]);
    formDataUpload.append('folder', formData.type.toLowerCase());

    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formDataUpload
      });
      const data = await res.json();
      if (data.url) {
        setFormData(prev => ({ ...prev, image: data.url }));
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
    if (!formData.image) return;
    
    setRemovingImage(true);
    try {
      if (formData.image.startsWith('/uploads/')) {
        await fetch('/api/admin/upload', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: formData.image })
        });
      }
      setFormData(prev => ({ ...prev, image: '' }));
      setShowRemoveModal(false);
      toast.success("Image removed");
    } catch (err) {
      toast.error("Failed to remove image file");
      // Still remove from form state even if server delete fails
      setFormData(prev => ({ ...prev, image: '' }));
      setShowRemoveModal(false);
    } finally {
      setRemovingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = isNew ? '/api/admin/opportunities' : `/api/admin/opportunities/${resolvedParams.id}`;
      const method = isNew ? 'POST' : 'PUT';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast.success(`Item ${isNew ? 'created' : 'updated'} successfully`);
        router.push('/admin/opportunities');
      } else {
        const error = await res.json();
        toast.error(error.error || error.message || "Failed to save item");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AdminLoader />;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin/opportunities" className={cn("p-2 hover:bg-white/10 rounded-xl hover:text-white transition-all border", isDark ? "text-zinc-400 border-white/10" : "text-slate-500 border-slate-200")}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex flex-col sm:flex-row md:items-end justify-between gap-6 mb-6">
        <div>
          <h1 className={cn("text-3xl font-extrabold drop-shadow-sm mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>{isNew ? 'Create New Item' : 'Edit Item'}</h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Fill in the details for your event, webinar, or job vacancy.</p>
        </div>
      </div>
        </div>
        <button 
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
        >
          {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save</>}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 flex flex-col space-y-6">
          <div className="glass-card p-6 flex-1 flex flex-col">
            <div className="space-y-4 flex-1 flex flex-col">
              <div>
                <label className={cn("block text-sm font-medium mb-1.5", isDark ? "text-zinc-400" : "text-slate-500")}>Title</label>
                <input 
                  type="text" 
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className={cn("w-full bg-black/40 border rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500 transition-colors", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                  placeholder="Enter title"
                  required
                />
              </div>

              <div className="flex-1 flex flex-col">
                <label className={cn("block text-sm font-medium mb-1.5", isDark ? "text-zinc-400" : "text-slate-500")}>Description</label>
                <textarea 
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className={cn("w-full flex-1 min-h-[150px] md:min-h-[300px] bg-black/40 border rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500 transition-colors resize-none", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                  placeholder="Enter description..."
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6 space-y-4">
            <h3 className={cn("font-semibold border-b pb-3", isDark ? "text-white border-white/5" : "text-slate-900 border-slate-200")}>Settings</h3>
            
            <div>
              <label className={cn("block text-sm font-medium mb-1.5", isDark ? "text-zinc-400" : "text-slate-500")}>Type</label>
              <Select 
                value={formData.type} 
                onChange={(val) => setFormData(prev => ({ ...prev, type: val }))}
                options={[
                  { value: "EVENT", label: "Event" },
                  { value: "WEBINAR", label: "Webinar" },
                  { value: "JOBS", label: "Job Vacancy" }
                ]}
                placeholder="Type"
                className={cn("w-full rounded-xl px-4 py-2.5 text-sm", isDark ? "border-white/10" : "border-slate-200")}
              />
            </div>

            <div>
              <label className={cn("block text-sm font-medium mb-1.5", isDark ? "text-zinc-400" : "text-slate-500")}>Status</label>
              <Select 
                value={formData.status} 
                onChange={(val) => setFormData(prev => ({ ...prev, status: val }))}
                options={[
                  { value: "PUBLISHED", label: "Published" },
                  { value: "DRAFT", label: "Draft" }
                ]}
                placeholder="Status"
                className={cn("w-full rounded-xl px-4 py-2.5 text-sm", isDark ? "border-white/10" : "border-slate-200")}
              />
            </div>

            <div>
              <label className={cn("block text-sm font-medium mb-1.5", isDark ? "text-zinc-400" : "text-slate-500")}>External Link</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="url" 
                  name="link"
                  value={formData.link}
                  onChange={handleChange}
                  className={cn("w-full bg-black/40 border rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-cyan-500 transition-colors", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          <div className="glass-card p-6 space-y-4">
            <h3 className={cn("font-semibold border-b pb-3", isDark ? "text-white border-white/5" : "text-slate-900 border-slate-200")}>Highlights</h3>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${formData.isNew ? 'bg-cyan-500 border-cyan-500' : 'border-zinc-500 group-hover:border-cyan-400'}`}>
                  {formData.isNew && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                </div>
                <span className={cn("text-sm font-medium group-hover:text-white transition-colors", isDark ? "text-zinc-300" : "text-slate-600")}>Mark as "NEW"</span>
                <input 
                  type="checkbox" 
                  name="isNew"
                  checked={formData.isNew} 
                  onChange={(e) => setFormData(prev => ({ ...prev, isNew: e.target.checked }))}
                  className="hidden" 
                />
              </label>
            </div>
          </div>

          <div className="glass-card p-6 space-y-4">
            <h3 className={cn("font-semibold border-b pb-3", isDark ? "text-white border-white/5" : "text-slate-900 border-slate-200")}>Cover Image</h3>

            {/* Image source toggle */}
            <div className={cn("flex rounded-xl overflow-hidden border bg-black/30 p-1 gap-1", isDark ? "border-white/10" : "border-slate-200")}>
              <button type="button"
                onClick={() => setImageMode('upload')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${imageMode === 'upload' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}>
                Upload File
              </button>
              <button type="button"
                onClick={() => setImageMode('url')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${imageMode === 'url' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}>
                Image URL
              </button>
            </div>

            {imageMode === 'url' ? (
              /* External URL input */
              <div className="space-y-3">
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="url"
                    value={formData.image}
                    onChange={e => setFormData(prev => ({ ...prev, image: e.target.value }))}
                    placeholder="https://example.com/image.jpg"
                    className={cn("w-full bg-black/40 border rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-cyan-500 transition-colors text-sm", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                  />
                </div>
                {formData.image && (
                  <div className={cn("relative group rounded-xl overflow-hidden border", isDark ? "border-white/10" : "border-slate-200")}>
                    <img referrerPolicy="no-referrer" src={formData.image} alt="Preview" className="w-full h-40 object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <button type="button" onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 border border-red-500/30 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <p className="text-xs text-zinc-500">Only HTTPS URLs are accepted. The image is loaded directly from the source.</p>
              </div>
            ) : (
              /* File upload */
              <>
                {formData.image && formData.image.startsWith('/') ? (
                  <div className={cn("relative group rounded-xl overflow-hidden border", isDark ? "border-white/10" : "border-slate-200")}>
                    <img referrerPolicy="no-referrer" src={formData.image} alt="Cover" className="w-full h-40 object-cover" loading="lazy" decoding="async" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <label className={cn("cursor-pointer px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors backdrop-blur-md border flex items-center gap-2", isDark ? "text-white border-white/20" : "text-slate-900 border-slate-200")}>
                        <ImageIcon className="w-4 h-4" /> Change
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                      </label>
                      <button type="button" onClick={() => setShowRemoveModal(true)}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-200 rounded-lg text-sm font-medium transition-colors backdrop-blur-md border border-red-500/30 flex items-center gap-2">
                        <Trash2 className="w-4 h-4" /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className={cn("flex flex-col items-center justify-center w-full h-40 border-2 border-dashed hover:border-cyan-500/50 rounded-xl bg-cyan-950/20 hover:bg-cyan-900/40 transition-colors cursor-pointer group", isDark ? "border-white/10" : "border-slate-200")}>
                    {uploading ? (
                      <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <div className={cn("p-3 rounded-full mb-3 group-hover:bg-cyan-500/10 group-hover: transition-colors text-zinc-500", isDark ? "text-cyan-400" : "text-cyan-700")}>
                          <ImageIcon className="w-6 h-6" />
                        </div>
                        <span className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Click to upload image</span>
                      </>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                  </label>
                )}
                <div className="text-xs text-zinc-500 text-center">Recommended: 1200x630px (Max 5MB)</div>
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showRemoveModal}
        onClose={() => setShowRemoveModal(false)}
        onConfirm={handleRemoveImage}
        title="Remove Image?"
        description="Are you sure you want to delete this cover image from storage? This action cannot be undone."
        confirmText="Remove Image"
        isLoading={removingImage}
        variant="danger"
      />
    </div>
  );
}

