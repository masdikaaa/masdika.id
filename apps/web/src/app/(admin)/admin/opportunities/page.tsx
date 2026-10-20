"use client";
import { useUrlString } from "@/lib/useUrlTab";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Search, ExternalLink, CheckCircle, Check, LayoutDashboard, RefreshCw, Briefcase, Calendar, FolderTree } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import Link from "next/link";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Select } from "@/components/ui/Select";

export default function AdminOpportunitiesPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useUrlString<string>("search", "");
  const [filterType, setFilterType] = useUrlString<string>("filterType", "ALL");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk actions
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const fetchOpportunities = async () => {
    try {
      const res = await fetch('/api/admin/opportunities');
      const data = await res.json();
      if (!data.error) {
        setOpportunities(data);
      }
    } catch (err) {
      toast.error("Failed to load opportunities");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/opportunities/${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("Item deleted");
        fetchOpportunities();
      } else {
        toast.error("Failed to delete item");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeletingAll(true);
    try {
      const res = await fetch('/api/admin/opportunities/bulk-delete', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });
      if (res.ok) {
        toast.success(`${selectedIds.length} items deleted`);
        fetchOpportunities();
        setSelectedIds([]);
      } else {
        toast.error("Failed to delete items");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setIsDeletingAll(false);
      setShowDeleteAllModal(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredOpportunities.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredOpportunities.map(c => c.id));
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const uniqueTypes = Array.from(new Set(opportunities.map(o => o.type)));

  const filteredOpportunities = opportunities.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) || 
                        a.type.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "ALL" || a.type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row md:items-end justify-between gap-6 mb-2">
        <div>
          <h1 className={cn("text-2xl md:text-3xl font-extrabold mb-1 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Events & Jobs</h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Manage events, webinars, job vacancies, and community opportunities.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn("px-4 py-2 rounded-lg font-medium text-sm border", isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")}>
            Total Items: {opportunities.length}
          </div>
          <button
            onClick={() => { setLoading(true); fetchOpportunities(); }}
            className={cn("px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border", isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700")}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <Link href="/admin/opportunities/edit/new" className="inline-flex items-center gap-2 px-4 py-2 font-semibold text-sm rounded-lg bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm transition-all">
            <Plus className="w-4 h-4" /> New Item
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Total Opportunities</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            {opportunities.length}
          </div>
          <div className={cn("mt-2 text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-700")}>
            {opportunities.filter(o => o.status === 'PUBLISHED').length} active listings
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Published</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            {opportunities.filter(o => o.status === 'PUBLISHED').length}
          </div>
          <div className={cn("mt-2 text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-700")}>
            Live on platform
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Drafts & Closed</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            {opportunities.filter(o => o.status !== 'PUBLISHED').length}
          </div>
          <div className={cn("mt-2 text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-700")}>
            Hidden / expired items
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Categories</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-600")}>
              <FolderTree className="w-4 h-4" />
            </div>
          </div>
          <div className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            {uniqueTypes.length}
          </div>
          <div className={cn("mt-2 text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-700")}>
            Different opportunity types
          </div>
        </div>
      </div>

      {/* GAMBAR 1 Filter Bar */}
      <div className={cn("p-4 rounded-2xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-4", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or type..." 
              className={cn("w-full pl-9 pr-4 py-2 text-xs md:text-sm border rounded-xl focus:outline-none focus:border-cyan-500 transition-colors", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
            />
          </div>
          
          <div className="w-full sm:w-44">
            <Select
              value={filterType}
              onChange={(val) => setFilterType(val)}
              options={[
                { value: "ALL", label: "All Types" },
                ...uniqueTypes.map((type: any) => ({ value: type, label: type }))
              ]}
              placeholder="All Types"
              className={cn("w-full rounded-xl px-4 py-2 text-xs md:text-sm", isDark ? "border-slate-800 bg-[#060b14] text-white" : "border-slate-200 bg-slate-50 text-slate-900")}
            />
          </div>
        </div>
        <div className="flex items-center gap-3 self-end md:self-auto">
          {filteredOpportunities.length > 0 && (
            <button 
              onClick={toggleSelectAll}
              className={cn("flex items-center gap-2 px-3.5 py-2 font-bold text-xs rounded-xl transition-all border whitespace-nowrap", isDark ? "text-white border-slate-800 bg-[#060b14] hover:bg-slate-800/60" : "text-slate-900 border-slate-200 bg-white hover:bg-slate-100")}
            >
              <div className={`w-4 h-4 border rounded flex items-center justify-center ${selectedIds.length === filteredOpportunities.length && filteredOpportunities.length > 0 ? 'bg-cyan-500 border-cyan-500 text-slate-950' : isDark ? "border-slate-700 bg-[#060b14]" : "border-slate-300 bg-white"}`}>
                {selectedIds.length === filteredOpportunities.length && filteredOpportunities.length > 0 && <Check className="w-3 h-3 text-slate-950 stroke-[3]" />}
              </div>
              <span>{selectedIds.length === filteredOpportunities.length && filteredOpportunities.length > 0 ? 'Deselect All' : 'Select All'}</span>
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
          <table className={cn("w-full text-left text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
            <thead className={cn("text-xs uppercase border-b tracking-wider font-semibold", isDark ? "bg-[#060b14] text-slate-400 border-slate-800" : "bg-slate-50 text-slate-500 border-slate-200")}>
              <tr>
                <th className="px-6 py-4 font-semibold w-12">
                  <button onClick={toggleSelectAll} className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${selectedIds.length === filteredOpportunities.length && filteredOpportunities.length > 0 ? 'bg-cyan-500 border-cyan-500 text-slate-950' : isDark ? "border-slate-700 hover:border-cyan-400 bg-[#060b14]" : "border-slate-300 hover:border-cyan-600 bg-white"}`}>
                    {selectedIds.length === filteredOpportunities.length && filteredOpportunities.length > 0 && <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />}
                  </button>
                </th>
                <th className="px-6 py-4 font-semibold">Title</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDark ? "divide-slate-800/80" : "divide-slate-200")}>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">Loading items...</td>
                </tr>
              ) : filteredOpportunities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">No items found.</td>
                </tr>
              ) : (
                filteredOpportunities.map((item) => (
                  <tr key={item.id} className={cn("transition-colors group", isDark ? "hover:bg-white/5" : "hover:bg-slate-50/80")}>
                    <td className="px-6 py-4">
                      <button onClick={() => toggleSelect(item.id)} className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${selectedIds.includes(item.id) ? 'bg-cyan-500 border-cyan-500 text-slate-950' : isDark ? "border-slate-700 hover:border-cyan-400 bg-[#060b14]" : "border-slate-300 hover:border-cyan-600 bg-white"}`}>
                        {selectedIds.includes(item.id) && <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />}
                      </button>
                    </td>
                    <td className={cn("px-6 py-4 font-medium transition-colors", isDark ? "text-white group-hover:text-cyan-400" : "text-slate-900 group-hover:text-cyan-600")}>{item.title}</td>
                    <td className="px-6 py-4">
                      <span className={cn("px-3 py-1 rounded-full text-xs font-medium border", isDark ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" : "bg-slate-100 text-slate-600 border-slate-200")}>
                        {item.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("px-3 py-1 rounded-full text-xs font-medium border ", item.status === 'PUBLISHED' ? (isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200") : (isDark ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" : "bg-yellow-50 text-yellow-700 border-yellow-200"))}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {item.link && (
                          <a href={item.link} target="_blank" rel="noopener noreferrer" className={cn("p-2 rounded-lg hover:text-white hover:bg-white/10 transition-colors", isDark ? "text-zinc-400" : "text-slate-500")} title="External Link">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <Link href={`/admin/opportunities/edit/${item.id}`} className={cn("p-2 rounded-lg transition-colors", isDark ? "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 hover:text-white" : "bg-cyan-50 hover:bg-cyan-100 text-cyan-700 hover:text-cyan-800")} title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button onClick={() => setDeleteId(item.id)} className={cn("p-2 rounded-lg transition-colors", isDark ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-white" : "bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800")} title="Delete">
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
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Item?"
        description="Are you sure you want to delete this item? This action cannot be undone."
        confirmText="Delete"
        isLoading={deleting}
        variant="danger"
      />

      <ConfirmModal
        isOpen={showDeleteAllModal}
        onClose={() => setShowDeleteAllModal(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Items?"
        description={`Are you sure you want to delete the ${selectedIds.length} selected items? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isDeletingAll}
        variant="danger"
      />
    </div>
  );
}
