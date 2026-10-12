"use client";

import { useUrlNumber, useUrlTab } from "@/lib/useUrlTab";
import { useState, useEffect, useRef } from "react";
import { Plus, Server, Trash2, RefreshCw, Loader2, Link2, AlertTriangle, CheckCircle, Info, ShieldAlert, Network, Clock, Plug, Unplug, Copy, ToggleLeft, ToggleRight, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Select } from "@/components/ui/Select";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

const VpcIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="11" />
    <polyline points="9 6 12 3 15 6" />
    <polyline points="9 18 12 21 15 18" />
    <polyline points="6 9 3 12 6 15" />
    <polyline points="18 9 21 12 18 15" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="12" y1="3" x2="12" y2="21" />
  </svg>
);

type VpcNetwork = {
  id: number;
  name: string;
  description: string;
  cidr: string;
  gateway: string;
  vlanId: number;
  isNatEnabled: boolean;
  status: string;
  createdAt: string;
  _count: {
    vpsServices: number;
    peeringsA: number;
    peeringsB: number;
  };
  vpsServices?: { id: number; hostname: string; vpcIp: string }[];
};

type VpcPeering = {
  id: number;
  vpcA: VpcNetwork;
  vpcB: VpcNetwork;
  status: string;
  description: string;
  createdAt: string;
};

const getUsableIpRange = (cidr: string, gateway: string) => {
  try {
    const [base, prefixStr] = cidr.split('/');
    const prefix = parseInt(prefixStr);
    const parts = base.split('.').map(Number);
    const baseNum = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
    const totalHosts = Math.pow(2, 32 - prefix);
    const networkAddr = baseNum;
    const broadcastAddr = baseNum + totalHosts - 1;
    const gatewayNum = gateway ? (gateway.split('.').map(Number).reduce((acc, v) => (acc << 8) | v, 0) >>> 0) : 0;
    const candidates = [];
    for (let i = networkAddr + 1; i < broadcastAddr; i++) {
      if (i !== gatewayNum) candidates.push(i);
    }
    const toIp = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
    return candidates.length > 0
      ? { first: toIp(candidates[0]), last: toIp(candidates[candidates.length - 1]), count: candidates.length }
      : null;
  } catch { return null; }
};

type CidrValidationResult = {
  error: string | null;
  suggestion?: string;
};

const validateCidr = (cidr: string): CidrValidationResult => {
  if (!cidr) return { error: null };

  let suggestion = "10.10.10.0/24";
  try {
    let ipPart = cidr.split('/')[0] || "";
    let prefixPart = cidr.split('/')[1];
    let prefix = parseInt(prefixPart);
    if (isNaN(prefix) || prefix < 0 || prefix > 32) prefix = 24;

    let parts = ipPart.split('.').map(p => p.trim() === "" ? 0 : parseInt(p));
    parts = parts.map(p => isNaN(p) ? 0 : p);
    while (parts.length < 4) parts.push(0);

    if (parts[0] !== 10 && parts[0] !== 172 && parts[0] !== 192) {
      if (ipPart.startsWith("17")) parts = [172, 16, 0, 0];
      else if (ipPart.startsWith("19")) parts = [192, 168, 0, 0];
      else parts = [10, 0, 0, 0];
    } else {
      if (parts[0] === 172 && (parts[1] < 16 || parts[1] > 31)) parts[1] = 16;
      if (parts[0] === 192 && parts[1] !== 168) parts[1] = 168;
    }

    const ipNum = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    const networkNum = (ipNum & mask) >>> 0;
    const toIp = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');

    suggestion = `${toIp(networkNum)}/${prefix}`;
  } catch { }

  if (!cidr.includes('/')) return { error: "Invalid format. Expected IP/Prefix", suggestion };

  const [base, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr);
  if (isNaN(prefix) || prefix < 0 || prefix > 32) return { error: "Invalid prefix length (0-32)", suggestion };

  const parts = base.split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN) || parts.some(p => p < 0 || p > 255)) {
    return { error: "Invalid IP address format", suggestion };
  }

  const isPrivate = (parts[0] === 10) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168);
  if (!isPrivate) return { error: "Must be a private IP range (RFC 1918)", suggestion };

  const ipNum = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const networkNum = (ipNum & mask) >>> 0;

  if (ipNum !== networkNum) {
    return { error: `Must be a network address`, suggestion };
  }

  return { error: null };
};

