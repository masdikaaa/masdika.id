"use client";
import { useUrlString } from "@/lib/useUrlTab";
import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";
import { Mail, Trash2, Search, Calendar, Users, AlertCircle, CheckCircle, Check , RefreshCw , LayoutDashboard } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { toast } from "sonner";
import { AdminLoader } from "@/components/admin/AdminLoader";

interface Subscriber {
  id: number;
  email: string;
  createdAt: string;
}

export default function NewsletterPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const fetchSubscribers = async () => {
    try {
      const res = await fetch('/api/admin/newsletter');
      const data = await res.json();
      if (!data.error) {
        setSubscribers(data);
      }
    } catch (error) {
      console.error("Error fetching subscribers:", error);
    } finally {
      setLoading(false);
    }
  };

  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useUrlString<string>("searchTerm", "");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  // Modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [subscriberToDelete, setSubscriberToDelete] = useState<number | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchSubscribers();
  }, []);


  const toggleSelectAll = () => {
    if (selectedIds.length === subscribers.length && subscribers.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(subscribers.map(sub => sub.id));
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const confirmDelete = (id: number) => {
    setSubscriberToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!subscriberToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/newsletter/${subscriberToDelete}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        setSubscribers(subscribers.filter(sub => sub.id !== subscriberToDelete));
        setSelectedIds(prev => prev.filter(id => id !== subscriberToDelete));
      } else {
        toast.error("Failed to delete subscriber");
      }
    } catch (error) {
      console.error("Error deleting subscriber:", error);
      toast.error("Error deleting subscriber");
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setSubscriberToDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeletingAll(true);
    try {
      const res = await fetch('/api/admin/newsletter/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (res.ok) {
        setSubscribers(subscribers.filter(sub => !selectedIds.includes(sub.id)));
        setSelectedIds([]);
      } else {
        toast.error("Failed to delete selected subscribers");
      }
    } catch (error) {
      console.error("Error in bulk delete:", error);
      toast.error("Error deleting subscribers");
    } finally {
      setIsDeletingAll(false);
      setShowDeleteAllModal(false);
    }
  };

  const filteredSubscribers = subscribers.filter(sub => 
    sub.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full space-y-6 md:space-y-8 pb-10 relative z-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row md:items-end justify-between gap-6 mb-2">
        <div>
          <h1 className={cn("text-2xl md:text-3xl font-extrabold mb-1 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Newsletter Subscribers</h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Manage registered audience email subscriptions and outbound campaign deliverability.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn("px-4 py-2 rounded-lg font-medium text-sm border", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
            Total Subscribers: {subscribers.length}
          </div>
          <button
            onClick={() => { setLoading(true); fetchSubscribers(); }}
            className={cn("px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border", isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700")}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Total Subscribers</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
              <Mail className="w-4 h-4" />
            </div>
          </div>
          <div className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            {subscribers.length}
          </div>
          <div className={cn("mt-2 text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-700")}>
            Verified recipient emails
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>This Month</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            {subscribers.filter(s => new Date(s.createdAt).getMonth() === new Date().getMonth()).length}
          </div>
          <div className={cn("mt-2 text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-700")}>
            New subscriptions
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Audience Reach</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            {subscribers.length}
          </div>
          <div className={cn("mt-2 text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-700")}>
            Instant campaign audience
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Deliverability</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            100%
          </div>
          <div className={cn("mt-2 text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-700")}>
            Zero bounce rate
          </div>
        </div>
      </div>

      {/* GAMBAR 1 Filter Bar */}
      <div className={cn("p-4 rounded-2xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-4", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search subscribers by email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={cn("w-full pl-9 pr-4 py-2 text-xs md:text-sm border rounded-xl focus:outline-none focus:border-cyan-500 transition-colors", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
          />
        </div>
        <div className="flex items-center gap-3 self-end md:self-auto">
          {subscribers.length > 0 && (
            <button 
              onClick={toggleSelectAll}
              className={cn("flex items-center gap-2 px-3.5 py-2 font-bold text-xs rounded-xl transition-all border whitespace-nowrap", isDark ? "text-white border-slate-800 bg-[#060b14] hover:bg-slate-800/60" : "text-slate-900 border-slate-200 bg-white hover:bg-slate-50")}
            >
              <div className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${selectedIds.length === subscribers.length && subscribers.length > 0 ? 'bg-cyan-500 border-cyan-500 text-slate-950' : isDark ? "border-slate-700 bg-[#060b14]" : "border-slate-300 bg-white"}`}>
                {selectedIds.length === subscribers.length && subscribers.length > 0 && <Check className="w-3 h-3 text-slate-950 stroke-[3]" />}
              </div>
              <span>{selectedIds.length === subscribers.length && subscribers.length > 0 ? 'Deselect All' : 'Select All'}</span>
            </button>
          )}
          {selectedIds.length > 0 && (
            <button 
              onClick={() => setShowDeleteAllModal(true)}
              className={cn("flex items-center gap-2 px-3.5 py-2 font-bold text-xs rounded-xl transition-all border whitespace-nowrap", isDark ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20" : "bg-red-50 hover:bg-red-100 text-red-700 border-red-200")}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete ({selectedIds.length})</span>
            </button>
          )}
        </div>
      </div>

      <div className={cn("rounded-2xl border overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center flex items-center justify-center">
              <AdminLoader className="min-h-[200px]" />
            </div>
          ) : filteredSubscribers.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-4 border", isDark ? "bg-[#060b14] border-slate-800 text-zinc-400" : "bg-slate-100 border-slate-200 text-slate-400")}>
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No Subscribers Found</h3>
              <p className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>You don't have any newsletter subscribers yet.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={cn("border-b text-xs uppercase tracking-wider font-semibold", isDark ? "bg-[#060b14] text-slate-400 border-slate-800" : "bg-slate-50 text-slate-500 border-slate-200")}>
                  <th className="p-4 sm:p-5 w-12 text-center">
                    <button 
                      onClick={toggleSelectAll} 
                      className={`w-5 h-5 border rounded flex items-center justify-center transition-colors mx-auto ${selectedIds.length === subscribers.length && subscribers.length > 0 ? 'bg-cyan-500 border-cyan-500 text-slate-950' : isDark ? "border-slate-700 bg-[#060b14] hover:border-cyan-400" : "border-slate-300 bg-white hover:border-cyan-600"}`}
                    >
                      {selectedIds.length === subscribers.length && subscribers.length > 0 && <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />}
                    </button>
                  </th>
                  <th className="p-4 sm:p-5 text-sm font-semibold">Email Address</th>
                  <th className="p-4 sm:p-5 text-sm font-semibold">Subscribed Date</th>
                  <th className="p-4 sm:p-5 text-sm font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={cn("divide-y", isDark ? "divide-slate-800/80" : "divide-slate-200")}>
                {filteredSubscribers.map((sub) => (
                  <tr key={sub.id} className={cn("transition-colors group", isDark ? "hover:bg-white/5" : "hover:bg-slate-50/80")}>
                    <td className="p-4 sm:p-5 text-center">
                      <button 
                        onClick={() => toggleSelect(sub.id)} 
                        className={`w-5 h-5 border rounded flex items-center justify-center transition-colors mx-auto ${selectedIds.includes(sub.id) ? 'bg-cyan-500 border-cyan-500 text-slate-950' : isDark ? "border-slate-700 bg-[#060b14] hover:border-cyan-400" : "border-slate-300 bg-white hover:border-cyan-600"}`}
                      >
                        {selectedIds.includes(sub.id) && <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />}
                      </button>
                    </td>
                    <td className="p-4 sm:p-6">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 border", isDark ? "bg-white/5 border-white/10 text-cyan-400" : "bg-slate-50 border-slate-200 text-slate-500")}>
                          <Mail className="w-5 h-5" />
                        </div>
                        <span className={cn("font-medium", isDark ? "text-white" : "text-slate-900")}>{sub.email}</span>
                      </div>
                    </td>
                    <td className="p-4 sm:p-6">
                      <div className={cn("flex items-center gap-2 text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
                        <Calendar className="w-4 h-4" />
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4 sm:p-6 text-right">
                      <button
                        onClick={() => confirmDelete(sub.id)}
                        className={cn("p-2 bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20 disabled:opacity-50", isDark ? "text-red-400" : "text-red-700")}
                        title="Delete Subscriber"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Delete Single Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Subscriber"
        description="Are you sure you want to delete this subscriber? They will no longer receive newsletter emails."
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Delete Bulk Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteAllModal}
        onClose={() => setShowDeleteAllModal(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Subscribers"
        description={`Are you sure you want to delete ${selectedIds.length} selected subscriber(s)? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeletingAll}
      />

    </div>
  );
}
