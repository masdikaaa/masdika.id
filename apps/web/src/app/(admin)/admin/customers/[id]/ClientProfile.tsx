'use client';
import { useUrlNumber, useUrlTab } from "@/lib/useUrlTab";
import { cn } from "@/lib/utils";

import { useState, useEffect } from 'react';
import { User, Activity, FileText, Settings, ShieldAlert, ArrowLeft, Database, Link2, Key, Server, CheckCircle, XCircle, Clock, AlertTriangle, Ban, Box, Globe, Music, HardDrive, Edit3, Terminal, UploadCloud } from 'lucide-react';
import { useTheme } from "@/components/ThemeProvider";
import { SiKubernetes } from 'react-icons/si';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { formatRupiah } from '@/lib/billing';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { AdminEditServiceModal } from '@/components/ui/AdminEditServiceModal';
import { AdminLoader } from '@/components/admin/AdminLoader';
import { Select } from '@/components/ui/Select';

const StatusBadge = ({ status }: { status: string }) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const upperStatus = status?.toUpperCase() || 'UNKNOWN';
  if (upperStatus === 'ACTIVE' || upperStatus === 'PAID') {
    return (
      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border", isDark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700")}>
        <CheckCircle className="w-3.5 h-3.5" /> {upperStatus}
      </span>
    );
  }
  if (upperStatus === 'SUSPENDED') {
    return (
      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border", isDark ? "bg-orange-500/10 border-orange-500/20 text-orange-400" : "bg-orange-50 border-orange-200 text-orange-700")}>
        <Ban className="w-3.5 h-3.5" /> {upperStatus}
      </span>
    );
  }
  if (upperStatus === 'PENDING') {
    return (
      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border", isDark ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-cyan-50 border-cyan-200 text-cyan-700")}>
        <Clock className="w-3.5 h-3.5" /> {upperStatus}
      </span>
    );
  }
  if (upperStatus === 'EXPIRED' || upperStatus === 'FAILED' || upperStatus === 'CANCELED') {
    return (
      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border", isDark ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-200 text-red-700")}>
        <AlertTriangle className="w-3.5 h-3.5" /> {upperStatus}
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-zinc-500/10 border border-zinc-500/20", isDark ? "text-zinc-400" : "text-slate-500")}>
      {upperStatus}
    </span>
  );
};

