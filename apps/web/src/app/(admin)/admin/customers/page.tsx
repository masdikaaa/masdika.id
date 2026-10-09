"use client";
import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";
import { Users, Trash2, ShieldAlert, CheckCircle, Eye, Ban, Play, Activity, Search , RefreshCw, Gift, X } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import Link from "next/link";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/billing";
import { Pagination } from "@/components/ui/Pagination";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export default function AdminCustomersPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  
  const [editBalanceUser, setEditBalanceUser] = useState<any>(null);
  const [newBalance, setNewBalance] = useState<string>("");
  const [isUpdatingBalance, setIsUpdatingBalance] = useState(false);

  const [suspendUser, setSuspendUser] = useState<any>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [isSuspending, setIsSuspending] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  const [viewServicesUser, setViewServicesUser] = useState<any>(null);
  const [loadingServices, setLoadingServices] = useState(false);
  const [servicesData, setServicesData] = useState<any>(null);

  const [referralsUser, setReferralsUser] = useState<any>(null);
  const [referralsData, setReferralsData] = useState<any>(null);
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [isResettingReferrals, setIsResettingReferrals] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  // Filtering
  const filteredUsers = users.filter((u) => 
    (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    fetchUsers();
  }, []);


  const handleDeleteUserConfirm = async () => {
    if (!deleteUserId) return;
    setIsDeletingUser(true);
    const toastId = toast.loading("Destroying account and all associated resources...");
    try {
      const res = await fetch(`/api/admin/users/${deleteUserId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("User account and all resources deleted permanently", { id: toastId });
        fetchUsers();
      } else {
        toast.error(data.error || "Failed to delete user", { id: toastId });
      }
    } catch (err) {
      toast.error("Error deleting user", { id: toastId });
    } finally {
      setIsDeletingUser(false);
      setDeleteUserId(null);
    }
  };

  const handleBulkDeleteUsers = async () => {
    if (selectedUsers.length === 0) return;
    setIsBulkDeleting(true);
    const toastId = toast.loading(`Destroying ${selectedUsers.length} accounts and all their resources...`);
    let successCount = 0;
    
    for (const id of selectedUsers) {
      try {
        const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
        if (res.ok) successCount++;
      } catch (e) {
        // ignore individual failure
      }
    }
    
    toast.success(`Successfully deleted ${successCount} out of ${selectedUsers.length} accounts`, { id: toastId });
    setSelectedUsers([]);
    setShowBulkDeleteModal(false);
    setIsBulkDeleting(false);
    fetchUsers();
  };

  const handleUpdateBalance = async () => {
    if (!editBalanceUser) return;
    setIsUpdatingBalance(true);
    const toastId = toast.loading("Updating balance...");
    try {
      const res = await fetch(`/api/admin/users/${editBalanceUser.id}/balance`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ balance: Number(newBalance) })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Balance updated successfully", { id: toastId });
        setEditBalanceUser(null);
        fetchUsers();
      } else {
        toast.error(data.error || "Failed to update balance", { id: toastId });
      }
    } catch (err) {
      toast.error("Error updating balance", { id: toastId });
    } finally {
      setIsUpdatingBalance(false);
    }
  };

  const handleViewServices = async (user: any) => {
    setViewServicesUser(user);
    setLoadingServices(true);
    setServicesData(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/services`);
      const data = await res.json();
      if (res.ok && data.success) {
        setServicesData(data.data);
      } else {
        toast.error("Failed to load services");
        setViewServicesUser(null);
      }
    } catch (err) {
      toast.error("Error loading services");
      setViewServicesUser(null);
    } finally {
      setLoadingServices(false);
    }
  };



  const handleSuspendToggle = async () => {
    if (!suspendUser) return;
    setIsSuspending(true);
    const isCurrentlySuspended = suspendUser.isSuspended;
    const action = isCurrentlySuspended ? "Unsuspending" : "Suspending";
    const toastId = toast.loading(`${action} user...`);
    
    try {
      const res = await fetch(`/api/admin/users/${suspendUser.id}/suspend`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          isSuspended: !isCurrentlySuspended,
          suspendReason: !isCurrentlySuspended ? suspendReason : null
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`User ${!isCurrentlySuspended ? 'suspended' : 'unsuspended'} successfully`, { id: toastId });
        setSuspendUser(null);
        setSuspendReason("");
        fetchUsers();
      } else {
        toast.error(data.error || `Failed to ${!isCurrentlySuspended ? 'suspend' : 'unsuspend'} user`, { id: toastId });
      }
    } catch (err) {
      toast.error(`Error ${!isCurrentlySuspended ? 'suspending' : 'unsuspending'} user`, { id: toastId });
    } finally {
      setIsSuspending(false);
    }
  };

  const fetchReferrals = async (user: any) => {
    setReferralsUser(user);
    setLoadingReferrals(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/referrals`);
      if (res.ok) {
        const data = await res.json();
        setReferralsData(data.data);
      }
    } catch (err) {
      toast.error("Failed to fetch referrals data");
    } finally {
      setLoadingReferrals(false);
    }
  };

  const handleResetReferrals = async () => {
    if (!referralsUser) return;
    
    setIsResettingReferrals(true);
    const toastId = toast.loading("Resetting referrals...");
    try {
      const res = await fetch(`/api/admin/users/${referralsUser.id}/referrals`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Referrals reset successfully", { id: toastId });
        setShowResetConfirmModal(false);
        setReferralsUser(null);
        setReferralsData(null);
      } else {
        toast.error(data.error || "Failed to reset referrals", { id: toastId });
      }
    } catch (err) {
      toast.error("Error resetting referrals", { id: toastId });
    } finally {
      setIsResettingReferrals(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row md:items-end justify-between gap-6 mb-6">
        <div>
          <h1 className={cn("text-3xl font-extrabold drop-shadow-sm mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Customers</h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Manage registered users on the platform.</p>
        </div>
      </div>

      <div className={cn("glass-card border rounded-[32px] shadow-2xl overflow-hidden relative z-10", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
        <div className={cn("p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto flex-1">
            <h2 className={cn("text-lg font-semibold shrink-0", isDark ? "text-white" : "text-slate-900")}>All Users</h2>
            <div className="w-full sm:max-w-xs relative">
              <Search className={cn("w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2", isDark ? "text-zinc-500" : "text-slate-400")} />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className={cn("w-full border rounded-xl pl-10 pr-4 py-2 text-sm placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 transition-colors", isDark ? "bg-[#1e293b] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto shrink-0">
            {selectedUsers.length > 0 && (
              <button
                onClick={() => setShowBulkDeleteModal(true)}
                disabled={isBulkDeleting}
                className={cn("flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 font-semibold py-2 px-4 rounded-xl transition-all disabled:opacity-50 text-sm", isDark ? "text-white" : "text-slate-900")}
              >
                <Trash2 className="w-4 h-4" />
                Destroy Selected ({selectedUsers.length})
              </button>
            )}
            <div className={cn("text-sm px-4 py-2 rounded-xl border flex items-center justify-center h-[36px]", isDark ? "text-zinc-400 bg-[#1e293b] border-white/5" : "text-slate-500 bg-slate-100 border-slate-200")}>
              Total: <span className={cn("font-bold ml-1", isDark ? "text-cyan-400" : "text-cyan-700")}>{filteredUsers.length}</span>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className={cn("border-b text-xs uppercase tracking-wider text-zinc-500 font-semibold", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200")}>
                <th className="p-4 w-12 text-center">
                  <button
                    onClick={() => setSelectedUsers(selectedUsers.length === filteredUsers.length && filteredUsers.length > 0 ? [] : filteredUsers.map(u => u.id))}
                    className={`w-5 h-5 border rounded flex items-center justify-center transition-colors mx-auto ${
                      selectedUsers.length === filteredUsers.length && filteredUsers.length > 0
                        ? 'bg-cyan-500 border-cyan-500'
                        : 'border-zinc-500 hover:border-zinc-400'
                    }`}
                  >
                    {selectedUsers.length === filteredUsers.length && filteredUsers.length > 0 && <CheckCircle className="w-3.5 h-3.5 text-slate-900" />}
                  </button>
                </th>
                <th className="p-4 whitespace-nowrap">User Details</th>
                <th className="p-4 whitespace-nowrap">ID</th>
                <th className="p-4 text-center whitespace-nowrap">Status</th>
                <th className="p-4 text-center whitespace-nowrap">Balance</th>
                <th className="p-4 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDark ? "divide-white/5" : "divide-slate-200")}>
              {loading ? (
                <tr><td colSpan={8} className={cn("p-8 text-center", isDark ? "text-zinc-500" : "text-slate-500")}>
                  <div className="flex flex-col items-center justify-center gap-3">
                    <RefreshCw className={cn("w-10 h-10 animate-spin", isDark ? "text-cyan-500" : "text-cyan-700")} />
                    <p>Loading users...</p>
                  </div>
                </td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={8} className="p-16 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className={cn("w-20 h-20 rounded-full flex items-center justify-center mb-4", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                      <Users className={cn("w-10 h-10 opacity-50", isDark ? "text-cyan-400" : "text-cyan-700")} />
                    </div>
                    <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No Customers Found</h3>
                    <p className={cn(isDark ? "text-zinc-500" : "text-slate-500")}>There are no customers matching your criteria.</p>
                  </div>
                </td></tr>
              ) : (
                paginatedUsers.map((u) => (
                  <tr key={u.id} className={`hover:bg-white/[0.01] transition-colors group ${selectedUsers.includes(u.id) ? 'bg-cyan-500/5' : ''}`}>
                    <td className="p-4 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedUsers(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                        className={`w-5 h-5 border rounded flex items-center justify-center transition-colors mx-auto ${
                          selectedUsers.includes(u.id)
                            ? 'bg-cyan-500 border-cyan-500'
                            : 'border-zinc-500 group-hover:border-zinc-400'
                        }`}
                      >
                        {selectedUsers.includes(u.id) && <CheckCircle className="w-3.5 h-3.5 text-slate-900" />}
                      </button>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-full overflow-hidden border shrink-0", isDark ? "border-white/10" : "border-slate-200")}>
                          <img referrerPolicy="no-referrer" 
                            src={u.image || `/api/avatar?email=${encodeURIComponent(u.email || '')}&name=${encodeURIComponent(u.name || 'User')}`} 
                            alt={u.name || "User"}
                            className="w-full h-full object-cover"
                          loading="lazy" decoding="async" />
                        </div>
                        <div>
                          <Link href={`/admin/customers/${u.id}`} className={cn("font-semibold whitespace-nowrap hover:text-cyan-400 transition-colors", isDark ? "text-white" : "text-slate-900")}>
                            {u.name || "Unnamed"}
                          </Link>
                          <p className={cn("text-xs whitespace-nowrap", isDark ? "text-zinc-400" : "text-slate-500")}>{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className={cn("p-4 font-mono text-xs whitespace-nowrap", isDark ? "text-zinc-500" : "text-slate-500")}>{u.id}</td>
                    <td className="p-4 text-center">
                      {u.isSuspended ? (
                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 border border-red-500/20", isDark ? "text-red-400" : "text-red-700")}>
                          <Ban className="w-3.5 h-3.5" /> Suspended
                        </span>
                      ) : (
                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/20", isDark ? "text-emerald-400" : "text-emerald-700")}>
                          <CheckCircle className="w-3.5 h-3.5" /> Active
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className={cn("font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>{formatRupiah(u.balance || 0)}</div>
                      <button onClick={() => { setEditBalanceUser(u); setNewBalance(u.balance?.toString() || "0"); }} className={cn("text-xs hover:underline mt-1", isDark ? "text-cyan-400" : "text-cyan-700")}>Edit Balance</button>
                    </td>
                    <td className="p-4 text-right">
                         <div className="flex items-center justify-end gap-2">
                           <button 
                             onClick={() => fetchReferrals(u)}
                             className={cn("p-2 bg-purple-500/10 hover:bg-purple-500/20 hover:text-purple-300 rounded-lg transition-colors", isDark ? "text-purple-400" : "text-purple-700")}
                             title="Manage Referrals"
                           >
                             <Gift className="w-4 h-4" />
                           </button>
                           <Link href={`/admin/customers/${u.id}`} className={cn("p-2 bg-cyan-500/10 hover:bg-cyan-500/20 hover:text-cyan-300 rounded-lg transition-colors inline-block", isDark ? "text-cyan-400" : "text-cyan-700")} title="View Profile">
                             <Eye className="w-4 h-4" />
                           </Link>
                           <button 
                             onClick={() => {
                               setSuspendUser(u);
                             }} 
                             className={`p-2 rounded-lg transition-colors ${u.isSuspended ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300' : 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 hover:text-orange-300'}`}
                             title={u.isSuspended ? "Unsuspend User" : "Suspend User"}
                           >
                             {u.isSuspended ? <Play className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                           </button>
                           <button onClick={() => setDeleteUserId(u.id)} className={cn("p-2 bg-red-500/10 hover:bg-red-500/20 hover:text-red-300 rounded-lg transition-colors", isDark ? "text-red-400" : "text-red-700")} title="Delete Account">
                             <Trash2 className="w-4 h-4" />
                           </button>
                         </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className={cn("p-4 border-t", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      </div>

      <ConfirmModal 
        isOpen={!!deleteUserId} 
        onClose={() => setDeleteUserId(null)} 
        onConfirm={handleDeleteUserConfirm} 
        title="Destroy Account?" 
        description="DANGER: This will permanently delete the user's account AND recursively destroy every single Bucket, File, and Access Key they own in MinIO. This action is absolutely irreversible." 
        confirmText="Destroy Everything" 
        isLoading={isDeletingUser} 
        variant="danger" 
      />

      <ConfirmModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleBulkDeleteUsers}
        title="Destroy Selected Accounts?"
        description={`DANGER: You are about to permanently delete ${selectedUsers.length} accounts and recursively destroy ALL their resources. This action is absolutely irreversible.`}
        confirmText="Destroy All"
        isLoading={isBulkDeleting}
        variant="danger"
      />

      {editBalanceUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isUpdatingBalance && setEditBalanceUser(null)} />
          <div className={cn("relative bg-[#0f172a] border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6", isDark ? "border-white/10" : "border-slate-200")}>
            <h2 className={cn("text-xl font-bold mb-4", isDark ? "text-white" : "text-slate-900")}>Edit Balance</h2>
            <p className={cn("text-sm mb-4", isDark ? "text-zinc-400" : "text-slate-500")}>Customer: <span className={cn("font-semibold", isDark ? "text-white" : "text-slate-900")}>{editBalanceUser.name}</span></p>
            <div className="mb-6">
              <label className={cn("block text-sm font-medium mb-2", isDark ? "text-zinc-300" : "text-slate-600")}>New Balance (Rp)</label>
              <input
                type="text"
                inputMode="numeric"
                value={newBalance === '' ? '' : Number(newBalance).toLocaleString('id-ID')}
                onChange={(e) => {
                  const rawValue = e.target.value.replace(/\D/g, '');
                  setNewBalance(rawValue);
                }}
                className={cn("w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-bold", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditBalanceUser(null)}
                disabled={isUpdatingBalance}
                className={cn("px-4 py-2 rounded-xl hover:text-white hover:bg-white/5 transition-colors", isDark ? "text-zinc-300" : "text-slate-600")}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateBalance}
                disabled={isUpdatingBalance}
                className={cn("px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 font-semibold transition-colors disabled:opacity-50", isDark ? "text-white" : "text-slate-900")}
              >
                {isUpdatingBalance ? "Saving..." : "Save Balance"}
              </button>
            </div>
          </div>
        </div>
      )}

      {suspendUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isSuspending && setSuspendUser(null)} />
          <div className={cn("relative bg-[#0f172a] border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6", isDark ? "border-white/10" : "border-slate-200")}>
            <h2 className={cn("text-xl font-bold mb-4", isDark ? "text-white" : "text-slate-900")}>{suspendUser.isSuspended ? "Unsuspend User" : "Suspend User"}</h2>
            <p className={cn("text-sm mb-4", isDark ? "text-zinc-400" : "text-slate-500")}>Customer: <span className={cn("font-semibold", isDark ? "text-white" : "text-slate-900")}>{suspendUser.name}</span></p>
            
            {!suspendUser.isSuspended ? (
              <div className="mb-6">
                <label className={cn("block text-sm font-medium mb-2", isDark ? "text-zinc-300" : "text-slate-600")}>Reason for Suspension</label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="e.g. Abuse of File CDN..."
                  className={cn("w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-sm h-24 resize-none", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                />
              </div>
            ) : (
              <div className="mb-6">
                <p className={cn("text-sm", isDark ? "text-zinc-300" : "text-slate-600")}>Are you sure you want to unsuspend this user? They will regain access to their services.</p>
                {suspendUser.suspendReason && (
                  <div className={cn("mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs", isDark ? "text-red-400" : "text-red-700")}>
                    <strong className="block mb-1">Previous Reason:</strong> {suspendUser.suspendReason}
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setSuspendUser(null);
                  setSuspendReason("");
                }}
                disabled={isSuspending}
                className={cn("px-4 py-2 rounded-xl hover:text-white hover:bg-white/5 transition-colors", isDark ? "text-zinc-300" : "text-slate-600")}
              >
                Cancel
              </button>
              <button
                onClick={handleSuspendToggle}
                disabled={isSuspending || (!suspendUser.isSuspended && !suspendReason.trim())}
                className={`px-4 py-2 rounded-xl text-white font-semibold transition-colors disabled:opacity-50 ${suspendUser.isSuspended ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-orange-500 hover:bg-orange-400'}`}
              >
                {isSuspending ? "Saving..." : (suspendUser.isSuspended ? "Unsuspend" : "Suspend")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Referrals Modal */}
      {referralsUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={cn("bg-[#0f172a] border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[90vh]", isDark ? "border-white/10" : "border-slate-200")}>
            {/* Header */}
            <div className={cn("p-4 sm:p-6 border-b flex items-start justify-between gap-3 shrink-0", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
              <div className="min-w-0">
                <h3 className={cn("text-lg sm:text-xl font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                  <Gift className={cn("w-5 h-5 shrink-0", isDark ? "text-purple-400" : "text-purple-700")} />
                  <span className="truncate">Referrals for {referralsUser.name || 'Unnamed'}</span>
                </h3>
                <p className={cn("text-sm mt-1 truncate", isDark ? "text-zinc-400" : "text-slate-500")}>{referralsUser.email}</p>
              </div>
              <button onClick={() => { setReferralsUser(null); setReferralsData(null); }} className={cn("p-2 hover:bg-white/5 rounded-lg transition-colors hover:text-white shrink-0", isDark ? "text-zinc-400" : "text-slate-500")}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {loadingReferrals ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <RefreshCw className={cn("w-8 h-8 animate-spin", isDark ? "text-purple-500" : "text-purple-700")} />
                  <p className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>Loading referrals data...</p>
                </div>
              ) : referralsData ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className={cn("bg-white/5 border p-4 rounded-xl", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                      <p className={cn("text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1", isDark ? "text-zinc-500" : "text-slate-500")}>Total Referrals</p>
                      <p className={cn("text-xl sm:text-2xl font-extrabold", isDark ? "text-white" : "text-slate-900")}>{referralsData.totalReferrals}</p>
                    </div>
                    <div className={cn("bg-white/5 border p-4 rounded-xl", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                      <p className={cn("text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1", isDark ? "text-zinc-500" : "text-slate-500")}>Total Earned</p>
                      <p className={cn("text-xl sm:text-2xl font-bold", isDark ? "text-emerald-400" : "text-emerald-700")}>{formatRupiah(referralsData.totalEarned)}</p>
                    </div>
                    <div className={cn("bg-white/5 border p-4 rounded-xl", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                      <p className={cn("text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1", isDark ? "text-zinc-500" : "text-slate-500")}>Current Balance</p>
                      <p className={cn("text-xl sm:text-2xl font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>{formatRupiah(referralsData.affiliateBalance)}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className={cn("text-base sm:text-lg font-semibold mb-3", isDark ? "text-white" : "text-slate-900")}>Referred Users ({referralsData.referredUsers?.length || 0})</h4>
                    {referralsData.referredUsers?.length > 0 ? (
                      <div className={cn("border rounded-xl overflow-hidden", isDark ? "bg-[#1e293b] border-white/5" : "bg-slate-100 border-slate-200")}>
                        <div className={cn("divide-y", isDark ? "divide-white/5" : "divide-slate-200")}>
                          {referralsData.referredUsers.map((ru: any) => (
                            <div key={ru.id} className="p-3 sm:p-4 flex items-center justify-between gap-3 hover:bg-white/[0.02]">
                              <div className="min-w-0">
                                <div className={cn("font-medium text-sm truncate", isDark ? "text-white" : "text-slate-900")}>{ru.name || "Unnamed"}</div>
                                <div className={cn("text-xs truncate", isDark ? "text-zinc-500" : "text-slate-500")}>{ru.email}</div>
                              </div>
                              <div className={cn("text-xs whitespace-nowrap shrink-0", isDark ? "text-zinc-400" : "text-slate-500")}>{new Date(ru.createdAt).toLocaleDateString()}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className={cn("p-8 text-center border rounded-xl", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                        <Users className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                        <p className={cn("text-sm", isDark ? "text-zinc-500" : "text-slate-500")}>This user hasn't referred anyone yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className={cn("text-center py-8", isDark ? "text-zinc-500" : "text-slate-500")}>No data available</div>
              )}
            </div>

            {/* Footer */}
            <div className={cn("p-4 sm:p-6 border-t bg-[#0f172a] shrink-0", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <p className={cn("text-xs text-center sm:text-left", isDark ? "text-zinc-500" : "text-slate-500")}>
                  Resetting will wipe earnings, balance, and detach all referred users.
                </p>
                <button 
                  onClick={() => setShowResetConfirmModal(true)}
                  disabled={isResettingReferrals || loadingReferrals}
                  className={cn("w-full sm:w-auto bg-red-500 hover:bg-red-600 px-5 py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-50 text-sm whitespace-nowrap", isDark ? "text-white" : "text-slate-900")}
                >
                  {isResettingReferrals ? "Resetting..." : "Wipe & Reset Referrals"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Reset Referrals Modal */}
      <ConfirmModal
        isOpen={showResetConfirmModal}
        onClose={() => setShowResetConfirmModal(false)}
        onConfirm={handleResetReferrals}
        title="Reset Referrals?"
        description={`Are you sure you want to reset ${referralsUser?.name || 'this user'}'s referrals? This will delete their affiliate balance, reset their total earned, and disconnect all their referred users. This cannot be undone.`}
        confirmText="Wipe & Reset"
        cancelText="Cancel"
        isLoading={isResettingReferrals}
        variant="danger"
      />

    </div>
  );
}
