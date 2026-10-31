"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Trash2, Check, Image as ImageIcon, Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

interface MediaFile {
  name: string;
  url: string;
  createdAt: string;
  size: number;
}

interface MediaLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string, name: string) => void;
  title?: string;
}

export default function MediaLibrary({ isOpen, onClose, onSelect, title = "Media Library" }: MediaLibraryProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fetchMedia = useCallback(async (query = "") => {
    setLoading(true);
    try {
      const url = query.trim()
        ? `/api/admin/media?q=${encodeURIComponent(query.trim())}`
        : '/api/admin/media';
      const res = await fetch(url);
      const data = await res.json();
      if (!data.error && Array.isArray(data)) {
        setMedia(data);
      }
    } catch {
      toast.error("Failed to load media files");
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  }, []);

  // Initial load when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchMedia("");
      setSelectedFile(null);
      setSearchQuery("");
    }
  }, [isOpen, fetchMedia]);

  // Debounced search with Elasticsearch backend
  useEffect(() => {
    if (!isOpen) return;
    if (searchQuery.trim()) {
      setIsSearching(true);
    }
    const timer = setTimeout(() => {
      fetchMedia(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, isOpen, fetchMedia]);

  const processUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file.");
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'media');

    setUploading(true);
    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.url) {
        toast.success("Image uploaded!");
        fetchMedia(searchQuery); // Refresh list
      } else {
        toast.error(data.error || "Failed to upload image");
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    await processUpload(e.target.files[0]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processUpload(e.dataTransfer.files[0]);
    }
  };

  const confirmDelete = (filename: string) => {
    setFileToDelete(filename);
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);
    
    try {
      const target = media.find(m => m.name === fileToDelete);
      const urlParam = target?.url ? `&url=${encodeURIComponent(target.url)}` : '';
      const res = await fetch(`/api/admin/media?filename=${encodeURIComponent(fileToDelete)}${urlParam}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success("Image deleted");
        if (selectedFile?.name === fileToDelete) setSelectedFile(null);
        setMedia(prev => prev.filter(m => m.name !== fileToDelete));
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete image");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setFileToDelete(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div key="media-lib-backdrop" className={cn("fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm", isDark ? "bg-black/80" : "bg-slate-900/40")}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={cn("w-full max-w-5xl h-[85vh] rounded-3xl border flex flex-col overflow-hidden shadow-2xl", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200")}
        >
          {/* Header */}
          <div className={cn("flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6 border-b shrink-0", isDark ? "border-slate-800 bg-[#0b1322]" : "border-slate-200 bg-slate-50")}>
            <div className="flex items-center gap-3">
              <h2 className={cn("text-xl font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                <ImageIcon className="w-5 h-5 text-cyan-400" />
                {title}
              </h2>
              {media.length > 0 && (
                <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium", isDark ? "bg-white/10 text-slate-300" : "bg-slate-200 text-slate-700")}>
                  {media.length} {media.length === 1 ? 'file' : 'files'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative">
                <Search className={cn("w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2", isSearching ? "text-cyan-400 animate-pulse" : "text-zinc-400")} />
                <input
                  type="text"
                  placeholder="Search images (Elasticsearch)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(
                    "pl-9 pr-7 py-1.5 text-sm rounded-xl border transition-colors outline-none w-36 sm:w-56",
                    isDark ? "bg-white/5 border-white/10 text-white placeholder-zinc-500 focus:border-cyan-500" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-500"
                  )}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button 
                onClick={() => fetchMedia(searchQuery)}
                disabled={loading}
                title="Refresh media"
                className={cn("p-2 text-sm font-medium rounded-xl transition-all border disabled:opacity-50", isDark ? "bg-white/5 hover:bg-white/10 text-white border-white/10" : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200")}
              >
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              </button>

              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={cn("flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-medium rounded-xl transition-all border disabled:opacity-50", isDark ? "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/30" : "bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-200")}
              >
                <Upload className="w-4 h-4" />
                {uploading ? "Uploading..." : "Upload New"}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
              
              <button onClick={onClose} className={cn("transition-colors p-2 rounded-xl shrink-0", isDark ? "text-zinc-400 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100")}>
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div 
            className="flex-1 overflow-hidden flex flex-col md:flex-row relative"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isDragging && (
              <div className={cn("absolute inset-0 z-50 border-2 border-dashed border-cyan-500 backdrop-blur-sm flex flex-col items-center justify-center", isDark ? "bg-[#0b1322]/90" : "bg-white/90")}>
                <Upload className={cn("w-16 h-16 mb-6 animate-bounce", isDark ? "text-cyan-400" : "text-cyan-700")} />
                <p className={cn("text-2xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>Drop image to upload</p>
                <p className="text-zinc-400">Release your mouse to add this image to the library</p>
              </div>
            )}
            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-8 h-8 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                </div>
              ) : media.length === 0 ? (
                searchQuery ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>No images match &ldquo;{searchQuery}&rdquo; in Elasticsearch</p>
                    <button onClick={() => setSearchQuery("")} className="text-sm text-cyan-400 mt-2 hover:underline">
                      Clear search
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-4", isDark ? "bg-white/5" : "bg-slate-100")}>
                      <ImageIcon className="w-8 h-8 text-zinc-500" />
                    </div>
                    <p className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>No media files found.</p>
                    <p className={cn("text-sm mt-1", isDark ? "text-zinc-500" : "text-slate-400")}>Upload an image to get started.</p>
                  </div>
                )
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {media.map((file) => (
                    <div 
                      key={file.url || file.name}
                      onClick={() => setSelectedFile(file)}
                      className={cn("relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all", (selectedFile?.url === file.url || selectedFile?.name === file.name) ? 'border-cyan-500' : isDark ? 'border-white/5 hover:border-white/20' : 'border-slate-200 hover:border-slate-300')}
                    >
                      <img referrerPolicy="no-referrer" src={file.url} alt={file.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                      {(selectedFile?.url === file.url || selectedFile?.name === file.name) && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar (Details) */}
            {selectedFile && (
              <div className={cn("w-full md:w-80 border-t md:border-t-0 md:border-l p-6 flex flex-col", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}>
                <h3 className={cn("text-sm font-bold uppercase tracking-wider mb-4", isDark ? "text-white" : "text-slate-900")}>Attachment Details</h3>
                
                <div className={cn("aspect-video rounded-lg overflow-hidden border mb-4 flex items-center justify-center", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200")}>
                  <img referrerPolicy="no-referrer" src={selectedFile.url} alt={selectedFile.name} className="max-w-full max-h-full object-contain" loading="lazy" decoding="async" />
                </div>

                <div className="space-y-3 flex-1">
                  <div>
                    <label className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>File name</label>
                    <p className={cn("text-sm font-medium break-all", isDark ? "text-white" : "text-slate-900")}>{selectedFile.name}</p>
                  </div>
                  <div>
                    <label className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>File size</label>
                    <p className={cn("text-sm", isDark ? "text-zinc-300" : "text-slate-600")}>{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <div>
                    <label className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>Uploaded on</label>
                    <p className={cn("text-sm", isDark ? "text-zinc-300" : "text-slate-600")}>{new Date(selectedFile.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <button 
                    onClick={() => {
                      onSelect(selectedFile.url, selectedFile.name);
                      onClose();
                    }}
                    className="w-full py-2.5 font-semibold rounded-lg transition-colors bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 text-sm shadow-sm"
                  >
                    Select Image
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDelete(selectedFile.name);
                    }}
                    className={cn("w-full py-2.5 font-medium rounded-xl transition-colors flex items-center justify-center gap-2", isDark ? "bg-red-500/10 hover:bg-red-500/20 text-red-400" : "bg-red-50 hover:bg-red-100 text-red-700")}
                  >
                    <Trash2 className="w-4 h-4" /> Delete Permanently
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <ConfirmModal
        key="confirm-delete-modal"
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={executeDelete}
        title="Delete Image Permanently"
        description="Are you sure you want to delete this image? This action cannot be undone."
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </AnimatePresence>
  );
}
