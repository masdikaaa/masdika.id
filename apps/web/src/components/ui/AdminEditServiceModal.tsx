'use client';

import { useState, useEffect } from 'react';
import { X, Server, Save, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface AdminEditServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  service: any;
}

export function AdminEditServiceModal({ isOpen, onClose, onSuccess, service }: AdminEditServiceModalProps) {
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
      // But we'll add it just in case
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
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-black/20 shrink-0">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-cyan-400" />
            Edit {service.category}: {service.name}
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="edit-service-form" onSubmit={handleSubmit} className="space-y-5">
            {isVps && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Server Node</label>
                    <input
                      name="node"
                      value={formData.node || ''}
                      onChange={handleChange}
                      className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Hostname</label>
                    <input
                      name="hostname"
                      value={formData.hostname || ''}
                      onChange={handleChange}
                      className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">CPU Cores</label>
                    <input
                      type="number"
                      name="cpuCores"
                      value={formData.cpuCores || ''}
                      onChange={handleChange}
                      className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">RAM (GB)</label>
                    <input
                      type="number"
                      name="ramGb"
                      value={formData.ramGb || ''}
                      onChange={handleChange}
                      className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Disk (GB)</label>
                    <input
                      type="number"
                      name="diskGb"
                      value={formData.diskGb || ''}
                      onChange={handleChange}
                      className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Username</label>
                    <input
                      name="username"
                      value={formData.username || ''}
                      onChange={handleChange}
                      className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">New Password <span className="text-zinc-600">(Leave blank to keep)</span></label>
                    <input
                      name="password"
                      type="text"
                      placeholder="Enter new root password"
                      value={formData.password || ''}
                      onChange={handleChange}
                      className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 border-t border-white/5">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Status</label>
                <select
                  name="status"
                  value={formData.status || ''}
                  onChange={handleChange}
                  className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all appearance-none"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="RUNNING">Running</option>
                  <option value="STOPPED">Stopped</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="TERMINATED">Terminated</option>
                  <option value="PENDING">Pending</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Next Due Date
                </label>
                <input
                  type="date"
                  name="expiresAt"
                  value={formData.expiresAt || ''}
                  onChange={handleChange}
                  className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-orange-400" /> Termination Date
                </label>
                <input
                  type="date"
                  name="terminationDate"
                  value={formData.terminationDate || ''}
                  onChange={handleChange}
                  className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                />
              </div>
            </div>
            
          </form>
        </div>

        <div className="p-5 border-t border-white/10 flex justify-end gap-3 bg-black/20 shrink-0">
          <button 
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit"
            form="edit-service-form"
            disabled={loading}
            className="px-5 py-2.5 text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
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
