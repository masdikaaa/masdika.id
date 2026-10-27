"use client";
import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";
import { X, Server, Save, RefreshCw } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { Select } from "@/components/ui/Select";
import { toast } from "sonner";

interface ImportVpsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportVpsModal({ isOpen, onClose, onSuccess }: ImportVpsModalProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error("Failed to fetch users", e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  const [formData, setFormData] = useState({
    userId: "",
    node: "p-net",
    vmid: "",
    hostname: "",
    osTemplate: "ubuntu-22.04",
    cpuCores: 2,
    ramGb: 4,
    diskGb: 50,
    diskType: "SSD",
    networkGbps: 1,
    ipAddress: "",
    billingCycle: "PAYG"
  });

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        userId: Number(formData.userId),
        vmid: Number(formData.vmid),
        cpuCores: Number(formData.cpuCores),
        ramGb: Number(formData.ramGb),
        diskGb: Number(formData.diskGb),
        networkGbps: Number(formData.networkGbps)
      };

      const res = await fetch("/api/admin/vps/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        toast.error(data.error || "Gagal mengimport VPS");
      }
    } catch (error: any) {
      toast.error("Terjadi kesalahan sistem saat menghubungi server.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={cn("border rounded-2xl w-full max-w-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] shadow-2xl", isDark ? "bg-[#0b1322] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900")}>
        <div className={cn("flex items-center justify-between p-6 border-b shrink-0", isDark ? "border-slate-800" : "border-slate-200")}>
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center", isDark ? "text-cyan-400" : "text-cyan-700")}>
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className={cn("text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>Import Existing VPS</h2>
              <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Assign an existing Proxmox VM to a client.</p>
            </div>
          </div>
          <button onClick={onClose} className={cn("p-2 rounded-xl transition-colors", isDark ? "text-zinc-400 hover:bg-white/5 hover:text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900")}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="import-vps-form" onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={cn("block text-sm font-medium mb-2", isDark ? "text-zinc-300" : "text-slate-600")}>Select User (Client)</label>
                {loadingUsers ? (
                  <div className={cn("h-[48px] animate-pulse rounded-xl", isDark ? "bg-[#060b14]" : "bg-slate-100")} />
                ) : (
                  <Select
                    value={formData.userId}
                    onChange={(val) => setFormData({ ...formData, userId: val })}
                    options={[
                      { value: "", label: "-- Choose User --" },
                      ...users.map(u => ({ value: u.id, label: `${u.name} (${u.email})` }))
                    ]}
                    placeholder="-- Choose User --"
                    className={cn("w-full rounded-xl px-4 py-3 text-sm", isDark ? "bg-[#060b14] border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900")}
                  />
                )}
              </div>
              
              <div>
                <label className={cn("block text-sm font-medium mb-2", isDark ? "text-zinc-300" : "text-slate-600")}>Hostname</label>
                <input
                  type="text"
                  required
                  value={formData.hostname}
                  onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                  placeholder="server.example.com"
                  className={cn("w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
                />
              </div>

              <div>
                <label className={cn("block text-sm font-medium mb-2", isDark ? "text-zinc-300" : "text-slate-600")}>Proxmox Node</label>
                <input
                  type="text"
                  required
                  value={formData.node}
                  onChange={(e) => setFormData({ ...formData, node: e.target.value })}
                  className={cn("w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
                />
              </div>

              <div>
                <label className={cn("block text-sm font-medium mb-2", isDark ? "text-zinc-300" : "text-slate-600")}>Proxmox VMID</label>
                <input
                  type="number"
                  required
                  value={formData.vmid}
                  onChange={(e) => setFormData({ ...formData, vmid: e.target.value })}
                  placeholder="e.g. 104"
                  className={cn("w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
                />
              </div>

              <div>
                <label className={cn("block text-sm font-medium mb-2", isDark ? "text-zinc-300" : "text-slate-600")}>OS Template</label>
                <input
                  type="text"
                  required
                  value={formData.osTemplate}
                  onChange={(e) => setFormData({ ...formData, osTemplate: e.target.value })}
                  className={cn("w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
                />
              </div>

              <div>
                <label className={cn("block text-sm font-medium mb-2", isDark ? "text-zinc-300" : "text-slate-600")}>IP Address (Optional)</label>
                <input
                  type="text"
                  value={formData.ipAddress}
                  onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                  placeholder="e.g. 103.x.x.x"
                  className={cn("w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
                />
              </div>

              <div>
                <label className={cn("block text-sm font-medium mb-2", isDark ? "text-zinc-300" : "text-slate-600")}>Billing Cycle</label>
                <Select
                  value={formData.billingCycle}
                  onChange={(val) => setFormData({ ...formData, billingCycle: val })}
                  options={[
                    { value: "PAYG", label: "Pay As You Go (Hourly)" },
                    { value: "MONTHLY", label: "Monthly (Fixed)" },
                    { value: "ANNUALLY", label: "Annually (Fixed)" }
                  ]}
                  placeholder="Select Billing Cycle..."
                  className={cn("w-full rounded-xl px-4 py-3 text-sm", isDark ? "bg-[#060b14] border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900")}
                />
              </div>
            </div>

            <div className={cn("border-t pt-5 mt-5", isDark ? "border-slate-800" : "border-slate-200")}>
              <h3 className={cn("text-sm font-bold mb-4", isDark ? "text-white" : "text-slate-900")}>Hardware Specs</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className={cn("block text-xs font-medium mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>CPU Cores</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.cpuCores}
                    onChange={(e) => setFormData({ ...formData, cpuCores: Number(e.target.value) })}
                    className={cn("w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#060b14] border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900")}
                  />
                </div>
                <div>
                  <label className={cn("block text-xs font-medium mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>RAM (GB)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.ramGb}
                    onChange={(e) => setFormData({ ...formData, ramGb: Number(e.target.value) })}
                    className={cn("w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#060b14] border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900")}
                  />
                </div>
                <div>
                  <label className={cn("block text-xs font-medium mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>Disk (GB)</label>
                  <input
                    type="number"
                    min="10"
                    required
                    value={formData.diskGb}
                    onChange={(e) => setFormData({ ...formData, diskGb: Number(e.target.value) })}
                    className={cn("w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#060b14] border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900")}
                  />
                </div>
                <div>
                  <label className={cn("block text-xs font-medium mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>Disk Type</label>
                  <Select
                    value={formData.diskType}
                    onChange={(val) => setFormData({ ...formData, diskType: val })}
                    options={[
                      { value: "SSD", label: "SSD SATA" },
                      { value: "HDD", label: "HDD" }
                    ]}
                    placeholder="Disk Type"
                    className={cn("w-full rounded-xl px-3 py-2 text-xs", isDark ? "bg-[#060b14] border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900")}
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className={cn("p-6 border-t shrink-0 flex justify-end gap-3 rounded-b-2xl", isDark ? "border-slate-800" : "border-slate-200")}>
          <button
            type="button"
            onClick={onClose}
            className={cn("px-5 py-2.5 rounded-xl transition-colors border", isDark ? "border-slate-800 text-zinc-300 hover:bg-white/5" : "border-slate-200 text-slate-700 hover:bg-slate-100")}
          >
            Cancel
          </button>
          <button
            form="import-vps-form"
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 px-6 py-2.5 rounded-xl font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {loading ? "Importing..." : "Import VPS"}
          </button>
        </div>
      </div>
    </div>
  );
}
