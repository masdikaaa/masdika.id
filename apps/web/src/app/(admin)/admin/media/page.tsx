"use client";
import { cn } from "@/lib/utils";

import { useState, useEffect, useRef } from "react";
import { UploadCloud, Trash2, File, Link as LinkIcon, HardDrive, CheckCircle2, Eye, X, FileImage, FileVideo, FileAudio, FileText, Presentation, CheckCircle, Search, LayoutGrid, List as ListIcon, Folder, FolderPlus, Edit2, MoveRight, ChevronRight, Pin , RefreshCw, Lock, Globe } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Pagination } from "@/components/ui/Pagination";
import { motion, AnimatePresence } from "framer-motion";

// ─── Preview helpers ──────────────────────────────────────────────────────────

type PreviewType = "image" | "video" | "audio" | "pdf" | "text" | "office" | "none";

function getPreviewType(mimeType: string, originalName: string): PreviewType {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "pdf";
  if (
    mimeType.startsWith("text/") ||
    ["application/json", "application/xml", "application/javascript",
     "application/typescript", "application/x-sh"].includes(mimeType)
  ) return "text";
  const officeExts = [".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".odt", ".ods", ".odp"];
  const ext = originalName.toLowerCase().slice(originalName.lastIndexOf("."));
  if (officeExts.includes(ext)) return "office";
  return "none";
}

function getFileIcon(mimeType: string, originalName: string, isFolder: boolean) {
  if (isFolder) return Folder;
  const type = getPreviewType(mimeType, originalName);
  switch (type) {
    case "image": return FileImage;
    case "video": return FileVideo;
    case "audio": return FileAudio;
    case "pdf":
    case "text": return FileText;
    case "office": return Presentation;
    default: return File;
  }
}

// ─── Image Viewer with zoom/pan ──────────────────────────────────────────────
function ImageViewer({ src, alt }: { src: string; alt: string }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const MIN = 0.5;
  const MAX = 8;
  const clampScale = (s: number) => Math.min(MAX, Math.max(MIN, s));

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setScale((s) => clampScale(s + delta * s));
  };
  const onMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !dragStart.current) return;
    setOffset({
      x: dragStart.current.ox + e.clientX - dragStart.current.x,
      y: dragStart.current.oy + e.clientY - dragStart.current.y,
    });
  };
  const onMouseUp = () => { setDragging(false); dragStart.current = null; };

  const lastTouches = useRef<React.TouchList | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { lastTouches.current = e.touches; };
  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2 && lastTouches.current && lastTouches.current.length === 2) {
      const prev = lastTouches.current;
      const prevDist = Math.hypot(prev[0].clientX - prev[1].clientX, prev[0].clientY - prev[1].clientY);
      const curDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const ratio = curDist / prevDist;
      setScale((s) => clampScale(s * ratio));
    } else if (e.touches.length === 1 && lastTouches.current && lastTouches.current.length === 1 && scale > 1) {
      const dx = e.touches[0].clientX - lastTouches.current[0].clientX;
      const dy = e.touches[0].clientY - lastTouches.current[0].clientY;
      setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
    }
    lastTouches.current = e.touches;
  };
  const reset = () => { setScale(1); setOffset({ x: 0, y: 0 }); };

  return (
    <div className="relative w-full flex flex-col" style={{ height: "75vh" }}>
      <div className={cn("absolute top-3 right-3 z-10 flex items-center gap-1 backdrop-blur-sm rounded-lg px-2 py-1", isDark ? "bg-black/60" : "bg-white/80 border border-slate-200 shadow-sm")}>
        <button onClick={() => setScale((s) => clampScale(s - 0.25))} className={cn("hover:text-cyan-400 px-2 py-1 text-lg font-bold transition-colors", isDark ? "text-white" : "text-slate-900")}>−</button>
        <span className={cn("text-xs w-12 text-center tabular-nums", isDark ? "text-zinc-300" : "text-slate-600")}>{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale((s) => clampScale(s + 0.25))} className={cn("hover:text-cyan-400 px-2 py-1 text-lg font-bold transition-colors", isDark ? "text-white" : "text-slate-900")}>+</button>
        <button onClick={reset} className={cn("hover:text-white text-xs px-2 py-1 border-l transition-colors ml-1", isDark ? "text-zinc-400 border-white/10" : "text-slate-500 border-slate-200")}>Reset</button>
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden flex items-center justify-center"
        style={{ cursor: scale > 1 ? (dragging ? "grabbing" : "grab") : "zoom-in" }}
        onWheel={onWheel} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={() => { lastTouches.current = null; }}
      >
        <img referrerPolicy="no-referrer"           src={src} alt={alt} draggable={false}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transition: dragging ? "none" : "transform 0.1s ease",
            maxWidth: "100%", maxHeight: "100%", objectFit: "contain", userSelect: "none",
          }}
        loading="lazy" decoding="async" />
      </div>
      <p className="text-center text-[11px] text-zinc-600 py-1.5">Scroll to zoom · Drag to pan · Pinch on touch</p>
    </div>
  );
}

