"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Ticket, Settings2, Check, X, RefreshCw, Save, Loader2, LayoutDashboard, Pencil, CheckCircle } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/ui/Pagination";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export default function AdminVouchersPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [activeTab, setActiveTab] = useState<"vouchers" | "promos">("vouchers");
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [deletingVoucherId, setDeletingVoucherId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [promos, setPromos] = useState<any[]>([]);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState<number | null>(null);
  const [deletingPromoId, setDeletingPromoId] = useState<number | null>(null);
  const [selectedPromoIds, setSelectedPromoIds] = useState<number[]>([]);
  const [isBulkPromoDeleting, setIsBulkPromoDeleting] = useState(false);
  const [newPromo, setNewPromo] = useState({
    title: "",
    description: "",
    image: "",
    link: "",
    isActive: true,
    isReward: false,
    rewardAmount: 0,
    maxClaims: 0,
    validUntil: ""
  });
  const [promoCurrentPage, setPromoCurrentPage] = useState(1);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showRemoveImageModal, setShowRemoveImageModal] = useState(false);
  const [selectedVoucherIds, setSelectedVoucherIds] = useState<number[]>([]);
  const [isBulkVoucherDeleting, setIsBulkVoucherDeleting] = useState(false);
  const [editingVoucherId, setEditingVoucherId] = useState<number | null>(null);
  const [newVoucher, setNewVoucher] = useState({
    code: "",
    description: "",
    discountPercent: 10,
    maxUses: 0,
    validUntil: ""
  });

  useEffect(() => {
    fetchVouchers();
    fetchPromos();
    setLoading(false);
  }, []);

  const fetchPromos = async () => {
    try {
      const res = await fetch('/api/admin/promos');
      const data = await res.json();
      if (data.success) {
        setPromos(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVouchers = async () => {
    try {
      const res = await fetch("/api/admin/vouchers");
      const data = await res.json();
      if (data.success) setVouchers(data.data);
    } catch (err) {
      console.error(err);
    }
  };


  const handleToggleVoucher = async (id: number, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/vouchers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (res.ok) {
        toast.success("Voucher status updated");
        fetchVouchers();
      }
    } catch (err) {
      toast.error("Error updating voucher");
    }
  };

  const confirmDeleteVoucher = async () => {
    if (deletingVoucherId === null) return;
    const id = deletingVoucherId;
    try {
      const res = await fetch(`/api/admin/vouchers/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success("Voucher deleted");
        fetchVouchers();
      }
    } catch (err) {
      toast.error("Error deleting voucher");
    } finally {
      setDeletingVoucherId(null);
    }
  };

  const handleSaveVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = editingVoucherId !== null;
    const toastId = toast.loading(isEdit ? "Updating voucher..." : "Creating voucher...");
    try {
      const url = isEdit ? `/api/admin/vouchers/${editingVoucherId}` : "/api/admin/vouchers";
      const method = isEdit ? "PUT" : "POST";

      const payload: any = { ...newVoucher };
      if (newVoucher.validUntil) {
        payload.validUntil = new Date(newVoucher.validUntil).toISOString();
      } else {
        payload.validUntil = null;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isEdit ? "Voucher updated!" : "Voucher created!", { id: toastId });
        closeVoucherModal();
        fetchVouchers();
      } else {
        toast.error(data.error || "Failed to save", { id: toastId });
      }
    } catch (err) {
      toast.error("Error saving voucher", { id: toastId });
    }
  };

  const toggleSelectAllVouchers = () => {
    if (selectedVoucherIds.length === paginatedVouchers.length && paginatedVouchers.length > 0) {
      setSelectedVoucherIds([]);
    } else {
      setSelectedVoucherIds(paginatedVouchers.map(v => v.id));
    }
  };

  const toggleSelectVoucher = (id: number) => {
    setSelectedVoucherIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkVoucherDelete = async () => {
    if (selectedVoucherIds.length === 0) return;
    const confirm = window.confirm(`Are you sure you want to delete ${selectedVoucherIds.length} vouchers?`);
    if (!confirm) return;

    setIsBulkVoucherDeleting(true);
    try {
      await Promise.all(selectedVoucherIds.map(id => fetch(`/api/admin/vouchers/${id}`, { method: 'DELETE' })));
      toast.success(`${selectedVoucherIds.length} vouchers deleted successfully`);
      setSelectedVoucherIds([]);
      fetchVouchers();
    } catch (err) {
      toast.error("Failed to delete some vouchers");
    } finally {
      setIsBulkVoucherDeleting(false);
    }
  };

  const closeVoucherModal = () => {
    setIsModalOpen(false);
    setEditingVoucherId(null);
    setNewVoucher({ code: "", description: "", discountPercent: 10, maxUses: 0, validUntil: "" });
  };

  const handleEditVoucher = (v: any) => {
    setEditingVoucherId(v.id);
    setNewVoucher({
      code: v.code,
      description: v.description || "",
      discountPercent: v.discountPercent,
      maxUses: v.maxUses,
      validUntil: v.validUntil ? new Date(v.validUntil).toISOString().split('T')[0] : ""
    });
    setIsModalOpen(true);
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = editingPromoId !== null;
    const toastId = toast.loading(isEdit ? "Updating promo..." : "Saving promo...");
    try {
      const url = isEdit ? `/api/admin/promos/${editingPromoId}` : "/api/admin/promos";
      const method = isEdit ? "PUT" : "POST";

      const payload: any = { ...newPromo };
      if (newPromo.validUntil) {
        payload.validUntil = new Date(newPromo.validUntil).toISOString();
      } else {
        payload.validUntil = null;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isEdit ? "Promo updated!" : "Promo saved!", { id: toastId });
        setIsPromoModalOpen(false);
        setEditingPromoId(null);
        setNewPromo({ title: "", description: "", image: "", link: "", isActive: true, isReward: false, rewardAmount: 0, maxClaims: 0, validUntil: "" });
        fetchPromos();
      } else {
        toast.error(data.error || "Failed to save promo", { id: toastId });
      }
    } catch (err) {
      toast.error("Error saving promo", { id: toastId });
    }
  };

  const handleEditPromo = (p: any) => {
    setEditingPromoId(p.id);
    setNewPromo({
      title: p.title,
      description: p.description,
      image: p.image || "",
      link: p.link || "",
      isActive: p.isActive,
      isReward: p.isReward || false,
      rewardAmount: p.rewardAmount || 0,
      maxClaims: p.maxClaims || 0,
      validUntil: p.validUntil ? new Date(p.validUntil).toISOString().split('T')[0] : ""
    });
    setIsPromoModalOpen(true);
  };

  const handlePromoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith("image/")) {
        toast.error("Only image files are allowed for Promo.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Maximum file size is 5MB.");
        return;
      }
      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("folder", "promo");

      const loadingToast = toast.loading("Uploading image...");
      try {
        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          body: uploadData
        });
        const data = await res.json();
        if (data.url) {
          setNewPromo(prev => ({ ...prev, image: data.url }));
          toast.success("Image uploaded successfully!", { id: loadingToast });
        } else {
          toast.error(data.error || "Failed to upload image.", { id: loadingToast });
        }
      } catch (err) {
        toast.error("An error occurred.", { id: loadingToast });
      }
    }
  };

  const handleRemoveImage = async () => {
    const currentUrl = newPromo.image;

    // Optimistically clear the UI
    setNewPromo({ ...newPromo, image: "" });

    // If it's an uploaded file (not an external link), delete it from server
    if (currentUrl && currentUrl.startsWith('/uploads/')) {
      try {
        await fetch('/api/admin/upload', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: currentUrl })
        });
      } catch (err) {
        console.error("Failed to delete image from storage", err);
      }
    }
  };

  const handleTogglePromo = async (id: number, currentStatus: boolean) => {
    const toastId = toast.loading("Updating status...");
    try {
      const res = await fetch(`/api/admin/promos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (res.ok) {
        toast.success("Status updated!", { id: toastId });
        fetchPromos();
      } else {
        toast.error("Failed to update status", { id: toastId });
      }
    } catch (err) {
      toast.error("An error occurred", { id: toastId });
    }
  };

  const confirmDeletePromo = async () => {
    if (deletingPromoId === null) return;
    const toastId = toast.loading("Deleting promo...");
    try {
      const res = await fetch(`/api/admin/promos/${deletingPromoId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success("Promo has been deleted!", { id: toastId });
        setDeletingPromoId(null);
        fetchPromos();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete Promo.", { id: toastId });
      }
    } catch (err) {
      toast.error("An error occurred while deleting.", { id: toastId });
    }
  };

  const toggleSelectAllPromos = () => {
    if (selectedPromoIds.length === paginatedPromos.length && paginatedPromos.length > 0) {
      setSelectedPromoIds([]);
    } else {
      setSelectedPromoIds(paginatedPromos.map(p => p.id));
    }
  };

  const toggleSelectPromo = (id: number) => {
    setSelectedPromoIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkPromoDelete = async () => {
    if (selectedPromoIds.length === 0) return;
    const confirm = window.confirm(`Are you sure you want to delete ${selectedPromoIds.length} promos?`);
    if (!confirm) return;

    setIsBulkPromoDeleting(true);
    try {
      await Promise.all(selectedPromoIds.map(id => fetch(`/api/admin/promos/${id}`, { method: 'DELETE' })));
      toast.success(`${selectedPromoIds.length} promos deleted successfully`);
      setSelectedPromoIds([]);
      fetchPromos();
    } catch (err) {
      toast.error("Failed to delete some promos");
    } finally {
      setIsBulkPromoDeleting(false);
    }
  };

  const generateRandomCode = () => {
    const code = "PROMO-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    setNewVoucher(prev => ({ ...prev, code }));
  };

  const paginatedPromos = promos;
  const totalPages = Math.ceil(vouchers.length / itemsPerPage);
  const paginatedVouchers = vouchers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row md:items-end justify-between gap-6 mb-6">
        <div>
          <h1 className={cn("text-3xl font-extrabold drop-shadow-sm mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Vouchers & Promos</h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Manage promo codes and global promos.</p>
        </div>
      </div>
      <div className={cn("flex flex-col sm:flex-row gap-2 sm:gap-4 border-b pb-4", isDark ? "border-white/10" : "border-slate-200")}>
        <button
          onClick={() => setActiveTab("vouchers")}
          className={cn(
            "px-6 py-2.5 rounded-full font-medium transition-all text-sm w-full sm:w-auto flex justify-center",
            activeTab === "vouchers" ? (isDark ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50" : "bg-cyan-50 text-cyan-700 border-cyan-200") : (isDark ? "bg-white/5 text-zinc-400 border-transparent hover:bg-white/10" : "bg-slate-50 text-slate-500 border-transparent hover:bg-slate-100")
          )}
        >
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4" />
            Voucher Codes
          </div>
        </button>

        <button
          onClick={() => setActiveTab("promos")}
          className={cn(
            "px-6 py-2.5 rounded-full font-medium transition-all text-sm w-full sm:w-auto flex justify-center",
            activeTab === "promos" ? (isDark ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50" : "bg-cyan-50 text-cyan-700 border-cyan-200") : (isDark ? "bg-white/5 text-zinc-400 border-transparent hover:bg-white/10" : "bg-slate-50 text-slate-500 border-transparent hover:bg-slate-100")
          )}
        >
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4" /> {/* Or use an image icon if imported */}
            Promos
          </div>
        </button>
      </div>

      {loading ? (
        <div className={cn("py-20 flex flex-col items-center justify-center gap-3", isDark ? "text-zinc-500" : "text-slate-500")}>
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium">Loading...</p>
        </div>
      ) : activeTab === "vouchers" ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div>
              <h2 className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>Voucher Codes</h2>
              <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Create and manage discount codes for user transactions.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {selectedVoucherIds.length > 0 && (
                <button
                  onClick={handleBulkVoucherDelete}
                  disabled={isBulkVoucherDeleting}
                  className={cn("font-bold px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-colors w-full sm:w-auto disabled:opacity-50 border", isDark ? "bg-red-500/20 border-red-500/30 hover:bg-red-500/30 hover:text-red-300 text-red-400" : "bg-red-50 border-red-200 hover:bg-red-100 hover:text-red-800 text-red-700")}
                >
                  {isBulkVoucherDeleting ? <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete Selected ({selectedVoucherIds.length})
                </button>
              )}
              <button
                onClick={() => { setEditingVoucherId(null); setNewVoucher({ code: "", description: "", discountPercent: 10, maxUses: 0, validUntil: "" }); setIsModalOpen(true); }}
                className={cn("font-bold px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-colors w-full sm:w-auto", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-black" : "bg-slate-900 hover:bg-slate-800 text-white")}
              >
                <Plus className="w-4 h-4" />
                New Voucher
              </button>
            </div>
          </div>

          <div className={cn("border rounded-2xl ", isDark ? "bg-[#0A0B1A] border-white/10" : "bg-white border-slate-200", "overflow-hidden shadow-xl", isDark ? "border-white/10" : "border-slate-200")}>
            <div className="overflow-x-auto">
              <table className={cn("w-full text-left text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
                <thead className={cn("bg-white/5 border-b", isDark ? "bg-[#0A0B1A]/50 border-white/5 text-zinc-300" : "bg-white border-slate-200 text-slate-600")}>
                  <tr className="whitespace-nowrap">
                    <th className="px-6 py-4 w-10">
                      <div className="flex items-center">
                        {(() => {
                          const isChecked = paginatedVouchers.length > 0 && selectedVoucherIds.length === paginatedVouchers.length;
                          return (
                            <label className="relative flex items-center justify-center cursor-pointer group">
                              <input type="checkbox" className="sr-only" checked={isChecked} onChange={toggleSelectAllVouchers} />
                              <div className={cn("w-5 h-5 rounded-md border transition-all flex items-center justify-center shadow-inner group-hover:border-cyan-500/50", isChecked ? "bg-cyan-500 border-cyan-500" : (isDark ? "border-white/20 bg-black/40" : "border-slate-300 bg-white"))}>
                                {isChecked && <CheckCircle className="w-3.5 h-3.5 text-black" strokeWidth={3} />}
                              </div>
                            </label>
                          );
                        })()}
                      </div>
                    </th>
                    <th className="px-6 py-4 font-semibold">Code</th>
                    <th className="px-6 py-4 font-semibold">Discount</th>
                    <th className="px-6 py-4 font-semibold">Usage Limit</th>
                    <th className="px-6 py-4 font-semibold">Valid Until</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 whitespace-nowrap">
                  {paginatedVouchers.map(v => (
                    <tr key={v.id} className={`transition-colors ${selectedVoucherIds.includes(v.id) ? 'bg-cyan-500/5' : isDark ? "hover:bg-white/5" : "hover:bg-slate-50"}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {(() => {
                            const isChecked = selectedVoucherIds.includes(v.id);
                            return (
                              <label className="relative flex items-center justify-center cursor-pointer group">
                                <input type="checkbox" className="sr-only" checked={isChecked} onChange={() => toggleSelectVoucher(v.id)} />
                                <div className={cn("w-5 h-5 rounded-md border transition-all flex items-center justify-center shadow-inner group-hover:border-cyan-500/50", isChecked ? "bg-cyan-500 border-cyan-500" : (isDark ? "border-white/20 bg-black/40" : "border-slate-300 bg-white"))}>
                                  {isChecked && <CheckCircle className="w-3.5 h-3.5 text-black" strokeWidth={3} />}
                                </div>
                              </label>
                            );
                          })()}
                        </div>
                      </td>
                      <td className={cn("px-6 py-4 font-bold", isDark ? "text-white" : "text-slate-900")}>{v.code}</td>
                      <td className={cn("px-6 py-4 font-medium", isDark ? "text-emerald-400" : "text-emerald-700")}>{v.discountPercent}%</td>
                      <td className="px-6 py-4">
                        {v.currentUses} / {v.maxUses === 0 ? "∞" : v.maxUses}
                      </td>
                      <td className="px-6 py-4">
                        {v.validUntil ? new Date(v.validUntil).toLocaleDateString() : "Never expires"}
                      </td>
                      <td className="px-6 py-4">
                        {v.maxUses > 0 && v.currentUses >= v.maxUses ? (
                          <span className={cn("px-3 py-1 rounded-full text-xs font-semibold bg-zinc-500/20 cursor-not-allowed", isDark ? "text-zinc-400" : "text-slate-500")}>
                            Fully Claimed
                          </span>
                        ) : (
                          <button
                            onClick={() => handleToggleVoucher(v.id, v.isActive)}
                            className={cn(
                              "px-3 py-1 rounded-full text-xs font-semibold transition-colors",
                              v.isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                            )}
                          >
                            {v.isActive ? "Active" : "Disabled"}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEditVoucher(v)} className={cn("p-2 rounded-lg transition-colors", isDark ? "bg-cyan-500/10 hover:bg-cyan-500 hover:text-white text-cyan-400" : "bg-cyan-50 hover:bg-cyan-500 hover:text-white text-cyan-700")}>
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeletingVoucherId(v.id)} className="p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {vouchers.length === 0 && (
                    <tr>
                      <td colSpan={7} className={cn("px-6 py-12 text-center", isDark ? "text-zinc-500" : "text-slate-500")}>
                        No vouchers found. Create one to get started!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className={cn("p-4 border-t", isDark ? "border-white/10" : "border-slate-200")}>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div>
              <h2 className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>Promos</h2>
              <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Manage promotional announcements and offers.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {selectedPromoIds.length > 0 && (
                <button
                  onClick={handleBulkPromoDelete}
                  disabled={isBulkPromoDeleting}
                  className={cn("font-bold px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-colors w-full sm:w-auto disabled:opacity-50 border", isDark ? "bg-red-500/20 border-red-500/30 hover:bg-red-500/30 hover:text-red-300 text-red-400" : "bg-red-50 border-red-200 hover:bg-red-100 hover:text-red-800 text-red-700")}
                >
                  {isBulkPromoDeleting ? <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete Selected ({selectedPromoIds.length})
                </button>
              )}
              <button
                onClick={() => {
                  setEditingPromoId(null);
                  setNewPromo({ title: "", description: "", image: "", link: "", isActive: true, isReward: false, rewardAmount: 0, maxClaims: 0, validUntil: "" });
                  setIsPromoModalOpen(true);
                }}
                className={cn("font-bold px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-colors w-full sm:w-auto", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-black" : "bg-slate-900 hover:bg-slate-800 text-white")}
              >
                <Plus className="w-4 h-4" />
                New Promo
              </button>
            </div>
          </div>

          <div className={cn("border rounded-2xl ", isDark ? "bg-[#0A0B1A] border-white/10" : "bg-white border-slate-200", "overflow-hidden shadow-xl", isDark ? "border-white/10" : "border-slate-200")}>
            <div className="overflow-x-auto">
              <table className={cn("w-full text-left text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
                <thead className={cn("bg-white/5 border-b", isDark ? "bg-[#0A0B1A]/50 border-white/5 text-zinc-300" : "bg-white border-slate-200 text-slate-600")}>
                  <tr className="whitespace-nowrap">
                    <th className="px-6 py-4 w-10">
                      <div className="flex items-center">
                        {(() => {
                          const isChecked = paginatedPromos.length > 0 && selectedPromoIds.length === paginatedPromos.length;
                          return (
                            <label className="relative flex items-center justify-center cursor-pointer group">
                              <input type="checkbox" className="sr-only" checked={isChecked} onChange={toggleSelectAllPromos} />
                              <div className={cn("w-5 h-5 rounded-md border transition-all flex items-center justify-center shadow-inner group-hover:border-cyan-500/50", isChecked ? "bg-cyan-500 border-cyan-500" : (isDark ? "border-white/20 bg-black/40" : "border-slate-300 bg-white"))}>
                                {isChecked && <CheckCircle className="w-3.5 h-3.5 text-black" strokeWidth={3} />}
                              </div>
                            </label>
                          );
                        })()}
                      </div>
                    </th>
                    <th className="px-6 py-4 font-semibold">Image</th>
                    <th className="px-6 py-4 font-semibold">Title</th>
                    <th className="px-6 py-4 font-semibold">Link</th>
                    <th className="px-6 py-4 font-semibold">Claims</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 whitespace-nowrap">
                  {paginatedPromos.map(p => (
                    <tr key={p.id} className={`transition-colors ${selectedPromoIds.includes(p.id) ? 'bg-cyan-500/5' : isDark ? "hover:bg-white/5" : "hover:bg-slate-50"}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {(() => {
                            const isChecked = selectedPromoIds.includes(p.id);
                            return (
                              <label className="relative flex items-center justify-center cursor-pointer group">
                                <input type="checkbox" className="sr-only" checked={isChecked} onChange={() => toggleSelectPromo(p.id)} />
                                <div className={cn("w-5 h-5 rounded-md border transition-all flex items-center justify-center shadow-inner group-hover:border-cyan-500/50", isChecked ? "bg-cyan-500 border-cyan-500" : (isDark ? "border-white/20 bg-black/40" : "border-slate-300 bg-white"))}>
                                  {isChecked && <CheckCircle className="w-3.5 h-3.5 text-black" strokeWidth={3} />}
                                </div>
                              </label>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {p.image ? <img referrerPolicy="no-referrer" src={p.image} alt={p.title} className={cn("w-12 h-12 object-cover rounded-lg border", isDark ? "border-white/10" : "border-slate-200")} loading="lazy" decoding="async" /> : <div className={cn("w-12 h-12 rounded-lg border flex items-center justify-center text-xs", isDark ? "border-white/10" : "border-slate-200")}>No img</div>}
                      </td>
                      <td className={cn("px-6 py-4 font-bold max-w-[200px] truncate", isDark ? "text-white" : "text-slate-900")}>{p.title}</td>
                      <td className="px-6 py-4 truncate max-w-[150px]">
                        {p.link ? <a href={p.link} target="_blank" rel="noopener noreferrer" className={cn("hover:underline", isDark ? "text-cyan-400" : "text-cyan-700")}>{p.link}</a> : "-"}
                      </td>
                      <td className="px-6 py-4">
                        {p.isReward ? (
                          <span className={cn(isDark ? "text-zinc-300" : "text-slate-600")}>
                            {p.currentClaims} / {p.maxClaims === 0 ? "∞" : p.maxClaims}
                          </span>
                        ) : "-"}
                      </td>
                      <td className="px-6 py-4">
                        {p.isReward && p.maxClaims > 0 && p.currentClaims >= p.maxClaims ? (
                          <span className={cn("px-3 py-1 rounded-full text-xs font-semibold bg-zinc-500/20 cursor-not-allowed", isDark ? "text-zinc-400" : "text-slate-500")}>
                            Fully Claimed
                          </span>
                        ) : (
                          <button
                            onClick={() => handleTogglePromo(p.id, p.isActive)}
                            className={cn(
                              "px-3 py-1 rounded-full text-xs font-semibold transition-colors",
                              p.isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                            )}
                          >
                            {p.isActive ? "Active" : "Disabled"}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEditPromo(p)} className={cn("p-2 rounded-lg transition-colors", isDark ? "bg-cyan-500/10 hover:bg-cyan-500 hover:text-white text-cyan-400" : "bg-cyan-50 hover:bg-cyan-500 hover:text-white text-cyan-700")}>
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeletingPromoId(p.id)} className="p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {promos.length === 0 && (
                    <tr>
                      <td colSpan={7} className={cn("px-6 py-12 text-center", isDark ? "text-zinc-500" : "text-slate-500")}>
                        No promos found. Create one to get started!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Voucher Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={cn("border rounded-2xl ", isDark ? "bg-[#0A0B1A] border-white/10" : "bg-white border-slate-200", "w-full max-w-md shadow-2xl overflow-hidden", isDark ? "border-white/10" : "border-slate-200")}>
            <div className={cn("flex justify-between items-center p-6 border-b", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
              <h2 className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>{editingVoucherId ? "Edit Voucher" : "Create Voucher"}</h2>
              <button onClick={closeVoucherModal} className={cn("hover:text-white", isDark ? "text-zinc-400" : "text-slate-500")}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveVoucher} className="p-6 space-y-4">
              <div>
                <label className={cn("block text-sm font-medium mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>Voucher Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={newVoucher.code}
                    onChange={e => setNewVoucher({ ...newVoucher, code: e.target.value.toUpperCase() })}
                    className={cn("flex-1 bg-black/40 border rounded-xl px-4 py-2.5 uppercase", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                    placeholder="e.g. SUMMER50"
                  />
                  <button type="button" onClick={generateRandomCode} className={cn("p-2.5 hover:bg-white/10 rounded-xl", isDark ? "text-zinc-300" : "text-slate-600")}>
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div>
                <label className={cn("block text-sm font-medium mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>Short Description (Optional)</label>
                <textarea
                  rows={2}
                  value={newVoucher.description}
                  onChange={e => setNewVoucher({ ...newVoucher, description: e.target.value })}
                  className={cn("w-full bg-black/40 border rounded-xl px-4 py-2.5 resize-none", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                  placeholder="Deskripsi singkat voucher..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={cn("block text-sm font-medium mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>Discount (%)</label>
                  <input
                    type="number"
                    required min="1" max="100"
                    value={newVoucher.discountPercent}
                    onChange={e => setNewVoucher({ ...newVoucher, discountPercent: parseInt(e.target.value) || 0 })}
                    className={cn("w-full bg-black/40 border rounded-xl px-4 py-2.5", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                  />
                </div>
                <div>
                  <label className={cn("block text-sm font-medium mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>Max Uses (0=unlimited)</label>
                  <input
                    type="number"
                    min="0"
                    value={newVoucher.maxUses}
                    onChange={e => setNewVoucher({ ...newVoucher, maxUses: parseInt(e.target.value) || 0 })}
                    className={cn("w-full bg-black/40 border rounded-xl px-4 py-2.5", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                  />
                </div>
              </div>

              <div>
                <label className={cn("block text-sm font-medium mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>Valid Until (Optional)</label>
                <input
                  type="date"
                  value={newVoucher.validUntil}
                  onChange={e => setNewVoucher({ ...newVoucher, validUntil: e.target.value })}
                  className={cn("w-full bg-black/40 border rounded-xl px-4 py-2.5", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              <div className="pt-4">
                <button type="submit" className={cn("w-full font-bold py-3 rounded-xl transition-all", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-black" : "bg-slate-900 hover:bg-slate-800 text-white")}>
                  {editingVoucherId ? "Update Voucher" : "Create Voucher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Promo Modal */}
      {isPromoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className={cn("border rounded-2xl ", isDark ? "bg-[#0A0B1A] border-white/10" : "bg-white border-slate-200", "w-full max-w-md shadow-2xl overflow-hidden my-8", isDark ? "border-white/10" : "border-slate-200")}>
            <div className={cn("flex justify-between items-center p-6 border-b", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
              <h2 className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>{editingPromoId ? "Edit Promo" : "Create Promo"}</h2>
              <button onClick={() => setIsPromoModalOpen(false)} className={cn("hover:text-white", isDark ? "text-zinc-400" : "text-slate-500")}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSavePromo} className="p-6 space-y-4">
              <div>
                <label className={cn("block text-sm font-medium mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>Title</label>
                <input
                  type="text"
                  required
                  value={newPromo.title}
                  onChange={e => setNewPromo({ ...newPromo, title: e.target.value })}
                  className={cn("w-full bg-black/40 border rounded-xl px-4 py-2.5", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                  placeholder="e.g. Diskon Kemerdekaan"
                />
              </div>

              <div>
                <label className={cn("block text-sm font-medium mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>Short Description</label>
                <textarea
                  required
                  rows={2}
                  value={newPromo.description}
                  onChange={e => setNewPromo({ ...newPromo, description: e.target.value })}
                  className={cn("w-full bg-black/40 border rounded-xl px-4 py-2.5 resize-none", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                  placeholder="Deskripsi singkat promo..."
                />
              </div>

              <div>
                <label className={cn("block text-sm font-medium mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>Image (Optional)</label>
                {newPromo.image ? (
                  <div className={cn("relative w-full h-32 rounded-xl overflow-hidden border", isDark ? "border-white/10" : "border-slate-200")}>
                    <img referrerPolicy="no-referrer" src={newPromo.image} alt="Promo" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    <button type="button" onClick={() => setShowRemoveImageModal(true)} className={cn("absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-rose-500 rounded-lg transition-colors", isDark ? "text-white" : "text-slate-900")}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className={cn("flex flex-col items-center justify-center w-full h-24 border-2 border-dashed hover:border-cyan-500/50 rounded-xl cursor-pointer transition-colors group", isDark ? "border-white/10" : "border-slate-200")}>
                    <span className={cn("text-sm font-medium group-hover:text-cyan-400", isDark ? "text-zinc-400" : "text-slate-500")}>Click to upload image</span>
                    <span className={cn("text-[10px] mt-1", isDark ? "text-zinc-500" : "text-slate-500")}>Recommended: Ratio 2:1 (Max 5MB)</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePromoUpload} />
                  </label>
                )}
              </div>

              <div>
                <label className={cn("block text-sm font-medium mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>Target URL (Optional)</label>
                <input
                  type="url"
                  value={newPromo.link}
                  onChange={e => setNewPromo({ ...newPromo, link: e.target.value })}
                  className={cn("w-full bg-black/40 border rounded-xl px-4 py-2.5", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                  placeholder="https://..."
                />
              </div>

              <div className={cn("border-t pt-4 mt-2", isDark ? "border-white/10" : "border-slate-200")}>
                <label className="flex items-center gap-3 cursor-pointer group w-fit">
                  {(() => {
                    const isChecked = newPromo.isReward;
                    return (
                      <>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={isChecked}
                          onChange={e => setNewPromo({ ...newPromo, isReward: e.target.checked })}
                        />
                        <div className={cn("w-5 h-5 flex-shrink-0 rounded-md border transition-all flex items-center justify-center shadow-inner group-hover:border-cyan-500/50", isChecked ? "bg-cyan-500 border-cyan-500" : (isDark ? "border-white/20 bg-black/40" : "border-slate-300 bg-white"))}>
                          {isChecked && <CheckCircle className="w-3.5 h-3.5 text-black" strokeWidth={3} />}
                        </div>
                      </>
                    );
                  })()}
                  <span className={cn("text-sm font-medium select-none", isDark ? "text-white" : "text-slate-900")}>This promo is a Claimable Reward</span>
                </label>
              </div>

              {newPromo.isReward && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <label className={cn("block text-sm font-medium mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>Reward Amount (Balance)</label>
                    <input
                      type="number"
                      min="0"
                      required={newPromo.isReward}
                      value={newPromo.rewardAmount}
                      onChange={e => setNewPromo({ ...newPromo, rewardAmount: parseInt(e.target.value) || 0 })}
                      className={cn("w-full bg-black/40 border rounded-xl px-4 py-2.5", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                    />
                  </div>
                  <div>
                    <label className={cn("block text-sm font-medium mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>Max Claims (0=unlimited)</label>
                    <input
                      type="number"
                      min="0"
                      value={newPromo.maxClaims}
                      onChange={e => setNewPromo({ ...newPromo, maxClaims: parseInt(e.target.value) || 0 })}
                      className={cn("w-full bg-black/40 border rounded-xl px-4 py-2.5", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={cn("block text-sm font-medium mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>Valid Until (Optional)</label>
                    <input
                      type="date"
                      value={newPromo.validUntil}
                      onChange={e => setNewPromo({ ...newPromo, validUntil: e.target.value })}
                      className={cn("w-full bg-black/40 border rounded-xl px-4 py-2.5", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                </div>
              )}

              <div className="pt-4">
                <button type="submit" className={cn("w-full font-bold py-3 rounded-xl transition-all", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-black" : "bg-slate-900 hover:bg-slate-800 text-white")}>
                  {editingPromoId ? "Update Promo" : "Save Promo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingVoucherId !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={cn("border rounded-2xl ", isDark ? "bg-[#0A0B1A] border-white/10" : "bg-white border-slate-200", "w-full max-w-sm overflow-hidden shadow-2xl", isDark ? "border-white/10" : "border-slate-200")}>
            <div className="p-6">
              <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>Delete Voucher</h3>
              <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Are you sure you want to delete this voucher? This action cannot be undone.</p>

              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={() => setDeletingVoucherId(null)}
                  className={cn("flex-1 px-4 py-2 hover:bg-white/10 rounded-xl text-sm font-medium transition-colors", isDark ? "text-white" : "text-slate-900")}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteVoucher}
                  className={cn("flex-1 px-4 py-2 bg-rose-500 hover:bg-rose-400 rounded-xl text-sm font-medium transition-colors", isDark ? "text-white" : "text-slate-900")}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Promo Confirmation Modal */}
      {deletingPromoId !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={cn("border rounded-2xl ", isDark ? "bg-[#0A0B1A] border-white/10" : "bg-white border-slate-200", "w-full max-w-sm overflow-hidden shadow-2xl", isDark ? "border-white/10" : "border-slate-200")}>
            <div className="p-6">
              <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>Delete Promo</h3>
              <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Are you sure you want to delete this promo? This action cannot be undone.</p>

              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={() => setDeletingPromoId(null)}
                  className={cn("flex-1 px-4 py-2 hover:bg-white/10 rounded-xl text-sm font-medium transition-colors", isDark ? "text-white" : "text-slate-900")}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeletePromo}
                  className={cn("flex-1 px-4 py-2 bg-rose-500 hover:bg-rose-400 rounded-xl text-sm font-medium transition-colors", isDark ? "text-white" : "text-slate-900")}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showRemoveImageModal}
        onClose={() => setShowRemoveImageModal(false)}
        onConfirm={async () => {
          setShowRemoveImageModal(false);
          await handleRemoveImage();
        }}
        title="Remove Image?"
        description="Are you sure you want to remove this image? If it was uploaded, it will be permanently deleted from the server."
        confirmText="Remove"
        variant="danger"
      />
    </div>
  );
}
