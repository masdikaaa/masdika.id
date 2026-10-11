"use client";
import { cn } from "@/lib/utils";
import { AdminLoader } from "@/components/admin/AdminLoader";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Search, ExternalLink, CheckCircle, Check , LayoutDashboard } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import Link from "next/link";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { motion } from "framer-motion";

export default function AdminPortfolioPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

  const filteredProjects = projects.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) || 
    (p.category?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-4">
        <div className="flex flex-col sm:flex-row md:items-end justify-between gap-6 mb-6">
        <div>
          <h1 className={cn("text-3xl font-extrabold drop-shadow-sm mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Portfolio Management</h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Manage your projects, categories, and case studies.</p>
        </div>
      </div>
        <Link href="/admin/portfolio/edit/new" className={cn("inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-slate-900" : "bg-cyan-600 hover:bg-cyan-700 text-white")}>
          <Plus className="w-4 h-4" /> Add Project
        </Link>
      </motion.div>

      <motion.div variants={itemVariants} className="glass-card overflow-hidden">
        <div className={cn("p-5 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
          <div className="relative w-full sm:max-w-md">
            <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 /70", isDark ? "text-cyan-500" : "text-cyan-700")} />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..." 
              className={cn("w-full pl-11 pr-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-zinc-500 shadow-inner", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
            />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {filteredProjects.length > 0 && (
              <button 
                onClick={toggleSelectAll}
                className={cn("flex items-center justify-center gap-2 flex-1 sm:flex-none px-4 py-2.5 text-sm font-bold rounded-xl transition-all border whitespace-nowrap", isDark ? "text-white border-white/10 hover:bg-white/10" : "text-slate-900 border-slate-200 hover:bg-slate-100")}
              >
                <div className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${selectedIds.length === filteredProjects.length && filteredProjects.length > 0 ? 'bg-cyan-500 border-cyan-500' : isDark ? "border-zinc-500" : "border-slate-300"}`}>
                  {selectedIds.length === filteredProjects.length && filteredProjects.length > 0 && <Check className="w-3 h-3 text-slate-900 font-bold" strokeWidth={3} />}
                </div>
                <span>{selectedIds.length === filteredProjects.length && filteredProjects.length > 0 ? 'Deselect All' : 'Select All'}</span>
              </button>
            )}
            {selectedIds.length > 0 && (
              <button 
                onClick={() => setShowDeleteAllModal(true)}
                className={cn("flex items-center justify-center gap-2 flex-1 sm:flex-none px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-sm font-bold rounded-xl transition-all border border-red-500/20 whitespace-nowrap shadow-inner", isDark ? "text-red-400" : "text-red-700")}
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete ({selectedIds.length})</span>
              </button>
            )}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className={cn("w-full text-left text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
            <thead className={cn("text-[10px] text-zinc-500 uppercase bg-black/40 border-b tracking-wider font-bold", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
              <tr>
                <th className="px-6 py-4 w-10 whitespace-nowrap"></th>
                <th className="px-6 py-4 whitespace-nowrap">Project Name</th>
                <th className="px-6 py-4 whitespace-nowrap">Category</th>
                <th className="px-6 py-4 whitespace-nowrap">Status</th>
                <th className="px-6 py-4 whitespace-nowrap">Date Added</th>
                <th className="px-6 py-4 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDark ? "divide-white/5" : "divide-slate-200")}>
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
                      <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-4 border shadow-inner", isDark ? "border-white/10" : "border-slate-200")}>
                        <Search className="w-8 h-8 text-zinc-500" />
                      </div>
                      <h3 className={cn("font-bold mb-1", isDark ? "text-white" : "text-slate-900")}>No projects found</h3>
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
                  <tr key={project.id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button onClick={() => toggleSelect(project.id)} className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${selectedIds.includes(project.id) ? 'bg-cyan-500 border-cyan-500' : 'border-zinc-600 hover:border-cyan-400'}`}>
                        {selectedIds.includes(project.id) && <Check className="w-3 h-3 text-slate-900 font-bold" strokeWidth={3} />}
                      </button>
                    </td>
                    <td className={cn("px-6 py-4 font-bold group-hover:text-cyan-400 transition-colors whitespace-nowrap", isDark ? "text-white" : "text-slate-900")}>
                      <Link href={`/admin/portfolio/edit/${project.id}`}>{project.title}</Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-zinc-500/10 border border-zinc-500/20", isDark ? "text-zinc-400" : "text-slate-500")}>
                        {project.category?.name || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-cyan-500/10 border border-cyan-500/20 shadow-inner", isDark ? "text-cyan-400" : "text-cyan-700")}>
                        {project.status || 'Active'}
                      </span>
                    </td>
                    <td className={cn("px-6 py-4 whitespace-nowrap font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>{new Date(project.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/portfolio/edit/${project.id}`} className={cn("p-2 bg-cyan-500/10 rounded-lg hover:text-white hover:bg-cyan-500/20 transition-colors border border-transparent hover:border-cyan-500/20 shadow-inner", isDark ? "text-cyan-400" : "text-cyan-700")} title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button onClick={() => setDeleteId(project.id)} className={cn("p-2 bg-red-500/10 rounded-lg hover:text-white hover:bg-red-500/20 transition-colors border border-transparent hover:border-red-500/20 shadow-inner", isDark ? "text-red-400" : "text-red-700")} title="Delete">
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
      </motion.div>

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
    </motion.div>
  );
}
