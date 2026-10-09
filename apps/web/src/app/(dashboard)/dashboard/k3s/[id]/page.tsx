"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Server, Activity, ChevronLeft, Download, Terminal, HardDrive, Cpu, Settings, ExternalLink, Shield, ShieldCheck, Box, AlertTriangle, Trash2, RefreshCw, CreditCard, CheckCircle, Play, Power, RotateCcw, Calculator, Square } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from "framer-motion";
import { SiKubernetes } from "react-icons/si";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Select } from "@/components/ui/Select";
import { useTheme } from "@/components/ThemeProvider";

export default function K3sDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [cluster, setCluster] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [installLogs, setInstallLogs] = useState<{ ts: string; msg: string }[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);
  const [pricing, setPricing] = useState<Record<string, number>>({});
  const [historyMetrics, setHistoryMetrics] = useState<{ cpu: any[], memory: any[] } | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const activeTabRef = useRef(activeTab);
  const runningNodesCountRef = useRef<number>(-1);
  const isSuspended = cluster?.nodes?.some((n: any) => n.status === 'SUSPENDED') || false;
  
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const hasFetchedHistory = useRef(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isReinstalling, setIsReinstalling] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [editClusterName, setEditClusterName] = useState("");
  const [reinstallVersion, setReinstallVersion] = useState("v1.31");
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    actionType: "danger" | "warning" | "info";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    actionType: "info",
    onConfirm: () => { }
  });

  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [guideOs, setGuideOs] = useState<"windows" | "linux" | "mac">("windows");

  const [editRoleModal, setEditRoleModal] = useState<{
    isOpen: boolean;
    nodeName: string;
    currentRole: string;
    isUpdating: boolean;
  }>({
    isOpen: false,
    nodeName: "",
    currentRole: "",
    isUpdating: false
  });

  // Reserve IP State
  const [showReserveIpModal, setShowReserveIpModal] = useState(false);
  const [reserveIpNodeId, setReserveIpNodeId] = useState<number | null>(null);
  const [reserveIpHostname, setReserveIpHostname] = useState("");
  const [availableIps, setAvailableIps] = useState<any[]>([]);
  const [selectedReserveIp, setSelectedReserveIp] = useState("");
  const [fetchingIps, setFetchingIps] = useState(false);
  const [reservingIp, setReservingIp] = useState(false);

  // Bulk Actions
  const [selectedNodes, setSelectedNodes] = useState<number[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  const handleBulkNodeAction = async (action: 'start' | 'shutdown' | 'reboot') => {
    setBulkLoading(true);
    let successCount = 0;
    let lastError = "";

    for (const vpsId of selectedNodes) {
      try {
        const res = await fetch("/api/user/vps/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vpsId, action }),
        });
        if (res.ok) {
          successCount++;
        } else {
          const data = await res.json().catch(() => ({}));
          lastError = data.error || `Failed to ${action}`;
        }
      } catch (e: any) {
        lastError = e.message || "Network error";
      }
    }

    if (successCount === selectedNodes.length) {
      toast.success(`Successfully executed ${action} on ${successCount} nodes.`);
    } else if (successCount > 0) {
      toast.warning(`Executed on ${successCount} nodes, but some failed: ${lastError}`);
    } else {
      toast.error(`Failed to execute ${action}: ${lastError}`);
    }

    setBulkLoading(false);
    setSelectedNodes([]);
    fetchCluster(true);
  };

  // Alerts States
  const [alertRules, setAlertRules] = useState<any[]>([
    { metric: "CPU", threshold: 90, isEnabled: false, notifyEmails: "" },
    { metric: "RAM", threshold: 90, isEnabled: false, notifyEmails: "" },
    { metric: "DISK", threshold: 90, isEnabled: false, notifyEmails: "" }
  ]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [isSavingAlerts, setIsSavingAlerts] = useState(false);

  const fetchAlertRules = async () => {
    try {
      setAlertsLoading(true);
      const res = await fetch(`/api/user/k3s/${params.id}/alerts`);
      const data = await res.json();
      if (data.success && data.alertRules?.length > 0) {
        setAlertRules(prev => prev.map(p => {
          const found = data.alertRules.find((r:any) => r.metric === p.metric);
          return found ? { ...p, threshold: found.threshold, isEnabled: found.isEnabled, notifyEmails: found.notifyEmails || "" } : p;
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAlertsLoading(false);
    }
  };

  const handleSaveAlerts = async () => {
    try {
      setIsSavingAlerts(true);
      const res = await fetch(`/api/user/k3s/${params.id}/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: alertRules })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Alert rules updated successfully");
      } else {
        toast.error(data.error || "Failed to update alerts");
      }
    } catch (e) {
      toast.error("An error occurred while saving alerts");
    } finally {
      setIsSavingAlerts(false);
    }
  };

  const handleUpdateRole = async (newRole: string) => {
    try {
      setEditRoleModal(prev => ({ ...prev, isUpdating: true }));
      const res = await fetch(`/api/user/k3s/${params.id}/node-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeName: editRoleModal.nodeName,
          roleName: newRole
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`Role updated successfully`);
      setEditRoleModal(prev => ({ ...prev, isOpen: false }));
      // Refresh metrics to instantly update the role on UI
      fetchMetrics(false, true);
    } catch (err: any) {
      toast.error(err.message || "Failed to update role");
    } finally {
      setEditRoleModal(prev => ({ ...prev, isUpdating: false }));
    }
  };

  const handleOpenReserveIpModal = async (nodeId: number, hostname: string) => {
    setReserveIpNodeId(nodeId);
    setReserveIpHostname(hostname);
    setShowReserveIpModal(true);
    setFetchingIps(true);
    try {
      const res = await fetch(`/api/user/vps/${nodeId}/available-ips`);
      const data = await res.json();
      if (data.ips) {
        setAvailableIps(data.ips);
        if (data.ips.length > 0) setSelectedReserveIp(data.ips[0].ipAddress);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingIps(false);
    }
  };

  const handleReserveNodeIp = async () => {
    if (!reserveIpNodeId || !selectedReserveIp) return toast.error("Please select an IP address");
    setReservingIp(true);
    try {
      const res = await fetch(`/api/user/vps/${reserveIpNodeId}/reserve-ip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ipAddress: selectedReserveIp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reserve IP");
      toast.success(`Successfully reserved IP: ${data.ipAddress}`);
      setShowReserveIpModal(false);
      fetchCluster();
    } catch (err: any) {
      toast.error(err.message || "Failed to reserve IP");
    } finally {
      setReservingIp(false);
    }
  };

  const K3S_VERSIONS = [
    { id: "v1.36", name: "Kubernetes v1.36 (Stable)" },
    { id: "v1.35", name: "Kubernetes v1.35 (Stable)" },
    { id: "v1.34", name: "Kubernetes v1.34 (Stable)" },
    { id: "v1.33", name: "Kubernetes v1.33 (Stable)" },
    { id: "v1.32", name: "Kubernetes v1.32 (Stable)" },
    { id: "v1.31", name: "Kubernetes v1.31 (Stable)" }
  ];

  useEffect(() => {
    fetchCluster();
    const interval = setInterval(() => fetchCluster(true), 15000);
    return () => clearInterval(interval);
  }, []);

  // Poll metrics independently every 5s for real-time dashboard updates
  useEffect(() => {
    if (!params.id) return;
    const pollMetrics = () => {
      if (document.visibilityState === 'hidden') return; // don't poll when tab is hidden
      fetchMetrics(false);
    };
    const interval = setInterval(pollMetrics, 5000);
    return () => clearInterval(interval);
  }, [params.id]);

  // Poll install log — always active so users can check logs from any state (installing, failed, running)
  useEffect(() => {
    if (!params.id) return;

    const fetchLog = async () => {
      try {
        const res = await fetch(`/api/user/k3s/${params.id}/install-log`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setInstallLogs(data.logs || []);
        }
      } catch (e) { /* ignore */ }
    };

    fetchLog();
    // Poll every 2s when installing, every 30s otherwise (to check for new worker installs)
    const installingStatuses = ['PENDING', 'PROVISIONING', 'WAITING_FOR_SSH', 'INSTALLING_K3S'];
    const isInstalling = installingStatuses.includes(cluster?.status || '');
    const interval = setInterval(fetchLog, isInstalling ? 2000 : 30000);
    return () => clearInterval(interval);
  }, [cluster?.status, params.id]);

  // Auto-scroll log terminal to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [installLogs]);

  useEffect(() => {
    if (activeTab === "monitoring" && !hasFetchedHistory.current) {
      if (cluster && (cluster.status === 'RUNNING' || cluster.kubeconfig)) {
        hasFetchedHistory.current = true;
        fetchHistoryMetrics();
      }
    } else if (activeTab === "alerts") {
      fetchAlertRules();
    }
  }, [activeTab, cluster]);

  const fetchHistoryMetrics = async (showLoading = true) => {
    try {
      if (showLoading) setLoadingHistory(true);
      const res = await fetch(`/api/user/k3s/${params.id}/metrics/history`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setHistoryMetrics(data);
      }
    } catch (e) {
      console.error("Failed to load history metrics", e);
    } finally {
      if (showLoading) setLoadingHistory(false);
    }
  };

  const fetchCluster = async (isBackground = false) => {
    try {
      const res = await fetch(`/api/user/k3s/${params.id}`, { cache: 'no-store' });
      const data = await res.json();

      if (res.ok) {
        setCluster(data);
        if (data.pricing) setPricing(data.pricing);
        if (data.status === 'RUNNING' || data.kubeconfig) {
          let forceMetrics = false;
          if (data.nodes) {
            const currentRunning = data.nodes.filter((n: any) => n.status === 'RUNNING').length;
            if (runningNodesCountRef.current !== -1 && currentRunning > runningNodesCountRef.current) {
              forceMetrics = true;
            }
            runningNodesCountRef.current = currentRunning;
          }
          
          if (!isBackground || forceMetrics) {
            fetchMetrics(!metrics, forceMetrics);
          }
          if (isBackground && activeTabRef.current === 'monitoring') {
            fetchHistoryMetrics(false);
          }
        }
      } else {
        toast.error(data.error || "Failed to load cluster");
        router.push("/dashboard/k3s");
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  const fetchMetrics = async (showLoading = false, force = false) => {
    try {
      if (showLoading) setLoadingMetrics(true);
      const url = force ? `/api/user/k3s/${params.id}/metrics?force=true` : `/api/user/k3s/${params.id}/metrics`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (e) {
      console.error("Failed to load metrics", e);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const handleDownloadKubeconfig = () => {
    if (!cluster?.kubeconfig) {
      toast.error("Kubeconfig is not ready yet. Please wait for provisioning to finish.");
      return;
    }

    const blob = new Blob([cluster.kubeconfig], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cluster.name}-kubeconfig.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Kubeconfig downloaded");
  };

  const handleRotateCertificates = async () => {
    confirmModalAction(
      "Rotate Certificates",
      "Are you sure you want to rotate control plane certificates? This will restart the K3s service and may cause a brief API downtime.",
      "warning",
      async () => {
        setIsRotating(true);
        try {
          const res = await fetch(`/api/user/k3s/${params.id}/rotate`, { method: "POST" });
          if (!res.ok) throw new Error(await res.text());
          toast.success("Certificates rotated successfully! You can now download the new kubeconfig.");
          fetchCluster(); // Refresh to get the new kubeconfig
        } catch (err: any) {
          toast.error(err.message || "Failed to rotate certificates");
        } finally {
          setIsRotating(false);
        }
      }
    );
  };

  const confirmModalAction = (title: string, message: string, actionType: "danger" | "warning" | "info", onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      actionType,
      onConfirm
    });
  };

  const handleReinstallCluster = async () => {
    confirmModalAction(
      "Reinstall Cluster",
      "Are you sure you want to reinstall this cluster? ALL DATA IN THE CLUSTER WILL BE WIPED, including deployments and volumes.",
      "danger",
      async () => {
        setIsReinstalling(true);
        try {
          const res = await fetch(`/api/user/k3s/${params.id}/reinstall`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ version: reinstallVersion })
          });
          if (!res.ok) throw new Error(await res.text());
          toast.success("Cluster reinstalled successfully!");
          fetchCluster(); // Refresh data
        } catch (err: any) {
          toast.error(err.message || "Failed to reinstall cluster");
        } finally {
          setIsReinstalling(false);
        }
      }
    );
  };

  const handleSaveName = async () => {
    if (!editClusterName.trim()) {
      toast.error("Cluster name cannot be empty");
      return;
    }

    setIsSavingName(true);
    try {
      const res = await fetch(`/api/user/k3s/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editClusterName })
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Cluster name updated successfully!");
      fetchCluster();
    } catch (err: any) {
      toast.error(err.message || "Failed to update name");
    } finally {
      setIsSavingName(false);
    }
  };

  const handleTerminateCluster = async () => {
    confirmModalAction(
      "Terminate Cluster",
      "Are you sure you want to completely terminate this Kubernetes cluster? All master and worker nodes will be destroyed, data will be wiped, and IP addresses will be released. This action CANNOT be undone.",
      "danger",
      async () => {
        setIsTerminating(true);
        try {
          const res = await fetch(`/api/user/k3s/${params.id}`, { method: "DELETE" });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to terminate cluster");
          toast.success("Cluster terminated successfully!");
          router.push("/dashboard/k3s");
        } catch (err: any) {
          toast.error(err.message || "Failed to terminate cluster");
        } finally {
          setIsTerminating(false);
        }
      }
    );
  };

  const handleNodePowerAction = async (vpsId: number, action: "start" | "reboot" | "shutdown" | "stop") => {
    confirmModalAction(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Node`,
      `Are you sure you want to ${action} this node?`,
      action === "shutdown" ? "danger" : "warning",
      async () => {
        // Optimistic UI update — flip status immediately so buttons respond without refresh
        const optimisticStatus = action === "shutdown" || action === "stop" ? "STOPPED" : "RUNNING";
        setCluster((prev: any) => prev ? {
          ...prev,
          nodes: prev.nodes.map((n: any) => n.id === vpsId ? { ...n, status: optimisticStatus } : n)
        } : prev);

        toast.promise(
          fetch("/api/user/vps/action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ vpsId, action })
          }).then(async res => {
            if (!res.ok) {
              // Revert optimistic update on failure
              setCluster((prev: any) => prev ? {
                ...prev,
                nodes: prev.nodes.map((n: any) => n.id === vpsId ? {
                  ...n,
                  status: action === "shutdown" ? "RUNNING" : "STOPPED"
                } : n)
              } : prev);
              throw new Error((await res.json()).error || "Failed");
            }
            // After success, re-fetch cluster to get real status from Proxmox
            setTimeout(() => fetchCluster(true), 3000);
          }),
          {
            loading: `Sending ${action} command...`,
            success: `Node successfully commanded to ${action}.`,
            error: `Failed to ${action} node.`
          }
        );
      }
    );
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center">
        <RefreshCw className="w-10 h-10 text-cyan-500 animate-spin" />
      </div>
    );
  }

  const openConsole = async (vpsId: number) => {
    try {
      const res = await fetch("/api/user/vps/console", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vpsId }),
      });
      const data = await res.json();
      if (res.ok && data.consolePageUrl) {
        const width = 1024, height = 768;
        const left = (window.innerWidth / 2) - (width / 2);
        const top = (window.innerHeight / 2) - (height / 2);
        window.open(data.consolePageUrl, `_blank`, `toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes,copyhistory=no,width=${width},height=${height},top=${top},left=${left}`);
      } else {
        toast.error(data.error || "Failed to open console");
      }
    } catch (e) {
      toast.error("Failed to open console");
    }
  };

  const getK8sRole = (hostname: string, dbRole: string) => {
    if (!metrics?.k8sNodes) return dbRole || "WORKER";
    const kNode = metrics.k8sNodes.find((n: any) => n.hostname?.toLowerCase() === hostname?.toLowerCase());
    if (!kNode || !kNode.labels) return dbRole || "WORKER";

    const roleKeys = Object.keys(kNode.labels).filter(k => k.startsWith('node-role.kubernetes.io/'));
    if (roleKeys.length > 0) {
      return roleKeys.map(k => k.replace('node-role.kubernetes.io/', '')).join(', ');
    }
    return '<none>';
  };

  if (!cluster) return null;

  return (
    <>
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn("border rounded-3xl p-6 max-w-md w-full shadow-md relative overflow-hidden", isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-slate-200")}
            >
              <h3 className={cn(
                "text-xl font-bold mb-3 flex items-center gap-2",
                confirmModal.actionType === "danger" ? "text-red-400" :
                  confirmModal.actionType === "warning" ? "text-orange-400" : "text-cyan-400"
              )}>
                <AlertTriangle className="w-5 h-5" />
                {confirmModal.title}
              </h3>
              <p className={cn("text-sm mb-8 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>{confirmModal.message}</p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className={cn("px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-white/5 transition-colors", isDark ? "text-white" : "text-slate-900")}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    confirmModal.onConfirm();
                  }}
                  className={cn(
                    "px-5 py-2.5 text-white font-bold rounded-xl shadow-lg transition-all",
                    confirmModal.actionType === "danger" ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 shadow-red-500/20" :
                      confirmModal.actionType === "warning" ? "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 shadow-orange-500/20" :
                        "bg-cyan-600 hover:bg-cyan-700 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]"
                  )}
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isGuideModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn("border rounded-3xl p-6 max-w-2xl w-full shadow-md relative overflow-hidden", isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-slate-200")}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className={cn("text-xl font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                  <Terminal className="w-5 h-5 text-cyan-400" />
                  How to Connect to K3s
                </h3>
                <button
                  onClick={() => setIsGuideModalOpen(false)}
                  className={cn("p-2 hover:text-white rounded-full hover:bg-white/5 transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}
                >
                  <Box className="w-5 h-5 rotate-45" /> {/* Use Box rotated or simple X icon */}
                </button>
              </div>

              <div className={cn("flex gap-2 mb-6 border-b pb-2", isDark ? "border-white/10" : "border-slate-200")}>
                {(["windows", "linux", "mac"] as const).map((os) => (
                  <button
                    key={os}
                    onClick={() => setGuideOs(os)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize",
                      guideOs === os
                        ? "bg-cyan-500/20 text-cyan-400"
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {os === "mac" ? "macOS" : os}
                  </button>
                ))}
              </div>

              <div className={cn("space-y-4 text-sm", isDark ? "text-zinc-300" : "text-slate-500")}>
                <p>1. <strong>Download</strong> your Kubeconfig file using the <span className="text-cyan-400 font-semibold">Download Kubeconfig</span> button.</p>
                <p>2. If you don&apos;t have <code>kubectl</code> installed yet, you can <a href="https://kubernetes.io/docs/tasks/tools/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-bold">download it here</a>.</p>
                <p>3. Follow the OS specific instructions below to use it with <code>kubectl</code>:</p>

                <div className={cn("border p-4 rounded-xl font-mono text-xs overflow-x-auto", isDark ? "bg-white/[0.02] border-white/5 text-zinc-400" : "bg-white border-slate-200 text-slate-500")}>
                  {guideOs === "windows" && (
                    <div className="space-y-3">
                      <p># 1. Place the downloaded file in your user directory</p>
                      <p className="text-cyan-400">C:\\Users\\YourUsername\\.kube\\config</p>
                      <p># 2. Or set the KUBECONFIG environment variable (PowerShell)</p>
                      <p className="text-cyan-400">$env:KUBECONFIG="C:\\path\\to\\downloaded-kubeconfig.yaml"</p>
                      <p># 3. Test your connection</p>
                      <p className={cn("", isDark ? "text-white" : "text-slate-900")}>kubectl get nodes</p>
                    </div>
                  )}
                  {guideOs === "linux" && (
                    <div className="space-y-3">
                      <p># 1. Create .kube directory and copy the file</p>
                      <p className="text-cyan-400">mkdir -p ~/.kube<br />cp ~/Downloads/*-kubeconfig.yaml ~/.kube/config<br />chmod 600 ~/.kube/config</p>
                      <p># 2. Or set the KUBECONFIG environment variable</p>
                      <p className="text-cyan-400">export KUBECONFIG=~/Downloads/downloaded-kubeconfig.yaml</p>
                      <p># 3. Test your connection</p>
                      <p className={cn("", isDark ? "text-white" : "text-slate-900")}>kubectl get nodes</p>
                    </div>
                  )}
                  {guideOs === "mac" && (
                    <div className="space-y-3">
                      <p># 1. Create .kube directory and copy the file</p>
                      <p className="text-cyan-400">mkdir -p ~/.kube<br />cp ~/Downloads/*-kubeconfig.yaml ~/.kube/config<br />chmod 600 ~/.kube/config</p>
                      <p># 2. Or set the KUBECONFIG environment variable</p>
                      <p className="text-cyan-400">export KUBECONFIG=~/Downloads/downloaded-kubeconfig.yaml</p>
                      <p># 3. Test your connection</p>
                      <p className={cn("", isDark ? "text-white" : "text-slate-900")}>kubectl get nodes</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end mt-8">
                <button
                  onClick={() => setIsGuideModalOpen(false)}
                  className={cn("px-5 py-2.5 bg-white/10 hover:bg-white/20 font-bold rounded-xl transition-colors", isDark ? "text-white" : "text-slate-900")}
                >
                  Close Guide
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="w-full space-y-4 md:space-y-6 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 overflow-x-hidden">

        {(() => {
          const masterNode = cluster.nodes?.find((n: any) => n.kubernetesRole === 'MASTER');
          const isPendingPayment = masterNode?.status === 'PENDING_PAYMENT';
          const isDeploying = ['PENDING', 'PROVISIONING'].includes(cluster.status) || ['PENDING', 'PROVISIONING'].includes(masterNode?.status);

          if (isPendingPayment) {
            return (
              <div className={cn("flex flex-col items-center justify-center py-24 border rounded-3xl shadow-md relative overflow-hidden mt-8", isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-slate-200")}>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-cyan-500/10"></div>
                <div className="relative z-10 flex flex-col items-center text-center px-4">
                  <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 border border-blue-500/30">
                    <CreditCard className="w-12 h-12 text-blue-400" />
                  </div>
                  <h2 className={cn("text-3xl font-bold mb-3", isDark ? "text-white" : "text-slate-900")}>Menunggu Pembayaran</h2>
                  <p className={cn("max-w-md mx-auto mb-8", isDark ? "text-zinc-400" : "text-slate-500")}>
                    Cluster ini masih menunggu pembayaran untuk dapat diprovisioning. Silakan selesaikan pembayaran tagihan Anda.
                  </p>
                  <button
                    onClick={() => router.push("/dashboard/billing")}
                    className={cn("px-6 py-3 bg-blue-500 hover:bg-blue-600 font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20", isDark ? "text-white" : "text-slate-900")}
                  >
                    Lihat Tagihan
                  </button>
                </div>
              </div>
            );
          }

          if (isDeploying) {
            return (
              <div className={cn("w-full border rounded-3xl shadow-md relative overflow-hidden mt-8 p-6 md:p-10", isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-slate-200")}>
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-blue-500/3 to-transparent pointer-events-none"></div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-20 h-20 mb-6 relative">
                    <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-cyan-400 animate-spin"></div>
                    <div className="absolute inset-2.5 rounded-full border-b-2 border-l-2 border-blue-400 animate-[spin_2s_linear_reverse]"></div>
                    <Server className="w-9 h-9 text-cyan-400 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <h2 className={cn("text-2xl md:text-3xl font-bold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Deploying Your Cluster</h2>
                  <p className={cn("text-sm text-center mb-6 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>
                    Installing Kubernetes {cluster.version}. This usually takes 5–10 minutes.
                  </p>

                  {/* Status badges */}
                  <div className="flex flex-wrap justify-center gap-3 mb-8">
                    <span className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border",
                      ['RUNNING', 'INSTALLING_K3S', 'WAITING_FOR_SSH'].includes(cluster.status)
                        ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                        : "bg-white/5 text-zinc-500 border-white/10"
                    )}>
                      <CheckCircle className="w-3.5 h-3.5" /> VM Provisioned
                    </span>
                    <span className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border",
                      ['INSTALLING_K3S', 'RUNNING'].includes(cluster.status)
                        ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                        : cluster.status === 'WAITING_FOR_SSH'
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-white/5 text-zinc-500 border-white/10"
                    )}>
                      {['INSTALLING_K3S', 'RUNNING'].includes(cluster.status)
                        ? <CheckCircle className="w-3.5 h-3.5" />
                        : <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                      SSH Connected
                    </span>
                    <span className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border",
                      cluster.status === 'INSTALLING_K3S'
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-white/5 text-zinc-500 border-white/10"
                    )}>
                      {cluster.status === 'INSTALLING_K3S'
                        ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        : <div className="w-3.5 h-3.5 rounded-full border-2 border-current opacity-50" />}
                      Installing K3s
                    </span>
                  </div>

                  {/* Realtime log terminal */}
                  <div className="w-full max-w-3xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Terminal className="w-4 h-4 text-cyan-400" />
                      <span className={cn("text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-400" : "text-slate-500")}>Live Provisioning Log</span>
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse ml-auto" />
                      <span className={cn("text-[10px]", isDark ? "text-zinc-500" : "text-slate-500")}>LIVE</span>
                    </div>
                    <div className={cn("border rounded-2xl p-4 h-64 overflow-auto font-mono text-xs shadow-inner custom-scrollbar", isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-slate-200")}>
                      {installLogs.length === 0 ? (
                        <div className={cn("italic", isDark ? "text-zinc-600" : "text-slate-900")}>Waiting for provisioning to start...</div>
                      ) : (
                        <div className="flex flex-col min-w-max">
                          {installLogs.map((entry, i) => (
                            <div key={i} className="flex gap-3 hover:bg-white/5 px-2 py-0.5 rounded transition-colors group">
                              <span className={cn("shrink-0 select-none opacity-60 group-hover:opacity-100 transition-opacity", isDark ? "text-zinc-600" : "text-slate-900")}>[{new Date(entry.ts).toLocaleTimeString()}]</span>
                              <span className={cn(
                                "whitespace-pre",
                                entry.msg.startsWith('ERROR') ? "text-red-400" :
                                  entry.msg.startsWith('Warning') ? "text-amber-400" :
                                    entry.msg.includes('successfully') || entry.msg.includes('RUNNING') ? "text-green-400" :
                                      "text-zinc-300"
                              )}>
                                {entry.msg}
                              </span>
                            </div>
                          ))}
                          <div ref={logEndRef} className="h-4" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
            }

          return (
            <>
              <Link href="/dashboard/k3s" className={cn("inline-flex items-center hover:text-white transition-colors font-medium text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
                <ChevronLeft className="w-4 h-4 mr-2" /> Back to Kubernetes Clusters
              </Link>
              {/* Header */}
              <div className={cn("flex flex-col xl:flex-row xl:items-center justify-between gap-4 border rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-sm relative overflow-hidden", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200")}>

                <div className="flex flex-wrap sm:flex-nowrap items-start sm:items-center gap-3 sm:gap-4 relative z-10 w-full xl:w-auto">
                  <div className="w-14 h-14 rounded-2xl border border-cyan-500/20 flex items-center justify-center shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img referrerPolicy="no-referrer" src="https://cdn.simpleicons.org/kubernetes/06b6d4" alt="Kubernetes" className="w-7 h-7" loading="lazy" decoding="async" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className={cn("text-2xl font-bold tracking-tight break-all", isDark ? "text-white" : "text-slate-900")}>{cluster.name}</h1>
                    <span className={cn(
                      "mt-1 inline-block px-2.5 py-0.5 rounded-full text-xs font-bold tracking-widest uppercase border",
                      isSuspended ? "bg-orange-500/20 text-orange-400 border-orange-500/30" : (cluster.status === "RUNNING" ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20")
                    )}>
                      {isSuspended ? "SUSPENDED" : cluster.status}
                    </span>
                  </div>
                </div>

                <div className="mt-4 xl:mt-0 xl:ml-6 flex-1 min-w-0 order-3 xl:order-none w-full xl:w-auto">
                  <div className={cn("border rounded-xl px-4 py-2.5 overflow-x-auto scrollbar-hide w-full shadow-inner", isDark ? "bg-black/20 border-white/5" : "bg-slate-50/50 border-slate-200")}>
                    <div className={cn("text-[10px] uppercase font-bold tracking-widest mb-0.5", isDark ? "text-zinc-500" : "text-slate-500")}>API Endpoint</div>
                    <div className="text-cyan-400 font-mono text-sm whitespace-nowrap">{cluster.endpoint || "Pending..."}</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3 relative z-10 w-full xl:w-auto mt-2 xl:mt-0">
                  {/* Master node power actions */}
                  {(() => {
                    const master = cluster.nodes?.find((n: any) => n.kubernetesRole === 'MASTER' || !n.kubernetesRole);
                    const isRunning = master?.liveStatus ? master.liveStatus.status === 'running' : master?.status === 'RUNNING';
                    const isTerminated = cluster.status === 'TERMINATED';
                    if (!master) return null;
                    return (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleNodePowerAction(master.id, "start")}
                          disabled={isRunning || isTerminated || isSuspended}
                          title="Start Cluster"
                          className="p-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleNodePowerAction(master.id, "shutdown")}
                          disabled={!isRunning || isTerminated || isSuspended}
                          title="Graceful Shutdown"
                          className="p-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleNodePowerAction(master.id, "stop")}
                          disabled={!isRunning || isTerminated || isSuspended}
                          title="Force Stop"
                          className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Square className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleNodePowerAction(master.id, "reboot")}
                          disabled={!isRunning || isTerminated || isSuspended}
                          title="Restart Cluster"
                          className="p-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openConsole(master.id)}
                          disabled={isTerminated}
                          title="Open Console"
                          className={cn("p-2.5 bg-cyan-500 hover:bg-cyan-600 rounded-xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed", isDark ? "text-white" : "text-slate-900")}
                        >
                          <Terminal className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })()}
                  <button
                    onClick={() => setIsGuideModalOpen(true)}
                    className={cn("flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border font-medium rounded-xl text-sm transition-all shadow-inner", isDark ? "border-white/10 text-white" : "border-slate-200 text-slate-900")}
                  >
                    <Terminal className="w-4 h-4 text-cyan-400" />
                    How to Connect
                  </button>
                  <button
                    onClick={handleDownloadKubeconfig}
                    className={cn("flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border font-medium rounded-xl text-sm transition-all shadow-inner", isDark ? "border-white/10 text-white" : "border-slate-200 text-slate-900")}
                  >
                    <Download className="w-4 h-4 text-cyan-400" />
                    Kubeconfig
                  </button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {[
                  { id: "overview", label: "Overview", icon: Box },
                  { id: "monitoring", label: "Monitoring", icon: Activity },
                  { id: "nodes", label: "Nodes", icon: Server },
                  { id: "logs", label: "Logs", icon: Terminal },
                  { id: "settings", label: "Settings", icon: Settings },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "px-5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2",
                      activeTab === tab.id
                        ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                        : "bg-white/5 text-zinc-400 border border-transparent hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-cyan-400" : "text-zinc-500")} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === "overview" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    <div className={cn("border rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-sm relative overflow-hidden group", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200")}>
                      <h2 className={cn("text-base md:text-lg font-bold mb-4 md:mb-6 flex items-center gap-2 relative z-10", isDark ? "text-white" : "text-slate-900")}>
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                          <Activity className="w-4 h-4 text-cyan-400" />
                        </div>
                        Cluster Resource Quota
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 relative z-10">
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className={cn("font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>CPU Allocation</span>
                            <span className={cn("font-bold bg-white/5 px-2 py-0.5 rounded-md text-xs border", isDark ? "text-white border-white/5" : "text-slate-900 border-slate-200")}>
                              {`${metrics?.cpu?.usage || 0} / ${metrics?.cpu?.capacity || 0} Cores`}
                            </span>
                          </div>
                          <div className={cn("w-full h-2.5 bg-black/40 rounded-full overflow-hidden shadow-inner border", isDark ? "border-white/5" : "border-slate-200")}>
                            <div
                              className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full relative"
                              style={{ width: `${Math.min(100, ((metrics?.cpu?.usage || 0) / (metrics?.cpu?.capacity || 1)) * 100)}%` }}
                            >
                              <div className="absolute inset-0 bg-white/20 w-full h-full animate-pulse" />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className={cn("font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Memory Allocation</span>
                            <span className={cn("font-bold bg-white/5 px-2 py-0.5 rounded-md text-xs border", isDark ? "text-white border-white/5" : "text-slate-900 border-slate-200")}>
                              {`${metrics?.memory?.usageGb || 0} / ${metrics?.memory?.capacityGb || 0} GB`}
                            </span>
                          </div>
                          <div className={cn("w-full h-2.5 bg-black/40 rounded-full overflow-hidden shadow-inner border", isDark ? "border-white/5" : "border-slate-200")}>
                            <div
                              className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full relative"
                              style={{ width: `${Math.min(100, (parseFloat(metrics?.memory?.usageGb || "0") / parseFloat(metrics?.memory?.capacityGb || "1")) * 100)}%` }}
                            >
                              <div className="absolute inset-0 bg-white/20 w-full h-full animate-pulse" />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className={cn("font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Pod Density Limit</span>
                            <span className={cn("font-bold bg-white/5 px-2 py-0.5 rounded-md text-xs border", isDark ? "text-white border-white/5" : "text-slate-900 border-slate-200")}>
                              {`${metrics?.pods?.usage || 0} / ${metrics?.pods?.capacity || 0} Max`}
                            </span>
                          </div>
                          <div className={cn("w-full h-2.5 bg-black/40 rounded-full overflow-hidden shadow-inner border", isDark ? "border-white/5" : "border-slate-200")}>
                            <div
                              className="h-full bg-gradient-to-r from-purple-600 to-cyan-400 rounded-full relative"
                              style={{ width: `${Math.min(100, ((metrics?.pods?.usage || 0) / (metrics?.pods?.capacity || 1)) * 100)}%` }}
                            >
                              <div className="absolute inset-0 bg-white/20 w-full h-full animate-pulse" />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className={cn("font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Storage Allocation</span>
                            <span className={cn("font-bold bg-white/5 px-2 py-0.5 rounded-md text-xs border", isDark ? "text-white border-white/5" : "text-slate-900 border-slate-200")}>
                              {`${metrics?.storage?.usageGb || 0} / ${metrics?.storage?.capacityGb || 0} GB`}
                            </span>
                          </div>
                          <div className={cn("w-full h-2.5 bg-black/40 rounded-full overflow-hidden shadow-inner border", isDark ? "border-white/5" : "border-slate-200")}>
                            <div
                              className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full relative"
                              style={{ width: `${Math.min(100, (parseFloat(metrics?.storage?.usageGb || "0") / parseFloat(metrics?.storage?.capacityGb || "1")) * 100)}%` }}
                            >
                              <div className="absolute inset-0 bg-white/20 w-full h-full animate-pulse" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={cn("border rounded-3xl p-6 shadow-sm relative overflow-hidden group", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200")}>
                      <h2 className={cn("text-lg font-bold mb-6 flex items-center gap-2 relative z-10", isDark ? "text-white" : "text-slate-900")}>
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                          <ShieldCheck className="w-4 h-4 text-cyan-400" />
                        </div>
                        Control Plane Health
                      </h2>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10">
                        {cluster.status !== 'RUNNING' || !metrics ? (
                          // Cluster not running or metrics not available: show skeleton/unavailable state
                          ["kube-apiserver", "etcd", "scheduler", "controller-mgr"].map((component) => (
                            <div key={component} className={cn("border rounded-2xl p-5 text-center flex flex-col items-center justify-center", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200")}>
                              <div className="w-3.5 h-3.5 rounded-full mx-auto mb-3 bg-zinc-700" />
                              <div className="text-sm font-semibold text-white/90">{component}</div>
                              <div className={cn("text-[10px] mt-1.5 uppercase tracking-widest font-bold", isDark ? "text-zinc-600" : "text-slate-900")}>
                                {cluster.status === 'RUNNING' ? 'Loading...' : 'N/A'}
                              </div>
                            </div>
                          ))
                        ) : (
                          ["kube-apiserver", "etcd", "scheduler", "controller-mgr"].map((component) => {
                            const isHealthy = metrics?.components?.[component];
                            return (
                              <div key={component} className={cn("hover:bg-white/[0.04] transition-colors border hover:border-white/10 rounded-2xl p-5 text-center flex flex-col items-center justify-center", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200")}>
                                <div className={cn(
                                  "w-3.5 h-3.5 rounded-full mx-auto mb-3",
                                  isHealthy === true ? "bg-cyan-500 shadow-[0_0_15px_rgba(16,185,129,0.7)]" : 
                                  isHealthy === false ? "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.7)] animate-pulse" : 
                                  "bg-zinc-700"
                                )} />
                                <div className="text-sm font-semibold text-white/90">{component}</div>
                                <div className={cn(
                                  "text-[10px] mt-1.5 uppercase tracking-widest font-bold",
                                  isHealthy === true ? "text-cyan-400/80" : 
                                  isHealthy === false ? "text-red-400/80" : 
                                  "text-zinc-500"
                                )}>
                                  {isHealthy === true ? "Healthy" : 
                                   isHealthy === false ? "Unhealthy" : "No Data"}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className={cn("border rounded-3xl p-6 shadow-sm relative overflow-hidden group h-full", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200")}>
                      <h2 className={cn("text-lg font-bold mb-6 relative z-10 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                          <Server className="w-4 h-4 text-cyan-400" />
                        </div>
                        Cluster Info
                      </h2>
                      <div className="space-y-5 relative z-10">
                        <div className={cn("flex justify-between items-center p-3 rounded-xl border", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200")}>
                          <span className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Version</span>
                          <span className={cn("font-mono text-sm bg-white/5 px-2 py-1 rounded-md", isDark ? "text-white" : "text-slate-900")}>{cluster.version}</span>
                        </div>
                        <div className={cn("flex justify-between items-center p-3 rounded-xl border", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200")}>
                          <span className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Total Nodes</span>
                          <div className="text-right">
                            <span className={cn("text-sm font-bold block", isDark ? "text-white" : "text-slate-900")}>{cluster.nodes?.length || 0} Nodes</span>
                            <span className={cn("text-[10px] uppercase font-bold", isDark ? "text-zinc-500" : "text-slate-500")}>
                              {cluster.nodes?.filter((n: any) => n.kubernetesRole === 'MASTER').length || 0} Master &middot; {cluster.nodes?.filter((n: any) => n.kubernetesRole !== 'MASTER').length || 0} Worker
                            </span>
                          </div>
                        </div>
                        <div className={cn("flex justify-between items-center p-3 rounded-xl border", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200")}>
                          <span className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Network Plugin</span>
                          <span className={cn("text-sm font-medium", isDark ? "text-white" : "text-slate-900")}>Flannel</span>
                        </div>
                        <div className={cn("flex justify-between items-center p-3 rounded-xl border", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200")}>
                          <span className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Created</span>
                          <span className={cn("text-sm font-medium", isDark ? "text-white" : "text-slate-900")}>{new Date(cluster.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "monitoring" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className={cn("border rounded-3xl p-6 shadow-sm", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200")}>
                    <h2 className={cn("text-lg font-bold mb-6 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                      <Cpu className="w-5 h-5 text-blue-400" />
                      CPU Usage (Last 1 Hour)
                    </h2>
                    <div className="h-72 w-full">
                      {loadingHistory && !historyMetrics ? (
                        <div className={cn("w-full h-full flex flex-col items-center justify-center gap-3", isDark ? "text-zinc-400" : "text-slate-500")}>
                          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm">Fetching historical data from hypervisor...</span>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height={250} minWidth={1} minHeight={1}>
                          <AreaChart data={historyMetrics?.cpu || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis dataKey="time" stroke="#334155" tick={{ fill: '#64748b', fontSize: 11 }} minTickGap={30} />
                            <YAxis stroke="#334155" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(val) => `${val}%`} width={90} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                            <Area type="monotone" dataKey="usage" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCpu)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  <div className={cn("border rounded-3xl p-6 shadow-sm", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200")}>
                    <h2 className={cn("text-lg font-bold mb-6 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                      <HardDrive className="w-5 h-5 text-cyan-400" />
                      Memory Usage (Last 1 Hour)
                    </h2>
                    <div className="h-72 w-full">
                      {loadingHistory && !historyMetrics ? (
                        <div className={cn("w-full h-full flex flex-col items-center justify-center gap-3", isDark ? "text-zinc-400" : "text-slate-500")}>
                          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm">Fetching historical data from hypervisor...</span>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height={250} minWidth={1} minHeight={1}>
                          <AreaChart data={historyMetrics?.memory || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis dataKey="time" stroke="#334155" tick={{ fill: '#64748b', fontSize: 11 }} minTickGap={30} />
                            <YAxis stroke="#334155" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(val) => `${val}%`} width={90} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                            <Area type="monotone" dataKey="usage" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorMem)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "nodes" && (
                <div className={cn("border rounded-3xl overflow-hidden shadow-sm", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200")}>
                  <div className={cn("p-4 sm:p-6 border-b flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-3 sm:gap-0", isDark ? "border-white/5" : "border-slate-200")}>
                    <h2 className={cn("text-base sm:text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>Cluster Nodes (VMs)</h2>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      {selectedNodes.length > 0 && (
                        <div className="flex items-center gap-1.5 md:gap-2 animate-in fade-in slide-in-from-right-4 duration-300 flex-wrap shrink-0">
                          <span className="text-xs text-cyan-400 font-bold bg-cyan-500/10 px-2 py-1 rounded-md mr-1 md:mr-2">{selectedNodes.length} selected</span>
                          {cluster.nodes.filter((n: any) => selectedNodes.includes(n.id)).some((n: any) => n.status !== "RUNNING") && (
                            <button onClick={() => handleBulkNodeAction('start')} disabled={bulkLoading || isSuspended} className="p-1.5 md:px-3 md:py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors text-xs font-medium flex items-center gap-1.5 disabled:opacity-50 border border-green-500/20">
                              <Play className="w-3.5 h-3.5" /> <span className="hidden md:inline">Start</span>
                            </button>
                          )}
                          {cluster.nodes.filter((n: any) => selectedNodes.includes(n.id)).some((n: any) => n.status === "RUNNING") && (
                            <>
                              <button onClick={() => handleBulkNodeAction('shutdown')} disabled={bulkLoading || isSuspended} className="p-1.5 md:px-3 md:py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 transition-colors text-xs font-medium flex items-center gap-1.5 disabled:opacity-50 border border-orange-500/20">
                                <Power className="w-3.5 h-3.5" /> <span className="hidden md:inline">Shutdown</span>
                              </button>
                              <button onClick={() => handleBulkNodeAction('reboot')} disabled={bulkLoading || isSuspended} className="p-1.5 md:px-3 md:py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-colors text-xs font-medium flex items-center gap-1.5 disabled:opacity-50 border border-cyan-500/20">
                                <RotateCcw className="w-3.5 h-3.5" /> <span className="hidden md:inline">Reboot</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                      {isSuspended ? (
                        <span className={cn("px-3 py-1.5 bg-white/5 rounded-lg text-sm border shrink-0 ml-auto sm:ml-0 cursor-not-allowed", isDark ? "text-zinc-500 border-white/10" : "text-slate-500 border-slate-200")}>
                          + Add Worker Node
                        </span>
                      ) : (
                        <Link href={`/dashboard/checkout?service=kubernetes&action=add_node&cluster_id=${cluster.id}`} className={cn("px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors border shrink-0 ml-auto sm:ml-0", isDark ? "text-white border-white/10" : "text-slate-900 border-slate-200")}>
                          + Add Worker Node
                        </Link>
                      )}
                    </div>
                  </div>
                  {/* Desktop View */}
                  <div className="hidden md:block overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className={cn("bg-white/5 border-b", isDark ? "border-white/5" : "border-slate-200")}>
                          <th className="py-4 pl-6 pr-2 w-14">
                            <button
                              type="button"
                              onClick={() => {
                                const isAllSelected = cluster.nodes.length > 0 && selectedNodes.length === cluster.nodes.length;
                                if (!isAllSelected) {
                                  setSelectedNodes(cluster.nodes.map((n: any) => n.id));
                                } else {
                                  setSelectedNodes([]);
                                }
                              }}
                              className={cn(
                                "w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all duration-200",
                                cluster.nodes.length > 0 && selectedNodes.length === cluster.nodes.length
                                  ? "bg-cyan-400" 
                                  : "bg-black/40 border border-white/10 hover:border-cyan-400/50"
                              )}
                            >
                              <CheckCircle className={cn("w-3.5 h-3.5", cluster.nodes.length > 0 && selectedNodes.length === cluster.nodes.length ? "text-[#0f172a]" : "text-transparent")} />
                            </button>
                          </th>
                          <th className={cn("p-4 text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Hostname</th>
                          <th className={cn("p-4 text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Role</th>
                          <th className={cn("p-4 text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Specs (C/R/D)</th>
                          <th className={cn("p-4 text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Status</th>
                          <th className={cn("p-4 text-xs font-bold uppercase tracking-wider text-right", isDark ? "text-zinc-400" : "text-slate-500")}>Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {cluster.nodes.map((node: any) => (
                          <tr key={node.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="py-4 pl-6 pr-2 align-middle">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!selectedNodes.includes(node.id)) {
                                    setSelectedNodes(prev => [...prev, node.id]);
                                  } else {
                                    setSelectedNodes(prev => prev.filter(id => id !== node.id));
                                  }
                                }}
                                className={cn(
                                  "w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all duration-200",
                                  selectedNodes.includes(node.id)
                                    ? "bg-cyan-400" 
                                    : "bg-black/40 border border-white/10 hover:border-cyan-400/50"
                                )}
                              >
                                <CheckCircle className={cn("w-3.5 h-3.5", selectedNodes.includes(node.id) ? "text-[#0f172a]" : "text-transparent")} />
                              </button>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                                  <SiKubernetes className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>{node.hostname}</div>
                                  <div className={cn("text-xs font-mono", isDark ? "text-zinc-500" : "text-slate-500")}>{node.ipAddress}</div>
                                  {metrics?.k8sNodes?.find((n: any) => n.hostname?.toLowerCase() === node.hostname?.toLowerCase())?.kubeletVersion && (
                                    <div className={cn("text-[10px] mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>
                                      Kubelet: {metrics.k8sNodes.find((n: any) => n.hostname?.toLowerCase() === node.hostname?.toLowerCase()).kubeletVersion}
                                    </div>
                                  )}
                                  {metrics?.k8sNodes?.find((n: any) => n.hostname?.toLowerCase() === node.hostname?.toLowerCase())?.osImage && (
                                    <div className={cn("text-[10px]", isDark ? "text-zinc-400" : "text-slate-500")}>
                                      OS: {metrics.k8sNodes.find((n: any) => n.hostname?.toLowerCase() === node.hostname?.toLowerCase()).osImage}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={cn(
                                "inline-block whitespace-nowrap px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border",
                                getK8sRole(node.hostname, node.kubernetesRole).includes("master") || getK8sRole(node.hostname, node.kubernetesRole).includes("control-plane") || node.kubernetesRole === "MASTER" ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" :
                                  getK8sRole(node.hostname, node.kubernetesRole) === "<none>" ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                              )}>
                                {getK8sRole(node.hostname, node.kubernetesRole)}
                              </span>
                            </td>
                            <td className={cn("p-4 text-sm", isDark ? "text-zinc-300" : "text-slate-500")}>
                              {node.cpuCores}c / {node.ramGb}G / {node.diskGb}G
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2 text-sm">
                                {node.status === "RUNNING" && <><div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" /><span className="text-cyan-400 font-medium">Ready</span></>}
                                {node.status === "INSTALLING_K3S" && <><div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /><span className="text-amber-400 font-medium">Installing K3s...</span></>}
                                {node.status === "FAILED" && <><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-red-400 font-medium">Failed</span></>}
                                {!["RUNNING", "INSTALLING_K3S", "FAILED"].includes(node.status) && <><div className="w-2 h-2 rounded-full bg-zinc-500" /><span className={cn("capitalize", isDark ? "text-zinc-300" : "text-slate-500")}>{node.status.toLowerCase()}</span></>}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-end gap-3">
                                <button
                                  onClick={() => {
                                    const role = getK8sRole(node.hostname, node.kubernetesRole);
                                    setEditRoleModal({
                                      isOpen: true,
                                      nodeName: node.hostname,
                                      currentRole: role === '<none>' ? '' : role,
                                      isUpdating: false
                                    });
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-xs font-bold text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors whitespace-nowrap shrink-0"
                                >
                                  <Settings className="w-3.5 h-3.5" />
                                  Edit Role
                                </button>
                                <Link href={`/dashboard/vps/${node.id}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-xs font-bold text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors whitespace-nowrap shrink-0">
                                  <Server className="w-3.5 h-3.5" />
                                  Manage VM
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile View */}
                  <div className="md:hidden flex flex-col gap-4 p-4">
                    {cluster.nodes.map((node: any) => (
                      <div key={node.id} className={cn("bg-white/5 border rounded-2xl p-4 flex flex-col gap-4 transition-colors", selectedNodes.includes(node.id) ? "border-cyan-500/50" : "border-white/10")}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                if (!selectedNodes.includes(node.id)) {
                                  setSelectedNodes(prev => [...prev, node.id]);
                                } else {
                                  setSelectedNodes(prev => prev.filter(id => id !== node.id));
                                }
                              }}
                              className={cn(
                                "w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-all duration-200 mt-1",
                                selectedNodes.includes(node.id)
                                  ? "bg-cyan-400" 
                                  : "bg-black/40 border border-white/10"
                              )}
                            >
                              <CheckCircle className={cn("w-4 h-4", selectedNodes.includes(node.id) ? "text-[#0f172a]" : "text-transparent")} />
                            </button>
                            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 shrink-0">
                              <SiKubernetes className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className={cn("font-bold text-base truncate", isDark ? "text-white" : "text-slate-900")}>{node.hostname}</div>
                              <div className={cn("text-xs font-mono truncate", isDark ? "text-zinc-500" : "text-slate-500")}>{node.ipAddress}</div>
                            </div>
                          </div>
                          <span className={cn(
                            "inline-block whitespace-nowrap px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border shrink-0",
                            getK8sRole(node.hostname, node.kubernetesRole).includes("master") || getK8sRole(node.hostname, node.kubernetesRole).includes("control-plane") || node.kubernetesRole === "MASTER" ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" :
                              getK8sRole(node.hostname, node.kubernetesRole) === "<none>" ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                          )}>
                            {getK8sRole(node.hostname, node.kubernetesRole)}
                          </span>
                        </div>

                        <div className={cn("grid grid-cols-2 gap-2 p-3 rounded-xl border text-xs", isDark ? "bg-black/20 border-white/5 text-zinc-300" : "bg-slate-50/50 border-slate-200 text-slate-500")}>
                          <div>
                            <span className={cn("block text-[10px] uppercase font-bold tracking-widest mb-1", isDark ? "text-zinc-500" : "text-slate-500")}>Specs</span>
                            {node.cpuCores}c / {node.ramGb}G / {node.diskGb}G
                          </div>
                          <div>
                            <span className={cn("block text-[10px] uppercase font-bold tracking-widest mb-1", isDark ? "text-zinc-500" : "text-slate-500")}>Status</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {node.status === "RUNNING" && <><div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" /><span className="text-cyan-400 font-medium">Ready</span></>}
                              {node.status === "INSTALLING_K3S" && <><div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /><span className="text-amber-400 font-medium">Installing...</span></>}
                              {node.status === "FAILED" && <><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-red-400 font-medium">Failed</span></>}
                              {!["RUNNING", "INSTALLING_K3S", "FAILED"].includes(node.status) && <><div className="w-2 h-2 rounded-full bg-zinc-500" /><span className={cn("capitalize", isDark ? "text-zinc-300" : "text-slate-500")}>{node.status.toLowerCase()}</span></>}
                            </div>
                          </div>
                        </div>

                        {(metrics?.k8sNodes?.find((n: any) => n.hostname?.toLowerCase() === node.hostname?.toLowerCase())) && (
                          <div className={cn("text-[10px] bg-black/10 p-2.5 rounded-xl border space-y-1", isDark ? "text-zinc-400 border-white/5" : "text-slate-500 border-slate-200")}>
                            {metrics.k8sNodes.find((n: any) => n.hostname?.toLowerCase() === node.hostname?.toLowerCase()).kubeletVersion && (
                              <div><span className={cn("font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>Kubelet:</span> {metrics.k8sNodes.find((n: any) => n.hostname?.toLowerCase() === node.hostname?.toLowerCase()).kubeletVersion}</div>
                            )}
                            {metrics.k8sNodes.find((n: any) => n.hostname?.toLowerCase() === node.hostname?.toLowerCase()).osImage && (
                              <div><span className={cn("font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>OS:</span> {metrics.k8sNodes.find((n: any) => n.hostname?.toLowerCase() === node.hostname?.toLowerCase()).osImage}</div>
                            )}
                          </div>
                        )}

                        <div className={cn("flex flex-wrap items-center gap-2 pt-2 border-t", isDark ? "border-white/5" : "border-slate-200")}>
                          <div className="flex-1"></div>

                          <button
                            onClick={() => {
                              const role = getK8sRole(node.hostname, node.kubernetesRole);
                              setEditRoleModal({
                                isOpen: true,
                                nodeName: node.hostname,
                                currentRole: role === '<none>' ? '' : role,
                                isUpdating: false
                              });
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-500/10 text-xs font-bold text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors whitespace-nowrap shrink-0"
                          >
                            <Settings className="w-3.5 h-3.5" />
                            Edit Role
                          </button>

                          <Link href={`/dashboard/vps/${node.id}`} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-500/10 text-xs font-bold text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors whitespace-nowrap shrink-0">
                            <Server className="w-3.5 h-3.5" />
                            Manage VM
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "settings" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-500">
                  <div className="lg:col-span-2 space-y-6">
                    <div className={cn("border rounded-3xl p-6 shadow-sm relative overflow-hidden", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200")}>
                      <h2 className={cn("text-lg font-bold mb-6 flex items-center gap-2 relative z-10", isDark ? "text-white" : "text-slate-900")}>
                        <Settings className="w-5 h-5 text-cyan-400" />
                        General Settings
                      </h2>
                      <div className="space-y-5 relative z-10">
                        <div>
                          <label className={cn("block text-sm font-medium mb-2", isDark ? "text-zinc-400" : "text-slate-500")}>Cluster Name</label>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <input type="text" value={editClusterName} onChange={(e) => setEditClusterName(e.target.value)} className={cn("flex-1 w-full bg-white/5 border rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all min-w-0", isDark ? "border-white/10 text-white" : "border-slate-200 text-slate-900")} />
                            <button onClick={handleSaveName} disabled={isSavingName || isSuspended} className={cn("px-5 py-2.5 w-full sm:w-auto bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] flex items-center justify-center gap-2 shrink-0", isDark ? "text-white" : "text-slate-900")}>
                              {isSavingName && <RefreshCw className="w-4 h-4 animate-spin shrink-0" />}
                              Save
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className={cn("block text-sm font-medium mb-2", isDark ? "text-zinc-400" : "text-slate-500")}>Kubernetes Version</label>
                          <input type="text" value={cluster.version} disabled className={cn("w-full bg-white/5 border rounded-xl px-4 py-2.5 cursor-not-allowed font-mono text-sm", isDark ? "border-white/5 text-zinc-500" : "border-slate-200 text-slate-500")} />
                          <p className={cn("text-xs mt-2", isDark ? "text-zinc-500" : "text-slate-500")}>Upgrading the Kubernetes version is managed by the system administrator.</p>
                        </div>
                      </div>
                    </div>

                    <div className={cn("border rounded-3xl p-6 shadow-sm relative overflow-visible", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200")}>
                      <h2 className={cn("text-lg font-bold mb-2 flex items-center gap-2 relative z-10", isDark ? "text-white" : "text-slate-900")}>
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        Delete Cluster
                      </h2>
                      <p className={cn("text-sm mb-6 relative z-10", isDark ? "text-zinc-400" : "text-slate-500")}>These actions are permanent and cannot be undone. Proceed with extreme caution.</p>

                      <div className="space-y-4 relative z-10">
                        <div className={cn("flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 bg-white/5 hover:bg-white/10 border transition-colors rounded-2xl gap-4", isDark ? "border-white/10" : "border-slate-200")}>
                          <div>
                            <h3 className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>Reinstall Kubernetes Cluster</h3>
                            <p className={cn("text-xs mt-1.5 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>Wipe the current K3s installation and reinstall with a fresh state. All cluster data will be lost.</p>
                            <div className="mt-3">
                              <Select
                                value={reinstallVersion}
                                onChange={(val) => setReinstallVersion(val)}
                                options={K3S_VERSIONS.map(v => ({ value: v.id, label: v.name }))}
                                placeholder="Select version"
                                className={cn("w-[220px]", isDark ? "bg-white/[0.02]" : "bg-white")}
                              />
                            </div>
                          </div>
                          <button onClick={handleReinstallCluster} disabled={isReinstalling || isSuspended} className={cn("px-5 py-2.5 w-full sm:w-auto justify-center bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                            {isReinstalling ? <RefreshCw className="w-4 h-4 animate-spin shrink-0" /> : <RefreshCw className="w-4 h-4 shrink-0" />}
                            {isReinstalling ? "Reinstalling..." : "Reinstall Cluster"}
                          </button>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 transition-colors rounded-2xl gap-4">
                          <div>
                            <h3 className="text-red-400 font-bold text-sm">Delete Cluster</h3>
                            <p className={cn("text-xs mt-1.5 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>Completely destroy this cluster and all its nodes. All data will be permanently wiped and IP addresses released. Final usage will be billed for Pay-As-You-Go instances.</p>
                          </div>
                          <button onClick={handleTerminateCluster} disabled={isTerminating} className="px-5 py-2.5 w-full sm:w-auto justify-center bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-red-500 border border-red-500/20 text-sm font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2">
                            {isTerminating ? <RefreshCw className="w-4 h-4 animate-spin shrink-0" /> : <Trash2 className="w-4 h-4 shrink-0" />}
                            {isTerminating ? "Deleting..." : "Delete Cluster"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className={cn("border rounded-3xl p-6 shadow-sm", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200")}>
                      <h2 className={cn("text-lg font-bold mb-6", isDark ? "text-white" : "text-slate-900")}>Security Options</h2>
                      <div className="space-y-4">
                        <div className={cn("p-5 bg-white/5 border rounded-2xl hover:border-cyan-500/30 transition-colors group", isDark ? "border-white/10" : "border-slate-200")}>
                          <h3 className={cn("font-bold text-sm group-hover:text-cyan-400 transition-colors", isDark ? "text-white" : "text-slate-900")}>Rotate Certificates</h3>
                          <p className={cn("text-xs mt-1.5 mb-5 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>Rotate all K3s control plane certificates. You will need to download a new kubeconfig file.</p>
                          <button onClick={handleRotateCertificates} disabled={isRotating || isSuspended} className={cn("w-full px-4 py-2.5 bg-white/5 hover:bg-cyan-500/10 border hover:border-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium rounded-xl transition-all flex items-center justify-center gap-2", isDark ? "border-white/10 text-white" : "border-slate-200 text-slate-900")}>
                            <RefreshCw className={cn("w-4 h-4 text-cyan-400", isRotating && "animate-spin")} />
                            {isRotating ? "Rotating..." : "Rotate Now"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Logs Tab */}
              {activeTab === "logs" && (
                <div className={cn("bg-[#020917] border rounded-2xl shadow-sm overflow-hidden", isDark ? "border-white/5" : "border-slate-200")}>
                  {/* Terminal header bar */}
                  <div className={cn("flex items-center gap-2 px-4 py-3 bg-white/[0.03] border-b", isDark ? "border-white/5" : "border-slate-200")}>
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/70" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                      <div className="w-3 h-3 rounded-full bg-green-500/70" />
                    </div>
                    <span className={cn("text-xs font-mono mx-auto", isDark ? "text-zinc-500" : "text-slate-500")}>
                      provisioning-log — {cluster.name}
                    </span>
                    {['PENDING', 'PROVISIONING', 'WAITING_FOR_SSH', 'INSTALLING_K3S'].includes(cluster.status) ? (
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        LIVE
                      </span>
                    ) : (
                      <span className={cn("flex items-center gap-1.5 text-[10px] font-bold", isDark ? "text-zinc-500" : "text-slate-500")}>
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                        {cluster.status}
                      </span>
                    )}
                  </div>

                  {/* Terminal body */}
                  <div
                    className={cn("p-4 md:p-6 h-[60vh] overflow-auto font-mono text-sm leading-relaxed custom-scrollbar", isDark ? "bg-white/[0.02]" : "bg-white")}
                    style={{ scrollBehavior: 'smooth' }}
                  >
                    {installLogs.length === 0 ? (
                      <div className={cn("flex flex-col items-center justify-center h-full gap-3", isDark ? "text-zinc-600" : "text-slate-900")}>
                        <Terminal className="w-10 h-10 opacity-30" />
                        <p className="text-sm">No provisioning logs yet.</p>
                        <p className="text-xs">Logs will appear here when the cluster is being provisioned.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col min-w-max">
                        {installLogs.map((entry, i) => (
                          <div key={i} className="flex gap-4 group hover:bg-white/[0.02] rounded px-2 py-0.5 transition-colors">
                            <span className={cn("shrink-0 text-xs pt-0.5 select-none opacity-60 group-hover:opacity-100 transition-opacity", isDark ? "text-zinc-600" : "text-slate-900")}>
                              {new Date(entry.ts).toLocaleTimeString('en-GB', { hour12: false })}
                            </span>
                            <span className={cn(
                              "whitespace-pre",
                              entry.msg.startsWith('ERROR') ? "text-red-400" :
                                entry.msg.startsWith('Warning') ? "text-amber-400" :
                                  entry.msg.includes('successfully') || entry.msg.includes('RUNNING') || entry.msg.includes('installed') ? "text-green-400" :
                                    entry.msg.includes('Waiting') || entry.msg.includes('not ready') || entry.msg.includes('Retrying') ? "text-yellow-400/80" :
                                      entry.msg.includes('Starting') || entry.msg.includes('Installing') || entry.msg.includes('Reading') || entry.msg.includes('Connecting') ? "text-cyan-400" :
                                        "text-zinc-300"
                            )}>
                              {entry.msg.startsWith('ERROR') ? (
                                <span className="text-red-500 font-bold mr-1">[ERROR]</span>
                              ) : null}
                              {entry.msg.replace(/^ERROR: /, '')}
                            </span>
                          </div>
                        ))}
                        {/* Blinking cursor when live */}
                        {['PENDING', 'PROVISIONING', 'WAITING_FOR_SSH', 'INSTALLING_K3S'].includes(cluster.status) && (
                          <div className="flex gap-4 px-2 py-0.5 mt-1">
                            <span className={cn("text-xs select-none opacity-0", isDark ? "text-zinc-600" : "text-slate-900")}>
                              00:00:00
                            </span>
                            <span className="text-cyan-400">█<span className="animate-pulse"> </span></span>
                          </div>
                        )}
                        <div ref={logEndRef} className="h-4" />
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className={cn("flex items-center justify-between px-4 py-2.5 border-t", isDark ? "bg-white/[0.02] border-white/5" : "bg-white border-slate-200")}>
                    <span className={cn("text-xs font-mono", isDark ? "text-zinc-600" : "text-slate-900")}>
                      {installLogs.length} entries
                    </span>
                    <button
                      onClick={() => logEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                      className={cn("text-xs hover:text-white transition-colors flex items-center gap-1", isDark ? "text-zinc-500" : "text-slate-500")}
                    >
                      ↓ Scroll to bottom
                    </button>
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>
      {/* Edit Role Modal */}
      <AnimatePresence>
        {editRoleModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !editRoleModal.isUpdating && setEditRoleModal(prev => ({ ...prev, isOpen: false }))}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn("relative w-full max-w-md border rounded-2xl p-6 overflow-hidden shadow-md", isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-slate-200")}
            >
              <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>Edit Node Role</h3>
              <p className={cn("text-sm mb-6", isDark ? "text-zinc-400" : "text-slate-500")}>
                Update Kubernetes role for node <span className={cn("font-mono", isDark ? "text-white" : "text-slate-900")}>{editRoleModal.nodeName}</span>
              </p>

              <div className="space-y-4">
                <div>
                  <label className={cn("block text-xs font-medium uppercase tracking-wider mb-2", isDark ? "text-zinc-400" : "text-slate-500")}>Role Name</label>
                  <input
                    type="text"
                    value={editRoleModal.currentRole}
                    onChange={(e) => setEditRoleModal(prev => ({ ...prev, currentRole: e.target.value }))}
                    placeholder="e.g. worker, database, ingress"
                    className={cn("w-full bg-black/40 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors", isDark ? "border-white/10 text-white" : "border-slate-200 text-slate-900")}
                  />
                  <p className={cn("text-xs mt-2", isDark ? "text-zinc-500" : "text-slate-500")}>
                    Tip: Leave empty to clear the node role.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setEditRoleModal(prev => ({ ...prev, isOpen: false }))}
                  disabled={editRoleModal.isUpdating}
                  className={cn("flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium transition-colors border disabled:opacity-50", isDark ? "text-white border-white/10" : "text-slate-900 border-slate-200")}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateRole(editRoleModal.currentRole)}
                  disabled={editRoleModal.isUpdating || !editRoleModal.currentRole}
                  className={cn("flex-1 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 rounded-xl text-sm font-bold transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:opacity-50 flex items-center justify-center gap-2", isDark ? "text-white" : "text-slate-900")}
                >
                  {editRoleModal.isUpdating ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Updating...</>
                  ) : "Save Role"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}