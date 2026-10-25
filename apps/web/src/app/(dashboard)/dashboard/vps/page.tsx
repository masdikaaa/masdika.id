"use client";

import { useUrlNumber, useUrlString } from "@/lib/useUrlTab";
import { useState, useEffect } from "react";
import { Server, Play, Square, Power, RotateCcw, Activity, RefreshCw, Terminal, AlertTriangle, XCircle, Settings, Search, ChevronLeft, ChevronRight, HardDrive, Cpu, Network, CheckCircle, Copy, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { Pagination } from "@/components/ui/Pagination";
import Link from "next/link";

const getOsIcon = (osTemplate: string, isDark: boolean = false) => {
  const os = osTemplate?.toLowerCase() || "";
  if (os.includes("ubuntu")) return "https://cdn.simpleicons.org/ubuntu/E95420";
  if (os.includes("debian")) return "https://cdn.simpleicons.org/debian/A81D33";
  if (os.includes("centos")) return "https://cdn.simpleicons.org/centos/262577";
  if (os.includes("almalinux") || os.includes("alma")) return "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/almalinux/almalinux-original.svg";
  if (os.includes("rocky")) return "https://cdn.simpleicons.org/rockylinux/10B981";
  if (os.includes("alpine")) return "https://www.vectorlogo.zone/logos/alpinelinux/alpinelinux-icon.svg";
  if (os.includes("fedora")) return "https://cdn.simpleicons.org/fedora/3b82f6";
  if (os.includes("windows")) return "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/windows11/windows11-original.svg";
  if (os.includes("freebsd")) return "https://cdn.simpleicons.org/freebsd/AB2B28";
  if (os.includes("mikrotik") || os.includes("chr")) {
    return "https://cdn.worldvectorlogo.com/logos/mikrotik.svg";
  }
  return null;
};

export default function MyVpsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [vpsList, setVpsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});
  const [confirmModal, setConfirmModal] = useState<{ vpsId: number, action: string, hostname: string } | null>(null);
  const [consoleLoading, setConsoleLoading] = useState<number | null>(null);
  const [selectedVps, setSelectedVps] = useState<number[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [actionConfirm, setActionConfirm] = useState<string | null>(null);

  // Pagination & Filter
  const [currentPage, setCurrentPage] = useUrlNumber("currentPage", 1);
  const [searchFilter, setSearchFilter] = useUrlString<string>("searchFilter", "");
  const itemsPerPage = 10;

  const fetchVps = async () => {
    try {
      const res = await fetch("/api/user/vps", { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) {
        setVpsList(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVps();
    // Poll every 5s to update live status
    const interval = setInterval(fetchVps, 5000);
    return () => clearInterval(interval);
  }, []);



  const handleAction = async (vpsId: number, action: string) => {
    setConfirmModal(null);

    setActionLoading(prev => ({ ...prev, [vpsId]: true }));
    try {
      const res = await fetch("/api/user/vps/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vpsId, action }),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(`Action '${action}' executed successfully.`);
        fetchVps(); // Refresh status
      } else {
        toast.error(data.error || "Failed to execute action");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setActionLoading(prev => ({ ...prev, [vpsId]: false }));
    }
  };

  const openConsole = async (vpsId: number) => {
    setConsoleLoading(vpsId);
    try {
      const res = await fetch("/api/user/vps/console", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vpsId }),
      });
      const data = await res.json();
      if (res.ok) {
        window.open(data.consolePageUrl, "_blank", "width=1024,height=700,noopener");
      } else {
        toast.error(data.error || "Failed to open console");
      }
    } catch (e) {
      toast.error("Failed to connect to console");
    } finally {
      setConsoleLoading(null);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedVps.length === 0) return;
    setActionConfirm(action);
  };

  const executeAction = async () => {
    if (!actionConfirm) return;
    const action = actionConfirm;
    setActionConfirm(null);
    setBulkLoading(true);
    let successCount = 0;
    let lastError = "";

    if (action === "delete") {
      for (const id of selectedVps) {
        try {
          const res = await fetch(`/api/user/vps/${id}`, { method: "DELETE" });
          if (res.ok) {
            successCount++;
          } else {
            const data = await res.json().catch(() => ({}));
            lastError = data.error || "Failed to delete instance";
          }
        } catch (e: any) {
          lastError = e.message || "Network error";
        }
      }

      if (successCount === selectedVps.length) {
        toast.success(`Successfully deleted ${successCount} VPS instances.`);
      } else if (successCount > 0) {
        toast.warning(`Deleted ${successCount} instances, but some failed: ${lastError}`);
      } else {
        toast.error(`Failed to delete: ${lastError}`);
      }
    } else {
      for (const id of selectedVps) {
        try {
          const res = await fetch("/api/user/vps/action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vpsId: id, action }),
          });
          if (res.ok) {
            successCount++;
          } else {
            const data = await res.json().catch(() => ({}));
            lastError = data.error || `Failed to execute ${action}`;
          }
        } catch (e: any) {
          lastError = e.message || "Network error";
        }
      }

      if (successCount === selectedVps.length) {
        toast.success(`Successfully executed ${action} on ${successCount} instances.`);
      } else if (successCount > 0) {
        toast.warning(`Executed on ${successCount} instances, but some failed: ${lastError}`);
      } else {
        toast.error(`Failed to execute ${action}: ${lastError}`);
      }
    }

    setBulkLoading(false);
    fetchVps();
    setSelectedVps([]);
  };

  const getActionConfig = (act: string) => {
    switch (act) {
      case 'start':
        return {
          icon: <Play className="w-6 h-6 text-green-500" />,
          bg: "bg-green-500/10",
          buttonClass: "bg-green-500 hover:bg-green-600 shadow-green-500/20 text-white",
          title: "Start",
          desc: "Are you sure you want to start the selected VPS instances?"
        };
      case 'shutdown':
        return {
          icon: <Power className="w-6 h-6 text-orange-500" />,
          bg: "bg-orange-500/10",
          buttonClass: "bg-orange-500 hover:bg-orange-600 shadow-orange-500/20 text-white",
          title: "Shutdown",
          desc: "Are you sure you want to gracefully shutdown the selected VPS instances?"
        };
      case 'reboot':
        return {
          icon: <RotateCcw className="w-6 h-6 text-cyan-500" />,
          bg: "bg-cyan-500/10",
          buttonClass: "bg-cyan-400 hover:bg-cyan-300 text-slate-950",
          title: "Reboot",
          desc: "Are you sure you want to reboot the selected VPS instances?"
        };
      case 'delete':
      default:
        return {
          icon: <AlertTriangle className="w-6 h-6 text-red-500" />,
          bg: "bg-red-500/10",
          buttonClass: "bg-red-500 hover:bg-red-600 shadow-red-500/20 text-white",
          title: "Delete",
          desc: "This action is permanent and cannot be undone."
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center">
        <RefreshCw className="w-10 h-10 text-cyan-500 animate-spin" />
      </div>
    );
  }

  const filteredList = vpsList.filter(v =>
    !searchFilter ||
    v.hostname.toLowerCase().includes(searchFilter.toLowerCase()) ||
    v.assignedIps.some((ip: any) => ip.ipAddress.includes(searchFilter)) ||
    v.id.toString().includes(searchFilter)
  );

  const totalPages = Math.max(1, Math.ceil(filteredList.length / itemsPerPage));
  const paginatedList = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);



  return (
    <div className="w-full space-y-6">
      {/* Hero Header */}
      <div className={cn("border", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm", "relative overflow-hidden rounded-3xl p-6 md:p-8 group")}>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 tracking-wide border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-500/10 border-cyan-500/20 text-cyan-800")}>
              <Server className="w-3 h-3" /> Cloud Infrastructure
            </div>
            <h1 className={cn("text-3xl md:text-4xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900", " ")}>
              My <span className={cn(isDark ? "text-cyan-400" : "text-cyan-600", " ")}>VPS Instances</span>
            </h1>
            <p className={cn(" text-sm max-w-md", isDark ? "text-zinc-400" : "text-slate-500")}>Manage your virtual private servers, power states, and view resource usage.</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-500/50" />
              <input
                type="text"
                placeholder="Search ID, Hostname, IP..."
                value={searchFilter}
                onChange={(e) => { setSearchFilter(e.target.value); setCurrentPage(1); }}
                className={cn("w-full border rounded-2xl pl-9 pr-4 py-2.5 text-sm focus:outline-none transition-colors", isDark ? "bg-[#060b14] border-slate-800 text-white focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50" : "bg-white border-slate-300 text-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 shadow-sm placeholder:text-slate-400")}
              />
            </div>
            <button
              onClick={fetchVps}
              className={cn("p-2.5 rounded-lg border transition-colors shrink-0", isDark ? "bg-[#060b14] text-cyan-400 border-slate-800 hover:bg-[#09111e]" : "bg-white text-cyan-600 border-slate-300 hover:bg-slate-50 shadow-sm")}
              title="Refresh Status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <Link
              href="/dashboard/checkout?service=vps"
              className="flex items-center gap-2 px-4 py-2.5 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-sm font-semibold rounded-lg transition-all shadow-sm shrink-0 text-slate-950"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create Instance</span>
            </Link>
          </div>
        </div>
      </div>

      {vpsList.length === 0 ? (
        <div className={cn("border transition-colors", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm", "rounded-3xl p-12 text-center")}>
          <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 transform -rotate-6", isDark ? "bg-[#060b14] border border-slate-800" : "bg-slate-100")}>
            <Server className={cn("w-10 h-10 transform rotate-6", isDark ? "text-zinc-500" : "text-slate-400")} />
          </div>
          <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No VPS Found</h3>
          <p className={cn("max-w-md mx-auto mb-6", isDark ? "text-zinc-400" : "text-slate-500")}>You don't have any active VPS instances yet. Deploy your first virtual private server to get started.</p>
          <Link href="/dashboard/checkout?service=vps" className="font-semibold text-slate-950 px-5 py-2.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 transition-all shadow-sm inline-flex items-center justify-center gap-2 text-sm">
            Deploy New VPS
          </Link>
        </div>
      ) : (
        <div className={cn("border rounded-2xl shadow-md overflow-hidden flex flex-col", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200")}>
          <div className={cn("border-b", isDark ? "border-slate-800/80 bg-[#060b14]" : "border-slate-100 bg-slate-50", "px-6 py-2 flex flex-wrap items-center justify-between min-h-[56px] gap-4")}>
            {totalPages > 1 && (
              <div className="py-2">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
            {selectedVps.length > 0 && (() => {
              const selectedVpsData = vpsList.filter(v => selectedVps.includes(v.id));
              const canStart = selectedVpsData.some(v => v.liveStatus?.status !== "running");
              const canShutdownOrReboot = selectedVpsData.some(v => v.liveStatus?.status === "running");

              return (
                <div className="flex items-center gap-1.5 md:gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                  <span className={cn("text-xs font-bold px-2 py-1 rounded-md mr-2 border", isDark ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" : "text-cyan-700 bg-cyan-50 border-cyan-200")}>{selectedVps.length} selected</span>
                  {canStart && (
                    <button onClick={() => handleBulkAction('start')} disabled={bulkLoading} className={cn("p-1.5 md:px-3 md:py-1.5 rounded-lg border transition-colors text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50", isDark ? "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-200")}>
                      <Play className="w-3.5 h-3.5" /> <span className="hidden md:inline">Start</span>
                    </button>
                  )}
                  {canShutdownOrReboot && (
                    <button onClick={() => handleBulkAction('shutdown')} disabled={bulkLoading} className={cn("p-1.5 md:px-3 md:py-1.5 rounded-lg border transition-colors text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50", isDark ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20" : "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200")}>
                      <Power className="w-3.5 h-3.5" /> <span className="hidden md:inline">Shutdown</span>
                    </button>
                  )}
                  {canShutdownOrReboot && (
                    <button onClick={() => handleBulkAction('reboot')} disabled={bulkLoading} className={cn("p-1.5 md:px-3 md:py-1.5 rounded-lg border transition-colors text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50", isDark ? "bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20" : "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200")}>
                      <RotateCcw className="w-3.5 h-3.5" /> <span className="hidden md:inline">Reboot</span>
                    </button>
                  )}
                  <div className={cn("w-px h-4 mx-1", isDark ? "bg-white/10" : "bg-slate-200")} />
                  <button onClick={() => handleBulkAction('delete')} disabled={bulkLoading} className={cn("p-1.5 md:px-3 md:py-1.5 rounded-lg border transition-colors text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50", isDark ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20" : "bg-red-50 hover:bg-red-100 text-red-700 border-red-200")}>
                    <AlertTriangle className="w-3.5 h-3.5" /> <span className="hidden md:inline">{selectedVps.length === paginatedList.length && paginatedList.length > 1 ? 'Delete All' : 'Delete'}</span>
                  </button>
                </div>
              );
            })()}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className={cn("border-b text-xs font-semibold uppercase tracking-wider", isDark ? "border-white/5 bg-black/10 text-zinc-400" : "border-slate-100 bg-slate-50 text-slate-500")}>
                  <th className="py-4 pl-6 pr-2 w-14">
                    <button
                      type="button"
                      onClick={() => {
                        const isAllSelected = paginatedList.length > 0 && selectedVps.length === paginatedList.length;
                        if (!isAllSelected) {
                          setSelectedVps(paginatedList.map(v => v.id));
                        } else {
                          setSelectedVps([]);
                        }
                      }}
                      className={cn(
                        "w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all duration-200",
                        paginatedList.length > 0 && selectedVps.length === paginatedList.length
                          ? "bg-cyan-400"
                          : "bg-black/40 border border-white/10 hover:border-cyan-400/50"
                      )}
                    >
                      <CheckCircle className={cn("w-3.5 h-3.5", paginatedList.length > 0 && selectedVps.length === paginatedList.length ? "text-[#0f172a]" : "text-transparent")} />
                    </button>
                  </th>
                  <th className="py-4 px-4 font-medium w-16">ID</th>
                  <th className="py-4 px-4 font-medium w-64">Hostname</th>
                  <th className="py-4 px-4 font-medium w-40">Type</th>
                  <th className="py-4 px-4 font-medium">Information</th>
                  <th className="py-4 px-4 font-medium">Status</th>
                  <th className="py-4 px-4 font-medium">Server</th>
                  <th className="py-4 pl-4 pr-6 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={cn("p-8 text-center ", isDark ? "text-zinc-500" : "text-slate-400")}>No instances match your search.</td>
                  </tr>
                ) : (
                  paginatedList.map((vps) => {
                    const liveStatus = vps.liveStatus?.status;
                    const isRunning = liveStatus === "running";
                    const isProvisioning = vps.status === "PROVISIONING" || vps.status === "PENDING";
                    const isSuspended = vps.status === "SUSPENDED";
                    const displayStatus = isProvisioning ? "Deploying" : (isSuspended ? "SUSPENDED" : (liveStatus || vps.status));

                    return (
                      <tr key={vps.id} className={cn("transition-colors group", isDark ? "hover:bg-slate-800/40" : "hover:bg-slate-50")}>
                        <td className="py-4 pl-6 pr-2 align-middle">
                          <button
                            type="button"
                            onClick={() => {
                              if (!selectedVps.includes(vps.id)) {
                                setSelectedVps(prev => [...prev, vps.id]);
                              } else {
                                setSelectedVps(prev => prev.filter(id => id !== vps.id));
                              }
                            }}
                            className={cn(
                              "w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all duration-200",
                              selectedVps.includes(vps.id)
                                ? "bg-cyan-400"
                                : "bg-black/40 border border-white/10 hover:border-cyan-400/50"
                            )}
                          >
                            <CheckCircle className={cn("w-3.5 h-3.5", selectedVps.includes(vps.id) ? "text-[#0f172a]" : "text-transparent")} />
                          </button>
                        </td>
                        <td className="py-4 px-4 align-middle">
                          <span className={cn(" text-sm font-mono", isDark ? "text-zinc-500" : "text-slate-400")}>{vps.id}</span>
                        </td>
                        <td className="py-4 px-4 align-middle">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 shrink-0 bg-white/5 rounded-xl flex items-center justify-center p-2">
                              {getOsIcon(vps.osTemplate, isDark) ? (
                                 
                                <img referrerPolicy="no-referrer" src={getOsIcon(vps.osTemplate, isDark)!} alt="OS" className="w-full h-full object-contain drop-shadow-md" loading="lazy" decoding="async" />
                              ) : (
                                <Server className="w-5 h-5 text-cyan-400" />
                              )}
                            </div>
                            <div>
                              <div className={cn("font-bold  text-base", isDark ? "text-white" : "text-slate-900")}>{vps.hostname}</div>
                              <div className="flex flex-wrap items-center gap-2">
                                {vps.assignedIps.length > 0 ? (
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(vps.assignedIps[0].publicIp || vps.assignedIps[0].ipAddress);
                                      toast.success("IP copied to clipboard");
                                    }}
                                    className={cn("text-sm  hover:text-cyan-400 font-mono whitespace-nowrap shrink-0 cursor-pointer transition-colors flex items-center gap-1.5 group/ip", isDark ? "text-zinc-400" : "text-slate-500")}
                                    title="Copy IP Address"
                                  >
                                    {vps.assignedIps[0].publicIp || vps.assignedIps[0].ipAddress}
                                    <Copy className="w-3.5 h-3.5 opacity-0 group-hover/ip:opacity-100 transition-opacity" />
                                  </div>
                                ) : (
                                  <div className={cn("text-sm  font-mono whitespace-nowrap shrink-0", isDark ? "text-zinc-500" : "text-slate-400")}>
                                    {vps.status === 'PENDING' ? "Provisioning IP" : "No IP"}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 align-middle">
                          <div className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full border inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 uppercase tracking-wider", isDark ? "bg-black/20 border-white/5" : "bg-slate-50 border-slate-200")}>
                            {vps.kubernetesRole ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0"></span>
                                <span className={cn("font-semibold", isDark ? "text-cyan-400" : "text-cyan-700")}>K3s Node</span>
                              </>
                            ) : (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0"></span>
                                <span className={cn("font-semibold", isDark ? "text-cyan-400" : "text-cyan-600")}>Cloud VPS</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 align-middle">
                          <div className={cn("flex items-center gap-6 text-sm", isDark ? "text-zinc-300" : "text-slate-500")}>
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2"><Cpu className={cn("w-3.5 h-3.5 ", isDark ? "text-zinc-500" : "text-slate-400")} /> {vps.ramGb >= 1 ? `${vps.ramGb} GB` : `${vps.ramGb * 1024} MB`} RAM</div>
                              <div className="flex items-center gap-2"><Activity className={cn("w-3.5 h-3.5 ", isDark ? "text-zinc-500" : "text-slate-400")} /> {vps.cpuCores} Core</div>
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2"><HardDrive className={cn("w-3.5 h-3.5 ", isDark ? "text-zinc-500" : "text-slate-400")} /> {vps.diskGb} GB</div>
                              <div className="flex items-center gap-2" title="Network Bandwidth Limit"><Network className={cn("w-3.5 h-3.5 ", isDark ? "text-zinc-500" : "text-slate-400")} /> {vps.bandwidthMbps ? `${vps.bandwidthMbps} Mbps` : '100 Mbps'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 align-middle">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide",
                              isRunning && !isSuspended && vps.status !== 'TERMINATED' ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" :
                                isSuspended ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" :
                                  vps.status === 'TERMINATED' ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                                    isProvisioning ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse" :
                                      "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                            )}>
                              {displayStatus}
                            </span>
                            {isProvisioning && <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />}
                          </div>
                        </td>
                        <td className="py-4 px-4 align-middle text-sm">
                          <div className={cn("font-medium", isDark ? "text-zinc-300" : "text-slate-500")}>{vps.node}</div>
                        </td>
                        <td className="py-4 pl-4 pr-6 align-middle text-right">
                          <div className="flex items-center justify-end gap-2">
                            {vps.status !== 'TERMINATED' ? (
                              <Link
                                href={`/dashboard/vps/${vps.id}`}
                                className={cn(
                                  "p-2 rounded-lg transition-colors border shadow-sm",
                                  isDark 
                                    ? "bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border-white/10 hover:border-white/20" 
                                    : "bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200"
                                )}
                                title="Manage Settings"
                              >
                                <Settings className="w-4 h-4" />
                              </Link>
                            ) : (
                              <div 
                                className={cn(
                                  "p-2 rounded-lg border cursor-not-allowed opacity-40",
                                  isDark ? "bg-white/5 text-zinc-500 border-white/5" : "bg-slate-100 text-slate-400 border-slate-200"
                                )}
                                title="Terminated"
                              >
                                <Settings className="w-4 h-4" />
                              </div>
                            )}
                            <button
                              onClick={() => setConfirmModal({ vpsId: vps.id, action: "start", hostname: vps.hostname })}
                              disabled={actionLoading[vps.id] || isRunning || vps.status === 'SUSPENDED' || vps.status === 'TERMINATED'}
                              className={cn(
                                "flex items-center gap-1.5 p-2 rounded-lg transition-all border shadow-sm disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-xs",
                                isDark 
                                  ? "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/20" 
                                  : "bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-200"
                              )}
                              title="Start"
                            >
                              <Play className="w-4 h-4" /> <span className="hidden xl:inline">Start</span>
                            </button>
                            <button
                              onClick={() => setConfirmModal({ vpsId: vps.id, action: "shutdown", hostname: vps.hostname })}
                              disabled={actionLoading[vps.id] || !isRunning || vps.status === 'TERMINATED'}
                              className={cn(
                                "flex items-center gap-1.5 p-2 rounded-lg transition-all border shadow-sm disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-xs",
                                isDark 
                                  ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20" 
                                  : "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200"
                              )}
                              title="Shutdown"
                            >
                              <Power className="w-4 h-4" /> <span className="hidden xl:inline">Shutdown</span>
                            </button>
                            <button
                              onClick={() => setConfirmModal({ vpsId: vps.id, action: "stop", hostname: vps.hostname })}
                              disabled={actionLoading[vps.id] || !isRunning || vps.status === 'TERMINATED'}
                              className={cn(
                                "flex items-center gap-1.5 p-2 rounded-lg transition-all border shadow-sm disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-xs",
                                isDark 
                                  ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20" 
                                  : "bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                              )}
                              title="Stop"
                            >
                              <Square className="w-4 h-4" /> <span className="hidden xl:inline">Stop</span>
                            </button>
                            <button
                              onClick={() => setConfirmModal({ vpsId: vps.id, action: "reboot", hostname: vps.hostname })}
                              disabled={actionLoading[vps.id] || !isRunning || vps.status === 'TERMINATED'}
                              className={cn(
                                "flex items-center gap-1.5 p-2 rounded-lg transition-all border shadow-sm disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-xs",
                                isDark 
                                  ? "bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20" 
                                  : "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                              )}
                              title="Restart"
                            >
                              <RotateCcw className="w-4 h-4" /> <span className="hidden xl:inline">Restart</span>
                            </button>
                            {!vps.kubernetesRole && (
                              <button
                                onClick={() => openConsole(vps.id)}
                                disabled={consoleLoading === vps.id || vps.status === 'TERMINATED'}
                                className="flex items-center gap-1.5 p-2 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-semibold text-xs"
                                title="Console"
                              >
                                {consoleLoading === vps.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
                                <span className="hidden xl:inline">Console</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className={cn("px-6 py-2 border-t", isDark ? "border-white/5 bg-black/20" : "border-slate-100 bg-slate-50")}>
            {totalPages > 1 && (
              <div className="py-2">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className={cn("border w-full max-w-sm rounded-3xl p-6 shadow-2xl relative", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200")}>
            <button onClick={() => setConfirmModal(null)} className={cn("absolute top-4 right-4 transition-colors", isDark ? "text-zinc-500 hover:text-white" : "text-slate-400 hover:text-slate-900")}>
              <XCircle className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                confirmModal.action === "start" ? "bg-cyan-500/10 text-cyan-500" :
                  confirmModal.action === "stop" ? "bg-red-500/10 text-red-500" :
                    confirmModal.action === "shutdown" ? "bg-amber-500/10 text-amber-500" :
                      "bg-blue-500/10 text-blue-500"
              )}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h2 className={cn("text-xl font-bold capitalize", isDark ? "text-white" : "text-slate-900")}>{confirmModal.action} Server</h2>
            </div>

            <p className={cn("text-sm mb-6", isDark ? "text-zinc-400" : "text-slate-500")}>
              Are you sure you want to <strong>{confirmModal.action}</strong> the server <strong className={cn("", isDark ? "text-white" : "text-slate-900")}>{confirmModal.hostname}</strong>?
              {confirmModal.action === "stop" && (
                <span className="block mt-2 text-red-400">Warning: This is a forced stop. Unsaved data may be lost. Use Shutdown instead for a graceful exit.</span>
              )}
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className={cn("px-4 py-2.5 rounded-lg border transition-colors text-sm font-medium", isDark ? "text-zinc-400 border-slate-700 hover:bg-slate-800" : "text-slate-600 border-slate-200 hover:bg-slate-100")}
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(confirmModal.vpsId, confirmModal.action)}
                className={cn(
                  "px-5 py-2.5 rounded-lg font-semibold transition-colors shadow-sm text-sm",
                  confirmModal.action === "start" ? "bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950" :
                    confirmModal.action === "stop" ? "bg-red-600 hover:bg-red-500 text-white" :
                      confirmModal.action === "shutdown" ? "bg-amber-600 hover:bg-amber-500 text-white" :
                        "bg-blue-600 hover:bg-blue-500 text-white"
                )}
              >
                Yes, {confirmModal.action}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Action Confirmation Modal */}
      {actionConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className={cn("border rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200")}>
            <div className="flex items-center gap-4 mb-4">
              <div className={cn("w-12 h-12 rounded-full flex items-center justify-center shrink-0", getActionConfig(actionConfirm).bg)}>
                {getActionConfig(actionConfirm).icon}
              </div>
              <div>
                <h3 className={cn("text-lg font-bold ", isDark ? "text-white" : "text-slate-900")}>{getActionConfig(actionConfirm).title} {selectedVps.length} VPS {selectedVps.length > 1 ? 'Instances' : 'Instance'}</h3>
                <p className={cn("text-sm  mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>{getActionConfig(actionConfirm).desc}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setActionConfirm(null)}
                className={cn("px-4 py-2 rounded-lg text-sm font-medium border transition-colors", isDark ? "text-zinc-300 border-slate-700 hover:bg-slate-800" : "text-slate-600 border-slate-200 hover:bg-slate-100")}
              >
                Cancel
              </button>
              <button
                onClick={executeAction}
                className={cn("px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm", getActionConfig(actionConfirm).buttonClass)}
              >
                Yes, {getActionConfig(actionConfirm).title}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}