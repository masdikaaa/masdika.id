"use client";

import { useUrlNumber, useUrlString, useUrlTab } from "@/lib/useUrlTab";
import { useState, useEffect, use, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Server, Play, Square, Power, RotateCcw, Activity, Cpu,
  Terminal, Settings, Settings2, HardDrive, Network, Wrench, ShieldAlert, Calculator, Shield,
  ArrowLeft, ChevronLeft, ShieldCheck, Archive, RefreshCw, Plus, AlertTriangle, CheckCircle, Receipt, CreditCard, Trash2, Wallet, X, Eye, EyeOff, Copy, XCircle, Info
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Select } from "@/components/ui/Select";
import { useTheme } from "@/components/ThemeProvider";
import { Pagination } from "@/components/ui/Pagination";
import { formatRupiah } from "@/lib/billing";

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

const formatTime = (time: string) => {
  if (!time) return '';
  const date = new Date(time);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatBytesPerSecond = (bytes: number) => {
  if (!bytes) return '0 B/s';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export default function VpsDetailDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const router = useRouter();
  const { id } = use(params);

  const [vps, setVps] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [activeTab, setActiveTab] = useUrlTab<string>("overview");

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Metrics Data
  const [metrics, setMetrics] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [taskPage, setTaskPage] = useUrlNumber("taskPage", 1);
  const [taskFilter, setTaskFilter] = useUrlString<string>("taskFilter", "");
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [rulePage, setRulePage] = useUrlNumber("rulePage", 1);
  const RULES_PER_PAGE = 10;

  // Additional State for New Tabs
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [reinstalling, setReinstalling] = useState(false);
  const [settingsMenu, setSettingsMenu] = useUrlString<string>("settingsMenu", "hostname");
  const [hostnameInput, setHostnameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordConfirmInput, setPasswordConfirmInput] = useState("");
  const [sshKeyInput, setSshKeyInput] = useState("");
  const [showReinstallModal, setShowReinstallModal] = useState(false);

  const [reinstallPassword, setReinstallPassword] = useState("");
  const [reinstallPasswordConfirm, setReinstallPasswordConfirm] = useState("");
  const [reinstallPasswordError, setReinstallPasswordError] = useState("");
  const [showReinstallPassword, setShowReinstallPassword] = useState(false);

  const [isGeneratingKey, setIsGeneratingKey] = useState(false);

  // Backup Modal States
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);

  // Reserve IP State
  const [showReserveIpModal, setShowReserveIpModal] = useState(false);
  const [availableIps, setAvailableIps] = useState<any[]>([]);
  const [selectedReserveIp, setSelectedReserveIp] = useState("");
  const [fetchingIps, setFetchingIps] = useState(false);

  // Unreserve IP State
  const [showUnreserveModal, setShowUnreserveModal] = useState(false);
  const [unreserveIpAddress, setUnreserveIpAddress] = useState("");
  const [isUnreserving, setIsUnreserving] = useState(false);

  // Snapshots State
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [snapshotName, setSnapshotName] = useState("");
  const [snapshotDesc, setSnapshotDesc] = useState("");
  const [snapshotIncludeRam, setSnapshotIncludeRam] = useState(false);
  const [isSnapshotting, setIsSnapshotting] = useState(false);
  const [snapshotActionLoading, setSnapshotActionLoading] = useState<string | null>(null);
  const [showEditSnapshotModal, setShowEditSnapshotModal] = useState<string | null>(null);
  const [editSnapshotDesc, setEditSnapshotDesc] = useState("");
  const [showRollbackModal, setShowRollbackModal] = useState<string | null>(null);
  const [showDeleteSnapshotModal, setShowDeleteSnapshotModal] = useState<string | null>(null);

  // Backups State
  const [backups, setBackups] = useState<any[]>([]);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [backupQuota, setBackupQuota] = useState(0);
  const [backupUsed, setBackupUsed] = useState(0);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupSchedule, setBackupSchedule] = useState("NONE");
  const [isSettingSchedule, setIsSettingSchedule] = useState(false);

  // Task Log States
  const [expandedTaskUpid, setExpandedTaskUpid] = useState<string | null>(null);
  const [taskLog, setTaskLog] = useState<any[]>([]);
  const [taskLogLoading, setTaskLogLoading] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Upgrade States
  const [upgradeCores, setUpgradeCores] = useState(0);
  const [upgradeRam, setUpgradeRam] = useState(0);
  const [upgradeDisk, setUpgradeDisk] = useState(0);
  const [upgradeBackup, setUpgradeBackup] = useState(0);
  const [upgradeBandwidth, setUpgradeBandwidth] = useState(0);
  const [bandwidthOptions, setBandwidthOptions] = useState<number[]>([100, 150, 200, 250, 300]);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [maxSpecs, setMaxSpecs] = useState({ cpu: 32, ram: 128, disk: 2000, backup: 2000 });

  // Upgrade IP States
  const [ipPage, setIpPage] = useUrlNumber("ipPage", 1);
  const [addIpv4Count, setAddIpv4Count] = useState(0);
  const [addIpv6Count, setAddIpv6Count] = useState(0);
  const [hasIpv4Pool, setHasIpv4Pool] = useState(false);
  const [hasIpv6Pool, setHasIpv6Pool] = useState(false);
  const [pricing, setPricing] = useState<Record<string, number>>({});
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>("BALANCE");
  const [balance, setBalance] = useState<number>(0);

  // Addon Disk States
  const [addonStorage, setAddonStorage] = useState("");
  const [addonSize, setAddonSize] = useState(20);
  const [isAddingDisk, setIsAddingDisk] = useState(false);
  const [allowedAddonStorages, setAllowedAddonStorages] = useState<string[]>([]);
  const [addonDisks, setAddonDisks] = useState<any[]>([]);
  const [deleteDiskSlot, setDeleteDiskSlot] = useState<string | null>(null);
  const [isDeletingDisk, setIsDeletingDisk] = useState(false);

  // Group templates by OS Family
  const osGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    templates.forEach(t => {
      let family = "Other";
      const name = t.name.toLowerCase();
      if (name.includes('ubuntu')) family = 'Ubuntu';
      else if (name.includes('centos')) family = 'CentOS';
      else if (name.includes('debian')) family = 'Debian';
      else if (name.includes('rocky')) family = 'Rocky Linux';
      else if (name.includes('almalinux') || name.includes('alma')) family = 'AlmaLinux';
      else if (name.includes('alpine')) family = 'Alpine Linux';
      else if (name.includes('fedora')) family = 'Fedora';
      else if (name.includes('windows')) family = 'Windows';
      else if (name.includes('freebsd')) family = 'FreeBSD';
      else if (name.includes('mikrotik') || name.includes('chr')) family = 'MikroTik';

      if (!groups[family]) groups[family] = [];
      groups[family].push(t);
    });
    return groups;
  }, [templates]);

  const [activeOsFamily, setActiveOsFamily] = useState<string | null>(null);

  // Firewall States
  const [firewallRules, setFirewallRules] = useState<any[]>([]);
  const [firewallLoading, setFirewallLoading] = useState(false);
  const [showFirewallModal, setShowFirewallModal] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [deletingRulePos, setDeletingRulePos] = useState<string | null>(null);
  const [isDeletingRule, setIsDeletingRule] = useState(false);
  const [ruleType, setRuleType] = useState("in");
  const [ruleProto, setRuleProto] = useState("tcp");
  const [rulePort, setRulePort] = useState("");
  const [ruleSource, setRuleSource] = useState("");
  const [ruleComment, setRuleComment] = useState("");
  const [isSavingRule, setIsSavingRule] = useState(false);
  const [selectedFirewallRules, setSelectedFirewallRules] = useState<string[]>([]);

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
      const res = await fetch(`/api/user/vps/${id}/alerts`);
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
      const res = await fetch(`/api/user/vps/${id}/alerts`, {
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

  const fetchFirewallRules = async () => {
    try {
      setFirewallLoading(true);
      const res = await fetch(`/api/user/vps/${id}/firewall`);
      const data = await res.json();
      if (data.success) {
        setFirewallRules(data.rules || []);
        setRulePage((p) => Math.min(p, Math.max(1, Math.ceil((data.rules || []).length / RULES_PER_PAGE))));
      } else {
        toast.error(data.error || "Failed to load firewall rules");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFirewallLoading(false);
    }
  };

  useEffect(() => {
    if (editingRule) {
      setRuleType(editingRule.type || "in");
      setRuleProto(editingRule.proto || "tcp");
      setRulePort(editingRule.dport ? editingRule.dport.replace(/:/g, '-') : "");
      setRuleSource(editingRule.source || "");
      setRuleComment(editingRule.comment || "");
    } else {
      setRuleType("in");
      setRuleProto("tcp");
      setRulePort("");
      setRuleSource("");
      setRuleComment("");
    }
  }, [editingRule]);

  const fetchVpsDetails = async () => {
    try {
      const res = await fetch(`/api/user/vps/${id}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setVps(data.vps);
        setStatus(data.liveStatus);
        if (data.allowedAddonStorages) {
          setAllowedAddonStorages(data.allowedAddonStorages);
          if (!addonStorage && data.allowedAddonStorages.length > 0) {
            setAddonStorage(data.allowedAddonStorages[0]);
          }
        }

        if (data.addonDisks) {
          setAddonDisks(data.addonDisks);
        }

        if (data.maxSpecs) {
          setMaxSpecs(data.maxSpecs);
        }

        if (data.hasIpv4Pool !== undefined) setHasIpv4Pool(data.hasIpv4Pool);
        if (data.hasIpv6Pool !== undefined) setHasIpv6Pool(data.hasIpv6Pool);
        if (data.pricing) setPricing(data.pricing);
        if (data.bandwidthOptions && Array.isArray(data.bandwidthOptions) && data.bandwidthOptions.length > 0) {
          setBandwidthOptions(data.bandwidthOptions);
        }

        // Init upgrade sliders (using functional update to avoid stale closures in setInterval)
        setUpgradeCores(prev => prev === 0 ? data.vps.cpuCores : prev);
        setUpgradeRam(prev => prev === 0 ? data.vps.ramGb : prev);
        setUpgradeDisk(prev => prev === 0 ? data.vps.diskGb : prev);
        setUpgradeBackup(prev => prev === 0 ? (data.vps.backupGb || 0) : prev);
        setUpgradeBandwidth(prev => prev === 0 ? (data.vps.bandwidthMbps || 100) : prev);
        if (data.vps.backupSchedule) {
          setBackupSchedule(data.vps.backupSchedule);
        }
      } else {
        toast.error(data.error || "Failed to load VPS");
        router.push("/dashboard/vps");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async (showLoading = false) => {
    try {
      if (showLoading && metrics.length === 0) setMetricsLoading(true);
      const res = await fetch(`/api/user/vps/${id}/metrics`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        
        let processedData = Array.isArray(data) ? data : (data.data || []);
        
        // Extract timestamp array and actual data arrays
        if (!Array.isArray(processedData) && processedData.time) {
           const times = processedData.time;
           processedData = times.map((t: any, idx: number) => ({
             time: t * 1000,
             cpu: processedData.cpu?.[idx] || 0,
             mem: processedData.mem?.[idx] || 0,
             netin: processedData.netin?.[idx] || 0,
             netout: processedData.netout?.[idx] || 0,
             diskread: processedData.diskread?.[idx] || 0,
             diskwrite: processedData.diskwrite?.[idx] || 0,
           }));
        }
        
        setMetrics(processedData);
      }
    } catch (error) {
      console.error("Failed to load metrics", error);
    } finally {
      if (showLoading) setMetricsLoading(false);
    }
  };

  useEffect(() => {
    fetchVpsDetails();
    const interval = setInterval(fetchVpsDetails, 5000); // 5s refresh
    return () => clearInterval(interval);
  }, [id]);

  const fetchTasks = async () => {
    try {
      const res = await fetch(`/api/user/vps/${id}/tasks?limit=500`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (error) {
      console.error("Failed to load tasks", error);
    }
  };

  const fetchBackups = async (showLoading = false) => {
    try {
      if (showLoading && backups.length === 0) setBackupsLoading(true);
      const res = await fetch(`/api/user/vps/${id}/backups`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups || []);
        setBackupQuota(data.quotaGb || 0);
        setBackupUsed(data.usedBytes || 0);
      }
    } catch (error) {
      console.error("Failed to load backups", error);
    } finally {
      if (showLoading) setBackupsLoading(false);
    }
  };

  const fetchSnapshots = async (showLoading = false) => {
    try {
      if (showLoading && snapshots.length === 0) setSnapshotsLoading(true);
      const res = await fetch(`/api/user/vps/${id}/snapshots`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const snapshotsArray = Array.isArray(data) ? data : (data.data || []);
        const actualSnaps = snapshotsArray.filter((s: any) => s.name && s.name !== 'current');
        setSnapshots(actualSnaps);
      }
    } catch (error) {
      console.error("Failed to load snapshots", error);
    } finally {
      if (showLoading) setSnapshotsLoading(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTab === "overview" || activeTab === "graphs") {
      fetchMetrics(true);
      interval = setInterval(() => fetchMetrics(false), 5000); // 5s refresh
    } else if (activeTab === "tasks") {
      fetchTasks();
      interval = setInterval(fetchTasks, 5000); // 5s refresh
    } else if (activeTab === "install" && templates.length === 0) {
      fetch("/api/user/vps/order-data")
        .then(res => res.json())
        .then(data => {
          if (data.templates) setTemplates(data.templates);
        });
    } else if (activeTab === "backups") {
      fetchBackups(true);
      interval = setInterval(() => {
          fetchBackups(false);
      }, 10000); // 10s refresh for backups
    } else if (activeTab === "snapshots") {
      fetchSnapshots(true);
      interval = setInterval(() => {
          fetchSnapshots(false);
      }, 5000); // 5s refresh for snapshots
    } else if (activeTab === "upgrade") {
      fetch("/api/user/billing").then(r => r.json()).then(data => {
        if (data.success) {
          setBalance(data.data.balance || 0);
        }
      });
    } else if (activeTab === "firewall") {
      fetchFirewallRules();
    } else if (activeTab === "alerts") {
      fetchAlertRules();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab, id, templates.length]);

  // Auto-expand running task
  useEffect(() => {
    if (activeTab === "tasks") {
      const runningTask = tasks.find(t => !t.status);
      if (runningTask && expandedTaskUpid !== runningTask.upid) {
        setExpandedTaskUpid(runningTask.upid);
      }
    }
  }, [activeTab, tasks]);

  const fetchExpandedLog = async (showLoadingState = false) => {
    if (!expandedTaskUpid) return;
    if (showLoadingState) setTaskLogLoading(true);
    try {
      const res = await fetch(`/api/user/vps/${id}/tasks/${encodeURIComponent(expandedTaskUpid)}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setTaskLog(data.log || []);
        if (data.status?.status) {
          fetchTasks(); // refresh to show OK status
        }
      }
    } catch (e) {
    } finally {
      if (showLoadingState) setTaskLogLoading(false);
    }
  };

  // Poll task log
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (expandedTaskUpid && activeTab === "tasks") {
      fetchExpandedLog(true);
      // Poll every 2s
      interval = setInterval(() => fetchExpandedLog(false), 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [expandedTaskUpid, activeTab]);

  // Auto-scroll log container
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [taskLog]);





  const takeSnapshot = async () => {
    if (!snapshotName) {
      toast.error("Snapshot name is required");
      return;
    }
    if (snapshots.length >= 2) {
      toast.error("Maximum snapshot limit (2) reached. Please delete an old snapshot first.");
      return;
    }
    setIsSnapshotting(true);
    try {
      const res = await fetch(`/api/user/vps/${id}/snapshots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapname: snapshotName, description: snapshotDesc, includeRam: snapshotIncludeRam })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Snapshot creation started");
        setShowSnapshotModal(false);
        setSnapshotName("");
        setSnapshotDesc("");
        setSnapshotIncludeRam(false);
        fetchSnapshots();
        fetchTasks();
        fetchVpsDetails();
      } else {
        toast.error(data.error || "Failed to create snapshot");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsSnapshotting(false);
    }
  };

  const rollbackSnapshot = async () => {
    if (!showRollbackModal) return;
    const snapname = showRollbackModal;
    setSnapshotActionLoading(snapname);
    try {
      const res = await fetch(`/api/user/vps/${id}/snapshots/${snapname}`, {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Rollback to ${snapname} started`);
        fetchTasks();
        fetchVpsDetails();
      } else {
        toast.error(data.error || "Failed to rollback snapshot");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setSnapshotActionLoading(null);
      setShowRollbackModal(null);
    }
  };

  const deleteSnapshot = async () => {
    if (!showDeleteSnapshotModal) return;
    const snapname = showDeleteSnapshotModal;
    setSnapshotActionLoading(snapname);
    try {
      const res = await fetch(`/api/user/vps/${id}/snapshots/${snapname}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Snapshot ${snapname} deletion started`);
        fetchSnapshots();
        fetchTasks();
        fetchVpsDetails();
      } else {
        toast.error(data.error || "Failed to delete snapshot");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setSnapshotActionLoading(null);
      setShowDeleteSnapshotModal(null);
    }
  };

  const updateSnapshotDesc = async () => {
    if (!showEditSnapshotModal) return;
    setSnapshotActionLoading(showEditSnapshotModal);
    try {
      const res = await fetch(`/api/user/vps/${id}/snapshots/${showEditSnapshotModal}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: editSnapshotDesc })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Snapshot description updated`);
        fetchSnapshots();
        setShowEditSnapshotModal(null);
      } else {
        toast.error(data.error || "Failed to update snapshot");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setSnapshotActionLoading(null);
    }
  };

  const handleDeleteAddonDisk = (slot: string) => {
    setDeleteDiskSlot(slot);
  };

  const confirmDeleteAddonDisk = async () => {
    if (!deleteDiskSlot) return;
    setIsDeletingDisk(true);
    try {
      const res = await fetch(`/api/user/vps/${id}/addon-disk/${deleteDiskSlot}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        fetchVpsDetails();
      } else {
        toast.error(data.error);
      }
    } catch (e) {
      toast.error("Failed to delete add-on disk");
    } finally {
      setIsDeletingDisk(false);
      setDeleteDiskSlot(null);
    }
  };

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await fetch(`/api/user/vps/${id}/backups`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Backup started successfully! Check the Tasks tab for progress.");
        fetchBackups();
        fetchTasks();
        setActiveTab("tasks");
      } else {
        toast.error(data.error || "Failed to start backup");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsBackingUp(false);
    }
  };

  const [nowTime, setNowTime] = useState(0);
  useEffect(() => { setNowTime(Date.now()); }, []);

  const {
    upgradeCostNow,
    additionalHourlyRate,
    additionalDiskMonthly,
    additionalDiskHourly,
    additionalCpuMonthly,
    additionalCpuHourly,
    additionalRamMonthly,
    additionalRamHourly,
    additionalBandwidthMonthly,
    additionalBandwidthHourly,
    newMonthlyPrice,
    newHourlyPrice,
    requiredBalance,
    hasUpgrades,
    remainingHours,
    isSsd,
    diskRatePerGbMonthly,
    addedDiskGb,
    additionalCpu,
    additionalRam,
    addedBandwidthMbps,
    currentBandwidthMbps,
    safeUpgradeBandwidthMbps,
    additionalBackupMonthly,
    additionalBackupHourly,
    additionalBackupGb,
    backupRatePerHour,
    backupMonthlyRate
  } = useMemo(() => {
    if (!vps) return {
      upgradeCostNow: 0,
      additionalHourlyRate: 0,
      additionalDiskMonthly: 0,
      additionalDiskHourly: 0,
      additionalCpuMonthly: 0,
      additionalCpuHourly: 0,
      additionalRamMonthly: 0,
      additionalRamHourly: 0,
      additionalBandwidthMonthly: 0,
      additionalBandwidthHourly: 0,
      additionalBackupMonthly: 0,
      additionalBackupHourly: 0,
      additionalBackupGb: 0,
      backupRatePerHour: 30,
      backupMonthlyRate: 30 * 730,
      newMonthlyPrice: 0,
      newHourlyPrice: 0,
      requiredBalance: 0,
      hasUpgrades: false,
      remainingHours: 1,
      isSsd: false,
      diskRatePerGbMonthly: 4000,
      addedDiskGb: 0,
      additionalCpu: 0,
      additionalRam: 0,
      addedBandwidthMbps: 0,
      currentBandwidthMbps: 100,
      safeUpgradeBandwidthMbps: 100
    };

    const currentBandwidth = vps.bandwidthMbps || 100;
    const safeUpgradeBandwidth = Math.max(currentBandwidth, upgradeBandwidth || currentBandwidth);
    const addedBandwidth = safeUpgradeBandwidth - currentBandwidth;
    const addedBandwidthSteps = Math.floor(addedBandwidth / 50);

    const additionalCpuCores = Math.max(0, upgradeCores - (vps.cpuCores || 0));
    const additionalRamGb = Math.max(0, upgradeRam - (vps.ramGb || 0));
    const addedDisk = Math.max(0, upgradeDisk - (vps.diskGb || 0));
    const additionalBackup = Math.max(0, upgradeBackup - (vps.backupGb || 0));

    // Active VPS CPU upgrade pricing: Rp 50.000 / Core / month
    const cpuMonthlyAdded = additionalCpuCores * 50000;
    const cpuHourlyAdded = Math.ceil(cpuMonthlyAdded / 730);

    // Active VPS RAM upgrade pricing: Rp 25.000 / GB / month
    const ramMonthlyAdded = additionalRamGb * 25000;
    const ramHourlyAdded = Math.ceil(ramMonthlyAdded / 730);

    // Active VPS disk upgrade rate: HDD = Rp 4.000 / GB / month, SSD = Rp 5.000 / GB / month
    const isSsdDisk = (vps.diskType || "").toUpperCase() === "SSD";
    const diskMonthlyRate = isSsdDisk ? 5000 : 4000;
    const diskMonthlyAdded = addedDisk * diskMonthlyRate;
    const diskHourlyAdded = Math.ceil(diskMonthlyAdded / 730);

    // Active VPS Bandwidth upgrade pricing: Rp 50.000 per 50 Mbps step / month
    const bandwidthMonthlyAdded = addedBandwidthSteps * 50000;
    const bandwidthRatePerHour = pricing.bandwidth !== undefined ? pricing.bandwidth : Math.ceil(50000 / 730);
    const bandwidthHourlyAdded = addedBandwidthSteps * bandwidthRatePerHour;

    // Active VPS Backup upgrade pricing
    const bRatePerHour = pricing.backup !== undefined ? pricing.backup : 30;
    const bMonthlyRate = bRatePerHour * 730;
    const backupMonthlyAdded = additionalBackup * bMonthlyRate;
    const backupHourlyAdded = additionalBackup * bRatePerHour;

    let addRate = 0;
    addRate += cpuHourlyAdded;
    addRate += ramHourlyAdded;
    addRate += diskHourlyAdded;
    addRate += bandwidthHourlyAdded;
    addRate += backupHourlyAdded;
    addRate += addIpv4Count * (pricing.ipv4 || 0);
    addRate += addIpv6Count * (pricing.ipv6 || 0);

    const currentTime = nowTime || 1700000000000;
    const expiresAtTime = vps.expiresAt ? new Date(vps.expiresAt).getTime() : currentTime + (30 * 24 * 60 * 60 * 1000);
    const rHours = Math.max(1, Math.ceil((expiresAtTime - currentTime) / (1000 * 60 * 60)));

    const baseHourly = Number(vps.hourlyRate) || 0;
    const finalHourly = baseHourly + addRate;
    const reqBalance = finalHourly * 730;

    const hasAnyChange = addRate > 0 || addedDisk > 0 || additionalCpuCores > 0 || additionalRamGb > 0 || addedBandwidth > 0 || additionalBackup > 0 || addIpv4Count > 0 || addIpv6Count > 0;

    return {
      upgradeCostNow: reqBalance,
      additionalHourlyRate: addRate,
      additionalDiskMonthly: diskMonthlyAdded,
      additionalDiskHourly: diskHourlyAdded,
      additionalCpuMonthly: cpuMonthlyAdded,
      additionalCpuHourly: cpuHourlyAdded,
      additionalRamMonthly: ramMonthlyAdded,
      additionalRamHourly: ramHourlyAdded,
      additionalBandwidthMonthly: bandwidthMonthlyAdded,
      additionalBandwidthHourly: bandwidthHourlyAdded,
      additionalBackupMonthly: backupMonthlyAdded,
      additionalBackupHourly: backupHourlyAdded,
      additionalBackupGb: additionalBackup,
      backupRatePerHour: bRatePerHour,
      backupMonthlyRate: bMonthlyRate,
      newMonthlyPrice: finalHourly * 730,
      newHourlyPrice: finalHourly,
      requiredBalance: reqBalance,
      hasUpgrades: hasAnyChange,
      remainingHours: rHours,
      isSsd: isSsdDisk,
      diskRatePerGbMonthly: diskMonthlyRate,
      addedDiskGb: addedDisk,
      additionalCpu: additionalCpuCores,
      additionalRam: additionalRamGb,
      addedBandwidthMbps: addedBandwidth,
      currentBandwidthMbps: currentBandwidth,
      safeUpgradeBandwidthMbps: safeUpgradeBandwidth
    };
  }, [vps, upgradeCores, upgradeRam, upgradeDisk, upgradeBackup, upgradeBandwidth, addIpv4Count, addIpv6Count, pricing, nowTime]);

  const handleUpgradeSpecs = async () => {
    setIsUpgrading(true);
    try {
      const res = await fetch(`/api/user/vps/${id}/upgrade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cpuCores: upgradeCores,
          ramGb: upgradeRam,
          diskGb: upgradeDisk,
          backupGb: upgradeBackup,
          bandwidthMbps: upgradeBandwidth || (vps.bandwidthMbps || 100),
          addIpv4Count,
          addIpv6Count,
          paymentMethodCode: "BALANCE"
        })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.paymentUrl) {
          window.location.href = data.paymentUrl;
          return;
        }
        toast.success("Specs upgraded successfully! Please reboot your VPS from the panel for changes to take effect.");
        fetchVpsDetails();
      } else {
        toast.error(data.error || "Failed to upgrade specs");
      }
    } catch (error) {
      toast.error("An error occurred during upgrade");
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleOpenReserveIpModal = async () => {
    setShowReserveIpModal(true);
    setFetchingIps(true);
    try {
      const res = await fetch(`/api/user/vps/${id}/available-ips`);
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

  const handleReserveIp = async () => {
    if (!selectedReserveIp) return toast.error("Please select an IP address");
    setActionLoading(true);
    try {
      const res = await fetch(`/api/user/vps/${id}/reserve-ip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ipAddress: selectedReserveIp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reserve IP");
      toast.success(`Successfully reserved IP: ${data.ipAddress}`);
      setShowReserveIpModal(false);
      fetchVpsDetails();
    } catch (err: any) {
      toast.error(err.message || "Failed to reserve IP");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnreserveIp = async () => {
    if (!unreserveIpAddress) return;
    setIsUnreserving(true);
    try {
      const res = await fetch(`/api/user/vps/${id}/unreserve-ip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ipAddress: unreserveIpAddress })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to unreserve IP");
      toast.success(data.message);
      setShowUnreserveModal(false);
      fetchVpsDetails();
    } catch (e: any) {
      toast.error(e.message || "Failed to unreserve IP");
    } finally {
      setIsUnreserving(false);
    }
  };

  const handleSaveSchedule = async () => {
    setIsSettingSchedule(true);
    try {
      const res = await fetch(`/api/user/vps/${id}/backups/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule: backupSchedule })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        fetchVpsDetails();
      } else {
        toast.error(data.error || "Failed to update schedule");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsSettingSchedule(false);
    }
  };

  const handleSaveFirewallRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingRule(true);
    try {
      const formattedPort = rulePort.replace(/-/g, ':');
      const payload = {
        type: ruleType,
        proto: ruleProto,
        dport: formattedPort,
        source: ruleSource,
        comment: ruleComment,
        action: "ACCEPT",
        enable: 1
      };

      const isEditing = editingRule && editingRule.pos !== undefined;
      const url = isEditing
        ? `/api/user/vps/${id}/firewall/${editingRule.pos}`
        : `/api/user/vps/${id}/firewall`;

      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(`Firewall rule ${isEditing ? 'updated' : 'added'} successfully`);
        setShowFirewallModal(false);
        fetchFirewallRules();
      } else {
        toast.error(data.error || `Failed to ${isEditing ? 'update' : 'add'} rule`);
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleDeleteFirewallRule = async () => {
    if (!deletingRulePos) return;
    setIsDeletingRule(true);
    try {
      const res = await fetch(`/api/user/vps/${id}/firewall/${deletingRulePos}`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success("Firewall rule deleted successfully");
        fetchFirewallRules();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete rule");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsDeletingRule(false);
      setDeletingRulePos(null);
    }
  };

  const handleBulkDeleteFirewallRules = async () => {
    if (selectedFirewallRules.length === 0) return;
    
    // Sort positions in descending order to avoid shifting issues when deleting one by one
    const sortedPositions = [...selectedFirewallRules].map(Number).sort((a, b) => b - a);
    
    setIsDeletingRule(true);
    let hasError = false;
    
    try {
      for (const pos of sortedPositions) {
        const res = await fetch(`/api/user/vps/${id}/firewall/${pos}`, {
          method: "DELETE"
        });
        if (!res.ok) {
           hasError = true;
           console.error(`Failed to delete rule at position ${pos}`);
        }
      }
      
      if (hasError) {
        toast.error("Some rules failed to delete. Positions may have shifted.");
      } else {
        toast.success(`Successfully deleted ${selectedFirewallRules.length} rules.`);
      }
    } catch (e: any) {
      toast.error(e.message || "An error occurred during bulk deletion");
    } finally {
      setIsDeletingRule(false);
      setSelectedFirewallRules([]);
      fetchFirewallRules();
    }
  };

  const handleAddonDisk = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingDisk(true);
    try {
      const res = await fetch(`/api/user/vps/${id}/addon-disk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sizeGb: addonSize })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Disk attached successfully to slot ${data.slot}!`);
        setAddonSize(20);
      } else {
        toast.error(data.error || "Failed to attach disk");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsAddingDisk(false);
    }
  };

  const handleRestoreBackup = async () => {
    setIsRestoring(true);
    try {
      const res = await fetch(`/api/user/vps/${id}/backups/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volume: selectedBackup })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Restore started! The server will be unavailable during this process.");
        fetchTasks();
        setActiveTab("tasks");
        setShowRestoreModal(false);
      } else {
        toast.error(data.error || "Failed to start restore");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDeleteBackup = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/user/vps/${id}/backups?volume=${encodeURIComponent(selectedBackup)}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Backup deleted successfully");
        fetchBackups();
        setShowDeleteModal(false);
      } else {
        toast.error(data.error || "Failed to delete backup");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTerminateInstance = async () => {
    setIsTerminating(true);
    try {
      const res = await fetch(`/api/user/vps/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Instance terminated successfully");
        setShowTerminateModal(false);
        router.push("/dashboard/vps");
      } else {
        toast.error(data.error || "Failed to terminate instance");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsTerminating(false);
    }
  };

  const handleAction = async (action: string) => {
    if (action === "console") {
      openConsole();
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/user/vps/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vpsId: parseInt(id), action }),
      });

      if (res.ok) {
        toast.success(`Action '${action}' executed successfully.`);
        fetchVpsDetails();
      } else {
        const data = await res.json();
        toast.error(data.error || `Failed to execute ${action}`);
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      let action = "";
      let payload = {};
      if (settingsMenu === "hostname") { action = "change_hostname"; payload = { hostname: hostnameInput }; }
      else if (settingsMenu === "password") { action = "change_password"; payload = { password: passwordInput }; }
      else if (settingsMenu === "ssh") { action = "change_ssh"; payload = { sshKey: sshKeyInput }; }

      const res = await fetch(`/api/user/vps/${id}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        if (settingsMenu === "hostname") setHostnameInput("");
        if (settingsMenu === "password") { setPasswordInput(""); setPasswordConfirmInput(""); }
        if (settingsMenu === "ssh") setSshKeyInput("");
        fetchVpsDetails();
      } else {
        toast.error(data.error || "Failed to update settings");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleGenerateSSHKey = async () => {
    try {
      setIsGeneratingKey(true);
      const res = await fetch("/api/generate-ssh-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostname: vps?.hostname || "vps", username: vps?.username || "root" })
      });
      const data = await res.json();

      if (res.ok) {
        setSshKeyInput(data.publicKey);

        // Auto download the private key
        const blob = new Blob([data.privateKey], { type: 'application/x-pem-file' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vps-${vps?.hostname || 'key'}.pem`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast.success("SSH Key Pair generated! Private key (.pem) has been downloaded.");
      } else {
        toast.error(data.error || "Failed to generate key");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleReinstallClick = () => {
    if (!selectedTemplate) {
      toast.error("Please select a template first.");
      return;
    }
    if (reinstallPassword.length < 8) {
      setReinstallPasswordError("Password must be at least 8 characters long.");
      toast.error("Password must be at least 8 characters long.");
      return;
    }
    if (reinstallPassword !== reinstallPasswordConfirm) {
      setReinstallPasswordError("Passwords do not match.");
      toast.error("Passwords do not match.");
      return;
    }
    setReinstallPasswordError("");
    setShowReinstallModal(true);
  };

  const executeReinstall = async () => {
    setReinstalling(true);
    setShowReinstallModal(false);
    try {
      const res = await fetch(`/api/user/vps/${id}/reinstall`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateName: selectedTemplate, password: reinstallPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setActiveTab("overview");
        fetchVpsDetails();
      } else {
        toast.error(data.error || "Reinstall failed");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setReinstalling(false);
    }
  };

  const openConsole = async () => {
    try {
      const res = await fetch("/api/user/vps/console", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vpsId: parseInt(id) }),
      });
      const data = await res.json();
      if (res.ok && data.consolePageUrl) {
        const width = 1024;
        const height = 768;
        const left = (window.innerWidth / 2) - (width / 2);
        const top = (window.innerHeight / 2) - (height / 2);

        window.open(
          data.consolePageUrl,
          `_blank`,
          `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=yes, copyhistory=no, width=${width}, height=${height}, top=${top}, left=${left}`
        );
      } else {
        toast.error(data.error || "Failed to open console");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to open console");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center">
        <RefreshCw className="w-10 h-10 text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (!vps) return null;

  const isRunning = status?.status === "running";

  // Format for Recharts Tooltip
  const formatTime = (tickItem: any) => {
    const d = new Date(tickItem);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const formatBytesPerSecond = (bytes: number) => {
    if (bytes === 0) return '0 B/s';
    if (bytes < 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full space-y-4 md:space-y-6 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 overflow-x-hidden">

      {vps.status === 'PENDING_PAYMENT' ? (
        <div className={cn("flex flex-col items-center justify-center py-16 md:py-24 px-4 md:px-8 border rounded-2xl md:rounded-3xl shadow-sm relative overflow-hidden mt-4 md:mt-8 w-full", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200/90 shadow-sm")}>
          <div className="relative z-10 flex flex-col items-center text-center w-full max-w-lg mx-auto">
            <div className={cn("w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center mb-6 border", isDark ? "bg-cyan-500/20 border-blue-500/30" : "bg-cyan-50 border-cyan-200")}>
              <CreditCard className={cn("w-10 h-10 md:w-12 md:h-12", isDark ? "text-blue-400" : "text-cyan-600")} />
            </div>
            <h2 className={cn("text-2xl md:text-3xl font-bold mb-2 md:mb-3", isDark ? "text-white" : "text-slate-900")}>Menunggu Pembayaran</h2>
            <p className={cn("text-sm md:text-base mb-8 px-2", isDark ? "text-slate-400" : "text-slate-500")}>
              Server ini masih menunggu pembayaran untuk dapat diprovisioning. Silakan selesaikan pembayaran tagihan Anda.
            </p>
            <button
              onClick={() => router.push("/dashboard/billing")}
              className="px-5 py-2.5 w-full sm:w-auto bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 font-semibold rounded-lg transition-all shadow-sm text-slate-950 text-sm"
            >
              Lihat Tagihan
            </button>
          </div>
        </div>
      ) : ['PENDING', 'PROVISIONING'].includes(vps.status) ? (
        <div className={cn("flex flex-col items-center justify-center py-12 sm:py-16 md:py-24 px-4 sm:px-6 md:px-8 border rounded-2xl md:rounded-3xl shadow-sm relative overflow-hidden mt-4 md:mt-8 w-full", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200/90 shadow-sm")}>
          <div className="relative z-10 flex flex-col items-center w-full max-w-lg mx-auto">
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-28 md:h-28 mb-5 sm:mb-6 md:mb-8 relative">
              <div className={cn("absolute inset-0 rounded-full border-t-2 border-r-2 animate-spin", isDark ? "border-cyan-400" : "border-cyan-500")}></div>
              <div className={cn("absolute inset-1.5 sm:inset-2 md:inset-3 rounded-full border-b-2 border-l-2 animate-[spin_2s_linear_reverse]", isDark ? "border-blue-400" : "border-blue-500")}></div>
              <Server className={cn("w-6 h-6 sm:w-8 sm:h-8 md:w-12 md:h-12 absolute inset-0 m-auto animate-pulse", isDark ? "text-cyan-400" : "text-cyan-600")} />
            </div>
            <h2 className={cn("text-xl sm:text-2xl md:text-3xl font-bold mb-2 md:mb-3 tracking-tight text-center", isDark ? "text-white" : "text-slate-900")}>
              {vps.status === 'PROVISIONING' ? "Reinstalling Your Server" : "Deploying Your Server"}
            </h2>
            <p className={cn("text-xs sm:text-sm md:text-base text-center mb-6 sm:mb-8 md:mb-10 leading-relaxed px-1 sm:px-2", isDark ? "text-slate-400" : "text-slate-500")}>
              {vps.status === 'PROVISIONING'
                ? `We are currently deleting the old instance, installing ${vps.osTemplate || "your OS"}, and booting up. This takes about 5 minutes.`
                : `We are currently allocating resources, installing ${vps.osTemplate || "your OS"}, and booting up your instance. This usually takes 5 minutes.`}
            </p>

            <div className="w-full space-y-2.5 sm:space-y-3 md:space-y-4">
              <div className={cn("flex items-center gap-2.5 sm:gap-3 md:gap-4 p-3 md:p-4 rounded-xl border transition-all", isDark ? "bg-[#060b14] border-slate-800 text-cyan-400" : "bg-slate-50 border-slate-200/90 text-slate-800 shadow-sm")}>
                <CheckCircle className={cn("w-4 h-4 sm:w-5 sm:h-5 shrink-0", isDark ? "text-cyan-400" : "text-cyan-600")} />
                <span className={cn("text-xs sm:text-sm md:text-base font-semibold", isDark ? "text-cyan-400" : "text-slate-800")}>
                  {vps.status === 'PROVISIONING' ? "Reinstall Requested" : "Order Confirmed"}
                </span>
              </div>
              <div className={cn("flex items-center gap-2.5 sm:gap-3 md:gap-4 p-3 md:p-4 rounded-xl border relative overflow-hidden transition-all", isDark ? "bg-[#0b162c] border-cyan-500 text-cyan-400 shadow-md ring-1 ring-cyan-500/30" : "bg-cyan-50/70 border-cyan-400 text-cyan-950 shadow-sm ring-1 ring-cyan-400/20")}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer"></div>
                <div className={cn("w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-t-transparent animate-spin shrink-0 relative z-10", isDark ? "border-cyan-400" : "border-cyan-600")}></div>
                <span className={cn("text-xs sm:text-sm md:text-base font-bold relative z-10", isDark ? "text-cyan-400" : "text-cyan-900")}>
                  {vps.status === 'PROVISIONING' ? "Rebuilding Infrastructure..." : "Provisioning Infrastructure..."}
                </span>
              </div>
              <div className={cn("flex items-center gap-2.5 sm:gap-3 md:gap-4 p-3 md:p-4 rounded-xl border transition-all", isDark ? "bg-[#060b14]/60 border-slate-800/60" : "bg-slate-50/70 border-slate-200/80")}>
                <div className={cn("w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 shrink-0 opacity-50", isDark ? "border-slate-700" : "border-slate-300")}></div>
                <span className={cn("text-xs sm:text-sm md:text-base font-medium", isDark ? "text-slate-500" : "text-slate-400")}>
                  {vps.status === 'PROVISIONING' ? "Waiting for Guest OS" : "Waiting for Network IP"}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center">
            <button
              onClick={() => {
                if (vps.kubernetesClusterId) {
                  router.push(`/dashboard/k3s/${vps.kubernetesClusterId}`);
                } else {
                  router.push("/dashboard/vps");
                }
              }}
              className={cn(
                "inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-all border shadow-sm",
                isDark 
                  ? "text-zinc-400 hover:text-white bg-[#0b1322] hover:bg-[#111c33] border-slate-800 hover:border-cyan-500/40" 
                  : "text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border-slate-200"
              )}
            >
              <ChevronLeft className="w-4 h-4" /> Back to {vps.kubernetesClusterId ? "Cluster" : "VPS List"}
            </button>
          </div>

          {/* Header Bar */}
          <div className={cn("flex flex-col md:flex-row justify-between items-start md:items-center border rounded-2xl p-4 sm:p-6 shadow-sm relative overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
            

            <div className="flex items-center gap-3 sm:gap-4 z-10 mb-4 md:mb-0 w-full">
              <div className="p-3 bg-cyan-500/20 rounded-2xl shrink-0">
                {getOsIcon(vps.osTemplate, isDark) ? (
                   
                  <img referrerPolicy="no-referrer" src={getOsIcon(vps.osTemplate, isDark)!} alt="OS" className="w-8 h-8 object-contain" loading="lazy" decoding="async" />
                ) : (
                  <Server className="w-8 h-8 text-cyan-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                  <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight break-all", isDark ? "text-white" : "text-slate-900")}>
                    {vps.hostname || `VPS-${vps.id}`}
                  </h1>
                  <div className={cn(
                    "px-2.5 py-1 text-xs font-bold rounded-full flex items-center gap-1.5 shrink-0",
                    vps.status === 'TERMINATED' ? "bg-red-500/20 text-red-400" :
                      vps.status === 'SUSPENDED' ? "bg-orange-500/20 text-orange-400" : (isRunning ? (isDark ? "bg-cyan-500/20 text-cyan-400" : "bg-cyan-100 text-cyan-950 border border-cyan-300") : (isDark ? "bg-zinc-500/20 text-zinc-400" : "bg-slate-200 text-slate-800"))
                  )}>
                    <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", vps.status === 'TERMINATED' ? "bg-red-400" : vps.status === 'SUSPENDED' ? "bg-orange-400" : (isRunning ? "bg-cyan-400" : "bg-zinc-400"))}></div>
                    {vps.status === 'TERMINATED' ? "Terminated" : vps.status === 'SUSPENDED' ? "Suspended" : (isRunning ? "Online" : "Offline")}
                  </div>
                </div>
                <p className={cn("text-sm mt-2 flex flex-wrap items-center gap-2 font-medium", isDark ? "text-zinc-400" : "text-slate-700")}>
                  <span className={cn("font-mono text-xs px-2 py-0.5 rounded border whitespace-nowrap font-bold", isDark ? "bg-black/30 border-slate-800 text-cyan-300" : "bg-slate-100 border-slate-300 text-slate-900")}>ID: {vps.id}</span>
                  <span>•</span>
                  <span className={cn("whitespace-nowrap font-semibold", isDark ? "text-zinc-300" : "text-slate-900")}>{vps.osTemplate}</span>
                  <span>•</span>
                  <span className={cn("whitespace-nowrap font-semibold", isDark ? "text-white" : "text-slate-950")}>
                    {vps.status === 'TERMINATED' 
                      ? "No IP (Terminated)" 
                      : (vps.assignedIps?.length > 0 
                          ? (vps.assignedIps[0].publicIp || vps.assignedIps[0].ipAddress) 
                          : (vps.status === 'PENDING' ? "Waiting for IP..." : "No IP")
                        )
                    }
                  </span>
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap md:flex-nowrap gap-2 z-10 w-full md:w-auto mt-4 md:mt-0 justify-start sm:justify-end">
              <button
                onClick={() => handleAction("start")}
                disabled={actionLoading || isRunning || vps.status === 'SUSPENDED' || vps.status === 'TERMINATED'}
                className={cn(
                  "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 border rounded-xl transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                  isDark
                    ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20 focus-visible:ring-emerald-500/50"
                    : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 focus-visible:ring-emerald-500"
                )}
                title="Start VPS"
              >
                <Play className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Start</span>
              </button>
              <button
                onClick={() => handleAction("shutdown")}
                disabled={actionLoading || !isRunning || vps.status === 'TERMINATED'}
                className={cn(
                  "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 border rounded-xl transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                  isDark
                    ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20 focus-visible:ring-amber-500/50"
                    : "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300 focus-visible:ring-amber-500"
                )}
                title="Graceful Shutdown"
              >
                <Power className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Shutdown</span>
              </button>
              <button
                onClick={() => handleAction("stop")}
                disabled={actionLoading || !isRunning || vps.status === 'TERMINATED'}
                className={cn(
                  "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 border rounded-xl transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                  isDark
                    ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20 focus-visible:ring-rose-500/50"
                    : "bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-300 focus-visible:ring-rose-500"
                )}
                title="Force Stop"
              >
                <Square className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Stop</span>
              </button>
              <button
                onClick={() => handleAction("reboot")}
                disabled={actionLoading || !isRunning || vps.status === 'TERMINATED'}
                className={cn(
                  "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 border rounded-xl transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                  isDark
                    ? "bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border-sky-500/20 focus-visible:ring-sky-500/50"
                    : "bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-300 focus-visible:ring-sky-500"
                )}
                title="Restart"
              >
                <RotateCcw className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Restart</span>
              </button>
              <button
                onClick={() => handleAction("console")}
                disabled={actionLoading || vps.status === 'TERMINATED' || vps.status === 'SUSPENDED'}
                className={cn(
                  "flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 border rounded-xl transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                  isDark
                    ? "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/20 focus-visible:ring-cyan-500/50"
                    : "bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-300 focus-visible:ring-cyan-500"
                )}
                title="NoVNC Console"
              >
                <Terminal className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">Console</span>
              </button>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className={cn("border transition-colors shadow-sm", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-300", "flex gap-1.5 p-1.5 rounded-2xl overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] w-full")}>
            {[
              { id: "overview", label: "Overview", icon: Activity },
              { id: "graphs", label: "Graphs", icon: Activity },
              { id: "settings", label: "Settings", icon: Settings },
              { id: "firewall", label: "Firewall", icon: Shield },
              { id: "upgrade", label: "Upgrade", icon: Activity },
              { id: "addon", label: "Add-on Disks", icon: HardDrive },
              { id: "install", label: "Install", icon: HardDrive },
              { id: "backups", label: "Backups", icon: ShieldCheck },
              { id: "snapshots", label: "Snapshots", icon: Copy },
              { id: "tasks", label: "Tasks And Logs", icon: Terminal }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all whitespace-nowrap",
                  activeTab === tab.id
                    ? (isDark ? "bg-cyan-500/15 text-cyan-300 font-bold border border-cyan-500/30 shadow-sm" : "bg-cyan-50 text-cyan-950 font-bold border border-cyan-400 shadow-xs ring-1 ring-cyan-400/30")
                    : (isDark ? "text-slate-400 hover:text-white hover:bg-slate-800/40 border border-transparent font-medium" : "text-slate-700 font-bold hover:text-slate-950 hover:bg-slate-100 border border-transparent")
                )}
              >
                <tab.icon className="w-4 h-4" /> {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="min-h-[500px]">
            {/* OVERVIEW TAB */}
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                {/* Left Column: Progress Bars */}
                <div className="space-y-6">
                  <div className={cn("border rounded-2xl p-4 sm:p-6 shadow-lg", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
                    <div className="flex justify-between items-end mb-4">
                      <h3 className={cn("font-bold", isDark ? "text-white" : "text-slate-950")}>Disk Usage</h3>
                      <span className={cn("text-sm font-mono font-semibold", isDark ? "text-zinc-400" : "text-slate-800")}>
                        {status?.disk ? (status.disk / 1024 / 1024 / 1024).toFixed(2) : 0} / {status?.maxdisk ? (status.maxdisk / 1024 / 1024 / 1024).toFixed(0) : vps.diskGb} GB {vps.diskType || "HDD"}
                      </span>
                    </div>

                    {/* Disk Progress Bar */}
                    <div className={cn("w-full h-6 rounded-full overflow-hidden border relative", isDark ? "bg-black/40 border-white/5" : "bg-slate-100 border-slate-300")}>
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full flex items-center justify-end px-3 transition-all duration-500 min-w-fit"
                        style={{ width: `${status?.disk && status?.maxdisk ? Math.min((status.disk / status.maxdisk) * 100, 100) : 0}%` }}
                      >
                        <span className="text-[10px] font-bold text-cyan-950">
                          {status?.disk && status?.maxdisk ? ((status.disk / status.maxdisk) * 100).toFixed(2) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={cn("border rounded-2xl p-4 sm:p-6 shadow-lg", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
                    <div className="flex justify-between items-end mb-4">
                      <h3 className={cn("font-bold", isDark ? "text-white" : "text-slate-950")}>Memory Usage</h3>
                      <span className={cn("text-sm font-mono font-semibold", isDark ? "text-zinc-400" : "text-slate-800")}>
                        {status?.mem ? (status.mem / 1024 / 1024 / 1024).toFixed(2) : 0} / {status?.maxmem ? (status.maxmem / 1024 / 1024 / 1024).toFixed(2) : vps.ramGb} GB
                      </span>
                    </div>

                    {/* RAM Progress Bar */}
                    <div className={cn("w-full h-6 rounded-full overflow-hidden border relative", isDark ? "bg-black/40 border-white/5" : "bg-slate-100 border-slate-300")}>
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-full flex items-center justify-end px-3 transition-all duration-500 min-w-fit"
                        style={{ width: `${status?.mem && status?.maxmem ? Math.min((status.mem / status.maxmem) * 100, 100) : 0}%` }}
                      >
                        <span className="text-[10px] font-bold text-cyan-950">
                          {status?.mem && status?.maxmem ? ((status.mem / status.maxmem) * 100).toFixed(2) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Server Info Card */}
                  <div className={cn("border rounded-2xl p-6 shadow-lg", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
                    <h3 className={cn("font-bold mb-4", isDark ? "text-white" : "text-slate-950")}>Instance Details</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-700")}>CPU Cores</span>
                        <span className={cn("text-sm font-semibold", isDark ? "text-white" : "text-slate-950")}>{vps.cpuCores} vCPU</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-700")}>Node</span>
                        <span className={cn("text-sm font-semibold", isDark ? "text-white" : "text-slate-950")}>{vps.node}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-700")}>Billing</span>
                        <span className={cn(
                          "text-xs font-bold px-2.5 py-0.5 rounded-full border",
                          isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-100 text-cyan-950 border-cyan-300"
                        )}>
                          PAYG
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-700")}>Created</span>
                        <span className={cn("text-sm font-semibold", isDark ? "text-white" : "text-slate-950")}>{new Date(vps.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Graphs */}
                <div className="lg:col-span-2 space-y-6">

                  {/* CPU Chart */}
                  <div className={cn("border rounded-2xl p-6 shadow-lg", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className={cn("font-bold", isDark ? "text-white" : "text-slate-950")}>CPU Usage (%)</h3>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-cyan-500"></div>
                        <span className={cn("text-xs font-semibold", isDark ? "text-zinc-400" : "text-slate-700")}>Last Hour</span>
                      </div>
                    </div>
                    <div className="h-[200px] w-full">
                      {metricsLoading && metrics.length === 0 ? (
                        <div className={cn("w-full h-full flex items-center justify-center text-sm font-medium", isDark ? "text-zinc-500" : "text-slate-600")}>Loading graph...</div>
                      ) : isMounted ? (
                        <ResponsiveContainer width="100%" height={200} minWidth={1} minHeight={1}>
                          <AreaChart data={metrics} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis
                              dataKey="time"
                              tickFormatter={formatTime}
                              stroke="#334155"
                              tick={{ fill: '#64748b', fontSize: 11 }}
                              minTickGap={30}
                            />
                            <YAxis
                              stroke="#334155"
                              tick={{ fill: '#64748b', fontSize: 11 }}
                              domain={[0, 100]}
                            />
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                              labelFormatter={formatTime}
                            />
                            <Area type="monotone" dataKey="cpu" stroke="#22d3ee" strokeWidth={2} fillOpacity={1} fill="url(#colorCpu)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : null}
                    </div>
                  </div>

                  {/* Network Chart */}
                  <div className={cn("border rounded-2xl p-6 shadow-lg", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className={cn("font-bold", isDark ? "text-white" : "text-slate-950")}>Network Speed (Bytes/s)</h3>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                          <span className={cn("text-xs font-semibold", isDark ? "text-zinc-400" : "text-slate-700")}>Download</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                          <span className={cn("text-xs font-semibold", isDark ? "text-zinc-400" : "text-slate-700")}>Upload</span>
                        </div>
                      </div>
                    </div>
                    <div className="h-[200px] w-full">
                      {metricsLoading && metrics.length === 0 ? (
                        <div className={cn("w-full h-full flex items-center justify-center  text-sm", isDark ? "text-zinc-500" : "text-slate-400")}>Loading graph...</div>
                      ) : isMounted ? (
                        <ResponsiveContainer width="100%" height={200} minWidth={1} minHeight={1}>
                          <AreaChart data={metrics} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorNetIn" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="colorNetOut" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis
                              dataKey="time"
                              tickFormatter={formatTime}
                              stroke="#334155"
                              tick={{ fill: '#64748b', fontSize: 11 }}
                              minTickGap={30}
                            />
                            <YAxis
                              stroke="#334155"
                              tick={{ fill: '#64748b', fontSize: 11 }}
                              tickFormatter={formatBytesPerSecond}
                              width={90}
                            />
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                              labelFormatter={formatTime}
                              formatter={(value: any, name: any) => [formatBytesPerSecond(value), name === 'netIn' ? 'Download' : 'Upload']}
                            />
                            <Area type="monotone" dataKey="netIn" stroke="#34d399" strokeWidth={2} fillOpacity={1} fill="url(#colorNetIn)" />
                            <Area type="monotone" dataKey="netOut" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#colorNetOut)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : null}
                    </div>
                  </div>

                </div>
              </div>
            )}



            {/* GRAPHS TAB */}
            {activeTab === "graphs" && (
              <div className="space-y-6 animate-in fade-in duration-500">
                {/* Top Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className={cn("border rounded-2xl p-6 shadow-lg", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className={cn("font-bold", isDark ? "text-white" : "text-slate-950")}>Disk I/O (Bytes/s)</h3>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                          <span className={cn("text-xs font-semibold", isDark ? "text-zinc-400" : "text-slate-700")}>Read</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
                          <span className={cn("text-xs font-semibold", isDark ? "text-zinc-400" : "text-slate-700")}>Write</span>
                        </div>
                      </div>
                    </div>
                    <div className="h-[250px] w-full">
                      {metricsLoading && metrics.length === 0 ? (
                        <div className={cn("w-full h-full flex items-center justify-center text-sm font-medium", isDark ? "text-zinc-500" : "text-slate-600")}>Loading graph...</div>
                      ) : (
                        <ResponsiveContainer width="100%" height={250} minWidth={1} minHeight={1}>
                          <AreaChart data={metrics} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorDiskRead" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="colorDiskWrite" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#fb923c" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#fb923c" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="time" tickFormatter={formatTime} stroke="#334155" tick={{ fill: '#64748b', fontSize: 11 }} minTickGap={30} />
                            <YAxis stroke="#334155" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={formatBytesPerSecond} width={90} />
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }} 
                              labelFormatter={formatTime} 
                              formatter={(value: any, name: any) => [formatBytesPerSecond(value), name === 'diskread' ? 'Read' : 'Write']} 
                            />
                            <Area type="monotone" dataKey="diskread" stroke="#34d399" strokeWidth={2} fillOpacity={1} fill="url(#colorDiskRead)" />
                            <Area type="monotone" dataKey="diskwrite" stroke="#fb923c" strokeWidth={2} fillOpacity={1} fill="url(#colorDiskWrite)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  <div className={cn("border rounded-2xl p-6 shadow-lg", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
                    <h3 className={cn("font-bold mb-6", isDark ? "text-white" : "text-slate-950")}>System Statistics</h3>
                    <div className="h-[250px] w-full">
                      {metricsLoading && metrics.length === 0 ? (
                        <div className={cn("w-full h-full flex items-center justify-center text-sm font-medium", isDark ? "text-zinc-500" : "text-slate-600")}>Loading graph...</div>
                      ) : (
                        <ResponsiveContainer width="100%" height={250} minWidth={1} minHeight={1}>
                          <AreaChart data={metrics} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="time" tickFormatter={formatTime} stroke="#334155" tick={{ fill: '#64748b', fontSize: 11 }} minTickGap={30} />
                            <YAxis stroke="#334155" tick={{ fill: '#64748b', fontSize: 11 }} domain={[0, 100]} />
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }} labelFormatter={formatTime} />
                            <Area type="monotone" dataKey="cpu" stroke="#22d3ee" strokeWidth={2} fillOpacity={1} fill="url(#colorCpu)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* FIREWALL TAB */}
            {activeTab === "firewall" && (
              <div className={cn("border rounded-2xl p-6 shadow-lg animate-in fade-in duration-500", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className={cn("font-bold text-lg", isDark ? "text-white" : "text-slate-950")}>Firewall (Security Group)</h3>
                      <p className={cn("text-sm mt-0.5", isDark ? "text-zinc-400" : "text-slate-700 font-medium")}>Manage inbound traffic rules for this instance.</p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingRule(null);
                        setShowFirewallModal(true);
                      }}
                      className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 rounded-lg text-sm font-bold transition-all flex items-center gap-2 text-slate-950 shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Add Rule
                    </button>
                  </div>

                  {firewallLoading ? (
                    <div className="w-full flex items-center justify-center py-10">
                      <RefreshCw className="w-6 h-6 text-cyan-500 animate-spin" />
                    </div>
                  ) : (() => {
                    const totalRulePages = Math.ceil(firewallRules.length / RULES_PER_PAGE);
                    const paginatedRules = firewallRules.slice((rulePage - 1) * RULES_PER_PAGE, rulePage * RULES_PER_PAGE);
                    return (
                    <div className="space-y-4">
                      {selectedFirewallRules.length > 0 && (
                        <div className={cn("p-3 rounded-xl flex items-center justify-between border animate-in slide-in-from-top-2", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-300" : "bg-cyan-50 border-cyan-300 text-cyan-950")}>
                          <span className="text-sm font-bold">
                            {selectedFirewallRules.length} rule{selectedFirewallRules.length > 1 ? 's' : ''} selected
                          </span>
                          <button
                            onClick={handleBulkDeleteFirewallRules}
                            disabled={isDeletingRule}
                            className={cn("px-3 py-1.5 rounded-lg transition-colors text-xs font-bold flex items-center gap-1.5 border disabled:opacity-50", isDark ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20" : "bg-red-100 hover:bg-red-200 text-red-900 border-red-300 shadow-2xs")}
                          >
                            {isDeletingRule ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            <span>Delete Selected</span>
                          </button>
                        </div>
                      )}
                      <div className={cn("overflow-x-auto w-full rounded-xl border", isDark ? "border-slate-800 bg-[#060b14]" : "border-slate-300 bg-white")}>
                        <table className="w-full text-left text-sm">
                          <thead className={cn("text-xs uppercase font-bold tracking-wider border-b", isDark ? "bg-[#0b1322] text-zinc-400 border-slate-800" : "bg-slate-100 text-slate-900 border-slate-300")}>
                            <tr>
                              <th className="px-4 py-3.5 rounded-tl-xl font-bold w-[50px] text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (paginatedRules.length > 0 && selectedFirewallRules.length !== firewallRules.length) {
                                      setSelectedFirewallRules(firewallRules.map((r: any, idx: number) => r.pos?.toString() || idx.toString()));
                                    } else {
                                      setSelectedFirewallRules([]);
                                    }
                                  }}
                                  className={cn(
                                    "w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all duration-200 mx-auto",
                                    firewallRules.length > 0 && selectedFirewallRules.length === firewallRules.length
                                      ? "bg-cyan-400"
                                      : "bg-black/40 border border-white/10 hover:border-cyan-400/50"
                                  )}
                                >
                                  <CheckCircle className={cn("w-3.5 h-3.5", firewallRules.length > 0 && selectedFirewallRules.length === firewallRules.length ? "text-[#0f172a]" : "text-transparent")} />
                                </button>
                              </th>
                              <th className="px-4 py-3.5 font-bold">Type</th>
                              <th className="px-4 py-3.5 font-bold">Protocol</th>
                              <th className="px-4 py-3.5 font-bold">Port Range</th>
                              <th className="px-4 py-3.5 font-bold">Source IP</th>
                              <th className="px-4 py-3.5 font-bold">Description</th>
                              <th className="px-4 py-3.5 font-bold rounded-tr-xl text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className={cn("divide-y", isDark ? "divide-white/5" : "divide-slate-200")}>
                            {paginatedRules.map((rule: any, i: number) => {
                              const absoluteIndex = (rulePage - 1) * RULES_PER_PAGE + i;
                              const posStr = rule.pos?.toString() || absoluteIndex.toString();
                              const isSelected = selectedFirewallRules.includes(posStr);
                              return (
                                <tr key={i} className={cn("transition-colors", isSelected ? "bg-cyan-500/5" : (isDark ? "bg-transparent hover:bg-white/5" : "bg-transparent hover:bg-slate-50"))}>
                                  <td className="px-4 py-4 text-center">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (isSelected) {
                                          setSelectedFirewallRules(prev => prev.filter(p => p !== posStr));
                                        } else {
                                          setSelectedFirewallRules(prev => [...prev, posStr]);
                                        }
                                      }}
                                      className={cn(
                                        "w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all duration-200 mx-auto",
                                        isSelected ? "bg-cyan-400" : "bg-black/40 border border-white/10 hover:border-cyan-400/50"
                                      )}
                                    >
                                      <CheckCircle className={cn("w-3.5 h-3.5", isSelected ? "text-[#0f172a]" : "text-transparent")} />
                                    </button>
                                  </td>
                                  <td className={cn("px-4 py-4 font-bold", isDark ? "text-white" : "text-slate-950")}>
                                    {rule.type === "in" ? "Inbound" : "Outbound"}
                                  </td>
                                  <td className={cn("px-4 py-4 font-semibold", isDark ? "text-zinc-300" : "text-slate-800")}>{rule.proto?.toUpperCase() || "ALL"}</td>
                                  <td className={cn("px-4 py-4 font-mono font-semibold", isDark ? "text-zinc-300" : "text-slate-800")}>{rule.dport ? rule.dport.replace(/:/g, '-') : "ALL"}</td>
                                  <td className={cn("px-4 py-4 font-mono font-semibold", isDark ? "text-zinc-300" : "text-slate-800")}>{rule.source || "0.0.0.0/0"}</td>
                                  <td className={cn("px-4 py-4 font-medium", isDark ? "text-zinc-300" : "text-slate-800")}>{rule.comment || "-"}</td>
                                  <td className="px-4 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={() => {
                                          setEditingRule({ ...rule, pos: rule.pos || absoluteIndex });
                                          setShowFirewallModal(true);
                                        }}
                                        className={cn("p-1.5 transition-colors", isDark ? "text-zinc-400 hover:text-cyan-400" : "text-slate-600 hover:text-cyan-800")}
                                      >
                                        <Settings2 className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => setDeletingRulePos(rule.pos?.toString() || absoluteIndex.toString())}
                                        className={cn("p-1.5 transition-colors", isDark ? "text-zinc-400 hover:text-red-400" : "text-slate-600 hover:text-red-600")}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                            {firewallRules.length === 0 && (
                              <tr>
                                <td colSpan={7} className={cn("px-4 py-8 text-center font-medium", isDark ? "text-zinc-500" : "text-slate-600")}>
                                  No firewall rules configured.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                        {totalRulePages > 1 && (
                          <div className={cn("p-4 border-t shrink-0", isDark ? "border-white/5 bg-black/20" : "border-slate-200 bg-slate-50/50")}>
                            <Pagination
                              currentPage={rulePage}
                              totalPages={totalRulePages}
                              onPageChange={setRulePage}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === "settings" && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in duration-500">
                {/* Sidebar */}
                <div className={cn("border rounded-2xl p-2 shadow-lg h-fit flex flex-col gap-1", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
                  {[
                    { id: "hostname", label: "Change Hostname" },
                    { id: "password", label: "Change Password" },
                    { id: "ssh", label: "SSH Keys" },
                    { id: "danger", label: "Delete Instance" }
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => setSettingsMenu(item.id)}
                      className={cn(
                        "px-4 py-3 text-sm rounded-xl text-left transition-colors",
                        settingsMenu === item.id
                          ? (isDark ? "bg-white/10 text-white font-bold" : "bg-cyan-100 text-cyan-950 font-bold border border-cyan-300 shadow-2xs")
                          : (isDark ? "text-zinc-400 hover:bg-white/5 hover:text-white font-medium" : "text-slate-700 hover:bg-slate-100 hover:text-slate-950 font-bold")
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Content Area */}
                <div className={cn("md:col-span-3 border rounded-2xl p-6 shadow-lg", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>

                  {settingsMenu === "hostname" && (
                    <div className="space-y-6 max-w-md">
                      <h3 className={cn("font-bold text-lg", isDark ? "text-white" : "text-slate-950")}>Change Hostname</h3>
                      <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-700")}>Current Hostname: <span className={cn("font-bold", isDark ? "text-white" : "text-slate-950")}>{vps.hostname}</span></p>
                      <form onSubmit={handleSettingsSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <label className={cn("text-sm font-bold", isDark ? "text-zinc-400" : "text-slate-900")}>New Host Name</label>
                          <input
                            type="text"
                            value={hostnameInput}
                            onChange={(e) => setHostnameInput(e.target.value)}
                            placeholder="new-hostname.example.com"
                            className={cn(
                              "w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-1 transition-all font-medium",
                              isDark
                                ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:ring-cyan-500"
                                : "bg-slate-50 border-slate-300 text-slate-950 placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500"
                            )}
                            required
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={actionLoading || isSavingSettings}
                          className="w-full sm:w-auto px-5 py-2.5 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50 text-slate-950 text-sm"
                        >
                          {isSavingSettings ? "Saving..." : "Change Hostname"}
                        </button>
                      </form>
                    </div>
                  )}

                  {settingsMenu === "password" && (
                    <div className="space-y-6 max-w-md">
                      <h3 className={cn("font-bold text-lg", isDark ? "text-white" : "text-slate-950")}>Change Root Password</h3>
                      <div className={cn("p-3.5 rounded-xl border flex items-start gap-2.5 text-xs transition-all shadow-2xs", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-200" : "bg-cyan-50 border-cyan-300 text-slate-800 font-medium")}>
                        <Info className={cn("w-4 h-4 shrink-0 mt-0.5", isDark ? "text-cyan-400" : "text-cyan-700")} />
                        <p className="leading-relaxed">
                          <strong className={cn("mr-1 font-bold", isDark ? "text-cyan-400" : "text-cyan-950")}>Note:</strong> Requires a VPS restart to apply via Cloud-Init.
                        </p>
                      </div>
                      <form onSubmit={handleSettingsSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <label className={cn("text-sm font-bold", isDark ? "text-zinc-400" : "text-slate-900")}>New Password</label>
                          <input
                            type="password"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            placeholder="••••••••••••"
                            className={cn(
                              "w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-1 transition-all font-medium",
                              isDark
                                ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:ring-cyan-500"
                                : "bg-slate-50 border-slate-300 text-slate-950 placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500"
                            )}
                            required
                            minLength={8}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className={cn("text-sm font-bold", isDark ? "text-zinc-400" : "text-slate-900")}>Retype New Password</label>
                          <input
                            type="password"
                            value={passwordConfirmInput}
                            onChange={(e) => setPasswordConfirmInput(e.target.value)}
                            placeholder="••••••••••••"
                            className={cn(
                              "w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-1 transition-all font-medium",
                              isDark ? "bg-[#060b14] text-white" : "bg-slate-50 text-slate-950",
                              passwordConfirmInput && passwordInput !== passwordConfirmInput
                                ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                : isDark ? "border-slate-800 focus:border-cyan-500 focus:ring-cyan-500" : "border-slate-300 focus:border-cyan-500 focus:ring-cyan-500"
                            )}
                            required
                            minLength={8}
                          />
                          {passwordConfirmInput && passwordInput !== passwordConfirmInput && (
                            <p className="text-red-500 text-xs mt-1 font-bold">Passwords do not match</p>
                          )}
                          {passwordInput && passwordInput.length < 8 && (
                            <p className="text-red-500 text-xs mt-1 font-bold">Password must be at least 8 characters</p>
                          )}
                        </div>
                        <button
                          type="submit"
                          disabled={actionLoading || isSavingSettings || passwordInput.length < 8 || passwordInput !== passwordConfirmInput}
                          className="w-full sm:w-auto px-5 py-2.5 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50 text-slate-950 text-sm"
                        >
                          {isSavingSettings ? "Saving..." : "Change Password"}
                        </button>
                      </form>
                    </div>
                  )}

                  {settingsMenu === "ssh" && (
                    <div className="space-y-6 max-w-xl">
                      <h3 className={cn("font-bold text-lg", isDark ? "text-white" : "text-slate-950")}>Change SSH Public Key</h3>
                      <div className={cn("p-3.5 rounded-xl border flex items-start gap-2.5 text-xs transition-all shadow-2xs", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-200" : "bg-cyan-50 border-cyan-300 text-slate-800 font-medium")}>
                        <Info className={cn("w-4 h-4 shrink-0 mt-0.5", isDark ? "text-cyan-400" : "text-cyan-700")} />
                        <p className="leading-relaxed">
                          <strong className={cn("mr-1 font-bold", isDark ? "text-cyan-400" : "text-cyan-950")}>Note:</strong> Requires a VPS restart to apply via Cloud-Init.
                        </p>
                      </div>
                      <form onSubmit={handleSettingsSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                            <label className={cn("text-sm font-bold", isDark ? "text-zinc-400" : "text-slate-900")}>SSH Public Key</label>
                            <button
                              type="button"
                              onClick={handleGenerateSSHKey}
                              disabled={isGeneratingKey}
                              className={cn(
                                "w-full sm:w-auto text-xs flex items-center justify-center gap-1.5 px-4 py-2 sm:px-3 sm:py-1.5 rounded-lg transition-colors shrink-0 font-bold border",
                                isDark ? "text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 border-cyan-500/20" : "text-slate-950 hover:text-black bg-slate-100 hover:bg-slate-200 border-slate-300"
                              )}
                            >
                              {isGeneratingKey ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Plus className="w-3.5 h-3.5" />
                              )}
                              <span className="whitespace-nowrap">Auto Generate & Download .pem</span>
                            </button>
                          </div>
                          <textarea
                            value={sshKeyInput}
                            onChange={(e) => setSshKeyInput(e.target.value)}
                            placeholder="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQ... user@hostname"
                            className={cn(
                              "w-full border rounded-xl px-4 py-3 focus:outline-none focus:ring-1 transition-all font-mono text-xs min-h-[150px] font-medium",
                              isDark
                                ? "bg-[#060b14] border-slate-800 text-white placeholder:text-zinc-600 focus:border-cyan-500 focus:ring-cyan-500"
                                : "bg-slate-50 border-slate-300 text-slate-950 placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500"
                            )}
                            required
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={actionLoading || isSavingSettings}
                          className="w-full sm:w-auto px-5 py-2.5 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50 text-slate-950 text-sm"
                        >
                          {isSavingSettings ? "Saving..." : "Change SSH Key"}
                        </button>
                      </form>
                    </div>
                  )}

                  {settingsMenu === "danger" && (
                    <div className="space-y-6 max-w-xl">
                      <h3 className="text-red-500 font-bold text-lg flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        Delete Instance
                      </h3>
                      <p className={cn("text-sm mb-6 relative z-10 font-medium", isDark ? "text-zinc-400" : "text-slate-700")}>These actions are permanent and cannot be undone. Proceed with extreme caution.</p>

                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 transition-colors rounded-2xl gap-4">
                        <div>
                          <h3 className="text-red-600 dark:text-red-400 font-bold text-sm">Delete Instance</h3>
                          <p className={cn("text-xs mt-1.5 leading-relaxed font-medium", isDark ? "text-zinc-400" : "text-slate-700")}>
                            Completely destroy the VM, erase all its data, and release its IP addresses.
                            Your final usage will be billed up to the current hour.
                          </p>
                        </div>
                        <button
                          onClick={() => setShowTerminateModal(true)}
                          disabled={actionLoading}
                          className="px-5 py-2.5 w-full sm:w-auto justify-center bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-red-600 dark:text-red-400 border border-red-500/20 text-sm font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4 shrink-0" />
                          Delete Instance
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* UPGRADE TAB */}
            {activeTab === "upgrade" && (
              <div className="animate-in fade-in duration-500 w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-6">
                  <div className={cn("border rounded-2xl p-4 sm:p-6 shadow-lg", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl">
                      <Activity className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className={cn("font-bold text-lg", isDark ? "text-white" : "text-slate-950")}>Upgrade Specifications</h3>
                      <p className={cn("text-sm mt-0.5", isDark ? "text-zinc-400" : "text-slate-700 font-medium")}>Increase your VPS resources. Note: Downgrades are not supported.</p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className={cn(isDark ? "text-zinc-300" : "text-slate-900", "text-sm font-bold")}>CPU Cores</label>
                        <span className={cn("text-sm font-mono font-bold", isDark ? "text-cyan-400" : "text-cyan-800")}>{upgradeCores} Core(s)</span>
                      </div>
                      <div className="mb-2">
                        <span className={cn(
                          "inline-flex items-center text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full font-bold border",
                          isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-100 text-cyan-950 border-cyan-300"
                        )}>
                          Upgrade: Rp 50.000/Core/mo (~Rp 69/hr)
                        </span>
                      </div>
                      <input
                        type="range"
                        min={vps.cpuCores} max={maxSpecs.cpu} step={1}
                        value={upgradeCores}
                        onChange={(e) => setUpgradeCores(parseInt(e.target.value))}
                        style={{ backgroundSize: `${((upgradeCores - vps.cpuCores) / Math.max(1, maxSpecs.cpu - vps.cpuCores)) * 100}% 100%` }}
                        className={cn("w-full", isDark ? "accent-cyan-500" : "accent-cyan-600")}
                      />
                      <div className={cn("flex justify-between text-xs mt-1 font-mono font-semibold", isDark ? "text-zinc-500" : "text-slate-700")}>
                        <span>{vps.cpuCores} Core (Current)</span>
                        <span>{maxSpecs.cpu} Core Max</span>
                      </div>
                      {additionalCpu > 0 && (
                        <div className={cn(
                          "mt-2.5 p-3 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 border transition-all",
                          isDark ? "bg-[#0b162c] border-cyan-500/20 text-zinc-300" : "bg-cyan-50 border-cyan-300 text-slate-800 font-medium"
                        )}>
                          <span className="flex items-center gap-1.5 flex-wrap">
                            <Activity className={cn("w-3.5 h-3.5 shrink-0", isDark ? "text-cyan-400" : "text-cyan-700")} />
                            <span>Added CPU:</span>
                            <strong className={cn("font-bold", isDark ? "text-white" : "text-slate-950")}>
                              +{additionalCpu} Core
                            </strong>
                            <span className={cn("font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>
                              (@ Rp 50.000/Core/mo)
                            </span>
                          </span>
                          <span className={cn("font-mono font-bold self-start sm:self-auto shrink-0", isDark ? "text-cyan-400" : "text-cyan-800")}>
                            +{formatRupiah(additionalCpuMonthly)}/mo <span className={cn("text-[11px] font-normal", isDark ? "text-zinc-400" : "text-slate-600")}>(~+{formatRupiah(additionalCpuHourly)}/hr)</span>
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className={cn(isDark ? "text-zinc-300" : "text-slate-900", "text-sm font-bold")}>RAM Memory</label>
                        <span className={cn("text-sm font-mono font-bold", isDark ? "text-cyan-400" : "text-cyan-800")}>{upgradeRam} GB</span>
                      </div>
                      <div className="mb-2">
                        <span className={cn(
                          "inline-flex items-center text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full font-bold border",
                          isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-100 text-cyan-950 border-cyan-300"
                        )}>
                          Upgrade: Rp 25.000/GB/mo (~Rp 35/hr)
                        </span>
                      </div>
                      <input
                        type="range"
                        min={vps.ramGb} max={maxSpecs.ram} step={1}
                        value={upgradeRam}
                        onChange={(e) => setUpgradeRam(parseInt(e.target.value))}
                        style={{ backgroundSize: `${((upgradeRam - vps.ramGb) / Math.max(1, maxSpecs.ram - vps.ramGb)) * 100}% 100%` }}
                        className={cn("w-full", isDark ? "accent-cyan-500" : "accent-cyan-600")}
                      />
                      <div className={cn("flex justify-between text-xs mt-1 font-mono font-semibold", isDark ? "text-zinc-500" : "text-slate-700")}>
                        <span>{vps.ramGb} GB (Current)</span>
                        <span>{maxSpecs.ram} GB Max</span>
                      </div>
                      {additionalRam > 0 && (
                        <div className={cn(
                          "mt-2.5 p-3 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 border transition-all",
                          isDark ? "bg-[#0b162c] border-cyan-500/20 text-zinc-300" : "bg-cyan-50 border-cyan-300 text-slate-800 font-medium"
                        )}>
                          <span className="flex items-center gap-1.5 flex-wrap">
                            <Cpu className={cn("w-3.5 h-3.5 shrink-0", isDark ? "text-cyan-400" : "text-cyan-700")} />
                            <span>Added RAM:</span>
                            <strong className={cn("font-bold", isDark ? "text-white" : "text-slate-950")}>
                              +{additionalRam} GB
                            </strong>
                            <span className={cn("font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>
                              (@ Rp 25.000/GB/mo)
                            </span>
                          </span>
                          <span className={cn("font-mono font-bold self-start sm:self-auto shrink-0", isDark ? "text-cyan-400" : "text-cyan-800")}>
                            +{formatRupiah(additionalRamMonthly)}/mo <span className={cn("text-[11px] font-normal", isDark ? "text-zinc-400" : "text-slate-600")}>(~+{formatRupiah(additionalRamHourly)}/hr)</span>
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <label className={cn(isDark ? "text-zinc-300" : "text-slate-900", "text-sm font-bold whitespace-nowrap")}>Main Disk Storage</label>
                        </div>
                        <span className={cn("text-sm font-mono font-bold shrink-0 whitespace-nowrap", isDark ? "text-cyan-400" : "text-cyan-800")}>{upgradeDisk} GB</span>
                      </div>
                      <div className="mb-2">
                        <span className={cn(
                          "inline-flex items-center text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full font-bold border",
                          isSsd
                            ? isDark ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-purple-50 text-purple-900 border-purple-300"
                            : isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-100 text-cyan-950 border-cyan-300"
                        )}>
                          {isSsd ? "SSD Storage" : "HDD Storage"} • Upgrade: {formatRupiah(diskRatePerGbMonthly)}/GB/mo
                        </span>
                      </div>
                      <input
                        type="range"
                        min={vps.diskGb} max={maxSpecs.disk} step={10}
                        value={upgradeDisk}
                        onChange={(e) => setUpgradeDisk(parseInt(e.target.value))}
                        style={{ backgroundSize: `${((upgradeDisk - vps.diskGb) / Math.max(1, maxSpecs.disk - vps.diskGb)) * 100}% 100%` }}
                        className={cn("w-full", isDark ? "accent-cyan-500" : "accent-cyan-600")}
                      />
                      <div className={cn("flex justify-between text-xs mt-1 font-mono font-semibold", isDark ? "text-zinc-500" : "text-slate-700")}>
                        <span>{vps.diskGb} GB {isSsd ? "SSD" : "HDD"} (Current)</span>
                        <span>{maxSpecs.disk} GB Max</span>
                      </div>
                      {addedDiskGb > 0 && (
                        <div className={cn(
                          "mt-2.5 p-3 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 border transition-all",
                          isDark ? "bg-[#0b162c] border-cyan-500/20 text-zinc-300" : "bg-cyan-50 border-cyan-300 text-slate-800 font-medium"
                        )}>
                          <span className="flex items-center gap-1.5 flex-wrap">
                            <HardDrive className={cn("w-3.5 h-3.5 shrink-0", isDark ? "text-cyan-400" : "text-cyan-700")} />
                            <span>Added Storage:</span>
                            <strong className={cn("font-bold", isDark ? "text-white" : "text-slate-950")}>
                              +{addedDiskGb} GB {isSsd ? "SSD" : "HDD"}
                            </strong>
                            <span className={cn("font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>
                              (@ {formatRupiah(diskRatePerGbMonthly)}/GB/mo)
                            </span>
                          </span>
                          <span className={cn("font-mono font-bold self-start sm:self-auto shrink-0", isDark ? "text-cyan-400" : "text-cyan-800")}>
                            +{formatRupiah(additionalDiskMonthly)}/mo <span className={cn("text-[11px] font-normal", isDark ? "text-zinc-400" : "text-slate-600")}>(~+{formatRupiah(additionalDiskHourly)}/hr)</span>
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <label className={cn(isDark ? "text-zinc-300" : "text-slate-900", "text-sm font-bold whitespace-nowrap")}>Network Bandwidth (Speed Limit)</label>
                        <span className={cn("text-sm font-mono font-bold shrink-0 whitespace-nowrap", isDark ? "text-cyan-400" : "text-cyan-800")}>{safeUpgradeBandwidthMbps} Mbps</span>
                      </div>
                      <div className="mb-2">
                        <div className={cn(
                          "inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] sm:text-xs px-2.5 py-1 rounded-lg font-bold border leading-snug",
                          isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-100 text-cyan-950 border-cyan-300"
                        )}>
                          <span>100 Mbps Base Free</span>
                          <span className={cn("text-xs", isDark ? "text-cyan-500/50" : "text-cyan-600")}>•</span>
                          <span>Upgrade: Rp 50.000 / 50 Mbps / mo (~Rp 69/hr)</span>
                        </div>
                      </div>
                      {(() => {
                        const maxAllowedBandwidth = Math.max(currentBandwidthMbps, ...bandwidthOptions);
                        const displayedBandwidth = Math.min(Math.max(safeUpgradeBandwidthMbps, currentBandwidthMbps), maxAllowedBandwidth);
                        const rangeSpan = Math.max(1, maxAllowedBandwidth - currentBandwidthMbps);
                        const progressPct = ((displayedBandwidth - currentBandwidthMbps) / rangeSpan) * 100;
                        return (
                          <>
                            <input
                              type="range"
                              min={currentBandwidthMbps}
                              max={maxAllowedBandwidth}
                              step={50}
                              value={displayedBandwidth}
                              onChange={(e) => setUpgradeBandwidth(parseInt(e.target.value))}
                              style={{ backgroundSize: `${progressPct}% 100%` }}
                              className={cn("w-full", isDark ? "accent-cyan-500" : "accent-cyan-600")}
                            />
                            <div className={cn("flex justify-between text-xs mt-1 font-mono font-semibold", isDark ? "text-zinc-500" : "text-slate-700")}>
                              <span>{currentBandwidthMbps} Mbps (Current)</span>
                              <span>{maxAllowedBandwidth} Mbps Max</span>
                            </div>
                            {/* Quick preset buttons from admin config */}
                            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2.5">
                              {bandwidthOptions.filter(speed => speed >= currentBandwidthMbps).map(speed => (
                                <button
                                  key={speed}
                                  type="button"
                                  onClick={() => setUpgradeBandwidth(speed)}
                                  className={cn(
                                    "min-w-[48px] px-2.5 py-1 text-xs font-mono rounded-lg border transition-all cursor-pointer text-center",
                                    safeUpgradeBandwidthMbps === speed
                                      ? isDark ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold shadow-xs" : "bg-cyan-100 text-cyan-950 border-cyan-400 font-bold shadow-xs"
                                      : isDark ? "bg-white/5 text-zinc-400 border-white/10 hover:border-white/20 font-medium" : "bg-slate-100 text-slate-800 border-slate-300 hover:border-slate-400 font-bold"
                                  )}
                                >
                                  {speed}M
                                </button>
                              ))}
                            </div>
                          </>
                        );
                      })()}
                      {addedBandwidthMbps > 0 && (
                        <div className={cn(
                          "mt-2.5 p-3 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 border transition-all",
                          isDark ? "bg-[#0b162c] border-cyan-500/20 text-zinc-300" : "bg-cyan-50 border-cyan-300 text-slate-800 font-medium"
                        )}>
                          <span className="flex items-center gap-1.5 flex-wrap">
                            <Network className={cn("w-3.5 h-3.5 shrink-0", isDark ? "text-cyan-400" : "text-cyan-700")} />
                            <span>Added Bandwidth:</span>
                            <strong className={cn("font-bold", isDark ? "text-white" : "text-slate-950")}>
                              +{addedBandwidthMbps} Mbps
                            </strong>
                            <span className={cn("font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>
                              (@ Rp 50.000 / 50 Mbps / mo)
                            </span>
                          </span>
                          <span className={cn("font-mono font-bold self-start sm:self-auto shrink-0", isDark ? "text-cyan-400" : "text-cyan-800")}>
                            +{formatRupiah(additionalBandwidthMonthly)}/mo <span className={cn("text-[11px] font-normal", isDark ? "text-zinc-400" : "text-slate-600")}>(~+{formatRupiah(additionalBandwidthHourly)}/hr)</span>
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <label className={cn(isDark ? "text-zinc-300" : "text-slate-900", "text-sm font-bold whitespace-nowrap")}>Backup Storage</label>
                        <span className={cn("text-sm font-mono font-bold shrink-0 whitespace-nowrap", isDark ? "text-cyan-400" : "text-cyan-800")}>{upgradeBackup} GB</span>
                      </div>
                      <div className="mb-2">
                        <div className={cn(
                          "inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] sm:text-xs px-2.5 py-1 rounded-lg font-bold border leading-snug",
                          isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-100 text-cyan-950 border-cyan-300"
                        )}>
                          <span>Snapshot & Backup Quota</span>
                          <span className={cn("text-xs", isDark ? "text-cyan-500/50" : "text-cyan-600")}>•</span>
                          <span>Upgrade: {formatRupiah(backupMonthlyRate)}/GB/mo (~{formatRupiah(backupRatePerHour)}/hr)</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={vps.backupGb || 0} max={maxSpecs.backup || 2000} step={10}
                        value={upgradeBackup}
                        onChange={(e) => setUpgradeBackup(parseInt(e.target.value))}
                        style={{ backgroundSize: `${((upgradeBackup - (vps.backupGb || 0)) / Math.max(1, (maxSpecs.backup || 2000) - (vps.backupGb || 0))) * 100}% 100%` }}
                        className={cn("w-full", isDark ? "accent-cyan-500" : "accent-cyan-600")}
                      />
                      <div className={cn("flex justify-between text-xs mt-1 font-mono font-semibold", isDark ? "text-zinc-500" : "text-slate-700")}>
                        <span>{vps.backupGb || 0} GB (Current)</span>
                        <span>{maxSpecs.backup || 2000} GB Max</span>
                      </div>
                      {additionalBackupGb > 0 && (
                        <div className={cn(
                          "mt-2.5 p-3 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 border transition-all",
                          isDark ? "bg-[#0b162c] border-cyan-500/20 text-zinc-300" : "bg-cyan-50 border-cyan-300 text-slate-800 font-medium"
                        )}>
                          <span className="flex items-center gap-1.5 flex-wrap">
                            <Archive className={cn("w-3.5 h-3.5 shrink-0", isDark ? "text-cyan-400" : "text-cyan-700")} />
                            <span>Added Backup Storage:</span>
                            <strong className={cn("font-bold", isDark ? "text-white" : "text-slate-950")}>
                              +{additionalBackupGb} GB
                            </strong>
                            <span className={cn("font-medium", isDark ? "text-zinc-400" : "text-slate-600")}>
                              (@ {formatRupiah(backupMonthlyRate)}/GB/mo)
                            </span>
                          </span>
                          <span className={cn("font-mono font-bold self-start sm:self-auto shrink-0", isDark ? "text-cyan-400" : "text-cyan-800")}>
                            +{formatRupiah(additionalBackupMonthly)}/mo <span className={cn("text-[11px] font-normal", isDark ? "text-zinc-400" : "text-slate-600")}>(~+{formatRupiah(additionalBackupHourly)}/hr)</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Network Upgrades */}
                  <div className={cn("mt-8 pt-6 border-t", isDark ? "border-white/10" : "border-slate-200")}>
                    <h4 className={cn(isDark ? "text-zinc-300" : "text-slate-950", "font-bold text-base mb-4 flex items-center justify-between")}>
                      Network Add-ons
                    </h4>

                    {vps?.assignedIps && vps.assignedIps.length > 0 && (
                      <div className={cn("mb-4 p-4 rounded-xl border", isDark ? "bg-black/20 border-white/5" : "bg-slate-50 border-slate-300")}>
                        <div className="flex items-center justify-between mb-3">
                          <p className={cn("text-xs font-bold uppercase tracking-widest", isDark ? "text-zinc-500" : "text-slate-700")}>Current IP Addresses</p>
                          {vps.assignedIps.length > 5 && (
                            <div className="flex items-center gap-2">
                              <button
                                disabled={ipPage === 1}
                                onClick={() => setIpPage(p => p - 1)}
                                className={cn("w-6 h-6 rounded flex items-center justify-center transition-colors border disabled:opacity-30", isDark ? "bg-white/5 hover:bg-white/10 border-white/10 text-white" : "bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-900 font-bold")}
                              >
                                &lt;
                              </button>
                              <span className={cn("text-xs font-mono font-semibold", isDark ? "text-zinc-400" : "text-slate-700")}>{ipPage} / {Math.ceil(vps.assignedIps.length / 5)}</span>
                              <button
                                disabled={ipPage === Math.ceil(vps.assignedIps.length / 5)}
                                onClick={() => setIpPage(p => p + 1)}
                                className={cn("w-6 h-6 rounded flex items-center justify-center transition-colors border disabled:opacity-30", isDark ? "bg-white/5 hover:bg-white/10 border-white/10 text-white" : "bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-900 font-bold")}
                              >
                                &gt;
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {vps.assignedIps.slice((ipPage - 1) * 5, ipPage * 5).map((ip: any) => (
                            <div key={ip.id} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border", isDark ? "bg-cyan-500/5 border-cyan-500/20" : "bg-cyan-50 border-cyan-300")}>
                              <div className="w-2 h-2 rounded-full bg-cyan-500" />
                              <span className={cn("text-sm font-mono font-bold", isDark ? "text-cyan-100" : "text-cyan-950")} title={ip.publicIp ? `Internal IP: ${ip.ipAddress}` : undefined}>{ip.publicIp || ip.ipAddress}</span>
                              {ip.isPrimary && <span className={cn("text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border", isDark ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" : "text-cyan-900 bg-cyan-100 border-cyan-300")}>Primary</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {hasIpv4Pool && (
                        <div className={cn("p-4 rounded-xl border flex items-center justify-between", isDark ? "bg-[#060b14] border-slate-800/80 hover:border-slate-700" : "bg-slate-50 border-slate-300 hover:border-slate-400")}>
                          <div>
                            <p className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-950")}>Add IPv4 Address</p>
                            <p className={cn("text-xs mt-0.5 font-medium", isDark ? "text-zinc-400" : "text-slate-700")}>
                              {pricing.ipv4
                                ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(pricing.ipv4 * 730) + " / mo"
                                : "Contact support"}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setAddIpv4Count(Math.max(0, addIpv4Count - 1))}
                              className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-colors border font-bold", isDark ? "bg-white/5 hover:bg-white/10 border-white/10 text-white" : "bg-white hover:bg-slate-100 border-slate-300 text-slate-900")}
                            >
                              -
                            </button>
                            <span className={cn("font-mono font-bold w-4 text-center", isDark ? "text-white" : "text-slate-950")}>{addIpv4Count}</span>
                            <button
                              onClick={() => setAddIpv4Count(addIpv4Count + 1)}
                              className="w-8 h-8 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-800 dark:text-cyan-300 flex items-center justify-center transition-colors border border-cyan-400 font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}

                      {hasIpv6Pool && (
                        <div className={cn("p-4 rounded-xl border flex items-center justify-between", isDark ? "bg-[#060b14] border-slate-800/80 hover:border-slate-700" : "bg-slate-50 border-slate-300 hover:border-slate-400")}>
                          <div>
                            <p className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-950")}>Add IPv6 Address</p>
                            <p className={cn("text-xs mt-0.5 font-medium", isDark ? "text-zinc-400" : "text-slate-700")}>
                              {pricing.ipv6
                                ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(pricing.ipv6 * 730) + " / mo"
                                : "Free or Contact support"}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setAddIpv6Count(Math.max(0, addIpv6Count - 1))}
                              className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-colors border font-bold", isDark ? "bg-white/5 hover:bg-white/10 border-white/10 text-white" : "bg-white hover:bg-slate-100 border-slate-300 text-slate-900")}
                            >
                              -
                            </button>
                            <span className={cn("font-mono font-bold w-4 text-center", isDark ? "text-white" : "text-slate-950")}>{addIpv6Count}</span>
                            <button
                              onClick={() => setAddIpv6Count(addIpv6Count + 1)}
                              className="w-8 h-8 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-800 dark:text-cyan-300 flex items-center justify-center transition-colors border border-cyan-400 font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  </div>
                </div>

              <div className="lg:col-span-4 space-y-6">
                  <div className={cn("border rounded-2xl p-4 sm:p-6 shadow-md sticky top-6 flex flex-col gap-6", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-200 shadow-sm")}>
                    {/* Cost Estimator Box (AWS Style) */}
                    {hasUpgrades && (
                      <div className={cn("p-4 sm:p-5 rounded-2xl border relative overflow-hidden", isDark ? "bg-[#060b14] border-slate-800 shadow-sm" : "bg-slate-50 border-slate-300 shadow-sm")}>
                        {/* Decorative Background Icon */}
                        <div className="absolute -right-6 -top-6 text-cyan-500/5 pointer-events-none">
                          <Activity className="w-48 h-48" />
                        </div>

                        <div className="relative z-10">
                          <h4 className={cn(isDark ? "text-white" : "text-slate-950", "font-bold mb-3 flex items-center gap-2")}>
                            <Receipt className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-700")} />
                            Upgrade Cost Estimate
                          </h4>

                          {/* Itemized Upgrade Breakdown */}
                          <div className={cn("mb-4 space-y-2.5 text-xs border-b pb-3", isDark ? "border-slate-800 text-zinc-400" : "border-slate-300 text-slate-700")}>
                            {addedDiskGb > 0 && (
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <span className={cn("font-medium", isDark ? "text-zinc-400" : "text-slate-800")}>Disk (+{addedDiskGb} GB {isSsd ? "SSD" : "HDD"} @ {formatRupiah(diskRatePerGbMonthly)}/GB):</span>
                                <span className={cn("font-mono font-bold shrink-0", isDark ? "text-cyan-400" : "text-cyan-800")}>
                                  +{formatRupiah(additionalDiskMonthly)}/mo <span className={cn("text-[11px] font-normal", isDark ? "text-zinc-400" : "text-slate-600")}>(+{formatRupiah(additionalDiskHourly)}/hr)</span>
                                </span>
                              </div>
                            )}
                            {additionalCpu > 0 && (
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <span className={cn("font-medium", isDark ? "text-zinc-400" : "text-slate-800")}>CPU (+{additionalCpu} Core @ Rp 50.000/mo):</span>
                                <span className={cn("font-mono font-bold shrink-0", isDark ? "text-white" : "text-slate-950")}>
                                  +{formatRupiah(additionalCpuMonthly)}/mo <span className={cn("text-[11px] font-normal", isDark ? "text-zinc-400" : "text-slate-600")}>(+{formatRupiah(additionalCpuHourly)}/hr)</span>
                                </span>
                              </div>
                            )}
                            {additionalRam > 0 && (
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <span className={cn("font-medium", isDark ? "text-zinc-400" : "text-slate-800")}>RAM (+{additionalRam} GB @ Rp 25.000/mo):</span>
                                <span className={cn("font-mono font-bold shrink-0", isDark ? "text-white" : "text-slate-950")}>
                                  +{formatRupiah(additionalRamMonthly)}/mo <span className={cn("text-[11px] font-normal", isDark ? "text-zinc-400" : "text-slate-600")}>(+{formatRupiah(additionalRamHourly)}/hr)</span>
                                </span>
                              </div>
                            )}
                            {addedBandwidthMbps > 0 && (
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <span className={cn("font-medium", isDark ? "text-zinc-400" : "text-slate-800")}>Bandwidth (+{addedBandwidthMbps} Mbps @ Rp 50.000/50M):</span>
                                <span className={cn("font-mono font-bold shrink-0", isDark ? "text-cyan-400" : "text-cyan-800")}>
                                  +{formatRupiah(additionalBandwidthMonthly)}/mo <span className={cn("text-[11px] font-normal", isDark ? "text-zinc-400" : "text-slate-600")}>(+{formatRupiah(additionalBandwidthHourly)}/hr)</span>
                                </span>
                              </div>
                            )}
                            {upgradeBackup > (vps.backupGb || 0) && (
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <span className={cn("font-medium", isDark ? "text-zinc-400" : "text-slate-800")}>Backup (+{upgradeBackup - (vps.backupGb || 0)} GB):</span>
                                <span className={cn("font-mono font-bold shrink-0", isDark ? "text-white" : "text-slate-950")}>
                                  +{formatRupiah((upgradeBackup - (vps.backupGb || 0)) * (pricing.backup || 0) * 730)}/mo <span className={cn("text-[11px] font-normal", isDark ? "text-zinc-400" : "text-slate-600")}>(+{formatRupiah((upgradeBackup - (vps.backupGb || 0)) * (pricing.backup || 0))}/hr)</span>
                                </span>
                              </div>
                            )}
                            {addIpv4Count > 0 && (
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <span className={cn("font-medium", isDark ? "text-zinc-400" : "text-slate-800")}>IPv4 (+{addIpv4Count} IP):</span>
                                <span className={cn("font-mono font-bold shrink-0", isDark ? "text-white" : "text-slate-950")}>
                                  +{formatRupiah(addIpv4Count * (pricing.ipv4 || 0) * 730)}/mo <span className={cn("text-[11px] font-normal", isDark ? "text-zinc-400" : "text-slate-600")}>(+{formatRupiah(addIpv4Count * (pricing.ipv4 || 0))}/hr)</span>
                                </span>
                              </div>
                            )}
                            {addIpv6Count > 0 && (
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <span className={cn("font-medium", isDark ? "text-zinc-400" : "text-slate-800")}>IPv6 (+{addIpv6Count} IP):</span>
                                <span className={cn("font-mono font-bold shrink-0", isDark ? "text-white" : "text-slate-950")}>
                                  +{formatRupiah(addIpv6Count * (pricing.ipv6 || 0) * 730)}/mo <span className={cn("text-[11px] font-normal", isDark ? "text-zinc-400" : "text-slate-600")}>(+{formatRupiah(addIpv6Count * (pricing.ipv6 || 0))}/hr)</span>
                                </span>
                              </div>
                            )}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-2 font-bold border-t border-slate-500/20">
                              <span className="text-slate-900 dark:text-zinc-200">Total Additional Rate:</span>
                              <span className={cn("font-mono font-bold text-sm shrink-0", isDark ? "text-cyan-400" : "text-cyan-800")}>
                                +{formatRupiah(additionalHourlyRate)} / hr
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                            <div className={cn("p-3.5 rounded-xl border", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-300 shadow-2xs")}>
                              <p className={cn("text-xs mb-1 font-bold", isDark ? "text-zinc-400" : "text-slate-700")}>New Hourly Rate</p>
                              <p className={cn("text-lg font-bold font-mono", isDark ? "text-white" : "text-slate-950")}>
                                {formatRupiah(newHourlyPrice)} <span className={cn("text-xs font-normal font-sans", isDark ? "text-zinc-500" : "text-slate-600")}>/ hr</span>
                              </p>
                            </div>
                            <div className={cn("p-3.5 rounded-xl border shadow-sm", isDark ? "bg-[#0b162c] border-cyan-500/30" : "bg-white border-cyan-500 shadow-sm")}>
                              <p className={cn("text-xs mb-1 font-bold", isDark ? "text-cyan-400" : "text-cyan-900")}>Estimated Monthly Cost</p>
                              <p className={cn("text-xl font-bold font-mono", isDark ? "text-white" : "text-slate-950")}>
                                {formatRupiah(newMonthlyPrice)} <span className={cn("text-xs font-normal font-sans", isDark ? "text-zinc-500" : "text-slate-600")}>/ mo (~730h)</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col items-stretch sm:items-end gap-4 w-full">
                      <div className={cn(
                        "w-full flex items-start sm:items-center gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl border transition-all text-left shadow-sm",
                        hasUpgrades && balance < requiredBalance ? "border-red-500/40 bg-red-500/5" : isDark ? "bg-[#0b162c] border-cyan-500/40" : "bg-white border-cyan-500 shadow-sm"
                      )}>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 bg-cyan-50 border border-cyan-300 shadow-2xs">
                          <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={cn("text-sm sm:text-base font-bold", isDark ? "text-cyan-400" : "text-cyan-950")}>Account Balance</div>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            <div className={cn("text-xs font-medium tracking-wide", isDark ? "text-zinc-400" : "text-slate-700")}>
                              Available: <span className="font-mono font-bold text-slate-950 dark:text-zinc-200">{formatRupiah(balance)}</span>
                            </div>
                          </div>
                          {hasUpgrades && balance < requiredBalance && (
                            <div className="text-[11px] sm:text-xs text-red-600 dark:text-red-400 font-medium mt-2.5 bg-red-100 dark:bg-red-500/10 p-2.5 sm:px-3 sm:py-2 rounded-xl flex items-start gap-2 border border-red-300 dark:border-red-500/20 leading-relaxed">
                              <X className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                              <div className="space-y-0.5">
                                <p className="font-bold text-red-700 dark:text-red-400">Insufficient balance</p>
                                <p className="text-red-950 dark:text-zinc-300 text-[11px] font-medium">
                                  Minimum required: <strong className="font-mono text-red-950 dark:text-white font-bold">{formatRupiah(requiredBalance)}</strong> (1 month reserve)
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={handleUpgradeSpecs}
                        disabled={isUpgrading || (hasUpgrades && balance < requiredBalance) || vps.status === 'SUSPENDED' || !hasUpgrades}
                        className="w-full sm:w-auto justify-center px-6 py-3 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 font-bold rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-slate-950 text-sm"
                      >
                        {isUpgrading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                        {isUpgrading ? "Upgrading..." : "Confirm Upgrade"}
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* ADDON DISKS TAB */}
            {activeTab === "addon" && (
              <div className="animate-in fade-in duration-500 max-w-3xl space-y-6">
                <div className={cn("border rounded-2xl p-4 sm:p-6 shadow-lg", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-300 shadow-sm")}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl">
                      <HardDrive className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className={cn("font-bold text-lg", isDark ? "text-white" : "text-slate-950")}>Add-on Disks (EBS-style)</h3>
                      <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-700 font-medium")}>Attach additional storage volumes to your VPS.</p>
                    </div>
                  </div>

                  {allowedAddonStorages.length === 0 ? (
                    <div className={cn("p-4 border rounded-xl text-sm flex items-start gap-3", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-200" : "bg-cyan-50 border-cyan-300 text-slate-800")}>
                      <Info className={cn("w-5 h-5 shrink-0 mt-0.5", isDark ? "text-cyan-400" : "text-cyan-700")} />
                      <div>
                        <p className={cn("font-bold mb-0.5", isDark ? "text-cyan-400" : "text-cyan-950")}>Add-on Disks Notice:</p>
                        <p className={cn("text-xs leading-relaxed", isDark ? "text-cyan-200/90" : "text-slate-800 font-medium")}>Add-on disks are currently not available. No storage providers have been configured by the administrator.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Current Add-on Disks */}
                      {addonDisks.length > 0 && (
                        <div>
                          <h4 className={cn(isDark ? "text-zinc-300" : "text-slate-950", "text-sm font-bold mb-4")}>Attached Disks</h4>
                          <div className="space-y-3">
                            {addonDisks.map((disk) => (
                              <div key={disk.slot} className={cn("flex items-center justify-between p-4 border rounded-xl", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-300 shadow-sm")}>
                                <div className="flex items-center gap-4">
                                  <div className="p-2 bg-cyan-500/10 text-cyan-500 rounded-lg">
                                    <HardDrive className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <p className={cn("font-bold", isDark ? "text-white" : "text-slate-950")}>{disk.sizeGb} GB Disk</p>
                                    <p className={cn("text-xs mt-0.5", isDark ? "text-zinc-400" : "text-slate-700 font-medium")}>Slot: {disk.slot} • Storage: {disk.storage}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleDeleteAddonDisk(disk.slot)}
                                  className={cn("px-4 py-2 rounded-lg text-sm font-bold transition-colors", isDark ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-red-100 text-red-950 border border-red-300 hover:bg-red-200")}
                                >
                                  Delete
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Add New Disk Form */}
                      <div>
                        <h4 className={cn(isDark ? "text-zinc-300 border-white/10" : "text-slate-950 border-slate-300", "font-bold mb-4 border-t pt-6")}>Attach New Disk</h4>
                        <form onSubmit={handleAddonDisk} className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className={cn(isDark ? "text-zinc-300" : "text-slate-900", "block text-sm font-bold mb-2")}>Disk Size (GB)</label>
                              <input
                                type="number"
                                min={1} max={1000} required
                                value={addonSize || ""}
                                onChange={(e) => setAddonSize(e.target.value === "" ? 0 : parseInt(e.target.value))}
                                className={cn("w-full rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono", isDark ? "bg-[#060b14] border border-slate-800 text-white" : "bg-slate-50 border border-slate-300 text-slate-950 font-medium placeholder:text-slate-400")}
                              />
                            </div>
                          </div>

                          {/* Cost Calculator */}
                          {(addonSize || 0) > 0 && (pricing?.addon_disk || 0) > 0 && (
                            <div className={cn("border rounded-xl p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6", isDark ? "bg-cyan-500/5 border-cyan-500/20" : "bg-cyan-50/70 border-cyan-300")}>
                              <div className="flex items-start md:items-center gap-3">
                                <div className="p-2.5 bg-cyan-500/20 rounded-lg shrink-0">
                                  <Calculator className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-700")} />
                                </div>
                                <div>
                                  <h5 className={cn("text-sm font-bold mb-0.5", isDark ? "text-white" : "text-slate-950")}>Estimated Additional Cost</h5>
                                  <p className={cn("text-xs", isDark ? "text-zinc-400" : "text-slate-700 font-medium")}>
                                    This amount will be added to your hourly rate.
                                  </p>
                                </div>
                              </div>
                              <div className={cn("text-left md:text-right p-3 rounded-lg border", isDark ? "bg-black/20 border-white/5" : "bg-white border-slate-300 shadow-xs")}>
                                  <>
                                    <div className={cn("text-lg font-bold flex items-center md:justify-end gap-1.5", isDark ? "text-cyan-400" : "text-cyan-950")}>
                                      Rp {((addonSize || 0) * pricing.addon_disk).toLocaleString('id-ID')}
                                      <span className={cn("text-xs font-semibold", isDark ? "text-zinc-400" : "text-slate-600")}>/hour</span>
                                    </div>
                                    <div className={cn("text-xs mt-1 font-semibold", isDark ? "text-zinc-400" : "text-slate-700")}>
                                      ~Rp {((addonSize || 0) * pricing.addon_disk * 720).toLocaleString('id-ID')} /month
                                    </div>
                                  </>
                              </div>
                            </div>
                          )}

                          <div className={cn("p-4 rounded-xl flex items-start gap-3 border transition-all shadow-sm", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-200" : "bg-cyan-50 border-cyan-300 text-slate-800")}>
                            <Info className={cn("w-5 h-5 shrink-0 mt-0.5", isDark ? "text-cyan-400" : "text-cyan-700")} />
                            <p className={cn("text-xs sm:text-sm leading-relaxed", isDark ? "text-cyan-200/90" : "text-slate-800 font-medium")}>
                              <strong className={cn("font-bold mr-1.5", isDark ? "text-cyan-400" : "text-cyan-950")}>Note:</strong> Attached disks will appear as unformatted block devices (e.g., <code className="px-1 py-0.5 rounded bg-black/20 dark:bg-black/40 font-mono text-slate-900 dark:text-slate-100 font-bold">/dev/sdb</code>) inside your VPS. You will need to partition and format them manually via the console or SSH.
                            </p>
                          </div>

                          <div className="flex justify-end pt-4">
                            <button
                              type="submit"
                              disabled={isAddingDisk || allowedAddonStorages.length === 0}
                              className="w-full sm:w-auto justify-center px-5 py-2.5 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 font-bold rounded-lg transition-all shadow-sm disabled:opacity-50 flex items-center gap-2 text-slate-950 text-sm"
                            >
                              {isAddingDisk ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                              {isAddingDisk ? "Attaching Disk..." : "Attach New Disk"}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* INSTALL TAB */}
            {activeTab === "install" && (
              <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in duration-500">

                {/* Sidebar Reinstall Menu */}
                <div className={cn("w-full lg:w-64 shrink-0 border rounded-2xl p-2 h-fit flex flex-col gap-1", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-300 shadow-sm")}>
                  <button className={cn("w-full text-left px-4 py-3 text-sm font-bold rounded-xl transition-all", isDark ? "bg-[#060b14] text-cyan-400 border border-slate-700 shadow-sm" : "bg-cyan-100 text-cyan-950 border border-cyan-400 shadow-xs ring-1 ring-cyan-400/30")}>
                    Reinstall OS
                  </button>
                </div>

                {/* Main Reinstall Area */}
                <div className="flex-1 space-y-6">

                  {/* OS Selection Grid */}
                  <div className={cn("border rounded-2xl p-6 shadow-sm", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-300 shadow-sm")}>
                    <h3 className={cn("font-bold mb-4", isDark ? "text-white" : "text-slate-950")}>Select OS:</h3>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                      {Object.entries(osGroups).map(([family, versions]: [string, any]) => {
                        const isActive = activeOsFamily === family;
                        return (
                          <div
                            key={family}
                            className={cn(
                              "relative rounded-2xl border p-4 flex flex-col items-center gap-3 transition-all cursor-pointer shadow-sm",
                              isActive 
                                ? (isDark ? "bg-[#0b162c] border-cyan-500 shadow-md ring-1 ring-cyan-500/30" : "bg-cyan-50/60 border-cyan-500 shadow-sm ring-2 ring-cyan-500/20") 
                                : (isDark ? "bg-[#060b14] border-slate-800 hover:border-slate-700 hover:bg-[#0a1222]" : "bg-white border-slate-300 hover:border-cyan-500 hover:shadow-md")
                            )}
                            onClick={() => {
                              setActiveOsFamily(family);
                              if (!isActive && versions.length > 0) {
                                setSelectedTemplate(versions[0].name);
                              }
                            }}
                          >
                            {/* OS Icon */}
                            {(() => {
                              const iconUrl = getOsIcon(family, isDark);
                              return iconUrl ? (
                                <img referrerPolicy="no-referrer" src={iconUrl} alt={family} className="w-12 h-12 object-contain filter drop-shadow-md" loading="lazy" decoding="async" />
                              ) : (
                                <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl" style={{
                                  backgroundColor: family === 'Ubuntu' ? '#E95420' :
                                    family === 'CentOS' ? '#932279' :
                                      family === 'Debian' ? '#A80030' :
                                        family === 'Rocky Linux' ? '#10B981' :
                                          family.toLowerCase().includes('alpine') ? '#0D597F' :
                                            family.toLowerCase().includes('alma') ? '#141E34' :
                                              family.toLowerCase().includes('freebsd') ? '#AB2B28' : '#475569',
                                  color: 'white'
                                }}>
                                  {family.charAt(0)}
                                </div>
                              );
                            })()}
                            <span className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-950")}>{family}</span>

                            {isActive && (
                              <div className="w-full mt-2" onClick={(e) => e.stopPropagation()}>
                                <Select
                                  value={selectedTemplate}
                                  onChange={(val) => setSelectedTemplate(val)}
                                  options={versions.map((v: any) => ({ value: v.name, label: v.name }))}
                                  placeholder="SELECT VERSION"
                                  className="py-1.5 px-2 text-xs rounded font-medium"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Password Form */}
                  {(() => {
                    const isWindowsReinstall = Boolean(
                      activeOsFamily?.toLowerCase().includes("windows") ||
                      selectedTemplate?.toLowerCase().includes("windows")
                    );
                    return (
                      <div className={cn("border rounded-2xl overflow-hidden shadow-lg", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-300 shadow-sm")}>
                        <div className={cn("border-b", isDark ? "border-white/10" : "border-slate-300", "bg-slate-50 dark:bg-white/5 px-6 py-3.5 flex items-center justify-between")}>
                          <h3 className={cn("font-bold text-sm", isDark ? "text-white" : "text-slate-950")}>Password for OS after reinstallation</h3>
                          <span className={cn(
                            "text-xs px-2.5 py-1 rounded font-bold",
                            isDark ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "bg-cyan-100 text-cyan-950 border border-cyan-300"
                          )}>
                            Default user: <b>{isWindowsReinstall ? "Administrator" : "root"}</b>
                          </span>
                        </div>
                        <div className="p-6 space-y-4 max-w-md">
                          {isWindowsReinstall ? (
                            <div className={cn("p-3.5 rounded-xl border flex items-start gap-3 text-xs transition-all shadow-sm", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-200" : "bg-cyan-50 border-cyan-300 text-slate-800")}>
                              <Info className={cn("w-4 h-4 shrink-0 mt-0.5", isDark ? "text-cyan-400" : "text-cyan-700")} />
                              <div>
                                <p className={cn("font-bold mb-0.5", isDark ? "text-cyan-400" : "text-cyan-950")}>Windows Access Note:</p>
                                <p className={cn("leading-relaxed", isDark ? "text-cyan-200/90" : "text-slate-800 font-medium")}>
                                  The default user for Windows is <strong>Administrator</strong>. This new password will be used to log in as Administrator via RDP (Remote Desktop) or Web Console.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className={cn("p-3.5 rounded-xl border flex items-start gap-3 text-xs transition-all shadow-sm", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-200" : "bg-cyan-50 border-cyan-300 text-slate-800")}>
                              <Info className={cn("w-4 h-4 shrink-0 mt-0.5", isDark ? "text-cyan-400" : "text-cyan-700")} />
                              <div>
                                <p className={cn("font-bold mb-0.5", isDark ? "text-cyan-400" : "text-cyan-950")}>Linux Access Note:</p>
                                <p className={cn("leading-relaxed", isDark ? "text-cyan-200/90" : "text-slate-800 font-medium")}>
                                  The default user after reinstallation is <strong>root</strong>. This new password will be used to log in as root via SSH or Web Console.
                                </p>
                              </div>
                            </div>
                          )}

                          <div>
                            <div className="relative">
                              <input
                                type={showReinstallPassword ? "text" : "password"}
                                placeholder="New Password"
                                value={reinstallPassword}
                                onChange={(e) => setReinstallPassword(e.target.value)}
                                className={cn("w-full rounded-lg pl-4 pr-10 py-2.5 text-sm focus:outline-none transition-colors", isDark ? "bg-[#060b14] border border-slate-800 text-white focus:border-cyan-500/50" : "bg-slate-50 border border-slate-300 text-slate-950 font-medium placeholder:text-slate-400 focus:border-cyan-500")}
                              />
                              <button
                                type="button"
                                onClick={() => setShowReinstallPassword(!showReinstallPassword)}
                                className={cn("absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded transition-colors text-slate-400 hover:text-cyan-600")}
                              >
                                {showReinstallPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          {/* Password Strength Indicator (Visual Only) */}
                          <div className="flex gap-1 h-1.5">
                            <div className={cn("flex-1 rounded-full", reinstallPassword.length > 0 ? "bg-red-500" : (isDark ? "bg-white/10" : "bg-slate-200"))}></div>
                            <div className={cn("flex-1 rounded-full", reinstallPassword.length >= 6 ? "bg-yellow-500" : (isDark ? "bg-white/10" : "bg-slate-200"))}></div>
                            <div className={cn("flex-1 rounded-full", reinstallPassword.length >= 8 ? "bg-green-500" : (isDark ? "bg-white/10" : "bg-slate-200"))}></div>
                            <div className={cn("flex-1 rounded-full", reinstallPassword.length >= 10 && /[!@#$%^&*]/.test(reinstallPassword) ? "bg-green-500" : (isDark ? "bg-white/10" : "bg-slate-200"))}></div>
                          </div>
                          <p className={cn("text-xs font-semibold", isDark ? "text-zinc-400" : "text-slate-700")}>Strength Indicator</p>

                          <div className="relative">
                            <input
                              type={showReinstallPassword ? "text" : "password"}
                              placeholder="Retype Password"
                              value={reinstallPasswordConfirm}
                              onChange={(e) => setReinstallPasswordConfirm(e.target.value)}
                              className={cn("w-full rounded-lg pl-4 pr-10 py-2.5 text-sm focus:outline-none transition-colors", isDark ? "bg-[#060b14] border border-slate-800 text-white focus:border-cyan-500/50" : "bg-slate-50 border border-slate-300 text-slate-950 font-medium placeholder:text-slate-400 focus:border-cyan-500")}
                            />
                          </div>

                          {reinstallPasswordError && (
                            <p className="text-red-500 font-bold text-xs">{reinstallPasswordError}</p>
                          )}

                          <button
                            onClick={handleReinstallClick}
                            disabled={reinstalling || !selectedTemplate || vps.status === 'SUSPENDED' || reinstallPassword.length < 8 || reinstallPassword !== reinstallPasswordConfirm}
                            className="w-full mt-2 flex items-center justify-center gap-2 px-6 py-2.5 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 font-bold rounded-lg transition-all shadow-sm disabled:opacity-50 text-slate-950 text-sm"
                          >
                            {reinstalling ? (
                              <><div className="animate-spin rounded-full h-4 w-4 border-t-2 border-slate-950"></div> Rebuilding...</>
                            ) : (
                              <><HardDrive className="w-4 h-4" /> Reinstall Server</>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* BACKUPS TAB */}
            {activeTab === "backups" && (
              <div className="animate-in fade-in duration-500 space-y-6">
                {/* Backup Quota Widget */}
                <div className={cn("border rounded-2xl p-6 shadow-lg relative overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-300 shadow-sm")}>
                  <div className="flex justify-between items-end mb-4 relative z-10">
                    <h3 className={cn("font-bold text-base flex items-center gap-2", isDark ? "text-white" : "text-slate-950")}>
                      <ShieldCheck className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-700")} />
                      Offsite Backup Storage
                    </h3>
                    <span className={cn("text-sm font-mono font-bold", isDark ? "text-zinc-300" : "text-slate-950")}>
                      {backupQuota > 0 ? (backupUsed / 1024 / 1024 / 1024).toFixed(2) : 0} / {backupQuota} GB
                    </span>
                  </div>

                  {/* Backup Progress Bar */}
                  <div className={cn("w-full h-4 rounded-full overflow-hidden border relative z-10", isDark ? "bg-black/40 border-white/5" : "bg-slate-100 border-slate-300")}>
                    <div
                      className={cn(
                        "h-full rounded-full flex items-center px-2 transition-all",
                        backupQuota > 0 && (backupUsed / 1024 / 1024 / 1024) > (backupQuota * 0.9)
                          ? "bg-red-500"
                          : "bg-gradient-to-r from-cyan-500 to-teal-400"
                      )}
                      style={{ width: `${backupQuota > 0 ? Math.min((backupUsed / (backupQuota * 1024 * 1024 * 1024)) * 100, 100) : 0}%` }}
                    >
                    </div>
                  </div>

                  {backupQuota === 0 && (
                    <div className={cn("mt-4 p-3 rounded-xl flex items-start gap-3 border", isDark ? "bg-amber-500/10 border-amber-500/20 text-amber-200" : "bg-amber-50 border-amber-300 text-amber-950")}>
                      <ShieldAlert className={cn("w-5 h-5 shrink-0 mt-0.5", isDark ? "text-amber-400" : "text-amber-700")} />
                      <p className={cn("text-sm", isDark ? "text-amber-200" : "text-amber-950 font-medium")}>
                        You have not purchased the Backup Addon. Upgrade your plan or purchase backup storage to enable offsite backups.
                      </p>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end relative z-10">
                    <button
                      onClick={handleCreateBackup}
                      disabled={backupQuota === 0 || isBackingUp || vps.status === 'SUSPENDED' || (backupUsed >= backupQuota * 1024 * 1024 * 1024)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all disabled:opacity-50 font-bold text-sm bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm"
                    >
                      <Archive className="w-4 h-4" />
                      {isBackingUp ? "Creating Backup..." : "Create Backup Now"}
                    </button>
                  </div>
                </div>

                {/* Automated Backup Schedule */}
                {backupQuota > 0 && (
                  <div className={cn("border rounded-2xl p-6 shadow-lg", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-300 shadow-sm")}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className={cn("font-bold mb-1", isDark ? "text-white" : "text-slate-950")}>Automated Backup Schedule</h3>
                        <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-700 font-medium")}>Configure how often your server should be backed up automatically. <strong className={cn("font-bold", isDark ? "text-cyan-400" : "text-cyan-950")}>Note: System only keeps a maximum of 2 backups (2 rotations) per VPS. The oldest backup will be automatically deleted.</strong></p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-[150px]">
                          <Select
                            value={backupSchedule}
                            onChange={(val) => setBackupSchedule(val)}
                            options={[
                              { value: "NONE", label: "Disabled" },
                              { value: "DAILY", label: "Daily" },
                              { value: "WEEKLY", label: "Weekly" },
                              { value: "MONTHLY", label: "Monthly" }
                            ]}
                            className={cn("rounded-xl px-4 py-2.5 text-sm font-semibold focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-300 text-slate-950 shadow-sm")}
                          />
                        </div>
                        <button
                          onClick={handleSaveSchedule}
                          disabled={isSettingSchedule}
                          className="px-4 py-2.5 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-sm font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 text-slate-950"
                        >
                          {isSettingSchedule ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Backups List */}
                <div className={cn("border rounded-2xl p-6 shadow-lg", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-300 shadow-sm")}>
                  <h3 className={cn("text-lg font-bold mb-6", isDark ? "text-white" : "text-slate-950")}>Backup Archives</h3>

                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-sm text-left min-w-[600px]">
                      <thead className={cn("text-xs uppercase", isDark ? "text-zinc-400 bg-black/20" : "bg-slate-100 text-slate-900 border-b border-slate-300 font-bold")}>
                        <tr>
                          <th className="px-6 py-4 rounded-tl-xl font-bold">Volume Name</th>
                          <th className="px-6 py-4 font-bold">Created Date</th>
                          <th className="px-6 py-4 font-bold">Size</th>
                          <th className="px-6 py-4 rounded-tr-xl text-right font-bold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {backupsLoading ? (
                          <tr>
                            <td colSpan={4} className={cn("px-6 py-8 text-center", isDark ? "text-zinc-500" : "text-slate-700 font-medium")}>Loading backups...</td>
                          </tr>
                        ) : backups.length === 0 ? (
                          <tr>
                            <td colSpan={4} className={cn("px-6 py-8 text-center", isDark ? "text-zinc-500" : "text-slate-700 font-medium")}>No backups found.</td>
                          </tr>
                        ) : (
                          backups.map((backup: any) => (
                            <tr key={backup.volume} className={cn("border-b transition-colors", isDark ? "border-slate-800/60 hover:bg-slate-800/40" : "border-slate-200 hover:bg-slate-50")}>
                              <td className={cn(isDark ? "text-zinc-300" : "text-slate-950 font-bold", "px-6 py-4 font-mono text-xs")}>
                                {backup.volume.split('/').pop()}
                              </td>
                              <td className={cn(isDark ? "text-zinc-400" : "text-slate-700 font-medium", "px-6 py-4")}>
                                {new Date(backup.ctime * 1000).toLocaleString()}
                              </td>
                              <td className={cn("px-6 py-4 font-mono text-xs font-bold", isDark ? "text-cyan-400" : "text-cyan-950")}>
                                {formatBytesPerSecond(backup.size).replace('/s', '')}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => { setSelectedBackup(backup.volume); setShowRestoreModal(true); }}
                                    className={cn("px-3 py-1.5 rounded-lg text-xs font-bold border transition-all", isDark ? "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/20" : "bg-cyan-100 hover:bg-cyan-200 text-cyan-950 border-cyan-300")}
                                  >
                                    Restore
                                  </button>
                                  <button
                                    onClick={() => { setSelectedBackup(backup.volume); setShowDeleteModal(true); }}
                                    className={cn("px-3 py-1.5 rounded-lg text-xs font-bold border transition-all", isDark ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20" : "bg-red-100 hover:bg-red-200 text-red-950 border-red-300")}
                                  >
                                    Delete
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
              </div>
            )}

            {/* SNAPSHOTS TAB */}
            {activeTab === "snapshots" && (
              <div className="animate-in fade-in duration-500 space-y-6">
                <div className={cn("border rounded-2xl p-6 shadow-lg", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-300 shadow-sm")}>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div className={cn("text-lg font-bold flex flex-wrap items-center gap-2", isDark ? "text-white" : "text-slate-950")}>
                      <Copy className={cn("w-5 h-5 shrink-0", isDark ? "text-cyan-400" : "text-cyan-700")} />
                      <span>VM Snapshots</span>
                      <button 
                        onClick={() => fetchSnapshots(true)}
                        disabled={snapshotsLoading}
                        className={cn("group p-1.5 sm:p-2 rounded-lg transition-all shrink-0 border ml-1", 
                          snapshotsLoading ? "opacity-50" : "",
                          isDark ? "bg-white/5 border-white/10 hover:bg-white/10 text-zinc-400" : "bg-slate-50 border-slate-300 hover:bg-slate-100 text-slate-800")}
                        title="Refresh Snapshots"
                      >
                        <RefreshCw className={cn("w-4 h-4 transition-transform duration-700 ease-in-out group-hover:rotate-180", snapshotsLoading && "animate-spin")} />
                      </button>
                      {['snapshot', 'rollback', 'snapshot-delete'].includes(status?.lock) && (
                        <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold border animate-pulse flex items-center gap-1.5 whitespace-nowrap mt-2 sm:mt-0", isDark ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-orange-100 text-orange-950 border-orange-300")}>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" /> 
                          {status?.lock === 'rollback' ? 'Rolling back...' : status?.lock === 'snapshot-delete' ? 'Deleting...' : 'Processing Snapshot...'}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setShowSnapshotModal(true)}
                      disabled={snapshots.length >= 2 || ['snapshot', 'rollback', 'snapshot-delete'].includes(status?.lock)}
                      className="px-4 py-2.5 md:py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 w-full md:w-auto shrink-0 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 disabled:opacity-50 shadow-sm"
                    >
                      <Plus className="w-4 h-4 shrink-0" />
                      Take Snapshot
                    </button>
                  </div>

                  <div className="w-full overflow-x-auto pb-4">
                    <table className="w-full text-left text-sm min-w-[700px]">
                      <thead>
                        <tr className={cn("border-b", isDark ? "border-white/10 text-zinc-400" : "bg-slate-100 border-slate-300 text-slate-900")}>
                          <th className="py-3 px-4 font-bold whitespace-nowrap">Name</th>
                          <th className="py-3 px-4 font-bold whitespace-nowrap">Description</th>
                          <th className="py-3 px-4 font-bold whitespace-nowrap">RAM State</th>
                          <th className="py-3 px-4 font-bold whitespace-nowrap">Time</th>
                          <th className="py-3 px-4 font-bold text-right whitespace-nowrap">Actions</th>
                        </tr>
                      </thead>
                      <tbody className={cn("divide-y", isDark ? "divide-white/5" : "divide-slate-200")}>
                        {snapshotsLoading ? (
                          <tr>
                            <td colSpan={5} className={cn("py-8 text-center", isDark ? "text-zinc-400" : "text-slate-700 font-medium")}>Loading snapshots...</td>
                          </tr>
                        ) : snapshots.length === 0 ? (
                          <tr>
                            <td colSpan={5} className={cn("py-8 text-center", isDark ? "text-zinc-500" : "text-slate-700 font-medium")}>No snapshots found. Max 2 snapshots allowed.</td>
                          </tr>
                        ) : (
                          snapshots.map((snap, i) => (
                            <tr key={i} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                              <td className={cn("py-4 px-4 font-bold", isDark ? "text-zinc-300" : "text-slate-950")}>{snap.name}</td>
                              <td className={cn("py-4 px-4 font-medium", isDark ? "text-zinc-400" : "text-slate-700")}>{snap.description || '-'}</td>
                              <td className="py-4 px-4">
                                {snap.vmstate ? (
                                  <span className={cn("px-2.5 py-1 text-xs font-bold rounded-full", isDark ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-emerald-100 text-emerald-950 border border-emerald-300")}>Yes</span>
                                ) : (
                                  <span className={cn("px-2.5 py-1 text-xs font-bold rounded-full", isDark ? "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20" : "bg-slate-100 text-slate-800 border border-slate-300")}>No</span>
                                )}
                              </td>
                              <td className={cn("py-4 px-4 font-medium", isDark ? "text-zinc-400" : "text-slate-700")}>
                                {snap.snaptime ? new Date(snap.snaptime * 1000).toLocaleString() : '-'}
                              </td>
                              <td className="py-4 px-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => setShowRollbackModal(snap.name)}
                                    disabled={snapshotActionLoading === snap.name || ['snapshot', 'rollback', 'snapshot-delete'].includes(status?.lock)}
                                    className={cn("px-3 py-1.5 rounded-lg transition-colors text-xs font-bold border disabled:opacity-50", isDark ? "bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border-cyan-500/20" : "bg-cyan-100 text-cyan-950 hover:bg-cyan-200 border-cyan-300")}
                                  >
                                    Rollback
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditSnapshotDesc(snap.description || "");
                                      setShowEditSnapshotModal(snap.name);
                                    }}
                                    disabled={snapshotActionLoading === snap.name || ['snapshot', 'rollback', 'snapshot-delete'].includes(status?.lock)}
                                    className={cn("px-3 py-1.5 rounded-lg transition-colors text-xs font-bold border disabled:opacity-50", isDark ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20" : "bg-emerald-100 text-emerald-950 hover:bg-emerald-200 border-emerald-300")}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => setShowDeleteSnapshotModal(snap.name)}
                                    disabled={snapshotActionLoading === snap.name || ['snapshot', 'rollback', 'snapshot-delete'].includes(status?.lock)}
                                    className={cn("px-3 py-1.5 rounded-lg transition-colors text-xs font-bold border disabled:opacity-50", isDark ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20" : "bg-red-100 text-red-950 hover:bg-red-200 border-red-300")}
                                  >
                                    Delete
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
              </div>
            )}

            {/* TASKS TAB */}
            {activeTab === "tasks" && (
              <div className="animate-in fade-in duration-500 space-y-6">
                <div className={cn("border rounded-2xl p-6 shadow-lg", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-300 shadow-sm")}>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h3 className={cn("text-lg font-bold flex items-center gap-2 whitespace-nowrap shrink-0", isDark ? "text-white" : "text-slate-950")}>
                      <Terminal className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-700")} />
                      Tasks and Logs
                    </h3>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <input
                        type="text"
                        placeholder="Search logs..."
                        value={taskFilter}
                        onChange={(e) => { setTaskFilter(e.target.value); setTaskPage(1); }}
                        className={cn("border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-cyan-500/50 flex-1 sm:w-48 transition-colors", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder:text-slate-500" : "bg-slate-50 border-slate-300 text-slate-950 font-medium placeholder:text-slate-400")}
                      />
                      <button
                        onClick={fetchTasks}
                        className={cn("group p-2 rounded-lg transition-colors shrink-0", isDark ? "bg-white/5 hover:bg-white/10 text-zinc-400" : "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300")}
                        title="Refresh Tasks"
                      >
                        <RefreshCw className="w-4 h-4 transition-transform duration-700 ease-in-out group-hover:rotate-180" />
                      </button>
                    </div>
                  </div>

                  {(() => {
                    const filteredTasks = tasks.filter(task =>
                      !taskFilter ||
                      task.type?.toLowerCase().includes(taskFilter.toLowerCase()) ||
                      task.status?.toLowerCase().includes(taskFilter.toLowerCase()) ||
                      task.upid?.toLowerCase().includes(taskFilter.toLowerCase())
                    );

                    return (
                      <div className="space-y-4">
                        {filteredTasks.length === 0 ? (
                          <div className={cn("text-center py-8 rounded-xl border font-medium", isDark ? "text-zinc-500 bg-white/5 border-white/10" : "text-slate-700 bg-slate-50 border-slate-300")}>
                            {tasks.length === 0 ? "No recent tasks found." : "No tasks match your search filter."}
                          </div>
                        ) : (
                          <>
                            {filteredTasks.slice((taskPage - 1) * 10, taskPage * 10).map((task: any) => (
                              <div key={task.upid}>
                                <div className={cn("p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all", isDark ? "bg-[#060b14] border-slate-800/80 hover:border-slate-700" : "bg-white border-slate-300 hover:border-cyan-500 shadow-xs")}>
                                  <div>
                                    <div className="flex items-center gap-2 mb-1.5">
                                      <span className={cn("font-mono text-[10px] sm:text-xs px-2 py-0.5 rounded truncate max-w-[200px] sm:max-w-xs", isDark ? "bg-black/40 text-zinc-400" : "bg-slate-100 text-slate-800 border border-slate-300 font-bold")}>{task.upid}</span>
                                      <span className={cn(
                                        "px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold tracking-wide uppercase",
                                        task.status === "OK" ? (isDark ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "bg-cyan-100 text-cyan-950 border border-cyan-300") :
                                          task.status ? (isDark ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-red-100 text-red-950 border border-red-300") :
                                            (isDark ? "bg-cyan-500/10 text-blue-400 border border-blue-500/20 animate-pulse" : "bg-cyan-100 text-cyan-950 border border-cyan-300 animate-pulse")
                                      )}>
                                        {task.status || "RUNNING"}
                                      </span>
                                    </div>
                                    <p className={cn("text-sm font-bold capitalize flex items-center gap-2", isDark ? "text-white" : "text-slate-950")}>
                                      {task.type}
                                      {!task.status && <span className="flex h-2 w-2 rounded-full bg-cyan-500"></span>}
                                    </p>
                                  </div>
                                  <div className="text-left md:text-right shrink-0">
                                    <div className={cn("text-xs font-medium", isDark ? "text-zinc-400" : "text-slate-700")}>Started: {new Date(task.starttime * 1000).toLocaleString()}</div>
                                    {task.endtime && (
                                      <div className={cn("text-xs mt-1 font-mono font-medium", isDark ? "text-zinc-400" : "text-slate-700")}>
                                        Duration: {task.endtime - task.starttime}s
                                      </div>
                                    )}
                                    <button
                                      onClick={() => setExpandedTaskUpid(expandedTaskUpid === task.upid ? null : task.upid)}
                                      className={cn("mt-2 text-xs underline font-bold transition-colors", isDark ? "text-cyan-400 hover:text-cyan-300" : "text-cyan-800 hover:text-cyan-950")}
                                    >
                                      {expandedTaskUpid === task.upid ? "Hide Log" : "View Log"}
                                    </button>
                                  </div>
                                </div>
                                {/* Log Viewer Expandable */}
                                {expandedTaskUpid === task.upid && (
                                  <div className={cn("mt-2 p-4 border rounded-xl animate-in fade-in slide-in-from-top-2", isDark ? "bg-[#040810] border-slate-800" : "bg-slate-50 border-slate-300")}>
                                    {/* Progress Bar (if vzdump or restore) */}
                                    {(() => {
                                      const logStr = taskLog.map(l => l.t).join('\n');
                                      let progress = 0;
                                      if (task.type === "vzdump") {
                                        const match = logStr.match(/(\d+)%/g);
                                        if (match && match.length > 0) {
                                          progress = parseInt(match[match.length - 1].replace('%', ''));
                                        }
                                      } else if (task.type === "qemu" && logStr.includes("restore")) {
                                        const match = logStr.match(/progress 1.* (\d+)%/g) || logStr.match(/(\d+)%/g);
                                        if (match && match.length > 0) {
                                          progress = parseInt(match[match.length - 1].replace('%', ''));
                                        }
                                      }

                                      if (progress > 0 && !task.status) {
                                        return (
                                          <div className="mb-4">
                                            <div className="flex justify-between items-center mb-1.5">
                                              <div className={cn("flex items-center gap-2 text-xs font-bold", isDark ? "text-zinc-400" : "text-slate-800")}>
                                                <Activity className="w-3.5 h-3.5 text-cyan-500" />
                                                Task Progress
                                              </div>
                                              <div className="flex items-center gap-3">
                                                <span className={cn("text-xs font-bold", isDark ? "text-cyan-400" : "text-cyan-950")}>{progress}%</span>
                                                <button onClick={() => fetchExpandedLog(true)} className={cn("p-1 rounded", isDark ? "hover:bg-white/10 text-zinc-400" : "hover:bg-slate-200 text-slate-700")} title="Refresh Log">
                                                  <RefreshCw className={cn("w-3.5 h-3.5", taskLogLoading && "animate-spin")} />
                                                </button>
                                              </div>
                                            </div>
                                            <div className="w-full bg-slate-200 dark:bg-white/5 rounded-full h-1.5 overflow-hidden">
                                              <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                            </div>
                                          </div>
                                        );
                                      }
                                      return (
                                        <div className="flex justify-end mb-2">
                                          <button onClick={() => fetchExpandedLog(true)} className={cn("px-2.5 py-1 rounded flex items-center gap-2 text-xs font-semibold", isDark ? "hover:bg-white/10 text-zinc-400" : "hover:bg-slate-200 text-slate-800 border border-slate-300 bg-white")} title="Refresh Log">
                                            <RefreshCw className={cn("w-3 h-3", taskLogLoading && "animate-spin")} />
                                            Refresh Log
                                          </button>
                                        </div>
                                      );
                                    })()}

                                    <div ref={logContainerRef} className={cn(isDark ? "text-slate-300 bg-[#020409] border border-slate-800/80" : "text-slate-900 bg-white border border-slate-300", "rounded-lg p-3 overflow-y-auto max-h-64 font-mono text-xs scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent")}>
                                      {taskLogLoading && taskLog.length === 0 ? (
                                        <div className={cn("flex items-center gap-2", isDark ? "text-zinc-500" : "text-slate-700 font-medium")}>
                                          <RefreshCw className="w-3 h-3 animate-spin" />
                                          Loading log...
                                        </div>
                                      ) : taskLog.length === 0 ? (
                                        <span className={cn(isDark ? "text-zinc-500" : "text-slate-700 font-medium")}>No log output yet.</span>
                                      ) : (
                                        taskLog.map((line, i) => (
                                          <div key={i} className="whitespace-pre-wrap">{line.t}</div>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}

                            {/* Pagination Controls */}
                            {filteredTasks.length > 10 && (
                              <div className={cn("flex items-center justify-between pt-4 border-t", isDark ? "border-white/5" : "border-slate-300")}>
                                <span className={cn("text-xs font-medium", isDark ? "text-zinc-400" : "text-slate-700")}>
                                  Showing {(taskPage - 1) * 10 + 1} to {Math.min(taskPage * 10, filteredTasks.length)} of {filteredTasks.length}
                                </span>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setTaskPage(Math.max(1, taskPage - 1))}
                                    disabled={taskPage === 1}
                                    className={cn("px-3 py-1 rounded-lg text-xs font-bold disabled:opacity-50 transition-colors", isDark ? "bg-white/5 hover:bg-white/10 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300")}
                                  >
                                    Previous
                                  </button>
                                  <button
                                    onClick={() => setTaskPage(taskPage + 1)}
                                    disabled={taskPage * 10 >= filteredTasks.length}
                                    className={cn("px-3 py-1 rounded-lg text-xs font-bold disabled:opacity-50 transition-colors", isDark ? "bg-white/5 hover:bg-white/10 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300")}
                                  >
                                    Next
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ALERTS TAB */}
            {activeTab === "alerts" && (
              <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
                <div className={cn("border rounded-2xl p-6 shadow-lg", isDark ? "bg-[#0b1322] border-slate-800/80 shadow-md" : "bg-white border-slate-300 shadow-sm")}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
                      <AlertTriangle className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-700")} />
                    </div>
                    <div>
                      <h3 className={cn("font-bold text-lg", isDark ? "text-white" : "text-slate-950")}>Resource Alerts (CloudWatch-like)</h3>
                      <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-700 font-medium")}>Receive email notifications when resource usage exceeds the defined threshold. Checks are performed every 5 minutes.</p>
                    </div>
                  </div>

                  {alertsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <RefreshCw className="w-6 h-6 text-cyan-500 animate-spin" />
                    </div>
                  ) : (
                    <div className="mt-8 space-y-8">
                      {alertRules.map((rule, index) => (
                        <div key={rule.metric} className={cn("border rounded-xl p-5 relative overflow-hidden transition-all", isDark ? "bg-white/5 border-white/5 hover:border-cyan-500/30" : "bg-slate-50 border-slate-300 hover:border-cyan-500 shadow-xs")}>
                          <div className="flex flex-col sm:flex-row gap-6 relative z-10">
                            {/* Toggle & Title */}
                            <div className="sm:w-1/4 flex flex-col justify-center">
                              <div className="flex items-center gap-3">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={rule.isEnabled}
                                    onChange={(e) => {
                                      const newRules = [...alertRules];
                                      newRules[index].isEnabled = e.target.checked;
                                      setAlertRules(newRules);
                                    }}
                                  />
                                  <div className="w-11 h-6 bg-slate-300 dark:bg-black/40 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                                </label>
                                <div>
                                  <h4 className={cn("font-bold", isDark ? "text-white" : "text-slate-950")}>{rule.metric}</h4>
                                  <p className={cn("text-xs font-semibold", isDark ? "text-zinc-400" : "text-slate-700")}>{rule.isEnabled ? "Monitoring Active" : "Disabled"}</p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Sliders & Inputs */}
                            <div className={cn("sm:w-3/4 space-y-5 transition-opacity duration-300", rule.isEnabled ? "opacity-100" : "opacity-40 pointer-events-none")}>
                              {/* Threshold Slider */}
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <label className={cn("text-sm font-bold", isDark ? "text-zinc-300" : "text-slate-900")}>Alert Threshold (%)</label>
                                  <span className={cn("font-bold px-2 py-0.5 rounded text-sm", isDark ? "text-cyan-400 bg-cyan-500/10" : "text-cyan-950 bg-cyan-100 border border-cyan-300")}>{rule.threshold}%</span>
                                </div>
                                <input 
                                  type="range" 
                                  min="1" max="100" 
                                  value={rule.threshold} 
                                  onChange={(e) => {
                                    const newRules = [...alertRules];
                                    newRules[index].threshold = parseInt(e.target.value);
                                    setAlertRules(newRules);
                                  }}
                                  className={cn("w-full h-2 rounded-lg appearance-none cursor-pointer", isDark ? "accent-cyan-500 bg-black/40" : "accent-cyan-600 bg-slate-200")}
                                />
                                <div className={cn("flex justify-between text-xs font-mono font-bold", isDark ? "text-zinc-400" : "text-slate-700")}>
                                  <span>1%</span>
                                  <span>100%</span>
                                </div>
                              </div>

                              {/* Emails Input */}
                              <div className="space-y-2">
                                <label className={cn("text-sm font-bold", isDark ? "text-zinc-300" : "text-slate-900")}>Notification Emails</label>
                                <input 
                                  type="text" 
                                  placeholder="e.g. ops@company.com, admin@example.com"
                                  value={rule.notifyEmails}
                                  onChange={(e) => {
                                    const newRules = [...alertRules];
                                    newRules[index].notifyEmails = e.target.value;
                                    setAlertRules(newRules);
                                  }}
                                  className={cn("w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition-colors", isDark ? "bg-[#060b14] border border-slate-800 text-white placeholder:text-slate-500" : "bg-white border border-slate-300 text-slate-950 font-medium placeholder:text-slate-400")}
                                />
                                <p className={cn("text-xs font-medium", isDark ? "text-zinc-400" : "text-slate-700")}>Separate multiple emails with commas. Leave blank to use your account email.</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className={cn("pt-6 border-t flex justify-end", isDark ? "border-white/10" : "border-slate-300")}>
                        <button
                          onClick={handleSaveAlerts}
                          disabled={isSavingAlerts}
                          className="px-5 py-2.5 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 text-slate-950 text-sm"
                        >
                          {isSavingAlerts ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                          {isSavingAlerts ? "Saving..." : "Save Configuration"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </>
      )}

      {/* Snapshot Modal */}
      {showSnapshotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
          <div className={cn("relative w-full max-w-lg rounded-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200 shadow-xl", isDark ? "bg-[#0b1322] border border-slate-800" : "bg-white border border-slate-300")}>
            <div className="flex justify-between items-center mb-5">
              <h3 className={cn("text-xl font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-950")}>
                <Copy className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-700")} />
                Take Snapshot
              </h3>
              <button onClick={() => setShowSnapshotModal(false)} className={cn("p-1.5 rounded-lg transition-colors", isDark ? "text-zinc-400 hover:text-white hover:bg-white/10" : "text-slate-400 hover:text-slate-900 hover:bg-slate-100")}>
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={cn("block text-sm font-bold mb-1.5", isDark ? "text-zinc-300" : "text-slate-900")}>Snapshot Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={snapshotName}
                  onChange={(e) => setSnapshotName(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                  placeholder="e.g. beforeupdate (no spaces)"
                  className={cn("w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2", 
                    isDark ? "bg-[#0c1b2b] border-white/10 text-white placeholder-zinc-500 focus:ring-cyan-500/30" : "bg-white border-slate-300 text-slate-950 font-medium placeholder-slate-400 focus:ring-cyan-500 focus:border-cyan-500")}
                  disabled={isSnapshotting}
                />
                <p className={cn("text-xs mt-1.5 font-medium", isDark ? "text-zinc-400" : "text-slate-700")}>Only alphanumeric characters allowed.</p>
              </div>

              <div>
                <label className={cn("block text-sm font-bold mb-1.5", isDark ? "text-zinc-300" : "text-slate-900")}>Description (Optional)</label>
                <textarea
                  value={snapshotDesc}
                  onChange={(e) => setSnapshotDesc(e.target.value)}
                  placeholder="Describe this snapshot..."
                  className={cn("w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 resize-none h-20", 
                    isDark ? "bg-[#0c1b2b] border-white/10 text-white placeholder-zinc-500 focus:ring-cyan-500/30" : "bg-white border-slate-300 text-slate-950 font-medium placeholder-slate-400 focus:ring-cyan-500 focus:border-cyan-500")}
                  disabled={isSnapshotting}
                ></textarea>
              </div>

              <label className={cn("flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-colors", 
                isDark ? "bg-white/5 border-white/5 hover:border-cyan-500/50" : "bg-slate-50 border-slate-300 hover:border-cyan-400"
              )}>
                <div className="relative flex items-center justify-center shrink-0">
                  <input
                    type="checkbox"
                    checked={snapshotIncludeRam}
                    onChange={(e) => setSnapshotIncludeRam(e.target.checked)}
                    className={cn("w-5 h-5 rounded-lg border cursor-pointer appearance-none transition-all", 
                      isDark 
                        ? "border-white/20 bg-white/5 focus:ring-cyan-500/30 checked:bg-cyan-500 checked:border-cyan-500" 
                        : "border-slate-300 bg-white focus:ring-cyan-500/30 checked:bg-cyan-600 checked:border-cyan-600"
                    )}
                    disabled={isSnapshotting}
                  />
                  <CheckCircle className={cn("absolute w-3.5 h-3.5 text-white pointer-events-none transition-transform duration-200", snapshotIncludeRam ? "scale-100 opacity-100" : "scale-50 opacity-0")} />
                </div>
                <div className="flex flex-col">
                  <span className={cn("text-sm font-bold", isDark ? "text-zinc-200" : "text-slate-950")}>Include RAM</span>
                  <span className={cn("text-xs font-medium", isDark ? "text-zinc-400" : "text-slate-700")}>Saves the active memory state (takes longer)</span>
                </div>
              </label>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowSnapshotModal(false)}
                  disabled={isSnapshotting}
                  className={cn("flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm border", isDark ? "bg-white/5 hover:bg-white/10 text-white border-white/10" : "bg-white hover:bg-slate-100 text-slate-800 border-slate-300")}
                >
                  Cancel
                </button>
                <button
                  onClick={takeSnapshot}
                  disabled={isSnapshotting || !snapshotName}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold tracking-wide transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950"
                >
                  {isSnapshotting ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Processing...</>
                  ) : (
                    "Create Snapshot"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Snapshot Modal */}
      {showEditSnapshotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
          <div className={cn("relative w-full max-w-lg rounded-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200 shadow-xl", isDark ? "bg-[#0b1322] border border-slate-800" : "bg-white border border-slate-300")}>
            <div className="flex justify-between items-center mb-5">
              <h3 className={cn("text-xl font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-950")}>
                <Settings2 className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-700")} />
                Edit Snapshot: {showEditSnapshotModal}
              </h3>
              <button onClick={() => setShowEditSnapshotModal(null)} className={cn("p-1.5 rounded-lg transition-colors", isDark ? "text-zinc-400 hover:text-white hover:bg-white/10" : "text-slate-400 hover:text-slate-900 hover:bg-slate-100")}>
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={cn("block text-sm font-bold mb-1.5", isDark ? "text-zinc-300" : "text-slate-900")}>Description</label>
                <textarea
                  value={editSnapshotDesc}
                  onChange={(e) => setEditSnapshotDesc(e.target.value)}
                  placeholder="Describe this snapshot..."
                  className={cn("w-full px-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-1 resize-none h-20", 
                    isDark ? "bg-[#060b14] border-slate-800 text-white placeholder-slate-500 focus:border-cyan-500" : "bg-white border-slate-300 text-slate-950 font-medium placeholder-slate-400 focus:ring-cyan-500 focus:border-cyan-500")}
                  disabled={snapshotActionLoading === showEditSnapshotModal}
                ></textarea>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEditSnapshotModal(null)}
                  disabled={snapshotActionLoading === showEditSnapshotModal}
                  className={cn("flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm border", isDark ? "bg-white/5 hover:bg-white/10 text-white border-white/10" : "bg-white hover:bg-slate-100 text-slate-800 border-slate-300")}
                >
                  Cancel
                </button>
                <button
                  onClick={updateSnapshotDesc}
                  disabled={snapshotActionLoading === showEditSnapshotModal}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-bold tracking-wide transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950"
                >
                  {snapshotActionLoading === showEditSnapshotModal ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showReinstallModal}
        onClose={() => setShowReinstallModal(false)}
        onConfirm={executeReinstall}
        title="Reinstall Operating System"
        description={`This action will completely format the disk and rebuild the server using the "${selectedTemplate}" template. All existing data will be permanently destroyed.${selectedTemplate?.toLowerCase().includes("windows") || activeOsFamily?.toLowerCase().includes("windows") ? " The default user after reinstallation is Administrator." : " The default user after reinstallation is root."} Are you absolutely sure?`}
        confirmText="Rebuild"
        cancelText="Cancel"
        variant="danger"
        isLoading={reinstalling}
      />

      <ConfirmModal
        isOpen={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
        onConfirm={handleRestoreBackup}
        title="Restore Backup"
        description="Are you sure you want to restore this backup? This will overwrite your current server data and cannot be undone!"
        confirmText="Restore"
        cancelText="Cancel"
        variant="danger"
        isLoading={isRestoring}
      />

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteBackup}
        title="Delete Backup"
        description="Are you sure you want to delete this backup archive? This action cannot be undone and you will lose this backup forever."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      <ConfirmModal
        isOpen={showRollbackModal !== null}
        onClose={() => setShowRollbackModal(null)}
        onConfirm={rollbackSnapshot}
        title="Rollback Snapshot"
        description={`Are you sure you want to rollback to snapshot '${showRollbackModal}'? Current state will be lost.`}
        confirmText="Rollback"
        cancelText="Cancel"
        variant="danger"
        isLoading={snapshotActionLoading === showRollbackModal}
      />

      <ConfirmModal
        isOpen={showDeleteSnapshotModal !== null}
        onClose={() => setShowDeleteSnapshotModal(null)}
        onConfirm={deleteSnapshot}
        title="Delete Snapshot"
        description={`Are you sure you want to delete snapshot '${showDeleteSnapshotModal}'? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={snapshotActionLoading === showDeleteSnapshotModal}
      />

      <ConfirmModal
        isOpen={!!deleteDiskSlot}
        onClose={() => setDeleteDiskSlot(null)}
        onConfirm={confirmDeleteAddonDisk}
        title="Delete Add-on Disk"
        description={`WARNING: This action will permanently destroy the disk at slot ${deleteDiskSlot} and all data inside it. This cannot be undone. Are you absolutely sure?`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeletingDisk}
      />

      <ConfirmModal
        isOpen={showTerminateModal}
        onClose={() => setShowTerminateModal(false)}
        onConfirm={handleTerminateInstance}
        title="Delete VPS Instance"
        description="Are you absolutely sure you want to completely delete this VPS instance? All data will be permanently wiped from the server and IP addresses will be released. This action CANNOT be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isTerminating}
      />


      <ConfirmModal
        isOpen={showUnreserveModal}
        onClose={() => setShowUnreserveModal(false)}
        onConfirm={handleUnreserveIp}
        title="Unreserve IP Address"
        description={`Are you sure you want to release the IP address ${unreserveIpAddress}? Your hourly rate will be reduced accordingly.`}
        confirmText="Release IP"
        cancelText="Cancel"
        variant="danger"
        isLoading={isUnreserving}
      />
      <ConfirmModal
        isOpen={!!deletingRulePos}
        onClose={() => setDeletingRulePos(null)}
        onConfirm={handleDeleteFirewallRule}
        title="Delete Firewall Rule"
        description="Are you sure you want to delete this firewall rule? Traffic matching this rule will no longer be allowed."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeletingRule}
      />


      {showFirewallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
          <div className={cn("border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-300")}>
            <div className={cn("p-6 border-b flex items-center justify-between", isDark ? "border-white/5" : "border-slate-300")}>
              <h3 className={cn("text-xl font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-950")}>
                <ShieldCheck className="w-5 h-5 text-cyan-500" />
                {editingRule ? 'Edit Firewall Rule' : 'Add Firewall Rule'}
              </h3>
              <button
                onClick={() => setShowFirewallModal(false)}
                className={cn("p-2 rounded-lg transition-colors", isDark ? "text-zinc-400 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100")}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFirewallRule} className="p-6 space-y-4 overflow-y-auto">
              <div className="space-y-2">
                <label className={cn("text-sm font-bold", isDark ? "text-zinc-300" : "text-slate-900")}>Direction / Type</label>
                <Select
                  value={ruleType}
                  onChange={setRuleType}
                  options={[
                    { value: "in", label: "Inbound (Incoming Traffic)" },
                    { value: "out", label: "Outbound (Outgoing Traffic)" }
                  ]}
                  placeholder="Select Direction"
                  className={cn("w-full border rounded-xl px-4 py-3 text-sm transition-colors", isDark ? "bg-[#060b14] border-slate-800 text-white hover:border-cyan-500/50" : "bg-white border-slate-300 text-slate-950 font-medium hover:border-cyan-500")}
                />
              </div>

              <div className="space-y-2">
                <label className={cn("text-sm font-bold", isDark ? "text-zinc-300" : "text-slate-900")}>Protocol</label>
                <Select
                  value={ruleProto}
                  onChange={setRuleProto}
                  options={[
                    { value: "tcp", label: "TCP" },
                    { value: "udp", label: "UDP" },
                    { value: "icmp", label: "ICMP" },
                    { value: "", label: "ALL" }
                  ]}
                  placeholder="Select Protocol"
                  className={cn("w-full border rounded-xl px-4 py-3 text-sm transition-colors", isDark ? "bg-[#060b14] border-slate-800 text-white hover:border-cyan-500/50" : "bg-white border-slate-300 text-slate-950 font-medium hover:border-cyan-500")}
                />
              </div>

              <div className="space-y-2">
                <label className={cn("text-sm font-bold", isDark ? "text-zinc-300" : "text-slate-900")}>Port Range</label>
                <input
                  type="text"
                  value={rulePort}
                  onChange={(e) => setRulePort(e.target.value)}
                  placeholder="e.g. 22, 80, 443, 8000:9000 (leave blank for ALL)"
                  className={cn("w-full border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors", isDark ? "bg-[#060b14] border-slate-800 text-white focus:border-cyan-500" : "bg-white border-slate-300 text-slate-950 font-medium placeholder:text-slate-400 focus:border-cyan-500")}
                />
              </div>

              <div className="space-y-2">
                <label className={cn("text-sm font-bold", isDark ? "text-zinc-300" : "text-slate-900")}>Source IP / CIDR</label>
                <input
                  type="text"
                  value={ruleSource}
                  onChange={(e) => setRuleSource(e.target.value)}
                  placeholder="e.g. 192.168.1.1 or 10.0.0.0/24 (leave blank for 0.0.0.0/0)"
                  className={cn("w-full border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors", isDark ? "bg-[#060b14] border-slate-800 text-white focus:border-cyan-500" : "bg-white border-slate-300 text-slate-950 font-medium placeholder:text-slate-400 focus:border-cyan-500")}
                />
              </div>

              <div className="space-y-2">
                <label className={cn("text-sm font-bold", isDark ? "text-zinc-300" : "text-slate-900")}>Description</label>
                <input
                  type="text"
                  value={ruleComment}
                  onChange={(e) => setRuleComment(e.target.value)}
                  placeholder="e.g. Allow SSH from Home"
                  className={cn("w-full border rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors", isDark ? "bg-[#060b14] border-slate-800 text-white focus:border-cyan-500" : "bg-white border-slate-300 text-slate-950 font-medium placeholder:text-slate-400 focus:border-cyan-500")}
                />
              </div>

              <div className={cn("pt-4 flex items-center justify-end gap-3 border-t mt-6", isDark ? "border-white/5" : "border-slate-300")}>
                <button
                  type="button"
                  onClick={() => setShowFirewallModal(false)}
                  className={cn("px-4 py-2.5 rounded-lg text-sm font-bold border transition-colors", isDark ? "text-zinc-400 hover:text-white border-slate-800 hover:bg-white/5" : "text-slate-800 hover:text-slate-950 border-slate-300 hover:bg-slate-100")}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingRule}
                  className="px-5 py-2.5 rounded-lg text-sm font-bold bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 transition-colors flex items-center gap-2 text-slate-950 shadow-sm"
                >
                  {isSavingRule ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {isSavingRule ? 'Saving...' : 'Save Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}