"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Star, MessageSquare, ShieldCheck, Mail, Send, CheckCircle2,
  AlertCircle, Loader2, Sparkles, X, RefreshCw, PenSquare,
  MessagesSquare, Smile
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";

interface CommentReaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

interface Comment {
  id: number;
  name: string;
  avatar?: string;
  content: string;
  rating: number | null;
  isVerified: boolean;
  createdAt: string;
  reactions?: CommentReaction[];
}

interface RatingData {
  averageRating: number;
  totalRatings: number;
  ratingCounts: Record<number, number>;
  userRating: number | null;
}

export function MediaEngagement({ token, fileName }: { token: string; fileName: string }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Rating states
  const [ratingData, setRatingData] = useState<RatingData>({
    averageRating: 0,
    totalRatings: 0,
    ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    userRating: null,
  });
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState(false);

  // Comment states
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [hasCommented, setHasCommented] = useState(false);

  // Reaction picker states
  const EMOJI_OPTIONS = ["👍", "❤️", "🔥", "👏", "💡", "😂", "🚀", "🎉"];
  const [openReactionPickerId, setOpenReactionPickerId] = useState<number | null>(null);

  // Form states
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [commentText, setCommentText] = useState("");
  const [commentRating, setCommentRating] = useState<number>(5);

  // OTP Modal states
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Close reaction picker on outside click
  useEffect(() => {
    if (openReactionPickerId === null) return;
    const handleDocumentClick = () => {
      setOpenReactionPickerId(null);
    };
    document.addEventListener("click", handleDocumentClick);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, [openReactionPickerId]);

  // Load ratings and comments (sorted newest first)
  useEffect(() => {
    fetch(`/api/media/${token}/rating`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setRatingData(data);
      })
      .catch(() => { });

    fetch(`/api/media/${token}/comments`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.comments) {
          const sorted = [...data.comments].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setComments(sorted);
        }
        if (data?.hasCommented) {
          setHasCommented(true);
        }
        setLoadingComments(false);
      })
      .catch(() => setLoadingComments(false));
  }, [token]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Reset and auto-focus first OTP digit when modal opens
  useEffect(() => {
    if (isOtpModalOpen) {
      setOtpDigits(["", "", "", "", "", ""]);
      setOtpError(null);
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    }
  }, [isOtpModalOpen]);

  const handleDigitChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, "");
    if (!clean) {
      const next = [...otpDigits];
      next[index] = "";
      setOtpDigits(next);
      return;
    }

    if (clean.length > 1) {
      const chars = clean.slice(0, 6).split("");
      const next = ["", "", "", "", "", ""];
      chars.forEach((c, i) => {
        next[i] = c;
      });
      setOtpDigits(next);
      const nextFocus = Math.min(chars.length, 5);
      otpInputsRef.current[nextFocus]?.focus();
      return;
    }

    const next = [...otpDigits];
    next[index] = clean;
    setOtpDigits(next);

    if (index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otpDigits[index] && index > 0) {
        otpInputsRef.current[index - 1]?.focus();
        const next = [...otpDigits];
        next[index - 1] = "";
        setOtpDigits(next);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      otpInputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault();
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const chars = pasted.split("");
    const next = ["", "", "", "", "", ""];
    chars.forEach((c, i) => {
      next[i] = c;
    });
    setOtpDigits(next);
    const nextFocus = Math.min(chars.length, 5);
    otpInputsRef.current[nextFocus]?.focus();
  };

  // Handle direct star rating (1 per person limit)
  const handleRate = async (val: number) => {
    if (submittingRating || ratingData.userRating !== null) return;
    setSubmittingRating(true);
    try {
      const res = await fetch(`/api/media/${token}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: val, email: authorEmail || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 || data.error) {
          // If already rated, record user rating to disable picker
          setRatingData((prev) => ({
            ...prev,
            userRating: prev.userRating || val,
          }));
        }
        return;
      }
      if (data.success) {
        setRatingData((prev) => ({
          ...prev,
          userRating: data.userRating,
          averageRating: data.averageRating,
          totalRatings: data.totalRatings,
          ratingCounts: {
            ...prev.ratingCounts,
            [val]: (prev.ratingCounts[val] || 0) + 1,
          },
        }));
        setRatingSuccess(true);
        setTimeout(() => setRatingSuccess(false), 3000);
      }
    } catch {
      // ignore
    } finally {
      setSubmittingRating(false);
    }
  };

  // Trigger OTP sending
  const handleInitiateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!authorName.trim() || authorName.length < 2) {
      setFormError("Full name must be at least 2 characters.");
      return;
    }
    const lowerEmail = authorEmail.trim().toLowerCase();
    if (lowerEmail.endsWith("@masdika.id") || lowerEmail.endsWith(".masdika.id")) {
      setFormError("Official @masdika.id email addresses cannot be used for public comments.");
      return;
    }

    if (!commentText.trim() || commentText.length < 3) {
      setFormError("Comment must be at least 3 characters.");
      return;
    }

    setIsSendingOtp(true);
    setOtpError(null);

    try {
      const res = await fetch(`/api/media/${token}/otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authorEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Failed to send verification code.");
        setIsSendingOtp(false);
        return;
      }

      setIsSendingOtp(false);
      setIsOtpModalOpen(true);
      setResendCooldown(60);
    } catch {
      setFormError("A network error occurred while sending the OTP.");
      setIsSendingOtp(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isSendingOtp) return;
    setIsSendingOtp(true);
    setOtpError(null);
    try {
      const res = await fetch(`/api/media/${token}/otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authorEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || "Failed to resend OTP code.");
      } else {
        setResendCooldown(60);
      }
    } catch {
      setOtpError("Failed to resend verification code.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Submit comment with OTP
  const handleVerifyAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otpDigits.join("");
    if (!fullOtp || fullOtp.length !== 6) {
      setOtpError("Please enter the 6-digit verification code.");
      return;
    }

    setIsSubmittingComment(true);
    setOtpError(null);

    try {
      const res = await fetch(`/api/media/${token}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: authorName,
          email: authorEmail,
          content: commentText,
          rating: commentRating,
          otp: fullOtp.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || "OTP verification failed.");
        setIsSubmittingComment(false);
        return;
      }

      // Success: add comment to top of list
      const newComment: Comment = {
        ...data.comment,
        reactions: data.comment.reactions || [],
      };
      setComments((prev) => [newComment, ...prev.filter((c) => c.id !== newComment.id)]);
      setHasCommented(true);
      setIsOtpModalOpen(false);
      setCommentText("");
      setOtpDigits(["", "", "", "", "", ""]);

      // Smooth scroll to comments feed so new comment is immediately visible at top
      setTimeout(() => {
        const feedEl = document.getElementById("comments-feed");
        if (feedEl) {
          feedEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 150);

      // Update rating data if rated
      if (commentRating) {
        setRatingData((prev) => {
          const newTotal = prev.totalRatings + 1;
          const newSum = prev.averageRating * prev.totalRatings + commentRating;
          return {
            ...prev,
            userRating: commentRating,
            totalRatings: newTotal,
            averageRating: parseFloat((newSum / newTotal).toFixed(1)),
          };
        });
      }
    } catch {
      setOtpError("An error occurred while validating your comment.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Toggle emoji reaction
  const handleToggleReaction = async (commentId: number, emoji: string) => {
    // Optimistic reaction update
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        const currentReactions = c.reactions || [];
        const existingIdx = currentReactions.findIndex((r) => r.emoji === emoji);

        let nextReactions: CommentReaction[];
        if (existingIdx >= 0) {
          const item = currentReactions[existingIdx];
          if (item.hasReacted) {
            // Unreact
            if (item.count <= 1) {
              nextReactions = currentReactions.filter((r) => r.emoji !== emoji);
            } else {
              nextReactions = currentReactions.map((r, i) =>
                i === existingIdx ? { ...r, count: r.count - 1, hasReacted: false } : r
              );
            }
          } else {
            // React
            nextReactions = currentReactions.map((r, i) =>
              i === existingIdx ? { ...r, count: r.count + 1, hasReacted: true } : r
            );
          }
        } else {
          // New reaction emoji
          nextReactions = [...currentReactions, { emoji, count: 1, hasReacted: true }];
        }

        return { ...c, reactions: nextReactions };
      })
    );

    setOpenReactionPickerId(null);

    try {
      const res = await fetch(`/api/media/${token}/comments/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, emoji }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.reactions) {
          setComments((prev) =>
            prev.map((c) => (c.id === commentId ? { ...c, reactions: data.reactions } : c))
          );
        }
      }
    } catch (err) {
      console.error("Failed to toggle reaction:", err);
    }
  };

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
    <div id="engagement-section" className="w-full space-y-8 mt-4 pb-28">
      {/* ── RATINGS & OVERVIEW CARD ────────────────────────────────────────────── */}
      <section className={cn("relative overflow-hidden rounded-2xl border p-5 sm:p-8 backdrop-blur-xl transition-all duration-300", isDark ? "bg-gradient-to-b from-[#0c0f24] to-[#070914] border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]" : "bg-white border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.06)]")}>
        <div className={cn("absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32 transition-all", isDark ? "bg-cyan-500/10" : "bg-cyan-500/5")} />

        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
          {/* Average Rating Score */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-6 w-full lg:w-auto">
            <div className={cn("flex flex-col items-center justify-center w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border shrink-0 transition-all", isDark ? "bg-cyan-500/10 border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.15)]" : "bg-cyan-50 border-cyan-200 shadow-xs")}>
              <span className={cn("text-3xl sm:text-4xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                {ratingData.totalRatings > 0 ? ratingData.averageRating : "-"}
              </span>
              <div className="flex items-center gap-0.5 text-amber-400 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "w-3.5 h-3.5",
                      star <= Math.round(ratingData.averageRating)
                        ? "fill-amber-400 text-amber-400"
                        : isDark ? "text-zinc-600" : "text-slate-300"
                    )}
                  />
                ))}
              </div>
              <span className={cn("text-[11px] font-medium mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>
                {ratingData.totalRatings} {ratingData.totalRatings === 1 ? "review" : "reviews"}
              </span>
            </div>

            <div className="flex-1">
              <div className={cn("inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-semibold tracking-wide uppercase mb-2", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
                <Sparkles className="w-3.5 h-3.5" /> Ratings & Reviews
              </div>
              <h2 className={cn("text-lg sm:text-xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                How would you rate this media?
              </h2>
              <p className={cn("text-xs sm:text-sm mt-1", isDark ? "text-zinc-400" : "text-slate-600")}>
                Share your rating to give valuable feedback to the creator.
              </p>
            </div>
          </div>

          {/* Interactive Star Picker */}
          <div className={cn("flex flex-col items-center lg:items-end w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0", isDark ? "border-white/5" : "border-slate-100")}>
            <span className={cn("text-xs mb-2 font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>
              {ratingData.userRating ? "Your rating (recorded, 1 per person):" : "Click to rate:"}
            </span>
            <div className="flex items-center justify-center gap-2 sm:gap-2.5">
              {[1, 2, 3, 4, 5].map((star) => {
                const isSelected = (hoverRating || ratingData.userRating || 0) >= star;
                const isAlreadyRated = ratingData.userRating !== null;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => !isAlreadyRated && handleRate(star)}
                    onMouseEnter={() => !isAlreadyRated && setHoverRating(star)}
                    onMouseLeave={() => !isAlreadyRated && setHoverRating(0)}
                    disabled={submittingRating || isAlreadyRated}
                    aria-label={`Rate ${star} Stars`}
                    title={isAlreadyRated ? "You have already submitted a rating (limit: 1 per person)" : `Rate ${star} Stars`}
                    className={cn(
                      "p-1 rounded-lg transition-transform focus:outline-none",
                      isAlreadyRated
                        ? "cursor-default opacity-90"
                        : "hover:scale-125 focus:ring-2 focus:ring-cyan-500/50 cursor-pointer"
                    )}
                  >
                    <Star
                      className={cn(
                        "w-7 h-7 sm:w-8 sm:h-8 transition-colors drop-shadow-sm",
                        isSelected
                          ? "fill-amber-400 text-amber-400"
                          : isDark ? "text-zinc-600 hover:text-zinc-400" : "text-slate-300 hover:text-slate-400"
                      )}
                    />
                  </button>
                );
              })}
            </div>

            {ratingSuccess && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex items-center gap-1.5 text-xs mt-2 font-medium", isDark ? "text-cyan-400" : "text-cyan-600")}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Your rating has been saved!
              </motion.div>
            )}
          </div>
        </div>

        {/* Rating Breakdown Progress Bars */}
        <div className={cn("grid grid-cols-1 sm:grid-cols-5 gap-2 mt-6 pt-6 border-t", isDark ? "border-white/5" : "border-slate-100")}>
          {[5, 4, 3, 2, 1].map((level) => {
            const count = ratingData.ratingCounts[level] || 0;
            const percentage = ratingData.totalRatings > 0 ? (count / ratingData.totalRatings) * 100 : 0;
            return (
              <div key={level} className={cn("flex items-center gap-2 text-xs", isDark ? "text-zinc-400" : "text-slate-600")}>
                <span className="w-6 font-medium text-right">{level}★</span>
                <div className={cn("flex-1 h-2 rounded-full overflow-hidden", isDark ? "bg-white/5" : "bg-slate-100")}>
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className={cn("w-8 text-[11px] text-right", isDark ? "text-zinc-500" : "text-slate-400")}>{count}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── COMMENT & DISCUSSION SECTION ──────────────────────────────────────── */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center transition-all", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
              <PenSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className={cn("text-xl font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                Leave a Comment
              </h3>
              <p className={cn("text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>
                Share your review, question, or feedback (OTP verified)
              </p>
            </div>
          </div>
        </div>

        {/* Form Write Comment or Already Commented Notice */}
        {hasCommented ? (
          <div className={cn("rounded-2xl border p-6 sm:p-8 text-center backdrop-blur-xl transition-all shadow-md", isDark ? "bg-[#0c0f24]/90 border-cyan-500/25 shadow-[0_0_30px_rgba(6,182,212,0.1)]" : "bg-cyan-50/70 border-cyan-200")}>
            <div className={cn("w-12 h-12 rounded-2xl border flex items-center justify-center mx-auto mb-3.5", isDark ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]" : "bg-cyan-100 border-cyan-300 text-cyan-700")}>
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className={cn("text-base sm:text-lg font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              You Have Already Shared a Comment
            </h4>
            <p className={cn("text-xs sm:text-sm mt-1.5 max-w-md mx-auto leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>
              Thank you for your review! To preserve authentic discussions and prevent spam, each user is limited to 1 verified comment per media.
            </p>
          </div>
        ) : (
          <div className={cn("rounded-2xl border p-6 backdrop-blur-xl shadow-lg relative transition-all duration-300", isDark ? "bg-[#0c0f24]/90 border-white/10" : "bg-white border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.06)]")}>
            <form onSubmit={handleInitiateComment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={cn("block text-xs font-semibold mb-1.5 uppercase tracking-wider", isDark ? "text-zinc-300" : "text-slate-700")}>
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Alex Johnson"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className={cn("w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500", isDark ? "bg-black/40 border-white/10 text-white placeholder-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white")}
                    required
                  />
                </div>

                <div>
                  <label className={cn("block text-xs font-semibold mb-1.5 uppercase tracking-wider", isDark ? "text-zinc-300" : "text-slate-700")}>
                    Email Address (OTP Verification Required)
                  </label>
                  <input
                    type="email"
                    placeholder="name@email.com"
                    value={authorEmail}
                    onChange={(e) => setAuthorEmail(e.target.value)}
                    className={cn("w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500", isDark ? "bg-black/40 border-white/10 text-white placeholder-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white")}
                    required
                  />
                </div>
              </div>

              {/* Optional Rating in Comment */}
              <div>
                <label className={cn("block text-xs font-semibold mb-1.5 uppercase tracking-wider", isDark ? "text-zinc-300" : "text-slate-700")}>
                  Include Star Rating (Optional)
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCommentRating(val)}
                      className="p-1 rounded transition-transform hover:scale-110 cursor-pointer"
                    >
                      <Star
                        className={cn(
                          "w-5 h-5",
                          commentRating >= val
                            ? "fill-amber-400 text-amber-400"
                            : isDark ? "text-zinc-600" : "text-slate-300"
                        )}
                      />
                    </button>
                  ))}
                  <span className={cn("text-xs ml-2 font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>
                    {commentRating} Stars
                  </span>
                </div>
              </div>

              <div>
                <label className={cn("block text-xs font-semibold mb-1.5 uppercase tracking-wider", isDark ? "text-zinc-300" : "text-slate-700")}>
                  Your Comment
                </label>
                <textarea
                  rows={3}
                  placeholder="Share your thoughts, review, or feedback about this media..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className={cn("w-full px-4 py-3 rounded-xl border text-sm transition-all resize-none focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500", isDark ? "bg-black/40 border-white/10 text-white placeholder-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white")}
                  required
                />
              </div>

              {formError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-500 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t", isDark ? "border-white/5" : "border-slate-100")}>
                <div className={cn("flex items-center gap-2 text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>
                  <ShieldCheck className="w-4 h-4 text-cyan-500 shrink-0" />
                  <span>Anti-Spam OTP via email enabled (1 per person)</span>
                </div>

                <button
                  type="submit"
                  disabled={isSendingOtp}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-[#011627] font-semibold text-xs sm:text-sm whitespace-nowrap shrink-0 transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)] cursor-pointer active:scale-95 self-end sm:self-auto"
                >
                  {isSendingOtp ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending OTP...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Verify & Submit</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── COMMENTS & DISCUSSION FEED HEADER ───────────────────────────────── */}
        <div id="comments-feed" className="pt-2 scroll-mt-24">
          <div className={cn(
            "flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b transition-colors",
            isDark ? "border-white/10" : "border-slate-200"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border transition-all shrink-0",
                isDark
                  ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                  : "bg-cyan-50 border-cyan-200 text-cyan-600 shadow-xs"
              )}>
                <MessagesSquare className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className={cn("text-base sm:text-lg font-bold tracking-tight leading-tight", isDark ? "text-white" : "text-slate-900")}>
                    Comments & Discussions
                  </h3>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[11px] font-bold font-mono border",
                    isDark
                      ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/25 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                      : "bg-cyan-50 text-cyan-700 border-cyan-200"
                  )}>
                    {comments.length}
                  </span>
                </div>
                <p className={cn("text-[11px] sm:text-xs leading-tight mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                  Verified community feedback and reviews
                </p>
              </div>
            </div>

            {/* Shield Status Badge */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border",
                isDark
                  ? "bg-white/5 border-white/10 text-zinc-400"
                  : "bg-slate-100 border-slate-200 text-slate-600"
              )}>
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Verified Feedback</span>
              </div>
            </div>
          </div>
        </div>

        {/* Comment List */}
        <div className="space-y-4">
          {loadingComments ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className={cn("rounded-2xl border p-10 text-center transition-all", isDark ? "border-white/5 bg-[#0a0d20]/50" : "border-slate-200 bg-white shadow-xs")}>
              <MessageSquare className={cn("w-12 h-12 mx-auto mb-3", isDark ? "text-zinc-600" : "text-slate-400")} />
              <p className={cn("font-semibold text-base mb-1", isDark ? "text-zinc-300" : "text-slate-800")}>
                No comments yet
              </p>
              <p className={cn("text-xs max-w-sm mx-auto", isDark ? "text-zinc-500" : "text-slate-500")}>
                Be the first to share your review or question about this media!
              </p>
            </div>
          ) : (
            comments.map((comment) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("rounded-2xl border p-5 backdrop-blur-md transition-all", isDark ? "bg-[#0c0f24]/80 border-white/5 hover:border-white/10" : "bg-white border-slate-200/80 hover:border-slate-300 shadow-xs")}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {/* User Profile Avatar (Google / Gravatar / Initials - identical to Customers page) */}
                    <div className={cn("w-10 h-10 rounded-full overflow-hidden border shrink-0", isDark ? "border-white/10" : "border-slate-200")}>
                      <img
                        referrerPolicy="no-referrer"
                        src={comment.avatar ? `${comment.avatar}${comment.avatar.includes('?') ? '&' : '?'}v=4` : `/api/avatar?name=${encodeURIComponent(comment.name)}&v=4`}
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

                    <div>
                      <div className="flex items-center gap-2">
                        <span className={cn("font-semibold text-sm", isDark ? "text-white" : "text-slate-900")}>
                          {comment.name}
                        </span>
                        {comment.isVerified && (
                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
                            <ShieldCheck className="w-3 h-3" /> Verified Email
                          </span>
                        )}
                      </div>
                      <span className={cn("text-[11px]", isDark ? "text-zinc-500" : "text-slate-400")}>
                        {formatDate(comment.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Rating Tag */}
                  {comment.rating && (
                    <div className={cn("flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold", isDark ? "bg-amber-400/10 border-amber-400/20 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-700")}>
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{comment.rating}.0</span>
                    </div>
                  )}
                </div>

                <p className={cn("text-sm mt-3 whitespace-pre-wrap leading-relaxed", isDark ? "text-zinc-300" : "text-slate-700")}>
                  {comment.content}
                </p>

                {/* Reactions Toolbar */}
                <div className={cn("flex flex-wrap items-center gap-1.5 mt-3.5 pt-3 border-t border-dashed relative", isDark ? "border-white/10" : "border-slate-200")}>
                  {/* Existing Reaction Badges */}
                  {comment.reactions && comment.reactions.map((reaction) => (
                    <button
                      key={reaction.emoji}
                      type="button"
                      onClick={() => handleToggleReaction(comment.id, reaction.emoji)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer select-none",
                        reaction.hasReacted
                          ? isDark
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.25)] font-semibold"
                            : "bg-cyan-50 text-cyan-700 border border-cyan-300 shadow-xs font-semibold"
                          : isDark
                            ? "bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                      )}
                      title={reaction.hasReacted ? "Click to remove reaction" : "Click to react"}
                    >
                      <span className="text-sm leading-none">{reaction.emoji}</span>
                      <span className="font-semibold text-[11px]">{reaction.count}</span>
                    </button>
                  ))}

                  {/* Add Reaction Button (+ Emoji picker trigger) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenReactionPickerId((prev) => (prev === comment.id ? null : comment.id));
                      }}
                      className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer",
                        openReactionPickerId === comment.id
                          ? isDark
                            ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                            : "bg-cyan-50 text-cyan-700 border-cyan-300"
                          : isDark
                            ? "bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 border-white/10"
                            : "bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 border-slate-200"
                      )}
                      title="Add reaction"
                      aria-label="Add reaction"
                    >
                      <Smile className="w-3.5 h-3.5" />
                      <span className="text-[11px] leading-none font-bold">+</span>
                    </button>

                    {/* Floating Emoji Picker Popover */}
                    {openReactionPickerId === comment.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          "absolute left-0 bottom-full mb-2 z-30 flex items-center gap-1 p-1.5 rounded-full border shadow-2xl backdrop-blur-xl",
                          isDark
                            ? "bg-[#0b0e24]/95 border-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
                            : "bg-white/95 border-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.15)]"
                        )}
                      >
                        {EMOJI_OPTIONS.map((emoji) => {
                          const isSelected = comment.reactions?.some((r) => r.emoji === emoji && r.hasReacted);
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleToggleReaction(comment.id, emoji)}
                              className={cn(
                                "w-7 h-7 flex items-center justify-center rounded-full text-base transition-transform hover:scale-125 active:scale-95 cursor-pointer",
                                isSelected
                                  ? isDark
                                    ? "bg-cyan-500/30"
                                    : "bg-cyan-100"
                                  : isDark
                                    ? "hover:bg-white/10"
                                    : "hover:bg-slate-100"
                              )}
                              title={emoji}
                            >
                              {emoji}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* ── EMAIL OTP VERIFICATION MODAL ─────────────────────────────────────── */}
      <AnimatePresence>
        {isOtpModalOpen && (
          <div className={cn("fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md", isDark ? "bg-black/80" : "bg-slate-900/60")}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={cn(
                "relative w-full max-w-[390px] rounded-2xl border p-5 sm:p-6 text-center transition-all",
                isDark
                  ? "bg-[#0b0e24] border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.22)] text-white"
                  : "bg-white border-slate-200 shadow-2xl text-slate-900"
              )}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsOtpModalOpen(false)}
                className={cn("absolute top-3.5 right-3.5 transition-colors p-1.5 rounded-lg cursor-pointer", isDark ? "text-zinc-400 hover:text-white" : "text-slate-400 hover:text-slate-700")}
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header Icon Badge */}
              <div className={cn("w-11 h-11 rounded-xl border flex items-center justify-center mx-auto mb-3 transition-all", isDark ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)]" : "bg-cyan-50 border-cyan-200 text-cyan-600 shadow-xs")}>
                <ShieldCheck className="w-5 h-5" />
              </div>

              <h4 className={cn("text-base sm:text-lg font-bold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                Email Verification
              </h4>
              <p className={cn("text-xs mt-1.5 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>
                Enter the 6-digit code sent to:
              </p>
              <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 mt-1.5 rounded-full border text-xs font-mono max-w-[280px] mx-auto", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-300" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
                <Mail className="w-3.5 h-3.5 shrink-0 text-cyan-500" />
                <span className="truncate">{authorEmail}</span>
              </div>

              {/* Form Input 6-Digit OTP (3 + 3 Grouping) */}
              <form onSubmit={handleVerifyAndSubmit} className="mt-5 space-y-4">
                <div>
                  <div
                    className="flex items-center justify-center gap-1.5 sm:gap-2 my-2"
                    onPaste={handleOtpPaste}
                  >
                    {/* First 3 digits */}
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      {[0, 1, 2].map((idx) => (
                        <input
                          key={idx}
                          ref={(el) => {
                            otpInputsRef.current[idx] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={idx === 0 ? 6 : 1}
                          value={otpDigits[idx]}
                          onChange={(e) => handleDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                          className={cn(
                            "w-10 h-12 sm:w-11 sm:h-13 text-center text-xl sm:text-2xl font-bold font-mono rounded-xl border transition-all duration-200 select-all",
                            "focus:outline-none focus:ring-2",
                            isDark
                              ? otpDigits[idx]
                                ? "bg-cyan-500/15 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.35)] ring-cyan-500/40"
                                : "bg-black/50 border-white/10 text-white focus:border-cyan-400 focus:ring-cyan-500/40 focus:bg-cyan-500/10"
                              : otpDigits[idx]
                                ? "bg-cyan-50 border-cyan-500 text-cyan-700 shadow-sm ring-cyan-500/30"
                                : "bg-slate-50 border-slate-200 text-slate-800 focus:border-cyan-500 focus:ring-cyan-500/20 focus:bg-white"
                          )}
                        />
                      ))}
                    </div>

                    {/* Subtle divider */}
                    <div className="w-2 flex items-center justify-center shrink-0">
                      <div className={cn("w-2 h-0.5 rounded-full", isDark ? "bg-cyan-500/40" : "bg-slate-300")} />
                    </div>

                    {/* Second 3 digits */}
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      {[3, 4, 5].map((idx) => (
                        <input
                          key={idx}
                          ref={(el) => {
                            otpInputsRef.current[idx] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={1}
                          value={otpDigits[idx]}
                          onChange={(e) => handleDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                          className={cn(
                            "w-10 h-12 sm:w-11 sm:h-13 text-center text-xl sm:text-2xl font-bold font-mono rounded-xl border transition-all duration-200 select-all",
                            "focus:outline-none focus:ring-2",
                            isDark
                              ? otpDigits[idx]
                                ? "bg-cyan-500/15 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.35)] ring-cyan-500/40"
                                : "bg-black/50 border-white/10 text-white focus:border-cyan-400 focus:ring-cyan-500/40 focus:bg-cyan-500/10"
                              : otpDigits[idx]
                                ? "bg-cyan-50 border-cyan-500 text-cyan-700 shadow-sm ring-cyan-500/30"
                                : "bg-slate-50 border-slate-200 text-slate-800 focus:border-cyan-500 focus:ring-cyan-500/20 focus:bg-white"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  <p className={cn("text-[11px] mt-2", isDark ? "text-zinc-500" : "text-slate-500")}>
                    Enter the 6-digit code from your email inbox or spam
                  </p>
                </div>

                {otpError && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-500 text-xs text-left">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{otpError}</span>
                  </div>
                )}

                <div className="flex flex-col gap-2.5 pt-1">
                  <button
                    type="submit"
                    disabled={isSubmittingComment || otpDigits.join("").length !== 6}
                    className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-[#011627] font-bold text-xs sm:text-sm transition-all shadow-[0_0_20px_rgba(6,182,212,0.35)] cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmittingComment ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Verify & Publish</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || isSendingOtp}
                    className={cn(
                      "text-xs transition-colors py-1 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40",
                      isDark ? "text-zinc-400 hover:text-cyan-400 disabled:hover:text-zinc-400" : "text-slate-500 hover:text-cyan-600 disabled:hover:text-slate-500"
                    )}
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5", isSendingOtp && "animate-spin")} />
                    <span>
                      {resendCooldown > 0
                        ? `Resend code in (${resendCooldown}s)`
                        : "Resend OTP Code"}
                    </span>
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