function PreviewModal({ item, onClose, onToggleVisibility }: { item: any; onClose: () => void; onToggleVisibility?: (item: any) => void }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const mediaUrl = `/api/media/${item.token}?inline=true`;
  const type = getPreviewType(item.mimeType, item.originalName);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      <div className={cn("fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4", isDark ? "bg-black/80" : "bg-slate-900/40")} onClick={onClose}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={cn("relative w-full max-w-5xl max-h-[92vh] border rounded-2xl overflow-hidden shadow-2xl flex flex-col", isDark ? "bg-[#0a192f] border-cyan-500/30" : "bg-white border-slate-200")} onClick={(e) => e.stopPropagation()}>
          <div className={cn("flex items-center justify-between px-5 py-4 border-b shrink-0", isDark ? "border-white/10" : "border-slate-200")}>
            <div className="flex items-center gap-3 min-w-0">
              <Eye className={cn("w-5 h-5 shrink-0", isDark ? "text-cyan-400" : "text-cyan-700")} />
              <span className={cn("font-semibold truncate", isDark ? "text-white" : "text-slate-900")}>{item.originalName}</span>
              <span className="text-xs text-zinc-500 shrink-0">{item.mimeType}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              {item.isPublic !== undefined && (
                <button
                  type="button"
                  onClick={() => onToggleVisibility?.(item)}
                  title={item.isPublic === false ? "Private file (Click to make Public)" : "Public file (Click to make Private)"}
                  className={cn(
                    "text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer",
                    item.isPublic === false
                      ? "text-amber-400 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20"
                      : "text-cyan-400 bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/20"
                  )}
                >
                  {item.isPublic === false ? <Lock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                  {item.isPublic === false ? "Private" : "Public"}
                </button>
              )}
              <button onClick={onClose} className={cn("hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10 shrink-0", isDark ? "text-zinc-400" : "text-slate-500")}>
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        <div className={cn("flex-1 overflow-auto flex items-center justify-center min-h-0", isDark ? "bg-black/40" : "bg-slate-50")}>
          {type === "image" && <ImageViewer src={mediaUrl} alt={item.originalName} />}
          {type === "video" && (
            <video controls controlsList="nodownload" className="max-w-full max-h-[75vh]" onContextMenu={(e) => e.preventDefault()}>
              <source src={mediaUrl} type={item.mimeType} />
            </video>
          )}
          {type === "audio" && (
            <div className="p-8 flex flex-col items-center gap-6">
              <FileAudio className={cn("w-24 h-24 /50", isDark ? "text-cyan-400" : "text-cyan-700")} />
              <p className={cn("font-medium", isDark ? "text-zinc-300" : "text-slate-600")}>{item.originalName}</p>
              <audio controls controlsList="nodownload" className="w-full max-w-md">
                <source src={mediaUrl} type={item.mimeType} />
              </audio>
            </div>
          )}
          {type === "pdf" && (
            <div className="p-12 flex flex-col items-center gap-4 text-center">
              <FileText className="w-20 h-20 text-zinc-600" />
              <p className={cn("font-semibold text-lg", isDark ? "text-white" : "text-slate-900")}>PDF File</p>
              <p className={cn("text-sm max-w-xs", isDark ? "text-zinc-400" : "text-slate-500")}>Use the Copy Link button to share and open in a PDF viewer.</p>
            </div>
          )}
          {type === "text" && (
            <div className="p-12 flex flex-col items-center gap-4 text-center">
              <FileText className="w-20 h-20 text-zinc-600" />
              <p className={cn("font-semibold text-lg", isDark ? "text-white" : "text-slate-900")}>Text File</p>
              <p className={cn("text-sm max-w-xs", isDark ? "text-zinc-400" : "text-slate-500")}>Use the Copy Link button to share and download.</p>
            </div>
          )}
          {type === "office" && (
            <div className="p-12 flex flex-col items-center gap-4 text-center">
              <Presentation className="w-20 h-20 text-zinc-600" />
              <p className={cn("font-semibold text-lg", isDark ? "text-white" : "text-slate-900")}>Office Document</p>
              <p className={cn("text-sm max-w-xs", isDark ? "text-zinc-400" : "text-slate-500")}>Use the Copy Link button to share and open in your office app.</p>
            </div>
          )}
          {type === "none" && (
            <div className="p-12 flex flex-col items-center gap-4 text-center">
              <File className="w-20 h-20 text-zinc-600" />
              <p className={cn("font-semibold text-lg", isDark ? "text-white" : "text-slate-900")}>Preview not available</p>
              <p className={cn("text-sm max-w-xs", isDark ? "text-zinc-400" : "text-slate-500")}>This file type ({item.mimeType}) cannot be previewed in the browser.</p>
            </div>
          )}
        </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function AdminMediaLibrary() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [expiresIn, setExpiresIn] = useState("permanent");
  const [isPublicUpload, setIsPublicUpload] = useState(true);
  const [copiedToken, setCopiedToken] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewItem, setPreviewItem] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Folder state
  const [currentFolder, setCurrentFolder] = useState("/");
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showRenameModal, setShowRenameModal] = useState<any | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showMoveModal, setShowMoveModal] = useState<any | null>(null);
  const [moveDest, setMoveDest] = useState("/");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const folder = params.get("folder");
    if (folder && folder !== "/") {
      setCurrentFolder(folder);
    }
  }, []);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/secure-media?folder=${encodeURIComponent(currentFolder)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMedia(data);
    } catch (err: any) {
      toast.error("Failed to load secure media library");
    } finally {
      setLoading(false);
      setSelectedIds([]);
    }
  };

  useEffect(() => {
    fetchMedia();
    setCurrentPage(1);
  }, [currentFolder]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'a') {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        e.preventDefault();
        if (selectedIds.length === media.length && media.length > 0) setSelectedIds([]);
        else setSelectedIds(media.map(m => m.id));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [media, selectedIds]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const res = await fetch("/api/admin/secure-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mkdir", currentFolder, folderName: newFolderName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Folder created!");
      setShowCreateFolder(false);
      setNewFolderName("");
      fetchMedia();
    } catch (err: any) {
      toast.error(err.message || "Failed to create folder");
    }
  };

  const handleRename = async () => {
    if (!renameValue.trim() || !showRenameModal) return;
    try {
      const res = await fetch("/api/admin/secure-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rename", id: showRenameModal.id, newName: renameValue })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Renamed successfully!");
      setShowRenameModal(null);
      fetchMedia();
    } catch (err: any) {
      toast.error(err.message || "Failed to rename");
    }
  };

  const handleMove = async () => {
    if (!showMoveModal) return;
    const isBatch = showMoveModal === true;
    const idsToMove = isBatch ? selectedIds : [showMoveModal.id];
    let hasError = false;
    for (const id of idsToMove) {
      try {
        const res = await fetch("/api/admin/secure-media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "move", id, newFolderPath: moveDest })
        });
        if (!res.ok) hasError = true;
      } catch (err: any) {
        hasError = true;
      }
    }
    if (hasError) {
      toast.error("Failed to move some items");
    } else {
      toast.success("Moved successfully!");
    }
    setShowMoveModal(null);
    if (isBatch) setSelectedIds([]);
    fetchMedia();
  };

  const navigateTo = (path: string) => {
    setCurrentFolder(path);
    const params = new URLSearchParams(window.location.search);
    if (path === "/") params.delete("folder");
    else params.set("folder", path);
    window.history.pushState(null, "", `?${params.toString()}`);
  };

  const handleTogglePin = async (item: any) => {
    try {
      const res = await fetch("/api/admin/secure-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "togglePin", id: item.id, isPinned: !item.isPinned })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(item.isPinned ? "Unpinned successfully" : "Pinned successfully");
      fetchMedia();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle pin");
    }
  };

  const handleToggleVisibility = async (item: any) => {
    try {
      const nextStatus = item.isPublic === false ? true : false;
      const res = await fetch("/api/admin/secure-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggleVisibility", id: item.id, isPublic: nextStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(nextStatus ? "File is now Public" : "File is now Private");
      setMedia(prev => prev.map(m => m.id === item.id ? { ...m, isPublic: nextStatus } : m));
      if (previewItem && previewItem.id === item.id) {
        setPreviewItem((prev: any) => ({ ...prev, isPublic: nextStatus }));
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle visibility");
    }
  };

  const getBreadcrumbs = () => {
    const parts = currentFolder.split('/').filter(Boolean);
    const crumbs = [{ name: 'Home', path: '/' }];
    let current = '';
    parts.forEach(part => {
      current += '/' + part;
      crumbs.push({ name: part, path: current });
    });
    return crumbs;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    const validFiles = files.filter(f => f.size <= 5 * 1024 * 1024 * 1024);
    if (validFiles.length < files.length) {
      toast.error("Some files exceed 5GB limit and were skipped.");
    }
    if (validFiles.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setSelectedFiles(validFiles);
    setShowUploadModal(true);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      const validFiles = files.filter(f => f.size <= 5 * 1024 * 1024 * 1024);
      if (validFiles.length < files.length) {
        toast.error("Some files exceed 5GB limit and were skipped.");
      }
      if (validFiles.length === 0) return;
      setSelectedFiles(validFiles);
      setShowUploadModal(true);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setUploadProgress(0);

    const totalSize = selectedFiles.reduce((acc, file) => acc + file.size, 0);
    const uploadedBytes = new Array(selectedFiles.length).fill(0);

    const uploadPromises = selectedFiles.map((file, index) => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            uploadedBytes[index] = event.loaded;
            const totalUploaded = uploadedBytes.reduce((acc, curr) => acc + curr, 0);
            const percentCompleted = Math.round((totalUploaded * 100) / totalSize);
            setUploadProgress(percentCompleted);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(true);
          } else {
            reject(new Error("Failed to upload file"));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Network error"));
        });

        xhr.open("POST", "/api/admin/secure-media/upload-raw");
        
        // Base64 encode non-ascii headers
        xhr.setRequestHeader("x-upload-original-name", btoa(encodeURIComponent(file.name)));
        xhr.setRequestHeader("x-upload-mime-type", file.type || "application/octet-stream");
        xhr.setRequestHeader("x-upload-file-size", file.size.toString());
        xhr.setRequestHeader("x-upload-folder-path", btoa(encodeURIComponent(currentFolder)));
        xhr.setRequestHeader("x-upload-expires-in", expiresIn);
        xhr.setRequestHeader("x-upload-is-public", isPublicUpload ? "true" : "false");

        xhr.send(file);
      });
    });

    try {
      await Promise.all(uploadPromises);
      toast.success(`${selectedFiles.length} file(s) uploaded successfully!`);
      fetchMedia();
      setShowUploadModal(false);
    } catch (err) {
      toast.error("Failed to upload some files.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/secure-media?id=${deleteId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Deleted successfully!");
      setMedia(media.filter(m => m.id !== deleteId));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeletingAll(true);
    try {
      const res = await fetch("/api/admin/secure-media/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Deleted selected items successfully!");
      setShowDeleteAllModal(false);
      setSelectedIds([]);
      fetchMedia();
    } catch (err: any) {
      toast.error(err.message || "Failed to bulk delete");
    } finally {
      setIsDeletingAll(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === media.length && media.length > 0) setSelectedIds([]);
    else setSelectedIds(media.map(m => m.id));
  };
  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    else setSelectedIds([...selectedIds, id]);
  };
  const copyLink = (token: string) => {
    const url = `${window.location.origin}/media/${token}`;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = url;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (error) {
        console.error('Copy failed', error);
      }
      textArea.remove();
    }
    setCopiedToken(token);
    toast.success("Link copied!");
    setTimeout(() => setCopiedToken(""), 2000);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6 relative min-h-[calc(100vh-4rem)]" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      {isDragging && (
        <div className={cn("absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm border-4 border-dashed border-cyan-500 rounded-2xl m-6 transition-all pointer-events-none", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
          <div className={cn("text-center p-8 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.2)] border border-cyan-500/30", isDark ? "bg-[#011627]" : "bg-white")}>
            <UploadCloud className={cn("w-16 h-16 mx-auto mb-4 animate-bounce", isDark ? "text-cyan-500" : "text-cyan-700")} />
            <h2 className={cn("text-2xl font-extrabold mb-2", isDark ? "text-white" : "text-[#0F3B4A]")}>Drop file to upload</h2>
          </div>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row md:items-end justify-between gap-6 mb-6">
        <div>
          <h1 className={cn("text-3xl font-extrabold drop-shadow-sm mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Secure Media Library</h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Manage folders, upload encrypted files, and generate secure links.</p>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:min-w-[200px]">
            <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 /70", isDark ? "text-cyan-500" : "text-cyan-700")} />
            <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={cn("w-full border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-cyan-500/50 transition-all shadow-inner font-medium placeholder:text-zinc-500", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")} />
          </div>

          <div className={cn("flex border rounded-xl overflow-hidden shrink-0 shadow-inner", isDark ? "border-white/10" : "border-slate-200")}>
            <button onClick={() => setViewMode("grid")} className={`p-2.5 transition-colors ${viewMode === "grid" ? "bg-cyan-500 text-slate-900" : "text-zinc-400 hover:text-white"}`}><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => setViewMode("list")} className={`p-2.5 transition-colors ${viewMode === "list" ? "bg-cyan-500 text-slate-900" : "text-zinc-400 hover:text-white"}`}><ListIcon className="w-4 h-4" /></button>
          </div>

          <button onClick={toggleSelectAll} className={cn("bg-white/5 border hover:bg-white/10 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shrink-0 transition-all shadow-inner", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}>
            <CheckCircle2 className={`w-4 h-4 ${selectedIds.length === media.length && media.length > 0 ? 'text-cyan-400' : 'text-zinc-400'}`} /> Select All
          </button>

          {selectedIds.length > 0 && (
            <>
              <button onClick={() => { setShowMoveModal(true); setMoveDest(currentFolder); }} className={cn("bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shrink-0 transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] border border-cyan-400/20", isDark ? "text-white" : "text-slate-900")}>
                <MoveRight className="w-4 h-4 shrink-0" /> Move ({selectedIds.length})
              </button>
              <button onClick={() => setShowDeleteAllModal(true)} className={cn("bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shrink-0 transition-all shadow-inner", isDark ? "text-red-400" : "text-red-700")}>
                <Trash2 className="w-4 h-4 shrink-0" /> Delete ({selectedIds.length})
              </button>
            </>
          )}

          <button onClick={() => setShowCreateFolder(true)} className={cn("bg-white/5 border hover:bg-white/10 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shrink-0 transition-all shadow-inner", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}>
            <FolderPlus className={cn("w-4 h-4 shrink-0", isDark ? "text-cyan-400" : "text-cyan-700")} /> New Folder
          </button>

          <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className={cn("  px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-slate-900" : "bg-cyan-600 hover:bg-cyan-700 text-white")}>
            <UploadCloud className="w-4 h-4 shrink-0" /> Upload
          </button>
      </div>
      </div>

      {/* Breadcrumbs */}
      <motion.div variants={itemVariants} className={cn("flex items-center gap-2 mb-6 p-3.5 rounded-xl border overflow-x-auto whitespace-nowrap shadow-inner", isDark ? "border-white/10" : "border-slate-200")}>
        {getBreadcrumbs().map((crumb, idx) => (
          <div key={crumb.path} className="flex items-center gap-2">
            {idx > 0 && <ChevronRight className="w-4 h-4 text-zinc-500" />}
            <button 
              onClick={() => navigateTo(crumb.path)} 
              className={`text-sm font-bold transition-colors ${idx === getBreadcrumbs().length - 1 ? "text-cyan-400" : "text-zinc-400 hover:text-white"}`}
            >
              {crumb.name}
            </button>
          </div>
        ))}
      </motion.div>

      {loading ? (
        <div className="flex justify-center items-center h-64"><RefreshCw className={cn("w-10 h-10 animate-spin", isDark ? "text-cyan-500" : "text-cyan-700")} /></div>
      ) : (
        (() => {
          const filteredMedia = media.filter(item => item.originalName.toLowerCase().includes(searchQuery.toLowerCase()));
          const totalPages = Math.ceil(filteredMedia.length / ITEMS_PER_PAGE);
          const paginatedMedia = filteredMedia.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
          
          if (filteredMedia.length === 0) {
            return (
              <motion.div variants={itemVariants} className={cn("glass-card border rounded-2xl p-16 flex flex-col items-center justify-center text-center", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                <Folder className={cn("w-16 h-16 mb-6", isDark ? "text-zinc-500" : "text-slate-400")} />
                <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>Folder is empty</h3>
                <p className={cn("max-w-md", isDark ? "text-zinc-400" : "text-slate-500")}>Create a folder or upload secure files here.</p>
              </motion.div>
            );
          }

          return (
            <div className="flex flex-col gap-6">
              {viewMode === "grid" ? (
                <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {paginatedMedia.map((item) => {
                const FileIcon = getFileIcon(item.mimeType, item.originalName, item.isFolder);
                return (
                <div key={item.id} 
                     onClick={(e) => { if(e.ctrlKey) toggleSelect(item.id); else if(e.shiftKey) toggleSelect(item.id); }}
                     onDoubleClick={() => item.isFolder && navigateTo(`${currentFolder === '/' ? '' : currentFolder}/${item.originalName}`)}
                     className={`glass-card border ${selectedIds.includes(item.id) ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/5'} rounded-xl p-4 flex flex-col hover:border-cyan-500/30 hover:bg-white/[0.04] transition-all group cursor-pointer relative shadow-lg`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <button onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }} className={`w-5 h-5 border rounded flex items-center justify-center shrink-0 cursor-pointer transition-colors shadow-inner ${selectedIds.includes(item.id) ? 'bg-cyan-500 border-cyan-500' : isDark ? "border-white/10 group-hover:border-cyan-500/50" : "border-slate-300 group-hover:border-cyan-600"}`}>
                        {selectedIds.includes(item.id) && <CheckCircle className="w-3.5 h-3.5 text-slate-900" />}
                      </button>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner ${item.isFolder ? (isDark ? "bg-white/10 border-white/20 text-white" : "bg-slate-100 border-slate-300 text-slate-700") : (isDark ? "bg-white/5 border-white/10 text-zinc-300" : "bg-slate-50 border-slate-200 text-slate-600")}`}>
                        <FileIcon className="w-5 h-5" />
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 transition-opacity ${item.isPinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      {item.isFolder && (
                        <button onClick={(e) => { e.stopPropagation(); handleTogglePin(item); }} className={cn("p-1.5 rounded-lg transition-colors", item.isPinned ? (isDark ? "text-cyan-400" : "text-slate-800") : (isDark ? "text-zinc-400 hover:text-white hover:bg-white/10" : "text-slate-400 hover:text-slate-900 hover:bg-slate-100"))} title={item.isPinned ? "Unpin folder" : "Pin folder"}><Pin className={`w-3.5 h-3.5 ${item.isPinned ? "fill-current" : ""}`} /></button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); setShowRenameModal(item); setRenameValue(item.originalName); }} className={cn("p-1.5 rounded-lg transition-colors", isDark ? "text-zinc-400 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100")}><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={(e) => { e.stopPropagation(); setShowMoveModal(item); setMoveDest(currentFolder); }} className={cn("p-1.5 rounded-lg transition-colors", isDark ? "text-zinc-400 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100")}><MoveRight className="w-3.5 h-3.5" /></button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteId(item.id); }} className={cn("p-1.5 rounded-lg transition-colors", isDark ? "text-zinc-400 hover:text-red-400 hover:bg-red-500/10" : "text-slate-500 hover:text-red-600 hover:bg-red-50")}><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  
                  <h3 className={cn("font-bold text-sm mb-1 truncate", isDark ? "text-white" : "text-slate-900")} title={item.originalName}>{item.originalName}</h3>
                  {!item.isFolder ? (
                    <div className="flex items-end justify-between mt-auto pt-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-zinc-500">{formatBytes(item.size)}</span>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          {item.expiresAt ? (
                            <span className="text-[10px] font-bold tracking-wider uppercase text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded border border-orange-400/20 w-fit">Exp: {new Date(item.expiresAt).toLocaleDateString()}</span>
                          ) : (
                            <span className="text-[10px] font-bold tracking-wider uppercase text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded border border-green-400/20 w-fit">Permanent</span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleToggleVisibility(item); }}
                            title={item.isPublic === false ? "Private (Click to make Public)" : "Public (Click to make Private)"}
                            className={cn(
                              "text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded border flex items-center gap-1 transition-all cursor-pointer",
                              item.isPublic === false
                                ? "text-amber-400 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40"
                                : "text-cyan-400 bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20 hover:border-cyan-500/40"
                            )}
                          >
                            {item.isPublic === false ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                            {item.isPublic === false ? "Private" : "Public"}
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-1 pb-1">
                        {getPreviewType(item.mimeType, item.originalName) !== "none" && (
                          <button onClick={(e) => { e.stopPropagation(); setPreviewItem(item); }} className={cn("p-1.5 rounded-lg hover:bg-cyan-500/10 transition-colors", isDark ? "text-cyan-400" : "text-cyan-700")}><Eye className="w-4 h-4" /></button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); copyLink(item.token); }} className={cn("p-1.5 rounded-lg hover:bg-cyan-500/10 transition-colors", isDark ? "text-cyan-400" : "text-cyan-700")}><LinkIcon className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-end justify-between mt-auto pt-2">
                      <div className="flex flex-col">
                        <span className={cn("text-xs font-bold", isDark ? "text-zinc-400" : "text-slate-600")}>{item.itemCount || 0} items</span>
                        <span className="text-[10px] font-medium text-zinc-500 mt-0.5">{formatBytes(item.folderSize || 0)}</span>
                      </div>
                    </div>
                  )}
                </div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div variants={itemVariants} className="glass-card overflow-hidden">
               <table className="w-full text-left text-sm">
                  <thead className={cn("bg-black/40 border-b text-[10px] text-zinc-500 uppercase tracking-wider font-bold", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                    <tr>
                      <th className="px-5 py-4 w-12 whitespace-nowrap">
                        <button onClick={(e) => { e.stopPropagation(); toggleSelectAll(); }} className={`w-5 h-5 border rounded flex items-center justify-center cursor-pointer transition-colors shadow-inner ${selectedIds.length === media.length && media.length > 0 ? 'bg-cyan-500 border-cyan-500' : isDark ? "bg-white/5 border-white/10 hover:border-cyan-500/50" : "bg-slate-100 border-slate-300 hover:border-cyan-600"}`}>
                          {selectedIds.length === media.length && media.length > 0 && <CheckCircle className="w-3.5 h-3.5 text-slate-900" />}
                        </button>
                      </th>
                      <th className="px-5 py-4 font-bold whitespace-nowrap">Name</th>
                      <th className="px-5 py-4 font-bold whitespace-nowrap">Size</th>
                      <th className="px-5 py-4 font-bold whitespace-nowrap">Status</th>
                      <th className="px-5 py-4 font-bold text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={cn("divide-y", isDark ? "divide-white/5" : "divide-slate-200")}>
                    {paginatedMedia.map(item => {
                      const FileIcon = getFileIcon(item.mimeType, item.originalName, item.isFolder);
                      return (
                        <tr key={item.id} onClick={(e) => { if(e.ctrlKey) toggleSelect(item.id); else if(e.shiftKey) toggleSelect(item.id); }} className={`transition-colors cursor-pointer group ${selectedIds.includes(item.id) ? 'bg-cyan-500/10' : 'hover:bg-white/[0.03]'}`} onDoubleClick={() => item.isFolder && navigateTo(`${currentFolder === '/' ? '' : currentFolder}/${item.originalName}`)}>
                          <td className="px-5 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <button onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }} className={`w-5 h-5 border rounded flex items-center justify-center cursor-pointer transition-colors shadow-inner ${selectedIds.includes(item.id) ? 'bg-cyan-500 border-cyan-500' : isDark ? "bg-white/5 border-white/10 group-hover:border-cyan-500/50" : "bg-slate-100 border-slate-300 group-hover:border-cyan-600"}`}>
                              {selectedIds.includes(item.id) && <CheckCircle className="w-3.5 h-3.5 text-slate-900" />}
                            </button>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border shadow-inner ${item.isFolder ? (isDark ? "bg-white/10 border-white/20 text-white" : "bg-slate-100 border-slate-300 text-slate-700") : (isDark ? "bg-white/5 border-white/10 text-zinc-400" : "bg-slate-50 border-slate-200 text-slate-500")}`}>
                                <FileIcon className="w-4 h-4" />
                              </div>
                              <span className={cn("font-bold truncate max-w-[300px] cursor-pointer group-hover:text-cyan-400 transition-colors", isDark ? "text-white" : "text-slate-900")}>{item.originalName}</span>
                            </div>
                          </td>
                          <td className={cn("px-5 py-4 font-medium whitespace-nowrap", isDark ? "text-zinc-400" : "text-slate-500")}>{item.isFolder ? formatBytes(item.folderSize || 0) : formatBytes(item.size)}</td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            {item.isFolder ? (
                              <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border", isDark ? "bg-white/5 border-white/10 text-zinc-400" : "bg-slate-100 border-slate-200 text-slate-600")}>{item.itemCount || 0} items</span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                {item.expiresAt ? (
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400 bg-orange-400/10 px-2 py-1 rounded border border-orange-400/20">Exp: {new Date(item.expiresAt).toLocaleDateString()}</span>
                                ) : (
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-green-400 bg-green-400/10 px-2 py-1 rounded border border-green-400/20">Permanent</span>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleToggleVisibility(item); }}
                                  title={item.isPublic === false ? "Private (Click to make Public)" : "Public (Click to make Private)"}
                                  className={cn(
                                    "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border flex items-center gap-1 transition-all cursor-pointer",
                                    item.isPublic === false
                                      ? "text-amber-400 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20"
                                      : "text-cyan-400 bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20"
                                  )}
                                >
                                  {item.isPublic === false ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                                  {item.isPublic === false ? "Private" : "Public"}
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {item.isFolder && (
                                <button onClick={(e) => { e.stopPropagation(); handleTogglePin(item); }} className={cn("p-1.5 rounded-lg transition-colors", item.isPinned ? (isDark ? "text-cyan-400" : "text-slate-800") : (isDark ? "text-zinc-400 hover:text-white hover:bg-white/10" : "text-slate-400 hover:text-slate-900 hover:bg-slate-100"))} title={item.isPinned ? "Unpin folder" : "Pin folder"}><Pin className={`w-4 h-4 ${item.isPinned ? "fill-current" : ""}`} /></button>
                              )}
                              <button onClick={(e) => { e.stopPropagation(); setShowRenameModal(item); setRenameValue(item.originalName); }} className={cn("p-1.5 rounded-lg transition-colors", isDark ? "text-zinc-400 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100")}><Edit2 className="w-4 h-4" /></button>
                              <button onClick={(e) => { e.stopPropagation(); setShowMoveModal(item); setMoveDest(currentFolder); }} className={cn("p-1.5 rounded-lg transition-colors", isDark ? "text-zinc-400 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100")}><MoveRight className="w-4 h-4" /></button>
                              {!item.isFolder && (
                                <>
                                  <button onClick={(e) => { e.stopPropagation(); handleToggleVisibility(item); }} className={cn("p-1.5 rounded-lg hover:bg-white/10 transition-colors", item.isPublic === false ? "text-amber-400 hover:text-amber-300" : "text-cyan-400 hover:text-cyan-300")} title={item.isPublic === false ? "Make Public" : "Make Private"}>
                                    {item.isPublic === false ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                                  </button>
                                  <button onClick={() => copyLink(item.token)} className={cn("p-1.5 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-300", isDark ? "text-cyan-400" : "text-cyan-700")}><LinkIcon className="w-4 h-4" /></button>
                                  {getPreviewType(item.mimeType, item.originalName) !== "none" && (
                                    <button onClick={() => setPreviewItem(item)} className={cn("p-1.5 rounded-lg hover:bg-cyan-500/10 hover:text-cyan-300", isDark ? "text-cyan-400" : "text-cyan-700")}><Eye className="w-4 h-4" /></button>
                                  )}
                                </>
                              )}
                              <button onClick={() => setDeleteId(item.id)} className={cn("p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-300", isDark ? "text-red-400" : "text-red-700")}><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
               </table>
            </motion.div>
          )}

              {totalPages > 1 && (
                <div className={cn("p-4 border-t rounded-xl mt-4", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
              )}
            </div>
          );
        })()
      )}

      <AnimatePresence>
      {showCreateFolder && (
        <div className={cn("fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm px-4", isDark ? "bg-black/80" : "bg-slate-900/40")}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={cn("border p-6 md:p-8 rounded-2xl w-full max-w-sm shadow-2xl relative", isDark ? "bg-[#0a192f] border-cyan-500/30" : "bg-white border-slate-200")}>
            <h3 className={cn("text-xl font-extrabold mb-6 border-b pb-4", isDark ? "text-white border-white/10" : "text-slate-900 border-slate-200")}>Create Folder</h3>
            <label className={cn("text-xs font-bold uppercase tracking-widest block mb-2", isDark ? "text-zinc-400" : "text-slate-500")}>Folder Name *</label>
            <input autoFocus type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="e.g. Assets" className={cn("w-full border rounded-xl px-5 py-3.5 font-bold mb-6 focus:outline-none focus:border-cyan-500/50 transition-all shadow-inner", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")} />
            <div className={cn("flex justify-end gap-3 pt-2 border-t mt-2", isDark ? "border-white/10" : "border-slate-200")}>
              <button onClick={() => setShowCreateFolder(false)} className={cn("px-5 py-2.5 rounded-xl font-bold hover:text-white hover:bg-white/5 transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}>Cancel</button>
              <button onClick={handleCreateFolder} className={cn("px-6 py-2.5 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-slate-900" : "bg-cyan-600 hover:bg-cyan-700 text-white")}>Create</button>
            </div>
          </motion.div>
        </div>
      )}

      {showRenameModal && (
        <div className={cn("fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm px-4", isDark ? "bg-black/80" : "bg-slate-900/40")}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={cn("border p-6 md:p-8 rounded-2xl w-full max-w-sm shadow-2xl relative", isDark ? "bg-[#0a192f] border-cyan-500/30" : "bg-white border-slate-200")}>
            <h3 className={cn("text-xl font-extrabold mb-6 border-b pb-4", isDark ? "text-white border-white/10" : "text-slate-900 border-slate-200")}>Rename</h3>
            <label className={cn("text-xs font-bold uppercase tracking-widest block mb-2", isDark ? "text-zinc-400" : "text-slate-500")}>New Name *</label>
            <input autoFocus type="text" value={renameValue} onChange={e => setRenameValue(e.target.value)} className={cn("w-full border rounded-xl px-5 py-3.5 font-bold mb-6 focus:outline-none focus:border-cyan-500/50 transition-all shadow-inner", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")} />
            <div className={cn("flex justify-end gap-3 pt-2 border-t mt-2", isDark ? "border-white/10" : "border-slate-200")}>
              <button onClick={() => setShowRenameModal(null)} className={cn("px-5 py-2.5 rounded-xl font-bold hover:text-white hover:bg-white/5 transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}>Cancel</button>
              <button onClick={handleRename} className={cn("px-6 py-2.5 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-slate-900" : "bg-cyan-600 hover:bg-cyan-700 text-white")}>Rename</button>
            </div>
          </motion.div>
        </div>
      )}

      {showMoveModal && (
        <div className={cn("fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm px-4", isDark ? "bg-black/80" : "bg-slate-900/40")}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={cn("border p-6 md:p-8 rounded-2xl w-full max-w-sm shadow-2xl relative", isDark ? "bg-[#0a192f] border-cyan-500/30" : "bg-white border-slate-200")}>
            <h3 className={cn("text-xl font-extrabold mb-6 border-b pb-4", isDark ? "text-white border-white/10" : "text-slate-900 border-slate-200")}>Move Items</h3>
            <label className={cn("text-xs font-bold uppercase tracking-widest block mb-2", isDark ? "text-zinc-400" : "text-slate-500")}>Destination Path *</label>
            <input autoFocus type="text" value={moveDest} onChange={e => setMoveDest(e.target.value)} placeholder="e.g. /images" className={cn("w-full border rounded-xl px-5 py-3.5 font-bold mb-6 focus:outline-none focus:border-cyan-500/50 transition-all shadow-inner", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")} />
            <div className={cn("flex justify-end gap-3 pt-2 border-t mt-2", isDark ? "border-white/10" : "border-slate-200")}>
              <button onClick={() => setShowMoveModal(null)} className={cn("px-5 py-2.5 rounded-xl font-bold hover:text-white hover:bg-white/5 transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}>Cancel</button>
              <button onClick={handleMove} className={cn("px-6 py-2.5 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-slate-900" : "bg-cyan-600 hover:bg-cyan-700 text-white")}>Move</button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDeleteConfirm} title="Delete File/Folder?" description="This will be permanently deleted. Folders must be empty to be deleted." confirmText="Delete" isLoading={isDeleting} variant="danger" />
      <ConfirmModal isOpen={showDeleteAllModal} onClose={() => setShowDeleteAllModal(false)} onConfirm={handleBulkDelete} title={`Delete ${selectedIds.length} item(s)?`} description="Selected items will be permanently deleted. This action cannot be undone." confirmText="Delete Selected" isLoading={isDeletingAll} variant="danger" />

      {previewItem && <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} onToggleVisibility={handleToggleVisibility} />}

      <AnimatePresence>
      {showUploadModal && selectedFiles.length > 0 && (
        <div className={cn("fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-sm", isDark ? "bg-black/80" : "bg-slate-900/40")}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={cn("border rounded-2xl p-6 md:p-8 w-full max-w-md shadow-2xl relative", isDark ? "bg-[#0a192f] border-cyan-500/30" : "bg-white border-slate-200")}>
            <h2 className={cn("text-xl font-extrabold mb-2", isDark ? "text-white" : "text-slate-900")}>Upload Settings</h2>
            <p className={cn("text-sm font-medium mb-6", isDark ? "text-zinc-400" : "text-slate-500")}>Uploading {selectedFiles.length} file(s) to: <span className={cn("font-mono tracking-tight px-1.5 py-0.5 rounded border", isDark ? "bg-white/10 border-white/20 text-white" : "bg-slate-200 border-slate-300 text-slate-800")}>{currentFolder}</span></p>

            <div className={cn("mb-6 p-4 rounded-xl border max-h-40 overflow-y-auto shadow-inner", isDark ? "border-white/10" : "border-slate-200")}>
              {selectedFiles.map((file, idx) => (
                <div key={idx} className={cn("flex items-center justify-between mb-3 last:mb-0 p-2 rounded-lg border", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                  <div className={cn("flex items-center gap-3 min-w-0 pr-2", isDark ? "text-white" : "text-slate-900")}>
                    <File className={cn("w-4 h-4 shrink-0", isDark ? "text-cyan-500" : "text-cyan-700")} />
                    <span className="font-bold truncate text-sm" title={file.name}>{file.name}</span>
                  </div>
                  <div className="text-xs font-bold text-zinc-500 shrink-0 px-2 py-1 rounded">{formatBytes(file.size)}</div>
                </div>
              ))}
            </div>

            <div className="mb-5 space-y-2">
              <label className={cn("text-xs font-bold uppercase tracking-widest block", isDark ? "text-zinc-400" : "text-slate-500")}>Visibility</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsPublicUpload(true)}
                  disabled={uploading}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all",
                    isPublicUpload
                      ? "bg-cyan-500/15 border-cyan-500 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                      : isDark ? "bg-[#0A0B1A] border-white/10 text-zinc-400 hover:text-white" : "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900"
                  )}
                >
                  <Globe className="w-3.5 h-3.5" />
                  Public
                </button>
                <button
                  type="button"
                  onClick={() => setIsPublicUpload(false)}
                  disabled={uploading}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all",
                    !isPublicUpload
                      ? "bg-amber-500/15 border-amber-500 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                      : isDark ? "bg-[#0A0B1A] border-white/10 text-zinc-400 hover:text-white" : "bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900"
                  )}
                >
                  <Lock className="w-3.5 h-3.5" />
                  Private
                </button>
              </div>
              <p className="text-[11px] text-zinc-500">
                {isPublicUpload ? "Public: Anyone with the link can access and view this file." : "Private: Only authorized administrators can access this file."}
              </p>
            </div>

            <div className="mb-8 space-y-3">
              <label className={cn("text-xs font-bold uppercase tracking-widest block", isDark ? "text-zinc-400" : "text-slate-500")}>Link Expiration</label>
              <select value={expiresIn} onChange={(e) => setExpiresIn(e.target.value)} disabled={uploading} className={cn("w-full border font-bold rounded-xl focus:outline-none focus:border-cyan-500/50 transition-all shadow-inner block p-3.5 appearance-none", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}>
                <option value="1d" className={cn(isDark ? "bg-[#0a192f] text-white" : "bg-white text-slate-900")}>Expires in 1 Day</option>
                <option value="1w" className={cn(isDark ? "bg-[#0a192f] text-white" : "bg-white text-slate-900")}>Expires in 1 Week</option>
                <option value="1m" className={cn(isDark ? "bg-[#0a192f] text-white" : "bg-white text-slate-900")}>Expires in 1 Month</option>
                <option value="permanent" className={cn(isDark ? "bg-[#0a192f] text-white" : "bg-white text-slate-900")}>Permanent</option>
              </select>
            </div>

            {uploading && (
              <div className={cn("mb-6 space-y-2 p-4 rounded-xl border shadow-inner", isDark ? "border-white/10" : "border-slate-200")}>
                <div className={cn("flex justify-between text-xs font-extrabold tracking-widest uppercase", isDark ? "text-cyan-400" : "text-cyan-700")}>
                  <span>Uploading...</span><span>{uploadProgress}%</span>
                </div>
                <div className={cn("w-full rounded-full h-2 overflow-hidden shadow-inner", isDark ? "bg-black/40" : "bg-slate-200")}>
                  <div className="bg-gradient-to-r from-cyan-500 to-cyan-500 h-2 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.5)]" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            <div className={cn("flex justify-end gap-3 pt-2 border-t mt-2", isDark ? "border-white/10" : "border-slate-200")}>
              <button onClick={() => { setShowUploadModal(false); setSelectedFiles([]); if (fileInputRef.current) fileInputRef.current.value = ""; }} disabled={uploading} className={cn("px-5 py-2.5 rounded-xl font-bold hover:text-white hover:bg-white/5 transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}>Cancel</button>
              <button onClick={handleUpload} disabled={uploading} className={cn("px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] disabled:opacity-50", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-slate-900" : "bg-cyan-600 hover:bg-cyan-700 text-white")}>
                {uploading ? <div className={cn("w-4 h-4 border-2 border-t-white rounded-full animate-spin", isDark ? "border-white/30" : "border-slate-200")} /> : <UploadCloud className="w-4 h-4" />} Upload
              </button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </motion.div>
  );
}
