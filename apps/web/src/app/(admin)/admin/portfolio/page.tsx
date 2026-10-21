"use client";
import { useUrlString } from "@/lib/useUrlTab";
import { cn } from "@/lib/utils";
import { AdminLoader } from "@/components/admin/AdminLoader";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Search, ExternalLink, CheckCircle, Check, LayoutDashboard, Tag, RefreshCw } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import Link from "next/link";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export default function AdminPortfolioPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useUrlString<string>("search", "");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk actions
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/admin/portfolio');
      const data = await res.json();
      if (!data.error) {
        setProjects(data);
      }
    } catch (err) {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/portfolio/${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("Project deleted");
        fetchProjects();
      } else {
        toast.error("Failed to delete project");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeletingAll(true);
    try {
      const res = await fetch('/api/admin/portfolio/bulk-delete', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });
      if (res.ok) {
        toast.success(`${selectedIds.length} projects deleted`);
        fetchProjects();
        setSelectedIds([]);
      } else {
        toast.error("Failed to delete projects");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setIsDeletingAll(false);
      setShowDeleteAllModal(false);
    }
  };

  const filteredProjects = projects.filter(p => {
    if (categoryFilter !== 'all' && p.category?.name !== categoryFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = p.title?.toLowerCase().includes(q);
      const matchCat = (p.category?.name || '').toLowerCase().includes(q);
      if (!matchTitle && !matchCat) return false;
    }
    return true;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProjects.length && filteredProjects.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProjects.map(c => c.id));
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const totalCount = projects.length;
  const activeCount = projects.filter(p => !p.status || p.status.toLowerCase() === 'active').length;
  const uniqueCategories = Array.from(new Set(projects.map(p => p.category?.name).filter(Boolean)));
  const categoriesCount = uniqueCategories.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={cn("text-2xl md:text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Portfolio Management
          </h1>
          <p className={cn("text-sm font-medium mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>
            Manage your showcase projects, categories, and technical case studies.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2">
            <span>Total Projects:</span>
            <span className="font-extrabold text-white">{totalCount}</span>
          </div>
          <button
            onClick={() => { setLoading(true); fetchProjects(); }}
            className={cn(
              "px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border",
              isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            )}
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            <span>Refresh</span>
          </button>
          <Link 
            href="/admin/portfolio/categories" 
            className={cn("px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border", isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700")}
          >
            <Tag className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-700")} />
            <span>Categories</span>
          </Link>
          <Link 
            href="/admin/portfolio/edit/new" 
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors shrink-0 flex items-center justify-center gap-1.5 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Project</span>
          </Link>
        </div>
      </div>

      {/* Stat Cards Grid (GAMBAR 1 Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>TOTAL PROJECTS</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <LayoutDashboard className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{totalCount}</span>
            <span className={cn("text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-600")}>All Showcases</span>
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>ACTIVE SHOWCASES</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{activeCount}</span>
            <span className={cn("text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-600")}>Live Online</span>
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>CATEGORIES</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{categoriesCount}</span>
            <span className={cn("text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-600")}>Domains</span>
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>CLIENT PROJECTS</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <ExternalLink className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{projects.filter(p => p.link).length}</span>
            <span className={cn("text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-600")}>With Live URL</span>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar (GAMBAR 1 Style) */}
      <div className={cn("p-4 rounded-2xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className={cn("inline-flex items-center gap-1 p-1 rounded-xl border max-w-full overflow-x-auto scrollbar-none self-start", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-100 border-slate-200")}>
          {[
            { key: 'all', label: 'All Projects', count: totalCount },
            ...uniqueCategories.map(cat => ({
              key: cat as string,
              label: cat as string,
              count: projects.filter(p => p.category?.name === cat).length
            }))
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setCategoryFilter(tab.key)}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
                categoryFilter === tab.key
                  ? "bg-cyan-500 text-slate-950 shadow-sm"
                  : isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-slate-600 hover:text-slate-900 hover:bg-white"
              )}
            >
              <span>{tab.label}</span>
              <span className={cn("px-1.5 py-0.2 rounded-full text-[10px]", categoryFilter === tab.key ? "bg-slate-950/20 text-slate-950 font-extrabold" : isDark ? "bg-white/10 text-zinc-300" : "bg-slate-200 text-slate-700")}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          {filteredProjects.length > 0 && (
            <button 
              onClick={toggleSelectAll}
              className={cn("flex items-center gap-2 px-3.5 py-2 font-bold rounded-xl text-xs transition-all border", isDark ? "bg-[#060b14] text-white border-slate-800 hover:border-slate-700" : "bg-slate-50 text-slate-900 border-slate-200 hover:bg-white")}
            >
              <div className={cn(
                "w-4 h-4 border rounded flex items-center justify-center transition-colors",
                selectedIds.length === filteredProjects.length && filteredProjects.length > 0
                  ? "bg-cyan-500 border-cyan-500 text-slate-950"
                  : isDark ? "border-slate-700 bg-[#060b14]" : "border-slate-300 bg-white"
              )}>
                {selectedIds.length === filteredProjects.length && filteredProjects.length > 0 && <Check className="w-3 h-3 text-slate-950 font-bold" strokeWidth={3} />}
              </div>
              <span>{selectedIds.length === filteredProjects.length && filteredProjects.length > 0 ? 'Deselect All' : 'Select All'}</span>
            </button>
          )}

          {selectedIds.length > 0 && (
            <button 
              onClick={() => setShowDeleteAllModal(true)}
              className={cn("flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors border", isDark ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20" : "bg-red-50 hover:bg-red-100 text-red-600 border-red-200")}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          )}

          <div className="relative w-full sm:w-64">
            <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4", isDark ? "text-zinc-500" : "text-slate-400")} />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..." 
              className={cn("w-full pl-9 pr-4 py-2 text-xs md:text-sm rounded-xl border focus:outline-none focus:border-cyan-500 transition-colors", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400")}
            />
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className={cn("border rounded-2xl overflow-hidden relative z-10", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className="overflow-x-auto">
          <table className={cn("w-full text-left text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
            <thead className={cn("text-xs uppercase border-b tracking-wider font-semibold", isDark ? "bg-[#060b14] text-slate-400 border-slate-800" : "bg-slate-50 text-slate-500 border-slate-200")}>
              <tr>
                <th className="p-4 w-12">
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectAll();
                    }}
                    className={cn(
                      "w-5 h-5 border rounded flex items-center justify-center transition-colors",
                      selectedIds.length === filteredProjects.length && filteredProjects.length > 0
                        ? "bg-cyan-500 border-cyan-500 text-slate-950"
                        : isDark ? "border-slate-700 bg-[#060b14] hover:border-cyan-400" : "border-slate-300 bg-white hover:border-slate-400"
                    )}
                  >
                    {selectedIds.length === filteredProjects.length && filteredProjects.length > 0 && <Check className="w-3.5 h-3.5 text-slate-950 font-bold" strokeWidth={3} />}
                  </button>
                </th>
                <th className="p-4 whitespace-nowrap font-medium">Project Name</th>
                <th className="p-4 whitespace-nowrap font-medium">Category</th>
                <th className="p-4 whitespace-nowrap font-medium">Status</th>
                <th className="p-4 whitespace-nowrap font-medium">Date Added</th>
                <th className="p-4 text-right whitespace-nowrap font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDark ? "divide-slate-800/80" : "divide-slate-200")}>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12">
                    <AdminLoader className="min-h-[200px]" />
                  </td>
                </tr>
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 border transition-transform duration-500", isDark ? "bg-[#060b14] border-slate-800 text-zinc-600" : "bg-slate-50 border-slate-200 text-slate-400")}>
                        <Search className="w-10 h-10" />
                      </div>
                      <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No projects found</h3>
                      <p className="text-zinc-500 text-sm max-w-sm">We couldn't find any projects matching your search criteria.</p>
                      {search && (
                        <button onClick={() => setSearch('')} className={cn("mt-4 text-sm hover:text-cyan-300 font-medium transition-colors", isDark ? "text-cyan-400" : "text-cyan-700")}>
                          Clear search
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project) => (
                  <tr key={project.id} className={cn("transition-colors group", isDark ? "hover:bg-white/5" : "hover:bg-slate-50/80")}>
                    <td className="p-4 whitespace-nowrap">
                      <button 
                        onClick={() => toggleSelect(project.id)} 
                        className={cn(
                          "w-5 h-5 border rounded flex items-center justify-center transition-colors",
                          selectedIds.includes(project.id)
                            ? "bg-cyan-500 border-cyan-500 text-slate-950"
                            : isDark ? "border-slate-700 bg-[#060b14] hover:border-cyan-400" : "border-slate-300 bg-white hover:border-slate-400"
                        )}
                      >
                        {selectedIds.includes(project.id) && <Check className="w-3.5 h-3.5 text-slate-950 font-bold" strokeWidth={3} />}
                      </button>
                    </td>
                    <td className={cn("p-4 font-bold group-hover:text-cyan-400 transition-colors whitespace-nowrap", isDark ? "text-white" : "text-slate-900")}>
                      <Link href={`/admin/portfolio/edit/${project.id}`}>{project.title}</Link>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-zinc-500/10 border border-zinc-500/20", isDark ? "text-zinc-400" : "text-slate-500")}>
                        {project.category?.name || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-cyan-500/10 border border-cyan-500/20", isDark ? "text-cyan-400" : "text-cyan-700")}>
                        {project.status || 'Active'}
                      </span>
                    </td>
                    <td className={cn("p-4 whitespace-nowrap font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>{new Date(project.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/portfolio/edit/${project.id}`} className={cn("p-2 rounded-lg transition-colors border border-transparent", isDark ? "bg-cyan-500/10 hover:bg-cyan-500 hover:text-white text-cyan-400" : "bg-cyan-50 hover:bg-cyan-500 hover:text-white text-cyan-700")} title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button onClick={() => setDeleteId(project.id)} className={cn("p-2 rounded-lg transition-colors border border-transparent", isDark ? "bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400" : "bg-red-50 hover:bg-red-500 hover:text-white text-red-700")} title="Delete">
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
        title="Delete Project?"
        description="This project will be permanently deleted from the system."
        confirmText="Delete"
        isLoading={isDeleting}
        variant="danger"
      />

      <ConfirmModal
        isOpen={showDeleteAllModal}
        onClose={() => setShowDeleteAllModal(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Projects?"
        description={`Are you sure you want to delete ${selectedIds.length} selected projects? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={isDeletingAll}
        variant="danger"
      />
    </div>
  );
}
