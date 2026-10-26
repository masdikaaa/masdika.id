'use client';

import { useUrlNumber } from "@/lib/useUrlTab";
import { useState, useEffect } from "react";
import { Key, Plus, Trash2, Copy, CheckCircle2, Clock, Activity, RefreshCw, KeyRound, FlaskConical, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Pagination } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";
import { toast } from "sonner";
import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

interface ApiKey {
  id: number;
  name: string | null;
  key: string;
  usageCount: number;
  createdAt: string;
  lastUsed: string | null;
  service: string | null;
  isSuspended?: boolean;
}

export default function DashboardApiKeys() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const fetchServices = async () => {
    try {
      const res = await fetch("/api/user/billing");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.subscriptions) {
          const allActiveSubs = json.data.subscriptions.filter((s: any) => s.status === 'ACTIVE');
          const uniqueApiServices = Array.from(new Set(allActiveSubs.map((s: any) => s.plan.service))) as string[];
          setServices(uniqueApiServices);
          
          if (uniqueApiServices.length > 0) {
            setSelectedService(uniqueApiServices[0] as string);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch services", err);
    }
  };

  const fetchKeys = async () => {
    try {
      const res = await fetch("/api/dashboard/keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  const [page, setPage] = useUrlNumber("page", 1);
  const itemsPerPage = 10;
  
  const [services, setServices] = useState<string[]>([]);
  const [selectedService, setSelectedService] = useState<string>("");
  const [keyToDelete, setKeyToDelete] = useState<number | null>(null);

  const [selectedKeys, setSelectedKeys] = useState<number[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  useEffect(() => {
    fetchKeys();
    fetchServices();
  }, []);



  const generateKey = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/dashboard/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: newKeyName || "My New Key",
          service: selectedService || null
        }),
      });
      if (res.ok) {
        const newKey = await res.json();
        setKeys([newKey, ...keys]);
        setNewKeyName("");
        
        const available = services.filter(s => s !== (selectedService || null) && !keys.some(k => (k.service || '').toLowerCase() === s.toLowerCase()));
        if (available.length > 0) setSelectedService(available[0]);
        else setSelectedService("");

        toast.success("API Key generated successfully");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to generate key");
      }
    } catch (err) {
      toast.error("Failed to generate key");
    } finally {
      setGenerating(false);
    }
  };

  const deleteKey = async (id: number) => {
    try {
      const res = await fetch(`/api/dashboard/keys?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setKeys(keys.filter((k) => k.id !== id));
        toast.success("API Key deleted");
      } else {
        toast.error("Failed to delete key");
      }
    } catch (err) {
      toast.error("Failed to delete key");
    } finally {
      setKeyToDelete(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    toast.success("API Key copied to clipboard");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center">
        <RefreshCw className="w-10 h-10 text-cyan-500 animate-spin" />
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(keys.length / itemsPerPage));
  const paginatedKeys = keys.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedKeys(paginatedKeys.map(k => k.id));
    } else {
      setSelectedKeys([]);
    }
  };

  const handleSelect = (id: number) => {
    setSelectedKeys(prev => prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]);
  };

  const bulkDeleteKeys = async () => {
    setIsBulkDeleting(true);
    try {
      const promises = selectedKeys.map(id => 
        fetch(`/api/dashboard/keys?id=${id}`, { method: "DELETE" })
      );
      const results = await Promise.all(promises);
      
      const successCount = results.filter(r => r.ok).length;
      if (successCount === selectedKeys.length) {
        toast.success(`Successfully deleted ${successCount} keys`);
      } else {
        toast.error(`Deleted ${successCount} keys, failed ${selectedKeys.length - successCount}`);
      }
      
      setKeys(keys.filter(k => !selectedKeys.includes(k.id)));
      setSelectedKeys([]);
    } catch (err) {
      toast.error("Failed to delete keys");
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteModal(false);
    }
  };

  return (
    <motion.div className="space-y-8 pb-10" variants={containerVariants} initial="hidden" animate="visible">
      {/* Hero Header */}
      <motion.div variants={itemVariants} className={cn("relative overflow-hidden rounded-3xl  border p-6 md:p-8 group", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-black/5 shadow-sm")}>
        
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold mb-4 tracking-wide", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-slate-100 border-slate-200 text-cyan-700")}>
              <KeyRound className="w-3 h-3" /> Security & Access
            </div>
            <h1 className={cn("text-3xl md:text-4xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              API <span className={cn(isDark ? "text-cyan-400" : "text-cyan-600")}>Keys</span>
            </h1>
            <p className={cn("text-sm max-w-md", isDark ? "text-zinc-400" : "text-slate-600")}>Manage your API access tokens and service permissions to connect securely to Masdika endpoints.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/api-lab" className={cn("border px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 shrink-0", isDark ? "bg-white/5 hover:bg-white/10 border-white/10 text-white" : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800")}>
              <FlaskConical className="w-4 h-4 text-cyan-500" />
              API Lab
            </Link>
            <Link href="/dashboard/api-stats" className="px-5 py-2.5 rounded-lg text-slate-950 font-semibold text-sm transition-all inline-flex items-center justify-center gap-2 shrink-0 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 shadow-sm">
              <Activity className="w-4 h-4" />
              View API Stats
            </Link>
          </div>
        </div>
      </motion.div>

      {services.length === 0 ? (
        <motion.div variants={itemVariants}>
          <div className={cn(" border rounded-3xl p-12 text-center mt-8", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-slate-50 border-black/5")}>
            <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 transform -rotate-6", isDark ? "bg-white/5" : "bg-white shadow-sm border border-slate-200")}>
              <Key className={cn("w-10 h-10 transform rotate-6", isDark ? "text-zinc-500" : "text-slate-500")} />
            </div>
            <h4 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No Active API Service</h4>
            <p className={cn("text-sm max-w-md mx-auto mb-8 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>
              You need an active subscription to any API service (like File CDN or URL Shortener) to generate and manage API keys.
            </p>
            <Link href="/dashboard/checkout" className="inline-flex items-center justify-center bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 font-semibold py-2.5 px-5 rounded-lg text-sm transition-all shadow-sm">
              View Plans
            </Link>
          </div>
        </motion.div>
      ) : (
        <motion.div className="w-full space-y-8" variants={itemVariants}>
        {/* Generate Key Section */}
        <div className={cn(" border rounded-3xl p-6 md:p-8 relative group", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-black/5 shadow-sm")}>
          <div className={cn("absolute inset-0 rounded-3xl bg-gradient-to-b pointer-events-none", isDark ? "from-transparent to-transparent" : "from-slate-50/50 to-transparent")} />
          
          <div className="relative z-10 flex flex-col md:flex-row gap-6 lg:gap-10">
            <div className="flex-1">
              <h2 className={cn("text-xl font-bold mb-2 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                Create New API Key
              </h2>
              <p className={cn("text-sm mb-6 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>
                Generate a new API key to access Masdika's public REST APIs. Keep your keys secure and do not share them publicly. 
                <strong className="text-cyan-400 font-semibold block mt-1">One API key per service.</strong>
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="text" 
                  placeholder="Key Alias (e.g. Production Key)" 
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className={cn("flex-1 border rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 transition-all shadow-inner", isDark ? "bg-[#060b14] border-slate-800 text-white focus:border-cyan-500 focus:ring-cyan-500/20" : "bg-slate-50 border-slate-200 text-slate-800 focus:border-cyan-400 focus:ring-cyan-400/20")}
                />
                <div className="w-full sm:w-fit sm:min-w-[220px] shrink-0 relative z-50">
                  <Select
                    value={selectedService}
                    onChange={(val) => setSelectedService(val)}
                    options={services.length === 0 ? [{ value: "", label: "No Available Services", disabled: true }] : services.map(s => {
                      const hasKey = keys.some(k => (k.service || '').toLowerCase() === s.toLowerCase());
                      return {
                        value: s,
                        label: `${s.replace('_', ' ')} ${hasKey ? '(Key Created)' : ''}`,
                        disabled: hasKey
                      };
                    })}
                    placeholder="Select Service"
                    className="py-3.5 px-5 rounded-2xl shadow-inner min-w-[220px]"
                  />
                </div>
                <button 
                  onClick={generateKey}
                  disabled={generating || keys.some(k => (k.service || '').toLowerCase() === selectedService.toLowerCase())}
                  className="px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 whitespace-nowrap transition-all bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 disabled:opacity-50 disabled:pointer-events-none shadow-sm"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Generate Key
                </button>
              </div>
            </div>
            
            <div className="hidden lg:flex shrink-0 items-center justify-center w-32">
               <div className="w-24 h-24 bg-cyan-500/10 rounded-3xl border border-cyan-500/20 flex items-center justify-center transform rotate-12 group-hover:rotate-6 transition-all duration-500">
                 <Key className="w-10 h-10 text-cyan-400" />
               </div>
            </div>
          </div>
        </div>

        {/* Keys List */}
        <div>
          <h3 className={cn("text-xl font-bold mb-6 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
            <Activity className="w-5 h-5 text-cyan-500" /> Active Keys
          </h3>
          {keys.length === 0 ? (
            <div className={cn("border rounded-3xl p-12 text-center ", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-slate-50 border-black/5")}>
              <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 transform -rotate-6", isDark ? "bg-white/5" : "bg-white border border-slate-200 shadow-sm")}>
                <Key className={cn("w-10 h-10 transform rotate-6", isDark ? "text-zinc-500" : "text-slate-500")} />
              </div>
              <h4 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No API Keys Found</h4>
              <p className={cn("text-sm max-w-sm mx-auto leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>
                You haven't generated any API keys yet. Create one above to start using Masdika API Hub securely.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 px-2 gap-4">
                <label className="flex items-center gap-3 cursor-pointer group w-fit">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="checkbox"
                      className="peer appearance-none w-5 h-5 border-2 border-zinc-400 dark:border-zinc-600 rounded-md checked:bg-cyan-500 checked:border-cyan-500 transition-colors cursor-pointer"
                      checked={paginatedKeys.length > 0 && selectedKeys.length === paginatedKeys.length}
                      onChange={handleSelectAll}
                    />
                    <CheckCircle2 className={cn("w-3.5 h-3.5 absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity", isDark ? "text-white" : "text-slate-900")} />
                  </div>
                  <span className={cn("text-sm font-semibold transition-colors", isDark ? "text-zinc-400 group-hover:text-white" : "text-slate-500 group-hover:text-slate-800")}>Select All (Page)</span>
                </label>

                {selectedKeys.length > 0 && (
                  <button
                    onClick={() => setShowBulkDeleteModal(true)}
                    disabled={isBulkDeleting}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 border border-red-500/20 w-fit"
                  >
                    {isBulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Delete Selected ({selectedKeys.length})
                  </button>
                )}
              </div>

              {paginatedKeys.map((key, i) => (
                <motion.div
                  key={key.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.07 }}
                  className={cn(
                    " border rounded-3xl p-5 md:p-6 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 group relative overflow-hidden",
                    selectedKeys.includes(key.id) 
                      ? (isDark ? "bg-[#0b162c] border-cyan-500 shadow-md ring-1 ring-cyan-500/30" : "bg-white border-cyan-600 shadow-md ring-2 ring-cyan-600/20")
                      : (isDark ? "bg-[#0b1322] border-slate-800/80 hover:border-slate-700 shadow-md" : "bg-white border-slate-200/90 hover:border-slate-300 shadow-sm")
                  )}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/0 to-cyan-500/0 group-hover:to-cyan-500/[0.03] transition-colors pointer-events-none" />
                  
                  <label className="hidden sm:flex items-center self-start lg:self-center mr-2 cursor-pointer relative z-10 group/checkbox shrink-0">
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="checkbox"
                        className={cn("peer appearance-none w-5 h-5 border-2 rounded-md checked:bg-cyan-500 checked:border-cyan-500 transition-colors cursor-pointer", isDark ? "border-zinc-600/70 group-hover/checkbox:border-zinc-400" : "border-slate-300 group-hover/checkbox:border-slate-500")}
                        checked={selectedKeys.includes(key.id)}
                        onChange={() => handleSelect(key.id)}
                      />
                      <CheckCircle2 className={cn("w-3.5 h-3.5 absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity", isDark ? "text-white" : "text-slate-900")} />
                    </div>
                  </label>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      {/* Mobile checkbox inline with title */}
                      <label className="sm:hidden flex items-center cursor-pointer relative z-10 group/checkbox">
                        <div className="relative flex items-center justify-center">
                          <input 
                            type="checkbox"
                            className={cn("peer appearance-none w-5 h-5 border-2 rounded-md checked:bg-cyan-500 checked:border-cyan-500 transition-colors cursor-pointer", isDark ? "border-zinc-600/70" : "border-slate-300")}
                            checked={selectedKeys.includes(key.id)}
                            onChange={() => handleSelect(key.id)}
                          />
                          <CheckCircle2 className={cn("w-3.5 h-3.5 absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity", isDark ? "text-white" : "text-slate-900")} />
                        </div>
                      </label>
                      <span className={cn("font-bold text-lg truncate max-w-[200px] md:max-w-xs", isDark ? "text-white" : "text-slate-900")}>{key.name || "Default Key"}</span>
                      {key.service ? (
                        <span className={cn("text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider", isDark ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-sm" : "bg-slate-100 border border-slate-200 text-cyan-700")}>
                          {key.service.split('_').join(' ')}
                        </span>
                      ) : (
                        <span className={cn("text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider", isDark ? "bg-zinc-500/10 border border-zinc-500/20 text-zinc-400" : "bg-slate-100 border border-slate-200 text-slate-500")}>
                          Unknown
                        </span>
                      )}
                      {key.isSuspended && (
                        <span className={cn("text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider", isDark ? "bg-red-500/10 border border-red-500/20 text-red-400 shadow-sm" : "bg-red-50 border border-red-200 text-red-600")}>
                          Suspended
                        </span>
                      )}
                    </div>
                    
                    <div className={cn("flex items-center gap-3 p-2 rounded-xl border w-full sm:w-fit shadow-sm", isDark ? "bg-[#011627] border-white/5" : "bg-slate-50 border-slate-200")}>
                      <code className={cn("text-xs sm:text-sm font-mono select-all tracking-widest px-3 break-all overflow-hidden line-clamp-1", isDark ? "text-cyan-300" : "text-cyan-700")}>
                        {key.key}
                      </code>
                      <button 
                        onClick={() => copyToClipboard(key.key)}
                        disabled={key.isSuspended}
                        className={cn("p-2 rounded-lg transition-colors shrink-0 disabled:opacity-50", isDark ? "bg-white/5 hover:bg-cyan-500/20 text-zinc-400 hover:text-cyan-400" : "bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-900")}
                        title={key.isSuspended ? "Key is suspended" : "Copy Key"}
                      >
                        {copiedKey === key.key ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
  
                  <div className={cn("flex flex-wrap items-center gap-6 lg:gap-10 border-t lg:border-t-0 pt-4 lg:pt-0 w-full lg:w-auto", isDark ? "border-white/5" : "border-slate-200")}>
                    <div className="flex flex-col gap-1.5 flex-1 lg:flex-none">
                      <span className={cn("text-[10px] uppercase tracking-widest font-bold flex items-center gap-1.5", isDark ? "text-zinc-500" : "text-slate-400")}>
                        <Activity className="w-3.5 h-3.5 text-blue-500" /> Usage
                      </span>
                      <span className={cn("text-sm font-black", isDark ? "text-white" : "text-slate-800")}>{key.usageCount.toLocaleString()} <span className={cn("text-xs font-normal", isDark ? "text-zinc-500" : "text-slate-400")}>requests</span></span>
                    </div>
                    
                    <div className="flex flex-col gap-1.5 flex-1 lg:flex-none">
                      <span className={cn("text-[10px] uppercase tracking-widest font-bold flex items-center gap-1.5", isDark ? "text-zinc-500" : "text-slate-400")}>
                        <Clock className="w-3.5 h-3.5 text-cyan-500" /> Created
                      </span>
                      <span className={cn("text-sm font-bold", isDark ? "text-zinc-300" : "text-slate-600")}>
                        {new Date(key.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
  
                    <button 
                      onClick={() => setKeyToDelete(key.id)}
                      disabled={key.isSuspended}
                      className={cn("p-2.5 rounded-lg transition-all ml-auto lg:ml-4 group/btn disabled:opacity-50", isDark ? "bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white" : "bg-red-50 hover:bg-red-500 border border-red-200 hover:border-red-500 text-red-500 hover:text-white")}
                      title={key.isSuspended ? "Key is suspended" : "Revoke Key"}
                    >
                      <Trash2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          
          {!loading && totalPages > 1 && (
            <div className={cn("mt-8 pt-6 border-t", isDark ? "border-white/5" : "border-slate-200")}>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      </motion.div>
      )}

      {/* Custom Delete Modal */}
      <ConfirmModal
        isOpen={keyToDelete !== null}
        onClose={() => setKeyToDelete(null)}
        onConfirm={() => keyToDelete && deleteKey(keyToDelete)}
        title="Delete API Key?"
        description="Are you sure you want to revoke this API Key? Any application currently using it will immediately lose access and requests will fail. This cannot be undone."
        confirmText="Revoke Key"
        variant="danger"
      />

      <ConfirmModal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={bulkDeleteKeys}
        title={`Delete ${selectedKeys.length} API Keys?`}
        description="Are you sure you want to revoke all selected API Keys? Any applications currently using them will immediately lose access and requests will fail. This cannot be undone."
        confirmText={`Revoke ${selectedKeys.length} Keys`}
        variant="danger"
      />
    </motion.div>
  );
}