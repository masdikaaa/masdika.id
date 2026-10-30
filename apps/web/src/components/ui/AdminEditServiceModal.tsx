'use client';

import { useState, useEffect } from 'react';
import { X, Server, Save, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { Select } from '@/components/ui/Select';

interface AdminEditServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  service: any;
}

export function AdminEditServiceModal({ isOpen, onClose, onSuccess, service }: AdminEditServiceModalProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (service && service.rawData) {
      const raw = service.rawData;
      const t = setTimeout(() => {
        setFormData({
          hostname: raw.hostname || '',
          username: raw.username || '',
          password: '', // Empty by default so we don't send anything unless changed
          cpuCores: raw.cpuCores || '',
          ramGb: raw.ramGb || '',
          diskGb: raw.diskGb || '',
          node: raw.node || '',
          status: raw.status || '',
          expiresAt: raw.expiresAt ? new Date(raw.expiresAt).toISOString().slice(0, 10) : '',
          terminationDate: raw.terminationDate ? new Date(raw.terminationDate).toISOString().slice(0, 10) : '',
        });
      }, 0);
      return () => clearTimeout(t);
    }
  }, [service]);

  if (!isOpen || !service) return null;

  const isVps = service.type === 'vps';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading("Saving changes...");

    try {
      // For VPS we use the specific update endpoint we just created
      let endpoint = `/api/admin/vps/services`; 
      let payload = { action: 'update', id: service.id, ...formData };
      
      // For other services we need a generic endpoint or we can skip for now since VPS is main priority
      if (!isVps) {
         endpoint = `/api/admin/services`; 
         payload = { action: 'update', id: service.id, type: service.type, ...formData };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Service updated successfully", { id: toastId });
        onSuccess();
        onClose();
      } else {
        toast.error(data.error || "Failed to update service", { id: toastId });
      }
    } catch (err) {
      toast.error("An error occurred while saving", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={cn("border rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl", isDark ? "bg-[#0b1322] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900")}>
        <div className={cn("p-5 border-b flex justify-between items-center shrink-0", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-slate-50 border-slate-200")}>
          <h3 className={cn("font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
            <Server className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-700")} />
            Edit {service.category}: {service.name}
          </h3>
          <button onClick={onClose} className={cn("transition-colors p-1.5 rounded-lg", isDark ? "text-zinc-400 hover:text-white hover:bg-slate-800" : "text-slate-500 hover:text-slate-900 hover:bg-slate-200")}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="edit-service-form" onSubmit={handleSubmit} className="space-y-5">
            {isVps && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={cn("block text-xs font-semibold mb-1.5 uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-600")}>Server Node</label>
                    <input
                      name="node"
                      value={formData.node || ''}
                      onChange={handleChange}
                      className={cn("w-full border rounded-xl p-2.5 text-sm transition-all focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder-zinc-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400")}
                    />
                  </div>
                  <div>
                    <label className={cn("block text-xs font-semibold mb-1.5 uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-600")}>Hostname</label>
                    <input
                      name="hostname"
                      value={formData.hostname || ''}
                      onChange={handleChange}
                      className={cn("w-full border rounded-xl p-2.5 text-sm transition-all focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder-zinc-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400")}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className={cn("block text-xs font-semibold mb-1.5 uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-600")}>CPU Cores</label>
                    <input
                      type="number"
                      name="cpuCores"
                      value={formData.cpuCores || ''}
                      onChange={handleChange}
                      className={cn("w-full border rounded-xl p-2.5 text-sm transition-all focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder-zinc-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400")}
                    />
                  </div>
                  <div>
                    <label className={cn("block text-xs font-semibold mb-1.5 uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-600")}>RAM (GB)</label>
                    <input
                      type="number"
                      name="ramGb"
                      value={formData.ramGb || ''}
                      onChange={handleChange}
                      className={cn("w-full border rounded-xl p-2.5 text-sm transition-all focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder-zinc-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400")}
                    />
                  </div>
                  <div>
                    <label className={cn("block text-xs font-semibold mb-1.5 uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-600")}>Disk (GB)</label>
                    <input
                      type="number"
                      name="diskGb"
                      value={formData.diskGb || ''}
                      onChange={handleChange}
                      className={cn("w-full border rounded-xl p-2.5 text-sm transition-all focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder-zinc-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400")}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={cn("block text-xs font-semibold mb-1.5 uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-600")}>Username</label>
                    <input
                      name="username"
                      value={formData.username || ''}
                      onChange={handleChange}
                      className={cn("w-full border rounded-xl p-2.5 text-sm transition-all focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder-zinc-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400")}
                    />
                  </div>
                  <div>
                    <label className={cn("block text-xs font-semibold mb-1.5 uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-600")}>New Password <span className="text-zinc-500 font-normal">(Leave blank to keep)</span></label>
                    <input
                      name="password"
                      type="text"
                      placeholder="Enter new root password"
                      value={formData.password || ''}
                      onChange={handleChange}
                      className={cn("w-full border rounded-xl p-2.5 text-sm transition-all focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder-zinc-600" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400")}
                    />
                  </div>
                </div>
              </>
            )}

            <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 border-t", isDark ? "border-slate-800" : "border-slate-200")}>
              <div>
                <label className={cn("block text-xs font-semibold mb-1.5 uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-600")}>Status</label>
                <Select
                  value={formData.status || 'ACTIVE'}
                  onChange={(val) => setFormData((prev: any) => ({ ...prev, status: val }))}
                  options={[
                    { value: "ACTIVE", label: "Active" },
                    { value: "RUNNING", label: "Running" },
                    { value: "STOPPED", label: "Stopped" },
                    { value: "SUSPENDED", label: "Suspended" },
                    { value: "TERMINATED", label: "Terminated" },
                    { value: "PENDING", label: "Pending" },
                  ]}
                  className={cn("w-full rounded-xl text-sm", isDark ? "!bg-[#060b14] !border-slate-800 !text-white" : "!bg-slate-50 !border-slate-200 !text-slate-900")}
                />
              </div>
              <div>
                <label className={cn("block text-xs font-semibold mb-1.5 uppercase tracking-wider flex items-center gap-1.5", isDark ? "text-zinc-400" : "text-slate-600")}>
                  <Calendar className="w-3.5 h-3.5" /> Next Due Date
                </label>
                <input
                  type="date"
                  name="expiresAt"
                  value={formData.expiresAt || ''}
                  onChange={handleChange}
                  className={cn("block w-full min-w-0 max-w-full box-border border rounded-xl p-2.5 text-sm transition-all focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 [appearance:none] [-webkit-appearance:none] [&::-webkit-date-and-time-value]:text-left", isDark ? "bg-[#060b14] border-slate-800 text-white [color-scheme:dark]" : "bg-slate-50 border-slate-200 text-slate-900 [color-scheme:light]")}
                />
              </div>
              <div>
                <label className={cn("block text-xs font-semibold mb-1.5 uppercase tracking-wider flex items-center gap-1.5", isDark ? "text-zinc-400" : "text-slate-600")}>
                  <Calendar className="w-3.5 h-3.5 text-orange-400" /> Termination Date
                </label>
                <input
                  type="date"
                  name="terminationDate"
                  value={formData.terminationDate || ''}
                  onChange={handleChange}
                  className={cn("block w-full min-w-0 max-w-full box-border border rounded-xl p-2.5 text-sm transition-all focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 [appearance:none] [-webkit-appearance:none] [&::-webkit-date-and-time-value]:text-left", isDark ? "bg-[#060b14] border-slate-800 text-white [color-scheme:dark]" : "bg-slate-50 border-slate-200 text-slate-900 [color-scheme:light]")}
                />
              </div>
            </div>
            
          </form>
        </div>

        <div className={cn("p-5 border-t flex justify-end gap-3 shrink-0", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-slate-50 border-slate-200")}>
          <button 
            type="button"
            onClick={onClose}
            disabled={loading}
            className={cn("px-4 py-2 text-sm font-semibold rounded-xl border transition-colors", isDark ? "bg-[#060b14] hover:bg-slate-800 text-slate-300 border-slate-800" : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200")}
          >
            Cancel
          </button>
          <button 
            type="submit"
            form="edit-service-form"
            disabled={loading}
            className="px-5 py-2 text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-4 h-4" /> Save Changes</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
