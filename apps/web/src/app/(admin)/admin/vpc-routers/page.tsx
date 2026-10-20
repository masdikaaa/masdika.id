"use client";
import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";
import { Plus, Server, Edit, Trash2, RefreshCw, Loader2, Network, X, CheckCircle2, Eye, EyeOff, ShieldCheck, Globe, Layers } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { AdminLoader } from "@/components/admin/AdminLoader";

type VpcRouter = {
  id: number;
  name: string;
  host: string;
  apiPort: number;
  useSsl: boolean;
  username: string;
  proxmoxBridge: string;
  interfaceName: string;
  wanInterface: string;
  createdAt: string;
};

export default function VpcRoutersPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const fetchRouters = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/vpc-routers");
      if (res.ok) {
        const data = await res.json();
        setRouters(data);
      }
    } catch (e) {
      toast.error("Failed to fetch VPC Routers");
    } finally {
      setLoading(false);
    }
  };

  const [routers, setRouters] = useState<VpcRouter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<VpcRouter | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    host: "",
    apiPort: 8728,
    useSsl: false,
    username: "",
    password: "",
    proxmoxBridge: "vmbr2",
    interfaceName: "ether3",
    wanInterface: "ether1"
  });
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRouters();
  }, []);


  const handleSave = async () => {
    if (!formData.name || !formData.host || !formData.username || (!formData.password && !showEditModal)) {
      toast.error("Please fill all required fields");
      return;
    }

    setSaving(true);
    try {
      const url = showEditModal ? `/api/admin/vpc-routers/${showEditModal.id}` : "/api/admin/vpc-routers";
      const method = showEditModal ? "PUT" : "POST";
      
      const payload = { ...formData };
      if (showEditModal && payload.password === "********") {
        payload.password = "";
      }
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(`VPC Router ${showEditModal ? "updated" : "added"} successfully`);
        setShowAddModal(false);
        setShowEditModal(null);
        fetchRouters();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to save VPC Router");
      }
    } catch (e) {
      toast.error("Error saving VPC Router");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteModal) return;
    
    try {
      const res = await fetch(`/api/admin/vpc-routers/${showDeleteModal}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("VPC Router deleted successfully");
        setShowDeleteModal(null);
        fetchRouters();
      } else {
        toast.error("Failed to delete VPC Router");
      }
    } catch (e) {
      toast.error("Error deleting VPC Router");
    }
  };

  const openAddModal = () => {
    setFormData({
      name: "",
      host: "",
      apiPort: 8728,
      useSsl: false,
      username: "",
      password: "",
      proxmoxBridge: "vmbr2",
      interfaceName: "ether3",
      wanInterface: ""
    });
    setShowPassword(false);
    setShowAddModal(true);
  };

  const openEditModal = (router: VpcRouter) => {
    setFormData({
      name: router.name,
      host: router.host,
      apiPort: router.apiPort,
      useSsl: router.useSsl,
      username: router.username,
      password: "********",
      proxmoxBridge: router.proxmoxBridge,
      interfaceName: router.interfaceName,
      wanInterface: router.wanInterface
    });
    setShowPassword(false);
    setShowEditModal(router);
  };

  const sslCount = routers.filter(r => r.useSsl).length;
  const bridgeCount = new Set(routers.map(r => r.proxmoxBridge)).size;
  const wanCount = routers.filter(r => !!r.wanInterface).length;

  return (
    <div className="space-y-6">
      {/* Header matching Gambar 1 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={cn("text-2xl md:text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            VPC Routers
          </h1>
          <p className={cn("text-sm font-medium mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>
            Manage Mikrotik routers for Virtual Private Clouds
          </p>
        </div>
        
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3.5 py-2 rounded-xl font-medium text-xs flex items-center gap-2">
            <span>Total Routers:</span>
            <span className="font-extrabold text-white">{routers.length}</span>
          </div>
          <button
            onClick={() => { setLoading(true); fetchRouters(); }}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border",
              isDark ? "border-slate-800 bg-[#0b1322] hover:bg-white/5 text-zinc-300 hover:text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            )}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            <span>Refresh</span>
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Router
          </button>
        </div>
      </div>

      {/* Stat Cards Grid (GAMBAR 1 Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>TOTAL ROUTERS</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <Network className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{routers.length}</span>
            <span className={cn("text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-600")}>Active Mikrotiks</span>
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>SSL ENCRYPTED</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700")}>
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{sslCount}</span>
            <span className={cn("text-xs font-medium", isDark ? "text-emerald-400" : "text-emerald-600")}>API-SSL Ports</span>
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>PROXMOX BRIDGES</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{bridgeCount}</span>
            <span className={cn("text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-600")}>Isolated Bridges</span>
          </div>
        </div>

        <div className={cn("relative overflow-hidden rounded-2xl border p-5 transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
          <div className="flex items-center justify-between mb-3">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>WAN GATEWAYS</span>
            <div className={cn("w-9 h-9 rounded-xl border flex items-center justify-center", isDark ? "bg-cyan-500/15 border-cyan-500/25 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>{wanCount}</span>
            <span className={cn("text-xs font-medium", isDark ? "text-cyan-400" : "text-cyan-600")}>Internet Egress</span>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className={cn("rounded-2xl border overflow-hidden relative z-10", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className={cn("border-b text-xs uppercase tracking-wider font-semibold", isDark ? "bg-[#060b14] text-slate-400 border-slate-800" : "bg-slate-50 text-slate-500 border-slate-200")}>
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Host</th>
                <th className="px-6 py-4 font-medium">Interface / Bridge</th>
                <th className="px-6 py-4 font-medium">API Port</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y text-sm", isDark ? "divide-slate-800/80" : "divide-slate-200")}>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <AdminLoader className="min-h-[200px]" />
                  </td>
                </tr>
              ) : routers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
                        <Network className="w-8 h-8" />
                      </div>
                      <h3 className={cn("text-lg font-bold mb-1", isDark ? "text-white" : "text-slate-900")}>No VPC Routers Found</h3>
                      <p className="text-zinc-500 text-xs max-w-sm">Add a router configuration to start provisioning VPC networks.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                routers.map((router) => (
                  <tr key={router.id} className={cn("transition-colors border-b", isDark ? "border-slate-800/80 hover:bg-white/5" : "border-slate-200 hover:bg-slate-50")}>
                    <td className="px-6 py-4">
                      <div className={cn("font-medium", isDark ? "text-white" : "text-slate-900")}>{router.name}</div>
                    </td>
                    <td className={cn("px-6 py-4 font-mono text-xs", isDark ? "text-zinc-300" : "text-slate-600")}>{router.host}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("px-2.5 py-1 rounded-md text-xs border whitespace-nowrap", isDark ? "bg-[#060b14] border-slate-800 text-white" : "bg-slate-100 border-slate-300 text-slate-700")}>
                          <span className={cn("mr-1 font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>BR:</span>{router.proxmoxBridge}
                        </span>
                        <span className={cn("px-2.5 py-1 rounded-md text-xs border whitespace-nowrap", isDark ? "bg-[#060b14] border-slate-800 text-zinc-300" : "bg-slate-100 border-slate-300 text-slate-700")}>
                          <span className={cn("mr-1 font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>TR:</span>{router.interfaceName}
                        </span>
                        <span className={cn("px-2.5 py-1 rounded-md text-xs border whitespace-nowrap", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
                          <span className={cn("mr-1 font-medium", isDark ? "text-cyan-500" : "text-cyan-700")}>WAN:</span>{router.wanInterface}
                        </span>
                      </div>
                    </td>
                    <td className={cn("px-6 py-4 font-mono text-xs", isDark ? "text-zinc-300" : "text-slate-600")}>
                      {router.apiPort} {router.useSsl ? <span className="text-emerald-400 text-xs ml-1 font-sans font-bold">(SSL)</span> : ""}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(router)}
                          className={cn("p-2 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowDeleteModal(router.id)}
                          className={cn("p-2 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}
                          title="Delete"
                        >
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

      {/* Add / Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className={cn("fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200", isDark ? "bg-black/60" : "bg-slate-900/40")}>
          <div className={cn("border rounded-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]", isDark ? "bg-[#0b1322] border-slate-800 text-white shadow-2xl" : "bg-white border-slate-200 text-slate-900 shadow-2xl")}>
            <div className={cn("p-6 border-b flex items-center justify-between shrink-0", isDark ? "border-slate-800" : "border-slate-200")}>
              <h3 className={cn("text-xl font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                <Network className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                {showEditModal ? "Edit VPC Router" : "Add VPC Router"}
              </h3>
              <button
                onClick={() => { setShowAddModal(false); setShowEditModal(null); }}
                className={cn("p-2 rounded-lg transition-colors", isDark ? "text-zinc-400 hover:bg-white/5 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900")}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
              <div className="md:col-span-2 space-y-2">
                <label className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Router Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Primary Mikrotik"
                  className={cn("w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 transition-colors", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
                />
              </div>

              <div className="space-y-2">
                <label className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Hostname / IP</label>
                <input
                  type="text"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  placeholder="e.g. 192.168.1.1"
                  className={cn("w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 transition-colors", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
                />
              </div>

              <div className="space-y-2">
                <label className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>API Port</label>
                <input
                  type="number"
                  value={formData.apiPort}
                  onChange={(e) => setFormData({ ...formData, apiPort: parseInt(e.target.value) })}
                  className={cn("w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 transition-colors", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
                />
              </div>

              <div className="md:col-span-2 space-y-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.useSsl}
                    onChange={(e) => setFormData({ ...formData, useSsl: e.target.checked })}
                    className={cn("w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500/20", isDark ? "bg-[#060b14] border-slate-800 focus:ring-offset-[#0b1322]" : "bg-white border-slate-200")}
                  />
                  <span className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-600")}>Use SSL (api-ssl)</span>
                </label>
              </div>

              <div className="space-y-2">
                <label className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className={cn("w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 transition-colors", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
                />
              </div>

              <div className="space-y-2 relative">
                <label className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={showEditModal ? "(Leave empty to keep)" : ""}
                    className={cn("w-full border rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:border-cyan-500 transition-colors [&::-ms-reveal]:hidden [&::-webkit-reveal]:hidden", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (showEditModal && formData.password === "********") {
                        toast.info("Original password is hidden by server for security.");
                        setFormData({ ...formData, password: "" });
                        setShowPassword(true);
                      } else {
                        setShowPassword(!showPassword);
                      }
                    }}
                    className={cn("absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors outline-none border-none bg-transparent", isDark ? "text-zinc-400 hover:text-white" : "text-slate-500 hover:text-slate-900")}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Mikrotik Bridge</label>
                <input
                  type="text"
                  value={formData.interfaceName}
                  onChange={(e) => setFormData({ ...formData, interfaceName: e.target.value })}
                  placeholder="e.g. bridge-vpc"
                  className={cn("w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 transition-colors", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
                />
              </div>

              <div className="space-y-2">
                <label className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Proxmox Bridge (VMs)</label>
                <input
                  type="text"
                  value={formData.proxmoxBridge}
                  onChange={(e) => setFormData({ ...formData, proxmoxBridge: e.target.value })}
                  placeholder="e.g. vmbr2"
                  className={cn("w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 transition-colors", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>WAN Interface (to Internet)</label>
                <input
                  type="text"
                  value={formData.wanInterface}
                  onChange={(e) => setFormData({ ...formData, wanInterface: e.target.value })}
                  placeholder="e.g. ether1 or pppoe-out1"
                  className={cn("w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 transition-colors", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
                />
                <p className="text-xs text-zinc-500">Used for VPC NAT Gateway (Internet Access)</p>
              </div>
            </div>

            <div className={cn("p-6 border-t flex items-center justify-end gap-3 shrink-0", isDark ? "border-slate-800" : "border-slate-200")}>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(null);
                }}
                className={cn("px-4 py-2 rounded-lg text-sm font-medium border transition-colors", isDark ? "border-slate-800 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-700 hover:bg-slate-100")}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {showEditModal ? "Update" : "Add Router"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={showDeleteModal !== null}
        onClose={() => setShowDeleteModal(null)}
        onConfirm={handleDelete}
        title="Delete VPC Router"
        description="Are you sure you want to delete this Mikrotik Router? This will not delete the VPCs from the database, but may break provisioning."
        confirmText="Delete Router"
      />
    </div>
  );
}
