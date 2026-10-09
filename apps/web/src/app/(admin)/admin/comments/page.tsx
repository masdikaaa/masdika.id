"use client";
import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";
import { MessageCircle, Reply, Trash2, ExternalLink, ShieldAlert, ShieldBan, ShieldCheck, CheckCircle, Mail, Check , RefreshCw , MessageSquare } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import Link from "next/link";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { motion } from "framer-motion";

export default function AdminCommentsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [userToBlock, setUserToBlock] = useState<{ id: number, email: string, ipAddress?: string, content: string } | null>(null);
  const [blocking, setBlocking] = useState(false);
  const [unblocking, setUnblocking] = useState<number | null>(null);
  const [approving, setApproving] = useState<number | null>(null);
  const [resendingEmail, setResendingEmail] = useState<number | null>(null);

  // Modal states
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [approveId, setApproveId] = useState<number | null>(null);
  const [isApprovingAction, setIsApprovingAction] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const fetchComments = async () => {
    try {
      const res = await fetch("/api/admin/comments");
      const data = await res.json();
      if (!data.error) {
        setComments(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/admin/comments/${deleteId}`, { method: "DELETE" });
      fetchComments();
      toast.success("Comment deleted");
      window.dispatchEvent(new Event('notificationsUpdated'));
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete comment");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeletingAll(true);
    try {
      const res = await fetch('/api/admin/comments/bulk-delete', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });
      if (res.ok) {
        setComments(comments.filter(c => !selectedIds.includes(c.id)));
        setSelectedIds([]);
        toast.success(`${selectedIds.length} comments deleted`);
        window.dispatchEvent(new Event('notificationsUpdated'));
      } else {
        toast.error("Failed to delete comments");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setIsDeletingAll(false);
      setShowDeleteAllModal(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === comments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(comments.map(c => c.id));
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const openBlockModal = (comment: any) => {
    setUserToBlock({
      id: comment.id,
      email: comment.email,
      ipAddress: comment.ipAddress,
      content: comment.content
    });
    setBlockModalOpen(true);
  };

  const confirmBlock = async () => {
    if (!userToBlock) return;
    setBlocking(true);
    try {
      const reason = `Spam from comment: ${userToBlock.content.substring(0, 20)}`;
      
      // Block Email
      await fetch(`/api/admin/blocked-users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: 'EMAIL', value: userToBlock.email, reason })
      });
      
      // Block IP if exists
      if (userToBlock.ipAddress) {
        await fetch(`/api/admin/blocked-users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: 'IP', value: userToBlock.ipAddress, reason })
        });
      }
      
      toast.success("User blocked successfully", {
        description: "Email and IP address have been added to the blacklist.",
      });
      
      setBlockModalOpen(false);
      setUserToBlock(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to block user");
    } finally {
      setBlocking(false);
    }
  };

  const handleUnblock = async (comment: any) => {
    setUnblocking(comment.id);
    try {
      const params = new URLSearchParams();
      if (comment.email) params.append('email', comment.email);
      if (comment.ipAddress) params.append('ipAddress', comment.ipAddress);

      await fetch(`/api/admin/blocked-users?${params.toString()}`, {
        method: "DELETE",
      });
      
      toast.success("User unblocked", {
        description: "They can now submit comments again.",
      });
      fetchComments();
    } catch (err) {
      console.error(err);
      toast.error("Failed to unblock user");
    } finally {
      setUnblocking(null);
    }
  };

  const handleApprove = async () => {
    if (!approveId) return;
    setIsApprovingAction(true);
    setApproving(approveId);
    try {
      await fetch(`/api/admin/comments/${approveId}/approve`, { method: "POST" });
      toast.success("Comment approved", { description: "The comment is now live on the blog." });
      fetchComments();
      window.dispatchEvent(new Event('notificationsUpdated'));
    } catch (err) {
      console.error(err);
      toast.error("Failed to approve comment");
    } finally {
      setIsApprovingAction(false);
      setApproving(null);
      setApproveId(null);
    }
  };

  const handleResendEmail = async (id: number) => {
    setResendingEmail(id);
    try {
      await fetch(`/api/admin/comments/${id}/resend-email`, { method: "POST" });
      toast.success("Email sent", { description: "Verification email has been resent to the user." });
    } catch (err) {
      console.error(err);
      toast.error("Failed to resend email");
    } finally {
      setResendingEmail(null);
    }
  };

  const handleReplySubmit = async (e: React.FormEvent, parentId: number) => {
    e.preventDefault();
    if (!replyContent) return;
    setSubmittingReply(true);
    try {
      await fetch(`/api/admin/comments/${parentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent })
      });
      setReplyContent("");
      setReplyingTo(null);
      fetchComments();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReply(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <RefreshCw className={cn("w-10 h-10 animate-spin", isDark ? "text-cyan-500" : "text-cyan-700")} />
      </div>
    );
  }

  const renderCommentContent = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => 
      part.startsWith('@') ? <span key={i} className={cn("font-semibold", isDark ? "text-cyan-400" : "text-cyan-700")}>{part}</span> : part
    );
  };

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row md:items-end justify-between gap-6 mb-6">
        <div>
          <h1 className={cn("text-3xl font-extrabold drop-shadow-sm mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Comments</h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Manage and reply to blog post comments</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {comments.length > 0 && (
            <button 
              onClick={toggleSelectAll}
              className={cn("flex items-center gap-2 px-5 py-2 font-bold rounded-xl transition-all border", isDark ? "text-white border-white/10 hover:bg-white/10" : "text-slate-900 border-slate-200 hover:bg-slate-100")}
            >
              <div className={`w-5 h-5 border rounded flex items-center justify-center ${selectedIds.length === comments.length ? 'bg-cyan-500 border-cyan-500' : isDark ? "border-zinc-500" : "border-slate-300"}`}>
                {selectedIds.length === comments.length && <CheckCircle className="w-3.5 h-3.5 text-slate-900" />}
              </div>
              {selectedIds.length === comments.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
          <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
            <MessageCircle className={cn("w-5 h-5 sm:w-6 sm:h-6", isDark ? "text-cyan-400" : "text-cyan-700")} />
          </div>
          {selectedIds.length > 0 && (
            <button 
              onClick={() => setShowDeleteAllModal(true)}
              className={cn("flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-red-500/10 hover:bg-red-500/20 font-bold rounded-xl transition-all border border-red-500/20", isDark ? "text-red-400" : "text-red-700")}
            >
              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
              Delete ({selectedIds.length})
            </button>
          )}
      </div>
      </div>

      <div className="space-y-6">
        {comments.map((comment) => (
          <div key={comment.id} className={cn("border p-6 rounded-2xl relative overflow-hidden group flex gap-4", isDark ? "bg-[#0a1f33] border-white/5" : "bg-white border-slate-200")}>
            <div className="pt-2 shrink-0">
              <button onClick={() => toggleSelect(comment.id)} className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${selectedIds.includes(comment.id) ? 'bg-cyan-500 border-cyan-500' : isDark ? "border-zinc-500 hover:border-cyan-400" : "border-slate-300 hover:border-cyan-600"}`}>
                {selectedIds.includes(comment.id) && <CheckCircle className="w-3.5 h-3.5 text-slate-900" />}
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-4">
              <div className="flex items-start gap-3">
                <div className={cn("w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center font-bold shrink-0 mt-1 text-white")}>
                  {comment.isAdmin ? "A" : comment.name[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={cn("font-bold truncate max-w-[150px] sm:max-w-xs", isDark ? "text-white" : "text-slate-900")}>{comment.name}</span>
                    {comment.isAdmin && <span className={cn("text-[10px] bg-cyan-500/20 px-1.5 py-0.5 rounded border border-cyan-500/20 whitespace-nowrap", isDark ? "text-cyan-400" : "text-cyan-700")}>Admin</span>}
                    {!comment.isVerified && !comment.isAdmin && <span className={cn("text-[10px] bg-red-500/20 px-1.5 py-0.5 rounded border border-red-500/20 whitespace-nowrap", isDark ? "text-red-400" : "text-red-700")}>Unverified</span>}
                    <span className="text-sm text-zinc-500 whitespace-nowrap">{new Date(comment.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="text-xs text-zinc-500 flex flex-wrap items-center gap-2">
                    <span className="break-all">{comment.email}</span>
                    {comment.ipAddress && (
                      <>
                        <span>•</span>
                        <span className={cn("font-mono px-1.5 py-0.5 rounded border", isDark ? "bg-black/30 border-white/5 text-zinc-300" : "bg-slate-100 border-slate-200 text-slate-600")}>{comment.ipAddress}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {!comment.isAdmin && (
                  <>
                    {!comment.isVerified && (
                      <div className={cn("flex gap-2 mr-2 border-r pr-2", isDark ? "border-white/10" : "border-slate-200")}>
                        <button 
                          onClick={() => setApproveId(comment.id)}
                          disabled={approving === comment.id}
                          className={cn("p-2 rounded-lg transition-colors", approving === comment.id ? "opacity-50" : "", isDark ? "text-zinc-400 hover:text-green-400 hover:bg-green-500/10" : "text-slate-500 hover:text-green-700 hover:bg-green-50")}
                          title="Approve Comment"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleResendEmail(comment.id)}
                          disabled={resendingEmail === comment.id}
                          className={cn("p-2 rounded-lg transition-colors", resendingEmail === comment.id ? "opacity-50" : "", isDark ? "text-zinc-400 hover:text-cyan-400 hover:bg-cyan-500/10" : "text-slate-500 hover:text-cyan-700 hover:bg-cyan-50")}
                          title="Resend Verification Email"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {comment.isBlocked ? (
                      <button 
                        onClick={() => handleUnblock(comment)}
                        disabled={unblocking === comment.id}
                        className={cn("p-2 rounded-lg transition-colors mr-2 pr-4 border-r", unblocking === comment.id ? "opacity-50" : "", isDark ? "text-green-500 hover:bg-green-500/10 border-white/10" : "text-green-600 hover:bg-green-50 border-slate-200")}
                        title="Unblock User"
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </button>
                    ) : (
                      <button 
                        onClick={() => openBlockModal(comment)}
                        className={cn("p-2 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors mr-2 border-r pr-4", isDark ? "text-zinc-400 border-white/10" : "text-slate-500 border-slate-200")}
                        title="Block User (IP & Email)"
                      >
                        <ShieldBan className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
                {!comment.isAdmin && !comment.parentId && (
                  <button 
                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                    className={cn("p-2 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}
                    title="Reply"
                  >
                    <Reply className="w-4 h-4" />
                  </button>
                )}
                <button 
                  onClick={() => setDeleteId(comment.id)}
                  className={cn("p-2 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {comment.blogPost && (
              <div className={cn("mb-4 inline-flex items-center flex-wrap gap-2 text-xs px-3 py-1.5 rounded-lg border max-w-full", isDark ? "bg-black/40 text-zinc-400 border-white/5" : "bg-slate-50 text-slate-600 border-slate-200")}>
                <span className="whitespace-nowrap">On post:</span> 
                <Link href={`/blog/${comment.blogPost.slug}`} target="_blank" className={cn("hover:text-cyan-300 font-medium flex items-center gap-1 truncate max-w-full", isDark ? "text-cyan-400" : "text-cyan-700")}>
                  <span className="truncate">{comment.blogPost.title}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </Link>
              </div>
            )}

            {comment.parentId && comment.parent && (
              <div className={cn("mb-4 pl-4 border-l-2 text-xs text-zinc-500 italic", isDark ? "border-white/10" : "border-slate-200")}>
                In reply to {comment.parent.name}: "{comment.parent.content.substring(0, 50)}..."
              </div>
            )}

            <div className={cn("relative p-5 mt-2 rounded-2xl border shadow-inner", isDark ? "bg-gradient-to-br from-black/60 to-black/30 border-white/5" : "bg-slate-50 border-slate-200")}>
              <MessageCircle className={cn("absolute top-4 left-4 w-10 h-10 /10", isDark ? "text-cyan-500" : "text-cyan-700")} />
              <p className={cn("leading-relaxed whitespace-pre-wrap relative z-10 pl-2", isDark ? "text-zinc-300" : "text-slate-600")}>
                {renderCommentContent(comment.content)}
              </p>
            </div>

            {replyingTo === comment.id && (
              <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} onSubmit={(e) => handleReplySubmit(e, comment.id)} className={cn("mt-6 pt-6 border-t relative", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                <textarea 
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Type your reply as Admin..."
                  required
                  className={cn("w-full border rounded-xl px-5 py-4 font-medium focus:outline-none transition-all resize-y min-h-[120px] mb-4 shadow-inner", isDark ? "bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus:border-cyan-500/50 focus:bg-[#11162C]" : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white")}
                ></textarea>
                <div className="flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setReplyingTo(null)}
                    className={cn("px-5 py-2.5 font-bold hover:text-white hover:bg-white/5 rounded-xl transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={submittingReply}
                    className={cn("  font-bold px-6 py-2.5 rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center justify-center gap-2 disabled:opacity-50", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-slate-900" : "bg-cyan-600 hover:bg-cyan-700 text-white")}
                  >
                    {submittingReply ? <div className={cn("w-4 h-4 border-2 border-t-white rounded-full animate-spin", isDark ? "border-white/30" : "border-slate-200")} /> : <Reply className="w-4 h-4" />}
                    {submittingReply ? "Sending..." : "Send Reply"}
                  </button>
                </div>
              </motion.form>
            )}
            </div>
          </div>
        ))}

        {comments.length === 0 && (
          <div className={cn("glass-card rounded-[32px] p-16 text-center border shadow-2xl relative overflow-hidden group", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
            <div className={cn("w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border group-hover:scale-110 transition-transform duration-500", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
              <MessageCircle className={cn("w-12 h-12 opacity-80", isDark ? "text-cyan-400" : "text-cyan-700")} />
            </div>
            <h3 className={cn("text-2xl font-extrabold mb-3", isDark ? "text-white" : "text-[#0F3B4A]")}>No Comments Yet</h3>
            <p className={cn("font-medium max-w-sm mx-auto", isDark ? "text-zinc-400" : "text-slate-500")}>When visitors leave comments on your blog posts, they will appear here.</p>
          </div>
        )}
      </div>

      {/* Block Confirmation Modal */}
      {blockModalOpen && userToBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
          <div className={cn("border rounded-2xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200", isDark ? "bg-[#0f172a] border-white/10" : "bg-white border-slate-200")}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500"></div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className={cn("w-12 h-12 rounded-full flex items-center justify-center shrink-0 border", isDark ? "bg-red-500/10 border-red-500/20" : "bg-red-50 border-red-200")}>
                <ShieldAlert className={cn("w-6 h-6", isDark ? "text-red-500" : "text-red-700")} />
              </div>
              <div>
                <h3 className={cn("text-xl font-bold drop-shadow-sm", isDark ? "text-white" : "text-slate-900")}>Block User</h3>
                <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>This action will blacklist them.</p>
              </div>
            </div>
            
            <div className={cn("rounded-xl p-4 border mb-6 space-y-3", isDark ? "bg-black/40 border-white/5" : "bg-slate-50 border-slate-200")}>
              <div>
                <div className="text-xs text-zinc-500 mb-1">Email to block:</div>
                <div className={cn("text-sm font-medium", isDark ? "text-white" : "text-slate-900")}>{userToBlock.email}</div>
              </div>
              {userToBlock.ipAddress && (
                <div>
                  <div className="text-xs text-zinc-500 mb-1">IP Address to block:</div>
                  <div className={cn("text-sm font-mono", isDark ? "text-white" : "text-slate-900")}>{userToBlock.ipAddress}</div>
                </div>
              )}
            </div>
            
            <p className={cn("text-sm mb-6", isDark ? "text-zinc-400" : "text-slate-500")}>
              Are you sure you want to block this user? They will no longer be able to submit comments using this email {userToBlock.ipAddress ? "or IP address" : ""}.
            </p>
            
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setBlockModalOpen(false)}
                className={cn("px-4 py-2 rounded-xl text-sm font-medium transition-colors", isDark ? "text-zinc-300 hover:text-white hover:bg-white/5" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100")}
                disabled={blocking}
              >
                Cancel
              </button>
              <button 
                onClick={confirmBlock}
                disabled={blocking}
                className={cn("px-6 py-2 rounded-xl text-sm font-bold bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-red-500/20", isDark ? "text-white" : "text-slate-900")}
              >
                {blocking ? (
                  <>
                    <div className={cn("w-4 h-4 border-2 border-t-white rounded-full animate-spin", isDark ? "border-white/20" : "border-slate-200")} />
                    Blocking...
                  </>
                ) : "Block User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Confirmations */}
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Comment?"
        description="This comment will be permanently deleted from the system."
        confirmText="Delete"
        isLoading={isDeleting}
        variant="danger"
      />

      <ConfirmModal
        isOpen={!!approveId}
        onClose={() => setApproveId(null)}
        onConfirm={handleApprove}
        title="Approve Comment?"
        description="This comment will be approved and displayed publicly on the blog."
        confirmText="Approve"
        isLoading={isApprovingAction}
        variant="success"
      />

      <ConfirmModal
        isOpen={showDeleteAllModal}
        onClose={() => setShowDeleteAllModal(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Comments?"
        description={`Are you sure you want to delete ${selectedIds.length} selected comments? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isDeletingAll}
        variant="danger"
      />
    </div>
  );
}
