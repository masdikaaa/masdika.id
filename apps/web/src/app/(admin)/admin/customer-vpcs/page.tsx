"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Boxes,
  Network,
  Server,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  Unplug,
  Plug,
  Link2,
  CheckCircle,
  AlertTriangle,
  Info,
  ShieldAlert,
  Search,
  Users,
  User,
  ArrowRightLeft,
  ChevronRight,
  ExternalLink,
  SlidersHorizontal,
  X,
  Layers,
  Globe,
  Radio,
  Share2,
  Check,
  AlertCircle
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Select } from "@/components/ui/Select";
import { motion, AnimatePresence } from "framer-motion";
import { AdminLoader } from "@/components/admin/AdminLoader";

interface CustomerUser {
  id: number;
  name: string;
  email: string;
  avatar?: string | null;
  role?: string;
  vpcCount?: number;
  vpsCount?: number;
}

interface AttachedVm {
  id: number;
  hostname: string;
  vpcIp: string;
  status: string;
  vmid: number | null;
  node: string;
}

interface VpcNetwork {
  id: number;
  name: string;
  description: string | null;
  cidr: string;
  gateway: string;
  vlanId: number;
  isNatEnabled: boolean;
  status: string;
  userId: number;
  routerId: number;
  createdAt: string;
  lastUsedAt: string;
  user: CustomerUser | null;
  router: {
    id: number;
    name: string;
    host: string;
    proxmoxBridge: string;
  } | null;
  vpsServices: AttachedVm[];
  peeringsA: any[];
  peeringsB: any[];
  _count: {
    vpsServices: number;
    peeringsA: number;
    peeringsB: number;
  };
}

interface VpcPeering {
  id: number;
  status: string;
  description: string | null;
  createdAt: string;
  vpcA: {
    id: number;
    name: string;
    cidr: string;
    gateway: string;
    vlanId: number;
    userId: number;
    user: CustomerUser | null;
    router?: { id: number; name: string; host: string } | null;
  };
  vpcB: {
    id: number;
    name: string;
    cidr: string;
    gateway: string;
    vlanId: number;
    userId: number;
    user: CustomerUser | null;
    router?: { id: number; name: string; host: string } | null;
  };
}

interface AvailableVm {
  id: number;
  vmid: number;
  hostname: string;
  node: string;
  status: string;
  cpuCores: number;
  ramGb: number;
  diskGb: number;
}

