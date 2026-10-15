"use client";
import { useUpdateEffect, useUrlNumber, useUrlTab } from "@/lib/useUrlTab";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, LayoutList, Server, Zap, Link as LinkIcon, Database, Check, X, ShieldAlert, CheckCircle, FileText, FileVideo, Music, PlaySquare, Cloud, Activity, UploadCloud, ChevronDown , LayoutDashboard } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { formatRupiah } from "@/lib/billing";
import { Pagination } from "@/components/ui/Pagination";
import { AdminLoader } from "@/components/admin/AdminLoader";
import { Select } from "@/components/ui/Select";
interface Plan {
  id: number;
  name: string;
  service: string;
  description: string;
  price: number;
  hourlyPrice: number;
  limits: string;
  isPopular: boolean;
  isActive: boolean;
}
const getDefaultLimitFields = (service: string) => {
  if (service === 'OBJECT_STORAGE' || service === 'CDN') {
    return [{key: 'storageGB', value: '10'}, {key: 'transferGB', value: '50'}, {key: 'requests', value: 'unlimited'}];
  } else if (service === 'SHORTENER') {
    return [{key: 'links', value: '500'}];
  } else {
    return [{key: 'requests', value: '10000'}];
  }
};
export default function AdminPlansPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/admin/plans");
      const data = await res.json();
      if (data.success) {
        setPlans(data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch plans");
    } finally {
      setLoading(false);
    }
  };

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  // Pagination & Filtering
  const [activeTab, setActiveTab] = useUrlTab<string>("ALL");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useUrlNumber("currentPage", 1);
  const itemsPerPage = 10;
  // Form states
  const [limitFields, setLimitFields] = useState<{key: string, value: string}[]>(getDefaultLimitFields("OBJECT_STORAGE"));
  const [formData, setFormData] = useState({
    name: "",
    service: "OBJECT_STORAGE",
    description: "",
    price: 0,
    hourlyPrice: 0,
    isPopular: false,
    isActive: true
  });
  useEffect(() => {
    fetchPlans();
  }, []);
  const openAddModal = () => {
    setEditingPlan(null);
    setLimitFields(getDefaultLimitFields("OBJECT_STORAGE"));
    setFormData({
      name: "",
      service: "OBJECT_STORAGE",
      description: "",
      price: 0,
      hourlyPrice: 0,
      isPopular: false,
      isActive: true
    });
    setIsModalOpen(true);
  };
  const openEditModal = (plan: Plan) => {
    setEditingPlan(plan);
    const defaultFields = getDefaultLimitFields(plan.service);
    try {
      const parsed = JSON.parse(plan.limits);
      const updatedFields = defaultFields.map(f => ({
        key: f.key,
        value: parsed[f.key] !== undefined ? String(parsed[f.key]) : f.value
      }));
      setLimitFields(updatedFields);
    } catch(e) {
      setLimitFields(defaultFields);
    }
    setFormData({
      name: plan.name,
      service: plan.service,
      description: plan.description || "",
      price: plan.price,
      hourlyPrice: plan.hourlyPrice || 0,
      isPopular: plan.isPopular || false,
      isActive: plan.isActive
    });
    setIsModalOpen(true);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const limitsObj: Record<string, string | number> = {};
    for (const field of limitFields) {
      if (field.key.trim() === '') continue;
      const numValue = Number(field.value);
      limitsObj[field.key] = isNaN(numValue) || field.value.trim() === '' ? field.value : numValue;
    }
    const limitsJsonString = JSON.stringify(limitsObj);
    setIsSubmitting(true);
    const toastId = toast.loading(editingPlan ? "Updating plan..." : "Creating plan...");
    try {
      const url = editingPlan 
        ? `/api/admin/plans/${editingPlan.id}`
        : "/api/admin/plans";
      
      const payload = { ...formData, limits: limitsJsonString };
      const res = await fetch(url, {
        method: editingPlan ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success(`Plan successfully ${editingPlan ? "updated" : "created"}`, { id: toastId });
        setIsModalOpen(false);
        fetchPlans();
      } else {
        toast.error(data.error || "Failed to save plan", { id: toastId });
      }
    } catch (err) {
      toast.error("An error occurred", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };
  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    
    const toastId = toast.loading("Deleting plan...");
    try {
      const res = await fetch(`/api/admin/plans/${deleteConfirmId}`, { method: "DELETE" });
      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message || "Plan deleted", { id: toastId });
        fetchPlans();
      } else {
        toast.error(data.error || "Failed to delete plan", { id: toastId });
      }
    } catch (err) {
      toast.error("An error occurred", { id: toastId });
    } finally {
      setIsDeleting(false);
      setDeleteConfirmId(null);
    }
  };
  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'OBJECT_STORAGE': return <Database className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-700")} />;
      case 'CDN': return <UploadCloud className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-700")} />;
      case 'SHORTENER': return <LinkIcon className={cn("w-4 h-4", isDark ? "text-emerald-400" : "text-emerald-700")} />;
      case 'TIKTOK': return <FileVideo className={cn("w-4 h-4", isDark ? "text-purple-400" : "text-purple-700")} />;
      case 'SPOTIFY': return <Music className={cn("w-4 h-4", isDark ? "text-purple-400" : "text-purple-700")} />;
      case 'YOUTUBE': return <PlaySquare className={cn("w-4 h-4", isDark ? "text-purple-400" : "text-purple-700")} />;
      case 'BLOG': return <FileText className={cn("w-4 h-4", isDark ? "text-purple-400" : "text-purple-700")} />;
      case 'BMKG_WEATHER': return <Cloud className={cn("w-4 h-4", isDark ? "text-purple-400" : "text-purple-700")} />;
      case 'BMKG_EARTHQUAKE': return <Activity className={cn("w-4 h-4", isDark ? "text-purple-400" : "text-purple-700")} />;
      default: return <Server className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-700")} />;
    }
  };
  const services = ["ALL", ...Array.from(new Set(plans.map(p => p.service)))];
  const filteredPlans = activeTab === "ALL" ? plans : plans.filter(p => p.service === activeTab);
  const totalPages = Math.ceil(filteredPlans.length / itemsPerPage);
  const paginatedPlans = filteredPlans.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  // Reset page when tab changes
  useUpdateEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [activeTab]);
  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedPlans.length && paginatedPlans.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedPlans.map(c => c.id));
    }
  };
  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleteModalOpen(true);
  };
  const executeBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsDeleting(true);
    const toastId = toast.loading("Deleting plans...");
    try {
      const res = await fetch("/api/admin/plans", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds })
      });
      const data = await res.json();
      
      if (res.ok) {
        toast.success(`${selectedIds.length} plans deleted`, { id: toastId });
        setSelectedIds([]);
        fetchPlans();
        setIsBulkDeleteModalOpen(false);
      } else {
        toast.error(data.error || "Failed to delete plans", { id: toastId });
      }
    } catch (err) {
      toast.error("An error occurred", { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <AdminLoader />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row md:items-end justify-between gap-6 mb-6">
        <div>
          <h1 className={cn("text-3xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Subscription Plans</h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Manage pricing, specs, and availability for all services.</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className={cn("flex items-center gap-2 font-semibold py-2 px-6 rounded-xl transition-all border shrink-0", isDark ? "bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-500" : "bg-red-50 hover:bg-red-100 border-red-200 text-red-700")}
            >
              <Trash2 className="w-4 h-4" />
              Delete ({selectedIds.length})
            </button>
          )}
          <button
            onClick={openAddModal}
            className={cn("flex items-center gap-2 font-semibold py-2 px-6 rounded-xl transition-all shrink-0", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-slate-900" : "bg-cyan-600 hover:bg-cyan-700 text-white")}
          >
            <Plus className="w-4 h-4" />
            Add New Plan
          </button>
      </div>
      </div>
      <div className="flex justify-start mb-6">
        <div className="relative w-full sm:w-64">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={cn("w-full flex items-center justify-between bg-[#0f172a] border text-sm font-semibold rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer transition-all hover:bg-white/5", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
          >
            <span>{activeTab === "ALL" ? "All Services" : activeTab.replace('_', ' ')}</span>
            <ChevronDown className={cn("w-4 h-4 transition-transform", isDropdownOpen ? "rotate-180" : "", isDark ? "text-zinc-400" : "text-slate-500")} />
          </button>
          
          {isDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
              <div className={cn("absolute z-50 w-full mt-2 bg-[#0f172a] border rounded-xl overflow-hidden py-1", isDark ? "border-white/10" : "border-slate-200")}>
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                  {services.map((service) => (
                    <button
                      key={service}
                      onClick={() => {
                        setActiveTab(service);
                        setIsDropdownOpen(false);
                        setCurrentPage(1);
                      }}
                      className={cn("w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors", activeTab === service ? (isDark ? "bg-cyan-500/10 text-cyan-400" : "bg-cyan-50 text-cyan-700") : (isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"))}
                    >
                      {service === "ALL" ? "All Services" : service.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <div className={cn("bg-[#0f172a] border rounded-2xl overflow-hidden", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
        <div className="overflow-x-auto">
          <table className={cn("w-full text-left text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
            <thead className={cn("text-xs uppercase border-b", isDark ? "text-zinc-500 bg-[#0A0B1A]/50 border-white/5" : "text-slate-500 bg-white border-slate-200")}>
              <tr>
                <th scope="col" className="px-6 py-4 font-semibold w-12 text-center">
                  <button onClick={toggleSelectAll} className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${selectedIds.length === paginatedPlans.length && paginatedPlans.length > 0 ? 'bg-cyan-500 border-cyan-500' : isDark ? "border-zinc-500 hover:border-cyan-400" : "border-slate-300 hover:border-cyan-600"}`}>
                    {selectedIds.length === paginatedPlans.length && paginatedPlans.length > 0 && <CheckCircle className="w-3.5 h-3.5 text-slate-900" />}
                  </button>
                </th>
                <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Plan Details</th>
                <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Service</th>
                <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Price / Month</th>
                <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Limits (JSON)</th>
                <th scope="col" className="px-6 py-4 font-semibold text-center whitespace-nowrap">Status</th>
                <th scope="col" className="px-6 py-4 font-semibold text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDark ? "divide-white/5" : "divide-slate-200")}>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <AdminLoader className="min-h-[200px]" />
                  </td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={7} className={cn("px-6 py-12 text-center", isDark ? "text-zinc-500" : "text-slate-500")}>
                    No plans found. Click "Add New Plan" to create one.
                  </td>
                </tr>
              ) : (
                paginatedPlans.map((plan) => (
                  <tr key={plan.id} className={cn("transition-colors group", isDark ? "hover:bg-white/[0.02]" : "hover:bg-slate-50", selectedIds.includes(plan.id) ? (isDark ? "bg-cyan-500/[0.02]" : "bg-cyan-50") : "")}>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => toggleSelect(plan.id)} className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${selectedIds.includes(plan.id) ? 'bg-cyan-500 border-cyan-500' : isDark ? "border-zinc-500 hover:border-cyan-400" : "border-slate-300 hover:border-cyan-600"}`}>
                        {selectedIds.includes(plan.id) && <CheckCircle className="w-3.5 h-3.5 text-slate-900" />}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap min-w-[200px]">
                      <div className={cn("font-bold text-base", isDark ? "text-white" : "text-slate-900")}>{plan.name}</div>
                      {plan.description && <div className={cn("text-xs mt-1 truncate", isDark ? "text-zinc-500" : "text-slate-500")}>{plan.description}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getServiceIcon(plan.service)}
                        <span className={cn("font-medium", isDark ? "text-white" : "text-slate-900")}>{plan.service.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={cn("font-bold", isDark ? "text-cyan-400" : "text-cyan-700")}>{formatRupiah(plan.price)} <span className="text-[10px] text-zinc-500 font-normal">/mo</span></div>
                      {plan.hourlyPrice > 0 && <div className={cn("text-xs mt-0.5", isDark ? "text-purple-400" : "text-purple-700")}>{formatRupiah(plan.hourlyPrice)} <span className="text-[10px] opacity-70">/hr (PAYG)</span></div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={cn("bg-black/30 p-2 rounded border text-[10px] font-mono max-w-[200px] overflow-hidden whitespace-nowrap overflow-ellipsis", isDark ? "bg-[#0A0B1A]/50 border-white/5 text-zinc-300" : "bg-white border-slate-200 text-slate-600")}>
                        {plan.limits}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      {plan.isActive ? (
                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20", isDark ? "text-emerald-400" : "text-emerald-700")}>
                          <Check className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-500/10 border border-zinc-500/20", isDark ? "text-zinc-400" : "text-slate-500")}>
                          <X className="w-3 h-3" /> Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => openEditModal(plan)}
                        className={cn("p-2 hover:bg-white/10 hover:text-white rounded-lg transition-colors border", isDark ? "text-zinc-400 border-white/5" : "text-slate-500 border-slate-200")}
                        title="Edit Plan"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(plan.id)}
                        className={cn("p-2 rounded-lg transition-colors border", isDark ? "bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400" : "bg-red-50 hover:bg-red-100 border-red-200 text-red-600")}
                        title="Delete/Disable Plan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className={cn("relative bg-[#0f172a] border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto", isDark ? "border-white/10" : "border-slate-200")}>
            
            <div className={cn("flex justify-between items-center p-6 border-b sticky top-0 bg-[#0f172a]/95 backdrop-blur z-10", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
              <h2 className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>
                {editingPlan ? "Edit Plan" : "Create New Plan"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className={cn("hover:text-white transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-600")}>Plan Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Starter, Pro, Enterprise"
                    className={cn("w-full border rounded-xl px-4 py-3 placeholder:text-zinc-500 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                  />
                </div>
                <div className="space-y-2">
                  <label className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-600")}>Target Service</label>
                  <Select
                    value={formData.service}
                    onChange={(val) => {
                      const newService = val.toString();
                      setFormData({...formData, service: newService});
                      setLimitFields(getDefaultLimitFields(newService));
                    }}
                    options={[
                      { value: "SHORTENER", label: "URL Shortener" },
                      { value: "CDN", label: "CDN" },
                      { value: "TIKTOK", label: "TikTok Downloader" },
                      { value: "SPOTIFY", label: "Spotify Downloader" },
                      { value: "YOUTUBE", label: "YouTube API" },
                      { value: "BLOG", label: "Blog Service" },
                      { value: "BMKG_WEATHER", label: "BMKG Weather API" },
                      { value: "BMKG_EARTHQUAKE", label: "BMKG Earthquake API" }
                    ]}
                    placeholder="Select Target Service..."
                    className={cn("w-full rounded-xl px-4 py-3 text-sm", isDark ? "border-white/10" : "border-slate-200")}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-600")}>Description (Optional)</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="e.g., Perfect for small businesses."
                  className={cn("w-full border rounded-xl px-4 py-3 placeholder:text-zinc-500 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-600")}>Monthly Price (Rp)</label>
                  <div className="relative">
                    <span className={cn("absolute left-4 top-1/2 -translate-y-1/2 font-semibold", isDark ? "text-zinc-500" : "text-slate-500")}>Rp</span>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
                      className={cn("w-full border rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-bold", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-600")}>Hourly Price (PAYG - Rp)</label>
                  <div className="relative">
                    <span className={cn("absolute left-4 top-1/2 -translate-y-1/2 font-semibold", isDark ? "text-zinc-500" : "text-slate-500")}>Rp</span>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.hourlyPrice}
                      onChange={(e) => setFormData({...formData, hourlyPrice: Number(e.target.value)})}
                      className={cn("w-full border rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-bold", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-600")}>Limits & Features</label>
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                  {limitFields.map((field, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className={cn("w-1/3 text-sm font-mono text-right", isDark ? "text-zinc-400" : "text-slate-500")}>
                        {field.key}
                      </div>
                      <input
                        type="text"
                        placeholder={`Value for ${field.key}`}
                        value={field.value}
                        onChange={(e) => {
                          const newFields = [...limitFields];
                          newFields[idx].value = e.target.value;
                          setLimitFields(newFields);
                        }}
                        className={cn("w-2/3 bg-[#050b14] border rounded-lg px-3 py-2 font-mono text-xs placeholder:text-zinc-500 dark:placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/50", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={cn("w-5 h-5 border rounded flex items-center justify-center transition-colors", formData.isPopular ? "bg-cyan-500 border-cyan-500" : (isDark ? "border-zinc-500 group-hover:border-cyan-400" : "border-slate-300 group-hover:border-cyan-600"))}>
                    </div>
                    <span className={cn("text-sm font-medium group-hover:text-white transition-colors", isDark ? "text-zinc-300" : "text-slate-600")}>Mark as Most Popular</span>
                    <input
                      type="checkbox"
                      checked={formData.isPopular}
                      onChange={(e) => setFormData({...formData, isPopular: e.target.checked})}
                      className="hidden"
                    />
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${
                      formData.isActive ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-500 group-hover:border-emerald-400'
                    }`}>
                      {formData.isActive && <CheckCircle className="w-3.5 h-3.5 text-slate-900" />}
                    </div>
                    <span className={cn("text-sm font-medium group-hover:text-white transition-colors", isDark ? "text-zinc-300" : "text-slate-600")}>Plan is Active</span>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                      className="hidden"
                    />
                  </label>
                </div>
              <div className={cn("flex justify-end gap-3 pt-6 border-t", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={cn("px-6 py-2.5 rounded-xl font-medium hover:text-white hover:bg-white/10 transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cn("px-6 py-2.5 rounded-xl font-semibold disabled:opacity-50 transition-all flex items-center gap-2", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-slate-900" : "bg-cyan-600 hover:bg-cyan-700 text-white")}
                >
                  {isSubmitting ? (
                    <>
                      <div className={cn("w-4 h-4 border-2 border-t-white rounded-full animate-spin", isDark ? "border-white/20" : "border-slate-200")} />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {editingPlan ? "Save Changes" : "Create Plan"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isDeleting && setDeleteConfirmId(null)} />
          <div className={cn("relative bg-[#0f172a] border rounded-2xl w-full max-w-md p-6 overflow-hidden", isDark ? "border-white/10" : "border-slate-200")}>
            <div className="flex flex-col items-center text-center">
              <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-4 border", isDark ? "bg-red-500/10 border-red-500/20" : "bg-red-50 border-red-200")}>
                <ShieldAlert className={cn("w-8 h-8", isDark ? "text-red-500" : "text-red-700")} />
              </div>
              <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>Delete Plan?</h3>
              <p className={cn("mb-8", isDark ? "text-zinc-400" : "text-slate-500")}>
                Are you sure you want to delete this plan? This action will <strong className={cn(isDark ? "text-white" : "text-slate-900")}>forcefully delete</strong> all active subscriptions associated with it. This cannot be undone!
              </p>
              
              <div className="flex w-full gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  disabled={isDeleting}
                  className={cn("flex-1 py-2.5 rounded-xl font-medium hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50", isDark ? "text-zinc-300" : "text-slate-600")}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeDelete}
                  disabled={isDeleting}
                  className={cn("flex-1 py-2.5 rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition-all flex justify-center items-center gap-2")}
                >
                  {isDeleting ? (
                    <>
                      <div className={cn("w-4 h-4 border-2 border-t-white rounded-full animate-spin", isDark ? "border-white/20" : "border-slate-200")} />
                      Deleting...
                    </>
                  ) : "Delete Plan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isDeleting && setIsBulkDeleteModalOpen(false)} />
          <div className={cn("relative bg-[#0f172a] border rounded-2xl w-full max-w-md p-6 overflow-hidden", isDark ? "border-white/10" : "border-slate-200")}>
            <div className="flex flex-col items-center text-center">
              <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-4 border", isDark ? "bg-red-500/10 border-red-500/20" : "bg-red-50 border-red-200")}>
                <ShieldAlert className={cn("w-8 h-8", isDark ? "text-red-500" : "text-red-700")} />
              </div>
              <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>Delete {selectedIds.length} Plans?</h3>
              <p className={cn("mb-8", isDark ? "text-zinc-400" : "text-slate-500")}>
                Are you sure you want to delete {selectedIds.length} selected plans? This action will <strong className={cn(isDark ? "text-white" : "text-slate-900")}>forcefully delete</strong> all active subscriptions associated with them. This cannot be undone!
              </p>
              
              <div className="flex w-full gap-3">
                <button
                  type="button"
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  disabled={isDeleting}
                  className={cn("flex-1 py-2.5 rounded-xl font-medium hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50", isDark ? "text-zinc-300" : "text-slate-600")}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeBulkDelete}
                  disabled={isDeleting}
                  className={cn("flex-1 py-2.5 rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition-all flex justify-center items-center gap-2")}
                >
                  {isDeleting ? (
                    <>
                      <div className={cn("w-4 h-4 border-2 border-t-white rounded-full animate-spin", isDark ? "border-white/20" : "border-slate-200")} />
                      Deleting...
                    </>
                  ) : "Delete All"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}