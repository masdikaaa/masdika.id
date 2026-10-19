"use client";
import { useUrlNumber, useUrlString, useUrlTab } from "@/lib/useUrlTab";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Globe, Trash2, Search, RefreshCw, Server, CheckCircle, Shield, Network } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import Link from "next/link";
import { toast } from "sonner";
import { Pagination } from "@/components/ui/Pagination";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export default function AdminCloudflaredPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [data, setData] = useState<{ tunnels: any[], domains: any[] }>({ tunnels: [], domains: [] });
  const [loading, setLoading] = useState(true);
  
  const [deleteTunnelId, setDeleteTunnelId] = useState<number | null>(null);
  const [isDeletingTunnel, setIsDeletingTunnel] = useState(false);
  
  const [deleteDomainId, setDeleteDomainId] = useState<number | null>(null);
  const [isDeletingDomain, setIsDeletingDomain] = useState(false);

  const [activeTab, setActiveTab] = useUrlTab<'domains' | 'tunnels'>('domains', { allowed: ['domains', 'tunnels'] as const });
  const [searchQuery, setSearchQuery] = useUrlString<string>("searchQuery", "");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/cloudflared");
      if (res.ok) {
        const json = await res.json();
        setData({ tunnels: json.tunnels || [], domains: json.domains || [] });
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load cloudflared data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteTunnelConfirm = async () => {
    if (!deleteTunnelId) return;
    setIsDeletingTunnel(true);
    const toastId = toast.loading("Deleting tunnel...");
    try {
      const res = await fetch(`/api/admin/cloudflared/tunnels/${deleteTunnelId}`, { method: "DELETE" });
      const resData = await res.json();
      if (res.ok && resData.success) {
        toast.success("Tunnel deleted successfully", { id: toastId });
        fetchData();
      } else {
        toast.error(resData.error || "Failed to delete tunnel", { id: toastId });
      }
    } catch (err) {
      toast.error("Error deleting tunnel", { id: toastId });
    } finally {
      setIsDeletingTunnel(false);
      setDeleteTunnelId(null);
    }
  };

  const handleDeleteDomainConfirm = async () => {
    if (!deleteDomainId) return;
    setIsDeletingDomain(true);
    const toastId = toast.loading("Deleting domain...");
    try {
      const res = await fetch(`/api/admin/cloudflared/domains/${deleteDomainId}`, { method: "DELETE" });
      const resData = await res.json();
      if (res.ok && resData.success) {
        toast.success("Domain deleted successfully", { id: toastId });
        fetchData();
      } else {
        toast.error(resData.error || "Failed to delete domain", { id: toastId });
      }
    } catch (err) {
      toast.error("Error deleting domain", { id: toastId });
    } finally {
      setIsDeletingDomain(false);
      setDeleteDomainId(null);
    }
  };

  // Filtering
  const filteredDomains = data.domains.filter((d) => 
    (d.domain && d.domain.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (d.user?.name && d.user.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (d.user?.email && d.user.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredTunnels = data.tunnels.filter((t) => 
    (t.name && t.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (t.user?.name && t.user.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (t.user?.email && t.user.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Pagination for Domains
  const [currentDomainPage, setCurrentDomainPage] = useUrlNumber("currentDomainPage", 1);
  const itemsPerPage = 10;
  const totalDomainPages = Math.ceil(filteredDomains.length / itemsPerPage);
  const paginatedDomains = filteredDomains.slice((currentDomainPage - 1) * itemsPerPage, currentDomainPage * itemsPerPage);

  // Pagination for Tunnels
  const [currentTunnelPage, setCurrentTunnelPage] = useUrlNumber("currentTunnelPage", 1);
  const totalTunnelPages = Math.ceil(filteredTunnels.length / itemsPerPage);
  const paginatedTunnels = filteredTunnels.slice((currentTunnelPage - 1) * itemsPerPage, currentTunnelPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row md:items-end justify-between gap-6 mb-6">
        <div>
          <h1 className={cn("text-3xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Cloudflared Tunnels</h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Manage all domains and tunnels created by users.</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200 dark:border-white/10 mb-6">
        <button
          onClick={() => setActiveTab('domains')}
          className={cn(
            "pb-3 text-sm font-semibold transition-colors relative",
            activeTab === 'domains' 
              ? (isDark ? "text-cyan-400" : "text-cyan-600") 
              : (isDark ? "text-zinc-500 hover:text-zinc-300" : "text-slate-500 hover:text-slate-700")
          )}
        >
          <span className="flex items-center gap-2"><Globe className="w-4 h-4" /> Domains ({data.domains.length})</span>
          {activeTab === 'domains' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500 rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('tunnels')}
          className={cn(
            "pb-3 text-sm font-semibold transition-colors relative",
            activeTab === 'tunnels' 
              ? (isDark ? "text-cyan-400" : "text-cyan-600") 
              : (isDark ? "text-zinc-500 hover:text-zinc-300" : "text-slate-500 hover:text-slate-700")
          )}
        >
          <span className="flex items-center gap-2"><Server className="w-4 h-4" /> Tunnels ({data.tunnels.length})</span>
          {activeTab === 'tunnels' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500 rounded-t-full" />
          )}
        </button>
      </div>

      <div className={cn("rounded-2xl border overflow-hidden relative z-10", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
        <div className={cn("p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto flex-1">
            <h2 className={cn("text-lg font-semibold shrink-0", isDark ? "text-white" : "text-slate-900")}>
              {activeTab === 'domains' ? 'All Domains' : 'All Tunnels'}
            </h2>
            <div className="w-full sm:max-w-xs relative">
              <Search className={cn("w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2", isDark ? "text-zinc-500" : "text-slate-400")} />
              <input
                type="text"
                placeholder={activeTab === 'domains' ? "Search domains or users..." : "Search tunnels or users..."}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeTab === 'domains') setCurrentDomainPage(1);
                  else setCurrentTunnelPage(1);
                }}
                className={cn("w-full border rounded-xl pl-10 pr-4 py-2 text-sm placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400")}
              />
            </div>
          </div>
          <button 
            onClick={fetchData} 
            className={cn("p-2 rounded-xl border hover:bg-white/5 transition-colors", isDark ? "text-zinc-400 border-white/5" : "text-slate-500 border-slate-200")}
            title="Refresh Data"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>

        {activeTab === 'domains' && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className={cn("border-b text-xs uppercase tracking-wider text-zinc-500 font-semibold", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200")}>
                    <th className="p-4 whitespace-nowrap">Domain</th>
                    <th className="p-4 whitespace-nowrap">Owner</th>
                    <th className="p-4 whitespace-nowrap">Zone ID</th>
                    <th className="p-4 text-center whitespace-nowrap">Status</th>
                    <th className="p-4 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className={cn("divide-y", isDark ? "divide-white/5" : "divide-slate-200")}>
                  {loading ? (
                    <tr><td colSpan={5} className={cn("p-8 text-center", isDark ? "text-zinc-500" : "text-slate-500")}>
                      <div className="flex flex-col items-center justify-center gap-3">
                        <RefreshCw className={cn("w-10 h-10 animate-spin", isDark ? "text-cyan-500" : "text-cyan-700")} />
                        <p>Loading domains...</p>
                      </div>
                    </td></tr>
                  ) : filteredDomains.length === 0 ? (
                    <tr><td colSpan={5} className="p-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className={cn("w-20 h-20 rounded-full flex items-center justify-center mb-4", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                          <Globe className={cn("w-10 h-10 opacity-50", isDark ? "text-cyan-400" : "text-cyan-700")} />
                        </div>
                        <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No Domains Found</h3>
                        <p className={cn(isDark ? "text-zinc-500" : "text-slate-500")}>There are no domains matching your criteria.</p>
                      </div>
                    </td></tr>
                  ) : (
                    paginatedDomains.map((d) => (
                      <tr key={d.id} className="hover:bg-white/[0.01] transition-colors group">
                        <td className="p-4 whitespace-nowrap">
                          <div className={cn("font-semibold", isDark ? "text-white" : "text-slate-900")}>
                            {d.domain}
                          </div>
                          <p className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>
                            Added {new Date(d.createdAt).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          {d.user ? (
                            <Link href={`/admin/customers/${d.userId}`} className="flex items-center gap-2 hover:opacity-80">
                              <div className={cn("w-8 h-8 rounded-full overflow-hidden border shrink-0 flex items-center justify-center text-xs font-bold", isDark ? "border-white/10 bg-white/10 text-white" : "border-slate-200 bg-slate-200 text-slate-800")}>
                                <img referrerPolicy="no-referrer" src={d.user.image || `/api/avatar?email=${encodeURIComponent(d.user.email || '')}&name=${encodeURIComponent(d.user.name || 'User')}`} alt={d.user.name || "User"} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                              </div>
                              <div className="min-w-0">
                                <p className={cn("text-sm font-semibold truncate", isDark ? "text-white" : "text-slate-900")}>{d.user.name || "Unknown"}</p>
                                <p className={cn("text-xs truncate", isDark ? "text-zinc-400" : "text-slate-500")}>{d.user.email}</p>
                              </div>
                            </Link>
                          ) : (
                            <span className="text-sm text-red-500">Orphaned</span>
                          )}
                        </td>
                        <td className={cn("p-4 font-mono text-xs whitespace-nowrap", isDark ? "text-zinc-500" : "text-slate-500")}>
                          {d.cfZoneId}
                        </td>
                        <td className="p-4 text-center">
                          {d.status === 'ACTIVE' || d.status === 'active' ? (
                            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/20", isDark ? "text-emerald-400" : "text-emerald-700")}>
                              <CheckCircle className="w-3.5 h-3.5" /> Active
                            </span>
                          ) : (
                            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-500/10 border border-zinc-500/20", isDark ? "text-zinc-400" : "text-zinc-700")}>
                              {d.status}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                           <button 
                             onClick={() => setDeleteDomainId(d.id)} 
                             className={cn("p-2 bg-red-500/10 hover:bg-red-500/20 hover:text-red-300 rounded-lg transition-colors", isDark ? "text-red-400" : "text-red-700")} 
                             title="Delete Domain"
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
            <div className={cn("p-4 border-t", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}>
              <Pagination currentPage={currentDomainPage} totalPages={totalDomainPages} onPageChange={setCurrentDomainPage} />
            </div>
          </>
        )}

        {activeTab === 'tunnels' && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className={cn("border-b text-xs uppercase tracking-wider text-zinc-500 font-semibold", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200")}>
                    <th className="p-4 whitespace-nowrap">Tunnel Name</th>
                    <th className="p-4 whitespace-nowrap">Owner</th>
                    <th className="p-4 whitespace-nowrap">Status</th>
                    <th className="p-4 whitespace-nowrap text-center">Connector</th>
                    <th className="p-4 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className={cn("divide-y", isDark ? "divide-white/5" : "divide-slate-200")}>
                  {loading ? (
                    <tr><td colSpan={5} className={cn("p-8 text-center", isDark ? "text-zinc-500" : "text-slate-500")}>
                      <div className="flex flex-col items-center justify-center gap-3">
                        <RefreshCw className={cn("w-10 h-10 animate-spin", isDark ? "text-cyan-500" : "text-cyan-700")} />
                        <p>Loading tunnels...</p>
                      </div>
                    </td></tr>
                  ) : filteredTunnels.length === 0 ? (
                    <tr><td colSpan={5} className="p-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className={cn("w-20 h-20 rounded-full flex items-center justify-center mb-4", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                          <Server className={cn("w-10 h-10 opacity-50", isDark ? "text-cyan-400" : "text-cyan-700")} />
                        </div>
                        <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No Tunnels Found</h3>
                        <p className={cn(isDark ? "text-zinc-500" : "text-slate-500")}>There are no tunnels matching your criteria.</p>
                      </div>
                    </td></tr>
                  ) : (
                    paginatedTunnels.map((t) => (
                      <tr key={t.id} className="hover:bg-white/[0.01] transition-colors group">
                        <td className="p-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 shrink-0 bg-cyan-500/10 rounded-xl flex items-center justify-center">
                              <Network className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div>
                              <span className={cn("font-bold block", isDark ? "text-white" : "text-slate-900")}>{t.name}</span>
                              <p className={cn("text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>
                                Created {new Date(t.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          {t.user ? (
                            <Link href={`/admin/customers/${t.userId}`} className="flex items-center gap-2 hover:opacity-80">
                              <div className={cn("w-8 h-8 rounded-full overflow-hidden border shrink-0 flex items-center justify-center text-xs font-bold", isDark ? "border-white/10 bg-white/10 text-white" : "border-slate-200 bg-slate-200 text-slate-800")}>
                                <img referrerPolicy="no-referrer" src={t.user.image || `/api/avatar?email=${encodeURIComponent(t.user.email || '')}&name=${encodeURIComponent(t.user.name || 'User')}`} alt={t.user.name || "User"} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                              </div>
                              <div className="min-w-0">
                                <p className={cn("text-sm font-semibold truncate", isDark ? "text-white" : "text-slate-900")}>{t.user.name || "Unknown"}</p>
                                <p className={cn("text-xs truncate", isDark ? "text-zinc-400" : "text-slate-500")}>{t.user.email}</p>
                              </div>
                            </Link>
                          ) : (
                            <span className="text-sm text-red-500">Orphaned</span>
                          )}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          {t.cfStatus === 'active' || t.cfStatus === 'healthy' ? (
                            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/20", isDark ? "text-emerald-400" : "text-emerald-700")}>
                              <CheckCircle className="w-3.5 h-3.5" /> Active
                            </span>
                          ) : t.cfStatus === 'inactive' || t.cfStatus === 'down' ? (
                            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 border border-red-500/20", isDark ? "text-red-400" : "text-red-700")}>
                              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" /> Inactive
                            </span>
                          ) : (
                            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-500/10 border border-zinc-500/20", isDark ? "text-zinc-400" : "text-zinc-700")}>
                              {t.cfStatus || 'unknown'}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center whitespace-nowrap">
                          {t.connectors > 0 ? (
                            <span className={cn("inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold bg-cyan-500/10 border border-cyan-500/20", isDark ? "text-cyan-400" : "text-cyan-700")}>
                              {t.connectors}
                            </span>
                          ) : (
                            <span className={cn("inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold bg-zinc-500/10 border border-zinc-500/20", isDark ? "text-zinc-400" : "text-zinc-500")}>
                              0
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                           <button 
                             onClick={() => setDeleteTunnelId(t.id)} 
                             className={cn("p-2 bg-red-500/10 hover:bg-red-500/20 hover:text-red-300 rounded-lg transition-colors", isDark ? "text-red-400" : "text-red-700")} 
                             title="Delete Tunnel"
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
            <div className={cn("p-4 border-t", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}>
              <Pagination currentPage={currentTunnelPage} totalPages={totalTunnelPages} onPageChange={setCurrentTunnelPage} />
            </div>
          </>
        )}
      </div>

      <ConfirmModal 
        isOpen={!!deleteDomainId} 
        onClose={() => setDeleteDomainId(null)} 
        onConfirm={handleDeleteDomainConfirm} 
        title="Delete Domain?" 
        description="Are you sure you want to delete this domain? This will remove the domain from Cloudflare and the local database." 
        confirmText="Delete Domain" 
        isLoading={isDeletingDomain} 
        variant="danger" 
      />

      <ConfirmModal 
        isOpen={!!deleteTunnelId} 
        onClose={() => setDeleteTunnelId(null)} 
        onConfirm={handleDeleteTunnelConfirm} 
        title="Delete Tunnel?" 
        description="Are you sure you want to delete this tunnel? This will remove the tunnel from Cloudflare and the local database." 
        confirmText="Delete Tunnel" 
        isLoading={isDeletingTunnel} 
        variant="danger" 
      />
    </div>
  );
}
