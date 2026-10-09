"use client";
import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Search, ExternalLink, CheckCircle, Check , LayoutDashboard } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import Link from "next/link";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export default function AdminOpportunitiesPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");
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
      <div className="flex flex-col sm:flex-row md:items-end justify-between gap-6 mb-6">
        <div>
          <h1 className={cn("text-3xl font-extrabold drop-shadow-sm mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Events & Jobs</h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Manage events, webinars, and job vacancies.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/opportunities/edit/new" className={cn("inline-flex items-center gap-2 px-6 py-3 font-bold rounded-xl transition-all shadow-md hover:shadow-lg", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-slate-900 shadow-cyan-500/20" : "bg-cyan-600 hover:bg-cyan-700 text-white shadow-cyan-600/20")}>
            <Plus className="w-5 h-5" /> New Item
          </Link>
      </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className={cn("p-5 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4", isDark ? "bg-[#0A0B1A]/50 border-white/5 bg-white/[0.02]" : "bg-white border-slate-200 bg-white")}>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4", isDark ? "text-cyan-500" : "text-cyan-700")} />
              <input 
                type="text" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title or type..." 
                className={cn("w-full pl-11 pr-4 py-2.5 text-sm border rounded-xl focus:outline-none transition-colors", isDark ? "bg-[#0a1624] border-cyan-500/30 text-white placeholder:text-zinc-500 focus:border-cyan-500" : "bg-slate-50 border-cyan-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500")}
              />
            </div>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={cn("px-4 py-2.5 text-sm border rounded-xl focus:outline-none transition-colors appearance-none cursor-pointer w-full sm:w-40", isDark ? "bg-[#0a1624] border-cyan-500/30 text-white focus:border-cyan-500" : "bg-slate-50 border-cyan-200 text-slate-900 focus:border-cyan-500")}
              style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2306b6d4%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem top 50%', backgroundSize: '0.65rem auto' }}
            >
              <option value="ALL" className={cn("bg-[#0f172a]", isDark ? "text-white" : "text-slate-900")}>All Types</option>
              {uniqueTypes.map((type: any) => (
                <option key={type} value={type} className={cn("bg-[#0f172a]", isDark ? "text-white" : "text-slate-900")}>{type}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
            {filteredOpportunities.length > 0 && (
              <button 
                onClick={toggleSelectAll}
                className={cn("flex items-center gap-2 px-4 py-2.5 font-bold rounded-xl transition-all border whitespace-nowrap", isDark ? "text-white border-white/10 hover:bg-white/10" : "text-slate-900 border-slate-200 hover:bg-slate-100")}
              >
                <div className={`w-5 h-5 border rounded flex items-center justify-center ${selectedIds.length === filteredOpportunities.length && filteredOpportunities.length > 0 ? 'bg-cyan-500 border-cyan-500' : isDark ? "border-zinc-500" : "border-slate-300"}`}>
                  {selectedIds.length === filteredOpportunities.length && filteredOpportunities.length > 0 && <CheckCircle className="w-3.5 h-3.5 text-slate-900" />}
                </div>
                <span className="hidden sm:inline">{selectedIds.length === filteredOpportunities.length && filteredOpportunities.length > 0 ? 'Deselect All' : 'Select All'}</span>
              </button>
            )}
            {selectedIds.length > 0 && (
              <button 
                onClick={() => setShowDeleteAllModal(true)}
                className={cn("flex items-center gap-2 px-4 py-2.5 font-bold rounded-xl transition-all border whitespace-nowrap", isDark ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20" : "bg-red-50 hover:bg-red-100 text-red-700 border-red-200")}
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Delete ({selectedIds.length})</span>
              </button>
            )}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className={cn("w-full text-left text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
            <thead className={cn("text-xs uppercase border-b", isDark ? "bg-[#0A0B1A]/50 border-white/5 text-cyan-400" : "bg-slate-50 border-slate-200 text-slate-500")}>
              <tr>
                <th className="px-6 py-4 font-medium w-12">
                  <button onClick={toggleSelectAll} className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${selectedIds.length === filteredOpportunities.length && filteredOpportunities.length > 0 ? 'bg-cyan-500 border-cyan-500' : isDark ? "border-zinc-500 hover:border-cyan-400" : "border-slate-300 hover:border-cyan-600"}`}>
                    {selectedIds.length === filteredOpportunities.length && filteredOpportunities.length > 0 && <CheckCircle className="w-3.5 h-3.5 text-slate-900" />}
                  </button>
                </th>
                <th className="px-6 py-4 font-medium">Title</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDark ? "divide-white/5" : "divide-slate-200")}>
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
                  <tr key={item.id} className={cn("transition-colors group", isDark ? "hover:bg-white/5" : "hover:bg-slate-50")}>
                    <td className="px-6 py-4">
                      <button onClick={() => toggleSelect(item.id)} className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${selectedIds.includes(item.id) ? 'bg-cyan-500 border-cyan-500' : isDark ? "border-zinc-500 hover:border-cyan-400" : "border-slate-300 hover:border-cyan-600"}`}>
                        {selectedIds.includes(item.id) && <CheckCircle className="w-3.5 h-3.5 text-slate-900" />}
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