export default function VpcDashboardPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useUrlTab<string>("vpcs");
  const [vpcs, setVpcs] = useState<VpcNetwork[]>([]);
  const [peerings, setPeerings] = useState<VpcPeering[]>([]);

  const [loadingVpcs, setLoadingVpcs] = useState(true);
  const [loadingPeerings, setLoadingPeerings] = useState(false);

  const [showAddVpcModal, setShowAddVpcModal] = useState(false);
  const [showAddPeeringModal, setShowAddPeeringModal] = useState(false);

  const [showDeleteVpcModal, setShowDeleteVpcModal] = useState<number | 'bulk' | null>(null);
  const [showDeletePeeringModal, setShowDeletePeeringModal] = useState<number | 'bulk' | null>(null);
  const [showAttachVmModal, setShowAttachVmModal] = useState<number | null>(null);
  const [showManageVmsModal, setShowManageVmsModal] = useState<number | null>(null);
  const [manageVmsPage, setManageVmsPage] = useUrlNumber("manageVmsPage", 1);
  const [vpcsPage, setVpcsPage] = useUrlNumber("vpcsPage", 1);
  const [peeringsPage, setPeeringsPage] = useUrlNumber("peeringsPage", 1);
  const itemsPerPage = 10;
  
  const [togglingNat, setTogglingNat] = useState<number | null>(null);
  const [detachVmModal, setDetachVmModal] = useState<{ vpcId: number, vpsId: number, hostname: string } | null>(null);
  const [availableVms, setAvailableVms] = useState<{ id: number, vmid: number, hostname: string, node: string }[]>([]);
  const [attachForm, setAttachForm] = useState({ vpsId: "", privateIpAddress: "" });

  // Form states
  const [vpcForm, setVpcForm] = useState({ name: "", description: "", cidr: "", isNatEnabled: false });
  const [peeringForm, setPeeringForm] = useState({ vpcAId: "", vpcBId: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Bulk selection states
  const [selectedVpcs, setSelectedVpcs] = useState<number[]>([]);
  const [selectedPeerings, setSelectedPeerings] = useState<number[]>([]);
  const [selectedAttachedVms, setSelectedAttachedVms] = useState<number[]>([]);

  const fetchVpcs = async () => {
    setLoadingVpcs(true);
    try {
      const res = await fetch("/api/dashboard/vpc");
      if (res.ok) {
        const data = await res.json();
        setVpcs(data);
      }
    } catch (e) {
      toast.error("Failed to fetch VPCs");
    } finally {
      setLoadingVpcs(false);
    }
  };

  useEffect(() => {
    fetchVpcs();
  }, []);

  useEffect(() => {
    setSelectedAttachedVms([]);
  }, [showManageVmsModal]);



  const silentFetchVpcs = async () => {
    try {
      const res = await fetch("/api/dashboard/vpc");
      if (res.ok) {
        const data = await res.json();
        setVpcs(data);
      }
    } catch {
      // Silent — don't show toast on background poll errors
    }
  };

  const fetchPeerings = async () => {
    setLoadingPeerings(true);
    try {
      const res = await fetch("/api/dashboard/vpc/peering");
      if (res.ok) {
        const data = await res.json();
        setPeerings(data);
      }
    } catch (e) {
      toast.error("Failed to fetch Peerings");
    } finally {
      setLoadingPeerings(false);
    }
  };

  const silentFetchPeerings = async () => {
    try {
      const res = await fetch("/api/dashboard/vpc/peering");
      if (res.ok) {
        const data = await res.json();
        setPeerings(data);
      }
    } catch {
      // Silent
    }
  };

  // Auto-refresh every 3s while any VPC is still pending — silent (no loading flicker)
  useEffect(() => {
    const hasPending = vpcs.some(v => ["PROVISIONING", "TERMINATING"].includes(v.status));
    if (!hasPending) return;
    const timer = setInterval(silentFetchVpcs, 3000);
    return () => clearInterval(timer);
  }, [vpcs]);

  // Auto-refresh every 3s while any Peering is still pending
  useEffect(() => {
    const hasPending = peerings.some(p => ["PENDING", "TERMINATING"].includes(p.status));
    if (!hasPending) return;
    const timer = setInterval(silentFetchPeerings, 3000);
    return () => clearInterval(timer);
  }, [peerings]);

  useEffect(() => {
    if (activeTab === "peering" && peerings.length === 0) {
      // Actually we don't have a GET /api/dashboard/vpc/peering route yet.
      // Let me just fetch VPCs again if needed, or I should create that route.
      // Wait, let me create the GET route for peering first.
      fetchPeerings();
    }
  }, [activeTab]);



  const handleCreateVpc = async () => {
    if (!vpcForm.name || !vpcForm.cidr) {
      toast.error("Name and CIDR are required");
      return;
    }
    const cidrErr = validateCidr(vpcForm.cidr).error;
    if (cidrErr) {
      toast.error(cidrErr);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/vpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vpcForm)
      });

      if (res.ok) {
        toast.success("VPC Created successfully");
        setShowAddVpcModal(false);
        setVpcForm({ name: "", description: "", cidr: "", isNatEnabled: false });
        fetchVpcs();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to create VPC");
      }
    } catch (e) {
      toast.error("Error creating VPC");
    } finally {
      setSaving(false);
    }
  };

  const handleAddPeeringSubmit = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/vpc/peering", {
        method: "POST",
        body: JSON.stringify(peeringForm),
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create peering");
      toast.success("Peering created successfully!");
      setShowAddPeeringModal(false);
      fetchPeerings();
      fetchVpcs();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const totalVpcsPages = Math.ceil(vpcs.length / itemsPerPage);
  const visibleVpcs = vpcs.slice((vpcsPage - 1) * itemsPerPage, vpcsPage * itemsPerPage);

  const totalPeeringsPages = Math.ceil(peerings.length / itemsPerPage);
  const visiblePeerings = peerings.slice((peeringsPage - 1) * itemsPerPage, peeringsPage * itemsPerPage);

  const isAllVisibleVpcsSelected = visibleVpcs.length > 0 && visibleVpcs.every(v => selectedVpcs.includes(v.id));
  const isAllVisiblePeeringsSelected = visiblePeerings.length > 0 && visiblePeerings.every(p => selectedPeerings.includes(p.id));

  const handleSelectAllVisibleVpcs = () => {
    if (isAllVisibleVpcsSelected) {
      setSelectedVpcs(selectedVpcs.filter(id => !visibleVpcs.some(v => v.id === id)));
    } else {
      const newSelected = new Set(selectedVpcs);
      visibleVpcs.forEach(v => newSelected.add(v.id));
      setSelectedVpcs(Array.from(newSelected));
    }
  };

  const handleSelectAllVisiblePeerings = () => {
    if (isAllVisiblePeeringsSelected) {
      setSelectedPeerings(selectedPeerings.filter(id => !visiblePeerings.some(p => p.id === id)));
    } else {
      const newSelected = new Set(selectedPeerings);
      visiblePeerings.forEach(p => newSelected.add(p.id));
      setSelectedPeerings(Array.from(newSelected));
    }
  };

  const handleDeleteVpc = async () => {
    if (!showDeleteVpcModal) return;

    if (showDeleteVpcModal === 'bulk') {
      return handleBulkDeleteVpcs();
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/dashboard/vpc/${showDeleteVpcModal}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("VPC Deleted");
        setShowDeleteVpcModal(null);
        fetchVpcs();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to delete VPC");
      }
    } catch (e) {
      toast.error("Error deleting VPC");
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDeleteVpcs = async () => {
    if (selectedVpcs.length === 0) return;

    setDeleting(true);
    let successCount = 0;
    let lastError = "";

    try {
      for (const id of selectedVpcs) {
        const res = await fetch(`/api/dashboard/vpc/${id}`, { method: "DELETE" });
        if (res.ok) {
          successCount++;
        } else {
          const err = await res.json().catch(() => ({}));
          lastError = err.error || "Failed to delete VPC";
        }
      }

      if (successCount === selectedVpcs.length) {
        toast.success(`Successfully deleted ${successCount} VPC(s)`);
      } else {
        toast.error(`Deleted ${successCount} out of ${selectedVpcs.length} VPC(s): ${lastError}`);
      }

      setSelectedVpcs([]);
      setShowDeleteVpcModal(null);
      fetchVpcs();
    } catch (e: any) {
      toast.error(`Error during bulk delete: ${e.message || 'Unknown error'}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeletePeering = async () => {
    if (!showDeletePeeringModal) return;

    if (showDeletePeeringModal === 'bulk') {
      return handleBulkDeletePeerings();
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/dashboard/vpc/peering/${showDeletePeeringModal}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Peering Deleted");
        setShowDeletePeeringModal(null);
        fetchPeerings();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to delete Peering");
      }
    } catch (e) {
      toast.error("Error deleting Peering");
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDeletePeerings = async () => {
    if (selectedPeerings.length === 0) return;

    setDeleting(true);
    let successCount = 0;
    let lastError = "";

    try {
      for (const id of selectedPeerings) {
        const res = await fetch(`/api/dashboard/vpc/peering/${id}`, { method: "DELETE" });
        if (res.ok) {
          successCount++;
        } else {
          const err = await res.json().catch(() => ({}));
          lastError = err.error || "Failed to delete Peering";
        }
      }

      if (successCount === selectedPeerings.length) {
        toast.success(`Successfully deleted ${successCount} Peering(s)`);
      } else {
        toast.error(`Deleted ${successCount} out of ${selectedPeerings.length} Peering(s): ${lastError}`);
      }

      setSelectedPeerings([]);
      setShowDeletePeeringModal(null);
      fetchPeerings();
    } catch (e: any) {
      toast.error(`Error during bulk delete: ${e.message || 'Unknown error'}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleNat = async (id: number, newStatus: boolean) => {
    setTogglingNat(id);
    try {
      const res = await fetch(`/api/dashboard/vpc/${id}/nat`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isNatEnabled: newStatus })
      });
      if (res.ok) {
        toast.success(`NAT Gateway ${newStatus ? 'Enabled' : 'Disabled'}`);
        silentFetchVpcs();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to toggle NAT Gateway");
      }
    } catch (e) {
      toast.error("Error toggling NAT Gateway");
    } finally {
      setTogglingNat(null);
    }
  };

  const handleOpenAttachModal = async (vpcId: number) => {
    setShowAttachVmModal(vpcId);
    setAttachForm({ vpsId: "", privateIpAddress: "" });
    try {
      const res = await fetch("/api/dashboard/vpc/available-vms");
      const data = await res.json();
      if (data.success) {
        setAvailableVms(data.data);
      }
    } catch (e) {
      toast.error("Failed to load available VMs");
    }
  };

  const handleAttachVm = async () => {
    if (!attachForm.vpsId) {
      toast.error("Please select a VM to attach");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/dashboard/vpc/${showAttachVmModal}/attach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attachForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message);
        setShowAttachVmModal(null);
        fetchVpcs();
      } else {
        toast.error(data.error || "Failed to attach VM");
      }
    } catch (e) {
      toast.error("Error attaching VM");
    } finally {
      setSaving(false);
    }
  };

  const handleDetachVm = async () => {
    if (!detachVmModal) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/dashboard/vpc/${detachVmModal.vpcId}/detach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vpsId: detachVmModal.vpsId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message);
        setDetachVmModal(null);
        fetchVpcs();
      } else {
        toast.error(data.error || "Failed to detach VM");
      }
    } catch (e) {
      toast.error("Error detaching VM");
    } finally {
      setDeleting(false);
    }
  };
  const handleBulkDetachVm = async () => {
    if (selectedAttachedVms.length === 0 || !showManageVmsModal) return;
    setDeleting(true);
    let successCount = 0;
    let lastError = "";
    
    try {
      for (const vpsId of selectedAttachedVms) {
        const res = await fetch(`/api/dashboard/vpc/${showManageVmsModal}/detach`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vpsId })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          successCount++;
        } else {
          lastError = data.error || "Failed to detach VM";
        }
      }

      if (successCount === selectedAttachedVms.length) {
        toast.success(`Successfully detached ${successCount} VM(s)`);
      } else {
        toast.error(`Detached ${successCount} out of ${selectedAttachedVms.length} VM(s): ${lastError}`);
      }
      setSelectedAttachedVms([]);
      fetchVpcs();
    } catch (e: any) {
      toast.error(`Error during bulk detach: ${e.message || 'Unknown error'}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDetachAllFromVpcs = async () => {
    if (selectedVpcs.length === 0) return;
    
    const targetVpcs = vpcs.filter(v => selectedVpcs.includes(v.id));
    const allAttachedVms = targetVpcs.flatMap(v => v.vpsServices?.map(vps => ({ vpcId: v.id, vpsId: vps.id })) || []);
    
    if (allAttachedVms.length === 0) {
      toast.info("No VMs attached to the selected VPCs");
      return;
    }

    setDeleting(true);
    let successCount = 0;
    let lastError = "";

    try {
      for (const item of allAttachedVms) {
        const res = await fetch(`/api/dashboard/vpc/${item.vpcId}/detach`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vpsId: item.vpsId })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          successCount++;
        } else {
          lastError = data.error || "Failed to detach VM";
        }
      }

      if (successCount === allAttachedVms.length) {
        toast.success(`Successfully detached all ${successCount} VM(s)`);
      } else {
        toast.error(`Detached ${successCount} out of ${allAttachedVms.length} VM(s): ${lastError}`);
      }
      
      fetchVpcs();
    } catch (e: any) {
      toast.error(`Error during bulk detach: ${e.message || 'Unknown error'}`);
    } finally {
      setDeleting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <motion.div className="space-y-6 md:space-y-8 pb-10" variants={containerVariants} initial="hidden" animate="visible">
      <motion.div variants={itemVariants} className={cn("relative overflow-hidden rounded-3xl p-6 md:p-8 shadow-sm group flex flex-col md:flex-row md:items-center justify-between gap-6 border", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200")}>
        
        <div className="relative z-10">
          <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold mb-4 tracking-wide", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
            <VpcIcon className="w-3 h-3" /> Secure Networking
          </div>
          <h1 className={cn("text-3xl md:text-4xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Virtual Private <span className={cn(isDark ? "text-cyan-400" : "text-cyan-600")}>Cloud</span>
          </h1>
          <p className={cn("text-sm max-w-md", isDark ? "text-zinc-400" : "text-slate-500")}>Manage your isolated private networks, subnets, and configure secure VPC peerings.</p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className={cn("rounded-3xl overflow-hidden shadow-md relative border", isDark ? "bg-[#0b1322] border-slate-800/80" : "bg-white border-slate-200")}>
                <div className={cn("flex border-b relative z-10", isDark ? "border-white/5 bg-black/20" : "border-slate-200 bg-slate-50/50")}>
          <button
            onClick={() => setActiveTab("vpcs")}
            className={cn(
              "flex-1 py-4 text-sm font-bold transition-colors border-b-2",
              activeTab === "vpcs"
                ? isDark ? "text-cyan-400 border-cyan-400 bg-cyan-400/5" : "text-cyan-700 border-cyan-500 bg-cyan-50"
                : isDark ? "text-zinc-400 border-transparent hover:text-white hover:bg-white/5" : "text-slate-500 border-transparent hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            My VPCs
          </button>
          <button
            onClick={() => setActiveTab("peering")}
            className={cn(
              "flex-1 py-4 text-sm font-bold transition-colors border-b-2",
              activeTab === "peering"
                ? isDark ? "text-cyan-400 border-cyan-400 bg-cyan-400/5" : "text-cyan-700 border-cyan-500 bg-cyan-50"
                : isDark ? "text-zinc-400 border-transparent hover:text-white hover:bg-white/5" : "text-slate-500 border-transparent hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            VPC Peering
          </button>
        </div>

        {activeTab === "vpcs" && (
          <div className="p-6">
            <div className={cn("rounded-xl p-4 mb-6 flex items-start gap-3 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
              <Info className={cn("w-5 h-5 shrink-0 mt-0.5", isDark ? "text-cyan-500" : "text-cyan-600")} />
              <div className={cn("text-sm", isDark ? "text-cyan-200" : "text-cyan-700")}>
                <p className={cn("font-medium mb-1", isDark ? "text-cyan-500" : "text-cyan-800")}>About Virtual Private Cloud</p>
                <p>A VPC is a secure, isolated private cloud hosted within the public cloud. It allows you to launch resources in a virtual network that you define.</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mb-6">
              <AnimatePresence>
                {selectedVpcs.length > 0 && (
                  <>
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onClick={handleBulkDetachAllFromVpcs}
                      disabled={deleting}
                      className={cn("bg-zinc-500/10 border border-zinc-500/20 hover:bg-zinc-500/20 hover:text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50", isDark ? "text-zinc-400" : "text-slate-500")}
                    >
                      {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unplug className="w-4 h-4" />}
                      Detach All VMs
                    </motion.button>
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onClick={() => setShowDeleteVpcModal('bulk')}
                      disabled={deleting}
                      className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      Delete Selected ({selectedVpcs.length})
                    </motion.button>
                  </>
                )}
              </AnimatePresence>
              <button
                onClick={() => setShowAddVpcModal(true)}
                className={cn("bg-cyan-500 hover:bg-cyan-600 border border-transparent px-4 py-2 rounded-lg flex items-center gap-2 transition-colors", isDark ? "text-white" : "text-slate-900")}
              >
                <Plus className="w-4 h-4" />
                Create VPC
              </button>
            </div>

            <div className="overflow-x-auto pb-4">
              <table className="w-full text-left whitespace-nowrap">
                <thead className={cn("text-sm", isDark ? "bg-[#1f3e5a]/50 text-zinc-300" : "bg-slate-50 text-slate-900 font-bold")}>
                  <tr>
                    <th className="px-6 py-4 font-bold w-12">
                      <button
                        onClick={handleSelectAllVisibleVpcs}
                        className={cn(
                          "w-5 h-5 rounded-md flex items-center justify-center transition-all",
                          isAllVisibleVpcsSelected
                            ? "bg-cyan-400"
                            : isDark ? "bg-black/40 border border-white/10 hover:border-cyan-400/50" : "bg-white border border-slate-300 hover:border-cyan-400"
                        )}
                      >
                        <CheckCircle className={cn("w-3.5 h-3.5", isAllVisibleVpcsSelected ? "text-[#0f172a]" : "text-transparent")} />
                      </button>
                    </th>
                    <th className="px-6 py-4 font-bold">Name</th>
                    <th className="px-6 py-4 font-bold">NAT Gateway</th>
                    <th className="px-6 py-4 font-bold">CIDR</th>
                    <th className="px-6 py-4 font-bold">Gateway</th>
                    <th className="px-6 py-4 font-bold">Resources</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                    <th className="px-6 py-4 font-bold">Description</th>
                    <th className="px-6 py-4 font-bold">
                      <div className="flex justify-end">
                        <span className="w-28 text-left pl-2">Actions</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f3e5a]/50 text-sm">
                  {loadingVpcs ? (
                    <tr>
                      <td colSpan={9} className={cn("px-6 py-12 text-center", isDark ? "text-zinc-400" : "text-slate-500")}>
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Loading VPCs...
                      </td>
                    </tr>
                  ) : visibleVpcs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center">
                        <div className="w-20 h-20 bg-cyan-500/10 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-cyan-500/20 transform -rotate-6">
                          <VpcIcon className="w-12 h-12 text-cyan-400 transform rotate-6" />
                        </div>
                        <h4 className={cn("text-lg font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No VPCs Provisioned</h4>
                        <p className={cn("text-sm max-w-sm mx-auto", isDark ? "text-zinc-400" : "text-slate-500")}>Create your first Virtual Private Cloud to isolate your instances securely.</p>
                      </td>
                    </tr>
                  ) : (
                    visibleVpcs.map(vpc => (
                      <tr key={vpc.id} className={cn("transition-colors group", isDark ? "hover:bg-white/5" : "hover:bg-slate-50")}>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => {
                              if (!selectedVpcs.includes(vpc.id)) {
                                setSelectedVpcs(prev => [...prev, vpc.id]);
                              } else {
                                setSelectedVpcs(prev => prev.filter(id => id !== vpc.id));
                              }
                            }}
                            className={cn(
                              "w-5 h-5 rounded-md flex items-center justify-center transition-all",
                              selectedVpcs.includes(vpc.id)
                                ? "bg-cyan-400"
                                : isDark ? "bg-black/40 border border-white/10 hover:border-cyan-400/50" : "bg-white border border-slate-300 hover:border-cyan-400"
                            )}
                          >
                            <CheckCircle className={cn("w-3.5 h-3.5", selectedVpcs.includes(vpc.id) ? "text-[#0f172a]" : "text-transparent")} />
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className={cn("font-medium", isDark ? "text-white" : "text-slate-900")}>{vpc.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="group/nat flex items-center gap-2">
                            <button
                              type="button"
                              disabled={togglingNat === vpc.id}
                              onClick={() => handleToggleNat(vpc.id, !vpc.isNatEnabled)}
                              className={cn(
                                "inline-flex items-center justify-center gap-1.5 w-fit text-[11px] uppercase font-bold px-2.5 py-1 rounded border shadow-sm transition-colors disabled:opacity-50",
                                vpc.isNatEnabled ? (isDark ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20" : "bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100") : (isDark ? "bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10" : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200")
                              )}
                            >
                              {vpc.isNatEnabled ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                              {vpc.isNatEnabled ? "Enabled" : "Disabled"}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(vpc.cidr);
                              toast.success("CIDR copied to clipboard");
                            }}
                            className={cn("group/cidr flex items-center gap-2 px-2 py-1 -ml-2 rounded transition-colors", isDark ? "hover:bg-cyan-950/30" : "hover:bg-cyan-50")}
                          >
                            <span className={cn("font-mono text-xs", isDark ? "text-cyan-400" : "text-cyan-700")}>{vpc.cidr}</span>
                            <Copy className={cn("w-3 h-3 opacity-0 group-hover/cidr:opacity-100 transition-all", isDark ? "text-zinc-500 group-hover/cidr:text-cyan-400" : "text-slate-500 group-hover/cidr:text-cyan-700")} />
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(vpc.gateway);
                              toast.success("Gateway IP copied to clipboard");
                            }}
                            className={cn("group/gw flex items-center gap-2 px-2 py-1 -ml-2 rounded transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-slate-100")}
                          >
                            <span className={cn("font-mono text-xs", isDark ? "text-zinc-300" : "text-slate-500")}>{vpc.gateway}</span>
                            <Copy className={cn("w-3 h-3 opacity-0 group-hover/gw:opacity-100 transition-all", isDark ? "text-zinc-500 group-hover/gw:text-white" : "text-slate-500 group-hover/gw:text-slate-900")} />
                          </button>
                        </td>
                        <td className={cn("px-6 py-4", isDark ? "text-zinc-300" : "text-slate-500")}>
                          <div className="flex items-center gap-4 text-xs">
                            <span className={cn("flex items-center gap-1", isDark ? "text-zinc-300" : "text-slate-500")}><Server className="w-3 h-3" /> {vpc._count.vpsServices} VMs</span>
                            <span className={cn("flex items-center gap-1", isDark ? "text-zinc-300" : "text-slate-500")}><Link2 className="w-3 h-3" /> {vpc._count.peeringsA + vpc._count.peeringsB} Peers</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {vpc.status === "PROVISIONING" && (
                            <span className={cn("flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full w-fit border", isDark ? "bg-amber-500/15 text-amber-400 border border-amber-500/25" : "bg-amber-50 text-amber-700 border-amber-200")}>
                              <Loader2 className="w-3 h-3 animate-spin" /> Provisioning
                            </span>
                          )}
                          {vpc.status === "ACTIVE" && (
                            <span className={cn("flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full w-fit border", isDark ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" : "bg-emerald-50 text-emerald-700 border-emerald-200")}>
                              <CheckCircle className="w-3 h-3" /> Active
                            </span>
                          )}
                          {vpc.status === "FAILED" && (
                            <span className={cn("flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full w-fit border", isDark ? "bg-red-500/15 text-red-400 border border-red-500/25" : "bg-red-50 text-red-700 border-red-200")}>
                              <AlertTriangle className="w-3 h-3" /> Failed
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {vpc.description
                            ? <span className={cn("text-sm", isDark ? "text-zinc-300" : "text-slate-500")}>{vpc.description}</span>
                            : <span className={cn("text-xs", isDark ? "text-zinc-600" : "text-slate-900")}>—</span>
                          }
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end">
                            <div className="flex items-center justify-start gap-2 w-28">
                              <button
                                onClick={() => handleOpenAttachModal(vpc.id)}
                                className={cn("p-2 rounded-lg transition-colors", isDark ? "text-zinc-400 hover:text-cyan-400 hover:bg-cyan-500/10" : "text-slate-500 hover:text-cyan-700 hover:bg-cyan-50")}
                                title="Attach VM"
                              >
                                <Plug className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setShowManageVmsModal(vpc.id);
                                  setManageVmsPage(1);
                                }}
                                className={cn("p-2 rounded-lg transition-colors", isDark ? "text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10" : "text-slate-500 hover:text-emerald-700 hover:bg-emerald-50")}
                                title="Manage Attached VMs"
                              >
                                <Unplug className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setShowDeleteVpcModal(vpc.id)}
                                className={cn("p-2 rounded-lg transition-colors", isDark ? "text-zinc-400 hover:text-red-400 hover:bg-red-500/10" : "text-slate-500 hover:text-red-700 hover:bg-red-50")}
                                title="Delete VPC"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {totalVpcsPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button onClick={() => setVpcsPage(p => Math.max(1, p - 1))} disabled={vpcsPage === 1} className={cn("px-3 py-1 bg-white/5 border rounded-md disabled:opacity-50", isDark ? "border-white/10" : "border-slate-200")}>Prev</button>
                  <span className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Page {vpcsPage} / {totalVpcsPages}</span>
                  <button onClick={() => setVpcsPage(p => Math.min(totalVpcsPages, p + 1))} disabled={vpcsPage === totalVpcsPages} className={cn("px-3 py-1 bg-white/5 border rounded-md disabled:opacity-50", isDark ? "border-white/10" : "border-slate-200")}>Next</button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "peering" && (
          <div className="p-6">
            <div className={cn("rounded-xl p-4 mb-6 flex items-start gap-3 border", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
              <Info className={cn("w-5 h-5 shrink-0 mt-0.5", isDark ? "text-cyan-500" : "text-cyan-600")} />
              <div className={cn("text-sm", isDark ? "text-cyan-200" : "text-cyan-800")}>
                <p className={cn("font-medium mb-1", isDark ? "text-cyan-500" : "text-cyan-700")}>About VPC Peering</p>
                <p>VPC Peering allows instances in two different VPCs to communicate with each other using private IP addresses. CIDR ranges of peered VPCs must not overlap.</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mb-6">
              <AnimatePresence>
                {selectedPeerings.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={() => setShowDeletePeeringModal('bulk')}
                    disabled={deleting}
                    className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Delete Selected ({selectedPeerings.length})
                  </motion.button>
                )}
              </AnimatePresence>
              <button
                onClick={() => setShowAddPeeringModal(true)}
                className={cn("bg-cyan-500 hover:bg-cyan-600 border border-transparent px-4 py-2 rounded-lg flex items-center gap-2 transition-colors", isDark ? "text-white" : "text-slate-900")}
              >
                <Link2 className="w-4 h-4" />
                Create Peering
              </button>
            </div>

            <div className="overflow-x-auto pb-4">
              <table className="w-full text-left whitespace-nowrap">
                <thead className={cn("text-sm", isDark ? "bg-[#1f3e5a]/50 text-zinc-300" : "bg-slate-50 text-slate-900 font-bold")}>
                  <tr>
                    <th className="px-6 py-4 font-bold w-12">
                      <button
                        onClick={handleSelectAllVisiblePeerings}
                        className={cn(
                          "w-5 h-5 rounded-md flex items-center justify-center transition-all",
                          isAllVisiblePeeringsSelected
                            ? "bg-cyan-400"
                            : isDark ? "bg-black/40 border border-white/10 hover:border-cyan-400/50" : "bg-white border border-slate-300 hover:border-cyan-400"
                        )}
                      >
                        <CheckCircle className={cn("w-3.5 h-3.5", isAllVisiblePeeringsSelected ? "text-[#0f172a]" : "text-transparent")} />
                      </button>
                    </th>
                    <th className="px-6 py-4 font-bold">VPC A</th>
                    <th className="px-6 py-4 font-bold">VPC B</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                    <th className="px-6 py-4 font-bold hidden md:table-cell">Description</th>
                    <th className="px-6 py-4 font-bold">
                      <div className="flex justify-end">
                        <span className="w-28 text-left pl-2">Actions</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f3e5a]/50 text-sm">
                  {loadingPeerings ? (
                    <tr>
                      <td colSpan={6} className={cn("px-6 py-12 text-center", isDark ? "text-zinc-400" : "text-slate-500")}>
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Loading Peerings...
                      </td>
                    </tr>
                  ) : visiblePeerings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="w-20 h-20 bg-cyan-500/10 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-cyan-500/20 transform -rotate-6">
                          <Link2 className="w-10 h-10 text-cyan-400 transform rotate-6" />
                        </div>
                        <h4 className={cn("text-lg font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>No VPC Peerings</h4>
                        <p className={cn("text-sm max-w-sm mx-auto", isDark ? "text-zinc-400" : "text-slate-500")}>Connect two VPCs to route traffic between them using private IP addresses.</p>
                      </td>
                    </tr>
                  ) : (
                    visiblePeerings.map(peering => (
                      <tr key={peering.id} className={cn("transition-colors group", isDark ? "hover:bg-white/5" : "hover:bg-slate-50")}>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => {
                              if (!selectedPeerings.includes(peering.id)) {
                                setSelectedPeerings(prev => [...prev, peering.id]);
                              } else {
                                setSelectedPeerings(prev => prev.filter(id => id !== peering.id));
                              }
                            }}
                            className={cn(
                              "w-5 h-5 rounded-md flex items-center justify-center transition-all",
                              selectedPeerings.includes(peering.id)
                                ? "bg-cyan-400"
                                : isDark ? "bg-black/40 border border-white/10 hover:border-cyan-400/50" : "bg-white border border-slate-300 hover:border-cyan-400"
                            )}
                          >
                            <CheckCircle className={cn("w-3.5 h-3.5", selectedPeerings.includes(peering.id) ? "text-[#0f172a]" : "text-transparent")} />
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className={cn("font-medium", isDark ? "text-white" : "text-slate-900")}>{peering.vpcA.name}</div>
                          <div className={cn("text-xs font-mono mt-0.5", isDark ? "text-zinc-500" : "text-slate-500")}>{peering.vpcA.cidr}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={cn("font-medium", isDark ? "text-white" : "text-slate-900")}>{peering.vpcB.name}</div>
                          <div className={cn("text-xs font-mono mt-0.5", isDark ? "text-zinc-500" : "text-slate-500")}>{peering.vpcB.cidr}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border", isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200")}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", isDark ? "bg-emerald-400" : "bg-emerald-600")}></span>
                            {peering.status}
                          </span>
                        </td>
                        <td className={cn("px-6 py-4 hidden md:table-cell max-w-xs truncate", isDark ? "text-zinc-400" : "text-slate-500")}>
                          <span title={peering.description || ""}>
                            {peering.description ? peering.description : <span className={cn("", isDark ? "text-zinc-600" : "text-slate-900")}>-</span>}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end">
                            <div className="flex items-center justify-start gap-2 w-28 pl-2">
                              <button
                                onClick={() => setShowDeletePeeringModal(peering.id)}
                                className={cn("p-2 rounded-lg transition-colors inline-flex", isDark ? "text-zinc-400 hover:text-red-400 hover:bg-red-500/10" : "text-slate-500 hover:text-red-700 hover:bg-red-50")}
                                title="Delete Peering"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {totalPeeringsPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6 mb-2">
                  <button onClick={() => setPeeringsPage(p => Math.max(1, p - 1))} disabled={peeringsPage === 1} className={cn("px-3 py-1 bg-white/5 border rounded-md disabled:opacity-50", isDark ? "border-white/10" : "border-slate-200")}>Prev</button>
                  <span className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>Page {peeringsPage} / {totalPeeringsPages}</span>
                  <button onClick={() => setPeeringsPage(p => Math.min(totalPeeringsPages, p + 1))} disabled={peeringsPage === totalPeeringsPages} className={cn("px-3 py-1 bg-white/5 border rounded-md disabled:opacity-50", isDark ? "border-white/10" : "border-slate-200")}>Next</button>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Create VPC Modal */}
      <AnimatePresence>
        {showAddVpcModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={cn("border rounded-3xl p-6 md:p-8 w-full max-w-md shadow-md relative overflow-hidden transform-gpu", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200")}>
                            <h2 className={cn("text-2xl font-bold mb-6 relative z-10 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                <VpcIcon className="w-6 h-6 text-cyan-400" /> Create VPC
              </h2>

              <div className="space-y-4">
                <div>
                  <label className={cn("block text-sm font-medium mb-1.5", isDark ? "text-zinc-300" : "text-slate-500")}>VPC Name</label>
                  <input
                    type="text"
                    value={vpcForm.name}
                    onChange={(e) => setVpcForm({ ...vpcForm, name: e.target.value })}
                    placeholder="e.g. Production Network"
                    className={cn("w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder-zinc-500" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-1 focus:ring-cyan-500")}
                  />
                </div>

                <div>
                  <label className={cn("block text-sm font-medium mb-1.5", isDark ? "text-zinc-300" : "text-slate-500")}>Description (Optional)</label>
                  <input
                    type="text"
                    value={vpcForm.description}
                    onChange={(e) => setVpcForm({ ...vpcForm, description: e.target.value })}
                    placeholder="e.g. Main network for web servers"
                    className={cn("w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder-zinc-500" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-1 focus:ring-cyan-500")}
                  />
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-cyan-500/5 border border-cyan-500/10 rounded-xl hover:bg-cyan-500/10 transition-colors">
                    <div className="relative shrink-0">
                      <input
                        type="checkbox"
                        checked={vpcForm.isNatEnabled}
                        onChange={(e) => setVpcForm({ ...vpcForm, isNatEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-black/50 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                    </div>
                    <div>
                      <span className={cn("text-sm font-medium block", isDark ? "text-white" : "text-slate-900")}>Enable NAT Gateway</span>
                      <span className={cn("text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>Allows VPS inside VPC to access the Internet</span>
                    </div>
                  </label>
                </div>

                <div>
                  <label className={cn("block text-sm font-medium mb-1.5", isDark ? "text-zinc-300" : "text-slate-500")}>IPv4 CIDR Block <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={vpcForm.cidr}
                    onChange={(e) => setVpcForm({ ...vpcForm, cidr: e.target.value })}
                    placeholder="e.g. 10.10.100.0/24"
                    className={cn(
                      isDark ? "w-full bg-[#060b14] border-slate-800 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none font-mono text-sm" : "w-full bg-white border rounded-lg px-4 py-2 text-slate-900 placeholder-slate-400 focus:outline-none font-mono text-sm",
                      (vpcForm.cidr && validateCidr(vpcForm.cidr).error) ? "border-red-500 focus:border-red-500 ring-1 ring-red-500" : "border-[#1f3e5a] focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    )}
                  />
                  {(vpcForm.cidr && validateCidr(vpcForm.cidr).error) ? (
                    <p className="text-xs text-red-400 mt-2">
                      {validateCidr(vpcForm.cidr).error}
                      {validateCidr(vpcForm.cidr).suggestion && (
                        <> - <button type="button" onClick={() => setVpcForm({ ...vpcForm, cidr: validateCidr(vpcForm.cidr).suggestion! })} className="text-cyan-400 hover:underline">Did you mean {validateCidr(vpcForm.cidr).suggestion}?</button></>
                      )}
                    </p>
                  ) : (
                    <p className={cn("text-xs mt-2", isDark ? "text-zinc-400" : "text-slate-500")}>
                      Must be a private IP range (RFC 1918). e.g., 10.x.x.x, 172.16.x.x, 192.168.x.x.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  onClick={() => setShowAddVpcModal(false)}
                  className={cn("px-6 py-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50", isDark ? "bg-white/5 hover:bg-white/10 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-900")}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateVpc}
                  disabled={saving}
                  className={cn("px-6 py-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-[#011627] shadow-sm" : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-md")}
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create VPC
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Peering Modal */}
      <AnimatePresence>
        {showAddPeeringModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={cn("border rounded-3xl p-6 md:p-8 w-full max-w-2xl shadow-md relative overflow-hidden transform-gpu", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200")}>
                            <h2 className={cn("text-2xl font-bold mb-2 flex items-center gap-2 relative z-10", isDark ? "text-white" : "text-slate-900")}>
                <Link2 className="w-6 h-6 text-cyan-400" />
                Create VPC Peering
              </h2>
              <p className={cn("text-sm mb-6", isDark ? "text-zinc-400" : "text-slate-500")}>Connect two VPCs to route traffic between them using private IP addresses.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div>
                  <label className={cn("block text-sm font-medium mb-1.5", isDark ? "text-zinc-300" : "text-slate-500")}>VPC A <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <Select
                      value={peeringForm.vpcAId}
                      onChange={(val) => setPeeringForm({ ...peeringForm, vpcAId: val })}
                      placeholder="-- Select --"
                      options={vpcs.map(v => ({ value: v.id.toString(), label: `${v.name} (${v.cidr})` }))}
                      className={cn("w-full", isDark ? "text-white" : "text-slate-900")}
                    />

                  </div>
                </div>

                <div>
                  <label className={cn("block text-sm font-medium mb-1.5", isDark ? "text-zinc-300" : "text-slate-500")}>VPC B <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <Select
                      value={peeringForm.vpcBId}
                      onChange={(val) => setPeeringForm({ ...peeringForm, vpcBId: val })}
                      placeholder="-- Select --"
                      options={vpcs.filter(v => {
                        if (v.id.toString() === peeringForm.vpcAId) return false;
                        const alreadyPeered = peerings.some(p =>
                          (p.vpcA.id.toString() === peeringForm.vpcAId && p.vpcB.id === v.id) ||
                          (p.vpcB.id.toString() === peeringForm.vpcAId && p.vpcA.id === v.id)
                        );
                        return !alreadyPeered;
                      }).map(v => ({ value: v.id.toString(), label: `${v.name} (${v.cidr})` }))}
                      className={cn("w-full", isDark ? "text-white" : "text-slate-900")}
                    />

                  </div>
                </div>
              </div>

              <div className="mt-6">
                <label className={cn("block text-sm font-medium mb-1.5", isDark ? "text-zinc-300" : "text-slate-500")}>Description (Optional)</label>
                <input
                  type="text"
                  value={peeringForm.description}
                  onChange={(e) => setPeeringForm({ ...peeringForm, description: e.target.value })}
                  className={cn("w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:border-cyan-500", isDark ? "bg-[#060b14] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900 focus:ring-1 focus:ring-cyan-500")}
                />
              </div>

              <div className={cn("border rounded-lg p-3 mt-6 flex items-start gap-2", isDark ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-50 border-amber-200")}>
                <AlertTriangle className={cn("w-4 h-4 shrink-0 mt-0.5", isDark ? "text-amber-500" : "text-amber-600")} />
                <p className={cn("text-xs", isDark ? "text-amber-200" : "text-amber-800")}>VPC CIDR ranges must not overlap. The system will auto-configure Mikrotik routing tables.</p>
              </div>

              <div className={cn("border rounded-lg p-3 mt-3 flex items-start gap-2", isDark ? "bg-cyan-500/10 border-cyan-500/20" : "bg-cyan-50 border-cyan-200")}>
                <ShieldAlert className={cn("w-4 h-4 shrink-0 mt-0.5", isDark ? "text-cyan-400" : "text-cyan-600")} />
                <p className={cn("text-xs", isDark ? "text-cyan-200" : "text-cyan-800")}>
                  <strong className={cn(isDark ? "text-cyan-100" : "text-cyan-900")}>Security Note:</strong> After peering is created, you must manually add a Firewall Rule to your VMs (via Global Firewall Management) to allow inbound traffic from the peered VPC's CIDR block.
                </p>
              </div>

              <div className="flex justify-start gap-3 mt-6">
                <button
                  onClick={handleAddPeeringSubmit}
                  disabled={saving}
                  className={cn("px-6 py-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50", isDark ? "bg-cyan-500 hover:bg-cyan-400 text-[#011627] shadow-sm" : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-md")}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Create Peering
                </button>
                <button
                  onClick={() => setShowAddPeeringModal(false)}
                  className={cn("px-6 py-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50", isDark ? "bg-white/5 hover:bg-white/10 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-900")}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Modals */}
      <ConfirmModal
        isOpen={showDeleteVpcModal !== null}
        onClose={() => setShowDeleteVpcModal(null)}
        onConfirm={handleDeleteVpc}
        isLoading={deleting}
        title={showDeleteVpcModal === 'bulk' ? `Delete ${selectedVpcs.length} VPC(s)` : "Delete VPC"}
        description={showDeleteVpcModal === 'bulk' ? `Are you sure you want to delete ${selectedVpcs.length} VPC(s)? This action cannot be undone.` : "Are you sure you want to delete this VPC? This action cannot be undone and will remove the VLAN configuration from the router."}
        confirmText={showDeleteVpcModal === 'bulk' ? "Delete All" : "Delete VPC"}
      />

      <ConfirmModal
        isOpen={showDeletePeeringModal !== null}
        onClose={() => setShowDeletePeeringModal(null)}
        onConfirm={handleDeletePeering}
        isLoading={deleting}
        title={showDeletePeeringModal === 'bulk' ? `Delete ${selectedPeerings.length} Peering(s)` : "Delete VPC Peering"}
        description={showDeletePeeringModal === 'bulk' ? `Are you sure you want to delete ${selectedPeerings.length} Peering connection(s)?` : "Are you sure you want to delete this Peering connection? Instances in these VPCs will no longer be able to communicate with each other."}
        confirmText={showDeletePeeringModal === 'bulk' ? "Delete All" : "Delete Peering"}
      />

      <ConfirmModal
        isOpen={detachVmModal !== null}
        onClose={() => setDetachVmModal(null)}
        onConfirm={handleDetachVm}
        isLoading={deleting}
        title="Detach VM"
        description={`Are you sure you want to detach ${detachVmModal?.hostname}? This will remove its internal network interface.`}
        confirmText="Detach"
      />

      {/* Attach VM Modal */}
      <AnimatePresence>
        {showAttachVmModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={cn("border rounded-3xl p-6 md:p-8 w-full max-w-md shadow-md relative overflow-hidden transform-gpu", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200")}>
                            <h2 className={cn("text-2xl font-bold mb-6 relative z-10 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                <Plug className="w-6 h-6 text-cyan-400" /> Attach VM
              </h2>

              <div className="space-y-4">
                <div>
                  <label className={cn("block text-sm font-medium mb-1.5", isDark ? "text-zinc-300" : "text-slate-500")}>Select VM</label>
                  {availableVms.length > 0 ? (
                    <Select
                      value={attachForm.vpsId}
                      onChange={(val) => setAttachForm({ ...attachForm, vpsId: val })}
                      options={availableVms.map(vm => ({ value: vm.id.toString(), label: vm.hostname }))}
                      placeholder="Choose a VM..."
                    />
                  ) : (
                    <div className={cn("p-3 rounded-lg border bg-white/5 text-sm", isDark ? "border-white/10 text-zinc-400" : "border-slate-200 text-slate-500")}>
                      No available VMs found.
                    </div>
                  )}
                </div>

                <div>
                  <label className={cn("block text-sm font-medium mb-1.5", isDark ? "text-zinc-300" : "text-slate-500")}>Static Private IP <span className="text-red-400">*</span></label>
                  {(() => {
                    const currentVpc = vpcs.find(v => v.id === showAttachVmModal);
                    const ipRange = currentVpc ? getUsableIpRange(currentVpc.cidr, currentVpc.gateway || '') : null;
                    const placeholderText = ipRange ? `e.g. ${ipRange.first}` : 'e.g. 10.10.100.5';
                    return (
                      <>
                        <input
                          type="text"
                          value={attachForm.privateIpAddress}
                          onChange={(e) => setAttachForm({ ...attachForm, privateIpAddress: e.target.value })}
                          placeholder={placeholderText}
                          className={cn("w-full border rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500 font-mono text-sm", isDark ? "bg-[#060b14] border-slate-800 text-white placeholder-zinc-500" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-1 focus:ring-cyan-500")}
                        />
                        {ipRange && (
                          <p className="text-[11px] text-cyan-400/70 mt-1.5 font-mono">
                            Valid range: <span className="text-cyan-300 font-bold">{ipRange.first}</span> – <span className="text-cyan-300 font-bold">{ipRange.last}</span> ({ipRange.count} usable IPs)
                          </p>
                        )}
                      </>
                    );
                  })()}
                  <p className={cn("text-[11px] mt-2", isDark ? "text-zinc-400" : "text-slate-500")}>
                    Note: Attaching the VM to a VPC requires a reboot to apply the new network interface. Please restart the VM from its control panel afterward.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  onClick={() => setShowAttachVmModal(null)}
                  className={cn("px-4 py-2 hover:text-white transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAttachVm}
                  disabled={saving || !attachForm.vpsId || !attachForm.privateIpAddress.trim()}
                  className={cn("bg-cyan-500 hover:bg-cyan-600 px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50", isDark ? "text-white" : "text-slate-900")}
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Attach VM
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Manage VMs Modal */}
      <AnimatePresence>
        {showManageVmsModal !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={cn("border rounded-3xl p-6 md:p-8 w-full max-w-2xl shadow-md relative overflow-hidden transform-gpu", isDark ? "bg-[#0b1322] border-slate-800" : "bg-white border-slate-200")}>
                            <div className="flex items-center justify-between mb-2 relative z-10">
                <h2 className={cn("text-2xl font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                  <Unplug className="w-6 h-6 text-cyan-400" /> Manage Attached VMs
                </h2>
                <button onClick={() => setShowManageVmsModal(null)} className={cn("hover:text-white p-2 transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className={cn("text-sm mb-6 relative z-10 pr-8", isDark ? "text-zinc-400" : "text-slate-500")}>
                View all Virtual Machines connected to this VPC. Detaching a VM will safely remove its private IP address and disconnect it from this network.
              </p>

              <div className="overflow-y-auto max-h-[50vh] pr-2">
                {(() => {
                  const currentVpc = vpcs.find(v => v.id === showManageVmsModal);
                  if (!currentVpc) return null;

                  if (!currentVpc.vpsServices || currentVpc.vpsServices.length === 0) {
                    return (
                      <div className={cn("flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed rounded-2xl", isDark ? "border-slate-800 bg-[#060b14]" : "border-slate-300 bg-slate-50")}>
                        <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-4 ring-4", isDark ? "bg-[#1f3e5a]/50 ring-[#1f3e5a]/20" : "bg-slate-200 ring-slate-100")}>
                          <Unplug className={cn("w-8 h-8", isDark ? "text-zinc-500" : "text-slate-500")} />
                        </div>
                        <h3 className={cn("text-lg font-semibold mb-1", isDark ? "text-white" : "text-slate-900")}>No VMs Attached</h3>
                        <p className={cn("text-sm text-center max-w-sm", isDark ? "text-zinc-400" : "text-slate-500")}>
                          This VPC is currently empty. You can attach a VM from the actions menu to connect it to this network.
                        </p>
                      </div>
                    );
                  }

                  const vmsPerPage = 5;
                  const totalPages = Math.ceil(currentVpc.vpsServices.length / vmsPerPage);
                  const startIndex = (manageVmsPage - 1) * vmsPerPage;
                  const visibleVms = currentVpc.vpsServices.slice(startIndex, startIndex + vmsPerPage);

                  return (
                    <div className="space-y-4">
                      {selectedAttachedVms.length > 0 && (
                        <div className={cn("px-4 py-3 border rounded-xl flex items-center justify-between mb-4", isDark ? "bg-black/20 border-white/5" : "bg-slate-50/50 border-slate-200")}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-cyan-400 font-bold bg-cyan-500/10 px-2 py-1 rounded-md border border-cyan-500/20">{selectedAttachedVms.length} selected</span>
                            <button
                              onClick={handleBulkDetachVm}
                              disabled={deleting}
                              className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors text-xs font-medium flex items-center gap-1.5 border border-red-500/20 hover:border-red-500/30 disabled:opacity-50"
                            >
                              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              <span>{selectedAttachedVms.length === currentVpc.vpsServices!.length ? 'Detach All' : 'Detach Selected'}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      <div className={cn("overflow-x-auto rounded-xl border", isDark ? "border-slate-800 bg-[#060b14]" : "border-slate-200 bg-white")}>
                        <table className="w-full text-left border-collapse min-w-[500px]">
                          <thead>
                            <tr className={cn("border-b", isDark ? "border-white/5 bg-white/5" : "border-slate-200 bg-slate-50")}>
                              <th className={cn("py-3 px-4 font-semibold text-xs w-12 text-center", isDark ? "text-zinc-400" : "text-slate-500")}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (selectedAttachedVms.length === currentVpc.vpsServices!.length) {
                                      setSelectedAttachedVms([]);
                                    } else {
                                      setSelectedAttachedVms(currentVpc.vpsServices!.map((v: any) => v.id));
                                    }
                                  }}
                                  className={cn(
                                    "w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all duration-200 mx-auto",
                                    currentVpc.vpsServices!.length > 0 && selectedAttachedVms.length === currentVpc.vpsServices!.length
                                      ? "bg-cyan-400" 
                                      : isDark ? "bg-black/40 border border-white/10 hover:border-cyan-400/50" : "bg-white border border-slate-300 hover:border-cyan-400"
                                  )}
                                >
                                  <CheckCircle className={cn("w-3.5 h-3.5", currentVpc.vpsServices!.length > 0 && selectedAttachedVms.length === currentVpc.vpsServices!.length ? "text-[#0f172a]" : "text-transparent")} />
                                </button>
                              </th>
                              <th className={cn("py-3 px-4 font-semibold text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>Hostname</th>
                              <th className={cn("py-3 px-4 font-semibold text-xs", isDark ? "text-zinc-400" : "text-slate-500")}>VPC IP Address</th>
                              <th className={cn("py-3 px-4 font-semibold text-xs text-right", isDark ? "text-zinc-400" : "text-slate-500")}>Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {visibleVms.map((vps, idx) => (
                              <tr key={vps.id} className={cn("transition-colors group", isDark ? "hover:bg-white/5" : "hover:bg-slate-50")}>
                                <td className="py-3 px-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (selectedAttachedVms.includes(vps.id)) {
                                        setSelectedAttachedVms(prev => prev.filter(id => id !== vps.id));
                                      } else {
                                        setSelectedAttachedVms(prev => [...prev, vps.id]);
                                      }
                                    }}
                                    className={cn(
                                      "w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all duration-200 mx-auto",
                                      selectedAttachedVms.includes(vps.id)
                                        ? "bg-cyan-400" 
                                        : "bg-black/40 border border-white/10 hover:border-cyan-400/50 group-hover:border-cyan-400/30"
                                    )}
                                  >
                                    <CheckCircle className={cn("w-3.5 h-3.5", selectedAttachedVms.includes(vps.id) ? "text-[#0f172a]" : "text-transparent")} />
                                  </button>
                                </td>
                                <td className="py-3 px-4">
                                  <div className={cn("font-medium text-sm", isDark ? "text-white" : "text-slate-900")}>{vps.hostname}</div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="text-xs text-cyan-400 font-mono bg-cyan-500/10 px-2 py-1 inline-block rounded border border-cyan-500/20 shadow-sm shadow-cyan-500/10">{vps.vpcIp}</div>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <button
                                    onClick={() => setDetachVmModal({ vpcId: currentVpc.id, vpsId: vps.id, hostname: vps.hostname })}
                                    className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-red-500/20 hover:border-transparent inline-flex items-center gap-1.5"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Detach
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {totalPages > 1 && (
                        <div className={cn("flex items-center justify-between pt-4 border-t mt-4", isDark ? "border-white/10" : "border-slate-200")}>
                          <button
                            onClick={() => setManageVmsPage(p => Math.max(1, p - 1))}
                            disabled={manageVmsPage === 1}
                            className={cn("px-4 py-2 border rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed", isDark ? "bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300" : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700")}
                          >
                            Previous
                          </button>
                          <span className={cn("text-sm font-medium px-3 py-1 rounded-full border", isDark ? "text-zinc-400 bg-black/20 border-white/5" : "text-slate-500 bg-slate-50/50 border-slate-200")}>
                            Page {manageVmsPage} of {totalPages}
                          </span>
                          <button
                            onClick={() => setManageVmsPage(p => Math.min(totalPages, p + 1))}
                            disabled={manageVmsPage === totalPages}
                            className={cn("px-4 py-2 border rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed", isDark ? "bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300" : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700")}
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}