"use client";

import { useUpdateEffect, useUrlNumber, useUrlString, useUrlTab } from "@/lib/useUrlTab";
import { useState, useEffect } from "react";
import { Plus, Server, HardDrive, Edit, Trash2, Cpu, MemoryStick, RefreshCw, Network, Search, Play, Square, RefreshCcw, Power, ShieldAlert, XCircle, AlertTriangle, DollarSign, Settings, CheckCircle, Save, FileText, Globe, X, ChevronLeft, ChevronRight, Terminal, Key, Loader2, GripVertical } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Reorder } from "framer-motion";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Select } from "@/components/ui/Select";

type VpsService = {
  id: number;
  userId: number;
  vmid: number | null;
  hostname: string;
  status: string;
  node: string;
  createdAt: string;
  hourlyRate?: number;
  accumulatedCost?: number;
  expiresAt?: string | null;
  kubernetesClusterId?: number | null;
  suspendReason?: string | null;
  osTemplate?: string;
  user: { name: string; email: string };
  assignedIps: { ipAddress: string; publicIp?: string | null }[];
  reservedIps?: { accumulatedCost?: number }[];
};

const getOsIconUrl = (name: string, isDark: boolean = false) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('ubuntu')) return 'https://cdn.simpleicons.org/ubuntu/E95420';
  if (lowerName.includes('debian')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/debian/debian-original.svg';
  if (lowerName.includes('centos')) return 'https://cdn.simpleicons.org/centos/3b82f6';
  if (lowerName.includes('almalinux')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/almalinux/almalinux-original.svg';
  if (lowerName.includes('rocky')) return 'https://cdn.simpleicons.org/rockylinux/10B981';
  if (lowerName.includes('windows')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/windows11/windows11-original.svg';
  if (lowerName.includes('alpine')) return 'https://www.vectorlogo.zone/logos/alpinelinux/alpinelinux-icon.svg';
  if (lowerName.includes('fedora')) return 'https://cdn.simpleicons.org/fedora/3b82f6';
  if (lowerName.includes('freebsd')) return 'https://cdn.simpleicons.org/freebsd/AB2B28';
  if (lowerName.includes('mikrotik') || lowerName.includes('chr')) {
    return 'https://cdn.worldvectorlogo.com/logos/mikrotik.svg';
  }
  return null;
}

export default function VpsManagementPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const fetchReservedIps = async () => {
    try {
      setLoadingReservedIps(true);
      const res = await fetch("/api/admin/vps/reserved-ips");
      if (res.ok) {
        const data = await res.json();
        setReservedIps(data);
      }
    } catch (error) {
      console.error("Failed to fetch reserved IPs:", error);
    } finally {
      setLoadingReservedIps(false);
    }
  };

  const fetchSettings = async () => {
    setLoadingSettings(true);
    try {
      const res = await fetch("/api/admin/vps/settings");
      const data = await res.json();
      if (!data.error) {
        setSettings(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingSettings(false);
      setInitialLoad(false);
    }
  };

  const fetchStorages = async () => {
    setSyncingStorages(true);
    try {
      const res = await fetch("/api/admin/vps/proxmox-sync");
      const data = await res.json();
      if (!data.error && data.storages) {
        setAvailableStorages(data.storages);
        toast.success("Storages synced successfully");
      } else {
        toast.error(data.error || "Failed to sync storages");
      }
    } catch (error) {
      toast.error("Failed to connect to Proxmox");
    } finally {
      setSyncingStorages(false);
    }
  };

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch("/api/admin/vps/templates");
      const data = await res.json();
      if (!data.error) {
        setTemplates(data);
        if (data.length > 0) {
          const firstFamily = data[0].name.split('-')[0];
          setSelectedAdminOsFamily(firstFamily);
          setSelectedAdminTemplate(data[0].id);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingTemplates(false);
      setInitialLoad(false);
    }
  };

  const fetchPools = async () => {
    setLoadingPools(true);
    try {
      const res = await fetch("/api/admin/vps/ippools");
      const data = await res.json();
      if (!data.error) setPools(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingPools(false);
      setInitialLoad(false);
    }
  };

  const fetchPricing = async () => {
    setLoadingPricing(true);
    try {
      const res = await fetch("/api/admin/vps/pricing");
      const data = await res.json();
      if (!data.error) setPricing(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingPricing(false);
      setInitialLoad(false);
    }
  };

  const fetchPlans = async () => {
    setLoadingPlans(true);
    try {
      const res = await fetch("/api/admin/vps/plans");
      const data = await res.json();
      if (Array.isArray(data)) setPlans(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingPlans(false);
      setInitialLoad(false);
    }
  };

  const [activeTab, setActiveTab] = useUrlTab<string>("settings");
  const [initialLoad, setInitialLoad] = useState(true);

  // Settings State
  const [settings, setSettings] = useState<any>({});
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [availableStorages, setAvailableStorages] = useState<any[]>([]);
  const [syncingStorages, setSyncingStorages] = useState(false);

  // Templates State
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [syncingTemplates, setSyncingTemplates] = useState(false);
  const [templateCurrentPage, setTemplateCurrentPage] = useUrlNumber("templateCurrentPage", 1);
  const templatesPerPage = 9;
  const [selectedAdminOsFamily, setSelectedAdminOsFamily] = useState<string | null>(null);
  const [selectedAdminTemplate, setSelectedAdminTemplate] = useState<number | null>(null);

  // IP Pools State
  const [pools, setPools] = useState<any[]>([]);
  const [loadingPools, setLoadingPools] = useState(false);
  const [showAddPool, setShowAddPool] = useState(false);
  const [newPool, setNewPool] = useState({ network: "", gateway: "", startIp: "", endIp: "", version: 4, type: "PUBLIC" });
  const [selectedPools, setSelectedPools] = useState<number[]>([]);
  const [showDeletePoolModal, setShowDeletePoolModal] = useState<number | null>(null);
  const [showBulkDeletePoolModal, setShowBulkDeletePoolModal] = useState<number[]>([]);
  const [poolCurrentPage, setPoolCurrentPage] = useUrlNumber("poolCurrentPage", 1);
  const poolsPerPage = 10;

  // Pricing State
  const [pricing, setPricing] = useState<any[]>([]);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);

  // Fixed Plans State
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [showDeletePlanModal, setShowDeletePlanModal] = useState<number | null>(null);
  const [selectedPlans, setSelectedPlans] = useState<number[]>([]);
  const [showBulkDeletePlanModal, setShowBulkDeletePlanModal] = useState<number[]>([]);
  const [newPlan, setNewPlan] = useState({ id: 0, name: "", cpuCores: 1, ramGb: 1, diskGb: 20, diskType: "HDD", monthlyPrice: 0, quarterlyPrice: 0, semiAnnuallyPrice: 0, annuallyPrice: 0, isReseller: false, isActive: true });
  const [planCurrentPage, setPlanCurrentPage] = useUrlNumber("planCurrentPage", 1);
  const [planFilterDiskType, setPlanFilterDiskType] = useUrlString<"HDD" | "SSD">("planFilterDiskType", "HDD", ["HDD", "SSD"] as const);
  const plansPerPage = 6;

  const filteredPlans = plans.filter(p => (p.diskType || "HDD") === planFilterDiskType);

  // Services State
  const [vpsServices, setVpsServices] = useState<VpsService[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [consoleLoading, setConsoleLoading] = useState<number | null>(null);
  const [showSuspendModal, setShowSuspendModal] = useState<VpsService | null>(null);
  const [showTerminateModal, setShowTerminateModal] = useState<VpsService | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [showResetPasswordModal, setShowResetPasswordModal] = useState<VpsService | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showIpModal, setShowIpModal] = useState<any>(null);
  const [assignedIps, setAssignedIps] = useState<any[]>([]);
  const [availableIps, setAvailableIps] = useState<any[]>([]);
  const [editingPublicIpId, setEditingPublicIpId] = useState<number | null>(null);
  const [editingPublicIpValue, setEditingPublicIpValue] = useState("");
  const [newIpAddress, setNewIpAddress] = useState("");
  const [ipLoading, setIpLoading] = useState(false);
  const [ipFilter, setIpFilter] = useUrlString<string>("ipFilter", "");
  const [ipVersionFilter, setIpVersionFilter] = useUrlString<"all" | "ipv4" | "ipv6">("ipVersionFilter", "all", ["all", "ipv4", "ipv6"] as const);
  const [removeIpConfirm, setRemoveIpConfirm] = useState<number | null>(null);

  // Reserved IPs State
  const [reservedIps, setReservedIps] = useState<any[]>([]);
  const [loadingReservedIps, setLoadingReservedIps] = useState(false);
  const [editingReservedIpId, setEditingReservedIpId] = useState<number | null>(null);
  const [editingReservedIpValue, setEditingReservedIpValue] = useState("");
  const [reservedIpActionLoading, setReservedIpActionLoading] = useState<number | null>(null);
  const [reservedIpCurrentPage, setReservedIpCurrentPage] = useUrlNumber("reservedIpCurrentPage", 1);
  const reservedIpsPerPage = 10;
  const [searchQuery, setSearchQuery] = useUrlString<string>("searchQuery", "");
  const [selectedVps, setSelectedVps] = useState<number[]>([]);
  const [showBulkTerminateModal, setShowBulkTerminateModal] = useState<number[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [vpsCurrentPage, setVpsCurrentPage] = useUrlNumber("vpsCurrentPage", 1);
  const vpsPerPage = 10;

  // Reset page when tab or search changes
  useUpdateEffect(() => {
    setVpsCurrentPage(1);
  }, [activeTab, searchQuery]);

  const toggleSelectAllVps = () => {
    const filtered = vpsServices.filter(v => v.hostname.includes(searchQuery) || v.user.email.includes(searchQuery));
    if (selectedVps.length === filtered.length && filtered.length > 0) {
      setSelectedVps([]);
    } else {
      setSelectedVps(filtered.map(v => v.id));
    }
  };

  const toggleSelectVps = (id: number) => {
    if (selectedVps.includes(id)) {
      setSelectedVps(selectedVps.filter(vId => vId !== id));
    } else {
      setSelectedVps([...selectedVps, id]);
    }
  };

  const handleBulkTerminate = async () => {
    try {
      setBulkActionLoading(true);
      let successCount = 0;
      for (const id of showBulkTerminateModal) {
        const res = await fetch("/api/admin/vps/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, action: "terminate", reason: "Bulk termination by admin" })
        });
        if (res.ok) successCount++;
      }
      toast.success(`Successfully terminated ${successCount} VPS`);
      setShowBulkTerminateModal([]);
      setSelectedVps([]);
      fetchVpsServices();
    } catch (error) {
      toast.error("An error occurred during bulk termination");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const fetchVpsServices = async (query: string = searchQuery) => {
    try {
      setLoadingServices(true);
      const url = query ? `/api/admin/vps/services?q=${encodeURIComponent(query)}` : "/api/admin/vps/services";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setVpsServices(data);
      }
    } catch (error) {
      console.error("Failed to fetch services:", error);
    } finally {
      setLoadingServices(false);
      setInitialLoad(false);
    }
  };


  const handleSaveReservedIp = async (id: number, publicIp: string) => {
    try {
      setReservedIpActionLoading(id);
      const res = await fetch(`/api/admin/vps/reserved-ips`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, publicIp }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Reserved IP updated successfully");
        setEditingReservedIpId(null);
        setEditingReservedIpValue("");
        fetchReservedIps();
      } else {
        toast.error(data.error || "Failed to update Reserved IP");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setReservedIpActionLoading(null);
    }
  };

  const handleDeleteReservedIp = async (id: number) => {
    if (!confirm("Are you sure you want to delete this reserved IP?")) return;
    try {
      setReservedIpActionLoading(id);
      const res = await fetch(`/api/admin/vps/reserved-ips?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Reserved IP deleted successfully");
        fetchReservedIps();
      } else {
        toast.error(data.error || "Failed to delete Reserved IP");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setReservedIpActionLoading(null);
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

  const handleVpsAction = async (vpsId: number, action: string, reason?: string) => {
    try {
      setActionLoading(vpsId);
      const res = await fetch("/api/admin/vps/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: vpsId, action, reason })
      });
      if (res.ok) {
        toast.success(`Action ${action} completed successfully`);
        if (action === "suspend") setShowSuspendModal(null);
        if (action === "terminate") setShowTerminateModal(null);
        fetchVpsServices();
      } else {
        const data = await res.json();
        toast.error(data.error || "Action failed");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async (vpsId: number, password: string) => {
    try {
      setActionLoading(vpsId);
      const res = await fetch("/api/admin/vps/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: vpsId, action: "reset_password", password })
      });
      if (res.ok) {
        toast.success(`Password reset successfully`);
        setShowResetPasswordModal(null);
        setNewPassword("");
        setConfirmPassword("");
        fetchVpsServices();
      } else {
        const data = await res.json();
        toast.error(data.error || "Action failed");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    if (activeTab === "settings") fetchSettings();
    if (activeTab === "plans") fetchPlans();
    if (activeTab === "templates") fetchTemplates();
    if (activeTab === "pools") fetchPools();
    if (activeTab === "pricing") fetchPricing();
    if (activeTab === "reserved-ips") fetchReservedIps();
  }, [activeTab]);

  // Handle VPS fetching with debounce for Elasticsearch
  useEffect(() => {
    const handler = setTimeout(() => {
      if (activeTab === "services" || activeTab === "k3s") {
        fetchVpsServices(searchQuery);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [activeTab, searchQuery]);



  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/vps/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (res.ok) {
        setSettings(data);
        toast.success("Proxmox settings saved successfully");
      } else {
        toast.error(data.error || "Failed to save settings");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setSavingSettings(false);
    }
  };


  const syncTemplates = async () => {
    setSyncingTemplates(true);
    try {
      const res = await fetch("/api/admin/vps/templates", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Synced ${data.count} templates from Proxmox`);
        setTemplates(data.templates);
      } else {
        toast.error(data.error || "Failed to sync templates");
      }
    } catch (error) {
      toast.error("An error occurred during sync");
    } finally {
      setSyncingTemplates(false);
    }
  };


  const handleAddPool = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/vps/ippools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPool),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("IP Pool added successfully");
        setShowAddPool(false);
        setNewPool({ network: "", gateway: "", startIp: "", endIp: "", version: 4, type: "PUBLIC" });
        fetchPools();
      } else {
        toast.error(data.error || "Failed to add IP Pool");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleDeletePool = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/vps/ippools?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("IP Pool deleted");
        setShowDeletePoolModal(null);
        fetchPools();
      } else {
        toast.error("Failed to delete IP Pool");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const toggleSelectAllPools = () => {
    if (selectedPools.length === pools.length && pools.length > 0) {
      setSelectedPools([]);
    } else {
      setSelectedPools(pools.map(p => p.id));
    }
  };

  const toggleSelectPool = (id: number) => {
    if (selectedPools.includes(id)) {
      setSelectedPools(selectedPools.filter(pId => pId !== id));
    } else {
      setSelectedPools([...selectedPools, id]);
    }
  };

  const handleBulkDeletePools = async () => {
    try {
      let successCount = 0;
      for (const id of showBulkDeletePoolModal) {
        const res = await fetch(`/api/admin/vps/ippools?id=${id}`, { method: "DELETE" });
        if (res.ok) successCount++;
      }
      toast.success(`Deleted ${successCount} IP pools`);
      setSelectedPools([]);
      setShowBulkDeletePoolModal([]);
      fetchPools();
    } catch (error) {
      toast.error("An error occurred during bulk deletion");
    }
  };


  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPricing(true);
    try {
      const res = await fetch("/api/admin/vps/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: pricing }),
      });
      if (res.ok) {
        toast.success("Pricing saved successfully");
      } else {
        toast.error("Failed to save pricing");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setSavingPricing(false);
    }
  };


  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/vps/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPlan),
      });
      if (res.ok) {
        toast.success(newPlan.id ? "Plan updated" : "Plan added");
        setShowAddPlan(false);
        fetchPlans();
      } else {
        toast.error("Failed to save plan");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleDeletePlan = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/vps/plans?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Plan deleted");
        setShowDeletePlanModal(null);
        fetchPlans();
      } else {
        toast.error("Failed to delete plan");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const toggleSelectAllPlans = () => {
    if (selectedPlans.length === plans.length && plans.length > 0) {
      setSelectedPlans([]);
    } else {
      setSelectedPlans(plans.map(p => p.id));
    }
  };

  const toggleSelectPlan = (id: number) => {
    if (selectedPlans.includes(id)) {
      setSelectedPlans(selectedPlans.filter(pId => pId !== id));
    } else {
      setSelectedPlans([...selectedPlans, id]);
    }
  };

  const handleBulkDeletePlans = async () => {
    try {
      let successCount = 0;
      for (const id of showBulkDeletePlanModal) {
        const res = await fetch(`/api/admin/vps/plans?id=${id}`, { method: "DELETE" });
        if (res.ok) successCount++;
      }
      toast.success(`Deleted ${successCount} plans`);
      setSelectedPlans([]);
      setShowBulkDeletePlanModal([]);
      fetchPlans();
    } catch (error) {
      toast.error("An error occurred during bulk deletion");
    }
  };

  const handleReorderPlans = async (newOrderSlice: any[]) => {
    const newFiltered = [...filteredPlans];
    const startIndex = (planCurrentPage - 1) * plansPerPage;
    newFiltered.splice(startIndex, newOrderSlice.length, ...newOrderSlice);

    const otherPlans = plans.filter(p => (p.diskType || "HDD") !== planFilterDiskType);
    setPlans([...otherPlans, ...newFiltered]);

    try {
      const res = await fetch('/api/admin/vps/plans/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: newFiltered.map(p => p.id) })
      });
      if (!res.ok) toast.error('Failed to save plan order');
    } catch (e) {
      toast.error('Failed to save plan order');
    }
  };

  const fetchAssignedIps = async (vpsId: number) => {
    try {
      setIpLoading(true);
      const res = await fetch(`/api/admin/vps/${vpsId}/ips`);
      if (res.ok) {
        const data = await res.json();
        setAssignedIps(data.ips || []);
        setAvailableIps(data.availableIps || []);
      }
    } catch (error) {
      toast.error("Failed to fetch IPs");
    } finally {
      setIpLoading(false);
    }
  };

  const handleOpenIpModal = (vps: any) => {
    setShowIpModal(vps);
    fetchAssignedIps(vps.id);
  };

  const assignIp = async (ipAddress: string) => {
    if (!ipAddress || !showIpModal) return;

    try {
      setIpLoading(true);
      const res = await fetch(`/api/admin/vps/${showIpModal.id}/ips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ipAddress }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `IP ${ipAddress} assigned successfully`);
        setNewIpAddress("");
        fetchAssignedIps(showIpModal.id);
        fetchVpsServices();
      } else {
        toast.error(data.error || "Failed to assign IP");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIpLoading(false);
    }
  };

  const handleSavePublicIp = async (assignmentId: number, publicIp: string) => {
    if (!showIpModal) return;
    try {
      setIpLoading(true);
      const res = await fetch(`/api/admin/vps/${showIpModal.id}/ips`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId, publicIp }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Public IP saved successfully");
        setEditingPublicIpId(null);
        setEditingPublicIpValue("");
        fetchAssignedIps(showIpModal.id);
      } else {
        toast.error(data.error || "Failed to save Public IP");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIpLoading(false);
    }
  };

  const handleAddIp = async (e: React.FormEvent) => {
    e.preventDefault();
    await assignIp(newIpAddress);
  };

  const executeRemoveIp = async () => {
    if (!removeIpConfirm) return;
    try {
      setIpLoading(true);
      const res = await fetch(`/api/admin/vps/${showIpModal.id}/ips?assignmentId=${removeIpConfirm}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "IP Address removed successfully");
        fetchAssignedIps(showIpModal.id);
        fetchVpsServices(); // Update the table view
      } else {
        toast.error(data.error || "Failed to remove IP");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIpLoading(false);
      setRemoveIpConfirm(null);
    }
  };

  if (initialLoad) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center">
        <RefreshCw className={cn("w-10 h-10 animate-spin", isDark ? "text-cyan-500" : "text-cyan-700")} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row md:items-end justify-between gap-6 mb-6">
        <div>
          <h1 className={cn("text-3xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Proxmox VPS Management</h1>
          <p className={cn("text-sm font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Manage Proxmox integration, IP pools, templates, and pricing.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className={cn("flex gap-2 overflow-x-auto pb-4 mb-6 border-b [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]", isDark ? "border-white/10" : "border-slate-200")}>
        {[
          { id: "settings", label: "Proxmox Settings", icon: Settings },
          { id: "pools", label: "IP Pools", icon: Network },
          { id: "templates", label: "OS Templates", icon: HardDrive },
          { id: "pricing", label: "Pricing", icon: DollarSign },
          { id: "services", label: "User VPS Services", icon: Server },
          { id: "k3s", label: "Managed K3s", icon: Server },
          { id: "reserved-ips", label: "Reserved IPs", icon: Network },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap border",
              activeTab === tab.id
                ? (isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200")
                : (isDark ? "text-zinc-400 hover:text-white hover:bg-white/5 border-transparent" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100 border-transparent")
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className={cn("glass p-8 rounded-3xl border w-full", isDark ? "border-white/10" : "border-slate-200")}>
          <h2 className={cn("text-xl font-bold mb-6", isDark ? "text-white" : "text-slate-900")}>Proxmox Server Configuration</h2>

          {loadingSettings ? (
            <div className={cn("flex items-center gap-3", isDark ? "text-zinc-400" : "text-slate-500")}>
              <RefreshCw className={cn("w-10 h-10 animate-spin", isDark ? "text-cyan-500" : "text-cyan-700")} />
              Loading settings...
            </div>
          ) : (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* API Configuration */}
              <div className={cn("p-6 rounded-2xl border space-y-4", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                <h3 className={cn("text-lg font-bold flex items-center gap-2 mb-4", isDark ? "text-white" : "text-slate-900")}>
                  <Server className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-700")} /> API Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                  <div>
                    <label className={cn("block text-sm font-medium mb-1", isDark ? "text-zinc-300" : "text-slate-600")}>Server Name / Label</label>
                    <input
                      type="text"
                      required
                      value={settings.name || ""}
                      onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                      placeholder="e.g., Main Proxmox Node"
                      className={cn("w-full border rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all", isDark ? "bg-[#1e293b] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}
                    />
                  </div>
                  <div>
                    <label className={cn("block text-sm font-medium mb-1", isDark ? "text-zinc-300" : "text-slate-600")}>API Host / URL</label>
                    <input
                      type="url"
                      required
                      value={settings.host || ""}
                      onChange={(e) => setSettings({ ...settings, host: e.target.value })}
                      placeholder="e.g., https://proxmox.masdika.id:8006"
                      className={cn("w-full border rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all", isDark ? "bg-[#1e293b] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}
                    />
                  </div>
                  <div>
                    <label className={cn("block text-sm font-medium mb-1", isDark ? "text-zinc-300" : "text-slate-600")}>Token ID</label>
                    <input
                      type="text"
                      required
                      value={settings.tokenId || ""}
                      onChange={(e) => setSettings({ ...settings, tokenId: e.target.value })}
                      placeholder="e.g., root@pam!compute"
                      className={cn("w-full border rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all", isDark ? "bg-[#1e293b] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}
                    />
                  </div>
                  <div>
                    <label className={cn("block text-sm font-medium mb-1", isDark ? "text-zinc-300" : "text-slate-600")}>Token Secret</label>
                    <input
                      type="password"
                      required
                      value={settings.tokenSecret || ""}
                      onChange={(e) => setSettings({ ...settings, tokenSecret: e.target.value })}
                      placeholder="e.g., e7f01eb6-..."
                      className={cn("w-full border rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all", isDark ? "bg-[#1e293b] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}
                    />
                  </div>
                </div>
              </div>

              {/* Network & DNS */}
              <div className={cn("p-6 rounded-2xl border space-y-4", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                <h3 className={cn("text-lg font-bold flex items-center gap-2 mb-4", isDark ? "text-white" : "text-slate-900")}>
                  <Network className={cn("w-5 h-5", isDark ? "text-cyan-400" : "text-cyan-700")} /> Network & DNS Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                  <div>
                    <label className={cn("block text-sm font-medium mb-1", isDark ? "text-zinc-300" : "text-slate-600")}>Network Bridge (Default / VPC)</label>
                    <input
                      type="text"
                      required
                      value={settings.networkBridge || "vmbr0"}
                      onChange={(e) => setSettings({ ...settings, networkBridge: e.target.value })}
                      placeholder="e.g., vmbr0"
                      className={cn("w-full border rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all", isDark ? "bg-[#1e293b] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}
                    />
                    <p className="text-xs text-zinc-500 mt-1">This network bridge will be used for VPC / Internal VPS instances.</p>
                  </div>
                  <div>
                    <label className={cn("block text-sm font-medium mb-1", isDark ? "text-zinc-300" : "text-slate-600")}>Public Network Bridge</label>
                    <input
                      type="text"
                      required
                      value={settings.publicNetworkBridge || "vmbr1"}
                      onChange={(e) => setSettings({ ...settings, publicNetworkBridge: e.target.value })}
                      placeholder="e.g., vmbr1"
                      className={cn("w-full border rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all", isDark ? "bg-[#1e293b] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}
                    />
                    <p className="text-xs text-zinc-500 mt-1">This network bridge will be used specifically for Public IPs on net0.</p>
                  </div>
                  <div>
                    <label className={cn("block text-sm font-medium mb-1", isDark ? "text-zinc-300" : "text-slate-600")}>Primary DNS Server (Cloud-Init)</label>
                    <input
                      type="text"
                      value={settings.primaryDns || ""}
                      onChange={(e) => setSettings({ ...settings, primaryDns: e.target.value })}
                      placeholder="e.g., 8.8.8.8"
                      className={cn("w-full border rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all", isDark ? "bg-[#1e293b] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}
                    />
                    <p className="text-xs text-zinc-500 mt-1">Primary DNS server for new VPS instances.</p>
                  </div>
                  <div>
                    <label className={cn("block text-sm font-medium mb-1", isDark ? "text-zinc-300" : "text-slate-600")}>Secondary DNS Server (Cloud-Init)</label>
                    <input
                      type="text"
                      value={settings.secondaryDns || ""}
                      onChange={(e) => setSettings({ ...settings, secondaryDns: e.target.value })}
                      placeholder="e.g., 1.1.1.1"
                      className={cn("w-full border rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all", isDark ? "bg-[#1e293b] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}
                    />
                    <p className="text-xs text-zinc-500 mt-1">Secondary DNS server for new VPS instances.</p>
                  </div>
                </div>
              </div>

              {/* Storage */}
              <div className={cn("p-6 rounded-2xl border space-y-4", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                <h3 className={cn("text-lg font-bold flex items-center gap-2 mb-4", isDark ? "text-white" : "text-slate-900")}>
                  <HardDrive className={cn("w-5 h-5", isDark ? "text-purple-400" : "text-purple-700")} /> Storage Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className={cn("block text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-600")}>Backup Storage</label>
                      <button type="button" onClick={fetchStorages} disabled={syncingStorages} className={cn("text-xs hover:text-cyan-300 flex items-center gap-1", isDark ? "text-cyan-400" : "text-cyan-700")}>
                        <RefreshCw className={cn("w-3 h-3", syncingStorages && "animate-spin")} /> Sync Storages
                      </button>
                    </div>
                    {availableStorages.length > 0 ? (
                      <Select
                        value={settings.backupStorage || ""}
                        onChange={(val) => setSettings({ ...settings, backupStorage: val })}
                        options={[
                          { value: "", label: "Select backup storage..." },
                          ...availableStorages.map(storage => ({
                            value: storage.storage,
                            label: `${storage.storage} (${storage.type}) - ${(storage.avail / 1024 / 1024 / 1024).toFixed(1)} GB free`
                          }))
                        ]}
                        placeholder="Select backup storage..."
                        className={cn("w-full rounded-2xl px-5 py-3.5 text-sm", isDark ? "border-white/10" : "border-slate-200")}
                      />
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={settings.backupStorage || ""}
                          onChange={(e) => setSettings({ ...settings, backupStorage: e.target.value })}
                          placeholder="e.g., backup, pbs-backup"
                          className={cn("w-full border rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all", isDark ? "bg-[#1e293b] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}
                        />
                      </div>
                    )}
                    <p className="text-xs text-zinc-500 mt-1">Storage destination for VPS automated backups.</p>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className={cn("block text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-600")}>Default Storage for VPS (HDD Disk)</label>
                      <button type="button" onClick={fetchStorages} disabled={syncingStorages} className={cn("text-xs hover:text-cyan-300 flex items-center gap-1", isDark ? "text-cyan-400" : "text-cyan-700")}>
                        <RefreshCw className={cn("w-3 h-3", syncingStorages && "animate-spin")} /> Sync Storages
                      </button>
                    </div>
                    {availableStorages.length > 0 ? (
                      <Select
                        value={settings.mainDiskStorage || ""}
                        onChange={(val) => setSettings({ ...settings, mainDiskStorage: val })}
                        options={[
                          { value: "", label: "Select main storage..." },
                          ...availableStorages.map(storage => ({
                            value: storage.storage,
                            label: `${storage.storage} (${storage.type}) - ${(storage.avail / 1024 / 1024 / 1024).toFixed(1)} GB free`
                          }))
                        ]}
                        placeholder="Select main storage..."
                        className={cn("w-full rounded-2xl px-5 py-3.5 text-sm", isDark ? "border-white/10" : "border-slate-200")}
                      />
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={settings.mainDiskStorage || ""}
                          onChange={(e) => setSettings({ ...settings, mainDiskStorage: e.target.value })}
                          placeholder="e.g., local-lvm, p-net"
                          className={cn("w-full border rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all", isDark ? "bg-[#1e293b] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}
                        />
                      </div>
                    )}
                    <p className="text-xs text-zinc-500 mt-1">Select the storage where new VPS will be created by default. If not set, users cannot order a VPS.</p>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className={cn("block text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-600")}>Default Storage for VPS (SSD Disk)</label>
                      <button type="button" onClick={fetchStorages} disabled={syncingStorages} className={cn("text-xs hover:text-cyan-300 flex items-center gap-1", isDark ? "text-cyan-400" : "text-cyan-700")}>
                        <RefreshCw className={cn("w-3 h-3", syncingStorages && "animate-spin")} /> Sync Storages
                      </button>
                    </div>
                    {availableStorages.length > 0 ? (
                      <Select
                        value={settings.mainDiskStorageSsd || ""}
                        onChange={(val) => setSettings({ ...settings, mainDiskStorageSsd: val })}
                        options={[
                          { value: "", label: "Select SSD storage..." },
                          ...availableStorages.map(storage => ({
                            value: storage.storage,
                            label: `${storage.storage} (${storage.type}) - ${(storage.avail / 1024 / 1024 / 1024).toFixed(1)} GB free`
                          }))
                        ]}
                        placeholder="Select SSD storage..."
                        className={cn("w-full rounded-2xl px-5 py-3.5 text-sm", isDark ? "border-white/10" : "border-slate-200")}
                      />
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={settings.mainDiskStorageSsd || ""}
                          onChange={(e) => setSettings({ ...settings, mainDiskStorageSsd: e.target.value })}
                          placeholder="e.g., local-lvm, ssd-pool"
                          className={cn("w-full border rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all", isDark ? "bg-[#1e293b] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}
                        />
                      </div>
                    )}
                    <p className="text-xs text-zinc-500 mt-1">Select the storage pool used specifically when a user selects SSD storage.</p>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className={cn("block text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-600")}>Allowed Storage for Add-on Disks</label>
                      <button type="button" onClick={fetchStorages} disabled={syncingStorages} className={cn("text-xs hover:text-cyan-300 flex items-center gap-1", isDark ? "text-cyan-400" : "text-cyan-700")}>
                        <RefreshCw className={cn("w-3 h-3", syncingStorages && "animate-spin")} /> Sync Storages
                      </button>
                    </div>
                    {availableStorages.length > 0 ? (
                      <Select
                        value={settings.addonDiskStorages || ""}
                        onChange={(val) => setSettings({ ...settings, addonDiskStorages: val })}
                        options={[
                          { value: "", label: "Select add-on storage..." },
                          ...availableStorages.map(storage => ({
                            value: storage.storage,
                            label: `${storage.storage} (${storage.type}) - ${(storage.avail / 1024 / 1024 / 1024).toFixed(1)} GB free`
                          }))
                        ]}
                        placeholder="Select add-on storage..."
                        className={cn("w-full rounded-2xl px-5 py-3.5 text-sm", isDark ? "border-white/10" : "border-slate-200")}
                      />
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={settings.addonDiskStorages || ""}
                          onChange={(e) => setSettings({ ...settings, addonDiskStorages: e.target.value })}
                          placeholder="e.g., local-lvm, p-net"
                          className={cn("w-full border rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all", isDark ? "bg-[#1e293b] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}
                        />
                      </div>
                    )}
                    <p className="text-xs text-zinc-500 mt-2">Select the storage that users are allowed to use for adding extra disks (EBS-style).</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, isActive: settings.isActive === false ? true : false })}
                  className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <div className={cn(
                    "w-5 h-5 rounded flex items-center justify-center transition-all shrink-0",
                    settings.isActive !== false ? "bg-cyan-500 text-white" : (isDark ? "bg-black/50 border border-white/20" : "bg-slate-100 border border-slate-300 text-transparent")
                  )}>
                    {settings.isActive !== false && <CheckCircle className="w-3.5 h-3.5" strokeWidth={3} />}
                  </div>
                  <span className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-600")}>Active</span>
                </button>

                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm"
                >
                  {savingSettings ? "Saving..." : "Save Configuration"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* IP Pools Tab */}
      {activeTab === "pools" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h2 className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>IP Pool Management</h2>
              <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Manage IPv4/IPv6 blocks for VPS provisioning. The gateway IP will not be assigned to clients.</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              {selectedPools.length > 0 && (
                <button
                  onClick={() => setShowBulkDeletePoolModal(selectedPools)}
                  className={cn("bg-red-500/10 hover:bg-red-500 hover:text-white px-4 py-3 sm:py-2 rounded-xl sm:rounded-lg font-medium transition-colors border border-red-500/20 whitespace-nowrap", isDark ? "text-red-400" : "text-red-700")}
                >
                  Delete Selected ({selectedPools.length})
                </button>
              )}
              <button
                onClick={() => setShowAddPool(!showAddPool)}
                className="px-4 py-2 sm:py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all w-full sm:w-auto bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Pool
              </button>
            </div>
          </div>

          {showAddPool && (
            <form onSubmit={handleAddPool} className={cn("glass p-8 rounded-3xl border space-y-6", isDark ? "border-white/10" : "border-slate-200")}>

              {/* IP Version Selector */}
              <div>
                <label className={cn("block text-sm font-medium mb-3", isDark ? "text-zinc-300" : "text-slate-600")}>IP Version</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={newPool.version === 4} onChange={() => setNewPool({ ...newPool, version: 4 })} className={cn("w-4 h-4 text-cyan-500 focus:ring-cyan-500 transition-colors", isDark ? "bg-black/50 border-white/10" : "bg-white border-slate-200")} />
                    <span className={cn("font-medium", isDark ? "text-white" : "text-slate-900")}>IPv4</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={newPool.version === 6} onChange={() => setNewPool({ ...newPool, version: 6 })} className={cn("w-4 h-4 text-cyan-500 focus:ring-cyan-500 transition-colors", isDark ? "bg-black/50 border-white/10" : "bg-white border-slate-200")} />
                    <span className={cn("font-medium", isDark ? "text-white" : "text-slate-900")}>IPv6</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={cn("block text-sm font-medium mb-2", isDark ? "text-zinc-300" : "text-slate-600")}>Network (Subnet/CIDR)</label>
                  <input type="text" required value={newPool.network} onChange={e => setNewPool({ ...newPool, network: e.target.value })} placeholder={newPool.version === 4 ? "192.168.100.0/24" : "2001:db8:1234:5678::/64"} className={cn("w-full border rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all", isDark ? "bg-[#1e293b] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")} />
                </div>
                <div>
                  <label className={cn("block text-sm font-medium mb-2", isDark ? "text-zinc-300" : "text-slate-600")}>Gateway IP</label>
                  <input type="text" required value={newPool.gateway} onChange={e => setNewPool({ ...newPool, gateway: e.target.value })} placeholder={newPool.version === 4 ? "192.168.100.1" : "2001:db8:1234:5678::1"} className={cn("w-full border rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all", isDark ? "bg-[#1e293b] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")} />
                </div>

                <div>
                  <label className={cn("block text-sm font-medium mb-2", isDark ? "text-zinc-300" : "text-slate-600")}>Start IP</label>
                  <input type="text" required value={newPool.startIp} onChange={e => setNewPool({ ...newPool, startIp: e.target.value })} placeholder={newPool.version === 4 ? "192.168.100.2" : "2001:db8:1234:5678::2"} className={cn("w-full border rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all", isDark ? "bg-[#1e293b] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")} />
                </div>
                <div>
                  <label className={cn("block text-sm font-medium mb-2", isDark ? "text-zinc-300" : "text-slate-600")}>End IP</label>
                  <input type="text" required value={newPool.endIp} onChange={e => setNewPool({ ...newPool, endIp: e.target.value })} placeholder={newPool.version === 4 ? "192.168.100.254" : "2001:db8:1234:5678::ffff"} className={cn("w-full border rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all", isDark ? "bg-[#1e293b] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")} />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button type="submit" className={cn("bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 px-8 py-3 rounded-2xl font-bold transition-all transform hover:-translate-y-1 text-sm", isDark ? "text-white" : "text-slate-900")}>
                  Save Pool
                </button>
              </div>
            </form>
          )}

          <div className={cn("glass rounded-xl border overflow-x-auto", isDark ? "border-white/10" : "border-slate-200")}>
            <table className={cn("w-full text-left text-sm min-w-[600px]", isDark ? "text-zinc-400" : "text-slate-500")}>
              <thead className={cn("bg-white/5 border-b", isDark ? "border-white/10" : "border-slate-200")}>
                <tr>
                  <th className="px-6 py-4 w-10">
                    <button
                      onClick={toggleSelectAllPools}
                      className={cn(
                        "w-5 h-5 rounded flex items-center justify-center transition-colors",
                        selectedPools.length > 0
                          ? "bg-cyan-500 text-[#0f172a]"
                          : (isDark ? "bg-black/50 border border-white/10 text-transparent hover:border-cyan-500/50" : "bg-white border border-slate-300 text-transparent hover:border-cyan-500")
                      )}
                    >
                      <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </th>
                  <th className={cn("px-6 py-4 font-medium", isDark ? "text-white" : "text-slate-900")}>Network</th>
                  <th className={cn("px-6 py-4 font-medium", isDark ? "text-white" : "text-slate-900")}>Gateway</th>
                  <th className={cn("px-6 py-4 font-medium", isDark ? "text-white" : "text-slate-900")}>Range</th>
                  <th className={cn("px-6 py-4 font-medium", isDark ? "text-white" : "text-slate-900")}>Type</th>
                  <th className={cn("px-6 py-4 font-medium text-right", isDark ? "text-white" : "text-slate-900")}>Actions</th>
                </tr>
              </thead>
              <tbody className={cn("divide-y", isDark ? "divide-white/5" : "divide-slate-200")}>
                {loadingPools ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <RefreshCw className={cn("w-10 h-10 animate-spin", isDark ? "text-cyan-500" : "text-cyan-700")} />
                        <p className="text-sm">Loading IP pools...</p>
                      </div>
                    </td>
                  </tr>
                ) : pools.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-4 text-center">No IP pools configured.</td></tr>
                ) : (
                  pools.slice((poolCurrentPage - 1) * poolsPerPage, poolCurrentPage * poolsPerPage).map(pool => (
                    <tr key={pool.id} className="hover:bg-white/5">
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleSelectPool(pool.id)}
                          className={cn(
                            "w-5 h-5 rounded flex items-center justify-center transition-colors",
                            selectedPools.includes(pool.id)
                              ? "bg-cyan-500 text-[#0f172a]"
                              : (isDark ? "bg-black/50 border border-white/10 text-transparent hover:border-cyan-500/50" : "bg-white border border-slate-300 text-transparent hover:border-cyan-500")
                          )}
                        >
                          <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                        </button>
                      </td>
                      <td className={cn("px-6 py-4 font-medium", isDark ? "text-white" : "text-slate-900")}>{pool.network}</td>
                      <td className={cn("px-6 py-4", isDark ? "text-red-400" : "text-red-700")}>{pool.gateway}</td>
                      <td className="px-6 py-4">
                        {pool.version === 4 ? `${pool.startIp} - ${pool.endIp}` : <span className="text-zinc-500 italic">Subnet block (No range)</span>}
                      </td>
                      <td className="px-6 py-4"><span className="px-2 py-1 bg-white/10 rounded-md text-xs">{pool.version === 4 ? 'IPv4' : 'IPv6'}</span></td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => setShowDeletePoolModal(pool.id)} className={cn("p-2 hover:bg-red-400/10 rounded-lg", isDark ? "text-red-400" : "text-red-700")}><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {pools.length > poolsPerPage && (
            <div className={cn("px-6 py-4 border-t flex items-center justify-between", isDark ? "border-white/10" : "border-slate-200")}>
              <span className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
                Showing {((poolCurrentPage - 1) * poolsPerPage) + 1} to {Math.min(poolCurrentPage * poolsPerPage, pools.length)} of {pools.length} pools
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPoolCurrentPage(p => Math.max(1, p - 1))}
                  disabled={poolCurrentPage === 1}
                  className={cn("p-1 rounded hover:bg-white/10 disabled:opacity-50 transition-colors", isDark ? "text-white" : "text-slate-900")}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setPoolCurrentPage(p => Math.min(Math.ceil(pools.length / poolsPerPage), p + 1))}
                  disabled={poolCurrentPage === Math.ceil(pools.length / poolsPerPage)}
                  className={cn("p-1 rounded hover:bg-white/10 disabled:opacity-50 transition-colors", isDark ? "text-white" : "text-slate-900")}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h2 className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>OS Templates</h2>
              <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Templates are synced directly from Proxmox (VMs with template=1).</p>
            </div>
            <button
              onClick={syncTemplates}
              disabled={syncingTemplates}
              className="px-4 py-2 sm:py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 w-full sm:w-auto bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm"
            >
              <RefreshCw className={cn("w-4 h-4", syncingTemplates && "animate-spin")} />
              {syncingTemplates ? "Syncing..." : "Sync from Proxmox"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loadingTemplates ? (
              <div className="col-span-full py-12 flex flex-col items-center justify-center gap-3 text-zinc-500">
                <RefreshCw className={cn("w-10 h-10 animate-spin", isDark ? "text-cyan-500" : "text-cyan-700")} />
                <p className="text-sm font-medium">Loading templates...</p>
              </div>
            ) : templates.length === 0 ? (
              <div className={cn("col-span-full text-center py-8 glass rounded-xl border", isDark ? "text-zinc-400 border-white/10" : "text-slate-500 border-slate-200")}>
                No templates found. Click "Sync from Proxmox" to fetch them.
              </div>
            ) : (
              <div className="col-span-full w-full space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  <div>
                    <label className={cn("block text-sm font-medium mb-2", isDark ? "text-zinc-400" : "text-slate-500")}>Image / App</label>
                    <Select
                      value={selectedAdminOsFamily || ""}
                      onChange={(val) => {
                        setSelectedAdminOsFamily(val.toString());
                        const firstVersion = templates.find(t => t.name.startsWith(val.toString() + "-")) || templates.find(t => t.name.startsWith(val.toString()));
                        if (firstVersion) setSelectedAdminTemplate(firstVersion.id);
                      }}
                      options={Array.from(new Set(templates.map(t => t.name.split('-')[0]))).map(fam => ({
                        value: fam,
                        label: (
                          <div className="flex items-center gap-3">
                            {getOsIconUrl(fam, isDark) ? (
                              <img referrerPolicy="no-referrer" src={getOsIconUrl(fam, isDark)!} alt={fam} className="w-5 h-5 object-contain" loading="lazy" decoding="async" />
                            ) : (
                              <HardDrive className={cn("w-5 h-5", isDark ? "text-zinc-400" : "text-slate-500")} />
                            )}
                            <span>{fam}</span>
                          </div>
                        )
                      }))}
                      placeholder="Select Image / App..."
                      className={cn("w-full rounded-xl px-4 py-3 text-sm font-bold", isDark ? "border-white/10" : "border-slate-200")}
                    />
                  </div>
                  <div>
                    <label className={cn("block text-sm font-medium mb-2", isDark ? "text-zinc-400" : "text-slate-500")}>Image / App Version</label>
                    <Select
                      value={selectedAdminTemplate || ""}
                      onChange={(val) => setSelectedAdminTemplate(Number(val))}
                      options={templates
                        .filter(t => t.name.startsWith((selectedAdminOsFamily || "") + "-") || t.name === selectedAdminOsFamily)
                        .map(tpl => {
                          const parts = tpl.name.split('-');
                          const version = parts.slice(1).join('-') || 'Default';
                          return {
                            value: tpl.id,
                            label: version
                          };
                        })
                      }
                      placeholder="Select Version..."
                      className={cn("w-full rounded-xl px-4 py-3 text-sm font-bold", isDark ? "border-white/10" : "border-slate-200")}
                    />
                  </div>
                </div>

                {selectedAdminTemplate && (() => {
                  const selectedTpl = templates.find(t => t.id === selectedAdminTemplate);
                  if (!selectedTpl) return null;
                  return (
                    <div className={cn("glass p-6 md:p-8 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-6 mt-8 bg-gradient-to-br from-[#0f172a]/80 to-[#0a1f33]/80 w-full group hover:border-cyan-500/30 transition-all duration-300", isDark ? "border-white/10" : "border-slate-200")}>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 w-full">
                        <div className={cn("p-4 md:p-5 bg-gradient-to-br from-cyan-500/20 to-cyan-500/10 rounded-2xl border group-hover:scale-105 transition-transform", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                          {getOsIconUrl(selectedTpl.name.split('-')[0], isDark) ? (
                            <img referrerPolicy="no-referrer" src={getOsIconUrl(selectedTpl.name.split('-')[0], isDark)!} alt={selectedTpl.name} className="w-10 h-10 md:w-12 md:h-12 object-contain" loading="lazy" decoding="async" />
                          ) : (
                            <HardDrive className={cn("w-10 h-10 md:w-12 md:h-12", isDark ? "text-cyan-400" : "text-cyan-700")} />
                          )}
                        </div>
                        <div className="flex-1 w-full">
                          <h3 className={cn("text-2xl md:text-3xl font-extrabold mb-2 tracking-tight group-hover:text-cyan-400 transition-colors", isDark ? "text-white" : "text-slate-900")}>{selectedTpl.name}</h3>
                          <div className="flex flex-wrap items-center gap-3">
                            <span className={cn("text-sm font-medium px-3 py-1 rounded-full border", isDark ? "text-zinc-400 border-white/10" : "text-slate-500 border-slate-200")}>OS Type: {selectedTpl.osType}</span>
                            <span className={cn("text-sm font-medium bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20", isDark ? "text-cyan-400" : "text-cyan-700")}>Bootable Image</span>
                          </div>
                        </div>
                      </div>
                      <div className="w-full md:w-auto mt-4 md:mt-0 flex shrink-0">
                        <div className={cn("px-6 py-4 bg-gradient-to-b from-emerald-500/20 to-emerald-500/5 font-bold rounded-xl border border-emerald-500/30 text-center w-full", isDark ? "text-emerald-400" : "text-emerald-700")}>
                          <div className="text-[11px] uppercase tracking-wider opacity-80 mb-1 font-semibold">Proxmox VMID</div>
                          <div className="text-3xl md:text-4xl font-black tabular-nums tracking-tighter">{selectedTpl.vmid}</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pricing Tab */}
      {activeTab === "pricing" && (
        <div className={cn("glass p-6 rounded-xl border max-w-3xl", isDark ? "border-white/10" : "border-slate-200")}>
          <div className="mb-6">
            <h2 className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>Resource Pricing (Pay-As-You-Go)</h2>
            <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Set the hourly rate in Rupiah for each resource type.</p>
          </div>

          {loadingPricing ? (
            <div className="flex justify-center py-12">
              <RefreshCw className={cn("w-10 h-10 animate-spin", isDark ? "text-cyan-500" : "text-cyan-700")} />
            </div>
          ) : (
            <form onSubmit={handleSavePricing}>
              <div className="grid gap-4 mb-6">
                {pricing.map((item, idx) => (
                  <div key={item.id} className={cn("flex items-center justify-between p-4 rounded-lg border", isDark ? "border-white/10" : "border-slate-200")}>
                    <div>
                      <h3 className={cn("font-medium", isDark ? "text-white" : "text-slate-900")}>{item.name}</h3>
                      <p className={cn("text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>Per {item.unit} / hour</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>Rp</span>
                      <input
                        type="number"
                        min="0"
                        required
                        value={item.pricePerHour}
                        onChange={(e) => {
                          const newPricing = [...pricing];
                          newPricing[idx].pricePerHour = Number(e.target.value);
                          setPricing(newPricing);
                        }}
                        className={cn("w-24 border rounded-lg px-3 py-1.5 text-right focus:border-cyan-500 focus:outline-none transition-colors", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingPricing}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm"
                >
                  {savingPricing ? "Saving..." : "Save Pricing"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Fixed Plans Tab */}
      {activeTab === "plans" && (
        <div className={cn("glass p-6 rounded-xl border", isDark ? "border-white/10" : "border-slate-200")}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h2 className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>Fixed Monthly Plans</h2>
              <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Pre-configured VPS plans with monthly pricing.</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              {selectedPlans.length > 0 && (
                <button
                  onClick={() => setShowBulkDeletePlanModal(selectedPlans)}
                  className={cn("bg-red-500/10 hover:bg-red-500 hover:text-white px-4 py-3 sm:py-2 rounded-xl sm:rounded-lg font-medium transition-colors border border-red-500/20 whitespace-nowrap", isDark ? "text-red-400" : "text-red-700")}
                >
                  Delete Selected ({selectedPlans.length})
                </button>
              )}
              <button
                onClick={() => {
                  setNewPlan({ id: 0, name: "", cpuCores: 1, ramGb: 1, diskGb: 20, diskType: "HDD", monthlyPrice: 0, quarterlyPrice: 0, semiAnnuallyPrice: 0, annuallyPrice: 0, isReseller: false, isActive: true });
                  setShowAddPlan(!showAddPlan);
                }}
                className="px-4 py-2 sm:py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all w-full sm:w-auto bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Plan
              </button>
            </div>
          </div>

          <div className={cn("flex p-1 rounded-xl w-full sm:w-fit border mb-6", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-slate-50 border-slate-200")}>
            <button
              onClick={() => {
                setPlanFilterDiskType("HDD");
                setPlanCurrentPage(1);
              }}
              className={cn(
                "flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all duration-300",
                planFilterDiskType === "HDD" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Disk HDD
            </button>
            <button
              onClick={() => {
                setPlanFilterDiskType("SSD");
                setPlanCurrentPage(1);
              }}
              className={cn(
                "flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all duration-300",
                planFilterDiskType === "SSD" ? "bg-cyan-400 text-slate-950 font-bold" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Disk SSD
            </button>
          </div>

          {showAddPlan && (
            <div className={cn("mb-8 p-6 border rounded-xl", isDark ? "border-white/10" : "border-slate-200")}>
              <h3 className={cn("text-lg font-bold mb-4", isDark ? "text-white" : "text-slate-900")}>{newPlan.id ? 'Edit Plan' : 'Add New Plan'}</h3>
              <form onSubmit={handleSavePlan} className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className={cn("block text-sm font-medium mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>Plan Name</label>
                  <input type="text" required value={newPlan.name} onChange={e => setNewPlan({ ...newPlan, name: e.target.value })} className={cn("w-full border rounded-lg px-3 py-2 transition-colors", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C] focus:border-cyan-500/50" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50 focus:border-cyan-500")} placeholder="e.g. Standard" />
                </div>
                <div>
                  <label className={cn("block text-sm font-medium mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>Monthly Price (Rp)</label>
                  <input type="number" required min="0" value={newPlan.monthlyPrice} onChange={e => setNewPlan({ ...newPlan, monthlyPrice: Number(e.target.value) })} className={cn("w-full border rounded-lg px-3 py-2 transition-colors", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C] focus:border-cyan-500/50" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50 focus:border-cyan-500")} />
                </div>
                <div>
                  <label className={cn("block text-sm font-medium mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>3 Months Price (Rp)</label>
                  <input type="number" required min="0" value={newPlan.quarterlyPrice} onChange={e => setNewPlan({ ...newPlan, quarterlyPrice: Number(e.target.value) })} className={cn("w-full border rounded-lg px-3 py-2 transition-colors", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C] focus:border-cyan-500/50" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50 focus:border-cyan-500")} />
                </div>
                <div>
                  <label className={cn("block text-sm font-medium mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>6 Months Price (Rp)</label>
                  <input type="number" required min="0" value={newPlan.semiAnnuallyPrice} onChange={e => setNewPlan({ ...newPlan, semiAnnuallyPrice: Number(e.target.value) })} className={cn("w-full border rounded-lg px-3 py-2 transition-colors", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C] focus:border-cyan-500/50" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50 focus:border-cyan-500")} />
                </div>
                <div>
                  <label className={cn("block text-sm font-medium mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>12 Months Price (Rp)</label>
                  <input type="number" required min="0" value={newPlan.annuallyPrice} onChange={e => setNewPlan({ ...newPlan, annuallyPrice: Number(e.target.value) })} className={cn("w-full border rounded-lg px-3 py-2 transition-colors", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C] focus:border-cyan-500/50" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50 focus:border-cyan-500")} />
                </div>
                <div>
                  <label className={cn("block text-sm font-medium mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>vCPU Cores</label>
                  <input type="number" required min="1" value={newPlan.cpuCores} onChange={e => setNewPlan({ ...newPlan, cpuCores: Number(e.target.value) })} className={cn("w-full border rounded-lg px-3 py-2 transition-colors", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C] focus:border-cyan-500/50" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50 focus:border-cyan-500")} />
                </div>
                <div>
                  <label className={cn("block text-sm font-medium mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>RAM (GB)</label>
                  <input type="number" required min="1" value={newPlan.ramGb} onChange={e => setNewPlan({ ...newPlan, ramGb: Number(e.target.value) })} className={cn("w-full border rounded-lg px-3 py-2 transition-colors", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C] focus:border-cyan-500/50" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50 focus:border-cyan-500")} />
                </div>
                <div>
                  <label className={cn("block text-sm font-medium mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>Disk (GB)</label>
                  <input type="number" required min="1" value={newPlan.diskGb} onChange={e => setNewPlan({ ...newPlan, diskGb: Number(e.target.value) })} className={cn("w-full border rounded-lg px-3 py-2 transition-colors", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C] focus:border-cyan-500/50" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50 focus:border-cyan-500")} />
                </div>
                <div>
                  <label className={cn("block text-sm font-medium mb-1", isDark ? "text-zinc-400" : "text-slate-500")}>Disk Type</label>
                  <Select
                    value={newPlan.diskType || "HDD"}
                    onChange={(val) => setNewPlan({ ...newPlan, diskType: val.toString() })}
                    options={[
                      { value: "HDD", label: "HDD" },
                      { value: "SSD", label: "SSD" }
                    ]}
                    className={cn("w-full border rounded-lg px-3 py-2 transition-colors", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C] focus:border-cyan-500/50" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50 focus:border-cyan-500")}
                  />
                </div>
                <div className="flex items-center gap-4 mt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={newPlan.isActive} onChange={e => setNewPlan({ ...newPlan, isActive: e.target.checked })} className={cn("rounded", isDark ? "text-cyan-500" : "text-cyan-700")} />
                    <span className={cn("text-sm font-medium", isDark ? "text-white" : "text-slate-900")}>Active (Visible)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={newPlan.isReseller} onChange={e => setNewPlan({ ...newPlan, isReseller: e.target.checked })} className={cn("rounded", isDark ? "text-purple-500" : "text-purple-700")} />
                    <span className={cn("text-sm font-medium", isDark ? "text-purple-400" : "text-purple-700")}>Reseller VPS Plan</span>
                  </label>
                </div>
                <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                  <button type="button" onClick={() => setShowAddPlan(false)} className={cn("px-4 py-2 hover:text-white transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}>Cancel</button>
                  <button type="submit" className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm">Save Plan</button>
                </div>
              </form>
            </div>
          )}

          {loadingPlans ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-zinc-500">
              <RefreshCw className={cn("w-10 h-10 animate-spin", isDark ? "text-cyan-500" : "text-cyan-700")} />
              <p className="text-sm font-medium">Loading plans...</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredPlans.length > 0 && (
                <div className={cn("flex items-center gap-3 p-4 rounded-lg border mb-2", isDark ? "border-white/10" : "border-slate-200")}>
                  <button
                    onClick={toggleSelectAllPlans}
                    className={cn(
                      "w-5 h-5 rounded flex items-center justify-center transition-colors shrink-0",
                      selectedPlans.length === filteredPlans.length && filteredPlans.length > 0
                        ? "bg-cyan-500 text-[#0f172a]"
                        : (isDark ? "bg-black/50 border border-white/10 text-transparent hover:border-cyan-500/50" : "bg-white border border-slate-300 text-transparent hover:border-cyan-500")
                    )}
                  >
                    <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                  </button>
                  <span className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-600")}>Select All</span>
                </div>
              )}
              <Reorder.Group
                axis="y"
                values={filteredPlans.slice((planCurrentPage - 1) * plansPerPage, planCurrentPage * plansPerPage)}
                onReorder={handleReorderPlans}
                className="grid gap-4"
              >
                {filteredPlans.slice((planCurrentPage - 1) * plansPerPage, planCurrentPage * plansPerPage).map((plan) => (
                  <Reorder.Item key={plan.id} value={plan} className={cn("flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border gap-4 hover:border-cyan-500/30 transition-colors cursor-grab active:cursor-grabbing", isDark ? "border-white/10" : "border-slate-200")}>
                    <div className="flex items-start gap-4">
                      <div className="mt-1 text-zinc-500 hover:text-white transition-colors cursor-grab active:cursor-grabbing">
                        <GripVertical className="w-5 h-5" />
                      </div>
                      <button
                        onClick={() => toggleSelectPlan(plan.id)}
                        className={cn(
                          "w-5 h-5 rounded flex items-center justify-center transition-colors shrink-0 mt-1",
                          selectedPlans.includes(plan.id)
                            ? "bg-cyan-500 text-[#0f172a]"
                            : (isDark ? "bg-black/50 border border-white/10 text-transparent hover:border-cyan-500/50" : "bg-white border border-slate-300 text-transparent hover:border-cyan-500")
                        )}
                      >
                        <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>{plan.name}</h3>
                          {!plan.isActive && <span className={cn("bg-red-500/20 text-[10px] px-2 py-0.5 rounded-full", isDark ? "text-red-400" : "text-red-700")}>INACTIVE</span>}
                        </div>
                        <div className={cn("text-sm mt-1 flex gap-3", isDark ? "text-zinc-400" : "text-slate-500")}>
                          <span>{plan.cpuCores} vCPU</span>
                          <span>{plan.ramGb} GB RAM</span>
                          <span>{plan.diskGb} GB {plan.diskType || "HDD"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto">
                      <div className={cn("font-bold bg-emerald-500/10 px-3 py-1 rounded", isDark ? "text-emerald-400" : "text-emerald-700")}>
                        Rp {plan.monthlyPrice.toLocaleString('id-ID')}/mo
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setNewPlan(plan); setShowAddPlan(true); }} className={cn("p-2 hover:text-cyan-400 transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}><Edit className="w-4 h-4" /></button>
                        <button onClick={() => setShowDeletePlanModal(plan.id)} className={cn("p-2 hover:text-red-400 transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
              {filteredPlans.length === 0 && <div className="text-zinc-500 text-center py-6">No fixed plans configured for {planFilterDiskType} yet.</div>}

              {filteredPlans.length > plansPerPage && (
                <div className={cn("px-6 py-4 border-t mt-4 flex items-center justify-between", isDark ? "border-white/10" : "border-slate-200")}>
                  <span className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
                    Showing {((planCurrentPage - 1) * plansPerPage) + 1} to {Math.min(planCurrentPage * plansPerPage, filteredPlans.length)} of {filteredPlans.length} plans
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPlanCurrentPage(p => Math.max(1, p - 1))}
                      disabled={planCurrentPage === 1}
                      className={cn("p-1 rounded hover:bg-white/10 disabled:opacity-50 transition-colors", isDark ? "text-white" : "text-slate-900")}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setPlanCurrentPage(p => Math.min(Math.ceil(filteredPlans.length / plansPerPage), p + 1))}
                      disabled={planCurrentPage === Math.ceil(filteredPlans.length / plansPerPage)}
                      className={cn("p-1 rounded hover:bg-white/10 disabled:opacity-50 transition-colors", isDark ? "text-white" : "text-slate-900")}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Services and K3s Nodes Tabs */}
      {(activeTab === "services" || activeTab === "k3s") && (
        <div className={cn("glass p-6 md:p-8 rounded-3xl border w-full", isDark ? "border-white/10" : "border-slate-200")}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h2 className={cn("text-2xl font-extrabold mb-2", isDark ? "text-white" : "text-slate-900")}>
                {activeTab === "services" ? "User VPS Services" : "Managed K3s Nodes"}
              </h2>
              <p className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>
                {activeTab === "services"
                  ? "Monitor and manage all client virtual machines."
                  : "Monitor and manage all client Kubernetes nodes."}
              </p>
            </div>
            <div className="flex flex-col md:flex-row gap-3 items-center w-full md:w-auto">
              {selectedVps.length > 0 && (
                <button
                  onClick={() => setShowBulkTerminateModal(selectedVps)}
                  className={cn("px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-sm font-medium hover:bg-red-500 hover:text-white transition-colors h-[48px] flex items-center whitespace-nowrap", isDark ? "text-red-400" : "text-red-700")}
                >
                  Delete Selected ({selectedVps.length})
                </button>
              )}
              <div className="relative w-full md:w-64">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search hostname or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn("w-full border focus:border-cyan-500/50 rounded-2xl py-3.5 pl-10 pr-4 placeholder-zinc-500 outline-none transition-all focus:ring-2 focus:ring-cyan-500/20 h-[48px]", isDark ? "bg-[#1e293b] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}
                />
              </div>
            </div>
          </div>

          {loadingServices ? (
            <div className="flex justify-center py-12">
              <RefreshCw className={cn("w-10 h-10 animate-spin", isDark ? "text-cyan-500" : "text-cyan-700")} />
            </div>
          ) : (
            <div className={cn("overflow-x-auto rounded-2xl border", isDark ? "border-white/10" : "border-slate-200")}>
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className={cn("bg-white/5 text-sm border-b", isDark ? "text-zinc-400 border-white/10" : "text-slate-500 border-slate-200")}>
                    <th className="p-4 w-10">
                      <button
                        onClick={toggleSelectAllVps}
                        className={cn(
                          "w-5 h-5 rounded flex items-center justify-center transition-colors",
                          selectedVps.length > 0
                            ? "bg-cyan-500 text-[#0f172a]"
                            : (isDark ? "bg-black/50 border border-white/10 text-transparent hover:border-cyan-500/50" : "bg-white border border-slate-300 text-transparent hover:border-cyan-500")
                        )}
                      >
                        <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </th>
                    <th className="p-4 font-medium whitespace-nowrap">VMID / Node</th>
                    <th className="p-4 font-medium whitespace-nowrap">Hostname</th>
                    <th className="p-4 font-medium whitespace-nowrap">OS</th>
                    <th className="p-4 font-medium whitespace-nowrap">Client</th>
                    <th className="p-4 font-medium whitespace-nowrap">IP Address</th>
                    <th className="p-4 font-medium whitespace-nowrap">Status</th>
                    <th className="p-4 font-medium whitespace-nowrap">Current Cost</th>
                    <th className="p-4 font-medium text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {vpsServices
                    .filter(v => (activeTab === "services" ? !v.kubernetesClusterId : !!v.kubernetesClusterId))
                    .filter(v => v.hostname.includes(searchQuery) || v.user.email.includes(searchQuery))
                    .slice((vpsCurrentPage - 1) * vpsPerPage, vpsCurrentPage * vpsPerPage)
                    .map((vps) => (
                      <tr key={vps.id} className={`${isDark ? "hover:bg-white/5" : "hover:bg-slate-50"} transition-colors ${actionLoading === vps.id ? 'opacity-50 animate-pulse' : ''}`}>
                        <td className="p-4">
                          <button
                            onClick={() => toggleSelectVps(vps.id)}
                            className={cn(
                              "w-5 h-5 rounded flex items-center justify-center transition-colors",
                              selectedVps.includes(vps.id)
                                ? "bg-cyan-500 text-[#0f172a]"
                                : (isDark ? "bg-black/50 border border-white/10 text-transparent hover:border-cyan-500/50" : "bg-white border border-slate-300 text-transparent hover:border-cyan-500")
                            )}
                          >
                            <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                          </button>
                        </td>
                        <td className="p-4">
                          <div className={cn("font-mono text-sm", isDark ? "text-white" : "text-slate-900")}>{vps.vmid || 'N/A'}</div>
                          <div className="text-xs text-zinc-500">{vps.node}</div>
                        </td>
                        <td className="p-4">
                          <div className={cn("font-medium whitespace-nowrap", isDark ? "text-white" : "text-slate-900")}>{vps.hostname}</div>
                          <div className="text-xs text-zinc-500 mt-1.5 flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                              <span className={cn("font-medium whitespace-nowrap", isDark ? "text-cyan-400" : "text-cyan-700")}>Cloud VPS</span>
                            </div>
                            {(vps as any).kubernetesRole && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-zinc-600">•</span>
                                <span className={cn("font-medium whitespace-nowrap", isDark ? "text-purple-400" : "text-purple-700")}>K3s</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          {vps.osTemplate ? (
                            <div className="flex items-center gap-2.5" title={vps.osTemplate}>
                              {getOsIconUrl(vps.osTemplate, isDark) ? (
                                <img referrerPolicy="no-referrer" src={getOsIconUrl(vps.osTemplate, isDark)!} alt="OS" className="w-5 h-5 object-contain" />
                              ) : (
                                <HardDrive className={cn("w-5 h-5", isDark ? "text-zinc-400" : "text-slate-500")} />
                              )}
                              <span className={cn("text-sm font-medium whitespace-nowrap capitalize", isDark ? "text-zinc-200" : "text-slate-700")}>
                                {vps.osTemplate.split('/').pop()?.replace(/\.tar\.(zst|gz|xz)$/, '').split('_')[0].replace(/-standard|-default|-systemd/g, '').replace(/-/g, ' ') || vps.osTemplate}
                              </span>
                            </div>
                          ) : (
                            <span className="text-zinc-600 text-xs italic">Unknown</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className={cn("text-sm", isDark ? "text-zinc-300" : "text-slate-600")}>{vps.user.name}</div>
                          <div className="text-xs text-zinc-500">{vps.user.email}</div>
                        </td>
                        <td className="p-4 text-sm font-mono max-w-[250px] truncate">
                          {vps.assignedIps?.length ? (
                            <div className="flex flex-col gap-1.5">
                              {vps.assignedIps.map((ip, idx) => (
                                <div key={idx} className="flex flex-wrap items-center gap-2">
                                  <div className={cn("flex items-center gap-1.5", isDark ? "text-zinc-300" : "text-slate-600")}>
                                    <span className={cn("inline-flex items-center justify-center p-0.5 rounded border", isDark ? "bg-zinc-800/50 border-zinc-700/50 text-zinc-400" : "bg-slate-100 border-slate-200 text-slate-500")} title="Local IP">
                                      <Network className="w-3.5 h-3.5" />
                                    </span>
                                    <span>{ip.ipAddress}</span>
                                  </div>
                                  {ip.publicIp && (
                                    <>
                                      <div className={cn("w-px h-3 hidden xl:block", isDark ? "bg-white/10" : "bg-black/10")}></div>
                                      <div className={cn("flex items-center gap-1.5", isDark ? "text-cyan-400" : "text-cyan-700")}>
                                        <span className={cn("inline-flex items-center justify-center p-0.5 rounded border", isDark ? "bg-cyan-900/30 border-cyan-800/50 text-cyan-500" : "bg-cyan-50 border-cyan-200 text-cyan-600")} title="Public IP">
                                          <Globe className="w-3.5 h-3.5" />
                                        </span>
                                        <span>{ip.publicIp}</span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-zinc-500">Unassigned</span>
                          )}
                        </td>
                        <td className="p-4">
                          {actionLoading === vps.id ? (
                            <div className="flex items-center gap-2 mb-1">
                              <RefreshCw className={cn("w-4 h-4 animate-spin", isDark ? "text-cyan-500" : "text-cyan-700")} />
                              <span className={cn("text-sm font-medium", isDark ? "text-cyan-400" : "text-cyan-700")}>Processing...</span>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`w-2 h-2 rounded-full ${vps.status === 'RUNNING' ? 'bg-emerald-500' :
                                  vps.status === 'STOPPED' ? 'bg-red-500' :
                                    vps.status === 'SUSPENDED' ? 'bg-orange-500' : 'bg-zinc-500'
                                  }`}></span>
                                <span className={cn("text-sm", isDark ? "text-zinc-300" : "text-slate-600")}>{vps.status}</span>
                              </div>
                              {vps.status === 'SUSPENDED' && (
                                <div className={cn("mb-2 px-2 py-1 bg-orange-500/10 border border-orange-500/20 rounded text-[10px] max-w-[180px] truncate", isDark ? "text-orange-400" : "text-orange-600")} title={vps.suspendReason || 'Suspended by system'}>
                                  {vps.suspendReason || 'Suspended by system'}
                                </div>
                              )}
                              <div className="mt-1">
                                <span className={cn("text-[10px] uppercase font-bold tracking-wider bg-cyan-400/10 border border-cyan-400/20 px-2 py-0.5 rounded-full whitespace-nowrap", isDark ? "text-cyan-400" : "text-cyan-700")}>
                                  PAYG Billing
                                </span>
                              </div>
                            </>
                          )}
                        </td>
                        <td className="p-4">
                          {actionLoading !== vps.id && (
                            <div className="flex flex-col">
                              <div className={cn("text-xs font-medium whitespace-nowrap", isDark ? "text-cyan-400" : "text-cyan-700")}>Rp {(vps.hourlyRate || 0).toLocaleString('id-ID')}/hr</div>
                              <div className={cn("text-[10px]", isDark ? "text-zinc-400" : "text-slate-500")}>Argo: Rp {((vps.accumulatedCost || 0) + (vps.reservedIps?.reduce((acc: number, ip: any) => acc + (ip.accumulatedCost || 0), 0) || 0)).toLocaleString('id-ID')}</div>
                            </div>
                          )}
                        </td>
                        <td className="p-4 align-middle">
                          <div className="flex items-center justify-end gap-2">
                            {actionLoading === vps.id ? (
                              <div className={cn("px-3 py-1 bg-white/10 rounded-lg text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Please wait</div>
                            ) : (
                              <>
                                {(vps.status === 'RUNNING' || vps.status === 'STOPPED') && (
                                  <>
                                    <button onClick={() => handleVpsAction(vps.id, "start")} disabled={vps.status === 'RUNNING'} title="Start" className={cn("p-2 rounded-lg transition-colors border disabled:opacity-30 disabled:cursor-not-allowed", isDark ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200")}><Play className="w-4 h-4" /></button>
                                    <button onClick={() => handleVpsAction(vps.id, "shutdown")} disabled={vps.status === 'STOPPED'} title="Shutdown" className={cn("p-2 rounded-lg transition-colors border disabled:opacity-30 disabled:cursor-not-allowed", isDark ? "bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border-orange-500/20" : "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200")}><Power className="w-4 h-4" /></button>
                                    <button onClick={() => handleVpsAction(vps.id, "stop")} disabled={vps.status === 'STOPPED'} title="Force Stop" className={cn("p-2 rounded-lg transition-colors border disabled:opacity-30 disabled:cursor-not-allowed", isDark ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20" : "bg-red-50 hover:bg-red-100 text-red-700 border-red-200")}><Square className="w-4 h-4" /></button>
                                    <button onClick={() => handleVpsAction(vps.id, "reboot")} disabled={vps.status === 'STOPPED'} title="Reboot" className={cn("p-2 rounded-lg transition-colors border disabled:opacity-30 disabled:cursor-not-allowed", isDark ? "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-200")}><RefreshCcw className="w-4 h-4" /></button>
                                  </>
                                )}
                                {vps.status === 'SUSPENDED' ? (
                                  <button onClick={() => handleVpsAction(vps.id, "unsuspend")} title="Unsuspend" className={cn("p-2 rounded-lg transition-colors border", isDark ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200")}><ShieldAlert className="w-4 h-4" /></button>
                                ) : (
                                  <button onClick={() => setShowSuspendModal(vps)} title="Suspend" className={cn("p-2 rounded-lg transition-colors border", isDark ? "bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border-orange-500/20" : "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200")}><ShieldAlert className="w-4 h-4" /></button>
                                )}
                                <button
                                  onClick={() => openConsole(vps.id)}
                                  disabled={consoleLoading === vps.id || vps.status === 'TERMINATED' || vps.status === 'PENDING' || vps.status === 'PROVISIONING'}
                                  title="Console"
                                  className={cn("p-2 rounded-lg transition-colors border ml-2 disabled:opacity-50", isDark ? "bg-zinc-500/10 hover:bg-zinc-500/20 border-zinc-500/20 text-zinc-300" : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700")}
                                >
                                  {consoleLoading === vps.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
                                </button>
                                <button onClick={() => handleOpenIpModal(vps)} title="Manage IPs" className={cn("p-2 rounded-lg transition-colors border ml-2", isDark ? "bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border-purple-500/20" : "bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200")}><Globe className="w-4 h-4" /></button>
                                <button onClick={() => setShowResetPasswordModal(vps)} title="Reset Password" className={cn("p-2 rounded-lg transition-colors border ml-2", isDark ? "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/20" : "bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-200")}><Key className="w-4 h-4" /></button>
                                <button onClick={() => setShowTerminateModal(vps)} title="Terminate" className={cn("p-2 rounded-lg transition-colors border ml-2", isDark ? "bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20" : "bg-red-50 hover:bg-red-100 text-red-700 border-red-200")}><Trash2 className="w-4 h-4" /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  {vpsServices.filter(v => (activeTab === "services" ? !v.kubernetesClusterId : !!v.kubernetesClusterId)).length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-zinc-500">
                        {activeTab === "services" ? "No VPS services found." : "No K3s nodes found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {!loadingServices && vpsServices.filter(v => (activeTab === "services" ? !v.kubernetesClusterId : !!v.kubernetesClusterId)).filter(v => v.hostname.includes(searchQuery) || v.user.email.includes(searchQuery)).length > vpsPerPage && (
            <div className={cn("px-6 py-4 border mt-4 rounded-2xl flex items-center justify-between glass", isDark ? "border-white/10" : "border-slate-200")}>
              <span className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
                Showing {((vpsCurrentPage - 1) * vpsPerPage) + 1} to {Math.min(vpsCurrentPage * vpsPerPage, vpsServices.filter(v => (activeTab === "services" ? !v.kubernetesClusterId : !!v.kubernetesClusterId)).filter(v => v.hostname.includes(searchQuery) || v.user.email.includes(searchQuery)).length)} of {vpsServices.filter(v => (activeTab === "services" ? !v.kubernetesClusterId : !!v.kubernetesClusterId)).filter(v => v.hostname.includes(searchQuery) || v.user.email.includes(searchQuery)).length} entries
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setVpsCurrentPage(p => Math.max(1, p - 1))}
                  disabled={vpsCurrentPage === 1}
                  className={cn("p-1 rounded hover:bg-white/10 disabled:opacity-50 transition-colors", isDark ? "text-white" : "text-slate-900")}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setVpsCurrentPage(p => Math.min(Math.ceil(vpsServices.filter(v => (activeTab === "services" ? !v.kubernetesClusterId : !!v.kubernetesClusterId)).filter(v => v.hostname.includes(searchQuery) || v.user.email.includes(searchQuery)).length / vpsPerPage), p + 1))}
                  disabled={vpsCurrentPage === Math.ceil(vpsServices.filter(v => (activeTab === "services" ? !v.kubernetesClusterId : !!v.kubernetesClusterId)).filter(v => v.hostname.includes(searchQuery) || v.user.email.includes(searchQuery)).length / vpsPerPage)}
                  className={cn("p-1 rounded hover:bg-white/10 disabled:opacity-50 transition-colors", isDark ? "text-white" : "text-slate-900")}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reserved IPs Tab */}
      {activeTab === "reserved-ips" && (
        <div className={cn("glass p-6 md:p-8 rounded-3xl border w-full", isDark ? "border-white/10" : "border-slate-200")}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h2 className={cn("text-2xl font-extrabold mb-2", isDark ? "text-white" : "text-slate-900")}>Reserved IPs Management</h2>
              <p className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>Monitor and edit reserved IPs allocated to users.</p>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search IP or user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn("w-full border focus:border-cyan-500/50 rounded-2xl py-3.5 pl-10 pr-4 placeholder-zinc-500 outline-none transition-all focus:ring-2 focus:ring-cyan-500/20 h-[48px]", isDark ? "bg-[#1e293b] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}
              />
            </div>
          </div>

          {loadingReservedIps ? (
            <div className="flex justify-center py-12">
              <RefreshCw className={cn("w-10 h-10 animate-spin", isDark ? "text-cyan-500" : "text-cyan-700")} />
            </div>
          ) : (
            <div className={cn("overflow-x-auto rounded-2xl border", isDark ? "border-white/10" : "border-slate-200")}>
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className={cn("bg-white/5 text-sm border-b", isDark ? "text-zinc-400 border-white/10" : "text-slate-500 border-slate-200")}>
                    <th className="p-4 font-medium whitespace-nowrap">IP Address</th>
                    <th className="p-4 font-medium whitespace-nowrap">Client</th>
                    <th className="p-4 font-medium whitespace-nowrap">IP Pool</th>
                    <th className="p-4 font-medium whitespace-nowrap">Status</th>
                    <th className="p-4 font-medium whitespace-nowrap">Service</th>
                    <th className="p-4 font-medium whitespace-nowrap text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {reservedIps
                    .filter((ip) =>
                      ip.ipAddress.includes(searchQuery) ||
                      (ip.publicIp || "").includes(searchQuery) ||
                      ip.user.email.includes(searchQuery) ||
                      ip.user.name.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .slice((reservedIpCurrentPage - 1) * reservedIpsPerPage, reservedIpCurrentPage * reservedIpsPerPage)
                    .map((ip) => (
                      <tr key={ip.id} className={`${isDark ? "hover:bg-white/5" : "hover:bg-slate-50"} transition-colors ${reservedIpActionLoading === ip.id ? 'opacity-50 animate-pulse' : ''}`}>
                        <td className={cn("p-4 font-mono text-sm", isDark ? "text-cyan-400" : "text-cyan-700")}>
                          {editingReservedIpId === ip.id ? (
                            <div>
                              <div>{ip.ipAddress} <span className={cn("text-xs text-zinc-500 border rounded px-1 ml-1", isDark ? "border-zinc-700 bg-zinc-800" : "border-slate-200 bg-slate-100")}>Local</span></div>
                              <div className="flex items-center gap-2 mt-2">
                                <input
                                  type="text"
                                  value={editingReservedIpValue}
                                  onChange={(e) => setEditingReservedIpValue(e.target.value)}
                                  className={cn("border rounded-lg px-2 py-1.5 text-sm focus:outline-none transition-colors w-40", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C] focus:border-cyan-500/50" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50 focus:border-cyan-500")}
                                  placeholder="e.g. 10.0.0.5"
                                />
                                <button
                                  onClick={() => handleSaveReservedIp(ip.id, editingReservedIpValue)}
                                  className="text-green-400 hover:text-green-300 p-1.5 bg-green-400/10 rounded-lg transition-colors"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingReservedIpId(null);
                                    setEditingReservedIpValue("");
                                  }}
                                  className={cn("hover:text-red-300 p-1.5 bg-red-400/10 rounded-lg transition-colors", isDark ? "text-red-400" : "text-red-700")}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="flex items-center gap-1.5">
                                <span className={cn("inline-flex items-center justify-center p-0.5 rounded border", isDark ? "bg-zinc-800 text-zinc-400 border-zinc-700" : "bg-slate-100 text-slate-500 border-slate-200")} title="Local IP">
                                  <Network className="w-3.5 h-3.5" />
                                </span>
                                <span>{ip.ipAddress}</span>
                              </div>
                              {ip.publicIp && (
                                <>
                                  <div className={cn("w-px h-3 hidden sm:block", isDark ? "bg-white/10" : "bg-black/10")}></div>
                                  <div className={cn("flex items-center gap-1.5", isDark ? "text-white" : "text-slate-900")}>
                                    <span className={cn("inline-flex items-center justify-center p-0.5 rounded border", isDark ? "bg-cyan-900/30 border-cyan-800/50 text-cyan-500" : "bg-cyan-50 border-cyan-200 text-cyan-600")} title="Public IP">
                                      <Globe className="w-3.5 h-3.5" />
                                    </span>
                                    <span>{ip.publicIp}</span>
                                    <button 
                                      onClick={() => handleSaveReservedIp(ip.id, "")}
                                      className={cn("p-1 -ml-0.5 rounded-full transition-colors", isDark ? "text-red-400 hover:bg-white/10" : "text-red-600 hover:bg-black/5")}
                                      title="Remove Public IP"
                                      disabled={reservedIpActionLoading === ip.id}
                                    >
                                      {reservedIpActionLoading === ip.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <X className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className={cn("text-sm", isDark ? "text-zinc-300" : "text-slate-600")}>{ip.user.name}</div>
                          <div className="text-xs text-zinc-500">{ip.user.email}</div>
                        </td>
                        <td className="p-4">
                          <div className={cn("text-sm", isDark ? "text-zinc-300" : "text-slate-600")}>{ip.ipPool.network}</div>
                          <div className="text-xs text-zinc-500">GW: {ip.ipPool.gateway}</div>
                        </td>
                        <td className="p-4">
                          {ip.isAttached ? (
                            <span className={cn("text-xs px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full font-medium", isDark ? "text-cyan-400" : "text-cyan-700")}>Attached</span>
                          ) : (
                            <span className={cn("text-xs px-2 py-1 bg-zinc-500/10 border border-zinc-500/20 rounded-full font-medium", isDark ? "text-zinc-400" : "text-slate-500")}>Unattached</span>
                          )}
                        </td>
                        <td className="p-4">
                          {ip.isAttached && ip.vps ? (
                            <div className={cn("text-sm truncate max-w-[150px]", isDark ? "text-zinc-300" : "text-slate-600")} title={ip.vps.hostname}>{ip.vps.hostname}</div>
                          ) : (
                            <span className="text-zinc-600">-</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {reservedIpActionLoading !== ip.id && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditingReservedIpId(ip.id);
                                  setEditingReservedIpValue(ip.publicIp || "");
                                }}
                                title="Edit Public IP"
                                className={cn("p-2 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-lg transition-colors border border-cyan-500/20", isDark ? "text-cyan-400" : "text-cyan-700")}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteReservedIp(ip.id)}
                                title="Delete"
                                className={cn("p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/20", isDark ? "text-red-500" : "text-red-700")}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  {reservedIps.filter((ip) => ip.ipAddress.includes(searchQuery) || (ip.publicIp || "").includes(searchQuery) || ip.user.email.includes(searchQuery) || ip.user.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-zinc-500">
                        No reserved IPs found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {!loadingReservedIps && reservedIps.filter((ip) => ip.ipAddress.includes(searchQuery) || (ip.publicIp || "").includes(searchQuery) || ip.user.email.includes(searchQuery) || ip.user.name.toLowerCase().includes(searchQuery.toLowerCase())).length > reservedIpsPerPage && (
            <div className={cn("px-6 py-4 border mt-4 rounded-2xl flex items-center justify-between glass", isDark ? "border-white/10" : "border-slate-200")}>
              <span className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
                Showing {((reservedIpCurrentPage - 1) * reservedIpsPerPage) + 1} to {Math.min(reservedIpCurrentPage * reservedIpsPerPage, reservedIps.filter((ip) => ip.ipAddress.includes(searchQuery) || (ip.publicIp || "").includes(searchQuery) || ip.user.email.includes(searchQuery) || ip.user.name.toLowerCase().includes(searchQuery.toLowerCase())).length)} of {reservedIps.filter((ip) => ip.ipAddress.includes(searchQuery) || (ip.publicIp || "").includes(searchQuery) || ip.user.email.includes(searchQuery) || ip.user.name.toLowerCase().includes(searchQuery.toLowerCase())).length} entries
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setReservedIpCurrentPage(p => Math.max(1, p - 1))}
                  disabled={reservedIpCurrentPage === 1}
                  className={cn("p-1 rounded hover:bg-white/10 disabled:opacity-50 transition-colors", isDark ? "text-white" : "text-slate-900")}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setReservedIpCurrentPage(p => Math.min(Math.ceil(reservedIps.filter((ip) => ip.ipAddress.includes(searchQuery) || (ip.publicIp || "").includes(searchQuery) || ip.user.email.includes(searchQuery) || ip.user.name.toLowerCase().includes(searchQuery.toLowerCase())).length / reservedIpsPerPage), p + 1))}
                  disabled={reservedIpCurrentPage === Math.ceil(reservedIps.filter((ip) => ip.ipAddress.includes(searchQuery) || (ip.publicIp || "").includes(searchQuery) || ip.user.email.includes(searchQuery) || ip.user.name.toLowerCase().includes(searchQuery.toLowerCase())).length / reservedIpsPerPage)}
                  className={cn("p-1 rounded hover:bg-white/10 disabled:opacity-50 transition-colors", isDark ? "text-white" : "text-slate-900")}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}      {/* Suspend VPS Modal */}
      {showSuspendModal && (
        <div className={cn("fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm", isDark ? "bg-black/80" : "bg-slate-900/40")}>
          <div className={cn("border border-orange-500/20 w-full max-w-md rounded-3xl p-6 relative shadow-2xl", isDark ? "bg-[#0f172a]" : "bg-white border-slate-200")}>
            <button onClick={() => setShowSuspendModal(null)} className={cn("absolute top-4 right-4 transition-colors", isDark ? "text-zinc-500 hover:text-white" : "text-slate-400 hover:text-slate-900")}><XCircle className="w-6 h-6" /></button>
            <div className="flex items-center gap-3 mb-4 text-orange-500">
              <AlertTriangle className="w-8 h-8" />
              <h2 className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>Suspend VPS</h2>
            </div>
            <p className={cn("text-sm mb-4", isDark ? "text-zinc-400" : "text-slate-500")}>You are about to suspend <strong>{showSuspendModal.hostname}</strong> belonging to {showSuspendModal.user.email}. This will power off the VM.</p>
            <div className="mb-6">
              <label className={cn("block text-sm font-medium mb-2", isDark ? "text-zinc-300" : "text-slate-600")}>Reason for Suspension</label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g. Overdue payment, Abuse detected..."
                className={cn("w-full border rounded-xl px-4 py-3 focus:border-orange-500/50 outline-none min-h-[100px]", isDark ? "bg-[#1e293b] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowSuspendModal(null)} className={cn("px-5 py-2.5 rounded-xl transition-colors", isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100")}>Cancel</button>
              <button onClick={() => handleVpsAction(showSuspendModal.id, "suspend", suspendReason)} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-medium transition-colors">Confirm Suspend</button>
            </div>
          </div>
        </div>
      )}

      {/* Terminate Modal */}
      <ConfirmModal
        isOpen={!!showTerminateModal}
        onClose={() => setShowTerminateModal(null)}
        onConfirm={() => showTerminateModal && handleVpsAction(showTerminateModal.id, "terminate")}
        title="Terminate VPS"
        description={`You are about to permanently destroy ${showTerminateModal?.hostname}. The VM will be deleted from Proxmox and all data will be lost. This action CANNOT be undone.`}
        confirmText="Terminate"
        cancelText="Cancel"
        variant="danger"
        isLoading={actionLoading === showTerminateModal?.id}
      />

      {/* Bulk Terminate Modal */}
      <ConfirmModal
        isOpen={showBulkTerminateModal.length > 0}
        onClose={() => setShowBulkTerminateModal([])}
        onConfirm={handleBulkTerminate}
        title="Bulk Terminate VPS"
        description={`You are about to permanently destroy ${showBulkTerminateModal.length} selected VPS. The VMs will be deleted from Proxmox and all data will be lost. This action CANNOT be undone.`}
        confirmText="Terminate All"
        cancelText="Cancel"
        variant="danger"
        isLoading={bulkActionLoading}
      />

      {/* Delete Pool Modal */}
      {showDeletePoolModal !== null && (
        <div className={cn("fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm", isDark ? "bg-black/80" : "bg-slate-900/40")}>
          <div className={cn("border w-full max-w-md rounded-3xl p-6 relative shadow-2xl", isDark ? "bg-[#0f172a] border-red-500/30" : "bg-white border-red-500/30")}>
            <button onClick={() => setShowDeletePoolModal(null)} className={cn("absolute top-4 right-4 transition-colors", isDark ? "text-zinc-500 hover:text-white" : "text-slate-400 hover:text-slate-900")}><XCircle className="w-6 h-6" /></button>
            <div className={cn("flex items-center gap-3 mb-4", isDark ? "text-red-500" : "text-red-700")}>
              <Trash2 className="w-8 h-8" />
              <h2 className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>Delete IP Pool</h2>
            </div>
            <div className={cn("border rounded-xl p-4 mb-6", isDark ? "bg-red-500/10 border-red-500/20" : "bg-red-50 border-red-200")}>
              <p className={cn("text-sm font-medium mb-1", isDark ? "text-red-400" : "text-red-700")}>WARNING</p>
              <p className={cn("text-xs", isDark ? "text-red-300/80" : "text-red-800/80")}>Are you sure you want to delete this IP pool? All available IPs from this pool will be removed from the system. Assigned IPs will remain on the VPS but their pool association will be lost.</p>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeletePoolModal(null)} className={cn("px-5 py-2.5 rounded-xl transition-colors", isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100")}>Cancel</button>
              <button onClick={() => handleDeletePool(showDeletePoolModal)} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Pool Modal */}
      {showBulkDeletePoolModal.length > 0 && (
        <div className={cn("fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm", isDark ? "bg-black/80" : "bg-slate-900/40")}>
          <div className={cn("border w-full max-w-md rounded-3xl p-6 relative shadow-2xl", isDark ? "bg-[#0f172a] border-red-500/30" : "bg-white border-red-500/30")}>
            <button onClick={() => setShowBulkDeletePoolModal([])} className={cn("absolute top-4 right-4 transition-colors", isDark ? "text-zinc-500 hover:text-white" : "text-slate-400 hover:text-slate-900")}><XCircle className="w-6 h-6" /></button>
            <div className={cn("flex items-center gap-3 mb-4", isDark ? "text-red-500" : "text-red-700")}>
              <Trash2 className="w-8 h-8" />
              <h2 className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>Bulk Delete IP Pools</h2>
            </div>
            <div className={cn("border rounded-xl p-4 mb-6", isDark ? "bg-red-500/10 border-red-500/20" : "bg-red-50 border-red-200")}>
              <p className={cn("text-sm font-medium mb-1", isDark ? "text-red-400" : "text-red-700")}>WARNING</p>
              <p className={cn("text-xs", isDark ? "text-red-300/80" : "text-red-800/80")}>You are about to delete <strong>{showBulkDeletePoolModal.length} selected IP pools</strong>. All available IPs from these pools will be removed from the system.</p>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowBulkDeletePoolModal([])} className={cn("px-5 py-2.5 rounded-xl transition-colors", isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100")}>Cancel</button>
              <button onClick={handleBulkDeletePools} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors">Delete All</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Plan Modal */}
      {showDeletePlanModal !== null && (
        <div className={cn("fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm", isDark ? "bg-black/80" : "bg-slate-900/40")}>
          <div className={cn("border w-full max-w-md rounded-3xl p-6 relative shadow-2xl", isDark ? "bg-[#0f172a] border-red-500/30" : "bg-white border-red-500/30")}>
            <button onClick={() => setShowDeletePlanModal(null)} className={cn("absolute top-4 right-4 transition-colors", isDark ? "text-zinc-500 hover:text-white" : "text-slate-400 hover:text-slate-900")}><XCircle className="w-6 h-6" /></button>
            <div className={cn("flex items-center gap-3 mb-4", isDark ? "text-red-500" : "text-red-700")}>
              <Trash2 className="w-8 h-8" />
              <h2 className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>Delete Fixed Plan</h2>
            </div>
            <div className={cn("border rounded-xl p-4 mb-6", isDark ? "bg-red-500/10 border-red-500/20" : "bg-red-50 border-red-200")}>
              <p className={cn("text-sm font-medium mb-1", isDark ? "text-red-400" : "text-red-700")}>WARNING</p>
              <p className={cn("text-xs", isDark ? "text-red-300/80" : "text-red-800/80")}>Are you sure you want to delete this plan? This action cannot be undone.</p>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeletePlanModal(null)} className={cn("px-5 py-2.5 rounded-xl transition-colors", isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100")}>Cancel</button>
              <button onClick={() => handleDeletePlan(showDeletePlanModal)} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* IP Management Modal */}
      {showIpModal && (
        <div className={cn("fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm", isDark ? "bg-black/80" : "bg-slate-900/40")}>
          <div className={cn("border w-full max-w-3xl rounded-3xl relative flex flex-col max-h-[90vh]", isDark ? "bg-[#0f172a] border-white/10" : "bg-white border-slate-200")}>
            <div className={cn("p-6 border-b", isDark ? "border-white/10" : "border-slate-200")}>
              <button onClick={() => setShowIpModal(null)} className={cn("absolute top-6 right-6 transition-colors", isDark ? "text-zinc-500 hover:text-white" : "text-slate-400 hover:text-slate-900")}><XCircle className="w-6 h-6" /></button>
              <div className="flex items-center gap-3">
                <Globe className={cn("w-8 h-8", isDark ? "text-cyan-400" : "text-cyan-700")} />
                <div>
                  <h2 className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>IP Management</h2>
                  <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Manage IP Addresses for {showIpModal.hostname}</p>
                </div>
              </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Available IPs */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-900")}>Available IPs</h3>
                    {ipLoading && <RefreshCw className={cn("w-4 h-4 animate-spin", isDark ? "text-cyan-500" : "text-cyan-700")} />}
                  </div>

                  {/* Version filter tabs */}
                  <div className="flex gap-2 mb-3">
                    {(["all", "ipv4", "ipv6"] as const).map(v => (
                      <button
                        key={v}
                        onClick={() => setIpVersionFilter(v)}
                        className={cn(
                          "px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                          ipVersionFilter === v
                            ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                            : "bg-white/5 text-zinc-400 hover:bg-white/10 border border-transparent"
                        )}
                      >
                        {v === "all" ? "All" : v.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  {/* Search filter */}
                  <div className="relative mb-3">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      value={ipFilter}
                      onChange={(e) => setIpFilter(e.target.value)}
                      placeholder="Search IP..."
                      className={cn("w-full border rounded-xl py-2 pl-9 pr-3 text-sm placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50", isDark ? "bg-[#1e293b] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}
                    />
                  </div>

                  {/* IP List */}
                  <div className={cn("border rounded-xl overflow-hidden", isDark ? "bg-[#1e293b] border-white/10" : "bg-slate-100 border-slate-200")} style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {(() => {
                      const filtered = availableIps.filter(ip => {
                        if (ipVersionFilter === "ipv4" && ip.version !== 4) return false;
                        if (ipVersionFilter === "ipv6" && ip.version !== 6) return false;
                        if (ipFilter && !ip.ip.includes(ipFilter)) return false;
                        return true;
                      });
                      if (filtered.length === 0) {
                        return <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">No available IPs found.</div>;
                      }
                      return (
                        <ul className={cn("divide-y", isDark ? "divide-white/5" : "divide-slate-200")}>
                          {filtered.map(ip => (
                            <li key={`${ip.poolId}-${ip.ip}`} className="px-3 py-2 flex items-center justify-between hover:bg-white/5 transition-colors group">
                              <div>
                                <span className={cn("text-sm font-mono", isDark ? "text-white" : "text-slate-900")}>{ip.ip}</span>
                                <span className="text-xs text-zinc-500 ml-2">({ip.poolNetwork})</span>
                              </div>
                              <button
                                onClick={() => assignIp(ip.ip)}
                                disabled={ipLoading}
                                className="opacity-0 group-hover:opacity-100 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 font-semibold disabled:opacity-50 px-3 py-1 rounded-md text-xs shadow-sm transition-all"
                              >
                                Assign
                              </button>
                            </li>
                          ))}
                        </ul>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">
                    {availableIps.length} IP(s) available from your IP Pools. Click Assign to add.
                  </p>
                </div>

                {/* Right: Assigned IPs */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-900")}>Assigned IPs <span className={cn("font-normal", isDark ? "text-cyan-400" : "text-cyan-700")}>({assignedIps.length})</span></h3>
                  </div>
                  <div className={cn("border rounded-xl overflow-hidden", isDark ? "bg-[#1e293b] border-white/10" : "bg-slate-100 border-slate-200")} style={{ maxHeight: '380px', overflowY: 'auto' }}>
                    {assignedIps.length > 0 ? (
                      <ul className={cn("divide-y", isDark ? "divide-white/5" : "divide-slate-200")}>
                        {assignedIps.map(ip => (
                          <li key={ip.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/5 transition-all border-l-2 border-transparent hover:border-cyan-500">
                            {editingPublicIpId === ip.id ? (
                              <div className="w-full flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                                <div className="text-zinc-500 text-xs font-medium uppercase tracking-wider shrink-0 hidden sm:block">Public IP</div>
                                <input
                                  type="text"
                                  value={editingPublicIpValue}
                                  onChange={(e) => setEditingPublicIpValue(e.target.value)}
                                  placeholder="e.g. 103.x.x.x (Optional)"
                                  className={cn("w-full sm:flex-1 border rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none transition-colors", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C] focus:border-cyan-500/50" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50 focus:border-cyan-500")}
                                />
                                <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                  <button
                                    onClick={() => handleSavePublicIp(ip.id, editingPublicIpValue)}
                                    disabled={ipLoading}
                                    className="flex-1 sm:flex-none flex justify-center text-green-400 hover:text-white hover:bg-green-500 p-2 bg-green-400/10 rounded-lg transition-all"
                                    title="Save Public IP"
                                  >
                                    <Save className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => { setEditingPublicIpId(null); setEditingPublicIpValue(""); }}
                                    disabled={ipLoading}
                                    className={cn("flex-1 sm:flex-none flex justify-center hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all", isDark ? "text-zinc-400" : "text-slate-500")}
                                    title="Cancel"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5">
                                    <span className={cn("text-sm font-mono font-medium", isDark ? "text-white" : "text-slate-900")}>{ip.ipAddress}</span>
                                    {ip.publicIp && (
                                      <span className={cn("inline-flex items-center gap-1 bg-cyan-500/10 text-[10px] font-mono px-2 py-0.5 rounded-full border border-cyan-500/20 w-fit", isDark ? "text-cyan-400" : "text-cyan-700")}>
                                        <Globe className="w-3 h-3" />
                                        {ip.publicIp}
                                      </span>
                                    )}
                                  </div>
                                  {ip.ipPool && (
                                    <div className="text-xs text-zinc-500 mt-1.5 flex items-center gap-1.5">
                                      <Network className="w-3 h-3 opacity-70" />
                                      <span className="truncate">Pool: {ip.ipPool.network}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 mt-2 sm:mt-0">
                                  <button
                                    onClick={() => { setEditingPublicIpId(ip.id); setEditingPublicIpValue(ip.publicIp || ""); }}
                                    disabled={ipLoading}
                                    className={cn("hover:text-white hover:bg-cyan-500 p-2 bg-cyan-400/10 rounded-lg transition-all", isDark ? "text-cyan-400" : "text-cyan-700")}
                                    title="Edit Public IP"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setRemoveIpConfirm(ip.id)}
                                    disabled={ipLoading}
                                    className={cn("hover:text-white hover:bg-red-500 p-2 bg-red-400/10 rounded-lg transition-all", isDark ? "text-red-400" : "text-red-700")}
                                    title="Remove IP"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </div>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">
                        No IP addresses assigned.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className={cn("p-6 border-t flex justify-end", isDark ? "border-white/10" : "border-slate-200")}>
              <button onClick={() => setShowIpModal(null)} className={cn("px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors", isDark ? "text-white" : "text-slate-900")}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && (
        <div className={cn("fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm", isDark ? "bg-black/80" : "bg-slate-900/40")}>
          <div className={cn("border w-full max-w-md rounded-3xl p-6 relative shadow-2xl", isDark ? "bg-[#0f172a] border-cyan-500/30" : "bg-white border-cyan-500/30")}>
            <button onClick={() => { setShowResetPasswordModal(null); setNewPassword(""); setConfirmPassword(""); }} className={cn("absolute top-4 right-4 transition-colors", isDark ? "text-zinc-500 hover:text-white" : "text-slate-400 hover:text-slate-900")}><XCircle className="w-6 h-6" /></button>
            <div className={cn("flex items-center gap-3 mb-4", isDark ? "text-cyan-500" : "text-cyan-700")}>
              <Key className="w-8 h-8" />
              <h2 className={cn("text-xl font-bold", isDark ? "text-white" : "text-slate-900")}>Reset Password</h2>
            </div>
            <p className={cn("text-sm mb-4", isDark ? "text-zinc-400" : "text-slate-500")}>Set a new root password for <strong>{showResetPasswordModal.hostname}</strong>. The VM will need to be rebooted for changes to apply.</p>
            <div className="mb-4">
              <label className={cn("block text-sm font-medium mb-2", isDark ? "text-zinc-300" : "text-slate-600")}>New Root Password</label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new strong password"
                className={cn("w-full border rounded-xl px-4 py-3 focus:border-cyan-500/50 outline-none", isDark ? "bg-[#1e293b] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}
              />
            </div>
            <div className="mb-6">
              <label className={cn("block text-sm font-medium mb-2", isDark ? "text-zinc-300" : "text-slate-600")}>Retype Password</label>
              <input
                type="text"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Retype your new password"
                className={cn("w-full border rounded-xl px-4 py-3 focus:border-cyan-500/50 outline-none", isDark ? "bg-[#1e293b] border-white/10 text-white" : "bg-white border-slate-200 text-slate-900")}
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className={cn("text-xs mt-2", isDark ? "text-red-500" : "text-red-700")}>Passwords do not match.</p>
              )}
              {(!confirmPassword || newPassword === confirmPassword) && (
                <p className="text-xs text-zinc-500 mt-2">Minimum 8 characters, must contain letters and numbers.</p>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowResetPasswordModal(null); setNewPassword(""); setConfirmPassword(""); }} className={cn("px-5 py-2.5 rounded-xl transition-colors", isDark ? "text-zinc-400 hover:text-white hover:bg-white/5" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100")}>Cancel</button>
              <button
                onClick={() => handleResetPassword(showResetPasswordModal.id, newPassword)}
                disabled={actionLoading === showResetPasswordModal.id || !newPassword || newPassword.length < 8 || newPassword !== confirmPassword}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-2 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm"
              >
                {actionLoading === showResetPasswordModal.id && <RefreshCw className="w-4 h-4 animate-spin" />}
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={removeIpConfirm !== null}
        title="Remove IP Address"
        description="Are you sure you want to remove this IP? The VPS will instantly lose access to it via Proxmox Firewall."
        onConfirm={executeRemoveIp}
        onClose={() => setRemoveIpConfirm(null)}
      />
    </div>
  );
}
