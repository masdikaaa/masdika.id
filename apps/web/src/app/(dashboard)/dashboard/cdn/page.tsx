'use client';

import { useUrlNumber, useUrlString } from "@/lib/useUrlTab";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { UploadCloud, Trash2, File, Link as LinkIcon, HardDrive, CheckCircle2, Eye, X, FileImage, FileVideo, FileAudio, FileText, Presentation, CheckCircle, Search, LayoutGrid, List as ListIcon, Folder, FolderPlus, Edit2, MoveRight, ChevronRight, Loader2, Cloud, RefreshCw, AlertTriangle, Lock, Globe, MessageSquareQuote } from "lucide-react";
import Link from "next/link";
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
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-black/60  rounded-lg px-2 py-1">
        <button onClick={() => setScale((s) => clampScale(s - 0.25))} className={cn("hover:text-cyan-400 px-2 py-1 text-lg font-bold transition-colors", isDark ? "text-white" : "text-slate-900")}>−</button>
        <span className={cn("text-xs w-12 text-center tabular-nums", isDark ? "text-zinc-300" : "text-slate-500")}>{Math.round(scale * 100)}%</span>
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
      <p className={cn("text-center text-[11px] py-1.5", isDark ? "text-zinc-600" : "text-slate-900")}>Scroll to zoom · Drag to pan · Pinch on touch</p>
    </div>
  );
}

