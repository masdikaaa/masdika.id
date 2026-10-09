"use client";

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
  if (os.includes("almalinux")) return "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/almalinux/almalinux-original.svg";
  if (os.includes("rocky")) return "https://cdn.simpleicons.org/rockylinux/10B981";
  if (os.includes("alpine")) return "https://cdn.simpleicons.org/alpinelinux/0D597F";
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
  const [currentPage, setCurrentPage] = useState(1);
  const [searchFilter, setSearchFilter] = useState("");
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
          buttonClass: "bg-cyan-500 hover:bg-cyan-600 shadow-cyan-500/20 text-[#0f172a]",
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
      <div className={cn("backdrop-blur-sm border", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200", "relative overflow-hidden rounded-3xl   p-6 md:p-8 shadow-sm group")}>
        

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 tracking-wide border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-100 border-cyan-200 text-cyan-700")}>
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
                className={cn("w-full backdrop-blur-md border rounded-2xl pl-9 pr-4 py-2.5 text-sm focus:outline-none transition-colors", isDark ? "bg-[#011627]/80 border-cyan-500/20 text-white focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.05)]" : "bg-white border-slate-300 text-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 shadow-sm placeholder:text-slate-400")}
              />
            </div>
            <button
              onClick={fetchVps}
              className={cn("p-2.5 md:p-3 backdrop-blur-md rounded-2xl border transition-colors shrink-0", isDark ? "bg-[#011627]/80 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.05)]" : "bg-white text-cyan-600 border-slate-300 hover:bg-slate-50 shadow-sm")}
              title="Refresh Status"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <Link
              href="/dashboard/checkout?service=vps"
              className={cn("flex items-center gap-2 px-3 py-2.5 md:px-4 md:py-3 bg-cyan-600 hover:bg-cyan-700 text-sm font-bold rounded-2xl transition-all shadow-md shrink-0 text-white", isDark && "shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]")}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create Instance</span>
            </Link>
          </div>
        </div>
      </div>

      {vpsList.length === 0 ? (
        <div className={cn("border transition-colors", isDark ? "bg-white/[0.02] border-white/5 hover:bg-white/[0.04]" : "bg-white border-slate-200 hover:bg-slate-50", "  rounded-3xl p-12 text-center shadow-sm")}>
          <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 transform -rotate-6", isDark ? "bg-white/5" : "bg-slate-100")}>
            <Server className={cn("w-10 h-10  transform rotate-6", isDark ? "text-zinc-500" : "text-slate-400")} />
          </div>
          <h3 className={cn("text-xl font-bold  mb-2", isDark ? "text-white" : "text-slate-900")}>No VPS Found</h3>
          <p className={cn(" max-w-md mx-auto mb-6", isDark ? "text-zinc-400" : "text-slate-500")}>You don't have any active VPS instances yet. Deploy your first virtual private server to get started.</p>
          <Link href="/dashboard/checkout?service=vps" className={cn("font-bold text-white px-6 py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 transition-all shadow-md hover:-translate-y-0.5 inline-flex items-center justify-center gap-2", isDark && "shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]")}>
            Deploy New VPS
          </Link>
        </div>
      ) : (
        <div className={cn("border rounded-2xl shadow-sm overflow-hidden flex flex-col", isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-slate-200")}>
          <div className={cn("border-b", isDark ? "border-white/5" : "border-slate-100", "px-6 py-2   bg-black/20 flex flex-wrap items-center justify-between min-h-[56px] gap-4")}>
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
                  <span className="text-xs text-cyan-400 font-bold bg-cyan-500/10 px-2 py-1 rounded-md mr-2">{selectedVps.length} selected</span>
                  {canStart && (
                    <button onClick={() => handleBulkAction('start')} disabled={bulkLoading} className="p-1.5 md:px-3 md:py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors text-xs font-medium flex items-center gap-1.5 disabled:opacity-50">
                      <Play className="w-3.5 h-3.5" /> <span className="hidden md:inline">Start</span>
                    </button>
                  )}
                  {canShutdownOrReboot && (
                    <button onClick={() => handleBulkAction('shutdown')} disabled={bulkLoading} className="p-1.5 md:px-3 md:py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 transition-colors text-xs font-medium flex items-center gap-1.5 disabled:opacity-50">
                      <Power className="w-3.5 h-3.5" /> <span className="hidden md:inline">Shutdown</span>
                    </button>
                  )}
                  {canShutdownOrReboot && (
                    <button onClick={() => handleBulkAction('reboot')} disabled={bulkLoading} className="p-1.5 md:px-3 md:py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-colors text-xs font-medium flex items-center gap-1.5 disabled:opacity-50">
                      <RotateCcw className="w-3.5 h-3.5" /> <span className="hidden md:inline">Reboot</span>
                    </button>
                  )}
                  <div className="w-px h-4 bg-white/10 mx-1" />
                  <button onClick={() => handleBulkAction('delete')} disabled={bulkLoading} className="p-1.5 md:px-3 md:py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors text-xs font-medium flex items-center gap-1.5 disabled:opacity-50 border border-red-500/20">
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
                      <tr key={vps.id} className="hover:bg-white/[0.02] transition-colors group">
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
                                /* eslint-disable-next-line @next/next/no-img-element */
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
                              <div className="flex items-center gap-2"><Network className={cn("w-3.5 h-3.5 ", isDark ? "text-zinc-500" : "text-slate-400")} /> ∞</div>
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
                              <a
                                href={`/dashboard/vps/${vps.id}`}
                                className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors border border-blue-500/20"
                                title="Manage"
                              >
                                <Settings className="w-4 h-4" />
                              </a>
                            ) : (
                              <div className="p-2 bg-red-500/5 text-red-500/40 rounded-lg border border-red-500/10 cursor-not-allowed">
                                <Settings className="w-4 h-4" />
                              </div>
                            )}
                            <button
                              onClick={() => setConfirmModal({ vpsId: vps.id, action: "start", hostname: vps.hostname })}
                              disabled={actionLoading[vps.id] || isRunning || vps.status === 'SUSPENDED' || vps.status === 'TERMINATED'}
                              className={cn("border", isDark ? "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-200", "flex items-center gap-1.5 p-2   rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed")}
                              title="Start"
                            >
                              <Play className="w-4 h-4" /> <span className="hidden xl:inline text-xs font-medium">Start</span>
                            </button>
                            <button
                              onClick={() => setConfirmModal({ vpsId: vps.id, action: "shutdown", hostname: vps.hostname })}
                              disabled={actionLoading[vps.id] || !isRunning || vps.status === 'TERMINATED'}
                              className={cn("border", isDark ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20" : "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200", "flex items-center gap-1.5 p-2   rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed")}
                              title="Shutdown"
                            >
                              <Power className="w-4 h-4" /> <span className="hidden xl:inline text-xs font-medium">Shutdown</span>
                            </button>
                            <button
                              onClick={() => setConfirmModal({ vpsId: vps.id, action: "stop", hostname: vps.hostname })}
                              disabled={actionLoading[vps.id] || !isRunning || vps.status === 'TERMINATED'}
                              className={cn("border", isDark ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20" : "bg-red-50 hover:bg-red-100 text-red-600 border-red-200", "flex items-center gap-1.5 p-2   rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed")}
                              title="Stop"
                            >
                              <Square className="w-4 h-4" /> <span className="hidden xl:inline text-xs font-medium">Stop</span>
                            </button>
                            <button
                              onClick={() => setConfirmModal({ vpsId: vps.id, action: "reboot", hostname: vps.hostname })}
                              disabled={actionLoading[vps.id] || !isRunning || vps.status === 'TERMINATED'}
                              className={cn("border", isDark ? "bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20" : "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200", "flex items-center gap-1.5 p-2   rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed")}
                              title="Restart"
                            >
                              <RotateCcw className="w-4 h-4" /> <span className="hidden xl:inline text-xs font-medium">Restart</span>
                            </button>
                            {!vps.kubernetesRole && (
                              <button
                                onClick={() => openConsole(vps.id)}
                                disabled={consoleLoading === vps.id || vps.status === 'TERMINATED'}
                                className="flex items-center gap-1.5 p-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-white"
                                title="Console"
                              >
                                {consoleLoading === vps.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
                                <span className="hidden xl:inline text-xs font-medium">Console</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className={cn("border w-full max-w-sm rounded-3xl p-6 shadow-md relative", isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-slate-200")}>
            <button onClick={() => setConfirmModal(null)} className={cn("absolute top-4 right-4  hover:text-white transition-colors", isDark ? "text-zinc-500" : "text-slate-400")}>
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
              <h2 className={cn("text-xl font-bold  capitalize", isDark ? "text-white" : "text-slate-900")}>{confirmModal.action} Server</h2>
            </div>

            <p className={cn(" text-sm mb-6", isDark ? "text-zinc-400" : "text-slate-500")}>
              Are you sure you want to <strong>{confirmModal.action}</strong> the server <strong className={cn("", isDark ? "text-white" : "text-slate-900")}>{confirmModal.hostname}</strong>?
              {confirmModal.action === "stop" && (
                <span className="block mt-2 text-red-400">Warning: This is a forced stop. Unsaved data may be lost. Use Shutdown instead for a graceful exit.</span>
              )}
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className={cn("px-5 py-2.5  hover:text-white transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(confirmModal.vpsId, confirmModal.action)}
                className={cn(
                  "px-6 py-2.5 rounded-xl font-medium transition-colors text-white shadow-lg",
                  confirmModal.action === "start" ? "bg-cyan-600 hover:bg-cyan-700 shadow-cyan-500/20" :
                    confirmModal.action === "stop" ? "bg-red-600 hover:bg-red-700 shadow-red-500/20" :
                      confirmModal.action === "shutdown" ? "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20" :
                        "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className={cn("bg-[#0f172a] border rounded-2xl p-6 w-full max-w-md shadow-md animate-in zoom-in-95 duration-200", isDark ? "border-white/10" : "border-slate-200")}>
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
                className={cn("px-4 py-2 rounded-xl text-sm font-bold bg-white/5 hover:bg-white/10 transition-colors", isDark ? "text-zinc-300" : "text-slate-500")}
              >
                Cancel
              </button>
              <button
                onClick={executeAction}
                className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-lg", getActionConfig(actionConfirm).buttonClass)}
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