"use client";
import { useUrlString } from "@/lib/useUrlTab";
import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";
import { Mail, Trash2, Search, Calendar, Users, AlertCircle, CheckCircle, Check , RefreshCw , LayoutDashboard } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { toast } from "sonner";

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
    <div className="space-y-6 w-full">
      <div className="flex flex-col sm:flex-row md:items-end justify-between gap-6 mb-6">
        <div>
          <h1 className={cn("text-3xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Newsletter</h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Manage your newsletter subscribers</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {subscribers.length > 0 && (
            <button 
              onClick={toggleSelectAll}
              className={cn("flex items-center gap-2 px-5 py-2 font-bold rounded-xl transition-all border", isDark ? "text-white border-white/10 hover:bg-white/10" : "text-slate-900 border-slate-200 hover:bg-slate-100")}
            >
              <div className={`w-5 h-5 border rounded flex items-center justify-center ${selectedIds.length === subscribers.length && subscribers.length > 0 ? 'bg-cyan-500 border-cyan-500' : isDark ? "border-zinc-500" : "border-slate-300"}`}>
                {selectedIds.length === subscribers.length && subscribers.length > 0 && <CheckCircle className="w-3.5 h-3.5 text-slate-900" />}
              </div>
              {selectedIds.length === subscribers.length && subscribers.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
          )}
          <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border", isDark ? "bg-white/5 border-white/10" : "bg-white border-slate-200")}>
            <Mail className={cn("w-5 h-5 sm:w-6 sm:h-6", isDark ? "text-cyan-400" : "text-slate-700")} />
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={cn("p-6 rounded-2xl border group", isDark ? "bg-[#0A0B1A] border-white/10" : "bg-white border-slate-200")}>
          <div className="flex items-center gap-4 relative z-10">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", isDark ? "bg-white/5 border border-white/10 text-cyan-400" : "bg-slate-100 border border-slate-200 text-slate-600")}>
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Total Subscribers</p>
              <h3 className={cn("text-2xl font-extrabold", isDark ? "text-white" : "text-slate-900")}>{subscribers.length}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className={cn("rounded-2xl border overflow-hidden", isDark ? "bg-[#0A0B1A] border-white/10" : "bg-white border-slate-200")}>
        <div className={cn("p-4 sm:p-6 border-b flex flex-col sm:flex-row gap-4 justify-between items-center", isDark ? "bg-[#0A0B1A]/50 border-white/5 bg-white/[0.02]" : "bg-white border-slate-200 bg-white")}>
          <div className="relative w-full sm:w-96">
            <Search className={cn("w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2", isDark ? "text-zinc-400" : "text-slate-500")} />
            <input
              type="text"
              placeholder="Search subscribers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn("w-full border rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none transition-colors", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:border-cyan-500/50 focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:border-cyan-500 focus:bg-slate-50")}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className={cn("p-12 text-center flex flex-col items-center gap-4", isDark ? "text-zinc-400" : "text-slate-500")}>
              <RefreshCw className={cn("w-10 h-10 animate-spin", isDark ? "text-cyan-500" : "text-slate-400")} />
              <p>Loading subscribers...</p>
            </div>
          ) : filteredSubscribers.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-4", isDark ? "bg-white/5 text-zinc-400" : "bg-slate-100 text-slate-400")}>
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No Subscribers Found</h3>
              <p className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>You don't have any newsletter subscribers yet.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={cn("border-b", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200")}>
                  <th className={cn("p-4 sm:p-6 w-12 text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>SEL</th>
                  <th className={cn("p-4 sm:p-6 text-sm font-semibold", isDark ? "text-zinc-300" : "text-slate-600")}>Email Address</th>
                  <th className={cn("p-4 sm:p-6 text-sm font-semibold", isDark ? "text-zinc-300" : "text-slate-600")}>Subscribed Date</th>
                  <th className={cn("p-4 sm:p-6 text-sm font-semibold text-right", isDark ? "text-zinc-300" : "text-slate-600")}>Actions</th>
                </tr>
              </thead>
              <tbody className={cn("divide-y", isDark ? "divide-white/5" : "divide-slate-200")}>
                {filteredSubscribers.map((sub) => (
                  <tr key={sub.id} className={cn("transition-colors group", isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50")}>
                    <td className="p-4 sm:p-6">
                      <button 
                        onClick={() => toggleSelect(sub.id)} 
                        className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${selectedIds.includes(sub.id) ? 'bg-cyan-500 border-cyan-500' : isDark ? "border-zinc-500 hover:border-cyan-400" : "border-slate-300 hover:border-cyan-600"}`}
                      >
                        {selectedIds.includes(sub.id) && <CheckCircle className="w-3.5 h-3.5 text-slate-900" />}
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