// ─── Preview Modal ────────────────────────────────────────────────────────────
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={cn("relative w-full max-w-5xl max-h-[92vh] border rounded-2xl overflow-hidden shadow-2xl flex flex-col", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90")} onClick={(e) => e.stopPropagation()}>
        <div className={cn("flex items-center justify-between px-5 py-4 border-b shrink-0", isDark ? "border-white/[0.08]" : "border-slate-200/90")}>
          <div className="flex items-center gap-3 min-w-0">
            <Eye className="w-5 h-5 text-cyan-400 shrink-0" />
            <span className={cn("font-semibold truncate", isDark ? "text-white" : "text-slate-900")}>{item.originalName}</span>
            <span className={cn("text-[10px] uppercase tracking-wider font-bold bg-white/5 px-2 py-0.5 rounded shrink-0", isDark ? "text-zinc-400" : "text-slate-500")}>{item.mimeType}</span>
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
        <div className="flex-1 overflow-auto flex items-center justify-center bg-black/40 min-h-0 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none" />
          {type === "image" && <ImageViewer src={mediaUrl} alt={item.originalName} />}
          {type === "video" && (
            <video controls controlsList="nodownload" className="max-w-full max-h-[75vh]" onContextMenu={(e) => e.preventDefault()} playsInline>
              <source src={mediaUrl} type={item.mimeType === "video/quicktime" ? "video/mp4" : item.mimeType} />
              {item.mimeType === "video/quicktime" && <source src={mediaUrl} type="video/quicktime" />}
            </video>
          )}
          {type === "audio" && (
            <div className="p-8 flex flex-col items-center gap-6">
              <div className="w-32 h-32 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                 <FileAudio className="w-16 h-16 text-cyan-400" />
              </div>
              <p className={cn("font-medium", isDark ? "text-zinc-300" : "text-slate-500")}>{item.originalName}</p>
              <audio controls controlsList="nodownload" className="w-full max-w-md">
                <source src={mediaUrl} type={item.mimeType} />
              </audio>
            </div>
          )}
          {type === "pdf" && (
            <div className="p-12 flex flex-col items-center gap-4 text-center">
              <div className="w-24 h-24 rounded-2xl bg-white/5 flex items-center justify-center">
                 <FileText className={cn("w-12 h-12", isDark ? "text-zinc-400" : "text-slate-500")} />
              </div>
              <p className={cn("font-bold text-lg mt-2", isDark ? "text-white" : "text-slate-900")}>PDF Document</p>
              <p className={cn("text-sm max-w-xs", isDark ? "text-zinc-400" : "text-slate-500")}>Use the Copy Link button to share and open in a PDF viewer.</p>
            </div>
          )}
          {type === "text" && (
            <div className="p-12 flex flex-col items-center gap-4 text-center">
              <div className="w-24 h-24 rounded-2xl bg-white/5 flex items-center justify-center">
                 <FileText className={cn("w-12 h-12", isDark ? "text-zinc-400" : "text-slate-500")} />
              </div>
              <p className={cn("font-bold text-lg mt-2", isDark ? "text-white" : "text-slate-900")}>Text File</p>
              <p className={cn("text-sm max-w-xs", isDark ? "text-zinc-400" : "text-slate-500")}>Use the Copy Link button to share and view this file.</p>
            </div>
          )}
          {type === "office" && (
            <div className="p-12 flex flex-col items-center gap-4 text-center">
              <div className="w-24 h-24 rounded-2xl bg-white/5 flex items-center justify-center">
                 <Presentation className={cn("w-12 h-12", isDark ? "text-zinc-400" : "text-slate-500")} />
              </div>
              <p className={cn("font-bold text-lg mt-2", isDark ? "text-white" : "text-slate-900")}>Office Document</p>
              <p className={cn("text-sm max-w-xs", isDark ? "text-zinc-400" : "text-slate-500")}>Use the Copy Link button to share and open in your office app.</p>
            </div>
          )}
          {type === "none" && (
            <div className="p-12 flex flex-col items-center gap-4 text-center">
              <div className="w-24 h-24 rounded-2xl bg-white/5 flex items-center justify-center">
                 <File className={cn("w-12 h-12", isDark ? "text-zinc-400" : "text-slate-500")} />
              </div>
              <p className={cn("font-bold text-lg mt-2", isDark ? "text-white" : "text-slate-900")}>Preview not available</p>
              <p className={cn("text-sm max-w-xs", isDark ? "text-zinc-400" : "text-slate-500")}>This file type ({item.mimeType}) cannot be previewed in the browser.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
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

export default function UserCDNLibrary() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(true);
  const [storageQuota, setStorageQuota] = useState<{usedBytes: number, limitBytes: number, limitGB: number} | null>(null);
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
  const [searchQuery, setSearchQuery] = useUrlString<string>("searchQuery", "");
  const [viewMode, setViewMode] = useUrlString<"grid" | "list">("viewMode", "grid", ["grid", "list"] as const);
  const [page, setPage] = useUrlNumber("page", 1);
  const itemsPerPage = 10;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Folder state
  const [currentFolder, setCurrentFolder] = useUrlString<string>("currentFolder", "/");
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showRenameModal, setShowRenameModal] = useState<any | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showMoveModal, setShowMoveModal] = useState<any | null>(null);
  const [moveDest, setMoveDest] = useState("/");

  const [isSuspended, setIsSuspended] = useState(false);

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
      const res = await fetch(`/api/user/cdn?folder=${encodeURIComponent(currentFolder)}`);
      const data = await res.json();
      if (res.status === 403) {
        setHasAccess(false);
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error(data.error);
      setMedia(data.data || []);
      setIsSuspended(!!data.isSuspended);
    } catch (err: any) {
      toast.error("Failed to load CDN library");
    } finally {
      setLoading(false);
      setSelectedIds([]);
    }
    
    try {
      const quotaRes = await fetch("/api/user/cdn/quota");
      if (quotaRes.ok) {
        const quotaData = await quotaRes.json();
        setStorageQuota(quotaData);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchMedia();
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
      const res = await fetch("/api/user/cdn", {
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
      const res = await fetch("/api/user/cdn", {
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
        const res = await fetch("/api/user/cdn", {
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

  const handleToggleVisibility = async (item: any) => {
    try {
      const nextStatus = item.isPublic === false ? true : false;
      const res = await fetch("/api/user/cdn", {
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
    const validFiles = files.filter(f => f.size <= 100 * 1024 * 1024);
    if (validFiles.length < files.length) {
      toast.error("Some files exceed 100MB limit and were skipped.");
    }
    if (validFiles.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    
    if (storageQuota && storageQuota.limitBytes > 0) {
      const totalSize = validFiles.reduce((acc, file) => acc + file.size, 0);
      if (storageQuota.usedBytes + totalSize > storageQuota.limitBytes) {
        toast.error(`Storage quota exceeded. Your plan limit is ${storageQuota.limitGB} GB.`);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
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
      const validFiles = files.filter(f => f.size <= 100 * 1024 * 1024);
      if (validFiles.length < files.length) {
        toast.error("Some files exceed 100MB limit and were skipped.");
      }
      if (validFiles.length === 0) return;
      
      if (storageQuota && storageQuota.limitBytes > 0) {
        const totalSize = validFiles.reduce((acc, file) => acc + file.size, 0);
        if (storageQuota.usedBytes + totalSize > storageQuota.limitBytes) {
          toast.error(`Storage quota exceeded. Your plan limit is ${storageQuota.limitGB} GB.`);
          return;
        }
      }
      
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
    const CHUNK_SIZE = 40 * 1024 * 1024; // 40MB per chunk — safely under Cloudflare's 100MB edge limit

    const uploadFile = async (file: File, fileIndex: number) => {
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE) || 1;
      const uploadToken = crypto.randomUUID();

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunkBlob = file.slice(start, end);

        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              const currentChunkLoaded = start + event.loaded;
              uploadedBytes[fileIndex] = currentChunkLoaded;
              const totalUploaded = uploadedBytes.reduce((acc, curr) => acc + curr, 0);
              const percentCompleted = Math.round((totalUploaded * 100) / totalSize);
              setUploadProgress(percentCompleted);
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(true);
            } else {
              try {
                const res = JSON.parse(xhr.responseText);
                reject(new Error(res.error || `Upload failed with status ${xhr.status}`));
              } catch {
                reject(new Error(`Upload failed with status ${xhr.status}`));
              }
            }
          });

          xhr.addEventListener("error", () => {
            reject(new Error("Network error"));
          });

          xhr.open("POST", "/api/user/cdn/upload-raw");

          // Chunking & Metadata headers
          xhr.setRequestHeader("x-upload-token", uploadToken);
          xhr.setRequestHeader("x-upload-chunk-index", chunkIndex.toString());
          xhr.setRequestHeader("x-upload-total-chunks", totalChunks.toString());
          xhr.setRequestHeader("x-upload-original-name", btoa(encodeURIComponent(file.name)));
          xhr.setRequestHeader("x-upload-mime-type", file.type || "application/octet-stream");
          xhr.setRequestHeader("x-upload-file-size", file.size.toString());
          xhr.setRequestHeader("x-upload-folder-path", btoa(encodeURIComponent(currentFolder)));
          xhr.setRequestHeader("x-upload-expires-in", expiresIn);
          xhr.setRequestHeader("x-upload-is-public", isPublicUpload ? "true" : "false");

          xhr.send(chunkBlob);
        });
      }
    };

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        await uploadFile(selectedFiles[i], i);
      }
      toast.success(`${selectedFiles.length} file(s) uploaded successfully!`);
      fetchMedia();
      setShowUploadModal(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload some files.");
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
      const res = await fetch(`/api/user/cdn?id=${deleteId}`, { method: "DELETE" });
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
      const res = await fetch("/api/user/cdn/bulk-delete", {
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
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center">
        <RefreshCw className="w-10 h-10 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div className="space-y-6 pb-10 w-full" variants={containerVariants} initial="hidden" animate="visible" onDragOver={hasAccess ? handleDragOver : undefined} onDragLeave={hasAccess ? handleDragLeave : undefined} onDrop={hasAccess ? handleDrop : undefined}>
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              File CDN
            </h1>
            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <Cloud className="w-3 h-3" /> Global Edge Network
            </span>
          </div>
          <p className={cn("text-xs sm:text-sm max-w-xl", isDark ? "text-zinc-400" : "text-slate-500")}>
            Manage folders, upload encrypted files, and generate secure delivery links instantly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end shrink-0">
          {storageQuota && (
            <div className={cn("px-3.5 py-2 rounded-xl border flex items-center gap-3", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
              <span className={cn("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Storage:</span>
              <span className={cn("text-xs sm:text-sm font-bold", isDark ? "text-white" : "text-slate-900")}>
                {storageQuota.limitBytes > 0 ? `${(storageQuota.limitBytes / (1024 * 1024 * 1024)).toFixed(2)} GB` : "Unlimited"}
              </span>
            </div>
          )}
          <Link
            href="/dashboard/cdn/reviews"
            className={cn(
              "inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer flex-1 sm:flex-initial",
              isDark
                ? "bg-cyan-500/10 border-cyan-500/25 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500/40"
                : "bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100"
            )}
          >
            <MessageSquareQuote className="w-3.5 h-3.5" />
            <span>Media Reviews & Comments</span>
          </Link>
        </div>
      </motion.div>

      {!hasAccess ? (
        <motion.div variants={itemVariants}>
          <div className={cn("rounded-2xl p-8 sm:p-12 text-center border", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 border", isDark ? "bg-white/[0.02] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")}>
              <Cloud className={cn("w-8 h-8", isDark ? "text-zinc-500" : "text-slate-500")} />
            </div>
            <h4 className={cn("text-lg sm:text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No Active Subscription</h4>
            <p className={cn("text-xs sm:text-sm max-w-md mx-auto mb-6 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
              You need an active File CDN subscription to start managing, hosting, and delivering your files securely.
            </p>
            <Link href="/dashboard/checkout?service=CDN" className="inline-flex items-center justify-center bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 font-bold py-2.5 px-5 rounded-xl text-xs sm:text-sm transition-all shadow-sm">
              View Plans
            </Link>
          </div>
        </motion.div>
      ) : (
        <>
          {isSuspended && (
            <motion.div variants={itemVariants} className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 sm:p-5 mb-6 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-11 h-11 bg-red-500/20 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h4 className="text-base font-bold text-red-400">Service Suspended</h4>
                <p className={cn("text-xs sm:text-sm mt-1", isDark ? "text-zinc-300" : "text-slate-500")}>Your File CDN service is suspended. Please resolve any pending invoices to restore full access. You cannot upload, modify, or share files.</p>
              </div>
              <Link href="/dashboard/billing" className="bg-red-500 hover:bg-red-600 font-bold py-2.5 px-5 rounded-xl text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0 text-white">
                View Billing
              </Link>
            </motion.div>
          )}
      <AnimatePresence>
        {isDragging && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 flex items-center justify-center bg-cyan-900/30 border-4 border-dashed border-cyan-400 rounded-2xl m-4 sm:m-6 transition-all pointer-events-none">
            <div className="text-center bg-[#0a0a0c] p-8 sm:p-10 rounded-2xl shadow-2xl border border-cyan-500/30">
              <div className="w-16 h-16 bg-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <UploadCloud className="w-8 h-8 text-cyan-400 animate-bounce" />
              </div>
              <h2 className={cn("text-xl sm:text-2xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>Drop files to upload</h2>
              <p className="text-xs sm:text-sm text-cyan-200">Release to start securely uploading to this folder.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Bar */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div className="w-full sm:w-auto flex-1 max-w-md">
          <div className="relative">
            <Search className={cn("absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4", isDark ? "text-zinc-500" : "text-slate-400")} />
            <input type="text" placeholder="Search files..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={cn("w-full border rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all", isDark ? "bg-[#111115] border-white/[0.08] text-white placeholder:text-zinc-500" : "bg-slate-50/80 border-slate-200/90 text-slate-900 placeholder:text-slate-400")} />
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <div className={cn("flex border rounded-xl p-1 shrink-0 hidden sm:flex", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")}>
            <button onClick={() => setViewMode("grid")} className={cn("p-2 rounded-lg transition-all", viewMode === "grid" ? (isDark ? "bg-cyan-500/20 text-cyan-400" : "bg-white text-cyan-700 shadow-2xs") : (isDark ? "text-zinc-500 hover:text-white" : "text-slate-500 hover:text-slate-900"))}><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => setViewMode("list")} className={cn("p-2 rounded-lg transition-all", viewMode === "list" ? (isDark ? "bg-cyan-500/20 text-cyan-400" : "bg-white text-cyan-700 shadow-2xs") : (isDark ? "text-zinc-500 hover:text-white" : "text-slate-500 hover:text-slate-900"))}><ListIcon className="w-4 h-4" /></button>
          </div>

          <button onClick={() => setShowCreateFolder(true)} disabled={isSuspended} className={cn("border px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shrink-0 transition-all flex-1 sm:flex-none disabled:opacity-50", isDark ? "bg-[#111115] border-white/[0.08] hover:bg-white/[0.06] text-white" : "bg-white border-slate-200/90 hover:bg-slate-50 text-slate-700 shadow-2xs")}>
            <FolderPlus className="w-4 h-4" /> New Folder
          </button>

          <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} className="hidden" disabled={isSuspended} />
          <button onClick={() => fileInputRef.current?.click()} disabled={isSuspended} className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 flex-1 sm:flex-none transition-all disabled:opacity-50 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm">
            <UploadCloud className="w-4 h-4" /> Upload
          </button>
        </div>
      </motion.div>

      {/* Toolbar / Actions (appears when selected) */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-cyan-900/20 border border-cyan-500/30 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-cyan-400 font-bold text-xs sm:text-sm bg-cyan-500/10 px-3 py-1 rounded-lg border border-cyan-500/20">{selectedIds.length} selected</span>
              <button onClick={toggleSelectAll} className={cn("hover:text-white text-xs sm:text-sm font-medium transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}>Select All</button>
              <button onClick={() => setSelectedIds([])} className={cn("hover:text-white text-xs sm:text-sm font-medium transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}>Clear</button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setShowMoveModal(true); setMoveDest(currentFolder); }} className={cn("bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all", isDark ? "text-white" : "text-slate-900")}>
                <MoveRight className="w-4 h-4 shrink-0" /> Move
              </button>
              <button onClick={() => setShowDeleteAllModal(true)} className="bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/20 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all">
                <Trash2 className="w-4 h-4 shrink-0" /> Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Breadcrumbs */}
      <motion.div variants={itemVariants} className={cn("flex items-center gap-2 p-3.5 sm:p-4 rounded-2xl border overflow-x-auto whitespace-nowrap", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
        {getBreadcrumbs().map((crumb, idx) => (
          <div key={crumb.path} className="flex items-center gap-2">
            {idx > 0 && <ChevronRight className={cn("w-4 h-4", isDark ? "text-zinc-500" : "text-slate-500")} />}
            <button 
              onClick={() => navigateTo(crumb.path)} 
              className={cn("text-xs sm:text-sm font-bold transition-all px-2.5 py-1 rounded-lg", idx === getBreadcrumbs().length - 1 ? (isDark ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border border-cyan-200") : (isDark ? "text-zinc-400 hover:text-white hover:bg-white/[0.04]" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"))}
            >
              {crumb.name}
            </button>
          </div>
        ))}
      </motion.div>

      <motion.div variants={itemVariants}>
        {(() => {
          const filteredMedia = media.filter(item => item.originalName.toLowerCase().includes(searchQuery.toLowerCase()));
            
            if (filteredMedia.length === 0) {
              return (
                <div className={cn("rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center text-center relative overflow-hidden border", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
                  <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-5 border", isDark ? "bg-white/[0.02] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")}>
                    <Folder className={cn("w-8 h-8", isDark ? "text-zinc-600" : "text-slate-400")} />
                  </div>
                  <h3 className={cn("text-lg sm:text-xl font-bold mb-2 relative z-10", isDark ? "text-white" : "text-slate-900")}>Folder is empty</h3>
                  <p className={cn("text-xs sm:text-sm max-w-md relative z-10", isDark ? "text-zinc-400" : "text-slate-500")}>Create a folder or upload secure files here. Just drag and drop!</p>
                </div>
              );
            }
  
            const totalPages = Math.max(1, Math.ceil(filteredMedia.length / itemsPerPage));
            const paginatedMedia = filteredMedia.slice((page - 1) * itemsPerPage, page * itemsPerPage);

            return (
              <div className="space-y-6">
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
                    {paginatedMedia.map((item) => {
                  const FileIcon = getFileIcon(item.mimeType, item.originalName, item.isFolder);
                  const isSelected = selectedIds.includes(item.id);
                  return (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={item.id} 
                       onClick={(e) => { if(e.ctrlKey || e.shiftKey) toggleSelect(item.id); }}
                       onDoubleClick={() => item.isFolder && navigateTo(`${currentFolder === '/' ? '' : currentFolder}/${item.originalName}`)}
                       className={cn("border rounded-2xl p-4 sm:p-5 flex flex-col transition-all group cursor-pointer relative overflow-hidden", isSelected ? (isDark ? "bg-[#111115] border-cyan-500 ring-1 ring-cyan-500/30" : "bg-white border-cyan-600 ring-2 ring-cyan-600/20") : (isDark ? "bg-[#0a0a0c] border-white/[0.08] hover:border-white/[0.15]" : "bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs"))}>
                    
                      
                    <div className="flex items-start justify-between mb-4 relative z-10">
                      <div className="flex items-center gap-3">
                        <button onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }} className={cn("w-5 h-5 border rounded-md flex items-center justify-center shrink-0 cursor-pointer transition-colors", isSelected ? "bg-cyan-500 border-cyan-500 text-slate-950" : (isDark ? "border-white/[0.15] group-hover:border-white/30 bg-[#111115]" : "border-slate-300 group-hover:border-slate-400 bg-white"))}>
                          {isSelected && <CheckCircle className="w-3.5 h-3.5 text-slate-950" />}
                        </button>
                        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center border", item.isFolder ? (isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-slate-50/80 border-slate-200/90 text-cyan-700") : (isDark ? "bg-white/[0.02] border-white/[0.08] text-zinc-300" : "bg-slate-50/80 border-slate-200/90 text-slate-600"))}>
                          <FileIcon className="w-5 h-5" />
                        </div>
                      </div>
                      <div className={cn("flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg border p-0.5", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
                        <button onClick={(e) => { e.stopPropagation(); setShowRenameModal(item); setRenameValue(item.originalName); }} disabled={isSuspended} className={cn("p-1.5 rounded-md transition-colors disabled:opacity-50", isDark ? "text-zinc-400 hover:text-white hover:bg-white/[0.06]" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100")}><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => { e.stopPropagation(); setShowMoveModal(item); setMoveDest(currentFolder); }} disabled={isSuspended} className={cn("hover:text-white p-1.5 hover:bg-white/[0.06] rounded-md transition-colors disabled:opacity-50", isDark ? "text-zinc-400" : "text-slate-500")}><MoveRight className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteId(item.id); }} disabled={isSuspended} className={cn("hover:text-red-400 p-1.5 hover:bg-red-500/20 rounded-md transition-colors disabled:opacity-50", isDark ? "text-zinc-400" : "text-slate-500")}><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    
                    <h3 className={cn("font-bold text-sm mb-1 truncate relative z-10", isDark ? "text-white" : "text-slate-900")} title={item.originalName}>{item.originalName}</h3>
                    {!item.isFolder ? (
                      <div className="flex items-end justify-between mt-auto pt-4 relative z-10">
                        <div className="flex flex-col gap-1">
                          <span className={cn("text-xs font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>{formatBytes(item.size)}</span>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            {item.expiresAt ? (
                              <span className="text-[10px] font-bold tracking-wider text-orange-400 uppercase bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded w-fit">Exp: {new Date(item.expiresAt).toLocaleDateString()}</span>
                            ) : (
                              <span className="text-[10px] font-bold tracking-wider text-green-400 uppercase bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded w-fit">Permanent</span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleToggleVisibility(item); }}
                              disabled={isSuspended}
                              title={item.isPublic === false ? "Private (Click to make Public)" : "Public (Click to make Private)"}
                              className={cn(
                                "text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded border flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50",
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
                        <div className="flex gap-1.5">
                          {getPreviewType(item.mimeType, item.originalName) !== "none" && (
                            <button onClick={(e) => { e.stopPropagation(); setPreviewItem(item); }} disabled={isSuspended} className="text-cyan-400 p-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-lg transition-colors disabled:opacity-50"><Eye className="w-4 h-4" /></button>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); copyLink(item.token); }} disabled={isSuspended} className="text-cyan-400 p-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-lg transition-colors disabled:opacity-50"><LinkIcon className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-end justify-between mt-auto pt-4 relative z-10">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-lg w-fit">{item.itemCount || 0} items</span>
                          <span className={cn("text-[10px] font-medium mt-1", isDark ? "text-zinc-500" : "text-slate-500")}>{formatBytes(item.folderSize || 0)}</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className={cn("rounded-2xl overflow-hidden relative border", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs")}>
                 <div className="overflow-x-auto relative z-10">
                 <table className="w-full text-left text-sm relative z-10">
                    <thead className={cn("border-b text-xs font-semibold tracking-wider uppercase", isDark ? "bg-white/[0.02] border-white/[0.08] text-zinc-400" : "bg-slate-50/80 border-slate-200/90 text-slate-500")}>
                      <tr>
                        <th className="px-4 sm:px-6 py-3.5 w-12 text-center">
                          <button onClick={(e) => { e.stopPropagation(); toggleSelectAll(); }} className={cn("w-5 h-5 border rounded-md flex items-center justify-center cursor-pointer transition-colors mx-auto", selectedIds.length === media.length && media.length > 0 ? "bg-cyan-500 border-cyan-500 text-slate-950" : (isDark ? "border-white/[0.15] hover:border-white/30 bg-[#111115]" : "border-slate-300 hover:border-slate-400 bg-white"))}>
                            {selectedIds.length === media.length && media.length > 0 && <CheckCircle className="w-3.5 h-3.5 text-slate-950" />}
                          </button>
                        </th>
                        <th className="px-4 sm:px-6 py-3.5">Name</th>
                        <th className="px-4 sm:px-6 py-3.5">Size</th>
                        <th className="px-4 sm:px-6 py-3.5">Status</th>
                        <th className="px-4 sm:px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className={cn("divide-y", isDark ? "divide-white/[0.06]" : "divide-slate-100")}>
                      {paginatedMedia.map(item => {
                        const FileIcon = getFileIcon(item.mimeType, item.originalName, item.isFolder);
                        const isSelected = selectedIds.includes(item.id);
                        return (
                          <tr key={item.id} onClick={(e) => { if(e.ctrlKey || e.shiftKey) toggleSelect(item.id); }} className={cn("transition-colors cursor-pointer group", isSelected ? (isDark ? "bg-cyan-500/[0.06]" : "bg-slate-50") : (isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50/80"))} onDoubleClick={() => item.isFolder && navigateTo(`${currentFolder === '/' ? '' : currentFolder}/${item.originalName}`)}>
                            <td className="px-4 sm:px-6 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <button onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }} className={cn("w-5 h-5 border rounded-md flex items-center justify-center cursor-pointer transition-colors mx-auto", isSelected ? "bg-cyan-500 border-cyan-500 text-slate-950" : (isDark ? "border-white/[0.15] group-hover:border-white/30 bg-[#111115]" : "border-slate-300 group-hover:border-slate-400 bg-white"))}>
                                {isSelected && <CheckCircle className="w-3.5 h-3.5 text-slate-950" />}
                              </button>
                            </td>
                            <td className="px-4 sm:px-6 py-3.5">
                              <div className="flex items-center gap-3.5">
                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border shrink-0", item.isFolder ? (isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-slate-50/80 border-slate-200/90 text-cyan-700") : (isDark ? "bg-white/[0.02] border-white/[0.08] text-zinc-300" : "bg-slate-50/80 border-slate-200/90 text-slate-600"))}>
                                  <FileIcon className="w-5 h-5" />
                                </div>
                                <span className={cn("font-bold truncate max-w-[200px] sm:max-w-[300px] md:max-w-md transition-colors", isDark ? "text-white group-hover:text-cyan-400" : "text-slate-900 group-hover:text-cyan-600")}>{item.originalName}</span>
                              </div>
                            </td>
                            <td className={cn("px-4 sm:px-6 py-3.5 font-medium whitespace-nowrap", isDark ? "text-zinc-400" : "text-slate-500")}>{item.isFolder ? formatBytes(item.folderSize || 0) : formatBytes(item.size)}</td>
                            <td className="px-4 sm:px-6 py-3.5 whitespace-nowrap">
                              {item.isFolder ? (
                                <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-lg tracking-wider uppercase">{item.itemCount || 0} items</span>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  {item.expiresAt ? (
                                    <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-lg tracking-wider uppercase">Exp: {new Date(item.expiresAt).toLocaleDateString()}</span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-lg tracking-wider uppercase">Permanent</span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleToggleVisibility(item); }}
                                    disabled={isSuspended}
                                    title={item.isPublic === false ? "Private (Click to make Public)" : "Public (Click to make Private)"}
                                    className={cn(
                                      "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50",
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
                            <td className="px-4 sm:px-6 py-3.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); setShowRenameModal(item); setRenameValue(item.originalName); }} disabled={isSuspended} className={cn("p-2 hover:text-white bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.08] rounded-lg transition-colors disabled:opacity-50", isDark ? "text-zinc-400" : "text-slate-500")}><Edit2 className="w-4 h-4" /></button>
                                <button onClick={(e) => { e.stopPropagation(); setShowMoveModal(item); setMoveDest(currentFolder); }} disabled={isSuspended} className={cn("p-2 hover:text-white bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.08] rounded-lg transition-colors disabled:opacity-50", isDark ? "text-zinc-400" : "text-slate-500")}><MoveRight className="w-4 h-4" /></button>
                                {!item.isFolder && (
                                  <>
                                    <button onClick={(e) => { e.stopPropagation(); handleToggleVisibility(item); }} disabled={isSuspended} className={cn("p-2 rounded-lg transition-colors disabled:opacity-50", item.isPublic === false ? "text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20" : "text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20")} title={item.isPublic === false ? "Make Public" : "Make Private"}>
                                      {item.isPublic === false ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); copyLink(item.token); }} disabled={isSuspended} className="p-2 text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-lg transition-colors disabled:opacity-50"><LinkIcon className="w-4 h-4" /></button>
                                    {getPreviewType(item.mimeType, item.originalName) !== "none" && (
                                      <button onClick={(e) => { e.stopPropagation(); setPreviewItem(item); }} disabled={isSuspended} className="p-2 text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-lg transition-colors disabled:opacity-50"><Eye className="w-4 h-4" /></button>
                                    )}
                                  </>
                                )}
                                <button onClick={(e) => { e.stopPropagation(); setDeleteId(item.id); }} disabled={isSuspended} className="p-2 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                 </table>
                 </div>
              </div>
                )}

                {totalPages > 1 && (
                  <div className={cn("p-4 border rounded-2xl shrink-0", isDark ? "border-white/[0.08] bg-[#0a0a0c]" : "border-slate-200/90 bg-white shadow-2xs")}>
                    <Pagination
                      currentPage={page}
                      totalPages={totalPages}
                      onPageChange={setPage}
                    />
                  </div>
                )}
              </div>
            );
          })()}
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {showCreateFolder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={cn("fixed inset-0 z-50 flex items-center justify-center px-4", isDark ? "bg-black/80" : "bg-slate-900/40")}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={cn("p-5 sm:p-6 rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden border", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90")}>
              <h3 className={cn("text-lg sm:text-xl font-bold mb-5 relative z-10 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                <FolderPlus className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} /> Create Folder
              </h3>
              <input autoFocus type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Enter folder name" className={cn("w-full rounded-xl px-4 py-3 text-sm mb-5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all relative z-10 border", isDark ? "bg-[#111115] border-white/[0.08] text-white" : "bg-slate-50/80 border-slate-200/90 text-slate-900")} />
              <div className="flex justify-end gap-2.5 relative z-10">
                <button onClick={() => setShowCreateFolder(false)} className={cn("px-4 py-2.5 rounded-xl transition-colors font-medium text-xs sm:text-sm border", isDark ? "bg-white/[0.02] text-zinc-300 hover:text-white hover:bg-white/[0.06] border-white/[0.08]" : "bg-slate-50/80 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200/90")}>Cancel</button>
                <button onClick={handleCreateFolder} className="px-5 py-2.5 text-slate-950 font-bold text-xs sm:text-sm rounded-xl transition-all bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 shadow-sm">Create</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRenameModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={cn("fixed inset-0 z-50 flex items-center justify-center px-4", isDark ? "bg-black/80" : "bg-slate-900/40")}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={cn("p-5 sm:p-6 rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden border", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90")}>
              <h3 className={cn("text-lg sm:text-xl font-bold mb-5 relative z-10 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                <Edit2 className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} /> Rename
              </h3>
              <input autoFocus type="text" value={renameValue} onChange={e => setRenameValue(e.target.value)} className={cn("w-full rounded-xl px-4 py-3 text-sm mb-5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all relative z-10 border", isDark ? "bg-[#111115] border-white/[0.08] text-white" : "bg-slate-50/80 border-slate-200/90 text-slate-900")} />
              <div className="flex justify-end gap-2.5 relative z-10">
                <button onClick={() => setShowRenameModal(null)} className={cn("px-4 py-2.5 rounded-xl transition-colors font-medium text-xs sm:text-sm border", isDark ? "bg-white/[0.02] text-zinc-300 hover:text-white hover:bg-white/[0.06] border-white/[0.08]" : "bg-slate-50/80 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200/90")}>Cancel</button>
                <button onClick={handleRename} className="px-5 py-2.5 text-slate-950 font-bold text-xs sm:text-sm rounded-xl transition-all bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 shadow-sm">Rename</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMoveModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={cn("fixed inset-0 z-50 flex items-center justify-center px-4", isDark ? "bg-black/80" : "bg-slate-900/40")}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={cn("p-5 sm:p-6 rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden border", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90")}>
              <h3 className={cn("text-lg sm:text-xl font-bold mb-5 relative z-10 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                <MoveRight className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} /> Move Items
              </h3>
              <input autoFocus type="text" value={moveDest} onChange={e => setMoveDest(e.target.value)} placeholder="Destination Path (e.g. /images)" className={cn("w-full rounded-xl px-4 py-3 text-sm mb-5 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all relative z-10 border", isDark ? "bg-[#111115] border-white/[0.08] text-white" : "bg-slate-50/80 border-slate-200/90 text-slate-900")} />
              <div className="flex justify-end gap-2.5 relative z-10">
                <button onClick={() => setShowMoveModal(null)} className={cn("px-4 py-2.5 rounded-xl transition-colors font-medium text-xs sm:text-sm border", isDark ? "bg-white/[0.02] text-zinc-300 hover:text-white hover:bg-white/[0.06] border-white/[0.08]" : "bg-slate-50/80 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200/90")}>Cancel</button>
                <button onClick={handleMove} className="px-5 py-2.5 text-slate-950 font-bold text-xs sm:text-sm rounded-xl transition-all bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 shadow-sm">Move</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDeleteConfirm} title="Delete Item?" description="This item will be permanently deleted. Folders must be empty to be deleted." confirmText="Delete" isLoading={isDeleting} variant="danger" />
      <ConfirmModal isOpen={showDeleteAllModal} onClose={() => setShowDeleteAllModal(false)} onConfirm={handleBulkDelete} title={`Delete ${selectedIds.length} item(s)?`} description="Selected items will be permanently deleted. This action cannot be undone." confirmText="Delete Selected" isLoading={isDeletingAll} variant="danger" />

      {previewItem && <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} onToggleVisibility={handleToggleVisibility} />}

      <AnimatePresence>
        {showUploadModal && selectedFiles.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={cn("fixed inset-0 z-50 flex items-center justify-center px-4", isDark ? "bg-black/80" : "bg-slate-900/40")}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={cn("rounded-2xl p-5 sm:p-6 w-full max-w-lg shadow-2xl relative overflow-hidden border", isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90")}>
                            
              <h2 className={cn("text-lg sm:text-xl font-bold mb-2 relative z-10 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                <UploadCloud className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} /> Upload Settings
              </h2>
              <p className={cn("text-xs sm:text-sm mb-5 relative z-10", isDark ? "text-zinc-400" : "text-slate-500")}>Uploading <strong className={isDark ? "text-white" : "text-slate-900"}>{selectedFiles.length}</strong> file(s) to: <span className={cn("px-2 py-0.5 rounded font-mono", isDark ? "bg-white/[0.04] text-cyan-400" : "bg-slate-100 text-cyan-600")}>{currentFolder}</span></p>
  
              <div className={cn("mb-5 p-3.5 sm:p-4 rounded-xl border max-h-48 overflow-y-auto custom-scrollbar relative z-10", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90")}>
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between mb-3 last:mb-0">
                    <div className={cn("flex items-center gap-3 min-w-0 pr-2", isDark ? "text-white" : "text-slate-900")}>
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border shrink-0", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                        <File className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-600")} />
                      </div>
                      <span className="font-bold truncate text-xs sm:text-sm" title={file.name}>{file.name}</span>
                    </div>
                    <div className={cn("text-xs font-medium shrink-0 px-2 py-1 rounded-md border", isDark ? "text-zinc-400 bg-white/[0.02] border-white/[0.08]" : "text-slate-500 bg-white border-slate-200/90")}>{formatBytes(file.size)}</div>
                  </div>
                ))}
              </div>
  
              <div className="mb-5 space-y-2 relative z-10">
                <label className={cn("block text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Visibility</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPublicUpload(true)}
                    disabled={uploading}
                    className={cn(
                      "flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all",
                      isPublicUpload
                        ? "bg-cyan-500/15 border-cyan-500 text-cyan-400"
                        : isDark ? "bg-[#111115] border-white/[0.08] text-zinc-400 hover:text-white" : "bg-slate-50/80 border-slate-200/90 text-slate-600 hover:text-slate-900"
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
                        ? "bg-amber-500/15 border-amber-500 text-amber-400"
                        : isDark ? "bg-[#111115] border-white/[0.08] text-zinc-400 hover:text-white" : "bg-slate-50/80 border-slate-200/90 text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Private
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500">
                  {isPublicUpload ? "Public: Anyone with the link can access and view this file." : "Private: Only you and authorized administrators can access this file."}
                </p>
              </div>

              <div className="mb-6 relative z-10">
                <label className={cn("block text-xs font-bold uppercase tracking-wider mb-2", isDark ? "text-zinc-400" : "text-slate-500")}>Expiry Option</label>
                <select value={expiresIn} onChange={(e) => setExpiresIn(e.target.value)} className={cn("w-full rounded-xl px-4 py-3 text-xs sm:text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all appearance-none cursor-pointer border", isDark ? "bg-[#111115] border-white/[0.08] text-white" : "bg-slate-50/80 border-slate-200/90 text-slate-900")}>
                  <option value="permanent">Permanent (Never expires)</option>
                  <option value="1h">1 Hour</option>
                  <option value="1d">1 Day</option>
                  <option value="7d">7 Days</option>
                  <option value="30d">30 Days</option>
                </select>
              </div>
  
              {uploading && (
                <div className="mb-5 relative z-10">
                  <div className="flex justify-between items-center mb-2">
                    <span className={cn("text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Uploading...</span>
                    <span className={cn("text-sm font-black", isDark ? "text-cyan-400" : "text-cyan-600")}>{uploadProgress}%</span>
                  </div>
                  <div className={cn("w-full rounded-full h-2 overflow-hidden border", isDark ? "bg-[#111115] border-white/[0.08]" : "bg-slate-100 border-slate-200/90")}>
                    <div className={cn("h-2 rounded-full transition-all duration-300 relative overflow-hidden", isDark ? "bg-cyan-400" : "bg-cyan-600")} style={{ width: `${uploadProgress}%` }}>
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    </div>
                  </div>
                </div>
              )}
  
              <div className={cn("flex gap-3 relative z-10 pt-4 border-t", isDark ? "border-white/[0.08]" : "border-slate-200/90")}>
                <button
                  onClick={() => { setShowUploadModal(false); setSelectedFiles([]); if(fileInputRef.current) fileInputRef.current.value = ""; }}
                  disabled={uploading}
                  className={cn("flex-1 py-2.5 px-4 rounded-xl border font-medium text-xs sm:text-sm transition-colors disabled:opacity-50", isDark ? "bg-white/[0.02] border-white/[0.08] text-zinc-300 hover:bg-white/[0.06]" : "bg-slate-50/80 border-slate-200/90 text-slate-700 hover:bg-slate-100")}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex-1 py-2.5 px-4 rounded-xl text-slate-950 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 shadow-sm"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  Confirm Upload
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}