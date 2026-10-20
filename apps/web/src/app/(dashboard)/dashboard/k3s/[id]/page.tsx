"use client";

import { useUrlTab } from "@/lib/useUrlTab";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Server, Activity, ChevronLeft, Download, Terminal, HardDrive, Cpu, Settings, ExternalLink, Shield, ShieldCheck, Box, AlertTriangle, Trash2, RefreshCw, CreditCard, CheckCircle, Play, Power, RotateCcw, Calculator, Square, Copy, Check, Info, Globe, Network, X, Plus } from "lucide-react";
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
  const [activeTab, setActiveTab] = useUrlTab<string>("overview");
  const activeTabRef = useRef(activeTab);
  const runningNodesCountRef = useRef<number>(-1);
  const isSuspended = cluster?.nodes?.some((n: any) => n.status === 'SUSPENDED') || false;
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
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

  // Ingress Guide Tab
  const [ingressGuideTab, setIngressGuideTab] = useState<"nginx" | "builtin" | "helm">("nginx");
  const [copiedCommandId, setCopiedCommandId] = useState<string | null>(null);

  const handleCopyCommand = (cmdText: string, id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(cmdText);
      setCopiedCommandId(id);
      toast.success("Command copied to clipboard");
      setTimeout(() => setCopiedCommandId(null), 2500);
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

  const fetchHistoryMetrics = async (showLoading = true) => {
    const targetId = cluster?.id || (params?.id as string);
    if (!targetId) return;
    try {
      if (showLoading) setLoadingHistory(true);
      const res = await fetch(`/api/user/k3s/${targetId}/metrics/history`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && (Array.isArray(data.cpu) || Array.isArray(data.memory))) {
          setHistoryMetrics(data);
        }
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
    const installingStatuses = ['PENDING', 'PROVISIONING', 'WAITING_FOR_CLOUD_INIT', 'WAITING_FOR_SSH', 'INSTALLING_K3S'];
    const isInstalling = installingStatuses.includes(cluster?.status || '');
    const interval = setInterval(fetchLog, isInstalling ? 2000 : 30000);
    return () => clearInterval(interval);
  }, [cluster?.status, params.id]);

  // Auto-scroll log terminal to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [installLogs]);

  useEffect(() => {
    if (activeTab === "monitoring" && (cluster?.status === 'RUNNING' || cluster?.kubeconfig)) {
      fetchHistoryMetrics(!historyMetrics);
      const interval = setInterval(() => {
        if (document.visibilityState !== 'hidden') {
          fetchHistoryMetrics(false);
        }
      }, 10000);
      return () => clearInterval(interval);
    } else if (activeTab === "alerts") {
      fetchAlertRules();
    }
  }, [activeTab, cluster?.status, cluster?.kubeconfig, params?.id]);



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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn("border rounded-2xl md:rounded-3xl p-6 max-w-md w-full shadow-xl relative overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200")}
            >
              <h3 className={cn(
                "text-xl font-bold mb-3 flex items-center gap-2",
                confirmModal.actionType === "danger" ? "text-red-500" :
                  confirmModal.actionType === "warning" ? "text-amber-500" : (isDark ? "text-cyan-400" : "text-cyan-700")
              )}>
                <AlertTriangle className="w-5 h-5 shrink-0" />
                {confirmModal.title}
              </h3>
              <p className={cn("text-sm mb-8 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>{confirmModal.message}</p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className={cn("px-4 py-2.5 rounded-xl border font-semibold text-sm transition-colors", isDark ? "border-slate-800 text-slate-300 hover:bg-slate-800" : "border-slate-200 text-slate-700 hover:bg-slate-100")}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    confirmModal.onConfirm();
                  }}
                  className={cn(
                    "px-5 py-2.5 font-bold text-sm rounded-xl shadow-sm transition-all",
                    confirmModal.actionType === "danger" ? "bg-red-500 hover:bg-red-600 text-white" :
                      confirmModal.actionType === "warning" ? "bg-amber-500 hover:bg-amber-600 text-white" :
                        "bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950"
                  )}
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isGuideModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn("border rounded-3xl p-6 max-w-2xl w-full shadow-md relative overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200")}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className={cn("text-xl font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                  <Terminal className="w-5 h-5 text-cyan-400" />
                  How to Connect to K3s
                </h3>
                <button
                  onClick={() => setIsGuideModalOpen(false)}
                  className={cn("p-2 rounded-full transition-colors", isDark ? "text-zinc-400 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100")}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className={cn("flex gap-1.5 p-1.5 rounded-2xl border mb-6", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-100 border-slate-200")}>
                {(["windows", "linux", "mac"] as const).map((os) => (
                  <button
                    key={os}
                    onClick={() => setGuideOs(os)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize",
                      guideOs === os
                        ? (isDark ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm" : "bg-white text-cyan-900 border border-cyan-600 shadow-sm ring-1 ring-cyan-600/20")
                        : (isDark ? "text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent" : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 border border-transparent")
                    )}
                  >
                    {os === "mac" ? "macOS" : os}
                  </button>
                ))}
              </div>

              <div className={cn("space-y-4 text-sm", isDark ? "text-zinc-300" : "text-slate-700")}>
                <p>1. <strong>Download</strong> your Kubeconfig file using the <span className={cn("font-semibold", isDark ? "text-cyan-400" : "text-cyan-700")}>Kubeconfig</span> button.</p>
                <p>2. If you don&apos;t have <code>kubectl</code> installed yet, you can <a href="https://kubernetes.io/docs/tasks/tools/" target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:underline font-bold">download it here</a>.</p>
                <p>3. Follow the OS specific instructions below to use it with <code>kubectl</code>:</p>

                <div className={cn("p-4 rounded-xl font-mono text-xs overflow-x-auto shadow-inner border", isDark ? "bg-[#060b14] border-slate-800 text-cyan-300" : "bg-slate-900 border-slate-800 text-cyan-300")}>
                  {guideOs === "windows" && (
                    <div className="space-y-3">
                      <p className="text-slate-400"># 1. Place the downloaded file in your user directory</p>
                      <p className="text-cyan-300 font-semibold">C:\Users\YourUsername\.kube\config</p>
                      <p className="text-slate-400"># 2. Or set the KUBECONFIG environment variable (PowerShell)</p>
                      <p className="text-cyan-300 font-semibold">$env:KUBECONFIG="C:\path\to\downloaded-kubeconfig.yaml"</p>
                      <p className="text-slate-400"># 3. Test your connection</p>
                      <p className="text-white font-semibold">kubectl get nodes</p>
                    </div>
                  )}
                  {guideOs === "linux" && (
                    <div className="space-y-3">
                      <p className="text-slate-400"># 1. Create .kube directory and copy the file</p>
                      <p className="text-cyan-300 font-semibold">mkdir -p ~/.kube<br />cp ~/Downloads/*-kubeconfig.yaml ~/.kube/config<br />chmod 600 ~/.kube/config</p>
                      <p className="text-slate-400"># 2. Or set the KUBECONFIG environment variable</p>
                      <p className="text-cyan-300 font-semibold">export KUBECONFIG=~/Downloads/downloaded-kubeconfig.yaml</p>
                      <p className="text-slate-400"># 3. Test your connection</p>
                      <p className="text-white font-semibold">kubectl get nodes</p>
                    </div>
                  )}
                  {guideOs === "mac" && (
                    <div className="space-y-3">
                      <p className="text-slate-400"># 1. Create .kube directory and copy the file</p>
                      <p className="text-cyan-300 font-semibold">mkdir -p ~/.kube<br />cp ~/Downloads/*-kubeconfig.yaml ~/.kube/config<br />chmod 600 ~/.kube/config</p>
                      <p className="text-slate-400"># 2. Or set the KUBECONFIG environment variable</p>
                      <p className="text-cyan-300 font-semibold">export KUBECONFIG=~/Downloads/downloaded-kubeconfig.yaml</p>
                      <p className="text-slate-400"># 3. Test your connection</p>
                      <p className="text-white font-semibold">kubectl get nodes</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end mt-8">
                <button
                  onClick={() => setIsGuideModalOpen(false)}
                  className={cn("px-5 py-2.5 font-bold rounded-xl transition-colors border shadow-sm", isDark ? "bg-white/10 hover:bg-white/20 text-white border-white/10" : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200")}
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
          const isDeploying = ['PENDING', 'PROVISIONING', 'WAITING_FOR_CLOUD_INIT', 'WAITING_FOR_SSH', 'INSTALLING_K3S'].includes(cluster.status) || ['PENDING', 'PROVISIONING', 'WAITING_FOR_CLOUD_INIT', 'WAITING_FOR_SSH', 'INSTALLING_K3S'].includes(masterNode?.status);

          if (isPendingPayment) {
            return (
              <div className={cn("flex flex-col items-center justify-center py-24 border rounded-3xl shadow-md relative overflow-hidden mt-8", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200")}>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-cyan-500/10"></div>
                <div className="relative z-10 flex flex-col items-center text-center px-4">
                  <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 border border-blue-500/30">
                    <CreditCard className="w-12 h-12 text-blue-400" />
                  </div>
                  <h2 className={cn("text-3xl font-bold mb-3", isDark ? "text-white" : "text-slate-900")}>Menunggu Pembayaran</h2>
                  <p className={cn("max-w-md mx-auto mb-8", isDark ? "text-zinc-400" : "text-slate-600")}>
                    Cluster ini masih menunggu pembayaran untuk dapat diprovisioning. Silakan selesaikan pembayaran tagihan Anda.
                  </p>
                  <button
                    onClick={() => router.push("/dashboard/billing")}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 text-white"
                  >
                    Lihat Tagihan
                  </button>
                </div>
              </div>
            );
          }

          if (isDeploying) {
            return (
              <div className="space-y-6">
                <div className="flex items-center">
                  <Link 
                    href="/dashboard/k3s" 
                    className={cn(
                      "inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-all border shadow-sm",
                      isDark 
                        ? "text-zinc-400 hover:text-white bg-[#0b1322] hover:bg-[#111c33] border-slate-800 hover:border-cyan-500/40" 
                        : "text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border-slate-200"
                    )}
                  >
                    <ChevronLeft className="w-4 h-4" /> Back to Kubernetes Clusters
                  </Link>
                </div>

                <div className={cn("w-full border rounded-3xl relative overflow-hidden p-6 md:p-10 shadow-sm", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200")}>
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-20 h-20 mb-6 relative">
                      <div className={cn("absolute inset-0 rounded-full border-2 border-t-transparent animate-spin", isDark ? "border-cyan-400" : "border-cyan-600")}></div>
                      <div className={cn("absolute inset-2.5 rounded-full border-2 border-b-transparent animate-[spin_2s_linear_reverse]", isDark ? "border-blue-400" : "border-blue-600")}></div>
                      <Server className={cn("w-9 h-9 absolute inset-0 m-auto animate-pulse", isDark ? "text-cyan-400" : "text-cyan-600")} />
                    </div>
                    <h2 className={cn("text-2xl md:text-3xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Deploying Your Cluster</h2>
                    <p className={cn("text-sm text-center mb-6 leading-relaxed", isDark ? "text-slate-400" : "text-slate-600")}>
                      Installing Kubernetes {cluster.version}. This usually takes 5–10 minutes.
                    </p>

                    {/* Status badges */}
                    <div className="flex flex-wrap justify-center gap-3 mb-8">
                      <span className={cn(
                        "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all",
                        ['RUNNING', 'INSTALLING_K3S', 'WAITING_FOR_CLOUD_INIT', 'WAITING_FOR_SSH'].includes(cluster.status)
                          ? (isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 font-semibold" : "bg-cyan-50 text-cyan-900 border-cyan-300 font-semibold shadow-sm")
                          : (isDark ? "bg-amber-500/10 text-amber-400 border-amber-500/30 font-semibold" : "bg-amber-50 text-amber-900 border-amber-300 font-semibold shadow-sm")
                      )}>
                        {['RUNNING', 'INSTALLING_K3S', 'WAITING_FOR_CLOUD_INIT', 'WAITING_FOR_SSH'].includes(cluster.status)
                          ? <CheckCircle className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                          : <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                        VM Provisioned
                      </span>
                      <span className={cn(
                        "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all",
                        ['INSTALLING_K3S', 'RUNNING'].includes(cluster.status)
                          ? (isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 font-semibold" : "bg-cyan-50 text-cyan-900 border-cyan-300 font-semibold shadow-sm")
                          : ['WAITING_FOR_CLOUD_INIT', 'WAITING_FOR_SSH'].includes(cluster.status)
                            ? (isDark ? "bg-amber-500/10 text-amber-400 border-amber-500/30 font-semibold" : "bg-amber-50 text-amber-900 border-amber-300 font-semibold shadow-sm")
                            : (isDark ? "bg-[#060b14] text-slate-500 border-slate-800" : "bg-slate-100 text-slate-600 border-slate-200")
                      )}>
                        {['INSTALLING_K3S', 'RUNNING'].includes(cluster.status)
                          ? <CheckCircle className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                          : ['WAITING_FOR_CLOUD_INIT', 'WAITING_FOR_SSH'].includes(cluster.status)
                            ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            : <div className="w-3.5 h-3.5 rounded-full border-2 border-current opacity-50" />}
                        Cloud-Init Ready
                      </span>
                      <span className={cn(
                        "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all",
                        cluster.status === 'RUNNING'
                          ? (isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 font-semibold" : "bg-cyan-50 text-cyan-900 border-cyan-300 font-semibold shadow-sm")
                          : cluster.status === 'INSTALLING_K3S'
                            ? (isDark ? "bg-amber-500/10 text-amber-400 border-amber-500/30 font-semibold" : "bg-amber-50 text-amber-900 border-amber-300 font-semibold shadow-sm")
                            : (isDark ? "bg-[#060b14] text-slate-500 border-slate-800" : "bg-slate-100 text-slate-600 border-slate-200")
                      )}>
                        {cluster.status === 'RUNNING' ? (
                          <CheckCircle className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                        ) : cluster.status === 'INSTALLING_K3S' ? (
                          <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-current opacity-50" />
                        )}
                        Installing K3s
                      </span>
                    </div>

                    {/* macOS-style Terminal Box (Crisp dark console in both Light & Dark modes) */}
                    <div className="developer-terminal w-full max-w-4xl mx-auto border rounded-2xl shadow-xl overflow-hidden border-slate-800 bg-[#060b14]" style={{ backgroundColor: '#060b14' }}>
                      {/* Terminal header bar */}
                      <div className="developer-terminal-header flex items-center gap-2 px-4 py-3 bg-[#0b1322] border-b border-slate-800 select-none" style={{ backgroundColor: '#0b1322', borderColor: '#1e293b' }}>
                        <div className="flex gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                          <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                        </div>
                        <span className="developer-terminal-title text-xs md:text-sm font-mono mx-auto text-white font-bold tracking-wide flex items-center gap-2" style={{ color: '#ffffff' }}>
                          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                          provisioning-log — {masterNode?.hostname || cluster.name}
                        </span>
                        {cluster.status === 'RUNNING' ? (
                          <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            RUNNING
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            LIVE
                          </span>
                        )}
                      </div>

                      {/* Terminal body */}
                      <div
                        className="p-4 md:p-6 h-80 md:h-[400px] overflow-auto font-mono text-xs md:text-sm leading-relaxed custom-scrollbar bg-[#060b14]"
                        style={{ backgroundColor: '#060b14', scrollBehavior: 'smooth' }}
                      >
                        {installLogs.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-300">
                            <Terminal className="w-10 h-10 opacity-40 text-cyan-400" />
                            <p className="text-sm font-medium">Waiting for provisioning logs...</p>
                            <p className="text-xs text-slate-400">Logs will stream here in real time as nodes initialize.</p>
                          </div>
                        ) : (
                          <div className="flex flex-col min-w-max">
                            {installLogs.map((entry, i) => (
                              <div key={i} className="flex gap-4 group hover:bg-slate-800/40 rounded px-2 py-0.5 transition-colors">
                                <span className="terminal-time shrink-0 text-xs pt-0.5 select-none font-mono font-medium text-slate-300 group-hover:text-white transition-colors" style={{ color: '#94a3b8' }}>
                                  {new Date(entry.ts).toLocaleTimeString('en-GB', { hour12: false })}
                                </span>
                                <span className={cn(
                                  "whitespace-pre font-mono",
                                  entry.msg.startsWith('ERROR') ? "text-red-400 font-bold" :
                                    entry.msg.startsWith('Warning') ? "text-amber-400 font-medium" :
                                      entry.msg.includes('successfully') || entry.msg.includes('RUNNING') || entry.msg.includes('installed') ? "text-emerald-400 font-semibold" :
                                        entry.msg.includes('Starting') || entry.msg.includes('Installing') || entry.msg.includes('Reading') || entry.msg.includes('Connecting') || entry.msg.includes('[K3s Reinstall]') || entry.msg.includes('[Cloud-Init') || entry.msg.includes('[INFO]') ? "text-cyan-400 font-semibold" :
                                          entry.msg.startsWith('+') ? "terminal-cmd text-white font-semibold" :
                                            entry.msg.includes('Waiting') || entry.msg.includes('not ready') || entry.msg.includes('Retrying') ? "text-yellow-400/80" :
                                              "terminal-text text-slate-200"
                                )}>
                                  {entry.msg.startsWith('ERROR') ? (
                                    <span className="text-red-500 font-bold mr-1">[ERROR]</span>
                                  ) : null}
                                  {entry.msg.replace(/^ERROR: /, '')}
                                </span>
                              </div>
                            ))}
                            {/* Blinking cursor */}
                            <div className="flex gap-4 px-2 py-0.5 mt-1">
                              <span className="text-xs select-none opacity-0 text-slate-500 font-mono">
                                00:00:00
                              </span>
                              <span className="text-cyan-400">█<span className="animate-pulse"> </span></span>
                            </div>
                            <div ref={logEndRef} className="h-4" />
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="developer-terminal-footer flex items-center justify-between px-4 py-2.5 border-t border-slate-800 bg-[#0b1322]" style={{ backgroundColor: '#0b1322', borderColor: '#1e293b' }}>
                        <span className="terminal-muted text-xs font-mono text-slate-300 font-medium" style={{ color: '#94a3b8' }}>
                          {installLogs.length} entries
                        </span>
                        <button
                          onClick={() => logEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                          className="terminal-muted text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-1 font-semibold"
                          style={{ color: '#94a3b8' }}
                        >
                          ↓ Scroll to bottom
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <>
              <div className="flex items-center">
                <Link 
                  href="/dashboard/k3s" 
                  className={cn(
                    "inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-all border shadow-sm",
                    isDark 
                      ? "text-zinc-400 hover:text-white bg-[#0b1322] hover:bg-[#111c33] border-slate-800 hover:border-cyan-500/40" 
                      : "text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border-slate-200"
                  )}
                >
                  <ChevronLeft className="w-4 h-4" /> Back to Kubernetes Clusters
                </Link>
              </div>
              {/* Header */}
              <div className={cn("flex flex-col xl:flex-row xl:items-center justify-between gap-4 border rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-sm relative overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200")}>

                <div className="flex flex-wrap sm:flex-nowrap items-start sm:items-center gap-3 sm:gap-4 relative z-10 w-full xl:w-auto">
                  <div className="w-14 h-14 rounded-2xl border border-cyan-500/20 flex items-center justify-center shrink-0">
                    <SiKubernetes className={cn("w-7 h-7", isDark ? "text-cyan-400" : "text-cyan-600")} />
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
                  <div className={cn("border rounded-xl px-4 py-2.5 overflow-x-auto scrollbar-hide w-full shadow-inner", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}>
                    <div className={cn("text-[10px] uppercase font-bold tracking-widest mb-0.5", isDark ? "text-zinc-500" : "text-slate-500")}>API Endpoint</div>
                    <div className={cn("font-mono text-sm whitespace-nowrap font-medium", isDark ? "text-cyan-400" : "text-cyan-700")}>{cluster.endpoint || "Pending..."}</div>
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
                          className={cn("p-2.5 rounded-xl transition-all border shadow-sm disabled:opacity-40 disabled:cursor-not-allowed",
                            isDark ? "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-200"
                          )}
                        >
                          <Play className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleNodePowerAction(master.id, "shutdown")}
                          disabled={!isRunning || isTerminated || isSuspended}
                          title="Graceful Shutdown"
                          className={cn("p-2.5 rounded-xl transition-all border shadow-sm disabled:opacity-40 disabled:cursor-not-allowed",
                            isDark ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20" : "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200"
                          )}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleNodePowerAction(master.id, "stop")}
                          disabled={!isRunning || isTerminated || isSuspended}
                          title="Force Stop"
                          className={cn("p-2.5 rounded-xl transition-all border shadow-sm disabled:opacity-40 disabled:cursor-not-allowed",
                            isDark ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20" : "bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                          )}
                        >
                          <Square className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleNodePowerAction(master.id, "reboot")}
                          disabled={!isRunning || isTerminated || isSuspended}
                          title="Restart Cluster"
                          className={cn("p-2.5 rounded-xl transition-all border shadow-sm disabled:opacity-40 disabled:cursor-not-allowed",
                            isDark ? "bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20" : "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                          )}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openConsole(master.id)}
                          disabled={isTerminated}
                          title="Open Console"
                          className="p-2.5 rounded-lg transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold"
                        >
                          <Terminal className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })()}
                  <button
                    onClick={() => setIsGuideModalOpen(true)}
                    className={cn("flex items-center gap-2 px-4 py-2.5 border font-semibold rounded-xl text-sm transition-all shadow-sm", isDark ? "bg-[#060b14] hover:bg-slate-800/60 border-slate-800 text-white" : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800")}
                  >
                    <Terminal className="w-4 h-4 text-cyan-500" />
                    How to Connect
                  </button>
                  <button
                    onClick={handleDownloadKubeconfig}
                    className={cn("flex items-center gap-2 px-4 py-2.5 border font-semibold rounded-xl text-sm transition-all shadow-sm", isDark ? "bg-[#060b14] hover:bg-slate-800/60 border-slate-800 text-white" : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800")}
                  >
                    <Download className="w-4 h-4 text-cyan-500" />
                    Kubeconfig
                  </button>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className={cn("border transition-colors shadow-sm", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200", "flex gap-1.5 p-1.5 rounded-2xl overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] w-full")}>
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
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                      activeTab === tab.id
                        ? (isDark ? "bg-cyan-500/15 text-cyan-300 font-semibold border border-cyan-500/30 shadow-sm" : "bg-white text-cyan-900 font-semibold border border-cyan-600 shadow-sm ring-1 ring-cyan-600/20")
                        : (isDark ? "text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent")
                    )}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === "overview" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    <div className={cn("border rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-sm relative overflow-hidden group", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200")}>
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
                            <span className={cn("font-bold px-2 py-0.5 rounded-md text-xs border", isDark ? "bg-white/5 text-white border-white/5" : "bg-slate-100 text-slate-900 border-slate-200")}>
                              {`${metrics?.cpu?.usage || 0} / ${metrics?.cpu?.capacity || 0} Cores`}
                            </span>
                          </div>
                          <div className={cn("w-full h-2.5 rounded-full overflow-hidden shadow-inner border", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-100 border-slate-200")}>
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
                            <span className={cn("font-bold px-2 py-0.5 rounded-md text-xs border", isDark ? "bg-white/5 text-white border-white/5" : "bg-slate-100 text-slate-900 border-slate-200")}>
                              {`${metrics?.memory?.usageGb || 0} / ${metrics?.memory?.capacityGb || 0} GB`}
                            </span>
                          </div>
                          <div className={cn("w-full h-2.5 rounded-full overflow-hidden shadow-inner border", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-100 border-slate-200")}>
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
                            <span className={cn("font-bold px-2 py-0.5 rounded-md text-xs border", isDark ? "bg-white/5 text-white border-white/5" : "bg-slate-100 text-slate-900 border-slate-200")}>
                              {`${metrics?.pods?.usage || 0} / ${metrics?.pods?.capacity || 0} Max`}
                            </span>
                          </div>
                          <div className={cn("w-full h-2.5 rounded-full overflow-hidden shadow-inner border", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-100 border-slate-200")}>
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
                            <span className={cn("font-bold px-2 py-0.5 rounded-md text-xs border", isDark ? "bg-white/5 text-white border-white/5" : "bg-slate-100 text-slate-900 border-slate-200")}>
                              {`${metrics?.storage?.usageGb || 0} / ${metrics?.storage?.capacityGb || 0} GB`}
                            </span>
                          </div>
                          <div className={cn("w-full h-2.5 rounded-full overflow-hidden shadow-inner border", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-100 border-slate-200")}>
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

                    <div className={cn("border rounded-3xl p-6 shadow-sm relative overflow-hidden group", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200")}>
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
                            <div key={component} className={cn("border rounded-2xl p-5 text-center flex flex-col items-center justify-center transition-all", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}>
                              <div className="w-3.5 h-3.5 rounded-full mx-auto mb-3 bg-zinc-700" />
                              <div className={cn("text-sm font-semibold", isDark ? "text-white" : "text-slate-900")}>{component}</div>
                              <div className={cn("text-[10px] mt-1.5 uppercase tracking-widest font-bold", isDark ? "text-zinc-500" : "text-slate-400")}>
                                {cluster.status === 'RUNNING' ? 'Loading...' : 'N/A'}
                              </div>
                            </div>
                          ))
                        ) : (
                          ["kube-apiserver", "etcd", "scheduler", "controller-mgr"].map((component) => {
                            const isHealthy = metrics?.components?.[component];
                            return (
                              <div key={component} className={cn("transition-all border rounded-2xl p-5 text-center flex flex-col items-center justify-center", isDark ? "bg-[#060b14] border-slate-800 hover:border-slate-700 hover:bg-slate-800/40" : "bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/70")}>
                                <div className={cn(
                                  "w-3.5 h-3.5 rounded-full mx-auto mb-3",
                                  isHealthy === true ? "bg-cyan-500 shadow-sm shadow-cyan-500/50" : 
                                  isHealthy === false ? "bg-red-500 animate-pulse shadow-sm shadow-red-500/50" : 
                                  "bg-zinc-700"
                                )} />
                                <div className={cn("text-sm font-semibold", isDark ? "text-white" : "text-slate-900")}>{component}</div>
                                <div className={cn(
                                  "text-[10px] mt-1.5 uppercase tracking-widest font-bold",
                                  isHealthy === true ? (isDark ? "text-cyan-400" : "text-cyan-700") : 
                                  isHealthy === false ? (isDark ? "text-red-400" : "text-red-600") : 
                                  (isDark ? "text-zinc-500" : "text-slate-400")
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
                    <div className={cn("border rounded-3xl p-6 shadow-sm relative overflow-hidden group h-full", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200")}>
                      <h2 className={cn("text-lg font-bold mb-6 relative z-10 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                          <Server className="w-4 h-4 text-cyan-400" />
                        </div>
                        Cluster Info
                      </h2>
                      <div className="space-y-4 relative z-10">
                        <div className={cn("flex justify-between items-center p-3.5 rounded-xl border", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}>
                          <span className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Version</span>
                          <span className={cn("font-mono text-sm px-2.5 py-1 rounded-md border", isDark ? "bg-white/5 border-white/5 text-white" : "bg-white border-slate-200 text-slate-900 shadow-sm")}>{cluster.version}</span>
                        </div>
                        <div className={cn("flex justify-between items-center p-3.5 rounded-xl border", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}>
                          <span className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Total Nodes</span>
                          <div className="text-right">
                            <span className={cn("text-sm font-bold block", isDark ? "text-white" : "text-slate-900")}>{cluster.nodes?.length || 0} Nodes</span>
                            <span className={cn("text-[10px] uppercase font-bold", isDark ? "text-zinc-500" : "text-slate-500")}>
                              {cluster.nodes?.filter((n: any) => n.kubernetesRole === 'MASTER').length || 0} Master &middot; {cluster.nodes?.filter((n: any) => n.kubernetesRole !== 'MASTER').length || 0} Worker
                            </span>
                          </div>
                        </div>
                        <div className={cn("flex justify-between items-center p-3.5 rounded-xl border", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}>
                          <span className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Network Plugin</span>
                          <span className={cn("text-sm font-medium", isDark ? "text-white" : "text-slate-900")}>Flannel</span>
                        </div>
                        <div className={cn("flex justify-between items-center p-3.5 rounded-xl border", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}>
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
                  <div className={cn("border rounded-2xl md:rounded-3xl p-6 shadow-sm", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200")}>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className={cn("text-lg font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                        <Cpu className="w-5 h-5 text-blue-500" />
                        CPU Usage (Last 1 Hour)
                      </h2>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                        <span className={cn("text-xs font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Live Proxmox RRD</span>
                      </div>
                    </div>
                    <div className="h-72 w-full">
                      {loadingHistory && !historyMetrics ? (
                        <div className={cn("w-full h-full flex flex-col items-center justify-center gap-3", isDark ? "text-zinc-400" : "text-slate-500")}>
                          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm">Fetching historical data from hypervisor...</span>
                        </div>
                      ) : isMounted ? (
                        <ResponsiveContainer width="100%" height={250} minWidth={1} minHeight={1}>
                          <AreaChart data={historyMetrics?.cpu || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} vertical={false} />
                            <XAxis dataKey="time" stroke={isDark ? "#334155" : "#cbd5e1"} tick={{ fill: '#64748b', fontSize: 11 }} minTickGap={30} />
                            <YAxis 
                              stroke={isDark ? "#334155" : "#cbd5e1"} 
                              tick={{ fill: '#64748b', fontSize: 11 }} 
                              tickFormatter={(val) => `${val}%`} 
                              domain={[0, 100]} 
                              width={45} 
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: isDark ? '#0f172a' : '#ffffff', 
                                borderColor: isDark ? '#334155' : '#cbd5e1', 
                                borderRadius: '12px', 
                                color: isDark ? '#fff' : '#0f172a', 
                                fontSize: '12px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                              }} 
                              formatter={(val: any) => [`${val}%`, 'Usage']}
                            />
                            <Area type="monotone" dataKey="usage" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCpu)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : null}
                    </div>
                  </div>

                  <div className={cn("border rounded-2xl md:rounded-3xl p-6 shadow-sm", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200")}>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className={cn("text-lg font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                        <HardDrive className="w-5 h-5 text-cyan-500" />
                        Memory Usage (Last 1 Hour)
                      </h2>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className={cn("text-xs font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Live Proxmox RRD</span>
                      </div>
                    </div>
                    <div className="h-72 w-full">
                      {loadingHistory && !historyMetrics ? (
                        <div className={cn("w-full h-full flex flex-col items-center justify-center gap-3", isDark ? "text-zinc-400" : "text-slate-500")}>
                          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm">Fetching historical data from hypervisor...</span>
                        </div>
                      ) : isMounted ? (
                        <ResponsiveContainer width="100%" height={250} minWidth={1} minHeight={1}>
                          <AreaChart data={historyMetrics?.memory || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} vertical={false} />
                            <XAxis dataKey="time" stroke={isDark ? "#334155" : "#cbd5e1"} tick={{ fill: '#64748b', fontSize: 11 }} minTickGap={30} />
                            <YAxis 
                              stroke={isDark ? "#334155" : "#cbd5e1"} 
                              tick={{ fill: '#64748b', fontSize: 11 }} 
                              tickFormatter={(val) => `${val}%`} 
                              domain={[0, 100]} 
                              width={45} 
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: isDark ? '#0f172a' : '#ffffff', 
                                borderColor: isDark ? '#334155' : '#cbd5e1', 
                                borderRadius: '12px', 
                                color: isDark ? '#fff' : '#0f172a', 
                                fontSize: '12px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                              }} 
                              formatter={(val: any) => [`${val}%`, 'Usage']}
                            />
                            <Area type="monotone" dataKey="usage" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorMem)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "nodes" && (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                  <div className={cn("border rounded-2xl md:rounded-3xl overflow-hidden shadow-sm", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200")}>
                  <div className={cn("p-4 sm:p-6 border-b flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-3 sm:gap-0", isDark ? "border-slate-800" : "border-slate-200")}>
                    <h2 className={cn("text-base sm:text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>Cluster Nodes (VMs)</h2>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      {selectedNodes.length > 0 && (
                        <div className="flex items-center gap-1.5 md:gap-2 animate-in fade-in slide-in-from-right-4 duration-300 flex-wrap shrink-0">
                          <span className={cn("text-xs font-bold px-2 py-1 rounded-md mr-1 md:mr-2 border", isDark ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" : "text-cyan-700 bg-cyan-50 border-cyan-200")}>{selectedNodes.length} selected</span>
                          {cluster.nodes.filter((n: any) => selectedNodes.includes(n.id)).some((n: any) => n.status !== "RUNNING") && (
                            <button onClick={() => handleBulkNodeAction('start')} disabled={bulkLoading || isSuspended} className={cn("p-1.5 md:px-3 md:py-1.5 rounded-lg border transition-colors text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50", isDark ? "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-200")}>
                              <Play className="w-3.5 h-3.5" /> <span className="hidden md:inline">Start</span>
                            </button>
                          )}
                          {cluster.nodes.filter((n: any) => selectedNodes.includes(n.id)).some((n: any) => n.status === "RUNNING") && (
                            <>
                              <button onClick={() => handleBulkNodeAction('shutdown')} disabled={bulkLoading || isSuspended} className={cn("p-1.5 md:px-3 md:py-1.5 rounded-lg border transition-colors text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50", isDark ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20" : "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200")}>
                                <Power className="w-3.5 h-3.5" /> <span className="hidden md:inline">Shutdown</span>
                              </button>
                              <button onClick={() => handleBulkNodeAction('reboot')} disabled={bulkLoading || isSuspended} className={cn("p-1.5 md:px-3 md:py-1.5 rounded-lg border transition-colors text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50", isDark ? "bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20" : "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200")}>
                                <RotateCcw className="w-3.5 h-3.5" /> <span className="hidden md:inline">Reboot</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                      {isSuspended ? (
                        <span className={cn("px-3.5 py-1.5 rounded-lg text-sm border shrink-0 ml-auto sm:ml-0 cursor-not-allowed", isDark ? "bg-[#060b14] text-zinc-500 border-slate-800" : "bg-slate-100 text-slate-400 border-slate-200")}>
                          + Add Worker Node
                        </span>
                      ) : (
                        <Link href={`/dashboard/checkout?service=kubernetes&action=add_node&cluster_id=${cluster.id}`} className={cn("px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all border shrink-0 ml-auto sm:ml-0 flex items-center gap-2 shadow-sm", isDark ? "bg-[#060b14] hover:bg-slate-800/60 text-white border-slate-800" : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200")}>
                          <Plus className="w-4 h-4 text-cyan-500" />
                          Add Worker Node
                        </Link>
                      )}
                    </div>
                  </div>
                  {/* Desktop View */}
                  <div className={cn("hidden md:block overflow-x-auto w-full", isDark ? "bg-[#060b14]" : "bg-white")}>
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className={cn("border-b", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-slate-50 border-slate-200")}>
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
                                  ? "bg-cyan-400 text-slate-950" 
                                  : (isDark ? "bg-[#060b14] border border-slate-700 hover:border-cyan-400/50" : "bg-slate-100 border border-slate-300 hover:border-cyan-500")
                              )}
                            >
                              <CheckCircle className={cn("w-3.5 h-3.5", cluster.nodes.length > 0 && selectedNodes.length === cluster.nodes.length ? "text-slate-950" : "text-transparent")} />
                            </button>
                          </th>
                          <th className={cn("p-4 text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Hostname</th>
                          <th className={cn("p-4 text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Role</th>
                          <th className={cn("p-4 text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Specs (C/R/D)</th>
                          <th className={cn("p-4 text-xs font-bold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>Status</th>
                          <th className={cn("p-4 text-xs font-bold uppercase tracking-wider text-right", isDark ? "text-zinc-400" : "text-slate-500")}>Action</th>
                        </tr>
                      </thead>
                      <tbody className={cn("divide-y", isDark ? "divide-slate-800/60" : "divide-slate-200")}>
                        {cluster.nodes.map((node: any) => {
                          const isSelected = selectedNodes.includes(node.id);
                          return (
                          <tr key={node.id} className={cn("transition-colors group", isSelected ? (isDark ? "bg-cyan-500/10" : "bg-cyan-50/70") : (isDark ? "hover:bg-slate-800/40" : "hover:bg-slate-50/80"))}>
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
                                  isSelected
                                    ? "bg-cyan-400 text-slate-950" 
                                    : (isDark ? "bg-[#060b14] border border-slate-700 hover:border-cyan-400/50" : "bg-slate-100 border border-slate-300 hover:border-cyan-500")
                                )}
                              >
                                <CheckCircle className={cn("w-3.5 h-3.5", isSelected ? "text-slate-950" : "text-transparent")} />
                              </button>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 shrink-0">
                                  <SiKubernetes className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>{node.hostname}</div>
                                  <div className={cn("text-xs font-mono", isDark ? "text-zinc-500" : "text-slate-500")}>{node.ipAddress}</div>
                                  {metrics?.k8sNodes?.find((n: any) => n.hostname?.toLowerCase() === node.hostname?.toLowerCase())?.kubeletVersion && (
                                    <div className={cn("text-[10px] mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
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
                                getK8sRole(node.hostname, node.kubernetesRole).includes("master") || getK8sRole(node.hostname, node.kubernetesRole).includes("control-plane") || node.kubernetesRole === "MASTER" ? (isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200") :
                                  getK8sRole(node.hostname, node.kubernetesRole) === "<none>" ? (isDark ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" : "bg-slate-100 text-slate-600 border-slate-200") : (isDark ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-700 border-blue-200")
                              )}>
                                {getK8sRole(node.hostname, node.kubernetesRole)}
                              </span>
                            </td>
                            <td className={cn("p-4 text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-600")}>
                              {node.cpuCores}c / {node.ramGb}G / {node.diskGb}G
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                {node.status === "RUNNING" && <><div className="w-2 h-2 rounded-full bg-cyan-500 " /><span className={isDark ? "text-cyan-400" : "text-cyan-700"}>Ready</span></>}
                                {node.status === "INSTALLING_K3S" && <><div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /><span className={isDark ? "text-amber-400" : "text-amber-600"}>Installing K3s...</span></>}
                                {node.status === "FAILED" && <><div className="w-2 h-2 rounded-full bg-red-500" /><span className={isDark ? "text-red-400" : "text-red-600"}>Failed</span></>}
                                {!["RUNNING", "INSTALLING_K3S", "FAILED"].includes(node.status) && <><div className="w-2 h-2 rounded-full bg-zinc-500" /><span className={cn("capitalize", isDark ? "text-zinc-300" : "text-slate-600")}>{node.status.toLowerCase()}</span></>}
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
                                  className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 border",
                                    isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100"
                                  )}
                                >
                                  <Settings className="w-3.5 h-3.5" />
                                  Edit Role
                                </button>
                                <Link href={`/dashboard/vps/${node.id}`} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 border",
                                  isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100"
                                  )}>
                                  <Server className="w-3.5 h-3.5" />
                                  Manage VM
                                </Link>
                              </div>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile View */}
                  <div className="md:hidden flex flex-col gap-4 p-4">
                    {cluster.nodes.map((node: any) => {
                      const isSelected = selectedNodes.includes(node.id);
                      return (
                      <div key={node.id} className={cn("border rounded-2xl p-4 flex flex-col gap-4 transition-colors", isSelected ? "border-cyan-500 ring-1 ring-cyan-500/20" : (isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50/70 border-slate-200"))}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                if (!isSelected) {
                                  setSelectedNodes(prev => [...prev, node.id]);
                                } else {
                                  setSelectedNodes(prev => prev.filter(id => id !== node.id));
                                }
                              }}
                              className={cn(
                                "w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-all duration-200 mt-1",
                                isSelected
                                  ? "bg-cyan-400 text-slate-950" 
                                  : (isDark ? "bg-[#060b14] border border-slate-700" : "bg-slate-100 border border-slate-300")
                              )}
                            >
                              <CheckCircle className={cn("w-4 h-4", isSelected ? "text-slate-950" : "text-transparent")} />
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
                            getK8sRole(node.hostname, node.kubernetesRole).includes("master") || getK8sRole(node.hostname, node.kubernetesRole).includes("control-plane") || node.kubernetesRole === "MASTER" ? (isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200") :
                              getK8sRole(node.hostname, node.kubernetesRole) === "<none>" ? (isDark ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" : "bg-slate-100 text-slate-600 border-slate-200") : (isDark ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-700 border-blue-200")
                          )}>
                            {getK8sRole(node.hostname, node.kubernetesRole)}
                          </span>
                        </div>

                        <div className={cn("grid grid-cols-2 gap-2 p-3 rounded-xl border text-xs", isDark ? "bg-[#0b1322] border-slate-800/80 text-zinc-300" : "bg-white border-slate-200 text-slate-700 shadow-sm")}>
                          <div>
                            <span className={cn("block text-[10px] uppercase font-bold tracking-widest mb-1", isDark ? "text-zinc-500" : "text-slate-500")}>Specs</span>
                            {node.cpuCores}c / {node.ramGb}G / {node.diskGb}G
                          </div>
                          <div>
                            <span className={cn("block text-[10px] uppercase font-bold tracking-widest mb-1", isDark ? "text-zinc-500" : "text-slate-500")}>Status</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {node.status === "RUNNING" && <><div className="w-2 h-2 rounded-full bg-cyan-500 " /><span className={isDark ? "text-cyan-400 font-medium" : "text-cyan-700 font-medium"}>Ready</span></>}
                              {node.status === "INSTALLING_K3S" && <><div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /><span className={isDark ? "text-amber-400 font-medium" : "text-amber-600 font-medium"}>Installing...</span></>}
                              {node.status === "FAILED" && <><div className="w-2 h-2 rounded-full bg-red-500" /><span className={isDark ? "text-red-400 font-medium" : "text-red-600 font-medium"}>Failed</span></>}
                              {!["RUNNING", "INSTALLING_K3S", "FAILED"].includes(node.status) && <><div className="w-2 h-2 rounded-full bg-zinc-500" /><span className={cn("capitalize", isDark ? "text-zinc-300" : "text-slate-600")}>{node.status.toLowerCase()}</span></>}
                            </div>
                          </div>
                        </div>

                        {(metrics?.k8sNodes?.find((n: any) => n.hostname?.toLowerCase() === node.hostname?.toLowerCase())) && (
                          <div className={cn("text-[10px] p-2.5 rounded-xl border space-y-1", isDark ? "bg-[#0b1322] border-slate-800/80 text-zinc-400" : "bg-white border-slate-200 text-slate-600 shadow-sm")}>
                            {metrics.k8sNodes.find((n: any) => n.hostname?.toLowerCase() === node.hostname?.toLowerCase()).kubeletVersion && (
                              <div><span className={cn("font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>Kubelet:</span> {metrics.k8sNodes.find((n: any) => n.hostname?.toLowerCase() === node.hostname?.toLowerCase()).kubeletVersion}</div>
                            )}
                            {metrics.k8sNodes.find((n: any) => n.hostname?.toLowerCase() === node.hostname?.toLowerCase()).osImage && (
                              <div><span className={cn("font-medium", isDark ? "text-zinc-500" : "text-slate-500")}>OS:</span> {metrics.k8sNodes.find((n: any) => n.hostname?.toLowerCase() === node.hostname?.toLowerCase()).osImage}</div>
                            )}
                          </div>
                        )}

                        <div className={cn("flex flex-wrap items-center gap-2 pt-2 border-t", isDark ? "border-slate-800" : "border-slate-200")}>
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
                            className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 border",
                              isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100"
                            )}
                          >
                            <Settings className="w-3.5 h-3.5" />
                            Edit Role
                          </button>

                          <Link href={`/dashboard/vps/${node.id}`} className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 border",
                            isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100"
                          )}>
                            <Server className="w-3.5 h-3.5" />
                            Manage VM
                          </Link>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>

                {/* Default Ingress & ServiceLB Notice Card */}
                <div className={cn("border rounded-2xl md:rounded-3xl p-6 shadow-sm relative overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200")}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 shrink-0">
                        <Network className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className={cn("text-base sm:text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>
                            Ingress & LoadBalancer Configuration
                          </h2>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-amber-500/10 text-amber-500 border-amber-500/20">
                            Disabled by Default
                          </span>
                        </div>
                        <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                          Optimized for lightweight nodes (1–2 GB RAM) to minimize memory overhead.
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className={cn("text-xs sm:text-sm leading-relaxed mb-6", isDark ? "text-zinc-300" : "text-slate-600")}>
                    By default, built-in <strong>Traefik</strong> (Ingress Controller) and <strong>ServiceLB</strong> (Klipper LoadBalancer) are disabled during cluster deployment. This saves over <strong>500 MB</strong> of RAM, preventing out-of-memory errors on modest virtual machines. If your workloads require HTTP/HTTPS ingress routing, SSL/TLS termination, or external LoadBalancers, choose your preferred setup below:
                  </p>

                  {/* Tabs */}
                  <div className={cn("flex flex-wrap gap-2 border-b pb-4 mb-5", isDark ? "border-slate-800" : "border-slate-200")}>
                    <button
                      type="button"
                      onClick={() => setIngressGuideTab("nginx")}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all border flex items-center gap-2",
                        ingressGuideTab === "nginx"
                          ? (isDark ? "bg-cyan-500/15 text-cyan-300 font-semibold border-cyan-500/30 shadow-sm" : "bg-white text-cyan-900 font-semibold border border-cyan-600 shadow-sm ring-1 ring-cyan-600/20")
                          : (isDark ? "bg-[#060b14] text-zinc-400 hover:text-white border-slate-800" : "bg-slate-50 text-slate-600 hover:text-slate-900 border-slate-200")
                      )}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      Ingress-NGINX (Recommended)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIngressGuideTab("builtin")}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all border flex items-center gap-2",
                        ingressGuideTab === "builtin"
                          ? (isDark ? "bg-cyan-500/15 text-cyan-300 font-semibold border-cyan-500/30 shadow-sm" : "bg-white text-cyan-900 font-semibold border border-cyan-600 shadow-sm ring-1 ring-cyan-600/20")
                          : (isDark ? "bg-[#060b14] text-zinc-400 hover:text-white border-slate-800" : "bg-slate-50 text-slate-600 hover:text-slate-900 border-slate-200")
                      )}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Re-enable Built-in Traefik & ServiceLB
                    </button>
                    <button
                      type="button"
                      onClick={() => setIngressGuideTab("helm")}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all border flex items-center gap-2",
                        ingressGuideTab === "helm"
                          ? (isDark ? "bg-cyan-500/15 text-cyan-300 font-semibold border-cyan-500/30 shadow-sm" : "bg-white text-cyan-900 font-semibold border border-cyan-600 shadow-sm ring-1 ring-cyan-600/20")
                          : (isDark ? "bg-[#060b14] text-zinc-400 hover:text-white border-slate-800" : "bg-slate-50 text-slate-600 hover:text-slate-900 border-slate-200")
                      )}
                    >
                      <Box className="w-3.5 h-3.5" />
                      Traefik via Helm
                    </button>
                  </div>

                  {/* Tab Contents */}
                  <div className="space-y-4">
                    {ingressGuideTab === "nginx" && (
                      <div className="space-y-3">
                        <p className={cn("text-xs sm:text-sm", isDark ? "text-zinc-300" : "text-slate-600")}>
                          <strong>Ingress-NGINX</strong> is the industry-standard controller. It is highly lightweight (~80–120 MB RAM), reliable, and ready to bind node ports 80 and 443 out-of-the-box:
                        </p>
                        <div className={cn("relative border rounded-xl p-4 font-mono text-xs overflow-x-auto shadow-inner", isDark ? "bg-[#060b14] border-slate-800 text-cyan-300" : "bg-slate-900 border-slate-800 text-cyan-300")}>
                          <button
                            type="button"
                            onClick={() => handleCopyCommand("kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.12.0/deploy/static/provider/baremetal/deploy.yaml", "nginx-deploy")}
                            className={cn("absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all", isDark ? "bg-white/10 hover:bg-white/20 text-white border-white/10" : "bg-white/10 hover:bg-white/20 text-white border-white/10")}
                          >
                            {copiedCommandId === "nginx-deploy" ? (
                              <><Check className="w-3.5 h-3.5 text-emerald-400" /> <span className="text-emerald-400">Copied</span></>
                            ) : (
                              <><Copy className="w-3.5 h-3.5 text-cyan-400" /> <span>Copy</span></>
                            )}
                          </button>
                          <pre className="pr-20 whitespace-pre-wrap select-all">
                            kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.12.0/deploy/static/provider/baremetal/deploy.yaml
                          </pre>
                        </div>
                        <div className={cn("flex items-center gap-2 text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>
                          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span>Verify deployment: <code className={cn("font-mono font-semibold", isDark ? "text-cyan-400" : "text-cyan-700")}>kubectl get pods -n ingress-nginx -w</code></span>
                        </div>
                      </div>
                    )}

                    {ingressGuideTab === "builtin" && (
                      <div className="space-y-3">
                        <p className={cn("text-xs sm:text-sm", isDark ? "text-zinc-300" : "text-slate-600")}>
                          If you prefer using K3s bundled Traefik and ServiceLB (Klipper-LB), connect to your <strong>Master VM</strong> (via SSH or the Web Console button above) and remove the disable flags:
                        </p>
                        <div className={cn("relative border rounded-xl p-4 font-mono text-xs overflow-x-auto shadow-inner", isDark ? "bg-[#060b14] border-slate-800 text-cyan-300" : "bg-slate-900 border-slate-800 text-cyan-300")}>
                          <button
                            type="button"
                            onClick={() => handleCopyCommand("sudo sed -i 's/--disable traefik --disable servicelb//g' /etc/systemd/system/k3s.service && sudo systemctl daemon-reload && sudo systemctl restart k3s", "builtin-deploy")}
                            className={cn("absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all", isDark ? "bg-white/10 hover:bg-white/20 text-white border-white/10" : "bg-white/10 hover:bg-white/20 text-white border-white/10")}
                          >
                            {copiedCommandId === "builtin-deploy" ? (
                              <><Check className="w-3.5 h-3.5 text-emerald-400" /> <span className="text-emerald-400">Copied</span></>
                            ) : (
                              <><Copy className="w-3.5 h-3.5 text-cyan-400" /> <span>Copy</span></>
                            )}
                          </button>
                          <pre className="pr-20 whitespace-pre-wrap select-all">
                            {`# 1. Remove the disable flags and restart K3s on Master VM:\nsudo sed -i 's/--disable traefik --disable servicelb//g' /etc/systemd/system/k3s.service\nsudo systemctl daemon-reload && sudo systemctl restart k3s`}
                          </pre>
                        </div>
                        <div className={cn("flex items-center gap-2 text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>
                          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span>Verify deployment: <code className={cn("font-mono font-semibold", isDark ? "text-cyan-400" : "text-cyan-700")}>kubectl get pods -n kube-system -l app.kubernetes.io/name=traefik</code></span>
                        </div>
                      </div>
                    )}

                    {ingressGuideTab === "helm" && (
                      <div className="space-y-3">
                        <p className={cn("text-xs sm:text-sm", isDark ? "text-zinc-300" : "text-slate-600")}>
                          To deploy the latest official Traefik release with full custom values via Helm:
                        </p>
                        <div className={cn("relative border rounded-xl p-4 font-mono text-xs overflow-x-auto shadow-inner", isDark ? "bg-[#060b14] border-slate-800 text-cyan-300" : "bg-slate-900 border-slate-800 text-cyan-300")}>
                          <button
                            type="button"
                            onClick={() => handleCopyCommand("helm repo add traefik https://traefik.github.io/charts && helm repo update && helm install traefik traefik/traefik -n kube-system --set ports.web.nodePort=30080 --set ports.websecure.nodePort=30443", "helm-deploy")}
                            className={cn("absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all", isDark ? "bg-white/10 hover:bg-white/20 text-white border-white/10" : "bg-white/10 hover:bg-white/20 text-white border-white/10")}
                          >
                            {copiedCommandId === "helm-deploy" ? (
                              <><Check className="w-3.5 h-3.5 text-emerald-400" /> <span className="text-emerald-400">Copied</span></>
                            ) : (
                              <><Copy className="w-3.5 h-3.5 text-cyan-400" /> <span>Copy</span></>
                            )}
                          </button>
                          <pre className="pr-20 whitespace-pre-wrap select-all">
                            {`helm repo add traefik https://traefik.github.io/charts && helm repo update\nhelm install traefik traefik/traefik -n kube-system --set ports.web.nodePort=30080 --set ports.websecure.nodePort=30443`}
                          </pre>
                        </div>
                        <div className={cn("flex items-center gap-2 text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>
                          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span>Verify deployment: <code className={cn("font-mono font-semibold", isDark ? "text-cyan-400" : "text-cyan-700")}>kubectl get all -n kube-system -l app.kubernetes.io/name=traefik</code></span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

              {activeTab === "settings" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-500">
                  <div className="lg:col-span-2 space-y-6">
                    <div className={cn("border rounded-2xl md:rounded-3xl p-6 shadow-sm relative overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200")}>
                      <h2 className={cn("text-lg font-bold mb-6 flex items-center gap-2 relative z-10", isDark ? "text-white" : "text-slate-900")}>
                        <Settings className="w-5 h-5 text-cyan-400" />
                        General Settings
                      </h2>
                      <div className="space-y-5 relative z-10">
                        <div>
                          <label className={cn("block text-sm font-medium mb-2", isDark ? "text-zinc-400" : "text-slate-500")}>Cluster Name</label>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <input 
                              type="text" 
                              value={editClusterName} 
                              onChange={(e) => setEditClusterName(e.target.value)} 
                              className={cn("flex-1 w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all min-w-0 text-sm", isDark ? "bg-[#060b14] border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900")} 
                            />
                            <button onClick={handleSaveName} disabled={isSavingName || isSuspended} className="px-5 py-2.5 w-full sm:w-auto bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 disabled:opacity-50 font-semibold rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 text-sm">
                              {isSavingName && <RefreshCw className="w-4 h-4 animate-spin shrink-0" />}
                              Save
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className={cn("block text-sm font-medium mb-2", isDark ? "text-zinc-400" : "text-slate-500")}>Kubernetes Version</label>
                          <input type="text" value={cluster.version} disabled className={cn("w-full border rounded-xl px-4 py-2.5 cursor-not-allowed font-mono text-sm", isDark ? "bg-[#060b14]/50 border-slate-800 text-zinc-500" : "bg-slate-100 border-slate-200 text-slate-500")} />
                          <p className={cn("text-xs mt-2", isDark ? "text-zinc-500" : "text-slate-500")}>Upgrading the Kubernetes version is managed by the system administrator.</p>
                        </div>
                      </div>
                    </div>

                    <div className={cn("border rounded-2xl md:rounded-3xl p-6 shadow-sm relative overflow-visible", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200")}>
                      <h2 className={cn("text-lg font-bold mb-2 flex items-center gap-2 relative z-10", isDark ? "text-white" : "text-slate-900")}>
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        Delete Cluster
                      </h2>
                      <p className={cn("text-sm mb-6 relative z-10", isDark ? "text-zinc-400" : "text-slate-500")}>These actions are permanent and cannot be undone. Proceed with extreme caution.</p>

                      <div className="space-y-4 relative z-10">
                        <div className={cn("flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 border transition-colors rounded-2xl gap-4", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}>
                          <div>
                            <h3 className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-900")}>Reinstall Kubernetes Cluster</h3>
                            <p className={cn("text-xs mt-1.5 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>Wipe the current K3s installation and reinstall with a fresh state. All cluster data will be lost.</p>
                            <div className="mt-3">
                              <Select
                                value={reinstallVersion}
                                onChange={(val) => setReinstallVersion(val)}
                                options={K3S_VERSIONS.map(v => ({ value: v.id, label: v.name }))}
                                placeholder="Select version"
                                className={cn("w-[220px]", isDark ? "bg-[#060b14]" : "bg-white")}
                              />
                            </div>
                          </div>
                          <button onClick={handleReinstallCluster} disabled={isReinstalling || isSuspended} className={cn("px-5 py-2.5 w-full sm:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 border shadow-sm", isDark ? "bg-white/10 hover:bg-white/20 text-white border-white/10" : "bg-white hover:bg-slate-100 text-slate-900 border-slate-300")}>
                            {isReinstalling ? <RefreshCw className="w-4 h-4 animate-spin shrink-0" /> : <RefreshCw className="w-4 h-4 shrink-0" />}
                            {isReinstalling ? "Reinstalling..." : "Reinstall Cluster"}
                          </button>
                        </div>

                        <div className={cn("flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 border transition-colors rounded-2xl gap-4", isDark ? "bg-red-500/5 hover:bg-red-500/10 border-red-500/20" : "bg-red-50/60 hover:bg-red-50 border-red-200")}>
                          <div>
                            <h3 className="text-red-500 dark:text-red-400 font-bold text-sm">Delete Cluster</h3>
                            <p className={cn("text-xs mt-1.5 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-600")}>Completely destroy this cluster and all its nodes. All data will be permanently wiped and IP addresses released. Final usage will be billed for Pay-As-You-Go instances.</p>
                          </div>
                          <button onClick={handleTerminateCluster} disabled={isTerminating} className="px-5 py-2.5 w-full sm:w-auto justify-center bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-red-600 dark:text-red-400 border border-red-500/20 text-sm font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2">
                            {isTerminating ? <RefreshCw className="w-4 h-4 animate-spin shrink-0" /> : <Trash2 className="w-4 h-4 shrink-0" />}
                            {isTerminating ? "Deleting..." : "Delete Cluster"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className={cn("border rounded-2xl md:rounded-3xl p-6 shadow-sm", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200")}>
                      <h2 className={cn("text-lg font-bold mb-6", isDark ? "text-white" : "text-slate-900")}>Security Options</h2>
                      <div className="space-y-4">
                        <div className={cn("p-5 border rounded-2xl hover:border-cyan-500/30 transition-colors group", isDark ? "bg-[#060b14] border-slate-800" : "bg-slate-50 border-slate-200")}>
                          <h3 className={cn("font-bold text-sm group-hover:text-cyan-400 transition-colors", isDark ? "text-white" : "text-slate-900")}>Rotate Certificates</h3>
                          <p className={cn("text-xs mt-1.5 mb-5 leading-relaxed", isDark ? "text-zinc-400" : "text-slate-500")}>Rotate all K3s control plane certificates. You will need to download a new kubeconfig file.</p>
                          <button onClick={handleRotateCertificates} disabled={isRotating || isSuspended} className={cn("w-full px-4 py-2.5 border disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm", isDark ? "bg-white/5 hover:bg-cyan-500/10 border-white/10 text-white" : "bg-white hover:bg-cyan-50 text-slate-900 border-slate-300")}>
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
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className={cn("text-lg font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                        <Terminal className="w-5 h-5 text-cyan-500" />
                        Provisioning &amp; Runtime Logs
                      </h2>
                      <p className={cn("text-xs md:text-sm mt-0.5", isDark ? "text-slate-400" : "text-slate-600")}>
                        Live streaming logs from control plane provisioning, cloud-init, and K3s services
                      </p>
                    </div>
                  </div>

                  <div className="developer-terminal border rounded-2xl shadow-xl overflow-hidden border-slate-800 bg-[#060b14]" style={{ backgroundColor: '#060b14' }}>
                    {/* Terminal header bar */}
                    <div className="developer-terminal-header flex items-center gap-2 px-4 py-3 bg-[#0b1322] border-b border-slate-800 select-none" style={{ backgroundColor: '#0b1322', borderColor: '#1e293b' }}>
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                        <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                      </div>
                      <span className="developer-terminal-title text-xs md:text-sm font-mono mx-auto text-white font-bold tracking-wide flex items-center gap-2" style={{ color: '#ffffff' }}>
                        <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                        provisioning-log — {masterNode?.hostname || cluster.name}
                      </span>
                      {['PENDING', 'PROVISIONING', 'WAITING_FOR_CLOUD_INIT', 'WAITING_FOR_SSH', 'INSTALLING_K3S'].includes(cluster.status) ? (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          LIVE
                        </span>
                      ) : cluster.status === 'RUNNING' ? (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          RUNNING
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                          {cluster.status}
                        </span>
                      )}
                    </div>

                    {/* Terminal body */}
                    <div
                      className="p-4 md:p-6 h-[60vh] overflow-auto font-mono text-xs md:text-sm leading-relaxed custom-scrollbar bg-[#060b14]"
                      style={{ backgroundColor: '#060b14', scrollBehavior: 'smooth' }}
                    >
                      {installLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-300">
                          <Terminal className="w-10 h-10 opacity-40 text-cyan-400" />
                          <p className="text-sm font-medium">No provisioning logs yet.</p>
                          <p className="text-xs text-slate-400">Logs will appear here when the cluster is being provisioned or reinstalled.</p>
                        </div>
                      ) : (
                        <div className="flex flex-col min-w-max">
                          {installLogs.map((entry, i) => (
                            <div key={i} className="flex gap-4 group hover:bg-slate-800/40 rounded px-2 py-0.5 transition-colors">
                              <span className="terminal-time shrink-0 text-xs pt-0.5 select-none font-mono font-medium text-slate-300 group-hover:text-white transition-colors" style={{ color: '#94a3b8' }}>
                                {new Date(entry.ts).toLocaleTimeString('en-GB', { hour12: false })}
                              </span>
                              <span className={cn(
                                "whitespace-pre font-mono",
                                entry.msg.startsWith('ERROR') ? "text-red-400 font-bold" :
                                  entry.msg.startsWith('Warning') ? "text-amber-400 font-medium" :
                                    entry.msg.includes('successfully') || entry.msg.includes('RUNNING') || entry.msg.includes('installed') ? "text-emerald-400 font-semibold" :
                                      entry.msg.includes('Starting') || entry.msg.includes('Installing') || entry.msg.includes('Reading') || entry.msg.includes('Connecting') || entry.msg.includes('[K3s Reinstall]') || entry.msg.includes('[Cloud-Init') || entry.msg.includes('[INFO]') ? "text-cyan-400 font-semibold" :
                                        entry.msg.startsWith('+') ? "terminal-cmd text-white font-semibold" :
                                          entry.msg.includes('Waiting') || entry.msg.includes('not ready') || entry.msg.includes('Retrying') ? "text-yellow-400/80" :
                                            "terminal-text text-slate-200"
                              )}>
                                {entry.msg.startsWith('ERROR') ? (
                                  <span className="text-red-500 font-bold mr-1">[ERROR]</span>
                                ) : null}
                                {entry.msg.replace(/^ERROR: /, '')}
                              </span>
                            </div>
                          ))}
                          {/* Blinking cursor when live */}
                          {['PENDING', 'PROVISIONING', 'WAITING_FOR_CLOUD_INIT', 'WAITING_FOR_SSH', 'INSTALLING_K3S'].includes(cluster.status) && (
                            <div className="flex gap-4 px-2 py-0.5 mt-1">
                              <span className="text-xs select-none opacity-0 text-slate-500 font-mono">
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
                    <div className="developer-terminal-footer flex items-center justify-between px-4 py-2.5 border-t border-slate-800 bg-[#0b1322]" style={{ backgroundColor: '#0b1322', borderColor: '#1e293b' }}>
                      <span className="terminal-muted text-xs font-mono text-slate-300 font-medium" style={{ color: '#94a3b8' }}>
                        {installLogs.length} entries
                      </span>
                      <button
                        onClick={() => logEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                        className="terminal-muted text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-1 font-semibold"
                        style={{ color: '#94a3b8' }}
                      >
                        ↓ Scroll to bottom
                      </button>
                    </div>
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
              className="absolute inset-0 bg-black/60"
              onClick={() => !editRoleModal.isUpdating && setEditRoleModal(prev => ({ ...prev, isOpen: false }))}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn("relative w-full max-w-md border rounded-2xl p-6 overflow-hidden shadow-xl", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200")}
            >
              <h3 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>Edit Node Role</h3>
              <p className={cn("text-sm mb-6", isDark ? "text-zinc-400" : "text-slate-500")}>
                Update Kubernetes role for node <span className={cn("font-mono font-semibold", isDark ? "text-white" : "text-slate-900")}>{editRoleModal.nodeName}</span>
              </p>

              <div className="space-y-4">
                <div>
                  <label className={cn("block text-xs font-medium uppercase tracking-wider mb-2", isDark ? "text-zinc-400" : "text-slate-500")}>Role Name</label>
                  <input
                    type="text"
                    value={editRoleModal.currentRole}
                    onChange={(e) => setEditRoleModal(prev => ({ ...prev, currentRole: e.target.value }))}
                    placeholder="e.g. worker, database, ingress"
                    className={cn("w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-colors", isDark ? "bg-[#060b14] border-slate-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900")}
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
                  className={cn("flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors border disabled:opacity-50", isDark ? "bg-white/5 hover:bg-white/10 text-white border-white/10" : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200")}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateRole(editRoleModal.currentRole)}
                  disabled={editRoleModal.isUpdating || !editRoleModal.currentRole}
                  className="flex-1 px-4 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {editRoleModal.isUpdating ? (
                    <><div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" /> Updating...</>
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