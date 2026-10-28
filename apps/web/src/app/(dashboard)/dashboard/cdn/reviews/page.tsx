"use client";

import { useUrlString, useUrlTab } from "@/lib/useUrlTab";
import React, { useState, useEffect } from "react";
import {
  Star, MessageSquare, Trash2, ExternalLink, ShieldCheck,
  Search, RefreshCw, FileVideo, Filter, CheckCircle2,
  Calendar, Mail, User, AlertCircle, ArrowLeft, MessageSquareQuote, ChevronLeft
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import Link from "next/link";
import { motion } from "framer-motion";
import { Select } from "@/components/ui/Select";

interface MediaItem {
  id: number;
  originalName: string;
  token: string;
  mimeType?: string;
  size?: number;
}

interface CommentItem {
  id: number;
  mediaId: number;
  name: string;
  email: string;
  avatar?: string;
  content: string;
  rating: number | null;
  isVerified: boolean;
  createdAt: string;
  media: MediaItem;
}

interface RatingItem {
  id: number;
  mediaId: number;
  rating: number;
  ipAddress: string | null;
  userEmail: string | null;
  userName?: string | null;
  avatar?: string;
  createdAt: string;
  media: MediaItem;
}

interface StatsData {
  totalComments: number;
  totalRatings: number;
  averageRating: number;
  totalMediaReviewed: number;
}

export default function CustomerCdnReviewsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [ratings, setRatings] = useState<RatingItem[]>([]);
  const [stats, setStats] = useState<StatsData>({
    totalComments: 0,
    totalRatings: 0,
    averageRating: 0,
    totalMediaReviewed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useUrlString<string>("searchQuery", "");
  const [activeTab, setActiveTab] = useUrlTab<"comments" | "ratings">("comments", { allowed: ["comments", "ratings"] as const });
  const [ratingFilter, setRatingFilter] = useState<number | "all">("all");

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<{ type: "comment" | "rating"; id: number; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/cdn/reviews");
      const data = await res.json();
      if (!data.error) {
        setComments(data.comments || []);
        setRatings(data.ratings || []);
        setStats(data.stats || {
          totalComments: 0,
          totalRatings: 0,
          averageRating: 0,
          totalMediaReviewed: 0,
        });
      } else {
        toast.error(data.error || "Failed to load media reviews");
      }
    } catch {
      toast.error("Failed to connect to the server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      const url =
        deleteTarget.type === "comment"
          ? `/api/user/cdn/reviews?commentId=${deleteTarget.id}`
          : `/api/user/cdn/reviews?ratingId=${deleteTarget.id}`;

      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(
          deleteTarget.type === "comment"
            ? "Comment successfully removed"
            : "Rating successfully removed"
        );
        if (deleteTarget.type === "comment") {
          setComments((prev) => prev.filter((c) => c.id !== deleteTarget.id));
          setStats((prev) => ({ ...prev, totalComments: Math.max(0, prev.totalComments - 1) }));
        } else {
          setRatings((prev) => prev.filter((r) => r.id !== deleteTarget.id));
          setStats((prev) => ({ ...prev, totalRatings: Math.max(0, prev.totalRatings - 1) }));
        }
      } else {
        toast.error(data.error || "Deletion failed");
      }
    } catch {
      toast.error("Failed to delete record");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  // Filtered comments
  const filteredComments = comments.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.media?.originalName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRating =
      ratingFilter === "all" ? true : c.rating === ratingFilter;

    return matchesSearch && matchesRating;
  });

  // Filtered ratings
  const filteredRatings = ratings.filter((r) => {
    const matchesSearch =
      (r.userName && r.userName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.userEmail && r.userEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.ipAddress && r.ipAddress.includes(searchQuery)) ||
      r.media?.originalName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRating =
      ratingFilter === "all" ? true : r.rating === ratingFilter;

    return matchesSearch && matchesRating;
  });

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
      {/* ── BACK BUTTON ─────────── */}
      <div className="flex items-center">
        <Link 
          href="/dashboard/cdn" 
          className={cn(
            "inline-flex items-center gap-2 text-xs sm:text-sm font-medium px-3.5 py-2 rounded-xl transition-all border",
            isDark 
              ? "text-zinc-400 hover:text-white bg-[#0a0a0c] hover:bg-white/[0.04] border-white/[0.08] hover:border-cyan-500/40" 
              : "text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-200/90 shadow-2xs"
          )}
        >
          <ChevronLeft className="w-4 h-4" />
          Back to CDN Files
        </Link>
      </div>

      {/* ── PAGE HEADER ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              Media Reviews & Comments
            </h1>
            <span className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border",
              isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700"
            )}>
              <MessageSquareQuote className="w-3 h-3" /> Edge Delivery Feedback
            </span>
          </div>
          <p className={cn("text-xs sm:text-sm max-w-xl", isDark ? "text-zinc-400" : "text-slate-500")}>
            Inspect, monitor, and moderate star ratings and OTP-verified user comments on your CDN media files.
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
          <div className={cn("px-3.5 py-2 rounded-xl border font-semibold text-xs sm:text-sm text-center", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
            Total Reviews: {stats.totalComments + stats.totalRatings}
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className={cn(
              "inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer",
              isDark
                ? "border-white/[0.08] bg-[#111115] hover:bg-white/[0.06] text-zinc-300 hover:text-white"
                : "border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 shadow-2xs"
            )}
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin text-cyan-500")} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── STATS CARDS (FULL SPACE) ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {/* Total Comments */}
        <div className={cn(
          "relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-colors",
          isDark
            ? "bg-[#0a0a0c] border-white/[0.08]"
            : "bg-white border-slate-200/90 shadow-2xs"
        )}>
          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              Total Comments
            </span>
            <div className={cn(
              "w-9 h-9 rounded-xl border flex items-center justify-center",
              isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600"
            )}>
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className={cn("text-2xl sm:text-3xl font-extrabold", isDark ? "text-white" : "text-slate-900")}>
              {stats.totalComments}
            </span>
            <span className={cn("text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-600")}>OTP Verified</span>
          </div>
        </div>

        {/* Total Ratings */}
        <div className={cn(
          "relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-colors",
          isDark
            ? "bg-[#0a0a0c] border-white/[0.08]"
            : "bg-white border-slate-200/90 shadow-2xs"
        )}>
          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              Total Ratings
            </span>
            <div className={cn(
              "w-9 h-9 rounded-xl border flex items-center justify-center",
              isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600"
            )}>
              <Star className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className={cn("text-2xl sm:text-3xl font-extrabold", isDark ? "text-white" : "text-slate-900")}>
              {stats.totalRatings}
            </span>
            <span className={cn("text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-600")}>Stars Cast</span>
          </div>
        </div>

        {/* Platform Average */}
        <div className={cn(
          "relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-colors",
          isDark
            ? "bg-[#0a0a0c] border-white/[0.08]"
            : "bg-white border-slate-200/90 shadow-2xs"
        )}>
          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              Average Rating
            </span>
            <div className={cn(
              "w-9 h-9 rounded-xl border flex items-center justify-center",
              isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600"
            )}>
              <Star className="w-4 h-4 fill-cyan-400 text-cyan-400" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className={cn("text-2xl sm:text-3xl font-extrabold", isDark ? "text-white" : "text-slate-900")}>
              {stats.averageRating > 0 ? stats.averageRating : "-"}
            </span>
            <span className={cn("text-xs", isDark ? "text-zinc-400" : "text-slate-400")}>/ 5.0</span>
          </div>
        </div>

        {/* Reviewed Media Files */}
        <div className={cn(
          "relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-colors",
          isDark
            ? "bg-[#0a0a0c] border-white/[0.08]"
            : "bg-white border-slate-200/90 shadow-2xs"
        )}>
          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              Files Reviewed
            </span>
            <div className={cn(
              "w-9 h-9 rounded-xl border flex items-center justify-center",
              isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600"
            )}>
              <FileVideo className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className={cn("text-2xl sm:text-3xl font-extrabold", isDark ? "text-white" : "text-slate-900")}>
              {stats.totalMediaReviewed}
            </span>
            <span className={cn("text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-600")}>Unique Files</span>
          </div>
        </div>
      </div>

      {/* ── CONTROLS & FILTER BAR ────────────────────────────────────────────── */}
      <div className={cn(
        "flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border p-4 rounded-2xl transition-colors w-full",
        isDark ? "bg-[#0a0a0c] border-white/[0.08]" : "bg-white border-slate-200/90 shadow-2xs"
      )}>
        {/* Tab switch */}
        <div className={cn(
          "inline-flex items-center gap-1 p-1 rounded-xl border shrink-0 w-full sm:w-auto",
          isDark ? "bg-[#111115] border-white/[0.08]" : "bg-slate-50/80 border-slate-200/90"
        )}>
          <button
            onClick={() => setActiveTab("comments")}
            className={cn(
              "flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap select-none",
              activeTab === "comments"
                ? "bg-cyan-400 text-slate-950 font-bold"
                : isDark
                  ? "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            )}
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span>Comments</span>
            <span className={cn(
              "px-1.5 py-0.5 rounded-md text-[10px] font-bold leading-none shrink-0 transition-colors",
              activeTab === "comments"
                ? "bg-slate-950/15 text-slate-950"
                : isDark
                  ? "bg-white/10 text-zinc-300"
                  : "bg-slate-200 text-slate-700"
            )}>
              {comments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("ratings")}
            className={cn(
              "flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap select-none",
              activeTab === "ratings"
                ? "bg-cyan-400 text-slate-950 font-bold"
                : isDark
                  ? "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            )}
          >
            <Star className="w-3.5 h-3.5 shrink-0" />
            <span>Direct Ratings</span>
            <span className={cn(
              "px-1.5 py-0.5 rounded-md text-[10px] font-bold leading-none shrink-0 transition-colors",
              activeTab === "ratings"
                ? "bg-slate-950/15 text-slate-950"
                : isDark
                  ? "bg-white/10 text-zinc-300"
                  : "bg-slate-200 text-slate-700"
            )}>
              {ratings.length}
            </span>
          </button>
        </div>

        {/* Search & Rating Filter */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Star Filter Dropdown */}
          <div className="w-full sm:w-40">
            <Select
              value={ratingFilter}
              onChange={(val) => setRatingFilter(val === "all" ? "all" : Number(val))}
              options={[
                { value: "all", label: "All Ratings" },
                { value: "5", label: "5 Stars only" },
                { value: "4", label: "4 Stars only" },
                { value: "3", label: "3 Stars only" },
                { value: "2", label: "2 Stars only" },
                { value: "1", label: "1 Star only" }
              ]}
              placeholder="Rating"
              className={cn("w-full rounded-xl px-3 py-2 text-xs", isDark ? "border-white/[0.08]" : "border-slate-200/90")}
            />
          </div>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] sm:min-w-[260px] w-full sm:w-auto">
            <Search className={cn("w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2", isDark ? "text-zinc-500" : "text-slate-400")} />
            <input
              type="text"
              placeholder="Search user, email, file, or text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full pl-10 pr-4 py-2 rounded-xl border text-xs focus:outline-none transition-all",
                isDark
                  ? "bg-[#111115] border-white/[0.08] text-white placeholder-zinc-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  : "bg-slate-50/80 border-slate-200/90 text-slate-900 placeholder-slate-400 focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 focus:bg-white"
              )}
            />
          </div>
        </div>
      </div>

      {/* ── DATA SECTION ─────────────────────────────────────────────────────── */}
      <div className="w-full">
        {loading && comments.length === 0 && ratings.length === 0 ? (
          <div className="min-h-[250px] w-full flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
          </div>
        ) : activeTab === "comments" ? (
          /* COMMENTS TAB */
          filteredComments.length === 0 ? (
            <div className={cn(
              "rounded-2xl border p-8 sm:p-12 text-center",
              isDark ? "border-white/[0.08] bg-[#0a0a0c]" : "border-slate-200/90 bg-white shadow-2xs"
            )}>
              <MessageSquare className={cn("w-10 h-10 mx-auto mb-3", isDark ? "text-zinc-600" : "text-slate-300")} />
              <p className={cn("font-semibold text-base mb-1", isDark ? "text-white" : "text-slate-900")}>No comments found</p>
              <p className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>
                {searchQuery ? "No comments matching your search criteria." : "None of your CDN files have received comments yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-3 w-full">
              {filteredComments.map((comment) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "rounded-2xl border p-4 sm:p-5 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4 w-full",
                    isDark
                      ? "bg-[#0a0a0c] border-white/[0.08] hover:border-white/[0.14]"
                      : "bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs"
                  )}
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Profile Avatar */}
                    <div className={cn("w-10 h-10 rounded-full overflow-hidden border shrink-0 mt-0.5", isDark ? "border-white/[0.08]" : "border-slate-200/90")}>
                      <img
                        referrerPolicy="no-referrer"
                        src={comment.avatar ? `${comment.avatar}${comment.avatar.includes('?') ? '&' : '?'}v=4` : `/api/avatar?email=${encodeURIComponent(comment.email)}&name=${encodeURIComponent(comment.name)}&v=4`}
                        alt={comment.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = "flex";
                        }}
                      />
                      <div
                        style={{ display: "none" }}
                        className="w-full h-full bg-[#137333] items-center justify-center text-white font-medium text-sm"
                      >
                        {comment.name.charAt(0).toUpperCase()}
                      </div>
                    </div>

                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>
                          {comment.name}
                        </span>
                        <span className={cn("text-xs flex items-center gap-1.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                          <Mail className={cn("w-3 h-3 shrink-0", isDark ? "text-zinc-500" : "text-slate-400")} /> {comment.email}
                        </span>
                        {comment.isVerified && (
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0",
                            isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200"
                          )}>
                            <ShieldCheck className="w-3 h-3" /> OTP Verified
                          </span>
                        )}
                        {comment.rating && (
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold border shrink-0",
                            isDark ? "bg-amber-400/10 text-amber-400 border-amber-400/20" : "bg-amber-50 text-amber-700 border-amber-200"
                          )}>
                            <Star className="w-3 h-3 fill-amber-400" /> {comment.rating}.0
                          </span>
                        )}
                      </div>

                      {/* Comment text */}
                      <p className={cn(
                        "text-sm leading-relaxed whitespace-pre-wrap p-3 rounded-xl border",
                        isDark ? "text-zinc-300 bg-[#111115] border-white/[0.08]" : "text-slate-700 bg-slate-50/80 border-slate-200/90"
                      )}>
                        {comment.content}
                      </p>

                      {/* Associated Media File & Date */}
                      <div className={cn("flex flex-wrap items-center gap-2.5 text-xs pt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs max-w-full font-medium truncate",
                          isDark ? "bg-white/[0.02] border-white/[0.08] text-zinc-300" : "bg-slate-50/80 border-slate-200/90 text-slate-700"
                        )}>
                          <FileVideo className={cn("w-3.5 h-3.5 shrink-0", isDark ? "text-cyan-400" : "text-cyan-600")} />
                          <span className="truncate max-w-[200px] sm:max-w-xs md:max-w-md">{comment.media?.originalName || "Deleted Media"}</span>
                        </div>
                        <span className={cn("text-[11px] flex items-center gap-1 shrink-0", isDark ? "text-zinc-500" : "text-slate-400")}>
                          <Calendar className="w-3 h-3" />
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-start pt-2 sm:pt-0 border-t sm:border-t-0 border-white/[0.06] w-full sm:w-auto justify-end">
                    {comment.media?.token && (
                      <Link
                        href={`/media/${comment.media.token}`}
                        target="_blank"
                        className={cn(
                          "p-2 rounded-xl border transition-colors inline-flex items-center justify-center",
                          isDark
                            ? "border-white/[0.08] bg-white/[0.02] hover:bg-cyan-500/15 hover:border-cyan-500/30 text-zinc-400 hover:text-cyan-400"
                            : "border-slate-200/90 bg-slate-50/80 hover:bg-cyan-50 hover:border-cyan-200 text-slate-600 hover:text-cyan-700"
                        )}
                        title="Open Public Media Page"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    )}

                    <button
                      onClick={() =>
                        setDeleteTarget({
                          type: "comment",
                          id: comment.id,
                          title: `Comment by "${comment.name}"`,
                        })
                      }
                      className={cn(
                        "p-2 rounded-xl border transition-colors cursor-pointer inline-flex items-center justify-center",
                        isDark
                          ? "border-white/[0.08] bg-white/[0.02] hover:bg-red-500/15 hover:border-red-500/30 text-zinc-400 hover:text-red-400"
                          : "border-slate-200/90 bg-slate-50/80 hover:bg-red-50 hover:border-red-200 text-slate-600 hover:text-red-600"
                      )}
                      title="Moderate / Delete Comment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )
        ) : (
          /* RATINGS TAB */
          filteredRatings.length === 0 ? (
            <div className={cn(
              "rounded-2xl border p-8 sm:p-12 text-center",
              isDark ? "border-white/[0.08] bg-[#0a0a0c]" : "border-slate-200/90 bg-white shadow-2xs"
            )}>
              <Star className={cn("w-10 h-10 mx-auto mb-3", isDark ? "text-zinc-600" : "text-slate-300")} />
              <p className={cn("font-semibold text-base mb-1", isDark ? "text-white" : "text-slate-900")}>No ratings found</p>
              <p className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>
                {searchQuery ? "No star ratings matching your search criteria." : "None of your CDN files have received direct star ratings yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-3 w-full">
              {filteredRatings.map((rating) => (
                <motion.div
                  key={rating.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "rounded-2xl border p-4 sm:p-5 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4 w-full",
                    isDark
                      ? "bg-[#0a0a0c] border-white/[0.08] hover:border-white/[0.14]"
                      : "bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs"
                  )}
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Rating Profile Avatar */}
                    <div className={cn("w-10 h-10 rounded-full overflow-hidden border shrink-0 mt-0.5", isDark ? "border-white/[0.08]" : "border-slate-200/90")}>
                      <img
                        referrerPolicy="no-referrer"
                        src={
                          rating.avatar
                            ? `${rating.avatar}${rating.avatar.includes('?') ? '&' : '?'}v=4`
                            : rating.userEmail
                            ? `/api/avatar?email=${encodeURIComponent(rating.userEmail)}&name=${encodeURIComponent(rating.userName || rating.userEmail || 'Customer')}&v=4`
                            : `/api/avatar?name=Customer&v=4`
                        }
                        alt="User"
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = "flex";
                        }}
                      />
                      <div
                        style={{ display: "none" }}
                        className="w-full h-full bg-[#137333] items-center justify-center text-white font-medium text-sm"
                      >
                        {(rating.userName || rating.userEmail || "C").charAt(0).toUpperCase()}
                      </div>
                    </div>

                    <div className="min-w-0 space-y-2 flex-1">
                      {/* Rating score, type badge, user identifier, and IP address */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border font-bold text-xs shrink-0",
                          isDark ? "bg-amber-400/10 border-amber-400/25 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700"
                        )}>
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span>{rating.rating}.0 Stars</span>
                        </div>

                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold shrink-0",
                          isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200"
                        )}>
                          <ShieldCheck className="w-3 h-3" /> Direct Rating
                        </span>

                        {rating.userEmail ? (
                          <span className={cn(
                            "text-xs font-semibold flex items-center gap-1.5 truncate max-w-full sm:max-w-md",
                            isDark ? "text-zinc-200" : "text-slate-800"
                          )}>
                            <Mail className={cn("w-3.5 h-3.5 shrink-0", isDark ? "text-cyan-400" : "text-cyan-600")} />
                            <span className="truncate">
                              {rating.userName ? `${rating.userName} (${rating.userEmail})` : rating.userEmail}
                            </span>
                          </span>
                        ) : (
                          <span className={cn(
                            "text-xs font-semibold flex items-center gap-1.5 truncate max-w-full sm:max-w-md",
                            isDark ? "text-zinc-400" : "text-slate-600"
                          )}>
                            <User className={cn("w-3.5 h-3.5 shrink-0", isDark ? "text-zinc-500" : "text-slate-400")} />
                            <span className="truncate">Customer Visitor</span>
                          </span>
                        )}

                        {rating.ipAddress && (
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[11px] border shrink-0",
                            isDark ? "bg-white/[0.02] border-white/[0.08] text-zinc-300" : "bg-slate-50/80 border-slate-200/90 text-slate-700"
                          )}>
                            <span className="text-[10px] text-zinc-500 font-sans font-medium">IP:</span>
                            {rating.ipAddress}
                          </span>
                        )}
                      </div>

                      {/* Associated Media File & Date */}
                      <div className={cn("flex flex-wrap items-center gap-2.5 text-xs pt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs max-w-full font-medium truncate",
                          isDark ? "bg-white/[0.02] border-white/[0.08] text-zinc-300" : "bg-slate-50/80 border-slate-200/90 text-slate-700"
                        )}>
                          <FileVideo className={cn("w-3.5 h-3.5 shrink-0", isDark ? "text-cyan-400" : "text-cyan-600")} />
                          <span className="truncate max-w-[200px] sm:max-w-xs md:max-w-md">{rating.media?.originalName || "Deleted Media"}</span>
                        </div>
                        <span className={cn("text-[11px] flex items-center gap-1 shrink-0", isDark ? "text-zinc-500" : "text-slate-400")}>
                          <Calendar className="w-3 h-3" />
                          {formatDate(rating.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-start pt-2 sm:pt-0 border-t sm:border-t-0 border-white/[0.06] w-full sm:w-auto justify-end">
                    {rating.media?.token && (
                      <Link
                        href={`/media/${rating.media.token}`}
                        target="_blank"
                        className={cn(
                          "p-2 rounded-xl border transition-colors inline-flex items-center justify-center",
                          isDark
                            ? "border-white/[0.08] bg-white/[0.02] hover:bg-cyan-500/15 hover:border-cyan-500/30 text-zinc-400 hover:text-cyan-400"
                            : "border-slate-200/90 bg-slate-50/80 hover:bg-cyan-50 hover:border-cyan-200 text-slate-600 hover:text-cyan-700"
                        )}
                        title="Open Public Media Page"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    )}

                    <button
                      onClick={() =>
                        setDeleteTarget({
                          type: "rating",
                          id: rating.id,
                          title: `Rating (${rating.rating}★) on "${rating.media?.originalName || 'Media'}"`,
                        })
                      }
                      className={cn(
                        "p-2 rounded-xl border transition-colors cursor-pointer inline-flex items-center justify-center",
                        isDark
                          ? "border-white/[0.08] bg-white/[0.02] hover:bg-red-500/15 hover:border-red-500/30 text-zinc-400 hover:text-red-400"
                          : "border-slate-200/90 bg-slate-50/80 hover:bg-red-50 hover:border-red-200 text-slate-600 hover:text-red-600"
                      )}
                      title="Moderate / Delete Rating"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )
        )}
      </div>

      {/* ── CONFIRM MODERATION / DELETE MODAL ─────────────────────────────────── */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={deleteTarget?.type === "comment" ? "Delete Media Comment" : "Delete Star Rating"}
        description={`Are you sure you want to delete ${deleteTarget?.title}? This review will be permanently removed from your CDN file.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
        variant="danger"
      />
    </div>
  );
}