export default function AdminCustomerVpcsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Data states
  const [vpcs, setVpcs] = useState<VpcNetwork[]>([]);
  const [peerings, setPeerings] = useState<VpcPeering[]>([]);
  const [customers, setCustomers] = useState<CustomerUser[]>([]);
  const [stats, setStats] = useState({
    totalVpcs: 0,
    totalPeerings: 0,
    totalAttachedVms: 0,
    totalCustomers: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter & Search states
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"vpcs" | "peerings" | "vms">("vpcs");

  // Modals
  const [manageVmsModal, setManageVmsModal] = useState<VpcNetwork | null>(null);
  const [attachVmModal, setAttachVmModal] = useState<VpcNetwork | null>(null);
  const [availableVms, setAvailableVms] = useState<AvailableVm[]>([]);
  const [loadingAvailableVms, setLoadingAvailableVms] = useState(false);
  const [attachForm, setAttachForm] = useState({
    vpsId: "",
    privateIpAddress: "",
    forceDbOnly: false,
  });

  const [detachVmModal, setDetachVmModal] = useState<{
    vpc: VpcNetwork;
    vm: AttachedVm;
    forceDbOnly: boolean;
  } | null>(null);

  const [deleteVpcModal, setDeleteVpcModal] = useState<{
    vpc: VpcNetwork;
    forceDbOnly: boolean;
    detachVmsFirst: boolean;
  } | null>(null);

  const [createPeeringModal, setCreatePeeringModal] = useState<{
    customerId: number;
    vpcAId: string;
    vpcBId: string;
    description: string;
    forceDbOnly: boolean;
  } | null>(null);

  const [unpeerModal, setUnpeerModal] = useState<{
    peering: VpcPeering;
    forceDbOnly: boolean;
  } | null>(null);

  // Submitting states
  const [actionLoading, setActionLoading] = useState(false);
  const [togglingNatId, setTogglingNatId] = useState<number | null>(null);

  // Fetch all data
  const fetchData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const url = new URL("/api/admin/customer-vpcs", window.location.origin);
      if (selectedCustomerId !== "all") {
        url.searchParams.set("customerId", selectedCustomerId);
      }
      if (searchQuery.trim()) {
        url.searchParams.set("search", searchQuery.trim());
      }

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setVpcs(data.vpcs || []);
        setPeerings(data.peerings || []);
        setCustomers(data.customers || []);
        if (data.stats) setStats(data.stats);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to load customer VPCs");
      }
    } catch {
      toast.error("Network error while loading data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCustomerId]);

  // Load available VMs when attach modal opens
  const openAttachVm = async (vpc: VpcNetwork) => {
    setAttachVmModal(vpc);
    setLoadingAvailableVms(true);
    setAttachForm({
      vpsId: "",
      privateIpAddress: "",
      forceDbOnly: false,
    });

    try {
      const res = await fetch(`/api/admin/customer-vpcs/available-vms?customerId=${vpc.userId}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableVms(data);
      }
    } catch {
      toast.error("Failed to load available VMs");
    } finally {
      setLoadingAvailableVms(false);
    }
  };

  // Auto calculate suggested IP when attach modal opens or VPC is selected
  useEffect(() => {
    if (attachVmModal) {
      const vpc = attachVmModal;
      const baseParts = (vpc.gateway || "10.0.0.1").split(".");
      const usedIps = new Set(vpc.vpsServices?.map((v) => v.vpcIp) || []);
      usedIps.add(vpc.gateway);

      let suggested = "";
      for (let i = 2; i <= 254; i++) {
        const candidate = `${baseParts[0]}.${baseParts[1]}.${baseParts[2]}.${i}`;
        if (!usedIps.has(candidate)) {
          suggested = candidate;
          break;
        }
      }
      setAttachForm((prev) => ({ ...prev, privateIpAddress: suggested }));
    }
  }, [attachVmModal]);

  // Handle Attach VM Submit
  const handleAttachVm = async () => {
    if (!attachVmModal || !attachForm.vpsId) {
      toast.error("Please select a VM to attach");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/customer-vpcs/${attachVmModal.id}/attach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attachForm),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "VM attached successfully");
        setAttachVmModal(null);
        fetchData();
        // Also refresh manageVmsModal if currently open
        if (manageVmsModal && manageVmsModal.id === attachVmModal.id) {
          const updatedVpc = vpcs.find((v) => v.id === attachVmModal.id);
          if (updatedVpc) setManageVmsModal(updatedVpc);
        }
      } else {
        toast.error(data.error || "Failed to attach VM");
      }
    } catch {
      toast.error("Error executing attach operation");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Detach VM Submit
  const handleDetachVm = async () => {
    if (!detachVmModal) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/customer-vpcs/${detachVmModal.vpc.id}/detach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vpsId: detachVmModal.vm.id,
          forceDbOnly: detachVmModal.forceDbOnly,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "VM detached successfully");
        const targetVpcId = detachVmModal.vpc.id;
        const targetVmId = detachVmModal.vm.id;
        setDetachVmModal(null);

        // Update local state immediately for snappy response
        setVpcs((prev) =>
          prev.map((v) => {
            if (v.id === targetVpcId) {
              const updatedVms = v.vpsServices.filter((vm) => vm.id !== targetVmId);
              return {
                ...v,
                vpsServices: updatedVms,
                _count: { ...v._count, vpsServices: updatedVms.length },
              };
            }
            return v;
          })
        );

        if (manageVmsModal && manageVmsModal.id === targetVpcId) {
          setManageVmsModal((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              vpsServices: prev.vpsServices.filter((vm) => vm.id !== targetVmId),
            };
          });
        }

        fetchData();
      } else {
        toast.error(data.error || "Failed to detach VM");
      }
    } catch {
      toast.error("Error executing detach operation");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete VPC Submit
  const handleDeleteVpc = async () => {
    if (!deleteVpcModal) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/customer-vpcs/${deleteVpcModal.vpc.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          forceDbOnly: deleteVpcModal.forceDbOnly,
          detachVmsFirst: deleteVpcModal.detachVmsFirst,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "VPC deleted successfully");
        setDeleteVpcModal(null);
        fetchData();
      } else {
        toast.error(data.error || "Failed to delete VPC");
      }
    } catch {
      toast.error("Error deleting VPC");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle NAT Toggle
  const handleToggleNat = async (vpc: VpcNetwork) => {
    setTogglingNatId(vpc.id);
    try {
      const res = await fetch(`/api/admin/customer-vpcs/${vpc.id}/nat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isNatEnabled: !vpc.isNatEnabled }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "NAT setting updated");
        setVpcs((prev) =>
          prev.map((v) => (v.id === vpc.id ? { ...v, isNatEnabled: data.isNatEnabled } : v))
        );
      } else {
        toast.error(data.error || "Failed to toggle NAT");
      }
    } catch {
      toast.error("Error toggling NAT");
    } finally {
      setTogglingNatId(null);
    }
  };

  // Handle Create Peering Submit
  const handleCreatePeering = async () => {
    if (!createPeeringModal || !createPeeringModal.vpcAId || !createPeeringModal.vpcBId) {
      toast.error("Please select two VPCs to peer");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/customer-vpcs/peering", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createPeeringModal),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Peering created successfully");
        setCreatePeeringModal(null);
        fetchData();
      } else {
        toast.error(data.error || "Failed to create peering");
      }
    } catch {
      toast.error("Error creating peering");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Unpeer Submit
  const handleUnpeer = async () => {
    if (!unpeerModal) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/customer-vpcs/peering/${unpeerModal.peering.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceDbOnly: unpeerModal.forceDbOnly }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Peering deleted successfully");
        setUnpeerModal(null);
        fetchData();
      } else {
        toast.error(data.error || "Failed to remove peering");
      }
    } catch {
      toast.error("Error removing peering");
    } finally {
      setActionLoading(false);
    }
  };

  // Currently isolated customer object
  const currentIsolatedCustomer = useMemo(() => {
    if (selectedCustomerId === "all") return null;
    return customers.find((c) => String(c.id) === selectedCustomerId) || null;
  }, [selectedCustomerId, customers]);

  // Customer dropdown options
  const customerOptions = useMemo(() => {
    const list = [
      {
        value: "all",
        label: "🌐 All Customers (Platform Global View)",
      },
    ];

    customers.forEach((c) => {
      list.push({
        value: String(c.id),
        label: `👤 ${c.name} (${c.email}) • ${c.vpcCount || 0} VPCs, ${c.vpsCount || 0} VMs`,
      });
    });

    return list;
  }, [customers]);

  // All connected VMs across VPCs (for Tab 3)
  const allConnectedVms = useMemo(() => {
    const list: {
      vm: AttachedVm;
      vpc: VpcNetwork;
      customer: CustomerUser | null;
    }[] = [];

    vpcs.forEach((vpc) => {
      vpc.vpsServices?.forEach((vm) => {
        list.push({
          vm,
          vpc,
          customer: vpc.user,
        });
      });
    });

    return list;
  }, [vpcs]);

  // Filtered VPCs for peering modal
  const customerVpcsForPeering = useMemo(() => {
    if (!createPeeringModal) return [];
    return vpcs.filter((v) => v.userId === createPeeringModal.customerId);
  }, [createPeeringModal, vpcs]);

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={cn("text-2xl md:text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Customer VPC Management
          </h1>
          <p className={cn("text-sm font-medium mt-1", isDark ? "text-zinc-400" : "text-slate-500")}>
            Monitor and manage customer VPCs, attached VMs, and VPC peerings in isolated account contexts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border cursor-pointer",
              isDark
                ? "border-slate-800 bg-[#0b1322] hover:bg-white/5 text-zinc-300 hover:text-white"
                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm"
            )}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", (refreshing || loading) && "animate-spin text-cyan-400")} />
            <span>Refresh</span>
          </button>

          {currentIsolatedCustomer && (
            <button
              onClick={() => {
                setCreatePeeringModal({
                  customerId: currentIsolatedCustomer.id,
                  vpcAId: "",
                  vpcBId: "",
                  description: "",
                  forceDbOnly: false,
                });
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 shadow-sm cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Create Customer Peering</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total VPCs */}
        <div
          className={cn(
            "p-4 sm:p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden group",
            isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200 shadow-sm"
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              Total VPCs
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Network className="w-4 h-4" />
            </div>
          </div>
          <div className={cn("text-2xl font-bold mt-2", isDark ? "text-white" : "text-slate-900")}>
            {stats.totalVpcs}
          </div>
          <p className={cn("text-[11px] mt-1 flex items-center gap-1", isDark ? "text-zinc-400" : "text-slate-500")}>
            <Radio className="w-3 h-3 text-cyan-400 inline" /> Provisioned by customers
          </p>
        </div>

        {/* Connected VMs */}
        <div
          className={cn(
            "p-4 sm:p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden group",
            isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200 shadow-sm"
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              Attached VMs
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className={cn("text-2xl font-bold mt-2", isDark ? "text-white" : "text-slate-900")}>
            {stats.totalAttachedVms}
          </div>
          <p className={cn("text-[11px] mt-1 flex items-center gap-1", isDark ? "text-zinc-400" : "text-slate-500")}>
            <CheckCircle className="w-3 h-3 text-emerald-400 inline" /> Assigned private IPs
          </p>
        </div>

        {/* VPC Peerings */}
        <div
          className={cn(
            "p-4 sm:p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden group",
            isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200 shadow-sm"
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              VPC Peerings
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
          </div>
          <div className={cn("text-2xl font-bold mt-2", isDark ? "text-white" : "text-slate-900")}>
            {stats.totalPeerings}
          </div>
          <p className={cn("text-[11px] mt-1 flex items-center gap-1", isDark ? "text-zinc-400" : "text-slate-500")}>
            <Link2 className="w-3 h-3 text-purple-400 inline" /> Inter-VPC connections
          </p>
        </div>

        {/* Total Customers */}
        <div
          className={cn(
            "p-4 sm:p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden group",
            isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200 shadow-sm"
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-zinc-400" : "text-slate-500")}>
              Active Customers
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className={cn("text-2xl font-bold mt-2", isDark ? "text-white" : "text-slate-900")}>
            {stats.totalCustomers}
          </div>
          <p className={cn("text-[11px] mt-1 flex items-center gap-1", isDark ? "text-zinc-400" : "text-slate-500")}>
            <User className="w-3 h-3 text-amber-400 inline" /> With provisioned VPCs
          </p>
        </div>
      </div>

      {/* Customer Isolation & Filter Bar */}
      <div
        className={cn(
          "p-4 md:p-5 rounded-2xl border space-y-4",
          isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200 shadow-sm"
        )}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 min-w-[280px]">
            <label className={cn("block text-xs font-semibold mb-1.5", isDark ? "text-zinc-300" : "text-slate-700")}>
              Select Customer Account (Isolated View):
            </label>
            <Select
              options={customerOptions}
              value={selectedCustomerId}
              onChange={(val) => setSelectedCustomerId(val)}
              className="w-full text-xs"
            />
          </div>

          <div className="w-full md:w-96">
            <label className={cn("block text-xs font-semibold mb-1.5", isDark ? "text-zinc-300" : "text-slate-700")}>
              Search Network / VM / Hostname:
            </label>
            <div className="relative">
              <Search className={cn("w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2", isDark ? "text-zinc-500" : "text-slate-400")} />
              <input
                type="text"
                placeholder="Search VPC, CIDR, or VM..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") fetchData();
                }}
                className={cn(
                  "w-full pl-9 pr-3 py-2 text-xs rounded-xl border focus:outline-none transition-colors",
                  isDark
                    ? "bg-[#060b14] border-slate-800 text-white placeholder-zinc-500 focus:border-cyan-500"
                    : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-500"
                )}
              />
            </div>
          </div>
        </div>

        {/* Highlighted Isolated Customer Context Banner */}
        {currentIsolatedCustomer ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "px-4 py-3 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3",
              isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-200" : "bg-cyan-50 border-cyan-200 text-cyan-900"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center border border-cyan-500/30 shrink-0">
                {currentIsolatedCustomer.name?.charAt(0)?.toUpperCase() || "C"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-cyan-400">
                    {currentIsolatedCustomer.name}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300">
                    User #{currentIsolatedCustomer.id}
                  </span>
                </div>
                <div className="text-xs opacity-80 mt-0.5">
                  {currentIsolatedCustomer.email} • Showing isolated VPCs, attached VMs, and peerings strictly for this customer.
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedCustomerId("all")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border flex items-center gap-1.5 shrink-0",
                isDark
                  ? "bg-slate-800/80 hover:bg-slate-700 text-zinc-200 border-slate-700"
                  : "bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-sm"
              )}
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Isolation (View All)</span>
            </button>
          </motion.div>
        ) : (
          <div className={cn("text-xs flex items-center gap-1.5 px-3 py-2 rounded-xl", isDark ? "bg-slate-900/50 text-zinc-400" : "bg-slate-100 text-slate-600")}>
            <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Currently viewing all customer VPCs across the platform. Select a specific customer from the dropdown above to isolate and manage resources like that customer.</span>
          </div>
        )}
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("vpcs")}
          className={cn(
            "px-4 py-2.5 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap shrink-0 cursor-pointer",
            activeTab === "vpcs"
              ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm"
              : isDark
              ? "text-zinc-400 hover:text-white hover:bg-slate-800/40"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          )}
        >
          <Network className="w-4 h-4 shrink-0" />
          <span>VPC Networks ({vpcs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("peerings")}
          className={cn(
            "px-4 py-2.5 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap shrink-0 cursor-pointer",
            activeTab === "peerings"
              ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm"
              : isDark
              ? "text-zinc-400 hover:text-white hover:bg-slate-800/40"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          )}
        >
          <ArrowRightLeft className="w-4 h-4 shrink-0" />
          <span>VPC Peerings ({peerings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("vms")}
          className={cn(
            "px-4 py-2.5 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap shrink-0 cursor-pointer",
            activeTab === "vms"
              ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm"
              : isDark
              ? "text-zinc-400 hover:text-white hover:bg-slate-800/40"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          )}
        >
          <Server className="w-4 h-4 shrink-0" />
          <span>Attached VMs Overview ({allConnectedVms.length})</span>
        </button>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <AdminLoader />
        </div>
      ) : activeTab === "vpcs" ? (
        /* ================= TAB 1: VPC NETWORKS ================= */
        <div className={cn("border rounded-2xl overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200 shadow-sm")}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className={cn("border-b text-xs font-semibold whitespace-nowrap", isDark ? "border-slate-800 bg-[#060b14] text-zinc-400" : "border-slate-200 bg-slate-50 text-slate-500")}>
                  {selectedCustomerId === "all" && <th className="py-3.5 px-4">Customer Account</th>}
                  <th className="py-3.5 px-4">VPC Network</th>
                  <th className="py-3.5 px-4">CIDR Subnet</th>
                  <th className="py-3.5 px-4">Gateway & VLAN</th>
                  <th className="py-3.5 px-4">Router</th>
                  <th className="py-3.5 px-4">NAT Gateway</th>
                  <th className="py-3.5 px-4 text-center">Attached VMs</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {vpcs.length === 0 ? (
                  <tr>
                    <td colSpan={selectedCustomerId === "all" ? 8 : 7} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Boxes className="w-10 h-10 text-zinc-500 mb-2 opacity-50" />
                        <p className={cn("text-sm font-semibold", isDark ? "text-zinc-300" : "text-slate-700")}>
                          No VPC Networks Found
                        </p>
                        <p className={cn("text-xs mt-1 max-w-sm", isDark ? "text-zinc-500" : "text-slate-400")}>
                          {selectedCustomerId === "all"
                            ? "No customer has provisioned any VPC network yet."
                            : "This customer does not have any active VPC networks."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  vpcs.map((vpc) => {
                    const attachedCount = vpc.vpsServices?.length || 0;
                    return (
                      <tr key={vpc.id} className={cn("transition-colors", isDark ? "hover:bg-slate-800/30" : "hover:bg-slate-50/70")}>
                        {/* Customer Column (if All Customers view) */}
                        {selectedCustomerId === "all" && (
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[11px] shrink-0">
                                {vpc.user?.name?.charAt(0)?.toUpperCase() || "U"}
                              </div>
                              <div className="min-w-0">
                                <div className={cn("font-medium truncate max-w-[130px]", isDark ? "text-white" : "text-slate-900")}>
                                  {vpc.user?.name || "Customer"}
                                </div>
                                <div className={cn("text-[10px] truncate max-w-[130px]", isDark ? "text-zinc-500" : "text-slate-400")}>
                                  {vpc.user?.email || `User #${vpc.userId}`}
                                </div>
                              </div>
                              <button
                                onClick={() => setSelectedCustomerId(String(vpc.userId))}
                                title="Isolate Workspace to this Customer"
                                className="p-1 rounded-md text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}

                        {/* VPC Network Name */}
                        <td className="py-3.5 px-4">
                          <div className={cn("font-semibold text-sm", isDark ? "text-white" : "text-slate-900")}>
                            {vpc.name}
                          </div>
                          {vpc.description && (
                            <div className={cn("text-[11px] mt-0.5", isDark ? "text-zinc-400" : "text-slate-500")}>
                              {vpc.description}
                            </div>
                          )}
                          <div className="text-[10px] font-mono text-cyan-500 mt-0.5">
                            ID: #{vpc.id}
                          </div>
                        </td>

                        {/* CIDR Subnet */}
                        <td className="py-3.5 px-4 font-mono font-medium text-cyan-400">
                          <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                            {vpc.cidr}
                          </span>
                        </td>

                        {/* Gateway & VLAN */}
                        <td className="py-3.5 px-4">
                          <div className={cn("font-mono", isDark ? "text-zinc-300" : "text-slate-700")}>
                            GW: {vpc.gateway}
                          </div>
                          <div className={cn("text-[11px] font-mono", isDark ? "text-zinc-500" : "text-slate-400")}>
                            VLAN ID: {vpc.vlanId}
                          </div>
                        </td>

                        {/* Router */}
                        <td className="py-3.5 px-4">
                          <div className={cn("font-medium", isDark ? "text-zinc-200" : "text-slate-800")}>
                            {vpc.router?.name || "Router"}
                          </div>
                          <div className={cn("text-[10px] font-mono", isDark ? "text-zinc-500" : "text-slate-400")}>
                            {vpc.router?.host}
                          </div>
                        </td>

                        {/* NAT Gateway */}
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => handleToggleNat(vpc)}
                            disabled={togglingNatId === vpc.id}
                            className={cn(
                              "px-2.5 py-1 rounded-full text-[11px] font-medium border flex items-center gap-1.5 transition-colors",
                              vpc.isNatEnabled
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                                : isDark
                                ? "bg-slate-800 text-zinc-400 border-slate-700 hover:bg-slate-700"
                                : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                            )}
                          >
                            {togglingNatId === vpc.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <span className={cn("w-1.5 h-1.5 rounded-full", vpc.isNatEnabled ? "bg-emerald-400" : "bg-zinc-500")} />
                            )}
                            <span>{vpc.isNatEnabled ? "Enabled" : "Disabled"}</span>
                          </button>
                        </td>

                        {/* Attached VMs Badge */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setManageVmsModal(vpc)}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border transition-all",
                              attachedCount > 0
                                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20"
                                : isDark
                                ? "bg-slate-800/80 text-zinc-400 border-slate-700 hover:bg-slate-700"
                                : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                            )}
                          >
                            <Server className="w-3.5 h-3.5" />
                            <span>{attachedCount} {attachedCount === 1 ? "VM" : "VMs"}</span>
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Manage VMs */}
                            <button
                              onClick={() => setManageVmsModal(vpc)}
                              title="Manage Attached VMs"
                              className={cn(
                                "p-1.5 rounded-lg border transition-colors",
                                isDark
                                  ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-cyan-400"
                                  : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-cyan-600"
                              )}
                            >
                              <Unplug className="w-3.5 h-3.5" />
                            </button>

                            {/* Attach VM */}
                            <button
                              onClick={() => openAttachVm(vpc)}
                              title="Attach New VM"
                              className={cn(
                                "p-1.5 rounded-lg border transition-colors",
                                isDark
                                  ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-emerald-400"
                                  : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-emerald-600"
                              )}
                            >
                              <Plug className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete VPC */}
                            <button
                              onClick={() =>
                                setDeleteVpcModal({
                                  vpc,
                                  forceDbOnly: false,
                                  detachVmsFirst: true,
                                })
                              }
                              title="Delete Customer VPC"
                              className={cn(
                                "p-1.5 rounded-lg border transition-colors",
                                isDark
                                  ? "bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400"
                                  : "bg-red-50 hover:bg-red-100 border-red-200 text-red-600"
                              )}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === "peerings" ? (
        /* ================= TAB 2: VPC PEERINGS ================= */
        <div className={cn("border rounded-2xl overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200 shadow-sm")}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className={cn("border-b text-xs font-semibold whitespace-nowrap", isDark ? "border-slate-800 bg-[#060b14] text-zinc-400" : "border-slate-200 bg-slate-50 text-slate-500")}>
                  {selectedCustomerId === "all" && <th className="py-3.5 px-4">Customer Account</th>}
                  <th className="py-3.5 px-4">VPC A (Origin)</th>
                  <th className="py-3.5 px-4 text-center">Inter-Connect</th>
                  <th className="py-3.5 px-4">VPC B (Target)</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {peerings.length === 0 ? (
                  <tr>
                    <td colSpan={selectedCustomerId === "all" ? 8 : 7} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <ArrowRightLeft className="w-10 h-10 text-zinc-500 mb-2 opacity-50" />
                        <p className={cn("text-sm font-semibold", isDark ? "text-zinc-300" : "text-slate-700")}>
                          No Active Peerings Found
                        </p>
                        <p className={cn("text-xs mt-1 max-w-sm", isDark ? "text-zinc-500" : "text-slate-400")}>
                          {selectedCustomerId === "all"
                            ? "No customer has created any VPC peering connections."
                            : "This customer has no active VPC peering connections."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  peerings.map((peering) => (
                    <tr key={peering.id} className={cn("transition-colors", isDark ? "hover:bg-slate-800/30" : "hover:bg-slate-50/70")}>
                      {selectedCustomerId === "all" && (
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center font-bold text-[10px]">
                              {peering.vpcA?.user?.name?.charAt(0)?.toUpperCase() || "U"}
                            </div>
                            <div className="min-w-0">
                              <div className={cn("font-medium truncate max-w-[120px]", isDark ? "text-white" : "text-slate-900")}>
                                {peering.vpcA?.user?.name || "Customer"}
                              </div>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* VPC A */}
                      <td className="py-3.5 px-4">
                        <div className={cn("font-semibold text-sm", isDark ? "text-white" : "text-slate-900")}>
                          {peering.vpcA.name}
                        </div>
                        <div className="font-mono text-[11px] text-cyan-400">
                          {peering.vpcA.cidr}
                        </div>
                      </td>

                      {/* Peering Link Icon */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </div>
                      </td>

                      {/* VPC B */}
                      <td className="py-3.5 px-4">
                        <div className={cn("font-semibold text-sm", isDark ? "text-white" : "text-slate-900")}>
                          {peering.vpcB.name}
                        </div>
                        <div className="font-mono text-[11px] text-cyan-400">
                          {peering.vpcB.cidr}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                            peering.status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : peering.status === "PENDING"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20"
                          )}
                        >
                          {peering.status}
                        </span>
                      </td>

                      {/* Description */}
                      <td className={cn("py-3.5 px-4 max-w-[180px] truncate", isDark ? "text-zinc-400" : "text-slate-600")}>
                        {peering.description || "-"}
                      </td>

                      {/* Created At */}
                      <td className={cn("py-3.5 px-4 text-[11px]", isDark ? "text-zinc-500" : "text-slate-400")}>
                        {new Date(peering.createdAt).toLocaleDateString()}
                      </td>

                      {/* Unpeer Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() =>
                            setUnpeerModal({
                              peering,
                              forceDbOnly: false,
                            })
                          }
                          title="Unpeer / Delete Peering"
                          className={cn(
                            "px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors inline-flex items-center gap-1.5",
                            isDark
                              ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20"
                              : "bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                          )}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Unpeer</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ================= TAB 3: ATTACHED VMS OVERVIEW ================= */
        <div className={cn("border rounded-2xl overflow-hidden", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200 shadow-sm")}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className={cn("border-b text-xs font-semibold whitespace-nowrap", isDark ? "border-slate-800 bg-[#060b14] text-zinc-400" : "border-slate-200 bg-slate-50 text-slate-500")}>
                  {selectedCustomerId === "all" && <th className="py-3.5 px-4">Customer Account</th>}
                  <th className="py-3.5 px-4">Virtual Machine</th>
                  <th className="py-3.5 px-4">Assigned VPC IP</th>
                  <th className="py-3.5 px-4">VPC Network</th>
                  <th className="py-3.5 px-4">Node / VMID</th>
                  <th className="py-3.5 px-4">Power Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {allConnectedVms.length === 0 ? (
                  <tr>
                    <td colSpan={selectedCustomerId === "all" ? 7 : 6} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Server className="w-10 h-10 text-zinc-500 mb-2 opacity-50" />
                        <p className={cn("text-sm font-semibold", isDark ? "text-zinc-300" : "text-slate-700")}>
                          No Connected Virtual Machines
                        </p>
                        <p className={cn("text-xs mt-1 max-w-sm", isDark ? "text-zinc-500" : "text-slate-400")}>
                          {selectedCustomerId === "all"
                            ? "There are currently no VMs connected to any VPC network."
                            : "This customer has not attached any of their VMs to a VPC network."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  allConnectedVms.map(({ vm, vpc, customer }) => (
                    <tr key={`${vpc.id}-${vm.id}`} className={cn("transition-colors", isDark ? "hover:bg-slate-800/30" : "hover:bg-slate-50/70")}>
                      {selectedCustomerId === "all" && (
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center font-bold text-[10px]">
                              {customer?.name?.charAt(0)?.toUpperCase() || "U"}
                            </div>
                            <span className={cn("font-medium truncate max-w-[120px]", isDark ? "text-white" : "text-slate-900")}>
                              {customer?.name || "Customer"}
                            </span>
                          </div>
                        </td>
                      )}

                      {/* VM Hostname */}
                      <td className="py-3.5 px-4">
                        <div className={cn("font-semibold text-sm", isDark ? "text-white" : "text-slate-900")}>
                          {vm.hostname}
                        </div>
                        <div className={cn("text-[10px] font-mono", isDark ? "text-zinc-500" : "text-slate-400")}>
                          ID #{vm.id}
                        </div>
                      </td>

                      {/* VPC IP */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          {vm.vpcIp}
                        </span>
                      </td>

                      {/* VPC Name */}
                      <td className="py-3.5 px-4">
                        <div className={cn("font-medium", isDark ? "text-white" : "text-slate-900")}>
                          {vpc.name}
                        </div>
                        <div className="font-mono text-[10px] text-zinc-500">
                          {vpc.cidr}
                        </div>
                      </td>

                      {/* Node & VMID */}
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        <div>Node: {vm.node}</div>
                        <div className={cn("text-[10px]", isDark ? "text-zinc-500" : "text-slate-400")}>
                          VMID: {vm.vmid || "-"}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                            vm.status === "RUNNING"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                          )}
                        >
                          {vm.status}
                        </span>
                      </td>

                      {/* Detach Button */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() =>
                            setDetachVmModal({
                              vpc,
                              vm,
                              forceDbOnly: false,
                            })
                          }
                          className={cn(
                            "px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors inline-flex items-center gap-1.5",
                            isDark
                              ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20"
                              : "bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                          )}
                        >
                          <Unplug className="w-3.5 h-3.5" />
                          <span>Detach</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODAL: MANAGE ATTACHED VMS ================= */}
      <AnimatePresence>
        {manageVmsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className={cn(
                "border rounded-3xl p-6 w-full max-w-2xl shadow-2xl relative overflow-hidden",
                isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200"
              )}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Unplug className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={cn("text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>
                      Manage Attached VMs
                    </h3>
                    <p className={cn("text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>
                      VPC: <span className="font-semibold text-cyan-400">{manageVmsModal.name}</span> ({manageVmsModal.cidr})
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setManageVmsModal(null)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4">
                {manageVmsModal.vpsServices?.length === 0 ? (
                  <div className={cn("py-10 text-center rounded-2xl border border-dashed", isDark ? "border-slate-800 bg-[#060b14]" : "border-slate-200 bg-slate-50")}>
                    <Server className="w-8 h-8 text-zinc-500 mx-auto mb-2 opacity-50" />
                    <p className={cn("text-sm font-semibold", isDark ? "text-zinc-300" : "text-slate-700")}>
                      No VMs Attached to this VPC
                    </p>
                    <p className={cn("text-xs mt-1 text-zinc-500", isDark ? "text-zinc-400" : "text-slate-500")}>
                      Click the button below to attach one of this customer's VMs.
                    </p>
                  </div>
                ) : (
                  <div className={cn("rounded-xl border overflow-hidden", isDark ? "border-slate-800 bg-[#060b14]" : "border-slate-200 bg-white")}>
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className={cn("border-b font-semibold", isDark ? "border-slate-800 text-zinc-400" : "border-slate-200 text-slate-500")}>
                          <th className="py-2.5 px-3">Hostname</th>
                          <th className="py-2.5 px-3">VMID</th>
                          <th className="py-2.5 px-3">VPC IP Address</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {manageVmsModal.vpsServices.map((vm) => (
                          <tr key={vm.id} className={cn("transition-colors", isDark ? "hover:bg-slate-800/40" : "hover:bg-slate-50")}>
                            <td className="py-2.5 px-3 font-medium text-white">{vm.hostname}</td>
                            <td className="py-2.5 px-3 font-mono text-zinc-400">{vm.vmid || "-"}</td>
                            <td className="py-2.5 px-3 font-mono text-cyan-400 font-semibold">{vm.vpcIp}</td>
                            <td className="py-2.5 px-3">
                              <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", vm.status === "RUNNING" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20")}>
                                {vm.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => {
                                  setDetachVmModal({
                                    vpc: manageVmsModal,
                                    vm,
                                    forceDbOnly: false,
                                  });
                                }}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors inline-flex items-center gap-1"
                              >
                                <Unplug className="w-3 h-3" /> Detach
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => openAttachVm(manageVmsModal)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Attach Another VM
                </button>

                <button
                  onClick={() => setManageVmsModal(null)}
                  className={cn("px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer", isDark ? "border-slate-800 bg-[#0b1322] hover:bg-white/5 text-zinc-300 hover:text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700")}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: ATTACH VM ================= */}
      <AnimatePresence>
        {attachVmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className={cn(
                "border rounded-3xl p-6 w-full max-w-lg shadow-2xl relative overflow-hidden",
                isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200"
              )}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Plug className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={cn("text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>
                      Attach VM to Customer VPC
                    </h3>
                    <p className={cn("text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>
                      VPC: <span className="font-semibold text-cyan-400">{attachVmModal.name}</span> • Subnet: {attachVmModal.cidr}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setAttachVmModal(null)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-4 text-xs">
                {/* Customer info note */}
                <div className={cn("p-3 rounded-xl border flex items-center gap-2.5", isDark ? "bg-[#060b14] border-slate-800 text-zinc-300" : "bg-slate-50 border-slate-200 text-slate-700")}>
                  <User className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div>
                    Attaching VM for customer: <span className="font-semibold text-cyan-400">{attachVmModal.user?.name}</span> ({attachVmModal.user?.email})
                  </div>
                </div>

                {/* VM Selection */}
                <div>
                  <label className={cn("block font-semibold mb-1.5", isDark ? "text-zinc-300" : "text-slate-700")}>
                    Select Virtual Machine:
                  </label>
                  {loadingAvailableVms ? (
                    <div className="py-3 flex items-center justify-center gap-2 text-zinc-400">
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                      <span>Loading customer's unattached VMs...</span>
                    </div>
                  ) : availableVms.length === 0 ? (
                    <div className={cn("p-3 rounded-xl border text-center", isDark ? "bg-amber-500/10 border-amber-500/20 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-800")}>
                      <AlertTriangle className="w-4 h-4 mx-auto mb-1 inline text-amber-400 mr-1.5" />
                      This customer currently has no available (unattached) VMs.
                    </div>
                  ) : (
                    <select
                      value={attachForm.vpsId}
                      onChange={(e) => setAttachForm({ ...attachForm, vpsId: e.target.value })}
                      className={cn(
                        "w-full px-3 py-2.5 rounded-xl border focus:outline-none transition-colors text-xs",
                        isDark ? "bg-[#060b14] border-slate-800 text-white focus:border-cyan-500" : "bg-white border-slate-300 text-slate-900 focus:border-cyan-500"
                      )}
                    >
                      <option value="">-- Choose Virtual Machine --</option>
                      {availableVms.map((vm) => (
                        <option key={vm.id} value={vm.id}>
                          {vm.hostname} (VMID: {vm.vmid || "N/A"}) - {vm.cpuCores} vCPU, {vm.ramGb}GB RAM ({vm.status})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Private IP Address */}
                <div>
                  <label className={cn("block font-semibold mb-1.5", isDark ? "text-zinc-300" : "text-slate-700")}>
                    Private IP Address:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 10.10.10.5"
                    value={attachForm.privateIpAddress}
                    onChange={(e) => setAttachForm({ ...attachForm, privateIpAddress: e.target.value })}
                    className={cn(
                      "w-full px-3 py-2.5 font-mono text-xs rounded-xl border focus:outline-none transition-colors",
                      isDark ? "bg-[#060b14] border-slate-800 text-white focus:border-cyan-500" : "bg-white border-slate-300 text-slate-900 focus:border-cyan-500"
                    )}
                  />
                  <p className={cn("text-[10px] mt-1", isDark ? "text-zinc-500" : "text-slate-400")}>
                    Must fall within the subnet range: <span className="font-mono text-cyan-400">{attachVmModal.cidr}</span> (Gateway: {attachVmModal.gateway})
                  </p>
                </div>

                {/* Force DB Only Toggle */}
                <div className={cn("p-3 rounded-xl border flex items-center justify-between cursor-pointer", isDark ? "bg-slate-900/60 border-slate-800" : "bg-slate-50 border-slate-200")}>
                  <div>
                    <div className={cn("font-semibold text-xs", isDark ? "text-zinc-200" : "text-slate-800")}>
                      Database Only Attachment
                    </div>
                    <div className={cn("text-[10px]", isDark ? "text-zinc-400" : "text-slate-500")}>
                      Skip hypervisor/Proxmox configuration and record association directly into database.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={attachForm.forceDbOnly}
                    onChange={(e) => setAttachForm({ ...attachForm, forceDbOnly: e.target.checked })}
                    className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAttachVmModal(null)}
                  className={cn("px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer", isDark ? "border-slate-800 bg-[#0b1322] hover:bg-white/5 text-zinc-300 hover:text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700")}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAttachVm}
                  disabled={actionLoading || !attachForm.vpsId}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plug className="w-3.5 h-3.5" />}
                  <span>Attach VM</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: DETACH VM CONFIRMATION ================= */}
      <AnimatePresence>
        {detachVmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className={cn(
                "border rounded-3xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden",
                isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200"
              )}
            >
              <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                  <Unplug className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={cn("text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>
                    Detach Virtual Machine
                  </h3>
                  <p className={cn("text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>
                    VPC: {detachVmModal.vpc.name}
                  </p>
                </div>
              </div>

              <div className="py-4 space-y-3 text-xs">
                <p className={isDark ? "text-zinc-300" : "text-slate-700"}>
                  Are you sure you want to detach <strong className="text-cyan-400">{detachVmModal.vm.hostname}</strong> (IP: <span className="font-mono text-cyan-400">{detachVmModal.vm.vpcIp}</span>) from this VPC network?
                </p>

                {/* Force DB Only Checkbox */}
                <div className={cn("p-3 rounded-xl border flex items-center justify-between cursor-pointer", isDark ? "bg-slate-900/60 border-slate-800" : "bg-slate-50 border-slate-200")}>
                  <div>
                    <div className={cn("font-semibold text-xs", isDark ? "text-zinc-200" : "text-slate-800")}>
                      Detach in Database Only
                    </div>
                    <div className={cn("text-[10px]", isDark ? "text-zinc-400" : "text-slate-500")}>
                      Safe fallback: Unlinks in database without checking Proxmox status.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={detachVmModal.forceDbOnly}
                    onChange={(e) =>
                      setDetachVmModal({
                        ...detachVmModal,
                        forceDbOnly: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-red-500 focus:ring-red-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDetachVmModal(null)}
                  className={cn("px-4 py-2 rounded-xl text-xs font-medium border", isDark ? "bg-slate-800 hover:bg-slate-700 text-zinc-300 border-slate-700" : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200")}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDetachVm}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unplug className="w-3.5 h-3.5" />}
                  <span>Confirm Detach</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: DELETE VPC CONFIRMATION ================= */}
      <AnimatePresence>
        {deleteVpcModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className={cn(
                "border rounded-3xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden",
                isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200"
              )}
            >
              <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={cn("text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>
                    Delete Customer VPC
                  </h3>
                  <p className={cn("text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>
                    Customer: {deleteVpcModal.vpc.user?.name}
                  </p>
                </div>
              </div>

              <div className="py-4 space-y-3 text-xs">
                <p className={isDark ? "text-zinc-300" : "text-slate-700"}>
                  Are you sure you want to delete VPC <strong className="text-red-400">{deleteVpcModal.vpc.name}</strong> ({deleteVpcModal.vpc.cidr})?
                </p>

                {deleteVpcModal.vpc.vpsServices?.length > 0 && (
                  <div className={cn("p-3 rounded-xl border flex items-center justify-between", isDark ? "bg-amber-500/10 border-amber-500/20 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-900")}>
                    <div>
                      <div className="font-semibold">
                        {deleteVpcModal.vpc.vpsServices.length} Attached VMs Detected
                      </div>
                      <div className="text-[10px] opacity-80">
                        Automatically detach all VMs from database before deletion.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={deleteVpcModal.detachVmsFirst}
                      onChange={(e) =>
                        setDeleteVpcModal({
                          ...deleteVpcModal,
                          detachVmsFirst: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                    />
                  </div>
                )}

                {/* Force DB Only Toggle */}
                <div className={cn("p-3 rounded-xl border flex items-center justify-between cursor-pointer", isDark ? "bg-slate-900/60 border-slate-800" : "bg-slate-50 border-slate-200")}>
                  <div>
                    <div className={cn("font-semibold text-xs", isDark ? "text-zinc-200" : "text-slate-800")}>
                      Delete from Database Only
                    </div>
                    <div className={cn("text-[10px]", isDark ? "text-zinc-400" : "text-slate-500")}>
                      Skip MikroTik cleanup and delete record strictly from database.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={deleteVpcModal.forceDbOnly}
                    onChange={(e) =>
                      setDeleteVpcModal({
                        ...deleteVpcModal,
                        forceDbOnly: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-red-500 focus:ring-red-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeleteVpcModal(null)}
                  className={cn("px-4 py-2 rounded-xl text-xs font-medium border", isDark ? "bg-slate-800 hover:bg-slate-700 text-zinc-300 border-slate-700" : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200")}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteVpc}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Confirm Delete</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: CREATE PEERING ================= */}
      <AnimatePresence>
        {createPeeringModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className={cn(
                "border rounded-3xl p-6 w-full max-w-lg shadow-2xl relative overflow-hidden",
                isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200"
              )}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <ArrowRightLeft className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={cn("text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>
                      Create VPC Peering Connection
                    </h3>
                    <p className={cn("text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>
                      Inter-connect two VPCs owned by this customer
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setCreatePeeringModal(null)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-4 text-xs">
                {customerVpcsForPeering.length < 2 ? (
                  <div className={cn("p-4 rounded-xl border text-center", isDark ? "bg-amber-500/10 border-amber-500/20 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-800")}>
                    <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-amber-400" />
                    <p className="font-semibold">At least 2 VPCs required</p>
                    <p className="text-[11px] mt-1 opacity-80">
                      This customer currently has {customerVpcsForPeering.length} VPC. Peering requires at least two VPCs created by the same customer account.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      {/* VPC A */}
                      <div>
                        <label className={cn("block font-semibold mb-1.5", isDark ? "text-zinc-300" : "text-slate-700")}>
                          VPC A (Origin):
                        </label>
                        <select
                          value={createPeeringModal.vpcAId}
                          onChange={(e) => setCreatePeeringModal({ ...createPeeringModal, vpcAId: e.target.value })}
                          className={cn(
                            "w-full px-3 py-2 rounded-xl border focus:outline-none transition-colors text-xs",
                            isDark ? "bg-[#060b14] border-slate-800 text-white focus:border-cyan-500" : "bg-white border-slate-300 text-slate-900 focus:border-cyan-500"
                          )}
                        >
                          <option value="">-- Select VPC A --</option>
                          {customerVpcsForPeering.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name} ({v.cidr})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* VPC B */}
                      <div>
                        <label className={cn("block font-semibold mb-1.5", isDark ? "text-zinc-300" : "text-slate-700")}>
                          VPC B (Target):
                        </label>
                        <select
                          value={createPeeringModal.vpcBId}
                          onChange={(e) => setCreatePeeringModal({ ...createPeeringModal, vpcBId: e.target.value })}
                          className={cn(
                            "w-full px-3 py-2 rounded-xl border focus:outline-none transition-colors text-xs",
                            isDark ? "bg-[#060b14] border-slate-800 text-white focus:border-cyan-500" : "bg-white border-slate-300 text-slate-900 focus:border-cyan-500"
                          )}
                        >
                          <option value="">-- Select VPC B --</option>
                          {customerVpcsForPeering.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name} ({v.cidr})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className={cn("block font-semibold mb-1.5", isDark ? "text-zinc-300" : "text-slate-700")}>
                        Description / Purpose (Optional):
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Cross-tier database cluster replication"
                        value={createPeeringModal.description}
                        onChange={(e) => setCreatePeeringModal({ ...createPeeringModal, description: e.target.value })}
                        className={cn(
                          "w-full px-3 py-2 text-xs rounded-xl border focus:outline-none transition-colors",
                          isDark ? "bg-[#060b14] border-slate-800 text-white focus:border-cyan-500" : "bg-white border-slate-300 text-slate-900 focus:border-cyan-500"
                        )}
                      />
                    </div>

                    {/* Force DB Only Toggle */}
                    <div className={cn("p-3 rounded-xl border flex items-center justify-between cursor-pointer", isDark ? "bg-slate-900/60 border-slate-800" : "bg-slate-50 border-slate-200")}>
                      <div>
                        <div className={cn("font-semibold text-xs", isDark ? "text-zinc-200" : "text-slate-800")}>
                          Database Only Peering
                        </div>
                        <div className={cn("text-[10px]", isDark ? "text-zinc-400" : "text-slate-500")}>
                          Record peering in database without sending configuration to MikroTik.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={createPeeringModal.forceDbOnly}
                        onChange={(e) =>
                          setCreatePeeringModal({
                            ...createPeeringModal,
                            forceDbOnly: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded text-purple-500 focus:ring-purple-400"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreatePeeringModal(null)}
                  className={cn("px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer", isDark ? "border-slate-800 bg-[#0b1322] hover:bg-white/5 text-zinc-300 hover:text-white" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700")}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreatePeering}
                  disabled={actionLoading || !createPeeringModal.vpcAId || !createPeeringModal.vpcBId}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
                  <span>Establish Peering</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: UNPEER CONFIRMATION ================= */}
      <AnimatePresence>
        {unpeerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className={cn(
                "border rounded-3xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden",
                isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200"
              )}
            >
              <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={cn("text-lg font-bold", isDark ? "text-white" : "text-slate-900")}>
                    Remove VPC Peering
                  </h3>
                  <p className={cn("text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>
                    ID #{unpeerModal.peering.id}
                  </p>
                </div>
              </div>

              <div className="py-4 space-y-3 text-xs">
                <p className={isDark ? "text-zinc-300" : "text-slate-700"}>
                  Are you sure you want to remove peering between <strong className="text-cyan-400">{unpeerModal.peering.vpcA?.name}</strong> and <strong className="text-cyan-400">{unpeerModal.peering.vpcB?.name}</strong>?
                </p>

                {/* Force DB Only Toggle */}
                <div className={cn("p-3 rounded-xl border flex items-center justify-between cursor-pointer", isDark ? "bg-slate-900/60 border-slate-800" : "bg-slate-50 border-slate-200")}>
                  <div>
                    <div className={cn("font-semibold text-xs", isDark ? "text-zinc-200" : "text-slate-800")}>
                      Unpeer from Database Only
                    </div>
                    <div className={cn("text-[10px]", isDark ? "text-zinc-400" : "text-slate-500")}>
                      Skip MikroTik routing teardown and delete record only from database.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={unpeerModal.forceDbOnly}
                    onChange={(e) =>
                      setUnpeerModal({
                        ...unpeerModal,
                        forceDbOnly: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded text-red-500 focus:ring-red-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setUnpeerModal(null)}
                  className={cn("px-4 py-2 rounded-xl text-xs font-medium border", isDark ? "bg-slate-800 hover:bg-slate-700 text-zinc-300 border-slate-700" : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200")}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUnpeer}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Confirm Unpeer</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