const PaginatedTable = ({ data, columns, renderRow, emptyMessage, itemsPerPage = 5 }: any) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [page, setPage] = useUrlNumber("page", 1);
  if (!data || data.length === 0) {
    return <div className={cn("p-8 text-center text-sm", isDark ? "text-zinc-500" : "text-slate-500")}>{emptyMessage}</div>;
  }
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const paginatedData = data.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="flex flex-col h-full">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className={cn("text-xs uppercase tracking-wider border-b", isDark ? "bg-black/20 text-zinc-500 border-white/10" : "bg-slate-50 text-slate-500 border-slate-200")}>
              {columns.map((c: any, i: number) => (
                <th key={i} className={`p-4 font-semibold ${c.align === 'right' ? 'text-right' : ''}`}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className={cn("divide-y", isDark ? "divide-white/5" : "divide-slate-200")}>
            {paginatedData.map(renderRow)}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className={cn("p-4 border-t bg-white/[0.01]", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
};

export default function ClientProfile({ userId }: { userId: string }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useUrlTab<string>('summary'); // summary, services, invoices

  // Suspend Modal State
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<{serviceType: string, id: number, label: string} | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [isSuspending, setIsSuspending] = useState(false);

  // Terminate Modal State
  const [terminateModalOpen, setTerminateModalOpen] = useState(false);
  const [terminateTarget, setTerminateTarget] = useState<{serviceType: string, id: number, label: string} | null>(null);
  const [isTerminating, setIsTerminating] = useState(false);

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{serviceType: string, id: number, label: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Custom Service Modal
  const [createCustomServiceModal, setCreateCustomServiceModal] = useState(false);
  const [csForm, setCsForm] = useState({ name: '', description: '', price: '', billingCycle: '1_MONTH', expiresAt: '' });
  const [isCreatingCs, setIsCreatingCs] = useState(false);

  // Edit Service Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setUser(data.data);
      } else {
        toast.error("Failed to load user profile");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomService = async (e: any) => {
    e.preventDefault();
    setIsCreatingCs(true);
    const toastId = toast.loading("Creating custom service & invoice...");
    try {
      const res = await fetch("/api/admin/custom-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...csForm, userId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Custom service and pending invoice created!", { id: toastId });
        setCreateCustomServiceModal(false);
        setCsForm({ name: '', description: '', price: '', billingCycle: '1_MONTH', expiresAt: '' });
        fetchUserData();
      } else {
        toast.error(data.error || "Failed to create", { id: toastId });
      }
    } catch (err) {
      toast.error("An error occurred", { id: toastId });
    } finally {
      setIsCreatingCs(false);
    }
  };  const allServices = user ? [
    ...(user.subscriptions?.map((s: any) => {
      let serviceName = s.plan?.service || 'UNKNOWN';
      let icon = <Activity className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-700")} />;

      if (serviceName === 'OBJECT_STORAGE') {
        serviceName = 'File CDN';
        icon = <HardDrive className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-700")} />;
      } else if (serviceName === 'SHORTENER') {
        serviceName = 'URL Shortener';
        icon = <Link2 className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-700")} />;
      } else if (serviceName === 'CDN') {
        serviceName = 'CDN';
        icon = <UploadCloud className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-700")} />;
      } else if (serviceName === 'SPOTIFY') {
        icon = <Music className="w-4 h-4 text-green-400" />;
      } else if (serviceName === 'BMKG_EARTHQUAKE') {
        icon = <Activity className="w-4 h-4 text-orange-400" />;
      }
      
      return {
        id: s.id,
        category: 'Subscription',
        type: 'subscriptions',
        name: s.plan ? `${s.plan.name} (${serviceName})` : 'Unknown Plan',
        detail: (
          <div className="flex flex-col gap-0.5">
            <span className={cn("text-sm font-medium", isDark ? "text-zinc-300" : "text-slate-600")}>Expires: {s.expiresAt ? new Date(s.expiresAt).toLocaleDateString() : 'N/A'}</span>
            <span className={cn("text-[11px] font-mono", isDark ? "text-zinc-400" : "text-slate-500")}>Registration Date: {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'N/A'}</span>
            {s.billingType === 'PAYG' && (
              <span className={cn("text-xs font-semibold mt-1 px-2 py-0.5 rounded w-fit border", isDark ? "bg-white/5 border-white/10 text-zinc-300" : "bg-slate-50 border-slate-200 text-slate-700")}>
                PAYG Meter: {s.usageCount ? s.usageCount.toLocaleString() : 0} reqs
              </span>
            )}
          </div>
        ),
        status: s.status,
        suspendReason: s.suspendReason,
        icon,
        createdAt: s.createdAt,
        rawData: s
      };
    }) || []),
    ...(user.vpsServices?.map((vps: any) => ({
      id: vps.id,
      category: 'Cloud VPS',
      type: 'vps',
      name: vps.hostname || `VPS #${vps.id}`,
      detail: (
        <div className="flex flex-col gap-0.5 mt-0.5">
          <div className="text-sm font-medium truncate">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className={cn("font-semibold", isDark ? "text-zinc-300" : "text-slate-800")}>Pay As You Go</span>
              </div>
              <span className={cn(isDark ? "text-zinc-300" : "text-slate-600")}>Expires: {vps.expiresAt ? new Date(vps.expiresAt).toLocaleDateString() : 'N/A'}</span>
              <span className={cn("text-[11px] font-normal font-mono", isDark ? "text-zinc-400" : "text-slate-500")}>Registration Date: {vps.createdAt ? new Date(vps.createdAt).toLocaleDateString() : 'N/A'}</span>
            </div>
          </div>
          <div className={cn("text-[11px] font-mono truncate", isDark ? "text-zinc-500" : "text-slate-500")}>
            {vps.cpuCores}C • {vps.ramGb}G • {vps.diskGb}G • IP: {vps.assignedIps?.length ? (vps.assignedIps.length > 1 ? `${vps.assignedIps[0].ipAddress} (+${vps.assignedIps.length - 1})` : vps.assignedIps[0].ipAddress) : 'Unassigned'}
          </div>
        </div>
      ),
      status: vps.status,
      suspendReason: vps.suspendReason,
      icon: <Terminal className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-700")} />,
      createdAt: vps.createdAt,
      rawData: vps
    })) || []),
    ...(user.kubernetesClusters?.map((k8s: any) => ({
      id: k8s.id,
      category: 'Kubernetes',
      type: 'kubernetes',
      name: k8s.name || `Cluster #${k8s.id}`,
      detail: (
        <div className="flex flex-col gap-0.5 mt-0.5">
          <div className="text-sm font-medium truncate">
             <span className={cn("font-semibold", isDark ? "text-zinc-300" : "text-slate-800")}>Pay As You Go</span>
          </div>
          <div className={cn("text-[11px] font-mono truncate", isDark ? "text-zinc-500" : "text-slate-500")}>
            {k8s.endpoint ? `Endpoint: ${k8s.endpoint}` : 'Pending Endpoint'} • Version: {k8s.version}
          </div>
        </div>
      ),
      status: k8s.status,
      suspendReason: k8s.suspendReason,
      icon: <SiKubernetes className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-700")} />,
      createdAt: k8s.createdAt,
      rawData: k8s
    })) || []),
    ...(user.customServices?.map((cs: any) => ({
      id: cs.id,
      category: 'Custom Service',
      type: 'custom-services',
      name: cs.name,
      detail: (
        <div className="flex flex-col gap-0.5 mt-0.5">
          <div className={cn("text-sm font-medium truncate", isDark ? "text-zinc-300" : "text-slate-600")}>
             {cs.description || 'No description provided'}
          </div>
          <div className={cn("text-[11px] font-mono truncate", isDark ? "text-zinc-500" : "text-slate-500")}>
            {formatRupiah(cs.price)} / {cs.billingCycle} • Expires: {cs.expiresAt ? new Date(cs.expiresAt).toLocaleDateString() : 'N/A'}
          </div>
        </div>
      ),
      status: cs.status,
      suspendReason: null,
      icon: <FileText className="w-4 h-4 text-orange-400" />,
      createdAt: cs.createdAt,
      rawData: cs
    })) || []),
  ] : [];

  // Sort services so newest is at the top
  allServices.sort((a: any, b: any) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  useEffect(() => {
    fetchUserData();
  }, [userId]);




  const handleSuspendService = (serviceType: string, id: number, currentStatus: string, label: string) => {
    const isCurrentlySuspended = currentStatus === 'SUSPENDED';

    if (!isCurrentlySuspended) {
      setSuspendTarget({ serviceType, id, label });
      setSuspendReason("");
      setSuspendModalOpen(true);
    } else {
      executeSuspend(serviceType, id, false, null, label);
    }
  };

  const executeSuspend = async (serviceType: string, id: number, suspend: boolean, reason: string | null, label: string) => {
    setIsSuspending(true);
    const action = suspend ? "Suspending" : "Unsuspending";
    const toastId = toast.loading(`${action} ${label}...`);
    
    try {
      const res = await fetch(`/api/admin/services/${serviceType}/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspend, reason })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`${label} ${suspend ? 'suspended' : 'unsuspended'} successfully`, { id: toastId });
        fetchUserData(); // Refresh to update status
        setSuspendModalOpen(false);
      } else {
        toast.error(data.error || `Failed to ${suspend ? 'suspend' : 'unsuspend'} ${label}`, { id: toastId });
      }
    } catch (err) {
      toast.error(`Error ${suspend ? 'suspending' : 'unsuspending'} ${label}`, { id: toastId });
    } finally {
      setIsSuspending(false);
    }
  };

  const handleTerminateService = (serviceType: string, id: number, label: string) => {
    setTerminateTarget({ serviceType, id, label });
    setTerminateModalOpen(true);
  };

  const executeTerminate = async () => {
    if (!terminateTarget) return;
    const { serviceType, id, label } = terminateTarget;
    setIsTerminating(true);
    const toastId = toast.loading(`Terminating ${label}...`);
    
    try {
      const res = await fetch(`/api/admin/services/${serviceType}/${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`${label} terminated successfully`, { id: toastId });
        fetchUserData(); // Refresh to update status
        setTerminateModalOpen(false);
      } else {
        toast.error(data.error || `Failed to terminate ${label}`, { id: toastId });
      }
    } catch (err) {
      toast.error(`Error terminating ${label}`, { id: toastId });
    } finally {
      setIsTerminating(false);
    }
  };

  const handleDeleteService = (serviceType: string, id: number, label: string) => {
    setDeleteTarget({ serviceType, id, label });
    setDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    const { serviceType, id, label } = deleteTarget;
    setIsDeleting(true);
    const toastId = toast.loading(`Deleting ${label}...`);
    
    try {
      const res = await fetch(`/api/admin/services/${serviceType}/${id}?hardDelete=true`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`${label} deleted permanently`, { id: toastId });
        fetchUserData(); // Refresh to update status
        setDeleteModalOpen(false);
      } else {
        toast.error(data.error || `Failed to delete ${label}`, { id: toastId });
      }
    } catch (err) {
      toast.error(`Error deleting ${label}`, { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <AdminLoader />;
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <h2 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-slate-900")}>User Not Found</h2>
        <button onClick={() => router.push('/admin/customers')} className={cn("hover:underline", isDark ? "text-cyan-400" : "text-cyan-700")}>Back to Customers</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/admin/customers')} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <ArrowLeft className={cn("w-5 h-5", isDark ? "text-zinc-300" : "text-slate-600")} />
          </button>
          
          <div className={cn("w-14 h-14 rounded-full overflow-hidden border shrink-0 flex items-center justify-center", isDark ? "bg-[#0f172a] border-white/20" : "bg-white border-slate-200")}>
            <img referrerPolicy="no-referrer" 
              src={user.image || `/api/avatar?email=${encodeURIComponent(user.email || '')}&name=${encodeURIComponent(user.name || 'User')}`} 
              alt="Profile" 
              className="w-full h-full object-cover" 
            loading="lazy" decoding="async" />
          </div>
          
          <div>
            <h1 className={cn("text-3xl font-extrabold mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
              {user.name}
              {user.isSuspended && <span className={cn("text-xs bg-red-500/20 px-2 py-0.5 rounded-md border border-red-500/20", isDark ? "text-red-400" : "text-red-700")}>SUSPENDED</span>}
            </h1>
            <p className={cn("text-sm", isDark ? "text-zinc-400" : "text-slate-500")}>{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn("px-4 py-2 rounded-xl border text-sm", isDark ? "bg-[#1e293b] border-white/5" : "bg-slate-100 border-slate-200")}>
            <span className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>Balance:</span> <span className={cn("font-bold ml-1", isDark ? "text-cyan-400" : "text-cyan-700")}>{formatRupiah(user.balance)}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={cn("flex overflow-x-auto border-b gap-6 sm:gap-8 [&::-webkit-scrollbar]:hidden", isDark ? "border-white/10" : "border-slate-200")} style={{ scrollbarWidth: 'none' }}>
        <button
          onClick={() => setActiveTab('summary')}
          className={`pb-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'summary' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-zinc-400 hover:text-white'}`}
        >
          <User className="w-4 h-4 inline-block mr-2 -mt-0.5" />
          Summary
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`pb-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'services' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-zinc-400 hover:text-white'}`}
        >
          <Server className="w-4 h-4 inline-block mr-2 -mt-0.5" />
          Products/Services
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === 'invoices' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-zinc-400 hover:text-white'}`}
        >
          <FileText className="w-4 h-4 inline-block mr-2 -mt-0.5" />
          Invoices
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        
        {/* SUMMARY TAB */}
        {activeTab === 'summary' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={cn("p-6 rounded-2xl border md:col-span-2", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
              <h3 className={cn("text-lg font-semibold mb-4", isDark ? "text-white" : "text-slate-900")}>Client Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                <div>
                  <p className={cn("text-xs uppercase tracking-wider mb-1", isDark ? "text-zinc-500" : "text-slate-500")}>Full Name</p>
                  <p className={cn("text-sm font-medium", isDark ? "text-zinc-200" : "text-slate-900")}>{user.name}</p>
                </div>
                <div>
                  <p className={cn("text-xs uppercase tracking-wider mb-1", isDark ? "text-zinc-500" : "text-slate-500")}>Email Address</p>
                  <p className={cn("text-sm font-medium break-all", isDark ? "text-zinc-200" : "text-slate-900")}>{user.email}</p>
                </div>
                
                <div className={cn("sm:col-span-2 border-t pt-4 mt-2", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                  <h4 className={cn("text-sm font-bold uppercase tracking-widest mb-4", isDark ? "text-cyan-400" : "text-cyan-700")}>Billing Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                    <div>
                      <p className={cn("text-xs uppercase tracking-wider mb-1", isDark ? "text-zinc-500" : "text-slate-500")}>Company Name</p>
                      <p className={cn("text-sm font-medium", isDark ? "text-zinc-200" : "text-slate-900")}>{user.companyName || '-'}</p>
                    </div>
                    <div>
                      <p className={cn("text-xs uppercase tracking-wider mb-1", isDark ? "text-zinc-500" : "text-slate-500")}>Phone Number</p>
                      <p className={cn("text-sm font-medium", isDark ? "text-zinc-200" : "text-slate-900")}>{user.phone || '-'}</p>
                    </div>
                    
                    <div className="sm:col-span-2">
                      <p className={cn("text-xs uppercase tracking-wider mb-1", isDark ? "text-zinc-500" : "text-slate-500")}>Address</p>
                      <p className={cn("text-sm font-medium", isDark ? "text-zinc-200" : "text-slate-900")}>{user.address1 || '-'}</p>
                      {user.address2 && <p className={cn("text-sm font-medium mt-0.5", isDark ? "text-zinc-200" : "text-slate-900")}>{user.address2}</p>}
                    </div>
                    
                    <div>
                      <p className={cn("text-xs uppercase tracking-wider mb-1", isDark ? "text-zinc-500" : "text-slate-500")}>City</p>
                      <p className={cn("text-sm font-medium", isDark ? "text-zinc-200" : "text-slate-900")}>{user.city || '-'}</p>
                    </div>
                    <div>
                      <p className={cn("text-xs uppercase tracking-wider mb-1", isDark ? "text-zinc-500" : "text-slate-500")}>State / Province</p>
                      <p className={cn("text-sm font-medium", isDark ? "text-zinc-200" : "text-slate-900")}>{user.state || '-'}</p>
                    </div>
                    
                    <div>
                      <p className={cn("text-xs uppercase tracking-wider mb-1", isDark ? "text-zinc-500" : "text-slate-500")}>Postal Code</p>
                      <p className={cn("text-sm font-medium", isDark ? "text-zinc-200" : "text-slate-900")}>{user.postalCode || '-'}</p>
                    </div>
                    <div>
                      <p className={cn("text-xs uppercase tracking-wider mb-1", isDark ? "text-zinc-500" : "text-slate-500")}>Country</p>
                      <p className={cn("text-sm font-medium", isDark ? "text-zinc-200" : "text-slate-900")}>{user.country || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className={cn("sm:col-span-2 border-t pt-4 mt-2", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                    <div>
                      <p className={cn("text-xs uppercase tracking-wider mb-1", isDark ? "text-zinc-500" : "text-slate-500")}>Registered On</p>
                      <p className={cn("text-sm font-medium", isDark ? "text-zinc-200" : "text-slate-900")}>{new Date(user.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className={cn("text-xs uppercase tracking-wider mb-1", isDark ? "text-zinc-500" : "text-slate-500")}>Account Status</p>
                      <div className="mt-1">
                        <StatusBadge status={user.isSuspended ? 'SUSPENDED' : 'ACTIVE'} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className={cn("p-6 rounded-2xl border", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                <h3 className={cn("text-lg font-semibold mb-4", isDark ? "text-white" : "text-slate-900")}>Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>Total Invoices</span>
                    <span className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>{user.invoices?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className={cn(isDark ? "text-zinc-400" : "text-slate-500")}>Active Subscriptions</span>
                    <span className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>{user.subscriptions?.length || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SERVICES TAB */}
        {activeTab === 'services' && (
          <div className={cn("border rounded-2xl overflow-hidden", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>

            <div className={cn("p-5 border-b flex justify-between items-center", isDark ? "bg-[#0A0B1A]/50 border-white/5 bg-white/[0.02]" : "bg-white border-slate-200 bg-white")}>
              <h3 className={cn("font-semibold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}><Server className={cn("w-4 h-4", isDark ? "text-cyan-400" : "text-cyan-700")} /> All Products & Services</h3>
              <button
                onClick={() => setCreateCustomServiceModal(true)}
                className={cn("px-3 py-1.5 text-xs font-semibold bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}
              >
                + Custom Service
              </button>
            </div>
            <PaginatedTable
              data={allServices}
              emptyMessage="No products or services found for this customer."
              itemsPerPage={10}
              columns={[
                { label: "Product/Service" },
                { label: "Details" },
                { label: "Status" },
                { label: "Actions", align: "right" }
              ]}
              renderRow={(svc: any, idx: number) => (
                <tr key={`${svc.type}-${svc.id}-${idx}`} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3 min-w-[180px]">
                      <div className={cn("p-2 rounded-lg border flex-shrink-0", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                        {svc.icon}
                      </div>
                      <div className="min-w-0">
                        <div className={cn("text-sm font-bold truncate", isDark ? "text-white" : "text-slate-900")}>{svc.name}</div>
                        <div className={cn("text-xs uppercase tracking-wider mt-0.5 truncate", isDark ? "text-zinc-500" : "text-slate-500")}>{svc.category}</div>
                      </div>
                    </div>
                  </td>
                  <td className={cn("p-4 text-sm min-w-[220px]", isDark ? "text-zinc-400" : "text-slate-500")}>{svc.detail}</td>
                  <td className="p-4 min-w-[120px]">
                    <StatusBadge status={svc.status} />
                    {svc.status === 'SUSPENDED' && (
                      <div className={cn("text-[10px] mt-1 max-w-[150px] truncate", isDark ? "text-zinc-500" : "text-slate-500")} title={svc.suspendReason || 'Suspended by system'}>
                        Reason: {svc.suspendReason || 'Suspended by system'}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditTarget(svc);
                          setEditModalOpen(true);
                        }}
                        className={cn("px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border whitespace-nowrap flex items-center gap-1.5", isDark ? "border-white/10 hover:bg-white/5 text-zinc-300" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700")}
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleSuspendService(svc.type, svc.id, svc.status, svc.category.toLowerCase())}
                        disabled={svc.status !== 'ACTIVE' && svc.status !== 'RUNNING' && svc.status !== 'SUSPENDED'}
                        className={cn("px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border disabled:opacity-50 whitespace-nowrap", svc.status === "SUSPENDED" ? (isDark ? "border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100") : (isDark ? "border-orange-500/30 hover:bg-orange-500/10 text-orange-400" : "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"))}
                      >
                        {svc.status === 'SUSPENDED' ? 'Unsuspend' : 'Suspend'}
                      </button>
                      <button
                        onClick={() => handleTerminateService(svc.type, svc.id, svc.category.toLowerCase())}
                        disabled={svc.status === 'TERMINATED' || svc.status === 'CANCELED'}
                        className={cn("px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border disabled:opacity-50 whitespace-nowrap", isDark ? "border-red-500/30 hover:bg-red-500/10 text-red-400" : "bg-red-50 border-red-200 text-red-600 hover:bg-red-100")}
                      >
                        Terminate
                      </button>
                      {(svc.status === 'TERMINATED' || svc.status === 'CANCELED') && (
                        <button
                          onClick={() => handleDeleteService(svc.type, svc.id, svc.category.toLowerCase())}
                          className={cn("px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border border-red-600/50 bg-red-600/20 hover:bg-red-600 hover:text-white whitespace-nowrap", isDark ? "text-red-400" : "text-red-700")}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            />
          </div>
        )}

        {/* INVOICES TAB */}
        {activeTab === 'invoices' && (
          <div className={cn("border rounded-2xl overflow-hidden", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
            <PaginatedTable
              data={user.invoices}
              emptyMessage="No invoices found for this customer."
              itemsPerPage={10}
              columns={[
                { label: "Invoice #" },
                { label: "Date" },
                { label: "Amount" },
                { label: "Status", align: "right" }
              ]}
              renderRow={(inv: any) => (
                <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className={cn("p-4 text-sm font-medium break-all max-w-[120px] sm:max-w-none", isDark ? "text-cyan-400" : "text-cyan-700")}>{inv.invoiceNumber}</td>
                  <td className={cn("p-4 text-sm whitespace-nowrap", isDark ? "text-zinc-300" : "text-slate-600")}>{new Date(inv.createdAt).toLocaleDateString()}</td>
                  <td className={cn("p-4 text-sm font-semibold whitespace-nowrap", isDark ? "text-zinc-200" : "text-slate-900")}>{formatRupiah(inv.amount)}</td>
                  <td className="p-4 text-right">
                    <StatusBadge status={inv.status} />
                  </td>
                </tr>
              )}
            />
          </div>
        )}

      </div>

      <AdminEditServiceModal 
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={fetchUserData}
        service={editTarget}
      />

      {/* Suspend Modal */}
      {suspendModalOpen && suspendTarget && (
        <div className={cn("fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200", isDark ? "bg-black/60" : "bg-slate-900/40")}>
          <div className={cn("border rounded-2xl w-full max-w-md overflow-hidden", isDark ? "bg-[#0f172a] border-white/10" : "bg-white border-slate-200")}>
            <div className={cn("p-5 border-b flex justify-between items-center", isDark ? "border-white/10" : "border-slate-200")}>
              <h3 className={cn("font-bold flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}>
                <AlertTriangle className="w-5 h-5 text-orange-400" />
                Suspend {suspendTarget.label}
              </h3>
              <button onClick={() => setSuspendModalOpen(false)} className={cn("hover:text-white transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}>
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <label className={cn("block text-sm font-medium mb-2", isDark ? "text-zinc-300" : "text-slate-600")}>Reason for suspension</label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g. Overdue payment, Terms violation..."
                className={cn("w-full border rounded-xl p-3 placeholder-zinc-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all min-h-[100px]", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
              />
            </div>
            <div className={cn("p-4 border-t flex justify-end gap-3", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
              <button 
                onClick={() => setSuspendModalOpen(false)}
                disabled={isSuspending}
                className={cn("px-4 py-2 text-sm font-medium hover:text-white hover:bg-white/10 rounded-xl transition-colors", isDark ? "text-zinc-300" : "text-slate-600")}
              >
                Cancel
              </button>
              <button 
                onClick={() => executeSuspend(suspendTarget.serviceType, suspendTarget.id, true, suspendReason, suspendTarget.label)}
                disabled={isSuspending || !suspendReason.trim()}
                className={cn("px-4 py-2 text-sm font-medium bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2", isDark ? "text-white" : "text-slate-900")}
              >
                {isSuspending ? (
                  <><div className={cn("w-4 h-4 border-2 border-t-white rounded-full animate-spin", isDark ? "border-white/30" : "border-slate-200")} /> Suspending...</>
                ) : 'Confirm Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terminate Modal */}
      <ConfirmModal
        isOpen={terminateModalOpen && terminateTarget !== null}
        onClose={() => setTerminateModalOpen(false)}
        onConfirm={executeTerminate}
        title="Confirm Termination"
        description={`Are you absolutely sure you want to terminate this ${terminateTarget?.label}? This action cannot be undone.`}
        confirmText="Yes, Terminate"
        cancelText="Cancel"
        variant="danger"
        isLoading={isTerminating}
      >
        <div className={cn("mt-4 p-3 border rounded-xl text-left", isDark ? "bg-red-500/10 border-red-500/20" : "bg-red-50 border-red-200")}>
          <ul className={cn("list-disc list-inside text-xs space-y-1", isDark ? "text-red-400" : "text-red-700")}>
            {terminateTarget?.serviceType === 'vps' && (
              <>
                <li>VPS server and its data will be permanently destroyed.</li>
                <li>Any assigned IP addresses will be freed.</li>
              </>
            )}
            {terminateTarget?.serviceType === 'kubernetes' && (
              <>
                <li>Kubernetes cluster and its nodes will be permanently destroyed.</li>
                <li>All deployed applications and data will be lost.</li>
              </>
            )}

            {terminateTarget?.serviceType === 'subscriptions' && (
              <>
                <li>This API subscription will be permanently disabled.</li>
                <li>Any linked resources or assets will be deleted and data lost.</li>
              </>
            )}
            {terminateTarget?.serviceType === 'custom-services' && (
              <li>This custom service will be permanently terminated.</li>
            )}
            {(!terminateTarget || !['vps', 'kubernetes', 'subscriptions', 'custom-services'].includes(terminateTarget.serviceType)) && (
              <li>The selected service and all its associated data will be permanently deleted.</li>
            )}
          </ul>
        </div>
      </ConfirmModal>

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen && deleteTarget !== null}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={executeDelete}
        title="Delete"
        description={`Are you absolutely sure you want to completely delete this ${deleteTarget?.label} from the database? This action is irreversible.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Create Custom Service Modal */}
      {createCustomServiceModal && (
        <div className={cn("fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200", isDark ? "bg-black/60" : "bg-slate-900/40")}>
          <div className={cn("border rounded-2xl w-full max-w-md overflow-hidden", isDark ? "bg-[#0f172a] border-white/10" : "bg-white border-slate-200")}>
            <div className={cn("p-5 border-b flex justify-between items-center", isDark ? "border-white/10" : "border-slate-200")}>
              <h3 className={cn("font-bold", isDark ? "text-white" : "text-slate-900")}>Create Custom Service</h3>
              <button onClick={() => setCreateCustomServiceModal(false)} className={cn("hover:text-white transition-colors", isDark ? "text-zinc-400" : "text-slate-500")}>
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCustomService}>
              <div className="p-6 space-y-4">
                <div>
                  <label className={cn("block text-sm font-medium mb-1", isDark ? "text-zinc-300" : "text-slate-600")}>Service Name</label>
                  <input
                    required
                    type="text"
                    value={csForm.name}
                    onChange={(e) => setCsForm({...csForm, name: e.target.value})}
                    placeholder="e.g. Addon Public IP"
                    className={cn("w-full border rounded-xl p-2.5 placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                  />
                </div>
                <div>
                  <label className={cn("block text-sm font-medium mb-1", isDark ? "text-zinc-300" : "text-slate-600")}>Description (Optional)</label>
                  <input
                    type="text"
                    value={csForm.description}
                    onChange={(e) => setCsForm({...csForm, description: e.target.value})}
                    placeholder="Short description"
                    className={cn("w-full border rounded-xl p-2.5 placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                  />
                </div>
                <div>
                  <label className={cn("block text-sm font-medium mb-1", isDark ? "text-zinc-300" : "text-slate-600")}>Price (IDR)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={csForm.price}
                    onChange={(e) => setCsForm({...csForm, price: e.target.value})}
                    placeholder="e.g. 50000"
                    className={cn("w-full border rounded-xl p-2.5 placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-all", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={cn("block text-sm font-medium mb-1", isDark ? "text-zinc-300" : "text-slate-600")}>Billing Cycle</label>
                    <Select
                      value={csForm.billingCycle}
                      onChange={(val) => setCsForm({...csForm, billingCycle: val})}
                      options={[
                        { value: "1_MONTH", label: "1 Bulan" },
                        { value: "3_MONTHS", label: "3 Bulan" },
                        { value: "6_MONTHS", label: "6 Bulan" },
                        { value: "1_YEAR", label: "1 Tahun" }
                      ]}
                      placeholder="Billing Cycle"
                      className={cn("w-full rounded-xl px-3 py-2 text-sm", isDark ? "border-white/10" : "border-slate-200")}
                    />
                  </div>
                  <div>
                    <label className={cn("block text-sm font-medium mb-1", isDark ? "text-zinc-300" : "text-slate-600")}>Due Date / Expiry</label>
                    <input
                      required
                      type="date"
                      value={csForm.expiresAt}
                      onChange={(e) => setCsForm({...csForm, expiresAt: e.target.value})}
                      className={cn("w-full border rounded-xl p-2.5 focus:outline-none focus:border-cyan-500 transition-all [color-scheme:dark]", isDark ? "bg-[#0A0B1A] border-white/10 text-white focus:bg-[#11162C]" : "bg-white border-slate-200 text-slate-900 focus:bg-slate-50")}
                    />
                  </div>
                </div>
              </div>
              <div className={cn("p-4 border-t flex justify-end gap-3", isDark ? "bg-[#0A0B1A]/50 border-white/5" : "bg-white border-slate-200")}>
                <button 
                  type="button"
                  onClick={() => setCreateCustomServiceModal(false)}
                  disabled={isCreatingCs}
                  className={cn("px-4 py-2 text-sm font-medium hover:text-white hover:bg-white/10 rounded-xl transition-colors", isDark ? "text-zinc-300" : "text-slate-600")}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isCreatingCs}
                  className={cn("px-4 py-2 text-sm font-medium bg-cyan-500 hover:bg-cyan-600 rounded-xl transition-colors disabled:opacity-50", isDark ? "text-white" : "text-slate-900")}
                >
                  {isCreatingCs ? 'Creating...' : 'Create & Generate Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
