"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  UploadCloud, Search, RefreshCw, HardDrive, Users, Globe, Lock,
  Trash2, ExternalLink, Eye, LayoutGrid, List as ListIcon,
  FileImage, FileVideo, FileAudio, FileText, Presentation, File,
  Mail, User, Calendar, CheckCircle, AlertTriangle, X
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Select } from "@/components/ui/Select";
import { Pagination } from "@/components/ui/Pagination";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AdminLoader } from "@/components/admin/AdminLoader";

interface CustomerInfo {
  id: number;
  name: string;
  email: string;
  avatar?: string | null;
  fileCount: number;
  totalBytes: number;
}

interface CustomerMediaFile {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  folderPath: string;
  isFolder: boolean;
  isPublic: boolean;
  token: string;
  createdAt: string;
  userId: number;
  customerName: string;
  customerEmail: string;
  customerAvatar?: string | null;
}

interface StatsData {
  totalFiles: number;
  totalStorageBytes: number;
  totalCustomers: number;
  publicFiles: number;
  privateFiles: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function getFileIcon(mimeType: string) {
  const mime = (mimeType || "").toLowerCase();
  if (mime.startsWith("image/")) return FileImage;
  if (mime.startsWith("video/")) return FileVideo;
  if (mime.startsWith("audio/")) return FileAudio;
  if (mime === "application/pdf" || mime.startsWith("text/")) return FileText;
  if (mime.includes("word") || mime.includes("sheet") || mime.includes("presentation")) return Presentation;
  return File;
}

export default function AdminCustomerCdnPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [files, setFiles] = useState<CustomerMediaFile[]>([]);
  const [customersList, setCustomersList] = useState<CustomerInfo[]>([]);
  const [stats, setStats] = useState<StatsData>({
    totalFiles: 0,
    totalStorageBytes: 0,
    totalCustomers: 0,
    publicFiles: 0,
    privateFiles: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters & View state
  const [searchQuery, setSearchQuery] = useState("");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 16;

  // Deletion modal
  const [deleteTarget, setDeleteTarget] = useState<CustomerMediaFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Preview modal
  const [previewItem, setPreviewItem] = useState<CustomerMediaFile | null>(null);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (customerFilter !== "all") params.set("customerId", customerFilter);
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (visibilityFilter !== "all") params.set("visibility", visibilityFilter);

      const res = await fetch(`/api/admin/customer-cdn?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to load customer files");

      setFiles(data.files || []);
      setStats(data.stats || {
        totalFiles: 0,
        totalStorageBytes: 0,
        totalCustomers: 0,
        publicFiles: 0,
        privateFiles: 0,
      });
      setCustomersList(data.customersList || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch customer CDN data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [customerFilter, typeFilter, visibilityFilter]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/customer-cdn?id=${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Deletion failed");

      toast.success(`"${deleteTarget.originalName}" was successfully removed`);
      setFiles((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      setStats((prev) => ({
        ...prev,
        totalFiles: Math.max(0, prev.totalFiles - 1),
        totalStorageBytes: Math.max(0, prev.totalStorageBytes - deleteTarget.size),
      }));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete file");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  // Filter files by search query
  const filteredFiles = files.filter((f) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      f.originalName.toLowerCase().includes(q) ||
      f.customerName.toLowerCase().includes(q) ||
      f.customerEmail.toLowerCase().includes(q) ||
      f.token.toLowerCase().includes(q) ||
      (f.folderPath && f.folderPath.toLowerCase().includes(q))
    );
  });

  const totalPages = Math.ceil(filteredFiles.length / itemsPerPage);
  const paginatedFiles = filteredFiles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-full space-y-6 md:space-y-8 pb-10 relative z-10">
      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 w-full">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border",
              isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-100 border-cyan-200 text-cyan-700"
            )}>
              <UploadCloud className="w-3.5 h-3.5" /> Customer Storage Supervision
            </span>
          </div>
          <h1 className={cn("text-2xl md:text-3xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Customer <span className={cn(isDark ? "text-cyan-400" : "text-cyan-600")}>File CDN</span>
          </h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
            Supervise, inspect, and moderate all storage assets and encrypted delivery links uploaded by customers.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
          <div className={cn(
            "px-4 py-2 rounded-xl border font-semibold text-sm",
            isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200"
          )}>
            Storage: {formatBytes(stats.totalStorageBytes)}
          </div>
          <button
            onClick={fetchFiles}
            disabled={loading}
            className={cn(
              "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-semibold transition-all cursor-pointer",
              isDark
                ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white"
                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900"
            )}
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin text-cyan-500")} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── STATS CARDS ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {/* Total Customer Files */}
        <div className={cn(
          "relative overflow-hidden rounded-2xl border p-5 transition-colors",
          isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm"
        )}>
          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              Customer Files
            </span>
            <div className={cn(
              "w-9 h-9 rounded-xl border flex items-center justify-center",
              isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600"
            )}>
              <UploadCloud className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className={cn("text-3xl font-extrabold", isDark ? "text-white" : "text-slate-900")}>
              {stats.totalFiles}
            </span>
            <span className={cn("text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-600")}>Uploaded</span>
          </div>
        </div>

        {/* Customer Storage Used */}
        <div className={cn(
          "relative overflow-hidden rounded-2xl border p-5 transition-colors",
          isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm"
        )}>
          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              Storage Consumed
            </span>
            <div className={cn(
              "w-9 h-9 rounded-xl border flex items-center justify-center",
              isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600"
            )}>
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className={cn("text-3xl font-extrabold", isDark ? "text-white" : "text-slate-900")}>
              {formatBytes(stats.totalStorageBytes)}
            </span>
            <span className={cn("text-xs font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Disk Total</span>
          </div>
        </div>

        {/* Active Customers */}
        <div className={cn(
          "relative overflow-hidden rounded-2xl border p-5 transition-colors",
          isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm"
        )}>
          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              Active Customers
            </span>
            <div className={cn(
              "w-9 h-9 rounded-xl border flex items-center justify-center",
              isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600"
            )}>
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className={cn("text-3xl font-extrabold", isDark ? "text-white" : "text-slate-900")}>
              {stats.totalCustomers}
            </span>
            <span className={cn("text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-600")}>Users Storing</span>
          </div>
        </div>

        {/* Public vs Private */}
        <div className={cn(
          "relative overflow-hidden rounded-2xl border p-5 transition-colors",
          isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm"
        )}>
          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              File Visibility
            </span>
            <div className={cn(
              "w-9 h-9 rounded-xl border flex items-center justify-center",
              isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600"
            )}>
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className={cn("text-2xl font-extrabold flex items-center gap-1", isDark ? "text-emerald-400" : "text-emerald-600")}>
              <Globe className="w-4 h-4" /> {stats.publicFiles}
            </span>
            <span className={cn("text-sm", isDark ? "text-zinc-500" : "text-slate-400")}>/</span>
            <span className={cn("text-2xl font-extrabold flex items-center gap-1", isDark ? "text-amber-400" : "text-amber-600")}>
              <Lock className="w-4 h-4" /> {stats.privateFiles}
            </span>
          </div>
        </div>
      </div>

      {/* ── CONTROLS & FILTER BAR ────────────────────────────────────────────── */}
      <div className={cn(
        "flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 border p-4 rounded-2xl transition-colors w-full",
        isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm"
      )}>
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          {/* Customer select filter */}
          <div className="w-full sm:w-56">
            <Select
              value={customerFilter}
              onChange={(val) => {
                setCustomerFilter(String(val));
                setCurrentPage(1);
              }}
              options={[
                { value: "all", label: "All Customers" },
                ...customersList.map((c) => ({
                  value: String(c.id),
                  label: `${c.name} (${c.fileCount} files)`,
                })),
              ]}
              placeholder="Filter Customer"
              className={cn("w-full rounded-xl px-3 py-2 text-xs", isDark ? "border-white/10" : "border-slate-200")}
            />
          </div>

          {/* Type filter */}
          <div className="w-36">
            <Select
              value={typeFilter}
              onChange={(val) => {
                setTypeFilter(String(val));
                setCurrentPage(1);
              }}
              options={[
                { value: "all", label: "All Types" },
                { value: "image", label: "Images" },
                { value: "video", label: "Videos" },
                { value: "audio", label: "Audio" },
                { value: "document", label: "Documents" },
                { value: "archive", label: "Archives" },
              ]}
              placeholder="File Type"
              className={cn("w-full rounded-xl px-3 py-2 text-xs", isDark ? "border-white/10" : "border-slate-200")}
            />
          </div>

          {/* Visibility filter */}
          <div className="w-36">
            <Select
              value={visibilityFilter}
              onChange={(val) => {
                setVisibilityFilter(String(val));
                setCurrentPage(1);
              }}
              options={[
                { value: "all", label: "All Visibility" },
                { value: "public", label: "Public" },
                { value: "private", label: "Private" },
              ]}
              placeholder="Visibility"
              className={cn("w-full rounded-xl px-3 py-2 text-xs", isDark ? "border-white/10" : "border-slate-200")}
            />
          </div>
        </div>

        {/* Right side: Search & View toggle */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className={cn("w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2", isDark ? "text-zinc-500" : "text-slate-400")} />
            <input
              type="text"
              placeholder="Search file, customer, token..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className={cn(
                "w-full pl-10 pr-4 py-2 rounded-xl border text-xs focus:outline-none transition-all",
                isDark
                  ? "bg-black/40 border-white/10 text-white placeholder-zinc-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 focus:bg-white"
              )}
            />
          </div>

          <div className={cn(
            "flex items-center p-1 rounded-xl border shrink-0",
            isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-100 border-slate-200"
          )}>
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5 rounded-lg transition-colors cursor-pointer",
                viewMode === "grid"
                  ? "bg-cyan-500 text-white"
                  : isDark ? "text-zinc-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
              )}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "p-1.5 rounded-lg transition-colors cursor-pointer",
                viewMode === "table"
                  ? "bg-cyan-500 text-white"
                  : isDark ? "text-zinc-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
              )}
              title="Table / List View"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── DATA SECTION ─────────────────────────────────────────────────────── */}
      {loading ? (
        <AdminLoader className="min-h-[300px] py-16" />
      ) : paginatedFiles.length === 0 ? (
        <div className={cn(
          "rounded-3xl border p-16 text-center w-full",
          isDark ? "border-slate-800 bg-[#0b1322] shadow-md" : "border-slate-200 bg-white shadow-sm"
        )}>
          <UploadCloud className={cn("w-14 h-14 mx-auto mb-4 opacity-50", isDark ? "text-cyan-400" : "text-cyan-600")} />
          <h3 className={cn("text-lg font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>
            No Customer Files Found
          </h3>
          <p className={cn("text-xs max-w-md mx-auto", isDark ? "text-zinc-400" : "text-slate-500")}>
            {searchQuery || customerFilter !== "all" || typeFilter !== "all" || visibilityFilter !== "all"
              ? "No customer files match your selected filter criteria."
              : "No customers have uploaded files to the File CDN network yet."}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        /* ── GRID VIEW ──────────────────────────────────────────────────────── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
          {paginatedFiles.map((file) => {
            const Icon = getFileIcon(file.mimeType);
            const isImage = file.mimeType.startsWith("image/");
            const isVideo = file.mimeType.startsWith("video/");

            return (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "rounded-2xl border p-4 transition-all flex flex-col justify-between group",
                  isDark
                    ? "bg-[#0b1322] border-slate-800/80 hover:border-slate-700 shadow-md"
                    : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                )}
              >
                <div>
                  {/* File Preview Thumbnail / Icon */}
                  <div className={cn(
                    "relative w-full h-36 rounded-xl overflow-hidden mb-3.5 flex items-center justify-center border",
                    isDark ? "bg-black/40 border-white/5" : "bg-slate-100 border-slate-200"
                  )}>
                    {isImage ? (
                      <img
                        src={`/api/media/${file.token}/stream`}
                        alt={file.originalName}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-3">
                        <Icon className={cn("w-12 h-12 mb-1", isDark ? "text-cyan-400" : "text-cyan-600")} />
                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider truncate max-w-[140px]">
                          {file.mimeType.split("/")[1] || "FILE"}
                        </span>
                      </div>
                    )}

                    {/* Visibility badge */}
                    <div className="absolute top-2.5 right-2.5">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border backdrop-blur-md shadow-sm",
                        file.isPublic
                          ? isDark ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : isDark ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : "bg-amber-50 text-amber-700 border-amber-200"
                      )}>
                        {file.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {file.isPublic ? "Public" : "Private"}
                      </span>
                    </div>
                  </div>

                  {/* File Name & Size */}
                  <h4 className={cn("font-bold text-sm truncate mb-1", isDark ? "text-white" : "text-slate-900")} title={file.originalName}>
                    {file.originalName}
                  </h4>
                  <div className={cn("flex items-center justify-between text-xs mb-3", isDark ? "text-zinc-400" : "text-slate-500")}>
                    <span>{formatBytes(file.size)}</span>
                    <span className="text-[11px]">{formatDate(file.createdAt)}</span>
                  </div>

                  {/* Customer Owner Pill */}
                  <div className={cn(
                    "flex items-center gap-2 p-2 rounded-xl border mb-3",
                    isDark ? "bg-white/5 border-white/5" : "bg-slate-50 border-slate-200"
                  )}>
                    <div className={cn("w-7 h-7 rounded-full overflow-hidden border shrink-0", isDark ? "border-slate-800" : "border-slate-200")}>
                      <img
                        referrerPolicy="no-referrer"
                        src={file.customerAvatar || `/api/avatar?email=${encodeURIComponent(file.customerEmail)}&name=${encodeURIComponent(file.customerName)}&v=4`}
                        alt={file.customerName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-xs font-semibold truncate leading-tight", isDark ? "text-zinc-200" : "text-slate-800")}>
                        {file.customerName}
                      </p>
                      <p className={cn("text-[10px] truncate leading-tight", isDark ? "text-cyan-400" : "text-cyan-700")}>
                        {file.customerEmail}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => setPreviewItem(file)}
                    className={cn(
                      "flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer",
                      isDark
                        ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                    )}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>

                  <Link
                    href={`/media/${file.token}`}
                    target="_blank"
                    className={cn(
                      "p-1.5 rounded-lg border transition-colors inline-flex items-center justify-center",
                      isDark
                        ? "border-white/10 bg-white/5 hover:bg-cyan-500/15 hover:border-cyan-500/30 text-zinc-400 hover:text-cyan-400"
                        : "border-slate-200 bg-slate-50 hover:bg-cyan-50 hover:border-cyan-200 text-slate-600 hover:text-cyan-700"
                    )}
                    title="Open Public Link"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    onClick={() => setDeleteTarget(file)}
                    className={cn(
                      "p-1.5 rounded-lg border transition-colors cursor-pointer inline-flex items-center justify-center",
                      isDark
                        ? "border-white/10 bg-white/5 hover:bg-red-500/15 hover:border-red-500/30 text-zinc-400 hover:text-red-400"
                        : "border-slate-200 bg-slate-50 hover:bg-red-50 hover:border-red-200 text-slate-600 hover:text-red-600"
                    )}
                    title="Moderate / Delete File"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* ── TABLE VIEW ─────────────────────────────────────────────────────── */
        <div className={cn(
          "rounded-2xl border overflow-hidden w-full shadow-md",
          isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200"
        )}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={cn(
                "border-b uppercase font-bold tracking-wider",
                isDark ? "bg-black/30 border-slate-800 text-zinc-400" : "bg-slate-50 border-slate-200 text-slate-600"
              )}>
                <tr>
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-4">Customer Owner</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Visibility</th>
                  <th className="py-3 px-4">Uploaded At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedFiles.map((file) => {
                  const Icon = getFileIcon(file.mimeType);
                  return (
                    <tr
                      key={file.id}
                      className={cn(
                        "transition-colors",
                        isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50/60"
                      )}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5 min-w-0 max-w-xs sm:max-w-md">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                            isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600"
                          )}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className={cn("font-bold truncate block", isDark ? "text-white" : "text-slate-900")}>
                              {file.originalName}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {file.token.slice(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-6 h-6 rounded-full overflow-hidden border shrink-0", isDark ? "border-slate-800" : "border-slate-200")}>
                            <img
                              referrerPolicy="no-referrer"
                              src={file.customerAvatar || `/api/avatar?email=${encodeURIComponent(file.customerEmail)}&name=${encodeURIComponent(file.customerName)}&v=4`}
                              alt={file.customerName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <span className={cn("font-semibold block truncate", isDark ? "text-zinc-200" : "text-slate-800")}>
                              {file.customerName}
                            </span>
                            <span className="text-[10px] text-zinc-500 truncate block">
                              {file.customerEmail}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-medium">
                        {formatBytes(file.size)}
                      </td>

                      <td className="py-3 px-4">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                          file.isPublic
                            ? isDark ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : isDark ? "bg-amber-500/15 text-amber-400 border-amber-500/25" : "bg-amber-50 text-amber-700 border-amber-200"
                        )}>
                          {file.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          {file.isPublic ? "Public" : "Private"}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-zinc-400">
                        {formatDate(file.createdAt)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => setPreviewItem(file)}
                            className={cn(
                              "p-1.5 rounded-lg border transition-colors cursor-pointer",
                              isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300" : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                            )}
                            title="Preview File"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            href={`/media/${file.token}`}
                            target="_blank"
                            className={cn(
                              "p-1.5 rounded-lg border transition-colors inline-flex items-center justify-center",
                              isDark ? "border-white/10 bg-white/5 hover:bg-cyan-500/15 hover:text-cyan-400 text-zinc-400" : "border-slate-200 bg-slate-50 hover:bg-cyan-50 text-slate-600"
                            )}
                            title="Open Public Page"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => setDeleteTarget(file)}
                            className={cn(
                              "p-1.5 rounded-lg border transition-colors cursor-pointer",
                              isDark ? "border-white/10 bg-white/5 hover:bg-red-500/15 text-zinc-400 hover:text-red-400" : "border-slate-200 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600"
                            )}
                            title="Delete / Moderate File"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PAGINATION ───────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex justify-center pt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* ── PREVIEW MODAL ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {previewItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "relative w-full max-w-4xl max-h-[90vh] rounded-2xl border overflow-hidden flex flex-col shadow-2xl",
                isDark ? "bg-[#0b1322] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
              )}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="min-w-0 flex-1 pr-4">
                  <h3 className="font-bold text-base truncate">{previewItem.originalName}</h3>
                  <p className="text-xs text-zinc-400 truncate">
                    Uploaded by <strong className="text-cyan-400">{previewItem.customerName}</strong> ({previewItem.customerEmail}) &bull; {formatBytes(previewItem.size)}
                  </p>
                </div>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="p-1.5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 overflow-auto flex-1 flex items-center justify-center min-h-[300px] bg-black/30">
                {previewItem.mimeType.startsWith("image/") ? (
                  <img
                    src={`/api/media/${previewItem.token}/stream`}
                    alt={previewItem.originalName}
                    className="max-h-[65vh] max-w-full object-contain rounded-lg"
                  />
                ) : previewItem.mimeType.startsWith("video/") ? (
                  <video
                    src={`/api/media/${previewItem.token}/stream`}
                    controls
                    className="max-h-[65vh] max-w-full rounded-lg"
                  />
                ) : previewItem.mimeType.startsWith("audio/") ? (
                  <audio
                    src={`/api/media/${previewItem.token}/stream`}
                    controls
                    className="w-full max-w-md"
                  />
                ) : (
                  <div className="text-center p-8">
                    <File className="w-16 h-16 mx-auto mb-3 text-cyan-400" />
                    <p className="font-semibold text-sm mb-1">{previewItem.originalName}</p>
                    <p className="text-xs text-zinc-400 mb-4">{previewItem.mimeType} &bull; {formatBytes(previewItem.size)}</p>
                    <Link
                      href={`/media/${previewItem.token}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open in Public Viewer
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── CONFIRM MODERATION / DELETE MODAL ─────────────────────────────────── */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Moderate / Delete Customer File"
        description={`Are you sure you want to delete "${deleteTarget?.originalName}" owned by ${deleteTarget?.customerName}? This will permanently remove the physical file from disk and delete all associated reviews/ratings.`}
        confirmText="Yes, Delete File"
        cancelText="Cancel"
        isLoading={isDeleting}
        variant="danger"
      />
    </div>
  );
}
